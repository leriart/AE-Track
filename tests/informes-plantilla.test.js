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
    'function zoneAt(lat, lon){ return (lat != null && Math.abs(lat - 19.4) < 0.01) ? "PATIO" : ""; }',
    'function haversine(y1, x1, y2, x2){ const dy = (y2 - y1), dx = (x2 - x1); return Math.sqrt(dy * dy + dx * dx) * 111320; }',
    'function rxFechaHora(ms){ return String(ms); }',
    'function clamp(v, lo, hi){ return Math.min(Math.max(v, lo), hi); }',
    'function rxGeoInfYield(){ return new Promise((r) => { try { setTimeout(r, 0); } catch (_) { r(); } }); }',
    'function remoteCall(m, p){ return P_REMOTE(m, p); }'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn {RX_INF,RX_INF_DIAS_TROZO,RX_INF_MAX_TROZOS,RX_INF_MAX_OBJETOS,rxInfPlantillas,rxInfNormFilas,rxInfExtrae,' +
    'rxInfCols,rxInfResumenUnidad,rxInfNum,rxInfFmt,rxInfFiltra,rxInfClave,rxInfTplDeClave,rxInfEjecuta,rxInfCorre,' +
    'rxInfCacheCargar,rxInfCachePoner,rxInfCacheLimpiar,rxInfCacheKey,rxInfCSVTexto,rxInfNombreArchivo,' +
    'rxInfPlantillaInfo,rxInfZonasPlataforma,rxInfUnidades,rxInfExplicaError,rxInfOrdena,rxInfPista,' +
    'rxInfEsDeGeocercas,rxInfClasifica,rxInfColumnasVacias,rxInfZonaDeFila,rxInfDatosPlantilla,rxInfZonasDisponibles,' +
    'rxInfFiltrosDe,rxInfFiltroValor,rxInfFiltroResuelve,rxInfDefFiltros,rxInfVisibles,rxInfRecortaVisible,RX_INF_MAX_TABLAS,' +
    'rxInfDefSoloTablas,' +
    'rxInfLista,rxInfItemsTipo,rxInfPrecargaItems,rxInfObjetosTipo,' +
    'rxFuelNivel,rxFuelMotor,rxFuelMsg,rxFuelDetecta,rxFuelCorre,rxFuelSensores,rxFuelUnidadesTodas,' +
    'rxFuelTplCombustible,rxFuelEsTpl,RX_FUEL_TPL,rxFuelTieneMarca,rxFuelFiltraMarca,' +
    'rxFuelMetricas,rxFuelVeredicto,rxFuelClaves,rxFuelCatalogo,rxFuelParamsVistos,rxFuelLimpia,rxFuelAgrupa,' +
    'rxFuelTablaDescarga,rxFuelTplDescarga,rxFuelUsaPlataforma,' +
    'rxFuelParseFecha,rxFuelMapeaColsDescarga,rxFuelTablaSalida,rxFuelCorrePlataforma,RX_FUEL_DESC_COLS};';

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
let tablaThefts = false; // exec_report responde con la tabla unit_thefts (Descargas)
let fuelMsgs = null;   // historial que devuelve messages/load_interval (combustible)
function remote(m, p) {
    calls.push({ m: m, p: p });
    if (m === 'messages/load_interval') return Promise.resolve({ messages: fuelMsgs || [] });
    if (m === 'core/search_items') {
        const it = p && p.spec && p.spec.itemsType;
        if (it === 'avl_unit_group') return Promise.resolve({ items: [{ id: 501, nm: 'GRUPO NORTE' }] });
        if (it === 'avl_driver') return Promise.resolve({ items: [{ id: 601, nm: 'JUAN PEREZ' }] });
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
        if (tablaThefts) {
            return Promise.resolve({
                reportResult: { tables: [
                    { name: 'unit_thefts', label: 'Descargas de Combustible', rows: 2, columns: 8,
                      header: ['Comienzo', 'Posición inicial', 'Hora', 'Nivel de combustible inicial', 'Velocidad inicial', 'Descargado', 'Nivel de combustible final', 'Nombre del sensor'] }
                ] }
            });
        }
        if (tablaReal) {
            return Promise.resolve({
                reportResult: { tables: [
                    { name: 'geozone_units', label: 'Unidades', rows: 2, columns: 4, header: ['Unidad', 'Hora de entrada', 'Hora de salida', 'Duración en'], header_type: ['unit_name', 'time_begin', 'time_end', 'duration_in'] },
                    { name: 'fuel', label: 'Consumo', rows: 1, columns: 2, header: ['Unidad', 'Consumo'] }
                ] }
            });
        }
        return Promise.resolve({
            reportResult: { columns: [{ n: 'Unidad' }, { n: 'Km' }], rows: [['105', 1], ['205', 2]] }
        });
    }
    // El contenido de la tabla se pide aparte, como en la plataforma real.
    if (m === 'report/get_result_rows') {
        if (tablaThefts) {
            return Promise.resolve([
                { n: 0, d: 0, c: [{ t: '2026-10-14 13:36:25', v: 1792000585 }, { t: 'GEOCERCA TESTEO STS', y: 20.84390, x: -102.70790 }, { t: '2026-10-14 13:38:25', v: 1792000705 }, '186,40 l', '0 km/h', '24,55 l', '161,85 l', 'DIESEL 1'] },
                { n: 1, d: 0, c: [{ t: '2026-10-14 13:36:25', v: 1792000585 }, { t: 'GEOCERCA TESTEO STS', y: 20.84390, x: -102.70790 }, { t: '2026-10-14 13:38:25', v: 1792000705 }, '180,00 l', '0 km/h', '20,00 l', '160,00 l', 'DIESEL 2'] }
            ]);
        }
        if (!tablaReal) return Promise.resolve([]);
        if (p.tableIndex === 1) {
            return Promise.resolve([{ n: 0, d: 0, c: ['CDOS.4286 - JY21236', '12,5 l'] }]);
        }
        return Promise.resolve([
            { n: 0, d: 0, c: ['CDOS.4286 - JY21236', { t: '14.09.2026 15:13:41', v: 1789420421, u: 7 }, { t: '14.09.2026 15:21:42', v: 1789420902, u: 7 }, '0:08:01'] },
            { n: 1, d: 0, c: ['CDOS.4286 - JY21236', { t: '15.09.2026 11:16:15', v: 1789492575, u: 7 }, { t: '15.09.2026 11:26:09', v: 1789493169, u: 7 }, '0:09:54'] }
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
        execs()[0].p.interval.from === t0 && String(execs()[0].p.reportObjectId) === '7' &&
        execs()[0].p.reportObjectSecId === '0', JSON.stringify(execs()[0].p));

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
        rt.filas.length === 4 && rt.cols[0] === 'Unidad' && rt.cols[3] === 'Duración en' &&
        rt.filas[0][0] === 'CDOS.4286 - JY21236' && rt.filas[0][3] === '0:08:01' &&
        calls.some((c) => c.m === 'report/get_result_rows'),
        JSON.stringify({ filas: rt.filas.length, cols: rt.cols, r0: rt.filas[0] }));
    ok('filas: la celda de texto plano no se pierde', mod.rxInfNum('0:08:01') === 481);
    const rDur = mod.rxInfResumenUnidad(['Unidad', 'Duración en'], [['105', '0:08:01'], ['105', '0:01:59']], mod.rxInfCols(['Unidad', 'Duración en']));
    ok('resumen: las duraciones se suman y se pintan como duracion',
        rDur.filas[0][2] === '0:10:00', JSON.stringify(rDur.filas));

    // 7c) Varias tablas: la principal y el consumo salen como pestanas.
    mod.rxInfCacheLimpiar();
    calls.length = 0;
    tablaReal = true;
    const rMul = await mod.rxInfCorre(tplU, t0, t0 + 7 * unDia - 1, null, null, null);
    tablaReal = false;
    ok('tablas: se leen todas las tablas del informe (consumo incluida)',
        rMul.tablas.length === 2 && rMul.tablas[1].label === 'Consumo' &&
        rMul.tablas[1].cols[1] === 'Consumo' && rMul.tablas[1].filas.length === 2,
        JSON.stringify(rMul.tablas.map((t) => [t.label, t.filas.length])));
    ok('tablas: la activa es la que mas filas tiene', rMul.filas.length === 4, 'filas=' + rMul.filas.length);

    // 7d) Filtros de la plantilla: se listan los utiles y se aplican.
    const infoF = {
        tablas: [{ filtros: ['units', 'geozones', 'address_format'] }],
        params: [{ k: 'us_units', v: '0' }, { k: 'units', v: '27418488' }]
    };
    const ksF = mod.rxInfFiltrosDe(infoF);
    ok('filtros: lista los utiles y descarta los ajustes de formato',
        ksF.join(',') === 'units,geozones', ksF.join(','));
    ok('filtros: el valor puesto a mano manda sobre el guardado',
        mod.rxInfFiltroValor(infoF, 'units') === '27418488');
    mod.RX_INF.filtros = { units: '105' };
    ok('filtros: un nombre de unidad se resuelve a su id',
        mod.rxInfFiltroResuelve('units', '105') === '7', mod.rxInfFiltroResuelve('units', '105'));
    const defF = mod.rxInfDefFiltros([{ id: 12, n: 'G', tbl: [{ n: 't', l: 'x', c: '[]', cl: '[]', p: '{"units":"27418488","otros":"k"}' }] }], 12, { units: '', geozones: '119' });
    const pF = JSON.parse(defF.tbl[0].p);
    ok('filtros: vacio quita el guardado y el nuevo se aplica',
        pF.units === undefined && pF.geozones === '119' && pF.otros === 'k', JSON.stringify(pF));
    mod.rxInfCacheLimpiar();
    calls.length = 0;
    await mod.rxInfCorre(tplU, t0, t0 + 7 * unDia - 1, null, null, null);
    const conDefF = execs().filter((c) => c.p.reportTemplateId === 0 && c.p.reportTemplate);
    ok('filtros: se mandan como definicion propia (reportTemplate)',
        conDefF.length > 0 && JSON.parse(conDefF[0].p.reportTemplate.tbl[0].p).units === '7',
        JSON.stringify(conDefF[0] && JSON.parse(conDefF[0].p.reportTemplate.tbl[0].p)));
    mod.RX_INF.filtros = {};

    // 7e) Columnas tipo Excel: ocultar y recortar.
    mod.RX_INF.colsOcultas = {};
    const visTodas = mod.rxInfVisibles(['a', 'b', 'c']).join(',');
    mod.RX_INF.colsOcultas = { 1: 1 };
    const visUna = mod.rxInfVisibles(['a', 'b', 'c']).join(',');
    const recC = mod.rxInfRecortaVisible(['a', 'b', 'c'], [['x', 'y', 'z']]);
    mod.RX_INF.colsOcultas = {};
    ok('columnas: se pueden ocultar y el recorte las quita',
        visTodas === '0,1,2' && visUna === '0,2' &&
        recC.cols.join(',') === 'a,c' && recC.filas[0].join(',') === 'x,z');

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
    ok('geocercas: usa el id de la geocerca como objeto (secundario 0)',
        String(execs()[0].p.reportObjectId) === '119' && execs()[0].p.reportObjectSecId === '0',
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

    // 12) Filtros declarados por la plantilla (filter_order) + resolucion de
    //     nombres de grupo/conductor.
    ok('filtros: rxInfLista acepta array, JSON y texto',
        mod.rxInfLista(['a', 'b']).join(',') === 'a,b' &&
        mod.rxInfLista('["units","geozones"]').join(',') === 'units,geozones' &&
        mod.rxInfLista('units, geozones').join(',') === 'units,geozones');
    const infoFOrder = mod.rxInfPlantillaInfo([{
        id: 11, n: 'R', ct: 'avl_unit',
        tbl: [{ n: 't', l: 'x', c: '["unit","km"]', cl: '["Unidad","Km"]', p: '{}', f: '["units","unit_groups","address_format"]' }]
    }], 11);
    ok('filtros: la plantilla declara su filter_order (sin guardar nada)',
        mod.rxInfFiltrosDe(infoFOrder).join(',') === 'units,unit_groups',
        mod.rxInfFiltrosDe(infoFOrder).join(','));
    // Definicion propia con SOLO la tabla de descargas (informe ligero).
    const defSolo = mod.rxInfDefSoloTablas([{
        id: 12, n: 'Informe de Combustible', p: '{"bind":{"avl_unit":["27899244"]},"descr":"X"}',
        tbl: [
            { n: 'unit_trips', l: 'Viajes', c: '[]', cl: '[]', p: '{}' },
            { n: 'unit_thefts', l: 'Descargas de Combustible', c: '[]', cl: '[]', p: '{}' }
        ]
    }], 12, ['unit_thefts']);
    ok('combustible: la definicion deja solo la tabla de descargas y quita el bind',
        defSolo && defSolo.tbl.length === 1 && defSolo.tbl[0].n === 'unit_thefts' &&
        JSON.parse(defSolo.p).bind === undefined && defSolo.id === 0 &&
        JSON.parse(defSolo.tbl[0].p).sensor_name === '*',
        JSON.stringify(defSolo && { id: defSolo.id, tbl: defSolo.tbl.map((x) => x.n), p: defSolo.p, tp: defSolo.tbl[0].p }));
    await mod.rxInfPrecargaItems({ tablas: [{ filtros: ['unit_groups'] }] });
    ok('filtros: un nombre de grupo se resuelve a su id',
        mod.rxInfFiltroResuelve('unit_groups', 'GRUPO NORTE') === '501',
        mod.rxInfFiltroResuelve('unit_groups', 'GRUPO NORTE'));
    await mod.rxInfPrecargaItems({ tablas: [{ filtros: ['drivers'] }] });
    ok('filtros: un nombre de conductor se resuelve a su id',
        mod.rxInfFiltroResuelve('drivers', 'JUAN PEREZ') === '601');
    ok('objetos: los grupos se listan como objetos ejecutables',
        (await mod.rxInfObjetosTipo('avl_unit_group', 3)).length === 1);

    // 13) Reporte de perdida de combustible (sensor).
    ok('combustible: lee el nivel por nombre de sensor',
        mod.rxFuelNivel({ params: { fuel: 42 } }, {}) === 42);
    ok('combustible: mapea el id numerico con el catalogo de sensores',
        mod.rxFuelNivel({ params: { 5: '37.5' } }, { 5: 'Nivel de combustible' }) === 37.5);
    // Catalogo real de Wialon (seq -> {id, n, p}): identifica el sensor de
    // combustible y acepta como clave su id o su parametro.
    const sensCat = { '1': { id: 7, n: 'Nivel de combustible', p: 'fuel1' }, '2': { id: 8, n: 'Temperatura' } };
    const clavesCat = mod.rxFuelClaves(sensCat);
    ok('combustible: el catalogo define las claves del sensor de combustible',
        clavesCat['fuel1'] === 1 && clavesCat['7'] === 1 && clavesCat['1'] === 1 &&
        clavesCat['8'] === undefined && clavesCat['Temperatura'] === undefined);
    ok('combustible: reconoce el nivel por el parametro del catalogo',
        mod.rxFuelNivel({ params: { fuel1: 30 } }, sensCat, clavesCat) === 30 &&
        mod.rxFuelNivel({ params: { 7: 22 } }, sensCat, clavesCat) === 22);
    ok('combustible: lista las claves de parametro vistas (diagnostico)',
        mod.rxFuelParamsVistos([{ params: { rpm: 1 } }, { params: { temp: 2, rpm: 3 } }]).join(',') === 'rpm,temp');
    ok('combustible: sin sensor de nivel devuelve null',
        mod.rxFuelNivel({ params: { temp: 12 } }, {}) === null);
    ok('combustible: motor encendido/apagado',
        mod.rxFuelMotor({ params: { engine: 1 } }, {}) === true &&
        mod.rxFuelMotor({ params: { ignition: 0 } }, {}) === false &&
        mod.rxFuelMotor({ params: { fuel: 12 } }, {}) === null);
    const mt = mod.rxFuelMsg({ t: 100, pos: { y: 19.4, x: -99.1, s: 0 }, params: { fuel: 90, engine: 0 } }, {});
    ok('combustible: la muestra lleva tiempo, posicion, velocidad, nivel y motor',
        mt.t === 100 && mt.s === 0 && mt.fuel === 90 && mt.motor === false);
    const base = 1700000000;
    const muestras = [
        { t: base, s: 0, fuel: 100, motor: false, lat: 19.4, lon: -99.1 },
        { t: base + 60, s: 0, fuel: 95, motor: false, lat: 19.4, lon: -99.1 },
        { t: base + 120, s: 0, fuel: 85, motor: false, lat: 19.4, lon: -99.1 },
        { t: base + 240, s: 40, fuel: 84, motor: false, lat: 19.4, lon: -99.1 }
    ];
    const evs = mod.rxFuelDetecta(muestras, { litros: 10, min: 2, vel: 3, motor: 'todos' });
    ok('combustible: detecta 10 L o mas en 1-2 min con la unidad detenida',
        evs.length === 1 && Math.round(evs[0].litros) === 15 && evs[0].min === 2 &&
        evs[0].lat === 19.4, JSON.stringify(evs));
    ok('combustible: una caida mas lenta que la ventana no cuenta',
        mod.rxFuelDetecta([
            { t: base, s: 0, fuel: 100, motor: false },
            { t: base + 180, s: 0, fuel: 85, motor: false }
        ], { litros: 10, min: 2, vel: 3, motor: 'todos' }).length === 0);
    ok('combustible: un pico momentaneo del sensor (rebote) se descarta',
        mod.rxFuelDetecta([
            { t: base, s: 0, fuel: 100, motor: false },
            { t: base + 60, s: 0, fuel: 88, motor: false },
            { t: base + 120, s: 0, fuel: 99, motor: false }
        ], { litros: 10, min: 2, vel: 3, motor: 'todos' }).length === 0);
    // El pico de 1 o 2 datos (100, 343, 343, 100) se limpia: sin esto se
    // volvia la referencia y la vuelta al 100 era una "perdida" de 243 L.
    const seriePico = [
        { t: base, fuel: 100 }, { t: base + 60, fuel: 100 }, { t: base + 120, fuel: 343 },
        { t: base + 180, fuel: 343 }, { t: base + 240, fuel: 100 }, { t: base + 300, fuel: 100 }
    ];
    const serieEscalon = [
        { t: base, fuel: 100 }, { t: base + 60, fuel: 100 }, { t: base + 120, fuel: 100 },
        { t: base + 180, fuel: 20 }, { t: base + 240, fuel: 20 }, { t: base + 300, fuel: 20 }, { t: base + 360, fuel: 20 }
    ];
    ok('combustible: el pico de 1-2 datos se descarta (datos coherentes)',
        mod.rxFuelLimpia(seriePico).length === 4 &&
        mod.rxFuelLimpia(seriePico).every((m) => m.fuel === 100) &&
        mod.rxFuelLimpia(serieEscalon).length === 7);
    ok('combustible: con el pico limpio no hay falso evento, y el escalon real si',
        mod.rxFuelDetecta(seriePico.map((m) => ({ t: m.t, s: 0, fuel: m.fuel, motor: false })),
            { litros: 10, min: 2, vel: 3, motor: 'todos' }).length === 0 &&
        mod.rxFuelDetecta(serieEscalon.map((m) => ({ t: m.t, s: 0, fuel: m.fuel, motor: false })),
            { litros: 10, min: 2, vel: 3, motor: 'todos' }).length === 1);
    ok('combustible: una fuga sostenida se agrupa en un solo evento',
        mod.rxFuelDetecta([
            { t: base, s: 0, fuel: 100, motor: false },
            { t: base + 60, s: 0, fuel: 89, motor: false },
            { t: base + 120, s: 0, fuel: 79, motor: false }
        ], { litros: 10, min: 2, vel: 3, motor: 'todos' }).length === 1);
    ok('combustible: si la unidad se movio no cuenta',
        mod.rxFuelDetecta([
            { t: base, s: 0, fuel: 100, motor: false },
            { t: base + 60, s: 50, fuel: 85, motor: false }
        ], { litros: 10, min: 2, vel: 3, motor: 'todos' }).length === 0);
    ok('combustible: el filtro de motor respeta encendido/apagado',
        mod.rxFuelDetecta(muestras, { litros: 10, min: 2, vel: 3, motor: 'on' }).length === 0 &&
        mod.rxFuelDetecta(muestras, { litros: 10, min: 2, vel: 3, motor: 'off' }).length === 1);
    // Ejecucion completa con el historial simulado.
    fuelMsgs = muestras.map((m) => ({ t: m.t, pos: { y: m.lat, x: m.lon, s: m.s }, params: { fuel: m.fuel, engine: 0 } }));
    APP.unidades = [{ id: 7, nm: 'CDOS.105', sens: { 5: { n: 'Nivel de combustible' } } }];
    const rf = await mod.rxFuelCorre(mod.rxFuelUnidadesTodas(base - 100), base - 100, base + 3600,
        { litros: 10, min: 2, vel: 3, motor: 'todos' }, null, null);
    ok('combustible: el reporte arma filas con la cabecera esperada',
        rf.cols[0] === 'Unidad' && rf.cols[2] === 'Litros' && rf.filas.length === 1 &&
        rf.filas[0][0] === '105' && rf.conSensor === 1 && rf.sinSensor === 0,
        JSON.stringify({ cols: rf.cols, filas: rf.filas.length, con: rf.conSensor }));
    ok('combustible: incluye la pestana de diagnostico de sensores',
        rf.tablas.length === 2 && rf.tablas[1].label === 'Sensores' &&
        rf.tablas[1].cols[5] === 'Estado' && rf.tablas[1].filas.length === 1);
    fuelMsgs = null;
    const rsf = await mod.rxFuelCorre([{ id: 7, eco: '105', u: { id: 7, nm: '105' } }], base - 100, base + 3600, { litros: 10, min: 2 }, null, null);
    ok('combustible: sin sensor de nivel avisa (conSensor=0) y solo muestra el diagnostico',
        rsf.sinSensor === 1 && rsf.conSensor === 0 &&
        rsf.tablas.length === 1 && rsf.tablas[0].label === 'Sensores',
        JSON.stringify({ sin: rsf.sinSensor, con: rsf.conSensor, tablas: rsf.tablas.map((t) => t.label) }));
    // Clave manual: funciona aunque el sensor tenga un nombre raro.
    fuelMsgs = [
        { t: base, pos: { y: 19.4, x: -99.1, s: 0 }, params: { nivel_x: 80 } },
        { t: base + 60, pos: { y: 19.4, x: -99.1, s: 0 }, params: { nivel_x: 65 } }
    ];
    const rov = await mod.rxFuelCorre([{ id: 7, eco: '105', u: { id: 7, nm: '105' } }], base - 100, base + 3600,
        { litros: 10, min: 2, sensor: 'nivel_x' }, null, null);
    ok('combustible: la clave manual de sensor fuerza la lectura del nivel',
        rov.conSensor === 1 && rov.sinSensor === 0, JSON.stringify({ con: rov.conSensor }));
    fuelMsgs = null;
    ok('combustible: la plantilla integrada se reconoce y el respaldo busca por nombre',
        mod.rxFuelEsTpl(mod.RX_FUEL_TPL) === true &&
        !!mod.rxFuelTplCombustible([{ nombre: 'Consumo de combustible' }, { nombre: 'Otro' }]));
    ok('combustible: el filtro por marca (sensor) selecciona solo las "(SC)"',
        mod.rxFuelTieneMarca({ eco: '105', u: { nm: 'CDOS.105 (SC)' } }, '(SC)') === true &&
        mod.rxFuelTieneMarca({ eco: '205', u: { nm: 'CDOS.205' } }, '(SC)') === false &&
        mod.rxFuelTieneMarca({ eco: '205', u: { nm: 'CDOS.205' } }, '') === true &&
        mod.rxFuelFiltraMarca([
            { eco: 'a', u: { nm: 'A (SC)' } }, { eco: 'b', u: { nm: 'B' } }
        ], '(SC)').length === 1);
    // Diagnostico del sensor: caminar sin que baje el nivel = defectuoso.
    const metMueve = mod.rxFuelMetricas([
        { t: base, lat: 19.40, lon: -99.10, fuel: 100 },
        { t: base + 600, lat: 19.43, lon: -99.10, fuel: 98 },
        { t: base + 1200, lat: 19.46, lon: -99.10, fuel: 95 }
    ]);
    ok('combustible: las metricas miden distancia y caida de nivel',
        metMueve.km > 6 && metMueve.drop === 5 && metMueve.n === 3,
        JSON.stringify({ km: metMueve.km, drop: metMueve.drop }));
    ok('combustible: sensor congelado (nivel fijo con km) -> defectuoso',
        mod.rxFuelVeredicto({ km: 30, n: 5, drop: 0, l100: null, rango: 0 }, { km: 20, l100: 1 }).estado === 'Defectuoso' &&
        mod.rxFuelVeredicto({ km: 30, n: 5, drop: 0, l100: null, rango: 0 }, { km: 20, l100: 1 }).malo === true);
    ok('combustible: subir mucho caminando -> alterado',
        mod.rxFuelVeredicto({ km: 30, n: 5, drop: -40, l100: null, rango: 60 }, { km: 20, l100: 1 }).estado === 'Alterado');
    ok('combustible: no baja neto pero fluctua -> revisar (no defectuoso)',
        mod.rxFuelVeredicto({ km: 30, n: 5, drop: 0, l100: null, rango: 5 }, { km: 20, l100: 1 }).estado === 'Revisar');
    ok('combustible: consumo normal -> OK y consumo bajo -> revisar',
        mod.rxFuelVeredicto({ km: 30, n: 5, drop: 12, l100: 40, rango: 5 }, { km: 20, l100: 1 }).estado === 'OK' &&
        mod.rxFuelVeredicto({ km: 30, n: 5, drop: 0.3, l100: 1, rango: 5 }, { km: 20, l100: 5 }).estado === 'Revisar');
    ok('combustible: sin lecturas -> sin datos',
        mod.rxFuelVeredicto(mod.rxFuelMetricas([]), { km: 20 }).estado === 'Sin datos');
    // Deteccion de descargas de la PLATAFORMA: se reconoce la tabla de nivel de
    // combustible del informe nativo por sus columnas.
    ok('combustible: reconoce la tabla de descargas de la plataforma',
        !!mod.rxFuelTablaDescarga({ tablas: [{ n: 'fuel', l: 'Combustible',
            etiquetas: ['Hora', 'Nivel de combustible inicial', 'Descargado', 'Nivel de combustible final', 'Nombre del sensor'],
            claves: ['time', 'begin_balance', 'thefted', 'end_balance', 'sensor'] }] }) &&
        !!mod.rxFuelTablaDescarga({ tablas: [{ n: 'fuel', l: '', etiquetas: [], claves: ['begin_balance', 'end_balance'] }] }));
    ok('combustible: no confunde una tabla corriente',
        mod.rxFuelTablaDescarga({ tablas: [{ n: 't', l: 'Resumen', etiquetas: ['Unidad', 'Km'], claves: ['unit', 'km'] }] }) === null);
    mod.RX_INF.fuel._desc = { tpl: { nombre: 'Combustible' } };
    mod.RX_INF.fuel.fuente = 'plataforma';
    const usePlat = mod.rxFuelUsaPlataforma();
    mod.RX_INF.fuel.fuente = 'sensor';
    const noPlat = mod.rxFuelUsaPlataforma();
    mod.RX_INF.fuel._desc = undefined;
    mod.RX_INF.fuel.fuente = 'plataforma';
    ok('combustible: la fuente decide entre plataforma y sensor', usePlat === true && noPlat === false);

    // ── Descargas de la plataforma: unidad, ubicacion, fecha/hora, duracion ──
    ok('combustible plataforma: parsea fecha/hora', (function () {
        const ms = mod.rxFuelParseFecha('2026-10-14 13:36:25');
        const d = new Date(ms);
        return ms != null && d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 14 &&
            d.getHours() === 13 && d.getMinutes() === 36 && mod.rxFuelParseFecha('') === null;
    })());
    const idxDesc = mod.rxFuelMapeaColsDescarga(['Comienzo', 'Posición inicial', 'Hora', 'Nivel de combustible inicial', 'Velocidad inicial', 'Descargado', 'Nivel de combustible final', 'Nombre del sensor']);
    ok('combustible plataforma: mapea las columnas de descargas',
        idxDesc.ini === 0 && idxDesc.ubi === 1 && idxDesc.fin === 2 && idxDesc.iniNiv === 3 &&
        idxDesc.vel === 4 && idxDesc.litros === 5 && idxDesc.finNiv === 6 && idxDesc.sensor === 7,
        JSON.stringify(idxDesc));
    ok('combustible plataforma: elige la tabla de descargas',
        mod.rxFuelTablaSalida({ tablas: [{ name: 'unit_trips', label: 'Viajes' }, { name: 'unit_thefts', label: 'Descargas de Combustible' }] }).name === 'unit_thefts');
    // Ejecucion completa con la tabla de descargas simulada (2 sensores).
    tablaThefts = true;
    mod.rxInfCacheLimpiar();
    const rPlat = await mod.rxFuelCorrePlataforma({ rid: 3, id: 10, nombre: 'Informe de Combustible' },
        [{ id: 7, eco: '105' }], 1700000000, 1700000000 + 3600, {}, null, null);
    tablaThefts = false;
    ok('combustible plataforma: arma filas con unidad, coordenadas, inicio/fin, duracion y sensor',
        rPlat.cols[0] === 'Unidad' && rPlat.cols[2] === 'Coordenadas' && rPlat.cols[5] === 'Duración' &&
        rPlat.filas.length === 2 && rPlat.filas[0][0] === '105' &&
        rPlat.filas[0][1] === 'GEOCERCA TESTEO STS' && /^20\.84/.test(rPlat.filas[0][2]) &&
        rPlat.filas[0][5] === '0:02:00' && rPlat.filas[0][6] === '24,55 l' && rPlat.filas[0][9] === 'DIESEL 1' &&
        rPlat.filas[1][9] === 'DIESEL 2',
        JSON.stringify({ cols: rPlat.cols, f0: rPlat.filas[0] }));

    console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasan');
    process.exit(fallos ? 1 : 0);
})();
