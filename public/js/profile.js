/**
 * ArtAround - Profile & Navigation Script
 * Gestisce l'iniezione della Navbar, lo stato dell'utente e il Logout.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Identifica il punto di iniezione nell'header
    const placeholder = document.getElementById('nav-profile-placeholder');
    
    // Recuperiamo i dati dal localStorage salvati durante il login
    const userEmail = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole'); // "CUR" o "VIS"

    // 2. Se l'utente non è loggato, rimandalo al login (Protezione Pagina)
    // Opzionale: decommenta le righe sotto se vuoi che le pagine siano accessibili SOLO dopo il login
    /*
    if (!userEmail && !window.location.pathname.includes('login.html')) {
        window.location.href = "/login/login.html";
        return;
    }
    */

    // 3. Iniezione Dinamica dell'HTML della Navbar
    if (placeholder) {
        placeholder.innerHTML = `
            <div class="nav-profile-container">
                <div class="nav-avatar" id="navAvatar">?</div>
                <div class="profile-dropdown">
                    <span id="userEmailDisplay">Caricamento...</span>
                    <a href="/docs/profile.html" class="dropdown-item">Gestisci Profilo</a>
                    <a href="#" class="dropdown-item logout-link" onclick="logout(event)">Logout</a>
                </div>
            </div>
        `;
    }

    // 4. Configurazione Visuale dell'Avatar e dell'Email
    const avatar = document.getElementById('navAvatar');
    const emailDisplay = document.getElementById('userEmailDisplay');

    if (avatar && userRole) {
        // Imposta la lettera (C o V)
        avatar.innerText = userRole === "CUR" ? "C" : "V";
        // Colore in palette: Verde scuro per Curatore, Verde salvia per Visitatore
        avatar.style.backgroundColor = userRole === "CUR" ? "#1a3a2a" : "#4a7c5f";
    }

    if (emailDisplay && userEmail) {
        // Mostra l'email reale dell'utente nella tendina
        emailDisplay.innerText = userEmail;
    }
});

/**
 * Funzione di Logout
 * Pulisce la sessione e reindirizza alla pagina di login.
 */
function logout(event) {
    if (event) event.preventDefault(); // Impedisce il salto della pagina dovuto al '#'
    
    const conferma = confirm("Sei sicuro di voler uscire da ArtAround?");
    
    if (conferma) {
        // Cancella email e ruolo dal browser
        localStorage.clear();
        
        // Reindirizzamento alla rotta di login
        // Usiamo il percorso assoluto per evitare errori tra cartelle diverse
        window.location.href = "/login/login.html";
    }
}