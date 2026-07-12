// Sessioni sincronizzate in memoria (ephemeral – no persistence needed)
const sessions = new Map();

function createSession(codice, visitaId, visitaNome, museoIsil, operaGroups, hasQuiz) {
  if (sessions.has(codice)) {
    return { error: 'Codice già in uso. Scegli un nome diverso.' };
  }
  sessions.set(codice, {
    codice, visitaId, visitaNome, museoIsil,
    // operaGroups: [{ operaId, itemIds }] — un gruppo per ogni opera, con tutti
    // gli item audio associati (uno per tono, o uno con tutti i toni compilati).
    operaGroups: Array.isArray(operaGroups) ? operaGroups : [],
    currentItemIdx: 0,
    studenti: [],
    stato: 'attesa',      // 'attesa' | 'iniziata'
    clients: new Set(),
    studentCount: 0,
    messages: [],
    studentTono: {},      // nome -> { tono, durata, timestamp }
    hasQuiz: !!hasQuiz,
    quiz: null,
    audioAvviato: false,
    // Tono/durata scelti dalla docente per la narrazione sincronizzata
    // ("Avvia audio per tutti") — trasmessi agli studenti così sentono lo
    // stesso contenuto che ha avviato lei, non un default locale.
    tono: null,
    durata: null,
    // Nomi degli studenti che stanno ascoltando la narrazione sincronizzata
    // in questo momento: finché non è vuoto la docente non può passare
    // all'item successivo (vedi navigaItem).
    studentiInAscolto: new Set(),
  });
  // Auto-cleanup after 4 hours
  setTimeout(() => sessions.delete(codice), 4 * 60 * 60 * 1000);
  return { ok: true, codice };
}

function getSession(codice) {
  return sessions.get(codice) || null;
}

function joinSession(codice, nomeRichiesto, ruolo) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata. Controlla il codice.' };
  // Ci si può unire anche a visita già iniziata: il client si sincronizza da
  // solo con lo stato corrente (opera/tono/quiz/audio) tramite il messaggio
  // 'stato-iniziale' che riceve appena apre la connessione SSE (addClient).
  session.studentCount++;
  let nome = (nomeRichiesto || '').trim() || `Studente ${session.studentCount}`;
  if (session.studenti.some(s => s.nome === nome)) nome = `${nome} (${session.studentCount})`;
  session.studenti.push({ nome, ruolo: (ruolo || '').trim() });
  broadcast(codice, { tipo: 'studente-connesso', studenti: session.studenti });
  return { ok: true, nome, museoIsil: session.museoIsil };
}

function startSession(codice) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  session.stato = 'iniziata';
  session.audioAvviato = false;
  session.tono = null;
  session.durata = null;
  session.studentiInAscolto.clear();
  const currentOperaGroup = session.operaGroups[session.currentItemIdx] || null;
  broadcast(codice, {
    tipo: 'visita-iniziata',
    museoIsil: session.museoIsil,
    currentOperaGroup,
    currentItemIdx: session.currentItemIdx,
    totalItems: session.operaGroups.length,
    hasQuiz: session.hasQuiz,
  });
  return { ok: true };
}

function navigaItem(codice, direction, index) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  if (session.stato !== 'iniziata') return { error: 'Visita non ancora iniziata.' };
  const total = session.operaGroups.length;
  if (total === 0) return { error: 'Nessuna opera nella visita.' };
  let newIdx = session.currentItemIdx;
  if (Number.isInteger(index))                               newIdx = Math.max(0, Math.min(total - 1, index));
  else if (direction === 'avanti' || direction === 'next')   newIdx = Math.min(total - 1, newIdx + 1);
  else if (direction === 'indietro' || direction === 'prev') newIdx = Math.max(0, newIdx - 1);
  if (newIdx === session.currentItemIdx) return { ok: true, currentItemIdx: newIdx, noChange: true };
  // Il blocco vale solo per l'avanzamento: tornare indietro non disturba
  // nessuno, quindi resta sempre permesso anche a studenti in ascolto.
  if (newIdx > session.currentItemIdx && session.studentiInAscolto.size > 0) {
    return { error: 'Ci sono ancora studenti in ascolto.', code: 'STUDENTI_IN_ASCOLTO' };
  }
  session.currentItemIdx = newIdx;
  session.audioAvviato = false;
  session.tono = null;
  session.durata = null;
  const currentOperaGroup = session.operaGroups[newIdx];
  broadcast(codice, {
    tipo: 'item-cambiato',
    currentOperaGroup,
    currentItemIdx: newIdx,
    totalItems: total,
  });
  return { ok: true, currentItemIdx: newIdx };
}

function avviaAudio(codice, tono, durata) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  if (session.stato !== 'iniziata') return { error: 'Visita non ancora iniziata.' };
  session.audioAvviato = true;
  session.tono = tono || null;
  session.durata = durata || null;
  broadcast(codice, {
    tipo: 'audio-avviato',
    currentItemIdx: session.currentItemIdx,
    tono: session.tono,
    durata: session.durata,
  });
  return { ok: true };
}

// Ferma la narrazione sincronizzata per tutti (docente inclusa): la docente
// potrà poi farla ripartire, con lo stesso tono/durata o un altro.
function fermaAudio(codice) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  session.audioAvviato = false;
  session.studentiInAscolto.clear();
  broadcast(codice, { tipo: 'audio-fermato' });
  return { ok: true };
}

