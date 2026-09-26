/*
 * Pruebas de la planificacion multipunto (v5.15):
 *   - busqueda difusa (fuzzyScore / levenshtein acotado)
 *   - parser y serializacion de paradas
 *   - optimizador de orden (vecino mas cercano + 2-opt)
 *   - municipios OSM (poligono, centro, bbox)
 *
 * Extrae el bloque contiguo de funciones entre centroDeZona y la seccion
 * RUTAS, con stubs de red/navegador. No toca Internet ni el DOM.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('function centroDeZona(z) {');
const fin = src.indexOf('/* ====================== RUTAS (almacenamiento y planificacion)', ini);
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de paradas/municipios en ' + ARCHIVO);
    process.exit(1);
}

const code =
    'const RADIO_TIERRA=6371008.8;\n' +
    'function rad(d){return d*Math.PI/180;}\n' +
    'function grad(r){return r*180/Math.PI;}\n' +
    'function haversine(a,b,c,d){const x=rad(c-a),y=rad(d-b);const s=Math.sin(x/2)*Math.sin(x/2)+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)*Math.sin(y/2);return 2*RADIO_TIERRA*Math.asin(Math.min(1,Math.sqrt(s)));}\n' +
    'function norm(s){return String(s==null?"":s).normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").toUpperCase().trim();}\n' +
    'const sleep=()=>Promise.resolve();\n' +
    'const LS={municipios:"rondo.api.municipios"};\n' +
    'function writeJSON(){}\n' +
    'const APP={municipios:[],municipiosRiesgo:[],zonas:[],planes:{},watchMap:{},riesgo:null};\n' +
    src.slice(ini, fin) +
    '\nreturn {centroDeZona,puntoEnPoligono,simplificarAnillo,municipioDesdeNominatim,buscarMunicipioLocal,' +
    'municipioEn,recalcularMunicipiosRiesgo,normalizarBusqueda,levenshteinAcotado,fuzzyScore,catalogoParadas,' +
    'encontrarZona,nuevaParada,parsearParada,textoAParadas,paradaATexto,planATexto,planDe,' +
    'ordenarParadasOptimo,ordenarSegmento,municipioDeRuta,calcularMunicipiosDeRuta,APP};';
const mod = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

// --- Busqueda difusa ---
ok('fuzzyScore: igualdad = 1000', mod.fuzzyScore('Monterrey', 'Monterrey') === 1000);
ok('fuzzyScore: prefijo alto', mod.fuzzyScore('Monte', 'Monterrey') >= 700);
ok('fuzzyScore: subcadena', mod.fuzzyScore('rre', 'Monterrey') > 0);
ok('fuzzyScore: sin acentos', mod.fuzzyScore('merida', 'M\u00e9rida') === 1000);
ok('fuzzyScore: typo cercano', mod.fuzzyScore('monterry', 'Monterrey') > 0);
ok('fuzzyScore: texto ajeno = 0', mod.fuzzyScore('zzzzzz', 'Monterrey') === 0);
ok('levenshtein acotado', mod.levenshteinAcotado('casa', 'caza', 3) === 1);

// --- Parser y serializacion ---
const pGeo = mod.parsearParada('geo:Patio Norte');
ok('parsearParada: geo', pGeo.tipo === 'geocerca' && pGeo.texto === 'Patio Norte');
const pMun = mod.parsearParada('mun:Monterrey');
ok('parsearParada: municipio', pMun.tipo === 'municipio' && pMun.texto === 'Monterrey');
const pCoord = mod.parsearParada('25.68, -100.31');
ok('parsearParada: coordenadas', pCoord.tipo === 'coord' && pCoord.coords.lat === 25.68 && pCoord.coords.lon === -100.31);
const pLugar = mod.parsearParada('Plaza de la Republica');
ok('parsearParada: lugar libre', pLugar.tipo === 'lugar' && pLugar.coords === null);

ok('paradaATexto: geo', mod.paradaATexto(pGeo) === 'geo:Patio Norte');
ok('paradaATexto: coord', mod.paradaATexto(pCoord) === 'coord:25.68, -100.31');

const lista = mod.textoAParadas('Monterrey | geo:Patio\nmun:Saltillo; A, B');
ok('textoAParadas: separa por | ; y salto', lista.length === 4, 'n=' + lista.length);
ok('textoAParadas: conserva tipos', lista[1].tipo === 'geocerca' && lista[2].tipo === 'municipio');
const plan = { modo: 'secuencial', circuito: false, paradas: lista };
ok('planATexto: serializa unido', mod.planATexto(plan).indexOf('geo:Patio') >= 0 && mod.planATexto(plan).indexOf(' | ') >= 0);

// --- planDe: compatibilidad con watchMap ---
mod.APP.planes = {};
mod.APP.watchMap = { '4381': 'Monterrey | Saltillo' };
const derived = mod.planDe({ clave: '4381', eco: '4381' });
ok('planDe: deriva de watchMap', derived && derived.paradas.length === 2 && derived.modo === 'secuencial');
mod.APP.planes = { '4381': { modo: 'optimo', circuito: true, paradas: [mod.nuevaParada('geocerca', 'Patio', { lat: 1, lon: 2 })] } };
const stored = mod.planDe({ clave: '4381', eco: '4381' });
ok('planDe: prioriza el plan estructurado', stored.modo === 'optimo' && stored.paradas.length === 1);

// --- Optimizador ---
const origen = { lat: 0, lon: 0 };
const stops = [
    { id: 'A', coords: { lat: 0, lon: 0.01 }, fijo: false },
    { id: 'B', coords: { lat: 0, lon: 0.03 }, fijo: false },
    { id: 'C', coords: { lat: 0, lon: 0.02 }, fijo: false }
];
const opt = mod.ordenarParadasOptimo(stops.map((s) => Object.assign({}, s)), origen, true);
ok('optimizador: conserva todas las paradas', opt.length === 3);
ok('optimizador: vecino mas cercano primero', opt[0].id === 'A', opt.map((x) => x.id).join(','));
ok('optimizador: orden por cercania A,C,B', opt.map((x) => x.id).join(',') === 'A,C,B', opt.map((x) => x.id).join(','));

const conFija = [
    { id: 'A', coords: { lat: 0, lon: 0.01 }, fijo: false },
    { id: 'B', coords: { lat: 0, lon: 0.03 }, fijo: true },
    { id: 'C', coords: { lat: 0, lon: 0.02 }, fijo: false }
];
const opt2 = mod.ordenarParadasOptimo(conFija.map((s) => Object.assign({}, s)), origen, true);
ok('optimizador: respeta la parada fijada en su sitio', opt2[1].id === 'B', opt2.map((x) => x.id).join(','));

// --- Municipios OSM ---
const nom = mod.municipioDesdeNominatim({
    lat: '25.68', lon: '-100.31', name: 'Monterrey',
    address: { city: 'Monterrey', state: 'Nuevo Le\u00f3n' },
    boundingbox: ['25.5', '25.8', '-100.4', '-100.2'],
    geojson: { type: 'Polygon', coordinates: [[[-100.4, 25.5], [-100.2, 25.5], [-100.2, 25.8], [-100.4, 25.8], [-100.4, 25.5]]] }
});
ok('municipioDesdeNominatim: nombre y estado', nom.nombre === 'Monterrey' && nom.estado === 'Nuevo Le\u00f3n');
ok('municipioDesdeNominatim: poligono', Array.isArray(nom.poligono) && nom.poligono.length >= 4);
ok('municipioDesdeNominatim: centro', nom.centro && nom.centro.lat > 25.5 && nom.centro.lat < 25.8);

ok('puntoEnPoligono: dentro', mod.puntoEnPoligono(25.6, -100.3, nom.poligono) === true);
ok('puntoEnPoligono: fuera', mod.puntoEnPoligono(10, 10, nom.poligono) === false);

mod.APP.municipios = [nom];
ok('municipioEn: encuentra por poligono', !!mod.municipioEn(25.6, -100.3));
ok('municipioEn: null si esta fuera', mod.municipioEn(10, 10) === null);

mod.APP.riesgo = [
    { municipio: 'Escobedo', estado: 'NL', score: 80, radio_m: 1000, centro: [25.7, -100.3] },
    { municipio: 'Escobedo', estado: 'NL', score: 60, radio_m: 2000, centro: [25.72, -100.32] }
];
mod.recalcularMunicipiosRiesgo();
ok('recalcularMunicipiosRiesgo: agrupa por municipio', mod.APP.municipiosRiesgo.length === 1);
ok('recalcularMunicipiosRiesgo: radio maximo', mod.APP.municipiosRiesgo[0].radioM === 2000);
ok('municipioEn: usa municipios de riesgo', !!mod.municipioEn(25.7, -100.3));

// centroDeZona: circulo
const zc = mod.centroDeZona({ t: 3, b: { cen_x: 10, cen_y: 20 }, w: 100 });
ok('centroDeZona: circulo', zc.lat === 20 && zc.lon === 10);
// centroDeZona: poligono
const zp = mod.centroDeZona({ t: 2, p: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }] });
ok('centroDeZona: poligono promedio', zp.lon > 1 && zp.lat > 0);

// municipioDeRuta
const ruta = { municipios: ['Monterrey'] };
ok('municipioDeRuta: coincide', mod.municipioDeRuta(ruta, { nombre: 'monterrey' }) === true);
ok('municipioDeRuta: no coincide', mod.municipioDeRuta(ruta, { nombre: 'Saltillo' }) === false);

// catalogoParadas: geocercas + municipios con puntuacion
mod.APP.zonas = [{ id: 1, n: 'CEDIS Norte', t: 3, b: { cen_x: -100.3, cen_y: 25.7 }, w: 500 }];
mod.APP.municipios = [nom];
const cat = mod.catalogoParadas('cedis', 8);
ok('catalogoParadas: sugiere geocerca', cat.some((x) => x.tipo === 'geocerca' && x.texto === 'CEDIS Norte'));
const cat2 = mod.catalogoParadas('monterrey', 8);
ok('catalogoParadas: sugiere municipio', cat2.some((x) => x.tipo === 'municipio' && x.texto === 'Monterrey'));

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
