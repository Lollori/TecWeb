document.addEventListener('DOMContentLoaded', () => {
    // 1. Recupera dati dal LocalStorage
    const userUsername = localStorage.getItem('userUsername');
    const userRole = localStorage.getItem('userRole') || '';
    const userId = localStorage.getItem('userId') || '';

    // 2. Mappa ruoli
    const roleMap = {
        curatore:   { letter: 'C', color: '#6366f1', label: 'Curatore' },
        visitatore: { letter: 'V', color: '#FF007F', label: 'Visitatore' },
        autore:     { letter: 'A', color: '#05070A', label: 'Autore' }
    };
    const cfg = roleMap[userRole] || { letter: '?', color: '#888', label: 'Utente' };

    // 3. Aggiorna la sidebar se presente
    const avatarEl = document.querySelector('.sidebar-footer .avatar-sm');
    const nameEl = document.querySelector('.sidebar-footer .user-info-mini .name');
    const roleEl = document.querySelector('.sidebar-footer .user-info-mini .role');
    const logoutEl = document.querySelector('.sidebar-footer .logout-icon');

    if (avatarEl) {
        avatarEl.textContent = cfg.letter;
        avatarEl.style.backgroundColor = cfg.color;
    }
    if (nameEl) {
        nameEl.textContent = userUsername ? userUsername.charAt(0).toUpperCase() + userUsername.slice(1) : 'Ospite';
    }
    if (roleEl) {
        roleEl.textContent = cfg.label;
    }

    // 4. Gestione logout
    if (logoutEl) {
        logoutEl.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Sei sicuro di voler uscire?")) {
                localStorage.clear();
                window.location.href = "/";
            }
        });
    }

    // 5. Aggiorna anche l'header della dashboard se presente
    const headerRoleLabel = document.getElementById('headerRoleLabel');
    if (headerRoleLabel) {
        headerRoleLabel.textContent = cfg.label;
    }
    const sidebarRole = document.getElementById('sidebarRole');
    if (sidebarRole) {
        sidebarRole.textContent = cfg.label;
    }
});

/**
 * Funzione di Logout (chiamabile da onclick)
 */
function logout(event) {
    if (event) event.preventDefault();
    if (confirm("Sei sicuro di voler uscire?")) {
        localStorage.clear();
        window.location.href = "/";
    }
}
