function VisiteScreen({
  museo,
  visite,
  onBack,
  onAvvia
}) {
  const [selectedId, setSelectedId] = React.useState(null);
  const [showMap, setShowMap] = React.useState(false);
  const [showMapInterna, setShowMapInterna] = React.useState(false);
  const [pianoIdx, setPianoIdx] = React.useState(0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "museo-mini-header",
    style: showMap || showMapInterna ? {
      borderBottomColor: 'transparent'
    } : undefined
  }, /*#__PURE__*/React.createElement("div", {
    className: "museo-mini-identity"
  }, museo.immagineCopertina && /*#__PURE__*/React.createElement("div", {
    className: "museo-mini-cover"
  }, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: museo.immagineCopertina,
    alt: museo.nome
  })), /*#__PURE__*/React.createElement("div", {
    className: "museo-mini-info"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "museo-mini-title"
  }, museo.nome), /*#__PURE__*/React.createElement("p", {
    className: "museo-mini-sub"
  }, museo.citta, " · ", museo.codiceIsil))), (museo.mappaEmbed || museo.mappaInterna?.length > 0) && /*#__PURE__*/React.createElement("div", {
    className: "museo-mini-actions"
  }, museo.mappaEmbed && /*#__PURE__*/React.createElement("button", {
    className: `show-map-btn${showMap ? ' show-map-btn--active' : ''}`,
    onClick: () => {
      const next = !showMap;
      setShowMap(next);
      if (next) setShowMapInterna(false);
    }
  }, "📍 ", showMap ? 'Nascondi mappa' : 'Mappa'), museo.mappaInterna?.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: `show-map-btn${showMapInterna ? ' show-map-btn--active' : ''}`,
    onClick: () => {
      const next = !showMapInterna;
      setShowMapInterna(next);
      setPianoIdx(0);
      if (next) setShowMap(false);
    }
  }, "🗺️ ", showMapInterna ? 'Nascondi planimetria' : 'Planimetria'))), showMapInterna && museo.mappaInterna?.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "museo-map-section museo-map-interna-section"
  }, museo.mappaInterna.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "piano-tabs-nav"
  }, museo.mappaInterna.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: `piano-tab-btn${pianoIdx === i ? ' active' : ''}`,
    onClick: () => setPianoIdx(i)
  }, p.piano))), /*#__PURE__*/React.createElement(RoomFloorPlan, {
    pianoItem: museo.mappaInterna[pianoIdx],
    museoIsil: museo.codiceIsil
  })), showMap && museo.mappaEmbed && /*#__PURE__*/React.createElement("div", {
    className: "museo-map-section"
  }, /*#__PURE__*/React.createElement("iframe", {
    className: "museo-map-iframe",
    src: museo.mappaEmbed,
    title: `Mappa ${museo.nome}`,
    loading: "lazy",
    allowFullScreen: true
  }), museo.mappaLink && /*#__PURE__*/React.createElement("a", {
    href: museo.mappaLink,
    target: "_blank",
    rel: "noreferrer",
    className: "museo-map-link"
  }, "Apri in OpenStreetMap ↗")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 32px 0'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "museo-detail-back",
    onClick: onBack
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-arrow-left"
  }), " Tutti i musei")), /*#__PURE__*/React.createElement("main", {
    className: "nav-main"
  }, /*#__PURE__*/React.createElement("p", {
    className: "visite-section-title"
  }, "Le mie visite"), visite.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "nav-empty"
  }, "Nessuna visita trovata per questo museo.", /*#__PURE__*/React.createElement("br", null), "Crea o acquista visite dalla dashboard.") : /*#__PURE__*/React.createElement("div", {
    className: "visite-list"
  }, visite.map(v => /*#__PURE__*/React.createElement("div", {
    key: v._id,
    className: `visita-card${selectedId === v._id ? ' visita-card--selected' : ''}`,
    onClick: () => setSelectedId(prev => prev === v._id ? null : v._id)
  }, /*#__PURE__*/React.createElement("div", {
    className: "visita-card-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "visita-title"
  }, v.nomeVisita), v.nomeMnemonico && /*#__PURE__*/React.createElement("span", {
    className: "visita-badge"
  }, v.nomeMnemonico)), /*#__PURE__*/React.createElement("div", {
    className: "visita-meta-right"
  }, v.opereCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "stat-pill"
  }, v.opereCount, " opere"), v.prezzo != null && /*#__PURE__*/React.createElement("span", {
    className: "price-pill"
  }, v.prezzo > 0 ? `€${v.prezzo}` : 'Gratuito'))), v.logistica && /*#__PURE__*/React.createElement("p", {
    className: "visita-logistica"
  }, v.logistica), selectedId === v._id && /*#__PURE__*/React.createElement("div", {
    className: "visita-avvia-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "avvia-btn",
    onClick: e => {
      e.stopPropagation();
      onAvvia(v);
    }
  }, "Avvia visita →")))))));
}