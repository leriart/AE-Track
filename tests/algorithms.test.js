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
    '\nreturn {haversine,bearing,difAngulo,distPuntoSegmento,simplificarRuta,precomputarRuta,snapRuta,MinHeap,aEstrella};';
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

const coords = [];
for (let i = 0; i <= 100; i++) coords.push([-99.0 + i * 0.00001, 19.0]);
const simpl = mod.simplificarRuta(coords, 40);
ok('simplificarRuta: reduce puntos', simpl.length < coords.length && simpl.length >= 2, 'n=' + simpl.length);
ok('simplificarRuta: conserva extremos',
    JSON.stringify(simpl[0]) === JSON.stringify(coords[0]) &&
    JSON.stringify(simpl[simpl.length - 1]) === JSON.stringify(coords[coords.length - 1]));

const rutaCoords = [[0, 0], [0.0018, 0]];
const pre = mod.precomputarRuta(rutaCoords);
const ruta = { coords: rutaCoords, acum: pre.acum, total: pre.total };
const s = mod.snapRuta(0.0009, 0.0009, ruta);
ok('snapRuta: distancia ~100 m', casi(s.dist, 100, 4), s.dist.toFixed(2));
ok('snapRuta: progreso ~0.5', casi(s.progreso, 0.5, 0.02), s.progreso.toFixed(3));
ok('snapRuta: rumbo este ~90', casi(s.rumbo, 90, 1), s.rumbo.toFixed(1));

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

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
