document.addEventListener('DOMContentLoaded', () => {

    const searchInput = document.getElementById('searchVisite');
    let visiteArray = [];
    let editingId = null;

    const currentMuseo = new URLSearchParams(window.location.search).get('museo');
    const container = document.getElementById('visiteContainer');
    const form = document.getElementById('visitaForm');
    const modal = document.getElementById('visitaModal');

    // Mostra nome museo nel titolo
    if (currentMuseo) {
        fetch(`/api/musei/${encodeURIComponent(currentMuseo)}`)
            .then(r => r.json())
            .then(result => {
                if (result.ok) {
                    const headerTitolo = document.querySelector('.header-text h1');
                    if (headerTitolo) {
                        headerTitolo.innerHTML = `Visite <span style="font-size: 0.65em; background: rgba(74, 124, 95, 0.1); color: #2d503b; padding: 4px 12px; border-radius: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-left: 10px; vertical-align: middle; border: 1px solid rgba(74, 124, 95, 0.2);"><i class="fa-solid fa-building-columns" style="margin-right:6px"></i>${result.data.nome}</span>`;
                    }
                }
            })
            .catch(() => {});
    }

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
                <div class="card-actions">
                    <button type="button" class="icon-btn edit-btn" title="Modifica"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icon-btn delete-btn" title="Elimina"><i class="fa-solid fa-trash"></i></button>
                </div>
                <h3>${visita.nomeVisita}</h3>
                <div class="card-details">
                    <p><i class="fa-solid fa-key"></i> <strong>Mnemonico:</strong> ${visita.nomeMnemonico || 'Nessuno'}</p>
                    <p><i class="fa-solid fa-image"></i> <strong>Opere:</strong> ${visita.opereCount || 0} incluse</p>
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
        form.reset();
        editingId = null; 
    }

    // AVVIO
    loadVisite();

});

function aggiungiOpera() {
    // Ancora da definire
}