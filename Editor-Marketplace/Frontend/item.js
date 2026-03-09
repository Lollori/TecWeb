// Database locale sincronizzato col browser
let currentItems = JSON.parse(localStorage.getItem('artAroundItems')) || [];
let editingId = null;

// Funzione principale di caricamento
function loadItems() {
    const searchFiltro = document.getElementById('searchText')?.value.toLowerCase() || '';

    const filtered = currentItems.filter(item => {
        return item.operaId.toLowerCase().includes(searchFiltro) || 
               item.testo.toLowerCase().includes(searchFiltro) ||
               item.museo.toLowerCase().includes(searchFiltro);
    });

    renderItems(filtered);
}

// Iniezione delle card nell'HTML
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
        // Usiamo la classe del tuo CSS
        card.className = 'nav-card'; 
        card.style.width = '100%';
        card.style.height = 'auto';
        card.style.padding = '25px';
        card.style.display = 'block'; // Sovrascriviamo il flex centrale del menu per le card elenco

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

// Gestione Modale
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

// Salvataggio e Persistenza
function saveAndRefresh() {
    localStorage.setItem('artAroundItems', JSON.stringify(currentItems));
    loadItems();
}

function deleteItem(id) {
    if (confirm('Vuoi davvero eliminare questa opera?')) {
        currentItems = currentItems.filter(i => i.id !== id);
        saveAndRefresh();
    }
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
            id: editingId || Date.now().toString(),
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

        saveAndRefresh();
        closeModal();
    });

    document.getElementById('searchText')?.addEventListener('input', loadItems);
    loadItems();
});