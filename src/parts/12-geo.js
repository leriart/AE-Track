    /* ====================== GEO ====================== */
    function inZone(lat, lon, z) {
        if (!z || lat == null || lon == null) return false;
        try {
            const y = +lat, x = +lon;
            if (!isFinite(x) || !isFinite(y)) return false;
            const b = z.b;
            // Descarte rapido por bounding box (si viene).
            if (b && b.min_x != null && (x < b.min_x || x > b.max_x || y < b.min_y || y > b.max_y)) return false;
            // Puntos: pueden venir como array o como string JSON.
            let p = z.p;
            if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) { p = null; } }
            const t = z.t;
            // Circulo (t=3) o cualquier zona con centro (c o b.cen_x/cen_y) + radio.
            const cenX = (z.c && z.c.x != null) ? +z.c.x : (b && b.cen_x != null ? +b.cen_x : null);
            const cenY = (z.c && z.c.y != null) ? +z.c.y : (b && b.cen_y != null ? +b.cen_y : null);
            const radio = (z.w != null) ? +z.w : (z.r != null ? +z.r : null);
            if (t === 3 || (t == null && cenX != null && cenY != null && radio != null)) {
                if (cenX != null && cenY != null && radio != null) {
                    return _geoDistM(y, x, cenY, cenX) <= radio;
                }
            }
            if (Array.isArray(p) && p.length >= 2) {
                const ptX = (a) => (a.x != null) ? +a.x : +a[0];
                const ptY = (a) => (a.y != null) ? +a.y : +a[1];
                // Linea (t=1): dentro si esta a <= radio/2 del trazado.
                if (t === 1) {
                    const r = (radio || 0);
                    for (let i = 0; i < p.length - 1; i++) {
                        const a = p[i], c = p[i + 1];
                        const d = distPuntoSegmento(y, x, ptY(a), ptX(a), ptY(c), ptX(c));
                        if (d && d.dist <= r) return true;
                    }
                    // Los puntos de una linea llevan su propio radio (a.r): si
                    // no hay w, usa el mayor de los radios de los puntos.
                    if (!r) {
                        const rmax = p.reduce((m, a) => Math.max(m, a.r || 0), 0);
                        if (rmax) {
                            for (let i = 0; i < p.length - 1; i++) {
                                const a = p[i], c = p[i + 1];
                                const d = distPuntoSegmento(y, x, ptY(a), ptX(a), ptY(c), ptX(c));
                                if (d && d.dist <= rmax) return true;
                            }
                        }
                    }
                    return false;
                }
                // Poligono (t=2 o sin tipo): ray-casting.
                if (p.length >= 3) {
                    let inside = false;
                    // OJO: j = i++ incrementa i; con j = i el bucle se
                    // quedaba infinito y congelaba la pagina.
                    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
                        const a = p[i], c = p[j];
                        const xi = ptX(a), yi = ptY(a), xj = ptX(c), yj = ptY(c);
                        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
                    }
                    return inside;
                }
            }
            // Sin geometria fina: el bounding box sirve de aproximacion.
            return !!(b && b.min_x != null);
        } catch (_) { return false; }
    }
    // Distancia local (equirectangular, metros). Autosuficiente para que
    // inZone no dependa de helpers definidos mas abajo (los tests extraen
    // solo el bloque inZone..zoneAt).
    function _geoDistM(lat1, lon1, lat2, lon2) {
        const lat0 = (lat1 + lat2) / 2;
        const mx = 111320 * Math.cos(lat0 * Math.PI / 180), my = 110540;
        const dx = (lon2 - lon1) * mx, dy = (lat2 - lat1) * my;
        return Math.sqrt(dx * dx + dy * dy);
    }
    // v6.0.2: indice espacial de geocercas por celdas (~2 km). Acelera
    // zoneAt cuando hay muchas zonas y se consulta por unidad/refresco. Si
    // alguna zona no tiene bounding box (o es enorme), se desactiva y se usa
    // el recorrido lineal. Se reconstruye solo cuando cambia el array.
    function construirIndiceZonas() {
        const zs = APP.zonas || [];
        const sinIndice = () => { APP.zonasIndex = { arr: zs, mapa: null, celda: 0 }; };
        if (zs.length < 8) { sinIndice(); return; }
        const celda = 0.02;
        const mapa = new Map();
        let celdas = 0;
        for (let i = 0; i < zs.length; i++) {
            const b = zs[i] && zs[i].b;
            if (!b || b.min_x == null || b.max_x == null || b.min_y == null || b.max_y == null) { sinIndice(); return; }
            const x0 = Math.floor(b.min_x / celda), x1 = Math.floor(b.max_x / celda);
            const y0 = Math.floor(b.min_y / celda), y1 = Math.floor(b.max_y / celda);
            celdas += (x1 - x0 + 1) * (y1 - y0 + 1);
            if (celdas > 20000) { sinIndice(); return; }
            for (let cx = x0; cx <= x1; cx++) {
                for (let cy = y0; cy <= y1; cy++) {
                    const k = cx + '|' + cy;
                    let arr = mapa.get(k);
                    if (!arr) { arr = []; mapa.set(k, arr); }
                    arr.push(i);
                }
            }
        }
        APP.zonasIndex = { arr: zs, mapa: mapa, celda: celda };
    }
    function zoneAt(lat, lon) {
        if (!APP.config.loadZones || lat == null || lon == null) return '';
        const zs = APP.zonas;
        if (!zs || !zs.length) return '';
        const idx = APP.zonasIndex;
        if (!idx || idx.arr !== zs) construirIndiceZonas();
        const ix = APP.zonasIndex;
        if (ix && ix.mapa) {
            const arr = ix.mapa.get(Math.floor(lon / ix.celda) + '|' + Math.floor(lat / ix.celda));
            if (!arr) return '';
            for (let i = 0; i < arr.length; i++) {
                const z = zs[arr[i]];
                if (z && inZone(lat, lon, z)) return z.n || ('Zona ' + z.id);
            }
            return '';
        }
        for (let i = 0; i < zs.length; i++) {
            if (inZone(lat, lon, zs[i])) return zs[i].n || ('Zona ' + zs[i].id);
        }
        return '';
    }
    async function reverseGeocode(lat, lon) {
        if (!APP.config.geocode || lat == null || lon == null) return null;
        const y = Number(lat), x = Number(lon);
        if (!isFinite(y) || !isFinite(x)) return null;
        const key = y.toFixed(3) + ',' + x.toFixed(3);
        if (APP.geoCache[key]) return APP.geoCache[key];
        const espera = 1100 - (Date.now() - APP.geoLast);
        if (espera > 0) await sleep(espera);
        APP.geoLast = Date.now();
        try {
            const d = await _rxFetchJson('https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&accept-language=es&lat=' + y + '&lon=' + x, {}, 15000);
            const a = (d && d.address) || {};
            const detalle = a.road || a.pedestrian || a.suburb || a.village || a.hamlet || '';
            const ciudad = a.city || a.town || a.municipality || a.county || a.state || '';
            const info = { texto: [detalle, ciudad].filter(Boolean).join(', '), ciudad };
            // No cachear direcciones vacias: una respuesta rara o un fallo
            // puntual del servicio no debe fijar "sin direccion" en la sesion.
            if (info.texto) {
                APP.geoCache[key] = info;
                writeSession(SS.geo, APP.geoCache);
            }
            return info;
        } catch (_) { return null; }
    }

