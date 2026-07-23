function applyFloorPlanOverrides(museo) {
  if (!museo) return museo;
  const ovMap = FLOOR_PLAN_OVERRIDES[museo.codiceIsil];
  if (!ovMap || !museo.mappaInterna) return museo;
  return {
    ...museo,
    mappaInterna: museo.mappaInterna.map(p => {
      const ov = ovMap[p.piano];
      return ov ? {
        ...p,
        ...ov
      } : p;
    })
  };
}
const NAV_SESSION_KEY = 'navActiveSession';
function saveNavSession(data) {
  try {
    localStorage.setItem(NAV_SESSION_KEY, JSON.stringify(data));
  } catch (_) {}
}
function loadNavSession() {
  try {
    return JSON.parse(localStorage.getItem(NAV_SESSION_KEY) || 'null');
  } catch (_) {
    return null;
  }
}
function clearNavSession() {
  try {
    localStorage.removeItem(NAV_SESSION_KEY);
  } catch (_) {}
}

// Impedisce che lo stesso browser partecipi alla stessa visita in due ruoli/
// schede contemporaneamente (es. docente in una tab e studente in un'altra):
// causava l'assistente vocale di una tab a interferire con l'audio dell'altra.
// Lock per codice visita in localStorage, con heartbeat: una tab "morta" senza
// pulizia (crash, chiusura brusca) si libera da sola dopo NAV_LOCK_TTL_MS.
const NAV_LOCKS_KEY = 'navRoleLocks';
const NAV_LOCK_TTL_MS = 15000;
const NAV_TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
function readNavLocks() {
  try {
    return JSON.parse(localStorage.getItem(NAV_LOCKS_KEY) || '{}');
  } catch (_) {
    return {};
  }
}
function writeNavLocks(locks) {
  try {
    localStorage.setItem(NAV_LOCKS_KEY, JSON.stringify(locks));
  } catch (_) {}
}
function acquireNavLock(codice, role) {
  const locks = readNavLocks();
  const existing = locks[codice];
  if (existing && existing.tabId !== NAV_TAB_ID && Date.now() - existing.ts < NAV_LOCK_TTL_MS) {
    return false;
  }
  locks[codice] = {
    tabId: NAV_TAB_ID,
    role,
    ts: Date.now()
  };
  writeNavLocks(locks);
  return true;
}
function refreshNavLock(codice) {
  const locks = readNavLocks();
  if (locks[codice]?.tabId === NAV_TAB_ID) {
    locks[codice].ts = Date.now();
    writeNavLocks(locks);
  }
}
function releaseNavLock(codice) {
  const locks = readNavLocks();
  if (locks[codice]?.tabId === NAV_TAB_ID) {
    delete locks[codice];
    writeNavLocks(locks);
  }
}
const ROLE_MAP = {
  curatore: {
    letter: 'C',
    color: '#6366f1',
    label: 'Curatore',
    avatar: '/img/pfp_curatore.jpg'
  },
  visitatore: {
    letter: 'V',
    color: '#FF007F',
    label: 'Visitatore',
    avatar: '/img/pfp_visitatore.jpg'
  },
  autore: {
    letter: 'A',
    color: '#05070A',
    label: 'Autore',
    avatar: '/img/pfp_autore.jpg'
  },
  admin: {
    letter: 'M',
    color: '#05070A',
    label: 'Admin',
    avatar: '/img/pfp_admin.jpg'
  }
};
function avatarStyle(cfg) {
  return cfg.avatar ? {
    backgroundImage: `url('${cfg.avatar}')`
  } : {
    backgroundColor: cfg.color
  };
}
function useTheme() {
  const [isDark, setIsDark] = React.useState(() => document.documentElement.dataset.theme === 'dark');
  React.useEffect(() => {
    function handler(e) {
      setIsDark(e.detail.isDark);
    }
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
    window.dispatchEvent(new CustomEvent('artaround-theme', {
      detail: {
        isDark: next
      }
    }));
  }
  return [isDark, toggle];
}