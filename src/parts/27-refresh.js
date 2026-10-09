    /* ====================== REFRESH ====================== */
    async function refresh() {
        if (APP.refBusy || !currentUser()) return;
        // v6.19.7: en modo rendimiento no se refresca con la pestana oculta.
        if (APP.config.rendimientoPagina && document.hidden) return;
        APP.refBusy = true;
        try {
            const unidades = await fetchUnits();
            APP.unidades = unidades;
            if (APP.config.loadZones && APP.zonas.length === 0) {
                try { APP.zonas = await fetchZones(); } catch (_) { APP.zonas = []; }
                // v6.13: las geocercas dibujadas en Rondo se anaden DESPUES
                // de consultar la plataforma (si se metieran antes, APP.zonas
                // dejaria de estar vacia y las nativas no se cargarian).
                try { glocSincroniza(); } catch (e) { if (APP.unlocked) console.warn('[Rondo] gloc', e && e.message); }
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
                watched.push(u);
                const info = parseUnitName(u);
                const st = unitState(u);
                if (st.online) onNow++;
                registrarTraza(info, st);
                const prev = APP.memo[info.clave];
                const ctx = {
                    ubicaciones: ubicaciones,
                    quotaOk: APP.config.historico,
                    quotaGeo: APP.config.geocode
                };
                try {
                    const R = await evaluateUnit(u, info, st, prev, ctx);
                    nuevas[info.clave] = R;
                    actualizarOdometro(info, st, prev);
                } catch (e) {
                    if (APP.unlocked) { try { console.warn('[Rondo] reg', info.clave, e && e.message); } catch (_) { /* noop */ } }
                }
            }
            APP.memo = nuevas;
            writeSession(SS.memo, APP.memo);
            // v6.12: la alerta de geocercas puede vigilar TODA la flota. El
            // bucle anterior solo recorre las unidades vigiladas, asi que
            // las demas se evaluan aqui solo para esa regla.
            geoAlertaFlota(unidades, nuevas);

            APP.kpi.online = APP.kpi.online.concat(onNow).slice(-180);
            APP.kpi.offline = APP.kpi.offline.concat(watched.length - onNow).slice(-180);
            writeSession(SS.kpi, APP.kpi);

            paintPanel();
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

