/*
 * musei.js — Frontend per la gestione musei.
 * Flusso: browser → fetch('/api/musei') → index.js → scripts/musei.js → MongoDB
 * AGGIORNATO: ora usa sezioni inline invece di modali
 */

const API = '/api/musei';

let tuttiIMusei = [];
const currentUserId = localStorage.getItem('userId') || '';
const currentRole   = localStorage.getItem('userRole') || '';

document.addEventListener('DOMContentLoaded', loadMusei);


// ── CARICA TUTTI I MUSEI ─────────────────────────────────────────────────

async function loadMusei() {
    try {
        // i curatori vedono solo i propri musei
        const url = (currentRole === 'curatore' && currentUserId)
            ? `${API}?curatoreId=${encodeURIComponent(currentUserId)}`
            : API;
        const response = await fetch(url);
        const result = await response.json();
        if (!result.ok) { showStatus('Errore nel caricamento: ' + result.error); return; }
        tuttiIMusei = result.data;
        renderMusei(tuttiIMusei);
    } catch (e) {
        showStatus('Impossibile contattare il server.');
    }
}


// ── RENDER DELLE CARD ────────────────────────────────────────────────────

function renderMusei(musei) {
    const grid = document.getElementById('museiContainer');

    if (musei.length === 0) {
        grid.innerHTML = `<p style="color: var(--text-muted); text-align:center; padding:40px; grid-column:1/-1">
            Nessun museo trovato. Clicca "Nuovo Museo" per aggiungerne uno.
        </p>`;
        return;
    }

    grid.innerHTML = musei.map(m => {
        const museoKey = m.codiceIsil || m._id;
        return `
        <div class="item-card museo-card" onclick="apriMuseo(event, '${museoKey}')">
            ${m.immagineCopertina
                ? `<img class="museo-card-img" src="${m.immagineCopertina}" alt="${m.nome}" onerror="this.style.display='none'">`
                : `<div class="museo-card-img-placeholder"><i class="fa-solid fa-building-columns"></i></div>`
            }
            <div class="card-main-header" style="margin-top: 20px;">
                <div class="title-group">
                    <h3>${m.nome}</h3>
                    <p class="museum-sub"><i class="fa-solid fa-location-dot"></i> ${m.citta}</p>
                </div>
                ${currentRole === 'curatore' || currentRole === 'admin' ? `
                <div class="action-group">
                    <div class="buttons-row">
                        <button class="icon-btn edit-btn" onclick="event.stopPropagation(); editMuseo('${m.codiceIsil}')" title="Modifica">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="icon-btn delete-btn" onclick="event.stopPropagation(); deleteMuseo('${m.codiceIsil}', '${m.nome}')" title="Elimina">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>` : ''}
            </div>
            <div class="card-body">
                ${m.descrizioneBreve ? `<p class="description-text">${m.descrizioneBreve}</p>` : ''}
            </div>
            <div class="card-footer">
                ${m.codiceIsil ? `<span class="tag-bubble"><i class="fa-solid fa-barcode"></i> ${m.codiceIsil}</span>` : ''}
                ${m.curatoreId ? `<span class="tag-bubble"><i class="fa-solid fa-user-tie"></i> ${m.curatoreId}</span>` : ''}
            </div>
        </div>
    `;
    }).join('');
}


// ── NAVIGAZIONE AL MUSEO ─────────────────────────────────────────────────

function apriMuseo(event, museoKey) {
    if (event.target.closest('.icon-btn')) return;
    if (!museoKey) return;

    // Salva il museoKey in sessione
    sessionStorage.setItem('currentMuseo', museoKey);

    window.location.href = `opere.html?museo=${encodeURIComponent(museoKey)}`;
}


// ── FILTRO DI RICERCA ───────────────────────────────────────────────────

function filterMusei() {
    const q = document.getElementById('searchMusei').value.toLowerCase();
    const filtrati = tuttiIMusei.filter(m =>
        m.nome.toLowerCase().includes(q) || m.citta.toLowerCase().includes(q)
    );
    renderMusei(filtrati);
}


// ── SEED ──────────────────────────────────────────────────────────────────

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


// ── EDIT MUSEO (apre la sezione di modifica) ───────────────────────────

function editMuseo(codiceIsil) {
    if (!codiceIsil) return;

    const m = tuttiIMusei.find(x => x.codiceIsil === codiceIsil);
    if (!m) return;

    // Popola il form di modifica
    document.getElementById('editIsil').value       = codiceIsil;
    document.getElementById('mfNome').value          = m.nome || '';
    document.getElementById('mfCitta').value         = m.citta || '';
    document.getElementById('mfIndirizzo').value     = m.indirizzo || '';
    document.getElementById('mfCodiceIsil').value    = m.codiceIsil || '';
    document.getElementById('mfImmagine').value      = m.immagineCopertina || '';
    document.getElementById('mfDescrizione').value   = m.descrizioneBreve || '';

    // Mostra la sezione di modifica
    if (typeof switchSection === 'function') {
        switchSection('modifica-museo');
    }
}


// ── SUBMIT (aggiunta o modifica) ────────────────────────────────────────

async function submitForm(e) {
    e.preventDefault();

    const editIsil = document.getElementById('editIsil').value;

    const body = {
        nome:              document.getElementById(editIsil ? 'mfNome' : 'fNome').value,
        citta:             document.getElementById(editIsil ? 'mfCitta' : 'fCitta').value,
        indirizzo:         document.getElementById(editIsil ? 'mfIndirizzo' : 'fIndirizzo').value,
        codiceIsil:        document.getElementById(editIsil ? 'mfCodiceIsil' : 'fCodiceIsil').value,
        immagineCopertina: document.getElementById(editIsil ? 'mfImmagine' : 'fImmagine').value,
        descrizioneBreve:  document.getElementById(editIsil ? 'mfDescrizione' : 'fDescrizione').value,
        curatoreId:        currentUserId,
    };

    try {
        const response = editIsil
            ? await fetch(`${API}/${editIsil}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              })
            : await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });

        const result = await response.json();

        if (result.ok) {
            showStatus(editIsil ? 'Museo aggiornato.' : 'Museo creato.');
            // Torna alla lista musei
            if (typeof switchSection === 'function') {
                switchSection('musei');
            }
            loadMusei();
        } else {
            showStatus('Errore: ' + result.error);
        }
    } catch (err) {
        showStatus('Impossibile contattare il server.');
    }
}


// ── DELETE ────────────────────────────────────────────────────────────────

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


// ── STATUS ────────────────────────────────────────────────────────────────

function showStatus(msg) {
    alert(msg);
}


// ── VAI ALL'EDITOR (OPERE) ───────────────────────────────────────

function vaiAllEditor() {
    const codiceIsil = document.getElementById('editIsil').value;
    if (!codiceIsil) return;
    window.location.href = `/Editor-Marketplace/Frontend/opere.html?museo=${encodeURIComponent(codiceIsil)}`;
}