// Uno studente segnala se sta ascoltando o meno la narrazione sincronizzata:
// la docente non può passare all'item successivo finché l'insieme non è
// vuoto (vedi navigaItem). Verso il client basta un booleano, non i nomi.
function setAscolto(codice, nome, ascolto) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  if (!nome) return { error: 'Nome mancante.' };
  if (ascolto) session.studentiInAscolto.add(nome);
  else session.studentiInAscolto.delete(nome);
  broadcast(codice, { tipo: 'ascolto-cambiato', inAscolto: session.studentiInAscolto.size > 0 });
  return { ok: true };
}

function addClient(codice, res) {
  const session = sessions.get(codice);
  if (!session) return false;
  session.clients.add(res);
  res.on('close', () => session.clients.delete(res));
  const currentOperaGroup = session.operaGroups[session.currentItemIdx] || null;
  res.write(`data: ${JSON.stringify({
    tipo: 'stato-iniziale',
    studenti: session.studenti,
    stato: session.stato,
    museoIsil: session.museoIsil,
    currentOperaGroup,
    currentItemIdx: session.currentItemIdx,
    totalItems: session.operaGroups.length,
    studentTono: session.studentTono,
    tono: session.tono,
    durata: session.durata,
    hasQuiz: session.hasQuiz,
    quiz: publicQuiz(session.quiz),
    audioAvviato: session.audioAvviato,
    inAscolto: session.studentiInAscolto.size > 0,
  })}\n\n`);
  return true;
}

function closeSession(codice) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  if (session.quiz?.timer) clearTimeout(session.quiz.timer);
  broadcast(codice, { tipo: 'visita-chiusa' });
  sessions.delete(codice);
  return { ok: true };
}

function sendMessage(codice, sender, text) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  const trimmed = text?.trim();
  if (!trimmed) return { error: 'Messaggio vuoto.' };
  const msg = { sender, text: trimmed, timestamp: Date.now() };
  session.messages.push(msg);
  if (session.messages.length > 200) session.messages.shift();
  broadcast(codice, { tipo: 'nuovo-messaggio', ...msg });
  return { ok: true };
}

function setStudentTono(codice, nome, tono, durata) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  const entry = { tono, durata: durata || null, timestamp: Date.now() };
  session.studentTono[nome] = entry;
  broadcast(codice, { tipo: 'tono-cambiato', nome, ...entry });
  return { ok: true };
}

function broadcast(codice, data) {
  const session = sessions.get(codice);
  if (!session) return;
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of session.clients) {
    try { client.write(msg); } catch (_) {}
  }
}

function publicQuiz(quiz) {
  if (!quiz) return null;
  const { timer, ...rest } = quiz;
  if (quiz.stato === 'terminato') return rest;
  return {
    ...rest,
    domande: quiz.domande.map(d => ({ testo: d.testo, opzioni: d.opzioni })),
  };
}

/* ============================================================
   QUIZ DI FINE VISITA
   ============================================================ */

function avviaQuiz(codice, domande) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  if (!Array.isArray(domande) || !domande.length) {
    return { error: 'Questa visita non ha domande quiz.' };
  }
  if (session.quiz && session.quiz.stato === 'in-corso') {
    return { error: 'Il quiz è già in corso.' };
  }
  const durataSec = domande.length * 40;
  const scadenza  = Date.now() + durataSec * 1000;
  session.quiz = {
    domande,
    durataSec,
    scadenza,
    stato: 'in-corso',
    risposte: {},
    risultati: null,
    timer: setTimeout(() => terminaQuiz(codice), durataSec * 1000),
  };
  broadcast(codice, { tipo: 'quiz-iniziato', ...publicQuiz(session.quiz) });
  return { ok: true, durataSec, scadenza };
}

function rispondiQuiz(codice, nome, risposte) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  if (!nome) return { error: 'Nome mancante.' };
  if (!session.quiz || session.quiz.stato !== 'in-corso') {
    return { error: 'Nessun quiz in corso.' };
  }
  session.quiz.risposte[nome] = Array.isArray(risposte) ? risposte : [];
  broadcast(codice, {
    tipo: 'quiz-progresso',
    risposte: Object.keys(session.quiz.risposte).length,
  });
  return { ok: true };
}

function terminaQuiz(codice) {
  const session = sessions.get(codice);
  if (!session || !session.quiz) return { error: 'Nessun quiz in corso.' };
  if (session.quiz.stato === 'terminato') {
    return { ok: true, risultati: session.quiz.risultati };
  }
  clearTimeout(session.quiz.timer);
  const { domande, risposte } = session.quiz;

  const risultati = session.studenti.map(({ nome }) => {
    const rispostaStudente = risposte[nome] || [];
    let punteggio = 0;
    const dettaglio = domande.map((d, i) => {
      const rispostaData = rispostaStudente[i];
      const isCorrect = rispostaData === d.corretta;
      if (isCorrect) punteggio++;
      return {
        testo: d.testo,
        opzioni: d.opzioni,
        corretta: d.corretta,
        rispostaData: (rispostaData === undefined) ? null : rispostaData,
        isCorrect,
      };
    });
    return { nome, punteggio, totale: domande.length, dettaglio };
  }).sort((a, b) => b.punteggio - a.punteggio);

  session.quiz.stato = 'terminato';
  session.quiz.risultati = risultati;
  broadcast(codice, { tipo: 'quiz-terminato', ...publicQuiz(session.quiz) });
  return { ok: true, risultati };
}

module.exports = {
  createSession, getSession, joinSession, startSession, addClient, navigaItem, avviaAudio, fermaAudio,
  closeSession, sendMessage, setStudentTono, avviaQuiz, rispondiQuiz, terminaQuiz, setAscolto,
};
