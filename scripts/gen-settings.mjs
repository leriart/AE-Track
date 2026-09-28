/*
 * gen-settings.mjs — genera docs/AJUSTES.md desde DEFAULTS.
 *
 * DEFAULTS (src/parts/07-valores-por-defecto.js) es la fuente de verdad de las
 * opciones configurables. Este script lo parsea (es plano: string/number/
 * boolean) y produce una tabla con clave, tipo, valor por defecto y
 * descripcion (comentario inline o el bloque de comentarios inmediatamente
 * anterior). Asi el MANUAL no se desfasa de la configuracion real.
 *
 * Uso:
 *   node scripts/gen-settings.mjs           escribe docs/AJUSTES.md
 *   node scripts/gen-settings.mjs --check    sale != 0 si esta desactualizado
 *
 * Sin dependencias: solo Node.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const origen = 'src/parts/07-valores-por-defecto.js';
const destino = 'docs/AJUSTES.md';

const leer = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');

const bloque = leer(origen).match(/const DEFAULTS = Object\.freeze\(\{([\s\S]*?)\}\);/);
if (!bloque) {
    console.error('No se encontro el bloque DEFAULTS en ' + origen);
    process.exit(1);
}

// Valor: string con comillas (simples o dobles, con escapes), numero,
// booleano o null. El resto de la linea puede ser una coma y un comentario.
const RE_CLAVE = /^([A-Za-z_$][\w$]*)\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|true|false|null|-?\d+(?:\.\d+)?)\s*,?\s*(?:\/\/\s*(.*))?$/;

const items = [];
let pendiente = [];
const lineas = bloque[1].split('\n');

for (let i = 0; i < lineas.length; i++) {
    const t = lineas[i].trim();
    if (!t) { pendiente = []; continue; }
    if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) {
        pendiente.push(t.replace(/^\/\/\s?/, '').replace(/^\/?\*+\s?/, '').replace(/\*\/$/, '').trim());
        if (pendiente.length > 3) pendiente.shift();
        continue;
    }

    // Valor objeto: Object.freeze({ ... }), en una o varias lineas. Se
    // registra como UNA clave y se saltan sus claves internas: no son
    // opciones de primer nivel de APP.config (van bajo `reglas.*`).
    const objM = t.match(/^([A-Za-z_$][\w$]*)\s*:\s*Object\.freeze\(\{\s*(.*)$/);
    if (objM) {
        const partes = [objM[2]];
        let depth = 1 + (objM[2].match(/\{/g) || []).length - (objM[2].match(/\}/g) || []).length;
        let j = i;
        while (depth > 0 && j + 1 < lineas.length) {
            j++;
            partes.push(lineas[j].trim());
            depth += (lineas[j].match(/\{/g) || []).length - (lineas[j].match(/\}/g) || []).length;
        }
        i = j;
        let compacto = partes
            .filter((p) => p && !p.startsWith('//'))
            .join(' ')
            .replace(/\}\)\s*,?\s*$/, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (compacto.length > 110) compacto = compacto.slice(0, 109).trimEnd() + '…';
        items.push({
            clave: objM[1],
            tipo: 'object',
            valor: '{ ' + compacto + ' }',
            desc: pendiente.join(' ').trim()
        });
        pendiente = [];
        continue;
    }

    const m = t.match(RE_CLAVE);
    if (!m) { pendiente = []; continue; }
    const valorRaw = m[2];
    const inline = m[3];
    let tipo = 'number';
    if (/^['"]/.test(valorRaw)) tipo = 'string';
    else if (valorRaw === 'true' || valorRaw === 'false') tipo = 'boolean';
    else if (valorRaw === 'null') tipo = 'null';
    // Descripcion: el comentario inline es mas especifico que el bloque de
    // arriba; si no hay inline, se usa el ultimo bloque de comentarios.
    const desc = (inline && inline.trim()) ? inline.trim() : (pendiente.join(' ').trim());
    items.push({ clave: m[1], tipo, valor: valorRaw, desc });
    pendiente = [];
}

if (!items.length) {
    console.error('No se pudo parsear ninguna clave de DEFAULTS');
    process.exit(1);
}

const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
const filas = items.map((it) => '| `' + it.clave + '` | ' + it.tipo + ' | `' + esc(it.valor) + '` | ' + esc(it.desc) + ' |');

const md = [
    '# Ajustes de Rondo',
    '',
    'Referencia generada automaticamente desde `DEFAULTS`',
    '(`' + origen + '`). **No editar a mano**: ejecuta',
    '`node scripts/gen-settings.mjs` para regenerarla. La clave es la misma que',
    'usa `APP.config`, asi que puedes consultarla desde la consola del navegador',
    '(`APP.config.pollMs`).',
    '',
    'Total: **' + items.length + ' claves**.',
    '',
    '| Clave | Tipo | Valor por defecto | Descripcion |',
    '| --- | --- | --- | --- |',
    ...filas,
    ''
].join('\n');

if (check) {
    const actual = fs.existsSync(path.join(raiz, destino)) ? leer(destino) : '';
    if (actual !== md) {
        console.error('docs/AJUSTES.md esta desactualizado (' + items.length + ' claves en DEFAULTS)');
        process.exit(1);
    }
    console.log('docs/AJUSTES.md sincronizado (' + items.length + ' claves)');
    process.exit(0);
}

const abs = path.join(raiz, destino);
fs.mkdirSync(path.dirname(abs), { recursive: true });
const antes = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
fs.writeFileSync(abs, md);
console.log((antes === md ? 'sin cambios: ' : 'escrito: ') + destino + ' (' + items.length + ' claves)');
