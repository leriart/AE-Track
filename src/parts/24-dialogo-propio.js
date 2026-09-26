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
            '<span>' + esc(opts.titulo) + '</span></div>' +
            '<div class="dlg-body">' +
            (opts.html || '') +
            (opts.input ? '<input id="' + inputId + '" type="' + (inp.type || 'text') + '" placeholder="' +
                esc(inp.placeholder || '') + '" value="' + esc(inp.value == null ? '' : inp.value) + '">' : '') +
            '</div>' +
            '<div class="dlg-foot">' +
            (showCancel ? '<button class="dlg-cancel">' + cancelText + '</button>' : '') +
            '<button class="dlg-ok' + (opts.peligro ? ' peligro' : '') + '">' + okText + '</button>' +
            '</div>';
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
            html: '<p>' + esc(mensaje) + '</p>',
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
