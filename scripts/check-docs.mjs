/*
 * check-docs.mjs — mantiene sincronizadas las cifras, badges y enlaces de la
 * documentacion con el codigo real (fuente unica de verdad).
 *
 * Calcula los hechos autoritativos (version, suites/checks, numero de
 * pestañas, rangos de chunks) y verifica o reescribe los "tokens" que
 * aparecen en los documentos. Asi la doc no se desfasa sola.
 *
 * Uso:
 *   node scripts/check-docs.mjs                 verifica; sale != 0 si hay drift
 *   node scripts/check-docs.mjs --fix           reescribe los tokens desfasados
 *   node scripts/check-docs.mjs --json          salida JSON
 *   node scripts/check-docs.mjs --tests RUTA    reutiliza el JSON de test-all.mjs
 *
 * Sin dependencias: solo Node.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);

const fix = argv.includes('--fix');
const asJson = argv.includes('--json');
const val = (nombre) => {
    const i = argv.indexOf(nombre);
    return i >= 0 ? argv[i + 1] : null;
};

const abs = (p) => (path.isAbsolute(p) ? p : path.join(raiz, p));
const existe = (p) => fs.existsSync(abs(p));
const leer = (p) => fs.readFileSync(abs(p), 'utf8');

// ── Hechos autoritativos ────────────────────────────────────────────────

const version = leer('VERSION').trim();

// suites/checks: del JSON de test-all (se reutiliza si nos lo pasan para no
// volver a ejecutar las suites en CI).
let tests = null;
const testsPath = val('--tests');
if (testsPath && existe(testsPath)) {
    try { tests = JSON.parse(leer(testsPath)); } catch (_) { tests = null; }
}
if (!tests) {
    const tmp = 'build/tests.json';
    execFileSync(process.execPath, [abs('scripts/test-all.mjs'), '--json-out', tmp], {
        stdio: ['ignore', 'ignore', 'inherit']
    });
    tests = JSON.parse(leer(tmp));
}
const suites = tests.suites;
const checks = tests.checks;

// pestañas: la lista de atajos (43-teclas.js) es la fuente de verdad; se
// contrasta con las pestañas construidas (34-ui-build.js).
const teclas = leer('src/parts/43-teclas.js');
const mTabs = teclas.match(/const tabs = \{([^}]*)\}/);
const tabsTeclas = mTabs ? (mTabs[1].match(/'[^']*'\s*:/g) || []).length : 0;
const uiBuild = leer('src/parts/34-ui-build.js');
const tabsUI = (uiBuild.match(/data-tab="/g) || []).length;
const tabs = tabsTeclas || tabsUI;

// rangos de chunk: del manifest (orden real de concatenacion).
const manifest = JSON.parse(leer('src/manifest.json'));
const porChunk = {};
for (const p of manifest.parts) {
    const m = String(p.file).match(/^(\d+)-/);
    if (!m) continue;
    const n = m[1];
    if (!porChunk[p.chunk]) porChunk[p.chunk] = { min: n, max: n };
    else {
        if (n < porChunk[p.chunk].min) porChunk[p.chunk].min = n;
        if (n > porChunk[p.chunk].max) porChunk[p.chunk].max = n;
    }
}

const PALABRA = { 1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez' };
const palabraTabs = PALABRA[tabs] || String(tabs);

// ── Reglas (tokens) ─────────────────────────────────────────────────────
// Cada regla: archivo, regex global, como reemplazar y etiqueta legible.
const reglas = [];
const add = (archivo, re, make, etiqueta) => reglas.push({ archivo, re, make, etiqueta });

const DOCS = ['README.md', 'MANUAL.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md', 'AGENTS.md'];
for (const f of DOCS) {
    add(f, /version-[0-9][0-9A-Za-z.-]*-850D22/g,
        () => 'version-' + version + '-850D22', 'badge de version');
    add(f, /\(\.\/changelogs\/[0-9][^)]*\.md\)/g,
        () => '(./changelogs/' + version + '.md)', 'enlace al changelog');
    add(f, /tests-\d+%20checks%20OK/g,
        () => 'tests-' + checks + '%20checks%20OK', 'badge de tests');
    add(f, /\b(\d+)\s+suites\b/g,
        () => suites + ' suites', 'numero de suites');
    add(f, /(~)?(\d+)\s+checks\b/g,
        (a) => (a[1] ? '~' : '') + checks + ' checks', 'numero de checks');
    // Se conserva el acento (o su ausencia) del original: el ancla de GitHub
    // depende de que titulo y enlace usen la misma grafia.
    add(f, /Las\s+(?:seis|ocho|siete|nueve|diez|\d+)\s+pesta(ñ|n)as/gi,
        (a) => 'Las ' + palabraTabs + ' pesta' + a[1] + 'as', 'pestañas (palabra)');
    add(f, /(\d+)\s+pesta(ñ|n)as/gi,
        (a) => tabs + ' pesta' + a[2] + 'as', 'numero de pestañas');
    add(f, /\(#las-(?:seis|ocho|siete|nueve|diez|\d+)-pestanas\)/gi,
        () => '(#las-' + palabraTabs + '-pestanas)', 'ancla de pestañas');
    add(f, /Alt\+1\.\.(\d+)/g,
        () => 'Alt+1..' + tabs, 'rango de atajos de pestañas');
}
// El job de CI tambien repite el numero de suites en su etiqueta.
add('.github/workflows/ci.yml', /(\d+)\s+suites/g,
    () => suites + ' suites', 'numero de suites (CI)');
// Los cortes de chunk del mapa de arquitectura salen del manifest.
add('ARCHITECTURE.md', /(\d+)-?…\s*(\d+)-?…(\s+chunk\s+)(core|engine|ui)/g,
    (a) => {
        const c = porChunk[a[4]];
        return (c ? c.min : a[1]) + '-… ' + (c ? c.max : a[2]) + '-…' + a[3] + a[4];
    }, 'rango de chunks');

// ── Aplicar o verificar ─────────────────────────────────────────────────

const drift = [];
const arreglados = [];

for (const r of reglas) {
    if (!existe(r.archivo)) continue;
    const antes = leer(r.archivo);
    const despues = antes.replace(r.re, (...a) => r.make(a));
    if (despues === antes) continue;
    if (fix) {
        fs.writeFileSync(abs(r.archivo), despues);
        arreglados.push({ archivo: r.archivo, etiqueta: r.etiqueta });
    } else {
        drift.push({ archivo: r.archivo, etiqueta: r.etiqueta });
    }
}

// docs/AJUSTES.md se genera desde DEFAULTS: si no cuadra, es drift.
let ajustesDesfasados = false;
try {
    execFileSync(process.execPath, [abs('scripts/gen-settings.mjs'), '--check'], {
        stdio: ['ignore', 'ignore', 'pipe']
    });
} catch (_) {
    if (fix) {
        try {
            execFileSync(process.execPath, [abs('scripts/gen-settings.mjs')], {
                stdio: ['ignore', 'ignore', 'inherit']
            });
            arreglados.push({ archivo: 'docs/AJUSTES.md', etiqueta: 'referencia de ajustes' });
        } catch (_) { /* noop */ }
    } else {
        ajustesDesfasados = true;
    }
}

