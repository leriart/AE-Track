/*
 * bump-readme.mjs <version>
 * Actualiza el badge de version y el enlace al changelog en README.md.
 * Sin dependencias.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!/^[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.]+)?$/.test(String(version || ''))) {
    console.error('Uso: node scripts/bump-readme.mjs X.Y.Z');
    process.exit(1);
}
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = path.join(raiz, 'README.md');
let s = fs.readFileSync(p, 'utf8');
const antes = s;
s = s.replace(/version-[0-9][0-9A-Za-z.-]*-850D22/g, 'version-' + version + '-850D22');
s = s.replace(/\(\.\/changelogs\/[0-9][^)]*\.md\)/g, '(./changelogs/' + version + '.md)');
fs.writeFileSync(p, s);
console.log(antes === s ? 'README sin cambios' : 'README actualizado a ' + version);
