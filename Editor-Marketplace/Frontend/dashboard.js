/* ============================================================
   dashboard.js — Logica della dashboard ruolo-based
   ============================================================ */

const SESSION = {
    userId:   localStorage.getItem('userId')       || '',
    role:     localStorage.getItem('userRole')     || '',
    username: localStorage.getItem('userUsername') || '',
};

// Musei appartenenti all'utente corrente (curatore)
let curMusei = [];

// Musei per la vista autore (usati nel click handler)
let allMuseiAutore  = [];
let allVisiteAutore = [];
let allOpereAutore  = [];

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    if (!SESSION.userId) {
        window.location.href = '/login/login.html?redirect=/Editor-Marketplace/Frontend/dashboard.html';
        return;
    }

    // Intestazione sidebar
    document.getElementById('sidebarRole').textContent = SESSION.role;

    buildSidebar();

    try { attachFormHandlers(); } catch (e) { console.warn('attachFormHandlers:', e); }

    if (SESSION.role === 'curatore') {
        await loadMuseiCuratore();
        switchSection('musei');
    } else if (SESSION.role === 'autore') {
        switchSection('autore-musei');
    }
});

/* ============================================================
   SIDEBAR — costruisce i bottoni in base al ruolo
   ============================================================ */

const SECTIONS_BY_ROLE = {
    curatore: [
        { id: 'musei',           icon: 'fa-building-columns', label: 'Musei' },
        { id: 'modifica-museo',  icon: 'fa-pen-to-square',    label: 'Modifica Museo' },
        { id: 'aggiungi-opere',  icon: 'fa-image',            label: 'Aggiungi Opera' },
        { id: 'aggiungi-museo',  icon: 'fa-plus-circle',      label: 'Aggiungi Museo' },
    ],
    visitatore: [],
    autore: [
        { id: 'autore-musei',  icon: 'fa-building-columns', label: 'Musei' },
        { id: 'autore-visite', icon: 'fa-route',             label: 'Visite' },
        { id: 'autore-opere',  icon: 'fa-image',             label: 'Opere' },
    ],
};

function buildSidebar() {
    const nav = document.getElementById('sidebarNav');
    const sections = SECTIONS_BY_ROLE[SESSION.role] || [];

    if (sections.length === 0) {
        nav.innerHTML = '<p style="padding:12px;color:#6b7280;font-size:0.85rem;">Nessuna sezione disponibile per questo ruolo.</p>';
        return;
    }

    nav.innerHTML = sections.map(s => `
        <button class="nav-item" data-section="${s.id}">
            <i class="fa-solid ${s.icon}"></i> ${s.label}
        </button>
    `).join('');

    nav.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });
}

/* ============================================================
   NAVIGAZIONE TRA SEZIONI
   ============================================================ */

function switchSection(id) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById('section-' + id);
    if (target) target.style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.nav-item[data-section="${id}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    if (id === 'musei')           renderMusei();
    if (id === 'modifica-museo')  initModificaMuseo();
    if (id === 'aggiungi-opere')  initAggiungiOpere();

    if (id === 'autore-musei')  initAutoreMusei();
    if (id === 'autore-visite') initAutoreVisite();
    if (id === 'autore-opere')  initAutoreOpere();
}

/* ============================================================
   CARICAMENTO MUSEI DEL CURATORE
   ============================================================ */

async function loadMuseiCuratore() {
    try {
        const res = await fetch(`/api/musei?curatoreId=${encodeURIComponent(SESSION.userId)}`);
        const data = await res.json();
        if (data.ok) curMusei = data.data;
    } catch (e) {
        console.error('Errore caricamento musei:', e);
    }
}

/* ============================================================
   SEZIONE: MUSEI — lista
   ============================================================ */

function filterMuseiDash() {
    const q = (document.getElementById('searchMuseiDash')?.value || '').toLowerCase();
    const filtered = q
        ? curMusei.filter(m => m.nome.toLowerCase().includes(q) || m.citta.toLowerCase().includes(q))
        : curMusei;
    renderMusei(filtered);
}

