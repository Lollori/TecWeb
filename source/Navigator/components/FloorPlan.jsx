const AMENITY_ICONS = {
  scale:              { icon: 'fa-stairs',             label: 'Scale' },
  ascensore:          { icon: 'fa-arrows-up-down',     label: 'Ascensore' },
  bagno:              { icon: 'fa-restroom',           label: 'WC' },
  caffetteria:        { icon: 'fa-mug-saucer',         label: 'Caffetteria' },
  ingresso:           { icon: 'fa-door-open',          label: 'Ingresso' },
  U:                  { icon: 'fa-right-from-bracket', label: 'Uscita' },

  // Museo del Prado
  info_point:                    { icon: 'fa-circle-info',      label: 'Informazioni' },
  guardaroba:                    { icon: 'fa-shirt',            label: 'Guardaroba' },
  audio_guida:                   { icon: 'fa-headphones',       label: 'Audio guida' },
  auditorium:                    { icon: 'fa-clapperboard',     label: 'Auditorium' },
  conferenze:                    { icon: 'fa-chalkboard-user',  label: 'Sala per conferenze' },
  educazione:                    { icon: 'fa-graduation-cap',   label: 'Educazione' },
  scale_mobili:                  { icon: 'fa-angles-up',        label: 'Scale mobili' },
  bagno_disabili:                { icon: 'fa-wheelchair',       label: 'WC persone a mobilità ridotta' },
  bagno_donne:                   { icon: 'fa-person-dress',     label: 'Bagno donne' },
  bagno_uomini:                  { icon: 'fa-person',           label: 'Bagno uomini' },
  allattamento:                  { icon: 'fa-baby',             label: 'Sala per allattamento' },
  area_riposo:                   { icon: 'fa-couch',            label: 'Area di riposo' },
  bar:                           { icon: 'fa-mug-saucer',       label: 'Caffè' },
  negozio:                       { icon: 'fa-bag-shopping',     label: 'Negozio' },
  libreria:                      { icon: 'fa-book',             label: 'Libreria' },
  'armadietto farmaceutico':     { icon: 'fa-suitcase-medical', label: 'Armadietto farmaceutico' },
};


const TEMP_EXHIBIT_ID = 'mostre_temp';

function roomDisplayName(roomId) {
  return roomId === TEMP_EXHIBIT_ID ? 'Sale per Mostre temporanee' : `Sala ${roomId}`;
}

