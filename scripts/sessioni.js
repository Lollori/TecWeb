// Sessioni sincronizzate in memoria (ephemeral – no persistence needed)
const sessions = new Map();

function createSession(codice, visitaId, visitaNome, museoIsil) {
  if (sessions.has(codice)) {
    return { error: 'Codice già in uso. Scegli un nome diverso.' };
  }
  sessions.set(codice, {
    codice, visitaId, visitaNome, museoIsil,
    studenti: [],
    stato: 'attesa',      // 'attesa' | 'iniziata'
    clients: new Set(),
    studentCount: 0,
  });
  // Auto-cleanup after 4 hours
  setTimeout(() => sessions.delete(codice), 4 * 60 * 60 * 1000);
  return { ok: true, codice };
}

function getSession(codice) {
  return sessions.get(codice) || null;
}

function joinSession(codice) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata. Controlla il codice.' };
  if (session.stato === 'iniziata') return { error: 'La visita è già iniziata.' };
  session.studentCount++;
  const nome = `Studente ${session.studentCount}`;
  session.studenti.push({ nome });
  broadcast(codice, { tipo: 'studente-connesso', studenti: session.studenti });
  return { ok: true, nome };
}

function startSession(codice) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  session.stato = 'iniziata';
  broadcast(codice, { tipo: 'visita-iniziata' });
  return { ok: true };
}

function addClient(codice, res) {
  const session = sessions.get(codice);
  if (!session) return false;
  session.clients.add(res);
  res.on('close', () => session.clients.delete(res));
  // Send current state immediately on connect
  res.write(`data: ${JSON.stringify({ tipo: 'stato-iniziale', studenti: session.studenti, stato: session.stato })}\n\n`);
  return true;
}

function broadcast(codice, data) {
  const session = sessions.get(codice);
  if (!session) return;
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of session.clients) {
    try { client.write(msg); } catch (_) {}
  }
}

module.exports = { createSession, getSession, joinSession, startSession, addClient };
