/* ============================================================================
 * RONDO · SONDEO DE PLANTILLAS (v3) · como se llama de verdad a exec_report
 * ----------------------------------------------------------------------------
 * Pegalo en la consola (F12) dentro de AE-Track con sesion iniciada.
 * Solo LEE: no crea ni modifica nada.
 *
 * Lo que sabemos ya:
 *   - reportObjectId 0            -> code 7 (parametros invalidos)
 *   - reportObjectId = id unidad  -> code 4 (error interno del servidor)
 *   - no hay ningun servicio de estructura de plantillas (code 2 en todos)
 *
 * Esta v3 hace DOS cosas:
 *
 *   FASE A (automatica) - prueba una matriz de combinaciones resource/unidad
 *   en reportObjectId, reportObjectSecId, reportSrc/reportDst e interval, y
 *   te dice cual entra.
 *
 *   FASE B (manual)      - se CUELA en remoteCall y apunta todas las llamadas
 *   que hace la propia pantalla de la plataforma. Abre el informe nativo
 *   "GEOCERCA", dale a Ejecutar, y luego ejecuta en la consola:
 *
 *         __rondoSpyFin()
 *
 *   Con eso sale la llamada exacta (servicio + parametros) que usa tu
 *   plataforma, y Rondo puede copiarla tal cual.
 * ========================================================================== */
