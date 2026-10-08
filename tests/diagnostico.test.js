/*
 * Pruebas del panel de diagnostico: formateo de bytes y texto plano del
 * informe. Se extraen las funciones puras del bundle y se ejecutan en
 * aislamiento, pasandoles un objeto de diagnostico simulado.
 */
'use strict';

const { src } = require('./_source.js');

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

function extraer(nombre) {
    const i = src.indexOf('function ' + nombre + '(');
    if (i < 0) return '';
    let depth = 0;
    let started = false;
    for (let j = i; j < src.length; j++) {
        const c = src[j];
        if (c === '{') { depth++; started = true; }
        else if (c === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
    }
    return '';
}

const codigo = extraer('rxDiagBytes') + '\n' + extraer('rxDiagTexto') +
    '\nreturn { rxDiagBytes: rxDiagBytes, rxDiagTexto: rxDiagTexto };';
let fns = null;
try { fns = new Function(codigo)(); } catch (e) { fns = null; }

ok('rxDiagBytes/rxDiagTexto se extraen y evaluan', !!(fns && typeof fns.rxDiagBytes === 'function' && typeof fns.rxDiagTexto === 'function'));

if (fns) {
    ok('bytes: menos de 1 KB', fns.rxDiagBytes(512) === '512 B', fns.rxDiagBytes(512));
    ok('bytes: KB con un decimal', fns.rxDiagBytes(2048) === '2.0 KB', fns.rxDiagBytes(2048));
    ok('bytes: MB con dos decimales', fns.rxDiagBytes(3 * 1024 * 1024) === '3.00 MB', fns.rxDiagBytes(3 * 1024 * 1024));
    ok('bytes: valor no numerico -> 0 B', fns.rxDiagBytes('x') === '0 B', fns.rxDiagBytes('x'));

    const d = {
        ver: '9.9.9', online: true,
        storage: { local: [{ clave: 'rondo.api.cfg', bytes: 2048 }], session: [], totalLocal: 2048, totalSession: 0 },
        caches: { memo: 3, geoCache: 1, snapMemo: 2, grafoCache: 0, iaCache: 5 },
        zonas: 10, zonasDiag: null, unidades: 7, historial: 42,
        ia: { hoy: { llamadas: 12, errores: 1 }, limite: 200, cacheTTL: 21600 },
        stats: { erroresReglas: 2, astarCap: 1 },
        fallos: { json: 0, session: 3 }
    };
    const txt = fns.rxDiagTexto(d);
    const S = '\u00b7';
    ok('texto: version y estado de conexion', txt.indexOf('9.9.9') >= 0 && txt.indexOf('en linea') >= 0);
    ok('texto: unidades, avisos y geocercas',
        new RegExp('Unidades: 7 ' + S + ' avisos: 42 ' + S + ' geocercas: 10').test(txt));
    ok('texto: uso de IA con limite', txt.indexOf('12/200') >= 0, txt.split('\n')[4]);
    ok('texto: errores de reglas', /Reglas: 2 error/.test(txt));
    ok('texto: fallos de escritura local/sesion', new RegExp('Fallos de escritura: local 0 ' + S + ' sesion 3').test(txt));
    ok('texto: lista la clave mas pesada', txt.indexOf('rondo.api.cfg') >= 0);
    // v6.12: linea de la alerta de geocercas (solo si el snapshot la trae).
    const d2 = Object.assign({}, d, {
        geoAlerta: { activa: true, geocercas: 3, flotas: 2, dentro: 2 }
    });
    const txt2 = fns.rxDiagTexto(d2);
    ok('texto: linea de la alerta de geocercas',
        txt2.indexOf('Alerta de geocercas: activa') >= 0 && /3 geocerca\(s\)/.test(txt2) &&
        /2 en toda la flota/.test(txt2) && txt2.indexOf('2 dentro ahora') >= 0,
        txt2.split('\n').filter((x) => /geocercas: activa/.test(x))[0]);
    ok('texto: incluye el tamano en KB', txt.indexOf('2.0 KB') >= 0);
}

ok('la part de diagnostico esta en el bundle',
    /function rxDiagRecolectar\(/.test(src) && /function rxDiagBind\(/.test(src) && /function rxDiagStorage\(/.test(src));
ok('init llama a rxDiagBind', /try \{ rxDiagBind\(\); \} catch/.test(src));
ok('writeJSON contabiliza fallos', /writeJSON\._fallos = \(writeJSON\._fallos \|\| 0\) \+ 1/.test(src));
ok('writeSession contabiliza fallos', /writeSession\._fallos = \(writeSession\._fallos \|\| 0\) \+ 1/.test(src));

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
