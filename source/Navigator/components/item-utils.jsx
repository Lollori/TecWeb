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


const VOICE_COMMANDS = {
  esplorazione: ['dimmi di più', 'dimmi di meno', "cos'è questo"],
  adattamento:  ['più semplice', 'troppo semplice', 'non capisco'],
  dettagli:     ["chi è l'autore", 'qual è lo stile'],
  logistica:    ["dov'è l'uscita", "dov'è la toilette", "dove sono le scale", "dov'è l'ascensore", "dov'è la caffetteria", "dov'è l'ingresso"],
};


function normalizeVoiceText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


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
  if (t.includes('scala') || t.includes('scale'))              return { categoria: 'logistica', azione: 'scale' };
  if (t.includes('ascensore'))                                 return { categoria: 'logistica', azione: 'ascensore' };
  if (t.includes('caffetteria') || t.includes('caffe') || t.includes('bar'))
                                                                return { categoria: 'logistica', azione: 'caffetteria' };
  if (t.includes('ingresso') || t.includes('entrata'))         return { categoria: 'logistica', azione: 'ingresso' };
  // "dov'è/dove si trova/dove sono + nome opera" — nessuna delle logistiche
  // sopra ha fatto match, quindi il resto della frase è considerato il nome
  // dell'opera cercata (accordo su singolare/plurale gestito dal chiamante).
  const doveMatch = t.match(/^dov\s*e\b\s*(.*)/);
  if (doveMatch) {
    let query = doveMatch[1].trim()
      .replace(/^(si trova|sono|e)\s+/, '')
      .replace(/^(il|lo|la|i|gli|le|l)\s+/, '')
      .trim();
    if (query) return { categoria: 'logistica', azione: 'opera', query };
  }
  return null;
}
