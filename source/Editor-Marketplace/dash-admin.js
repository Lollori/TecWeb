let allAdminUtenti      = [];
let allAdminMusei       = [];
let adminMuseiViewMode  = 'table';
let allAdminOpere       = [];
let adminOpereViewMode  = 'table';
let allAdminVisite      = [];
let allAdminItems       = [];

const ADMIN_ROLE_BADGE = {
    curatore:   'bg-primary',
    autore:     'bg-warning text-dark',
    visitatore: 'bg-magenta',
    admin:      'bg-danger',
};

function adminTableHeader(cols) {
    return `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}<th>Azioni</th></tr></thead>`;
}

function adminActionBtns(editFn, delFn) {
    return `<div class="d-flex gap-2">
        <button class="btn-outline-custom btn-sm" title="Modifica" onclick="${editFn}">
            <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="btn-outline-custom btn-sm" title="Elimina"
                style="color:#ef4444;border-color:#ef4444;" onclick="${delFn}">
            <i class="fa-solid fa-trash"></i>
        </button>
    </div>`;
}

function adminSearchHeader(title, inputId, onInputFn, subtitle = '') {
    return `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="page-title">${title}</h1>
                ${subtitle ? `<p class="text-muted mb-0">${subtitle}</p>` : ''}
            </div>
            <div class="search-box-container shadow-sm py-1 px-3" style="max-width:280px;">
                <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                <input type="text" id="${inputId}" class="search-input py-2"
                       placeholder="Cerca…" oninput="${onInputFn}()">
            </div>
        </div>`;
}


async function initAdminUtenti() {
    const section = document.getElementById('section-admin-utenti');
    section.innerHTML = `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="page-title">Gestione Utenti</h1>
                <p class="text-muted mb-0">Visualizza e gestisci gli utenti della piattaforma.</p>
            </div>
            <div class="d-flex gap-2 align-items-center flex-wrap">
                <select id="filterRoleAdminUtenti" class="custom-input"
                        style="min-width:150px;padding:6px 14px;height:42px;"
                        onchange="filterAdminUtenti()">
                    <option value="">Tutti i ruoli</option>
                    <option value="curatore">Curatore</option>
                    <option value="autore">Autore</option>
                    <option value="visitatore">Visitatore</option>
                    <option value="admin">Admin</option>
                </select>
                <div class="search-box-container shadow-sm py-1 px-3" style="max-width:280px;">
                    <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                    <input type="text" id="searchAdminUtenti" class="search-input py-2"
                           placeholder="Cerca…" oninput="filterAdminUtenti()">
                </div>
            </div>
        </div>
        <div class="glass-card p-4">
            <table class="table table-hover mb-0">
                ${adminTableHeader(['Utente', 'Ruolo'])}
                <tbody id="adminUtentiBody">
                    <tr><td colspan="3" class="text-center text-muted py-4">
                        <i class="fa-solid fa-spinner fa-spin me-2"></i>Caricamento…
                    </td></tr>
                </tbody>
            </table>
        </div>`;

    try {
        const res  = await fetch('/api/utenti');
        const data = await res.json();
        allAdminUtenti = data.ok ? data.data : [];
        renderAdminUtenti(allAdminUtenti);
    } catch (e) {
        document.getElementById('adminUtentiBody').innerHTML =
            '<tr><td colspan="3" class="text-center text-danger py-4">Errore nel caricamento.</td></tr>';
    }
}

function filterAdminUtenti() {
    const q    = (document.getElementById('searchAdminUtenti')?.value || '').toLowerCase();
    const role = (document.getElementById('filterRoleAdminUtenti')?.value || '').toLowerCase();
    let lista = allAdminUtenti;
    if (role) lista = lista.filter(u => u.ruolo.toLowerCase() === role);
    if (q)    lista = lista.filter(u =>
        u.username.toLowerCase().includes(q) || u.ruolo.toLowerCase().includes(q));
    renderAdminUtenti(lista);
}

