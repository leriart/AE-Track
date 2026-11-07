    /* ====================== REFRESH ====================== */
    // Unidades evaluadas a la vez. Antes se hacia una por una: una consulta
    // de historial o una geocodificacion detenia al resto de la flota y el
    // primer refresco de una flota grande podia tardar decenas de segundos.
    // Se acota para no saturar la API de Wialon ni el hilo principal.
    const RX_REFRESH_CONC = 6;
    // Si la plataforma no devuelve geocercas (o la busqueda falla), no se
    // reintenta en cada refresco: eran 4 busquedas + get_zone_data cada 10 s.
    // Se reintenta cada 5 minutos sin dejar de refrescar unidades.
    const RX_ZONAS_REINTENTO_MS = 5 * 60000;
    let _rxZonasProximo = 0;
    async function refresh() {
        if (APP.refBusy || !currentUser()) return;
        // v6.19.7: en modo rendimiento no se refresca con la pestana oculta.
        if (APP.config.rendimientoPagina && document.hidden) return;
        APP.refBusy = true;
        try {
            // Unidades y geocercas se piden a la vez: la primera pintura ya no
            // espera dos viajes de red consecutivos. Las geocercas no se
            // reintentan en cada ciclo si no hay o si fallaron.
            const necesitaZonas = APP.config.loadZones && APP.zonas.length === 0 &&
                Date.now() >= _rxZonasProximo;
            const zonasP = necesitaZonas ? fetchZones().catch(() => []) : null;
            const unidades = await fetchUnits();
            APP.unidades = unidades;
            if (zonasP) {
                let zs = [];
                try { zs = (await zonasP) || []; } catch (_) { zs = []; }
                APP.zonas = zs;
                _rxZonasProximo = zs.length ? 0 : (Date.now() + RX_ZONAS_REINTENTO_MS);
                // v6.13: las geocercas dibujadas en Rondo se anaden DESPUES
                // de consultar la plataforma (si se metieran antes, APP.zonas
                // dejaria de estar vacia y las nativas no se cargarian). Se
                // pasa la lista vigente: sin argumento, glocSincroniza la
                // vaciaba y las geocercas de la app desaparecian al refrescar.
                try { glocSincroniza(glocLista()); } catch (e) { if (APP.unlocked) console.warn('[Rondo] gloc', e && e.message); }
            }
            APP.consultaRestante = 40;
            // Presupuesto de geocodificacion inversa por refresco: los avisos
            // con contexto de municipio (detenido, destino) no deben encadenar
            // llamadas a Nominatim para toda la flota y retrasar el refresco.
            APP.geoRestante = 8;
            const ubicaciones = {};
            const nuevas = {};
            // El recorrido se calcula una sola vez (antes se llamaba a
            // shouldWatch/unitState dos veces por unidad y por refresco).
            const watched = [];
            let onNow = 0;
            for (let i = 0; i < unidades.length; i++) {
                const u = unidades[i];
                if (!shouldWatch(u)) continue;
                const info = parseUnitName(u);
                const st = unitState(u);
                if (st.online) onNow++;
                registrarTraza(info, st);
                watched.push({ u, info, st, prev: APP.memo[info.clave] });
            }
            // Mismo contexto para todas: los presupuestos son compartidos y se
            // descuentan antes de cada await, asi que no se duplican.
            const ctx = {
                ubicaciones: ubicaciones,
                quotaOk: APP.config.historico,
                quotaGeo: APP.config.geocode
            };
            await rxEnLotes(watched, RX_REFRESH_CONC, async (w) => {
                try {
                    const R = await evaluateUnit(w.u, w.info, w.st, w.prev, ctx);
                    nuevas[w.info.clave] = R;
                    actualizarOdometro(w.info, w.st, w.prev);
                } catch (e) {
                    if (APP.unlocked) { try { console.warn('[Rondo] reg', w.info.clave, e && e.message); } catch (_) { /* noop */ } }
                }
            });
            APP.memo = nuevas;
            writeSession(SS.memo, APP.memo);
            // v6.12: la alerta de geocercas puede vigilar TODA la flota. El
            // bucle anterior solo recorre las unidades vigiladas, asi que
            // las demas se evaluan aqui solo para esa regla.
            geoAlertaFlota(unidades, nuevas);

            APP.kpi.online = APP.kpi.online.concat(onNow).slice(-180);
            APP.kpi.offline = APP.kpi.offline.concat(watched.length - onNow).slice(-180);
            writeSession(SS.kpi, APP.kpi);

            // Sello de version de los datos: el intervalo de 1 s repinta la
            // pestaña solo cuando cambia, no en cada tic (ver 39).
            APP.rev = (APP.rev || 0) + 1;
            // Panel oculto: no se pinta nada (el reloj de 1 s tambien se
            // detiene). Al abrirlo, _paintRev = 0 fuerza el primer repintado.
            if (!APP.panelHidden) paintPanel();
            else APP._paintRev = 0;
            revalidarContornos();
        } catch (e) {
            if (APP.unlocked) { try { console.warn('[Rondo] refresh', e && e.message); } catch (_) { /* noop */ } }
        } finally {
            APP.refBusy = false;
        }
    }

    function restartTimers() {
        if (APP.timer) clearInterval(APP.timer);
        APP.timer = setInterval(refresh, APP.config.pollMs);
        restartVerificationLoop();
    }

