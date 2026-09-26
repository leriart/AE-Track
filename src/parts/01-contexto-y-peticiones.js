    /* ====================== CONTEXTO Y PETICIONES ======================
     * Desde la 5.12.2 el script declara @grant GM_xmlhttpRequest para poder
     * llamar a las APIs de IA (que no mandan cabeceras CORS) sin que el
     * navegador corte la peticion. Con ese grant el script corre en el
     * sandbox del gestor de userscripts, asi que:
     *
     *   - La API de Wialon (global `wialon`) vive en el window REAL de la
     *     pagina. La tomamos de `unsafeWindow` cuando exista (Tampermonkey y
     *     Violentmonkey lo exponen con grants) y caemos a `window`.
     *   - `window.localStorage`/`document`/etc. siguen funcionando porque el
     *     sandbox los proxea.
     *
     * `httpRequest()` usa GM_xmlhttpRequest si esta disponible (salta CORS y
     * CSP) y cae a `fetch` si no (por ejemplo con @grant none en algun
     * gestor que no lo exponga).
     */
    const PAGE = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;

    function gmXhr() {
        try {
            if (typeof GM_xmlhttpRequest === 'function') return GM_xmlhttpRequest;
            if (typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function') return GM.xmlHttpRequest.bind(GM);
        } catch (_) { /* noop */ }
        return null;
    }
    // Peticion HTTP unificada. Devuelve Promise<{ok, status, texto, red?}>.
    // `red:true` marca fallo de red/CORS (sin respuesta del servidor) y
    // `timeout:true` distingue el corte por tiempo del resto de fallos.
    function httpRequest(opts) {
        const url = opts && opts.url;
        // Sin URL no hay peticion posible. Resolver como fallo en vez de
        // dejar que `opts.url` lance y rompa el `await` del llamador.
        if (!url) return Promise.resolve({ ok: false, status: 0, texto: 'URL vacia', red: true });
        const metodo = (opts && opts.method) || 'GET';
        const headers = (opts && opts.headers) || {};
        const body = opts && opts.body;
        const timeoutMs = Math.max(2000, (opts && opts.timeoutMs) || 25000);
        const gm = gmXhr();
        if (gm) {
            return new Promise((resolve) => {
                let listo = false;
                let safety = null;
                // Resolucion unica: el callback del gestor y el temporizador
                // de seguridad pueden competir; gana el primero y el timer
                // se limpia para no dejar trabajo colgando.
                const terminar = (res) => {
                    if (listo) return;
                    listo = true;
                    if (safety) clearTimeout(safety);
                    resolve(res);
                };
                // Red de seguridad: si el gestor no soporta la opcion
                // `timeout` no dispara ontimeout y la promesa quedaria
                // pendiente para siempre. Preferimos resolver como timeout.
                try {
                    safety = setTimeout(() => terminar({ ok: false, status: 0, texto: '', red: true, timeout: true }), timeoutMs + 2000);
                } catch (_) { safety = null; }
                try {
                    gm({
                        method: metodo,
                        url: url,
                        headers: headers,
                        data: body,
                        timeout: timeoutMs,
                        onload: (r) => terminar({
                            ok: r.status >= 200 && r.status < 300,
                            status: r.status,
                            texto: r.responseText || ''
                        }),
                        onerror: () => terminar({ ok: false, status: 0, texto: '', red: true }),
                        ontimeout: () => terminar({ ok: false, status: 0, texto: '', red: true, timeout: true })
                    });
                } catch (e) {
                    terminar({ ok: false, status: 0, texto: String((e && e.message) || e), red: true });
                }
            });
        }
        if (typeof fetch !== 'function') {
            return Promise.resolve({ ok: false, status: 0, texto: 'fetch no disponible', red: true });
        }
        const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
        let peticion;
        try {
            // fetch() lanza SINCRONAMENTE ante una URL malformada o un scheme
            // no soportado. Sin este try/catch el throw escaparia de
            // httpRequest y romperia a quien hace `await httpRequest(...)`.
            peticion = fetch(url, {
                method: metodo,
                headers: headers,
                body: body,
                signal: ctrl ? ctrl.signal : undefined
            });
        } catch (e) {
            if (timer) clearTimeout(timer);
            return Promise.resolve({ ok: false, status: 0, texto: String((e && e.message) || e), red: true });
        }
        return peticion.then((r) => r.text().then((t) => {
            if (timer) clearTimeout(timer);
            return { ok: r.ok, status: r.status, texto: t };
        })).catch((e) => {
            if (timer) clearTimeout(timer);
            return { ok: false, status: 0, texto: String((e && e.message) || e), red: true };
        });
    }

