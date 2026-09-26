    /* ====================== ALGORITMOS GEO / RUTAS (OSM + A*) ====================== */
    const RADIO_TIERRA = 6371008.8;
    // Umbral (km) por debajo del cual la proyeccion equirectangular local
    // tiene precision suficiente y es mas barata que la geodesica esferica.
    const DIST_LOCAL_UMBRAL_KM = 1;
    // Tope de grafos OSM en memoria (cajas distintas). Con mas se descartan
    // los mas antiguos en lugar de vaciar todo el cache.
    const RX_GRAFO_CACHE_MAX = 5;
    // Cache de geocodificacion directa (texto -> coordenadas) para no repetir
    // la misma consulta a Nominatim dentro de la sesion.
    const RX_GEOCODE_CACHE = new Map();

    // fetch + JSON con timeout. Nominatim/OSRM/Overpass pueden colgarse o
    // devolver HTML de error; centralizar el parseo y el corte por tiempo
    // evita promesas que nunca resuelven y detecta respuestas no-JSON.
    async function _rxFetchJson(url, opts, timeoutMs) {
        const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), Math.max(2000, timeoutMs || 20000)) : null;
        try {
            const opciones = Object.assign({}, opts || {});
            if (ctrl) opciones.signal = ctrl.signal;
            const res = await fetch(url, opciones);
            if (!res || !res.ok) throw new Error('HTTP ' + ((res && res.status) || 0));
            const txt = await res.text();
            if (!txt) return null;
            return JSON.parse(txt);
        } finally {
            if (timer) clearTimeout(timer);
        }
    }
    function rad(d) { return d * Math.PI / 180; }
    function grad(r) { return r * 180 / Math.PI; }
    function haversine(lat1, lon1, lat2, lon2) {
        const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
        const s = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * RADIO_TIERRA * Math.asin(Math.min(1, Math.sqrt(s)));
    }
    // Haversine en radianes (util para trigonometria esferica).
    function haversineAngular(lat1, lon1, lat2, lon2) {
        const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
        const s = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * Math.asin(Math.min(1, Math.sqrt(s)));
    }
    function bearing(lat1, lon1, lat2, lon2) {
        const p1 = rad(lat1), p2 = rad(lat2), dl = rad(lon2 - lon1);
        const y = Math.sin(dl) * Math.cos(p2);
        const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
        return (grad(Math.atan2(y, x)) + 360) % 360;
    }
    function difAngulo(a, b) { return Math.abs(((a - b + 540) % 360) - 180); }

    // Distancia punto->segmento. Para segmentos cortos usa proyeccion
    // equirectangular local (barata, suficiente); para los largos usa la
    // formula de cross-track sobre la esfera (geodesica).
    function distPuntoSegmento(lat, lon, aLat, aLon, bLat, bLon) {
        const dAB = haversine(aLat, aLon, bLat, bLon);
        if (dAB < DIST_LOCAL_UMBRAL_KM * 1000) {
            const lat0 = (aLat + bLat) / 2;
            const mx = 111320 * Math.cos(rad(lat0)), my = 110540;
            const px = (lon - aLon) * mx, py = (lat - aLat) * my;
            const bx = (bLon - aLon) * mx, by = (bLat - aLat) * my;
            const len2 = bx * bx + by * by;
            let t = len2 > 0 ? (px * bx + py * by) / len2 : 0;
            t = clamp(t, 0, 1);
            const dx = px - bx * t, dy = py - by * t;
            return { dist: Math.sqrt(dx * dx + dy * dy), t };
        }
        // Cross-track sobre la esfera (formula geodesica exacta).
        const d13 = haversineAngular(aLat, aLon, lat, lon);
        const d12 = haversineAngular(aLat, aLon, bLat, bLon);
        if (d12 < 1e-12) return { dist: d13 * RADIO_TIERRA, t: 0 };
        const t13 = rad(bearing(aLat, aLon, lat, lon));
        const t12 = rad(bearing(aLat, aLon, bLat, bLon));
        const sinXt = Math.sin(d13) * Math.sin(t13 - t12);
        const dXt = Math.asin(clamp(sinXt, -1, 1));
        // Along-track firmado: negativo si el pie cae antes de A.
        const dAtSigned = Math.atan2(Math.sin(d13) * Math.cos(t13 - t12), Math.cos(d13));
        if (dAtSigned < 0) return { dist: haversine(aLat, aLon, lat, lon), t: 0 };
        if (dAtSigned > d12) return { dist: haversine(bLat, bLon, lat, lon), t: 1 };
        return { dist: Math.abs(dXt) * RADIO_TIERRA, t: dAtSigned / d12 };
    }
    // Reduce una polilinea con Douglas-Peucker (iterativo, sin recursion).
    // Conserva mejor los vertices y curvas que un filtro por distancia minima.
    // epsM: tolerancia en metros. Default 25 m (equivalente aproximado al
    // antiguo minM=40 en lineas rectas, mejor en esquinas).
    function simplificarRuta(coords, epsM) {
        if (!coords || coords.length < 3) return coords ? coords.slice() : [];
        const eps = (epsM == null ? 25 : epsM);
        const n = coords.length;
        const keep = new Uint8Array(n);
        keep[0] = 1; keep[n - 1] = 1;
        const stack = [0, n - 1];
        while (stack.length) {
            const end = stack.pop();
            const start = stack.pop();
            if (end - start < 2) continue;
            const aLat = coords[start][1], aLon = coords[start][0];
            const bLat = coords[end][1], bLon = coords[end][0];
            let maxD = 0, maxI = -1;
            for (let i = start + 1; i < end; i++) {
                const d = distPuntoSegmento(coords[i][1], coords[i][0], aLat, aLon, bLat, bLon).dist;
                if (d > maxD) { maxD = d; maxI = i; }
            }
            if (maxI >= 0 && maxD > eps) {
                keep[maxI] = 1;
                stack.push(start, maxI);
                stack.push(maxI, end);
            }
        }
        const out = [];
        for (let i = 0; i < n; i++) if (keep[i]) out.push(coords[i]);
        return out;
    }
    function precomputarRuta(coords) {
        const acum = [0];
        let total = 0;
        if (!coords || !coords.length) return { acum, total };
        for (let i = 1; i < coords.length; i++) {
            total += haversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
            acum.push(total);
        }
        return { acum, total };
    }
    // Proyecta un punto sobre la polilinea de una ruta. Si se pasa memo
    // (objeto { idx }), prueba primero ese segmento y sus vecinos (idx-1, idx,
    // idx+1); si el mejor candidato esta a menos de MEMO_UMBRAL_M (1 km),
    // se considera valido y se evita el escaneo completo. Si no, se hace
    // escaneo lineal (saltos grandes: recalculo, ruta nueva, GPS erratico).
    const MEMO_UMBRAL_M = 1000;
    function snapRuta(lat, lon, ruta, memo) {
        if (!ruta || !ruta.coords || ruta.coords.length < 2 || lat == null || lon == null) return null;
        const c = ruta.coords;
        const n = c.length;
        function proyectar(i) {
            if (i < 0 || i >= n - 1) return null;
            const d = distPuntoSegmento(lat, lon, c[i][1], c[i][0], c[i + 1][1], c[i + 1][0]);
            return { dist: d.dist, idx: i, t: d.t };
        }
        function resultado(mejor) {
            const acum = ruta.acum || [0, ruta.total || 1];
            const segLen = (acum[mejor.idx + 1] || 0) - (acum[mejor.idx] || 0);
            const recorrido = (acum[mejor.idx] || 0) + mejor.t * segLen;
            const total = ruta.total || 1;
            const a = c[mejor.idx], b = c[mejor.idx + 1];
            return {
                dist: mejor.dist, idx: mejor.idx, t: mejor.t,
                progreso: clamp(recorrido / total, 0, 1),
                recorrido, total,
                rumbo: bearing(a[1], a[0], b[1], b[0])
            };
        }
        if (memo && Number.isInteger(memo.idx) && memo.idx >= 0 && memo.idx < n - 1) {
            const cands = [memo.idx, memo.idx - 1, memo.idx + 1];
            let mejor = null;
            for (let k = 0; k < cands.length; k++) {
                const p = proyectar(cands[k]);
                if (p && (!mejor || p.dist < mejor.dist)) mejor = p;
            }
            if (mejor && mejor.dist <= MEMO_UMBRAL_M) {
                memo.idx = mejor.idx;
                return resultado(mejor);
            }
        }
        // Fallback: escaneo completo (memo no disponible o vehiculo salto lejos).
        let mejor = { dist: Infinity, idx: 0, t: 0 };
        for (let i = 0; i < n - 1; i++) {
            const d = distPuntoSegmento(lat, lon, c[i][1], c[i][0], c[i + 1][1], c[i + 1][0]);
            if (d.dist < mejor.dist) mejor = { dist: d.dist, idx: i, t: d.t };
        }
        if (memo) memo.idx = mejor.idx;
        return resultado(mejor);
    }

    // Cola de prioridad binaria para A*.
    function MinHeap() { this.a = []; }
    MinHeap.prototype.push = function (item) {
        const a = this.a; a.push(item);
        let i = a.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (a[p].f <= a[i].f) break;
            const t = a[p]; a[p] = a[i]; a[i] = t; i = p;
        }
    };
    MinHeap.prototype.pop = function () {
        const a = this.a;
        if (!a.length) return null;
        const top = a[0], last = a.pop();
        if (a.length) {
            a[0] = last;
            let i = 0;
            for (;;) {
                const l = 2 * i + 1, r = l + 1;
                let m = i;
                if (l < a.length && a[l].f < a[m].f) m = l;
                if (r < a.length && a[r].f < a[m].f) m = r;
                if (m === i) break;
                const t = a[m]; a[m] = a[i]; a[i] = t; i = m;
            }
        }
        return top;
    };
    MinHeap.prototype.size = function () { return this.a.length; };

    // A* generico sobre un grafo de nodos { id: { lat, lon } } y adyacencia.
    // Cada arista puede ser: un id numerico (coste = haversine) o
    // { to, costo } donde costo es el peso real (ej. segundos). Esto permite
    // usar A* sobre el grafo OSM ponderado por maxspeed sin perder compatibilidad
    // con tests existentes.
    // Heuristica: tiempo minimo restante a la velocidad maxima posible
    // (110 km/h por autopista). Admisible y consistente.
    const VEL_MAX_RUTA_KMH = 110;
    function aEstrella(nodos, adyacencia, inicio, meta) {
        if (!nodos.has(inicio) || !nodos.has(meta)) return null;
        const metaN = nodos.get(meta);
        const hTiempo = (id) => {
            const n = nodos.get(id);
            const dM = haversine(n.lat, n.lon, metaN.lat, metaN.lon);
            return (dM / 1000) / VEL_MAX_RUTA_KMH * 3600; // segundos
        };
        const abiertos = new MinHeap();
        const g = new Map(), padre = new Map(), cerrados = new Set();
        g.set(inicio, 0);
        abiertos.push({ id: inicio, f: hTiempo(inicio) });
        let iter = 0;
        while (abiertos.size() && iter < 300000) {
            iter++;
            const actual = abiertos.pop().id;
            if (actual === meta) {
                const camino = [actual];
                let c = actual;
                while (padre.has(c)) { c = padre.get(c); camino.push(c); }
                camino.reverse();
                return { camino, costo: g.get(meta), iteraciones: iter };
            }
            if (cerrados.has(actual)) continue;
            cerrados.add(actual);
            const vecinos = adyacencia.get(actual) || [];
            const nActual = nodos.get(actual);
            const gActual = g.get(actual);
            for (let i = 0; i < vecinos.length; i++) {
                const e = vecinos[i];
                const v = (typeof e === 'object' && e) ? e.to : e;
                const peso = (typeof e === 'object' && e && e.costo != null)
                    ? e.costo
                    : (() => {
                        const nv = nodos.get(v);
                        return nv ? haversine(nActual.lat, nActual.lon, nv.lat, nv.lon) : Infinity;
                    })();
                if (cerrados.has(v)) continue;
                const nv = nodos.get(v);
                if (!nv) continue;
                const ng = gActual + peso;
                if (g.has(v) && ng >= g.get(v)) continue;
                g.set(v, ng); padre.set(v, actual);
                abiertos.push({ id: v, f: ng + hTiempo(v) });
            }
        }
        return null;
    }

    // OSRM publico (OpenStreetMap): ruta de conduccion entre dos o mas puntos.
    // OSRM acepta coordenadas separadas por ';' y devuelve un tramo ("leg")
    // por cada par consecutivo, que usamos para situar cada parada.
    async function osrmRouteMulti(puntos) {
        if (!puntos || puntos.length < 2) throw new Error('OSRM: faltan puntos');
        for (let i = 0; i < puntos.length; i++) {
            const p = puntos[i];
            if (!p || !isFinite(p.lat) || !isFinite(p.lon)) throw new Error('OSRM: coordenada invalida');
        }
        const coords = puntos.map((p) => p.lon + ',' + p.lat).join(';');
        const url = 'https://router.project-osrm.org/route/v1/driving/' + coords +
            '?overview=full&geometries=geojson&alternatives=false&steps=false';
        const d = await _rxFetchJson(url, {}, 25000);
        if (!d || !d.routes || !d.routes.length) throw new Error('OSRM sin ruta');
        const r = d.routes[0];
        if (!r || !r.geometry || !Array.isArray(r.geometry.coordinates) || !r.geometry.coordinates.length) {
            throw new Error('OSRM sin geometria');
        }
        return {
            coords: r.geometry.coordinates, distancia: r.distance, duracion: r.duration,
            legs: r.legs || [], modo: 'osrm'
        };
    }
    async function osrmRoute(origen, destino) {
        return osrmRouteMulti([origen, destino]);
    }
    // A* multipunto: encadena tramos respetando el grafo de OSM y concatena
    // la geometria (sin repetir el nodo de union entre tramos).
    async function astarRouteMulti(puntos) {
        const legs = [];
        let coordsAll = [];
        let dist = 0;
        for (let i = 0; i < puntos.length - 1; i++) {
            const r = await astarRoute(puntos[i], puntos[i + 1]);
            dist += r.distancia;
            legs.push({ distance: r.distancia, distancia: r.distancia, duration: null });
            coordsAll = coordsAll.length ? coordsAll.concat(r.coords.slice(1)) : coordsAll.concat(r.coords);
        }
        return { coords: coordsAll, distancia: dist, duracion: null, legs, modo: 'astar' };
    }

    // Overpass (OpenStreetMap): descarga el grafo vial de una caja y lo cachea.
    async function overpassGrafo(minLat, minLon, maxLat, maxLon) {
        if (!isFinite(minLat) || !isFinite(minLon) || !isFinite(maxLat) || !isFinite(maxLon)) {
            throw new Error('Overpass: bbox invalida');
        }
        const clave = [minLat, minLon, maxLat, maxLon].map((v) => v.toFixed(2)).join(',');
        if (APP.grafoCache[clave]) return APP.grafoCache[clave];
        const q = '[out:json][timeout:30];way["highway"~"motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|service|living_street"](' +
            minLat + ',' + minLon + ',' + maxLat + ',' + maxLon + ');(._;>;);out body;';
        const d = await _rxFetchJson('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(q)
        }, 35000);
        if (!d) throw new Error('Overpass sin datos');
        const nodos = new Map();
        const tagsPorWay = new Map(); // wayId -> tags
        (d.elements || []).forEach((el) => {
            if (el.type === 'node') nodos.set(el.id, { lat: el.lat, lon: el.lon });
            else if (el.type === 'way') tagsPorWay.set(el.id, el.tags || {});
        });
        // Adyacencia: Map<id, {to, distanciaM, costo}[]> donde costo es tiempo
        // estimado en segundos (distancia / velocidadPorTipo). Esto permite
        // que A* optimice por tiempo y respeta sentido unico y maxspeed.
        const ady = new Map();
        function pushArista(from, to, dist, costo) {
            if (!ady.has(from)) ady.set(from, []);
            ady.get(from).push({ to: to, distanciaM: dist, costo: costo });
        }
        (d.elements || []).forEach((el) => {
            if (el.type !== 'way' || !el.nodes || el.nodes.length < 2) return;
            const tags = tagsPorWay.get(el.id) || {};
            const sentido = sentidoOneWay(tags); // 0 bidi, 1 hacia adelante, -1 inverso
            const v = parseMaxspeed(tags) || VEL_POR_TIPO[tags.highway] || VEL_POR_TIPO.default;
            for (let i = 0; i < el.nodes.length - 1; i++) {
                const a = el.nodes[i], b = el.nodes[i + 1];
                const na = nodos.get(a), nb = nodos.get(b);
                if (!na || !nb) continue;
                const dist = haversine(na.lat, na.lon, nb.lat, nb.lon);
                const costo = (dist / 1000) / Math.max(v, 5) * 3600; // segundos
                if (sentido >= 0) pushArista(a, b, dist, costo);
                if (sentido <= 0) pushArista(b, a, dist, costo);
            }
        });
        const grafo = { nodos, ady };
        // Cache FIFO acotada: al superar el tope se descartan las cajas mas
        // antiguas. Antes, al sexto grafo se vaciaba el cache completo y se
        // repetian descargas de Overpass.
        const claves = Object.keys(APP.grafoCache);
        while (claves.length >= RX_GRAFO_CACHE_MAX) {
            delete APP.grafoCache[claves.shift()];
        }
        APP.grafoCache[clave] = grafo;
        return grafo;
    }
    // Sentido de una calle: 0 bidireccional, 1 hacia adelante, -1 inverso.
    function sentidoOneWay(tags) {
        if (!tags) return 0;
        const v = String(tags.oneway || '').toLowerCase();
        if (v === 'yes' || v === 'true' || v === '1') return 1;
        if (v === '-1' || v === 'reverse') return -1;
        if (v === 'no' || v === 'false' || v === '0') return 0;
        // Sin `oneway` explicito, una rotonda/circular es de un solo sentido
        // por definicion de OSM. Antes quedaban bidireccionales y A* podia
        // entrar por el carril contrario.
        const j = String(tags.junction || '').toLowerCase();
        if (j === 'roundabout' || j === 'circular') return 1;
        return 0;
    }
    function parseMaxspeed(tags) {
        if (!tags || !tags.maxspeed) return null;
        const m = /^\s*(\d+)/.exec(String(tags.maxspeed));
        return m ? parseInt(m[1], 10) : null;
    }
    // Velocidades por defecto por tipo de via (km/h), usadas si falta maxspeed.
    const VEL_POR_TIPO = {
        motorway: 100, motorway_link: 60,
        trunk: 80, trunk_link: 50,
        primary: 60, primary_link: 40,
        secondary: 50, secondary_link: 35,
        tertiary: 40, tertiary_link: 30,
        unclassified: 30, residential: 30,
        service: 20, living_street: 10,
        default: 30
    };
    function nodoCercano(nodos, lat, lon) {
        let mejor = null, mejorD = Infinity;
        nodos.forEach((n, id) => {
            const d = haversine(lat, lon, n.lat, n.lon);
            if (d < mejorD) { mejorD = d; mejor = id; }
        });
        return mejor;
    }
    // Ruta con A* sobre el grafo vial de OpenStreetMap.
    async function astarRoute(origen, destino) {
        if (!origen || !destino || !isFinite(origen.lat) || !isFinite(origen.lon)
            || !isFinite(destino.lat) || !isFinite(destino.lon)) {
            throw new Error('A*: coordenadas invalidas');
        }
        const spanLat = Math.abs(origen.lat - destino.lat);
        const spanLon = Math.abs(origen.lon - destino.lon);
        if (spanLat > 1.5 || spanLon > 1.5) throw new Error('Ruta demasiado larga para A* (límite ~150 km)');
        const pad = 0.015;
        const grafo = await overpassGrafo(
            Math.min(origen.lat, destino.lat) - pad, Math.min(origen.lon, destino.lon) - pad,
            Math.max(origen.lat, destino.lat) + pad, Math.max(origen.lon, destino.lon) + pad
        );
        if (!grafo.nodos.size) throw new Error('Grafo OSM vacio');
        const ini = nodoCercano(grafo.nodos, origen.lat, origen.lon);
        const fin = nodoCercano(grafo.nodos, destino.lat, destino.lon);
        if (ini == null || fin == null) throw new Error('Sin nodos cercanos');
        const r = aEstrella(grafo.nodos, grafo.ady, ini, fin);
        if (!r || !r.camino.length) throw new Error('A* sin camino');
        const coords = r.camino.map((id) => { const n = grafo.nodos.get(id); return [n.lon, n.lat]; });
        return { coords, distancia: precomputarRuta(coords).total, duracion: null, modo: 'astar', nodos: coords.length };
    }

    async function geocodificarLugar(texto) {
        const q = String(texto || '').trim();
        if (!q) return null;
        const k = q.toLowerCase();
        if (RX_GEOCODE_CACHE.has(k)) return RX_GEOCODE_CACHE.get(k);
        const espera = 1100 - (Date.now() - APP.geoLast);
        if (espera > 0) await sleep(espera);
        APP.geoLast = Date.now();
        try {
            const d = await _rxFetchJson('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es' + rxGeoParams() + '&q=' + encodeURIComponent(q), {}, 15000);
            let out = null;
            if (Array.isArray(d) && d.length) {
                const lat = parseFloat(d[0].lat), lon = parseFloat(d[0].lon);
                if (isFinite(lat) && isFinite(lon)) out = { lat, lon };
            }
            RX_GEOCODE_CACHE.set(k, out);
            if (RX_GEOCODE_CACHE.size > 200) {
                RX_GEOCODE_CACHE.delete(RX_GEOCODE_CACHE.keys().next().value);
            }
            return out;
        } catch (_) { return null; }
    }