function renderMusei(lista) {
    if (!lista) lista = curMusei;
    const view = document.getElementById('museiView');

    if (lista.length === 0) {
        view.className = '';
        view.innerHTML = '<p class="empty-msg">Nessun museo assegnato. Aggiungine uno dalla sezione "Aggiungi Museo".</p>';
        return;
    }

    view.className = 'items-grid';
    view.innerHTML = lista.map(m => `
        <div class="item-card museo-card" style="cursor:pointer" onclick="showMuseoDetail('${m.codiceIsil}')">
            ${m.immagineCopertina
                ? `<img class="museo-card-img" src="${m.immagineCopertina}" alt="${m.nome}" onerror="this.style.display='none'">`
                : `<div class="museo-card-img-placeholder"><i class="fa fa-building-columns"></i></div>`
            }
            <div class="card-main-header" style="margin-top:14px">
                <div class="title-group">
                    <h3>${m.nome}</h3>
                    <p class="museum-sub"><i class="fa-solid fa-location-dot"></i> ${m.citta}</p>
                </div>
            </div>
            <div class="card-body">
                ${m.descrizioneBreve ? `<p class="description-text">${m.descrizioneBreve}</p>` : ''}
            </div>
            <div class="card-footer">
                <span class="tag-bubble"><i class="fa-solid fa-barcode"></i> ${m.codiceIsil}</span>
            </div>
        </div>
    `).join('');
}

/* ============================================================
   SEZIONE: MUSEI — dettaglio (opere + visite)
   ============================================================ */

window.showMuseoDetail = async function (codiceIsil) {
    const museo = curMusei.find(m => m.codiceIsil === codiceIsil);
    if (!museo) return;

    const view = document.getElementById('museiView');
    view.className = '';
    view.innerHTML = `
        <button class="museo-detail-back" onclick="renderMusei()">
            <i class="fa-solid fa-arrow-left"></i> Torna ai musei
        </button>
        <h2 class="museo-detail-title">${museo.nome}</h2>
        <p class="museo-detail-sub">${museo.citta} · ${museo.codiceIsil}</p>
        <div class="detail-tabs">
            <button class="tab-btn active" onclick="showTab('opere','${codiceIsil}',this)">Opere</button>
            <button class="tab-btn"        onclick="showTab('visite','${codiceIsil}',this)">Visite</button>
        </div>
        <div id="detailContent" class="items-grid"></div>
    `;

    showTab('opere', codiceIsil, view.querySelector('.tab-btn.active'));
};

window.showTab = async function (type, codiceIsil, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const content = document.getElementById('detailContent');
    content.innerHTML = '<p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</p>';

    const url = type === 'opere'
        ? `/api/opere?codiceIsil=${encodeURIComponent(codiceIsil)}`
        : `/api/visite?codiceIsil=${encodeURIComponent(codiceIsil)}`;

    try {
        const res  = await fetch(url);
        const data = await res.json();

        if (!data.ok || data.data.length === 0) {
            content.innerHTML = `<p class="empty-msg">Nessun${type === 'opere' ? "'opera" : 'a visita'} presente.</p>`;
            return;
        }

        if (type === 'opere') {
            content.innerHTML = data.data.map(op => `
                <div class="opera-read-card">
                    ${op.immagine ? `<img src="${op.immagine}" alt="${op.operaId}" onerror="this.style.display='none'">` : ''}
                    <h3>${op.operaId}</h3>
                    ${op.tipo      ? `<p class="opera-meta"><i class="fa-solid fa-tag"></i> ${op.tipo}</p>`           : ''}
                    ${op.autore    ? `<p class="opera-meta"><i class="fa-solid fa-palette"></i> ${op.autore}</p>`     : ''}
                    ${op.datazione ? `<p class="opera-meta"><i class="fa-solid fa-calendar"></i> ${op.datazione}</p>` : ''}
                </div>
            `).join('');
        } else {
            content.innerHTML = data.data.map(v => `
                <div class="visita-read-card">
                    <h3>${v.nomeVisita}</h3>
                    ${v.logistica ? `<p>${v.logistica}</p>` : ''}
                    ${v.quizDomanda ? `<p style="margin-top:8px;font-style:italic;color:#4a7c5f;">❓ ${v.quizDomanda}</p>` : ''}
                </div>
            `).join('');
        }
    } catch (e) {
        content.innerHTML = '<p class="empty-msg">Errore nel caricamento dei dati.</p>';
    }
};

/* ============================================================
   SEZIONE: MODIFICA MUSEO
   ============================================================ */

function initModificaMuseo() {
    const select = document.getElementById('selectModifica');
    select.innerHTML = '<option value="">— Seleziona museo —</option>' +
        curMusei.map(m => `<option value="${m.codiceIsil}">${m.nome}</option>`).join('');
    document.getElementById('modificaForm').style.display = 'none';
}

/* ============================================================
   SEZIONE: AGGIUNGI OPERE
   ============================================================ */

function initAggiungiOpere() {
    const select = document.getElementById('selectOpereMuseo');
    select.innerHTML = '<option value="">— Seleziona museo —</option>' +
        curMusei.map(m => `<option value="${m.codiceIsil}">${m.nome}</option>`).join('');
}

/* ============================================================
   FORM HANDLERS — tutti attaccati una volta in DOMContentLoaded
   ============================================================ */

