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
ok('informe del recorrido: rango con fecha y hora', /rxFechaHora\(r\.desde \|\| s\.inicio\)/.test(src));
ok('informe del recorrido: columna Fecha y hora + Motor en las paradas',
    /'#', 'Fecha y hora', 'Duracion', 'Motor'/.test(src));
ok('informe del recorrido: KPI de paradas con motor apagado',
    /filter\(\(p\) => p\.motor === 'off'\)\.length, 'Motor apagado'/.test(src));
// v6.11: fecha/hora y coordenadas por dato + puntos del recorrido.
ok('informe del recorrido: filas con fecha/hora y coordenadas',
    /rxFechaHora\(p\.t, true\)/.test(src) && /coords\(p\.lat, p\.lon\)/.test(src) && /coords\(e2\.lat, e2\.lon\)/.test(src));
ok('informe del recorrido: seccion Puntos del recorrido',
    /seccion\('4\. Puntos del recorrido'/.test(src) && /filasPuntos/.test(src));
ok('informe del recorrido: KPI de Puntos',
    /kpi\(\(r\.msgs \|\| \[\]\)\.length, 'Puntos'\)/.test(src));

// 9) Apariencia: la pestaña se organiza en tarjetas con jerarquia clara.
const nCards = (src.match(/class="rondo-replay-card"/g) || []).length;
ok('replay: tarjetas de seccion (consulta, mapa, reproduccion, listas)', nCards >= 4, 'n=' + nCards);
ok('replay: campos de rango etiquetados (Desde / Hasta)',
    /class="rrc-field"><span class="rrc-lbl">Desde<\/span>/.test(src) &&
    /class="rrc-field"><span class="rrc-lbl">Hasta<\/span>/.test(src));
ok('replay: titulos de seccion', /class="rrc-title">Unidad y rango</.test(src) &&
    /class="rrc-title">Mapa del recorrido</.test(src) && /class="rrc-title">Reproduccion</.test(src));
ok('replay: indicador de tiempo actual/total',
    /id="rondo-replay-tiempo"/.test(src) && /rxReplayHHMM\(m\.t\) \+ ' \/ ' \+ rxReplayHHMM\(finM/.test(src));
ok('replay: el boton Play conserva el icono (span .rrc-play-txt)',
    /class="rrc-play-txt"/.test(src) && /querySelector\('\.rrc-play-txt'\)/.test(src));
ok('replay: el boton Play marca el estado activo', /pb\.classList\.toggle\('activo', !!playing\)/.test(src));
ok('replay: ya no se usa la antigua barra .rondo-replay-bar', src.indexOf('rondo-replay-bar') < 0);
ok('replay: estado vacio del mapa con icono',
    /rondo-replay-vacio"><span class="rondo-usym rv-ico">/.test(src));
ok('replay: estilos de tarjeta/campos/tiempo en el CSS',
    /\.rondo-replay-card\{display:flex/.test(src) && /\.rrc-range\{display:grid/.test(src) &&
    /\.rrc-time\{/.test(src) && /\.rrc-field\{/.test(src));
ok('replay: rango y acciones a una columna en paneles estrechos',
    /\.rrc-range,#rondo-panel \.rrc-actions\{grid-template-columns:1fr\}/.test(src));

// 10) v6.9.1: botones de Cargar y Play/Pausa mejorados.
ok('replay: helper rxReplaySetPlayBtn existe', /function rxReplaySetPlayBtn\(/.test(src));
ok('replay: el boton Play cambia el icono (play/pause)',
    /rrc-play-ico/.test(src) && /ico\.innerHTML = playing \? UIS\.pause : UIS\.play/.test(src));
ok('replay: helpers de iconos play y pause existen',
    /\bplay: \['M765\.7 486\.8/.test(src) && /\bpause: \['M304 176h80v672h-80z/.test(src));
ok('replay: helper rxReplaySetControles habilita/deshabilita',
    /function rxReplaySetControles\(/.test(src) && /pb\.disabled = !on/.test(src) && /rb\.disabled = !on/.test(src));
ok('replay: el boton Play arranca deshabilitado', /id="rondo-replay-play" title="Reproducir o pausar" disabled/.test(src));
ok('replay: boton Reiniciar existe y arranca deshabilitado',
    /id="rondo-replay-reiniciar"[\s\S]{0,120}disabled/.test(src));
ok('replay: reiniciar vuelve al inicio', /reiniciar\.addEventListener\('click'[\s\S]{0,160}rxReplayIrA\(0\)/.test(src));
ok('replay: barra espaciadora = Play/Pausa en la tab replay',
    /APP\.tab !== 'replay'[\s\S]{0,400}e\.key === ' '[\s\S]{0,300}rxReplayAlternar\(\)/.test(src));
ok('replay: linea de estado del recorrido', /id="rondo-replay-estado"/.test(src) && /function rxReplayEstado\(/.test(src));
ok('replay: el boton Cargar usa etiqueta "Cargando..." al ocuparse',
    /setBusy\(btn, true, 'Cargando\.\.\.'\)/.test(src));
ok('replay: setBusy acepta etiqueta opcional', /function setBusy\(btn, on, label\)/.test(src) && /rondo-busy-lbl/.test(src));
ok('replay: el boton Cargar pasa a "Recargar" tras cargar', /t\.textContent = 'Recargar recorrido'/.test(src));
ok('replay: limpiar no rompe el icono del Play (usa el helper)',
    /function rxReplayLimpiar\([\s\S]{0,2000}rxReplaySetPlayBtn\(false, false\)/.test(src));
ok('replay: CSS de estado y controles',
    /\.rrc-estado\{font-size:11px/.test(src) && /\.rrc-play\{min-width:104px/.test(src) &&
    /\.rrc-btn-ico:disabled/.test(src));

// 11) v6.9.2: los .accbtn del panel comparten la base de boton primario.
ok('replay: base de boton primario .accbtn dentro del panel',
    /#rondo-panel button\.accbtn\{display:inline-flex[\s\S]{0,240}accent-grad/.test(src));
ok('replay: .accbtn del panel con hover/active/disabled',
    /#rondo-panel button\.accbtn:hover:not\(:disabled\)/.test(src) &&
    /#rondo-panel button\.accbtn:active:not\(:disabled\)/.test(src) &&
    /#rondo-panel button\.accbtn:disabled/.test(src));
ok('replay: Play activo se distingue con halo',
    /#rondo-panel #rondo-replay-play\.activo\{box-shadow/.test(src));

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
