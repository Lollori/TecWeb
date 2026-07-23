async function initAdminVisite() {
    const section = document.getElementById('section-admin-visite');
    section.innerHTML = `
        <!-- Header -->
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <div>
                <h1 class="page-title">Gestione Visite</h1>
                <p class="text-muted mb-0">Gestisci le visite guidate disponibili sulla piattaforma.</p>
            </div>
            <div class="d-flex gap-2 align-items-center flex-wrap">
                <button id="btnAdminVisiteFilters" onclick="toggleAdminVisiteFilters()"
                        class="btn-outline-custom" style="gap:6px;display:flex;align-items:center;">
                    <i class="fa-solid fa-sliders"></i> Filtri
                </button>
                <div class="search-box-container shadow-sm py-1 px-3" style="max-width:260px;">
                    <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                    <input type="text" id="searchAdminVisite" class="search-input py-2"
                           placeholder="Cerca…" oninput="filterAdminVisite()">
                </div>
            </div>
        </div>

        <!-- Pannello filtri -->
        <div id="adminVisiteFilterPanel" class="glass-card p-3 mb-3" style="display:none;">
            <div class="row g-3 align-items-end">
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;" for="filterVisiteMuseo">Museo (ISIL)</label>
                    <select id="filterVisiteMuseo" class="custom-input" style="padding:7px 12px;" onchange="filterAdminVisite()">
                        <option value="">Tutti i musei</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;" for="filterVisiteStato">Stato</label>
                    <select id="filterVisiteStato" class="custom-input" style="padding:7px 12px;" onchange="filterAdminVisite()">
                        <option value="">Tutti gli stati</option>
                        <option value="pubblica">In vendita</option>
                        <option value="privata">Privata</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;" for="filterVisitePrezzo">Prezzo</label>
                    <select id="filterVisitePrezzo" class="custom-input" style="padding:7px 12px;" onchange="filterAdminVisite()">
                        <option value="">Tutti</option>
                        <option value="gratis">Gratuita</option>
                        <option value="pagamento">A pagamento</option>
                    </select>
                </div>
                <div class="col-12 d-flex justify-content-end">
                    <button class="btn-outline-custom btn-sm" onclick="resetAdminVisiteFilters()">
                        <i class="fa-solid fa-rotate-left me-1"></i>Azzera filtri
                    </button>
                </div>
            </div>
        </div>

        <!-- Tabella -->
        <div class="glass-card p-4">
            <table class="table table-hover mb-0">
                ${adminTableHeader(['Nome Visita', 'Museo', 'Prezzo', 'Stato', 'Acquirenti'])}
                <tbody id="adminVisiteBody">
                    <tr><td colspan="6" class="text-center text-muted py-4">
                        <i class="fa-solid fa-spinner fa-spin me-2"></i>Caricamento…
                    </td></tr>
                </tbody>
            </table>
        </div>`;

    try {
        const res  = await fetch('/api/visite');
        const data = await res.json();
        allAdminVisite = data.ok ? data.data : [];
        _populateAdminVisiteFilters(allAdminVisite);
        renderAdminVisite(allAdminVisite);
    } catch (e) {
        document.getElementById('adminVisiteBody').innerHTML =
            '<tr><td colspan="6" class="text-center text-danger py-4">Errore nel caricamento.</td></tr>';
    }
}

function _populateAdminVisiteFilters(lista) {
    const musei = [...new Set(lista.map(v => v.codiceIsil).filter(Boolean))].sort();
    const sel = document.getElementById('filterVisiteMuseo');
    if (sel) sel.innerHTML = '<option value="">Tutti i musei</option>' +
        musei.map(m => `<option value="${m}">${m}</option>`).join('');
}

window.toggleAdminVisiteFilters = function () {
    const panel = document.getElementById('adminVisiteFilterPanel');
    const btn   = document.getElementById('btnAdminVisiteFilters');
    if (!panel) return;
    const open = panel.style.display === 'none';
    panel.style.display = open ? '' : 'none';
    if (btn) btn.style.background = open ? 'rgba(255,0,127,0.08)' : '';
};

