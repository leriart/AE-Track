/*
 * Pruebas de la deteccion de punto de partida y paradas del analisis de viaje.
 * Extrae las funciones del userscript y las ejecuta con stubs de APP.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'rondo.user.js');
const src = fs.readFileSync(ARCHIVO, 'utf8');

const ini = src.indexOf('function detectarPuntoPartida');
const fin = src.indexOf('async function analizarViaje', ini);
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de analisis de viaje en ' + ARCHIVO);
    process.exit(1);
}
const code = 'const clamp=(v,lo,hi)=>Math.min(Math.max(v,lo),hi);\n' +
    'const RADIO_TIERRA=6371008.8;\n' +
    'function rad(d){return d*Math.PI/180;}\n' +
    'function haversine(a,b,c,d){const x=rad(c-a),y=rad(d-b);const s=Math.sin(x/2)*Math.sin(x/2)+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)*Math.sin(y/2);return 2*RADIO_TIERRA*Math.asin(Math.min(1,Math.sqrt(s)));}\n' +
    src.slice(ini, fin) +
    '\nreturn {detectarPuntoPartida, analizarParadas};';
const mod = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

function P(t, s, lat, lon) { return { t: t, s: s || 0, lat: lat == null ? 20 : lat, lon: lon == null ? -100 : lon }; }

// 7h parado y luego 1h moviendo.
const base = 1_600_000_000;
const puntos = [];
for (let i = 0; i < 7; i++) puntos.push(P(base + i * 3600, 0, 20.0, -100.0));
for (let i = 1; i <= 6; i++) puntos.push(P(base + 7 * 3600 + i * 600, 40, 20.0 + i * 0.01, -100.0));

const partida = mod.detectarPuntoPartida(puntos, 6);
ok('detectarPuntoPartida: encuentra la parada de +6h', !!partida);
ok('detectarPuntoPartida: ubicacion correcta', partida && partida.lat === 20 && partida.lon === -100);
ok('detectarPuntoPartida: finIdx al final de la parada', partida && partida.finIdx === 6, partida && partida.finIdx);
ok('detectarPuntoPartida: duracion >= 6 h', partida && partida.durHoras >= 6, partida && partida.durHoras);

const corta = [];
for (let i = 0; i < 3; i++) corta.push(P(base + i * 3600, 0));
for (let i = 1; i <= 6; i++) corta.push(P(base + 3 * 3600 + i * 600, 40));
ok('detectarPuntoPartida: ignora paradas menores al umbral', mod.detectarPuntoPartida(corta, 6) === null);

const abierto = [P(base, 40), P(base + 600, 40)];
for (let i = 0; i < 8; i++) abierto.push(P(base + 1200 + i * 3600, 0));
ok('detectarPuntoPartida: ignora la parada en curso', mod.detectarPuntoPartida(abierto, 6) === null);

// Una sola parada de 20 min dentro del trayecto.
const t0 = base + 7 * 3600;
const trayecto = [];
for (let i = 0; i < 10; i++) trayecto.push(P(t0 + i * 60, 40));
for (let i = 0; i < 20; i++) trayecto.push(P(t0 + 600 + i * 60, 0));
for (let i = 0; i < 10; i++) trayecto.push(P(t0 + 1800 + i * 60, 40));
const paradas = mod.analizarParadas(trayecto, 0, 15, 6 * 3600);
ok('analizarParadas: detecta 1 parada de 20 min', paradas.length === 1, 'n=' + paradas.length);
ok('analizarParadas: duracion ~20 min', paradas.length === 1 && Math.abs(paradas[0].durMin - 20) <= 1, paradas[0] && paradas[0].durMin);
ok('analizarParadas: ignora paradas cortas', mod.analizarParadas(trayecto, 0, 30, 6 * 3600).length === 0);

// DBSCAN: paradas con jitter se fusionan en una.
const jitter = [];
for (let i = 0; i < 6; i++) jitter.push(P(t0 + i * 60, 40));
for (let i = 0; i < 20; i++) jitter.push(P(t0 + 360 + i * 60, [0, 2, 1, 3, 0, 4, 0, 2][i % 8]));
for (let i = 0; i < 6; i++) jitter.push(P(t0 + 1680 + i * 60, 40));
const pJit = mod.analizarParadas(jitter, 0, 15, 6 * 3600);
ok('analizarParadas (DBSCAN): fusiona parada con jitter en una sola', pJit.length === 1, 'n=' + pJit.length);
ok('analizarParadas (DBSCAN): duracion ~20 min',
    pJit.length === 1 && Math.abs(pJit[0].durMin - 20) <= 2, pJit[0] && pJit[0].durMin);

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
