/* ====================== GEOCERCAS DE LA APP: NUCLEO ======================
 * Geocercas que viven SOLO en Rondo: no estan en la plataforma (ni en Wialon
 * ni en AE-Track), se dibujan a mano sobre un mapa de OpenStreetMap y se
 * guardan en la sesion del navegador. Se pueden exportar e importar para
 * moverlas entre equipos o para no dibujarlas otra vez.
 *
 * Viven en APP.zonasLocales y se anaden a APP.zonas junto a las nativas, de
 * forma que funcionan igual que las demas: cuentan en los KPIs, aparecen en
 * la lista y en las paradas, zonaAt las detecta, la alerta de geocercas les
 * aplica su propio menu y el informe y la IA las ven. Se distinguen por el
 * campo _app y por su id con prefijo, nunca por _rid (que es lo que hace
 * que la plataforma las busque).
 *
 * El nucleo es puro (no toca DOM ni red) para poder probarlo aislado en
 * tests/geocerca-local.test.js.
 */
const GEOLOC_MAX_PUNTOS = 250;      // por geocerca
const GEOLOC_MAX_ZONAS = 80;        // geocercas de la app por navegador
const GEOLOC_MIN_RADIO = 10;        // m
const GEOLOC_MAX_RADIO = 50000;     // m
const GEOLOC_NOMBRE_MAX = 60;
const GEOLOC_VERSION = 1;