function ringCentroid(ring) {
  let sx = 0, sy = 0;
  ring.forEach(([x, y]) => { sx += x; sy += -y; });
  return { x: sx / ring.length, y: sy / ring.length };
}


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
      {}
      <div className="geo-floorplan-wrap">
        <img loading="lazy"
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
            {geoJson.features.map(f => {
              const roomId  = f.properties.room_id;
              const points  = f.geometry.coordinates[0].map(([x, y]) => `${x},${-y}`).join(' ');
              const amenity = AMENITY_ICONS[roomId];
              if (amenity) {
                return (
                  <polygon key={f.properties.fid} points={points} className="geo-amenity-polygon">
                    <title>{amenity.label}</title>
                  </polygon>
                );
              }
              return (
                <polygon
                  key={f.properties.fid}
                  points={points}
                  className={`geo-room-polygon${selectedRoom === roomId ? ' geo-room-polygon--active' : ''}`}
                  onClick={() => handleRoomClick(roomId)}
                />
              );
            })}
          </svg>
        )}

        {geoJson && geoJson.features.filter(f => AMENITY_ICONS[f.properties.room_id]).map(f => {
          const amenity  = AMENITY_ICONS[f.properties.room_id];
          const centroid = ringCentroid(f.geometry.coordinates[0]);
          const left = (centroid.x / (pianoItem?.imgWidth  || 437)) * 100;
          const top  = (centroid.y / (pianoItem?.imgHeight || 600)) * 100;
          return (
            <div
              key={f.properties.fid}
              className="geo-amenity-marker"
              style={{ left: `${left}%`, top: `${top}%` }}
              title={amenity.label}
            >
              <i className={`fa-solid ${amenity.icon}`} />
            </div>
          );
        })}

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

      {geoJson && (() => {
        const presentIds = [...new Set(geoJson.features.map(f => f.properties.room_id))]
          .filter(id => AMENITY_ICONS[id]);
        if (!presentIds.length) return null;
        return (
          <div className="geo-amenity-legend">
            {presentIds.map(id => (
              <span key={id} className="geo-amenity-legend-item">
                <span className="geo-amenity-legend-icon"><i className={`fa-solid ${AMENITY_ICONS[id].icon}`} /></span>
                {AMENITY_ICONS[id].label}
              </span>
            ))}
          </div>
        );
      })()}

      {}
      {selectedRoom && (
        <div className="geo-room-panel">
          <div className="geo-room-panel-header">
            <span className="geo-room-panel-title">{roomDisplayName(selectedRoom)}</span>
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
                  {o.immagine && <img loading="lazy" className="geo-opera-img" src={o.immagine} alt={o.operaId} />}
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


function VisitaItemRoomMap({ museumId, operaId, logisticsTarget = null }) {
  const [floorDef, setFloorDef] = React.useState(null);
  const [geoJson,  setGeoJson]  = React.useState(null);
  const [sala,     setSala]     = React.useState(null);
  const [loading,  setLoading]  = React.useState(false);

  React.useEffect(() => {
    if (!museumId) { setFloorDef(null); setGeoJson(null); setSala(null); return; }
    let cancelled = false;
    setLoading(true);
    setFloorDef(null);
    setGeoJson(null);
    setSala(null);
    (async () => {
      try {
        const [rMuseo, rOpere] = await Promise.all([
          fetch(`/api/musei/${encodeURIComponent(museumId)}`).then(r => r.json()),
          operaId
            ? fetch(`/api/opere?codiceIsil=${encodeURIComponent(museumId)}`).then(r => r.json())
            : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;

        const museo = rMuseo.ok ? applyFloorPlanOverrides(rMuseo.data) : null;
        if (!museo?.mappaInterna?.length) return;

        const op      = (rOpere.data || []).find(o => o.operaId === operaId);
        const salaVal = op?.sala ?? null;
        if (!cancelled) setSala(salaVal);

        if (logisticsTarget) {
          const piano = museo.mappaInterna.find(p => p.piano === logisticsTarget.piano) || museo.mappaInterna[0];
          if (!piano?.geoJsonUrl) return;
          const geo = await fetch(piano.geoJsonUrl).then(r => r.json());
          if (!cancelled) { setFloorDef(piano); setGeoJson(geo); }
          return;
        }


        let fallbackPiano = null, fallbackGeo = null;
        for (const piano of museo.mappaInterna) {
          if (!piano.geoJsonUrl) continue;
          try {
            const geo = await fetch(piano.geoJsonUrl).then(r => r.json());
            if (!fallbackPiano) { fallbackPiano = piano; fallbackGeo = geo; }
            if (salaVal != null) {
              const found = (geo.features || []).some(f => f.properties?.room_id === String(salaVal));
              if (found) {
                if (!cancelled) { setFloorDef(piano); setGeoJson(geo); }
                return;
              }
            }
          } catch (_) {}
        }
        if (!cancelled && fallbackPiano) { setFloorDef(fallbackPiano); setGeoJson(fallbackGeo); }
      } catch (_) {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [museumId, operaId, logisticsTarget]);

  const targetRoomId = logisticsTarget?.roomId ?? (sala != null ? String(sala) : null);

  if (loading) return (
    <div className="visita-item-map" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '24px' }}>
      <div className="nav-spinner" style={{ width: '20px', height: '20px' }} />
      <span style={{ fontSize: '0.85rem', color: 'var(--nav-muted)' }}>Caricamento mappa…</span>
    </div>
  );

  if (!floorDef || !geoJson) return (
    <p style={{ textAlign: 'center', color: 'var(--nav-muted)', fontSize: '0.85rem', padding: '20px 0' }}>
      <i className="fa-solid fa-map-location-dot" style={{ marginRight: '6px', opacity: 0.4 }} />
      Planimetria non disponibile per questo museo.
    </p>
  );

  const viewBox = `0 0 ${floorDef.imgWidth || 437} ${floorDef.imgHeight || 600}`;
  const legendIds = [...new Set(geoJson.features.map(f => f.properties.room_id))]
    .filter(id => AMENITY_ICONS[id]);

  return (
    <div className="visita-item-map">
      <p className="visita-item-map-title">
        <i className="fa-solid fa-map-location-dot" style={{ marginRight: '6px' }} />
        {logisticsTarget
          ? <>Stai cercando: {AMENITY_ICONS[logisticsTarget.roomId]?.label || 'Punto di interesse'}</>
          : sala != null
            ? <>Ti trovi in: {roomDisplayName(String(sala))}</>
            : <>Planimetria museo</>}
      </p>
      <div className="geo-floorplan-wrap">
        <img loading="lazy" className="geo-floorplan-img" src={floorDef.url} alt={floorDef.piano || 'Planimetria'} />
        <svg
          className="geo-room-overlay"
          viewBox={viewBox}
          preserveAspectRatio="none"
          style={{ pointerEvents: 'none' }}
        >
          {geoJson.features.map(f => {
            const roomId = f.properties.room_id;
            const points = f.geometry.coordinates[0].map(([x, y]) => `${x},${-y}`).join(' ');
            const isTarget = targetRoomId != null && roomId === targetRoomId;
            if (AMENITY_ICONS[roomId]) {
              return (
                <polygon
                  key={f.properties.fid}
                  points={points}
                  className={`geo-amenity-polygon${isTarget ? ' geo-amenity-polygon--target' : ''}`}
                />
              );
            }
            return (
              <polygon
                key={f.properties.fid}
                points={points}
                className={`geo-room-polygon geo-room-polygon--static${isTarget ? ' geo-room-polygon--target' : ''}`}
              />
            );
          })}
        </svg>
        {geoJson.features.filter(f => AMENITY_ICONS[f.properties.room_id]).map(f => {
          const amenity  = AMENITY_ICONS[f.properties.room_id];
          const isTarget = targetRoomId != null && f.properties.room_id === targetRoomId;
          const centroid = ringCentroid(f.geometry.coordinates[0]);
          const left = (centroid.x / (floorDef.imgWidth  || 437)) * 100;
          const top  = (centroid.y / (floorDef.imgHeight || 600)) * 100;
          return (
            <div
              key={f.properties.fid}
              className={`geo-amenity-marker${isTarget ? ' geo-amenity-marker--target' : ''}`}
              style={{ left: `${left}%`, top: `${top}%` }}
              title={amenity.label}
            >
              <i className={`fa-solid ${amenity.icon}`} />
            </div>
          );
        })}
      </div>
      {legendIds.length > 0 && (
        <div className="geo-amenity-legend">
          {legendIds.map(id => (
            <span key={id} className="geo-amenity-legend-item">
              <span className="geo-amenity-legend-icon"><i className={`fa-solid ${AMENITY_ICONS[id].icon}`} /></span>
              {AMENITY_ICONS[id].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
