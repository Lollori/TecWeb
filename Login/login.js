/* ========================== */
/* ELEMENTI DEL DOM        */
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
/* LOGICA INTERFACCIA      */
/* ========================== */

// Aggiorna l'anteprima del cerchietto e il prefisso email
function updateUI() {
    if (isLoginMode) {
        emailPrefix.innerText = "";
        emailPrefix.style.display = "none";
        return;
    }
    
    const selected = userRole.value; // "CUR" o "VIS"
    emailPrefix.innerText = selected + "_";
    emailPrefix.style.display = "inline-block";

    // Cambia la lettera nel cerchietto durante la registrazione
    if (selected === 'CUR') {
        avatarContainer.style.backgroundColor = "#1a3a2a";
        avatarContainer.innerHTML = '<span style="color: white; font-weight: bold; font-size: 1.2rem;">C</span>';
    } else {
        avatarContainer.style.backgroundColor = "#4a7c5f";
        avatarContainer.innerHTML = '<span style="color: white; font-weight: bold; font-size: 1.2rem;">V</span>';
    }
}

// Switch tra Login e Registrazione
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (!isLoginMode) {
        roleField.style.display = "block";
        setTimeout(() => { roleField.classList.add('role-visible'); updateUI(); }, 10);
        authTitle.innerText = "Crea Account";
        submitBtnText.innerText = "Registrati";
        questionText.innerText = "Hai già un account?";
        toggleLink.innerText = "Accedi qui";
    } else {
        roleField.classList.remove('role-visible');
        setTimeout(() => { roleField.style.display = "none"; }, 400);
        authTitle.innerText = "Bentornato!";
        submitBtnText.innerText = "Accedi";
        questionText.innerText = "Non hai un account?";
        toggleLink.innerText = "Registrati ora";
        updateUI();
    }
});

userRole.addEventListener('change', updateUI);

/* ========================== */
/* INVIO DATI AL SERVER    */
/* ========================== */

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameRaw = emailInput.value.trim();
    const passwordRaw = passwordInput.value.trim();

    const finalUsername = isLoginMode ? usernameRaw : emailPrefix.innerText + usernameRaw;
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const ruolo = isLoginMode ? null : userRole.value;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: finalUsername, password: passwordRaw, ruolo: ruolo })
        });

        const data = await response.json();

       if (data.success) {
            if (isLoginMode) {
                // --- LOGIN SUCCESS ---
                localStorage.setItem('userUsername', data.user.username);

                const role = data.user.username.startsWith("CUR_") ? "CUR" : "VIS";
                localStorage.setItem('userRole', role);
                
                alert("Accesso eseguito!");

                const redirect = new URLSearchParams(window.location.search).get('redirect');
                window.location.href = redirect || "/";
                
            } else {
                // --- REGISTRAZIONE SUCCESS ---
                alert("Registrazione completata! Ora puoi accedere.");
                emailInput.value = ''; // rinominato in usernameRaw ma il riferimento DOM resta emailInput
                passwordInput.value = '';
                isLoginMode = true;
                toggleLink.click();
            }
        } else {
            // Messaggio di errore dal server (es: "Credenziali errate")
            alert("Errore: " + data.message);
        }
    } catch (error) {
        console.error("Errore Fetch:", error);
        alert("Impossibile connettersi al server. Controlla che Node.js sia attivo.");
    }
});

// Inizializzazione UI
updateUI();