    /* ====================== INIT ====================== */
    // v8.14: si la plataforma embebe su propio panel en un iframe del mismo
    // origen, evita una segunda instancia de Rondo dentro del marco (doble
    // polling, doble UI y dos MutationObserver). Si el marco superior no es
    // Wialon/AE-Track (integracion externa), se permite.
    function rxEsMarcoDuplicado() {
        try {
            if (!window.top || window.top === window.self) return false;
            const w = window.top.wialon;
            return !!(w && w.core && w.core.Session);
        } catch (_) { return false; }
    }
    async function init() {
        // Idempotente: en modo hibrido el chunk ui y el bootstrap pueden
        // llamarla; evita construir la interfaz dos veces (dos UI superpuestas,
        // la de arriba sin listeners = botones muertos).
        if (APP._iniciado) return;
        APP._iniciado = true;
        if (rxEsMarcoDuplicado()) return;
        const primerUso = !localStorage.getItem(LS.cfg);
        // v6.19.7: adelanta DNS/TLS a los origenes que se van a usar.
        try { precargarOrigenes(); } catch (_) { /* noop */ }
        // La capa de rendimiento no necesita sesion: se aplica antes de
        // construir la UI y de que la plataforma termine de montar el panel,
        // que es justo cuando mas pesa (login, primeras listas y mapa).
        try { rxAplicarRendimientoPagina(); } catch (_) { /* noop */ }
        try { if (APP.config && APP.config.estiloPagina) rxAplicarEstiloPagina(); } catch (_) { /* noop */ }
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
        try { rxBindLogoRevelar(); } catch (_) { /* noop */ }
        try { rxPintaReveal(); } catch (_) { /* noop */ }
        try { rxDiagBind(); } catch (_) { /* noop */ }
        // El panel abierto se pinta ya con los datos persistidos (rutas,
        // avisos, configuracion) mientras la API responde: deja de verse vacio
        // durante el primer fetch. Si esta oculto no se gasta nada.
        if (!APP.panelHidden) { try { paintPanel(); } catch (_) { /* noop */ } }

        const apiOk = await wialonReady();
        if (apiOk) log('API de Wialon detectada. Esperando sesion...');
        // v8.14: no se abandona a los 120 s. Si el operador tarda en iniciar
        // sesion (o la SPA monta la API mas tarde), Rondo quedaba muerto hasta
        // recargar; ahora espera con backoff y arranca en cuanto hay sesion.
        let espera = 1000;
        while (!currentUser()) {
            if (!wialonListo()) {
                avisoEl.textContent = rxEnLogin()
                    ? 'Inicia sesión en la plataforma para que Rondo pueda monitorear.'
                    : 'No se encontró la API de Wialon (wialon.core) en esta página.';
                avisoEl.style.display = 'block';
                // Si la API aun no esta, se espera activamente un momento antes
                // de volver al bucle (la SPA puede estar reconstruyendo).
                try { await wialonReady(3000); } catch (_) { /* noop */ }
            } else {
                avisoEl.textContent = 'Sesión de Wialon no iniciada. Inicia sesión para monitorear.';
                avisoEl.style.display = 'block';
            }
            await sleep(espera);
            espera = Math.min(5000, espera + 500);
        }
        avisoEl.style.display = 'none';
        APP.unlocked = true;
        // Con document-end el objeto de metadatos de la plataforma puede no
        // existir en el primer intento. Ya con la API lista, se completa el
        // preconnect (incluida la URL real de la API) antes del primer fetch.
        try { precargarOrigenes(); } catch (_) { /* noop */ }
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

