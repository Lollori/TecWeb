function toggleDarkMode() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    updateDarkToggleUI();
    // Notifica il Navigator (React) se questa pagina è in un iframe al suo interno
    window.dispatchEvent(new CustomEvent('artaround-theme', { detail: { isDark: next === 'dark' } }));
}

// Reagisce ai cambiamenti di tema fatti da altri documenti (altri tab, Navigator, iframe)
window.addEventListener('storage', function(e) {
    if (e.key !== 'theme' || !e.newValue) return;
    document.documentElement.dataset.theme = e.newValue;
    updateDarkToggleUI();
});

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
                      avatar: '/img/pfp_curatore.jpg' },
        visitatore: { letter: 'V', color: '#FF007F', label: 'Visitatore',
                      avatar: '/img/pfp_visitatore.jpg' },
        autore:     { letter: 'A', color: '#05070A', label: 'Autore',
                      avatar: '/img/pfp_autore.jpg' },
        admin:      { letter: 'Ad', color: '#e11d48', label: 'Admin',
                      avatar: '/img/pfp_admin.jpg' },
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
