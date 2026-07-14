/* LobbyStudente.jsx - LobbyStudente */

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
