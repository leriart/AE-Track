/* ============================================================================
 * RONDO · SONDEO DE PLANTILLAS DE INFORME (v2)
 * ----------------------------------------------------------------------------
 * Pegalo entero en la consola del navegador (F12), dentro de AE-Track con la
 * sesion iniciada, y dale a Enter. Solo LEE: no crea ni modifica nada.
 *
 * La v1 enseño que report/exec_report con reportObjectId 0 responde
 * "code 7" en esta plataforma. Esta v2 comprueba que pasando el id de una
 * unidad REAL la llamada entra, y si entra, vuelca:
 *   - que servicios de estructura existen en esta version
 *   - que devuelve exec_report: columnas, filas y todo lo que viene en
 *     reportResult sin las filas (summary, reportSpec, banda, objeto...)
 *   - los campos que salen vacios (los filtros que le faltan a la plantilla)
 * Al final imprime un JSON para copiar y pegar.
 * ========================================================================== */
(async () => {
    const R = wialon.core.Remote.getInstance();
    const call = (svc, params) => new Promise((res, rej) => {
        R.remoteCall(svc, params, (code, result) => code ? rej(new Error(code + '')) : res(result || {}));
    });
    const log = (t) => console.log('%c' + t, 'font-weight:700;color:#0af');
    const salida = { momento: new Date().toISOString(), llamadaValida: null, plantillas: [] };

    // 1) Unidades (el objeto que hay que pasarle al informe)
    log('1. Leyendo unidades...');
    let unidades = [];
    try {
        const r = await call('core/search_items', {
            spec: { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 1024, from: 0, to: 0
        });
        unidades = (r.items || []).slice(0, 5).map((u) => ({ id: u.id, nm: u.nm || u.n || '' }));
    } catch (e) { console.error('No se pudieron leer las unidades:', e.message); }
    log('   -> ' + unidades.length + ' unidad(es) de prueba: ' +
        unidades.map((u) => u.id + '=' + u.nm).join(', '));

    // 2) Plantillas
    let tpls = [];
    try {
        const r = await call('core/search_items', {
            spec: { itemsType: 'avl_resource', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 8192, from: 0, to: 0
        });
        (r.items || []).forEach((res) => {
            const rep = res && res.rep;
            if (!rep || typeof rep !== 'object') return;
            Object.keys(rep).forEach((k) => {
                const t = rep[k];
                if (t && t.id != null) tpls.push({ rid: res.id, id: t.id, nombre: t.n || ('Plantilla ' + t.id) });
            });
        });
    } catch (e) { console.error('No se pudieron leer las plantillas:', e.message); return; }
    log('   -> ' + tpls.length + ' plantilla(s)');

    // 3) La plantilla que nos interesa (cambia el id si hace falta)
    const ELEGIDA = 'GEOCERCA';
    const t = tpls.filter((x) => (x.nombre || '').toUpperCase().indexOf(ELEGIDA) >= 0)[0] || tpls[0];
    if (!t) { console.error('No hay plantillas.'); return; }
    log('3. Probando la llamada con "' + t.nombre + '" (#' + t.id + ')...');

    // 3a) Cuatro variantes, para saber cual acepta el servidor. La que
    //     funcione es la que usara Rondo.
    const ahora = Math.floor(Date.now() / 1000);
    const desde = ahora - 24 * 3600;
    const uid = unidades.length ? unidades[0].id : 0;
    const variantes = [
        ['objeto real + interval', {
            reportResourceId: t.rid, reportTemplateId: t.id,
            reportObjectId: uid, reportObjectSecId: 0,
            interval: { from: desde, to: ahora, flags: 0 }
        }],
        ['objeto 0 + interval', {
            reportResourceId: t.rid, reportTemplateId: t.id,
            reportObjectId: 0, reportObjectSecId: 0,
            interval: { from: desde, to: ahora, flags: 0 }
        }],
        ['objeto real + reportSrc/reportDst', {
            reportResourceId: t.rid, reportTemplateId: t.id,
            reportObjectId: uid, reportObjectSecId: 0,
            reportSrc: { reportFilter: '', reportLimit: 0, reportOffset: 0, reportObjectId: uid },
            reportDst: { type: 'json', fields: [] },
            interval: { from: desde, to: ahora, flags: 0 }
        }],
        ['objeto real + interval sin flags', {
            reportResourceId: t.rid, reportTemplateId: t.id,
            reportObjectId: uid, reportObjectSecId: 0,
            interval: { from: desde, to: ahora }
        }]
    ];
    const resultados = [];
    for (const [nombre, params] of variantes) {
        try {
            const r = await call('report/exec_report', params);
            const rr = (r && r.reportResult) ? r.reportResult : (r || {});
            const filas = Array.isArray(rr.rows) ? rr.rows : (Array.isArray(rr.stats) ? rr.stats : []);
            const res = {
                variante: nombre, ok: true,
                clavesRaiz: Object.keys(r || {}),
                clavesResultado: Object.keys(rr || {}),
                columnas: (rr.columns || []).map((c) => (c && (c.n || c.t)) || c),
                nFilas: filas.length,
                muestra: filas.slice(0, 3),
                resto: Object.keys(rr || {}).filter((k) => k !== 'rows' && k !== 'stats')
                    .reduce((o, k) => { try { o[k] = rr[k]; } catch (_) { o[k] = '[ilegible]'; } return o; }, {})
            };
            resultados.push(res);
            console.log('%cOK: ' + nombre, 'color:#0a0;font-weight:700', res);
            if (!salida.llamadaValida) salida.llamadaValida = { variante: nombre, params: Object.keys(params) };
        } catch (e) {
            resultados.push({ variante: nombre, ok: false, error: 'code ' + e.message });
            console.log('%cFALLA: ' + nombre + ' (code ' + e.message + ')', 'color:#a00');
        }
        try { await call('report/cleanup_result', {}); } catch (_) { /* noop */ }
    }

    // 4) Con la variante que funciono, Todas las plantillas: que traen y que
    //    columnas salen vacias (eso suele ser el filtro que les falta).
    const buena = resultados.find((r) => r.ok);
    if (buena) {
        log('4. Volcando TODAS las plantillas con la variante "' + buena.variante + '"...');
        for (const x of tpls) {
            const info = { id: x.id, nombre: x.nombre, ok: false };
            try {
                const r = await call('report/exec_report', {
                    reportResourceId: x.rid, reportTemplateId: x.id,
                    reportObjectId: uid, reportObjectSecId: 0,
                    interval: { from: desde, to: ahora, flags: 0 }
                });
                const rr = (r && r.reportResult) ? r.reportResult : (r || {});
                const filas = Array.isArray(rr.rows) ? rr.rows : (Array.isArray(rr.stats) ? rr.stats : []);
                const cols = (rr.columns || []).map((c) => (c && (c.n || c.t)) || c);
                const planas = filas.map((f) => (Array.isArray(f) ? f : Object.keys(f || {}).map((k) => f[k])));
                info.ok = true;
                info.columnas = cols;
                info.nFilas = filas.length;
                info.muestra = planas.slice(0, 3);
                info.columnasVacias = cols.filter((c, i) => !planas.some((f) => f[i] != null && String(f[i]).trim() !== ''));
                info.clavesResultado = Object.keys(rr || {});
                info.resto = Object.keys(rr || {}).filter((k) => k !== 'rows' && k !== 'stats')
                    .reduce((o, k) => { try { o[k] = rr[k]; } catch (_) { o[k] = '[ilegible]'; } return o; }, {});
            } catch (e) { info.error = 'code ' + e.message; }
            try { await call('report/cleanup_result', {}); } catch (_) { /* noop */ }
            salida.plantillas.push(info);
        }
    }

    salida.variantes = resultados.map((r) => (r.ok ? (r.variante + ': OK') : (r.variante + ': ' + r.error)));
    const txt = JSON.stringify(salida, null, 1);
    console.log('%c=== COPIA ESTO Y PEGAMELO ===', 'font-weight:700;color:#f60');
    console.log(txt);
    try {
        navigator.clipboard.writeText(txt).then(
            () => log('Copiado al portapapeles.'),
            () => log('Copia el texto de arriba a mano.'));
    } catch (_) { log('Copia el texto de arriba a mano.'); }
    log('Fin: ' + salida.variantes.join(' | '));
})();