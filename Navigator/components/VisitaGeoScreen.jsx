/* VisitaGeoScreen.jsx - VisitaGeoScreen */

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
