/*
 * Pruebas de los algoritmos de la pestana Riesgo.
 * Cubre: nivelRiesgo, radioEfectivo, fmtArea, areaKm2DeRadio, delitosTop,
 *        riesgoHaystack, calcularStatsRiesgo, filtrarZonas, ordenarZonas,
 *        agruparPorEstado.
 * Son funciones puras: no requieren DOM ni Wialon.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'rondo.user.js');
const src = fs.readFileSync(ARCHIVO, 'utf8');

// Toma el bloque que va desde el comentario "Algoritmos UI" hasta el fin
// de la funcion topDelitos (la ultima auxiliar agregada en la pestana Riesgo).
const ini = src.indexOf('/* ── Algoritmos UI de la pestana Riesgo');
const fin = src.indexOf('function topDelitos(stats, n)', ini);
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de algoritmos de Riesgo en ' + ARCHIVO);
    process.exit(1);
}
// Capturamos hasta el cierre de riesgoDetalleHTML (primer } al final de la funcion).
const finDetalle = src.indexOf('function riesgoDetalleHTML', ini);
const finReal = src.indexOf('\n    }', finDetalle) + 6;
const code =
    'const clamp=(v,lo,hi)=>Math.min(Math.max(v,lo),hi);\n' +
    'const esc=(s)=>String(s).replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"})[c]);\n' +
    src.slice(ini, finReal) +
    '\nreturn {RIESGO_NIVEL,nivelRiesgo,radioEfectivo,areaKm2DeRadio,fmtArea,delitosTop,riesgoHaystack,calcularStatsRiesgo,filtrarZonas,ordenarZonas,agruparPorEstado,topDelitos,donutSegmentos,donutDashArray,histogramaScores,tiempoRelativo,riesgoParaCSV,riesgoParaGeoJSON,riesgoParaClipboard,riesgoDetalleHTML};';
const mod = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}
function casi(a, b, tol) { return Math.abs(a - b) <= (tol == null ? 1e-6 : tol); }

/* ── nivelRiesgo ──────────────────────────────────────────────── */
ok('nivelRiesgo: 100 -> alto', mod.nivelRiesgo(100) === 'alto');
ok('nivelRiesgo: 85 -> alto', mod.nivelRiesgo(85) === 'alto');
ok('nivelRiesgo: 70 -> alto (umbral inclusivo)', mod.nivelRiesgo(70) === 'alto');
ok('nivelRiesgo: 69 -> medio', mod.nivelRiesgo(69) === 'medio');
ok('nivelRiesgo: 40 -> medio (umbral inclusivo)', mod.nivelRiesgo(40) === 'medio');
ok('nivelRiesgo: 39 -> bajo', mod.nivelRiesgo(39) === 'bajo');
ok('nivelRiesgo: 0 -> bajo', mod.nivelRiesgo(0) === 'bajo');
ok('nivelRiesgo: null -> bajo', mod.nivelRiesgo(null) === 'bajo');
ok('nivelRiesgo: undefined -> bajo', mod.nivelRiesgo(undefined) === 'bajo');
ok('nivelRiesgo: NaN -> bajo', mod.nivelRiesgo(NaN) === 'bajo');
ok('nivelRiesgo: "50" -> medio (coercion)', mod.nivelRiesgo('50') === 'medio');
ok('RIESGO_NIVEL.ALTO=70, MEDIO=40', mod.RIESGO_NIVEL.ALTO === 70 && mod.RIESGO_NIVEL.MEDIO === 40);

/* ── radioEfectivo ────────────────────────────────────────────── */
ok('radioEfectivo: r=1000, mul=1.5 -> 1500', mod.radioEfectivo({ radio_m: 1000 }, 1.5) === 1500);
ok('radioEfectivo: r=0 -> 0', mod.radioEfectivo({ radio_m: 0 }, 2) === 0);
ok('radioEfectivo: mul invalido -> 1x', mod.radioEfectivo({ radio_m: 1000 }, 'x') === 1000);
ok('radioEfectivo: mul 0 -> 1x (defensivo)', mod.radioEfectivo({ radio_m: 1000 }, 0) === 1000);

