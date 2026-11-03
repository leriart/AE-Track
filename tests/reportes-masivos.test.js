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
    'const APP = { unidades: [] };'
].join('\n');

const code = stubs + '\n' + src.slice(ini, fin) +
    '\nreturn { RX_MAS, RX_MAS_ESPERA_DESCARGA, rxMasUnidades, rxMasNombreArchivo, rxMasCSV, rxMasCorre, setUnidades:function(l){ APP.unidades = l; } };';
const mod = new Function(code)();

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

    console.log(fallos ? ('FALLO - ' + fallos + ' checks') : 'Todos los tests pasaron');
    process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error('FALLO - excepcion: ' + (e && e.stack || e)); process.exit(1); });
