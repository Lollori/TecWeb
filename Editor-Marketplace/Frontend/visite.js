document.addEventListener('DOMContentLoaded', () => {

    const searchInput = document.getElementById('searchVisite');
    let visiteArray = [];
    let editingId = null;

    // Cerca prima nell'URL, se non c'è controlla nel sessionStorage
    const currentMuseo = new URLSearchParams(window.location.search).get('museo') || sessionStorage.getItem('currentMuseo');

    if (!currentMuseo) {
        alert("Devi prima selezionare un museo dalla sezione Musei per accedere a questa pagina.");
        window.location.href = "musei.html";
        return;
    }

    // Aggiorna gli url della navbar per restare nel contesto del museo corrente
    document.querySelectorAll('.top-nav-cards a:not(.back-card)').forEach(link => {
        const baseHref = link.getAttribute('href').split('?')[0];
        link.href = `${baseHref}?museo=${encodeURIComponent(currentMuseo)}`;
    });

    const container = document.getElementById('visiteContainer');
    const form = document.getElementById('visitaForm');
    const modal = document.getElementById('visitaModal');

    // Mostra banner del museo selezionato in testa alla pagina
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

    // Carica visite dal server
    async function loadVisite() {
        try {
            const url = currentMuseo ? `/api/visite?codiceIsil=${encodeURIComponent(currentMuseo)}` : '/api/visite';
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.ok) {
                visiteArray = result.data;
                renderVisite(visiteArray);
            } else {
                console.error('Errore nel caricamento delle visite:', result.error);
                alert('Errore nel caricamento delle visite.');
            }
        } catch (e) {
            console.error('Impossibile contattare il server:', e);
            alert('Impossibile contattare il server.');
        }
    }

    searchInput.addEventListener('input', (e) => {
        const termine = e.target.value.toLowerCase();
        
        // Filtro l'array locale delle visite
        const visiteFiltrate = visiteArray.filter(visita => {
            const matchSearch = visita.nomeVisita.toLowerCase().includes(termine) ||
                (visita.nomeMnemonico && visita.nomeMnemonico.toLowerCase().includes(termine));
            const matchMuseo = !currentMuseo || visita.codiceIsil === currentMuseo;
            return matchSearch && matchMuseo;
        });

        // Ridisego la griglia solo con i risultati filtrati
        renderVisite(visiteFiltrate); 
    });

    //SCRIPT MENU (Mini-cards)
    const navCards = document.querySelectorAll('.mini-card');
    navCards.forEach(link => {
        link.addEventListener('click', function() {
            navCards.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    //FUNZIONE DI RENDER DELLA GRIGLIA 
    function renderVisite(dati = visiteArray) {
        container.innerHTML = ''; // Svuota il contenitore

        if (dati.length === 0) {
            container.innerHTML = '<p style="color:#4a7c5f; text-align:center; padding:40px; grid-column:1/-1">Nessuna visita trovata.</p>';
            return;
        }

        dati.forEach(visita => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.dataset.id = visita._id; // Assegna l'ID all'HTML

            card.innerHTML = `
                <div class="card-main-header">
                    <div class="title-group">
                        <h3>${visita.nomeVisita}</h3>
                        <p class="museum-sub"><i class="fa-solid fa-key"></i> Mnemonico: ${visita.nomeMnemonico || 'Nessuno'}</p>
                    </div>
                    <div class="action-group">
                        <div class="buttons-row">
                            <button type="button" class="icon-btn edit-btn" title="Modifica"><i class="fa-solid fa-pen"></i></button>
                            <button type="button" class="icon-btn delete-btn" title="Elimina"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <p class="description-text">${visita.logistica || 'Nessuna indicazione logistica specificata.'}</p>
                </div>
                <div class="card-footer">
                    <span class="tag-bubble"><i class="fa-solid fa-image"></i> ${visita.opereCount || 0} opere incluse</span>
                </div>
            `;

            // EVENTO: Selezione della card (Verdina)
            card.addEventListener('click', (e) => {
                if(!e.target.closest('.icon-btn')) {
                    document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                }
            });

            // EVENTO: Tasto Modifica (Matita)
            card.querySelector('.edit-btn').addEventListener('click', () => {
                apriModale(visita);
            });

            // EVENTO: Tasto Elimina (Cestino)
            card.querySelector('.delete-btn').addEventListener('click', async () => {
                if(confirm(`Sei sicuro di voler eliminare la visita "${visita.nomeVisita}"?`)) {
                    try {
                        const response = await fetch(`/api/visite/${visita._id}`, { method: 'DELETE' });
                        const result = await response.json();
                        if (result.ok) {
                            loadVisite(); // Ricarica dopo delete
                        } else {
                            alert('Errore: ' + result.error);
                        }
                    } catch (err) {
                        alert('Impossibile rimuovere la visita dal server.');
                    }
                }
            });

            container.appendChild(card);
        });
    }

    //GESTIONE SALVATAGGIO FORM (Crea & Aggiorna)
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const nuovaVisita = {
            nomeVisita: document.getElementById('nomeVisita').value,
            nomeMnemonico: document.getElementById('nomeMnemonico').value,
            logistica: document.getElementById('logistica').value,
            quizDomanda: document.getElementById('quizDomanda').value,
            codiceIsil: currentMuseo || '' // Assegniamo codice isil se presente
        };

        try {
            let response, result;
            if (editingId) {
                // MODIFICA
                response = await fetch(`/api/visite/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuovaVisita)
                });
            } else {
                // CREAZIONE
                response = await fetch('/api/visite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuovaVisita)
                });
            }

            result = await response.json();

            if (result.ok) {
                closeModale();
                loadVisite(); // Ricarica per visualizzare le variazioni
            } else {
                alert('Errore nel salvataggio: ' + result.error);
            }
        } catch (err) {
            alert('Impossibile contattare il server per il salvataggio.');
        }
    });


    //FUNZIONI DEL MODALE
    window.openModal = function() { 
        apriModale(null); 
    };

    window.closeModal = function() { 
        closeModale();
    };

    function apriModale(visita) {
        modal.style.display = 'flex';
        document.body.classList.add('no-scroll');
        
        if (visita) {
            editingId = visita._id;
            document.getElementById('nomeVisita').value = visita.nomeVisita || '';
            document.getElementById('nomeMnemonico').value = visita.nomeMnemonico || '';
            document.getElementById('logistica').value = visita.logistica || '';
            document.getElementById('quizDomanda').value = visita.quizDomanda || '';
            document.querySelector('.brand').innerHTML = `Modifica <span>Visita</span>`; 
        } else {
            editingId = null;
            form.reset();
            document.querySelector('.brand').innerHTML = `Dettagli <span>Visita</span>`;
        }
    }

    function closeModale() {
        modal.style.display = 'none';
        document.body.classList.remove('no-scroll');
        form.reset();
        editingId = null; 
    }

    // AVVIO
    loadVisite();

});

function aggiungiOpera() {
    // Ancora da definire
}