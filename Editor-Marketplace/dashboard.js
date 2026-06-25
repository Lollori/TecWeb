/* ============================================================
   dashboard.js — Logica della dashboard ruolo-based
   ============================================================ */

const SESSION = {
    userId:   localStorage.getItem('userId')       || '',
    role:     localStorage.getItem('userRole')     || '',
    username: localStorage.getItem('userUsername') || '',
};

let curMusei = [];

// index-based lookup avoids JSON serialisation in onclick attrs
let currentMuseoOpere  = [];
let currentMuseoVisite = [];
let currentDetailTab   = 'opere';

let currentViewMuseo = null;

let allMuseiAutore          = [];
let currentAutoreMuseoOpere = [];

let allVisitatoreCachedMusei = [];
let currentVisitatoreOpere   = [];
let currentVisitatoreVisite  = [];

let _vfCurrentMuseo    = '';
let _vfItemTab         = 'miei';
let _vfMyItems         = [];
let _vfAcquistatiItems = [];
let _vfSelectedItemIds = new Set();

/* FLOOR_PLAN_OVERRIDES is defined in /public/js/floor-plan-overrides.js */
function applyDashFloorPlanOverrides(museo) {
    if (!museo?.mappaInterna) return [];
    const ovMap = FLOOR_PLAN_OVERRIDES[museo.codiceIsil];
    if (!ovMap) return museo.mappaInterna;
    return museo.mappaInterna.map(p => {
        const ov = ovMap[p.piano];
        return ov ? { ...p, ...ov } : p;
    });
}

/* ============================================================
   INIT
   ============================================================ */

/* ============================================================
   BFCACHE — force fresh load after logout/login
   ============================================================ */

window.addEventListener('pageshow', () => {
    const freshRole   = localStorage.getItem('userRole') || '';
    const freshUserId = localStorage.getItem('userId')   || '';
    if (freshRole !== SESSION.role || freshUserId !== SESSION.userId) {
        window.location.reload();
    }
});

/* dark mode handled by profile.js */

/* ============================================================
   MOBILE MENU
   ============================================================ */

function toggleMobileMenu() {
    const dropdown = document.getElementById('mobileMenuDropdown');
    const overlay  = document.getElementById('mobileMenuOverlay');
    const btn      = document.getElementById('mobileHamburger');
    const icon     = document.getElementById('hamburgerIcon');
    const isOpen   = dropdown.classList.contains('open');
    if (isOpen) {
        dropdown.classList.remove('open');
        overlay.classList.remove('open');
        btn.classList.remove('open');
        icon.className = 'fa-solid fa-bars';
    } else {
        dropdown.classList.add('open');
        overlay.classList.add('open');
        btn.classList.add('open');
        icon.className = 'fa-solid fa-xmark';
    }
}

function closeMobileMenu() {
    document.getElementById('mobileMenuDropdown').classList.remove('open');
    document.getElementById('mobileMenuOverlay').classList.remove('open');
    const btn  = document.getElementById('mobileHamburger');
    const icon = document.getElementById('hamburgerIcon');
    if (btn)  btn.classList.remove('open');
    if (icon) icon.className = 'fa-solid fa-bars';
}

document.addEventListener('DOMContentLoaded', async () => {
    updateDarkToggleUI();

    if (new URLSearchParams(location.search).get('embed') === 'marketplace') {
        initMarketplace();
        return;
    }

    if (!SESSION.userId) {
        window.location.href = '/login/login.html?redirect=/Editor-Marketplace/dashboard.html';
        return;
    }

    const role = SESSION.role;
    const badgeLabel = role === 'curatore' ? 'Dashboard Curatore'
                     : role === 'autore'   ? 'Dashboard Autore'
                     : role === 'admin'    ? 'Dashboard Admin'
                     : role;
    const initial = (SESSION.username[0] || '?').toUpperCase();
    document.getElementById('sidebarRole').textContent     = badgeLabel;
    document.getElementById('avatarInitial').textContent   = initial;
    document.getElementById('footerUsername').textContent  = SESSION.username;
    document.getElementById('headerRoleLabel').textContent = role;

    // Mobile topbar + dropdown user info
    const mobileAvatarTop  = document.getElementById('mobileAvatarTop');
    const mobileAvatarMenu = document.getElementById('mobileAvatarMenu');
    const mobileUsername   = document.getElementById('mobileMenuUsername');
    const mobileRole       = document.getElementById('mobileMenuRole');
    if (mobileAvatarTop)  mobileAvatarTop.textContent  = initial;
    if (mobileAvatarMenu) mobileAvatarMenu.textContent  = initial;
    if (mobileUsername)   mobileUsername.textContent    = SESSION.username;
    if (mobileRole)       mobileRole.textContent        = badgeLabel;

    buildSidebar();
    attachFormHandlers();

    if (role === 'curatore') {
        await loadMuseiCuratore();
        _populateCuratoreMuseiCittaFilter();
        const sp = new URLSearchParams(window.location.search).get('s');
        switchSection(sp || 'musei');
        if (!sp || sp === 'musei') {
            const savedMuseo = sessionStorage.getItem('curatorMuseo');
            if (savedMuseo && curMusei.find(m => m.codiceIsil === savedMuseo)) {
                showMuseoDetail(savedMuseo);
            }
        }
    } else if (role === 'autore') {
        switchSection('autore-musei');
    } else if (role === 'visitatore') {
        switchSection('visitatore-musei');
    } else if (role === 'admin') {
        switchSection('admin-utenti');
    }
});

/* ============================================================
   SIDEBAR — costruisce i link in base al ruolo
   ============================================================ */

const SECTIONS_BY_ROLE = {
    curatore: [
        { divider: 'Musei' },
        { id: 'musei',           icon: 'fa-building-columns', label: 'I tuoi Musei'    },
        { id: 'modifica-museo',  icon: 'fa-pen-to-square',    label: 'Modifica Museo'  },
        { id: 'aggiungi-museo',  icon: 'fa-plus-circle',      label: 'Aggiungi Museo'  },
        { divider: 'Opere' },
        { id: 'aggiungi-opere',  icon: 'fa-image',            label: 'Aggiungi Opera'  },
        { divider: 'Marketplace' },
        { id: 'marketplace',     icon: 'fa-store',            label: 'Marketplace'     },
    ],
    autore: [
        { id: 'autore-musei',           icon: 'fa-building-columns', label: 'Musei'           },
        { divider: 'Strumenti di Aggiunta' },
        { id: 'autore-aggiungi-visita', icon: 'fa-route',             label: 'Aggiungi Visita' },
        { id: 'autore-aggiungi-item',   icon: 'fa-layer-group',       label: 'Aggiungi Item'   },
        { divider: 'Strumenti Docente' },
        { id: 'curatore-quiz',          icon: 'fa-lightbulb',         label: 'Gestione Quiz'   },
        { divider: 'Marketplace' },
        { id: 'marketplace',            icon: 'fa-store',             label: 'Marketplace'     },
    ],
    visitatore: [
        { divider: 'Esplora' },
        { id: 'visitatore-musei',  icon: 'fa-building-columns', label: 'Musei'       },
        { id: 'visitatore-opere',  icon: 'fa-image',            label: 'Opere'       },
        { id: 'visitatore-visite', icon: 'fa-route',            label: 'Visite'      },
        { divider: 'Marketplace' },
        { id: 'marketplace',       icon: 'fa-store',            label: 'Marketplace' },
    ],
    admin: [
        { divider: 'Piattaforma' },
        { id: 'admin-musei',     icon: 'fa-building-columns', label: 'Musei'       },
        { id: 'admin-opere',     icon: 'fa-image',            label: 'Opere'       },
        { id: 'marketplace',     icon: 'fa-store',            label: 'Marketplace' },
        { divider: 'Gestione' },
        { id: 'admin-items',     icon: 'fa-layer-group',      label: 'Items'       },
        { id: 'admin-visite',    icon: 'fa-route',            label: 'Visite'      },
        { id: 'admin-navigator', icon: 'fa-satellite-dish',   label: 'Navigator'   },
        { divider: 'Amministrazione' },
        { id: 'admin-analytics', icon: 'fa-chart-bar',        label: 'Analytics'   },
        { id: 'admin-utenti',    icon: 'fa-users',            label: 'Utenti'      },
    ],
};

function buildSidebar() {
    const nav       = document.getElementById('sidebarNav');
    const mobileNav = document.getElementById('mobileNav');

    const sections = SECTIONS_BY_ROLE[SESSION.role] || [];
    const html = sections.length
        ? sections.map(s => s.divider
            ? `<div class="sidebar-divider">${s.divider}</div>`
            : `<button class="nav-item" data-section="${s.id}">
                <i class="fa-solid ${s.icon}"></i> ${s.label}
            </button>`).join('')
        : '<p style="padding:12px;color:#6b7280;font-size:0.85rem;">Nessuna sezione disponibile.</p>';

    if (nav)       nav.innerHTML       = html;
    if (mobileNav) mobileNav.innerHTML = html;

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            switchSection(btn.dataset.section);
            closeMobileMenu();
        });
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
    document.querySelectorAll(`.nav-item[data-section="${id}"]`).forEach(b => b.classList.add('active'));

    if (id === 'musei')           renderMusei();
    if (id === 'modifica-museo')  initModificaMuseo();
    if (id === 'aggiungi-opere')  initAggiungiOpere();

    if (id === 'autore-musei')           initAutoreMusei();
    if (id === 'autore-aggiungi-visita') initAutoreAggiungiVisita();
    if (id === 'autore-aggiungi-item')   initAutoreAggiungiItem();

    if (id === 'visitatore-musei')  initVisitatoreMusei();
    if (id === 'visitatore-opere')  initVisitatoreOpere();
    if (id === 'visitatore-visite') initVisitatoreVisite();

    if (id === 'admin-utenti')    initAdminUtenti();
    if (id === 'admin-musei')     initAdminMusei();
    if (id === 'admin-opere')     initAdminOpere();
    if (id === 'admin-visite')    initAdminVisite();
    if (id === 'admin-items')     initAdminItems();
    if (id === 'admin-analytics') initAdminAnalytics();
    if (id === 'admin-navigator') initAdminNavigator();

    if (id === 'curatore-quiz') initCuratoreQuiz();

    if (id === 'marketplace') initMarketplace();
}

/* ============================================================
   MAPPE MUSEO — toggle luogo / planimetria interna
   ============================================================ */

window.dashToggleMap = function (type) {
    const museo = currentViewMuseo;
    const panel = document.getElementById('dash-map-panel');
    if (!museo || !panel) return;

    if (panel.dataset.activeType === type && panel.style.display !== 'none') {
        panel.innerHTML = '';
        panel.style.display = 'none';
        panel.dataset.activeType = '';
        return;
    }

    if (type === 'location' && museo.mappaEmbed) {
        panel.innerHTML = `
            <div class="dash-map-section">
                <iframe class="dash-map-iframe" src="${museo.mappaEmbed}"
                        loading="lazy" allowfullscreen></iframe>
                ${museo.mappaLink
                    ? `<a href="${museo.mappaLink}" target="_blank" class="dash-map-link">
                           Apri in OpenStreetMap ↗
                       </a>`
                    : ''}
            </div>`;
    } else if (type === 'interna' && museo.mappaInterna?.length) {
        const piani = applyDashFloorPlanOverrides(museo);
        const isil  = museo.codiceIsil;
        panel.innerHTML = `
            <div class="dash-map-section dash-map-interna">
                ${piani.length > 1 ? `
                    <div class="piano-tabs">
                        ${piani.map((p, i) => `
                            <button class="piano-tab-btn${i === 0 ? ' active' : ''}"
                                    onclick="dashSelectPiano(${i})">
                                ${p.piano}
                            </button>`).join('')}
                    </div>` : ''}
                ${piani.map((p, i) => `
                    <div id="dash-floor-wrap-${i}"
                         class="dash-floor-wrap${i > 0 ? ' dash-floor-hidden' : ''}">
                        <img id="dash-floor-img-${i}"
                             class="dash-floor-img"
                             src="${p.url}" alt="${p.piano}" loading="lazy">
                        <svg id="dash-floor-svg-${i}"
                             class="dash-floor-overlay"
                             viewBox="0 0 ${p.imgWidth || 437} ${p.imgHeight || 600}"
                             preserveAspectRatio="none">
                        </svg>
                    </div>`).join('')}
                <p class="dash-room-hint" id="dash-room-hint">Tocca una stanza per vedere le opere</p>
                <div id="dash-room-panel" class="dash-room-panel" style="display:none"></div>
            </div>`;

        piani.forEach((p, i) => {
            if (!p.geoJsonUrl) return;
            const svgEl = document.getElementById(`dash-floor-svg-${i}`);
            if (!svgEl) return;
            fetch(p.geoJsonUrl)
                .then(r => r.json())
                .then(geo => {
                    geo.features.forEach(f => {
                        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        poly.setAttribute('points',
                            f.geometry.coordinates[0].map(([x, y]) => `${x},${-y}`).join(' '));
                        poly.classList.add('dash-room-polygon');
                        const roomId = f.properties.room_id;
                        poly.addEventListener('click', () => dashHandleRoomClick(isil, roomId, poly, svgEl));
                        svgEl.appendChild(poly);
                    });
                })
                .catch(err => console.warn('[dashboard] GeoJSON load failed:', err));
        });
    }

    panel.dataset.activeType = type;
    panel.style.display = 'block';
};

