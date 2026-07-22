async function loadMuseiCuratore() {
    try {
        const res  = await fetch(`/api/musei?curatoreId=${encodeURIComponent(SESSION.userId)}`);
        const data = await res.json();
        if (data.ok) curMusei = data.data;
    } catch (e) {
        console.error('Errore caricamento musei:', e);
    }
}


function filterMuseiDash() {
    const q     = (document.getElementById('searchMuseiDash')?.value         || '').toLowerCase();
    const citta =  document.getElementById('filterCuratoreMuseiCitta')?.value || '';
    let filtered = curMusei;
    if (q)     filtered = filtered.filter(m => m.nome.toLowerCase().includes(q) || m.citta.toLowerCase().includes(q));
    if (citta) filtered = filtered.filter(m => m.citta === citta);
    renderMusei(filtered);
}

function _populateCuratoreMuseiCittaFilter() {
    const sel = document.getElementById('filterCuratoreMuseiCitta');
    if (!sel) return;
    const citta = [...new Set(curMusei.map(m => m.citta).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">Tutte le città</option>' +
        citta.map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderMusei(lista) {
    if (!lista) lista = curMusei;

    const listHeader = document.getElementById('museiListHeader');
    if (listHeader)  { listHeader.style.display = ''; listHeader.classList.add('d-flex'); }

    const view = document.getElementById('museiView');

    if (!lista.length) {
        view.className = '';
        view.innerHTML = '<p class="empty-msg">Nessun museo assegnato. Aggiungine uno dalla sezione "Aggiungi Museo".</p>';
        return;
    }

    view.className = 'items-grid';
    view.innerHTML = lista.map(m => `
        <div class="item-card museo-card" style="cursor:pointer"
             onclick="showMuseoDetail('${m.codiceIsil}')">
            ${m.immagineCopertina
                ? `<img class="museo-card-img" src="${m.immagineCopertina}" alt="${m.nome}"
                       onerror="this.style.display='none'">`
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


window.showMuseoDetail = async function (codiceIsil) {
    const museo = curMusei.find(m => m.codiceIsil === codiceIsil);
    if (!museo) return;
    currentViewMuseo = museo;

    const listHeader = document.getElementById('museiListHeader');
    if (listHeader)  { listHeader.classList.remove('d-flex'); listHeader.style.display = 'none'; }

    sessionStorage.setItem('curatorMuseo', codiceIsil);

    const view = document.getElementById('museiView');
    view.className = '';
    view.innerHTML = `
        <button class="museo-detail-back" onclick="goBackToMusei()">
            <i class="fa-solid fa-arrow-left"></i> Torna ai musei
        </button>
        <h2 class="museo-detail-title">${museo.nome}</h2>
        <p class="museo-detail-sub">${museo.citta} · ${museo.codiceIsil}</p>
        ${mapActionsHtml(museo)}
        <div class="search-box-container shadow-sm py-1 px-3 mt-3" id="opereSearchInViewWrap" style="max-width:320px;">
            <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
            <input type="text" id="opereSearchInView" class="search-input py-2"
                   placeholder="Cerca opere..." oninput="filterOpereMuseo()">
        </div>
        <div class="detail-tabs mt-3">
            <button class="tab-btn active"
                    onclick="showTab('opere','${codiceIsil}',this)">Opere</button>
            <button class="tab-btn"
                    onclick="showTab('visite','${codiceIsil}',this)">Visite in vendita</button>
        </div>
        <div class="detail-scroll-box">
            <div id="detailContent" class="items-grid"></div>
        </div>
    `;

    showTab('opere', codiceIsil, view.querySelector('.tab-btn.active'));
};

function _renderOpereDetail(lista) {
    const content    = document.getElementById('detailContent');
    const codiceIsil = currentViewMuseo?.codiceIsil || '';
    if (!lista.length) {
        content.className = '';
        content.innerHTML = '<p class="empty-msg">Nessuna opera trovata.</p>';
        return;
    }
    content.className = 'items-grid';
    content.innerHTML = lista.map(op => {
        const idx = currentMuseoOpere.indexOf(op);
        return `
            <div class="opera-read-card scroll-card-clickable"
                 onclick="showOperaItems(${idx}, '${codiceIsil}')">
                ${op.immagine ? `<img src="${op.immagine}" alt="${op.operaId}" onerror="this.style.display='none'">` : ''}
                <h3>${op.operaId}</h3>
                ${op.autore    ? `<p class="opera-meta"><i class="fa-solid fa-palette"></i> ${op.autore}</p>` : ''}
                ${op.datazione ? `<p class="opera-meta"><i class="fa-solid fa-calendar"></i> ${op.datazione}</p>` : ''}
                <p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${currentViewMuseo?.nome || codiceIsil}</p>
                ${op.sala ? `<p class="opera-meta"><i class="fa-solid fa-location-dot"></i> ${op.sala}</p>` : ''}
            </div>`;
    }).join('');
}

function _renderVisiteDetail(lista) {
    const content = document.getElementById('detailContent');
    if (!lista.length) {
        content.className = '';
        content.innerHTML = '<p class="empty-msg">Nessuna visita trovata.</p>';
        return;
    }
    content.className = 'items-grid';
    content.innerHTML = lista.map(v => `
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
                <span class="tag-bubble"
                      style="background:rgba(34,197,94,0.12);color:#16a34a;border-color:rgba(34,197,94,0.25);">
                    <i class="fa-solid fa-check"></i> In vendita
                </span>
            </div>
        </div>
    `).join('');
}

window.showTab = async function (type, codiceIsil, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDetailTab = type;

    const searchInput = document.getElementById('opereSearchInView');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = type === 'opere' ? 'Cerca opere...' : 'Cerca visite...';
    }

    const content = document.getElementById('detailContent');
    content.className = '';
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
            currentMuseoOpere = data.data;
            _renderOpereDetail(currentMuseoOpere);
        } else {
            currentMuseoVisite = data.data.filter(v => v.pubblica);
            _renderVisiteDetail(currentMuseoVisite);
        }
    } catch (e) {
        content.innerHTML = '<p class="empty-msg">Errore nel caricamento dei dati.</p>';
    }
};

window.filterOpereMuseo = function () {
    const q = (document.getElementById('opereSearchInView')?.value || '').toLowerCase();
    if (currentDetailTab === 'visite') {
        const filtered = q
            ? currentMuseoVisite.filter(v =>
                (v.nomeVisita || '').toLowerCase().includes(q) ||
                (v.logistica  || '').toLowerCase().includes(q))
            : currentMuseoVisite;
        _renderVisiteDetail(filtered);
    } else {
        const filtered = q
            ? currentMuseoOpere.filter(op =>
                (op.operaId || '').toLowerCase().includes(q) ||
                (op.autore  || '').toLowerCase().includes(q))
            : currentMuseoOpere;
        _renderOpereDetail(filtered);
    }
};

window.goBackToMusei = function () {
    sessionStorage.removeItem('curatorMuseo');
    renderMusei();
};


window.showOperaItems = async function (idx, codiceIsil) {
    const opera = currentMuseoOpere[idx];
    if (!opera) return;

    const view = document.getElementById('museiView');
    view.className = '';
    view.innerHTML = `
        <button class="museo-detail-back" onclick="showMuseoDetail('${codiceIsil}')">
            <i class="fa-solid fa-arrow-left"></i> Torna al museo
        </button>
        <h2 class="museo-detail-title">${opera.operaId}</h2>
        <p class="museo-detail-sub">
            ${opera.autore    ? opera.autore    + ' · ' : ''}
            ${opera.tipo      ? opera.tipo      + ' · ' : ''}
            ${opera.datazione ? opera.datazione         : ''}
        </p>
        ${opera.sala ? `<p class="opera-meta" style="margin-top:6px;"><i class="fa-solid fa-location-dot"></i> ${opera.sala}</p>` : ''}
        ${opera.descrizione ? `
        <div class="glass-card p-4" style="margin-top:20px;">
            <p class="custom-label">Descrizione</p>
            <p style="line-height:1.7;">${opera.descrizione}</p>
        </div>` : ''}
        <h3 class="scroll-section-label" style="margin-top:28px;">
            Items in vendita associati
        </h3>
        <div id="operaItemsGrid" style="margin-top:12px;"></div>
    `;

    const grid = document.getElementById('operaItemsGrid');
    try {
        const res  = await fetch(`/api/items?operaId=${encodeURIComponent(opera.operaId)}`);
        const data = await res.json();

        if (!data.ok || !data.data.length) {
            grid.innerHTML = '<p class="empty-msg">Nessun item associato a questa opera.</p>';
            return;
        }

        grid.className = 'items-grid';
        grid.innerHTML = data.data.map(renderItemCard).join('');
    } catch (e) {
        grid.innerHTML = '<p class="empty-msg">Errore nel caricamento degli items.</p>';
    }
};


function initModificaMuseo() {
    populateMuseoSelect('selectModifica', curMusei);
    document.getElementById('modificaForm').style.display = 'none';
}

function initAggiungiOpere() {
    populateMuseoSelect('selectOpereMuseo', curMusei);
}


function attachFormHandlers() {
    const selectModifica = document.getElementById('selectModifica');
    if (selectModifica) selectModifica.addEventListener('change', function () {
        const codice = this.value;
        const form   = document.getElementById('modificaForm');
        if (!codice) { form.style.display = 'none'; return; }
        const m = curMusei.find(x => x.codiceIsil === codice);
        if (!m) return;
        document.getElementById('mfNome').value        = m.nome              || '';
        document.getElementById('mfCitta').value       = m.citta             || '';
        document.getElementById('mfIndirizzo').value   = m.indirizzo         || '';
        document.getElementById('mfCodiceIsil').value  = m.codiceIsil        || '';
        document.getElementById('mfImmagine').value    = m.immagineCopertina || '';
        document.getElementById('mfDescrizione').value = m.descrizioneBreve  || '';
        form.style.display = 'block';
    });

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
                showAlert('Museo aggiornato!');
                await loadMuseiCuratore();
                initModificaMuseo();
            } else {
                showAlert('Errore: ' + data.error);
            }
        } catch (err) {
            showAlert('Impossibile contattare il server.');
        }
    });

    const operaForm = document.getElementById('operaForm');
    if (operaForm) operaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codiceIsil = document.getElementById('selectOpereMuseo').value;
        if (!codiceIsil) { showAlert('Seleziona prima un museo.'); return; }

        const body = {
            codiceIsil,
            operaId:    document.getElementById('ofTitolo').value.trim(),
            tipo:       document.getElementById('ofTipo').value,
            autore:     document.getElementById('ofAutore').value.trim(),
            datazione:  document.getElementById('ofDatazione').value.trim(),
            immagine:   document.getElementById('ofImmagine').value.trim(),
            descrizione:document.getElementById('ofDescrizione').value.trim(),
            testo:      document.getElementById('ofTesto').value.trim(),
            linguaggio: document.getElementById('ofLinguaggio').value,
            lunghezza:  document.getElementById('ofLunghezza').value,
            licenza:    document.getElementById('ofLicenza').value,
            altezza:    parseFloat(document.getElementById('ofAltezza').value)   || 0,
            larghezza:  parseFloat(document.getElementById('ofLarghezza').value) || 0,
            profondita: parseFloat(document.getElementById('ofProfondita').value)|| 0,
            tecnica:    document.getElementById('ofTecnica').value.trim(),
            materiali:  document.getElementById('ofMateriali').value.trim(),
            prezzo:     parseFloat(document.getElementById('ofPrezzo').value)    || 0,
            pubblica:   document.getElementById('ofPubblica').checked,
            creatoDa:   SESSION.userId,
        };

        if (!body.operaId) { showAlert("Inserisci il titolo dell'opera."); return; }
        if (!body.tipo)    { showAlert('Seleziona il tipo di opera.'); return; }

        try {
            const res  = await fetch('/api/opere', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                showAlert('Opera aggiunta con successo!');
                operaForm.reset();
                initAggiungiOpere();
            } else {
                showAlert('Errore: ' + data.error);
            }
        } catch (err) {
            showAlert('Impossibile contattare il server.');
        }
    });

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
                showAlert('Museo aggiunto!');
                nuovoMuseoForm.reset();
                await loadMuseiCuratore();
                switchSection('musei');
            } else {
                showAlert('Errore: ' + data.error);
            }
        } catch (err) {
            showAlert('Impossibile contattare il server.');
        }
    });
}
