/* ====================== INFORMES POR PLANTILLA (API) ======================
 * La via que si funciona: las plantillas de informe que el operador ya
 * tiene definidas en la plataforma (con sus filtros y sus columnas),
 * ejecutadas por report/exec_report y POR TROZOS.
 *
 * Por que funciona donde el informe nativo no: la plataforma calcula un
 * informe de 714 unidades y meses de datos en una sola peticion y salta
 * con "El tiempo de ejecucion ha superado el limite". Aqui la misma
 * plantilla se pide por semanas (o por unidad) y se pegan los resultados:
 * ninguna peticion crece, asi que ninguna revienta. Los trozos ya hechos
 * se guardan en este navegador, de modo que una ejecucion interrupted se
 * continua sin volver a empezar.
 *
 * El nucleo (troceado, ejecucion, resumen por unidad, filtro y salidas) es
 * puro y se prueba en tests/informes-plantilla.test.js.
 */
// Dias por trozo: el corte de una semana cabe de sobra en el limite de la
// plataforma y no multiplica las llamadas mas de lo necesario.
const RX_INF_DIAS_TROZO = 7;
// Tope de trozos (a ~2 anos). pasada de ahi, el aviso explica que se pidio
// mas de lo que la plataforma guarda.
const RX_INF_MAX_TROZOS = 110;
// Llamadas simultaneas. Son caras (el servidor calcula el informe entero),
// asi que van en paralelo pero con pool corto.
const RX_INF_CONC = 4;
// Tope de filas acumuladas: evita que un informe enorme reviente la
// memoria del navegador.
const RX_INF_MAX_FILAS = 60000;
// Techo (caracteres) de la cache de resultados en localStorage.
const RX_INF_CACHE_MAX = 3000000;
// Estado de la pantalla. Vive aqui, y no en el closure del dialogo, porque
// el dialogo se repinta entero y porque las salidas lo consultan.
const RX_INF = {
    tpl: null,           // {rid, id, nombre} plantilla elegida
    busca: '',           // filtro de texto de la lista de plantillas
    rango: '30d', desde: '', hasta: '',
    alcance: 'todas',    // 'todas' (reportObjectId 0) | 'sel' (por unidad)
    vista: 'filas',      // 'filas' (crudo) | 'unidad' (resumen agregado)
    q: '',               // filtro de texto sobre las filas
    // Resultado de la ultima ejecucion.
    cols: [], filas: [], meta: null,
    _buscando: false, _token: null
};
// ── Descubrimiento de plantillas ────────────────────────────────────────
// Las plantillas cuelgan del recurso (rep{n: {id, n}}). Es la misma via que
// usa la IA para sus reportes de dia.
async function rxInfPlantillas() {
    const out = [];
    try {
        const r = await remoteCall('core/search_items', {
            spec: { itemsType: 'avl_resource', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 8192, from: 0, to: 0
        });
        (r.items || []).forEach((res) => {
            const rep = res && res.rep;
            if (!rep || typeof rep !== 'object') return;
            Object.keys(rep).forEach((k) => {
                const t = rep[k];
                if (!t || t.id == null || (res.id == null)) return;
                out.push({ rid: res.id, id: t.id, nombre: t.n || ('Plantilla ' + t.id) });
            });
        });
    } catch (_) { /* sin permiso para listar plantillas */ }
    out.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    return out;
}
// Clave de plantilla para cache y selector.
function rxInfClave(tpl) { return (tpl && tpl.rid != null) ? (tpl.rid + ':' + tpl.id) : ''; }
function rxInfTplDeClave(v) {
    const p = String(v || '').split(':');
    return (p.length === 2) ? { rid: p[0], id: p[1], nombre: 'Plantilla ' + p[1] } : null;
}
// ── Lectura de la respuesta ─────────────────────────────────────────────
// exec_report devuelve reportResult con rows (arrays o objetos con {v,n})
// y columns. Se normaliza a filas planas y se guardan los nombres de
// columna que usan las plantillas.
function rxInfNormFilas(rr) {
    if (!rr || typeof rr !== 'object') return { cols: [], filas: [] };
    let filas = Array.isArray(rr.rows) ? rr.rows : (Array.isArray(rr.stats) ? rr.stats : []);
    if (!filas.length) return { cols: [], filas: [] };
    const planas = filas.map((f) => (Array.isArray(f)
        ? f.map((x) => (x && typeof x === 'object' ? (x.v != null ? x.v : x.n) : x))
        : (f && typeof f === 'object' ? Object.keys(f).map((k) => {
            const v = f[k];
            return (v && typeof v === 'object') ? (v.v != null ? v.v : v.n) : v;
        }) : [f])));
    const cols = (Array.isArray(rr.columns) && rr.columns.length)
        ? rr.columns.map((c, i) => String((c && (c.n || c.t)) || ('Columna ' + (i + 1))))
        : (planas[0] || []).map((x, i) => 'Columna ' + (i + 1));
    return { cols: cols, filas: planas };
}
// Que columnas sirven para algo: la de unidad, la de fecha y las numericas
// (las que se suman en el resumen por unidad). Se detectan por nombre,
// porque el nombre lo pone la plataforma y es lo unico estable.
function rxInfCols(cols) {
    const n = (cols || []).map((c) => norm(c).replace(/[^A-Z0-9]+/g, ' ').trim());
    const out = { iUni: -1, iFec: -1, num: [], txt: [] };
    n.forEach((c, i) => {
        if (out.iUni < 0 && /^(UNIDAD|ECO|VEHICULO|VEHICLE|OBJECT|OBJETO|NAME|NOMBRE|IMM|HOSTNAME|DRIVER|UNITS?)$/.test(c)) out.iUni = i;
        if (out.iFec < 0 && /(FECHA|DATE|TIME|HORA|TIEMPO)/.test(c)) out.iFec = i;
        const esNum = /\b(KM|KILOMETRO|KILOMETROS|MILEAGE|DISTANCIA|MIN|MINUTOS|MINUTOS| DURACION|TIEMPO|PRECIO|COST|IMPORTE|CANTIDAD|CANT|UNIDADES|UNITS|CANTIDAD|NUMERO|CONSUMO|GALONES|LITROS|HORAS)\b/.test(' ' + c + ' ');
        if (esNum) out.num.push(i); else out.txt.push(i);
    });
    return out;
}
// Resumen por unidad: una fila por unidad con el numero de filas y la suma
// de cada columna numerica. Es lo que hace util un informe de 40.000 filas.
function rxInfResumenUnidad(cols, filas, tipos) {
    const t = tipos || rxInfCols(cols);
    if (t.iUni < 0) return { cols: [], filas: [] };
    const por = new Map();
    const orden = [];
    for (const f of (filas || [])) {
        const eco = String(f[t.iUni] == null ? '' : f[t.iUni]).trim();
        const k = eco || '(sin unidad)';
        let g = por.get(k);
        if (!g) {
            g = { eco: k, n: 0, sumas: {} };
            por.set(k, g);
            orden.push(g);
        }
        g.n++;
        for (const i of t.num) {
            const v = rxInfNum(f[i]);
            if (v != null) g.sumas[i] = (g.sumas[i] || 0) + v;
        }
    }
    const outCols = ['Unidad', 'Filas'].concat(t.num.map((i) => String(cols[i] || ('Col ' + (i + 1)))));
    const outFilas = orden.map((g) => {
        const fila = [g.eco, g.n];
        for (const i of t.num) fila.push(rxInfFmt(g.sumas[i] == null ? 0 : g.sumas[i]));
        return fila;
    });
    outFilas.sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0]), 'es'));
    return { cols: outCols, filas: outFilas };
}
// Un valor de celda como numero (acepta "1.234,5", "12 km", "", "-").
function rxInfNum(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = String(v).replace(/[^\d,.\-]/g, '');
    if (!s || s === '-') return null;
    // "1.234,56" (es) -> coma decimal; "1234.56" (en) -> punto decimal.
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = (s.lastIndexOf(',') > s.lastIndexOf('.'))
        ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (s.indexOf(',') >= 0) s = s.replace(',', '.');
    const n = Number(s);
    return isFinite(n) ? n : null;
}
// Un numero para pintar en espanol: miles con punto, decimal con coma y
// como mucho 2 decimales (los datos de la plataforma vienen asi).
function rxInfFmt(n) {
    if (n == null || !isFinite(n)) return '';
    const r = Math.round(n * 100) / 100;
    const neg = (r < 0) ? '-' : '';
    const s = String(Math.abs(r));
    const p = s.indexOf('.');
    const ent = (p < 0) ? s : s.slice(0, p);
    const dec = (p < 0) ? '' : s.slice(p + 1);
    return neg + ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : '');
}
// Filtro de texto sobre las filas (busca en las primeras columnas, que es
// donde esta el eco, la fecha y las magnitudes que se buscan).
function rxInfFiltra(filas, q, maxCols) {
    const t = norm(q || '');
    if (!t) return filas || [];
    const lim = maxCols || 8;
    const out = [];
    for (const f of (filas || [])) {
        let hit = false;
        for (let i = 0; i < f.length && i < lim; i++) {
            if (norm(f[i]).indexOf(t) >= 0) { hit = true; break; }
        }
        if (hit) out.push(f);
    }
    return out;
}
// ── Cache de resultados por trozo ───────────────────────────────────────
// Un informe de un ano son 53 trozos por unidad. Guardarlos hace que la
// segunda ejecucion sea inmediata y que una interrumpida se continue.
let _rxInfCache = null;
function rxInfCacheCargar() {
    if (_rxInfCache) return _rxInfCache;
    _rxInfCache = {};
    try {
        const g = (typeof readJSON === 'function') ? readJSON(LS.infplant, null) : null;
        if (g && typeof g === 'object') _rxInfCache = g;
    } catch (_) { /* storage bloqueado: solo en memoria */ }
    return _rxInfCache;
}
function rxInfCachePoner(k, filas) {
    const c = rxInfCacheCargar();
    c[k] = filas;
    rxInfCacheGuardar();
}
function rxInfCacheGuardar(forzar) {
    // Volcado agrupado (uno cada 5 s como mucho): escribir en localStorage en
    // cada trozo seria tan lento como la propia consulta. Al terminar el
    // informe se fuerza, o los ultimos trozos no quedarian guardados y se
    // volverian a pedir al recargar.
    const t = Date.now();
    if (!forzar && (t - (rxInfCacheGuardar.t || 0)) < 5000) return;
    rxInfCacheGuardar.t = t;
    try {
        if (typeof writeJSON !== 'function' || !LS || !LS.infplant) return;
        const c = rxInfCacheCargar();
        const claves = Object.keys(c);
        const o = {};
        let n = 0;
        for (let i = claves.length - 1; i >= 0; i--) {
            const s = JSON.stringify(c[claves[i]]);
            if (n + s.length > RX_INF_CACHE_MAX) break;
            o[claves[i]] = c[claves[i]];
            n += s.length;
        }
        writeJSON(LS.infplant, o);
    } catch (_) { /* cuota llena: sigue solo en memoria */ }
}
function rxInfCacheLimpiar() {
    _rxInfCache = {};
    try { if (typeof writeJSON === 'function' && LS && LS.infplant) writeJSON(LS.infplant, {}); } catch (_) { /* noop */ }
}
// Clave de un trozo: plantilla + unidad (0 = todas) + intervalo + vista de
// columnas (no, las columnas las pone la plantilla, no hace falta).
function rxInfCacheKey(tpl, objId, desde, hasta) {
    return rxInfClave(tpl) + '|' + (objId || 0) + '|' + desde + '|' + hasta;
}
// ── Ejecucion por trozos ────────────────────────────────────────────────
// Una llamada a exec_report con reintentos. El limite de tiempo de la
// plataforma se traduce en un error: si persiste tras los reintentos, se
// anota como fallo de ESE trozo y se sigue con los demas (un trozo roto
// no puede tirar el informe entero).
async function rxInfEjecutar(tpl, objId, desde, hasta, token) {
    let err = '';
    for (let i = 0; i < 3; i++) {
        if (token && token.cancelado) return { filas: [], error: 'cancelado' };
        try {
            const r = await remoteCall('report/exec_report', {
                reportResourceId: tpl.rid, reportTemplateId: tpl.id,
                reportObjectId: objId || 0, reportObjectSecId: 0,
                interval: { from: desde, to: hasta, flags: 0 }
            });
            return { filas: (r && r.reportResult) ? r.reportResult : (r || {}) };
        } catch (e) {
            err = (e && e.message) || String(e);
            await new Promise((x) => { try { setTimeout(x, 600 * (i + 1)); } catch (_) { x(); } });
        }
    }
    return { filas: [], error: err };
}
// Ejecuta la plantilla por trozos y pega los resultados.
//   onProg(hechos, total, filas, obj)
// Devuelve {cols, filas, trozos, hechos, objetos, fallos, errores,
//           cancelado, ms, cacheados}.
async function rxInfCorre(tpl, desde, hasta, unidades, onProg, token) {
    const t0 = Date.now();
    rxInfCacheCargar();
    const trozos = rxGeoInfTrozos(desde, hasta, RX_INF_DIAS_TROZO * 86400).slice(0, RX_INF_MAX_TROZOS);
    // Con "solo las seleccionadas" la plantilla se pide unidad a unidad
    // (reportObjectId). Con toda la flota, una llamada por trozo que ya
    // cubre las 714 unidades.
    const trabajos = [];
    if (unidades && unidades.length) {
        for (const u of unidades) {
            for (const t of trozos) trabajos.push({ obj: u.id, desde: t[0], hasta: t[1], eco: u.eco });
        }
    } else {
        for (const t of trozos) trabajos.push({ obj: 0, desde: t[0], hasta: t[1], eco: '' });
    }
    const total = trabajos.length;
    const filas = [];
    const errores = [];
    let cols = [];
    let hechos = 0, fallos = 0, cacheados = 0, cheio = false, idx = 0;
    const obrero = async () => {
        while (true) {
            if (cheio || (token && token.cancelado)) return;
            const w = trabajos[idx++];
            if (!w) return;
            const k = rxInfCacheKey(tpl, w.obj, w.desde, w.hasta);
            const enCache = _rxInfCache[k];
            if (enCache) {
                cacheados++;
                if (enCache.c) cols = enCache.c;
                for (const f of enCache.f) filas.push(f);
            } else {
                const r = await rxInfEjecutar(tpl, w.obj, w.desde, w.hasta, token);
                if (r.error) {
                    fallos++;
                    if (errores.length < 5) errores.push((w.eco ? (w.eco + ': ') : '') + r.error);
                } else {
                    const n = rxInfNormFilas(r.filas);
                    if (n.cols.length && !cols.length) cols = n.cols;
                    for (const f of n.filas) filas.push(f);
                    if (filas.length < RX_INF_MAX_FILAS) rxInfCachePoner(k, { c: cols, f: n.filas });
                    else cheio = true;
                }
            }
            hechos++;
            if (filas.length > RX_INF_MAX_FILAS) cheio = true;
            if (onProg) onProg(hechos, total, filas.length, w.eco);
            await rxGeoInfYield ? rxGeoInfYield() : new Promise((x) => setTimeout(x, 0));
        }
    };
    const n = Math.max(1, Math.min(RX_INF_CONC, total || 1));
    const tareas = [];
    for (let i = 0; i < n; i++) tareas.push(obrero());
    await Promise.all(tareas);
    rxInfCacheGuardar(true);
    return {
        cols: cols, filas: filas, trozos: trozos.length, hechos: hechos,
        objetos: (unidades && unidades.length) ? unidades.length : 0,
        fallos: fallos, errores: errores, cacheados: cacheados, lleno: cheio,
        cancelado: !!(token && token.cancelado), ms: Date.now() - t0, parcial: trozos.length < Math.max(0,
            Math.ceil((Math.max(1, (hasta - desde)) / (RX_INF_DIAS_TROZO * 86400))))
    };
}
// ── Salidas (texto plano) ───────────────────────────────────────────────
// CSV: se respeta el separador de la plataforma (coma) y se escapan las
// celdas, igual que el resto de exportaciones de Rondo.
function rxInfCSVTexto(cols, filas, extra) {
    const L = [];
    if (extra && extra.length) L.push(extra.map((x) => rxCsvCelda(x)).join(','));
    L.push((cols || []).map((c) => rxCsvCelda(c)).join(','));
    for (const f of (filas || [])) L.push((f || []).map((c) => rxCsvCelda(c)).join(','));
    return L.join('\n');
}
function rxInfNombreArchivo(tpl, vista, ext) {
    const nm = String((tpl && tpl.nombre) || 'informe').replace(/[^\w\-]+/g, '_').slice(0, 40);
    return 'rondo_' + nm + '_' + (vista === 'unidad' ? 'por_unidad' : 'filas') +
        '_' + new Date().toISOString().slice(0, 10) + ext;
}
function rxInfDescarga(txt, nombre, mime) {
    const a = makeEl('a', { href: URL.createObjectURL(new Blob(['\uFEFF' + txt], { type: mime })) });
    a.download = nombre;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    try { URL.revokeObjectURL(a.href); } catch (_) { /* noop */ }
}
// Documento imprimible: cabecera, KPIs, tabla y nota de procedencia. Reusa
// el maquetado del informe general para que el PDF salga igual de bonito.
function rxInfHTML(t) {
    const cab = (t.cols || []).slice(0, 14);
    const filas = (t.filas || []).slice(0, 400).map((f) => {
        const out = [];
        for (let i = 0; i < cab.length; i++) {
            const v = f[i];
            out.push('<td>' + esc(v == null ? '-' : String(v)) + '</td>');
        }
        return '<tr>' + out.join('') + '</tr>';
    });
    const kpi = (n, s) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(s) + '</span></div>';
    const mas = ((t.filas || []).length > 400)
        ? '<div class="callout">Se listan las primeras 400 filas; el CSV lleva todas.</div>' : '';
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' +
        esc(t.titulo || 'Informe') + '</title><style>' + rxInfEstilo() + '</style></head><body>' +
        rxInfCabecera('Rondo', t.titulo || 'Informe de la plataforma',
            esc((t.subtitulo || '') + '<br>Documento de solo lectura')) +
        '<div class="kpis">' +
        kpi(t.meta.filas, 'Filas') + kpi(t.meta.unidades, 'Unidades') +
        kpi(t.meta.trozos, 'Trozos de 7 dias') + kpi(t.meta.objetos, 'Objetos') +
        kpi(Math.round(t.meta.ms / 1000) + ' s', 'Calculo') +
        (t.meta.fallos ? kpi(t.meta.fallos, 'Trozos con error') : '') +
        '</div>' +
        '<p class="resumen">' + esc(t.resumen || '') + '</p>' +
        '<h2 class="seccion">1. Tabla</h2>' + mas +
        rxInfTabla(cab, filas) +
        rxInfPie() + '</body></html>';
}
// ── Vista del dialogo ───────────────────────────────────────────────────
// Datos ya calculados: todo lo que se pinta sale de aqui, y las salidas
// usan EXACTAMENTE lo mismo (mismo subconjunto de filas).
function rxInfVista() {
    const tipos = rxInfCols(RX_INF.cols);
    let cols = RX_INF.cols || [];
    let filas = RX_INF.filas || [];
    if (RX_INF.vista === 'unidad') {
        const r = rxInfResumenUnidad(RX_INF.cols, filas, tipos);
        cols = r.cols;
        filas = r.filas;
    }
    const filtradas = rxInfFiltra(filas, RX_INF.q, 8);
    const unidades = {};
    const iUni = (RX_INF.vista === 'unidad') ? 0 : tipos.iUni;
    if (iUni >= 0) filtradas.forEach((f) => { unidades[String(f[iUni])] = 1; });
    return {
        cols: cols, filas: filtradas, total: filas.length, tipos: tipos,
        unidades: Object.keys(unidades).length, unidadCol: iUni,
        meta: RX_INF.meta || { filas: 0, unidades: 0, trozos: 0, objetos: 0, ms: 0, fallos: 0 }
    };
}
function rxInfResumenTexto(v) {
    const m = v.meta;
    const rango = (RX_INF.desde || '') + ' \u2192 ' + (RX_INF.hasta || '');
    return (RX_INF.tpl ? RX_INF.tpl.nombre : 'Sin plantilla') + ' \u00b7 ' + rango + ' \u00b7 ' +
        v.total + ' fila(s) de ' + v.filas.length + ' mostrada(s), ' + v.unidades + ' unidad(es) \u00b7 ' +
        m.trozos + ' trozos \u00b7 ' + Math.round(m.ms / 1000) + ' s' +
        (m.cacheados ? ' \u00b7 ' + m.cacheados + ' ya estaban en cache' : '') +
        (m.fallos ? ' \u00b7 ' + m.fallos + ' trozo(s) con error' : '');
}
// Tabla de la vista previa: las celdas se escapan y los numeros se alinean.
function rxInfTablaHTML(cols, filas, max) {
    const cab = (cols || []).slice(0, 14).map((c) => '<th>' + esc(c) + '</th>').join('');
    const cuerpo = (filas || []).slice(0, max || 60).map((f) => {
        let out = '';
        for (let i = 0; i < Math.min((cols || []).length, 14); i++) {
            const v = f[i];
            const txt = (v == null || v === '') ? '-' : String(v);
            const num = rxInfNum(v) != null && !isNaN(Number(String(txt).replace(/[^\d,.\-]/g, '')));
            out += '<td' + (num ? ' class="num"' : '') + '>' + esc(txt) + '</td>';
        }
        return '<tr>' + out + '</tr>';
    }).join('');
    return '<table><thead><tr>' + cab + '</tr></thead><tbody>' + cuerpo + '</tbody></table>';
}

