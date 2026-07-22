let allMktItems  = [];
let allMktVisite = [];
let allMktMusei  = [];
let mktTab = 'items';
let _mktActiveTag = '';

function getMktPurchases() {
    let local;
    try {
        local = JSON.parse(localStorage.getItem('purchases_' + SESSION.userId) || '{"items":[],"visite":[]}');
    } catch { local = { items: [], visite: [] }; }


    const serverItemsIds = SESSION.userId
        ? allMktItems.filter(it => Array.isArray(it.acquirentiIds) && it.acquirentiIds.includes(SESSION.userId)).map(it => it._id)
        : [];
    const serverVisiteIds = SESSION.userId
        ? allMktVisite.filter(v => Array.isArray(v.acquirentiIds) && v.acquirentiIds.includes(SESSION.userId)).map(v => v._id)
        : [];

    return {
        items:  Array.from(new Set([...(local.items  || []), ...serverItemsIds])),
        visite: Array.from(new Set([...(local.visite || []), ...serverVisiteIds])),
    };
}

function saveMktPurchases(p) {
    localStorage.setItem('purchases_' + SESSION.userId, JSON.stringify(p));
}


async function getMktCart() {
    try {
        const res  = await fetch(`/api/carts/${SESSION.userId}`);
        const data = await res.json();
        if (data.ok) return { items: data.data.items || [], visite: data.data.visite || [] };
    } catch {}
    return { items: [], visite: [] };
}