// Contrasta las dos fuentes del numero de pestañas (atajos vs UI).
let inconsistenciaTabs = null;
if (tabsTeclas && tabsUI && tabsTeclas !== tabsUI) {
    inconsistenciaTabs = '43-teclas.js tiene ' + tabsTeclas + ' pestañas y 34-ui-build.js ' + tabsUI;
}

const resumen = {
    version,
    suites,
    checks,
    tabs,
    tabsTeclas,
    tabsUI,
    chunks: porChunk,
    modo: fix ? 'fix' : 'verify',
    drift: drift.length,
    arreglados: arreglados.length,
    ajustesDesfasados,
    inconsistenciaTabs
};

if (asJson) {
    console.log(JSON.stringify(resumen));
} else {
    if (inconsistenciaTabs) console.log('FALLO (fuentes) ' + inconsistenciaTabs);
    if (ajustesDesfasados && !fix) console.log('FALLO docs/AJUSTES.md · referencia de ajustes desfasada');
    if (fix) {
        arreglados.forEach((a) => console.log('fix   ' + a.archivo + ' · ' + a.etiqueta));
        console.log(arreglados.length
            ? '\n' + arreglados.length + ' token(s) sincronizado(s) · ' + suites + ' suites, ' + checks + ' checks, ' + tabs + ' pestañas'
            : 'Documentacion ya sincronizada · ' + suites + ' suites, ' + checks + ' checks, ' + tabs + ' pestañas');
    } else {
        drift.forEach((d) => console.log('FALLO ' + d.archivo + ' · ' + d.etiqueta + ' desfasado'));
        console.log(drift.length
            ? '\n' + drift.length + ' desfase(s). Ejecuta: node scripts/check-docs.mjs --fix'
            : 'Documentacion sincronizada · ' + suites + ' suites, ' + checks + ' checks, ' + tabs + ' pestañas');
    }
}

process.exit((drift.length || inconsistenciaTabs || ajustesDesfasados) ? 1 : 0);
