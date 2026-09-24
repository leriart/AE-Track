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

/* ── Chequeos estructurales de la UI ────────────────────────────
 * Previenen regresiones en el cambio de pestanas, el modo sidebar
 * unico y la lista de unidades en tarjetas.
 */
// setTab debe incluir las 7 pestanas (incluida 'riesgo').
const mSetTab = src.match(/const ids = \[([^\]]*)\];/);
ok('setTab declara un arreglo de pestanas', !!mSetTab);
if (mSetTab) {
    const ids = mSetTab[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean);
    // Geocercas y zonas de riesgo se fusionaron en la pestana 'zonas'.
    ['dash', 'unidades', 'alertas', 'rutas', 'caravana', 'zonas'].forEach((t) => {
        ok('setTab incluye "' + t + '"', ids.indexOf(t) >= 0, ids.join(','));
    });
}
// Los 6 contenedores deben existir en el HTML del panel.
['dash', 'unidades', 'alertas', 'rutas', 'caravana', 'zonas'].forEach((t) => {
    ok('HTML tiene rondo-wrap-' + t, src.indexOf("id=\"rondo-wrap-" + t + "\"") >= 0);
});
// Ya no debe existir la pestana riesgo separada.
ok('sin pestana riesgo separada', src.indexOf("data-tab=\"riesgo\"") < 0);
ok('sin wrap riesgo separado', src.indexOf("rondo-wrap-riesgo") < 0);
// Alt+5 -> zonas.
ok('atajo Alt+5 -> zonas', /'5':\s*'zonas'/.test(src));
// La pestana zonas pinta geocercas y riesgo.
ok('zonas pinta geocercas y riesgo', /name === 'zonas'\)\s*\{[^}]*paintGeocercas\(\);\s*paintRiesgo\(\);/.test(src));
ok('zonas tiene segmentado', src.indexOf('id="rondo-zonas-seg"') >= 0);
ok('zonas tiene panel geocercas', src.indexOf('id="rondo-zpane-geocercas"') >= 0);
ok('zonas tiene panel riesgo', src.indexOf('id="rondo-zpane-riesgo"') >= 0);

