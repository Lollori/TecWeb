async function initAutoreMusei() {
    const section = document.getElementById('section-autore-musei');
    section.innerHTML = `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="page-title">Musei</h1>
                <p class="text-muted mb-0">Esplora i musei disponibili.</p>
            </div>
            <div class="d-flex align-items-center gap-3 flex-wrap">
                <select id="filterAutoreCitta" class="custom-input" style="max-width:180px;"
                        onchange="filterAutoreMusei()">
                    <option value="">Tutte le città</option>
                </select>
                <div class="search-box-container shadow-sm py-1 px-3" style="max-width:240px;">
                    <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                    <input type="text" id="searchAutoreMusei" class="search-input py-2"
                           placeholder="Cerca museo…" oninput="filterAutoreMusei()">
                </div>
            </div>
        </div>

        <div id="autoreMuseiGrid" class="items-grid mb-5" style="align-items:stretch;">
            <p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento…</p>
        </div>
    `;

    try {
        const rMusei = await fetch('/api/musei');
        const dMusei = await rMusei.json();

        allMuseiAutore = dMusei.ok ? dMusei.data : [];
        _renderAutoreMuseiGrid(allMuseiAutore);

        const cittaSel = document.getElementById('filterAutoreCitta');
        const citta = [...new Set(allMuseiAutore.map(m => m.citta).filter(Boolean))].sort();
        cittaSel.innerHTML = '<option value="">Tutte le città</option>' +
            citta.map(c => `<option value="${c}">${c}</option>`).join('');
    } catch (e) {
        console.error('Errore autore-musei:', e);
        document.getElementById('autoreMuseiGrid').innerHTML =
            '<p class="empty-msg">Errore nel caricamento.</p>';
    }
}

