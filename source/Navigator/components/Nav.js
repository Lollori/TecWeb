function MobileMenu({
  links,
  contextLabel
}) {
  const [open, setOpen] = React.useState(false);
  const [isDark, toggleTheme] = useTheme();
  const username = localStorage.getItem('userUsername') || '';
  const role = localStorage.getItem('userRole') || '';
  const cfg = ROLE_MAP[role] || {
    letter: username ? username[0].toUpperCase() : '?',
    color: '#FF007F',
    label: role || 'Navigator'
  };
  function close() {
    setOpen(false);
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mobile-topbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: `mobile-hamburger${open ? ' open' : ''}`,
    onClick: () => setOpen(v => !v),
    "aria-label": "Menu"
  }, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${open ? 'fa-xmark' : 'fa-bars'}`
  })), /*#__PURE__*/React.createElement("a", {
    href: "/",
    className: "mobile-topbar-logo"
  }, contextLabel || 'ArtAround.'), /*#__PURE__*/React.createElement("div", {
    className: "avatar-sm",
    style: avatarStyle(cfg)
  }, cfg.avatar ? '' : cfg.letter)), /*#__PURE__*/React.createElement("div", {
    className: `mobile-menu-overlay${open ? ' open' : ''}`,
    onClick: close
  }), /*#__PURE__*/React.createElement("div", {
    className: `mobile-menu-dropdown${open ? ' open' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "mobile-menu-user-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar-sm",
    style: avatarStyle(cfg)
  }, cfg.avatar ? '' : cfg.letter), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mobile-menu-username"
  }, username || '—'), /*#__PURE__*/React.createElement("div", {
    className: "mobile-menu-role"
  }, cfg.label))), /*#__PURE__*/React.createElement("nav", {
    className: "mobile-nav"
  }, links.map((l, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "nav-item",
    onClick: () => {
      if (l.href) {
        window.location.href = l.href;
      } else if (l.onClick) {
        l.onClick();
      }
      close();
    }
  }, l.icon && /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${l.icon}`
  }), l.label))), /*#__PURE__*/React.createElement("div", {
    className: "mobile-menu-footer"
  }, /*#__PURE__*/React.createElement("a", {
    href: "/",
    className: "mobile-footer-link"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-house"
  }), "Menu principale"), /*#__PURE__*/React.createElement("button", {
    className: "mobile-footer-link",
    onClick: toggleTheme
  }, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`
  }), isDark ? 'Modalità chiara' : 'Modalità scura'), /*#__PURE__*/React.createElement("a", {
    href: "/",
    className: "mobile-footer-link",
    onClick: () => localStorage.clear()
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-power-off"
  }), "Logout"))));
}
function Sidebar({
  links,
  contextLabel
}) {
  const [isDark, toggleTheme] = useTheme();
  const username = localStorage.getItem('userUsername') || '';
  const role = localStorage.getItem('userRole') || '';
  const cfg = ROLE_MAP[role] || {
    letter: username ? username[0].toUpperCase() : '?',
    color: '#FF007F',
    label: role || '—'
  };
  return /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sidebar-top"
  }, /*#__PURE__*/React.createElement("a", {
    href: "/",
    style: {
      textDecoration: 'none'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "logo-brand"
  }, "ArtAround.")), /*#__PURE__*/React.createElement("p", {
    className: "admin-badge"
  }, contextLabel || 'Navigator')), /*#__PURE__*/React.createElement("a", {
    href: "/",
    className: "menu-link home-menu-link"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-house"
  }), " Menu principale"), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-divider-line"
  }), /*#__PURE__*/React.createElement("nav", {
    className: "sidebar-menu"
  }, links.map((l, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: `nav-item${l.active ? ' active' : ''}`,
    onClick: l.href ? () => {
      window.location.href = l.href;
    } : l.onClick
  }, l.icon && /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${l.icon}`
  }), l.label))), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-footer"
  }, /*#__PURE__*/React.createElement("button", {
    className: "dark-toggle",
    onClick: toggleTheme
  }, /*#__PURE__*/React.createElement("span", {
    className: "toggle-label"
  }, isDark ? 'Modalità chiara' : 'Modalità scura'), /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "user-pill-mini"
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar-sm",
    style: avatarStyle(cfg)
  }, cfg.avatar ? '' : cfg.letter), /*#__PURE__*/React.createElement("div", {
    className: "user-info-mini"
  }, /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, username || '—'), /*#__PURE__*/React.createElement("span", {
    className: "role"
  }, cfg.label)), /*#__PURE__*/React.createElement("a", {
    href: "/",
    className: "logout-icon",
    style: {
      marginLeft: 'auto'
    },
    title: "Logout",
    onClick: () => localStorage.clear()
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-power-off"
  })))));
}