document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const submitBtnText = document.getElementById('submitBtnText');
    const toggleLink = document.getElementById('toggleAuthLink');
    const questionText = document.getElementById('questionText');

    // Campi extra
    const nameField = document.getElementById('nameField');
    const confirmPasswordField = document.getElementById('confirmPasswordField');

    let isLogin = true;

    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;

        if (isLogin) {
            authTitle.innerText = "Bentornato!";
            authSubtitle.innerText = "Inserisci le tue credenziali per accedere.";
            submitBtnText.innerText = "Accedi";
            questionText.innerText = "Non hai un account?";
            toggleLink.innerText = "Registrati ora";
            nameField.style.display = "none";
            confirmPasswordField.style.display = "none";
        } else {
            authTitle.innerText = "Crea Account";
            authSubtitle.innerText = "Unisciti alla community di ArtAround.";
            submitBtnText.innerText = "Crea Account";
            questionText.innerText = "Hai già un account?";
            toggleLink.innerText = "Accedi qui";
            nameField.style.display = "block";
            confirmPasswordField.style.display = "block";
        }
    });

    authForm.onsubmit = (e) => {
        e.preventDefault();
        
        // Qui in futuro metterai la chiamata al backend
        console.log("Dati inviati:", {
            email: document.getElementById('email').value,
            isLoginMode: isLogin
        });

        alert(isLogin ? "Login in corso..." : "Registrazione in corso...");
        
        // Simulo un redirect dopo il login
        if(isLogin) window.location.href = "opere.html";
    };
});