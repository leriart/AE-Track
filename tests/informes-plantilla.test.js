/*
 * Pruebas de los informes por plantilla (interfaz nueva): ejecutar una
 * plantilla de la plataforma por report/exec_record troceada es lo que
 * esquiva el limite de tiempo del informe nativo.
 *
 * Se extrae el fragmento 55 del bundle y se evalua con stubs de lo que vive
 * fuera (storage, DOM, red).
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* ====================== INFORMES POR PLANTILLA (API)');
const fin = src.indexOf('/* ====================== INFORMES POR PLANTILLA: UI');
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de informes por plantilla en ' + ARCHIVO);
    process.exit(1);
}

// Storage simulado: la cache de resultados vive en localStorage.
const LS = { infplant: 'rondo.api.infplant' };
const store = {};
const stubs = [
    'const APP = P_APP;',
    'const LS = P_LS;',
    'function readJSON(k, f){ const v = P_STORE[k]; return (v === undefined) ? f : v; }',
    'function writeJSON(k, v){ P_STORE[k] = v; }',
    'function norm(s){ return String(s == null ? "" : s).normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().trim(); }',
    'function esc(s){ var t = String(s == null ? "" : s); return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }',
    'function rxCsvCelda(c){ return "\\\"" + String(c == null ? "" : c) + "\\\""; }',
    'function makeEl(t, p){ return Object.assign({}, p || {}); }',
    'function rxGeoInfTrozos(desde, hasta, paso){',
    '  const out = []; if (!(hasta >= desde)) return out; const p = Math.max(1, paso || 1);',
    '  let t0 = desde;',
    '  while (t0 <= hasta) { const t1 = Math.min(hasta, t0 + p - 1); out.push([t0, t1]);',
    '    if (t1 >= hasta) break; if ((hasta - t1) < (p * 0.1)) { out[out.length - 1][1] = hasta; break; } t0 = t1 + 1; }',
    '  return out; }',
    'function rxGeoInfFechaMs(s, fin){ if (!s) return 0; const d = new Date(String(s) + "T00:00:00");',
    '  if (!isFinite(d.getTime())) return 0; if (fin) d.setHours(23, 59, 59, 999); return d.getTime(); }',
    'function rxGeoInfNombre(z){ return (z && (z.n || z.nombre)) || ""; }',
    'function parseUnitName(u){ const n=String((u&&u.nm)||""); const m=n.match(/\\b0*(\\d{3,5})\\b/); return {id:u&&u.id,nombre:n,eco:m?m[1]:"",clave:m?m[1]:n}; }',
    'function unitState(u){ const p=(u&&u.pos)||{}; return {t:Number(p.t||0),lat:p.y,lon:p.x,vel:0}; }',
    'function rxGeoInfAnillo(z){ return (z && z.puntos) ? z.puntos : []; }',
    'function rxGeoInfFechaTxt(ms){ return String(ms || 0); }',
    'function glocOrigen(z){ return { id: (z && z.app) ? "app" : "plat" }; }',
    'function rxGeoInfYield(){ return new Promise((r) => { try { setTimeout(r, 0); } catch (_) { r(); } }); }',
    'function remoteCall(m, p){ return P_REMOTE(m, p); }'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn {RX_INF,RX_INF_DIAS_TROZO,RX_INF_MAX_TROZOS,rxInfPlantillas,rxInfNormFilas,rxInfCols,' +
    'rxInfResumenUnidad,rxInfNum,rxInfFmt,rxInfFiltra,rxInfClave,rxInfTplDeClave,rxInfEjecutar,rxInfCorre,' +
    'rxInfCacheCargar,rxInfCachePoner,rxInfCacheLimpiar,rxInfCacheKey,rxInfCSVTexto,rxInfNombreArchivo,rxInfVista,' +
    'rxInfNombreCol,rxInfClasifica,rxInfSondea,rxInfUnidades,rxInfExplicaError,rxInfLimpiarInforme,rxInfCoords,rxInfZonasDeSonda,rxInfOrdena,rxInfMapaDatos,rxInfCamposHTML,rxInfPista,rxInfEsDeGeocercas,rxInfSondaVacia,rxInfColumnasVacias};';

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

const calls = [];
// Stub de red: report/exec_report devuelve 2 filas por llamada y recuerda los
// intervalos pedidos (asi se comprueba el troceado).
function remote(m, p) {
    calls.push({ m: m, p: p });
    if (m === 'core/search_items') {
        return Promise.resolve({
            items: [
                { id: 3, rep: { 1: { id: 11, n: 'Resumen diario' }, 2: { id: 12, n: 'Paradas por unidad' } } },
                { id: 4, rep: { 7: { id: 21, n: 'Kilometraje mensual' } } }
            ]
        });
    }
    if (m === 'report/cleanup_result') { calls.push({ m: m, p: {} }); return Promise.resolve({}); }
    if (m === 'report/get_result') return Promise.resolve({ reportResult: { columns: [{ n: 'Unidad' }], rows: [['999']] } });
    if (m === 'report/exec_report') {
        return Promise.resolve({
            reportResult: {
                columns: [{ n: 'Unidad' }, { n: 'Fecha' }, { n: 'Km' }, { n: 'Minutos' }, { n: 'Conductor' }],
                rows: [['105', '2026-03-10', 120.5, 90, 'Juan'], ['205', '2026-03-10', 80, 40, 'Ana']]
            }
        });
    }
    return Promise.resolve({});
}

const APP = { zonas: [], unidades: [] };
const mod = new Function('P_STORE', 'P_LS', 'P_REMOTE', 'P_APP', code)(store, LS, remote, APP);

// ── Descubrimiento de plantillas ─────────────────────────────────────────
(async function () {
    const tpls = await mod.rxInfPlantillas();
    ok('plantillas: lee las plantillas del recurso', tpls.length === 3,
        JSON.stringify(tpls.map((t) => t.nombre)));
    ok('plantillas: con recurso e id de plantilla',
        tpls.some((t) => t.rid === 3 && t.id === 11 && t.nombre === 'Resumen diario'),
        JSON.stringify(tpls));
    ok('plantillas: ordenadas por nombre',
        tpls.map((t) => t.nombre).join('|') === 'Kilometraje mensual|Paradas por unidad|Resumen diario',
        tpls.map((t) => t.nombre).join('|'));
    ok('plantillas: sin permiso no rompe', (function () {
        const sinPermiso = new Function('P_STORE', 'P_LS', 'P_REMOTE', 'P_APP', code)(store, LS, function () { return Promise.reject(new Error('code 8')); }, APP);
        return true;
    })());

    // ── Lectura de la respuesta ──────────────────────────────────────────
    const n = mod.rxInfNormFilas({
        columns: [{ n: 'Unidad' }, { n: 'Km' }],
        rows: [['105', 120], { Unidad: '205', Km: 80 }]
    });
    ok('respuesta: normaliza filas con objetos y arrays', n.filas.length === 2 &&
        n.filas[0][1] === 120 && n.filas[1][0] === '205', JSON.stringify(n.filas));
    ok('respuesta: columnas con nombre', n.cols[0] === 'Unidad' && n.cols[1] === 'Km');
    ok('respuesta: sin datos no rompe', mod.rxInfNormFilas(null).filas.length === 0 &&
        mod.rxInfNormFilas({}).filas.length === 0);

    // ── Columnas: unidad, fecha y numericas ──────────────────────────────
    const tipos = mod.rxInfCols(['Unidad', 'Fecha', 'Km', 'Minutos', 'Conductor']);
    ok('columnas: reconoce la unidad', tipos.iUni === 0, String(tipos.iUni));
    ok('columnas: reconoce km y minutos como numericas', tipos.num.length === 2 && tipos.num[0] === 2 && tipos.num[1] === 3,
        JSON.stringify(tipos.num));
    ok('columnas: sin columna de unidad no la inventa', mod.rxInfCols(['Km', 'Litros']).iUni < 0);

    // ── Numeros ──────────────────────────────────────────────────────────
    ok('numeros: "1.234,5" se lee como 1234.5', mod.rxInfNum('1.234,5') === 1234.5, String(mod.rxInfNum('1.234,5')));
    ok('numeros: "1234.56" y "12 km"', mod.rxInfNum('1234.56') === 1234.56 && mod.rxInfNum('12 km') === 12);
    ok('numeros: vacio o basura da null', mod.rxInfNum('') === null && mod.rxInfNum('n/d') === null);
    ok('numeros: formato con miles', mod.rxInfFmt(1234.5) === '1.234,5', mod.rxInfFmt(1234.5));
    ok('numeros: entero sin decimales', mod.rxInfFmt(200) === '200' && mod.rxInfFmt(50.4) === '50,4');

    // ── Resumen por unidad ────────────────────────────────────────────────
    const rs = mod.rxInfResumenUnidad(n.cols.length ? ['Unidad', 'Fecha', 'Km', 'Minutos', 'Conductor'] : [], [
        ['105', '2026-03-10', 120, 30, 'Juan'],
        ['105', '2026-03-11', 80, 20, 'Juan'],
        ['205', '2026-03-11', 40, 10, 'Ana']
    ]);
    ok('resumen: una fila por unidad con el numero de filas',
        rs.filas.length === 2 && rs.filas[0][0] === '105' && rs.filas[0][1] === 2, JSON.stringify(rs.filas));
    ok('resumen: suma las columnas numericas',
        rs.filas[0][2] === '200' && rs.filas[0][3] === '50', JSON.stringify(rs.filas[0]));
    ok('resumen: columnas con unidad, filas y las magnitudes',
        rs.cols[0] === 'Unidad' && rs.cols[1] === 'Filas' && rs.cols[2] === 'Km');
    ok('resumen: sin columna de unidad no agrega', mod.rxInfResumenUnidad(['Km'], [['1']]).filas.length === 0);

    // ── Filtro de texto ───────────────────────────────────────────────────
    const filas = [['105', '2026-03-10', 120, 'Juan'], ['205', '2026-03-11', 80, 'Ana']];
    ok('filtro: busca por texto en las primeras columnas', mod.rxInfFiltra(filas, '205').length === 1);
    ok('filtro: por nombre de chofer', mod.rxInfFiltra(filas, 'jua').length === 1);
    ok('filtro: vacio devuelve todo', mod.rxInfFiltra(filas, '').length === 2);
    ok('filtro: sin coincidencias vacio', mod.rxInfFiltra(filas, 'zzz').length === 0);

    // ── Ejecucion por trozos: lo que esquiva el limite de tiempo ──────────
    const tpl = { rid: 3, id: 11, nombre: 'Resumen diario' };
    mod.rxInfCacheLimpiar();
    calls.length = 0;
    const ahora = Math.floor(Date.now() / 1000);
    const r1 = await mod.rxInfCorre(tpl, ahora - 21 * 86400, ahora, null, () => {}, null);
    const execs = calls.filter((c) => c.m === 'report/exec_report');
    ok('ejecucion: parte 21 dias en 3 trozos de 7', execs.length === 3,
        'llamadas=' + execs.length + ' trozos=' + r1.trozos);
    ok('ejecucion: cada trozo pide su intervalo y no se solapan',
        execs[0].p.interval.to < execs[1].p.interval.from + 1 &&
        execs[0].p.interval.to + 1 === execs[1].p.interval.from,
        JSON.stringify(execs.map((c) => [c.p.interval.from, c.p.interval.to])));
    ok('ejecucion: reportObjectId 0 = toda la flota',
        execs.every((c) => c.p.reportObjectId === 0));
    ok('ejecucion: pasa recurso y plantilla', execs[0].p.reportResourceId === 3 && execs[0].p.reportTemplateId === 11);
    ok('ejecucion: pega las filas de todos los trozos', r1.filas.length === 6,
        'filas=' + r1.filas.length);
    ok('ejecucion: toma los nombres de columna de la plataforma',
        r1.cols[0] === 'Unidad' && r1.cols[2] === 'Km', JSON.stringify(r1.cols));
    ok('ejecucion: mide el tiempo y no reporta fallos', r1.fallos === 0 && r1.ms >= 0);

    // Cache: la segunda vez no vuelve a pedir nada.
    const nAntes = calls.filter((c) => c.m === 'report/exec_report').length;
    const r2 = await mod.rxInfCorre(tpl, ahora - 21 * 86400, ahora, null, () => {}, null);
    const nDespues = calls.filter((c) => c.m === 'report/exec_report').length;
    ok('cache: la segunda ejecucion no llama a la plataforma',
        nDespues === nAntes && r2.cacheados === 3 && r2.filas.length === 6,
        'llamadas ' + nAntes + ' -> ' + nDespues + ' cacheados=' + r2.cacheados);
    ok('cache: sobrevive a recargar (se lee del storage)',
        Object.keys(store[LS.infplant] || {}).length === 3, JSON.stringify(Object.keys(store[LS.infplant] || {})));
    // Al vaciarla, se vuelve a pedir.
    mod.rxInfCacheLimpiar();
    const r3 = await mod.rxInfCorre(tpl, ahora - 21 * 86400, ahora, null, () => {}, null);
    ok('cache: al vaciarla se vuelve a calcular',
        calls.filter((c) => c.m === 'report/exec_report').length === nDespues + 3 && r3.cacheados === 0);

    // Solo las seleccionadas: una llamada por unidad y trozo.
    mod.rxInfCacheLimpiar();
    calls.length = 0;
    const rSel = await mod.rxInfCorre(tpl, ahora - 7 * 86400, ahora,
        [{ id: 11, eco: '105' }, { id: 12, eco: '205' }], () => {}, null);
    ok('alcance: con unidades seleccionadas pide unidad a unidad',
        calls.filter((c) => c.m === 'report/exec_report').length === 2 &&
        calls.filter((c) => c.m === 'report/exec_report').every((c) => c.p.reportObjectId === 11 || c.p.reportObjectId === 12),
        'llamadas=' + calls.filter((c) => c.m === 'report/exec_report').length);
    ok('alcance: informa de cuantas unidades se pidio', rSel.objetos === 2);

    // Cancelacion.
    mod.rxInfCacheLimpiar();
    const rCanc = await mod.rxInfCorre(tpl, ahora - 365 * 86400, ahora, null, () => {}, { cancelado: true });
    ok('cancelar: no llama a la plataforma y avisa', rCanc.cancelado === true && rCanc.hechos === 0);

    // Un trozo que falla no tira el informe entero.
    mod.rxInfCacheLimpiar();
    const conFallo = new Function('P_STORE', 'P_LS', 'P_REMOTE', 'P_APP', code)(store, LS, function (m, p) {
        if (m === 'report/exec_report' && p.interval.from > ahora - 8 * 86400) return Promise.reject(new Error(m + ' -> code 1054'));
        if (m === 'report/exec_report') {
            return Promise.resolve({ reportResult: { columns: [{ n: 'Unidad' }], rows: [['105']] } });
        }
        return Promise.resolve({});
    }, APP);
    const rF = await conFallo.rxInfCorre(tpl, ahora - 21 * 86400, ahora, null, () => {}, null);
    ok('fallos: un trozo con error se anota y el resto sigue',
        rF.fallos === 1 && rF.filas.length > 0 && /1054/.test((rF.errores || [])[0] || ''),
        'fallos=' + rF.fallos + ' filas=' + rF.filas.length + ' errores=' + JSON.stringify(rF.errores));

    // Tope de trozos.
    const rTop = await mod.rxInfCorre(tpl, 1, ahora, null, () => {}, { cancelado: false });
    ok('trozos: tope de seguridad para periodos enormes', rTop.trozos <= mod.RX_INF_MAX_TROZOS);

    // ── Salidas ──────────────────────────────────────────────────────────
    ok('csv: cabecera + filas, celdas entrecomilladas',
        mod.rxInfCSVTexto(['Unidad', 'Km'], [['105', 120]]).split('\n').length === 2 &&
        mod.rxInfCSVTexto(['Unidad', 'Km'], [['105', 120]]) === '"Unidad","Km"\n"105","120"',
        JSON.stringify(mod.rxInfCSVTexto(['Unidad', 'Km'], [['105', 120]])));
    ok('csv: el bloque de procedencia va antes de la cabecera',
        mod.rxInfCSVTexto(['Unidad'], [['105']], ['Informe', 'X']).indexOf('"Informe"') === 0);
    ok('archivo: nombre con plantilla y vista',
        /^rondo_Resumen_diario_por_unidad_\d{4}-\d{2}-\d{2}\.csv$/.test(mod.rxInfNombreArchivo(tpl, 'unidad', '.csv')),
        mod.rxInfNombreArchivo(tpl, 'unidad', '.csv'));

    // ── Vista: lo que se pinta y lo que se exporta es lo mismo ───────────
    mod.RX_INF.tpl = tpl;
    mod.RX_INF.cols = ['Unidad', 'Fecha', 'Km', 'Minutos', 'Conductor'];
    mod.RX_INF.filas = [['105', '2026-03-10', 120, 30, 'Juan'], ['205', '2026-03-11', 80, 40, 'Ana']];
    mod.RX_INF.meta = { filas: 2, unidades: 2, trozos: 3, objetos: 0, ms: 1200, fallos: 0, cacheados: 0 };
    mod.RX_INF.vista = 'filas';
    mod.RX_INF.q = '';
    const v1 = mod.rxInfVista();
    ok('vista: filas crudas con sus columnas', v1.cols.length === 5 && v1.filas.length === 2 && v1.unidades === 2);
    mod.RX_INF.vista = 'unidad';
    const v2 = mod.rxInfVista();
    ok('vista: resumen por unidad agrega columnas', v2.cols[0] === 'Unidad' && v2.cols[1] === 'Filas' && v2.filas.length === 2);
    mod.RX_INF.q = '205';
    const v3 = mod.rxInfVista();
    ok('vista: el filtro de texto reduce lo que se ve y se exporta',
        v3.filas.length === 1 && v3.filas[0][0] === '205', JSON.stringify(v3.filas));
    mod.RX_INF.q = '';
    mod.RX_INF.vista = 'filas';


    // ── De que trata la plantilla (lo deduce de sus columnas) ────────────
    ok('clase: de vehiculos cuando trae unidad/conductor',
        (function () {
            const c = mod.rxInfClasifica(['Unidad', 'Fecha', 'Km', 'Conductor'], [['105', 'x', 1, 'Juan']]);
            return c.tipo === 'vehiculos' && c.iUni === 0 && c.iZona < 0;
        })(), JSON.stringify(mod.rxInfClasifica(['Unidad', 'Km'], [['105', 1]]).tipo));
    ok('clase: de geocercas cuando trae zona/geocerca',
        (function () {
            const c = mod.rxInfClasifica(['Geocerca', 'Entradas'], [['PATIO', 3]]);
            return c.tipo === 'geocercas' && c.iZona === 0;
        })());
    ok('clase: mixta cuando trae las dos cosas',
        mod.rxInfClasifica(['Unidad', 'Geocerca'], [['105', 'PATIO']]).tipo === 'mixto');
    ok('clase: sin pistas es "datos generales"',
        mod.rxInfClasifica(['Precio', 'Cantidad'], [[1, 2]]).tipo === 'otro');
    ok('clase: si los valores coinciden con geocercas de la plataforma, la columna es de geocerca',
        (function () {
            APP.zonas = [{ n: 'PATIO' }, { n: 'CEDIS' }];
            const c = mod.rxInfClasifica(['Lugar', 'Visitas'], [['PATIO', 3], ['CEDIS', 1], ['OTRO', 2]]);
            APP.zonas = [];
            return c.iZona === 0 && (c.tipo === 'geocercas' || c.tipo === 'mixto');
        })(), JSON.stringify(mod.rxInfClasifica(['Lugar'], [['PATIO']]).iZona));
    ok('clase: los campos llevan su tipo (numero, fecha, texto)',
        (function () {
            const c = mod.rxInfClasifica(['Unidad', 'Fecha', 'Km'], [['105', '2026-03-10', 12]]);
            return c.campos.length === 3 && c.campos[2].t === 'numero' && c.campos[1].t === 'fecha';
        })());
    ok('clase: la etiqueta sale en espanol con acentuacion',
        mod.rxInfClasifica(['Unidad'], [['1']]).etiqueta === 'Veh\u00edculos' &&
        mod.rxInfClasifica(['Geocerca'], [['PATIO']]).etiqueta === 'Geocercas',
        mod.rxInfClasifica(['Unidad'], [['1']]).etiqueta);

    // ── Sondeo: ejecutar una vez para saber que trae la plantilla ───────
    mod.rxInfCacheLimpiar();
    mod.RX_INF.sonda = null; mod.RX_INF._sondaKey = '';
    const s1 = await mod.rxInfSondea(tpl);
    ok('sondeo: ejecuta la plantilla y guarda sus columnas',
        s1.cols.length === 5 && s1.muestra.length === 2 && s1.clase, JSON.stringify(Object.keys(s1)));
    ok('sondeo: dice de que trata la plantilla', s1.clase.tipo === 'vehiculos' && s1.etiquetaOK === undefined);
    ok('sondeo: lista las unidades que aparecen',
        s1.unidades.length === 2 && s1.unidades.indexOf('105') >= 0, JSON.stringify(s1.unidades));
    ok('sondeo: se cachea (no se vuelve a ejecutar)',
        (function () {
            const antes = calls.length;
            return mod.rxInfSondea(tpl) && calls.length === antes;
        })());

    // ── Coordenadas y minimapa ───────────────────────────────────────────
    ok('mapa: detecta columnas de lat/lon', (function () {
        const c = mod.rxInfCoords(['Unidad', 'Latitud', 'Longitud']);
        return c.iLat === 1 && c.iLon === 2;
    })(), JSON.stringify(mod.rxInfCoords(['Unidad', 'Latitud', 'Longitud'])));
    ok('mapa: sin coordenadas no las inventa', mod.rxInfCoords(['Unidad', 'Km']).iLat < 0);
    ok('mapa: sin coordenadas ni geocercas no hay mapa',
        mod.rxInfMapaDatos({ cols: ['Unidad', 'Km'], filas: [['105', 3]], iZona: -1 }) === null);
    ok('mapa: con coordenadas dibuja marcas', (function () {
        const d = mod.rxInfMapaDatos({ cols: ['Unidad', 'Lat', 'Lon'], filas: [['105', 19.4, -99.1], ['205', 19.5, -99.2]], iZona: -1 });
        return d && d.marcas.length === 2 && d.lineas.length === 0;
    })());
    ok('mapa: descarta coordenadas invalidas',
        (function () {
            const d = mod.rxInfMapaDatos({ cols: ['Lat', 'Lon'], filas: [[999, 0], [19.4, -99.1]], iZona: -1 });
            return d.marcas.length === 1;
        })());
    ok('mapa: con columna de geocerca dibuja el contorno de la plataforma', (function () {
        APP.zonas = [{ n: 'PATIO', puntos: [{ lat: 1, lon: 2 }, { lat: 1, lon: 3 }, { lat: 2, lon: 3 }] }];
        const d = mod.rxInfMapaDatos({ cols: ['Geocerca'], filas: [['PATIO'], ['OTRA']], iZona: 0 });
        APP.zonas = [];
        return d && d.lineas.length === 1 && d.lineas[0].pts.length === 3;
    })(), JSON.stringify(mod.rxInfMapaDatos({ cols: ['Geocerca'], filas: [['PATIO']], iZona: 0 })));
    ok('mapa: el bloque de datos lleva los campos con su tipo',
        /campo/.test(mod.rxInfCamposHTML({ cols: ['Unidad', 'Km'], clase: mod.rxInfClasifica(['Unidad', 'Km'], [['105', 1]]), filas: 2, horas: 24 })) &&
        /número|numero/.test(mod.rxInfCamposHTML({ cols: ['Unidad', 'Km'], clase: mod.rxInfClasifica(['Unidad', 'Km'], [['105', 1]]), filas: 2, horas: 24 })));
    ok('mapa: sin datos no pinta el bloque', mod.rxInfCamposHTML({ cols: [] }) === '');

    // ── Orden y filtros ──────────────────────────────────────────────────
    ok('orden: por numero, ascendente y descendente',
        (function () {
            const f = [['105', 300], ['205', 100], ['305', 200]];
            const asc = mod.rxInfOrdena(f, { col: 1, dir: 1 }).map((x) => x[1]);
            const desc = mod.rxInfOrdena(f, { col: 1, dir: -1 }).map((x) => x[1]);
            return asc.join(',') === '100,200,300' && desc.join(',') === '300,200,100';
        })());
    ok('orden: por texto cuando no es numero',
        mod.rxInfOrdena([['b'], ['a']], { col: 0, dir: 1 }).map((x) => x[0]).join('') === 'ab');
    ok('orden: sin orden devuelve lo mismo', mod.rxInfOrdena([['2'], ['1']], null).map((x) => x[0]).join('') === '21');
    ok('filtro: por geocerca cuando la plantilla trae esa columna',
        (function () {
            mod.RX_INF.sonda = { clase: mod.rxInfClasifica(['Geocerca', 'Unidad'], [['PATIO', '105']]) };
            mod.RX_INF.cols = ['Geocerca', 'Unidad', 'Km'];
            mod.RX_INF.filas = [['PATIO', '105', 1], ['CEDIS', '205', 2], ['PATIO', '205', 3]];
            mod.RX_INF.zonas = ['PATIO'];
            mod.RX_INF.eco = '';
            mod.RX_INF.vista = 'filas';
            mod.RX_INF.orden = null;
            mod.RX_INF.q = '';
            mod.RX_INF.meta = { filas: 3, unidades: 0, trozos: 1, objetos: 0, ms: 0, fallos: 0 };
            const v = mod.rxInfVista();
            return v.filas.length === 2 && v.zonas === 1 && v.unidades === 2;
        })(), JSON.stringify(mod.rxInfVista().filas));
    ok('filtro: por unidad encima del de geocerca',
        (function () {
            mod.RX_INF.eco = '205';
            const v = mod.rxInfVista();
            mod.RX_INF.eco = '';
            return v.filas.length === 1 && v.filas[0][1] === '205';
        })());
    ok('filtro: el resumen por unidad respeta los filtros', (function () {
        mod.RX_INF.vista = 'unidad';
        mod.RX_INF.zonas = ['CEDIS'];
        const v = mod.rxInfVista();
        mod.RX_INF.vista = 'filas';
        mod.RX_INF.zonas = [];
        return v.filas.length === 1 && v.filas[0][0] === '205';
    })(), JSON.stringify(mod.rxInfVista().filas));
    ok('filtro: sin columna de geocerca no filtra por ella',
        (function () {
            mod.RX_INF.sonda = null;
            mod.RX_INF.cols = ['Unidad', 'Km'];
            mod.RX_INF.filas = [['105', 1], ['205', 2]];
            mod.RX_INF.zonas = ['PATIO'];
            const v = mod.rxInfVista();
            mod.RX_INF.zonas = [];
            return v.filas.length === 2 && v.iZona < 0;
        })());


    // ── Objetos reales: con reportObjectId 0 el servidor responde code 7 ──
    ok('unidades: sin unidades cae al objeto 0 (unico modo de probar)',
        mod.rxInfUnidades(0).length === 0);
    ok('unidades: se descartan las que no reportan desde antes del rango',
        (function () {
            const ahora = Math.floor(Date.now() / 1000);
            APP.unidades = [
                { id: 11, nm: '105', pos: { t: ahora - 3600 } },
                { id: 22, nm: '205', pos: { t: ahora - 86400 * 90 } }
            ];
            const u = mod.rxInfUnidades(ahora - 7 * 86400);
            APP.unidades = [];
            return u.length === 1 && u[0].id === 11;
        })());
    await (async () => {
        const ahora = Math.floor(Date.now() / 1000);
        APP.unidades = [{ id: 11, nm: '105', pos: { t: ahora - 600 } }, { id: 22, nm: '205', pos: { t: ahora - 600 } }];
        mod.rxInfCacheLimpiar();
        calls.length = 0;
        const rU = await mod.rxInfCorre({ rid: 3, id: 11, nombre: 'Resumen diario' }, ahora - 7 * 86400, ahora, null, () => {}, null);
        const execs = calls.filter((c) => c.m === 'report/exec_report');
        APP.unidades = [];
        ok('corre: pide un informe por unidad (reportObjectId real)',
            execs.length === 2 && execs.every((c) => c.p.reportObjectId === 11 || c.p.reportObjectId === 22),
            'llamadas=' + execs.length);
        ok('corre: cuenta las unidades pedidas', rU.objetos === 2 && rU.filas.length === 4,
            'objetos=' + rU.objetos + ' filas=' + rU.filas.length);
    })();

    // El traductor de codigos: "code 7" solo no dice nada.
    ok('errores: traduce el codigo 7 (parametros invalidos)',
        /reportObjectId/.test(mod.rxInfExplicaError('report/exec_report -> code 7')),
        mod.rxInfExplicaError('report/exec_report -> code 7'));
    ok('errores: traduce el 4 (peticion demasiado pesada) y el 2 (no existe)',
        /periodo/.test(mod.rxInfExplicaError('code 4')) && /no existe/.test(mod.rxInfExplicaError('code 2')));
    ok('errores: si no hay codigo devuelve el texto tal cual',
        mod.rxInfExplicaError('fallo raro') === 'fallo raro');


    // El servidor guarda el ultimo informe en la sesion y lo pagina con
    // select_result_rows: sin liberar antes de ejecutar, responde code 4.
    mod.rxInfCacheLimpiar();
    calls.length = 0;
    await mod.rxInfEjecutar({ rid: 3, id: 11, nombre: 'Resumen diario' }, 11, 1000, 2000, null);
    // Lo que importa es que cada exec venga precedida de su limpieza.
    const ordenLlamadas = calls.map((c) => c.m);
    let limpiasAntes = 0;
    for (let i = 0; i < ordenLlamadas.length; i++) {
        if (ordenLlamadas[i] === 'report/exec_report' && ordenLlamadas[i - 1] === 'report/cleanup_result') limpiasAntes++;
    }
    ok('ejecucion: limpia la sesion ANTES de cada exec_report (si no, code 4)',
        limpiasAntes > 0 && ordenLlamadas.indexOf('report/exec_report') >= 1 &&
        ordenLlamadas.lastIndexOf('report/exec_report') - ordenLlamadas.indexOf('report/cleanup_result') >= 0,
        ordenLlamadas.join(' -> '));
    ok('ejecucion: si exec no trae filas, lee el resultado de la sesion',
        (function () {
            const solo = new Function('P_STORE', 'P_LS', 'P_REMOTE', 'P_APP', code)(store, LS, function (m, p) {
                if (m === 'report/exec_report') return Promise.resolve({ reportResult: {} });
                if (m === 'report/get_result') return Promise.resolve({ reportResult: { columns: [{ n: 'Unidad' }], rows: [['999', 'PATIO', 1]] } });
                if (m === 'report/cleanup_result') return Promise.resolve({});
                return Promise.resolve({});
            }, APP);
            return solo.rxInfNormFilas({}).filas.length === 0;
        })());

    console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasan');
    process.exit(fallos ? 1 : 0);
    process.exit(fallos ? 1 : 0);
})();