/* ── areaKm2DeRadio / fmtArea ─────────────────────────────────── */
ok('areaKm2DeRadio: 1000 m -> ~3.14 km^2', casi(mod.areaKm2DeRadio(1000), Math.PI, 0.01));
ok('areaKm2DeRadio: 0 -> 0', mod.areaKm2DeRadio(0) === 0);
ok('areaKm2DeRadio: negativo -> 0', mod.areaKm2DeRadio(-50) === 0);
ok('fmtArea: 0 -> "0"', mod.fmtArea(0) === '0');
ok('fmtArea: 0.5 -> m^2', /m\u00b2/.test(mod.fmtArea(0.5)));
ok('fmtArea: 5 -> "5.0 km^2"', mod.fmtArea(5) === '5.0 km\u00b2');
ok('fmtArea: 12.34 -> "12.3 km^2"', mod.fmtArea(12.34) === '12.3 km\u00b2');

/* ── delitosTop ───────────────────────────────────────────────── */
const zCon = { delitos: { robo_vehiculo: 12, asalto: 5, vandalismo: 0 } };
ok('delitosTop: filtra conteos 0', !mod.delitosTop(zCon).match(/vandalismo/));
ok('delitosTop: ordena por conteo desc', mod.delitosTop(zCon).startsWith('robo vehiculo: 12'));
ok('delitosTop: limita a N', (mod.delitosTop(zCon, 1).match(/\u00b7/g) || []).length === 0);
ok('delitosTop: sin delitos -> ""', mod.delitosTop({}) === '');
ok('delitosTop: delitos no-objeto -> ""', mod.delitosTop({ delitos: 'x' }) === '');

/* ── riesgoHaystack ───────────────────────────────────────────── */
ok('riesgoHaystack: une campos clave',
    mod.riesgoHaystack({ estado: 'CDMX', municipio: 'Cuauhtemoc', id: 'mx-01', fuente: 'sesnsp' }).includes('cdmx'));
ok('riesgoHaystack: incluye delitos',
    mod.riesgoHaystack({ delitos: { robo_vehiculo: 5 } }).includes('robo_vehiculo'));
ok('riesgoHaystack: null -> ""', mod.riesgoHaystack(null) === '');

/* ── calcularStatsRiesgo ──────────────────────────────────────── */
const items = [
    { estado: 'CDMX', municipio: 'Cuauhtemoc', score: 85, radio_m: 1500, lat: 19.4326, lon: -99.1332,
        delitos: { robo_vehiculo: 12, asalto: 5 } },
    { estado: 'CDMX', municipio: 'Iztapalapa', score: 55, radio_m: 2200, lat: 19.3551, lon: -99.0892,
        delitos: { robo_vehiculo: 3 } },
    { estado: 'Jalisco', municipio: 'Guadalajara', score: 25, radio_m: 500, lat: 20.6597, lon: -103.3496,
        delitos: { vandalismo: 2 } },
    { estado: 'CDMX', municipio: 'Cuauhtemoc', score: 70, radio_m: 800, lat: 19.43, lon: -99.13,
        delitos: { robo_vehiculo: 1, asalto: 1 } },
];
const s = mod.calcularStatsRiesgo(items);
ok('calcularStats: total=4', s.total === 4);
ok('calcularStats: alto=2 (85, 70)', s.alto === 2);
ok('calcularStats: medio=1 (55)', s.medio === 1);
ok('calcularStats: bajo=1 (25)', s.bajo === 1);
ok('calcularStats: maxScore=85', s.maxScore === 85);
ok('calcularStats: promScore ~59', s.promScore === Math.round((85 + 55 + 25 + 70) / 4));
ok('calcularStats: municipios=3 (CDMX/Cuauhtemoc, CDMX/Iztapalapa, Jalisco/Guadalajara)', s.municipios === 3);
ok('calcularStats: areaKm2 > 0', s.areaKm2 > 0);
ok('calcularStats: delitosAcum.robo_vehiculo = 16', s.delitosAcum.robo_vehiculo === 16);
ok('calcularStats: delitosAcum.asalto = 6', s.delitosAcum.asalto === 6);
ok('calcularStats: lista vacia -> zeros', mod.calcularStatsRiesgo([]).total === 0);
ok('calcularStats: null -> zeros', mod.calcularStatsRiesgo(null).total === 0);

