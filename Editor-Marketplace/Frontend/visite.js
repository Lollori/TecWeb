document.addEventListener('DOMContentLoaded', () => {

    const searchInput = document.getElementById('searchVisite');

    searchInput.addEventListener('input', (e) => {
        const termine = e.target.value.toLowerCase();
        
        // Filtro l'array locale delle visite
        const visiteFiltrate = visiteArray.filter(visita => {
            const matchSearch = visita.nomeVisita.toLowerCase().includes(termine) ||
                visita.nomeMnemonico.toLowerCase().includes(termine);
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


    //DATI LOCALI (Testing simulando il Database di MongoDB) 
    let visiteArray = [
        { id: 1, nomeVisita: "Capolavori del Rinascimento", nomeMnemonico: "Fenice rossa", logistica: "Entrata da via Garibaldi 2.", quizDomanda: "Chi dipinse la Primavera?", opereCount: 12 },
        { id: 2, nomeVisita: "Visita Rapida (30 min)", nomeMnemonico: "Drago blu", logistica: "Ingresso principale, sala 1.", quizDomanda: "", opereCount: 5 }
    ];

    const currentMuseo = new URLSearchParams(window.location.search).get('museo');

    // Mostra nome museo nel subtitle
    if (currentMuseo) {
        fetch(`/api/musei/${encodeURIComponent(currentMuseo)}`)
            .then(r => r.json())
            .then(result => {
                const subtitle = document.getElementById('museoSubtitle');
                if (subtitle && result.ok) subtitle.textContent = `Museo: ${result.data.nome}`;
            })
            .catch(() => {});
    }

    let editingId = null;

    const container = document.getElementById('visiteContainer');
    const form = document.getElementById('visitaForm');


    //FUNZIONE DI RENDER DELLA GRIGLIA 
    // Disegna l'array sulla pagina in tempo reale
    function renderVisite(dati = visiteArray) {
        container.innerHTML = ''; // Svuota il contenitore

        dati.forEach(visita => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.dataset.id = visita.id; // Assegna l'ID all'HTML

            // HTML della singola card, con i nuovi bottoni aggiunti
            card.innerHTML = `
                <div class="card-actions">
                    <button type="button" class="icon-btn edit-btn" title="Modifica"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icon-btn delete-btn" title="Elimina"><i class="fa-solid fa-trash"></i></button>
                </div>
                <h3>${visita.nomeVisita}</h3>
                <div class="card-details">
                    <p><i class="fa-solid fa-key"></i> <strong>Mnemonico:</strong> ${visita.nomeMnemonico || 'Nessuno'}</p>
                    <p><i class="fa-solid fa-image"></i> <strong>Opere:</strong> ${visita.opereCount} incluse</p>
                </div>
            `;

            // EVENTO: Selezione della card (Verdina)
            card.addEventListener('click', (e) => {
                // Seleziona solo se non ho cliccato sui bottoncini
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
            card.querySelector('.delete-btn').addEventListener('click', () => {
                // Conferma di sicurezza
                if(confirm(`Sei sicuro di voler eliminare la visita "${visita.nomeVisita}"?`)) {
                    visiteArray = visiteArray.filter(v => v.id !== visita.id); // Rimuove dall'array
                    renderVisite(); // Aggiorna la vista
                }
            });

            container.appendChild(card);
        });
    }


    //GESTIONE SALVATAGGIO FORM (Crea & Aggiorna)
    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Evita il ricaricamento della pagina
        
        // Raccogli i dati dal form
        const nuovaVisita = {
            id: editingId ? editingId : Date.now(), // Se modifico tengo l'id, altrimenti ne creo uno fittizio
            nomeVisita: document.getElementById('nomeVisita').value,
            nomeMnemonico: document.getElementById('nomeMnemonico').value,
            logistica: document.getElementById('logistica').value,
            quizDomanda: document.getElementById('quizDomanda').value,
            opereCount: editingId ? visiteArray.find(v => v.id === editingId).opereCount : 0 
        };

        if (editingId) {
            // Seleziona la visita vecchia e sovrascrivila
            visiteArray = visiteArray.map(v => v.id === editingId ? nuovaVisita : v);
        } else {
            // Aggiungi come nuova visita
            visiteArray.push(nuovaVisita);
        }

        renderVisite(); // Aggiorna graficamente
        closeModale(); // Chiudi
    });


    //FUNZIONI DEL MODALE
    const modal = document.getElementById('visitaModal');

    // Funzione richiamata dal bottone "Nuova Visita" nell'HTML
    window.openModal = function() { 
        apriModale(null); // Apro il modale "Vuoto"
    };

    // Funzione richiamata dalla "X" e da "Annulla" nell'HTML
    window.closeModal = function() { 
        closeModale();
    };

    function apriModale(visita) {
        modal.style.display = 'flex';
        
        if (visita) {
            // MODIFICA: Riempio i campi con i dati esistenti
            editingId = visita.id;
            document.getElementById('nomeVisita').value = visita.nomeVisita;
            document.getElementById('nomeMnemonico').value = visita.nomeMnemonico;
            document.getElementById('logistica').value = visita.logistica;
            document.getElementById('quizDomanda').value = visita.quizDomanda;
            document.querySelector('.brand').innerHTML = `Modifica <span>Visita</span>`; // Cambio il titolo
        } else {
            // NUOVO: Form vuoto
            editingId = null;
            form.reset();
            document.querySelector('.brand').innerHTML = `Dettagli <span>Visita</span>`;
        }
    }

    function closeModale() {
        modal.style.display = 'none';
        form.reset();
        editingId = null; // Resetto lo stato
    }

    //AVVIO
    const visiteMuseo = currentMuseo
        ? visiteArray.filter(v => v.codiceIsil === currentMuseo)
        : visiteArray;
    renderVisite(visiteMuseo);

});

function aggiungiOpera() {
    // Ancora da definire
}