async function initAdminNavigator() {
    const section = document.getElementById('section-admin-navigator');
    section.innerHTML = `
        <div class="section-header-inline d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="page-title">Esportazione Navigator</h1>
                <p class="text-muted mb-0">Seleziona un museo per esportarne i metadati e aprirlo nel Navigator.</p>
            </div>
        </div>
        <div class="glass-card p-4">
            <div class="row g-3 align-items-end">
                <div class="col-md-6">
                    <label class="custom-label" for="navMuseoSelect">Museo da esportare</label>
                    <select id="navMuseoSelect" class="custom-input" onchange="onNavMuseoChange()">
                        <option value="">— scegli un museo —</option>
                    </select>
                </div>
            </div>
            <div id="navPreview" class="mt-4"></div>
        </div>`;

    try {
        const res  = await fetch('/api/musei');
        const data = await res.json();
        const sel  = document.getElementById('navMuseoSelect');
        (data.data || []).forEach(m => {
            const opt = document.createElement('option');
            opt.value       = m.codiceIsil;
            opt.textContent = `${m.nome} (${m.codiceIsil})`;
            sel.appendChild(opt);
        });
    } catch (_) {}
}

window.onNavMuseoChange = async function () {
    const codiceIsil = document.getElementById('navMuseoSelect')?.value;
    const preview    = document.getElementById('navPreview');
    if (!preview) return;
    if (!codiceIsil) { preview.innerHTML = ''; return; }

    preview.innerHTML = `<div class="text-center py-4 text-muted">
        <i class="fa-solid fa-spinner fa-spin me-2"></i>Caricamento dati museo…</div>`;

    try {
        const museoRes = await fetch(`/api/musei/${codiceIsil}`);
        const museo    = (await museoRes.json()).data;
        if (!museo) throw new Error('Museo non trovato');

        const [opereRes, visiteRes, itemsRes] = await Promise.all([
            fetch(`/api/opere?codiceIsil=${codiceIsil}`),
            fetch(`/api/visite?codiceIsil=${codiceIsil}`),
            fetch(`/api/items?museumId=${museo._id}`),
        ]);
        const opere  = (await opereRes.json()).data  || [];
        const visite = (await visiteRes.json()).data || [];
        const items  = (await itemsRes.json()).data  || [];

        preview.innerHTML = `
            <div class="row g-3 mb-4">
                <div class="col-12">
                    <div class="p-3 rounded-3" style="background:rgba(255,0,127,0.06);border:1px solid rgba(255,0,127,0.15);">
                        <div class="fw-bold mb-1">${museo.nome}</div>
                        <small class="text-muted">${museo.citta || ''} · ISIL: <code>${museo.codiceIsil}</code></small>
                        ${museo.descrizioneBreve ? `<p class="mb-0 mt-1" style="font-size:0.85rem;">${museo.descrizioneBreve}</p>` : ''}
                    </div>
                </div>
                <div class="col-4">
                    <div class="glass-card p-3 text-center">
                        <div class="fw-bold" style="font-size:1.8rem;color:var(--magenta)">${opere.length}</div>
                        <small class="text-muted">Opere</small>
                    </div>
                </div>
                <div class="col-4">
                    <div class="glass-card p-3 text-center">
                        <div class="fw-bold" style="font-size:1.8rem;color:var(--magenta)">${visite.length}</div>
                        <small class="text-muted">Visite</small>
                    </div>
                </div>
                <div class="col-4">
                    <div class="glass-card p-3 text-center">
                        <div class="fw-bold" style="font-size:1.8rem;color:var(--magenta)">${items.length}</div>
                        <small class="text-muted">Items</small>
                    </div>
                </div>
            </div>
            <div class="d-flex gap-3 flex-wrap">
                <button class="btn-magenta"
                        onclick="esportaNavigator('${codiceIsil}')">
                    <i class="fa-solid fa-file-export me-2"></i>Scarica JSON
                </button>
                <a href="/Navigator/index.html?museo=${codiceIsil}" target="_blank"
                   class="btn-outline-custom" style="text-decoration:none;">
                    <i class="fa-solid fa-compass me-2"></i>Apri Navigator
                </a>
            </div>`;
    } catch (e) {
        preview.innerHTML = `<div class="text-danger"><i class="fa-solid fa-triangle-exclamation me-2"></i>${e.message}</div>`;
    }
};

window.esportaNavigator = async function (codiceIsil) {
    try {
        const museoRes = await fetch(`/api/musei/${codiceIsil}`);
        const museo    = (await museoRes.json()).data;
        if (!museo) throw new Error('Museo non trovato');

        const [opereRes, visiteRes, itemsRes] = await Promise.all([
            fetch(`/api/opere?codiceIsil=${codiceIsil}`),
            fetch(`/api/visite?codiceIsil=${codiceIsil}`),
            fetch(`/api/items?museumId=${museo._id}`),
        ]);
        const bundle = {
            museo,
            opere:  (await opereRes.json()).data  || [],
            visite: (await visiteRes.json()).data || [],
            items:  (await itemsRes.json()).data  || [],
            exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `navigator-${codiceIsil}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        showAlert('Errore durante l\'esportazione: ' + e.message);
    }
};
