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
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* noop */ }
    }

    // sessionStorage por pestaña. Migra desde LS la primera vez para no perder
    // los datos guardados en versiones anteriores.
    function readSession(key, fallback, legacyKey) {
        try {
            const raw = sessionStorage.getItem(key);
            if (raw != null) {
                const v = JSON.parse(raw);
                if (v != null) return v;
            }
            if (legacyKey) {
                // Copia la lista antigua (global) a esta pestaña la primera vez.
                const legacy = localStorage.getItem(legacyKey);
                if (legacy != null) {
                    const parsed = JSON.parse(legacy);
                    sessionStorage.setItem(key, JSON.stringify(parsed));
                    return parsed;
                }
            }
        } catch (_) { /* noop */ }
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

    function norm(s) {
        return String(s == null ? '' : s).normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    }

    function pickSeverity(level) {
        return { bajo: 1, medio: 2, alto: 3, critico: 4 }[level] || 1;
    }

    function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

    function isoNum(v, d) {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : d;
    }