function renderAdminUtenti(lista) {
    const tbody = document.getElementById('adminUtentiBody');
    if (!tbody) return;
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Nessun utente trovato.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(u => {
        const avatarSrc = ROLE_AVATARS[u.ruolo];
        const avatarHtml = avatarSrc
            ? `<div class="avatar-sm" style="background-image:url('${avatarSrc}')"></div>`
            : `<div class="avatar-sm">${(u.username || '?')[0].toUpperCase()}</div>`;
        return `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-3">
                    ${avatarHtml}
                    <div>
                        <div class="fw-bold">${u.username}</div>
                        <small class="text-muted">${u.userId || ''}</small>
                    </div>
                </div>
            </td>
            <td><span class="badge ${ADMIN_ROLE_BADGE[u.ruolo] || 'bg-secondary'}">${u.ruolo}</span></td>
            <td>
                ${u.ruolo !== 'admin' ? `
                <button class="btn-outline-custom btn-sm" title="Elimina"
                        style="color:#ef4444;border-color:#ef4444;"
                        onclick="adminDeleteUtente('${u._id}','${u.username}')">
                    <i class="fa-solid fa-trash"></i>
                </button>` : `<span class="text-muted" style="font-size:0.8rem;" title="Il profilo admin non può essere eliminato">
                    <i class="fa-solid fa-lock me-1"></i>Protetto
                </span>`}
            </td>
        </tr>`;
    }).join('');
}

