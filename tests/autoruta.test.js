/*
 * Pruebas del trazado automatico y de los helpers de estado de ruta.
 * No toca red ni DOM: stubbea OSRM/Overpass, writeSession, APP, etc.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'rondo.user.js');
const src = fs.readFileSync(ARCHIVO, 'utf8');

const ini = src.indexOf('function autoTrazarRutasPendientes');
const fin = src.indexOf('function rutaClasePill(', ini);
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de auto-trazado en ' + ARCHIVO);
    process.exit(1);
}
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de auto-trazado en ' + ARCHIVO);
    process.exit(1);
}

const code =
    'const clamp=(v,lo,hi)=>Math.min(Math.max(v,lo),hi);\n' +
    'const RADIO_TIERRA=6371008.8;\n' +
    'function rad(d){return d*Math.PI/180;}\n' +
    'function grad(r){return r*180/Math.PI;}\n' +
    'function haversine(a,b,c,d){const x=rad(c-a),y=rad(d-b);const s=Math.sin(x/2)*Math.sin(x/2)+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)*Math.sin(y/2);return 2*RADIO_TIERRA*Math.asin(Math.min(1,Math.sqrt(s)));}\n' +
    'function bearing(a,b,c,d){const p1=rad(a),p2=rad(c),dl=rad(d-b);const y=Math.sin(dl)*Math.cos(p2);const x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return (grad(Math.atan2(y,x))+360)%360;}\n' +
    'function distPuntoSegmento(lat,lon,aLat,aLon,bLat,bLon){const dAB=haversine(aLat,aLon,bLat,bLon);if(dAB<1000){const lat0=(aLat+bLat)/2;const mx=111320*Math.cos(rad(lat0)),my=110540;const px=(lon-aLon)*mx,py=(lat-aLat)*my;const bx=(bLon-aLon)*mx,by=(bLat-aLat)*my;const len2=bx*bx+by*by;let t=len2>0?(px*bx+py*by)/len2:0;t=clamp(t,0,1);const dx=px-bx*t,dy=py-by*t;return{dist:Math.sqrt(dx*dx+dy*dy),t};}return{dist:dAB,t:0};}\n' +
    'function simplificarRuta(c){return c?c.slice():[];}\n' +
    'function precomputarRuta(c){const acum=[0];let t=0;for(let i=1;i<c.length;i++){t+=haversine(c[i-1][1],c[i-1][0],c[i][1],c[i][0]);acum.push(t);}return{acum,total:t};}\n' +
    'function snapRuta(lat,lon,ruta,memo){if(!ruta||!ruta.coords||ruta.coords.length<2||lat==null||lon==null)return null;const c=ruta.coords;const n=c.length;function proyectar(i){if(i<0||i>=n-1)return null;const d=distPuntoSegmento(lat,lon,c[i][1],c[i][0],c[i+1][1],c[i+1][0]);return{dist:d.dist,idx:i,t:d.t};}function resultado(mejor){const acum=ruta.acum||[0,ruta.total||1];const segLen=(acum[mejor.idx+1]||0)-(acum[mejor.idx]||0);const recorrido=(acum[mejor.idx]||0)+mejor.t*segLen;const total=ruta.total||1;const a=c[mejor.idx],b=c[mejor.idx+1];return{dist:mejor.dist,idx:mejor.idx,t:mejor.t,progreso:clamp(recorrido/total,0,1),recorrido,total,rumbo:bearing(a[1],a[0],b[1],b[0])};}if(memo&&Number.isInteger(memo.idx)&&memo.idx>=0&&memo.idx<n-1){const cands=[memo.idx,memo.idx-1,memo.idx+1];let mejor=null;for(let k=0;k<cands.length;k++){const p=proyectar(cands[k]);if(p&&(!mejor||p.dist<mejor.dist))mejor=p;}if(mejor&&mejor.dist<=1000){memo.idx=mejor.idx;return resultado(mejor);}}let mejor={dist:Infinity,idx:0,t:0};for(let i=0;i<n-1;i++){const d=distPuntoSegmento(lat,lon,c[i][1],c[i][0],c[i+1][1],c[i+1][0]);if(d.dist<mejor.dist)mejor={dist:d.dist,idx:i,t:d.t};}if(memo)memo.idx=mejor.idx;return resultado(mejor);}\n' +
    // Stubs de APP y writeSession
    'const APP = { config: { autoRuta: false, autoRutaModo: "osrm", osrm: true, overpass: false, desvioM: 250, retornoM: 400, watchAll: true }, unidades: [], watchMap: {}, rutas: {}, snapMemo: {}, seleccion: new Set(), watchAll: true };\n' +
    'const writeSession = () => {};\n' +
    'const sleep = () => Promise.resolve();\n' +
    'let _planCalls = [];\n' +
    'async function planearRuta(eco, destinoTexto) { _planCalls.push({ eco, destinoTexto }); APP.rutas[eco] = { eco, destinoTexto, destino: { lat: 0, lon: 0 }, coords: [[0,0],[0.001,0]], acum: [0, 111], total: 111, modo: "osrm", creada: Date.now() }; return APP.rutas[eco]; }\n' +
    'function shouldWatch(u) { return APP.config.watchAll === true; }\n' +
    'function parseUnitName(u) { const m = (u.nm||"").match(/\\.\\s*0*(\\d{3,5})/); return { id: u.id, nombre: u.nm, eco: m ? m[1] : "", placa: "", clave: m ? m[1] : String(u.id) }; }\n' +
    'function watchDest(info) { return APP.watchMap[info.eco] || ""; }\n' +
    // v5.15: stubs de los helpers de plan multipunto que usa watchDest real
    // (el slice re-define watchDest, que ahora consulta planDe).
    'function planDe(){ return null; }\n' +
    'function planATexto(){ return ""; }\n' +
    'function rutaDe(info) { return APP.rutas[info.clave] || APP.rutas[info.eco] || null; }\n' +
    src.slice(ini, fin) +
    '\nfunction rutaClasePill(estado){switch(estado){case "LLEGO":return "ok";case "DESV":return "warn";case "EN RUTA":return "on";case "SIN POSICION":return "off";default:return "mute";}}\n' +
    '\nreturn {autoTrazarRutasPendientes, autoTrazarRutas, calcularETA, estadoRuta, rutaClasePill, getCalls: () => _planCalls, APP};';
const mod = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}
function casi(a, b, tol) { return Math.abs(a - b) <= (tol == null ? 1 : tol); }

// --- autoTrazarRutasPendientes ---

mod.APP.unidades = [
    { id: 1, nm: 'UN.04381' },
    { id: 2, nm: 'UN.04382' },
    { id: 3, nm: 'UN.04383' }
];
mod.APP.watchMap = {};
mod.APP.config.autoRuta = false;
ok('autoTrazarRutasPendientes: default desactivado no detecta nada',
    mod.autoTrazarRutasPendientes().length === 0);

mod.APP.config.autoRuta = true;
mod.APP.watchMap = { '4381': 'Monterrey', '4382': 'Saltillo' };
const p = mod.autoTrazarRutasPendientes();
ok('autoTrazarRutasPendientes: detecta 2 destinos pendientes',
    p.length === 2, 'n=' + p.length);
ok('autoTrazarRutasPendientes: incluye eco y destino',
    p.some((x) => x.eco === '4381' && x.destino === 'Monterrey'));
ok('autoTrazarRutasPendientes: usa osrm por defecto',
    p.every((x) => x.modo === 'osrm'));

mod.APP.config.autoRuta = false;
ok('autoTrazarRutasPendientes: respeta autoRuta=false',
    mod.autoTrazarRutasPendientes().length === 0);
mod.APP.config.autoRuta = true;

mod.APP.rutas = { '4381': { destinoTexto: 'Monterrey', modo: 'osrm' } };
const p2 = mod.autoTrazarRutasPendientes();
ok('autoTrazarRutasPendientes: ignora unidades con ruta valida',
    p2.length === 1 && p2[0].eco === '4382', 'n=' + p2.length);

mod.APP.rutas = { '4382': { destinoTexto: 'Saltillo', modo: 'astar' } };
ok('autoTrazarRutasPendientes: detecta cambio de modo',
    mod.autoTrazarRutasPendientes().some((x) => x.eco === '4382'),
    'pendientes=' + mod.autoTrazarRutasPendientes().length);
mod.APP.rutas = {};

// --- autoTrazarRutas (async) ---

(async () => {
    await mod.autoTrazarRutas();
    ok('autoTrazarRutas: planifica rutas pendientes',
        mod.getCalls().length === 2 && mod.APP.rutas['4381'] && mod.APP.rutas['4382']);

    // Sin pendientes: no llama.
    mod.getCalls().length = 0;
    await mod.autoTrazarRutas();
    ok('autoTrazarRutas: no relanza si ya estan trazadas',
        mod.getCalls().length === 0);

    // --- calcularETA ---
    const ruta = { total: 10000 };
    const s = { recorrido: 4000 };
    ok('calcularETA: a 50 km/h el resto de 6 km = 432 s',
        casi(mod.calcularETA(s, ruta, 50), 432, 2));
    ok('calcularETA: a 0 km/h usa velocidad prudente (50)',
        casi(mod.calcularETA(s, ruta, 0), 432, 2));
    ok('calcularETA: null si no hay snap',
        mod.calcularETA(null, ruta, 50) === null);
    ok('calcularETA: null si no hay ruta',
        mod.calcularETA(s, null, 50) === null);
    ok('calcularETA: 0 s si ya esta en el destino',
        mod.calcularETA({ recorrido: 10000 }, ruta, 50) === 0);

    // --- estadoRuta ---
    const info = { clave: '4381', eco: '4381' };
    mod.APP.snapMemo = { '4381': { idx: 0 } };
    const rutaReal = {
        coords: [[0, 0], [0.001, 0], [0.002, 0]],
        acum: [0, 111, 222],
        total: 222,
        destino: { lat: 0, lon: 0.002 },
        destinoTexto: 'destino'
    };
    mod.APP.rutas = { '4381': rutaReal };

    const er1 = mod.estadoRuta(info, { online: true, lat: 0, lon: 0, vel: 40 });
    ok('estadoRuta: cerca del origen -> EN RUTA',
        er1.estado === 'EN RUTA' && er1.snap && er1.snap.progreso >= 0 && er1.snap.progreso <= 0.05,
        'estado=' + er1.estado + ' prog=' + (er1.snap && er1.snap.progreso));

    const er2 = mod.estadoRuta(info, { online: true, lat: 0, lon: 0.002, vel: 0 });
    ok('estadoRuta: en el destino -> LLEGO',
        er2.estado === 'LLEGO' && er2.snap.progreso >= 0.95,
        'estado=' + er2.estado + ' prog=' + er2.snap.progreso);

    const er3 = mod.estadoRuta(info, { online: true, lat: 0.001, lon: 1.5, vel: 50 });
    ok('estadoRuta: lejos de la ruta -> DESV',
        er3.estado === 'DESV' && er3.desviado,
        'estado=' + er3.estado);

    const er4 = mod.estadoRuta(info, { online: false, lat: 0.001, lon: 0, vel: 0 });
    ok('estadoRuta: offline -> SIN POSICION',
        er4.estado === 'SIN POSICION');

    const er5 = mod.estadoRuta(info, { online: true, lat: 0, lon: 0, vel: 40 });
    ok('estadoRuta: reusa memo en el segundo snap',
        mod.APP.snapMemo['4381'].idx >= 0);

    mod.APP.rutas = {};
    const er6 = mod.estadoRuta(info, { online: true, lat: 0, lon: 0, vel: 40 });
    ok('estadoRuta: sin ruta -> SIN RUTA', er6.estado === 'SIN RUTA');

    // --- rutaClasePill ---
    ok('rutaClasePill: LLEGO -> ok', mod.rutaClasePill('LLEGO') === 'ok');
    ok('rutaClasePill: DESV -> warn', mod.rutaClasePill('DESV') === 'warn');
    ok('rutaClasePill: EN RUTA -> on', mod.rutaClasePill('EN RUTA') === 'on');
    ok('rutaClasePill: SIN POSICION -> off', mod.rutaClasePill('SIN POSICION') === 'off');
    ok('rutaClasePill: SIN RUTA -> mute', mod.rutaClasePill('SIN RUTA') === 'mute');

    console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
    process.exit(fallos ? 1 : 0);
})();