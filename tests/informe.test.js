/*
 * Pruebas de los reportes generados (PDF operativo, recorrido y CSV).
 * Comprueba que cada dato lleva fecha/hora y coordenadas, y que los
 * helpers de formato funcionan (rxFechaHora/rxCoord se extraen y ejecutan).
 */
'use strict';

const { src } = require('./_source.js');

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

// Extrae una funcion por nombre contando llaves.
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

// ── Helpers de formato (funcionales) ────────────────────────────────────
let fns = null;
try {
    fns = new Function(extraer('rxFechaHora') + '\n' + extraer('rxCoord') +
        '\nreturn { rxFechaHora: rxFechaHora, rxCoord: rxCoord };')();
} catch (e) { fns = null; }

ok('rxFechaHora y rxCoord se extraen y evaluan', !!(fns && fns.rxFechaHora && fns.rxCoord));
if (fns) {
    ok('rxFechaHora: timestamp 0 -> "-"', fns.rxFechaHora(0) === '-');
    ok('rxFechaHora: null -> "-"', fns.rxFechaHora(null) === '-');
    const sec = Math.floor(Date.UTC(2026, 0, 2, 8, 30) / 1000);
    const ms = sec * 1000;
    const fs1 = fns.rxFechaHora(sec);
    const fs2 = fns.rxFechaHora(ms);
    ok('rxFechaHora: acepta segundos', /\d{4}/.test(fs1) && fs1.length > 8, fs1);
    ok('rxFechaHora: segundos y ms dan lo mismo', fs1 === fs2, fs1 + ' vs ' + fs2);
    ok('rxFechaHora: con segundos anade :ss', /\d{2}:\d{2}:\d{2}/.test(fns.rxFechaHora(sec, true)), fns.rxFechaHora(sec, true));

    ok('rxCoord: formato lat, lon', fns.rxCoord(20.123456, -100.654321, 5) === '20.12346, -100.65432',
        fns.rxCoord(20.123456, -100.654321, 5));
    ok('rxCoord: null -> "-"', fns.rxCoord(null, 1) === '-');
    ok('rxCoord: no finito -> "-"', fns.rxCoord('x', 'y') === '-');
}

// ── Alertas guardan coordenadas ─────────────────────────────────────────
ok('pushAlert guarda lat/lon del aviso', /lat: aLat, lon: aLon/.test(src));
ok('pushAlert resuelve la posicion desde la unidad si falta',
    /if \(\(aLat == null \|\| aLon == null\) && alert\.eco\)/.test(src) && /unitState\(u\)/.test(src));

