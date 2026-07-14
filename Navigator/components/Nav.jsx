/* Nav.jsx — MobileMenu, Sidebar */

function MobileMenu({ links, contextLabel }) {
  const [open,   setOpen]   = React.useState(false);
  const [isDark, toggleTheme] = useTheme();
  const username = localStorage.getItem('userUsername') || '';
  const role     = localStorage.getItem('userRole')     || '';
  const cfg = ROLE_MAP[role] || { letter: username ? username[0].toUpperCase() : '?', color: '#FF007F', label: role || 'Navigator' };

  function close() { setOpen(false); }

  return (
    <>
      <div className="mobile-topbar">
        <button
          className={`mobile-hamburger${open ? ' open' : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-label="Menu"
        >
          <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-bars'}`} />
        </button>
        <a href="/" className="mobile-topbar-logo">{contextLabel || 'ArtAround.'}</a>
        <div className="avatar-sm" style={avatarStyle(cfg)}>{cfg.avatar ? '' : cfg.letter}</div>
      </div>

      <div className={`mobile-menu-overlay${open ? ' open' : ''}`} onClick={close} />

      <div className={`mobile-menu-dropdown${open ? ' open' : ''}`}>
        <div className="mobile-menu-user-row">
          <div className="avatar-sm" style={avatarStyle(cfg)}>{cfg.avatar ? '' : cfg.letter}</div>
          <div>
            <div className="mobile-menu-username">{username || '—'}</div>
            <div className="mobile-menu-role">{cfg.label}</div>
          </div>
        </div>
        <nav className="mobile-nav">
          {links.map((l, i) => (
            <button
              key={i}
              className="nav-item"
              onClick={() => {
                if (l.href) { window.location.href = l.href; }
                else if (l.onClick) { l.onClick(); }
                close();
              }}
            >
              {l.icon && <i className={`fa-solid ${l.icon}`} />}
              {l.label}
            </button>
          ))}
        </nav>
        <div className="mobile-menu-footer">
          <a href="/" className="mobile-footer-link">
            <i className="fa-solid fa-house" />
            Menu principale
          </a>
          <button className="mobile-footer-link" onClick={toggleTheme}>
            <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} />
            {isDark ? 'Modalità chiara' : 'Modalità scura'}
          </button>
          <a href="/" className="mobile-footer-link" onClick={() => localStorage.clear()}>
            <i className="fa-solid fa-power-off" />
            Logout
          </a>
        </div>
      </div>
    </>
  );
}

function Sidebar({ links, contextLabel }) {
  const [isDark, toggleTheme] = useTheme();
  const username = localStorage.getItem('userUsername') || '';
  const role     = localStorage.getItem('userRole')     || '';
  const cfg = ROLE_MAP[role] || { letter: username ? username[0].toUpperCase() : '?', color: '#FF007F', label: role || '—' };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <a href="/" style={{ textDecoration: 'none' }}>
          <h2 className="logo-brand">ArtAround.</h2>
        </a>
        <p className="admin-badge">{contextLabel || 'Navigator'}</p>
      </div>

      <a href="/" className="menu-link home-menu-link">
        <i className="fa-solid fa-house" /> Menu principale
      </a>
      <div className="sidebar-divider-line" />

      <nav className="sidebar-menu">
        {links.map((l, i) => (
          <button
            key={i}
            className={`nav-item${l.active ? ' active' : ''}`}
            onClick={l.href ? () => { window.location.href = l.href; } : l.onClick}
          >
            {l.icon && <i className={`fa-solid ${l.icon}`} />}
            {l.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="dark-toggle" onClick={toggleTheme}>
          <span className="toggle-label">{isDark ? 'Modalità chiara' : 'Modalità scura'}</span>
          <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} />
        </button>
        <div className="user-pill-mini">
          <div className="avatar-sm" style={avatarStyle(cfg)}>{cfg.avatar ? '' : cfg.letter}</div>
          <div className="user-info-mini">
            <span className="name">{username || '—'}</span>
            <span className="role">{cfg.label}</span>
          </div>
          <a href="/" className="logout-icon" style={{ marginLeft: 'auto' }} title="Logout" onClick={() => localStorage.clear()}>
            <i className="fa-solid fa-power-off" />
          </a>
        </div>
      </div>
    </aside>
  );
}