function attachFormHandlers() {

    // Dropdown modifica → mostra form
    const selectModifica = document.getElementById('selectModifica');
    if (selectModifica) selectModifica.addEventListener('change', function () {
        const codice = this.value;
        const form = document.getElementById('modificaForm');
        if (!codice) { form.style.display = 'none'; return; }

        const m = curMusei.find(x => x.codiceIsil === codice);
        if (!m) return;
        document.getElementById('mfNome').value       = m.nome              || '';
        document.getElementById('mfCitta').value      = m.citta             || '';
        document.getElementById('mfIndirizzo').value  = m.indirizzo         || '';
        document.getElementById('mfCodiceIsil').value = m.codiceIsil        || '';
        document.getElementById('mfImmagine').value   = m.immagineCopertina || '';
        document.getElementById('mfDescrizione').value= m.descrizioneBreve  || '';
        form.style.display = 'block';
    });

    // Submit modifica museo
    const modificaForm = document.getElementById('modificaForm');
    if (modificaForm) modificaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codiceIsil = document.getElementById('selectModifica').value;
        const body = {
            nome:              document.getElementById('mfNome').value,
            citta:             document.getElementById('mfCitta').value,
            indirizzo:         document.getElementById('mfIndirizzo').value,
            codiceIsil:        document.getElementById('mfCodiceIsil').value,
            immagineCopertina: document.getElementById('mfImmagine').value,
            descrizioneBreve:  document.getElementById('mfDescrizione').value,
            curatoreId:        SESSION.userId,
        };
        try {
            const res  = await fetch(`/api/musei/${codiceIsil}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                alert('Museo aggiornato!');
                await loadMuseiCuratore();
                initModificaMuseo();
            } else {
                alert('Errore: ' + data.error);
            }
        } catch (err) {
            alert('Impossibile contattare il server.');
        }
    });

    // Submit aggiungi opera
    const operaForm = document.getElementById('operaForm');
    if (operaForm) operaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codiceIsil = document.getElementById('selectOpereMuseo').value;
        if (!codiceIsil) { alert('Seleziona prima un museo.'); return; }

        const body = {
            codiceIsil,
            operaId:   document.getElementById('ofTitolo').value,
            tipo:      document.getElementById('ofTipo').value,
            autore:    document.getElementById('ofAutore').value,
            datazione: document.getElementById('ofDatazione').value,
            immagine:  document.getElementById('ofImmagine').value,
        };
        try {
            const res  = await fetch('/api/opere', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                alert('Opera aggiunta con successo!');
                document.getElementById('operaForm').reset();
                initAggiungiOpere();
            } else {
                alert('Errore: ' + data.error);
            }
        } catch (err) {
            alert('Impossibile contattare il server.');
        }
    });

    // Submit aggiungi museo
    const nuovoMuseoForm = document.getElementById('nuovoMuseoForm');
    if (nuovoMuseoForm) nuovoMuseoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            nome:              document.getElementById('nmNome').value,
            citta:             document.getElementById('nmCitta').value,
            indirizzo:         document.getElementById('nmIndirizzo').value,
            codiceIsil:        document.getElementById('nmCodiceIsil').value,
            immagineCopertina: document.getElementById('nmImmagine').value,
            descrizioneBreve:  document.getElementById('nmDescrizione').value,
            curatoreId:        SESSION.userId,
        };
        try {
            const res  = await fetch('/api/musei', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                alert('Museo aggiunto!');
                document.getElementById('nuovoMuseoForm').reset();
                await loadMuseiCuratore();
            } else {
                alert('Errore: ' + data.error);
            }
        } catch (err) {
            alert('Impossibile contattare il server.');
        }
    });
}

/* ============================================================
   SEZIONI AUTORE
   ============================================================ */

async function initAutoreMusei() {
    // Rebuild section content each call (handles back-from-detail correctly)
    const section = document.getElementById('section-autore-musei');
    section.innerHTML = `
        <div class="section-header">
            <h2>Musei</h2>
            <p>Esplora i musei disponibili e scopri le visite più popolari.</p>
        </div>
        <h3 class="scroll-section-label">Tutti i Musei</h3>
        <div class="scroll-row" id="autoreMuseiRow">
            <p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</p>
        </div>
        <h3 class="scroll-section-label" style="margin-top:36px;">Visite più Popolari</h3>
        <div class="scroll-row" id="autoreVisitePopRow">
            <p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</p>
        </div>
        <h3 class="scroll-section-label" style="margin-top:36px;">Opere con più Collezioni</h3>
        <div class="scroll-row" id="autoreOpereItemsRow">
            <p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</p>
        </div>
    `;

    const museiRow     = document.getElementById('autoreMuseiRow');
    const visiteRow    = document.getElementById('autoreVisitePopRow');
    const opereItemRow = document.getElementById('autoreOpereItemsRow');

    try {
        const [rMusei, rVisite, rItems] = await Promise.all([
            fetch('/api/musei'),
            fetch('/api/visite'),
            fetch('/api/items'),
        ]);
        const [dMusei, dVisite, dItems] = await Promise.all([
            rMusei.json(), rVisite.json(), rItems.json(),
        ]);

        allMuseiAutore = dMusei.ok ? dMusei.data : [];

        if (dMusei.ok && dMusei.data.length) {
            museiRow.innerHTML = dMusei.data.map(m => `
                <div class="scroll-card scroll-card-clickable" onclick="showAutoreMuseoDetail('${m.codiceIsil}')">
                    ${m.immagineCopertina
                        ? `<img class="scroll-card-img" src="${m.immagineCopertina}" alt="${m.nome}" onerror="this.style.display='none'">`
                        : `<div class="scroll-card-img scroll-card-img-placeholder"><i class="fa fa-building-columns"></i></div>`
                    }
                    <h3>${m.nome}</h3>
                    <p class="scroll-card-sub"><i class="fa-solid fa-location-dot"></i> ${m.citta}</p>
                    <span class="tag-bubble" style="margin-top:auto"><i class="fa-solid fa-barcode"></i> ${m.codiceIsil}</span>
                </div>
            `).join('');
        } else {
            museiRow.innerHTML = '<p style="color:#6b7280;font-size:0.88rem;padding:12px 0;">Nessun museo disponibile. Avvia il seed dei musei.</p>';
        }

        if (dVisite.ok && dVisite.data.length) {
            const sorted = [...dVisite.data].sort((a, b) => (b.acquirenti || 0) - (a.acquirenti || 0));
            visiteRow.innerHTML = sorted.map(v => `
                <div class="scroll-card">
                    <h3>${v.nomeVisita}</h3>
                    <p class="scroll-card-sub"><i class="fa-solid fa-barcode"></i> ${v.codiceIsil}</p>
                    <p class="scroll-card-buyers"><i class="fa-solid fa-users"></i> ${v.acquirenti || 0} acquirenti</p>
                    ${v.prezzo > 0
                        ? `<span class="price-badge" style="margin-top:auto">€${v.prezzo}</span>`
                        : `<span class="free-badge" style="margin-top:auto">Gratis</span>`
                    }
                </div>
            `).join('');
        } else {
            visiteRow.innerHTML = '<p style="color:#6b7280;font-size:0.88rem;padding:12px 0;">Nessuna visita disponibile. Avvia il seed delle visite.</p>';
        }

        // Opere con più items
        if (dItems.ok && dItems.data.length) {
            const museoMap = {};
            allMuseiAutore.forEach(m => { museoMap[m.codiceIsil] = m.nome; });
            // Count items per operaId
            const counts = {};
            dItems.data.forEach(it => {
                if (!counts[it.operaId]) counts[it.operaId] = { count: 0, museumId: it.museumId, img: it.image || '' };
                counts[it.operaId].count++;
                if (!counts[it.operaId].img && it.image) counts[it.operaId].img = it.image;
            });
            const ranked = Object.entries(counts)
                .sort((a, b) => b[1].count - a[1].count);
            opereItemRow.innerHTML = ranked.map(([operaId, info]) => `
                <div class="scroll-card">
                    ${info.img
                        ? `<img class="scroll-card-img" src="${info.img}" alt="${operaId}" onerror="this.style.display='none'">`
                        : `<div class="scroll-card-img scroll-card-img-placeholder"><i class="fa fa-image"></i></div>`
                    }
                    <h3>${operaId}</h3>
                    <p class="scroll-card-sub"><i class="fa-solid fa-building-columns"></i> ${museoMap[info.museumId] || info.museumId}</p>
                    <p class="scroll-card-buyers" style="margin-top:auto">
                        <i class="fa-solid fa-layer-group"></i> ${info.count} collezioni
                    </p>
                </div>
            `).join('');
        } else {
            opereItemRow.innerHTML = '<p style="color:#6b7280;font-size:0.88rem;padding:12px 0;">Nessun item disponibile. Avvia il seed degli items.</p>';
        }
    } catch (e) {
        console.error('Errore autore-musei:', e);
        if (museiRow)     museiRow.innerHTML     = '<p style="color:#e74c3c;font-size:0.88rem;padding:12px 0;">Errore nel caricamento dei musei.</p>';
        if (visiteRow)    visiteRow.innerHTML    = '<p style="color:#e74c3c;font-size:0.88rem;padding:12px 0;">Errore nel caricamento delle visite.</p>';
        if (opereItemRow) opereItemRow.innerHTML = '<p style="color:#e74c3c;font-size:0.88rem;padding:12px 0;">Errore nel caricamento degli items.</p>';
    }
}

window.showAutoreMuseoDetail = async function (codiceIsil) {
    const museo = allMuseiAutore.find(m => m.codiceIsil === codiceIsil);
    if (!museo) return;

    const section = document.getElementById('section-autore-musei');
    section.innerHTML = `
        <button class="museo-detail-back" onclick="switchSection('autore-musei')">
            <i class="fa-solid fa-arrow-left"></i> Torna ai musei
        </button>
        <h2 class="museo-detail-title">${museo.nome}</h2>
        <p class="museo-detail-sub">${museo.citta} · ${museo.codiceIsil}</p>
        <div class="detail-tabs">
            <button class="tab-btn active" onclick="showAutoreTab('opere','${codiceIsil}',this)">Opere</button>
            <button class="tab-btn"        onclick="showAutoreTab('visite','${codiceIsil}',this)">Visite</button>
        </div>
        <div id="autoreDetailContent" class="items-grid"></div>
    `;

    showAutoreTab('opere', codiceIsil, section.querySelector('.tab-btn.active'));
};

window.showAutoreTab = async function (type, codiceIsil, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const content = document.getElementById('autoreDetailContent');
    content.innerHTML = '<p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</p>';

    const url = type === 'opere'
        ? `/api/opere?codiceIsil=${encodeURIComponent(codiceIsil)}`
        : `/api/visite?codiceIsil=${encodeURIComponent(codiceIsil)}`;

    try {
        const res  = await fetch(url);
        const data = await res.json();

        if (!data.ok || data.data.length === 0) {
            content.innerHTML = `<p class="empty-msg">Nessun${type === 'opere' ? "'opera" : 'a visita'} presente.</p>`;
            return;
        }

        if (type === 'opere') {
            content.innerHTML = data.data.map(op => `
                <div class="opera-read-card">
                    ${op.immagine ? `<img src="${op.immagine}" alt="${op.operaId}" onerror="this.style.display='none'">` : ''}
                    <h3>${op.operaId}</h3>
                    ${op.tipo      ? `<p class="opera-meta"><i class="fa-solid fa-tag"></i> ${op.tipo}</p>`           : ''}
                    ${op.autore    ? `<p class="opera-meta"><i class="fa-solid fa-palette"></i> ${op.autore}</p>`     : ''}
                    ${op.datazione ? `<p class="opera-meta"><i class="fa-solid fa-calendar"></i> ${op.datazione}</p>` : ''}
                </div>
            `).join('');
        } else {
            content.innerHTML = data.data.map(v => `
                <div class="visita-read-card">
                    <h3>${v.nomeVisita}</h3>
                    ${v.logistica ? `<p>${v.logistica}</p>` : ''}
                    <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span class="tag-bubble"><i class="fa-solid fa-users"></i> ${v.acquirenti || 0} acquirenti</span>
                        ${v.prezzo > 0
                            ? `<span class="price-badge">€${v.prezzo}</span>`
                            : `<span class="free-badge">Gratis</span>`
                        }
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        content.innerHTML = '<p class="empty-msg">Errore nel caricamento dei dati.</p>';
    }
};

async function initAutoreVisite() {
    const section = document.getElementById('section-autore-visite');
    section.innerHTML = `
        <div class="section-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
                <h2>Visite</h2>
                <p>Tutte le visite disponibili sulla piattaforma.</p>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <div class="search-box-glass" style="min-width:200px;">
                    <i class="fa-solid fa-magnifying-glass search-icon"></i>
                    <input type="text" id="searchVisiteAutore" placeholder="Cerca per nome o museo..." oninput="filterVisiteAutore()">
                </div>
                <button class="btn-primary-glass" onclick="toggleVisitaForm()">
                    <i class="fa-solid fa-plus"></i> Crea Visita
                </button>
            </div>
        </div>

        <div id="visitaFormContainer" style="display:none;margin-bottom:28px;">
            <form id="visitaFormAutore" class="section-form">
                <h3 style="font-family:'Playfair Display',serif;color:#2d5a3d;margin-bottom:16px;font-size:1.1rem;">Nuova Visita</h3>
                <div class="form-grid">
                    <label class="full-width">Museo *
                        <select id="vfMuseo" required>
                            <option value="">— Seleziona museo —</option>
                        </select>
                    </label>
                    <label class="full-width">Nome Visita *
                        <input type="text" id="vfNomeVisita" placeholder="es. Rinascimento Fiorentino" required>
                    </label>
                    <label>Nome Mnemonico
                        <input type="text" id="vfNomeMnemonico" placeholder="es. uffizi_rinascimento">
                    </label>
                    <label>Prezzo (€)
                        <input type="number" id="vfPrezzo" min="0" step="0.01" value="0">
                    </label>
                    <label class="full-width">Logistica
                        <textarea id="vfLogistica" rows="3" placeholder="Descrivi il percorso della visita..."></textarea>
                    </label>
                    <label class="full-width">Domanda Quiz
                        <input type="text" id="vfQuizDomanda" placeholder="es. In quale anno fu dipinta la Primavera?">
                    </label>
                    <label class="full-width" style="flex-direction:row;align-items:center;gap:10px;cursor:pointer;">
                        <input type="checkbox" id="vfPubblica" style="width:auto;accent-color:#2d5a3d;">
                        <span>Metti in vendita subito</span>
                    </label>
                </div>
                <div class="modal-actions" style="gap:10px;">
                    <button type="button" class="btn-secondary-dash" onclick="toggleVisitaForm()">Annulla</button>
                    <button type="submit" class="btn-submit"><i class="fa-solid fa-plus"></i> Crea Visita</button>
                </div>
            </form>
        </div>

        <div id="autoreVisiteView" class="items-grid"></div>
    `;

    // Popola dropdown museo
    if (!allMuseiAutore.length) {
        try {
            const r = await fetch('/api/musei');
            const d = await r.json();
            if (d.ok) allMuseiAutore = d.data;
        } catch (e) { /* silent */ }
    }
    populateMuseoSelect('vfMuseo', allMuseiAutore);

    document.getElementById('visitaFormAutore').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            nomeVisita:    document.getElementById('vfNomeVisita').value,
            nomeMnemonico: document.getElementById('vfNomeMnemonico').value,
            logistica:     document.getElementById('vfLogistica').value,
            quizDomanda:   document.getElementById('vfQuizDomanda').value,
            codiceIsil:    document.getElementById('vfMuseo').value,
            prezzo:        parseFloat(document.getElementById('vfPrezzo').value) || 0,
            pubblica:      document.getElementById('vfPubblica').checked,
            autoreId:      SESSION.userId,
        };
        if (!body.codiceIsil) { alert('Seleziona un museo.'); return; }
        try {
            const res  = await fetch('/api/visite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                alert('Visita creata!');
                document.getElementById('visitaFormAutore').reset();
                toggleVisitaForm();
                await loadVisiteAutore();
            } else {
                alert('Errore: ' + data.error);
            }
        } catch (err) {
            alert('Impossibile contattare il server.');
        }
    });

    await loadVisiteAutore();
}

