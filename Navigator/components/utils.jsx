/* utils.jsx — applyFloorPlanOverrides, session helpers, ROLE_MAP, avatarStyle, useTheme */

function applyFloorPlanOverrides(museo) {
  if (!museo) return museo;
  const ovMap = FLOOR_PLAN_OVERRIDES[museo.codiceIsil];
  if (!ovMap || !museo.mappaInterna) return museo;
  return {
    ...museo,
    mappaInterna: museo.mappaInterna.map(p => {
      const ov = ovMap[p.piano];
      return ov ? { ...p, ...ov } : p;
    })
  };
}

const NAV_SESSION_KEY = 'navActiveSession';
function saveNavSession(data) {
  try { localStorage.setItem(NAV_SESSION_KEY, JSON.stringify(data)); } catch (_) {}
}
function loadNavSession() {
  try { return JSON.parse(localStorage.getItem(NAV_SESSION_KEY) || 'null'); } catch (_) { return null; }
}
function clearNavSession() {
  try { localStorage.removeItem(NAV_SESSION_KEY); } catch (_) {}
}

const ROLE_MAP = {
  curatore:   { letter: 'C', color: '#6366f1', label: 'Curatore',
                avatar: '/img/pfp_curatore.jpg' },
  visitatore: { letter: 'V', color: '#FF007F', label: 'Visitatore',
                avatar: '/img/pfp_visitatore.jpg' },
  autore:     { letter: 'A', color: '#05070A', label: 'Autore',
                avatar: '/img/pfp_autore.jpg' },
  admin:      { letter: 'M', color: '#05070A', label: 'Admin',
                avatar: '/img/pfp_admin.jpg' },
};

function avatarStyle(cfg) {
  return cfg.avatar
    ? { backgroundImage: `url('${cfg.avatar}')` }
    : { backgroundColor: cfg.color };
}

function useTheme() {
  const [isDark, setIsDark] = React.useState(
    () => document.documentElement.dataset.theme === 'dark'
  );
  React.useEffect(() => {
    function handler(e) { setIsDark(e.detail.isDark); }
    function storageHandler(e) {
      if (e.key !== 'theme' || !e.newValue) return;
      const dark = e.newValue === 'dark';
      document.documentElement.dataset.theme = e.newValue;
      setIsDark(dark);
    }
    window.addEventListener('artaround-theme', handler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('artaround-theme', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);
  function toggle() {
    const next = !isDark;
    const val = next ? 'dark' : 'light';
    document.documentElement.dataset.theme = val;
    localStorage.setItem('theme', val);
    setIsDark(next);
    window.dispatchEvent(new CustomEvent('artaround-theme', { detail: { isDark: next } }));
  }
  return [isDark, toggle];
}
