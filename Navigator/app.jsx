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

/* ── Persistenza sessione attiva ─────────────────────────
   Una ricarica della pagina non deve mai far "uscire" dalla
   visita (né per la docente né per i partecipanti): l'unico
   modo per uscire deve restare il pulsante dedicato (Termina
   visita / Esci). Salviamo lo stretto indispensabile per
   ricollegarsi alla sessione già esistente lato server dopo
   un reload, e lo puliamo solo nei punti di uscita deliberata.
───────────────────────────────────────────────────────── */
const NAV_SESSION_KEY = 'navActiveSession';
function saveNavSession(data) {
  try { localStorage.setItem(NAV_SESSION_KEY, JSON.stringify(data)); } catch (_) {}
}
function loadNavSession() {
  try { return JSON.parse(localStorage.getItem(NAV_SESSION_KEY) || 'null'); } catch (_) { return null; }
}
function clearNavSession() {
  try { localStorage.removeItem(NAV_SESSION_KEY); } catch (_) {}
}

/* ── Shared role config & theme helper ─────────────── */

// avatar: opera d'arte famosissima coerente col ruolo (Wikimedia Commons,
// pubblico dominio) — stessa mappa usata in Editor-Marketplace/dashboard.js.
const ROLE_MAP = {
  curatore:   { letter: 'C', color: '#6366f1', label: 'Curatore',
                avatar: '/img/pfp_curatore.jpg' },
  visitatore: { letter: 'V', color: '#FF007F', label: 'Visitatore',
                avatar: '/img/pfp_visitatore.jpg' },
  autore:     { letter: 'A', color: '#05070A', label: 'Autore',
                avatar: '/img/pfp_autore.jpg' },
  admin:      { letter: 'M', color: '#05070A', label: 'Admin',
                avatar: '/img/pfp_admin.jpg' },
};

function avatarStyle(cfg) {
  return cfg.avatar
    ? { backgroundImage: `url('${cfg.avatar}')` }
    : { backgroundColor: cfg.color };
}

