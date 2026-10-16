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
    'function zoneAt(lat, lon){ if (P_STATE.zona && lat != null && Math.abs(lat - P_STATE.zona.lat) < P_STATE.zona.d) return P_STATE.zona.n; return (lat != null && Math.abs(lat - 19.4) < 0.01) ? "PATIO" : ""; }',
    'function haversine(y1, x1, y2, x2){ const dy = (y2 - y1), dx = (x2 - x1); return Math.sqrt(dy * dy + dx * dx) * 111320; }',
    'function rxFechaHora(ms){ return String(ms); }',
    'function clamp(v, lo, hi){ return Math.min(Math.max(v, lo), hi); }',
    'function rxGeoInfYield(){ return new Promise((r) => { try { setTimeout(r, 0); } catch (_) { r(); } }); }',
    'function remoteCall(m, p){ return P_REMOTE(m, p); }',
    'function rxMiniMapaHTML(cfg, W, H){ return "<div class=\\"mapa\\" data-l=\\"" + ((cfg && cfg.lineas) || []).length + "\\" data-m=\\"" + ((cfg && cfg.marcas) || []).length + "\\"></div>"; }',
    'function rxInfEstilo(){ return "body{}"; }',
    'function rxInfCabecera(t, s, m){ return "<div class=\\"cover\\">" + t + "|" + s + "|" + m + "</div>"; }',
    'function rxInfPie(){ return "<div class=\\"pie\\"></div>"; }',
    'let P_STOPS = null; function rxGeoInfCargaTrozo(uid, t0, t1){ return Promise.resolve({ msgs: P_STOPS ? P_STOPS(uid, t0, t1) : [], truncado: false }); }',
    'const P_GEOS = []; function glocNombreLibre(n){ return n; } function glocGuarda(z){ P_GEOS.push(z); return z; }'
].join('\n');