function _renderAutoreMuseiGrid(lista) {
    const grid = document.getElementById('autoreMuseiGrid');
    if (!grid) return;
    if (!lista.length) {
        grid.className = '';
        grid.innerHTML = '<p class="empty-msg">Nessun museo disponibile.</p>';
        return;
    }
    grid.className = 'items-grid mb-5';
    grid.innerHTML = lista.map(m => `
        <div class="item-card museo-card scroll-card-clickable"
             style="height:340px;"
             onclick="showAutoreMuseoDetail('${m.codiceIsil}')">
            <div style="position:relative;flex-shrink:0;height:200px;">
                ${m.immagineCopertina
                    ? `<img loading="lazy" class="museo-card-img" src="${m.immagineCopertina}" alt="${m.nome}"
                           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                       <div class="museo-card-img-placeholder"
                            style="display:none;position:absolute;inset:0;">
                           <i class="fa fa-building-columns"></i>
                       </div>`
                    : `<div class="museo-card-img-placeholder">
                           <i class="fa fa-building-columns"></i>
                       </div>`
                }
            </div>
            <div style="display:flex;flex-direction:column;padding:14px 16px 16px;
                        flex:1;overflow:hidden;">
                <h3 style="margin:0 0 3px;font-size:0.97rem;font-weight:700;
                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${m.nome}
                </h3>
                <p class="museum-sub" style="margin:0 0 6px;">
                    <i class="fa-solid fa-location-dot"></i> ${m.citta}
                </p>
                <p style="margin:0;font-size:0.82rem;color:#64748b;
                           display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;
                           -webkit-box-orient:vertical;overflow:hidden;flex:1;">
                    ${m.descrizioneBreve || '&nbsp;'}
                </p>
                <div style="margin-top:10px;">
                    <span class="tag-bubble" style="font-size:0.75rem;">
                        <i class="fa-solid fa-barcode"></i> ${m.codiceIsil}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

window.filterAutoreMusei = function () {
    const q      = (document.getElementById('searchAutoreMusei')?.value || '').toLowerCase();
    const citta  = document.getElementById('filterAutoreCitta')?.value || '';
    let filtered = allMuseiAutore;
    if (q) filtered = filtered.filter(m =>
        m.nome.toLowerCase().includes(q) || m.citta.toLowerCase().includes(q));
    if (citta) filtered = filtered.filter(m => m.citta === citta);
    _renderAutoreMuseiGrid(filtered);
};

window.showAutoreMuseoDetail = async function (codiceIsil) {
    const museo   = allMuseiAutore.find(m => m.codiceIsil === codiceIsil);
    if (!museo) return;
    currentViewMuseo = museo;

    const section = document.getElementById('section-autore-musei');
    section.innerHTML = `
        <button class="museo-detail-back" onclick="switchSection('autore-musei')">
            <i class="fa-solid fa-arrow-left"></i> Torna ai musei
        </button>
        <h2 class="museo-detail-title">${museo.nome}</h2>
        <p class="museo-detail-sub">${museo.citta} · ${museo.codiceIsil}</p>
        ${mapActionsHtml(museo)}
        <div class="detail-tabs">
            <button class="tab-btn active"
                    onclick="showAutoreTab('opere','${codiceIsil}',this)">Opere</button>
            <button class="tab-btn"
                    onclick="showAutoreTab('visite','${codiceIsil}',this)">Visite</button>
        </div>
        <div id="autoreDetailContent" class="items-grid"></div>
    `;
    showAutoreTab('opere', codiceIsil, section.querySelector('.tab-btn.active'));
};

window.showAutoreTab = async function (type, codiceIsil, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const content = document.getElementById('autoreDetailContent');
    content.innerHTML = '<p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento…</p>';

    const url = type === 'opere'
        ? `/api/opere?codiceIsil=${encodeURIComponent(codiceIsil)}`
        : `/api/visite?codiceIsil=${encodeURIComponent(codiceIsil)}`;

    try {
        const res  = await fetch(url);
        const data = await res.json();

        if (!data.ok || !data.data.length) {
            content.innerHTML = `<p class="empty-msg">Nessun${type === 'opere' ? "'opera" : 'a visita'} presente.</p>`;
            return;
        }

        if (type === 'opere') {
            currentAutoreMuseoOpere = data.data;
            content.className = 'items-grid';
            content.innerHTML = data.data.map((op, i) => `
                <div class="opera-read-card scroll-card-clickable"
                     onclick="showAutoreOperaItemsInMusei(${i}, '${codiceIsil}')">
                    ${op.immagine
                        ? `<img loading="lazy" src="${op.immagine}" alt="${op.operaId}" onerror="this.style.display='none'">`
                        : ''}
                    <h3>${op.operaId}</h3>
                    ${op.autore    ? `<p class="opera-meta"><i class="fa-solid fa-palette"></i> ${op.autore}</p>` : ''}
                    ${op.datazione ? `<p class="opera-meta"><i class="fa-solid fa-calendar"></i> ${op.datazione}</p>` : ''}
                    <p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${currentViewMuseo?.nome || codiceIsil}</p>
                    ${op.sala      ? `<p class="opera-meta"><i class="fa-solid fa-location-dot"></i> ${op.sala}</p>` : ''}
                </div>
            `).join('');
        } else {
            content.innerHTML = data.data.map(v => `
                <div class="visita-read-card">
                    <h3>${v.nomeVisita}</h3>
                    ${v.logistica ? `<p>${v.logistica}</p>` : ''}
                    <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span class="tag-bubble">
                            <i class="fa-solid fa-users"></i> ${v.acquirenti || 0} acquirenti
                        </span>
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


window.showAutoreOperaItemsInMusei = async function (idx, codiceIsil) {
    const opera = currentAutoreMuseoOpere[idx];
    if (!opera) return;

    const section = document.getElementById('section-autore-musei');
    section.innerHTML = `
        <button class="museo-detail-back" onclick="showAutoreMuseoDetail('${codiceIsil}')">
            <i class="fa-solid fa-arrow-left"></i> Torna al museo
        </button>
        <h2 class="museo-detail-title">${opera.operaId}</h2>
        <p class="museo-detail-sub">
            ${opera.autore    ? opera.autore    + ' · ' : ''}
            ${opera.tipo      ? opera.tipo      + ' · ' : ''}
            ${opera.datazione ? opera.datazione          : ''}
        </p>
        ${opera.sala ? `<p class="opera-meta" style="margin-top:6px;"><i class="fa-solid fa-location-dot"></i> ${opera.sala}</p>` : ''}
        ${opera.descrizione ? `
        <div class="glass-card p-4" style="margin-top:20px;">
            <p class="custom-label">Descrizione</p>
            <p style="line-height:1.7;">${opera.descrizione}</p>
        </div>` : ''}
        <h3 class="scroll-section-label" style="margin-top:28px;">Items associati</h3>
        <div id="autoreOperaItemsGrid" class="items-grid"></div>
    `;

    const grid = document.getElementById('autoreOperaItemsGrid');
    try {
        const res  = await fetch(`/api/items?operaId=${encodeURIComponent(opera.operaId)}`);
        const data = await res.json();
        if (!data.ok || !data.data.length) {
            grid.className = '';
            grid.innerHTML = '<p class="empty-msg">Nessun item associato a questa opera.</p>';
            return;
        }
        grid.innerHTML = data.data.map(renderItemCard).join('');
    } catch (e) {
        grid.innerHTML = '<p class="empty-msg">Errore nel caricamento degli items.</p>';
    }
};


let allAutoreVisite = [];

async function initAutoreAggiungiVisita() {
    const section = document.getElementById('section-autore-aggiungi-visita');
    section.innerHTML = `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
                <h1 class="page-title mb-0">Gestisci Visite</h1>
                <p class="text-muted mb-0">Crea, modifica ed elimina le tue visite guidate.</p>
            </div>
            <button type="button" class="btn-magenta" onclick="_showAutoreVisitaForm(null)">
                <i class="fa-solid fa-plus me-2"></i>Nuova Visita
            </button>
        </div>
        <div id="autoreVisiteListGrid" class="items-grid">
            <p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento…</p>
        </div>
    `;

    try {
        const res  = await fetch(`/api/visite?autoreId=${encodeURIComponent(SESSION.userId)}`);
        const data = await res.json();
        allAutoreVisite = data.ok ? data.data : [];
        _renderAutoreVisiteList(allAutoreVisite);
    } catch (e) {
        document.getElementById('autoreVisiteListGrid').innerHTML =
            '<p class="empty-msg">Errore nel caricamento delle visite.</p>';
    }
}

function _renderAutoreVisiteList(lista) {
    const grid = document.getElementById('autoreVisiteListGrid');
    if (!grid) return;
    if (!lista.length) {
        grid.innerHTML = '<p class="empty-msg">Non hai ancora creato nessuna visita. Usa "Nuova Visita" per iniziare.</p>';
        return;
    }
    grid.innerHTML = lista.map(v => `
        <div class="visita-read-card">
            <h3>${v.nomeVisita}</h3>
            <p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${v.codiceIsil || '—'}</p>
            <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span class="tag-bubble"><i class="fa-solid fa-layer-group"></i> ${(v.itemIds || []).length || v.opereCount || 0} item</span>
                <span class="tag-bubble"><i class="fa-solid fa-users"></i> ${v.acquirenti || 0} acquirenti</span>
                ${v.prezzo > 0
                    ? `<span class="price-badge">€${v.prezzo}</span>`
                    : `<span class="free-badge">Gratis</span>`}
                ${v.pubblica
                    ? '<span class="badge bg-success">Pubblica</span>'
                    : '<span class="badge bg-secondary">Privata</span>'}
            </div>
            <div style="margin-top:14px;">
                ${adminActionBtns(
                    `_showAutoreVisitaForm('${v._id}')`,
                    `autoreDeleteVisita('${v._id}','${(v.nomeVisita || '').replace(/'/g, "\\'")}')`
                )}
            </div>
        </div>
    `).join('');
}

window.autoreDeleteVisita = async function (id, nome) {
    if (!(await showConfirm(`Eliminare la visita "${nome}"?`))) return;
    try {
        const res  = await fetch(`/api/visite/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAutoreVisite = allAutoreVisite.filter(v => v._id !== id);
            _renderAutoreVisiteList(allAutoreVisite);
        } else {
            showAlert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { showAlert('Impossibile contattare il server.'); }
};

