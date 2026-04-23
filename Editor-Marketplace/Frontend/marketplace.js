/* ============================================================
   marketplace.js — Logica del Marketplace ArtAround
   ============================================================ */

const SESSION = {
    userId: localStorage.getItem('userId')   || '',
    role:   localStorage.getItem('userRole') || '',
};

let allOpere  = [];
let allVisite = [];
let allMusei  = [];
let currentTab = 'opere';

// { type: 'opera'|'visita', id: '...' }
let vendidaTarget = null;

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    await loadAll();
    renderMuseoFilter();
    setTab('opere');

    document.getElementById('vendidaForm').addEventListener('submit', submitVendita);

    // Chiudi modal cliccando fuori
    document.getElementById('vendidaModal').addEventListener('click', function (e) {
        if (e.target === this) closeVendidaModal();
    });
});

/* ============================================================
   CARICAMENTO DATI
   ============================================================ */

async function loadAll() {
    try {
        const [rOpere, rVisite, rMusei] = await Promise.all([
            fetch('/api/opere'),
            fetch('/api/visite'),
            fetch('/api/musei'),
        ]);
        const [dOpere, dVisite, dMusei] = await Promise.all([
            rOpere.json(), rVisite.json(), rMusei.json(),
        ]);
        if (dOpere.ok)  allOpere  = dOpere.data;
        if (dVisite.ok) allVisite = dVisite.data;
        if (dMusei.ok)  allMusei  = dMusei.data;
    } catch (e) {
        console.error('Errore caricamento marketplace:', e);
    }
}

/* ============================================================
   FILTRO MUSEO
   ============================================================ */

function renderMuseoFilter() {
    const sel = document.getElementById('museoFilter');
    sel.innerHTML =
        '<option value="">Tutti i musei</option>' +
        allMusei.map(m => `<option value="${m.codiceIsil}">${m.nome}</option>`).join('');
}

function applyFilter() {
    const codiceIsil = document.getElementById('museoFilter').value;

    if (currentTab === 'opere') {
        const filtered = codiceIsil
            ? allOpere.filter(o => o.codiceIsil === codiceIsil)
            : allOpere;
        renderOpere(filtered);
    } else {
        const filtered = codiceIsil
            ? allVisite.filter(v => v.codiceIsil === codiceIsil)
            : allVisite;
        renderVisite(filtered);
    }
}

/* ============================================================
   TAB SWITCHING
   ============================================================ */

function setTab(tab) {
    currentTab = tab;

    const btnOpere  = document.getElementById('tabBtnOpere');
    const btnVisite = document.getElementById('tabBtnVisite');

    btnOpere.classList.toggle('tab-active',  tab === 'opere');
    btnVisite.classList.toggle('tab-active', tab === 'visite');

    document.getElementById('tabOpere').style.display  = tab === 'opere'  ? '' : 'none';
    document.getElementById('tabVisite').style.display = tab === 'visite' ? '' : 'none';

    applyFilter();
}

/* ============================================================
   RENDER OPERE
   ============================================================ */

function renderOpere(opere) {
    const grid = document.getElementById('tabOpere');

    if (!opere.length) {
        grid.innerHTML = '<p class="empty-msg">Nessuna opera disponibile per questo museo.</p>';
        return;
    }

    grid.innerHTML = opere.map(op => {
        const isMia   = SESSION.userId && op.autore === SESSION.userId;
        const prezzoEl = op.pubblica
            ? (op.prezzo > 0
                ? `<span class="price-badge">€${op.prezzo}</span>`
                : `<span class="free-badge">Gratis</span>`)
            : `<span class="badge-privata">Privata</span>`;

        const azioneEl = isMia
            ? `<button class="btn-sell ${op.pubblica ? 'is-sold' : ''}"
                        onclick="openVendida('opera','${op._id}',${op.prezzo || 0},${!!op.pubblica})">
                   <i class="fa-solid fa-tag"></i>
                   ${op.pubblica ? 'Modifica vendita' : 'Metti in vendita'}
               </button>`
            : `<button class="btn-adopt"
                        onclick="alert('Funzionalità acquisto in arrivo!')">
                   <i class="fa-solid fa-hand-holding-heart"></i> Adotta
               </button>`;

        return `
            <div class="item-card">
                ${op.immagine
                    ? `<img class="card-opera-img" src="${op.immagine}" alt="${op.operaId}" onerror="this.style.display='none'">`
                    : ''}
                <div class="card-main-header">
                    <div class="title-group">
                        <h3>${op.operaId}</h3>
                        ${op.artistName ? `<p class="museum-sub"><i class="fa-solid fa-palette"></i> ${op.artistName}</p>` : ''}
                        ${op.datazione  ? `<p class="museum-sub"><i class="fa-solid fa-calendar"></i> ${op.datazione}</p>`  : ''}
                    </div>
                    <div class="badges-row">${prezzoEl}</div>
                </div>
                <div class="card-footer">
                    <span class="tag-bubble"><i class="fa-solid fa-barcode"></i> ${op.codiceIsil}</span>
                    ${azioneEl}
                </div>
            </div>`;
    }).join('');
}

