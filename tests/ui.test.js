/*
 * Pruebas de los helpers de UI: ordenamiento de la tabla de unidades y
 * estados vacios.
 * Uso:  node tests/ui.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'HJP-Wialon.user.js');
const src = fs.readFileSync(ARCHIVO, 'utf8');

function bloque(inicio, fin) {
    const i = src.indexOf(inicio);
    const f = src.indexOf(fin, i);
    if (i < 0 || f < 0) {
        console.error('No se encontro el bloque "' + inicio + '" en ' + ARCHIVO);
        process.exit(1);
    }
    return src.slice(i, f);
}

// valorOrden usa zoneAt y odometroDe; se stubbean.
const codeOrden =
    'function esc(v){return String(v==null?"":v).replace(/[&<>"\']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\'":"&#39;"}[c];});}\n' +
    'const zoneAt = (lat, lon) => (lat == null ? "" : "ZONA_" + lat);\n' +
    'const odometroDe = (info) => ({ m: (info.kmi || 0) * 1000 });\n' +
    bloque('function valorOrden', 'function actualizarCabecerasOrden') +
    '\nreturn {valorOrden, cmpOrd};';
const mod = new Function(codeOrden)();

// emptyState usa esc.
const codeEmpty =
    'function esc(v){return String(v==null?"":v).replace(/[&<>"\']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\'":"&#39;"}[c];});}\n' +
    bloque('function emptyState', 'function abrirBienvenida') +
    '\nreturn {emptyState, setHtml, invalidarHtml};';
const modEmpty = new Function(codeEmpty)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

function U(eco, placa, estado, edad, vel, lat, kmi) {
    return { info: { eco, placa, nombre: eco, kmi }, st: { estado, edadMin: edad, vel, lat, lon: 0 } };
}

// valorOrden por columna.
ok('valorOrden eco devuelve el economico',
    mod.valorOrden(U('4381', 'ABC', 'moviendo', 1, 40, 19, 5), 'eco') === '4381');
ok('valorOrden vel devuelve numero',
    mod.valorOrden(U('4381', 'ABC', 'moviendo', 1, 40, 19, 5), 'vel') === 40);
ok('valorOrden edad devuelve edadMin',
    mod.valorOrden(U('4381', 'ABC', 'moviendo', 12, 40, 19, 5), 'edad') === 12);
ok('valorOrden edad null -> Infinity',
    mod.valorOrden(U('4381', 'ABC', 'offline', null, 0, null, 5), 'edad') === Infinity);
ok('valorOrden zona usa zoneAt',
    mod.valorOrden(U('4381', 'ABC', 'moviendo', 1, 40, 19, 5), 'zona') === 'ZONA_19');
ok('valorOrden odo convierte metros',
    mod.valorOrden(U('4381', 'ABC', 'moviendo', 1, 40, 19, 7), 'odo') === 7000);

// cmpOrd.
ok('cmpOrd numerico ascendente', mod.cmpOrd(1, 2) < 0 && mod.cmpOrd(5, 3) > 0);
ok('cmpOrd strings natural (ecos)', mod.cmpOrd('10', '2') > 0,
    'esperado 10 > 2 en orden natural');
ok('cmpOrd strings alfabetico', mod.cmpOrd('ABC', 'ABD') < 0);
ok('cmpOrd iguales', mod.cmpOrd(4, 4) === 0);

// Ordenar una lista simulando el comparador de paintTabla.
const lista = [
    U('10', 'ZZZ', 'moviendo', 1, 10, 19, 1),
    U('2', 'AAA', 'detenida', 5, 0, 20, 30),
    U('100', 'MMM', 'offline', 9, 0, null, 5)
];
const porEco = lista.slice().sort((a, b) => mod.cmpOrd(mod.valorOrden(a, 'eco'), mod.valorOrden(b, 'eco')));
ok('orden por eco natural: 2 < 10 < 100',
    porEco.map((x) => x.info.eco).join(',') === '2,10,100', porEco.map((x) => x.info.eco).join(','));
const porVel = lista.slice().sort((a, b) => mod.cmpOrd(mod.valorOrden(b, 'vel'), mod.valorOrden(a, 'vel')));
ok('orden por velocidad descendente: 10,0,0',
    porVel.map((x) => x.st.vel).join(',') === '10,0,0', porVel.map((x) => x.st.vel).join(','));

// emptyState.
const e = modEmpty.emptyState('X', 'Sin <unidades>', 'Prueba & demo');
ok('emptyState incluye clase hjp-vacio', e.indexOf('hjp-vacio') >= 0);
ok('emptyState escapa el titulo', e.indexOf('Sin &lt;unidades&gt;') >= 0, e);
// La pista es HTML controlado por el script (admite <b>, etc.), no se escapa.
ok('emptyState conserva HTML en la pista', e.indexOf('Prueba & demo') >= 0);
ok('emptyState renderiza el icono', e.indexOf('>X<') >= 0);

// setHtml: solo reescribe el DOM cuando el contenido cambia (evita el
// parpadeo por reescritura identica cada segundo).
const fake = { id: 'probando', innerHTML: '' };
ok('setHtml: primer render escribe', modEmpty.setHtml(fake, '<b>A</b>') === true && fake.innerHTML === '<b>A</b>');
ok('setHtml: mismo HTML no reescribe', modEmpty.setHtml(fake, '<b>A</b>') === false && fake.innerHTML === '<b>A</b>');
ok('setHtml: HTML distinto si reescribe', modEmpty.setHtml(fake, '<b>B</b>') === true && fake.innerHTML === '<b>B</b>');
modEmpty.invalidarHtml('probando');
ok('setHtml: invalidar fuerza reescritura', modEmpty.setHtml(fake, '<b>B</b>') === true);
ok('setHtml: elemento nulo no rompe', modEmpty.setHtml(null, 'x') === false);

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
