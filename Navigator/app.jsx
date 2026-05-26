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
  const [musei,   setMusei]   = React.useState(null);
  const [museo,   setMuseo]   = React.useState(null);
  const [opere,   setOpere]   = React.useState([]);
  const [visite,  setVisite]  = React.useState([]);
  const [items,   setItems]   = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error,   setError]   = React.useState(null);
  const [tab,     setTab]     = React.useState('opere');

  const codiceIsil = new URLSearchParams(window.location.search).get('museo');

  React.useEffect(() => {
    if (codiceIsil) {
      loadMuseo(codiceIsil);
    } else {
      loadMuseList();
    }
  }, []);

  async function loadMuseList() {
    try {
      const res  = await fetch('/api/musei');
      const data = await res.json();
      setMusei(data.data || []);
    } catch (e) {
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
    loadMuseList();
  }

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
      <header className="picker-header">
        <h1 className="picker-title">ArtAround<span className="picker-dot">.</span></h1>
        <p className="picker-subtitle">Scegli un museo per iniziare la tua visita</p>
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
    { key: 'opere',  label: `Opere (${opere.length})`   },
    { key: 'visite', label: `Visite (${visite.length})`  },
    { key: 'items',  label: `Items (${items.length})`    },
  ];

  return (
    <div className="navigator-root">
      <div className="museo-back-bar">
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
        {tab === 'opere'  && <OpereGrid  opere={opere}   />}
        {tab === 'visite' && <VisiteList visite={visite} />}
        {tab === 'items'  && <ItemsGrid  items={items}   />}
      </main>
    </div>
  );
}

/* ── Mount ──────────────────────────────────────────── */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
