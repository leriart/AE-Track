/* ====================== INFORME POR GEOCERCA: NUCLEO ======================
 * Reportes por geocerca, en la misma linea que el reporte general y el del
 * Replay: aqui se responde "¿quien cruzo esta geocerca?" y "¿quien se paro
 * aqui?". Tres fuentes, porque no todas estan disponibles siempre:
 *
 *   bitacora - los avisos de la sesion (reglas geocerca, geocercaDetenido
 *              y geoAlerta). Siempre disponible, con hora exacta.
 *   viajes   - los viajes ya analizados por unidad (APP.viajes): paradas
 *              con duracion y cruces deducidos de la traza.
 *   replay   - el recorrido cargado en la pestana Replay: eventos con hora
 *              y paradas con motor y lugar.
 *
 * El nucleo de este fragmento es puro (solo arrays que le pasamos) para
 * poder probarlo aislado en tests/informe-geocerca.test.js.
 */
const RX_GEO_FUENTES = Object.freeze(['historial', 'rastreo', 'bitacora', 'viajes', 'replay']);
// Limites del escaneo del historial de la plataforma (una peticion por
// unidad, como hace el Replay). Con flotas enormes se acota para que el
// informe no tarde una eternidad.
const RX_GEO_HIST_MAX_U = 150;
const RX_GEO_HIST_MSGS = 3000;
// Peticiones simultaneas al escanear el historial. En serie, 150 unidades
// tardan una eternidad; con un pool de 6 va varias veces mas rapido sin
// castigar al servidor de la plataforma.
const RX_GEO_HIST_CONC = 6;
// Minutos quieto para que una parada de la traza cuente. Es menor que el
// umbral del Replay porque aqui la traza se toma en vivo, con puntos cada
// pocos segundos: esperar 15 min seria exigir demasiado.
const RX_GEO_PARADA_MIN = 2;
const RX_GEO_RANGOS = Object.freeze(['hoy', '24h', '7d', '15d', '30d', 'todo']);
const RX_GEO_TIPOS = Object.freeze({
    entra: 'Entrada',
    sale: 'Salida',
    detenida: 'Parada',
    motor: 'Parada con motor apagado',
    parada: 'Parada',
    dentro: 'Dentro ahora'
});
// ── Bitacora: un aviso -> evento con geocerca, tipo y minutos ───────────
// Si el aviso no trae el campo zona (los anteriores a esta version) se lo
// saca del texto, que era el unico sitio donde estaba.
function rxGeoInfZonaTexto(txt, prefijo) {
    const t = String(txt == null ? '' : txt);
    if (!t) return '';
    let resto = '';
    if (prefijo) {
        const i = t.toLowerCase().indexOf(String(prefijo).toLowerCase());
        if (i < 0) return '';
        resto = t.slice(i + String(prefijo).length);
    } else resto = t;
    const partes = resto.split(' \u00b7 ').map((x) => x.trim()).filter(Boolean);
    if (!partes.length) return '';
    // Con prefijo ("entro a X") la zona es lo que sigue; sin prefijo el
    // titulo es "TITULO \u00b7 zona \u00b7 eco", o sea el penultimo trocito.
    if (prefijo) return partes[0] || '';
    return (partes.length >= 2) ? (partes[partes.length - 2] || '') : '';
}
// Ultimo recurso: buscar la geocerca con una expresion, tolerando textos
// que no sean exactamente los de las reglas (avisos viejos o editados).
function rxGeoInfZonaRegex(txt, re) {
    const m = String(txt == null ? '' : txt).match(re);
    return m ? String(m[1]).trim() : '';
}
function rxGeoInfMinutos(txt) {
    const m = String(txt == null ? '' : txt).match(/(\d+)\s*min/i);
    return m ? +m[1] : 0;
}
function rxGeoInfEvento(a) {
    if (!a || !a.ts) return null;
    const regla = String(a.regla || '');
    const titulo = String(a.titulo || '');
    const detalle = String(a.detalle || '');
    let zona = String(a.zona || '');
    let tipo = '';
    if (regla === 'geocerca') {
        tipo = (/salio de/i.test(detalle) || /^SALIO/.test(titulo)) ? 'sale' : 'entra';
        if (!zona) zona = rxGeoInfZonaTexto(detalle, tipo === 'sale' ? 'salio de ' : 'entro a ');
        if (!zona) zona = rxGeoInfZonaRegex(detalle, /(?:entra|entro|entró|sale|salió)\s+a\s+([^·]+)/i);
    } else if (regla === 'geocercaDetenido') {
        tipo = 'detenida';
        if (!zona) zona = rxGeoInfZonaTexto(detalle, 'se encuentra detenida en la geocerca ');
        if (!zona) zona = rxGeoInfZonaRegex(detalle, /geocerca\s+([^·]+)/i);
    } else if (regla === 'geoAlerta') {
        tipo = /MOTOR APAGADO/i.test(titulo) ? 'motor' : (/DETENIDA/i.test(titulo) ? 'detenida' : 'entra');
        if (!zona) zona = rxGeoInfZonaTexto(titulo, '');
    } else {
        return null;
    }
    if (!zona) return null;
    return {
        zona: zona, tipo: tipo, eco: a.eco || '', clave: a.clave || '',
        ts: a.ts, sev: a.sev || 'bajo', lat: a.lat, lon: a.lon,
        titulo: titulo, detalle: detalle,
        min: rxGeoInfMinutos(detalle), fuente: 'bitacora'
    };
}
// Una parada de un viaje o del replay -> evento. La duracion viene en
// segundos (replay) o en minutos (APP.viajes.durMin).
function rxGeoInfParada(p, zona, eco, fuente) {
    if (!p || p.lat == null || p.lon == null) return null;
    const seg = (p.dur != null) ? +p.dur : ((p.durMin != null) ? (+p.durMin) * 60 : 0);
    return {
        zona: zona, tipo: (p.motor === 'off') ? 'motor' : 'detenida',
        eco: eco || '', ts: (+p.t || +p.desde || 0),
        lat: p.lat, lon: p.lon, min: Math.round(seg / 60),
        motor: p.motor || '', motorFuente: p.motorFuente || '',
        lugar: p.lugar || '', chofer: p.chofer || '',
        titulo: 'Parada', detalle: '',
        fuente: fuente || 'viajes'
    };
}
// Filtra por geocerca (vacia = todas) y por rango de fechas. El rango son
// dos marcas: inicio (desdeMs) y fin (hastaMs, inclusive).
function rxGeoInfFiltra(eventos, zona, desdeMs, hastaMs) {
    const out = [];
    for (const e of (eventos || [])) {
        if (!e) continue;
        if (zona && e.zona !== zona) continue;
        if (desdeMs && e.ts && e.ts < desdeMs) continue;
        if (hastaMs && e.ts && e.ts > hastaMs) continue;
        out.push(e);
    }
    return out;
}
// Una fecha del selector (yyyy-mm-dd) a milisegundos. Con `fin` cubre el
// dia entero (23:59:59.999), para que "hasta el dia X" incluya ese dia.
function rxGeoInfFechaMs(s, fin) {
    if (!s) return 0;
    const d = new Date(String(s) + 'T00:00:00');
    if (!isFinite(d.getTime())) return 0;
    if (fin) d.setHours(23, 59, 59, 999);
    return d.getTime();
}
function rxGeoInfFechaTxt(ms) {
    if (!ms) return '';
    const d = new Date(ms);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return dd + '/' + mm + '/' + d.getFullYear();
}
// Milisegundos de inicio del rango elegido ('hoy' = desde las 00:00).
function rxGeoInfDesde(rango, ahora) {
    const n = ahora || Date.now();
    if (rango === 'hoy') { const d = new Date(n); d.setHours(0, 0, 0, 0); return d.getTime(); }
    if (rango === '24h') return n - 24 * 3600 * 1000;
    if (rango === '7d') return n - 7 * 24 * 3600 * 1000;
    if (rango === '15d') return n - 15 * 24 * 3600 * 1000;
    if (rango === '30d') return n - 30 * 24 * 3600 * 1000;
    return 0;
}
// Agrega los eventos por unidad. modo 'cruces' ordena por cruces,
// 'paradas' por paradas y minutos.
function rxGeoInfAgrupa(eventos, modo) {
    const porParadas = (modo === 'paradas');
    const por = {};
    for (const e of (eventos || [])) {
        const clave = e.eco || e.clave || '(sin eco)';
        let f = por[clave];
        if (!f) {
            f = por[clave] = {
                eco: clave, cruces: 0, entradas: 0, salidas: 0, paradas: 0, dentro: 0,
                min: 0, minMotor: 0, motor: 0, primero: 0, ultimo: 0,
                lugares: {}, zonas: {}, choferes: {}
            };
        }
        if (e.tipo === 'entra' || e.tipo === 'sale') {
            f.cruces++;
            if (e.tipo === 'entra') f.entradas++; else f.salidas++;
        } else if (e.tipo === 'dentro') {
            f.dentro++;
        } else {
            f.paradas++;
            f.min += (+e.min || 0);
            if (e.tipo === 'motor' || e.motor === 'off') { f.motor++; f.minMotor += (+e.min || 0); }
        }
        if (e.chofer) f.choferes[e.chofer] = (f.choferes[e.chofer] || 0) + 1;
        if (e.zona) f.zonas[e.zona] = (f.zonas[e.zona] || 0) + 1;
        if (e.lugar) f.lugares[e.lugar] = (f.lugares[e.lugar] || 0) + 1;
        if (e.ts) {
            if (!f.primero || e.ts < f.primero) f.primero = e.ts;
            if (e.ts > f.ultimo) f.ultimo = e.ts;
        }
    }
    const filas = Object.keys(por).map((k) => por[k]);
    filas.sort((a, b) => (porParadas
        ? ((b.paradas - a.paradas) || (b.min - a.min))
        : ((b.cruces - a.cruces) || (b.min - a.min))) || a.eco.localeCompare(b.eco, 'es'));
    const total = {
        unidades: filas.length,
        cruces: filas.reduce((s, f) => s + f.cruces, 0),
        entradas: filas.reduce((s, f) => s + f.entradas, 0),
        salidas: filas.reduce((s, f) => s + f.salidas, 0),
        paradas: filas.reduce((s, f) => s + f.paradas, 0),
        dentro: filas.reduce((s, f) => s + f.dentro, 0),
        min: filas.reduce((s, f) => s + f.min, 0),
        motor: filas.reduce((s, f) => s + f.motor, 0),
        primera: filas.reduce((m, f) => ((f.primero && (!m || f.primero < m)) ? f.primero : m), 0),
        ultima: filas.reduce((m, f) => (f.ultimo > m ? f.ultimo : m), 0)
    };
    return { filas: filas, total: total };
}
// Resumen por geocerca: ordena el selector del dialogo y da la segunda
// tabla del PDF ("cuanto se cruzo cada geocerca").
function rxGeoInfPorZona(eventos, orden) {
    const por = {};
    for (const e of (eventos || [])) {
        const z = e.zona || '(sin geocerca)';
        let f = por[z];
        if (!f) f = por[z] = { zona: z, cruces: 0, paradas: 0, min: 0, unidades: {}, eventos: 0 };
        f.eventos++;
        if (e.tipo === 'entra' || e.tipo === 'sale') f.cruces++;
        else { f.paradas++; f.min += (+e.min || 0); }
        if (e.eco) f.unidades[e.eco] = 1;
    }
    let filas = Object.keys(por).map((k) => por[k]);
    if (Array.isArray(orden) && orden.length) {
        const pos = {};
        orden.forEach((z, i) => { pos[z] = i; });
        filas.sort((a, b) => ((pos[a.zona] == null ? 1e6 : pos[a.zona]) - (pos[b.zona] == null ? 1e6 : pos[b.zona])) || (b.cruces - a.cruces));
    } else {
        filas.sort((a, b) => (b.cruces - a.cruces) || (b.paradas - a.paradas) || a.zona.localeCompare(b.zona, 'es'));
    }
    for (const f of filas) f.nUnidades = Object.keys(f.unidades).length;
    return filas;
}
// Version plana de una fila (un solo sitio para CSV, Markdown y PDF).
function rxGeoInfCeldas(f) {
    const zonas = Object.keys(f.zonas || {});
    const lugares = Object.keys(f.lugares || {});
    const choferes = Object.keys(f.choferes || {});
    return {
        eco: f.eco, cruces: f.cruces, entradas: f.entradas, salidas: f.salidas,
        paradas: f.paradas, dentro: f.dentro, min: f.min, motor: f.motor, minMotor: f.minMotor,
        primero: f.primero, ultimo: f.ultimo,
        chofer: choferes.join(' | '),
        zonas: zonas.join(' | '),
        lugares: lugares.slice(0, 4).join(' | ')
    };
}
// Transiciones fuera->dentro sobre una lista de puntos [lon, lat, tsMs].
// Es el detector de cruces que usan tanto la traza de un viaje
// ([[lon, lat]]) como los mensajes del replay ([lon, lat, t * 1000]): el
// unico formato comun entre las dos fuentes.
function rxGeoInfCruces(puntos, dentroDe, base) {
    const o = base || {};
    const out = [];
    let previa = '';
    for (let i = 0; i < (puntos || []).length; i++) {
        const q = puntos[i];
        if (!q || q.length < 2) continue;
        const ahora = dentroDe(+q[1], +q[0]) || '';
        if (ahora === previa) continue;
        const crudo = (q.length > 2) ? +q[2] : 0;
        out.push({
            zona: ahora || previa,
            tipo: ahora ? 'entra' : 'sale',
            eco: o.eco || '',
            // El tercer valor del punto es la marca en MILISEGUNDOS (el
            // que ya usan el historial y los avisos).
            ts: (q.length > 2 && crudo) ? crudo : 0,
            sev: 'bajo', lat: +q[1], lon: +q[0],
            titulo: ahora ? ('Entra a ' + ahora) : ('Sale de ' + previa),
            detalle: '', min: 0, fuente: o.fuente || ''
        });
        previa = ahora;
    }
    return out;
}