(function () {
    const R = wialon.core.Remote.getInstance();
    const orig = R.remoteCall;
    const call = (svc, params) => new Promise((res) => {
        orig.call(R, svc, params, (code, result) => res({ code: code, r: result || {} }));
    });
    const log = (t) => console.log('%c' + t, 'font-weight:700;color:#0af');
    const ok = (t) => console.log('%cOK   ' + t, 'color:#0a0;font-weight:700');
    const ko = (t) => console.log('%cFALLA ' + t, 'color:#a00');

    // ───────────────────────── FASE B: espia (se instala ya) ─────────────
    const capturadas = [];
    R.remoteCall = function (svc, params, cb) {
        try {
            if (/report/i.test(String(svc)) || (params && (params.reportTemplateId != null))) {
                capturadas.push({
                    svc: String(svc),
                    params: JSON.parse(JSON.stringify(params || {}))
                });
                console.log('%c[espia] ' + svc, 'color:#f60', params);
            }
        } catch (_) { /* noop */ }
        return orig.call(R, svc, params, cb);
    };
    window.__rondoSpy = capturadas;
    window.__rondoSpyFin = function () {
        R.remoteCall = orig;   // se desconecta la espia
        console.log('%c=== LLAMADAS CAPTURADAS ===', 'font-weight:700;color:#f60');
        console.log(JSON.stringify(capturadas, null, 1));
        try {
            navigator.clipboard.writeText(JSON.stringify(capturadas, null, 1)).then(
                () => log('Copiado al portapapeles.'),
                () => log('Copia el texto de arriba a mano.'));
        } catch (_) { log('Copia el texto de arriba a mano.'); }
        log('Espia desconectada (' + capturadas.length + ' llamada(s)).');
        return capturadas;
    };
    log('ESPIA ACTIVA: abre el informe nativo GEOCERCA, pulsa Ejecutar y luego __rondoSpyFin()');

    // ───────────────────────── FASE A: matriz de llamadas ────────────────
    (async () => {
        log('FASE A: probando combinaciones de parametros...');
        let unidades = [], rid = null, tpls = [];
        const u = await call('core/search_items', {
            spec: { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 1024, from: 0, to: 0
        });
        unidades = u.r.items || [];
        const res = await call('core/search_items', {
            spec: { itemsType: 'avl_resource', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 8192, from: 0, to: 0
        });
        (res.r.items || []).forEach((x) => {
            rid = (x.id != null) ? x.id : rid;
            const rep = x.rep;
            if (!rep || typeof rep !== 'object') return;
            Object.keys(rep).forEach((k) => {
                const t = rep[k];
                if (t && t.id != null) tpls.push({ rid: x.id, id: t.id, nombre: t.n || ('Plantilla ' + t.id) });
            });
        });
        const t = tpls.filter((x) => (x.nombre || '').toUpperCase().indexOf('GEOCERCA') >= 0)[0] || tpls[0];
        const uid = (unidades[0] && unidades[0].id) || 0;
        log('   recurso=' + rid + '  unidad=' + uid + ' (' + ((unidades[0] && unidades[0].nm) || '') + ')  plantilla=' + (t ? t.nombre + '#' + t.id : 'ninguna'));
        if (!t) return;

        const ahora = Math.floor(Date.now() / 1000);
        const desde = ahora - 24 * 3600;
        const iv = { from: desde, to: ahora, flags: 0 };
        const base = { reportResourceId: t.rid, reportTemplateId: t.id };
        const combos = [
            ['recurso / 0', Object.assign({}, base, { reportObjectId: rid, reportObjectSecId: 0, interval: iv })],
            ['recurso / unidad', Object.assign({}, base, { reportObjectId: rid, reportObjectSecId: uid, interval: iv })],
            ['unidad / recurso', Object.assign({}, base, { reportObjectId: uid, reportObjectSecId: rid, interval: iv })],
            ['recurso / 0 + reportSrc', Object.assign({}, base, {
                reportObjectId: rid, reportObjectSecId: 0, interval: iv,
                reportSrc: { reportFilter: '', reportLimit: 0, reportOffset: 0, reportObjectId: rid, reportObjectSecId: 0 }
            })],
            ['recurso / unidad + reportSrc', Object.assign({}, base, {
                reportObjectId: rid, reportObjectSecId: uid, interval: iv,
                reportSrc: { reportFilter: '', reportLimit: 0, reportOffset: 0, reportObjectId: rid, reportObjectSecId: uid }
            })],
            ['recurso / unidad + reportDst', Object.assign({}, base, {
                reportObjectId: rid, reportObjectSecId: uid, interval: iv,
                reportDst: { type: 'json', fields: [] }
            })],
            ['recurso / unidad + reportSrc + reportDst', Object.assign({}, base, {
                reportObjectId: rid, reportObjectSecId: uid, interval: iv,
                reportSrc: { reportFilter: '', reportLimit: 0, reportOffset: 0, reportObjectId: rid, reportObjectSecId: uid },
                reportDst: { type: 'json', fields: [] }
            })],
            ['recurso / unidad, interval sin flags', Object.assign({}, base, {
                reportObjectId: rid, reportObjectSecId: uid, interval: { from: desde, to: ahora }
            })],
            ['recurso / unidad, sin interval', Object.assign({}, base, {
                reportObjectId: rid, reportObjectSecId: uid
            })],
            ['recurso solo', Object.assign({}, base, { reportObjectId: rid })],
            ['unidad solo', Object.assign({}, base, { reportObjectId: uid })]
        ];
        const resA = [];
        for (const [nombre, params] of combos) {
            const r = await call('report/exec_report', params);
            const rr = (r.r && r.r.reportResult) ? r.r.reportResult : (r.r || {});
            const filas = Array.isArray(rr.rows) ? rr.rows : (Array.isArray(rr.stats) ? rr.stats : []);
            if (r.code === 0) {
                ok(nombre + '  -> ' + filas.length + ' fila(s), claves: ' + Object.keys(rr).join(','));
                resA.push({ nombre: nombre, params: params, ok: true, claves: Object.keys(rr), columnas: (rr.columns || []).map((c) => (c && (c.n || c.t)) || c), filas: filas.slice(0, 3) });
            } else {
                ko(nombre + '  -> code ' + r.code);
                resA.push({ nombre: nombre, ok: false, code: r.code });
            }
            try { await call('report/cleanup_result', {}); } catch (_) { /* noop */ }
        }
        log('=== FASE A terminada ===');
        const txt = JSON.stringify({ faseA: resA, capturadas: capturadas }, null, 1);
        console.log(txt);
        try {
            navigator.clipboard.writeText(txt).then(() => log('Copiado.'), () => log('Copia el texto.'));
        } catch (_) { log('Copia el texto.'); }
        log('Recuerda: despues de ejecutar el informe nativo, llama a __rondoSpyFin()');
    })();
})();