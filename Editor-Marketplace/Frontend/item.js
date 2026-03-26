document.addEventListener('DOMContentLoaded', () => {

    // --- SELEZIONA ELEMENTI ---
    const searchInput = document.getElementById('searchText');
    const container = document.getElementById('itemsContainer');
    const form = document.getElementById('itemForm');
    const modal = document.getElementById('itemModal');
    const filterMieBtn = document.getElementById('filterMie');
    const filterTutteBtn = document.getElementById('filterTutte');
    const filterPrezzo = document.getElementById('filterPrezzo');
    const brandTitle = modal?.querySelector('.brand');

    // --- STATO APPLICAZIONE ---
    let currentItems = [];
    let editingId = null;
    let currentFilter = 'mie';
    let currentUserId = 'autore1';
    const currentMuseo = new URLSearchParams(window.location.search).get('museo');

    if (!currentMuseo) {
        alert("Devi prima selezionare un museo dalla sezione Musei per accedere a questa pagina.");
        window.location.href = "musei.html";
        return;
    }

    // Aggiorna gli url per restare nel contesto del museo corrente
    document.querySelectorAll('.top-nav-cards a:not(.back-card)').forEach(link => {
        const baseHref = link.getAttribute('href').split('?')[0];
        link.href = `${baseHref}?museo=${encodeURIComponent(currentMuseo)}`;
    });

    // Mostra un banner in testa alla pagina
    fetch(`/api/musei/${encodeURIComponent(currentMuseo)}`)
        .then(r => r.json())
        .then(result => {
             if (result.ok && result.data) {
                const header = document.querySelector('.content-header');
                const banner = document.createElement('div');
                banner.style.cssText = 'background: rgba(74, 124, 95, 0.08); border: 1px solid rgba(74, 124, 95, 0.2); border-radius: 12px; padding: 12px 20px; margin-bottom: 24px; color: #2d503b; font-weight: 500; display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box;';
                banner.innerHTML = `<i class="fa-solid fa-building-columns" style="font-size: 1.2em; color: #4a7c5f;"></i> <span>Stai operando per il museo: <strong style="color: #4a7c5f; font-size: 1.1em; margin-left: 5px;">${result.data.nome}</strong></span>`;
                header.parentNode.insertBefore(banner, header);
            }
        })
        .catch(() => {});

    // --- 1. FUNZIONE MINI-STATISTICHE (SVG RING) ---
    function updateCharts() {
        const mieOpere = currentItems.filter(item => item.autore === currentUserId);
        const dashboard = document.getElementById('statsDashboard');
        if (!dashboard) return;

        if (mieOpere.length === 0) {
            dashboard.style.display = 'none';
            return;
        }
        dashboard.style.display = 'flex';

        // Palette di colori (puoi aggiungerne quanti ne vuoi)
        const palette = ['#2d5a3d', '#ff6b35', '#4a7c5f', '#ff9f1c', '#74a889', '#f9c74f', '#a3c9b1', '#e67e22'];
        const getColor = (index) => palette[index % palette.length];

        const totalAdo = mieOpere.reduce((sum, item) => sum + (item.adozioni || 0), 0);
        const totalRic = mieOpere.reduce((sum, item) => sum + ((item.adozioni || 0) * (item.prezzo || 0)), 0);

        // Genera la lista con i pallini colorati
        const generateFullList = (isMoney) => {
            return mieOpere.map((op, index) => {
                const color = getColor(index);
                const val = isMoney 
                    ? `€${((op.adozioni || 0) * (op.prezzo || 0)).toFixed(2)}` 
                    : `${op.adozioni || 0}`;
                return `
                    <div class="tooltip-row">
                        <div style="display:flex; align-items:center; gap:8px; max-width:160px;">
                            <span style="width:8px; height:8px; background:${color}; border-radius:50%; flex-shrink:0;"></span>
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${op.operaId}</span>
                        </div>
                        <span style="font-weight: 700;">${val}</span>
                    </div>`;
            }).join('');
        };

        // Funzione per l'SVG Multi-Colore (disegna segmenti diversi)
        const getMultiColorSVG = (items, isMoney, totalGoal) => {
            const r = 16;
            const circum = 2 * Math.PI * r;
            let currentOffset = 0;
            let circles = `<circle class="c-bg" cx="20" cy="20" r="${r}" />`;

            items.forEach((op, index) => {
                const val = isMoney ? ((op.adozioni || 0) * (op.prezzo || 0)) : (op.adozioni || 0);
                if (val <= 0) return;

                const segmentLength = (val / totalGoal) * circum;
                const color = getColor(index);

                circles += `
                    <circle cx="20" cy="20" r="${r}" fill="none" stroke="${color}" 
                        stroke-width="4" stroke-dasharray="${segmentLength} ${circum}" 
                        stroke-dashoffset="-${currentOffset}" stroke-linecap="round"
                        transform="rotate(-90 20 20)" style="transition: all 0.6s ease;" />
                `;
                currentOffset += segmentLength;
            });

            return `<svg width="42" height="42" viewBox="0 0 40 40">${circles}</svg>`;
        };

        dashboard.innerHTML = `
            <div class="mini-stat-card">
                <div class="stat-ring-container">${getMultiColorSVG(mieOpere, false, 100)}</div>
                <div class="stat-texts">
                    <small>Adozioni</small>
                    <strong>${totalAdo}</strong>
                </div>
                <div class="stat-tooltip">
                    <div class="tooltip-header"><span>Opera</span><span>Adozioni</span></div>
                    <div class="stat-tooltip-list">${generateFullList(false)}</div>
                </div>
            </div>

            <div class="mini-stat-card">
                <div class="stat-ring-container">${getMultiColorSVG(mieOpere, true, 500)}</div>
                <div class="stat-texts">
                    <small>Ricavi</small>
                    <strong>€${totalRic.toFixed(2)}</strong>
                </div>
                <div class="stat-tooltip">
                    <div class="tooltip-header"><span>Opera</span><span>Ricavo</span></div>
                    <div class="stat-tooltip-list">${generateFullList(true)}</div>
                </div>
            </div>
        `;
    }

    // --- 2. FILTRI & RICERCA ---
    window.setFilter = function(filter) {
        currentFilter = filter;
        if(filterMieBtn) filterMieBtn.classList.toggle('active', filter === 'mie');
        if(filterTutteBtn) filterTutteBtn.classList.toggle('active', filter === 'tutte');
        loadItems();
    };

    window.applyFilters = () => loadItems();

    window.adottaOpera = function(itemId) {
        const item = currentItems.find(i => i.id === itemId);
        if (item) {
            item.adozioni = (item.adozioni || 0) + 1;
            syncToLocalStorage();
            alert(`Hai adottato "${item.operaId}"!`);
        }
    };

    // --- 3. GESTIONE DATI (LOCALSTORAGE) ---
    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('opere_marketplace');
        if (savedData) {
            currentItems = JSON.parse(savedData);
        } else {
            // Dati demo iniziali
            currentItems = [
                {id:'1', operaId:'La Primavera', museo:'Uffizi', testo:'Capolavoro di Botticelli', lunghezza:'1min', linguaggio:'medio', licenza:'gratuita', prezzo:0, pubblica:true, autore:'autore1', adozioni:12},
                {id:'2', operaId:'Notte Stellata', museo:'MOMA', testo:'Celebre opera di Van Gogh', lunghezza:'15s', linguaggio:'infantile', licenza:'pagamento', prezzo:3.50, pubblica:true, autore:'autore1', adozioni:5}
            ];
            syncToLocalStorage();
        }
        loadItems();
    }

     function syncToLocalStorage() {
        localStorage.setItem('opere_marketplace', JSON.stringify(currentItems));
        loadItems(); // Questo scatena anche updateCharts()
    }

    function loadItems() {
        const searchFiltro = searchInput?.value.toLowerCase() || '';
        const prezzoFiltro = filterPrezzo?.value || 'tutti';

        const filtrati = currentItems.filter(item => {
            const matchSearch = item.operaId.toLowerCase().includes(searchFiltro) ||
                                item.museo.toLowerCase().includes(searchFiltro);
            const matchUser = currentFilter === 'mie' ? item.autore === currentUserId : item.pubblica === true;
            const matchPrezzo = prezzoFiltro === 'tutti' || (prezzoFiltro === 'gratuiti' ? item.prezzo == 0 : item.prezzo > 0);
            const matchMuseo = !currentMuseo || item.codiceIsil === currentMuseo;
            return matchSearch && matchUser && matchPrezzo && matchMuseo;
        });
        
        renderItems(filtrati);
        updateCharts(); 
    }

    // --- 4. RENDER CARD ---
    function renderItems(dati) {
        if (!container) return;
        container.innerHTML = ''; 

        if (dati.length === 0) {
            container.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:50px; color:#4a7c5f;">Nessun contenuto trovato.</p>';
            return;
        }

        dati.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            const isMia = item.autore === currentUserId;

            card.innerHTML = `
                <div class="card-main-header">
                    <div class="title-group">
                        <h3>${item.operaId}</h3>
                        <p class="museum-sub"><i class="fa-solid fa-museum"></i> ${item.museo}</p>
                    </div>
                    <div class="action-group">
                        <div class="badges-row">
                            ${item.prezzo > 0 ? `<span class="price-badge">€${item.prezzo}</span>` : `<span class="free-badge">Gratis</span>`}
                        </div>
                        <div class="buttons-row">
                            ${isMia ? `
                                <button type="button" class="icon-btn edit-btn"><i class="fa-solid fa-pen"></i></button>
                                <button type="button" class="icon-btn delete-btn"><i class="fa-solid fa-trash"></i></button>
                            ` : `<button class="btn-add" onclick="adottaOpera('${item.id}')">Adotta</button>`}
                        </div>
                    </div>
                </div>
                <div class="card-body"><p class="description-text">${item.testo}</p></div>
                <div class="card-footer">
                    <span class="tag-bubble"><i class="fa-solid fa-hourglass-half"></i> ${item.lunghezza}</span>
                    <span class="adozioni-count">${item.adozioni || 0} adozioni</span>
                </div>
            `;

            if (isMia) {
                card.querySelector('.edit-btn').onclick = () => apriModaleItem(item);
                card.querySelector('.delete-btn').onclick = () => eliminaOpera(item.id);
            }
            container.appendChild(card);
        });
    }

    // --- 5. MODALE & FORM ---
    window.apriModaleItem = (item) => {
        modal.style.display = 'flex';
        if (item) {
            editingId = item.id;
            document.getElementById('operaId').value = item.operaId;
            document.getElementById('museo').value = item.museo;
            document.getElementById('lunghezza').value = item.lunghezza;
            document.getElementById('linguaggio').value = item.linguaggio;
            document.getElementById('testo').value = item.testo;
            document.getElementById('licenza').value = item.licenza || 'gratuita';
            document.getElementById('prezzo').value = item.prezzo || 0;
            document.getElementById('pubblica').checked = item.pubblica || false;
            brandTitle.innerHTML = `Modifica <span>Opera</span>`;
        } else {
            editingId = null;
            form.reset();
            brandTitle.innerHTML = `Nuova <span>Opera</span>`;
        }
    };

    window.closeModal = () => { modal.style.display = 'none'; editingId = null; };

    window.eliminaOpera = (id) => {
        if (confirm("Eliminare definitivamente quest'opera?")) {
            currentItems = currentItems.filter(i => i.id !== id);
            syncToLocalStorage();
        }
    };

    form.onsubmit = (e) => {
        e.preventDefault();
        const existingItem = editingId ? currentItems.find(i => i.id === editingId) : null;
        const itemData = {
            id: editingId || Date.now().toString(),
            operaId: document.getElementById('operaId').value,
            museo: document.getElementById('museo').value,
            lunghezza: document.getElementById('lunghezza').value,
            linguaggio: document.getElementById('linguaggio').value,
            testo: document.getElementById('testo').value,
            licenza: document.getElementById('licenza').value,
            prezzo: parseFloat(document.getElementById('prezzo').value) || 0,
            pubblica: document.getElementById('pubblica').checked,
            autore: existingItem ? existingItem.autore : currentUserId,
            adozioni: existingItem ? existingItem.adozioni : 0
        };

        if (editingId) currentItems = currentItems.map(i => i.id === editingId ? itemData : i);
        else currentItems.push(itemData);

        syncToLocalStorage();
        closeModal();
    };

    loadFromLocalStorage();
});