window.toggleVisitaForm = function () {
    const c = document.getElementById('visitaFormContainer');
    if (!c) return;
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
};

async function loadVisiteAutore() {
    const view = document.getElementById('autoreVisiteView');
    if (!view) return;
    view.className = '';
    view.innerHTML = '<p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</p>';
    try {
        const res  = await fetch('/api/visite');
        const data = await res.json();
        if (!data.ok) { view.innerHTML = '<p class="empty-msg">Errore nel caricamento.</p>'; return; }
        allVisiteAutore = data.data;
        renderVisiteAutore(allVisiteAutore);
    } catch (e) {
        view.innerHTML = '<p class="empty-msg">Errore nel caricamento.</p>';
    }
}

function renderVisiteAutore(visite) {
    const view = document.getElementById('autoreVisiteView');
    if (!view) return;
    if (!visite.length) {
        view.className = '';
        view.innerHTML = '<p class="empty-msg">Nessuna visita trovata.</p>';
        return;
    }
    view.className = 'items-grid';
    view.innerHTML = visite.map(v => `
        <div class="visita-read-card">
            <h3>${v.nomeVisita}</h3>
            ${v.logistica ? `<p>${v.logistica}</p>` : ''}
            <div style="margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span class="tag-bubble"><i class="fa-solid fa-barcode"></i> ${v.codiceIsil}</span>
                <span class="tag-bubble"><i class="fa-solid fa-users"></i> ${v.acquirenti || 0}</span>
                ${v.prezzo > 0
                    ? `<span class="price-badge">€${v.prezzo}</span>`
                    : `<span class="free-badge">Gratis</span>`
                }
            </div>
        </div>
    `).join('');
}

