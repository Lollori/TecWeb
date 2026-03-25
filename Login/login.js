/* --- RIFERIMENTI DOM --- */
const authForm = document.getElementById('authForm');
const toggleLink = document.getElementById('toggleAuthLink');
const roleField = document.getElementById('roleField');
const userRole = document.getElementById('userRole');
const emailPrefix = document.getElementById('emailPrefix');
const emailInput = document.getElementById('email');
const userAvatar = document.getElementById('userAvatar');

const authTitle = document.getElementById('authTitle');
const submitBtnText = document.getElementById('submitBtnText');
const questionText = document.getElementById('questionText');

// Stato iniziale: Login
let isLoginMode = true;

/**
 * Funzione per aggiornare l'avatar e il prefisso dell'email
 * Viene chiamata al cambio della tendina e al toggle del form.
 */
function updateRoleFeedback() {
    if (isLoginMode) {
        // In Login non mostriamo prefissi automatici
        emailPrefix.innerText = "";
        emailPrefix.style.display = "none";
        return;
    }

    // --- LOGICA REGISTRAZIONE ---
    const selectedRole = userRole.value; // VIS o CUR

    // 1. Aggiorna il prefisso email ("Blindato")
    emailPrefix.innerText = selectedRole + "_";
    emailPrefix.style.display = "inline-block";

    // 2. Aggiorna l'immagine profilo predefinita
    if (selectedRole === 'CUR') {
        // Avatar Curatore (Busto Classico)
        userAvatar.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Dying_Seneca.jpg/300px-Dying_Seneca.jpg';
    } else {
        // Avatar Visitatore (Ritratto Moderno/Fauves)
        userAvatar.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Auguste_Renoir_-_Jeunes_filles_au_piano.jpg/300px-Auguste_Renoir_-_Jeunes_filles_au_piano.jpg';
    }
}

/**
 * Switch tra Login e Registrazione (Animato e Fluido)
 */
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;

    if (!isLoginMode) {
        /* --- PASSAGGIO A REGISTRAZIONE --- */
        roleField.style.display = "block";
        // Timeout minimo per far agganciare l'animazione CSS
        setTimeout(() => {
            roleField.classList.add('role-visible');
        }, 10);
        
        authTitle.innerText = "Crea Account";
        submitBtnText.innerText = "Registrati";
        questionText.innerText = "Hai già un account?";
        toggleLink.innerText = "Accedi qui";
        
        updateRoleFeedback(); // Carica avatar e prefisso VIS_ predefinito
    } else {
        /* --- PASSAGGIO A LOGIN --- */
        roleField.classList.remove('role-visible');
        // Aspettiamo la fine dell'animazione CSS prima di nascondere il display
        setTimeout(() => {
            roleField.style.display = "none";
        }, 500);

        authTitle.innerText = "Bentornato!";
        submitBtnText.innerText = "Accedi";
        questionText.innerText = "Non hai un account?";
        toggleLink.innerText = "Registrati ora";
        
        updateRoleFeedback(); // Rimuove il prefisso
    }
});

/**
 * Ascolta il cambio della tendina per aggiornare avatar e prefisso in tempo reale
 */
userRole.addEventListener('change', updateRoleFeedback);

/**
 * Gestione invio Form
 */
authForm.onsubmit = (e) => {
    e.preventDefault();

    const emailValue = emailInput.value;
    let finalEmail = emailValue;

    if (!isLoginMode) {
        // In registrazione "incolliamo" il prefisso (blindato) all'email scritta
        const prefix = emailPrefix.innerText; // es: "CUR_"
        finalEmail = prefix + emailValue;
        
        console.log("Registrazione completata per ID:", finalEmail);
        alert(`Account creato con successo!\nIl tuo ID unico è: ${finalEmail}`);
        
        // Opzionale: riporta al login dopo la registrazione
        toggleLink.click();
    } else {
        // In Login usiamo l'email così come inserita
        console.log("Tentativo di Login per:", finalEmail);
        
        // Esempio di redirect basato sul prefisso
        if (finalEmail.startsWith("CUR_")) {
            window.location.href = "../Editor-Marketplace/Frontend/menu.html";
        } else {
            window.location.href = "../navigator/index.html";
        }
    }
};