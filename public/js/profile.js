document.addEventListener('DOMContentLoaded', () => {
    const avatar = document.getElementById('navAvatar');
    const emailDisplay = document.getElementById('userEmailDisplay');
    
    // Recuperiamo i dati salvati durante il login
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');

    // 1. Setup Avatar (Lettera e Colore)
    if (avatar && role) {
        avatar.innerText = role === "CUR" ? "C" : "V";
        avatar.style.backgroundColor = role === "CUR" ? "#1a3a2a" : "#4a7c5f";
    }

    // 2. Setup Email nella tendina
    if (emailDisplay) {
        if (email) {
            emailDisplay.innerText = email;
        } else {
            emailDisplay.innerText = "Utente non loggato";
        }
    }
});

// 3. Funzione di Logout (Globale)
function logout() {
    localStorage.clear();
    // Usa il percorso assoluto per tornare al login
    window.location.href = "/login/login.html";
}