// Uso: node scripts/fix-prado-sale.mjs [http://localhost:8000]
// Aggiorna solo il campo "sala" delle opere del Prado (ES-MA0001) nel DB
// live, leggendo i valori corretti da source/public/data/opere.json.
// Non tocca nessun'altra opera o museo.

import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:8000';
const opere = JSON.parse(fs.readFileSync('source/public/data/opere.json', 'utf8'))
  .filter(o => o.codiceIsil === 'ES-MA0001');

const res = await fetch(`${BASE}/api/opere?codiceIsil=ES-MA0001`);
const { ok, data } = await res.json();
if (!ok) { console.error('Errore nel recupero opere dal DB'); process.exit(1); }

let updated = 0;
for (const dbOp of data) {
  const src = opere.find(o => o.operaId === dbOp.operaId);
  if (!src) { console.warn('Nessuna corrispondenza per', dbOp.operaId); continue; }
  if (dbOp.sala === src.sala) continue;
  const r = await fetch(`${BASE}/api/opere/${dbOp._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sala: src.sala }),
  });
  const body = await r.json();
  if (body.ok) { updated++; console.log(`OK  ${dbOp.operaId}: "${dbOp.sala}" -> "${src.sala}"`); }
  else console.error(`FAIL ${dbOp.operaId}:`, body.error);
}
console.log(`\nAggiornate ${updated} opere.`);
