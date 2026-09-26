    /* ====================== BUSQUEDA DIFUSA ======================
     * v5.15. Puntua coincidencias sin acentos ni mayusculas, con prioridad a
     * igualdad > prefijo > subcadena > tokens > subsecuencia > distancia de
     * edicion. Alimenta el autocompletado de paradas (geocercas y municipios).
     */
    function normalizarBusqueda(s) {
        return norm(s).replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function levenshteinAcotado(a, b, tope) {
        const m = a.length, n = b.length;
        if (Math.abs(m - n) > (tope || 3)) return tope || 3;
        const prev = new Array(n + 1);
        for (let j = 0; j <= n; j++) prev[j] = j;
        for (let i = 1; i <= m; i++) {
            let cur = [i];
            let filaMin = i;
            for (let j = 1; j <= n; j++) {
                const costo = a[i - 1] === b[j - 1] ? 0 : 1;
                cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + costo);
                if (cur[j] < filaMin) filaMin = cur[j];
            }
            if (filaMin > (tope || 3)) return tope || 3;
            for (let j = 0; j <= n; j++) prev[j] = cur[j];
        }
        return prev[n];
    }
    function fuzzyScore(query, texto) {
        const a = normalizarBusqueda(query);
        const b = normalizarBusqueda(texto);
        if (!a) return 1;
        if (!b) return 0;
        if (b === a) return 1000;
        if (b.indexOf(a) === 0) return 850 - Math.min(100, b.length);
        if (b.indexOf(' ' + a) >= 0) return 750;
        if (b.indexOf(a) >= 0) return 650 - Math.min(200, b.indexOf(a));
        const at = a.split(' ').filter(Boolean);
        const bt = b.split(' ').filter(Boolean);
        if (at.length) {
            let hit = 0;
            for (let i = 0; i < at.length; i++) {
                if (bt.some((x) => x.indexOf(at[i]) === 0)) hit++;
            }
            if (hit) return 400 + hit * 25;
        }
        let k = 0;
        for (let i = 0; i < b.length && k < a.length; i++) { if (b[i] === a[k]) k++; }
        if (k === a.length) return 250;
        const d = levenshteinAcotado(a, b, 3);
        if (d <= 2) return 150 - d * 30;
        return 0;
    }
    // Catalogo de paradas sugeridas: geocercas + municipios (OSM y riesgo).
    function catalogoParadas(query, limite) {
        const q = String(query || '').trim();
        const out = [];
        const push = (item) => {
            const sc = fuzzyScore(q, (item.texto || '') + ' ' + (item.sub || ''));
            if (sc > 0) out.push(Object.assign({ score: sc }, item));
        };
        for (let i = 0; i < (APP.zonas || []).length; i++) {
            const z = APP.zonas[i];
            const c = centroDeZona(z);
            push({ tipo: 'geocerca', texto: z.n || ('Zona ' + z.id), sub: 'geocerca', coords: c, zonaId: z.id });
        }
        const ms = (APP.municipios || []).concat(APP.municipiosRiesgo || []);
        const vistos = new Set();
        for (let i = 0; i < ms.length; i++) {
            const m = ms[i];
            const k = norm(m.nombre) + '|' + norm(m.estado || '');
            if (vistos.has(k)) continue;
            vistos.add(k);
            push({ tipo: 'municipio', texto: m.nombre, sub: (m.estado || '') + ' \u00b7 municipio', coords: m.centro, municipioId: m.id });
        }
        out.sort((a, b) => b.score - a.score);
        return out.slice(0, Math.max(1, limite || 8));
    }
    function encontrarZona(texto) {
        const q = norm(texto || '');
        if (!q) return null;
        let mejor = null, mejorSc = 0;
        for (let i = 0; i < (APP.zonas || []).length; i++) {
            const z = APP.zonas[i];
            const n = norm(z.n || '');
            let sc = 0;
            if (n === q) sc = 1000;
            else if (n.indexOf(q) >= 0 || q.indexOf(n) >= 0) sc = 700 - Math.abs(n.length - q.length);
            if (sc > mejorSc) { mejorSc = sc; mejor = z; }
        }
        return mejor;
    }

