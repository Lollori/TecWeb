document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('itemForm');
    var modificaForm = document.getElementById('modificaForm');
    var currentMuseo = new URLSearchParams(window.location.search).get('museo') || sessionStorage.getItem('currentMuseo');
    var currentUserId = localStorage.getItem('userId') || '';
    var allItems = [];

    if (currentMuseo) {
        sessionStorage.setItem('currentMuseo', currentMuseo);
    }

    if (!currentMuseo) {
        alert("Devi prima selezionare un museo.");
        window.location.href = "musei.html";
        return;
    }

    function loadOpere() {
        console.log('loadOpere chiamato per museo:', currentMuseo);
        fetch('/api/opere?codiceIsil=' + encodeURIComponent(currentMuseo))
            .then(function(res) { return res.json(); })
            .then(function(result) {
                if (result.ok) {
                    allItems = result.data;
                    console.log('Opere caricate:', allItems.length);
                    renderItems(allItems);
                } else {
                    console.error('Errore nel caricamento opere:', result.error);
                }
            })
            .catch(function(e) { console.error('Errore fetch loadOpere:', e); });
    }

    window.applyFilters = function() {
        console.log('applyFilters chiamato');
        var searchText = document.getElementById('searchText').value.toLowerCase();
        var filterTipo = document.getElementById('filterTipo').value;
        console.log('searchText:', searchText, 'filterTipo:', filterTipo);
        console.log('allItems count:', allItems.length);
        var filtered = allItems.filter(function(item) {
            var matchesSearch = !searchText ||
                (item.operaId && item.operaId.toLowerCase().includes(searchText)) ||
                (item.autore && item.autore.toLowerCase().includes(searchText)) ||
                (item.descrizione && item.descrizione.toLowerCase().includes(searchText));
            var matchesTipo = !filterTipo || item.tipo === filterTipo;
            return matchesSearch && matchesTipo;
        });
        console.log('filtered count:', filtered.length);
        renderItems(filtered);
    };

    function renderItems(data) {
        var container = document.getElementById('itemsContainer');
        if (!container) return;
        container.innerHTML = '';
        data.forEach(function(item) {
            var card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML =
                '<img src="' + (item.immagine || 'https://placehold.co/400x200?text=No+Image') + '" class="museo-card-img" alt="' + item.operaId + '" onerror="this.style.display=\'none\'">' +
                '<div class="card-main-header" style="margin-top: 20px;">' +
                    '<div class="title-group">' +
                        '<h3>' + item.operaId + '</h3>' +
                        '<p class="museum-sub"><i class="fa-solid fa-user"></i> ' + (item.autore || 'N/A') + '</p>' +
                    '</div>' +
                    '<div class="action-group">' +
                        '<div class="buttons-row">' +
                            '<button class="icon-btn edit-btn" onclick="event.stopPropagation(); editOpera(\'' + item._id + '\')" title="Modifica">' +
                                '<i class="fa-solid fa-pen"></i>' +
                            '</button>' +
                            '<button class="icon-btn delete-btn" onclick="event.stopPropagation(); deleteOpera(\'' + item._id + '\', \'' + (item.operaId || '') + '\')" title="Elimina">' +
                                '<i class="fa-solid fa-trash"></i>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="card-body">' +
                    (item.descrizione ? '<p class="description-text">' + item.descrizione + '</p>' : '') +
                '</div>' +
                '<div class="card-footer">' +
                    '<span class="tag-bubble">' + (item.tipo || 'N/A') + '</span>' +
                    (item.wikidataId ? '<span class="tag-bubble"><i class="fa-solid fa-barcode"></i> ' + item.wikidataId + '</span>' : '') +
                '</div>';
            container.appendChild(card);
        });
    }

    window.editOpera = function(id) {
        fetch('/api/opere/' + id)
            .then(function(res) { return res.json(); })
            .then(function(result) {
                if (result.ok) {
                    var item = result.data;
                    document.getElementById('meditId').value = item._id;
                    document.getElementById('moperaId').value = item.operaId || '';
                    document.getElementById('mautore').value = item.autore || '';
                    document.getElementById('mtipo').value = item.tipo || '';
                    document.getElementById('mdatazione').value = item.datazione || '';
                    document.getElementById('mwikidataId').value = item.wikidataId || '';
                    document.getElementById('mimmagine').value = item.immagine || '';
                    document.getElementById('mdescrizione').value = item.descrizione || '';
                    document.getElementById('mlinguaggio').value = item.linguaggio || 'semplice';
                    document.getElementById('mlunghezza').value = item.lunghezza || '1min';
                    document.getElementById('mtesto').value = item.testo || '';
                    document.getElementById('maltezza').value = item.altezza || 0;
                    document.getElementById('mlarghezza').value = item.larghezza || 0;
                    document.getElementById('mprofondita').value = item.profondita || 0;
                    document.getElementById('mtecnica').value = item.tecnica || '';
                    document.getElementById('mmateriali').value = item.materiali || '';
                    toggleFields('edit');
                    switchSection('modifica-opera');
                }
            })
            .catch(function(e) { console.error(e); });
    };

    window.deleteOpera = function(id, nome) {
        if (!confirm('Eliminare "' + nome + '"?')) return;
        fetch('/api/opere/' + id, { method: 'DELETE' })
            .then(function(res) { return res.json(); })
            .then(function(result) {
                if (result.ok) {
                    loadOpere();
                } else {
                    alert('Errore: ' + (result.error || 'Errore sconosciuto'));
                }
            })
            .catch(function(e) { alert('Errore di rete: ' + e.message); });
    };

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var itemData = {
                codiceIsil: currentMuseo,
                operaId: document.getElementById('operaId').value,
                autore: document.getElementById('autore').value,
                tipo: document.getElementById('tipo').value,
                datazione: document.getElementById('datazione').value,
                wikidataId: document.getElementById('wikidataId').value,
                immagine: document.getElementById('immagine').value,
                descrizione: document.getElementById('descrizione').value,
                linguaggio: document.getElementById('linguaggio').value,
                lunghezza: document.getElementById('lunghezza').value,
                testo: document.getElementById('testo').value,
                creatoDa: currentUserId,
                altezza: Number(document.getElementById('altezza').value) || 0,
                larghezza: Number(document.getElementById('larghezza').value) || 0,
                profondita: document.getElementById('tipo').value === 'quadro' ? 0 : (Number(document.getElementById('profondita').value) || 0),
                tecnica: document.getElementById('tipo').value === 'quadro' ? document.getElementById('tecnica').value : '',
                materiali: document.getElementById('tipo').value !== 'quadro' ? document.getElementById('materiali').value : ''
            };
            fetch('/api/opere', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            })
            .then(function(res) { return res.json(); })
            .then(function(result) {
                if (result.ok) {
                    switchSection('opere');
                    loadOpere();
                } else {
                    alert('Errore: ' + (result.error || 'Errore sconosciuto'));
                }
            })
            .catch(function(e) {
                alert('Errore di rete: ' + e.message);
            });
        });
    }

    if (modificaForm) {
        modificaForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var id = document.getElementById('meditId').value;
            if (!id) {
                alert('Errore: ID opera non trovato. Riprovare ad aprire il form di modifica.');
                return;
            }
            var itemData = {
                operaId: document.getElementById('moperaId').value,
                autore: document.getElementById('mautore').value,
                tipo: document.getElementById('mtipo').value,
                datazione: document.getElementById('mdatazione').value,
                wikidataId: document.getElementById('mwikidataId').value,
                immagine: document.getElementById('mimmagine').value,
                descrizione: document.getElementById('mdescrizione').value,
                linguaggio: document.getElementById('mlinguaggio').value,
                lunghezza: document.getElementById('mlunghezza').value,
                testo: document.getElementById('mtesto').value,
                altezza: Number(document.getElementById('maltezza').value) || 0,
                larghezza: Number(document.getElementById('mlarghezza').value) || 0,
                profondita: document.getElementById('mtipo').value === 'quadro' ? 0 : (Number(document.getElementById('mprofondita').value) || 0),
                tecnica: document.getElementById('mtipo').value === 'quadro' ? document.getElementById('mtecnica').value : '',
                materiali: document.getElementById('mtipo').value !== 'quadro' ? document.getElementById('mmateriali').value : ''
            };
            console.log('Modifica opera ID:', id);
            console.log('Dati inviati:', itemData);
            fetch('/api/opere/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            })
            .then(function(res) {
                console.log('Risposta server status:', res.status);
                return res.json();
            })
            .then(function(result) {
                console.log('Risposta JSON:', result);
                if (result.ok) {
                    alert('Opera aggiornata con successo!');
                    switchSection('opere');
                    loadOpere();
                } else {
                    alert('Errore: ' + (result.error || 'Errore sconosciuto'));
                }
            })
            .catch(function(e) {
                console.error('Errore fetch:', e);
                alert('Errore di rete: ' + e.message);
            });
        });
    } else {
        console.error('Form modificaForm non trovato!');
    }

    loadOpere();
});