// El veredicto de las descargas usa el algoritmo propio (fragmento 56, comb*):
// se evalua en el mismo ambito, como en el script.
const iniComb = src.indexOf('/* === BEGIN: combustible === */');
const finComb = src.indexOf('/* === END: combustible === */');
if (iniComb < 0 || finComb < 0) {
    console.error('No se encontro el bloque "combustible" en ' + ARCHIVO);
    process.exit(1);
}
const iniCarn = src.indexOf('/* === BEGIN: carnada === */');
const finCarn = src.indexOf('/* === END: carnada === */');
if (iniCarn < 0 || finCarn < 0) {
    console.error('No se encontro el bloque "carnada" en ' + ARCHIVO);
    process.exit(1);
}
const code = stubs + '\n' + src.slice(iniComb, finComb) + '\n' + src.slice(ini, fin) + '\n' + src.slice(iniCarn, finCarn) +
    '\nreturn {RX_INF,RX_INF_DIAS_TROZO,RX_INF_MAX_TROZOS,RX_INF_MAX_OBJETOS,rxInfPlantillas,rxInfNormFilas,rxInfExtrae,' +
    'rxInfCols,rxInfResumenUnidad,rxInfNum,rxInfFmt,rxInfFiltra,rxInfClave,rxInfTplDeClave,rxInfEjecuta,rxInfCorre,' +
    'rxInfCacheCargar,rxInfCachePoner,rxInfCacheLimpiar,rxInfCacheKey,rxInfCSVTexto,rxInfNombreArchivo,' +
    'rxInfPlantillaInfo,rxInfZonasPlataforma,rxInfUnidades,rxInfExplicaError,rxInfOrdena,rxInfPista,' +
    'rxInfEsDeGeocercas,rxInfClasifica,rxInfColumnasVacias,rxInfZonaDeFila,rxInfDatosPlantilla,rxInfZonasDisponibles,' +
    'rxInfFiltrosDe,rxInfFiltroValor,rxInfFiltroResuelve,rxInfDefFiltros,rxInfDefSinUnidades,rxInfDefSana,rxInfVisibles,rxInfRecortaVisible,RX_INF_MAX_TABLAS,' +
    'rxInfDefSoloTablas,' +
    'rxInfLista,rxInfItemsTipo,rxInfPrecargaItems,rxInfObjetosTipo,' +
    'rxFuelNivel,rxFuelMotor,rxFuelMsg,rxFuelDetecta,rxFuelCorre,rxFuelSensores,rxFuelUnidadesTodas,' +
    'rxFuelTplCombustible,rxFuelEsTpl,RX_FUEL_TPL,rxFuelTieneMarca,rxFuelFiltraMarca,' +
    'rxFuelMetricas,rxFuelVeredicto,rxFuelClaves,rxFuelCatalogo,rxFuelParamsVistos,rxFuelLimpia,rxFuelAgrupa,' +
    'rxFuelTablaDescarga,rxFuelTplDescarga,rxFuelUsaPlataforma,' +
    'rxFuelParseFecha,rxFuelMapeaColsDescarga,rxFuelTablaSalida,rxFuelCorrePlataforma,RX_FUEL_DESC_COLS,' +
    'RX_FUEL_LUG_COLS,rxFuelEvDesc,rxFuelUneSensores,rxFuelFusionaContiguas,rxFuelEvalDescarga,' +
    'rxFuelReincidencia,rxFuelAnalizaDescargas,rxFuelFilaDesc,rxFuelLugares,rxFuelFmtDur,rxFuelUsaComa,' +
    'rxInfHash,rxInfDefTablasSel,rxInfDefConObjeto,rxInfAjustesDe,rxInfTablasDe,rxFuelRecolecta,' +
    'carnCfg,carnCirculo,carnNucleos,carnUneGrupos,carnSospecha,carnPuntos,carnVerifica,carnDetectaParadas,carnVentanas,' +
    'carnCandidatos,carnEscaneaLlegadas,carnEvsDeSensor,carnTablas,carnCorre,carnMapaDatos,carnCreaGeocercas,carnCSVDatos,' +
    'carnHTML,carnMapaPunto,carnBarrasSVG,carnLecturaEntorno,RX_CARN,RX_CARN_TPL,P_GEOS,estado: P_STATE,' +
    'setStops: (f) => { P_STOPS = f; }};';

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
let codigo7 = false;     // exec_report rechaza con code 7 salvo si se manda una definicion propia
let codigo7units = false; // exec_report rechaza con code 7 mientras la tabla traiga el filtro 'units'
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
        if (codigo7units) {
            const tabs = ((p.reportTemplate || {}).tbl) || [];
            const tieneUnits = tabs.some((tb) => { try { const pp = JSON.parse(tb.p || '{}'); return pp.units != null && String(pp.units) !== ''; } catch (_) { return false; } });
            if (tieneUnits) return Promise.reject(new Error('report/exec_report -> code 7'));
        }
        if (codigo7 && p.reportTemplateId !== 0) {
            return Promise.reject(new Error('report/exec_report -> code 7'));
        }
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
                    { name: 'unit_thefts', label: 'Descargas de Combustible', rows: 7, columns: 8,
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
            const H = (v) => ({ t: String(v), v: v });
            const LUG = { t: 'Jal-311, Valle De Guadalupe', y: 21.14071, x: -101.73470 };
            const LUG2 = { t: 'Jal-311, Valle De Guadalupe', y: 21.14077, x: -101.73466 };
            const OTRO = { t: 'Patio base', y: 20.75763, x: -102.71055 };
            const B = 1792000000;
            return Promise.resolve([
                // robo: 69,92 L en 3 min, parada. El mismo evento sale otra vez en el sensor IZQ.
                { n: 0, d: 0, c: [H(B), LUG, H(B + 180), '86,34 l', '0 km/h', '69,92 l', '16,42 l', 'DIESEL TOTAL'] },
                { n: 1, d: 0, c: [H(B), LUG, H(B + 180), '86,34 l', '0 km/h', '69,92 l', '16,42 l', 'SENSOR COMBUSTIBLE IZQ'] },
                // el sensor se cae a 0: no es un robo
                { n: 2, d: 0, c: [H(B + 4000), OTRO, H(B + 4030), '66,80 l', '0 km/h', '66,82 l', '0,00 l', 'DIESEL TOTAL'] },
                // bajada lenta de 3 h 44 min (equipo de frio): consumo
                { n: 3, d: 0, c: [H(B + 20000), OTRO, H(B + 20000 + 13440), '77,93 l', '0 km/h', '36,31 l', '41,61 l', 'SENSOR COMBUSTIBLE THERMO'] },
                // en movimiento: el nivel baila con el tanque
                { n: 4, d: 0, c: [H(B + 50000), OTRO, H(B + 50120), '120,00 l', '45 km/h', '30,00 l', '90,00 l', 'DIESEL TOTAL'] },
                // robo repetido en el mismo lugar 3 dias despues (8 min, 75,96 L)
                { n: 5, d: 0, c: [H(B + 259200), LUG2, H(B + 259200 + 480), '92,30 l', '0 km/h', '75,96 l', '16,34 l', 'DIESEL TOTAL'] },
                // pasada de 11 L en 60 s: robo chico
                { n: 6, d: 0, c: [H(B + 300000), OTRO, H(B + 300060), '150,00 l', '0 km/h', '12,00 l', '138,00 l', 'DIESEL TOTAL'] }
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
const estado = { zona: null };
const mod = new Function('P_STORE', 'P_LS', 'P_APP', 'P_REMOTE', 'P_STATE', code)(store, LS, APP, remote, estado);

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
    const t0r = rPlat.tablas[0], t1r = rPlat.tablas[1];
    ok('combustible plataforma: 7 filas de la plataforma son 6 eventos unicos',
        rPlat.crudos === 7 && rPlat.unidos === 6, JSON.stringify({ c: rPlat.crudos, u: rPlat.unidos }));
    ok('combustible plataforma: 14 columnas con veredicto y motivo',
        rPlat.cols.length === 14 && rPlat.cols[2] === 'Coordenadas' && rPlat.cols[5] === 'Duración' &&
        rPlat.cols[12] === 'Veredicto' && rPlat.cols[13] === 'Motivo', JSON.stringify(rPlat.cols));
    ok('combustible plataforma: la tabla principal solo trae lo que parece robo',
        rPlat.filas.length === 3 && rPlat.filas.every((f) => f[12] === 'Robo probable' || f[12] === 'Sospechoso') &&
        rPlat.robos + rPlat.sospechas === 3, JSON.stringify(rPlat.filas.map((f) => f[12])));
    ok('combustible plataforma: el evento duplicado en IZQ cuenta una sola vez',
        rPlat.filas.filter((f) => f[6] === '69,92 l').length === 1, JSON.stringify(rPlat.filas.map((f) => f[6])));
    const fA = rPlat.filas.filter((f) => f[6] === '69,92 l')[0];
    ok('combustible plataforma: fila del robo con unidad, lugar, coordenadas, duracion exacta y ritmo',
        fA[0] === '105' && fA[1] === 'Jal-311, Valle De Guadalupe' && fA[2] === '21.14071, -101.73470' &&
        fA[5] === '0:03:00' && fA[7] === '86,34 l' && fA[8] === '16,42 l' && fA[9] === '23,3' &&
        fA[11] === 'DIESEL TOTAL' && fA[12] === 'Robo probable', JSON.stringify(fA));
    ok('combustible plataforma: descartados con su motivo (falla de sensor, consumo lento, en movimiento)',
        t1r.filas.length === 3 && rPlat.descartados === 3 &&
        t1r.filas.some((f) => f[12] === 'Falla de sensor' && /perdi/.test(f[13])) &&
        t1r.filas.some((f) => f[12] === 'Consumo o fuga lenta' && f[5] === '3:44:00') &&
        t1r.filas.some((f) => f[12] === 'En movimiento' && /45/.test(f[13])),
        JSON.stringify(t1r.filas.map((f) => [f[12], f[5]])));
    ok('combustible plataforma: pestanas Robos y sospechas / Descartados / Lugares repetidos',
        rPlat.tablas.map((t) => t.label).join('|') === 'Robos y sospechas|Descartados|Lugares repetidos' &&
        rPlat.lugares === 1 && rPlat.tablas[2].filas[0][3] === 2 && rPlat.tablas[2].filas[0][2] === 1,
        JSON.stringify(rPlat.tablas.map((t) => t.label)));
    ok('combustible plataforma: el lugar repetido queda dicho en el motivo',
        /lugar repetido: 2 descargas/.test(fA[13]), fA[13]);
    ok('combustible plataforma: litros en robo suma solo robos y sospechas',
        Math.abs(rPlat.litrosRobo - (69.92 + 75.96 + 12)) < 0.01, String(rPlat.litrosRobo));

    // ── Piezas puras del analisis ──
    ok('fecha: formato corto mes/dia/anio de la plataforma (10/14/26 13:22)', (function () {
        const d = new Date(mod.rxFuelParseFecha('10/14/26 13:22'));
        return d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 14 && d.getHours() === 13;
    })());
    ok('fecha: dia/mes con anio de 4 digitos y punto', (function () {
        const a = new Date(mod.rxFuelParseFecha('29/09/2026 7:12'));
        const b = new Date(mod.rxFuelParseFecha('15.09.2026 09:33:49'));
        return a.getMonth() === 8 && a.getDate() === 29 && b.getMonth() === 8 && b.getDate() === 15;
    })());
    ok('duracion de mas de un dia se escribe con dias (Excel no la rompe)',
        mod.rxFuelFmtDur(88140) === '1d 0:29:00' && mod.rxFuelFmtDur(120) === '0:02:00' &&
        mod.rxInfNum('1d 0:29:00') === 88140 && mod.rxInfNum('0:02:00') === 120);
    const mk = (o) => Object.assign({ eco: '3686', ubi: '', lat: null, lon: null, ini: '', fin: '', ms0: 1000000, ms1: 1180000,
        durSeg: 180, litros: 50, iniNiv: 200, finNiv: 150, vel: 0, sensor: 'DIESEL TOTAL', rawL: '50.00 l',
        n: 1, sensores: ['DIESEL TOTAL'], noCuadra: false, fusion: 0 }, o || {});
    // Sensores: TOTAL = IZQ + DER es UN evento, con la cifra del TOTAL.
    const trio = mod.rxFuelUneSensores([mk({ sensor: 'SENSOR COMBUSTIBLE IZQ', litros: 30 }), mk({ sensor: 'SENSOR COMBUSTIBLE DER', litros: 20 }), mk({ litros: 50 })]);
    ok('sensores: TOTAL, IZQ y DER se unen en un evento con la cifra del TOTAL',
        trio.length === 1 && trio[0].litros === 50 && trio[0].n === 3 && trio[0].noCuadra === false && trio[0].sensores.length === 3);
    const desc = mod.rxFuelUneSensores([mk({ sensor: 'SENSOR COMBUSTIBLE IZQ', litros: 10 }), mk({ sensor: 'SENSOR COMBUSTIBLE DER', litros: 10 }), mk({ litros: 50 })]);
    ok('sensores: si TOTAL no cuadra con IZQ + DER se marca', desc.length === 1 && desc[0].noCuadra === true);
    ok('sensores: sin TOTAL se toma el mayor de los sensores',
        mod.rxFuelUneSensores([mk({ sensor: 'SENSOR COMBUSTIBLE IZQ', litros: 30 }), mk({ sensor: 'SENSOR COMBUSTIBLE DER', litros: 45 })])[0].litros === 45);
    ok('sensores: eventos de unidades distintas o horas lejanas no se mezclan',
        mod.rxFuelUneSensores([mk(), mk({ eco: '3687' }), mk({ ms0: 9000000, ms1: 9180000 })]).length === 3);
    const cont = mod.rxFuelFusionaContiguas([
        mk({ ms0: 0, ms1: 60000, litros: 20, iniNiv: 200, finNiv: 180 }),
        mk({ ms0: 120000, ms1: 180000, litros: 25, iniNiv: 180.5, finNiv: 155 }),
        mk({ ms0: 5000000, ms1: 5060000, litros: 40, iniNiv: 300, finNiv: 260 })]);
    ok('contiguas: dos caidas seguidas con el nivel continuo son una sola (suma litros y duracion)',
        cont.length === 2 && cont[0].litros === 45 && cont[0].finNiv === 155 && cont[0].durSeg === 180 && cont[0].fusion === 1,
        JSON.stringify(cont.map((e) => [e.litros, e.durSeg])));
    const cfg = { litros: 10, vel: 3, tasa: 3 };
    const ver = (o) => mod.rxFuelEvalDescarga(mk(o), cfg, null).veredicto;
    ok('veredicto: caida rapida con la unidad parada = Robo probable', ver({ litros: 70, iniNiv: 200, finNiv: 130, durSeg: 180, ubi: 'Jal-311, Valle' }) === 'Robo probable');
    ok('veredicto: nivel final 0 = Falla de sensor', ver({ litros: 66.82, iniNiv: 66.8, finNiv: 0 }) === 'Falla de sensor');
    ok('veredicto: litros iguales al nivel inicial = Falla de sensor', ver({ litros: 200, iniNiv: 200, finNiv: 2 }) === 'Falla de sensor');
    ok('veredicto: bajada lenta de horas = Consumo o fuga lenta', ver({ litros: 36, iniNiv: 100, finNiv: 64, durSeg: 13440 }) === 'Consumo o fuga lenta');
    ok('veredicto: en movimiento no es extraccion', ver({ vel: 40 }) === 'En movimiento');
    ok('veredicto: por debajo del umbral', ver({ litros: 4, iniNiv: 100, finNiv: 96 }) === 'Menor al umbral');
    ok('veredicto: sin litros = Sin dato', ver({ litros: null }) === 'Sin dato');
    ok('veredicto: duracion cero exacta = Falla de sensor (escalon instantaneo)', ver({ durSeg: 0, litros: 40, iniNiv: 100, finNiv: 60 }) === 'Falla de sensor');
    ok('veredicto: sensores que no cuadran', ver({ noCuadra: true }) === 'Sensores no cuadran');
    ok('veredicto: ritmo bajo pero rapido (< 3 L/min) = Sospechoso, no robo', ver({ litros: 30, durSeg: 1200, iniNiv: 200, finNiv: 170 }) === 'Sospechoso');
    ok('veredicto: un ritmo de cientos de L/min es posible salto del sensor = Sospechoso',
        ver({ litros: 300, durSeg: 60, iniNiv: 900, finNiv: 600, ubi: 'Jal-311' }) === 'Sospechoso');
    ok('veredicto: mas de 30 min con ritmo intermedio = Sospechoso', ver({ litros: 150, durSeg: 3600, iniNiv: 300, finNiv: 150 }) === 'Sospechoso');
    ok('veredicto: la zona de prueba no sostiene un robo firme', ver({ ubi: 'GEOCERCA TESTEO STS' }) === 'Sospechoso');
    ok('veredicto: el umbral de ritmo es configurable',
        mod.rxFuelEvalDescarga(mk({ litros: 30, durSeg: 1200, iniNiv: 200, finNiv: 170, ubi: 'Jal-311' }), { litros: 10, vel: 3, tasa: 1 }, null).veredicto === 'Robo probable');
    const rB = mod.rxFuelEvalDescarga(mk({ litros: 70, iniNiv: 200, finNiv: 130, ubi: 'Jal-311' }), cfg, { recurrencia: 3, carnada: 4 });
    const rA = mod.rxFuelEvalDescarga(mk({ litros: 70, iniNiv: 200, finNiv: 130, ubi: 'Jal-311' }), cfg, null);
    ok('veredicto: la recurrencia y la convergencia suben el puntaje de sospecha', rB.puntaje > rA.puntaje && rB.relevante, JSON.stringify([rA.puntaje, rB.puntaje]));
    const rei = mod.rxFuelReincidencia([
        mk({ eco: '1', lat: 21.1, lon: -101.7 }), mk({ eco: '2', lat: 21.1, lon: -101.7, ms0: 1000000 + 3600000 }),
        mk({ eco: '3', lat: 20.0, lon: -100.0 })]);
    ok('reincidencia: cuenta descargas, unidades y convergencia el mismo dia',
        rei[0].lugarN === 2 && rei[0].lugarU === 2 && rei[0].convU === 1 && rei[2].lugarN === 1 && rei[2].convU === 0);
    const lug = mod.rxFuelLugares([mk({ eco: '1', lat: 21.1, lon: -101.7, litros: 40, ubi: 'A' }), mk({ eco: '2', lat: 21.1001, lon: -101.7, litros: 60, ubi: 'A' }), mk({ eco: '3', lat: 20, lon: -100, litros: 90 })], false);
    ok('lugares: solo puntos con 2 o mas descargas, con unidades y litros',
        lug.length === 1 && lug[0][2] === 2 && lug[0][3] === 2 && lug[0][4] === '100.0 l', JSON.stringify(lug));
    ok('coma decimal: se respeta el formato de la plataforma',
        mod.rxFuelUsaComa([{ rawL: '24,55 l' }]) === true && mod.rxFuelUsaComa([{ rawL: '24.55 l' }]) === false);

    // ══ Todos los reportes nativos: tipos de objeto, tablas, ajustes, cache ══
    const kA = mod.rxInfCacheKey({ rid: 3, id: 11 }, { id: '7', sec: '0', def: { tbl: [{ n: 'a', p: '{"x":1}' }] } }, 1, 2);
    const kB = mod.rxInfCacheKey({ rid: 3, id: 11 }, { id: '7', sec: '0', def: { tbl: [{ n: 'a', p: '{"x":2}' }] } }, 1, 2);
    const kC = mod.rxInfCacheKey({ rid: 3, id: 11 }, { id: '7', sec: '0' }, 1, 2);
    ok('cache: otro filtro o tabla = otra clave (antes devolvia lo viejo)', kA !== kB && kA !== kC && kA === mod.rxInfCacheKey({ rid: 3, id: 11 }, { id: '7', sec: '0', def: { tbl: [{ n: 'a', p: '{"x":1}' }] } }, 1, 2));
    const datosT = [{ id: 11, n: 'Plantilla', ct: 'avl_unit', tbl: [
        { n: 'unit_trips', l: 'Viajes', c: '[]', cl: '[]', p: '{"bind":{"avl_unit":[1]}}' },
        { n: 'unit_stops', l: 'Paradas', c: '[]', cl: '[]', p: '{}' },
        { n: 'unit_thefts', l: 'Descargas', c: '[]', cl: '[]', p: '{}' }] }];
    const soloP = mod.rxInfDefTablasSel(null, datosT, 11, { unit_stops: 1 });
    ok('tablas elegidas: la definicion lleva solo esas, sin bind y con id 0',
        soloP && soloP.id === 0 && soloP.tbl.length === 1 && soloP.tbl[0].n === 'unit_stops', JSON.stringify(soloP));
    ok('tablas elegidas: sin seleccion no se toca nada', mod.rxInfDefTablasSel(null, datosT, 11, {}) === null);
    const defPrev = { id: 0, tbl: [{ n: 'a', p: '{"k":1}' }, { n: 'b', p: '{}' }] };
    const defSel = mod.rxInfDefTablasSel(defPrev, null, 11, { b: 1 });
    ok('tablas elegidas: se respetan los filtros ya aplicados y no se muta la original',
        defSel.tbl.length === 1 && defSel.tbl[0].n === 'b' && defPrev.tbl.length === 2);
    const infoAj = mod.rxInfPlantillaInfo(datosT, 11);
    ok('tablas de la plantilla listadas', mod.rxInfTablasDe(infoAj).map((t) => t.n).join(',') === 'unit_trips,unit_stops,unit_thefts');
    const infoAj2 = { params: [{ k: 'address_format' , v: '1' }, { k: 'units', v: '7' }, { k: 'us_units', v: '0' }, { k: 'time_format', v: '1' }] };
    ok('ajustes de formato se listan aparte de los filtros',
        mod.rxInfAjustesDe(infoAj2).join(',') === 'address_format,us_units,time_format' && mod.rxInfFiltrosDe(infoAj2).join(',') === 'units',
        mod.rxInfAjustesDe(infoAj2).join(','));
    ok('ajustes: us_units no se confunde con una unidad', mod.rxInfFiltroResuelve('us_units', '1') === '1' && mod.rxInfFiltroResuelve('address_format', '1255') === '1255');
    // Tipos de objeto: ruta, retranslador y recurso.
    const antes = calls.length;
    const objRuta = await mod.rxInfObjetosTipo('avl_route', 3);
    ok('informes de ruta se ejecutan por sus items (search_items avl_route)',
        Array.isArray(objRuta) && calls.slice(antes).some((c) => c.m === 'core/search_items' && c.p.spec.itemsType === 'avl_route'));
    const objRet = await mod.rxInfObjetosTipo('avl_retranslator', 3);
    ok('informes de retranslador se ejecutan por sus items', Array.isArray(objRet) && calls.some((c) => c.m === 'core/search_items' && c.p.spec.itemsType === 'avl_retranslator'));
    const objRes = await mod.rxInfObjetosTipo('avl_resource', 3);
    ok('informes de recurso: el propio recurso si no hay lista', Array.isArray(objRes) && objRes.length >= 1 && objRes[0].id);
    ok('una unidad no es un tipo especial', (await mod.rxInfObjetosTipo('avl_unit', 3)) === null);

    // ══ Convergencia con carnada ══
    const ev = (eco, lat, lon, litros, o) => Object.assign({
        eco: eco, ubi: 'Jal-311, Valle De Guadalupe', lat: lat, lon: lon, ini: '', fin: '', ms0: 1000000, ms1: 1000000 + 180000,
        durSeg: 180, litros: litros, iniNiv: 200, finNiv: 200 - litros, vel: 0, sensor: 'DIESEL TOTAL', rawL: '1.00 l', n: 1, sensores: [], noCuadra: false, fusion: 0
    }, o || {});
    const circ = mod.carnCirculo(21.0, -102.0, 30, 16);
    ok('circulo: 17 puntos cerrado y a ~30 m del centro',
        circ.length === 17 && circ[0].lat === circ[16].lat && Math.abs(Math.hypot((circ[4].lat - 21.0) * 111320, (circ[4].lon + 102.0) * 111320 * Math.cos(21 * Math.PI / 180)) - 30) < 1);
    ok('config: se sanea lo que llegue de la pantalla',
        mod.carnCfg({ radio: -5, unir: 'x', minCarnada: 0, topPuntos: 999 }).radio === 50 && mod.carnCfg({ minCarnada: 0 }).minCarnada === 2 && mod.carnCfg({ topPuntos: 999 }).topPuntos === 10);
    ok('config: por defecto se descartan las geocercas y las bases (>15 unidades), radio 50 m y ventana 2 h',
        (function () { const c = mod.carnCfg({}); return c.geoDescarta === true && c.maxUnid === 15 && c.radio === 50 && c.ventanaH === 2; })() &&
        mod.carnCfg({ geoDescarta: false }).geoDescarta === false && mod.carnCfg({ maxUnid: 0 }).maxUnid === 15);
    // Tres unidades en el mismo punto; una sola unidad lejos; una con dos llegadas sin perdida.
    const centro = [21.03844, -102.56107];
    const eA = [ev('U1', centro[0], centro[1], 60), ev('U2', centro[0] + 0.00005, centro[1], 70), ev('U3', centro[0], centro[1] + 0.00005, 55)];
    const eSolo = ev('U4', 21.5, -102.9, 90);
    const eConLlegadas = ev('U5', 20.9, -102.4, 40);
    const paradasC = [
        { eco: 'U6', lat: 20.9, lon: -102.4, t0: 900000, t1: 1500000, min: 10 },
        { eco: 'U7', lat: 20.90005, lon: -102.4, t0: 950000, t1: 1500000, min: 9 },
        { eco: 'U6', lat: 20.9, lon: -102.4, t0: 900000, t1: 1500000, min: 10 }   // duplicada: no cuenta dos veces
    ];
    const rPun = mod.carnPuntos(eA.concat([eSolo, eConLlegadas]), paradasC, {});
    ok('puntos: perdida + convergencia marca el punto; una perdida aislada no',
        rPun.puntos.length === 2 && rPun.aislados.length === 1 && rPun.aislados[0].eco === 'U4', JSON.stringify(rPun.puntos.map((p) => [p.id, p.carnada, p.eventos])));
    const pC01 = rPun.puntos[0];
    ok('puntos: C01 es el de mas unidades carnada y suma sus litros',
        pC01.id === 'C01' && pC01.carnada === 3 && pC01.eventos === 3 && Math.abs(pC01.litros - 185) < 0.001 && rPun.puntos[1].id === 'C02');
    const pLleg = rPun.puntos[1];
    ok('puntos: una perdida con 2 llegadas de otras unidades converge (la llegada duplicada no suma)',
        pLleg.carnada === 3 && pLleg.eventos === 1 && pLleg.llegadas.length === 2 && pLleg.unidades.sort().join(',') === 'U5,U6,U7');
    ok('puntos: sin llegadas ni otra unidad no hay convergencia', mod.carnPuntos([eSolo], [], {}).puntos.length === 0);
    ok('puntos: el minimo de unidades es configurable', mod.carnPuntos([eSolo], [], { minCarnada: 1 }).puntos.length === 1);
    // Unir tramos a 150 m: 117 m juntos, 400 m separados.
    const unidos = mod.carnPuntos([ev('A', 21.0, -102.0, 50), ev('B', 21.0, -102.0, 50), ev('C', 21.00105, -102.0, 50), ev('D', 21.00105, -102.0, 50)], [], {});
    ok('puntos: dos puntos a ~117 m son uno solo (mismo tramo operativo)', unidos.puntos.length === 1 && unidos.puntos[0].eventos === 4 && unidos.puntos[0].nucleos === 2);
    const aparte = mod.carnPuntos([ev('A', 21.0, -102.0, 50), ev('B', 21.0, -102.0, 50), ev('C', 21.004, -102.0, 50), ev('D', 21.004, -102.0, 50)], [], {});
    ok('puntos: a 440 m son dos puntos', aparte.puntos.length === 2);
    // Sospecha: la misma escala del informe (entorno + recurrencia + volumen + convergencia).
    const sC01 = mod.carnSospecha({ ubi: 'Jal-311, Valle De Guadalupe', zona: '', eventos: 5, litros: 185.3, carnada: 12 });
    ok('sospecha: carretera + 5 eventos + 185 L + 12 unidades = Alta (8)', sC01.puntaje === 8 && sC01.nivel === 'Alta' && sC01.entorno === 'carretera', JSON.stringify(sC01));
    const sC03 = mod.carnSospecha({ ubi: 'La Esperanza, Calle Morelos 138', zona: '', eventos: 1, litros: 69.2, carnada: 5 });
    ok('sospecha: poblado + 1 evento + 69 L + 5 unidades = Media (4)', sC03.puntaje === 4 && sC03.nivel === 'Media', JSON.stringify(sC03));
    const sC08 = mod.carnSospecha({ ubi: 'San Miguel El Alto, Jal-345', zona: '', eventos: 1, litros: 259.4, carnada: 2 });
    ok('sospecha: un solo evento grande en carretera tambien es Alta (5)', sC08.puntaje === 5 && sC08.nivel === 'Alta');
    const sC11 = mod.carnSospecha({ ubi: 'Calle Libramiento', zona: '', eventos: 1, litros: 20, carnada: 2 });
    ok('sospecha: poco volumen y 2 unidades en poblado = Baja', sC11.nivel === 'Baja', JSON.stringify(sC11));
    ok('puntos: un punto por donde pasa media flota es una base y no se marca', (function () {
        const evs = [];
        for (let i = 0; i < 20; i++) evs.push(ev(('U' + i), 21.0, -102.0, 40));
        const rr = mod.carnPuntos(evs, [], { maxUnid: 5, minCarnada: 2 });
        return rr.puntos.length === 0 && rr.bases === 1;
    })());
    ok('puntos: una llegada fuera de la ventana de horas no cuenta como convergencia', (function () {
        const e1 = ev('A', 21.0, -102.0, 60, { ms0: 1000000000, ms1: 1000180000 });
        const e2 = ev('B', 21.0, -102.0, 60, { ms0: 1000000000, ms1: 1000180000 });
        // parada a 3 h de la perdida con ventana de 2 h -> no converge; con 4 h -> converge
        const lejos = [{ eco: 'C', lat: 21.0, lon: -102.0, t0: 1000000000 + 10800000, t1: 1000000000 + 11400000, min: 10 }];
        const sinWin = mod.carnPuntos([e1, e2], lejos, { minCarnada: 3, ventanaH: 2 });
        const conWin = mod.carnPuntos([e1, e2], lejos, { minCarnada: 3, ventanaH: 4 });
        return sinWin.puntos.length === 0 && conWin.puntos.length === 1;
    })());
    ok('sospecha: dentro de una geocerca propia (patio) pesa menos que la carretera',
        mod.carnSospecha({ ubi: 'Jal-311', zona: 'PATIO BASE', eventos: 1, litros: 20, carnada: 2 }).entornoPuntos <
        mod.carnSospecha({ ubi: 'Jal-311', zona: '', eventos: 1, litros: 20, carnada: 2 }).entornoPuntos);
    // Paradas desde mensajes crudos.
    const M = (t, y, x, s) => ({ t: t, pos: { y: y, x: x, s: s } });
    const msgsP = [M(0, 20.0, -102.0, 60), M(60, 20.0001, -102.0, 50)]
        .concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => M(120 + i * 60, 20.001, -102.001, 0)))
        .concat([M(900, 20.01, -102.01, 40), M(960, 20.011, -102.01, 0), M(1020, 20.011, -102.01, 0), M(1080, 20.02, -102.02, 40)]);
    const stops = mod.carnDetectaParadas(msgsP, 'U9', { paradaMin: 2, vel: 3 });
    ok('paradas: una detencion de 10 min es una llegada con su centro y duracion',
        stops.length === 1 && stops[0].eco === 'U9' && stops[0].min === 10 && Math.abs(stops[0].lat - 20.001) < 1e-6 && stops[0].t0 === 120000, JSON.stringify(stops));
    ok('paradas: una detencion corta (1 min) no cuenta', mod.carnDetectaParadas([M(0, 20, -102, 0), M(60, 20, -102, 0)], 'U', { paradaMin: 2 }).length === 0);
    ok('paradas: un salto de GPS de cientos de metros corta la parada',
        mod.carnDetectaParadas([0, 1, 2, 3].map((i) => M(i * 60, 20, -102, 0)).concat([0, 1, 2, 3].map((i) => M(300 + i * 60, 20.01, -102, 0))), 'U', { paradaMin: 2 }).length === 2);
    ok('ventanas: +-12 h de cada perdida y las que se tocan se unen',
        JSON.stringify(mod.carnVentanas([ev('A', 1, 1, 1, { ms0: 100000000, ms1: 100000000 }), ev('B', 1, 1, 1, { ms0: 100000000 + 3600000, ms1: 100000000 + 3600000 }), ev('C', 1, 1, 1, { ms0: 900000000, ms1: 900000000 })], 12)) ===
        JSON.stringify([[100000 - 43200, 100000 + 3600 + 43200], [900000 - 43200, 900000 + 43200]]));
    const verif1 = mod.carnVerifica([ev('U1', 20.0, -102.0, 30, { ms0: 1000000, ms1: 1180000 }), ev('U2', 20.5, -102.5, 30)],
        [{ eco: 'U1', lat: 20.00003, lon: -102.0, t0: 900000, t1: 1300000, min: 6 }], {});
    ok('verificacion: parada de la misma unidad a <=50 m y solapada = coincide', verif1.total === 2 && verif1.coinciden === 1 && verif1.pct === 50 && verif1.mejor.eco === 'U1' && verif1.mejor.d < 10);
    ok('verificacion: otra unidad o hora distinta no coincide',
        mod.carnVerifica([ev('U1', 20.0, -102.0, 30)], [{ eco: 'U9', lat: 20.0, lon: -102.0, t0: 900000, t1: 1300000 }, { eco: 'U1', lat: 20.0, lon: -102.0, t0: 99000000, t1: 99100000 }], {}).coinciden === 0);
    // Ejecucion completa: dos unidades carnada con las mismas descargas en el mismo punto.
    tablaThefts = true;
    mod.rxInfCacheLimpiar();
    const fases = [];
    const rCar = await mod.carnCorre({
        usarPlat: true, tpl: { rid: 3, id: 10, nombre: 'Informe de Combustible' }, def: {}, lista: [{ id: 7, eco: '105' }, { id: 8, eco: '106' }],
        desde: 1700000000, hasta: 1700000000 + 3600, cfgFuel: { litros: 10, vel: 3, tasa: 3 }, cfgCarn: {}, onFase: (pct, txt) => fases.push(pct), token: null
    });
    tablaThefts = false;
    ok('carnada: dos unidades con perdida en el mismo punto marcan un punto (sin llegadas)',
        rCar.carn === true && rCar.puntos.length >= 1 && rCar.puntos[0].carnada === 2 && rCar.meta.puntos === rCar.puntos.length,
        JSON.stringify({ n: rCar.puntos.length, c: rCar.puntos[0] && rCar.puntos[0].carnada, m: rCar.meta }));
    ok('carnada: las perdidas depuradas (sensor a 0, consumo, en movimiento) no forman puntos',
        rCar.meta.eventos === 6 && rCar.meta.descartados === 6 && rCar.puntos.every((p) => p.evs.every((e) => e.cls && e.cls.relevante)),
        JSON.stringify(rCar.meta));
    ok('carnada: tablas Puntos / Perdidas en los puntos (y aisladas si las hay)',
        rCar.tablas[0].label === 'Puntos de convergencia' && rCar.tablas[0].cols.length === 11 && rCar.tablas[1].label === 'P\u00e9rdidas en los puntos' &&
        rCar.tablas[0].filas[0][0] === 'C01' && /^21\.14/.test(rCar.tablas[0].filas[0][1]) && rCar.tablas[1].filas.length === rCar.meta.eventosPuntos);
    ok('carnada: el progreso avanza por fases', fases.length >= 3 && fases[0] <= fases[fases.length - 1]);
    ok('carnada: queda el ultimo resultado para el mapa, el PDF y las geocercas', mod.RX_CARN.res === rCar);
    const md = mod.carnMapaDatos();
    ok('mapa: un circulo de 30 m y una marca numerada por punto',
        md && md.lineas.length >= rCar.puntos.length && md.marcas.some((m) => m.num === 'C01') && /Alta/.test(md.leyenda));
    const csvD = mod.carnCSVDatos(rCar);
    ok('datos por punto: CSV con puntos y perdidas', /^"tipo","punto"/.test(csvD) && /"punto","C01"/.test(csvD) && /"perdida","C01"/.test(csvD), csvD.slice(0, 160));
    const html = mod.carnHTML(rCar);
    ok('PDF: portada, esencial, metodologia, hallazgo principal, tabla, volumen y acciones',
        /Hallazgos de convergencia con unidades carnada/.test(html) && /Lo esencial/.test(html) && /Metodolog/.test(html) && /El hallazgo principal/.test(html) &&
        /Los \d+ puntos/.test(html) && /Volumen por punto/.test(html) && /Acciones y siguientes pasos/.test(html) && /<svg/.test(html) && /C01/.test(html));
    ok('PDF: no afirma lo que no sabe (es probable, se confirma en campo; sin historial lo dice)',
        /probable/.test(html) && /campo/.test(html) && /No se pidieron las llegadas/.test(html));
    ok('PDF: sin puntos dice que no hay y que hacer',
        /Ning\u00fan punto cumple/.test(mod.carnHTML(Object.assign({}, rCar, { puntos: [], aislados: [], meta: Object.assign({}, rCar.meta, { puntos: 0, litrosPuntos: 0, eventosPuntos: 0, alta: 0, media: 0, baja: 0 }) }))));
    ok('geocercas: un circulo de Rondo por punto, con su nombre y radio', (function () {
        const n = mod.carnCreaGeocercas(rCar.puntos, 30, 30);
        return n === rCar.puntos.length && mod.P_GEOS.length === n && mod.P_GEOS[0].t === 3 && mod.P_GEOS[0].w === 30 && /^Robo C01/.test(mod.P_GEOS[0].n);
    })());
    // Con llegadas: el historial de las unidades carnada (stub de load_interval).
    tablaThefts = true;
    mod.rxInfCacheLimpiar();
    mod.setStops((uid) => {
        // la unidad 7 estuvo parada 8 min exactamente donde perdio; la 8 paso de largo
        if (String(uid) !== '7') return [M(1792000000 + 0, 20.0, -102.0, 60)];
        return [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => M(1792000000 - 60 + i * 60, 21.14071, -101.73470, 0));
    });
    const rLl = await mod.carnCorre({
        usarPlat: true, tpl: { rid: 3, id: 10, nombre: 'Informe de Combustible' }, def: {}, lista: [{ id: 7, eco: '105' }, { id: 8, eco: '106' }],
        desde: 1700000000, hasta: 1700000000 + 3600, cfgFuel: { litros: 10, vel: 3, tasa: 3 }, cfgCarn: { llegadas: true, topPuntos: 5, ventanaH: 1 }, onFase: null, token: null
    });
    tablaThefts = false;
    mod.setStops(null);
    ok('llegadas: se piden por unidad y ventana y entran como paradas del punto',
        rLl.llegadas.length >= 1 && rLl.llegadas.every((l) => l.eco === '105') && rLl.meta.llegadasN === rLl.llegadas.length,
        JSON.stringify({ l: rLl.llegadas.length, m: rLl.meta }));
    ok('llegadas: contrastan las perdidas con las paradas (coincidencia)', rLl.verif && rLl.verif.total >= 1 && rLl.verif.coinciden >= 1 && rLl.tablas.some((t) => t.label === 'Llegadas'));
    ok('llegadas: el PDF trae la verificacion con el historial', /Verificaci\u00f3n con el historial/.test(mod.carnHTML(rLl)) && /Coincidencia/.test(mod.carnHTML(rLl)));
    const sinTok = await mod.carnEscaneaLlegadas([{ id: 7, eco: '105' }], [[1, 2]], [{ lat: 1, lon: 1 }], {}, null, { cancelado: true });
    ok('llegadas: un token cancelado corta el escaneo sin pedir nada', sinTok.hechas === 0);
    ok('sensor propio: sus filas se convierten a eventos con coordenadas y duracion', (function () {
        const e = mod.carnEvsDeSensor({ filas: [['3686', '2026-10-14 13:36:25', '65', '3', '0', 'on', '21.14071, -101.73470', 'PATIO']] });
        return e.length === 1 && e[0].eco === '3686' && e[0].litros === 65 && e[0].durSeg === 180 && Math.abs(e[0].lat - 21.14071) < 1e-9 && e[0].ms1 - e[0].ms0 === 180000;
    })());
    ok('plantilla integrada de carnada: lleva fuel y carnada', mod.RX_CARN_TPL.fuel === true && mod.RX_CARN_TPL.carnada === true && mod.rxFuelEsTpl(mod.RX_CARN_TPL));

    // El caso REAL de la plantilla GEOCERCA: la tabla trae units:"1820" (la
    // geocerca) y eso es un parametro invalido (code 7). El reintento, al
    // ejecutarse por la geocerca, QUITA ese filtro y la plataforma responde.
    mod.RX_INF._datos = await mod.rxInfDatosPlantilla({ rid: 3, id: 12 });
    codigo7units = true; tablaThefts = true; mod.rxInfCacheLimpiar();
    const ejGeo = await mod.rxInfEjecuta({ rid: 3, id: 12, nombre: 'GEOCERCA' },
        { id: '1820', sec: '0', eco: 'geozona', esZona: true }, 1700000000, 1700000000 + 3600, null, 0, null);
    codigo7units = false; tablaThefts = false;
    ok('code 7 (GEOCERCA): el reintento quita el filtro de unidades invalido y salen filas',
        (ejGeo.filas || []).length > 0 && !ejGeo.error, JSON.stringify({ n: (ejGeo.filas || []).length, e: ejGeo.error }));
    // code 7: reintento con la definicion que rellena el filtro del objeto.
    const def7 = mod.rxInfDefConObjeto([{ id: 10, tbl: [{ n: 't', p: '{"units":"999","address_format":"1255"}' }] }], 10, { id: '7', esZona: false }, null);
    ok('code 7: con una unidad, la definicion rellena "units" con ella y deja id 0',
        def7 && def7.id === 0 && JSON.parse(def7.tbl[0].p).units === '7' && JSON.parse(def7.tbl[0].p).address_format === '1255');
    // Plantilla GEOCERCA real: la tabla geozone_units trae units:"1820" (que es
    // la geocerca) y el informe se ejecuta POR la geocerca 1820.
    const tplGeo = [{ id: 12, n: 'GEOCERCA', ct: 'avl_geozone', tbl: [
        { n: 'geofences', l: 'Dibujar geocercas', c: '', p: '{}' },
        { n: 'geozone_stats', l: 'Estadisticas', c: '', p: '{"address_format":"1255211008_10_5","time_format":"%E.%m.%Y_%H:%M:%S","us_units":0,"averaging":"none","geofence_exit_msg":"1820"}' },
        { n: 'geozone_units', l: 'Unidades', c: '["unit_name","time_begin"]', p: '{"units":"1820"}' }
    ] }];
    const defZ = mod.rxInfDefConObjeto(tplGeo, 12, { id: '1820', esZona: true }, null);
    ok('code 7 (GEOCERCA): la geocerca NO se mete en el filtro de unidades (era el valor invalido)',
        !!defZ && defZ.id === 0 && JSON.parse(defZ.tbl[2].p).units === undefined,
        JSON.stringify(defZ && defZ.tbl.map((t) => t.p)));
    const pStats = defZ ? JSON.parse(defZ.tbl[1].p) : {};
    ok('code 7 (GEOCERCA): se limpia el ajuste con el id del objeto (geofence_exit_msg:"1820") y se conservan los formatos',
        pStats.geofence_exit_msg === undefined && pStats.address_format === '1255211008_10_5' && pStats.time_format === '%E.%m.%Y_%H:%M:%S',
        JSON.stringify(pStats));
    // El saneo tambien va en la definicion "sin filtros" (candidato de modelo).
    const defSin = mod.rxInfDefSinUnidades(tplGeo, 12);
    ok('code 7 (GEOCERCA): la definicion sin filtros tambien queda saneada',
        defSin && JSON.parse(defSin.tbl[1].p).geofence_exit_msg === undefined && JSON.parse(defSin.tbl[2].p).units === undefined);
    // Y para un objeto NO geocerca, "units" sí se rellena.
    const defU2 = mod.rxInfDefConObjeto(tplGeo, 12, { id: '7', esZona: false }, null);
    ok('code 7: si el objeto es una unidad, "units" se rellena con ella',
        defU2 && JSON.parse(defU2.tbl[2].p).units === '7');
    // El reintento parte de la definicion que ya venia (no la reinicia).
    const defKeep = mod.rxInfDefConObjeto(null, 12, { id: '1820', esZona: true }, null,
        { id: 0, tbl: [{ n: 'geozone_units', p: '{}' }] });
    ok('code 7: el reintento respeta la definicion que ya venia (no la reinicia)',
        defKeep && defKeep.tbl.length === 1 && JSON.parse(defKeep.tbl[0].p).units === undefined);
    codigo7 = true; tablaThefts = true; mod.rxInfCacheLimpiar();
    const r7 = await mod.rxInfCorre({ rid: 3, id: 11, nombre: 'Resumen diario' }, 1700000000, 1700000000 + 3600, [{ id: 7, eco: '105' }], null, null);
    const usoDef7 = calls.some((c) => c.m === 'report/exec_report' && c.p.reportTemplateId === 0 && c.p.reportTemplate);
    codigo7 = false; tablaThefts = false;
    ok('code 7: al reintentar con la definicion propia la plataforma responde y salen filas',
        usoDef7 && (r7.filas || []).length > 0, JSON.stringify({ uso: usoDef7, n: (r7.filas || []).length }));

    // Descarte por geocerca dentro de carnCorre: si el punto cae dentro de una
    // geocerca (patio/planta), la perdida NO forma punto.
    tablaThefts = true; mod.rxInfCacheLimpiar();
    mod.estado.zona = { lat: 21.14071, d: 0.01, n: 'PLANTA VALLE' };
    const rGeo = await mod.carnCorre({
        usarPlat: true, tpl: { rid: 3, id: 10, nombre: 'Informe de Combustible' }, def: {}, lista: [{ id: 7, eco: '105' }, { id: 8, eco: '106' }],
        desde: 1700000000, hasta: 1700000000 + 3600, cfgFuel: { litros: 10, vel: 3, tasa: 3 }, cfgCarn: { geoDescarta: true }, onFase: null, token: null
    });
    mod.estado.zona = null; tablaThefts = false;
    // El script pone 7 filas; 2 unidades. En la zona hay 2 robos por unidad
    // (LUG y LUG2, a ~7 m) => 4 eventos fuera. Queda el robo chico en OTRO.
    ok('carnada: las perdidas dentro de una geocerca se descartan (patio o planta)',
        rGeo.puntos.length === 1 && rGeo.geoDescartadas === 4 && rGeo.meta.geoDescartadas === 4 &&
        /^20\.75/.test(rGeo.puntos[0].lat.toFixed(5)),
        JSON.stringify({ puntos: rGeo.puntos.length, geo: rGeo.geoDescartadas, p0: rGeo.puntos[0] && rGeo.puntos[0].lat }));
    // Sin descartar geocercas, ese mismo punto si se marca (control).
    tablaThefts = true; mod.rxInfCacheLimpiar();
    mod.estado.zona = { lat: 21.14071, d: 0.01, n: 'PLANTA VALLE' };
    const rGeo2 = await mod.carnCorre({
        usarPlat: true, tpl: { rid: 3, id: 10, nombre: 'Informe de Combustible' }, def: {}, lista: [{ id: 7, eco: '105' }, { id: 8, eco: '106' }],
        desde: 1700000000, hasta: 1700000000 + 3600, cfgFuel: { litros: 10, vel: 3, tasa: 3 }, cfgCarn: { geoDescarta: false }, onFase: null, token: null
    });
    mod.estado.zona = null; tablaThefts = false;
    ok('carnada: con el descarte de geocercas apagado el punto si se marca',
        rGeo2.puntos.length >= 1 && rGeo2.meta.geoDescartadas === 0);

    console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasan');
    process.exit(fallos ? 1 : 0);
})();
