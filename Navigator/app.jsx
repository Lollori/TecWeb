/* ── Floor-plan overrides ────────────────────────────────
   FLOOR_PLAN_OVERRIDES is defined in /public/js/floor-plan-overrides.js
   loaded before this script in index.html.
───────────────────────────────────────────────────────── */
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

/* ── Shared role config & theme helper ─────────────── */

const ROLE_MAP = {
  curatore:   { letter: 'C', color: '#6366f1', label: 'Curatore' },
  visitatore: { letter: 'V', color: '#FF007F', label: 'Visitatore' },
  autore:     { letter: 'A', color: '#05070A', label: 'Autore' },
};

function applyTheme(isDark, setIsDark) {
  const next = isDark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  setIsDark(!isDark);
}

/* ── MobileMenu ────────────────────────────────────── */

function MobileMenu({ links, contextLabel }) {
  const [open,   setOpen]   = React.useState(false);
  const [isDark, setIsDark] = React.useState(
    () => document.documentElement.dataset.theme === 'dark'
  );
  const username = localStorage.getItem('userUsername') || '';
  const role     = localStorage.getItem('userRole')     || '';
  const cfg = ROLE_MAP[role] || { letter: username ? username[0].toUpperCase() : '?', color: '#FF007F', label: role || 'Navigator' };

  function close() { setOpen(false); }

  return (
    <>
      <div className="mobile-topbar">
        <button
          className={`mobile-hamburger${open ? ' open' : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-label="Menu"
        >
          <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-bars'}`} />
        </button>
        <a href="/" className="mobile-topbar-logo">{contextLabel || 'ArtAround.'}</a>
        <div className="avatar-sm" style={{ backgroundColor: cfg.color }}>{cfg.letter}</div>
      </div>

      <div className={`mobile-menu-overlay${open ? ' open' : ''}`} onClick={close} />

      <div className={`mobile-menu-dropdown${open ? ' open' : ''}`}>
        <div className="mobile-menu-user-row">
          <div className="avatar-sm" style={{ backgroundColor: cfg.color }}>{cfg.letter}</div>
          <div>
            <div className="mobile-menu-username">{username || '—'}</div>
            <div className="mobile-menu-role">{cfg.label}</div>
          </div>
        </div>
        <nav className="mobile-nav">
          {links.map((l, i) => (
            <button
              key={i}
              className="nav-item"
              onClick={() => {
                if (l.href) { window.location.href = l.href; }
                else if (l.onClick) { l.onClick(); }
                close();
              }}
            >
              {l.icon && <i className={`fa-solid ${l.icon}`} />}
              {l.label}
            </button>
          ))}
        </nav>
        <div className="mobile-menu-footer">
          <a href="/" className="mobile-footer-link">
            <i className="fa-solid fa-house" />
            Menu principale
          </a>
          <button className="mobile-footer-link" onClick={() => applyTheme(isDark, setIsDark)}>
            <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} />
            {isDark ? 'Modalità chiara' : 'Modalità scura'}
          </button>
          <a href="/" className="mobile-footer-link" onClick={() => localStorage.clear()}>
            <i className="fa-solid fa-power-off" />
            Logout
          </a>
        </div>
      </div>
    </>
  );
}

/* ── Sidebar ─────────────────────────────────────── */

