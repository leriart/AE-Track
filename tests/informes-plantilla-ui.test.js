/*
 * Pruebas de la UI de los informes por plantilla: que el dialogo se monte y se
 * pinte, y que los botones respondan por delegacion.
 *
 * Regresion real: al anadir el aviso de "columnas vacias" se uso `hay` antes de
 * declararlo (ReferenceError en el TDZ) y el dialogo se abria EN BLANCO. Aqui se
 * monta el dialogo de verdad y se comprueba que pinta.
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* ====================== INFORMES POR PLANTILLA (API)');
const fin = src.lastIndexOf('\n})();');
if (ini < 0 || fin < 0) {
    console.error('No se encontro el bloque de informes por plantilla en ' + ARCHIVO);
    process.exit(1);
}

const nodos = {};
const APP = {
    zonas: [{ n: 'PATIO', t: 3, w: 100 }], unidades: [{ id: 7, nm: '105', pos: { t: 1750000000, y: 0, x: 0 } }],
    historial: [], viajes: {}, trazas: {}, seleccion: new Set(['105']), config: {}, unlocked: false
};
const R = { dialogos: [], llamadas: [] };
const LS = { infplant: 'rondo.api.infplant' };

function fakeEl(id) {
    return {
        id: id, style: {}, innerHTML: '', textContent: '', value: '', disabled: false,
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        addEventListener(t, h) { (this.handlers = this.handlers || {})[t] = (this.handlers[t] || []).concat(h); },
        querySelector(sel) {
            const k = String(sel || '').replace(/^#/, '');
            return k ? byId(k) : null;
        },
        querySelectorAll() { return []; },
        contains() { return true; },
        setAttribute() {}, focus() {}, remove() {}, click() {}, closest() { return null; }
    };
}
function byId(id) { return id ? (nodos[id] || (nodos[id] = fakeEl(id))) : null; }
function setHtml(el, html) { if (el && el.innerHTML !== html) { el.innerHTML = html; return true; } return false; }

const stubs = [
    'const APP = P_APP;', 'const LS = P_LS;', 'const RX_REPLAY = null;',
    'const UIS = new Proxy({}, { get: () => "<svg></svg>" });',
    'function esc(s){ return String(s == null ? "" : s); }',
    'function norm(s){ return String(s == null ? "" : s).normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().trim(); }',
    'function byId(id){ return P_BYID(id); }',
    'function setHtml(el, h){ return P_SETHTML(el, h); }',
    'function makeEl(t, p){ return Object.assign({}, p || {}); }',
    'function advice(){} function adviceOk(){} function adviceWarn(){} function adviceErr(){}',
    'function rxFechaHora(){ return "2026-03-10 10:00"; }',
    'function rxCsvCelda(c){ return "\\"" + String(c == null ? "" : c) + "\\""; }',
    'function rxInfTabla(c, f){ return "<table><tr>" + (c || []).join("") + "</tr>" + (f || []).map((x) => "<tr>" + x.join("") + "</tr>").join("") + "</table>"; }',
    'function rxInfEstilo(){ return ""; }',
    'function rxInfCabecera(){ return ""; }',
    'function rxInfPie(){ return ""; }',
    'function rxImprimirHTML(h){ P_R.prints.push(h); }',
    'function rxReplayDescargar(){ P_R.descargas++; }',
    'function rxGeoInfNombre(z){ return (z && (z.n || z.nombre)) || ""; }',
    'function rxGeoInfAnillo(){ return [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }, { lat: 1, lon: 1 }]; }',
    'function rxGeoInfFechaMs(s, fin){ return s ? new Date(s + "T00:00:00").getTime() : 0; }',
    'function rxGeoInfFechaTxt(ms){ return ms ? "10/03/2026" : ""; }',
    'function rxGeoInfTrozos(a, b, p){ const out = []; for (let t = a; t <= b && out.length < 12; t += (p || 604800)) out.push([t, Math.min(b, t + (p || 604800) - 1)]); return out; }',
    'function rxGeoInfYield(){ return Promise.resolve(); }',
    'function parseUnitName(u){ return { id: u && u.id, nombre: u && u.nm, eco: u && u.nm, clave: u && u.nm }; }',
    'function unitState(u){ const p = (u && u.pos) || {}; return { t: Number(p.t) || 0, lat: p.y, lon: p.x, vel: 0, online: true }; }',
    'function glocOrigen(){ return { id: "plat", corto: "PLAT", largo: "de la plataforma" }; }',
    'function rxMiniMapa(c, d){ return { encuadrar() {}, destruir() {} }; }',
    'function rxMiniMapaHTML(){ return "<div>mapa</div>"; }',
    'function readJSON(k, f){ return f; }',
    'function writeJSON(){}',
    'function abrirDialogo(o){ P_R.dialogos.push(o); }',
    'function remoteCall(m, p){ P_R.llamadas.push({ m: m, p: p }); if (m === "core/search_items") return Promise.resolve({ items: [{ id: 3, rep: { 1: { id: 11, n: "Resumen diario" }, 2: { id: 12, n: "GEOCERCA" } } }] });' +
        ' if (m === "report/get_report_data") {' +
        '   var id = String((p.col || [])[0] || "");' +
        '   if (id === "12") return Promise.resolve([{ id: 12, n: "GEOCERCA", ct: "avl_geozone", tbl: [{ n: "t", l: "Unidades", c: "[\\"unit\\",\\"entry\\"]", cl: "[\\"Unidad\\",\\"Hora de entrada\\"]", p: "{\\"units\\":\\"27418488\\"}" }] }]);' +
        '   return Promise.resolve([{ id: Number(id) || 11, n: "Resumen diario", ct: "avl_unit", tbl: [{ n: "t", l: "Resumen", c: "[\\"unit\\",\\"km\\"]", cl: "[\\"Unidad\\",\\"Km\\"]", p: "{}" }] }]); }' +
        // La lectura es sincrona: exec_report ya trae las filas. "lento" lo
        // hace esperar para poder ver el progreso en marcha.
        ' if (m === "report/exec_report") {' +
        '   var resp = { reportResult: { columns: [{ n: "Unidad" }, { n: "Km" }], rows: [["105", 12]] } };' +
        '   if (P_R.lento) return new Promise(function (r) { setTimeout(function () { r(resp); }, 80); });' +
        '   return Promise.resolve(resp); }' +
        ' return Promise.resolve({}); }',
    'const document = P_DOC;', 'const window = {};', 'const URL = { createObjectURL(){ return "blob:x"; }, revokeObjectURL(){} };',
    'const Blob = function () {};'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn {RX_INF, abrirInformesPlantilla, rxInfVista, rxInfCorre, rxInfPista, rxInfEsDeGeocercas};';
const DOC = {
    createElement: (t) => fakeEl('tag-' + t),
    body: { appendChild() {}, removeChild() {} },
    head: { appendChild() {} },
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}
};
const mod = new Function('P_APP', 'P_LS', 'P_BYID', 'P_SETHTML', 'P_R', 'P_DOC', code)(APP, LS, byId, setHtml, R, DOC);

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

// Monta el dialogo como lo haria el usuario.
function montar() {
    for (const k of Object.keys(nodos)) delete nodos[k];
    R.dialogos.length = 0;
    mod.abrirInformesPlantilla();
    const dlg = R.dialogos[R.dialogos.length - 1];
    dlg.onOpen(fakeEl('raiz'));
    return dlg;
}
// Click delegado sobre un boton del cuerpo.
function clickEn(id) {
    const btn = fakeEl(id);
    const box = byId('rgi-box');
    const ev = { target: { closest(sel) { return (sel === 'button') ? btn : null; } } };
    for (const h of (box.handlers.click || [])) h(ev);
}
// Click sobre una opcion (chip), que repinta sin relanzar la ejecucion.
function chipEn(que, v) {
    const el = { dataset: { i: que, v: v }, contains: () => true };
    const box = byId('rgi-box');
    const ev = { target: { closest: (sel) => (sel === '[data-i]' ? el : null) } };
    for (const h of (box.handlers.click || [])) h(ev);
}

(async function () {
    // 1) Regresion: el dialogo se pinta (antes se abria en blanco).
    const dlg = montar();
    ok('el dialogo se abre', !!dlg && /Informes de la plataforma/.test(dlg.titulo));
    const h0 = byId('rgi-box').innerHTML;
    ok('el cuerpo se pinta al abrir (no se queda en blanco)',
        /id="rgi-ejecutar"|id="rgi-tpl-cargar"/.test(h0), String((h0 || '').length) + ' caracteres');
    ok('trae buscador de plantillas y contador', /id="rgi-buscar"/.test(h0));
    ok('trae los atajos de periodo', /data-i="rango"/.test(h0) && /Este año/.test(h0));
    ok('no hay fila "Objeto" (se elimino)', !/reportObjectSecId/.test(h0) && !/>Objeto</.test(h0));

    // 2) Lee las plantillas y las lista (auto al abrir).
    await new Promise((r) => setTimeout(r, 30));
    const html = byId('rgi-box').innerHTML;
    ok('lee las plantillas de la plataforma y las lista',
        /Resumen diario/.test(html) && /rgi-tpl-sel/.test(html), String(R.llamadas.length) + ' llamadas');

    // 3) Con datos, aparecen tabla y salidas.
    mod.RX_INF.tpl = { rid: 3, id: 12, nombre: 'GEOCERCA' };
    mod.RX_INF.cols = ['Unidad', 'Geocerca', 'Km'];
    mod.RX_INF.filas = [['105', 'PATIO', 12], ['205', 'CEDIS', 8]];
    mod.RX_INF.meta = { filas: 2, unidades: 2, trozos: 1, objetos: 1, ms: 900, fallos: 0, cacheados: 0 };
    clickEn('rgi-tpl-cargar');
    await new Promise((r) => setTimeout(r, 40));
    const h2 = byId('rgi-box').innerHTML;
    ok('con resultados muestra la tabla', /rgi-prev/.test(h2) && /Geocerca/.test(h2));
    ok('con resultados muestra las tres salidas',
        /id="rgi-pdf"/.test(h2) && /id="rgi-csv"/.test(h2) && /id="rgi-md"/.test(h2));
    ok('ofrece el filtro por geocerca si la plantilla trae esa columna',
        /id="rgi-zona-busca"/.test(h2) || /data-zona/.test(h2), 'faltaria el filtro de geocerca');

    // 4) Sin resultados, la pantalla avisa y no rompe.
    mod.RX_INF.cols = []; mod.RX_INF.filas = []; mod.RX_INF.meta = null;
    clickEn('rgi-tpl-cargar');
    await new Promise((r) => setTimeout(r, 40));
    ok('sin resultados avisa y sigue pintando',
        /Sin resultados/.test(byId('rgi-box').innerHTML),
        byId('rgi-box').innerHTML.slice(0, 160));

    // 5) Pistas por el nombre: una plantilla de geocerca se pregunta por
    //    geocercas aunque no se haya leido su declaracion.
    ok('pista: "GEOCERCA" se reconoce como plantilla de geocercas',
        mod.rxInfPista({ nombre: 'GEOCERCA' }) === 'geocercas' &&
        mod.rxInfPista({ nombre: 'Informe de Combustible' }) === 'vehiculos' &&
        mod.rxInfPista({ nombre: 'test' }) === '');
    mod.RX_INF.decl = null; mod.RX_INF._declKey = '';
    mod.RX_INF.tpl = { rid: 3, id: 12, nombre: 'GEOCERCA' };
    ok('sin declaracion, una plantilla de geocercas igual ofrece elegir geocerca',
        mod.rxInfEsDeGeocercas() === true);
    mod.RX_INF.tpl = { rid: 3, id: 13, nombre: 'Recorrido Granja' };
    ok('una plantilla que no es de geocercas no ofrece el filtro',
        mod.rxInfEsDeGeocercas() === false);

    // 6) Progreso: se ve DENTRO del cuerpo, no solo en la barra de arriba.
    //    (Con cientos de objetos el primer trozo tarda: si el progreso solo se
    //    pinta al terminar el primero, parece un dialogo parado.)
    mod.RX_INF.decl = null; mod.RX_INF._declKey = '';
    mod.RX_INF.tpl = { rid: 3, id: 11, nombre: 'Resumen diario' };
    mod.RX_INF.cols = []; mod.RX_INF.filas = []; mod.RX_INF.meta = null;
    mod.RX_INF.alcance = 'todas';
    R.lento = true;
    clickEn('rgi-ejecutar');
    await new Promise((r) => setTimeout(r, 20));
    const enCurso = byId('rgi-box').innerHTML;
    ok('mientras calcula se ve el progreso dentro del cuerpo',
        /id="rgi-prog"/.test(enCurso) && /Resumen diario/.test(enCurso),
        enCurso.slice(0, 120));
    ok('mientras calcula el boton pasa a Cancelar',
        /id="rgi-cancel"/.test(enCurso) && /Cancelar/.test(enCurso));
    // Una sola barra, dentro del cuerpo (regresion: habia dos, una aqui y otra
    // en la cabecera del dialogo).
    ok('solo hay UNA barra de progreso y esta en el cuerpo',
        (enCurso.match(/class="rgi-barra"/g) || []).length === 1 && /id="rgi-prog-b"/.test(enCurso));
    // Los informes van de uno en uno (el servidor no admite paralelismo); se
    // espera a que termine la tanda.
    for (let i = 0; i < 60 && mod.RX_INF._buscando; i++) await new Promise((r) => setTimeout(r, 50));
    R.lento = false;
    ok('al terminar el progreso desaparece y quedan los resultados',
        !/id="rgi-prog"/.test(byId('rgi-box').innerHTML) &&
        /rgi-prev/.test(byId('rgi-box').innerHTML) && mod.RX_INF.filas.length > 0,
        'filas=' + mod.RX_INF.filas.length);
    ok('al terminar guarda el numero de unidades en el resumen',
        mod.RX_INF.meta && mod.RX_INF.meta.unidades >= 1, JSON.stringify(mod.RX_INF.meta));

    // 7) La pantalla ensena que declara la plantilla: sus columnas y los
    //    filtros con los que viene guardada.
    mod.RX_INF.tpl = { rid: 3, id: 12, nombre: 'GEOCERCA' };
    mod.RX_INF._declKey = 'decl|3:12';
    mod.RX_INF.decl = {
        nombre: 'GEOCERCA', tipoObj: 'avl_geozone', esGeo: true, esUnidad: false,
        columnas: ['Unidad', 'Hora de entrada', 'Hora de salida', 'Duracion en'],
        params: [{ tabla: 'Unidades', k: 'units', v: '27418488' }], tablas: []
    };
    chipEn('vista', 'filas');
    await new Promise((r) => setTimeout(r, 20));
    const h3 = byId('rgi-box').innerHTML;
    ok('el panel dice a que esta atada la plantilla', /Geocercas/.test(h3), h3.slice(0, 200));
    ok('el panel ensena las columnas que trae la plantilla',
        /Lo que trae la plantilla/.test(h3) && /Hora de entrada/.test(h3) && /Duracion en/.test(h3));
    ok('el panel ensena los filtros con los que viene guardada',
        /Filtros guardados/.test(h3) && /units: 27418488/.test(h3));
    ok('la plantilla de geocercas ofrece el filtro de geocerca',
        /id="rgi-zona-busca"/.test(h3) || /data-zona/.test(h3));

    console.log(fallos ? ('\n' + fallos + ' fallo(s)') : '\nTodos los tests pasan');
    process.exit(fallos ? 1 : 0);
})();
