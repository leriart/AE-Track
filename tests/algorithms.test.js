/*
 * Pruebas de los algoritmos geograficos y de rutas del userscript.
 * Uso:  node tests/algorithms.test.js
 *
 * Extrae el bloque de algoritmos de HJP-Wialon.user.js y lo ejecuta en un
 * contexto aislado con un unico stub de clamp(). No toca red ni DOM.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'HJP-Wialon.user.js');
const src = fs.readFileSync(ARCHIVO, 'utf8');

const ini = src.indexOf('const RADIO_TIERRA');
const fin = src.indexOf('/* ====================== RUTAS (almacenamiento');
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de algoritmos en ' + ARCHIVO);
    process.exit(1);
}

const code = 'const clamp=(v,lo,hi)=>Math.min(Math.max(v,lo),hi);\n' +
    src.slice(ini, fin) +
    '\nreturn {haversine,bearing,difAngulo,distPuntoSegmento,simplificarRuta,precomputarRuta,snapRuta,MinHeap,aEstrella,sentidoOneWay,parseMaxspeed,VEL_POR_TIPO};';
const mod = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}
function casi(a, b, tol) { return Math.abs(a - b) <= (tol == null ? 1 : tol); }

const h = mod.haversine(19.4326, -99.1332, 19.4426, -99.1332);
ok('haversine: 0.01 grados de latitud ~1113 m', casi(h, 1113, 8), h.toFixed(1));

ok('bearing: norte ~0', casi(mod.bearing(0, 0, 1, 0), 0, 0.5));
ok('bearing: este ~90', casi(mod.bearing(0, 0, 0, 1), 90, 0.5));
ok('difAngulo: 350 vs 10 = 20', casi(mod.difAngulo(350, 10), 20, 0.001));
ok('difAngulo: 0 vs 180 = 180', casi(mod.difAngulo(0, 180), 180, 0.001));

const d0 = mod.distPuntoSegmento(0, 0.0009, 0, 0, 0, 0.0018);
ok('distPuntoSegmento: punto sobre el segmento ~0', d0.dist < 5, d0.dist.toFixed(2));
const d1 = mod.distPuntoSegmento(0.0009, 0.0009, 0, 0, 0, 0.0018);
ok('distPuntoSegmento: punto a ~100 m', casi(d1.dist, 100, 3), d1.dist.toFixed(2));
ok('distPuntoSegmento: proyeccion t ~0.5', casi(d1.t, 0.5, 0.01), d1.t.toFixed(3));

// Camino geodesico (segmento > 1 km): punto sobre el meridiano de Mexico,
// segmento horizontal cerca del ecuador de ~3 km. Punto desplazado 500 m al
// norte; el camino geodesico debe coincidir con la proyeccion local dentro
// de pocos metros porque a esta latitud y escala el error es despreciable.
const dGeo1 = mod.distPuntoSegmento(0.0045, 0.02, 0, 0.02, 0, 0.05);
ok('distPuntoSegmento geo: perpendicular ~500 m', casi(dGeo1.dist, 500, 5), dGeo1.dist.toFixed(2));
ok('distPuntoSegmento geo: t ~0', casi(dGeo1.t, 0, 0.05), dGeo1.t.toFixed(3));

// Punto fuera del segmento por el lado B (geodesico, ~5 km segmento).
const dGeo2 = mod.distPuntoSegmento(0, 0.06, 0, 0.02, 0, 0.05);
ok('distPuntoSegmento geo: mas alla de B, t=1', dGeo2.t === 1, dGeo2.t.toFixed(3));
ok('distPuntoSegmento geo: dist = dist(punto,B)', casi(dGeo2.dist, mod.haversine(0, 0.06, 0, 0.05), 1),
    dGeo2.dist.toFixed(2) + ' vs ' + mod.haversine(0, 0.06, 0, 0.05).toFixed(2));

// Punto antes de A (geodesico).
const dGeo3 = mod.distPuntoSegmento(0, 0.01, 0, 0.02, 0, 0.05);
ok('distPuntoSegmento geo: antes de A, t=0', dGeo3.t === 0, dGeo3.t.toFixed(3));

const coords = [];
for (let i = 0; i <= 100; i++) coords.push([-99.0 + i * 0.00001, 19.0]);
const simpl = mod.simplificarRuta(coords, 40);
ok('simplificarRuta: reduce puntos', simpl.length < coords.length && simpl.length >= 2, 'n=' + simpl.length);
ok('simplificarRuta: conserva extremos',
    JSON.stringify(simpl[0]) === JSON.stringify(coords[0]) &&
    JSON.stringify(simpl[simpl.length - 1]) === JSON.stringify(coords[coords.length - 1]));

// Douglas-Peucker: en una L cerrada (dos tramos perpendiculares), debe
// conservar el vertice. Antes el simplificador por distancia minima podia
// aplanar la esquina si los puntos consecutivos del vertice estaban cerca.
const L = [
    [-99.0, 19.0], [-99.001, 19.0], [-99.002, 19.0], [-99.003, 19.0],
    [-99.004, 19.0], [-99.005, 19.0], [-99.005, 19.001], [-99.005, 19.002],
    [-99.005, 19.003], [-99.005, 19.004], [-99.005, 19.005]
];
const sL = mod.simplificarRuta(L, 10);
const vertice = L[5]; // el vertice de la L
const conservaVertice = sL.some((p) => Math.abs(p[0] - vertice[0]) < 1e-9 && Math.abs(p[1] - vertice[1]) < 1e-9);
ok('simplificarRuta (DP): conserva el vertice de una L', conservaVertice, 'n=' + sL.length);

// Polilinea colineal muy densa: solo debe quedar primer y ultimo punto.
const colin = [];
for (let i = 0; i <= 200; i++) colin.push([0 + i * 0.0001, 0]);
const sColin = mod.simplificarRuta(colin, 5);
ok('simplificarRuta (DP): colineal densa -> solo extremos',
    sColin.length === 2, 'n=' + sColin.length);

const rutaCoords = [[0, 0], [0.0018, 0]];
const pre = mod.precomputarRuta(rutaCoords);
const ruta = { coords: rutaCoords, acum: pre.acum, total: pre.total };
const s = mod.snapRuta(0.0009, 0.0009, ruta);
ok('snapRuta: distancia ~100 m', casi(s.dist, 100, 4), s.dist.toFixed(2));
ok('snapRuta: progreso ~0.5', casi(s.progreso, 0.5, 0.02), s.progreso.toFixed(3));
ok('snapRuta: rumbo este ~90', casi(s.rumbo, 90, 1), s.rumbo.toFixed(1));

// Snap memoizado: tras el primer snap, debe reusar el segmento idx.
// Construimos una ruta con muchos puntos (todos a lat=0, variando lon) y un
// punto que se mueve a lo largo de la ruta.
const rutaGrande = [];
for (let i = 0; i < 500; i++) rutaGrande.push([0.001 * i, 0]);
const preGrande = mod.precomputarRuta(rutaGrande);
const rutaLarga = { coords: rutaGrande, acum: preGrande.acum, total: preGrande.total };

// Primer snap en la mitad de la ruta (lon=0.25, lat=0 -> segmento ~250).
const memo = { idx: 0 };
const sGrande1 = mod.snapRuta(0, 0.25, rutaLarga, memo);
ok('snapRuta memo: primer snap en mitad -> idx ~250',
    memo.idx >= 245 && memo.idx <= 255, 'idx=' + memo.idx);

// Segundo snap unos metros despues: memo.idx no debe cambiar.
const idxAntes = memo.idx;
const sGrande2 = mod.snapRuta(0, 0.251, rutaLarga, memo);
ok('snapRuta memo: segundo snap cercano mantiene idx',
    Math.abs(memo.idx - idxAntes) <= 2, 'idx ' + idxAntes + ' -> ' + memo.idx);

// Saltamos lejos: memo debe actualizarse al segmento correcto.
const sGrande3 = mod.snapRuta(0, 0.45, rutaLarga, memo);
ok('snapRuta memo: snap lejano actualiza idx ~450',
    memo.idx >= 445 && memo.idx <= 455, 'idx=' + memo.idx);

const heap = new mod.MinHeap();
[5, 1, 3, 2, 4].forEach((f) => heap.push({ id: f, f }));
const salida = [];
while (heap.size()) salida.push(heap.pop().id);
ok('MinHeap: ordena por f', JSON.stringify(salida) === JSON.stringify([1, 2, 3, 4, 5]), salida.join(','));

const nodos = new Map([
    [0, { lat: 0, lon: 0 }], [1, { lat: 0, lon: 0.001 }], [2, { lat: 0, lon: 0.002 }],
    [3, { lat: 0, lon: 0.003 }], [4, { lat: 0, lon: 0.004 }], [9, { lat: 1, lon: 1 }]
]);
const ady = new Map([[0, [1, 4]], [1, [0, 2]], [2, [1, 3]], [3, [2, 4]], [4, [3, 0]]]);
const res = mod.aEstrella(nodos, ady, 0, 4);
ok('A*: encuentra camino', !!res, res ? res.camino.join('>') : 'null');
ok('A*: conserva extremos', !!res && res.camino[0] === 0 && res.camino[res.camino.length - 1] === 4);
ok('A*: sin camino devuelve null', mod.aEstrella(nodos, ady, 0, 9) === null);

// Sentido unico y maxspeed.
ok('sentidoOneWay: sin tag -> bidi', mod.sentidoOneWay({}) === 0);
ok('sentidoOneWay: oneway=yes -> 1', mod.sentidoOneWay({ oneway: 'yes' }) === 1);
ok('sentidoOneWay: oneway=-1 -> -1', mod.sentidoOneWay({ oneway: '-1' }) === -1);
ok('sentidoOneWay: oneway=no -> 0', mod.sentidoOneWay({ oneway: 'no' }) === 0);
ok('parseMaxspeed: 50', mod.parseMaxspeed({ maxspeed: '50' }) === 50);
ok('parseMaxspeed: mph', mod.parseMaxspeed({ maxspeed: '30 mph' }) === 30);
ok('parseMaxspeed: vacio -> null', mod.parseMaxspeed({}) === null);
ok('VEL_POR_TIPO: motorway = 100', mod.VEL_POR_TIPO.motorway === 100);
ok('VEL_POR_TIPO: residential = 30', mod.VEL_POR_TIPO.residential === 30);
const nodosW = new Map([
    [0, { lat: 0, lon: 0 }],
    [1, { lat: 0, lon: 0.01 }], // corto pero lento (50 km/h)
    [2, { lat: 0, lon: 0.005 }, { lat: 0, lon: 0.005 }], // marcador, ignorado
    [3, { lat: 0, lon: 0.02 }],  // largo pero rapido (100 km/h)
    [4, { lat: 0, lon: 0.03 }]
]);
nodosW.set(2, { lat: 0, lon: 0.015 });
const adyW = new Map([
    [0, [{ to: 1, costo: 10 }, { to: 3, costo: 5 }]],
    [1, [{ to: 4, costo: 10 }]],
    [3, [{ to: 4, costo: 5 }]],
    [4, []]
]);
const resW = mod.aEstrella(nodosW, adyW, 0, 4);
ok('A* ponderado: prefiere ruta con menor tiempo total',
    resW && resW.camino.join() === '0,3,4', resW ? resW.camino.join('>') : 'null');

// Grafo con sentido unico: A debe ir A->B->C pero C no puede ir a A.
const nodosO = new Map([
    [10, { lat: 0, lon: 0 }],
    [11, { lat: 0, lon: 0.001 }],
    [12, { lat: 0, lon: 0.002 }]
]);
const adyO = new Map([
    [10, [{ to: 11, costo: 1 }]],
    [11, [{ to: 10, costo: 1 }, { to: 12, costo: 1 }]], // bidireccional
    [12, [{ to: 11, costo: 1 }]] // solo de vuelta
]);
const resO = mod.aEstrella(nodosO, adyO, 10, 12);
ok('A* oneway: encuentra camino respetando sentido',
    resO && resO.camino.join() === '10,11,12', resO ? resO.camino.join('>') : 'null');

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
