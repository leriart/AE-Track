/*
 * build.mjs — genera el artefacto de Rondo a partir de src/.
 *
 * Modos:
 *   --mode=bundle   un solo archivo (para tests y para auditar)
 *   --mode=require  bootstrap + dist/rondo-{core,engine,ui}.js  (hibrido)
 *
 * Opciones:
 *   --version=X.Y.Z     (por defecto, lee el archivo VERSION)
 *   --channel=release|dev  (para las URLs de @require)
 *   --out=RUTA          archivo de salida
 *   --quiet
 *
 * Sin dependencias: solo Node.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) { args[m[1]] = m[2]; continue; }
    const m2 = a.match(/^--([^=]+)$/);
    if (m2) {
        const sig = argv[i + 1];
        if (sig !== undefined && !/^--/.test(sig)) { args[m2[1]] = sig; i++; }
        else args[m2[1]] = true;
        continue;
    }
    args[a] = true;
}
const modo = args.mode === 'require' ? 'require' : 'bundle';
const quiet = !!args.quiet;
const distDir = typeof args.dist === 'string' ? args.dist : 'dist';

const version = String(args.version || (fs.existsSync(path.join(raiz, 'VERSION'))
    ? fs.readFileSync(path.join(raiz, 'VERSION'), 'utf8').trim()
    : '0.0.0'));
if (!/^[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.]+)?$/.test(version)) {
    console.error('Version invalida: ' + version);
    process.exit(1);
}

const leer = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');
const header = leer('src/header.js');
const prelude = leer('src/prelude.js');
const manifest = JSON.parse(leer('src/manifest.json'));
const partes = manifest.parts.map((p) => ({ chunk: p.chunk, file: p.file, texto: leer('src/parts/' + p.file) }));

const conVersion = (txt) => txt
    .replace(/^\/\/ @version\s+.*$/m, '// @version      ' + version)
    .replace(/const VER = '[^']*';/, "const VER = '" + version + "';");

const cuerpo = partes.map((p) => p.texto).join('');

const porChunk = { core: [], engine: [], ui: [] };
partes.forEach((p) => porChunk[p.chunk].push(p.texto));

const REPO = 'leriart/AE-Track';
// Canales:
//   release -> assets inmutables del release (main). URL unica por version:
//              https://github.com/REPO/releases/download/vX.Y.Z/rondo-*.js
//   main    -> raw main/dist/vX.Y.Z/rondo-*.js  (ruta versionada: unica)
//   dev     -> raw dev/dist/vX.Y.Z/rondo-*.js
// La ruta versionada (en vez de ?v=) evita que un gestor reutilice un chunk
// cacheado aunque ignore el query string.
const urlChunk = (chunk) => {
    if (args.channel === 'release') {
        return 'https://github.com/' + REPO + '/releases/download/v' + version + '/rondo-' + chunk + '.js';
    }
    const branch = (args.channel === 'dev') ? 'dev' : 'main';
    return 'https://raw.githubusercontent.com/' + REPO + '/' + branch + '/dist/v' + version + '/rondo-' + chunk + '.js';
};

function escribir(destino, contenido) {
    const abs = path.isAbsolute(destino) ? destino : path.join(raiz, destino);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contenido);
    if (!quiet) console.log('escrito ' + path.relative(raiz, abs) + ' (' + contenido.length + ' bytes)');
}

if (modo === 'bundle') {
    const out = conVersion(header) + prelude + "(function Rondo() {\n    'use strict';\n" + conVersion(cuerpo) + '})();\n';
    escribir(args.out || 'build/rondo.bundle.js', out);
} else {
    // Chunks: scope compartido (el gestor concatena los @require con el script).
    const core = conVersion(prelude + "'use strict';\n" + porChunk.core.join(''));
    // El chunk ui NO llama a init(): lo llama el bootstrap una sola vez.
    const uiBody = porChunk.ui.join('').replace(/\n[ \t]*init\(\);[ \t]*\n*$/, '\n');
    const engineBody = conVersion("'use strict';\n" + porChunk.engine.join(''));
    const escribirChunks = (baseDir) => {
        escribir(baseDir + '/rondo-core.js', core);
        escribir(baseDir + '/rondo-engine.js', engineBody);
        escribir(baseDir + '/rondo-ui.js', conVersion("'use strict';\n" + uiBody));
    };
    // Flat (para los assets del release y comparacion de CI).
    escribirChunks(distDir);
    // Ruta versionada para los canales raw (main/dev): URL unica por version.
    if (args.channel !== 'release') escribirChunks(distDir + '/v' + version);

    const requires = ['core', 'engine', 'ui']
        .map((c) => '// @require      ' + urlChunk(c)).join('\n');
    const headerReq = conVersion(header).replace(
        /^(\/\/ @downloadURL\s+.*)$/m,
        '$1\n' + requires
    );
    const bootstrap =
        headerReq +
        '\n(function () {\n    \'use strict\';\n' +
        '    if (typeof init === \'function\') { init(); return; }\n' +
        '    // Falta un modulo (@require) o el gestor no comparte el ambito.\n' +
        '    try {\n' +
        '        if (document.getElementById(\'rondo-aviso\')) return;\n' +
        '        var a = document.createElement(\'div\');\n' +
        '        a.id = \'rondo-aviso\';\n' +
        '        a.style.cssText = \'position:fixed;z-index:2147483647;left:16px;bottom:16px;right:16px;max-width:560px;background:#8b1a1a;color:#fff;font:13px/1.45 system-ui,sans-serif;padding:12px 14px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.45)\';\n' +
        '        a.textContent = \'Rondo no pudo cargar sus modulos (@require). Reinstala o actualiza el script desde GitHub.\';\n' +
        '        (document.body || document.documentElement).appendChild(a);\n' +
        '    } catch (_) { /* noop */ }\n' +
        '})();\n';
    escribir(args.out || 'rondo.user.js', bootstrap);
}
