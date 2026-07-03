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

    // 2. Mappa ruoli — avatar: opera d'arte famosissima coerente col ruolo
    // (Wikimedia Commons, pubblico dominio), stessa immagine ovunque nel sito.
    const roleMap = {
        curatore:   { letter: 'C', color: '#6366f1', label: 'Curatore',
                      avatar: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Boy_with_a_Basket_of_Fruit-Caravaggio_%281593%29.jpg' },
        visitatore: { letter: 'V', color: '#FF007F', label: 'Visitatore',
                      avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg' },
        autore:     { letter: 'A', color: '#05070A', label: 'Autore',
                      avatar: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Edgar_Germain_Hilaire_Degas_076.jpg' },
        admin:      { letter: 'Ad', color: '#e11d48', label: 'Admin',
                      avatar: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Hands_of_God_and_Adam.jpg' },
    };
    const cfg = roleMap[userRole] || { letter: '?', color: '#888', label: 'Utente' };

    function applyAvatarEl(el) {
        if (!el) return;
        if (cfg.avatar) {
            el.style.backgroundImage = `url('${cfg.avatar}')`;
            el.style.backgroundColor = '';
            el.textContent = '';
        } else {
            el.style.backgroundImage = '';
            el.style.backgroundColor = cfg.color;
            el.textContent = cfg.letter;
        }
    }

    // 3. Aggiorna la sidebar se presente
    const avatarEl = document.querySelector('.sidebar-footer .avatar-sm');
    const nameEl = document.querySelector('.sidebar-footer .user-info-mini .name');
    const roleEl = document.querySelector('.sidebar-footer .user-info-mini .role');
    const logoutEl = document.querySelector('.sidebar-footer .logout-icon');

    applyAvatarEl(avatarEl);

    // Aggiorna avatar mobile (dashboard.html)
    const mobileAvatarTop  = document.getElementById('mobileAvatarTop');
    const mobileAvatarMenu = document.getElementById('mobileAvatarMenu');
    applyAvatarEl(mobileAvatarTop);
    applyAvatarEl(mobileAvatarMenu);
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
