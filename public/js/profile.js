document.addEventListener('DOMContentLoaded', () => {
    // 1. Recupero dati dal LocalStorage
    const userEmail = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole'); // "CUR" o "VIS"

    // 2. Elementi del DOM
    const loginBtn = document.getElementById('loginBtn'); // Il tasto "Login" della Home
    const placeholder = document.getElementById('nav-profile-placeholder'); // Il buco nell'header

    // 3. LOGICA DI VISUALIZZAZIONE
    if (userEmail && placeholder) {
        // --- UTENTE LOGGATO ---
        
        // Se siamo in Home, nascondiamo il tasto Login
        if (loginBtn) loginBtn.style.display = 'none';

        // Iniettiamo l'HTML della tendina nel placeholder
        placeholder.innerHTML = `
            <div class="nav-profile-container">
                <div class="nav-avatar" id="navAvatar">?</div>
                <div class="profile-dropdown">
                    <span id="userEmailDisplay">${userEmail}</span>
                    <a href="/docs/profile.html" class="dropdown-item">Gestisci Profilo</a>
                    <a href="#" class="dropdown-item logout-link" onclick="logout(event)">Logout</a>
                </div>
            </div>
        `;

        // Configuriamo l'avatar (Lettera e Colore)
        const avatar = document.getElementById('navAvatar');
        if (avatar && userRole) {
            avatar.innerText = userRole === "CUR" ? "C" : "V";
            avatar.style.backgroundColor = userRole === "CUR" ? "#1a3a2a" : "#4a7c5f";
        }

    } else {
        // --- UTENTE NON LOGGATO ---
        
        // Se siamo in Home, assicuriamoci che il tasto Login sia visibile
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