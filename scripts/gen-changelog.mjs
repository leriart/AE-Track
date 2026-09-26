/*
 * gen-changelog.mjs <version> — genera changelogs/<version>.md a partir de los
 * commits convencionales desde el ultimo release. Si el archivo ya existe, no
 * lo toca (permite changelogs escritos a mano).
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const version = String(process.argv[2] || '').trim();
if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)) {
    console.error('Uso: node scripts/gen-changelog.mjs X.Y.Z');
    process.exit(1);
}
const ruta = 'changelogs/' + version + '.md';
if (fs.existsSync(ruta)) { console.log('changelog existente, no se toca: ' + ruta); process.exit(0); }

const git = (cmd) => { try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (_) { return ''; } };

let base = git('git describe --tags --abbrev=0 --match "v[0-9]*"');
let rango = base ? (base + '..HEAD') : 'HEAD';
if (!base) {
    const rel = git('git log --format=%H%x09%s -n 200');
    const linea = rel.split('\n').find((l) => /^[0-9a-f]+\tchore\(release\):/.test(l));
    if (linea) rango = linea.split('\t')[0] + '..HEAD';
}

const lineas = (git('git log --format=%s ' + rango) || '').split('\n').map((s) => s.trim()).filter(Boolean)
    .filter((s) => !/^chore\(release\):/.test(s) && !/\[skip ci\]/.test(s));

const grupos = { feat: [], fix: [], perf: [], refactor: [], docs: [], chore: [], otro: [] };
for (const s of lineas) {
    const m = s.match(/^([a-z]+)(\([^)]*\))?!?:\s*(.+)$/i);
    if (!m) { grupos.otro.push(s); continue; }
    const tipo = m[1].toLowerCase();
    (grupos[tipo] || grupos.otro).push(m[3]);
}
const titulos = { feat: 'Novedades', fix: 'Correcciones', perf: 'Rendimiento', refactor: 'Refactor', docs: 'Documentacion', chore: 'Mantenimiento', otro: 'Otros' };
let md = '# ' + version + '\n\nGenerado automaticamente a partir de los cambios.\n';
if (!lineas.length) md += '\n- Mantenimiento interno y regeneracion de artefactos.\n';
for (const k of Object.keys(grupos)) {
    if (!grupos[k].length) continue;
    md += '\n## ' + titulos[k] + '\n';
    for (const it of grupos[k]) md += '- ' + it + '\n';
}
fs.mkdirSync('changelogs', { recursive: true });
fs.writeFileSync(ruta, md);
console.log('changelog generado: ' + ruta + ' (' + lineas.length + ' cambios)');
