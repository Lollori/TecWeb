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
    const passwordRaw = passwordInput.value;
    const finalEmail = isLoginMode ? emailRaw : emailPrefix.innerText + emailRaw;
    const endpoint = isLoginMode ? '/api/login' : '/api/register';

    try {
        const response = await fetch(endpoint, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: finalEmail, password: passwordRaw })
        });

        // PRIMA di fare .json(), controlliamo se la risposta è OK
        if (!response.ok) {
            // Se il server risponde 404 o 500, non è un JSON!
            const errorText = await response.text();
            console.error("Il server ha risposto con un errore non-JSON:", errorText);
            throw new Error("Il server ha risposto con un errore (codice " + response.status + ")");
        }

        const data = await response.json();

        if (data.success) {
            if (isLoginMode) {
                // Redirect basato sul prefisso
                window.location.href = finalEmail.startsWith("CUR_") 
                    ? "../Editor-Marketplace/Frontend/menu.html" 
                    : "../navigator/index.html";
            } else {
                alert("Registrazione completata! Ora effettua il login.");
                location.reload(); // Ricarica per tornare al login pulito
            }
        } else {
            alert("Errore" + data.message);
        }
    } catch (error) {
        console.error("Errore fatale:", error);
        alert("Errore di connessione: il server non ha risposto correttamente. Controlla la console (F12).");
    }
};

updateUI();