/*
 * Pruebas de la "Alerta de geocercas" (v6.12): seleccion de geocercas,
 * alcance (vigiladas / toda la flota), gravedad y disparador (solo paso,
 * detenida o detenida con el motor apagado).
 *
 * El bloque es puro: se extrae desde el banner NUCLEO hasta el de la UI y se
 * evalua con stubs de lo que vive fuera (inZone, norm, clamp, pushAlert,
 * velSuavizada...). El estado compartido (reloj, APP, avisos, geocercas y
 * unidades) viaja en el objeto H que se pasa a la funcion evaluada.
 *
 * Se comprueba la maquina de estados por geocerca, la histeresis de entrada,
 * el rearme al salir, la deteccion de motor (sensor y estimada), el cooldown,
 * la regla completa y el alcance vigiladas / toda la flota.
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* ====================== ALERTA DE GEOCERCAS: NUCLEO');
const fin = src.indexOf('/* ====================== ALERTA DE GEOCERCAS: UI');
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de la alerta de geocercas en ' + ARCHIVO);
    process.exit(1);
}

// ── Estado compartido por los stubs y por el test ────────────────────────
const H = {
    reloj: 1000000,                                  // segundos
    alertas: [],
    sesiones: [],
    zonas: [
        { id: 1, n: 'PATIO', t: 3, w: 200, b: { min_x: -0.002, min_y: -0.002, max_x: 0.002, max_y: 0.002, cen_x: 0, cen_y: 0 } },
        { id: 2, n: 'CEDIS', t: 3, w: 100, b: { min_x: 0.099, min_y: 0.099, max_x: 0.101, max_y: 0.101, cen_x: 0.1, cen_y: 0.1 } }
    ],
    unidades: {
        105: { nm: '105', pos: { y: 0, x: 0, s: 0, t: 1000000 } },       // vigilada, en PATIO
        205: { nm: '205', pos: { y: 0.1, x: 0.1, s: 0, t: 1000000 } },     // vigilada, en CEDIS
        305: { nm: '305', pos: { y: 0.0005, x: 0, s: 0, t: 1000000 } }    // NO vigilada, en PATIO
    },
    APP: {
        config: { loadZones: true, pollMs: 10000, reglas: { geoAlerta: false }, geoAlertas: {} },
        zonas: [],
        unidades: [],
        velSuave: {},
        velSuaveTs: {},
        cooldowns: {},
        memo: {},
        memoGeoAlerta: {},
        geoAlertaVivo: {},
        seleccion: new Set(['105', '205']),
        watchAll: false,
        unlocked: false
    }
};

// ── Reloj controlado: la regla fecha los episodios con Date.now() ────────
const realNow = Date.now;
Date.now = () => H.reloj * 1000;

// ── Stubs de lo que vive fuera del bloque ────────────────────────────────
const stubs = [
    'const APP = H.APP;',
    'const ALERTAS = H.alertas;',
    'const SES = H.sesiones;',
    'const UNIDADES = H.unidades;',
    'function clamp(v,a,b){ return Math.min(b, Math.max(a, v)); }',
    'function esc(s){ return String(s==null?"":s).replace(/[&<>"\']/g,""); }',
    'function norm(s){ return (s==null?"":String(s)).normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").toUpperCase().trim(); }',
    'function alphaEMA(dt, tau){ return 1 - Math.exp(-Math.max(0, dt)/Math.max(0.001, tau)); }',
    // inZone real simplificado a circulo + bbox (suficiente para el test).
    'function inZone(lat, lon, z){ if(!z||lat==null||lon==null) return false;' +
        ' const b=z.b; if(b&&b.min_x!=null&&(lon<b.min_x||lon>b.max_x||lat<b.min_y||lat>b.max_y)) return false;' +
        ' const cx=(b&&b.cen_x!=null)?+b.cen_x:null, cy=(b&&b.cen_y!=null)?+b.cen_y:null, r=+z.w;' +
        ' if(cx==null||cy==null||!r) return false;' +
        ' const mx=111320*Math.cos(cy*Math.PI/180), my=110540;' +
        ' const dx=(lon-cx)*mx, dy=(lat-cy)*my; return Math.sqrt(dx*dx+dy*dy)<=r; }',
    'function parseUnitName(u){ const n=String((u&&u.nm)||""); const m=n.match(/\\b0*(\\d{3,5})\\b/); const e=m?m[1]:""; return {id:0,nombre:n,eco:e,placa:"",clave:e||n}; }',
    'function unitState(u){ const p=(u&&u.pos)||{}; const t=Number(p.t)||0; const edadMin=t?(Date.now()/1000-t)/60:Infinity;' +
        ' return {t:t,edadMin:edadMin,online:edadMin<5,vel:Number(p.s)||0,estado:(Number(p.s)||0)>3?"moviendo":"detenida",lat:(p.y!=null)?+p.y:null,lon:(p.x!=null)?+p.x:null}; }',
    'function shouldWatch(u){ if(APP.watchAll) return true; const i=parseUnitName(u); return APP.seleccion.has(i.eco); }',
    'function velSuavizada(info, st){ const v=APP.velSuave[info.clave]; return (v!=null&&isFinite(v))?v:(st.vel||0); }',
    'function zonaRol(z){ return /PATIO/.test(z.n)?"base":"normal"; }',
    'function writeSession(k,v){ SES.push([k,v]); }',
    'function writeJSON(k,v){ SES.push([k,v]); }',
    'function pushAlert(a){ ALERTAS.push(a); }',
    'function adviceOk(){} function adviceWarn(){} function adviceErr(){}',
    'const DEFAULTS = { geoAlertas: Object.freeze({ zonas:"", alcance:"vigiladas", severidad:"medio", disparo:"paso", minMin:2, motorMin:15, estableSeg:20, cooldownS:0 }) };',
    'const LS={cfg:"cfg"}, SS={memo:"memo", geoAlerta:"geoAlerta"};'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn {geoAlertaCfg,geoAlertaNombres,geoAlertaTexto,geoAlertaSel,geoAlertaZonasDe,geoAlertaDentro,' +
    'geoAlertaMotor,geoAlertaEvalua,geoAlertaPermitido,geoAlertaTextoEvento,' +
    'reglaGeoAlerta,geoAlertaFlota,geoAlertaReinicia,geoAlertaPodaVivo,' +
    'GEO_ALERTA_DISPAROS,GEO_ALERTA_SEVS,GEO_ALERTA_SEP,GEO_ALERTA_MARGEN_M,GEO_ALERTA_MAX_ZONAS};';
const mod = new Function('H', code)(H);

const APP = H.APP;
const alertas = H.alertas;
const sesiones = H.sesiones;
const U = H.unidades;
const Z0 = H.zonas[0];

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

// ── Utilidades de prueba ─────────────────────────────────────────────────
function cfgBase(mods) {
    APP.config.reglas.geoAlerta = true;
    APP.config.geoAlertas = Object.assign({
        zonas: 'PATIO', alcance: 'vigiladas', severidad: 'medio',
        disparo: 'paso', minMin: 2, motorMin: 15, estableSeg: 20, cooldownS: 0
    }, mods || {});
}
function reinicia() {
    H.reloj = 1000000;
    alertas.length = 0;
    sesiones.length = 0;
    APP.cooldowns = {};
    APP.memoGeoAlerta = {};
    APP.geoAlertaVivo = {};
    APP.velSuave = {};
    APP.velSuaveTs = {};
    APP.memo = {};
    APP.unidades = [];
    APP.zonas = H.zonas.slice();
}
function infoDe(u) {
    const m = String(u.nm || '').match(/\b0*(\d{3,5})\b/);
    const e = m ? m[1] : '';
    return { id: 0, nombre: String(u.nm || ''), eco: e, placa: '', clave: e || String(u.nm || '') };
}
// Estado de una unidad con el reloj del test (el mismo que devuelve
// unitState en el script, aqui recalculado para poder mover la posicion).
function stDe(u, over) {
    const p = u.pos;
    const edadMin = (Date.now() / 1000 - (Number(p.t) || H.reloj)) / 60;
    return Object.assign({
        t: Number(p.t) || H.reloj, edadMin: edadMin, online: edadMin < 5,
        vel: Number(p.s) || 0, estado: (Number(p.s) || 0) > 3 ? 'moviendo' : 'detenida',
        lat: +p.y, lon: +p.x
    }, over || {});
}
// Un tick del refresco sobre una unidad vigilada (igual que evaluateUnit:
// la regla lee el estado del memo y devuelve el nuevo).
function tick(seg, over, u) {
    H.reloj += seg;
    const info = infoDe(u);
    const R = { geoAlerta: (APP.memo[info.clave] || {}).geoAlerta || null };
    mod.reglaGeoAlerta(u, info, stDe(u, over), R);
    APP.memo[info.clave] = { geoAlerta: R.geoAlerta };
    return R;
}

// ── Configuracion ────────────────────────────────────────────────────────
reinicia();
cfgBase();
let c = mod.geoAlertaCfg();
ok('cfg: activa con la regla encendida', c.activa === true);
ok('cfg: zonas parseadas', c.zonas.length === 1 && c.zonas[0] === 'PATIO', JSON.stringify(c.zonas));
ok('cfg: valores saneados por defecto',
    c.alcance === 'vigiladas' && c.severidad === 'medio' && c.disparo === 'paso' &&
    c.minMin === 2 && c.motorMin === 15 && c.estableSeg === 20 && c.cooldownS === 0);
APP.config.geoAlertas.severidad = 'inventada';
APP.config.geoAlertas.disparo = 'inventado';
APP.config.geoAlertas.alcance = 'inventado';
APP.config.geoAlertas.minMin = 9999;
APP.config.geoAlertas.motorMin = -5;
c = mod.geoAlertaCfg();
ok('cfg: severidad invalida -> medio', c.severidad === 'medio', c.severidad);
ok('cfg: disparador invalido -> paso', c.disparo === 'paso', c.disparo);
ok('cfg: alcance invalido -> vigiladas', c.alcance === 'vigiladas', c.alcance);
ok('cfg: minMin se acota a 240', c.minMin === 240, String(c.minMin));
ok('cfg: motorMin se acota a min 1', c.motorMin === 1, String(c.motorMin));
APP.config.reglas.geoAlerta = false;
ok('cfg: apagada si la regla esta off', mod.geoAlertaCfg().activa === false);
cfgBase();

// ── Serializacion de la seleccion ────────────────────────────────────────
ok('nombres: separa por " | " y dedupe',
    JSON.stringify(mod.geoAlertaNombres('A | B | A | ')) === '["A","B"]',
    JSON.stringify(mod.geoAlertaNombres('A | B | A | ')));
ok('nombres: vacio -> lista vacia',
    mod.geoAlertaNombres('').length === 0 && mod.geoAlertaNombres(null).length === 0);
ok('texto: ida y vuelta', mod.geoAlertaTexto(['A', 'B']) === 'A | B');
ok('texto: respeta el tope de geocercas',
    mod.geoAlertaTexto(new Array(60).fill('X')).split(mod.GEO_ALERTA_SEP).length === mod.GEO_ALERTA_MAX_ZONAS);
APP.config.geoAlertas.zonas = 'PATIO | CEDIS | BORRADA';
ok('zonas: solo las que existen en la plataforma', mod.geoAlertaZonasDe(mod.geoAlertaCfg()).length === 2);
ok('sel: set con la seleccion', mod.geoAlertaSel(mod.geoAlertaCfg()).has('CEDIS') === true);

// ── Pertenencia con margen ───────────────────────────────────────────────
ok('dentro: centro de la geocerca', mod.geoAlertaDentro(Z0, 0, 0, 0) === true);
ok('dentro: fuera de la geocerca', mod.geoAlertaDentro(Z0, 1, 1, 0) === false);
ok('dentro: sin margen el borde cuenta como fuera', mod.geoAlertaDentro(Z0, 0.0021, 0, 0) === false);
ok('dentro: con margen el borde sigue dentro', mod.geoAlertaDentro(Z0, 0.0021, 0, mod.GEO_ALERTA_MARGEN_M) === true);
ok('dentro: coordenadas nulas no rompen', mod.geoAlertaDentro(Z0, null, 0, 40) === false);
ok('dentro: zona sin geometria no truena', mod.geoAlertaDentro({ id: 9, n: 'X' }, 1, 1, 40) === false);

// ── Motor: sensor y estimado ─────────────────────────────────────────────
ok('motor: sensor engine=0 -> apagado', mod.geoAlertaMotor({ flds: { Engine: '0' } }, { vel: 0, edadMin: 0 }, 15).off === true);
ok('motor: sensor engine=1 -> encendido', mod.geoAlertaMotor({ flds: { engine: 1 } }, { vel: 0, edadMin: 20 }, 15).off === false);
ok('motor: sensor con guion y espacios', mod.geoAlertaMotor({ flds: { 'engine status': 'apagado' } }, { vel: 0, edadMin: 0 }, 15).off === true);
ok('motor: estimado por corte de reporte', mod.geoAlertaMotor({}, { vel: 0, edadMin: 16 }, 15).off === true);
ok('motor: estimado aun reportando', mod.geoAlertaMotor({}, { vel: 0, edadMin: 3 }, 15).off === false);
ok('motor: en marcha nunca esta apagado', mod.geoAlertaMotor({}, { vel: 40, edadMin: 90 }, 15).off === false);
ok('motor: sin datos no revienta', mod.geoAlertaMotor(null, null, 15).off === false);

// ── Maquina de estados: disparador "paso" ────────────────────────────────
const cfgPaso = { estableSeg: 20, minMin: 2, motorMin: 15, disparo: 'paso' };
const rIni = mod.geoAlertaEvalua(null, { dentro: true, vel: 30, ahora: 1000, cfg: cfgPaso });
ok('foto inicial dentro no avisa', rIni.evento === null);
ok('foto inicial dentro queda confirmada', rIni.e.d === 1);
ok('foto inicial fuera no marca dentro',
    mod.geoAlertaEvalua(null, { dentro: false, vel: 30, ahora: 1000, cfg: cfgPaso }).e.d === 0);

let e = { d: 0, p: 0, ps: 0, ds: 0, da: 0, ms: 0, ma: 0 };
let r = mod.geoAlertaEvalua(e, { dentro: true, vel: 30, ahora: 2000, cfg: cfgPaso });
ok('entrada: primer tick queda pendiente', r.e.p === 1 && r.evento === null);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 30, ahora: 2010, cfg: cfgPaso });
ok('entrada: antes de estableSeg no avisa', r.evento === null && r.e.d === 0);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 30, ahora: 2025, cfg: cfgPaso });
ok('entrada: al completar estableSeg avisa "paso"', r.evento === 'paso' && r.e.d === 1);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 30, ahora: 2030, cfg: cfgPaso });
ok('entrada: no repite dentro', r.evento === null);
const r0 = mod.geoAlertaEvalua({ d: 0, p: 0, ps: 0 }, { dentro: true, vel: 30, ahora: 100, cfg: { estableSeg: 0, minMin: 2, motorMin: 15, disparo: 'paso' } });
ok('entrada: estableSeg 0 confirma en el acto', r0.evento === 'paso' && r0.e.d === 1);
r = mod.geoAlertaEvalua({ d: 1, p: 0, ps: 0, ds: 10, da: 1, ms: 0, ma: 0 }, { dentro: false, vel: 0, ahora: 3000, cfg: cfgPaso });
ok('salida: rearma el episodio entero',
    r.evento === null && r.e.d === 0 && r.e.p === 0 && r.e.ds === 0 && r.e.da === 0 && r.e.ms === 0 && r.e.ma === 0);
e = r.e;

// ── Maquina de estados: disparador "detenida" ────────────────────────────
const cfgDet = { estableSeg: 0, minMin: 5, motorMin: 15, disparo: 'detenida' };
r = mod.geoAlertaEvalua({ d: 0, p: 0, ps: 0 }, { dentro: true, vel: 0, online: true, ahora: 1000, cfg: cfgDet });
ok('detenida: confirma la entrada sin avisar', r.e.d === 1 && r.evento === null);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 0, online: true, ahora: 1060, cfg: cfgDet });
ok('detenida: 1 min todavia no avisa', r.evento === null && Math.round(r.minutos) === 1, String(r.minutos));
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 0, online: true, ahora: 1320, cfg: cfgDet });
ok('detenida: al cumplir minMin avisa', r.evento === 'detenida' && r.e.da === 1, JSON.stringify(r.evento));
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 0, online: true, ahora: 1600, cfg: cfgDet });
ok('detenida: una sola vez por episodio', r.evento === null);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 25, online: true, ahora: 1700, cfg: cfgDet });
ok('detenida: al moverse rearma', r.e.ds === 0 && r.e.da === 0);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 25, online: true, ahora: 1800, cfg: cfgDet });
ok('detenida: en marcha no hay reloj de parada', r.e.ds === 0);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 0, online: true, ahora: 1800, cfg: cfgDet });
ok('detenida: el reloj arranca de cero al parar', r.e.ds === 1800 && r.minutos === 0);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 0.9, online: true, ahora: 1830, cfg: cfgDet });
ok('detenida: 0.9 km/h sigue siendo parada', r.e.ds === 1800);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 2, online: true, ahora: 1860, cfg: cfgDet });
ok('detenida: 2 km/h ya es movimiento', r.e.ds === 0);
ok('detenida: con el disparador paso no avisa una parada',
    mod.geoAlertaEvalua({ d: 1, ds: 1 }, { dentro: true, vel: 0, online: true, ahora: 100000, cfg: cfgPaso }).evento === null);

// ── Maquina de estados: disparador "motor" ───────────────────────────────
const cfgMot = { estableSeg: 0, minMin: 2, motorMin: 15, disparo: 'motor' };
r = mod.geoAlertaEvalua({ d: 0, p: 0, ps: 0 }, { dentro: true, vel: 0, online: true, motorOff: false, ahora: 1000, cfg: cfgMot });
ok('motor: entra y arranca el reloj de parada', r.e.d === 1 && r.e.ds === 1000 && r.e.ms === 0);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 0, online: true, motorOff: true, motorAntiguedadMin: 3, ahora: 1200, cfg: cfgMot });
ok('motor: 3 min apagado todavia no avisa (pide 15)', r.evento === null && r.e.ms === 1020);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 0, online: true, motorOff: true, motorAntiguedadMin: 3, ahora: 1920, cfg: cfgMot });
ok('motor: al cumplir motorMin avisa', r.evento === 'motor' && r.e.ma === 1, JSON.stringify(r.evento));
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 0, online: true, motorOff: true, motorAntiguedadMin: 3, ahora: 2400, cfg: cfgMot });
ok('motor: una sola vez por episodio', r.evento === null);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 0, online: true, motorOff: false, ahora: 2500, cfg: cfgMot });
ok('motor: si vuelve a reportar, motor encendido', r.e.ms === 0);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 0, online: true, motorOff: true, motorAntiguedadMin: 20, ahora: 3000, cfg: cfgMot });
ok('motor: reencender y apagar dentro no repite la alerta', r.evento === null && r.e.ms > 0);
r = mod.geoAlertaEvalua(r.e, { dentro: false, vel: 0, online: false, ahora: 3100, cfg: cfgMot });
ok('motor: salir rearma', r.e.ma === 0 && r.e.d === 0);
r = mod.geoAlertaEvalua(r.e, { dentro: true, vel: 0, online: false, motorOff: true, motorAntiguedadMin: 30, ahora: 4000, cfg: cfgMot });
ok('motor: sin reportar, el corte se data hacia atras',
    r.e.d === 1 && r.evento === 'motor' && Math.round(r.minutosMotor) >= 30,
    JSON.stringify({ e: r.e, ev: r.evento, mm: r.minutosMotor }));
ok('paso: sin senal no confirma la entrada',
    mod.geoAlertaEvalua({ d: 0, p: 0, ps: 0 }, { dentro: true, vel: 30, online: false, ahora: 9000, cfg: cfgPaso }).e.d === 0);
ok('detenida: sin senal no acumula parada',
    mod.geoAlertaEvalua({ d: 1, ds: 0 }, { dentro: true, vel: 0, online: false, ahora: 9000, cfg: cfgDet }).e.ds === 0);
ok('motor: en marcha nunca acumula motor',
    mod.geoAlertaEvalua({ d: 1, ms: 500 }, { dentro: true, vel: 30, online: true, motorOff: true, ahora: 5000, cfg: cfgMot }).e.ms === 0);

// ── Cooldown propio ──────────────────────────────────────────────────────
APP.cooldowns = {};
ok('cooldown: primero pasa', mod.geoAlertaPermitido('105', 'PATIO', { cooldownS: 600 }, 1000) === true);
ok('cooldown: segundo bloqueado', mod.geoAlertaPermitido('105', 'PATIO', { cooldownS: 600 }, 1100) === false);
ok('cooldown: otra geocerca no se bloquea', mod.geoAlertaPermitido('105', 'CEDIS', { cooldownS: 600 }, 1100) === true);
ok('cooldown: pasado el plazo vuelve a pasar', mod.geoAlertaPermitido('105', 'PATIO', { cooldownS: 600 }, 1700) === true);
ok('cooldown: 0 = sin cooldown propio', mod.geoAlertaPermitido('105', 'PATIO', { cooldownS: 0 }, 1701) === true);

// ── Textos y catalogos ───────────────────────────────────────────────────
const tp = mod.geoAlertaTextoEvento('paso', 'PATIO', '105', 0);
const td = mod.geoAlertaTextoEvento('detenida', 'PATIO', '105', 7);
const tm = mod.geoAlertaTextoEvento('motor', 'PATIO', '105', 22);
ok('texto paso: nombra geocerca y unidad',
    /PASO POR GEOCERCA/.test(tp.titulo) && /PATIO/.test(tp.titulo) && /105/.test(tp.titulo), tp.titulo);
ok('texto detenida: dice los minutos', /7 min detenida/.test(td.detalle), td.detalle);
ok('texto motor: dice motor apagado', /motor apagado/.test(tm.detalle), tm.detalle);
ok('textos: los tres tienen voz', !!(tp.hablar && td.hablar && tm.hablar));
ok('catalogo: tres disparadores con icono y texto',
    Object.keys(mod.GEO_ALERTA_DISPAROS).length === 3 &&
    ['paso', 'detenida', 'motor'].every((k) => !!(mod.GEO_ALERTA_DISPAROS[k].icono && mod.GEO_ALERTA_DISPAROS[k].txt)));
ok('catalogo: cuatro gravedades', mod.GEO_ALERTA_SEVS.length === 4);

// ── Regla completa sobre una unidad vigilada ─────────────────────────────
reinicia();
cfgBase({ zonas: '', severidad: 'critico', disparo: 'detenida', minMin: 3, estableSeg: 0 });
tick(0, {}, U[105]);
ok('regla: sin geocercas marcadas no dispara', alertas.length === 0);
cfgBase({ zonas: 'PATIO', severidad: 'critico', disparo: 'detenida', minMin: 3, estableSeg: 0 });
tick(60, {}, U[105]);
tick(60, {}, U[105]);
tick(60, {}, U[105]);
tick(60, {}, U[105]);
tick(60, {}, U[105]);
ok('regla: dispara "detenida" con la gravedad elegida',
    alertas.length === 1 && alertas[0].regla === 'geoAlerta' && alertas[0].sev === 'critico',
    JSON.stringify(alertas[0] || {}));
ok('regla: el aviso lleva titulo, detalle, voz y posicion',
    /DETENIDA EN GEOCERCA VIGILADA/.test(alertas[0].titulo) && /PATIO/.test(alertas[0].detalle) &&
    !!alertas[0].hablar && alertas[0].lat === 0 && alertas[0].lon === 0);
ok('regla: icono del disparador', alertas[0].icono === 'stopped', alertas[0].icono);
tick(60, {}, U[105]);
ok('regla: no repite mientras siga el mismo episodio', alertas.length === 1);
ok('regla: publica el estado vivo con zona y minutos',
    !!APP.geoAlertaVivo['105'] && APP.geoAlertaVivo['105'].zona === 'PATIO' && APP.geoAlertaVivo['105'].minutos > 2,
    JSON.stringify(APP.geoAlertaVivo['105'] || {}));
tick(60, { lat: 1, lon: 1 }, U[105]);
ok('regla: al salir de la geocerca se quita del vivo', APP.geoAlertaVivo['105'] === undefined);

// ── Regla: apagada / sin geocercas cargadas ──────────────────────────────
reinicia();
cfgBase();
APP.config.reglas.geoAlerta = false;
tick(0, {}, U[105]);
tick(600, {}, U[105]);
ok('regla: con el interruptor apagado no avisa', alertas.length === 0);
reinicia();
cfgBase();
APP.config.loadZones = false;
tick(0, {}, U[105]);
tick(600, {}, U[105]);
ok('regla: sin geocercas cargadas no avisa', alertas.length === 0);
APP.config.loadZones = true;

// ── Alcance: vigiladas vs toda la flota ──────────────────────────────────
reinicia();
cfgBase({ zonas: 'PATIO', disparo: 'paso', estableSeg: 0, alcance: 'vigiladas' });
APP.unidades = [U[105], U[205], U[305]];
const vig = { 105: 1 };
mod.geoAlertaFlota(APP.unidades, vig);
mod.geoAlertaFlota(APP.unidades, vig);
ok('alcance vigiladas: la unidad no vigilada no avisa',
    alertas.length === 0, JSON.stringify(alertas.map((a) => a.clave)));
reinicia();
cfgBase({ zonas: 'PATIO', disparo: 'paso', estableSeg: 0, alcance: 'todas' });
APP.unidades = [U[105], U[305]];
mod.geoAlertaFlota(APP.unidades, vig);
mod.geoAlertaFlota(APP.unidades, vig);
ok('alcance todas: una unidad ya dentro no dispara de entrada', alertas.length === 0,
    JSON.stringify(alertas.map((a) => a.clave)));
reinicia();
cfgBase({ zonas: 'PATIO', disparo: 'paso', estableSeg: 0, alcance: 'todas' });
APP.unidades = [U[105], U[305]];
U[305].pos = { y: 1, x: 1, s: 0, t: 1000000 };       // fuera de toda geocerca
mod.geoAlertaFlota(APP.unidades, vig);
H.reloj += 30;
U[305].pos = { y: 0.0005, x: 0, s: 0, t: 1000030 };  // entra en PATIO
mod.geoAlertaFlota(APP.unidades, vig);
U[305].pos = { y: 0.0005, x: 0, s: 0, t: 1000060 };
mod.geoAlertaFlota(APP.unidades, vig);
ok('alcance todas: avisa tambien por la unidad no vigilada',
    alertas.some((a) => a.clave === '305'), JSON.stringify(alertas.map((a) => a.clave)));
ok('alcance todas: guarda su estado aparte',
    !!(APP.memoGeoAlerta['305'] && APP.memoGeoAlerta['305'].g && APP.memoGeoAlerta['305'].g.PATIO));
ok('alcance todas: no pisa el estado de las vigiladas', APP.memoGeoAlerta['105'] === undefined);
ok('alcance todas: publica el vivo de la no vigilada', !!APP.geoAlertaVivo['305']);
ok('alcance todas: no toca las alertas de las vigiladas', alertas.every((a) => a.clave === '305'));
reinicia();
cfgBase({ alcance: 'vigiladas' });
APP.unidades = [U[305]];
APP.memoGeoAlerta['305'] = { g: { PATIO: { d: 1 } } };
mod.geoAlertaFlota(APP.unidades, {});
ok('alcance: al volver a vigiladas se limpia el memo de la flota',
    Object.keys(APP.memoGeoAlerta).length === 0);
reinicia();
cfgBase({ zonas: 'PATIO', disparo: 'paso', estableSeg: 0, alcance: 'todas' });
U[305].pos = { y: 0.0005, x: 0, s: 0, t: 1000000 };
APP.unidades = [];
mod.geoAlertaFlota(APP.unidades, {});
ok('alcance: sin unidades no rompe', alertas.length === 0);

// ── Reinicio de episodios ────────────────────────────────────────────────
reinicia();
cfgBase();
APP.memo['105'] = { geoAlerta: { PATIO: { d: 1 } } };
APP.geoAlertaVivo['105'] = { zona: 'PATIO' };
APP.memoGeoAlerta['305'] = { g: { PATIO: { d: 1 } } };
mod.geoAlertaReinicia();
ok('reinicia: limpia el memo de las vigiladas', APP.memo['105'].geoAlerta === undefined);
ok('reinicia: limpia el memo de la flota', Object.keys(APP.memoGeoAlerta).length === 0);
ok('reinicia: limpia el estado vivo', Object.keys(APP.geoAlertaVivo).length === 0);
ok('reinicia: persiste el vaciado', sesiones.some(([k]) => k === 'geoAlerta'));

// ── Poda del estado vivo ─────────────────────────────────────────────────
reinicia();
APP.geoAlertaVivo['105'] = { zona: 'PATIO' };
APP.geoAlertaVivo['999'] = { zona: 'PATIO' };
mod.geoAlertaPodaVivo([U[105]]);
ok('poda: quita las unidades que ya no reportan',
    !!APP.geoAlertaVivo['105'] && APP.geoAlertaVivo['999'] === undefined);

Date.now = realNow;
console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasan');
process.exit(fallos ? 1 : 0);