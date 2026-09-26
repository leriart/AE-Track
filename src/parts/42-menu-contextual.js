    /* ====================== MENU CONTEXTUAL ====================== */
    function showMenu(x, y, options, anchor) {
        if (!ctxEl) return;
        const ops = Array.isArray(options) ? options : [];
        ctxEl.setAttribute('role', 'menu');
        ctxEl.innerHTML = ops.map((o) =>
            o.sep ? '<div class="sep" role="separator"></div>' : '<div class="op" role="menuitem" tabindex="-1" data-acc="' + esc(o.id) + '">' + (o.icon ? '<span class="rondo-usym">' + o.icon + '</span> ' : '') + esc(o.label) + '</div>'
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
        ctxEl._options = ops;
    }
    function hideMenu() { if (!ctxEl) return; ctxEl.style.display = 'none'; ctxEl._target = null; }
    // Navegacion por teclado dentro del menu: flechas, Inicio/Fin y
    // Enter/Espacio. El menu se abre tambien con la tecla de menu contextual
    // del teclado, asi que debe poder recorrerse sin raton.
    function rxMoverFocoMenu(delta) {
        if (!ctxEl) return;
        const ops = Array.prototype.slice.call(ctxEl.querySelectorAll('.op'));
        if (!ops.length) return;
        let i = ops.indexOf(document.activeElement);
        if (i < 0) i = delta > 0 ? -1 : ops.length;
        i = (i + delta + ops.length) % ops.length;
        ops[i].focus();
    }
    document.addEventListener('keydown', (e) => {
        if (!ctxEl || ctxEl.style.display !== 'flex') return;
        if (e.key === 'ArrowDown') { rxMoverFocoMenu(1); e.preventDefault(); return; }
        if (e.key === 'ArrowUp') { rxMoverFocoMenu(-1); e.preventDefault(); return; }
        if (e.key === 'Home') { const o = ctxEl.querySelector('.op'); if (o) o.focus(); e.preventDefault(); return; }
        if (e.key === 'End') { const ops = ctxEl.querySelectorAll('.op'); if (ops.length) ops[ops.length - 1].focus(); e.preventDefault(); return; }
        if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.classList.contains('op')) {
            e.preventDefault();
            document.activeElement.click();
        }
    });
    document.addEventListener('click', (e) => {
        if (ctxEl && ctxEl.style.display !== 'none' && !ctxEl.contains(e.target)) hideMenu();
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

