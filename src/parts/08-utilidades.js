    /* ============================ UTILIDADES ============================ */
    const sleep = (ms) => new Promise((res) => { setTimeout(res, ms); });

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw == null) return fallback;
            const v = JSON.parse(raw);
            return v == null ? fallback : v;
        } catch (_) { return fallback; }
    }

    function writeJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); }
        catch (e) {
            // Cuota llena o almacenamiento bloqueado: el dato NO persiste.
            // Avisar una sola vez para no inundar la consola en cada guardado
            // (el caso tipico es guardar la config repetidamente y perderla).
            if (!writeJSON._avisado) {
                writeJSON._avisado = true;
                try { console.warn('[Rondo] no se pudo guardar en localStorage (' + key + '):', (e && e.message) || e); } catch (_) { /* noop */ }
            }
        }
    }

    // sessionStorage por pestaña. Migra desde LS la primera vez para no perder
    // los datos guardados en versiones anteriores.
    function readSession(key, fallback, legacyKey) {
        // 1) Intento en sessionStorage. Si el JSON esta corrupto caemos al
        //    legado: es mas probable recuperar el dato global que rendirnos.
        try {
            const raw = sessionStorage.getItem(key);
            if (raw != null) {
                const v = JSON.parse(raw);
                if (v != null) return v;
            }
        } catch (_) { /* storage bloqueado o JSON corrupto: probar legado */ }
        if (legacyKey) {
            // Copia la lista antigua (global) a esta pestaña la primera vez.
            // No borramos la clave global: otras pestanas aun pueden migrar.
            try {
                const legacy = localStorage.getItem(legacyKey);
                if (legacy != null) {
                    const parsed = JSON.parse(legacy);
                    if (parsed != null) {
                        sessionStorage.setItem(key, JSON.stringify(parsed));
                        return parsed;
                    }
                }
            } catch (_) { /* noop */ }
        }
        return fallback;
    }
    function writeSession(key, value) {
        try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* noop */ }
    }
    function readSessionArray(key, fallback, legacyKey) {
        const v = readSession(key, fallback, legacyKey);
        return Array.isArray(v) ? v : fallback;
    }
    function readSessionObject(key, fallback, legacyKey) {
        const v = readSession(key, fallback, legacyKey);
        return (v && typeof v === 'object' && !Array.isArray(v)) ? v : fallback;
    }

    function readArray(key, fallback) {
        const v = readJSON(key, fallback);
        return Array.isArray(v) ? v : fallback;
    }

    function readObject(key, fallback) {
        const v = readJSON(key, fallback);
        return (v && typeof v === 'object' && !Array.isArray(v)) ? v : fallback;
    }

    function deepMerge(over, base) {
        const out = Object.assign({}, base, over);
        if (base.reglas) out.reglas = Object.assign({}, base.reglas, (over && over.reglas) || {});
        if (base.horario) out.horario = Object.assign({}, base.horario, (over && over.horario) || {});
        return out;
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    // Cache acotada de normalizacion. norm() se llama en bucles (busqueda
    // difusa, municipios, comparacion de paradas) sobre los mismos textos una
    // y otra vez. Si crece demasiado se vacia para no retener memoria.
    const NORM_CACHE = new Map();
    function norm(s) {
        const t = (s == null) ? '' : String(s);
        const hit = NORM_CACHE.get(t);
        if (hit !== undefined) return hit;
        const out = t.normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        if (NORM_CACHE.size >= 2000) NORM_CACHE.clear();
        NORM_CACHE.set(t, out);
        return out;
    }

    function pickSeverity(level) {
        return { bajo: 1, medio: 2, alto: 3, critico: 4 }[level] || 1;
    }

    function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

    function isoNum(v, d) {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : d;
    }

