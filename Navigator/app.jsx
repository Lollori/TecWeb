/* ── Entry Screen ─────────────────────────────────── */

function EntryScreen({ onDocente, onStudente }) {
  return (
    <div className="entry-root">
      <div className="nav-topbar">
        <a href="/Editor-Marketplace/Frontend/dashboard.html" className="back-to-marketplace">
          ← Marketplace
        </a>
      </div>
      <div className="entry-body">
        <header className="picker-header">
          <h1 className="picker-title">ArtAround<span className="picker-dot">.</span></h1>
          <p className="picker-subtitle">Come vuoi procedere?</p>
        </header>
        <div className="entry-cards">
          <button className="entry-role-card" onClick={onDocente}>
            <span className="entry-role-icon">🎓</span>
            <h3 className="entry-role-label">Crea / Avvia una Visita Sincronizzata</h3>
            <p className="entry-role-hint">Per il Docente</p>
          </button>
          <button className="entry-role-card entry-role-card--alt" onClick={onStudente}>
            <span className="entry-role-icon">🎒</span>
            <h3 className="entry-role-label">Partecipa a una Visita</h3>
            <p className="entry-role-hint">Per lo Studente</p>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Student Screen ─────────────────────────────────── */

function StudentScreen({ onBack, onJoined }) {
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
      <div className="nav-topbar">
        <button onClick={onBack} className="back-to-marketplace">← Indietro</button>
      </div>
      <div className="student-body">
        <header className="picker-header">
          <h1 className="picker-title" style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)' }}>
            Partecipa a una Visita
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

/* ── Lobby Docente ─────────────────────────────────── */

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
            <span className="lobby-code-label">Codice da condividere con gli studenti:</span>
            <span className="lobby-code">{codice}</span>
          </div>
        </header>

        <section className="lobby-panel">
          <h3 className="lobby-panel-title">
            Studenti connessi
            <span className="lobby-count-badge">{studenti.length}</span>
          </h3>
          {studenti.length === 0
            ? <p className="lobby-empty">In attesa che gli studenti si connettano…</p>
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
              : `Inizia Visita (${studenti.length} stud${studenti.length === 1 ? 'ente' : 'enti'})`
          }
        </button>
      </div>
    </div>
  );
}

/* ── Lobby Studente ─────────────────────────────────── */

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

/* ── Componenti ─────────────────────────────────────── */

function MuseoHeader({ museo, opereCount, visiteCount, itemsCount }) {
  return (
    <header className="museo-header">
      {museo.immagineCopertina && (
        <div className="museo-cover">
          <img src={museo.immagineCopertina} alt={museo.nome} />
          <div className="museo-cover-overlay" />
        </div>
      )}
      <div className="museo-info">
        <div className="museo-meta-top">
          <span className="museo-isil">{museo.codiceIsil}</span>
          <span className="museo-city">{museo.citta}</span>
        </div>
        <h1 className="museo-title">{museo.nome}</h1>
        {museo.descrizioneBreve && <p className="museo-desc">{museo.descrizioneBreve}</p>}
        {museo.indirizzo        && <p className="museo-addr">📍 {museo.indirizzo}</p>}
        <div className="museo-stats">
          <div className="stat-pill">{opereCount} opere</div>
          <div className="stat-pill">{visiteCount} visite</div>
          <div className="stat-pill">{itemsCount} items</div>
        </div>
      </div>
    </header>
  );
}

