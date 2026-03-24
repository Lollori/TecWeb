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

    // --- 1. FUNZIONE MINI-STATISTICHE (SVG PROGRESS) ---
    function updateCharts() {
        const mieOpere = currentItems.filter(item => item.autore === currentUserId);
        const dashboard = document.getElementById('statsDashboard');
        
        if (!dashboard) return;

        if (mieOpere.length === 0) {
            dashboard.style.display = 'none';
            return;
        }
        dashboard.style.display = 'flex';

        // Calcolo Totali
        const totalAdo = mieOpere.reduce((sum, item) => sum + (item.adozioni || 0), 0);
        const totalRic = mieOpere.reduce((sum, item) => sum + ((item.adozioni || 0) * (item.prezzo || 0)), 0);

        // Obiettivi per il calcolo della percentuale (es. 100 adozioni e 500€ ricavi)
        const goalAdo = 100;
        const goalRic = 500;

        // Funzione interna per iniettare l'SVG
        const renderRing = (containerId, value, label, subValue, color, percent) => {
            const target = dashboard.querySelector(containerId);
            if (!target) return;

            const radius = 18;
            const circum = 2 * Math.PI * radius;
            const offset = circum - (Math.min(percent, 100) / 100) * circum;

            target.innerHTML = `
                <div class="mini-stat-card">
                    <div class="stat-ring">
                        <svg width="45" height="45" viewBox="0 0 50 50">
                            <circle cx="25" cy="25" r="${radius}" fill="none" stroke="#eee" stroke-width="4"/>
                            <circle cx="25" cy="25" r="${radius}" fill="none" stroke="${color}" 
                                stroke-width="4" stroke-dasharray="${circum}" 
                                stroke-dashoffset="${offset}" stroke-linecap="round"
                                transform="rotate(-90 25 25)" style="transition: stroke-dashoffset 0.6s ease-out;"/>
                        </svg>
                        <span class="stat-perc">${Math.round(percent)}%</span>
                    </div>
                    <div class="stat-details">
                        <span class="stat-label">${label}</span>
                        <span class="stat-value">${subValue}</span>
                    </div>
                </div>
            `;
        };

        // Renderizziamo i due anelli
        renderRing('.stat-card:nth-child(1)', totalAdo, 'Adozioni Totali', totalAdo, '#2d5a3d', (totalAdo / goalAdo) * 100);
        renderRing('.stat-card:nth-child(2)', totalRic, 'Ricavi Stimati', `€${totalRic.toFixed(2)}`, '#ff6b35', (totalRic / goalRic) * 100);
    }

    // --- 2. GESTIONE FILTRI ---
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
        }
    };

    // --- 3. LOGICA DATI (LOCAL STORAGE) ---
    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('opere_marketplace');
        if (savedData) {
            currentItems = JSON.parse(savedData);
        } else {
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
        loadItems();
    }

    function loadItems() {
        const searchFiltro = searchInput?.value.toLowerCase() || '';
        const prezzoFiltro = filterPrezzo?.value || 'tutti';

        const filtrati = currentItems.filter(item => {
            const matchSearch = item.operaId.toLowerCase().includes(searchFiltro) || 
                                item.museo.toLowerCase().includes(searchFiltro);
            const matchUser = currentFilter === 'mie' ? item.autore === currentUserId : item.pubblica === true;
            const matchPrezzo = prezzoFiltro === 'tutti' || (prezzoFiltro === 'gratuiti' ? item.prezzo == 0 : item.prezzo > 0);
            return matchSearch && matchUser && matchPrezzo;
        });
        
        renderItems(filtrati);
        updateCharts(); 
    }

    // --- 4. RENDER CARD OPERE ---
    function renderItems(dati) {
        if (!container) return;
        container.innerHTML = ''; 

        if (dati.length === 0) {
            container.innerHTML = '<p class="empty-msg">Nessuna opera trovata.</p>';
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

    // --- 5. MODALE & AZIONI ---
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
        if (confirm("Eliminare quest'opera?")) {
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