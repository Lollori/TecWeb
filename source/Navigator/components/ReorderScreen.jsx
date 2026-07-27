function MarketplaceScreen() {
  return (
    <iframe
      src="/Editor-Marketplace/dashboard.html?embed=marketplace"
      style={{ flex: 1, minHeight: 0, width: '100%', border: 'none', display: 'block' }}
      title="Marketplace"
    />
  );
}


function ReorderScreen({ visita, onBack, onConfirm }) {

  const [groups,  setGroups]  = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [dragOver, setDragOver] = React.useState(null);
  const dragSrcRef = React.useRef(null);

  const [operaSalaMap, setOperaSalaMap] = React.useState({});
  const [museo,        setMuseo]        = React.useState(null);
  const [floors,       setFloors]       = React.useState([]);
  const [activeFloorIdx, setActiveFloorIdx] = React.useState(0);
  const floorInitRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = visita.itemIds || [];
      if (!ids.length) { if (!cancelled) { setGroups([]); setLoading(false); } return; }
      try {
        const loaded = await Promise.all(ids.map(async id => {
          try {
            const r = await fetch(`/api/items/${encodeURIComponent(id)}`);
            const d = await r.json();
            const isIndipendente = d.data?.contentType === 'indipendente';
            return {
              _id: id,
              operaId: isIndipendente ? '' : (d.data?.operaId || id),
              groupKey: isIndipendente ? `__indip_${id}` : (d.data?.operaId || id),
              label: isIndipendente ? (d.data?.topic || 'Contenuto indipendente') : (d.data?.operaId || id),
            };
          } catch (_) { return { _id: id, operaId: id, groupKey: id, label: id }; }
        }));
        if (cancelled) return;

        const map = new Map();
        for (const it of loaded) {
          if (!map.has(it.groupKey)) map.set(it.groupKey, { operaId: it.operaId, label: it.label, itemIds: [] });
          map.get(it.groupKey).itemIds.push(it._id);
        }
        setGroups([...map.entries()].map(([groupKey, g]) => ({ groupKey, operaId: g.operaId, label: g.label, itemIds: g.itemIds })));
      } catch (_) {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [visita._id]);


  React.useEffect(() => {
    let cancelled = false;
    const isil = visita.codiceIsil;
    if (!isil) { setOperaSalaMap({}); setMuseo(null); return; }
    (async () => {
      try {
        const [rMuseo, rOpere] = await Promise.all([
          fetch(`/api/musei/${encodeURIComponent(isil)}`).then(r => r.json()),
          fetch(`/api/opere?codiceIsil=${encodeURIComponent(isil)}`).then(r => r.json()),
        ]);
        if (cancelled) return;
        const salaMap = {};
        (rOpere.ok ? rOpere.data : []).forEach(o => { if (o.sala) salaMap[o.operaId] = o.sala; });
        setOperaSalaMap(salaMap);
        setMuseo(rMuseo.ok ? applyFloorPlanOverrides(rMuseo.data) : null);
      } catch (_) {
        if (!cancelled) { setOperaSalaMap({}); setMuseo(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [visita.codiceIsil]);


  React.useEffect(() => {
    let cancelled = false;
    const piani = museo?.mappaInterna || [];
    if (!piani.length) { setFloors([]); return; }
    Promise.all(piani.map(async p => {
      if (!p.geoJsonUrl) return { ...p, geoJson: null };
      try {
        const geo = await fetch(p.geoJsonUrl).then(r => r.json());
        return { ...p, geoJson: geo };
      } catch (_) { return { ...p, geoJson: null }; }
    })).then(results => { if (!cancelled) setFloors(results); });
    return () => { cancelled = true; };
  }, [museo]);


  React.useEffect(() => {
    if (floorInitRef.current) return;
    if (!floors.length || !groups.length) return;
    floorInitRef.current = true;
    let bestIdx = 0, bestCount = -1;
    floors.forEach((f, idx) => {
      if (!f.geoJson) return;
      const roomIds = new Set((f.geoJson.features || []).map(x => String(x.properties?.room_id)));
      const count = groups.filter(g =>
        operaSalaMap[g.operaId] != null && roomIds.has(String(operaSalaMap[g.operaId]))
      ).length;
      if (count > bestCount) { bestCount = count; bestIdx = idx; }
    });
    setActiveFloorIdx(bestIdx);
  }, [floors, groups, operaSalaMap]);


  function stopsForRoom(roomId) {
    return groups
      .map((g, idx) => ({ g, idx }))
      .filter(({ g }) => operaSalaMap[g.operaId] != null && String(operaSalaMap[g.operaId]) === String(roomId));
  }

  function moveUp(idx) {
    if (idx === 0) return;
    setGroups(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx) {
    setGroups(prev => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function handleDragStart(e, idx) {
    dragSrcRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => e.target.style.opacity = '0.45', 0);
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    setDragOver(idx);
    const src = dragSrcRef.current;
    if (src === null || src === idx) return;
    setGroups(prev => {
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    dragSrcRef.current = idx;
  }

  function handleDragEnd(e) {
    e.target.style.opacity = '1';
    dragSrcRef.current = null;
    setDragOver(null);
  }

  const cardStyle = (idx) => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px',
    background: dragOver === idx ? 'rgba(255,0,127,0.08)' : 'var(--nav-card-bg)',
    border: `1.5px solid ${dragOver === idx ? 'var(--nav-magenta,#FF007F)' : 'var(--nav-border)'}`,
    borderRadius: '12px',
    cursor: 'grab',
    transition: 'border-color .15s, background .15s',
    userSelect: 'none',
  });

  const arrowBtnStyle = (disabled) => ({
    background: 'none',
    border: '1px solid var(--nav-border)',
    borderRadius: '6px', padding: '4px 9px',
    cursor: disabled ? 'default' : 'pointer',
    color: 'var(--nav-text)',
    opacity: disabled ? 0.3 : 1,
    fontSize: '0.75rem', lineHeight: 1,
  });

  const floorsWithGeo = floors.filter(f => f.geoJson);
  const activeFloor = floors[activeFloorIdx];

  return (
    <div className="lobby-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div className="lobby-back-bar">
        <button className="museo-detail-back" onClick={onBack}>
          <i className="fa-solid fa-arrow-left" /> Indietro
        </button>
      </div>

      <div className="lobby-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header className="lobby-header">
          <p className="lobby-label">Ordina le opere</p>
          <h1 className="lobby-title">{visita.nomeVisita}</h1>
          <p style={{ color: 'var(--nav-muted)', fontSize: '0.88rem', marginTop: '8px' }}>
            <i className="fa-solid fa-grip-vertical" style={{ marginRight: '6px' }} />
            Trascina le card o usa ↑↓ per definire l'ordine della visita.
          </p>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div className="nav-spinner" />
            <p style={{ marginTop: '12px', color: 'var(--nav-muted)' }}>Caricamento opere…</p>
          </div>
        ) : groups.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--nav-muted)', padding: '40px 16px' }}>
            Questa visita non ha opere associate.
          </p>
        ) : (
          <>
            {floorsWithGeo.length > 0 && (
              <div className="reorder-map">
                <p className="reorder-map-title">
                  <i className="fa-solid fa-map-location-dot" style={{ marginRight: '6px' }} />
                  Planimetria del museo
                </p>
                {floorsWithGeo.length > 1 && (
                  <div className="reorder-floor-tabs">
                    {floors.map((f, idx) => f.geoJson && (
                      <button
                        key={idx}
                        type="button"
                        className={`reorder-floor-tab${activeFloorIdx === idx ? ' reorder-floor-tab--active' : ''}`}
                        onClick={() => setActiveFloorIdx(idx)}
                      >
                        {f.piano}
                      </button>
                    ))}
                  </div>
                )}
                {activeFloor && activeFloor.geoJson ? (
                  <div className="geo-floorplan-wrap">
                    <img
                      loading="lazy"
                      className="geo-floorplan-img"
                      src={activeFloor.url}
                      alt={activeFloor.piano || 'Planimetria'}
                    />
                    <svg
                      className="geo-room-overlay"
                      viewBox={`0 0 ${activeFloor.imgWidth || 437} ${activeFloor.imgHeight || 600}`}
                      preserveAspectRatio="none"
                      style={{ pointerEvents: 'none' }}
                    >
                      {activeFloor.geoJson.features.map(f => {
                        const roomId = f.properties.room_id;
                        const points = f.geometry.coordinates[0].map(([x, y]) => `${x},${-y}`).join(' ');
                        const isStop = stopsForRoom(roomId).length > 0;
                        return (
                          <polygon
                            key={f.properties.fid}
                            points={points}
                            className={`geo-room-polygon geo-room-polygon--static${isStop ? ' geo-room-polygon--stop' : ''}`}
                          />
                        );
                      })}
                    </svg>
                    {activeFloor.geoJson.features.map(f => {
                      const roomId = f.properties.room_id;
                      const stops = stopsForRoom(roomId);
                      if (!stops.length) return null;
                      const centroid = ringCentroid(f.geometry.coordinates[0]);
                      const left = (centroid.x / (activeFloor.imgWidth  || 437)) * 100;
                      const top  = (centroid.y / (activeFloor.imgHeight || 600)) * 100;
                      return (
                        <div
                          key={f.properties.fid}
                          className="geo-stop-marker"
                          style={{ left: `${left}%`, top: `${top}%` }}
                          title={stops.map(s => `${s.idx + 1}. ${s.g.label}`).join(', ')}
                        >
                          {stops.map(s => s.idx + 1).join(',')}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--nav-muted)', fontSize: '0.85rem', padding: '16px 0', margin: 0 }}>
                    Planimetria non disponibile per questo piano.
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px', width: '100%', margin: '0 auto', padding: '0 16px 8px' }}>
              {groups.map((group, idx) => (
                <div
                  key={group.groupKey}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => e.preventDefault()}
                  onDragEnd={handleDragEnd}
                  style={cardStyle(idx)}
                >
                  <i className="fa-solid fa-grip-vertical" style={{ color: 'var(--nav-muted)', flexShrink: 0 }} />
                  <span style={{
                    minWidth: '26px', height: '26px', borderRadius: '50%',
                    background: 'var(--magenta,#FF007F)', color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.73rem', fontWeight: '700', flexShrink: 0,
                  }}>{idx + 1}</span>
                  <span style={{ flex: 1, fontWeight: '600', fontSize: '0.92rem', minWidth: 0, overflowWrap: 'anywhere' }}>
                    {group.label}
                    {operaSalaMap[group.operaId] != null && (
                      <span style={{ marginLeft: '8px', fontWeight: 500, fontSize: '0.76rem', color: 'var(--nav-muted)' }}>
                        · Sala {operaSalaMap[group.operaId]}
                      </span>
                    )}
                  </span>
                  {group.itemIds.length > 1 && (
                    <span style={{
                      fontSize: '0.75rem', color: 'var(--nav-muted)',
                      background: 'rgba(255,0,127,0.1)', borderRadius: '20px',
                      padding: '2px 8px', flexShrink: 0,
                    }}>
                      {group.itemIds.length} items
                    </span>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
                    <button onClick={() => moveUp(idx)}   disabled={idx === 0}                style={arrowBtnStyle(idx === 0)}>↑</button>
                    <button onClick={() => moveDown(idx)} disabled={idx === groups.length - 1} style={arrowBtnStyle(idx === groups.length - 1)}>↓</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ textAlign: 'center', padding: '24px 16px 40px', marginTop: 'auto' }}>
          <button
            className="inizia-btn"
            onClick={() => onConfirm(groups.map(({ operaId, itemIds }) => ({ operaId, itemIds })))}
            disabled={loading}
          >
            Avanti — Apri la lobby →
          </button>
        </div>
      </div>
    </div>
  );
}