window.resetAdminVisiteFilters = function () {
    ['filterVisiteMuseo', 'filterVisiteStato', 'filterVisitePrezzo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    filterAdminVisite();
};

function filterAdminVisite() {
    const q      = (document.getElementById('searchAdminVisite')?.value   || '').toLowerCase();
    const museo  =  document.getElementById('filterVisiteMuseo')?.value   || '';
    const stato  =  document.getElementById('filterVisiteStato')?.value   || '';
    const prezzo =  document.getElementById('filterVisitePrezzo')?.value  || '';

    let lista = allAdminVisite;
    if (q)      lista = lista.filter(v =>
        (v.nomeVisita || '').toLowerCase().includes(q) ||
        (v.codiceIsil || '').toLowerCase().includes(q));
    if (museo)  lista = lista.filter(v => v.codiceIsil === museo);
    if (stato === 'pubblica') lista = lista.filter(v => v.pubblica);
    if (stato === 'privata')  lista = lista.filter(v => !v.pubblica);
    if (prezzo === 'gratis')    lista = lista.filter(v => !(v.prezzo > 0));
    if (prezzo === 'pagamento') lista = lista.filter(v => v.prezzo > 0);
    renderAdminVisite(lista);
}

function renderAdminVisite(lista) {
    const tbody = document.getElementById('adminVisiteBody');
    if (!tbody) return;
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Nessuna visita trovata.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(v => `
        <tr>
            <td class="fw-bold">${v.nomeVisita}</td>
            <td><small class="text-muted">${v.codiceIsil || '—'}</small></td>
            <td>${v.prezzo > 0 ? `<span class="price-badge">€${v.prezzo}</span>` : '<span class="free-badge">Gratis</span>'}</td>
            <td>${v.pubblica
                ? '<span class="badge bg-success">In vendita</span>'
                : '<span class="badge bg-secondary">Privata</span>'}</td>
            <td>${v.acquirenti || 0}</td>
            <td>${adminActionBtns(
                `adminEditVisita('${v._id}')`,
                `adminDeleteVisita('${v._id}','${(v.nomeVisita || '').replace(/'/g, "\\'")}')`
            )}</td>
        </tr>`).join('');
}

window.adminDeleteVisita = async function (id, nome) {
    if (!(await showConfirm(`Eliminare la visita "${nome}"?`))) return;
    try {
        const res  = await fetch(`/api/visite/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAdminVisite = allAdminVisite.filter(v => v._id !== id);
            renderAdminVisite(allAdminVisite);
        } else {
            showAlert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { showAlert('Impossibile contattare il server.'); }
};

