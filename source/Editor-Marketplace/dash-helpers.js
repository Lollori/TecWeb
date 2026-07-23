function toneText(t) {
    if (!t) return '';
    return t.d15 || t.d3 || t.d40 || '';
}


const _tagInputState = {};

function tagInputHtml(id, placeholder) {
    return `
        <div class="tag-input" id="${id}">
            <div class="tag-input-chips" id="${id}Chips"></div>
            <input type="text" class="tag-input-field" id="${id}Field"
                   placeholder="${placeholder || 'Aggiungi un tag e premi Invio (es. caravaggio)'}"
                   onkeydown="_tagInputKeydown(event,'${id}')"
                   onblur="_tagInputBlur('${id}')">
        </div>`;
}

function initTagInput(id, initialTags) {
    _tagInputState[id] = (initialTags || []).slice();
    _renderTagChips(id);
}

function getTagInputValue(id) {
    return (_tagInputState[id] || []).slice();
}

function _renderTagChips(id) {
    const box = document.getElementById(id + 'Chips');
    if (!box) return;
    box.innerHTML = (_tagInputState[id] || []).map((t, i) =>
        `<span class="tag-chip">#${t}<button type="button" onclick="_removeTagChip('${id}',${i})" aria-label="Rimuovi tag">&times;</button></span>`
    ).join('');
}

function _normalizeTag(raw) {
    return raw.trim().replace(/^#+/, '').toLowerCase().replace(/\s+/g, '-');
}

function _addTagToInput(id, raw) {
    const t = _normalizeTag(raw);
    if (!t) return;
    if (!_tagInputState[id]) _tagInputState[id] = [];
    if (!_tagInputState[id].includes(t)) _tagInputState[id].push(t);
    _renderTagChips(id);
}

window._tagInputKeydown = function (e, id) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
        e.preventDefault();
        _addTagToInput(id, e.target.value);
        e.target.value = '';
    } else if (e.key === 'Backspace' && !e.target.value && (_tagInputState[id] || []).length) {
        _tagInputState[id].pop();
        _renderTagChips(id);
    }
};
window._tagInputBlur = function (id) {
    const field = document.getElementById(id + 'Field');
    if (field && field.value.trim()) {
        _addTagToInput(id, field.value);
        field.value = '';
    }
};
window._removeTagChip = function (id, i) {
    _tagInputState[id].splice(i, 1);
    _renderTagChips(id);
};


function itemTitle(it) {
    if (it?.contentType === 'indipendente') return it.topic || 'Contenuto indipendente';
    return it?.operaId || '—';
}


