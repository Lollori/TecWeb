function VisitaGeoScreen({
  nomeAssegnato,
  museoIsil,
  onBack
}) {
  const [museo, setMuseo] = React.useState(null);
  const [pos, setPos] = React.useState(null);
  const [geoError, setGeoError] = React.useState(null);
  const [geoReady, setGeoReady] = React.useState(false);
  const [pianoIdx, setPianoIdx] = React.useState(0);
  const [salaCorr, setSalaCorr] = React.useState(null);
  const [dentroMuseo, setDentroMuseo] = React.useState(null);
  React.useEffect(() => {
    if (!museoIsil) return;
    fetch(`/api/musei/${encodeURIComponent(museoIsil)}`).then(r => r.json()).then(d => setMuseo(applyFloorPlanOverrides(d.data || null))).catch(() => {});
  }, [museoIsil]);
  React.useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalizzazione non supportata dal dispositivo.');
      setGeoReady(true);
      return;
    }
    const id = navigator.geolocation.watchPosition(({
      coords
    }) => {
      setPos({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy
      });
      setGeoReady(true);
      setGeoError(null);
    }, err => {
      setGeoReady(true);
      if (err.code === 1) setGeoError('Permesso di posizione negato. Abilitalo nelle impostazioni del browser.');else if (err.code === 2) setGeoError('Segnale GPS non disponibile.');else setGeoError('Errore GPS. Riprova.');
    }, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000
    });
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  React.useEffect(() => {
    if (!museo || !pos) {
      setDentroMuseo(null);
      setSalaCorr(null);
      return;
    }
    const b = museo.gpsBounds;
    if (!b) return;
    const inside = pos.lat >= b.latMin && pos.lat <= b.latMax && pos.lng >= b.lngMin && pos.lng <= b.lngMax;
    setDentroMuseo(inside);
    if (!inside) {
      setSalaCorr(null);
      return;
    }
    const found = (museo.sale || []).find(s => pos.lat >= s.latMin && pos.lat <= s.latMax && pos.lng >= s.lngMin && pos.lng <= s.lngMax);
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
    const {
      latMin,
      latMax,
      lngMin,
      lngMax
    } = piano.gpsBounds;
    const x = (pos.lng - lngMin) / (lngMax - lngMin) * 100;
    const y = (latMax - pos.lat) / (latMax - latMin) * 100;
    return {
      x: Math.max(3, Math.min(97, x)),
      y: Math.max(3, Math.min(97, y))
    };
  }
  const dot = dotPos();
  const pianoList = museo?.mappaInterna || [];
  const pianoItem = pianoList[pianoIdx];
  return /*#__PURE__*/React.createElement("div", {
    className: "visita-geo-root"
  }, /*#__PURE__*/React.createElement("div", {
    className: "geo-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "geo-header-left"
  }, /*#__PURE__*/React.createElement("p", {
    className: "geo-eyebrow"
  }, "Visita in corso"), /*#__PURE__*/React.createElement("h2", {
    className: "geo-museo-nome"
  }, museo?.nome || museoIsil || 'Museo')), /*#__PURE__*/React.createElement("div", {
    className: "geo-you-chip"
  }, /*#__PURE__*/React.createElement("span", {
    className: "geo-dot-mini"
  }), /*#__PURE__*/React.createElement("span", null, nomeAssegnato))), /*#__PURE__*/React.createElement("div", {
    className: `geo-status-bar${dentroMuseo === true ? ' geo-status-bar--inside' : ''}`
  }, !geoReady && !geoError && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "geo-spin-sm"
  }), /*#__PURE__*/React.createElement("span", null, "Ricerca posizione GPS…")), geoError && /*#__PURE__*/React.createElement("span", {
    className: "geo-status-error"
  }, "⚠ ", geoError), geoReady && !geoError && /*#__PURE__*/React.createElement(React.Fragment, null, dentroMuseo === null && /*#__PURE__*/React.createElement("span", null, !museo ? 'Caricamento dati museo…' : 'Posizione in aggiornamento…'), dentroMuseo === false && /*#__PURE__*/React.createElement("span", null, "📍 Sei fuori dal museo"), dentroMuseo === true && !salaCorr && /*#__PURE__*/React.createElement("span", null, "📍 All'interno del museo"), dentroMuseo === true && salaCorr && /*#__PURE__*/React.createElement("span", null, "📍 Sei in: ", /*#__PURE__*/React.createElement("strong", null, salaCorr))), pos && /*#__PURE__*/React.createElement("span", {
    className: "geo-accuracy-pill"
  }, "±", Math.round(pos.accuracy), "m")), pianoList.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "geo-map-section"
  }, pianoList.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "geo-piano-tabs"
  }, pianoList.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: `piano-tab-btn${pianoIdx === i ? ' active' : ''}`,
    onClick: () => setPianoIdx(i)
  }, p.piano))), /*#__PURE__*/React.createElement(RoomFloorPlan, {
    pianoItem: pianoItem,
    museoIsil: museoIsil,
    dot: dot
  }), pos && /*#__PURE__*/React.createElement("p", {
    className: "geo-coords-hint"
  }, pos.lat.toFixed(5), ", ", pos.lng.toFixed(5), " · ±", Math.round(pos.accuracy), "m")) : /*#__PURE__*/React.createElement("div", {
    className: "geo-map-empty"
  }, !museo && museoIsil ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "nav-spinner"
  }), /*#__PURE__*/React.createElement("p", null, "Caricamento planimetria…")) : /*#__PURE__*/React.createElement("p", null, "Nessuna planimetria disponibile per questo museo.")), /*#__PURE__*/React.createElement("button", {
    className: "geo-exit-btn",
    onClick: onBack
  }, "← Esci dalla visita"));
}