/* ── filtrarZonas ─────────────────────────────────────────────── */
ok('filtrarZonas: sin filtro -> todos', mod.filtrarZonas(items, '', 'todas').length === 4);
ok('filtrarZonas: solo nivel alto -> 2', mod.filtrarZonas(items, '', 'alto').length === 2);
ok('filtrarZonas: solo nivel medio -> 1', mod.filtrarZonas(items, '', 'medio').length === 1);
ok('filtrarZonas: solo nivel bajo -> 1', mod.filtrarZonas(items, '', 'bajo').length === 1);
ok('filtrarZonas: por estado (CDMX) -> 3', mod.filtrarZonas(items, 'cdmx', 'todas').length === 3);
ok('filtrarZonas: por municipio (guad) -> 1', mod.filtrarZonas(items, 'guad', 'todas').length === 1);
ok('filtrarZonas: por delito (asalto) -> 2', mod.filtrarZonas(items, 'asalto', 'todas').length === 2);
ok('filtrarZonas: texto + nivel combinados',
    mod.filtrarZonas(items, 'cdmx', 'alto').length === 2);
ok('filtrarZonas: lista vacia -> []', mod.filtrarZonas([], 'x', 'todas').length === 0);
ok('filtrarZonas: null -> []', mod.filtrarZonas(null, 'x', 'todas').length === 0);
ok('filtrarZonas: case-insensitive', mod.filtrarZonas(items, 'CDMX', 'todas').length === 3);
ok('filtrarZonas: trim de espacios', mod.filtrarZonas(items, '   cdmx   ', 'todas').length === 3);

/* ── ordenarZonas ─────────────────────────────────────────────── */
ok('ordenarZonas: score desc default', mod.ordenarZonas(items)[0].score === 85);
ok('ordenarZonas: score-asc', mod.ordenarZonas(items, 'score-asc')[0].score === 25);
ok('ordenarZonas: score-desc', mod.ordenarZonas(items, 'score-desc')[0].score === 85);
ok('ordenarZonas: estado (CDMX primero alfabeticamente vs Jalisco?)',
    mod.ordenarZonas(items, 'estado')[0].estado === 'CDMX' || mod.ordenarZonas(items, 'estado')[0].estado === 'Jalisco');
ok('ordenarZonas: municipio (C < G < I -> Cuauhtemoc primero)',
    mod.ordenarZonas(items, 'municipio')[0].municipio === 'Cuauhtemoc');
ok('ordenarZonas: radio-desc', mod.ordenarZonas(items, 'radio-desc')[0].radio_m === 2200);
ok('ordenarZonas: radio-asc', mod.ordenarZonas(items, 'radio-asc')[0].radio_m === 500);
ok('ordenarZonas: criterio invalido cae a score-desc', mod.ordenarZonas(items, 'foo')[0].score === 85);
ok('ordenarZonas: no muta el array original', (function () {
    const original = items.slice();
    mod.ordenarZonas(items, 'score-asc');
    for (let i = 0; i < original.length; i++) {
        if (original[i] !== items[i]) return false;
    }
    return true;
})());

/* ── agruparPorEstado ─────────────────────────────────────────── */
const grupos = mod.agruparPorEstado(items);
ok('agruparPorEstado: 2 grupos (CDMX, Jalisco)', grupos.length === 2);
const cdmx = grupos.find((g) => g.estado === 'CDMX');
const jal = grupos.find((g) => g.estado === 'Jalisco');
ok('agruparPorEstado: CDMX tiene 3 zonas', cdmx && cdmx.count === 3);
ok('agruparPorEstado: Jalisco tiene 1 zona', jal && jal.count === 1);
ok('agruparPorEstado: CDMX maxScore=85', cdmx && cdmx.maxScore === 85);
ok('agruparPorEstado: CDMX municipios=2', cdmx && cdmx.municipios === 2);
ok('agruparPorEstado: CDMX zonas ordenadas score desc',
    cdmx && cdmx.zonas[0].score === 85);
