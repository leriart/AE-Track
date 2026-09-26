    /* ====================== INIT ====================== */
    async function init() {
        const primerUso = !localStorage.getItem(LS.cfg);
        injectCSS();
        buildUI();
        // La barra lateral se aplica de inmediato (antes de esperar a Wialon)
        // para que el panel ya tenga su layout correcto desde el primer dibujo.
        aplicarModoPanel();
        attachDraggables();
        bindKeys();
        bindEvents();
        bindCaravanaSelect();
        bindRiesgo();

        const ok = await wialonReady();
        if (!ok) {
            avisoEl.textContent = 'No se encontró la API de Wialon (wialon.core) en esta página.';
            avisoEl.style.display = 'block';
            APP.unlocked = true;
            return;
        }
        log('API de Wialon detectada. Esperando sesion...');
        let intentos = 0;
        while (!currentUser() && intentos < 120) { await sleep(1000); intentos++; }
        if (!currentUser()) {
            avisoEl.textContent = 'Sesión de Wialon no iniciada. Inicia sesión para monitorear.';
            avisoEl.style.display = 'block';
            APP.unlocked = true;
            return;
        }
        APP.unlocked = true;
        // Migracion de voz: en Linux la Web Speech API suele existir pero no
        // sonar. Si el motor guardado es 'web' y estamos en Linux, pasamos a
        // 'online' (StreamElements) una sola vez. El user puede volver a
        // elegir 'Navegador' cuando quiera.
        try {
            if (!window.localStorage.getItem('rondo.api.vozLinux')) {
                const ua = String(navigator.userAgent || '') + ' ' + String(navigator.platform || '');
                if (APP.config.vozMotor === 'web' && /linux/i.test(ua) && !/android/i.test(ua)) {
                    APP.config.vozMotor = 'online';
                    writeJSON(LS.cfg, APP.config);
                }
                window.localStorage.setItem('rondo.api.vozLinux', '1');
            }
        } catch (_) { /* noop */ }
        applyBar();
        applyTheme();
        aplicarModoPanel();
        paintVerifyButton();
        updateNoMolestar();
        paintIASwitch();
        await refresh();
        // Carga en background (no bloquea el inicio). Sin URL por defecto -> queda inactivo.
        cargarRiesgo();
        restartTimers();
        if (primerUso) {
            setTimeout(abrirBienvenida, 900);
        }
        // v5.14.1: sistema de updates rehecho.
        // 1) Restaurar lastCheck de localStorage para que el chip muestre
        //    estado correcto desde el primer paint (sin parpadeo a idle).
        cargarUpdatePersistente();
        // 2) Self-check de la constante VER contra el @version detectado
        //    del propio archivo (catches la deriva silenciosa).
        autodetectarVER();
        // v5.14.6: cargar historial de chat de sessionStorage.
        cargarChat();
        paintTabsChat();
        setTimeout(pintarChat, 0);
        // 3) Primer check diferido para no bloquear el arranque.
        setTimeout(comprobarActualizacion, 5000);
        // 4) Check periodico cada 6h (antes 30min -> demasiado ruido).
        setInterval(comprobarActualizacion, UPDATE_CHECK_INTERVAL_MS);
        // 5) Re-check al recuperar el foco: si el usuario vuelve a la
        //    pestana despues de un rato, conviene re-comprobar (el
        //    check previo pudo haber fallado por red).
        let _lastFocusCheck = 0;
        const focusHandler = () => {
            const ahora = Date.now();
            // Throttle: no mas de una vez por minuto.
            if (ahora - _lastFocusCheck < 60000) return;
            _lastFocusCheck = ahora;
            if (!APP.update || APP.update.state !== 'checking') {
                comprobarActualizacion();
            }
        };
        window.addEventListener('focus', focusHandler);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) focusHandler();
        });
        // Las ventanas de unidad pueden restaurarse despues de cargar la pagina;
        // revalidamos el contorno varias veces al inicio.
        [1500, 4000, 8000, 15000].forEach((t) => setTimeout(revalidarContornos, t));
        // Trazado automatico inicial: cualquier unidad vigilada con destino
        // pendiente recibe su ruta en background. Si ya hay ruta valida para
        // el destino actual, no se recalcula.
        setTimeout(() => { autoTrazarRutas(); }, 2500);
    }
    function log() { try { console.log.apply(console, ['[Rondo]'].concat(Array.prototype.slice.call(arguments))); } catch (_) { /* noop */ } }

    init();

