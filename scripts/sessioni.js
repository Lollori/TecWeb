// Sessioni sincronizzate in memoria (ephemeral – no persistence needed)
const sessions = new Map();

function createSession(codice, visitaId, visitaNome, museoIsil, itemIds) {
  if (sessions.has(codice)) {
    return { error: 'Codice già in uso. Scegli un nome diverso.' };
  }
  sessions.set(codice, {
    codice, visitaId, visitaNome, museoIsil,
    itemIds: Array.isArray(itemIds) ? itemIds : [],
    currentItemIdx: 0,
    studenti: [],
    stato: 'attesa',      // 'attesa' | 'iniziata'
    clients: new Set(),
    studentCount: 0,
    messages: [],
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
  return { ok: true, nome, museoIsil: session.museoIsil };
}

function startSession(codice) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  session.stato = 'iniziata';
  const currentItemId = session.itemIds[session.currentItemIdx] || null;
  broadcast(codice, {
    tipo: 'visita-iniziata',
    museoIsil: session.museoIsil,
    currentItemId,
    currentItemIdx: session.currentItemIdx,
    totalItems: session.itemIds.length,
  });
  return { ok: true };
}

function navigaItem(codice, direction) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
  if (session.stato !== 'iniziata') return { error: 'Visita non ancora iniziata.' };
  const total = session.itemIds.length;
  if (total === 0) return { error: 'Nessun item nella visita.' };
  let newIdx = session.currentItemIdx;
  if (direction === 'avanti')   newIdx = Math.min(total - 1, newIdx + 1);
  else if (direction === 'indietro') newIdx = Math.max(0, newIdx - 1);
  if (newIdx === session.currentItemIdx) return { ok: true, currentItemIdx: newIdx, noChange: true };
  session.currentItemIdx = newIdx;
  const currentItemId = session.itemIds[newIdx];
  broadcast(codice, {
    tipo: 'item-cambiato',
    currentItemId,
    currentItemIdx: newIdx,
    totalItems: total,
  });
  return { ok: true, currentItemIdx: newIdx };
}

function addClient(codice, res) {
  const session = sessions.get(codice);
  if (!session) return false;
  session.clients.add(res);
  res.on('close', () => session.clients.delete(res));
  const currentItemId = session.itemIds[session.currentItemIdx] || null;
  res.write(`data: ${JSON.stringify({
    tipo: 'stato-iniziale',
    studenti: session.studenti,
    stato: session.stato,
    museoIsil: session.museoIsil,
    currentItemId,
    currentItemIdx: session.currentItemIdx,
    totalItems: session.itemIds.length,
  })}\n\n`);
  return true;
}

function closeSession(codice) {
  const session = sessions.get(codice);
  if (!session) return { error: 'Sessione non trovata.' };
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

function broadcast(codice, data) {
  const session = sessions.get(codice);
  if (!session) return;
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of session.clients) {
    try { client.write(msg); } catch (_) {}
  }
}

module.exports = { createSession, getSession, joinSession, startSession, addClient, navigaItem, closeSession, sendMessage };
