async function initVisitatoreMusei() {
    const section = document.getElementById('section-visitatore-musei');
    section.innerHTML = `
        <div class="section-header-inline mb-3">
            <h1 class="page-title">Musei</h1>
            <p class="text-muted mb-0">Esplora i musei disponibili sulla piattaforma.</p>
        </div>
        <div class="glass-card p-3 mb-4 d-flex gap-2 align-items-center flex-wrap">
            <select id="filterVisMuseiCitta" class="custom-input"
                    style="min-width:150px;padding:6px 14px;height:42px;"
                    onchange="filterVisMusei()">
                <option value="">Tutte le città</option>
            </select>
            <div class="search-box-container shadow-sm py-1 px-3" style="max-width:280px;">
                <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                <input type="text" id="searchVisMusei" class="search-input py-2"
                       placeholder="Cerca…" oninput="filterVisMusei()">
            </div>
        </div>
        <div id="visMuseiGrid" class="items-grid">
            <p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento…</p>
        </div>
    `;

    try {
        const res  = await fetch('/api/musei');
        const data = await res.json();
        allVisitatoreCachedMusei = data.ok ? data.data : [];
        const citta = [...new Set(allVisitatoreCachedMusei.map(m => m.citta).filter(Boolean))].sort();
        const sel = document.getElementById('filterVisMuseiCitta');
        if (sel) sel.innerHTML = '<option value="">Tutte le città</option>' +
            citta.map(c => `<option value="${c}">${c}</option>`).join('');
        renderVisMusei(allVisitatoreCachedMusei);
    } catch (e) {
        document.getElementById('visMuseiGrid').innerHTML = '<p class="empty-msg">Errore nel caricamento dei musei.</p>';
    }
}

function filterVisMusei() {
    const q     = (document.getElementById('searchVisMusei')?.value      || '').toLowerCase();
    const citta =  document.getElementById('filterVisMuseiCitta')?.value || '';
    let filtered = allVisitatoreCachedMusei;
    if (q)     filtered = filtered.filter(m => m.nome.toLowerCase().includes(q) || m.citta.toLowerCase().includes(q));
    if (citta) filtered = filtered.filter(m => m.citta === citta);
    renderVisMusei(filtered);
}

