/* ============================================================================
 * RONDO · SONDEO DE PLANTILLAS (v4) · espia(total)
 * ----------------------------------------------------------------------------
 * Pegalo en la consola (F12) de AE-Track con sesion iniciada. Solo LEE.
 *
 * Situacion: report/exec_report devuelve code 4 (error interno del servidor)
 * en las 11 combinaciones probadas, y code 7 con reportObjectId 0. O sea que
 * no es como lo llamamos, es que el servicio falla siempre.
 *
 * Este script NO prueba nada por su cuenta: se limita a APUNTAR todo lo que
 * hace la plataforma, para ver por donde calcula sus informes de verdad.
 * Vigila a la vez:
 *   - remoteCall (la API de Wialon)
 *   - fetch y XMLHttpRequest (por si AE-Track usa REST en vez de remoteCall)
 *   - ReportManager del SDK, si existe
 *
 * USO:
 *   1. Pega esto.
 *   2. Abre el informe NATIVO "GEOCERCA" y pulsa Ejecutar/Generar.
 *   3. Vuelve a la consola y ejecuta:      __rondoSpyFin()
 * ========================================================================== */
(function () {
    const ventana = window;
    const out = { remoteCall: [], fetch: [], xhr: [], reportManager: [], otros: [] };
    const ver = (s) => (typeof s === 'string' ? s : String(s));

    // ── 1) remoteCall de Wialon ────────────────────────────────────────
    try {
        const R = wialon.core.Remote.getInstance();
        const origRC = R.remoteCall;
        R.remoteCall = function (svc, params, cb) {
            try {
                if (/report|informer|banda|geofence|geocerca/i.test(ver(svc)) ||
                    (params && (params.reportTemplateId != null || params.reportObjectId != null))) {
                    out.remoteCall.push({ svc: ver(svc), params: JSON.parse(JSON.stringify(params || {})) });
                    console.log('%c[rc] ' + svc, 'color:#f60', params);
                }
            } catch (_) { /* noop */ }
            return origRC.call(R, svc, params, cb);
        };
        ventana.__rondoRC = origRC;
    } catch (e) { console.warn('No se pudo espiar remoteCall:', e.message); }

    // ── 2) fetch ───────────────────────────────────────────────────────
    try {
        const origF = ventana.fetch;
        ventana.fetch = function (url, opts) {
            try {
                const u = ver(url && url.url ? url.url : url);
                if (/report|informer|export|stat|geofence|geocerca/i.test(u)) {
                    const o = (opts && opts.body) ? (() => { try { return JSON.parse(opts.body); } catch (_) { return ver(opts.body).slice(0, 400); } })() : null;
                    out.fetch.push({ url: u, metodo: (opts && opts.method) || 'GET', cuerpo: o });
                    console.log('%c[fetch] ' + u, 'color:#fa0', o);
                }
            } catch (_) { /* noop */ }
            return origF.apply(this, arguments);
        };
    } catch (e) { console.warn('No se pudo espiar fetch:', e.message); }

    // ── 3) XMLHttpRequest ───────────────────────────────────────────────
    try {
        const origSend = XMLHttpRequest.prototype.send;
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (m, u) {
            this.__u = ver(u);
            this.__m = m;
            return origOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function (cuerpo) {
            try {
                if (/report|informer|export|stat|geofence|geocerca/i.test(this.__u || '')) {
                    out.xhr.push({ url: this.__u, metodo: this.__m, cuerpo: ver(cuerpo).slice(0, 400) });
                    console.log('%c[xhr] ' + this.__u, 'color:#fc0', cuerpo);
                }
            } catch (_) { /* noop */ }
            return origSend.apply(this, arguments);
        };
    } catch (e) { console.warn('No se pudo espiar XHR:', e.message); }

    // ── 4) ReportManager del SDK ────────────────────────────────────────
    try {
        const w = ventana.wialon;
        ['ReportManager', 'Reports', 'Report'].forEach((k) => {
            const m = w && w.core && w.core[k];
            if (!m || typeof m !== 'object') return;
            try {
                if (typeof m.getInstance === 'function') {
                    const inst = m.getInstance();
                    Object.keys(inst || {}).forEach((fn) => {
                        if (typeof inst[fn] !== 'function' || /constructor/i.test(fn)) return;
                        const orig = inst[fn].bind(inst);
                        inst[fn] = function () {
                            out.reportManager.push({ manager: k, fn: fn, args: JSON.parse(JSON.stringify(Array.from(arguments).map((a) => {
                                if (a == null) return a;
                                if (typeof a === 'object') { try { return JSON.parse(JSON.stringify(a)); } catch (_) { return '[obj]'; } }
                                return a;
                            }))) });
                            console.log('%c[rm] ' + k + '.' + fn, 'color:#af0', arguments[0]);
                            return orig.apply(null, arguments);
                        };
                    });
                }
            } catch (e) { console.warn('No se pudo espiar ' + k + ':', e.message); }
        });
    } catch (e) { /* sin SDK */ }

    // ── Volcado ────────────────────────────────────────────────────────
    ventana.__rondoSpy = out;
    ventana.__rondoSpyFin = function () {
        const n = out.remoteCall.length + out.fetch.length + out.xhr.length + out.reportManager.length;
        console.log('%c=== CAPTURADO ===', 'font-weight:700;color:#f60');
        console.log(JSON.stringify(out, null, 1));
        try {
            navigator.clipboard.writeText(JSON.stringify(out, null, 1)).then(
                () => console.log('%cCopiado (' + n + ' llamadas).', 'font-weight:700;color:#0a0'),
                () => console.log('%cCopia el texto a mano.', 'font-weight:700;color:#f60'));
        } catch (_) { console.log('Copia el texto a mano.'); }
        return out;
    };
    console.log('%cESPIA ACTIVA. Abre el informe NATIVO "GEOCERCA", pulsa Ejecutar y luego __rondoSpyFin()',
        'font-weight:700;color:#0af');
    console.log('%cSi no captura nada, el informe nativo no usa la API: puede calcularse en el navegador. En ese caso __rondoSpyFin() lo dira.', 'color:#888');
})();