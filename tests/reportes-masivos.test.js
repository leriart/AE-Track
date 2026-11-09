/*
 * Pruebas de los reportes masivos de recorridos (fragmento 59): un informe
 * nativo de la plataforma por unidad, descargado automaticamente.
 *
 * El motor (rxMasCorre) recibe la ejecucion y la descarga por parametro, asi
 * que se prueba sin red: basta inyectar una `ejecuta` simulada y espiar las
 * descargas. Tambien se cubren el nombre de archivo, el CSV y la lista de
 * unidades.
 */
'use strict';

const { ARCHIVO, src } = require('./_source.js');

const ini = src.indexOf('/* ====================== REPORTES MASIVOS DE RECORRIDOS');
const fin = src.lastIndexOf('\n})();');
if (ini < 0 || fin < 0 || fin <= ini) {
    console.error('No se encontro el bloque de reportes masivos en ' + ARCHIVO);
    process.exit(1);
}

const stubs = [
    'function clamp(v,a,b){ return Math.min(b, Math.max(a, v)); }',
    'function esc(s){ return String(s==null?"":s); }',
    'function norm(s){ return String(s==null?"":s).normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").toUpperCase().trim(); }',
    'function rxInfEspera(){ return Promise.resolve(); }',
    'function rxCsvCelda(c){ return "\\"" + String(c==null?"":c) + "\\""; }',
    'function rxInfCSVTexto(cols, filas, extra){ const L=[];' +
        ' if(extra&&extra.length) L.push(extra.map(rxCsvCelda).join(","));' +
        ' L.push((cols||[]).map(rxCsvCelda).join(","));' +
        ' for (const f of (filas||[])) L.push((f||[]).map(rxCsvCelda).join(","));' +
        ' return L.join("\\n"); }',
    'function parseUnitName(u){ const n=String((u&&u.nm)||""); const m=n.match(/\\b0*(\\d{3,5})\\b/);' +
        ' const e=m?m[1]:""; return {id:u&&u.id,nombre:n,eco:e,placa:"",clave:e||n}; }',
    'const APP = { unidades: [] };',
    // Stubs de UI y de la API de plantillas para montar el dialogo.
    'const UIS = new Proxy({}, { get: function(){ return "<svg></svg>"; } });',
    'const nodos = {};',
    'function fakeEl(id){ return { id:id, style:{}, innerHTML:"", textContent:"", value:"", isConnected:true,' +
        ' children:{}, handlers:{}, dataset:{},' +
        ' classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return true;}},' +
        ' addEventListener:function(t,h){ (this.handlers[t]=this.handlers[t]||[]).push(h); },' +
        ' querySelector:function(sel){ var k=String(sel).replace(/^#/,""); return this.children[k]||nodos[k]||null; },' +
        ' querySelectorAll:function(){ return []; }, contains:function(){ return true; },' +
        ' focus:function(){}, click:function(){}, closest:function(){ return null; } }; }',
    'function byId(id){ return id ? (nodos[id]||(nodos[id]=fakeEl(id))) : null; }',
    'function setHtml(el, html){ if(!el) return false; if(el.innerHTML===html) return false; el.innerHTML=html; return true; }',
    'function abrirDialogo(o){ global.__rmasDlg = o; }',
    'function rxInfPlantillas(){ return Promise.resolve([{rid:7,id:3,nombre:"Recorridos diarios"}]); }',
    'function rxInfClave(t){ return (t&&t.rid!=null) ? (t.rid+":"+t.id) : ""; }',
    'function rxInfTplDeClave(v){ var p=String(v||"").split(":"); return p.length===2?{rid:p[0],id:p[1],nombre:"Plantilla "+p[1]}:null; }',
    'function rxInfExplicaError(m){ return String(m||""); }',
    // Exportacion nativa: base de la API, sesion y descarga binaria.
    'function rxPlatApiUrl(){ return "https://hst-api.example.com"; }',
    'const PAGE = { location: { origin: "https://app.example.com" } };',
    'function session(){ return { getId: function(){ return "SID123"; } }; }',
    'function gmXhr(){ return null; }'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn { RX_MAS, RX_MAS_ESPERA_DESCARGA, rxMasUnidades, rxMasNombreArchivo, rxMasCSV, rxMasCorre,' +
    ' rxMasExportUrl, rxMasApiBase, rxMasSid, rxMasBytesTipo, rxMasMotivoError, rxMasGuardaPdf, abrirReportesMasivos, fakeEl,' +
    ' setUnidades:function(l){ APP.unidades = l; } };';
const mod = new Function(code)();
global.document = {
    body: { appendChild() {}, removeChild() {} },
    createElement(tag) { return mod.fakeEl(tag); }
};

let fallos = 0;
function ok(nombre, cond, extra) {
    if (cond) console.log('ok    - ' + nombre);
    else { fallos++; console.log('FALLO - ' + nombre + (extra ? ' (' + extra + ')' : '')); }
}

const TPL = { rid: 7, id: 3, nombre: 'Recorridos diarios' };

// ── Nombre de archivo y CSV ─────────────────────────────────────────────
ok('nombre: plantilla, unidad y periodo',
    mod.rxMasNombreArchivo(TPL, 'ECO 105', '2026-11-01', '2026-11-03') ===
    'rondo_recorridos_Recorridos_diarios_ECO_105_2026-11-01_a_2026-11-03.csv',
    mod.rxMasNombreArchivo(TPL, 'ECO 105', '2026-11-01', '2026-11-03'));
ok('nombre: sin plantilla no rompe',
    /^rondo_recorridos_recorridos_105_/.test(mod.rxMasNombreArchivo(null, '105', '2026-11-01', '2026-11-02')));

mod.RX_MAS.desde = '2026-11-01';
mod.RX_MAS.hasta = '2026-11-03';
const csv = mod.rxMasCSV(TPL, '105', ['Unidad', 'km'], [['105', '12.5'], ['105', '8']]);
ok('csv: metadatos de plantilla, unidad y periodo',
    csv.indexOf('Recorridos diarios') >= 0 && csv.indexOf('105') >= 0 && csv.indexOf('2026-11-01') >= 0);
ok('csv: cabecera y dos filas', csv.split('\n').length === 4, csv.split('\n').length);
ok('nombre: extension PDF', /\.pdf$/.test(mod.rxMasNombreArchivo(TPL, '105', '2026-11-01', '2026-11-03', '.pdf')));

// ── Exportacion nativa (PDF de la plataforma) ──────────────────────────
ok('export: base de la API con /wialon/ajax.html',
    mod.rxMasApiBase() === 'https://hst-api.example.com/wialon/ajax.html', mod.rxMasApiBase());
ok('export: toma el sid de la sesion actual', mod.rxMasSid() === 'SID123', mod.rxMasSid());
const url = mod.rxMasExportUrl('rondo_recorridos_x_105.pdf');
ok('export: URL con el servicio, sid y formato PDF',
    url.indexOf('svc=report/export_result') > 0 && url.indexOf('sid=SID123') > 0 &&
    url.indexOf(encodeURIComponent('"format":2')) > 0);
ok('export: pide mapa, sin comprimir y nombre de archivo',
    url.indexOf(encodeURIComponent('"attachMap":1')) > 0 &&
    url.indexOf(encodeURIComponent('"compress":0')) > 0 &&
    url.indexOf(encodeURIComponent('"outputFileName":"rondo_recorridos_x_105"')) > 0);
// El PDF nativo sale en A4 fijo por defecto: con compacto/sin ajuste la
// pagina se ensancha y al imprimir se corta el lado derecho.
ok('export: ancho de pagina fijo (A4) por defecto',
    url.indexOf(encodeURIComponent('"pageWidth":0')) > 0 &&
    url.indexOf(encodeURIComponent('"pageWidth":1')) < 0);
mod.RX_MAS.pdfAncho = 2;
ok('export: respeta el ancho compacto/sin ajuste elegido',
    mod.rxMasExportUrl('x.pdf').indexOf(encodeURIComponent('"pageWidth":2')) > 0);
mod.RX_MAS.pdfAncho = 9;
ok('export: un ancho invalido vuelve a fijo',
    mod.rxMasExportUrl('x.pdf').indexOf(encodeURIComponent('"pageWidth":0')) > 0);
mod.RX_MAS.pdfAncho = 0;
ok('export: sin nombre sigue armando la URL', /svc=report\/export_result/.test(mod.rxMasExportUrl('')));

// ── Validacion del archivo nativo ──────────────────────────────────────
const bytes = (txt) => new Uint8Array(Array.from(txt).map((c) => c.charCodeAt(0)));
ok('pdf: detecta la firma %PDF-', mod.rxMasBytesTipo(bytes('%PDF-1.7 ...')) === 'pdf');
ok('pdf: detecta HTML, JSON, gzip y zip',
    mod.rxMasBytesTipo(bytes('<html><title>x</title></html>')) === 'html' &&
    mod.rxMasBytesTipo(bytes('{"error":"sesion"}')) === 'json' &&
    mod.rxMasBytesTipo(new Uint8Array([0x1f, 0x8b, 0, 0])) === 'gzip' &&
    mod.rxMasBytesTipo(new Uint8Array([0x50, 0x4b, 0x03, 0x04])) === 'zip');
ok('pdf: respuesta vacia', mod.rxMasBytesTipo(new Uint8Array(0)) === 'vacio');
ok('pdf: explica un HTML (titulo)', /pagina HTML/.test(mod.rxMasMotivoError('html', bytes('<html><title>No autorizado</title></html>'))) &&
    /No autorizado/.test(mod.rxMasMotivoError('html', bytes('<html><title>No autorizado</title></html>'))));
ok('pdf: explica un JSON (mensaje)', /respuesta JSON/.test(mod.rxMasMotivoError('json', bytes('{"error":"SID invalido"}'))) &&
    /SID invalido/.test(mod.rxMasMotivoError('json', bytes('{"error":"SID invalido"}'))) );

// ── Lista de unidades ───────────────────────────────────────────────────
mod.setUnidades([
    { id: 3, nm: 'TRACTO 010' },
    { id: 1, nm: 'TRACTO 002' },
    { id: 2, nm: 'SIN NUMERO' },
    null
]);
const us = mod.rxMasUnidades();
ok('unidades: {id, eco} ordenadas por economico',
    us.length === 3 && us[0].eco === '002' && us[1].eco === '010' && us[2].eco === 'SIN NUMERO',
    us.map((u) => u.eco).join(','));

// ── Motor del lote ──────────────────────────────────────────────────────
(async () => {
    // Caso feliz: 3 unidades, todas con filas; una descarga por unidad.
    {
        const llamadas = [], descargas = [], prog = [];
        const ejecuta = (u) => {
            llamadas.push(u.eco);
            return Promise.resolve({ filas: [['105', '1']], cols: ['Unidad', 'Viajes'] });
        };
        const res = await mod.rxMasCorre(
            [{ id: '1', eco: 'A' }, { id: '2', eco: 'B' }, { id: '3', eco: 'C' }],
            (h, t, eco) => prog.push([h, t, eco]), null, ejecuta,
            (u, r) => descargas.push(u.eco));
        ok('lote: ejecuta una vez por unidad, en orden', llamadas.join(',') === 'A,B,C', llamadas.join(','));
        ok('lote: una descarga por unidad con filas', descargas.join(',') === 'A,B,C', descargas.join(','));
        ok('lote: resumen con las filas de cada una',
            res.length === 3 && res.every((x) => x.filas === 1 && !x.error));
        ok('lote: avisa progreso y cierre',
            prog.length === 4 && prog[0][2] === 'A' && prog[3][1] === 3);
    }
    // Unidad sin filas: no descarga, pero queda en el resumen.
    {
        const descargas = [];
        const ejecuta = (u) => Promise.resolve(u.eco === 'B'
            ? { filas: [], cols: [] }
            : { filas: [['x']], cols: ['c'] });
        const res = await mod.rxMasCorre(
            [{ id: '1', eco: 'A' }, { id: '2', eco: 'B' }],
            null, null, ejecuta, (u) => descargas.push(u.eco));
        ok('lote: la unidad sin filas no descarga', descargas.join(',') === 'A', descargas.join(','));
        ok('lote: la unidad sin filas queda en el resumen con 0',
            res.length === 2 && res[1].eco === 'B' && res[1].filas === 0 && !res[1].error);
    }
    // Error de la plataforma: se captura por unidad y el lote sigue.
    {
        const ejecuta = (u) => (u.eco === 'A'
            ? Promise.reject(new Error('report/exec_report -> code 1004'))
            : Promise.resolve({ filas: [['x']], cols: ['c'] }));
        const res = await mod.rxMasCorre(
            [{ id: '1', eco: 'A' }, { id: '2', eco: 'B' }],
            null, null, ejecuta, null);
        ok('lote: el error de una unidad no tira el lote',
            res.length === 2 && /1004/.test(res[0].error) && res[1].filas === 1);
    }
    // Error devuelto (no lanzado) tambien queda en el resumen.
    {
        const ejecuta = () => Promise.resolve({ filas: [], error: 'code 1001' });
        const res = await mod.rxMasCorre([{ id: '1', eco: 'A' }], null, null, ejecuta, null);
        ok('lote: error devuelto queda en el resumen', res.length === 1 && res[0].error === 'code 1001');
    }
    // Cancelacion: se detiene antes de la siguiente unidad.
    {
        const llamadas = [];
        const token = { cancelado: false };
        const ejecuta = (u) => { llamadas.push(u.eco); token.cancelado = true; return Promise.resolve({ filas: [['x']], cols: ['c'] }); };
        const res = await mod.rxMasCorre(
            [{ id: '1', eco: 'A' }, { id: '2', eco: 'B' }, { id: '3', eco: 'C' }],
            null, token, ejecuta, null);
        ok('lote: cancelar detiene el lote', llamadas.join(',') === 'A' && res.length === 1, llamadas.join(','));
    }
    // Sin unidades: no rompe.
    {
        const res = await mod.rxMasCorre([], null, null, () => Promise.resolve({}), null);
        ok('lote: sin unidades no rompe', Array.isArray(res) && res.length === 0);
    }
    // Una descarga que falla no detiene el lote.
    {
        const ejecuta = () => Promise.resolve({ filas: [['x']], cols: ['c'] });
        const res = await mod.rxMasCorre(
            [{ id: '1', eco: 'A' }, { id: '2', eco: 'B' }],
            null, null, ejecuta, () => { throw new Error('bloqueada'); });
        ok('lote: una descarga fallida no detiene el lote', res.length === 2 && res.every((x) => x.filas === 1));
    }

    // PDF nativo: ejecuta y espera la descarga asincrona (sin filas).
    {
        const descargas = [];
        const ejecuta = () => Promise.resolve({ nativo: true, filas: [] });
        const descarga = (u) => new Promise((r) => { descargas.push(u.eco); r(true); });
        const res = await mod.rxMasCorre(
            [{ id: '1', eco: 'A' }, { id: '2', eco: 'B' }],
            null, null, ejecuta, descarga);
        ok('lote PDF: descarga nativa por unidad', descargas.join(',') === 'A,B', descargas.join(','));
        ok('lote PDF: resumen nativo sin errores',
            res.length === 2 && res.every((x) => x.nativo && !x.error));
    }
    // Una descarga nativa que falla se marca y el lote continua.
    {
        const ejecuta = () => Promise.resolve({ nativo: true, filas: [] });
        const descarga = (u) => Promise.reject(new Error('sin PDF'));
        const res = await mod.rxMasCorre(
            [{ id: '1', eco: 'A' }, { id: '2', eco: 'B' }],
            null, null, ejecuta, descarga);
        ok('lote PDF: la descarga fallida no tira el lote',
            res.length === 2 && /sin PDF/.test(res[0].error) && res[0].nativo === false);
    }
    // No se guarda como PDF si el contenido no lo es.
    {
        let err = null;
        await mod.rxMasGuardaPdf(bytes('<html>error</html>'), 'x.pdf').catch((e) => { err = e; });
        ok('pdf: un HTML no se guarda como PDF', !!err && /HTML/i.test(err.message));
        err = null;
        await mod.rxMasGuardaPdf(new Uint8Array(0), 'x.pdf').catch((e) => { err = e; });
        ok('pdf: una respuesta vacia no se guarda', !!err && /vacia/.test(err.message));
    }
    // Reabrir: el memo de setHtml se invalida (si no, el cuerpo sale vacio).
    ok('ui: el dialogo invalida el memo al abrir', /invalidarHtml\('rmas-box'\)/.test(src));

    // ── Montaje del dialogo: maquetado con las clases de Rondo ──────────
    {
        mod.abrirReportesMasivos();
        const dlg = global.__rmasDlg;
        ok('ui: titulo y ancho del dialogo', dlg && /Reportes masivos/.test(dlg.titulo) && dlg.ancho >= 700);
        const raiz = global.document.createElement('raiz');
        const box = global.document.createElement('rmas-box');
        raiz.children['rmas-box'] = box;
        dlg.onOpen(raiz);
        await new Promise((r) => setTimeout(r, 0));   // espera al catalogo
        let h = box.innerHTML;
        ok('ui: hero con icono y badge', /class="rgi-hero"/.test(h) && /rgi-heroico/.test(h) && /rgi-ori/.test(h));
        ok('ui: pasos numerados', /rgi-paso-c"><i>1<\/i>/.test(h) && /rgi-paso-c"><i>3<\/i>/.test(h));
        ok('ui: lista de plantillas con el estilo de Rondo',
            /class="rgi-tpls"/.test(h) && /class="rgi-tpl/.test(h) && /rgi-tpl-sel/.test(h));
        ok('ui: buscadores con icono y contador',
            /class="rgi-busca"/.test(h) && /id="rmas-tpl-n"/.test(h) && /id="rmas-uni-n"/.test(h));
        ok('ui: unidades en chips y rango de fechas',
            /class="rgi-chips rgi-unis"/.test(h) && /class="rgi-rango"/.test(h));
        ok('ui: aviso de descargas multiples', /class="rgi-aviso"/.test(h));
        ok('ui: boton generar pulsable', /class="rgi-btn gen pulsa" id="rmas-generar"/.test(h));
        ok('ui: no quedan clases fuera de estilo', !/rgi-btn pri/.test(h) && !/rgi-chip on/.test(h));
        ok('ui: formato PDF nativo por defecto',
            /class="rgi-chip activo" data-fmt="pdf"/.test(h) && /data-fmt="csv"/.test(h) &&
            /PDF nativo/.test(h));
        ok('ui: ancho PDF fijo por defecto con opciones compacto/sin ajuste',
            /class="rgi-chip activo" data-pdfancho="0"/.test(h) &&
            /data-pdfancho="1"/.test(h) && /data-pdfancho="2"/.test(h));
        const ancho2 = global.document.createElement('ancho2');
        ancho2.dataset = { pdfancho: '2' };
        for (const fn of (box.handlers.click || [])) fn({ target: { closest: () => ancho2 } });
        ok('ui: elegir ancho PDF sin ajuste lo marca',
            mod.RX_MAS.pdfAncho === 2 && /class="rgi-chip activo" data-pdfancho="2"/.test(box.innerHTML));
        const ancho0 = global.document.createElement('ancho0');
        ancho0.dataset = { pdfancho: '0' };
        for (const fn of (box.handlers.click || [])) fn({ target: { closest: () => ancho0 } });
        // Cambiar a CSV mueve el chip activo.
        const fmt = global.document.createElement('fmt');
        fmt.dataset = { fmt: 'csv' };
        for (const fn of (box.handlers.click || [])) fn({ target: { closest: () => fmt } });
        ok('ui: el formato CSV queda activo', /class="rgi-chip activo" data-fmt="csv"/.test(box.innerHTML));
        // Vuelve a PDF para el resto del montaje.
        const fmtPdf = global.document.createElement('fmtpdf');
        fmtPdf.dataset = { fmt: 'pdf' };
        for (const fn of (box.handlers.click || [])) fn({ target: { closest: () => fmtPdf } });
        h = box.innerHTML;
        // Elegir plantilla marca el elemento y actualiza el hero.
        const btn = global.document.createElement('btn');
        btn.dataset = { tpl: '7:3' };
        for (const fn of (box.handlers.click || [])) fn({ target: { closest: () => btn } });
        h = box.innerHTML;
        ok('ui: la plantilla elegida queda activa y en el hero',
            /class="rgi-tpl activo"/.test(h) && /Recorridos diarios/.test(h));
        // Marcar una unidad actualiza el chip y el contador del boton.
        const uni = global.document.createElement('uni');
        uni.dataset = { uni: '1' };
        for (const fn of (box.handlers.click || [])) fn({ target: { closest: () => uni } });
        h = box.innerHTML;
        ok('ui: la unidad marcada queda activa', /class="rgi-chip activo" data-uni="1"/.test(h));
        ok('ui: el boton indica cuantas unidades', /1 unidad\(es\)/.test(h));
    }

    console.log(fallos ? ('FALLO - ' + fallos + ' checks') : 'Todos los tests pasaron');
    process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error('FALLO - excepcion: ' + (e && e.stack || e)); process.exit(1); });
