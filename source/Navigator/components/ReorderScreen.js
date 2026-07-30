function MarketplaceScreen() {
  return /*#__PURE__*/React.createElement("iframe", {
    src: "/Editor-Marketplace/dashboard.html?embed=marketplace",
    style: {
      flex: 1,
      minHeight: 0,
      width: '100%',
      border: 'none',
      display: 'block'
    },
    title: "Marketplace"
  });
}
function ReorderScreen({
  visita,
  onBack,
  onConfirm
}) {
  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [dragOver, setDragOver] = React.useState(null);
  const dragSrcRef = React.useRef(null);
  const [isTouchDevice] = React.useState(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
  const [operaSalaMap, setOperaSalaMap] = React.useState({});
  const [museo, setMuseo] = React.useState(null);
  const [floors, setFloors] = React.useState([]);
  const [activeFloorIdx, setActiveFloorIdx] = React.useState(0);
  const floorInitRef = React.useRef(false);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = visita.itemIds || [];
      if (!ids.length) {
        if (!cancelled) {
          setGroups([]);
          setLoading(false);
        }
        return;
      }
      try {
        const loaded = await Promise.all(ids.map(async id => {
          try {
            const r = await fetch(`/api/items/${encodeURIComponent(id)}`);
            const d = await r.json();
            const isIndipendente = d.data?.contentType === 'indipendente';
            return {
              _id: id,
              operaId: isIndipendente ? '' : d.data?.operaId || id,
              groupKey: isIndipendente ? `__indip_${id}` : d.data?.operaId || id,
              label: isIndipendente ? d.data?.topic || 'Contenuto indipendente' : d.data?.operaId || id
            };
          } catch (_) {
            return {
              _id: id,
              operaId: id,
              groupKey: id,
              label: id
            };
          }
        }));
        if (cancelled) return;
        const map = new Map();
        for (const it of loaded) {
          if (!map.has(it.groupKey)) map.set(it.groupKey, {
            operaId: it.operaId,
            label: it.label,
            itemIds: []
          });
          map.get(it.groupKey).itemIds.push(it._id);
        }
        setGroups([...map.entries()].map(([groupKey, g]) => ({
          groupKey,
          operaId: g.operaId,
          label: g.label,
          itemIds: g.itemIds
        })));
      } catch (_) {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visita._id]);
  React.useEffect(() => {
    let cancelled = false;
    const isil = visita.codiceIsil;
    if (!isil) {
      setOperaSalaMap({});
      setMuseo(null);
      return;
    }
    (async () => {
      try {
        const [rMuseo, rOpere] = await Promise.all([fetch(`/api/musei/${encodeURIComponent(isil)}`).then(r => r.json()), fetch(`/api/opere?codiceIsil=${encodeURIComponent(isil)}`).then(r => r.json())]);
        if (cancelled) return;
        const salaMap = {};
        (rOpere.ok ? rOpere.data : []).forEach(o => {
          if (o.sala) salaMap[o.operaId] = o.sala;
        });
        setOperaSalaMap(salaMap);
        setMuseo(rMuseo.ok ? applyFloorPlanOverrides(rMuseo.data) : null);
      } catch (_) {
        if (!cancelled) {
          setOperaSalaMap({});
          setMuseo(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visita.codiceIsil]);
  React.useEffect(() => {
    let cancelled = false;
    const piani = museo?.mappaInterna || [];
    if (!piani.length) {
      setFloors([]);
      return;
    }
    Promise.all(piani.map(async p => {
      if (!p.geoJsonUrl) return {
        ...p,
        geoJson: null
      };
      try {
        const geo = await fetch(p.geoJsonUrl).then(r => r.json());
        return {
          ...p,
          geoJson: geo
        };
      } catch (_) {
        return {
          ...p,
          geoJson: null
        };
      }
    })).then(results => {
      if (!cancelled) setFloors(results);
    });
    return () => {
      cancelled = true;
    };
  }, [museo]);
  React.useEffect(() => {
    if (floorInitRef.current) return;
    if (!floors.length || !groups.length) return;
    floorInitRef.current = true;
    let bestIdx = 0,
      bestCount = -1;
    floors.forEach((f, idx) => {
      if (!f.geoJson) return;
      const roomIds = new Set((f.geoJson.features || []).map(x => String(x.properties?.room_id)));
      const count = groups.filter(g => operaSalaMap[g.operaId] != null && roomIds.has(String(operaSalaMap[g.operaId]))).length;
      if (count > bestCount) {
        bestCount = count;
        bestIdx = idx;
      }
    });
    setActiveFloorIdx(bestIdx);
  }, [floors, groups, operaSalaMap]);
  function stopsForRoom(roomId) {
    return groups.map((g, idx) => ({
      g,
      idx
    })).filter(({
      g
    }) => operaSalaMap[g.operaId] != null && String(operaSalaMap[g.operaId]) === String(roomId));
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

  // Riordino via tocco: l'HTML5 drag&drop nativo non genera eventi dragstart/
  // dragover sui dispositivi touch, quindi va reimplementato a mano con
  // touchstart/touchmove/touchend. Attivo solo dall'iconcina di trascinamento
  // (non su tutta la card), così lo scroll della pagina e il tap sulle frecce
  // ↑↓ restano invariati.
  const cardRefs = React.useRef([]);
  const touchDragIdxRef = React.useRef(null);
  function findCardIndexAtY(y) {
    let targetIdx = null;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) targetIdx = i;
    });
    return targetIdx;
  }
  function onTouchMoveWindow(e) {
    if (touchDragIdxRef.current === null) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const targetIdx = findCardIndexAtY(touch.clientY);
    if (targetIdx !== null && targetIdx !== touchDragIdxRef.current) {
      const src = touchDragIdxRef.current;
      setGroups(prev => {
        const next = [...prev];
        const [moved] = next.splice(src, 1);
        next.splice(targetIdx, 0, moved);
        return next;
      });
      touchDragIdxRef.current = targetIdx;
      setDragOver(targetIdx);
    }
  }
  function onTouchEndWindow() {
    touchDragIdxRef.current = null;
    setDragOver(null);
    window.removeEventListener('touchmove', onTouchMoveWindow);
    window.removeEventListener('touchend', onTouchEndWindow);
    window.removeEventListener('touchcancel', onTouchEndWindow);
  }
  function handleTouchStart(idx) {
    touchDragIdxRef.current = idx;
    setDragOver(idx);
    window.addEventListener('touchmove', onTouchMoveWindow, {
      passive: false
    });
    window.addEventListener('touchend', onTouchEndWindow);
    window.addEventListener('touchcancel', onTouchEndWindow);
  }
  React.useEffect(() => () => {
    window.removeEventListener('touchmove', onTouchMoveWindow);
    window.removeEventListener('touchend', onTouchEndWindow);
    window.removeEventListener('touchcancel', onTouchEndWindow);
  }, []);
  const cardStyle = idx => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: dragOver === idx ? 'rgba(255,0,127,0.08)' : 'var(--nav-card-bg)',
    border: `1.5px solid ${dragOver === idx ? 'var(--nav-magenta,#FF007F)' : 'var(--nav-border)'}`,
    borderRadius: '12px',
    cursor: isTouchDevice ? 'default' : 'grab',
    transition: 'border-color .15s, background .15s',
    userSelect: 'none'
  });
  const arrowBtnStyle = disabled => ({
    background: 'none',
    border: '1px solid var(--nav-border)',
    borderRadius: '6px',
    padding: '4px 9px',
    cursor: disabled ? 'default' : 'pointer',
    color: 'var(--nav-text)',
    opacity: disabled ? 0.3 : 1,
    fontSize: '0.75rem',
    lineHeight: 1
  });
  const floorsWithGeo = floors.filter(f => f.geoJson);
  const activeFloor = floors[activeFloorIdx];
  return /*#__PURE__*/React.createElement("div", {
    className: "lobby-root",
    style: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lobby-back-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "museo-detail-back",
    onClick: onBack
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-arrow-left"
  }), " Indietro")), /*#__PURE__*/React.createElement("div", {
    className: "lobby-body",
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("header", {
    className: "lobby-header"
  }, /*#__PURE__*/React.createElement("p", {
    className: "lobby-label"
  }, "Ordina le opere"), /*#__PURE__*/React.createElement("h1", {
    className: "lobby-title"
  }, visita.nomeVisita), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--nav-muted)',
      fontSize: '0.88rem',
      marginTop: '8px'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-grip-vertical",
    style: {
      marginRight: '6px'
    }
  }), isTouchDevice ? "Tieni premuto sull'iconcina e trascina, oppure usa le frecce ↑↓ per definire l'ordine della visita." : "Trascina le card o usa ↑↓ per definire l'ordine della visita.")), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '40px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-spinner"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: '12px',
      color: 'var(--nav-muted)'
    }
  }, "Caricamento opere…")) : groups.length === 0 ? /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      color: 'var(--nav-muted)',
      padding: '40px 16px'
    }
  }, "Questa visita non ha opere associate.") : /*#__PURE__*/React.createElement(React.Fragment, null, floorsWithGeo.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "reorder-map"
  }, /*#__PURE__*/React.createElement("p", {
    className: "reorder-map-title"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-map-location-dot",
    style: {
      marginRight: '6px'
    }
  }), "Planimetria del museo"), floorsWithGeo.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "reorder-floor-tabs"
  }, floors.map((f, idx) => f.geoJson && /*#__PURE__*/React.createElement("button", {
    key: idx,
    type: "button",
    className: `reorder-floor-tab${activeFloorIdx === idx ? ' reorder-floor-tab--active' : ''}`,
    onClick: () => setActiveFloorIdx(idx)
  }, f.piano))), activeFloor && activeFloor.geoJson ? /*#__PURE__*/React.createElement("div", {
    className: "geo-floorplan-wrap"
  }, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    className: "geo-floorplan-img",
    src: activeFloor.url,
    alt: activeFloor.piano || 'Planimetria'
  }), /*#__PURE__*/React.createElement("svg", {
    className: "geo-room-overlay",
    viewBox: `0 0 ${activeFloor.imgWidth || 437} ${activeFloor.imgHeight || 600}`,
    preserveAspectRatio: "none",
    style: {
      pointerEvents: 'none'
    }
  }, activeFloor.geoJson.features.map(f => {
    const roomId = f.properties.room_id;
    const points = f.geometry.coordinates[0].map(([x, y]) => `${x},${-y}`).join(' ');
    const isStop = stopsForRoom(roomId).length > 0;
    return /*#__PURE__*/React.createElement("polygon", {
      key: f.properties.fid,
      points: points,
      className: `geo-room-polygon geo-room-polygon--static${isStop ? ' geo-room-polygon--stop' : ''}`
    });
  })), activeFloor.geoJson.features.map(f => {
    const roomId = f.properties.room_id;
    const stops = stopsForRoom(roomId);
    if (!stops.length) return null;
    const centroid = ringCentroid(f.geometry.coordinates[0]);
    const left = centroid.x / (activeFloor.imgWidth || 437) * 100;
    const top = centroid.y / (activeFloor.imgHeight || 600) * 100;
    return /*#__PURE__*/React.createElement("div", {
      key: f.properties.fid,
      className: "geo-stop-marker",
      style: {
        left: `${left}%`,
        top: `${top}%`
      },
      title: stops.map(s => `${s.idx + 1}. ${s.g.label}`).join(', ')
    }, stops.map(s => s.idx + 1).join(','));
  })) : /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      color: 'var(--nav-muted)',
      fontSize: '0.85rem',
      padding: '16px 0',
      margin: 0
    }
  }, "Planimetria non disponibile per questo piano.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '600px',
      width: '100%',
      margin: '0 auto',
      padding: '0 16px 8px'
    }
  }, groups.map((group, idx) => /*#__PURE__*/React.createElement("div", {
    key: group.groupKey,
    ref: el => cardRefs.current[idx] = el,
    draggable: !isTouchDevice,
    onDragStart: isTouchDevice ? undefined : e => handleDragStart(e, idx),
    onDragOver: isTouchDevice ? undefined : e => handleDragOver(e, idx),
    onDragLeave: isTouchDevice ? undefined : () => setDragOver(null),
    onDrop: isTouchDevice ? undefined : e => e.preventDefault(),
    onDragEnd: isTouchDevice ? undefined : handleDragEnd,
    style: cardStyle(idx)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-grip-vertical",
    style: {
      color: 'var(--nav-muted)',
      flexShrink: 0,
      ...(isTouchDevice ? {
        padding: '8px',
        margin: '-8px',
        touchAction: 'none',
        cursor: 'grab'
      } : {})
    },
    onTouchStart: isTouchDevice ? () => handleTouchStart(idx) : undefined
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: '26px',
      height: '26px',
      borderRadius: '50%',
      background: 'var(--magenta,#FF007F)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.73rem',
      fontWeight: '700',
      flexShrink: 0
    }
  }, idx + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontWeight: '600',
      fontSize: '0.92rem',
      minWidth: 0,
      overflowWrap: 'anywhere'
    }
  }, group.label, operaSalaMap[group.operaId] != null && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: '8px',
      fontWeight: 500,
      fontSize: '0.76rem',
      color: 'var(--nav-muted)'
    }
  }, "· Sala ", operaSalaMap[group.operaId])), group.itemIds.length > 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.75rem',
      color: 'var(--nav-muted)',
      background: 'rgba(255,0,127,0.1)',
      borderRadius: '20px',
      padding: '2px 8px',
      flexShrink: 0
    }
  }, group.itemIds.length, " items"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => moveUp(idx),
    disabled: idx === 0,
    style: arrowBtnStyle(idx === 0)
  }, "↑"), /*#__PURE__*/React.createElement("button", {
    onClick: () => moveDown(idx),
    disabled: idx === groups.length - 1,
    style: arrowBtnStyle(idx === groups.length - 1)
  }, "↓")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '24px 16px 40px',
      marginTop: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "inizia-btn",
    onClick: () => onConfirm(groups.map(({
      operaId,
      itemIds
    }) => ({
      operaId,
      itemIds
    }))),
    disabled: loading
  }, "Avanti — Apri la lobby →"))));
}