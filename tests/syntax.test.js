/*
 * Pruebas de sintaxis: asegura que el userscript compila sin errores.
 * Util para detectar regresiones tipo "coma faltante" que rompen
 * toda la app (incluida la sidebar) sin que los tests de logica
 * se enteren, porque esos tests extraen slices del codigo y los
 * ejecutan en aislamiento.
 *
 * Ademas valida la consistencia basica entre @version, VER y la
 * cabecera del archivo.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ARCHIVO = path.join(__dirname, '..', 'rondo.user.js');
const src = fs.readFileSync(ARCHIVO, 'utf8');

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

// 1. node -c (syntax check) -- el modo mas rapido de detectar typos.
try {
    execFileSync(process.execPath, ['-c', ARCHIVO], { stdio: ['ignore', 'pipe', 'pipe'] });
    ok('rondo.user.js compila sin errores de sintaxis', true);
} catch (e) {
    ok('rondo.user.js compila sin errores de sintaxis', false, (e.stderr || e.stdout || e.message || '').toString().split('\n')[0]);
}

// 2. @version y VER deben coincidir.
const mVer = src.match(/@version\s+(\d+\.\d+(?:\.\d+)?)/);
const mConst = src.match(/const VER = ['"](\d+\.\d+(?:\.\d+)?)['"]/);
ok('@version presente en cabecera', !!mVer);
ok('const VER presente', !!mConst);
ok('@version y VER coinciden', !!(mVer && mConst && mVer[1] === mConst[1]),
    mVer && mConst ? ('@version=' + mVer[1] + ' VER=' + mConst[1]) : 'faltan');

// 3. El archivo debe seguir el formato UserScript.
ok('cabecera ==UserScript== presente', src.startsWith('// ==UserScript=='));
ok('cierre ==/UserScript== presente', src.includes('// ==/UserScript=='));

// 4. Debe haber exactamente UN const DEFAULTS y UN const VER.
const defaultsMatches = src.match(/const DEFAULTS = Object\.freeze\(/g) || [];
ok('const DEFAULTS declarado una sola vez', defaultsMatches.length === 1,
    'encontrados: ' + defaultsMatches.length);
const verMatches = src.match(/const VER = ['"]/g) || [];
ok('const VER declarado una sola vez', verMatches.length === 1,
    'encontrados: ' + verMatches.length);

// 5. Estructura basica del IIFE: una sola 'use strict', un solo cierre.
ok('use strict presente', /'use strict';/.test(src));
const iifeOpens = src.match(/^\(function Rondo\(\) \{/gm) || [];
ok('IIFE declarada una sola vez', iifeOpens.length === 1,
    'encontrados: ' + iifeOpens.length);

// 6. DEFAULTS no debe tener comas colgando: cada clave (excepto la ultima
// antes de un cierre }) debe terminar en coma. Si falta una coma en un
// valor intermedio (como paso en 5.14.4), el archivo entero falla al
// parsear como JS y la sidebar desaparece.
const defaultsBlock = src.match(/const DEFAULTS = Object\.freeze\(\{([\s\S]*?)\}\);/);
if (defaultsBlock) {
    const lines = defaultsBlock[1].split('\n');
    let depth = 0;
    let lastNonEmpty = '';
    let pendiente = 0;
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const trimmed = raw.trim();
        if (!trimmed || trimmed.startsWith('//')) continue;
        const opens = (trimmed.match(/[\(\[\{]/g) || []).length;
        const closes = (trimmed.match(/[\)\]\}]/g) || []).length;
        depth += opens - closes;
        const endsWithComma = trimmed.endsWith(',');
        const endsWithCommaOrBrace = endsWithComma || trimmed.endsWith('{') || trimmed.endsWith(',');
        if (depth > 0 && lastNonEmpty && !endsWithCommaOrBrace) {
            // La linea anterior no termino en coma ni en llave abierta.
            // Si la linea anterior es un comentario, no es un error.
            const prevTrim = lastNonEmpty.trim();
            if (!prevTrim.endsWith(',') && !prevTrim.endsWith('{') && !prevTrim.endsWith('(') &&
                !prevTrim.startsWith('//') && !prevTrim.startsWith('/*') && !prevTrim.startsWith('*')) {
                // Solo marcamos como sospechoso si parece una linea de
                // valor (termina en numero, string, false, true, null).
                if (/[,a-zA-Z0-9'"`)\]]$/.test(prevTrim)) {
                    pendiente++;
                    if (pendiente > 5) break;
                    // Reportamos: linea i-1 sin coma antes de linea i.
                    ok('DEFAULTS linea ' + (i) + ' sospechosa (anterior sin coma): ' + prevTrim.substring(0, 40), false);
                }
            }
        }
        lastNonEmpty = trimmed;
    }
    if (pendiente === 0) ok('DEFAULTS: no se detectaron comas faltantes', true);
}

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);