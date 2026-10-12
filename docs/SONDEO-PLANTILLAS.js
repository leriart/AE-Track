/* ============================================================================
 * RONDO · SONDEO DE PLANTILLAS DE INFORME
 * ----------------------------------------------------------------------------
 * Pegalo entero en la consola del navegador, en una pestana de AE-Track/Wialon
 * con la sesion iniciada, y dale a Enter.
 *
 * Solo LEE: no crea, no modifica y no borra nada de la plataforma.
 *
 * Que te da:
 *   1. Todas las plantillas de informe que hay en los recursos.
 *   2. De cada una: que servicios de estructura existen (los de Wialon varian
 *      por version) y que devuelve realmente exec_report (columnas, filas y
 *      todo lo demas que trae en reportResult: summary, reportSpec, band...).
 *   3. Al final imprime un JSON para copiar y pegar aqui.
 *
 * ParaPlugin: abre la consola con F12 y pegalo. Si sale "wialon no definido",
 * estas en la pestana equivocada: entra primero en la plataforma.
 * ========================================================================== */
(async () => {
    const R = wialon.core.Remote.getInstance();
    const call = (svc, params) => new Promise((res, rej) => {
        R.remoteCall(svc, params, (code, result) => code ? rej(new Error(svc + ' -> code ' + code)) : res(result || {}));
    });
    const log = (t) => console.log('%c' + t, 'font-weight:700;color:#0af');
    const salida = { plantillas: [], servicios: {}, momento: new Date().toISOString() };

    // 1) Plantillas de informe de todos los recursos
    log('1. Buscando plantillas de informe...');
    let items = [];
    try {
        const r = await call('core/search_items', {
            spec: { itemsType: 'avl_resource', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 8192, from: 0, to: 0
        });
        items = r.items || [];
    } catch (e) { console.error('No se pudieron leer los recursos:', e.message); return; }
    const tpls = [];
    items.forEach((res) => {
        const rep = res && res.rep;
        if (!rep || typeof rep !== 'object') return;
        Object.keys(rep).forEach((k) => {
            const t = rep[k];
            if (t && t.id != null) tpls.push({ rid: res.id, id: t.id, nombre: t.n || ('Plantilla ' + t.id) });
        });
    });
    log('   -> ' + tpls.length + ' plantilla(s)');

    // 2) Servicios que PODRIAN dar la estructura/filtros de una plantilla.
    //    No todas las versiones de Wialon los tienen: se prueban y se anota
    //    cuales respondieron.
    const introspeccion = [
        ['report/get_report_structure', (t) => ({ reportResourceId: t.rid, reportTemplateId: t.id })],
        ['report/get_report_template', (t) => ({ reportResourceId: t.rid, reportTemplateId: t.id })],
        ['report/get_report_spec', (t) => ({ reportResourceId: t.rid, reportTemplateId: t.id })],
        ['report/get_report_source', (t) => ({ reportResourceId: t.rid, reportTemplateId: t.id })],
        ['report/get_report', (t) => ({ reportResourceId: t.rid, reportTemplateId: t.id })]
    ];

    // 3) Una ejecucion corta por plantilla (24 h, toda la flota) y volcado de
    //    TODO lo que devuelve, que es donde se ven los filtros/objetos.
    const ahora = Math.floor(Date.now() / 1000);
    for (const t of tpls) {
        const info = { rid: t.rid, id: t.id, nombre: t.nombre, servicios: {}, ejecucion: null };
        // 3a) Introspeccion
        for (const [svc, mk] of introspeccion) {
            try {
                const r = await call(svc, mk(t));
                info.servicios[svc] = { ok: true, claves: Object.keys(r || {}) };
                salida.servicios[svc] = true;
            } catch (e) {
                info.servicios[svc] = { ok: false, error: e.message };
            }
        }
        // 3b) Ejecucion real (el indice de mensajes se limpia luego)
        try {
            const r = await call('report/exec_report', {
                reportResourceId: t.rid, reportTemplateId: t.id,
                reportObjectId: 0, reportObjectSecId: 0,
                interval: { from: ahora - 24 * 3600, to: ahora, flags: 0 }
            });
            const rr = (r && r.reportResult) ? r.reportResult : (r || {});
            const filas = Array.isArray(rr.rows) ? rr.rows : (Array.isArray(rr.stats) ? rr.stats : []);
            info.ejecucion = {
                ok: true,
                clavesRaiz: Object.keys(r || {}),
                clavesResultado: Object.keys(rr || {}),
                columnas: (rr.columns || []).map((c) => (c && (c.n || c.t)) || c),
                nFilas: filas.length,
                muestra: filas.slice(0, 3),
                // Lo que venga SIN las filas: aqui suelen salir el resumen,
                // el objeto usado, la banda y los parametros del informe.
                resto: Object.keys(rr || {}).filter((k) => k !== 'rows' && k !== 'stats')
                    .reduce((o, k) => { try { o[k] = rr[k]; } catch (_) { o[k] = '[ilegible]'; } return o; }, {})
            };
        } catch (e) {
            info.ejecucion = { ok: false, error: e.message };
        }
        try { await call('report/cleanup_result', {}); } catch (_) { /* noop */ }
        salida.plantillas.push(info);
        console.log('%c' + t.nombre + ' (#' + t.id + ')', 'font-weight:700', info.ejecucion);
    }

    // 4) Volcado final, para pegar aqui
    const txt = JSON.stringify(salida, null, 1);
    console.log('%c=== COPIA ESTO Y PEGAMELO ===', 'font-weight:700;color:#f60');
    console.log(txt);
    try {
        navigator.clipboard.writeText(txt).then(
            () => log('Copiado al portapapeles.'),
            () => log('No se pudo copiar: selecciona el texto de arriba y copialo a mano.'));
    } catch (_) { log('Selecciona el texto de arriba y copialo a mano.'); }
    log('Fin del sondeo. Plantillas: ' + salida.plantillas.length);
})();