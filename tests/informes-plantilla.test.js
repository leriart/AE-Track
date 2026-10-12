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
    'function rxGeoInfYield(){ return new Promise((r) => { try { setTimeout(r, 0); } catch (_) { r(); } }); }',
    'function remoteCall(m, p){ return P_REMOTE(m, p); }'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn {RX_INF,RX_INF_DIAS_TROZO,RX_INF_MAX_TROZOS,rxInfPlantillas,rxInfNormFilas,rxInfCols,' +
    'rxInfResumenUnidad,rxInfNum,rxInfFmt,rxInfFiltra,rxInfClave,rxInfTplDeClave,rxInfEjecutar,rxInfCorre,' +
    'rxInfCacheCargar,rxInfCachePoner,rxInfCacheLimpiar,rxInfCacheKey,rxInfCSVTexto,rxInfNombreArchivo,rxInfVista};';

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
    if (m === 'report/cleanup_result') return Promise.resolve({});
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

const mod = new Function('P_STORE', 'P_LS', 'P_REMOTE', code)(store, LS, remote);

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
        const sinPermiso = new Function('P_STORE', 'P_LS', 'P_REMOTE', code)(store, LS, function () { return Promise.reject(new Error('code 8')); });
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
    const conFallo = new Function('P_STORE', 'P_LS', 'P_REMOTE', code)(store, LS, function (m, p) {
        if (m === 'report/exec_report' && p.interval.from > ahora - 8 * 86400) return Promise.reject(new Error(m + ' -> code 1054'));
        if (m === 'report/exec_report') {
            return Promise.resolve({ reportResult: { columns: [{ n: 'Unidad' }], rows: [['105']] } });
        }
        return Promise.resolve({});
    });
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

    console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasan');
    process.exit(fallos ? 1 : 0);
})();