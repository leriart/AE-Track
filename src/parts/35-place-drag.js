/* ====================== PLACE / DRAG ====================== */
    function placeBar() {
        const r = barraEl.getBoundingClientRect();
        const maxX = Math.max(0, window.innerWidth - r.width - 4);
        const maxY = Math.max(0, window.innerHeight - r.height - 4);
        APP.barra.x = clamp(APP.barra.x || 0, 0, maxX);
        APP.barra.y = clamp(APP.barra.y || 0, 0, maxY);
        barraEl.style.left = APP.barra.x + 'px';
        barraEl.style.top = APP.barra.y + 'px';
        barraEl.style.right = 'auto';
    }
    function applyBar() {
        const b = APP.barra.botones;
        mainBtn.style.display = b.main ? '' : 'none';
        panelBtn.style.display = b.panel ? '' : 'none';
        closeBtn.style.display = b.close ? '' : 'none';
        barraEl.classList.toggle('plegada', !!APP.barra.plegada);
        barraEl.classList.toggle('vertical', !!APP.barra.vertical);
        foldBtn.innerText = APP.barra.plegada ? '▸' : '▾';
        if (APP.barra.x == null || APP.barra.y == null) {
            APP.barra.x = Math.max(4, window.innerWidth - barraEl.offsetWidth - 15);
            APP.barra.y = 80;
        }
        placeBar();
        writeJSON(LS.barra, APP.barra);
    }
    // Rondo solo tiene modo sidebar (barra lateral). Se mantiene la funcion
    // por compatibilidad de llamadas, pero siempre devuelve true.
    function esLateral() { return true; }
    function aplicarModoPanel() {
        if (!panelEl) return;
        const lado = APP.config.panelLado || 'derecha';
        const ancho = clamp(Number(APP.config.panelAncho) || 460, 360, Math.max(360, window.innerWidth - 20));
        panelEl.classList.add('lateral');
        panelEl.classList.toggle('izquierda', lado === 'izquierda');
        document.body.classList.add('rondo-lateral');
        panelEl.style.top = '0px';
        panelEl.style.bottom = '0px';
        panelEl.style.height = '100vh';
        panelEl.style.width = ancho + 'px';
        if (lado === 'izquierda') { panelEl.style.left = '0px'; panelEl.style.right = 'auto'; }
        else { panelEl.style.left = 'auto'; panelEl.style.right = '0px'; }
        const colIcon = document.querySelector('#rondo-collapse .rondo-usym');
        if (colIcon) colIcon.innerHTML = UIS.collapse;
        const colBtn = byId('rondo-collapse');
        if (colBtn) colBtn.title = APP.panelHidden ? 'Mostrar barra lateral' : 'Ocultar barra lateral';
        panelEl.style.display = 'flex';
        panelEl.classList.toggle('oculto', !!APP.panelHidden);
        aplicarRail();
        writeJSON(LS.cfg, APP.config);
    }
    // Ya no hay modo flotante: Alt+L / boton del modo ahora solo muestran u ocultan.
    function toggleSidebar() {
        togglePanel();
    }
    function actualizarBotonesModo() {
        const panelLbl = byId('rondo-btn-panel');
        if (panelLbl) panelLbl.title = APP.panelHidden ? 'Mostrar la barra lateral (Alt+P)' : 'Ocultar la barra lateral (Alt+P)';
        const colBtn = byId('rondo-collapse');
        if (colBtn) colBtn.title = APP.panelHidden ? 'Mostrar barra lateral' : 'Ocultar barra lateral';
    }
    function togglePanel() {
        APP.panelHidden = !APP.panelHidden;
        APP.config.panelVisible = !APP.panelHidden;
        panelEl.style.display = 'flex';
        aplicarModoPanel();
        const icon = document.querySelector('#rondo-btn-panel .rondo-usym');
        if (icon) icon.innerHTML = APP.panelHidden ? UIS.panel : UIS.close;
        const t = byId('rondo-btn-panel');
        if (t) t.title = APP.panelHidden ? 'Mostrar la barra lateral (Alt+P)' : 'Ocultar la barra lateral (Alt+P)';
        if (APP.panelHidden) advice('Panel', 'oculto · usa el boton de la barra o el rail para mostrarlo');
        actualizarBotonesModo();
    }
    // Oculta la barra lateral sin avisos (util para el clic fuera del panel).
    function ocultarSidebar() {
        if (APP.panelHidden) return;
        APP.panelHidden = true;
        APP.config.panelVisible = false;
        aplicarModoPanel();
        actualizarBotonesModo();
    }
    function aplicarRail() {
        if (!railEl) return;
        const lado = APP.config.panelLado || 'derecha';
        railEl.classList.toggle('izquierda', lado === 'izquierda');
        railEl.classList.toggle('derecha', lado !== 'izquierda');
        railEl.innerHTML = '<span class="rondo-usym">' + (lado === 'izquierda' ? UIS.right : UIS.left) + '</span>' +
            '<span class="rondo-rail-txt">PANEL</span>';
        railEl.classList.toggle('mostrar', APP.panelHidden);
    }
    function attachDraggables() {
        (function dragBar() {
            let activo = false, dx = 0, dy = 0;
            barraEl.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('button') && !e.target.closest('.rondo-grip')) return;
                activo = true;
                const r = barraEl.getBoundingClientRect();
                dx = e.clientX - r.left; dy = e.clientY - r.top;
                try { barraEl.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
                e.preventDefault();
            });
            barraEl.addEventListener('pointermove', (e) => {
                if (!activo) return;
                const r = barraEl.getBoundingClientRect();
                const maxX = Math.max(0, window.innerWidth - r.width - 4);
                const maxY = Math.max(0, window.innerHeight - r.height - 4);
                APP.barra.x = clamp(e.clientX - dx, 0, maxX);
                APP.barra.y = clamp(e.clientY - dy, 0, maxY);
                barraEl.style.left = APP.barra.x + 'px';
                barraEl.style.top = APP.barra.y + 'px';
                barraEl.style.right = 'auto';
            });
            const end = () => { if (activo) { activo = false; writeJSON(LS.barra, APP.barra); } };
            barraEl.addEventListener('pointerup', end);
            barraEl.addEventListener('pointercancel', end);
        })();

        // v5.15: se elimino el modo flotante. El panel es siempre barra
        // lateral; la barra de botones sigue siendo arrastrable.
        window.addEventListener('resize', () => {
            placeBar();
        });
    }