function OpereGrid({ opere }) {
  if (!opere.length) return <p className="nav-empty">Nessuna opera disponibile.</p>;
  return (
    <div className="items-grid">
      {opere.map(op => (
        <div key={op._id} className="nav-card">
          {op.immagine && <img src={op.immagine} alt={op.operaId} className="nav-card-img" />}
          <div className="nav-card-body">
            <h3 className="nav-card-title">{op.operaId || '—'}</h3>
            {op.autore    && <p className="nav-card-meta">✍️ {op.autore}</p>}
            {op.tipologia && <p className="nav-card-meta">🎨 {op.tipologia}</p>}
            {op.anno      && <p className="nav-card-meta">📅 {op.anno}</p>}
            {op.licenza   && <p className="nav-card-meta">⚖️ {op.licenza}</p>}
            {op.descrizione && <p className="nav-card-desc">{op.descrizione}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function VisiteList({ visite }) {
  if (!visite.length) return <p className="nav-empty">Nessuna visita disponibile.</p>;
  return (
    <div className="visite-list">
      {visite.map(v => (
        <div key={v._id} className="visita-card">
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
          {v.logistica    && <p className="visita-logistica">{v.logistica}</p>}
          {v.quizDomanda  && (
            <div className="visita-quiz">
              <span className="quiz-label">💡 Quiz:</span>
              <span className="quiz-text">{v.quizDomanda}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DocVisiteList({ visite, museo, mnemonici, onMnemonico, onAvvia }) {
  if (!visite.length) return <p className="nav-empty">Nessuna visita disponibile.</p>;
  return (
    <div className="visite-list">
      {visite.map(v => (
        <div key={v._id} className="visita-card visita-card--docente">
          <div className="visita-docente-top">
            <div className="visita-docente-cover">
              {museo.immagineCopertina
                ? <img src={museo.immagineCopertina} alt={v.nomeVisita} />
                : <div className="visita-cover-placeholder">{(v.nomeVisita || '?')[0]}</div>
              }
            </div>
            <div className="visita-docente-info">
              <h3 className="visita-title">{v.nomeVisita}</h3>
              <div className="visita-docente-pills">
                {v.opereCount > 0 && <span className="stat-pill">{v.opereCount} opere</span>}
                {v.prezzo != null && (
                  <span className="price-pill">{v.prezzo > 0 ? `€${v.prezzo}` : 'Gratuito'}</span>
                )}
              </div>
              {v.logistica && <p className="visita-logistica">{v.logistica}</p>}
            </div>
          </div>
          <div className="visita-docente-launch">
            <input
              type="text"
              className="mnemonic-input"
              placeholder='Nome mnemonico (es. "Fenice rossa")'
              value={mnemonici[v._id] || ''}
              onChange={e => onMnemonico(v._id, e.target.value)}
            />
            <button
              className="avvia-btn"
              disabled={!mnemonici[v._id]?.trim()}
              onClick={() => onAvvia(v, mnemonici[v._id].trim())}
            >
              Avvia visita →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemsGrid({ items }) {
  if (!items.length) return <p className="nav-empty">Nessun item disponibile.</p>;
  return (
    <div className="items-grid">
      {items.map(it => (
        <div key={it._id} className="nav-card">
          {it.image && <img src={it.image} alt={it.objectId} className="nav-card-img" />}
          <div className="nav-card-body">
            <h3 className="nav-card-title">{it.objectId || it._id}</h3>
            {it.metadata && Object.entries(it.metadata)
              .filter(([k]) => k !== 'prezzo')
              .map(([k, v]) => (
                <p key={k} className="nav-card-meta"><strong>{k}:</strong> {String(v)}</p>
              ))
            }
            {it.metadata?.prezzo != null && (
              <span className="price-pill" style={{ marginTop: '8px', display: 'inline-block' }}>
                {it.metadata.prezzo > 0 ? `€${it.metadata.prezzo}` : 'Gratuito'}
              </span>
            )}
            {Array.isArray(it.contents) && it.contents.map((c, i) => (
              <div key={i} className="content-block">
                {c.tipo === 'testo'    && <p>{c.valore}</p>}
                {c.tipo === 'immagine' && <img src={c.valore} alt="" />}
                {c.tipo === 'audio'    && <audio controls src={c.valore} />}
                {c.tipo === 'video'    && <video controls src={c.valore} style={{ width: '100%' }} />}
                {c.tipo === 'link'     && <a href={c.valore} target="_blank" rel="noreferrer">{c.valore}</a>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── App principale ─────────────────────────────────── */

function App() {
  const [role,      setRole]      = React.useState(null); // null | 'docente' | 'studente'
  const [lobby,     setLobby]     = React.useState(null); // { codice, visitaNome } | { codice, myName }
  const [musei,     setMusei]     = React.useState(null);
  const [museo,     setMuseo]     = React.useState(null);
  const [opere,     setOpere]     = React.useState([]);
  const [visite,    setVisite]    = React.useState([]);
  const [items,     setItems]     = React.useState([]);
  const [loading,   setLoading]   = React.useState(false);
  const [error,     setError]     = React.useState(null);
  const [tab,       setTab]       = React.useState('opere');
  const [mnemonici, setMnemonici] = React.useState({});

  const codiceIsil = new URLSearchParams(window.location.search).get('museo');

  React.useEffect(() => {
    if (codiceIsil) {
      setRole('docente');
      loadMuseo(codiceIsil);
    }
  }, []);

  function handleMnemonico(visitaId, value) {
    setMnemonici(prev => ({ ...prev, [visitaId]: value }));
  }

  function selectRole(r) {
    setRole(r);
    if (r === 'docente') loadMuseList();
  }

  function goToEntry() {
    const url = new URL(window.location.href);
    url.searchParams.delete('museo');
    window.history.pushState({}, '', url);
    setRole(null);
    setLobby(null);
    setMuseo(null);
    setMusei(null);
    setOpere([]);
    setVisite([]);
    setItems([]);
    setTab('opere');
    setMnemonici({});
    setError(null);
  }

  async function loadMuseList() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/musei');
      const data = await res.json();
      setMusei(data.data || []);
    } catch (_) {
      setError('Impossibile caricare la lista dei musei.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMuseo(isil) {
    setLoading(true);
    setError(null);
    try {
      const museoRes  = await fetch(`/api/musei/${isil}`);
      const museoData = await museoRes.json();
      if (!museoData.data) throw new Error('Museo non trovato.');
      const m = museoData.data;
      setMuseo(m);

      const [opereRes, visiteRes, itemsRes] = await Promise.all([
        fetch(`/api/opere?codiceIsil=${isil}`),
        fetch(`/api/visite?codiceIsil=${isil}`),
        fetch(`/api/items?museumId=${m._id}`),
      ]);
      setOpere( (await opereRes.json()).data  || []);
      setVisite((await visiteRes.json()).data || []);
      setItems( (await itemsRes.json()).data  || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function selectMuseo(isil) {
    const url = new URL(window.location.href);
    url.searchParams.set('museo', isil);
    window.history.pushState({}, '', url);
    loadMuseo(isil);
  }

  function goBack() {
    const url = new URL(window.location.href);
    url.searchParams.delete('museo');
    window.history.pushState({}, '', url);
    setMuseo(null);
    setOpere([]);
    setVisite([]);
    setItems([]);
    setTab('opere');
    setMnemonici({});
    loadMuseList();
  }

  async function handleAvviaVisita(visita, codice) {
    try {
      const res = await fetch('/api/sessioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codice, visitaId: visita._id, visitaNome: visita.nomeVisita, museoIsil: museo.codiceIsil }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Errore nella creazione della sessione.');
        return;
      }
      setLobby({ codice, visitaNome: visita.nomeVisita });
    } catch (_) {
      alert('Impossibile creare la sessione. Riprova.');
    }
  }

  /* ── Rendering ── */

  if (!role) return (
    <EntryScreen
      onDocente={() => selectRole('docente')}
      onStudente={() => selectRole('studente')}
    />
  );

  if (role === 'studente' && !lobby) return (
    <StudentScreen
      onBack={goToEntry}
      onJoined={(codice, nome) => setLobby({ codice, myName: nome })}
    />
  );

  if (role === 'studente' && lobby) return (
    <LobbyStudente
      codice={lobby.codice}
      nomeAssegnato={lobby.myName}
      onBack={() => setLobby(null)}
    />
  );

  if (role === 'docente' && lobby) return (
    <LobbyDocente
      codice={lobby.codice}
      visitaNome={lobby.visitaNome}
      onClose={() => setLobby(null)}
    />
  );

  if (loading) return (
    <div className="nav-loading">
      <div className="nav-spinner" />
      <p>Caricamento…</p>
    </div>
  );

  if (error) return (
    <div className="nav-error">
      <span className="nav-error-icon">⚠️</span>
      <p>{error}</p>
      <button onClick={goBack} className="nav-back-link">← Torna alla lista</button>
    </div>
  );

  /* Schermata selezione museo */
  if (!museo) return (
    <div className="museo-picker-root">
      <div className="nav-topbar nav-topbar--split">
        <button onClick={goToEntry} className="back-to-marketplace">← Indietro</button>
        <a href="/Editor-Marketplace/Frontend/dashboard.html" className="back-to-marketplace">
          ← Marketplace
        </a>
      </div>
      <header className="picker-header">
        <h1 className="picker-title">ArtAround<span className="picker-dot">.</span></h1>
        <p className="picker-subtitle">Scegli un museo per iniziare la visita</p>
      </header>
      <div className="picker-grid">
        {(musei || []).map(m => (
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
        {musei?.length === 0 && (
          <p className="nav-empty" style={{ gridColumn: '1/-1' }}>Nessun museo disponibile.</p>
        )}
      </div>
    </div>
  );

  /* Schermata dettaglio museo */
  const tabs = [
    { key: 'opere',  label: `Opere (${opere.length})`  },
    { key: 'visite', label: `Visite (${visite.length})` },
    { key: 'items',  label: `Items (${items.length})`   },
  ];

  return (
    <div className="navigator-root">
      <div className="museo-back-bar">
        <a href="/Editor-Marketplace/Frontend/dashboard.html" className="back-to-marketplace">
          ← Marketplace
        </a>
        <button onClick={goBack} className="back-btn">← Tutti i musei</button>
      </div>
      <MuseoHeader museo={museo} opereCount={opere.length} visiteCount={visite.length} itemsCount={items.length} />
      <div className="nav-tabs-bar">
        {tabs.map(t => (
          <button key={t.key} className={`nav-tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <main className="nav-main">
        {tab === 'opere'  && <OpereGrid opere={opere} />}
        {tab === 'visite' && (
          role === 'docente'
            ? <DocVisiteList
                visite={visite}
                museo={museo}
                mnemonici={mnemonici}
                onMnemonico={handleMnemonico}
                onAvvia={handleAvviaVisita}
              />
            : <VisiteList visite={visite} />
        )}
        {tab === 'items'  && <ItemsGrid items={items} />}
      </main>
    </div>
  );
}

/* ── Mount ──────────────────────────────────────────── */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
