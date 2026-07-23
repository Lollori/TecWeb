window.addEventListener('pageshow', () => {
    const freshRole   = localStorage.getItem('userRole') || '';
    const freshUserId = localStorage.getItem('userId')   || '';
    if (freshRole !== SESSION.role || freshUserId !== SESSION.userId) {
        window.location.reload();
    }
});


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
        switchSection('marketplace');
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
    applyAvatar(document.getElementById('avatarInitial'), role, initial);
    document.getElementById('footerUsername').textContent  = SESSION.username;
    document.getElementById('headerRoleLabel').textContent = role;


    const mobileAvatarTop  = document.getElementById('mobileAvatarTop');
    const mobileAvatarMenu = document.getElementById('mobileAvatarMenu');
    const mobileUsername   = document.getElementById('mobileMenuUsername');
    const mobileRole       = document.getElementById('mobileMenuRole');
    applyAvatar(mobileAvatarTop,  role, initial);
    applyAvatar(mobileAvatarMenu, role, initial);
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


const SECTIONS_BY_ROLE = {
    curatore: [
        { divider: 'Musei' },
        { id: 'musei',           icon: 'fa-building-columns', label: 'I tuoi Musei'    },
        { id: 'modifica-museo',  icon: 'fa-pen-to-square',    label: 'Modifica Museo'  },
        { id: 'aggiungi-museo',  icon: 'fa-plus-circle',      label: 'Aggiungi Museo'  },
        { divider: 'Opere' },
        { id: 'aggiungi-opere',  icon: 'fa-image',            label: 'Aggiungi Opera'  },
        { divider: 'Strumenti di Aggiunta' },
        { id: 'autore-aggiungi-visita', icon: 'fa-route',       label: 'Gestisci Visite' },
        { id: 'autore-aggiungi-item',   icon: 'fa-layer-group', label: 'Gestisci Item'   },
        { divider: 'Marketplace' },
        { id: 'marketplace',     icon: 'fa-store',            label: 'Marketplace'     },
    ],
    autore: [
        { id: 'autore-musei',           icon: 'fa-building-columns', label: 'Musei'           },
        { divider: 'Strumenti di Aggiunta' },
        { id: 'autore-aggiungi-visita', icon: 'fa-route',             label: 'Gestisci Visite' },
        { id: 'autore-aggiungi-item',   icon: 'fa-layer-group',       label: 'Gestisci Item'   },
        { divider: 'Strumenti Docente' },
        { id: 'curatore-quiz',          icon: 'fa-lightbulb',         label: 'Gestione Quiz'   },
        { divider: 'Marketplace' },
        { id: 'marketplace',            icon: 'fa-store',             label: 'Marketplace'     },
    ],
    visitatore: [
        { divider: 'Esplora' },
        { id: 'visitatore-musei',  icon: 'fa-building-columns', label: 'Musei'       },
        { id: 'visitatore-opere',  icon: 'fa-image',            label: 'Opere'       },
        { divider: 'I miei contenuti' },
        { id: 'autore-aggiungi-visita', icon: 'fa-route',       label: 'Gestisci Visite' },
        { id: 'autore-aggiungi-item',   icon: 'fa-layer-group', label: 'Gestisci Item'   },
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


function switchSection(id) {


    document.body.classList.toggle('carrello-fullscreen', id === 'carrello');

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

    if (id === 'admin-utenti')    initAdminUtenti();
    if (id === 'admin-musei')     initAdminMusei();
    if (id === 'admin-opere')     initAdminOpere();
    if (id === 'admin-visite')    initAdminVisite();
    if (id === 'admin-items')     initAdminItems();
    if (id === 'admin-analytics') initAdminAnalytics();
    if (id === 'admin-navigator') initAdminNavigator();

    if (id === 'curatore-quiz') initCuratoreQuiz();

    if (id === 'marketplace') initMarketplace();
    if (id === 'carrello')    initCarrello();
}


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
                <div id="dash-amenity-legend" class="dash-amenity-legend"></div>
                <p class="dash-room-hint" id="dash-room-hint">Tocca una stanza per vedere le opere</p>
                <div id="dash-room-panel" class="dash-room-panel" style="display:none"></div>
            </div>`;

        window._dashFloorLegends = [];

        piani.forEach((p, i) => {
            if (!p.geoJsonUrl) return;
            const svgEl = document.getElementById(`dash-floor-svg-${i}`);
            const wrapEl = document.getElementById(`dash-floor-wrap-${i}`);
            if (!svgEl) return;
            fetch(p.geoJsonUrl)
                .then(r => r.json())
                .then(geo => {
                    const legendMap = new Map();

                    geo.features.forEach(f => {
                        const roomId = f.properties.room_id;
                        const ring = f.geometry.coordinates[0];
                        const points = ring.map(([x, y]) => `${x},${-y}`).join(' ');
                        const amenity = DASH_AMENITY_ICONS[roomId];

                        if (amenity) {
                            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                            poly.setAttribute('points', points);
                            poly.classList.add('dash-amenity-polygon');
                            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                            title.textContent = amenity.label;
                            poly.appendChild(title);
                            svgEl.appendChild(poly);
                            legendMap.set(roomId, amenity);

                            if (wrapEl) {
                                const c = dashRingCentroid(ring);
                                const marker = document.createElement('div');
                                marker.className = 'dash-amenity-marker';
                                marker.style.left = `${(c.x / (p.imgWidth || 437)) * 100}%`;
                                marker.style.top  = `${(c.y / (p.imgHeight || 600)) * 100}%`;
                                marker.title = amenity.label;
                                marker.innerHTML = `<i class="fa-solid ${amenity.icon}"></i>`;
                                wrapEl.appendChild(marker);
                            }
                            return;
                        }

                        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        poly.setAttribute('points', points);
                        poly.classList.add('dash-room-polygon');
                        poly.addEventListener('click', () => dashHandleRoomClick(isil, roomId, poly, svgEl));
                        svgEl.appendChild(poly);
                    });

                    const legendHtml = [...legendMap.values()].map(a => `
                        <span class="dash-amenity-legend-item">
                            <span class="dash-amenity-legend-icon"><i class="fa-solid ${a.icon}"></i></span>
                            ${a.label}
                        </span>`).join('');
                    window._dashFloorLegends[i] = legendHtml;
                    if (i === 0) {
                        const legendEl = document.getElementById('dash-amenity-legend');
                        if (legendEl) legendEl.innerHTML = legendHtml;
                    }
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
    const legendEl = document.getElementById('dash-amenity-legend');
    if (legendEl) legendEl.innerHTML = (window._dashFloorLegends && window._dashFloorLegends[idx]) || '';
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
                    <span>${dashRoomDisplayName(roomId)}</span>${closeBtn}
                </div>
                <p class="dash-room-empty">Nessuna opera disponibile per questa sala.</p>`;
        } else {
            panel.innerHTML = `
                <div class="dash-room-header">
                    <span>${dashRoomDisplayName(roomId)} · ${opere.length} oper${opere.length === 1 ? 'a' : 'e'}</span>${closeBtn}
                </div>
                <div class="dash-opera-list">
                    ${opere.map(o => `
                        <div class="dash-opera-card">
                            ${o.immagine ? `<img loading="lazy" class="dash-opera-img" src="${o.immagine}" alt="" onerror="this.style.display='none'">` : ''}
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
