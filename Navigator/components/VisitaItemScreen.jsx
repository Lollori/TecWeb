/* VisitaItemScreen.jsx - VisitaItemScreen */


function VisitaItemScreen({
  operaGroup, currentIdx, totalItems, isDocente, codice, visitaNome, onBack,
  messages = [], nomeAssegnato = '', studentTono = {}, visitaItems = [],
  hasQuiz = false, quiz = null, respondedCount = 0, totalStudenti = 0,
  onAvviaQuiz, onTerminaQuizOra, quizAvviando = false, quizTerminandoOra = false, onRispondiQuiz,
  audioAvviato = false, onAvviaAudio, onFermaAudio, syncTono = null, syncDurata = null,
  inAscolto = false,
}) {
  const [allItems,      setAllItems]      = React.useState([]);
  const [activeItem,    setActiveItem]    = React.useState(null);
  const [loading,       setLoading]       = React.useState(false);
  const [navigating,    setNavigating]    = React.useState(false);
  const [tono,          setTono]          = React.useState('medio');
  const [durata,        setDurata]        = React.useState('d15');
  const [chatOpen,      setChatOpen]      = React.useState(false);
  const [composeOpen,   setComposeOpen]   = React.useState(false);
  const [msgText,       setMsgText]       = React.useState('');
  const [sending,       setSending]       = React.useState(false);
  const [unread,        setUnread]        = React.useState(0);
  const [terminating,   setTerminating]   = React.useState(false);
  const [monitorOpen,   setMonitorOpen]   = React.useState(false);
  const [itemsMenuOpen, setItemsMenuOpen] = React.useState(false);
  const [quizPromptOpen, setQuizPromptOpen] = React.useState(false);
  const [ttsMuted,      setTtsMuted]      = React.useState(false);
  const [ttsLoading,    setTtsLoading]    = React.useState(false);
  const [ascoltoPopupOpen, setAscoltoPopupOpen] = React.useState(false);
  const [ascoltoPopupTitolo, setAscoltoPopupTitolo] = React.useState('Non puoi andare avanti');
  const [ascoltoCountdown, setAscoltoCountdown] = React.useState(60);
  // 'mappa' | 'opera' | null — la visita inizia con la mappa aperta; da qui in
  // poi lo stato resta quello scelto dall'utente man mano che si avanza tra
  // gli item, dato che VisitaItemScreen non viene rimontato tra un item e
  // l'altro (solo itemId cambia). Mutuamente esclusivi, ma possono essere
  // entrambi chiusi (null).
  const [activePanel,   setActivePanel]   = React.useState('mappa');
  // Comandi vocali: mic on/off, testo trascritto e azione riconosciuta.
  const [micOn,            setMicOn]            = React.useState(false);
  const [micSupported]     = React.useState(() =>
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [voiceTranscript,  setVoiceTranscript]  = React.useState('');
  // Comando logistico attivo ("dov'è l'uscita/la toilette"): quale stanza
  // evidenziare in mappa e su quale piano — sovrascrive temporaneamente
  // l'evidenziazione della sala dell'opera corrente. Si azzera cambiando opera.
  const [logisticsTarget,  setLogisticsTarget]  = React.useState(null);
  const prevLenRef = React.useRef(0);
  const chatEndRef = React.useRef(null);
  const composeInputRef = React.useRef(null);
  const audioRef = React.useRef(null);
  // Canale audio separato da audioRef (usato per la narrazione sincronizzata
  // dalla docente): le risposte ai comandi vocali sono personali e devono
  // sempre essere udibili, a prescindere da "Avvia audio"/muto della docente.
  const assistantAudioRef = React.useRef(null);
  const recognitionRef = React.useRef(null);
  const micOnRef = React.useRef(false);
  // La callback di SpeechRecognition viene creata una sola volta al mount
  // (vedi effect sotto) e chiuderebbe su uno stato ormai vecchio se chiamasse
  // handleVoiceTranscript direttamente — passa invece sempre dall'ultima
  // versione della funzione tramite questo ref, aggiornato ad ogni render.
  const handleVoiceTranscriptRef = React.useRef(() => {});

  React.useEffect(() => {
    if (composeOpen && composeInputRef.current) composeInputRef.current.focus();
  }, [composeOpen]);

  // Impedisce lo scroll della pagina durante la visita: solo l'area centrale
  // dei contenuti (visita-item-content) deve scorrere, header e barra in
  // basso restano sempre visibili anche su mobile.
  React.useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      if (assistantAudioRef.current) {
        assistantAudioRef.current.pause();
        if (assistantAudioRef.current.src) URL.revokeObjectURL(assistantAudioRef.current.src);
        assistantAudioRef.current = null;
      }
    };
  }, []);

  // Comandi vocali: un'unica istanza di SpeechRecognition per tutta la
  // durata dello schermo, riavviata automaticamente finché il microfono
  // resta "acceso" — i browser interrompono il riconoscimento continuo dopo
  // un po' di silenzio anche con continuous:true, quindi senza il riavvio
  // in onend il microfono si spegnerebbe da solo invece di restare attivo
  // fino alla pressione successiva del pulsante, come richiesto.
  React.useEffect(() => {
    if (!micSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'it-IT';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
      }
      const testo = finalText.trim();
      if (testo) {
        setVoiceTranscript(testo);
        // Passa sempre dal ref: questa callback è fissata al mount, il ref
        // punta invece sempre alla versione più recente della funzione.
        handleVoiceTranscriptRef.current(testo);
      }
    };
    recognition.onerror = () => { /* silenzioso: onend riprova comunque */ };
    recognition.onend = () => {
      if (micOnRef.current) {
        try { recognition.start(); } catch (_) { /* già avviato */ }
      }
    };

    recognitionRef.current = recognition;
    return () => {
      micOnRef.current = false;
      try { recognition.stop(); } catch (_) {}
      recognitionRef.current = null;
    };
  }, [micSupported]);

  // Risponde vocalmente a una richiesta dell'utente (canale indipendente
  // dalla narrazione sincronizzata, sempre udibile).
  function speakAssistant(text) {
    if (assistantAudioRef.current) {
      assistantAudioRef.current.pause();
      if (assistantAudioRef.current.src) URL.revokeObjectURL(assistantAudioRef.current.src);
      assistantAudioRef.current = null;
    }
    fetch('/api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then(r => { if (!r.ok) throw new Error('tts fallita'); return r.blob(); })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        assistantAudioRef.current = audio;
        audio.play().catch(() => {});
      })
      .catch(() => {});
  }

  // "Dov'è l'uscita?" / "Dov'è la toilette?" — cerca su tutti i piani del
  // museo la sala amenity richiesta (room_id 'U' per l'uscita, 'bagno' per
  // le toilette), sceglie il piano più vicino a quello dell'opera corrente,
  // lo annuncia a voce e apre la mappa su quel piano evidenziando la sala.
  async function locateAmenity(kind) {
    const label = kind === 'U' ? "L'uscita" : 'La toilette';
    if (!activeItem?.museumId || !operaGroup?.operaId) {
      speakAssistant(`${label}: mappa non disponibile al momento.`);
      return;
    }
    try {
      const [rMuseo, rOpere] = await Promise.all([
        fetch(`/api/musei/${encodeURIComponent(activeItem.museumId)}`),
        fetch(`/api/opere?codiceIsil=${encodeURIComponent(activeItem.museumId)}`),
      ]);
      const [dMuseo, dOpere] = await Promise.all([rMuseo.json(), rOpere.json()]);
      const museo = dMuseo.ok ? applyFloorPlanOverrides(dMuseo.data) : null;
      const piani = museo?.mappaInterna || [];
      if (!piani.length) { speakAssistant(`${label}: mappa non disponibile per questo museo.`); return; }

      const opera = (dOpere.data || []).find(o => o.operaId === operaGroup.operaId);
      const salaOpera = opera?.sala != null ? String(opera.sala) : null;

      let operaFloorIdx = null;
      const foundFloors = [];
      for (let i = 0; i < piani.length; i++) {
        const piano = piani[i];
        if (!piano.geoJsonUrl) continue;
        try {
          const res  = await fetch(piano.geoJsonUrl);
          const geo  = await res.json();
          const feats = geo.features || [];
          if (salaOpera != null && operaFloorIdx === null && feats.some(f => f.properties?.room_id === salaOpera)) {
            operaFloorIdx = i;
          }
          if (feats.some(f => f.properties?.room_id === kind)) foundFloors.push(i);
        } catch (_) { /* prova il prossimo piano */ }
      }

      if (!foundFloors.length) {
        speakAssistant(`Non ho trovato ${kind === 'U' ? "l'uscita" : 'i bagni'} sulla mappa di questo museo.`);
        return;
      }
      const refIdx = operaFloorIdx != null ? operaFloorIdx : 0;
      const nearestIdx = foundFloors.reduce((best, i) =>
        Math.abs(i - refIdx) < Math.abs(best - refIdx) ? i : best, foundFloors[0]);
      const pianoLabel = piani[nearestIdx]?.piano || `piano ${nearestIdx + 1}`;

      speakAssistant(`${label} più vicina si trova al ${pianoLabel}. Controlla la mappa.`);
      setActivePanel('mappa');
      setLogisticsTarget({ roomId: kind, piano: piani[nearestIdx]?.piano });
    } catch (_) {
      speakAssistant('Non sono riuscito a recuperare le indicazioni.');
    }
  }

  // Confronta il testo trascritto col vocabolario controllato (matchVoiceCommand)
  // ed esegue l'azione corrispondente. Aggiornata ad ogni render (vedi
  // handleVoiceTranscriptRef sopra), così vede sempre tono/durata/opera correnti.
  function handleVoiceTranscript(testo) {
    const match = matchVoiceCommand(testo);
    if (!match) return; // frase non riconosciuta: resta silenzioso, il testo resta comunque visibile in UI
    const { categoria, azione } = match;

    if (categoria === 'esplorazione') {
      if (azione === 'ripeti') {
        const testoCorrente = toneText(activeItem?.toni?.[tono], durata);
        speakAssistant(testoCorrente || 'Nessuna spiegazione disponibile per questa opera.');
        return;
      }
      const order = DURATE_CONFIG.map(d => d.key);
      const idx = order.indexOf(durata);
      const nextIdx = Math.max(0, Math.min(order.length - 1, idx + (azione === 'aumenta' ? 1 : -1)));
      if (nextIdx === idx) {
        speakAssistant(azione === 'aumenta' ? 'Questa è già la spiegazione più lunga disponibile.' : 'Questa è già la spiegazione più breve disponibile.');
        return;
      }
      const nuovaDurata = order[nextIdx];
      setDurata(nuovaDurata);
      speakAssistant(toneText(activeItem?.toni?.[tono], nuovaDurata) || 'Nessun contenuto disponibile per questa durata.');

    } else if (categoria === 'adattamento') {
      const order = TONI_CONFIG.map(t => t.key);
      const idx = order.indexOf(tono);
      const nextIdx = Math.max(0, Math.min(order.length - 1, idx + (azione === 'avanza' ? 1 : -1)));
      if (nextIdx === idx) {
        speakAssistant(azione === 'avanza' ? 'Questo è già il tono più avanzato disponibile.' : 'Questo è già il tono più semplice disponibile.');
        return;
      }
      const nuovoTono = order[nextIdx];
      setTono(nuovoTono);
      speakAssistant(toneText(activeItem?.toni?.[nuovoTono], durata) || 'Nessun contenuto disponibile per questo tono.');

    } else if (categoria === 'dettagli') {
      if (azione === 'autore') {
        speakAssistant(operaInfo?.autore ? `L'autore è ${operaInfo.autore}.` : "Non ho informazioni sull'autore di quest'opera.");
      } else {
        const stile = operaInfo?.tecnica || operaInfo?.tipo;
        speakAssistant(stile ? `Lo stile è: ${stile}.` : 'Non ho informazioni sullo stile di quest\'opera.');
      }

    } else if (categoria === 'logistica') {
      locateAmenity(azione === 'uscita' ? 'U' : 'bagno');
    }
  }

  // Il ref punta sempre all'ultima versione di handleVoiceTranscript (che
  // chiude su tono/durata/activeItem/operaInfo correnti) — vedi commento
  // sulla dichiarazione del ref più sopra.
  React.useEffect(() => {
    handleVoiceTranscriptRef.current = handleVoiceTranscript;
  });

  // Il comando logistico resta valido solo per l'opera per cui è stato
  // chiesto: cambiando opera si torna a evidenziare la sua sala normalmente.
  React.useEffect(() => {
    setLogisticsTarget(null);
  }, [operaGroup]);

  function toggleMic() {
    if (!micSupported || !recognitionRef.current) return;
    const next = !micOn;
    setMicOn(next);
    micOnRef.current = next;
    if (next) {
      setVoiceTranscript('');
      try { recognitionRef.current.start(); } catch (_) {}
    } else {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
  }

  // Precarica le immagini di TUTTE le opere della visita non appena questa
  // viene avviata (sia per la docente che per ogni studente, ognuno sul
  // proprio dispositivo), così la navigazione tra un'opera e l'altra è
  // fluida — l'immagine è già in cache invece di scaricarsi solo quando ci
  // si arriva sopra. Gira una sola volta per visita (chiave sull'elenco
  // completo dei gruppi opera, non sull'item corrente), in background e
  // senza bloccare né rifare nulla se una singola immagine fallisce.
  React.useEffect(() => {
    if (!visitaItems.length) return;
    let cancelled = false;
    const allIds = visitaItems.flatMap(g => g.itemIds || []);
    Promise.allSettled(allIds.map(id =>
      fetch(`/api/items/${encodeURIComponent(id)}`).then(r => r.json()).then(d => d.data)
    )).then(results => {
      if (cancelled) return;
      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value?.image) {
          const img = new Image();
          img.src = res.value.image;
        }
      });
    });
    return () => { cancelled = true; };
  }, [visitaItems]);

  // Carica tutti gli item del gruppo opera corrente
  React.useEffect(() => {
    const ids = operaGroup?.itemIds;
    if (!ids?.length) {
      setAllItems([]);
      setActiveItem(null);
      setLoading(false);
      return;
    }
    setAllItems([]);
    setLoading(true);
    let cancelled = false;
    Promise.all(ids.map(id =>
      fetch(`/api/items/${encodeURIComponent(id)}`).then(r => r.json()).then(d => d.data || null).catch(() => null)
    )).then(items => {
      if (cancelled) return;
      setAllItems(items.filter(Boolean));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [operaGroup]);

  // Ricalcola l'item attivo quando cambiano tono, durata o la lista degli item
  React.useEffect(() => {
    setActiveItem(findBestItem(allItems, tono, durata));
  }, [allItems, tono, durata]);

  // Allinea lo studente al tono/durata scelti dalla docente ogni volta che
  // lei avvia la narrazione sincronizzata ("Avvia audio per tutti"), invece
  // di riprodurre il tono locale di default ('medio'). Da qui in poi lo
  // studente resta comunque libero di cambiare tono per sé (voce/comandi):
  // questo effetto riparte solo quando la docente avvia un nuovo audio, non
  // ad ogni render, quindi non sovrascrive scelte successive dello studente.
  React.useEffect(() => {
    if (isDocente || !syncTono) return;
    setTono(syncTono);
    if (syncDurata) setDurata(syncDurata);
  }, [syncTono, syncDurata, isDocente]);

  // Dati dell'opera collegata all'item corrente: servono sia come fallback
  // per l'immagine (molti item non hanno un campo "image" proprio valorizzato
  // — es. creati prima dell'autofill dall'opera, o content type
  // "indipendente" senza URL inserito), sia per rispondere ai comandi vocali
  // "Dettagli" (chi è l'autore / qual è lo stile).
  const [operaInfo, setOperaInfo] = React.useState(null);
  const operaFallbackImg = operaInfo?.immagine || '';
  React.useEffect(() => {
    setOperaInfo(null);
    if (!activeItem?.museumId || !operaGroup?.operaId) return;
    let cancelled = false;
    fetch(`/api/opere?codiceIsil=${encodeURIComponent(activeItem.museumId)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const op = (d.data || []).find(o => o.operaId === operaGroup.operaId);
        if (op) setOperaInfo(op);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeItem, operaGroup]);

  React.useEffect(() => {
    const added = messages.length - prevLenRef.current;
    if (added > 0 && isDocente && !chatOpen) setUnread(u => u + added);
    prevLenRef.current = messages.length;
  }, [messages.length]);

  React.useEffect(() => {
    if (chatOpen) {
      setUnread(0);
      if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatOpen, messages.length]);

  // Lo studente segnala alla docente ogni cambio di tono/linguaggio, per la
  // dashboard di monitoraggio ("chi ha chiesto cosa").
  React.useEffect(() => {
    if (isDocente || !nomeAssegnato || !codice) return;
    fetch(`/api/sessioni/${encodeURIComponent(codice)}/tono`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nomeAssegnato, tono, durata }),
    }).catch(() => {});
  }, [tono, durata, isDocente, nomeAssegnato, codice]);

  // audioAvviato/ttsMuted appena letti dentro la .then() asincrona di sotto
  // sarebbero quelli al momento in cui l'effetto è partito (closure stale):
  // questi ref restano sempre aggiornati al valore corrente.
  const audioAvviatoRef = React.useRef(audioAvviato);
  const ttsMutedRef     = React.useRef(ttsMuted);
  React.useEffect(() => { audioAvviatoRef.current = audioAvviato; }, [audioAvviato]);
  React.useEffect(() => { ttsMutedRef.current = ttsMuted; }, [ttsMuted]);

  // Carica una nuova sintesi vocale (Edge TTS) solo quando cambia davvero il
  // contenuto da leggere — opera, tono o durata. "Ferma audio"/"Avvia audio"
  // della docente NON tocca questo effetto: lo gestisce quello sotto, che
  // mette in pausa/riprende lo stesso file invece di rigenerarlo da capo,
  // così riprende esattamente da dove si era fermato.
  React.useEffect(() => {
    const testo = toneText(activeItem?.toni?.[tono], durata);
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setTtsLoading(false);
    if (!isDocente && nomeAssegnato && codice) reportAscolto(false);
    if (!testo) return;
    let cancelled = false;
    setTtsLoading(true);
    fetch('/api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: testo }),
    })
      .then(r => { if (!r.ok) throw new Error('tts fallita'); return r.blob(); })
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        // Quando l'audio finisce da solo, il pulsante deve tornare su "Avvia
        // audio" per tutti: la docente è l'unica a poterlo far ripartire, per
        // cui è lei a triggerare il fermaAudio che lo sincronizza via SSE.
        if (isDocente) audio.onended = () => onFermaAudio?.();
        else audio.onended = () => { if (nomeAssegnato && codice) reportAscolto(false); };
        if (audioAvviatoRef.current && !ttsMutedRef.current) {
          audio.play()
            .then(() => { if (!isDocente && nomeAssegnato && codice) reportAscolto(true); })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTtsLoading(false); });
    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
      if (!isDocente && nomeAssegnato && codice) reportAscolto(false);
    };
  }, [activeItem, tono, durata]);

  // Mette in pausa o riprende l'audio GIÀ CARICATO in risposta a "Ferma
  // audio"/"Avvia audio" (docente) o al muto (studente) — senza toccare il
  // file: riprende esattamente dal punto in cui si era fermato.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioAvviato && !ttsMuted) {
      audio.play()
        .then(() => { if (!isDocente && nomeAssegnato && codice) reportAscolto(true); })
        .catch(() => {});
    } else {
      audio.pause();
      if (!isDocente && nomeAssegnato && codice) reportAscolto(false);
    }
  }, [audioAvviato, ttsMuted]);

  // POST fire-and-forget: comunica alla docente se questo studente sta
  // ascoltando la narrazione sincronizzata in questo momento, per bloccare
  // "avanti" finché tutti non hanno finito (vedi handleNavigaAvanti/popup).
  function reportAscolto(ascolto) {
    fetch(`/api/sessioni/${encodeURIComponent(codice)}/ascolto`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nomeAssegnato, ascolto }),
    }).catch(() => {});
  }

  function toggleTtsMuted() {
    setTtsMuted(m => !m);
  }

  // "Ferma audio" è sempre permesso; "Avvia audio" invece va bloccato (stesso
  // popup di "avanti") se qualche studente sta ancora ascoltando dell'altro,
  // per non fargli sentire due audio sovrapposti.
  function handleAudioButtonClick() {
    if (audioAvviato) { onFermaAudio(); return; }
    if (inAscolto) { mostraPopupAscolto('Non puoi avviare un nuovo audio'); return; }
    onAvviaAudio(tono, durata);
  }

  async function navigate(direction) {
    if (navigating) return;
    if ((direction === 'avanti' || direction === 'next') && inAscolto) {
      mostraPopupAscolto();
      return;
    }
    setNavigating(true);
    try {
      const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}/naviga`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const d = await r.json();
      if (d.code === 'STUDENTI_IN_ASCOLTO') mostraPopupAscolto();
    } finally { setNavigating(false); }
  }

  async function jumpToItem(idx) {
    if (navigating || idx === currentIdx) { setItemsMenuOpen(false); return; }
    if (idx > currentIdx && inAscolto) {
      setItemsMenuOpen(false);
      mostraPopupAscolto();
      return;
    }
    setNavigating(true);
    try {
      const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}/naviga`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: idx }),
      });
      const d = await r.json();
      if (d.code === 'STUDENTI_IN_ASCOLTO') mostraPopupAscolto();
    } finally { setNavigating(false); setItemsMenuOpen(false); }
  }

  // Popup "ci sono studenti in ascolto" con conto alla rovescia di 60s —
  // puramente informativo: dopo i 60s si chiude da solo ma la docente può
  // già ritentare prima (il blocco vero è lato server, su inAscolto). Stesso
  // popup sia per "avanti" bloccato che per un secondo audio bloccato, solo
  // il titolo cambia in base a cosa stava provando a fare.
  const ascoltoCountdownRef = React.useRef(null);
  function mostraPopupAscolto(titolo = 'Non puoi andare avanti') {
    if (ascoltoCountdownRef.current) clearInterval(ascoltoCountdownRef.current);
    setAscoltoPopupTitolo(titolo);
    setAscoltoCountdown(60);
    setAscoltoPopupOpen(true);
    ascoltoCountdownRef.current = setInterval(() => {
      setAscoltoCountdown(s => {
        if (s <= 1) {
          clearInterval(ascoltoCountdownRef.current);
          setAscoltoPopupOpen(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }
  React.useEffect(() => () => {
    if (ascoltoCountdownRef.current) clearInterval(ascoltoCountdownRef.current);
  }, []);

  async function eseguiTermina() {
    setTerminating(true);
    try {
      await fetch(`/api/sessioni/${encodeURIComponent(codice)}/chiudi`, { method: 'POST' });
    } finally {
      setTerminating(false);
      onBack();
    }
  }

  async function handleTermina() {
    // Se la visita ha un quiz non ancora avviato, prima di chiudere chiediamo
    // alla docente se vuole farlo partire.
    if (hasQuiz && !quiz) {
      setQuizPromptOpen(true);
      return;
    }
    if (!(await showConfirm('Terminare la visita? Tutti i partecipanti verranno disconnessi.'))) return;
    eseguiTermina();
  }

  async function handleTerminaSenzaQuiz() {
    setQuizPromptOpen(false);
    if (!(await showConfirm('Terminare la visita senza avviare il quiz? Tutti i partecipanti verranno disconnessi.'))) return;
    eseguiTermina();
  }

  async function handleAvviaQuizDaPrompt() {
    setQuizPromptOpen(false);
    if (onAvviaQuiz) await onAvviaQuiz();
  }

  async function handleSendMsg() {
    const text = msgText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/sessioni/${encodeURIComponent(codice)}/messaggio`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: nomeAssegnato || 'Visitatore', text }),
      });
      if (r.ok) {
        setMsgText('');
        setComposeOpen(false);
      }
      // Se il POST fallisce il compose rimane aperto — l'utente può riprovare
    } finally { setSending(false); }
  }

  const progress = totalItems > 0 ? ((currentIdx + 1) / totalItems) * 100 : 0;

  return (
    <div className="visita-item-root">
      <div className="visita-item-header">
        <p className="visita-item-eyebrow">
          {visitaNome ? `${visitaNome} · ` : ''}Item {currentIdx + 1} di {totalItems}
        </p>
        <div className="visita-item-header-actions">
          {micSupported && (
            <button
              className={`visita-mic-toggle${micOn ? ' visita-mic-toggle--active' : ''}`}
              onClick={toggleMic}
              title={micOn ? 'Disattiva comandi vocali' : 'Attiva comandi vocali'}
            >
              <i className={`fa-solid ${micOn ? 'fa-microphone' : 'fa-microphone-slash'}`} />
            </button>
          )}
          {isDocente && (
            <button
              className={`visita-chat-toggle${itemsMenuOpen ? ' visita-chat-toggle--active' : ''}`}
              onClick={() => { setItemsMenuOpen(v => !v); setMonitorOpen(false); setChatOpen(false); }}
              title="Vai a un'opera specifica"
            >
              <i className="fa-solid fa-list" />
            </button>
          )}
          {isDocente && (
            <button
              className={`visita-chat-toggle${monitorOpen ? ' visita-chat-toggle--active' : ''}`}
              onClick={() => { setMonitorOpen(v => !v); setItemsMenuOpen(false); setChatOpen(false); }}
              title="Monitoraggio partecipanti"
            >
              <i className="fa-solid fa-chart-line" />
            </button>
          )}
          {isDocente && (
            <button
              className={`visita-chat-toggle${chatOpen ? ' visita-chat-toggle--active' : ''}`}
              onClick={() => { setChatOpen(v => !v); setMonitorOpen(false); setItemsMenuOpen(false); }}
              title="Messaggi partecipanti"
            >
              <i className="fa-solid fa-comments" />
              {unread > 0 && <span className="visita-chat-badge">{unread > 9 ? '9+' : unread}</span>}
            </button>
          )}
          {!isDocente && (
            <button className="visita-item-exit-btn" onClick={onBack}>← Esci</button>
          )}
        </div>
      </div>

      <div className="visita-item-progress">
        <div className="visita-item-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="visita-item-body">
      <div className="visita-item-main">
      <div className="visita-item-content">
        {quiz ? (
          <QuizPanel
            quiz={quiz}
            isDocente={isDocente}
            nomeAssegnato={nomeAssegnato}
            respondedCount={respondedCount}
            totalStudenti={totalStudenti}
            onRispondiQuiz={onRispondiQuiz}
            onTerminaQuizOra={onTerminaQuizOra}
            quizTerminandoOra={quizTerminandoOra}
          />
        ) : (
          <>
            {loading && (
              <div className="visita-item-loading">
                <div className="nav-spinner" />
                <p>Caricamento item…</p>
              </div>
            )}
            {!loading && !operaGroup && (
              <p className="visita-item-empty">La visita non contiene opere.</p>
            )}
            {!loading && operaGroup && !activeItem && (
              <p className="visita-item-empty">Nessun item disponibile per questa opera.</p>
            )}
            {!loading && activeItem && (
              <div className="visita-item-card">
                <h2 className="visita-item-title">
                  {operaGroup?.operaId || activeItem.operaId}
                  <button
                    type="button"
                    className={`visita-tts-toggle${ttsMuted ? '' : ' visita-tts-toggle--active'}`}
                    onClick={toggleTtsMuted}
                    title={ttsMuted ? 'Attiva lettura ad alta voce' : 'Disattiva lettura ad alta voce'}
                  >
                    <i className={`fa-solid ${ttsLoading ? 'fa-spinner fa-spin' : ttsMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`} />
                  </button>
                </h2>

                <div className="visita-view-toggle">
                  <button
                    type="button"
                    className={`visita-view-btn${activePanel === 'mappa' ? ' visita-view-btn--active' : ''}`}
                    onClick={() => setActivePanel(p => p === 'mappa' ? null : 'mappa')}
                  >
                    <i className="fa-solid fa-map-location-dot" /> Mappa
                  </button>
                  <button
                    type="button"
                    className={`visita-view-btn${activePanel === 'opera' ? ' visita-view-btn--active' : ''}`}
                    onClick={() => setActivePanel(p => p === 'opera' ? null : 'opera')}
                  >
                    <i className="fa-solid fa-image" /> Opera
                  </button>
                </div>

                {activePanel === 'mappa' && (
                  <VisitaItemRoomMap
                    museumId={activeItem.museumId}
                    operaId={operaGroup?.operaId || activeItem.operaId}
                    logisticsTarget={logisticsTarget}
                  />
                )}
                {activePanel === 'opera' && (activeItem.image || operaFallbackImg) && (
                  <img
                    className="visita-item-img"
                    src={activeItem.image || operaFallbackImg}
                    alt={operaGroup?.operaId || activeItem.operaId}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                {activePanel === 'opera' && !activeItem.image && !operaFallbackImg && (
                  <p className="visita-item-empty">Nessuna immagine disponibile per questa opera.</p>
                )}

                <div className="visita-toni-bar">
                  {TONI_CONFIG.map(t => (
                    <button
                      key={t.key}
                      className={`visita-tono-btn${tono === t.key ? ' visita-tono-btn--active' : ''}`}
                      onClick={() => setTono(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="visita-toni-bar visita-durate-bar">
                  {DURATE_CONFIG.map(d => (
                    <button
                      key={d.key}
                      className={`visita-tono-btn${durata === d.key ? ' visita-tono-btn--active' : ''}`}
                      onClick={() => setDurata(d.key)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {micOn && (
                  <p className="visita-voice-transcript">
                    <i className="fa-solid fa-microphone me-1" />
                    {voiceTranscript || 'In ascolto…'}
                  </p>
                )}

                <p className="visita-item-text">
                  {toneText(activeItem.toni?.[tono], durata) || <em>Nessun contenuto per questo tono e durata.</em>}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {isDocente && !quiz && (
        <div className="visita-audio-bar">
          <button
            type="button"
            className={`visita-audio-btn${audioAvviato ? ' visita-audio-btn--avviato' : ''}`}
            onClick={handleAudioButtonClick}
          >
            <i className={`fa-solid ${audioAvviato ? 'fa-stop' : 'fa-volume-high'}`} />
            {audioAvviato ? 'Ferma audio' : 'Avvia audio per tutti'}
          </button>
        </div>
      )}

      {isDocente && !quiz && (
        <div className="visita-item-nav">
          <button
            className="visita-nav-btn visita-nav-btn--prev"
            onClick={() => navigate('indietro')}
            disabled={currentIdx === 0 || navigating}
          >← Precedente</button>
          <span className="visita-nav-counter">{currentIdx + 1} / {totalItems}</span>
          <button
            className="visita-nav-btn visita-nav-btn--next"
            onClick={() => navigate('avanti')}
            disabled={currentIdx >= totalItems - 1 || navigating}
          >Prossimo →</button>
        </div>
      )}

      {isDocente && (
        <div className="visita-termina-bar">
          <button className="visita-termina-btn" onClick={handleTermina} disabled={terminating}>
            {terminating ? 'Chiusura…' : 'Termina visita'}
          </button>
        </div>
      )}
      </div>

      {/* Chat visitatore — parte del layout: quando è aperta lo schermo si
          rimodella (il contenuto principale si restringe) invece di aprirsi
          come pannello sopra il contenuto. */}
      {!isDocente && (
        <aside className={`visita-compose-sidebar${composeOpen ? ' visita-compose-sidebar--open' : ''}`}>
          <div className="visita-compose-header">
            <span>Invia un messaggio</span>
            <button onClick={() => { setComposeOpen(false); setMsgText(''); }}>✕</button>
          </div>
          <div className="visita-compose-body">
            <textarea
              ref={composeInputRef}
              className="visita-compose-input"
              placeholder="Scrivi il tuo messaggio…"
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              rows={3}
              maxLength={280}
            />
            <button
              className="visita-compose-send"
              onClick={handleSendMsg}
              disabled={!msgText.trim() || sending}
            >
              {sending ? 'Invio…' : 'Invia →'}
            </button>
          </div>
        </aside>
      )}
      </div>

      {/* Prompt: avviare il quiz prima di terminare la visita? */}
      {isDocente && quizPromptOpen && (
        <div className="visita-chat-overlay" onClick={() => setQuizPromptOpen(false)} />
      )}
      {isDocente && quizPromptOpen && (
        <div className="quiz-prompt-modal">
          <h3 className="quiz-prompt-title">Avviare il quiz finale?</h3>
          <p className="quiz-prompt-text">
            Questa visita ha un quiz associato. Puoi farlo partire adesso (i partecipanti risponderanno
            dai loro dispositivi) oppure terminare la visita senza quiz.
          </p>
          <div className="quiz-prompt-actions">
            <button className="quiz-prompt-btn quiz-prompt-btn--ghost" onClick={() => setQuizPromptOpen(false)}>
              Annulla
            </button>
            <button className="quiz-prompt-btn quiz-prompt-btn--danger" onClick={handleTerminaSenzaQuiz}>
              Termina senza quiz
            </button>
            <button className="quiz-prompt-btn quiz-prompt-btn--primary" onClick={handleAvviaQuizDaPrompt} disabled={quizAvviando}>
              {quizAvviando ? 'Avvio in corso…' : 'Avvia Quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Blocco "avanti": ci sono ancora studenti in ascolto — stesso stile
          (ui-modal.css) di tutti gli altri popup del sito, non quello del
          prompt quiz. */}
      {isDocente && ascoltoPopupOpen && (
        <div className="ui-modal-backdrop show" onClick={() => setAscoltoPopupOpen(false)}>
          <div className="ui-modal-box" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="ui-modal-icon warning ui-modal-icon--hourglass">
              <i className={`fa-solid ${ascoltoCountdown > 40 ? 'fa-hourglass-start' : ascoltoCountdown > 20 ? 'fa-hourglass-half' : 'fa-hourglass-end'}`} />
            </div>
            <div className="ui-modal-title">{ascoltoPopupTitolo}</div>
            <div className="ui-modal-msg">
              Ci sono ancora studenti in ascolto!<br />
              Attendi qualche secondo e riprova.<br />
              <strong style={{ fontSize: '1.3rem' }}>{ascoltoCountdown}s</strong>
            </div>
            <div className="ui-modal-actions">
              <button type="button" className="ui-modal-btn ui-modal-btn-primary" onClick={() => setAscoltoPopupOpen(false)}>
                Ho capito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vai a un'opera — backdrop + pannello */}
      {isDocente && itemsMenuOpen && (
        <div className="visita-chat-overlay" onClick={() => setItemsMenuOpen(false)} />
      )}
      {isDocente && (
        <div className={`visita-chat-panel${itemsMenuOpen ? ' visita-chat-panel--open' : ''}`}>
          <div className="visita-chat-panel-header">
            <span className="visita-chat-panel-title">
              <i className="fa-solid fa-list" style={{ marginRight: '8px' }} />
              Vai a un'opera
            </span>
            <button className="visita-chat-close" onClick={() => setItemsMenuOpen(false)}>✕</button>
          </div>
          <div className="visita-chat-msgs">
            {visitaItems.length === 0 ? (
              <p className="visita-chat-empty">Caricamento elenco opere…</p>
            ) : (
              visitaItems.map((it, idx) => (
                <button
                  key={it.operaId || idx}
                  className={`visita-jump-item${idx === currentIdx ? ' visita-jump-item--active' : ''}`}
                  onClick={() => jumpToItem(idx)}
                  disabled={navigating}
                >
                  <span className="visita-jump-item-num">{idx + 1}</span>
                  <span className="visita-jump-item-name">{it.operaId}</span>
                  {idx === currentIdx && <i className="fa-solid fa-volume-high" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Monitoraggio partecipanti — backdrop + pannello */}
      {isDocente && monitorOpen && (
        <div className="visita-chat-overlay" onClick={() => setMonitorOpen(false)} />
      )}
      {isDocente && (
        <div className={`visita-chat-panel${monitorOpen ? ' visita-chat-panel--open' : ''}`}>
          <div className="visita-chat-panel-header">
            <span className="visita-chat-panel-title">
              <i className="fa-solid fa-chart-line" style={{ marginRight: '8px' }} />
              Monitoraggio partecipanti
            </span>
            <button className="visita-chat-close" onClick={() => setMonitorOpen(false)}>✕</button>
          </div>
          <div className="visita-chat-msgs">
            {Object.keys(studentTono).length === 0 ? (
              <p className="visita-chat-empty">
                Nessuna richiesta ancora.<br />
                Qui vedrai in tempo reale i cambi di tono/linguaggio di ogni partecipante.
              </p>
            ) : (
              Object.entries(studentTono)
                .sort((a, b) => b[1].timestamp - a[1].timestamp)
                .map(([nome, info]) => {
                  const tonoLabel   = TONI_CONFIG.find(t => t.key === info.tono)?.label   || info.tono;
                  const durataLabel = DURATE_CONFIG.find(d => d.key === info.durata)?.label || info.durata || '';
                  return (
                    <div key={nome} className="visita-chat-msg">
                      <div className="visita-chat-msg-top">
                        <span className="visita-chat-sender">{nome}</span>
                        <span className="visita-chat-time">
                          {new Date(info.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="visita-chat-text">
                        Tono: <strong>{tonoLabel}</strong>
                        {durataLabel && <> · Durata: <strong>{durataLabel}</strong></>}
                      </p>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Chat backdrop */}
      {isDocente && chatOpen && (
        <div className="visita-chat-overlay" onClick={() => setChatOpen(false)} />
      )}

      {/* Chat panel — sempre montato per l'animazione slide */}
      {isDocente && (
        <div className={`visita-chat-panel${chatOpen ? ' visita-chat-panel--open' : ''}`}>
          <div className="visita-chat-panel-header">
            <span className="visita-chat-panel-title">
              <i className="fa-solid fa-comments" style={{ marginRight: '8px' }} />
              Messaggi
              {messages.length > 0 && <span className="visita-chat-count">{messages.length}</span>}
            </span>
            <button className="visita-chat-close" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="visita-chat-msgs">
            {messages.length === 0 ? (
              <p className="visita-chat-empty">
                Nessun messaggio ancora.<br />
                I partecipanti possono scrivere durante la visita.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className="visita-chat-msg">
                  <div className="visita-chat-msg-top">
                    <span className="visita-chat-sender">{m.sender}</span>
                    <span className="visita-chat-time">
                      {new Date(m.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="visita-chat-text">{m.text}</p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {!isDocente && !composeOpen && (
        <button className="visita-msg-fab" onClick={() => setComposeOpen(true)} title="Invia messaggio">
          <i className="fa-solid fa-comment" />
        </button>
      )}
    </div>
  );
}
