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

            alert('Accesso eseguito!');
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            window.location.href = redirect || '/';
        } else {
            alert('Errore: ' + (data.message || 'Credenziali non valide.'));
        }
    } catch (error) {
        console.error('Errore Fetch:', error);
        alert('Impossibile connettersi al server. Verifica che il server sia attivo.');
    }
});

/* ========================== */
/* SUBMIT — REGISTRAZIONE    */
/* ========================== */

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const passwordConfirm = document.getElementById('regPasswordConfirm').value.trim();
    const ruolo = document.getElementById('regUserRole').value;

    if (password !== passwordConfirm) {
        alert('Le password non coincidono.');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, ruolo })
        });
        const data = await response.json();

        if (data.success) {
            alert('Registrazione completata! Ora puoi accedere.');
            document.getElementById('goToLogin').click();
        } else {
            alert('Errore: ' + (data.message || 'Registrazione fallita.'));
        }
    } catch (error) {
        console.error('Errore Fetch:', error);
        alert('Impossibile connettersi al server. Verifica che il server sia attivo.');
    }
});
