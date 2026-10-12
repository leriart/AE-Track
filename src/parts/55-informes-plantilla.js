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
// Llamadas simultaneas. La plataforma calcula UN informe a la vez por
// sesion y rechaza el segundo (code 1004), asi que aqui van de una en una:
// la espera se paga en segundos, no en errores.
const RX_INF_CONC = 1;
// Tope de filas acumuladas: evita que un informe enorme reviente la
// memoria del navegador.
const RX_INF_MAX_FILAS = 60000;
// Tope de objetos a ejecutar cuando no se ha marcado ninguno. Una plantilla
// de geocercas se ejecuta UNA VEZ POR ZONA: sin tope, 176 zonas x 5 trozos
// son 880 llamadas. Se acota y se avisa.
const RX_INF_MAX_OBJETOS = 25;
// Techo (caracteres) de la cache de resultados en localStorage.
const RX_INF_CACHE_MAX = 3000000;
// Estado de la pantalla. Vive aqui, y no en el closure del dialogo, porque
// el dialogo se repinta entero y porque las salidas lo consultan.
const RX_INF = {
    tpl: null,           // {rid, id, nombre} plantilla elegida
    busca: '',           // filtro de texto de la lista de plantillas
    rango: '30d', desde: '', hasta: '',
    alcance: 'todas',    // 'todas' (todos los objetos) | 'sel' (por unidad)
    secId: '',           // objeto secundario a mano (reportObjectSecId)
    vista: 'filas',      // 'filas' (crudo) | 'unidad' (resumen agregado)
    q: '',               // filtro de texto sobre las filas
    zonas: [],           // geocercas marcadas (plantillas de geocerca)
    eco: '',             // filtro por unidad
    orden: null,         // {col, dir} de la tabla de resultados
    // Resultado de la ultima ejecucion.
    cols: [], filas: [], meta: null,
    // Progreso en pantalla (dentro del cuerpo, no solo en la barra de
    // arriba: si el dialogo esta desplazado, la de arriba no se ve).
    prog: { activo: false, hechas: 0, total: 0, filas: 0, txt: '' },
    // Lo que la plantilla trae: columnas y de que trata (unidades o
    // geocercas). Se deduce ejecutandola una vez por una ventana corta.
    sonda: null, _sondaKey: '',
    // Ultimo intento (para el boton de diagnostico): que se mando y que
    // devolvio la plataforma. Sin esto no hay forma de saber por que un
    // template en concreto se niega a ejecutarse.
    diag: null,
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
async function rxInfLimpiarInforme() {
    // La plataforma guarda el ultimo informe ejecutado en la sesion y la
    // pantalla lo va paginando con report/select_result_rows. Si se ejecuta
    // otro sin liberar el anterior, el servidor responde "code 4" (error
    // interno): por eso se limpia SIEMPRE antes de ejecutar.
    try { await remoteCall('report/cleanup_result', {}); return true; } catch (_) { return false; }
}
// Llamada directa con el periodo ELEGIDO por el operador. Es el camino de
// antes (mismo intervalo para todos), que ahora se intenta DESPUES del
// nativo: limpia la sesion primero, que era justo lo que devolvia code 4.
async function rxInfEjecutaDirecto(tpl, objId, desde, hasta, token) {
    let err = '';
    for (let i = 0; i < 2; i++) {
        if (token && token.cancelado) return { filas: [], error: 'cancelado' };
        try {
            await rxInfLimpiarInforme();
            const r = await remoteCall('report/exec_report', {
                reportResourceId: tpl.rid, reportTemplateId: tpl.id,
                reportObjectId: tpl.rid, reportObjectSecId: String(objId),
                interval: { from: desde, to: hasta, flags: 0 }
            });
            const n = rxInfExtrae(r);
            if (n.filas.length || n.cols.length) return { filas: n.filas, cols: n.cols };
            try {
                const g = await remoteCall('report/get_result', {});
                const n2 = rxInfExtrae(g);
                if (n2.filas.length || n2.cols.length) return { filas: n2.filas, cols: n2.cols };
            } catch (_) { /* sin resultado aparte */ }
            return { filas: [], cols: [] };
        } catch (e) {
            err = (e && e.message) || String(e);
            await rxInfEspera(600 * (i + 1));
        }
    }
    return { filas: [], error: err };
}
// Primero el protocolo nativo de la pantalla (el que se sabe que funciona);
// si no trae nada, el directo con el periodo elegido. `modo` deja constancia
// de cual sirvio, para poder avisar de que periodo se esta usando.
async function rxInfEjecutar(tpl, objId, desde, hasta, token) {
    let r = null, err = '';
    try {
        r = await rxInfEjecutaRemoto(tpl, objId, token, 2000, desde, hasta);
        if (r.error) err = r.error;
        if (!r.error && (r.filas.length || (r.cols && r.cols.length))) return { filas: r.filas, cols: r.cols, modo: 'plantilla' };
        if (r.error === 'cancelado') return { filas: [], error: 'cancelado' };
    } catch (e) { err = (e && e.message) || String(e); }
    const d = await rxInfEjecutaDirecto(tpl, objId, desde, hasta, token);
    if (d.error) return { filas: [], error: d.error || err };
    const ok = (d.filas.length || (d.cols && d.cols.length));
    return { filas: d.filas, cols: d.cols, modo: ok ? 'elegido' : 'nada' };
}

function rxInfEspera(ms) {
    return new Promise((r) => { try { setTimeout(r, ms); } catch (_) { r(); } });
}
function rxInfLimpiarInforme() {
    // El informe ejecutado queda guardado en la sesion; sin liberarlo, la
    // siguiente ejecucion responde "code 4".
    try { return remoteCall('report/cleanup_result', {}).then(() => true).catch(() => false); } catch (_) { return false; }
}
// Recorre lo que devuelve un servicio buscando la lista de filas y sus
// columnas: cada uno las anida de forma distinta (reportResult, rows, table,
// report...). Asi el nucleo no depende de la forma exacta.
function rxInfExtrae(r) {
    // El resultado de un informe viene por capas (reportResult, reportLayer)
    // y no siempre con las filas al primer nivel. Se recorren TODAS las
    // ramas, se recogen las candidatas a tabla y se elige la que mas filas
    // trae, que es la de datos.
    const cols = [];
    const mejor = { filas: [], cols: [], n: 0 };
    const vistos = new Set();
    const mirar = (x, prof) => {
        if (prof > 6 || x == null) return;
        if (typeof x === 'string') {
            // Algunas capas llegan como JSON serializado.
            const t = x.trim();
            if ((t[0] === '{' || t[0] === '[') && t.length > 2) {
                try { mirar(JSON.parse(t), prof + 1); } catch (_) { /* noop */ }
            }
            return;
        }
        if (typeof x !== 'object' || vistos.has(x)) return;
        vistos.add(x);
        if (Array.isArray(x)) {
            const filasArr = x.filter((f) => Array.isArray(f) && f.length);
            if (filasArr.length > mejor.n) { mejor.n = filasArr.length; mejor.filas = filasArr; }
            const objs = x.filter((f) => f && typeof f === 'object' && !Array.isArray(f));
            // OJO: un array de objetos con claves de definicion (n, name, l,
            // sl, t, f, v) es la lista de COLUMNAS, no filas. Si se cuela,
            // acaba pintando los nombres de campo como si fueran datos.
            const esMeta = objs.length && objs.every((f) => {
                const ks = Object.keys(f);
                return ks.length <= 2 && ks.every((k) => /^(n|name|l|sl|t|f|v|id)$/.test(k));
            });
            // Las filas de verdad tienen valores sueltos: un array de objetos
            // cuyos valores son a su vez arrays u objetos es un envoltorio
            // (bands -> rows), no una tabla.
            const escalares = objs.length && objs.every((f) => Object.keys(f).every((k) => {
                const v = f[k];
                return v == null || (typeof v !== 'object');
            }));
            if (objs.length > mejor.n && !esMeta && escalares) {
                const keys = [];
                objs.forEach((f) => Object.keys(f).forEach((k) => { if (keys.indexOf(k) < 0) keys.push(k); }));
                if (keys.length) {
                    mejor.n = objs.length;
                    mejor.filas = objs.map((f) => keys.map((k) => f[k]));
                    mejor.cols = keys;
                }
            }
            x.slice(0, 60).forEach((y) => mirar(y, prof + 1));
            return;
        }
        const c = x.columns || x.cols;
        if (Array.isArray(c) && c.length && !cols.length) {
            c.forEach((v) => cols.push(String((v && (v.n || v.name || v.sl || v.t)) || v)));
        }
        Object.keys(x).forEach((k) => mirar(x[k], prof + 1));
    };
    mirar(r, 0);
    return { cols: (mejor.cols.length ? mejor.cols : cols), filas: mejor.filas };
}

// Que objetos secondary admite la plantilla y que datos declara. Es la via
// barata para saber que trae sin ejecutar nada.
async function rxInfDatosPlantilla(tpl) {
    try { return await remoteCall('report/get_report_data', { itemId: tpl.rid, col: [String(tpl.id)], flags: 0 }); }
    catch (_) { return null; }
}
function rxInfSecundarios(datos) {
    const out = [];
    const vistos = {};
    const meter = (id, eco) => {
        if (id == null || id === '' || (typeof id === 'object')) return;
        const k = String(id);
        if (vistos[k]) return;
        vistos[k] = 1;
        out.push({ id: k, eco: eco || k });
    };
    const recorrer = (x, prof) => {
        if (!x || typeof x !== 'object' || prof > 3) return;
        if (Array.isArray(x)) { x.slice(0, 400).forEach((y) => recorrer(y, prof + 1)); return; }
        const id = (x.id != null) ? x.id : ((x.sec != null) ? x.sec : ((x.sid != null) ? x.sid : null));
        if (id != null) {
            const nm = x.n || x.nm || x.name || (x.u && (x.u.nm || x.u.n)) || '';
            meter(id, String(nm || id));
        }
        Object.keys(x).forEach((k) => { if (k !== 'id') recorrer(x[k], prof + 1); });
    };
    recorrer(datos, 0);
    return out;
}
// ── Que declara la plantilla (report/get_report_data) ───────────────────
// La respuesta es una lista de plantillas con su estructura de tablas:
//   ct        tipo de objeto al que esta atada (avl_geozone, avl_unit...)
//   tbl[].cl  etiquetas de las columnas (lo que vera el operador)
//   tbl[].c   claves internas de esas columnas
//   tbl[].p   parametros con los que la plantilla esta guardada (sus
//             FILTROS: {"units":"27418488"})
//   filter_order  filtros que admite la tabla
// Con esto la pantalla puede decir que datos ocupa la plantilla y sobre que
// objetos se puede ejecutar, en vez de deducirlo a ojo.
function rxInfPlantillaInfo(datos, tplId) {
    const lista = Array.isArray(datos) ? datos : (datos && Array.isArray(datos.items) ? datos.items : []);
    const t = lista.filter((x) => x && String(x.id) === String(tplId))[0] || lista[0];
    if (!t) return null;
    const tablas = (t.tbl || []).map((tb) => {
        let claves = [], etiquetas = [], params = null;
        try { claves = JSON.parse(tb.c || '[]'); } catch (_) { claves = []; }
        try { etiquetas = JSON.parse(tb.cl || '[]'); } catch (_) { etiquetas = []; }
        try { params = JSON.parse(tb.p || 'null'); } catch (_) { params = null; }
        return {
            n: tb.n || '', l: tb.l || '',
            claves: Array.isArray(claves) ? claves : [],
            etiquetas: Array.isArray(etiquetas) ? etiquetas : [],
            params: (params && typeof params === 'object') ? params : null,
            filtros: Array.isArray(tb.filter_order) ? tb.filter_order : []
        };
    });
    const ct = String(t.ct || '');
    return {
        nombre: t.n || '', tipoObj: ct,
        esGeo: /geozone|geofence/i.test(ct), esUnidad: /unit/i.test(ct),
        tablas: tablas,
        // Columnas que el operador vera: union de las de todas las tablas,
        // en el orden en que aparecen (las de la tabla principal primero).
        columnas: (function () {
            const out = [];
            for (const tb of tablas) {
                for (let i = 0; i < tb.etiquetas.length; i++) {
                    const c = tb.etiquetas[i] || tb.claves[i];
                    if (c && out.indexOf(c) < 0) out.push(c);
                }
            }
            return out;
        })(),
        // Filtros con los que la plantilla viene guardada (lo que hay que
        // cambiar en la plataforma para que traiga otros datos).
        params: (function () {
            const out = [];
            for (const tb of tablas) {
                if (!tb.params) continue;
                for (const k of Object.keys(tb.params)) out.push({ tabla: tb.l || tb.n, k: k, v: tb.params[k] });
            }
            return out;
        })(),
        actualizado: (t.bsfl && t.bsfl.mt) ? t.bsfl.mt : 0
    };
}
// Objetos sobre los que se puede ejecutar la plantilla. Si esta atada a
// geocercas se usan las geocercas de la plataforma (sus ids son los que
// espera el reportObjectSecId); si es de unidades, la flota.
function rxInfObjetos(tpl, info) {
    const esGeo = info ? info.esGeo : (rxInfPista(tpl) === 'geocercas');
    if (esGeo) {
        const out = [];
        for (const z of (APP.zonas || [])) {
            if (!z || z.id == null) continue;
            const nm = rxGeoInfNombre(z);
            if (nm) out.push({ id: String(z.id), eco: nm, esZona: true });
        }
        return out;
    }
    return rxInfUnidades(0);
}

// Ejecuta la plantilla como lo hace la plataforma y devuelve sus filas.
async function rxInfEjecutaRemoto(tpl, secId, token, limiteFilas, desde, hasta) {
    // LLAMADA SINCRONA. Comprobado contra la plataforma: exec_report sin
    // remoteExec responde code 0 y trae el resultado en la propia respuesta.
    // La via asincrona (remoteExec + get_report_status + apply_report_result
    // + select_result_rows) NO funciona en esta instalacion: el estado se
    // queda en "2" para siempre, apply devuelve code 4 y leer filas, code 5.
    // Ademas la sincrona admite el intervalo elegido, asi que el periodo lo
    // manda el operador y no lo que tenga guardado la plantilla.
    await rxInfLimpiarInforme();
    const ahora = Math.floor(Date.now() / 1000);
    const iv = (desde && hasta)
        ? { from: desde, to: hasta, flags: 0 }
        : { from: ahora - 30 * 24 * 3600, to: ahora, flags: 0 };
    const enviado = {
        reportResourceId: tpl.rid, reportTemplateId: tpl.id, reportTemplate: null,
        reportObjectId: tpl.rid, reportObjectSecId: String(secId), interval: iv
    };
    let r = null;
    let err = '';
    for (let i = 0; i < 3; i++) {
        if (token && token.cancelado) return { filas: [], error: 'cancelado' };
        try {
            r = await remoteCall('report/exec_report', enviado);
            err = '';
            break;
        } catch (e) {
            err = (e && e.message) || String(e);
            // El servidor calcula un informe a la vez: si esta ocupado se
            // espera y se reintenta en lugar de perder el trozo.
            if (!/1003|1004/.test(err) || i === 2) break;
            await rxInfEspera(1200 * (i + 1));
        }
    }
    RX_INF.diag = { svc: 'report/exec_report', enviado: enviado, error: err || '', ok: !err, cuando: Date.now() };
    if (err) return { filas: [], error: err };
    const n = rxInfExtrae(r);
    return { filas: n.filas, cols: n.cols };
}


function rxInfUnidades(rangoDesde) {
    const out = [];
    for (const u of (APP.unidades || [])) {
        if (!u || u.id == null) continue;
        let info = null;
        try { info = parseUnitName(u); } catch (_) { info = null; }
        let t = 0;
        try { t = (typeof unitState === 'function' ? (unitState(u).t || 0) : 0); } catch (_) { t = 0; }
        if (t > 0 && rangoDesde > 0 && t < rangoDesde) continue;
        out.push({ id: String(u.id), eco: (info && (info.eco || info.clave)) || String(u.id) });
    }
    // Mas recientes primero: si hay que parar por tiempo, ya se han visto las
    // unidades que mas filas pueden traer.
    out.sort((a, b) => (b.t || 0) - (a.t || 0));
    return out;
}

// Ejecuta la plantilla POR UNIDAD y por trozos de periodo, y pega los
// resultados. Unidad x trozo, en paralelo y cacheado: ninguna peticion crece
// (de ahi que ninguna reviente con el limite de tiempo) y repetir el informe
// no vuelve a preguntar lo mismo.
//   onProg(hechos, total, filas, eco)
async function rxInfCorre(tpl, desde, hasta, unidades, onProg, token) {
    const t0 = Date.now();
    rxInfCacheCargar();
    const trozos = rxGeoInfTrozos(desde, hasta, RX_INF_DIAS_TROZO * 86400).slice(0, RX_INF_MAX_TROZOS);
    let objs = unidades;
    let modo = '';
    let recortado = false;
    if (!objs) {
        // Los objetos secundarios son los que la plataforma pide de verdad
        // (reportObjectSecId). En una plantilla de geocercas son las
        // geocercas: se ejecuta una vez por zona, asi que se respeta lo que
        // el operador haya marcado en el filtro y, si no marco nada, se
        // acota con un tope (antes lanzaba 883 trozos sin avisar).
        const datos = await rxInfDatosPlantilla(tpl);
        const info = rxInfPlantillaInfo(datos, tpl.id);
        let secs = rxInfObjetos(tpl, info);
        const marcadas = (RX_INF.zonas || []);
        if (secs.length && marcadas.length) {
            const set = {};
            marcadas.forEach((z) => { set[norm(z)] = 1; });
            const filtradas = secs.filter((o) => set[norm(o.eco)]);
            if (filtradas.length) secs = filtradas;
        }
        if (secs.length > RX_INF_MAX_OBJETOS) { secs = secs.slice(0, RX_INF_MAX_OBJETOS); recortado = true; }
        if (secs.length) { objs = secs; modo = (info && info.esGeo) ? 'geocercas' : 'secundarios'; }
        else {
            const todas = rxInfUnidades(desde);
            objs = todas.length ? todas : [{ id: 0, eco: '' }];
            modo = 'flota';
        }
    } else modo = 'seleccion';
    const trabajos = [];
    for (const u of objs) {
        for (const t of trozos) trabajos.push({ obj: u.id, desde: t[0], hasta: t[1], eco: u.eco });
    }
    const total = trabajos.length;
    const filas = [];
    const errores = [];
    let cols = [];
    let hechos = 0, fallos = 0, cacheados = 0, cheio = false, idx = 0;
    let parity = false;   // la plataforma rechaza en bloque
    const modos = {};
    // Si la plataforma rechaza el mismo error varios trozos seguidos, no se
    // sigue arrastrando el mismo fallo 30 veces: se para y se explica.
    let seguidos = 0, ultimoErr = '';
    const MAX_SEGUIDOS = 3;
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
                    if (errores.length < 5) errores.push((w.eco ? (w.eco + ': ') : '') + rxInfExplicaError(r.error));
                    if (r.error === ultimoErr) seguidos++; else { seguidos = 1; ultimoErr = r.error; }
                    if (seguidos >= MAX_SEGUIDOS) { parity = true; return; }
                } else {
                    seguidos = 0;
                    if (r.modo && r.modo !== 'nada') modos[r.modo] = (modos[r.modo] || 0) + 1;
                    const n = (r.cols && r.cols.length) ? { cols: r.cols, filas: r.filas } : rxInfNormFilas(r.filas);
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
        objetos: objs.length, asked: total, alcance: modo, modos: modos, recortado: recortado,
        fallos: fallos, errores: errores, cacheados: cacheados, lleno: cheio,
        bloqueado: parity,
        cancelado: !!(token && token.cancelado), ms: Date.now() - t0
    };
}
// Los codigos de error de la plataforma son crípticos ("code 7"). Este
// TRADUCTOR es lo que evita tener que adivinar por que no sale nada.
function rxInfExplicaError(msg) {
    const m = String(msg || '');
    const code = (m.match(/code (\d+)/i) || [])[1];
    if (!code) return m;
    const c = String(code);
    const T = {
        '2': 'el servicio no existe en esta version de la plataforma (code 2)',
        '4': 'la peticion es demasiado pesada para el servidor (code 4): acorta el periodo',
        '5': 'la plataforma niega el acceso (code 5): la sesion no puede ejecutar ese informe o leer sus tablas',
        '7': 'parametros invalidos (code 7): normalmente que reportObjectId no sea un objeto real, o que la plantilla pida un filtro que no se le esta mandando',
        '8': 'objeto o recurso no encontrado (code 8): la plantilla puede haberse borrado',
        '10': 'sin acceso a los datos (code 10)',
        '1001': 'el objeto (o la unidad) no existe para esta plantilla (code 1001)',
        '1002': 'la plantilla no admite ese objeto secundario (code 1002)',
        '1003': 'ya hay un informe en marcha en esta sesion (code 1003): espera a que termine',
        '1004': 'la plataforma rechaza la ejecucion (code 1004): normalmente el objeto secundario no es valido para esta plantilla, o ya hay un informe calculado',
        '1005': 'la ejecucion supera el limite de tiempo de la plataforma (code 1005)'
    };
    return (T[c] || ('error de la plataforma (code ' + c + ')')) + ' — ' + m;
}
// ── De que trata la plantilla ───────────────────────────────────────────
// Deducido de lo que la plantilla DEVUELVE (sus columnas y sus valores),
// que es lo unico fiable: dos plantillas pueden llamarse igual y traer
// cosas distintas. Con eso la interfaz se adapta: si es de geocercas
// ofrece filtrar por geocerca; si es de vehiculos, por unidad.
function rxInfNombreCol(c) {
    return norm(c).replace(/[^A-Z0-9]+/g, ' ').trim();
}
function rxInfClasifica(cols, filas) {
    const n = (cols || []).map(rxInfNombreCol);
    const zona = [], uni = [], fecha = [], otro = [];
    n.forEach((c, i) => {
        if (/(GEOCERCA|GEOFENCE|^ZONA|^ZONE|^ZONAS|UBICACION|ADDRESS|DIRECCION|SITIO|PREDIO)/.test(c)) zona.push(i);
        else if (/(^UNIDAD|^UNIDADES|^ECO$|VEHICULO|VEHICLE|^IMM|PLACA|MATRICULA|CONDUCTOR|DRIVER|PILOTO|OPERADOR)/.test(c)) uni.push(i);
        else if (/(FECHA|DATE|^HORA|^TIME|TIEMPO|FECHAHORA)/.test(c)) fecha.push(i);
        else otro.push(i);
    });
    // Si el nombre no lo dice, se mira el contenido: una columna de texto
    // cuyos valores coinciden con nombres de geocercas es de geocercas.
    if (!zona.length) {
        const nombres = {};
        for (const z of (APP.zonas || [])) { const nm = rxGeoInfNombre(z); if (nm) nombres[norm(nm)] = 1; }
        if (Object.keys(nombres).length) {
            for (let i = 0; i < (filas || []).length && i < 30; i++) {
                for (let j = 0; j < (filas[i] || []).length; j++) {
                    const v = norm((filas[i] || [])[j]);
                    if (v && nombres[v] && !zona.length) zona.push(j);
                }
            }
        }
    }
    const tieneZ = zona.length > 0, tieneU = uni.length > 0;
    const tipo = (tieneZ && tieneU) ? 'mixto' : (tieneZ ? 'geocercas' : (tieneU ? 'vehiculos' : 'otro'));
    const ETIQUETA = { mixto: 'Veh\u00edculos y geocercas', geocercas: 'Geocercas', vehiculos: 'Veh\u00edculos', otro: 'Datos generales' };
    // Campos con su tipo, para teachar que datos trae la plantilla.
    const campos = [];
    for (let i = 0; i < n.length; i++) {
        const esNum = (filas || []).slice(0, 20).some((f) => rxInfNum((f || [])[i]) != null);
        let t = 'texto';
        if (fecha.indexOf(i) >= 0) t = 'fecha';
        else if (esNum) t = 'numero';
        campos.push({ i: i, n: cols[i], t: t });
    }
    return {
        tipo: tipo, etiqueta: ETIQUETA[tipo],
        iZona: zona[0] == null ? -1 : zona[0], iUni: uni[0] == null ? -1 : uni[0],
        campos: campos
    };
}
// Pista por el NOMBRE de la plantilla: sirve para ensenar la pantalla
// antes de terminar el sondeo (o si el sondeo no devuelve nada), que es
// justo el caso de las plantillas que necesitan otro filtro.
function rxInfPista(tpl) {
    const n = norm((tpl && tpl.nombre) || '');
    if (!n) return '';
    if (/(GEOCERCA|GEOFENCE|^ZONA|ZONAS|PREDIO|MUELLE|ANDEN|NAVE|PATIO|CEDIS|BODEGA|TALLER|PORTA)/.test(n)) return 'geocercas';
    if (/(COMBUSTIBLE|CONSUMO|LITROS|GALONES|KILOMETR|RECORRIDO|VELOCIDAD|EXCESO|MENSAJE|USUARIO|ENTRADA|SALIDA|PRODUCTIVIDAD)/.test(n)) return 'vehiculos';
    return '';
}
// Estado del sondeo: 'pendiente' | 'ok' | 'vacio' | 'error'. La pantalla lo
// muestra siempre, para que quede claro si se sabe o no que trae la
// plantilla (antes solo aparecia cuando habia columnas, que se tradujo en
// "no se muestra nada").
function rxInfSondaVacia(estado, msg) {
    RX_INF.sonda = { estado: estado || 'pendiente', msg: msg || '', cols: [], muestra: [], filas: 0, horas: 0, clase: null, zonas: [], unidades: [] };
    RX_INF._sondaKey = '';
    return RX_INF.sonda;
}
// Ejecuta la plantilla una vez por una ventana corta para saber que trae y
// de que trata, sin tener que correr todo el periodo. Si en 24 h no hay
// nada, ensancha a 7 y luego a 30 dias. Se cachea por plantilla.
async function rxInfSondea(tpl) {
    if (!tpl) return null;
    const key = 'sondeo|' + rxInfClave(tpl);
    if (RX_INF.sonda && RX_INF._sondaKey === key) return RX_INF.sonda;
    const c = rxInfCacheCargar();
    if (c[key]) { RX_INF.sonda = c[key]; RX_INF._sondaKey = key; return c[key]; }
    const hasta = Math.floor(Date.now() / 1000);
    // Primero lo barato: que objetos y que datos declara la plantilla.
    // despues una ejecucion real, que es lo que de verdad dice si trae filas.
    const datos = await rxInfDatosPlantilla(tpl);
    const RI = rxInfPlantillaInfo(datos, tpl.id);
    const secs = rxInfObjetos(tpl, RI);
    const declarado = rxInfDeclarado(datos);
    let info = null;
    let err = '';
    const objetos = secs.length ? secs.slice(0, 3).map((x) => x.id)
        : [rxInfUnidades(hasta - 30 * 24 * 3600).map((u) => u.id)[0] || 0];
    for (const obj of objetos) {
        // Ventanas de mas reciente a mas ancha: el sondeo saca datos casi
        // siempre y no depende del periodo que tenga guardado la plantilla.
        for (const dias of [7, 30, 90]) {
            const r = await rxInfEjecutaRemoto(tpl, obj, null, 300, hasta - dias * 86400, hasta);
            if (r.error) { err = r.error; break; }
            const n = (r.cols && r.cols.length && r.filas.length)
                ? { cols: r.cols, filas: r.filas } : rxInfNormFilas(r.filas);
            if (n.filas.length) {
                info = { cols: n.cols, muestra: n.filas.slice(0, 12), filas: n.filas.length, horas: dias * 24, fallo: '', estado: 'ok' };
                break;
            }
            if (r.cols && r.cols.length) {
                // Hay columnas aunque no haya filas en esa ventana: se sigue
                // probando una ventana mas ancha.
                info = { cols: r.cols, muestra: [], filas: 0, horas: dias * 24, fallo: '', estado: 'ok' };
            }
        }
        if (info && info.filas) break;
    }
    if (!info) {
        const pista = rxInfPista(tpl);
        // Aunque no se pueda ejecutar, lo que la plantilla DECLARA ya lo
        // sabemos (tipo, columnas, filtros): se guarda igual, para que el
        // panel lo ensene y no haga falta el objeto a mano.
        const v = rxInfSondaVacia('vacio',
            err ? rxInfExplicaError(err)
                : (pista === 'geocercas'
                    ? 'sin filas en el sondeo. Si la plantilla pide una geocerca concreta, elijela abajo y ejecuta el periodo completo.'
                    : 'sin filas en el sondeo. Puede que la plantilla pida filtros que no se pueden enviar por API.'));
        if (RI) {
            v.declaracion = RI;
            v.clase = rxInfClasifica(RI.columnas.slice(), []);
            v.zonas = [];
            v.unidades = [];
            v.objetos = secs.length;
            v.declarado = declarado;
            RX_INF.sonda = v;
            RX_INF._sondaKey = key;
        }
        return v;
    }
    // Si la plantilla declara sus columnas y no hemos sacado ninguna del
    // resultado, se usan las suyas: asi la pantalla nunca dice "sin datos"
    // cuando en realidad la plantilla SÍ tiene columnas.
    if (!info.cols.length && RI && RI.columnas.length) info.cols = RI.columnas.slice();
    info.clase = rxInfClasifica(info.cols, info.muestra);
    info.declaracion = RI || null;
    // Zonas y unidades que aparecen en la muestra: son los filtros que
    // tienen sentido para esa plantilla.
    info.zonas = [];
    info.unidades = [];
    info.objetos = secs.length;
    info.declarado = declarado;
    if (info.clase.iZona >= 0) {
        const set = {};
        info.muestra.forEach((f) => { const v = String(f[info.clase.iZona] == null ? '' : f[info.clase.iZona]).trim(); if (v) set[v] = 1; });
        info.zonas = Object.keys(set).sort();
    }
    if (info.clase.iUni >= 0) {
        const set = {};
        info.muestra.forEach((f) => { const v = String(f[info.clase.iUni] == null ? '' : f[info.clase.iUni]).trim(); if (v) set[v] = 1; });
        info.unidades = Object.keys(set).sort();
    }
    RX_INF.sonda = info;
    RX_INF._sondaKey = key;
    rxInfCachePoner(key, info);
    return info;
}
// Geocercas ofrecidas para filtrar: primero las que aparecen en el informe,
// despues las de la plataforma (Rondo incluidas). Con 1766 geocercas se
// filtran por texto, asi que nunca se pintan todas de golpe.
function rxInfZonasDeSonda() {
    const info = RX_INF.sonda || {};
    const out = [];
    const vistas = {};
    const marcar = (nm, app) => {
        if (!nm || vistas[nm]) return;
        vistas[nm] = 1;
        out.push({ n: nm, app: !!app, enInforme: (info.zonas || []).some((x) => norm(x) === norm(nm)) });
    };
    for (const z of (info.zonas || [])) marcar(z, false);
    const q = norm(RX_INF.zonaBusca || '');
    for (const z of (APP.zonas || [])) {
        const nm = rxGeoInfNombre(z);
        if (!nm) continue;
        if (q && norm(nm).indexOf(q) < 0) continue;
        let org = null;
        try { org = (typeof glocOrigen === 'function') ? glocOrigen(z) : null; } catch (_) { org = null; }
        marcar(nm, !!(org && org.id === 'app'));
        if (out.length >= 60) break;
    }
    return out;
}
// Lo que la plantilla DECLARA (report/get_report_data): que objetos admite y
// como se llaman. Se enseña en pantalla, para que se vea que se puede pedir y
// sobre que.
function rxInfDeclarado(datos) {
    const objs = rxInfSecundarios(datos);
    const claves = [];
    try {
        if (datos && typeof datos === 'object') {
            Object.keys(datos).forEach((k) => { if (!/^\d+$/.test(k)) claves.push(k); });
        }
    } catch (_) { /* noop */ }
    return { objetos: objs, claves: claves };
}

