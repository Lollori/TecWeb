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

    // Variabili per i Grafici
    let chartAdozioni = null;
    let chartRicavi = null;

    // --- FUNZIONE GRAFICI (CHART.JS) ---
    function updateCharts() {
        // Prendiamo solo le opere dell'utente corrente per le statistiche personali
        const mieOpere = currentItems.filter(item => item.autore === currentUserId);
        const statsDashboard = document.getElementById('statsDashboard');

        if (mieOpere.length === 0) {
            if (statsDashboard) statsDashboard.style.display = 'none';
            return;
        } else {
            if (statsDashboard) statsDashboard.style.display = 'grid';
        }

        const labels = mieOpere.map(item => item.operaId);
        const datiAdozioni = mieOpere.map(item => item.adozioni || 0);
        const datiRicavi = mieOpere.map(item => (item.adozioni || 0) * (item.prezzo || 0));

        const commonOptions = {
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 20, font: { family: 'Inter', size: 12 } }
                },
                tooltip: { backgroundColor: 'rgba(45, 90, 61, 0.9)', padding: 10 }
            },
            cutout: '70%' // Rende il grafico a "ciambella" sottile ed elegante
        };

        // Grafico Adozioni
        if (chartAdozioni) chartAdozioni.destroy();
        const ctxAdo = document.getElementById('chartAdozioni').getContext('2d');
        chartAdozioni = new Chart(ctxAdo, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: datiAdozioni,
                    backgroundColor: ['#2d5a3d', '#4a7c5f', '#6aab7e', '#8fbc94', '#cfe5d2'],
                    hoverOffset: 15,
                    borderWidth: 0
                }]
            },
            options: commonOptions
        });

        // Grafico Ricavi
        if (chartRicavi) chartRicavi.destroy();
        const ctxRic = document.getElementById('chartRicavi').getContext('2d');
        chartRicavi = new Chart(ctxRic, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: datiRicavi,
                    backgroundColor: ['#ff6b35', '#ff9f1c', '#f9c74f', '#90be6d', '#43aa8b'],
                    hoverOffset: 15,
                    borderWidth: 0
                }]
            },
            options: commonOptions
        });
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
            // Dati demo
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
        updateCharts(); // Aggiorna i grafici ogni volta che i dati cambiano
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
        updateCharts(); // Aggiorna i grafici anche al caricamento filtri
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
                <div class="card-actions" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    ${item.prezzo > 0 ? 
                        `<span class="price-badge">€${item.prezzo}</span>` : 
                        `<span class="free-badge">Gratuito</span>`
                    }
                    <div style="display:flex; gap:8px;">
                        ${isMia ? `
                            <button type="button" class="icon-btn edit-btn" onclick="event.stopPropagation(); apriModaleItem(${JSON.stringify(item).replace(/"/g, '&quot;')})"><i class="fa-solid fa-pen"></i></button>
                            <button type="button" class="icon-btn delete-btn" onclick="event.stopPropagation(); eliminaOpera('${item.id}')"><i class="fa-solid fa-trash"></i></button>
                        ` : ''}
                    </div>
                </div>
                <h3>${item.operaId}</h3>
                <div class="card-details">
                    <p><i class="fa-solid fa-museum"></i> ${item.museo}</p>
                    <p class="description-text">${item.testo}</p>
                </div>
                <div class="card-tags" style="margin-top:auto; display:flex; justify-content:space-between; align-items:center; padding-top:15px; border-top:1px solid rgba(0,0,0,0.05);">
                    <span class="tag-bubble"><i class="fa-solid fa-hourglass-half"></i> ${item.lunghezza}</span>
                    ${!isMia ? 
                        `<button class="btn-add" onclick="adottaOpera('${item.id}')">Adotta</button>` : 
                        `<span style="font-size:0.8rem; font-weight:700; color:#2d5a3d;">${item.adozioni || 0} adozioni</span>`
                    }
                </div>
            `;
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