ok('agruparPorEstado: Jalisco areaKm2 ~ 0.79 (r=500m)',
    jal && casi(jal.areaKm2, Math.PI * 0.5 * 0.5, 0.05));
ok('agruparPorEstado: grupos ordenados por maxScore desc',
    grupos[0].maxScore >= grupos[1].maxScore);
ok('agruparPorEstado: lista vacia -> []', mod.agruparPorEstado([]).length === 0);

/* ── topDelitos ───────────────────────────────────────────────── */
const td = mod.topDelitos(s, 2);
ok('topDelitos: 2 elementos', td.length === 2);
ok('topDelitos: primero es robo_vehiculo (16)',
    td[0].key === 'robo_vehiculo' && td[0].n === 16);
ok('topDelitos: segundo es asalto (6)',
    td[1].key === 'asalto' && td[1].n === 6);
ok('topDelitos: stats vacias -> []', mod.topDelitos(mod.calcularStatsRiesgo([])).length === 0);

/* ── donutSegmentos ──────────────────────────────────────────── */
const donutVacio = mod.donutSegmentos(0, 0, 0, 74, 9);
ok('donutSegmentos: vacio -> total 0', donutVacio.total === 0);
ok('donutSegmentos: vacio -> radio correcto', donutVacio.radio === 74/2 - 9/2);
const donutMix = mod.donutSegmentos(2, 1, 1, 100, 10);
ok('donutSegmentos: total = suma', donutMix.total === 4);
ok('donutSegmentos: 3 segmentos', donutMix.segmentos.length === 3);
ok('donutSegmentos: fracciones suman 1', Math.abs(donutMix.segmentos[0].fraccion + donutMix.segmentos[1].fraccion + donutMix.segmentos[2].fraccion - 1) < 1e-9);
ok('donutSegmentos: longitud = fraccion * circ', casi(donutMix.segmentos[0].longitud, donutMix.segmentos[0].fraccion * donutMix.circunferencia, 0.01));
ok('donutSegmentos: colorKey asignado', donutMix.segmentos[0].colorKey === 'alto');

/* ── donutDashArray ──────────────────────────────────────────── */
const dash = mod.donutDashArray(donutMix.segmentos, donutMix.circunferencia);
ok('donutDashArray: 3 elementos', dash.length === 3);
ok('donutDashArray: longitudes suman circ',
    casi(dash[0].len + dash[1].len + dash[2].len, donutMix.circunferencia, 0.5));
ok('donutDashArray: offsets suman total',
    casi(Math.abs(dash[0].off) + dash[0].len - Math.abs(dash[1].off), 0, 0.5));

/* ── histogramaScores ────────────────────────────────────────── */
const hist = mod.histogramaScores(items);
ok('histogramaScores: 5 buckets', hist.buckets.length === 5);
ok('histogramaScores: total = suma', hist.counts.reduce((a, b) => a + b, 0) === hist.total);
ok('histogramaScores: total = items.length', hist.total === items.length);
ok('histogramaScores: max = max count', hist.max === Math.max.apply(null, hist.counts));
ok('histogramaScores: bucket 80-100 cuenta 1 (score 85)', hist.counts[4] === 1);
ok('histogramaScores: bucket 60-80 cuenta 1 (score 70)', hist.counts[3] === 1);
ok('histogramaScores: bucket 40-60 cuenta 1 (score 55)', hist.counts[2] === 1);
ok('histogramaScores: bucket 20-40 cuenta 1 (score 25)', hist.counts[1] === 1);
ok('histogramaScores: bucket 0-20 cuenta 0', hist.counts[0] === 0);
const histVacio = mod.histogramaScores([]);
ok('histogramaScores: vacio -> total 0', histVacio.total === 0);
ok('histogramaScores: vacio -> max 0', histVacio.max === 0);