// Aplica a la vista que la plantilla es de geocercas (por el sondeo o, si no
// hay sondeo, por el nombre de la plantilla).
function rxInfEsDeGeocercas() {
    const c = (RX_INF.sonda && RX_INF.sonda.clase) ? RX_INF.sonda.clase : null;
    if (c && c.iZona >= 0) return true;
    // Aunque la plantilla NO traiga columna de geocerca (puede devolver solo
    // cruces por unidad), si es una plantilla de geocercas se sigue
    // preguntando por ellas: el filtro busca el nombre dentro de la fila.
    if (rxInfPista(RX_INF.tpl) === 'geocercas') return true;
    if (RX_INF.sonda && (RX_INF.sonda.zonas || []).length) return true;
    return false;
}
// Geocerca de una fila: la columna que dijo el sondeo o, si no la hay,
// cualquier celda cuyo texto coincide con una geocerca (asi el filtro
// funciona aunque la plantilla no nombre la columna "Geocerca").
function rxInfZonaDeFila(f, iZona) {
    if (iZona >= 0) {
        const v = f[iZona];
        return (v == null) ? '' : String(v).trim();
    }
    if (!f) return '';
    for (let i = 0; i < f.length; i++) {
        const v = f[i];
        if (v == null) continue;
        const t = norm(v);
        if (!t || t.length < 3) continue;
        for (const z of (APP.zonas || [])) {
            const nm = rxGeoInfNombre(z);
            if (nm && norm(nm) === t) return String(nm);
        }
    }
    return '';
}
// Columnas que la plantilla trae pero sin datos: normalmente es que le
// falta un filtro, y avisa de que el informe sale incompleto.
function rxInfColumnasVacias(cols, filas) {
    const out = [];
    for (let i = 0; i < (cols || []).length && i < 14; i++) {
        const conDatos = (filas || []).some((f) => f[i] != null && String(f[i]).trim() !== '' && String(f[i]).trim() !== '-');
        if (!conDatos) out.push(cols[i]);
    }
    return out;
}
// ── Mini-mapa del informe ───────────────────────────────────────────────
// Solo aparece si los datos se pueden situar: coordenadas en la propia
// plantilla (columnas de lat/lon) o una columna de geocerca que coincida con
// alguna de las de la plataforma (entonces se dibuja su contorno). Si el
// informe no trae ni una cosa ni la otra, el mapa desaparece en vez de
// dejar un hueco vacio.
function rxInfCoords(cols) {
    const n = (cols || []).map(rxInfNombreCol);
    let iLat = -1, iLon = -1;
    n.forEach((c, i) => {
        if (iLat < 0 && /^(LAT|LATITUD|LATITUDE|LATIT)$/.test(c)) iLat = i;
        else if (iLon < 0 && /^(LON|LONG|LONGITUD|LONGITUDE|LNG|LNGITUD)$/.test(c)) iLon = i;
    });
    return { iLat: iLat, iLon: iLon };
}
// Geocerca de la plataforma a la que pertenece un nombre de la columna.
function rxInfZonaDeNombre(nombre) {
    const n = norm(nombre || '');
    if (!n) return null;
    for (const z of (APP.zonas || [])) {
        const nm = rxGeoInfNombre(z);
        if (nm && norm(nm) === n) return z;
    }
    return null;
}
// Datos para pintar: anillos de las geocercas que salen y puntos de las
// filas con coordenadas. Null si no hay nada que dibujar.
function rxInfMapaDatos(v) {
    const c = rxInfCoords(v.cols);
    const lineas = [];
    const marcas = [];
    if (v.iZona >= 0) {
        const vistas = {};
        for (const f of (v.filas || [])) {
            const nm = String(f[v.iZona] == null ? '' : f[v.iZona]).trim();
            if (!nm || vistas[nm]) continue;
            const z = rxInfZonaDeNombre(nm);
            if (!z) continue;
            vistas[nm] = 1;
            const an = rxGeoInfAnillo(z);
            if (an.length > 2) lineas.push({ pts: an, color: '#1565c0', width: 3, opacity: 0.9, glow: true });
            if (lineas.length >= 8) break;
        }
    }
    if (c.iLat >= 0 && c.iLon >= 0) {
        for (const f of (v.filas || [])) {
            if (marcas.length >= 400) break;
            const la = Number(f[c.iLat]), lo = Number(f[c.iLon]);
            if (!isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) continue;
            marcas.push({
                lat: la, lon: lo, color: (v.iUni >= 0 && f[v.iUni]) ? '#e65100' : '#1565c0',
                radio: 4, txt: (v.iUni >= 0 ? String(f[v.iUni]) : '')
            });
        }
    }
    if (!lineas.length && !marcas.length) return null;
    return { lineas: lineas, marcas: marcas };
}
// El mapa del dialogo: se crea, se actualiza o se destruye segun haya datos.
let _rxInfMapa = null;
function rxInfPintaMapa(v) {
    const cont = byId('rgi-mapa');
    if (!cont) return;
    const d = rxInfMapaDatos(v);
    if (!d) {
        if (_rxInfMapa) { try { _rxInfMapa.destruir(); } catch (_) { /* noop */ } _rxInfMapa = null; }
        cont.style.display = 'none';
        cont.innerHTML = '';
        return;
    }
    cont.style.display = 'block';
    const leyenda = '<div class="rgi-mapa-ley">' +
        (d.lineas.length ? '<span><i style="background:#1565c0"></i>Geocerca</span>' : '') +
        (d.marcas.length ? '<span><i style="background:#e65100"></i>Unidad</span>' : '') +
        '<span class="muted">Mapa: OpenStreetMap</span></div>';
    if (d.lineas.length && d.marcas.length) {
        try {
            if (!_rxInfMapa) _rxInfMapa = rxMiniMapa(cont, d);
            else { _rxInfMapa.lineas = d.lineas; _rxInfMapa.marcas = d.marcas; }
            _rxInfMapa.encuadrar();
        } catch (e) {
            if (APP.unlocked) console.warn('[Rondo] mapa informes', e && e.message);
        }
    } else {
        if (_rxInfMapa) { try { _rxInfMapa.destruir(); } catch (_) { /* noop */ } _rxInfMapa = null; }
        cont.innerHTML = rxMiniMapaHTML(d, 680, 190) + leyenda;
    }
}
// Texto del mapa para el PDF (vacio si no hay nada que dibujar).
function rxInfMapaHTML(v, W, H) {
    const d = rxInfMapaDatos(v);
    if (!d) return '';
    return rxMiniMapaHTML(d, W || 660, H || 240);
}
// Ordena por una columna de la vista// ── Mini-mapa del informe ───────────────────────────────────────────────
// Solo aparece si los datos se pueden situar: coordenadas en la propia
// plantilla (columnas de lat/lon) o una columna de geocerca que coincida con
// alguna de las de la plataforma (entonces se dibuja su contorno). Si el
// informe no trae ni una cosa ni la otra, el mapa desaparece en vez de
// dejar un hueco vacio.// Geocerca de la plataforma a la que pertenece un nombre de la columna.
function rxInfZonaDeNombre(nombre) {
    const n = norm(nombre || '');
    if (!n) return null;
    for (const z of (APP.zonas || [])) {
        const nm = rxGeoInfNombre(z);
        if (nm && norm(nm) === n) return z;
    }
    return null;
}
// Datos para pintar: anillos de las geocercas que salen y puntos de las
// filas con coordenadas. Null si no hay nada que dibujar.
function rxInfMapaDatos(v) {
    const c = rxInfCoords(v.cols);
    const lineas = [];
    const marcas = [];
    if (v.iZona >= 0) {
        const vistas = {};
        for (const f of (v.filas || [])) {
            const nm = String(f[v.iZona] == null ? '' : f[v.iZona]).trim();
            if (!nm || vistas[nm]) continue;
            const z = rxInfZonaDeNombre(nm);
            if (!z) continue;
            vistas[nm] = 1;
            const an = rxGeoInfAnillo(z);
            if (an.length > 2) lineas.push({ pts: an, color: '#1565c0', width: 3, opacity: 0.9, glow: true });
            if (lineas.length >= 8) break;
        }
    }
    if (c.iLat >= 0 && c.iLon >= 0) {
        for (const f of (v.filas || [])) {
            if (marcas.length >= 400) break;
            const la = Number(f[c.iLat]), lo = Number(f[c.iLon]);
            if (!isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) continue;
            marcas.push({
                lat: la, lon: lo, color: (v.iUni >= 0 && f[v.iUni]) ? '#e65100' : '#1565c0',
                radio: 4, txt: (v.iUni >= 0 ? String(f[v.iUni]) : '')
            });
        }
    }
    if (!lineas.length && !marcas.length) return null;
    return { lineas: lineas, marcas: marcas };
}
// El mapa del dialogo: se crea, se actualiza o se destruye segun haya datos.
// Ordena por una columna de la vista (numericas por valor, el resto por
// texto). Se usa en la tabla y en las salidas, para que coincidan.
function rxInfOrdena(filas, orden, cols) {
    if (!orden || orden.col == null || orden.col < 0) return filas;
    const c = orden.col, dir = (orden.dir < 0) ? -1 : 1;
    return (filas || []).slice().sort((a, b) => {
        const va = a[c], vb = b[c];
        const na = rxInfNum(va), nb = rxInfNum(vb);
        if (na != null && nb != null) return (na - nb) * dir;
        const ta = norm(va), tb = norm(vb);
        if (ta === tb) return 0;
        return (ta < tb ? -1 : 1) * dir;
    });
}
// Un informe a la vez: el sondeo, la prueba y la ejecucion comparten hueco.
function rxInfIsBusy() { return !!(RX_INF._buscando || RX_INF._probando); }
function setRXInfBusy(v) { RX_INF._buscando = !!v; }

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
        (t.mapa ? '<h2 class="seccion">1. Mapa</h2>' + t.mapa : '') +
        '<h2 class="seccion">' + (t.mapa ? '2' : '1') + '. Tabla</h2>' + mas +
        rxInfTabla(cab, filas) +
        rxInfPie() + '</body></html>';
}
// ── Vista del dialogo ───────────────────────────────────────────────────
// Datos ya calculados: todo lo que se pinta sale de aqui, y las salidas
// usan EXACTAMENTE lo mismo (mismo subconjunto de filas).
function rxInfVista() {
    const tipos = rxInfCols(RX_INF.cols);
    const clase = (RX_INF.sonda && RX_INF.sonda.clase) ? RX_INF.sonda.clase : null;
    let cols = RX_INF.cols || [];
    let filas = RX_INF.filas || [];
    // Columna de geocerca: la que dijo el sondeo, o la que se deduce ahora.
    const iZona = (clase && clase.iZona >= 0) ? clase.iZona : (function () {
        for (let i = 0; i < cols.length; i++) if (/GEOCERCA|^ZONA|ZONE/.test(rxInfNombreCol(cols[i]))) return i;
        return -1;
    })();
    const iUni = (clase && clase.iUni >= 0) ? clase.iUni : tipos.iUni;
    // Filtro por geocerca. Con columna de geocerca es directo; si no la hay,
    // se busca el nombre de la geocerca dentro de la fila (una plantilla de
    // geocercas suele devolver el dato junto al nombre, no en columna propia).
    let pre = filas;
    const setZ = {};
    if (RX_INF.zonas && RX_INF.zonas.length) {
        RX_INF.zonas.forEach((z) => { setZ[norm(z)] = 1; });
        pre = pre.filter((f) => setZ[norm(rxInfZonaDeFila(f, iZona))]);
    }
    const zonasVistas = {};
    if (iZona < 0 && Object.keys(setZ).length) {
        for (const f of pre) { const z = rxInfZonaDeFila(f, iZona); if (z) zonasVistas[z] = 1; }
    }
    // Filtro por unidad.
    if (iUni >= 0 && RX_INF.eco) {
        const q = norm(RX_INF.eco);
        pre = pre.filter((f) => norm(f[iUni]).indexOf(q) >= 0);
    }
    // Resumen por unidad: sobre lo ya filtrado.
    if (RX_INF.vista === 'unidad') {
        const r = rxInfResumenUnidad(RX_INF.cols, pre, { iUni: iUni, iFec: tipos.iFec, num: tipos.num, txt: tipos.txt });
        cols = r.cols;
        filas = r.filas;
        pre = filas;
    }
    pre = rxInfFiltra(pre, RX_INF.q, 8);
    pre = rxInfOrdena(pre, RX_INF.orden, cols);
    const unidades = {};
    if (iUni >= 0) pre.forEach((f) => { unidades[String(f[iUni] == null ? '' : f[iUni])] = 1; });
    const zonas = {};
    for (const k of Object.keys(zonasVistas)) zonas[k] = 1;
    if (iZona >= 0) pre.forEach((f) => { zonas[String(f[iZona] == null ? '' : f[iZona])] = 1; });
    return {
        cols: cols, filas: pre, total: filas.length, tipos: tipos, clase: clase,
        iZona: iZona, iUni: iUni,
        unidades: Object.keys(unidades).length, zonas: Object.keys(zonas).length,
        colUni: (RX_INF.vista === 'unidad') ? 0 : iUni,
        meta: RX_INF.meta || { filas: 0, unidades: 0, trozos: 0, objetos: 0, ms: 0, fallos: 0 }
    };
}
function rxInfResumenTexto(v) {
    const m = v.meta;
    const rango = (RX_INF.desde || '') + ' \u2192 ' + (RX_INF.hasta || '');
    return (RX_INF.tpl ? RX_INF.tpl.nombre : 'Sin plantilla') + ' \u00b7 ' + rango + ' \u00b7 ' +
        v.total + ' fila(s) de ' + v.filas.length + ' mostrada(s)' +
        (v.iUni >= 0 ? ', ' + v.unidades + ' unidad(es)' : '') +
        (v.iZona >= 0 ? ', ' + v.zonas + ' geocerca(s)' : '') + ' \u00b7 ' +
        m.trozos + ' trozos \u00b7 ' + Math.round(m.ms / 1000) + ' s' +
        (m.cacheados ? ' \u00b7 ' + m.cacheados + ' ya estaban en cache' : '') +
        (m.fallos ? ' \u00b7 ' + m.fallos + ' trozo(s) con error' : '');
}
// Tabla de la vista previa: celdas escapadas, numeros alineados y
// cabecera pulsable para ordenar (lo que se ve es lo que se exporta).
function rxInfTablaHTML(cols, filas, max) {
    const orden = RX_INF.orden;
    const cab = (cols || []).slice(0, 14).map((c, i) => {
        const act = orden && orden.col === i;
        const flecha = act ? (orden.dir < 0 ? ' \u25be' : ' \u25b4') : '';
        return '<th class="ord' + (act ? ' on' : '') + '" data-col="' + i + '" title="Ordenar por esta columna">' +
            esc(c) + flecha + '</th>';
    }).join('');
    const cuerpo = (filas || []).slice(0, max || 60).map((f) => {
        let out = '';
        for (let i = 0; i < Math.min((cols || []).length, 14); i++) {
            const v = f[i];
            const txt = (v == null || v === '') ? '-' : String(v);
            const num = rxInfNum(v) != null;
            out += '<td' + (num ? ' class="num"' : '') + '>' + esc(txt) + '</td>';
        }
        return '<tr>' + out + '</tr>';
    }).join('');
    return '<table><thead><tr>' + cab + '</tr></thead><tbody>' + cuerpo + '</tbody></table>';
}
// Bloque "que datos trae": los campos de la plantilla con su tipo y de que
// trata (vehiculos, geocercas o mixto). Es la respuesta a la pregunta que
// se hace uno al elegir una plantilla sin saber que trae.
function rxInfCamposHTML(info) {
    if (!info || !info.cols || !info.cols.length) return '';
    const c = info.clase || {};
    const ETQ = { geocercas: 'Geocercas', vehiculos: 'Veh\u00edculos', mixto: 'Veh\u00edculos y geocercas', otro: 'Datos generales' };
    const ETQF = { texto: 'texto', numero: 'n\u00famero', fecha: 'fecha' };
    const chips = (info.clase && info.clase.campos || []).slice(0, 14).map((f) =>
        '<span class="rgi-campo t-' + f.t + '">' + esc(f.n) + '<i>' + ETQF[f.t] + '</i></span>').join('');
    const extra = (info.clase && info.clase.campos && info.clase.campos.length > 14)
        ? '<span class="rgi-campo">+' + (info.clase.campos.length - 14) + '</span>' : '';
    const ej = info.filas
        ? (info.filas + ' fila(s) en ' + (info.horas === 24 ? 'las \u00faltimas 24 h' : 'los \u00faltimos 7 d\u00edas'))
        : '';
    return '<div class="rgi-sonda">' +
        '<div class="rgi-sonda-t"><b>' + esc(ETQ[c.tipo] || 'Datos') + '</b>' +
        (info.cols.length ? '<span>' + info.cols.length + ' campo(s)' + (ej ? ' \u00b7 ' + ej : '') + '</span>' : '') +
        '</div>' +
        '<div class="rgi-campos">' + chips + extra + '</div>' +
        (info.fallo ? '<div class="rgi-sonda-e">Sondeo sin datos: ' + esc(info.fallo) + '</div>' : '') +
        '</div>';
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
    // Una sola barra de progreso, DENTRO del cuerpo (#rgi-prog): antes
    // habia una en la cabecera y otra aqui, y se veian las dos.
    const html = '<div class="rgi-tool">' +
        // El minimapa vive FUERA de la caja de datos: se actualiza sin
        // repintar el formulario y aparece/desaparece segun los datos.
        '<div class="rgi-mapa" id="rgi-mapa" style="display:none"></div>' +
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
            // El progreso se pinta en DOS sitios: la barra de arriba del
            // dialogo y una fila dentro del cuerpo. Asi se ve siempre, con el
            // dialogo desplazado o no.
            const setProg = (p, t) => {
                const pc = Math.max(0, Math.min(100, p || 0));
                RX_INF.prog = Object.assign({}, RX_INF.prog, { activo: true, pct: pc, txt: t || '' });
                const pin = byId('rgi-prog');
                if (!pin) return;
                const pt = pin.querySelector('#rgi-prog-t');
                const pb = pin.querySelector('#rgi-prog-b');
                if (pt && t) pt.textContent = t;
                if (pb) pb.style.width = pc + '%';
                pin.style.display = 'flex';
            };
            const finProg = () => {
                RX_INF.prog = Object.assign({}, RX_INF.prog, { activo: false, pct: 0 });
                const pin = byId('rgi-prog');
                if (pin) pin.style.display = 'none';
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
                        ? 'Ejecutada por report/exec_report, en trozos de ' + RX_INF_DIAS_TROZO + ' d\u00edas para no chocar con el l\u00edmite de tiempo'
                        : 'Elige una plantilla de las que ya tienes en AE-Track') + '</span></div>' +
                    (tpl ? '<i class="rgi-ori">API</i>' : '') + '</div>';
                // Plantillas, con buscador.
                const filaTpl = '<div class="rgi-row"><span class="rgi-lb">Plantilla</span>' +
                    '<span class="rgi-busca"><span class="rondo-usym">' + UIS.filter + '</span>' +
                    '<input type="text" id="rgi-buscar" class="filtro" placeholder="Buscar plantilla\u2026" value="' + esc(RX_INF.busca || '') + '"' + dis + '>' +
                    '<i id="rgi-busca-n">' + lista.length + '/' + plantillas.length + '</i></span>' +
                    '<button type="button" class="mini" id="rgi-tpl-cargar"' + dis + '>' +
                    '<span class="rondo-usym">' + UIS.refresh + '</span> Leer plantillas</button></div>';
                // Tarjetas: eligen la plantilla y la ejecutan. El tipo (de
                // vehiculos o de geocercas) sale del sondeo de cada una.
                const tipoBadge = (t) => {
                    const c = (RX_INF.sonda && RX_INF._sondaKey === 'sondeo|' + rxInfClave(t)) ? RX_INF.sonda.clase : null;
                    if (!c) return '';
                    const ETQ = { geocercas: 'geocercas', vehiculos: 'veh\u00edculos', mixto: 'mixto', otro: 'datos' };
                    return '<em class="rgi-tipo t-' + c.tipo + '">' + ETQ[c.tipo] + '</em>';
                };
                const listaHtml = '<div class="rgi-tpls" id="rgi-lista">' + (plantillas.length
                    ? lista.map((t) => '<div class="rgi-tpl' + (rxInfClave(t) === rxInfClave(tpl) ? ' activo' : '') + '">' +
                        '<button type="button" class="rgi-tpl-sel" data-tpl="' + esc(rxInfClave(t)) + '"' + dis + '>' +
                        '<b>' + esc(t.nombre) + '</b><i>#' + esc(t.id) + '</i>' + tipoBadge(t) + '</button>' +
                        '<button type="button" class="rgi-tpl-run" data-tplrun="' + esc(rxInfClave(t)) + '" title="Ejecutar esta plantilla"' + dis + '>' +
                        '<span class="rondo-usym">' + UIS.play + '</span></button>' +
                        '</div>').join('')
                    : '<p class="rgi-more">' + (plantillas.length === 0 && !RX_INF._cargadas
                        ? 'Pulsando "Leer plantillas" se listan las que hay definidas en la plataforma.'
                        : 'Sin plantillas con ese nombre.') + '</p>') + '</div>';
                // Que datos trae la plantilla (sondeo) y de que trata.
                // Se pinta SIEMPRE, con su estado: pendiente, sin datos o
                // error. Antes solo aparecia si el sondeo traia columnas y
                // se tradujo en "no dice nada de la plantilla".
                const sonda = RX_INF.sonda || null;
                const pista = rxInfPista(tpl);
                const esGeo = rxInfEsDeGeocercas();
                const clase0 = (sonda && sonda.clase) ? sonda.clase : null;
                let panelSonda = '';
                if (tpl) {
                    const ETQ = { geocercas: 'Geocercas', vehiculos: 'Veh\u00edculos', mixto: 'Veh\u00edculos y geocercas', otro: 'Datos generales' };
                    const decl = sonda && sonda.declaracion ? sonda.declaracion : null;
                    const titulo = clase0 ? ETQ[clase0.tipo]
                        : (decl && decl.esGeo ? 'Geocercas (declarado por la plantilla)'
                            : (pista === 'geocercas' ? 'Geocercas (por el nombre)' : 'Datos de la plantilla'));
                    const estado = !sonda ? 'Pendiente' : (sonda.estado === 'ok' ? ''
                        : (sonda.estado === 'vacio' ? 'Sin datos en el sondeo' : (sonda.estado === 'error' ? 'Error' : 'Sondeando\u2026')));
                    let detalle = '';
                    if (!estado) {
                        const ventana = (sonda.horas === 24) ? 'las \u00faltimas 24 h'
                            : (sonda.horas === 168 ? 'los \u00faltimos 7 d\u00edas' : 'los \u00faltimos 30 d\u00edas');
                        detalle = sonda.cols.length + ' campo(s) \u00b7 ' + (sonda.filas ? (sonda.filas + ' fila(s) en ' + ventana) : 'sin filas');
                    }
                    panelSonda = '<div class="rgi-sonda' + (sonda && sonda.estado !== 'ok' ? ' pend' : '') + '">' +
                        '<div class="rgi-sonda-t"><b>' + esc(titulo) + '</b>' +
                        (estado ? '<span class="rgi-sonda-e">' + esc(estado) + '</span>' : '<span>' + esc(detalle) + '</span>') +
                        '<button type="button" class="mini" id="rgi-sonda"' + dis + ' title="Ejecutar la plantilla una vez para ver qu\u00e9 datos trae">' +
                        '<span class="rondo-usym">' + UIS.refresh + '</span> Sondear</button>' +
                        '</div>' +
                        (sonda && sonda.estado === 'ok' && sonda.clase ? rxInfCamposHTML(sonda) : '') +
                        (sonda && sonda.msg ? '<div class="rgi-sonda-e">' + esc(sonda.msg) + '</div>' : '') +
                        (sonda && sonda.declaracion && sonda.declaracion.columnas.length
                            ? '<div class="rgi-campos"><span class="rgi-campo t-texto">Lo que trae la plantilla</span>' +
                              sonda.declaracion.columnas.map((c) => '<span class="rgi-campo">' + esc(c) + '</span>').join('') +
                              '</div>' : '') +
                        (sonda && sonda.declaracion && sonda.declaracion.params.length
                            ? '<div class="rgi-campos"><span class="rgi-campo t-numero">Filtros guardados</span>' +
                              sonda.declaracion.params.map((x) => '<span class="rgi-campo">' + esc(x.k) + ': ' + esc(x.v) + '</span>').join('') +
                              (sonda.declaracion.columnas.length ? '' :
                                  '<span class="rgi-campo">cambialos en la plataforma</span>') +
                              '</div>' : '') +
                        (tpl && (sonda && sonda.declarado && sonda.declarado.objetos.length)
                            ? '<div class="rgi-campos"><span class="rgi-campo">' + sonda.declarado.objetos.length +
                              ' objeto(s) que admite la plantilla</span>' +
                              sonda.declarado.objetos.slice(0, 12).map((o) => '<span class="rgi-campo">' +
                                  esc(o.eco) + '</span>').join('') +
                              (sonda.declarado.objetos.length > 12
                                  ? '<span class="rgi-campo">+' + (sonda.declarado.objetos.length - 12) + '</span>' : '') +
                              '</div>' : '') +
                        '</div>';
                }
                // Si es de geocercas, se PREGUNTA por geocercas: selector con
                // buscador (hay mas de mil) y, si el informe ya trae nombres,
                // tambien las que aparecen en sus datos.
                let filaGeos = '';
                if (esGeo) {
                    const zs = rxInfZonasDeSonda();
                    const marcadas = (RX_INF.zonas || []).length;
                    filaGeos = '<div class="rgi-row"><span class="rgi-lb">Geocerca</span>' +
                        '<span class="rgi-busca"><span class="rondo-usym">' + UIS.zone + '</span>' +
                        '<input type="text" id="rgi-zona-busca" class="filtro" placeholder="Buscar geocerca\u2026" value="' + esc(RX_INF.zonaBusca || '') + '"' + dis + '>' +
                        '<i id="rgi-zona-busca-n">' + (marcadas ? marcadas + ' de ' + zs.length : zs.length) + '</i></span>' +
                        (zs.length ? '<button type="button" class="mini" id="rgi-geos-todas"' + dis + '>todas</button>' +
                            '<button type="button" class="mini" id="rgi-geos-ninguna"' + dis + '>ninguna</button>' : '') +
                        '</div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><div class="rgi-chips rgi-zonas" id="rgi-zonas">' +
                        zs.map((z) => '<button type="button" class="rgi-chip' +
                            (RX_INF.zonas.indexOf(z.n) >= 0 ? ' activo' : '') + '" data-zona="' + esc(z.n) + '"' +
                            (z.app ? ' title="Geocerca creada en Rondo"' : (z.enInforme ? ' title="Sale en el informe"' : '')) + dis + '>' +
                            esc(z.n) + (z.app ? ' \u00b7 Rondo' : (z.enInforme ? ' \u00b7 informe' : '')) + '</button>').join('') +
                        '</div></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint" style="width:100%">' +
                        esc(marcadas
                            ? ('Filtra las filas del informe por ' + marcadas + ' geocerca(s) marcadas.')
                            : 'Marca una o mas geocercas para quedarte solo con sus filas. Sin marcar, salen todas.') +
                        '</span></div>';
                }
                // Filtro por unidad (si la plantilla trae unidades).
                let filaEco = '';
                const muestraUnidades = !!(clase0 && clase0.iUni >= 0);
                if (muestraUnidades) {
                    filaEco = '<div class="rgi-row"><span class="rgi-lb">Unidad</span>' +
                        '<span class="rgi-busca"><span class="rondo-usym">' + UIS.filter + '</span>' +
                        '<input type="text" id="rgi-eco" class="filtro" placeholder="Filtrar por unidad\u2026" value="' + esc(RX_INF.eco || '') + '"' + dis + '>' +
                        (sonda && sonda.unidades && sonda.unidades.length ? '<i>' + sonda.unidades.length + '</i>' : '') + '</span></div>' +
                        (sonda && sonda.unidades && sonda.unidades.length
                            ? '<div class="rgi-row"><span class="rgi-lb"></span><div class="rgi-chips rgi-zonas">' +
                              sonda.unidades.slice(0, 24).map((u) => '<button type="button" class="rgi-chip' +
                                  (RX_INF.eco === u ? ' activo' : '') + '" data-eco="' + esc(u) + '"' + dis + '>' + esc(u) + '</button>').join('') +
                              '</div></div>'
                            : '');
                }
                // Periodo y alcance.
                const chip = (act, v, txt, titulo) => '<button type="button" class="rgi-chip' + (act ? ' activo' : '') +
                    '" data-i="rango" data-v="' + esc(v) + '"' + (titulo ? ' title="' + esc(titulo) + '"' : '') + dis + '>' + esc(txt) + '</button>';
                // Objeto secundario: lo que la plataforma pide de verdad.
                // Se autocompleta con lo que declara la plantilla y se puede
                // escribir a mano (util cuando el listado no cuadra).
                // La fila del objeto solo se ensena cuando aporta: si la
                // plantilla no dijo sobre que se ejecuta (o el operador pulso
                // "avanzado"). Lo normal es que Rondo ya lo sepa.
                const filaSec = (!sonda || !sonda.declaracion || RX_INF._verObjeto)
                    ? '<div class="rgi-row"><span class="rgi-lb">Objeto</span>' +
                    '<span class="rgi-busca"><span class="rondo-usym">' + UIS.pin + '</span>' +
                    '<input type="text" id="rgi-sec" class="filtro" placeholder="reportObjectSecId" value="' + esc(RX_INF.secId || '') + '"' + dis + '>' +
                    (sonda && sonda.objetos ? '<i>' + sonda.objetos + ' declarados</i>' : '') + '</span>' +
                    '<button type="button" class="mini" id="rgi-sec-probar"' + dis + ' title="Ejecuta un solo trozo con este objeto y te dice que pasa">' +
                    '<span class="rondo-usym">' + UIS.play + '</span> Probar</button>' +
                    (sonda && sonda.objetos
                        ? '<button type="button" class="mini" id="rgi-sec-lista"' + dis + '>ver declarados</button>' : '') +
                    (RX_INF._verObjeto ? '<button type="button" class="mini" id="rgi-sec-ocultar"' + dis + '>ocultar</button>' : '') +
                    '</span></div>'
                    : '<div class="rgi-row"><span class="rgi-lb">Objeto</span>' +
                      '<span class="rgi-gen-hint">La plantilla dice sobre que se ejecuta: ' +
                      esc((sonda && sonda.declaracion && sonda.declaracion.esGeo) ? 'sus geocercas'
                          : ((sonda && sonda.objetos) ? (sonda.objetos + ' objeto(s)') : 'la flota')) +
                      '. <button type="button" class="mini" id="rgi-sec-ver"' + dis + '>elegirlo a mano</button></span></div>';
                const filaPeriodo = '<div class="rgi-row"><span class="rgi-lb">Periodo</span><div class="rgi-chips">' +
                    chip(RX_INF.rango === 'hoy' && !RX_INF.desde, 'hoy', 'Hoy') +
                    chip(RX_INF.rango === '7d' && !RX_INF.desde, '7d', '7 d\u00edas') +
                    chip(RX_INF.rango === '30d' && !RX_INF.desde, '30d', '30 d\u00edas') +
                    chip(RX_INF.rango === 'mes' && !RX_INF.desde, 'mes', 'Mes actual') +
                    chip(RX_INF.rango === 'mes-1' && !RX_INF.desde, 'mes-1', 'Mes anterior') +
                    chip(RX_INF.rango === '90d' && !RX_INF.desde, '90d', '90 d\u00edas') +
                    chip(RX_INF.rango === 'ano' && !RX_INF.desde, 'ano', 'Este a\u00f1o') + chip(RX_INF.rango === 'ano-1' && !RX_INF.desde, 'ano-1', 'A\u00f1o anterior') +
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
                    (nUn ? ' title="Solo las ' + nUn + ' seleccionadas"' : ' title="Ning\u00fan unidad seleccionada"') + '>' +
                    'Solo seleccionadas (' + nUn + ')</button>' +
                    '</div></div>';
                // Ejecucion:估算 y boton (o cancelar).
                const rangoS = rxInfRangoS();
                const nTrozos = Math.min(RX_INF_MAX_TROZOS,
                    rxGeoInfTrozos(rangoS.desde, rangoS.hasta, RX_INF_DIAS_TROZO * 86400).length);
                // Si ya hay resultados, la pantalla muestra avisos sobre ellos.
                const hay = (RX_INF.cols || []).length > 0;
                const avisos = [];
                if (RX_INF.alcance === 'sel' && !nUn) avisos.push('No hay unidades seleccionadas: usa "Toda la flota" o selecciona unidades en la lista.');
                if (RX_INF.rango === 'todo' && rangoS.desde > 0 && ((Date.now() / 1000 - rangoS.desde) > 400 * 86400)) {
                    avisos.push('"Todo" puede abarcar mas de lo que la plataforma guarda; por eso se trocea y se avisa al terminar.');
                }
                if (RX_INF.meta && RX_INF.meta.fallos) avisos.push(RX_INF.meta.fallos + ' trozo(s) fallaron: ' + ((RX_INF.meta.errores || [])[0] || 'error desconocido'));
                if (RX_INF.meta && RX_INF.meta.recortado) {
                    avisos.push('Se ejecutaron ' + RX_INF_MAX_OBJETOS + ' objetos como maximo. Marca en el filtro de geocercas las que te interesen para ajustarlo.');
                }
                if (RX_INF.meta && RX_INF.meta.bloqueado) {
                    avisos.push('La plataforma esta rechazando la ejecucion (' + RX_INF.meta.fallos +
                        ' trozos seguidos con el mismo error). Se ha parado en vez de repetirlo 30 veces: revisa el detalle.');
                }
                if (RX_INF.diag && RX_INF.diag.error) {
                    avisos.push('Ultimo intento: ' + (RX_INF.diag.enviado
                        ? ('plantilla ' + RX_INF.diag.enviado.reportTemplateId + ', objeto ' + RX_INF.diag.enviado.reportObjectId +
                            ', secundario "' + RX_INF.diag.enviado.reportObjectSecId + '"')
                        : 'sin datos') + ' \u00b7 ' +
                        '<button type="button" class="mini" id="rgi-diag"' + dis + '>ver detalle</button>');
                }
                if (RX_INF.meta && RX_INF.meta.lleno) avisos.push('Se alcanzo el tope de ' + Math.round(RX_INF_MAX_FILAS / 1000) + 'k filas: acorta el periodo.');
                if (hay) {
                    const vacias = rxInfColumnasVacias(v.cols, v.filas);
                    if (vacias.length && vacias.length < v.cols.length) {
                        avisos.push('Columnas sin datos: ' + vacias.slice(0, 4).join(', ') +
                            '. Suele ser que a la plantilla le falta un filtro que solo puedes poner en la plataforma.');
                    }
                }
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
                const barraVista = '<div class="rgi-row"><span class="rgi-lb">Ver</span><div class="rgi-chips">' +
                    '<button type="button" class="rgi-chip' + (RX_INF.vista !== 'unidad' ? ' activo' : '') + '" data-i="vista" data-v="filas"' + dis + '>Filas</button>' +
                    '<button type="button" class="rgi-chip' + (RX_INF.vista === 'unidad' ? ' activo' : '') + '" data-i="vista" data-v="unidad"' + dis + '>Resumen por unidad</button>' +
                    '<span class="rgi-busca" style="margin-left:auto"><span class="rondo-usym">' + UIS.filter + '</span>' +
                    '<input type="text" id="rgi-q" class="filtro" placeholder="Filtrar filas\u2026" value="' + esc(RX_INF.q || '') + '"' + dis + '></span>' +
                    '</div></div>';
                const kpis = hay ? '<div class="rgi-kpis">' +
                    '<div class="rgi-kpi ok"><b>' + v.total + '</b><span>Filas</span></div>' +
                    (v.iUni >= 0 ? '<div class="rgi-kpi"><b>' + v.unidades + '</b><span>Unidades</span></div>' : '') +
                    (v.iZona >= 0 ? '<div class="rgi-kpi"><b>' + v.zonas + '</b><span>Geocercas</span></div>' : '') +
                    '<div class="rgi-kpi"><b>' + v.meta.trozos + '</b><span>Trozos</span></div>' +
                    '<div class="rgi-kpi"><b>' + Math.round(v.meta.ms / 1000) + ' s</b><span>Calculo</span></div>' +
                    (v.meta.cacheados ? '<div class="rgi-kpi"><b>' + v.meta.cacheados + '</b><span>En cache</span></div>' : '') +
                    (v.meta.fallos ? '<div class="rgi-kpi"><b>' + v.meta.fallos + '</b><span>Trozos con error</span></div>' : '') +
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
                // Progreso dentro del cuerpo: visible aunque el dialogo este
                // desplazado y aunque la barra de arriba quede fuera de vista.
                const prog = RX_INF.prog && RX_INF.prog.activo
                    ? '<div class="rgi-carga" id="rgi-prog" style="display:flex">' +
                      '<span id="rgi-prog-t">' + esc(RX_INF.prog.txt || 'Calculando\u2026') + '</span>' +
                      '<span class="rgi-barra"><i id="rgi-prog-b" style="width:' +
                        Math.max(2, RX_INF.prog.pct || Math.round((RX_INF.prog.hechas / Math.max(1, RX_INF.prog.total)) * 100)) +
                        '%"></i></span></div>'
                    : '';
                return '<div class="rgi">' + hero +
                    '<div class="rgi-cfg">' + filaTpl + listaHtml + '</div>' +
                    panelSonda +
                    prog +
                    '<div class="rgi-cfg">' + filaPeriodo + filaSec + filaGeos + filaEco + '</div>' +
                    (avisos.length ? '<div class="rgi-aviso">' + avisos.map(esc).join(' ') + '</div>' : '') +
                    barraEjec +
                    (hay ? '<div class="rgi-cfg">' + barraVista + '</div>' : '') +
                    '<div id="rgi-dyn">' + kpis + resumen + tabla + '</div>' +
                    salidas +
                    '</div>';
            };
            const pinta = () => {
                const mio = ++pintaN;
                if (mio !== pintaN) return;
                const v = rxInfVista();
                setHtml(box, cuerpo());
                // El mapa se recalcula con lo que hay ahora (con filtros).
                try { rxInfPintaMapa(v); } catch (_) { /* sin mapa */ }
            };
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
                if (!RX_INF.tpl && plantillas.length) {
                    RX_INF.tpl = plantillas[0];
                    RX_INF.sonda = null;
                    RX_INF._sondaKey = '';
                }
                RX_INF._buscando = false;
                pinta();
                if (RX_INF.tpl) sondea(false);
            };
            // Sondeo: una ejecucion corta para saber que datos trae la
            // plantilla y si es de vehiculos o de geocercas.
            // Un sondeo a la vez. Si se elige otra plantilla mientras corre,
            // se encola: antes el sondeo se descartaba en silencio y el panel
            // no llegaba a aparecer.
            const sondea = async (forzar) => {
                if (!RX_INF.tpl) return;
                // La plataforma calcula un informe a la vez: si ya se esta
                // generando, el sondeo espera (antes competian y ambos salian
                // con code 1004).
                if (RX_INF._buscando) { RX_INF._sondaPendiente = 1; return; }
                if (RX_INF._sondeando) { RX_INF._sondaFuerza = forzar ? 'si' : ''; return; }
                RX_INF._sondeando = true;
                if (forzar) {
                    const k = 'sondeo|' + rxInfClave(RX_INF.tpl);
                    try { delete rxInfCacheCargar()[k]; } catch (_) { /* noop */ }
                    RX_INF.sonda = null;
                    RX_INF._sondaKey = '';
                }
                const t = RX_INF.tpl;
                RX_INF.sonda = rxInfSondaVacia('pendiente', '');
                pinta();
                try { await rxInfSondea(t); } catch (e) {
                    rxInfSondaVacia('error', (e && e.message) || 'no se pudo sondear');
                }
                RX_INF._sondeando = false;
                if (RX_INF.tpl && rxInfClave(RX_INF.tpl) === rxInfClave(t)) pinta();
                if (RX_INF._sondaFuerza || (RX_INF._sondaPendiente && RX_INF._sondaPendiente !== rxInfClave(t))) {
                    const sigue = RX_INF._sondaPendiente;
                    RX_INF._sondaPendiente = '';
                    if (sigue) RX_INF._sondaPendiente = sigue;
                    sondea(false);
                }
            };
            const ejecutar = async () => {
                leeFechas();
                if (!RX_INF.tpl) { adviceWarn('Sin plantilla', 'Elige una plantilla del informe.'); return; }
                if (RX_INF._buscando) return;
                const r = rxInfRangoS();
                if (!(r.hasta > r.desde)) { adviceWarn('Rango invalido', 'El fin debe ser posterior al inicio.'); return; }
                const sel = (RX_INF.alcance === 'sel') ? unidadesSel() : null;
                // Objeto secundario escrito a mano: manda sobre todo lo demas.
                const secManual = (byId('rgi-sec') || {}).value || RX_INF.secId || '';
                if (secManual) RX_INF.secId = secManual;
                if (RX_INF.alcance === 'sel' && (!sel || !sel.length)) { adviceWarn('Sin unidades', 'Selecciona unidades en la lista o elige "Toda la flota".'); return; }
                RX_INF._buscando = true;
                RX_INF._token = { cancelado: false };
                RX_INF.prog = { activo: true, hechas: 0, total: 0, filas: 0, txt: '' };
                pinta();
                // El progreso aparece DE INMEDIATO, antes del primer trozo
                // (que con 700 unidades tarda): si no, seemed un dialogo
                // parado.
                setProg(4, 'Preparando\u2026');
                let res;
                try {
                    const manual = RX_INF.secId ? [{ id: RX_INF.secId, eco: RX_INF.secId }] : null;
                    res = await rxInfCorre(RX_INF.tpl, r.desde, r.hasta, (manual || sel), (h, t, filas, eco) => {
                        RX_INF.prog = { activo: true, hechas: h, total: t, filas: filas, txt: eco || '' };
                        setProg(6 + Math.round((h / Math.max(1, t)) * 86),
                            (RX_INF.tpl ? RX_INF.tpl.nombre + ' \u00b7 ' : '') + h + '/' + t +
                            (eco ? ' \u00b7 ' + eco : '') +
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
                finProg();
                RX_INF.cols = res.cols || [];
                RX_INF.filas = res.filas || [];
                RX_INF.meta = { filas: RX_INF.filas.length, unidades: rxInfVista().unidades, trozos: res.trozos, objetos: res.objetos, ms: res.ms, fallos: res.fallos, errores: res.errores, cacheados: res.cacheados, lleno: res.lleno };
                // Si no se sondeo antes, el resultado real sirve de sondeo:
                // el panel de datos y el filtro de geocercas aparecen solos.
                if (RX_INF.cols.length && RX_INF._sondaKey !== 'sondeo|' + rxInfClave(RX_INF.tpl)) {
                    const m = RX_INF.filas.slice(0, 12);
                    const info = {
                        cols: RX_INF.cols, muestra: m, filas: RX_INF.filas.length, horas: 0, fallo: '',
                        clase: rxInfClasifica(RX_INF.cols, m), zonas: [], unidades: []
                    };
                    if (info.clase.iZona >= 0) {
                        const set = {};
                        m.forEach((f) => { const v = String(f[info.clase.iZona] == null ? '' : f[info.clase.iZona]).trim(); if (v) set[v] = 1; });
                        info.zonas = Object.keys(set).sort();
                    }
                    if (info.clase.iUni >= 0) {
                        const set = {};
                        m.forEach((f) => { const v = String(f[info.clase.iUni] == null ? '' : f[info.clase.iUni]).trim(); if (v) set[v] = 1; });
                        info.unidades = Object.keys(set).sort();
                    }
                    RX_INF.sonda = info;
                    RX_INF._sondaKey = 'sondeo|' + rxInfClave(RX_INF.tpl);
                }
                pinta();
                if (RX_INF._sondaPendiente && !RX_INF._buscando) { RX_INF._sondaPendiente = 0; setTimeout(() => sondea(false), 400); }
                if (res.cancelado) advice('Informe cancelado', RX_INF.filas.length + ' fila(s) hasta donde llego (quedan guardadas).');
                else adviceOk('Informe generado', RX_INF.filas.length + ' fila(s) de ' + (RX_INF.tpl ? RX_INF.tpl.nombre : '') +
                    (res.fallos ? ' \u00b7 ' + res.fallos + ' trozo(s) con error' : '') + ' \u00b7 ' + Math.round(res.ms / 1000) + ' s');
            };
            box.addEventListener('click', async (ev) => {
                const btn = ev.target.closest && ev.target.closest('button');
                if (btn && box.contains(btn)) {
                    if (btn.id === 'rgi-ejecutar') { ejecutar(); return; }
                    if (btn.id === 'rgi-cancel') {
                        if (RX_INF._token) RX_INF._token.cancelado = true;
                        setProg(99, 'Cancelando\u2026');
                        return;
                    }
                    if (btn.id === 'rgi-tpl-cargar') { await cargarTpl(); return; }
                    if (btn.id === 'rgi-sonda') { sondea(true); return; }
                    if (btn.id === 'rgi-sec-ver') { RX_INF._verObjeto = 1; pinta(); return; }
                    if (btn.id === 'rgi-sec-ocultar') { RX_INF._verObjeto = 0; pinta(); return; }
                    if (btn.id === 'rgi-sec-lista') {
                        const objs = ((RX_INF.sonda && RX_INF.sonda.declarado && RX_INF.sonda.declarado.objetos) || []);
                        advice('Objetos declarados', objs.slice(0, 20).map((o) => o.eco).join(', ') || 'ninguno');
                        console.log('[Rondo] objetos de la plantilla', objs);
                        return;
                    }
                    if (btn.id === 'rgi-sec-probar') {
                        leeFechas();
                        const v = (byId('rgi-sec') || {}).value || '';
                        RX_INF.secId = v;
                        if (!RX_INF.tpl) { adviceWarn('Sin plantilla', 'Elige una plantilla.'); return; }
                        if (rxInfIsBusy()) return;
                        setRXInfBusy(true);
                        RX_INF._token = { cancelado: false };
                        RX_INF.prog = { activo: true, hechas: 0, total: 1, filas: 0, pct: 10, txt: 'Probando ' + (v || '(sin objeto)') };
                        pinta();
                        const r = rxInfRangoS();
                        const t0 = Date.now();
                        const res = await rxInfEjecutar(RX_INF.tpl, (v || 0), r.desde, r.hasta, RX_INF._token);
                        setRXInfBusy(false);
                        finProg();
                        pinta();
                        const txt = res.error
                            ? ('fallo: ' + rxInfExplicaError(res.error))
                            : ('ok: ' + (res.filas || []).length + ' fila(s), ' + ((res.cols || []).length) + ' columna(s)');
                        advice(res.error ? 'La plataforma no lo acepta' : 'Prueba correcta', txt);
                        console.log('[Rondo] prueba de informe', { pedido: v, resultado: res });
                        return;
                    }
                    if (btn.id === 'rgi-diag') {
                        try { await navigator.clipboard.writeText(JSON.stringify(RX_INF.diag, null, 1)); } catch (_) { /* noop */ }
                        console.log('[Rondo] ultimo intento de informe', RX_INF.diag);
                        advice('Detalle copiado', 'Tambien esta en la consola del navegador.');
                        return;
                    }
                    if (btn.id === 'rgi-cache-limpiar') {
                        rxInfCacheLimpiar();
                        RX_INF.cols = []; RX_INF.filas = []; RX_INF.meta = null;
                        adviceOk('Resultados guardados vaciados', 'La pr\u00f3xima ejecuci\u00f3n los vuelve a calcular.');
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
                                mapa: rxInfMapaHTML(v, 660, 240),
                                meta: Object.assign({}, v.meta, { unidades: v.unidades }),
                                resumen: rxInfResumenTexto(v)
                            }));
                            advice('Reporte listo', 'Elige "Guardar como PDF" en el di\u00e1logo de impresi\u00f3n.');
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
                // Ejecutar una plantilla concreta desde su tarjeta.
                const rb = ev.target.closest && ev.target.closest('[data-tplrun]');
                if (rb && box.contains(rb)) {
                    const t = rxInfTplDeClave(rb.dataset.tplrun);
                    if (t) { RX_INF.tpl = { rid: t.rid, id: t.id, nombre: (plantillas.filter((x) => rxInfClave(x) === rxInfClave(t))[0] || t).nombre }; ejecutar(); }
                    return;
                }
                // Elegir plantilla: se sondea para saber que datos trae (si
                // sigue sin saberse de esa plantilla).
                const tb = ev.target.closest && ev.target.closest('[data-tpl]');
                if (tb && box.contains(tb)) {
                    if (RX_INF._buscando) return;
                    const t = rxInfTplDeClave(tb.dataset.tpl);
                    if (t) {
                        const real = plantillas.filter((x) => rxInfClave(x) === rxInfClave(t))[0];
                        RX_INF.tpl = real || t;
                        // Cambiar de plantilla invalida lo calculado y los
                        // filtros que dependian de sus columnas.
                        RX_INF.cols = []; RX_INF.filas = []; RX_INF.meta = null;
                        RX_INF.zonas = []; RX_INF.eco = ''; RX_INF.orden = null;
                        RX_INF.sonda = null;
                    }
                    RX_INF._sondaPendiente = t ? rxInfClave(t) : '';
                    pinta();
                    if (t && RX_INF._sondaKey !== 'sondeo|' + rxInfClave(t)) sondea(false);
                    return;
                }
                // Marcar geocercas (plantillas que las traen).
                const zb = ev.target.closest && ev.target.closest('[data-zona]');
                if (zb && box.contains(zb)) {
                    if (RX_INF._buscando) return;
                    const z = zb.dataset.zona;
                    const i = RX_INF.zonas.indexOf(z);
                    if (i >= 0) RX_INF.zonas.splice(i, 1); else RX_INF.zonas.push(z);
                    pinta();
                    return;
                }
                if (ev.target.closest && ev.target.closest('#rgi-geos-todas')) {
                    if (RX_INF._buscando) return;
                    RX_INF.zonas = rxInfZonasDeSonda().map((z) => z.n);
                    pinta();
                    return;
                }
                if (ev.target.closest && ev.target.closest('#rgi-geos-ninguna')) {
                    if (RX_INF._buscando) return;
                    RX_INF.zonas = [];
                    pinta();
                    return;
                }
                // Chips de unidad que aparecen en el informe.
                const ub = ev.target.closest && ev.target.closest('[data-eco]');
                if (ub && box.contains(ub)) {
                    if (RX_INF._buscando) return;
                    RX_INF.eco = (RX_INF.eco === ub.dataset.eco) ? '' : ub.dataset.eco;
                    pinta();
                    return;
                }
                // Ordenar por cabecera de la tabla de resultados.
                const th = ev.target.closest && ev.target.closest('th.ord');
                if (th && box.contains(th)) {
                    const c = Number(th.dataset.col);
                    if (isFinite(c)) {
                        if (RX_INF.orden && RX_INF.orden.col === c) RX_INF.orden.dir = -RX_INF.orden.dir;
                        else RX_INF.orden = { col: c, dir: 1 };
                        pinta();
                    }
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
                if (t.id === 'rgi-sec') { RX_INF.secId = t.value || ''; return; }
                if (t.id === 'rgi-zona-busca') {
                    // Solo se repintan las geocercas: el campo no pierde el foco.
                    RX_INF.zonaBusca = t.value || '';
                    const cont = byId('rgi-zonas');
                    if (cont) {
                        const zs = rxInfZonasDeSonda();
                        cont.innerHTML = zs.map((z) => '<button type="button" class="rgi-chip' +
                            (RX_INF.zonas.indexOf(z.n) >= 0 ? ' activo' : '') + '" data-zona="' + esc(z.n) + '">' +
                            esc(z.n) + (z.app ? ' \u00b7 Rondo' : (z.enInforme ? ' \u00b7 informe' : '')) + '</button>').join('');
                    }
                    const n = byId('rgi-zona-busca-n');
                    if (n) n.textContent = String(rxInfZonasDeSonda().length);
                    return;
                }
                if (t.id === 'rgi-eco') {
                    RX_INF.eco = t.value || '';
                    const dyn = byId('rgi-dyn');
                    if (dyn) {
                        const v = rxInfVista();
                        dyn.innerHTML = '<div class="rgi-kpis">' +
                            '<div class="rgi-kpi ok"><b>' + v.total + '</b><span>Filas</span></div>' +
                            '<div class="rgi-kpi"><b>' + v.unidades + '</b><span>Unidades</span></div>' +
                            (v.iZona >= 0 ? '<div class="rgi-kpi"><b>' + v.zonas + '</b><span>Geocercas</span></div>' : '') +
                            '</div><p class="rgi-res">' + esc(rxInfResumenTexto(v)) + '</p>' +
                            '<div class="rgi-prev">' + rxInfTablaHTML(v.cols, v.filas, 60) + '</div>';
                    }
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
                            (v.iZona >= 0 ? '<div class="rgi-kpi"><b>' + v.zonas + '</b><span>Geocercas</span></div>' : '') +
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
