    /* ====================== RIESGO ======================
     * Zonas de alto riesgo alimentadas por una URL externa (CSV o JSON).
     * El repositorio de Rondo no incluye datos: el usuario pega en
     * Ajustes > Riesgo una URL que apunta a un CSV/JSON publico, o
     * importa un archivo desde disco.
     *
     * Formatos aceptados al cargar:
     *   JSON: { items: [...] }  |  { features: [...] } (GeoJSON)  |  [ ... ]
     *   CSV :  1 fila por zona con columnas lat/lon/score/radio/estado/municipio/delito/conteo
     *
     * La regla `riesgoSinSenal` dispara una alerta critica cuando una unidad
     * transiciona de con senal -> sin senal y su ultima posicion valida cae
     * dentro del buffer de una zona cargada.
     */
    function _norm(s) {
        return (s == null) ? '' : String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    }
    function _splitCSVLine(line, sep) {
        const out = [];
        let cell = '', inQ = false, i = 0;
        while (i < line.length) {
            const c = line[i];
            if (inQ) {
                if (c === '"') {
                    if (line[i + 1] === '"') { cell += '"'; i += 2; continue; }
                    inQ = false; i++; continue;
                }
                cell += c; i++; continue;
            }
            if (c === '"') { inQ = true; i++; continue; }
            if (c === sep) { out.push(cell); cell = ''; i++; continue; }
            cell += c; i++;
        }
        out.push(cell);
        return out;
    }
    function _parseCSV(text, sep) {
        const t = String(text || '').replace(/^\uFEFF/, '');
        const lines = t.split(/\r?\n/).filter((l) => l.length > 0);
        if (!lines.length) return { header: [], rows: [] };
        // El separador efectivo puede haber sido sobreescrito o autodetectado.
        const rows = lines.map((l) => _splitCSVLine(l, sep));
        const header = rows.shift().map((h) => _norm(h));
        return { header, rows };
    }
    function _autoSep(text) {
        const sample = String(text || '').slice(0, 2048);
        const lines = sample.split(/\r?\n/).filter(Boolean);
        if (!lines.length) return ',';
        const c = (lines[0].match(/,/g) || []).length;
        const s = (lines[0].match(/;/g) || []).length;
        const t = (lines[0].match(/\t/g) || []).length;
        if (t >= c && t >= s && t > 0) return '\t';
        if (s > c) return ';';
        return ',';
    }
    function _findCol(header, keys) {
        for (let i = 0; i < header.length; i++) {
            const h = header[i];
            for (let k = 0; k < keys.length; k++) {
                if (h === keys[k] || h.indexOf(keys[k]) >= 0) return i;
            }
        }
        return -1;
    }
    function _normItem(z, source, idx) {
        if (!z) return null;
        let lat = null, lon = null;
        if (Array.isArray(z.centro) && z.centro.length >= 2) {
            lat = +z.centro[0]; lon = +z.centro[1];
        } else {
            if (z.lat != null) lat = +z.lat;
            // OJO: usar != null (no ||) para no descartar lon = 0 (meridiano
            // de Greenwich) ni confundirlo con una columna ausente.
            if (z.lon != null) lon = +z.lon;
            else if (z.lng != null) lon = +z.lng;
            else if (z.long != null) lon = +z.long;
        }
        if (lat == null || lon == null || !isFinite(lat) || !isFinite(lon)) return null;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
        const radio = +(z.radio_m || z.radio || z.buffer || z.distancia || 0);
        const score = +(z.score || z.severidad || z.riesgo || z.incidencia || 0);
        const estado = z.estado || z.state || z.entidad || z.entidad_federativa || '';
        const municipio = z.municipio || z.municipality || z.city || z.ciudad || z.alcaldia || z.alcald\u00eda || '';
        const id = z.id || ((source || 'item') + '-' + idx + '-' + Math.round(lat * 100) + '-' + Math.round(lon * 100));
        const delitos = (z.delitos && typeof z.delitos === 'object') ? z.delitos : null;
        // Suma de delitos (para derivar score cuando falta o es 0).
        let total = 0;
        if (delitos) {
            for (const k in delitos) {
                const v = +delitos[k];
                if (isFinite(v) && v > 0) total += v;
            }
        }
        // Si no hay delitos pero hay "nota" tipo "total X", intenta extraer.
        if (!total && typeof z.nota === 'string') {
            const m = /total\s*[:=]?\s*(\d+)/i.exec(z.nota);
            if (m) total = +m[1];
        }
        return {
            id, estado: String(estado), municipio: String(municipio),
            centro: [lat, lon], radio_m: radio, score,
            fuente: z.fuente || source || 'usuario',
            delitos: delitos || null,
            nota: z.nota || z.note || '',
            _total: total
        };
    }
    // Devuelve el radio (m) derivado del score cuando el dataset no lo incluye.
    function _radioDeScore(score) {
        if (score >= 70) return 4000;
        if (score >= 40) return 2200;
        if (score >= 20) return 1400;
        return 500;
    }
    function _itemsFromJSON(data) {
        let arr = null;
        if (Array.isArray(data)) arr = data;
        else if (data && Array.isArray(data.items)) arr = data.items;
        else if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
            arr = data.features.map((f) => {
                if (!f || !f.geometry) return null;
                const g = f.geometry;
                if (g.type === 'Point' && Array.isArray(g.coordinates)) {
                    return Object.assign({}, f.properties || {}, {
                        centro: [g.coordinates[1], g.coordinates[0]]
                    });
                }
                return null;
            }).filter(Boolean);
        }
        if (!arr) return [];
        const out = [];
        for (let i = 0; i < arr.length; i++) {
            const it = _normItem(arr[i], 'json', i);
            if (it) out.push(it);
        }
        // Si la mayoria de items no tienen score explicito, derivar del total
        // de delitos normalizado por el maximo del dataset.
        let sinScore = 0;
        for (let i = 0; i < out.length; i++) if (!(out[i].score > 0)) sinScore++;
        if (out.length > 0 && sinScore / out.length > 0.5) {
            let maxTotal = 0;
            for (let i = 0; i < out.length; i++) if (out[i]._total > maxTotal) maxTotal = out[i]._total;
            if (maxTotal > 0) {
                for (let i = 0; i < out.length; i++) {
                    const it = out[i];
                    if (!(it.score > 0) && it._total > 0) {
                        // Distribucion con raiz para abrir el espectro.
                        it.score = Math.max(1, Math.min(100, Math.round(Math.sqrt(it._total / maxTotal) * 100)));
                    }
                }
            }
        }
        // Si no hay radio_m, derivarlo del score.
        for (let i = 0; i < out.length; i++) {
            const it = out[i];
            if (!(it.radio_m > 0) && it.score > 0) {
                it.radio_m = _radioDeScore(it.score);
            }
        }
        // Limpia campos auxiliares.
        for (let i = 0; i < out.length; i++) delete out[i]._total;
        return out;
    }
    function _itemsFromCSV(text) {
        const sep = _autoSep(text);
        const { header, rows } = _parseCSV(text, sep);
        if (!header.length || !rows.length) return [];
        const iLat = _findCol(header, ['lat', 'latitud']);
        const iLon = _findCol(header, ['lon', 'lng', 'long', 'longitud']);
        if (iLat < 0 || iLon < 0) return [];
        const iScore = _findCol(header, ['score', 'severidad', 'riesgo', 'incidencia', 'peligrosidad']);
        const iRadio = _findCol(header, ['radio_m', 'radio', 'buffer', 'distancia', 'distancia_m']);
        const iEstado = _findCol(header, ['estado', 'entidad', 'state']);
        const iMun = _findCol(header, ['municipio', 'municipality', 'ciudad', 'alcaldia', 'alcald\u00eda']);
        const iDelito = _findCol(header, ['delito', 'tipo', 'categoria', 'crime', 'crimen']);
        const iConteo = _findCol(header, ['conteo', 'count', 'casos', 'incidentes', 'valor', 'frecuencia']);
        // Agrupa filas por (lat,lon,radio,score).
        const buckets = new Map();
        let defaultRadio = 0, defaultScore = 0;
        let anonIdx = 0;
        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const lat = +row[iLat];
            const lon = +row[iLon];
            if (!isFinite(lat) || !isFinite(lon)) continue;
            const radio = (iRadio >= 0) ? +row[iRadio] : defaultRadio;
            const score = (iScore >= 0) ? +row[iScore] : defaultScore;
            const key = lat.toFixed(5) + ',' + lon.toFixed(5) + ',' + radio + ',' + score;
            let b = buckets.get(key);
            if (!b) {
                b = {
                    id: 'csv-' + (++anonIdx),
                    estado: (iEstado >= 0) ? row[iEstado] : '',
                    municipio: (iMun >= 0) ? row[iMun] : '',
                    centro: [lat, lon],
                    radio_m: (radio > 0) ? radio : 0,
                    score,
                    fuente: 'csv',
                    delitos: {},
                    nota: ''
                };
                buckets.set(key, b);
            }
            if (iDelito >= 0 && iConteo >= 0) {
                const d = (row[iDelito] || '').trim();
                const c = parseFloat(row[iConteo]);
                if (d && isFinite(c)) b.delitos[d] = (b.delitos[d] || 0) + c;
            }
            if (!b.estado && iEstado >= 0) b.estado = row[iEstado] || '';
            if (!b.municipio && iMun >= 0) b.municipio = row[iMun] || '';
        }
        // Si no hay columna de radio se deriva del score mas abajo (en el
        // bucle de salida), no hace falta estimarlo aqui.
        const out = [];
        // Acumula total de delitos por bucket para derivar score si falta.
        for (const b of buckets.values()) {
            let total = 0;
            if (b.delitos) for (const k in b.delitos) { const v = +b.delitos[k]; if (isFinite(v) && v > 0) total += v; }
            b._total = total;
        }
        // Si la mayoria de buckets no tienen score, derivarlo del total normalizado.
        let sinScore = 0;
        for (const b of buckets.values()) if (!(b.score > 0)) sinScore++;
        const totalBuckets = buckets.size;
        if (totalBuckets > 0 && sinScore / totalBuckets > 0.5) {
            let maxTotal = 0;
            for (const b of buckets.values()) if (b._total > maxTotal) maxTotal = b._total;
            if (maxTotal > 0) {
                for (const b of buckets.values()) {
                    if (!(b.score > 0) && b._total > 0) {
                        b.score = Math.max(1, Math.min(100, Math.round(Math.sqrt(b._total / maxTotal) * 100)));
                    }
                }
            }
        }
        for (const b of buckets.values()) {
            if (!(b.radio_m > 0) && b.score > 0) {
                b.radio_m = _radioDeScore(b.score);
            }
            if (!(b.radio_m > 0)) continue;
            out.push({
                id: b.id,
                estado: String(b.estado || ''),
                municipio: String(b.municipio || ''),
                centro: b.centro,
                radio_m: b.radio_m,
                score: b.score,
                fuente: 'csv',
                delitos: Object.keys(b.delitos).length ? b.delitos : null,
                nota: ''
            });
        }
        return out;
    }
    async function cargarRiesgo(url) {
        const src = (url != null) ? String(url).trim() : (APP.config && APP.config.riesgoUrl || '');
        if (!src) { APP.riesgo = null; APP.riesgoErr = null; APP.riesgoEstado = 'idle'; return; }
        if (typeof fetch !== 'function') { APP.riesgoErr = 'fetch() no disponible'; APP.riesgoEstado = 'error'; return; }
        if (APP._riesgoFetched === src && APP.riesgoEstado === 'cargando') return;
        APP._riesgoFetched = src;
        APP.riesgoEstado = 'cargando';
        if (APP.tab === 'riesgo') paintRiesgo();
        try {
            const formato = (APP.config && APP.config.riesgoFormato) || 'auto';
            const r = await fetch(src, { cache: 'no-store', credentials: 'omit' });
            if (!r.ok) {
                APP.riesgoErr = 'HTTP ' + r.status + ' desde la URL de riesgo';
                APP.riesgo = null;
                APP.riesgoEstado = 'error';
            } else {
                const text = await r.text();
                const trimmed = String(text || '').trim();
                let items = [];
                let fmt = (formato || 'auto').toLowerCase();
                if (fmt === 'auto') {
                    fmt = (trimmed.length && (trimmed[0] === '[' || trimmed[0] === '{')) ? 'json' : 'csv';
                }
                if (fmt === 'json') {
                    try {
                        const data = JSON.parse(trimmed);
                        items = _itemsFromJSON(data);
                        if (!items.length) {
                            APP.riesgoErr = 'JSON sin items v\u00e1lidos ({} o [])';
                            APP.riesgo = null;
                            APP.riesgoEstado = 'error';
                            if (APP.tab === 'riesgo') paintRiesgo();
                            return;
                        }
                    } catch (e) {
                        APP.riesgoErr = 'JSON inv\u00e1lido: ' + (e && e.message || '');
                        APP.riesgo = null;
                        APP.riesgoEstado = 'error';
                        if (APP.tab === 'riesgo') paintRiesgo();
                        return;
                    }
                } else {
                    items = _itemsFromCSV(trimmed);
                    if (!items.length) {
                        APP.riesgoErr = 'CSV sin columnas lat/lon reconocibles';
                        APP.riesgo = null;
                        APP.riesgoEstado = 'error';
                        if (APP.tab === 'riesgo') paintRiesgo();
                        return;
                    }
                }
                APP.riesgo = items;
                APP.riesgoErr = null;
                APP.riesgoTs = Date.now();
                APP.riesgoEstado = 'ok';
                recalcularMunicipiosRiesgo();
                if (APP.unlocked) {
                    try { console.log('[Rondo] riesgo cargado:', items.length, 'zonas (' + fmt + ')'); } catch (_) {}
                }
            }
        } catch (e) {
            APP.riesgoErr = (e && e.message) ? e.message : String(e);
            APP.riesgo = null;
            APP.riesgoEstado = 'error';
        }
        if (APP.tab === 'riesgo') paintRiesgo();
    }
    function puntoEnZonaDeRiesgo(lat, lon) {
        if (!APP.riesgo || !APP.riesgo.length) return null;
        if (lat == null || lon == null) return null;
        const minScore = Number((APP.config && APP.config.riesgoMinScore) || 0);
        const mul = Number((APP.config && APP.config.riesgoRadioMul) || 1);
        let mejor = null;
        for (let i = 0; i < APP.riesgo.length; i++) {
            const z = APP.riesgo[i];
            if (!z || !z.centro || !Array.isArray(z.centro)) continue;
            if (!(z.radio_m > 0)) continue;
            if (typeof z.score !== 'number' || !isFinite(z.score) || z.score < minScore) continue;
            const radioKm = (z.radio_m * mul) / 1000;
            // Prefiltro barato por bounding box antes del haversine: con
            // datasets grandes (miles de zonas) y una llamada por unidad y
            // refresco, evita calcular distancias de zonas lejanas. El margen
            // es conservador (nunca descarta una zona que pueda contener el
            // punto), asi que el resultado es identico al de antes.
            const margenLat = radioKm / 110.5 + 0.001;
            if (Math.abs(lat - z.centro[0]) > margenLat) continue;
            const cosLat = Math.cos(Math.max(Math.abs(lat), Math.abs(z.centro[0])) * Math.PI / 180);
            const margenLon = (cosLat > 1e-6) ? (radioKm / (111.32 * cosLat) + 0.001) : 180;
            if (Math.abs(lon - z.centro[1]) > margenLon) continue;
            const distKm = haversine(lat, lon, z.centro[0], z.centro[1]);
            if (distKm <= radioKm) {
                if (!mejor || z.score > mejor.score) {
                    mejor = {
                        id: z.id, estado: z.estado, municipio: z.municipio,
                        score: z.score, dist: distKm * 1000, fuente: z.fuente
                    };
                }
            }
        }
        return mejor;
    }
    /* ── Algoritmos UI de la pestana Riesgo ─────────────────────────────
     * Clasificacion, estadisticas, filtrado, ordenamiento y agrupacion.
     * Funciones puras: no leen DOM ni APP, salvo donde se indica.
     */
    // Umbrales de nivel. Se exponen aqui para que tests y UI coincidan.
    const RIESGO_NIVEL = Object.freeze({ ALTO: 70, MEDIO: 40 });
    function nivelRiesgo(score) {
        const s = Number(score) || 0;
        if (s >= RIESGO_NIVEL.ALTO) return 'alto';
        if (s >= RIESGO_NIVEL.MEDIO) return 'medio';
        return 'bajo';
    }
    // Radio efectivo ya con el multiplicador configurado.
    function radioEfectivo(z, mul) {
        const r = (z && z.radio_m) || 0;
        const m = Number(mul);
        return r * (Number.isFinite(m) && m > 0 ? m : 1);
    }
    // Area de un circulo en km^2 a partir del radio en metros.
    function areaKm2DeRadio(radio_m) {
        if (!(radio_m > 0)) return 0;
        const km = radio_m / 1000;
        return Math.PI * km * km;
    }
    // Texto corto para area: < 1 km^2 -> m^2; si no, km^2 con 1 decimal.
    function fmtArea(km2) {
        if (!km2) return '0';
        if (km2 < 1) return Math.round(km2 * 1e6).toLocaleString('es-MX') + ' m\u00b2';
        return km2.toFixed(1) + ' km\u00b2';
    }
    // Convierte los delitos del item en una cadena legible (top 3).
    function delitosTop(z, max) {
        const d = z && z.delitos;
        if (!d || typeof d !== 'object') return '';
        const keys = Object.keys(d).filter((k) => d[k] > 0);
        keys.sort((a, b) => d[b] - d[a]);
        const n = Math.max(1, max || 3);
        return keys.slice(0, n).map((k) => k.replace(/_/g, ' ') + ': ' + d[k]).join(' \u00b7 ');
    }
    // Convierte el item a un texto "haystack" para busqueda difusa.
    function riesgoHaystack(z) {
        if (!z) return '';
        const partes = [
            z.id, z.estado, z.municipio, z.fuente,
            (z.delitos && typeof z.delitos === 'object') ? Object.keys(z.delitos).join(' ') : ''
        ];
        return partes.filter(Boolean).join(' ').toLowerCase();
    }
    // Calcula estadisticas agregadas para el hero / KPIs.
    function calcularStatsRiesgo(items) {
        const out = { total: 0, alto: 0, medio: 0, bajo: 0, areaKm2: 0,
            municipios: 0, fuenteSet: {}, maxScore: 0, sumScore: 0, delitosAcum: {} };
        if (!items || !items.length) return out;
        const muns = new Set();
        out.total = items.length;
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            const score = Number(z.score) || 0;
            const nivel = nivelRiesgo(score);
            out[nivel]++;
            out.sumScore += score;
            if (score > out.maxScore) out.maxScore = score;
            if (z.radio_m > 0) out.areaKm2 += areaKm2DeRadio(z.radio_m);
            if (z.municipio) muns.add(z.estado + '|' + z.municipio);
            if (z.fuente) out.fuenteSet[z.fuente] = (out.fuenteSet[z.fuente] || 0) + 1;
            if (z.delitos && typeof z.delitos === 'object') {
                Object.keys(z.delitos).forEach((k) => {
                    const n = Number(z.delitos[k]) || 0;
                    if (n > 0) out.delitosAcum[k] = (out.delitosAcum[k] || 0) + n;
                });
            }
        }
        out.municipios = muns.size;
        out.areaKm2 = Math.round(out.areaKm2 * 10) / 10;
        out.promScore = Math.round(out.sumScore / out.total);
        return out;
    }
    // Filtra por texto libre y nivel. Devuelve un array nuevo.
    function filtrarZonas(items, query, nivel) {
        if (!items || !items.length) return [];
        const q = String(query || '').toLowerCase().trim();
        const lvl = nivel || 'todas';
        if (!q && (lvl === 'todas' || !lvl)) return items.slice();
        const out = [];
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            if (lvl !== 'todas' && nivelRiesgo(z.score) !== lvl) continue;
            if (q && riesgoHaystack(z).indexOf(q) < 0) continue;
            out.push(z);
        }
        return out;
    }
    // Ordena por el criterio dado. Devuelve un array nuevo.
    function ordenarZonas(items, criterio) {
        if (!items) return [];
        const arr = items.slice();
        const c = criterio || 'score';
        const cmpStr = (a, b) => String(a || '').localeCompare(String(b || ''), 'es');
        switch (c) {
            case 'score-asc': arr.sort((a, b) => (Number(a.score) || 0) - (Number(b.score) || 0)); break;
            case 'score-desc': arr.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)); break;
            case 'estado': arr.sort((a, b) => cmpStr(a.estado, b.estado) || ((Number(b.score) || 0) - (Number(a.score) || 0))); break;
            case 'municipio': arr.sort((a, b) => cmpStr(a.municipio, b.municipio) || ((Number(b.score) || 0) - (Number(a.score) || 0))); break;
            case 'radio-desc': arr.sort((a, b) => (Number(b.radio_m) || 0) - (Number(a.radio_m) || 0)); break;
            case 'radio-asc': arr.sort((a, b) => (Number(a.radio_m) || 0) - (Number(b.radio_m) || 0)); break;
            default: arr.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
        }
        return arr;
    }
    // Agrupa por estado. Cada grupo incluye count, maxScore, municipios.
    function agruparPorEstado(items) {
        const grupos = Object.create(null);
        if (!items) return [];
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            const est = z.estado || 'Sin estado';
            if (!grupos[est]) {
                grupos[est] = { estado: est, count: 0, municipios: new Set(),
                    maxScore: 0, sumScore: 0, alto: 0, medio: 0, bajo: 0, areaKm2: 0, zonas: [] };
            }
            const g = grupos[est];
            g.count++;
            g.zonas.push(z);
            const score = Number(z.score) || 0;
            if (score > g.maxScore) g.maxScore = score;
            g.sumScore += score;
            g[nivelRiesgo(score)]++;
            if (z.municipio) g.municipios.add(z.municipio);
            if (z.radio_m > 0) g.areaKm2 += areaKm2DeRadio(z.radio_m);
        }
        const arr = Object.values(grupos);
        arr.forEach((g) => {
            g.municipios = g.municipios.size;
            g.promScore = Math.round(g.sumScore / g.count);
            g.areaKm2 = Math.round(g.areaKm2 * 10) / 10;
            g.zonas = ordenarZonas(g.zonas, 'score-desc');
            delete g.sumScore;
        });
        arr.sort((a, b) => b.maxScore - a.maxScore || b.count - a.count);
        return arr;
    }
    // Top N delitos agregados (para el footer del hero).
    function topDelitos(stats, n) {
        if (!stats || !stats.delitosAcum) return [];
        const arr = Object.keys(stats.delitosAcum).map((k) => ({ key: k, n: stats.delitosAcum[k] }));
        arr.sort((a, b) => b.n - a.n);
        return arr.slice(0, n || 3);
    }
    // ── Dona y distribucion ────────────────────────────────────────
    // Dado el total y los segmentos, devuelve los parametros del arco SVG
    // para dibujarlo. size es el diametro, grosor el ancho del anillo.
    // Salida: array [{fraccion, colorKey, dashArray, dashOffset}] para 3 segmentos.
    function donutSegmentos(alto, medio, bajo, size, grosor) {
        const total = (alto || 0) + (medio || 0) + (bajo || 0);
        if (total === 0 || !size) {
            return { total: 0, segmentos: [], radio: (size || 0) / 2 - (grosor || 0) / 2,
                circunferencia: 0, grosor: grosor || 0 };
        }
        const radio = size / 2 - grosor / 2;
        const circunferencia = 2 * Math.PI * radio;
        const seg = (n, key) => ({
            n: n || 0,
            fraccion: (n || 0) / total,
            colorKey: key,
            longitud: ((n || 0) / total) * circunferencia,
        });
        return { total, radio, circunferencia, grosor: grosor || 0,
            segmentos: [seg(alto, 'alto'), seg(medio, 'medio'), seg(bajo, 'bajo')] };
    }
    // Calcula los offset y longitudes para un stroke-dasharray de 3 segmentos
    // que cubran la circunferencia sin huecos. Salida: 3 objetos {len, off}.
    function donutDashArray(seg, circ) {
        if (!seg || !circ) return [];
        let acumulado = 0;
        return seg.map((s) => {
            const len = Math.max(0.0001, s.longitud);
            const off = -acumulado;
            acumulado += s.longitud;
            return { len, off, colorKey: s.colorKey, fraccion: s.fraccion, n: s.n };
        });
    }
    // ── Histograma de scores ───────────────────────────────────────
    // Cuenta zonas por buckets de score. Por defecto 5 buckets de 20 puntos.
    // Devuelve {buckets: [[lo,hi],...], counts: [...], max, total}.
    function histogramaScores(items, buckets) {
        const bk = buckets || [[0, 20], [20, 40], [40, 60], [60, 80], [80, 101]];
        const counts = bk.map(() => 0);
        if (!items || !items.length) {
            return { buckets: bk, counts: counts, max: 0, total: 0 };
        }
        let max = 0;
        let total = 0;
        for (let i = 0; i < items.length; i++) {
            const s = Number(items[i].score) || 0;
            if (s < 0 || s > 100) continue;
            for (let j = 0; j < bk.length; j++) {
                if (s >= bk[j][0] && s < bk[j][1]) {
                    counts[j]++;
                    total++;
                    if (counts[j] > max) max = counts[j];
                    break;
                }
            }
        }
        return { buckets: bk, counts, max, total };
    }
    // ── Tiempo relativo ────────────────────────────────────────────
    // Devuelve "hace 5 min", "hace 2 h", "recien" segun el timestamp.
    function tiempoRelativo(ts) {
        if (!ts) return '';
        const d = Date.now() - ts;
        if (d < 0) return 'recien';
        const s = Math.floor(d / 1000);
        if (s < 45) return 'hace ' + s + ' s';
        const m = Math.floor(s / 60);
        if (m < 60) return 'hace ' + m + ' min';
        const h = Math.floor(m / 60);
        if (h < 24) return 'hace ' + h + ' h';
        const dd = Math.floor(h / 24);
        return 'hace ' + dd + ' d';
    }
    // ── Formato de exportacion ─────────────────────────────────────
    // Construye un array de filas (header + datos) para CSV.
    // Columnas: estado, municipio, score, radio_m, lat, lon, fuente, id, delitos_resumen.
    function riesgoParaCSV(items) {
        const header = ['estado', 'municipio', 'score', 'radio_m', 'lat', 'lon', 'fuente', 'id', 'delitos'];
        const filas = [header];
        if (!items || !items.length) return filas;
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            const d = (z.delitos && typeof z.delitos === 'object')
                ? Object.keys(z.delitos).filter((k) => z.delitos[k] > 0)
                    .map((k) => k + ':' + z.delitos[k]).join(';')
                : '';
            filas.push([
                z.estado || '', z.municipio || '',
                Number(z.score) || 0, Number(z.radio_m) || 0,
                z.lat != null ? z.lat : (z.centro && z.centro[0] != null ? z.centro[0] : ''),
                z.lon != null ? z.lon : (z.centro && z.centro[1] != null ? z.centro[1] : ''),
                z.fuente || '', z.id || '', d,
            ]);
        }
        return filas;
    }
    // Construye un objeto GeoJSON FeatureCollection para exportacion.
    function riesgoParaGeoJSON(items) {
        const features = [];
        if (!items || !items.length) {
            return { type: 'FeatureCollection', features: [] };
        }
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            const lat = z.lat != null ? z.lat : (z.centro && z.centro[0] != null ? z.centro[0] : null);
            const lon = z.lon != null ? z.lon : (z.centro && z.centro[1] != null ? z.centro[1] : null);
            if (lat == null || lon == null) continue;
            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [lon, lat] },
                properties: {
                    id: z.id || null,
                    estado: z.estado || null,
                    municipio: z.municipio || null,
                    score: Number(z.score) || 0,
                    radio_m: Number(z.radio_m) || 0,
                    fuente: z.fuente || null,
                    delitos: (z.delitos && typeof z.delitos === 'object') ? z.delitos : null,
                },
            });
        }
        return { type: 'FeatureCollection', features: features };
    }
    // Construye texto para copiar al portapapeles.
    function riesgoParaClipboard(items) {
        if (!items || !items.length) return '';
        const lineas = [];
        lineas.push('ZONAS DE RIESGO (' + items.length + ')');
        lineas.push('=====================');
        items.forEach((z) => {
            const score = Number(z.score) || 0;
            const radio = z.radio_m || 0;
            const lat = z.lat != null ? z.lat : (z.centro && z.centro[0] != null ? z.centro[0] : null);
            const lon = z.lon != null ? z.lon : (z.centro && z.centro[1] != null ? z.centro[1] : null);
            const coord = (lat != null && lon != null)
                ? ('  ' + lat.toFixed(4) + ', ' + lon.toFixed(4)) : '';
            lineas.push((z.estado || '?') + ' \u00b7 ' + (z.municipio || '?') + ' \u00b7 score ' + score + '/100 \u00b7 buffer ' + radio + ' m' + coord);
        });
        return lineas.join('\n');
    }
    // Devuelve los parametros necesarios para dibujar una sola card de zona
    // como texto enriquecido (usado por el detalle expandible).
    function riesgoDetalleHTML(z) {
        if (!z) return '';
        const partes = [];
        partes.push('<b>' + esc(z.estado || '?') + '</b>');
        if (z.municipio) partes.push(esc(z.municipio));
        if (z.id) partes.push('id: ' + esc(z.id));
        const score = Number(z.score) || 0;
        partes.push('score <b>' + score + '/100</b>');
        if (z.radio_m) partes.push('buffer <b>' + z.radio_m + ' m</b>');
        const lat = z.lat != null ? z.lat : (z.centro && z.centro[0] != null ? z.centro[0] : null);
        const lon = z.lon != null ? z.lon : (z.centro && z.centro[1] != null ? z.centro[1] : null);
        if (lat != null && lon != null) {
            partes.push('coordenadas <span class="coord">' + lat.toFixed(4) + ', ' + lon.toFixed(4) + '</span>');
        }
        if (z.fuente) partes.push('fuente <i>' + esc(z.fuente) + '</i>');
        if (z.delitos && typeof z.delitos === 'object') {
            const det = delitosTop(z, 5);
            if (det) partes.push('delitos: ' + esc(det));
        }
        return partes.join(' \u00b7 ');
    }
    // ── Export y copia (operan sobre el subset visible) ──────────────
    // Devuelve el subset de zonas actualmente filtrado y ordenado.
    function riesgoSubsetVisible() {
        const items = APP.riesgo || [];
        const filtradas = filtrarZonas(items, APP.riesgoFiltro, APP.riesgoNivel);
        return ordenarZonas(filtradas, APP.riesgoOrden || 'score');
    }
    // Dispara descarga de un CSV con el subset visible.
    function exportarRiesgoCSV() {
        const items = riesgoSubsetVisible();
        if (!items.length) { adviceWarn('Nada que exportar', 'No hay zonas visibles con los filtros actuales.'); return; }
        const filas = riesgoParaCSV(items);
        const escCsv = (c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"';
        const csv = filas.map((f) => f.map(escCsv).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = 'rondo_riesgo_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        adviceOk('CSV exportado', items.length + ' zonas');
    }
    // Dispara descarga de un GeoJSON con el subset visible.
    function exportarRiesgoGeoJSON() {
        const items = riesgoSubsetVisible();
        if (!items.length) { adviceWarn('Nada que exportar', 'No hay zonas visibles con los filtros actuales.'); return; }
        const geo = riesgoParaGeoJSON(items);
        const text = JSON.stringify(geo, null, 2);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'application/geo+json;charset=utf-8;' }));
        a.download = 'rondo_riesgo_' + new Date().toISOString().slice(0, 10) + '.geojson';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        adviceOk('GeoJSON exportado', items.length + ' zonas');
    }
    // Copia el subset visible al portapapeles.
    function copiarRiesgoFiltrado() {
        const items = riesgoSubsetVisible();
        if (!items.length) { adviceWarn('Nada que copiar', 'No hay zonas visibles con los filtros actuales.'); return; }
        const text = riesgoParaClipboard(items);
        copiarAlPortapapeles(text, 'Copiado al portapapeles', items.length + ' zonas (' + items.length + ' lineas)');
    }
    // Copia una sola zona al portapapeles.
    function copiarZonaRiesgo(z) {
        const text = riesgoParaClipboard([z]);
        copiarAlPortapapeles(text, 'Zona copiada', esc(z.estado || '?') + ' \u00b7 ' + esc(z.municipio || '?'));
    }
    // Helper: usa copyToClipboard (definida mas abajo) y avisa con toast.
    function copiarAlPortapapeles(text, titulo, resumen) {
        const cb = (typeof copyToClipboard === 'function') ? copyToClipboard : null;
        const p = cb ? cb(text) : Promise.resolve(false);
        Promise.resolve(p).then((ok) => {
            if (ok) adviceOk(titulo, resumen);
            else adviceErr(titulo, 'No se pudo copiar');
        }).catch(() => adviceErr(titulo, 'No se pudo copiar'));
    }
    // Menu contextual del boton "Exportar" grande. Usa showMenu() que ya existe.
    function mostrarMenuExportarRiesgo() {
        const btn = byId('rondo-riesgo-exportar');
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const items = riesgoSubsetVisible();
        const n = items.length;
        showMenu(rect.left, rect.bottom + 4, [
            { id: 'riesgo-export-csv', icon: UIS.csv, label: 'CSV (' + n + ' zonas)' },
            { id: 'riesgo-export-geo', icon: UIS.export, label: 'GeoJSON (' + n + ' zonas)' },
            { id: 'riesgo-export-copiar', icon: UIS.copy, label: 'Copiar al portapapeles' },
        ]);
        // Delegamos click sobre el ctxEl.
        const handler = (e) => {
            const op = e.target.closest && e.target.closest('.op');
            if (!op) return;
            const acc = op.dataset.acc;
            if (acc === 'riesgo-export-csv') exportarRiesgoCSV();
            else if (acc === 'riesgo-export-geo') exportarRiesgoGeoJSON();
            else if (acc === 'riesgo-export-copiar') copiarRiesgoFiltrado();
            if (typeof hideMenu === 'function') hideMenu();
        };
        if (ctxEl) {
            ctxEl.removeEventListener('click', ctxEl._riesgoHandler);
            ctxEl._riesgoHandler = handler;
            ctxEl.addEventListener('click', handler);
        }
    }
    // Abre la ventana de Ajustes (helper para el empty state).
    function abrirAjustes() {
        const b = byId('rondo-cfg-btn');
        if (b) b.click();
    }
    async function reglaRiesgoSinSenal(st, prev, R, info, etq) {
        if (!APP.config.reglas.riesgoSinSenal) return;
        if (!APP.riesgo || !APP.riesgo.length) return;
        if (!prev) return;
        if (prev.estado === 'offline' || st.estado !== 'offline') return;
        if (st.edadMin < APP.config.offlineMin) return;
        const lat = (st.lat != null) ? st.lat : prev.lat;
        const lon = (st.lon != null) ? st.lon : prev.lon;
        if (lat == null || lon == null) return;
        // Reutiliza la zona ya buscada en evaluateUnit para esta transicion
        // (undefined = no se calculo antes; null = no habia zona).
        const z = (R._zRiesgoOffline !== undefined) ? R._zRiesgoOffline : puntoEnZonaDeRiesgo(lat, lon);
        if (!z) return;
        if (R.riesgoSinSenalAlerta) return;
        R.riesgoSinSenalAlerta = true;
        const etqTxt = z.municipio ? (z.municipio + ', ' + (z.estado || '')) : (z.estado || 'zona desconocida');
        pushAlert({
            regla: 'riesgoSinSenal', sev: 'critico', clave: info.clave, eco: info.eco, icono: 'riesgo',
            titulo: 'PERDIO SENAL EN ZONA DE RIESGO \u00b7 ' + etq,
            detalle: 'Ultima posicion en ' + etqTxt + ' (score ' + z.score + '/100). Sin reporte hace ' + ageText(st.edadMin) + '.',
            hablar: 'Atencion critica. La unidad ' + etq + ' perdio senal en zona de riesgo'
        });
    }

    // v5.14: regla predictiva. Dispara cuando una unidad EN MOVIMIENTO se
    // esta ACERCANDO a una zona de riesgo de alto score, ANTES de que
    // entre o pierda senal. Pensado para horarios nocturnos donde el
    // riesgo de detenerse en un deshuesadero/lote aislado es alto.
    //
    // Condiciones:
    //  - regla activa en config.reglas.riesgoPredict
    //  - APP.riesgo cargado y con score >= riesgoPredictMinScore
    //  - unidad no offline, velocidad >= riesgoPredictVelMin km/h
    //  - (opcional) hora actual dentro de la ventana nocturna
    //  - distancia ACTUAL a la zona <= (radio*mul + buffer)
    //  - distancia PREVIA estrictamente MAYOR que la actual (se acerca)
    //  - sin alerta reciente para esta misma unidad+zona (cooldown)
    async function reglaRiesgoPredict(st, prev, R, info, etq) {
        if (!APP.config.reglas.riesgoPredict) return;
        if (!APP.riesgo || !APP.riesgo.length) return;
        if (!prev) return;
        if (st.estado === 'offline') return;
        if (st.lat == null || st.lon == null) return;
        if (prev.lat == null || prev.lon == null) return;
        const velMin = +APP.config.riesgoPredictVelMin || 5;
        if (!isFinite(st.vel) || st.vel < velMin) return;
        // v5.14: ventana nocturna opcional.
        if (APP.config.riesgoPredictNocturno) {
            const d = parseHora('c-riesgo-pre-desde', APP.config.riesgoPredictNocturnoDesde || '22:00');
            const h = parseHora('c-riesgo-pre-hasta', APP.config.riesgoPredictNocturnoHasta || '05:00');
            const ahora = ahoraMinutos();
            if (!d || !h || !enVentanaHoraria(ahora, d, h)) return;
        }
        const minScore = Math.max(0, +APP.config.riesgoPredictMinScore || 4);
        const mul = +APP.config.riesgoRadioMul || 1;
        const bufferM = Math.max(0, +APP.config.riesgoPredictBufferM || 500);
        // Busca la zona mas cercana que cumpla el umbral.
        let candidata = null;
        for (let i = 0; i < APP.riesgo.length; i++) {
            const z = APP.riesgo[i];
            if (!z || !z.centro || !Array.isArray(z.centro)) continue;
            if (!(z.radio_m > 0)) continue;
            if (typeof z.score !== 'number' || z.score < minScore) continue;
            const dKm = haversine(st.lat, st.lon, z.centro[0], z.centro[1]);
            const dM = dKm * 1000;
            const radioM = z.radio_m * mul;
            // La zona "cuenta" para esta regla si estamos a menos de radio+buffer.
            if (dM > radioM + bufferM) continue;
            if (!candidata || dM < candidata.dist) {
                candidata = { id: z.id, estado: z.estado, municipio: z.municipio,
                    score: z.score, fuente: z.fuente, dist: dM, radio: radioM };
            }
        }
        if (!candidata) return;
        // Distancia previa: se recalcula con la zona completa (no con el
        // resumen `candidata`, que no lleva centro) para no perder precision.
        const zObj = APP.riesgo.find((z) => z && z.id === candidata.id);
        let distPrev = Infinity;
        if (zObj && zObj.centro) {
            const prevKm = haversine(prev.lat, prev.lon, zObj.centro[0], zObj.centro[1]);
            distPrev = prevKm * 1000;
        }
        // Si no se acerca (distPrev no es estrictamente mayor), descartar.
        // Caso limite: misma posicion -> no alertar.
        if (!(distPrev > candidata.dist + 5)) return;
        // Cooldown por unidad+zona (mas corto que el global).
        const ck = info.clave + '::riesgoPredict::' + candidata.id;
        const cd = Math.max(60, (+APP.config.riesgoPredictCooldownS || 300)) * 1000;
        if (APP.cooldowns[ck] && Date.now() - APP.cooldowns[ck] < cd) return;
        APP.cooldowns[ck] = Date.now();
        const etqTxt = candidata.municipio ? (candidata.municipio + ', ' + (candidata.estado || '')) : (candidata.estado || 'zona desconocida');
        const acercarse = Math.max(0, Math.round(distPrev - candidata.dist));
        pushAlert({
            regla: 'riesgoPredict', sev: 'medio', clave: info.clave, eco: info.eco, icono: 'riesgo',
            titulo: 'ACERCANDOSE A ZONA DE RIESGO \u00b7 ' + etq,
            detalle: 'A ' + Math.round(candidata.dist) + ' m de zona en ' + etqTxt +
                ' (score ' + candidata.score + '/100, radio ' + Math.round(candidata.radio) + ' m). ' +
                'Se acerco ' + acercarse + ' m desde la ultima posicion. Velocidad: ' + Math.round(st.vel) + ' km/h.',
            hablar: 'Atencion. La unidad ' + etq + ' se aproxima a una zona de riesgo'
        });
    }
    // Helpers para la ventana nocturna de la regla predictiva.
    function parseHora(id, fallback) {
        const m = String(fallback || '').match(/^(\d{1,2}):(\d{2})$/);
        if (m) return (+m[1]) * 60 + (+m[2]);
        return null;
    }
    function ahoraMinutos() {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
    }
    function enVentanaHoraria(ahora, desdeMin, hastaMin) {
        if (desdeMin == null || hastaMin == null) return false;
        if (desdeMin === hastaMin) return true;
        // Ventana que cruza medianoche (ej 22:00 -> 05:00).
        if (desdeMin < hastaMin) return ahora >= desdeMin && ahora < hastaMin;
        return ahora >= desdeMin || ahora < hastaMin;
    }

    async function reglaOffline(st, prev, R, info, etq) {
        if (!APP.config.reglas.offline) return;
        if (prev && prev.estado !== 'offline' && st.estado === 'offline') {
            // Si la transicion cae en zona de riesgo, el aviso critico de
            // reglaRiesgoSinSenal ya da el contexto; no se duplica con el
            // generico "SIN SENAL" en el mismo tick.
            if (R._zRiesgoOffline) return;
            pushAlert({
                regla: 'offline', sev: 'alto', clave: info.clave, eco: info.eco,
                titulo: 'SIN SENAL · ' + etq,
                detalle: 'sin reportar hace ' + ageText(st.edadMin) + (R.zona ? ' · ' + R.zona : ''),
                hablar: 'Atención, la unidad ' + etq + ' se ha desconectado'
            });
        } else if (prev && prev.estado === 'offline' && st.estado !== 'offline') {
            pushAlert({
                regla: 'offline', sev: 'ok', clave: info.clave, eco: info.eco,
                titulo: 'RECONECTO · ' + etq,
                detalle: 'volvió a reportar · ' + Math.round(st.vel) + ' km/h',
                hablar: 'La unidad ' + etq + ' volvió a estar en línea'
            });
            R.descoAlerta = false;
        }
    }
    async function reglaGpsPerdido(st, prev, R, info, etq) {
        if (!APP.config.reglas.gpsPerdido || !prev || prev.estado === 'offline') return;
        if (prev.vel > 5 && st.estado === 'offline' && st.edadMin >= APP.config.gpsMin) {
            pushAlert({
                regla: 'gpsPerdido', sev: 'critico', clave: info.clave, eco: info.eco,
                titulo: 'SENAL PERDIDA EN MARCHA · ' + etq,
                detalle: 'ultima velocidad ' + Math.round(prev.vel) + ' km/h · sin datos ' + ageText(st.edadMin) + (prev.zona ? ' · ' + prev.zona : ''),
                hablar: 'Atención, se perdio la señal de la unidad ' + etq + ' en marcha'
            });
        }
    }
    async function reglaDetenido(u, st, R, info, etq, ctx) {
        if (!APP.config.reglas.detenido) return;
        // v5.15.2: umbral sobre la velocidad suavizada para que los picos de
        // ruido del GPS no reinicien el temporizador de detencion.
        if (st.online && velSuavizada(info, st) <= 1.5) {
            if (!R.detenidoDesde) {
                R.detenidoDesde = Date.now() / 1000;
                if (APP.config.historico && APP.consultaRestante > 0 && ctx.quotaOk) {
                    APP.consultaRestante--;
                    try {
                        const um = await fetchLastMotion(u.id);
                        if (um) R.detenidoDesde = um;
                    } catch (_) { /* noop */ }
                }
            }
            const m = (Date.now() / 1000 - R.detenidoDesde) / 60;
            if (m >= APP.config.stopMin && !isBase(R.zona)) {
                let ctxTxt = ctx.ubicaciones[info.clave];
                // Presupuesto de geocodificacion por refresco (ver refresh):
                // evita que muchas detenciones simultaneas encadenen llamadas
                // a Nominatim y alarguen el refresco por encima del poll.
                const geoOk = (APP.geoRestante == null) || (APP.geoRestante > 0);
                if (ctxTxt == null && ctx.quotaGeo && geoOk) {
                    if (APP.geoRestante != null) APP.geoRestante--;
                    const g = await reverseGeocode(st.lat, st.lon);
                    ctx.ubicaciones[info.clave] = ctxTxt = g ? (g.texto || g.ciudad || '') : '';
                }
                pushAlert({
                    regla: 'detenido', sev: 'medio', clave: info.clave, eco: info.eco, soloHorario: true,
                    titulo: 'DETENIDO ' + Math.round(m) + ' min · ' + etq,
                    detalle: (R.zona ? 'zona: ' + R.zona : 'fuera de geocercas') + (ctxTxt ? ' · ' + ctxTxt : ''),
                    hablar: 'La unidad ' + etq + ' lleva ' + Math.round(m) + ' minutos detenida'
                });
            }
        } else {
            R.detenidoDesde = null;
        }
    }
    function reglaZona(st, R, info, etq) {
        if (!APP.config.reglas.zona) return;
        const z = R.zona;
        if (z && !isBase(z)) {
            // v5.15: una zona es "esperada" si coincide con cualquiera de las
            // paradas del plan multipunto (geocercas incluidas).
            const plan = planDe(info);
            let esperada = false;
            if (plan && plan.paradas) {
                for (let i = 0; i < plan.paradas.length; i++) {
                    const t = norm(plan.paradas[i].texto || '');
                    if (!t) continue;
                    if (norm(z).indexOf(t) >= 0 || t.indexOf(norm(z)) >= 0) { esperada = true; break; }
                }
            }
            if (!esperada) {
                if (!R.zonaExt || R.zonaExt.n !== z) R.zonaExt = { n: z, desde: Date.now() / 1000 };
                const m = (Date.now() / 1000 - R.zonaExt.desde) / 60;
                if (m >= APP.config.zonaMin) {
                    pushAlert({
                        regla: 'zona', sev: 'medio', clave: info.clave, eco: info.eco, soloHorario: true,
                        titulo: 'ZONA NO PREVISTA ' + Math.round(m) + ' min · ' + etq,
                        detalle: 'permanece en ' + z,
                        hablar: 'La unidad ' + etq + ' lleva ' + Math.round(m) + ' minutos en zona no prevista'
                    });
                }
            } else {
                R.zonaExt = null;
            }
        } else {
            R.zonaExt = null;
        }
    }
    function reglaGeocerca(st, prev, R, info, etq) {
        if (!APP.config.reglas.geocerca || !prev || prev.zona === R.zona) return;
        if (R.zona) {
            pushAlert({
                regla: 'geocerca', sev: 'bajo', clave: info.clave, eco: info.eco,
                titulo: 'ENTRO · ' + etq,
                detalle: 'entro a ' + R.zona + ' · ' + Math.round(st.vel) + ' km/h'
            });
        } else if (prev.zona) {
            pushAlert({
                regla: 'geocerca', sev: 'bajo', clave: info.clave, eco: info.eco,
                titulo: 'SALIO · ' + etq,
                detalle: 'salio de ' + prev.zona + ' · ' + Math.round(st.vel) + ' km/h'
            });
        }
    }
    // v5.14.4: regla "detenida en geocerca". Complementa reglaGeocerca
    // (que avisa al ENTRAR/SALIR) y reglaDetenido (que avisa al llevar
    // parado N min en general). Esta es mas especifica: detecta el caso
    // "unidad parada DENTRO de una geocerca" y lo comunica con el
    // texto literal pedido: "La unidad X se encuentra detenida en la
    // geocerca Y".
    //
    // Dispara una sola vez por episodio (cuando la unidad lleva
    // geocercaDetenidoMin minutos parada dentro de una geocerca). Si la
    // unidad se mueve o sale de la geocerca, rearma para volver a
    // avisar en el siguiente episodio.
    function reglaGeocercaDetenido(st, R, info, etq) {
        if (!APP.config.reglas.geocercaDetenido) return;
        if (!st.online) { R.geoDetenidoDesde = null; return; }
        // Reset: si se mueve o sale de la geocerca, vuelve a contar.
        if (velSuavizada(info, st) > 1.5 || !R.zona) { R.geoDetenidoDesde = null; return; }
        if (!R.geoDetenidoDesde) R.geoDetenidoDesde = Date.now() / 1000;
        const minDet = Math.max(1, +APP.config.geocercaDetenidoMin || 5);
        const m = (Date.now() / 1000 - R.geoDetenidoDesde) / 60;
        if (m < minDet) return;
        if (R.geoDetenidoAlerta) return;
        R.geoDetenidoAlerta = true;
        pushAlert({
            regla: 'geocercaDetenido', sev: 'bajo', clave: info.clave, eco: info.eco,
            titulo: 'DETENIDA EN GEOCERCA \u00b7 ' + etq,
            detalle: 'La unidad ' + etq + ' se encuentra detenida en la geocerca ' + R.zona +
                ' \u00b7 hace ' + Math.round(m) + ' min',
            hablar: 'La unidad ' + etq + ' se encuentra detenida en la geocerca ' + R.zona
        });
    }
    async function reglaDestino(st, R, info, etq) {
        if (!APP.config.reglas.destino) return;
        const plan = planDe(info);
        if (!plan || !plan.paradas || !plan.paradas.length || !st.online) return;
        const ruta = rutaDe(info);
        const paradas = (ruta && ruta.paradas && ruta.paradas.length) ? ruta.paradas : null;
        const llegadaM = Math.max(80, +APP.config.paradaLlegadaM || 150);
        if (paradas && st.lat != null && st.lon != null) {
            const memo = APP.snapMemo[info.clave] || (APP.snapMemo[info.clave] = { idx: 0 });
            const s = snapRuta(st.lat, st.lon, ruta, memo);
            if (s) {
                if (!Array.isArray(R.llegadas) || R.llegadas.length !== paradas.length) {
                    R.llegadas = new Array(paradas.length);
                    for (let i = 0; i < paradas.length; i++) R.llegadas[i] = false;
                }
                for (let i = 0; i < paradas.length; i++) {
                    if (R.llegadas[i]) continue;
                    const p = paradas[i];
                    if (p.acum == null) continue;
                    const esUlt = (i === paradas.length - 1);
                    const alcanzada = (s.recorrido >= p.acum - llegadaM) ||
                        (esUlt && s.dist <= llegadaM);
                    if (!alcanzada) continue;
                    R.llegadas[i] = true;
                    R.paradaActual = i + 1;
                    R.enDestino = true;
                    const restantes = paradas.length - i - 1;
                    pushAlert({
                        regla: 'destino', sev: esUlt ? 'ok' : 'bajo', clave: info.clave, eco: info.eco,
                        titulo: (esUlt ? 'LLEGO A DESTINO' : 'LLEGO A PARADA ' + (i + 1)) + ' \u00b7 ' + etq,
                        detalle: (p.texto || ('parada ' + (i + 1))) +
                            (esUlt ? '' : ' \u00b7 faltan ' + restantes + ' parada(s)'),
                        hablar: esUlt
                            ? ('La unidad ' + etq + ' llego a su destino')
                            : ('La unidad ' + etq + ' llego a la parada ' + (i + 1))
                    });
                }
                // Circuito completado: todas las paradas visitadas y de
                // regreso en el origen. No es un viaje cancelado.
                if (ruta.circuito && R.llegadas.length === paradas.length && R.llegadas.every(Boolean)) {
                    const dOrigen = haversine(st.lat, st.lon, ruta.origen.lat, ruta.origen.lon);
                    if (dOrigen <= Math.max(APP.config.retornoM, llegadaM) && !R.circuitoAlerta) {
                        R.circuitoAlerta = true;
                        pushAlert({
                            regla: 'retorno', sev: 'ok', clave: info.clave, eco: info.eco,
                            titulo: 'REGRESO A BASE \u00b7 ' + etq,
                            detalle: 'circuito completado \u00b7 ' + paradas.length + ' parada(s) visitada(s)',
                            hablar: 'La unidad ' + etq + ' completo su circuito y regreso a la base'
                        });
                    }
                }
                return;
            }
        }
        // Fallback legacy: sin ruta trazada, geocoding inverso contra la
        // primera parada del plan.
        const primera = plan.paradas[0].texto || '';
        if (!primera) return;
        // Sin presupuesto de geocodificacion en este refresco: se reintenta en
        // el siguiente tick en vez de bloquear la cola de unidades.
        if (APP.geoRestante != null && APP.geoRestante <= 0) return;
        if (APP.geoRestante != null) APP.geoRestante--;
        const geo = await reverseGeocode(st.lat, st.lon);
        const ciudad = geo ? geo.ciudad : '';
        const enDestino = !!(ciudad && (norm(ciudad).indexOf(norm(primera)) >= 0 || norm(primera).indexOf(norm(ciudad)) >= 0));
        if (enDestino && !R.enDestino) {
            R.enDestino = true;
            pushAlert({
                regla: 'destino', sev: 'ok', clave: info.clave, eco: info.eco,
                titulo: 'LLEGO A DESTINO \u00b7 ' + etq,
                detalle: 'en ' + ciudad,
                hablar: 'La unidad ' + etq + ' llego a su destino'
            });
        } else if (!enDestino && R.enDestino && st.vel > 10) {
            R.enDestino = false;
            pushAlert({
                regla: 'destino', sev: 'bajo', clave: info.clave, eco: info.eco,
                titulo: 'EN REGRESO \u00b7 ' + etq,
                detalle: 'salio de ' + primera + ' \u00b7 ' + Math.round(st.vel) + ' km/h',
                hablar: 'La unidad ' + etq + ' va en regreso'
            });
        }
    }
    async function reglaDesconexion(st, R, info, etq) {
        if (!APP.config.reglas.desconexion || st.estado !== 'offline' || st.edadMin < APP.config.descoMin) return;
        if (!R.descoAlerta) {
            R.descoAlerta = true;
            pushAlert({
                regla: 'desconexion', sev: 'critico', clave: info.clave, eco: info.eco,
                titulo: 'DESCONEXION PROLONGADA · ' + etq,
                detalle: 'lleva ' + ageText(st.edadMin) + ' sin señal',
                hablar: 'Atención, la unidad ' + etq + ' sigue desconectada'
            });
        }
    }
    function reglaVelocidad(st, R, info, etq) {
        if (!APP.config.reglas.velocidad || !st.online) return;
        const lim = limiteDe(info);
        if (st.vel > lim) {
            pushAlert({
                regla: 'velocidad', sev: 'medio', clave: info.clave, eco: info.eco, soloHorario: true,
                titulo: 'EXCESO DE VELOCIDAD · ' + etq,
                detalle: Math.round(st.vel) + ' km/h (límite ' + lim + ')',
                hablar: 'La unidad ' + etq + ' excede la velocidad'
            });
        }
    }
    function reglaDemoraBase(st, R, info, etq) {
        if (!APP.config.reglas.demoraBase) return;
        if (!st.online || velSuavizada(info, st) > 1.5) { R.demoraBaseAlerta = 0; return; }
        if (!isBase(R.zona)) { R.demoraBaseAlerta = 0; return; }
        if (R.enDestino || R.llego) return;
        if (!R.demoraBaseAlerta) R.demoraBaseAlerta = Date.now() / 1000;
        const min = (Date.now() / 1000 - R.demoraBaseAlerta) / 60;
        if (min >= APP.config.demoraBaseMin) {
            pushAlert({
                regla: 'demoraBase', sev: 'bajo', clave: info.clave, eco: info.eco, soloHorario: true,
                titulo: 'DEMORA EN BASE · ' + etq,
                detalle: Math.round(min) + ' min parado en ' + R.zona,
                hablar: 'La unidad ' + etq + ' lleva ' + Math.round(min) + ' minutos en base sin salir'
            });
            // Re-armar: la proxima alerta se disparara tras demoraBaseMin
            // desde este momento (el cooldown de pushAlert evita duplicados).
            R.demoraBaseAlerta = Date.now() / 1000;
        }
    }
    function reglaRuta(st, R, info, etq) {
        const ruta = rutaDe(info);
        const sigueRuta = APP.config.reglas.desvio || APP.config.reglas.retorno || APP.config.reglas.giroU;
        if (!ruta || !sigueRuta || !st.online || st.lat == null) return;
        if (!APP.snapMemo[info.clave]) APP.snapMemo[info.clave] = { idx: 0 };
        const s = snapRuta(st.lat, st.lon, ruta, APP.snapMemo[info.clave]);
        if (!s) return;
        R.rutaDist = Math.round(s.dist);
        R.rutaProg = s.progreso;

        if (APP.config.reglas.desvio) {
            let umbral = +APP.config.desvioM || 250;
            let tolerado = false;
            // v5.15: tolerancia de municipio. Si la unidad sigue dentro de un
            // municipio por el que pasa su ruta, el alejamiento no se marca
            // como desvio mientras no supere desvioMunicipioM.
            if (s.dist > umbral && APP.config.desvioMunicipio) {
                const mun = municipioEn(st.lat, st.lon);
                if (mun && municipioDeRuta(ruta, mun)) {
                    const cap = Math.max(umbral, +APP.config.desvioMunicipioM || 3000);
                    if (s.dist <= cap) tolerado = true;
                    else umbral = cap;
                }
            }
            R.desvioTolerado = tolerado;
            if (!tolerado && s.dist > umbral) {
                if (!R.desviadoDesde) R.desviadoDesde = Date.now() / 1000;
                const m = (Date.now() / 1000 - R.desviadoDesde) / 60;
                if (m >= APP.config.desvioMin) {
                    pushAlert({
                        regla: 'desvio', sev: 'alto', clave: info.clave, eco: info.eco,
                        titulo: 'DESVIO DE RUTA · ' + etq,
                        detalle: Math.round(s.dist) + ' m de la ruta · ' + Math.round(m) + ' min',
                        hablar: 'Atencion, la unidad ' + etq + ' se ha desviado de la ruta'
                    });
                }
            } else if (s.dist <= umbral * 0.8) {
                // Histeresis: para limpiar el desvio hay que volver bien al eje.
                R.desviadoDesde = null;
            }
        }

        if (APP.config.reglas.retorno) {
            if (s.progreso > (R.progMax || 0)) R.progMax = s.progreso;
            const dOrigen = haversine(st.lat, st.lon, ruta.origen.lat, ruta.origen.lon);
            const dDestino = haversine(st.lat, st.lon, ruta.destino.lat, ruta.destino.lon);
            const retrocedio = (R.progMax - s.progreso) >= (APP.config.retornoPct / 100);
            const enOrigen = dOrigen <= APP.config.retornoM && R.progMax >= 0.2;
            // Marca "llego" (lo usa la regla de demora en base) sin duplicar
            // la alerta: la llegada a cada parada la emite reglaDestino.
            const paradas = ruta.paradas || [];
            if (paradas.length) {
                const lm = Math.max(80, +APP.config.paradaLlegadaM || 150);
                let lleg = 0;
                for (let i = 0; i < paradas.length; i++) {
                    if (paradas[i].acum != null && s.recorrido >= paradas[i].acum - lm) lleg++;
                }
                if (lleg >= paradas.length) R.llego = true;
            } else if (dDestino <= APP.config.retornoM && s.progreso >= 0.85) {
                R.llego = true;
            }
            // En un plan de circuito volver al origen es lo esperado: no se
            // reporta como "viaje cancelado" (de eso se encarga reglaDestino).
            if (!ruta.circuito && !R.retornoAlerta && !R.llego && R.progMax >= 0.15 && (enOrigen || retrocedio)) {
                R.retornoAlerta = true;
                pushAlert({
                    regla: 'retorno', sev: 'critico', clave: info.clave, eco: info.eco,
                    titulo: 'POSIBLE VIAJE CANCELADO · ' + etq,
                    detalle: (enOrigen ? 'volvio al origen' : 'retrocedio ' + Math.round((R.progMax - s.progreso) * 100) + '%') +
                        ' · avance max ' + Math.round(R.progMax * 100) + '%',
                    hablar: 'Atencion, la unidad ' + etq + ' regreso. El viaje puede estar cancelado'
                });
            }
        }

        if (APP.config.reglas.giroU && st.vel > 10) {
            const dif = difAngulo(st.curso || 0, s.rumbo);
            if (dif > APP.config.giroGrados) {
                if (!R.rumboOpDesde) R.rumboOpDesde = Date.now() / 1000;
                const m = (Date.now() / 1000 - R.rumboOpDesde) / 60;
                if (m >= APP.config.giroMin) {
                    pushAlert({
                        regla: 'giroU', sev: 'medio', clave: info.clave, eco: info.eco, soloHorario: true,
                        titulo: 'GIRO EN U · ' + etq,
                        detalle: 'rumbo opuesto a la ruta (' + Math.round(dif) + ' grados)',
                        hablar: 'La unidad ' + etq + ' hizo un giro en U'
                    });
                }
            } else {
                R.rumboOpDesde = null;
            }
        }
    }

    async function evaluateUnit(u, info, st, prev, ctx) {
        const clave = info.clave;
        const etq = (info.eco || info.placa || info.nombre || info.id || '');
        // v5.15.2: media exponencial de velocidad (suaviza GPS y ETA).
        if (clave && Number.isFinite(st.vel)) {
            const pv = APP.velSuave[clave];
            APP.velSuave[clave] = (pv == null) ? st.vel : (pv * 0.65 + st.vel * 0.35);
        }
        const R = {
            estado: st.estado, t: st.t, vel: st.vel, lat: st.lat, lon: st.lon,
            zona: zoneAt(st.lat, st.lon),
            detenidoDesde: prev ? prev.detenidoDesde : null,
            zonaExt: prev ? prev.zonaExt : null,
            enDestino: prev ? prev.enDestino : false,
            descoAlerta: prev ? prev.descoAlerta : false,
            desviadoDesde: prev ? prev.desviadoDesde : null,
            progMax: prev ? prev.progMax : 0,
            retornoAlerta: prev ? prev.retornoAlerta : false,
            rumboOpDesde: prev ? prev.rumboOpDesde : null,
            demoraBaseAlerta: prev ? (prev.demoraBaseAlerta || 0) : 0,
            llego: prev ? prev.llego : false,
            riesgoSinSenalAlerta: prev ? prev.riesgoSinSenalAlerta : false,
            // v5.14.4: estado para la regla "detenida en geocerca".
            // geoDetenidoDesde: timestamp del inicio del episodio de
            //   detencion dentro de geocerca (null si no esta).
            // geoDetenidoAlerta: true si ya se emitio la alerta para
            //   este episodio; rearma cuando sale o se mueve.
            geoDetenidoDesde: prev ? prev.geoDetenidoDesde : null,
            geoDetenidoAlerta: prev ? !!prev.geoDetenidoAlerta : false,
            // v5.15: seguimiento de paradas del plan multipunto.
            llegadas: (prev && Array.isArray(prev.llegadas)) ? prev.llegadas : null,
            paradaActual: prev ? (prev.paradaActual || 0) : 0,
            circuitoAlerta: prev ? !!prev.circuitoAlerta : false,
            desvioTolerado: false
        };
        try {
            // Transicion a offline: se busca una sola vez si la ultima
            // posicion cae en zona de riesgo. reglaOffline usa el resultado
            // para no duplicar el aviso y reglaRiesgoSinSenal lo reutiliza.
            if (prev && prev.estado !== 'offline' && st.estado === 'offline' &&
                st.edadMin >= APP.config.offlineMin) {
                const latT = (st.lat != null) ? st.lat : prev.lat;
                const lonT = (st.lon != null) ? st.lon : prev.lon;
                R._zRiesgoOffline = (APP.config.reglas.riesgoSinSenal &&
                    APP.riesgo && APP.riesgo.length && latT != null && lonT != null)
                    ? puntoEnZonaDeRiesgo(latT, lonT)
                    : null;
            }
            await reglaOffline(st, prev, R, info, etq);
            // Si la unidad vuelve a reportar, rearma la alerta de desconexion
            // aunque la regla general este desactivada.
            if (st.estado !== 'offline') R.descoAlerta = false;
            if (st.estado !== 'offline') R.riesgoSinSenalAlerta = false;
            await reglaGpsPerdido(st, prev, R, info, etq);
            await reglaDetenido(u, st, R, info, etq, ctx);
            reglaZona(st, R, info, etq);
            reglaGeocerca(st, prev, R, info, etq);
            // v5.14.4: regla "detenida en geocerca" (mensaje literal
            // "La unidad X se encuentra detenida en la geocerca Y").
            // Una sola vez por episodio.
            reglaGeocercaDetenido(st, R, info, etq);
            await reglaDestino(st, R, info, etq);
            await reglaDesconexion(st, R, info, etq);
            await reglaRiesgoSinSenal(st, prev, R, info, etq);
            await reglaRiesgoPredict(st, prev, R, info, etq);
            reglaVelocidad(st, R, info, etq);
            reglaDemoraBase(st, R, info, etq);
            reglaRuta(st, R, info, etq);
        } catch (e) {
            APP.stats.erroresReglas = (APP.stats.erroresReglas || 0) + 1;
            if (APP.unlocked) console.warn('[Rondo] regla', clave, e && e.message);
        }
        // Campo interno de un solo tick: no debe persistirse en el memo.
        delete R._zRiesgoOffline;
        return R;
    }