function rxGeoInfCabeceras(modo) {
    return (modo === 'paradas')
        ? ['Eco', 'Chofer', 'Paradas', 'Min quieto', 'Min motor apagado', 'Paradas con motor', 'Dentro ahora', 'Geocercas', 'Primera', 'Ultima']
        : ['Eco', 'Chofer', 'Cruces', 'Entradas', 'Salidas', 'Paradas', 'Min quieto', 'Dentro ahora', 'Geocercas', 'Primera', 'Ultima'];
}
// Celdas ya en HTML (para la tabla del PDF y la vista previa).
function rxGeoInfCeldasHTML(c, modo) {
    const t = (ms) => (ms ? esc(rxFechaHora(ms)) : '-');
    const dn = (c.dentro ? 'Si' : '-');
    if (modo === 'paradas') {
        return [esc(c.eco), esc(c.chofer || '-'), String(c.paradas), String(c.min), String(c.minMotor),
            String(c.motor), dn, esc(c.zonas || '-'), t(c.primero), t(c.ultimo)];
    }
    return [esc(c.eco), esc(c.chofer || '-'), String(c.cruces), String(c.entradas), String(c.salidas),
        String(c.paradas), String(c.min), dn, esc(c.zonas || '-'), t(c.primero), t(c.ultimo)];
}
// Filas planas (sin HTML) para CSV y Markdown.
function rxGeoInfCeldasPlanas(c, modo) {
    const t = (ms) => (ms ? rxFechaHora(ms) : '-');
    const dn = (c.dentro ? 'Si' : '-');
    if (modo === 'paradas') {
        return [c.eco, (c.chofer || '-'), String(c.paradas), String(c.min), String(c.minMotor),
            String(c.motor), dn, (c.zonas || '-'), t(c.primero), t(c.ultimo)];
    }
    return [c.eco, (c.chofer || '-'), String(c.cruces), String(c.entradas), String(c.salidas),
        String(c.paradas), String(c.min), dn, (c.zonas || '-'), t(c.primero), t(c.ultimo)];
}
/* ====================== INFORME POR GEOCERCA: FUENTES ====================== */
// Estado de la consulta (fuente, periodo, geocerca, modo y alcance del
// rastreo). Vive aqui, con los lectores, porque el alcance tambien cambia
// lo que devuelve el rastreo.
const RX_GEO = {
    fuente: 'bitacora', rango: 'hoy', modo: 'cruces', zona: '',
    desde: '', hasta: '', busca: '',
    // Deteccion de parada (configurable desde el dialogo):
    //   pMin    - minutos minimos quieto para contar como parada
    //   pVel    - km/h por debajo de los cuales la unidad esta "quieta"
    //   pMargen - metros de margen alrededor del borde de la geocerca, para
    //             captar la unidad que se detuvo JUSTO en el limite (los
    //             puntos de la traza caen a un lado u otro por el jitter GPS)
    pMin: 2, pVel: 3, pMargen: 60,
    // Resultados: se calculan al pulsar "Generar reporte" (y al abrir, si la
    // fuente no consulta la plataforma). Cualquier cambio los deja pendientes.
    listo: false,
    // 'todas' (toda la flota con traza) o 'sel' (solo la lista vigilada).
    unidades: 'todas'
};
function rxGeoInfNombre(z) {
    return (z && (z.n || z.nombre)) || (z ? ('Zona ' + z.id) : '');
}
// Pertenencia con margen de borde: los puntos de una traza simplificada
// pueden caer justo en el limite de la geocerca.
function rxGeoInfEnZona(lat, lon, z) {
    if (!z || lat == null || lon == null) return false;
    try {
        // Margen configurable: la parada "justo en el borde" cuenta.
        if (typeof geoAlertaDentro === 'function') return geoAlertaDentro(z, lat, lon, rxGeoInfParam('pMargen', 60, 0, 2000));
        return !!inZone(lat, lon, z);
    } catch (_) { return false; }
}
// Valor numerico de un parametro del informe, acotado y con valor por defecto.
function rxGeoInfParam(clave, def, min, max) {
    const n = Number(RX_GEO[clave]);
    const v = (Number.isFinite(n) && n >= 0) ? n : def;
    return Math.min(max, Math.max(min, v));
}
// Geocerca dentro del margen de borde: prueba la elegida (rapido) o todas.
// Solo se usa al cerrar una parada, no por punto, asi que no pesa.
function rxGeoInfZonaCerca(lat, lon, margen) {
    if (lat == null || lon == null) return '';
    const dentro = (z) => {
        if (!z || typeof geoAlertaDentro !== 'function') return false;
        try { return geoAlertaDentro(z, lat, lon, margen); } catch (_) { return false; }
    };
    if (RX_GEO.zona) {
        const z = rxGeoInfZonaSel();
        return dentro(z) ? rxGeoInfNombre(z) : '';
    }
    for (const z of (APP.zonas || [])) {
        if (dentro(z)) return rxGeoInfNombre(z);
    }
    return '';
}
// Chofer asignado a la unidad. Se saca de los campos personalizados (los
// mismos que lee la IA: "conductor", "chofer", "driver"...) o de un campo
// directo. Se cachea por unidad para no repetir la consulta.
const RX_GEO_CHOFER_RE = /conductor|chofer|driver|piloto|operador|empleado/i;
const RX_GEO_CHOFER_VACIO = /^(sin(\s.*)?|n\/?a|ninguno|no asignado|-+)$/i;
function rxGeoInfChofer(o) {
    if (!o || typeof o !== 'object') return '';
    const flds = o.flds || o.campos || o.props || null;
    if (flds && typeof flds === 'object') {
        for (const k of Object.keys(flds)) {
            if (!RX_GEO_CHOFER_RE.test(norm(k))) continue;
            const v = flds[k];
            const s = (v && typeof v === 'object') ? (v.v != null ? v.v : v.n) : v;
            const t = String(s == null ? '' : s).trim();
            if (t && !RX_GEO_CHOFER_VACIO.test(t)) return t;
        }
    }
    const d = o.chofer || o.driver || o.conductor || o.piloto;
    const td = String(d == null ? '' : (d && typeof d === 'object' ? (d.n || d.nombre || d.v) : d)).trim();
    return (td && !RX_GEO_CHOFER_VACIO.test(td)) ? td : '';
}
const _rxGeoChofer = {}; // clave -> nombre (o '' si se sabe que no tiene)
function rxGeoInfChoferDe(clave, o) {
    if (o) {
        const c = rxGeoInfChofer(o);
        if (c) { _rxGeoChofer[clave] = c; return c; }
    }
    return _rxGeoChofer[clave] || '';
}
function rxGeoInfChoferReset() {
    Object.keys(_rxGeoChofer).forEach((k) => delete _rxGeoChofer[k]);
}
// Detector de paradas UNICO (traza de viaje, rastreo o historial crudo). Se
// agrupan los puntos consecutivos "quietos" (velocidad <= pVel) y, al
// cerrar, la zona se resuelve por: algun punto dentro, el centro del grupo
// dentro, o el grupo dentro del MARGEN de borde. Asi se detecta la parada
// que cae exactamente sobre el limite de la geocerca.
function rxGeoInfParadasDePuntos(arr, eco, fuente, chofer) {
    const out = [];
    if (!arr || arr.length < 2) return out;
    const minSeg = Math.max(30, rxGeoInfParam('pMin', 2, 0.5, 240) * 60);
    const vel = rxGeoInfParam('pVel', 3, 0, 80);
    const margen = rxGeoInfParam('pMargen', 60, 0, 2000);
    let desde = 0, ultimo = 0, zona = '', slat = 0, slon = 0, n = 0;
    const cerrar = () => {
        if (desde && zona && (ultimo - desde) >= minSeg * 1000) {
            const clat = n ? (slat / n) : null, clon = n ? (slon / n) : null;
            out.push({
                zona: zona, tipo: 'detenida', eco: eco, ts: desde,
                lat: clat, lon: clon, min: Math.round((ultimo - desde) / 60000),
                motor: '', motorFuente: '', lugar: '', chofer: chofer || '',
                centro: (clat != null ? { lat: clat, lon: clon } : null),
                titulo: 'Parada', detalle: '', fuente: fuente || 'historial'
            });
        }
        desde = 0; ultimo = 0; zona = ''; slat = 0; slon = 0; n = 0;
    };
    for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        const quieta = p && p.lat != null && p.lon != null && (p.s == null || +p.s <= vel);
        if (!quieta) { cerrar(); continue; }
        if (!desde) desde = p.t * 1000;
        ultimo = p.t * 1000;
        slat += p.lat; slon += p.lon; n++;
        let nom = rxGeoInfZonaDe(p.lat, p.lon);
        if (!nom) nom = rxGeoInfZonaCerca(p.lat, p.lon, margen);
        if (nom) zona = nom;
    }
    cerrar();
    return out;
}
// La geocerca elegida, con la geometria ya normalizada (si venia como
// texto JSON se parsea UNA vez, no en cada punto como hace inZone). Se
// memoiza para no volver a buscarla en cada llamada.
let _rxGeoZonaSel = { nombre: '\u0000', z: null };
function rxGeoInfZonaSel() {
    const nombre = RX_GEO.zona || '';
    if (_rxGeoZonaSel.nombre === nombre) return _rxGeoZonaSel.z;
    let z = null;
    if (nombre) {
        z = (APP.zonas || []).find((x) => rxGeoInfNombre(x) === nombre) || null;
        if (z) {
            // Copia con los puntos ya en array: evita un JSON.parse por
            // cada punto consultado.
            let p = z.p;
            if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) { p = null; } }
            z = Object.assign({}, z, { p: Array.isArray(p) ? p : null });
        }
    }
    _rxGeoZonaSel = { nombre: nombre, z: z };
    return z;
}
// Nombre de la geocerca que contiene el punto. Es el punto caliente del
// informe: se llama una vez por cada punto de cada traza.
//
// Truco de rendimiento: si el operador eligio UNA geocerca (el caso normal)
// solo se prueba esa (O(1)); si pide todas, se usa el indice espacial de
// Rondo (zoneAt, celdas de ~2 km) en vez de recorrer las 1765 geocercas en
// cada punto. Solo si no hubiera indice se cae al recorrido lineal.
function rxGeoInfZonaDe(lat, lon) {
    if (lat == null || lon == null) return '';
    if (RX_GEO.zona) {
        const z = rxGeoInfZonaSel();
        return (z && rxGeoInfEnZona(lat, lon, z)) ? rxGeoInfNombre(z) : '';
    }
    try {
        if (typeof zoneAt === 'function' && APP.config && APP.config.loadZones) return zoneAt(lat, lon) || '';
    } catch (_) { /* noop */ }
    for (const z of (APP.zonas || [])) {
        if (rxGeoInfEnZona(lat, lon, z)) return rxGeoInfNombre(z);
    }
    return '';
}
// Eventos desde la bitacora de avisos de la sesion.
function rxGeoInfDeBitacora() {
    const out = [];
    for (const a of (APP.historial || [])) {
        const e = rxGeoInfEvento(a);
        if (e) out.push(e);
    }
    return out;
}
// Rastreo: recorre la traza que Rondo ya viene guardando de cada unidad
// (una muestra cada vez que se mueve >=20 m, hasta trazadoMax) y saca los
// cruces y las paradas dentro de las geocercas. Es la fuente que mira a
// TODAS las unidades, hayan avisado o no. Ademas anade quien esta dentro
// ahora mismo, con la posicion del ultimo reporte.
function rxGeoInfSoloSel() {
    return RX_GEO.unidades === 'sel';
}
function rxGeoInfEnSeleccion(clave, info) {
    if (!rxGeoInfSoloSel()) return true;
    const sel = APP.seleccion;
    if (!sel || !sel.size) return false;
    try {
        if (sel.has(clave)) return true;
        if (info && (sel.has(info.eco) || sel.has(info.placa) || sel.has(String(info.id)))) return true;
    } catch (_) { /* noop */ }
    return false;
}
function rxGeoInfDeRastreo() {
    const out = [];
    // 1) Trazas: cruces y paradas de cada unidad vigilada.
    const trazas = APP.trazas || {};
    for (const k of Object.keys(trazas)) {
        const arr = trazas[k] || [];
        if (arr.length < 2) continue;
        if (!rxGeoInfEnSeleccion(k, null)) continue;
        const pts = arr.map((p) => [p.lon, p.lat, (p.t || 0) * 1000]);
        const chofer = rxGeoInfChoferDe(k, null);
        const cruces = rxGeoInfCruces(pts, rxGeoInfZonaDe, { eco: k, fuente: 'rastreo' });
        for (const e of cruces) e.chofer = chofer;
        out.push.apply(out, cruces);
        // Paradas con el detector unico (velocidad/pMin/margen configurables).
        out.push.apply(out, rxGeoInfParadasDePuntos(
            arr.map((p) => ({ t: p.t, lat: p.lat, lon: p.lon, s: p.v })), k, 'rastreo', chofer));
    }
    // 2) Quien esta dentro de una geocerca AHORA (toda la flota que reporta).
    const ahora = Date.now();
    for (const u of (APP.unidades || [])) {
        let info = null, st = null;
        try { info = parseUnitName(u); st = unitState(u); } catch (_) { continue; }
        if (!info || st.lat == null) continue;
        const clave = info.eco || info.placa || String(info.id);
        if (!rxGeoInfEnSeleccion(clave, info)) continue;
        const zona = rxGeoInfZonaDe(st.lat, st.lon);
        if (!zona) continue;
        out.push({
            zona: zona, tipo: 'dentro', eco: info.eco || clave, ts: ahora,
            lat: st.lat, lon: st.lon, min: 0, motor: '', motorFuente: '', lugar: '',
            vel: Math.round(st.vel || 0), online: !!st.online,
            titulo: 'Dentro ahora', detalle: (st.online ? '' : 'sin senal reciente'), fuente: 'rastreo'
        });
    }
    return out;
}
// Eventos desde los viajes analizados (APP.viajes).
function rxGeoInfDeViajes() {
    const out = [];
    for (const eco of Object.keys(APP.viajes || {})) {
        const v = APP.viajes[eco] || {};
        for (const p of (v.paradas || [])) {
            if (p.lat == null || p.lon == null) continue;
            const zona = p.zona || rxGeoInfZonaDe(p.lat, p.lon);
            if (!zona) continue;
            const ev = rxGeoInfParada(p, zona, eco, 'viajes');
            if (ev) { ev.chofer = ev.chofer || rxGeoInfChoferDe(eco, null); out.push(ev); }
        }
        if (v.traza && v.traza.length > 1) {
            const cr = rxGeoInfCruces(v.traza, rxGeoInfZonaDe, { eco: eco, fuente: 'viajes' });
            const ch = rxGeoInfChoferDe(eco, null);
            for (const e of cr) e.chofer = ch;
            out.push.apply(out, cr);
        }
    }
    return out;
}
// Deteccion de cruces y paradas sobre los mensajes CRUDOS de la plataforma
// (formato { t (s), pos:{x,y,s} }), el mismo que devuelve load_interval y el
// que usa el Replay. Es pura para poder probarla sin red.
function rxGeoInfDeMensajes(msgs, eco, fuente, chofer) {
    const arr = [];
    for (const m of (msgs || [])) {
        if (!m || !m.pos || !isFinite(+m.pos.y) || !isFinite(+m.pos.x)) continue;
        const t = Number(m.t) || 0;
        if (!t) continue;
        arr.push({ t: t, lat: +m.pos.y, lon: +m.pos.x, s: Number(m.pos.s) || 0 });
    }
    if (!arr.length) return [];
    arr.sort((a, b) => a.t - b.t);
    const pts = arr.map((p) => [p.lon, p.lat, p.t * 1000]);
    const out = rxGeoInfCruces(pts, rxGeoInfZonaDe, { eco: eco, fuente: fuente || 'historial' });
    for (const e of out) e.chofer = chofer || '';
    out.push.apply(out, rxGeoInfParadasDePuntos(arr, eco, fuente || 'historial', chofer));
    return out;
}
// Eventos del recorrido cargado en la pestana Replay.
function rxGeoInfDeReplay() {
    const r = (typeof RX_REPLAY !== 'undefined') ? RX_REPLAY : null;
    if (!r || !r.msgs || !r.msgs.length) return [];
    const eco = r.eco || (r.info ? r.info.eco : '');
    const pts = r.msgs.map((m) => [m.lon, m.lat, (m.t || 0) * 1000]);
    const out = rxGeoInfCruces(pts, rxGeoInfZonaDe, { eco: eco, fuente: 'replay' });
    const ch = rxGeoInfChoferDe(eco, null);
    for (const e of out) e.chofer = ch;
    for (const p of (r.paradas || [])) {
        const zona = p.zona || rxGeoInfZonaDe(p.lat, p.lon);
        if (!zona) continue;
        const ev = rxGeoInfParada(p, zona, eco, 'replay');
        if (!ev) continue;
        ev.ts = (+p.t || 0) * 1000;
        ev.lugar = p.lugar || '';
        ev.chofer = ev.chofer || ch;
        out.push(ev);
    }
    return out;
}
// ── Fuente historial: una peticion por unidad, como el Replay ──────────
// Resultado del ultimo escaneo (clave -> eventos). El dialogo lo rellena de
// forma asincrona y `rxGeoInfDeHistorial` (sync) lo lee para el resto del
// informe.
let _rxGeoHist = { key: '', t: 0, eventos: [], truncado: false, unidades: 0 };
function rxGeoInfHistKey() {
    return (RX_GEO.zona || '*') + '|' + (RX_GEO.desde || RX_GEO.rango) + '|' + (RX_GEO.hasta || '') + '|' +
        (RX_GEO.unidades || 'todas') + '|' + rxGeoInfParam('pMin', 2, 0.5, 240) + '|' +
        rxGeoInfParam('pVel', 3, 0, 80) + '|' + rxGeoInfParam('pMargen', 60, 0, 2000);
}
function rxGeoInfDeHistorial() {
    if (_rxGeoHist.key !== rxGeoInfHistKey()) return [];
    return _rxGeoHist.eventos;
}
// Rango en segundos (el que espera load_interval). Sin rango explicito se
// toman las ultimas 24 h; "Todo" se acota a 7 dias para no barrer años.
function rxGeoInfRangoS() {
    const ahora = Math.floor(Date.now() / 1000);
    let d = RX_GEO.desde ? Math.floor(rxGeoInfFechaMs(RX_GEO.desde, false) / 1000) : Math.floor(rxGeoInfDesde(RX_GEO.rango) / 1000);
    let h = RX_GEO.hasta ? Math.floor(rxGeoInfFechaMs(RX_GEO.hasta, true) / 1000) : ahora;
    if (!d) d = ahora - 7 * 24 * 3600;
    if (!h || h > ahora) h = ahora;
    return { desde: d, hasta: h };
}
// Escanea el historial de la flota. `onProg(hechas, total, eco)` actualiza la
// barra; `token` permite cancelar (al cerrar el dialogo o cambiar opciones).
async function rxGeoInfEscanear(onProg, token) {
    const cfg = { desde: RX_GEO.desde, hasta: RX_GEO.hasta, rango: RX_GEO.rango, zona: RX_GEO.zona, unidades: RX_GEO.unidades };
    const key = rxGeoInfHistKey();
    const ya = (_rxGeoHist.key === key && (Date.now() - _rxGeoHist.t) < 120000);
    if (ya) return _rxGeoHist;
    const rango = rxGeoInfRangoS();
    const lista = [];
    const sel = APP.seleccion;
    for (const u of (APP.unidades || [])) {
        let info = null;
        try { info = parseUnitName(u); } catch (_) { continue; }
        if (!info || u.id == null) continue;
        const clave = info.eco || info.placa || String(info.id);
        if (RX_GEO.unidades === 'sel' && !(sel && (sel.has(clave) || sel.has(info.eco)))) continue;
        lista.push({ u: u, info: info, clave: clave, t: (() => { try { return unitState(u).t || 0; } catch (_) { return 0; } })() });
        if (lista.length >= RX_GEO_HIST_MAX_U) break;
    }
    // Ordena por interes: las de la lista vigilada primero y, dentro de
    // cada grupo, las que reportaron mas reciente. Asi los resultados
    // utiles salen en los primeros segundos aunque el barrido siga.
    lista.sort((a, b) => {
        const wa = (sel && sel.has(a.clave)) ? 0 : 1;
        const wb = (sel && sel.has(b.clave)) ? 0 : 1;
        if (wa !== wb) return wa - wb;
        return (b.t || 0) - (a.t || 0);
    });
    const encontrados = [];
    const total = lista.length;
    let hechas = 0, idx = 0;
    // Pool de peticiones en paralelo: cada obrero toma la siguiente unidad
    // libre hasta agotarlas. Es la diferencia entre minutos y segundos.
    const obreros = Math.max(1, Math.min(RX_GEO_HIST_CONC, total || 1));
    const obrero = async () => {
        while (idx < total) {
            if (token && token.cancelado) return;
            const it = lista[idx++];
            try {
                const r = await remoteCall('messages/load_interval', {
                    itemId: it.u.id, timeFrom: rango.desde, timeTo: rango.hasta,
                    flags: 1, flagsMask: 1, loadCount: RX_GEO_HIST_MSGS
                });
                const evs = rxGeoInfDeMensajes((r && r.messages) || [], it.info.eco || it.clave, 'historial');
                // Chofer: si la unidad ya trae el campo personalizado se usa
                // directo; si hubo eventos y no lo trae, se consulta por API
                // (una peticion, cacheada 30 min) y se anota por unidad/dia.
                let ch = rxGeoInfChofer(it.u) || _rxGeoChofer[it.clave] || '';
                if (!ch && evs.length && typeof iaFetchUnidadProps === 'function') {
                    try { ch = rxGeoInfChofer(await iaFetchUnidadProps(it.u.id, it.info.nombre)); } catch (_) { /* noop */ }
                }
                if (ch) {
                    _rxGeoChofer[it.clave] = ch;
                    for (const e of evs) e.chofer = ch;
                }
                for (const e of evs) encontrados.push(e);
            } catch (_) { /* unidad sin historial o sin permiso: se salta */ }
            hechas++;
            // La barra muestra el avance y cuantos eventos van saliendo.
            if (onProg) onProg(hechas, total, it.info.eco || it.clave, encontrados.length);
            // Cede el hilo para que la interfaz y el mapa se refresquen.
            await rxGeoInfYield();
        }
    };
    const tareas = [];
    for (let k = 0; k < obreros; k++) tareas.push(obrero());
    await Promise.all(tareas);
    if (token && token.cancelado) return { eventos: [], truncado: false, unidades: 0, cancelado: true };
    _rxGeoHist = {
        key: key, t: Date.now(), eventos: encontrados,
        truncado: lista.length >= RX_GEO_HIST_MAX_U, unidades: total
    };
    return _rxGeoHist;
}
// Fuente elegida -> lista de eventos. Con cache corta, porque el dialogo
// la pide en cada repintado y el recorrido puede tener miles de mensajes.
let _rxGeoCache = { t: 0, datos: {} };
// Limpia la cache de eventos (util al abrir el informe y en las pruebas,
// que cambian los datos a mano entre comprobaciones).
function rxGeoInfCacheReset() {
    _rxGeoCache = { t: 0, datos: {} };
}
function rxGeoInfEventos(fuente, forzar) {
    const f = (RX_GEO_FUENTES.indexOf(fuente) >= 0) ? fuente : 'bitacora';
    const t = Date.now();
    // El rastreo depende ademas del alcance (todas / seleccionadas): se
    // guarda con esa clave para no mezclar los dos resultados.
    // El historial no se cachea aqui (ya guarda su propio resultado); el
    // rastreo depende del alcance, asi que va con la clave.
    const key = f + ((f === 'rastreo') ? ':' + (RX_GEO.unidades || 'todas') : '')
        + ((f === 'historial') ? ':' + rxGeoInfHistKey() : '');
    if (!forzar && _rxGeoCache.datos[key] && (t - _rxGeoCache.t) < 8000) return _rxGeoCache.datos[key];
    let out = [];
    try {
        if (f === 'historial') out = rxGeoInfDeHistorial();
        else if (f === 'rastreo') out = rxGeoInfDeRastreo();
        else if (f === 'replay') out = rxGeoInfDeReplay();
        else if (f === 'viajes') out = rxGeoInfDeViajes();
        else out = rxGeoInfDeBitacora();
    } catch (e) { out = []; }
    _rxGeoCache = { t: t, datos: Object.assign({}, _rxGeoCache.datos, (function () { const o = {}; o[key] = out; return o; })()) };
    return out;
}
// Que fuentes tienen datos ahora mismo (para el selector del dialogo).
// Que fuentes tienen datos. Se apoya en la cache (8 s) para no recorrer
// trazas y bitacora en cada repintado del dialogo; `forzar` se usa al abrir
// y cuando cambian los datos de verdad.
function rxGeoInfFuentesDisponibles(forzar) {
    const out = [];
    for (const f of RX_GEO_FUENTES) {
        const n = rxGeoInfEventos(f, !!forzar).length;
        // El historial de la plataforma se ofrece aunque aun no se haya
        // escaneado (0 eventos): es el que detecta CUALQUIER unidad.
        if (f === 'historial') {
            if ((APP.unidades || []).length && (APP.zonas || []).length) out.push({ k: f, n: n });
            continue;
        }
        if (n) out.push({ k: f, n: n });
    }
    return out;
}

