/* ============================================================================
 * RONDO · PLANTILLAS (v5) · ejecutar, leer y paginar el resultado
 * ----------------------------------------------------------------------------
 * Pegalo en la consola (F12) de AE-Track con sesion iniciada. Solo LEE.
 *
 * Lo que ya sabemos:
 *   - exec_report con reportObjectId 0 -> code 7
 *   - exec_report con objeto real       -> code 4   (error interno)
 *   - la plataforma usa report/select_result_rows {tableIndex, config:{type:'range'}}
 *     es decir: ejecuta UNA vez y despues pagina el resultado desde el servidor
 *   - no hay servicios de estructura de plantillas (code 2)
 *
 * Sospecha fuerte: el code 4 es porque habia un resultado viejo sin limpiar.
 * Este script hace, en orden y con lo que Capture la espia v4:
 *   1. report/cleanup_result   (dejar la sesion limpia)
 *   2. report/exec_report      (ejecutar con una unidad real)
 *   3. report/get_result       (leer el resultado entero)
 *   4. report/select_result_rows (paginar, con la forma capturada)
 *
 * Ademas deja la espia puesta: ejecuta el informe NATIVO y luego
 * __rondoSpyFin() para copiar la llamada exacta de la pantalla.
 * ========================================================================== */
(function () {
    const ventana = window;
    const out = { momento: new Date().toISOString(), pasos: [] };
    const log = (t) => console.log('%c' + t, 'font-weight:700;color:#0af');
    const ok = (t) => console.log('%cOK    ' + t, 'color:#0a0;font-weight:700');
    const ko = (t) => console.log('%cFALLA ' + t, 'color:#a00;font-weight:700');
    const call = (svc, params) => new Promise((res) => {
        const R = wialon.core.Remote.getInstance();
        R.remoteCall(svc, params || {}, (code, r) => res({ code: code, r: r || {} }));
    });
    const resumen = (rr) => {
        const filas = Array.isArray(rr.rows) ? rr.rows : (Array.isArray(rr.stats) ? rr.stats : []);
        return {
            claves: Object.keys(rr || {}),
            columnas: (rr.columns || []).map((c) => (c && (c.n || c.t)) || c),
            nFilas: filas.length,
            muestra: filas.slice(0, 3),
            resto: Object.keys(rr || {}).filter((k) => k !== 'rows' && k !== 'stats')
                .reduce((o, k) => { try { o[k] = rr[k]; } catch (_) { o[k] = '[ilegible]'; } return o; }, {})
        };
    };

    // ── Espia (igual que v4) ──────────────────────────────────────────
    const cap = [];
    try {
        const R = wialon.core.Remote.getInstance();
        const orig = R.remoteCall;
        R.remoteCall = function (svc, params, cb) {
            try {
                if (/report/i.test(String(svc))) {
                    cap.push({ svc: String(svc), params: JSON.parse(JSON.stringify(params || {})) });
                    console.log('%c[espia] ' + svc, 'color:#f60', params);
                }
            } catch (_) { /* noop */ }
            return orig.call(R, svc, params, cb);
        };
        ventana.__rondoRC = orig;
    } catch (e) { console.warn(e.message); }

    (async () => {
        // unidades + recurso + plantillas
        const u = await call('core/search_items', {
            spec: { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 1024, from: 0, to: 0
        });
        const unidades = u.r.items || [];
        const res = await call('core/search_items', {
            spec: { itemsType: 'avl_resource', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 8192, from: 0, to: 0
        });
        const tpls = [];
        (res.r.items || []).forEach((x) => {
            const rep = x.rep;
            if (!rep || typeof rep !== 'object') return;
            Object.keys(rep).forEach((k) => {
                const t = rep[k];
                if (t && t.id != null) tpls.push({ rid: x.id, id: t.id, nombre: t.n || ('Plantilla ' + t.id) });
            });
        });
        const t = tpls.filter((x) => (x.nombre || '').toUpperCase().indexOf('GEOCERCA') >= 0)[0] || tpls[0];
        const uid = (unidades[0] && unidades[0].id) || 0;
        log('recurso=' + ((t && t.rid) || '?') + '  unidad=' + uid + ' (' + ((unidades[0] && unidades[0].nm) || '') + ')  plantilla=' + (t ? t.nombre + '#' + t.id : '?'));
        if (!t) { ko('sin plantillas'); return; }

        const ahora = Math.floor(Date.now() / 1000);
        const desde = ahora - 24 * 3600;

        // 1) LIMPIAR la sesion (esto puede ser lo que quita el code 4)
        const c1 = await call('report/cleanup_result', {});
        out.pasos.push({ paso: 'cleanup_result', code: c1.code });
        (c1.code === 0 ? ok : ko)('1) cleanup_result -> code ' + c1.code);

        // 2) Ejecutar con la sesion limpia
        const p = {
            reportResourceId: t.rid, reportTemplateId: t.id,
            reportObjectId: uid, reportObjectSecId: 0,
            interval: { from: desde, to: ahora, flags: 0 }
        };
        const e = await call('report/exec_report', p);
        out.pasos.push({ paso: 'exec_report', code: e.code, params: p, resultado: e.code === 0 ? resumen(e.r.reportResult || e.r) : null });
        if (e.code === 0) {
            ok('2) exec_report ENTRA tras limpiar -> ' + (out.pasos[1].resultado.nFilas) + ' fila(s)');
            console.log(out.pasos[1].resultado);
        } else {
            ko('2) exec_report -> code ' + e.code);

            // 2b) Si sigue fallando, probar el recurso como objeto y sin cleanup de por medio
            for (const [n, pp] of [
                ['recurso como objeto', Object.assign({}, p, { reportObjectId: t.rid })],
                ['unidad + reportSrc', Object.assign({}, p, { reportSrc: { reportFilter: '', reportLimit: 0, reportOffset: 0 } })],
                ['sin reportObjectSecId', { reportResourceId: t.rid, reportTemplateId: t.id, reportObjectId: uid, interval: { from: desde, to: ahora, flags: 0 } }]
            ]) {
                await call('report/cleanup_result', {});
                const r = await call('report/exec_report', pp);
                out.pasos.push({ paso: 'exec_report ' + n, code: r.code, params: pp, resultado: r.code === 0 ? resumen(r.r.reportResult || r.r) : null });
                (r.code === 0 ? ok : ko)('2b) ' + n + ' -> code ' + r.code);
                if (r.code === 0) console.log(resumen(r.r.reportResult || r.r));
            }
        }

        // 3) Leer el resultado que haya ahora mismo en la sesion
        //    (puede ser el del informe nativo que tengas abierto)
        const g = await call('report/get_result', {});
        out.pasos.push({ paso: 'get_result', code: g.code, resultado: g.code === 0 ? resumen(g.r.reportResult || g.r) : null });
        (g.code === 0 ? ok : ko)('3) get_result -> code ' + g.code +
            (g.code === 0 ? (' | ' + out.pasos[out.pasos.length - 1].resultado.nFilas + ' fila(s)') : ''));
        if (g.code === 0) console.log(out.pasos[out.pasos.length - 1].resultado);

        // 4) Paginar con la forma que usa la plataforma
        for (const cfg of [
            { type: 'range', data: { from: 0, to: 50 } },
            { type: 'range', data: { from: 0, to: 20 } },
            { type: 'range', data: { offset: 0, limit: 20 } },
            { type: 'all' }
        ]) {
            const s = await call('report/select_result_rows', { tableIndex: 0, config: cfg });
            out.pasos.push({ paso: 'select_result_rows ' + JSON.stringify(cfg), code: s.code, resultado: s.code === 0 ? resumen(s.r.reportResult || s.r) : null });
            (s.code === 0 ? ok : ko)('4) select_result_rows ' + JSON.stringify(cfg) + ' -> code ' + s.code +
                (s.code === 0 ? (' | ' + out.pasos[out.pasos.length - 1].resultado.nFilas + ' fila(s)') : ''));
        }

        const txt = JSON.stringify(out, null, 1);
        console.log('%c=== COPIA ESTO ===', 'font-weight:700;color:#f60');
        console.log(txt);
        try {
            navigator.clipboard.writeText(txt).then(() => log('Copiado.'), () => log('Copia el texto.'));
        } catch (_) { log('Copia el texto.'); }
        ventana.__rondoSpy = cap;
        ventana.__rondoSpyFin = function () {
            const o = { pasos: out.pasos, espia: cap };
            const t2 = JSON.stringify(o, null, 1);
            console.log(t2);
            try { navigator.clipboard.writeText(t2).then(() => log('Copiado.'), () => log('Copia el texto.')); } catch (_) { /* noop */ }
            return o;
        };
        log('Ahora ejecuta el informe NATIVO GEOCERCA y luego __rondoSpyFin()');
    })();
})();