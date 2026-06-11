/* ── Floor-plan overrides ────────────────────────────────
   Client-side fallback so the GeoJSON overlay works even if
   the MongoDB database has not been re-seeded after adding
   geoJsonUrl / imgWidth / imgHeight to musei.json.
───────────────────────────────────────────────────────── */
const FLOOR_PLAN_OVERRIDES = {
  'IT-FI0082': {
    'Planimetria': {
      url:        '/data/maps/uffizi/piantina_uffizi.png',
      geoJsonUrl: '/data/maps/uffizi/P2uffizi.geojson',
      imgWidth:   437,
      imgHeight:  600
    }
  }
};

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
        onJoined(trimmed, data.nome, data.museoIsil);
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

function LobbyStudente({ codice, nomeAssegnato, museoIsil: initialMuseoIsil, onBack }) {
  const [studenti,   setStudenti]   = React.useState([]);
  const [stato,      setStato]      = React.useState('attesa');
  const [museoIsil,  setMuseoIsil]  = React.useState(initialMuseoIsil || null);

  React.useEffect(() => {
    const es = new EventSource(`/api/sessioni/${encodeURIComponent(codice)}/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'stato-iniziale') {
        setStudenti(data.studenti);
        setStato(data.stato);
        if (data.museoIsil) setMuseoIsil(data.museoIsil);
      } else if (data.tipo === 'studente-connesso') {
        setStudenti(data.studenti);
      } else if (data.tipo === 'visita-iniziata') {
        setStato('iniziata');
        if (data.museoIsil) setMuseoIsil(data.museoIsil);
      }
    };
    return () => es.close();
  }, [codice]);

  if (stato === 'iniziata') return (
    <VisitaGeoScreen
      nomeAssegnato={nomeAssegnato}
      museoIsil={museoIsil}
      onBack={onBack}
    />
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

/* ── VisitaGeoScreen ─────────────────────────────────────── */

function VisitaGeoScreen({ nomeAssegnato, museoIsil, onBack }) {
  const [museo,       setMuseo]       = React.useState(null);
  const [pos,         setPos]         = React.useState(null);
  const [geoError,    setGeoError]    = React.useState(null);
  const [geoReady,    setGeoReady]    = React.useState(false);
  const [pianoIdx,    setPianoIdx]    = React.useState(0);
  const [salaCorr,    setSalaCorr]    = React.useState(null);
  const [dentroMuseo, setDentroMuseo] = React.useState(null);

  React.useEffect(() => {
    if (!museoIsil) return;
    fetch(`/api/musei/${encodeURIComponent(museoIsil)}`)
      .then(r => r.json())
      .then(d => setMuseo(applyFloorPlanOverrides(d.data || null)))
      .catch(() => {});
  }, [museoIsil]);

  React.useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalizzazione non supportata dal dispositivo.');
      setGeoReady(true);
      return;
    }
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPos({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });
        setGeoReady(true);
        setGeoError(null);
      },
      (err) => {
        setGeoReady(true);
        if (err.code === 1)      setGeoError('Permesso di posizione negato. Abilitalo nelle impostazioni del browser.');
        else if (err.code === 2) setGeoError('Segnale GPS non disponibile.');
        else                     setGeoError('Errore GPS. Riprova.');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  React.useEffect(() => {
    if (!museo || !pos) { setDentroMuseo(null); setSalaCorr(null); return; }
    const b = museo.gpsBounds;
    if (!b) return;
    const inside = pos.lat >= b.latMin && pos.lat <= b.latMax &&
                   pos.lng >= b.lngMin && pos.lng <= b.lngMax;
    setDentroMuseo(inside);
    if (!inside) { setSalaCorr(null); return; }
    const found = (museo.sale || []).find(s =>
      pos.lat >= s.latMin && pos.lat <= s.latMax &&
      pos.lng >= s.lngMin && pos.lng <= s.lngMax
    );
    setSalaCorr(found ? found.nome : null);
    if (found?.piano) {
      const idx = (museo.mappaInterna || []).findIndex(p => p.piano === found.piano);
      if (idx >= 0) setPianoIdx(idx);
    }
  }, [pos, museo]);

  function dotPos() {
    if (!pos || !museo || dentroMuseo !== true) return null;
    const piano = (museo.mappaInterna || [])[pianoIdx];
    if (!piano?.gpsBounds) return null;
    const { latMin, latMax, lngMin, lngMax } = piano.gpsBounds;
    const x = (pos.lng - lngMin) / (lngMax - lngMin) * 100;
    const y = (latMax - pos.lat) / (latMax - latMin) * 100;
    return { x: Math.max(3, Math.min(97, x)), y: Math.max(3, Math.min(97, y)) };
  }

  const dot       = dotPos();
  const pianoList = museo?.mappaInterna || [];
  const pianoItem = pianoList[pianoIdx];

  return (
    <div className="visita-geo-root">
      <div className="geo-header">
        <div className="geo-header-left">
          <p className="geo-eyebrow">Visita in corso</p>
          <h2 className="geo-museo-nome">{museo?.nome || museoIsil || 'Museo'}</h2>
        </div>
        <div className="geo-you-chip">
          <span className="geo-dot-mini" />
          <span>{nomeAssegnato}</span>
        </div>
      </div>

      <div className={`geo-status-bar${dentroMuseo === true ? ' geo-status-bar--inside' : ''}`}>
        {!geoReady && !geoError && (
          <><div className="geo-spin-sm" /><span>Ricerca posizione GPS…</span></>
        )}
        {geoError && <span className="geo-status-error">⚠ {geoError}</span>}
        {geoReady && !geoError && (
          <>
            {dentroMuseo === null  && <span>{!museo ? 'Caricamento dati museo…' : 'Posizione in aggiornamento…'}</span>}
            {dentroMuseo === false && <span>📍 Sei fuori dal museo</span>}
            {dentroMuseo === true  && !salaCorr && <span>📍 All'interno del museo</span>}
            {dentroMuseo === true  && salaCorr  && <span>📍 Sei in: <strong>{salaCorr}</strong></span>}
          </>
        )}
        {pos && <span className="geo-accuracy-pill">±{Math.round(pos.accuracy)}m</span>}
      </div>

      {pianoList.length > 0 ? (
        <div className="geo-map-section">
          {pianoList.length > 1 && (
            <div className="geo-piano-tabs">
              {pianoList.map((p, i) => (
                <button
                  key={i}
                  className={`piano-tab-btn${pianoIdx === i ? ' active' : ''}`}
                  onClick={() => setPianoIdx(i)}
                >{p.piano}</button>
              ))}
            </div>
          )}

          <RoomFloorPlan
            pianoItem={pianoItem}
            museoIsil={museoIsil}
            dot={dot}
          />

          {pos && (
            <p className="geo-coords-hint">
              {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} · ±{Math.round(pos.accuracy)}m
            </p>
          )}
        </div>
      ) : (
        <div className="geo-map-empty">
          {!museo && museoIsil
            ? <><div className="nav-spinner" /><p>Caricamento planimetria…</p></>
            : <p>Nessuna planimetria disponibile per questo museo.</p>
          }
        </div>
      )}

      <button className="geo-exit-btn" onClick={onBack}>← Esci dalla visita</button>
    </div>
  );
}

/* ── RoomFloorPlan ───────────────────────────────────────
   Renders a floor-plan image with an interactive GeoJSON
   polygon overlay. Clicking a room fetches and shows the
   artworks in that room via a fixed bottom panel.
───────────────────────────────────────────────────────── */
function RoomFloorPlan({ pianoItem, museoIsil, dot }) {
  const [geoJson,      setGeoJson]      = React.useState(null);
  const [selectedRoom, setSelectedRoom] = React.useState(null);
  const [roomOpere,    setRoomOpere]    = React.useState(null);
  const [loadingOpere, setLoadingOpere] = React.useState(false);

  React.useEffect(() => {
    setGeoJson(null);
    setSelectedRoom(null);
    setRoomOpere(null);
    if (!pianoItem?.geoJsonUrl) return;
    fetch(pianoItem.geoJsonUrl)
      .then(r => r.json())
      .then(d => setGeoJson(d))
      .catch(() => {});
  }, [pianoItem?.geoJsonUrl]);

  async function handleRoomClick(roomId) {
    if (selectedRoom === roomId) { setSelectedRoom(null); setRoomOpere(null); return; }
    setSelectedRoom(roomId);
    setLoadingOpere(true);
    setRoomOpere(null);
    try {
      const res  = await fetch(`/api/opere?codiceIsil=${encodeURIComponent(museoIsil)}&sala=${encodeURIComponent(roomId)}`);
      const data = await res.json();
      const all  = data.data || [];
      setRoomOpere(all.filter(o => o.sala === roomId));
    } catch (_) {
      setRoomOpere([]);
    } finally {
      setLoadingOpere(false);
    }
  }

  const viewBox = `0 0 ${pianoItem?.imgWidth || 437} ${pianoItem?.imgHeight || 600}`;

  return (
    <>
      {/* The wrapper sizes itself around the image so the SVG overlay aligns perfectly */}
      <div className="geo-floorplan-wrap">
        <img
          className="geo-floorplan-img"
          src={pianoItem?.url}
          alt={pianoItem?.piano || 'Planimetria'}
        />

        {geoJson && (
          <svg
            className="geo-room-overlay"
            viewBox={viewBox}
            preserveAspectRatio="none"
            style={{ pointerEvents: 'all' }}
          >
            {geoJson.features.map(f => (
              <polygon
                key={f.properties.fid}
                points={f.geometry.coordinates[0].map(([x, y]) => `${x},${-y}`).join(' ')}
                className={`geo-room-polygon${selectedRoom === f.properties.room_id ? ' geo-room-polygon--active' : ''}`}
                onClick={() => handleRoomClick(f.properties.room_id)}
              />
            ))}
          </svg>
        )}

        {dot && (
          <div
            className="geo-user-dot"
            style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
          />
        )}
      </div>

      {geoJson && !selectedRoom && (
        <p className="geo-map-hint">Tocca una stanza per vedere le opere</p>
      )}

      {/* Fixed bottom panel — always visible regardless of scroll position */}
      {selectedRoom && (
        <div className="geo-room-panel">
          <div className="geo-room-panel-header">
            <span className="geo-room-panel-title">Sala {selectedRoom}</span>
            <button
              className="geo-room-panel-close"
              onClick={() => { setSelectedRoom(null); setRoomOpere(null); }}
            >✕</button>
          </div>
          {loadingOpere && (
            <div className="geo-room-loading"><div className="geo-spin-sm" /><span>Caricamento opere…</span></div>
          )}
          {roomOpere && roomOpere.length === 0 && (
            <p className="geo-room-empty">Nessuna opera disponibile per questa sala.</p>
          )}
          {roomOpere && roomOpere.length > 0 && (
            <div className="geo-opera-list">
              {roomOpere.map(o => (
                <div key={o._id} className="geo-opera-card">
                  {o.immagine && <img className="geo-opera-img" src={o.immagine} alt={o.operaId} />}
                  <div className="geo-opera-body">
                    <p className="geo-opera-title">{o.operaId}</p>
                    {o.autore && <p className="geo-opera-meta">{o.autore}{o.datazione ? ` · ${o.datazione}` : ''}</p>}
                    {o.tipo && <p className="geo-opera-tipo">{o.tipo}</p>}
                    {o.descrizione && <p className="geo-opera-desc">{o.descrizione}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
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
          <RoomFloorPlan
            pianoItem={museo.mappaInterna[pianoIdx]}
            museoIsil={museo.codiceIsil}
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

  const userId   = localStorage.getItem('userId')   || '';
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
      if (userId) {
        params.set('autoreId', userId);
        try {
          const p = JSON.parse(localStorage.getItem(`purchases_${userId}`) || '{"visite":[]}');
          if (p.visite?.length) params.set('ids', p.visite.join(','));
        } catch (_) {}
      }
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
      onJoined={(codice, nome, museoIsil) => { setLobby({ codice, myName: nome, museoIsil }); setScreen('lobby-studente'); }}
    />
  );

  if (screen === 'lobby-studente') return (
    <LobbyStudente
      codice={lobby.codice}
      nomeAssegnato={lobby.myName}
      museoIsil={lobby.museoIsil}
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
