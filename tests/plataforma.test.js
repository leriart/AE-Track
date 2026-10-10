/*
 * Pruebas de la deteccion de metadatos de la plataforma (Wialon / AE-Track).
 *
 * El CMS publica un objeto global con nombre aleatorio (hash) que contiene
 * api_url, _skin_data, http_lang, title... Aqui comprobamos que lo localizamos
 * por su FORMA (no por su nombre) y que de ahi salen el acento del skin, el
 * nombre del sitio, la URL de la API y el idioma.
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

const metaDecl = (src.match(/let _rxMeta = null;/) || ['let _rxMeta = null;'])[0];
const codigo = 'const PAGE = globalThis.__PAGE;\n' + metaDecl + '\n' +
    extraer('rxPlataformaMeta') + '\n' + extraer('rxPlatVar') + '\n' + extraer('rxPlatAcento') + '\n' +
    extraer('rxPlatNombre') + '\n' + extraer('rxPlatApiUrl') + '\n' + extraer('rxPlatIdioma') + '\n' + extraer('rxPlatSkin') + '\n' +
    extraer('rxVoiceLangPlataforma') + '\n' +
    'return { meta: rxPlataformaMeta, acento: rxPlatAcento, nombre: rxPlatNombre, api: rxPlatApiUrl, idioma: rxPlatIdioma, skin: rxPlatSkin, voz: rxVoiceLangPlataforma };';

// Crea una instancia limpia con el PAGE simulado indicado.
function conPagina(pagina) {
    globalThis.__PAGE = pagina;
    try { return new Function(codigo)(); } catch (e) { return null; }
}

const variables = {
    'horizontal-bar-item-active-background': '#B30B27',
    'tabs-item-text-color': '#B30B27',
    'button-color': '#B30B27',
    'panel-top-background': '#ebebeb'
};
const pagina = {
    algo: 1,
    _c59ac2e84d82e8bffef6: {
        api_url: 'https://hst-api.wialon.com',
        wialon_sdk_url: 'https://hst-api.wialon.com',
        http_lang: 'es',
        title: 'STS Localizador',
        skin: 'skytracking3',
        _skin_data: { major: { data: { variables: variables } } }
    }
};

const a = conPagina(pagina);
ok('extraccion y evaluacion de los helpers', !!(a && typeof a.meta === 'function' && typeof a.acento === 'function'));
if (a) {
    ok('detecta el objeto de configuracion por su forma', !!a.meta(), a.meta() ? 'ok' : 'null');
    ok('lee el acento del skin', a.acento() === '#B30B27', a.acento());
    ok('lee el nombre del sitio', a.nombre() === 'STS Localizador', a.nombre());
    ok('lee la URL de la API', a.api() === 'https://hst-api.wialon.com', a.api());
    ok('lee el idioma del sitio', a.idioma() === 'es', a.idioma());
    ok('lee el skin', a.skin() === 'skytracking3', a.skin());
    ok('idioma del sitio -> idioma de voz es-MX', a.voz() === 'es-MX', a.voz());
}

// Sin metadatos de plataforma: no debe romper y devuelve vacios.
const b = conPagina({ foo: 1, _bar: { api_url: 'x' } });
ok('sin _skin_data no lo confunde', b && b.meta() === null && b.acento() === '' && b.nombre() === '');

// Acento invalido (no hex) -> cae al siguiente candidato valido.
const c = conPagina({
    _x: {
        api_url: 'u',
        _skin_data: { major: { data: { variables: {
            'horizontal-bar-item-active-background': 'rgba(0,0,0,.5)',
            'tabs-item-text-color': '#83121A'
        } } } }
    }
});
ok('ignora acentos no-hex y usa el siguiente candidato', c && c.acento() === '#83121A', c ? c.acento() : 'n/a');

// El acento de la plataforma se usa solo si el ajuste esta activo.
ok('applyTheme usa el acento de la plataforma en opt-in',
    /const acento = \(c\.temaPlataforma && rxPlatAcento\(\)\) \? rxPlatAcento\(\) : c\.acento;/.test(src));
ok('DEFAULTS declara temaPlataforma apagado por defecto', /temaPlataforma: false,/.test(src));
ok('DEFAULTS declara estiloPagina e idiomaPlataforma apagados',
    /estiloPagina: false,/.test(src) && /idiomaPlataforma: false,/.test(src));

// v6.0.14: mapeo de idioma de voz y reestilizado de la pagina.
const g = conPagina({ _x: { api_url: 'u', http_lang: 'en', _skin_data: { major: { data: { variables: {} } } } } });
ok('idioma en -> en-US', g && g.voz() === 'en-US', g ? g.voz() : 'n/a');
const h = conPagina({ _x: { api_url: 'u', http_lang: 'zz', _skin_data: { major: { data: { variables: {} } } } } });
ok('idioma desconocido -> sin sugerencia', h && h.voz() === '', h ? h.voz() : 'n/a');

ok('reestilizado de la pagina: mapea las variables y es reversible',
    /const RX_PAGINA_MAPA = \{/.test(src) && /'horizontal-bar-item-active-background'/.test(src) &&
    /el\.id = 'rondo-estilo-pagina'/.test(src) && /removeChild\(elPrev\)/.test(src));
ok('reestilizado: el unico borrador shorthand se emite con 1px solid',
    /const RX_PAGINA_BORDE_SHORTHAND = \{/.test(src) && /:1px solid ' \+/.test(src));
ok('reestilizado: se aplica desde applyTheme', /try \{ rxAplicarEstiloPagina\(\); \} catch/.test(src));
ok('reestilizado: hereda el acento de la plataforma solo si esta activo',
    /const acc = \(APP\.config\.temaPlataforma && rxPlatAcento\(\)\)/.test(src) &&
    /: \(APP\.config\.acento \|\| '#850D22'\);/.test(src));
// v6.9.1: el reestilizado de la pagina se endurece para que SI se aplique.
ok('reestilizado: emite !important en las declaraciones',
    /\+ ' !important;'/.test(src) && /rxPaginaToken\(RX_PAGINA_MAPA\[v\], P, acc, acc2, accD\)/.test(src));
ok('reestilizado: aplica sobre :root,html,body',
    /el\.textContent = ':root,html,body\{/.test(src));
ok('reestilizado: mapea los tokens del tema a la paleta',
    /const RX_PAGINA_MAPA = \{/.test(src) && /function rxPaginaToken\(/.test(src));
ok('reestilizado: cubre los tokens base del tema de la plataforma',
    /'accent-color': 'accent'/.test(src) && /'primary-color': 'fg'/.test(src) &&
    /'base-bg-color': \{ texto: 'fg', fondo: 'bg' \}/.test(src) &&
    /'borders-color': \{ texto: 'dim', fondo: 'border'/.test(src) &&
    /'icons-action-color': \{ texto: 'dim', fondo: 'strong' \}/.test(src));
ok('reestilizado: paleta segun tema claro/oscuro',
    /const claro = APP\.config\.theme === 'claro'/.test(src) && /const P = rxPaginaPaleta\(claro\)/.test(src));

// v6.19.3: mapeo completo del skin. Cada variable cae en su categoria; en
// particular los paneles del cromo que antes no se pintaban y el texto sobre
// acento (blanco), que antes se confundia con el propio acento.
ok('reestilizado: mapea paneles, acordeon y dialogos del skin',
    /'panel-top-background': 'soft'/.test(src) && /'panel-left-background': 'soft'/.test(src) &&
    /'panel-bottom-background': 'soft'/.test(src) && /'help-window-background': 'soft'/.test(src) &&
    /'wizard-dialog-background': \{ texto: 'fg', fondo: 'soft' \}/.test(src) && /'accordion-normal-background': 'soft'/.test(src));
ok('reestilizado: texto sobre acento en blanco',
    /'horizontal-bar-item-active-color': 'on'/.test(src) && /'execute-button-color': 'on'/.test(src));
ok('reestilizado: los bordes-color son color, no shorthand',
    /'execute-button-border-color': 'accent'/.test(src) &&
    /'list-table-tab_button-active-border': 'accent'/.test(src));

// Prueba funcional: se evalua la funcion con un DOM simulado y se revisan las
// declaraciones emitidas (asi el bug de los bordes no puede volver).
const bloqueCSS = src.slice(src.indexOf('function aclarar('), src.indexOf('function applyTheme()'));
function generarEstilo(cfg, acentoPlat, rondoVars) {
    const code = 'const APP = { config: Object.assign({ acento: "#850D22", theme: "oscuro", ' +
        'estiloPagina: true, density: "normal" }, ' + JSON.stringify(cfg || {}) + '), noMolestar: null };\n' +
        'let _el = null;\n' +
        'const getComputedStyle = () => ({ getPropertyValue: (n) => (' + JSON.stringify(rondoVars || {}) + ')[n] || "" });\n' +
        'const document = { getElementById: () => _el, body: {}, ' +
        'createElement: () => ({ id: "", parentNode: null, textContent: "" }), ' +
        'head: { appendChild: (e) => { _el = e; } }, documentElement: { appendChild: (e) => { _el = e; } } };\n' +
        'const window = { matchMedia: () => ({ matches: false }) };\n' +
        'const rxPlatAcento = () => ' + JSON.stringify(acentoPlat || '#B30B27') + ';\n' +
        bloqueCSS + '\nreturn rxAplicarEstiloPagina(), (_el ? _el.textContent : "");';
    try { return new Function(code)(); } catch (e) { return 'ERR:' + e.message; }
}
function generarRendimiento(cfg) {
    const code = 'const APP = { config: Object.assign({ rendimientoPagina: true }, ' + JSON.stringify(cfg || {}) + ') };\n' +
        'let _el = null;\n' +
        'const document = { getElementById: () => _el, ' +
        'createElement: () => ({ id: "", parentNode: null, textContent: "" }), ' +
        'head: { appendChild: (e) => { _el = e; } }, documentElement: { appendChild: (e) => { _el = e; } } };\n' +
        bloqueCSS + '\nreturn rxAplicarRendimientoPagina(), (_el ? _el.textContent : "");';
    try { return new Function(code)(); } catch (e) { return 'ERR:' + e.message; }
}
const cssOsc = generarEstilo({ temaPlataforma: true });
ok('reestilizado real: emite paneles superior/izquierdo/inferior',
    /--panel-top-background:.+ !important;/.test(cssOsc) &&
    /--panel-left-background:.+ !important;/.test(cssOsc) &&
    /--panel-bottom-background:.+ !important;/.test(cssOsc), cssOsc.slice(0, 80));
ok('reestilizado real: la paleta --gray-* se adapta al tema (etiquetas legibles)',
    /--gray-900:#e8ecf3 !important;/.test(cssOsc) && /--gray-100:#313849 !important;/.test(cssOsc) &&
    !/--gray-200:/.test(cssOsc) && !/--gray-300:/.test(cssOsc) && !/--gray-700:/.test(cssOsc));
ok('reestilizado real: en claro NO toca la paleta de grises de Wialon',
    !/--gray-900:/.test(generarEstilo({ theme: 'claro' })) &&
    !/--gray-200:/.test(generarEstilo({ theme: 'claro' })) &&
    /--gray-900:#e8ecf3 !important;/.test(cssOsc));
ok('reestilizado real: cubre los tokens base (acento, texto, bordes)',
    /--accent-color:#B30B27 !important;/.test(cssOsc) &&
    /--primary-color:#e8ecf3 !important;/.test(cssOsc) &&
    /--primary-color:#e8ecf3 !important;/.test(cssOsc));
ok('reestilizado real: texto sobre acento en blanco',
    /--horizontal-bar-item-active-color:#ffffff !important;/.test(cssOsc) &&
    /--execute-button-color:#ffffff !important;/.test(cssOsc));
ok('reestilizado real: texto de los botones de login en blanco',
    /--monitoring-login-primary-button-text-color:#ffffff !important;/.test(cssOsc) &&
    /--monitoring-login-secondary-button-text-color:#ffffff !important;/.test(cssOsc));
ok('reestilizado real: borde de color sin "1px solid"',
    /--execute-button-border-color:#B30B27 !important;/.test(cssOsc) &&
    !/--execute-button-border-color:1px/.test(cssOsc));
ok('reestilizado real: el shorthand si lleva "1px solid"',
    /--list-table-tab_button-active-border:1px solid #B30B27 !important;/.test(cssOsc));
ok('reestilizado real: viste los componentes wui-* de Wialon',
    /\.wui-input,\.wui-select,\.wui-textarea/.test(cssOsc) &&
    /html,body\{background:#1f2330 !important/.test(cssOsc) &&
    /\.wui-checkbox input:checked~\.wui-checkmark\{background:#B30B27 !important/.test(cssOsc));
ok('reestilizado real: viste los componentes ant-* de Ant Design',
    /\.ant-btn-primary\{background:#B30B27 !important/.test(cssOsc) &&
    /\.ant-input,.ant-input-affix-wrapper/.test(cssOsc) &&
    /\.ant-modal-content/.test(cssOsc));
ok('reestilizado real: viste las ventanas por vehiculo de Wialon',
    /#tooltip,#tooltip2,\.wui-tooltip,\.mini-window-extra,\.pursuit-window,\.x-unit-info/.test(cssOsc) &&
    /\.pursuit-window \.pursuit-top-container/.test(cssOsc) &&
    /\.workspace-units-panel/.test(cssOsc));
ok('reestilizado real: el tooltip queda opaco (no define fondo la plataforma)',
    /#tooltip td\.h-separator,#tooltip2 td\.h-separator/.test(cssOsc) &&
    /#tooltip \.block-mixed tr\.colored-row/.test(cssOsc) &&
    /\.pursuit-window \.no-flash/.test(cssOsc));
ok('reestilizado real: redondeos estilo Rondo',
    /--controls-border-radius:8px !important;/.test(cssOsc) &&
    /--modal-border-radius:12px !important;/.test(cssOsc));
ok('reestilizado real: pone el logo RONDO (Ndot)',
    /--logo-background:url\("data:image\/svg\+xml,/.test(cssOsc));

// Remap de colores literales y logo RONDO: se evaluan las funciones puras.
const M = new Function('const window={matchMedia:()=>({matches:false})};const document={};' + bloqueCSS +
    '\nreturn { svg: rondoLogoSVG, uri: rondoLogoURI, parse: rxColorParse, clave: rxColorClave, valor: rxColorValor, decl: rxDeclaracionesRondo, inline: rxRemapearInline };')();
const P = { bg: '#1f2330', soft: '#272d3c', strong: '#313849', fg: '#e8ecf3', dim: '#9aa4b5', mute: '#6f7888', border: '#3a4252' };
const ACC = '#850D22', ACCD = '#720B1D';
ok('logo RONDO: SVG dot-matrix con circulos y etiqueta',
    /^<svg[^>]*aria-label="RONDO"/.test(M.svg('#fff')) && /<circle /.test(M.svg('#fff')));
ok('logo RONDO: 85 puntos dentro del viewBox y sin NaN',
    (function () {
        const svg = M.svg('#fff');
        const cxs = (svg.match(/cx="(\d+)"/g) || []).map((x) => +x.slice(4, -1));
        const cys = (svg.match(/cy="(\d+)"/g) || []).map((y) => +y.slice(4, -1));
        return (svg.match(/<circle/g) || []).length === 85 &&
            Math.max.apply(null, cxs) <= 290 && Math.max.apply(null, cys) <= 70 &&
            !/cx="0\d/.test(svg) && !/cy="0\d/.test(svg);
    })());
ok('reestilizado: ventana de unidad y controles del mapa',
    /\.x-unit-info > \.unit-table-data th\{background:/.test(src) &&
    /\.wui-button-icon-shadow\{background:/.test(src) &&
    /\.x-unit-info > \.unit-table-data \.td\{border-color:/.test(src));
ok('reestilizado: la ventana flotante (tippy) queda opaca',
    /\.tippy-box,\[class\*="_messageBox_"\],\[class\*="_messageBoxWrapper_"\]\{background:/.test(src));
ok('ui: el texto sobre el acento se calcula por luminancia (acento claro)',
    /--rondo-accent-fg/.test(src) && /lumA < 0\.55 \? '#ffffff' : '#10151f'/.test(src) &&
    /color:var\(--rondo-accent-fg\)/.test(src));
ok('ui: numeros del panel legibles en tema claro',
    /body\[data-rondo-theme='claro'\] #rondo-panel \.kpi \.kpi-val/.test(src) &&
    /body\[data-rondo-theme='claro'\] #rondo-panel \.tab \.contador\{background:#eef2f7/.test(src));
ok('reestilizado: el blanco de los botones viene de wui-button-icon-shadow',
    /\.wui-button-icon-shadow\{background:' \+ P\.soft/.test(src) &&
    /\.ol-maps-control,\.control-search,\.ol-bar-container/.test(src));
ok('reestilizado: cubre reportes, avisos y listas legacy del volcado',
    /\.report-result-body-table,/.test(src) && /\.notify_dlg_table/.test(src) &&
    /\.chart_tooltip/.test(src) && /html \.ol-viewport\{background:/.test(src));
// El runtime del remap no debe buscar shadow roots: el volcado de la
// plataforma da shadowRoots:0. Solo el exportador de Diagnostico los recorre.
const runtimeTema = (src.match(/const P = rxPaginaPaleta\(claro\);[\s\S]*?function rxPintarTokens/) || [''])[0];
ok('reestilizado: el runtime no busca shadow roots (solo el exportador)',
    !/rxSombrasPagina/.test(runtimeTema) && !/shadowRoot/.test(runtimeTema) &&
    /rxSombrasPagina/.test(src) === false && /shadowRoot/.test(src) === true);
ok('logo RONDO: URI de datos lista para CSS', /^url\("data:image\/svg\+xml,/.test(M.uri('#850D22')));
ok('color: blanco de fondo -> superficie',
    M.valor(M.clave('#ffffff', 'background-color'), P, ACC, ACCD) === P.soft);
ok('color: blanco de texto -> #fff',
    M.valor(M.clave('rgb(255, 255, 255)', 'color'), P, ACC, ACCD) === '#ffffff');
ok('color: texto oscuro -> fg', M.valor(M.clave('#172336', 'color'), P, ACC, ACCD) === P.fg);
ok('color: borde -> border', M.valor(M.clave('#e3e4e6', 'border-color'), P, ACC, ACCD) === P.border);
ok('color: rojo del skin -> acento', M.clave('#b30b27', 'background-color') === 'accent');
ok('color: azul antiguo -> acento (como texto, su variante legible; como fondo, el acento)',
    M.clave('rgb(51, 153, 255)', 'color') === 'acctxt' && M.clave('rgb(51, 153, 255)', 'background-color') === 'accent');
ok('color: verde de estado se respeta', M.clave('#4db251', 'background-color') === null);
ok('color: transparente y custom props se ignoran',
    M.clave('rgba(0, 0, 0, 0)', 'background-color') === null &&
    M.clave('#fff', '--x') === null);
function fakeStyle(obj) {
    const keys = Object.keys(obj);
    const s = { length: keys.length, getPropertyValue: (p) => obj[p], getPropertyPriority: () => '' };
    keys.forEach((k, i) => { s[i] = k; });
    return s;
}
const dec = M.decl(fakeStyle({ 'background-color': '#ffffff', 'color': '#172336', 'border': '1px solid #e3e4e6' }));
ok('color: reescribe a variables (no hornea colores)',
    /background-color:var\(--rpg-/.test(dec) && /color:var\(--rpg-/.test(dec) &&
    /border:1px solid var\(--rpg-/.test(dec));
const dec2 = M.decl(fakeStyle({ 'background-color': '#ffffff' }));
const idUno = (dec.match(/var\(--rpg-([\w]+)\)/) || [])[1];
ok('color: el mismo literal+rol reutiliza la misma variable',
    !!idUno && dec2.indexOf('var(--rpg-' + idUno + ')') >= 0);
ok('color: un literal sin mapeo se deja intacto',
    M.decl(fakeStyle({ 'box-shadow': '0 0 2px #123456' })) === '');
const decMix = M.decl(fakeStyle({ 'background': 'var(--base-bg-color)', 'color': 'var(--base-bg-color)' }));
const idsMix = decMix.match(/var\(--rpg-([\w]+)\)/g) || [];
ok('color: las variables mezcladas se resuelven por propiedad (texto != fondo)',
    idsMix.length === 2 && idsMix[0] !== idsMix[1] &&
    /background:var\(--rpg-/.test(decMix) && /color:var\(--rpg-/.test(decMix));
const decTok = M.decl(fakeStyle({ 'background': 'var(--gray-900)', 'color': 'var(--gray-900)' }));
const idsTok = decTok.match(/var\(--rpg-([\w]+)\)/g) || [];
ok('color: una variable del tema se resuelve distinto como texto y como fondo',
    idsTok.length === 2 && idsTok[0] !== idsTok[1]);
// --white es la causa de las ventanas/tarjetas invisibles: Wialon lo usa a la
// vez de fondo (botones, pestanas, cuadro de unidad) y de texto (sobre acento).
const decWhite = M.decl(fakeStyle({ 'background-color': 'var(--white)', 'color': 'var(--white)' }));
const idsWhite = decWhite.match(/var\(--rpg-([\w]+)\)/g) || [];
ok('color: --white se resuelve distinto como fondo y como texto (no contagia)',
    idsWhite.length === 2 && idsWhite[0] !== idsWhite[1]);
const decBox = M.decl(fakeStyle({ 'background-color': 'var(--white-color-message-box)' }));
ok('color: el fondo de la ventana de unidad ya no queda forzado a blanco',
    /background-color:var\(--rpg-/.test(decBox));
// Indireccion: una definicion --x: var(--token) se reescribe segun el NOMBRE.
const decCustom = M.decl(fakeStyle({ '--tab-bg-color': 'var(--white)' }));
ok('color: las definiciones de variables se reescriben por el rol del nombre',
    /--tab-bg-color:var\(--rpg-/.test(decCustom));
ok('color: una custom property sin token mapeado no se toca',
    M.decl(fakeStyle({ '--mi-tamano': 'calc(var(--base-size) * 2)' })) === '');
// MOTOR DE VARIABLES (enfoque Dark Reader): se redefinen las variables de la
// plataforma en :root en vez de clonar reglas. Antes solo se cubrian 288 de las
// 853 variables; el resto (fondos de ventanas, scrollbars, estados) se quedaba
// blanco por mucho selector que se clonara.
(function () {
    const M = new Function('const window={matchMedia:()=>({matches:false})};const document={styleSheets:[]};' + bloqueCSS +
        '\nreturn { rol: rxRolPorNombre, manual: rxRolManual, esColor: rxEsColorValor, hoja: rxHojaVariables };')();
    ok('variables: un hex/rgb/nombre/var() SI es color',
        M.esColor('#fff') && M.esColor('#ffffffcc') && M.esColor('rgb(1,2,3)') && M.esColor('white') &&
        M.esColor('var(--x)') && M.esColor('hsl(0,0%,0%)'));
    ok('variables: medidas y numeros NO son color',
        !M.esColor('12px') && !M.esColor('99') && !M.esColor('url(x.png) no-repeat') &&
        !M.esColor('500 16px/22px Roboto,Arial,sans-serif') && !M.esColor('cubic-bezier(0, 0, 0.58, 1)'));
    ok('variables: el rol sale del nombre (como Dark Reader)',
        M.rol('--wizard-dialog-background', '#fff') === 'fondo' &&
        M.rol('--input-background', '#fff') === 'fondo' &&
        M.rol('--scrollbar-bg', '#fff') === 'fondo' &&
        M.rol('--button-color', '#B30B27') === 'fg' &&
        M.rol('--color-text-secondary', '#727883') === 'dim' &&
        M.rol('--button-disabled-color', '#BBBEC4') === 'dim' &&
        M.rol('--borders-color', '#E3E4E6') === 'borde' &&
        M.rol('--popup-background-error', '#D11F1F') === 'badbg' &&
        M.rol('--popup-success-scrollbar-thumb-color', '#fff') === 'okfg' &&
        M.rol('--color-danger', '#D11F1F') === 'badfg' &&
        M.rol('--tooltip-shadow', '0 4px 12px 0 #1723361A, 2px 0 4px 0 #1723361A') === 'sombra' &&
        M.rol('--button-shadow', 'none') === null &&
        M.rol('--switch-thumb-shadow', '0px 4px 12px 0px #1723361A') === 'sombra');
    ok('variables: medidas con nombre de color NO se tematizan',
        M.rol('--time-input-width', '54px') === null && M.rol('--layer-modal', '9000') === null &&
        M.rol('--font-header', '500 16px/22px Roboto') === null && M.rol('--tab-border-width', '1px') === null &&
        M.rol('--controls-border-radius', '4px') === null && M.rol('--animation-duration', '150ms') === null);
    ok('variables: el mapa manual gana sobre la clasificacion automatica',
        M.manual('color-text-secondary') === 'dim' && M.manual('button-color') === 'acento' &&
        M.manual('inline-background-help') === 'infobg' && M.manual('no-existe-esta') === null &&
        // ...y si el mapa manual calla, la clasificacion por nombre decide
        (M.manual('popup-background-success') || M.rol('--popup-background-success', '#2D8631')) === 'okbg');
    // Una variable mixta (--white, --wizard-dialog-background) vale como texto,
    // fondo y borde segun el uso: un unico valor no puede servir para todo, asi
    // que NO se redefine a la fuerza (la resuelve el remap por propiedad).
    ok('variables: las mixtas se marcan y se dejan al remap por propiedad',
        M.manual('white') === 'mixto' && M.manual('wizard-dialog-background') === 'mixto' &&
        M.manual('base-bg-color') === 'mixto' && /if \(manual === 'mixto'\) continue;/.test(src));
    ok('variables: las nuestras (--rondo-*) nunca se tematizan',
        M.rol('--rondo-bg', '#1f2330') === 'fondo' && M.rol('--rondo-fg', '#e8ecf3') === 'fg');
    // La hoja se genera con las variables que declara la plataforma. Las reglas
    // se construyen DENTRO del new Function: JSON.stringify perderia los metodos.
    const MH = new Function('const window={matchMedia:()=>({matches:false})};' + bloqueCSS + `
        const st = (pares) => { const k = Object.keys(pares);
            const o = { length: k.length, getPropertyValue: (p) => pares[p] || '' };
            k.forEach((p, i) => { o[i] = p; }); return o; };
        document = { styleSheets: [{ cssRules: [{ selectorText: ':root', style: st({
            '--scrollbar-bg': '#fff', '--color-text-secondary': '#727883', '--base-size': '4px',
            '--font-header': '500 16px/22px Roboto'
        }) }] }] };
        return { hoja: (P, a, a2) => rxHojaVariables(P, false, a, a2) };`)();
    const PV = { bg: '#1f2330', soft: '#272d3c', strong: '#1a1f2b', fg: '#e8ecf3', dim: '#a9b2c3',
        mute: '#7d8799', border: '#3a4252', shadow: 'none', okbg: '#1a2f1e', warnbg: '#2f2718',
        badbg: '#33191b', infobg: '#182630', okfg: '#7fce8f', warnfg: '#e0b95f',
        badfg: '#f08a8a', infofg: '#7fc4d8', claro: false };
    const css = MH.hoja(PV, '#0d6e87', '#2b8ba6');
    ok('variables: la hoja redefine las de la plataforma con !important en :root',
        /^:root,html,body\{/.test(css) &&
        css.indexOf('--scrollbar-bg:#272d3c !important') >= 0 &&
        css.indexOf('--color-text-secondary:#a9b2c3 !important') >= 0 &&
        css.indexOf('--scrollbar-bg:#272d3c !important') >= 0 &&
        css.indexOf('--rondo-bg') < 0);
    ok('variables: las medidas NO entran en la hoja',
        css.indexOf('--base-size') < 0 && css.indexOf('--font-header') < 0);
})();
// CAPA 3 (literales en sitio): se respeta la posicion y el !important originales.
(function () {
    const M = new Function('const window={matchMedia:()=>({matches:false})};const document={};' + bloqueCSS +
        '\nreturn { lit: rxReescribirLiterales, tok: rxLiteralColor };')();
    ok('literales: se reconocen hex, rgb, transparent y se ignoran el resto',
        M.tok('#fff').hex === '#fff' && M.tok('rgb(23, 35, 54)').hex === '#172336' &&
        M.tok('transparent').hex === null && M.tok('12px') === null &&
        M.tok('var(--x)') === null && M.tok('0 0 3px 2px rgb(1 1 1)') === null);
    ok('literales: se reescribe la MISMA regla conservando !important',
        /st\.setProperty\(prop, P\.fg, prio\)/.test(src) && /st\.setProperty\(prop, P\.soft, prio\)/.test(src) &&
        /st\.setProperty\(prop, P\.border, prio\)/.test(src));
    ok('literales: se llama en cada pasada de pintado',
        /rxPintarVariablesPlataforma\(P, acc, accD\);\s*rxReescribirLiterales\(P\);/.test(src));
})();
// ACENTO COMO TEXTO: el acento (#0d6e87) sobre una superficie oscura da ~2:1 y
// dejaba "Cancel", "Restore properties" o la pestana activa casi invisibles.
(function () {
    const MA = new Function('const window={matchMedia:()=>({matches:false})};const document={};' + bloqueCSS +
        '\nreturn { texto: rxAcentoTexto, contr: rxContraste, tok: rxTokenClave, valor: rxColorValor, glob: rxPaginaToken, aclarar: aclarar };')();
    const oscuro = { soft: '#272d3c', claro: false }, claroP = { soft: '#ffffff', claro: true };
    const c1 = MA.texto('#0d6e87', oscuro), c2 = MA.texto('#0d6e87', claroP);
    ok('acento como texto (oscuro): se aclara hasta >= 4.5:1 sobre la superficie',
        MA.contr('#0d6e87', '#272d3c') < 3 && MA.contr(c1, '#272d3c') >= 4.5, c1);
    ok('acento como texto (claro): se mantiene o se oscurece, siempre >= 4.5:1',
        MA.contr(c2, '#ffffff') >= 4.5, c2);
    ok('acento como texto: un acento que ya contrasta no se toca', MA.texto('#ffb952', oscuro) === '#ffb952');
    ok('acento como texto: sin paleta o color no hex no rompe', MA.texto('rgb(1,2,3)', oscuro) === 'rgb(1,2,3)' && MA.texto('#0d6e87', {}) === '#0d6e87');
    ok('acento: como TEXTO usa la variante legible; como FONDO/BORDE el acento puro',
        MA.tok('button-color', 'texto') === 'acctxt' && MA.tok('button-color', 'fondo') === 'accent' &&
        MA.tok('accent-color', 'fondo') === 'accent' && MA.tok('accent-color', 'borde') === 'accent' &&
        MA.tok('accent-color', 'texto') === 'acctxt');
    ok('acento: remap y emision global coinciden para acctxt y hovtxt',
        MA.valor('acctxt', oscuro, '#0d6e87', '#0a5c72') === MA.glob('acctxt', oscuro, '#0d6e87', '#2b8ba6', '#0a5c72') &&
        MA.valor('hovtxt', oscuro, '#0d6e87', '#0a5c72') === MA.glob('hovtxt', oscuro, '#0d6e87', '#2b8ba6', '#0a5c72'));
})();
// ORDEN DE HOJAS: a igual especificidad gana la ultima del documento. Las hojas
// del remap deben quedar al final del <head> aunque la plataforma cargue un
// modulo (con su propia hoja) despues de nuestra primera pasada.
(function () {
    const code = 'const hijos = [];\n' +
        'const head = { children: hijos, appendChild: (e) => { const i = hijos.indexOf(e); if (i >= 0) hijos.splice(i, 1); hijos.push(e); return e; } };\n' +
        'const document = { head: head, documentElement: head, getElementById: (id) => hijos.filter((e) => e.id === id)[0] || null };\n' +
        'const window = { matchMedia: () => ({ matches: false }) };\n' + bloqueCSS +
        '\nreturn { fin: rxMantenerAlFinal, head: head, ids: () => hijos.map((e) => e.id).join(",") };';
    let H;
    try { H = new Function(code)(); } catch (e) { H = null; }
    ok('orden de hojas: el arnes compila', !!H);
    if (!H) return;
    H.head.appendChild({ id: 'plat' });
    H.head.appendChild({ id: 'rondo-colores-pagina' });
    H.head.appendChild({ id: 'rondo-tokens-pagina' });
    ok('orden de hojas: ya al final => no se mueve (reinsertar reparsea la hoja)', H.fin() === false);
    H.head.appendChild({ id: 'modulo-lazy' });
    ok('orden de hojas: llega una hoja nueva => se reordena colores y tokens al final',
        H.fin() === true && H.ids() === 'plat,modulo-lazy,rondo-colores-pagina,rondo-tokens-pagina');
    ok('orden de hojas: sin hoja de colores no hace nada', (function () {
        const H2 = new Function(code)(); H2.head.appendChild({ id: 'plat' }); return H2.fin() === false;
    })());
    ok('orden de hojas: se llama tras cada pasada y al detectar una hoja nueva',
        /rxPintarTokens\(P, acc, accD\);[\s\S]{0,160}?rxMantenerAlFinal\(\);/.test(src) &&
        /if \(hayNueva\) \{ rxMantenerAlFinal\(\); rxProgramarColoresPagina\(\); \}/.test(src));
    ok('dialogos: red de seguridad !important en el cuerpo del dialogo',
        /\.wizard-dlg-content-target,\.help-window-content,\.vtabs \.tabs-containers\{background:' \+ P\.soft/.test(src));
})();
// @layer / @container: sus reglas tambien se remapean conservando la cabecera.
(function () {
    const ML = new Function('const window={matchMedia:()=>({matches:false})};const document={};' + bloqueCSS +
        '\nreturn { reglas: rxReglasRondo, vars: _rxVars };')();
    const mk = (obj, sel) => { const k = Object.keys(obj); const st = { length: k.length, getPropertyValue: (p) => obj[p], getPropertyPriority: () => '' }; k.forEach((q, i) => { st[i] = q; }); return { selectorText: sel, style: st }; };
    const Pl = { bg: '#1', soft: '#2', strong: '#3', fg: '#4', dim: '#5', mute: '#6', border: '#7' };
    const capa = { type: 0, cssText: '@layer base { .a { background-color: #fff } }', cssRules: [mk({ 'background-color': '#ffffff' }, '.a')] };
    const cont = { type: 0, cssText: '@container (min-width: 300px) { .b { color: #172336 } }', cssRules: [mk({ 'color': '#172336' }, '.b')] };
    const kf = { type: 7, cssText: '@keyframes x { }', cssRules: [mk({ 'color': '#172336' }, '50%')] };
    const out = ML.reglas([capa, cont, kf], Pl, '#000', '#000', '#000');
    ok('@layer: se remapea dentro de su capa', /^@layer base\{\.a\{background-color:var\(--rpg-/.test(out));
    ok('@container: se remapea conservando la condicion', /@container \(min-width: 300px\)\{\.b\{color:var\(--rpg-/.test(out));
    ok('@keyframes: no se toca', out.indexOf('50%') < 0);
})();
// El remap (var(--rpg-*), rxColorValor) y la emision global (rxPaginaToken)
// comparten el mapa de claves: deben dar SIEMPRE el mismo color. Si no, un
// fondo "transparent" salia como el color de texto (botones blancos arriba).
(function () {
    const MK = new Function('const window={matchMedia:()=>({matches:false})};const document={};' + bloqueCSS +
        '\nreturn { aclarar: aclarar, valor: rxColorValor, tok: rxPaginaToken, mapa: RX_PAGINA_MAPA, mix: RX_PAGINA_MIXTOS, gris: RX_PAGINA_GRISES_OSCURO };')();
    const Pk = { bg: '#1', soft: '#2', strong: '#3', fg: '#FG', dim: '#5', mute: '#6', border: '#7', veil: 'V',
        okbg: 'a', warnbg: 'b', badbg: 'c', infobg: 'd', okfg: 'e', warnfg: 'f', badfg: 'g', infofg: 'h' };
    const claves = {};
    Object.keys(MK.mapa).forEach((k) => { claves[MK.mapa[k]] = 1; });
    Object.keys(MK.gris).forEach((k) => { claves[MK.gris[k]] = 1; });
    Object.keys(MK.mix).forEach((k) => Object.keys(MK.mix[k]).forEach((r) => { claves[MK.mix[k][r]] = 1; }));
    const difieren = Object.keys(claves).filter((c) => MK.valor(c, Pk, '#0d6e87', '#0a5c72') !==
        MK.tok(c, Pk, '#0d6e87', MK.aclarar('#0d6e87', 0.28), '#0a5c72'));
    ok('mapa de claves: remap y emision global dan el mismo color para TODAS las claves',
        difieren.length === 0, difieren.join(','));
    ok('mapa de claves: "transparent" no cae al color de texto',
        MK.valor('transparent', Pk, '#000', '#000') === 'transparent');
    ok('mapa de claves: los tintes de acento se resuelven (no caen a fg)',
        /22$/.test(MK.valor('accent-bg', Pk, '#0d6e87', '#000')) && /33$/.test(MK.valor('accent-bg-hover', Pk, '#0d6e87', '#000')));
})();
// ATAJOS CON var(): comportamiento REAL de Chromium (verificado en headless).
// Con `background: var(--x)` o `border: 1px solid var(--y)` el navegador lista
// style[i] = background-color, border-top-color... con valor VACIO y deja el
// texto solo en el atajo. Antes se recorria solo style[i] y se ignoraban ~1000
// reglas de la plataforma (p. ej. .wizard-dlg-content-target{background:
// var(--wizard-dialog-background)} => cuerpo de los dialogos BLANCO).
function styleChromium(atajos, sueltas) {
    const mapa = Object.assign({}, atajos, sueltas || {});
    const nombres = [];
    Object.keys(atajos).forEach((a) => {
        const largos = a === 'background' ? ['background-image', 'background-color']
            : a === 'border' ? ['border-top-color', 'border-top-style', 'border-top-width']
            : [a + '-color'];
        largos.forEach((l) => { nombres.push(l); mapa[l] = ''; });
    });
    Object.keys(sueltas || {}).forEach((k) => nombres.push(k));
    const s = { length: nombres.length, getPropertyValue: (p) => (p in mapa ? mapa[p] : ''), getPropertyPriority: () => '' };
    nombres.forEach((n, i) => { s[i] = n; });
    return s;
}
(function () {
    const MC = new Function('const window={matchMedia:()=>({matches:false})};const document={};' + bloqueCSS +
        '\nreturn { decl: rxDeclaracionesRondo, vars: _rxVars, inline: rxRemapearInline };')();
    const d1 = MC.decl(styleChromium({ background: 'var(--wizard-dialog-background)' }));
    ok('atajo con var(): background se reescribe aunque style[i] liste solo longhands vacios',
        /^background:var\(--rpg-[\w]+\);$/.test(d1) && MC.vars[(d1.match(/--rpg-([\w]+)/) || [])[1]] === 'soft');
    const d2 = MC.decl(styleChromium({ border: '1px solid var(--borders-color)' }));
    ok('atajo con var(): border conserva grosor/estilo y cambia solo el color',
        /^border:1px solid var\(--rpg-[\w]+\);$/.test(d2) && MC.vars[(d2.match(/--rpg-([\w]+)/) || [])[1]] === 'border');
    ok('atajo con var(): un atajo con var() NO mapeada no se emite',
        MC.decl(styleChromium({ background: 'var(--logo-background)' })) === '');
    ok('atajo con var(): sin duplicar si la propiedad ya se emitio suelta',
        (MC.decl(fakeStyle({ 'background': 'var(--base-bg-color)' })).match(/background:/g) || []).length === 1);
    const elAtajo = (() => {
        const mapa = { background: 'var(--white)', 'background-color': '', 'background-image': '' };
        const st = { length: 2, 0: 'background-image', 1: 'background-color', getPropertyValue: (p) => mapa[p] || '',
            getPropertyPriority: () => '', setProperty: (p, v) => { mapa[p] = v; } };
        return { style: st, closest: () => null, _m: mapa };
    })();
    MC.inline(elAtajo);
    ok('atajo con var(): tambien en estilos inline (style="background:var(--white)")',
        /^var\(--rpg-/.test(elAtajo._m.background) && MC.vars[(elAtajo._m.background.match(/--rpg-([\w]+)/) || [])[1]] === 'soft');
})();
// Hojas CSS-in-JS (emotion de react-select, cssinjs de AntD): crecen con
// insertRule al abrir un dialogo. Antes la hoja se daba por "vista" y esas
// reglas (p. ej. .css-xxx-control{background:#fff}) quedaban sin tema.
(function () {
    const code = 'const els = {};\n' +
        'const document = { getElementById: (id) => els[id] || null, ' +
        'createElement: () => ({ id: "", textContent: "", parentNode: null }), ' +
        'head: { appendChild: (e) => { els[e.id] = e; } }, documentElement: { appendChild: (e) => { els[e.id] = e; } } };\n' +
        'const window = { matchMedia: () => ({ matches: false }) };\n' + bloqueCSS +
        '\nreturn { proc: rxProcesarHoja, el: () => els["rondo-colores-pagina"], cont: rxContarReglas };';
    let H;
    try { H = new Function(code)(); } catch (e) { H = null; }
    ok('hojas dinamicas: el harness compila', !!H);
    if (!H) return;
    const mk = (obj, sel) => { const k = Object.keys(obj); const st = { length: k.length, getPropertyValue: (p) => obj[p], getPropertyPriority: () => '' }; k.forEach((q, i) => { st[i] = q; }); return { selectorText: sel, style: st }; };
    const hoja = { cssRules: [mk({ 'background-color': '#ffffff' }, '.a')] };
    const Pp = { bg: '#1f2330', soft: '#272d3c', strong: '#313849', fg: '#e8ecf3', dim: '#9aa4b5', mute: '#6f7888', border: '#3a4252' };
    ok('hojas dinamicas: primera pasada procesa la regla inicial', H.proc(hoja, Pp, '#000', '#000', '#000') === true);
    ok('hojas dinamicas: sin reglas nuevas no repite trabajo', H.proc(hoja, Pp, '#000', '#000', '#000') === false);
    hoja.cssRules.push(mk({ 'background-color': '#ffffff' }, '.css-lfqavr-control'));
    ok('hojas dinamicas: una regla insertada despues SI se procesa', H.proc(hoja, Pp, '#000', '#000', '#000') === true);
    const css = H.el().textContent;
    ok('hojas dinamicas: solo se anade la regla nueva (no duplica la vieja)',
        css.indexOf('.css-lfqavr-control{') > 0 && (css.match(/\.a\{/g) || []).length === 1);
    hoja.cssRules.length = 0;
    hoja.cssRules.push(mk({ 'color': '#172336' }, '.b'));
    ok('hojas dinamicas: si la hoja encoge se reprocesa entera', H.proc(hoja, Pp, '#000', '#000', '#000') === true);
    ok('hojas dinamicas: el recuento de reglas ignora hojas de Rondo',
        /o\.id\.indexOf\('rondo'\) === 0/.test(src) && /setInterval\(\(\) => \{\s*if \(document\.hidden\) return;/.test(src));
})();
// Colores de ESTADO (avisos, notificaciones, toasts): pasteles claros de fondo
// y tonos 700 de texto; cada tema tiene su pareja legible.
const cssClaro = generarEstilo({ theme: 'claro' });
ok('estado: en oscuro el pastel de error/exito/aviso/ayuda pasa a fondo oscuro',
    /--red-50:#3b2a30 !important;/.test(cssOsc) && /--green-50:#22362c !important;/.test(cssOsc) &&
    /--orange-50:#3a3326 !important;/.test(cssOsc) && /--blue-50:#213447 !important;/.test(cssOsc) &&
    /--inline-background-error:#3b2a30 !important;/.test(cssOsc));
ok('estado: en oscuro el texto de estado se aclara (legible sobre el fondo oscuro)',
    /--red-700:#ff8a80 !important;/.test(cssOsc) && /--green-700:#6bbd6f !important;/.test(cssOsc) &&
    /--color-danger:#ff8a80 !important;/.test(cssOsc));
ok('estado: en claro coincide con los pasteles originales de Wialon',
    /--red-50:#fff0f2 !important;/.test(cssClaro) && /--green-700:#2d8631 !important;/.test(cssClaro));
ok('estado: el fondo de estado y su texto no se contagian (rol por propiedad)',
    (function () {
        const ME = new Function('const window={matchMedia:()=>({matches:false})};const document={};' + bloqueCSS +
            '\nreturn { decl: rxDeclaracionesRondo, vars: _rxVars };')();
        const d = ME.decl(fakeStyle({ 'background-color': 'var(--red-50)', 'color': 'var(--red-700)' }));
        const ids = (d.match(/var\(--rpg-([\w]+)\)/g) || []).map((q) => q.slice(10, -1));
        return ids.length === 2 && ME.vars[ids[0]] === 'badbg' && ME.vars[ids[1]] === 'badfg';
    })());
// CAUSA REAL de los campos "vacios" del hint de unidad (velocidad, km, horas
// de motor, satelites, conductor): td::before{position:absolute;inset:0;
// z-index:0;background:var(--accent-gray-bg-color)} es una CAPA sobre el texto.
// El token original es ~4% opaco; mapearlo a un gris opaco tapaba el dato.
const MH = new Function('const window={matchMedia:()=>({matches:false})};const document={};' + bloqueCSS +
    '\nreturn { decl: rxDeclaracionesRondo, vars: _rxVars, pal: rxPaginaToken };')();
const dVelo = MH.decl(fakeStyle({ 'background-color': 'var(--accent-gray-bg-color)' }));
const idVelo = (dVelo.match(/var\(--rpg-([\w]+)\)/) || [])[1];
ok('capa ::before de las tablas del hint: se mapea a un VELO translucido (no opaco)',
    MH.vars[idVelo] === 'veil');
ok('velo oscuro y claro con alfa bajo (el texto de debajo se ve)',
    /rgba\(255,255,255,\.06\)/.test(src) && /rgba\(23,35,54,\.05\)/.test(src) &&
    MH.pal('veil', { veil: 'rgba(255,255,255,.06)', fg: '#fff' }, '#000', '#000', '#000') === 'rgba(255,255,255,.06)');
ok('hover-bg-color (capa ::before de los botones) tambien es velo como fondo',
    MH.vars[(MH.decl(fakeStyle({ 'background-color': 'var(--hover-bg-color)' })).match(/var\(--rpg-([\w]+)\)/) || [])[1]] === 'veil');
ok('el contenido de la celda se eleva sobre su velo (z-index)',
    /\[class\*="_table_"\] td:not\(:empty\)>\*\{position:relative;z-index:1;\}/.test(src));
// Estilos INLINE (Wialon pinta los sensores con style="..."). Antes quedaban
// como islas: fondo blanco con texto blanco.
function elInline(obj) {
    const keys = Object.keys(obj);
    const st = { length: keys.length, getPropertyValue: (p) => obj[p], getPropertyPriority: () => '' };
    st.setProperty = (p, v) => { obj[p] = v; };
    keys.forEach((k, i) => { st[i] = k; });
    return { style: st, closest: () => null };
}
const elIn = elInline({ 'background-color': 'rgb(255, 255, 255)', 'color': '#172336' });
M.inline(elIn);
const idsIn = (elIn.style.getPropertyValue('background-color') + elIn.style.getPropertyValue('color'))
    .match(/var\(--rpg-([\w]+)\)/g) || [];
ok('color: remapea los colores INLINE de las ventanas (texto/fondo distintos)',
    elIn.style.getPropertyValue('background-color').indexOf('var(--rpg-') === 0 &&
    elIn.style.getPropertyValue('color').indexOf('var(--rpg-') === 0 && idsIn.length === 2);
const elRondo = elInline({ 'background-color': 'rgb(255, 255, 255)' });
elRondo.closest = (s) => (s.indexOf('#rondo-panel') >= 0 ? {} : null);
M.inline(elRondo);
ok('color: NO toca el estilo inline del panel de Rondo',
    elRondo.style.getPropertyValue('background-color') === 'rgb(255, 255, 255)');

ok('color: named colors basicos',
    M.clave('white', 'background-color') === 'soft' && M.clave('black', 'color') === 'fg');
ok('reestilizado real: scrollbars acordes al tema',
    /--scrollbar-bg:#1f2330 !important;/.test(cssOsc) &&
    /--default-scrollbar-thumb-color:#3a4252 !important;/.test(cssOsc) &&
    /--modal-scrollbar-thumb-active-color:#B30B27 !important;/.test(cssOsc));
ok('reestilizado real: seleccion y foco en color de acento',
    /::selection\{background:#B30B27 !important/.test(cssOsc) && /:focus-visible/.test(cssOsc));
ok('reestilizado: shorthand de borde y familias de scrollbar',
    /'button-border': 'border'/.test(src) && /RX_PAGINA_SCROLL = \[/.test(src) &&
    /'calendar-today-color': 'accent'/.test(src) && /'checkbox-border-color': 'border'/.test(src));
ok('reestilizado: switch off y message-box en la paleta',
    /'switch-off-bg': 'strong'/.test(src) && /'primary-color-message-box': \{ texto: 'fg', fondo: 'strong' \}/.test(src));
ok('reestilizado real: hereda el acento de la plataforma en opt-in',
    generarEstilo({ temaPlataforma: true }, '#00A0B0').indexOf('--button-color:#00A0B0 !important;') >= 0);
ok('reestilizado real: por defecto usa el acento de Rondo',
    generarEstilo({}, '#00A0B0').indexOf('--button-color:#850D22 !important;') >= 0);
ok('reestilizado real: apagado no emite hoja', generarEstilo({ estiloPagina: false }) === '');
ok('reestilizado real: tema claro usa superficies claras',
    /--panel-top-background:#ffffff !important;/.test(generarEstilo({ theme: 'claro' })));
ok('reestilizado real: usa los tokens --rondo-* reales',
    /--background:#010203 !important;/.test(generarEstilo({ temaPlataforma: true }, '#B30B27', {
        '--rondo-bg': '#010203', '--rondo-bg-soft': '#040506', '--rondo-bg-strong': '#070809',
        '--rondo-fg': '#0a0b0c', '--rondo-fg-dim': '#0d0e0f', '--rondo-fg-mute': '#101112',
        '--rondo-border': '#131415'
    })) &&
    /--primary-color:#0a0b0c !important;/.test(generarEstilo({ temaPlataforma: true }, '#B30B27', {
        '--rondo-fg': '#0a0b0c'
    })));

// v6.19.5: capa de rendimiento CSS (opt-in).
ok('DEFAULTS declara rendimientoPagina apagado', /rendimientoPagina: false,/.test(src));
ok('Ajustes guarda rendimientoPagina', /cf\.rendimientoPagina = !!\(cRendPag2 && cRendPag2\.checked\)/.test(src));
ok('rendimiento: se aplica desde applyTheme', /try \{ rxAplicarRendimientoPagina\(\); \}/.test(src));
const cssPerf = generarRendimiento({});
ok('rendimiento: fuera los desenfoques', /backdrop-filter:none !important/.test(cssPerf));
ok('rendimiento: filas fuera de pantalla no se pintan',
    /content-visibility:auto/.test(cssPerf) && /contain-intrinsic-size:auto 38px/.test(cssPerf));
ok('rendimiento: scroll real y transiciones baratas',
    /scroll-behavior:auto/.test(cssPerf) && /transition:background-color .1s/.test(cssPerf));
ok('rendimiento: apagado no emite hoja', generarRendimiento({ rendimientoPagina: false }) === '');
ok('rendimiento: controles nativos y scrollbar finos',
    /color-scheme:/.test(cssPerf) && /scrollbar-width:thin/.test(cssPerf) &&
    /scrollbar-color:var\(--rondo-border\)/.test(cssPerf));
ok('rendimiento: pausa el refresh con la pestana oculta',
    /APP\.config\.rendimientoPagina && document\.hidden/.test(src));
ok('bajo nivel: preconnect a los origenes que usa la app',
    /function precargarOrigenes\(/.test(src) && /rel = 'preconnect'/.test(src) &&
    /dns-prefetch/.test(src) && /precargarOrigenes\(\);/.test(src));
ok('remap: ignora las hojas propias y los enlaces que no son CSS',
    /n\.id\.indexOf\('rondo'\) === 0/.test(src) && /\/stylesheet\/i\.test\(n\.rel/.test(src));
ok('remap: procesa cada hoja una sola vez (WeakSet)',
    /_rxHojasVistas/.test(src) && /function rxProcesarHoja\(/.test(src) &&
    /_rxHojasVistas\.get\(hoja\)/.test(src));
ok('remap: se dispara desde applyTheme (si no, nunca corria)',
    /try \{ rxProgramarColoresPagina\(\); \}/.test(src));
ok('remap: no reanaliza lo ya hecho y solo repinta variables al cambiar tema',
    /function rxPintarTokens\(/.test(src) && /rxHojaRondo\('rondo-tokens-pagina'\)/.test(src) &&
    !/_rxDocHecho/.test(src));
ok('remap: no pierde las hojas que cargan tarde (<link> .sheet nulo)',
    /function rxEsperarHoja\(/.test(src) && /addEventListener\('load'/.test(src));
ok('remap: sin reescaneo periodico de todo el documento',
    !/setInterval\([^)]*rxProgramarColoresPagina\(true\)/.test(src) &&
    !/_rxColorSig/.test(src));

ok('detecta la pantalla de login',
    /function rxEnLogin\(/.test(src) && /getElementById\('login_body'\)/.test(src) &&
    /getElementById\('monitoring_body'\)/.test(src));
ok('al no haber API avisa de iniciar sesion si procede',
    /avisoEl\.textContent = rxEnLogin\(\)/.test(src) && /Inicia sesión en la plataforma/.test(src));
ok('diagnostico incluye webgis y posicion por defecto',
    /webgis: rxPlatWebgis\(\)/.test(src) && /pos: rxPlatPosDefecto\(\)/.test(src));

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
