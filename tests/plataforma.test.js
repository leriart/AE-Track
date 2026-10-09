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
    /'base-bg-color': 'bg'/.test(src) && /'borders-color': 'border'/.test(src) &&
    /'icons-action-color': 'dim'/.test(src));
ok('reestilizado: paleta segun tema claro/oscuro',
    /const claro = APP\.config\.theme === 'claro'/.test(src) && /const P = rxPaginaPaleta\(claro\)/.test(src));

// v6.19.3: mapeo completo del skin. Cada variable cae en su categoria; en
// particular los paneles del cromo que antes no se pintaban y el texto sobre
// acento (blanco), que antes se confundia con el propio acento.
ok('reestilizado: mapea paneles, acordeon y dialogos del skin',
    /'panel-top-background': 'soft'/.test(src) && /'panel-left-background': 'soft'/.test(src) &&
    /'panel-bottom-background': 'soft'/.test(src) && /'help-window-background': 'soft'/.test(src) &&
    /'wizard-dialog-background': 'soft'/.test(src) && /'accordion-normal-background': 'soft'/.test(src));
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
ok('reestilizado real: cubre los tokens base (acento, texto, bordes)',
    /--accent-color:#B30B27 !important;/.test(cssOsc) &&
    /--primary-color:#e8ecf3 !important;/.test(cssOsc) &&
    /--base-bg-color:#1f2330 !important;/.test(cssOsc) &&
    /--borders-color:#3a4252 !important;/.test(cssOsc) &&
    /--icons-action-color:#9aa4b5 !important;/.test(cssOsc));
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
    /#tooltip,#tooltip2,\.mini-window-extra,\.x-unit-info/.test(cssOsc) &&
    /\.pursuit-window \.pursuit-top-container/.test(cssOsc) &&
    /\.workspace-units-panel/.test(cssOsc));
ok('reestilizado real: redondeos estilo Rondo',
    /--controls-border-radius:8px !important;/.test(cssOsc) &&
    /--modal-border-radius:12px !important;/.test(cssOsc));
ok('reestilizado real: pone el logo RONDO (Ndot)',
    /--logo-background:url\("data:image\/svg\+xml,/.test(cssOsc));

// Remap de colores literales y logo RONDO: se evaluan las funciones puras.
const M = new Function('const window={matchMedia:()=>({matches:false})};const document={};' + bloqueCSS +
    '\nreturn { svg: rondoLogoSVG, uri: rondoLogoURI, parse: rxColorParse, color: rxColorRondo, decl: rxDeclaracionesRondo };')();
const P = { bg: '#1f2330', soft: '#272d3c', strong: '#313849', fg: '#e8ecf3', dim: '#9aa4b5', mute: '#6f7888', border: '#3a4252' };
const ACC = '#850D22', ACCD = '#720B1D';
ok('logo RONDO: SVG dot-matrix con circulos y etiqueta',
    /^<svg[^>]*aria-label="RONDO"/.test(M.svg('#fff')) && /<circle /.test(M.svg('#fff')));
ok('logo RONDO: URI de datos lista para CSS', /^url\("data:image\/svg\+xml,/.test(M.uri('#850D22')));
ok('color: blanco de fondo -> superficie', M.color('#ffffff', 'background-color', P, ACC, ACCD) === P.soft);
ok('color: blanco de texto -> #fff', M.color('rgb(255, 255, 255)', 'color', P, ACC, ACCD) === '#ffffff');
ok('color: texto oscuro -> fg', M.color('#172336', 'color', P, ACC, ACCD) === P.fg);
ok('color: borde -> border', M.color('#e3e4e6', 'border-color', P, ACC, ACCD) === P.border);
ok('color: rojo del skin -> acento', M.color('#b30b27', 'background-color', P, ACC, ACCD) === ACC);
ok('color: azul antiguo -> acento', M.color('rgb(51, 153, 255)', 'color', P, ACC, ACCD) === ACC);
ok('color: verde de estado se respeta', M.color('#4db251', 'background-color', P, ACC, ACCD) === null);
ok('color: transparente y custom props se ignoran',
    M.color('rgba(0, 0, 0, 0)', 'background-color', P, ACC, ACCD) === null &&
    M.color('#fff', '--x', P, ACC, ACCD) === null);
function fakeStyle(obj) {
    const keys = Object.keys(obj);
    const s = { length: keys.length, getPropertyValue: (p) => obj[p], getPropertyPriority: () => '' };
    keys.forEach((k, i) => { s[i] = k; });
    return s;
}
const dec = M.decl(fakeStyle({ 'background-color': '#ffffff', 'color': '#172336', 'border': '1px solid #e3e4e6' }), P, ACC, ACCD);
ok('color: reescribe declaraciones por propiedad',
    /background-color:#272d3c;/.test(dec) && /color:#e8ecf3;/.test(dec) &&
    /border:1px solid #3a4252;/.test(dec));
ok('reestilizado real: hereda el acento de la plataforma en opt-in',
    generarEstilo({ temaPlataforma: true }, '#00A0B0').indexOf('--button-color:#00A0B0 !important;') >= 0);
ok('reestilizado real: por defecto usa el acento de Rondo',
    generarEstilo({}, '#00A0B0').indexOf('--button-color:#850D22 !important;') >= 0);
ok('reestilizado real: apagado no emite hoja', generarEstilo({ estiloPagina: false }) === '');
ok('reestilizado real: tema claro usa superficies claras',
    /--panel-top-background:#ffffff !important;/.test(generarEstilo({ theme: 'claro' })));
ok('reestilizado real: usa los tokens --rondo-* reales',
    /--base-bg-color:#010203 !important;/.test(generarEstilo({ temaPlataforma: true }, '#B30B27', {
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

ok('detecta la pantalla de login',
    /function rxEnLogin\(/.test(src) && /getElementById\('login_body'\)/.test(src) &&
    /getElementById\('monitoring_body'\)/.test(src));
ok('al no haber API avisa de iniciar sesion si procede',
    /avisoEl\.textContent = rxEnLogin\(\)/.test(src) && /Inicia sesión en la plataforma/.test(src));
ok('diagnostico incluye webgis y posicion por defecto',
    /webgis: rxPlatWebgis\(\)/.test(src) && /pos: rxPlatPosDefecto\(\)/.test(src));

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
