    /* ====================== MENU CONTEXTUAL ====================== */
    function showMenu(x, y, options, anchor) {
        ctxEl.innerHTML = options.map((o) =>
            o.sep ? '<div class="sep"></div>' : '<div class="op" data-acc="' + esc(o.id) + '">' + (o.icon ? '<span class="rondo-usym">' + o.icon + '</span> ' : '') + esc(o.label) + '</div>'
        ).join('');
        ctxEl.style.display = 'flex';
        // La regla base de #rondo-contexto lo centra con translate(-50%,-50%);
        // hay que anularla o el menu aparece descuadrado y se sale.
        ctxEl.style.transform = 'none';
        ctxEl.style.left = '0px';
        ctxEl.style.top = '0px';
        const r = ctxEl.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        const m = 8;
        let left, top;
        if (anchor && anchor.getBoundingClientRect) {
            const a = anchor.getBoundingClientRect();
            // Despliega a la derecha de la tarjeta; si no cabe, a la izquierda.
            left = a.right + 6;
            if (left + r.width > vw - m) left = a.left - r.width - 6;
            top = a.top;
            if (top + r.height > vh - m) top = a.bottom - r.height;
        } else {
            left = x; top = y;
        }
        left = clamp(left, m, Math.max(m, vw - r.width - m));
        top = clamp(top, m, Math.max(m, vh - r.height - m));
        ctxEl.style.left = left + 'px';
        ctxEl.style.top = top + 'px';
        ctxEl._options = options;
    }
    function hideMenu() { ctxEl.style.display = 'none'; ctxEl._target = null; }
    document.addEventListener('click', (e) => {
        if (ctxEl.style.display !== 'none' && !ctxEl.contains(e.target)) hideMenu();
    });
    function copyToClipboard(text) {
        try { return navigator.clipboard.writeText(String(text || '')); } catch (_) {
            const t = document.createElement('textarea');
            t.value = text; t.style.position = 'fixed'; t.style.left = '-9999px';
            document.body.appendChild(t); t.select();
            try { document.execCommand('copy'); } catch (e) { /* noop */ }
            document.body.removeChild(t);
            return Promise.resolve();
        }
    }