// Convierte una lista de puntos (lat/lon) al formato de la plataforma:
// {x: lon, y: lat}. Descarta lo que no sea coordenada valida.
function glocPts(entrada) {
    const out = [];
    const arr = Array.isArray(entrada) ? entrada : [];
    for (let i = 0; i < arr.length && out.length < GEOLOC_MAX_PUNTOS; i++) {
        const a = arr[i];
        if (!a || typeof a !== 'object') continue;
        // {x,y} (formato de la plataforma), {lat,lon} (formato de Rondo) o
        // [lon, lat] (arrays sueltos, como los de get_zone_data).
        const y = (a.y != null) ? +a.y : (a.lat != null ? +a.lat : (Array.isArray(a) ? +a[1] : NaN));
        const x = (a.x != null) ? +a.x : (a.lon != null ? +a.lon : (Array.isArray(a) ? +a[0] : NaN));
        if (!isFinite(x) || !isFinite(y)) continue;
        if (y < -85.05 || y > 85.05 || x < -180 || x > 180) continue;
        out.push({ x: x, y: y });
    }
    return out;
}
// Lista de {lat, lon} (la que consume el mini-mapa y el guardado).
function glocLatLon(pts) {
    const out = [];
    for (let i = 0; i < (pts || []).length; i++) {
        const p = pts[i];
        if (!p) continue;
        out.push({ lat: +p.y, lon: +p.x });
    }
    return out;
}
function glocCentro(pts) {
    let sx = 0, sy = 0, n = 0;
    for (const p of (pts || [])) {
        if (!p || !isFinite(p.x) || !isFinite(p.y)) continue;
        sx += p.x; sy += p.y; n++;
    }
    return n ? { x: sx / n, y: sy / n, lat: sy / n, lon: sx / n } : null;
}
// Bounding box completo: para circulos abarca tambien el radio (si solo
// cubriera el centro, inZone descartaria fuera por el bbox y las alertas y el
// indice espacial no la verian).
function glocBBox(pts, centro, radioM) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of (pts || [])) {
        if (!p || !isFinite(p.x) || !isFinite(p.y)) continue;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }
    if (!isFinite(minX)) return null;
    let cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    if (radioM > 0 && centro) {
        const dl = radioM / (111320 * Math.cos(centro.y * Math.PI / 180) || 111320);
        const da = radioM / 110540;
        minX = Math.min(minX, centro.x - dl); maxX = Math.max(maxX, centro.x + dl);
        minY = Math.min(minY, centro.y - da); maxY = Math.max(maxY, centro.y + da);
        cx = centro.x; cy = centro.y;
    }
    return { min_x: minX, min_y: minY, max_x: maxX, max_y: maxY, cen_x: cx, cen_y: cy };
}
function glocId() {
    return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function glocLimpiaNom(n) {
    return String(n == null ? '' : n).replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, GEOLOC_NOMBRE_MAX);
}
// Normaliza un objeto suelto (de storage, de un import o del editor) a una
// geocerca de la app valida, o null si no se puede usar. Tolera formatos
// distintos: puntos como {x,y}, como {lat,lon} o como [lat,lon].
function glocNormaliza(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const nombre = glocLimpiaNom(raw.n || raw.nombre || raw.name);
    if (!nombre) return null;
    let t = (raw.t != null) ? +raw.t : (raw.tipo === 'circulo' || raw.type === 'Point' ? 3 : 2);
    if (t !== 1 && t !== 2 && t !== 3) t = 2;
    let pts = [];
    // Un par plano [lat, lon] es un centro, no una lista de puntos: se
    // detecta antes de pasar por glocPts (que lo leeria como x/y invertidos).
    const plano = raw.puntos;
    if (Array.isArray(plano) && plano.length === 2 && typeof plano[0] !== 'object' &&
        isFinite(+plano[0]) && isFinite(+plano[1]) && Math.abs(+plano[0]) <= 90) {
        pts = [{ x: +plano[1], y: +plano[0] }];
    } else {
        pts = glocPts(raw.p || raw.puntos || raw.coords);
    }
    let w = (raw.w != null) ? +raw.w : ((raw.radio != null) ? +raw.radio : 0);
    if (!isFinite(w)) w = 0;
    if (t === 3) {
        w = clamp(w, GEOLOC_MIN_RADIO, GEOLOC_MAX_RADIO);
        if (!pts.length) return null;
    } else {
        w = (w > 0) ? clamp(w, GEOLOC_MIN_RADIO, GEOLOC_MAX_RADIO) : 0;
        if (pts.length < (t === 1 ? 2 : 3)) return null;
    }
    const cen = (t === 3) ? { x: pts[0].x, y: pts[0].y } : glocCentro(pts);
    const b = glocBBox(pts, cen, (t === 3) ? w : 0);
    if (!b) return null;
    return {
        id: String(raw.id || glocId()),
        n: nombre,
        t: t,
        p: pts,
        // El ancho importa tambien en las lineas: inZone las trata como un
        // corredor de ese ancho, asi que sin el no contendrian nada.
        w: (t === 1) ? w : ((t === 3) ? w : 0),
        b: b,
        app: 1,
        ts: Number(raw.ts) || Date.now()
    };
}
// Nombre libre: si ya existe una geocerca con ese nombre (de la app o de la
// plataforma) se anade un sufijo. Los nombres son la clave con la que se
// direccionan tarjetas, alertas y paradas: no pueden repetirse.
function glocNombreLibre(nombre, nativos, propio) {
    // "__proto__", "constructor" y "prototype" se usan como clave en el mapa
    // de alertas por geocerca: un nombre asi se renombra antes de guardar.
    const crudo = glocLimpiaNom(nombre);
    const base = (!crudo || crudo === '__proto__' || crudo === 'constructor' || crudo === 'prototype')
        ? 'Geocerca' : crudo;
    const usados = {};
    for (const z of (nativos || [])) {
        const n = z && glocLimpiaNom(z.n);
        if (n) usados[n.toLowerCase()] = 1;
    }
    for (const z of (propio || [])) {
        const n = z && glocLimpiaNom(z.n);
        if (n) usados[n.toLowerCase()] = 1;
    }
    let out = base, i = 2;
    while (usados[out.toLowerCase()]) out = base + ' ' + i++;
    return out;
}
// ── Exportacion / importacion ────────────────────────────────────────────
// Formato propio: compacto y suficiente para volver a dibujarlas.
function glocExportaJSON(lista) {
    const feats = (lista || []).map((z) => {
        // Puntos como {lat, lon}: legible y sin confusion con el [lon, lat]
        // de GeoJSON.
        const o = { n: z.n, t: z.t, p: z.p.map((p) => ({ lat: p.y, lon: p.x })), ts: z.ts || 0 };
        if (z.t === 3) o.w = z.w;
        return o;
    });
    return JSON.stringify({ tipo: 'rondo-geocercas', version: GEOLOC_VERSION, geocercas: feats }, null, 1);
}
// GeoJSON estandar: se abre en cualquier visor y se puede editar fuera.
function glocExportaGeoJSON(lista) {
    const feats = (lista || []).map((z) => ({
        type: 'Feature',
        properties: { nombre: z.n, origen: 'rondo-app', tipo: (z.t === 3 ? 'circulo' : (z.t === 1 ? 'linea' : 'poligono')), radio_m: (z.t === 3 ? z.w : null), ts: z.ts || 0 },
        geometry: (function () {
            if (z.t === 3) {
                const c = glocCentro(z.p);
                return { type: 'Point', coordinates: [c ? c.x : 0, c ? c.y : 0] };
            }
            const ring = z.p.map((p) => [p.x, p.y]);
            if (ring.length) ring.push([ring[0][0], ring[0][1]]);
            return { type: (z.t === 1 ? 'LineString' : 'Polygon'), coordinates: (z.t === 1 ? z.p.map((p) => [p.x, p.y]) : [ring]) };
        })()
    }));
    return JSON.stringify({ type: 'FeatureCollection', features: feats }, null, 1);
}
// Parsea texto importado (formato propio, array suelto o GeoJSON).
// Devuelve {lista, ignoradas, error}.
function glocParsea(txt) {
    const out = { lista: [], ignoradas: 0, error: '' };
    let data = null;
    try {
        const t = String(txt == null ? '' : txt).trim();
        if (!t) { out.error = 'El archivo esta vacio'; return out; }
        data = JSON.parse(t);
    } catch (e) {
        out.error = 'No es JSON valido';
        return out;
    }
    let items = [];
    if (Array.isArray(data)) items = data;
    else if (data && Array.isArray(data.geocercas)) items = data.geocercas;
    else if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) items = data.features;
    else if (data && data.geometry) items = [data];
    // Geometria suelta (copiada de un visor de mapas).
    else if (data && (data.type === 'Polygon' || data.type === 'MultiPolygon' ||
        data.type === 'LineString' || data.type === 'Point')) {
        items = [{ type: 'Feature', geometry: data, properties: {} }];
    } else { out.error = 'El archivo no contiene geocercas'; return out; }
    for (const it of items) {
        if (!it) { out.ignoradas++; continue; }
        if (it.type === 'Feature' && it.geometry) {
            const pr = it.properties || {};
            const g = it.geometry;
            let z = null;
            if (g.type === 'Polygon' && Array.isArray(g.coordinates) && g.coordinates[0]) {
                z = glocNormaliza({ nombre: pr.nombre || pr.n, t: 2, p: g.coordinates[0].map((c) => ({ x: +c[0], y: +c[1] })) });
            } else if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates) && g.coordinates.length) {
                // MultiPolygon: cada elemento es un poligono (array de anillos).
                // Se toma el anillo exterior y se queda el mas grande.
                let mejor = null;
                for (const pol of g.coordinates) {
                    const anillo = (Array.isArray(pol) && Array.isArray(pol[0]) && Array.isArray(pol[0][0])) ? pol[0] : pol;
                    if (Array.isArray(anillo) && (!mejor || anillo.length > mejor.length)) mejor = anillo;
                }
                z = glocNormaliza({ nombre: pr.nombre || pr.n, t: 2, p: (mejor || []).map((c) => ({ x: +c[0], y: +c[1] })) });
            } else if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
                z = glocNormaliza({ nombre: pr.nombre || pr.n, t: 1, p: g.coordinates.map((c) => ({ x: +c[0], y: +c[1] })) });
            } else if (g.type === 'Point' && Array.isArray(g.coordinates)) {
                z = glocNormaliza({
                    nombre: pr.nombre || pr.n, t: 3, p: [{ x: +g.coordinates[0], y: +g.coordinates[1] }],
                    w: (pr.radio_m != null) ? +pr.radio_m : 100
                });
            }
            if (z) out.lista.push(z); else out.ignoradas++;
            continue;
        }
        const z = glocNormaliza(it);
        if (z) out.lista.push(z); else out.ignoradas++;
    }
    if (!out.lista.length && !out.error) out.error = 'Ninguna geocerca utilizable';
    return out;
}

