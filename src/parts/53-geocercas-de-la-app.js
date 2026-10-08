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
// Geocercas dibujadas a la vez en el mapa (por capa): con muchas, el SVG se
// saturaria y el navegador se arrastra. La leyenda avisa cuando se recorta.
const GEOLOC_MAX_PREVIEW = 140;

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
function glocImporta(txt, modo, sel) {
    const r = glocParsea(txt);
    if (r.error && !r.lista.length) return r;
    // sel: indices a importar (null = todas). Permite importar una sola de un
    // archivo que trae varias.
    const items = (Array.isArray(sel) && sel.length) ? sel.map((i) => r.lista[i]).filter(Boolean) : r.lista;
    let lista = (modo === 'anadir') ? glocLista() : [];
    let nuevas = 0;
    const nativas = (APP.zonas || []).filter((x) => !glocEsApp(x));
    for (const z of items) {
        const libre = glocNombreLibre(z.n, nativas, lista.concat(APP.zonasLocales || []));
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
// De donde sale cada geocerca. Se usa en la tarjeta, la lista del editor, la
// leyenda del mapa y las exportaciones, para que nunca se confundan.
//   plat -> de la plataforma (Wialon / AE-Track)
//   app  -> creada en Rondo (guardada en la sesion o en el navegador)
function glocOrigen(z, cfg) {
    if (!glocEsApp(z)) {
        return { id: 'plat', txt: 'Plataforma', corto: 'PLAT', largo: 'De la plataforma (Wialon / AE-Track)', guardado: false };
    }
    const c = (cfg && typeof cfg.geolocalRecordar === 'boolean') ? cfg.geolocalRecordar
        : !!(APP.config && APP.config.geolocalRecordar);
    return {
        id: 'app', txt: 'App', corto: 'APP',
        largo: c ? 'Creada en Rondo \u00b7 guardada en este navegador'
            : 'Creada en Rondo \u00b7 solo en esta sesi\u00f3n (se pierde al recargar)',
        guardado: c
    };
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
            mapa: null, capa: null, capaCtx: null, capaPlat: null, editando: false
        };
    }
    return _gloc;
}
// Capa propia encima del mini-mapa: dibuja el borrador (no vive en
// inst.lineas porque rxMMDibujar reescribe esas capas en cada pan/zoom).
// Chapa sobre el mapa: modo activo, cuanto lleva y como se dibuja. Se
// actualiza en cada render para no tener que releer el DOM.
function glocPintarHud() {
    const el = byId('gg-hud');
    if (!el) return;
    const e = glocEstado();
    const ico = (e.modo === 'circulo' ? 'zone' : (e.modo === 'linea' ? 'route' : 'map'));
    const c = glocCifras();
    const html = '<span class="gg-hud-m"><span class="rondo-usym">' + UIS[ico] + '</span>' +
        esc(glocModoTxt(e.modo)) + ' \u00b7 ' + esc(c.puntos) + '</span>' +
        '<span class="gg-hud-h">' + esc(glocPista(e.modo)) + '</span>';
    setHtml(el, html);
}
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
// Anillo de una geocerca en coordenadas de pantalla (funciona con las tres
// formas: circulo, poligono y linea). Es la pieza que usan las tres capas.
function glocAnillo(inst, z, segmentos) {
    const pts = (z && z._pts) || _zonaPuntos(z) || z.p;
    if (!Array.isArray(pts) || !pts.length) return '';
    const px = (a) => {
        const r = rxMMPt(inst, (a && a.y != null) ? a.y : a[1], (a && a.x != null) ? a.x : a[0]);
        return r[0].toFixed(1) + ',' + r[1].toFixed(1);
    };
    if (z.t === 3) {
        const cen = glocCentro(z.p) || (pts.length ? { x: +pts[0].x, y: +pts[0].y } : null);
        const radio = _zonaRadio(z);
        if (!cen || !(radio > 0)) return '';
        const n = clamp(segmentos || 30, 10, 60);
        const out = [];
        for (let i = 0; i <= n; i++) {
            const ang = (i / n) * Math.PI * 2;
            const dl = (radio / 111320) * Math.cos(ang) / (Math.cos(cen.y * Math.PI / 180) || 1);
            const da = (radio / 110540) * Math.sin(ang);
            out.push(px({ x: cen.x + dl, y: cen.y + da }));
        }
        return out.join(' ');
    }
    const p = pts.map(px);
    if (p.length < 2) return '';
    return (z.t === 1) ? p.join(' ') : p.concat([p[0]]).join(' ');
}
// Previsualizacion: lo que ya existe se ve en el mapa mientras se dibuja.
// Tres capas y un filtro (todas / solo mias / solo la plataforma) para no
// saturar el mapa cuando la instalacion tiene muchas geocercas.
function glocVista() {
    return (APP.geoPreview === 'app' || APP.geoPreview === 'plat') ? APP.geoPreview : 'todas';
}
// Capa 1: geocercas de la app (las que puedes editar/eliminar aqui).
function glocPintarContexto() {
    const e = glocEstado();
    if (!e.mapa || !e.capaCtx) return;
    const inst = e.mapa;
    if (glocVista() === 'plat') { e.capaCtx.innerHTML = ''; return; }
    let h = '';
    let n = 0;
    for (const z of glocLista()) {
        if (z.id === e.id) continue;
        if (n >= GEOLOC_MAX_PREVIEW) break;
        const anillo = glocAnillo(inst, z, 26);
        if (!anillo) continue;
        n++;
        const fill = (z.t === 3) ? 'rgba(125,133,149,.16)' : 'rgba(125,133,149,.13)';
        const tag = '<title>' + esc(z.n) + ' \u00b7 de la app</title>';
        h += (z.t === 1)
            ? '<polyline points="' + anillo + '" fill="none" stroke="#7d8595" stroke-width="2" stroke-dasharray="6 4" opacity=".85">' + tag + '</polyline>'
            : '<polygon points="' + anillo + '" fill="' + fill + '" stroke="#7d8595" stroke-width="1.5" stroke-dasharray="5 4">' + tag + '</polygon>';
    }
    e.capaCtx.innerHTML = h;
}
// Capa 2: geocercas de la plataforma, para dibujar sin pisarlas.
function glocPintarPlataforma() {
    const e = glocEstado();
    if (!e.mapa || !e.capaPlat) return;
    const inst = e.mapa;
    if (glocVista() === 'app') { e.capaPlat.innerHTML = ''; return; }
    let h = '';
    let n = 0;
    for (const z of (APP.zonas || [])) {
        if (!z || glocEsApp(z)) continue;
        if (n >= GEOLOC_MAX_PREVIEW) break;
        const anillo = glocAnillo(inst, z, 20);
        if (!anillo) continue;
        n++;
        const tag = '<title>' + esc(z.n || ('Zona ' + z.id)) + ' \u00b7 de la plataforma</title>';
        h += (z.t === 1)
            ? '<polyline points="' + anillo + '" fill="none" stroke="#5c7a99" stroke-width="1.5" stroke-dasharray="3 4" opacity=".7">' + tag + '</polyline>'
            : '<polygon points="' + anillo + '" fill="rgba(92,122,153,.12)" stroke="#5c7a99" stroke-width="1" stroke-dasharray="3 4" opacity=".8">' + tag + '</polygon>';
    }
    e.capaPlat.innerHTML = h;
}
// Leyenda del mapa: que color es cada cosa y cuantas hay de cada origen.
function glocLeyendaHTML() {
    const todas = APP.zonas || [];
    const propias = todas.filter((z) => glocEsApp(z)).length;
    const plat = todas.length - propias;
    const v = glocVista();
    const chip = (val, txt, n, act) => '<button type="button" class="gg-ley-b' + (act ? ' activo' : '') + '" data-gg="preview" data-v="' + val + '" title="Ver ' + txt.toLowerCase() + ' en el mapa">' +
        '<i class="sw-' + val + '"></i>' + esc(txt) + ' <b>' + n + '</b></button>';
    return '<div class="gg-ley">' + chip('todas', 'Todas', propias + plat, v === 'todas') +
        chip('app', 'App', propias, v === 'app') +
        chip('plat', 'Plataforma', plat, v === 'plat') +
        '<i class="gg-ley-draft">borrador</i></div>';
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
        '<svg class="rondo-gg-plat" xmlns="http://www.w3.org/2000/svg"></svg>' +
        '<svg class="rondo-gg-ctx" xmlns="http://www.w3.org/2000/svg"></svg>' +
        '<svg class="rondo-gg-capa" xmlns="http://www.w3.org/2000/svg"></svg>' +
        '<div class="gg-hud" id="gg-hud"></div>' +
        '<div class="gg-leyenda" id="gg-leyenda"></div>' +
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
    const c = glocCifras();
    if (!c.superficie) return c.puntos + ' \u00b7 completa la figura';
    return c.puntos + ' \u00b7 ' + c.superficie + ' \u00b7 ' + c.perimetro;
}
// Cifras del borrador: alimentan la tira de estadisticos del panel lateral.
function glocCifras() {
    const e = glocEstado();
    const z = glocNormaliza(glocBorrador());
    const out = {
        n: e.pts.length,
        puntos: (e.modo === 'circulo')
            ? (e.pts.length ? 'circulo' : 'sin centro')
            : (e.pts.length + (e.pts.length === 1 ? ' punto' : ' puntos')),
        superficie: '',
        radio: '',
        perimetro: '',
        completo: !!z
    };
    if (!z) return out;
    out.superficie = glocTextoTam(z);
    out.radio = (z.t === 3) ? (Math.round(z.w) + ' m') : '';
    out.perimetro = (z.t === 3)
        ? (Math.round(2 * Math.PI * z.w) + ' m')
        : (Math.round(glocPerimM(z.p, z.t === 2)) + ' m');
    return out;
}
function glocListaHTML() {
    const v = APP.geoListaVista || 'app';
    const todas = glocLista();
    const lista = todas.filter((z) => (v === 'plat') ? !glocEsApp(z) : (v === 'todas' ? true : glocEsApp(z)));
    if (v === 'plat') {
        return '<div class="gg-vacio"><span class="rondo-usym">' + UIS.map + '</span>' +
            '<b>Las de la plataforma no se editan aqui</b>' +
            '<span>Se dibujan en AE-Track o Wialon (icono azul en el mapa). Aqui solo se crean y modifican las de Rondo.</span></div>';
    }
    if (!lista.length) {
        return '<div class="gg-vacio"><span class="rondo-usym">' + UIS.zone + '</span>' +
            '<b>Aun no hay geocercas</b>' +
            '<span>Dibuja un marco, circulo o linea en el mapa y pulsa <b>Guardar geocerca</b>.</span></div>';
    }
    return lista.map((z) => {
        const alertas = geoAlertaCfgZona(z.n);
        const forma = (z.t === 3 ? 'C\u00edrculo' : (z.t === 1 ? 'L\u00ednea' : 'Marco'));
        const ico = (z.t === 3 ? 'zone' : (z.t === 1 ? 'route' : 'map'));
        const org = glocOrigen(z);
        return '<div class="gg-item" data-id="' + esc(z.id) + '"' +
            (alertas ? ' data-alerta="1" title="Tiene alerta de geocerca activa"' : '') + '>' +
            '<span class="gg-ptag"><span class="rondo-usym">' + UIS[ico] + '</span></span>' +
            '<div class="gg-in"><b>' + esc(z.n) +
            '<i class="gg-origen o-' + org.id + '" title="' + esc(org.largo) + '">' + org.corto + '</i>' +
            (org.id === 'app' && org.guardado ? '<i class="gg-lock" title="Se recuerda al cerrar el navegador"><span class="rondo-usym">' + UIS.check + '</span></i>' : '') +
            '</b>' +
            '<span>' + forma + ' \u00b7 ' + glocTextoTam(z) + '</span></div>' +
            (alertas ? '<i class="gg-tag-alerta" title="Alerta activa">ALERTA</i>' : '') +
            '<span class="gg-acc">' +
            '<button class="mini gg-ed" title="Editar en el mapa"><span class="rondo-usym">' + UIS.watch + '</span></button>' +
            '<button class="mini gg-cp" title="Copiar nombre y centro"><span class="rondo-usym">' + UIS.copy + '</span></button>' +
            '<button class="mini gg-al' + (alertas ? ' on' : '') + '" title="' + (alertas ? 'Ajustar su alerta' : 'Vigilar esta geocerca') + '"><span class="rondo-usym">' + UIS.alertas + '</span></button>' +
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
            e.capaPlat = cont.querySelector('.rondo-gg-plat');
            e.capaCtx = cont.querySelector('.rondo-gg-ctx');
            e.capa = cont.querySelector('.rondo-gg-capa');
            glocBindMapa(cont);
        }
    }
    const cuerpo = el.querySelector('.gg-lados');
    if (cuerpo) {
        setHtml(cuerpo,
            // ── Panel 1: la figura que se esta trazando ──────────────────
            '<div class="gg-lado">' +
            '<h4><span class="rondo-usym">' + UIS.watch + '</span>' +
            (e.editando ? 'Editando geocerca' : 'Nueva geocerca') +
            (e.id ? '<i class="gg-modo-tag">' + esc(glocModoTxt(e.modo)) + '</i>' : '') + '</h4>' +
            '<label class="gg-lab">Nombre' +
            '<input type="text" id="gg-nombre" maxlength="' + GEOLOC_NOMBRE_MAX + '" value="' + esc(e.nombre) + '" placeholder="Patio del cliente"></label>' +
            '<div class="gg-modos" role="group" aria-label="Tipo de figura">' +
            glocModoChip(e, 'poligono', 'Marco', 'map') +
            glocModoChip(e, 'circulo', 'C\u00edrculo', 'zone') +
            glocModoChip(e, 'linea', 'L\u00ednea', 'route') +
            '</div>' +
            '<div class="gg-stats" id="gg-res">' + glocStatsHTML() + '</div>' +
            '<label class="gg-lab">Centro (latitud, longitud)<span class="gg-two">' +
            '<input type="text" id="gg-lat" inputmode="decimal" placeholder="19.432600" value="' + (e.pts.length ? e.pts[0].lat.toFixed(6) : '') + '">' +
            '<input type="text" id="gg-lon" inputmode="decimal" placeholder="-99.133200" value="' + (e.pts.length ? e.pts[0].lon.toFixed(6) : '') + '">' +
            '<button type="button" class="mini gg-ir" id="gg-ir" title="Centrar el mapa en esas coordenadas">Ir</button>' +
            '</span></label>' +
            (e.modo === 'circulo'
                ? '<label class="gg-lab">Radio<span class="gg-unit"><input type="number" id="gg-radio" min="' + GEOLOC_MIN_RADIO + '" max="' + GEOLOC_MAX_RADIO + '" value="' + Math.round(e.radio) + '"><i>m</i></span></label>'
                : (e.modo === 'linea' ? '<label class="gg-lab">Ancho del trazo<span class="gg-unit"><input type="number" id="gg-ancho" min="' + GEOLOC_MIN_RADIO + '" max="' + GEOLOC_MAX_RADIO + '" value="' + Math.round(e.ancho) + '"><i>m</i></span></label>' : '')) +
            '<div class="gg-acciones">' +
            '<button type="button" class="mini" id="gg-undo" title="Quitar el ultimo punto"><span class="rondo-usym">' + UIS.menos + '</span> Deshacer</button>' +
            '<button type="button" class="mini" id="gg-limpiar" title="Empezar de cero"><span class="rondo-usym">' + UIS.clear + '</span> Limpiar</button>' +
            (e.modo === 'circulo' ? '' : '<button type="button" class="mini" id="gg-cerrar" title="Cerrar la figura (o doble clic en el mapa)">Cerrar figura</button>') +
            '</div>' +
            '<p class="gg-pista"><span class="rondo-usym">' + UIS.info + '</span>' + esc(glocPista(e.modo)) + '</p>' +
            '</div>' +
            // ── Panel 2: las geocercas de la app ─────────────────────────
            '<div class="gg-lado gg-lado-lista">' +
            '<h4><span class="rondo-usym">' + UIS.map + '</span>Geocercas' +
            '<i class="gg-count">' + glocLista().length + '</i></h4>' +
            '<div class="gg-filtro">' +
            glocFiltroChip('app', 'M\u00edas (app)', glocLista().length) +
            glocFiltroChip('plat', 'Plataforma', (APP.zonas || []).filter((x) => !glocEsApp(x)).length) +
            glocFiltroChip('todas', 'Todas', (APP.zonas || []).length) +
            '</div>' +
            '<div class="gg-lista">' + glocListaHTML() + '</div>' +
            '<div class="gg-sec">Importar / exportar</div>' +
            '<div class="gg-io">' +
            '<button type="button" class="mini" id="gg-exporta" title="Descargar un .json con tus geocercas"><span class="rondo-usym">' + UIS.export + '</span> Exportar</button>' +
            '<button type="button" class="mini" id="gg-exporta-geo" title="Descargar GeoJSON (abrible en cualquier visor)"><span class="rondo-usym">' + UIS.map + '</span> GeoJSON</button>' +
            '<button type="button" class="mini" id="gg-importa" title="Importar un .json o .geojson"><span class="rondo-usym">' + UIS.upload + '</span> Importar</button>' +
            '<button type="button" class="mini" id="gg-copiar" title="Copiar el JSON al portapapeles"><span class="rondo-usym">' + UIS.copy + '</span> Copiar</button>' +
            '<input type="file" id="gg-file" accept=".json,.geojson,.txt" hidden>' +
            '</div>' +
            '<label class="gg-check"><input type="checkbox" id="gg-recordar"' + (APP.config && APP.config.geolocalRecordar ? ' checked' : '') + '> ' +
            '<span><b>Recordar en este navegador</b><i>Sin esto se pierden al recargar la pagina</i></span></label>' +
            '</div>');
    }
    glocPintarBorrador();
    glocPintarContexto();
    glocPintarPlataforma();
    glocPintarHud();
    const ley = byId('gg-leyenda');
    if (ley) setHtml(ley, glocLeyendaHTML());
}
function glocModoTxt(modo) {
    return (modo === 'circulo') ? 'C\u00edrculo' : (modo === 'linea' ? 'L\u00ednea' : 'Marco');
}
function glocModoTxtPlano(modo) {
    return (modo === 'circulo') ? 'circulo' : (modo === 'linea' ? 'linea' : 'marco');
}
function glocFiltroChip(val, txt, n) {
    const v = APP.geoListaVista || 'app';
    return '<button type="button" class="gg-fchip' + (v === val ? ' activo' : '') + '" data-gg="lista" data-v="' + val + '" title="Mostrar ' + txt.toLowerCase() + '">' +
        esc(txt) + '<b>' + n + '</b></button>';
}
function glocModoChip(e, modo, txt, icono) {
    return '<button type="button" class="gg-chip' + (e.modo === modo ? ' activo' : '') + '" data-gg="modo" data-v="' + modo + '" title="Trazar un ' + glocModoTxtPlano(modo) + '">' +
        '<span class="rondo-usym">' + UIS[icono] + '</span>' + esc(txt) + '</button>';
}
// Tira de cifras del borrador: puntos, superficie y perimetro.
function glocStatsHTML() {
    const c = glocCifras();
    const celda = (lb, val, ok) => '<div class="gg-stat' + (ok ? ' ok' : '') + '"><b>' + esc(val) + '</b><span>' + lb + '</span></div>';
    const circ = (c.puntos.indexOf('circulo') >= 0);
    return celda('Puntos', c.puntos, c.n > 0) +
        celda(circ ? 'Radio' : 'Superficie', (circ ? (c.radio || '\u2014') : (c.superficie || '\u2014')), c.completo) +
        celda(circ ? 'Circunferencia' : 'Per\u00edmetro', c.perimetro || '\u2014', c.completo);
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
        // La leyenda y la chapa viven sobre el mapa: un clic ahi NO debe
        // anadir un punto a la figura.
        if (ev.target.closest && ev.target.closest('.gg-leyenda,.gg-hud')) return;
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
        if (ev.target.closest && ev.target.closest('.gg-leyenda,.gg-hud')) return;
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
        const lp = t.closest && t.closest('[data-gg="preview"]');
        if (lp) {
            APP.geoPreview = (lp.dataset.v === 'app' || lp.dataset.v === 'plat') ? lp.dataset.v : 'todas';
            glocPintarContexto();
            glocPintarPlataforma();
            const ley = byId('gg-leyenda');
            if (ley) setHtml(ley, glocLeyendaHTML());
            return;
        }
        const lf = t.closest && t.closest('[data-gg="lista"]');
        if (lf) {
            APP.geoListaVista = lf.dataset.v || 'app';
            glocRender();
            return;
        }
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
            if (res) setHtml(res, glocStatsHTML());
            return;
        }
        if (t.id === 'gg-ancho') {
            const n = Number(t.value);
            e.ancho = clamp(isFinite(n) ? n : 100, GEOLOC_MIN_RADIO, GEOLOC_MAX_RADIO);
            const res = byId('gg-res');
            if (res) setHtml(res, glocStatsHTML());
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
// Importar desde un archivo (o desde un texto pegado): primero se lee y se
// pasa por el dialogo de seleccion, para poder importar una sola o varias.
function glocImportarArchivo(file) {
    if (!file) return;
    const alTerminar = (txt) => glocAbrirImport(txt);
    try {
        file.text().then(alTerminar).catch(() => adviceWarn('No se pudo leer', file.name || 'el archivo'));
    } catch (_) {
        // Navegadores antiguos sin file.text(): FileReader.
        const fr = new FileReader();
        fr.onload = () => alTerminar(String(fr.result || ''));
        fr.onerror = () => adviceWarn('No se pudo leer', file.name || 'el archivo');
        fr.readAsText(file);
    }
}
// Dialogo de importacion: lista con casilla por geocerca, aviso de nombres
// que ya existen y botones para marcar todas o ninguna.
function glocAbrirImport(txt) {
    const r = glocParsea(txt);
    if (!r.lista.length) {
        adviceWarn('No se pudo importar', r.error || 'El archivo no trae geocercas utilizables');
        return;
    }
    const marcadas = r.lista.map((_, i) => i);
    const nativas = (APP.zonas || []).filter((x) => !glocEsApp(x));
    const mias = glocLista();
    // Nombre que tendra cada una si se importa (sufijo si choca).
    const nombres = r.lista.map((z, i) => ({
        i: i, z: z,
        libre: glocNombreLibre(z.n, nativas, mias.concat(r.lista.slice(0, i))),
        igual: (nativas.some((x) => glocLimpiaNom(x.n).toLowerCase() === z.n.toLowerCase()) ||
            mias.some((x) => glocLimpiaNom(x.n).toLowerCase() === z.n.toLowerCase()))
    }));
    const cuerpo = (sel) => {
        const html = nombres.map((it) => {
            const forma = (it.z.t === 3 ? 'C\u00edrculo ' + Math.round(it.z.w) + ' m' : (it.z.t === 1 ? 'L\u00ednea' : 'Marco'));
            return '<label class="gg-imp' + (sel.indexOf(it.i) >= 0 ? ' sel' : '') + '">' +
                '<input type="checkbox" data-gg-imp="' + it.i + '"' + (sel.indexOf(it.i) >= 0 ? ' checked' : '') + '>' +
                '<span class="nm">' + esc(it.libre) + (it.igual ? '<i class="gg-imp-dup" title="Ya existe una con ese nombre: se guardara con otro">' + UIS.info + '</i>' : '') + '</span>' +
                '<em>' + forma + ' \u00b7 ' + glocTextoTam(it.z) + '</em></label>';
        }).join('');
        return '<p class="gg-imp-t">' + (r.lista.length === 1
            ? 'El archivo trae <b>1 geocerca</b>. Se importara en Rondo (no va a la plataforma).'
            : 'El archivo trae <b>' + r.lista.length + ' geocercas</b>. Elige cuales importar.') +
            (r.ignoradas ? ' <span class="gg-imp-av">' + r.ignoradas + ' se descartaron por no ser validas.</span>' : '') +
            '</p><div class="gg-imp-l">' + html + '</div>' +
            '<div class="gg-imp-a"><button type="button" class="mini" data-gg-imp-a="todas">Todas</button>' +
            '<button type="button" class="mini" data-gg-imp-a="ninguna">Ninguna</button>' +
            '<span>' + (sel.length === r.lista.length ? 'Todas marcadas' : sel.length + ' de ' + r.lista.length) + '</span></div>';
    };
    abrirDialogo({
        icon: UIS.upload,
        titulo: 'Importar geocercas',
        ancho: 440,
        okText: 'Importar',
        html: '<div class="gg-impd" id="gg-impd">' + cuerpo(marcadas) + '</div>',
        onOpen: (el) => {
            const box = el.querySelector('#gg-impd');
            if (!box) return;
            const pinta = () => setHtml(box, cuerpo(marcadas));
            box.addEventListener('change', (ev) => {
                const t = ev.target;
                if (!t || !t.dataset || t.dataset.ggImp == null) return;
                const i = +t.dataset.ggImp;
                const k = marcadas.indexOf(i);
                if (t.checked && k < 0) marcadas.push(i);
                else if (!t.checked && k >= 0) marcadas.splice(k, 1);
                marcadas.sort((a, b) => a - b);
                pinta();
            });
            box.addEventListener('click', (ev) => {
                const b = ev.target.closest && ev.target.closest('[data-gg-imp-a]');
                if (!b || !box.contains(b)) return;
                marcadas.length = 0;
                if (b.dataset.ggImpA === 'todas') for (let i = 0; i < r.lista.length; i++) marcadas.push(i);
                pinta();
            });
        },
        onOk: () => {
            if (!marcadas.length) { adviceWarn('Nada que importar', 'Marca al menos una geocerca.'); return; }
            const res = glocImporta(txt, 'anadir', marcadas);
            adviceOk('Geocercas importadas', (res.nuevas || 0) + ' anadida(s) a las de la app');
            APP.geoListaVista = 'app';
            glocRender();
            if (APP.tab === 'zonas') { paintGeoAlertas(); paintGeocercas(); }
        }
    });
}