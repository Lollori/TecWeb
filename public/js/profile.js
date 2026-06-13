function toggleDarkMode() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    updateDarkToggleUI();
}

function updateDarkToggleUI() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    const icon  = document.getElementById('darkToggleIcon');
    const label = document.querySelector('#darkToggle .toggle-label');
    if (icon)  icon.className    = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    if (label) label.textContent = isDark ? 'Modalità chiara' : 'Modalità scura';
    const mIcon  = document.getElementById('mobileDarkIcon');
    const mLabel = document.getElementById('mobileDarkLabel');
    if (mIcon)  mIcon.className    = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    if (mLabel) mLabel.textContent = isDark ? 'Modalità chiara' : 'Modalità scura';
}

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

    // Aggiorna avatar mobile (dashboard.html)
    const mobileAvatarTop  = document.getElementById('mobileAvatarTop');
    const mobileAvatarMenu = document.getElementById('mobileAvatarMenu');
    if (mobileAvatarTop)  { mobileAvatarTop.textContent  = cfg.letter; mobileAvatarTop.style.backgroundColor  = cfg.color; }
    if (mobileAvatarMenu) { mobileAvatarMenu.textContent = cfg.letter; mobileAvatarMenu.style.backgroundColor = cfg.color; }
    if (nameEl) {
        nameEl.textContent = userUsername ? userUsername.charAt(0).toUpperCase() + userUsername.slice(1) : 'Ospite';
    }
    if (roleEl) {
        roleEl.textContent = cfg.label;
    }

    // 4. Aggiorna UI dark-toggle
    updateDarkToggleUI();

    // 5. Gestione logout
    if (logoutEl) {
        logoutEl.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Sei sicuro di voler uscire?")) {
                localStorage.clear();
                window.location.href = "/";
            }
        });
    }

    // 6. Aggiorna anche l'header della dashboard se presente
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
