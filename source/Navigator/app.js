/* app.jsx - App component + mount */

function App() {
  const [screen, setScreen] = React.useState('loading');
  const [musei, setMusei] = React.useState([]);
  const [museo, setMuseo] = React.useState(null);
  const [visite, setVisite] = React.useState([]);
  const [lobby, setLobby] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [soloConiVisite, setSoloConiVisite] = React.useState(false);
  const [museiConVisite, setMuseiConVisite] = React.useState(new Set());
  const [reorderVisita, setReorderVisita] = React.useState(null);
  const userId = localStorage.getItem('userId') || '';
  const codiceIsil = new URLSearchParams(window.location.search).get('museo');
  const museiRef = React.useRef([]);
  React.useEffect(() => {
    museiRef.current = musei;
  }, [musei]);
  React.useEffect(() => {
    if (!lobby?.codice) return;
    if (screen !== 'lobby-docente' && screen !== 'lobby-studente') return;
    refreshNavLock(lobby.codice);
    const interval = setInterval(() => refreshNavLock(lobby.codice), 5000);
    const releaseOnUnload = () => releaseNavLock(lobby.codice);
    window.addEventListener('beforeunload', releaseOnUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', releaseOnUnload);
    };
  }, [screen, lobby?.codice]);
  React.useEffect(() => {
    (async () => {
      const saved = loadNavSession();
      if (saved?.codice && saved?.role) {
        try {
          const r = await fetch(`/api/sessioni/${encodeURIComponent(saved.codice)}`);
          const d = await r.json();
          if (d.ok) {
            acquireNavLock(saved.codice, saved.role);
            if (saved.role === 'docente') {
              if (saved.museoIsil) {
                try {
                  const rm = await fetch(`/api/musei/${encodeURIComponent(saved.museoIsil)}`);
                  const dm = await rm.json();
                  if (dm.data) setMuseo(applyFloorPlanOverrides(dm.data));
                } catch (_) {}
              }
              setLobby({
                codice: saved.codice,
                visitaNome: saved.visitaNome
              });
              setScreen('lobby-docente');
              return;
            }
            if (saved.role === 'studente') {
              setLobby({
                codice: saved.codice,
                myName: saved.nomeAssegnato,
                museoIsil: saved.museoIsil
              });
              setScreen('lobby-studente');
              return;
            }
          }
          // Sessione non più valida (chiusa/scaduta lato server): pulisci e riparti normalmente.
          clearNavSession();
        } catch (_) {
          clearNavSession();
        }
      }
      if (codiceIsil) {
        selectMuseo(codiceIsil);
      } else {
        loadMusei();
      }
    })();
    function handlePopState() {
      const isil = new URLSearchParams(window.location.search).get('museo');
      if (isil) {
        selectMuseo(isil, {
          push: false
        });
      } else {
        setMuseo(null);
        setVisite([]);
        setError(null);
        if (museiRef.current.length) {
          setScreen('musei');
        } else {
          loadMusei();
        }
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  async function loadMusei() {
    setScreen('loading');
    setError(null);
    try {
      const res = await fetch('/api/musei');
      const data = await res.json();
      setMusei(data.data || []);

      // Carica le visite dell'utente per sapere quali musei hanno visite sue
      if (userId) {
        try {
          const vParams = new URLSearchParams({
            autoreId: userId
          });
          try {
            const p = JSON.parse(localStorage.getItem(`purchases_${userId}`) || '{"visite":[]}');
            if (p.visite?.length) vParams.set('ids', p.visite.join(','));
          } catch (_) {}
          const vRes = await fetch(`/api/visite?${vParams}`);
          const vData = await vRes.json();
          if (vData.ok && Array.isArray(vData.data)) {
            setMuseiConVisite(new Set(vData.data.map(v => v.codiceIsil).filter(Boolean)));
          }
        } catch (_) {}
      }
      setScreen('musei');
    } catch (_) {
      setError('Impossibile caricare la lista dei musei.');
      setScreen('error');
    }
  }
  async function selectMuseo(isil, {
    push = true
  } = {}) {
    setScreen('loading');
    setError(null);
    if (push) {
      const url = new URL(window.location.href);
      url.searchParams.set('museo', isil);
      window.history.pushState({}, '', url);
    }
    try {
      const params = new URLSearchParams({
        codiceIsil: isil
      });
      if (userId) params.set('autoreId', userId);
      const [museoRes, visiteRes] = await Promise.all([fetch(`/api/musei/${isil}`), fetch(`/api/visite?${params}`)]);
      const museoData = await museoRes.json();
      const visiteData = await visiteRes.json();
      if (!museoData.data) throw new Error('Museo non trovato.');
      setMuseo(applyFloorPlanOverrides(museoData.data));
      setVisite(visiteData.data || []);
      setScreen('visite');
    } catch (e) {
      setError(e.message);
      setScreen('error');
    }
  }
  function goBack() {
    const url = new URL(window.location.href);
    url.searchParams.delete('museo');
    window.history.pushState({}, '', url);
    setMuseo(null);
    setVisite([]);
    setError(null);
    if (musei.length) {
      setScreen('musei');
    } else {
      loadMusei();
    }
  }
  function generateCode(visita) {
    if (visita.nomeMnemonico?.trim()) return visita.nomeMnemonico.trim().replace(/\s+/g, '-');
    const adj = ['rosso', 'verde', 'dorato', 'argento', 'viola', 'bianco', 'nero'];
    const noun = ['falco', 'leone', 'aquila', 'fenice', 'drago', 'tigre', 'orso'];
    return `${adj[Math.floor(Math.random() * adj.length)]}-${noun[Math.floor(Math.random() * noun.length)]}`;
  }
  function handleAvvia(visita) {
    setReorderVisita(visita);
    setScreen('reorder');
  }
  async function handleCreaSessione(visita, operaGroups) {
    let codice = generateCode(visita);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('/api/sessioni', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            codice,
            visitaId: visita._id,
            visitaNome: visita.nomeVisita,
            museoIsil: museo.codiceIsil,
            operaGroups,
            hasQuiz: (visita.quizDomande || []).length > 0
          })
        });
        const data = await res.json();
        if (res.ok && !data.error) {
          acquireNavLock(codice, 'docente');
          setLobby({
            codice,
            visitaNome: visita.nomeVisita
          });
          saveNavSession({
            role: 'docente',
            codice,
            visitaNome: visita.nomeVisita,
            museoIsil: museo.codiceIsil
          });
          window.history.pushState({
            screen: 'lobby-docente'
          }, '', window.location.href);
          setScreen('lobby-docente');
          return;
        }
        if (attempt < 2) {
          codice = generateCode(visita) + '-' + (Math.floor(Math.random() * 90) + 10);
        } else {
          showAlert(data.error || `Errore ${res.status}`);
        }
      } catch (e) {
        showAlert(`Impossibile raggiungere il server: ${e.message}`);
        return;
      }
    }
  }

  /* ── Rendering ── */

  if (screen === 'loading') return /*#__PURE__*/React.createElement("div", {
    className: "nav-loading"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-spinner"
  }), /*#__PURE__*/React.createElement("p", null, "Caricamento…"));
  if (screen === 'error') return /*#__PURE__*/React.createElement("div", {
    className: "nav-error"
  }, /*#__PURE__*/React.createElement("span", {
    className: "nav-error-icon"
  }, "⚠️"), /*#__PURE__*/React.createElement("p", null, error), /*#__PURE__*/React.createElement("button", {
    onClick: goBack,
    className: "nav-back-link"
  }, "← Torna alla lista"));

  // Unica via d'uscita per i partecipanti: il pulsante "Esci" dentro la visita
  // (o la chiusura da parte della docente). Un reload non deve mai passare di qui.
  const exitStudente = () => {
    if (lobby?.codice) releaseNavLock(lobby.codice);
    clearNavSession();
    setLobby(null);
    setScreen('musei');
  };
  if (screen === 'lobby-studente') return /*#__PURE__*/React.createElement(LobbyStudente, {
    codice: lobby.codice,
    nomeAssegnato: lobby.myName,
    museoIsil: lobby.museoIsil,
    onBack: exitStudente
  });
  if (screen === 'reorder' && reorderVisita) return /*#__PURE__*/React.createElement(ReorderScreen, {
    visita: reorderVisita,
    onBack: () => setScreen('visite'),
    onConfirm: operaGroups => handleCreaSessione(reorderVisita, operaGroups)
  });

  // Unica via d'uscita per la docente: "Annulla sessione" (prima dell'avvio) o
  // "Termina visita" (durante), entrambi passano per onClose. Niente sidebar
  // qui sotto (Musei/Marketplace/Unisciti) — non deve esistere un'uscita implicita.
  const closeSession = () => {
    if (lobby?.codice) releaseNavLock(lobby.codice);
    clearNavSession();
    setLobby(null);
    setScreen('visite');
  };
  if (screen === 'lobby-docente') return /*#__PURE__*/React.createElement(LobbyDocente, {
    codice: lobby.codice,
    visitaNome: lobby.visitaNome,
    museo: museo,
    onClose: closeSession
  });

  /* screen === 'musei' | 'join' | 'visite' */
  const joinClick = () => {
    window.history.pushState({
      screen: 'join'
    }, '', window.location.href);
    setScreen('join');
  };
  const goMarketplace = () => setScreen('marketplace');
  const sidebarLinks = screen === 'visite' ? [{
    label: 'Musei',
    icon: 'fa-museum',
    active: true,
    onClick: goBack
  }, {
    label: 'Marketplace',
    icon: 'fa-store',
    onClick: goMarketplace
  }, {
    label: 'Unisciti tramite codice',
    icon: 'fa-link',
    onClick: joinClick
  }] : [{
    label: 'Musei',
    icon: 'fa-museum',
    active: screen === 'musei',
    onClick: () => {
      setSearch('');
      setScreen('musei');
    }
  }, {
    label: 'Marketplace',
    icon: 'fa-store',
    active: screen === 'marketplace',
    onClick: goMarketplace
  }, {
    label: 'Unisciti tramite codice',
    icon: 'fa-link',
    active: screen === 'join',
    onClick: joinClick
  }];
  const filteredMusei = musei.filter(m => (!search.trim() || m.nome.toLowerCase().includes(search.toLowerCase()) || (m.citta || '').toLowerCase().includes(search.toLowerCase())) && (!soloConiVisite || museiConVisite.has(m.codiceIsil)));
  return /*#__PURE__*/React.createElement("div", {
    className: "admin-layout"
  }, /*#__PURE__*/React.createElement(Sidebar, {
    contextLabel: "Navigator",
    links: sidebarLinks
  }), /*#__PURE__*/React.createElement(MobileMenu, {
    contextLabel: "ArtAround.",
    links: sidebarLinks
  }), /*#__PURE__*/React.createElement("main", {
    className: `main-content${screen === 'visite' ? ' main-content--visite' : screen === 'marketplace' ? ' main-content--lobby' : ''}`
  }, screen === 'musei' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("header", {
    className: "content-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "page-title"
  }, "Esplora Musei"), /*#__PURE__*/React.createElement("p", null, "Scegli un museo per vedere le tue visite"))), /*#__PURE__*/React.createElement("div", {
    className: "toolbar-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "musei-toolbar-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "search-box-container",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-magnifying-glass search-icon"
  }), /*#__PURE__*/React.createElement("input", {
    id: "nav-search-musei",
    name: "search-musei",
    className: "search-input",
    type: "text",
    placeholder: "Cerca museo o città…",
    value: search,
    onChange: e => setSearch(e.target.value)
  })), userId && museiConVisite.size > 0 && /*#__PURE__*/React.createElement("button", {
    className: `musei-visite-filter${soloConiVisite ? ' musei-visite-filter--active' : ''}`,
    onClick: () => setSoloConiVisite(v => !v),
    title: soloConiVisite ? 'Mostra tutti i musei' : 'Mostra solo musei con le mie visite'
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-ticket"
  }), soloConiVisite ? 'Tutti i musei' : 'Le mie visite'))), /*#__PURE__*/React.createElement("div", {
    className: "picker-grid"
  }, filteredMusei.map(m => /*#__PURE__*/React.createElement("button", {
    key: m.codiceIsil,
    className: "picker-card",
    onClick: () => selectMuseo(m.codiceIsil)
  }, m.immagineCopertina ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: m.immagineCopertina,
    alt: m.nome,
    className: "picker-card-img"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "picker-card-placeholder"
  }, /*#__PURE__*/React.createElement("span", null, m.nome[0])), /*#__PURE__*/React.createElement("div", {
    className: "picker-card-body"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "picker-card-name"
  }, m.nome), /*#__PURE__*/React.createElement("p", {
    className: "picker-card-city"
  }, m.citta), /*#__PURE__*/React.createElement("div", {
    className: "picker-card-footer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "picker-card-isil"
  }, m.codiceIsil), museiConVisite.has(m.codiceIsil) && /*#__PURE__*/React.createElement("span", {
    className: "picker-card-mie-visite"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-ticket"
  }), " Le mie visite"))))), !filteredMusei.length && /*#__PURE__*/React.createElement("p", {
    className: "nav-empty",
    style: {
      gridColumn: '1/-1'
    }
  }, search.trim() ? 'Nessun museo trovato.' : 'Nessun museo disponibile.'))) : screen === 'visite' ? /*#__PURE__*/React.createElement(VisiteScreen, {
    museo: museo,
    visite: visite,
    onBack: goBack,
    onAvvia: handleAvvia
  }) : screen === 'marketplace' ? /*#__PURE__*/React.createElement(MarketplaceScreen, null) : /*#__PURE__*/React.createElement(JoinContent, {
    onJoined: (codice, nome, museoIsil) => {
      setLobby({
        codice,
        myName: nome,
        museoIsil
      });
      saveNavSession({
        role: 'studente',
        codice,
        nomeAssegnato: nome,
        museoIsil
      });
      setScreen('lobby-studente');
    }
  })));
}

/* ── Mount ──────────────────────────────────────────── */
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));