function tagChipsDisplayHtml(tags) {
    if (!tags || !tags.length) return '';
    return `<div class="tag-chips-display">${tags.map(t =>
        `<button type="button" class="tag-chip-mini" onclick="_searchByTag('${t.replace(/'/g, "\\'")}')">#${t}</button>`
    ).join('')}</div>`;
}


window._searchByTag = function (tag) {
    _mktActiveTag = tag;
    const field = document.getElementById('mktSearch');
    if (field) field.value = '';
    if (typeof window.applyMktFilter === 'function') window.applyMktFilter();
};

window._clearMktTagFilter = function () {
    _mktActiveTag = '';
    if (typeof window.applyMktFilter === 'function') window.applyMktFilter();
};


window._onMktSearchInput = function () {
    if (_mktActiveTag) _mktActiveTag = '';
    applyMktFilter();
};

function _renderMktActiveTagRow() {
    const row = document.getElementById('mktActiveTagRow');
    if (!row) return;
    if (!_mktActiveTag) {
        row.style.display = 'none';
        row.innerHTML = '';
        return;
    }
    row.style.display = 'block';
    row.innerHTML = `
        <span class="tag-chip-mini" style="background:var(--magenta,#FF007F);color:white;border-color:var(--magenta,#FF007F);cursor:default;">
            <i class="fa-solid fa-tag" style="margin-right:4px;"></i>#${_mktActiveTag}
            <button type="button" onclick="_clearMktTagFilter()" aria-label="Rimuovi filtro tag"
                    style="background:none;border:none;color:inherit;margin-left:6px;cursor:pointer;font-weight:700;">&times;</button>
        </span>`;
}


function itemTypeBadge(it) {
    return it?.contentType === 'indipendente'
        ? '<span class="badge bg-info text-dark"><i class="fa-solid fa-lightbulb"></i> Indipendente</span>'
        : '<span class="badge bg-light text-dark border"><i class="fa-solid fa-image"></i> Opera</span>';
}


function toneBadgesHtml(it) {
    const toni = it?.toni || {};
    const livelli = [
        { key: 'semplice', label: 'Semplice', cls: 'tone-badge--semplice' },
        { key: 'medio',    label: 'Medio',    cls: 'tone-badge--medio' },
        { key: 'avanzato', label: 'Avanzato', cls: 'tone-badge--avanzato' },
    ];
    return livelli
        .filter(l => !toneIsEmpty(toni[l.key] || {}))
        .map(l => `<span class="tone-badge ${l.cls}">${l.label}</span>`)
        .join('');
}


function toneEditorHtml(editorId, prefix, toni) {
    const gruppi = [
        { key: 'semplice', label: 'Semplice', hint: 'linguaggio elementare, utenti giovani' },
        { key: 'medio',    label: 'Medio',    hint: 'linguaggio accessibile, pubblico generale' },
        { key: 'avanzato', label: 'Avanzato', hint: 'terminologia tecnica, pubblico esperto' },
    ];
    const defaultKey = gruppi.find(g => !toneIsEmpty(toni?.[g.key] || {}))?.key || 'semplice';

    const tabs = gruppi.map(g => `
        <button type="button" class="tone-editor-tab${g.key === defaultKey ? ' active' : ''}"
                data-tone-key="${g.key}" onclick="switchToneTab('${editorId}','${g.key}')">
            <span class="tone-editor-tab-label">
                ${g.label}
                <span class="tone-editor-tab-badge" data-badge-key="${g.key}">0/3</span>
            </span>
            <span class="tone-editor-tab-hint">${g.hint}</span>
        </button>`).join('');

    const panels = gruppi.map(g => {
        const t = toni?.[g.key] || {};
        return `
        <div class="tone-editor-panel${g.key === defaultKey ? ' active' : ''}" data-tone-panel="${g.key}">
            <div class="tone-editor-fields">
                <div class="tone-editor-field">
                    <label>3 secondi</label>
                    <textarea id="${prefix}${g.label}3" placeholder="Versione brevissima…">${t.d3 || ''}</textarea>
                </div>
                <div class="tone-editor-field">
                    <label>15 secondi</label>
                    <textarea id="${prefix}${g.label}15" placeholder="Versione media…">${t.d15 || ''}</textarea>
                </div>
                <div class="tone-editor-field">
                    <label>40 secondi</label>
                    <textarea id="${prefix}${g.label}40" placeholder="Versione estesa…">${t.d40 || ''}</textarea>
                </div>
            </div>
        </div>`;
    }).join('');

    return `
        <div class="col-12">
            <div class="tone-editor" id="${editorId}">
                <div class="tone-editor-tabs">${tabs}</div>
                ${panels}
            </div>
        </div>`;
}

window.switchToneTab = function (editorId, key) {
    const root = document.getElementById(editorId);
    if (!root) return;
    root.querySelectorAll('.tone-editor-tab').forEach(b => b.classList.toggle('active', b.dataset.toneKey === key));
    root.querySelectorAll('.tone-editor-panel').forEach(p => p.classList.toggle('active', p.dataset.tonePanel === key));
};


function refreshToneBadges(editorId, prefix) {
    const root = document.getElementById(editorId);
    if (!root) return;
    ['semplice', 'medio', 'avanzato'].forEach(key => {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        const n = ['3', '15', '40'].filter(d => (document.getElementById(`${prefix}${label}${d}`)?.value || '').trim()).length;
        const badge = root.querySelector(`.tone-editor-tab-badge[data-badge-key="${key}"]`);
        if (!badge) return;
        badge.textContent = `${n}/3`;
        badge.classList.toggle('is-complete', n === 3);
    });
}


function wireToneBadges(editorId, prefix) {
    const root = document.getElementById(editorId);
    if (!root) return;
    root.addEventListener('input', (e) => {
        if (e.target.tagName === 'TEXTAREA') refreshToneBadges(editorId, prefix);
    });
    refreshToneBadges(editorId, prefix);
}


function readToneFields(prefix, label) {
    return {
        d3:  (document.getElementById(`${prefix}${label}3`)?.value  || '').trim(),
        d15: (document.getElementById(`${prefix}${label}15`)?.value || '').trim(),
        d40: (document.getElementById(`${prefix}${label}40`)?.value || '').trim(),
    };
}

function toneIsComplete(t) { return !!(t.d3 && t.d15 && t.d40); }
function toneIsEmpty(t)    { return !t.d3 && !t.d15 && !t.d40; }


function validateToniShapeOrAlert(toniObj) {
    for (const [key, t] of Object.entries(toniObj)) {
        if (!toneIsEmpty(t) && !toneIsComplete(t)) {
            showAlert(`Completa tutte e 3 le durate (3s / 15s / 40s) del tono "${key}", oppure lasciale tutte vuote.`);
            return false;
        }
    }
    return true;
}


function hasCompleteTone(toniObj) {
    return Object.values(toniObj).some(t => toneIsComplete(t));
}


function renderToni(item, uid) {
    const t = item.toni || {};
    const livelli = [
        { key: 'semplice', label: 'Semplice' },
        { key: 'medio',    label: 'Medio' },
        { key: 'avanzato', label: 'Avanzato' },
    ];
    const durate = [['d3', '3s'], ['d15', '15s'], ['d40', '40s']];
    const id = uid || item._id || Math.random().toString(36).slice(2);

    const panels = livelli.map((l, i) => {
        const blocks = durate
            .filter(([dk]) => t[l.key]?.[dk])
            .map(([dk, dl]) => `<p class="toni-testo"><strong>${dl}:</strong> ${t[l.key][dk].replace(/\n/g, '<br>')}</p>`)
            .join('');
        return `
            <div class="toni-panel${i === 0 ? ' is-active' : ''}" data-toni-key="${l.key}">
                ${blocks || '<em class="toni-empty">Nessun contenuto.</em>'}
            </div>`;
    }).join('');

    return `
        <div class="toni-switcher" data-toni-id="${id}" data-toni-index="0">
            <div class="toni-switcher-head">
                <button type="button" class="toni-nav-btn" onclick="toniNav('${id}',-1)" aria-label="Tono precedente">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="toni-current-label">${livelli[0].label}</span>
                <button type="button" class="toni-nav-btn" onclick="toniNav('${id}',1)" aria-label="Tono successivo">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
            <div class="toni-panels">${panels}</div>
        </div>`;
}

window.toniNav = function (id, dir) {
    const root = document.querySelector(`.toni-switcher[data-toni-id="${id}"]`);
    if (!root) return;
    const keys   = ['semplice', 'medio', 'avanzato'];
    const labels = { semplice: 'Semplice', medio: 'Medio', avanzato: 'Avanzato' };
    let idx = (parseInt(root.dataset.toniIndex, 10) || 0) + dir;
    idx = (idx + keys.length) % keys.length;
    root.dataset.toniIndex = idx;
    const key = keys[idx];
    root.querySelector('.toni-current-label').textContent = labels[key];
    root.querySelectorAll('.toni-panel').forEach(p => p.classList.toggle('is-active', p.dataset.toniKey === key));
};

function renderItemCard(item) {
    return `
        <div class="item-read-card">
            ${item.image
                ? `<img loading="lazy" src="${item.image}" alt="item" onerror="this.style.display='none'">`
                : ''}
            ${renderToni(item)}
            ${Object.keys(item.metadata || {}).length ? `
                <ul class="item-metadata-list">
                    ${Object.entries(item.metadata).map(([k, v]) =>
                        `<li><span class="meta-key">${k}:</span> ${v}</li>`
                    ).join('')}
                </ul>` : ''}
            <span class="tag-bubble" style="margin-top:auto;font-size:0.78rem;">
                <i class="fa-solid fa-user"></i> ${item.authorId}
            </span>
        </div>`;
}
