document.addEventListener('DOMContentLoaded', () => {

    // --- SELEZIONA ELEMENTI ---
    const searchInput = document.getElementById('searchText');
    const container = document.getElementById('itemsContainer');
    const form = document.getElementById('itemForm');
    const modal = document.getElementById('itemModal');
    
    // Titolo dentro il modale
    const brandTitle = modal?.querySelector('.brand');

    // --- STATO APPLICAZIONE ---
    let currentItems = [];
    let editingId = null; // null = nuovo, ID = modifica

    // --- GESTIONE DATI (LocalStorage) ---
    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('opere_marketplace');
        currentItems = savedData ? JSON.parse(savedData) : [];
        renderItems();
    }

    function syncToLocalStorage() {
        localStorage.setItem('opere_marketplace', JSON.stringify(currentItems));
        renderItems(); // Aggiorna la vista dopo il salvataggio
    }

    // --- FUNZIONE DI RENDER (Uniformata a Visite.js + Icone nei Tag) ---
    function renderItems(dati = currentItems) {
        if (!container) return;
        container.innerHTML = ''; 

        if (dati.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #4a7c5f; padding: 40px;">Nessuna opera trovata nel marketplace.</p>';
            return;
        }

        dati.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.dataset.id = item.id;
            
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.height = '100%'; // Assicura che le card siano alte uguali nella griglia
            card.style.overflow = 'hidden'; // Evita overflow generale

            // HTML Uniformato: card-actions in alto, h3 per titolo, card-details per info con icone
            card.innerHTML = `
                <div class="card-actions">
                    <button type="button" class="icon-btn edit-btn" title="Modifica"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icon-btn delete-btn" title="Elimina"><i class="fa-solid fa-trash"></i></button>
                </div>
                
                <h3>${item.operaId}</h3>
                
                <div class="card-details" style="flex-grow: 1;">
                    <p><i class="fa-solid fa-museum"></i> <strong>Museo:</strong> ${item.museo}</p>
                    
                    <p class="description-text" style="
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;  
                        overflow: hidden;
                        text-overflow: ellipsis;
                        line-height: 1.5;
                        margin-bottom: 10px;
                        white-space: normal; /* Sovrascrive eventuali no-wrap globali */
                    ">
                        <i class="fa-solid fa-quote-left"></i> 
                        <strong>Descrizione:</strong> ${item.testo}
                    </p>
                </div>

                <div class="card-tags" style="
                    margin-top: auto; 
                    padding-top: 15px; 
                    display: flex; 
                    gap: 8px; 
                    flex-wrap: wrap; /* Evita che i tag escano se sono troppi */
                ">
                    <span class="tag-bubble" style="
                        background: rgba(45, 90, 61, 0.1); 
                        color: #2d5a3d; 
                        padding: 5px 12px; 
                        border-radius: 999px; 
                        font-size: 0.75rem; 
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    ">
                        <i class="fa-solid fa-brain" style="font-size: 0.8rem; opacity: 0.8;"></i>
                        ${item.linguaggio}
                    </span>
                    
                    <span class="tag-bubble" style="
                        background: rgba(45, 90, 61, 0.1); 
                        color: #2d5a3d; 
                        padding: 5px 12px; 
                        border-radius: 999px; 
                        font-size: 0.75rem; 
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    ">
                        <i class="fa-solid fa-hourglass-half" style="font-size: 0.8rem; opacity: 0.8;"></i>
                        ${item.lunghezza}
                    </span>
                </div>
            `;

            // --- GESTIONE EVENTI SULLA CARD (JS Puro, stile Visite) ---

            // 1. Selezione card (Verdina)
            card.addEventListener('click', (e) => {
                // Seleziona solo se non ho cliccato sui bottoni azione
                if (!e.target.closest('.icon-btn')) {
                    document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                }
            });

            // 2. Tasto Modifica (Matita)
            card.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Non selezionare la card
                apriModaleItem(item);
            });

            // 3. Tasto Elimina (Cestino)
            card.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Non selezionare la card
                if (confirm(`Sei sicuro di voler eliminare l'opera "${item.operaId}" dal marketplace?`)) {
                    currentItems = currentItems.filter(i => i.id !== item.id);
                    syncToLocalStorage();
                }
            });

            container.appendChild(card);
        });
    }

    // --- GESTIONE MODALE (window. per compatibilità HTML onclick) ---
    window.openModal = function() {
        apriModaleItem(null); // Nuovo inserimento
    };

    window.closeModal = function() {
        chiudiModaleItem();
    };

    function apriModaleItem(item) {
        if (!modal) return;
        modal.style.display = 'flex';
        
        if (item) {
            // MODIFICA
            editingId = item.id;
            document.getElementById('operaId').value = item.operaId;
            document.getElementById('museo').value = item.museo;
            document.getElementById('lunghezza').value = item.lunghezza;
            document.getElementById('linguaggio').value = item.linguaggio;
            document.getElementById('testo').value = item.testo;
            if (brandTitle) brandTitle.innerHTML = `Modifica <span>Opera</span>`;
        } else {
            // NUOVO
            editingId = null;
            form.reset();
            if (brandTitle) brandTitle.innerHTML = `Nuova <span>Opera</span>`;
        }
    }

    function chiudiModaleItem() {
        if (!modal) return;
        modal.style.display = 'none';
        form.reset();
        editingId = null;
    }

    // --- SALVATAGGIO FORM (Crea & Aggiorna) ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const itemData = {
            // Se modifico tengo ID, se nuovo ne creo uno basato sul timestamp
            id: editingId ? editingId : Date.now().toString(),
            operaId: document.getElementById('operaId').value,
            museo: document.getElementById('museo').value,
            lunghezza: document.getElementById('lunghezza').value,
            linguaggio: document.getElementById('linguaggio').value,
            testo: document.getElementById('testo').value
        };

        if (editingId) {
            // Aggiorna nell'array
            currentItems = currentItems.map(i => i.id === editingId ? itemData : i);
        } else {
            // Aggiungi all'array
            currentItems.push(itemData);
        }

        syncToLocalStorage(); // Salva e renderizza
        chiudiModaleItem();
    });

    // --- RICERCA IN TEMPO REALE ---
    searchInput?.addEventListener('input', (e) => {
        const termine = e.target.value.toLowerCase();
        
        const filtrati = currentItems.filter(item => 
            item.operaId.toLowerCase().includes(termine) || 
            item.museo.toLowerCase().includes(termine) ||
            item.testo.toLowerCase().includes(termine)
        );
        
        renderItems(filtrati); // Renderizza solo i risultati
    });

    // --- AVVIO ---
    loadFromLocalStorage();

});