    /* ====================== TECLAS ====================== */
    // Accesibilidad de las pestañas: roles ARIA, tabindex y navegacion con
    // flechas (izq/der, Home/End). Se aplica en runtime para cubrir tambien
    // la pestaña de chat, que se muestra u oculta segun la IA configurada.
    function rxA11yTabs() {
        const cont = byId('rondo-tabs');
        if (!cont) return;
        cont.setAttribute('role', 'tablist');
        const tabs = Array.prototype.slice.call(cont.querySelectorAll('.tab'));
        tabs.forEach((t) => {
            const name = t.dataset.tab;
            if (!name) return;
            t.setAttribute('role', 'tab');
            t.id = 'rondo-tab-' + name;
            const panel = byId('rondo-wrap-' + name);
            if (panel) {
                panel.setAttribute('role', 'tabpanel');
                panel.setAttribute('aria-labelledby', 'rondo-tab-' + name);
                t.setAttribute('aria-controls', 'rondo-wrap-' + name);
            }
            t.setAttribute('tabindex', t.classList.contains('activo') ? '0' : '-1');
            if (t._rxA11y) return;
            t._rxA11y = true;
            t.addEventListener('keydown', (e) => {
                const visibles = tabs.filter((x) => x.style.display !== 'none');
                const idx = visibles.indexOf(t);
                if (idx < 0) return;
                let next = null;
                if (e.key === 'ArrowRight') next = visibles[(idx + 1) % visibles.length];
                else if (e.key === 'ArrowLeft') next = visibles[(idx - 1 + visibles.length) % visibles.length];
                else if (e.key === 'Home') next = visibles[0];
                else if (e.key === 'End') next = visibles[visibles.length - 1];
                if (!next) return;
                e.preventDefault();
                try { next.focus(); } catch (_) { /* noop */ }
                next.click();
            });
        });
    }
    function bindKeys() {
        rxA11yTabs();
        document.addEventListener('keydown', (e) => {
            const tgt = e.target;
            const enCampo = !!(tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT' || tgt.isContentEditable));
            if (e.altKey && !e.ctrlKey && !e.shiftKey) {
                // v5.14.8: Alt+7 = Chat IA (solo si la IA esta configurada).
                const tabs = { '1': 'dash', '2': 'unidades', '3': 'alertas', '4': 'rutas', '5': 'zonas', '6': 'caravana', '7': 'chat', '8': 'replay' };
                if (tabs[e.key] && (tabs[e.key] !== 'chat' || (APP.config.iaHabilitada && APP.config.iaApiKey))) {
                    setTab(tabs[e.key]);
                    if (APP.panelHidden) togglePanel();
                    e.preventDefault();
                    return;
                }
                if (e.key.toLowerCase() === 'p') {
                    togglePanel();
                    paintPanel();
                    e.preventDefault(); return;
                }
                if (e.key.toLowerCase() === 'l') {
                    toggleSidebar();
                    e.preventDefault(); return;
                }
                if (e.key.toLowerCase() === 'h') {
                    APP.barra.plegada = !APP.barra.plegada;
                    applyBar();
                    e.preventDefault(); return;
                }
            }
            // '?' abre la ayuda rapida (salvo si el foco esta en un campo de
            // texto, para no impedir escribir el signo).
            if (e.key === '?' && !enCampo) {
                if (ayudaEl) ayudaEl.style.display = 'flex';
                e.preventDefault();
                return;
            }
            if (e.key === 'Escape') {
                // Cierra solo el dialogo superior: primero el flotante, luego
                // el menu contextual, y por ultimo las ventanas modales.
                if (dialogoAbierto()) { cerrarDialogo(); return; }
                if (ctxEl && ctxEl.style.display === 'flex') { hideMenu(); return; }
                const planM = byId('rondo-plan-modal');
                if (planM && planM.classList.contains('abierto')) { cerrarEditorParadas(); return; }
                const glocM = byId('rondo-geocerca-modal');
                if (glocM && glocM.classList.contains('abierto')) { cerrarGeocercaApp(); return; }
                const ventanas = [modalEl, cfgWinEl, ayudaEl];
                for (let i = ventanas.length - 1; i >= 0; i--) {
                    const w = ventanas[i];
                    if (w && w.style.display && w.style.display !== 'none') { w.style.display = 'none'; return; }
                }
            }
        });
    }