/* ====================== GEOCERCAS DE LA APP: ALMACEN ====================== */
// Lista de geocercas de la app ya validadas (filtra lo que se haya
// quedado roto en el storage sin romper la pestana).
function glocLista() {
    const crudo = Array.isArray(APP.zonasLocales) ? APP.zonasLocales : [];
    const out = [];
    for (const z of crudo) {
        const n = glocNormaliza(z);
        if (n) out.push(n);
    }
    return out;
}
// Aplica la lista al almacenamiento y la fusiona con las nativas en
// APP.zonas. IMPORTANTE: APP.zonas se REASIGNA (nunca se muta) porque el
// indice espacial se invalida comparando la identidad del array.
function glocSincroniza(lista) {
    const validas = [];
    for (const z of (lista || [])) {
        const n = glocNormaliza(z);
        if (n) validas.push(n);
    }
    APP.zonasLocales = validas;
    const nativas = (APP.zonas || []).filter((z) => z && !z.app);
    APP.zonas = nativas.concat(validas);
    APP.zonasIndex = null;
    try {
        APP.zonasPorNombre = new Map(APP.zonas.map((z) => [z.n || '', z]));
    } catch (_) { APP.zonasPorNombre = new Map(); }
    return APP.zonasLocales;
}
// Guarda en la sesion y, si el operador lo pidio, tambien en localStorage
// para que sobrevivan a cerrar el navegador.
function glocPersiste() {
    const lista = APP.zonasLocales || [];
    writeSession(SS.geolocal, JSON.stringify(lista));
    // La copia persistente solo existe si el operador lo pidio; si lo quita,
    // se borra la que hubiera (misma forma en ambos casos: un array).
    if (APP.config && APP.config.geolocalRecordar) writeJSON(LS.geolocal, lista);
    else writeJSON(LS.geolocal, []);
}
function glocGuarda(z, lista) {
    const nueva = glocNormaliza(z);
    if (!nueva) return null;
    const base = lista || glocLista();
    const i = base.findIndex((x) => x.id === nueva.id);
    const salida = base.slice();
    if (i >= 0) salida[i] = nueva;
    else {
        if (salida.length >= GEOLOC_MAX_ZONAS) {
            adviceWarn('Limite alcanzado', 'Se pueden guardar hasta ' + GEOLOC_MAX_ZONAS + ' geocercas de la app.');
            return null;
        }
        salida.push(nueva);
    }
    glocSincroniza(salida);
    glocPersiste();
    return nueva;
}
function glocBorra(id, lista) {
    const base = lista || glocLista();
    const salida = base.filter((x) => x.id !== id);
    if (salida.length === base.length) return false;
    glocSincroniza(salida);
    glocPersiste();
    return true;
}
// Importa (reemplaza o anade) las geocercas de un texto.
function glocImporta(txt, modo) {
    const r = glocParsea(txt);
    if (r.error && !r.lista.length) return r;
    let lista = (modo === 'anadir') ? glocLista() : [];
    let nuevas = 0;
    for (const z of r.lista) {
        const libre = glocNombreLibre(z.n, (APP.zonas || []).filter((x) => !x.app), lista.concat(APP.zonasLocales || []));
        const copia = Object.assign({}, z, { n: libre, id: glocId() });
        if (lista.length >= GEOLOC_MAX_ZONAS) break;
        lista.push(copia);
        nuevas++;
    }
    glocSincroniza(lista);
    glocPersiste();
    r.lista = APP.zonasLocales;
    r.nuevas = nuevas;
    return r;
}
// Marca las geocercas de la app para poder distinguirlas en la UI.
function glocEsApp(z) {
    return !!(z && (z.app === 1 || z._app === true));
}
// ── Medidas (area, perimetro, longitud) ─────────────────────────────────
// Perimetro/longitud en metros con la aproximacion local (misma que usa el
// resto del script): suficiente para mostrarlo al operador.
function glocPerimM(pts, cerrado) {
    const p = pts || [];
    let d = 0;
    for (let i = 0; i < p.length - 1; i++) d += _geoDistM(p[i].y, p[i].x, p[i + 1].y, p[i + 1].x);
    if (cerrado && p.length > 2) d += _geoDistM(p[p.length - 1].y, p[p.length - 1].x, p[0].y, p[0].x);
    return d;
}
function glocM2(z) {
    if (!z) return 0;
    if (z.t === 3) return Math.PI * z.w * z.w;
    if (z.t === 1) return 0;
    return zonaAreaM2(z);
}
function glocTextoTam(z) {
    const m2 = glocM2(z);
    if (z && z.t === 1) return fmtArea((glocPerimM(z.p, false) || 0) / 1000) + ' de trazo';
    if (m2 >= 1e6) return fmtArea(m2 / 1e6);
    return Math.round(m2) + ' m2';
}