// ── Reporte PDF operativo ───────────────────────────────────────────────
ok('rxInformeHTML existe', /function rxInformeHTML\(/.test(src));
ok('reporte: avisos con fecha/hora y coordenadas',
    /rxFechaHora\(a\.ts, true\)/.test(src) && /coords\(a\.lat, a\.lon\)/.test(src));
ok('reporte: tabla de unidades con fecha/hora y coordenadas',
    /rxFechaHora\(st\.t\)/.test(src) && /coords\(st\.lat, st\.lon\)/.test(src) && /'Coordenadas'/.test(src));
ok('reporte: sin senal con fecha/hora y coordenadas',
    /rxFechaHora\(x\.st\.t\)/.test(src) && /coords\(x\.st\.lat, x\.st\.lon\)/.test(src));
ok('reporte: geocercas con centro (coordenadas)',
    /centroDeZona\(z\)/.test(src) && /coords\(cen\.lat, cen\.lon\)/.test(src));
ok('reporte: zonas de riesgo con coordenadas', /coords\(cen\[0\], cen\[1\]\)/.test(src));
ok('reporte: indice de contenido', /class="toc"/.test(src));
ok('reporte: incluye el ID de la unidad', /esc\(info\.id == null \? '-' : String\(info\.id\)\)/.test(src));
ok('reporte: CSS con coordenadas monoespaciadas', /td\.mono,\.mono\{font-family/.test(src));

// ── Reporte PDF del recorrido ───────────────────────────────────────────
ok('recorrido: tabla de puntos con fecha/hora y coordenadas',
    /filasPuntos/.test(src) && /coords\(m\.lat, m\.lon\)/.test(src) && /rxFechaHora\(m\.t, true\)/.test(src));
ok('recorrido: muestreo de puntos para no explotar',
    /Math\.ceil\(msgs\.length \/ 400\)/.test(src));

// ── Opciones del reporte del recorrido (checkboxes) ─────────────────────
ok('DEFAULTS declara replayReporte con todas las claves',
    /replayReporte: Object\.freeze\(\{/.test(src) &&
    /mapa: true, kpis: true, paradas: true, eventos: true/.test(src) &&
    /puntos: true, coords: true, soloOff: false/.test(src));
ok('Replay UI: checkboxes de las opciones del reporte',
    /id="rondo-rep-mapa"/.test(src) && /id="rondo-rep-kpis"/.test(src) &&
    /id="rondo-rep-paradas"/.test(src) && /id="rondo-rep-eventos"/.test(src) &&
    /id="rondo-rep-puntos"/.test(src) && /id="rondo-rep-coords"/.test(src) &&
    /id="rondo-rep-solooff"/.test(src));
ok('helper rxReplayReporteOpts existe y normaliza defaults',
    /function rxReplayReporteOpts\(/.test(src) && /c\[k\] === undefined\) \? def\[k\] : !!c\[k\]/.test(src));
ok('helper rxReplayOpcionesSync marca los checkboxes',
    /function rxReplayOpcionesSync\(/.test(src) && /el\.checked = !!o\[map\[id\]\]/.test(src));
ok('bindings: guardan las opciones en la config',
    /APP\.config\.replayReporte = Object\.assign\(\{\}, APP\.config\.replayReporte, \{ \[par\[1\]\]: !!el\.checked \}\)/.test(src) &&
    /writeJSON\(LS\.cfg, APP\.config\)/.test(src));
ok('rxReplayPintar sincroniza las opciones', /function rxReplayPintar\(\) \{\s*const r = RX_REPLAY;\s*rxReplayOpcionesSync\(\)/.test(src));
ok('reporte respeta las opciones (mapa/kpis/paradas/eventos/puntos)',
    /if \(o\.mapa\) add\('Mapa del recorrido'/.test(src) &&
    /if \(o\.paradas\) add\('Paradas/.test(src) &&
    /if \(o\.eventos\) add\('Eventos/.test(src) &&
    /if \(o\.puntos\) add\('Puntos del recorrido'/.test(src) &&
    /\(o\.kpis \? '<div class="kpis">'/.test(src));
ok('reporte respeta las coordenadas opcionales',
    /if \(o\.coords\) cabParadas\.push\('Coordenadas'\)/.test(src) &&
    /if \(o\.coords\) cabEventos\.push\('Coordenadas'\)/.test(src) &&
    /if \(o\.coords\) cabPuntos\.push\('Coordenadas'\)/.test(src));
ok('reporte respeta "solo paradas con motor apagado"',
    /\.filter\(\(p\) => !o\.soloOff \|\| p\.motor === 'off'\)/.test(src));
ok('CSS de las opciones del reporte', /\.rrc-checks\{display:grid/.test(src) && /\.rrc-chk\{display:flex/.test(src));

// ── CSV ─────────────────────────────────────────────────────────────────
ok('CSV unidades: columna Ultimo (fecha/hora) y Lat/Lon',
    /'Estado', 'Ultimo', 'Ultimo\(min\)'/.test(src) && /'Lat', 'Lon', 'Zona'/.test(src));
ok('CSV avisos: fecha/hora completa y coordenadas',
    /'Fecha y hora', 'Severidad', 'Regla', 'Titulo', 'Detalle', 'Eco', 'Lat', 'Lon'/.test(src));
ok('CSV avisos: cada fila con rxFechaHora y coords',
    /rxFechaHora\(a\.ts, true\), a\.sev, a\.regla, a\.titulo, a\.detalle, a\.eco/.test(src));

// ── Informe Markdown ────────────────────────────────────────────────────
ok('informe Markdown: tabla de unidades con fecha/hora y coords',
    /\| Eco \| Placa \| Estado \| Ultimo reporte \| Velocidad \| Zona \| Coordenadas \|/.test(src));
ok('informe Markdown: tabla de avisos con fecha/hora y coords',
    /\| Fecha y hora \| Severidad \| Regla \| Eco \| Coordenadas \| Titulo \|/.test(src));
ok('informe Markdown: usa rxFechaHora', /rxFechaHora\(Date\.now\(\), true\)/.test(src));

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
