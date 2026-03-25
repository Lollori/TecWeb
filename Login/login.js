// --- RIFERIMENTI AGLI ELEMENTI DEL DOM ---
const authForm = document.getElementById('authForm');
const toggleAuthLink = document.getElementById('toggleAuthLink');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const submitBtnText = document.getElementById('submitBtnText');
const roleField = document.getElementById('roleField');
const questionText = document.getElementById('questionText');

// Variabile di stato: true = Login, false = Registrazione
let isLoginMode = true;

/**
 * Funzione per switchare tra Login e Registrazione
 */
toggleAuthLink.addEventListener('click', (e) => {
    e.preventDefault(); // Evita il refresh della pagina
    
    isLoginMode = !isLoginMode;

    if (isLoginMode) {
        // Interfaccia per il LOGIN
        authTitle.innerText = "Bentornato!";
        authSubtitle.innerText = "Accedi per esplorare la tua collezione.";
        submitBtnText.innerText = "Accedi";
        questionText.innerText = "Non hai un account?";
        toggleAuthLink.innerText = "Registrati ora";
        roleField.style.display = "none"; // Nasconde la tendina Visitatore/Curatore
    } else {
        // Interfaccia per la REGISTRAZIONE
        authTitle.innerText = "Crea Account";
        authSubtitle.innerText = "Unisciti alla community di ArtAround.";
        submitBtnText.innerText = "Registrati";
        questionText.innerText = "Hai già un account?";
        toggleAuthLink.innerText = "Accedi qui";
        roleField.style.display = "block"; // Mostra la tendina dei ruoli
    }
});

/**
 * Gestione dell'invio del form
 */
authForm.onsubmit = async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('email').value;
    const passwordInput = document.getElementById('password').value;
    const selectedRole = document.getElementById('userRole').value;

    if (!isLoginMode) {
        // --- LOGICA REGISTRAZIONE ---
        // Generazione dell'ID con prefisso (es: CUR_mario@email.it o VIS_mario@email.it)
        const finalUserId = `${selectedRole}_${emailInput}`;
        
        console.log("Registrazione in corso...");
        console.log("Ruolo scelto:", selectedRole);
        console.log("ID Finale generato:", finalUserId);

        alert(`Registrazione completata!\nIl tuo ID utente è: ${finalUserId}\nOra puoi effettuare il login.`);
        
        // Dopo la registrazione, riportiamo l'utente al login
        toggleAuthLink.click(); 

    } else {
        // --- LOGICA LOGIN ---
        console.log("Tentativo di login per:", emailInput);

        // Per ora facciamo un redirect simulato
        // Se l'utente è un curatore (CUR_), andrà al Marketplace, altrimenti al Navigator
        if (emailInput.startsWith("CUR_")) {
            alert("Accesso come Curatore confermato. Reindirizzamento...");
            window.location.href = "../Editor-Marketplace/Frontend/menu.html";
        } else {
            alert("Accesso come Visitatore confermato. Reindirizzamento...");
            // Cambia questo percorso con quello del tuo Navigator se necessario
            window.location.href = "../navigator/index.html";
        }
    }
};