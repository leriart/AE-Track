/* ====================== INFORMES POR PLANTILLA (API) ======================
 * La via que si funciona: las plantillas de informe que el operador ya tiene
 * definidas en la plataforma (con sus filtros y sus columnas), ejecutadas por
 * report/exec_report y POR TROZOS.
 *
 * Por que funciona donde el informe nativo no: la plataforma calcula un
 * informe de 714 unidades y meses de datos en una sola peticion y salta con
 * "El tiempo de ejecucion ha superado el limite". Aqui la misma plantilla se
 * pide por semanas (o por objeto) y se pegan los resultados: ninguna peticion
 * crece, asi que ninguna revienta. Los trozos ya hechos se guardan en este
 * navegador, de modo que una ejecucion interrumpida se continua sin volver a
 * empezar.
 *
 * La llamada es SINCRONA: exec_report sin remoteExec responde code 0 y trae el
 * resultado en la propia respuesta (reportResult). La via asincrona
 * (remoteExec + get_report_status + apply_report_result + select_result_rows)
 * no funciona en esta instalacion. Ademas la sincrona admite el intervalo
 * elegido, asi que el periodo lo manda el operador.
 *
 * El nucleo (troceado, ejecucion, resumen por unidad, filtro y salidas) es
 * puro y se prueba en tests/informes-plantilla.test.js.
 */
