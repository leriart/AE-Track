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
// Tope de tablas que se bajan de un resultado (la principal + consumo,
// resumenes, etc.). Evita traer tablas enormes que nadie va a mirar.
const RX_INF_MAX_TABLAS = 6;
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
    filtros: {},         // filtros de la plantilla elegidos a mano (units, geozones...)
    // V8.1: opciones del reporte extra "Perdida de combustible".
    fuel: {
        litros: 10,      // caida de nivel que ya cuenta como perdida
        min: 2,          // ventana (min) en la que se produce la caida
        vel: 3,          // km/h: por debajo, la unidad esta detenida
        motor: 'todos',  // 'todos' | 'on' (encendido) | 'off' (apagado)
        marca: '(SC)',   // solo unidades cuyo nombre contenga esta marca
        sensor: '',      // clave/nombre exacto del parametro de nivel (override)
        km: 20,          // km recorridos para juzgar un sensor (calibracion)
        l100: 1,         // consumo minimo esperado (L/100 km); 0 = no revisar
        // 'plataforma' usa la deteccion de descargas del informe nativo de la
        // plataforma (su tabla de nivel de combustible); 'sensor' usa el
        // detector propio sobre el historial. UNDEFINED = todavia no buscada.
        fuente: 'plataforma', _desc: undefined
    },
    fuelSinSensor: false, // la ultima corrida no encontro sensor de nivel
    fuelPlat: '',        // nombre de la plantilla de plataforma usada (o '')
    uniSel: {},          // unidades marcadas para filtrar las filas (vacio = todas)
    uniBusca: '',        // buscador del selector de unidades
    colsOcultas: {},     // columnas ocultas de la tabla (indice -> 1)
    conductor: null,     // mapa idUnidad -> conductor (dato extra, opt-in)
    tablas: [],          // todas las tablas del ultimo informe (pestanas)
    tablaSel: null,      // indice de la tabla activa
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
// Tambien duraciones "H:MM:SS" o "MM:SS", que se pasan a segundos para poder
// sumarlas en el resumen (la columna "Duracion en" viene asi).
function rxInfNum(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    const dur = String(v).trim().match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (dur) {
        const a = Number(dur[1]), b = Number(dur[2]), c = Number(dur[3] || 0);
        return (dur[3] != null) ? (a * 3600 + b * 60 + c) : (a * 60 + b);
    }
    let s = String(v).replace(/[^\d,.\-]/g, '');
    if (!s || s === '-') return null;
    // "1.234,56" (es) -> coma decimal; "1234.56" (en) -> punto decimal.
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = (s.lastIndexOf(',') > s.lastIndexOf('.'))
        ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (s.indexOf(',') >= 0) s = s.replace(',', '.');
    const n = Number(s);
    return isFinite(n) ? n : null;
}
// Segundos como duracion "H:MM:SS" (para el resumen por unidad).
function rxInfFmtDur(seg) {
    const s = Math.max(0, Math.round(Number(seg) || 0));
    const p2 = (x) => (x < 10 ? '0' + x : String(x));
    return Math.floor(s / 3600) + ':' + p2(Math.floor((s % 3600) / 60)) + ':' + p2(s % 60);
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
    // Columnas de duracion ("0:08:01"): se suman en segundos pero se pintan
    // otra vez como duracion, que es como las lee el operador.
    const esDur = {};
    for (const i of t.num) {
        let vio = false, dur = true;
        for (const f of (filas || []).slice(0, 50)) {
            const s = String(f[i] == null ? '' : f[i]).trim();
            if (!s || s === '-') continue;
            vio = true;
            if (!/^\d+:\d{1,2}(:\d{1,2})?$/.test(s)) { dur = false; break; }
        }
        esDur[i] = vio && dur;
    }
    const outFilas = orden.map((g) => {
        const fila = [g.eco, g.n];
        for (const i of t.num) {
            const s = g.sumas[i] == null ? 0 : g.sumas[i];
            fila.push(esDur[i] ? rxInfFmtDur(s) : rxInfFmt(s));
        }
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
    const id = (o && o.id != null) ? o.id : (o != null ? o : 0);
    const sec = (o && o.sec != null) ? o.sec : '0';
    return rxInfClave(tpl) + '|' + id + '|' + sec + '|' + ((o && o.def) ? 'd|' : '') + desde + '|' + hasta;
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
// Normaliza una lista que la plataforma puede mandar como array, como JSON
// serializado o como texto separado por comas (los "filter_order" de las
// plantillas cambian de formato entre versiones). Se usa para sacar la lista
// de FILTROS que declara la plantilla, ademas de los que vienen guardados.
function rxInfLista(v) {
    if (v == null) return [];
    if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
    const s = String(v).trim();
    if (!s) return [];
    if (s.charAt(0) === '[') {
        try { const a = JSON.parse(s); return Array.isArray(a) ? a.map((x) => String(x)).filter(Boolean) : []; }
        catch (_) { return []; }
    }
    return s.split(/[,;|]+/).map((x) => x.trim()).filter(Boolean);
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
            params: (params && typeof params === 'object') ? params : null,
            // Filtros que ADMITE la tabla (filter_order): sin esto solo se
            // ofrecian los que ya venian guardados en la plantilla. Se
            // descartan valores que no parezcan una clave de filtro.
            filtros: rxInfLista(tb.filtros != null ? tb.filtros : (tb.f != null ? tb.f : tb.fl))
                .filter((k) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k))
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
// Tipos de objeto que puede pedir una plantilla que NO son unidades ni
// geocercas (grupos de unidades, conductores, remolques). La plataforma los
// expone como items de recurso y el informe se ejecuta con su id. Se cachean
// (nombre -> id) porque resolver un filtro por nombre los necesita.
const _rxInfItems = {};   // itemsType -> { NOMBRE: id }
const _RX_INF_TIPOS = {
    AVL_UNIT_GROUP: 'avl_unit_group', AVL_UNITGROUPS: 'avl_unit_group', UNIT_GROUP: 'avl_unit_group',
    AVL_DRIVER: 'avl_driver', DRIVER: 'avl_driver',
    AVL_TRAILER: 'avl_trailer', TRAILER: 'avl_trailer'
};
// Lee (y cachea) los items de un tipo. `conDetalle` devuelve ademas la lista
// con recurso dueño; sin el, solo el mapa nombre -> id.
async function rxInfItemsTipo(itemsType, conDetalle) {
    const out = {};
    const lista = [];
    try {
        const r = await remoteCall('core/search_items', {
            spec: { itemsType: itemsType, propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: (conDetalle ? (1 | 2) : 1), from: 0, to: 0
        });
        (r.items || []).forEach((it) => {
            if (!it || it.id == null) return;
            const nm = it.nm || it.name || String(it.id);
            out[norm(nm)] = String(it.id);
            if (conDetalle) lista.push({ id: String(it.id), eco: it.nm || it.name || String(it.id) });
        });
    } catch (_) { /* sin permiso para listar ese tipo */ }
    _rxInfItems[itemsType] = out;
    return conDetalle ? lista : out;
}
// Objetos de una plantilla de grupo/conductor/remolque, listos para ejecutar
// (rid = recurso dueño si se conoce, si no el de la plantilla). Null si el
// tipo no es especial.
async function rxInfObjetosTipo(tipoObj, ridPlantilla) {
    const itemsType = _RX_INF_TIPOS[norm(tipoObj)];
    if (!itemsType) return null;
    const lista = await rxInfItemsTipo(itemsType, true);
    return lista.map((it) => ({ id: it.id, eco: it.eco, rid: ridPlantilla }));
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
        '4': 'parametros u objeto no validos (code 4): suele ser que la plantilla no admite ese objeto (p. ej. se ejecuto por geocerca una plantilla de unidad) o que el periodo es demasiado pesado',
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
// Una celda de fila. OJO: la plataforma mezcla formas en la MISMA fila:
//   "CDOS.4286 - JY21236"                          -> texto plano (Unidad)
//   { t:"14.09.2026 15:13:41", v:..., y:..., x:... } -> objeto (fechas, numeros)
//   "0:08:01"                                      -> texto plano (duracion)
// Asi que una celda que no sea objeto se devuelve tal cual; las de objeto
// prefieren el texto NO vacio (las de item traen t:"" y el id en v).
function rxInfCelda(cel) {
    if (cel == null) return '';
    if (typeof cel !== 'object') return cel;
    if (cel.t != null && String(cel.t) !== '') return cel.t;
    if (cel.v != null) return cel.v;
    if (cel.y != null && cel.x != null) return cel.y + ',' + cel.x;
    if (cel.t != null) return cel.t;
    return '';
}
async function rxInfFilasDeTabla(idx, total, token) {
    const filas = [];
    const coords = [];   // por fila: [{i: columna, lat, lon}] de las celdas con y/x
    const tope = Math.min(Number(total) || 0, RX_INF_MAX_FILAS);
    const paso = 1000;
    for (let i = 0; i < tope; i += paso) {
        if (token && token.cancelado) break;
        const j = Math.min(tope, i + paso) - 1;
        let r;
        try { r = await remoteCall('report/get_result_rows', { tableIndex: idx, indexFrom: i, indexTo: j }); }
        catch (e) { return { filas: filas, coords: coords, error: (e && e.message) || String(e) }; }
        const arr = Array.isArray(r) ? r
            : ((r && Array.isArray(r.rows)) ? r.rows
                : ((r && r.reportResult && Array.isArray(r.reportResult.rows)) ? r.reportResult.rows : []));
        if (!arr.length) break;
        for (const o of arr) {
            if (!o) continue;
            const c = Array.isArray(o.c) ? o.c : [];
            const fila = [], cr = [];
            for (let k = 0; k < c.length; k++) {
                fila.push(rxInfCelda(c[k]));
                const cel = c[k];
                // La celda de ubicacion trae el texto y, ademas, las
                // coordenadas en y/x: se guardan aparte (rxInfCelda las
                // descartaba al preferir el texto).
                if (cel && typeof cel === 'object' && cel.y != null && cel.x != null &&
                    isFinite(+cel.y) && isFinite(+cel.x)) {
                    cr.push({ i: k, lat: +cel.y, lon: +cel.x });
                }
            }
            filas.push(fila); coords.push(cr);
        }
        if (arr.length < (j - i + 1)) break;
    }
    return { filas: filas, coords: coords, error: '' };
}
// Coge las filas del resultado ya ejecutado. Se leen TODAS las tablas con
// filas (no solo la mas grande): asi el operador puede cambiar de tabla
// (p.ej. la de consumo de combustible) sin volver a ejecutar.
async function rxInfLeeResultado(r, token) {
    const rr = (r && r.reportResult) ? r.reportResult : r;
    const meta = (rr && Array.isArray(rr.tables)) ? rr.tables : [];
    if (!meta.length) return null;
    const salida = [];
    for (let i = 0; i < meta.length && salida.length < RX_INF_MAX_TABLAS; i++) {
        const t = meta[i] || {};
        const n = Number(t.rows || 0);
        if (!n) continue;
        const leidas = await rxInfFilasDeTabla(i, n, token);
        if (leidas.error) {
            // Si la plataforma no deja leer el contenido, se deja en la traza.
            rxInfLog('get_result_rows fallo (tabla ' + i + ', ' + n + ' filas)',
                (RX_INF.diag && RX_INF.diag.enviado) || {}, leidas.error);
            RX_INF.diag = Object.assign({}, RX_INF.diag, { filasError: leidas.error, tabla: i, tablaFilas: n });
            continue;
        }
        const cols = ((t && t.header) || []).map((c) => String(c == null ? '' : c));
        rxInfCorrigeUnidades(cols, leidas.filas);
        salida.push({ idx: i, name: t.name || '', label: t.label || '', cols: cols, filas: leidas.filas, coords: leidas.coords || [] });
    }
    if (!salida.length) return null;
    // La tabla elegida por defecto es la que mas filas tiene (suele ser el
    // detalle); el resto quedan como pestañas.
    let el = 0, max = -1;
    salida.forEach((t, k) => { if (t.filas.length > max) { max = t.filas.length; el = k; } });
    RX_INF.diag = Object.assign({}, RX_INF.diag, { tablas: salida.length, tabla: salida[el].idx, tablaFilas: salida[el].filas.length });
    return { tablas: salida, filas: salida[el].filas, cols: salida[el].cols };
}
// Las columnas de item (Unidad) a veces llegan como id numerico: se traduce al
// eco de la flota para que la tabla se lea.
function rxInfCorrigeUnidades(cols, filas) {
    let iUni = -1;
    for (let k = 0; k < (cols || []).length; k++) {
        if (/^(UNIDAD|UNIDADES|ECO|VEHICULO|VEHICLE|IMM|NAME|NOMBRE|OBJECT|OBJETO)/.test(rxInfNombreCol(cols[k]))) { iUni = k; break; }
    }
    if (iUni < 0) return;
    const id2eco = {};
    (APP.unidades || []).forEach((u) => {
        if (!u || u.id == null) return;
        let info = null;
        try { info = parseUnitName(u); } catch (_) { info = null; }
        id2eco[String(u.id)] = (info && (info.eco || info.clave)) || u.nm || String(u.id);
    });
    (filas || []).forEach((f) => {
        const v = String(f[iUni] == null ? '' : f[iUni]);
        if (id2eco[v]) f[iUni] = id2eco[v];
    });
}
// Una llamada a exec_report. La lectura es SINCRONA: el resultado viene en la
// propia respuesta. Si la plataforma esta ocupada (1003) o rechaza el trozo
// por pesado (1004), se limpia y se reintenta; si aun asi falla, y el trozo
// abarca mas de un dia, se PARTE por la mitad y se pegan las dos mitades. Asi
// un intervalo grande nunca tira el informe entero.
async function rxInfEjecuta(tpl, o, desde, hasta, token, prof, def) {
    if (token && token.cancelado) return { filas: [], error: 'cancelado' };
    // Wialon: reportObjectId = item (unidad/geocerca) y reportObjectSecId =
    // subitem (conductor/remolque; 0 si no hay). El objeto trae `id` (item) y
    // `sec` (subitem).
    const objId = (o && o.id != null) ? o.id : tpl.rid;
    const secId = (o && o.sec != null) ? String(o.sec) : '0';
    const d = def || (o && o.def) || null;
    const enviado = {
        reportResourceId: tpl.rid,
        reportTemplateId: d ? 0 : tpl.id,
        reportTemplate: d || null,
        reportObjectId: objId, reportObjectSecId: secId,
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
                return { filas: leido.filas, cols: leido.cols, tablas: leido.tablas };
            }
            // Sin tablas: puede que la plataforma traiga las filas en linea.
            const n = rxInfExtrae(r);
            rxInfIntento(enviado, '', n.filas);
            if (!n.filas.length) rxInfLog('ejecutado sin filas', enviado);
            return {
                filas: n.filas, cols: n.cols,
                tablas: n.filas.length ? [{ idx: 0, name: '', label: '', cols: n.cols, filas: n.filas }] : []
            };
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
// ── Filtros de la plantilla ─────────────────────────────────────────────
// De los parametros guardados, unos son FILTROS (units, geozones, drivers...)
// y otros son solo FORMATO/CALCULO de la plataforma (address_format,
// time_format, us_units, averaging...). Los segundos no se ensenan: no filtran
// nada y solo confunden.
const RX_INF_AJUSTE = /^(address_format|time_format|date_format|us_units|units_format|measure_units|volume_units|distance_units|fuel_units|speed_format|currency|language|locale|time_zone|timezone|averaging|geofence_exit_msg|geofence_enter_msg|speed_limit|parking|motionless)$/i;
// Claves que se ofrecen como filtros: las que admite la tabla (filter_order)
// mas las que ya vienen guardadas y no son ajuste.
function rxInfFiltrosDe(info) {
    const out = [], vistos = {};
    const meter = (k) => {
        const s = String(k == null ? '' : k).trim();
        if (!s || vistos[s] || RX_INF_AJUSTE.test(s)) return;
        vistos[s] = 1;
        out.push(s);
    };
    (info && info.tablas ? info.tablas : []).forEach((tb) => (tb.filtros || []).forEach(meter));
    (info && info.params ? info.params : []).forEach((p) => meter(p && p.k));
    return out;
}
// Precarga los items que necesitan los filtros de la plantilla (grupos,
// conductores, remolques) para poder resolver sus NOMBRES a id. Se llama una
// vez al leer la declaracion; sin esto, esos filtros solo admitirian ids.
async function rxInfPrecargaItems(info) {
    const keys = rxInfFiltrosDe(info);
    const want = {};
    keys.forEach((k) => {
        const n = norm(k);
        if (/GROUP|GRUPO/.test(n)) want.avl_unit_group = 1;
        else if (/DRIVER|CONDUCTOR|PILOTO|OPERADOR/.test(n)) want.avl_driver = 1;
        else if (/TRAILER|REMOLQUE/.test(n)) want.avl_trailer = 1;
    });
    for (const t of Object.keys(want)) {
        if (!_rxInfItems[t] || !Object.keys(_rxInfItems[t]).length) {
            try { await rxInfItemsTipo(t, false); } catch (_) { /* noop */ }
        }
    }
}
// Valor actual de un filtro: lo que tecleo el operador o lo que trae guardado
// la plantilla.
function rxInfFiltroValor(info, k) {
    if (RX_INF.filtros && RX_INF.filtros[k] != null) return String(RX_INF.filtros[k]);
    const p = (info && info.params ? info.params : []).filter((x) => x && x.k === k)[0];
    return p ? String(p.v == null ? '' : p.v) : '';
}
// Acepta ids o NOMBRES (el operador escribe "CDOS.4286" o "105" y se resuelve
// al id). Los ecos pueden ser numericos, asi que se prueba primero el nombre y
// solo despues se toma como id.
function rxInfFiltroResuelve(k, v) {
    const partes = String(v == null ? '' : v).split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
    const ids = partes.map((x) => {
        const n = norm(x);
        if (/unit|unidad/i.test(k) && !/group|grupo/i.test(k)) {
            for (const u of (APP.unidades || [])) {
                let i = null;
                try { i = parseUnitName(u); } catch (_) { i = null; }
                const eco = (i && (i.eco || i.clave)) || u.nm || '';
                if (eco && norm(eco) === n) return String(u.id);
            }
        }
        if (/geozon|geofence|zona/i.test(k)) {
            for (const z of (APP.zonas || [])) {
                if (norm(rxGeoInfNombre(z)) === n) return String(z.id);
            }
        }
        if (/group|grupo/i.test(k)) {
            const c = _rxInfItems['avl_unit_group'];
            if (c && c[n]) return c[n];
        }
        if (/driver|conductor|piloto|operador/i.test(k)) {
            const c = _rxInfItems['avl_driver'];
            if (c && c[n]) return c[n];
        }
        if (/trailer|remolque/i.test(k)) {
            const c = _rxInfItems['avl_trailer'];
            if (c && c[n]) return c[n];
        }
        return x;
    }).filter(Boolean);
    return ids.join(',');
}
// Filtros efectivos (resueltos a ids) de la pantalla.
function rxInfFiltrosEfectivos() {
    const out = {};
    Object.keys(RX_INF.filtros || {}).forEach((k) => {
        const v = String(RX_INF.filtros[k] == null ? '' : RX_INF.filtros[k]).trim();
        if (!v) return;
        out[k] = rxInfFiltroResuelve(k, v);
    });
    return out;
}
// Pista para el campo de un filtro: que se puede escribir.
function rxInfFiltroPista(k) {
    const n = norm(k);
    if (/UNIT|UNIDAD/.test(n) && !/GROUP|GRUPO/.test(n)) return 'eco o id de unidad';
    if (/GEOZON|GEOFENCE|ZONA/.test(n)) return 'nombre o id de geocerca';
    if (/DRIVER|CONDUCTOR|PILOTO|OPERADOR/.test(n)) return 'nombre o id de conductor';
    if (/TRAILER|REMOLQUE/.test(n)) return 'id o nombre de remolque';
    if (/GROUP|GRUPO/.test(n)) return 'nombre o id de grupo';
    if (/ROUTE|RUTA/.test(n)) return 'id de ruta';
    if (/FECHA|DATE|TIME|HORA/.test(n)) return 'fecha (AAAA-MM-DD)';
    if (/MIN|DURACION|HORA/.test(n)) return 'minutos';
    return 'id o valor';
}
// Filtros por plantilla, persistidos: el operador no tiene que volver a
// teclearlos cada vez que abre el informe.
function rxInfFiltrosGuardados() {
    try {
        if (typeof readJSON !== 'function' || !LS || !LS.infplantfilt) return {};
        const g = readJSON(LS.infplantfilt, {});
        return (g && typeof g === 'object') ? g : {};
    } catch (_) { return {}; }
}
function rxInfFiltrosGuardar() {
    try {
        if (typeof writeJSON !== 'function' || !LS || !LS.infplantfilt) return;
        const k = rxInfClave(RX_INF.tpl);
        if (!k) return;
        const g = rxInfFiltrosGuardados();
        const limpio = {};
        Object.keys(RX_INF.filtros || {}).forEach((x) => {
            if (String((RX_INF.filtros || {})[x] || '').trim()) limpio[x] = RX_INF.filtros[x];
        });
        if (Object.keys(limpio).length) g[k] = limpio; else delete g[k];
        writeJSON(LS.infplantfilt, g);
    } catch (_) { /* sin storage */ }
}
function rxInfFiltrosCargar() {
    const g = rxInfFiltrosGuardados();
    const k = rxInfClave(RX_INF.tpl);
    RX_INF.filtros = (k && g[k] && typeof g[k] === 'object') ? Object.assign({}, g[k]) : {};
}
// Las plantillas de Wialon pueden venir ATADAS a unidades concretas en su
// parametro de nivel (`p.bind.avl_unit`). Al construir una definicion propia
// para ejecutarla por OTRA unidad, ese bind hace que la plataforma responda
// "code 4": se quita de la copia.
function rxInfDefSinBind(def) {
    try {
        const p = JSON.parse(def.p || '{}') || {};
        delete p.bind;
        def.p = JSON.stringify(p);
    } catch (_) { def.p = '{}'; }
    return def;
}
// Definicion propia de la plantilla (reportTemplateId 0 + reportTemplate) con
// los filtros elegidos aplicados. Null si no hay filtros: entonces se usa la
// plantilla tal cual (con la definicion "sin filtros" como ultimo recurso).
function rxInfDefFiltros(datos, tplId, filtros) {
    if (!filtros || !Object.keys(filtros).length) return null;
    try {
        const lista = Array.isArray(datos) ? datos : (datos && Array.isArray(datos.items) ? datos.items : []);
        const t = lista.filter((x) => x && String(x.id) === String(tplId))[0] || lista[0];
        if (!t || !Array.isArray(t.tbl) || !t.tbl.length) return null;
        const def = JSON.parse(JSON.stringify(t));
        def.id = 0;
        rxInfDefSinBind(def);
        def.tbl.forEach((tb) => {
            let p = {};
            try { p = JSON.parse(tb.p || '{}') || {}; } catch (_) { p = {}; }
            Object.keys(filtros).forEach((k) => {
                const v = filtros[k];
                if (v == null || v === '') delete p[k];
                else p[k] = v;
            });
            tb.p = JSON.stringify(p);
        });
        return def;
    } catch (_) { return null; }
}
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
        rxInfDefSinBind(def);
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
// Definicion propia con SOLO las tablas pedidas (por nombre interno). Sirve
// para ejecutar una plantilla pesada (viajes + paradas + chart + stats) con
// unicamente la tabla que interesa: en combustible, `unit_thefts` (Descargas).
// Sin esto la plataforma calcula todo el informe por unidad (lento) y la tabla
// activa acababa siendo la de consumo por viajes.
function rxInfDefSoloTablas(datos, tplId, nombres) {
    try {
        const lista = Array.isArray(datos) ? datos : (datos && Array.isArray(datos.items) ? datos.items : []);
        const t = lista.filter((x) => x && String(x.id) === String(tplId))[0] || lista[0];
        if (!t || !Array.isArray(t.tbl) || !t.tbl.length) return null;
        const keep = (nombres && nombres.length) ? nombres : ['unit_thefts'];
        const def = JSON.parse(JSON.stringify(t));
        def.id = 0;
        rxInfDefSinBind(def);
        def.tbl = def.tbl.filter((tb) => keep.indexOf(tb.n) >= 0);
        // La tabla de descargas queda con el filtro de sensor en TODOS los
        // sensores de combustible de la unidad (una fila por sensor), no en el
        // grupo "*TOTAL*" que traia la plantilla guardada. Asi una unidad con 3
        // sensores los mide los 3.
        def.tbl.forEach((tb) => {
            if (!/theft|descarg/i.test(String(tb.n || '') + ' ' + String(tb.l || ''))) return;
            let p = {};
            try { p = JSON.parse(tb.p || '{}') || {}; } catch (_) { p = {}; }
            delete p.custom_sensor_name;
            p.sensor_name = '*';
            tb.p = JSON.stringify(p);
        });
        return def.tbl.length ? def : null;
    } catch (_) { return null; }
}
function rxInfCandidatos(tpl, info, datos, defBase) {
    const out = [];
    const visto = {};
    // `item` es el reportObjectId (unidad/geocerca) y `sec` el reportObjectSecId
    // (conductor/remolque; '0' si no hay).
    const meter = (item, sec, eco, esZona, def) => {
        if (item == null) return;
        const k = String(item) + '|' + String(sec) + (def ? '|d' : '');
        if (visto[k]) return;
        visto[k] = 1;
        out.push({ id: String(item), sec: String(sec == null ? '0' : sec), eco: eco || '', esZona: !!esZona, def: def || null });
    };
    const zs = rxInfZonasPlataforma();
    const mkZona = (z, def) => meter(z.id, '0', z.eco + (def ? ' (sin filtro)' : ''), true, def);
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
    // 5) Item + geocerca: la unidad que pisa la zona (unidad con remolque/zona).
    const unidadesPrueba = items.slice(0, 1).concat(us.length ? [us[0].id] : []);
    unidadesPrueba.slice(0, 2).forEach((uid) => prueba.forEach((z) => meter(uid, z.id, z.eco + ' + u' + uid)));
    // 6) La plantilla SIN sus filtros guardados (definicion propia). Es la
    //    carta que hace que un informe atado a una unidad sin datos vuelva a
    //    traer lo de todas.
    const def = defBase || rxInfDefSinUnidades(datos, tpl.id);
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
async function rxInfModelo(tpl, info, datos, desde, hasta, token, defBase) {
    const cands = rxInfCandidatos(tpl, info, datos, defBase);
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
// Pega las tablas de un trozo en el acumulado del informe (por indice).
function rxInfAcumulaTablas(acum, tablas) {
    (tablas || []).forEach((t) => {
        if (!t) return;
        let g = null;
        for (const x of acum) if (x.idx === t.idx) { g = x; break; }
        if (!g) { g = { idx: t.idx, name: t.name || '', label: t.label || '', cols: t.cols || [], filas: [] }; acum.push(g); }
        if ((!g.cols || !g.cols.length) && t.cols && t.cols.length) g.cols = t.cols;
        for (const f of (t.filas || [])) g.filas.push(f);
    });
}
// ── Ejecucion por trozos ────────────────────────────────────────────────
// Ejecuta la plantilla por objeto y por trozos de periodo, y pega los
// resultados. Objeto x trozo, de uno en uno y cacheado: ninguna peticion crece
// (de ahi que ninguna reviente con el limite de tiempo) y repetir el informe
// no vuelve a preguntar lo mismo.
//   onProg(hechos, total, filas, eco)
async function rxInfCorre(tpl, desde, hasta, unidades, onProg, token, forzar, defFijo) {
    const t0 = Date.now();
    RX_INF.intentos = [];
    rxInfCacheCargar();
    const trozos = rxGeoInfTrozos(desde, hasta, RX_INF_DIAS_TROZO * 86400).slice(0, RX_INF_MAX_TROZOS);
    let objs, modo, recortado = false;
    if (unidades && unidades.length) {
        objs = unidades.map((u) => ({ id: String(u.id), sec: '0', eco: u.eco }));
        modo = 'seleccion';
        if (defFijo) objs.forEach((o) => { o.def = defFijo; });
    } else {
        const datos = await rxInfDatosPlantilla(tpl);
        const info = rxInfPlantillaInfo(datos, tpl.id);
        // `forzar` = 'flota' obliga el modelo por unidad. Es lo correcto para
        // las plantillas de combustible (su tabla de nivel es por unidad), que
        // a veces se confundian con geocercas solo por el nombre.
        const esGeo = (forzar === 'flota') ? false : (info ? info.esGeo : (rxInfPista(tpl) === 'geocercas'));
        // Filtros elegidos por el operador (units, geozones...): van como
        // definicion propia para TODOS los objetos.
        let defBase = defFijo || rxInfDefFiltros(datos, tpl.id, rxInfFiltrosEfectivos());
        // Al forzar flota se quitan los filtros de unidad/objeto guardados: el
        // informe se ejecuta unidad por unidad y un filtro atado a otra unidad
        // solo provoca errores.
        if (!defBase && forzar === 'flota') defBase = rxInfDefSinUnidades(datos, tpl.id);
        if (esGeo) {
            objs = await rxInfModelo(tpl, info, datos, desde, hasta, token, defBase);
            modo = 'geocercas';
        } else {
            // Plantillas atadas a un tipo que NO es unidad (grupos, conductores,
            // remolques): se ejecutan por sus objetos; si el recurso no los
            // expone, se cae a la flota para no quedarse sin datos.
            const tipo = (info && info.tipoObj) || '';
            const especiales = await rxInfObjetosTipo(tipo, tpl.rid);
            if (especiales && especiales.length) {
                objs = especiales.slice(0, RX_INF_MAX_OBJETOS).map((o) => ({ id: o.id, sec: '0', eco: o.eco }));
                modo = 'tipo';
            } else {
                objs = rxInfUnidades(desde).map((u) => ({ id: u.id, sec: '0', eco: u.eco }));
                if (!objs.length) objs = [{ id: tpl.rid, sec: '0', eco: '' }];
                modo = 'flota';
            }
        }
        if (defBase) objs.forEach((o) => { o.def = defBase; });
    }
    const trabajos = [];
    for (const o of objs) {
        for (const t of trozos) trabajos.push({ obj: o, desde: t[0], hasta: t[1] });
    }
    const total = trabajos.length;
    const filas = [];
    const errores = [];
    const acumTablas = [];   // una entrada por tabla de la plantilla
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
                rxInfAcumulaTablas(acumTablas, enCache.t || [{ idx: 0, name: '', label: '', cols: enCache.c || cols, filas: enCache.f || [] }]);
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
                    rxInfAcumulaTablas(acumTablas, r.tablas);
                    for (const f of n) filas.push(f);
                    if (filas.length < RX_INF_MAX_FILAS) rxInfCachePoner(k, { c: cols, f: n, t: r.tablas || [] });
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
    // La tabla activa es la que mas filas tiene (suele ser el detalle); las
    // demas quedan como pestanas.
    let activa = null;
    acumTablas.forEach((t) => { if (!activa || t.filas.length > activa.filas.length) activa = t; });
    return {
        cols: (activa && activa.cols.length) ? activa.cols : cols,
        filas: activa ? activa.filas : filas,
        tablas: acumTablas,
        trozos: trozos.length, hechos: hechos,
        objetos: objs.length, asked: total, alcance: modo, recortado: recortado,
        fallos: fallos, errores: errores, cacheados: cacheados, lleno: lleno,
        bloqueado: bloqueado,
        cancelado: !!(token && token.cancelado), ms: Date.now() - t0
    };
}
// ── Dato extra: conductor de cada unidad ────────────────────────────────
// La plantilla no siempre trae el conductor. Cuando no lo trae, se puede
// anadir preguntando a la plataforma por las asignaciones unidad-conductor.
// Es un dato de HOY (el ultimo asignado), no historico: sirve como contexto.
let _rxInfCond = null, _rxInfCondRid = null;
function rxInfEcoAId() {
    const m = {};
    (APP.unidades || []).forEach((u) => {
        if (!u || u.id == null) return;
        let i = null;
        try { i = parseUnitName(u); } catch (_) { i = null; }
        const eco = (i && (i.eco || i.clave)) || u.nm;
        if (eco) m[norm(eco)] = String(u.id);
    });
    return m;
}
async function rxInfCargaConductores(rid) {
    if (_rxInfCond && _rxInfCondRid === rid) return _rxInfCond;
    const out = {};
    try {
        const r = await remoteCall('resource/get_unit_drivers', { itemId: rid, flags: 0 });
        const arr = Array.isArray(r) ? r : ((r && (r.items || r.drivers || r.uds)) || []);
        const lista = Array.isArray(arr) ? arr : Object.keys(arr || {}).map((k) => arr[k]);
        lista.forEach((x) => {
            if (!x) return;
            const u = (x.u != null) ? x.u : ((x.unitId != null) ? x.unitId : x.uid);
            const nm = x.n || x.nm || x.name || (x.d && (x.d.n || x.d.nm)) || '';
            if (u != null && nm) out[String(u)] = String(nm);
        });
    } catch (_) { /* servicio distinto o sin permiso: se queda vacio */ }
    _rxInfCond = out;
    _rxInfCondRid = rid;
    return out;
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
    // rxInfTabla (50-informe.js) espera las columnas y las filas como arrays y
    // YA monta <thead>/<tr>/<td>: aqui se le pasa el valor ya escapado.
    const cab = (t.cols || []).slice(0, 14).map((c) => esc(c));
    const filas = (t.filas || []).slice(0, 400).map((f) => {
        const out = [];
        for (let i = 0; i < cab.length; i++) {
            const v = f[i];
            out.push(esc(v == null ? '-' : String(v)));
        }
        return out;
    });
    const m = t.meta || {};
    const kpi = (n, s) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(s) + '</span></div>';
    const mas = ((t.filas || []).length > 400)
        ? '<div class="callout">Se listan las primeras 400 filas; el CSV lleva todas.</div>' : '';
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' +
        esc(t.titulo || 'Informe') + '</title><style>' + rxInfEstilo() + '</style></head><body>' +
        rxInfCabecera('Rondo', t.titulo || 'Informe de la plataforma',
            esc(t.subtitulo || '') + '<br>Documento de solo lectura') +
        '<div class="kpis">' +
        kpi(m.filas, t.esFuel ? 'Perdidas' : 'Filas') + kpi(m.unidades, 'Unidades') +
        (t.esFuel ? '' : kpi(m.trozos, 'Trozos de 7 dias')) + kpi(m.objetos, 'Objetos') +
        kpi(Math.round((m.ms || 0) / 1000) + ' s', 'Calculo') +
        (m.fallos ? kpi(m.fallos, t.esFuel ? 'Con error' : 'Trozos con error') : '') +
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
    // Filtro por unidad (texto).
    if (iUni >= 0 && RX_INF.eco) {
        const q = norm(RX_INF.eco);
        pre = pre.filter((f) => norm(f[iUni]).indexOf(q) >= 0);
    }
    // Filtro por unidades marcadas (lista tipo Excel). Vacio = todas.
    const uniMarcadas = Object.keys(RX_INF.uniSel || {}).filter((k) => RX_INF.uniSel[k]);
    if (iUni >= 0 && uniMarcadas.length) {
        const setU = {};
        uniMarcadas.forEach((m) => { setU[norm(m)] = 1; });
        pre = pre.filter((f) => setU[norm(f[iUni])]);
    }
    // Resumen por unidad: sobre lo ya filtrado.
    if (RX_INF.vista === 'unidad') {
        const r = rxInfResumenUnidad(RX_INF.cols, pre, { iUni: iUni, iFec: tipos.iFec, num: tipos.num, txt: tipos.txt });
        cols = r.cols;
        pre = r.filas;
    }
    // Columna extra de conductor (si se pidio y la plantilla no la trae).
    if (RX_INF.conductor && iUni >= 0) {
        const nombres = cols.map(rxInfNombreCol).join(' ');
        if (!/CONDUCTOR|DRIVER|PILOTO|OPERADOR/.test(nombres)) {
            const eco2id = rxInfEcoAId();
            const mapa = RX_INF.conductor;
            const ya = {};
            let hay = false;
            const iC = cols.length;
            for (const f of pre) {
                const id = eco2id[norm(f[iUni])];
                const c = (id && mapa[id]) ? mapa[id] : '';
                if (c) hay = true;
                f.push(c);
            }
            if (hay) { cols = cols.concat(['Conductor']); }
            else { for (const f of pre) f.pop(); }
        }
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
        (m.trozos ? (m.trozos + ' trozos \u00b7 ') : '') + Math.round(m.ms / 1000) + ' s' +
        (m.cacheados ? ' \u00b7 ' + m.cacheados + ' ya estaban en cache' : '') +
        (m.fallos ? ' \u00b7 ' + m.fallos + ' trozo(s) con error' : '');
}
// Indices de columna que se ven (la tabla es como un Excel: se pueden
// ocultar columnas para la vista y para las salidas).
function rxInfVisibles(cols) {
    const out = [];
    for (let i = 0; i < (cols || []).length; i++) if (!RX_INF.colsOcultas[i]) out.push(i);
    return out.length ? out : (cols || []).map((c, i) => i);
}
// Recorta columnas y filas a las visibles (para CSV/PDF/Markdown).
function rxInfRecortaVisible(cols, filas) {
    const vis = rxInfVisibles(cols);
    if (vis.length === (cols || []).length) return { cols: cols, filas: filas, vis: vis };
    return {
        cols: vis.map((i) => cols[i]),
        filas: (filas || []).map((f) => vis.map((i) => f[i])),
        vis: vis
    };
}
// Tabla de la vista previa: celdas escapadas, numeros alineados y cabecera
// pulsable para ordenar (lo que se ve es lo que se exporta).
function rxInfTablaHTML(cols, filas, max) {
    const orden = RX_INF.orden;
    const vis = rxInfVisibles(cols);
    const colsV = vis.map((i) => cols[i]);
    const filasV = (filas || []).map((f) => vis.map((i) => f[i]));
    const cab = colsV.slice(0, 14).map((c, k) => {
        const i = vis[k];
        const act = orden && orden.col === i;
        const flecha = act ? (orden.dir < 0 ? ' \u25be' : ' \u25b4') : '';
        return '<th class="ord' + (act ? ' on' : '') + '" data-col="' + i + '" title="Ordenar por esta columna">' +
            esc(c) + flecha + '</th>';
    }).join('');
    const cuerpo = filasV.slice(0, max || 60).map((f) => {
        let out = '';
        for (let i = 0; i < Math.min(colsV.length, 14); i++) {
            const v = f[i];
            const txt = (v == null || v === '') ? '-' : String(v);
            const num = rxInfNum(v) != null;
            out += '<td' + (num ? ' class="num"' : '') + '>' + esc(txt) + '</td>';
        }
        return '<tr>' + out + '</tr>';
    }).join('');
    return '<table><thead><tr>' + cab + '</tr></thead><tbody>' + cuerpo + '</tbody></table>';
}
/* ====================== PERDIDA DE COMBUSTIBLE (V8.1) ======================
 * Reporte extra dentro de "Informes de la plataforma". Lee el historial de la
 * plataforma (messages/load_interval) y busca CAIDAS del nivel de combustible
 * con la unidad TOTALMENTE DETENIDA (velocidad <= umbral). El motor puede
 * estar encendido o apagado: da igual, lo que importa es que la unidad no se
 * mueva (asi se descartan las oscilaciones por movimiento del tanque).
 *
 * Una perdida cuenta cuando el nivel cae al menos 10 litros dentro de una
 * ventana de 2 minutos (lo que se pidio; umbral y ventana son configurables
 * en la pantalla).
 *
 * Si una unidad no publica sensor de nivel de combustible NO se inventa nada:
 * se avisa y se ofrece ejecutar una plantilla de combustible de la plataforma
 * (el fallback acordado). El nucleo de deteccion es puro y se prueba aparte.
 */
const RX_FUEL_MAX_U = 3000;     // tope de unidades por barrido
const RX_FUEL_MSGS = 5000;      // mensajes por peticion (load_interval)
const RX_FUEL_PAGS = 30;        // paginas por unidad
const RX_FUEL_MAX_EV = 5000;    // tope de eventos acumulados
// Nombres tipicos del sensor de nivel de combustible (se busca tambien en el
// catalogo de sensores de la unidad cuando el parametro llega como id).
const RX_FUEL_RE = /(COMBUSTIBLE|FUEL|DIESEL|GASOLINA|GASOLINE|NIVEL|TANQUE|TANK|LEVEL|LITROS?|LITERS?|LITRES?|FSC|LLS|FLS|VOLUMEN|CAPACIDAD|FLEETVIEW|CANBUS|SENSOR\s*DE\s*COMBUSTIBLE)/;
// Nombres de sensor de motor (una copia local: la de Replay vive en otro
// fragmento y este nucleo debe poder probarse aislado).
const RX_FUEL_MOTOR_KEYS = ['engine', 'ignition', 'acc', 'motor', 'encendido', 'engineoperation', 'ignicion'];
const RX_FUEL_COLS = ['Unidad', 'Fecha y hora', 'Litros', 'Minutos', 'Velocidad', 'Motor', 'Coordenadas', 'Zona'];
// Tabla de diagnostico: una fila por unidad con el veredicto del sensor.
const RX_FUEL_SENS_COLS = ['Unidad', 'Distancia km', 'Litros', 'L/100km', 'Muestras', 'Estado', 'Detalle'];
// ── Lectura del mensaje ─────────────────────────────────────────────────
function rxFuelNum(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'object') {
        if (v.v != null) return rxFuelNum(v.v);
        if (v.n != null) return rxFuelNum(v.n);
        return null;
    }
    const n = Number(String(v).replace(',', '.'));
    return isFinite(n) ? n : null;
}
// Quita picos del nivel (datos incoherentes). El nivel de combustible sufre
// picos de 1 o 2 muestras (recarga mal reportada, glitch del flotador): un
// 343 aislado en una serie estable de 100. El anti-picos de vecino inmediato
// fallaba con picos de 2 muestras; aqui se compara cada dato con la MEDIANA de
// sus 4 vecinos (+/-2). Un pico corto tiene mediana en el nivel real y se
// descarta; una caida real (escalon con meseta) tiene la mediana a su propio
// nivel en los bordes y NO se toca. Nunca se sustituye el valor: solo se quita
// el dato atipico.
function rxFuelLimpia(muestras) {
    const arr = (muestras || []).filter((m) => m && m.fuel != null);
    if (arr.length < 5) return arr.slice();
    const out = [];
    for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        if (i >= 2 && i <= arr.length - 3) {
            const v = [arr[i - 2].fuel, arr[i - 1].fuel, a.fuel, arr[i + 1].fuel, arr[i + 2].fuel]
                .sort((x, y) => x - y);
            const med = v[2];
            const desv = Math.abs(a.fuel - med);
            // Tolerancia: 15% del nivel o 5 L, lo que sea mayor. Un volumen
            // grande (tanque lleno) admite mas ruido del flotador sin que sea
            // un pico.
            const tol = Math.max(5, Math.abs(med) * 0.15);
            if (desv > tol) continue;
        }
        out.push(a);
    }
    return out;
}
// Catalogo de sensores de una unidad. Wialon lo publica en `sens` (flag
// 0x1000) y puede llegar como objeto o como JSON serializado. Se normaliza a
// mapa id -> nombre para poder traducir las claves de los parametros.
function rxFuelSensores(u) {
    const out = {};
    let sens = u && (u.sens || u.sensors);
    if (typeof sens === 'string') { try { sens = JSON.parse(sens); } catch (_) { sens = null; } }
    if (sens && typeof sens === 'object') {
        Object.keys(sens).forEach((k) => {
            const s = sens[k];
            const n = (s && (s.n || s.name)) || '';
            if (n) out[String(k)] = String(n);
        });
    }
    return out;
}
// Catalogo de sensores de TODA la flota (id de unidad -> sens). Se pide una
// sola vez por sesion; es la via para identificar el sensor de combustible
// cuando el parametro del mensaje llega con una clave que no es el nombre.
let _rxFuelCat = null;
async function rxFuelCatalogo() {
    if (_rxFuelCat) return _rxFuelCat;
    const out = {};
    try {
        const r = await remoteCall('core/search_items', {
            spec: { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 4096, from: 0, to: 0
        });
        (r.items || []).forEach((it) => {
            if (!it || it.id == null) return;
            let sens = it.sens;
            if (typeof sens === 'string') { try { sens = JSON.parse(sens); } catch (_) { sens = null; } }
            if (sens && typeof sens === 'object' && Object.keys(sens).length) out[String(it.id)] = sens;
        });
    } catch (_) { /* sin permiso o servicio distinto: se seguira por nombre */ }
    _rxFuelCat = out;
    return out;
}
// Claves posibles del parametro de combustible segun el catalogo de sensores:
// el numero de secuencia, el id del sensor, su nombre y su parametro. Asi una
// clave numerica ("7") o rara ("FSC") se reconoce como nivel de combustible.
function rxFuelClaves(sens) {
    const claves = {};
    if (!sens || typeof sens !== 'object') return claves;
    Object.keys(sens).forEach((seq) => {
        const s = sens[seq];
        if (!s || typeof s !== 'object') return;
        const texto = norm([s.n, s.name, s.d, s.p, s.t].filter(Boolean).join(' '));
        if (!RX_FUEL_RE.test(texto)) return;
        [seq, s.id, s.n, s.name, s.p].forEach((k) => {
            const t = String(k == null ? '' : k).trim();
            if (t) claves[t] = 1;
        });
    });
    return claves;
}
// Nombre del parametro: se busca en el catalogo por secuencia, id o parametro
// para poder aplicar el patron de nombres al sensor real.
function rxFuelNombre(k, sens) {
    const s = String(k == null ? '' : k);
    if (!sens || typeof sens !== 'object') return s;
    const directo = sens[s];
    if (directo != null) {
        if (typeof directo === 'string') return directo;
        return String((directo.n || directo.name || directo.d) || s);
    }
    for (const seq of Object.keys(sens)) {
        const x = sens[seq];
        if (!x) continue;
        if (typeof x === 'string') { if (seq === s) return x; continue; }
        if (String(x.id) === s || String(x.p) === s || String(x.n) === s) {
            return String((x.n || x.name || x.d) || s);
        }
    }
    return s;
}
// Nivel de combustible de un mensaje (null si no trae sensor de nivel). Se
// prueba primero por las claves exactas del catalogo (sensor de combustible)
// y despues por el nombre del parametro.
function rxFuelNivel(m, sens, claves) {
    const p = (m && (m.params || m.p)) || null;
    if (!p || typeof p !== 'object') return null;
    if (claves) {
        for (const k of Object.keys(p)) {
            if (!claves[k]) continue;
            const v = rxFuelNum(p[k]);
            if (v != null) return v;
        }
    }
    for (const k of Object.keys(p)) {
        if (!RX_FUEL_RE.test(norm(rxFuelNombre(k, sens)))) continue;
        const v = rxFuelNum(p[k]);
        if (v != null) return v;
    }
    return null;
}
// Estado del motor (true encendido / false apagado / null sin dato).
function rxFuelMotor(m, sens) {
    if (!m) return null;
    if (m.eng === true || m.eng === false) return m.eng;
    const p = m.params || m.p;
    if (!p || typeof p !== 'object') return null;
    for (const k of Object.keys(p)) {
        const kk = norm(rxFuelNombre(k, sens)).replace(/[^A-Z0-9]/g, '').toLowerCase();
        if (RX_FUEL_MOTOR_KEYS.indexOf(kk) < 0) continue;
        const v = p[k];
        if (v === true || v === 1) return true;
        if (v === false || v === 0) return false;
        const s = String(v).trim().toLowerCase();
        if (s === '1' || s === 'on' || s === 'true' || s === 'encendido') return true;
        if (s === '0' || s === 'off' || s === 'false' || s === 'apagado') return false;
    }
    return null;
}
// Una muestra del historial: tiempo, posicion, velocidad, nivel y motor.
function rxFuelMsg(m, sens, claves) {
    if (!m || !m.pos) return null;
    const t = Number(m.t) || 0;
    if (!t) return null;
    return {
        t: t, lat: (m.pos.y != null && isFinite(+m.pos.y)) ? +m.pos.y : null,
        lon: (m.pos.x != null && isFinite(+m.pos.x)) ? +m.pos.x : null,
        s: Number(m.pos.s) || 0,
        fuel: rxFuelNivel(m, sens, claves), motor: rxFuelMotor(m, sens)
    };
}
// Claves de parametro vistas en los mensajes (para el diagnostico cuando no
// se reconoce el sensor de combustible).
function rxFuelParamsVistos(msgs, max) {
    const out = [];
    (msgs || []).forEach((m) => {
        const p = (m && (m.params || m.p)) || null;
        if (!p || typeof p !== 'object') return;
        Object.keys(p).forEach((k) => { if (out.indexOf(k) < 0 && out.length < (max || 8)) out.push(k); });
    });
    return out;
}
// Agrupa perdidas contiguas en una sola: una fuga sostenida (varias caidas
// seguidas, sin recuperar el nivel) es UN evento con su total y su duracion,
// no diez avisos de una linea. Solo se pegan eventos separados por <= la
// ventana y sin una subida de por medio (ya garantizado por la referencia).
function rxFuelAgrupa(eventos, opts) {
    const win = ((Number((opts || {}).min) > 0) ? Number((opts || {}).min) : 2) * 60;
    const out = [];
    for (const e of eventos) {
        const last = out[out.length - 1];
        const gap = last ? (e.desde - last.hasta) : -1;
        if (last && last.motor === e.motor && gap >= 0 && gap <= win) {
            last.hasta = e.hasta;
            last.litros += e.litros;
            last.min = Math.round((last.hasta - last.desde) / 60);
            last.lat = e.lat; last.lon = e.lon;
        } else {
            out.push(Object.assign({}, e));
        }
    }
    return out;
}
// ── Deteccion (pura) ────────────────────────────────────────────────────
// Algoritmo de REFERENCIA + anti-rebote (mejor que "ventana fija por pares"):
// se mantiene una muestra de referencia (el ultimo nivel alto con la unidad
// parada) y, cuando el nivel cae `litros` o mas dentro de `min` minutos SIN
// que la unidad se mueva, se marca la perdida y la referencia pasa a ser el
// nuevo nivel bajo. Asi:
//   - una caida escalonada (10 L + 10 L) se detecta como dos perdidas y no se
//     solapan ni se cuentan dos veces;
//   - un pico momentaneo del sensor (baja y vuelve a subir en la ventana) se
//     descarta como ruido (rebote), que es la causa tipica de falsos eventos;
//   - una caida mas lenta que la ventana reinicia la referencia y no cuenta.
function rxFuelDetecta(msgs, opts) {
    const o = opts || {};
    const th = (Number(o.litros) > 0) ? Number(o.litros) : 10;
    const win = ((Number(o.min) > 0) ? Number(o.min) : 2) * 60;
    const vel = (o.vel == null) ? 3 : Number(o.vel);
    const motor = o.motor || 'todos';
    const out = [];
    const arr = rxFuelLimpia(msgs).sort((a, b) => a.t - b.t);
    let ref = -1;
    for (let k = 0; k < arr.length; k++) {
        const cur = arr[k];
        if (ref < 0) { ref = k; continue; }
        const r = arr[ref];
        // Cualquier movimiento invalida la referencia: la perdida tiene que
        // producirse con la unidad TOTALMENTE detenida.
        if (cur.s > vel || r.s > vel) { ref = k; continue; }
        // El nivel sube o se mantiene: la referencia pasa a ser ESTA muestra
        // (la ultima estable), de modo que la ventana se mida desde el final
        // de la meseta y no desde su inicio (si no, una meseta larga hacia que
        // dt superase la ventana y la caida se perdiese).
        if (cur.fuel >= r.fuel) { ref = k; continue; }
        const caida = r.fuel - cur.fuel;
        const dt = cur.t - r.t;
        if (dt > win) { ref = k; continue; }   // caida demasiado lenta
        if (caida < th) continue;              // aun no llega al umbral
        const mot = (cur.motor == null) ? r.motor : cur.motor;
        if (motor === 'on' && mot !== true) { ref = k; continue; }
        if (motor === 'off' && mot !== false) { ref = k; continue; }
        // Anti-rebote: si en la ventana siguiente el nivel vuelve a la banda
        // alta, era un pico del sensor y no una perdida real.
        let rebote = false;
        for (let j = k + 1; j < arr.length; j++) {
            if (arr[j].t - cur.t > win) break;
            if (arr[j].fuel >= r.fuel - th / 2) { rebote = true; break; }
        }
        if (!rebote) {
            out.push({
                desde: r.t, hasta: cur.t, litros: caida, min: Math.round(dt / 60),
                vel: Math.max(0, Math.round(r.s)), lat: cur.lat, lon: cur.lon, motor: mot
            });
            if (out.length >= RX_FUEL_MAX_EV) break;
        }
        ref = k;
    }
    return rxFuelAgrupa(out, o);
}
// ── Descarga del historial (paginada) ───────────────────────────────────
async function rxFuelFetch(uid, desde, hasta, token) {
    const msgs = [];
    let t0 = desde;
    for (let pag = 0; pag < RX_FUEL_PAGS; pag++) {
        if (token && token.cancelado) break;
        const r = await remoteCall('messages/load_interval', {
            itemId: uid, timeFrom: t0, timeTo: hasta,
            // flagsMask 0xFF00 + flags 0 = "todos los mensajes con datos"
            // (incluye la posicion y los parametros p de los sensores, que con
            // el filtro de posicion se quedaban fuera).
            flags: 0, flagsMask: 0xFF00, loadCount: RX_FUEL_MSGS
        });
        const parte = (r && r.messages) || [];
        if (!parte.length) break;
        let ult = 0;
        for (const m of parte) { const t = Number(m && m.t) || 0; if (t > ult) ult = t; }
        msgs.push.apply(msgs, parte);
        if (parte.length < RX_FUEL_MSGS || !ult || ult <= t0) break;
        t0 = ult + 1;
    }
    return msgs;
}
// ── Formato de salida ───────────────────────────────────────────────────
function rxFuelFecha(seg) {
    try {
        const d = new Date((Number(seg) || 0) * 1000);
        const p2 = (x) => (x < 10 ? '0' + x : String(x));
        return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' +
            p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
    } catch (_) { return String(seg); }
}
function rxFuelZona(lat, lon) {
    if (lat == null || lon == null) return '';
    try { return (typeof zoneAt === 'function') ? (zoneAt(lat, lon) || '') : ''; } catch (_) { return ''; }
}
// ── Calibracion / diagnostico del sensor (pura) ─────────────────────────
// Metricas de una unidad a partir de sus muestras: distancia recorrida (con
// filtro de saltos GPS), nivel inicial/final, rango y numero de lecturas.
function rxFuelMetricas(muestras) {
    const arr = (muestras || []).slice().sort((a, b) => a.t - b.t);
    let km = 0, prev = null;
    for (const m of arr) {
        if (m.lat != null && m.lon != null) {
            if (prev) {
                let d = 0;
                try { d = (typeof haversine === 'function') ? haversine(prev.lat, prev.lon, m.lat, m.lon) : 0; } catch (_) { d = 0; }
                // Un salto de mas de 5 km entre reportes es GPS erratico, no
                // recorrido: no cuenta (mismo criterio que el odometro).
                if (d > 0 && d <= 5000) km += d;
            }
            prev = { lat: m.lat, lon: m.lon };
        }
    }
    // El nivel se mide sobre la serie SIN picos: si no, un pico aislado
    // dispara el rango y el veredicto del sensor.
    const vals = rxFuelLimpia(arr).map((m) => m.fuel).filter((v) => v != null);
    const n = vals.length;
    const ini = n ? vals[0] : null;
    const fin = n ? vals[n - 1] : null;
    let mn = null, mx = null;
    for (const v of vals) { if (mn == null || v < mn) mn = v; if (mx == null || v > mx) mx = v; }
    const drop = (ini != null && fin != null) ? (ini - fin) : null;  // >0 = bajo
    const l100 = (drop != null && km > 0) ? (drop / km) * 100 : null;
    return { km: km / 1000, n: n, ini: ini, fin: fin, min: mn, max: mx, rango: (mx != null && mn != null) ? (mx - mn) : 0, drop: drop, l100: l100 };
}
// Veredicto del sensor. Conservador a proposito: una recarga (el nivel sube)
// es normal, no un sensor alterado, y fluctuar no es defecto. Solo se marca
// DEFECTUOSO cuando el sensor esta claramente congelado (recorre km y el nivel
// no se mueve nada) o cuando el consumo es imposiblemente bajo.
function rxFuelVeredicto(met, opts) {
    const o = opts || {};
    const minKm = (Number(o.km) > 0) ? Number(o.km) : 20;
    const minL100 = (Number(o.l100) > 0) ? Number(o.l100) : 0;
    if (!met || !met.n) return { estado: 'Sin datos', detalle: 'no publica nivel de combustible', malo: false };
    if (met.n < 3) return { estado: 'Pocas muestras', detalle: 'solo ' + met.n + ' lectura(s)', malo: false };
    if (met.km < minKm) return { estado: 'OK', detalle: 'sin km suficientes para juzgar', malo: false };
    // Congelado: recorrio km y el nivel no se movio en absoluto.
    if (met.rango <= 0.6) return { estado: 'Defectuoso', detalle: 'nivel fijo con ' + rxInfFmt(met.km) + ' km', malo: true };
    // No bajo neto pese a recorrer: puede ser una recarga; se marca a revisar,
    // no defectuoso.
    if (met.drop != null && met.drop < -30) return { estado: 'Alterado', detalle: 'subio ' + rxInfFmt(-met.drop) + ' L con ' + rxInfFmt(met.km) + ' km', malo: true };
    if (met.drop != null && met.drop <= 0) return { estado: 'Revisar', detalle: 'no bajo con ' + rxInfFmt(met.km) + ' km', malo: true };
    if (minL100 > 0 && met.l100 != null && met.l100 < minL100) {
        return { estado: 'Revisar', detalle: 'consumo ' + rxInfFmt(met.l100) + ' L/100km (bajo)', malo: true };
    }
    return { estado: 'OK', detalle: '', malo: false };
}
// ── Ejecucion del reporte ───────────────────────────────────────────────
// `unidades` es la lista [{id, eco, u}] a barrer. Devuelve la forma que ya
// entiende la pantalla de informes (cols/filas/tablas/meta).
async function rxFuelCorre(unidades, desde, hasta, opts, onProg, token) {
    const t0 = Date.now();
    const lista = (unidades || []).slice(0, RX_FUEL_MAX_U);
    const filas = [];
    const sensores = [];
    const errores = [];
    let conSensor = 0, sinSensor = 0, hechas = 0, fallos = 0;
    const fecha = rxFuelFecha;
    // Catalogo de sensores de la flota: se pide una sola vez y sirve para
    // reconocer el sensor de combustible aunque el parametro del mensaje
    // llegue con una clave que no sea el nombre.
    let cat = {};
    try { cat = await rxFuelCatalogo(); } catch (_) { cat = {}; }
    for (const u of lista) {
        if (token && token.cancelado) break;
        const raw = u.u || u;
        // Catalogo de sensores: el de la flota si esta, si no el de la unidad.
        let sens = (cat[String(u.id)] && typeof cat[String(u.id)] === 'object') ? cat[String(u.id)] : null;
        if (!sens) {
            let rs = raw && (raw.sens || raw.sensors);
            if (typeof rs === 'string') { try { rs = JSON.parse(rs); } catch (_) { rs = null; } }
            if (rs && typeof rs === 'object') sens = rs;
        }
        const claves = rxFuelClaves(sens);
        // Clave manual: si el operador sabe como se llama el parametro del
        // nivel (el diagnostico lo muestra), se reconoce sin mas.
        if (opts && opts.sensor) claves[String(opts.sensor)] = 1;
        let msgs = [];
        try { msgs = await rxFuelFetch(u.id, desde, hasta, token); }
        catch (err) {
            if (errores.length < 5) errores.push((u.eco ? (u.eco + ': ') : '') + ((err && err.message) || err));
            hechas++;
            if (onProg) onProg(hechas, lista.length, filas.length, u.eco);
            continue;
        }
        const muestras = [];
        for (const m of msgs) { const x = rxFuelMsg(m, sens, claves); if (x) muestras.push(x); }
        if (muestras.some((m) => m.fuel != null)) conSensor++; else sinSensor++;
        // Diagnostico del sensor: distancia vs nivel (defectuoso/alterado).
        const met = rxFuelMetricas(muestras);
        const ver = rxFuelVeredicto(met, opts);
        // Sin nivel: se listan las claves de parametro vistas para poder
        // calibrar (si el sensor se llama distinto).
        let detalle = ver.detalle;
        if (!met.n) {
            const pv = rxFuelParamsVistos(msgs, 6);
            if (pv.length) detalle = 'sin nivel; params: ' + pv.join(', ');
        }
        if (ver.malo) fallos++;
        sensores.push([
            u.eco || String(u.id),
            rxInfFmt(met.km),
            (met.drop == null ? '-' : rxInfFmt(met.drop)),
            (met.l100 == null ? '-' : rxInfFmt(met.l100)),
            met.n,
            ver.estado,
            detalle
        ]);
        const evs = rxFuelDetecta(muestras, opts);
        for (const e of evs) {
            filas.push([
                u.eco || String(u.id),
                fecha(e.desde),
                rxInfFmt(e.litros),
                e.min,
                rxInfFmt(e.vel),
                (e.motor === true ? 'Encendido' : (e.motor === false ? 'Apagado' : '-')),
                (e.lat != null && e.lon != null) ? (e.lat.toFixed(5) + ', ' + e.lon.toFixed(5)) : '',
                rxFuelZona(e.lat, e.lon)
            ]);
            if (filas.length >= RX_FUEL_MAX_EV) break;
        }
        hechas++;
        if (onProg) onProg(hechas, lista.length, filas.length, u.eco);
        await (typeof rxGeoInfYield === 'function' ? rxGeoInfYield() : new Promise((x) => setTimeout(x, 0)));
    }
    filas.sort((a, b) => String(b[1]).localeCompare(String(a[1])));
    // Los peores sensores primero, para que el diagnostico salte a la vista.
    sensores.sort((a, b) => {
        const pa = /Defectuoso|Alterado/.test(a[5]) ? 0 : (/Revisar/.test(a[5]) ? 1 : 2);
        const pb = /Defectuoso|Alterado/.test(b[5]) ? 0 : (/Revisar/.test(b[5]) ? 1 : 2);
        return (pa - pb) || String(a[0]).localeCompare(String(b[0]), 'es');
    });
    // Tablas: las perdidas (si hay) y siempre el diagnostico de sensores.
    const tablas = [];
    if (filas.length) tablas.push({ idx: 0, name: 'perdidas', label: 'Perdidas', cols: RX_FUEL_COLS.slice(), filas: filas });
    tablas.push({ idx: tablas.length, name: 'sensores', label: 'Sensores', cols: RX_FUEL_SENS_COLS.slice(), filas: sensores });
    // Tabla activa: las perdidas si las hay; si no, el diagnostico.
    const activa = filas.length ? { cols: RX_FUEL_COLS.slice(), filas: filas } : { cols: RX_FUEL_SENS_COLS.slice(), filas: sensores };
    return {
        cols: activa.cols,
        filas: activa.filas,
        tablas: tablas,
        trozos: 0, hechos: hechas, objetos: lista.length, alcance: 'fuel',
        fallos: errores.length, errores: errores, cacheados: 0, lleno: false,
        conSensor: conSensor, sinSensor: sinSensor, sensoresFallo: fallos, ms: Date.now() - t0
    };
}
// Etiqueta de la plantilla integrada (aparece en la lista de la pantalla).
const RX_FUEL_TPL = { rid: '__fuel__', id: '__fuel__', nombre: 'Perdida de combustible', fuel: true };
function rxFuelEsTpl(tpl) { return !!(tpl && tpl.fuel); }
// Mejor plantilla de la plataforma que parece de combustible (fallback cuando
// ninguna unidad publica sensor de nivel).
function rxFuelTplCombustible(plantillas) {
    const re = /(COMBUSTIBLE|FUEL|CONSUMO|TANQUE|DIESEL|GASOLINA|RELLENO|CARGA)/i;
    return (plantillas || []).filter((t) => t && !t.fuel && re.test(String(t.nombre)))[0] || null;
}
// ── Descargas de la PLATAFORMA ──────────────────────────────────────────
// El mejor detector de descargas es el de la propia plataforma: sus informes
// con la tabla de nivel de combustible calculan llenados/descargas con la
// configuracion real del sensor (p. ej. "DIESEL TOTAL"), columnas tipo
// "Nivel de combustible inicial/final" y "Descargado".
//
// Aqui se busca, entre las plantillas del operador, una que traiga esa tabla y
// se ejecuta con el MISMO motor de informes (rxInfCorre). Asi el resultado del
// informe de combustible es el de la plataforma, no una relectura del sensor.
// Se reconoce la tabla por su nombre, su etiqueta o sus columnas.
function rxFuelTablaDescarga(info) {
    const tablas = (info && info.tablas) ? info.tablas : [];
    for (const tb of tablas) {
        const txt = norm([tb.n, tb.l, (tb.etiquetas || []).join(' '), (tb.claves || []).join(' ')].join(' '));
        if (/(DESCARG|THEFT|NIVEL[_\s]*DE[_\s]*COMBUSTIBLE|COMBUSTIBLE[_\s]*(INICIAL|FINAL)|INITIAL[_\s]*FUEL|FINAL[_\s]*FUEL|BEGIN[_\s]*BALANCE|END[_\s]*BALANCE|FUEL[_\s]*LEVEL|LLENADO|FILLING)/.test(txt)) return tb;
    }
    return null;
}
// Busca la plantilla de descargas (una sola vez por lista de plantillas).
// Devuelve { tpl, info, tabla } o null. Cachea el resultado en RX_INF.fuel._desc
// (undefined = no buscado aun).
async function rxFuelTplDescarga(plantillas) {
    if (RX_INF.fuel._desc !== undefined) return RX_INF.fuel._desc;
    const lista = (plantillas || []).filter((t) => t && !t.fuel);
    const re = /FUEL|COMBUSTIBLE|COMB|DIESEL|GASOLINA|DESCARGA|ROBO|TANQUE|CONSUMO|RELLENO|LLENADO|CARGA/i;
    const prio = lista.filter((t) => re.test(String(t.nombre)));
    const orden = prio.concat(lista.filter((t) => prio.indexOf(t) < 0));
    RX_INF.fuel._desc = null;
    for (const t of orden.slice(0, 60)) {
        let info = null;
        try { info = rxInfPlantillaInfo(await rxInfDatosPlantilla(t), t.id); } catch (_) { info = null; }
        if (!info) continue;
        // La tabla de nivel de combustible es POR UNIDAD. Una plantilla de
        // geocercas que tambien traiga alguna columna de combustible se
        // descarta: ejecutarla por geocerca da "code 4".
        if (info.esGeo) continue;
        const tb = rxFuelTablaDescarga(info);
        if (tb) { RX_INF.fuel._desc = { tpl: t, info: info, tabla: tb }; break; }
    }
    return RX_INF.fuel._desc;
}
function rxFuelUsaPlataforma() {
    return RX_INF.fuel.fuente !== 'sensor' && !!RX_INF.fuel._desc;
}
// ── Descargas de la plataforma: filas con unidad, ubicacion y duracion ──
const RX_FUEL_DESC_COLS = ['Unidad', 'Ubicaci\u00f3n', 'Coordenadas', 'Inicio', 'Fin', 'Duraci\u00f3n', 'Litros', 'Nivel inicial', 'Nivel final', 'Sensor'];
// Fecha/hora tolerante: "AAAA-MM-DD HH:MM:SS", "DD/MM/AAAA HH:MM:SS" o ISO.
function rxFuelParseFecha(s) {
    if (s == null) return null;
    const t = String(s).trim();
    if (!t) return null;
    let m = t.match(/(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
    m = t.match(/(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0)).getTime();
    const d = new Date(t);
    return isFinite(d.getTime()) ? d.getTime() : null;
}
// Indices de las columnas de la tabla de descargas (por etiqueta o clave
// interna: Comienzo/Hora, Descargado, Nivel inicial/final, Sensor...).
function rxFuelMapeaColsDescarga(cols) {
    const out = { ini: -1, fin: -1, ubi: -1, litros: -1, iniNiv: -1, finNiv: -1, sensor: -1, vel: -1 };
    (cols || []).forEach((c, i) => {
        const n = rxInfNombreCol(c);
        if (out.ini < 0 && /^(COMIENZ|COMENZ|TIME_BEGIN|TIME BEGIN|TIEMPO_INICIO|FECHA_INICIO|INICIO)/.test(n)) out.ini = i;
        if (out.fin < 0 && /^(HORA|TIME_END|TIME END|TIEMPO_FIN|FECHA_FIN|FIN)/.test(n)) out.fin = i;
        if (out.ubi < 0 && /(UBICACI|LOCATION|POSICION|LUGAR|DIRECCI|ADDRESS)/.test(n)) out.ubi = i;
        if (out.litros < 0 && /(DESCARG|THEFT|VOLUMEN|LITROS|CONSUMID|FILLED|LLENADO)/.test(n)) out.litros = i;
        if (out.iniNiv < 0 && /(NIVEL.*INICIAL|COMBUSTIBLE.*INICIAL|FUEL.*LEVEL.*BEGIN|BEGIN.*BALANCE)/.test(n)) out.iniNiv = i;
        if (out.finNiv < 0 && /(NIVEL.*FINAL|COMBUSTIBLE.*FINAL|FUEL.*LEVEL.*(END|THEFTED)|END.*BALANCE)/.test(n)) out.finNiv = i;
        if (out.sensor < 0 && /SENSOR/.test(n)) out.sensor = i;
        if (out.vel < 0 && /(VELOCIDAD|SPEED)/.test(n)) out.vel = i;
    });
    return out;
}
// La tabla de descargas dentro de lo que devolvio una ejecucion.
function rxFuelTablaSalida(r) {
    const tabs = (r && r.tablas) ? r.tablas : [];
    for (const t of tabs) {
        if (/THEFT|DESCARG/i.test(String(t.name || '') + ' ' + String(t.label || ''))) return t;
    }
    if (tabs.length) return tabs[0];
    return (r && r.cols && r.cols.length)
        ? { cols: r.cols, filas: r.filas || [], name: 'descargas', label: 'Descargas' } : null;
}
// Corre la plantilla de descargas POR UNIDAD y arma las filas con lo que pide
// el operador: unidad, ubicacion, dia/hora de inicio y fin, duracion y litros.
async function rxFuelCorrePlataforma(tpl, unidades, desde, hasta, def, onProg, token) {
    const t0 = Date.now();
    const lista = (unidades || []).slice(0, RX_FUEL_MAX_U);
    const filas = [];
    const errores = [];
    const trozos = rxGeoInfTrozos(desde, hasta, RX_INF_DIAS_TROZO * 86400).slice(0, RX_INF_MAX_TROZOS);
    let hechas = 0, fallos = 0, conDatos = 0;
    for (const u of lista) {
        if (token && token.cancelado) break;
        let nUni = 0;
        for (const tr of trozos) {
            if (token && token.cancelado || filas.length >= RX_FUEL_MAX_EV) break;
            let r;
            try { r = await rxInfEjecuta(tpl, { id: u.id, sec: '0' }, tr[0], tr[1], token, 0, def); }
            catch (e) {
                fallos++;
                if (errores.length < 5) errores.push((u.eco ? (u.eco + ': ') : '') + ((e && e.message) || e));
                continue;
            }
            if (r.error && r.error !== 'cancelado') {
                fallos++;
                if (errores.length < 5) errores.push((u.eco ? (u.eco + ': ') : '') + rxInfExplicaError(r.error));
                continue;
            }
            const tb = rxFuelTablaSalida(r);
            if (!tb) continue;
            const idx = rxFuelMapeaColsDescarga(tb.cols || []);
            const coords = tb.coords || [];
            for (let fi = 0; fi < (tb.filas || []).length; fi++) {
                const f = tb.filas[fi];
                const cel = (k) => (idx[k] >= 0 && f[idx[k]] != null) ? String(f[idx[k]]) : '';
                const inicio = cel('ini'), fin = cel('fin');
                const ms0 = rxFuelParseFecha(inicio), ms1 = rxFuelParseFecha(fin);
                const dur = (ms0 != null && ms1 != null && ms1 >= ms0) ? (ms1 - ms0) / 1000 : null;
                // Coordenadas de la celda de ubicacion (vienen en y/x).
                let coord = '';
                const cr = coords[fi] || [];
                const c = (idx.ubi >= 0 ? cr.filter((x) => x.i === idx.ubi)[0] : null) || cr[0];
                if (c) coord = c.lat.toFixed(5) + ', ' + c.lon.toFixed(5);
                filas.push([
                    u.eco || String(u.id), cel('ubi'), coord, inicio, fin,
                    (dur != null ? rxInfFmtDur(dur) : '-'), cel('litros'),
                    cel('iniNiv'), cel('finNiv'), cel('sensor')
                ]);
                nUni++;
                if (filas.length >= RX_FUEL_MAX_EV) break;
            }
        }
        if (nUni) conDatos++;
        hechas++;
        if (onProg) onProg(hechas, lista.length, filas.length, u.eco);
        await (typeof rxGeoInfYield === 'function' ? rxGeoInfYield() : new Promise((x) => setTimeout(x, 0)));
    }
    filas.sort((a, b) => String(b[3]).localeCompare(String(a[3])));
    return {
        cols: RX_FUEL_DESC_COLS.slice(), filas: filas,
        tablas: filas.length ? [{ idx: 0, name: 'descargas', label: 'Descargas', cols: RX_FUEL_DESC_COLS.slice(), filas: filas }] : [],
        trozos: trozos.length, hechos: hechas, objetos: lista.length, alcance: 'plataforma',
        fallos: fallos, errores: errores, cacheados: 0, lleno: filas.length >= RX_FUEL_MAX_EV,
        conSensor: conDatos, sinSensor: lista.length - conDatos, ms: Date.now() - t0
    };
}
// Unidades a barrer cuando el alcance es "toda la flota". Conserva la
// referencia a la unidad cruda para leer su catalogo de sensores y el nombre
// completo (para el filtro por marca).
function rxFuelUnidadesTodas(desde) {
    const out = [];
    for (const u of (APP.unidades || [])) {
        if (!u || u.id == null) continue;
        let info = null;
        try { info = parseUnitName(u); } catch (_) { info = null; }
        let t = 0;
        try { t = (typeof unitState === 'function' ? (unitState(u).t || 0) : 0); } catch (_) { t = 0; }
        if (t > 0 && desde > 0 && t < desde) continue;
        out.push({
            id: String(u.id), eco: (info && (info.eco || info.clave)) || String(u.id),
            nombre: String(u.nm || u.name || ''), u: u, t: t
        });
    }
    out.sort((a, b) => (b.t || 0) - (a.t || 0));
    return out;
}
// Filtro por marca de sensor en el nombre de la unidad (p. ej. "(SC)"): solo
// se barren las unidades que la llevan, asi no se consulta toda la flota.
// Sin marca, pasan todas.
function rxFuelTieneMarca(o, marca) {
    const m = norm(marca || '');
    if (!m) return true;
    const raw = (o && o.u) || o || {};
    const txt = norm(String(raw.nm || raw.name || '') + ' ' + String((o && o.eco) || raw.nm || ''));
    return txt.indexOf(m) >= 0;
}
function rxFuelFiltraMarca(lista, marca) {
    const m = norm(marca || '');
    if (!m) return lista || [];
    return (lista || []).filter((o) => rxFuelTieneMarca(o, marca));
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
                    if (sel.has(clave) || sel.has(info.eco) || sel.has(String(info.id))) out.push({ id: u.id, eco: info.eco || clave, rid: RX_INF.tpl ? RX_INF.tpl.rid : null, u: u });
                }
                return out;
            };
            const listaTpl = () => {
                const q = norm(RX_INF.busca || '');
                if (!q) return plantillas;
                // La plantilla integrada (combustible) siempre se ofrece.
                return plantillas.filter((t) => t.fuel || norm(t.nombre).indexOf(q) >= 0);
            };
            // Etiqueta secundaria de una plantilla en la lista.
            const tplSub = (t) => (t && t.fuel) ? 'reporte integrado' : ('#' + (t ? t.id : ''));
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
                if (rxFuelEsTpl(RX_INF.tpl)) {
                    return '<div class="rgi-sonda"><div class="rgi-sonda-t"><b>Perdida de combustible</b>' +
                        '<span>reporte integrado</span></div>' +
                        '<div class="rgi-campos"><span class="rgi-campo t-texto">Caidas de nivel con la unidad detenida</span>' +
                        '<span class="rgi-campo">10 L en 2 min (ajustable)</span>' +
                        '<span class="rgi-campo">Motor encendido o apagado</span>' +
                        '<span class="rgi-campo t-numero">Sensor de nivel de la plataforma</span></div></div>';
                }
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
                // Unidades del alcance que pasan el filtro de marca (sensor)
                // del reporte de combustible, para ensenar cuantas se barren.
                const nUnMarca = rxFuelFiltraMarca(
                    (RX_INF.alcance === 'sel') ? unidadesSel() : rxFuelUnidadesTodas(0),
                    RX_INF.fuel.marca).length;
                const nBase = (RX_INF.alcance === 'sel') ? nUn : (APP.unidades || []).length;
                const busy = !!RX_INF._buscando;
                const dis = busy ? ' disabled' : '';
                const hay = (RX_INF.cols || []).length > 0;
                const esFuel = rxFuelEsTpl(tpl);
                const hero = '<div class="rgi-hero"><span class="rgi-heroico rondo-usym">' + UIS.export + '</span>' +
                    '<div class="rgi-herot"><b>' + esc(tpl ? tpl.nombre : 'Informes de la plataforma') + '</b>' +
                    '<span>' + esc(tpl
                        ? (esFuel
                            ? 'Busca caidas de nivel con la unidad detenida (motor encendido o apagado)'
                            : 'Ejecutada por report/exec_report, en trozos de ' + RX_INF_DIAS_TROZO + ' d\u00edas para no chocar con el l\u00edmite de tiempo')
                        : 'Elige una plantilla de las que ya tienes en AE-Track') + '</span></div>' +
                    (tpl ? '<i class="rgi-ori' + (esFuel ? ' o-app' : '') + '">' + (esFuel ? 'Integrado' : 'API') + '</i>' : '') + '</div>';
                // Paso 1: plantilla.
                const listaHtml = '<div class="rgi-tpls" id="rgi-lista">' + (plantillas.length
                    ? lista.map((t) => '<div class="rgi-tpl' + (rxInfClave(t) === rxInfClave(tpl) ? ' activo' : '') + '">' +
                        '<button type="button" class="rgi-tpl-sel" data-tpl="' + esc(rxInfClave(t)) + '"' + dis + '>' +
                        '<b>' + esc(t.nombre) + '</b><i>' + esc(tplSub(t)) + '</i></button>' +
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
                        esc(esFuel
                            ? 'Se recorre el historial de cada unidad; con flotas grandes acota el periodo o las unidades.'
                            : 'La plantilla se ejecuta unidad por unidad y por trozos; el resultado se une.') + '</span></div>');
                }
                // Paso 4a: opciones del reporte de combustible (umbral, ventana
                // y estado del motor). Solo cuando la plantilla es la integrada.
                let pasoFuel = '';
                if (esFuel) {
                    const desc = RX_INF.fuel._desc || null;
                    const usarPlat = rxFuelUsaPlataforma();
                    const fSrc = (val, txt) => '<button type="button" class="rgi-chip' +
                        (RX_INF.fuel.fuente === val ? ' activo' : '') + '" data-fuelsrc="' + esc(val) + '"' + dis + '>' + esc(txt) + '</button>';
                    const filaFuente = '<div class="rgi-row"><span class="rgi-lb">Fuente</span><div class="rgi-chips">' +
                        fSrc('plataforma', 'Plataforma (descargas)') + fSrc('sensor', 'Sensor (propio)') + '</div></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        esc(desc
                            ? ('Descargas calculadas por el informe "' + desc.tpl.nombre + '" de la plataforma (su sensor de nivel).')
                            : 'No se encontro una plantilla de combustible en la plataforma: se usara el detector propio del sensor.') +
                        '</span></div>';
                    const fOption = (val, txt) => '<button type="button" class="rgi-chip' +
                        (RX_INF.fuel.motor === val ? ' activo' : '') + '" data-fuelmotor="' + esc(val) + '"' + dis + '>' + esc(txt) + '</button>';
                    // El filtro por marca (unidades con sensor, p. ej. "(SC)")
                    // aplica a LAS DOS fuentes: plataforma y sensor propio.
                    const filaMarca = '<div class="rgi-row"><span class="rgi-lb">Sensor</span>' +
                        '<span class="rgi-busca" style="flex:0 0 auto"><span class="rondo-usym">' + UIS.filter + '</span>' +
                        '<input type="text" id="rgi-fuel-marca" class="filtro" style="min-width:96px" placeholder="(SC)" value="' + esc(RX_INF.fuel.marca || '') + '" title="Solo se revisan unidades cuyo nombre contenga esta marca" ' + dis + '>' +
                        '<i>' + esc(String(nUnMarca)) + '/' + esc(String(nBase)) + '</i></span>' +
                        (usarPlat ? '' : '<span class="rgi-num">clave <input type="text" id="rgi-fuel-sensor" style="width:96px" placeholder="auto" value="' + esc(RX_INF.fuel.sensor || '') + '" title="Clave o nombre exacto del parametro de nivel (si la autodeteccion falla)" ' + dis + '></span>') +
                        '<span class="rgi-gen-hint">' + esc(usarPlat
                            ? 'Solo se barren las unidades marcadas (ej. "(SC)"). La plataforma mide TODOS los sensores de combustible de la unidad.'
                            : 'Solo se barren las unidades marcadas (ej. "(SC)"). "clave" fuerza el parametro de nivel si el sensor tiene otro nombre.') +
                        '</span></div>';
                    const opcionesSensor = usarPlat ? '' :
                        ('<div class="rgi-row"><span class="rgi-lb">Caida</span>' +
                        '<span class="rgi-num"><input type="number" min="1" step="1" id="rgi-fuel-litros" value="' + esc(String(RX_INF.fuel.litros)) + '"' + dis + '> litros</span>' +
                        '<span class="rgi-num">en <input type="number" min="1" max="60" step="1" id="rgi-fuel-min" value="' + esc(String(RX_INF.fuel.min)) + '"' + dis + '> min</span>' +
                        '<span class="rgi-num">parada a <input type="number" min="0" max="40" step="1" id="rgi-fuel-vel" value="' + esc(String(RX_INF.fuel.vel)) + '"' + dis + '> km/h</span></div>' +
                        '<div class="rgi-row"><span class="rgi-lb">Calibrar</span>' +
                        '<span class="rgi-num">defectuoso si recorre <input type="number" min="1" max="2000" step="1" id="rgi-fuel-km" value="' + esc(String(RX_INF.fuel.km)) + '"' + dis + '> km sin bajar</span>' +
                        '<span class="rgi-num">consumo min <input type="number" min="0" max="100" step="0.1" id="rgi-fuel-l100" value="' + esc(String(RX_INF.fuel.l100)) + '"' + dis + '> L/100km</span></div>' +
                        '<div class="rgi-row"><span class="rgi-lb">Motor</span><div class="rgi-chips">' +
                        fOption('todos', 'Da igual') + fOption('on', 'Encendido') + fOption('off', 'Apagado') + '</div></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        esc('Cuenta la caida de nivel con la unidad totalmente detenida (motor encendido o apagado). Perdida de referencia: 10 litros en 1-2 minutos. La pestana Sensores marca los sensores defectuosos o alterados.') +
                        '</span></div>');
                    pasoFuel = paso(4, 'Perdida de combustible', filaFuente + filaMarca + opcionesSensor);
                }
                // Paso 4: filtros de la plantilla (todo lo que admite, menos
                // los ajustes de formato). Es lo que antes no se podia tocar.
                const filtrosKeys = rxInfFiltrosDe(RX_INF.decl);
                let pasoFiltros = '';
                if (tpl && !esFuel && filtrosKeys.length) {
                    pasoFiltros = paso(4, 'Filtros de la plantilla',
                        '<div class="rgi-filtros">' +
                        filtrosKeys.map((k) => '<label class="rgi-filtro">' +
                            '<b>' + esc(k) + '</b>' +
                            '<input type="text" class="filtro" data-filtro="' + esc(k) + '" value="' +
                            esc(rxInfFiltroValor(RX_INF.decl, k)) + '" placeholder="' + esc(rxInfFiltroPista(k)) + '"' + dis + '></label>').join('') +
                        '</div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        esc('Aceptan ids o nombres separados por comas (ej. "CDOS.4286, 105"). Los ajustes de la plataforma (address_format, us_units, averaging...) no filtran nada y no se listan.') +
                        '</span></div>');
                }
                const nRes = (esFuel || filtrosKeys.length) ? 5 : 4;
                // Avisos.
                const avisos = [];
                if (RX_INF.alcance === 'sel' && !nUn && !esGeo) avisos.push(esc('No hay unidades seleccionadas: usa "Toda la flota" o selecciona unidades en la lista.'));
                if (RX_INF.meta && RX_INF.meta.fallos) avisos.push(esc(RX_INF.meta.fallos + ' trozo(s) fallaron: ' + ((RX_INF.meta.errores || [])[0] || 'error desconocido')));
                if (RX_INF.meta && RX_INF.meta.recortado) avisos.push(esc('Se ejecutaron ' + RX_INF_MAX_OBJETOS + ' objetos como m\u00e1ximo. Marca en el paso 3 las geocercas que te interesen para ajustarlo.'));
                if (RX_INF.meta && RX_INF.meta.bloqueado) avisos.push(esc('La plataforma est\u00e1 rechazando la ejecuci\u00f3n (' + RX_INF.meta.fallos + ' trozos seguidos con el mismo error). Se ha parado.'));
                if (RX_INF.meta && RX_INF.meta.lleno) avisos.push(esc('Se alcanz\u00f3 el tope de ' + Math.round(RX_INF_MAX_FILAS / 1000) + 'k filas: acorta el periodo.'));
                if (hay) {
                    const vacias = rxInfColumnasVacias(v.cols, v.filas);
                    if (!esFuel && vacias.length && vacias.length < v.cols.length) {
                        avisos.push(esc('Columnas sin datos: ' + vacias.slice(0, 4).join(', ') +
                            '. Suele ser que a la plantilla le falta un filtro que solo puedes poner en la plataforma.'));
                    }
                }
                // Combustible sin sensor: se avisa y se ofrece la plantilla de
                // combustible de la plataforma como respaldo.
                if (esFuel && RX_INF.fuelSinSensor) {
                    const ft = rxFuelTplCombustible(plantillas);
                    avisos.push(esc('Ninguna unidad del alcance publica nivel de combustible (sensor). Prueba otras unidades o ejecuta una plantilla de combustible.') +
                        (ft ? ' <button type="button" class="mini" id="rgi-fuel-tpl" data-tpl="' + esc(rxInfClave(ft)) + '">usar "' + esc(ft.nombre) + '"</button>' : ''));
                }
                // Sensores defectuosos/alterados (no bajan caminando).
                if (esFuel && RX_INF.meta && RX_INF.meta.sensoresFallo) {
                    avisos.push(esc(RX_INF.meta.sensoresFallo + ' sensor(es) defectuoso(s) o alterado(s): recorre km y el nivel no baja. Mira la pesta\u00f1a "Sensores".'));
                }
                // Fuente plataforma: se dice que plantilla del operador calculo
                // las descargas.
                if (esFuel && RX_INF.fuelPlat) {
                    avisos.push(esc('Descargas calculadas por la plataforma (plantilla "' + RX_INF.fuelPlat + '").'));
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
                      '<i>' + esc(esFuel ? ('historial unidad por unidad') : (nTrozos + ' trozos de ' + RX_INF_DIAS_TROZO + ' d\u00edas')) + '</i></button>';
                const barraEjec = '<div class="rgi-generar">' + ejecutar +
                    '<span class="rgi-gen-hint">' + esc(tpl
                        ? (busy ? 'Calculando\u2026 puedes cancelar cuando quieras.'
                            : (esFuel ? 'Se descarga el historial de cada unidad y se detectan las caidas; puede tardar en flotas grandes.'
                                : 'La plataforma calcula cada trozo; el resultado se guarda en este navegador.'))
                        : 'Selecciona una plantilla para empezar.') + '</span></div>';
                // Progreso dentro del cuerpo.
                const prog = RX_INF.prog && RX_INF.prog.activo
                    ? '<div class="rgi-carga" id="rgi-prog" style="display:flex">' +
                      '<span id="rgi-prog-t">' + esc(RX_INF.prog.txt || 'Calculando\u2026') + '</span>' +
                      '<span class="rgi-barra"><i id="rgi-prog-b" style="width:' +
                        Math.max(2, RX_INF.prog.pct || 0) + '%"></i></span></div>'
                    : '';
                // Resultados: pestanas de tabla, filtro de unidades tipo
                // Excel, selector de columnas y filtro de texto.
                let barraVista = '';
                if (hay) {
                    const tabs = (RX_INF.tablas && RX_INF.tablas.length > 1)
                        ? '<div class="rgi-row"><span class="rgi-lb">Tabla</span><div class="rgi-chips rgi-tabs">' +
                          RX_INF.tablas.map((t) => '<button type="button" class="rgi-chip' +
                              (((RX_INF.tablaSel == null && t === RX_INF.tablas[0]) || RX_INF.tablaSel === t.idx) ? ' activo' : '') +
                              '" data-tab="' + esc(String(t.idx)) + '"' + dis + '>' + esc(t.label || t.name || ('Tabla ' + t.idx)) +
                              '<i>' + (t.filas || []).length + '</i></button>').join('') + '</div></div>' : '';
                    // Unidades presentes en la tabla activa (como un Excel).
                    let unis = '';
                    if (v.iUni >= 0) {
                        const setU = {};
                        (RX_INF.filas || []).forEach((f) => {
                            const u = String(f[v.iUni] == null ? '' : f[v.iUni]).trim();
                            if (u) setU[u] = 1;
                        });
                        let lista = Object.keys(setU).sort((a, b) => String(a).localeCompare(String(b), 'es'));
                        const q = norm(RX_INF.uniBusca || '');
                        if (q) lista = lista.filter((u) => norm(u).indexOf(q) >= 0);
                        const marcadas = Object.keys(RX_INF.uniSel || {}).filter((k) => RX_INF.uniSel[k]).length;
                        unis = '<div class="rgi-row"><span class="rgi-lb">Unidades</span><span class="rgi-busca">' +
                            '<span class="rondo-usym">' + UIS.filter + '</span>' +
                            '<input type="text" id="rgi-uni-busca" class="filtro" placeholder="Buscar unidad\u2026" value="' + esc(RX_INF.uniBusca || '') + '"' + dis + '>' +
                            '<i>' + (marcadas ? (marcadas + ' de ' + Object.keys(setU).length) : Object.keys(setU).length) + '</i></span>' +
                            (marcadas ? '<button type="button" class="mini" id="rgi-uni-limpiar"' + dis + '>limpiar</button>' : '') + '</div>' +
                            '<div class="rgi-row"><span class="rgi-lb"></span><div class="rgi-unis" id="rgi-unis">' +
                            lista.map((u) => '<button type="button" class="rgi-chip' + (RX_INF.uniSel[u] ? ' activo' : '') +
                                '" data-uni="' + esc(u) + '"' + dis + '>' + esc(u) + '</button>').join('') +
                            '</div></div>';
                    }
                    // Columnas: se pueden ocultar (como un Excel).
                    const colsVis = '<div class="rgi-row"><span class="rgi-lb">Columnas</span><div class="rgi-unis">' +
                        (v.cols || []).map((c, i) => '<button type="button" class="rgi-chip' +
                            (RX_INF.colsOcultas[i] ? '' : ' activo') + '" data-colvis="' + i + '"' + dis +
                            ' title="Mostrar u ocultar esta columna">' + esc(c) + '</button>').join('') + '</div></div>';
                    barraVista = paso(nRes, 'Resultados', tabs + unis + colsVis +
                        '<div class="rgi-row"><span class="rgi-lb">Ver</span><div class="rgi-chips">' +
                        '<button type="button" class="rgi-chip' + (RX_INF.vista !== 'unidad' ? ' activo' : '') + '" data-i="vista" data-v="filas"' + dis + '>Filas</button>' +
                        '<button type="button" class="rgi-chip' + (RX_INF.vista === 'unidad' ? ' activo' : '') + '" data-i="vista" data-v="unidad"' + dis + '>Resumen por unidad</button>' +
                        (v.iUni >= 0 ? '<button type="button" class="rgi-chip' + (RX_INF.conductor ? ' activo' : '') + '" id="rgi-conductor"' + dis +
                            ' title="Anade el conductor asignado a cada unidad (dato actual de la plataforma)">+ Conductor</button>' : '') +
                        '</div><span class="rgi-busca" style="margin-left:auto"><span class="rondo-usym">' + UIS.filter + '</span>' +
                        '<input type="text" id="rgi-q" class="filtro" placeholder="Filtrar filas\u2026" value="' + esc(RX_INF.q || '') + '"' + dis + '></span></div>');
                }
                const kpis = hay ? '<div class="rgi-kpis">' +
                    '<div class="rgi-kpi ok"><b>' + v.total + '</b><span>' + (esFuel ? 'Eventos' : 'Filas') + '</span></div>' +
                    (v.iUni >= 0 ? '<div class="rgi-kpi"><b>' + v.unidades + '</b><span>Unidades</span></div>' : '') +
                    (v.iZona >= 0 ? '<div class="rgi-kpi"><b>' + v.zonas + '</b><span>Geocercas</span></div>' : '') +
                    (esFuel
                        ? '<div class="rgi-kpi"><b>' + esc(String(RX_INF.fuel.litros)) + ' L/' + esc(String(RX_INF.fuel.min)) + 'm</b><span>Umbral</span></div>'
                        : '<div class="rgi-kpi"><b>' + v.meta.trozos + '</b><span>Trozos</span></div>') +
                    (esFuel && v.meta.sensoresFallo ? '<div class="rgi-kpi vivo"><b>' + v.meta.sensoresFallo + '</b><span>Sensores mal</span></div>' : '') +
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
                    paso2 + paso3 + pasoFuel + pasoFiltros + barraEjec +
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
                // La plantilla integrada de combustible va primero: es el
                // "reporte extra" del dialogo.
                plantillas = [RX_FUEL_TPL].concat(plantillas);
                RX_INF._cargadas = true;
                // La lista cambio: la busqueda de la plantilla de descargas se
                // rehace.
                RX_INF.fuel._desc = undefined;
                if (!RX_INF.tpl && plantillas.length) { RX_INF.tpl = plantillas[0]; rxInfFiltrosCargar(); }
                RX_INF._buscando = false;
                pinta();
                if (plantillas.length > 1 && !ok) adviceWarn('Sin plantillas', 'No se pudieron leer las plantillas de la plataforma.');
                if (RX_INF.tpl) declara();
            };
            // Lee lo que declara la plantilla (columnas, tipo, filtros).
            const declara = async () => {
                if (!RX_INF.tpl) return;
                // La plantilla integrada no se lee de la plataforma: se busca
                // una plantilla de descargas (nivel de combustible) del
                // operador para usar SU deteccion.
                if (rxFuelEsTpl(RX_INF.tpl)) {
                    RX_INF.decl = null; RX_INF._declKey = 'fuel';
                    try { await rxFuelTplDescarga(plantillas); } catch (_) { /* noop */ }
                    pinta();
                    return;
                }
                const t = RX_INF.tpl;
                const key = 'decl|' + rxInfClave(t);
                if (RX_INF._declKey === key) return;
                RX_INF.decl = null;
                let info = null;
                try { info = rxInfPlantillaInfo(await rxInfDatosPlantilla(t), t.id); } catch (_) { info = null; }
                if (RX_INF.tpl && rxInfClave(RX_INF.tpl) !== rxInfClave(t)) return;
                RX_INF.decl = info;
                RX_INF._declKey = key;
                // Con la declaracion se saben los filtros: se precargan los
                // items (grupos/conductores/remolques) para poder resolverlos
                // por nombre, no solo por id.
                try { if (info) await rxInfPrecargaItems(info); } catch (_) { /* noop */ }
                if (RX_INF.tpl && rxInfClave(RX_INF.tpl) !== rxInfClave(t)) return;
                pinta();
            };
            const ejecutar = async () => {
                leeFechas();
                if (!RX_INF.tpl) { adviceWarn('Sin plantilla', 'Elige una plantilla del informe.'); return; }
                if (RX_INF._buscando) return;
                const r = rangoS();
                if (!(r.hasta > r.desde)) { adviceWarn('Rango inv\u00e1lido', 'El fin debe ser posterior al inicio.'); return; }
                const esFuel = rxFuelEsTpl(RX_INF.tpl);
                const esGeo = rxInfEsDeGeocercas();
                const sel = (!esGeo && RX_INF.alcance === 'sel') ? unidadesSel() : null;
                if (!esFuel && !esGeo && RX_INF.alcance === 'sel' && (!sel || !sel.length)) {
                    adviceWarn('Sin unidades', 'Selecciona unidades en la lista o elige "Toda la flota".');
                    return;
                }
                RX_INF.fuelSinSensor = false;
                RX_INF._buscando = true;
                RX_INF._token = { cancelado: false };
                RX_INF.prog = { activo: true, hechas: 0, total: 0, filas: 0, txt: 'Preparando\u2026', pct: 4 };
                pinta();
                setProg(4, 'Preparando\u2026');
                let res;
                try {
                    if (esFuel && rxFuelUsaPlataforma()) {
                        // Descargas detectadas por la plataforma: se ejecuta SU
                        // plantilla SOLO con la tabla de descargas y POR UNIDAD,
                        // y se arman las filas con unidad, ubicacion, fecha/hora
                        // y duracion.
                        const desc = RX_INF.fuel._desc;
                        RX_INF.zonas = []; RX_INF.eco = ''; RX_INF.filtros = {};
                        let defThefts = null;
                        try {
                            const datos = await rxInfDatosPlantilla(desc.tpl);
                            defThefts = rxInfDefSoloTablas(datos, desc.tpl.id, ['unit_thefts']);
                        } catch (_) { defThefts = null; }
                        const baseUn = (RX_INF.alcance === 'sel') ? (sel || []) : rxFuelUnidadesTodas(r.desde);
                        const listaUn = rxFuelFiltraMarca(baseUn, RX_INF.fuel.marca);
                        if (!listaUn.length) {
                            RX_INF._buscando = false; finProg();
                            adviceWarn('Sin unidades', RX_INF.fuel.marca
                                ? ('Ninguna unidad coincide con la marca "' + RX_INF.fuel.marca + '".')
                                : 'No hay unidades que revisar en ese periodo.');
                            pinta();
                            return;
                        }
                        const prog = (h, t, filas, eco) => {
                            RX_INF.prog = { activo: true, hechas: h, total: t, filas: filas, txt: '', pct: 6 + Math.round((h / Math.max(1, t)) * 90) };
                            setProg(RX_INF.prog.pct,
                                'Plataforma \u00b7 ' + desc.tpl.nombre + ' \u00b7 ' + h + '/' + t +
                                (eco ? ' \u00b7 ' + eco : '') + (filas ? ' \u00b7 ' + filas + ' descarga(s)' : ''));
                            const dyn = byId('rgi-dyn');
                            if (dyn) { const p = dyn.querySelector('.rgi-kpi b'); if (p) p.textContent = String(filas); }
                        };
                        res = defThefts
                            ? await rxFuelCorrePlataforma(desc.tpl, listaUn, r.desde, r.hasta, defThefts, prog, RX_INF._token)
                            : await rxInfCorre(desc.tpl, r.desde, r.hasta, listaUn, prog, RX_INF._token, 'flota');
                        RX_INF.fuelPlat = desc.tpl.nombre;
                    } else if (esFuel) {
                        const base = (RX_INF.alcance === 'sel') ? (sel || []) : rxFuelUnidadesTodas(r.desde);
                        // Filtro por marca de sensor: evita barrer la flota
                        // entera; con "(SC)" solo se consultan esas unidades.
                        const lista = rxFuelFiltraMarca(base, RX_INF.fuel.marca);
                        if (!lista.length) {
                            RX_INF._buscando = false; finProg();
                            adviceWarn('Sin unidades', RX_INF.fuel.marca
                                ? ('Ninguna unidad coincide con la marca "' + RX_INF.fuel.marca + '".')
                                : 'No hay unidades que revisar en ese periodo.');
                            pinta();
                            return;
                        }
                        // El filtro de geocercas es de las plantillas de la
                        // plataforma: en combustible no aplica.
                        RX_INF.zonas = []; RX_INF.eco = '';
                        RX_INF.fuelPlat = '';
                        res = await rxFuelCorre(lista, r.desde, r.hasta, RX_INF.fuel, (h, t, filas, eco) => {
                            RX_INF.prog = { activo: true, hechas: h, total: t, filas: filas, txt: '', pct: 6 + Math.round((h / Math.max(1, t)) * 90) };
                            setProg(RX_INF.prog.pct,
                                'Combustible \u00b7 ' + h + '/' + t + (eco ? ' \u00b7 ' + eco : '') +
                                (filas ? ' \u00b7 ' + filas + ' perdida(s)' : ''));
                            const dyn = byId('rgi-dyn');
                            if (dyn) { const p = dyn.querySelector('.rgi-kpi b'); if (p) p.textContent = String(filas); }
                        }, RX_INF._token);
                    } else {
                        res = await rxInfCorre(RX_INF.tpl, r.desde, r.hasta, sel, (h, t, filas, eco) => {
                            RX_INF.prog = { activo: true, hechas: h, total: t, filas: filas, txt: '', pct: 6 + Math.round((h / Math.max(1, t)) * 90) };
                            setProg(RX_INF.prog.pct,
                                (RX_INF.tpl ? RX_INF.tpl.nombre + ' \u00b7 ' : '') + h + '/' + t +
                                (eco ? ' \u00b7 ' + eco : '') + (filas ? ' \u00b7 ' + filas + ' fila(s)' : ''));
                            const dyn = byId('rgi-dyn');
                            if (dyn) { const p = dyn.querySelector('.rgi-kpi b'); if (p) p.textContent = String(filas); }
                        }, RX_INF._token);
                    }
                } catch (e) {
                    res = { cols: RX_INF.cols, filas: RX_INF.filas, trozos: 0, hechos: 0, objetos: 0, fallos: 1, errores: [(e && e.message) || e], cacheados: 0, ms: 0, cancelado: false };
                }
                RX_INF._buscando = false;
                finProg();
                RX_INF.cols = res.cols || [];
                RX_INF.filas = res.filas || [];
                RX_INF.tablas = res.tablas || [];
                RX_INF.tablaSel = (RX_INF.tablas[0] && RX_INF.tablas[0].idx != null) ? RX_INF.tablas[0].idx : null;
                // Las unidades y las columnas de un informe nuevo no tienen
                // por que ser las del anterior: se limpia la seleccion.
                RX_INF.uniSel = {};
                RX_INF.colsOcultas = {};
                if (esFuel) RX_INF.fuelSinSensor = (res.conSensor === 0 && res.sinSensor > 0);
                const v = rxInfVista();
                RX_INF.meta = {
                    filas: RX_INF.filas.length, unidades: v.unidades, trozos: res.trozos, objetos: res.objetos,
                    ms: res.ms, fallos: res.fallos, errores: res.errores, cacheados: res.cacheados,
                    lleno: res.lleno, bloqueado: res.bloqueado, recortado: res.recortado,
                    conSensor: res.conSensor, sinSensor: res.sinSensor, sensoresFallo: res.sensoresFallo
                };
                pinta();
                if (res.cancelado) advice('Informe cancelado', RX_INF.filas.length + ' fila(s) hasta donde lleg\u00f3 (quedan guardadas).');
                else if (esFuel && res.conSensor === 0 && res.sinSensor > 0 && !RX_INF.filas.length) {
                    adviceWarn('Sin sensor de combustible', 'Ninguna unidad del alcance publica nivel de combustible. Usa una plantilla de combustible de la plataforma.');
                } else adviceOk(esFuel ? 'Perdidas de combustible' : 'Informe generado', RX_INF.filas.length + (esFuel ? ' perdida(s)' : ' fila(s)') +
                    ' de ' + (RX_INF.tpl ? RX_INF.tpl.nombre : '') +
                    (res.fallos ? ' \u00b7 ' + res.fallos + ' error(es)' : '') + ' \u00b7 ' + Math.round(res.ms / 1000) + ' s');
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
                    // Respaldo: ejecutar la plantilla de combustible de la
                    // plataforma cuando ninguna unidad publica sensor.
                    if (btn.id === 'rgi-fuel-tpl') {
                        const t = rxInfTplDeClave(btn.dataset.tpl || '');
                        const ft = t ? (plantillas.filter((x) => rxInfClave(x) === rxInfClave(t))[0] || t) : null;
                        if (ft) {
                            RX_INF.tpl = ft;
                            RX_INF.cols = []; RX_INF.filas = []; RX_INF.meta = null;
                            RX_INF.fuelSinSensor = false;
                            rxInfFiltrosCargar();
                            pinta();
                            ejecutar();
                        }
                        return;
                    }
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
                        const rec = rxInfRecortaVisible(v.cols, v.filas);
                        if (btn.id === 'rgi-pdf') {
                            // Si algo del documento falla, se dice: antes el
                            // boton no hacia nada y no habia forma de saberlo.
                            try {
                                rxImprimirHTML(rxInfHTML({
                                    titulo: titulo, subtitulo: sub, cols: rec.cols, filas: rec.filas,
                                    mapa: rxInfMapaHTML(v, 660, 240),
                                    meta: Object.assign({}, v.meta, { unidades: v.unidades }),
                                    resumen: rxInfResumenLinea(v),
                                    esFuel: rxFuelEsTpl(RX_INF.tpl)
                                }));
                                advice('Reporte listo', 'Elige "Guardar como PDF" en el di\u00e1logo de impresi\u00f3n.');
                            } catch (e) {
                                adviceErr('No se pudo preparar el reporte', (e && e.message) || 'error inesperado');
                            }
                            return;
                        }
                        if (btn.id === 'rgi-csv') {
                            rxInfDescarga(rxInfCSVTexto(rec.cols, rec.filas, [
                                'Informe', (RX_INF.tpl && RX_INF.tpl.nombre) || '',
                                'Desde', RX_INF.desde || '', 'Hasta', RX_INF.hasta || '',
                                'Vista', RX_INF.vista, 'Generado', rxFechaHora(Date.now(), true)
                            ]), rxInfNombreArchivo(RX_INF.tpl, RX_INF.vista, '.csv'), 'text/csv;charset=utf-8;');
                            adviceOk('Informe exportado', v.filas.length + ' fila(s) en CSV');
                            return;
                        }
                        const L = ['# ' + titulo, '', '- ' + sub, '- ' + rxInfResumenLinea(v), '',
                            '| ' + rec.cols.slice(0, 14).join(' | ') + ' |',
                            '| ' + rec.cols.slice(0, 14).map(() => '---').join(' | ') + ' |'];
                        for (const f of rec.filas.slice(0, 500)) {
                            L.push('| ' + rec.cols.slice(0, 14).map((c, i) => String(f[i] == null ? '-' : f[i]).replace(/\|/g, '/')).join(' | ') + ' |');
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
                    if (t) {
                        RX_INF.tpl = plantillas.filter((x) => rxInfClave(x) === rxInfClave(t))[0] || t;
                        rxInfFiltrosCargar();
                        ejecutar();
                    }
                    return;
                }
                // Elegir plantilla: se lee lo que declara y se repinta.
                const tb = ev.target.closest && ev.target.closest('[data-tpl]');
                if (tb && box.contains(tb)) {
                    if (RX_INF._buscando) return;
                    const t = rxInfTplDeClave(tb.dataset.tpl);
                    if (t) {
                        RX_INF.tpl = plantillas.filter((x) => rxInfClave(x) === rxInfClave(t))[0] || t;
                        rxInfFiltrosCargar();
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
                // Cambiar de tabla (pestanas): la activa pasa a ser la vista.
                const tb2 = ev.target.closest && ev.target.closest('[data-tab]');
                if (tb2 && box.contains(tb2)) {
                    if (RX_INF._buscando) return;
                    const idxTab = Number(tb2.dataset.tab);
                    const t = (RX_INF.tablas || []).filter((x) => x.idx === idxTab)[0];
                    if (t) {
                        RX_INF.tablaSel = idxTab;
                        RX_INF.cols = t.cols;
                        RX_INF.filas = t.filas;
                        RX_INF.orden = null;
                        pinta();
                    }
                    return;
                }
                // Marcar/desmarcar una unidad (filtro tipo Excel).
                const ub2 = ev.target.closest && ev.target.closest('[data-uni]');
                if (ub2 && box.contains(ub2)) {
                    if (RX_INF._buscando) return;
                    const u = ub2.dataset.uni;
                    if (RX_INF.uniSel[u]) delete RX_INF.uniSel[u]; else RX_INF.uniSel[u] = 1;
                    pintaResultados();
                    return;
                }
                if (ev.target.closest && ev.target.closest('#rgi-conductor')) {
                    if (RX_INF._buscando) return;
                    if (RX_INF.conductor) { RX_INF.conductor = null; pinta(); return; }
                    if (!RX_INF.tpl) return;
                    RX_INF.conductor = { cargando: 1 };
                    pinta();
                    const mapa = await rxInfCargaConductores(RX_INF.tpl.rid);
                    RX_INF.conductor = (mapa && Object.keys(mapa).length) ? mapa : null;
                    if (!RX_INF.conductor) adviceWarn('Sin conductores', 'La plataforma no devolvio asignaciones unidad-conductor.');
                    pinta();
                    return;
                }
                if (ev.target.closest && ev.target.closest('#rgi-uni-limpiar')) {
                    if (RX_INF._buscando) return;
                    RX_INF.uniSel = {};
                    pintaResultados();
                    return;
                }
                // Mostrar u ocultar una columna.
                const cb = ev.target.closest && ev.target.closest('[data-colvis]');
                if (cb && box.contains(cb)) {
                    if (RX_INF._buscando) return;
                    const i = Number(cb.dataset.colvis);
                    if (RX_INF.colsOcultas[i]) delete RX_INF.colsOcultas[i]; else RX_INF.colsOcultas[i] = 1;
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
            // Estado del motor del reporte de combustible (chips propios).
            box.addEventListener('click', (ev) => {
                const fm = ev.target.closest && ev.target.closest('[data-fuelmotor]');
                if (!fm || !box.contains(fm)) return;
                if (RX_INF._buscando) return;
                RX_INF.fuel.motor = fm.dataset.fuelmotor || 'todos';
                pinta();
            });
            // Fuente del reporte de combustible: plataforma o sensor propio.
            box.addEventListener('click', (ev) => {
                const fs = ev.target.closest && ev.target.closest('[data-fuelsrc]');
                if (!fs || !box.contains(fs)) return;
                if (RX_INF._buscando) return;
                RX_INF.fuel.fuente = fs.dataset.fuelsrc || 'plataforma';
                if (RX_INF.fuel.fuente === 'plataforma' && !RX_INF.fuel._desc) {
                    adviceWarn('Sin plantilla de plataforma', 'No se encontro una plantilla de combustible; se usara el sensor propio.');
                }
                pinta();
            });
            box.addEventListener('change', (ev) => {
                const t = ev.target;
                if (t && t.dataset && t.dataset.filtro) { rxInfFiltrosGuardar(); return; }
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
                            '<b>' + esc(x.nombre) + '</b><i>' + esc(tplSub(x)) + '</i></button></div>').join('');
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
                if (t.id === 'rgi-fuel-litros') { RX_INF.fuel.litros = Math.max(1, Number(t.value) || RX_INF.fuel.litros); return; }
                if (t.id === 'rgi-fuel-min') { RX_INF.fuel.min = clamp(Number(t.value) || RX_INF.fuel.min, 1, 60); return; }
                if (t.id === 'rgi-fuel-vel') { RX_INF.fuel.vel = clamp(Number(t.value) || 0, 0, 40); return; }
                if (t.id === 'rgi-fuel-km') { RX_INF.fuel.km = clamp(Number(t.value) || RX_INF.fuel.km, 1, 2000); return; }
                if (t.id === 'rgi-fuel-l100') { RX_INF.fuel.l100 = clamp(Number(t.value) || 0, 0, 100); return; }
                if (t.id === 'rgi-fuel-sensor') { RX_INF.fuel.sensor = t.value || ''; return; }
                if (t.id === 'rgi-fuel-marca') {
                    RX_INF.fuel.marca = t.value || '';
                    // Solo se repinta el contador, para no perder el foco.
                    const base = (RX_INF.alcance === 'sel') ? unidadesSel() : rxFuelUnidadesTodas(0);
                    const n = byId('rgi-fuel-marca');
                    const cont = n && n.parentNode && n.parentNode.querySelector('i');
                    if (cont) cont.textContent = rxFuelFiltraMarca(base, RX_INF.fuel.marca).length + '/' + base.length;
                    return;
                }
                if (t.dataset && t.dataset.filtro) { RX_INF.filtros[t.dataset.filtro] = t.value || ''; return; }
                if (t.id === 'rgi-uni-busca') {
                    // Solo se repinta la lista: el campo no pierde el foco.
                    RX_INF.uniBusca = t.value || '';
                    const cont = byId('rgi-unis');
                    if (cont) {
                        const v = rxInfVista();
                        const setU = {};
                        (RX_INF.filas || []).forEach((f) => {
                            const u = String(f[v.iUni] == null ? '' : f[v.iUni]).trim();
                            if (u) setU[u] = 1;
                        });
                        const q = norm(RX_INF.uniBusca || '');
                        cont.innerHTML = Object.keys(setU).sort((a, b) => String(a).localeCompare(String(b), 'es'))
                            .filter((u) => !q || norm(u).indexOf(q) >= 0)
                            .map((u) => '<button type="button" class="rgi-chip' + (RX_INF.uniSel[u] ? ' activo' : '') +
                                '" data-uni="' + esc(u) + '">' + esc(u) + '</button>').join('');
                    }
                    return;
                }
            });
            cargarTpl();
        }
    });
}
