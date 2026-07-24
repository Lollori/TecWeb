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
  logistica:    [
    "dov'è l'uscita", "dov'è la toilette", "dove sono le scale", "dov'è l'ascensore",
    "dov'è la caffetteria", "dov'è l'ingresso", "dove sono le informazioni",
    "dov'è il guardaroba", "dov'è l'audioguida", "dov'è l'auditorium",
    "dov'è la sala conferenze", "dov'è l'area educativa", "dove sono le scale mobili",
    "dov'è il bagno per disabili", "dov'è il bagno delle donne", "dov'è il bagno degli uomini",
    "dov'è la sala allattamento", "dov'è l'area di riposo", "dov'è il negozio",
    "dov'è la libreria", "dov'è l'armadietto farmaceutico",
  ],
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
  const isBagno = t.includes('bagno') || t.includes('bagni') || t.includes('toilette') || t.includes('toilet');
  if (isBagno && (t.includes('disabili') || t.includes('mobilita ridotta') || t.includes('accessibile')))
                                                                return { categoria: 'logistica', azione: 'bagno_disabili' };
  if (isBagno && (t.includes('donne') || t.includes('donna'))) return { categoria: 'logistica', azione: 'bagno_donne' };
  if (isBagno && (t.includes('uomini') || t.includes('uomo'))) return { categoria: 'logistica', azione: 'bagno_uomini' };
  if (isBagno)                                                 return { categoria: 'logistica', azione: 'bagno' };
  if (t.includes('scale mobili') || t.includes('scala mobile'))
                                                                return { categoria: 'logistica', azione: 'scale_mobili' };
  if (t.includes('scala') || t.includes('scale'))              return { categoria: 'logistica', azione: 'scale' };
  if (t.includes('ascensore'))                                 return { categoria: 'logistica', azione: 'ascensore' };
  if (t.includes('caffetteria') || t.includes('caffe') || t.includes('bar'))
                                                                return { categoria: 'logistica', azione: 'caffetteria' };
  if (t.includes('ingresso') || t.includes('entrata'))         return { categoria: 'logistica', azione: 'ingresso' };
  if (t.includes('informazioni') || t.includes('info point'))  return { categoria: 'logistica', azione: 'info_point' };
  if (t.includes('guardaroba'))                                return { categoria: 'logistica', azione: 'guardaroba' };
  if (t.includes('audioguida') || t.includes('audio guida'))   return { categoria: 'logistica', azione: 'audio_guida' };
  if (t.includes('auditorium'))                                return { categoria: 'logistica', azione: 'auditorium' };
  if (t.includes('conferenz'))                                 return { categoria: 'logistica', azione: 'conferenze' };
  if (t.includes('educ'))                                      return { categoria: 'logistica', azione: 'educazione' };
  if (t.includes('allattamento'))                               return { categoria: 'logistica', azione: 'allattamento' };
  if (t.includes('riposo'))                                    return { categoria: 'logistica', azione: 'area_riposo' };
  if (t.includes('negozio'))                                   return { categoria: 'logistica', azione: 'negozio' };
  if (t.includes('libreria') || t.includes('libri'))           return { categoria: 'logistica', azione: 'libreria' };
  if (t.includes('farmac'))                                    return { categoria: 'logistica', azione: 'armadietto farmaceutico' };
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
