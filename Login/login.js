/* --- RIFERIMENTI ELEMENTI DOM --- */
const authForm = document.getElementById('authForm');
const toggleLink = document.getElementById('toggleAuthLink');
const roleField = document.getElementById('roleField');
const userRole = document.getElementById('userRole');
const emailPrefix = document.getElementById('emailPrefix');
const emailInput = document.getElementById('email');
const userAvatar = document.getElementById('userAvatar'); 
const avatarContainer = document.querySelector('.auth-avatar-container'); // Il cerchio grigio

const authTitle = document.getElementById('authTitle');
const submitBtnText = document.getElementById('submitBtnText');
const questionText = document.getElementById('questionText');

let isLoginMode = true;

/**
 * Funzione per aggiornare l'interfaccia (Avatar e Prefisso Email)
 */
function updateUI() {
    if (isLoginMode) {
        emailPrefix.innerText = "";
        emailPrefix.style.display = "none";
        return;
    }

    const selected = userRole.value; // "VIS" o "CUR"
    emailPrefix.innerText = selected + "_";
    emailPrefix.style.display = "inline-block";

    // --- LOGICA AVATAR SENZA IMMAGINI ESTERNE (ANTIFALLIMENTO) ---
    // Invece di una <img> che può rompersi, usiamo testo e colori
    userAvatar.style.display = "none"; // Nascondiamo il tag img che non carica
    
    if (selected === 'CUR') {
        avatarContainer.style.backgroundColor = "#1a3a2a"; // Verde scuro
        avatarContainer.innerHTML = '<span style="color: white; font-weight: bold; font-size: 1.2rem;">C</span>';
    } else {
        avatarContainer.style.backgroundColor = "#4a7c5f"; // Verde chiaro
        avatarContainer.innerHTML = '<span style="color: white; font-weight: bold; font-size: 1.2rem;">V</span>';
    }
}

/**
 * Toggle tra Login e Registrazione
 */
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;

    if (!isLoginMode) {
        roleField.style.display = "block";
        setTimeout(() => {
            roleField.classList.add('role-visible');
            updateUI();
        }, 10);

        authTitle.innerText = "Crea Account";
        submitBtnText.innerText = "Registrati";
        questionText.innerText = "Hai già un account?";
        toggleLink.innerText = "Accedi qui";
    } else {
        roleField.classList.remove('role-visible');
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

userRole.addEventListener('change', updateUI);

authForm.onsubmit = (e) => {
    e.preventDefault();
    const emailRaw = emailInput.value;
    const finalEmail = isLoginMode ? emailRaw : emailPrefix.innerText + emailRaw;

    if (finalEmail.startsWith("CUR_")) {
        window.location.href = "../Editor-Marketplace/Frontend/menu.html";
    } else {
        alert("Accesso effettuato come: " + finalEmail);
    }
};

// Inizializza
updateUI();