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


  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}`);
        const d = await r.json();
        const groups = d.ok ? (d.data?.operaGroups || []) : [];
        if (!cancelled) setVisitaItems(groups); 
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [codice]);


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


    setAudioAvviato(true);
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/audio`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tono, durata }),
      });
    } catch (_) {  }
  }

  async function handleFermaAudio() {

    setAudioAvviato(false);
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/audio/stop`, { method: 'POST' });
    } catch (_) {  }
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
