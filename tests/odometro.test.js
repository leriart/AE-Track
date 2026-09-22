/*
 * Pruebas del odometro por unidad.
 * Uso:  node tests/odometro.test.js
 *
 * Extrae las funciones actualizarOdometro/odometroDe y las ejecuta con stubs
 * de APP/LS/writeJSON/haversine.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'HJP-Wialon.user.js');
const src = fs.readFileSync(ARCHIVO, 'utf8');

const ini = src.indexOf('const ODOMETRO_MAX_SALTO_M');
const fin = src.indexOf('function isBase(', ini);
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque del odometro en ' + ARCHIVO);
    process.exit(1);
}
const code =
    'const APP = { odometro: {} };\n' +
    'const LS = { odometro: "odometro.test" };\n' +
    'const writeJSON = (k, v) => { APP._lastWrite = [k, v]; };\n' +
    'const RADIO_TIERRA = 6371008.8;\n' +
    'function rad(d){return d*Math.PI/180;}\n' +
    'function haversine(a,b,c,d){const x=rad(c-a),y=rad(d-b);const s=Math.sin(x/2)*Math.sin(x/2)+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)*Math.sin(y/2);return 2*RADIO_TIERRA*Math.asin(Math.min(1,Math.sqrt(s)));}\n' +
    src.slice(ini, fin) +
    '\nreturn {actualizarOdometro, odometroDe, ODOMETRO_MAX_SALTO_M};';
const mod = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}
function casi(a, b, tol) { return Math.abs(a - b) <= (tol == null ? 1 : tol); }

const info = { clave: 'eco1', eco: 'eco1' };

// Primer punto: no acumula (no hay previo).
mod.actualizarOdometro(info, { online: true, lat: 19.0, lon: -99.0, t: 1000, vel: 40 }, null);
ok('odometro: primer punto no acumula', mod.odometroDe(info).m === 0,
    'm=' + mod.odometroDe(info).m);
ok('odometro: guarda ultimoLat/Lon/T',
    mod.odometroDe(info).ultimoLat === 19.0 &&
    mod.odometroDe(info).ultimoLon === -99.0 &&
    mod.odometroDe(info).ultimoT === 1000);

// Segundo punto a 1 km al norte (~0.009 grados lat ~ 1000 m).
mod.actualizarOdometro(info, { online: true, lat: 19.009, lon: -99.0, t: 1100, vel: 40 }, null);
const odo1 = mod.odometroDe(info);
ok('odometro: segundo punto ~1 km',
    casi(odo1.m, 1000, 20), 'm=' + odo1.m.toFixed(1));

// Punto con velocidad <= 1 no debe acumular distancia aunque se mueva.
mod.actualizarOdometro(info, { online: true, lat: 19.018, lon: -99.0, t: 1200, vel: 0 }, null);
ok('odometro: vel=0 no acumula',
    casi(mod.odometroDe(info).m, odo1.m, 1),
    'm=' + mod.odometroDe(info).m.toFixed(1));

// Salto GPS anomalo (>5 km en 1 min) se descarta.
const antes = mod.odometroDe(info).m;
mod.actualizarOdometro(info, { online: true, lat: 19.5, lon: -99.0, t: 1300, vel: 80 }, null);
ok('odometro: salto GPS >5 km descartado',
    mod.odometroDe(info).m === antes,
    'antes=' + antes + ' despues=' + mod.odometroDe(info).m);

// Unidad offline no acumula.
const antes2 = mod.odometroDe(info).m;
mod.actualizarOdometro(info, { online: false, lat: 19.009, lon: -99.0, t: 1400, vel: 40 }, null);
ok('odometro: unidad offline no acumula',
    mod.odometroDe(info).m === antes2);

// Suma acumulada sobre multiples puntos validos (55 m cada uno).
// Antes de este bucle el odometro ya tenia ~1000 m; tras 20 saltos de 55 m
// (~1100 m adicionales) el total debe estar cerca de 2100 m.
const antesLoop = mod.odometroDe(info).m;
for (let i = 0; i < 20; i++) {
    mod.actualizarOdometro(info, { online: true, lat: 19.0 + i * 0.0005, lon: -99.0, t: 1500 + i * 10, vel: 30 }, null);
}
ok('odometro: suma multiples puntos (~1100 m adicionales)',
    casi(mod.odometroDe(info).m - antesLoop, 1100, 60),
    'delta=' + (mod.odometroDe(info).m - antesLoop).toFixed(1));

// Clave distinta: contador independiente.
const info2 = { clave: 'eco2', eco: 'eco2' };
mod.actualizarOdometro(info2, { online: true, lat: 20.0, lon: -100.0, t: 2000, vel: 40 }, null);
mod.actualizarOdometro(info2, { online: true, lat: 20.009, lon: -100.0, t: 2100, vel: 40 }, null);
ok('odometro: claves independientes',
    mod.odometroDe(info2).m > 900 && mod.odometroDe(info).m > mod.odometroDe(info2).m,
    'eco1=' + mod.odometroDe(info).m.toFixed(0) + ' eco2=' + mod.odometroDe(info2).m.toFixed(0));

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
