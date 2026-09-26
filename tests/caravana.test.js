/*
 * Pruebas del algoritmo del modo caravana: filtra unidades cercanas al
 * lider, ya sea proyectadas sobre la ruta o por cercania directa.
 * No toca red ni DOM: stubbea APP, snapRuta, helpers de unidad, etc.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* === BEGIN: unidadesEnCaravana ===');
const fin = src.indexOf('/* === END: unidadesEnCaravana ===');
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de unidadesEnCaravana en ' + ARCHIVO);
    process.exit(1);
}

const code =
    'const clamp=(v,lo,hi)=>Math.min(Math.max(v,lo),hi);\n' +
    'function difAngulo(a,b){return Math.abs(((a-b+540)%360)-180);}\n' +
    'function snapRuta(lat,lon,ruta,memo){\n' +
    '  if(!ruta||!ruta.coords||ruta.coords.length<2||lat==null||lon==null)return null;\n' +
    '  const c=ruta.coords;const n=c.length;\n' +
    '  let mejor={dist:Infinity,idx:0,t:0};\n' +
    '  for(let i=0;i<n-1;i++){\n' +
    '    const A=c[i],B=c[i+1];\n' +
    '    const ax=A[0],ay=A[1],bx=B[0],by=B[1];\n' +
    '    const dx=bx-ax,dy=by-ay;\n' +
    '    const px=lon-ax,py=lat-ay;\n' +
    '    const len2=dx*dx+dy*dy;\n' +
    '    let t=len2>0?(px*dx+py*dy)/len2:0;t=clamp(t,0,1);\n' +
    '    const d=Math.sqrt((px-dx*t)*(px-dx*t)+(py-dy*t)*(py-dy*t));\n' +
    '    if(d<mejor.dist){mejor={dist:d*111000,idx:i,t:t};}\n' +
    '  }\n' +
    '  const acum=ruta.acum||[0,ruta.total||1];\n' +
    '  const segLen=(acum[mejor.idx+1]||0)-(acum[mejor.idx]||0);\n' +
    '  const recorrido=(acum[mejor.idx]||0)+mejor.t*segLen;\n' +
    '  const total=ruta.total||1;\n' +
    '  const a=c[mejor.idx],b=c[mejor.idx+1];\n' +
    '  const y=Math.sin(((b[0]-a[0])*Math.PI/180))*Math.cos(b[1]*Math.PI/180);\n' +
    '  const x=Math.cos(a[1]*Math.PI/180)*Math.sin(b[1]*Math.PI/180)-Math.sin(a[1]*Math.PI/180)*Math.cos(b[1]*Math.PI/180)*Math.cos((b[0]-a[0])*Math.PI/180);\n' +
    '  const rumbo=(Math.atan2(y,x)*180/Math.PI+360)%360;\n' +
    '  if(memo)memo.idx=mejor.idx;\n' +
    '  return{dist:mejor.dist,idx:mejor.idx,t:mejor.t,progreso:clamp(recorrido/total,0,1),recorrido,total,rumbo};\n' +
    '}\n' +
    'const RADIO_TIERRA=6371008.8;\n' +
    'function rad(d){return d*Math.PI/180;}\n' +
    'function haversine(a,b,c,d){const x=rad(c-a),y=rad(d-b);const s=Math.sin(x/2)*Math.sin(x/2)+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)*Math.sin(y/2);return 2*RADIO_TIERRA*Math.asin(Math.min(1,Math.sqrt(s)));}\n' +
    // APP y stubs. watchedSet: ids marcados como vigilados; si watchAll=true
    // o si el id esta en watchedSet, shouldWatch devuelve true. Asi podemos
    // simular la mezcla "algunas unidades vigiladas, otras no".
    'const APP={config:{caravanaM:300,caravanaCercaM:2000,watchAll:false},unidades:[],rutas:{},snapMemo:{},seleccion:new Set(),watchedSet:new Set()};\n' +
    'function shouldWatch(u){return APP.config.watchAll===true || APP.watchedSet.has(u.id);}\n' +
    'function parseUnitName(u){const m=(u.nm||"").match(/\\.\\s*0*(\\d{3,5})/);return{id:u.id,nombre:u.nm,eco:m?m[1]:"",placa:"",clave:m?m[1]:String(u.id)};}\n' +
    'function unitState(u){return{u:u,online:u.online!==false,lat:u.lat,lon:u.lon,vel:u.vel||0,curso:u.curso||0};}\n' +
    'function rutaDe(info){return APP.rutas[info.clave]||APP.rutas[info.eco]||null;}\n' +
    src.slice(ini, fin) +
    '\nreturn {unidadesEnCaravana, APP};';
const mod = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}
function cerca(a, b, tol) { return Math.abs(a - b) <= (tol == null ? 50 : tol); }

// --- casos base ---
const ruta = {
    coords: [[0, 0], [0.001, 0], [0.002, 0]],
    acum: [0, 111, 222],
    total: 222
};
mod.APP.rutas = { '4381': ruta };
mod.APP.snapMemo = {};
mod.APP.unidades = [
    { id: 1, nm: 'UN.04381', online: true, lat: 0, lon: 0, vel: 40, curso: 90 },
    { id: 2, nm: 'UN.04382', online: true, lat: 0, lon: 0.0005, vel: 35, curso: 90 },   // ~55 m delante en ruta
    { id: 3, nm: 'UN.04383', online: true, lat: 0, lon: 0.0015, vel: 30, curso: 90 },   // ~165 m delante en ruta
    { id: 4, nm: 'UN.04384', online: true, lat: 0, lon: 0.0010, vel: 40, curso: 300 },  // sentido contrario
    { id: 5, nm: 'UN.04385', online: true, lat: 0.001, lon: 0.0010, vel: 20, curso: 90 }, // lejos del eje
    { id: 6, nm: 'UN.04386', online: false, lat: 0, lon: 0.0005, vel: 0, curso: 90 },   // offline -> no cuenta
    { id: 7, nm: 'UN.04387', online: true, lat: 0.02, lon: 0.02, vel: 0, curso: 0 }       // muy lejos -> no cuenta
];
// Caso base: todas las unidades estan vigiladas.
mod.APP.watchedSet = new Set([1, 2, 3, 4, 5, 6, 7]);

const info = { id: 1, nombre: 'UN.04381', eco: '4381', placa: '', clave: '4381' };
const st = { online: true, lat: 0, lon: 0, vel: 40, curso: 90 };
const r = mod.unidadesEnCaravana(info, st);
ok('unidadesEnCaravana: solo vigiladas y online se consideran', r.miembros.length === 4, 'n=' + r.miembros.length);

const m82 = r.miembros.find((m) => m.info.eco === '4382');
ok('miembro en ruta (4382): enRuta=true y delta positivo (delante)', m82 && m82.enRuta && m82.deltaRuta > 0, 'dr=' + (m82 && m82.deltaRuta));
ok('miembro en ruta (4382): no es contrario', m82 && m82.contrario === false);

const m83 = r.miembros.find((m) => m.info.eco === '4383');
ok('miembro 4383: enRuta=true y delta mayor que 4382',
    m83 && m83.enRuta && m83.deltaRuta > (m82 ? m82.deltaRuta : 0),
    'd83=' + (m83 && m83.deltaRuta) + ' d82=' + (m82 && m82.deltaRuta));

const m84 = r.miembros.find((m) => m.info.eco === '4384');
ok('miembro 4384: enRuta=true y contrario=true', m84 && m84.enRuta && m84.contrario, 'c=' + (m84 && m84.contrario));

const m85 = r.miembros.find((m) => m.info.eco === '4385');
ok('miembro 4385: fuera de la polilinea cuenta por cercania', m85 != null, 'm85=' + (m85 && m85.enRuta));

const m87 = r.miembros.find((m) => m.info.eco === '4387');
ok('miembro 4387: descartado por cercania', m87 == null);

const m86 = r.miembros.find((m) => m.info.eco === '4386');
ok('miembro 4386: descartado por estar offline', m86 == null);

ok('unidadesEnCaravana: rutaLider presente', r.rutaLider != null);
ok('unidadesEnCaravana: snapLider presente', r.snapLider != null);
ok('unidadesEnCaravana: snapLider empieza en progreso 0', r.snapLider && r.snapLider.progreso < 0.1);

// Orden por deltaRuta ascendente (los mas "atras" primero).
ok('unidadesEnCaravana: orden por delta (negativos/positivos)',
    r.miembros[0].deltaRuta <= r.miembros[r.miembros.length - 1].deltaRuta,
    'd0=' + r.miembros[0].deltaRuta + ' dN=' + r.miembros[r.miembros.length - 1].deltaRuta);

// --- sin ruta trazada ---
mod.APP.rutas = {};
mod.APP.snapMemo = {};
const r2 = mod.unidadesEnCaravana(info, st);
ok('sin ruta: solo entran los miembros dentro del radio de cercania',
    r2.miembros.every((m) => m.distDirecta <= 2000) &&
    r2.miembros.find((m) => m.info.eco === '4382') != null,
    'n=' + r2.miembros.length);
ok('sin ruta: el muy lejano (4387) queda fuera', r2.miembros.find((m) => m.info.eco === '4387') == null);

// --- cercania configurable ---
mod.APP.config.caravanaCercaM = 50;
const r3 = mod.unidadesEnCaravana(info, st);
mod.APP.config.caravanaCercaM = 2000;
ok('radio de cercania: con 50 m el lejano 4387 queda fuera',
    r3.miembros.find((m) => m.info.eco === '4387') == null,
    'n=' + r3.miembros.length);
ok('radio de cercania: con 50 m 4382 sigue dentro porque toca la ruta',
    r3.miembros.find((m) => m.info.eco === '4382') != null);

// --- lateral configurable (en ruta) ---
mod.APP.rutas = { '4381': ruta };
mod.APP.snapMemo = {};
mod.APP.config.caravanaM = 50;
const r4 = mod.unidadesEnCaravana(info, st);
mod.APP.config.caravanaM = 300;
ok('tolerancia lateral: con 50 m el miembro 4385 (lejos del eje) no cuenta por ruta',
    r4.miembros.find((m) => m.info.eco === '4385') && r4.miembros.find((m) => m.info.eco === '4385').enRuta === false,
    'enRuta85=' + (r4.miembros.find((m) => m.info.eco === '4385') || {}).enRuta);

// --- inclusion de unidades NO vigiladas ---
// watchAll=false, solo el lider (1) esta vigilado. El resto de unidades
// online y dentro de los umbrales siguen apareciendo, marcadas con
// vigilada=false.
mod.APP.rutas = { '4381': ruta };
mod.APP.snapMemo = {};
mod.APP.watchedSet = new Set([1]);
const r5 = mod.unidadesEnCaravana(info, st);
ok('incluye no vigiladas: aparecen aun con watchAll=false', r5.miembros.length >= 4, 'n=' + r5.miembros.length);
const m85nv = r5.miembros.find((m) => m.info.eco === '4385');
ok('incluye no vigiladas: 4385 (no vigilada) sigue en la lista', m85nv != null);
ok('incluye no vigiladas: 4385 marcado como vigilada=false', m85nv && m85nv.vigilada === false);
const m82v = r5.miembros.find((m) => m.info.eco === '4382');
ok('incluye no vigiladas: 4382 (no vigilada) marcado como vigilada=false', m82v && m82v.vigilada === false);
ok('incluye no vigiladas: unidades lejanas (4387) siguen fuera',
    r5.miembros.find((m) => m.info.eco === '4387') == null);
ok('incluye no vigiladas: unidades offline (4386) siguen fuera',
    r5.miembros.find((m) => m.info.eco === '4386') == null);
// El campo vigilada distingue miembros de la lista vigilada.
const vCount = r5.miembros.filter((m) => m.vigilada).length;
const nvCount = r5.miembros.filter((m) => !m.vigilada).length;
ok('incluye no vigiladas: hay vigiladas y no vigiladas en la misma salida',
    vCount === 0 && nvCount >= 4, 'v=' + vCount + ' nv=' + nvCount);

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
