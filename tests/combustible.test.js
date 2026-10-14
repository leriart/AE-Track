/*
 * Pruebas del algoritmo PROPIO de deteccion de robo/perdida de combustible
 * (fragmento 56, prefijo comb*). Cubre el camino feliz, los datos faltantes, el
 * jitter del GPS, la banda de ruido adaptativa, el llenado contiguo, el caso
 * real de la unidad 4085 (CXOV.4085 - JW84026) y la convergencia con unidades
 * carnada.
 *
 * Se extrae el bloque delimitado por los marcadores BEGIN/END de "combustible"
 * en el bundle y se evalua con stubs de lo que vive fuera (norm y haversine).
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* === BEGIN: combustible === */');
const fin = src.indexOf('/* === END: combustible === */');
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque "combustible" en ' + ARCHIVO);
    process.exit(1);
}

const stubs = [
    'function norm(s){ return String(s == null ? "" : s).toUpperCase().trim(); }',
    'function haversine(y1, x1, y2, x2){ const dy = (y2 - y1), dx = (x2 - x1); return Math.sqrt(dy * dy + dx * dx) * 111320; }'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn {COMB_VEREDICTOS,COMB_DEF,COMB_UMBRAL,COMB_TXT,COMB_CSV_COLS,' +
    'combNum,combNumOrNull,combFmt,combOpts,combMediana,combMedianaMovil3,combMAD,' +
    'combBandaRuido,combMeseta,combLimpiaSerie,combReversion,combEstablePost,combCaidas,' +
    'combEntorno,combLlenadoCerca,combDistancia,combConvergencia,combPuntosVolumen,' +
    'combPuntosRecurrencia,combPuntosConvergencia,combPuntaje,combClasifica,combEvaluaEvento,' +
    'combDetecta,combAgregaPuntos,combCSV,combResumen};';
const mod = new Function(code)();

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}
function m(t, fuel, s, lat, lon) { return { t: t, fuel: fuel, s: (s == null ? 0 : s), lat: lat, lon: lon }; }

// ── Estadistica robusta ──────────────────────────────────────────────────────
ok('mediana impar', mod.combMediana([3, 1, 2]) === 2);
ok('mediana par', mod.combMediana([1, 2, 3, 4]) === 2.5);
ok('mediana vacia -> null', mod.combMediana([]) === null);
ok('mediana movil 3 amortigua el pico', mod.combMedianaMovil3([50, 120, 50])[1] === 50);
ok('MAD de serie plana = 0', mod.combMAD([5, 5, 5, 5]).mad === 0);
ok('banda de ruido: minimo 0.5', mod.combBandaRuido([100, 100, 100, 100, 100, 200]).banda === 0.5);
ok('banda de ruido: crece con el jitter', mod.combBandaRuido([100, 100.4, 99.6, 100.2, 99.8]).banda > 0.5);

// La mediana movil quita el pico de UN dato (la causa tipica de falso positivo).
const conPico = mod.combLimpiaSerie([m(0, 50), m(60, 50), m(120, 50), m(180, 120), m(240, 50), m(300, 50)]);
ok('limpieza: quita el pico de un dato', conPico.serie[3].nivel === 50);
ok('limpieza: meseta inicial completa', conPico.mesetaIni.n === 6);
ok('limpieza: meseta final completa', conPico.mesetaFin.n === 6);
ok('limpieza: el pico no genera evento', mod.combDetecta([m(0, 50), m(60, 50), m(120, 50), m(180, 120), m(240, 50), m(300, 50)]).length === 0);

// El nivel tambien puede venir como `nivel` o `value` (no solo `fuel`): el
// algoritmo no debe depender del nombre del campo de la fuente.
ok('limpieza: acepta el campo nivel', mod.combLimpiaSerie([{ t: 0, nivel: 200 }, { t: 60, nivel: 150 }]).serie.length === 2);
ok('limpieza: acepta el campo value', mod.combLimpiaSerie([{ t: 0, value: 200 }, { t: 60, value: 150 }]).serie.length === 2);
ok('deteccion: funciona con el campo nivel', mod.combDetecta([{ t: 0, nivel: 200, s: 0 }, { t: 60, nivel: 200, s: 0 }, { t: 120, nivel: 150, s: 0 }, { t: 180, nivel: 150, s: 0 }, { t: 240, nivel: 150, s: 0 }]).length === 1);

// Parada larga: la unidad lleva media hora al mismo nivel y despues baja. Es el
// caso real (una unidad detenida) y antes se perdia por completo.
const larga = [];
for (let i = 0; i < 30; i++) larga.push(m(i * 60, 200));
for (let i = 30; i < 36; i++) larga.push(m(i * 60, 150));
const evLarga = mod.combDetecta(larga);
ok('parada larga: detecta la caida', evLarga.length === 1, 'n=' + evLarga.length);
ok('parada larga: delta 50 L', evLarga[0] && Math.abs(evLarga[0].delta - 50) < 1e-6);
ok('parada larga: la caida se mide en la ventana (120 s)', evLarga[0] && evLarga[0].durSeg === 120);
ok('parada larga: ritmo coherente (25 L/min)', evLarga[0] && Math.abs(evLarga[0].ritmo - 25) < 1e-6);
// Muestreo disperso (cada 5 minutos): la caida ocurre entre dos muestras.
const disperso = [m(0, 200), m(300, 200), m(600, 200), m(900, 150), m(1200, 150)];
ok('muestreo disperso: detecta la caida', mod.combDetecta(disperso).length === 1, 'n=' + mod.combDetecta(disperso).length);
// El pico de un solo dato sigue sin generar evento (no se rompe el filtro).
ok('parada larga: el pico suelto sigue sin evento', mod.combDetecta([{ t: 0, fuel: 200, s: 0 }, { t: 60, fuel: 200, s: 0 }, { t: 120, fuel: 120, s: 0 }, { t: 180, fuel: 200, s: 0 }, { t: 240, fuel: 200, s: 0 }]).length === 0);

// ── Camino feliz: caida sostenida con la unidad detenida ─────────────────────
const feliz = [m(0, 200), m(60, 200), m(120, 150), m(180, 150), m(240, 150), m(300, 150)];
const evF = mod.combDetecta(feliz, { ctx: { geocerca: 'Arandas, Carretera C. De Guadalupe-El Pocito De Arriba', recurrencia: 3, carnada: 0 } });
ok('feliz: 1 evento', evF.length === 1, 'n=' + evF.length);
ok('feliz: delta 50 L', evF[0] && Math.abs(evF[0].delta - 50) < 1e-6);
ok('feliz: duracion 120 s', evF[0] && evF[0].durSeg === 120);
ok('feliz: veredicto descarga', evF[0] && evF[0].veredicto === 'descarga_no_autorizada');
ok('feliz: es firme (sin salvedades)', evF[0] && evF[0].firme === true && evF[0].salvedades.length === 0);
ok('feliz: puntaje 5 (entorno 2 + recurrencia 2 + volumen 1)', evF[0] && evF[0].puntaje === 5, evF[0] && JSON.stringify(evF[0].componentes));
ok('feliz: nivel Alta', evF[0] && evF[0].nivel === 'Alta');

// ── Datos faltantes ──────────────────────────────────────────────────────────
ok('faltantes: detecta(null) -> []', mod.combDetecta(null).length === 0);
ok('faltantes: detecta([]) -> []', mod.combDetecta([]).length === 0);
ok('faltantes: muestras sin nivel -> []', mod.combDetecta([{ t: 0 }, { t: 1 }]).length === 0);
ok('faltantes: limpiaSerie(undefined) sin serie', mod.combLimpiaSerie(undefined).serie.length === 0);
ok('faltantes: evalua(undefined) -> ruido', mod.combEvaluaEvento(undefined).veredicto === 'ruido');
ok('faltantes: num("abc", 7) = 7', mod.combNum('abc', 7) === 7);
ok('faltantes: numOrNull("") = null', mod.combNumOrNull('') === null);

// ── Jitter GPS ───────────────────────────────────────────────────────────────
const jit = [
    { t: 0, fuel: 200, s: 0, lat: 20.84390, lon: -102.70790 },
    { t: 60, fuel: 200.3, s: 0, lat: 20.84392, lon: -102.70787 },
    { t: 120, fuel: 150, s: 0.5, lat: 20.84388, lon: -102.70785 },
    { t: 180, fuel: 149.8, s: 0, lat: 20.84391, lon: -102.70788 },
    { t: 240, fuel: 150.1, s: 0, lat: 20.84390, lon: -102.70786 }
];
const evJ = mod.combDetecta(jit);
ok('jitter: sigue detectando la caida', evJ.length === 1, 'n=' + evJ.length);
ok('jitter: toma la ultima coordenada', evJ[0] && Math.abs(evJ[0].lat - 20.84388) < 1e-6);

// Unidad en movimiento: no hay descarga posible (el tanque se agita).
const movil = [m(0, 200, 40), m(60, 200, 45), m(120, 150, 50), m(180, 150, 30)];
ok('movimiento: descarta la caida', mod.combDetecta(movil).length === 0);

// Ruido puro dentro de la banda: no genera eventos.
const ruido = [m(0, 100), m(60, 100.4), m(120, 99.7), m(180, 100.3), m(240, 99.9), m(300, 100.2), m(360, 99.8)];
ok('ruido: fluctuacion de la banda no genera eventos', mod.combDetecta(ruido).length === 0);

// ── Descartes de falsos positivos ────────────────────────────────────────────
const evRuido = mod.combEvaluaEvento({ litros: 1.5, min: 1 });
ok('descarte: delta < 3 L = ruido', evRuido.veredicto === 'ruido' && evRuido.firme === false && evRuido.candidato === false);
const evEscalon = mod.combEvaluaEvento({ litros: 30, durSeg: 3, ritmo: 600 });
ok('descarte: ritmo > 60 en < 5 s = escalon', evEscalon.veredicto === 'error_sensor' && evEscalon.salvedades.indexOf('escalon_sensor') >= 0);
const evEscalon2 = mod.combEvaluaEvento({ litros: 30, min: 0, ritmo: '-' });
ok('descarte: caida instantanea (0 min) = escalon', evEscalon2.veredicto === 'error_sensor');
const evRebote = mod.combEvaluaEvento({ litros: 40, min: 2, reversionSeg: 120 });
ok('descarte: reversion < 5 min = error_sensor', evRebote.veredicto === 'error_sensor' && evRebote.salvedades.indexOf('rebote_salpicadura') >= 0);
const evImposible = mod.combEvaluaEvento({ litros: 500, min: 3 });
ok('descarte: delta > capacidad = error_sensor', evImposible.veredicto === 'error_sensor' && evImposible.salvedades.indexOf('delta_imposible') >= 0);
const evFuga = mod.combEvaluaEvento({ litros: 40, durSeg: 3600 });
ok('clasifica: fuga lenta y sostenida', evFuga.veredicto === 'fuga');

// ── Llenado contiguo ─────────────────────────────────────────────────────────
const evLlenado = mod.combEvaluaEvento({ litros: 40, min: 2, geocerca: 'GASOLINERA LA CANTERA', llenadoCerca: true });
ok('llenado: veredicto llenado_contiguo', evLlenado.veredicto === 'llenado_contiguo' && evLlenado.salvedades.indexOf('llenado_cercano') >= 0);
ok('llenado: 20 min antes si es contiguo', mod.combLlenadoCerca(0, 20 * 60) === true);
ok('llenado: 107 min (1h47) NO es contiguo', mod.combLlenadoCerca(0, 107 * 60) === false);
ok('llenado: sin dato -> false', mod.combLlenadoCerca(null, 60) === false);

// ── Entorno de geocerca ──────────────────────────────────────────────────────
ok('entorno: zona de prueba', mod.combEntorno('GEOCERCA TESTEO STS').tipo === 'prueba' && mod.combEntorno('GEOCERCA TESTEO STS').puntos === 0);
ok('entorno: carretera estatal (Mex-)', mod.combEntorno('Nochistlan De Mejia, Mex-205').puntos === 2);
ok('entorno: carretera (Jal-)', mod.combEntorno('Tepatitlan De Morelos, Jal-349').puntos === 2);
ok('entorno: libramiento', mod.combEntorno('Fraccionamiento El Realengo, Calle Libramiento').puntos === 2);
ok('entorno: patio/planta propia', mod.combEntorno('Rastro de Cerdos Gena').puntos === 0);
ok('entorno: vacio -> desconocido', mod.combEntorno('').tipo === 'desconocido');

// ── Puntaje de sospecha 0-9 ──────────────────────────────────────────────────
ok('puntos volumen: escalones', mod.combPuntosVolumen(199) === 2 && mod.combPuntosVolumen(200) === 3 && mod.combPuntosVolumen(50) === 1 && mod.combPuntosVolumen(49) === 0);
ok('puntos recurrencia: escalones', mod.combPuntosRecurrencia(3) === 2 && mod.combPuntosRecurrencia(2) === 1 && mod.combPuntosRecurrencia(1) === 0);
ok('puntos convergencia: escalones', mod.combPuntosConvergencia(5) === 2 && mod.combPuntosConvergencia(3) === 1 && mod.combPuntosConvergencia(2) === 0);
ok('puntaje: maximo 9', mod.combPuntaje({ entorno: 2, recurrencia: 2, volumen: 3, convergencia: 2 }).puntaje === 9);
ok('puntaje: recorta volumen a 3', mod.combPuntaje({ volumen: 9 }).puntaje === 3);
ok('puntaje: vacio = 0 Baja', mod.combPuntaje({}).puntaje === 0 && mod.combPuntaje({}).nivel === 'Baja');
ok('puntaje: 3 = Media', mod.combPuntaje({ entorno: 2, volumen: 1 }).nivel === 'Media');

// ── CASO OBLIGATORIO: unidad 4085 (CXOV.4085 - JW84026) ──────────────────────
// Descarga de 24.55 L en la GEOCERCA TESTEO STS, 0 km/h, llenado 1h47 despues y
// niveles incoherentes con la hoja de viajes: candidato con salvedad, NO robo firme.
const ev4085 = mod.combEvaluaEvento({
    litros: 24.549572, min: 2, geocerca: 'GEOCERCA TESTEO STS',
    motor: false, velIni: 0, velFin: 0, incoherente: true
});
ok('4085: NO se clasifica como robo firme', !(ev4085.veredicto === 'descarga_no_autorizada' && ev4085.firme === true));
ok('4085: veredicto error_sensor (artefacto probable)', ev4085.veredicto === 'error_sensor');
ok('4085: firme = false', ev4085.firme === false);
ok('4085: candidato = true', ev4085.candidato === true);
ok('4085: salvedad de zona de prueba', ev4085.salvedades.indexOf('zona_de_prueba') >= 0, JSON.stringify(ev4085.salvedades));
ok('4085: salvedad de niveles incoherentes', ev4085.salvedades.indexOf('niveles_incoherentes') >= 0);
ok('4085: zona de prueba = entorno 0', ev4085.entornoPuntos === 0);
// Contraste: el MISMO volumen en carretera y con niveles coherentes si es firme.
const ev4085b = mod.combEvaluaEvento({ litros: 24.549572, min: 2, geocerca: 'Valle De Guadalupe, Jal-311' });
ok('4085: mismo volumen fuera de prueba si es firme', ev4085b.veredicto === 'descarga_no_autorizada' && ev4085b.firme === true);

// ── Convergencia con unidades carnada (radio configurable, 30 m) ─────────────
const evPt = { lat: 20.9, lon: -102.6, t: 1000 };
const llegadas = [
    { unidad: 'A', lat: 20.9001, lon: -102.6, t: 1000 },
    { unidad: 'B', lat: 20.8999, lon: -102.6, t: 1000 },
    { unidad: 'C', lat: 20.9002, lon: -102.6, t: 1000 },
    { unidad: 'D', lat: 20.8998, lon: -102.6, t: 1000 },
    { unidad: 'E', lat: 20.90025, lon: -102.6, t: 1000 },
    { unidad: 'A', lat: 20.9001, lon: -102.6, t: 1000 },
    { unidad: 'F', lat: 20.9005, lon: -102.6, t: 1000 }
];
const conv = mod.combConvergencia(evPt, llegadas, { radioM: 30 });
ok('convergencia: 5 unidades distintas dentro de 30 m', conv.n === 5, 'n=' + conv.n + ' ' + JSON.stringify(conv.unidades.map((u) => u.unidad)));
ok('convergencia: puntaje 2 (5 o mas)', conv.puntos === 2);
ok('convergencia: respeta el radio pedido', mod.combConvergencia(evPt, llegadas, { radioM: 15 }).n === 2);
ok('convergencia: sin coordenadas -> 0', mod.combConvergencia({}, llegadas).n === 0);
const llegadasT = [
    { unidad: 'A', lat: 20.9001, lon: -102.6, t: 1000 },
    { unidad: 'B', lat: 20.9001, lon: -102.6, t: 1000 + 3600 }
];
ok('convergencia: filtra por tramo horario', mod.combConvergencia(evPt, llegadasT, { convVentanaMin: 10 }).n === 1);
ok('distancia fallback ~111 km por grado', Math.abs(mod.combDistancia(0, 0, 1, 0) - 111195) < 250);
ok('distancia: falta coordenada -> null', mod.combDistancia(0, null, 1, 0) === null);

// ── Agregacion por punto, CSV y resumen ──────────────────────────────────────
const ag = mod.combAgregaPuntos([
    mod.combEvaluaEvento({ litros: 30, min: 2, geocerca: 'Arandas, Carretera C. De Guadalupe-El Pocito De Arriba', lat: 20.1, lon: -102.1 }),
    mod.combEvaluaEvento({ litros: 40, min: 2, geocerca: 'Arandas, Carretera C. De Guadalupe-El Pocito De Arriba', lat: 20.1, lon: -102.1 })
]);
ok('agrega: 1 punto con 2 eventos', ag.length === 1 && ag[0].eventos === 2, JSON.stringify(ag));
ok('agrega: suma litros', ag.length === 1 && Math.abs(ag[0].litros - 70) < 1e-9);
ok('agrega: veredicto dominante', ag.length === 1 && ag[0].veredicto === 'descarga_no_autorizada');

const csv = mod.combCSV([ev4085]);
ok('csv: cabecera', csv.split('\n')[0] === mod.COMB_CSV_COLS.join(','));
ok('csv: una fila + cabecera', csv.trim().split('\n').length === 2);
ok('csv: entrecomilla el veredicto', csv.indexOf('"error_sensor"') >= 0);

const res = mod.combResumen([ev4085, ev4085b]);
ok('resumen: total 2', res.total === 2);
ok('resumen: conteo por veredicto', res.porVeredicto.error_sensor.eventos === 1 && res.porVeredicto.descarga_no_autorizada.eventos === 1);
ok('resumen: firme 1', res.firme === 1 && res.candidato === 2);
ok('resumen: suma litros', Math.abs(res.litros - 49.099144) < 0.01);
ok('resumen: todas las categorias presentes', mod.COMB_VEREDICTOS.every((v) => res.porVeredicto[v] != null));

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