function renderVisMusei(lista) {
    const grid = document.getElementById('visMuseiGrid');
    if (!grid) return;
    if (!lista.length) {
        grid.className = '';
        grid.innerHTML = '<p class="empty-msg">Nessun museo trovato.</p>';
        return;
    }
    grid.className = 'items-grid';
    grid.innerHTML = lista.map(m => `
        <div class="item-card museo-card scroll-card-clickable"
             style="height:340px;"
             onclick="showVisMuseoDetail('${m.codiceIsil}')">
            <div style="position:relative;flex-shrink:0;height:200px;">
                ${m.immagineCopertina
                    ? `<img class="museo-card-img" src="${m.immagineCopertina}" alt="${m.nome}"
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
            <div style="display:flex;flex-direction:column;padding:14px 16px 16px;flex:1;overflow:hidden;">
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

window.showVisMuseoDetail = function (codiceIsil) {
    const museo = allVisitatoreCachedMusei.find(m => m.codiceIsil === codiceIsil);
    if (!museo) return;
    currentViewMuseo = museo;

    const section = document.getElementById('section-visitatore-musei');
    section.innerHTML = `
        <button class="museo-detail-back" onclick="initVisitatoreMusei()">
            <i class="fa-solid fa-arrow-left"></i> Torna ai musei
        </button>
        <h2 class="museo-detail-title">${museo.nome}</h2>
        <p class="museo-detail-sub">${museo.citta}${museo.indirizzo ? ' · ' + museo.indirizzo : ''}</p>
        ${mapActionsHtml(museo)}
        <div class="glass-card p-4" style="margin-top:24px;">
            ${museo.immagineCopertina
                ? `<img src="${museo.immagineCopertina}" alt="${museo.nome}"
                       style="width:100%;max-height:320px;object-fit:cover;border-radius:12px;margin-bottom:20px;"
                       onerror="this.style.display='none'">`
                : ''
            }
            <div class="row g-3">
                <div class="col-md-6">
                    <p class="custom-label">Città</p>
                    <p>${museo.citta || '—'}</p>
                </div>
                ${museo.indirizzo ? `
                <div class="col-md-6">
                    <p class="custom-label">Indirizzo</p>
                    <p>${museo.indirizzo}</p>
                </div>` : ''}
                <div class="col-md-6">
                    <p class="custom-label">Codice ISIL</p>
                    <p><span class="tag-bubble"><i class="fa-solid fa-barcode"></i> ${museo.codiceIsil}</span></p>
                </div>
                ${museo.descrizioneBreve ? `
                <div class="col-12">
                    <p class="custom-label">Descrizione</p>
                    <p>${museo.descrizioneBreve}</p>
                </div>` : ''}
            </div>
        </div>
    `;
};


async function initVisitatoreOpere() {
    const section = document.getElementById('section-visitatore-opere');
    section.innerHTML = `
        <div class="section-header-inline mb-3">
            <h1 class="page-title">Opere</h1>
            <p class="text-muted mb-0">Sfoglia le opere presenti nei musei.</p>
        </div>
        <div class="glass-card p-3 mb-4 d-flex gap-3 align-items-center flex-wrap">
            <select id="filterOpereMuseo" class="custom-input" style="min-width:200px;padding:6px 12px;">
                <option value="">Tutti i musei</option>
            </select>
            <div class="search-box-container shadow-sm py-1 px-3" style="max-width:260px;">
                <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                <input type="text" id="searchVisOpere" class="search-input py-2" placeholder="Cerca opera…">
            </div>
        </div>
        <div id="visOpereGrid" class="items-grid">
            <p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento…</p>
        </div>
    `;

    await ensureVisMusei();

    const filterSel = document.getElementById('filterOpereMuseo');
    filterSel.innerHTML = '<option value="">Tutti i musei</option>' +
        allVisitatoreCachedMusei.map(m => `<option value="${m.codiceIsil}">${m.nome}</option>`).join('');

    await loadVisOpere('');

    filterSel.addEventListener('change', () => loadVisOpere(filterSel.value));
    document.getElementById('searchVisOpere').addEventListener('input', function () {
        filterVisOpere(this.value);
    });
}

async function loadVisOpere(codiceIsil) {
    const grid = document.getElementById('visOpereGrid');
    if (!grid) return;
    grid.className = '';
    grid.innerHTML = '<p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento…</p>';

    const url = codiceIsil
        ? `/api/opere?codiceIsil=${encodeURIComponent(codiceIsil)}`
        : '/api/opere';

    try {
        const res  = await fetch(url);
        const data = await res.json();
        currentVisitatoreOpere = data.ok ? data.data : [];
        renderVisOpere(currentVisitatoreOpere);
    } catch (e) {
        grid.innerHTML = '<p class="empty-msg">Errore nel caricamento delle opere.</p>';
    }
}

function filterVisOpere(q) {
    const filtered = q
        ? currentVisitatoreOpere.filter(op =>
            (op.operaId || '').toLowerCase().includes(q.toLowerCase()) ||
            (op.autore  || '').toLowerCase().includes(q.toLowerCase()))
        : currentVisitatoreOpere;
    renderVisOpere(filtered);
}

function renderVisOpere(lista) {
    const grid = document.getElementById('visOpereGrid');
    if (!grid) return;
    if (!lista.length) {
        grid.className = '';
        grid.innerHTML = '<p class="empty-msg">Nessuna opera trovata.</p>';
        return;
    }
    grid.className = 'items-grid';
    grid.innerHTML = lista.map(op => {
        const idx       = currentVisitatoreOpere.indexOf(op);
        const museoNome = (allVisitatoreCachedMusei || []).find(m => m.codiceIsil === op.codiceIsil)?.nome || op.codiceIsil;
        return `
        <div class="opera-read-card scroll-card-clickable" onclick="showVisOperaDetail(${idx})">
            ${op.immagine
                ? `<img src="${op.immagine}" alt="${op.operaId}" onerror="this.style.display='none'">`
                : ''}
            <h3>${op.operaId}</h3>
            ${op.autore    ? `<p class="opera-meta"><i class="fa-solid fa-palette"></i> ${op.autore}</p>` : ''}
            ${op.datazione ? `<p class="opera-meta"><i class="fa-solid fa-calendar"></i> ${op.datazione}</p>` : ''}
            <p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${museoNome}</p>
            ${op.sala      ? `<p class="opera-meta"><i class="fa-solid fa-location-dot"></i> ${op.sala}</p>` : ''}
        </div>`;
    }).join('');
}

window.showVisOperaDetail = async function (idx) {
    const opera = currentVisitatoreOpere[idx];
    if (!opera) return;

    const section = document.getElementById('section-visitatore-opere');
    const dims = [
        opera.altezza    ? opera.altezza    + ' cm H' : '',
        opera.larghezza  ? opera.larghezza  + ' cm W' : '',
        opera.profondita ? opera.profondita + ' cm D' : '',
    ].filter(Boolean).join(' × ');

    section.innerHTML = `
        <button class="museo-detail-back" onclick="initVisitatoreOpere()">
            <i class="fa-solid fa-arrow-left"></i> Torna alle opere
        </button>
        <h2 class="museo-detail-title">${opera.operaId}</h2>
        <p class="museo-detail-sub">
            ${opera.autore    ? opera.autore    + ' · ' : ''}
            ${opera.tipo      ? opera.tipo      + ' · ' : ''}
            ${opera.datazione ? opera.datazione          : ''}
        </p>
        <div class="glass-card p-4" style="margin-top:24px;">
            ${opera.immagine
                ? `<img src="${opera.immagine}" alt="${opera.operaId}"
                       style="width:100%;max-height:320px;object-fit:cover;border-radius:12px;margin-bottom:20px;"
                       onerror="this.style.display='none'">`
                : ''}
            <div class="row g-3">
                ${opera.sala ? `
                <div class="col-12">
                    <p class="custom-label">Sala</p>
                    <p><span class="tag-bubble"><i class="fa-solid fa-location-dot"></i> ${opera.sala}</span></p>
                </div>` : ''}
                ${opera.descrizione ? `
                <div class="col-12">
                    <p class="custom-label">Descrizione</p>
                    <p>${opera.descrizione}</p>
                </div>` : ''}
                ${opera.testo ? `
                <div class="col-12">
                    <p class="custom-label">Testo Audioguida</p>
                    <p style="white-space:pre-line;">${opera.testo}</p>
                </div>` : ''}
                ${opera.linguaggio ? `
                <div class="col-md-4">
                    <p class="custom-label">Linguaggio</p>
                    <span class="tag-bubble">${opera.linguaggio}</span>
                </div>` : ''}
                ${opera.lunghezza ? `
                <div class="col-md-4">
                    <p class="custom-label">Durata</p>
                    <span class="tag-bubble">${opera.lunghezza}</span>
                </div>` : ''}
                ${opera.licenza ? `
                <div class="col-md-4">
                    <p class="custom-label">Licenza</p>
                    <span class="tag-bubble">${opera.licenza}</span>
                </div>` : ''}
                ${opera.tecnica ? `
                <div class="col-md-6">
                    <p class="custom-label">Tecnica</p>
                    <p>${opera.tecnica}</p>
                </div>` : ''}
                ${opera.materiali ? `
                <div class="col-md-6">
                    <p class="custom-label">Materiali</p>
                    <p>${opera.materiali}</p>
                </div>` : ''}
                ${dims ? `
                <div class="col-12">
                    <p class="custom-label">Dimensioni</p>
                    <p>${dims}</p>
                </div>` : ''}
            </div>
        </div>
        <h3 class="scroll-section-label" style="margin-top:32px;">Items associati</h3>
        <div id="visOperaItemsGrid" class="items-grid" style="margin-top:12px;">
            <p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento items…</p>
        </div>
    `;

    const grid = document.getElementById('visOperaItemsGrid');
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


async function ensureVisMusei() {
    if (allVisitatoreCachedMusei.length) return;
    try {
        const r = await fetch('/api/musei');
        const d = await r.json();
        if (d.ok) allVisitatoreCachedMusei = d.data;
    } catch (e) {  }
}