window.adminEditVisita = function (id) {
    const v = allAdminVisite.find(x => x._id === id);
    if (!v) return;
    const section = document.getElementById('section-admin-visite');
    section.innerHTML = `
        <button class="museo-detail-back" onclick="initAdminVisite()">
            <i class="fa-solid fa-arrow-left"></i> Torna alle visite
        </button>
        <h2 class="museo-detail-title">Modifica Visita</h2>
        <p class="museo-detail-sub">${v.codiceIsil || ''}</p>
        <div class="glass-card p-5 mt-4">
            <form id="adminVisitaForm" class="row g-4">
                <div class="col-md-8">
                    <label class="custom-label" for="avNome">Nome Visita *</label>
                    <input type="text" id="avNome" class="custom-input" value="${v.nomeVisita || ''}" required>
                </div>
                <div class="col-md-4">
                    <label class="custom-label" for="avPrezzo">Prezzo (€)</label>
                    <input type="number" id="avPrezzo" class="custom-input" min="0" step="0.01" value="${v.prezzo || 0}">
                </div>
                <div class="col-md-6">
                    <label class="custom-label" for="avNomeMnemonico">Nome Mnemonico</label>
                    <input type="text" id="avNomeMnemonico" class="custom-input" value="${v.nomeMnemonico || ''}">
                </div>
                <div class="col-md-6">
                    <label class="custom-label" for="avQuizDomanda">Domanda Quiz</label>
                    <input type="text" id="avQuizDomanda" class="custom-input" value="${v.quizDomanda || ''}">
                </div>
                <div class="col-12">
                    <label class="custom-label" for="avLogistica">Logistica</label>
                    <textarea id="avLogistica" class="custom-input" rows="3">${v.logistica || ''}</textarea>
                </div>
                <div class="col-12">
                    <label class="custom-label" for="avTagsField">Tag <small style="text-transform:none;color:#94a3b8;">(facoltativi)</small></label>
                    ${tagInputHtml('avTags', 'es. caravaggio, rinascimento…')}
                </div>
                <div class="col-md-6">
                    <label class="custom-label" for="avIsil">Museo (ISIL)</label>
                    <input type="text" id="avIsil" class="custom-input" value="${v.codiceIsil || ''}">
                </div>
                <div class="col-md-6">
                    <label class="custom-label" for="avAcquirenti">Acquirenti</label>
                    <input type="number" id="avAcquirenti" class="custom-input" min="0" value="${v.acquirenti || 0}">
                </div>
                <div class="col-12 d-flex align-items-center gap-3">
                    <input type="checkbox" id="avPubblica"
                           style="width:auto;accent-color:var(--magenta,#e91e8c);" ${v.pubblica ? 'checked' : ''}>
                    <label class="custom-label" for="avPubblica" style="margin:0;cursor:pointer;">In vendita</label>
                </div>
                <div class="col-12 d-flex justify-content-end gap-3 pt-3" style="border-top:1px solid #e2e8f0;">
                    <button type="button" class="btn-outline-custom" onclick="initAdminVisite()">Annulla</button>
                    <button type="submit" class="btn-magenta">Salva Modifiche</button>
                </div>
            </form>
        </div>`;

    initTagInput('avTags', v.tags);

    document.getElementById('adminVisitaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            nomeVisita:    document.getElementById('avNome').value.trim(),
            nomeMnemonico: document.getElementById('avNomeMnemonico').value.trim(),
            logistica:     document.getElementById('avLogistica').value.trim(),
            quizDomanda:   document.getElementById('avQuizDomanda').value.trim(),
            codiceIsil:    document.getElementById('avIsil').value.trim(),
            prezzo:        parseFloat(document.getElementById('avPrezzo').value) || 0,
            pubblica:      document.getElementById('avPubblica').checked,
            acquirenti:    parseInt(document.getElementById('avAcquirenti').value) || 0,
            autoreId:      v.autoreId,
            tags:          getTagInputValue('avTags'),
        };
        try {
            const res  = await fetch(`/api/visite/${v._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) { showAlert('Visita aggiornata!'); initAdminVisite(); }
            else showAlert('Errore: ' + (data.error || 'Aggiornamento fallito.'));
        } catch (err) { showAlert('Impossibile contattare il server.'); }
    });
};


async function initAdminItems() {
    const section = document.getElementById('section-admin-items');
    section.innerHTML = `
        <!-- Header -->
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <div>
                <h1 class="page-title">Gestione Items</h1>
                <p class="text-muted mb-0">Consulta e modifica i contenuti del marketplace.</p>
            </div>
            <div class="d-flex gap-2 align-items-center flex-wrap">
                <button id="btnAdminItemsFilters" onclick="toggleAdminItemsFilters()"
                        class="btn-outline-custom" style="gap:6px;display:flex;align-items:center;">
                    <i class="fa-solid fa-sliders"></i> Filtri
                </button>
                <div class="search-box-container shadow-sm py-1 px-3" style="max-width:260px;">
                    <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                    <input type="text" id="searchAdminItems" class="search-input py-2"
                           placeholder="Cerca…" oninput="filterAdminItems()">
                </div>
            </div>
        </div>

        <!-- Pannello filtri -->
        <div id="adminItemsFilterPanel" class="glass-card p-3 mb-3" style="display:none;">
            <div class="row g-3 align-items-end">
                <div class="col-md-5">
                    <label class="custom-label mb-1" style="font-size:0.82rem;" for="filterItemsAutore">Autore (ID)</label>
                    <select id="filterItemsAutore" class="custom-input" style="padding:7px 12px;" onchange="filterAdminItems()">
                        <option value="">Tutti gli autori</option>
                    </select>
                </div>
                <div class="col-md-5">
                    <label class="custom-label mb-1" style="font-size:0.82rem;" for="filterItemsMuseo">Museo (ID)</label>
                    <select id="filterItemsMuseo" class="custom-input" style="padding:7px 12px;" onchange="filterAdminItems()">
                        <option value="">Tutti i musei</option>
                    </select>
                </div>
                <div class="col-md-2 d-flex align-items-end">
                    <button class="btn-outline-custom btn-sm w-100" onclick="resetAdminItemsFilters()">
                        <i class="fa-solid fa-rotate-left me-1"></i>Azzera
                    </button>
                </div>
            </div>
        </div>

        <!-- Tabella -->
        <div class="glass-card p-4">
            <table class="table table-hover mb-0">
                ${adminTableHeader(['Opera', 'Museo', 'Tono', 'Autore'])}
                <tbody id="adminItemsBody">
                    <tr><td colspan="5" class="text-center text-muted py-4">
                        <i class="fa-solid fa-spinner fa-spin me-2"></i>Caricamento…
                    </td></tr>
                </tbody>
            </table>
        </div>`;

    try {
        const res  = await fetch('/api/items');
        const data = await res.json();
        allAdminItems = data.ok ? data.data : [];
        _populateAdminItemsFilters(allAdminItems);
        renderAdminItems(allAdminItems);
    } catch (e) {
        document.getElementById('adminItemsBody').innerHTML =
            '<tr><td colspan="5" class="text-center text-danger py-4">Errore nel caricamento.</td></tr>';
    }
}

function _populateAdminItemsFilters(lista) {
    const autori = [...new Set(lista.map(it => it.authorId).filter(Boolean))].sort();
    const musei  = [...new Set(lista.map(it => it.museumId).filter(Boolean))].sort();
    const sel = (id, opts, label) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<option value="">${label}</option>` +
            opts.map(v => `<option value="${v}">${v}</option>`).join('');
    };
    sel('filterItemsAutore', autori, 'Tutti gli autori');
    sel('filterItemsMuseo',  musei,  'Tutti i musei');
}

window.toggleAdminItemsFilters = function () {
    const panel = document.getElementById('adminItemsFilterPanel');
    const btn   = document.getElementById('btnAdminItemsFilters');
    if (!panel) return;
    const open = panel.style.display === 'none';
    panel.style.display = open ? '' : 'none';
    if (btn) btn.style.background = open ? 'rgba(255,0,127,0.08)' : '';
};

window.resetAdminItemsFilters = function () {
    ['filterItemsAutore', 'filterItemsMuseo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    filterAdminItems();
};

function filterAdminItems() {
    const q      = (document.getElementById('searchAdminItems')?.value  || '').toLowerCase();
    const autore =  document.getElementById('filterItemsAutore')?.value || '';
    const museo  =  document.getElementById('filterItemsMuseo')?.value  || '';

    let lista = allAdminItems;
    if (q)      lista = lista.filter(it =>
        itemTitle(it).toLowerCase().includes(q) ||
        (it.museumId || '').toLowerCase().includes(q) ||
        (it.authorId || '').toLowerCase().includes(q));
    if (autore) lista = lista.filter(it => it.authorId === autore);
    if (museo)  lista = lista.filter(it => it.museumId === museo);
    renderAdminItems(lista);
}

function renderAdminItems(lista) {
    const tbody = document.getElementById('adminItemsBody');
    if (!tbody) return;
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Nessun item trovato.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(it => {
        return `
        <tr>
            <td class="fw-bold">${itemTitle(it)}<div class="mt-1">${itemTypeBadge(it)}</div></td>
            <td><small class="text-muted">${it.museumId || '—'}</small></td>
            <td>${toneBadgesHtml(it) || '<small class="text-muted">—</small>'}</td>
            <td><small class="text-muted">${it.authorId || '—'}</small></td>
            <td>${adminActionBtns(
                `adminEditItem('${it._id}')`,
                `adminDeleteItem('${it._id}','${itemTitle(it).replace(/'/g, "\\'")}')`
            )}</td>
        </tr>`;
    }).join('');
}

window.adminDeleteItem = async function (id, operaId) {
    if (!(await showConfirm(`Eliminare l'item dell'opera "${operaId}"?`))) return;
    try {
        const res  = await fetch(`/api/items/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAdminItems = allAdminItems.filter(it => it._id !== id);
            renderAdminItems(allAdminItems);
        } else {
            showAlert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { showAlert('Impossibile contattare il server.'); }
};

window.adminEditItem = function (id) {
    const it = allAdminItems.find(x => x._id === id);
    if (!it) return;
    const section   = document.getElementById('section-admin-items');
    const metaJson  = JSON.stringify(it.metadata || {}, null, 2);
    const toni      = it.toni || {};

    section.innerHTML = `
        <button class="museo-detail-back" onclick="initAdminItems()">
            <i class="fa-solid fa-arrow-left"></i> Torna agli items
        </button>
        <h2 class="museo-detail-title">Modifica Item</h2>
        <p class="museo-detail-sub mb-1">${it.contentType === 'indipendente' ? 'Argomento' : 'Opera'}: ${itemTitle(it)}</p>
        <div class="mb-2">${itemTypeBadge(it)}</div>
        <div class="glass-card p-5 mt-4">
            <form id="adminItemForm" class="row g-4">
                <p class="col-12" style="font-size:0.82rem;color:#94a3b8;margin:0;">
                    <i class="fa-solid fa-circle-info me-1"></i>Scegli un tono e compila le sue 3 durate (3s / 15s / 40s). Puoi farne uno, due o tutti e tre.
                </p>
                ${toneEditorHtml('aiToneEditor', 'ai', toni)}
                <div class="col-md-6">
                    <label class="custom-label" for="aiOperaTitle">${it.contentType === 'indipendente' ? 'Argomento' : 'Opera (ID)'}</label>
                    <input type="text" id="aiOperaTitle" class="custom-input" value="${itemTitle(it)}" disabled>
                </div>
                ${it.contentType === 'indipendente' ? `
                <div class="col-md-6">
                    <label class="custom-label" for="aiImmagine">URL Immagine</label>
                    <input type="url" id="aiImmagine" class="custom-input" value="${it.image || ''}">
                </div>
                ` : `
                <p class="col-12" style="font-size:0.78rem;color:#94a3b8;margin:0;">
                    <i class="fa-solid fa-circle-info me-1"></i>L'immagine viene ereditata automaticamente dall'opera collegata.
                </p>
                `}
                <div class="col-12">
                    <label class="custom-label" for="aiTagsField">Tag <small style="text-transform:none;color:#94a3b8;">(facoltativi)</small></label>
                    ${tagInputHtml('aiTags', 'es. caravaggio, rinascimento…')}
                </div>
                <div class="col-12">
                    <label class="custom-label" for="aiMetadata">Metadata (JSON)</label>
                    <textarea id="aiMetadata" class="custom-input" rows="5"
                              style="font-family:monospace;font-size:0.85rem;">${metaJson}</textarea>
                </div>
                <div class="col-12 d-flex justify-content-end gap-3 pt-3" style="border-top:1px solid #e2e8f0;">
                    <button type="button" class="btn-outline-custom" onclick="initAdminItems()">Annulla</button>
                    <button type="submit" class="btn-magenta">Salva Modifiche</button>
                </div>
            </form>
        </div>`;

    wireToneBadges('aiToneEditor', 'ai');
    initTagInput('aiTags', it.tags);

    document.getElementById('adminItemForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuoviToni = {
            semplice: readToneFields('ai', 'Semplice'),
            medio:    readToneFields('ai', 'Medio'),
            avanzato: readToneFields('ai', 'Avanzato'),
        };
        if (!validateToniShapeOrAlert(nuoviToni)) return;
        if (it.pubblica && !hasCompleteTone(nuoviToni)) {
            showAlert('Questo item è pubblico: serve almeno un tono con tutte e 3 le durate compilate. Rendilo privato dal pannello Autore per salvarlo senza contenuto completo.');
            return;
        }
        let metadata;
        try {
            metadata = JSON.parse(document.getElementById('aiMetadata').value || '{}');
        } catch (_) {
            showAlert('Il campo Metadata non è un JSON valido.');
            return;
        }
        const body = {
            toni: nuoviToni,
            image:    it.contentType === 'indipendente'
                ? document.getElementById('aiImmagine').value.trim()
                : it.image,
            tags:     getTagInputValue('aiTags'),
            metadata,
            operaId:     it.operaId,
            contentType: it.contentType,
            topic:       it.topic,
            museumId: it.museumId,
            authorId: it.authorId,
        };
        try {
            const res  = await fetch(`/api/items/${it._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) { showAlert('Item aggiornato!'); initAdminItems(); }
            else showAlert('Errore: ' + (data.error || 'Aggiornamento fallito.'));
        } catch (err) { showAlert('Impossibile contattare il server.'); }
    });
};


async function initAdminAnalytics() {
    const section = document.getElementById('section-admin-analytics');
    section.innerHTML = `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
                <h1 class="page-title">Analytics</h1>
                <p class="text-muted mb-0">Panoramica delle statistiche della piattaforma.</p>
            </div>
            <button class="btn-outline-custom no-print" onclick="exportAnalyticsPDF()">
                <i class="fa-solid fa-file-pdf me-1"></i> Esporta PDF
            </button>
        </div>

        <div id="analyticsKpis" class="row g-4 mb-5">
            <div class="col-12 text-center text-muted py-4">
                <i class="fa-solid fa-spinner fa-spin me-2"></i>Caricamento dati…
            </div>
        </div>

        <div class="analytics-block mb-5">
            <h4 class="analytics-block-title" onclick="toggleAnalyticsBlock('recentActivityBody','recentActivityChevron')">
                <i class="fa-solid fa-clock-rotate-left"></i>Attività Recenti
                <i class="fa-solid fa-chevron-down analytics-block-chevron" id="recentActivityChevron"></i>
            </h4>
            <div id="recentActivityBody" class="row g-4">
                <div class="col-md-3">
                    <div class="glass-card p-3">
                        <h6 class="fw-bold mb-3"><i class="fa-solid fa-image me-1" style="color:#e91e8c;"></i>Opere</h6>
                        <div id="recentOpere"></div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="glass-card p-3">
                        <h6 class="fw-bold mb-3"><i class="fa-solid fa-building-columns me-1" style="color:#e91e8c;"></i>Musei</h6>
                        <div id="recentMusei"></div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="glass-card p-3">
                        <h6 class="fw-bold mb-3"><i class="fa-solid fa-layer-group me-1" style="color:#e91e8c;"></i>Items</h6>
                        <div id="recentItems"></div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="glass-card p-3">
                        <h6 class="fw-bold mb-3"><i class="fa-solid fa-route me-1" style="color:#e91e8c;"></i>Visite</h6>
                        <div id="recentVisite"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="analytics-block mb-5">
            <h4 class="analytics-block-title" onclick="toggleAnalyticsBlock('marketplaceBody','marketplaceChevron')">
                <i class="fa-solid fa-store"></i>Marketplace
                <i class="fa-solid fa-chevron-down analytics-block-chevron" id="marketplaceChevron"></i>
            </h4>
            <div id="marketplaceBody" class="row g-4">
                <div class="col-12">
                    <div class="glass-card p-4">
                        <h5 class="fw-bold mb-3">Tag più Utilizzati nel Marketplace</h5>
                        <div id="analyticsTagsChart"></div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="glass-card p-4">
                        <h5 class="fw-bold mb-0">Classifica dei Guadagni</h5>
                        <p class="text-muted mb-3" style="font-size:0.82rem;">I cinque utenti con maggior profitto</p>
                        <div id="analyticsTopEarners"></div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="glass-card p-4">
                        <h5 class="fw-bold mb-0">Top 5 Items nel Carrello</h5>
                        <p class="text-muted mb-3" style="font-size:0.82rem;">I più desiderati</p>
                        <div id="analyticsTopCartItems"></div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="glass-card p-4">
                        <h5 class="fw-bold mb-0">Top 5 Visite nel Carrello</h5>
                        <p class="text-muted mb-3" style="font-size:0.82rem;">I più desiderati</p>
                        <div id="analyticsTopCartVisite"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="analytics-block">
            <h4 class="analytics-block-title" onclick="toggleAnalyticsBlock('navigatorBody','navigatorChevron')">
                <i class="fa-solid fa-satellite-dish"></i>Navigator
                <i class="fa-solid fa-chevron-down analytics-block-chevron" id="navigatorChevron"></i>
            </h4>
            <div id="navigatorBody" class="row g-4">
                <div class="col-12">
                    <div class="glass-card p-4">
                        <h5 class="fw-bold mb-3">Le visite più avviate</h5>
                        <div id="analyticsTopEseguite"></div>
                    </div>
                </div>
            </div>
        </div>`;

    try {
        const [rU, rM, rOp, rV, rIt, rC] = await Promise.all([
            fetch('/api/utenti'), fetch('/api/musei'),
            fetch('/api/opere'),  fetch('/api/visite'), fetch('/api/items'),
            fetch('/api/carts'),
        ]);
        const [dU, dM, dOp, dV, dIt, dC] = await Promise.all([
            rU.json(), rM.json(), rOp.json(), rV.json(), rIt.json(), rC.json(),
        ]);

        const utenti  = dU.ok  ? dU.data  : [];
        const musei   = dM.ok  ? dM.data  : [];
        const opere   = dOp.ok ? dOp.data : [];
        const visite  = dV.ok  ? dV.data  : [];
        const allCarts = dC.ok ? dC.data : [];
        const items   = dIt.ok ? dIt.data : [];

        const userMap = {};
        utenti.forEach(u => { userMap[u.userId] = u.username || u.userId; });


        const mostRecent = (list) => [...list].sort((a, b) => (a._id < b._id ? 1 : -1)).slice(0, 3);

        const recentListHtml = (list, nameFn, creatorFn) => {
            if (!list.length) return '<p class="text-muted mb-0" style="font-size:0.85rem;">Nessun dato.</p>';
            return list.map((x, i) => `
                <div class="d-flex justify-content-between align-items-center gap-2 ${i < list.length - 1 ? 'mb-2 pb-2' : ''}"
                     ${i < list.length - 1 ? 'style="border-bottom:1px solid rgba(0,0,0,0.06);"' : ''}>
                    <small class="fw-bold" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nameFn(x)}</small>
                    <small class="text-muted flex-shrink-0" style="font-size:0.72rem;">${userMap[creatorFn(x)] || creatorFn(x) || '—'}</small>
                </div>`).join('');
        };

        document.getElementById('recentOpere').innerHTML =
            recentListHtml(mostRecent(opere), op => op.operaId, op => op.creatoDa);
        document.getElementById('recentMusei').innerHTML =
            recentListHtml(mostRecent(musei), m => m.nome, m => m.curatoreId);
        document.getElementById('recentItems').innerHTML =
            recentListHtml(mostRecent(items), it => itemTitle(it), it => it.authorId);
        document.getElementById('recentVisite').innerHTML =
            recentListHtml(mostRecent(visite), v => v.nomeVisita || v.nomeMnemonico || 'Senza nome', v => v.autoreId);

        const totalAcquirenti = visite.reduce((s, v) => s + (v.acquirenti || 0), 0);

        const kpiCard = (val, label, icon) => `
            <div class="col-6 col-md-4 col-lg-2">
                <div class="glass-card kpi-card p-3 text-center">
                    <i class="fa-solid ${icon} mb-2 d-block kpi-icon"></i>
                    <span class="d-block fw-bold h3 mb-1 kpi-value" style="line-height:1;">${val}</span>
                    <small class="kpi-label">${label}</small>
                </div>
            </div>`;

        document.getElementById('analyticsKpis').innerHTML =
            kpiCard(utenti.length,   'Utenti',         'fa-users') +
            kpiCard(musei.length,    'Musei',           'fa-building-columns') +
            kpiCard(opere.length,    'Opere',           'fa-image') +
            kpiCard(visite.length,   'Visite',          'fa-route') +
            kpiCard(items.length,    'Items',            'fa-layer-group') +
            kpiCard(totalAcquirenti, 'Acquirenti tot.', 'fa-ticket');

        const tagCounts = {};
        [...items.filter(it => it.pubblica), ...visite].forEach(x => (x.tags || []).forEach(t => {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
        }));
        const sortedTags  = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const maxTagCount = sortedTags[0]?.[1] || 1;

        document.getElementById('analyticsTagsChart').innerHTML =
            sortedTags.length
                ? sortedTags.map(([tag, count]) => `
                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                            <small class="fw-bold">#${tag}</small>
                            <small class="text-muted">${count}</small>
                        </div>
                        <div class="analytics-bar-track">
                            <div style="width:${Math.round(count / maxTagCount * 100)}%;background:#e91e8c;border-radius:4px;height:8px;transition:width .4s;"></div>
                        </div>
                    </div>`).join('')
                : '<p class="text-muted">Nessun tag utilizzato.</p>';


        const rankListHtml = (rows, nameFn) => {
            if (!rows.length) return '<p class="text-muted mb-0" style="font-size:0.85rem;">Nessun dato.</p>';
            const rankColors = ['#e91e8c', '#6366f1', '#f59e0b', '#94a3b8', '#94a3b8'];
            return rows.map(([entity, count], i) => `
                <div class="d-flex align-items-center gap-3 ${i < rows.length - 1 ? 'mb-2 pb-2' : ''}"
                     ${i < rows.length - 1 ? 'style="border-bottom:1px solid rgba(0,0,0,0.06);"' : ''}>
                    <div style="width:26px;height:26px;border-radius:50%;background:${rankColors[i]};
                                color:#fff;display:flex;align-items:center;justify-content:center;
                                font-weight:800;font-size:0.78rem;flex-shrink:0;">${i + 1}</div>
                    <small class="fw-bold flex-grow-1" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nameFn(entity)}</small>
                    <span class="badge" style="background:rgba(233,30,140,0.12);color:#e91e8c;font-size:0.72rem;font-weight:700;">${count}× nel carrello</span>
                </div>`).join('');
        };

        const cartItemCounts   = {};
        const cartVisitaCounts = {};
        allCarts.forEach(c => {
            (c.items  || []).forEach(id => { cartItemCounts[id]   = (cartItemCounts[id]   || 0) + 1; });
            (c.visite || []).forEach(id => { cartVisitaCounts[id] = (cartVisitaCounts[id] || 0) + 1; });
        });

        const topCartItems = Object.entries(cartItemCounts)
            .sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([id, count]) => [items.find(it => it._id === id), count])
            .filter(([it]) => it);

        const topCartVisite = Object.entries(cartVisitaCounts)
            .sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([id, count]) => [visite.find(v => v._id === id), count])
            .filter(([v]) => v);

        document.getElementById('analyticsTopCartItems').innerHTML =
            rankListHtml(topCartItems, it => itemTitle(it));
        document.getElementById('analyticsTopCartVisite').innerHTML =
            rankListHtml(topCartVisite, v => v.nomeVisita || v.nomeMnemonico || 'Senza nome');

        const topEseguite = [...visite]
            .filter(v => (v.eseguita || 0) > 0)
            .sort((a, b) => (b.eseguita || 0) - (a.eseguita || 0))
            .slice(0, 3);

        document.getElementById('analyticsTopEseguite').innerHTML =
            topEseguite.length
                ? topEseguite.map((v, i) => {
                    const rankColors = ['#e91e8c', '#6366f1', '#f59e0b'];
                    return `
                    <div class="d-flex align-items-center gap-3 ${i < topEseguite.length - 1 ? 'mb-2 pb-2' : ''}"
                         ${i < topEseguite.length - 1 ? 'style="border-bottom:1px solid rgba(0,0,0,0.06);"' : ''}>
                        <div style="width:26px;height:26px;border-radius:50%;background:${rankColors[i]};
                                    color:#fff;display:flex;align-items:center;justify-content:center;
                                    font-weight:800;font-size:0.78rem;flex-shrink:0;">${i + 1}</div>
                        <small class="fw-bold flex-grow-1" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${v.nomeVisita || v.nomeMnemonico || 'Senza nome'}</small>
                        <span class="badge" style="background:rgba(233,30,140,0.12);color:#e91e8c;font-size:0.72rem;font-weight:700;">${v.eseguita} esecuzioni</span>
                    </div>`;
                }).join('')
                : '<p class="text-muted mb-0" style="font-size:0.85rem;">Nessuna visita eseguita ancora.</p>';

        const revenueByUser = {};
        items.forEach(it => {
            if (it.pubblica && (it.metadata?.prezzo || 0) > 0) {
                revenueByUser[it.authorId] = (revenueByUser[it.authorId] || 0) + (it.metadata.prezzo * (it.acquirenti || 0));
            }
        });
        visite.forEach(v => {
            if (v.pubblica && (v.prezzo || 0) > 0) {
                revenueByUser[v.autoreId] = (revenueByUser[v.autoreId] || 0) + (v.prezzo * (v.acquirenti || 0));
            }
        });

        const topEarners = Object.entries(revenueByUser)
            .filter(([, rev]) => rev > 0)
            .sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxEarned = topEarners[0]?.[1] || 1;

        document.getElementById('analyticsTopEarners').innerHTML =
            topEarners.length
                ? `<div class="d-flex align-items-end justify-content-around" style="height:180px;gap:16px;padding-bottom:4px;">
                    ${topEarners.map(([uid, rev]) => `
                        <div class="d-flex flex-column align-items-center" style="flex:1 1 0;min-width:0;">
                            <small class="fw-bold mb-1" style="font-size:0.78rem;white-space:nowrap;">€${rev.toFixed(0)}</small>
                            <div class="analytics-col-track d-flex align-items-end justify-content-center" style="width:100%;max-width:56px;height:130px;">
                                <div style="width:100%;height:${Math.max(4, Math.round(rev / maxEarned * 100))}%;background:#e91e8c;border-radius:4px;transition:height .4s;"></div>
                            </div>
                            <small class="text-muted mt-2 text-center" style="font-size:0.72rem;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${userMap[uid] || uid}">${userMap[uid] || uid}</small>
                        </div>`).join('')}
                   </div>`
                : '<p class="text-muted">Nessun dato.</p>';

    } catch (e) {
        document.getElementById('analyticsKpis').innerHTML =
            '<div class="col-12 text-center text-danger py-4">Errore nel caricamento dei dati.</div>';
    }
}

window.toggleAnalyticsBlock = function (bodyId, chevronId) {
    const body    = document.getElementById(bodyId);
    const chevron = document.getElementById(chevronId);
    if (!body) return;
    const collapsed = body.style.display === 'none';
    body.style.display = collapsed ? '' : 'none';
    if (chevron) chevron.classList.toggle('collapsed', !collapsed);
};


function exportAnalyticsPDF() {
    const originalTitle = document.title;
    document.title = `Analytics ArtAround - ${new Date().toLocaleDateString('it-IT')}`;
    window.addEventListener('afterprint', () => { document.title = originalTitle; }, { once: true });
    window.print();
}
