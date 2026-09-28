/*
 * Pruebas del rango del replay: inicio y fin son fecha+hora independientes.
 *
 * Se extraen rxReplayFechaHoy() y rxReplayRango() del bundle y se ejecutan en
 * aislamiento (sin DOM ni red).
 */
'use strict';

const { src } = require('./_source.js');

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

// Extrae una funcion por nombre contando llaves (ignora el resto del script).
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

const motorKeys = (src.match(/const RX_MOTOR_KEYS = \[[^\]]*\];/) || [''])[0];
const codigo = motorKeys + '\n' + extraer('rxMotorMsg') + '\n' + extraer('rxMotorClasificar') + '\n' +
    extraer('rxReplayFechaHoy') + '\n' + extraer('rxReplayRango') +
    '\nreturn { rxReplayRango: rxReplayRango, rxReplayFechaHoy: rxReplayFechaHoy, rxMotorMsg: rxMotorMsg, rxMotorClasificar: rxMotorClasificar };';
let fns = null;
try { fns = new Function(codigo)(); } catch (e) { fns = null; }

ok('rxReplayRango se puede extraer y evaluar', !!(fns && typeof fns.rxReplayRango === 'function'));
if (fns) {
    const ahora = Math.floor(Date.now() / 1000);

    // 1) Mismo dia: inicio 08:00 y fin 10:00 (fin incluye el minuto completo).
    const r1 = fns.rxReplayRango('2026-01-02', '08:00', '10:00');
    ok('mismo dia: el fin es posterior al inicio', r1.hasta > r1.desde,
        r1.desde + ' -> ' + r1.hasta);
    ok('mismo dia: inicio a las 08:00', new Date(r1.desde * 1000).getHours() === 8,
        new Date(r1.desde * 1000).toString());
    ok('mismo dia: duracion ~2 h', (r1.hasta - r1.desde) >= 7200 && (r1.hasta - r1.desde) <= 7260,
        (r1.hasta - r1.desde) + ' s');

    // 2) Multidia: 01 22:00 -> 02 06:00 (cruza la medianoche).
    const r2 = fns.rxReplayRango('2026-01-01', '22:00', '06:00', '2026-01-02');
    const dIni = new Date(r2.desde * 1000);
    const dFin = new Date(r2.hasta * 1000);
    ok('multidia: empieza el dia 1 y acaba el dia 2',
        dIni.getDate() === 1 && dFin.getDate() === 2,
        dIni.toString() + ' -> ' + dFin.toString());
    ok('multidia: duracion ~8 h (no negativa)',
        (r2.hasta - r2.desde) >= 8 * 3600 && (r2.hasta - r2.desde) <= 8 * 3600 + 60,
        (r2.hasta - r2.desde) + ' s');
    ok('multidia: no se intercambian inicio y fin', dFin > dIni);

    // 3) Sin fecha de fin -> mismo dia que el inicio.
    const r3 = fns.rxReplayRango('2026-03-05', '06:00', '18:00');
    ok('sin fecha de fin: usa el dia del inicio',
        new Date(r3.desde * 1000).getDate() === 5 && new Date(r3.hasta * 1000).getDate() === 5,
        new Date(r3.desde * 1000).toString() + ' -> ' + new Date(r3.hasta * 1000).toString());

    // 4) Horas invalidas -> 00:00 / 23:59 del mismo dia.
    const r4 = fns.rxReplayRango('2026-03-05', '', '');
    ok('horas invalidas: usa 00:00-23:59', (r4.hasta - r4.desde) >= 23 * 3600,
        (r4.hasta - r4.desde) + ' s');

    // 5) Fin en el futuro -> se recorta a "ahora".
    const r5 = fns.rxReplayRango('2020-01-01', '00:00', '00:00', '2099-01-01');
    ok('fin futuro: se recorta a ahora', r5.hasta <= ahora && r5.hasta > r5.desde,
        r5.hasta + ' vs ahora ' + ahora);
    // 6) Motor: lectura del sensor y clasificacion de la parada.
    const motMsg = fns.rxMotorMsg;
    const cls = fns.rxMotorClasificar;
    ok('motor: engine=1 -> encendido', motMsg({ params: { engine: 1 } }) === true);
    ok('motor: ignition=0 -> apagado', motMsg({ params: { ignition: 0 } }) === false);
    ok('motor: acc="on" -> encendido', motMsg({ params: { acc: 'on' } }) === true);
    ok('motor: sin sensor de motor -> null', motMsg({ params: { fuel: 12 } }) === null);
    ok('motor: el valor ya calculado (eng) manda sobre params', motMsg({ eng: false, params: { engine: 1 } }) === false);
    ok('clasificar: mayoria del sensor encendido',
        cls([true, true, false], 0, 900).motor === 'on' && cls([true, true, false], 0, 900).fuente === 'sensor');
    ok('clasificar: mayoria del sensor apagado',
        cls([false, false, true], 0, 900).motor === 'off' && cls([false, false, true], 0, 900).fuente === 'sensor');
    ok('clasificar: sin sensor y hueco largo -> apagado estimado',
        cls([], 1200, 900).motor === 'off' && cls([], 1200, 900).fuente === 'estimado');
    ok('clasificar: sin sensor y reporte continuo -> encendido estimado',
        cls([], 120, 900).motor === 'on' && cls([], 120, 900).fuente === 'estimado');
}

// 7) La UI debe exponer el control de fecha de fin.
ok('la tab de replay incluye fecha de fin (fecha2)', src.includes('rondo-replay-fecha2'));
ok('la tab de replay incluye el rango rapido 24 h', /data-rango="24h"/.test(src));

// 8) El reporte del recorrido refleja el rango completo y el motor.
ok('informe del recorrido: rango con fecha y hora', /fdt\(r\.desde \|\| s\.inicio\)/.test(src));
ok('informe del recorrido: columna Motor en las paradas',
    /'#', 'Hora', 'Duracion', 'Motor'/.test(src));
ok('informe del recorrido: KPI de paradas con motor apagado',
    /Paradas con motor apagado|filter\(\(p\) => p\.motor === 'off'\)\.length, 'Con motor apagado'/.test(src));

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
