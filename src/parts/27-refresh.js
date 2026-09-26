    /* ====================== REFRESH ====================== */
    async function refresh() {
        if (APP.refBusy || !currentUser()) return;
        APP.refBusy = true;
        try {
            const unidades = await fetchUnits();
            APP.unidades = unidades;
            if (APP.config.loadZones && APP.zonas.length === 0) {
                try { APP.zonas = await fetchZones(); } catch (_) { APP.zonas = []; }
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

