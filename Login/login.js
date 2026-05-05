/* ========================== */
/* ELEMENTI DEL DOM          */
/* ========================== */
const authForm = document.getElementById('authForm');
const toggleLink = document.getElementById('toggleAuthLink');
const roleField = document.getElementById('roleField');
const userRole = document.getElementById('userRole');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const togglePasswordIcon = document.getElementById('togglePasswordIcon');

const avatarContainer = document.getElementById('avatarContainer');
const avatarLetter = document.getElementById('avatarLetter');

const authTitle = document.getElementById('authTitle');
const submitBtnText = document.getElementById('submitBtnText');
const questionText = document.getElementById('questionText');

let isLoginMode = true;

/* ========================== */
/* LOGICA INTERFACCIA        */
/* ========================== */

// Configurazione per le iniziali (la palette colori è gestita dalle classi CSS bg-...)
const ROLE_CONFIG = {
    visitatore: 'V',
    curatore:   'C',
    autore:     'A'
};

function updateUI() {
    if (isLoginMode) {
        // --- MODALITÀ LOGIN ---
        roleField.style.display = 'none';
        authTitle.innerText = 'Bentornato!';
        submitBtnText.innerText = 'Entra nel Portale';
        questionText.innerText = 'Non hai un account?';
        toggleLink.innerText = 'Registrati ora';
    } else {
        // --- MODALITÀ REGISTRAZIONE ---
        roleField.style.display = 'block';
        authTitle.innerText = 'Crea Account';
        submitBtnText.innerText = 'Registrati';
        questionText.innerText = 'Hai già un account?';
        toggleLink.innerText = 'Accedi qui';

        const selected = userRole.value;
        avatarLetter.textContent = ROLE_CONFIG[selected] || 'V';
        const containerClasses = ['bg-visitatore', 'bg-curatore', 'bg-autore'];
        avatarContainer.classList.remove(...containerClasses);
        avatarContainer.classList.add(`bg-${selected}`);
    }
}

/* Switch tra Login e Registrazione */
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    updateUI();
});

/* Listener per il cambio ruolo nella tendina */
userRole.addEventListener('change', () => {
    if (!isLoginMode) {
        const selected = userRole.value;
        avatarLetter.textContent = ROLE_CONFIG[selected] || 'V';
        const containerClasses = ['bg-visitatore', 'bg-curatore', 'bg-autore'];
        avatarContainer.classList.remove(...containerClasses);
        avatarContainer.classList.add(`bg-${selected}`);
    }
});

/* Toggle Password Visibile/Nascosta */
togglePasswordBtn.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    togglePasswordIcon.className = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
});

/* ========================== */
/* INVIO DATI AL SERVER      */
/* ========================== */

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameRaw = emailInput.value.trim();
    const passwordRaw = passwordInput.value.trim();
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const ruolo = isLoginMode ? null : userRole.value;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameRaw, password: passwordRaw, ruolo: ruolo })
        });

        const data = await response.json();

        if (data.success) {
            if (isLoginMode) {
                // SALVATAGGIO SESSIONE
                localStorage.setItem('userUsername', data.user.username);
                localStorage.setItem('userId', data.user.userId);
                localStorage.setItem('userRole', data.user.ruolo);

                alert('Accesso eseguito!');
                const redirect = new URLSearchParams(window.location.search).get('redirect');
                window.location.href = redirect || '/';
            } else {
                alert('Registrazione completata! Ora puoi accedere.');
                // Pulizia e ritorno al login
                emailInput.value = '';
                passwordInput.value = '';
                toggleLink.click();
            }
        } else {
            alert('Errore: ' + data.message);
        }
    } catch (error) {
        console.error('Errore Fetch:', error);
        alert('Impossibile connettersi al server.');
    }
});

// Inizializzazione UI al caricamento
document.addEventListener('DOMContentLoaded', updateUI);