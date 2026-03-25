/* --- RIFERIMENTI ELEMENTI DOM --- */
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

// Stato iniziale: Login (true)
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

    // --- MODALITÀ REGISTRAZIONE ---
    const selected = userRole.value; // "VIS" o "CUR"
    
    // Mostra il prefisso CUR_ o VIS_
    emailPrefix.innerText = selected + "_";
    emailPrefix.style.display = "inline-block";

    // --- AGGIORNAMENTO AVATAR (Link Ultra-Affidabili) ---
    if (selected === 'CUR') {
        // Immagine Curatore: Busto di Seneca (Wikimedia)
        userAvatar.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Dying_Seneca.jpg/300px-Dying_Seneca.jpg"; 
    } else {
        // Immagine Visitatore: Ragazze al piano di Renoir (Wikimedia)
        userAvatar.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Auguste_Renoir_-_Jeunes_filles_au_piano.jpg/300px-Auguste_Renoir_-_Jeunes_filles_au_piano.jpg";
    }
    
    // Pulizia alt text per evitare scritte sgradevoli se la connessione è lenta
    userAvatar.alt = "";
}

/**
 * Toggle tra Login e Registrazione
 */
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;

    if (!isLoginMode) {
        /* --- PASSAGGIO A REGISTRAZIONE --- */
        roleField.style.display = "block";
        setTimeout(() => {
            roleField.classList.add('role-visible');
        }, 10);

        authTitle.innerText = "Crea Account";
        submitBtnText.innerText = "Registrati";
        questionText.innerText = "Hai già un account?";
        toggleLink.innerText = "Accedi qui";
        
        updateUI();
    } else {
        /* --- PASSAGGIO A LOGIN --- */
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
    // Se siamo in registrazione, incolliamo il prefisso CUR_ o VIS_
    const finalEmail = isLoginMode ? emailRaw : emailPrefix.innerText + emailRaw;

    console.log("Email finale per il server:", finalEmail);

    if (finalEmail.startsWith("CUR_")) {
        window.location.href = "../Editor-Marketplace/Frontend/menu.html";
    } else if (finalEmail.startsWith("VIS_")) {
        // Se hai una pagina per il visitatore, mettila qui
        alert("Benvenuto Visitatore: " + finalEmail);
    } else {
        alert("Effettua il login inserendo le tue credenziali.");
    }
};

// Forza l'inizializzazione al caricamento
updateUI();