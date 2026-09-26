    /* ====================== NOMBRE + ESTADO ====================== */
    // Parsea nombre/id de una unidad. Nunca revienta con una entrada
    // incompleta: se llama en bucles sobre toda la flota y una unidad
    // corrupta no debe detener el refresco ni el analisis.
    function parseUnitName(u) {
        const src = (u && typeof u === 'object') ? u : {};
        const nombre = String(src.nm || String(src.id == null ? '' : src.id)).trim();
        let eco = '';
        const mEco = nombre.match(/\.\s*0*(\d{3,5})(?!\d)/);
        if (mEco) eco = mEco[1];
        if (!eco) {
            const m = nombre.match(/\b0*(\d{3,5})\b/);
            if (m) eco = m[1];
        }
        let placa = '';
        const mPlaca = nombre.match(/\b([A-Z]{2,4}[-\s]?\d{2,4}[A-Z]{0,3})\b/);
        if (mPlaca) placa = mPlaca[1];
        return { id: src.id, nombre, eco, placa, clave: eco || placa || String(src.id) };
    }
    function unitState(u) {
        const src = (u && typeof u === 'object') ? u : {};
        const pos = src.pos || {};
        const lmsg = src.lmsg || {};
        // t suele venir en segundos (Wialon), pero algunos payloads lo
        // mandan en milisegundos: normalizamos para que edadMin no se
        // dispare a decadas y la unidad figure siempre offline.
        let t = Number(pos.t || lmsg.t || 0);
        if (!isFinite(t) || t <= 0) t = 0;
        else if (t > 1e12) t = Math.round(t / 1000);
        const edadMin = t ? (Date.now() / 1000 - t) / 60 : Infinity;
        const online = edadMin < APP.config.offlineMin;
        const vel = Number(pos.s) || 0;
        const estado = !online ? 'offline' : (vel > 3 ? 'moviendo' : 'detenida');
        const lat = (pos.y != null && isFinite(+pos.y)) ? +pos.y : null;
        const lon = (pos.x != null && isFinite(+pos.x)) ? +pos.x : null;
        return {
            t, edadMin, online, vel, estado,
            lat, lon,
            curso: Number(pos.c) || 0, sat: Number(pos.sc) || 0
        };
    }
    function isWatched(info) {
        const e = info.eco, p = info.placa, i = String(info.id);
        const has = (k) => k && Object.prototype.hasOwnProperty.call(APP.watchMap, k);
        return has(e) || has(p) || has(i);
    }
    function watchDest(info) {
        // v5.15: si hay un plan multipunto, el texto de destino es su
        // serializacion (paradas separadas por " | "), lo que mantiene
        // comparaciones estables con autoTrazarRutasPendientes.
        const plan = planDe(info);
        if (plan && plan.paradas && plan.paradas.length) return planATexto(plan);
        const e = info.eco, p = info.placa, i = String(info.id);
        return (e && APP.watchMap[e]) || (p && APP.watchMap[p]) || (APP.watchMap[i]) || '';
    }
    function limiteDe(info) {
        const e = info.eco, p = info.placa, i = String(info.id);
        const v = (e && APP.limites[e]) || (p && APP.limites[p]) || APP.limites[i];
        const n = Number(v);
        return (Number.isFinite(n) && n > 0) ? n : APP.config.velMax;
    }
    function setLimite(eco, val) {
        if (!eco) return;
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) APP.limites[eco] = n;
        else delete APP.limites[eco];
        writeSession(SS.limites, APP.limites);
        refresh();
    }
    function unitByEco(eco) {
        if (!eco) return null;
        const u = APP.unidades.find((x) => {
            const info = parseUnitName(x);
            return info.eco === eco || info.placa === eco || String(info.id) === eco;
        });
        if (!u) return null;
        return { u, info: parseUnitName(u), st: unitState(u) };
    }
    function openMap(eco, kind) {
        const it = unitByEco(eco);
        if (!it || it.st.lat == null || it.st.lon == null) {
            adviceWarn('Sin ubicación', 'La unidad no reporta coordenadas');
            return;
        }
        const lat = it.st.lat, lon = it.st.lon;
        const url = (kind === 'google')
            ? 'https://www.google.com/maps?q=' + lat + ',' + lon
            : 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=16/' + lat + '/' + lon;
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
    }
    function shouldWatch(u) {
        if (APP.config.watchAll) return true;
        const info = parseUnitName(u);
        const e = info.eco, p = info.placa, i = String(info.id);
        if (e && APP.seleccion.has(e)) return true;
        if (p && APP.seleccion.has(p)) return true;
        if (APP.seleccion.has(i)) return true;
        return false;
    }
    // Acumula distancia recorrida por unidad cuando se mueve a mas de 1 km/h.
    // Saltos GPS anomalos (>5 km en 1 minuto) se descartan para no inflar el
    // odometro. Persiste en localStorage.
    const ODOMETRO_MAX_SALTO_M = 5000;
    function actualizarOdometro(info, st, prev) {
        if (!info || !info.clave || !st || st.online !== true) return;
        if (st.lat == null || st.lon == null) return;
        if (st.vel != null && st.vel <= 1) return;
        const clave = info.clave;
        const od = APP.odometro[clave] || (APP.odometro[clave] = { m: 0, ultimoLat: null, ultimoLon: null, ultimoT: null });
        if (od.ultimoLat != null && od.ultimoLon != null && st.t && od.ultimoT) {
            const dt = Math.max(1, st.t - od.ultimoT);
            const d = haversine(od.ultimoLat, od.ultimoLon, st.lat, st.lon);
            if (d <= ODOMETRO_MAX_SALTO_M) od.m += d;
        }
        od.ultimoLat = st.lat;
        od.ultimoLon = st.lon;
        od.ultimoT = st.t || Math.floor(Date.now() / 1000);
        writeJSON(LS.odometro, APP.odometro);
    }
    function resetOdometro(eco) {
        const it = unitByEco(eco);
        if (!it) return;
        APP.odometro[it.info.clave] = { m: 0, ultimoLat: null, ultimoLon: null, ultimoT: null };
        writeJSON(LS.odometro, APP.odometro);
        adviceOk('Odómetro reiniciado', it.info.eco);
    }
    function odometroDe(info) {
        if (!info || !info.clave) return null;
        return APP.odometro[info.clave] || null;
    }
    // Velocidad suavizada (media exponencial) para ETAs y avisos estables.
    // Se actualiza una vez por refresco en evaluateUnit; aquí solo se lee.
    function velSuavizada(info, st) {
        const k = info && info.clave;
        const v = k ? APP.velSuave[k] : null;
        if (Number.isFinite(v)) return v;
        return (st && Number.isFinite(st.vel)) ? st.vel : 0;
    }
    function isBase(zona) {
        return /\b(GENA|CEDIS|PATIO|PLANTA|OFICINAS|ALMACEN|TALLER|BODEGA|LABORATORIO|BASCULA|RASTRO)\b/.test(norm(zona));
    }
    function ageText(min) {
        if (!isFinite(min)) return 'sin datos';
        if (min < 1) return 'ahora';
        if (min < 60) return Math.round(min) + 'm';
        const h = min / 60;
        if (h < 24) return h.toFixed(1) + 'h';
        return Math.round(h / 24) + 'd';
    }
    function hhmmMin(t) {
        const p = String(t == null ? '' : t).split(':');
        if (p.length < 2) return null;
        const h = parseInt(p[0], 10), m = parseInt(p[1], 10);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        const r = (h * 60 + m) % 1440;
        return r < 0 ? r + 1440 : r;
    }
    function inHorario() {
        const cfg = APP.config;
        if (!cfg.horario.on) return true;
        const a = hhmmMin(cfg.horario.desde);
        const b = hhmmMin(cfg.horario.hasta);
        if (a == null || b == null) return true;
        const d = new Date();
        const m = d.getHours() * 60 + d.getMinutes();
        // Rango normal (06:00-23:00) o rango nocturno que cruza medianoche (22:00-06:00).
        return (a <= b) ? (m >= a && m <= b) : (m >= a || m <= b);
    }
    function normEco(s) { return String(s || '').replace(/^0+/, '') || String(s || ''); }

