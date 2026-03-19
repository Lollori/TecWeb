// Database locale sincronizzato col browser
let currentItems = [];
let editingId = null;

// Sostituisce fetchItemsFromServer: Carica i dati dal localStorage
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('opere_marketplace');
    if (savedData) {
        currentItems = JSON.parse(savedData);
    } else {
        currentItems = []; // Se è vuoto, inizializza array vuoto
    }
    loadItems(); // Filtra e renderizza
}

// Salva lo stato attuale di currentItems nel localStorage
function syncToLocalStorage() {
    localStorage.setItem('opere_marketplace', JSON.stringify(currentItems));
    loadItems(); // Aggiorna la vista
}

// Funzione principale di caricamento (rimane quasi uguale)
function loadItems() {
    const searchFiltro = document.getElementById('searchText')?.value.toLowerCase() || '';

    const filtered = currentItems.filter(item => {
        return (item.operaId?.toLowerCase().includes(searchFiltro) || 
               item.testo?.toLowerCase().includes(searchFiltro) ||
               item.museo?.toLowerCase().includes(searchFiltro));
    });

    renderItems(filtered);
}

// Iniezione delle card (rimane uguale)
function renderItems(data = currentItems) {
    const container = document.getElementById('itemsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #4a7c5f; padding: 40px;">Nessuna opera trovata.</p>';
        return;
    }
    
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'nav-card'; 
        card.style.width = '100%';
        card.style.height = 'auto';
        card.style.padding = '25px';
        card.style.display = 'block';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                    <h3 style="color: #2d5a3d; font-family: 'Playpen Sans';">${item.operaId}</h3>
                    <small style="color: #6aab7e;">${item.museo}</small>
                </div>
                <div class="item-actions" style="display: flex; gap: 10px;">
                    <button onclick="editItem('${item.id}')" style="border:none; background:none; cursor:pointer; color:#2d5a3d; font-size: 1.1rem;"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteItem('${item.id}')" style="border:none; background:none; cursor:pointer; color:#be123c; font-size: 1.1rem;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <p style="font-size: 0.9rem; color: #4a7c5f; line-height: 1.5; margin-bottom: 15px;">${item.testo}</p>
            <div style="display: flex; gap: 8px;">
                <span style="background: rgba(45, 90, 61, 0.1); color: #2d5a3d; padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">${item.linguaggio}</span>
                <span style="background: rgba(45, 90, 61, 0.1); color: #2d5a3d; padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">${item.lunghezza}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Sostituisce saveToServer: Gestisce sia inserimento che modifica in locale
function saveLocal(itemData) {
    if (editingId) {
        // Modifica: trova l'indice e sostituisci
        const index = currentItems.findIndex(i => i.id === editingId);
        if (index !== -1) currentItems[index] = itemData;
    } else {
        // Nuovo inserimento
        currentItems.push(itemData);
    }
    
    syncToLocalStorage();
    closeModal();
}

// Sostituisce la versione async di deleteItem
function deleteItem(id) {
    if (confirm('Vuoi davvero eliminare questa opera?')) {
        currentItems = currentItems.filter(item => item.id !== id);
        syncToLocalStorage();
    }
}

// Gestione Modale (rimane uguale)
function openModal(id = null) {
    editingId = id;
    const modal = document.getElementById('itemModal');
    const form = document.getElementById('itemForm');
    
    if (id) {
        const item = currentItems.find(i => i.id === id);
        if (item) {
            document.getElementById('operaId').value = item.operaId;
            document.getElementById('museo').value = item.museo;
            document.getElementById('lunghezza').value = item.lunghezza;
            document.getElementById('linguaggio').value = item.linguaggio;
            document.getElementById('testo').value = item.testo;
        }
    } else {
        form.reset();
        editingId = null;
    }
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
    editingId = null;
}

function editItem(id) {
    openModal(id);
}

// Avvio al caricamento pagina
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('itemForm');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const data = {
            id: editingId || Date.now().toString(), // Genera ID se nuovo
            operaId: document.getElementById('operaId').value,
            museo: document.getElementById('museo').value,
            lunghezza: document.getElementById('lunghezza').value,
            linguaggio: document.getElementById('linguaggio').value,
            testo: document.getElementById('testo').value
        };

        saveLocal(data);
    });

    document.getElementById('searchText')?.addEventListener('input', loadItems);
    
    // Inizializza caricando dal LocalStorage
    loadFromLocalStorage();
});