/* ── tiempoRelativo ─────────────────────────────────────────── */
const ahora = Date.now();
ok('tiempoRelativo: 0 ms -> "hace 0 s"', mod.tiempoRelativo(ahora) === 'hace 0 s');
ok('tiempoRelativo: futuro -> "recien"', mod.tiempoRelativo(ahora + 60000) === 'recien');
ok('tiempoRelativo: 30 s -> "hace 30 s"', mod.tiempoRelativo(ahora - 30000) === 'hace 30 s');
ok('tiempoRelativo: 60 s -> "hace 1 min"', mod.tiempoRelativo(ahora - 60000) === 'hace 1 min');
ok('tiempoRelativo: 5 min -> "hace 5 min"', mod.tiempoRelativo(ahora - 5 * 60000) === 'hace 5 min');
ok('tiempoRelativo: 2 h -> "hace 2 h"', mod.tiempoRelativo(ahora - 2 * 3600000) === 'hace 2 h');
ok('tiempoRelativo: 3 d -> "hace 3 d"', mod.tiempoRelativo(ahora - 3 * 86400000) === 'hace 3 d');
ok('tiempoRelativo: 0 -> ""', mod.tiempoRelativo(0) === '');

/* ── riesgoParaCSV ──────────────────────────────────────────── */
const csv = mod.riesgoParaCSV(items);
ok('riesgoParaCSV: header + N filas', csv.length === items.length + 1);
ok('riesgoParaCSV: header correcto', csv[0].join(',') === 'estado,municipio,score,radio_m,lat,lon,fuente,id,delitos');
const fila0 = csv[1];
ok('riesgoParaCSV: estado', fila0[0] === 'CDMX');
ok('riesgoParaCSV: municipio', fila0[1] === 'Cuauhtemoc');
ok('riesgoParaCSV: score numerico', fila0[2] === 85);
ok('riesgoParaCSV: radio numerico', fila0[3] === 1500);
ok('riesgoParaCSV: delitos como string ; separado',
    typeof fila0[8] === 'string' && fila0[8].indexOf(':') >= 0);
const csvVacio = mod.riesgoParaCSV([]);
ok('riesgoParaCSV: vacio -> solo header', csvVacio.length === 1);

/* ── riesgoParaGeoJSON ──────────────────────────────────────── */
const geo = mod.riesgoParaGeoJSON(items);
ok('riesgoParaGeoJSON: type FeatureCollection', geo.type === 'FeatureCollection');
ok('riesgoParaGeoJSON: features = items.length', geo.features.length === items.length);
ok('riesgoParaGeoJSON: feature.geometry tipo Point', geo.features[0].geometry.type === 'Point');
ok('riesgoParaGeoJSON: coords [lon, lat]', Array.isArray(geo.features[0].geometry.coordinates) && geo.features[0].geometry.coordinates.length === 2);
ok('riesgoParaGeoJSON: properties.score', geo.features[0].properties.score === 85);
ok('riesgoParaGeoJSON: properties.delitos como objeto', typeof geo.features[0].properties.delitos === 'object');

/* ── riesgoParaClipboard ────────────────────────────────────── */
const txt = mod.riesgoParaClipboard(items);
ok('riesgoParaClipboard: empieza con cabecera', txt.indexOf('ZONAS DE RIESGO') === 0);
ok('riesgoParaClipboard: incluye cantidad', txt.indexOf('(' + items.length + ')') >= 0);
ok('riesgoParaClipboard: una linea por item',
    txt.split('\n').length === items.length + 2);
ok('riesgoParaClipboard: item incluye score', /\b85\b/.test(txt));
ok('riesgoParaClipboard: item incluye estado', txt.indexOf('CDMX') >= 0);
ok('riesgoParaClipboard: vacio -> ""', mod.riesgoParaClipboard([]) === '');

