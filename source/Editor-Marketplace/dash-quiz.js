let quizCurrentVisite   = [];
let quizCurrentVisitaId = null;
let quizDomande         = [];

async function _saveQuiz(visitaId, domande) {
    try {
        const res  = await fetch(`/api/visite/${visitaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizDomande: domande }),
        });
        const data = await res.json();
        if (!data.ok) { showAlert('Errore nel salvataggio del quiz: ' + (data.error || '')); return false; }
        const cached = quizCurrentVisite.find(v => v._id === visitaId);
        if (cached) cached.quizDomande = domande;
        return true;
    } catch (e) {
        showAlert('Impossibile contattare il server per salvare il quiz.');
        return false;
    }
}

function _isVisitaOwnedByMe(v) {
    if (v.autoreId === SESSION.userId) return true;
    if (Array.isArray(v.acquirentiIds) && v.acquirentiIds.includes(SESSION.userId)) return true;
    let localPurchases = [];
    try {
        const raw = JSON.parse(localStorage.getItem('purchases_' + SESSION.userId) || '{"items":[],"visite":[]}');
        localPurchases = raw.visite || [];
    } catch {}
    return localPurchases.includes(v._id);
}

async function initCuratoreQuiz() {
    const section = document.getElementById('section-curatore-quiz');


    if (SESSION.role !== 'autore') {
        section.innerHTML = `
            <div class="mb-5">
                <h1 class="page-title">Gestione Quiz</h1>
            </div>
            <div class="glass-card p-5">
                <p class="empty-msg">
                    <i class="fa-solid fa-lock me-2"></i>
                    Solo gli autori possono creare e gestire i quiz delle visite.
                </p>
            </div>`;
        return;
    }

    section.innerHTML = `
        <div class="mb-5">
            <h1 class="page-title">Gestione Quiz</h1>
            <p class="text-muted mb-0">Crea domande a scelta multipla per il quiz finale di una tua visita Navigator: una visita che hai creato tu, o che hai acquistato nel marketplace.</p>
        </div>
        <div class="glass-card p-5">
            <div class="mb-4">
                <label class="custom-label" for="quizSelectVisita">Seleziona la visita</label>
                <select id="quizSelectVisita" class="custom-input" onchange="onQuizVisitaChange()">
                    <option value="">— Seleziona una visita —</option>
                </select>
            </div>
            <div id="quizEditor" style="display:none;"></div>
        </div>`;

    let allVisite = [];
    let museiMap  = {};
    try {
        const [rVisite, rMusei] = await Promise.all([
            fetch('/api/visite'),
            fetch('/api/musei'),
        ]);
        const [dVisite, dMusei] = await Promise.all([rVisite.json(), rMusei.json()]);
        if (dVisite.ok) allVisite = dVisite.data;
        if (dMusei.ok) dMusei.data.forEach(m => { museiMap[m.codiceIsil] = m.nome; });
    } catch {}

    allVisite = allVisite.filter(v => Array.isArray(v.itemIds) && v.itemIds.length > 0 && _isVisitaOwnedByMe(v));
    quizCurrentVisite = allVisite;

    const sel = document.getElementById('quizSelectVisita');
    if (!sel) return;
    if (!allVisite.length) {
        sel.innerHTML = '<option value="">Nessuna visita disponibile: crea o acquista prima una visita</option>';
    } else {
        sel.innerHTML = '<option value="">— Seleziona una visita —</option>' +
            allVisite.map(v => {
                const museo = museiMap[v.codiceIsil] ? ` — ${museiMap[v.codiceIsil]}` : '';
                return `<option value="${v._id}">${v.nomeVisita}${v.nomeMnemonico ? ' (' + v.nomeMnemonico + ')' : ''}${museo}</option>`;
            }).join('');
    }
}

window.onQuizVisitaChange = function () {
    const sel    = document.getElementById('quizSelectVisita');
    const editor = document.getElementById('quizEditor');
    if (!sel || !editor) return;
    quizCurrentVisitaId = sel.value;
    if (!quizCurrentVisitaId) { editor.style.display = 'none'; return; }
    const visita = quizCurrentVisite.find(v => v._id === quizCurrentVisitaId);
    quizDomande = JSON.parse(JSON.stringify(visita?.quizDomande || []));
    editor.style.display = 'block';
    _renderQuizEditor();
};

function _quizVisitaHaItems() {
    const visita = quizCurrentVisite.find(v => v._id === quizCurrentVisitaId);
    return ((visita?.itemIds) || []).length > 0;
}

function _renderQuizEditor() {
    const editor = document.getElementById('quizEditor');
    if (!editor) return;

    const hasItems = _quizVisitaHaItems();

    const domHtml = quizDomande.length
        ? quizDomande.map((d, i) => `
            <div class="glass-card p-4 mb-3">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <span class="custom-label" style="margin:0;">Domanda ${i + 1}</span>
                    <div class="d-flex gap-2">
                        <button class="btn-outline-custom" style="padding:4px 10px;font-size:0.8rem;"
                                onclick="editQuizDomanda(${i})">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-outline-custom"
                                style="padding:4px 10px;font-size:0.8rem;border-color:#ef4444;color:#ef4444;"
                                onclick="deleteQuizDomanda(${i})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p style="font-weight:600;margin-bottom:10px;">${d.testo}</p>
                <div class="row g-2">
                    ${d.opzioni.map((o, j) => `
                        <div class="col-md-6">
                            <div style="padding:8px 12px;border-radius:8px;font-size:0.88rem;
                                 background:${j === d.corretta ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.03)'};
                                 border:1px solid ${j === d.corretta ? 'rgba(34,197,94,0.3)' : '#e2e8f0'};
                                 color:${j === d.corretta ? '#16a34a' : 'inherit'};">
                                <i class="fa-solid ${j === d.corretta ? 'fa-check-circle' : 'fa-circle'} me-2"
                                   style="font-size:0.8rem;"></i>
                                ${['A','B','C','D'][j]}. ${o}
                            </div>
                        </div>`).join('')}
                </div>
            </div>`).join('')
        : '<p class="text-muted" style="padding:16px 0;">Nessuna domanda ancora. Usa il form qui sotto per aggiungerne una.</p>';

    editor.innerHTML = `
        <div class="mb-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 class="fw-bold mb-0">
                <i class="fa-solid fa-list-check me-2" style="color:var(--magenta)"></i>
                Domande del Quiz
                <span style="background:var(--magenta);color:#fff;border-radius:20px;
                             padding:2px 10px;font-size:0.78rem;margin-left:6px;">
                    ${quizDomande.length}
                </span>
            </h5>
            <button type="button" class="btn-magenta" onclick="salvaQuiz()">
                <i class="fa-solid fa-check-double me-2"></i>Salva Quiz
            </button>
        </div>
        <div id="quizDomandeList" class="mb-4">${domHtml}</div>
        <hr style="border-color:#e2e8f0;margin:24px 0;">
        ${hasItems ? `
        <h5 class="fw-bold mb-4" id="quizFormTitle">
            <i class="fa-solid fa-plus-circle me-2" style="color:var(--magenta)"></i>
            Aggiungi Domanda
        </h5>
        <div class="row g-3">
            <div class="col-12">
                <label class="custom-label" for="qfTesto">Testo della domanda *</label>
                <input type="text" id="qfTesto" class="custom-input"
                       placeholder="Es: Chi ha dipinto La Primavera?">
            </div>
            ${['A','B','C','D'].map((letter, i) => `
            <div class="col-md-6">
                <label class="custom-label" for="qfOpzione${i}">Risposta ${letter} *</label>
                <input type="text" id="qfOpzione${i}" class="custom-input"
                       placeholder="Opzione ${letter}…">
            </div>`).join('')}
            <div class="col-12">
                <span class="custom-label">Risposta corretta *</span>
                <div class="d-flex gap-3 flex-wrap mt-1">
                    ${['A','B','C','D'].map((letter, i) => `
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;
                                  padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;
                                  transition:all .18s;" id="qfCorrettaLabel${i}">
                        <input type="radio" name="qfCorretta" value="${i}"
                               style="width:auto;accent-color:var(--magenta,#FF007F);"
                               onchange="highlightCorrettaLabel()">
                        <span style="font-weight:600;">${letter}</span>
                    </label>`).join('')}
                </div>
            </div>
            <input type="hidden" id="qfEditIndex" value="-1">
            <div class="col-12 d-flex justify-content-end gap-3 pt-3"
                 style="border-top:1px solid #e2e8f0;">
                <button type="button" class="btn-outline-custom" onclick="resetQuizForm()">Annulla</button>
                <button type="button" class="btn-magenta" onclick="salvaQuizDomanda()">
                    <i class="fa-solid fa-floppy-disk me-2"></i>Salva Domanda
                </button>
            </div>
        </div>` : `
        <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;
                     border-radius:10px;background:rgba(239,68,68,0.08);
                     border:1px solid rgba(239,68,68,0.3);color:#ef4444;font-size:0.9rem;">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>Non è possibile creare un quiz per questa visita perché non contiene ancora nessun item. Aggiungi almeno un item alla visita prima di poter creare le domande del quiz.</span>
        </div>`}`;
}

window.highlightCorrettaLabel = function () {
    const val = document.querySelector('input[name="qfCorretta"]:checked')?.value;
    [0,1,2,3].forEach(i => {
        const lbl = document.getElementById(`qfCorrettaLabel${i}`);
        if (!lbl) return;
        if (String(i) === val) {
            lbl.style.borderColor = 'var(--magenta,#FF007F)';
            lbl.style.background  = 'rgba(255,0,127,0.06)';
        } else {
            lbl.style.borderColor = '#e2e8f0';
            lbl.style.background  = '';
        }
    });
};


window.salvaQuiz = async function () {
    if (!(await _saveQuiz(quizCurrentVisitaId, quizDomande))) return;
    showAlert('Quiz salvato correttamente! Preparati per la visita.');
    switchSection('autore-aggiungi-visita');
};

window.salvaQuizDomanda = async function () {
    if (!_quizVisitaHaItems()) {
        showAlert('Non è possibile creare un quiz per questa visita perché non contiene ancora nessun item.');
        return;
    }

    const testo = document.getElementById('qfTesto')?.value.trim();
    if (!testo) { showAlert('Inserisci il testo della domanda.'); return; }

    const opzioni = [0,1,2,3].map(i => document.getElementById(`qfOpzione${i}`)?.value.trim() || '');
    if (opzioni.some(o => !o)) { showAlert('Compila tutte e quattro le risposte.'); return; }

    const correttaEl = document.querySelector('input[name="qfCorretta"]:checked');
    if (!correttaEl) { showAlert('Seleziona la risposta corretta.'); return; }

    const editIdx = parseInt(document.getElementById('qfEditIndex')?.value ?? '-1');
    const domanda = { testo, opzioni, corretta: parseInt(correttaEl.value) };

    const nuoveDomande = quizDomande.slice();
    if (editIdx >= 0) nuoveDomande[editIdx] = domanda;
    else              nuoveDomande.push(domanda);

    if (!(await _saveQuiz(quizCurrentVisitaId, nuoveDomande))) return;
    quizDomande = nuoveDomande;
    _renderQuizEditor();
};

window.editQuizDomanda = function (i) {
    const d = quizDomande[i];
    if (!d) return;
    document.getElementById('qfTesto').value = d.testo;
    [0,1,2,3].forEach(j => {
        const el = document.getElementById(`qfOpzione${j}`);
        if (el) el.value = d.opzioni[j] || '';
    });
    const radio = document.querySelector(`input[name="qfCorretta"][value="${d.corretta}"]`);
    if (radio) { radio.checked = true; highlightCorrettaLabel(); }
    document.getElementById('qfEditIndex').value = i;
    const title = document.getElementById('quizFormTitle');
    if (title) title.innerHTML =
        `<i class="fa-solid fa-pen me-2" style="color:var(--magenta)"></i>Modifica Domanda ${i + 1}`;
    title?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.deleteQuizDomanda = async function (i) {
    if (!(await showConfirm('Eliminare questa domanda?'))) return;
    const nuoveDomande = quizDomande.slice();
    nuoveDomande.splice(i, 1);
    if (!(await _saveQuiz(quizCurrentVisitaId, nuoveDomande))) return;
    quizDomande = nuoveDomande;
    _renderQuizEditor();
};

window.resetQuizForm = function () {
    const testo = document.getElementById('qfTesto');
    if (testo) testo.value = '';
    [0,1,2,3].forEach(i => {
        const el = document.getElementById(`qfOpzione${i}`);
        if (el) el.value = '';
    });
    document.querySelectorAll('input[name="qfCorretta"]').forEach(r => r.checked = false);
    highlightCorrettaLabel();
    const idx = document.getElementById('qfEditIndex');
    if (idx) idx.value = '-1';
    const title = document.getElementById('quizFormTitle');
    if (title) title.innerHTML =
        '<i class="fa-solid fa-plus-circle me-2" style="color:var(--magenta)"></i>Aggiungi Domanda';
};

async function finalizzaAcquistoVisita(id) {
    const visita = allMktVisite.find(v => v._id === id);
    if (visita?.acquirentiIds?.includes(SESSION.userId)) return true;

    try {
        const res  = await fetch(`/api/visite/${id}/acquista`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: SESSION.userId }),
        });
        const data = await res.json();
        if (data.ok) {
            if (visita) {
                visita.acquirentiIds = data.data.acquirentiIds;
                visita.acquirenti    = data.data.acquirenti;
            }
            const p = getMktPurchases();
            if (!p.visite.includes(id)) { p.visite.push(id); saveMktPurchases(p); }
            return true;
        }
    } catch (e) {  }

    return false;
}
