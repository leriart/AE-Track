    /* ====================== INIT ====================== */
    async function init() {
        // Idempotente: en modo hibrido el chunk ui y el bootstrap pueden
        // llamarla; evita construir la interfaz dos veces (dos UI superpuestas,
        // la de arriba sin listeners = botones muertos).
        if (APP._iniciado) return;
        APP._iniciado = true;
        const primerUso = !localStorage.getItem(LS.cfg);
        // v6.19.7: adelanta DNS/TLS a los origenes que se van a usar.
        try { precargarOrigenes(); } catch (_) { /* noop */ }
        injectCSS();
        buildUI();
        try { rxBarridoAutofill(); } catch (_) { /* noop */ }
        // La barra lateral se aplica de inmediato (antes de esperar a Wialon)
        // para que el panel ya tenga su layout correcto desde el primer dibujo.
        aplicarModoPanel();
        attachDraggables();
        bindKeys();
        bindEvents();
        bindCaravanaSelect();
        bindReplay();
        bindRiesgo();
        try { rxDiagBind(); } catch (_) { /* noop */ }

        const ok = await wialonReady();
        if (!ok) {
            // v6.0.14: en la pantalla de login es normal que la API aun no
            // exista, asi que se pide iniciar sesion en vez de avisar de que
            // falta la API.
            avisoEl.textContent = rxEnLogin()
                ? 'Inicia sesión en la plataforma para que Rondo pueda monitorear.'
                : 'No se encontró la API de Wialon (wialon.core) en esta página.';
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
            if (!document.hidden) {
                focusHandler();
                // v6.19.7: si en modo rendimiento se pauso el polling estando
                // oculta, al volver se refresca una vez para no quedar obsoleto.
                if (APP.config.rendimientoPagina) { try { refresh(); } catch (_) { /* noop */ } }
            }
        });
        // Las ventanas de unidad pueden restaurarse despues de cargar la pagina;
        // revalidamos el contorno varias veces al inicio.
        [1500, 4000, 8000, 15000].forEach((t) => setTimeout(revalidarContornos, t));
        // Trazado automatico inicial: cualquier unidad vigilada con destino
        // pendiente recibe su ruta en background. Si ya hay ruta valida para
        // el destino actual, no se recalcula.
        setTimeout(() => { autoTrazarRutas(); }, 2500);
    }
    // v6.19.7: pista de bajo nivel para que cargue antes. Inserta preconnect y
    // dns-prefetch hacia la API de la plataforma y los servicios de OSM que
    // usan Rondo y los mapas. No cambia el comportamiento: solo adelanta la
    // resolucion DNS y el handshake TLS de la primera peticion real.
    function precargarOrigenes() {
        const head = document.head || document.documentElement;
        if (!head) return;
        const origenes = [];
        try { if (rxPlatApiUrl()) origenes.push(rxPlatApiUrl()); } catch (_) { /* noop */ }
        origenes.push('https://tile.openstreetmap.org', 'https://nominatim.openstreetmap.org',
            'https://overpass-api.de', 'https://router.project-osrm.org');
        const ya = {};
        const previos = head.querySelectorAll('link[rel="preconnect"],link[rel="dns-prefetch"]');
        for (let i = 0; i < previos.length; i++) ya[previos[i].href] = 1;
        origenes.forEach((o) => {
            let base;
            try { base = new URL(o).origin; } catch (_) { return; }
            if (!base || ya[base] || base === location.origin) return;
            ya[base] = 1;
            const pc = document.createElement('link');
            pc.rel = 'preconnect'; pc.href = base; pc.crossOrigin = '';
            head.appendChild(pc);
            const dp = document.createElement('link');
            dp.rel = 'dns-prefetch'; dp.href = base;
            head.appendChild(dp);
        });
    }
    function log() { try { console.log.apply(console, ['[Rondo]'].concat(Array.prototype.slice.call(arguments))); } catch (_) { /* noop */ } }

    init();

