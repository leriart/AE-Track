/*
 * next-version.mjs — calcula la siguiente version a partir de los commits
 * convencionales desde el ultimo release (tag vX.Y.Z o commit "chore(release):").
 *
 * Reglas:
 *   BREAKING CHANGE / tipo!  -> major
 *   feat                     -> minor
 *   resto                    -> patch
 *
 * Imprime X.Y.Z (sin salto de linea extra) para que el workflow lo capture.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const git = (cmd) => { try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (_) { return ''; } };

const actual = fs.readFileSync('VERSION', 'utf8').trim();
const [maj, min, pat] = actual.split('.').map((n) => parseInt(n, 10) || 0);

// Punto de referencia: ultimo tag v* o ultimo commit de release.
let base = git('git describe --tags --abbrev=0 --match "v[0-9]*"');
let rango = base ? (base + '..HEAD') : 'HEAD';
if (!base) {
    const rel = git('git log --format=%H%x09%s -n 200');
    const linea = rel.split('\n').find((l) => /^[0-9a-f]+\tchore\(release\):/.test(l));
    if (linea) rango = linea.split('\t')[0] + '..HEAD';
}

const log = git('git log --format=%s%x00%b ' + rango) || '';
let tipo = 'patch';
if (/BREAKING CHANGE/i.test(log) || /^[a-z]+(\([^)]*\))?!:/im.test(log)) tipo = 'major';
else if (/^feat(\([^)]*\))?:/im.test(log)) tipo = 'minor';

let nueva;
if (tipo === 'major') nueva = (maj + 1) + '.0.0';
else if (tipo === 'minor') nueva = maj + '.' + (min + 1) + '.0';
else nueva = maj + '.' + min + '.' + (pat + 1);

process.stdout.write(nueva);
