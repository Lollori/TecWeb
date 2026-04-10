/**
 * ArtAround Marketplace - Logica di gestione Catalogo ed E-commerce
 */

// Stato globale del carrello (simulato per la sessione corrente)
let cartCount = 0;

/**
 * Funzione principale di inizializzazione
 */
async function initMarketplace() {
    console.log("Inizializzazione Marketplace in corso...");
    
    try {
        // Eseguiamo le chiamate al backend in parallelo per ottimizzare i tempi
        const [resMusei, resVisite] = await Promise.all([
            fetch('/api/musei'),
            fetch('/api/visite')
        ]);

        const musei = await resMusei.json();
        const visite = await resVisite.json();

        // Popoliamo le due sezioni della pagina
        renderDestinazioni(musei);
        renderVisite(visite);

    } catch (error) {
        console.error("Errore durante il caricamento dei dati:", error);
        mostraErrore();
    }
}

/**
 * Popola la prima fila: Scegli la tua Destinazione (Musei)
 */
function renderDestinazioni(data) {
    const container = document.getElementById('museiGrid');
    if (!container) return;

    // Se non ci sono dati, mostriamo un messaggio
    if (!data || data.length === 0) {
        container.innerHTML = `<p class="empty-msg">Nessun museo disponibile al momento.</p>`;
        return;
    }

    container.innerHTML = data.map(m => `
        <div class="card-ecom destination-card">
            <div class="card-image-placeholder">
                <i class="fa-solid fa-building-columns"></i>
            </div>
            <div class="card-body">
                <h4>${m.nome}</h4>
                <p><small><i class="fa-solid fa-location-dot"></i> ${m.citta || 'Italia'}</small></p>
                <div class="card-meta">
                    <span>Codice ISIL: <code>${m.codiceIsil}</code></span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Popola la seconda fila: Visite in Evidenza (Playlist di Item)
 */
function renderVisite(data) {
    const container = document.getElementById('visiteGrid');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `<p class="empty-msg">Nessuna visita disponibile. Torna nell'Editor per crearne una!</p>`;
        return;
    }

    container.innerHTML = data.map(v => `
        <div class="card-ecom">
            <div class="card-image-placeholder" style="background-color: #f1f8e9;">
                <span class="visita-label">VISITA COMPLETA</span>
            </div>
            <div class="card-body">
                <h4 class="visita-titolo">${v.titolo}</h4>
                <p class="visita-autore">Autore: <strong>${v.autore || 'Esperto ArtAround'}</strong></p>
                
                <div class="card-meta-ecom">
                    <span class="prezzo">€ ${v.prezzo || 'Gratis'}</span>
                    <span class="durata"><i class="fa-solid fa-clock"></i> ${v.durata || '30 min'}</span>
                </div>

                <button class="btn-add-cart" onclick="aggiungiAlCarrello('${v._id}', '${v.titolo.replace(/'/g, "\\'")}')">
                    <i class="fa-solid fa-cart-plus"></i> Aggiungi al Navigator
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Gestione E-commerce: Aggiunta al carrello
 */
function aggiungiAlCarrello(id, titolo) {
    // Incremento contatore
    cartCount++;
    
    // Aggiornamento grafico del badge nell'header
    const badge = document.getElementById('cartCount');
    if (badge) {
        badge.innerText = cartCount;
        
        // Feedback visivo (animazione)
        badge.classList.add('bump');
        setTimeout(() => badge.classList.remove('bump'), 300);
    }

    // Notifica utente (sostituibile con un toast più elegante)
    console.log(`Prodotto aggiunto: ${titolo} (ID: ${id})`);
}

/**
 * Gestione errori di caricamento
 */
function mostraErrore() {
    const main = document.querySelector('.main-viewport');
    if (main) {
        main.innerHTML += `
            <div class="error-notice">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Si è verificato un errore nel collegamento con il server. Verifica che MongoDB e il server Node siano attivi.</p>
            </div>
        `;
    }
}

// Avvio dell'applicazione al caricamento del DOM
document.addEventListener('DOMContentLoaded', initMarketplace);