// Pasa de pixel del contenedor a coordenada (inversa de rxMMPt). Es la
// unica pieza que el mini-mapa no tenia: sin ella no se puede dibujar.
function glocPxALatLon(inst, px, py) {
    const z = clamp(inst ? inst.z : 16, 2, 19);
    const n = Math.pow(2, z) * 256;
    const ox = (inst ? inst.ox : 0) + px, oy = (inst ? inst.oy : 0) + py;
    const lon = ox / n * 360 - 180;
    // OJO: el y normalizado de rxMMLatY es (0.5 - k/4PI), es decir YA es la
    // coordenada normalizada; hay que deshacerlo con atan(sinh(PI*(1-2y))),
    // que es la inversa exacta de esa formula. Restarle 0.5 aqui desplaza
    // cualquier punto hacia un polo.
    const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (oy / n)))) * 180 / Math.PI;
    return { lat: clamp(lat, -85.05112878, 85.05112878), lon: clamp(lon, -180, 180) };
}
/* ====================== GEOCERCAS DE LA APP: MAPA ====================== */
// Estado del editor (borrador en curso + geocerca en edicion).
let _gloc = null;
function glocEstado() {
    if (!_gloc) {
        _gloc = {
            id: null, nombre: '', modo: 'poligono', pts: [], radio: 100, ancho: 100,
            mapa: null, capa: null, editando: false
        };
    }
    return _gloc;
}
// Capa propia encima del mini-mapa: dibuja el borrador (no vive en
// inst.lineas porque rxMMDibujar reescribe esas capas en cada pan/zoom).
function glocPintarBorrador() {
    const e = glocEstado();
    if (!e.mapa || !e.capa) return;
    const inst = e.mapa;
    const pt = (lat, lon) => {
        const q = rxMMPt(inst, lat, lon);
        return q[0].toFixed(1) + ',' + q[1].toFixed(1);
    };
    let h = '';
    if (e.pts.length) {
        const p = e.pts.map((q) => pt(q.lat, q.lon));
        if (e.modo === 'circulo' && e.pts.length >= 1) {
            const c = e.pts[0];
            if (e.radioListo) {
                const rM = glocRadioDesde(e, c);
                const a = 32;
                const pol = [];
                for (let i = 0; i <= a; i++) {
                    const ang = (i / a) * Math.PI * 2;
                    const dl = (rM / 111320) * Math.cos(ang) / (Math.cos(c.lat * Math.PI / 180) || 1);
                    const da = (rM / 110540) * Math.sin(ang);
                    pol.push(pt(c.lat + da, c.lon + dl));
                }
                h += '<polygon points="' + pol.join(' ') + '" fill="rgba(249,168,37,.22)" stroke="#f9a817" stroke-width="2"/>';
            }
            h += '<circle cx="' + pt(c.lat, c.lon).split(',')[0] + '" cy="' + pt(c.lat, c.lon).split(',')[1] + '" r="4" fill="#f9a817" stroke="#fff" stroke-width="1.5"><title>Centro</title></circle>';
        } else {
            if (p.length > 1) {
                h += '<polyline points="' + p.join(' ') + '" fill="none" stroke="#f9a817" stroke-width="2.5" stroke-linejoin="round" stroke-dasharray="' +
                    (e.modo === 'linea' ? '0' : '6 4') + '"/>';
                if (e.modo === 'poligono' && e.pts.length >= 3) {
                    h += '<polygon points="' + p.concat([p[0]]).join(' ') + '" fill="rgba(249,168,37,.18)" stroke="none"/>';
                }
            }
            for (let i = 0; i < e.pts.length; i++) {
                h += '<circle cx="' + p[i].split(',')[0] + '" cy="' + p[i].split(',')[1] + '" r="4" fill="#f9a817" stroke="#fff" stroke-width="1.5"><title>Punto ' + (i + 1) + '</title></circle>';
            }
        }
    }
    // Circulo en curso: une el centro con el cursor para intuir el radio.
    if (e.modo === 'circulo' && e.pts.length === 1 && e.cursor) {
        const c = e.pts[0];
        h += '<line x1="' + pt(c.lat, c.lon).split(',')[0] + '" y1="' + pt(c.lat, c.lon).split(',')[1] +
            '" x2="' + pt(e.cursor.lat, e.cursor.lon).split(',')[0] + '" y2="' + pt(e.cursor.lat, e.cursor.lon).split(',')[1] +
            '" stroke="#f9a817" stroke-width="1.5" stroke-dasharray="4 3"/>';
    }
    e.capa.innerHTML = h;
}
// Radio del circulo en metros a partir del centro y del punto de radio.
function glocRadioDesde(e, centro) {
    const ref = e.radioPunto || e.cursor;
    if (!centro || !ref) return e.radio;
    return clamp(_geoDistM(centro.lat, centro.lon, ref.lat, ref.lon), GEOLOC_MIN_RADIO, GEOLOC_MAX_RADIO);
}
// Los puntos ya confirmados que se dibujan de otras geocercas (contexto).
function glocPintarContexto() {
    const e = glocEstado();
    if (!e.mapa || !e.capaCtx) return;
    const inst = e.mapa;
    let h = '';
    for (const z of glocLista()) {
        if (z.id === e.id) continue;
        const c = '#7d8595';
        const p = z.p.map((q) => {
            const r = rxMMPt(inst, q.y, q.x);
            return r[0].toFixed(1) + ',' + r[1].toFixed(1);
        });
        if (z.t === 3) {
            const cen = glocCentro(z.p);
            if (!cen) continue;
            const pol = [];
            for (let i = 0; i <= 24; i++) {
                const ang = (i / 24) * Math.PI * 2;
                const dl = (z.w / 111320) * Math.cos(ang) / (Math.cos(cen.y * Math.PI / 180) || 1);
                const da = (z.w / 110540) * Math.sin(ang);
                const r = rxMMPt(inst, cen.y + da, cen.x + dl);
                pol.push(r[0].toFixed(1) + ',' + r[1].toFixed(1));
            }
            h += '<polygon points="' + pol.join(' ') + '" fill="rgba(125,133,149,.14)" stroke="' + c + '" stroke-width="1.5" stroke-dasharray="5 4"><title>' + esc(z.n) + '</title></polygon>';
        } else if (p.length > 1) {
            h += '<polygon points="' + p.concat([p[0]]).join(' ') + '" fill="rgba(125,133,149,.12)" stroke="' + c + '" stroke-width="1.5" stroke-dasharray="5 4"><title>' + esc(z.n) + '</title></polygon>';
        }
    }
    e.capaCtx.innerHTML = h;
}