function Sidebar({ links, contextLabel }) {
  const [isDark, setIsDark] = React.useState(
    () => document.documentElement.dataset.theme === 'dark'
  );
  const username = localStorage.getItem('userUsername') || '';
  const role     = localStorage.getItem('userRole')     || '';
  const cfg = ROLE_MAP[role] || { letter: username ? username[0].toUpperCase() : '?', color: '#FF007F', label: role || '—' };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <a href="/" style={{ textDecoration: 'none' }}>
          <h2 className="logo-brand">ArtAround.</h2>
        </a>
        <p className="admin-badge">{contextLabel || 'Navigator'}</p>
      </div>

      <a href="/" className="menu-link home-menu-link">
        <i className="fa-solid fa-house" /> Menu principale
      </a>
      <div className="sidebar-divider-line" />

      <nav className="sidebar-menu">
        {links.map((l, i) => (
          <button
            key={i}
            className={`nav-item${l.active ? ' active' : ''}`}
            onClick={l.href ? () => { window.location.href = l.href; } : l.onClick}
          >
            {l.icon && <i className={`fa-solid ${l.icon}`} />}
            {l.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="dark-toggle" onClick={() => applyTheme(isDark, setIsDark)}>
          <span className="toggle-label">{isDark ? 'Modalità chiara' : 'Modalità scura'}</span>
          <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} />
        </button>
        <div className="user-pill-mini">
          <div className="avatar-sm" style={{ backgroundColor: cfg.color }}>{cfg.letter}</div>
          <div className="user-info-mini">
            <span className="name">{username || '—'}</span>
            <span className="role">{cfg.label}</span>
          </div>
          <a href="/" className="logout-icon" style={{ marginLeft: 'auto' }} title="Logout" onClick={() => localStorage.clear()}>
            <i className="fa-solid fa-power-off" />
          </a>
        </div>
      </div>
    </aside>
  );
}

/* ── JoinContent ─────────────────────────────────────── */

function JoinContent({ onJoined }) {
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
    <div className="join-wrapper">
      <h1 className="page-title">Unisciti a una Visita</h1>
      <p>Inserisci il codice stanza fornito dal docente</p>
      <div className="join-card">
        <input
          type="text"
          className={`join-code-input${joinError ? ' join-code-input--error' : ''}`}
          placeholder='es. "Fenice rossa"'
          value={code}
          onChange={e => { setCode(e.target.value); setJoinError(null); }}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          autoFocus
        />
        {joinError && <p className="join-error">{joinError}</p>}
        <button className="student-join-btn" onClick={handleJoin} disabled={!code.trim() || joining}>
          {joining ? 'Connessione…' : 'Entra →'}
        </button>
      </div>
    </div>
  );
}

/* ── VisitaItemScreen ─────────────────────────────────── */

const TONI_CONFIG = [
  { key: 'semplice', label: 'Semplice', durata: '3 s'  },
  { key: 'medio',    label: 'Medio',    durata: '15 s' },
  { key: 'avanzato', label: 'Avanzato', durata: '40 s' },
];

function VisitaItemScreen({ itemId, currentIdx, totalItems, isDocente, codice, visitaNome, onBack, messages = [], nomeAssegnato = '' }) {
  const [item,        setItem]        = React.useState(null);
  const [loading,     setLoading]     = React.useState(false);
  const [navigating,  setNavigating]  = React.useState(false);
  const [tono,        setTono]        = React.useState('medio');
  const [chatOpen,    setChatOpen]    = React.useState(false);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [msgText,     setMsgText]     = React.useState('');
  const [sending,     setSending]     = React.useState(false);
  const [unread,      setUnread]      = React.useState(0);
  const [terminating, setTerminating] = React.useState(false);
  const prevLenRef = React.useRef(0);
  const chatEndRef = React.useRef(null);

  React.useEffect(() => {
    if (!itemId) { setItem(null); return; }
    setLoading(true);
    fetch(`/api/items/${encodeURIComponent(itemId)}`)
      .then(r => r.json())
      .then(d => setItem(d.data || null))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [itemId]);

  React.useEffect(() => {
    const added = messages.length - prevLenRef.current;
    if (added > 0 && isDocente && !chatOpen) setUnread(u => u + added);
    prevLenRef.current = messages.length;
  }, [messages.length]);

  React.useEffect(() => {
    if (chatOpen) {
      setUnread(0);
      if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatOpen, messages.length]);

  async function navigate(direction) {
    if (navigating) return;
    setNavigating(true);
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/naviga`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
    } finally { setNavigating(false); }
  }

  async function handleTermina() {
    if (!window.confirm('Terminare la visita? Tutti i partecipanti verranno disconnessi.')) return;
    setTerminating(true);
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/chiudi`, { method: 'POST' });
    } finally {
      setTerminating(false);
      onBack();
    }
  }

  async function handleSendMsg() {
    const text = msgText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}/messaggio`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: nomeAssegnato || 'Visitatore', text }),
      });
      if (r.ok) {
        setMsgText('');
        setComposeOpen(false);
      }
      // Se il POST fallisce il compose rimane aperto — l'utente può riprovare
    } finally { setSending(false); }
  }

  const progress = totalItems > 0 ? ((currentIdx + 1) / totalItems) * 100 : 0;

  return (
    <div className="visita-item-root">
      <div className="visita-item-header">
        <p className="visita-item-eyebrow">
          {visitaNome ? `${visitaNome} · ` : ''}Item {currentIdx + 1} di {totalItems}
        </p>
        <div className="visita-item-header-actions">
          {isDocente && (
            <button
              className={`visita-chat-toggle${chatOpen ? ' visita-chat-toggle--active' : ''}`}
              onClick={() => setChatOpen(v => !v)}
              title="Messaggi partecipanti"
            >
              <i className="fa-solid fa-comments" />
              {unread > 0 && <span className="visita-chat-badge">{unread > 9 ? '9+' : unread}</span>}
            </button>
          )}
          {!isDocente && (
            <button className="visita-item-exit-btn" onClick={onBack}>← Esci</button>
          )}
        </div>
      </div>

      <div className="visita-item-progress">
        <div className="visita-item-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="visita-item-content">
        {loading && (
          <div className="visita-item-loading">
            <div className="nav-spinner" />
            <p>Caricamento item…</p>
          </div>
        )}
        {!loading && !itemId && (
          <p className="visita-item-empty">La visita non contiene items.</p>
        )}
        {!loading && itemId && !item && (
          <p className="visita-item-empty">Item non trovato.</p>
        )}
        {!loading && item && (
          <div className="visita-item-card">
            {item.image && (
              <img className="visita-item-img" src={item.image} alt={item.operaId} />
            )}
            <h2 className="visita-item-title">{item.operaId}</h2>

            <div className="visita-toni-bar">
              {TONI_CONFIG.map(t => (
                <button
                  key={t.key}
                  className={`visita-tono-btn${tono === t.key ? ' visita-tono-btn--active' : ''}`}
                  onClick={() => setTono(t.key)}
                >
                  {t.label}
                  <span className="visita-tono-dur">{t.durata}</span>
                </button>
              ))}
            </div>

            <p className="visita-item-text">
              {item.toni?.[tono]?.testo || <em>Nessun contenuto per questo tono.</em>}
            </p>
          </div>
        )}
      </div>

      {isDocente && (
        <div className="visita-item-nav">
          <button
            className="visita-nav-btn visita-nav-btn--prev"
            onClick={() => navigate('indietro')}
            disabled={currentIdx === 0 || navigating}
          >← Precedente</button>
          <span className="visita-nav-counter">{currentIdx + 1} / {totalItems}</span>
          <button
            className="visita-nav-btn visita-nav-btn--next"
            onClick={() => navigate('avanti')}
            disabled={currentIdx >= totalItems - 1 || navigating}
          >Prossimo →</button>
        </div>
      )}

      {isDocente && (
        <div className="visita-termina-bar">
          <button className="visita-termina-btn" onClick={handleTermina} disabled={terminating}>
            {terminating ? 'Chiusura…' : '⏹ Termina visita'}
          </button>
        </div>
      )}

      {/* Chat backdrop */}
      {isDocente && chatOpen && (
        <div className="visita-chat-overlay" onClick={() => setChatOpen(false)} />
      )}

      {/* Chat panel — sempre montato per l'animazione slide */}
      {isDocente && (
        <div className={`visita-chat-panel${chatOpen ? ' visita-chat-panel--open' : ''}`}>
          <div className="visita-chat-panel-header">
            <span className="visita-chat-panel-title">
              <i className="fa-solid fa-comments" style={{ marginRight: '8px' }} />
              Messaggi
              {messages.length > 0 && <span className="visita-chat-count">{messages.length}</span>}
            </span>
            <button className="visita-chat-close" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="visita-chat-msgs">
            {messages.length === 0 ? (
              <p className="visita-chat-empty">
                Nessun messaggio ancora.<br />
                I partecipanti possono scrivere durante la visita.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className="visita-chat-msg">
                  <div className="visita-chat-msg-top">
                    <span className="visita-chat-sender">{m.sender}</span>
                    <span className="visita-chat-time">
                      {new Date(m.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="visita-chat-text">{m.text}</p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {/* Compose sheet studente */}
      {!isDocente && composeOpen && (
        <div className="visita-compose-sheet">
          <div className="visita-compose-header">
            <span>Invia un messaggio</span>
            <button onClick={() => { setComposeOpen(false); setMsgText(''); }}>✕</button>
          </div>
          <div className="visita-compose-body">
            <textarea
              className="visita-compose-input"
              placeholder="Scrivi il tuo messaggio…"
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              rows={3}
              maxLength={280}
              autoFocus
            />
            <button
              className="visita-compose-send"
              onClick={handleSendMsg}
              disabled={!msgText.trim() || sending}
            >
              {sending ? 'Invio…' : 'Invia →'}
            </button>
          </div>
        </div>
      )}

      {!isDocente && !composeOpen && (
        <button className="visita-msg-fab" onClick={() => setComposeOpen(true)} title="Invia messaggio">
          <i className="fa-solid fa-comment" />
        </button>
      )}
    </div>
  );
}

/* ── LobbyDocente ─────────────────────────────────────── */

function LobbyDocente({ codice, visitaNome, museo, onClose }) {
  const [studenti,       setStudenti]       = React.useState([]);
  const [stato,          setStato]          = React.useState('attesa');
  const [avviando,       setAvviando]       = React.useState(false);
  const [currentItemId,  setCurrentItemId]  = React.useState(null);
  const [currentItemIdx, setCurrentItemIdx] = React.useState(0);
  const [totalItems,     setTotalItems]     = React.useState(0);
  const [messages,       setMessages]       = React.useState([]);
  const closedRef = React.useRef(false);

  React.useEffect(() => {
    const es = new EventSource(`/api/sessioni/${encodeURIComponent(codice)}/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'stato-iniziale') {
        setStudenti(data.studenti);
        setStato(data.stato);
        if (data.currentItemId  !== undefined) setCurrentItemId(data.currentItemId);
        if (data.currentItemIdx !== undefined) setCurrentItemIdx(data.currentItemIdx);
        if (data.totalItems     !== undefined) setTotalItems(data.totalItems);
      } else if (data.tipo === 'studente-connesso') {
        setStudenti(data.studenti);
      } else if (data.tipo === 'visita-iniziata') {
        setStato('iniziata');
        if (data.currentItemId  !== undefined) setCurrentItemId(data.currentItemId);
        if (data.currentItemIdx !== undefined) setCurrentItemIdx(data.currentItemIdx);
        if (data.totalItems     !== undefined) setTotalItems(data.totalItems);
      } else if (data.tipo === 'item-cambiato') {
        setCurrentItemId(data.currentItemId);
        setCurrentItemIdx(data.currentItemIdx);
        setTotalItems(data.totalItems);
      } else if (data.tipo === 'nuovo-messaggio') {
        setMessages(prev => [...prev, { sender: data.sender, text: data.text, timestamp: data.timestamp }]);
      } else if (data.tipo === 'visita-chiusa') {
        if (!closedRef.current) { closedRef.current = true; onClose(); }
      }
    };
    return () => es.close();
  }, [codice]);

  // Polling di fallback: se SSE non consegna i messaggi (proxy buffering / istanze multiple),
  // il GET della sessione restituisce comunque l'array messages aggiornato.
  React.useEffect(() => {
    if (stato !== 'iniziata') return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}`);
        const d = await r.json();
        if (d.ok && Array.isArray(d.data?.messages)) {
          setMessages(d.data.messages);
        }
      } catch (_) {}
    }, 2000);
    return () => clearInterval(id);
  }, [codice, stato]);

  async function handleAvvia() {
    setAvviando(true);
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/avvia`, { method: 'POST' });
    } finally {
      setAvviando(false);
    }
  }

  const museoHeader = museo && (
    <div className="museo-mini-header">
      <div className="museo-mini-identity">
        {museo.immagineCopertina && (
          <div className="museo-mini-cover">
            <img src={museo.immagineCopertina} alt={museo.nome} />
          </div>
        )}
        <div className="museo-mini-info">
          <h1 className="museo-mini-title">{museo.nome}</h1>
          <p className="museo-mini-sub">{museo.citta} · {museo.codiceIsil}</p>
        </div>
      </div>
    </div>
  );

  const backBar = (
    <div className="lobby-back-bar">
      <button className="museo-detail-back" onClick={onClose}>
        <i className="fa-solid fa-arrow-left" /> Annulla sessione
      </button>
    </div>
  );

  if (stato === 'iniziata') return (
    <VisitaItemScreen
      itemId={currentItemId}
      currentIdx={currentItemIdx}
      totalItems={totalItems}
      isDocente={true}
      codice={codice}
      visitaNome={visitaNome}
      onBack={onClose}
      messages={messages}
    />
  );

  return (
    <>
      {museoHeader}
      {backBar}
      <div className="lobby-root lobby-root--dark" style={{ flex: 1, minHeight: 0 }}>
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
    </>
  );
}