window.dashSelectPiano = function (idx) {
    document.querySelectorAll('.dash-floor-wrap').forEach((wrap, i) => {
        wrap.classList.toggle('dash-floor-hidden', i !== idx);
    });
    document.querySelectorAll('.piano-tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === idx);
    });
    dashCloseRoomPanel();
};

window.dashCloseRoomPanel = function () {
    const panel = document.getElementById('dash-room-panel');
    if (panel) panel.style.display = 'none';
    const hint = document.getElementById('dash-room-hint');
    if (hint) hint.style.display = '';
    document.querySelectorAll('.dash-room-polygon--active')
        .forEach(el => el.classList.remove('dash-room-polygon--active'));
};

async function dashHandleRoomClick(museoIsil, roomId, poly, svgEl) {
    if (poly.classList.contains('dash-room-polygon--active')) {
        poly.classList.remove('dash-room-polygon--active');
        dashCloseRoomPanel();
        return;
    }
    svgEl.querySelectorAll('.dash-room-polygon--active')
        .forEach(el => el.classList.remove('dash-room-polygon--active'));
    poly.classList.add('dash-room-polygon--active');

    const hint = document.getElementById('dash-room-hint');
    if (hint) hint.style.display = 'none';

    const panel = document.getElementById('dash-room-panel');
    if (!panel) return;
    panel.style.display = 'block';
    panel.innerHTML = `<p class="dash-room-loading"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento opere…</p>`;

    try {
        const res  = await fetch(`/api/opere?codiceIsil=${encodeURIComponent(museoIsil)}&sala=${encodeURIComponent(roomId)}`);
        const data = await res.json();
        const opere = (data.data || []).filter(o => o.sala === roomId);
        const closeBtn = `<button class="dash-room-close" onclick="dashCloseRoomPanel()">✕</button>`;
        if (opere.length === 0) {
            panel.innerHTML = `
                <div class="dash-room-header">
                    <span>Sala ${roomId}</span>${closeBtn}
                </div>
                <p class="dash-room-empty">Nessuna opera disponibile per questa sala.</p>`;
        } else {
            panel.innerHTML = `
                <div class="dash-room-header">
                    <span>Sala ${roomId} · ${opere.length} oper${opere.length === 1 ? 'a' : 'e'}</span>${closeBtn}
                </div>
                <div class="dash-opera-list">
                    ${opere.map(o => `
                        <div class="dash-opera-card">
                            ${o.immagine ? `<img class="dash-opera-img" src="${o.immagine}" alt="" onerror="this.style.display='none'">` : ''}
                            <div class="dash-opera-body">
                                <p class="dash-opera-name">${o.operaId}</p>
                                ${o.autore ? `<p class="dash-opera-meta">${o.autore}${o.datazione ? ' · ' + o.datazione : ''}</p>` : ''}
                            </div>
                        </div>`).join('')}
                </div>`;
        }
    } catch (_) {
        panel.innerHTML = `<p class="dash-room-empty">Errore nel caricamento delle opere.</p>`;
    }
}

function mapActionsHtml(museo) {
    if (!museo.mappaEmbed && !museo.mappaInterna?.length) return '';
    return `
        <div class="museo-map-actions">
            ${museo.mappaEmbed
                ? `<button class="map-action-btn" onclick="dashToggleMap('location')">
                       <i class="fa-solid fa-location-dot"></i> Mappa luogo
                   </button>`
                : ''}
            ${museo.mappaInterna?.length
                ? `<button class="map-action-btn" onclick="dashToggleMap('interna')">
                       <i class="fa-solid fa-map"></i> Planimetria interna
                   </button>`
                : ''}
        </div>
        <div id="dash-map-panel" class="dash-map-panel" style="display:none;"></div>`;
}

/* ============================================================
   CARICAMENTO MUSEI DEL CURATORE
   ============================================================ */

async function loadMuseiCuratore() {
    try {
        const res  = await fetch(`/api/musei?curatoreId=${encodeURIComponent(SESSION.userId)}`);
        const data = await res.json();
        if (data.ok) curMusei = data.data;
    } catch (e) {
        console.error('Errore caricamento musei:', e);
    }
}

/* ============================================================
   SEZIONE MUSEI — lista card
   ============================================================ */

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

/* ============================================================
   SEZIONE MUSEI — dettaglio (tab Opere / Visite in vendita)
   ============================================================ */

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

/* ============================================================
   DETTAGLIO OPERA — items associati (vista curatore)
   ============================================================ */

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

/* ── Helper: render tabbed toni panel ─────────────────── */
function renderToni(item, uid) {
    const t = item.toni || {};
    const livelli = [
        { key: 'semplice', label: 'Semplice', durata: 3  },
        { key: 'medio',    label: 'Medio',    durata: 15 },
        { key: 'avanzato', label: 'Avanzato', durata: 40 },
    ];
    const id = uid || item._id || Math.random().toString(36).slice(2);
    return `
        <div class="toni-tabs" data-toni-id="${id}">
            <div class="toni-tab-bar">
                ${livelli.map((l, i) => `
                    <button type="button"
                            class="toni-tab-btn${i === 0 ? ' active' : ''}"
                            onclick="toniSwitch('${id}','${l.key}')">
                        ${l.label}
                        <span class="toni-dur">${l.durata}s</span>
                    </button>`).join('')}
            </div>
            ${livelli.map((l, i) => `
                <div class="toni-panel${i === 0 ? '' : ' toni-panel--hidden'}" data-toni-key="${l.key}">
                    <p class="toni-testo">${(t[l.key]?.testo || '').replace(/\n/g, '<br>') || '<em style="color:#94a3b8">Nessun contenuto.</em>'}</p>
                </div>`).join('')}
        </div>`;
}

window.toniSwitch = function (id, key) {
    const root = document.querySelector(`.toni-tabs[data-toni-id="${id}"]`);
    if (!root) return;
    root.querySelectorAll('.toni-tab-btn').forEach(b => b.classList.toggle('active', b.textContent.trim().toLowerCase().startsWith(key)));
    root.querySelectorAll('.toni-panel').forEach(p => p.classList.toggle('toni-panel--hidden', p.dataset.toniKey !== key));
};

function renderItemCard(item) {
    return `
        <div class="item-read-card">
            ${item.image
                ? `<img src="${item.image}" alt="item" onerror="this.style.display='none'">`
                : ''}
            ${renderToni(item)}
            ${Object.keys(item.metadata || {}).length ? `
                <ul class="item-metadata-list">
                    ${Object.entries(item.metadata).map(([k, v]) =>
                        `<li><span class="meta-key">${k}:</span> ${v}</li>`
                    ).join('')}
                </ul>` : ''}
            <span class="tag-bubble" style="margin-top:auto;font-size:0.78rem;">
                <i class="fa-solid fa-user"></i> ${item.authorId}
            </span>
        </div>`;
}

/* ============================================================
   SEZIONE MODIFICA MUSEO
   ============================================================ */

function initModificaMuseo() {
    populateMuseoSelect('selectModifica', curMusei);
    document.getElementById('modificaForm').style.display = 'none';
}

function initAggiungiOpere() {
    populateMuseoSelect('selectOpereMuseo', curMusei);
}