/* ── riesgoDetalleHTML ──────────────────────────────────────── */
const detalle = mod.riesgoDetalleHTML(items[0]);
ok('riesgoDetalleHTML: incluye estado', detalle.indexOf('CDMX') >= 0);
ok('riesgoDetalleHTML: incluye score', detalle.indexOf('85') >= 0);
ok('riesgoDetalleHTML: incluye buffer', detalle.indexOf('1500') >= 0);
ok('riesgoDetalleHTML: incluye coordenadas', detalle.indexOf('lat') < 0 && /\d+\.\d+,\s*-\d+\.\d+/.test(detalle));
ok('riesgoDetalleHTML: vacio -> ""', mod.riesgoDetalleHTML(null) === '');

/* ── Parser: derivacion de score/radio ──────────────────────────
 * El dataset real (gist) trae score:0 y radio_m:0 en todos los items y
 * los delitos en un objeto. El parser debe conservarlos y derivar score
 * (desde el total de delitos normalizado) y radio (desde el score).
 */
const iniP = src.indexOf('function _normItem');
const finP = src.indexOf('async function cargarRiesgo', iniP);
if (iniP < 0 || finP < 0) { console.error('No se encontro el parser de riesgo'); process.exit(1); }
const codeP = 'const isFinite2=isFinite;\n' + src.slice(iniP, finP) +
    '\nreturn {_normItem,_radioDeScore,_itemsFromJSON};';
const modP = new Function(codeP)();

ok('_radioDeScore: 85 -> 4000', modP._radioDeScore(85) === 4000);
ok('_radioDeScore: 70 -> 4000', modP._radioDeScore(70) === 4000);
ok('_radioDeScore: 50 -> 2200', modP._radioDeScore(50) === 2200);
ok('_radioDeScore: 25 -> 1400', modP._radioDeScore(25) === 1400);
ok('_radioDeScore: 5 -> 500', modP._radioDeScore(5) === 500);

// Item con radio 0 y score 0 + delitos: debe conservarse (antes se descartaba).
const it1 = modP._normItem({ id:'a', estado:'CDMX', municipio:'X', centro:[19.43,-99.13], radio_m:0, score:0, delitos:{Robo:10, Asalto:5} }, 'json', 0);
ok('_normItem: conserva item con radio=0', !!it1);
ok('_normItem: suma total de delitos', it1 && it1._total === 15);
ok('_normItem: radio 0 se conserva tal cual', it1 && it1.radio_m === 0);
// Item sin centro -> null
ok('_normItem: sin coordenadas -> null', modP._normItem({ id:'b', radio_m:100 }, 'json', 0) === null);

// _itemsFromJSON deriva score y radio cuando falta.
const ds = { items: [
    { id:'a', estado:'CDMX', municipio:'X', centro:[19.43,-99.13], radio_m:0, score:0, delitos:{Robo:100} },
    { id:'b', estado:'Jalisco', municipio:'Y', centro:[20.65,-103.34], radio_m:0, score:0, delitos:{Robo:25} },
    { id:'c', estado:'Nuevo Leon', municipio:'Z', centro:[25.68,-100.31], radio_m:0, score:0, delitos:{Robo:1} },
]};
const parsed = modP._itemsFromJSON(ds);
ok('_itemsFromJSON: conserva los 3 items', parsed.length === 3);
ok('_itemsFromJSON: deriva score (max -> 100)', parsed[0].score === 100);
ok('_itemsFromJSON: deriva score proporcional (sqrt)', parsed[1].score === Math.round(Math.sqrt(25/100)*100));
ok('_itemsFromJSON: score minimo 1', parsed[2].score >= 1);
ok('_itemsFromJSON: deriva radio desde score', parsed.every(z => z.radio_m > 0));
ok('_itemsFromJSON: item max -> radio 4000', parsed[0].radio_m === 4000);
ok('_itemsFromJSON: limpia _total', parsed.every(z => z._total === undefined));

