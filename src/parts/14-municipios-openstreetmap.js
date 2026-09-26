    /* ====================== MUNICIPIOS (OpenStreetMap) ======================
     * v5.15. Los municipios se usan de dos formas:
     *   1) Como parada de una ruta multipunto (trazar hasta su centro).
     *   2) Como "rango" de tolerancia: si una unidad sigue dentro del
     *      municipio por el que pasa su ruta, un alejamiento del eje no se
     *      marca como desvio hasta desvioMunicipioM metros.
     *
     * La fuente es OpenStreetMap: Nominatim (con polygon_geojson=1) devuelve
     * el poligono administrativo o, como minimo, su boundingbox. Los datos se
     * cachean en localStorage (rondo.api.municipios) para no repetir consultas
     * y para poder evaluar la geometria sin conexion.
     *
     * `municipiosRiesgo` aproxima los municipios que aparecen en las zonas de
     * riesgo como circulos (centroide ponderado + radio maximo) para que la
     * tolerancia funcione aunque el usuario no haya consultado OSM.
     */
    function centroDeZona(z) {
        if (!z) return null;
        const b = z.b;
        let pts = z.p;
        if (typeof pts === 'string') { try { pts = JSON.parse(pts); } catch (_) { pts = null; } }
        const radio = (z.w != null) ? +z.w : ((z.r != null) ? +z.r : 0);
        const cenX = (z.c && z.c.x != null) ? +z.c.x : (b && b.cen_x != null ? +b.cen_x : null);
        const cenY = (z.c && z.c.y != null) ? +z.c.y : (b && b.cen_y != null ? +b.cen_y : null);
        // v5.15.2: solo es circulo si NO hay poligono/polilinea con puntos.
        // Antes cualquier zona con bounding box (b.cen_x) se trataba como
        // circulo, lo que daba areas y centros incorrectos en poligonos.
        const minimoPts = (z.t === 1) ? 2 : 3;
        const esCirculo = (z.t === 3) || ((!Array.isArray(pts) || pts.length < minimoPts) && cenX != null && cenY != null && radio > 0);
        if (esCirculo && cenX != null && cenY != null) return { lat: cenY, lon: cenX };
        if (Array.isArray(pts) && pts.length) {
            const cenArea = _rxCentroideAnillo(pts);
            if (cenArea) return cenArea;
            // Fallback: promedio de vertices (poligono degenerado o abierto).
            let sLat = 0, sLon = 0, n = 0;
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i];
                const la = (a && a.y != null) ? +a.y : (Array.isArray(a) ? +a[1] : null);
                const lo = (a && a.x != null) ? +a.x : (Array.isArray(a) ? +a[0] : null);
                if (la == null || lo == null || isNaN(la) || isNaN(lo)) continue;
                sLat += la; sLon += lo; n++;
            }
            if (n) return { lat: sLat / n, lon: sLon / n };
        }
        if (cenX != null && cenY != null) return { lat: cenY, lon: cenX };
        if (b && b.min_y != null && b.max_y != null && b.min_x != null && b.max_x != null) {
            return { lat: (+b.min_y + +b.max_y) / 2, lon: (+b.min_x + +b.max_x) / 2 };
        }
        return null;
    }
    // Normaliza un anillo a puntos {x:lon, y:lat} descartando entradas rotas.
    // (Definido despues de centroDeZona: las declaraciones de funcion se
    // hoistean, y asi el bloque de pruebas que arranca en centroDeZona las
    // incluye.)
    function _rxPuntosAnillo(anillo) {
        const out = [];
        for (let i = 0; i < (Array.isArray(anillo) ? anillo.length : 0); i++) {
            const a = anillo[i];
            const y = (a && a.y != null) ? +a.y : (Array.isArray(a) ? +a[1] : NaN);
            const x = (a && a.x != null) ? +a.x : (Array.isArray(a) ? +a[0] : NaN);
            if (!isFinite(x) || !isFinite(y)) continue;
            out.push({ x, y });
        }
        return out;
    }
    // Centroide del area de un anillo (shoelace proyectado a metros). A
    // diferencia del promedio de vertices, no se escapa en poligonos concavos.
    // Devuelve null si el anillo es degenerado (area ~0).
    function _rxCentroideAnillo(anillo) {
        const pts = _rxPuntosAnillo(anillo);
        if (pts.length < 3) return null;
        const lat0 = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const mx = 111320 * Math.cos(lat0 * Math.PI / 180), my = 110540;
        let area2 = 0, cx = 0, cy = 0;
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length];
            const xi = a.x * mx, yi = a.y * my;
            const xj = b.x * mx, yj = b.y * my;
            const cruz = xi * yj - xj * yi;
            area2 += cruz;
            cx += (xi + xj) * cruz;
            cy += (yi + yj) * cruz;
        }
        if (Math.abs(area2) < 1e-9) return null;
        return { lat: (cy / (3 * area2)) / my, lon: (cx / (3 * area2)) / mx };
    }
    // Area firmada de un anillo (grados^2); sirve para comparar tamanos.
    function _rxAreaAnillo(anillo) {
        if (!Array.isArray(anillo) || anillo.length < 3) return 0;
        let a = 0;
        for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
            const xi = +anillo[i][0], yi = +anillo[i][1];
            const xj = +anillo[j][0], yj = +anillo[j][1];
            if (!isFinite(xi) || !isFinite(yi) || !isFinite(xj) || !isFinite(yj)) continue;
            a += xj * yi - xi * yj;
        }
        return Math.abs(a / 2);
    }
    // Punto-en-poligono (ray casting) con anillo en orden GeoJSON [[lon,lat],...].
    function puntoEnPoligono(lat, lon, anillo) {
        if (!Array.isArray(anillo) || anillo.length < 3) return false;
        let dentro = false;
        for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
            const xi = +anillo[i][0], yi = +anillo[i][1];
            const xj = +anillo[j][0], yj = +anillo[j][1];
            const cruza = ((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi);
            if (cruza) dentro = !dentro;
        }
        return dentro;
    }
    function simplificarAnillo(anillo, maxPts) {
        if (!Array.isArray(anillo) || anillo.length <= (maxPts || 600)) return anillo;
        // Reduccion por paso uniforme; suficiente para tolerancia de desvio.
        const paso = Math.ceil(anillo.length / (maxPts || 600));
        const out = [];
        for (let i = 0; i < anillo.length; i += paso) out.push(anillo[i]);
        if (out[out.length - 1] !== anillo[anillo.length - 1]) out.push(anillo[anillo.length - 1]);
        return out;
    }
    function _anilloExterior(geojson) {
        if (!geojson) return null;
        if (geojson.type === 'Polygon' && geojson.coordinates && geojson.coordinates[0]) return geojson.coordinates[0];
        if (geojson.type === 'MultiPolygon' && geojson.coordinates && geojson.coordinates.length) {
            // Elegir la isla de mayor area (no la de mas vertices): un anillo
            // costero muy detallado podia ganarle al cuerpo principal.
            let mejor = null, mejorArea = -1;
            for (let i = 0; i < geojson.coordinates.length; i++) {
                const r = geojson.coordinates[i] && geojson.coordinates[i][0];
                if (!r) continue;
                const area = _rxAreaAnillo(r);
                if (area > mejorArea) { mejorArea = area; mejor = r; }
            }
            return mejor;
        }
        return null;
    }
    function municipioDesdeNominatim(r) {
        if (!r) return null;
        const a = r.address || {};
        const nombre = a.municipality || a.city || a.town || a.village || a.county || r.name || (r.display_name || '').split(',')[0];
        if (!nombre) return null;
        const estado = a.state || a.region || a.state_district || '';
        const bb = Array.isArray(r.boundingbox) ? r.boundingbox.map(Number) : null;
        const anillo = _anilloExterior(r.geojson);
        const poligono = anillo ? simplificarAnillo(anillo, 600) : null;
        let centro = null;
        if (poligono && poligono.length) {
            centro = _rxCentroideAnillo(poligono);
            if (!centro) {
                let sLat = 0, sLon = 0, n = 0;
                for (let i = 0; i < poligono.length; i++) {
                    const la = +poligono[i][1], lo = +poligono[i][0];
                    if (!isFinite(la) || !isFinite(lo)) continue;
                    sLat += la; sLon += lo; n++;
                }
                if (n) centro = { lat: sLat / n, lon: sLon / n };
            }
        }
        if (!centro && isFinite(+r.lat) && isFinite(+r.lon)) {
            centro = { lat: +r.lat, lon: +r.lon };
        }
        if (!centro && bb) {
            centro = { lat: (bb[0] + bb[1]) / 2, lon: (bb[2] + bb[3]) / 2 };
        }
        if (!centro) return null;
        return {
            id: 'osm:' + norm(nombre) + ':' + norm(estado),
            nombre: String(nombre),
            estado: String(estado || ''),
            // v6.0.6: tipo/clase de OSM para distinguir un municipio/ciudad de
            // una direccion cualquiera.
            tipoOSM: String(r.addresstype || r.type || ''),
            claseOSM: String(r.class || ''),
            centro,
            poligono,                                   // [[lon,lat],...] o null
            bbox: bb ? { minLat: bb[0], maxLat: bb[1], minLon: bb[2], maxLon: bb[3] } : null,
            fuente: 'osm'
        };
    }
    // v6.0.6: ¿el resultado parece un municipio/ciudad/entidad administrativa?
    function esMunicipioOSM(m) {
        if (!m) return false;
        const t = String(m.tipoOSM || '').toLowerCase();
        const c = String(m.claseOSM || '').toLowerCase();
        if (c === 'boundary') return true;
        return ['administrative', 'municipality', 'city', 'town', 'village',
            'county', 'state_district', 'region', 'province', 'district'].indexOf(t) >= 0;
    }
    function buscarMunicipioLocal(texto) {
        const q = norm(texto || '');
        if (!q) return null;
        const todos = (APP.municipios || []).concat(APP.municipiosRiesgo || []);
        let mejor = null, mejorSc = 0;
        for (let i = 0; i < todos.length; i++) {
            const m = todos[i];
            const n = norm(m.nombre || '');
            let sc = 0;
            if (n === q) sc = 1000;
            else if (n.indexOf(q) >= 0 || q.indexOf(n) >= 0) sc = 700 - Math.abs(n.length - q.length);
            if (sc > mejorSc) { mejorSc = sc; mejor = m; }
        }
        return mejor;
    }
    function guardarMunicipios() {
        // Tope defensivo para no llenar localStorage: 150 municipios.
        if (APP.municipios.length > 150) APP.municipios = APP.municipios.slice(-150);
        writeJSON(LS.municipios, APP.municipios);
    }
    // Consulta (o recupera de cache) un municipio de OSM. Devuelve el objeto
    // normalizado con centro/poligono/bbox, o null si no se pudo resolver.
    async function municipioOSM(texto, recargar, soloMunicipio) {
        const q = String(texto || '').trim();
        if (!q) return null;
        if (!recargar) {
            const local = buscarMunicipioLocal(q);
            if (local && (local.poligono || local.bbox) && (!soloMunicipio || esMunicipioOSM(local))) return local;
        }
        const espera = 1100 - (Date.now() - APP.geoLast);
        if (espera > 0) await sleep(espera);
        APP.geoLast = Date.now();
        try {
            const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&addressdetails=1&limit=5&accept-language=es&q=' + encodeURIComponent(q);
            const d = await _rxFetchJson(url, {}, 15000);
            if (!Array.isArray(d) || !d.length) return null;
            let cand = d.map(municipioDesdeNominatim).filter(Boolean);
            // Cuando se busca "deteccion automatica" solo aceptamos resultados
            // que parezcan municipio/ciudad (no una calle/negocio cualquiera).
            if (soloMunicipio) cand = cand.filter(esMunicipioOSM);
            if (!cand.length) return null;
            cand.sort((a, b) => (b.poligono ? 1 : 0) - (a.poligono ? 1 : 0));
            const m = cand[0];
            const idx = APP.municipios.findIndex((x) => x.id === m.id);
            if (idx >= 0) APP.municipios[idx] = Object.assign({}, APP.municipios[idx], m);
            else APP.municipios.push(m);
            guardarMunicipios();
            return m;
        } catch (_) { return null; }
    }
    // Devuelve el municipio que contiene el punto (poligono o circulo).
    function municipioEn(lat, lon) {
        if (lat == null || lon == null) return null;
        const todos = (APP.municipios || []).concat(APP.municipiosRiesgo || []);
        for (let i = 0; i < todos.length; i++) {
            const m = todos[i];
            if (!m) continue;
            if (m.poligono && m.poligono.length) {
                // Descarte rapido por bbox antes de recorrer el poligono: el
                // ray-casting con cientos de vertices es caro y municipioEn se
                // llama por cada punto muestreado de cada ruta.
                const bb = m.bbox;
                if (bb && (lat < bb.minLat || lat > bb.maxLat || lon < bb.minLon || lon > bb.maxLon)) continue;
                if (puntoEnPoligono(lat, lon, m.poligono)) return m;
            } else if (m.bbox) {
                if (lat >= m.bbox.minLat && lat <= m.bbox.maxLat && lon >= m.bbox.minLon && lon <= m.bbox.maxLon) return m;
            } else if (m.centro && m.radioM) {
                if (haversine(lat, lon, m.centro.lat, m.centro.lon) <= m.radioM) return m;
            }
        }
        return null;
    }
    // Aproxima los municipios de las zonas de riesgo como circulos.
    function recalcularMunicipiosRiesgo() {
        if (!APP.riesgo || !APP.riesgo.length) { APP.municipiosRiesgo = []; return; }
        const map = new Map();
        for (let i = 0; i < APP.riesgo.length; i++) {
            const z = APP.riesgo[i];
            if (!z || !z.municipio || !z.centro) continue;
            const k = norm(z.estado || '') + '|' + norm(z.municipio);
            let m = map.get(k);
            if (!m) { m = { id: 'riesgo:' + k, nombre: z.municipio, estado: z.estado || '', fuente: 'riesgo', centro: { lat: 0, lon: 0 }, radioM: 0, peso: 0 }; map.set(k, m); }
            const w = Math.max(1, +z.score || 1);
            m.centro.lat = (m.centro.lat * m.peso + z.centro[0] * w) / (m.peso + w);
            m.centro.lon = (m.centro.lon * m.peso + z.centro[1] * w) / (m.peso + w);
            m.peso += w;
            m.radioM = Math.max(m.radioM, (+z.radio_m || 0));
        }
        APP.municipiosRiesgo = Array.from(map.values()).map((m) => {
            m.radioM = Math.max(800, m.radioM);
            return m;
        });
    }

