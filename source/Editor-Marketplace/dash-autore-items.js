async function initAutoreAggiungiItem() {
    const section = document.getElementById('section-autore-aggiungi-item');
    section.innerHTML = `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
                <h1 class="page-title mb-0">Gestisci Item</h1>
                <p class="text-muted mb-0">Crea, modifica ed elimina i tuoi item associati alle opere.</p>
            </div>
            <button type="button" class="btn-magenta" onclick="_showAutoreItemForm(null)">
                <i class="fa-solid fa-plus me-2"></i>Nuovo Item
            </button>
        </div>
        <div class="d-flex align-items-center gap-3 flex-wrap mb-4">
            <select id="filterAutoreItemMuseo" class="custom-input" style="max-width:200px;"
                    onchange="filterAutoreItems()">
                <option value="">Tutti i musei</option>
            </select>
            <select id="filterAutoreItemVisibilita" class="custom-input" style="max-width:160px;"
                    onchange="filterAutoreItems()">
                <option value="">Stato</option>
                <option value="pubblica">Pubblici</option>
                <option value="privata">Privati</option>
            </select>
            <div class="search-box-container shadow-sm py-1 px-3" style="max-width:240px;">
                <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                <input type="text" id="searchAutoreItem" class="search-input py-2"
                       placeholder="Cerca item…" oninput="filterAutoreItems()">
            </div>
        </div>
        <div id="autoreItemsListGrid" class="items-grid">
            <p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento…</p>
        </div>
    `;

    try {
        const res  = await fetch(`/api/items?authorId=${encodeURIComponent(SESSION.userId)}`);
        const data = await res.json();
        allAutoreItems = data.ok ? data.data : [];
        _renderAutoreItemsList(allAutoreItems);

        await ensureMuseiAutore();
        const museoNameMap = {};
        allMuseiAutore.forEach(m => { museoNameMap[m.codiceIsil] = m.nome; });

        const museoSel = document.getElementById('filterAutoreItemMuseo');
        const museiPresenti = [...new Set(allAutoreItems.map(it => it.museumId).filter(Boolean))]
            .sort((a, b) => (museoNameMap[a] || a).localeCompare(museoNameMap[b] || b));
        museoSel.innerHTML = '<option value="">Tutti i musei</option>' +
            museiPresenti.map(id => `<option value="${id}">${museoNameMap[id] || id}</option>`).join('');
    } catch (e) {
        document.getElementById('autoreItemsListGrid').innerHTML =
            '<p class="empty-msg">Errore nel caricamento degli items.</p>';
    }
}

window.filterAutoreItems = function () {
    const q      = (document.getElementById('searchAutoreItem')?.value || '').toLowerCase();
    const museo  = document.getElementById('filterAutoreItemMuseo')?.value || '';
    const vis    = document.getElementById('filterAutoreItemVisibilita')?.value || '';

    let filtered = allAutoreItems;
    if (q) filtered = filtered.filter(it => {
        const testo = [
            itemTitle(it),
            toneText(it.toni?.semplice),
            toneText(it.toni?.medio),
            toneText(it.toni?.avanzato),
        ].join(' ').toLowerCase();
        return testo.includes(q);
    });
    if (museo) filtered = filtered.filter(it => it.museumId === museo);
    if (vis)   filtered = filtered.filter(it => vis === 'pubblica' ? it.pubblica : !it.pubblica);

    _renderAutoreItemsList(filtered);
};