window.filterVisiteAutore = function () {
    const q = (document.getElementById('searchVisiteAutore')?.value || '').toLowerCase();
    if (!q) { renderVisiteAutore(allVisiteAutore); return; }
    const museoMap = {};
    allMuseiAutore.forEach(m => { museoMap[m.codiceIsil] = m.nome.toLowerCase(); });
    const filtered = allVisiteAutore.filter(v =>
        v.nomeVisita.toLowerCase().includes(q) ||
        (museoMap[v.codiceIsil] || '').includes(q) ||
        v.codiceIsil.toLowerCase().includes(q)
    );
    renderVisiteAutore(filtered);
};

async function initAutoreOpere() {
    const section = document.getElementById('section-autore-opere');
    section.innerHTML = `
        <div class="section-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
                <h2>Opere</h2>
                <p>Tutte le opere presenti nei musei.</p>
            </div>
            <div class="search-box-glass" style="min-width:200px;">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input type="text" id="searchOpereAutore" placeholder="Cerca per titolo o museo..." oninput="filterOpereAutore()">
            </div>
        </div>
        <div id="autoreOpereView" class="items-grid"></div>
    `;

    if (!allMuseiAutore.length) {
        try {
            const r = await fetch('/api/musei');
            const d = await r.json();
            if (d.ok) allMuseiAutore = d.data;
        } catch (e) { /* silent */ }
    }

    await loadOpereAutore();
}

