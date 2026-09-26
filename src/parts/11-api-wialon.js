/* ====================== API WIALON ====================== */
    async function wialonReady(timeout) {
        const ms = timeout || 60000;
        const t0 = Date.now();
        while (true) {
            // `PAGE` resuelve el window real de la pagina (unsafeWindow con
            // grants, o window si corremos en contexto de pagina).
            const w = PAGE.wialon;
            if (w && w.core && w.core.Session) return true;
            if (Date.now() - t0 > ms) return false;
            await sleep(400);
        }
    }
    function session() { return PAGE.wialon.core.Session.getInstance(); }
    function currentUser() { try { return session().getCurrUser(); } catch (_) { return null; } }
    function remoteCall(service, params) {
        const remote = PAGE.wialon.core.Remote.getInstance();
        return new Promise((resolve, reject) => {
            try {
                remote.remoteCall(service, params, (code, result) => {
                    if (code) reject(new Error(service + ' -> code ' + code));
                    else resolve(result || {});
                });
            } catch (e) { reject(e); }
        });
    }
    async function fetchUnits() {
        const r = await remoteCall('core/search_items', {
            spec: { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 1024, from: 0, to: 0
        });
        return r.items || [];
    }
    async function fetchZones() {
        if (!APP.config.loadZones) return [];
        // Wialon expone las geocercas (zones) como subitems de los recursos.
        // Probamos varias combinaciones de spec/flags (el flag documentado es
        // 0x1000 = 4096): busqueda normal por sys_name y la busqueda por
        // 'zones_library' con propType 'propitemname'.
        const intentos = [
            { spec: { itemsType: 'avl_resource', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' }, flags: 1 | 4096 },
            { spec: { itemsType: 'avl_resource', propName: 'zones_library', propValueMask: '*', sortType: 'zones_library', propType: 'propitemname' }, flags: 1 | 4096 },
            { spec: { itemsType: 'avl_resource', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' }, flags: 1 | 4096 | 2 },
            { spec: { itemsType: 'avl_resource', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' }, flags: 1 | 8192 },
        ];
        let out = [];
        const diag = { recursos: 0, claves: [], error: '' };
        for (let i = 0; i < intentos.length; i++) {
            let r;
            try {
                r = await remoteCall('core/search_items', {
                    spec: intentos[i].spec, force: 1, flags: intentos[i].flags, from: 0, to: 0
                });
            } catch (e) {
                diag.error = (e && e.message) || 'error';
                continue;
            }
            const items = r.items || [];
            diag.recursos = Math.max(diag.recursos, items.length);
            if (items[0] && !diag.claves.length) {
                try { diag.claves = Object.keys(items[0]).slice(0, 24); } catch (_) {}
            }
            const zs = _extraerZonasDe(items);
            if (zs.length) { out = zs; break; }
        }
        // Completa la geometria (puntos de poligono / centro de circulo) que
        // el `zl` no trae. Si get_zone_data no existe, se seguira usando el
        // bounding box como aproximacion.
        try { await _enriquecerZonas(out); } catch (_) { /* noop */ }
        APP.zonasDiag = diag;
        APP.zonasPorNombre = new Map(out.map((z) => [z.n || '', z]));
        if (APP.unlocked) {
            const conGeo = out.filter((z) => !_zonaNecesitaGeometria(z)).length;
            try { log('geocercas:', out.length, '· con geometria:', conGeo, '· recursos:', diag.recursos, '· claves:', diag.claves.join(',')); } catch (_) {}
        }
        return out;
    }
    // Extrae las geocercas de la lista de recursos de Wialon.
    // OJO: remoteCall devuelve la respuesta CRUDA, asi que los recursos son
    // objetos planos y NO tienen res.getZones() (eso es del SDK). El campo
    // crudo de las geocercas de un recurso es `zl` (zones library). Tambien
    // toleramos getZones()/zones por si el wrapper del SDK esta presente.
function _extraerZonasDe(items) {
        const out = [];
        // `coll` puede ser un array, un objeto {id: zona} o un STRING JSON
        // (algunas versiones de Wialon devuelven `zl` serializado).
        const addColl = (coll, rid, depth) => {
            if (!coll) return 0;
            // Guarda contra un string JSON que se anida sobre si mismo
            // (JSON.parse devuelve otro string): evita recursion infinita.
            if (depth > 4) return 0;
            if (typeof coll === 'string') {
                try { return addColl(JSON.parse(coll), rid, (depth || 0) + 1); } catch (_) { return 0; }
            }
            let n = 0;
            const push = (z) => {
                if (z && typeof z === 'object' && z.n) { z._rid = rid; out.push(z); n++; }
            };
            if (Array.isArray(coll)) coll.forEach(push);
            else if (typeof coll === 'object') Object.keys(coll).forEach((k) => push(coll[k]));
            return n;
        };
        (items || []).forEach((res) => {
            if (!res) return;
            const rid = (res.id != null) ? res.id : ((res.rid != null) ? res.rid : null);
            let encontrados = 0;
            try {
                if (typeof res.getZones === 'function') {
                    encontrados += addColl(res.getZones(), rid);
                }
            } catch (_) { /* noop */ }
            if (!encontrados) {
                // Campo crudo de la API: zl (zones library). Algunas versiones
                // usan `zones`.
                encontrados += addColl(res.zl || res.zones, rid);
            }
        });
        // Desduplica por id/nombre.
        const vistos = new Set();
        return out.filter((z) => {
            const k = z.id != null ? ('id:' + z.id) : ('n:' + z.n);
            if (vistos.has(k)) return false;
            vistos.add(k);
            return true;
        });
    }
    // El `zl` de search_items solo trae el bounding box (`b`), NO los puntos
    // (`p`) ni el centro. La geometria real se pide con resource/get_zone_data
    // (flags 0x1F = area+perimetro+centro+todos los puntos+basicos) y se
    // fusiona en las zonas para que inZone() pueda hacer la comprobacion
    // exacta (poligono/circulo) en vez de solo el rectangulo.
    function _zonaNecesitaGeometria(z) {
        // Circulo (t=3): basta el centro (b.cen_x/cen_y) y el radio (w).
        if (z.t === 3) return !(z.b && z.b.cen_x != null && z.b.cen_y != null && z.w != null);
        // Linea (t=1) o poligono (t=2): hacen falta los puntos.
        return !(Array.isArray(z.p) && z.p.length >= 2);
    }
    async function _enriquecerZonas(zonas) {
        const porRecurso = new Map();
        (zonas || []).forEach((z) => {
            if (z._rid == null) return;
            if (!_zonaNecesitaGeometria(z)) return;
            if (!porRecurso.has(z._rid)) porRecurso.set(z._rid, []);
            porRecurso.get(z._rid).push(z);
        });
        for (const [rid, zs] of porRecurso) {
            let datos = null;
            try {
                const col = zs.map((z) => z.id).filter((x) => x != null);
                const r = await remoteCall('resource/get_zone_data', { itemId: rid, col: col, flags: 0x1F });
                const crudo = Array.isArray(r) ? r : ((r && (r.items || r.zones)) || null);
                // La respuesta puede ser un array o un mapa {id: zona};
                // normalizamos a array para poder recorrerla con forEach.
                if (Array.isArray(crudo)) datos = crudo;
                else if (crudo && typeof crudo === 'object') datos = Object.keys(crudo).map((k) => crudo[k]);
            } catch (_) { datos = null; }
            if (!datos) continue;
            const porId = new Map();
            datos.forEach((dz) => { if (dz && dz.id != null) porId.set(dz.id, dz); });
            zs.forEach((z) => {
                const dz = porId.get(z.id);
                if (!dz) return;
                if (dz.b) z.b = dz.b;
                if (Array.isArray(dz.p)) z.p = dz.p;
                if (dz.t != null) z.t = dz.t;
                if (dz.w != null) z.w = dz.w;
            });
        }
        return zonas;
    }
    async function fetchLastMotion(uid, minutos) {
        const ahora = Math.floor(Date.now() / 1000);
        const r = await remoteCall('messages/load_interval', {
            itemId: uid,
            timeFrom: ahora - (minutos || 180) * 60,
            timeTo: ahora,
            flags: 1, flagsMask: 1, loadCount: 1000
        });
        const msgs = r.messages || [];
        const mov = msgs.filter((m) => (((m.pos || {}).s) || 0) > 3).map((m) => m.t);
        if (!mov.length) return null;
        return Math.max.apply(null, mov);
    }
    /* ====================== IA · DATOS AMPLIADOS (v6.0.9) ======================
     * Solo lectura. La IA recibe mas contexto consultando la API:
     *   - campos personalizados de la unidad (conductor, marca, etc.)
     *   - historial reciente (recorrido, velocidad maxima, paradas)
     *   - opcionalmente, reporte del dia via report/exec_report
     * Todo con cache para no repetir llamadas en cada mensaje del chat.
     */
    const RX_PROPS_CACHE = new Map();     // uid -> { t, props }
    const RX_HIST_CACHE = new Map();      // uid|h -> { t, resumen }
    let _rxRepTemplates = null;           // cache de plantillas de reporte
    function _rxPropsDe(it) {
        const out = {};
        const flds = it && it.flds;
        if (flds && typeof flds === 'object') {
            Object.keys(flds).forEach((k) => {
                const f = flds[k];
                if (f && f.n) out[String(f.n)] = String(f.v == null ? '' : f.v);
            });
        }
        return out;
    }
    async function iaFetchUnidadProps(uid, nombre) {
        if (uid == null) return null;
        const key = String(uid);
        const hit = RX_PROPS_CACHE.get(key);
        if (hit && (Date.now() - hit.t) < 1800000) return hit.props;
        let props = null;
        const intentos = [
            { propName: 'sys_id', propValueMask: key },
            { propName: 'sys_name', propValueMask: String(nombre || '') }
        ];
        for (let i = 0; i < intentos.length && !props; i++) {
            if (!intentos[i].propValueMask) continue;
            try {
                const r = await remoteCall('core/search_items', {
                    spec: { itemsType: 'avl_unit', propName: intentos[i].propName, propValueMask: intentos[i].propValueMask, sortType: 'sys_name' },
                    force: 1, flags: 1 | 8, from: 0, to: 0
                });
                const it = (r.items || [])[0];
                if (it) {
                    const p = _rxPropsDe(it);
                    if (Object.keys(p).length) props = p;
                }
            } catch (_) { /* intenta el siguiente */ }
        }
        RX_PROPS_CACHE.set(key, { t: Date.now(), props: props });
        return props;
    }
    function _rxResumenHistorial(msgs) {
        if (!msgs || !msgs.length) return { mensajes: 0, nota: 'sin mensajes en el periodo' };
        let dist = 0, velMax = 0, enMov = 0, detenido = 0;
        let tPrim = null, latPrim = null, lonPrim = null;
        let tUlt = null, latUlt = null, lonUlt = null;
        let prev = null, paradas = 0, enParadaDesde = null;
        const PARADA_S = 10 * 60;
        for (let i = 0; i < msgs.length; i++) {
            const m = msgs[i];
            const y = +m.pos.y, x = +m.pos.x, s = Number(m.pos.s) || 0;
            const t = Number(m.t) || 0;
            const dt = (i > 0) ? Math.max(0, t - (Number(msgs[i - 1].t) || t)) : 0;
            if (s > 3) {
                enMov += dt;
                if (s > velMax) velMax = s;
                if (enParadaDesde != null) {
                    if (t - enParadaDesde >= PARADA_S) paradas++;
                    enParadaDesde = null;
                }
            } else {
                detenido += dt;
                if (enParadaDesde == null) enParadaDesde = t;
            }
            if (prev) { const d = haversine(prev.y, prev.x, y, x); if (d < 5000) dist += d; }
            prev = { y: y, x: x };
            if (tPrim == null) { tPrim = t; latPrim = y; lonPrim = x; }
            tUlt = t; latUlt = y; lonUlt = x;
        }
        if (enParadaDesde != null && tUlt != null && (tUlt - enParadaDesde) >= PARADA_S) paradas++;
        const fmt = (t) => (t ? new Date(t * 1000).toISOString().slice(11, 16) : null);
        return {
            mensajes: msgs.length,
            km: Math.round(dist / 1000),
            velMax: Math.round(velMax),
            movimientoMin: Math.round(enMov / 60),
            detenidoMin: Math.round(detenido / 60),
            paradas: paradas,
            primera: { t: fmt(tPrim), lat: +(+latPrim).toFixed(4), lon: +(+lonPrim).toFixed(4) },
            ultima: { t: fmt(tUlt), lat: +(+latUlt).toFixed(4), lon: +(+lonUlt).toFixed(4) },
            truncado: msgs.length >= 10000
        };
    }
    async function iaFetchUnidadHistorial(uid, horas) {
        if (uid == null) return null;
        const h = clamp(+horas || 24, 1, 168);
        const key = String(uid) + '|' + h;
        const hit = RX_HIST_CACHE.get(key);
        if (hit && (Date.now() - hit.t) < 60000) return hit.resumen;
        const ahora = Math.floor(Date.now() / 1000);
        let msgs = [];
        try {
            const r = await remoteCall('messages/load_interval', {
                itemId: uid,
                timeFrom: ahora - h * 3600,
                timeTo: ahora,
                flags: 1, flagsMask: 1, loadCount: 10000
            });
            msgs = (r.messages || []).filter((m) => m && m.pos && isFinite(+m.pos.y) && isFinite(+m.pos.x));
        } catch (_) { msgs = []; }
        const resumen = _rxResumenHistorial(msgs);
        RX_HIST_CACHE.set(key, { t: Date.now(), resumen: resumen });
        return resumen;
    }
    async function iaFetchReportTemplates() {
        if (_rxRepTemplates) return _rxRepTemplates;
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
                    if (t && t.id != null) out.push({ rid: (res.id != null ? res.id : null), id: t.id, nombre: t.n || ('Reporte ' + t.id) });
                });
            });
        } catch (_) { /* sin plantillas */ }
        _rxRepTemplates = out;
        return out;
    }
    async function iaFetchReporteDia(uid) {
        if (uid == null) return null;
        const tpls = await iaFetchReportTemplates();
        if (!tpls.length) return null;
        const tpl = tpls.find((t) => /d[ií]a|diario|day|resumen|summary|general|viaje|trip|kilometr/i.test(t.nombre)) || tpls[0];
        const ini = new Date(); ini.setHours(0, 0, 0, 0);
        const desde = Math.floor(ini.getTime() / 1000);
        const hasta = Math.floor(Date.now() / 1000);
        let stats = null;
        try {
            const r = await remoteCall('report/exec_report', {
                reportResourceId: tpl.rid, reportTemplateId: tpl.id,
                reportObjectId: uid, reportObjectSecId: 0,
                interval: { from: desde, to: hasta, flags: 0 }
            });
            const rr = r && r.reportResult;
            if (rr && Array.isArray(rr.stats)) {
                stats = rr.stats.slice(0, 30).map((s) => ({ n: s[0], v: s[1] }));
            }
        } catch (_) { stats = null; }
        try { await remoteCall('report/cleanup_result', {}); } catch (_) { /* noop */ }
        return stats;
    }

