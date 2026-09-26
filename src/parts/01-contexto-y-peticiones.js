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
    // `red:true` marca fallo de red/CORS (sin respuesta del servidor).
    function httpRequest(opts) {
        const metodo = (opts && opts.method) || 'GET';
        const headers = (opts && opts.headers) || {};
        const body = opts && opts.body;
        const timeoutMs = Math.max(2000, (opts && opts.timeoutMs) || 25000);
        const gm = gmXhr();
        if (gm) {
            return new Promise((resolve) => {
                try {
                    gm({
                        method: metodo,
                        url: opts.url,
                        headers: headers,
                        data: body,
                        timeout: timeoutMs,
                        onload: (r) => resolve({
                            ok: r.status >= 200 && r.status < 300,
                            status: r.status,
                            texto: r.responseText || ''
                        }),
                        onerror: () => resolve({ ok: false, status: 0, texto: '', red: true }),
                        ontimeout: () => resolve({ ok: false, status: 0, texto: '', red: true, timeout: true })
                    });
                } catch (e) {
                    resolve({ ok: false, status: 0, texto: String((e && e.message) || e), red: true });
                }
            });
        }
        const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
        return fetch(opts.url, {
            method: metodo,
            headers: headers,
            body: body,
            signal: ctrl ? ctrl.signal : undefined
        }).then((r) => r.text().then((t) => {
            if (timer) clearTimeout(timer);
            return { ok: r.ok, status: r.status, texto: t };
        })).catch((e) => {
            if (timer) clearTimeout(timer);
            return { ok: false, status: 0, texto: String((e && e.message) || e), red: true };
        });
    }