/* ============================================================
   RENDER VISITE
   ============================================================ */

function renderVisite(visite) {
    const grid = document.getElementById('tabVisite');

    if (!visite.length) {
        grid.innerHTML = '<p class="empty-msg">Nessuna visita disponibile per questo museo.</p>';
        return;
    }

    grid.innerHTML = visite.map(v => {
        const isMia = SESSION.userId && v.autoreId === SESSION.userId;
        const prezzoEl = v.pubblica
            ? (v.prezzo > 0
                ? `<span class="price-badge">€${v.prezzo}</span>`
                : `<span class="free-badge">Gratis</span>`)
            : `<span class="badge-standard">Standard</span>`;

        const azioneEl = isMia
            ? `<button class="btn-sell ${v.pubblica ? 'is-sold' : ''}"
                        onclick="openVendida('visita','${v._id}',${v.prezzo || 0},${!!v.pubblica})">
                   <i class="fa-solid fa-tag"></i>
                   ${v.pubblica ? 'Modifica vendita' : 'Metti in vendita'}
               </button>`
            : `<button class="btn-adopt"
                        onclick="alert('Funzionalità partecipazione in arrivo!')">
                   <i class="fa-solid fa-route"></i> Partecipa
               </button>`;

        return `
            <div class="item-card">
                <div class="card-main-header">
                    <div class="title-group">
                        <h3>${v.nomeVisita}</h3>
                        ${v.nomeMnemonico ? `<p class="museum-sub">${v.nomeMnemonico}</p>` : ''}
                    </div>
                    <div class="badges-row">${prezzoEl}</div>
                </div>
                <div class="card-body">
                    <p class="description-text logistica-clamp">${v.logistica || ''}</p>
                </div>
                <div class="card-footer">
                    <span class="tag-bubble"><i class="fa-solid fa-barcode"></i> ${v.codiceIsil}</span>
                    ${azioneEl}
                </div>
            </div>`;
    }).join('');
}

/* ============================================================
   MODAL: METTI IN VENDITA
   ============================================================ */

window.openVendida = function (type, id, currentPrezzo, isPubblica) {
    vendidaTarget = { type, id };
    document.getElementById('vfPrezzo').value     = currentPrezzo || 0;
    document.getElementById('vfPubblica').checked = isPubblica;
    document.getElementById('vendidaTitle').innerHTML =
        type === 'opera'
            ? 'Vendi <span>Opera</span>'
            : 'Vendi <span>Visita</span>';
    document.getElementById('vendidaModal').style.display = 'flex';
    document.body.classList.add('no-scroll');
};

function closeVendidaModal() {
    document.getElementById('vendidaModal').style.display = 'none';
    document.body.classList.remove('no-scroll');
    vendidaTarget = null;
}

async function submitVendita(e) {
    e.preventDefault();
    if (!vendidaTarget) return;

    const prezzo   = parseFloat(document.getElementById('vfPrezzo').value) || 0;
    const pubblica = document.getElementById('vfPubblica').checked;

    const endpoint = vendidaTarget.type === 'opera'
        ? `/api/opere/${vendidaTarget.id}`
        : `/api/visite/${vendidaTarget.id}`;

    try {
        const res  = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prezzo, pubblica }),
        });
        const data = await res.json();

        if (data.ok) {
            closeVendidaModal();
            await loadAll();
            applyFilter();
        } else {
            alert('Errore: ' + data.error);
        }
    } catch (err) {
        alert('Impossibile contattare il server.');
    }
}
