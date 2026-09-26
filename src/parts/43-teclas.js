    /* ====================== TECLAS ====================== */
    function bindKeys() {
        document.addEventListener('keydown', (e) => {
            if (e.altKey && !e.ctrlKey && !e.shiftKey) {
                // v5.14.8: Alt+7 = Chat IA (solo si la IA esta configurada).
                const tabs = { '1': 'dash', '2': 'unidades', '3': 'alertas', '4': 'rutas', '5': 'zonas', '6': 'caravana', '7': 'chat' };
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
            if (e.key === 'Escape') {
                // Cierra solo el dialogo superior: primero el flotante, luego
                // el menu contextual, y por ultimo las ventanas modales.
                if (dialogoAbierto()) { cerrarDialogo(); return; }
                if (ctxEl && ctxEl.style.display === 'flex') { ctxEl.style.display = 'none'; return; }
                const planM = byId('rondo-plan-modal');
                if (planM && planM.classList.contains('abierto')) { cerrarEditorParadas(); return; }
                const ventanas = [modalEl, cfgWinEl, ayudaEl];
                for (let i = ventanas.length - 1; i >= 0; i--) {
                    const w = ventanas[i];
                    if (w && w.style.display && w.style.display !== 'none') { w.style.display = 'none'; return; }
                }
            }
        });
    }
