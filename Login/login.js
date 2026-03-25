/* --- RIFERIMENTI ELEMENTI DOM --- */
const authForm = document.getElementById('authForm');
const toggleLink = document.getElementById('toggleAuthLink');
const roleField = document.getElementById('roleField');
const userRole = document.getElementById('userRole');
const emailPrefix = document.getElementById('emailPrefix');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password'); 
const avatarContainer = document.querySelector('.auth-avatar-container');

const authTitle = document.getElementById('authTitle');
const submitBtnText = document.getElementById('submitBtnText');
const questionText = document.getElementById('questionText');

let isLoginMode = true;

function updateUI() {
    if (isLoginMode) {
        emailPrefix.innerText = "";
        emailPrefix.style.display = "none";
        return;
    }
    const selected = userRole.value;
    emailPrefix.innerText = selected + "_";
    emailPrefix.style.display = "inline-block";

    if (selected === 'CUR') {
        avatarContainer.style.backgroundColor = "#1a3a2a";
        avatarContainer.innerHTML = '<span style="color: white; font-weight: bold; font-size: 1.2rem;">C</span>';
    } else {
        avatarContainer.style.backgroundColor = "#4a7c5f";
        avatarContainer.innerHTML = '<span style="color: white; font-weight: bold; font-size: 1.2rem;">V</span>';
    }
}

toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    console.log("Switch mode: isLoginMode =", isLoginMode);
    
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

// --- GESTIONE INVIO FORM ---
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Form inviato!"); // Se non vedi questo in console, il problema è l'ID del form nel HTML

    const emailRaw = emailInput.value.trim();
    const passwordRaw = passwordInput.value.trim();
    
    // Costruiamo l'email finale
    const finalEmail = isLoginMode ? emailRaw : emailPrefix.innerText + emailRaw;
    const endpoint = isLoginMode ? '/api/login' : '/api/register';

    console.log("Dati pronti per l'invio:", { finalEmail, endpoint });

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: finalEmail, password: passwordRaw })
        });

        console.log("Risposta ricevuta dal server, status:", response.status);

        const data = await response.json();
        console.log("Dati JSON:", data);

        if (data.success) {
            alert(isLoginMode ? "Accesso eseguito!" : "Registrazione completata!");
            if (isLoginMode) {
                // Redirect
                window.location.href = finalEmail.startsWith("CUR_") 
                    ? "../Editor-Marketplace/Frontend/menu.html" 
                    : "../navigator/index.html";
            } else {
                // Dopo registrazione torna al login
                toggleLink.click();
            }
        } else {
            alert("Errore: " + data.message);
        }
    } catch (error) {
        console.error("Errore FETCH:", error);
        alert("Errore di connessione. Controlla che il server Node sia acceso.");
    }
});

updateUI();