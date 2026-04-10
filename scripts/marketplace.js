async function loadVisiteMarketplace() {
    try {
        // Chiamata all'API per recuperare tutte le visite salvate nel DB
        const response = await fetch('/api/visite');
        const visite = await response.json();

        const tableBody = document.getElementById('visiteTableBody');
        tableBody.innerHTML = visite.map(v => `
            <tr>
                <td><code>${v.codiceIsil}</code></td>
                <td>
                    <span class="tag-visita">VISITA</span><br>
                    <strong>${v.titolo}</strong>
                </td>
                <td>
                    <small><i class="fa-solid fa-info-circle"></i> ${v.logistica || 'Informazioni incluse (bagni, uscite)'}</small>
                </td>
                <td><i class="fa-solid fa-clock"></i> ${v.durata || 'N/D'}</td>
                <td>${v.autore || 'Esperto'}</td>
                <td>
                    <button class="btn-get" onclick="acquireVisit('${v._id}')">
                        <i class="fa-solid fa-cloud-download"></i> Scarica per Navigator
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("Errore caricamento marketplace:", e);
    }
}

function acquireVisit(id) {
    // Simulazione del "acquisto/download" per l'app Navigator
    alert("Visita pronta! Ora puoi trovarla sulla tua app Navigator per guidarti nel museo.");
}

document.addEventListener('DOMContentLoaded', loadVisiteMarketplace);