async function loadOpereAutore() {
    const view = document.getElementById('autoreOpereView');
    if (!view) return;
    view.className = '';
    view.innerHTML = '<p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</p>';
    try {
        const res  = await fetch('/api/opere');
        const data = await res.json();
        if (!data.ok) { view.innerHTML = '<p class="empty-msg">Errore nel caricamento.</p>'; return; }
        allOpereAutore = data.data;
        renderOpereAutore(allOpereAutore);
    } catch (e) {
        view.innerHTML = '<p class="empty-msg">Errore nel caricamento.</p>';
    }
}

function renderOpereAutore(opere) {
    const view = document.getElementById('autoreOpereView');
    if (!view) return;
    if (!opere.length) {
        view.className = '';
        view.innerHTML = '<p class="empty-msg">Nessuna opera trovata.</p>';
        return;
    }
    view.className = 'items-grid';
    view.innerHTML = opere.map(op => `
        <div class="opera-read-card scroll-card-clickable" onclick="showOperaDetail('${op._id}')">
            ${op.immagine ? `<img src="${op.immagine}" alt="${op.operaId}" onerror="this.style.display='none'">` : ''}
            <h3>${op.operaId}</h3>
            ${op.tipo      ? `<p class="opera-meta"><i class="fa-solid fa-tag"></i> ${op.tipo}</p>`           : ''}
            ${op.autore    ? `<p class="opera-meta"><i class="fa-solid fa-palette"></i> ${op.autore}</p>`     : ''}
            ${op.datazione ? `<p class="opera-meta"><i class="fa-solid fa-calendar"></i> ${op.datazione}</p>` : ''}
            <span class="tag-bubble" style="margin-top:auto"><i class="fa-solid fa-barcode"></i> ${op.codiceIsil}</span>
        </div>
    `).join('');
}

