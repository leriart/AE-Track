/*
 * Pruebas de los helpers de UI de Rondo: ordenamiento, estado vacio y escala.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { ARCHIVO, src } = require('./_source.js');

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
ok('DEFAULTS.vozMotor (online por defecto)', /vozMotor:\s*'online'/.test(src));
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

// Cada par de iconos con la misma intencion visual debe tener paths distintos.
// Antes varios pares (warn/riesgo, alertas/mute, pin/zone) eran el mismo path.
(function () {
    const m = src.match(/const NA_ICONS = Object\.freeze\(\{([\s\S]*?)\n    \}\);/);
    if (!m) return;
    const body = m[1];
    // Extrae clave -> array de paths.
    const re = /^\s{8}([a-zA-Z0-9_]+):\s*\[([\s\S]*?)\],?\s*$/gm;
    const icons = {};
    let mm;
    while ((mm = re.exec(body)) !== null) {
        const key = mm[1];
        // Extrae todos los strings entre comillas simples.
        const paths = (mm[2].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
        icons[key] = paths.join('|');
    }
    // Pares que DEBEN ser distintos (cada uno un icono Ant Design distinto).
    const pares = [
        ['warn', 'riesgo'],        // triangulo vs llama
        ['alertas', 'mute'],       // campana outlined vs campana filled
        ['pin', 'zone'],           // pin relleno vs pin outlined
        ['clear', 'close'],        // papelera vs X
        ['ok', 'error'],           // check en circulo vs X en circulo
        ['expand', 'collapse'],    // + en cuadrado vs - en cuadrado
        ['down', 'up'],            // chevron abajo vs chevron arriba
        ['right', 'left'],         // chevron derecha vs chevron izquierda
        ['csv', 'upload']          // documento vs nube con flecha
    ];
    for (const [a, b] of pares) {
        ok('iconos distintos: ' + a + ' vs ' + b, icons[a] !== icons[b],
            a + ' y ' + b + ' comparten path (deben ser iconos Ant Design distintos)');
    }
    // Cada uno debe tener al menos un path SVG no vacio.
    for (const key of Object.keys(icons)) {
        ok('icono ' + key + ' tiene path SVG', icons[key].length > 0);
    }
})();
// El bug del ternario del mute (sil ? UIS.mute : UIS.mute) debe estar
// corregido: ambos branches del ternario deben ser iconos distintos.
ok('bug mute corregido: ternario usa iconos distintos en tarjeta de unidad',
    !/\(sil \? UIS\.mute : UIS\.mute\)/.test(src));
ok('bug mute corregido: ternario en menu contextual usa iconos distintos',
    !/silenciado \? UIS\.mute : UIS\.mute/.test(src));

// Test de voz: boton Probar/Detener + texto editable en Ajustes > Avisos.
ok('boton Probar voz existe', /id="c-voz-test"/.test(src));
ok('boton Detener voz existe', /id="c-voz-detener"/.test(src));
ok('texto de prueba editable existe', /id="c-voz-test-text"/.test(src));
ok('frase por defecto del test existe', /vozTest:\s*'[^']*'/.test(src));
ok('icono SoundOutlined en NA_ICONS', /\bspeak:\s*\['/.test(src));

// IA de razonamiento: pestana en Configuracion + 3 proveedores + handler.
ok('pestana IA en configuracion', /data-cfg="ia"/.test(src));
ok('proveedor DeepSeek', /deepseek-chat/.test(src));
ok('proveedor NVIDIA NIM', /integrate\.api\.nvidia\.com/.test(src));
ok('proveedor Kimi for Coding (/coding/v1)', /api\.kimi\.ai\/coding\/v1\/chat\/completions/.test(src));
ok('modelo Kimi for Coding por defecto', /kimi-for-coding/.test(src));
ok('proveedor Moonshot (api.moonshot.ai)', /api\.moonshot\.ai\/v1\/chat\/completions/.test(src));
ok('proveedor MiniMax', /api\.minimax\.io\/v1\/chat\/completions/.test(src));
ok('proveedor Personalizado (custom)', /custom:\s*\{[\s\S]*?Personalizado/.test(src));
ok('IA_SYSTEM prompt estructurado JSON', /"veredicto":\s*"falso_positivo" \| "normal" \| "sospechoso" \| "critico"/.test(src));
ok('boton Probar conexion IA existe', /id="c-ia-test"/.test(src));
ok('boton Borrar API key IA existe', /id="c-ia-clear"/.test(src));
ok('campo API key IA existe', /id="c-ia-key"/.test(src));
ok('campo modelo IA existe', /id="c-ia-modelo"/.test(src));
ok('campo endpoint IA existe', /id="c-ia-endpoint"/.test(src));
ok('default iaEndpoint en DEFAULTS', /iaEndpoint:\s*''/.test(src));
ok('la IA usa iaEndpoint si esta definido', /String\(cfg\.iaEndpoint \|\| ''\)\.trim\(\) \|\| prov\.endpoint/.test(src));
ok('pista 401 en el error de la IA', /endpoint '\s*\+\s*endpoint/.test(src) || /Revisa que la API key corresponda/.test(src));
ok('pista 404 (ruta del endpoint) en la IA', /La RUTA del endpoint no existe/.test(src));
ok('pista 429 (rate limit) en la IA', /Limite de uso alcanzado/.test(src));
ok('pista 400 (parametro rechazado) en la IA', /El modelo rechazo un parametro/.test(src));

// temperature/max_tokens OPCIONALES: si no se definen, se omiten para no
// romper modelos que solo aceptan temperature=1 (p. ej. Kimi for Coding).
ok('temperature NO va fija en el body', !/temperature:\s*0\.2/.test(src));
ok('temperature opcional en el body', /if \(cfg\.iaTemperature !== ''[\s\S]*?body\.temperature = Number\(cfg\.iaTemperature\)/.test(src));
ok('max_tokens opcional en el body', /if \(cfg\.iaMaxTokens !== ''[\s\S]*?body\.max_tokens =/.test(src));
ok('campo temperatura IA existe', /id="c-ia-temp"/.test(src));
ok('campo max tokens IA existe', /id="c-ia-maxtok"/.test(src));
ok('default iaTemperature en DEFAULTS', /iaTemperature:\s*''/.test(src));
ok('default iaMaxTokens en DEFAULTS', /iaMaxTokens:\s*''/.test(src));

// Indicador/toggle de IA en la cabecera (junto al tema).
ok('boton IA en cabecera existe', /id="rondo-ia"/.test(src));
ok('boton IA tiene badge de estado', /rondo-ia-badge/.test(src));
ok('boton IA arranca oculto sin key', /id="rondo-ia"[\s\S]{0,140}style="display:none"/.test(src));
ok('funcion paintIASwitch existe', /function paintIASwitch\(/.test(src));
ok('funcion toggleIA existe', /function toggleIA\(/.test(src));
ok('paintIASwitch llamada al inicio', /updateNoMolestar\(\);\s*\n\s*paintIASwitch\(\);/.test(src));
ok('paintIASwitch tras guardar config', /paintAlertas\(\);\s*\n\s*paintIASwitch\(\);/.test(src));
ok('click de rondo-ia ligado a toggleIA', /byId\('rondo-ia'\)\.addEventListener\('click', \(\) => toggleIA\(\)\)/.test(src));
ok('CSS ia-on con check', /rondo-ia-head\.ia-on \.rondo-ia-badge::after/.test(src));
ok('CSS ia-off con punto ambar', /rondo-ia-head\.ia-off \.rondo-ia-badge/.test(src));

// CORS: el script usa GM_xmlhttpRequest para las APIs de IA (que no
// mandan cabeceras CORS) y un helper httpRequest con fallback a fetch.
ok('grant GM_xmlhttpRequest', /\/\/ @grant\s+GM_xmlhttpRequest/.test(src));
ok('connect deepseek', /\/\/ @connect\s+api\.deepseek\.com/.test(src));
ok('connect nvidia', /\/\/ @connect\s+integrate\.api\.nvidia\.com/.test(src));
ok('connect kimi.ai', /\/\/ @connect\s+api\.kimi\.ai/.test(src));
ok('connect moonshot', /\/\/ @connect\s+api\.moonshot\.ai/.test(src));
ok('connect minimax', /\/\/ @connect\s+api\.minimax\.io/.test(src));
ok('connect streamelements (TTS)', /\/\/ @connect\s+api\.streamelements\.com/.test(src));
ok('connect google translate (TTS)', /\/\/ @connect\s+translate\.google\.com/.test(src));
ok('connect comodin', /\/\/ @connect\s+\*/.test(src));
ok('helper gmXhr existe', /function gmXhr\(/.test(src));
ok('helper httpRequest existe', /function httpRequest\(/.test(src));
ok('alias PAGE (unsafeWindow)', /const PAGE = \(typeof unsafeWindow !== 'undefined' && unsafeWindow\) \? unsafeWindow : window/.test(src));
ok('IA usa httpRequest (no fetch directo)', /async function aiLlamarProveedor[\s\S]*?httpRequest\(\{/.test(src));
ok('Overpass POIs usa httpRequest', /async function aiOverpassPois[\s\S]*?httpRequest\(\{/.test(src));
ok('wialon via PAGE (no global crudo)', /function session\(\) \{ return PAGE\.wialon\.core\.Session\.getInstance\(\); \}/.test(src));
ok('wialonReady via PAGE', /const w = PAGE\.wialon;/.test(src));
ok('sin fetch directo al endpoint de IA', !/await fetch\(endpoint/.test(src));

// Sandbox: los eventos y constructores del realm de la pagina (PAGE) son
// necesarios para que React (Wialon) y las APIs del navegador funcionen.
ok('eventos via PAGE.Event', /new PAGE\.Event\('input'/.test(src));
ok('KeyboardEvent via PAGE', /new PAGE\.KeyboardEvent\(/.test(src));
ok('MouseEvent via PAGE (doubleClick)', /new PAGE\.MouseEvent\(tipo/.test(src));
ok('MouseEvent via PAGE (cerrar ventanas)', /new PAGE\.MouseEvent\('click'/.test(src));
ok('HTMLInputElement via PAGE', /PAGE\.HTMLInputElement\.prototype/.test(src));
ok('sin new MouseEvent crudo', !/new MouseEvent\(/.test(src));
ok('sin new Event crudo', !/new Event\('input'/.test(src));
ok('sin HTMLInputElement crudo', !/window\.HTMLInputElement/.test(src));
ok('SpeechSynthesisUtterance via pageCtor', /pageCtor\('SpeechSynthesisUtterance'\)/.test(src) && /new Utter\(text\)/.test(src));
ok('Audio via pageCtor', /pageCtor\('Audio'\)/.test(src) && /new A\(src\)/.test(src));
ok('TTS baja bytes por GM (salta CORS/CSP)', /function _ttsBytesViaGM\(/.test(src) && /responseType: 'arraybuffer'/.test(src));
ok('TTS reproduce con Web Audio (decodeAudioData)', /decodeAudioData\(data\)/.test(src));
ok('TTS fallback a <audio> con blob', /function _ttsPlayBlob\(/.test(src) && /createObjectURL\(new B\(\[bytes\]/.test(src));
ok('TTS fallback final a URL directa', /return _ttsPlayUrl\(url, onEnd, onError\)/.test(src));
ok('Notification via PAGE', /PAGE\.Notification/.test(src));
ok('DOMMatrixReadOnly via PAGE', /PAGE\.DOMMatrixReadOnly/.test(src));
ok('helper pageCtor existe', /function pageCtor\(nombre\)/.test(src));
ok('speak devuelve boolean', /return speakOnline\(txt\)/.test(src) && /return speakGoogle\(txt\)/.test(src));
ok('ttsmp3 como proveedor online', /ttsmp3\.com\/makemp3_new\.php/.test(src));
ok('cadena online ttsmp3 -> StreamElements -> Google', /speakTtsmp3\(text, voz, aStreamElements\)/.test(src) && /_ttsPlay\(url, null, aGoogle\)/.test(src));
ok('voz Lupe (es-US)', /v: 'Lupe'/.test(src));
ok('connect ttsmp3', /\/\/ @connect\s+ttsmp3\.com/.test(src));
ok('speakWeb fallback a online', /if \(speakWeb\(txt\)\) return true;[\s\S]*?return speakOnline\(txt\)/.test(src));
ok('probarVoz existe', /function probarVoz\(/.test(src));
ok('status de voz en la UI', /id="c-voz-status"/.test(src));
ok('boton Probar voz llama probarVoz', /vozTestBtn\.addEventListener\('click', \(\) => probarVoz\(\)\)/.test(src));
ok('sin watchdog de voz (evita doble/retardo)', !/_ttsWatchdog/.test(src));
ok('probarVoz prueba aunque Voz este off', /el test suena aunque "Voz" este desactivada/.test(src));
ok('probarVoz lee los desplegables (no la config guardada)', /const voz = selVoz \? selVoz\.value : ''/.test(src));
ok('probarVoz avisa si cae a Google', /StreamElements saturado/.test(src));
ok('reintentos de TTS (rate limit)', /recuperable && n < max/.test(src));
ok('marca de uso de Google', /_ttsUsandoGoogle = true/.test(src));
ok('StreamElements como fallback', /return speakOnline\(txt\)/.test(src));
ok('voz reporta error de sintesis', /error de sintesis/.test(src));
ok('guarda de generacion de voz', /gen !== _ttsGen/.test(src));
ok('cache de buffers de voz', /const _ttsCache = new Map\(\)/.test(src) && /_ttsCache\.get\(url\)/.test(src));
ok('voz web es sincrona (sin espera)', /if \(speakWeb\(txt\)\) return true;[\s\S]{0,120}return speakOnline\(txt\)/.test(src));
ok('default de motor de voz = online', /vozMotor: 'online'/.test(src));
ok('migracion de voz en Linux', /rondo\.api\.vozLinux/.test(src));

// Voces: solo espanol.
(function () {
    const m = src.match(/const TTS_ONLINE_VOCES = Object\.freeze\(\[([\s\S]*?)\]\);/);
    if (!m) { ok('TTS_ONLINE_VOCES parseable', false); return; }
    const langs = (m[1].match(/l:\s*'([^']+)'/g) || []).map((s) => s.replace(/^l:\s*'|'$/g, ''));
    ok('TTS_ONLINE_VOCES solo espanol', langs.length > 0 && langs.every((l) => l.indexOf('es') === 0), langs.join(','));
})();
ok('selector de idioma solo espanol', /Idioma de voz[\s\S]{0,400}?c-voz-lang[\s\S]{0,400}?<\/select>/.test(src)
    && !/c-voz-lang[\s\S]{0,400}?en-GB/.test(src));
ok('voces del navegador filtradas a es', /const voces = todas\.filter\(\(v\) => String\(v\.lang \|\| ''\)\.toLowerCase\(\)\.indexOf\('es'\) === 0\)/.test(src));
ok('Overpass para POIs en aiContexto', /amenity"~"workshop\|fuel\|parking/.test(src));
ok('boton IA en alertas', /rondo-ia-btn/.test(src));
ok('veredicto IA en alertas', /rondo-ia-verdict/.test(src));
ok('defaults IA en bloque DEFAULTS', /iaHabilitada:\s*false/.test(src));
ok('proveedor por defecto DeepSeek en DEFAULTS', /iaProveedor:\s*'deepseek'/.test(src));

// v5.14: analisis en lote + resumen narrativo del informe.
ok('version presente en @UserScript', /@version\s+\d+\.\d+\.\d+/.test(src));
ok('funcion aiAnalizarLote existe', /async function aiAnalizarLote\(/.test(src));
ok('funcion aiResumenDia existe', /async function aiResumenDia\(/.test(src));
ok('prompt IA_SYSTEM_LOTE definido', /const IA_SYSTEM_LOTE = String\.raw/.test(src));
ok('prompt IA_SYSTEM_RESUMEN definido', /const IA_SYSTEM_RESUMEN = String\.raw/.test(src));
ok('wrapper aiLlamarProveedorPrompt existe', /async function aiLlamarProveedorPrompt\(/.test(src));
ok('cache IA: iaCacheGet/Set/Limpiar', /function iaCacheGet\(/.test(src) && /function iaCacheSet\(/.test(src) && /function iaCacheLimpiar\(/.test(src));
ok('contador diario IA: iaContadorHoy/Sumar', /function iaContadorHoy\(/.test(src) && /function iaContadorSumar\(/.test(src));
ok('guard iaLimiteExcedido', /function iaLimiteExcedido\(/.test(src));
ok('default iaBatchMax = 25', /iaBatchMax:\s*25/.test(src));
ok('default iaResumenInforme = true', /iaResumenInforme:\s*true/.test(src));
ok('default iaLimiteDiario = 200', /iaLimiteDiario:\s*200/.test(src));
ok('default iaCacheTTL = 21600 (6h)', /iaCacheTTL:\s*21600/.test(src));
ok('clave sessionStorage iaCache', /iaCache:\s*'rondo\.api\.s\.iaCache'/.test(src));
ok('boton Analizar lote en cabecera Avisos', /id="rondo-ia-batch"/.test(src));
ok('boton Analizar lote arranca oculto', /id="rondo-ia-batch"[\s\S]{0,200}display:none/.test(src));
ok('toggle c-ia-resumen-on existe', /checkRow\('c-ia-resumen-on'/.test(src));
ok('input c-ia-batchmax existe', /numRow\('c-ia-batchmax'/.test(src));
ok('input c-ia-limite existe', /numRow\('c-ia-limite'/.test(src));
ok('status de uso IA c-ia-uso existe', /id="c-ia-uso"/.test(src));
ok('informe inserta bloque ## Resumen IA', /## Resumen IA/.test(src));
ok('informe genera placeholder hasta recibir IA', /_Generando resumen con IA/.test(src));
ok('paintIABatchBtn existe', /function paintIABatchBtn\(/.test(src));
ok('paintIAUso existe', /function paintIAUso\(/.test(src));
ok('aiAnalizarLoteUI existe', /async function aiAnalizarLoteUI\(/.test(src));
ok('exportInforme llama aiResumenDia cuando procede', /exportInforme\)[\s\S]{0,4000}aiResumenDia/.test(src));
ok('save handler recoge iaBatchMax', /cf\.iaBatchMax = clamp/.test(src));
ok('save handler recoge iaResumenInforme', /cf\.iaResumenInforme = !!iaResumenEl\.checked/.test(src));
ok('save handler recoge iaLimiteDiario', /cf\.iaLimiteDiario = clamp/.test(src));

// v5.14: deteccion de patrones en la bitacora.
ok('prompt IA_SYSTEM_PATRONES definido', /const IA_SYSTEM_PATRONES = String\.raw/.test(src));
ok('funcion aiPatrones existe', /async function aiPatrones\(/.test(src));
ok('funcion aiPatronesUI existe', /async function aiPatronesUI\(/.test(src));
ok('funcion aplicarSugerenciaIA existe', /function aplicarSugerenciaIA\(/.test(src));
ok('boton Detectar patrones en pestana IA', /id="c-ia-patrones"/.test(src));
ok('prompt de patrones lista parametros ajustables (v5.14.2: sin comillas)', /\bpollMs\b[\s\S]{0,200}\bofflineMin\b[\s\S]{0,200}\bgpsMin\b/.test(src));
ok('prompt de patrones exige JSON con patrones y sugerencias', /"patrones":[\s\S]{0,200}"sugerencias":/.test(src));
ok('aiPatrones valida minimo 10 avisos', /lista\.length < 10[\s\S]{0,80}Se necesitan al menos 10 avisos/.test(src));
ok('aiPatrones envia parametrosActuales al prompt', /\bpollMs\b[\s\S]{0,400}parametrosActuales/.test(src));
ok('aplicarSugerenciaIA valida parametro conocido', /if \(!['"]\(s && s\.parametro['"]\)/.test(src) || /if \(!s \|\| !s\.parametro\) return;/.test(src));
ok('aiPatronesUI engancha handler por sugerencia', /rondo-ia-aplicar[\s\S]{0,2000}aplicarSugerenciaIA/.test(src));
ok('abrirDialogo soporta onOpen', /if \(typeof opts\.onOpen === 'function'\)[\s\S]{0,200}opts\.onOpen\(el\)/.test(src));
ok('save handler no requiere cambios para patrones', !/c-ia-patrones[\s\S]{0,300}cf\.ia/.test(src));

// v5.14.2: detectar patrones robusto.
ok('IA_SYSTEM_PATRONES recortado (sin descripcion de rangos por parametro)', /pollMs[\s\S]{0,500}partidaHoras[\s\S]{0,200}Devuelve SOLO/.test(src));
ok('aiPatrones limite de muestra a 80 max', /Math\.max\(15, \(\+APP\.config\.iaBatchMax \|\| 25\) \* 2\)\), 15, 80/.test(src));
ok('aiPatrones detalle truncado a 80 chars', /a\.detalle \|\| ''\)\.slice\(0, 80\)/.test(src));
ok('aiPatrones parametrosActuales desde DEFAULTS', /DEFAULTS \|\| {}/.test(src) && /params = \['pollMs'/.test(src));
ok('aiPatrones valida shouldWatch con try/catch', /try \{ return shouldWatch\(u\); \} catch \(_\) \{ return false; \}/.test(src));
ok('extraerPatronesDeTexto fallback existe', /function extraerPatronesDeTexto\(texto\)/.test(src));
ok('extraerPatronesDeTexto usa regex para sugerencias', /sugRegex[\s\S]{0,300}valor_sugerido/.test(src));
ok('extraerPatronesDeTexto usa regex para patrones', /patRegex[\s\S]{0,300}descripcion/.test(src));
ok('aiPatrones llama fallback si JSON parseable', /reparado[\s\S]{0,400}extraerPatronesDeTexto/.test(src));
ok('extraerPatronesDeTexto marca reparadoDeTexto', /r\.reparadoDeTexto = true/.test(src));
ok('aiPatronesUI muestra error en dialog con pista', /parse/.test(src) || /400/.test(src));
ok('aiPatronesUI dialog distingue 401/429/400/timeout', /401\|403/.test(src) && /429/.test(src) && /400/.test(src));
ok('aiPatronesUI muestra respuesta cruda del modelo en details', /details[\s\S]{0,500}Respuesta cruda/.test(src));
ok('aiPatronesUI try/catch con dialog de error interno', /\} catch \(e\) \{[\s\S]{0,1500}Error interno al detectar patrones/.test(src));
ok('aiPatronesUI limpia setBusy en finally', /\} finally \{[\s\S]{0,100}setBusy\(btn, false\)/.test(src));
ok('chip de version dentro del h3', /<h3>[^<]+<button type="button" id="rondo-version-chip"/.test(src));
ok('chip CSS mas compacto (18px height)', /height:18px/.test(src));
ok('chip CSS no es .rondo-iconbtn (estilo inline)', !/#rondo-panel\s+\.rondo-iconbtn[\s\S]{0,400}#rondo-version-chip/.test(src));

// v5.14.3: dialogo de error IA rico (endpoint, tips, cambio rapido).
ok('helper mostrarDialogoErrorIA existe', /function mostrarDialogoErrorIA\(/.test(src));
ok('helper muestra endpoint en monospace', /font-family:monospace[\s\S]{0,500}word-break:break-all/.test(src));
ok('helper detecta 400/401/429/timeout/JSON', /context length[\s\S]{0,3000}timeout\|red/.test(src));
ok('helper tiene tips por proveedor', /tipsPorProv[\s\S]{0,3000}kimi:/.test(src));
ok('helper tiene tip para Kimi', /kimi: 'Kimi for Coding/.test(src));
ok('helper tiene tip para Moonshot', /moonshot: 'Moonshot/.test(src));
ok('helper tiene tip para DeepSeek', /deepseek: 'DeepSeek/.test(src));
ok('helper sugiere cambiar proveedor (botones)', /rondo-ia-cambiar-prov/.test(src));
ok('helper genera botones de deepseek/minimax/nvidia', /fiables\s*=\s*\['deepseek',\s*'minimax',\s*'nvidia'\]/.test(src));
ok('helper filtra proveedor actual', /\.filter\(\(k\) => k !== provKey\)/.test(src));
ok('helper muestra respuesta cruda en details', /Respuesta cruda del modelo/.test(src));
ok('aiPatronesUI usa helper', /mostrarDialogoErrorIA\(r,\s*'Error al detectar patrones'\)/.test(src));
ok('aiAnalizarLoteUI usa helper', /mostrarDialogoErrorIA\(r,\s*'Error al analizar lote'\)/.test(src));
ok('helper cambia config.iaProveedor al click', /APP\.config\.iaProveedor = nuevo/.test(src));
ok('helper avisa al cambiar proveedor', /adviceOk\('Proveedor cambiado a/.test(src));

// v5.14.4: regla "detenida en geocerca" con el texto literal
// "La unidad X se encuentra detenida en la geocerca Y".
ok('default reglas.geocercaDetenido = true', /geocercaDetenido:\s*true/.test(src));
ok('default geocercaDetenidoMin = 5', /geocercaDetenidoMin:\s*5/.test(src));
ok('funcion reglaGeocercaDetenido existe', /function reglaGeocercaDetenido\(/.test(src));
ok('reglaGeocercaDetenido usa texto literal pedido', /se encuentra detenida en la geocerca/.test(src));
ok('reglaGeocercaDetenido usa R.zona como nombre de geocerca', /en la geocerca ' \+ R\.zona/.test(src));
ok('reglaGeocercaDetenido filtra por velocidad', /velSuavizada\(info, st\) > 1\.5 \|\| !R\.zona/.test(src));
ok('reglaGeocercaDetenido rearma al moverse/salir', /R\.geoDetenidoDesde = null/.test(src));
ok('reglaGeocercaDetenido dispara una vez por episodio', /R\.geoDetenidoAlerta = true/.test(src));
ok('toggle c-r-geo-det existe', /checkRow\('c-r-geo-det'/.test(src));
ok('input c-geo-det-min existe', /numRow\('c-geo-det-min'/.test(src));
ok('save handler recoge reglas.geocercaDetenido', /cf\.reglas\.geocercaDetenido = !!geoDetEl\.checked/.test(src));
ok('save handler recoge geocercaDetenidoMin', /cf\.geocercaDetenidoMin = clamp\(isoNum\(geoDetMinEl\.value/.test(src));
ok('precarga UI de c-r-geo-det', /cRGeoDet\.checked = !!APP\.config\.reglas\.geocercaDetenido/.test(src));
ok('R inicializa geoDetenidoDesde/Alerta', /geoDetenidoDesde: prev \? prev\.geoDetenidoDesde : null/.test(src));
ok('evaluateUnit llama reglaGeocercaDetenido', /reglaGeocerca\(st, prev, R, info, etq\)[\s\S]{0,200}reglaGeocercaDetenido\(st, R, info, etq\)/.test(src));
ok('reglaGeocercaDetenido usa severity bajo', /regla: 'geocercaDetenido', sev: 'bajo'/.test(src));
ok('reglaGeocercaDetenido respeta geocercaDetenidoMin >= 1', /Math\.max\(1, \+APP\.config\.geocercaDetenidoMin/.test(src));

// v5.14.6: fix de los dos botones Cerrar + nueva tab Chat IA.
ok('abrirDialogo auto-hide cancel si mismo texto que OK', /cancelText !== okText/.test(src));
ok('abrirDialogo conserva cancel si cancel === false', /opts\.cancel !== false && cancelText !== okText/.test(src));
ok('tab Chat IA existe', /data-tab="chat"/.test(src));
ok('tab Chat IA arranca oculta (display:none)', /tab-ia[\s\S]{0,80}style="display:none"/.test(src));
ok('wrap-chat existe', /id="rondo-wrap-chat"/.test(src));
ok('chat-log existe', /id="rondo-chat-log"/.test(src));
ok('chat-input existe', /id="rondo-chat-input"/.test(src));
ok('chat-send button existe', /id="rondo-chat-send"/.test(src));
ok('chat-clear button existe', /id="rondo-chat-clear"/.test(src));
ok('paintTabsChat existe', /function paintTabsChat\(/.test(src));
ok('paintTabsChat muestra solo si IA habilitada + key', /APP\.config\.iaHabilitada && APP\.config\.iaApiKey/.test(src));
ok('paintTabsChat redirige a dash si tab chat estaba abierta', /APP\.tab === 'chat'[\s\S]{0,100}APP\.tab = 'dash'/.test(src));
ok('pintarChat existe', /function pintarChat\(/.test(src));
ok('pintarChat muestra empty state con ejemplos', /Preguntale algo a la IA/.test(src));
ok('pintarChat usa rondo-chat-bubble', /class="rondo-chat-bubble"/.test(src));
ok('pintarChat auto-scroll al fondo', /log\.scrollTop = log\.scrollHeight/.test(src));
ok('pintarChat usa animacion de entrada', /@keyframes rondo-chat-in/.test(src));
ok('pintarChat usa typing indicator', /@keyframes rondo-chat-typing/.test(src));
ok('aiChatLlamar existe', /async function aiChatLlamar\(/.test(src));
ok('aiChatLlamar usa iaLimiteExcedido', /aiChatLlamar[\s\S]{0,1500}iaLimiteExcedido\(\)/.test(src));
ok('aiChatLlamar construye messages con system + historial', /role: m\.role === 'ia' \? 'assistant' : m\.role/.test(src));
ok('aiChatLlamar contabiliza la llamada', /async function aiChatLlamar[\s\S]{0,4000}iaContadorSumar/.test(src));
ok('chatEnviar existe', /async function chatEnviar\(/.test(src));
ok('chatEnviar verifica IA habilitada', /APP\.config\.iaHabilitada \|\| !APP\.config\.iaApiKey/.test(src));
ok('chatEnviar abre Ajustes si IA no configurada', /abrirCfg\(\)[\s\S]{0,200}data-cfg="ia"/.test(src));
ok('chatEnviar envia ultimos 20 mensajes', /slice\(0, -20\)/.test(src) || /slice\(-20\)/.test(src));
ok('chatEnviar maneja errores con mensaje tipo error', /role: 'error'/.test(src));
ok('chatEnviar guarda en sessionStorage', /guardarChat\(\)/.test(src));
ok('limpiarChat existe', /function limpiarChat\(/.test(src));
ok('limpiarChat borra sessionStorage', /sessionStorage\.removeItem\(CHAT_KEY\)/.test(src));
ok('chatContextoFlota existe', /function chatContextoFlota\(/.test(src));
ok('chatContextoFlota devuelve alertasHoy y porSeveridad', /alertasHoy: hoyFiltrado\.length[\s\S]{0,200}porSeveridad/.test(src));
ok('CHAT_SYS es string.raw con reglas', /const CHAT_SYS = String\.raw[\s\S]{0,5000}sin emojis/.test(src));
ok('CHAT_SYS menciona Mexico y espanol', /Mexico[\s\S]{0,2000}espanol/.test(src));
ok('bindings: chatSendBtn -> chatEnviar', /chatSendBtn\.addEventListener\('click', \(\) => chatEnviar\(\)\)/.test(src));
ok('bindings: Enter envia, Shift+Enter inserta nueva linea', /e\.key === 'Enter' && !e\.shiftKey/.test(src));
ok('bindings: textarea autoresize', /Math\.min\(140, chatInput\.scrollHeight\)/.test(src));
ok('bindings: chatClearBtn con confirmacion', /rondoConfirm\('Limpiar conversacion'/.test(src));
ok('setTab incluye chat en ids', /'dash', 'unidades', 'alertas', 'rutas', 'caravana', 'chat', 'zonas'/.test(src));
ok('setTab pinta chat al cambiar', /else if \(name === 'chat'\) pintarChat\(\)/.test(src));
ok('toggleIA llama paintTabsChat', /paintIABatchBtn\(\);[\s\S]{0,200}paintTabsChat/.test(src));
ok('cargarChat al arranque', /cargarChat\(\);[\s\S]{0,200}paintTabsChat\(\)/.test(src));
ok('CSS chat: bubble user alineado derecha', /\.rondo-chat-msg\.user\{align-self:flex-end/.test(src));
ok('CSS chat: bubble ia alineado izquierda', /\.rondo-chat-msg\.ia\{align-self:flex-start/.test(src));
ok('CSS chat: typing indicator', /\.rondo-chat-typing span\{width:6px/.test(src));

// v5.14.7: chat sin parpadeo + toggle "Toda la flota".
ok('default chatTodaFlota = false', /chatTodaFlota:\s*false/.test(src));
ok('checkbox rondo-chat-all existe', /id="rondo-chat-all"/.test(src));
ok('label rondo-chat-scope existe', /class="rondo-chat-scope"/.test(src));
ok('CSS switch chat-scope existe', /\.rondo-chat-scope-track\{/.test(src));
ok('CSS switch checked mueve el dot', /input:checked \+ \.rondo-chat-scope-track \.rondo-chat-scope-dot\{transform:translateX\(13px\)/.test(src));
ok('chatContextoFlota respeta chatTodaFlota', /const toda = !!APP\.config\.chatTodaFlota/.test(src));
ok('chatContextoFlota filtra por shouldWatch si no toda', /if \(toda\) return true;[\s\S]{0,120}shouldWatch\(u\)/.test(src));
ok('chatContextoFlota devuelve alcance', /alcance: toda \? 'toda la flota' : 'solo unidades vigiladas'/.test(src));
ok('chatContextoFlota devuelve unidadesEnAlcance', /unidadesEnAlcance: unidadesRaw\.length/.test(src));
ok('helper chatMsgHTML existe', /function chatMsgHTML\(/.test(src));
ok('helper chatEmptyHTML existe', /function chatEmptyHTML\(/.test(src));
ok('helper setChatTyping existe', /function setChatTyping\(/.test(src));
ok('helper scrollChatBottom existe', /function scrollChatBottom\(/.test(src));
ok('helper appendMensajeChat existe', /function appendMensajeChat\(/.test(src));
ok('helper renderChatLog existe', /function renderChatLog\(/.test(src));
ok('pintarChat NO re-renderiza si el log tiene hijos', /if \(log\.children\.length\) return;/.test(src));
ok('pintarChat sincroniza el checkbox chat-all', /allEl\.checked = !!APP\.config\.chatTodaFlota/.test(src));
ok('appendMensajeChat quita el empty state', /const vacio = log\.querySelector\('\.rondo-chat-empty'\)/.test(src));
ok('scrollChatBottom no mueve si el usuario scrolleo arriba', /lejos < 120/.test(src));
ok('chatEnviar usa appendMensajeChat (no re-render)', /appendMensajeChat\(userMsg\)/.test(src));
ok('chatEnviar usa setChatTyping', /setChatTyping\(true\)/.test(src) && /setChatTyping\(false\)/.test(src));
ok('chatEnviar no llama pintarChat', !/async function chatEnviar[\s\S]{0,2000}pintarChat\(\)/.test(src));
ok('bindings: chatAllEl guarda en config', /APP\.config\.chatTodaFlota = !!chatAllEl\.checked/.test(src));
ok('bindings: chatAllEl persiste en LS', /chatAllEl\.addEventListener\('change'[\s\S]{0,400}writeJSON\(LS\.cfg/.test(src));
ok('limpiarChat usa renderChatLog', /limpiarChat[\s\S]{0,300}renderChatLog\(\)/.test(src));

// v5.14.8: manual como contexto de la IA + contexto de flota enriquecido.
ok('RONDO_DOC existe como String.raw', /const RONDO_DOC = String\.raw/.test(src));
ok('RONDO_DOC describe el panel y las tabs', /RONDO_DOC[\s\S]{0,4000}Dashboard[\s\S]{0,2000}Unidades[\s\S]{0,2000}Chat IA/.test(src));
ok('RONDO_DOC lista reglas', /Sin senal \(5 min\)[\s\S]{0,2000}Detenida en geocerca/.test(src));
ok('RONDO_DOC lista ajustes', /AJUSTES \(engranaje[\s\S]{0,2000}IA: habilitar/.test(src));
ok('RONDO_DOC lista atajos', /ATAJOS: Alt\+1..6/.test(src));
ok('CHAT_SYS inyecta RONDO_DOC', /=== MANUAL DE RONDO \(contexto de uso\) ===\n` \+ RONDO_DOC/.test(src));
ok('CHAT_SYS menciona las dos fuentes', /Tienes DOS fuentes de informacion/.test(src));
ok('chatContextoFlota incluye detalle por unidad', /detalle\.push\(\{[\s\S]{0,300}eco, placa: info\.placa/.test(src));
ok('chatContextoFlota incluye zona o null (fuera)', /zona: zona \|\| null/.test(src));
ok('chatContextoFlota cuenta unidadesFueraDeGeocerca', /unidadesFueraDeGeocerca: fueraDeGeocerca\.length/.test(src));
ok('chatContextoFlota lista offlineFueraDeGeocerca', /offlineFueraDeGeocerca: offlineFuera\.slice\(0, 40\)/.test(src));
ok('chatContextoFlota devuelve unidades[]', /unidades: detalle/.test(src));
ok('chatContextoFlota cap de detalle a 80', /detalle\.length < 80/.test(src));
ok('chatContextoFlota incluye geocercasCargadas', /geocercasCargadas: zonasCargadas/.test(src));
ok('chatContextoFlota incluye ecosFueraDeGeocerca', /ecosFueraDeGeocerca: fueraDeGeocerca\.slice\(0, 40\)/.test(src));
ok('chatContextoFlota lista geocercas con unidades dentro', /geocercas = zonasCargadas \? \(APP\.zonas \|\| \[\]\)\.slice\(0, 40\)/.test(src) && /unidadesDentro: dentro/.test(src));
ok('chatContextoFlota resumen de zonas de riesgo', /zonasDeRiesgo: riesgoResumen/.test(src));
ok('chatContextoFlota cuenta rutas activas', /rutasActivas: Object\.keys\(APP\.rutas \|\| \{\}\)\.length/.test(src));
ok('chatContextoFlota ultimosAvisos con detalle', /detalle: \(a\.detalle \|\| ''\)\.slice\(0, 160\)/.test(src));
ok('chatContextoFlota desconexionesHoy', /desconexionesHoy: desconexiones/.test(src));
ok('chatContextoFlota detecta zonas sin cargar', /const zonasCargadas = !!\(APP\.config\.loadZones && \(APP\.zonas \|\| \[\]\)\.length\)/.test(src));
ok('CHAT_SYS describe los campos del contexto', /unidades\[\]: por unidad -> eco, placa, estado/.test(src));
ok('CHAT_SYS advierte si geocercas no cargadas', /Si geocercasCargadas es false, NO afirmes que una unidad esta "fuera de geocerca"/.test(src));
ok('CHAT_SYS explica offlineFueraDeGeocerca', /offlineFueraDeGeocerca: unidades SIN SENAL y fuera de geocerca/.test(src));
ok('atajo Alt+7 abre chat', /'6': 'caravana', '7': 'chat'/.test(src));
ok('Alt+7 solo si IA configurada', /tabs\[e\.key\] !== 'chat' \|\| \(APP\.config\.iaHabilitada && APP\.config\.iaApiKey\)/.test(src));
ok('ayuda rapida menciona Chat IA', /<b>Chat IA<\/b>: consultas libres a la IA/.test(src));
ok('ayuda rapida tiene seccion Chat con la IA', /<h4>Chat con la IA<\/h4>/.test(src));
ok('ayuda rapida menciona Alt+7', /<kbd>Alt<\/kbd>\+<kbd>7<\/kbd>: Chat IA/.test(src));
ok('MANUAL.md tiene seccion Chat con la IA', /## Chat con la IA/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'MANUAL.md'), 'utf8')));
ok('MANUAL.md menciona las siete pestanas', /## Las siete pestanas/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'MANUAL.md'), 'utf8')));
ok('MANUAL.md lista regla Detenida en geocerca', /Detenida en geocerca \| Lleva parada dentro de una geocerca/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'MANUAL.md'), 'utf8')));
ok('MANUAL.md lista regla Aproximacion a zona de riesgo', /Aproximacion a zona de riesgo \| Una unidad en movimiento/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'MANUAL.md'), 'utf8')));
ok('MANUAL.md atajo Alt+7', /Alt.*\+.*7.*Chat IA/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'MANUAL.md'), 'utf8')));

// v5.14.1: sistema de updates rehecho.
ok('VER constante existe', /const VER = ['"]\d+\.\d+\.\d+['"]/.test(src));
ok('@version sincronizado con VER (dinamico)', (function () {
    const a = src.match(/@version\s+(\d+\.\d+\.\d+)/);
    const b = src.match(/const VER = ['"](\d+\.\d+\.\d+)['"]/);
    return !!(a && b && a[1] === b[1]);
})());
ok('@connect raw.githubusercontent.com', /\/\/ @connect\s+raw\.githubusercontent\.com/.test(src));
ok('@connect api.github.com', /\/\/ @connect\s+api\.github\.com/.test(src));
ok('parseVersionHeader null-safe', /if \(!text \|\| typeof text !== 'string'\) return null/.test(src));
ok('parseVersionHeader usa regex estricto', /parseVersionHeader[\s\S]{0,200}0-9/.test(src));
ok('cmpVersion null-safe', /if \(!a \|\| !b \|\| typeof a !== 'string' \|\| typeof b !== 'string'\) return 0/.test(src));
ok('parseVersionFromFilename existe', /function parseVersionFromFilename\(name\)/.test(src));
ok('autodetectarVER existe', /function autodetectarVER\(/.test(src));
ok('autodetectarVER usa document.currentScript', /document\.currentScript/.test(src));
ok('autodetectarVER usa GM_xmlhttpRequest', /const gm = gmXhr\(\)/.test(src));
ok('autodetectarVER avisa si VER declarado deriva', /VER declarado \([\s\S]+?\) no coincide con @version detectado/.test(src));
ok('fetchVersionRemota usa httpRequest (no fetch directo)', /async function fetchVersionRemota[\s\S]{0,500}httpRequest\(/.test(src));
ok('fetchVersionRemota no usa fetch directo', !/function fetchVersionRemota[\s\S]{0,400}await fetch\(/.test(src));
ok('fetchVersionDesdeChangelogs existe', /async function fetchVersionDesdeChangelogs\(/.test(src));
ok('UPDATE_CHANGELOGS_API apunta a api.github.com', /UPDATE_CHANGELOGS_API = 'https:\/\/api\.github\.com\/repos\/leriart\/AE-Track\/contents\/changelogs'/.test(src));
ok('comprobarActualizacion prueba multiples fuentes', /intentos\.push\(\{ fuente: 'main'/.test(src) && /intentos\.push\(\{ fuente: 'dev'/.test(src) && /intentos\.push\(\{ fuente: 'changelogs'/.test(src));
ok('estado unknown cuando todas las fuentes fallan', /APP\.update\.state = 'unknown'/.test(src));
ok('finalizarUpdate maneja available/ahead/current', /APP\.update\.state = 'available'[\s\S]{0,2000}APP\.update\.state = 'ahead'[\s\S]{0,2000}APP\.update\.state = 'current'/.test(src));
ok('guardarUpdatePersistente persiste lastCheck', /localStorage\.setItem\('rondo\.api\.update'/.test(src));
ok('cargarUpdatePersistente restaura lastCheck', /localStorage\.getItem\('rondo\.api\.update'\)[\s\S]{0,400}APP\.update\.lastCheck/.test(src));
ok('paintVersionChip existe', /function paintVersionChip\(/.test(src));
ok('chip de version en cabecera', /id="rondo-version-chip"/.test(src));
ok('CSS chip version color por estado', /rondo-version-chip\[data-estado=\\?"(available|current|ahead|checking|unknown|error)\\?"\]/.test(src));
ok('click del chip fuerza comprobacion', /verChip[\s\S]{0,1500}comprobarActualizacion\(\)/.test(src));
ok('doble click del chip abre Ajustes', /ahora - lastClickChip < 350[\s\S]{0,400}cfg="avanzado"/.test(src));
ok('intervalo de check a 6h (no 30min)', /UPDATE_CHECK_INTERVAL_MS = 6 \* 60 \* 60 \* 1000/.test(src) && /setInterval\(comprobarActualizacion, UPDATE_CHECK_INTERVAL_MS\)/.test(src));
ok('re-check al recuperar foco', /window\.addEventListener\('focus', focusHandler\)/.test(src) && /visibilitychange[\s\S]{0,300}focusHandler/.test(src));
ok('cargarUpdatePersistente al arranque', /cargarUpdatePersistente\(\);[\s\S]{0,400}autodetectarVER\(\)/.test(src));

// v5.14: regla predictiva de aproximacion a zona de riesgo.
ok('default riesgoPredictMinScore = 4', /riesgoPredictMinScore:\s*4/.test(src));
ok('default riesgoPredictBufferM = 500', /riesgoPredictBufferM:\s*500/.test(src));
ok('default riesgoPredictNocturno = false', /riesgoPredictNocturno:\s*false/.test(src));
ok('default riesgoPredictNocturnoDesde = 22:00', /riesgoPredictNocturnoDesde:\s*'22:00'/.test(src));
ok('default riesgoPredictNocturnoHasta = 05:00', /riesgoPredictNocturnoHasta:\s*'05:00'/.test(src));
ok('default reglas.riesgoPredict = false', /riesgoPredict:\s*false/.test(src));
ok('funcion reglaRiesgoPredict existe', /async function reglaRiesgoPredict\(/.test(src));
ok('toggle c-r-riesgo-pre existe', /checkRow\('c-r-riesgo-pre'/.test(src));
ok('input c-riesgo-pre-min existe', /numRow\('c-riesgo-pre-min'/.test(src));
ok('input c-riesgo-pre-buffer existe', /numRow\('c-riesgo-pre-buffer'/.test(src));
ok('input c-riesgo-pre-vel existe', /numRow\('c-riesgo-pre-vel'/.test(src));
ok('input c-riesgo-pre-cooldown existe', /numRow\('c-riesgo-pre-cooldown'/.test(src));
ok('check c-riesgo-pre-noct existe', /checkRow\('c-riesgo-pre-noct'/.test(src));
ok('input c-riesgo-pre-desde existe', /id="c-riesgo-pre-desde"/.test(src));
ok('input c-riesgo-pre-hasta existe', /id="c-riesgo-pre-hasta"/.test(src));
ok('save handler recoge reglas.riesgoPredict', /cf\.reglas\.riesgoPredict = !!riesgoPreEl\.checked/.test(src));
ok('save handler recoge riesgoPredictMinScore', /cf\.riesgoPredictMinScore = clamp\(isoNum\(riesgoPreMinEl\.value/.test(src));
ok('save handler recoge riesgoPredictBufferM', /cf\.riesgoPredictBufferM = clamp\(isoNum\(riesgoPreBufferEl\.value/.test(src));
ok('save handler recoge riesgoPredictNocturno', /cf\.riesgoPredictNocturno = !!riesgoPreNoctEl\.checked/.test(src));
ok('reglaRiesgoPredict valida ventana nocturna', /if \(!d \|\| !h \|\| !enVentanaHoraria\(ahora, d, h\)\) return;/.test(src));
ok('helpers parseHora/ahoraMinutos/enVentanaHoraria', /function parseHora\(/.test(src) && /function ahoraMinutos\(/.test(src) && /function enVentanaHoraria\(/.test(src));
ok('regla predictiva llama a haversine con prev.lat/prev.lon', /haversine\(prev\.lat, prev\.lon, zObj\.centro/.test(src));
ok('regla predictiva usa cooldowns por unidad+zona', /info\.clave \+ '::riesgoPredict::' \+ candidata\.id/.test(src));
ok('evaluateUnit llama reglaRiesgoPredict', /await reglaRiesgoSinSenal\(st, prev, R, info, etq\)[\s\S]{0,80}await reglaRiesgoPredict\(st, prev, R, info, etq\)/.test(src));
ok('regla predictiva filtra por velocidad minima', /riesgoPredictVelMin \|\| 5/.test(src) && /st\.vel < velMin/.test(src));
ok('regla predictiva exige distancia previa mayor', /distPrev > candidata\.dist \+ 5/.test(src));
ok('prompt patrones lista parametros con cooldownMin/giroGrados (sin comillas)', /\bcooldownMin\b[\s\S]{0,500}\bgiroGrados\b/.test(src));

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

// v5.15: rutas multipunto, municipios OSM, busqueda difusa, geocercas ampliadas.
ok('default desvioMunicipio = true', /desvioMunicipio:\s*true/.test(src));
ok('default desvioMunicipioM = 3000', /desvioMunicipioM:\s*3000/.test(src));
ok('default paradaLlegadaM = 150', /paradaLlegadaM:\s*150/.test(src));
ok('OSRM multipunto existe', /async function osrmRouteMulti\(/.test(src));
ok('A* multipunto existe', /async function astarRouteMulti\(/.test(src));
ok('planearRuta usa plan multipunto', /function planearRuta\(eco, destino/.test(src) && /Array\.isArray\(destino\.paradas\)/.test(src));
ok('estadoRuta reporta paradas', /totalParadas: paradas\.length/.test(src));
ok('reglaDestino alerta parada intermedia', /LLEGO A PARADA /.test(src));
ok('reglaDestino detecta regreso a base', /REGRESO A BASE/.test(src));
ok('desvio con tolerancia de municipio', /municipioEn\(st\.lat, st\.lon\)/.test(src) && /municipioDeRuta\(ruta, mun\)/.test(src));
ok('editor de paradas: modal', /rondo-plan-modal/.test(src));
ok('editor de paradas: modo secuencial/optimo', /id="rpm-modo"/.test(src) && /value="optimo"/.test(src));
ok('editor de paradas: buscador con sugerencias', /id="rpm-buscar"/.test(src) && /function catalogoParadas\(/.test(src));
ok('editor de paradas: funciones', /function abrirEditorParadas\(/.test(src) && /function guardarEditorParadas\(/.test(src));
ok('boton editar paradas en modal lista', /rondo-plan-open/.test(src));
ok('boton editar paradas en pestana Rutas', /rondo-plan-edit/.test(src));
ok('municipios OSM: parser Nominatim', /function municipioDesdeNominatim\(/.test(src) && /function municipioEn\(/.test(src));
ok('municipios: derivados de riesgo', /function recalcularMunicipiosRiesgo\(/.test(src));
ok('busqueda difusa: fuzzyScore', /function fuzzyScore\(/.test(src) && /function levenshteinAcotado\(/.test(src));
ok('optimizador de paradas', /function ordenarParadasOptimo\(/.test(src) && /function ordenarSegmento\(/.test(src));
ok('geocercas: KPIs', /id="rondo-geo-kpis"/.test(src));
ok('geocercas: buscador/orden/rol', /id="rondo-geo-buscar"/.test(src) && /id="rondo-geo-orden"/.test(src) && /id="rondo-geo-rol"/.test(src));
ok('geocercas: export CSV/GeoJSON', /function exportarGeocercasCSV\(/.test(src) && /function exportarGeocercasGeoJSON\(/.test(src));
ok('geocercas: usar como parada', /function elegirUnidadParaGeocerca\(/.test(src));
ok('IA: analisis de flota', /function aiAnalizarFlota\(/.test(src) && /const IA_SYSTEM_FLOTA/.test(src));
ok('IA: boton Analizar flota', /id="rondo-ia-flota"/.test(src) && /function aiFlotaUI\(/.test(src));
ok('IA: contexto de flota con rutas/municipios/config', /rutasResumen/.test(src) && /configResumen/.test(src) && /municipioActual/.test(src));
ok('ajustes: desvio municipio', /checkRow\('c-desvio-municipio'/.test(src) && /numRow\('c-desvio-municipio-m'/.test(src));
// v5.15: se elimino el modo flotante.
ok('sin codigo de modo flotante', src.indexOf('placePanel') < 0 && src.indexOf('savePanelPos') < 0 && src.indexOf('panelMode') < 0);
ok('sin CSS .dragging del panel', src.indexOf('#rondo-panel.dragging') < 0);

// v6.0.0: lista de unidades sin parpadeo, menu contextual anclado y botones rapidos.
ok('render incremental de tarjetas', /function renderLista\(/.test(src) && /function unidCardNode\(/.test(src) && /function unidCardUpdate\(/.test(src) && /_rondoItems/.test(src));
ok('paintTabla usa renderLista', /renderLista\(body, lista,/.test(src));
ok('estado vacio memoizado (no parpadea)', /body\._rondoVacio/.test(src));
ok('tarjeta se actualiza en el sitio (sin reescribir innerHTML)', /r\.velNum\.textContent = velTxt/.test(src) && /r\.rutaFill\.style\.width = pct/.test(src));
ok('botones rapidos por unidad', /class="u-quick"/.test(src) && /u-open/.test(src) && /u-route/.test(src) && /u-map/.test(src) && /u-watch/.test(src));
ok('CSS de botones rapidos', /\.rondo-uni-card \.u-quick/.test(src));
ok('menu contextual anula el transform base', /ctxEl\.style\.transform = 'none'/.test(src));
ok('menu contextual se ancla a la tarjeta', /function showMenu\(x, y, options, anchor\)/.test(src) && /anchor\.getBoundingClientRect/.test(src));
ok('menu contextual recibe la tarjeta', /copy-coords', icon: UIS\.copy, label: 'Copiar coordenadas' \}\s*\]\s*, card\)/.test(src));
ok('menu contextual con scroll y altura maxima', /#rondo-contexto\{[^}]*max-height:calc\(100vh - 16px\)/.test(src));
ok('click de botones rapidos por closest(button)', /u-route[\s\S]{0,400}abrirEditorParadas\(eco\)/.test(src) && /cl\.contains\('u-watch'\)/.test(src));
ok('velocidad suavizada (EMA)', /velSuave: \{\}/.test(src) && /function velSuavizada\(/.test(src) && /pv \* 0\.65 \+ st\.vel \* 0\.35/.test(src));
ok('area de geocerca: detecta poligono antes que circulo', /function _zonaEsCirculo\(/.test(src) && src.indexOf('if (z.t === 3 || (z.b && z.b.cen_x != null))') < 0);
ok('area de geocerca: shoelace y linea', /formula del area \(shoelace\)/.test(src) && /longitud x ancho/.test(src));

// v6.0.0: menus unificados de unidades/destinos/multipuntos y lista sin parpadeo.
ok('modal de unidades unificado', /Unidades y rutas/.test(src) && /id="rondo-modal-add-plan"/.test(src) && /id="rondo-modal-count"/.test(src));
ok('sintaxis de multipunto en el modal', /rondo-modal-sintaxis/.test(src) && /Tipos: <code>geo:<\/code>/.test(src));
ok('resumen de paradas por fila (chips)', /function resumenPlanHTML\(/.test(src) && /rondo-dest-chip/.test(src) && /rondo-dest-modo/.test(src));
ok('editor con motor seleccionable', /id="rpm-engine"/.test(src) && /_planEdit\.engine/.test(src));
ok('editor con vaciar y contador de paradas', /id="rpm-vaciar"/.test(src) && /rpm-count/.test(src));
ok('editor detecta coordenadas lat,lon', /if \(cm\) \{ tipo = 'coord'; coords = \{ lat: parseFloat\(cm\[1\]\)/.test(src));
ok('sugerencias con iconos por tipo', /icoTipo = \(t\) =>/.test(src));
ok('boton Unidades y rutas en herramientas', /id="rondo-unidades-menu"/.test(src));
ok('menu contextual unificado (sin ruta-plan/ruta-astar sueltos)', src.indexOf("id: 'ruta-plan'") < 0 && src.indexOf("id: 'ruta-astar'") < 0 && src.indexOf("id: 'ruta-paradas'") >= 0);
ok('tarjeta de unidad se actualiza por campos', /function unidCardNode\(/.test(src) && /function unidCardUpdate\(/.test(src) && src.indexOf('function renderCards(') < 0);

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