async function saveMktCart(c) {
    try {
        await fetch(`/api/carts/${SESSION.userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c),
        });
    } catch {}
    await updateMktCartBadge();
}

async function updateMktCartBadge() {
    const badge = document.getElementById('mktCartBadge');
    if (!badge) return;
    const c = await getMktCart();
    const count = c.items.length + c.visite.length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

async function initMarketplace() {
    const section = document.getElementById('section-marketplace');
    mktTab = 'items';

    section.innerHTML = `
        <style>
            .mkt-range-input{position:absolute;width:100%;height:4px;top:11px;left:0;appearance:none;-webkit-appearance:none;background:transparent;pointer-events:none;outline:none;}
            .mkt-range-input::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#FF007F;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25);pointer-events:all;cursor:pointer;}
            .mkt-range-input::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#FF007F;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25);pointer-events:all;cursor:pointer;border:2px solid #fff;}
        </style>
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="page-title">Marketplace</h1>
                <p class="text-muted mb-0">Acquista visite e contenuti esclusivi dai nostri autori.</p>
            </div>
            <button class="btn-outline-custom" style="position:relative" onclick="switchSection('carrello')">
                <i class="fa-solid fa-cart-shopping me-1"></i> Carrello
                <span id="mktCartBadge" style="display:none;position:absolute;top:-8px;right:-8px;background:#FF007F;color:#fff;border-radius:50%;min-width:20px;height:20px;font-size:0.72rem;font-weight:700;align-items:center;justify-content:center;padding:0 4px;">0</span>
            </button>
        </div>

        <div class="glass-card p-4 mb-4">
            <div class="row g-3 align-items-end">
                <div class="col-md-3">
                    <label class="custom-label">Museo</label>
                    <select id="mktFilterMuseo" class="custom-input" onchange="onMktMuseoChange()">
                        <option value="">Tutti i musei</option>
                    </select>
                </div>
                <div class="col-md-2" id="mktOperaCol">
                    <label class="custom-label">Opera</label>
                    <select id="mktFilterOpera" class="custom-input" onchange="applyMktFilter()">
                        <option value="">Tutte le opere</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="custom-label">
                        Prezzo (€) &nbsp;—&nbsp;
                        <span id="mktRangeLabelMin" style="color:#FF007F;font-weight:600;">€0</span>
                        &nbsp;:&nbsp;
                        <span id="mktRangeLabelMax" style="color:#FF007F;font-weight:600;">∞</span>
                    </label>
                    <div style="position:relative;height:30px;margin-top:6px;">
                        <div style="position:absolute;left:0;right:0;top:13px;height:4px;background:#e2e8f0;border-radius:2px;">
                            <div id="mktRangeFill" style="position:absolute;height:100%;background:#FF007F;border-radius:2px;left:0%;right:0%;"></div>
                        </div>
                        <input type="range" id="mktRangeMin" class="mkt-range-input" min="0" max="200" value="0"  step="1" oninput="onMktRangeChange()">
                        <input type="range" id="mktRangeMax" class="mkt-range-input" min="0" max="200" value="200" step="1" oninput="onMktRangeChange()">
                    </div>
                </div>
                <div class="col-md-2" id="mktLinguaggioCol" style="display:none">
                    <label class="custom-label">Linguaggio</label>
                    <select id="mktFilterLinguaggio" class="custom-input" onchange="applyMktFilter()">
                        <option value="">Tutti</option>
                        <option value="semplice">Semplice</option>
                        <option value="infantile">Infantile</option>
                        <option value="medio">Medio</option>
                        <option value="specialistico">Specialistico</option>
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="custom-label">Cerca</label>
                    <input type="text" id="mktSearch" class="custom-input"
                           placeholder="Parola chiave…" oninput="_onMktSearchInput()">
                </div>
            </div>
            <div id="mktActiveTagRow" style="display:none;margin-top:12px;"></div>
        </div>

        <div class="detail-tabs mb-4">
            <button class="tab-btn active" id="mktTabItems"
                    onclick="setMktTab('items',this)">
                <i class="fa-solid fa-layer-group me-1"></i> Items
            </button>
            <button class="tab-btn" id="mktTabVisite"
                    onclick="setMktTab('visite',this)">
                <i class="fa-solid fa-route me-1"></i> Visite
            </button>
            <button class="tab-btn" id="mktTabAcquisti"
                    onclick="setMktTab('acquisti',this)">
                <i class="fa-solid fa-bag-shopping me-1"></i> I miei acquisti
            </button>
        </div>

        <div id="mktPopularCard"></div>

        <div id="mktContent" class="items-grid">
            <p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento…</p>
        </div>
    `;

    try {
        const [rItems, rVisite, rMusei] = await Promise.all([
            fetch('/api/items?pubblica=true'),
            fetch('/api/visite'),
            fetch('/api/musei'),
        ]);
        const [dItems, dVisite, dMusei] = await Promise.all([
            rItems.json(), rVisite.json(), rMusei.json(),
        ]);
        allMktItems  = dItems.ok  ? dItems.data : [];
        allMktVisite = dVisite.ok ? dVisite.data.filter(v => v.pubblica) : [];
        allMktMusei  = dMusei.ok  ? dMusei.data  : [];
    } catch (e) {
        document.getElementById('mktContent').innerHTML =
            '<p class="empty-msg">Errore nel caricamento dei dati.</p>';
        return;
    }

    const museoSel = document.getElementById('mktFilterMuseo');
    allMktMusei.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.codiceIsil;
        opt.textContent = m.nome;
        museoSel.appendChild(opt);
    });


    const allPrices = [
        ...allMktVisite.map(v => v.prezzo || 0),
        ...allMktItems.map(it => it.metadata?.prezzo || 0),
    ].filter(p => p > 0);
    const maxP = allPrices.length ? Math.ceil(Math.max(...allPrices)) : 200;
    const rMin = document.getElementById('mktRangeMin');
    const rMax = document.getElementById('mktRangeMax');
    if (rMin) { rMin.max = maxP; rMin.value = 0; }
    if (rMax) { rMax.max = maxP; rMax.value = maxP; }
    onMktRangeChange();

    _populateMktOpereSelect('');
    applyMktFilter();
    await updateMktCartBadge();
}

function _populateMktOpereSelect(codiceIsil) {
    const sel = document.getElementById('mktFilterOpera');
    if (!sel) return;
    const source = codiceIsil
        ? allMktItems.filter(it => it.museumId === codiceIsil)
        : allMktItems;
    const unique = [...new Set(source.map(it => it.operaId).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">Tutte le opere</option>' +
        unique.map(op => `<option value="${op}">${op}</option>`).join('');
}

window.onMktMuseoChange = function () {
    const val = document.getElementById('mktFilterMuseo')?.value || '';
    _populateMktOpereSelect(val);
    applyMktFilter();
};

window.onMktRangeChange = function () {
    const minEl = document.getElementById('mktRangeMin');
    const maxEl = document.getElementById('mktRangeMax');
    if (!minEl || !maxEl) return;
    let minVal = parseFloat(minEl.value);
    let maxVal = parseFloat(maxEl.value);
    const sliderMax = parseFloat(minEl.max);
    const sliderMin = parseFloat(minEl.min);

    if (minVal > maxVal) { minEl.value = maxVal; minVal = maxVal; }

    const pct = v => ((v - sliderMin) / (sliderMax - sliderMin)) * 100;
    const fill = document.getElementById('mktRangeFill');
    if (fill) {
        fill.style.left  = pct(minVal) + '%';
        fill.style.right = (100 - pct(maxVal)) + '%';
    }

    const lblMin = document.getElementById('mktRangeLabelMin');
    const lblMax = document.getElementById('mktRangeLabelMax');
    if (lblMin) lblMin.textContent = minVal > 0 ? '€' + minVal : '€0';
    if (lblMax) lblMax.textContent = maxVal >= sliderMax ? '∞' : '€' + maxVal;

    applyMktFilter();
};

window.setMktTab = function (tab, btn) {
    mktTab = tab;
    document.querySelectorAll('#section-marketplace .tab-btn')
        .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const operaCol = document.getElementById('mktOperaCol');
    const lingCol  = document.getElementById('mktLinguaggioCol');
    if (operaCol) operaCol.style.display = tab === 'items' ? '' : 'none';
    if (lingCol)  lingCol.style.display  = tab === 'visite' ? '' : 'none';

    applyMktFilter();
};

window.applyMktFilter = async function () {
    const museoVal  = document.getElementById('mktFilterMuseo')?.value  || '';
    const operaVal  = document.getElementById('mktFilterOpera')?.value  || '';
    const lingVal   = document.getElementById('mktFilterLinguaggio')?.value || '';
    const q         = (document.getElementById('mktSearch')?.value || '').trim().replace(/^#/, '').toLowerCase();

    const minEl = document.getElementById('mktRangeMin');
    const maxEl = document.getElementById('mktRangeMax');
    const prezzoMin = minEl ? parseFloat(minEl.value) : 0;
    const prezzoMax = maxEl ? parseFloat(maxEl.value) : NaN;
    const maxIsLimit = maxEl && parseFloat(maxEl.value) < parseFloat(maxEl.max);

    const content = document.getElementById('mktContent');
    if (!content) return;

    const purchases = getMktPurchases();

    const applyPriceFilter = (price) =>
        (prezzoMin <= 0 || price >= prezzoMin) && (!maxIsLimit || price <= prezzoMax);

    renderMktPopularCard(mktTab === 'visite' ? 'visite' : mktTab === 'items' ? 'items' : null);
    _renderMktActiveTagRow();

    if (mktTab === 'acquisti') {
        renderMktAcquisti(purchases, museoVal, applyPriceFilter, q);
        return;
    }

    if (mktTab === 'visite') {
        let lista = allMktVisite.filter(v => !purchases.visite.includes(v._id));
        if (museoVal) lista = lista.filter(v => v.codiceIsil === museoVal);
        lista = lista.filter(v => applyPriceFilter(v.prezzo || 0));
        if (_mktActiveTag) {
            lista = lista.filter(v => (v.tags || []).includes(_mktActiveTag));
        } else if (q) lista = lista.filter(v =>
            (v.nomeVisita || '').toLowerCase().includes(q) ||
            (v.logistica  || '').toLowerCase().includes(q) ||
            (v.tags || []).some(t => t.toLowerCase().includes(q)));
        lista = lista.slice().sort((a, b) => {
            const aOwn = SESSION.userId && a.autoreId === SESSION.userId;
            const bOwn = SESSION.userId && b.autoreId === SESSION.userId;
            return aOwn === bOwn ? 0 : (aOwn ? 1 : -1);
        });
        renderMktVisite(lista, purchases.visite, (await getMktCart()).visite);
    } else {
        let lista = allMktItems.filter(it => !purchases.items.includes(it._id));
        if (museoVal) lista = lista.filter(it => it.museumId === museoVal);
        if (operaVal) lista = lista.filter(it => it.operaId  === operaVal);
        lista = lista.filter(it => applyPriceFilter(it.metadata?.prezzo || 0));
        if (lingVal) lista = lista.filter(it => (it.metadata?.linguaggio || '') === lingVal);
        if (_mktActiveTag) {
            lista = lista.filter(it => (it.tags || []).includes(_mktActiveTag));
        } else if (q) lista = lista.filter(it => {
            const allText = [
                itemTitle(it),
                toneText(it.toni?.semplice),
                toneText(it.toni?.medio),
                toneText(it.toni?.avanzato),
                ...(it.tags || []),
            ].join(' ').toLowerCase();
            return allText.includes(q);
        });
        lista = lista.slice().sort((a, b) => {
            const aOwn = SESSION.userId && a.authorId === SESSION.userId;
            const bOwn = SESSION.userId && b.authorId === SESSION.userId;
            return aOwn === bOwn ? 0 : (aOwn ? 1 : -1);
        });
        renderMktItems(lista, purchases.items, (await getMktCart()).items);
    }
};

function renderMktPopularCard(tipo) {
    const container = document.getElementById('mktPopularCard');
    if (!container) return;
    if (!tipo) { container.innerHTML = ''; return; }

    const fonte = tipo === 'items' ? allMktItems : allMktVisite;
    const top3 = [...fonte]
        .filter(x => (x.acquirenti || 0) > 0)
        .sort((a, b) => (b.acquirenti || 0) - (a.acquirenti || 0))
        .slice(0, 3);

    if (!top3.length) { container.innerHTML = ''; return; }

    const medalColors = ['#f59e0b', '#94a3b8', '#cd7c3a'];

    container.innerHTML = `
        <div class="glass-card p-4 mb-4">
            <h3 class="scroll-section-label" style="margin-bottom:14px;">
                <i class="fa-solid fa-fire" style="color:#FF007F;"></i>
                ${tipo === 'items' ? 'I 3 items più popolari' : 'Le 3 visite più popolari'}
            </h3>
            <div style="display:flex;gap:16px;flex-wrap:wrap;">
                ${top3.map((x, i) => {
                    const nome   = tipo === 'items' ? itemTitle(x) : x.nomeVisita;
                    const prezzo = tipo === 'items' ? (x.metadata?.prezzo || 0) : (x.prezzo || 0);
                    const museo  = allMktMusei.find(m =>
                        m.codiceIsil === (tipo === 'items' ? x.museumId : x.codiceIsil));
                    return `
                    <div style="flex:1;min-width:200px;display:flex;gap:12px;align-items:center;
                                padding:12px 14px;border:1px solid #e2e8f0;border-radius:14px;">
                        <div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;
                                    background:${medalColors[i]}22;border:2px solid ${medalColors[i]};
                                    color:${medalColors[i]};display:flex;align-items:center;justify-content:center;
                                    font-weight:800;font-size:0.95rem;">
                            ${i + 1}
                        </div>
                        <div style="min-width:0;flex:1;">
                            <p style="margin:0;font-weight:700;font-size:0.9rem;white-space:nowrap;
                                       overflow:hidden;text-overflow:ellipsis;">${nome}</p>
                            ${museo ? `<p style="margin:0;font-size:0.76rem;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${museo.nome}</p>` : ''}
                            <p style="margin:2px 0 0;font-size:0.78rem;color:#64748b;">
                                <i class="fa-solid fa-users me-1"></i>${x.acquirenti} acquirenti
                                ${prezzo > 0 ? ` · €${prezzo}` : ' · Gratis'}
                            </p>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
}

function renderMktItems(lista, purchasedIds, cartIds = []) {
    const content = document.getElementById('mktContent');
    if (!lista.length) {
        content.className = '';
        content.innerHTML = '<p class="empty-msg">Nessun item trovato.</p>';
        return;
    }
    content.className = 'items-grid';
    content.innerHTML = lista.map(it => {
        const prezzo = it.metadata?.prezzo || 0;
        const bought = purchasedIds.includes(it._id);
        const inCart = cartIds.includes(it._id);
        const isMio  = SESSION.userId && it.authorId === SESSION.userId;
        const museo  = allMktMusei.find(m => m.codiceIsil === it.museumId);
        return `
        <div class="item-read-card">
            ${it.image ? `<img src="${it.image}" alt="item" onerror="this.style.display='none'">` : ''}
            <h3 style="font-weight:700;font-size:1rem;margin-bottom:4px;">${itemTitle(it)}</h3>
            <div style="margin-bottom:6px;">${itemTypeBadge(it)}</div>
            ${museo ? `<p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${museo.nome}</p>` : ''}
            ${tagChipsDisplayHtml(it.tags)}
            ${renderToni(it, 'mkt-' + it._id)}
            ${Object.keys(it.metadata || {}).filter(k => k !== 'prezzo').length ? `
            <ul class="item-metadata-list">
                ${Object.entries(it.metadata).filter(([k]) => k !== 'prezzo').map(([k, v]) =>
                    `<li><span class="meta-key">${k}:</span> ${v}</li>`
                ).join('')}
            </ul>` : ''}
            <div style="margin-top:auto;padding-top:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                ${prezzo > 0
                    ? `<span class="price-badge">€${prezzo}</span>`
                    : `<span class="free-badge">Gratis</span>`
                }
                ${isMio
                    ? `<span class="tag-bubble" style="background:rgba(255,0,127,0.08);color:var(--magenta,#FF007F);border-color:rgba(255,0,127,0.25);">
                           <i class="fa-solid fa-user"></i> La tua inserzione
                       </span>`
                    : bought
                        ? `<span class="tag-bubble" style="background:rgba(34,197,94,0.12);color:#16a34a;border-color:rgba(34,197,94,0.25);">
                               <i class="fa-solid fa-check"></i> Acquistato
                           </span>`
                        : inCart
                            ? `<button class="btn-outline-custom" style="padding:6px 14px;font-size:0.82rem;"
                                       onclick="rimuoviDalCarrello('items','${it._id}')">
                                   <i class="fa-solid fa-cart-arrow-down me-1"></i> Nel carrello — rimuovi
                               </button>`
                            : `<button class="btn-magenta" style="padding:6px 14px;font-size:0.82rem;"
                                       onclick="aggiungiAlCarrello('items','${it._id}')">
                                   <i class="fa-solid fa-cart-plus me-1"></i> Aggiungi al carrello
                               </button>`
                }
            </div>
        </div>`;
    }).join('');
}

function renderMktVisite(lista, purchasedIds, cartIds = []) {
    const content = document.getElementById('mktContent');
    if (!lista.length) {
        content.className = '';
        content.innerHTML = '<p class="empty-msg">Nessuna visita in vendita trovata.</p>';
        return;
    }
    content.className = 'items-grid';
    content.innerHTML = lista.map(v => {
        const bought = purchasedIds.includes(v._id);
        const inCart = cartIds.includes(v._id);
        const isMia  = SESSION.userId && v.autoreId === SESSION.userId;
        const museo  = allMktMusei.find(m => m.codiceIsil === v.codiceIsil);
        return `
        <div class="visita-read-card">
            <h3>${v.nomeVisita}</h3>
            ${museo ? `<p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${museo.nome}</p>` : ''}
            ${v.nomeMnemonico ? `<p class="opera-meta" style="font-size:0.8rem;color:#94a3b8;">${v.nomeMnemonico}</p>` : ''}
            ${v.logistica ? `<p style="font-size:0.88rem;color:#475569;margin-top:8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;">${v.logistica}</p>` : ''}
            ${tagChipsDisplayHtml(v.tags)}
            <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span class="tag-bubble"><i class="fa-solid fa-layer-group"></i> ${v.opereCount || 0} opere</span>
                <span class="tag-bubble"><i class="fa-solid fa-users"></i> ${v.acquirenti || 0} acquirenti</span>
                ${v.prezzo > 0
                    ? `<span class="price-badge">€${v.prezzo}</span>`
                    : `<span class="free-badge">Gratis</span>`
                }
            </div>
            <div style="margin-top:12px;">
                ${isMia
                    ? `<span class="tag-bubble" style="background:rgba(255,0,127,0.08);color:var(--magenta,#FF007F);border-color:rgba(255,0,127,0.25);">
                           <i class="fa-solid fa-user"></i> La tua inserzione
                       </span>`
                    : bought
                        ? `<span class="tag-bubble" style="background:rgba(34,197,94,0.12);color:#16a34a;border-color:rgba(34,197,94,0.25);">
                               <i class="fa-solid fa-check"></i> Acquistata
                           </span>`
                        : inCart
                            ? `<button class="btn-outline-custom" style="padding:6px 14px;font-size:0.82rem;"
                                       onclick="rimuoviDalCarrello('visite','${v._id}')">
                                   <i class="fa-solid fa-cart-arrow-down me-1"></i> Nel carrello — rimuovi
                               </button>`
                            : `<button class="btn-magenta" style="padding:6px 14px;font-size:0.82rem;"
                                       onclick="aggiungiAlCarrello('visite','${v._id}')">
                                   <i class="fa-solid fa-cart-plus me-1"></i> Aggiungi al carrello
                               </button>`
                }
            </div>
        </div>`;
    }).join('');
}

function renderMktAcquisti(purchases, museoVal, applyPriceFilter, q) {
    const content = document.getElementById('mktContent');
    let purchasedItems  = allMktItems.filter(it => purchases.items.includes(it._id));
    let purchasedVisite = allMktVisite.filter(v  => purchases.visite.includes(v._id));
    const hasAnyPurchase = purchasedItems.length > 0 || purchasedVisite.length > 0;

    if (museoVal) {
        purchasedItems  = purchasedItems.filter(it => it.museumId  === museoVal);
        purchasedVisite = purchasedVisite.filter(v  => v.codiceIsil === museoVal);
    }
    if (applyPriceFilter) {
        purchasedItems  = purchasedItems.filter(it => applyPriceFilter(it.metadata?.prezzo || 0));
        purchasedVisite = purchasedVisite.filter(v  => applyPriceFilter(v.prezzo || 0));
    }
    if (_mktActiveTag) {
        purchasedItems  = purchasedItems.filter(it => (it.tags || []).includes(_mktActiveTag));
        purchasedVisite = purchasedVisite.filter(v  => (v.tags  || []).includes(_mktActiveTag));
    } else if (q) {
        purchasedItems = purchasedItems.filter(it => {
            const allText = [
                itemTitle(it),
                toneText(it.toni?.semplice),
                toneText(it.toni?.medio),
                toneText(it.toni?.avanzato),
                ...(it.tags || []),
            ].join(' ').toLowerCase();
            return allText.includes(q);
        });
        purchasedVisite = purchasedVisite.filter(v =>
            (v.nomeVisita || '').toLowerCase().includes(q) ||
            (v.logistica  || '').toLowerCase().includes(q) ||
            (v.tags || []).some(t => t.toLowerCase().includes(q)));
    }

    if (!purchasedItems.length && !purchasedVisite.length) {
        content.className = '';
        content.innerHTML = hasAnyPurchase ? `
            <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
                <i class="fa-solid fa-bag-shopping" style="font-size:3rem;margin-bottom:16px;display:block;"></i>
                <p>Nessun acquisto corrisponde ai filtri selezionati.</p>
            </div>` : `
            <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
                <i class="fa-solid fa-bag-shopping" style="font-size:3rem;margin-bottom:16px;display:block;"></i>
                <p>Non hai ancora acquistato nulla.</p>
                <p style="font-size:0.88rem;">Esplora le tab Items e Visite per trovare contenuti.</p>
            </div>`;
        return;
    }

    content.className = '';
    let html = '';

    if (purchasedItems.length) {
        html += `<h3 class="scroll-section-label">Items acquistati</h3>
                 <div class="items-grid" style="margin-bottom:32px;">`;
        html += purchasedItems.map(it => {
            const prezzo = it.metadata?.prezzo || 0;
            const museo  = allMktMusei.find(m => m.codiceIsil === it.museumId);
            return `
            <div class="item-read-card">
                ${it.image ? `<img src="${it.image}" alt="item" onerror="this.style.display='none'">` : ''}
                <h3 style="font-weight:700;font-size:1rem;margin-bottom:4px;">${itemTitle(it)}</h3>
                <div style="margin-bottom:6px;">${itemTypeBadge(it)}</div>
                ${museo ? `<p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${museo.nome}</p>` : ''}
                ${tagChipsDisplayHtml(it.tags)}
                ${renderToni(it, 'acq-' + it._id)}
                ${Object.keys(it.metadata || {}).filter(k => k !== 'prezzo').length ? `
                <ul class="item-metadata-list">
                    ${Object.entries(it.metadata).filter(([k]) => k !== 'prezzo').map(([k, v]) =>
                        `<li><span class="meta-key">${k}:</span> ${v}</li>`
                    ).join('')}
                </ul>` : ''}
                <div style="margin-top:auto;padding-top:12px;">
                    <span class="tag-bubble" style="background:rgba(34,197,94,0.12);color:#16a34a;border-color:rgba(34,197,94,0.25);">
                        <i class="fa-solid fa-check"></i> Acquistato${prezzo > 0 ? ` — €${prezzo}` : ' (gratis)'}
                    </span>
                </div>
            </div>`;
        }).join('');
        html += '</div>';
    }

    if (purchasedVisite.length) {
        html += `<h3 class="scroll-section-label" style="margin-top:${purchasedItems.length ? '32px' : '0'};">Visite acquistate</h3>
                 <div class="items-grid">`;
        html += purchasedVisite.map(v => {
            const museo = allMktMusei.find(m => m.codiceIsil === v.codiceIsil);
            return `
            <div class="visita-read-card">
                <h3>${v.nomeVisita}</h3>
                ${museo ? `<p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${museo.nome}</p>` : ''}
                ${v.logistica ? `<p style="font-size:0.88rem;color:#475569;margin-top:8px;">${v.logistica}</p>` : ''}
                ${tagChipsDisplayHtml(v.tags)}
                <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="tag-bubble"><i class="fa-solid fa-layer-group"></i> ${v.opereCount || 0} opere</span>
                    ${v.prezzo > 0
                        ? `<span class="price-badge">€${v.prezzo}</span>`
                        : `<span class="free-badge">Gratis</span>`
                    }
                </div>
                <div style="margin-top:12px;">
                    <span class="tag-bubble" style="background:rgba(34,197,94,0.12);color:#16a34a;border-color:rgba(34,197,94,0.25);">
                        <i class="fa-solid fa-check"></i> Acquistata${v.prezzo > 0 ? ` — €${v.prezzo}` : ' (gratis)'}
                    </span>
                </div>
            </div>`;
        }).join('');
        html += '</div>';
    }

    content.innerHTML = html;
}


async function finalizzaAcquistoItem(id) {
    const item = allMktItems.find(it => it._id === id);
    if (item?.acquirentiIds?.includes(SESSION.userId)) return true;

    try {
        const res  = await fetch(`/api/items/${id}/acquista`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: SESSION.userId }),
        });
        const data = await res.json();
        if (data.ok) {
            if (item) {
                item.acquirentiIds = data.data.acquirentiIds;
                item.acquirenti    = data.data.acquirenti;
            }
            const p = getMktPurchases();
            if (!p.items.includes(id)) { p.items.push(id); saveMktPurchases(p); }
            return true;
        }
    } catch (e) {  }

    return false;
}

window.aggiungiAlCarrello = async function (tipo, id) {
    const c = await getMktCart();
    if (!c[tipo].includes(id)) c[tipo].push(id);
    await saveMktCart(c);
    applyMktFilter();
};

window.rimuoviDalCarrello = async function (tipo, id) {
    const c = await getMktCart();
    c[tipo] = c[tipo].filter(x => x !== id);
    await saveMktCart(c);
    if (document.getElementById('section-carrello')?.style.display !== 'none') initCarrello();
    applyMktFilter();
};

async function initCarrello() {
    const section = document.getElementById('section-carrello');
    if (!section) return;

    if (!allMktItems.length && !allMktVisite.length) {
        try {
            const [rItems, rVisite, rMusei] = await Promise.all([
                fetch('/api/items?pubblica=true'),
                fetch('/api/visite'),
                fetch('/api/musei'),
            ]);
            const [dItems, dVisite, dMusei] = await Promise.all([
                rItems.json(), rVisite.json(), rMusei.json(),
            ]);
            allMktItems  = dItems.ok  ? dItems.data : [];
            allMktVisite = dVisite.ok ? dVisite.data.filter(v => v.pubblica) : [];
            allMktMusei  = dMusei.ok  ? dMusei.data  : [];
        } catch (_) {  }
    }

    const cart = await getMktCart();
    const cartItems  = allMktItems.filter(it => cart.items.includes(it._id));
    const cartVisite = allMktVisite.filter(v  => cart.visite.includes(v._id));
    const totale = cartItems.reduce((s, it) => s + (it.metadata?.prezzo || 0), 0)
                 + cartVisite.reduce((s, v)  => s + (v.prezzo || 0), 0);

    section.innerHTML = `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="page-title">Carrello</h1>
                <p class="text-muted mb-0">Rivedi gli articoli scelti prima di procedere all'acquisto.</p>
            </div>
            <button class="btn-outline-custom" onclick="switchSection('marketplace')">
                <i class="fa-solid fa-arrow-left me-1"></i> Torna al Marketplace
            </button>
        </div>
        <div id="carrelloScroll" class="carrello-scroll"></div>
        <div id="carrelloFooter"></div>
    `;

    const content = document.getElementById('carrelloScroll');
    const footer  = document.getElementById('carrelloFooter');

    if (!cartItems.length && !cartVisite.length) {
        content.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
                <i class="fa-solid fa-cart-shopping" style="font-size:3rem;margin-bottom:16px;display:block;"></i>
                <p>Il carrello è vuoto.</p>
                <p style="font-size:0.88rem;">Aggiungi items o visite dal Marketplace per vederli qui.</p>
            </div>`;
        return;
    }

    let html = '';

    if (cartItems.length) {
        html += `<h3 class="scroll-section-label">Items</h3><div class="items-grid" style="margin-bottom:32px;">`;
        html += cartItems.map(it => {
            const prezzo = it.metadata?.prezzo || 0;
            const museo  = allMktMusei.find(m => m.codiceIsil === it.museumId);
            return `
            <div class="item-read-card">
                ${it.image ? `<img src="${it.image}" alt="item" onerror="this.style.display='none'">` : ''}
                <h3 class="carrello-item-title">${itemTitle(it)}</h3>
                ${museo ? `<p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${museo.nome}</p>` : ''}
                <div style="margin-top:auto;padding-top:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    ${prezzo > 0 ? `<span class="price-badge">€${prezzo}</span>` : `<span class="free-badge">Gratis</span>`}
                    <button class="btn-outline-custom" style="padding:6px 14px;font-size:0.82rem;"
                            onclick="rimuoviDalCarrello('items','${it._id}')">
                        <i class="fa-solid fa-trash me-1"></i> Rimuovi
                    </button>
                </div>
            </div>`;
        }).join('');
        html += '</div>';
    }

    if (cartVisite.length) {
        html += `<h3 class="scroll-section-label">Visite</h3><div class="items-grid" style="margin-bottom:24px;">`;
        html += cartVisite.map(v => {
            const museo = allMktMusei.find(m => m.codiceIsil === v.codiceIsil);
            return `
            <div class="visita-read-card">
                <h3>${v.nomeVisita}</h3>
                ${museo ? `<p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${museo.nome}</p>` : ''}
                <div style="margin-top:10px;">
                    ${v.prezzo > 0 ? `<span class="price-badge">€${v.prezzo}</span>` : `<span class="free-badge">Gratis</span>`}
                </div>
                <div style="margin-top:12px;">
                    <button class="btn-outline-custom" style="padding:6px 14px;font-size:0.82rem;"
                            onclick="rimuoviDalCarrello('visite','${v._id}')">
                        <i class="fa-solid fa-trash me-1"></i> Rimuovi
                    </button>
                </div>
            </div>`;
        }).join('');
        html += '</div>';
    }

    content.innerHTML = html;

    footer.innerHTML = `
        <div class="glass-card p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
                <span class="kpi-label">TOTALE</span>
                <h2 class="text-magenta fw-900 mb-0">€${totale}</h2>
            </div>
            <div class="d-flex gap-2">
                <button class="btn-outline-custom" onclick="svuotaCarrello()">
                    <i class="fa-solid fa-trash me-1"></i> Svuota carrello
                </button>
                <button class="btn-magenta" onclick="checkoutCarrello()">
                    <i class="fa-solid fa-check me-1"></i> Procedi all'acquisto
                </button>
            </div>
        </div>`;
}

window.svuotaCarrello = async function () {
    if (!(await showConfirm('Svuotare il carrello?', { type: 'warning', okText: 'Svuota' }))) return;
    await saveMktCart({ items: [], visite: [] });
    initCarrello();
};

window.checkoutCarrello = async function () {
    const cart = await getMktCart();
    if (!cart.items.length && !cart.visite.length) return;
    if (!(await showConfirm('Confermi l\'acquisto di tutti gli articoli nel carrello?'))) return;

    const totale = allMktItems.filter(it => cart.items.includes(it._id))
        .reduce((s, it) => s + (it.metadata?.prezzo || 0), 0)
        + allMktVisite.filter(v => cart.visite.includes(v._id))
        .reduce((s, v) => s + (v.prezzo || 0), 0);

    const itemsFalliti  = [];
    const visiteFallite = [];
    for (const id of cart.items) {
        if (!(await finalizzaAcquistoItem(id))) itemsFalliti.push(id);
    }
    for (const id of cart.visite) {
        if (!(await finalizzaAcquistoVisita(id))) visiteFallite.push(id);
    }


    await saveMktCart({ items: itemsFalliti, visite: visiteFallite });

    if (itemsFalliti.length || visiteFallite.length) {
        showAlert('Alcuni articoli non sono stati acquistati per un problema di connessione al server. Sono rimasti nel carrello: riprova.');
        initCarrello();
        return;
    }

    mostraModaleAcquistoConfermato(
        totale > 0
            ? `Il totale di <strong>€${totale}</strong> sarà da saldare direttamente presso il museo, al momento della visita.`
            : 'I contenuti selezionati sono ora disponibili tra i tuoi acquisti.'
    );
};

function mostraModaleAcquistoConfermato(messaggioHtml) {
    document.getElementById('mktSuccessOverlay')?.remove();

    const goToAcquisti = () => {
        document.getElementById('mktSuccessOverlay')?.remove();
        switchSection('marketplace');
        setTimeout(() => {
            const btn = document.getElementById('mktTabAcquisti');
            if (btn) setMktTab('acquisti', btn);
        }, 0);
    };
    window._mktGoToAcquisti = goToAcquisti;

    const overlay = document.createElement('div');
    overlay.id = 'mktSuccessOverlay';
    overlay.className = 'ui-modal-backdrop';
    overlay.innerHTML = `
        <div class="ui-modal-box" role="alertdialog" aria-modal="true">
            <div class="ui-modal-icon success"><i class="fa-solid fa-circle-check"></i></div>
            <div class="ui-modal-title">Fantastico! Acquisto finalizzato.</div>
            <div class="ui-modal-msg">${messaggioHtml}</div>
            <div class="ui-modal-actions">
                <button type="button" class="ui-modal-btn ui-modal-btn-primary" onclick="window._mktGoToAcquisti()">
                    Vai ai miei acquisti
                </button>
            </div>
        </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) goToAcquisti(); });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
}
