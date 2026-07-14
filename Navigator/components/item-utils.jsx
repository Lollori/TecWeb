/* item-utils.jsx - TONI_CONFIG, DURATE_CONFIG, toneText, findBestItem, voice commands */

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
