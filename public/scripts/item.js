/*
// Database locale temporaneo (Array semplice)
let currentItems = JSON.parse(localStorage.getItem('artAroundItems')) || [];

let editingId = null;

// Carica e filtra gli item dall'array locale
function loadItems() {
    const museoFiltro = document.getElementById('filterMuseo')?.value || '';
    const searchFiltro = document.getElementById('searchText')?.value.toLowerCase() || '';

    const filtered = currentItems.filter(item => {
        const matchesMuseo = museoFiltro === '' || item.museo === museoFiltro;
        const matchesSearch = item.operaId.toLowerCase().includes(searchFiltro) || 
                              item.testo.toLowerCase().includes(searchFiltro);
        return matchesMuseo && matchesSearch;
    });

    renderItems(filtered);
}

// Genera le card nella pagina
function renderItems(data = currentItems) {
    const container = document.getElementById('itemsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #4a7c5f;">Nessuna opera trovata.</p>';
        return;
    }
    
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card'; // Usa il tuo stile CSS glass
        card.innerHTML = `
            <div class="item-header" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <h3 style="color: #2d5a3d;">${item.operaId}</h3>
                <div class="item-actions">
                    <button onclick="editItem('${item.id}')" style="border:none; background:none; cursor:pointer; color:#2d5a3d;"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteItem('${item.id}')" style="border:none; background:none; cursor:pointer; color:#be123c;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <p style="font-size: 0.85rem; color: #4a7c5f; margin-bottom: 15px;">${item.testo}</p>
            <div class="tags" style="display: flex; gap: 5px;">
                <span class="badge" style="background:#cfe5d2; padding:3px 8px; border-radius:5px; font-size:0.7rem;">${item.linguaggio}</span>
                <span class="badge" style="background:#cfe5d2; padding:3px 8px; border-radius:5px; font-size:0.7rem;">${item.lunghezza}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Funzioni Modale
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
    }
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
    editingId = null;
}

// CRUD 
function deleteItem(id) {
    if (confirm('Eliminare?')) {
        currentItems = currentItems.filter(i => i.id !== id);
        loadItems();
    }
}

function editItem(id) {
    openModal(id);
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('itemForm');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const data = {
            id: editingId || Date.now().toString(), // Genera ID finto
            operaId: document.getElementById('operaId').value,
            museo: document.getElementById('museo').value,
            lunghezza: document.getElementById('lunghezza').value,
            linguaggio: document.getElementById('linguaggio').value,
            testo: document.getElementById('testo').value
        };

        if (editingId) {
            const index = currentItems.findIndex(i => i.id === editingId);
            currentItems[index] = data;
        } else {
            currentItems.push(data);
        }

        closeModal();
        loadItems();
    });

    // Filtri live
    document.getElementById('searchText')?.addEventListener('input', loadItems);
    document.getElementById('filterMuseo')?.addEventListener('change', loadItems);

    loadItems();
});
*/