// Dias por trozo: el corte de una semana cabe de sobra en el limite de la
// plataforma y no multiplica las llamadas mas de lo necesario.
const RX_INF_DIAS_TROZO = 7;
// Tope de trozos (a ~2 anos). Pasada de ahi, el aviso explica que se pidio
// mas de lo que la plataforma guarda.
const RX_INF_MAX_TROZOS = 110;
// Llamadas simultaneas. La plataforma calcula UN informe a la vez por sesion
// y rechaza el segundo (code 1004), asi que aqui van de una en una: la espera
// se paga en segundos, no en errores.
const RX_INF_CONC = 1;
// Tope de filas acumuladas: evita que un informe enorme reviente la memoria
// del navegador.
const RX_INF_MAX_FILAS = 60000;
// Tope de objetos a ejecutar cuando no se ha marcado ninguna geocerca. Una
// plantilla de geocercas se ejecuta UNA VEZ POR ZONA: sin tope, 1700 zonas x
// varios trozos son miles de llamadas. Se acota y se avisa.
const RX_INF_MAX_OBJETOS = 40;
// Techo (caracteres) de la cache de resultados en localStorage.
const RX_INF_CACHE_MAX = 3000000;
// Estado de la pantalla. Vive aqui, y no en el closure del dialogo, porque el
// dialogo se repinta entero y porque las salidas lo consultan.
const RX_INF = {
    tpl: null,           // {rid, id, nombre} plantilla elegida
    busca: '',           // filtro de texto de la lista de plantillas
    rango: '30d', desde: '', hasta: '',
    alcance: 'todas',    // 'todas' (toda la flota) | 'sel' (por unidades marcadas)
    vista: 'filas',      // 'filas' (crudo) | 'unidad' (resumen agregado)
    q: '',               // filtro de texto sobre las filas ya calculadas
    eco: '',             // filtro por unidad sobre las filas ya calculadas
    zonas: [],           // geocercas marcadas (plantilla de geocercas)
    zonaBusca: '',       // filtro de texto del selector de geocercas
    orden: null,         // {col, dir} de la tabla de resultados
    // Resultado de la ultima ejecucion.
    cols: [], filas: [], meta: null,
    // Lo que la plantilla DECLARA (que trae y como viene guardada). Se lee con
    // report/get_report_data, sin ejecutar nada.
    decl: null, _declKey: '',
    // Progreso en pantalla, dentro del cuerpo (no solo en la barra de arriba:
    // si el dialogo esta desplazado, la de arriba no se ve).
    prog: { activo: false, hechas: 0, total: 0, filas: 0, txt: '', pct: 0 },
    // Ultimo intento (para el boton de diagnostico): que se mando y que
    // devolvio la plataforma.
    diag: null,
    _cargadas: false, _buscando: false, _token: null
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
// exec_report devuelve reportResult con rows (arrays o objetos con {v,n}) y
// columns. Se normaliza a filas planas y se guardan los nombres de columna.
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
// Recorre lo que devuelve un servicio buscando la lista de filas y sus
// columnas: cada uno las anida de forma distinta (reportResult, reportLayer,
// rows, table...). Asi el nucleo no depende de la forma exacta.
function rxInfExtrae(r) {
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
// Que columnas sirven para algo: la de unidad, la de fecha y las numericas
// (las que se suman en el resumen por unidad). Se detectan por nombre, porque
// el nombre lo pone la plataforma y es lo unico estable.
function rxInfCols(cols) {
    const n = (cols || []).map((c) => norm(c).replace(/[^A-Z0-9]+/g, ' ').trim());
    const out = { iUni: -1, iFec: -1, num: [], txt: [] };
    n.forEach((c, i) => {
        if (out.iUni < 0 && /^(UNIDAD|ECO|VEHICULO|VEHICLE|OBJECT|OBJETO|NAME|NOMBRE|IMM|HOSTNAME|DRIVER|UNITS?)$/.test(c)) out.iUni = i;
        if (out.iFec < 0 && /(FECHA|DATE|TIME|HORA|TIEMPO)/.test(c)) out.iFec = i;
        const esNum = /\b(KM|KILOMETRO|KILOMETROS|MILEAGE|DISTANCIA|MIN|MINUTOS|DURACION|PRECIO|COST|IMPORTE|CANTIDAD|CANT|UNIDADES|UNITS|NUMERO|CONSUMO|GALONES|LITROS|HORAS)\b/.test(' ' + c + ' ');
        if (esNum) out.num.push(i); else out.txt.push(i);
    });
    return out;
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
// Un numero para pintar en espanol: miles con punto, decimal con coma y como
// mucho 2 decimales (los datos de la plataforma vienen asi).
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
// Resumen por unidad: una fila por unidad con el numero de filas y la suma de
// cada columna numerica. Es lo que hace util un informe de 40.000 filas.
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
// ── Cache de resultados por trozo ───────────────────────────────────────
// Un informe de un ano son 53 trozos por objeto. Guardarlos hace que la
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
    // informe se fuerza, o los ultimos trozos no quedarian guardados.
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
// Clave de un trozo: plantilla + recurso dueño + objeto + intervalo. El
// recurso dueño importa: dos geocercas de recursos distintos pueden compartir
// id y no ser la misma.
function rxInfCacheKey(tpl, o, desde, hasta) {
    const rid = (o && o.rid != null) ? o.rid : '';
    const id = (o && o.id != null) ? o.id : (o != null ? o : 0);
    return rxInfClave(tpl) + '|' + rid + '|' + id + '|' + ((o && o.def) ? 'd|' : '') + desde + '|' + hasta;
}
// ── Que declara la plantilla (report/get_report_data) ───────────────────
// La respuesta es una lista de plantillas con su estructura de tablas:
//   ct        tipo de objeto al que esta atada (avl_geozone, avl_unit...)
//   tbl[].cl  etiquetas de las columnas (lo que vera el operador)
//   tbl[].c   claves internas de esas columnas
//   tbl[].p   parametros con los que la plantilla esta guardada (sus FILTROS)
// Con esto la pantalla puede decir que datos ocupa la plantilla y sobre que
// objetos se puede ejecutar, sin ejecutarla.
async function rxInfDatosPlantilla(tpl) {
    try { return await remoteCall('report/get_report_data', { itemId: tpl.rid, col: [String(tpl.id)], flags: 0 }); }
    catch (_) { return null; }
}
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
            params: (params && typeof params === 'object') ? params : null
        };
    });
    const ct = String(t.ct || '');
    return {
        nombre: t.n || '', tipoObj: ct,
        esGeo: /geozone|geofence/i.test(ct), esUnidad: /unit/i.test(ct),
        tablas: tablas,
        // Columnas que el operador vera: union de las de todas las tablas.
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
        // Filtros con los que la plantilla viene guardada.
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
// ── De que trata la plantilla ───────────────────────────────────────────
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
            for (let i = 0; i < (filas || []).length && i < 30 && !zona.length; i++) {
                for (let j = 0; j < (filas[i] || []).length; j++) {
                    const v = norm((filas[i] || [])[j]);
                    if (v && nombres[v]) { zona.push(j); break; }
                }
            }
        }
    }
    const tieneZ = zona.length > 0, tieneU = uni.length > 0;
    const tipo = (tieneZ && tieneU) ? 'mixto' : (tieneZ ? 'geocercas' : (tieneU ? 'vehiculos' : 'otro'));
    const ETIQUETA = { mixto: 'Veh\u00edculos y geocercas', geocercas: 'Geocercas', vehiculos: 'Veh\u00edculos', otro: 'Datos generales' };
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
// Pista por el NOMBRE de la plantilla: sirve para ensenar la pantalla antes de
// leer lo que declara (o si get_report_data no devuelve nada).
function rxInfPista(tpl) {
    const n = norm((tpl && tpl.nombre) || '');
    if (!n) return '';
    if (/(GEOCERCA|GEOFENCE|^ZONA|ZONAS|PREDIO|MUELLE|ANDEN|NAVE|PATIO|CEDIS|BODEGA|TALLER|PORTA)/.test(n)) return 'geocercas';
    if (/(COMBUSTIBLE|CONSUMO|LITROS|GALONES|KILOMETR|RECORRIDO|VELOCIDAD|EXCESO|MENSAJE|USUARIO|ENTRADA|SALIDA|PRODUCTIVIDAD)/.test(n)) return 'vehiculos';
    return '';
}
// Aplica a la vista que la plantilla es de geocercas (por lo que declara o,
// si no, por el nombre de la plantilla).
function rxInfEsDeGeocercas() {
    if (RX_INF.decl && RX_INF.decl.esGeo) return true;
    if (rxInfPista(RX_INF.tpl) === 'geocercas') return true;
    return false;
}
// ── Objetos sobre los que se ejecuta ────────────────────────────────────
// Geocercas de la plataforma. Cada una lleva su recurso dueño (`_rid`): el
// informe de una geocerca se pide con ESE recurso como reportObjectId, que no
// tiene por que ser el mismo que el de la plantilla. Las geocercas dibujadas
// en Rondo no existen en la plataforma y se quedan fuera.
function rxInfZonasPlataforma() {
    const out = [];
    for (const z of (APP.zonas || [])) {
        if (!z || z.id == null) continue;
        const nm = rxGeoInfNombre(z);
        if (!nm) continue;
        let org = null;
        try { org = (typeof glocOrigen === 'function') ? glocOrigen(z) : null; } catch (_) { org = null; }
        if (org && org.id === 'app') continue;
        out.push({ id: String(z.id), eco: nm, rid: (z._rid != null ? z._rid : null), esZona: true });
    }
    return out;
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
        out.push({ id: String(u.id), eco: (info && (info.eco || info.clave)) || String(u.id), t: t });
    }
    // Mas recientes primero: si hay que parar por tiempo, ya se han visto las
    // unidades que mas filas pueden traer.
    out.sort((a, b) => (b.t || 0) - (a.t || 0));
    return out;
}
// ── Ejecucion (sincrona, con particion adaptativa) ──────────────────────
function rxInfEspera(ms) {
    return new Promise((r) => { try { setTimeout(r, ms); } catch (_) { r(); } });
}
// Traza de la ultima peticion: en consola queda que se envio y que contesto
// la plataforma. Sin esto, un "no sale nada" es imposible de diagnosticar.
function rxInfLog(tipo, enviado, err) {
    try {
        console.warn('[Rondo informe] ' + tipo, {
            objeto: enviado && enviado.reportObjectId,
            secundario: enviado && enviado.reportObjectSecId,
            plantilla: enviado && enviado.reportTemplateId,
            desde: enviado && enviado.interval && enviado.interval.from,
            hasta: enviado && enviado.interval && enviado.interval.to,
            error: err || ''
        });
    } catch (_) { /* noop */ }
}
// Lista de intentos de la ultima ejecucion (modelo, objeto, resultado). Es lo
// que copia el boton "ver detalle" y lo que deja claro que modelo acepta la
// plataforma y cual no.
function rxInfIntento(enviado, err, filas) {
    if (!RX_INF.intentos) RX_INF.intentos = [];
    if (RX_INF.intentos.length > 40) return;
    RX_INF.intentos.push({
        objeto: enviado && enviado.reportObjectId,
        secundario: enviado && enviado.reportObjectSecId,
        error: err || '',
        filas: (filas || []).length
    });
}
function rxInfLimpiarInforme() {
    // El informe ejecutado queda guardado en la sesion; sin liberarlo, la
    // siguiente ejecucion responde "code 4".
    try { return remoteCall('report/cleanup_result', {}).then(() => true).catch(() => false); } catch (_) { return false; }
}
// Traduce los codigos de error de la plataforma ("code 7"), que son cripticos.
function rxInfExplicaError(msg) {
    const m = String(msg || '');
    const code = (m.match(/code (\d+)/i) || [])[1];
    if (!code) return m;
    const c = String(code);
    const T = {
        '2': 'el servicio no existe en esta version de la plataforma (code 2)',
        '4': 'la peticion es demasiado pesada para el servidor (code 4): acorta el periodo',
        '5': 'la plataforma niega el acceso (code 5): la sesion no puede ejecutar ese informe',
        '7': 'parametros invalidos (code 7): la plantilla pide un filtro que no se le esta mandando',
        '8': 'objeto o recurso no encontrado (code 8): la plantilla puede haberse borrado',
        '10': 'sin acceso a los datos (code 10)',
        '1001': 'el objeto no existe para esta plantilla (code 1001)',
        '1002': 'la plantilla no admite ese objeto (code 1002)',
        '1003': 'ya hay un informe en marcha en esta sesion (code 1003): espera a que termine',
        '1004': 'la plataforma rechaza la ejecucion (code 1004): normalmente el intervalo trae demasiados mensajes o el objeto no vale para esa plantilla',
        '1005': 'la ejecucion supera el limite de tiempo de la plataforma (code 1005)'
    };
    return (T[c] || ('error de la plataforma (code ' + c + ')')) + ' \u2014 ' + m;
}
// ── Lectura de las filas tras exec_report ───────────────────────────────
// OJO: exec_report NO devuelve las filas. Devuelve reportResult con una lista
// de TABLAS (name, label, rows = numero de filas, header = columnas). El
// contenido se pide aparte con report/get_result_rows, que responde un array
// de filas { n, i1, i2, t1, t2, d, c:[ {t:texto, v:numero, y:lat, x:lon} ] }.
// Esto es lo que hacia que un informe lleno se viera como "sin filas".
async function rxInfFilasDeTabla(idx, total, token) {
    const filas = [];
    const tope = Math.min(Number(total) || 0, RX_INF_MAX_FILAS);
    const paso = 1000;
    for (let i = 0; i < tope; i += paso) {
        if (token && token.cancelado) break;
        const j = Math.min(tope, i + paso) - 1;
        let r;
        try { r = await remoteCall('report/get_result_rows', { tableIndex: idx, indexFrom: i, indexTo: j }); }
        catch (e) { return { filas: filas, error: (e && e.message) || String(e) }; }
        const arr = Array.isArray(r) ? r
            : ((r && Array.isArray(r.rows)) ? r.rows
                : ((r && r.reportResult && Array.isArray(r.reportResult.rows)) ? r.reportResult.rows : []));
        if (!arr.length) break;
        for (const o of arr) {
            if (!o) continue;
            const c = Array.isArray(o.c) ? o.c : [];
            filas.push(c.map((cel) => {
                if (cel == null) return '';
                if (cel.t != null) return cel.t;
                if (cel.v != null) return cel.v;
                if (cel.y != null && cel.x != null) return cel.y + ',' + cel.x;
                return '';
            }));
        }
        if (arr.length < (j - i + 1)) break;
    }
    return { filas: filas, error: '' };
}
// Coge las filas del resultado ya ejecutado: busca en reportResult.tables la
// tabla con mas filas, lee su cabecera y baja el contenido por paginas.
async function rxInfLeeResultado(r, token) {
    const rr = (r && r.reportResult) ? r.reportResult : r;
    const tablas = (rr && Array.isArray(rr.tables)) ? rr.tables : [];
    if (!tablas.length) return null;
    let mejor = -1, max = 0;
    tablas.forEach((t, i) => {
        const n = Number((t && t.rows) || 0);
        if (n > max) { max = n; mejor = i; }
    });
    if (mejor < 0 || !max) return null;
    const leidas = await rxInfFilasDeTabla(mejor, max, token);
    if (leidas.error) {
        // Si la plataforma no deja leer el contenido, se deja en la traza:
        // exec_report acepto el informe pero no se pudieron bajar las filas.
        rxInfLog('get_result_rows fallo (tabla ' + mejor + ', ' + max + ' filas)',
            (RX_INF.diag && RX_INF.diag.enviado) || {}, leidas.error);
        RX_INF.diag = Object.assign({}, RX_INF.diag, { filasError: leidas.error, tabla: mejor, tablaFilas: max });
        return null;
    }
    const cols = ((tablas[mejor] && tablas[mejor].header) || []).map((c) => String(c == null ? '' : c));
    RX_INF.diag = Object.assign({}, RX_INF.diag, { tabla: mejor, tablaFilas: max, tablaCols: cols.length });
    return { filas: leidas.filas, cols: cols };
}
// Una llamada a exec_report. La lectura es SINCRONA: el resultado viene en la
// propia respuesta. Si la plataforma esta ocupada (1003) o rechaza el trozo
// por pesado (1004), se limpia y se reintenta; si aun asi falla, y el trozo
// abarca mas de un dia, se PARTE por la mitad y se pegan las dos mitades. Asi
// un intervalo grande nunca tira el informe entero.
async function rxInfEjecuta(tpl, o, desde, hasta, token, prof, def) {
    if (token && token.cancelado) return { filas: [], error: 'cancelado' };
    const rid = (o && o.rid != null) ? o.rid : tpl.rid;
    const secId = (o && o.id != null) ? String(o.id) : '0';
    const d = def || (o && o.def) || null;
    const enviado = {
        reportResourceId: tpl.rid,
        reportTemplateId: d ? 0 : tpl.id,
        reportTemplate: d || null,
        reportObjectId: rid, reportObjectSecId: secId,
        interval: { from: desde, to: hasta, flags: 0 }
    };
    let err = '';
    for (let i = 0; i < 2; i++) {
        if (token && token.cancelado) return { filas: [], error: 'cancelado' };
        try {
            await rxInfLimpiarInforme();
            const r = await remoteCall('report/exec_report', enviado);
            RX_INF.diag = { enviado: enviado, error: '', ok: true, cuando: Date.now() };
            // Las filas se piden aparte (ver rxInfLeeResultado).
            const leido = await rxInfLeeResultado(r, token);
            if (leido) {
                rxInfIntento(enviado, '', leido.filas);
                if (!leido.filas.length) rxInfLog('ejecutado sin filas', enviado);
                return { filas: leido.filas, cols: leido.cols };
            }
            // Sin tablas: puede que la plataforma traiga las filas en linea.
            const n = rxInfExtrae(r);
            rxInfIntento(enviado, '', n.filas);
            if (!n.filas.length) rxInfLog('ejecutado sin filas', enviado);
            return { filas: n.filas, cols: n.cols };
        } catch (e) {
            err = (e && e.message) || String(e);
            if (!/1003|1004|4/.test(err) || i === 1) break;
            await rxInfEspera(700 * (i + 1));
        }
    }
    rxInfLog('error', enviado, err);
    rxInfIntento(enviado, err, 0);
    RX_INF.diag = { enviado: enviado, error: err, ok: false, cuando: Date.now() };
    // Particion adaptativa: el trozo abarcaba de mas, se parte en dos.
    if (/1004/.test(err) && (hasta - desde) > 86400 && (prof || 0) < 4) {
        const medio = desde + Math.floor((hasta - desde) / 2);
        const a = await rxInfEjecuta(tpl, o, desde, medio, token, (prof || 0) + 1, d);
        if (token && token.cancelado) return { filas: (a.filas || []), cols: a.cols, error: 'cancelado' };
        const b = await rxInfEjecuta(tpl, o, medio + 1, hasta, token, (prof || 0) + 1, d);
        const filas = (a.filas || []).concat(b.filas || []);
        const errores = [a.error, b.error].filter(Boolean);
        return { filas: filas, cols: (a.cols && a.cols.length ? a.cols : b.cols), error: errores.length ? errores[0] : '' };
    }
    return { filas: [], error: err };
}
// Modelos de objeto que puede esperar la plantilla. La plataforma no siempre
// dice sobre que item se ejecuta, asi que se listan los candidatos y se prueba
// cual ACEPTA la plataforma (code 0). OJO: code 0 con cero filas es un modelo
// VALIDO sin datos; code 4/7 es un modelo invalido. No hay que confundirlos.
//   1) las geocercas marcadas (recurso dueño + id de zona)
//   2) el recurso de la plantilla sin secundario
//   3) los items guardados en los filtros de la plantilla (units)
//   4) una geocerca de la plataforma (para detectar el modelo por geocerca)
//   5) la primera unidad de la flota
// Definicion propia de la plantilla (reportTemplateId 0 + reportTemplate) con
// los filtros de unidad/objeto quitados. Es lo que hace el operador en la
// plataforma cuando el informe guardado viene atado a una unidad concreta que
// no tiene datos: la plantilla se ejecuta "para todo". Devuelve null si no se
// puede construir.
function rxInfDefSinUnidades(datos, tplId) {
    try {
        const lista = Array.isArray(datos) ? datos : (datos && Array.isArray(datos.items) ? datos.items : []);
        const t = lista.filter((x) => x && String(x.id) === String(tplId))[0] || lista[0];
        if (!t || !Array.isArray(t.tbl) || !t.tbl.length) return null;
        const def = JSON.parse(JSON.stringify(t));
        def.id = 0;
        def.tbl.forEach((tb) => {
            let p = {};
            try { p = JSON.parse(tb.p || '{}') || {}; } catch (_) { p = {}; }
            Object.keys(p).forEach((k) => {
                if (/^(units?|unidades|objects?|objetos|unit_groups?|groups?)$/i.test(k)) delete p[k];
            });
            tb.p = JSON.stringify(p);
        });
        return def;
    } catch (_) { return null; }
}
function rxInfCandidatos(tpl, info, datos) {
    const out = [];
    const visto = {};
    const meter = (rid, id, eco, esZona, def) => {
        if (rid == null) return;
        const k = String(rid) + '|' + String(id) + (def ? '|d' : '');
        if (visto[k]) return;
        visto[k] = 1;
        out.push({ rid: rid, id: String(id == null ? '0' : id), eco: eco || '', esZona: !!esZona, def: def || null });
    };
    const zs = rxInfZonasPlataforma();
    const mkZona = (z, def) => meter((z.rid != null ? z.rid : tpl.rid), z.id, z.eco + (def ? ' (sin filtro)' : ''), true, def);
    const marcadas = (RX_INF.zonas || []);
    let usar = zs;
    if (zs.length && marcadas.length) {
        const set = {};
        marcadas.forEach((z) => { set[norm(z)] = 1; });
        const f = zs.filter((o) => set[norm(o.eco)]);
        if (f.length) usar = f;
    }
    const prueba = usar.slice(0, marcadas.length ? 2 : 1);
    // 1) Las geocercas a ejecutar (marcadas o las primeras de la plataforma).
    prueba.forEach((z) => mkZona(z, null));
    // 2) El recurso de la plantilla sin secundario: el informe entero.
    meter(tpl.rid, '0', 'informe');
    // 3) Los items guardados en los filtros de la plantilla (lo normal:
    //    "units" con el id de una unidad).
    const items = [];
    (info && info.params ? info.params : []).forEach((p) => {
        if (!/unit|unidad|object|obj|group|grupo/i.test(String((p && p.k) || ''))) return;
        String(p && p.v != null ? p.v : '').split(/[,;\s]+/).forEach((v) => {
            if (/^\d+$/.test(v) && v !== '0' && items.indexOf(v) < 0) items.push(v);
        });
    });
    items.slice(0, 2).forEach((v) => meter(v, '0', 'plantilla units'));
    // 4) La primera unidad de la flota.
    const us = rxInfUnidades(0);
    if (us.length) meter(us[0].id, '0', us[0].eco);
    // 5) Item + geocerca: la unidad que pisa la zona.
    const unidadesPrueba = items.slice(0, 1).concat(us.length ? [us[0].id] : []);
    unidadesPrueba.slice(0, 2).forEach((uid) => prueba.forEach((z) => meter(uid, z.id, z.eco + ' + u' + uid)));
    // 6) La plantilla SIN sus filtros guardados (definicion propia). Es la
    //    carta que hace que un informe atado a una unidad sin datos vuelva a
    //    traer lo de todas.
    const def = rxInfDefSinUnidades(datos, tpl.id);
    if (def) {
        prueba.forEach((z) => mkZona(z, def));
        meter(tpl.rid, '0', 'informe (sin filtro)', false, def);
    }
    return out;
}
// Devuelve la lista de objetos con la que ejecutar el informe. Prueba los
// candidatos con una ventana corta y se queda con el MODELO que trae filas
// (y, si ninguno trae, con el primero ACEPTADO por la plataforma: code 0 con
// cero filas es valido; code 4/7 es un modelo invalido).
async function rxInfModelo(tpl, info, datos, desde, hasta, token) {
    const cands = rxInfCandidatos(tpl, info, datos);
    const h = hasta, d = Math.max(desde, hasta - (RX_INF_DIAS_TROZO * 86400));
    let primeroOk = null, conFilas = null;
    for (const c of cands) {
        if (token && token.cancelado) break;
        const r = await rxInfEjecuta(tpl, c, d, h, token, 0, c.def);
        const n = (r.filas || []).length;
        rxInfLog('modelo ' + (c.eco || (c.rid + '/' + c.id)) + ' -> ' +
            (r.error ? rxInfExplicaError(r.error) : (n + ' fila(s)')),
            { reportObjectId: c.rid, reportObjectSecId: c.id, reportTemplateId: c.def ? 0 : tpl.id }, r.error || '');
        if (!r.error) {
            if (!primeroOk) primeroOk = c;
            if (n && !conFilas) conFilas = c;
        }
    }
    const elegido = conFilas || primeroOk || cands[0];
    if (!elegido) return [{ rid: tpl.rid, id: '0', eco: '' }];
    // Modelo por geocerca: se ejecuta por TODAS las geocercas a usar.
    if (elegido.esZona) {
        let zs = rxInfZonasPlataforma();
        const marcadas = (RX_INF.zonas || []);
        if (marcadas.length) {
            const set = {};
            marcadas.forEach((z) => { set[norm(z)] = 1; });
            const f = zs.filter((o) => set[norm(o.eco)]);
            if (f.length) zs = f;
        }
        if (zs.length > RX_INF_MAX_OBJETOS) zs = zs.slice(0, RX_INF_MAX_OBJETOS);
        if (!zs.length) zs = [elegido];
        zs.forEach((z) => { z.def = elegido.def || null; });
        rxInfLog('modelo por geocerca: ' + zs.length + ' geocerca(s)', { reportObjectId: tpl.rid, reportObjectSecId: 'varias' }, '');
        return zs;
    }
    if (elegido.def) elegido.eco = (elegido.eco || 'informe') + ' (sin filtro)';
    rxInfLog('modelo por item: ' + (elegido.eco || (elegido.rid + '/' + elegido.id)),
        { reportObjectId: elegido.rid, reportObjectSecId: elegido.id }, '');
    return [elegido];
}
// ── Ejecucion por trozos ────────────────────────────────────────────────
// Ejecuta la plantilla por objeto y por trozos de periodo, y pega los
// resultados. Objeto x trozo, de uno en uno y cacheado: ninguna peticion crece
// (de ahi que ninguna reviente con el limite de tiempo) y repetir el informe
// no vuelve a preguntar lo mismo.
//   onProg(hechos, total, filas, eco)
async function rxInfCorre(tpl, desde, hasta, unidades, onProg, token) {
    const t0 = Date.now();
    RX_INF.intentos = [];
    rxInfCacheCargar();
    const trozos = rxGeoInfTrozos(desde, hasta, RX_INF_DIAS_TROZO * 86400).slice(0, RX_INF_MAX_TROZOS);
    let objs, modo, recortado = false;
    if (unidades && unidades.length) {
        objs = unidades.map((u) => ({ id: String(u.id), eco: u.eco, rid: (u.rid != null ? u.rid : tpl.rid) }));
        modo = 'seleccion';
    } else {
        const datos = await rxInfDatosPlantilla(tpl);
        const info = rxInfPlantillaInfo(datos, tpl.id);
        const esGeo = info ? info.esGeo : (rxInfPista(tpl) === 'geocercas');
        if (esGeo) {
            objs = await rxInfModelo(tpl, info, datos, desde, hasta, token);
            modo = 'geocercas';
        } else {
            objs = rxInfUnidades(desde).map((u) => ({ id: u.id, eco: u.eco, rid: tpl.rid }));
            if (!objs.length) objs = [{ id: '0', eco: '', rid: tpl.rid }];
            modo = 'flota';
        }
    }
    const trabajos = [];
    for (const o of objs) {
        for (const t of trozos) trabajos.push({ obj: o, desde: t[0], hasta: t[1] });
    }
    const total = trabajos.length;
    const filas = [];
    const errores = [];
    let cols = [];
    let hechos = 0, fallos = 0, cacheados = 0, lleno = false, idx = 0;
    let bloqueado = false;   // la plataforma rechaza en bloque
    // Si la plataforma rechaza el mismo error varios trozos seguidos, no se
    // sigue arrastrando el mismo fallo 40 veces: se para y se explica.
    let seguidos = 0, ultimoErr = '';
    const MAX_SEGUIDOS = 3;
    const obrero = async () => {
        while (true) {
            if (lleno || (token && token.cancelado)) return;
            const w = trabajos[idx++];
            if (!w) return;
            const k = rxInfCacheKey(tpl, w.obj, w.desde, w.hasta);
            const enCache = _rxInfCache[k];
            if (enCache) {
                cacheados++;
                if (enCache.c) cols = enCache.c;
                for (const f of enCache.f) filas.push(f);
            } else {
                const r = await rxInfEjecuta(tpl, w.obj, w.desde, w.hasta, token, 0, w.obj.def);
                if (r.error && r.error !== 'cancelado') {
                    fallos++;
                    if (errores.length < 5) errores.push((w.obj.eco ? (w.obj.eco + ': ') : '') + rxInfExplicaError(r.error));
                    if (r.error === ultimoErr) seguidos++; else { seguidos = 1; ultimoErr = r.error; }
                    if (seguidos >= MAX_SEGUIDOS) { bloqueado = true; return; }
                } else {
                    seguidos = 0;
                    if (r.cols && r.cols.length && !cols.length) cols = r.cols;
                    const n = r.filas || [];
                    for (const f of n) filas.push(f);
                    if (filas.length < RX_INF_MAX_FILAS) rxInfCachePoner(k, { c: cols, f: n });
                    else lleno = true;
                }
            }
            hechos++;
            if (filas.length > RX_INF_MAX_FILAS) lleno = true;
            if (onProg) onProg(hechos, total, filas.length, w.obj.eco);
            await (typeof rxGeoInfYield === 'function' ? rxGeoInfYield() : new Promise((x) => setTimeout(x, 0)));
        }
    };
    const n = Math.max(1, Math.min(RX_INF_CONC, total || 1));
    const tareas = [];
    for (let i = 0; i < n; i++) tareas.push(obrero());
    await Promise.all(tareas);
    rxInfCacheGuardar(true);
    return {
        cols: cols, filas: filas, trozos: trozos.length, hechos: hechos,
        objetos: objs.length, asked: total, alcance: modo, recortado: recortado,
        fallos: fallos, errores: errores, cacheados: cacheados, lleno: lleno,
        bloqueado: bloqueado,
        cancelado: !!(token && token.cancelado), ms: Date.now() - t0
    };
}
// ── Filtro por geocerca sobre las filas ─────────────────────────────────
// Geocerca de una fila: la columna que se dedujo o, si no la hay, cualquier
// celda cuyo texto coincide con una geocerca conocida.
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
// Geocercas ofrecidas para filtrar: primero las que aparecen en los
// resultados, despues las de la plataforma (las de Rondo no valen: no existen
// alli). Se filtran por texto, asi que nunca se pintan cientos de golpe.
function rxInfZonasDisponibles() {
    const out = [], vistas = {};
    const meter = (nm) => { if (nm && !vistas[norm(nm)]) { vistas[norm(nm)] = 1; out.push(nm); } };
    try {
        const cl = rxInfClasifica(RX_INF.cols || [], (RX_INF.filas || []).slice(0, 40));
        if (cl.iZona >= 0) {
            const vistos = {};
            for (const f of (RX_INF.filas || []).slice(0, 200)) {
                const v = String(f[cl.iZona] == null ? '' : f[cl.iZona]).trim();
                if (v && !vistos[v]) { vistos[v] = 1; meter(v); }
                if (out.length >= 20) break;
            }
        }
    } catch (_) { /* noop */ }
    const q = norm(RX_INF.zonaBusca || '');
    for (const z of (APP.zonas || [])) {
        const nm = rxGeoInfNombre(z);
        if (!nm) continue;
        let org = null;
        try { org = (typeof glocOrigen === 'function') ? glocOrigen(z) : null; } catch (_) { org = null; }
        if (org && org.id === 'app') continue;
        if (q && norm(nm).indexOf(q) < 0) continue;
        meter(nm);
        if (out.length >= 60) break;
    }
    return out;
}
// Columnas que la plantilla trae pero sin datos: normalmente es que le falta
// un filtro, y avisa de que el informe sale incompleto.
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
// alguna de la plataforma (entonces se dibuja su contorno).
function rxInfCoords(cols) {
    const n = (cols || []).map(rxInfNombreCol);
    let iLat = -1, iLon = -1;
    n.forEach((c, i) => {
        if (iLat < 0 && /^(LAT|LATITUD|LATITUDE|LATIT)$/.test(c)) iLat = i;
        else if (iLon < 0 && /^(LON|LONG|LONGITUD|LONGITUDE|LNG)$/.test(c)) iLon = i;
    });
    return { iLat: iLat, iLon: iLon };
}
function rxInfZonaDeNombre(nombre) {
    const n = norm(nombre || '');
    if (!n) return null;
    for (const z of (APP.zonas || [])) {
        const nm = rxGeoInfNombre(z);
        if (nm && norm(nm) === n) return z;
    }
    return null;
}
// Datos para pintar: contornos de las geocercas que salen y puntos de las
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
// ── Orden, salidas y vista ──────────────────────────────────────────────
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
// Un informe a la vez: la lectura y la ejecucion comparten hueco.
function rxInfIsBusy() { return !!RX_INF._buscando; }
function setRXInfBusy(v) { RX_INF._buscando = !!v; }
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
// Documento imprimible: cabecera, KPIs, tabla y minimapa. Reusa el maquetado
// del informe general para que el PDF salga igual de bonito.
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
// Datos ya calculados: todo lo que se pinta sale de aqui, y las salidas usan
// EXACTAMENTE lo mismo (mismo subconjunto de filas).
function rxInfVista() {
    const tipos = rxInfCols(RX_INF.cols);
    let cols = RX_INF.cols || [];
    let filas = RX_INF.filas || [];
    // Columna de geocerca y de unidad: por nombre de columna.
    const cl = rxInfClasifica(cols, filas.slice(0, 40));
    const iZona = cl.iZona;
    const iUni = (cl.iUni >= 0) ? cl.iUni : tipos.iUni;
    let pre = filas;
    // Filtro por geocerca. Solo si hay columna de geocerca; cuando las
    // geocercas se marcaron, la ejecucion ya se limito a ellas y filtrar por
    // nombre podria borrar filas legitimas.
    const setZ = {};
    if (RX_INF.zonas && RX_INF.zonas.length && iZona >= 0) {
        RX_INF.zonas.forEach((z) => { setZ[norm(z)] = 1; });
        pre = pre.filter((f) => setZ[norm(rxInfZonaDeFila(f, iZona))]);
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
        pre = r.filas;
    }
    const total = pre.length;
    pre = rxInfFiltra(pre, RX_INF.q, 8);
    pre = rxInfOrdena(pre, RX_INF.orden, cols);
    const unidades = {};
    if (iUni >= 0) pre.forEach((f) => { unidades[String(f[iUni] == null ? '' : f[iUni])] = 1; });
    const zonas = {};
    if (iZona >= 0) pre.forEach((f) => { zonas[String(f[iZona] == null ? '' : f[iZona])] = 1; });
    return {
        cols: cols, filas: pre, total: total, tipos: tipos,
        iZona: iZona, iUni: iUni,
        unidades: Object.keys(unidades).length, zonas: Object.keys(zonas).length,
        meta: RX_INF.meta || { filas: 0, unidades: 0, trozos: 0, objetos: 0, ms: 0, fallos: 0 }
    };
}
// Linea de resumen del informe (la que va en el PDF y bajo los KPIs).
function rxInfResumenLinea(v) {
    const m = v.meta;
    const rango = (RX_INF.desde || '') + ' \u2192 ' + (RX_INF.hasta || '');
    return (RX_INF.tpl ? RX_INF.tpl.nombre : 'Sin plantilla') + ' \u00b7 ' + rango + ' \u00b7 ' +
        v.total + ' fila(s)' +
        (v.iUni >= 0 ? ', ' + v.unidades + ' unidad(es)' : '') +
        (v.iZona >= 0 ? ', ' + v.zonas + ' geocerca(s)' : '') + ' \u00b7 ' +
        m.trozos + ' trozos \u00b7 ' + Math.round(m.ms / 1000) + ' s' +
        (m.cacheados ? ' \u00b7 ' + m.cacheados + ' ya estaban en cache' : '') +
        (m.fallos ? ' \u00b7 ' + m.fallos + ' trozo(s) con error' : '');
}
// Tabla de la vista previa: celdas escapadas, numeros alineados y cabecera
// pulsable para ordenar (lo que se ve es lo que se exporta).
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
/* ====================== INFORMES POR PLANTILLA: UI ====================== */
// Pantalla por pasos: 1) elegir plantilla  2) periodo  3) objetos/filtros
// 4) ejecutar y ver resultados con sus salidas. Todo lo que muestra el boton
// "Ejecutar" viene de la plataforma por report/exec_report; no se lee GPS.
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
    // El minimapa vive FUERA de la caja de datos: se actualiza sin repintar el
    // formulario y aparece/desaparece segun los datos.
    const html = '<div class="rgi-tool">' +
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
            // El progreso se pinta DENTRO del cuerpo (#rgi-prog): asi se ve
            // aunque el dialogo este desplazado.
            const setProg = (pc, t) => {
                RX_INF.prog = Object.assign({}, RX_INF.prog, { activo: true, pct: Math.max(0, Math.min(100, pc || 0)), txt: t || '' });
                const pin = byId('rgi-prog');
                if (!pin) return;
                const pt = pin.querySelector('#rgi-prog-t');
                const pb = pin.querySelector('#rgi-prog-b');
                if (pt && t) pt.textContent = t;
                if (pb) pb.style.width = RX_INF.prog.pct + '%';
                pin.style.display = 'flex';
            };
            const finProg = () => {
                RX_INF.prog = Object.assign({}, RX_INF.prog, { activo: false, pct: 0 });
                const pin = byId('rgi-prog');
                if (pin) pin.style.display = 'none';
            };
            let plantillas = [];
            let pintaN = 0;
            const unidadesSel = () => {
                const sel = APP.seleccion;
                if (!sel || !sel.size) return [];
                const out = [];
                for (const u of (APP.unidades || [])) {
                    let info = null;
                    try { info = parseUnitName(u); } catch (_) { continue; }
                    if (!info || u.id == null) continue;
                    const clave = info.eco || info.placa || String(info.id);
                    if (sel.has(clave) || sel.has(info.eco) || sel.has(String(info.id))) out.push({ id: u.id, eco: info.eco || clave, rid: RX_INF.tpl ? RX_INF.tpl.rid : null });
                }
                return out;
            };
            const listaTpl = () => {
                const q = norm(RX_INF.busca || '');
                return q ? plantillas.filter((t) => norm(t.nombre).indexOf(q) >= 0) : plantillas;
            };
            // Rango elegido en segundos (el que espera exec_report).
            const rangoS = () => {
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
            const leeFechas = () => {
                const dEl = byId('rgi-desde'), hEl = byId('rgi-hasta');
                if (dEl) RX_INF.desde = dEl.value || '';
                if (hEl) RX_INF.hasta = hEl.value || '';
                if (RX_INF.desde && RX_INF.hasta && RX_INF.desde > RX_INF.hasta) {
                    const t = RX_INF.desde; RX_INF.desde = RX_INF.hasta; RX_INF.hasta = t;
                }
            };
            // Paso numerado: cabecera + contenido.
            const paso = (n, tit, cont) => '<div class="rgi-cfg"><div class="rgi-paso-c"><i>' + n + '</i><b>' +
                esc(tit) + '</b></div>' + cont + '</div>';
            // Panel "que trae la plantilla": tipo, columnas y filtros guardados.
            const panelDecl = () => {
                const d = RX_INF.decl;
                if (!RX_INF.tpl) return '';
                const pista = rxInfPista(RX_INF.tpl);
                const ETQ = { geocercas: 'Geocercas', vehiculos: 'Veh\u00edculos', mixto: 'Veh\u00edculos y geocercas', otro: 'Datos generales' };
                const cl = d ? rxInfClasifica(d.columnas || [], []) : null;
                // El tipo que DECLARA la plantilla manda sobre lo que se deduzca
                // de los nombres de columna.
                const titulo = (d && d.esGeo) ? 'Geocercas'
                    : (d && d.esUnidad) ? 'Veh\u00edculos'
                        : (cl ? (ETQ[cl.tipo] || 'Datos de la plantilla')
                            : (pista === 'geocercas' ? 'Geocercas (por el nombre)' : 'Datos de la plantilla'));
                const chips = (d && d.columnas && d.columnas.length)
                    ? '<div class="rgi-campos"><span class="rgi-campo t-texto">Lo que trae la plantilla</span>' +
                      d.columnas.slice(0, 18).map((c) => '<span class="rgi-campo">' + esc(c) + '</span>').join('') +
                      (d.columnas.length > 18 ? '<span class="rgi-campo">+' + (d.columnas.length - 18) + '</span>' : '') + '</div>'
                    : '';
                const filtros = (d && d.params && d.params.length)
                    ? '<div class="rgi-campos"><span class="rgi-campo t-numero">Filtros guardados</span>' +
                      d.params.map((x) => '<span class="rgi-campo">' + esc(x.k) + ': ' + esc(x.v) + '</span>').join('') + '</div>'
                    : '';
                return '<div class="rgi-sonda"><div class="rgi-sonda-t"><b>' + esc(titulo) + '</b>' +
                    (d && d.columnas ? '<span>' + d.columnas.length + ' campo(s)</span>' : '<span>leyendo\u2026</span>') +
                    '</div>' + chips + filtros + '</div>';
            };
            const cuerpo = () => {
                const v = rxInfVista();
                const tpl = RX_INF.tpl;
                const lista = listaTpl();
                const nUn = unidadesSel().length;
                const busy = !!RX_INF._buscando;
                const dis = busy ? ' disabled' : '';
                const hay = (RX_INF.cols || []).length > 0;
                const hero = '<div class="rgi-hero"><span class="rgi-heroico rondo-usym">' + UIS.export + '</span>' +
                    '<div class="rgi-herot"><b>' + esc(tpl ? tpl.nombre : 'Informes de la plataforma') + '</b>' +
                    '<span>' + esc(tpl
                        ? 'Ejecutada por report/exec_report, en trozos de ' + RX_INF_DIAS_TROZO + ' d\u00edas para no chocar con el l\u00edmite de tiempo'
                        : 'Elige una plantilla de las que ya tienes en AE-Track') + '</span></div>' +
                    (tpl ? '<i class="rgi-ori">API</i>' : '') + '</div>';
                // Paso 1: plantilla.
                const listaHtml = '<div class="rgi-tpls" id="rgi-lista">' + (plantillas.length
                    ? lista.map((t) => '<div class="rgi-tpl' + (rxInfClave(t) === rxInfClave(tpl) ? ' activo' : '') + '">' +
                        '<button type="button" class="rgi-tpl-sel" data-tpl="' + esc(rxInfClave(t)) + '"' + dis + '>' +
                        '<b>' + esc(t.nombre) + '</b><i>#' + esc(t.id) + '</i></button>' +
                        '<button type="button" class="rgi-tpl-run" data-tplrun="' + esc(rxInfClave(t)) + '" title="Ejecutar esta plantilla"' + dis + '>' +
                        '<span class="rondo-usym">' + UIS.play + '</span></button>' +
                        '</div>').join('')
                    : '<p class="rgi-more">' + (plantillas.length === 0 && !RX_INF._cargadas
                        ? 'Se est\u00e1n leyendo las plantillas de la plataforma\u2026'
                        : 'Sin plantillas con ese nombre.') + '</p>') + '</div>';
                const paso1 = paso(1, 'Plantilla', '<div class="rgi-row"><span class="rgi-lb">Buscar</span>' +
                    '<span class="rgi-busca"><span class="rondo-usym">' + UIS.filter + '</span>' +
                    '<input type="text" id="rgi-buscar" class="filtro" placeholder="Buscar plantilla\u2026" value="' + esc(RX_INF.busca || '') + '"' + dis + '>' +
                    '<i id="rgi-busca-n">' + lista.length + '/' + plantillas.length + '</i></span>' +
                    '<button type="button" class="mini" id="rgi-tpl-cargar"' + dis + '>' +
                    '<span class="rondo-usym">' + UIS.refresh + '</span> Leer plantillas</button></div>' +
                    listaHtml + panelDecl());
                // Paso 2: periodo.
                const chip = (act, val, txt, titulo) => '<button type="button" class="rgi-chip' + (act ? ' activo' : '') +
                    '" data-i="rango" data-v="' + esc(val) + '"' + (titulo ? ' title="' + esc(titulo) + '"' : '') + dis + '>' + esc(txt) + '</button>';
                const paso2 = paso(2, 'Periodo', '<div class="rgi-row"><span class="rgi-lb">Rango</span><div class="rgi-chips">' +
                    chip(RX_INF.rango === 'hoy' && !RX_INF.desde, 'hoy', 'Hoy') +
                    chip(RX_INF.rango === '7d' && !RX_INF.desde, '7d', '7 d\u00edas') +
                    chip(RX_INF.rango === '30d' && !RX_INF.desde, '30d', '30 d\u00edas') +
                    chip(RX_INF.rango === '90d' && !RX_INF.desde, '90d', '90 d\u00edas') +
                    chip(RX_INF.rango === 'mes' && !RX_INF.desde, 'mes', 'Mes actual') +
                    chip(RX_INF.rango === 'mes-1' && !RX_INF.desde, 'mes-1', 'Mes anterior') +
                    chip(RX_INF.rango === 'ano' && !RX_INF.desde, 'ano', 'Este a\u00f1o') +
                    chip(RX_INF.rango === 'ano-1' && !RX_INF.desde, 'ano-1', 'A\u00f1o anterior') +
                    chip(RX_INF.rango === 'todo' && !RX_INF.desde, 'todo', 'Todo') +
                    '</div></div>' +
                    '<div class="rgi-row"><span class="rgi-lb">Fechas</span><span class="rgi-rango">' +
                    '<input type="date" id="rgi-desde" class="filtro" title="Dia inicial (incluido)" value="' + esc(RX_INF.desde) + '"' + dis + '>' +
                    '<span class="sep">\u2192</span>' +
                    '<input type="date" id="rgi-hasta" class="filtro" title="Dia final (incluido)" value="' + esc(RX_INF.hasta) + '"' + dis + '>' +
                    ((RX_INF.desde || RX_INF.hasta) ? '<button type="button" class="mini" data-i="rango" data-v="hoy"' + dis + '>Quitar</button>' : '') +
                    '</span></div>');
                // Paso 3: objetos / filtros.
                const esGeo = rxInfEsDeGeocercas();
                let paso3;
                if (esGeo) {
                    const zs = rxInfZonasDisponibles();
                    const marcadas = (RX_INF.zonas || []).length;
                    paso3 = paso(3, 'Geocercas', '<div class="rgi-row"><span class="rgi-lb">Buscar</span>' +
                        '<span class="rgi-busca"><span class="rondo-usym">' + UIS.zone + '</span>' +
                        '<input type="text" id="rgi-zona-busca" class="filtro" placeholder="Buscar geocerca\u2026" value="' + esc(RX_INF.zonaBusca || '') + '"' + dis + '>' +
                        '<i id="rgi-zona-busca-n">' + (marcadas ? marcadas + ' marcada(s)' : zs.length + ' disponible(s)') + '</i></span>' +
                        (zs.length ? '<button type="button" class="mini" id="rgi-geos-todas"' + dis + '>todas</button>' +
                            '<button type="button" class="mini" id="rgi-geos-ninguna"' + dis + '>ninguna</button>' : '') + '</div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><div class="rgi-chips rgi-zonas" id="rgi-zonas">' +
                        zs.map((z) => '<button type="button" class="rgi-chip' + (RX_INF.zonas.indexOf(z) >= 0 ? ' activo' : '') +
                            '" data-zona="' + esc(z) + '"' + dis + '>' + esc(z) + '</button>').join('') + '</div></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        esc(marcadas
                            ? ('Las filas se filtrar\u00e1n por las ' + marcadas + ' geocerca(s) marcada(s).')
                            : 'Sin marcar, salen todas las geocercas que traiga el informe.') +
                        '</span></div>');
                } else {
                    paso3 = paso(3, 'Alcance', '<div class="rgi-row"><span class="rgi-lb">Unidades</span><div class="rgi-chips">' +
                        '<button type="button" class="rgi-chip' + (RX_INF.alcance !== 'sel' ? ' activo' : '') + '" data-i="alcance" data-v="todas"' + dis + '>' +
                        'Toda la flota</button>' +
                        '<button type="button" class="rgi-chip' + (RX_INF.alcance === 'sel' ? ' activo' : '') + '" data-i="alcance" data-v="sel"' + dis +
                        (nUn ? ' title="Solo las ' + nUn + ' seleccionadas"' : ' title="Ning\u00fan unidad seleccionada"') + '>' +
                        'Solo seleccionadas (' + nUn + ')</button></div></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        esc('La plantilla se ejecuta unidad por unidad y por trozos; el resultado se une.') + '</span></div>');
                }
                // Avisos.
                const avisos = [];
                if (RX_INF.alcance === 'sel' && !nUn && !esGeo) avisos.push(esc('No hay unidades seleccionadas: usa "Toda la flota" o selecciona unidades en la lista.'));
                if (RX_INF.meta && RX_INF.meta.fallos) avisos.push(esc(RX_INF.meta.fallos + ' trozo(s) fallaron: ' + ((RX_INF.meta.errores || [])[0] || 'error desconocido')));
                if (RX_INF.meta && RX_INF.meta.recortado) avisos.push(esc('Se ejecutaron ' + RX_INF_MAX_OBJETOS + ' objetos como m\u00e1ximo. Marca en el paso 3 las geocercas que te interesen para ajustarlo.'));
                if (RX_INF.meta && RX_INF.meta.bloqueado) avisos.push(esc('La plataforma est\u00e1 rechazando la ejecuci\u00f3n (' + RX_INF.meta.fallos + ' trozos seguidos con el mismo error). Se ha parado.'));
                if (RX_INF.meta && RX_INF.meta.lleno) avisos.push(esc('Se alcanz\u00f3 el tope de ' + Math.round(RX_INF_MAX_FILAS / 1000) + 'k filas: acorta el periodo.'));
                if (hay) {
                    const vacias = rxInfColumnasVacias(v.cols, v.filas);
                    if (vacias.length && vacias.length < v.cols.length) {
                        avisos.push(esc('Columnas sin datos: ' + vacias.slice(0, 4).join(', ') +
                            '. Suele ser que a la plantilla le falta un filtro que solo puedes poner en la plataforma.'));
                    }
                }
                if (RX_INF.diag && RX_INF.diag.error) {
                    avisos.push('Ultimo intento: ' + esc(RX_INF.diag.enviado
                        ? ('plantilla ' + RX_INF.diag.enviado.reportTemplateId + ', objeto ' + RX_INF.diag.enviado.reportObjectId +
                            ', secundario "' + RX_INF.diag.enviado.reportObjectSecId + '"')
                        : 'sin datos') + ' \u00b7 ' +
                        '<button type="button" class="mini" id="rgi-diag">ver detalle</button>');
                }
                // Se ejecuto y no llego nada: no es un fallo de red, es que la
                // plataforma no tiene filas para ese objeto/periodo. Se dice
                // con que objeto se probo, que es el dato que hace falta.
                if (!hay && RX_INF.meta && RX_INF.diag && RX_INF.diag.enviado && !RX_INF.diag.error) {
                    avisos.push(esc('La plataforma ejecut\u00f3 la plantilla pero no devolvi\u00f3 filas (objeto ' +
                        RX_INF.diag.enviado.reportObjectId + ', secundario "' + RX_INF.diag.enviado.reportObjectSecId +
                        '"). Prueba otro periodo u otra geocerca.'));
                }
                // Los modelos que se probaron y que contesto la plataforma a
                // cada uno: sin esto, un informe vacio no se puede diagnosticar.
                if (!hay && RX_INF.intentos && RX_INF.intentos.length) {
                    const vista = {};
                    const lista = [];
                    RX_INF.intentos.forEach((it) => {
                        const k = it.objeto + '/' + it.secundario;
                        if (vista[k]) return;
                        vista[k] = 1;
                        const cod = (String(it.error || '').match(/code \d+/) || [])[0];
                        lista.push(k + ' \u2192 ' + (it.error ? (cod || 'error') : (it.filas + ' fila(s)')));
                    });
                    avisos.push('Modelos probados: ' + esc(lista.slice(0, 10).join(' \u00b7 ')));
                }
                // Boton generar / cancelar.
                const r = rangoS();
                const nTrozos = Math.min(RX_INF_MAX_TROZOS, rxGeoInfTrozos(r.desde, r.hasta, RX_INF_DIAS_TROZO * 86400).length);
                const ejecutar = busy
                    ? '<button type="button" class="rgi-btn gen busy" id="rgi-cancel">' +
                      '<span class="rondo-usym">' + UIS.close + '</span><b>Cancelar</b><i>conserva lo ya calculado</i></button>'
                    : '<button type="button" class="rgi-btn gen' + (tpl ? ' pulsa' : '') + '" id="rgi-ejecutar"' + (tpl ? '' : ' disabled') + '>' +
                      '<span class="rondo-usym">' + UIS.play + '</span><b>' + (hay ? 'Volver a ejecutar' : 'Ejecutar informe') + '</b>' +
                      '<i>' + nTrozos + ' trozos de ' + RX_INF_DIAS_TROZO + ' d\u00edas</i></button>';
                const barraEjec = '<div class="rgi-generar">' + ejecutar +
                    '<span class="rgi-gen-hint">' + esc(tpl
                        ? (busy ? 'Calculando\u2026 puedes cancelar cuando quieras.' : 'La plataforma calcula cada trozo; el resultado se guarda en este navegador.')
                        : 'Selecciona una plantilla para empezar.') + '</span></div>';
                // Progreso dentro del cuerpo.
                const prog = RX_INF.prog && RX_INF.prog.activo
                    ? '<div class="rgi-carga" id="rgi-prog" style="display:flex">' +
                      '<span id="rgi-prog-t">' + esc(RX_INF.prog.txt || 'Calculando\u2026') + '</span>' +
                      '<span class="rgi-barra"><i id="rgi-prog-b" style="width:' +
                        Math.max(2, RX_INF.prog.pct || 0) + '%"></i></span></div>'
                    : '';
                // Resultados.
                const barraVista = hay ? paso(4, 'Resultados', '<div class="rgi-row"><span class="rgi-lb">Ver</span><div class="rgi-chips">' +
                    '<button type="button" class="rgi-chip' + (RX_INF.vista !== 'unidad' ? ' activo' : '') + '" data-i="vista" data-v="filas"' + dis + '>Filas</button>' +
                    '<button type="button" class="rgi-chip' + (RX_INF.vista === 'unidad' ? ' activo' : '') + '" data-i="vista" data-v="unidad"' + dis + '>Resumen por unidad</button>' +
                    '</div><span class="rgi-busca" style="margin-left:auto"><span class="rondo-usym">' + UIS.filter + '</span>' +
                    '<input type="text" id="rgi-q" class="filtro" placeholder="Filtrar filas\u2026" value="' + esc(RX_INF.q || '') + '"' + dis + '></span></div>' +
                    (v.iUni >= 0 ? '<div class="rgi-row"><span class="rgi-lb">Unidad</span><span class="rgi-busca">' +
                        '<span class="rondo-usym">' + UIS.filter + '</span>' +
                        '<input type="text" id="rgi-eco" class="filtro" placeholder="Filtrar por unidad\u2026" value="' + esc(RX_INF.eco || '') + '"' + dis + '></span></div>' : '')) : '';
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
                    : '<p class="rgi-more">Sin resultados todav\u00eda. Elige plantilla y p\u00e9riodo y pulsa "Ejecutar informe".</p>';
                const resumen = hay ? '<p class="rgi-res">' + esc(rxInfResumenLinea(v)) + '</p>' : '';
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
                return '<div class="rgi">' + hero + paso1 + prog +
                    ((avisos.length) ? '<div class="rgi-aviso">' + avisos.join(' ') + '</div>' : '') +
                    paso2 + paso3 + barraEjec +
                    (hay ? barraVista + '<div id="rgi-dyn">' + kpis + resumen + tabla + '</div>' + salidas : '<div id="rgi-dyn">' + tabla + '</div>') +
                    '</div>';
            };
            const pinta = () => {
                const mio = ++pintaN;
                if (mio !== pintaN) return;
                const v = rxInfVista();
                setHtml(box, cuerpo());
                try { rxInfPintaMapa(v); } catch (_) { /* sin mapa */ }
            };
            const pintaResultados = () => {
                const dyn = byId('rgi-dyn');
                if (!dyn) return;
                const v = rxInfVista();
                dyn.innerHTML = '<div class="rgi-kpis">' +
                    '<div class="rgi-kpi ok"><b>' + v.total + '</b><span>Filas</span></div>' +
                    (v.iUni >= 0 ? '<div class="rgi-kpi"><b>' + v.unidades + '</b><span>Unidades</span></div>' : '') +
                    (v.iZona >= 0 ? '<div class="rgi-kpi"><b>' + v.zonas + '</b><span>Geocercas</span></div>' : '') +
                    '</div><p class="rgi-res">' + esc(rxInfResumenLinea(v)) + '</p>' +
                    '<div class="rgi-prev">' + rxInfTablaHTML(v.cols, v.filas, 60) + '</div>';
                try { rxInfPintaMapa(v); } catch (_) { /* noop */ }
            };
            const cargarTpl = async () => {
                RX_INF._buscando = true;
                pinta();
                let ok = true;
                try { plantillas = await rxInfPlantillas(); } catch (_) { plantillas = []; ok = false; }
                RX_INF._cargadas = true;
                if (!RX_INF.tpl && plantillas.length) RX_INF.tpl = plantillas[0];
                RX_INF._buscando = false;
                pinta();
                if (plantillas.length && !ok) adviceWarn('Sin plantillas', 'No se pudieron leer las plantillas de la plataforma.');
                if (RX_INF.tpl) declara();
            };
            // Lee lo que declara la plantilla (columnas, tipo, filtros).
            const declara = async () => {
                if (!RX_INF.tpl) return;
                const t = RX_INF.tpl;
                const key = 'decl|' + rxInfClave(t);
                if (RX_INF._declKey === key) return;
                RX_INF.decl = null;
                let info = null;
                try { info = rxInfPlantillaInfo(await rxInfDatosPlantilla(t), t.id); } catch (_) { info = null; }
                if (RX_INF.tpl && rxInfClave(RX_INF.tpl) !== rxInfClave(t)) return;
                RX_INF.decl = info;
                RX_INF._declKey = key;
                pinta();
            };
            const ejecutar = async () => {
                leeFechas();
                if (!RX_INF.tpl) { adviceWarn('Sin plantilla', 'Elige una plantilla del informe.'); return; }
                if (RX_INF._buscando) return;
                const r = rangoS();
                if (!(r.hasta > r.desde)) { adviceWarn('Rango inv\u00e1lido', 'El fin debe ser posterior al inicio.'); return; }
                const esGeo = rxInfEsDeGeocercas();
                const sel = (!esGeo && RX_INF.alcance === 'sel') ? unidadesSel() : null;
                if (!esGeo && RX_INF.alcance === 'sel' && (!sel || !sel.length)) {
                    adviceWarn('Sin unidades', 'Selecciona unidades en la lista o elige "Toda la flota".');
                    return;
                }
                RX_INF._buscando = true;
                RX_INF._token = { cancelado: false };
                RX_INF.prog = { activo: true, hechas: 0, total: 0, filas: 0, txt: 'Preparando\u2026', pct: 4 };
                pinta();
                setProg(4, 'Preparando\u2026');
                let res;
                try {
                    res = await rxInfCorre(RX_INF.tpl, r.desde, r.hasta, sel, (h, t, filas, eco) => {
                        RX_INF.prog = { activo: true, hechas: h, total: t, filas: filas, txt: '', pct: 6 + Math.round((h / Math.max(1, t)) * 90) };
                        setProg(RX_INF.prog.pct,
                            (RX_INF.tpl ? RX_INF.tpl.nombre + ' \u00b7 ' : '') + h + '/' + t +
                            (eco ? ' \u00b7 ' + eco : '') + (filas ? ' \u00b7 ' + filas + ' fila(s)' : ''));
                        const dyn = byId('rgi-dyn');
                        if (dyn) { const p = dyn.querySelector('.rgi-kpi b'); if (p) p.textContent = String(filas); }
                    }, RX_INF._token);
                } catch (e) {
                    res = { cols: RX_INF.cols, filas: RX_INF.filas, trozos: 0, hechos: 0, objetos: 0, fallos: 1, errores: [(e && e.message) || e], cacheados: 0, ms: 0, cancelado: false };
                }
                RX_INF._buscando = false;
                finProg();
                RX_INF.cols = res.cols || [];
                RX_INF.filas = res.filas || [];
                const v = rxInfVista();
                RX_INF.meta = {
                    filas: RX_INF.filas.length, unidades: v.unidades, trozos: res.trozos, objetos: res.objetos,
                    ms: res.ms, fallos: res.fallos, errores: res.errores, cacheados: res.cacheados,
                    lleno: res.lleno, bloqueado: res.bloqueado, recortado: res.recortado
                };
                pinta();
                if (res.cancelado) advice('Informe cancelado', RX_INF.filas.length + ' fila(s) hasta donde lleg\u00f3 (quedan guardadas).');
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
                    if (btn.id === 'rgi-diag') {
                        const det = { ultimo: RX_INF.diag, intentos: RX_INF.intentos || [] };
                        try { await navigator.clipboard.writeText(JSON.stringify(det, null, 1)); } catch (_) { /* noop */ }
                        console.log('[Rondo] intentos de informe', det);
                        advice('Detalle copiado', 'Tambi\u00e9n est\u00e1 en la consola del navegador.');
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
                            ' \u00b7 ' + (RX_INF.vista === 'unidad' ? 'resumen por unidad' : 'filas');
                        if (btn.id === 'rgi-pdf') {
                            rxImprimirHTML(rxInfHTML({
                                titulo: titulo, subtitulo: sub, cols: v.cols, filas: v.filas,
                                mapa: rxInfMapaHTML(v, 660, 240),
                                meta: Object.assign({}, v.meta, { unidades: v.unidades }),
                                resumen: rxInfResumenLinea(v)
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
                        const L = ['# ' + titulo, '', '- ' + sub, '- ' + rxInfResumenLinea(v), '',
                            '| ' + v.cols.slice(0, 14).join(' | ') + ' |',
                            '| ' + v.cols.slice(0, 14).map(() => '---').join(' | ') + ' |'];
                        for (const f of v.filas.slice(0, 500)) {
                            L.push('| ' + v.cols.slice(0, 14).map((c, i) => String(f[i] == null ? '-' : f[i]).replace(/\|/g, '/')).join(' | ') + ' |');
                        }
                        const txt = L.join('\n');
                        if (typeof rxReplayDescargar === 'function') rxReplayDescargar(rxInfNombreArchivo(RX_INF.tpl, RX_INF.vista, '.md'), txt, 'text/markdown;charset=utf-8;');
                        else rxInfDescarga(txt, rxInfNombreArchivo(RX_INF.tpl, RX_INF.vista, '.md'), 'text/markdown;charset=utf-8;');
                        adviceOk('Informe exportado', v.filas.length + ' fila(s)');
                        return;
                    }
                }
                // Ejecutar una plantilla concreta desde su tarjeta.
                const rb = ev.target.closest && ev.target.closest('[data-tplrun]');
                if (rb && box.contains(rb)) {
                    const t = rxInfTplDeClave(rb.dataset.tplrun);
                    if (t) { RX_INF.tpl = plantillas.filter((x) => rxInfClave(x) === rxInfClave(t))[0] || t; ejecutar(); }
                    return;
                }
                // Elegir plantilla: se lee lo que declara y se repinta.
                const tb = ev.target.closest && ev.target.closest('[data-tpl]');
                if (tb && box.contains(tb)) {
                    if (RX_INF._buscando) return;
                    const t = rxInfTplDeClave(tb.dataset.tpl);
                    if (t) {
                        RX_INF.tpl = plantillas.filter((x) => rxInfClave(x) === rxInfClave(t))[0] || t;
                        // Cambiar de plantilla invalida lo calculado y los
                        // filtros que dependian de sus columnas.
                        RX_INF.cols = []; RX_INF.filas = []; RX_INF.meta = null;
                        RX_INF.zonas = []; RX_INF.eco = ''; RX_INF.orden = null;
                        RX_INF.decl = null; RX_INF._declKey = '';
                    }
                    pinta();
                    if (t) declara();
                    return;
                }
                // Marcar geocercas (plantillas de geocercas).
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
                    RX_INF.zonas = rxInfZonasDisponibles();
                    pinta();
                    return;
                }
                if (ev.target.closest && ev.target.closest('#rgi-geos-ninguna')) {
                    if (RX_INF._buscando) return;
                    RX_INF.zonas = [];
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
                    // Solo se repinta la lista: el input no pierde el foco.
                    const cont = byId('rgi-lista');
                    if (cont) {
                        cont.innerHTML = listaTpl().map((x) => '<div class="rgi-tpl' +
                            (rxInfClave(x) === rxInfClave(RX_INF.tpl) ? ' activo' : '') + '">' +
                            '<button type="button" class="rgi-tpl-sel" data-tpl="' + esc(rxInfClave(x)) + '">' +
                            '<b>' + esc(x.nombre) + '</b><i>#' + esc(x.id) + '</i></button></div>').join('');
                    }
                    const n = byId('rgi-busca-n');
                    if (n) n.textContent = listaTpl().length + '/' + plantillas.length;
                    return;
                }
                if (t.id === 'rgi-zona-busca') {
                    RX_INF.zonaBusca = t.value || '';
                    const cont = byId('rgi-zonas');
                    if (cont) {
                        cont.innerHTML = rxInfZonasDisponibles().map((z) => '<button type="button" class="rgi-chip' +
                            (RX_INF.zonas.indexOf(z) >= 0 ? ' activo' : '') + '" data-zona="' + esc(z) + '">' + esc(z) + '</button>').join('');
                    }
                    const n = byId('rgi-zona-busca-n');
                    if (n) n.textContent = String(rxInfZonasDisponibles().length);
                    return;
                }
                if (t.id === 'rgi-eco') { RX_INF.eco = t.value || ''; pintaResultados(); return; }
                if (t.id === 'rgi-q') { RX_INF.q = t.value || ''; pintaResultados(); return; }
            });
            cargarTpl();
        }
    });
}
