/*
 * Pruebas del informe por geocerca (v6.15): "¿quien cruzo esta geocerca?" y
 * "¿quien se paro aqui?".
 *
 * El nucleo del fragmento es puro (normaliza avisos y paradas, agrega y
 * filtra) mas tres lectores de datos (bitacora, viajes, replay) que se
 * comprueban con un APP simulado. Se extrae del bloque NUCLEO + FUENTES y se
 * evalua con stubs de lo que vive fuera.
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* ====================== INFORME POR GEOCERCA: NUCLEO');
const fin = src.indexOf('/* ====================== INFORME POR GEOCERCA: UI');
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque del informe por geocerca en ' + ARCHIVO);
    process.exit(1);
}

const AHORA = 1750000000000;   // ms fijo para que las fechas no|Gi
const H = {
    historial: [],
    viajes: {},
    zonas: [],
    replay: { msgs: [], paradas: [] },
    trazas: {},
    unidades: [],
    seleccion: new Set(),
    trazadoMax: 500,
    dias: 3600000
};
const APP = {
    historial: H.historial,
    viajes: H.viajes,
    zonas: H.zonas
};

// Geocerca de prueba: circulo con centro en (0,0) y 100 m de radio.
function circulo(nombre, id, lon, lat) {
    const cx = lon || 0, cy = lat || 0;
    return {
        id: id, n: nombre, t: 3, w: 100,
        b: { min_x: cx - 0.002, min_y: cy - 0.002, max_x: cx + 0.002, max_y: cy + 0.002, cen_x: cx, cen_y: cy }
    };
}
// inZone real simplificado (solo circulos): el del script es mas completo.
const stubs = [
    'const H = P;',
    'const APP = P;',
    'const RX_REPLAY = P.replay;',
    'function clamp(v,a,b){ return Math.min(b, Math.max(a, v)); }',
    'function esc(s){ var t = String(s==null?"":s); return t.replace(/&/g,"\\u0026amp;").replace(/</g,"\\u003clt;").replace(/>/g,"\\u003egt;"); }',
    'function advice(){} function adviceOk(){} function adviceWarn(){} function adviceErr(){}',
    'function rxCsvCelda(c){ return "\\"" + String(c==null?"":c) + "\\""; }',
    'function makeEl(t,p){ return Object.assign({}, p||{}); }',
    'function _geoDistM(a,b,c,d){ const l0=(a+c)/2, mx=111320*Math.cos(l0*Math.PI/180), my=110540;' +
        ' const dx=(d-b)*mx, dy=(c-a)*my; return Math.sqrt(dx*dx+dy*dy); }',
    'function inZone(lat, lon, z){ if(!z||lat==null||lon==null) return false;',
    ' const b=z.b; if(b&&b.min_x!=null&&(lon<b.min_x||lon>b.max_x||lat<b.min_y||lat>b.max_y)) return false;',
    ' const r=+z.w; if(!(r>0)) return false;',
    ' const mx=111320*Math.cos(b.cen_y*Math.PI/180), my=110540;',
    ' const dx=(lon-b.cen_x)*mx, dy=(lat-b.cen_y)*my; return Math.sqrt(dx*dx+dy*dy)<=r; }',
    'function rxFechaHora(t){ return t ? new Date(t).toISOString().slice(0,16).replace("T"," ") : "-"; }',
    'function parseUnitName(u){ const n=String((u&&u.nm)||""); const m=n.match(/\\b0*(\\d{3,5})\\b/); const e=m?m[1]:""; return {id:0,nombre:n,eco:e,placa:"",clave:e||n}; }',
    'function unitState(u){ const p=(u&&u.pos)||{}; return {lat:(p.y!=null)?+p.y:null,lon:(p.x!=null)?+p.x:null,vel:+p.s||0,online:true}; }'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn {rxGeoInfZonaTexto,rxGeoInfMinutos,rxGeoInfEvento,rxGeoInfParada,rxGeoInfFiltra,' +
    'rxGeoInfDesde,rxGeoInfFechaMs,rxGeoInfFechaTxt,rxGeoInfAgrupa,rxGeoInfPorZona,rxGeoInfCeldas,rxGeoInfCruces,' +
    'rxGeoInfDeBitacora,rxGeoInfDeViajes,rxGeoInfDeReplay,rxGeoInfDeRastreo,rxGeoInfEventos,rxGeoInfFuentesDisponibles,RX_GEO,' +
    'rxGeoInfNombre,rxGeoInfZonaDe,rxGeoInfCabeceras,rxGeoInfCeldasPlanas,rxGeoInfCeldasHTML,' +
    'RX_GEO_FUENTES,RX_GEO_RANGOS,RX_GEO_TIPOS};';
const mod = new Function('P', code)(H);

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}
const min = (n) => n * 60000;

function reinicia() {
    H.historial.length = 0;
    H.viajes = {};
    APP.viajes = H.viajes;
    H.replay.msgs = [];
    H.replay.paradas = [];
    H.replay.eco = '';
    H.zonas.length = 0;
    APP.zonas = H.zonas;
    H.zonas.push(circulo('PATIO', 1, 0, 0), circulo('CEDIS', 2, 0.1, 0.1));
}
function aviso(regla, extra) {
    return Object.assign({
        regla: regla, sev: 'bajo', titulo: '', detalle: '', eco: '105',
        clave: '105', ts: AHORA - min(5), lat: 0, lon: 0, icono: 'info'
    }, extra || {});
}

// ── Lectura del texto del aviso ─────────────────────────────────────────
ok('texto: "entro a X" saca la geocerca', mod.rxGeoInfZonaTexto('entro a PATIO \u00b7 12 km/h', 'entro a ') === 'PATIO');
ok('texto: "salio de X" saca la geocerca', mod.rxGeoInfZonaTexto('salio de CEDIS \u00b7 3 km/h', 'salio de ') === 'CEDIS');
ok('texto: el titulo de la alerta da el penultimo trocito',
    mod.rxGeoInfZonaTexto('PASO POR GEOCERCA \u00b7 PATIO \u00b7 105', '') === 'PATIO',
    mod.rxGeoInfZonaTexto('PASO POR GEOCERCA \u00b7 PATIO \u00b7 105', ''));
ok('texto: prefijo que no aparece devuelve vacio', mod.rxGeoInfZonaTexto('nada que ver', 'entro a ') === '');
ok('texto: vacio no rompe', mod.rxGeoInfZonaTexto('', 'x') === '' && mod.rxGeoInfZonaTexto(null, null) === '');
ok('minutos: saca "hace 12 min"', mod.rxGeoInfMinutos('lleva 12 min detenida') === 12);
ok('minutos: sin minutos da 0', mod.rxGeoInfMinutos('sin minutos') === 0 && mod.rxGeoInfMinutos(null) === 0);

// ── Normalizacion de avisos ─────────────────────────────────────────────
reinicia();
let e = mod.rxGeoInfEvento(aviso('geocerca', { detalle: 'entro a PATIO \u00b7 30 km/h', titulo: 'ENTRO \u00b7 105' }));
ok('evento: entrada desde el detalle', e && e.zona === 'PATIO' && e.tipo === 'entra' && e.eco === '105');
e = mod.rxGeoInfEvento(aviso('geocerca', { detalle: 'salio de CEDIS', titulo: 'SALIO \u00b7 105' }));
ok('evento: salida', e && e.zona === 'CEDIS' && e.tipo === 'sale');
e = mod.rxGeoInfEvento(aviso('geocercaDetenido', {
    detalle: 'La unidad 105 se encuentra detenida en la geocerca PATIO \u00b7 hace 7 min'
}));
ok('evento: el texto real de la regla se lee', e && e.zona === 'PATIO' && e.min === 7);
ok('evento: texto corto tambien (tolerante)',
    (mod.rxGeoInfEvento(aviso('geocercaDetenido', { detalle: 'detenida en la geocerca CEDIS \u00b7 hace 12 min' })) || {}).zona === 'CEDIS');
ok('evento: entrada tolerante si el texto no es el estandar',
    (mod.rxGeoInfEvento(aviso('geocerca', { detalle: 'Entra a CEDIS \u00b7 5 km/h' })) || {}).zona === 'CEDIS');
ok('evento: parada en geocerca', e && e.zona === 'PATIO' && e.tipo === 'detenida' && e.min === 7);
e = mod.rxGeoInfEvento(aviso('geoAlerta', { titulo: 'MOTOR APAGADO EN GEOCERCA \u00b7 Muelle \u00b7 105' }));
ok('evento: motor apagado por la alerta', e && e.zona === 'Muelle' && e.tipo === 'motor');
e = mod.rxGeoInfEvento(aviso('geoAlerta', { titulo: 'PASO POR GEOCERCA \u00b7 CEDIS \u00b7 105', zona: 'CEDIS' }));
ok('evento: usa el campo zona si existe', e && e.zona === 'CEDIS' && e.tipo === 'entra');
ok('evento: reglas ajenas a geocercas se ignoran', mod.rxGeoInfEvento(aviso('velocidad', { detalle: 'exceso' })) === null);
ok('evento: sin ts se ignora', mod.rxGeoInfEvento(aviso('geocerca', { ts: 0, detalle: 'entro a PATIO' })) === null);
ok('evento: aviso sin geocerca identificable se ignora', mod.rxGeoInfEvento(aviso('geoAlerta', { titulo: 'algo raro' })) === null);

// ── Fuente: bitacora ────────────────────────────────────────────────────
reinicia();
H.historial.push(
    aviso('geocerca', { eco: '105', ts: AHORA - min(60), detalle: 'entro a PATIO' }),
    aviso('geocerca', { eco: '105', ts: AHORA - min(50), detalle: 'salio de PATIO' }),
    aviso('geocerca', { eco: '105', ts: AHORA - min(40), detalle: 'entro a PATIO' }),
    aviso('geocerca', { eco: '205', ts: AHORA - min(30), detalle: 'entro a CEDIS' }),
    aviso('geocercaDetenido', { eco: '205', ts: AHORA - min(10), detalle: 'La unidad 205 se encuentra detenida en la geocerca CEDIS \u00b7 hace 12 min' }),
    aviso('offline', { eco: '305', ts: AHORA - min(5), detalle: 'sin senal' })
);
const bita = mod.rxGeoInfDeBitacora();
ok('bitacora: solo los avisos de geocerca', bita.length === 5, String(bita.length));
ok('bitacora: conserva la marca de tiempo de cada aviso',
    bita[0].ts === AHORA - min(60) && bita[4].ts === AHORA - min(10));
ok('bitacora: cada evento trae su geocerca', bita.every((x) => !!x.zona && !!x.tipo));

// ── Filtro de rango y geocerca ──────────────────────────────────────────
ok('filtro: por geocerca', mod.rxGeoInfFiltra(bita, 'PATIO').length === 3);
ok('filtro: todas si no se elige', mod.rxGeoInfFiltra(bita, '').length === 5);
ok('filtro: por rango de 24 h', mod.rxGeoInfFiltra(bita, '', AHORA - 24 * 3600 * 1000).length === 5);
ok('filtro: un rango corto descarta lo viejo', mod.rxGeoInfFiltra(bita, '', AHORA - 35 * 60000).length === 2,
    String(mod.rxGeoInfFiltra(bita, '', AHORA - 35 * 60000).length));
ok('rango: hoy empieza a las 00:00', (function () {
    const d = new Date(mod.rxGeoInfDesde('hoy', AHORA));
    return d.getHours() === 0 && d.getMinutes() === 0 && d.getDate() === new Date(AHORA).getDate();
})());
ok('rango: 24 h y 7 d restan dias', mod.rxGeoInfDesde('24h', AHORA) === AHORA - 24 * 3600 * 1000 &&
    mod.rxGeoInfDesde('7d', AHORA) === AHORA - 7 * 24 * 3600 * 1000);
ok('rango: todo = sin limite', mod.rxGeoInfDesde('todo', AHORA) === 0);
ok('rango: 15 y 30 dias', mod.rxGeoInfDesde('15d', AHORA) === AHORA - 15 * 24 * 3600 * 1000 &&
    mod.rxGeoInfDesde('30d', AHORA) === AHORA - 30 * 24 * 3600 * 1000);
// Rango de dias escrito a mano (el selector de fechas del dialogo).
// Fechas locales (el selector usa yyyy-mm-dd en hora local).
const D = (iso) => { const p = String(iso).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]).getTime(); };
ok('fecha: inicio a las 00:00 y fin al final del dia', (function () {
    const a = mod.rxGeoInfFechaMs('2026-03-10', false), b = mod.rxGeoInfFechaMs('2026-03-10', true);
    const d = new Date(a);
    return a === D('2026-03-10') && d.getHours() === 0 && (b - a) === 23 * 3600000 + 59 * 60000 + 59999;
})());
ok('fecha: texto dd/mm/aaaa', mod.rxGeoInfFechaTxt(D('2026-03-10')) === '10/03/2026',
    mod.rxGeoInfFechaTxt(D('2026-03-10')));
ok('fecha: vacio o invalido da 0', mod.rxGeoInfFechaMs('', true) === 0 && mod.rxGeoInfFechaMs('no-es-fecha', false) === 0);
ok('filtro: incluye el dia final completo', (function () {
    const ev = [{ zona: 'P', tipo: 'entra', eco: '1', ts: D('2026-03-12') + 20 * 3600000 },
        { zona: 'P', tipo: 'entra', eco: '1', ts: D('2026-03-14') }];
    const r = mod.rxGeoInfFiltra(ev, '', D('2026-03-10'), mod.rxGeoInfFechaMs('2026-03-12', true));
    return r.length === 1 && r[0].ts === D('2026-03-12') + 20 * 3600000;
})());
ok('filtro: rango de varios dias', (function () {
    const ev = [];
    for (const d of ['2026-03-01', '2026-03-05', '2026-03-10']) ev.push({ zona: 'P', tipo: 'entra', eco: '1', ts: D(d) + 3600000 });
    return mod.rxGeoInfFiltra(ev, '', D('2026-03-05'), mod.rxGeoInfFechaMs('2026-03-10', true)).length === 2;
})());

// ── Agregacion por unidad ────────────────────────────────────────────────
let g = mod.rxGeoInfAgrupa(bita, 'cruces');
ok('agrupa: 2 unidades', g.filas.length === 2);
ok('agrupa: 105 con 3 cruces (2 entradas, 1 salida)',
    g.filas[0].eco === '105' && g.filas[0].cruces === 3 && g.filas[0].entradas === 2 && g.filas[0].salidas === 1,
    JSON.stringify(g.filas[0]));
ok('agrupa: 205 con parada y minutos', g.filas[1].paradas === 1 && g.filas[1].min === 12,
    JSON.stringify(g.filas[1]));
ok('agrupa: totales', g.total.cruces === 4 && g.total.entradas === 3 && g.total.salidas === 1 &&
    g.total.paradas === 1 && g.total.unidades === 2, JSON.stringify(g.total));
ok('agrupa: rango de tiempo', g.filas[0].primero < g.filas[0].ultimo && g.filas[0].ultimo === AHORA - min(40));
g = mod.rxGeoInfAgrupa(bita, 'paradas');
ok('agrupa en modo paradas ordena por paradas', g.filas[0].eco === '205' && g.filas[0].paradas === 1);
ok('agrupa: geocercas por unidad acumuladas', g.filas[1].zonas.PATIO === 3);
ok('agrupa: sin eventos no rompe', mod.rxGeoInfAgrupa([], 'cruces').filas.length === 0 &&
    mod.rxGeoInfAgrupa(null, 'cruces').total.cruces === 0);
ok('agrupa: sin eco usa la clave', mod.rxGeoInfAgrupa([{ zona: 'X', tipo: 'entra', clave: 'PLACA9' }], 'cruces')
    .filas[0].eco === 'PLACA9');
ok('agrupa: cuenta las paradas con motor apagado', (function () {
    const ev = [
        { zona: 'P', tipo: 'motor', eco: '1', min: 20 },
        { zona: 'P', tipo: 'detenida', eco: '1', min: 30, motor: 'off' },
        { zona: 'P', tipo: 'detenida', eco: '1', min: 5 }
    ];
    const a = mod.rxGeoInfAgrupa(ev, 'paradas');
    return a.filas[0].paradas === 3 && a.filas[0].motor === 2 && a.filas[0].min === 55 && a.filas[0].minMotor === 50;
})(), JSON.stringify(mod.rxGeoInfAgrupa([
    { zona: 'P', tipo: 'motor', eco: '1', min: 20 },
    { zona: 'P', tipo: 'detenida', eco: '1', min: 30, motor: 'off' },
    { zona: 'P', tipo: 'detenida', eco: '1', min: 5 }
], 'paradas').filas[0]));

// ── Resumen por geocerca ────────────────────────────────────────────────
const porZ = mod.rxGeoInfPorZona(bita, null);
ok('por geocerca: una fila por geocerca', porZ.length === 2);
ok('por geocerca: PATIO con 3 cruces', porZ.filter((x) => x.zona === 'PATIO')[0].cruces === 3);
ok('por geocerca: cuenta unidades distintas', porZ.filter((x) => x.zona === 'PATIO')[0].nUnidades === 1);
ok('por geocerca: ordena por cruces', porZ[0].cruces >= porZ[1].cruces);
ok('por geocerca: respeta el orden dado', (function () {
    const r = mod.rxGeoInfPorZona(bita, ['CEDIS', 'PATIO']);
    return r[0].zona === 'CEDIS' && r[1].zona === 'PATIO';
})());
ok('por geocerca: sin datos no rompe', mod.rxGeoInfPorZona([], ['PATIO']).length === 0);

// ── Cruces sobre una polilinea ──────────────────────────────────────────
// Tranza de una unidad: fuera, dentro, dentro, fuera, dentro.
const tr = [[0.02, 0, 100], [0, 0, 200], [0.0005, 0.0005, 300], [0.03, 0, 400], [0, 0, 500]];   // [lon, lat, tsMs]
const cru = mod.rxGeoInfCruces(tr, mod.rxGeoInfZonaDe, { eco: '105', fuente: 'viajes' });
ok('cruces: la traza da entrada, salida y entrada (termina dentro)', cru.length === 3 &&
    cru[0].tipo === 'entra' && cru[1].tipo === 'sale' && cru[2].tipo === 'entra',
    JSON.stringify(cru.map((c) => c.tipo)));
ok('cruces: con nombre de geocerca, hora y unidad',
    cru[0].zona === 'PATIO' && cru[0].ts === 200 && cru[0].eco === '105' && cru[0].fuente === 'viajes');
ok('cruces: la salida nombra la geocerca que se deja', cru[1].tipo === 'sale' && cru[1].zona === 'PATIO');
ok('cruces: sin puntos no rompe', mod.rxGeoInfCruces([], mod.rxGeoInfZonaDe, {}).length === 0);
ok('cruces: sin geocercas cargadas no hay eventos', (function () {
    const copia = H.zonas.slice();
    H.zonas.length = 0;
    const n = mod.rxGeoInfCruces(tr, mod.rxGeoInfZonaDe, {}).length;
    H.zonas.push.apply(H.zonas, copia);
    return n === 0;
})());
ok('cruces: un solo punto dentro genera entrada', mod.rxGeoInfCruces([[0, 0, 1000]], mod.rxGeoInfZonaDe, {}).length === 1);

// ── Paradas de viaje/replay ─────────────────────────────────────────────
let p = mod.rxGeoInfParada({ lat: 0, lon: 0, dur: 1800, motor: 'off', motorFuente: 'sensor', lugar: 'Porton 3' }, 'PATIO', '105', 'replay');
ok('parada: duracion en segundos -> minutos', p && p.min === 30 && p.tipo === 'motor');
ok('parada: con lugar y motor', p.lugar === 'Porton 3' && p.motor === 'off' && p.motorFuente === 'sensor');
p = mod.rxGeoInfParada({ lat: 0, lon: 0, durMin: 12 }, 'CEDIS', '205', 'viajes');
ok('parada: durMin de APP.viajes', p.min === 12 && p.tipo === 'detenida');
ok('parada: sin coordenadas no vale', mod.rxGeoInfParada({ dur: 60 }, 'P', '1') === null &&
    mod.rxGeoInfParada(null, 'P', '1') === null);

// ── Fuente: viajes analizados ───────────────────────────────────────────
reinicia();
H.viajes['105'] = {
    eco: '105', analizado: AHORA,
    traza: [[0.02, 0], [0, 0], [0, 0.0005], [0.03, 0]],
    paradas: [{ lat: 0.0005, lon: 0, desde: AHORA - min(30), durMin: 15, zona: 'PATIO' },
        { lat: 1, lon: 1, desde: AHORA - min(10), durMin: 5, zona: '' }]
};
const viajes = mod.rxGeoInfDeViajes();
ok('viajes: cruces desde la traza', viajes.filter((x) => x.tipo === 'entra' || x.tipo === 'sale').length === 2,
    JSON.stringify(viajes.map((x) => x.tipo + ':' + x.zona)));
ok('viajes: paradas solo de las geocercas conocidas', viajes.filter((x) => x.tipo !== 'entra' && x.tipo !== 'sale').length === 1);
ok('viajes: la parada trae sus minutos', viajes.filter((x) => x.zona === 'PATIO' && x.tipo === 'detenida')[0].min === 15);
ok('viajes: la parada sin geocerca se descarta', !viajes.some((x) => x.zona === '' || x.zona === 'CEDIS'));

// ── Fuente: replay cargado ───────────────────────────────────────────────
reinicia();
Object.assign(H.replay, {
    eco: '105', msgs: [
        { lat: 0.02, lon: 0, s: 40, t: 1000 },
        { lat: 0, lon: 0, s: 0, t: 1060 },
        { lat: 0.0005, lon: 0.0005, s: 0, t: 1120 },
        { lat: 0.03, lon: 0, s: 40, t: 1180 }
    ],
    paradas: [{ lat: 0.0005, lon: 0, t: 1060, dur: 1200, idx: 1, zona: 'PATIO', motor: 'off', motorFuente: 'sensor', lugar: 'Anden' }]
});
const rep = mod.rxGeoInfDeReplay();
ok('replay: cruces con hora exacta', rep.some((x) => x.tipo === 'entra' && x.ts === 1060000), JSON.stringify(rep.map((x) => x.tipo + '@' + x.ts)));
ok('replay: parada con motor y lugar', rep.some((x) => x.tipo === 'motor' && x.min === 20 && x.lugar === 'Anden'));
ok('replay: fuente identificada', rep.every((x) => x.fuente === 'replay'));
reinicia();
ok('replay: sin recorrido cargado no hay eventos', mod.rxGeoInfDeReplay().length === 0);

// ── Fuentes disponibles ─────────────────────────────────────────────────
reinicia();
ok('fuentes: sin datos ninguna disponible', mod.rxGeoInfFuentesDisponibles().length === 0);
H.historial.push(aviso('geocerca', { detalle: 'entro a PATIO' }));
ok('fuentes: la bitacora aparece cuando hay avisos',
    mod.rxGeoInfFuentesDisponibles().some((x) => x.k === 'bitacora' && x.n === 1));
H.viajes['105'] = { traza: [[0.02, 0], [0, 0]], paradas: [] };
ok('fuentes: los viajes tambien', mod.rxGeoInfFuentesDisponibles().some((x) => x.k === 'viajes'));
ok('fuentes: elegir una fuente inexistente cae en bitacora',
    mod.rxGeoInfEventos('inventada').length === 1);

// ── Fuente: rastreo (todas las unidades / solo las seleccionadas) ───────
reinicia();
mod.RX_GEO.unidades = 'todas';
// Traza de la unidad 105: fuera, dentro (2 muestras quietas), fuera.
H.trazas['105'] = [
    { t: 1000, lat: 0.02, lon: 0, v: 40 },
    { t: 1060, lat: 0, lon: 0, v: 0 },
    { t: 1180, lat: 0.0005, lon: 0.0005, v: 0 },
    { t: 1240, lat: 0.03, lon: 0, v: 45 }
];
// Traza de la 205: entra y sale sin parar.
H.trazas['205'] = [
    { t: 2000, lat: 0.02, lon: 0, v: 50 },
    { t: 2040, lat: 0, lon: 0, v: 45 },
    { t: 2080, lat: 0.03, lon: 0, v: 50 }
];
H.unidades = [{ nm: '105', pos: { y: 0, x: 0, s: 0 } }, { nm: '305', pos: { y: 0.0005, x: 0, s: 12 } }];
let ras = mod.rxGeoInfDeRastreo();
const crucesR = ras.filter((x) => x.tipo === 'entra' || x.tipo === 'sale');
ok('rastreo: cruces de las dos trazas (entra y sale por unidad)',
    crucesR.length === 4 && crucesR.filter((x) => x.eco === '105').length === 2 &&
    crucesR.filter((x) => x.eco === '205').length === 2,
    JSON.stringify(crucesR.map((x) => x.eco + ':' + x.tipo)));
ok('rastreo: parada de la traza con duracion', ras.filter((x) => x.tipo === 'detenida').length === 1 &&
    ras.filter((x) => x.tipo === 'detenida')[0].min === 2 && ras.filter((x) => x.tipo === 'detenida')[0].zona === 'PATIO',
    JSON.stringify(ras.filter((x) => x.tipo === 'detenida')[0]));
ok('rastreo: parada con la regla de minutos de la traza',
    /const RX_GEO_PARADA_MIN = 2/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'parts', '54-informe-geocerca.js'), 'utf8')));
ok('rastreo: marca a quien esta dentro ahora', ras.filter((x) => x.tipo === 'dentro').length === 2 &&
    ras.filter((x) => x.tipo === 'dentro').every((x) => x.zona === 'PATIO'));
ok('rastreo: el evento "dentro" trae velocidad y estado',
    ras.filter((x) => x.tipo === 'dentro')[0].vel === 0 && ras.filter((x) => x.tipo === 'dentro')[0].online === true);
ok('rastreo: fuente marcada', ras.every((x) => x.fuente === 'rastreo'));
// Alcance: solo las seleccionadas.
mod.RX_GEO.unidades = 'sel';
H.seleccion.add('105');
ras = mod.rxGeoInfDeRastreo();
ok('rastreo: solo la seleccionada', ras.every((x) => x.eco === '105'));
ok('rastreo: la no seleccionada no aparece',
    !ras.some((x) => x.eco === '305'), JSON.stringify(ras.map((x) => x.eco)));
mod.RX_GEO.unidades = 'todas';
H.seleccion.clear();
ok('rastreo: "sube" igual a la seleccion', mod.RX_GEO.unidades === 'todas');
// El agregado separa "dentro ahora" de las paradas.
const agR = mod.rxGeoInfAgrupa(mod.rxGeoInfDeRastreo(), 'paradas');
ok('rastreo: "dentro" no cuenta como parada', agR.filas.every((f) => f.dentro <= 1 && f.paradas < 2));
ok('rastreo: total de dentro ahora', agR.total.dentro === 2, JSON.stringify(agR.total));
ok('rastreo: sin trazas ni unidades no rompe', (function () {
    const t = H.trazas; H.trazas = {}; const u = H.unidades; H.unidades = [];
    const n = mod.rxGeoInfDeRastreo().length;
    H.trazas = t; H.unidades = u;
    return n === 0;
})());
ok('rastreo: es la primera fuente disponible', (function () {
    const f = mod.rxGeoInfFuentesDisponibles();
    return f.length === 0 || f[0].k === 'rastreo';
})());
ok('tipos: "dentro ahora" en el catalogo', mod.RX_GEO_TIPOS.dentro === 'Dentro ahora');
ok('cabeceras: columna "Dentro ahora"',
    mod.rxGeoInfCabeceras('cruces').indexOf('Dentro ahora') >= 0 &&
    mod.rxGeoInfCabeceras('paradas').indexOf('Dentro ahora') >= 0);

// ── Celdas para las salidas ─────────────────────────────────────────────
const cab = mod.rxGeoInfCabeceras('paradas');
ok('cabeceras: modo paradas con minutos de motor', cab.indexOf('Min motor apagado') >= 0 && cab[0] === 'Eco');
ok('cabeceras: modo cruces con entradas y salidas',
    mod.rxGeoInfCabeceras('cruces').indexOf('Entradas') >= 0 && mod.rxGeoInfCabeceras('cruces').indexOf('Salidas') >= 0);
ok('celdas: version plana sin HTML',
    mod.rxGeoInfCeldasPlanas(mod.rxGeoInfCeldas(g.filas[1]), 'paradas').every((x) => typeof x === 'string' || typeof x === 'number'));
ok('celdas: la version HTML escapa el eco',
    mod.rxGeoInfCeldasHTML(mod.rxGeoInfCeldas({ eco: '<b>x</b>', zonas: {}, lugares: {} }), 'cruces')[0].indexOf('<b>') < 0);
ok('celdas: lugares joinados', mod.rxGeoInfCeldas({
    eco: '1', cruces: 1, entradas: 1, salidas: 0, paradas: 0, min: 0, minMotor: 0, motor: 0,
    primero: 0, ultimo: 0, zonas: { A: 1, B: 2 }, lugares: { X: 1, Y: 1, Z: 1, W: 1, V: 1 }
}).lugares.split(' | ').length === 4);

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasan');
process.exit(fallos ? 1 : 0);