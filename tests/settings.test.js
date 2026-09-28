/*
 * Pruebas de la referencia de ajustes autogenerada.
 *
 * docs/AJUSTES.md se produce desde DEFAULTS con scripts/gen-settings.mjs.
 * Aqui comprobamos que no falte ninguna clave: si añades una opcion y no
 * regeneras, esta suite falla (y check-docs.mjs --fix la reescribe).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { src, raiz } = require('./_source.js');

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

const bloque = src.match(/const DEFAULTS = Object\.freeze\(\{([\s\S]*?)\}\);/);

// Claves de primer nivel: se ignora lo que va dentro de un objeto anidado
// (p. ej. `reglas.*`), que no son opciones directas de APP.config.
function clavesTopNivel(texto) {
    const out = [];
    let depth = 0;
    for (const linea of texto.split('\n')) {
        const t = linea.trim();
        if (t && !t.startsWith('//') && !t.startsWith('/*') && !t.startsWith('*') && depth === 0) {
            const m = t.match(/^([A-Za-z_$][\w$]*)\s*:/);
            if (m) out.push(m[1]);
        }
        depth += (linea.match(/[{[]/g) || []).length - (linea.match(/[}\]]/g) || []).length;
    }
    return out;
}

const claves = bloque ? clavesTopNivel(bloque[1]) : [];

const rutaDoc = path.join(raiz, 'docs', 'AJUSTES.md');
const doc = fs.existsSync(rutaDoc) ? fs.readFileSync(rutaDoc, 'utf8') : '';

ok('DEFAULTS tiene claves parseables', claves.length > 0, 'n=' + claves.length);
ok('docs/AJUSTES.md existe', doc.length > 0);

const faltan = claves.filter((k) => !doc.includes('`' + k + '`'));
ok('docs/AJUSTES.md lista todas las claves de DEFAULTS', faltan.length === 0,
    faltan.length ? ('faltan ' + faltan.length + ': ' + faltan.slice(0, 8).join(', ')) : 'ok');

ok('docs/AJUSTES.md declara el total de claves',
    doc.includes('Total: **' + claves.length + ' claves**'), 'total=' + claves.length);

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
