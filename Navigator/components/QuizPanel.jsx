/* QuizPanel.jsx - QuizPanel */

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
