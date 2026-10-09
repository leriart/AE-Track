/*
 * Pruebas de la UI del informe por geocerca (v6.19): que la ventana se
 * monte, que "Generar reporte" recalcule y que los botones de descarga
 * respondan.
 *
 * Regresion del fallo real: los botones se enlazaban AL ABRIR, cuando el
 * cuerpo (#rgi-box) todavia estaba vacio, asi que nunca recibian el click y
 * no salia ni el PDF ni el CSV. Ahora se atienden por delegacion, y esto se
 * comprueba simulando el dialogo y disparando el click.
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* ====================== INFORME POR GEOCERCA: NUCLEO');
const fin = src.lastIndexOf('\n}})();') + 2;
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque del informe por geocerca en ' + ARCHIVO);
    process.exit(1);
}

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

// ── Estado y registros de la simulacion ─────────────────────────────────
const R = { prints: [], descargas: [], dialogos: [], peticiones: 0 };
const H = {
    config: { loadZones: true, loadZones2: true },
    zonas: [{ id: 1, n: 'PATIO', t: 3, w: 100, b: { min_x: -0.002, min_y: -0.002, max_x: 0.002, max_y: 0.002, cen_x: 0, cen_y: 0 } }],
    unidades: [{ id: 11, nm: '105', pos: { y: 0, x: 0, s: 0, t: Math.floor(Date.now() / 1000) } }],
    historial: [],
    viajes: {},
    trazas: {},
    seleccion: new Set(),
    RX_GEO: null
};

function fakeEl(id) {
    const el = {
        id: id, style: {}, innerHTML: '', textContent: '', value: '', checked: false,
        children: {}, handlers: {},
        classList: { add() {}, remove() {}, toggle() {}, contains() { return true; } },
        addEventListener(t, h) { (this.handlers[t] = this.handlers[t] || []).push(h); },
        querySelector(sel) {
            const k = String(sel).replace(/^#/, '');
            if (this.children[k]) return this.children[k];
            // Los elementos que el cuerpo crea se registran por su id.
            return nodos[k] || null;
        },
        querySelectorAll() { return []; },
        contains() { return true; },
        focus() {}, remove() {}, click() {}, closest() { return null; }
    };
    return el;
}
const nodos = {};
function resetNodos() { for (const k of Object.keys(nodos)) delete nodos[k]; }

global.document = {
    activeElement: null,
    head: { appendChild() {} },
    body: { appendChild() {}, removeChild() {} },
    createElement(tag) { return fakeEl('tag-' + tag); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
};
global.window = { open() {} };
global.URL = { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} };
global.Blob = function (partes) { this.partes = partes; };
global.FileReader = function () { this.readAsText = function () {}; };
try { Object.defineProperty(global, 'navigator', { value: { clipboard: { writeText() { return Promise.resolve(); } } }, configurable: true }); } catch (_) { /* noop */ }

