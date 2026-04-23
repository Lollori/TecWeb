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
    let currentUserId = localStorage.getItem('userId') || '';
    const currentMuseo = new URLSearchParams(window.location.search).get('museo') || sessionStorage.getItem('currentMuseo');

    
    if (currentMuseo) {
        // 2. Salva in sessione in modo da resistere ai reload
        sessionStorage.setItem('currentMuseo', currentMuseo);
        
        // 3. Aggiorna dinamicamente tutti i link della navbar aggiungendo il parametro
        document.querySelectorAll('.top-nav-cards a:not(.back-card)').forEach(link => {
            const baseHref = link.getAttribute('href').split('?')[0];
            link.href = `${baseHref}?museo=${encodeURIComponent(currentMuseo)}`;
        });
    }
    
    // Controllo sicurezza: se non c'è il museo nell'URL, torna alla selezione
    if (!currentMuseo) {
        alert("Devi prima selezionare un museo dalla sezione Musei.");
        window.location.href = "musei.html";
        return;
    }

    // --- 1. CARICAMENTO DATI DAL SERVER ---
    async function loadOpere() {
        try {
            // Chiediamo al backend solo le opere del museo corrente
            const response = await fetch(`/api/opere?codiceIsil=${encodeURIComponent(currentMuseo)}`);
            const result = await response.json();
            
            if (result.ok) {
                currentItems = result.data;
                applyClientFilters(); // Applica ricerca e filtri UI sui dati ricevuti
            } else {
                console.error("Errore caricamento:", result.error);
            }
        } catch (e) {
            console.error("Errore di rete:", e);
        }
    }

    // Funzione per filtrare i dati già scaricati (Ricerca/Prezzo)
    function applyClientFilters() {
        const searchFiltro = searchInput?.value.toLowerCase() || '';
        const prezzoFiltro = filterPrezzo?.value || 'tutti';

        const filtrati = currentItems.filter(item => {
            const matchSearch = item.operaId.toLowerCase().includes(searchFiltro);
            const matchUser = currentFilter === 'mie' ? item.autore === currentUserId : item.pubblica === true;
            const matchPrezzo = prezzoFiltro === 'tutti' || (prezzoFiltro === 'gratuiti' ? item.prezzo == 0 : item.prezzo > 0);
            return matchSearch && matchUser && matchPrezzo;
        });
        
        renderItems(filtrati);
        updateCharts(); 
    }

    // --- 2. RENDER CARD ---
    function renderItems(dati) {
        if (!container) return;
        container.innerHTML = ''; 

        if (dati.length === 0) {
            container.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:50px; color:#4a7c5f;">Nessun contenuto trovato per questo museo.</p>';
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
                        <p class="museum-sub"><i class="fa-solid fa-barcode"></i> ISIL: ${item.codiceIsil}</p>
                    </div>
                    <div class="action-group">
                        <div class="badges-row">
                            ${item.prezzo > 0 ? `<span class="price-badge">€${item.prezzo}</span>` : `<span class="free-badge">Gratis</span>`}
                        </div>
                        <div class="buttons-row">
                            ${isMia ? `
                                <button type="button" class="icon-btn edit-btn" onclick="apriModaleItem('${item._id}')"><i class="fa-solid fa-pen"></i></button>
                                <button type="button" class="icon-btn delete-btn" onclick="eliminaOpera('${item._id}')"><i class="fa-solid fa-trash"></i></button>
                            ` : `<button class="btn-add" onclick="adottaOpera('${item._id}')">Adotta</button>`}
                        </div>
                    </div>
                </div>
                <div class="card-body"><p class="description-text">${item.testo}</p></div>
                <div class="card-footer">
                    <span class="tag-bubble"><i class="fa-solid fa-hourglass-half"></i> ${item.lunghezza}</span>
                    <span class="adozioni-count">${item.adozioni || 0} adozioni</span>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --- 3. MODALE & FORM (SALVATAGGIO SU DB) ---
    window.apriModaleItem = (id) => {
        modal.style.display = 'flex';
        document.body.classList.add('no-scroll');
        
        if (id) {
            const item = currentItems.find(i => i._id === id);
            editingId = id;
            document.getElementById('operaId').value = item.operaId;
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

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const itemData = {
            codiceIsil: currentMuseo, // NECESSARIO: associa l'opera al museo corrente
            operaId: document.getElementById('operaId').value,
            lunghezza: document.getElementById('lunghezza').value,
            linguaggio: document.getElementById('linguaggio').value,
            testo: document.getElementById('testo').value,
            licenza: document.getElementById('licenza').value,
            prezzo: parseFloat(document.getElementById('prezzo').value) || 0,
            pubblica: document.getElementById('pubblica').checked,
            autore: currentUserId
        };

        const url = editingId ? `/api/opere/${editingId}` : '/api/opere';
        const method = editingId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });
            
            const result = await res.json();
            if (result.ok) {
                closeModal();
                loadOpere(); // Ricarica tutto dal server
            }
        } catch (e) { alert("Errore nel salvataggio"); }
    };

    window.eliminaOpera = async (id) => {
        if (!confirm("Eliminare definitivamente quest'opera?")) return;
        try {
            const res = await fetch(`/api/opere/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.ok) loadOpere();
        } catch (e) { alert("Errore durante l'eliminazione"); }
    };

    // --- 4. UTILS & CHARTS (INVARIATI) ---
    window.closeModal = () => { 
        modal.style.display = 'none'; 
        document.body.classList.remove('no-scroll');
        editingId = null; 
    };

    window.setFilter = (f) => { 
        currentFilter = f; 
        filterMieBtn.classList.toggle('active', f === 'mie');
        filterTutteBtn.classList.toggle('active', f === 'tutte');
        applyClientFilters(); 
    };

    // Funzione updateCharts (mantenuta come nel tuo originale)
    function updateCharts() {
        const mieOpere = currentItems.filter(item => item.autore === currentUserId);
        const dashboard = document.getElementById('statsDashboard');
        if (!dashboard) return;
        if (mieOpere.length === 0) { dashboard.style.display = 'none'; return; }
        dashboard.style.display = 'flex';
        // ... (resto della logica SVG come nel tuo file originale)
    }

    // --- AVVIO ---
    loadOpere();
});