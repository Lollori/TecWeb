document.addEventListener('DOMContentLoaded', () => {
    const avatar = document.querySelector('.nav-avatar');
    const mainContent = document.querySelector('main') || document.body; // Seleziona il corpo della pagina
    const container = document.querySelector('.nav-profile-container');
    const role = localStorage.getItem('userRole'); // Recupera il ruolo salvato

    // 1. Cambia l'avatar in base al ruolo
    if (avatar && role) {
        avatar.innerText = role === "CUR" ? "C" : "V";
        avatar.style.backgroundColor = role === "CUR" ? "#1a3a2a" : "#4a7c5f";
    }

    // 2. Effetto Sfocatura al passaggio del mouse
    if (container) {
        container.addEventListener('mouseenter', () => {
            // Applichiamo la sfocatura a tutto tranne alla navbar
            // Supponendo che il tuo contenuto principale sia in un tag <main> o un div specifico
            const elementsToBlur = document.querySelectorAll('main, .content-wrapper, .hero-section');
            elementsToBlur.forEach(el => el.classList.add('blur-background'));
        });

        container.addEventListener('mouseleave', () => {
            const elementsToBlur = document.querySelectorAll('.blur-background');
            elementsToBlur.forEach(el => el.classList.remove('blur-background'));
        });
    }
});

// 3. Funzione di Logout
function logout() {
    localStorage.clear(); // Cancella i dati dell'utente
    window.location.href = "/Login/login.html"; // Torna al login
}