function rxGeoInfZonas() {
    return (APP.zonas || []).map(rxGeoInfNombre).filter(Boolean);
}
// Reune lo que se va a pintar: eventos filtrados + agregados.
function rxGeoInfReune() {
    const todos = rxGeoInfEventos(RX_GEO.fuente);
    // Un rango de dias escrito a mano manda sobre los atajos.
    const desde = RX_GEO.desde ? rxGeoInfFechaMs(RX_GEO.desde, false) : rxGeoInfDesde(RX_GEO.rango);
    const hasta = RX_GEO.hasta ? rxGeoInfFechaMs(RX_GEO.hasta, true) : 0;
    const zona = RX_GEO.zona || '';
    const ev = rxGeoInfFiltra(todos, zona, desde, hasta);
    const rangoTxt = (desde || hasta)
        ? ((desde ? rxGeoInfFechaTxt(desde) : 'inicio') + ' – ' + (hasta ? rxGeoInfFechaTxt(hasta) : 'hoy'))
        : '';
    return {
        fuente: RX_GEO.fuente, rango: RX_GEO.rango, modo: RX_GEO.modo, zona: zona,
        desde: desde, hasta: hasta, rangoTxt: rangoTxt,
        eventos: ev, disponibles: todos.length,
        unidades: rxGeoInfAgrupa(ev, RX_GEO.modo),
        zonas: rxGeoInfPorZona(ev, zona ? null : rxGeoInfZonas())
    };
}
// Deja respirar a la interfaz entre pasos: sin esto la barra de progreso no
// llegaria a pintarse.
function rxGeoInfYield() {
    return new Promise((r) => { try { setTimeout(r, 0); } catch (_) { r(); } });
}
/* ====================== INFORME POR GEOCERCA: UI ====================== */
// Opciones del selector de geocerca, con buscador. Devuelve tambien cuantas
// coinciden, para el contador del campo.
function rxGeoInfSelect() {
    const zonas = rxGeoInfZonas();
    const q = norm(RX_GEO.busca || '');
    const conDatos = rxGeoInfPorZona(rxGeoInfEventos(RX_GEO.fuente), null);
    const num = {};
    for (const f of conDatos) num[f.zona] = f.cruces + f.paradas;
    const lista = q ? zonas.filter((z) => norm(z).indexOf(q) >= 0) : zonas;
    const opts = '<option value="">Todas las geocercas</option>' + lista.map((z) => {
        const n = num[z] || 0;
        return '<option value="' + esc(z) + '"' + (RX_GEO.zona === z ? ' selected' : '') + '>' + esc(z) +
            (n ? ' \u00b7 ' + n + ' evento(s)' : ' \u00b7 sin datos') + '</option>';
    }).join('');
    return { html: opts, n: lista.length, total: zonas.length };
}
function rxGeoInfFilas(d) {
    return d.unidades.filas.map(rxGeoInfCeldas);
}
function rxGeoInfResumen(d) {
    const t = d.unidades.total;
    const fuenteTxt = (d.fuente === 'historial') ? 'Historial de la plataforma'
        : (d.fuente === 'rastreo') ? 'Rastreo de unidades'
        : (d.fuente === 'bitacora') ? 'Avisos de la sesion'
            : (d.fuente === 'viajes' ? 'Viajes analizados' : 'Recorrido cargado en Replay');
    const rangoTxt = d.rangoTxt || (d.rango === 'hoy' ? 'hoy'
        : (d.rango === '24h' ? 'ultimas 24 h'
            : (d.rango === '7d' ? 'ultimos 7 dias'
                : (d.rango === '15d' ? 'ultimos 15 dias'
                    : (d.rango === '30d' ? 'ultimos 30 dias' : 'todo el historico')))));
    return fuenteTxt + ' \u00b7 ' + rangoTxt + (d.zona ? (' \u00b7 geocerca ' + d.zona) : '') +
        ': ' + t.unidades + ' unidad(es), ' + t.cruces + ' cruce(s) y ' + t.paradas +
        ' parada(s) con ' + t.min + ' min quieto' + (t.motor ? (' (' + t.motor + ' con motor apagado)') : '') + '.';
}
// Documento imprimible (PDF). Reutiliza el maquetado del informe general.
// Anillo de una geocerca en {lat,lon}, para pintarla en el mini-mapa del
// PDF (circulos, poligonos y lineas). Vacio si no hay geometria utilizable.
function rxGeoInfAnillo(z) {
    if (!z) return [];
    const radio = (typeof _zonaRadio === 'function') ? _zonaRadio(z) : (+z.w || 0);
    if (z.t === 3) {
        const c = centroDeZona(z);
        if (!c || !(radio > 0)) return [];
        const out = [];
        const mx = 111320 * Math.cos(c.lat * Math.PI / 180) || 111320;
        for (let i = 0; i <= 36; i++) {
            const a = (i / 36) * Math.PI * 2;
            out.push({ lat: c.lat + (radio / 110540) * Math.sin(a), lon: c.lon + (radio / mx) * Math.cos(a) });
        }
        return out;
    }
    const pts = (typeof _zonaPuntos === 'function') ? _zonaPuntos(z) : (z.p || []);
    const out = [];
    for (const p of (pts || [])) {
        if (!p) continue;
        const la = (p.y != null) ? +p.y : (Array.isArray(p) ? +p[1] : NaN);
        const lo = (p.x != null) ? +p.x : (Array.isArray(p) ? +p[0] : NaN);
        if (isFinite(la) && isFinite(lo)) out.push({ lat: la, lon: lo });
    }
    if (out.length >= 3) out.push(out[0]);
    return out;
}
// Documento imprimible (PDF). Sigue el mismo maquetado que el reporte del
// recorrido: portada, KPIs, mapa con leyenda, secciones numeradas y tablas.
function rxGeoInfHTML(d) {
    const z = d.zona ? (APP.zonas || []).find((x) => rxGeoInfNombre(x) === d.zona) : null;
    const cab = rxGeoInfCabeceras(d.modo);
    const filas = d.unidades.filas.slice(0, 300).map((c) => rxGeoInfCeldasHTML(rxGeoInfCeldas(c), d.modo));
    const kpi = (n, t) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(t) + '</span></div>';
    const coords = (la, lo) => (la == null || lo == null)
        ? '<span class="muted">-</span>'
        : '<span class="mono">' + esc(rxCoord(la, lo, 5)) + '</span>';
    const tot = d.unidades.total;
    const org = z && (typeof glocOrigen === 'function') ? glocOrigen(z) : null;
    // Ficha de la geocerca (dos columnas, como el resto del informe).
    let ficha = '';
    if (z) {
        const cen = centroDeZona(z) || {};
        let area = '-';
        try { const a = zonaAreaM2(z); if (a > 0) area = (a / 1e6).toFixed(3) + ' km2'; } catch (_) { /* noop */ }
        ficha = '<div class="grid2"><div>' +
            rxInfTabla(['Geocerca', 'Detalle'], [
                ['<b>' + esc(rxGeoInfNombre(z)) + '</b>', esc(z.t === 3 ? 'Circulo' : (z.t === 1 ? 'Linea' : 'Poligono'))],
                [esc(org ? org.corto : 'PLAT'), esc(org ? org.largo : 'Geocerca de la plataforma')]
            ]) + '</div><div>' +
            rxInfTabla(['Dato', 'Valor'], [
                ['Superficie', esc(area)],
                ['Centro', (cen.lat == null ? '<span class="muted">-</span>' : coords(cen.lat, cen.lon))],
                ['Eventos', String(d.eventos.length)]
            ]) + '</div></div>';
    }
    // Mapa: la geocerca (o las que tienen datos) y las unidades que
    // estuvieron o estan dentro. Es el mismo mini-mapa que usa el Replay.
    const zonasMapa = z ? [z]
        : (APP.zonas || []).filter((zz) => d.zonas.some((f) => f.zona === rxGeoInfNombre(zz))).slice(0, 8);
    const lineas = [];
    for (const zz of zonasMapa) {
        const an = rxGeoInfAnillo(zz);
        if (an.length > 2) lineas.push({ pts: an, color: '#1565c0', width: 3, opacity: 0.9, glow: true });
    }
    const marcas = [];
    for (const e of d.eventos) {
        if (marcas.length >= 80) break;
        if (e.lat == null || e.lon == null) continue;
        if (e.tipo === 'dentro') {
            marcas.push({ lat: e.lat, lon: e.lon, color: '#2e7d32', radio: 6, txt: e.eco + ' · dentro ahora' });
        } else if (e.tipo === 'motor') {
            marcas.push({ lat: e.lat, lon: e.lon, color: '#b71c1c', radio: 5, txt: e.eco + ' · parado con motor apagado' });
        } else if (e.tipo === 'detenida') {
            marcas.push({ lat: e.lat, lon: e.lon, color: '#e65100', radio: 5, txt: e.eco + ' · parada' });
        } else {
            marcas.push({ lat: e.lat, lon: e.lon, color: '#1565c0', radio: 4, txt: e.eco + ' · ' + (RX_GEO_TIPOS[e.tipo] || e.tipo) });
        }
    }
    const mapa = (lineas.length || marcas.length) ? rxMiniMapaHTML({ lineas: lineas, marcas: marcas }, 680, 300) : '';
    const leyenda = '<div class="mapa-leyenda">' +
        '<span><i style="background:#1565c0"></i>Geocerca' + (zonasMapa.length > 1 ? 's' : '') + '</span>' +
        '<span><i style="background:#2e7d32"></i>Dentro ahora</span>' +
        '<span><i style="background:#e65100"></i>Parada</span>' +
        '<span><i style="background:#b71c1c"></i>Motor apagado</span>' +
        '<span class="muted">Mapa: OpenStreetMap</span></div>';
    // Tablas.
    const filasZona = d.zonas.map((f) => [
        '<b>' + esc(f.zona) + '</b>', String(f.cruces), String(f.paradas), String(f.min),
        String(f.nUnidades), esc(Object.keys(f.unidades).slice(0, 10).join(', ') + (f.nUnidades > 10 ? '...' : ''))
    ]);
    const dentro = d.eventos.filter((e) => e.tipo === 'dentro');
    const filasDentro = dentro.map((e) => [
        '<b>' + esc(e.eco) + '</b>', esc(e.chofer || '-'), esc(e.zona),
        (e.vel == null ? '-' : (e.vel + ' km/h')),
        (e.online === false ? '<span class="bad">sin senal</span>' : '<span class="ok">en linea</span>'),
        coords(e.lat, e.lon)
    ]);
    const detalle = d.eventos.slice(0, 200).map((e) => [
        esc(rxFechaHora(e.ts, true)),
        '<span class="pill">' + esc(RX_GEO_TIPOS[e.tipo] || e.tipo) + '</span>',
        esc(e.zona), esc(e.eco || '-'), esc(e.chofer || '-'), esc(e.detalle || e.titulo || '-'), coords(e.lat, e.lon)
    ]);
    // Secciones numeradas, como en el reporte del recorrido.
    const secciones = [];
    let num = 0;
    const add = (titulo, contenido) => { num++; secciones.push('<h2 class="seccion">' + esc(num + '. ' + titulo) + '</h2>' + contenido); };
    if (mapa) add('Mapa', mapa + leyenda);
    if (ficha) add('Geocerca' + (z ? ': ' + rxGeoInfNombre(z) : ''), ficha);
    if (filasDentro.length) add('Dentro ahora (' + filasDentro.length + ')',
        rxInfTabla(['Eco', 'Chofer', 'Geocerca', 'Velocidad', 'Estado', 'Coordenadas'], filasDentro));
    add((d.modo === 'paradas' ? 'Paradas por unidad' : 'Cruces por unidad') + ' (' + d.unidades.filas.length + ')',
        rxInfTabla(cab, filas));
    add('Resumen por geocerca (' + filasZona.length + ')',
        rxInfTabla(['Geocerca', 'Cruces', 'Paradas', 'Min quieto', 'Unidades', 'Ecos'], filasZona));
    add('Detalle de eventos (' + Math.min(200, d.eventos.length) + ' de ' + d.eventos.length + ')',
        (d.eventos.length > 200 ? '<div class="callout">Se listan los 200 primeros eventos del filtro; el CSV lleva todos.</div>' : '') +
        rxInfTabla(['Fecha y hora', 'Evento', 'Geocerca', 'Eco', 'Chofer', 'Detalle', 'Coordenadas'], detalle));
    const fuenteTxt = (d.fuente === 'historial') ? 'Historial de la plataforma'
        : (d.fuente === 'rastreo') ? 'Rastreo de unidades'
            : (d.fuente === 'bitacora' ? 'Avisos de la sesion'
                : (d.fuente === 'viajes' ? 'Viajes analizados' : 'Recorrido cargado en Replay'));
    const meta = (z ? 'Geocerca <b>' + esc(rxGeoInfNombre(z)) + '</b><br>' : 'Todas las geocercas<br>') +
        esc((d.rangoTxt || 'Periodo completo') + ' · ' + (rxGeoInfSoloSel() ? 'unidades seleccionadas' : 'toda la flota')) +
        '<br>Datos: ' + esc(fuenteTxt) + '<br>Documento de solo lectura';
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' +
        'Geocerca ' + esc(z ? rxGeoInfNombre(z) : 'todas') + '</title>' +
        '<style>' + rxInfEstilo() + '</style></head><body>' +
        rxInfCabecera('Rondo', 'Informe por geocerca', meta) +
        '<div class="kpis">' +
        kpi(tot.unidades, 'Unidades') + kpi(tot.cruces, 'Cruces') + kpi(tot.entradas, 'Entradas') +
        kpi(tot.salidas, 'Salidas') + kpi(tot.paradas, 'Paradas') +
        kpi(tot.min + ' min', 'Quieto') + kpi(tot.motor, 'Con motor apagado') +
        (tot.dentro ? kpi(tot.dentro, 'Dentro ahora') : '') +
        '</div>' +
        '<p class="resumen">' + esc(rxGeoInfResumen(d)) + '</p>' +
        secciones.join('') +
        rxInfPie() + '</body></html>';
}
// Mapa del dialogo: la geocerca marcada y las unidades encontradas. Usa el
// mismo mini-mapa interactivo (pan/zoom) y el mismo anillo que el PDF.
function rxGeoInfPintaMapa(d) {
    const cont = byId('rgi-mapa');
    if (!cont) return;
    const z = RX_GEO.zona ? rxGeoInfZonaSel() : null;
    const zonasMapa = z ? [z]
        : (APP.zonas || []).filter((zz) => d.zonas.some((f) => f.zona === rxGeoInfNombre(zz))).slice(0, 8);
    const lineas = [];
    for (const zz of zonasMapa) {
        const an = rxGeoInfAnillo(zz);
        if (an.length > 2) lineas.push({ pts: an, color: '#1565c0', width: 3, opacity: 0.9, glow: true });
    }
    const marcas = [];
    for (const e of d.eventos) {
        if (marcas.length >= 150) break;
        if (e.lat == null || e.lon == null) continue;
        const col = (e.tipo === 'dentro') ? '#2e7d32'
            : (e.tipo === 'motor' ? '#b71c1c' : (e.tipo === 'detenida' ? '#e65100' : '#1565c0'));
        marcas.push({ lat: e.lat, lon: e.lon, color: col, radio: (e.tipo === 'dentro' ? 6 : 4), txt: e.eco + ' \u00b7 ' + (RX_GEO_TIPOS[e.tipo] || e.tipo) });
    }
    if (!lineas.length && !marcas.length) {
        if (RX_GEO._mapa) { try { RX_GEO._mapa.destruir(); } catch (_) { /* noop */ } RX_GEO._mapa = null; }
        cont.innerHTML = '<div class="rgi-mapa-vacio">Sin geometria ni unidades con este filtro.</div>';
        return;
    }
    try {
        if (!RX_GEO._mapa) RX_GEO._mapa = rxMiniMapa(cont, { lineas: lineas, marcas: marcas });
        else { RX_GEO._mapa.lineas = lineas; RX_GEO._mapa.marcas = marcas; }
        RX_GEO._mapa.encuadrar();
    } catch (e) {
        if (APP.unlocked) console.warn('[Rondo] mapa informe', e && e.message);
    }
}
function rxGeoInfNombreArchivo(d, ext) {
    const geo = d.zona ? (d.zona.replace(/[^\w\-]+/g, '_').slice(0, 30) + '_') : '';
    return 'rondo_geocerca_' + geo + (d.modo === 'paradas' ? 'paradas_' : 'cruces_') +
        new Date().toISOString().slice(0, 10) + ext;
}
// Dialogo: que informe, de que geocerca, de que periodo, con que datos, un
// mapa con la geocerca y las unidades, y las tres salidas.
function abrirInformeGeocerca(origen) {
    // Desde la pestana Replay el rango arranca en las fechas del recorrido
    // cargado, que es lo que el operador esta mirando en ese momento.
    if (origen === 'replay') {
        const r = (typeof RX_REPLAY !== 'undefined') ? RX_REPLAY : null;
        if (r && r.fecha) {
            RX_GEO.desde = String(r.fecha);
            RX_GEO.hasta = (r.fecha2 && r.fecha2 !== r.fecha) ? String(r.fecha2) : '';
            RX_GEO.rango = '';
        }
    }
    rxGeoInfCacheReset();
    const hay = rxGeoInfFuentesDisponibles();
    if (!hay.length) {
        adviceWarn('Sin datos de geocercas',
            'Activa la regla Geocercas en Ajustes, analiza un viaje o carga un recorrido en Replay para poder informar.');
        return;
    }
    if (!RX_GEO._fuenteTocada) {
        // Si hay geocerca elegida y flota, el historial de la plataforma es
        // el que responde de verdad "quien anduvo por aqui". Sin geocerca
        // (mirar todas) se prefiere una fuente local, que es instantanea.
        if (RX_GEO.zona && hay.some((h) => h.k === 'historial')) {
            RX_GEO.fuente = 'historial';
        } else if (!hay.some((h) => h.k === RX_GEO.fuente)) {
            const local = hay.find((h) => h.k !== 'historial');
            RX_GEO.fuente = (local || hay[hay.length - 1]).k;
        }
    } else if (!hay.some((h) => h.k === RX_GEO.fuente)) {
        RX_GEO.fuente = hay[0].k;
    }
    // El contenedor del mapa se rehace con el dialogo: se olvida la instancia
    // anterior para no medir un nodo ya desconectado.
    RX_GEO._mapa = null;
    // El escaneo del historial es cancelable: al cerrar el dialogo se aborta.
    if (RX_GEO._token) RX_GEO._token.cancelado = true;
    RX_GEO._token = { cancelado: false };
    const ETIQUETA = { historial: 'Plataforma', rastreo: 'Rastreo', bitacora: 'Avisos', viajes: 'Viajes analizados', replay: 'Recorrido cargado' };
    const cuerpo = (d, fuentes, selZ, generarPend) => {
        const chip = (act, attr, v, txt, titulo) => '<button type="button" class="rgi-chip' + (act ? ' activo' : '') +
            '" ' + attr + ' data-v="' + esc(v) + '"' + (titulo ? ' title="' + esc(titulo) + '"' : '') + '>' + esc(txt) + '</button>';
        const tot = d.unidades.total;
        // Hero: que geocerca se informa, de donde viene y que datos tiene.
        const z = RX_GEO.zona ? rxGeoInfZonaSel() : null;
        const org = z ? glocOrigen(z) : null;
        let ficha = 'Todas las geocercas';
        if (z) {
            let area = '';
            try { const a = zonaAreaM2(z); if (a > 0) area = (a / 1e6).toFixed(2) + ' km2'; } catch (_) { /* noop */ }
            ficha = (z.t === 3 ? 'C\u00edrculo' : (z.t === 1 ? 'L\u00ednea' : 'Pol\u00edgono')) +
                (area ? ' \u00b7 ' + area : '') + ' \u00b7 ' + (org ? org.largo : 'de la plataforma');
        }
        const hero = '<div class="rgi-hero' + (org ? ' o-' + org.id : '') + '">' +
            '<span class="rgi-heroico rondo-usym">' + UIS.zone + '</span>' +
            '<div class="rgi-herot"><b>' + esc(RX_GEO.zona || 'Todas las geocercas') + '</b>' +
            '<span>' + esc(ficha) + '</span></div>' +
            (org ? '<i class="rgi-ori o-' + org.id + '">' + esc(org.corto) + '</i>' : '') +
            '</div>';
        const dentro = d.eventos.filter((e) => e.tipo === 'dentro');
        const conChofer = d.unidades.filas.filter((f) => Object.keys(f.choferes || {}).length).length;
        const chipsDentro = dentro.length
            ? '<div class="rgi-dentro"><span class="rgi-dl">Dentro ahora</span>' + dentro.slice(0, 14).map((e) =>
                '<span class="rgi-dchip" title="' + esc(e.zona) + (e.chofer ? ' \u00b7 ' + e.chofer : '') + (e.vel != null ? ' \u00b7 ' + e.vel + ' km/h' : '') + '">' +
                '<span class="rondo-usym">' + UIS.pin + '</span>' + esc(e.eco) + '</span>').join('') +
                (dentro.length > 14 ? '<span class="rgi-dmore">+' + (dentro.length - 14) + '</span>' : '') + '</div>'
            : '';
        // Acciones de descarga, con PDF como accion principal.
        const acciones = '<div class="rgi-generar">' +
            '<button type="button" class="rgi-btn gen' + (generarPend ? ' pulsa' : '') + '" id="rgi-generar">' +
            '<span class="rondo-usym">' + (generarPend ? UIS.refresh : UIS.check) + '</span>' +
            '<b>' + (generarPend ? 'Generar reporte' : 'Actualizar reporte') + '</b>' +
            '<i>' + (generarPend ? 'pulsa para consultar y calcular' : 'vuelve a consultar los datos') + '</i></button>' +
            '<span class="rgi-gen-hint">' + esc((RX_GEO.fuente === 'historial')
                ? 'La fuente Plataforma consulta el historial de toda la flota: se lanza con el boton.'
                : 'Los cambios de opciones no recargan solos: pulsa el boton para actualizar el informe.') + '</span>' +
            '</div>' +
            '<div class="rgi-io">' +
            '<button type="button" class="rgi-btn primary" id="rgi-pdf" title="Reporte imprimible (Guardar como PDF)">' +
            '<span class="rondo-usym">' + UIS.export + '</span><b>PDF</b><i>reporte listo para imprimir</i></button>' +
            '<button type="button" class="rgi-btn" id="rgi-csv" title="Detalle evento a evento">' +
            '<span class="rondo-usym">' + UIS.csv + '</span><b>CSV</b><i>evento a evento</i></button>' +
            '<button type="button" class="rgi-btn" id="rgi-md" title="Informe en texto">' +
            '<span class="rondo-usym">' + UIS.copy + '</span><b>Markdown</b><i>texto para pegar</i></button>' +
            '</div>';
        return '<div class="rgi">' +
            hero +
            '<div class="rgi-cfg">' +
            '<div class="rgi-row"><span class="rgi-lb">Informe</span><div class="rgi-chips">' +
            chip(RX_GEO.modo === 'cruces', 'data-rgi="modo"', 'cruces', 'Cruces por unidad', 'Quien entro y salio de cada geocerca') +
            chip(RX_GEO.modo === 'paradas', 'data-rgi="modo"', 'paradas', 'Paradas dentro', 'Quien se quedo quieto dentro y cuanto tiempo') +
            '</div></div>' +
            '<div class="rgi-row rgi-row-geo"><span class="rgi-lb">Geocerca</span>' +
            '<span class="rgi-busca">' +
            '<span class="rondo-usym">' + UIS.filter + '</span>' +
            '<input type="text" id="rgi-buscar" class="filtro" placeholder="Buscar geocerca\u2026" value="' + esc(RX_GEO.busca || '') + '">' +
            '<i id="rgi-busca-n">' + selZ.n + '/' + selZ.total + '</i>' +
            '</span></div>' +
            '<div class="rgi-row"><span class="rgi-lb"></span>' +
            '<select id="rgi-zona" class="filtro">' + selZ.html + '</select></div>' +
            '<div class="rgi-row"><span class="rgi-lb">Unidades</span><div class="rgi-chips">' +
            chip(RX_GEO.unidades !== 'sel', 'data-rgi="unidades"', 'todas', 'Toda la flota') +
            chip(RX_GEO.unidades === 'sel', 'data-rgi="unidades"', 'sel', 'Solo las seleccionadas') +
            '</div></div>' +
            '<div class="rgi-row"><span class="rgi-lb">Periodo</span><div class="rgi-chips">' +
            chip(RX_GEO.rango === 'hoy' && !RX_GEO.desde, 'data-rgi="rango"', 'hoy', 'Hoy') +
            chip(RX_GEO.rango === '24h' && !RX_GEO.desde, 'data-rgi="rango"', '24h', '24 h') +
            chip(RX_GEO.rango === '7d' && !RX_GEO.desde, 'data-rgi="rango"', '7d', '7 d\u00edas') +
            chip(RX_GEO.rango === '15d' && !RX_GEO.desde, 'data-rgi="rango"', '15d', '15 d\u00edas') +
            chip(RX_GEO.rango === '30d' && !RX_GEO.desde, 'data-rgi="rango"', '30d', '30 d\u00edas') +
            chip(RX_GEO.rango === 'todo' && !RX_GEO.desde, 'data-rgi="rango"', 'todo', 'Todo') +
            '</div></div>' +
            '<div class="rgi-row"><span class="rgi-lb">D\u00edas</span>' +
            '<span class="rgi-rango">' +
            '<input type="date" id="rgi-desde" class="filtro" title="Dia inicial (incluido)" value="' + esc(RX_GEO.desde) + '">' +
            '<span class="sep">\u2192</span>' +
            '<input type="date" id="rgi-hasta" class="filtro" title="Dia final (incluido)" value="' + esc(RX_GEO.hasta) + '">' +
            (RX_GEO.desde || RX_GEO.hasta ? '<button type="button" class="mini" data-rgi="rango" data-v="hoy">Quitar</button>' : '') +
            '</span></div>' +
            '<div class="rgi-row rgi-row-param"><span class="rgi-lb" title="Umbrales para decidir que es una parada">Parada</span>' +
            '<span class="rgi-rango">' +
            '<label class="rgi-num" title="Minutos quieto minimos para contar la parada">Min <input type="number" id="rgi-pmin" min="1" max="240" step="1" value="' + rxGeoInfParam('pMin', 2, 0.5, 240) + '"></label>' +
            '<label class="rgi-num" title="Velocidad maxima (km/h) para considerar la unidad quieta">Vel <input type="number" id="rgi-pvel" min="0" max="80" step="1" value="' + rxGeoInfParam('pVel', 3, 0, 80) + '"></label>' +
            '<label class="rgi-num" title="Metros de margen sobre el borde de la geocerca para captar la parada justo en el limite">Borde <input type="number" id="rgi-pmargen" min="0" max="2000" step="10" value="' + rxGeoInfParam('pMargen', 60, 0, 2000) + '"> m</label>' +
            '</span></div>' +
            '<div class="rgi-row"><span class="rgi-lb">Datos</span><div class="rgi-chips">' +
            fuentes.map((f) => chip(RX_GEO.fuente === f.k, 'data-rgi="fuente"', f.k,
                ETIQUETA[f.k] + ' \u00b7 ' + f.n, ETIQUETA[f.k])).join('') +
            '</div></div>' +
            '</div>' +
            '<div class="rgi-kpis">' +
            '<div class="rgi-kpi' + (tot.unidades ? ' ok' : '') + '"><b>' + tot.unidades + '</b><span>Unidades</span></div>' +
            '<div class="rgi-kpi"><b>' + tot.cruces + '</b><span>Cruces</span></div>' +
            '<div class="rgi-kpi"><b>' + tot.entradas + '</b><span>Entradas</span></div>' +
            '<div class="rgi-kpi"><b>' + tot.paradas + '</b><span>Paradas</span></div>' +
            '<div class="rgi-kpi"><b>' + tot.min + '</b><span>Min quieto</span></div>' +
            '<div class="rgi-kpi"><b>' + tot.motor + '</b><span>Motor apagado</span></div>' +
            (conChofer ? '<div class="rgi-kpi"><b>' + conChofer + '</b><span>Con chofer</span></div>' : '') +
            (tot.dentro ? '<div class="rgi-kpi vivo"><b>' + tot.dentro + '</b><span>Dentro ahora</span></div>' : '') +
            '</div>' +
            chipsDentro +
            '<p class="rgi-res">' + esc(rxGeoInfResumen(d)) + '</p>' +
            ((!d.eventos.length && (APP.unidades || []).length && RX_GEO.fuente !== 'historial')
                ? '<div class="rgi-aviso">No hay eventos en esta fuente. ' +
                  'Para rastrear <b>toda la flota</b> en el rango elegido, usa el historial de la plataforma.' +
                  '<button type="button" class="mini" data-rgi="fuente" data-v="historial">' +
                  '<span class="rondo-usym">' + UIS.refresh + '</span> Buscar en la plataforma</button></div>'
                : '') +
            '<div class="rgi-prev">' + (d.unidades.filas.length
                ? rxInfTabla(rxGeoInfCabeceras(d.modo), d.unidades.filas.slice(0, 12)
                    .map((c) => rxGeoInfCeldasHTML(rxGeoInfCeldas(c), d.modo))) +
                (d.unidades.filas.length > 12 ? '<p class="rgi-more">y ' + (d.unidades.filas.length - 12) + ' unidad(es) m\u00e1s en el PDF y el CSV.</p>' : '')
                : '<p class="rgi-more">Sin unidades con este filtro.</p>') + '</div>' +
            acciones +
            '</div>';
    };
    abrirDialogo({
        icon: UIS.zone,
        titulo: 'Informe por geocerca',
        ancho: 720,
        okText: 'Cerrar',
        // Un solo boton abajo: las salidas viven en la barra de acciones.
        cancel: false,
        html: '<div class="rgi-tool">' +
            '<div class="rgi-mapa" id="rgi-mapa"><div class="rgi-mapa-vacio">Elige una geocerca para verla en el mapa</div></div>' +
            '<div class="rgi-carga" id="rgi-carga" style="display:none">' +
            '<span id="rgi-carga-t">Calculando\u2026</span>' +
            '<span class="rgi-barra"><i id="rgi-barra"></i></span>' +
            '</div>' +
            '<div id="rgi-box"></div>' +
            '</div>',
        onOpen: (el) => {
            const box = el.querySelector('#rgi-box');
            if (!box) return;
            const carga = el.querySelector('#rgi-carga');
            const barra = el.querySelector('#rgi-barra');
            const cargaT = el.querySelector('#rgi-carga-t');
            const setProg = (p, t) => {
                if (barra) barra.style.width = p + '%';
                if (cargaT && t) cargaT.textContent = t;
                if (carga) carga.style.display = 'flex';
            };
            // Pintado asincrono por pasos: la barra se ve de verdad y la
            // interfaz respira entre el calculo y el dibujo.
            // Version del token para descartar resultados de un pintado viejo
            // (el operador puede cambiar de opcion varias veces seguidas).
            let pintaN = 0;
            // Pintar los controles y (si toca) calcular. `generar` decide si
            // hay que consultar la plataforma; cambiar opciones solo repinta
            // y deja los resultados viejos marcados como pendientes.
            const pinta = async (generar) => {
                const mio = ++pintaN;
                if (generar) {
                    setProg(6, 'Reuniendo datos\u2026');
                    await rxGeoInfYield();
                    if (RX_GEO.fuente === 'historial') {
                        RX_GEO._token = { cancelado: false };
                        try {
                            await rxGeoInfEscanear((hechas, total, eco, hallados) => {
                                setProg(6 + Math.round((hechas / Math.max(1, total)) * 80),
                                    'Consultando ' + hechas + '/' + total +
                                    (eco ? ' \u00b7 ' + eco : '') +
                                    (hallados ? ' \u00b7 ' + hallados + ' evento(s)' : ''));
                            }, RX_GEO._token);
                        } catch (_) { /* noop */ }
                        if (mio !== pintaN) return;
                    }
                    RX_GEO.listo = true;
                }
                const d = rxGeoInfReune();
                setProg(92, 'Dibujando\u2026');
                await rxGeoInfYield();
                if (mio !== pintaN) return;
                const selZ = rxGeoInfSelect();
                const fuentes = rxGeoInfFuentesDisponibles();
                setHtml(box, cuerpo(d, fuentes, selZ, !RX_GEO.listo));
                rxGeoInfPintaMapa(d);
                if (carga) carga.style.display = 'none';
            };
            box.addEventListener('click', (ev) => {
                const btn = ev.target.closest && ev.target.closest('button');
                // Salidas y "Generar reporte": el cuerpo se repinta en cada
                // cambio, asi que los botones se atienden por delegacion (el
                // contenedor #rgi-box no se reemplaza).
                if (btn && box.contains(btn)) {
                    if (btn.id === 'rgi-generar') { pinta(true); return; }
                    if (btn.id === 'rgi-pdf') {
                        rxImprimirHTML(rxGeoInfHTML(rxGeoInfReune()));
                        advice('Reporte listo', 'Elige "Guardar como PDF" en el dialogo de impresion.');
                        return;
                    }
                    if (btn.id === 'rgi-csv') { rxGeoInfCSV(rxGeoInfReune()); return; }
                    if (btn.id === 'rgi-md') { rxGeoInfMD(rxGeoInfReune()); return; }
                }
                const b = ev.target.closest && ev.target.closest('[data-rgi]');
                if (!b || !box.contains(b)) return;
                if (b.dataset.rgi === 'rango') {
                    // Un atajo de periodo borra el rango escrito a mano.
                    RX_GEO.rango = b.dataset.v;
                    RX_GEO.desde = '';
                    RX_GEO.hasta = '';
                } else {
                    RX_GEO[b.dataset.rgi] = b.dataset.v;
                    if (b.dataset.rgi === 'fuente') RX_GEO._fuenteTocada = true;
                }
                // Cambiar opciones NO recarga: los resultados quedan viejos
                // y el boton "Generar reporte" pasa a estar resaltado.
                RX_GEO.listo = false;
                pinta(false);
            });
            box.addEventListener('input', (ev) => {
                const t = ev.target;
                if (!t || t.id !== 'rgi-buscar') return;
                RX_GEO.busca = t.value || '';
                // Se repinta solo el selector y el contador: asi el campo de
                // busqueda no pierde el foco mientras se escribe.
                const sel = byId('rgi-zona');
                const info = rxGeoInfSelect();
                if (sel) sel.innerHTML = info.html;
                const n = byId('rgi-busca-n');
                if (n) n.textContent = info.n + '/' + info.total;
            });
            box.addEventListener('change', (ev) => {
                const t = ev.target;
                if (!t || !t.id) return;
                if (t.id === 'rgi-buscar') return;
                if (t.id === 'rgi-zona') {
                    RX_GEO.zona = t.value || '';
                    _rxGeoZonaSel = { nombre: '\u0000', z: null };
                    RX_GEO.listo = false;
                    pinta(false);
                    return;
                }
                if (t.id === 'rgi-desde' || t.id === 'rgi-hasta') {
                    RX_GEO.desde = t.value || '';
                    RX_GEO.hasta = (byId('rgi-hasta') ? byId('rgi-hasta').value : '') || '';
                    // Si el operador se equivoca de orden, se corrige solo.
                    if (RX_GEO.desde && RX_GEO.hasta && RX_GEO.desde > RX_GEO.hasta) {
                        const tmp = RX_GEO.desde;
                        RX_GEO.desde = RX_GEO.hasta;
                        RX_GEO.hasta = tmp;
                    }
                    RX_GEO.listo = false;
                    pinta(false);
                    return;
                }
                if (t.id === 'rgi-pmin' || t.id === 'rgi-pvel' || t.id === 'rgi-pmargen') {
                    // Cambiar los umbrales cambia que paradas se detectan: hay
                    // que recalcular (y rescanear si la fuente es la plataforma).
                    if (t.id === 'rgi-pmin') RX_GEO.pMin = Number(t.value);
                    else if (t.id === 'rgi-pvel') RX_GEO.pVel = Number(t.value);
                    else RX_GEO.pMargen = Number(t.value);
                    RX_GEO.listo = false;
                    rxGeoInfCacheReset();
                    pinta(true);
                }
            });
            // Los botones se atienden por delegacion en #rgi-box (arriba):
            // al repintarse el cuerpo, enlazarlos aqui no serviria.
            // Al abrir se calcula solo si la fuente no consulta la plataforma
            // (las fuentes locales son instantaneas). Con "Plataforma" se
            // espera al boton para no barrer la flota sin querer.
            pinta(RX_GEO.fuente !== 'historial');
        },
        onOk: () => { /* las salidas se eligen en la barra de acciones */ }
    });
}
function rxGeoInfCSV(d) {
    const cabU = rxGeoInfCabeceras(d.modo);
    const filasU = d.unidades.filas.map((c) => rxGeoInfCeldasPlanas(rxGeoInfCeldas(c), d.modo));
    const cabE = ['Fecha y hora', 'Evento', 'Geocerca', 'Eco', 'Chofer', 'Minutos', 'Detalle', 'Lat', 'Lon', 'Fuente'];
    const filasE = d.eventos.map((e) => [
        rxFechaHora(e.ts), (RX_GEO_TIPOS[e.tipo] || e.tipo), e.zona, (e.eco || ''),
        (e.chofer || ''), String(e.min || 0), (e.detalle || e.titulo || ''),
        (e.lat == null ? '' : String(e.lat)), (e.lon == null ? '' : String(e.lon)), (e.fuente || '')
    ]);
    const txt = [cabU].concat(filasU).concat([cabE]).concat(filasE)
        .map((f) => f.map(rxCsvCelda).join(',')).join('\n');
    const a = makeEl('a', { href: URL.createObjectURL(new Blob(['\uFEFF' + txt], { type: 'text/csv;charset=utf-8;' })) });
    a.download = rxGeoInfNombreArchivo(d, '.csv');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    adviceOk('Informe exportado', filasE.length + ' evento(s) y ' + filasU.length + ' unidad(es)');
}
function rxGeoInfMD(d) {
    const cab = rxGeoInfCabeceras(d.modo);
    const L = ['# Informe por geocerca - ' + (d.zona || 'todas las geocercas'), '',
        '- Generado: ' + rxFechaHora(Date.now(), true),
        '- Datos: ' + rxGeoInfResumen(d), '',
        '## ' + (d.modo === 'paradas' ? 'Paradas por unidad' : 'Cruces por unidad'), '',
        '| ' + cab.join(' | ') + ' |',
        '| ' + cab.map(() => '---').join(' | ') + ' |'];
    for (const f of d.unidades.filas) {
        L.push('| ' + rxGeoInfCeldasPlanas(rxGeoInfCeldas(f), d.modo)
            .map((x) => String(x).replace(/\|/g, '/')).join(' | ') + ' |');
    }
    L.push('', '## Geocercas', '', '| Geocerca | Cruces | Paradas | Min quieto | Unidades |', '| --- | --- | --- | --- | --- |');
    for (const f of d.zonas) L.push('| ' + [f.zona, f.cruces, f.paradas, f.min, f.nUnidades].join(' | ') + ' |');
    L.push('', '## Eventos (' + d.eventos.length + ')', '',
        '| Fecha y hora | Evento | Geocerca | Eco | Chofer | Minutos | Detalle |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const e of d.eventos.slice(0, 300)) {
        L.push('| ' + [rxFechaHora(e.ts), (RX_GEO_TIPOS[e.tipo] || e.tipo), e.zona, (e.eco || '-'),
            (e.chofer || '-'), (e.min || 0), (e.detalle || e.titulo || '-').replace(/\|/g, '/')].join(' | ') + ' |');
    }
    if (d.eventos.length > 300) L.push('', '_Se muestran los 300 primeros eventos._');
    if (typeof rxReplayDescargar === 'function') rxReplayDescargar(rxGeoInfNombreArchivo(d, '.md'), L.join('\n'), 'text/markdown;charset=utf-8;');
    else adviceWarn('No se pudo exportar', 'descarga no disponible');
    adviceOk('Informe exportado', d.eventos.length + ' evento(s)');
}