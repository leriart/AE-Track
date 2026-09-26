    /* ====================== DIALOGO PROPIO ======================
     * Sustituye a window.confirm/window.prompt con la misma estetica del
     * panel. Api:
     *   rondoConfirm(titulo, mensaje, onOk, {peligro, okText, icon})
     *   rondoPrompt(titulo, label, valor, onOk, {placeholder, type, okText})
     *   abrirDialogo({...})  // generico
     */
    let dlgEl = null, dlgPrevFocus = null;
    function ensureDialog() {
        if (dlgEl && dlgEl.isConnected) return dlgEl;
        dlgEl = makeEl('div', { id: 'rondo-dialog' });
        dlgEl.setAttribute('role', 'dialog');
        dlgEl.setAttribute('aria-modal', 'true');
        document.body.appendChild(dlgEl);
        return dlgEl;
    }
    function dialogoAbierto() { return !!(dlgEl && dlgEl.classList.contains('abierto')); }
    // Trampa de foco: Tab/Shift+Tab ciclan solo dentro del dialogo abierto
    // (accesibilidad: el foco no debe escapar al contenido de atras).
    function rxDialogoTrapTab(e) {
        if (e.key !== 'Tab') return;
        const el = e.currentTarget;
        const nodos = el.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
        const vis = Array.prototype.filter.call(nodos, (n) => !n.disabled && n.getClientRects().length > 0);
        if (!vis.length) return;
        const primero = vis[0];
        const ultimo = vis[vis.length - 1];
        const activo = document.activeElement;
        if (e.shiftKey && activo === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && activo === ultimo) { e.preventDefault(); primero.focus(); }
        else if (!el.contains(activo)) { e.preventDefault(); primero.focus(); }
    }
    function cerrarDialogo() {
        if (!dlgEl) return;
        dlgEl.classList.remove('abierto');
        dlgEl.innerHTML = '';
        if (dlgPrevFocus && dlgPrevFocus.focus && dlgPrevFocus.isConnected) {
            try { dlgPrevFocus.focus(); } catch (_) { /* noop */ }
        }
        dlgPrevFocus = null;
    }
    function abrirDialogo(opts) {
        const el = ensureDialog();
        dlgPrevFocus = document.activeElement;
        const inputId = opts.input ? 'rondo-dlg-input' : '';
        const inp = opts.input || {};
        // v5.14.6: auto-hide del boton Cancel si su texto coincide con
        // el del OK (ej. cancelText:'Cerrar' + okText:'Cerrar'). Antes
        // salian DOS botones identicos, lo que confundia al operador.
        // El caller sigue pudiendo forzar ambos pasando opts.cancel ===
        // 'forzar' (cualquier string truthy distinto de false).
        const cancelText = esc(opts.cancelText || 'Cancelar');
        const okText = esc(opts.okText || 'Aceptar');
        const showCancel = opts.cancel !== false && cancelText !== okText;
        el.innerHTML =
            '<div class="dlg-head"><span class="rondo-usym">' + (opts.icon || UIS.info) + '</span>' +
            '<span id="rondo-dlg-title">' + esc(opts.titulo) + '</span></div>' +
            '<div class="dlg-body">' +
            (opts.html || '') +
            (opts.input ? '<input id="' + inputId + '" type="' + (inp.type || 'text') + '" placeholder="' +
                esc(inp.placeholder || '') + '" value="' + esc(inp.value == null ? '' : inp.value) + '">' : '') +
            '</div>' +
            '<div class="dlg-foot">' +
            (showCancel ? '<button type="button" class="dlg-cancel">' + cancelText + '</button>' : '') +
            '<button type="button" class="dlg-ok' + (opts.peligro ? ' peligro' : '') + '">' + okText + '</button>' +
            '</div>';
        // Nombre accesible del dialogo (rol dialog ya lo pone ensureDialog).
        el.setAttribute('aria-labelledby', 'rondo-dlg-title');
        // v6.0.10: ancho configurable por dialogo. Los resultados de IA son
        // anchos y largos; se acotan a la pantalla y el cuerpo hace scroll.
        if (opts.ancho) el.style.width = 'min(' + Math.max(320, Math.round(Number(opts.ancho) || 0)) + 'px,94vw)';
        else el.style.width = '';
        try { rxBarridoAutofill(el); } catch (_) { /* noop */ }
        el.classList.add('abierto');
        const okBtn = el.querySelector('.dlg-ok');
        const cancelBtn = el.querySelector('.dlg-cancel');
        const inpEl = opts.input ? byId(inputId) : null;
        if (inpEl) { inpEl.focus(); if (inpEl.select) inpEl.select(); }
        else if (okBtn) okBtn.focus();
        okBtn.addEventListener('click', () => {
            const val = inpEl ? inpEl.value : undefined;
            cerrarDialogo();
            if (opts.onOk) opts.onOk(val);
        });
        if (cancelBtn) cancelBtn.addEventListener('click', cerrarDialogo);
        // El listener vive en el elemento persistente: se registra una vez.
        if (!el._rondoTrap) {
            el._rondoTrap = true;
            el.addEventListener('keydown', rxDialogoTrapTab);
        }
        if (inpEl) inpEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); okBtn.click(); }
        });
        // v5.14: hook para que callers externos enganchen handlers
        // sobre los botones del cuerpo del dialogo. Se llama DESPUES
        // de montar el HTML y antes de devolver el elemento.
        if (typeof opts.onOpen === 'function') {
            try { opts.onOpen(el); } catch (e) { try { console.log('[Rondo] onOpen dialogo: ' + e); } catch (_) { /* noop */ } }
        }
        return el;
    }
    function rondoConfirm(titulo, mensaje, onOk, opts) {
        const o = opts || {};
        abrirDialogo({
            icon: o.icon || UIS.warn,
            titulo: titulo,
            // o.html permite HTML confiable (p. ej. negritas de la IA); por
            // defecto el mensaje se escapa para no inyectar HTML.
            html: o.html ? '<p>' + mensaje + '</p>' : '<p>' + esc(mensaje) + '</p>',
            okText: o.okText || 'Confirmar',
            peligro: !!o.peligro,
            onOk: onOk
        });
    }
    function rondoPrompt(titulo, label, value, onOk, opts) {
        const o = opts || {};
        abrirDialogo({
            icon: o.icon || UIS.gear,
            titulo: titulo,
            html: label ? '<p>' + esc(label) + '</p>' : '',
            input: { value: value == null ? '' : value, placeholder: o.placeholder || '', type: o.type || 'text' },
            okText: o.okText || 'Aceptar',
            onOk: (val) => { if (val !== null && val !== undefined) onOk(val); }
        });
    }
    // Estado vacio reutilizable: icono + titulo + pista + accion opcional.
    // `hint` admite HTML controlado; `accion` es HTML de botones.
    // Indicador de cambios sin guardar en la ventana de ajustes.
    let cfgDirty = false;
    function marcarCfgDirty() {
        cfgDirty = true;
        const d = byId('rondo-cfg-dirty');
        if (d) d.classList.add('on');
    }
    function limpiarCfgDirty() {
        cfgDirty = false;
        const d = byId('rondo-cfg-dirty');
        if (d) d.classList.remove('on');
    }
    function emptyState(icon, titulo, hint, accion) {
        return '<div class="rondo-vacio">' +
            '<span class="rondo-usym">' + icon + '</span>' +
            '<b>' + esc(titulo) + '</b>' +
            (hint ? '<span>' + hint + '</span>' : '') +
            (accion || '') +
            '</div>';
    }
    // Solo reescribe innerHTML si el contenido cambio. El panel se repinta cada
    // segundo; reasignar el mismo HTML destruye y recrea los nodos, lo que
    // reinicia las animaciones CSS de entrada (parpadeo). La clave es el id del
    // contenedor.
    const _htmlMemo = Object.create(null);
    function setHtml(el, html) {
        if (!el) return false;
        const key = el.id || '';
        if (_htmlMemo[key] === html) return false;
        _htmlMemo[key] = html;
        el.innerHTML = html;
        try { rxBarridoAutofill(el); } catch (_) { /* noop */ }
        return true;
    }
    function invalidarHtml(id) { delete _htmlMemo[id]; }
    function abrirBienvenida() {
        abrirDialogo({
            icon: UIS.gear,
            titulo: 'Bienvenido a Rondo',
            cancel: false,
            okText: 'Empezar',
            html:
                '<p>Vigilancia de flota sobre Wialon, directo en el navegador. En 3 pasos:</p>' +
                '<div class="pasos">' +
                '<div class="paso"><span class="n">1</span><div><b>Elige unidades</b>' +
                '<span>En <i>Automatizar Unidades</i> pega los economicos, o activa <i>Monitorear todas</i> en Ajustes.</span></div></div>' +
                '<div class="paso"><span class="n">2</span><div><b>Evalua reglas</b>' +
                '<span>El script vigila sin señal, detenciones, zonas, geocercas, velocidad y rutas. Ajustalo en Ajustes.</span></div></div>' +
                '<div class="paso"><span class="n">3</span><div><b>Vigila los avisos</b>' +
                '<span>Tarjetas, voz, pitido y notificación. Revisa el historial en la pestaña <i>Avisos</i>.</span></div></div>' +
                '</div>'
        });
    }
