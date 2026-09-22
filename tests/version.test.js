/*
 * Pruebas de las utilidades de version y actualizacion de Rondo.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'rondo.user.js');
const src = fs.readFileSync(ARCHIVO, 'utf8');

const ini = src.indexOf('function parseVersionHeader');
const fin = src.indexOf('/* ============================ LOCALSTORAGE', ini);
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de version en ' + ARCHIVO);
    process.exit(1);
}
const code = src.slice(ini, fin) +
    '\nreturn {parseVersionHeader, cmpVersion};';
const mod = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

ok('parseVersionHeader: extrae la version',
    mod.parseVersionHeader('// ==UserScript==\n// @version 4.5.0\n// ==/UserScript==') === '4.5.0');
ok('parseVersionHeader: null si no hay',
    mod.parseVersionHeader('// sin header') === null);
ok('parseVersionHeader: tolera espacios',
    mod.parseVersionHeader('// @version    1.2.3   ') === '1.2.3');

ok('cmpVersion: 4.5.0 > 4.4.0', mod.cmpVersion('4.5.0', '4.4.0') > 0);
ok('cmpVersion: 4.4.0 < 4.5.0', mod.cmpVersion('4.4.0', '4.5.0') < 0);
ok('cmpVersion: 4.4.0 == 4.4.0', mod.cmpVersion('4.4.0', '4.4.0') === 0);
ok('cmpVersion: 4.10.0 > 4.9.0', mod.cmpVersion('4.10.0', '4.9.0') > 0);
ok('cmpVersion: 4.10.0 > 4.2.0', mod.cmpVersion('4.10.0', '4.2.0') > 0);
ok('cmpVersion: longitudes distintas', mod.cmpVersion('4.4', '4.4.1') < 0);
ok('cmpVersion: mas segmentos', mod.cmpVersion('4.4.0.1', '4.4.0') > 0);
ok('cmpVersion: null vs valor', mod.cmpVersion(null, '4.4.0') === 0);

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