window.filterOpereAutore = function () {
    const q = (document.getElementById('searchOpereAutore')?.value || '').toLowerCase();
    if (!q) { renderOpereAutore(allOpereAutore); return; }
    const museoMap = {};
    allMuseiAutore.forEach(m => { museoMap[m.codiceIsil] = m.nome.toLowerCase(); });
    const filtered = allOpereAutore.filter(op =>
        op.operaId.toLowerCase().includes(q) ||
        (museoMap[op.codiceIsil] || '').includes(q) ||
        op.codiceIsil.toLowerCase().includes(q) ||
        (op.autore || '').toLowerCase().includes(q)
    );
    renderOpereAutore(filtered);
};

function populateMuseoSelect(id, musei) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">— Seleziona museo —</option>' +
        musei.map(m => `<option value="${m.codiceIsil}">${m.nome}</option>`).join('');
}

/* ============================================================
   DETTAGLIO OPERA — items e creazione
   ============================================================ */

window.showOperaDetail = async function (operaMongoId) {
    const opera = allOpereAutore.find(op => String(op._id) === operaMongoId);
    if (!opera) return;

    const museoNome = allMuseiAutore.find(m => m.codiceIsil === opera.codiceIsil)?.nome || opera.codiceIsil;
    const section   = document.getElementById('section-autore-opere');

    section.innerHTML = `
        <button class="museo-detail-back" onclick="switchSection('autore-opere')">
            <i class="fa-solid fa-arrow-left"></i> Torna alle opere
        </button>
        <h2 class="museo-detail-title">${opera.operaId}</h2>
        <p class="museo-detail-sub">
            ${opera.autore ? opera.autore + ' · ' : ''}${museoNome}
            ${opera.datazione ? ' · ' + opera.datazione : ''}
        </p>

        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin:20px 0 14px;">
            <h3 class="scroll-section-label" style="margin:0;">Collezioni associate</h3>
            <button class="btn-primary-glass" onclick="toggleItemForm()">
                <i class="fa-solid fa-plus"></i> Crea item per quest'opera
            </button>
        </div>

        <div id="itemFormContainer" style="display:none;margin-bottom:28px;">
            <form id="itemFormAutore" class="section-form">
                <h3 style="font-family:'Playfair Display',serif;color:#2d5a3d;margin-bottom:16px;font-size:1.1rem;">Nuovo Item</h3>
                <div class="form-grid">
                    <label class="full-width">Descrizione / Contenuto *
                        <textarea id="ifContenuto" rows="4" placeholder="Inserisci una descrizione, nota critica o approfondimento..." required></textarea>
                    </label>
                    <label>Materiale
                        <input type="text" id="ifMateriale" placeholder="es. Marmo, Tempera su tavola">
                    </label>
                    <label>Tecnica
                        <input type="text" id="ifTecnica" placeholder="es. Scultura, Affresco">
                    </label>
                    <label>Dimensioni
                        <input type="text" id="ifDimensioni" placeholder="es. 194 cm, 172 × 278 cm">
                    </label>
                    <label>Provenienza
                        <input type="text" id="ifProvenienza" placeholder="es. Tebe, Firenze">
                    </label>
                    <label>Periodo
                        <input type="text" id="ifPeriodo" placeholder="es. XIII sec. a.C., 1477–1478">
                    </label>
                    <label class="full-width">URL Immagine
                        <input type="url" id="ifImmagine" placeholder="https://...">
                    </label>
                </div>
                <div class="modal-actions" style="gap:10px;">
                    <button type="button" class="btn-secondary-dash" onclick="toggleItemForm()">Annulla</button>
                    <button type="submit" class="btn-submit"><i class="fa-solid fa-plus"></i> Salva Item</button>
                </div>
            </form>
        </div>

        <div id="itemsGrid" class="items-grid"></div>
    `;

    // Attach form submit
    document.getElementById('itemFormAutore').addEventListener('submit', async (e) => {
        e.preventDefault();
        const contenuto = document.getElementById('ifContenuto').value.trim();
        if (!contenuto) { alert('Inserisci almeno una descrizione.'); return; }

        const metadata = {};
        const fields = { materiale: 'ifMateriale', tecnica: 'ifTecnica', dimensioni: 'ifDimensioni', provenienza: 'ifProvenienza', periodo: 'ifPeriodo' };
        Object.entries(fields).forEach(([key, id]) => {
            const val = document.getElementById(id).value.trim();
            if (val) metadata[key] = val;
        });

        const body = {
            operaId:  opera.operaId,
            museumId: opera.codiceIsil,
            authorId: SESSION.userId,
            objectId: opera.operaId.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
            contents: [contenuto],
            metadata,
            image:    document.getElementById('ifImmagine').value.trim(),
        };

        try {
            const res  = await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                alert('Item creato!');
                document.getElementById('itemFormAutore').reset();
                toggleItemForm();
                await loadItemsForOpera(opera.operaId);
            } else {
                alert('Errore: ' + data.error);
            }
        } catch (err) {
            alert('Impossibile contattare il server.');
        }
    });

    await loadItemsForOpera(opera.operaId);
};