/* ====================== INFORMES POR PLANTILLA: UI ====================== */
// Pantalla completa: lista de plantillas (con buscador), periodo, alcance,
// ejecucion por trozos con progreso y cancelacion, y los resultados con sus
// tres salidas. Todo lo que muestra el boton "Ejecutar" viene de la
// plataforma por report/exec_report; no se lee GPS crudo.
function abrirInformesPlantilla(origen) {
    // Desde el Replay se propone el periodo del recorrido cargado.
    if (origen === 'replay') {
        const r = (typeof RX_REPLAY !== 'undefined') ? RX_REPLAY : null;
        if (r && r.fecha) {
            RX_INF.desde = String(r.fecha);
            RX_INF.hasta = (r.fecha2 && r.fecha2 !== r.fecha) ? String(r.fecha2) : '';
            RX_INF.rango = '';
        }
    }
    const html = '<div class="rgi-tool">' +
        '<div class="rgi-carga" id="rgi-carga" style="display:none">' +
        '<span id="rgi-carga-t">Calculando\u2026</span>' +
        '<span class="rgi-barra"><i id="rgi-barra"></i></span>' +
        '</div>' +
        '<div id="rgi-box"></div>' +
        '</div>';
    abrirDialogo({
        icon: UIS.export,
        titulo: 'Informes de la plataforma',
        ancho: 860,
        okText: 'Cerrar',
        cancel: false,
        html: html,
        onOpen: (el) => {
            const box = el.querySelector('#rgi-box');
            if (!box) return;
            const carga = el.querySelector('#rgi-carga');
            const barra = el.querySelector('#rgi-barra');
            const cargaT = el.querySelector('#rgi-carga-t');
            const setProg = (p, t) => {
                if (barra) barra.style.width = Math.max(0, Math.min(100, p)) + '%';
                if (cargaT && t) cargaT.textContent = t;
                if (carga) carga.style.display = 'flex';
            };
            let plantillas = [];
            let pintaN = 0;
            function unidadesSel() {
                const sel = APP.seleccion;
                if (!sel || !sel.size) return [];
                const out = [];
                for (const u of (APP.unidades || [])) {
                    let info = null;
                    try { info = parseUnitName(u); } catch (_) { continue; }
                    if (!info || u.id == null) continue;
                    const clave = info.eco || info.placa || String(info.id);
                    if (sel.has(clave) || sel.has(info.eco) || sel.has(String(info.id))) out.push({ id: u.id, eco: info.eco || clave });
                }
                return out;
            }
            const listaTpl = () => {
                const q = norm(RX_INF.busca || '');
                return q ? plantillas.filter((t) => norm(t.nombre).indexOf(q) >= 0) : plantillas;
            };
            const cuerpo = () => {
                const v = rxInfVista();
                const tpl = RX_INF.tpl;
                const lista = listaTpl();
                const nUn = unidadesSel().length;
                const busy = !!RX_INF._buscando;
                const dis = busy ? ' disabled' : '';
                // Cabecera: que plantilla y de donde sale.
                const hero = '<div class="rgi-hero"><span class="rgi-heroico rondo-usym">' + UIS.export + '</span>' +
                    '<div class="rgi-herot"><b>' + esc(tpl ? tpl.nombre : 'Informes de la plataforma') + '</b>' +
                    '<span>' + esc(tpl
                        ? 'Ejecutada por report/exec_report, en trozos de ' + RX_INF_DIAS_TROZO + ' dias para no chocar con el limite de tiempo'
                        : 'Elige una plantilla de las que ya tienes en AE-Track') + '</span></div>' +
                    (tpl ? '<i class="rgi-ori">API</i>' : '') + '</div>';
                // Plantillas, con buscador.
                const filaTpl = '<div class="rgi-row"><span class="rgi-lb">Plantilla</span>' +
                    '<span class="rgi-busca"><span class="rondo-usym">' + UIS.filter + '</span>' +
                    '<input type="text" id="rgi-buscar" class="filtro" placeholder="Buscar plantilla\u2026" value="' + esc(RX_INF.busca || '') + '"' + dis + '>' +
                    '<i id="rgi-busca-n">' + lista.length + '/' + plantillas.length + '</i></span>' +
                    '<button type="button" class="mini" id="rgi-tpl-cargar"' + dis + '>' +
                    '<span class="rondo-usym">' + UIS.refresh + '</span> Leer plantillas</button></div>';
                const listaHtml = '<div class="rgi-tpls" id="rgi-lista">' + (plantillas.length
                    ? lista.map((t) => '<button type="button" class="rgi-tpl' +
                        (rxInfClave(t) === rxInfClave(tpl) ? ' activo' : '') + '" data-tpl="' + esc(rxInfClave(t)) + '"' + dis + '>' +
                        '<b>' + esc(t.nombre) + '</b><i>#' + esc(t.id) + '</i></button>').join('')
                    : '<p class="rgi-more">' + (plantillas.length === 0 && !RX_INF._cargadas
                        ? 'Pulsando "Leer plantillas" se listan las que hay definidas en la plataforma.'
                        : 'Sin plantillas con ese nombre.') + '</p>') + '</div>';
                // Periodo y alcance.
                const chip = (act, v, txt, titulo) => '<button type="button" class="rgi-chip' + (act ? ' activo' : '') +
                    '" data-i="rango" data-v="' + esc(v) + '"' + (titulo ? ' title="' + esc(titulo) + '"' : '') + dis + '>' + esc(txt) + '</button>';
                const filaPeriodo = '<div class="rgi-row"><span class="rgi-lb">Periodo</span><div class="rgi-chips">' +
                    chip(RX_INF.rango === 'hoy' && !RX_INF.desde, 'hoy', 'Hoy') +
                    chip(RX_INF.rango === '7d' && !RX_INF.desde, '7d', '7 dias') +
                    chip(RX_INF.rango === '30d' && !RX_INF.desde, '30d', '30 dias') +
                    chip(RX_INF.rango === 'mes' && !RX_INF.desde, 'mes', 'Mes actual') +
                    chip(RX_INF.rango === 'mes-1' && !RX_INF.desde, 'mes-1', 'Mes anterior') +
                    chip(RX_INF.rango === '90d' && !RX_INF.desde, '90d', '90 dias') +
                    chip(RX_INF.rango === 'ano' && !RX_INF.desde, 'ano', 'Este ano') +
                    chip(RX_INF.rango === 'todo' && !RX_INF.desde, 'todo', 'Todo') +
                    '</div></div>' +
                    '<div class="rgi-row"><span class="rgi-lb">Fechas</span><span class="rgi-rango">' +
                    '<input type="date" id="rgi-desde" class="filtro" title="Dia inicial (incluido)" value="' + esc(RX_INF.desde) + '"' + dis + '>' +
                    '<span class="sep">\u2192</span>' +
                    '<input type="date" id="rgi-hasta" class="filtro" title="Dia final (incluido)" value="' + esc(RX_INF.hasta) + '"' + dis + '>' +
                    (RX_INF.desde || RX_INF.hasta ? '<button type="button" class="mini" data-i="rango" data-v="hoy"' + dis + '>Quitar</button>' : '') +
                    '</span></div>' +
                    '<div class="rgi-row"><span class="rgi-lb">Alcance</span><div class="rgi-chips">' +
                    '<button type="button" class="rgi-chip' + (RX_INF.alcance !== 'sel' ? ' activo' : '') + '" data-i="alcance" data-v="todas"' + dis + '>' +
                    'Toda la flota</button>' +
                    '<button type="button" class="rgi-chip' + (RX_INF.alcance === 'sel' ? ' activo' : '') + '" data-i="alcance" data-v="sel"' + dis +
                    (nUn ? ' title="Solo las ' + nUn + ' seleccionadas"' : ' title="Ninguna unidad seleccionada"') + '>' +
                    'Solo seleccionadas (' + nUn + ')</button>' +
                    '</div></div>';
                // Ejecucion:估算 y boton (o cancelar).
                const rangoS = rxInfRangoS();
                const nTrozos = Math.min(RX_INF_MAX_TROZOS,
                    rxGeoInfTrozos(rangoS.desde, rangoS.hasta, RX_INF_DIAS_TROZO * 86400).length);
                const avisos = [];
                if (RX_INF.alcance === 'sel' && !nUn) avisos.push('No hay unidades seleccionadas: usa "Toda la flota" o selecciona unidades en la lista.');
                if (RX_INF.rango === 'todo' && rangoS.desde > 0 && ((Date.now() / 1000 - rangoS.desde) > 400 * 86400)) {
                    avisos.push('"Todo" puede abarcar mas de lo que la plataforma guarda; por eso se trocea y se avisa al terminar.');
                }
                if (RX_INF.meta && RX_INF.meta.fallos) avisos.push(RX_INF.meta.fallos + ' trozo(s) fallaron: ' + ((RX_INF.meta.errores || [])[0] || 'error desconocido'));
                if (RX_INF.meta && RX_INF.meta.lleno) avisos.push('Se alcanzo el tope de ' + Math.round(RX_INF_MAX_FILAS / 1000) + 'k filas: acorta el periodo.');
                const ejecutar = busy
                    ? '<button type="button" class="rgi-btn gen busy" id="rgi-cancel">' +
                      '<span class="rondo-usym">' + UIS.close + '</span><b>Cancelar</b><i>conserva lo ya calculado</i></button>'
                    : '<button type="button" class="rgi-btn gen' + (tpl ? ' pulsa' : '') + '" id="rgi-ejecutar"' + (tpl ? '' : ' disabled') + '>' +
                      '<span class="rondo-usym">' + UIS.play + '</span><b>' + (RX_INF.meta ? 'Volver a ejecutar' : 'Ejecutar informe') + '</b>' +
                      '<i>' + nTrozos + ' trozos de ' + RX_INF_DIAS_TROZO + ' dias</i></button>';
                const barraEjec = '<div class="rgi-generar">' + ejecutar +
                    '<span class="rgi-gen-hint">' + esc(tpl
                        ? (busy ? 'Calculando... puedes cancelar cuando quieras.' : 'La plataforma calcula cada trozo; el resultado se guarda en este navegador.')
                        : 'Selecciona una plantilla para empezar.') + '</span></div>';
                // Resultados.
                const hay = (RX_INF.cols || []).length > 0;
                const barraVista = '<div class="rgi-row"><span class="rgi-lb">Ver</span><div class="rgi-chips">' +
                    '<button type="button" class="rgi-chip' + (RX_INF.vista !== 'unidad' ? ' activo' : '') + '" data-i="vista" data-v="filas"' + dis + '>Filas</button>' +
                    '<button type="button" class="rgi-chip' + (RX_INF.vista === 'unidad' ? ' activo' : '') + '" data-i="vista" data-v="unidad"' + dis + '>Resumen por unidad</button>' +
                    '<span class="rgi-busca" style="margin-left:auto"><span class="rondo-usym">' + UIS.filter + '</span>' +
                    '<input type="text" id="rgi-q" class="filtro" placeholder="Filtrar filas\u2026" value="' + esc(RX_INF.q || '') + '"' + dis + '></span>' +
                    '</div></div>';
                const kpis = hay ? '<div class="rgi-kpis">' +
                    '<div class="rgi-kpi ok"><b>' + v.total + '</b><span>Filas</span></div>' +
                    '<div class="rgi-kpi"><b>' + v.unidades + '</b><span>Unidades</span></div>' +
                    '<div class="rgi-kpi"><b>' + v.meta.trozos + '</b><span>Trozos</span></div>' +
                    '<div class="rgi-kpi"><b>' + Math.round(v.meta.ms / 1000) + ' s</b><span>Calculo</span></div>' +
                    (v.meta.cacheados ? '<div class="rgi-kpi"><b>' + v.meta.cacheados + '</b><span>En cache</span></div>' : '') +
                    (v.meta.fallos ? '<div class="rgi-kpi"><b>' + v.meta.fallos + '</b><span>Con error</span></div>' : '') +
                    '</div>' : '';
                const tabla = hay
                    ? '<div class="rgi-prev">' + rxInfTablaHTML(v.cols, v.filas, 60) +
                      (v.total > 60 ? '<p class="rgi-more">Primeras 60 filas de ' + v.total + '. El CSV lleva todas.</p>' : '') + '</div>'
                    : '<p class="rgi-more">Sin resultados todavia.</p>';
                const resumen = hay ? '<p class="rgi-res">' + esc(rxInfResumenTexto(v)) + '</p>' : '';
                const salidas = hay ? '<div class="rgi-io">' +
                    '<button type="button" class="rgi-btn primary" id="rgi-pdf"' + dis + ' title="Reporte imprimible">' +
                    '<span class="rondo-usym">' + UIS.export + '</span><b>PDF</b><i>reporte listo para imprimir</i></button>' +
                    '<button type="button" class="rgi-btn" id="rgi-csv"' + dis + ' title="' + (RX_INF.vista === 'unidad' ? 'Resumen por unidad' : 'Filas tal cual') + '">' +
                    '<span class="rondo-usym">' + UIS.csv + '</span><b>CSV</b><i>' + (RX_INF.vista === 'unidad' ? 'por unidad' : 'evento a evento') + '</i></button>' +
                    '<button type="button" class="rgi-btn" id="rgi-md"' + dis + ' title="Texto para pegar">' +
                    '<span class="rondo-usym">' + UIS.copy + '</span><b>Markdown</b><i>texto para pegar</i></button>' +
                    '</div>' +
                    '<div class="rgi-row"><span class="rgi-lb"></span>' +
                    '<button type="button" class="mini" id="rgi-cache-limpiar"' + dis + '>' +
                    '<span class="rondo-usym">' + UIS.clear + '</span> Vaciar resultados guardados</button></div>' : '';
                return '<div class="rgi">' + hero +
                    '<div class="rgi-cfg">' + filaTpl + listaHtml + filaPeriodo + '</div>' +
                    (avisos.length ? '<div class="rgi-aviso">' + avisos.map(esc).join(' ') + '</div>' : '') +
                    barraEjec +
                    (hay ? '<div class="rgi-cfg">' + barraVista + '</div>' : '') +
                    '<div id="rgi-dyn">' + kpis + resumen + tabla + '</div>' +
                    salidas +
                    '</div>';
            };
            const pinta = () => { const mio = ++pintaN; if (mio === pintaN) setHtml(box, cuerpo()); };
            // Lee las fechas escritas antes de repintar o ejecutar: el `change`
            // puede no haber saltado todavia y el repintado las perderia.
            const leeFechas = () => {
                const dEl = byId('rgi-desde'), hEl = byId('rgi-hasta');
                if (dEl) RX_INF.desde = dEl.value || '';
                if (hEl) RX_INF.hasta = hEl.value || '';
                if (RX_INF.desde && RX_INF.hasta && RX_INF.desde > RX_INF.hasta) {
                    const t = RX_INF.desde; RX_INF.desde = RX_INF.hasta; RX_INF.hasta = t;
                }
            };
            // Rango elegido en segundos (el que espera exec_report).
            const rxInfRangoS = () => {
                const ahora = Math.floor(Date.now() / 1000);
                let d = RX_INF.desde ? Math.floor(rxGeoInfFechaMs(RX_INF.desde, false) / 1000) : 0;
                const h = RX_INF.hasta ? Math.floor(rxGeoInfFechaMs(RX_INF.hasta, true) / 1000) : ahora;
                const r = RX_INF.rango;
                if (!d) {
                    if (r === 'hoy') { const x = new Date(); x.setHours(0, 0, 0, 0); d = Math.floor(x.getTime() / 1000); }
                    else if (r === '7d') d = ahora - 7 * 86400;
                    else if (r === '30d') d = ahora - 30 * 86400;
                    else if (r === '90d') d = ahora - 90 * 86400;
                    else if (r === 'ano') { const x = new Date(); x.setMonth(0, 1); x.setHours(0, 0, 0, 0); d = Math.floor(x.getTime() / 1000); }
                    else if (r === 'mes') { const x = new Date(); x.setDate(1); x.setHours(0, 0, 0, 0); d = Math.floor(x.getTime() / 1000); }
                    else if (r === 'mes-1') { const x = new Date(); x.setDate(1); x.setHours(0, 0, 0, 0); x.setMonth(x.getMonth() - 1); d = Math.floor(x.getTime() / 1000); }
                    else if (r === 'todo') d = 0;
                    else d = ahora - 7 * 86400;
                }
                return { desde: d, hasta: (h > ahora) ? ahora : h };
            };
            const cargarTpl = async () => {
                RX_INF._buscando = true;
                setProg(8, 'Leyendo plantillas\u2026');
                pinta();
                try { plantillas = await rxInfPlantillas(); } catch (_) { plantillas = []; }
                RX_INF._cargadas = true;
                if (!RX_INF.tpl && plantillas.length) RX_INF.tpl = plantillas[0];
                RX_INF._buscando = false;
                if (carga) carga.style.display = 'none';
                pinta();
            };
            const ejecutar = async () => {
                leeFechas();
                if (!RX_INF.tpl) { adviceWarn('Sin plantilla', 'Elige una plantilla del informe.'); return; }
                if (RX_INF._buscando) return;
                const r = rxInfRangoS();
                if (!(r.hasta > r.desde)) { adviceWarn('Rango invalido', 'El fin debe ser posterior al inicio.'); return; }
                const sel = (RX_INF.alcance === 'sel') ? unidadesSel() : null;
                if (RX_INF.alcance === 'sel' && (!sel || !sel.length)) { adviceWarn('Sin unidades', 'Selecciona unidades en la lista o elige "Toda la flota".'); return; }
                RX_INF._buscando = true;
                RX_INF._token = { cancelado: false };
                pinta();
                let res;
                try {
                    res = await rxInfCorre(RX_INF.tpl, r.desde, r.hasta, sel, (h, t, filas, eco) => {
                        setProg(8 + Math.round((h / Math.max(1, t)) * 84),
                            'Trozo ' + h + '/' + t + (eco ? ' \u00b7 ' + eco : '') +
                            (filas ? ' \u00b7 ' + filas + ' fila(s)' : ''));
                        // En vivo: el conteo de filas sin rehacer la pantalla
                        // entera (que tiene la lista de plantillas).
                        const dyn = byId('rgi-dyn');
                        if (dyn) {
                            const p = dyn.querySelector('.rgi-kpi b');
                            if (p) p.textContent = String(filas);
                        }
                    }, RX_INF._token);
                } catch (e) {
                    res = { cols: RX_INF.cols, filas: RX_INF.filas, trozos: 0, hechos: 0, objetos: 0, fallos: 1, errores: [(e && e.message) || e], cacheados: 0, ms: 0, cancelado: false };
                }
                RX_INF._buscando = false;
                RX_INF.cols = res.cols || [];
                RX_INF.filas = res.filas || [];
                RX_INF.meta = { filas: RX_INF.filas.length, unidades: 0, trozos: res.trozos, objetos: res.objetos, ms: res.ms, fallos: res.fallos, errores: res.errores, cacheados: res.cacheados, lleno: res.lleno };
                if (carga) carga.style.display = 'none';
                pinta();
                if (res.cancelado) advice('Informe cancelado', RX_INF.filas.length + ' fila(s) hasta donde llego (quedan guardadas).');
                else adviceOk('Informe generado', RX_INF.filas.length + ' fila(s) de ' + (RX_INF.tpl ? RX_INF.tpl.nombre : '') +
                    (res.fallos ? ' \u00b7 ' + res.fallos + ' trozo(s) con error' : '') + ' \u00b7 ' + Math.round(res.ms / 1000) + ' s');
            };
            box.addEventListener('click', async (ev) => {
                const btn = ev.target.closest && ev.target.closest('button');
                if (btn && box.contains(btn)) {
                    if (btn.id === 'rgi-ejecutar') { ejecutar(); return; }
                    if (btn.id === 'rgi-cancel') { if (RX_INF._token) RX_INF._token.cancelado = true; if (cargaT) cargaT.textContent = 'Cancelando\u2026'; return; }
                    if (btn.id === 'rgi-tpl-cargar') { await cargarTpl(); return; }
                    if (btn.id === 'rgi-cache-limpiar') {
                        rxInfCacheLimpiar();
                        RX_INF.cols = []; RX_INF.filas = []; RX_INF.meta = null;
                        adviceOk('Resultados guardados vaciados', 'La proxima ejecucion los vuelve a calcular.');
                        pinta();
                        return;
                    }
                    if (btn.id === 'rgi-pdf' || btn.id === 'rgi-csv' || btn.id === 'rgi-md') {
                        leeFechas();
                        const v = rxInfVista();
                        if (!v.cols.length) { adviceWarn('Sin resultados', 'Ejecuta primero el informe.'); return; }
                        const titulo = 'Informe: ' + ((RX_INF.tpl && RX_INF.tpl.nombre) || 'plantilla');
                        const sub = (RX_INF.desde || '') + ' \u2192 ' + (RX_INF.hasta || 'hoy') +
                            ' \u00b7 ' + (RX_INF.vista === 'unidad' ? 'resumen por unidad' : 'filas') +
                            (RX_INF.alcance === 'sel' ? ' \u00b7 solo seleccionadas' : ' \u00b7 toda la flota');
                        if (btn.id === 'rgi-pdf') {
                            rxImprimirHTML(rxInfHTML({
                                titulo: titulo, subtitulo: sub, cols: v.cols, filas: v.filas,
                                meta: Object.assign({}, v.meta, { unidades: v.unidades }),
                                resumen: rxInfResumenTexto(v)
                            }));
                            advice('Reporte listo', 'Elige "Guardar como PDF" en el dialogo de impresion.');
                            return;
                        }
                        if (btn.id === 'rgi-csv') {
                            rxInfDescarga(rxInfCSVTexto(v.cols, v.filas, [
                                'Informe', (RX_INF.tpl && RX_INF.tpl.nombre) || '',
                                'Desde', RX_INF.desde || '', 'Hasta', RX_INF.hasta || '',
                                'Vista', RX_INF.vista, 'Generado', rxFechaHora(Date.now(), true)
                            ]), rxInfNombreArchivo(RX_INF.tpl, RX_INF.vista, '.csv'), 'text/csv;charset=utf-8;');
                            adviceOk('Informe exportado', v.filas.length + ' fila(s) en CSV');
                            return;
                        }
                        const L = ['# ' + titulo, '', '- ' + sub, '- ' + rxInfResumenTexto(v), '',
                            '| ' + v.cols.slice(0, 14).join(' | ') + ' |',
                            '| ' + v.cols.slice(0, 14).map(() => '---').join(' | ') + ' |'];
                        for (const f of v.filas.slice(0, 500)) {
                            L.push('| ' + v.cols.slice(0, 14).map((c, i) => String(f[i] == null ? '-' : f[i]).replace(/\|/g, '/')).join(' | ') + ' |');
                        }
                        const txt = L.join('\n');
                        if (typeof rxReplayDescargar === 'function') rxReplayDescargar(rxInfNombreArchivo(RX_INF.tpl, RX_INF.vista, '.md'), txt, 'text/markdown;charset=utf-8;');
                        else { rxInfDescarga(txt, rxInfNombreArchivo(RX_INF.tpl, RX_INF.vista, '.md'), 'text/markdown;charset=utf-8;'); }
                        adviceOk('Informe exportado', v.filas.length + ' fila(s)');
                        return;
                    }
                }
                // Plantillas de la lista.
                const tb = ev.target.closest && ev.target.closest('[data-tpl]');
                if (tb && box.contains(tb)) {
                    if (RX_INF._buscando) return;
                    RX_INF.tpl = rxInfTplDeClave(tb.dataset.tpl) || RX_INF.tpl;
                    // Cambiar de plantilla invalida lo calculado.
                    RX_INF.cols = []; RX_INF.filas = []; RX_INF.meta = null;
                    pinta();
                    return;
                }
                const b = ev.target.closest && ev.target.closest('[data-i]');
                if (!b || !box.contains(b)) return;
                if (RX_INF._buscando) return;
                if (b.dataset.i === 'rango') { RX_INF.rango = b.dataset.v; RX_INF.desde = ''; RX_INF.hasta = ''; }
                else RX_INF[b.dataset.i] = b.dataset.v;
                pinta();
            });
            box.addEventListener('input', (ev) => {
                const t = ev.target;
                if (!t) return;
                if (t.id === 'rgi-buscar') {
                    RX_INF.busca = t.value || '';
                    // Solo la lista de plantillas: no se repinta el input para
                    // que no pierda el foco al escribir.
                    const cont = byId('rgi-lista');
                    if (cont) {
                        const lista = listaTpl();
                        cont.innerHTML = lista.map((x) => '<button type="button" class="rgi-tpl' +
                            (rxInfClave(x) === rxInfClave(RX_INF.tpl) ? ' activo' : '') + '" data-tpl="' + esc(rxInfClave(x)) + '">' +
                            '<b>' + esc(x.nombre) + '</b><i>#' + esc(x.id) + '</i></button>').join('');
                    }
                    const n = byId('rgi-busca-n');
                    if (n) n.textContent = listaTpl().length + '/' + plantillas.length;
                    return;
                }
                if (t.id === 'rgi-q') {
                    RX_INF.q = t.value || '';
                    const dyn = byId('rgi-dyn');
                    if (dyn) {
                        const v = rxInfVista();
                        dyn.innerHTML = '<div class="rgi-kpis">' +
                            '<div class="rgi-kpi ok"><b>' + v.total + '</b><span>Filas</span></div>' +
                            '<div class="rgi-kpi"><b>' + v.unidades + '</b><span>Unidades</span></div>' +
                            '</div><p class="rgi-res">' + esc(rxInfResumenTexto(v)) + '</p>' +
                            '<div class="rgi-prev">' + rxInfTablaHTML(v.cols, v.filas, 60) + '</div>';
                    }
                }
            });
            box.addEventListener('change', (ev) => {
                const t = ev.target;
                if (!t || !t.id || RX_INF._buscando) return;
                if (t.id === 'rgi-buscar' || t.id === 'rgi-q') return;
                if (t.id === 'rgi-desde' || t.id === 'rgi-hasta') { leeFechas(); pinta(); }
            });
            pinta();
            if (!plantillas.length && !RX_INF._cargadas) cargarTpl();
        },
        onOk: () => { /* las salidas viven en la barra de acciones */ }
    });
}