window.adminDeleteUtente = async function (id, username) {
    if (!(await showConfirm(`Eliminare l'utente "${username}"?`))) return;
    try {
        const res  = await fetch(`/api/utenti/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAdminUtenti = allAdminUtenti.filter(u => u._id !== id);
            renderAdminUtenti(allAdminUtenti);
        } else {
            showAlert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { showAlert('Impossibile contattare il server.'); }
};


async function initAdminMusei() {
    adminMuseiViewMode = 'table';
    const section = document.getElementById('section-admin-musei');
    section.innerHTML = `
        <!-- Header -->
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <div>
                <h1 class="page-title">Gestione Musei</h1>
                <p class="text-muted mb-0">Modifica e monitora i musei presenti sulla piattaforma.</p>
            </div>
            <div class="d-flex gap-2 align-items-center flex-wrap">
                <!-- Vista toggle -->
                <div class="d-flex" style="border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                    <button id="btnAdminMuseiTable" onclick="setAdminMuseiView('table')" title="Vista tabella"
                            class="view-toggle-btn vt-active">
                        <i class="fa-solid fa-table-list"></i>
                    </button>
                    <button id="btnAdminMuseiCards" onclick="setAdminMuseiView('cards')" title="Vista cards"
                            class="view-toggle-btn vt-inactive">
                        <i class="fa-solid fa-grip"></i>
                    </button>
                </div>
                <!-- Filtri toggle -->
                <button id="btnAdminMuseiFiltri" onclick="toggleAdminMuseiFilters()"
                        class="btn-outline-custom" style="gap:6px;display:flex;align-items:center;">
                    <i class="fa-solid fa-sliders"></i> Filtri
                </button>
                <!-- Ricerca -->
                <div class="search-box-container shadow-sm py-1 px-3" style="max-width:260px;">
                    <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                    <input type="text" id="searchAdminMusei" class="search-input py-2"
                           placeholder="Cerca…" oninput="filterAdminMusei()">
                </div>
            </div>
        </div>

        <!-- Pannello filtri (collassabile) -->
        <div id="adminMuseiFilterPanel" class="glass-card p-3 mb-3" style="display:none;">
            <div class="row g-3 align-items-end">
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;" for="filterMuseiCitta">Città</label>
                    <select id="filterMuseiCitta" class="custom-input" style="padding:7px 12px;" onchange="filterAdminMusei()">
                        <option value="">Tutte le città</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;" for="filterMuseiIsil">Codice ISIL</label>
                    <input type="text" id="filterMuseiIsil" class="custom-input" style="padding:7px 12px;"
                           placeholder="Es. IT-RM001" oninput="filterAdminMusei()">
                </div>
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;" for="filterMuseiCuratore">Curatore (ID)</label>
                    <select id="filterMuseiCuratore" class="custom-input" style="padding:7px 12px;" onchange="filterAdminMusei()">
                        <option value="">Tutti i curatori</option>
                    </select>
                </div>
                <div class="col-12 d-flex justify-content-end">
                    <button class="btn-outline-custom btn-sm" onclick="resetAdminMuseiFilters()">
                        <i class="fa-solid fa-rotate-left me-1"></i>Azzera filtri
                    </button>
                </div>
            </div>
        </div>

        <!-- Contenuto (tabella o cards) -->
        <div id="adminMuseiContent">
            <div class="glass-card p-4">
                <table class="table table-hover mb-0">
                    ${adminTableHeader(['Nome', 'Città', 'ISIL', 'Curatore'])}
                    <tbody id="adminMuseiBody">
                        <tr><td colspan="5" class="text-center text-muted py-4">
                            <i class="fa-solid fa-spinner fa-spin me-2"></i>Caricamento…
                        </td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

    try {
        const res  = await fetch('/api/musei');
        const data = await res.json();
        allAdminMusei = data.ok ? data.data : [];
        _populateAdminMuseiFilters(allAdminMusei);
        renderAdminMusei(allAdminMusei);
    } catch (e) {
        document.getElementById('adminMuseiContent').innerHTML =
            '<div class="glass-card p-4"><p class="text-danger text-center">Errore nel caricamento.</p></div>';
    }
}

function _populateAdminMuseiFilters(lista) {
    const citta    = [...new Set(lista.map(m => m.citta).filter(Boolean))].sort();
    const curatori = [...new Set(lista.map(m => m.curatoreId).filter(Boolean))].sort();
    const selCitta = document.getElementById('filterMuseiCitta');
    const selCur   = document.getElementById('filterMuseiCuratore');
    if (selCitta) selCitta.innerHTML = '<option value="">Tutte le città</option>' +
        citta.map(c => `<option value="${c}">${c}</option>`).join('');
    if (selCur)   selCur.innerHTML   = '<option value="">Tutti i curatori</option>' +
        curatori.map(c => `<option value="${c}">${c}</option>`).join('');
}

window.toggleAdminMuseiFilters = function () {
    const panel = document.getElementById('adminMuseiFilterPanel');
    const btn   = document.getElementById('btnAdminMuseiFiltri');
    if (!panel) return;
    const open = panel.style.display === 'none';
    panel.style.display = open ? '' : 'none';
    if (btn) btn.style.background = open ? 'rgba(255,0,127,0.08)' : '';
};

window.resetAdminMuseiFilters = function () {
    ['filterMuseiCitta','filterMuseiCuratore'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const isil = document.getElementById('filterMuseiIsil');
    if (isil) isil.value = '';
    filterAdminMusei();
};

window.setAdminMuseiView = function (mode) {
    adminMuseiViewMode = mode;
    const btnTable = document.getElementById('btnAdminMuseiTable');
    const btnCards = document.getElementById('btnAdminMuseiCards');
    if (btnTable) { btnTable.className = 'view-toggle-btn ' + (mode === 'table' ? 'vt-active' : 'vt-inactive'); }
    if (btnCards) { btnCards.className = 'view-toggle-btn ' + (mode === 'cards' ? 'vt-active' : 'vt-inactive'); }
    filterAdminMusei();
};

function filterAdminMusei() {
    const q       = (document.getElementById('searchAdminMusei')?.value || '').toLowerCase();
    const citta   = document.getElementById('filterMuseiCitta')?.value   || '';
    const isil    = (document.getElementById('filterMuseiIsil')?.value  || '').toLowerCase();
    const curatore = document.getElementById('filterMuseiCuratore')?.value || '';

    let lista = allAdminMusei;
    if (q)       lista = lista.filter(m =>
        m.nome.toLowerCase().includes(q) || m.citta.toLowerCase().includes(q) ||
        (m.codiceIsil || '').toLowerCase().includes(q));
    if (citta)   lista = lista.filter(m => m.citta === citta);
    if (isil)    lista = lista.filter(m => (m.codiceIsil || '').toLowerCase().includes(isil));
    if (curatore) lista = lista.filter(m => m.curatoreId === curatore);
    renderAdminMusei(lista);
}

function renderAdminMusei(lista) {
    const container = document.getElementById('adminMuseiContent');
    if (!container) return;

    if (adminMuseiViewMode === 'cards') {
        if (!lista.length) {
            container.innerHTML = '<p class="text-muted text-center py-5">Nessun museo trovato.</p>';
            return;
        }
        container.innerHTML = `<div class="items-grid">${lista.map(m => {
            const safeIsil = (m.codiceIsil || '').replace(/'/g, "\\'");
            const safeName = (m.nome || '').replace(/'/g, "\\'");
            return `
            <div class="glass-card" style="display:flex;flex-direction:column;overflow:hidden;">
                <div style="position:relative;height:200px;flex-shrink:0;background:#f0f0f0;overflow:hidden;">
                    ${m.immagineCopertina
                        ? `<img loading="lazy" src="${m.immagineCopertina}" alt="${m.nome}"
                                style="width:100%;height:100%;object-fit:cover;"
                                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                           <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:linear-gradient(135deg,#f3f4f6,#e5e7eb);">
                               <i class="fa-solid fa-building-columns" style="font-size:2.5rem;color:#cbd5e1;"></i>
                           </div>`
                        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f3f4f6,#e5e7eb);">
                               <i class="fa-solid fa-building-columns" style="font-size:2.5rem;color:#cbd5e1;"></i>
                           </div>`}
                </div>
                <div style="padding:14px 16px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
                    <div>
                        <div class="fw-bold" style="font-size:1rem;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.nome}</div>
                        <small class="text-muted"><i class="fa-solid fa-location-dot me-1"></i>${m.citta}</small><br>
                        <span class="tag-bubble" style="font-size:0.72rem;margin-top:4px;display:inline-block;">${m.codiceIsil || '—'}</span>
                    </div>
                    <div class="d-flex gap-2 mt-2">
                        <button class="btn-outline-custom btn-sm flex-fill" title="Modifica"
                                onclick="adminEditMuseo('${safeIsil}')">
                            <i class="fa-solid fa-pen-to-square me-1"></i>Modifica
                        </button>
                        <button class="btn-outline-custom btn-sm" title="Elimina"
                                style="color:#ef4444;border-color:#ef4444;"
                                onclick="adminDeleteMuseo('${safeIsil}','${safeName}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`; }).join('')}</div>`;
        return;
    }


    container.innerHTML = `
        <div class="glass-card p-4">
            <table class="table table-hover mb-0">
                ${adminTableHeader(['Nome', 'Città', 'ISIL', 'Curatore'])}
                <tbody id="adminMuseiBody"></tbody>
            </table>
        </div>`;
    const tbody = document.getElementById('adminMuseiBody');
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Nessun museo trovato.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(m => `
        <tr>
            <td class="fw-bold">${m.nome}</td>
            <td>${m.citta}</td>
            <td><span class="tag-bubble" style="font-size:0.78rem;">${m.codiceIsil || '—'}</span></td>
            <td><small class="text-muted">${m.curatoreId || '—'}</small></td>
            <td>${adminActionBtns(
                `adminEditMuseo('${(m.codiceIsil||'').replace(/'/g,"\\'")}')`,
                `adminDeleteMuseo('${(m.codiceIsil||'').replace(/'/g,"\\'")}','${m.nome.replace(/'/g,"\\'")}')`
            )}</td>
        </tr>`).join('');
}

window.adminDeleteMuseo = async function (codiceIsil, nome) {
    if (!(await showConfirm(`Eliminare il museo "${nome}"?`))) return;
    try {
        const res  = await fetch(`/api/musei/${codiceIsil}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAdminMusei = allAdminMusei.filter(m => m.codiceIsil !== codiceIsil);
            renderAdminMusei(allAdminMusei);
        } else {
            showAlert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { showAlert('Impossibile contattare il server.'); }
};

window.adminEditMuseo = function (codiceIsil) {
    const m = allAdminMusei.find(x => x.codiceIsil === codiceIsil);
    if (!m) return;
    const section = document.getElementById('section-admin-musei');
    section.innerHTML = `
        <button class="museo-detail-back" onclick="initAdminMusei()">
            <i class="fa-solid fa-arrow-left"></i> Torna ai musei
        </button>
        <h2 class="museo-detail-title">Modifica Museo</h2>
        <p class="museo-detail-sub">${m.codiceIsil}</p>
        <div class="glass-card p-5 mt-4">
            <form id="adminMuseoForm" class="row g-4">
                <div class="col-md-6">
                    <label class="custom-label" for="amNome">Nome *</label>
                    <input type="text" id="amNome" class="custom-input" value="${m.nome || ''}" required>
                </div>
                <div class="col-md-6">
                    <label class="custom-label" for="amCitta">Città *</label>
                    <input type="text" id="amCitta" class="custom-input" value="${m.citta || ''}" required>
                </div>
                <div class="col-12">
                    <label class="custom-label" for="amIndirizzo">Indirizzo</label>
                    <input type="text" id="amIndirizzo" class="custom-input" value="${m.indirizzo || ''}">
                </div>
                <div class="col-md-8">
                    <label class="custom-label" for="amImmagine">URL Copertina</label>
                    <input type="url" id="amImmagine" class="custom-input" value="${m.immagineCopertina || ''}">
                </div>
                <div class="col-md-4">
                    <label class="custom-label" for="amCodiceIsil">Codice ISIL</label>
                    <input type="text" id="amCodiceIsil" class="custom-input" value="${m.codiceIsil}" disabled>
                </div>
                <div class="col-12">
                    <label class="custom-label" for="amDescrizione">Descrizione</label>
                    <textarea id="amDescrizione" class="custom-input" rows="3">${m.descrizioneBreve || ''}</textarea>
                </div>
                <div class="col-12 d-flex justify-content-end gap-3 pt-3" style="border-top:1px solid #e2e8f0;">
                    <button type="button" class="btn-outline-custom" onclick="initAdminMusei()">Annulla</button>
                    <button type="submit" class="btn-magenta">Salva Modifiche</button>
                </div>
            </form>
        </div>`;

    document.getElementById('adminMuseoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            nome:              document.getElementById('amNome').value.trim(),
            citta:             document.getElementById('amCitta').value.trim(),
            indirizzo:         document.getElementById('amIndirizzo').value.trim(),
            immagineCopertina: document.getElementById('amImmagine').value.trim(),
            descrizioneBreve:  document.getElementById('amDescrizione').value.trim(),
            codiceIsil:        m.codiceIsil,
            curatoreId:        m.curatoreId,
        };
        try {
            const res  = await fetch(`/api/musei/${m.codiceIsil}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) { showAlert('Museo aggiornato!'); initAdminMusei(); }
            else showAlert('Errore: ' + (data.error || 'Aggiornamento fallito.'));
        } catch (err) { showAlert('Impossibile contattare il server.'); }
    });
};


async function initAdminOpere() {
    adminOpereViewMode = 'table';
    const section = document.getElementById('section-admin-opere');
    section.innerHTML = `
        <!-- Header -->
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <div>
                <h1 class="page-title">Gestione Opere</h1>
                <p class="text-muted mb-0">Consulta e modifica le opere presenti nei musei.</p>
            </div>
            <div class="d-flex gap-2 align-items-center flex-wrap">
                <!-- Vista toggle -->
                <div class="d-flex" style="border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                    <button id="btnAdminOpereTable" onclick="setAdminOpereView('table')" title="Vista tabella"
                            class="view-toggle-btn vt-active">
                        <i class="fa-solid fa-table-list"></i>
                    </button>
                    <button id="btnAdminOpereCards" onclick="setAdminOpereView('cards')" title="Vista cards"
                            class="view-toggle-btn vt-inactive">
                        <i class="fa-solid fa-grip"></i>
                    </button>
                </div>
                <!-- Filtri toggle -->
                <button id="btnAdminOpereFilters" onclick="toggleAdminOpereFilters()"
                        class="btn-outline-custom" style="gap:6px;display:flex;align-items:center;">
                    <i class="fa-solid fa-sliders"></i> Filtri
                </button>
                <!-- Ricerca -->
                <div class="search-box-container shadow-sm py-1 px-3" style="max-width:260px;">
                    <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                    <input type="text" id="searchAdminOpere" class="search-input py-2"
                           placeholder="Cerca…" oninput="filterAdminOpere()">
                </div>
            </div>
        </div>

        <!-- Pannello filtri -->
        <div id="adminOpereFilterPanel" class="glass-card p-3 mb-3" style="display:none;">
            <div class="row g-3 align-items-end">
                <div class="col-md-6">
                    <label class="custom-label mb-1" style="font-size:0.82rem;" for="filterOpereTipo">Tipo</label>
                    <select id="filterOpereTipo" class="custom-input" style="padding:7px 12px;" onchange="filterAdminOpere()">
                        <option value="">Tutti i tipi</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="custom-label mb-1" style="font-size:0.82rem;" for="filterOpereMuseo">Museo (ISIL)</label>
                    <select id="filterOpereMuseo" class="custom-input" style="padding:7px 12px;" onchange="filterAdminOpere()">
                        <option value="">Tutti i musei</option>
                    </select>
                </div>
                <div class="col-12 d-flex justify-content-end">
                    <button class="btn-outline-custom btn-sm" onclick="resetAdminOpereFilters()">
                        <i class="fa-solid fa-rotate-left me-1"></i>Azzera filtri
                    </button>
                </div>
            </div>
        </div>

        <!-- Contenuto -->
        <div id="adminOpereContent">
            <div class="glass-card p-4">
                <table class="table table-hover mb-0">
                    ${adminTableHeader(['Titolo', 'Autore', 'Tipo', 'Museo'])}
                    <tbody id="adminOpereBody">
                        <tr><td colspan="5" class="text-center text-muted py-4">
                            <i class="fa-solid fa-spinner fa-spin me-2"></i>Caricamento…
                        </td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

    try {
        const res  = await fetch('/api/opere');
        const data = await res.json();
        allAdminOpere = data.ok ? data.data : [];
        _populateAdminOpereFilters(allAdminOpere);
        renderAdminOpere(allAdminOpere);
    } catch (e) {
        document.getElementById('adminOpereContent').innerHTML =
            '<div class="glass-card p-4"><p class="text-danger text-center">Errore nel caricamento.</p></div>';
    }
}

function _populateAdminOpereFilters(lista) {
    const tipi    = [...new Set(lista.map(op => op.tipo).filter(Boolean))].sort();
    const musei   = [...new Set(lista.map(op => op.codiceIsil).filter(Boolean))].sort();
    const sel = (id, opts, label) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<option value="">${label}</option>` +
            opts.map(v => `<option value="${v}">${v}</option>`).join('');
    };
    sel('filterOpereTipo',    tipi,    'Tutti i tipi');
    sel('filterOpereMuseo',   musei,   'Tutti i musei');
}

window.toggleAdminOpereFilters = function () {
    const panel = document.getElementById('adminOpereFilterPanel');
    const btn   = document.getElementById('btnAdminOpereFilters');
    if (!panel) return;
    const open = panel.style.display === 'none';
    panel.style.display = open ? '' : 'none';
    if (btn) btn.style.background = open ? 'rgba(255,0,127,0.08)' : '';
};

window.resetAdminOpereFilters = function () {
    ['filterOpereTipo', 'filterOpereMuseo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    filterAdminOpere();
};

window.setAdminOpereView = function (mode) {
    adminOpereViewMode = mode;
    const btnT = document.getElementById('btnAdminOpereTable');
    const btnC = document.getElementById('btnAdminOpereCards');
    if (btnT) { btnT.className = 'view-toggle-btn ' + (mode === 'table' ? 'vt-active' : 'vt-inactive'); }
    if (btnC) { btnC.className = 'view-toggle-btn ' + (mode === 'cards' ? 'vt-active' : 'vt-inactive'); }
    filterAdminOpere();
};

function filterAdminOpere() {
    const q       = (document.getElementById('searchAdminOpere')?.value  || '').toLowerCase();
    const tipo    =  document.getElementById('filterOpereTipo')?.value    || '';
    const museo   =  document.getElementById('filterOpereMuseo')?.value   || '';

    let lista = allAdminOpere;
    if (q)       lista = lista.filter(op =>
        (op.operaId || '').toLowerCase().includes(q) ||
        (op.autore  || '').toLowerCase().includes(q) ||
        (op.tipo    || '').toLowerCase().includes(q));
    if (tipo)    lista = lista.filter(op => op.tipo    === tipo);
    if (museo)   lista = lista.filter(op => op.codiceIsil === museo);
    renderAdminOpere(lista);
}

function renderAdminOpere(lista) {
    const container = document.getElementById('adminOpereContent');
    if (!container) return;

    if (adminOpereViewMode === 'cards') {
        if (!lista.length) {
            container.innerHTML = '<p class="text-muted text-center py-5">Nessuna opera trovata.</p>';
            return;
        }
        container.innerHTML = `<div class="items-grid">${lista.map(op => {
            const safeId   = (op._id || '').replace(/'/g, "\\'");
            const safeName = (op.operaId || '').replace(/'/g, "\\'");
            return `
            <div class="glass-card" style="display:flex;flex-direction:column;overflow:hidden;">
                <div style="height:180px;flex-shrink:0;background:#f0f0f0;overflow:hidden;">
                    ${op.immagine
                        ? `<img loading="lazy" src="${op.immagine}" alt="${op.operaId}"
                                style="width:100%;height:100%;object-fit:cover;"
                                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                           <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:linear-gradient(135deg,#f3f4f6,#e5e7eb);">
                               <i class="fa-solid fa-palette" style="font-size:2.5rem;color:#cbd5e1;"></i>
                           </div>`
                        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f3f4f6,#e5e7eb);">
                               <i class="fa-solid fa-palette" style="font-size:2.5rem;color:#cbd5e1;"></i>
                           </div>`}
                </div>
                <div style="padding:14px 16px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
                    <div>
                        <div class="fw-bold" style="font-size:1rem;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${op.operaId}</div>
                        <small class="text-muted">${op.autore || '—'}</small>
                        <div class="d-flex flex-wrap gap-1 mt-2">
                            ${op.tipo    ? `<span class="tag-bubble" style="font-size:0.72rem;">${op.tipo}</span>` : ''}
                            ${op.codiceIsil ? `<span class="tag-bubble" style="font-size:0.72rem;">${op.codiceIsil}</span>` : ''}
                        </div>
                    </div>
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn-outline-custom btn-sm flex-fill" title="Modifica"
                                onclick="adminEditOpera('${safeId}')">
                            <i class="fa-solid fa-pen-to-square me-1"></i>Modifica
                        </button>
                        <button class="btn-outline-custom btn-sm" title="Elimina"
                                style="color:#ef4444;border-color:#ef4444;"
                                onclick="adminDeleteOpera('${safeId}','${safeName}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`; }).join('')}</div>`;
        return;
    }


    container.innerHTML = `
        <div class="glass-card p-4">
            <table class="table table-hover mb-0">
                ${adminTableHeader(['Titolo', 'Autore', 'Tipo', 'Museo'])}
                <tbody id="adminOpereBody"></tbody>
            </table>
        </div>`;
    const tbody = document.getElementById('adminOpereBody');
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Nessuna opera trovata.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(op => `
        <tr>
            <td class="fw-bold">${op.operaId}</td>
            <td>${op.autore || '—'}</td>
            <td>${op.tipo    ? `<span class="tag-bubble" style="font-size:0.78rem;">${op.tipo}</span>`    : '—'}</td>
            <td><small class="text-muted">${op.codiceIsil || '—'}</small></td>
            <td>${adminActionBtns(
                `adminEditOpera('${op._id}')`,
                `adminDeleteOpera('${op._id}','${(op.operaId || '').replace(/'/g, "\\'")}')`
            )}</td>
        </tr>`).join('');
}

window.adminDeleteOpera = async function (id, nome) {
    if (!(await showConfirm(`Eliminare l'opera "${nome}"?`))) return;
    try {
        const res  = await fetch(`/api/opere/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAdminOpere = allAdminOpere.filter(op => op._id !== id);
            renderAdminOpere(allAdminOpere);
        } else {
            showAlert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { showAlert('Impossibile contattare il server.'); }
};

window.adminEditOpera = function (id) {
    const op = allAdminOpere.find(x => x._id === id);
    if (!op) return;
    const section = document.getElementById('section-admin-opere');
    section.innerHTML = `
        <button class="museo-detail-back" onclick="initAdminOpere()">
            <i class="fa-solid fa-arrow-left"></i> Torna alle opere
        </button>
        <h2 class="museo-detail-title">Modifica Opera</h2>
        <p class="museo-detail-sub">${op.codiceIsil || ''}</p>
        <div class="glass-card p-5 mt-4">
            <form id="adminOperaForm" class="row g-4">
                <div class="col-md-8">
                    <label class="custom-label" for="aoOperaId">Titolo / ID Opera *</label>
                    <input type="text" id="aoOperaId" class="custom-input" value="${op.operaId || ''}" required>
                </div>
                <div class="col-md-4">
                    <label class="custom-label" for="aoTipo">Tipo *</label>
                    <select id="aoTipo" class="custom-input" required>
                        <option value="quadro"  ${op.tipo === 'quadro'  ? 'selected' : ''}>Quadro</option>
                        <option value="statua"  ${op.tipo === 'statua'  ? 'selected' : ''}>Statua</option>
                        <option value="altro"   ${op.tipo === 'altro'   ? 'selected' : ''}>Altro</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="custom-label" for="aoAutore">Autore</label>
                    <input type="text" id="aoAutore" class="custom-input" value="${op.autore || ''}">
                </div>
                <div class="col-md-6">
                    <label class="custom-label" for="aoDatazione">Datazione</label>
                    <input type="text" id="aoDatazione" class="custom-input" value="${op.datazione || ''}">
                </div>
                <div class="col-md-6">
                    <label class="custom-label" for="aoLinguaggio">Linguaggio</label>
                    <select id="aoLinguaggio" class="custom-input">
                        ${['semplice','infantile','medio','specialistico'].map(v =>
                            `<option value="${v}" ${op.linguaggio === v ? 'selected' : ''}>${v}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="custom-label" for="aoLunghezza">Lunghezza</label>
                    <select id="aoLunghezza" class="custom-input">
                        ${[['15s','15 secondi'],['1min','1 minuto'],['4min','4 minuti']].map(([v,l]) =>
                            `<option value="${v}" ${op.lunghezza === v ? 'selected' : ''}>${l}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="col-12">
                    <label class="custom-label" for="aoImmagine">URL Immagine</label>
                    <input type="url" id="aoImmagine" class="custom-input" value="${op.immagine || ''}">
                </div>
                <div class="col-12">
                    <label class="custom-label" for="aoDescrizione">Descrizione</label>
                    <textarea id="aoDescrizione" class="custom-input" rows="3">${op.descrizione || ''}</textarea>
                </div>
                <div class="col-12">
                    <label class="custom-label" for="aoTesto">Testo Audioguida</label>
                    <textarea id="aoTesto" class="custom-input" rows="4">${op.testo || ''}</textarea>
                </div>
                <div class="col-md-4">
                    <label class="custom-label" for="aoPrezzo">Prezzo (€)</label>
                    <input type="number" id="aoPrezzo" class="custom-input" min="0" step="0.01" value="${op.prezzo || 0}">
                </div>
                <div class="col-md-8 d-flex align-items-end pb-1">
                    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                        <input type="checkbox" id="aoPubblica" style="width:auto;accent-color:var(--magenta,#e91e8c);"
                               ${op.pubblica ? 'checked' : ''}>
                        <span class="custom-label" style="margin:0;">Pubblica</span>
                    </label>
                </div>
                <div class="col-12 d-flex justify-content-end gap-3 pt-3" style="border-top:1px solid #e2e8f0;">
                    <button type="button" class="btn-outline-custom" onclick="initAdminOpere()">Annulla</button>
                    <button type="submit" class="btn-magenta">Salva Modifiche</button>
                </div>
            </form>
        </div>`;

    document.getElementById('adminOperaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            operaId:    document.getElementById('aoOperaId').value.trim(),
            tipo:       document.getElementById('aoTipo').value,
            autore:     document.getElementById('aoAutore').value.trim(),
            datazione:  document.getElementById('aoDatazione').value.trim(),
            linguaggio: document.getElementById('aoLinguaggio').value,
            lunghezza:  document.getElementById('aoLunghezza').value,
            licenza:    op.licenza,
            immagine:   document.getElementById('aoImmagine').value.trim(),
            descrizione:document.getElementById('aoDescrizione').value.trim(),
            testo:      document.getElementById('aoTesto').value.trim(),
            prezzo:     parseFloat(document.getElementById('aoPrezzo').value) || 0,
            pubblica:   document.getElementById('aoPubblica').checked,
            codiceIsil: op.codiceIsil,
        };
        try {
            const res  = await fetch(`/api/opere/${op._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) { showAlert('Opera aggiornata!'); initAdminOpere(); }
            else showAlert('Errore: ' + (data.error || 'Aggiornamento fallito.'));
        } catch (err) { showAlert('Impossibile contattare il server.'); }
    });
};
