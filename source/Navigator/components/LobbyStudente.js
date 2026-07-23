function LobbyStudente({
  codice,
  nomeAssegnato,
  museoIsil: initialMuseoIsil,
  onBack
}) {
  const [studenti, setStudenti] = React.useState([]);
  const [stato, setStato] = React.useState('attesa');
  const [museoIsil, setMuseoIsil] = React.useState(initialMuseoIsil || null);
  const [currentOperaGroup, setCurrentOperaGroup] = React.useState(null);
  const [currentItemIdx, setCurrentItemIdx] = React.useState(0);
  const [totalItems, setTotalItems] = React.useState(0);
  const [visitaNome, setVisitaNome] = React.useState('');
  const [quiz, setQuiz] = React.useState(null);
  const [audioAvviato, setAudioAvviato] = React.useState(false);
  const [visitaItems, setVisitaItems] = React.useState([]);
  const [docenteTono, setDocenteTono] = React.useState(null);
  const [docenteDurata, setDocenteDurata] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}`);
        const d = await r.json();
        const groups = d.ok ? d.data?.operaGroups || [] : [];
        if (!cancelled) setVisitaItems(groups);
      } catch (_) {}
    })();
    return () => {
      cancelled = true;
    };
  }, [codice]);
  React.useEffect(() => {
    const es = new EventSource(`/api/sessioni/${encodeURIComponent(codice)}/stream`);
    es.onmessage = e => {
      const data = JSON.parse(e.data);
      if (data.tipo === 'stato-iniziale') {
        setStudenti(data.studenti);
        setStato(data.stato);
        if (data.museoIsil) setMuseoIsil(data.museoIsil);
        if (data.currentOperaGroup !== undefined) setCurrentOperaGroup(data.currentOperaGroup);
        if (data.currentItemIdx !== undefined) setCurrentItemIdx(data.currentItemIdx);
        if (data.totalItems !== undefined) setTotalItems(data.totalItems);
        if (data.quiz) setQuiz(data.quiz);
        setAudioAvviato(!!data.audioAvviato);
        setDocenteTono(data.tono || null);
        setDocenteDurata(data.durata || null);
      } else if (data.tipo === 'studente-connesso') {
        setStudenti(data.studenti);
      } else if (data.tipo === 'visita-iniziata') {
        setStato('iniziata');
        if (data.museoIsil) setMuseoIsil(data.museoIsil);
        if (data.currentOperaGroup !== undefined) setCurrentOperaGroup(data.currentOperaGroup);
        if (data.currentItemIdx !== undefined) setCurrentItemIdx(data.currentItemIdx);
        if (data.totalItems !== undefined) setTotalItems(data.totalItems);
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: nomeAssegnato,
          risposte
        })
      });
    } catch (e) {}
  }
  if (stato === 'iniziata') return /*#__PURE__*/React.createElement(VisitaItemScreen, {
    operaGroup: currentOperaGroup,
    currentIdx: currentItemIdx,
    totalItems: totalItems,
    isDocente: false,
    codice: codice,
    visitaNome: visitaNome,
    onBack: onBack,
    nomeAssegnato: nomeAssegnato,
    quiz: quiz,
    onRispondiQuiz: handleRispondiQuiz,
    audioAvviato: audioAvviato,
    syncTono: docenteTono,
    syncDurata: docenteDurata,
    visitaItems: visitaItems
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "lobby-root"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-topbar"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "back-to-marketplace"
  }, "← Esci")), /*#__PURE__*/React.createElement("div", {
    className: "lobby-body lobby-body--center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lobby-spinner-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-spinner lobby-spinner"
  })), /*#__PURE__*/React.createElement("h2", {
    className: "lobby-waiting-title"
  }, "In attesa che l'insegnante avvii la visita…"), /*#__PURE__*/React.createElement("p", {
    className: "lobby-you-are"
  }, "Sei connesso come ", /*#__PURE__*/React.createElement("strong", null, nomeAssegnato)), /*#__PURE__*/React.createElement("div", {
    className: "lobby-code-box lobby-code-box--sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lobby-code-label"
  }, "Stanza:"), /*#__PURE__*/React.createElement("span", {
    className: "lobby-code"
  }, codice)), studenti.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "lobby-avatars-row"
  }, /*#__PURE__*/React.createElement("p", {
    className: "lobby-avatars-label"
  }, studenti.length, " in stanza"), /*#__PURE__*/React.createElement("div", {
    className: "lobby-avatars"
  }, studenti.map((s, i) => {
    const roleCfg = ROLE_MAP[s.ruolo];
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: `lobby-avatar${s.nome === nomeAssegnato ? ' lobby-avatar--me' : ''}`,
      style: roleCfg ? avatarStyle(roleCfg) : undefined,
      title: s.nome
    }, roleCfg ? '' : s.nome[0]);
  })))));
}