window.toggleItemForm = function () {
    const c = document.getElementById('itemFormContainer');
    if (!c) return;
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
};

async function loadItemsForOpera(operaId) {
    const grid = document.getElementById('itemsGrid');
    if (!grid) return;
    grid.innerHTML = '<p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</p>';

    try {
        const res  = await fetch(`/api/items?operaId=${encodeURIComponent(operaId)}`);
        const data = await res.json();

        if (!data.ok || !data.data.length) {
            grid.className = '';
            grid.innerHTML = '<p class="empty-msg">Nessun item ancora. Creane uno con il pulsante qui sopra.</p>';
            return;
        }

        grid.className = 'items-grid';
        grid.innerHTML = data.data.map(item => `
            <div class="item-read-card">
                ${item.image ? `<img src="${item.image}" alt="item" onerror="this.style.display='none'">` : ''}
                <div class="item-contents">
                    ${(item.contents || []).map(c => `<p>${c}</p>`).join('')}
                </div>
                ${Object.keys(item.metadata || {}).length ? `
                <ul class="item-metadata-list">
                    ${Object.entries(item.metadata).map(([k, v]) => `
                        <li><span class="meta-key">${k}:</span> ${v}</li>
                    `).join('')}
                </ul>` : ''}
                <span class="tag-bubble" style="margin-top:auto;font-size:0.78rem;">
                    <i class="fa-solid fa-user"></i> ${item.authorId}
                </span>
            </div>
        `).join('');
    } catch (e) {
        grid.innerHTML = '<p class="empty-msg">Errore nel caricamento degli items.</p>';
    }
}
