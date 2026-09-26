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
            let mejor = null;
            for (let i = 0; i < geojson.coordinates.length; i++) {
                const r = geojson.coordinates[i] && geojson.coordinates[i][0];
                if (r && (!mejor || r.length > mejor.length)) mejor = r;
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
            let sLat = 0, sLon = 0;
            for (let i = 0; i < poligono.length; i++) { sLon += +poligono[i][0]; sLat += +poligono[i][1]; }
            centro = { lat: sLat / poligono.length, lon: sLon / poligono.length };
        } else if (r.lat != null && r.lon != null) {
            centro = { lat: +r.lat, lon: +r.lon };
        } else if (bb) {
            centro = { lat: (bb[0] + bb[1]) / 2, lon: (bb[2] + bb[3]) / 2 };
        }
        if (!centro) return null;
        return {
            id: 'osm:' + norm(nombre) + ':' + norm(estado),
            nombre: String(nombre),
            estado: String(estado || ''),
            centro,
            poligono,                                   // [[lon,lat],...] o null
            bbox: bb ? { minLat: bb[0], maxLat: bb[1], minLon: bb[2], maxLon: bb[3] } : null,
            fuente: 'osm'
        };
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
    async function municipioOSM(texto, recargar) {
        const q = String(texto || '').trim();
        if (!q) return null;
        if (!recargar) {
            const local = buscarMunicipioLocal(q);
            if (local && (local.poligono || local.bbox)) return local;
        }
        const espera = 1100 - (Date.now() - APP.geoLast);
        if (espera > 0) await sleep(espera);
        APP.geoLast = Date.now();
        try {
            const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&addressdetails=1&limit=3&accept-language=es&q=' + encodeURIComponent(q);
            const res = await fetch(url);
            const d = await res.json();
            if (!d || !d.length) return null;
            const cand = d.map(municipioDesdeNominatim).filter(Boolean);
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