/* ── LobbyStudente ─────────────────────────────────────── */

function LobbyStudente({ codice, nomeAssegnato, museoIsil: initialMuseoIsil, onBack }) {
  const [studenti,       setStudenti]       = React.useState([]);
  const [stato,          setStato]          = React.useState('attesa');
  const [museoIsil,      setMuseoIsil]      = React.useState(initialMuseoIsil || null);
  const [currentItemId,  setCurrentItemId]  = React.useState(null);
  const [currentItemIdx, setCurrentItemIdx] = React.useState(0);
  const [totalItems,     setTotalItems]     = React.useState(0);
  const [visitaNome,     setVisitaNome]     = React.useState('');

  React.useEffect(() => {
    const es = new EventSource(`/api/sessioni/${encodeURIComponent(codice)}/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'stato-iniziale') {
        setStudenti(data.studenti);
        setStato(data.stato);
        if (data.museoIsil)      setMuseoIsil(data.museoIsil);
        if (data.currentItemId  !== undefined) setCurrentItemId(data.currentItemId);
        if (data.currentItemIdx !== undefined) setCurrentItemIdx(data.currentItemIdx);
        if (data.totalItems     !== undefined) setTotalItems(data.totalItems);
      } else if (data.tipo === 'studente-connesso') {
        setStudenti(data.studenti);
      } else if (data.tipo === 'visita-iniziata') {
        setStato('iniziata');
        if (data.museoIsil)      setMuseoIsil(data.museoIsil);
        if (data.currentItemId  !== undefined) setCurrentItemId(data.currentItemId);
        if (data.currentItemIdx !== undefined) setCurrentItemIdx(data.currentItemIdx);
        if (data.totalItems     !== undefined) setTotalItems(data.totalItems);
      } else if (data.tipo === 'item-cambiato') {
        setCurrentItemId(data.currentItemId);
        setCurrentItemIdx(data.currentItemIdx);
        setTotalItems(data.totalItems);
      } else if (data.tipo === 'visita-chiusa') {
        onBack();
      }
    };
    return () => es.close();
  }, [codice]);

  if (stato === 'iniziata') return (
    <VisitaItemScreen
      itemId={currentItemId}
      currentIdx={currentItemIdx}
      totalItems={totalItems}
      isDocente={false}
      codice={codice}
      visitaNome={visitaNome}
      onBack={onBack}
      nomeAssegnato={nomeAssegnato}
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

/* ── Amenity POIs ─────────────────────────────────────────
   Some geoJson room_id values mark building amenities rather
   than exhibition rooms — shown as icon markers, not as
   clickable "sala" polygons.
───────────────────────────────────────────────────────── */
const AMENITY_ICONS = {
  scale:       { icon: 'fa-stairs',         label: 'Scale' },
  ascensore:   { icon: 'fa-arrows-up-down', label: 'Ascensore' },
  bagno:       { icon: 'fa-restroom',       label: 'Bagni' },
  caffetteria: { icon: 'fa-mug-saucer',     label: 'Caffetteria' },
};

function ringCentroid(ring) {
  let sx = 0, sy = 0;
  ring.forEach(([x, y]) => { sx += x; sy += -y; });
  return { x: sx / ring.length, y: sy / ring.length };
}

/* ── RoomFloorPlan ───────────────────────────────────────
   Renders a floor-plan image with an interactive GeoJSON
   polygon overlay. Clicking a room fetches and shows the
   artworks in that room via a fixed bottom panel. Amenity
   polygons (scale/ascensore/bagno/caffetteria) are shown as
   icon markers instead, since they have no opere to list.
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
    <>
      <div
        className="museo-mini-header"
        style={(showMap || showMapInterna) ? { borderBottomColor: 'transparent' } : undefined}
      >
        <div className="museo-mini-identity">
          {museo.immagineCopertina && (
            <div className="museo-mini-cover">
              <img src={museo.immagineCopertina} alt={museo.nome} />
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

/* ── Marketplace ─────────────────────────────────────────── */

function MarketplaceScreen() {
  return (
    <iframe
      src="/Editor-Marketplace/dashboard.html?embed=marketplace"
      style={{ flex: 1, minHeight: 0, width: '100%', border: 'none', display: 'block' }}
      title="Marketplace"
    />
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
  const [search,  setSearch]  = React.useState('');

  const userId   = localStorage.getItem('userId')   || '';
  const codiceIsil = new URLSearchParams(window.location.search).get('museo');
  const museiRef = React.useRef([]);
  React.useEffect(() => { museiRef.current = musei; }, [musei]);

  React.useEffect(() => {
    if (codiceIsil) {
      selectMuseo(codiceIsil);
    } else {
      loadMusei();
    }

    function handlePopState() {
      const isil = new URLSearchParams(window.location.search).get('museo');
      if (isil) {
        selectMuseo(isil, { push: false });
      } else {
        setMuseo(null);
        setVisite([]);
        setError(null);
        if (museiRef.current.length) {
          setScreen('musei');
        } else {
          loadMusei();
        }
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  async function selectMuseo(isil, { push = true } = {}) {
    setScreen('loading');
    setError(null);
    if (push) {
      const url = new URL(window.location.href);
      url.searchParams.set('museo', isil);
      window.history.pushState({}, '', url);
    }
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
    if (visita.nomeMnemonico?.trim()) return visita.nomeMnemonico.trim().replace(/\s+/g, '-');
    const adj  = ['rosso', 'verde', 'dorato', 'argento', 'viola', 'bianco', 'nero'];
    const noun = ['falco', 'leone', 'aquila', 'fenice', 'drago', 'tigre', 'orso'];
    return `${adj[Math.floor(Math.random() * adj.length)]}-${noun[Math.floor(Math.random() * noun.length)]}`;
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
            itemIds:    visita.itemIds || [],
          }),
        });
        const data = await res.json();
        if (res.ok && !data.error) {
          setLobby({ codice, visitaNome: visita.nomeVisita });
          window.history.pushState({ screen: 'lobby-docente' }, '', window.location.href);
          setScreen('lobby-docente');
          return;
        }
        if (attempt < 2) {
          codice = generateCode(visita) + '-' + (Math.floor(Math.random() * 90) + 10);
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

  if (screen === 'lobby-studente') return (
    <LobbyStudente
      codice={lobby.codice}
      nomeAssegnato={lobby.myName}
      museoIsil={lobby.museoIsil}
      onBack={() => { setLobby(null); setScreen('musei'); }}
    />
  );

  /* screen === 'musei' | 'join' | 'visite' | 'lobby-docente' */
  const closeSession = () => { setLobby(null); setScreen('visite'); };
  const joinClick    = () => { window.history.pushState({ screen: 'join' }, '', window.location.href); setScreen('join'); };

  const goMarketplace = () => setScreen('marketplace');

  const sidebarLinks = screen === 'lobby-docente'
    ? [
        { label: 'Musei',                   icon: 'fa-museum', active: true,                    onClick: closeSession },
        { label: 'Marketplace',             icon: 'fa-store',                                   onClick: goMarketplace },
        { label: 'Unisciti tramite codice', icon: 'fa-link',                                    onClick: joinClick },
      ]
    : screen === 'visite'
    ? [
        { label: 'Musei',                   icon: 'fa-museum', active: true,                    onClick: goBack },
        { label: 'Marketplace',             icon: 'fa-store',                                   onClick: goMarketplace },
        { label: 'Unisciti tramite codice', icon: 'fa-link',                                    onClick: joinClick },
      ]
    : [
        { label: 'Musei',                   icon: 'fa-museum', active: screen === 'musei',      onClick: () => { setSearch(''); setScreen('musei'); } },
        { label: 'Marketplace',             icon: 'fa-store',  active: screen === 'marketplace', onClick: goMarketplace },
        { label: 'Unisciti tramite codice', icon: 'fa-link',   active: screen === 'join',       onClick: joinClick },
      ];

  const filteredMusei = musei.filter(m =>
    !search.trim() ||
    m.nome.toLowerCase().includes(search.toLowerCase()) ||
    (m.citta || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-layout">
      <Sidebar contextLabel="Navigator" links={sidebarLinks} />
      <MobileMenu contextLabel="ArtAround." links={sidebarLinks} />

      <main className={`main-content${screen === 'visite' ? ' main-content--visite' : screen === 'lobby-docente' || screen === 'marketplace' ? ' main-content--lobby' : ''}`}>
        {screen === 'musei' ? (
          <>
            <header className="content-header">
              <div>
                <h1 className="page-title">Esplora Musei</h1>
                <p>Scegli un museo per vedere le tue visite</p>
              </div>
            </header>

            <div className="toolbar-section">
              <div className="search-box-container">
                <i className="fa-solid fa-magnifying-glass search-icon" />
                <input
                  className="search-input"
                  type="text"
                  placeholder="Cerca museo o città…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="picker-grid">
              {filteredMusei.map(m => (
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
              {!filteredMusei.length && (
                <p className="nav-empty" style={{ gridColumn: '1/-1' }}>
                  {search.trim() ? 'Nessun museo trovato.' : 'Nessun museo disponibile.'}
                </p>
              )}
            </div>
          </>
        ) : screen === 'visite' ? (
          <VisiteScreen museo={museo} visite={visite} onBack={goBack} onAvvia={handleAvvia} />
        ) : screen === 'marketplace' ? (
          <MarketplaceScreen />
        ) : screen === 'lobby-docente' ? (
          <LobbyDocente codice={lobby.codice} visitaNome={lobby.visitaNome} museo={museo} onClose={closeSession} />
        ) : (
          <JoinContent
            onJoined={(codice, nome, museoIsil) => { setLobby({ codice, myName: nome, museoIsil }); setScreen('lobby-studente'); }}
          />
        )}
      </main>
    </div>
  );
}

/* ── Mount ──────────────────────────────────────────── */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
