    /* ====================== ANALISIS DE VIAJE (historial) ====================== */
    function esZonaCarga(nombre) {
        return /\b(CARGA|CARGAR|DESCARGA|CEDIS|PATIO|PLANTA|OFICINAS|ALMACEN|TALLER|BODEGA|BASCULA|RASTRO|LABORATORIO|SILO)\b/.test(norm(nombre));
    }
    // Descarga el historial de posiciones y velocidad de una unidad.
    async function fetchHistorial(uid, horas) {
        const ahora = Math.floor(Date.now() / 1000);
        const r = await remoteCall('messages/load_interval', {
            itemId: uid,
            timeFrom: ahora - Math.max(1, horas) * 3600,
            timeTo: ahora,
            flags: 1, flagsMask: 1, loadCount: 5000
        });
        return (r.messages || []).map((m) => {
            const pos = m.pos || {};
            return { t: m.t, lat: pos.y, lon: pos.x, s: pos.s || 0 };
        }).filter((p) => p.lat != null && p.lon != null && p.t).sort((a, b) => a.t - b.t);
    }
    // Punto de partida: el ultimo tramo parado (<=3 km/h) de al menos `horas`
    // horas, es decir, donde el vehiculo estuvo apagado/parado mas de 6 horas.
    // Usa DBSCAN con grid espacial sobre los puntos con velocidad baja para
    // agrupar lecturas cercanas (insensible al jitter GPS).
    function detectarPuntoPartida(puntos, horas) {
        const grupos = segmentosParados(puntos, 0, puntos.length);
        const umbralSeg = Math.max(1, horas) * 3600;
        // El tramo "abierto" (que llega hasta el final) no cuenta como inicio.
        const tFin = puntos[puntos.length - 1].t;
        for (let i = grupos.length - 1; i >= 0; i--) {
            const g = grupos[i];
            const abierto = (tFin - g.hasta) <= 60;
            if (abierto) continue;
            if (g.durSeg >= umbralSeg) {
                return {
                    lat: g.lat, lon: g.lon, t: g.desde,
                    durHoras: g.durSeg / 3600, finIdx: g.finIdx
                };
            }
        }
        return null;
    }
    // Paradas de al menos `paradaMin` minutos dentro del trayecto.
    function analizarParadas(puntos, desde, paradaMin, partidaSeg) {
        const grupos = segmentosParados(puntos, desde, puntos.length);
        return grupos.filter((g) => {
            return g.durSeg >= paradaMin * 60 && g.durSeg < partidaSeg;
        }).map((g) => ({
            lat: g.lat, lon: g.lon, desde: g.desde, hasta: g.hasta,
            durMin: g.durSeg / 60, abierto: false
        }));
    }
    // Umbrales y helpers de clusterizacion de paradas (DBSCAN espacial).
    const UMBRAL_PARADO_KMH = 3;
    const DBSCAN_EPS_M = 80;
    const DBSCAN_MIN_PTS = 2;

    // Agrupa puntos cercanos (clusterizacion por densidad).
    function dbscanStops(puntos, epsM, minPts) {
        if (!puntos || puntos.length === 0) return [];
        const eps = epsM || DBSCAN_EPS_M;
        const minN = minPts || DBSCAN_MIN_PTS;
        const cellDeg = eps / 110000;
        const grid = new Map();
        for (let i = 0; i < puntos.length; i++) {
            const key = Math.floor(puntos[i].lat / cellDeg) + ',' + Math.floor(puntos[i].lon / cellDeg);
            let arr = grid.get(key);
            if (!arr) { arr = []; grid.set(key, arr); }
            arr.push(i);
        }
        const visitado = new Uint8Array(puntos.length);
        const clusters = [];
        for (let i = 0; i < puntos.length; i++) {
            if (visitado[i]) continue;
            visitado[i] = 1;
            const vecinos = vecinosCercanos(puntos, i, eps, cellDeg, grid);
            if (vecinos.length < minN) continue;
            const cluster = [i];
            const cola = vecinos.slice();
            while (cola.length) {
                const k = cola.pop();
                if (!visitado[k]) {
                    visitado[k] = 1;
                    const n2 = vecinosCercanos(puntos, k, eps, cellDeg, grid);
                    if (n2.length >= minN) {
                        for (let q = 0; q < n2.length; q++) cola.push(n2[q]);
                    }
                }
                if (cluster.indexOf(k) < 0) cluster.push(k);
            }
            clusters.push(cluster);
        }
        return clusters;
    }
    function vecinosCercanos(puntos, i, eps, cellDeg, grid) {
        const cx = Math.floor(puntos[i].lat / cellDeg);
        const cy = Math.floor(puntos[i].lon / cellDeg);
        const out = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const cell = grid.get((cx + dx) + ',' + (cy + dy));
                if (!cell) continue;
                for (let m = 0; m < cell.length; m++) {
                    const j = cell[m];
                    if (j === i) continue;
                    if (haversine(puntos[i].lat, puntos[i].lon, puntos[j].lat, puntos[j].lon) <= eps) {
                        out.push(j);
                    }
                }
            }
        }
        return out;
    }
    function segmentosParados(puntos, desde, hasta) {
        const candidatos = [];
        const indices = [];
        for (let i = desde; i < hasta; i++) {
            if (puntos[i].s <= UMBRAL_PARADO_KMH) {
                candidatos.push(puntos[i]);
                indices.push(i);
            }
        }
        if (candidatos.length === 0) return [];
        const clusters = dbscanStops(candidatos, DBSCAN_EPS_M, DBSCAN_MIN_PTS);
        const grupos = [];
        for (let c = 0; c < clusters.length; c++) {
            const cl = clusters[c];
            let sumLat = 0, sumLon = 0;
            let tIni = Infinity, tFin = -Infinity;
            let idxIni = -1, idxFin = -1;
            for (let q = 0; q < cl.length; q++) {
                const k = cl[q];
                const p = candidatos[k];
                sumLat += p.lat; sumLon += p.lon;
                if (p.t < tIni) { tIni = p.t; idxIni = indices[k]; }
                if (p.t > tFin) { tFin = p.t; idxFin = indices[k]; }
            }
            grupos.push({
                lat: sumLat / cl.length, lon: sumLon / cl.length,
                desde: tIni, hasta: tFin, durSeg: tFin - tIni,
                iniIdx: idxIni, finIdx: idxFin,
                nPuntos: cl.length
            });
        }
        grupos.sort((a, b) => a.desde - b.desde);
        return grupos;
    }
    async function analizarViaje(eco, silencioso) {
        const it = unitByEco(eco);
        if (!it) { if (!silencioso) adviceErr('Unidad no encontrada', eco); return null; }
        const horas = Math.max(2, Number(APP.config.historialHoras) || 168);
        const partidaHoras = Math.max(1, Number(APP.config.partidaHoras) || 6);
        const paradaMin = Math.max(1, Number(APP.config.paradaMin) || 15);
        if (!silencioso) advice('Analizando viaje', 'historial de ' + horas + ' h...');
        let puntos = [];
        try { puntos = await fetchHistorial(it.u.id, horas); }
        catch (e) { if (!silencioso) adviceWarn('Sin historial', (e && e.message) || 'sin conexion'); return null; }
        if (puntos.length < 3) { if (!silencioso) adviceWarn('Sin datos', 'No hay suficiente historial'); return null; }
        const partida = detectarPuntoPartida(puntos, partidaHoras);
        if (!partida) { if (!silencioso) advice('Sin punto de partida', 'No se halló una parada de más de ' + partidaHoras + ' h'); return null; }
        const desde = partida.finIdx;
        const trayecto = puntos.slice(desde);
        const paradas = analizarParadas(puntos, desde, paradaMin, partidaHoras * 3600);
        let dist = 0;
        for (let i = 1; i < trayecto.length; i++) {
            dist += haversine(trayecto[i - 1].lat, trayecto[i - 1].lon, trayecto[i].lat, trayecto[i].lon);
        }
        let salida = null;
        for (let i = desde; i < puntos.length; i++) { if (puntos[i].s > 3) { salida = puntos[i]; break; } }
        const fin = puntos[puntos.length - 1];
        let maxDist = 0;
        for (let i = desde; i < puntos.length; i++) {
            const d = haversine(partida.lat, partida.lon, puntos[i].lat, puntos[i].lon);
            if (d > maxDist) maxDist = d;
        }
        const ruta = rutaDe(it.info);
        let llego = false, tLlegada = null, destino = null;
        const radio = Math.max(150, Number(APP.config.retornoM) || 400);
        if (ruta && ruta.destino) {
            for (let i = desde; i < puntos.length; i++) {
                if (haversine(puntos[i].lat, puntos[i].lon, ruta.destino.lat, ruta.destino.lon) <= radio) {
                    llego = true; tLlegada = puntos[i].t;
                    destino = { lat: ruta.destino.lat, lon: ruta.destino.lon };
                    break;
                }
            }
        }
        const distInicio = haversine(fin.lat, fin.lon, partida.lat, partida.lon);
        // Deteccion de regreso al punto de partida. Hay dos senales:
        //   1. Heuristica clasica: la unidad se alejo del origen (llego) y
        //      ahora vuelve a estar cerca sin haber llegado al final.
        //   2. Si hay ruta trazada, usamos snapRuta: la posicion actual
        //      esta en la polilinea cerca del origen (progreso bajo) y a
        //      menos de retornoM del punto de partida. Esto detecta el
        //      regreso aunque la unidad haya llegado por un camino alterno.
        let regreso = !!(llego && distInicio > 300 && distInicio < maxDist * 0.6);
        if (!regreso && ruta && ruta.coords && ruta.coords.length > 1) {
            try {
                const memoS = APP.snapMemo[it.info.clave] || (APP.snapMemo[it.info.clave] = { idx: 0 });
                const sFin = snapRuta(fin.lat, fin.lon, ruta, memoS);
                if (sFin && sFin.progreso < 0.15 && distInicio <= APP.config.retornoM) {
                    regreso = true;
                }
            } catch (_) { /* fallback a la heuristica */ }
        }
        const zonaPartida = zoneAt(partida.lat, partida.lon);
        const cargo = esZonaCarga(zonaPartida)
            || (paradas.length > 0 && haversine(paradas[0].lat, paradas[0].lon, partida.lat, partida.lon) < 300);
        const traza = simplificarRuta(trayecto.map((p) => [p.lon, p.lat]), 120);
        const v = {
            eco: it.info.eco, uid: it.u.id,
            partida, salida: salida ? salida.t : partida.t,
            fin: { lat: fin.lat, lon: fin.lon, t: fin.t },
            paradas, puntos: trayecto.length, distanciaKm: Math.round(dist / 1000),
            zonaPartida, cargo, llego, tLlegada, destino, regreso,
            maxDistKm: Math.round(maxDist / 1000), traza, analizado: Date.now()
        };
        APP.viajes[it.info.eco] = v;
        writeSession(SS.viajes, APP.viajes);
        if (APP.tab === 'rutas') paintRutas();
        if (!silencioso) {
            adviceOk('Viaje analizado', v.distanciaKm + ' km · ' + v.paradas.length + ' parada(s)'
                + (cargo ? ' · carga' : '') + (llego ? ' · llego a destino' : '') + (regreso ? ' · en regreso' : ''));
        }
        return v;
    }
    function exportViajeGeoJSON(eco) {
        const v = APP.viajes[eco];
        if (!v) { adviceWarn('Sin análisis', 'Analiza el viaje primero'); return; }
        const features = [];
        if (v.traza && v.traza.length > 1) {
            features.push({ type: 'Feature', properties: { tipo: 'trayecto', eco, distancia_km: v.distanciaKm }, geometry: { type: 'LineString', coordinates: v.traza } });
        }
        features.push({ type: 'Feature', properties: { tipo: 'partida', zona: v.zonaPartida || '' }, geometry: { type: 'Point', coordinates: [v.partida.lon, v.partida.lat] } });
        if (v.destino) features.push({ type: 'Feature', properties: { tipo: 'destino' }, geometry: { type: 'Point', coordinates: [v.destino.lon, v.destino.lat] } });
        v.paradas.forEach((p, i) => features.push({ type: 'Feature', properties: { tipo: 'parada', n: i + 1, minutos: Math.round(p.durMin) }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } }));
        descargarJSON({ type: 'FeatureCollection', features }, 'rondo_viaje_' + eco + '_' + new Date().toISOString().slice(0, 10) + '.geojson');
        adviceOk('Viaje exportado', eco);
    }