function useTheme() {
  const [isDark, setIsDark] = React.useState(
    () => document.documentElement.dataset.theme === 'dark'
  );
  React.useEffect(() => {
    function handler(e) { setIsDark(e.detail.isDark); }
    // storage: cambiamento da un altro documento (altri tab, iframe Editor-Marketplace)
    function storageHandler(e) {
      if (e.key !== 'theme' || !e.newValue) return;
      const dark = e.newValue === 'dark';
      document.documentElement.dataset.theme = e.newValue;
      setIsDark(dark);
    }
    window.addEventListener('artaround-theme', handler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('artaround-theme', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);
  function toggle() {
    const next = !isDark;
    const val = next ? 'dark' : 'light';
    document.documentElement.dataset.theme = val;
    localStorage.setItem('theme', val);
    setIsDark(next);
    window.dispatchEvent(new CustomEvent('artaround-theme', { detail: { isDark: next } }));
  }
  return [isDark, toggle];
}

/* ── MobileMenu ────────────────────────────────────── */

function MobileMenu({ links, contextLabel }) {
  const [open,   setOpen]   = React.useState(false);
  const [isDark, toggleTheme] = useTheme();
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
        <div className="avatar-sm" style={avatarStyle(cfg)}>{cfg.avatar ? '' : cfg.letter}</div>
      </div>

      <div className={`mobile-menu-overlay${open ? ' open' : ''}`} onClick={close} />

      <div className={`mobile-menu-dropdown${open ? ' open' : ''}`}>
        <div className="mobile-menu-user-row">
          <div className="avatar-sm" style={avatarStyle(cfg)}>{cfg.avatar ? '' : cfg.letter}</div>
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
          <button className="mobile-footer-link" onClick={toggleTheme}>
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
  const [isDark, toggleTheme] = useTheme();
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
        <button className="dark-toggle" onClick={toggleTheme}>
          <span className="toggle-label">{isDark ? 'Modalità chiara' : 'Modalità scura'}</span>
          <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} />
        </button>
        <div className="user-pill-mini">
          <div className="avatar-sm" style={avatarStyle(cfg)}>{cfg.avatar ? '' : cfg.letter}</div>
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
      const nomeAccount = localStorage.getItem('userUsername') || '';
      const ruoloAccount = localStorage.getItem('userRole') || '';
      const res  = await fetch(`/api/sessioni/${encodeURIComponent(trimmed)}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeAccount, ruolo: ruoloAccount }),
      });
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

/* ── QuizPanel ─────────────────────────────────────────
   Quiz di fine visita: la docente lo avvia dall'ultimo item, parte un
   conto alla rovescia condiviso (40s per domanda) durante il quale
   ciascun partecipante risponde dal proprio dispositivo. Allo scadere
   del tempo (o se la docente lo chiude prima) il server calcola i
   punteggi e li trasmette a tutti.
───────────────────────────────────────────────────────── */

function QuizPanel({ quiz, isDocente, nomeAssegnato, respondedCount, totalStudenti, onRispondiQuiz, onTerminaQuizOra, quizTerminandoOra }) {
  const [risposte, setRisposte] = React.useState(() => quiz.domande.map(() => null));
  const [inviato,  setInviato]  = React.useState(false);
  const [remaining, setRemaining] = React.useState(
    () => Math.max(0, Math.round((quiz.scadenza - Date.now()) / 1000))
  );
  const [filtroVisitatore, setFiltroVisitatore] = React.useState('');

  React.useEffect(() => {
    if (quiz.stato !== 'in-corso') return;
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.round((quiz.scadenza - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [quiz.stato, quiz.scadenza]);

  // Lo studente invia automaticamente le risposte selezionate finora allo scadere del tempo.
  React.useEffect(() => {
    if (isDocente || inviato || quiz.stato !== 'in-corso') return;
    if (remaining <= 0) {
      setInviato(true);
      onRispondiQuiz(risposte);
    }
  }, [remaining, isDocente, inviato, quiz.stato]);

  function selezionaRisposta(domandaIdx, opzioneIdx) {
    if (inviato) return;
    setRisposte(prev => {
      const next = prev.slice();
      next[domandaIdx] = opzioneIdx;
      return next;
    });
  }

  function handleInvia() {
    setInviato(true);
    onRispondiQuiz(risposte);
  }

  const minuti  = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secondi = String(remaining % 60).padStart(2, '0');

  if (quiz.stato === 'terminato') {
    const risultati = quiz.risultati || [];
    const mio = !isDocente ? risultati.find(r => r.nome === nomeAssegnato) : null;
    const pct = (punteggio, totale) => totale > 0 ? Math.round((punteggio / totale) * 100) : 0;

    const domandePiuSbagliate = risultati.length === 0 ? [] : risultati[0].dettaglio
      .map((d, i) => {
        const errati = risultati.filter(r => r.dettaglio[i] && !r.dettaglio[i].isCorrect).length;
        return { testo: d.testo, errati, totale: risultati.length, pct: pct(errati, risultati.length) };
      })
      .filter(d => d.errati > 0)
      .sort((a, b) => b.errati - a.errati)
      .slice(0, 5);

    const risultatiFiltrati = filtroVisitatore
      ? risultati.filter(r => r.nome === filtroVisitatore)
      : risultati;

    const dettaglioBlock = (dettaglio) => (
      <div className="quiz-result-detail">
        {dettaglio.map((d, i) => (
          <div key={i} className={`quiz-result-item${d.isCorrect ? ' quiz-result-item--ok' : ' quiz-result-item--ko'}`}>
            <p className="quiz-result-q">{i + 1}. {d.testo}</p>
            <p className="quiz-result-a">
              {isDocente ? 'Risposta data' : 'Hai risposto'}: {d.rispostaData != null ? d.opzioni[d.rispostaData] : <em>nessuna risposta</em>}
            </p>
            {!d.isCorrect && (
              <p className="quiz-result-correct">Corretta: {d.opzioni[d.corretta]}</p>
            )}
          </div>
        ))}
      </div>
    );

    return (
      <div className="quiz-panel">
        <div className="quiz-panel-header">
          <i className="fa-solid fa-trophy" />
          <h2>{isDocente ? 'Risultati del quiz' : 'Quiz terminato'}</h2>
        </div>

        {isDocente ? (
          <>
            {domandePiuSbagliate.length > 0 && (
              <div className="quiz-most-missed-card">
                <h3 className="quiz-most-missed-title">
                  <i className="fa-solid fa-triangle-exclamation" /> Domande più sbagliate
                </h3>
                <div className="quiz-most-missed-list">
                  {domandePiuSbagliate.map((d, i) => (
                    <div key={i} className="quiz-most-missed-item">
                      <p className="quiz-most-missed-q">{d.testo}</p>
                      <p className="quiz-most-missed-stat">{d.errati} / {d.totale} risposte errate ({d.pct}%)</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {risultati.length > 0 && (
              <div className="quiz-filter-bar">
                <label htmlFor="quiz-filtro-visitatore">Visitatore</label>
                <select
                  id="quiz-filtro-visitatore"
                  className="quiz-filtro-select"
                  value={filtroVisitatore}
                  onChange={e => setFiltroVisitatore(e.target.value)}
                >
                  <option value="">Tutti i visitatori</option>
                  {risultati.map(r => (
                    <option key={r.nome} value={r.nome}>{r.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="quiz-results-list">
              {risultati.length === 0 && <p className="quiz-empty">Nessun partecipante ha risposto.</p>}
              {risultatiFiltrati.map(r => (
                <details key={r.nome} className="quiz-result-card">
                  <summary>
                    <span className="quiz-result-name">{r.nome}</span>
                    <span className="quiz-result-score">{r.punteggio} / {r.totale} · {pct(r.punteggio, r.totale)}%</span>
                  </summary>
                  {dettaglioBlock(r.dettaglio)}
                </details>
              ))}
            </div>
          </>
        ) : (
          <div className="quiz-my-result">
            {mio ? (
              <>
                <p className="quiz-my-score">{mio.punteggio} / {mio.totale}</p>
                {dettaglioBlock(mio.dettaglio)}
              </>
            ) : (
              <p className="quiz-empty">Non hai partecipato a questo quiz.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // quiz.stato === 'in-corso'
  return (
    <div className="quiz-panel">
      <div className="quiz-panel-header">
        <i className="fa-solid fa-clock" />
        <h2>Quiz finale</h2>
        <span className="quiz-countdown">{minuti}:{secondi}</span>
      </div>

      {isDocente ? (
        <div className="quiz-docente-live">
          <p className="quiz-docente-live-text">
            Il quiz è in corso — {respondedCount} / {totalStudenti} partecipanti hanno risposto.
          </p>
          <button className="visita-termina-btn" onClick={onTerminaQuizOra} disabled={quizTerminandoOra}>
            {quizTerminandoOra ? 'Chiusura…' : 'Termina quiz ora'}
          </button>
        </div>
      ) : (
        <>
          <div className="quiz-domande-list">
            {quiz.domande.map((d, i) => (
              <div key={i} className="quiz-domanda-card">
                <p className="quiz-domanda-testo">{i + 1}. {d.testo}</p>
                <div className="quiz-opzioni-list">
                  {d.opzioni.map((o, j) => (
                    <button
                      key={j}
                      className={`quiz-opzione-btn${risposte[i] === j ? ' quiz-opzione-btn--active' : ''}`}
                      onClick={() => selezionaRisposta(i, j)}
                      disabled={inviato}
                    >
                      <span className="quiz-opzione-letter">{['A', 'B', 'C', 'D'][j]}</span>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className="quiz-invia-btn" onClick={handleInvia} disabled={inviato}>
            {inviato ? 'Risposte inviate — in attesa della fine del quiz…' : 'Invia risposte'}
          </button>
        </>
      )}
    </div>
  );
}

/* ── VisitaItemScreen ─────────────────────────────────── */

const TONI_CONFIG = [
  { key: 'semplice', label: 'Semplice' },
  { key: 'medio',    label: 'Medio'    },
  { key: 'avanzato', label: 'Avanzato' },
];

const DURATE_CONFIG = [
  { key: 'd3',  label: '3 s'  },
  { key: 'd15', label: '15 s' },
  { key: 'd40', label: '40 s' },
];

function toneText(t, dur) {
  if (!t) return '';
  return t[dur] || '';
}

// Tra tutti gli item di un gruppo opera, sceglie quello più adatto al tono+durata
// selezionato. Priorità: match esatto → stesso tono (qualsiasi durata) → primo item.
function findBestItem(items, tono, durata) {
  if (!items.length) return null;
  const exact = items.find(it => it.toni?.[tono]?.[durata]?.trim());
  if (exact) return exact;
  const tonoMatch = items.find(it => {
    const t = it.toni?.[tono];
    return t && (t.d3?.trim() || t.d15?.trim() || t.d40?.trim());
  });
  return tonoMatch || items[0];
}

/* ── Comandi vocali ────────────────────────────────────────────
   Vocabolario controllato per l'assistente vocale della visita, con le
   azioni associate (vedi handleVoiceTranscript in VisitaItemScreen):
   - esplorazione: aumenta/diminuisci la durata della spiegazione, o la ripete
   - adattamento:  rende il tono più semplice o più avanzato
   - dettagli:     risponde su autore/stile dell'opera corrente
   - logistica:    indica il piano più vicino di uscita/bagni e lo mostra in mappa
   ───────────────────────────────────────────────────────────── */
const VOICE_COMMANDS = {
  esplorazione: ['dimmi di più', 'dimmi di meno', "cos'è questo"],
  adattamento:  ['più semplice', 'troppo semplice', 'non capisco'],
  dettagli:     ["chi è l'autore", 'qual è lo stile'],
  logistica:    ["dov'è l'uscita", "dov'è la toilette"],
};

// Normalizza il testo trascritto per un matching tollerante: minuscolo,
// accenti rimossi ("più" → "piu", "è" → "e") e punteggiatura/apostrofi
// appiattiti a spazi, così frasi dette in modo leggermente diverso
// ("cos'è questo" / "cosa è questo" / "cos e questo?") vengono comunque
// riconosciute.
function normalizeVoiceText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Confronta il testo trascritto col vocabolario controllato e restituisce
// { categoria, azione } della prima corrispondenza, o null se non riconosciuto.
function matchVoiceCommand(testo) {
  const t = normalizeVoiceText(testo);
  if (!t) return null;
  if (t.includes('di piu'))                                    return { categoria: 'esplorazione', azione: 'aumenta' };
  if (t.includes('di meno'))                                   return { categoria: 'esplorazione', azione: 'diminuisci' };
  if (t.includes('ripeti') || t.includes('cos e questo') || (t.includes('cosa') && t.includes('questo')))
                                                                return { categoria: 'esplorazione', azione: 'ripeti' };
  if (t.includes('troppo semplice'))                           return { categoria: 'adattamento', azione: 'avanza' };
  if (t.includes('piu semplice') || t.includes('non capisco')) return { categoria: 'adattamento', azione: 'semplifica' };
  if (t.includes('autore'))                                    return { categoria: 'dettagli', azione: 'autore' };
  if (t.includes('stile'))                                     return { categoria: 'dettagli', azione: 'stile' };
  if (t.includes('uscita'))                                    return { categoria: 'logistica', azione: 'uscita' };
  if (t.includes('bagno') || t.includes('bagni') || t.includes('toilette') || t.includes('toilet'))
                                                                return { categoria: 'logistica', azione: 'bagno' };
  return null;
}

function VisitaItemScreen({
  operaGroup, currentIdx, totalItems, isDocente, codice, visitaNome, onBack,
  messages = [], nomeAssegnato = '', studentTono = {}, visitaItems = [],
  hasQuiz = false, quiz = null, respondedCount = 0, totalStudenti = 0,
  onAvviaQuiz, onTerminaQuizOra, quizAvviando = false, quizTerminandoOra = false, onRispondiQuiz,
  audioAvviato = false, onAvviaAudio, onFermaAudio, syncTono = null, syncDurata = null,
  inAscolto = false,
}) {
  const [allItems,      setAllItems]      = React.useState([]);
  const [activeItem,    setActiveItem]    = React.useState(null);
  const [loading,       setLoading]       = React.useState(false);
  const [navigating,    setNavigating]    = React.useState(false);
  const [tono,          setTono]          = React.useState('medio');
  const [durata,        setDurata]        = React.useState('d15');
  const [chatOpen,      setChatOpen]      = React.useState(false);
  const [composeOpen,   setComposeOpen]   = React.useState(false);
  const [msgText,       setMsgText]       = React.useState('');
  const [sending,       setSending]       = React.useState(false);
  const [unread,        setUnread]        = React.useState(0);
  const [terminating,   setTerminating]   = React.useState(false);
  const [monitorOpen,   setMonitorOpen]   = React.useState(false);
  const [itemsMenuOpen, setItemsMenuOpen] = React.useState(false);
  const [quizPromptOpen, setQuizPromptOpen] = React.useState(false);
  const [ttsMuted,      setTtsMuted]      = React.useState(false);
  const [ttsLoading,    setTtsLoading]    = React.useState(false);
  const [ascoltoPopupOpen, setAscoltoPopupOpen] = React.useState(false);
  const [ascoltoPopupTitolo, setAscoltoPopupTitolo] = React.useState('Non puoi andare avanti');
  const [ascoltoCountdown, setAscoltoCountdown] = React.useState(60);
  // 'mappa' | 'opera' | null — la visita inizia con la mappa aperta; da qui in
  // poi lo stato resta quello scelto dall'utente man mano che si avanza tra
  // gli item, dato che VisitaItemScreen non viene rimontato tra un item e
  // l'altro (solo itemId cambia). Mutuamente esclusivi, ma possono essere
  // entrambi chiusi (null).
  const [activePanel,   setActivePanel]   = React.useState('mappa');
  // Comandi vocali: mic on/off, testo trascritto e azione riconosciuta.
  const [micOn,            setMicOn]            = React.useState(false);
  const [micSupported]     = React.useState(() =>
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [voiceTranscript,  setVoiceTranscript]  = React.useState('');
  // Comando logistico attivo ("dov'è l'uscita/la toilette"): quale stanza
  // evidenziare in mappa e su quale piano — sovrascrive temporaneamente
  // l'evidenziazione della sala dell'opera corrente. Si azzera cambiando opera.
  const [logisticsTarget,  setLogisticsTarget]  = React.useState(null);
  const prevLenRef = React.useRef(0);
  const chatEndRef = React.useRef(null);
  const composeInputRef = React.useRef(null);
  const audioRef = React.useRef(null);
  // Canale audio separato da audioRef (usato per la narrazione sincronizzata
  // dalla docente): le risposte ai comandi vocali sono personali e devono
  // sempre essere udibili, a prescindere da "Avvia audio"/muto della docente.
  const assistantAudioRef = React.useRef(null);
  const recognitionRef = React.useRef(null);
  const micOnRef = React.useRef(false);
  // La callback di SpeechRecognition viene creata una sola volta al mount
  // (vedi effect sotto) e chiuderebbe su uno stato ormai vecchio se chiamasse
  // handleVoiceTranscript direttamente — passa invece sempre dall'ultima
  // versione della funzione tramite questo ref, aggiornato ad ogni render.
  const handleVoiceTranscriptRef = React.useRef(() => {});

  React.useEffect(() => {
    if (composeOpen && composeInputRef.current) composeInputRef.current.focus();
  }, [composeOpen]);

  // Impedisce lo scroll della pagina durante la visita: solo l'area centrale
  // dei contenuti (visita-item-content) deve scorrere, header e barra in
  // basso restano sempre visibili anche su mobile.
  React.useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      if (assistantAudioRef.current) {
        assistantAudioRef.current.pause();
        if (assistantAudioRef.current.src) URL.revokeObjectURL(assistantAudioRef.current.src);
        assistantAudioRef.current = null;
      }
    };
  }, []);

  // Comandi vocali: un'unica istanza di SpeechRecognition per tutta la
  // durata dello schermo, riavviata automaticamente finché il microfono
  // resta "acceso" — i browser interrompono il riconoscimento continuo dopo
  // un po' di silenzio anche con continuous:true, quindi senza il riavvio
  // in onend il microfono si spegnerebbe da solo invece di restare attivo
  // fino alla pressione successiva del pulsante, come richiesto.
  React.useEffect(() => {
    if (!micSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'it-IT';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
      }
      const testo = finalText.trim();
      if (testo) {
        setVoiceTranscript(testo);
        // Passa sempre dal ref: questa callback è fissata al mount, il ref
        // punta invece sempre alla versione più recente della funzione.
        handleVoiceTranscriptRef.current(testo);
      }
    };
    recognition.onerror = () => { /* silenzioso: onend riprova comunque */ };
    recognition.onend = () => {
      if (micOnRef.current) {
        try { recognition.start(); } catch (_) { /* già avviato */ }
      }
    };

    recognitionRef.current = recognition;
    return () => {
      micOnRef.current = false;
      try { recognition.stop(); } catch (_) {}
      recognitionRef.current = null;
    };
  }, [micSupported]);

  // Risponde vocalmente a una richiesta dell'utente (canale indipendente
  // dalla narrazione sincronizzata, sempre udibile).
  function speakAssistant(text) {
    if (assistantAudioRef.current) {
      assistantAudioRef.current.pause();
      if (assistantAudioRef.current.src) URL.revokeObjectURL(assistantAudioRef.current.src);
      assistantAudioRef.current = null;
    }
    fetch('/api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then(r => { if (!r.ok) throw new Error('tts fallita'); return r.blob(); })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        assistantAudioRef.current = audio;
        audio.play().catch(() => {});
      })
      .catch(() => {});
  }

  // "Dov'è l'uscita?" / "Dov'è la toilette?" — cerca su tutti i piani del
  // museo la sala amenity richiesta (room_id 'U' per l'uscita, 'bagno' per
  // le toilette), sceglie il piano più vicino a quello dell'opera corrente,
  // lo annuncia a voce e apre la mappa su quel piano evidenziando la sala.
  async function locateAmenity(kind) {
    const label = kind === 'U' ? "L'uscita" : 'La toilette';
    if (!activeItem?.museumId || !operaGroup?.operaId) {
      speakAssistant(`${label}: mappa non disponibile al momento.`);
      return;
    }
    try {
      const [rMuseo, rOpere] = await Promise.all([
        fetch(`/api/musei/${encodeURIComponent(activeItem.museumId)}`),
        fetch(`/api/opere?codiceIsil=${encodeURIComponent(activeItem.museumId)}`),
      ]);
      const [dMuseo, dOpere] = await Promise.all([rMuseo.json(), rOpere.json()]);
      const museo = dMuseo.ok ? applyFloorPlanOverrides(dMuseo.data) : null;
      const piani = museo?.mappaInterna || [];
      if (!piani.length) { speakAssistant(`${label}: mappa non disponibile per questo museo.`); return; }

      const opera = (dOpere.data || []).find(o => o.operaId === operaGroup.operaId);
      const salaOpera = opera?.sala != null ? String(opera.sala) : null;

      let operaFloorIdx = null;
      const foundFloors = [];
      for (let i = 0; i < piani.length; i++) {
        const piano = piani[i];
        if (!piano.geoJsonUrl) continue;
        try {
          const res  = await fetch(piano.geoJsonUrl);
          const geo  = await res.json();
          const feats = geo.features || [];
          if (salaOpera != null && operaFloorIdx === null && feats.some(f => f.properties?.room_id === salaOpera)) {
            operaFloorIdx = i;
          }
          if (feats.some(f => f.properties?.room_id === kind)) foundFloors.push(i);
        } catch (_) { /* prova il prossimo piano */ }
      }

      if (!foundFloors.length) {
        speakAssistant(`Non ho trovato ${kind === 'U' ? "l'uscita" : 'i bagni'} sulla mappa di questo museo.`);
        return;
      }
      const refIdx = operaFloorIdx != null ? operaFloorIdx : 0;
      const nearestIdx = foundFloors.reduce((best, i) =>
        Math.abs(i - refIdx) < Math.abs(best - refIdx) ? i : best, foundFloors[0]);
      const pianoLabel = piani[nearestIdx]?.piano || `piano ${nearestIdx + 1}`;

      speakAssistant(`${label} più vicina si trova al ${pianoLabel}. Controlla la mappa.`);
      setActivePanel('mappa');
      setLogisticsTarget({ roomId: kind, piano: piani[nearestIdx]?.piano });
    } catch (_) {
      speakAssistant('Non sono riuscito a recuperare le indicazioni.');
    }
  }

  // Confronta il testo trascritto col vocabolario controllato (matchVoiceCommand)
  // ed esegue l'azione corrispondente. Aggiornata ad ogni render (vedi
  // handleVoiceTranscriptRef sopra), così vede sempre tono/durata/opera correnti.
  function handleVoiceTranscript(testo) {
    const match = matchVoiceCommand(testo);
    if (!match) return; // frase non riconosciuta: resta silenzioso, il testo resta comunque visibile in UI
    const { categoria, azione } = match;

    if (categoria === 'esplorazione') {
      if (azione === 'ripeti') {
        const testoCorrente = toneText(activeItem?.toni?.[tono], durata);
        speakAssistant(testoCorrente || 'Nessuna spiegazione disponibile per questa opera.');
        return;
      }
      const order = DURATE_CONFIG.map(d => d.key);
      const idx = order.indexOf(durata);
      const nextIdx = Math.max(0, Math.min(order.length - 1, idx + (azione === 'aumenta' ? 1 : -1)));
      if (nextIdx === idx) {
        speakAssistant(azione === 'aumenta' ? 'Questa è già la spiegazione più lunga disponibile.' : 'Questa è già la spiegazione più breve disponibile.');
        return;
      }
      const nuovaDurata = order[nextIdx];
      setDurata(nuovaDurata);
      speakAssistant(toneText(activeItem?.toni?.[tono], nuovaDurata) || 'Nessun contenuto disponibile per questa durata.');

    } else if (categoria === 'adattamento') {
      const order = TONI_CONFIG.map(t => t.key);
      const idx = order.indexOf(tono);
      const nextIdx = Math.max(0, Math.min(order.length - 1, idx + (azione === 'avanza' ? 1 : -1)));
      if (nextIdx === idx) {
        speakAssistant(azione === 'avanza' ? 'Questo è già il tono più avanzato disponibile.' : 'Questo è già il tono più semplice disponibile.');
        return;
      }
      const nuovoTono = order[nextIdx];
      setTono(nuovoTono);
      speakAssistant(toneText(activeItem?.toni?.[nuovoTono], durata) || 'Nessun contenuto disponibile per questo tono.');

    } else if (categoria === 'dettagli') {
      if (azione === 'autore') {
        speakAssistant(operaInfo?.autore ? `L'autore è ${operaInfo.autore}.` : "Non ho informazioni sull'autore di quest'opera.");
      } else {
        const stile = operaInfo?.tecnica || operaInfo?.tipo;
        speakAssistant(stile ? `Lo stile è: ${stile}.` : 'Non ho informazioni sullo stile di quest\'opera.');
      }

    } else if (categoria === 'logistica') {
      locateAmenity(azione === 'uscita' ? 'U' : 'bagno');
    }
  }

  // Il ref punta sempre all'ultima versione di handleVoiceTranscript (che
  // chiude su tono/durata/activeItem/operaInfo correnti) — vedi commento
  // sulla dichiarazione del ref più sopra.
  React.useEffect(() => {
    handleVoiceTranscriptRef.current = handleVoiceTranscript;
  });

  // Il comando logistico resta valido solo per l'opera per cui è stato
  // chiesto: cambiando opera si torna a evidenziare la sua sala normalmente.
  React.useEffect(() => {
    setLogisticsTarget(null);
  }, [operaGroup]);

  function toggleMic() {
    if (!micSupported || !recognitionRef.current) return;
    const next = !micOn;
    setMicOn(next);
    micOnRef.current = next;
    if (next) {
      setVoiceTranscript('');
      try { recognitionRef.current.start(); } catch (_) {}
    } else {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
  }

  // Precarica le immagini di TUTTE le opere della visita non appena questa
  // viene avviata (sia per la docente che per ogni studente, ognuno sul
  // proprio dispositivo), così la navigazione tra un'opera e l'altra è
  // fluida — l'immagine è già in cache invece di scaricarsi solo quando ci
  // si arriva sopra. Gira una sola volta per visita (chiave sull'elenco
  // completo dei gruppi opera, non sull'item corrente), in background e
  // senza bloccare né rifare nulla se una singola immagine fallisce.
  React.useEffect(() => {
    if (!visitaItems.length) return;
    let cancelled = false;
    const allIds = visitaItems.flatMap(g => g.itemIds || []);
    Promise.allSettled(allIds.map(id =>
      fetch(`/api/items/${encodeURIComponent(id)}`).then(r => r.json()).then(d => d.data)
    )).then(results => {
      if (cancelled) return;
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value?.image) {
          const img = new Image();
          img.src = res.value.image;
        }
      });
    });
    return () => { cancelled = true; };
  }, [visitaItems]);

  // Carica tutti gli item del gruppo opera corrente
  React.useEffect(() => {
    const ids = operaGroup?.itemIds;
    if (!ids?.length) {
      setAllItems([]);
      setActiveItem(null);
      setLoading(false);
      return;
    }
    setAllItems([]);
    setLoading(true);
    let cancelled = false;
    Promise.all(ids.map(id =>
      fetch(`/api/items/${encodeURIComponent(id)}`).then(r => r.json()).then(d => d.data || null).catch(() => null)
    )).then(items => {
      if (cancelled) return;
      setAllItems(items.filter(Boolean));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [operaGroup]);

  // Ricalcola l'item attivo quando cambiano tono, durata o la lista degli item
  React.useEffect(() => {
    setActiveItem(findBestItem(allItems, tono, durata));
  }, [allItems, tono, durata]);

  // Allinea lo studente al tono/durata scelti dalla docente ogni volta che
  // lei avvia la narrazione sincronizzata ("Avvia audio per tutti"), invece
  // di riprodurre il tono locale di default ('medio'). Da qui in poi lo
  // studente resta comunque libero di cambiare tono per sé (voce/comandi):
  // questo effetto riparte solo quando la docente avvia un nuovo audio, non
  // ad ogni render, quindi non sovrascrive scelte successive dello studente.
  React.useEffect(() => {
    if (isDocente || !syncTono) return;
    setTono(syncTono);
    if (syncDurata) setDurata(syncDurata);
  }, [syncTono, syncDurata, isDocente]);

  // Dati dell'opera collegata all'item corrente: servono sia come fallback
  // per l'immagine (molti item non hanno un campo "image" proprio valorizzato
  // — es. creati prima dell'autofill dall'opera, o content type
  // "indipendente" senza URL inserito), sia per rispondere ai comandi vocali
  // "Dettagli" (chi è l'autore / qual è lo stile).
  const [operaInfo, setOperaInfo] = React.useState(null);
  const operaFallbackImg = operaInfo?.immagine || '';
  React.useEffect(() => {
    setOperaInfo(null);
    if (!activeItem?.museumId || !operaGroup?.operaId) return;
    let cancelled = false;
    fetch(`/api/opere?codiceIsil=${encodeURIComponent(activeItem.museumId)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const op = (d.data || []).find(o => o.operaId === operaGroup.operaId);
        if (op) setOperaInfo(op);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeItem, operaGroup]);

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

  // Lo studente segnala alla docente ogni cambio di tono/linguaggio, per la
  // dashboard di monitoraggio ("chi ha chiesto cosa").
  React.useEffect(() => {
    if (isDocente || !nomeAssegnato || !codice) return;
    fetch(`/api/sessioni/${encodeURIComponent(codice)}/tono`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nomeAssegnato, tono, durata }),
    }).catch(() => {});
  }, [tono, durata, isDocente, nomeAssegnato, codice]);

  // audioAvviato/ttsMuted appena letti dentro la .then() asincrona di sotto
  // sarebbero quelli al momento in cui l'effetto è partito (closure stale):
  // questi ref restano sempre aggiornati al valore corrente.
  const audioAvviatoRef = React.useRef(audioAvviato);
  const ttsMutedRef     = React.useRef(ttsMuted);
  React.useEffect(() => { audioAvviatoRef.current = audioAvviato; }, [audioAvviato]);
  React.useEffect(() => { ttsMutedRef.current = ttsMuted; }, [ttsMuted]);

  // Carica una nuova sintesi vocale (Edge TTS) solo quando cambia davvero il
  // contenuto da leggere — opera, tono o durata. "Ferma audio"/"Avvia audio"
  // della docente NON tocca questo effetto: lo gestisce quello sotto, che
  // mette in pausa/riprende lo stesso file invece di rigenerarlo da capo,
  // così riprende esattamente da dove si era fermato.
  React.useEffect(() => {
    const testo = toneText(activeItem?.toni?.[tono], durata);
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setTtsLoading(false);
    if (!isDocente && nomeAssegnato && codice) reportAscolto(false);
    if (!testo) return;
    let cancelled = false;
    setTtsLoading(true);
    fetch('/api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: testo }),
    })
      .then(r => { if (!r.ok) throw new Error('tts fallita'); return r.blob(); })
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        // Quando l'audio finisce da solo, il pulsante deve tornare su "Avvia
        // audio" per tutti: la docente è l'unica a poterlo far ripartire, per
        // cui è lei a triggerare il fermaAudio che lo sincronizza via SSE.
        if (isDocente) audio.onended = () => onFermaAudio?.();
        else audio.onended = () => { if (nomeAssegnato && codice) reportAscolto(false); };
        if (audioAvviatoRef.current && !ttsMutedRef.current) {
          audio.play()
            .then(() => { if (!isDocente && nomeAssegnato && codice) reportAscolto(true); })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTtsLoading(false); });
    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
      if (!isDocente && nomeAssegnato && codice) reportAscolto(false);
    };
  }, [activeItem, tono, durata]);

  // Mette in pausa o riprende l'audio GIÀ CARICATO in risposta a "Ferma
  // audio"/"Avvia audio" (docente) o al muto (studente) — senza toccare il
  // file: riprende esattamente dal punto in cui si era fermato.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioAvviato && !ttsMuted) {
      audio.play()
        .then(() => { if (!isDocente && nomeAssegnato && codice) reportAscolto(true); })
        .catch(() => {});
    } else {
      audio.pause();
      if (!isDocente && nomeAssegnato && codice) reportAscolto(false);
    }
  }, [audioAvviato, ttsMuted]);

  // POST fire-and-forget: comunica alla docente se questo studente sta
  // ascoltando la narrazione sincronizzata in questo momento, per bloccare
  // "avanti" finché tutti non hanno finito (vedi handleNavigaAvanti/popup).
  function reportAscolto(ascolto) {
    fetch(`/api/sessioni/${encodeURIComponent(codice)}/ascolto`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nomeAssegnato, ascolto }),
    }).catch(() => {});
  }

  function toggleTtsMuted() {
    setTtsMuted(m => !m);
  }

  // "Ferma audio" è sempre permesso; "Avvia audio" invece va bloccato (stesso
  // popup di "avanti") se qualche studente sta ancora ascoltando dell'altro,
  // per non fargli sentire due audio sovrapposti.
  function handleAudioButtonClick() {
    if (audioAvviato) { onFermaAudio(); return; }
    if (inAscolto) { mostraPopupAscolto('Non puoi avviare un nuovo audio'); return; }
    onAvviaAudio(tono, durata);
  }

  async function navigate(direction) {
    if (navigating) return;
    if ((direction === 'avanti' || direction === 'next') && inAscolto) {
      mostraPopupAscolto();
      return;
    }
    setNavigating(true);
    try {
      const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}/naviga`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const d = await r.json();
      if (d.code === 'STUDENTI_IN_ASCOLTO') mostraPopupAscolto();
    } finally { setNavigating(false); }
  }

  async function jumpToItem(idx) {
    if (navigating || idx === currentIdx) { setItemsMenuOpen(false); return; }
    if (idx > currentIdx && inAscolto) {
      setItemsMenuOpen(false);
      mostraPopupAscolto();
      return;
    }
    setNavigating(true);
    try {
      const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}/naviga`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: idx }),
      });
      const d = await r.json();
      if (d.code === 'STUDENTI_IN_ASCOLTO') mostraPopupAscolto();
    } finally { setNavigating(false); setItemsMenuOpen(false); }
  }

  // Popup "ci sono studenti in ascolto" con conto alla rovescia di 60s —
  // puramente informativo: dopo i 60s si chiude da solo ma la docente può
  // già ritentare prima (il blocco vero è lato server, su inAscolto). Stesso
  // popup sia per "avanti" bloccato che per un secondo audio bloccato, solo
  // il titolo cambia in base a cosa stava provando a fare.
  const ascoltoCountdownRef = React.useRef(null);
  function mostraPopupAscolto(titolo = 'Non puoi andare avanti') {
    if (ascoltoCountdownRef.current) clearInterval(ascoltoCountdownRef.current);
    setAscoltoPopupTitolo(titolo);
    setAscoltoCountdown(60);
    setAscoltoPopupOpen(true);
    ascoltoCountdownRef.current = setInterval(() => {
      setAscoltoCountdown(s => {
        if (s <= 1) {
          clearInterval(ascoltoCountdownRef.current);
          setAscoltoPopupOpen(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }
  React.useEffect(() => () => {
    if (ascoltoCountdownRef.current) clearInterval(ascoltoCountdownRef.current);
  }, []);

  async function eseguiTermina() {
    setTerminating(true);
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/chiudi`, { method: 'POST' });
    } finally {
      setTerminating(false);
      onBack();
    }
  }

  async function handleTermina() {
    // Se la visita ha un quiz non ancora avviato, prima di chiudere chiediamo
    // alla docente se vuole farlo partire.
    if (hasQuiz && !quiz) {
      setQuizPromptOpen(true);
      return;
    }
    if (!(await showConfirm('Terminare la visita? Tutti i partecipanti verranno disconnessi.'))) return;
    eseguiTermina();
  }

  async function handleTerminaSenzaQuiz() {
    setQuizPromptOpen(false);
    if (!(await showConfirm('Terminare la visita senza avviare il quiz? Tutti i partecipanti verranno disconnessi.'))) return;
    eseguiTermina();
  }

  async function handleAvviaQuizDaPrompt() {
    setQuizPromptOpen(false);
    if (onAvviaQuiz) await onAvviaQuiz();
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
          {micSupported && (
            <button
              className={`visita-mic-toggle${micOn ? ' visita-mic-toggle--active' : ''}`}
              onClick={toggleMic}
              title={micOn ? 'Disattiva comandi vocali' : 'Attiva comandi vocali'}
            >
              <i className={`fa-solid ${micOn ? 'fa-microphone' : 'fa-microphone-slash'}`} />
            </button>
          )}
          {isDocente && (
            <button
              className={`visita-chat-toggle${itemsMenuOpen ? ' visita-chat-toggle--active' : ''}`}
              onClick={() => { setItemsMenuOpen(v => !v); setMonitorOpen(false); setChatOpen(false); }}
              title="Vai a un'opera specifica"
            >
              <i className="fa-solid fa-list" />
            </button>
          )}
          {isDocente && (
            <button
              className={`visita-chat-toggle${monitorOpen ? ' visita-chat-toggle--active' : ''}`}
              onClick={() => { setMonitorOpen(v => !v); setItemsMenuOpen(false); setChatOpen(false); }}
              title="Monitoraggio partecipanti"
            >
              <i className="fa-solid fa-chart-line" />
            </button>
          )}
          {isDocente && (
            <button
              className={`visita-chat-toggle${chatOpen ? ' visita-chat-toggle--active' : ''}`}
              onClick={() => { setChatOpen(v => !v); setMonitorOpen(false); setItemsMenuOpen(false); }}
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

      <div className="visita-item-body">
      <div className="visita-item-main">
      <div className="visita-item-content">
        {quiz ? (
          <QuizPanel
            quiz={quiz}
            isDocente={isDocente}
            nomeAssegnato={nomeAssegnato}
            respondedCount={respondedCount}
            totalStudenti={totalStudenti}
            onRispondiQuiz={onRispondiQuiz}
            onTerminaQuizOra={onTerminaQuizOra}
            quizTerminandoOra={quizTerminandoOra}
          />
        ) : (
          <>
            {loading && (
              <div className="visita-item-loading">
                <div className="nav-spinner" />
                <p>Caricamento item…</p>
              </div>
            )}
            {!loading && !operaGroup && (
              <p className="visita-item-empty">La visita non contiene opere.</p>
            )}
            {!loading && operaGroup && !activeItem && (
              <p className="visita-item-empty">Nessun item disponibile per questa opera.</p>
            )}
            {!loading && activeItem && (
              <div className="visita-item-card">
                <h2 className="visita-item-title">
                  {operaGroup?.operaId || activeItem.operaId}
                  <button
                    type="button"
                    className={`visita-tts-toggle${ttsMuted ? '' : ' visita-tts-toggle--active'}`}
                    onClick={toggleTtsMuted}
                    title={ttsMuted ? 'Attiva lettura ad alta voce' : 'Disattiva lettura ad alta voce'}
                  >
                    <i className={`fa-solid ${ttsLoading ? 'fa-spinner fa-spin' : ttsMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`} />
                  </button>
                </h2>

                <div className="visita-view-toggle">
                  <button
                    type="button"
                    className={`visita-view-btn${activePanel === 'mappa' ? ' visita-view-btn--active' : ''}`}
                    onClick={() => setActivePanel(p => p === 'mappa' ? null : 'mappa')}
                  >
                    <i className="fa-solid fa-map-location-dot" /> Mappa
                  </button>
                  <button
                    type="button"
                    className={`visita-view-btn${activePanel === 'opera' ? ' visita-view-btn--active' : ''}`}
                    onClick={() => setActivePanel(p => p === 'opera' ? null : 'opera')}
                  >
                    <i className="fa-solid fa-image" /> Opera
                  </button>
                </div>

                {activePanel === 'mappa' && (
                  <VisitaItemRoomMap
                    museumId={activeItem.museumId}
                    operaId={operaGroup?.operaId || activeItem.operaId}
                    logisticsTarget={logisticsTarget}
                  />
                )}
                {activePanel === 'opera' && (activeItem.image || operaFallbackImg) && (
                  <img
                    className="visita-item-img"
                    src={activeItem.image || operaFallbackImg}
                    alt={operaGroup?.operaId || activeItem.operaId}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                {activePanel === 'opera' && !activeItem.image && !operaFallbackImg && (
                  <p className="visita-item-empty">Nessuna immagine disponibile per questa opera.</p>
                )}

                <div className="visita-toni-bar">
                  {TONI_CONFIG.map(t => (
                    <button
                      key={t.key}
                      className={`visita-tono-btn${tono === t.key ? ' visita-tono-btn--active' : ''}`}
                      onClick={() => setTono(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="visita-toni-bar visita-durate-bar">
                  {DURATE_CONFIG.map(d => (
                    <button
                      key={d.key}
                      className={`visita-tono-btn${durata === d.key ? ' visita-tono-btn--active' : ''}`}
                      onClick={() => setDurata(d.key)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {micOn && (
                  <p className="visita-voice-transcript">
                    <i className="fa-solid fa-microphone me-1" />
                    {voiceTranscript || 'In ascolto…'}
                  </p>
                )}

                <p className="visita-item-text">
                  {toneText(activeItem.toni?.[tono], durata) || <em>Nessun contenuto per questo tono e durata.</em>}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {isDocente && !quiz && (
        <div className="visita-audio-bar">
          <button
            type="button"
            className={`visita-audio-btn${audioAvviato ? ' visita-audio-btn--avviato' : ''}`}
            onClick={handleAudioButtonClick}
          >
            <i className={`fa-solid ${audioAvviato ? 'fa-stop' : 'fa-volume-high'}`} />
            {audioAvviato ? 'Ferma audio' : 'Avvia audio per tutti'}
          </button>
        </div>
      )}

      {isDocente && !quiz && (
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
            {terminating ? 'Chiusura…' : 'Termina visita'}
          </button>
        </div>
      )}
      </div>

      {/* Chat visitatore — parte del layout: quando è aperta lo schermo si
          rimodella (il contenuto principale si restringe) invece di aprirsi
          come pannello sopra il contenuto. */}
      {!isDocente && (
        <aside className={`visita-compose-sidebar${composeOpen ? ' visita-compose-sidebar--open' : ''}`}>
          <div className="visita-compose-header">
            <span>Invia un messaggio</span>
            <button onClick={() => { setComposeOpen(false); setMsgText(''); }}>✕</button>
          </div>
          <div className="visita-compose-body">
            <textarea
              ref={composeInputRef}
              className="visita-compose-input"
              placeholder="Scrivi il tuo messaggio…"
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              rows={3}
              maxLength={280}
            />
            <button
              className="visita-compose-send"
              onClick={handleSendMsg}
              disabled={!msgText.trim() || sending}
            >
              {sending ? 'Invio…' : 'Invia →'}
            </button>
          </div>
        </aside>
      )}
      </div>

      {/* Prompt: avviare il quiz prima di terminare la visita? */}
      {isDocente && quizPromptOpen && (
        <div className="visita-chat-overlay" onClick={() => setQuizPromptOpen(false)} />
      )}
      {isDocente && quizPromptOpen && (
        <div className="quiz-prompt-modal">
          <h3 className="quiz-prompt-title">Avviare il quiz finale?</h3>
          <p className="quiz-prompt-text">
            Questa visita ha un quiz associato. Puoi farlo partire adesso (i partecipanti risponderanno
            dai loro dispositivi) oppure terminare la visita senza quiz.
          </p>
          <div className="quiz-prompt-actions">
            <button className="quiz-prompt-btn quiz-prompt-btn--ghost" onClick={() => setQuizPromptOpen(false)}>
              Annulla
            </button>
            <button className="quiz-prompt-btn quiz-prompt-btn--danger" onClick={handleTerminaSenzaQuiz}>
              Termina senza quiz
            </button>
            <button className="quiz-prompt-btn quiz-prompt-btn--primary" onClick={handleAvviaQuizDaPrompt} disabled={quizAvviando}>
              {quizAvviando ? 'Avvio in corso…' : 'Avvia Quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Blocco "avanti": ci sono ancora studenti in ascolto — stesso stile
          (ui-modal.css) di tutti gli altri popup del sito, non quello del
          prompt quiz. */}
      {isDocente && ascoltoPopupOpen && (
        <div className="ui-modal-backdrop show" onClick={() => setAscoltoPopupOpen(false)}>
          <div className="ui-modal-box" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="ui-modal-icon warning ui-modal-icon--hourglass">
              <i className={`fa-solid ${ascoltoCountdown > 40 ? 'fa-hourglass-start' : ascoltoCountdown > 20 ? 'fa-hourglass-half' : 'fa-hourglass-end'}`} />
            </div>
            <div className="ui-modal-title">{ascoltoPopupTitolo}</div>
            <div className="ui-modal-msg">
              Ci sono ancora studenti in ascolto!<br />
              Attendi qualche secondo e riprova.<br />
              <strong style={{ fontSize: '1.3rem' }}>{ascoltoCountdown}s</strong>
            </div>
            <div className="ui-modal-actions">
              <button type="button" className="ui-modal-btn ui-modal-btn-primary" onClick={() => setAscoltoPopupOpen(false)}>
                Ho capito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vai a un'opera — backdrop + pannello */}
      {isDocente && itemsMenuOpen && (
        <div className="visita-chat-overlay" onClick={() => setItemsMenuOpen(false)} />
      )}
      {isDocente && (
        <div className={`visita-chat-panel${itemsMenuOpen ? ' visita-chat-panel--open' : ''}`}>
          <div className="visita-chat-panel-header">
            <span className="visita-chat-panel-title">
              <i className="fa-solid fa-list" style={{ marginRight: '8px' }} />
              Vai a un'opera
            </span>
            <button className="visita-chat-close" onClick={() => setItemsMenuOpen(false)}>✕</button>
          </div>
          <div className="visita-chat-msgs">
            {visitaItems.length === 0 ? (
              <p className="visita-chat-empty">Caricamento elenco opere…</p>
            ) : (
              visitaItems.map((it, idx) => (
                <button
                  key={it.operaId || idx}
                  className={`visita-jump-item${idx === currentIdx ? ' visita-jump-item--active' : ''}`}
                  onClick={() => jumpToItem(idx)}
                  disabled={navigating}
                >
                  <span className="visita-jump-item-num">{idx + 1}</span>
                  <span className="visita-jump-item-name">{it.operaId}</span>
                  {idx === currentIdx && <i className="fa-solid fa-volume-high" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Monitoraggio partecipanti — backdrop + pannello */}
      {isDocente && monitorOpen && (
        <div className="visita-chat-overlay" onClick={() => setMonitorOpen(false)} />
      )}
      {isDocente && (
        <div className={`visita-chat-panel${monitorOpen ? ' visita-chat-panel--open' : ''}`}>
          <div className="visita-chat-panel-header">
            <span className="visita-chat-panel-title">
              <i className="fa-solid fa-chart-line" style={{ marginRight: '8px' }} />
              Monitoraggio partecipanti
            </span>
            <button className="visita-chat-close" onClick={() => setMonitorOpen(false)}>✕</button>
          </div>
          <div className="visita-chat-msgs">
            {Object.keys(studentTono).length === 0 ? (
              <p className="visita-chat-empty">
                Nessuna richiesta ancora.<br />
                Qui vedrai in tempo reale i cambi di tono/linguaggio di ogni partecipante.
              </p>
            ) : (
              Object.entries(studentTono)
                .sort((a, b) => b[1].timestamp - a[1].timestamp)
                .map(([nome, info]) => {
                  const tonoLabel   = TONI_CONFIG.find(t => t.key === info.tono)?.label   || info.tono;
                  const durataLabel = DURATE_CONFIG.find(d => d.key === info.durata)?.label || info.durata || '';
                  return (
                    <div key={nome} className="visita-chat-msg">
                      <div className="visita-chat-msg-top">
                        <span className="visita-chat-sender">{nome}</span>
                        <span className="visita-chat-time">
                          {new Date(info.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="visita-chat-text">
                        Tono: <strong>{tonoLabel}</strong>
                        {durataLabel && <> · Durata: <strong>{durataLabel}</strong></>}
                      </p>
                    </div>
                  );
                })
            )}
          </div>
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
  const [studenti,         setStudenti]         = React.useState([]);
  const [stato,            setStato]            = React.useState('attesa');
  const [avviando,         setAvviando]         = React.useState(false);
  const [currentOperaGroup, setCurrentOperaGroup] = React.useState(null);
  const [currentItemIdx,   setCurrentItemIdx]   = React.useState(0);
  const [totalItems,       setTotalItems]       = React.useState(0);
  const [messages,         setMessages]         = React.useState([]);
  const [studentTono,      setStudentTono]      = React.useState({});
  const [visitaItems,      setVisitaItems]      = React.useState([]);
  const [hasQuiz,          setHasQuiz]          = React.useState(false);
  const [quiz,             setQuiz]             = React.useState(null);
  const [respondedCount,   setRespondedCount]   = React.useState(0);
  const [quizAvviando,     setQuizAvviando]     = React.useState(false);
  const [quizTerminandoOra, setQuizTerminandoOra] = React.useState(false);
  const [audioAvviato,     setAudioAvviato]     = React.useState(false);
  // Almeno uno studente sta ascoltando la narrazione sincronizzata in questo
  // momento: finché è true, "avanti" resta bloccato (vedi navigate()).
  const [inAscolto,        setInAscolto]        = React.useState(false);
  const closedRef = React.useRef(false);

  React.useEffect(() => {
    const es = new EventSource(`/api/sessioni/${encodeURIComponent(codice)}/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'stato-iniziale') {
        setStudenti(data.studenti);
        setStato(data.stato);
        if (data.currentOperaGroup !== undefined) setCurrentOperaGroup(data.currentOperaGroup);
        if (data.currentItemIdx    !== undefined) setCurrentItemIdx(data.currentItemIdx);
        if (data.totalItems        !== undefined) setTotalItems(data.totalItems);
        if (data.studentTono)                     setStudentTono(data.studentTono);
        setHasQuiz(!!data.hasQuiz);
        setAudioAvviato(!!data.audioAvviato);
        setInAscolto(!!data.inAscolto);
        if (data.quiz) {
          setQuiz(data.quiz);
          setRespondedCount(data.quiz.risposte ? Object.keys(data.quiz.risposte).length : 0);
        }
      } else if (data.tipo === 'studente-connesso') {
        setStudenti(data.studenti);
      } else if (data.tipo === 'visita-iniziata') {
        setStato('iniziata');
        if (data.currentOperaGroup !== undefined) setCurrentOperaGroup(data.currentOperaGroup);
        if (data.currentItemIdx    !== undefined) setCurrentItemIdx(data.currentItemIdx);
        if (data.totalItems        !== undefined) setTotalItems(data.totalItems);
        setHasQuiz(!!data.hasQuiz);
        setAudioAvviato(false);
        setInAscolto(false);
      } else if (data.tipo === 'ascolto-cambiato') {
        setInAscolto(!!data.inAscolto);
      } else if (data.tipo === 'item-cambiato') {
        setCurrentOperaGroup(data.currentOperaGroup);
        setCurrentItemIdx(data.currentItemIdx);
        setTotalItems(data.totalItems);
        setAudioAvviato(false);
      } else if (data.tipo === 'audio-avviato') {
        setAudioAvviato(true);
      } else if (data.tipo === 'audio-fermato') {
        setAudioAvviato(false);
        setInAscolto(false);
      } else if (data.tipo === 'nuovo-messaggio') {
        setMessages(prev => [...prev, { sender: data.sender, text: data.text, timestamp: data.timestamp }]);
      } else if (data.tipo === 'tono-cambiato') {
        setStudentTono(prev => ({ ...prev, [data.nome]: { tono: data.tono, timestamp: data.timestamp } }));
      } else if (data.tipo === 'quiz-iniziato') {
        setRespondedCount(0);
        setQuiz(data);
      } else if (data.tipo === 'quiz-progresso') {
        setRespondedCount(data.risposte);
      } else if (data.tipo === 'quiz-terminato') {
        setQuiz(data);
      } else if (data.tipo === 'visita-chiusa') {
        if (!closedRef.current) { closedRef.current = true; onClose(); }
      }
    };
    return () => es.close();
  }, [codice]);

  // Elenco ordinato dei gruppi opera della visita, per il salto manuale.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}`);
        const d = await r.json();
        const groups = d.ok ? (d.data?.operaGroups || []) : [];
        if (!cancelled) setVisitaItems(groups); // [{ operaId, itemIds }]
      } catch (_) {}
    })();
    return () => { cancelled = true; };
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

  async function handleAvviaAudio(tono, durata) {
    // Aggiornamento ottimistico: non aspetta il giro di ritorno da SSE per
    // reagire sul dispositivo della docente stessa, che altrimenti sentirebbe
    // un ritardo prima che l'audio riparta.
    setAudioAvviato(true);
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/audio`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tono, durata }),
      });
    } catch (_) { /* silent */ }
  }

  async function handleFermaAudio() {
    // Idem: ferma subito in locale, la conferma via SSE arriva comunque dopo.
    setAudioAvviato(false);
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/audio/stop`, { method: 'POST' });
    } catch (_) { /* silent */ }
  }

  async function handleAvviaQuiz() {
    setQuizAvviando(true);
    try {
      const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}/quiz/avvia`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok || d.error) showAlert(d.error || 'Impossibile avviare il quiz.');
    } catch (e) {
      showAlert('Impossibile raggiungere il server.');
    } finally {
      setQuizAvviando(false);
    }
  }

  async function handleTerminaQuizOra() {
    setQuizTerminandoOra(true);
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/quiz/termina`, { method: 'POST' });
    } finally {
      setQuizTerminandoOra(false);
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
      operaGroup={currentOperaGroup}
      currentIdx={currentItemIdx}
      totalItems={totalItems}
      isDocente={true}
      codice={codice}
      visitaNome={visitaNome}
      onBack={onClose}
      messages={messages}
      studentTono={studentTono}
      visitaItems={visitaItems}
      hasQuiz={hasQuiz}
      quiz={quiz}
      respondedCount={respondedCount}
      totalStudenti={studenti.length}
      onAvviaQuiz={handleAvviaQuiz}
      quizAvviando={quizAvviando}
      onTerminaQuizOra={handleTerminaQuizOra}
      quizTerminandoOra={quizTerminandoOra}
      audioAvviato={audioAvviato}
      onAvviaAudio={handleAvviaAudio}
      onFermaAudio={handleFermaAudio}
      inAscolto={inAscolto}
    />
  );

  return (
    <>
      {museoHeader}
      {backBar}
      <div className="lobby-root" style={{ flex: 1, minHeight: 0 }}>
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
                {studenti.map((s, i) => {
                  const roleCfg = ROLE_MAP[s.ruolo];
                  return (
                    <li key={i} className="lobby-student-item">
                      <span className="lobby-avatar" style={roleCfg ? avatarStyle(roleCfg) : undefined}>
                        {roleCfg ? '' : s.nome[0]}
                      </span>
                      {s.nome}
                    </li>
                  );
                })}
              </ul>
            )
          }
        </section>

        <button
          className="inizia-btn"
          disabled={avviando}
          onClick={handleAvvia}
        >
          {avviando
            ? 'Avvio in corso…'
            : studenti.length === 0
              ? 'Inizia Visita da solo/a'
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
  const [studenti,          setStudenti]          = React.useState([]);
  const [stato,             setStato]             = React.useState('attesa');
  const [museoIsil,         setMuseoIsil]         = React.useState(initialMuseoIsil || null);
  const [currentOperaGroup, setCurrentOperaGroup] = React.useState(null);
  const [currentItemIdx,    setCurrentItemIdx]    = React.useState(0);
  const [totalItems,        setTotalItems]        = React.useState(0);
  const [visitaNome,        setVisitaNome]        = React.useState('');
  const [quiz,              setQuiz]              = React.useState(null);
  const [audioAvviato,      setAudioAvviato]      = React.useState(false);
  const [visitaItems,       setVisitaItems]       = React.useState([]);
  // Tono/durata scelti dalla docente per la narrazione sincronizzata: senza
  // questi lo studente riprodurrebbe il proprio tono locale di default
  // ('medio'), disallineato da quello che la docente ha effettivamente avviato.
  const [docenteTono,       setDocenteTono]       = React.useState(null);
  const [docenteDurata,     setDocenteDurata]     = React.useState(null);

  // Elenco ordinato dei gruppi opera della visita: serve a VisitaItemScreen
  // per precaricare le immagini di tutte le opere non appena la visita parte.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}`);
        const d = await r.json();
        const groups = d.ok ? (d.data?.operaGroups || []) : [];
        if (!cancelled) setVisitaItems(groups); // [{ operaId, itemIds }]
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [codice]);

  React.useEffect(() => {
    const es = new EventSource(`/api/sessioni/${encodeURIComponent(codice)}/stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'stato-iniziale') {
        setStudenti(data.studenti);
        setStato(data.stato);
        if (data.museoIsil)                   setMuseoIsil(data.museoIsil);
        if (data.currentOperaGroup !== undefined) setCurrentOperaGroup(data.currentOperaGroup);
        if (data.currentItemIdx    !== undefined) setCurrentItemIdx(data.currentItemIdx);
        if (data.totalItems        !== undefined) setTotalItems(data.totalItems);
        if (data.quiz)                            setQuiz(data.quiz);
        setAudioAvviato(!!data.audioAvviato);
        setDocenteTono(data.tono || null);
        setDocenteDurata(data.durata || null);
      } else if (data.tipo === 'studente-connesso') {
        setStudenti(data.studenti);
      } else if (data.tipo === 'visita-iniziata') {
        setStato('iniziata');
        if (data.museoIsil)                   setMuseoIsil(data.museoIsil);
        if (data.currentOperaGroup !== undefined) setCurrentOperaGroup(data.currentOperaGroup);
        if (data.currentItemIdx    !== undefined) setCurrentItemIdx(data.currentItemIdx);
        if (data.totalItems        !== undefined) setTotalItems(data.totalItems);
        setAudioAvviato(false);
        setDocenteTono(null);
        setDocenteDurata(null);
      } else if (data.tipo === 'item-cambiato') {
        setCurrentOperaGroup(data.currentOperaGroup);
        setCurrentItemIdx(data.currentItemIdx);
        setTotalItems(data.totalItems);
        setAudioAvviato(false);
        setDocenteTono(null);
        setDocenteDurata(null);
      } else if (data.tipo === 'audio-avviato') {
        setAudioAvviato(true);
        setDocenteTono(data.tono || null);
        setDocenteDurata(data.durata || null);
      } else if (data.tipo === 'audio-fermato') {
        setAudioAvviato(false);
      } else if (data.tipo === 'quiz-iniziato') {
        setQuiz(data);
      } else if (data.tipo === 'quiz-terminato') {
        setQuiz(data);
      } else if (data.tipo === 'visita-chiusa') {
        onBack();
      }
    };
    return () => es.close();
  }, [codice]);

  async function handleRispondiQuiz(risposte) {
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/quiz/rispondi`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeAssegnato, risposte }),
      });
    } catch (e) { /* silent */ }
  }

  if (stato === 'iniziata') return (
    <VisitaItemScreen
      operaGroup={currentOperaGroup}
      currentIdx={currentItemIdx}
      totalItems={totalItems}
      isDocente={false}
      codice={codice}
      visitaNome={visitaNome}
      onBack={onBack}
      nomeAssegnato={nomeAssegnato}
      quiz={quiz}
      onRispondiQuiz={handleRispondiQuiz}
      audioAvviato={audioAvviato}
      syncTono={docenteTono}
      syncDurata={docenteDurata}
      visitaItems={visitaItems}
    />
  );

  return (
    <div className="lobby-root">
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
              {studenti.map((s, i) => {
                const roleCfg = ROLE_MAP[s.ruolo];
                return (
                  <span
                    key={i}
                    className={`lobby-avatar${s.nome === nomeAssegnato ? ' lobby-avatar--me' : ''}`}
                    style={roleCfg ? avatarStyle(roleCfg) : undefined}
                    title={s.nome}
                  >
                    {roleCfg ? '' : s.nome[0]}
                  </span>
                );
              })}
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
  scale:       { icon: 'fa-stairs',           label: 'Scale' },
  ascensore:   { icon: 'fa-arrows-up-down',   label: 'Ascensore' },
  bagno:       { icon: 'fa-restroom',         label: 'Bagni' },
  caffetteria: { icon: 'fa-mug-saucer',       label: 'Caffetteria' },
  ingresso:    { icon: 'fa-door-open',        label: 'Ingresso' },
  U:           { icon: 'fa-right-from-bracket', label: 'Uscita' },
};

/* room_id used for temporary-exhibition rooms — these stay clickable
   (they can hold opere) but get a marker icon + a friendlier display name. */
const TEMP_EXHIBIT_ID = 'mostre_temp';

function roomDisplayName(roomId) {
  return roomId === TEMP_EXHIBIT_ID ? 'Sale per Mostre temporanee' : `Sala ${roomId}`;
}

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

      {/* Fixed bottom panel — always visible regardless of scroll position */}
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

/* ── VisitaItemRoomMap ────────────────────────────────────
   Non-interactive floor-plan shown during an active visita:
   highlights the room containing the current item's opera.
   No room is clickable — this is a "you are here" reference,
   not the exploratory map from VisitaGeoScreen. Renders
   nothing if the museum has no geoJson floor plan or the
   opera's sala isn't found in it (only shown "se disponibile").
───────────────────────────────────────────────────────── */
function VisitaItemRoomMap({ museumId, operaId, logisticsTarget = null }) {
  const [sala,     setSala]     = React.useState(null);
  const [museo,    setMuseo]    = React.useState(null);
  const [floorDef, setFloorDef] = React.useState(null);
  const [geoJson,  setGeoJson]  = React.useState(null);

  React.useEffect(() => {
    setSala(null);
    if (!museumId || !operaId) return;
    fetch(`/api/opere?codiceIsil=${encodeURIComponent(museumId)}`)
      .then(r => r.json())
      .then(d => {
        const op = (d.data || []).find(o => o.operaId === operaId);
        setSala(op?.sala || null);
      })
      .catch(() => setSala(null));
  }, [museumId, operaId]);

  React.useEffect(() => {
    setMuseo(null);
    if (!museumId) return;
    fetch(`/api/musei/${encodeURIComponent(museumId)}`)
      .then(r => r.json())
      .then(d => setMuseo(d.ok ? applyFloorPlanOverrides(d.data) : null))
      .catch(() => setMuseo(null));
  }, [museumId]);

  // Stanza/piano da evidenziare: normalmente la sala dell'opera corrente, ma
  // un comando vocale logistico ("dov'è l'uscita/la toilette") la sostituisce
  // temporaneamente con l'amenity richiesta sul piano più vicino già scelto
  // in VisitaItemScreen — qui basta caricare direttamente quel piano invece
  // di ricercare la sala tra tutti i piani.
  const targetRoomId = logisticsTarget?.roomId ?? (sala != null ? String(sala) : null);

  React.useEffect(() => {
    setFloorDef(null);
    setGeoJson(null);
    if (!museo?.mappaInterna?.length) return;
    let cancelled = false;
    (async () => {
      if (logisticsTarget) {
        const piano = museo.mappaInterna.find(p => p.piano === logisticsTarget.piano) || museo.mappaInterna[0];
        if (!piano?.geoJsonUrl) return;
        try {
          const res = await fetch(piano.geoJsonUrl);
          const geo = await res.json();
          if (!cancelled) { setFloorDef(piano); setGeoJson(geo); }
        } catch (_) { /* mappa non disponibile per quel piano */ }
        return;
      }
      if (sala == null) return;
      for (const piano of museo.mappaInterna) {
        if (!piano.geoJsonUrl) continue;
        try {
          const res  = await fetch(piano.geoJsonUrl);
          const geo  = await res.json();
          const found = (geo.features || []).some(f => f.properties?.room_id === String(sala));
          if (found) {
            if (!cancelled) { setFloorDef(piano); setGeoJson(geo); }
            return;
          }
        } catch (_) { /* prova il prossimo piano */ }
      }
    })();
    return () => { cancelled = true; };
  }, [museo, sala, logisticsTarget]);

  if (!floorDef || !geoJson) return null;

  const viewBox = `0 0 ${floorDef.imgWidth || 437} ${floorDef.imgHeight || 600}`;
  const legendIds = [...new Set(geoJson.features.map(f => f.properties.room_id))]
    .filter(id => AMENITY_ICONS[id]);

  return (
    <div className="visita-item-map">
      <p className="visita-item-map-title">
        <i className="fa-solid fa-map-location-dot" style={{ marginRight: '6px' }} />
        {logisticsTarget
          ? <>Stai cercando: {AMENITY_ICONS[logisticsTarget.roomId]?.label || 'Punto di interesse'}</>
          : <>Ti trovi in: {roomDisplayName(String(sala))}</>}
      </p>
      <div className="geo-floorplan-wrap">
        <img className="geo-floorplan-img" src={floorDef.url} alt={floorDef.piano || 'Planimetria'} />
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

/* ── ReorderScreen ───────────────────────────────────────
   Mostrata al docente prima della lobby: raggruppa gli items per opera,
   mostrando una card per opera. Il docente può riordinare le opere;
   onConfirm riceve operaGroups: [{ operaId, itemIds }].
───────────────────────────────────────────────────────── */
function ReorderScreen({ visita, onBack, onConfirm }) {
  // groups: [{ operaId, itemIds: [id, ...] }]
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
        // Raggruppa mantenendo l'ordine di prima apparizione
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

/* ── App principale ─────────────────────────────────────── */

function App() {
  const [screen,         setScreen]         = React.useState('loading');
  const [musei,          setMusei]          = React.useState([]);
  const [museo,          setMuseo]          = React.useState(null);
  const [visite,         setVisite]         = React.useState([]);
  const [lobby,          setLobby]          = React.useState(null);
  const [error,          setError]          = React.useState(null);
  const [search,         setSearch]         = React.useState('');
  const [soloConiVisite, setSoloConiVisite] = React.useState(false);
  const [museiConVisite, setMuseiConVisite] = React.useState(new Set());
  const [reorderVisita,  setReorderVisita]  = React.useState(null);

  const userId   = localStorage.getItem('userId')   || '';
  const codiceIsil = new URLSearchParams(window.location.search).get('museo');
  const museiRef = React.useRef([]);
  React.useEffect(() => { museiRef.current = musei; }, [musei]);

  React.useEffect(() => {
    (async () => {
      const saved = loadNavSession();
      if (saved?.codice && saved?.role) {
        try {
          const r = await fetch(`/api/sessioni/${encodeURIComponent(saved.codice)}`);
          const d = await r.json();
          if (d.ok) {
            if (saved.role === 'docente') {
              if (saved.museoIsil) {
                try {
                  const rm = await fetch(`/api/musei/${encodeURIComponent(saved.museoIsil)}`);
                  const dm = await rm.json();
                  if (dm.data) setMuseo(applyFloorPlanOverrides(dm.data));
                } catch (_) {}
              }
              setLobby({ codice: saved.codice, visitaNome: saved.visitaNome });
              setScreen('lobby-docente');
              return;
            }
            if (saved.role === 'studente') {
              setLobby({ codice: saved.codice, myName: saved.nomeAssegnato, museoIsil: saved.museoIsil });
              setScreen('lobby-studente');
              return;
            }
          }
          // Sessione non più valida (chiusa/scaduta lato server): pulisci e riparti normalmente.
          clearNavSession();
        } catch (_) {
          clearNavSession();
        }
      }
      if (codiceIsil) {
        selectMuseo(codiceIsil);
      } else {
        loadMusei();
      }
    })();

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

      // Carica le visite dell'utente per sapere quali musei hanno visite sue
      if (userId) {
        try {
          const vParams = new URLSearchParams({ autoreId: userId });
          try {
            const p = JSON.parse(localStorage.getItem(`purchases_${userId}`) || '{"visite":[]}');
            if (p.visite?.length) vParams.set('ids', p.visite.join(','));
          } catch (_) {}
          const vRes  = await fetch(`/api/visite?${vParams}`);
          const vData = await vRes.json();
          if (vData.ok && Array.isArray(vData.data)) {
            setMuseiConVisite(new Set(vData.data.map(v => v.codiceIsil).filter(Boolean)));
          }
        } catch (_) {}
      }

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
      if (userId) params.set('autoreId', userId);
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

  function handleAvvia(visita) {
    setReorderVisita(visita);
    setScreen('reorder');
  }

  async function handleCreaSessione(visita, operaGroups) {
    let codice = generateCode(visita);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res  = await fetch('/api/sessioni', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            codice,
            visitaId:    visita._id,
            visitaNome:  visita.nomeVisita,
            museoIsil:   museo.codiceIsil,
            operaGroups,
            hasQuiz:     (visita.quizDomande || []).length > 0,
          }),
        });
        const data = await res.json();
        if (res.ok && !data.error) {
          setLobby({ codice, visitaNome: visita.nomeVisita });
          saveNavSession({ role: 'docente', codice, visitaNome: visita.nomeVisita, museoIsil: museo.codiceIsil });
          window.history.pushState({ screen: 'lobby-docente' }, '', window.location.href);
          setScreen('lobby-docente');
          return;
        }
        if (attempt < 2) {
          codice = generateCode(visita) + '-' + (Math.floor(Math.random() * 90) + 10);
        } else {
          showAlert(data.error || `Errore ${res.status}`);
        }
      } catch (e) {
        showAlert(`Impossibile raggiungere il server: ${e.message}`);
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

  // Unica via d'uscita per i partecipanti: il pulsante "Esci" dentro la visita
  // (o la chiusura da parte della docente). Un reload non deve mai passare di qui.
  const exitStudente = () => { clearNavSession(); setLobby(null); setScreen('musei'); };

  if (screen === 'lobby-studente') return (
    <LobbyStudente
      codice={lobby.codice}
      nomeAssegnato={lobby.myName}
      museoIsil={lobby.museoIsil}
      onBack={exitStudente}
    />
  );

  if (screen === 'reorder' && reorderVisita) return (
    <ReorderScreen
      visita={reorderVisita}
      onBack={() => setScreen('visite')}
      onConfirm={(operaGroups) => handleCreaSessione(reorderVisita, operaGroups)}
    />
  );

  // Unica via d'uscita per la docente: "Annulla sessione" (prima dell'avvio) o
  // "Termina visita" (durante), entrambi passano per onClose. Niente sidebar
  // qui sotto (Musei/Marketplace/Unisciti) — non deve esistere un'uscita implicita.
  const closeSession = () => { clearNavSession(); setLobby(null); setScreen('visite'); };

  if (screen === 'lobby-docente') return (
    <LobbyDocente codice={lobby.codice} visitaNome={lobby.visitaNome} museo={museo} onClose={closeSession} />
  );

  /* screen === 'musei' | 'join' | 'visite' */
  const joinClick    = () => { window.history.pushState({ screen: 'join' }, '', window.location.href); setScreen('join'); };

  const goMarketplace = () => setScreen('marketplace');

  const sidebarLinks = screen === 'visite'
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
    (!search.trim() ||
      m.nome.toLowerCase().includes(search.toLowerCase()) ||
      (m.citta || '').toLowerCase().includes(search.toLowerCase())) &&
    (!soloConiVisite || museiConVisite.has(m.codiceIsil))
  );

  return (
    <div className="admin-layout">
      <Sidebar contextLabel="Navigator" links={sidebarLinks} />
      <MobileMenu contextLabel="ArtAround." links={sidebarLinks} />

      <main className={`main-content${screen === 'visite' ? ' main-content--visite' : screen === 'marketplace' ? ' main-content--lobby' : ''}`}>
        {screen === 'musei' ? (
          <>
            <header className="content-header">
              <div>
                <h1 className="page-title">Esplora Musei</h1>
                <p>Scegli un museo per vedere le tue visite</p>
              </div>
            </header>

            <div className="toolbar-section">
              <div className="musei-toolbar-row">
                <div className="search-box-container" style={{ flex: 1 }}>
                  <i className="fa-solid fa-magnifying-glass search-icon" />
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Cerca museo o città…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {userId && museiConVisite.size > 0 && (
                  <button
                    className={`musei-visite-filter${soloConiVisite ? ' musei-visite-filter--active' : ''}`}
                    onClick={() => setSoloConiVisite(v => !v)}
                    title={soloConiVisite ? 'Mostra tutti i musei' : 'Mostra solo musei con le mie visite'}
                  >
                    <i className="fa-solid fa-ticket" />
                    {soloConiVisite ? 'Tutti i musei' : 'Le mie visite'}
                  </button>
                )}
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
                    <div className="picker-card-footer">
                      <span className="picker-card-isil">{m.codiceIsil}</span>
                      {museiConVisite.has(m.codiceIsil) && (
                        <span className="picker-card-mie-visite">
                          <i className="fa-solid fa-ticket" /> Le mie visite
                        </span>
                      )}
                    </div>
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
        ) : (
          <JoinContent
            onJoined={(codice, nome, museoIsil) => {
              setLobby({ codice, myName: nome, museoIsil });
              saveNavSession({ role: 'studente', codice, nomeAssegnato: nome, museoIsil });
              setScreen('lobby-studente');
            }}
          />
        )}
      </main>
    </div>
  );
}

/* ── Mount ──────────────────────────────────────────── */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
