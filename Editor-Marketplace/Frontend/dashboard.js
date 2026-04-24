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
    attachFormHandlers();

    if (SESSION.role === 'curatore') {
        await loadMuseiCuratore();
        switchSection('musei');
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
    autore: [],
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
    document.getElementById('selectModifica').addEventListener('change', function () {
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
    document.getElementById('modificaForm').addEventListener('submit', async (e) => {
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
    document.getElementById('operaForm').addEventListener('submit', async (e) => {
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
    document.getElementById('nuovoMuseoForm').addEventListener('submit', async (e) => {
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
