/* --- RIFERIMENTI ELEMENTI DOM --- */
const authForm = document.getElementById('authForm');
const toggleLink = document.getElementById('toggleAuthLink');
const roleField = document.getElementById('roleField');
const userRole = document.getElementById('userRole');
const emailPrefix = document.getElementById('emailPrefix');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password'); // Preso una volta sola
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

authForm.onsubmit = async (e) => {
    e.preventDefault();

    const emailRaw = emailInput.value;
    const passwordRaw = document.getElementById('password').value;
    
    // Costruiamo l'email finale (es: CUR_esempio@mail.it)
    const finalEmail = isLoginMode ? emailRaw : emailPrefix.innerText + emailRaw;

    // Determiniamo l'endpoint (usiamo il percorso assoluto per sicurezza)
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const targetUrl = window.location.origin + endpoint;

    console.log("🚀 Chiamata a:", targetUrl);
    console.log("📦 Dati inviati:", { email: finalEmail, password: passwordRaw });

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                email: finalEmail, 
                password: passwordRaw 
            })
        });

        // Se il server risponde con qualcosa che non è JSON (es. un errore HTML 404/500)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const textError = await response.text();
            console.error("⚠️ Risposta non-JSON ricevuta:", textError);
            alert("Il server ha risposto in modo inaspettato. Controlla la console.");
            return;
        }

        const data = await response.json();

        if (data.success) {
            if (isLoginMode) {
                alert("Login effettuato!");
                // Redirect intelligente
                window.location.href = finalEmail.startsWith("CUR_") 
                    ? "../Editor-Marketplace/Frontend/menu.html" 
                    : "../navigator/index.html";
            } else {
                alert("✨ Registrazione completata! Ora puoi accedere.");
                location.reload(); // Torna al login pulito
            }
        } else {
            alert("Errore: " + data.message);
        }
    } catch (error) {
        console.error("Errore fatale Fetch:", error);
        alert("Server non raggiungibile. Controlla che la rotta " + endpoint + " sia attiva.");
    }
};

updateUI();