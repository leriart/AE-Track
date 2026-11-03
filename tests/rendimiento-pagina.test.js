/*
 * Pruebas de la capa de rendimiento de la pagina (fragmento 32): imagenes
 * fuera de pantalla diferidas, listas grandes marcadas para
 * content-visibility y analisis del peso del DOM.
 *
 * Las funciones son puras respecto del DOM (reciben/leen document y
 * consultan nodos), asi que se extraen del bundle y se ejecutan con un DOM
 * simulado. No toca red ni navegador.
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

function extraerFuncion(nombre) {
    const i = src.indexOf('function ' + nombre + '(');
    if (i < 0) return '';
    let depth = 0, started = false;
    for (let j = i; j < src.length; j++) {
        const c = src[j];
        if (c === '{') { depth++; started = true; }
        else if (c === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
    }
    return '';
}
function extraerConst(nombre) {
    const i = src.indexOf('const ' + nombre);
    if (i < 0) return '';
    const f = src.indexOf(';', i);
    if (f < 0) return '';
    return src.slice(i, f + 1);
}

const RONDO = '#rondo-panel,#rondo-barra,#rondo-dialog,#rondo-toasts,#rondo-aviso,' +
    '#rondo-contexto,#rondo-modal,#rondo-config,#rondo-ayuda,#rondo-rail,#rondo-replay,#rondo-captura';
const MAPA = '.leaflet-container,.leaflet-pane,.MicrosoftMap,.wln-map,#map,.map,.map-container';

const partes = [
    extraerConst('RX_PERF_RONDO_SEL'),
    extraerConst('RX_PERF_MAPA_SEL'),
    extraerConst('RX_PERF_MIN_HIJOS'),
    extraerFuncion('rxPerfEsRondo'),
    extraerFuncion('rxPerfLazyImgs'),
    extraerFuncion('rxPerfMarcaListas'),
    extraerFuncion('rxPerfResumen')
];
if (partes.some((p) => !p)) {
    console.error('No se encontro la capa de rendimiento de la pagina en ' + ARCHIVO);
    process.exit(1);
}
const code = partes.join('\n') +
    '\nreturn {rxPerfEsRondo,rxPerfLazyImgs,rxPerfMarcaListas,rxPerfResumen};';

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

// Nodo imagen simulado: recuerda atributos y si esta dentro del mapa/Rondo.
function img(opts) {
    const o = opts || {};
    const i = {
        _attrs: {},
        getAttribute(k) { return this._attrs[k] == null ? null : this._attrs[k]; },
        setAttribute(k, v) { this._attrs[k] = String(v); },
        closest(sel) {
            if (o.rondo && sel === RONDO) return { id: 'rondo' };
            if (o.mapa && sel === MAPA) return { id: 'mapa' };
            return null;
        }
    };
    return i;
}
function lista(n, opts) {
    const o = opts || {};
    return {
        tagName: o.tag || 'UL', childElementCount: n, className: o.clase || '',
        _rondoPerfLista: 0, _clases: [],
        classList: {
            add(c) { o.salida.push(c); },
            remove() {}
        },
        getAttribute() { return o.role || null; },
        closest(sel) { return (o.rondo && sel === RONDO) ? { id: 'rondo' } : null; }
    };
}

// ── Imagenes diferidas ─────────────────────────────────────────────────
{
    const normal = img(), enMapa = img({ mapa: true }), deRondo = img({ rondo: true });
    const raiz = { querySelectorAll: (sel) => (sel === 'img:not([loading])' ? [normal, enMapa, deRondo] : []) };
    const mod = new Function('document', 'APP', code)({}, { config: { rendimientoPagina: true } });
    const n = mod.rxPerfLazyImgs(raiz);
    ok('imagenes: solo se difiere la de fuera del mapa', n === 1, 'n=' + n);
    ok('imagen normal: loading=lazy y decoding=async',
        normal._attrs.loading === 'lazy' && normal._attrs.decoding === 'async');
    ok('imagen del mapa: intacta', enMapa._attrs.loading == null && enMapa._attrs.decoding == null);
    ok('imagen de Rondo: intacta', deRondo._attrs.loading == null);
}

// ── Listas grandes ─────────────────────────────────────────────────────
{
    const salida = [];
    const chica = lista(10, { salida });
    const grande = lista(80, { salida });
    const grandeRondo = lista(80, { salida, rondo: true });
    const conRol = lista(60, { salida, tag: 'DIV', role: 'list' });
    const raiz = {
        querySelectorAll: (sel) => (sel === 'ul,ol,[role="list"],.wui2-list,.wui-list'
            ? [chica, grande, grandeRondo, conRol] : [])
    };
    const mod = new Function('document', 'APP', code)({}, { config: { rendimientoPagina: true } });
    const n = mod.rxPerfMarcaListas(raiz);
    ok('listas: solo las grandes y ajenas a Rondo', n === 2, 'n=' + n);
    ok('listas: la grande queda marcada', grande._rondoPerfLista === 1 && salida.indexOf('rondo-perf-lista') >= 0);
    ok('listas: la pequena no se marca', chica._rondoPerfLista === 0);
    ok('listas: la de Rondo no se marca', grandeRondo._rondoPerfLista === 0);
    ok('listas: role=list grande tambien se marca', conRol._rondoPerfLista === 1);
    // Segunda pasada: no se vuelve a marcar (idempotente).
    salida.length = 0;
    ok('listas: idempotente', mod.rxPerfMarcaListas(raiz) === 0 || salida.length === 0);
}

// ── Analisis de peso del DOM ───────────────────────────────────────────
{
    const nodos = [];
    ['DIV', 'IMG', 'IMG', 'CANVAS', 'IFRAME', 'SVG', 'SPAN'].forEach((t) => nodos.push({ tagName: t }));
    const doc = {
        getElementsByTagName: () => nodos,
        querySelectorAll: (sel) => (sel === '.rondo-perf-lista' ? [1, 2, 3] : [0, 1])
    };
    const mod = new Function('document', 'APP', code)(doc, { config: { rendimientoPagina: true } });
    const r = mod.rxPerfResumen();
    ok('resumen: cuenta nodos e imagenes', r && r.nodos === 7 && r.imgs === 2 && r.canvas === 1);
    ok('resumen: iframes, svg y listas optimizadas', r && r.iframes === 1 && r.svg === 1 && r.listas === 3);
    ok('resumen: imagenes diferidas y estado de la capa', r && r.lazy === 2 && r.capa === true);
    const roto = new Function('document', 'APP', code)(
        { getElementsByTagName() { throw new Error('x'); } }, { config: {} });
    ok('resumen: un DOM roto no rompe (devuelve null)', roto.rxPerfResumen() === null);
}

console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasaron');
process.exit(fallos ? 1 : 0);
