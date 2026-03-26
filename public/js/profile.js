document.addEventListener('DOMContentLoaded', () => {
    // 1. Recupero dati dal LocalStorage
    const userUsername = localStorage.getItem('userUsername');
    const userRole = localStorage.getItem('userRole'); // "CUR" o "VIS"

    // 2. Elementi del DOM
    const loginBtn = document.getElementById('loginBtn');
    const placeholder = document.getElementById('nav-profile-placeholder');

    // 3. LOGICA DI VISUALIZZAZIONE
    if (userUsername && placeholder) {
        // --- UTENTE LOGGATO ---
        if (loginBtn) loginBtn.style.display = 'none';

        placeholder.innerHTML = `
            <div class="nav-profile-container" id="navProfileContainer">
                <div class="nav-avatar" id="navAvatar">?</div>
                <div class="profile-dropdown">
                    <span id="userEmailDisplay">${userUsername}</span>
                    <a href="/Editor-Marketplace/Frontend/visite.html?autore=${encodeURIComponent(localStorage.getItem('userId') || '')}" class="dropdown-item">Le mie visite</a>
                    <a href="/docs/profile.html" class="dropdown-item">Gestisci Profilo</a>
                    <a href="#" class="dropdown-item logout-link" onclick="logout(event)">Logout</a>
                </div>
            </div>
        `;

        // Toggle click sul container
        const container = document.getElementById('navProfileContainer');
        container.addEventListener('click', (e) => {
            if (!e.target.closest('a')) container.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) container.classList.remove('open');
        });

        // Configuriamo l'avatar (Lettera e Colore)
        const avatar = document.getElementById('navAvatar');
        if (avatar && userRole) {
            avatar.innerText = userRole === "CUR" ? "C" : "V";
            avatar.style.backgroundColor = userRole === "CUR" ? "#1a3a2a" : "#4a7c5f";
        }

    } else {
        // --- UTENTE NON LOGGATO ---
        if (loginBtn) loginBtn.style.display = 'block';
        
        // Svuotiamo il placeholder se per caso era rimasto qualcosa
        if (placeholder) placeholder.innerHTML = '';
    }
});

/**
 * Funzione di Logout
 * Cancella i dati e rimanda alla home o al login
 */
function logout(event) {
    if (event) event.preventDefault(); // Evita il salto della pagina
    
    if (confirm("Sei sicuro di voler uscire?")) {
        // Pulizia totale dei dati utente
        localStorage.clear();
        
        // Reindirizzamento (puoi metterlo a "/" o a "/login/login.html")
        window.location.href = "/"; 
    }
}