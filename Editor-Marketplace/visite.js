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
    const modalEl = document.getElementById('visitaModal');
    const bsModal = new bootstrap.Modal(modalEl);

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
                    <span class="tag-bubble"><i class="fa-solid fa-image"></i> ${visita.itemIds?.length ?? visita.opereCount ?? 0} items inclusi</span>
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

        const errors = validateItemSelection();
        if (errors.length > 0) {
            refreshValidationBanner();
            document.getElementById('items-validation-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        const itemIds = [...document.querySelectorAll('#items-checkboxes input[type="checkbox"]:checked')]
            .map(cb => cb.value);

        const nuovaVisita = {
            nomeVisita: document.getElementById('nomeVisita').value,
            nomeMnemonico: document.getElementById('nomeMnemonico').value,
            logistica: document.getElementById('logistica').value,
            quizDomanda: document.getElementById('quizDomanda').value,
            codiceIsil: currentMuseo || '',
            itemIds,
            opereCount: itemIds.length
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

    // Mappa id -> item completo, usata dalla validazione
    let allItemsData = {};

    // Restituisce i toni che un item ha compilati (con almeno una durata non vuota)
    function getItemTones(item) {
        const tones = [];
        const t = item.toni || {};
        const hasTone = (obj) => obj && (obj.d3?.trim() || obj.d15?.trim() || obj.d40?.trim());
        if (hasTone(t.semplice))  tones.push('semplice');
        if (hasTone(t.medio))     tones.push('medio');
        if (hasTone(t.avanzato))  tones.push('avanzato');
        return tones;
    }

    // Aggiornato ogni volta che una checkbox cambia; restituisce array di errori
    function validateItemSelection() {
        const checked = [...document.querySelectorAll('#items-checkboxes input[type="checkbox"]:checked')];
        const byOpera = {};
        for (const cb of checked) {
            const item = allItemsData[cb.value];
            if (!item) continue;
            const oid = item.operaId;
            if (!byOpera[oid]) byOpera[oid] = [];
            byOpera[oid].push(item);
        }

        const errors = [];
        for (const [operaId, items] of Object.entries(byOpera)) {
            if (items.length > 3) {
                errors.push(`"${operaId}": selezionati ${items.length} items (massimo 3 per opera).`);
                continue;
            }
            const toneCount = {};
            for (const item of items) {
                for (const tone of getItemTones(item)) {
                    toneCount[tone] = (toneCount[tone] || 0) + 1;
                }
            }
            for (const [tone, count] of Object.entries(toneCount)) {
                if (count > 1) {
                    errors.push(`"${operaId}": ${count} items con tono <strong>${tone}</strong> (massimo 1 per tono).`);
                }
            }
        }
        return errors;
    }

    function refreshValidationBanner() {
        const banner = document.getElementById('items-validation-banner');
        const errors = validateItemSelection();
        if (errors.length === 0) {
            banner.style.display = 'none';
            banner.innerHTML = '';
        } else {
            banner.style.display = 'block';
            banner.innerHTML = '<strong>Conflitti rilevati:</strong><ul class="mb-0 mt-1 ps-3">'
                + errors.map(e => `<li>${e}</li>`).join('')
                + '</ul>';
        }
    }

    // Badge HTML per i toni di un item
    function toneBadges(item) {
        const tones = getItemTones(item);
        if (!tones.length) return '<span style="font-size:0.72rem;color:#94a3b8;margin-left:4px;">(nessun tono)</span>';
        const colors = { semplice: '#6366f1', medio: '#0ea5e9', avanzato: '#f59e0b' };
        return tones.map(t =>
            `<span style="font-size:0.7rem;font-weight:600;padding:1px 7px;border-radius:20px;margin-left:4px;background:${colors[t]}22;color:${colors[t]};border:1px solid ${colors[t]}44;">${t}</span>`
        ).join('');
    }

    async function loadItemsCheckboxes(selectedIds = []) {
        const container = document.getElementById('items-checkboxes');
        container.innerHTML = '<p class="text-muted small mb-0">Caricamento items...</p>';
        try {
            const res = await fetch(`/api/items?museumId=${encodeURIComponent(currentMuseo)}`);
            const result = await res.json();
            if (!result.ok || result.data.length === 0) {
                container.innerHTML = '<p class="text-muted small mb-0">Nessun item disponibile per questo museo.</p>';
                return;
            }
            allItemsData = {};
            result.data.forEach(item => { allItemsData[item._id] = item; });

            container.innerHTML =
                '<div id="items-validation-banner" style="display:none;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:8px 12px;margin-bottom:8px;color:#dc2626;font-size:0.82rem;"></div>'
                + result.data.map(item => `
                <div class="form-check mb-1" style="display:flex;align-items:center;flex-wrap:wrap;gap:2px;">
                    <input class="form-check-input" type="checkbox" value="${item._id}" id="item-${item._id}"
                        ${selectedIds.map(String).includes(String(item._id)) ? 'checked' : ''}>
                    <label class="form-check-label small" for="item-${item._id}" style="margin-left:6px;">${item.operaId}</label>
                    ${toneBadges(item)}
                </div>
            `).join('');

            // Listener di validazione su ogni checkbox
            container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', refreshValidationBanner);
            });

            // Validazione iniziale (per editing con items già selezionati)
            refreshValidationBanner();
        } catch (e) {
            container.innerHTML = '<p class="text-danger small mb-0">Errore nel caricamento degli items.</p>';
        }
    }

    function apriModale(visita) {
        if (visita) {
            editingId = visita._id;
            document.getElementById('nomeVisita').value = visita.nomeVisita || '';
            document.getElementById('nomeMnemonico').value = visita.nomeMnemonico || '';
            document.getElementById('logistica').value = visita.logistica || '';
            document.getElementById('quizDomanda').value = visita.quizDomanda || '';
            const titleEl = modalEl.querySelector('.modal-title');
            if (titleEl) titleEl.innerHTML = `Modifica <span class="text-magenta">Visita</span>`;
            loadItemsCheckboxes(visita.itemIds || []);
        } else {
            editingId = null;
            form.reset();
            const titleEl = modalEl.querySelector('.modal-title');
            if (titleEl) titleEl.innerHTML = `Dettagli <span class="text-magenta">Visita</span>`;
            loadItemsCheckboxes([]);
        }
        bsModal.show();
    }

    function closeModale() {
        bsModal.hide();
        form.reset();
        editingId = null;
        allItemsData = {};
    }

    // AVVIO
    loadVisite();

});
