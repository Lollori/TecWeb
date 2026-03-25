/* --- RIFERIMENTI ELEMENTI DOM --- */
const authForm = document.getElementById('authForm');
const toggleLink = document.getElementById('toggleAuthLink');
const roleField = document.getElementById('roleField');
const userRole = document.getElementById('userRole');
const emailPrefix = document.getElementById('emailPrefix');
const emailInput = document.getElementById('email');
const userAvatar = document.getElementById('userAvatar'); // Il tondino

const authTitle = document.getElementById('authTitle');
const submitBtnText = document.getElementById('submitBtnText');
const questionText = document.getElementById('questionText');

// Stato iniziale: Login (true)
let isLoginMode = true;

/**
 * Funzione per aggiornare l'interfaccia (Avatar e Prefisso Email)
 */
function updateUI() {
    if (isLoginMode) {
        emailPrefix.innerText = "";
        return;
    }

    // Se siamo in registrazione, aggiorna prefisso e immagine
    const selected = userRole.value; // "VIS" o "CUR"
    emailPrefix.innerText = selected + "_";

    // Cambia immagine dell'avatar
    if (selected === 'CUR') {
        // Immagine per il Curatore (puoi cambiare l'URL con uno tuo)
        userAvatar.src = "https://i.imgur.com/8K6mD9v.png"; 
    } else {
        // Immagine per il Visitatore
        userAvatar.src = "https://i.imgur.com/zW6u2pD.png";
    }
}

/**
 * Toggle tra Login e Registrazione
 */
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;

    if (!isLoginMode) {
        /* --- MODALITÀ REGISTRAZIONE --- */
        roleField.style.display = "block";
        // Timeout per far scattare l'animazione CSS slideDownField
        setTimeout(() => {
            roleField.classList.add('role-visible');
        }, 10);

        authTitle.innerText = "Crea Account";
        submitBtnText.innerText = "Registrati";
        questionText.innerText = "Hai già un account?";
        toggleLink.innerText = "Accedi qui";
        
        updateUI();
    } else {
        /* --- MODALITÀ LOGIN --- */
        roleField.classList.remove('role-visible');
        // Aspettiamo la fine dell'animazione prima di nascondere
        setTimeout(() => {
            roleField.style.display = "none";
        }, 400);

        authTitle.innerText = "Bentornato!";
        submitBtnText.innerText = "Accedi";
        questionText.innerText = "Non hai un account?";
        toggleLink.innerText = "Registrati ora";
        
        updateUI();
    }
});

/**
 * Ascolta il cambio della tendina (Visitatore <-> Curatore)
 */
userRole.addEventListener('change', updateUI);

/**
 * Gestione invio Form
 */
authForm.onsubmit = (e) => {
    e.preventDefault();

    const emailRaw = emailInput.value;
    const finalEmail = isLoginMode ? emailRaw : emailPrefix.innerText + emailRaw;

    console.log("Email inviata al server:", finalEmail);

    // Esempio logica redirect
    if (finalEmail.startsWith("CUR_")) {
        alert("Accesso Curatore: " + finalEmail);
        window.location.href = "../Editor-Marketplace/Frontend/menu.html";
    } else {
        alert("Accesso Visitatore: " + finalEmail);
        // window.location.href = "../navigator/index.html";
    }
};