/* ============================================================
   FORM HANDLERS
   ============================================================ */

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

    const operaForm = document.getElementById('operaForm');
    if (operaForm) operaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codiceIsil = document.getElementById('selectOpereMuseo').value;
        if (!codiceIsil) { alert('Seleziona prima un museo.'); return; }

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

        if (!body.operaId) { alert("Inserisci il titolo dell'opera."); return; }
        if (!body.tipo)    { alert('Seleziona il tipo di opera.'); return; }

        try {
            const res  = await fetch('/api/opere', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                alert('Opera aggiunta con successo!');
                operaForm.reset();
                initAggiungiOpere();
            } else {
                alert('Errore: ' + data.error);
            }
        } catch (err) {
            alert('Impossibile contattare il server.');
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
                alert('Museo aggiunto!');
                nuovoMuseoForm.reset();
                await loadMuseiCuratore();
                switchSection('musei');
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
    const section = document.getElementById('section-autore-musei');
    section.innerHTML = `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="page-title">Musei</h1>
                <p class="text-muted mb-0">Esplora i musei disponibili.</p>
            </div>
            <div class="d-flex align-items-center gap-3">
                <button class="btn-magenta" style="white-space:nowrap;"
                        onclick="document.getElementById('autoreVisiteSection').scrollIntoView({behavior:'smooth',block:'start'})">
                    <i class="fa-solid fa-ranking-star me-2"></i>Visite Popolari
                </button>
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

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 2rem;">

        <div id="autoreVisiteSection">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h1 class="page-title mb-0">Visite più Popolari</h1>
                    <p class="text-muted mb-0">Le tre visite più acquistate sul marketplace</p>
                </div>
                <button class="btn-outline-custom" style="padding:5px 12px;font-size:0.8rem;white-space:nowrap;"
                        onclick="switchSection('marketplace')">
                    Vedi tutte <i class="fa-solid fa-arrow-right ms-1"></i>
                </button>
            </div>
            <div class="glass-card p-4">
                <div id="autoreVisiteTop3" style="display:flex;align-items:flex-end;gap:12px;padding:4px 0 0;"></div>
            </div>
        </div>
    `;

    try {
        const [rMusei, rVisite] = await Promise.all([
            fetch('/api/musei'), fetch('/api/visite'),
        ]);
        const [dMusei, dVisite] = await Promise.all([
            rMusei.json(), rVisite.json(),
        ]);

        allMuseiAutore = dMusei.ok ? dMusei.data : [];
        _renderAutoreMuseiGrid(allMuseiAutore);

        // Top 3 visite — podio
        const visiteTop3 = document.getElementById('autoreVisiteTop3');
        const museoMap = {};
        allMuseiAutore.forEach(m => { museoMap[m.codiceIsil] = m.nome; });

        if (dVisite.ok && dVisite.data.length) {
            const sorted = [...dVisite.data]
                .filter(v => v.pubblica)
                .sort((a, b) => (b.acquirenti || 0) - (a.acquirenti || 0))
                .slice(0, 3);

            const podioMeta = [
                { rank: 1, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', emoji: '🥇', baseH: '72px' },
                { rank: 2, color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', emoji: '🥈', baseH: '48px' },
                { rank: 3, color: '#cd7c3a', bg: 'rgba(205,124,58,0.08)',  emoji: '🥉', baseH: '28px' },
            ];

            const podioCard = (v, meta, museoName) => `
                <div style="flex:1;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;
                            border:2px solid ${meta.color}50;background:${meta.bg};
                            transition:transform 0.22s ease,box-shadow 0.22s ease;cursor:pointer;"
                     onmouseenter="this.style.transform='translateY(-10px) scale(1.04)';
                                   this.style.boxShadow='0 18px 40px rgba(0,0,0,0.13)';"
                     onmouseleave="this.style.transform='';this.style.boxShadow='';"
                     onclick="switchSection('marketplace')">
                    <div style="text-align:center;padding:18px 12px 10px;">
                        <span style="font-size:2.2rem;line-height:1;">${meta.emoji}</span>
                        <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.05em;
                                    color:${meta.color};margin-top:4px;text-transform:uppercase;">
                            ${meta.rank}° posto
                        </div>
                    </div>
                    <div style="padding:0 12px 14px;flex:1;display:flex;flex-direction:column;gap:6px;text-align:center;">
                        <p style="margin:0;font-weight:700;font-size:0.88rem;
                                   overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;
                                   line-clamp:2;-webkit-box-orient:vertical;">
                            ${v.nomeVisita}
                        </p>
                        <p style="margin:0;font-size:0.74rem;color:#94a3b8;
                                   white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${museoName}
                        </p>
                        <p style="margin:0;font-size:0.74rem;color:#94a3b8;">
                            <i class="fa-solid fa-users me-1"></i>${v.acquirenti || 0} acquirenti
                        </p>
                        <div style="margin-top:auto;padding-top:10px;display:flex;flex-direction:column;gap:6px;align-items:center;">
                            ${v.prezzo > 0
                                ? `<span class="price-badge">€${v.prezzo}</span>`
                                : `<span class="free-badge">Gratis</span>`
                            }
                            <button class="btn-magenta" style="width:100%;padding:5px 8px;font-size:0.76rem;">
                                <i class="fa-solid fa-cart-plus me-1"></i>Acquista
                            </button>
                        </div>
                    </div>
                    <div style="height:${meta.baseH};background:${meta.color}25;
                                border-top:3px solid ${meta.color}60;
                                display:flex;align-items:center;justify-content:center;">
                        <span style="font-size:1.6rem;font-weight:900;color:${meta.color};">${meta.rank}</span>
                    </div>
                </div>`;

            if (!sorted.length) {
                visiteTop3.innerHTML = '<p class="text-muted" style="font-size:0.88rem;">Nessuna visita pubblica disponibile.</p>';
            } else {
                // ordine visivo podio: 2° — 1° — 3°
                const podioOrder = sorted.length === 1
                    ? [[sorted[0], podioMeta[0]]]
                    : sorted.length === 2
                        ? [[sorted[1], podioMeta[1]], [sorted[0], podioMeta[0]]]
                        : [[sorted[1], podioMeta[1]], [sorted[0], podioMeta[0]], [sorted[2], podioMeta[2]]];

                visiteTop3.innerHTML = podioOrder
                    .map(([v, meta]) => podioCard(v, meta, museoMap[v.codiceIsil] || v.codiceIsil))
                    .join('');
            }
        } else {
            visiteTop3.innerHTML = '<p class="text-muted" style="font-size:0.88rem;">Nessuna visita disponibile.</p>';
        }

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
    const q = (document.getElementById('searchAutoreMusei')?.value || '').toLowerCase();
    const filtered = q
        ? allMuseiAutore.filter(m =>
            m.nome.toLowerCase().includes(q) || m.citta.toLowerCase().includes(q))
        : allMuseiAutore;
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
                        ? `<img src="${op.immagine}" alt="${op.operaId}" onerror="this.style.display='none'">`
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

/* ============================================================
   AUTORE — MUSEI — dettaglio opera → items
   ============================================================ */

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

/* ============================================================
   AUTORE — AGGIUNGI VISITA
   ============================================================ */

async function initAutoreAggiungiVisita() {
    const section = document.getElementById('section-autore-aggiungi-visita');
    section.innerHTML = `
        <div class="mb-5">
            <h1 class="page-title">Aggiungi Visita</h1>
            <p class="text-muted mb-0">Crea una nuova visita guidata per un museo.</p>
        </div>
        <div class="glass-card p-5">
            <form id="visitaFormAutore" class="row g-4">
                <div class="col-12">
                    <label class="custom-label">Museo *</label>
                    <select id="vfMuseo" class="custom-input" required>
                        <option value="">— Seleziona museo —</option>
                    </select>
                </div>
                <div class="col-12">
                    <label class="custom-label">Nome Visita *</label>
                    <input type="text" id="vfNomeVisita" class="custom-input"
                           placeholder="es. Rinascimento Fiorentino" required>
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Nome Mnemonico</label>
                    <input type="text" id="vfNomeMnemonico" class="custom-input"
                           placeholder="es. uffizi_rinascimento">
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Domanda Quiz</label>
                    <input type="text" id="vfQuizDomanda" class="custom-input"
                           placeholder="es. In quale anno fu dipinta la Primavera?">
                </div>
                <div class="col-12">
                    <label class="custom-label">Items da includere nella visita</label>
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
                    <div id="itemsCheckboxList"
                         style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;max-height:320px;overflow-y:auto;padding:2px;">
                        <p style="color:#64748b;font-size:0.88rem;grid-column:1/-1;">
                            Seleziona prima un museo per vedere gli items disponibili.
                        </p>
                    </div>
                </div>
                <div class="col-12" id="vfOrderSection" style="display:none;">
                    <label class="custom-label" style="margin-bottom:4px;">Ordine degli items</label>
                    <p style="font-size:0.8rem;color:#94a3b8;margin:0 0 10px;">
                        <i class="fa-solid fa-grip-vertical me-1"></i>Trascina le card per riordinare la sequenza di visita.
                    </p>
                    <div id="itemsOrderPanel" style="display:flex;flex-direction:column;gap:8px;"></div>
                </div>
                <div class="col-12 d-flex align-items-center gap-3">
                    <label class="custom-label" style="margin:0;">Visibilità</label>
                    <div style="display:inline-flex;align-items:center;gap:10px;cursor:pointer;user-select:none;"
                         onclick="toggleVfVisibilita()">
                        <div id="vfToggleTrack" style="width:54px;height:28px;border-radius:14px;background:#cbd5e1;position:relative;transition:background .2s;flex-shrink:0;">
                            <div id="vfToggleThumb" style="position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25);transition:left .2s;"></div>
                        </div>
                        <span id="vfToggleLabel" style="font-size:0.92rem;font-weight:600;color:#64748b;">Privata</span>
                    </div>
                    <input type="hidden" id="vfPubblica" value="false">
                </div>
                <div class="col-md-4" id="vfPrezzoRow" style="display:none;">
                    <label class="custom-label">Prezzo (€)</label>
                    <input type="number" id="vfPrezzo" class="custom-input" min="0" step="0.01" value="0" placeholder="0.00">
                </div>
                <div class="col-12 d-flex justify-content-end gap-3 pt-3"
                     style="border-top:1px solid #e2e8f0;">
                    <button type="button" class="btn-outline-custom"
                            onclick="resetVisitaForm()">Pulisci</button>
                    <button type="submit" class="btn-magenta">Crea Visita</button>
                </div>
            </form>
        </div>
    `;

    await ensureMuseiAutore();
    populateMuseoSelect('vfMuseo', allMuseiAutore);

    window.toggleVfVisibilita = function () {
        const track     = document.getElementById('vfToggleTrack');
        const thumb     = document.getElementById('vfToggleThumb');
        const label     = document.getElementById('vfToggleLabel');
        const hidden    = document.getElementById('vfPubblica');
        const prezzoRow = document.getElementById('vfPrezzoRow');
        const newVal    = hidden.value !== 'true';
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

    _vfCurrentMuseo    = '';
    _vfItemTab         = 'miei';
    _vfMyItems         = [];
    _vfAcquistatiItems = [];
    _vfSelectedItemIds = new Set();

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
        const lista = _vfItemTab === 'miei' ? _vfMyItems : _vfAcquistatiItems;
        if (!lista.length) {
            const msg = _vfItemTab === 'miei'
                ? 'Nessun tuo item disponibile per questo museo. Crea un item dalla sezione "Aggiungi Item".'
                : 'Nessun item acquistato disponibile per questo museo. Acquistane dal marketplace.';
            container.innerHTML = `<p style="color:#64748b;font-size:0.88rem;grid-column:1/-1;">${msg}</p>`;
            return;
        }
        container.innerHTML = lista.map(it => {
            const preview   = (it.toni?.semplice?.testo || '').substring(0, 60);
            const isChecked = _vfSelectedItemIds.has(it._id);
            return `
            <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;
                          border:1px solid ${isChecked ? 'var(--magenta,#FF007F)' : '#e2e8f0'};
                          border-radius:10px;cursor:pointer;transition:border-color .18s,background .18s;
                          background:${isChecked ? 'rgba(255,0,127,0.05)' : ''};">
                <input type="checkbox" name="itemsVisita" value="${it._id}"
                       ${isChecked ? 'checked' : ''}
                       style="margin-top:3px;width:auto;accent-color:var(--magenta,#FF007F);"
                       onchange="vfToggleItem('${it._id}',this.checked,this);">
                <span style="font-size:0.88rem;">
                    <strong>${it.operaId}</strong>
                    ${preview ? `<br><span style="color:#64748b;font-size:0.8rem;">${preview}${preview.length >= 60 ? '…' : ''}</span>` : ''}
                </span>
            </label>`;
        }).join('');
    }

    document.getElementById('vfMuseo').addEventListener('change', async function () {
        const codiceIsil = this.value;
        _vfCurrentMuseo  = codiceIsil;
        const container  = document.getElementById('itemsCheckboxList');
        if (!codiceIsil) {
            _vfMyItems = [];
            _vfAcquistatiItems = [];
            _vfSelectedItemIds = new Set();
            _renderVfItems();
            if (window.vfUpdateOrderPanel) window.vfUpdateOrderPanel();
            return;
        }
        _vfSelectedItemIds = new Set();
        container.innerHTML = '<p style="color:#64748b;font-size:0.88rem;grid-column:1/-1;"><i class="fa-solid fa-spinner fa-spin me-1"></i> Caricamento items…</p>';
        try {
            const [resOwn, resPublic] = await Promise.all([
                fetch(`/api/items?authorId=${encodeURIComponent(SESSION.userId)}&museumId=${encodeURIComponent(codiceIsil)}`),
                fetch(`/api/items?pubblica=true&museumId=${encodeURIComponent(codiceIsil)}`),
            ]);
            const [dOwn, dPublic] = await Promise.all([resOwn.json(), resPublic.json()]);
            _vfMyItems = dOwn.ok ? dOwn.data : [];
            const purchases = getMktPurchases();
            _vfAcquistatiItems = (dPublic.ok ? dPublic.data : [])
                .filter(it => purchases.items.includes(it._id) && it.authorId !== SESSION.userId);
            _renderVfItems();
            if (window.vfUpdateOrderPanel) window.vfUpdateOrderPanel();
        } catch (e) {
            container.innerHTML = '<p style="color:#e74c3c;font-size:0.88rem;grid-column:1/-1;">Errore nel caricamento degli items.</p>';
        }
    });

    /* ---- drag-and-drop order panel ---- */
    let _vfDragSrc = null;

    function _vfRenumberCards() {
        document.querySelectorAll('#itemsOrderPanel .vf-drag-card').forEach((c, i) => {
            const n = c.querySelector('[data-num]');
            if (n) n.textContent = i + 1;
        });
    }

    window.vfToggleItem = function (id, checked, checkbox) {
        if (checked) _vfSelectedItemIds.add(id);
        else         _vfSelectedItemIds.delete(id);
        const lbl = checkbox.closest('label');
        lbl.style.borderColor = checked ? 'var(--magenta,#FF007F)' : '#e2e8f0';
        lbl.style.background  = checked ? 'rgba(255,0,127,0.05)' : '';
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

        const allItems    = [..._vfMyItems, ..._vfAcquistatiItems];
        const existingIds = [...panel.querySelectorAll('.vf-drag-card')].map(c => c.dataset.itemId);
        const newOrder = [
            ...existingIds.filter(id => _vfSelectedItemIds.has(id)),
            ...[..._vfSelectedItemIds].filter(id => !existingIds.includes(id)),
        ];

        panel.innerHTML = newOrder.map((id, i) => {
            const item = allItems.find(it => it._id === id);
            if (!item) return '';
            const preview = (item.toni?.semplice?.testo || '').substring(0, 70);
            return `
            <div class="vf-drag-card" data-item-id="${id}" draggable="true"
                 style="display:flex;align-items:center;gap:12px;padding:10px 16px;
                        border:1px solid #e2e8f0;border-radius:10px;cursor:grab;
                        background:var(--card-bg,white);
                        transition:box-shadow .15s,border-color .15s,opacity .15s;"
                 ondragstart="vfDragStart(event,this)"
                 ondragover="vfDragOver(event,this)"
                 ondragleave="vfDragLeave(event,this)"
                 ondrop="vfDrop(event,this)"
                 ondragend="vfDragEnd(event,this)">
                <i class="fa-solid fa-grip-vertical" style="color:#cbd5e1;flex-shrink:0;"></i>
                <span data-num style="min-width:22px;height:22px;border-radius:50%;
                                       background:var(--magenta,#FF007F);color:#fff;
                                       display:inline-flex;align-items:center;justify-content:center;
                                       font-size:0.72rem;font-weight:700;flex-shrink:0;">${i + 1}</span>
                <div style="flex:1;min-width:0;">
                    <strong style="font-size:0.88rem;">${item.operaId}</strong>
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
        if (el !== _vfDragSrc) {
            el.style.borderColor = 'var(--magenta,#FF007F)';
            el.style.boxShadow   = '0 0 0 2px rgba(255,0,127,0.15)';
        }
    };

    window.vfDragLeave = function (e, el) {
        el.style.borderColor = '#e2e8f0';
        el.style.boxShadow   = '';
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
        el.style.borderColor = '#e2e8f0';
        el.style.boxShadow   = '';
        _vfRenumberCards();
    };

    window.vfDragEnd = function (e, el) {
        el.style.opacity = '1';
        el.style.cursor  = 'grab';
        document.querySelectorAll('#itemsOrderPanel .vf-drag-card').forEach(c => {
            c.style.borderColor = '#e2e8f0';
            c.style.boxShadow   = '';
        });
    };

    document.getElementById('visitaFormAutore').addEventListener('submit', async (e) => {
        e.preventDefault();
        const codiceIsil = document.getElementById('vfMuseo').value;
        if (!codiceIsil) { alert('Seleziona un museo.'); return; }

        const orderPanel = document.getElementById('itemsOrderPanel');
        const selectedItems = (orderPanel && orderPanel.querySelectorAll('.vf-drag-card').length > 0)
            ? [...orderPanel.querySelectorAll('.vf-drag-card')].map(c => c.dataset.itemId)
            : [..._vfSelectedItemIds];
        const isPubblica = document.getElementById('vfPubblica').value === 'true';
        const body = {
            nomeVisita:    document.getElementById('vfNomeVisita').value.trim(),
            nomeMnemonico: document.getElementById('vfNomeMnemonico').value.trim(),
            quizDomanda:   document.getElementById('vfQuizDomanda').value.trim(),
            codiceIsil,
            prezzo:        isPubblica ? (parseFloat(document.getElementById('vfPrezzo').value) || 0) : 0,
            pubblica:      isPubblica,
            autoreId:      SESSION.userId,
            itemIds:       selectedItems,
            opereCount:    selectedItems.length,
        };

        if (!body.nomeVisita) { alert('Inserisci il nome della visita.'); return; }

        try {
            const res  = await fetch('/api/visite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                alert(`Visita "${body.nomeVisita}" creata con successo!`);
                resetVisitaForm();
            } else {
                alert('Errore: ' + (data.error || 'Creazione fallita.'));
            }
        } catch (err) {
            alert('Impossibile contattare il server.');
        }
    });
}

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
    _vfCurrentMuseo    = '';
    _vfMyItems         = [];
    _vfAcquistatiItems = [];
    _vfSelectedItemIds = new Set();
    const orderSection = document.getElementById('vfOrderSection');
    const orderPanel   = document.getElementById('itemsOrderPanel');
    if (orderSection) orderSection.style.display = 'none';
    if (orderPanel)   orderPanel.innerHTML = '';
};

/* ============================================================
   AUTORE — AGGIUNGI ITEM
   ============================================================ */

async function initAutoreAggiungiItem() {
    const section = document.getElementById('section-autore-aggiungi-item');
    section.innerHTML = `
        <div class="mb-5">
            <h1 class="page-title">Aggiungi Item</h1>
            <p class="text-muted mb-0">Aggiungi contenuti e informazioni per un'opera specifica.</p>
        </div>
        <div class="glass-card p-5">
            <form id="itemFormAutore" class="row g-4">
                <div class="col-md-6">
                    <label class="custom-label">Museo *</label>
                    <select id="ifMuseo" class="custom-input" required>
                        <option value="">— Seleziona museo —</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Opera *</label>
                    <select id="ifOpera" class="custom-input" required>
                        <option value="">— Prima seleziona un museo —</option>
                    </select>
                </div>
                <div class="col-12">
                    <label class="custom-label">
                        Tono <strong>Semplice</strong>
                        <span class="toni-dur-label">~3 s · linguaggio elementare</span>
                    </label>
                    <textarea id="ifSemplice" class="custom-input" rows="2"
                              placeholder="Breve descrizione in parole semplici, adatta a bambini e ragazzi…" required></textarea>
                </div>
                <div class="col-12">
                    <label class="custom-label">
                        Tono <strong>Medio</strong>
                        <span class="toni-dur-label">~15 s · pubblico generale</span>
                    </label>
                    <textarea id="ifMedio" class="custom-input" rows="3"
                              placeholder="Descrizione accessibile con qualche dettaglio storico o tecnico…" required></textarea>
                </div>
                <div class="col-12">
                    <label class="custom-label">
                        Tono <strong>Avanzato</strong>
                        <span class="toni-dur-label">~40 s · terminologia tecnica</span>
                    </label>
                    <textarea id="ifAvanzato" class="custom-input" rows="5"
                              placeholder="Analisi approfondita con terminologia specialistica…" required></textarea>
                </div>
                <div class="col-md-6">
                    <label class="custom-label">ID Oggetto</label>
                    <input type="text" id="ifObjectId" class="custom-input"
                           placeholder="Generato automaticamente se vuoto">
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Materiale</label>
                    <input type="text" id="ifMateriale" class="custom-input"
                           placeholder="es. Marmo, Tempera su tavola">
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Tecnica</label>
                    <input type="text" id="ifTecnica" class="custom-input"
                           placeholder="es. Scultura, Affresco">
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Dimensioni</label>
                    <input type="text" id="ifDimensioni" class="custom-input"
                           placeholder="es. 172 × 278 cm">
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Provenienza</label>
                    <input type="text" id="ifProvenienza" class="custom-input"
                           placeholder="es. Firenze, Uffizi">
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Periodo</label>
                    <input type="text" id="ifPeriodo" class="custom-input"
                           placeholder="es. 1477–1478">
                </div>
                <div class="col-md-6">
                    <label class="custom-label">URL Immagine</label>
                    <input type="url" id="ifImmagine" class="custom-input" placeholder="https://…">
                </div>
                <div class="col-12 d-flex align-items-center gap-3">
                    <label class="custom-label" style="margin:0;">Visibilità</label>
                    <div style="display:inline-flex;align-items:center;gap:10px;cursor:pointer;user-select:none;"
                         onclick="toggleIfVisibilita()">
                        <div id="ifToggleTrack" style="width:54px;height:28px;border-radius:14px;background:#cbd5e1;position:relative;transition:background .2s;flex-shrink:0;">
                            <div id="ifToggleThumb" style="position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25);transition:left .2s;"></div>
                        </div>
                        <span id="ifToggleLabel" style="font-size:0.92rem;font-weight:600;color:#64748b;">Privata</span>
                    </div>
                    <input type="hidden" id="ifPubblica" value="false">
                </div>
                <div class="col-md-4" id="ifPrezzoRow" style="display:none;">
                    <label class="custom-label">Prezzo (€)</label>
                    <input type="number" id="ifPrezzo" class="custom-input" min="0" step="0.01" value="0" placeholder="0.00">
                </div>
                <div class="col-12 d-flex justify-content-end gap-3 pt-3"
                     style="border-top:1px solid #e2e8f0;">
                    <button type="button" class="btn-outline-custom"
                            onclick="resetItemForm()">Pulisci</button>
                    <button type="submit" class="btn-magenta">Salva Item</button>
                </div>
            </form>
        </div>
    `;

    await ensureMuseiAutore();
    populateMuseoSelect('ifMuseo', allMuseiAutore);

    window.toggleIfVisibilita = function () {
        const track     = document.getElementById('ifToggleTrack');
        const thumb     = document.getElementById('ifToggleThumb');
        const label     = document.getElementById('ifToggleLabel');
        const hidden    = document.getElementById('ifPubblica');
        const prezzoRow = document.getElementById('ifPrezzoRow');
        const newVal    = hidden.value !== 'true';
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

    document.getElementById('ifMuseo').addEventListener('change', async function () {
        const codiceIsil  = this.value;
        const operaSelect = document.getElementById('ifOpera');
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
            operaSelect.innerHTML = '<option value="">— Seleziona opera —</option>' +
                data.data.map(op =>
                    `<option value="${op.operaId}">${op.operaId}${op.autore ? ' — ' + op.autore : ''}</option>`
                ).join('');
        } catch (e) {
            operaSelect.innerHTML = '<option value="">Errore nel caricamento</option>';
        }
    });

    document.getElementById('itemFormAutore').addEventListener('submit', async (e) => {
        e.preventDefault();
        const museoIsil  = document.getElementById('ifMuseo').value;
        const operaId    = document.getElementById('ifOpera').value;
        const testoSem   = document.getElementById('ifSemplice').value.trim();
        const testoMed   = document.getElementById('ifMedio').value.trim();
        const testoAdv   = document.getElementById('ifAvanzato').value.trim();

        if (!museoIsil) { alert('Seleziona un museo.'); return; }
        if (!operaId)   { alert("Seleziona un'opera."); return; }
        if (!testoSem && !testoMed && !testoAdv) {
            alert('Inserisci almeno un tono di contenuto.'); return;
        }

        const isPubblicaItem = document.getElementById('ifPubblica').value === 'true';
        const prezzo   = isPubblicaItem ? (parseFloat(document.getElementById('ifPrezzo').value) || 0) : 0;
        const metadata = {};
        if (prezzo > 0) metadata.prezzo = prezzo;
        [['materiale','ifMateriale'],['tecnica','ifTecnica'],['dimensioni','ifDimensioni'],
         ['provenienza','ifProvenienza'],['periodo','ifPeriodo']].forEach(([key, id]) => {
            const val = document.getElementById(id)?.value.trim();
            if (val) metadata[key] = val;
        });

        const objectIdVal = document.getElementById('ifObjectId').value.trim();
        const body = {
            operaId,
            museumId: museoIsil,
            authorId: SESSION.userId,
            objectId: objectIdVal || (operaId.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()),
            toni: {
                semplice: { testo: testoSem, durata: 3  },
                medio:    { testo: testoMed, durata: 15 },
                avanzato: { testo: testoAdv, durata: 40 },
            },
            metadata,
            image:    document.getElementById('ifImmagine').value.trim(),
            pubblica: isPubblicaItem,
        };

        try {
            const res  = await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                alert('Item creato con successo!');
                resetItemForm();
            } else {
                alert('Errore: ' + (data.error || 'Creazione fallita.'));
            }
        } catch (err) {
            alert('Impossibile contattare il server.');
        }
    });
}

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

/* ============================================================
   UTILITIES
   ============================================================ */

async function ensureMuseiAutore() {
    if (allMuseiAutore.length) return;
    try {
        const r = await fetch('/api/musei');
        const d = await r.json();
        if (d.ok) allMuseiAutore = d.data;
    } catch (e) { /* silent */ }
}

function populateMuseoSelect(id, musei) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">— Seleziona museo —</option>' +
        musei.map(m => `<option value="${m.codiceIsil}">${m.nome}</option>`).join('');
}

/* ============================================================
   VISITATORE — MUSEI
   ============================================================ */

async function initVisitatoreMusei() {
    const section = document.getElementById('section-visitatore-musei');
    section.innerHTML = `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
                <h1 class="page-title">Musei</h1>
                <p class="text-muted mb-0">Esplora i musei disponibili sulla piattaforma.</p>
            </div>
            <div class="d-flex gap-2 align-items-center flex-wrap">
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

/* ============================================================
   VISITATORE — OPERE
   ============================================================ */

async function initVisitatoreOpere() {
    const section = document.getElementById('section-visitatore-opere');
    section.innerHTML = `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="page-title">Opere</h1>
                <p class="text-muted mb-0">Sfoglia le opere presenti nei musei.</p>
            </div>
            <div class="d-flex gap-3 align-items-center flex-wrap">
                <select id="filterOpereMuseo" class="custom-input" style="min-width:200px;padding:6px 12px;">
                    <option value="">Tutti i musei</option>
                </select>
                <div class="search-box-container shadow-sm py-1 px-3" style="max-width:260px;">
                    <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                    <input type="text" id="searchVisOpere" class="search-input py-2" placeholder="Cerca opera…">
                </div>
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

/* ============================================================
   VISITATORE — VISITE
   ============================================================ */

async function initVisitatoreVisite() {
    const section = document.getElementById('section-visitatore-visite');
    section.innerHTML = `
        <style>
            .vis-range-input{position:absolute;width:100%;height:4px;top:11px;left:0;appearance:none;-webkit-appearance:none;background:transparent;pointer-events:none;outline:none;}
            .vis-range-input::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#FF007F;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25);pointer-events:all;cursor:pointer;}
            .vis-range-input::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#FF007F;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25);pointer-events:all;cursor:pointer;}
        </style>
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
                <h1 class="page-title">Visite</h1>
                <p class="text-muted mb-0">Scopri le visite guidate disponibili nei musei.</p>
            </div>
            <div class="d-flex gap-2 align-items-center flex-wrap">
                <select id="filterVisiteMuseo" class="custom-input" style="min-width:160px;padding:6px 12px;height:42px;">
                    <option value="">Tutti i musei</option>
                </select>
                <select id="filterVisiteStatoVis" class="custom-input" style="min-width:140px;padding:6px 12px;height:42px;" onchange="filterVisVisite()">
                    <option value="">Tutti gli stati</option>
                    <option value="pubblica">In vendita</option>
                    <option value="privata">Privata</option>
                </select>
                <div>
                    <div style="font-size:0.82rem;font-weight:600;color:#64748b;margin-bottom:6px;white-space:nowrap;">
                        Prezzo &nbsp;—&nbsp;
                        <span id="visRangeLabelMin" style="color:#FF007F;">€0</span>
                        &nbsp;:&nbsp;
                        <span id="visRangeLabelMax" style="color:#FF007F;">∞</span>
                    </div>
                    <div style="position:relative;height:30px;min-width:160px;">
                        <div style="position:absolute;left:0;right:0;top:13px;height:4px;background:#e2e8f0;border-radius:2px;">
                            <div id="visRangeFill" style="position:absolute;height:100%;background:#FF007F;border-radius:2px;left:0%;right:0%;"></div>
                        </div>
                        <input type="range" id="visRangeMin" class="vis-range-input" min="0" max="200" value="0"   step="1" oninput="onVisVisiteRangeChange()">
                        <input type="range" id="visRangeMax" class="vis-range-input" min="0" max="200" value="200" step="1" oninput="onVisVisiteRangeChange()">
                    </div>
                </div>
                <div class="search-box-container shadow-sm py-1 px-3" style="max-width:220px;">
                    <i class="fa-solid fa-magnifying-glass search-icon" style="font-size:0.9rem;"></i>
                    <input type="text" id="searchVisVisite" class="search-input py-2" placeholder="Cerca visita…" oninput="filterVisVisite()">
                </div>
            </div>
        </div>
        <div id="visVisiteGrid" class="items-grid">
            <p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento…</p>
        </div>
    `;

    await ensureVisMusei();

    const filterSel = document.getElementById('filterVisiteMuseo');
    filterSel.innerHTML = '<option value="">Tutti i musei</option>' +
        allVisitatoreCachedMusei.map(m => `<option value="${m.codiceIsil}">${m.nome}</option>`).join('');

    await loadVisVisite('');

    filterSel.addEventListener('change', () => loadVisVisite(filterSel.value));
}

window.onVisVisiteRangeChange = function () {
    const minEl = document.getElementById('visRangeMin');
    const maxEl = document.getElementById('visRangeMax');
    if (!minEl || !maxEl) return;
    let minVal = parseFloat(minEl.value);
    let maxVal = parseFloat(maxEl.value);
    const sliderMax = parseFloat(minEl.max);
    const sliderMin = parseFloat(minEl.min);
    if (minVal > maxVal) { minEl.value = maxVal; minVal = maxVal; }
    const pct  = v => ((v - sliderMin) / (sliderMax - sliderMin)) * 100;
    const fill = document.getElementById('visRangeFill');
    if (fill) { fill.style.left = pct(minVal) + '%'; fill.style.right = (100 - pct(maxVal)) + '%'; }
    const lblMin = document.getElementById('visRangeLabelMin');
    const lblMax = document.getElementById('visRangeLabelMax');
    if (lblMin) lblMin.textContent = '€' + minVal;
    if (lblMax) lblMax.textContent = maxVal >= sliderMax ? '∞' : '€' + maxVal;
    filterVisVisite();
};

async function loadVisVisite(codiceIsil) {
    const grid = document.getElementById('visVisiteGrid');
    if (!grid) return;
    grid.className = '';
    grid.innerHTML = '<p class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento…</p>';

    const url = codiceIsil
        ? `/api/visite?codiceIsil=${encodeURIComponent(codiceIsil)}`
        : '/api/visite';

    try {
        const res  = await fetch(url);
        const data = await res.json();
        currentVisitatoreVisite = data.ok ? data.data : [];

        // Calibra slider sul prezzo massimo reale
        const prices = currentVisitatoreVisite.map(v => v.prezzo || 0).filter(p => p > 0);
        const maxP   = prices.length ? Math.ceil(Math.max(...prices)) : 200;
        const rMin = document.getElementById('visRangeMin');
        const rMax = document.getElementById('visRangeMax');
        if (rMin) { rMin.max = maxP; rMin.value = 0; }
        if (rMax) { rMax.max = maxP; rMax.value = maxP; }
        onVisVisiteRangeChange();

        filterVisVisite();
    } catch (e) {
        grid.innerHTML = '<p class="empty-msg">Errore nel caricamento delle visite.</p>';
    }
}

function filterVisVisite() {
    const q      = (document.getElementById('searchVisVisite')?.value        || '').toLowerCase();
    const stato  =  document.getElementById('filterVisiteStatoVis')?.value   || '';
    const minEl  =  document.getElementById('visRangeMin');
    const maxEl  =  document.getElementById('visRangeMax');
    const prezzoMin = minEl ? parseFloat(minEl.value) : 0;
    const prezzoMax = maxEl ? parseFloat(maxEl.value) : NaN;
    const maxIsLimit = maxEl && parseFloat(maxEl.value) < parseFloat(maxEl.max);

    let filtered = currentVisitatoreVisite;
    if (q)     filtered = filtered.filter(v =>
        (v.nomeVisita || '').toLowerCase().includes(q) ||
        (v.codiceIsil || '').toLowerCase().includes(q));
    if (stato === 'pubblica') filtered = filtered.filter(v =>  v.pubblica);
    if (stato === 'privata')  filtered = filtered.filter(v => !v.pubblica);
    if (prezzoMin > 0)    filtered = filtered.filter(v => (v.prezzo || 0) >= prezzoMin);
    if (maxIsLimit)       filtered = filtered.filter(v => (v.prezzo || 0) <= prezzoMax);
    renderVisVisite(filtered);
}

function renderVisVisite(lista) {
    const grid = document.getElementById('visVisiteGrid');
    if (!grid) return;
    if (!lista.length) {
        grid.className = '';
        grid.innerHTML = '<p class="empty-msg">Nessuna visita trovata.</p>';
        return;
    }
    grid.className = 'items-grid';
    grid.innerHTML = lista.map(v => {
        const idx = currentVisitatoreVisite.indexOf(v);
        return `
        <div class="visita-read-card scroll-card-clickable" onclick="showVisVisitaDetail(${idx})"
             style="cursor:pointer;">
            <h3>${v.nomeVisita}</h3>
            ${v.codiceIsil ? `<p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${v.codiceIsil}</p>` : ''}
            ${v.logistica  ? `<p style="margin-top:8px;font-size:0.88rem;color:#475569;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;">${v.logistica}</p>` : ''}
            <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span class="tag-bubble">
                    <i class="fa-solid fa-layer-group"></i> ${v.opereCount || 0} opere
                </span>
                <span class="tag-bubble">
                    <i class="fa-solid fa-users"></i> ${v.acquirenti || 0} acquirenti
                </span>
                ${v.prezzo > 0
                    ? `<span class="price-badge">€${v.prezzo}</span>`
                    : `<span class="free-badge">Gratis</span>`
                }
                ${v.pubblica
                    ? `<span class="tag-bubble" style="background:rgba(34,197,94,0.12);color:#16a34a;border-color:rgba(34,197,94,0.25);">
                           <i class="fa-solid fa-check"></i> In vendita
                       </span>`
                    : `<span class="tag-bubble" style="background:rgba(100,116,139,0.1);color:#64748b;">
                           <i class="fa-solid fa-lock"></i> Privata
                       </span>`
                }
            </div>
        </div>`;
    }).join('');
}

window.showVisVisitaDetail = function (idx) {
    const visita = currentVisitatoreVisite[idx];
    if (!visita) return;

    const museo   = allVisitatoreCachedMusei.find(m => m.codiceIsil === visita.codiceIsil);
    const section = document.getElementById('section-visitatore-visite');
    section.innerHTML = `
        <button class="museo-detail-back" onclick="initVisitatoreVisite()">
            <i class="fa-solid fa-arrow-left"></i> Torna alle visite
        </button>
        <h2 class="museo-detail-title">${visita.nomeVisita}</h2>
        <p class="museo-detail-sub">${museo ? museo.nome + ' · ' : ''}${visita.codiceIsil || ''}</p>
        <div class="glass-card p-4" style="margin-top:24px;">
            <div class="row g-3">
                ${visita.nomeMnemonico ? `
                <div class="col-md-6">
                    <p class="custom-label">Nome Mnemonico</p>
                    <p>${visita.nomeMnemonico}</p>
                </div>` : ''}
                <div class="col-md-3">
                    <p class="custom-label">Prezzo</p>
                    ${visita.prezzo > 0
                        ? `<span class="price-badge">€${visita.prezzo}</span>`
                        : `<span class="free-badge">Gratis</span>`
                    }
                </div>
                <div class="col-md-3">
                    <p class="custom-label">Stato</p>
                    ${visita.pubblica
                        ? `<span class="tag-bubble" style="background:rgba(34,197,94,0.12);color:#16a34a;border-color:rgba(34,197,94,0.25);">
                               <i class="fa-solid fa-check"></i> In vendita
                           </span>`
                        : `<span class="tag-bubble" style="background:rgba(100,116,139,0.1);color:#64748b;">
                               <i class="fa-solid fa-lock"></i> Privata
                           </span>`
                    }
                </div>
                <div class="col-md-3">
                    <p class="custom-label">Opere incluse</p>
                    <span class="tag-bubble"><i class="fa-solid fa-layer-group"></i> ${visita.opereCount || 0}</span>
                </div>
                <div class="col-md-3">
                    <p class="custom-label">Acquirenti</p>
                    <span class="tag-bubble"><i class="fa-solid fa-users"></i> ${visita.acquirenti || 0}</span>
                </div>
                ${visita.logistica ? `
                <div class="col-12">
                    <p class="custom-label">Logistica</p>
                    <p>${visita.logistica}</p>
                </div>` : ''}
                ${visita.quizDomanda ? `
                <div class="col-12">
                    <p class="custom-label">Domanda Quiz</p>
                    <p>${visita.quizDomanda}</p>
                </div>` : ''}
            </div>
        </div>
    `;
};

async function ensureVisMusei() {
    if (allVisitatoreCachedMusei.length) return;
    try {
        const r = await fetch('/api/musei');
        const d = await r.json();
        if (d.ok) allVisitatoreCachedMusei = d.data;
    } catch (e) { /* silent */ }
}

/* ============================================================
   ADMIN — globals
   ============================================================ */

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

/* ============================================================
   ADMIN — UTENTI
   ============================================================ */

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
    tbody.innerHTML = lista.map(u => `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-3">
                    <div class="avatar-sm">${(u.username || '?')[0].toUpperCase()}</div>
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
        </tr>`).join('');
}

window.adminDeleteUtente = async function (id, username) {
    if (!confirm(`Eliminare l'utente "${username}"?`)) return;
    try {
        const res  = await fetch(`/api/utenti/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAdminUtenti = allAdminUtenti.filter(u => u._id !== id);
            renderAdminUtenti(allAdminUtenti);
        } else {
            alert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { alert('Impossibile contattare il server.'); }
};


/* ============================================================
   ADMIN — MUSEI
   ============================================================ */

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
                    <label class="custom-label mb-1" style="font-size:0.82rem;">Città</label>
                    <select id="filterMuseiCitta" class="custom-input" style="padding:7px 12px;" onchange="filterAdminMusei()">
                        <option value="">Tutte le città</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;">Codice ISIL</label>
                    <input type="text" id="filterMuseiIsil" class="custom-input" style="padding:7px 12px;"
                           placeholder="Es. IT-RM001" oninput="filterAdminMusei()">
                </div>
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;">Curatore (ID)</label>
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
                        ? `<img src="${m.immagineCopertina}" alt="${m.nome}"
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

    // — Vista tabella —
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
    if (!confirm(`Eliminare il museo "${nome}"?`)) return;
    try {
        const res  = await fetch(`/api/musei/${codiceIsil}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAdminMusei = allAdminMusei.filter(m => m.codiceIsil !== codiceIsil);
            renderAdminMusei(allAdminMusei);
        } else {
            alert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { alert('Impossibile contattare il server.'); }
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
                    <label class="custom-label">Nome *</label>
                    <input type="text" id="amNome" class="custom-input" value="${m.nome || ''}" required>
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Città *</label>
                    <input type="text" id="amCitta" class="custom-input" value="${m.citta || ''}" required>
                </div>
                <div class="col-12">
                    <label class="custom-label">Indirizzo</label>
                    <input type="text" id="amIndirizzo" class="custom-input" value="${m.indirizzo || ''}">
                </div>
                <div class="col-md-8">
                    <label class="custom-label">URL Copertina</label>
                    <input type="url" id="amImmagine" class="custom-input" value="${m.immagineCopertina || ''}">
                </div>
                <div class="col-md-4">
                    <label class="custom-label">Codice ISIL</label>
                    <input type="text" class="custom-input" value="${m.codiceIsil}" disabled>
                </div>
                <div class="col-12">
                    <label class="custom-label">Descrizione</label>
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
            if (data.ok) { alert('Museo aggiornato!'); initAdminMusei(); }
            else alert('Errore: ' + (data.error || 'Aggiornamento fallito.'));
        } catch (err) { alert('Impossibile contattare il server.'); }
    });
};

/* ============================================================
   ADMIN — OPERE
   ============================================================ */

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
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;">Tipo</label>
                    <select id="filterOpereTipo" class="custom-input" style="padding:7px 12px;" onchange="filterAdminOpere()">
                        <option value="">Tutti i tipi</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;">Museo (ISIL)</label>
                    <select id="filterOpereMuseo" class="custom-input" style="padding:7px 12px;" onchange="filterAdminOpere()">
                        <option value="">Tutti i musei</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;">Licenza</label>
                    <select id="filterOpereLicenza" class="custom-input" style="padding:7px 12px;" onchange="filterAdminOpere()">
                        <option value="">Tutte le licenze</option>
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
                    ${adminTableHeader(['Titolo', 'Autore', 'Tipo', 'Museo', 'Licenza'])}
                    <tbody id="adminOpereBody">
                        <tr><td colspan="6" class="text-center text-muted py-4">
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
    const licenze = [...new Set(lista.map(op => op.licenza).filter(Boolean))].sort();
    const sel = (id, opts, label) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<option value="">${label}</option>` +
            opts.map(v => `<option value="${v}">${v}</option>`).join('');
    };
    sel('filterOpereTipo',    tipi,    'Tutti i tipi');
    sel('filterOpereMuseo',   musei,   'Tutti i musei');
    sel('filterOpereLicenza', licenze, 'Tutte le licenze');
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
    ['filterOpereTipo', 'filterOpereMuseo', 'filterOpereLicenza'].forEach(id => {
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
    const licenza =  document.getElementById('filterOpereLicenza')?.value || '';

    let lista = allAdminOpere;
    if (q)       lista = lista.filter(op =>
        (op.operaId || '').toLowerCase().includes(q) ||
        (op.autore  || '').toLowerCase().includes(q) ||
        (op.tipo    || '').toLowerCase().includes(q));
    if (tipo)    lista = lista.filter(op => op.tipo    === tipo);
    if (museo)   lista = lista.filter(op => op.codiceIsil === museo);
    if (licenza) lista = lista.filter(op => op.licenza === licenza);
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
                        ? `<img src="${op.immagine}" alt="${op.operaId}"
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
                            ${op.licenza ? `<span class="tag-bubble" style="font-size:0.72rem;">${op.licenza}</span>` : ''}
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

    // — Vista tabella —
    container.innerHTML = `
        <div class="glass-card p-4">
            <table class="table table-hover mb-0">
                ${adminTableHeader(['Titolo', 'Autore', 'Tipo', 'Museo', 'Licenza'])}
                <tbody id="adminOpereBody"></tbody>
            </table>
        </div>`;
    const tbody = document.getElementById('adminOpereBody');
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Nessuna opera trovata.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(op => `
        <tr>
            <td class="fw-bold">${op.operaId}</td>
            <td>${op.autore || '—'}</td>
            <td>${op.tipo    ? `<span class="tag-bubble" style="font-size:0.78rem;">${op.tipo}</span>`    : '—'}</td>
            <td><small class="text-muted">${op.codiceIsil || '—'}</small></td>
            <td>${op.licenza ? `<span class="tag-bubble" style="font-size:0.78rem;">${op.licenza}</span>` : '—'}</td>
            <td>${adminActionBtns(
                `adminEditOpera('${op._id}')`,
                `adminDeleteOpera('${op._id}','${(op.operaId || '').replace(/'/g, "\\'")}')`
            )}</td>
        </tr>`).join('');
}

window.adminDeleteOpera = async function (id, nome) {
    if (!confirm(`Eliminare l'opera "${nome}"?`)) return;
    try {
        const res  = await fetch(`/api/opere/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAdminOpere = allAdminOpere.filter(op => op._id !== id);
            renderAdminOpere(allAdminOpere);
        } else {
            alert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { alert('Impossibile contattare il server.'); }
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
                    <label class="custom-label">Titolo / ID Opera *</label>
                    <input type="text" id="aoOperaId" class="custom-input" value="${op.operaId || ''}" required>
                </div>
                <div class="col-md-4">
                    <label class="custom-label">Tipo *</label>
                    <select id="aoTipo" class="custom-input" required>
                        <option value="quadro"  ${op.tipo === 'quadro'  ? 'selected' : ''}>Quadro</option>
                        <option value="statua"  ${op.tipo === 'statua'  ? 'selected' : ''}>Statua</option>
                        <option value="altro"   ${op.tipo === 'altro'   ? 'selected' : ''}>Altro</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Autore</label>
                    <input type="text" id="aoAutore" class="custom-input" value="${op.autore || ''}">
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Datazione</label>
                    <input type="text" id="aoDatazione" class="custom-input" value="${op.datazione || ''}">
                </div>
                <div class="col-md-4">
                    <label class="custom-label">Linguaggio</label>
                    <select id="aoLinguaggio" class="custom-input">
                        ${['semplice','infantile','medio','specialistico'].map(v =>
                            `<option value="${v}" ${op.linguaggio === v ? 'selected' : ''}>${v}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="custom-label">Lunghezza</label>
                    <select id="aoLunghezza" class="custom-input">
                        ${[['15s','15 secondi'],['1min','1 minuto'],['4min','4 minuti']].map(([v,l]) =>
                            `<option value="${v}" ${op.lunghezza === v ? 'selected' : ''}>${l}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="custom-label">Licenza</label>
                    <select id="aoLicenza" class="custom-input">
                        <option value="gratuita" ${op.licenza === 'gratuita' ? 'selected' : ''}>Gratuita</option>
                        <option value="premium"  ${op.licenza === 'premium'  ? 'selected' : ''}>Premium</option>
                    </select>
                </div>
                <div class="col-12">
                    <label class="custom-label">URL Immagine</label>
                    <input type="url" id="aoImmagine" class="custom-input" value="${op.immagine || ''}">
                </div>
                <div class="col-12">
                    <label class="custom-label">Descrizione</label>
                    <textarea id="aoDescrizione" class="custom-input" rows="3">${op.descrizione || ''}</textarea>
                </div>
                <div class="col-12">
                    <label class="custom-label">Testo Audioguida</label>
                    <textarea id="aoTesto" class="custom-input" rows="4">${op.testo || ''}</textarea>
                </div>
                <div class="col-md-4">
                    <label class="custom-label">Prezzo (€)</label>
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
            licenza:    document.getElementById('aoLicenza').value,
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
            if (data.ok) { alert('Opera aggiornata!'); initAdminOpere(); }
            else alert('Errore: ' + (data.error || 'Aggiornamento fallito.'));
        } catch (err) { alert('Impossibile contattare il server.'); }
    });
};

/* ============================================================
   ADMIN — VISITE
   ============================================================ */

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
                    <label class="custom-label mb-1" style="font-size:0.82rem;">Museo (ISIL)</label>
                    <select id="filterVisiteMuseo" class="custom-input" style="padding:7px 12px;" onchange="filterAdminVisite()">
                        <option value="">Tutti i musei</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;">Stato</label>
                    <select id="filterVisiteStato" class="custom-input" style="padding:7px 12px;" onchange="filterAdminVisite()">
                        <option value="">Tutti gli stati</option>
                        <option value="pubblica">In vendita</option>
                        <option value="privata">Privata</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="custom-label mb-1" style="font-size:0.82rem;">Prezzo</label>
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
    if (!confirm(`Eliminare la visita "${nome}"?`)) return;
    try {
        const res  = await fetch(`/api/visite/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAdminVisite = allAdminVisite.filter(v => v._id !== id);
            renderAdminVisite(allAdminVisite);
        } else {
            alert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { alert('Impossibile contattare il server.'); }
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
                    <label class="custom-label">Nome Visita *</label>
                    <input type="text" id="avNome" class="custom-input" value="${v.nomeVisita || ''}" required>
                </div>
                <div class="col-md-4">
                    <label class="custom-label">Prezzo (€)</label>
                    <input type="number" id="avPrezzo" class="custom-input" min="0" step="0.01" value="${v.prezzo || 0}">
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Nome Mnemonico</label>
                    <input type="text" id="avNomeMnemonico" class="custom-input" value="${v.nomeMnemonico || ''}">
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Domanda Quiz</label>
                    <input type="text" id="avQuizDomanda" class="custom-input" value="${v.quizDomanda || ''}">
                </div>
                <div class="col-12">
                    <label class="custom-label">Logistica</label>
                    <textarea id="avLogistica" class="custom-input" rows="3">${v.logistica || ''}</textarea>
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Museo (ISIL)</label>
                    <input type="text" id="avIsil" class="custom-input" value="${v.codiceIsil || ''}">
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Acquirenti</label>
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
        };
        try {
            const res  = await fetch(`/api/visite/${v._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) { alert('Visita aggiornata!'); initAdminVisite(); }
            else alert('Errore: ' + (data.error || 'Aggiornamento fallito.'));
        } catch (err) { alert('Impossibile contattare il server.'); }
    });
};

/* ============================================================
   ADMIN — ITEMS
   ============================================================ */

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
                    <label class="custom-label mb-1" style="font-size:0.82rem;">Autore (ID)</label>
                    <select id="filterItemsAutore" class="custom-input" style="padding:7px 12px;" onchange="filterAdminItems()">
                        <option value="">Tutti gli autori</option>
                    </select>
                </div>
                <div class="col-md-5">
                    <label class="custom-label mb-1" style="font-size:0.82rem;">Museo (ID)</label>
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
                ${adminTableHeader(['Opera', 'Museo', 'Contenuto', 'Autore'])}
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
        (it.operaId  || '').toLowerCase().includes(q) ||
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
        const preview = (it.toni?.semplice?.testo || '').slice(0, 60);
        return `
        <tr>
            <td class="fw-bold">${it.operaId || '—'}</td>
            <td><small class="text-muted">${it.museumId || '—'}</small></td>
            <td><small>${preview}${preview.length >= 60 ? '…' : ''}</small></td>
            <td><small class="text-muted">${it.authorId || '—'}</small></td>
            <td>${adminActionBtns(
                `adminEditItem('${it._id}')`,
                `adminDeleteItem('${it._id}','${(it.operaId || '').replace(/'/g, "\\'")}')`
            )}</td>
        </tr>`;
    }).join('');
}

window.adminDeleteItem = async function (id, operaId) {
    if (!confirm(`Eliminare l'item dell'opera "${operaId}"?`)) return;
    try {
        const res  = await fetch(`/api/items/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
            allAdminItems = allAdminItems.filter(it => it._id !== id);
            renderAdminItems(allAdminItems);
        } else {
            alert('Errore: ' + (data.error || 'Eliminazione fallita.'));
        }
    } catch (e) { alert('Impossibile contattare il server.'); }
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
        <p class="museo-detail-sub">Opera: ${it.operaId || '—'}</p>
        <div class="glass-card p-5 mt-4">
            <form id="adminItemForm" class="row g-4">
                <div class="col-12">
                    <label class="custom-label">
                        Tono <strong>Semplice</strong>
                        <span class="toni-dur-label">~3 s · linguaggio elementare</span>
                    </label>
                    <textarea id="aiSemplice" class="custom-input" rows="2">${toni.semplice?.testo || ''}</textarea>
                </div>
                <div class="col-12">
                    <label class="custom-label">
                        Tono <strong>Medio</strong>
                        <span class="toni-dur-label">~15 s · pubblico generale</span>
                    </label>
                    <textarea id="aiMedio" class="custom-input" rows="3">${toni.medio?.testo || ''}</textarea>
                </div>
                <div class="col-12">
                    <label class="custom-label">
                        Tono <strong>Avanzato</strong>
                        <span class="toni-dur-label">~40 s · terminologia tecnica</span>
                    </label>
                    <textarea id="aiAvanzato" class="custom-input" rows="5">${toni.avanzato?.testo || ''}</textarea>
                </div>
                <div class="col-md-6">
                    <label class="custom-label">Opera (ID)</label>
                    <input type="text" class="custom-input" value="${it.operaId || ''}" disabled>
                </div>
                <div class="col-md-6">
                    <label class="custom-label">URL Immagine</label>
                    <input type="url" id="aiImmagine" class="custom-input" value="${it.image || ''}">
                </div>
                <div class="col-12">
                    <label class="custom-label">Metadata (JSON)</label>
                    <textarea id="aiMetadata" class="custom-input" rows="5"
                              style="font-family:monospace;font-size:0.85rem;">${metaJson}</textarea>
                </div>
                <div class="col-12 d-flex justify-content-end gap-3 pt-3" style="border-top:1px solid #e2e8f0;">
                    <button type="button" class="btn-outline-custom" onclick="initAdminItems()">Annulla</button>
                    <button type="submit" class="btn-magenta">Salva Modifiche</button>
                </div>
            </form>
        </div>`;

    document.getElementById('adminItemForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        let metadata;
        try {
            metadata = JSON.parse(document.getElementById('aiMetadata').value || '{}');
        } catch (_) {
            alert('Il campo Metadata non è un JSON valido.');
            return;
        }
        const body = {
            toni: {
                semplice: { testo: document.getElementById('aiSemplice').value.trim(), durata: 3  },
                medio:    { testo: document.getElementById('aiMedio').value.trim(),    durata: 15 },
                avanzato: { testo: document.getElementById('aiAvanzato').value.trim(), durata: 40 },
            },
            image:    document.getElementById('aiImmagine').value.trim(),
            metadata,
            operaId:  it.operaId,
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
            if (data.ok) { alert('Item aggiornato!'); initAdminItems(); }
            else alert('Errore: ' + (data.error || 'Aggiornamento fallito.'));
        } catch (err) { alert('Impossibile contattare il server.'); }
    });
};

/* ============================================================
   ADMIN — ANALYTICS
   ============================================================ */

async function initAdminAnalytics() {
    const section = document.getElementById('section-admin-analytics');
    section.innerHTML = `
        <h1 class="page-title">Analytics</h1>
        <p class="text-muted mb-4">Panoramica delle statistiche della piattaforma.</p>
        <div id="analyticsKpis" class="row g-4 mb-5">
            <div class="col-12 text-center text-muted py-4">
                <i class="fa-solid fa-spinner fa-spin me-2"></i>Caricamento dati…
            </div>
        </div>
        <div class="row g-4">
            <div class="col-md-6">
                <div class="glass-card p-4">
                    <h5 class="fw-bold mb-3">Distribuzione Visite</h5>
                    <div id="analyticsVisteChart" class="d-flex justify-content-around align-items-center gap-3"></div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="glass-card p-4">
                    <h5 class="fw-bold mb-3">Items per Opera (Top 5)</h5>
                    <div id="analyticsItemsChart"></div>
                </div>
            </div>
        </div>`;

    try {
        const [rU, rM, rOp, rV, rIt] = await Promise.all([
            fetch('/api/utenti'), fetch('/api/musei'),
            fetch('/api/opere'),  fetch('/api/visite'), fetch('/api/items'),
        ]);
        const [dU, dM, dOp, dV, dIt] = await Promise.all([
            rU.json(), rM.json(), rOp.json(), rV.json(), rIt.json(),
        ]);

        const utenti  = dU.ok  ? dU.data  : [];
        const musei   = dM.ok  ? dM.data  : [];
        const opere   = dOp.ok ? dOp.data : [];
        const visite  = dV.ok  ? dV.data  : [];
        const items   = dIt.ok ? dIt.data : [];

        const visPubliche     = visite.filter(v => v.pubblica).length;
        const visGratuite     = visite.filter(v => !v.prezzo || v.prezzo === 0).length;
        const totalAcquirenti = visite.reduce((s, v) => s + (v.acquirenti || 0), 0);

        const roleCount = { curatore: 0, autore: 0, visitatore: 0, admin: 0 };
        utenti.forEach(u => { if (roleCount[u.ruolo] !== undefined) roleCount[u.ruolo]++; else roleCount[u.ruolo] = 1; });

        const kpiCard = (val, label, icon) => `
            <div class="col-6 col-md-4 col-lg-2">
                <div class="glass-card p-3 text-center">
                    <i class="fa-solid ${icon} mb-2 d-block kpi-icon"></i>
                    <span class="d-block fw-bold h3 mb-1" style="color:#e91e8c;line-height:1;">${val}</span>
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

        document.getElementById('analyticsVisteChart').innerHTML =
            visite.length
                ? adminPieDonut([
                    { label: 'Pubbliche', value: visPubliche,                 color: '#e91e8c' },
                    { label: 'Private',   value: visite.length - visPubliche, color: '#334155' },
                  ], 'Stato') +
                  adminPieDonut([
                    { label: 'Gratuite',    value: visGratuite,                 color: '#22c55e' },
                    { label: 'A pagamento', value: visite.length - visGratuite, color: '#f59e0b' },
                  ], 'Prezzo')
                : '<p class="text-muted text-center w-100">Nessun dato.</p>';

        const barChart = (data, colorFn) => data.map(([label, val, max]) => `
            <div class="mb-3">
                <div class="d-flex justify-content-between mb-1">
                    <small class="fw-bold">${label}</small>
                    <small class="text-muted">${val}</small>
                </div>
                <div class="analytics-bar-track">
                    <div style="width:${max ? Math.round(val/max*100) : 0}%;background:${colorFn()};border-radius:4px;height:8px;transition:width .4s;"></div>
                </div>
            </div>`).join('');

        const itemCounts = {};
        items.forEach(it => { itemCounts[it.operaId] = (itemCounts[it.operaId] || 0) + 1; });
        const top5 = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxItems = top5[0]?.[1] || 1;
        document.getElementById('analyticsItemsChart').innerHTML =
            top5.length
                ? barChart(top5.map(([k, v]) => [k, v, maxItems]), () => '#6366f1')
                : '<p class="text-muted">Nessun dato.</p>';

    } catch (e) {
        document.getElementById('analyticsKpis').innerHTML =
            '<div class="col-12 text-center text-danger py-4">Errore nel caricamento dei dati.</div>';
    }
}

/* ============================================================
   ADMIN PIE DONUT — SVG semplice per analytics
   ============================================================ */

function adminPieDonut(slices, title) {
    const total = slices.reduce((s, d) => s + d.value, 0);
    if (!total) return `<div class="text-center text-muted small py-2">${title}<br>Nessun dato</div>`;

    const size = 120, cx = 60, cy = 60, R = 50, r = 30;
    let angle = -90;
    const paths = slices.map(d => {
        const sweep = (d.value / total) * 360;
        const a1 = angle * Math.PI / 180;
        const a2 = (angle + sweep - 1.5) * Math.PI / 180;
        angle += sweep;
        const large = sweep > 180 ? 1 : 0;
        const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
        const xi1 = cx + r * Math.cos(a2), yi1 = cy + r * Math.sin(a2);
        const xi2 = cx + r * Math.cos(a1), yi2 = cy + r * Math.sin(a1);
        return `<path d="M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${xi1},${yi1} A${r},${r} 0 ${large} 0 ${xi2},${yi2} Z" fill="${d.color}">
            <title>${d.label}: ${d.value} (${Math.round(d.value/total*100)}%)</title></path>`;
    }).join('');

    const legend = slices.map(d => `
        <div class="d-flex align-items-center gap-1 justify-content-center">
            <span style="width:7px;height:7px;border-radius:50%;background:${d.color};display:inline-block;flex-shrink:0;"></span>
            <span class="donut-legend-text">${d.label} <b class="donut-legend-val">${d.value}</b></span>
        </div>`).join('');

    return `
        <div class="text-center">
            <div class="donut-title">${title}</div>
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;margin:0 auto 8px;">
                ${paths}
                <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="15" font-weight="700" class="donut-center-val">${total}</text>
            </svg>
            <div class="d-flex flex-column gap-1">${legend}</div>
        </div>`;
}

/* ============================================================
   MARKETPLACE — condiviso fra tutti i ruoli
   ============================================================ */

let allMktItems  = [];
let allMktVisite = [];
let allMktMusei  = [];
let mktTab = 'items';

function getMktPurchases() {
    try {
        return JSON.parse(localStorage.getItem('purchases_' + SESSION.userId) || '{"items":[],"visite":[]}');
    } catch { return { items: [], visite: [] }; }
}

function saveMktPurchases(p) {
    localStorage.setItem('purchases_' + SESSION.userId, JSON.stringify(p));
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
                           placeholder="Parola chiave…" oninput="applyMktFilter()">
                </div>
            </div>
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
        allMktItems  = dItems.ok  ? dItems.data.filter(it => it.authorId !== SESSION.userId) : [];
        allMktVisite = dVisite.ok ? dVisite.data.filter(v => v.pubblica && v.autoreId !== SESSION.userId) : [];
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

    // Calcola prezzo massimo reale per calibrare lo slider
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
}

function _populateMktOpereSelect(codiceIsil) {
    const sel = document.getElementById('mktFilterOpera');
    if (!sel) return;
    const source = codiceIsil
        ? allMktItems.filter(it => it.museumId === codiceIsil)
        : allMktItems;
    const unique = [...new Set(source.map(it => it.operaId))].sort();
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

window.applyMktFilter = function () {
    const museoVal  = document.getElementById('mktFilterMuseo')?.value  || '';
    const operaVal  = document.getElementById('mktFilterOpera')?.value  || '';
    const lingVal   = document.getElementById('mktFilterLinguaggio')?.value || '';
    const q         = (document.getElementById('mktSearch')?.value || '').toLowerCase();

    const minEl = document.getElementById('mktRangeMin');
    const maxEl = document.getElementById('mktRangeMax');
    const prezzoMin = minEl ? parseFloat(minEl.value) : 0;
    const prezzoMax = maxEl ? parseFloat(maxEl.value) : NaN;
    const maxIsLimit = maxEl && parseFloat(maxEl.value) < parseFloat(maxEl.max);

    const content = document.getElementById('mktContent');
    if (!content) return;

    const purchases = getMktPurchases();

    if (mktTab === 'acquisti') {
        renderMktAcquisti(purchases);
        return;
    }

    const applyPriceFilter = (price) =>
        (prezzoMin <= 0 || price >= prezzoMin) && (!maxIsLimit || price <= prezzoMax);

    if (mktTab === 'visite') {
        let lista = allMktVisite;
        if (museoVal) lista = lista.filter(v => v.codiceIsil === museoVal);
        lista = lista.filter(v => applyPriceFilter(v.prezzo || 0));
        if (q) lista = lista.filter(v =>
            (v.nomeVisita || '').toLowerCase().includes(q) ||
            (v.logistica  || '').toLowerCase().includes(q));
        renderMktVisite(lista, purchases.visite);
    } else {
        let lista = allMktItems;
        if (museoVal) lista = lista.filter(it => it.museumId === museoVal);
        if (operaVal) lista = lista.filter(it => it.operaId  === operaVal);
        lista = lista.filter(it => applyPriceFilter(it.metadata?.prezzo || 0));
        if (lingVal) lista = lista.filter(it => (it.metadata?.linguaggio || '') === lingVal);
        if (q) lista = lista.filter(it => {
            const allText = [
                it.operaId || '',
                it.toni?.semplice?.testo || '',
                it.toni?.medio?.testo    || '',
                it.toni?.avanzato?.testo || '',
            ].join(' ').toLowerCase();
            return allText.includes(q);
        });
        renderMktItems(lista, purchases.items);
    }
};

function renderMktItems(lista, purchasedIds) {
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
        const museo  = allMktMusei.find(m => m.codiceIsil === it.museumId);
        return `
        <div class="item-read-card">
            ${it.image ? `<img src="${it.image}" alt="item" onerror="this.style.display='none'">` : ''}
            <h3 style="font-weight:700;font-size:1rem;margin-bottom:6px;">${it.operaId}</h3>
            ${museo ? `<p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${museo.nome}</p>` : ''}
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
                ${bought
                    ? `<span class="tag-bubble" style="background:rgba(34,197,94,0.12);color:#16a34a;border-color:rgba(34,197,94,0.25);">
                           <i class="fa-solid fa-check"></i> Acquistato
                       </span>`
                    : `<button class="btn-magenta" style="padding:6px 14px;font-size:0.82rem;"
                               onclick="acquistaItem('${it._id}')">
                           <i class="fa-solid fa-cart-plus me-1"></i>
                           ${prezzo > 0 ? 'Acquista' : 'Ottieni gratis'}
                       </button>`
                }
            </div>
        </div>`;
    }).join('');
}

function renderMktVisite(lista, purchasedIds) {
    const content = document.getElementById('mktContent');
    if (!lista.length) {
        content.className = '';
        content.innerHTML = '<p class="empty-msg">Nessuna visita in vendita trovata.</p>';
        return;
    }
    content.className = 'items-grid';
    content.innerHTML = lista.map(v => {
        const bought = purchasedIds.includes(v._id);
        const museo  = allMktMusei.find(m => m.codiceIsil === v.codiceIsil);
        return `
        <div class="visita-read-card">
            <h3>${v.nomeVisita}</h3>
            ${museo ? `<p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${museo.nome}</p>` : ''}
            ${v.nomeMnemonico ? `<p class="opera-meta" style="font-size:0.8rem;color:#94a3b8;">${v.nomeMnemonico}</p>` : ''}
            ${v.logistica ? `<p style="font-size:0.88rem;color:#475569;margin-top:8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;">${v.logistica}</p>` : ''}
            <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span class="tag-bubble"><i class="fa-solid fa-layer-group"></i> ${v.opereCount || 0} opere</span>
                <span class="tag-bubble"><i class="fa-solid fa-users"></i> ${v.acquirenti || 0} acquirenti</span>
                ${v.prezzo > 0
                    ? `<span class="price-badge">€${v.prezzo}</span>`
                    : `<span class="free-badge">Gratis</span>`
                }
            </div>
            <div style="margin-top:12px;">
                ${bought
                    ? `<span class="tag-bubble" style="background:rgba(34,197,94,0.12);color:#16a34a;border-color:rgba(34,197,94,0.25);">
                           <i class="fa-solid fa-check"></i> Acquistata
                       </span>`
                    : `<button class="btn-magenta" style="padding:6px 14px;font-size:0.82rem;"
                               onclick="acquistaVisita('${v._id}')">
                           <i class="fa-solid fa-cart-plus me-1"></i>
                           ${v.prezzo > 0 ? 'Acquista' : 'Ottieni gratis'}
                       </button>`
                }
            </div>
        </div>`;
    }).join('');
}

function renderMktAcquisti(purchases) {
    const content = document.getElementById('mktContent');
    const purchasedItems  = allMktItems.filter(it => purchases.items.includes(it._id));
    const purchasedVisite = allMktVisite.filter(v  => purchases.visite.includes(v._id));

    if (!purchasedItems.length && !purchasedVisite.length) {
        content.className = '';
        content.innerHTML = `
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
                <h3 style="font-weight:700;font-size:1rem;margin-bottom:6px;">${it.operaId}</h3>
                ${museo ? `<p class="opera-meta"><i class="fa-solid fa-building-columns"></i> ${museo.nome}</p>` : ''}
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

window.acquistaItem = function (id) {
    const item = allMktItems.find(it => it._id === id);
    if (!item) return;
    const prezzo = item.metadata?.prezzo || 0;
    const msg = prezzo > 0
        ? `Acquistare questo item per €${prezzo}?`
        : 'Ottenere questo item gratuitamente?';
    if (!confirm(msg)) return;
    const p = getMktPurchases();
    if (!p.items.includes(id)) p.items.push(id);
    saveMktPurchases(p);
    applyMktFilter();
};

/* ============================================================
   ADMIN — NAVIGATOR EXPORT
   ============================================================ */

async function initAdminNavigator() {
    const section = document.getElementById('section-admin-navigator');
    section.innerHTML = `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="page-title">Esportazione Navigator</h1>
                <p class="text-muted mb-0">Seleziona un museo per esportarne i metadati e aprirlo nel Navigator.</p>
            </div>
        </div>
        <div class="glass-card p-4">
            <div class="row g-3 align-items-end">
                <div class="col-md-6">
                    <label class="custom-label">Museo da esportare</label>
                    <select id="navMuseoSelect" class="custom-input" onchange="onNavMuseoChange()">
                        <option value="">— scegli un museo —</option>
                    </select>
                </div>
            </div>
            <div id="navPreview" class="mt-4"></div>
        </div>`;

    try {
        const res  = await fetch('/api/musei');
        const data = await res.json();
        const sel  = document.getElementById('navMuseoSelect');
        (data.data || []).forEach(m => {
            const opt = document.createElement('option');
            opt.value       = m.codiceIsil;
            opt.textContent = `${m.nome} (${m.codiceIsil})`;
            sel.appendChild(opt);
        });
    } catch (_) {}
}

window.onNavMuseoChange = async function () {
    const codiceIsil = document.getElementById('navMuseoSelect')?.value;
    const preview    = document.getElementById('navPreview');
    if (!preview) return;
    if (!codiceIsil) { preview.innerHTML = ''; return; }

    preview.innerHTML = `<div class="text-center py-4 text-muted">
        <i class="fa-solid fa-spinner fa-spin me-2"></i>Caricamento dati museo…</div>`;

    try {
        const museoRes = await fetch(`/api/musei/${codiceIsil}`);
        const museo    = (await museoRes.json()).data;
        if (!museo) throw new Error('Museo non trovato');

        const [opereRes, visiteRes, itemsRes] = await Promise.all([
            fetch(`/api/opere?codiceIsil=${codiceIsil}`),
            fetch(`/api/visite?codiceIsil=${codiceIsil}`),
            fetch(`/api/items?museumId=${museo._id}`),
        ]);
        const opere  = (await opereRes.json()).data  || [];
        const visite = (await visiteRes.json()).data || [];
        const items  = (await itemsRes.json()).data  || [];

        preview.innerHTML = `
            <div class="row g-3 mb-4">
                <div class="col-12">
                    <div class="p-3 rounded-3" style="background:rgba(255,0,127,0.06);border:1px solid rgba(255,0,127,0.15);">
                        <div class="fw-bold mb-1">${museo.nome}</div>
                        <small class="text-muted">${museo.citta || ''} · ISIL: <code>${museo.codiceIsil}</code></small>
                        ${museo.descrizioneBreve ? `<p class="mb-0 mt-1" style="font-size:0.85rem;">${museo.descrizioneBreve}</p>` : ''}
                    </div>
                </div>
                <div class="col-4">
                    <div class="glass-card p-3 text-center">
                        <div class="fw-bold" style="font-size:1.8rem;color:var(--magenta)">${opere.length}</div>
                        <small class="text-muted">Opere</small>
                    </div>
                </div>
                <div class="col-4">
                    <div class="glass-card p-3 text-center">
                        <div class="fw-bold" style="font-size:1.8rem;color:var(--magenta)">${visite.length}</div>
                        <small class="text-muted">Visite</small>
                    </div>
                </div>
                <div class="col-4">
                    <div class="glass-card p-3 text-center">
                        <div class="fw-bold" style="font-size:1.8rem;color:var(--magenta)">${items.length}</div>
                        <small class="text-muted">Items</small>
                    </div>
                </div>
            </div>
            <div class="d-flex gap-3 flex-wrap">
                <button class="btn-magenta"
                        onclick="esportaNavigator('${codiceIsil}')">
                    <i class="fa-solid fa-file-export me-2"></i>Scarica JSON
                </button>
                <a href="/Navigator/index.html?museo=${codiceIsil}" target="_blank"
                   class="btn-outline-custom" style="text-decoration:none;">
                    <i class="fa-solid fa-compass me-2"></i>Apri Navigator
                </a>
            </div>`;
    } catch (e) {
        preview.innerHTML = `<div class="text-danger"><i class="fa-solid fa-triangle-exclamation me-2"></i>${e.message}</div>`;
    }
};

window.esportaNavigator = async function (codiceIsil) {
    try {
        const museoRes = await fetch(`/api/musei/${codiceIsil}`);
        const museo    = (await museoRes.json()).data;
        if (!museo) throw new Error('Museo non trovato');

        const [opereRes, visiteRes, itemsRes] = await Promise.all([
            fetch(`/api/opere?codiceIsil=${codiceIsil}`),
            fetch(`/api/visite?codiceIsil=${codiceIsil}`),
            fetch(`/api/items?museumId=${museo._id}`),
        ]);
        const bundle = {
            museo,
            opere:  (await opereRes.json()).data  || [],
            visite: (await visiteRes.json()).data || [],
            items:  (await itemsRes.json()).data  || [],
            exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `navigator-${codiceIsil}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert('Errore durante l\'esportazione: ' + e.message);
    }
};

/* ============================================================
   CURATORE — GESTIONE QUIZ NAVIGATOR (18-27)
   ============================================================ */

let quizCurrentVisite   = [];
let quizCurrentVisitaId = null;
let quizDomande         = [];

function _quizKey(visitaId) {
    return `quiz_${SESSION.userId}_${visitaId}`;
}

function _loadQuiz(visitaId) {
    try { return JSON.parse(localStorage.getItem(_quizKey(visitaId)) || '[]'); }
    catch { return []; }
}

function _saveQuiz(visitaId, domande) {
    localStorage.setItem(_quizKey(visitaId), JSON.stringify(domande));
}

async function initCuratoreQuiz() {
    const section = document.getElementById('section-curatore-quiz');
    section.innerHTML = `
        <div class="mb-5">
            <h1 class="page-title">Gestione Quiz</h1>
            <p class="text-muted mb-0">Crea domande a scelta multipla per le tue visite Navigator.</p>
        </div>
        <div class="glass-card p-5">
            <div class="mb-4">
                <label class="custom-label">Seleziona la visita</label>
                <select id="quizSelectVisita" class="custom-input" onchange="onQuizVisitaChange()">
                    <option value="">— Seleziona una visita —</option>
                </select>
            </div>
            <div id="quizEditor" style="display:none;"></div>
        </div>`;

    await ensureMuseiAutore();

    const allVisite = [];
    await Promise.all(allMuseiAutore.map(async m => {
        try {
            const res  = await fetch(`/api/visite?codiceIsil=${encodeURIComponent(m.codiceIsil)}`);
            const data = await res.json();
            if (data.ok) allVisite.push(...data.data);
        } catch {}
    }));
    quizCurrentVisite = allVisite;

    const sel = document.getElementById('quizSelectVisita');
    if (!sel) return;
    if (!allVisite.length) {
        sel.innerHTML = '<option value="">Nessuna visita disponibile</option>';
    } else {
        sel.innerHTML = '<option value="">— Seleziona una visita —</option>' +
            allVisite.map(v =>
                `<option value="${v._id}">${v.nomeVisita}${v.nomeMnemonico ? ' (' + v.nomeMnemonico + ')' : ''}</option>`
            ).join('');
    }
}

window.onQuizVisitaChange = function () {
    const sel    = document.getElementById('quizSelectVisita');
    const editor = document.getElementById('quizEditor');
    if (!sel || !editor) return;
    quizCurrentVisitaId = sel.value;
    if (!quizCurrentVisitaId) { editor.style.display = 'none'; return; }
    quizDomande = _loadQuiz(quizCurrentVisitaId);
    editor.style.display = 'block';
    _renderQuizEditor();
};

function _renderQuizEditor() {
    const editor = document.getElementById('quizEditor');
    if (!editor) return;

    const domHtml = quizDomande.length
        ? quizDomande.map((d, i) => `
            <div class="glass-card p-4 mb-3">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <span class="custom-label" style="margin:0;">Domanda ${i + 1}</span>
                    <div class="d-flex gap-2">
                        <button class="btn-outline-custom" style="padding:4px 10px;font-size:0.8rem;"
                                onclick="editQuizDomanda(${i})">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-outline-custom"
                                style="padding:4px 10px;font-size:0.8rem;border-color:#ef4444;color:#ef4444;"
                                onclick="deleteQuizDomanda(${i})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p style="font-weight:600;margin-bottom:10px;">${d.testo}</p>
                <div class="row g-2">
                    ${d.opzioni.map((o, j) => `
                        <div class="col-md-6">
                            <div style="padding:8px 12px;border-radius:8px;font-size:0.88rem;
                                 background:${j === d.corretta ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.03)'};
                                 border:1px solid ${j === d.corretta ? 'rgba(34,197,94,0.3)' : '#e2e8f0'};
                                 color:${j === d.corretta ? '#16a34a' : 'inherit'};">
                                <i class="fa-solid ${j === d.corretta ? 'fa-check-circle' : 'fa-circle'} me-2"
                                   style="font-size:0.8rem;"></i>
                                ${['A','B','C','D'][j]}. ${o}
                            </div>
                        </div>`).join('')}
                </div>
            </div>`).join('')
        : '<p class="text-muted" style="padding:16px 0;">Nessuna domanda ancora. Usa il form qui sotto per aggiungerne una.</p>';

    editor.innerHTML = `
        <div class="mb-2 d-flex justify-content-between align-items-center">
            <h5 class="fw-bold mb-0">
                <i class="fa-solid fa-list-check me-2" style="color:var(--magenta)"></i>
                Domande del Quiz
                <span style="background:var(--magenta);color:#fff;border-radius:20px;
                             padding:2px 10px;font-size:0.78rem;margin-left:6px;">
                    ${quizDomande.length}
                </span>
            </h5>
        </div>
        <div id="quizDomandeList" class="mb-4">${domHtml}</div>
        <hr style="border-color:#e2e8f0;margin:24px 0;">
        <h5 class="fw-bold mb-4" id="quizFormTitle">
            <i class="fa-solid fa-plus-circle me-2" style="color:var(--magenta)"></i>
            Aggiungi Domanda
        </h5>
        <div class="row g-3">
            <div class="col-12">
                <label class="custom-label">Testo della domanda *</label>
                <input type="text" id="qfTesto" class="custom-input"
                       placeholder="Es: Chi ha dipinto La Primavera?">
            </div>
            ${['A','B','C','D'].map((letter, i) => `
            <div class="col-md-6">
                <label class="custom-label">Risposta ${letter} *</label>
                <input type="text" id="qfOpzione${i}" class="custom-input"
                       placeholder="Opzione ${letter}…">
            </div>`).join('')}
            <div class="col-12">
                <label class="custom-label">Risposta corretta *</label>
                <div class="d-flex gap-3 flex-wrap mt-1">
                    ${['A','B','C','D'].map((letter, i) => `
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;
                                  padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;
                                  transition:all .18s;" id="qfCorrettaLabel${i}">
                        <input type="radio" name="qfCorretta" value="${i}"
                               style="width:auto;accent-color:var(--magenta,#FF007F);"
                               onchange="highlightCorrettaLabel()">
                        <span style="font-weight:600;">${letter}</span>
                    </label>`).join('')}
                </div>
            </div>
            <input type="hidden" id="qfEditIndex" value="-1">
            <div class="col-12 d-flex justify-content-end gap-3 pt-3"
                 style="border-top:1px solid #e2e8f0;">
                <button type="button" class="btn-outline-custom" onclick="resetQuizForm()">Annulla</button>
                <button type="button" class="btn-magenta" onclick="salvaQuizDomanda()">
                    <i class="fa-solid fa-floppy-disk me-2"></i>Salva Domanda
                </button>
            </div>
        </div>`;
}

window.highlightCorrettaLabel = function () {
    const val = document.querySelector('input[name="qfCorretta"]:checked')?.value;
    [0,1,2,3].forEach(i => {
        const lbl = document.getElementById(`qfCorrettaLabel${i}`);
        if (!lbl) return;
        if (String(i) === val) {
            lbl.style.borderColor = 'var(--magenta,#FF007F)';
            lbl.style.background  = 'rgba(255,0,127,0.06)';
        } else {
            lbl.style.borderColor = '#e2e8f0';
            lbl.style.background  = '';
        }
    });
};

window.salvaQuizDomanda = function () {
    const testo = document.getElementById('qfTesto')?.value.trim();
    if (!testo) { alert('Inserisci il testo della domanda.'); return; }

    const opzioni = [0,1,2,3].map(i => document.getElementById(`qfOpzione${i}`)?.value.trim() || '');
    if (opzioni.some(o => !o)) { alert('Compila tutte e quattro le risposte.'); return; }

    const correttaEl = document.querySelector('input[name="qfCorretta"]:checked');
    if (!correttaEl) { alert('Seleziona la risposta corretta.'); return; }

    const editIdx = parseInt(document.getElementById('qfEditIndex')?.value ?? '-1');
    const domanda = { testo, opzioni, corretta: parseInt(correttaEl.value) };

    if (editIdx >= 0) quizDomande[editIdx] = domanda;
    else              quizDomande.push(domanda);

    _saveQuiz(quizCurrentVisitaId, quizDomande);
    _renderQuizEditor();
};

window.editQuizDomanda = function (i) {
    const d = quizDomande[i];
    if (!d) return;
    document.getElementById('qfTesto').value = d.testo;
    [0,1,2,3].forEach(j => {
        const el = document.getElementById(`qfOpzione${j}`);
        if (el) el.value = d.opzioni[j] || '';
    });
    const radio = document.querySelector(`input[name="qfCorretta"][value="${d.corretta}"]`);
    if (radio) { radio.checked = true; highlightCorrettaLabel(); }
    document.getElementById('qfEditIndex').value = i;
    const title = document.getElementById('quizFormTitle');
    if (title) title.innerHTML =
        `<i class="fa-solid fa-pen me-2" style="color:var(--magenta)"></i>Modifica Domanda ${i + 1}`;
    title?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.deleteQuizDomanda = function (i) {
    if (!confirm('Eliminare questa domanda?')) return;
    quizDomande.splice(i, 1);
    _saveQuiz(quizCurrentVisitaId, quizDomande);
    _renderQuizEditor();
};

window.resetQuizForm = function () {
    const testo = document.getElementById('qfTesto');
    if (testo) testo.value = '';
    [0,1,2,3].forEach(i => {
        const el = document.getElementById(`qfOpzione${i}`);
        if (el) el.value = '';
    });
    document.querySelectorAll('input[name="qfCorretta"]').forEach(r => r.checked = false);
    highlightCorrettaLabel();
    const idx = document.getElementById('qfEditIndex');
    if (idx) idx.value = '-1';
    const title = document.getElementById('quizFormTitle');
    if (title) title.innerHTML =
        '<i class="fa-solid fa-plus-circle me-2" style="color:var(--magenta)"></i>Aggiungi Domanda';
};

window.acquistaVisita = async function (id) {
    const visita = allMktVisite.find(v => v._id === id);
    if (!visita) return;
    const prezzo = visita.prezzo || 0;
    const msg = prezzo > 0
        ? `Acquistare "${visita.nomeVisita}" per €${prezzo}?`
        : `Ottenere "${visita.nomeVisita}" gratuitamente?`;
    if (!confirm(msg)) return;
    const p = getMktPurchases();
    if (!p.visite.includes(id)) {
        p.visite.push(id);
        try {
            await fetch(`/api/visite/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acquirenti: (visita.acquirenti || 0) + 1 }),
            });
            visita.acquirenti = (visita.acquirenti || 0) + 1;
        } catch (e) { /* silent */ }
    }
    saveMktPurchases(p);
    applyMktFilter();
};
