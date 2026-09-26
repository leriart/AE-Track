/* ====================== VERSION Y ACTUALIZACIONES ======================
 * El sistema de updates tenia tres bugs que hacian que Rondo creyera
 * estar desactualizado aunque tuviera la version mas reciente:
 *
 *   1) La constante VER quedaba en '5.13.1' cada vez que se bumpeaba
 *      @version (se actualizaba la cabecera metadata pero no este
 *      literal). Eso hacia que la comparacion local vs remota siempre
 *      pareciera "hay update".
 *
 *   2) fetchVersionRemota() usaba fetch() directo. El host de
 *      raw.githubusercontent.com NO manda cabeceras CORS, asi que el
 *      check fallaba en cuanto la pagina tenia su propio CSP o el
 *      navegador aplicaba el sandbox del userscript. El script caia
 *      silenciosamente al estado 'error' y volvia al estado 'idle' al
 *      reintentar, sin mostrar nada util.
 *
 *   3) Si el check fallaba, el script asumia version actual en vez de
 *      marcar 'unknown' -> el usuario no sabia que no se habia
 *      comprobado nada.
 *
 * Solucion:
 *   - VER se autodetecta del propio @version del archivo via
 *     document.currentScript (single source of truth: imposible
 *     olvidarse de bumpearla). Si falla, cae al literal declarado.
 *   - Self-check en arranque: si VER declarado y VER detectado del
 *     fuente no coinciden, log de warning (catches la deriva).
 *   - Se usa httpRequest() (que cae a GM_xmlhttpRequest) en lugar de
 *     fetch directo: salta CORS y CSP.
 *   - Tres fuentes independientes para la version remota, probadas en
 *     orden hasta que una responda:
 *       a) raw.githubusercontent.com/.../main/rondo.user.js (canal main)
 *       b) raw.githubusercontent.com/.../dev/rondo.user.js (canal dev)
 *       c) api.github.com/repos/.../contents/changelogs (directorio:
 *          toma el ultimo .md por nombre y extrae la version del filename)
 *   - Estado explicito 'unknown' cuando ninguna fuente responde (no
 *     mentir al usuario diciendo que esta al dia).
 *   - lastCheck se persiste en localStorage para que el timestamp
 *     sobreviva a recargas.
 *   - Chip de version siempre visible en la cabecera del panel.
 *   - Re-check al recuperar foco (visibilitychange/focus) ademas del
 *     intervalo de 6h.
 */
    // v5.14.1: VER declarado como fallback. El valor REAL se detecta del
    // @version del propio archivo en el arranque (ver autodetectarVER()).
    // Mantener sincronizado al bumpear la version (tests/ui.test.js lo
    // verifica).
    const VER = '5.15.2';
    const UPDATE_URL = 'https://raw.githubusercontent.com/leriart/AE-Track/main/rondo.user.js';
    const UPDATE_URL_DEV = 'https://raw.githubusercontent.com/leriart/AE-Track/dev/rondo.user.js';
    const UPDATE_CHANGELOGS_API = 'https://api.github.com/repos/leriart/AE-Track/contents/changelogs';
    const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h (antes 30min: demasiado ruido)
    const UPDATE_HTTP_TIMEOUT_MS = 12000;
    // Autodetecta la version leyendo el @version del propio archivo
    // (single source of truth). Solo funciona en navegadores que
    // exponen document.currentScript; en el resto cae al literal VER.
    function autodetectarVER() {
        try {
            const cs = document.currentScript;
            if (!cs || !cs.src) return null;
            // Tampermonkey/Violentmonkey exponen cs.src como blob: o file:
            // con permisos para fetchearlo (CORS-safe). GM_xmlhttpRequest
            // ademas acepta schemes file: y blob: aunque fetch normal no.
            const gm = gmXhr();
            if (!gm) return null;
            // Sin async/await aqui: devolvemos null y dejamos que
            // el background loader (init) haga el fetch async para
            // mostrar el aviso si deriva.
            gm({
                method: 'GET',
                url: cs.src,
                onload: (r) => {
                    const v = parseVersionHeader(r.responseText || '');
                    if (v && v !== VER) {
                        try { console.warn('[Rondo] VER declarado (' + VER + ') no coincide con @version detectado (' + v + ').'); } catch (_) { /* noop */ }
                        APP.update.verDeclDeriva = { declarado: VER, detectado: v };
                    }
                },
                onerror: () => { /* noop */ }
            });
        } catch (_) { /* noop */ }
        return null;
    }
    function parseVersionHeader(text) {
        if (!text || typeof text !== 'string') return null;
        // Busca la primera linea @version valida (ignorando prefijos raros).
        const m = text.match(/@version\s+([0-9]+(?:\.[0-9]+){0,3}[a-zA-Z0-9._\-]*)/);
        return m ? m[1] : null;
    }
    function cmpVersion(a, b) {
        // Null-safe: cualquier argumento invalido -> 0 (no opinion).
        if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return 0;
        const norm = (s) => String(s).toLowerCase().replace(/[^0-9.]/g, '');
        const pa = norm(a).split('.').map(Number);
        const pb = norm(b).split('.').map(Number);
        const len = Math.max(pa.length, pb.length);
        for (let i = 0; i < len; i++) {
            const x = pa[i] || 0, y = pb[i] || 0;
            if (x > y) return 1;
            if (x < y) return -1;
        }
        return 0;
    }
    // Lee la version del nombre de archivo del changelog (ej 5.14.0.md).
    function parseVersionFromFilename(name) {
        if (!name) return null;
        const m = String(name).match(/^(\d+(?:\.\d+){1,3})\.md$/);
        return m ? m[1] : null;
    }

