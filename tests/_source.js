/*
 * _source.js — cargador comun para las pruebas.
 *
 * Desde 6.0.0 el repositorio guarda el codigo en src/ y el rondo.user.js es
 * el bootstrap hibrido (con @require). Las pruebas necesitan el bundle
 * completo, asi que este helper lo construye (scripts/build.mjs --mode=bundle)
 * solo si esta desactualizado y expone:
 *   - ARCHIVO: ruta del bundle construido
 *   - src:     contenido del bundle
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const build = path.join(raiz, 'build', 'rondo.bundle.js');
const buildScript = path.join(raiz, 'scripts', 'build.mjs');
const srcDir = path.join(raiz, 'src');

function mtime(p) {
    try { return fs.statSync(p).mtimeMs; } catch (_) { return 0; }
}

function masNuevoQue(destinoMs, dir, arr) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (masNuevoQue(destinoMs, p, arr)) return true; }
        else if (mtime(p) > destinoMs) return true;
    }
    return false;
}

function necesitaBuild() {
    const b = mtime(build);
    if (!b) return true;
    if (mtime(path.join(raiz, 'VERSION')) > b) return true;
    if (mtime(path.join(raiz, 'scripts', 'build.mjs')) > b) return true;
    return masNuevoQue(b, srcDir, []);
}

if (necesitaBuild()) {
    execFileSync(process.execPath, [buildScript, '--mode=bundle', '--out', build, '--quiet'], { stdio: 'inherit' });
}

module.exports = {
    ARCHIVO: build,
    src: fs.readFileSync(build, 'utf8'),
    raiz
};
