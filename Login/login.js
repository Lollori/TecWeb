/* ========================== */
/* ELEMENTI DEL DOM          */
/* ========================== */
const authForm = document.getElementById('authForm');
const toggleLink = document.getElementById('toggleAuthLink');
const roleField = document.getElementById('roleField');
const userRole = document.getElementById('userRole');
const emailPrefix = document.getElementById('emailPrefix');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const togglePasswordIcon = document.getElementById('togglePasswordIcon');

togglePasswordBtn.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    togglePasswordIcon.className = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
});
const avatarContainer = document.querySelector('.auth-avatar-container');

const authTitle = document.getElementById('authTitle');
const submitBtnText = document.getElementById('submitBtnText');
const questionText = document.getElementById('questionText');

let isLoginMode = true;

/* ========================== */
/* LOGICA INTERFACCIA        */
/* ========================== */

const ROLE_CONFIG = {
    curatore:   { letter: 'C', color: '#1a3a2a' },
    visitatore: { letter: 'V', color: '#4a7c5f' },
    autore:     { letter: 'A', color: '#7c4a1a' }
};

function updateUI() {
    emailPrefix.innerText = '';
    emailPrefix.style.display = 'none';

    if (isLoginMode) return;

    const selected = userRole.value;
    const cfg = ROLE_CONFIG[selected] || ROLE_CONFIG.visitatore;
    avatarContainer.style.backgroundColor = cfg.color;
    avatarContainer.innerHTML = `<span style="color:white;font-weight:bold;font-size:1.2rem;">${cfg.letter}</span>`;
}

/* Switch tra Login e Registrazione */
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;

    if (!isLoginMode) {
        roleField.style.display = 'block';
        setTimeout(() => { roleField.classList.add('role-visible'); updateUI(); }, 10);
        authTitle.innerText = 'Crea Account';
        submitBtnText.innerText = 'Registrati';
        questionText.innerText = 'Hai già un account?';
        toggleLink.innerText = 'Accedi qui';
    } else {
        roleField.classList.remove('role-visible');
        setTimeout(() => { roleField.style.display = 'none'; }, 400);
        authTitle.innerText = 'Bentornato!';
        submitBtnText.innerText = 'Accedi';
        questionText.innerText = 'Non hai un account?';
        toggleLink.innerText = 'Registrati ora';
        updateUI();
    }
});

userRole.addEventListener('change', updateUI);

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
                // --- LOGIN SUCCESS ---
                localStorage.setItem('userUsername', data.user.username);
                localStorage.setItem('userId', data.user.userId);
                localStorage.setItem('userRole', data.user.ruolo);

                alert('Accesso eseguito!');

                const redirect = new URLSearchParams(window.location.search).get('redirect');
                window.location.href = redirect || '/';
            } else {
                // --- REGISTRAZIONE SUCCESS ---
                alert('Registrazione completata! Ora puoi accedere.');
                emailInput.value = '';
                passwordInput.value = '';
                isLoginMode = true;
                toggleLink.click();
            }
        } else {
            alert('Errore: ' + data.message);
        }
    } catch (error) {
        console.error('Errore Fetch:', error);
        alert('Impossibile connettersi al server. Controlla che Node.js sia attivo.');
    }
});

// Inizializzazione UI
updateUI();
