/*
 * musei.js — Frontend per la gestione musei.
 *
 * Tutte le operazioni parlano con il backend Express tramite fetch().
 * Il backend a sua volta usa Mongoose per leggere/scrivere su MongoDB.
 *
 * Flusso: browser → fetch('/api/musei') → index.js → scripts/musei.js → MongoDB
 */

const API = '/api/musei';

let tuttiIMusei = []; // cache locale per il filtro di ricerca


// ── AL CARICAMENTO DELLA PAGINA ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', loadMusei);


// ── CARICA TUTTI I MUSEI ─────────────────────────────────────────────────────

async function loadMusei() {
    try {
        // fetch() fa una richiesta HTTP GET al nostro server Express
        const response = await fetch(API);
        const result = await response.json();

        if (!result.ok) {
            showStatus('Errore nel caricamento: ' + result.error, 'err');
            return;
        }

        tuttiIMusei = result.data;
        renderMusei(tuttiIMusei);
    } catch (e) {
        showStatus('Impossibile contattare il server.', 'err');
    }
}


// ── RENDER DELLE CARD ────────────────────────────────────────────────────────

function renderMusei(musei) {
    const grid = document.getElementById('museiGrid');

    if (musei.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1">
                <i class="fa fa-building-columns"></i>
                Nessun museo trovato. Clicca "Inizializza DB" per caricare i dati di esempio.
            </div>`;
        return;
    }

    grid.innerHTML = musei.map(m => `
        <div class="museo-card">
            ${m.immagineCopertina
                ? `<img src="${m.immagineCopertina}" alt="${m.nome}" onerror="this.style.display='none'">`
                : `<div style="height:160px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:3rem"><i class="fa fa-building-columns"></i></div>`
            }
            <div class="card-body">
                <h3>${m.nome}</h3>
                <div class="citta"><i class="fa fa-location-dot"></i> ${m.citta}</div>
                ${m.codiceIsil ? `<div class="isil">${m.codiceIsil}</div>` : ''}
                ${m.descrizioneBreve ? `<p>${m.descrizioneBreve}</p>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary" onclick="openModal('${m.codiceIsil}')">
                    <i class="fa fa-pencil"></i> Modifica
                </button>
                <button class="btn btn-danger" onclick="deleteMuseo('${m.codiceIsil}', '${m.nome}')">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}


// ── FILTRO DI RICERCA (lato client, senza nuova richiesta al server) ─────────

function filterMusei() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtrati = tuttiIMusei.filter(m =>
        m.nome.toLowerCase().includes(q) || m.citta.toLowerCase().includes(q)
    );
    renderMusei(filtrati);
}


// ── SEED: inizializza il DB dal file JSON ─────────────────────────────────────

async function seedDB() {
    if (!confirm('Questa operazione sovrascrive tutti i musei nel database con i dati del file JSON. Continuare?')) return;
    try {
        const response = await fetch('/api/musei/seed');
        const result = await response.json();
        if (result.ok) {
            showStatus(result.message, 'ok');
            loadMusei(); // ricarica le card
        } else {
            showStatus('Errore seed: ' + result.error, 'err');
        }
    } catch (e) {
        showStatus('Impossibile contattare il server.', 'err');
    }
}


// ── MODAL: apri (nuovo o modifica) ──────────────────────────────────────────

function openModal(codiceIsil) {
    document.getElementById('museoForm').reset();
    document.getElementById('editIsil').value = '';

    if (codiceIsil) {
        // Modalità modifica: precompila il form con i dati del museo
        const m = tuttiIMusei.find(x => x.codiceIsil === codiceIsil);
        if (!m) return;
        document.getElementById('modalTitle').textContent = 'Modifica museo';
        document.getElementById('submitBtn').textContent = 'Aggiorna';
        document.getElementById('editIsil').value = codiceIsil;
        document.getElementById('fNome').value = m.nome || '';
        document.getElementById('fCitta').value = m.citta || '';
        document.getElementById('fIndirizzo').value = m.indirizzo || '';
        document.getElementById('fCodiceIsil').value = m.codiceIsil || '';
        document.getElementById('fImmagine').value = m.immagineCopertina || '';
        document.getElementById('fDescrizione').value = m.descrizioneBreve || '';
    } else {
        // Modalità creazione
        document.getElementById('modalTitle').textContent = 'Nuovo museo';
        document.getElementById('submitBtn').textContent = 'Salva';
    }

    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

// Chiude il modal cliccando fuori
document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});


// ── SUBMIT FORM: crea o aggiorna ─────────────────────────────────────────────

async function submitForm(e) {
    e.preventDefault(); // impedisce il refresh della pagina

    const body = {
        nome:              document.getElementById('fNome').value,
        citta:             document.getElementById('fCitta').value,
        indirizzo:         document.getElementById('fIndirizzo').value,
        codiceIsil:        document.getElementById('fCodiceIsil').value,
        immagineCopertina: document.getElementById('fImmagine').value,
        descrizioneBreve:  document.getElementById('fDescrizione').value,
    };

    const editIsil = document.getElementById('editIsil').value;

    try {
        let response;
        if (editIsil) {
            // PUT aggiorna il museo esistente
            response = await fetch(`${API}/${editIsil}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } else {
            // POST crea un nuovo museo
            response = await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        }

        const result = await response.json();
        if (result.ok) {
            closeModal();
            showStatus(editIsil ? 'Museo aggiornato.' : 'Museo creato.', 'ok');
            loadMusei();
        } else {
            showStatus('Errore: ' + result.error, 'err');
        }
    } catch (err) {
        showStatus('Impossibile contattare il server.', 'err');
    }
}


// ── DELETE ───────────────────────────────────────────────────────────────────

async function deleteMuseo(codiceIsil, nome) {
    if (!confirm(`Eliminare "${nome}"?`)) return;
    try {
        const response = await fetch(`${API}/${codiceIsil}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.ok) {
            showStatus(result.message, 'ok');
            loadMusei();
        } else {
            showStatus('Errore: ' + result.error, 'err');
        }
    } catch (e) {
        showStatus('Impossibile contattare il server.', 'err');
    }
}


// ── HELPER: mostra messaggio di stato ────────────────────────────────────────

function showStatus(msg, type) {
    const el = document.getElementById('statusMsg');
    el.textContent = msg;
    el.className = 'status-msg ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}
