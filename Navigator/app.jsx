/* ── JoinScreen ─────────────────────────────────────── */

function JoinScreen({ onBack, onJoined }) {
  const [code,      setCode]      = React.useState('');
  const [joining,   setJoining]   = React.useState(false);
  const [joinError, setJoinError] = React.useState(null);

  async function handleJoin() {
    const trimmed = code.trim();
    if (!trimmed || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const res  = await fetch(`/api/sessioni/${encodeURIComponent(trimmed)}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) {
        setJoinError(data.error || 'Codice non trovato. Riprova.');
      } else {
        onJoined(trimmed, data.nome);
      }
    } catch (_) {
      setJoinError('Impossibile connettersi al server. Riprova.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="student-root">
      <div className="nav-topbar nav-topbar--split">
        <button onClick={onBack} className="back-to-marketplace">← Indietro</button>
        <a href="/" className="back-to-marketplace">⌂ Menu</a>
      </div>
      <div className="student-body">
        <header className="picker-header">
          <h1 className="picker-title" style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)' }}>
            Unisciti a una Visita
          </h1>
          <p className="picker-subtitle">Inserisci il codice stanza fornito dal docente</p>
        </header>
        <div className="student-form">
          <input
            type="text"
            className={`student-code-input${joinError ? ' student-code-input--error' : ''}`}
            placeholder='es. "Fenice rossa"'
            value={code}
            onChange={e => { setCode(e.target.value); setJoinError(null); }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          {joinError && <p className="student-join-error">{joinError}</p>}
          <button className="student-join-btn" onClick={handleJoin} disabled={!code.trim() || joining}>
            {joining ? 'Connessione…' : 'Entra →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── LobbyDocente ─────────────────────────────────────── */

function LobbyDocente({ codice, visitaNome, onClose }) {
  const [studenti, setStudenti] = React.useState([]);
  const [stato,    setStato]    = React.useState('attesa');
  const [avviando, setAvviando] = React.useState(false);

  React.useEffect(() => {
    const es = new EventSource(`/api/sessioni/${encodeURIComponent(codice)}/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'stato-iniziale') {
        setStudenti(data.studenti);
        setStato(data.stato);
      } else if (data.tipo === 'studente-connesso') {
        setStudenti(data.studenti);
      } else if (data.tipo === 'visita-iniziata') {
        setStato('iniziata');
      }
    };
    return () => es.close();
  }, [codice]);

  async function handleAvvia() {
    setAvviando(true);
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/avvia`, { method: 'POST' });
    } finally {
      setAvviando(false);
    }
  }

  if (stato === 'iniziata') return (
    <div className="lobby-root lobby-root--dark">
      <div className="lobby-started">
        <span className="lobby-started-icon">✅</span>
        <h2 className="lobby-started-title">Visita avviata!</h2>
        <p className="lobby-started-sub">Tutti i {studenti.length} partecipanti sono stati notificati.</p>
        <button className="back-to-marketplace" onClick={onClose} style={{ marginTop: 28 }}>
          ← Torna alla lista visite
        </button>
      </div>
    </div>
  );

  return (
    <div className="lobby-root lobby-root--dark">
      <div className="nav-topbar">
        <button onClick={onClose} className="back-to-marketplace">← Annulla sessione</button>
      </div>
      <div className="lobby-body">
        <header className="lobby-header">
          <p className="lobby-label">Lobby di Attesa · Docente</p>
          <h1 className="lobby-title">{visitaNome}</h1>
          <div className="lobby-code-box">
            <span className="lobby-code-label">Codice da condividere con i partecipanti:</span>
            <span className="lobby-code">{codice}</span>
          </div>
        </header>

        <section className="lobby-panel">
          <h3 className="lobby-panel-title">
            Partecipanti connessi
            <span className="lobby-count-badge">{studenti.length}</span>
          </h3>
          {studenti.length === 0
            ? <p className="lobby-empty">In attesa che i partecipanti si connettano…</p>
            : (
              <ul className="lobby-students-list">
                {studenti.map((s, i) => (
                  <li key={i} className="lobby-student-item">
                    <span className="lobby-avatar">{s.nome[0]}</span>
                    {s.nome}
                  </li>
                ))}
              </ul>
            )
          }
        </section>

        <button
          className="inizia-btn"
          disabled={studenti.length === 0 || avviando}
          onClick={handleAvvia}
        >
          {avviando
            ? 'Avvio in corso…'
            : studenti.length === 0
              ? 'Inizia Visita (nessuno connesso)'
              : `Inizia Visita con ${studenti.length} partecipant${studenti.length === 1 ? 'e' : 'i'}`
          }
        </button>
      </div>
    </div>
  );
}

/* ── LobbyStudente ─────────────────────────────────────── */

function LobbyStudente({ codice, nomeAssegnato, onBack }) {
  const [studenti, setStudenti] = React.useState([]);
  const [stato,    setStato]    = React.useState('attesa');

  React.useEffect(() => {
    const es = new EventSource(`/api/sessioni/${encodeURIComponent(codice)}/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'stato-iniziale') {
        setStudenti(data.studenti);
        setStato(data.stato);
      } else if (data.tipo === 'studente-connesso') {
        setStudenti(data.studenti);
      } else if (data.tipo === 'visita-iniziata') {
        setStato('iniziata');
      }
    };
    return () => es.close();
  }, [codice]);

  if (stato === 'iniziata') return (
    <div className="lobby-root lobby-root--dark">
      <div className="lobby-started">
        <span className="lobby-started-icon">🎉</span>
        <h2 className="lobby-started-title">La visita è iniziata!</h2>
        <p className="lobby-started-sub">Buona visita, <strong>{nomeAssegnato}</strong>!</p>
      </div>
    </div>
  );

  return (
    <div className="lobby-root lobby-root--dark">
      <div className="nav-topbar">
        <button onClick={onBack} className="back-to-marketplace">← Esci</button>
      </div>
      <div className="lobby-body lobby-body--center">
        <div className="lobby-spinner-wrap">
          <div className="nav-spinner lobby-spinner" />
        </div>
        <h2 className="lobby-waiting-title">In attesa che l'insegnante avvii la visita…</h2>
        <p className="lobby-you-are">
          Sei connesso come <strong>{nomeAssegnato}</strong>
        </p>
        <div className="lobby-code-box lobby-code-box--sm">
          <span className="lobby-code-label">Stanza:</span>
          <span className="lobby-code">{codice}</span>
        </div>
        {studenti.length > 0 && (
          <div className="lobby-avatars-row">
            <p className="lobby-avatars-label">{studenti.length} in stanza</p>
            <div className="lobby-avatars">
              {studenti.map((s, i) => (
                <span
                  key={i}
                  className={`lobby-avatar${s.nome === nomeAssegnato ? ' lobby-avatar--me' : ''}`}
                  title={s.nome}
                >
                  {s.nome[0]}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── VisiteScreen ─────────────────────────────────────── */

function VisiteScreen({ museo, visite, onBack, onAvvia }) {
  const [selectedId,      setSelectedId]      = React.useState(null);
  const [showMap,         setShowMap]         = React.useState(false);
  const [showMapInterna,  setShowMapInterna]  = React.useState(false);
  const [pianoIdx,        setPianoIdx]        = React.useState(0);

  return (
    <div className="visite-screen-root">
      <div className="museo-back-bar">
        <a href="/" className="back-to-marketplace">⌂ Menu</a>
        <a href="/Editor-Marketplace/Frontend/dashboard.html" className="back-to-marketplace">← Dashboard</a>
        <button onClick={onBack} className="back-btn">← Tutti i musei</button>
      </div>

      <div className="museo-mini-header">
        {museo.immagineCopertina && (
          <div className="museo-mini-cover">
            <img src={museo.immagineCopertina} alt={museo.nome} />
          </div>
        )}
        <div className="museo-mini-info">
          <h1 className="museo-mini-title">{museo.nome}</h1>
          <p className="museo-mini-sub">{museo.citta} · {museo.codiceIsil}</p>
        </div>
        {museo.mappaEmbed && (
          <button
            className={`show-map-btn${showMap ? ' show-map-btn--active' : ''}`}
            onClick={() => setShowMap(v => !v)}
          >
            📍 {showMap ? 'Nascondi mappa' : 'Mappa'}
          </button>
        )}
        {museo.mappaInterna?.length > 0 && (
          <button
            className={`show-map-btn${showMapInterna ? ' show-map-btn--active' : ''}`}
            onClick={() => { setShowMapInterna(v => !v); setPianoIdx(0); }}
          >
            🗺️ {showMapInterna ? 'Nascondi planimetria' : 'Planimetria'}
          </button>
        )}
      </div>

      {showMapInterna && museo.mappaInterna?.length > 0 && (
        <div className="museo-map-section museo-map-interna-section">
          {museo.mappaInterna.length > 1 && (
            <div className="piano-tabs-nav">
              {museo.mappaInterna.map((p, i) => (
                <button
                  key={i}
                  className={`piano-tab-btn${pianoIdx === i ? ' active' : ''}`}
                  onClick={() => setPianoIdx(i)}
                >
                  {p.piano}
                </button>
              ))}
            </div>
          )}
          <img
            className="museo-interna-img"
            src={museo.mappaInterna[pianoIdx].url}
            alt={museo.mappaInterna[pianoIdx].piano}
            loading="lazy"
          />
        </div>
      )}

      {showMap && museo.mappaEmbed && (
        <div className="museo-map-section">
          <iframe
            className="museo-map-iframe"
            src={museo.mappaEmbed}
            title={`Mappa ${museo.nome}`}
            loading="lazy"
            allowFullScreen
          />
          {museo.mappaLink && (
            <a
              href={museo.mappaLink}
              target="_blank"
              rel="noreferrer"
              className="museo-map-link"
            >
              Apri in OpenStreetMap ↗
            </a>
          )}
        </div>
      )}

      <main className="nav-main">
        <p className="visite-section-title">Le mie visite</p>
        {visite.length === 0
          ? <p className="nav-empty">Nessuna visita trovata per questo museo.<br/>Crea o acquista visite dalla dashboard.</p>
          : (
            <div className="visite-list">
              {visite.map(v => (
                <div
                  key={v._id}
                  className={`visita-card${selectedId === v._id ? ' visita-card--selected' : ''}`}
                  onClick={() => setSelectedId(prev => prev === v._id ? null : v._id)}
                >
                  <div className="visita-card-head">
                    <div>
                      <h3 className="visita-title">{v.nomeVisita}</h3>
                      {v.nomeMnemonico && <span className="visita-badge">{v.nomeMnemonico}</span>}
                    </div>
                    <div className="visita-meta-right">
                      {v.opereCount > 0 && <span className="stat-pill">{v.opereCount} opere</span>}
                      {v.prezzo != null && (
                        <span className="price-pill">{v.prezzo > 0 ? `€${v.prezzo}` : 'Gratuito'}</span>
                      )}
                    </div>
                  </div>
                  {v.logistica && <p className="visita-logistica">{v.logistica}</p>}
                  {selectedId === v._id && (
                    <div className="visita-avvia-row">
                      <button
                        className="avvia-btn"
                        onClick={e => { e.stopPropagation(); onAvvia(v); }}
                      >
                        Avvia visita →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }

      </main>
    </div>
  );
}

/* ── App principale ─────────────────────────────────────── */

function App() {
  const [screen,  setScreen]  = React.useState('loading');
  const [musei,   setMusei]   = React.useState([]);
  const [museo,   setMuseo]   = React.useState(null);
  const [visite,  setVisite]  = React.useState([]);
  const [lobby,   setLobby]   = React.useState(null);
  const [error,   setError]   = React.useState(null);

  const userId     = localStorage.getItem('userId') || '';
  const codiceIsil = new URLSearchParams(window.location.search).get('museo');

  React.useEffect(() => {
    if (codiceIsil) {
      selectMuseo(codiceIsil);
    } else {
      loadMusei();
    }
  }, []);

  async function loadMusei() {
    setScreen('loading');
    setError(null);
    try {
      const res  = await fetch('/api/musei');
      const data = await res.json();
      setMusei(data.data || []);
      setScreen('musei');
    } catch (_) {
      setError('Impossibile caricare la lista dei musei.');
      setScreen('error');
    }
  }

  async function selectMuseo(isil) {
    setScreen('loading');
    setError(null);
    const url = new URL(window.location.href);
    url.searchParams.set('museo', isil);
    window.history.pushState({}, '', url);
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
      setMuseo(museoData.data);
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
    if (visita.nomeMnemonico?.trim()) return visita.nomeMnemonico.trim();
    const adj  = ['rosso', 'verde', 'dorato', 'argento', 'viola', 'bianco', 'nero'];
    const noun = ['falco', 'leone', 'aquila', 'fenice', 'drago', 'tigre', 'orso'];
    return `${adj[Math.floor(Math.random() * adj.length)]} ${noun[Math.floor(Math.random() * noun.length)]}`;
  }

  async function handleAvvia(visita) {
    let codice = generateCode(visita);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res  = await fetch('/api/sessioni', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            codice,
            visitaId:   visita._id,
            visitaNome: visita.nomeVisita,
            museoIsil:  museo.codiceIsil,
          }),
        });
        const data = await res.json();
        if (res.ok && !data.error) {
          setLobby({ codice, visitaNome: visita.nomeVisita });
          setScreen('lobby-docente');
          return;
        }
        if (attempt < 2) {
          codice = generateCode(visita) + ' ' + (Math.floor(Math.random() * 90) + 10);
        } else {
          alert(data.error || `Errore ${res.status}`);
        }
      } catch (e) {
        alert(`Impossibile raggiungere il server: ${e.message}`);
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

  if (screen === 'join') return (
    <JoinScreen
      onBack={() => setScreen('musei')}
      onJoined={(codice, nome) => { setLobby({ codice, myName: nome }); setScreen('lobby-studente'); }}
    />
  );

  if (screen === 'lobby-studente') return (
    <LobbyStudente
      codice={lobby.codice}
      nomeAssegnato={lobby.myName}
      onBack={() => { setLobby(null); setScreen('musei'); }}
    />
  );

  if (screen === 'lobby-docente') return (
    <LobbyDocente
      codice={lobby.codice}
      visitaNome={lobby.visitaNome}
      onClose={() => { setLobby(null); setScreen('visite'); }}
    />
  );

  if (screen === 'visite') return (
    <VisiteScreen
      museo={museo}
      visite={visite}
      onBack={goBack}
      onAvvia={handleAvvia}
    />
  );

  /* screen === 'musei' */
  return (
    <div className="museo-picker-root">
      <div className="nav-topbar nav-topbar--split">
        <a href="/Editor-Marketplace/Frontend/dashboard.html" className="back-to-marketplace">← Dashboard</a>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="join-code-btn" onClick={() => setScreen('join')}>
            🔗 Unisciti tramite codice
          </button>
          <a href="/" className="back-to-marketplace">⌂ Menu</a>
        </div>
      </div>
      <header className="picker-header">
        <h1 className="picker-title">ArtAround<span className="picker-dot">.</span></h1>
        <p className="picker-subtitle">Scegli un museo per vedere le tue visite</p>
      </header>
      <div className="picker-grid">
        {musei.map(m => (
          <button key={m.codiceIsil} className="picker-card" onClick={() => selectMuseo(m.codiceIsil)}>
            {m.immagineCopertina
              ? <img src={m.immagineCopertina} alt={m.nome} className="picker-card-img" />
              : <div className="picker-card-placeholder"><span>{m.nome[0]}</span></div>
            }
            <div className="picker-card-body">
              <h3 className="picker-card-name">{m.nome}</h3>
              <p className="picker-card-city">{m.citta}</p>
              <span className="picker-card-isil">{m.codiceIsil}</span>
            </div>
          </button>
        ))}
        {!musei.length && (
          <p className="nav-empty" style={{ gridColumn: '1/-1' }}>Nessun museo disponibile.</p>
        )}
      </div>
    </div>
  );
}

/* ── Mount ──────────────────────────────────────────── */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
