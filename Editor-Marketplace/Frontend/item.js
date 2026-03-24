document.addEventListener('DOMContentLoaded', () => {

    // --- SELEZIONA ELEMENTI ---
    const searchInput = document.getElementById('searchText');
    const container = document.getElementById('itemsContainer');
    const form = document.getElementById('itemForm');
    const modal = document.getElementById('itemModal');

    // Elementi Filtri Marketplace
    const filterMieBtn = document.getElementById('filterMie');
    const filterTutteBtn = document.getElementById('filterTutte');
    const filterPrezzo = document.getElementById('filterPrezzo');
    const statsBody = document.getElementById('statsBody');
    
    const brandTitle = modal?.querySelector('.brand');

    // --- STATO APPLICAZIONE ---
    let currentItems = [];
    let editingId = null; 
    let currentFilter = 'mie'; 
    let currentUserId = 'autore1'; 

    // --- FUNZIONI MARKETPLACE ---
    function setFilter(filter) {
        currentFilter = filter;
        if(filterMieBtn) filterMieBtn.classList.toggle('active', filter === 'mie');
        if(filterTutteBtn) filterTutteBtn.classList.toggle('active', filter === 'tutte');
        loadItems();
    }

    function applyFilters() {
        loadItems();
    }

    window.setFilter = setFilter; 
    window.applyFilters = applyFilters;

    function updateStats() {
        const mieVendite = currentItems.filter(item => item.autore === currentUserId && item.pubblica);
        if (statsBody) {
            statsBody.innerHTML = mieVendite.map(item => `
                <tr>
                    <td>${item.operaId}</td>
                    <td>${item.adozioni || 0}</td>
                    <td>€${((item.adozioni || 0) * (item.prezzo || 0)).toFixed(2)}</td>
                </tr>
            `).join('');
            const statsSection = document.getElementById('statisticheVendite');
            if(statsSection) statsSection.style.display = mieVendite.length ? 'block' : 'none';
        }
    }

    window.adottaOpera = function(itemId) {
        const item = currentItems.find(i => i.id === itemId);
        if (item) {
            item.adozioni = (item.adozioni || 0) + 1;
            syncToLocalStorage();
            alert(`"${item.operaId}" adottata per la visita!\nCosto: ${item.prezzo > 0 ? '€' + item.prezzo : 'Gratuito'}`);
        }
    };

    // --- GESTIONE DATI (LocalStorage) ---
    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('opere_marketplace');
        if (savedData) {
            currentItems = JSON.parse(savedData);
        } else {
            // Dati di test iniziali se vuoto
            currentItems = [
                {id:'1', operaId:'La Primavera', museo:'Uffizi', testo:'Opera test', lunghezza:'1min', linguaggio:'medio', licenza:'gratuita', prezzo:0, pubblica:true, autore:'autore1', adozioni:2},
                {id:'2', operaId:'Notte Stellata', museo:'MOMA', testo:'Opera test a pagamento', lunghezza:'15s', linguaggio:'infantile', licenza:'pagamento', prezzo:0.99, pubblica:true, autore:'autore2', adozioni:1}
            ];
            syncToLocalStorage();
            return;
        }
        loadItems();
    }

    function syncToLocalStorage() {
        localStorage.setItem('opere_marketplace', JSON.stringify(currentItems));
        loadItems(); 
    }

    // --- LOGICA FILTRI ---
    function loadItems() {
        const searchFiltro = searchInput?.value.toLowerCase() || '';
        const prezzoFiltro = filterPrezzo?.value || 'tutti';

        const filtrati = currentItems.filter(item => {
            const matchSearch = item.operaId.toLowerCase().includes(searchFiltro) || 
                                item.museo.toLowerCase().includes(searchFiltro) ||
                                item.testo.toLowerCase().includes(searchFiltro);
            
            const matchUser = currentFilter === 'mie' ? item.autore === currentUserId : item.pubblica === true;
            
            const matchPrezzo = prezzoFiltro === 'tutti' || 
                               (prezzoFiltro === 'gratuiti' ? item.prezzo == 0 : item.prezzo > 0);

            return matchSearch && matchUser && matchPrezzo;
        });
        
        renderItems(filtrati);
        updateStats();
    }

    // --- FUNZIONE DI RENDER ---
    function renderItems(dati = currentItems) {
        if (!container) return;
        container.innerHTML = ''; 

        if (dati.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #4a7c5f; padding: 40px;">Nessuna opera trovata.</p>';
            return;
        }

        dati.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.dataset.id = item.id;
            
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.height = '100%'; 
            card.style.overflow = 'hidden'; 

            const isMia = item.autore === currentUserId;

            card.innerHTML = `
                <div class="card-actions" style="display:flex; justify-content:space-between; width:100%; margin-bottom:10px;">
                    <div>
                        ${item.prezzo > 0 ? 
                            `<span class="price-badge" style="background:#ff6b35; color:white; padding:4px 8px; border-radius:12px; font-size:0.8rem;">€${item.prezzo}</span>` : 
                            `<span class="free-badge" style="background:#4a7c5f; color:white; padding:4px 8px; border-radius:12px; font-size:0.8rem;">Gratuito</span>`
                        }
                    </div>
                    <div style="display:flex; gap:8px;">
                        ${isMia ? `<button type="button" class="icon-btn edit-btn" title="Modifica"><i class="fa-solid fa-pen"></i></button>
                                   <button type="button" class="icon-btn delete-btn" title="Elimina"><i class="fa-solid fa-trash"></i></button>` 
                                 : ''}
                    </div>
                </div>
                
                <h3>${item.operaId}</h3>
                
                <div class="card-details" style="flex-grow: 1;">
                    <p><i class="fa-solid fa-museum"></i> <strong>Museo:</strong> ${item.museo}</p>
                    <p class="description-text" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; margin-bottom: 10px;">
                        <i class="fa-solid fa-quote-left"></i> <strong>Descrizione:</strong> ${item.testo}
                    </p>
                </div>

                <div class="card-tags" style="margin-top: auto; padding-top: 15px; display: flex; gap: 8px; flex-wrap: wrap; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:8px;">
                        <span class="tag-bubble" style="background: rgba(45, 90, 61, 0.1); color: #2d5a3d; padding: 5px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">
                            <i class="fa-solid fa-brain" style="opacity: 0.8;"></i> ${item.linguaggio}
                        </span>
                        <span class="tag-bubble" style="background: rgba(45, 90, 61, 0.1); color: #2d5a3d; padding: 5px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">
                            <i class="fa-solid fa-hourglass-half" style="opacity: 0.8;"></i> ${item.lunghezza}
                        </span>
                    </div>
                    
                    ${!isMia ? `<button class="btn-add" onclick="adottaOpera('${item.id}')" style="background:#4a7c5f; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-plus"></i> Aggiungi</button>` : `<span style="font-size:0.8rem; color:#666;">${item.adozioni || 0} adozioni</span>`}
                </div>
            `;

            // Eventi
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.icon-btn') && !e.target.closest('.btn-add')) {
                    document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                }
            });

            if(isMia) {
                card.querySelector('.edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    apriModaleItem(item);
                });
                card.querySelector('.delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    if (confirm(`Eliminare l'opera "${item.operaId}"?`)) {
                        currentItems = currentItems.filter(i => i.id !== item.id);
                        syncToLocalStorage();
                    }
                });
            }

            container.appendChild(card);
        });
    }

    // --- GESTIONE MODALE ---
    window.openModal = function() { apriModaleItem(null); };
    window.closeModal = function() { chiudiModaleItem(); };

    function apriModaleItem(item) {
        if (!modal) return;
        modal.style.display = 'flex';
        
        if (item) {
            editingId = item.id;
            document.getElementById('operaId').value = item.operaId;
            document.getElementById('museo').value = item.museo;
            document.getElementById('lunghezza').value = item.lunghezza;
            document.getElementById('linguaggio').value = item.linguaggio;
            document.getElementById('testo').value = item.testo;
            
            // Nuovi campi
            document.getElementById('licenza').value = item.licenza || 'gratuita';
            document.getElementById('prezzo').value = item.prezzo || 0;
            document.getElementById('pubblica').checked = item.pubblica || false;
            
            if (brandTitle) brandTitle.innerHTML = `Modifica <span>Opera</span>`;
        } else {
            editingId = null;
            form.reset();
            document.getElementById('prezzo').value = 0; // Default
            if (brandTitle) brandTitle.innerHTML = `Nuova <span>Opera</span>`;
        }
    }

    function chiudiModaleItem() {
        if (!modal) return;
        modal.style.display = 'none';
        form.reset();
        editingId = null;
    }

    // --- SALVATAGGIO FORM ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Recupero opera esistente per mantenere le adozioni
        const existingItem = editingId ? currentItems.find(i => i.id === editingId) : null;

        const itemData = {
            id: editingId ? editingId : Date.now().toString(),
            operaId: document.getElementById('operaId').value,
            museo: document.getElementById('museo').value,
            lunghezza: document.getElementById('lunghezza').value,
            linguaggio: document.getElementById('linguaggio').value,
            testo: document.getElementById('testo').value,
            
            // Nuovi campi
            licenza: document.getElementById('licenza').value,
            prezzo: parseFloat(document.getElementById('prezzo').value) || 0,
            pubblica: document.getElementById('pubblica').checked,
            
            // Mantiene autore originale o setta current se nuova
            autore: existingItem ? existingItem.autore : currentUserId,
            // Mantiene adozioni storiche
            adozioni: existingItem ? existingItem.adozioni : 0
        };

        if (editingId) {
            currentItems = currentItems.map(i => i.id === editingId ? itemData : i);
        } else {
            currentItems.push(itemData);
        }

        syncToLocalStorage(); 
        chiudiModaleItem();
    });

    searchInput?.addEventListener('input', applyFilters);

    // --- AVVIO ---
    loadFromLocalStorage();
});
