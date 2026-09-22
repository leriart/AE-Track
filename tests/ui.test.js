/*
 * Pruebas de los helpers de UI de Rondo: ordenamiento, estado vacio y escala.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'rondo.user.js');
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

// valorOrden + cmpOrd + actualizarCabecerasOrden usan zoneAt y odometroDe.
const codeOrden =
    'function esc(v){return String(v==null?"":v).replace(/[&<>"\']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\'":"&#39;"}[c];});}\n' +
    'const zoneAt = (lat, lon) => (lat == null ? "" : "ZONA_" + lat);\n' +
    'const odometroDe = (info) => ({ m: (info.kmi || 0) * 1000 });\n' +
    bloque('function valorOrden', 'function actualizarCabecerasOrden') +
    '\nreturn {valorOrden, cmpOrd};';
const mod = new Function(codeOrden)();

// emptyState + setHtml + invalidarHtml.
const codeEmpty =
    'function esc(v){return String(v==null?"":v).replace(/[&<>"\']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\'":"&#39;"}[c];});}\n' +
    bloque('function emptyState', 'function abrirBienvenida') +
    '\nreturn {emptyState, setHtml, invalidarHtml};';
const modEmpty = new Function(codeEmpty)();

// normalizarEscala usa ESCALAS_UI.
const codeEsc =
    bloque('const ESCALAS_UI', 'function nmActivo') +
    '\nreturn {normalizarEscala, ESCALAS_UI};';
const modEsc = new Function(codeEsc)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

// valorOrden por columna.
ok('valorOrden eco devuelve el economico',
    mod.valorOrden({ info: { eco: '4381' }, st: { lat: 0, lon: 0 } }, 'eco') === '4381');
ok('valorOrden vel devuelve numero',
    mod.valorOrden({ info: { eco: '4381' }, st: { vel: 40, lat: 0, lon: 0 } }, 'vel') === 40);
ok('valorOrden edad devuelve edadMin',
    mod.valorOrden({ info: { eco: '4381' }, st: { edadMin: 12, lat: 0, lon: 0 } }, 'edad') === 12);
ok('valorOrden edad null -> Infinity',
    mod.valorOrden({ info: { eco: '4381' }, st: { edadMin: null, lat: 0, lon: 0 } }, 'edad') === Infinity);
ok('valorOrden zona usa zoneAt',
    mod.valorOrden({ info: { eco: '4381' }, st: { lat: 19, lon: 0 } }, 'zona') === 'ZONA_19');
ok('valorOrden odo convierte metros',
    mod.valorOrden({ info: { eco: '4381', kmi: 7 }, st: { lat: 0, lon: 0 } }, 'odo') === 7000);

ok('cmpOrd numerico ascendente', mod.cmpOrd(1, 2) < 0 && mod.cmpOrd(5, 3) > 0);
ok('cmpOrd strings natural (ecos)', mod.cmpOrd('10', '2') > 0,
    'esperado 10 > 2 en orden natural');
ok('cmpOrd strings alfabetico', mod.cmpOrd('ABC', 'ABD') < 0);
ok('cmpOrd iguales', mod.cmpOrd(4, 4) === 0);

function U(eco, placa, estado, edad, vel, lat, kmi) {
    return { info: { eco, placa, nombre: eco, kmi }, st: { estado, edadMin: edad, vel, lat, lon: 0 } };
}
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
ok('emptyState incluye clase rondo-vacio', e.indexOf('rondo-vacio') >= 0);
ok('emptyState escapa el titulo', e.indexOf('Sin &lt;unidades&gt;') >= 0, e);
// La pista es HTML controlado por el script (admite <b>, etc.), no se escapa.
ok('emptyState conserva HTML en la pista', e.indexOf('Prueba & demo') >= 0);
ok('emptyState renderiza el icono', e.indexOf('>X<') >= 0);

// setHtml: solo reescribe el DOM cuando el contenido cambia.
const fake = { id: 'probando', innerHTML: '' };
ok('setHtml: primer render escribe', modEmpty.setHtml(fake, '<b>A</b>') === true && fake.innerHTML === '<b>A</b>');
ok('setHtml: mismo HTML no reescribe', modEmpty.setHtml(fake, '<b>A</b>') === false && fake.innerHTML === '<b>A</b>');
ok('setHtml: HTML distinto si reescribe', modEmpty.setHtml(fake, '<b>B</b>') === true && fake.innerHTML === '<b>B</b>');
modEmpty.invalidarHtml('probando');
ok('setHtml: invalidar fuerza reescritura', modEmpty.setHtml(fake, '<b>B</b>') === true);
ok('setHtml: elemento nulo no rompe', modEmpty.setHtml(null, 'x') === false);

// Escala de interfaz (accesibilidad).
ok('normalizarEscala: 1 -> 1', modEsc.normalizarEscala(1) === 1);
ok('normalizarEscala: "1.15" -> 1.15', modEsc.normalizarEscala('1.15') === 1.15);
ok('normalizarEscala: 1.2 -> 1.15 (mas cercano)', modEsc.normalizarEscala(1.2) === 1.15);
ok('normalizarEscala: 1.4 -> 1.3', modEsc.normalizarEscala(1.4) === 1.3);
ok('normalizarEscala: 1.6 -> 1.5', modEsc.normalizarEscala(1.6) === 1.5);
ok('normalizarEscala: no numerico -> 1', modEsc.normalizarEscala('x') === 1 && modEsc.normalizarEscala(undefined) === 1);
ok('normalizarEscala: 999 -> 1.5', modEsc.normalizarEscala(999) === 1.5);
ok('ESCALAS_UI tiene 4 niveles', modEsc.ESCALAS_UI.length === 4);

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
