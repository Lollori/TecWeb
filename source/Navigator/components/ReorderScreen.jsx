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
            return { _id: id, operaId: d.data?.operaId || id };
          } catch (_) { return { _id: id, operaId: id }; }
        }));
        if (cancelled) return;

        const map = new Map();
        for (const it of loaded) {
          if (!map.has(it.operaId)) map.set(it.operaId, []);
          map.get(it.operaId).push(it._id);
        }
        setGroups([...map.entries()].map(([operaId, itemIds]) => ({ operaId, itemIds })));
      } catch (_) {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [visita._id]);

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px', width: '100%', margin: '0 auto', padding: '0 16px 8px' }}>
            {groups.map((group, idx) => (
              <div
                key={group.operaId}
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
                  {group.operaId}
                </span>
                {group.itemIds.length > 1 && (
                  <span style={{
                    fontSize: '0.75rem', color: 'var(--nav-muted)',
                    background: 'rgba(255,0,127,0.1)', borderRadius: '20px',
                    padding: '2px 8px', flexShrink: 0,
                  }}>
                    {group.itemIds.length} varianti
                  </span>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
                  <button onClick={() => moveUp(idx)}   disabled={idx === 0}                style={arrowBtnStyle(idx === 0)}>↑</button>
                  <button onClick={() => moveDown(idx)} disabled={idx === groups.length - 1} style={arrowBtnStyle(idx === groups.length - 1)}>↓</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '24px 16px 40px', marginTop: 'auto' }}>
          <button
            className="inizia-btn"
            onClick={() => onConfirm(groups)}
            disabled={loading}
          >
            Avanti — Apri la lobby →
          </button>
        </div>
      </div>
    </div>
  );
}