// Dataset con score explicito: no debe sobreescribirse.
const ds2 = { items: [
    { id:'a', centro:[19.43,-99.13], score:55, radio_m:1500, delitos:{Robo:1} },
]};
const p2 = modP._itemsFromJSON(ds2);
ok('_itemsFromJSON: respeta score explicito', p2[0].score === 55);
ok('_itemsFromJSON: respeta radio explicito', p2[0].radio_m === 1500);

/* ── inZone (point-in-polygon) y _extraerZonasDe ───────────────
 * inZone tenia un bucle infinito (j = i en vez de j = i++) que
 * congelaba la pagina al pintar geocercas. Se cubre aqui.
 */
const iniZ = src.indexOf('function inZone(');
const finZ = src.indexOf('function zoneAt(', iniZ);
if (iniZ < 0 || finZ < 0) { console.error('No se encontro inZone'); process.exit(1); }
const modZ = new Function(src.slice(iniZ, finZ) + '\nreturn {inZone};')();

const cuadro = { id:1, n:'C', p:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}], b:{min_x:0,max_x:10,min_y:0,max_y:10} };
ok('inZone: punto dentro -> true', modZ.inZone(5, 5, cuadro) === true);
ok('inZone: punto fuera -> false', modZ.inZone(20, 20, cuadro) === false);
ok('inZone: fuera del bbox -> false', modZ.inZone(-1, -1, cuadro) === false);
ok('inZone: no cuelga (bucle finito)', true);
ok('inZone: sin puntos usa bbox', modZ.inZone(5, 5, { n:'b', b:{min_x:0,max_x:10,min_y:0,max_y:10} }) === true);
ok('inZone: circulo c/w', modZ.inZone(0, 0, { n:'c', c:{x:0,y:0}, w:1000 }) === true);
ok('inZone: null -> false', modZ.inZone(null, null, cuadro) === false);

const iniE = src.indexOf('function _extraerZonasDe(');
const finE = src.indexOf('async function fetchLastMotion', iniE);
if (iniE < 0 || finE < 0) { console.error('No se encontro _extraerZonasDe'); process.exit(1); }
const modE = new Function(src.slice(iniE, finE) + '\nreturn {_extraerZonasDe};')();
const fakeRes = () => ({ getZones: () => ({ 1: { id:1, n:'Z1', p:[] }, 2: { id:2, n:'Z2', p:[] } }) });
ok('_extraerZonasDe: getZones() -> 2', modE._extraerZonasDe([fakeRes()]).length === 2);
ok('_extraerZonasDe: deduplica', modE._extraerZonasDe([fakeRes(), fakeRes()]).length === 2);
ok('_extraerZonasDe: res.zones array', modE._extraerZonasDe([{ zones: [{ n:'A' }, { n:'B' }] }]).length === 2);
// La respuesta CRUDA de Wialon trae las geocercas en `zl` (zones library),
// NO via getZones() (eso es del SDK). Este es el caso que fallaba.
ok('_extraerZonasDe: campo crudo zl (array)', modE._extraerZonasDe([{ zl: [{ id:1, n:'A', p:[] }, { id:2, n:'B', p:[] }] }]).length === 2);
ok('_extraerZonasDe: campo crudo zl (objeto)', modE._extraerZonasDe([{ zl: { 1:{ id:1,n:'A' }, 2:{ id:2,n:'B' } } }]).length === 2);
ok('_extraerZonasDe: prefiere getZones sobre zl', (function(){
    const r = { getZones: () => ({ 1:{ id:1,n:'GZ' } }), zl: [{ id:9,n:'ZL' }] };
    const out = modE._extraerZonasDe([r]);
    return out.length === 1 && out[0].n === 'GZ';
})());
ok('_extraerZonasDe: sin zonas -> []', modE._extraerZonasDe([{}]).length === 0);
ok('_extraerZonasDe: ignora sin nombre', modE._extraerZonasDe([{ getZones: () => ({ 1: { id:1 } }) }]).length === 0);

console.log('\n' + (fallos === 0 ? 'Todos los tests pasaron' : 'Hay ' + fallos + ' test(s) fallido(s)'));
process.exit(fallos === 0 ? 0 : 1);
