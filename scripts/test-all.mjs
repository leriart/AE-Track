/*
 * test-all.mjs — ejecuta todas las suites de tests/ y resume el total.
 *
 * Por que existe: el loop que documentabamos (`for … do … done`) es sintaxis
 * bash y no funciona en fish ni en PowerShell. Este runner es Node puro,
 * portable, y produce una cifra unica de suites/checks que la documentacion
 * (via check-docs.mjs) puede verificar en vez de repetir a mano.
 *
 * Uso:
 *   node scripts/test-all.mjs                  resumen legible
 *   node scripts/test-all.mjs --json           JSON a stdout
 *   node scripts/test-all.mjs --json-out RUTA  ademas guarda el JSON en RUTA
 *
 * Sale con codigo != 0 si alguna suite falla o termina con error.
 * Sin dependencias: solo Node.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirTests = path.join(raiz, 'tests');
const argv = process.argv.slice(2);

const val = (nombre) => {
    const i = argv.indexOf(nombre);
    return i >= 0 ? argv[i + 1] : null;
};
const asJson = argv.includes('--json');
const jsonOut = val('--json-out');

const archivos = fs.readdirSync(dirTests)
    .filter((f) => f.endsWith('.test.js'))
    .sort();

if (!archivos.length) {
    console.error('No hay suites en tests/');
    process.exit(1);
}

let suites = 0;
let checks = 0;
let fallos = 0;
let crasheos = 0;
const detalle = [];

for (const f of archivos) {
    const r = spawnSync(process.execPath, [path.join(dirTests, f)], {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024
    });
    const salida = String(r.stdout || '') + String(r.stderr || '');
    const ok = (salida.match(/^ok\s+-\s/gm) || []).length;
    const bad = (salida.match(/^FALLO\s+-\s/gm) || []).length;
    // Una suite que revienta sin imprimir FALLO - (p. ej. un throw de sintaxis)
    // tambien es un fallo: la contamos aparte y sacamos su stderr.
    const crasheo = (r.status !== 0) && bad === 0;

    suites++;
    checks += ok;
    fallos += bad;
    if (crasheo) crasheos++;

    detalle.push({
        archivo: f,
        ok,
        fallos: bad,
        status: r.status == null ? -1 : r.status,
        crasheo
    });

    if (!asJson) {
        const etiqueta = (bad || crasheo) ? 'FALLO' : 'ok   ';
        console.log(etiqueta + ' ' + f.padEnd(34) + ' ' + ok + ' check(s)' +
            (crasheo ? '  [la suite termino con error]' : ''));
        if (bad || crasheo) {
            salida.split('\n')
                .filter((l) => /^FALLO\s+-\s/.test(l))
                .forEach((l) => console.log('        ' + l));
            if (crasheo && r.stderr) {
                String(r.stderr).split('\n').slice(0, 6).forEach((l) => console.log('        > ' + l));
            }
        }
    }
}

const todoVerde = fallos === 0 && crasheos === 0;
const resumen = { suites, checks, fallos, crasheos, ok: todoVerde, detalle };

if (jsonOut) {
    const abs = path.isAbsolute(jsonOut) ? jsonOut : path.join(raiz, jsonOut);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, JSON.stringify(resumen, null, 2));
}

if (asJson) {
    console.log(JSON.stringify(resumen));
} else {
    const extras = [];
    if (fallos) extras.push(fallos + ' FALLO(S)');
    if (crasheos) extras.push(crasheos + ' suite(s) con error');
    console.log('');
    console.log(suites + ' suites, ' + checks + ' checks · ' +
        (extras.length ? extras.join(' · ') : 'todo verde'));
}

process.exit(todoVerde ? 0 : 1);
