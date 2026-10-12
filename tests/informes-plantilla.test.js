/*
 * Pruebas de los informes por plantilla (motor): ejecutar una plantilla de la
 * plataforma por report/exec_report, troceada, es lo que esquiva el limite de
 * tiempo del informe nativo. La lectura es SINCRONA (el resultado viene en la
 * respuesta).
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
    'function glocOrigen(z){ return { id: (z && z.app) ? "app" : "plat" }; }',
    'function rxGeoInfYield(){ return new Promise((r) => { try { setTimeout(r, 0); } catch (_) { r(); } }); }',
    'function remoteCall(m, p){ return P_REMOTE(m, p); }'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn {RX_INF,RX_INF_DIAS_TROZO,RX_INF_MAX_TROZOS,RX_INF_MAX_OBJETOS,rxInfPlantillas,rxInfNormFilas,rxInfExtrae,' +
    'rxInfCols,rxInfResumenUnidad,rxInfNum,rxInfFmt,rxInfFiltra,rxInfClave,rxInfTplDeClave,rxInfEjecuta,rxInfCorre,' +
    'rxInfCacheCargar,rxInfCachePoner,rxInfCacheLimpiar,rxInfCacheKey,rxInfCSVTexto,rxInfNombreArchivo,' +
    'rxInfPlantillaInfo,rxInfZonasPlataforma,rxInfUnidades,rxInfExplicaError,rxInfOrdena,rxInfPista,' +
    'rxInfEsDeGeocercas,rxInfClasifica,rxInfColumnasVacias,rxInfZonaDeFila,rxInfDatosPlantilla,rxInfZonasDisponibles};';

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

const calls = [];
let umbral1004 = 0;   // si un intervalo supera esto, la plataforma da code 1004
let soloObjeto = null; // si se fija, solo ese reportObjectId devuelve filas
let soloDef = false;   // si se activa, solo la plantilla propia (sin filtros) devuelve filas
let tablaReal = false; // exec_report responde con TABLAS y el contenido va en get_result_rows
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
    if (m === 'report/get_report_data') {
        const id = String((p.col || [])[0] || '');
        if (id === '12') {
            return Promise.resolve([{
                id: 12, n: 'GEOCERCA', ct: 'avl_geozone',
                tbl: [{ n: 't', l: 'Unidades', c: '["unit","zone"]', cl: '["Unidad","Geocerca"]', p: '{"units":"27418488"}' }]
            }]);
        }
        return Promise.resolve([{
            id: Number(id) || 11, n: 'Resumen diario', ct: 'avl_unit',
            tbl: [{ n: 't', l: 'Resumen', c: '["unit","km"]', cl: '["Unidad","Km"]', p: '{}' }]
        }]);
    }
    if (m === 'report/exec_report') {
        if (umbral1004 && (p.interval.to - p.interval.from) > umbral1004) {
            return Promise.reject(new Error('report/exec_report -> code 1004'));
        }
        // Si soloDef esta activo, solo la plantilla PROPIA (reportTemplateId 0
        // con reportTemplate) devuelve filas; el resto da parametros invalidos.
        if (soloDef && p.reportTemplateId !== 0) {
            return Promise.reject(new Error('report/exec_report -> code 4'));
        }
        // Si soloObjeto esta fijado, solo ese item devuelve filas (sirve para
        // comprobar que el motor prueba modelos hasta dar con el bueno).
        if (!soloDef && soloObjeto != null && String(p.reportObjectId) !== String(soloObjeto)) {
            return Promise.resolve({ reportResult: { columns: [{ n: 'Unidad' }, { n: 'Km' }], rows: [] } });
        }
        if (tablaReal) {
            return Promise.resolve({
                reportResult: { tables: [{ name: 't', label: 'Resumen', rows: 2, header: ['Unidad', 'Km'] }] }
            });
        }
        return Promise.resolve({
            reportResult: { columns: [{ n: 'Unidad' }, { n: 'Km' }], rows: [['105', 1], ['205', 2]] }
        });
    }
    // El contenido de la tabla se pide aparte, como en la plataforma real.
    if (m === 'report/get_result_rows') {
        if (!tablaReal) return Promise.resolve([]);
        return Promise.resolve([
            { n: 0, c: [{ t: '', v: 7 }, { t: '1', v: 1 }] },
            { n: 1, c: [{ t: '', v: 7 }, { t: '2', v: 2 }] }
        ]);
    }
    return Promise.resolve({});
}

const APP = { zonas: [], unidades: [], historial: [], viajes: {}, config: {}, unlocked: false };
const mod = new Function('P_STORE', 'P_LS', 'P_APP', 'P_REMOTE', code)(store, LS, APP, remote);

function execs() { return calls.filter((c) => c.m === 'report/exec_report'); }

(async function () {
    // 1) Listado de plantillas.
    const tpls = await mod.rxInfPlantillas();
    ok('plantillas: lee las plantillas del recurso',
        tpls.length === 3 && tpls.some((t) => t.rid === 3 && t.id === 11) &&
        tpls.some((t) => t.rid === 4 && t.id === 21));
    ok('plantillas: ordenadas por nombre',
        tpls.map((t) => t.nombre).join('|') === 'Kilometraje mensual|Paradas por unidad|Resumen diario',
        tpls.map((t) => t.nombre).join('|'));
    ok('plantillas: clave y vuelta',
        mod.rxInfClave({ rid: 3, id: 11 }) === '3:11' &&
        mod.rxInfTplDeClave('3:11').id === '11');

    // 2) Normalizacion de filas y extractor por capas.
    const nf = mod.rxInfNormFilas({ columns: [{ n: 'A' }, { n: 'B' }], rows: [['x', 1]] });
    ok('filas: normaliza columnas y filas', nf.cols[0] === 'A' && nf.filas[0][0] === 'x');
    const a = mod.rxInfExtrae({ reportResult: { columns: [{ n: 'U' }], rows: [['a'], ['b']] } });
    const b = mod.rxInfExtrae({ reportLayer: '[[1,2],[3,4],[5,6]]', layerCount: 3 });
    const c = mod.rxInfExtrae({ reportResult: { bands: [{ rows: [['x', 'y']] }] } });
    ok('extractor: se queda con la tabla que mas filas trae',
        a.filas.length === 2 && b.filas.length === 3 && c.filas.length === 1 && c.filas[0][1] === 'y');

    // 3) Columnas y resumen por unidad.
    const tipos = mod.rxInfCols(['Unidad', 'Km', 'Minutos']);
    ok('columnas: reconoce la unidad y lo numerico',
        tipos.iUni === 0 && tipos.num.indexOf(1) >= 0 && tipos.num.indexOf(2) >= 0);
    const res = mod.rxInfResumenUnidad(['Unidad', 'Km'], [['105', '1.234,5'], ['105', '2'], ['205', '3']], mod.rxInfCols(['Unidad', 'Km']));
    ok('resumen por unidad: suma y agrupa',
        res.cols[0] === 'Unidad' && res.filas[0][0] === '105' && res.filas[0][2] === '1.236,5',
        JSON.stringify(res.filas));
    ok('numeros: "1.234,5" se lee como 1234.5', mod.rxInfNum('1.234,5') === 1234.5);
    ok('numeros: se pintan en espanol', mod.rxInfFmt(1234.5) === '1.234,5');

    // 4) Info de la plantilla (report/get_report_data).
    const info = mod.rxInfPlantillaInfo(await mod.rxInfDatosPlantilla({ rid: 3, id: 12 }), 12);
    ok('plantilla: lee tipo, columnas y filtros guardados',
        info && info.esGeo === true && info.columnas.indexOf('Geocerca') >= 0 &&
        info.params[0].k === 'units' && info.params[0].v === '27418488',
        JSON.stringify(info && info.params));

    // 5) Objetos: geocercas de la plataforma (con su recurso dueño) y unidades.
    APP.zonas = [
        { id: 119, n: 'PATIO', _rid: 27414156 },
        { id: 3, n: 'TESTEO', _rid: 999 },
        { id: 5, n: 'DE RONDO', app: true }
    ];
    const zs = mod.rxInfZonasPlataforma();
    ok('objetos: la geocerca lleva su recurso dueño y se descartan las de Rondo',
        zs.length === 2 && zs[0].rid === 27414156 && zs[0].id === '119' && zs[1].id === '3',
        JSON.stringify(zs));
    APP.unidades = [{ id: 7, nm: '105' }, { id: 8, nm: '205' }];
    ok('objetos: la flota sale de las unidades', mod.rxInfUnidades(0).length === 2);

    // 6) Ejecucion sincrona: el resultado viene en la respuesta.
    mod.rxInfCacheLimpiar();
    calls.length = 0;
    const tplU = { rid: 3, id: 11, nombre: 'Resumen diario' };
    const t0 = 1700000000, unDia = 86400;
    const r = await mod.rxInfCorre(tplU, t0, t0 + 14 * unDia - 1, null, null, null);
    ok('ejecucion: lee las filas de la respuesta sincrona',
        r.filas.length === 8 && r.cols[0] === 'Unidad', 'filas=' + r.filas.length);
    ok('ejecucion: trocea el periodo (2 semanas = 2 trozos por unidad)',
        r.trozos === 2 && r.objetos === 2 && execs().length === 4, 'execs=' + execs().length);
    ok('ejecucion: manda el intervalo elegido',
        execs()[0].p.interval.from === t0 && execs()[0].p.reportObjectId === 3 &&
        execs()[0].p.reportObjectSecId === '7', JSON.stringify(execs()[0].p));

    // 7) Cache: la segunda pasada no vuelve a preguntar.
    calls.length = 0;
    await mod.rxInfCorre(tplU, t0, t0 + 14 * unDia - 1, null, null, null);
    ok('cache: repetir el informe no repite llamadas', execs().length === 0);

    // 7b) exec_report NO trae las filas: vienen de report/get_result_rows.
    mod.rxInfCacheLimpiar();
    calls.length = 0;
    tablaReal = true;
    const rt = await mod.rxInfCorre(tplU, t0, t0 + 7 * unDia - 1, null, null, null);
    tablaReal = false;
    ok('filas: pide el contenido con report/get_result_rows',
        rt.filas.length === 4 && rt.cols[0] === 'Unidad' && rt.filas[0][1] === '1' &&
        rt.filas[0][0] === '105' &&
        calls.some((c) => c.m === 'report/get_result_rows'),
        JSON.stringify({ filas: rt.filas.length, cols: rt.cols, pide: calls.some((c) => c.m === 'report/get_result_rows') }));

    // 8) Plantilla de geocercas: se prueban los modelos de objeto y se usa el
    //    que devuelve filas (secId de geocerca NO vale: la doc dice que es
    //    driver/trailer).
    mod.rxInfCacheLimpiar();
    calls.length = 0;
    mod.RX_INF.zonas = ['PATIO'];
    const tplG = { rid: 3, id: 12, nombre: 'GEOCERCA' };
    const rg = await mod.rxInfCorre(tplG, t0, t0 + 7 * unDia - 1, null, null, null);
    ok('geocercas: se ejecuta por la geocerca marcada (modelo por geocerca)',
        rg.objetos === 1 && rg.alcance === 'geocercas' && rg.filas.length > 0, 'objetos=' + rg.objetos);
    ok('geocercas: usa el recurso dueño de la zona y su id como secundario',
        execs()[0].p.reportObjectId === 27414156 && execs()[0].p.reportObjectSecId === '119',
        JSON.stringify(execs()[0].p));
    mod.RX_INF.zonas = [];

    // 8b) El informe entero viene vacio, pero la plantilla trae guardada una
    //     unidad (units): se acaba usando ESA unidad como reportObjectId.
    mod.rxInfCacheLimpiar();
    calls.length = 0;
    soloObjeto = '27418488';
    const rg2 = await mod.rxInfCorre(tplG, t0, t0 + 7 * unDia - 1, null, null, null);
    soloObjeto = null;
    ok('geocercas: si el informe entero sale vacio, usa la unidad guardada en la plantilla',
        rg2.filas.length > 0 && execs().some((c) => String(c.p.reportObjectId) === '27418488' && c.p.reportObjectSecId === '0'),
        JSON.stringify(execs().map((c) => [c.p.reportObjectId, c.p.reportObjectSecId])));

    // 8c) Ningun modelo normal vale (todos code 4): se ejecuta la plantilla
    //     PROPIA sin sus filtros guardados (reportTemplateId 0 + el template
    //     con "units" quitado).
    mod.rxInfCacheLimpiar();
    calls.length = 0;
    soloDef = true;
    const rg3 = await mod.rxInfCorre(tplG, t0, t0 + 7 * unDia - 1, null, null, null);
    soloDef = false;
    const conDef = execs().filter((c) => c.p.reportTemplateId === 0 && c.p.reportTemplate);
    const pDef = conDef.length ? JSON.parse(conDef[0].p.reportTemplate.tbl[0].p) : {};
    ok('geocercas: si ningun modelo vale, ejecuta la plantilla sin filtros',
        rg3.filas.length > 0 && conDef.length > 0 && pDef.units === undefined,
        JSON.stringify({ filas: rg3.filas.length, def: conDef.length, p: pDef }));

    // 9) Particion adaptativa ante el code 1004 (intervalo demasiado grande).
    umbral1004 = 7 * unDia;
    const rp = await mod.rxInfEjecuta(tplG, { id: '119', rid: 27414156 }, t0, t0 + 10 * unDia - 1, null, 0);
    umbral1004 = 0;
    ok('1004: parte el trozo por la mitad y pega las dos mitades',
        rp.filas.length === 4 && !rp.error, 'filas=' + rp.filas.length + ' err=' + rp.error);

    // 10) Traduccion de errores.
    ok('errores: traduce el codigo 1004',
        /1004/.test(mod.rxInfExplicaError('report/exec_report -> code 1004')));
    ok('errores: traduce el codigo 1003 (ocupado)',
        /1003/.test(mod.rxInfExplicaError('code 1003')));

    // 11) Clasificacion, pistas y utilidades.
    const cl = mod.rxInfClasifica(['Unidad', 'Geocerca', 'Km'], [['105', 'PATIO', 3]]);
    ok('clasifica: detecta vehiculos y geocercas',
        cl.iZona === 1 && cl.iUni === 0 && cl.tipo === 'mixto');
    ok('pistas: el nombre delata el tipo',
        mod.rxInfPista({ nombre: 'GEOCERCA' }) === 'geocercas' &&
        mod.rxInfPista({ nombre: 'Informe de Combustible' }) === 'vehiculos' &&
        mod.rxInfPista({ nombre: 'test' }) === '');
    const ordenado = mod.rxInfOrdena([['b'], ['a']], { col: 0, dir: 1 }, ['c']);
    ok('ordena: por texto ascendente', ordenado[0][0] === 'a');
    const csv = mod.rxInfCSVTexto(['A', 'B'], [['1', '2']]);
    ok('csv: cabecera y filas con comillas', /"A"/.test(csv) && /"1"/.test(csv));
    ok('columnas vacias: detecta las que no traen datos',
        mod.rxInfColumnasVacias(['A', 'B'], [['x', '']]).join(',') === 'B');
    ok('nombre de archivo: incluye la plantilla y la vista',
        /rondo_Resumen_diario_filas_\d{4}-\d{2}-\d{2}\.csv/.test(mod.rxInfNombreArchivo(tplU, 'filas', '.csv')));

    console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasan');
    process.exit(fallos ? 1 : 0);
})();
