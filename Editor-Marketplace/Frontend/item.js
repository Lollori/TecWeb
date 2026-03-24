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

    // Variabili globali per le istanze dei Grafici (per poterle distruggere)
    let chartAdozioni = null;
    let chartRicavi = null;

    // --- FUNZIONE GRAFICI (CHART.JS) ---
    function updateCharts() {
        const mieOpere = currentItems.filter(item => item.autore === currentUserId);
        const statsDashboard = document.getElementById('statsDashboard');

        if (!statsDashboard) return;

        // Mostra o nascondi la dashboard in base ai dati
        if (mieOpere.length === 0) {
            statsDashboard.style.display = 'none';
            return;
        } 
        statsDashboard.style.display = 'grid';

        // Controllo se la libreria Chart.js è disponibile
        if (typeof Chart === 'undefined') {
            console.warn("Chart.js non ancora caricato...");
            return;
        }

        // Timeout per garantire che il CSS abbia calcolato le altezze del contenitore
        setTimeout(() => {
            const labels = mieOpere.map(item => item.operaId);
            const datiAdozioni = mieOpere.map(item => item.adozioni || 0);
            const datiRicavi = mieOpere.map(item => (item.adozioni || 0) * (item.prezzo || 0));

            const commonOptions = {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 20, bottom: 20, left: 10, right: 10 } },
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { 
                            usePointStyle: true, 
                            padding: 25, 
                            font: { family: 'Inter', size: 12, weight: '600' },
                            color: '#2d5a3d'
                        }
                    },
                    tooltip: { 
                        backgroundColor: 'rgba(45, 90, 61, 0.9)',
                        padding: 12,
                        cornerRadius: 10
                    }
                },
                cutout: '70%',
                animation: { duration: 800, easing: 'easeOutQuart' }
            };

            // --- GRAFICO ADOZIONI ---
            const ctxAdo = document.getElementById('chartAdozioni');
            if (ctxAdo) {
                if (chartAdozioni) chartAdozioni.destroy();
                chartAdozioni = new Chart(ctxAdo.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Adozioni',
                            data: datiAdozioni,
                            backgroundColor: ['#2d5a3d', '#4a7c5f', '#74a889', '#a3c9b1', '#cfe5d2'],
                            borderWidth: 0,
                            hoverOffset: 15
                        }]
                    },
                    options: commonOptions
                });
            }

            // --- GRAFICO RICAVI ---
            const ctxRic = document.getElementById('chartRicavi');
            if (ctxRic) {
                if (chartRicavi) chartRicavi.destroy();
                chartRicavi = new Chart(ctxRic.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Ricavi',
                            data: datiRicavi,
                            backgroundColor: ['#ff6b35', '#ff8e64', '#ffb193', '#ffd4c2', '#ffe9e0'],
                            borderWidth: 0,
                            hoverOffset: 15
                        }]
                    },
                    options: commonOptions
                });
            }
        }, 200); 
    }

    // --- FUNZIONI FILTRI ---
    window.setFilter = function(filter) {
        currentFilter = filter;
        if(filterMieBtn) filterMieBtn.classList.toggle('active', filter === 'mie');
        if(filterTutteBtn) filterTutteBtn.classList.toggle('active', filter === 'tutte');
        loadItems();
    };

    window.applyFilters = function() {
        loadItems();
    };

    window.adottaOpera = function(itemId) {
        const item = currentItems.find(i => i.id === itemId);
        if (item) {
            item.adozioni = (item.adozioni || 0) + 1;
            syncToLocalStorage();
            alert(`"${item.operaId}" aggiunta alla visita!`);
        }
    };

    // --- GESTIONE DATI ---
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

    // --- RENDER CARD ---
    function renderItems(dati) {
        if (!container) return;
        container.innerHTML = ''; 

        if (dati.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #4a7c5f; padding: 40px;">Nessuna opera trovata.</p>';
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
                                <button type="button" class="icon-btn edit-btn" title="Modifica"><i class="fa-solid fa-pen"></i></button>
                                <button type="button" class="icon-btn delete-btn" title="Elimina"><i class="fa-solid fa-trash"></i></button>
                            ` : `<button class="btn-add" onclick="adottaOpera('${item.id}')">Adotta</button>`}
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <p class="description-text">${item.testo}</p>
                </div>
                <div class="card-footer">
                    <span class="tag-bubble"><i class="fa-solid fa-hourglass-half"></i> ${item.lunghezza}</span>
                    <span class="adozioni-count">${item.adozioni || 0} adozioni</span>
                </div>
            `;

            if (isMia) {
                card.querySelector('.edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    apriModaleItem(item);
                });
                card.querySelector('.delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    eliminaOpera(item.id);
                });
            }
            container.appendChild(card);
        });
    }

    // --- GESTIONE MODALE ---
    window.apriModaleItem = function(item) {
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

    window.closeModal = function() { modal.style.display = 'none'; editingId = null; };

    window.eliminaOpera = function(id) {
        if (confirm("Eliminare quest'opera?")) {
            currentItems = currentItems.filter(i => i.id !== id);
            syncToLocalStorage();
        }
    };

    form.addEventListener('submit', (e) => {
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

        if (editingId) {
            currentItems = currentItems.map(i => i.id === editingId ? itemData : i);
        } else {
            currentItems.push(itemData);
        }

        syncToLocalStorage();
        closeModal();
    });

    // --- AVVIO ---
    loadFromLocalStorage();
});