/* ============================================================
   UI MODAL — sostituto stilizzato di alert()/confirm() nativi.
   window.showAlert(message, opts?)   -> Promise<void>   (fire-and-forget ok)
   window.showConfirm(message, opts?) -> Promise<boolean> (va atteso con await)
   opts: { title, type: 'success'|'error'|'warning'|'info'|'question', okText, cancelText }
   ============================================================ */
(function () {
    function ensureRoot() {
        let root = document.getElementById('uiModalRoot');
        if (!root) {
            root = document.createElement('div');
            root.id = 'uiModalRoot';
            document.body.appendChild(root);
        }
        return root;
    }

    function iconFor(type) {
        switch (type) {
            case 'success':  return { cls: 'success',  icon: 'fa-circle-check' };
            case 'error':    return { cls: 'error',    icon: 'fa-circle-exclamation' };
            case 'warning':  return { cls: 'warning',  icon: 'fa-triangle-exclamation' };
            case 'question': return { cls: 'question', icon: 'fa-circle-question' };
            default:         return { cls: 'info',     icon: 'fa-circle-info' };
        }
    }

    // Gli alert esistenti non passano un "type" esplicito: lo deduciamo dal
    // testo per scegliere un'icona/colore sensata senza dover riscrivere
    // manualmente ogni singola chiamata.
    function guessType(message) {
        const m = (message || '').toLowerCase();
        if (/errore|impossibile|non è possibile|non e' possibile|fallit/.test(m)) return 'error';
        if (/eliminare|elimina|attenzione/.test(m)) return 'warning';
        if (/salvat|creat|aggiunt|modificat|correttamente|completat|riuscit|inviat/.test(m)) return 'success';
        return 'info';
    }

    function buildModal(message, title, type) {
        const backdrop = document.createElement('div');
        backdrop.className = 'ui-modal-backdrop';
        const { cls, icon } = iconFor(type);
        backdrop.innerHTML = `
            <div class="ui-modal-box" role="alertdialog" aria-modal="true">
                <div class="ui-modal-icon ${cls}"><i class="fa-solid ${icon}"></i></div>
                ${title ? `<div class="ui-modal-title"></div>` : ''}
                <div class="ui-modal-msg"></div>
                <div class="ui-modal-actions"></div>
            </div>`;
        if (title) backdrop.querySelector('.ui-modal-title').textContent = title;
        backdrop.querySelector('.ui-modal-msg').textContent = message;
        return backdrop;
    }

    function show(backdrop) {
        ensureRoot().appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('show'));
    }

    function close(backdrop) {
        backdrop.classList.remove('show');
        setTimeout(() => backdrop.remove(), 200);
    }

    window.showAlert = function (message, opts) {
        opts = opts || {};
        const type = opts.type || guessType(message);
        return new Promise((resolve) => {
            const backdrop = buildModal(message, opts.title, type);
            const actions = backdrop.querySelector('.ui-modal-actions');
            const okBtn = document.createElement('button');
            okBtn.type = 'button';
            okBtn.className = 'ui-modal-btn ui-modal-btn-primary';
            okBtn.textContent = opts.okText || 'OK';
            const done = () => { close(backdrop); resolve(); };
            okBtn.onclick = done;
            actions.appendChild(okBtn);
            backdrop.addEventListener('click', (e) => { if (e.target === backdrop) done(); });
            show(backdrop);
            okBtn.focus();
        });
    };

    window.showConfirm = function (message, opts) {
        opts = opts || {};
        const type = opts.type || 'question';
        return new Promise((resolve) => {
            const backdrop = buildModal(message, opts.title, type);
            const actions = backdrop.querySelector('.ui-modal-actions');

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'ui-modal-btn ui-modal-btn-secondary';
            cancelBtn.textContent = opts.cancelText || 'Annulla';
            cancelBtn.onclick = () => { close(backdrop); resolve(false); };

            const okBtn = document.createElement('button');
            okBtn.type = 'button';
            okBtn.className = 'ui-modal-btn ui-modal-btn-primary';
            okBtn.textContent = opts.okText || 'Conferma';
            okBtn.onclick = () => { close(backdrop); resolve(true); };

            actions.appendChild(cancelBtn);
            actions.appendChild(okBtn);
            backdrop.addEventListener('click', (e) => { if (e.target === backdrop) { close(backdrop); resolve(false); } });
            show(backdrop);
            okBtn.focus();
        });
    };
})();
