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

