function QuizPanel({
  quiz,
  isDocente,
  nomeAssegnato,
  respondedCount,
  totalStudenti,
  onRispondiQuiz,
  onTerminaQuizOra,
  quizTerminandoOra
}) {
  const [risposte, setRisposte] = React.useState(() => quiz.domande.map(() => null));
  const [inviato, setInviato] = React.useState(false);
  const [remaining, setRemaining] = React.useState(() => Math.max(0, Math.round((quiz.scadenza - Date.now()) / 1000)));
  const [filtroVisitatore, setFiltroVisitatore] = React.useState('');
  React.useEffect(() => {
    if (quiz.stato !== 'in-corso') return;
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.round((quiz.scadenza - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [quiz.stato, quiz.scadenza]);
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
  const minuti = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secondi = String(remaining % 60).padStart(2, '0');
  if (quiz.stato === 'terminato') {
    const risultati = quiz.risultati || [];
    const mio = !isDocente ? risultati.find(r => r.nome === nomeAssegnato) : null;
    const pct = (punteggio, totale) => totale > 0 ? Math.round(punteggio / totale * 100) : 0;
    const domandePiuSbagliate = risultati.length === 0 ? [] : risultati[0].dettaglio.map((d, i) => {
      const errati = risultati.filter(r => r.dettaglio[i] && !r.dettaglio[i].isCorrect).length;
      return {
        testo: d.testo,
        errati,
        totale: risultati.length,
        pct: pct(errati, risultati.length)
      };
    }).filter(d => d.errati > 0).sort((a, b) => b.errati - a.errati).slice(0, 5);
    const risultatiFiltrati = filtroVisitatore ? risultati.filter(r => r.nome === filtroVisitatore) : risultati;
    const dettaglioBlock = dettaglio => /*#__PURE__*/React.createElement("div", {
      className: "quiz-result-detail"
    }, dettaglio.map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `quiz-result-item${d.isCorrect ? ' quiz-result-item--ok' : ' quiz-result-item--ko'}`
    }, /*#__PURE__*/React.createElement("p", {
      className: "quiz-result-q"
    }, i + 1, ". ", d.testo), /*#__PURE__*/React.createElement("p", {
      className: "quiz-result-a"
    }, isDocente ? 'Risposta data' : 'Hai risposto', ": ", d.rispostaData != null ? d.opzioni[d.rispostaData] : /*#__PURE__*/React.createElement("em", null, "nessuna risposta")), !d.isCorrect && /*#__PURE__*/React.createElement("p", {
      className: "quiz-result-correct"
    }, "Corretta: ", d.opzioni[d.corretta]))));
    return /*#__PURE__*/React.createElement("div", {
      className: "quiz-panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "quiz-panel-header"
    }, /*#__PURE__*/React.createElement("i", {
      className: "fa-solid fa-trophy"
    }), /*#__PURE__*/React.createElement("h2", null, isDocente ? 'Risultati del quiz' : 'Quiz terminato')), isDocente ? /*#__PURE__*/React.createElement(React.Fragment, null, domandePiuSbagliate.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "quiz-most-missed-card"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "quiz-most-missed-title"
    }, /*#__PURE__*/React.createElement("i", {
      className: "fa-solid fa-triangle-exclamation"
    }), " Domande più sbagliate"), /*#__PURE__*/React.createElement("div", {
      className: "quiz-most-missed-list"
    }, domandePiuSbagliate.map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "quiz-most-missed-item"
    }, /*#__PURE__*/React.createElement("p", {
      className: "quiz-most-missed-q"
    }, d.testo), /*#__PURE__*/React.createElement("p", {
      className: "quiz-most-missed-stat"
    }, d.errati, " / ", d.totale, " risposte errate (", d.pct, "%)"))))), risultati.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "quiz-filter-bar"
    }, /*#__PURE__*/React.createElement("label", {
      htmlFor: "quiz-filtro-visitatore"
    }, "Visitatore"), /*#__PURE__*/React.createElement("select", {
      id: "quiz-filtro-visitatore",
      className: "quiz-filtro-select",
      value: filtroVisitatore,
      onChange: e => setFiltroVisitatore(e.target.value)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Tutti i visitatori"), risultati.map(r => /*#__PURE__*/React.createElement("option", {
      key: r.nome,
      value: r.nome
    }, r.nome)))), /*#__PURE__*/React.createElement("div", {
      className: "quiz-results-list"
    }, risultati.length === 0 && /*#__PURE__*/React.createElement("p", {
      className: "quiz-empty"
    }, "Nessun partecipante ha risposto."), risultatiFiltrati.map(r => /*#__PURE__*/React.createElement("details", {
      key: r.nome,
      className: "quiz-result-card"
    }, /*#__PURE__*/React.createElement("summary", null, /*#__PURE__*/React.createElement("span", {
      className: "quiz-result-name"
    }, r.nome), /*#__PURE__*/React.createElement("span", {
      className: "quiz-result-score"
    }, r.punteggio, " / ", r.totale, " · ", pct(r.punteggio, r.totale), "%")), dettaglioBlock(r.dettaglio))))) : /*#__PURE__*/React.createElement("div", {
      className: "quiz-my-result"
    }, mio ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "quiz-my-score"
    }, mio.punteggio, " / ", mio.totale), dettaglioBlock(mio.dettaglio)) : /*#__PURE__*/React.createElement("p", {
      className: "quiz-empty"
    }, "Non hai partecipato a questo quiz.")));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "quiz-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "quiz-panel-header"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-clock"
  }), /*#__PURE__*/React.createElement("h2", null, "Quiz finale"), /*#__PURE__*/React.createElement("span", {
    className: "quiz-countdown"
  }, minuti, ":", secondi)), isDocente ? /*#__PURE__*/React.createElement("div", {
    className: "quiz-docente-live"
  }, /*#__PURE__*/React.createElement("p", {
    className: "quiz-docente-live-text"
  }, "Il quiz è in corso — ", respondedCount, " / ", totalStudenti, " partecipanti hanno risposto."), /*#__PURE__*/React.createElement("button", {
    className: "visita-termina-btn",
    onClick: onTerminaQuizOra,
    disabled: quizTerminandoOra
  }, quizTerminandoOra ? 'Chiusura…' : 'Termina quiz ora')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "quiz-domande-list"
  }, quiz.domande.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "quiz-domanda-card"
  }, /*#__PURE__*/React.createElement("p", {
    className: "quiz-domanda-testo"
  }, i + 1, ". ", d.testo), /*#__PURE__*/React.createElement("div", {
    className: "quiz-opzioni-list"
  }, d.opzioni.map((o, j) => /*#__PURE__*/React.createElement("button", {
    key: j,
    className: `quiz-opzione-btn${risposte[i] === j ? ' quiz-opzione-btn--active' : ''}`,
    onClick: () => selezionaRisposta(i, j),
    disabled: inviato
  }, /*#__PURE__*/React.createElement("span", {
    className: "quiz-opzione-letter"
  }, ['A', 'B', 'C', 'D'][j]), o)))))), /*#__PURE__*/React.createElement("button", {
    className: "quiz-invia-btn",
    onClick: handleInvia,
    disabled: inviato
  }, inviato ? 'Risposte inviate — in attesa della fine del quiz…' : 'Invia risposte')));
}