function _renderAutoreItemsList(lista) {
    const grid = document.getElementById('autoreItemsListGrid');
    if (!grid) return;
    _autoreItemsCurrentList = lista;
    if (!lista.length) {
        grid.innerHTML = allAutoreItems.length
            ? '<p class="empty-msg">Nessun item corrisponde ai filtri selezionati.</p>'
            : '<p class="empty-msg">Non hai ancora creato nessun item. Usa "Nuovo Item" per iniziare.</p>';
        return;
    }
    grid.innerHTML = lista.map(it => {
        return `
        <div class="item-read-card">
            <div class="item-card-clickable" onclick="_showAutoreItemView('${it._id}')">
                ${it.image
                    ? `<img loading="lazy" src="${it.image}" alt="item" onerror="this.style.display='none'">`
                    : ''}
                <h3 style="margin:0 0 4px;overflow-wrap:break-word;word-break:break-word;">${itemTitle(it)}</h3>
                <p class="opera-meta" style="overflow-wrap:break-word;word-break:break-word;"><i class="fa-solid fa-building-columns"></i> ${it.museumId || '—'}</p>
                <div style="margin-top:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    ${toneBadgesHtml(it)}
                </div>
                <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    ${itemTypeBadge(it)}
                    ${it.pubblica
                        ? '<span class="badge bg-success">Pubblico</span>'
                        : '<span class="badge bg-secondary">Privato</span>'}
                    ${it.metadata?.prezzo > 0 ? `<span class="price-badge">€${it.metadata.prezzo}</span>` : ''}
                </div>
            </div>
            <div style="margin-top:14px;">
                ${adminActionBtns(
                    `_showAutoreItemForm('${it._id}')`,
                    `autoreDeleteItem('${it._id}','${itemTitle(it).replace(/'/g, "\\'")}')`
                )}
            </div>
        </div>`;
    }).join('');
}

window.autoreDeleteItem = async function (id, operaId) {
    if (!(await showConfirm(`Eliminare l'item di "${operaId}"?`))) return;
    try {
        const res  = await fetch(`/api/items/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAutoreItems = allAutoreItems.filter(it => it._id !== id);
            _renderAutoreItemsList(allAutoreItems);
        } else {
            showAlert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { showAlert('Impossibile contattare il server.'); }
};


window._showAutoreItemView = function (itemId) {
    const lista = _autoreItemsCurrentList.length ? _autoreItemsCurrentList : allAutoreItems;
    const idx   = lista.findIndex(it => it._id === itemId);
    if (idx === -1) return;
    const it = lista[idx];

    const section = document.getElementById('section-autore-aggiungi-item');
    section.innerHTML = `
        <button class="museo-detail-back" onclick="initAutoreAggiungiItem()">
            <i class="fa-solid fa-arrow-left"></i> Torna ai miei item
        </button>
        <div class="item-view-carousel" data-idx="${idx}">
            <button type="button" class="item-view-nav item-view-nav--prev"
                    onclick="_navigateAutoreItemView(-1)" aria-label="Item precedente" ${lista.length < 2 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <div class="item-view-card glass-card p-5">
                ${it.image ? `<img loading="lazy" src="${it.image}" alt="item" class="item-view-img">` : ''}
                <div class="d-flex align-items-center gap-2 flex-wrap mb-2">
                    ${itemTypeBadge(it)}
                    ${it.pubblica
                        ? '<span class="badge bg-success">Pubblico</span>'
                        : '<span class="badge bg-secondary">Privato</span>'}
                    ${it.metadata?.prezzo > 0 ? `<span class="price-badge">€${it.metadata.prezzo}</span>` : ''}
                </div>
                <h2 class="museo-detail-title" style="margin-bottom:2px;">${itemTitle(it)}</h2>
                <p class="opera-meta mb-4"><i class="fa-solid fa-building-columns"></i> ${it.museumId || '—'}</p>
                ${renderToni(it, 'view-' + it._id)}
                <div class="d-flex justify-content-between align-items-center mt-4 pt-3" style="border-top:1px solid #e2e8f0;">
                    <span style="font-size:0.8rem;color:#94a3b8;">${idx + 1} di ${lista.length}</span>
                    <button type="button" class="btn-magenta" onclick="_showAutoreItemForm('${it._id}')">
                        <i class="fa-solid fa-pen-to-square me-2"></i>Modifica
                    </button>
                </div>
            </div>
            <button type="button" class="item-view-nav item-view-nav--next"
                    onclick="_navigateAutoreItemView(1)" aria-label="Item successivo" ${lista.length < 2 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    `;
};

window._navigateAutoreItemView = function (dir) {
    const lista = _autoreItemsCurrentList.length ? _autoreItemsCurrentList : allAutoreItems;
    if (lista.length < 2) return;
    const idxAttr = document.querySelector('.item-view-carousel')?.dataset.idx;
    let idx = idxAttr !== undefined ? parseInt(idxAttr, 10) : 0;
    idx = (idx + dir + lista.length) % lista.length;
    window._showAutoreItemView(lista[idx]._id);
};

window._showAutoreItemForm = async function (itemId) {
    const item   = itemId ? allAutoreItems.find(it => it._id === itemId) : null;
    const isEdit = !!item;

    const section = document.getElementById('section-autore-aggiungi-item');
    section.innerHTML = `
        <button class="museo-detail-back" onclick="initAutoreAggiungiItem()">
            <i class="fa-solid fa-arrow-left"></i> Torna ai miei item
        </button>
        <div class="mb-5 mt-3">
            <h1 class="page-title">${isEdit ? 'Modifica Item' : 'Nuovo Item'}</h1>
            <p class="text-muted mb-0">${isEdit ? "Aggiorna i contenuti dell'item." : "Aggiungi contenuti e informazioni per un'opera specifica."}</p>
        </div>
        <div class="glass-card p-5">
            <form id="itemFormAutore" class="row g-4">
                <div class="col-md-6">
                    <label class="custom-label" for="ifMuseo">Museo *</label>
                    <select id="ifMuseo" class="custom-input" required ${isEdit ? 'disabled' : ''}>
                        <option value="">— Seleziona museo —</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <span class="custom-label">Tipo di contenuto *</span>
                    <div class="content-type-toggle" id="ifContentTypeToggle">
                        <button type="button" class="content-type-btn" data-type="opera"
                                ${isEdit ? 'disabled' : `onclick="setIfContentType('opera')"`}>
                            <i class="fa-solid fa-image"></i> Legato a un'opera
                        </button>
                        <button type="button" class="content-type-btn" data-type="indipendente"
                                ${isEdit ? 'disabled' : `onclick="setIfContentType('indipendente')"`}>
                            <i class="fa-solid fa-lightbulb"></i> Indipendente
                        </button>
                    </div>
                    <input type="hidden" id="ifContentType" value="${item?.contentType === 'indipendente' ? 'indipendente' : 'opera'}">
                </div>
                <p class="col-12" style="font-size:0.78rem;color:#94a3b8;margin:0;">
                    <i class="fa-solid fa-circle-info me-1"></i>Un item "Indipendente" non è legato a un'opera specifica: usalo per movimenti culturali, stili, artisti, eventi storici e simili.
                </p>
                <div class="col-md-6" id="ifOperaWrap">
                    <label class="custom-label" for="ifOpera">Opera *</label>
                    <select id="ifOpera" class="custom-input" required ${isEdit ? 'disabled' : ''}>
                        <option value="">— Prima seleziona un museo —</option>
                    </select>
                </div>
                <div class="col-md-6" id="ifTopicWrap" style="display:none;">
                    <label class="custom-label" for="ifTopic">Argomento *</label>
                    <input type="text" id="ifTopic" class="custom-input"
                           placeholder="es. Cubismo, Rinascimento fiorentino, Caravaggio…"
                           value="${(item?.topic || '').replace(/"/g, '&quot;')}" ${isEdit ? 'disabled' : ''}>
                </div>
                ${isEdit ? '<p class="col-12" style="font-size:0.78rem;color:#94a3b8;margin:0;"><i class="fa-solid fa-circle-info me-1"></i>Museo, tipo, opera e argomento non sono modificabili: crea un nuovo item per associarne uno diverso.</p>' : ''}
                <p class="col-12" style="font-size:0.82rem;color:#94a3b8;margin:0;">
                    <i class="fa-solid fa-circle-info me-1"></i>Scegli un tono e compila le sue 3 durate (3s / 15s / 40s). Puoi farne uno, due o tutti e tre.
                </p>
                ${toneEditorHtml('ifToneEditor', 'if', item?.toni)}
                <div class="col-md-6">
                    <label class="custom-label" for="ifObjectId">ID Oggetto</label>
                    <input type="text" id="ifObjectId" class="custom-input"
                           placeholder="Generato automaticamente se vuoto" value="${(item?.objectId || '').replace(/"/g, '&quot;')}" ${isEdit ? 'disabled' : ''}>
                </div>
                <div class="col-md-6" id="ifImmagineWrap" style="display:none;">
                    <label class="custom-label" for="ifImmagine">URL Immagine</label>
                    <input type="url" id="ifImmagine" class="custom-input" placeholder="https://esempio.com/immagine.jpg" value="${(item?.image || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="col-12">
                    <label class="custom-label" for="ifTagsField">Tag <small style="text-transform:none;color:#94a3b8;">(facoltativi)</small></label>
                    ${tagInputHtml('ifTags', 'es. caravaggio, rinascimento…')}
                </div>
                ${SESSION.role !== 'visitatore' ? `
                <div class="col-12 d-flex align-items-center gap-3">
                    <span class="custom-label" style="margin:0;">Visibilità</span>
                    <div style="display:inline-flex;align-items:center;gap:10px;cursor:pointer;user-select:none;"
                         onclick="toggleIfVisibilita()">
                        <div id="ifToggleTrack" style="width:54px;height:28px;border-radius:14px;background:#cbd5e1;position:relative;transition:background .2s;flex-shrink:0;">
                            <div id="ifToggleThumb" style="position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25);transition:left .2s;"></div>
                        </div>
                        <span id="ifToggleLabel" style="font-size:0.92rem;font-weight:600;color:#64748b;">Privata</span>
                    </div>
                </div>
                <div class="col-md-4" id="ifPrezzoRow" style="display:none;">
                    <label class="custom-label" for="ifPrezzo">Prezzo (€)</label>
                    <input type="number" id="ifPrezzo" class="custom-input" min="0" step="0.01" value="${item?.metadata?.prezzo || 0}" placeholder="0.00">
                </div>
                ` : `
                <p class="col-12" style="font-size:0.82rem;color:#94a3b8;margin:0;">
                    <i class="fa-solid fa-lock me-1"></i>Gli item creati come visitatore restano sempre privati e non possono essere messi in vendita sul marketplace.
                </p>
                `}
                <input type="hidden" id="ifPubblica" value="false">
                <div class="col-12 d-flex justify-content-end gap-3 pt-3"
                     style="border-top:1px solid #e2e8f0;">
                    <button type="button" class="btn-outline-custom"
                            onclick="${isEdit ? 'initAutoreAggiungiItem()' : 'resetItemForm()'}">${isEdit ? 'Annulla' : 'Pulisci'}</button>
                    <button type="submit" class="btn-magenta">${isEdit ? 'Salva Modifiche' : 'Salva Item'}</button>
                </div>
            </form>
        </div>
    `;

    await ensureMuseiAutore();
    populateMuseoSelect('ifMuseo', allMuseiAutore);
    wireToneBadges('ifToneEditor', 'if');
    initTagInput('ifTags', item?.tags);

    window.setIfContentType = function (type) {
        document.getElementById('ifContentType').value = type;
        document.querySelectorAll('#ifContentTypeToggle .content-type-btn')
            .forEach(b => b.classList.toggle('active', b.dataset.type === type));
        const operaWrap     = document.getElementById('ifOperaWrap');
        const topicWrap     = document.getElementById('ifTopicWrap');
        const operaSelect   = document.getElementById('ifOpera');
        const topicInput    = document.getElementById('ifTopic');
        const immagineWrap  = document.getElementById('ifImmagineWrap');
        if (type === 'opera') {
            operaWrap.style.display = '';
            topicWrap.style.display = 'none';
            operaSelect.required = true;
            topicInput.required  = false;
            immagineWrap.style.display = 'none';
        } else {
            operaWrap.style.display = 'none';
            topicWrap.style.display = '';
            operaSelect.required = false;
            topicInput.required  = true;
            immagineWrap.style.display = '';
        }
    };
    setIfContentType(item?.contentType === 'indipendente' ? 'indipendente' : 'opera');

    window.toggleIfVisibilita = function (forceValue) {
        const track     = document.getElementById('ifToggleTrack');
        const thumb     = document.getElementById('ifToggleThumb');
        const label     = document.getElementById('ifToggleLabel');
        const hidden    = document.getElementById('ifPubblica');
        const prezzoRow = document.getElementById('ifPrezzoRow');
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
    if (isEdit && item.pubblica && SESSION.role !== 'visitatore') window.toggleIfVisibilita(true);

    let _ifOpereCache = [];

    async function _loadOpereForMuseo(codiceIsil) {
        const operaSelect = document.getElementById('ifOpera');
        _ifOpereCache = [];
        if (!codiceIsil) {
            operaSelect.innerHTML = '<option value="">— Prima seleziona un museo —</option>';
            return;
        }
        operaSelect.innerHTML = '<option value="">Caricamento…</option>';
        try {
            const res  = await fetch(`/api/opere?codiceIsil=${encodeURIComponent(codiceIsil)}`);
            const data = await res.json();
            if (!data.ok || !data.data.length) {
                operaSelect.innerHTML = '<option value="">Nessuna opera disponibile</option>';
                return;
            }
            _ifOpereCache = data.data;
            operaSelect.innerHTML = '<option value="">— Seleziona opera —</option>' +
                data.data.map(op =>
                    `<option value="${op.operaId}">${op.operaId}${op.autore ? ' — ' + op.autore : ''}</option>`
                ).join('');
            if (isEdit) operaSelect.value = item.operaId || '';
        } catch (e) {
            operaSelect.innerHTML = '<option value="">Errore nel caricamento</option>';
        }
    }

    document.getElementById('ifMuseo').addEventListener('change', function () {
        _loadOpereForMuseo(this.value);
    });

    if (isEdit) {
        document.getElementById('ifMuseo').value = item.museumId || '';
        await _loadOpereForMuseo(item.museumId);
    }

    document.getElementById('itemFormAutore').addEventListener('submit', async (e) => {
        e.preventDefault();
        const museoIsil   = document.getElementById('ifMuseo').value;
        const contentType = document.getElementById('ifContentType').value;
        const operaId      = contentType === 'opera'       ? document.getElementById('ifOpera').value      : '';
        const topic        = contentType === 'indipendente' ? document.getElementById('ifTopic').value.trim() : '';
        const toni = {
            semplice: readToneFields('if', 'Semplice'),
            medio:    readToneFields('if', 'Medio'),
            avanzato: readToneFields('if', 'Avanzato'),
        };

        if (!museoIsil) { showAlert('Seleziona un museo.'); return; }
        if (contentType === 'opera') {
            if (!operaId) { showAlert("Seleziona un'opera."); return; }
        } else {
            if (!topic) { showAlert('Inserisci un argomento per il contenuto indipendente.'); return; }
        }
        if (!validateToniShapeOrAlert(toni)) return;

        const isPubblicaItem = SESSION.role !== 'visitatore' && document.getElementById('ifPubblica').value === 'true';
        if (isPubblicaItem && !hasCompleteTone(toni)) {
            showAlert('Per pubblicare un item serve almeno un tono con tutte e 3 le durate (3s, 15s, 40s) compilate. Lascialo privato finché non lo completi.');
            return;
        }
        const prezzo   = isPubblicaItem ? (parseFloat(document.getElementById('ifPrezzo').value) || 0) : 0;
        const metadata = {};
        if (prezzo > 0) metadata.prezzo = prezzo;

        const objectIdVal = document.getElementById('ifObjectId').value.trim();
        const baseForId = contentType === 'opera' ? operaId : topic;
        const imageVal = contentType === 'opera'
            ? (_ifOpereCache.find(op => op.operaId === operaId)?.immagine || '')
            : document.getElementById('ifImmagine').value.trim();
        const body = {
            operaId,
            contentType,
            topic,
            museumId: museoIsil,
            authorId: SESSION.userId,
            objectId: objectIdVal || (baseForId.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()),
            toni,
            metadata,
            image:    imageVal,
            tags:     getTagInputValue('ifTags'),
            pubblica: isPubblicaItem,
        };

        try {
            const res  = isEdit
                ? await fetch(`/api/items/${item._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                })
                : await fetch('/api/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            const data = await res.json();
            if (data.ok) {
                showAlert(isEdit ? 'Item aggiornato con successo!' : 'Item creato con successo!');
                await initAutoreAggiungiItem();
            } else {
                showAlert('Errore: ' + (data.error || (isEdit ? 'Aggiornamento fallito.' : 'Creazione fallita.')));
            }
        } catch (err) {
            showAlert('Impossibile contattare il server.');
        }
    });
};

window.resetItemForm = function () {
    const f = document.getElementById('itemFormAutore');
    if (f) f.reset();
    const s = document.getElementById('ifOpera');
    if (s) s.innerHTML = '<option value="">— Prima seleziona un museo —</option>';
    const track  = document.getElementById('ifToggleTrack');
    const thumb  = document.getElementById('ifToggleThumb');
    const label  = document.getElementById('ifToggleLabel');
    const hidden = document.getElementById('ifPubblica');
    const row    = document.getElementById('ifPrezzoRow');
    if (track)  track.style.background = '#cbd5e1';
    if (thumb)  thumb.style.left = '3px';
    if (label)  { label.textContent = 'Privata'; label.style.color = '#64748b'; }
    if (hidden) hidden.value = 'false';
    if (row)    row.style.display = 'none';
};


async function ensureMuseiAutore() {
    if (allMuseiAutore.length) return;
    try {
        const r = await fetch('/api/musei');
        const d = await r.json();
        if (d.ok) allMuseiAutore = d.data;
    } catch (e) {  }
}

function populateMuseoSelect(id, musei) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">— Seleziona museo —</option>' +
        musei.map(m => `<option value="${m.codiceIsil}">${m.nome}</option>`).join('');
}