const UIS = new Proxy({}, { get: () => '<svg></svg>' });
function byId(id) { return id ? (nodos[id] || (nodos[id] = fakeEl(id))) : null; }
function setHtml(el, html) { if (!el) return false; if (el.innerHTML === html) return false; el.innerHTML = html; return true; }
function makeEl(tag, props) { const e = fakeEl('el'); Object.assign(e, props || {}); return e; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function norm(s) { return String(s == null ? '' : s).toUpperCase(); }
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function advice() {} function adviceOk() {} function adviceWarn() {} function adviceErr() {}
function parseUnitName(u) { const n = String((u && u.nm) || ''); const m = n.match(/\b0*(\d{3,5})\b/); const e = m ? m[1] : ''; return { id: u && u.id, nombre: n, eco: e, placa: '', clave: e || n }; }
function unitState(u) { const p = (u && u.pos) || {}; return { t: Number(p.t) || 0, online: true, vel: +p.s || 0, lat: +p.y, lon: +p.x }; }
function glocOrigen(z) { return { id: (z && z.app) ? 'app' : 'plat', corto: (z && z.app) ? 'APP' : 'PLAT', largo: 'x', guardado: false }; }
function zonaAreaM2() { return 31416; }
function centroDeZona(z) { return { lat: z.b.cen_y, lon: z.b.cen_x }; }
function rxCoord(a, b, d) { return (+a).toFixed(d || 5) + ', ' + (+b).toFixed(d || 5); }
function rxFechaHora(t) { return t ? new Date(t).toISOString().slice(0, 16) : '-'; }
function rxInfEstilo() { return ''; }
function rxInfCabecera(a, b, c) { return '<header>' + a + b + c + '</header>'; }
function rxInfPie() { return '<footer></footer>'; }
function rxInfTabla(cab, filas) { return '<table><tr>' + (cab || []).join('') + '</tr>' + (filas || []).map((f) => '<tr>' + f.join('') + '</tr>').join('') + '</table>'; }
function rxCsvCelda(c) { return '"' + String(c == null ? '' : c) + '"'; }
function rxImprimirHTML(html) { R.prints.push(html); }
function rxMiniMapaHTML() { return '<div class="rondo-mm-print">mapa</div>'; }
function rxMiniMapa(cont) { return { cont: cont, lineas: [], marcas: [], medir() {}, render() {}, encuadrar() {}, destruir() {} }; }
function inZone(lat, lon, z) {
    if (!z || lat == null || lon == null) return false;
    const b = z.b; if (b && (lon < b.min_x || lon > b.max_x || lat < b.min_y || lat > b.max_y)) return false;
    const mx = 111320, my = 110540;
    return Math.sqrt(((lon - b.cen_x) * mx) ** 2 + ((lat - b.cen_y) * my) ** 2) <= +z.w;
}
function zoneAt(lat, lon) { for (const z of (H.zonas || [])) if (inZone(lat, lon, z)) return z.n; return ''; }
function geoAlertaDentro(z, lat, lon, m) { return inZone(lat, lon, z); }
function remoteCall() { R.peticiones++; return Promise.resolve({ messages: [] }); }
function rxGeoInfAnilloReal() { return []; }
function abrirDialogo(o) { R.dialogos.push(o); }
const REAL_SETTIMEOUT = global.setTimeout;
function esperar() { return new Promise((r) => REAL_SETTIMEOUT(r, 0)); }

const code = 'const H = P;\n' +
    'const APP = P;\n' +
    'const RX_REPLAY = null;\n' +
    src.slice(ini, fin) +
    '\nreturn {RX_GEO, abrirInformeGeocerca, rxGeoInfReune, rxGeoInfHTML, rxGeoInfCSV, rxGeoInfMD};';
const mod = new Function('P', 'byId', 'setHtml', 'makeEl', 'UIS', 'esc', 'norm', 'clamp', 'advice', 'adviceOk', 'adviceWarn', 'adviceErr',
    'parseUnitName', 'unitState', 'glocOrigen', 'zonaAreaM2', 'centroDeZona', 'rxCoord', 'rxFechaHora', 'rxInfEstilo', 'rxInfCabecera', 'rxInfPie',
    'rxInfTabla', 'rxCsvCelda', 'rxImprimirHTML', 'rxMiniMapa', 'rxMiniMapaHTML', 'remoteCall', 'abrirDialogo', 'inZone', 'zoneAt', 'geoAlertaDentro',
    'document', 'window', 'URL', 'Blob', code)(
    H, byId, setHtml, makeEl, UIS, esc, norm, clamp, advice, adviceOk, adviceWarn, adviceErr,
    parseUnitName, unitState, glocOrigen, zonaAreaM2, centroDeZona, rxCoord, rxFechaHora, rxInfEstilo, rxInfCabecera, rxInfPie,
    rxInfTabla, rxCsvCelda, rxImprimirHTML, rxMiniMapa, rxMiniMapaHTML, remoteCall, abrirDialogo, inZone, zoneAt, geoAlertaDentro,
    global.document, global.window, global.URL, global.Blob);

// ── Monta el dialogo como lo haria el usuario ───────────────────────────
function montar() {
    resetNodos();
    R.dialogos.length = 0;
    nodos['rgi-mapa'] = fakeEl('rgi-mapa');
    nodos['rgi-box'] = fakeEl('rgi-box');
    nodos['rgi-carga'] = fakeEl('rgi-carga');
    nodos['rgi-barra'] = fakeEl('rgi-barra');
    nodos['rgi-carga-t'] = fakeEl('rgi-carga-t');
    mod.abrirInformeGeocerca();
    const dlg = R.dialogos[R.dialogos.length - 1];
    const raiz = fakeEl('rondo-dialog');
    raiz.children['rgi-box'] = nodos['rgi-box'];
    raiz.children['rgi-carga'] = nodos['rgi-carga'];
    raiz.children['rgi-barra'] = nodos['rgi-barra'];
    raiz.children['rgi-carga-t'] = nodos['rgi-carga-t'];
    dlg.onOpen(raiz);
    return dlg;
}
// Dispara el click delegado del cuerpo sobre un boton concreto.
function clickEn(id, extra) {
    const btn = fakeEl(id);
    btn.id = id;
    for (const k of Object.keys(extra || {})) btn[k] = extra[k];
    const box = nodos['rgi-box'];
    const ev = {
        target: {
            closest(sel) {
                if (sel === 'button') return btn;
                if (sel === '[data-rgi]') return extra && extra.dataset ? { dataset: extra.dataset, contains: () => true } : null;
                if (sel === '.gg-leyenda,.gg-hud') return null;
                return null;
            }
        }
    };
    for (const h of (box.handlers.click || [])) h(ev);
}

(async function () {
    // 1) Montaje: la ventana tiene mapa, barra, boton de generar y salidas.
    const dlg = montar();
    await esperar(); await esperar();
    ok('la ventana se abre con titulo y ancho', dlg && /Informe por geocerca/.test(dlg.titulo) && dlg.ancho >= 700);
    ok('el shell trae mapa, barra de progreso y caja de datos',
        /id="rgi-mapa"/.test(dlg.html) && /id="rgi-carga"/.test(dlg.html) && /id="rgi-box"/.test(dlg.html));
    ok('la caja de datos se rellena al abrir (fuente local)',
        /id="rgi-generar"/.test(nodos['rgi-box'].innerHTML) &&
        /id="rgi-pdf"/.test(nodos['rgi-box'].innerHTML) &&
        /id="rgi-csv"/.test(nodos['rgi-box'].innerHTML) &&
        /id="rgi-md"/.test(nodos['rgi-box'].innerHTML));

    // 2) Los botones de descarga responden (regresion del fallo real).
    const antesHtml = nodos['rgi-box'].innerHTML;
    R.prints.length = 0;
    clickEn('rgi-pdf');
    ok('el boton PDF genera el reporte imprimible', R.prints.length === 1 && /Rondo/.test(R.prints[0]),
        'prints=' + R.prints.length);
    let errCsv = '';
    try { clickEn('rgi-csv'); } catch (e) { errCsv = e.message; }
    ok('el boton CSV descarga sin errores', !errCsv, errCsv);
    let errMd = '';
    try { clickEn('rgi-md'); } catch (e) { errMd = e.message; }
    ok('el boton Markdown descarga sin errores', !errMd, errMd);
    ok('las descargas no alteran ni cierran la ventana',
        nodos['rgi-box'].innerHTML === antesHtml && R.dialogos.length === 1);

    // 3) "Generar reporte" recalcula.
    mod.RX_GEO.listo = false;
    const peticionesAntes = R.peticiones;
    clickEn('rgi-generar');
    await esperar(); await esperar();
    ok('"Generar reporte" recalcula y marca los datos como listos',
        mod.RX_GEO.listo === true, 'listo=' + mod.RX_GEO.listo);
    ok('con una fuente local no consulta la plataforma', R.peticiones === peticionesAntes,
        'peticiones=' + (R.peticiones - peticionesAntes) + ' fuente=' + mod.RX_GEO.fuente + ' stack=' + String(R.stack || '').split('\n')[1]);

    // 4) Cambiar una opcion no recarga (solo repinta).
    mod.RX_GEO.listo = true;
    mod.RX_GEO.fuente = 'rastreo';
    const p2 = R.peticiones;
    clickEn('x', { dataset: { rgi: 'modo', v: 'paradas' }, closest: null });
    await esperar(); await esperar();
    ok('cambiar de modo no recarga los datos', mod.RX_GEO.listo === false && R.peticiones === p2);
    ok('el modo cambia en el estado', mod.RX_GEO.modo === 'paradas', mod.RX_GEO.modo);

    // 5) Con la fuente Plataforma, "Generar reporte" si consulta (se cambia
    //    el rango para no caer en la cache del escaneo anterior).
    mod.RX_GEO.fuente = 'historial';
    mod.RX_GEO.listo = false;
    mod.RX_GEO.rango = '';
    mod.RX_GEO.desde = '2026-01-01';
    const p3 = R.peticiones;
    clickEn('rgi-generar');
    await esperar(); await esperar(); await esperar();
    ok('con Plataforma, generar consulta el historial', R.peticiones > p3,
        'peticiones nuevas=' + (R.peticiones - p3));

    console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasan');
    process.exit(fallos ? 1 : 0);
})();