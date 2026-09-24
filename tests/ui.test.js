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
ok('speak devuelve boolean', /if \(motor === 'online'\) return speakOnline\(txt\)/.test(src));
ok('speakWeb fallback a online', /if \(speakWeb\(txt\)\) return true;[\s\S]*?return speakOnline\(txt\)/.test(src));
ok('probarVoz existe', /function probarVoz\(/.test(src));
ok('status de voz en la UI', /id="c-voz-status"/.test(src));
ok('boton Probar voz llama probarVoz', /vozTestBtn\.addEventListener\('click', \(\) => probarVoz\(\)\)/.test(src));
ok('sin watchdog de voz (evita doble/retardo)', !/_ttsWatchdog/.test(src));
ok('probarVoz prueba aunque Voz este off', /El boton de prueba debe sonar aunque/.test(src));
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
