/* ========================== */
/* SUBMIT — LOGIN            */
/* ========================== */

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('userUsername', data.user.username);
            localStorage.setItem('userId', data.user.userId);
            localStorage.setItem('userRole', data.user.ruolo);

            await showAlert('Accesso eseguito!', { type: 'success' });
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            window.location.href = redirect || '/';
        } else {
            showAlert('Errore: ' + (data.message || 'Credenziali non valide.'), { type: 'error' });
        }
    } catch (error) {
        console.error('Errore Fetch:', error);
        showAlert('Impossibile connettersi al server. Verifica che il server sia attivo.', { type: 'error' });
    }
});

/* ========================== */
/* SUBMIT — REGISTRAZIONE    */
/* ========================== */

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const ruolo = document.getElementById('regUserRole').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, ruolo })
        });
        const data = await response.json();

        if (data.success) {
            await showAlert('Registrazione completata! Ora puoi accedere.', { type: 'success' });
            document.getElementById('goToLogin').click();
        } else {
            showAlert('Errore: ' + (data.message || 'Registrazione fallita.'), { type: 'error' });
        }
    } catch (error) {
        console.error('Errore Fetch:', error);
        showAlert('Impossibile connettersi al server. Verifica che il server sia attivo.', { type: 'error' });
    }
});
