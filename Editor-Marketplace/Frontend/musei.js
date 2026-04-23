/*
 * musei.js — Frontend per la gestione musei.
 * Flusso: browser → fetch('/api/musei') → index.js → scripts/musei.js → MongoDB
 */

const API = '/api/musei';

let tuttiIMusei = [];

document.addEventListener('DOMContentLoaded', loadMusei);


// ── CARICA TUTTI I MUSEI ──────────────────────────────────────────────────────

async function loadMusei() {
    try {
        const response = await fetch(API);
        const result = await response.json();
        if (!result.ok) { showStatus('Errore nel caricamento: ' + result.error); return; }
        tuttiIMusei = result.data;
        renderMusei(tuttiIMusei);
    } catch (e) {
        showStatus('Impossibile contattare il server.');
    }
}


// ── RENDER DELLE CARD ─────────────────────────────────────────────────────────

function renderMusei(musei) {
    const grid = document.getElementById('museiContainer');

    if (musei.length === 0) {
        grid.innerHTML = `<p style="color:#4a7c5f; text-align:center; padding:40px; grid-column:1/-1">
            Nessun museo trovato. Clicca "Inizializza DB" per caricare i dati di esempio.
        </p>`;
        return;
    }

    grid.innerHTML = musei.map(m => `
        <div class="item-card museo-card" onclick="apriMuseo(event, '${m.codiceIsil}')">
            ${m.immagineCopertina
                ? `<img class="museo-card-img" src="${m.immagineCopertina}" alt="${m.nome}" onerror="this.style.display='none'">`
                : `<div class="museo-card-img-placeholder"><i class="fa fa-building-columns"></i></div>`
            }
            <div class="card-main-header" style="margin-top: 20px;">
                <div class="title-group">
                    <h3>${m.nome}</h3>
                    <p class="museum-sub"><i class="fa-solid fa-location-dot"></i> ${m.citta}</p>
                </div>
                <div class="action-group">
                    <div class="buttons-row">
                        <button class="icon-btn edit-btn" onclick="openModal('${m.codiceIsil}')" title="Modifica">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="icon-btn delete-btn" onclick="deleteMuseo('${m.codiceIsil}', '${m.nome}')" title="Elimina">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-body">
                ${m.descrizioneBreve ? `<p class="description-text">${m.descrizioneBreve}</p>` : ''}
            </div>
            ${m.codiceIsil ? `
            <div class="card-footer">
                <span class="tag-bubble"><i class="fa-solid fa-barcode"></i> ${m.codiceIsil}</span>
            </div>` : ''}
        </div>
    `).join('');
}


// ── NAVIGAZIONE AL MUSEO ──────────────────────────────────────────────────────

function apriMuseo(event, codiceIsil) {
    if (event.target.closest('.icon-btn')) return; 
    if (!codiceIsil) return;
    
    // Salva il codiceIsil in sessione
    sessionStorage.setItem('currentMuseo', codiceIsil);
    
    window.location.href = `opere.html?museo=${encodeURIComponent(codiceIsil)}`;
}


// ── FILTRO DI RICERCA ─────────────────────────────────────────────────────────

function filterMusei() {
    const q = document.getElementById('searchMusei').value.toLowerCase();
    const filtrati = tuttiIMusei.filter(m =>
        m.nome.toLowerCase().includes(q) || m.citta.toLowerCase().includes(q)
    );
    renderMusei(filtrati);
}


// ── SEED ──────────────────────────────────────────────────────────────────────

async function seedDB() {
    if (!confirm('Inizializza il DB con i musei di esempio?')) return;
    try {
        const result = await (await fetch('/api/musei/seed')).json();
        showStatus(result.ok ? result.message : 'Errore: ' + result.error);
        if (result.ok) loadMusei();
    } catch (e) {
        showStatus('Impossibile contattare il server.');
    }
}


// ── MODAL ─────────────────────────────────────────────────────────────────────

function openModal(codiceIsil) {
    document.getElementById('museoForm').reset();
    document.getElementById('editIsil').value = '';
    const modal = document.getElementById('museoModal');

    if (codiceIsil) {
        const m = tuttiIMusei.find(x => x.codiceIsil === codiceIsil);
        if (!m) return;
        document.getElementById('modalTitle').innerHTML = 'Modifica <span>Museo</span>';
        document.getElementById('submitBtn').textContent = 'Aggiorna Museo';
        document.getElementById('editIsil').value = codiceIsil;
        document.getElementById('fNome').value       = m.nome || '';
        document.getElementById('fCitta').value      = m.citta || '';
        document.getElementById('fIndirizzo').value  = m.indirizzo || '';
        document.getElementById('fCodiceIsil').value = m.codiceIsil || '';
        document.getElementById('fImmagine').value   = m.immagineCopertina || '';
        document.getElementById('fDescrizione').value = m.descrizioneBreve || '';
    } else {
        document.getElementById('modalTitle').innerHTML = 'Nuovo <span>Museo</span>';
        document.getElementById('submitBtn').textContent = 'Salva Museo';
    }

    modal.style.display = 'flex';
    document.body.classList.add('no-scroll');
}

function closeModal() {
    document.getElementById('museoModal').style.display = 'none';
    document.body.classList.remove('no-scroll');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('museoModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
});


// ── SUBMIT ────────────────────────────────────────────────────────────────────

async function submitForm(e) {
    e.preventDefault();
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
        const response = editIsil
            ? await fetch(`${API}/${editIsil}`, { method: 'PUT',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            : await fetch(API,                   { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

        const result = await response.json();
        if (result.ok) { closeModal(); showStatus(editIsil ? 'Museo aggiornato.' : 'Museo creato.'); loadMusei(); }
        else showStatus('Errore: ' + result.error);
    } catch (err) {
        showStatus('Impossibile contattare il server.');
    }
}


// ── DELETE ────────────────────────────────────────────────────────────────────

async function deleteMuseo(codiceIsil, nome) {
    if (!confirm(`Eliminare "${nome}"?`)) return;
    try {
        const result = await (await fetch(`${API}/${codiceIsil}`, { method: 'DELETE' })).json();
        showStatus(result.ok ? result.message : 'Errore: ' + result.error);
        if (result.ok) loadMusei();
    } catch (e) {
        showStatus('Impossibile contattare il server.');
    }
}


// ── STATUS ────────────────────────────────────────────────────────────────────

function showStatus(msg) {
    alert(msg);
}
