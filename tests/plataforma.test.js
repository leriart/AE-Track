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

ok('reestilizado de la pagina: usa las variables del skin y es reversible',
    /const RX_PAGINA_VARS = \[/.test(src) && /'horizontal-bar-item-active-background'/.test(src) &&
    /el\.id = 'rondo-estilo-pagina'/.test(src) && /removeChild\(elPrev\)/.test(src));
ok('reestilizado: los bordes se emiten como 1px solid',
    /const RX_PAGINA_BORDES = \[/.test(src) && /':1px solid ' \+ acc \+ ' !important;'/.test(src));
ok('reestilizado: se aplica desde applyTheme', /try \{ rxAplicarEstiloPagina\(\); \} catch/.test(src));
ok('applyTheme usa el acento de la plataforma si el estilo esta activo',
    /const acc = rxPlatAcento\(\) \|\| APP\.config\.acento \|\| '#850D22';/.test(src));
// v6.9.1: el reestilizado de la pagina se endurece para que SI se aplique.
ok('reestilizado: emite !important en las declaraciones',
    /:1px solid ' \+ acc \+ ' !important;'/.test(src) && /\+ P\[RX_PAGINA_SUPERFICIES\[v\]\] \+ ' !important;'/.test(src));
ok('reestilizado: aplica sobre :root,html,body',
    /el\.textContent = ':root,html,body\{/.test(src));
ok('reestilizado: mapea superficies y texto de la paleta',
    /const RX_PAGINA_SUPERFICIES = \{/.test(src) && /const RX_PAGINA_TEXTOS = \{/.test(src));
ok('reestilizado: paleta segun tema claro/oscuro',
    /const claro = APP\.config\.theme === 'claro'/.test(src) && /const P = claro \? \{/.test(src));
ok('detecta la pantalla de login',
    /function rxEnLogin\(/.test(src) && /getElementById\('login_body'\)/.test(src) &&
    /getElementById\('monitoring_body'\)/.test(src));
ok('al no haber API avisa de iniciar sesion si procede',
    /avisoEl\.textContent = rxEnLogin\(\)/.test(src) && /Inicia sesión en la plataforma/.test(src));
ok('diagnostico incluye webgis y posicion por defecto',
    /webgis: rxPlatWebgis\(\)/.test(src) && /pos: rxPlatPosDefecto\(\)/.test(src));

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
