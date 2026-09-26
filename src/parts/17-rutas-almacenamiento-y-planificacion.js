    /* ====================== RUTAS (almacenamiento y planificacion) ====================== */
    function rutaDe(info) {
        if (!info) return null;
        return APP.rutas[info.clave] || APP.rutas[info.eco] || APP.rutas[info.placa] || APP.rutas[String(info.id)] || null;
    }
    function guardarRutas() { writeJSON(LS.rutas, APP.rutas); }
    function resetEstadoRuta(clave) {
        const m = APP.memo[clave];
        if (m) {
            m.progMax = 0; m.retornoAlerta = false; m.llego = false;
            m.desviadoDesde = null; m.rumboOpDesde = null;
            m.llegadas = null; m.paradaActual = 0; m.circuitoAlerta = false;
            writeSession(SS.memo, APP.memo);
        }
        if (APP.snapMemo[clave]) delete APP.snapMemo[clave];
    }
    async function planearRuta(eco, destino, origenOv, modo) {
        const it = unitByEco(eco);
        if (!it) { adviceErr('Unidad no encontrada', eco); return null; }
        const clave = it.info.clave;
        // Normaliza la entrada a un plan de paradas. Acepta:
        //   - un objeto { modo, circuito, paradas:[...] } (editor de paradas);
        //   - un texto con paradas separadas por '|', ';' o salto de linea.
        let plan;
        if (destino && typeof destino === 'object' && Array.isArray(destino.paradas)) {
            plan = {
                modo: destino.modo === 'optimo' ? 'optimo' : 'secuencial',
                circuito: !!destino.circuito,
                paradas: destino.paradas.map((p) => Object.assign({}, p))
            };
            APP.planes[clave] = plan;
            guardarPlanes();
        } else {
            const txt = String(destino || '').trim();
            const existente = APP.planes[clave];
            if (existente && planATexto(existente) === txt) {
                plan = existente;
            } else {
                plan = {
                    modo: existente ? existente.modo : 'secuencial',
                    circuito: existente ? !!existente.circuito : false,
                    paradas: textoAParadas(txt)
                };
                APP.planes[clave] = plan;
                guardarPlanes();
            }
        }
        if (!plan.paradas.length) { adviceErr('Sin paradas', 'Anade al menos un destino'); return null; }
        // Valida el tope antes de resolver o consultar historial: asi una lista
        // enorme no dispara decenas de peticiones a Nominatim para acabar en error.
        if (plan.paradas.length > 25) { adviceErr('Demasiadas paradas', 'Maximo 25 paradas por ruta'); return null; }
        const circuito = (plan.modo === 'optimo') ? true : !!plan.circuito;
        let origen = origenOv || null;
        // Cuando el trazado automatico esta activo, siempre intentamos
        // detectar el punto de partida por el algoritmo antes de caer a la
        // posicion actual. Asi la ruta refleja el viaje real de la unidad.
        const buscarPartida = APP.config.autoRuta || APP.config.analizarAuto;
        if (!origen && buscarPartida) {
            try {
                const v = await analizarViaje(eco, true);
                if (v && v.partida) origen = { lat: v.partida.lat, lon: v.partida.lon };
            } catch (_) { /* noop */ }
        }
        if (!origen) origen = (it.st.lat != null ? { lat: it.st.lat, lon: it.st.lon } : null);
        if (!origen) { adviceWarn('Sin origen', 'La unidad no reporta posicion actual ni historial'); return null; }
        // Resuelve cada parada (geocerca, municipio, coord o lugar).
        advice('Resolviendo paradas', plan.paradas.length + ' parada(s)...');
        const resueltas = [];
        for (let i = 0; i < plan.paradas.length; i++) {
            const p = await resolverParada(plan.paradas[i]);
            if (!p) {
                adviceErr('Parada no resuelta', 'No se pudo ubicar "' + plan.paradas[i].texto + '"');
                return null;
            }
            resueltas.push(p);
        }
        // Optimiza el orden si el plan es "mejor ruta".
        let paradas = resueltas;
        if (plan.modo === 'optimo') {
            paradas = ordenarParadasOptimo(resueltas, origen, circuito);
        }
        plan.paradas = paradas;
        APP.planes[clave] = plan;
        guardarPlanes();
        const puntos = [origen].concat(paradas.map((p) => p.coords));
        if (circuito) puntos.push({ lat: origen.lat, lon: origen.lon });
        advice('Calculando ruta', (modo === 'astar' ? 'A* sobre OSM' : 'OSRM') + ' \u00b7 ' + paradas.length + ' parada(s)');
        try {
            const calc = (modo === 'astar') ? await astarRouteMulti(puntos) : await osrmRouteMulti(puntos);
            const coords = simplificarRuta(calc.coords, 40);
            const pre = precomputarRuta(coords);
            // Acumulado (m) por parada a partir de los tramos ("legs").
            let acum = 0;
            const legs = calc.legs || [];
            for (let i = 0; i < paradas.length; i++) {
                const leg = legs[i];
                const d = leg ? (leg.distance != null ? leg.distance : (leg.distancia || 0)) : 0;
                acum += d;
                paradas[i].acum = acum;
                paradas[i].prog = pre.total ? Math.min(1, acum / pre.total) : 0;
            }
            const ultima = paradas[paradas.length - 1];
            const ruta = {
                eco: it.info.eco || clave, origen,
                destino: { lat: ultima.coords.lat, lon: ultima.coords.lon },
                destinoTexto: planATexto(plan),
                plan, paradas, circuito, optimo: plan.modo === 'optimo',
                municipios: calcularMunicipiosDeRuta(coords),
                coords, acum: pre.acum, total: pre.total,
                distancia: calc.distancia || pre.total, duracion: calc.duracion || null,
                modo: calc.modo, creada: Date.now()
            };
            APP.rutas[clave] = ruta;
            guardarRutas();
            resetEstadoRuta(clave);
            const extra = plan.modo === 'optimo' ? ' \u00b7 mejor ruta' : '';
            adviceOk('Ruta creada', Math.round(ruta.total / 1000) + ' km \u00b7 ' + ruta.modo + extra + ' \u00b7 ' + paradas.length + ' parada(s)');
            if (APP.tab === 'rutas') paintRutas();
            analizarViaje(eco, true);
            return ruta;
        } catch (e) {
            adviceErr('Error de ruta', (e && e.message) || 'sin conexion');
            return null;
        }
    }
    function eliminarRuta(eco) {
        if (!eco) return false;
        const it = unitByEco(eco);
        const clave = it ? it.info.clave : eco;
        if (APP.rutas[clave] || APP.rutas[eco]) {
            delete APP.rutas[clave];
            delete APP.rutas[eco];
            guardarRutas();
            if (it) resetEstadoRuta(clave);
            if (APP.tab === 'rutas') paintRutas();
            return true;
        }
        return false;
    }
    // Traza automaticamente la ruta de toda unidad vigilada que tenga destino
    // pero aun no tenga ruta (o cuya ruta apunte a un destino distinto).
    // Devuelve la cantidad de rutas que se programaron para calcular.
    function autoTrazarRutasPendientes(forzar) {
        if (!APP.config.autoRuta && !forzar) return [];
        if (!APP.unidades || !APP.unidades.length) return [];
        const modo = (APP.config.autoRutaModo === 'astar' && APP.config.overpass) ? 'astar' : 'osrm';
        if (modo === 'osrm' && !APP.config.osrm) return [];
        const pendientes = [];
        const vistos = new Set();
        for (let i = 0; i < APP.unidades.length; i++) {
            if (!shouldWatch(APP.unidades[i])) continue;
            const info = parseUnitName(APP.unidades[i]);
            const eco = info.eco || info.placa || String(info.id);
            if (!eco || vistos.has(eco)) continue;
            vistos.add(eco);
            const destino = watchDest(info);
            if (!destino) continue;
            const r = rutaDe(info);
            if (r && r.destinoTexto === destino && r.modo === modo) continue;
            // v6.0.6: tope de 2 intentos automaticos por unidad; el manual lo ignora.
            const intentos = (APP.rutaIntentos && APP.rutaIntentos[info.clave]) || 0;
            if (!forzar && intentos >= 2) continue;
            pendientes.push({ eco, clave: info.clave, destino, modo });
        }
        return pendientes;
    }
    // Despacha las pendientes una por una para no saturar los servicios publicos.
    async function autoTrazarRutas(forzar) {
        if (APP.rutaTrazando) return 0;
        if (!APP.rutaIntentos) APP.rutaIntentos = {};
        const pendientes = autoTrazarRutasPendientes(forzar);
        if (!pendientes.length) return 0;
        APP.rutaTrazando = true;
        let ok = 0;
        const fallos = [];
        try {
            for (let i = 0; i < pendientes.length; i++) {
                const p = pendientes[i];
                let r = null;
                try { r = await planearRuta(p.eco, p.destino, null, p.modo); } catch (_) { r = null; }
                if (r) { ok++; delete APP.rutaIntentos[p.clave]; }
                else { APP.rutaIntentos[p.clave] = (APP.rutaIntentos[p.clave] || 0) + 1; fallos.push(p.eco); }
                if (i < pendientes.length - 1) await sleep(1200);
            }
        } finally { APP.rutaTrazando = false; }
        if (fallos.length && forzar) {
            adviceWarn('Sin trazar', fallos.join(', ') + ' \u00b7 revisa el destino o la posicion de la unidad.');
        }
        // Segunda pasada automatica (una sola vez): si aun quedan pendientes
        // con intentos disponibles, reintenta en ~45 s.
        if (!forzar && fallos.length) {
            const quedan = autoTrazarRutasPendientes(false).length;
            if (quedan && !APP.rutaRetryTimer) {
                APP.rutaRetryTimer = setTimeout(() => { APP.rutaRetryTimer = null; autoTrazarRutas(); }, 45000);
            }
        }
        if (APP.tab === 'rutas') paintRutas();
        return ok;
    }
    // Manual: reintenta todas las pendientes sin tope de intentos.
    async function trazarRutasAhora() {
        APP.rutaIntentos = {};
        if (APP.rutaRetryTimer) { clearTimeout(APP.rutaRetryTimer); APP.rutaRetryTimer = null; }
        const n = await autoTrazarRutas(true);
        if (n) adviceOk('Rutas trazadas', n + ' ruta(s)');
        else adviceWarn('Sin rutas pendientes', 'No hay destinos sin trazar (o no se pudieron resolver).');
    }
    // Tiempo estimado restante (segundos) usando la velocidad reportada o, en
    // su defecto, una velocidad prudencial de carretera. Devuelve null si no
    // hay datos suficientes.
    function calcularETA(s, ruta, vel) {
        if (!s || !ruta || !ruta.total) return null;
        const restante = Math.max(0, ruta.total - (s.recorrido || 0));
        const v = (Number.isFinite(vel) && vel > 5) ? vel : 50;
        return restante / 1000 / v * 3600;
    }
    // Estado de la unidad respecto a su ruta, segun la posicion actual.
    // Usa snapRuta cuando hay coordenadas validas; si la unidad esta offline
    // o sin coordenadas lo refleja explicitamente. Ademas exige cercania real
    // al destino: un snap con progreso alto pero distancia enorme (punto
    // "pasado" del final de la polilinea) no cuenta como llegada.
    function estadoRuta(info, st) {
        const r = rutaDe(info);
        if (!r) return { estado: 'SIN RUTA' };
        if (!st || !st.online) return { estado: 'SIN POSICION', ruta: r };
        if (st.lat == null || st.lon == null) return { estado: 'SIN POSICION', ruta: r };
        const memo = APP.snapMemo[info.clave] || (APP.snapMemo[info.clave] = { idx: 0 });
        const s = snapRuta(st.lat, st.lon, r, memo);
        if (!s) return { estado: 'SIN POSICION', ruta: r };
        const paradas = r.paradas || [];
        let llegadas = 0;
        let paradaActual = paradas.length;
        const llegadaM = Math.max(80, +APP.config.paradaLlegadaM || 150);
        for (let i = 0; i < paradas.length; i++) {
            if (paradas[i].acum != null && s.recorrido >= paradas[i].acum - llegadaM) llegadas++;
            else if (paradaActual === paradas.length) paradaActual = i;
        }
        const llego = paradas.length
            ? (llegadas >= paradas.length)
            : (s.progreso >= 0.95 && s.dist <= APP.config.retornoM);
        const desviado = s.dist > APP.config.desvioM;
        const estado = llego ? 'LLEGO' : (desviado ? 'DESV' : 'EN RUTA');
        return {
            estado, ruta: r, snap: s, llego, desviado,
            llegadas, paradaActual, totalParadas: paradas.length,
            parada: (paradas[paradaActual] || null)
        };
    }