// Modo sidebar unico: sin boton ni selector de modo flotante.
ok('sin boton rondo-btn-modo', src.indexOf('rondo-btn-modo') < 0);
ok('sin boton rondo-sb-modo', src.indexOf('rondo-sb-modo') < 0);
ok('sin selector c-panel-modo', src.indexOf('c-panel-modo') < 0);
ok('esLateral siempre true', /function esLateral\(\)\s*{\s*return true;/.test(src));

// Pestanas solo icono y sin marco verde en Riesgo.
ok('CSS oculta siempre la etiqueta de la pestana', /#rondo-panel \.tab \.etqt\{display:none\}/.test(src));
ok('sin indicador verde tab-regla-activa', src.indexOf('tab-regla-activa') < 0);
ok('sin clase regla-activa en la pestana Riesgo', src.indexOf('regla-activa') < 0);
// Riesgo no se repinta cada segundo (anti-parpadeo).
ok('setInterval no llama paintRiesgo', !/setInterval[^)]+if \(APP\.tab === 'riesgo'\) paintRiesgo\(\)/.test(src));

// Header: refrescar y ajustes como iconos arriba (junto a tema y no molestar).
ok('header tiene rondo-refresh', /<header id="rondo-drag">[\s\S]*id="rondo-refresh"/.test(src));
ok('header tiene rondo-cfg-btn', /<header id="rondo-drag">[\s\S]*id="rondo-cfg-btn"/.test(src));
ok('rondo-refresh es rondo-iconbtn', /id="rondo-refresh" class="rondo-iconbtn"|class="rondo-iconbtn" id="rondo-refresh"/.test(src));
ok('rondo-cfg-btn es rondo-iconbtn', /id="rondo-cfg-btn" class="rondo-iconbtn"|class="rondo-iconbtn" id="rondo-cfg-btn"/.test(src));

// Barra de herramientas contextual por pestaña.
ok('existe paintTools', /function paintTools\(\)/.test(src));
ok('setTab llama paintTools', /function setTab\(name\)[\s\S]*paintTools\(\)/.test(src));
ok('herramientas declaran data-tabs', (src.match(/class="[^"]*rondo-tool[^"]*"[^>]*data-tabs=/g) || []).length >= 6);

// Dashboard re-hecho: KPIs compactos y bloques.
ok('dash usa rondo-dash-kpis', src.indexOf('rondo-dash-kpis') >= 0);
ok('dash usa rondo-dash-block', src.indexOf('rondo-dash-block') >= 0);
ok('dash sin kpi-grid viejo', src.indexOf('class="kpi-grid"') < 0);
ok('dash sin sparkline visible en HTML', src.indexOf('id="rondo-spark"') < 0);

// Sin tarjeta de actualizaciones en el Dashboard (se quito).
ok('dash sin tarjeta de update', src.indexOf('rondo-upd-card') < 0);
ok('dash sin boton de update', src.indexOf('rondo-upd-btn') < 0);
// Dashboard expandido: salud + zonas ocupadas + rutas activas + acciones
ok('dash tiene bloque salud', src.indexOf('rondo-salud') >= 0);
ok('dash tiene lista de zonas', src.indexOf('id="rondo-dash-zonas"') >= 0);
ok('dash tiene lista de rutas', src.indexOf('id="rondo-dash-rutas"') >= 0);
ok('dash sin acciones rapidas (se quitaron)', src.indexOf('rondo-dash-acciones') < 0);
ok('dash sin botones de acciones', src.indexOf('rondo-dash-lista') < 0 && src.indexOf('rondo-dash-informe') < 0);
// Motores de voz (TTS gratis online)
ok('DEFAULTS.vozMotor', /vozMotor:\s*'web'/.test(src));
ok('DEFAULTS.vozOnline', /vozOnline:\s*'Mia'/.test(src));
ok('lista TTS_ONLINE_VOCES', src.indexOf('TTS_ONLINE_VOCES') >= 0);
ok('speakOnline (StreamElements)', /function speakOnline\(/.test(src));
ok('speakGoogle (Google TTS)', /function speakGoogle\(/.test(src));
ok('poblarVozSelect', /function poblarVozSelect\(/.test(src));
ok('config c-voz-motor', src.indexOf('id="c-voz-motor"') >= 0);
ok('paintSalud existe', /function paintSalud\(/.test(src));
ok('paintZonasDash existe', /function paintZonasDash\(/.test(src));
ok('paintRutasDash existe', /function paintRutasDash\(/.test(src));
// Dashboard: la cabecera ya no lleva el icono (imagen rota)
ok('dash-head sin icono', !/rondo-dash-head">'\s*\+\s*'<span class="rondo-usym/.test(src));
// Ayuda rapida mejorada
ok('ayuda menciona Voz y notificaciones', src.indexOf('Voz y notificaciones') >= 0);
ok('ayuda menciona Datos y privacidad', src.indexOf('Datos y privacidad') >= 0);
// Selector de voz por modelo
ok('config tiene c-voz-voice', src.indexOf('id="c-voz-voice"') >= 0);
ok('DEFAULTS.voiceVoice', /voiceVoice:\s*''/.test(src));
ok('speak usa voiceVoice', src.indexOf('APP.config.voiceVoice') >= 0);
ok('pobla voces con getVoices', src.indexOf('getVoices()') >= 0);

// Anti-solapamiento en la pestana Zonas: los hijos no deben encogerse.
ok('zonas hijos flex-shrink:0', /#rondo-wrap-zonas > \*\{flex-shrink:0/.test(src));
ok('dash hijos flex-shrink:0', /#rondo-dash > \*\{flex-shrink:0/.test(src));
ok('filtros de riesgo sin sticky', src.indexOf('.rondo-riesgo-filters{position:sticky') < 0);
ok('hero de riesgo sin animacion', !/\.rondo-riesgo-hero\{[^}]*animation:/.test(src));
ok('seccion sin animacion (anti-parpadeo)', !/\.rondo-seccion\{[^}]*animation: rondoFadeUp/.test(src));

// Iconos: deben ser los MISMOS que la plataforma (Ant Design, SVG inline).
// UIS es un Proxy que devuelve el SVG del icono; NA_ICONS tiene los paths.
ok('NA_ICONS localizado', /const NA_ICONS = Object\.freeze\(\{/.test(src));
ok('naSvg helper', /function naSvg\(/.test(src));
ok('UIS es Proxy con naSvg', /const UIS = new Proxy\(\{\}, \{[\s\S]*?naSvg\(NA_ICONS/.test(src));
ok('viewBox de Ant Design', src.indexOf("viewBox=\"64 64 896 896\"") >= 0);
ok('SVG con class rondo-na', src.indexOf("class=\"rondo-na\"") >= 0);
(function () {
    const m = src.match(/const NA_ICONS = Object\.freeze\(\{([\s\S]*?)\n    \}\);/);
    if (!m) { ok('NA_ICONS parseable', false); return; }
    const keys = (m[1].match(/^\s{8}([a-zA-Z0-9_]+):/gm) || []).length;
    ok('NA_ICONS tiene suficientes iconos', keys >= 30, 'keys=' + keys);
    // Los paths son SVG (empiezan por comando de path, sin comillas raras).
    ok('NA_ICONS con paths SVG', m[1].indexOf("['M") >= 0 || m[1].indexOf("['m") >= 0);
})();
// Ya no se usan los simbolos Unicode crudos del set anterior.
ok('sin UIS Unicode crudo', !/const UIS = Object\.freeze\(\{/.test(src));
ok('CSS de .rondo-na', src.indexOf('.rondo-na{width:1em') >= 0);
// Los iconos SVG nunca deben asignarse con textContent (se verian como texto).
ok('sin SVG en textContent', !/\.textContent\s*=\s*[^;]*UIS\./.test(src));
ok('sin SVG en .textContent con ternario', !/\.textContent\s*=\s*\([^;]*UIS\./.test(src));
ok('sin iconos en detalle de alertas', !/detalle:\s*UIS\./.test(src));

// Riesgo: superficie movida a Ajustes, con boton Configurar y status compacto.
ok('riesgo tiene boton Configurar', src.indexOf('id="rondo-riesgo-configurar"') >= 0);
ok('riesgo tiene container de drop', src.indexOf('id="rondo-riesgo-drop"') >= 0);
ok('riesgo ya no tiene toolbar de URL', src.indexOf('rondo-riesgo-toolbar-url') < 0);
ok('riesgo ya no tiene parametros inline', src.indexOf('id="rondo-riesgo-parametros"') < 0);
ok('riesgo usa rondo-usym', src.indexOf('rondo-usym') >= 0);

// Unidades en tarjetas (sin tabla) y con barra de orden.
ok('lista de unidades es contenedor .rondo-uni-list', src.indexOf('class="rondo-uni-list"') >= 0);
ok('hay plantilla de tarjeta rondo-uni-card', src.indexOf('rondo-uni-card') >= 0);
ok('selector de orden de unidades presente', src.indexOf('rondo-uni-orden') >= 0);
ok('sin thead en unidades', src.indexOf('<tbody id="rondo-body">') < 0);
// La delegacion de eventos usa .fila (no tr.fila).
ok('delegacion usa closest(".fila")', src.indexOf("closest('.fila')") >= 0 || src.indexOf('closest(".fila")') >= 0);

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
