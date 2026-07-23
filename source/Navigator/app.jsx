/* app.jsx - App component + mount */

function App() {
  const [screen,         setScreen]         = React.useState('loading');
  const [musei,          setMusei]          = React.useState([]);
  const [museo,          setMuseo]          = React.useState(null);
  const [visite,         setVisite]         = React.useState([]);
  const [lobby,          setLobby]          = React.useState(null);
  const [error,          setError]          = React.useState(null);
  const [search,         setSearch]         = React.useState('');
  const [soloConiVisite, setSoloConiVisite] = React.useState(false);
  const [museiConVisite, setMuseiConVisite] = React.useState(new Set());
  const [reorderVisita,  setReorderVisita]  = React.useState(null);

  const userId   = localStorage.getItem('userId')   || '';
  const codiceIsil = new URLSearchParams(window.location.search).get('museo');
  const museiRef = React.useRef([]);
  React.useEffect(() => { museiRef.current = musei; }, [musei]);

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
              setLobby({ codice: saved.codice, visitaNome: saved.visitaNome });
              setScreen('lobby-docente');
              return;
            }
            if (saved.role === 'studente') {
              setLobby({ codice: saved.codice, myName: saved.nomeAssegnato, museoIsil: saved.museoIsil });
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
        selectMuseo(isil, { push: false });
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
      const res  = await fetch('/api/musei');
      const data = await res.json();
      setMusei(data.data || []);

      // Carica le visite dell'utente per sapere quali musei hanno visite sue
      if (userId) {
        try {
          const vParams = new URLSearchParams({ autoreId: userId });
          try {
            const p = JSON.parse(localStorage.getItem(`purchases_${userId}`) || '{"visite":[]}');
            if (p.visite?.length) vParams.set('ids', p.visite.join(','));
          } catch (_) {}
          const vRes  = await fetch(`/api/visite?${vParams}`);
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

  async function selectMuseo(isil, { push = true } = {}) {
    setScreen('loading');
    setError(null);
    if (push) {
      const url = new URL(window.location.href);
      url.searchParams.set('museo', isil);
      window.history.pushState({}, '', url);
    }
    try {
      const params = new URLSearchParams({ codiceIsil: isil });
      if (userId) params.set('autoreId', userId);
      const [museoRes, visiteRes] = await Promise.all([
        fetch(`/api/musei/${isil}`),
        fetch(`/api/visite?${params}`),
      ]);
      const museoData  = await museoRes.json();
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
    const adj  = ['rosso', 'verde', 'dorato', 'argento', 'viola', 'bianco', 'nero'];
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
        const res  = await fetch('/api/sessioni', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            codice,
            visitaId:    visita._id,
            visitaNome:  visita.nomeVisita,
            museoIsil:   museo.codiceIsil,
            operaGroups,
            hasQuiz:     (visita.quizDomande || []).length > 0,
          }),
        });
        const data = await res.json();
        if (res.ok && !data.error) {
          acquireNavLock(codice, 'docente');
          setLobby({ codice, visitaNome: visita.nomeVisita });
          saveNavSession({ role: 'docente', codice, visitaNome: visita.nomeVisita, museoIsil: museo.codiceIsil });
          window.history.pushState({ screen: 'lobby-docente' }, '', window.location.href);
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

  if (screen === 'loading') return (
    <div className="nav-loading">
      <div className="nav-spinner" />
      <p>Caricamento…</p>
    </div>
  );

  if (screen === 'error') return (
    <div className="nav-error">
      <span className="nav-error-icon">⚠️</span>
      <p>{error}</p>
      <button onClick={goBack} className="nav-back-link">← Torna alla lista</button>
    </div>
  );

  // Unica via d'uscita per i partecipanti: il pulsante "Esci" dentro la visita
  // (o la chiusura da parte della docente). Un reload non deve mai passare di qui.
  const exitStudente = () => { if (lobby?.codice) releaseNavLock(lobby.codice); clearNavSession(); setLobby(null); setScreen('musei'); };

  if (screen === 'lobby-studente') return (
    <LobbyStudente
      codice={lobby.codice}
      nomeAssegnato={lobby.myName}
      museoIsil={lobby.museoIsil}
      onBack={exitStudente}
    />
  );

  if (screen === 'reorder' && reorderVisita) return (
    <ReorderScreen
      visita={reorderVisita}
      onBack={() => setScreen('visite')}
      onConfirm={(operaGroups) => handleCreaSessione(reorderVisita, operaGroups)}
    />
  );

  // Unica via d'uscita per la docente: "Annulla sessione" (prima dell'avvio) o
  // "Termina visita" (durante), entrambi passano per onClose. Niente sidebar
  // qui sotto (Musei/Marketplace/Unisciti) — non deve esistere un'uscita implicita.
  const closeSession = () => { if (lobby?.codice) releaseNavLock(lobby.codice); clearNavSession(); setLobby(null); setScreen('visite'); };

  if (screen === 'lobby-docente') return (
    <LobbyDocente codice={lobby.codice} visitaNome={lobby.visitaNome} museo={museo} onClose={closeSession} />
  );

  /* screen === 'musei' | 'join' | 'visite' */
  const joinClick    = () => { window.history.pushState({ screen: 'join' }, '', window.location.href); setScreen('join'); };

  const goMarketplace = () => setScreen('marketplace');

  const sidebarLinks = screen === 'visite'
    ? [
        { label: 'Musei',                   icon: 'fa-museum', active: true,                    onClick: goBack },
        { label: 'Marketplace',             icon: 'fa-store',                                   onClick: goMarketplace },
        { label: 'Unisciti tramite codice', icon: 'fa-link',                                    onClick: joinClick },
      ]
    : [
        { label: 'Musei',                   icon: 'fa-museum', active: screen === 'musei',      onClick: () => { setSearch(''); setScreen('musei'); } },
        { label: 'Marketplace',             icon: 'fa-store',  active: screen === 'marketplace', onClick: goMarketplace },
        { label: 'Unisciti tramite codice', icon: 'fa-link',   active: screen === 'join',       onClick: joinClick },
      ];

  const filteredMusei = musei.filter(m =>
    (!search.trim() ||
      m.nome.toLowerCase().includes(search.toLowerCase()) ||
      (m.citta || '').toLowerCase().includes(search.toLowerCase())) &&
    (!soloConiVisite || museiConVisite.has(m.codiceIsil))
  );

  return (
    <div className="admin-layout">
      <Sidebar contextLabel="Navigator" links={sidebarLinks} />
      <MobileMenu contextLabel="ArtAround." links={sidebarLinks} />

      <main className={`main-content${screen === 'visite' ? ' main-content--visite' : screen === 'marketplace' ? ' main-content--lobby' : ''}`}>
        {screen === 'musei' ? (
          <>
            <header className="content-header">
              <div>
                <h1 className="page-title">Esplora Musei</h1>
                <p>Scegli un museo per vedere le tue visite</p>
              </div>
            </header>

            <div className="toolbar-section">
              <div className="musei-toolbar-row">
                <div className="search-box-container" style={{ flex: 1 }}>
                  <i className="fa-solid fa-magnifying-glass search-icon" />
                  <input
                    id="nav-search-musei"
                    name="search-musei"
                    className="search-input"
                    type="text"
                    placeholder="Cerca museo o città…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {userId && museiConVisite.size > 0 && (
                  <button
                    className={`musei-visite-filter${soloConiVisite ? ' musei-visite-filter--active' : ''}`}
                    onClick={() => setSoloConiVisite(v => !v)}
                    title={soloConiVisite ? 'Mostra tutti i musei' : 'Mostra solo musei con le mie visite'}
                  >
                    <i className="fa-solid fa-ticket" />
                    {soloConiVisite ? 'Tutti i musei' : 'Le mie visite'}
                  </button>
                )}
              </div>
            </div>

            <div className="picker-grid">
              {filteredMusei.map(m => (
                <button key={m.codiceIsil} className="picker-card" onClick={() => selectMuseo(m.codiceIsil)}>
                  {m.immagineCopertina
                    ? <img loading="lazy" src={m.immagineCopertina} alt={m.nome} className="picker-card-img" />
                    : <div className="picker-card-placeholder"><span>{m.nome[0]}</span></div>
                  }
                  <div className="picker-card-body">
                    <h3 className="picker-card-name">{m.nome}</h3>
                    <p className="picker-card-city">{m.citta}</p>
                    <div className="picker-card-footer">
                      <span className="picker-card-isil">{m.codiceIsil}</span>
                      {museiConVisite.has(m.codiceIsil) && (
                        <span className="picker-card-mie-visite">
                          <i className="fa-solid fa-ticket" /> Le mie visite
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {!filteredMusei.length && (
                <p className="nav-empty" style={{ gridColumn: '1/-1' }}>
                  {search.trim() ? 'Nessun museo trovato.' : 'Nessun museo disponibile.'}
                </p>
              )}
            </div>
          </>
        ) : screen === 'visite' ? (
          <VisiteScreen museo={museo} visite={visite} onBack={goBack} onAvvia={handleAvvia} />
        ) : screen === 'marketplace' ? (
          <MarketplaceScreen />
        ) : (
          <JoinContent
            onJoined={(codice, nome, museoIsil) => {
              setLobby({ codice, myName: nome, museoIsil });
              saveNavSession({ role: 'studente', codice, nomeAssegnato: nome, museoIsil });
              setScreen('lobby-studente');
            }}
          />
        )}
      </main>
    </div>
  );
}

/* ── Mount ──────────────────────────────────────────── */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