/* ====================== GEOCERCAS DE LA APP: UI ====================== */
// Ventana de edicion: mapa a la izquierda, paneles a la derecha. El shell
// se crea una vez; los paneles se repintan en .gg-lados (asi los listeners
// delegados sobreviven a cada render).
function glocModalEl() {
    let el = byId('rondo-geocerca-modal');
    if (el) return el;
    el = makeEl('div', { id: 'rondo-geocerca-modal' });
    el.innerHTML =
        '<div class="gg-card">' +
        '<div class="gg-head"><span class="rondo-usym">' + UIS.zone + '</span> <b>Geocercas de la app</b>' +
        '<span class="gg-headsub">dibujadas en Rondo, fuera de la plataforma</span>' +
        '<span style="flex:1"></span>' +
        '<button class="gg-x" id="gg-x" title="Cerrar"><span class="rondo-usym">' + UIS.close + '</span></button></div>' +
        // Las dos capas SVG son propias: rxMiniMapa redibuja las suyas en cada
        // pan/zoom y se llevaria por delante el borrador si fuera dentro.
        '<div class="gg-cuerpo">' +
        '<div class="rondo-gg-mapa" id="rondo-gg-mapa">' +
        '<svg class="rondo-gg-ctx" xmlns="http://www.w3.org/2000/svg"></svg>' +
        '<svg class="rondo-gg-capa" xmlns="http://www.w3.org/2000/svg"></svg>' +
        '<div class="rondo-gg-atrib">\u00a9 OpenStreetMap</div>' +
        '</div>' +
        '<div class="gg-lados"></div>' +
        '</div>' +
        '<div class="gg-foot"><span class="gg-pie">Se guardan en esta pestana; marca <b>Recordar en este navegador</b> para que sobrevivan. ' +
        'Forman parte de las geocercas de Rondo: cuentan en los KPIs, sirven como parada y admiten alerta propia.</span>' +
        '<button id="gg-cerrar-modal">Cerrar</button>' +
        '<button class="primary" id="gg-guardar"><span class="rondo-usym">' + UIS.check + '</span> Guardar geocerca</button>' +
        '</div>' +
        '</div>';
    document.body.appendChild(el);
    el.addEventListener('pointerdown', (ev) => { if (ev.target === el) cerrarGeocercaApp(); });
    const x = byId('gg-x');
    if (x) x.addEventListener('click', () => cerrarGeocercaApp());
    const cm = byId('gg-cerrar-modal');
    if (cm) cm.addEventListener('click', () => cerrarGeocercaApp());
    const gd = byId('gg-guardar');
    if (gd) gd.addEventListener('click', () => glocGuardarBorrador());
    glocBind();
    return el;
}
function cerrarGeocercaApp() {
    const el = byId('rondo-geocerca-modal');
    if (el) el.classList.remove('abierto');
    const e = glocEstado();
    e.mapa = null; e.capa = null; e.capaCtx = null;
}
function abrirGeocercaApp(editar) {
    const e = glocEstado();
    const lista = glocLista();
    e.id = null; e.nombre = ''; e.pts = []; e.radioListo = false; e.radioPunto = null; e.cursor = null;
    e.editando = false;
    if (editar) {
        const z = typeof editar === 'string'
            ? lista.find((x) => x.id === editar)
            : lista.find((x) => (x.n || '') === editar);
        if (z) {
            e.id = z.id;
            e.nombre = z.n;
            e.modo = (z.t === 3 ? 'circulo' : (z.t === 1 ? 'linea' : 'poligono'));
            e.pts = z.p.map((p) => ({ lat: p.y, lon: p.x }));
            e.radio = z.w || 100;
            e.ancho = z.w || 100;
            e.radioListo = (z.t === 3);
            e.radioPunto = (z.t === 3) ? { lat: z.p[0].y, lon: z.p[0].x } : null;
            e.editando = true;
        }
    }
    glocModalEl().classList.add('abierto');
    glocRender();
    // Centra el mapa en la geocerca (o en la flota si es nueva).
    try {
        e.mapa.medir();
        const pts = e.pts.length ? glocLatLon(glocPuntosActuales())
            : (APP.unidades || []).filter(shouldWatch).map((u) => { const st = unitState(u); return { lat: st.lat, lon: st.lon }; }).filter((p) => p.lat != null);
        if (pts.length) { e.mapa.lineas = [{ pts: pts }]; e.mapa.encuadrar(); }
        e.mapa.render();
    } catch (_) { /* noop */ }
    glocPintarBorrador();
    glocPintarContexto();
}
// Estado del borrador como lo espera glocNormaliza.
function glocBorrador() {
    const e = glocEstado();
    const o = { n: e.nombre, p: glocPuntosActuales(e) };
    if (e.modo === 'circulo') { o.t = 3; o.w = glocRadioDesde(e, e.pts[0] || e.cursor); }
    else if (e.modo === 'linea') { o.t = 1; o.w = e.ancho; }
    else o.t = 2;
    return o;
}
function glocPuntosActuales(e) {
    const est = e || glocEstado();
    if (est.modo === 'circulo') {
        const c = est.pts[0];
        if (!c) return [];
        return [{ x: c.lon, y: c.lat }];
    }
    return est.pts.map((p) => ({ x: p.lon, y: p.lat }));
}
function glocPuntosActuales(e) {
    const est = e || glocEstado();
    if (est.modo === 'circulo') {
        const c = est.pts[0];
        return c ? [{ x: c.lon, y: c.lat }] : [];
    }
    return est.pts.map((p) => ({ x: p.lon, y: p.lat }));
}
// Resumen del borrador para el pie del editor.
function glocResumen() {
    const e = glocEstado();
    const b = glocBorrador();
    const z = glocNormaliza(b);
    const nP = (e.modo === 'circulo') ? (e.pts.length ? 'circulo' : 'sin centro') : (e.pts.length + ' punto(s)');
    if (!z) {
        return nP + ' \u00b7 completa la figura';
    }
    const peri = (z.t === 3) ? (2 * Math.PI * z.w + ' m de circunferencia') : Math.round(glocPerimM(z.p, z.t === 2)) + ' m de perimetro';
    return nP + ' \u00b7 ' + glocTextoTam(z) + ' \u00b7 ' + peri;
}
function glocListaHTML() {
    const lista = glocLista();
    if (!lista.length) {
        return '<div class="gg-vacio">Aun no has creado ninguna geocerca en la app. Dibujala en el mapa y pulsa <b>Guardar</b>.</div>';
    }
    return lista.map((z) => {
        const alertas = geoAlertaCfgZona(z.n);
        return '<div class="gg-item" data-id="' + esc(z.id) + '">' +
            '<span class="gg-ptag" title="' + (z.t === 3 ? 'Circulo' : (z.t === 1 ? 'Linea' : 'Poligono')) + '"></span>' +
            '<div class="gg-in"><b>' + esc(z.n) + '</b>' +
            '<span>' + (z.t === 3 ? 'Circulo' : (z.t === 1 ? 'Linea' : 'Poligono')) + ' \u00b7 ' + glocTextoTam(z) +
            (alertas ? ' \u00b7 <i class="gg-alerta">alerta</i>' : '') + '</span></div>' +
            '<span class="gg-acc">' +
            '<button class="mini gg-ed" title="Editar en el mapa"><span class="rondo-usym">' + UIS.watch + '</span></button>' +
            '<button class="mini gg-cp" title="Copiar nombre y centro"><span class="rondo-usym">' + UIS.copy + '</span></button>' +
            '<button class="mini gg-al" title="Alerta de geocerca"><span class="rondo-usym">' + UIS.alertas + '</span></button>' +
            '<button class="mini gg-del" title="Eliminar"><span class="rondo-usym">' + UIS.close + '</span></button>' +
            '</span></div>';
    }).join('');
}
function glocRender() {
    const el = byId('rondo-geocerca-modal');
    if (!el || !el.classList.contains('abierto')) return;
    const e = glocEstado();
    if (!e.mapa) {
        const cont = byId('rondo-gg-mapa');
        if (cont) {
            e.mapa = rxMiniMapa(cont, { lineas: [], marcas: [] });
            e.capaCtx = cont.querySelector('.rondo-gg-ctx');
            e.capa = cont.querySelector('.rondo-gg-capa');
            glocBindMapa(cont);
        }
    }
    const cuerpo = el.querySelector('.gg-lados');
    if (cuerpo) {
        setHtml(cuerpo,
            '<div class="gg-lado">' +
            '<h4>' + (e.editando ? 'Editando geocerca' : 'Nueva geocerca') + '</h4>' +
            '<label class="gg-lab">Nombre<input type="text" id="gg-nombre" maxlength="' + GEOLOC_NOMBRE_MAX + '" value="' + esc(e.nombre) + '" placeholder="Patio del cliente"></label>' +
            '<div class="gg-modos">' +
            '<button type="button" class="gg-chip' + (e.modo === 'poligono' ? ' activo' : '') + '" data-gg="modo" data-v="poligono">Marco</button>' +
            '<button type="button" class="gg-chip' + (e.modo === 'circulo' ? ' activo' : '') + '" data-gg="modo" data-v="circulo">Círculo</button>' +
            '<button type="button" class="gg-chip' + (e.modo === 'linea' ? ' activo' : '') + '" data-gg="modo" data-v="linea">Línea</button>' +
            '</div>' +
            '<label class="gg-lab">Centro (lat, lon)<span class="gg-two">' +
            '<input type="text" id="gg-lat" inputmode="decimal" placeholder="19.4326" value="' + (e.pts.length ? e.pts[0].lat.toFixed(6) : '') + '">' +
            '<input type="text" id="gg-lon" inputmode="decimal" placeholder="-99.1332" value="' + (e.pts.length ? e.pts[0].lon.toFixed(6) : '') + '">' +
            '<button class="mini" id="gg-ir" title="Centrar el mapa en esas coordenadas">Ir</button>' +
            '</span></label>' +
            (e.modo === 'circulo'
                ? '<label class="gg-lab">Radio (m)<input type="number" id="gg-radio" min="' + GEOLOC_MIN_RADIO + '" max="' + GEOLOC_MAX_RADIO + '" value="' + Math.round(e.radio) + '"></label>'
                : (e.modo === 'linea' ? '<label class="gg-lab">Ancho del trazo (m)<input type="number" id="gg-ancho" min="' + GEOLOC_MIN_RADIO + '" max="' + GEOLOC_MAX_RADIO + '" value="' + Math.round(e.ancho) + '"></label>' : '')) +
            '<p class="gg-res" id="gg-res">' + esc(glocResumen()) + '</p>' +
            '<div class="gg-acciones">' +
            '<button class="mini" id="gg-undo" title="Quitar el ultimo punto"><span class="rondo-usym">' + UIS.menos + '</span> Deshacer</button>' +
            '<button class="mini" id="gg-limpiar" title="Empezar de cero"><span class="rondo-usym">' + UIS.clear + '</span> Limpiar</button>' +
            (e.modo === 'circulo' ? '' : '<button class="mini" id="gg-cerrar" title="Cerrar la figura (o doble clic en el mapa)">Cerrar figura</button>') +
            '</div>' +
            '<p class="gg-pista">' + esc(glocPista(e.modo)) + '</p>' +
            '</div>' +
            '<div class="gg-lado gg-lado-lista">' +
            '<h4>Mis geocercas <span class="gg-count">' + glocLista().length + '</span></h4>' +
            '<div class="gg-lista">' + glocListaHTML() + '</div>' +
            '<div class="gg-io">' +
            '<button class="mini" id="gg-exporta" title="Descargar un .json con tus geocercas"><span class="rondo-usym">' + UIS.export + '</span> Exportar</button>' +
            '<button class="mini" id="gg-exporta-geo" title="Descargar GeoJSON (abrible en cualquier visor)"><span class="rondo-usym">' + UIS.map + '</span> GeoJSON</button>' +
            '<button class="mini" id="gg-importa" title="Importar un .json o .geojson"><span class="rondo-usym">' + UIS.upload + '</span> Importar</button>' +
            '<button class="mini" id="gg-copiar" title="Copiar el JSON al portapapeles"><span class="rondo-usym">' + UIS.copy + '</span> Copiar</button>' +
            '<input type="file" id="gg-file" accept=".json,.geojson,.txt" hidden>' +
            '</div>' +
            '<label class="gg-check"><input type="checkbox" id="gg-recordar"' + (APP.config && APP.config.geolocalRecordar ? ' checked' : '') + '> Recordar en este navegador</label>' +
            '</div>');
    }
    glocPintarBorrador();
    glocPintarContexto();
}
function glocPista(modo) {
    if (modo === 'circulo') return 'Clic para poner el centro y otro clic para el radio (o escribe el radio).';
    if (modo === 'linea') return 'Clic para cada punto del trazo; doble clic o Cerrar figura para terminar.';
    return 'Clic para cada esquina del marco; doble clic o Cerrar figura para cerrarlo.';
}
// Interaccion con el mapa: clic para vertices, arrastre para mover, rueda
// para acercar. El mini-mapa ya gestiona el arrastre y la rueda; aqui solo
// se distingue un clic de un arrastre (mismo umbral de 4 px que el editor de
// paradas) y se pinta la capa propia.
function glocBindMapa(cont) {
    if (!cont || cont._ggBound) return;
    cont._ggBound = true;
    let x0 = 0, y0 = 0, movido = false;
    cont.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        x0 = ev.clientX; y0 = ev.clientY; movido = false;
    });
    cont.addEventListener('pointermove', (ev) => {
        if (Math.abs(ev.clientX - x0) > 4 || Math.abs(ev.clientY - y0) > 4) movido = true;
        const e = glocEstado();
        if (!e.mapa || !movido) return;
        // Radio del circulo en vivo mientras se arrastra.
        if (e.modo === 'circulo' && e.pts.length === 1) {
            const c = e.pts[0];
            const r = cont.getBoundingClientRect();
            e.cursor = glocPxALatLon(e.mapa, ev.clientX - r.left, ev.clientY - r.top);
            e.radio = glocRadioDesde(e, c);
            glocPintarBorrador();
            const res = byId('gg-res');
            if (res) res.textContent = glocResumen();
        }
    });
    cont.addEventListener('pointerup', (ev) => {
        if (movido || ev.button !== 0) return;
        const e = glocEstado();
        const r = cont.getBoundingClientRect();
        const p = glocPxALatLon(e.mapa, ev.clientX - r.left, ev.clientY - r.top);
        if (e.modo === 'circulo') {
            if (!e.pts.length) { e.pts = [p]; e.radioPunto = null; e.radioListo = false; }
            else { e.radioPunto = p; e.radio = glocRadioDesde(e, e.pts[0]); e.radioListo = true; }
        } else {
            if (e.pts.length >= GEOLOC_MAX_PUNTOS) {
                adviceWarn('Demasiados puntos', 'El maximo por geocerca es ' + GEOLOC_MAX_PUNTOS + '.');
                return;
            }
            e.pts.push(p);
        }
        glocRender();
    });
    cont.addEventListener('dblclick', (ev) => {
        ev.preventDefault();
        const e = glocEstado();
        if (e.modo === 'linea' || e.modo === 'poligono') e.pts.pop();
        glocRender();
    });
    // Al arrastrar/zoomear el mini-mapa hay que repintar nuestras capas.
    cont.addEventListener('wheel', () => {
        setTimeout(() => { glocPintarBorrador(); glocPintarContexto(); }, 0);
    }, { passive: true });
}
function glocGuardarBorrador() {
    const e = glocEstado();
    if (!e.nombre.trim()) {
        adviceWarn('Falta el nombre', 'Ponle un nombre a la geocerca antes de guardar.');
        const n = byId('gg-nombre');
        if (n && n.focus) n.focus();
        return;
    }
    const b = glocBorrador();
    const lista = glocLista();
    const libre = glocNombreLibre(b.n, (APP.zonas || []).filter((x) => !x.app), lista.filter((z) => z.id !== e.id));
    const z = glocNormaliza(Object.assign({}, b, {
        n: libre, id: e.id || glocId()
    }));
    if (!z) {
        adviceWarn('Figura incompleta',
            e.modo === 'circulo' ? 'Marca el centro y el radio del circulo.'
                : (e.modo === 'linea' ? 'Une al menos 2 puntos.' : 'Un marco necesita al menos 3 puntos.'));
        return;
    }
    glocGuarda(z);
    e.id = z.id;
    e.nombre = z.n;
    e.editando = true;
    e.radio = z.w || e.radio;
    adviceOk(e.editando ? 'Geocerca guardada' : 'Geocerca creada', z.n + ' \u00b7 ' + glocTextoTam(z));
    glocRender();
    if (APP.tab === 'zonas') { paintGeoAlertas(); paintGeocercas(); }
}
function glocBorradorVacio() {
    const e = glocEstado();
    e.pts = []; e.radioListo = false; e.radioPunto = null; e.cursor = null;
    e.nombre = ''; e.editando = false; e.id = null;
    glocRender();
}
// Eventos del modal (delegados: el HTML se regenera en cada render).
function glocBind() {
    const el = byId('rondo-geocerca-modal');
    if (!el || el._ggEvents) return;
    el._ggEvents = true;
    const cuerpo = el.querySelector('.gg-cuerpo');
    if (!cuerpo) return;
    cuerpo.addEventListener('click', (ev) => {
        const t = ev.target;
        const e = glocEstado();
        const chip = t.closest && t.closest('[data-gg="modo"]');
        if (chip) {
            const m = chip.dataset.v;
            e.modo = m;
            if (m === 'linea' && !e.ancho) e.ancho = 100;
            glocRender();
            return;
        }
        const fila = t.closest && t.closest('.gg-item');
        if (fila) {
            const id = fila.dataset.id;
            if (t.closest('.gg-ed')) { abrirGeocercaApp(id); return; }
            if (t.closest('.gg-cp')) {
                const z = glocLista().find((x) => x.id === id);
                const c = z ? glocCentro(z.p) : null;
                if (z) copiarAlPortapapeles(z.n + (c ? '\n' + c.y.toFixed(6) + ',' + c.x.toFixed(6) : ''), 'Geocerca copiada', z.n);
                return;
            }
            if (t.closest('.gg-al')) {
                const z = glocLista().find((x) => x.id === id);
                if (z) abrirGeoAlerta(z.n);
                return;
            }
            if (t.closest('.gg-del')) {
                const z = glocLista().find((x) => x.id === id);
                rondoConfirm('Eliminar geocerca', 'Se quitara "' + (z ? z.n : '') + '" de la lista de la app. Las demas no se tocan.', () => {
                    if (glocBorra(id)) {
                        if (e.id === id) glocBorradorVacio();
                        adviceOk('Geocerca eliminada', z ? z.n : '');
                        glocRender();
                        if (APP.tab === 'zonas') { paintGeoAlertas(); paintGeocercas(); }
                    }
                }, { peligro: true, okText: 'Eliminar' });
                return;
            }
        }
        const b = t.closest && t.closest('button');
        if (!b) return;
        const id = b.id;
        if (id === 'gg-ir') { glocIrACoordenadas(); return; }
        if (id === 'gg-undo') {
            e.pts.pop();
            if (!e.pts.length) { e.radioListo = false; e.radioPunto = null; }
            glocRender();
            return;
        }
        if (id === 'gg-limpiar') { glocBorradorVacio(); return; }
        if (id === 'gg-cerrar') { glocRender(); return; }
        if (id === 'gg-exporta') { glocExportar(false); return; }
        if (id === 'gg-exporta-geo') { glocExportar(true); return; }
        if (id === 'gg-importa') {
            const f = byId('gg-file');
            if (f) f.click();
            return;
        }
        if (id === 'gg-copiar') {
            const lista = glocLista();
            if (!lista.length) { adviceWarn('Nada que copiar', 'Primero crea una geocerca.'); return; }
            copiarAlPortapapeles(glocExportaJSON(lista), 'Geocercas copiadas', lista.length + ' geocerca(s)');
            return;
        }
    });
    cuerpo.addEventListener('input', (ev) => {
        const e = glocEstado();
        const t = ev.target;
        if (!t || !t.id) return;
        if (t.id === 'gg-nombre') { e.nombre = t.value; return; }
        if (t.id === 'gg-radio') {
            const n = Number(t.value);
            e.radio = clamp(isFinite(n) ? n : 100, GEOLOC_MIN_RADIO, GEOLOC_MAX_RADIO);
            e.radioPunto = null;
            e.radioListo = !!e.pts.length;
            glocPintarBorrador();
            const res = byId('gg-res');
            if (res) res.textContent = glocResumen();
            return;
        }
        if (t.id === 'gg-ancho') {
            const n = Number(t.value);
            e.ancho = clamp(isFinite(n) ? n : 100, GEOLOC_MIN_RADIO, GEOLOC_MAX_RADIO);
            const res = byId('gg-res');
            if (res) res.textContent = glocResumen();
        }
    });
    cuerpo.addEventListener('change', (ev) => {
        const t = ev.target;
        if (!t || !t.id) return;
        if (t.id === 'gg-recordar') {
            APP.config.geolocalRecordar = !!t.checked;
            writeJSON(LS.cfg, APP.config);
            glocPersiste();
            adviceOk(APP.config.geolocalRecordar ? 'Se guardaran en este navegador' : 'Solo en esta pestana',
                APP.config.geolocalRecordar ? 'Se recuperan al volver a abrir Rondo.' : 'Se pierden al cerrar la pestana: exporta si las quieres guardar.');
        }
        if (t.id === 'gg-file' && t.files && t.files[0]) glocImportarArchivo(t.files[0]);
    });
}
function glocIrACoordenadas() {
    const e = glocEstado();
    const lat = parseFloat(String(byId('gg-lat') ? byId('gg-lat').value : '').replace(',', '.'));
    const lon = parseFloat(String(byId('gg-lon') ? byId('gg-lon').value : '').replace(',', '.'));
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180) {
        adviceWarn('Coordenadas invalidas', 'Usa decimales, por ejemplo 19.4326 y -99.1332.');
        return;
    }
    e.pts = [{ lat: lat, lon: lon }];
    e.radioListo = false;
    e.radioPunto = null;
    try {
        e.mapa.medir();
        e.mapa.z = 17;
        e.mapa.ox = rxMMLonX(lon, e.mapa.z) - e.mapa.W / 2;
        e.mapa.oy = rxMMLatY(lat, e.mapa.z) - e.mapa.H / 2;
        e.mapa.render();
    } catch (_) { /* noop */ }
    glocRender();
}
function glocExportar(geojson) {
    const lista = glocLista();
    if (!lista.length) { adviceWarn('Nada que exportar', 'Primero crea una geocerca en la app.'); return; }
    const nombre = 'rondo_geocercas_app_' + new Date().toISOString().slice(0, 10);
    descargarJSON(
        geojson ? JSON.parse(glocExportaGeoJSON(lista)) : JSON.parse(glocExportaJSON(lista)),
        nombre + (geojson ? '.geojson' : '.json'),
        geojson ? 'application/geo+json;charset=utf-8;' : 'application/json;charset=utf-8;'
    );
    adviceOk('Geocercas exportadas', lista.length + ' geocerca(s)');
}
function glocImportarArchivo(file) {
    if (!file) return;
    try {
        file.text().then((txt) => {
            const r = glocImporta(txt, 'anadir');
            if (!r.lista.length && r.error) { adviceWarn('No se pudo importar', r.error); return; }
            adviceOk('Geocercas importadas', (r.nuevas || 0) + ' nueva(s)' + (r.ignoradas ? ' \u00b7 ' + r.ignoradas + ' descartada(s)' : ''));
            glocRender();
            if (APP.tab === 'zonas') { paintGeoAlertas(); paintGeocercas(); }
        }).catch(() => adviceWarn('No se pudo leer', file.name || 'el archivo'));
    } catch (_) {
        // Navegadores antiguos sin file.text(): FileReader.
        const fr = new FileReader();
        fr.onload = () => { glocImporta(String(fr.result || ''), 'anadir'); glocRender(); };
        fr.onerror = () => adviceWarn('No se pudo leer', file.name || 'el archivo');
        fr.readAsText(file);
    }
}