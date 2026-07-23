function VisiteScreen({ museo, visite, onBack, onAvvia }) {
  const [selectedId,      setSelectedId]      = React.useState(null);
  const [showMap,         setShowMap]         = React.useState(false);
  const [showMapInterna,  setShowMapInterna]  = React.useState(false);
  const [pianoIdx,        setPianoIdx]        = React.useState(0);

  return (
    <>
      <div
        className="museo-mini-header"
        style={(showMap || showMapInterna) ? { borderBottomColor: 'transparent' } : undefined}
      >
        <div className="museo-mini-identity">
          {museo.immagineCopertina && (
            <div className="museo-mini-cover">
              <img loading="lazy" src={museo.immagineCopertina} alt={museo.nome} />
            </div>
          )}
          <div className="museo-mini-info">
            <h1 className="museo-mini-title">{museo.nome}</h1>
            <p className="museo-mini-sub">{museo.citta} · {museo.codiceIsil}</p>
          </div>
        </div>
        {(museo.mappaEmbed || museo.mappaInterna?.length > 0) && (
          <div className="museo-mini-actions">
            {museo.mappaEmbed && (
              <button
                className={`show-map-btn${showMap ? ' show-map-btn--active' : ''}`}
                onClick={() => { const next = !showMap; setShowMap(next); if (next) setShowMapInterna(false); }}
              >
                📍 {showMap ? 'Nascondi mappa' : 'Mappa'}
              </button>
            )}
            {museo.mappaInterna?.length > 0 && (
              <button
                className={`show-map-btn${showMapInterna ? ' show-map-btn--active' : ''}`}
                onClick={() => { const next = !showMapInterna; setShowMapInterna(next); setPianoIdx(0); if (next) setShowMap(false); }}
              >
                🗺️ {showMapInterna ? 'Nascondi planimetria' : 'Planimetria'}
              </button>
            )}
          </div>
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

      <div style={{ padding: '20px 32px 0' }}>
        <button className="museo-detail-back" onClick={onBack}>
          <i className="fa-solid fa-arrow-left" /> Tutti i musei
        </button>
      </div>

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
    </>
  );
}