window._showAutoreVisitaForm = async function (visitaId) {
    const visita = visitaId ? allAutoreVisite.find(v => v._id === visitaId) : null;
    const isEdit = !!visita;

    const section = document.getElementById('section-autore-aggiungi-visita');
    section.innerHTML = `
        <button class="museo-detail-back" onclick="initAutoreAggiungiVisita()">
            <i class="fa-solid fa-arrow-left"></i> Torna alle mie visite
        </button>
        <div class="mb-5 mt-3">
            <h1 class="page-title">${isEdit ? 'Modifica Visita' : 'Nuova Visita'}</h1>
            <p class="text-muted mb-0">${isEdit ? 'Aggiorna i dettagli della tua visita guidata.' : 'Crea una nuova visita guidata per un museo.'}</p>
        </div>
        <div class="glass-card p-5">
            <form id="visitaFormAutore" class="row g-4">
                <div class="col-12">
                    <label class="custom-label" for="vfMuseo">Museo *</label>
                    <select id="vfMuseo" class="custom-input" required ${isEdit ? 'disabled' : ''}>
                        <option value="">— Seleziona museo —</option>
                    </select>
                    ${isEdit ? '<p style="font-size:0.78rem;color:#94a3b8;margin:6px 0 0;">Il museo non è modificabile: crea una nuova visita per cambiarlo.</p>' : ''}
                </div>
                <div class="col-12">
                    <label class="custom-label" for="vfNomeVisita">Nome Visita *</label>
                    <input type="text" id="vfNomeVisita" class="custom-input"
                           placeholder="es. Rinascimento Fiorentino" required value="${(visita?.nomeVisita || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="col-md-6">
                    <label class="custom-label" for="vfNomeMnemonico">Nome Mnemonico</label>
                    <input type="text" id="vfNomeMnemonico" class="custom-input"
                           placeholder="es. uffizi_rinascimento" value="${(visita?.nomeMnemonico || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="col-12">
                    <label class="custom-label" for="vfTagsField">Tag <small style="text-transform:none;color:#94a3b8;">(facoltativi)</small></label>
                    ${tagInputHtml('vfTags', 'es. caravaggio, rinascimento…')}
                </div>
                <div class="col-12">
                    <span class="custom-label">Items da includere nella visita</span>
                    <div class="detail-tabs mb-3" style="margin-top:8px;">
                        <button type="button" class="tab-btn active" id="vfTabMiei"
                                onclick="setVfItemTab('miei',this)">
                            <i class="fa-solid fa-user me-1"></i> I miei item
                        </button>
                        <button type="button" class="tab-btn" id="vfTabAcquistati"
                                onclick="setVfItemTab('acquistati',this)">
                            <i class="fa-solid fa-bag-shopping me-1"></i> Acquistati dal marketplace
                        </button>
                    </div>
                    <input type="text" id="vfItemSearch" class="custom-input" placeholder="Cerca per nome opera…"
                           style="margin-bottom:10px;" oninput="_renderVfItems()">
                    <div id="itemsCheckboxList" class="vf-items-scrollbox"
                         style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;max-height:280px;overflow-y:auto;overflow-x:hidden;padding:2px;width:100%;box-sizing:border-box;">
                        <p style="color:#64748b;font-size:0.88rem;grid-column:1/-1;">
                            Seleziona prima un museo per vedere gli items disponibili.
                        </p>
                    </div>
                </div>
                <div class="col-12" id="vfOrderSection" style="display:none;">
                    <span class="custom-label">Ordine di visita</span>
                    <p id="vfOrderHint" style="font-size:0.8rem;color:#94a3b8;margin:6px 0 10px;"></p>
                    <div id="itemsOrderPanel" style="display:flex;flex-direction:column;gap:8px;"></div>
                </div>
                ${SESSION.role !== 'visitatore' ? `
                <div class="col-12 d-flex align-items-center gap-3">
                    <span class="custom-label" style="margin:0;">Visibilità</span>
                    <div style="display:inline-flex;align-items:center;gap:10px;cursor:pointer;user-select:none;"
                         onclick="toggleVfVisibilita()">
                        <div id="vfToggleTrack" style="width:54px;height:28px;border-radius:14px;background:#cbd5e1;position:relative;transition:background .2s;flex-shrink:0;">
                            <div id="vfToggleThumb" style="position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25);transition:left .2s;"></div>
                        </div>
                        <span id="vfToggleLabel" style="font-size:0.92rem;font-weight:600;color:#64748b;">Privata</span>
                    </div>
                </div>
                <div class="col-md-4" id="vfPrezzoRow" style="display:none;">
                    <label class="custom-label" for="vfPrezzo">Prezzo (€)</label>
                    <input type="number" id="vfPrezzo" class="custom-input" min="0" step="0.01" value="${visita?.prezzo || 0}" placeholder="0.00">
                </div>
                ` : `
                <p class="col-12" style="font-size:0.82rem;color:#94a3b8;margin:0;">
                    <i class="fa-solid fa-lock me-1"></i>Le visite create come visitatore restano sempre private e non possono essere messe in vendita sul marketplace.
                </p>
                `}
                <input type="hidden" id="vfPubblica" value="false">
                <div class="col-12 d-flex justify-content-end gap-3 pt-3"
                     style="border-top:1px solid #e2e8f0;">
                    <button type="button" class="btn-outline-custom"
                            onclick="${isEdit ? 'initAutoreAggiungiVisita()' : 'resetVisitaForm()'}">${isEdit ? 'Annulla' : 'Pulisci'}</button>
                    <button type="submit" class="btn-magenta">${isEdit ? 'Salva Modifiche' : 'Crea Visita'}</button>
                </div>
            </form>
        </div>
    `;

    await ensureMuseiAutore();
    populateMuseoSelect('vfMuseo', allMuseiAutore);
    if (isEdit) document.getElementById('vfMuseo').value = visita.codiceIsil || '';
    initTagInput('vfTags', visita?.tags);

    window.toggleVfVisibilita = function (forceValue) {
        const track     = document.getElementById('vfToggleTrack');
        const thumb     = document.getElementById('vfToggleThumb');
        const label     = document.getElementById('vfToggleLabel');
        const hidden    = document.getElementById('vfPubblica');
        const prezzoRow = document.getElementById('vfPrezzoRow');
        const newVal    = typeof forceValue === 'boolean' ? forceValue : hidden.value !== 'true';
        hidden.value    = String(newVal);
        if (newVal) {
            track.style.background = 'var(--magenta,#FF007F)';
            thumb.style.left       = '29px';
            label.textContent      = 'Pubblica';
            label.style.color      = 'var(--magenta,#FF007F)';
            if (prezzoRow) prezzoRow.style.display = '';
        } else {
            track.style.background = '#cbd5e1';
            thumb.style.left       = '3px';
            label.textContent      = 'Privata';
            label.style.color      = '#64748b';
            if (prezzoRow) prezzoRow.style.display = 'none';
        }
    };
    if (isEdit && visita.pubblica && SESSION.role !== 'visitatore') window.toggleVfVisibilita(true);

    _vfCurrentMuseo    = '';
    _vfItemTab         = 'miei';
    _vfMyItems         = [];
    _vfAcquistatiItems = [];
    _vfSelectedItemIds = new Set(isEdit ? (visita.itemIds || []) : []);
    _vfLoadToken++;

    window.setVfItemTab = function (tab, btn) {
        _vfItemTab = tab;
        document.querySelectorAll('#section-autore-aggiungi-visita .tab-btn')
            .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _renderVfItems();
    };

    function _renderVfItems() {
        const container = document.getElementById('itemsCheckboxList');
        if (!container) return;
        if (!_vfCurrentMuseo) {
            container.innerHTML = '<p style="color:#64748b;font-size:0.88rem;grid-column:1/-1;">Seleziona prima un museo per vedere gli items disponibili.</p>';
            return;
        }
        const listaCompleta = _vfItemTab === 'miei' ? _vfMyItems : _vfAcquistatiItems;
        if (!listaCompleta.length) {
            const msg = _vfItemTab === 'miei'
                ? 'Nessun tuo item disponibile per questo museo. Crea un item dalla sezione "Aggiungi Item".'
                : 'Nessun item acquistato disponibile per questo museo. Acquistane dal marketplace.';
            container.innerHTML = `<p style="color:#64748b;font-size:0.88rem;grid-column:1/-1;">${msg}</p>`;
            return;
        }
        const q = (document.getElementById('vfItemSearch')?.value || '').trim().toLowerCase();
        const lista = q ? listaCompleta.filter(it => itemTitle(it).toLowerCase().includes(q)) : listaCompleta;
        if (!lista.length) {
            container.innerHTML = `<p style="color:#64748b;font-size:0.88rem;grid-column:1/-1;">Nessun item corrisponde alla ricerca.</p>`;
            return;
        }
        // Un'opera non può avere, all'interno della stessa visita, due item con lo stesso tono:
        // costruiamo la mappa "operaId|tono" -> id dell'item già selezionato per bloccare i conflitti.
        const allItemsPool = [..._vfMyItems, ..._vfAcquistatiItems];
        const toneTaken = new Map();
        _vfSelectedItemIds.forEach(selId => {
            const selItem = allItemsPool.find(x => x._id === selId);
            if (!selItem || selItem.contentType === 'indipendente' || !selItem.operaId) return;
            const t = getItemTone(selItem);
            if (t) toneTaken.set(selItem.operaId + '|' + t, selId);
        });

        container.innerHTML = lista.map(it => {
            const preview   = toneText(it.toni?.semplice).substring(0, 60);
            const isChecked = _vfSelectedItemIds.has(it._id);
            const tone      = getItemTone(it);
            const conflictId = (it.contentType !== 'indipendente' && it.operaId && tone)
                ? toneTaken.get(it.operaId + '|' + tone) : null;
            const isBlocked = !!conflictId && conflictId !== it._id;
            return `
            <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;
                          border:1px solid ${isChecked ? 'var(--magenta,#FF007F)' : '#e2e8f0'};
                          border-radius:10px;cursor:${isBlocked ? 'not-allowed' : 'pointer'};transition:border-color .18s,background .18s;
                          background:${isChecked ? 'rgba(255,0,127,0.05)' : (isBlocked ? 'rgba(0,0,0,0.03)' : '')};
                          opacity:${isBlocked ? '0.55' : '1'};
                          min-width:0;box-sizing:border-box;">
                <input type="checkbox" name="itemsVisita" value="${it._id}"
                       ${isChecked ? 'checked' : ''} ${isBlocked ? 'disabled' : ''}
                       style="margin-top:3px;width:auto;accent-color:var(--magenta,#FF007F);flex-shrink:0;"
                       onchange="vfToggleItem('${it._id}',this.checked,this);">
                <span style="font-size:0.88rem;min-width:0;overflow-wrap:anywhere;">
                    <strong>${itemTitle(it)}</strong>
                    ${tone ? `<span class="tone-badge tone-badge--${tone}" style="margin-left:6px;font-size:0.68rem;">${tone}</span>` : ''}
                    ${preview ? `<br><span style="color:#64748b;font-size:0.8rem;">${preview}${preview.length >= 60 ? '…' : ''}</span>` : ''}
                    ${isBlocked ? `<br><span style="color:#ef4444;font-size:0.78rem;"><i class="fa-solid fa-circle-exclamation"></i> Hai già un item "${tone}" per quest'opera in questa visita</span>` : ''}
                </span>
            </label>`;
        }).join('');
    }


    window._renderVfItems = _renderVfItems;

    async function _loadVfItemsForMuseo(codiceIsil, preserveSelection) {
        const container = document.getElementById('itemsCheckboxList');
        const searchBox = document.getElementById('vfItemSearch');
        if (searchBox) searchBox.value = '';
        _vfCurrentMuseo = codiceIsil;
        if (!codiceIsil) {
            _vfLoadToken++;
            _vfMyItems = [];
            _vfAcquistatiItems = [];
            _vfOperaSalaMap = {};
            _vfRoomGeo = null;
            if (!preserveSelection) _vfSelectedItemIds = new Set();
            _renderVfItems();
            window.vfUpdateOrderPanel();
            return;
        }
        if (!preserveSelection) _vfSelectedItemIds = new Set();
        container.innerHTML = '<p style="color:#64748b;font-size:0.88rem;grid-column:1/-1;"><i class="fa-solid fa-spinner fa-spin me-1"></i> Caricamento items…</p>';


        const myToken = ++_vfLoadToken;


        const fetchJsonSafe = async (url) => {
            try {
                const r = await fetch(url);
                const d = await r.json();
                return d.ok ? d.data : [];
            } catch (e) {
                return null; 
            }
        };
        const [dOwn, dPublic] = await Promise.all([
            fetchJsonSafe(`/api/items?authorId=${encodeURIComponent(SESSION.userId)}&museumId=${encodeURIComponent(codiceIsil)}`),
            fetchJsonSafe(`/api/items?pubblica=true&museumId=${encodeURIComponent(codiceIsil)}`),
        ]);

        if (myToken !== _vfLoadToken) return; 

        if (dOwn === null && dPublic === null) {
            container.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;">
                    <p style="color:#e74c3c;font-size:0.88rem;margin-bottom:8px;">Errore nel caricamento degli items (connessione al server non riuscita).</p>
                    <button type="button" class="btn-outline-custom" style="padding:6px 14px;font-size:0.82rem;"
                            onclick="_loadVfItemsForMuseo('${codiceIsil}', true)">
                        <i class="fa-solid fa-rotate-right me-1"></i> Riprova
                    </button>
                </div>`;
            return;
        }

        _vfMyItems = dOwn || [];


        const purchases = getMktPurchases();
        _vfAcquistatiItems = (dPublic || [])
            .filter(it => it.authorId !== SESSION.userId && (
                (it.acquirentiIds || []).includes(SESSION.userId) || purchases.items.includes(it._id)
            ));
        await _vfLoadRoomGeo(codiceIsil);
        _renderVfItems();
        window.vfUpdateOrderPanel();
    }
    window._loadVfItemsForMuseo = _loadVfItemsForMuseo;

    /* Ordinamento automatico per vicinanza spaziale (geoJson piantina) */

    async function _vfLoadRoomGeo(codiceIsil) {
        _vfOperaSalaMap = {};
        _vfRoomGeo = null;
        try {
            const resOpere = await fetch(`/api/opere?codiceIsil=${encodeURIComponent(codiceIsil)}`);
            const dOpere   = await resOpere.json();
            (dOpere.ok ? dOpere.data : []).forEach(op => {
                if (op.sala) _vfOperaSalaMap[op.operaId] = op.sala;
            });
        } catch (e) { /* silent */ }

        const floorDefs = Object.values((typeof FLOOR_PLAN_OVERRIDES !== 'undefined' && FLOOR_PLAN_OVERRIDES[codiceIsil]) || {});
        if (!floorDefs.length) return;

        const rooms = new Map();
        const corridorSegmentsByFloor = new Map();
        let entrance = null;
        await Promise.all(floorDefs.map(async (def, floorIdx) => {
            if (!def.geoJsonUrl) return;
            try {
                const res = await fetch(def.geoJsonUrl);
                const geo = await res.json();
                (geo.features || []).forEach(f => {
                    const roomId = f.properties?.room_id;
                    if (!roomId || f.geometry?.type !== 'Polygon') return;
                    if (roomId === 'ingresso') {
                        const c = dashRingCentroid(f.geometry.coordinates[0]);
                        entrance = { floor: floorIdx, x: c.x, y: c.y };
                    } else if (/corridoio/i.test(roomId)) {
                        // segmento di corridoio: usato per costruire il percorso
                        // praticabile, non è una sala selezionabile per gli item.
                        if (!corridorSegmentsByFloor.has(floorIdx)) corridorSegmentsByFloor.set(floorIdx, []);
                        corridorSegmentsByFloor.get(floorIdx).push(dashPolygonLongAxis(f.geometry.coordinates[0]));
                    } else if (!DASH_AMENITY_ICONS[roomId]) {
                        const c = dashRingCentroid(f.geometry.coordinates[0]);
                        rooms.set(String(roomId), { floor: floorIdx, x: c.x, y: c.y });
                    }
                });
            } catch (e) { /* silent */ }
        }));

        if (!(entrance && rooms.size)) return;

        const spines = new Map();
        corridorSegmentsByFloor.forEach((segments, floorIdx) => {
            const spine = dashBuildCorridorSpine(segments);
            if (spine) spines.set(floorIdx, spine);
        });

        _vfRoomGeo = { entrance, rooms, spines };
    }

    /* Cammino ordinato per vicinanza: parte dall'ingresso, poi sceglie ogni volta
       l'item non ancora inserito la cui sala è più vicina (camminando lungo il
       corridoio, se la piantina lo permette — altrimenti in linea d'aria) all'ultima
       aggiunta. Esaurisce un piano prima di passare al successivo. Ritorna null se
       manca il geoJson o nessun item è localizzabile. */
    function _vfComputeSpatialOrder(selectedIds) {
        if (!_vfRoomGeo) return null;
        const allItems = [..._vfMyItems, ..._vfAcquistatiItems];
        const located = [];
        const unlocated = [];
        selectedIds.forEach(id => {
            const item = allItems.find(it => it._id === id);
            const sala = item ? _vfOperaSalaMap[item.operaId] : undefined;
            const pos  = sala != null ? _vfRoomGeo.rooms.get(String(sala)) : undefined;
            if (pos) located.push({ id, pos });
            else unlocated.push(id);
        });
        if (!located.length) return null;

        const ordered = [];
        let current = _vfRoomGeo.entrance;
        const remaining = located.slice();
        while (remaining.length) {
            let bestIdx = 0, bestDist = Infinity;
            remaining.forEach((cand, i) => {
                let d;
                if (cand.pos.floor !== current.floor) {
                    d = 1e9 + i;
                } else {
                    const spine = _vfRoomGeo.spines.get(current.floor);
                    d = spine
                        ? dashSpineDistance(spine, current, cand.pos)
                        : Math.hypot(cand.pos.x - current.x, cand.pos.y - current.y);
                }
                if (d < bestDist) { bestDist = d; bestIdx = i; }
            });
            const chosen = remaining.splice(bestIdx, 1)[0];
            ordered.push(chosen.id);
            current = chosen.pos;
        }
        return [...ordered, ...unlocated];
    }

    document.getElementById('vfMuseo').addEventListener('change', function () {
        _loadVfItemsForMuseo(this.value, false);
    });

    if (isEdit && visita.codiceIsil) {
        await _loadVfItemsForMuseo(visita.codiceIsil, true);
    }

    /* Drag-and-drop order panel */
    let _vfDragSrc = null;

    function _vfRenumberCards() {
        document.querySelectorAll('#itemsOrderPanel .vf-drag-card').forEach((c, i) => {
            const n = c.querySelector('[data-num]');
            if (n) n.textContent = i + 1;
        });
    }

    window.vfToggleItem = function (id, checked, checkbox) {
        if (checked) {
            const allItemsPool = [..._vfMyItems, ..._vfAcquistatiItems];
            const candidate    = allItemsPool.find(it => it._id === id);
            const tone         = candidate ? getItemTone(candidate) : null;
            if (candidate && candidate.contentType !== 'indipendente' && candidate.operaId && tone) {
                const conflict = [..._vfSelectedItemIds].some(selId => {
                    if (selId === id) return false;
                    const selItem = allItemsPool.find(it => it._id === selId);
                    return selItem && selItem.operaId === candidate.operaId && getItemTone(selItem) === tone;
                });
                if (conflict) {
                    checkbox.checked = false;
                    showAlert(`Hai già selezionato un item con tono "${tone}" per l'opera "${candidate.operaId}" in questa visita. Scegli un item con un tono diverso per la stessa opera.`);
                    return;
                }
            }
            _vfSelectedItemIds.add(id);
        } else {
            _vfSelectedItemIds.delete(id);
        }
        _renderVfItems();
        window.vfUpdateOrderPanel();
    };

    window.vfUpdateOrderPanel = function () {
        const section = document.getElementById('vfOrderSection');
        const panel   = document.getElementById('itemsOrderPanel');
        if (!section || !panel) return;

        if (!_vfSelectedItemIds.size) {
            section.style.display = 'none';
            panel.innerHTML = '';
            return;
        }
        section.style.display = '';

        const allItems = [..._vfMyItems, ..._vfAcquistatiItems];
        const spatialOrder = _vfComputeSpatialOrder([..._vfSelectedItemIds]);

        let newOrder;
        if (spatialOrder) {
            newOrder = spatialOrder;
        } else {
            const existingIds = [...panel.querySelectorAll('.vf-drag-card')].map(c => c.dataset.itemId);
            newOrder = [
                ...existingIds.filter(id => _vfSelectedItemIds.has(id)),
                ...[..._vfSelectedItemIds].filter(id => !existingIds.includes(id)),
            ];
        }

        const hint = document.getElementById('vfOrderHint');
        if (hint) {
            hint.innerHTML = spatialOrder
                ? '<i class="fa-solid fa-route me-1"></i>Ordine suggerito in base alla vicinanza fisica nel museo — puoi comunque trascinare le card per modificarlo.'
                : '<i class="fa-solid fa-grip-vertical me-1"></i>Trascina le card per riordinare la sequenza di visita.';
        }

        panel.innerHTML = newOrder.map((id, i) => {
            const item = allItems.find(it => it._id === id);
            if (!item) return '';
            const preview = toneText(item.toni?.semplice).substring(0, 70);
            return `
            <div class="vf-drag-card" data-item-id="${id}" draggable="true"
                 ondragstart="vfDragStart(event,this)"
                 ondragover="vfDragOver(event,this)"
                 ondragleave="vfDragLeave(event,this)"
                 ondrop="vfDrop(event,this)"
                 ondragend="vfDragEnd(event,this)">
                <i class="fa-solid fa-grip-vertical"></i>
                <span data-num>${i + 1}</span>
                <div style="flex:1;min-width:0;">
                    <strong style="font-size:0.88rem;">${itemTitle(item)}</strong>
                    ${preview ? `<p style="margin:2px 0 0;font-size:0.78rem;color:#64748b;
                                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${preview}</p>` : ''}
                </div>
            </div>`;
        }).join('');
    };

    window.vfDragStart = function (e, el) {
        _vfDragSrc = el;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { el.style.opacity = '0.45'; el.style.cursor = 'grabbing'; }, 0);
    };

    window.vfDragOver = function (e, el) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (el !== _vfDragSrc) el.classList.add('vf-drag-card--over');
    };

    window.vfDragLeave = function (e, el) {
        el.classList.remove('vf-drag-card--over');
    };

    window.vfDrop = function (e, el) {
        e.preventDefault();
        if (!_vfDragSrc || _vfDragSrc === el) return;
        const panel = document.getElementById('itemsOrderPanel');
        const cards = [...panel.querySelectorAll('.vf-drag-card')];
        const srcIdx = cards.indexOf(_vfDragSrc);
        const dstIdx = cards.indexOf(el);
        if (srcIdx < dstIdx) el.parentNode.insertBefore(_vfDragSrc, el.nextSibling);
        else                  el.parentNode.insertBefore(_vfDragSrc, el);
        el.classList.remove('vf-drag-card--over');
        _vfRenumberCards();
    };

    window.vfDragEnd = function (e, el) {
        el.style.opacity = '1';
        el.style.cursor  = 'grab';
        document.querySelectorAll('#itemsOrderPanel .vf-drag-card').forEach(c => {
            c.classList.remove('vf-drag-card--over');
        });
    };

    document.getElementById('visitaFormAutore').addEventListener('submit', async (e) => {
        e.preventDefault();
        const codiceIsil = document.getElementById('vfMuseo').value;
        if (!codiceIsil) { showAlert('Seleziona un museo.'); return; }

        const orderPanel = document.getElementById('itemsOrderPanel');
        const selectedItems = (orderPanel && orderPanel.querySelectorAll('.vf-drag-card').length > 0)
            ? [...orderPanel.querySelectorAll('.vf-drag-card')].map(c => c.dataset.itemId)
            : [..._vfSelectedItemIds];
        const isPubblica = SESSION.role !== 'visitatore' && document.getElementById('vfPubblica').value === 'true';
        const body = {
            nomeVisita:    document.getElementById('vfNomeVisita').value.trim(),
            nomeMnemonico: document.getElementById('vfNomeMnemonico').value.trim(),
            codiceIsil,
            prezzo:        isPubblica ? (parseFloat(document.getElementById('vfPrezzo').value) || 0) : 0,
            pubblica:      isPubblica,
            autoreId:      SESSION.userId,
            itemIds:       selectedItems,
            opereCount:    selectedItems.length,
            tags:          getTagInputValue('vfTags'),
        };

        if (!body.nomeVisita) { showAlert('Inserisci il nome della visita.'); return; }

        try {
            const res  = isEdit
                ? await fetch(`/api/visite/${visita._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...body, acquirenti: visita.acquirenti || 0 }),
                })
                : await fetch('/api/visite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            const data = await res.json();
            if (data.ok) {
                showAlert(isEdit ? `Visita "${body.nomeVisita}" aggiornata con successo!` : `Visita "${body.nomeVisita}" creata con successo!`);
                await initAutoreAggiungiVisita();
            } else {
                showAlert('Errore: ' + (data.error || (isEdit ? 'Aggiornamento fallito.' : 'Creazione fallita.')));
            }
        } catch (err) {
            showAlert('Impossibile contattare il server.');
        }
    });
};

window.resetVisitaForm = function () {
    const f = document.getElementById('visitaFormAutore');
    if (f) f.reset();
    const c = document.getElementById('itemsCheckboxList');
    if (c) c.innerHTML = '<p style="color:#64748b;font-size:0.88rem;grid-column:1/-1;">Seleziona prima un museo per vedere gli items disponibili.</p>';
    const track  = document.getElementById('vfToggleTrack');
    const thumb  = document.getElementById('vfToggleThumb');
    const label  = document.getElementById('vfToggleLabel');
    const hidden = document.getElementById('vfPubblica');
    const row    = document.getElementById('vfPrezzoRow');
    if (track)  track.style.background = '#cbd5e1';
    if (thumb)  thumb.style.left = '3px';
    if (label)  { label.textContent = 'Privata'; label.style.color = '#64748b'; }
    if (hidden) hidden.value = 'false';
    if (row)    row.style.display = 'none';
    _vfLoadToken++;
    _vfCurrentMuseo    = '';
    _vfMyItems         = [];
    _vfAcquistatiItems = [];
    _vfSelectedItemIds = new Set();
    _vfOperaSalaMap    = {};
    _vfRoomGeo         = null;
    const orderSection = document.getElementById('vfOrderSection');
    const orderPanel   = document.getElementById('itemsOrderPanel');
    if (orderSection) orderSection.style.display = 'none';
    if (orderPanel)   orderPanel.innerHTML = '';
};


let allAutoreItems = [];
let _autoreItemsCurrentList = [];
