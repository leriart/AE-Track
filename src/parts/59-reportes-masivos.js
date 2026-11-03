    /* ====================== REPORTES MASIVOS DE RECORRIDOS ======================
     * Un informe nativo de la plataforma (la plantilla de recorridos que el
     * operador elige) ejecutado UNA VEZ POR UNIDAD con report/exec_report y
     * descargado automaticamente como CSV: un archivo por unidad y rango.
     *
     * Se apoya en la maquinaria de los informes por plantilla (fragmento 55):
     * rxInfEjecuta ya resuelve el modelo de objeto, reintenta cuando la
     * plataforma esta ocupada y parte el intervalo si es demasiado pesado.
     * Aqui solo se itera la flota de una en una (la plataforma calcula UN
     * informe a la vez por sesion) y cada resultado se descarga al terminar:
     * si el lote se interrumpe, lo ya descargado queda en el equipo.
     *
     * El motor (rxMasCorre) recibe las dependencias por parametro y se prueba
     * en tests/reportes-masivos.test.js.
     */
    // Pausa entre descargas: varios archivos seguidos hacen que el navegador
    // pida permiso de "descargas multiples"; espaciarlos evita que descarte
    // los ultimos del lote.
    const RX_MAS_ESPERA_DESCARGA = 700;
    // Estado de la pantalla (dialog-local, como RX_INF): no se persiste.
    const RX_MAS = {
        tpl: null, tpls: [], buscaTpl: '', // plantilla nativa elegida y catalogo
        uni: {}, uniBusca: '',             // id de unidad -> 1 (marcada)
        desde: '', hasta: '',              // fechas YYYY-MM-DD
        // 'pdf' = archivo nativo de la plataforma (report/export_result, con
        // su mapa); 'csv' = tabla del informe en un archivo por unidad.
        formato: 'pdf',
        prog: { activo: false, hechas: 0, total: 0, txt: '', pct: 0 },
        res: null,                         // [{eco, filas, error, nativo}] del ultimo lote
        _token: null, _busy: false, _cargadas: false
    };
    // Unidades de la flota como {id, eco}, ordenadas por economico.
    function rxMasUnidades() {
        const out = [];
        for (const u of (APP.unidades || [])) {
            if (!u || u.id == null) continue;
            let info = null;
            try { info = parseUnitName(u); } catch (_) { info = null; }
            out.push({ id: String(u.id), eco: (info && (info.eco || info.clave)) || u.nm || String(u.id) });
        }
        out.sort((a, b) => String(a.eco).localeCompare(String(b.eco), 'es', { numeric: true }));
        return out;
    }
    function rxMasNombreArchivo(tpl, eco, d, h, ext) {
        const t = String((tpl && tpl.nombre) || 'recorridos').replace(/[^\w\-]+/g, '_').slice(0, 30);
        const e = String(eco || 'unidad').replace(/[^\w\-]+/g, '_').slice(0, 30);
        return 'rondo_recorridos_' + t + '_' + e + '_' + (d || '') + '_a_' + (h || '') + (ext || '.csv');
    }
    // CSV de UNA unidad: fila de metadatos (plantilla, unidad, periodo) y la
    // tabla tal como la devolvio la plataforma.
    function rxMasCSV(tpl, eco, cols, filas) {
        return rxInfCSVTexto(cols, filas, [
            'Reporte masivo de recorridos',
            'Plantilla: ' + ((tpl && tpl.nombre) || ''),
            'Unidad: ' + (eco || ''),
            'Periodo: ' + (RX_MAS.desde || '') + ' a ' + (RX_MAS.hasta || '')
        ]);
    }
    // ── Exportacion NATIVA de la plataforma (report/export_result) ──────
    // El servicio devuelve el archivo del informe que acaba de ejecutarse en
    // la sesion: el MISMO PDF que baja la plataforma, con su mapa, sus graficos
    // y su maquetado. Se pide por HTTP con el sid de la sesion actual.
    function rxMasApiBase() {
        let u = '';
        try { u = rxPlatApiUrl() || ''; } catch (_) { u = ''; }
        if (!u) { try { u = (PAGE.location && PAGE.location.origin) || ''; } catch (_) { u = ''; } }
        if (!u) return '';
        if (/ajax\.html/i.test(u)) return u;
        return u.replace(/\/+$/, '') + '/wialon/ajax.html';
    }
    function rxMasSid() {
        try {
            const s = session();
            if (s && typeof s.getId === 'function') { const v = s.getId(); if (v) return String(v); }
            if (s && s._id) return String(s._id);
        } catch (_) { /* noop */ }
        return '';
    }
    // URL de exportacion. format 2 = PDF (1 HTML, 32 CSV, 4 XLS, 8 XLSX).
    // attachMap incluye el mapa nativo del informe; pageWidth 1 = compacto.
    function rxMasExportUrl(nombre) {
        const base = rxMasApiBase();
        const sid = rxMasSid();
        if (!base || !sid) return '';
        const params = {
            format: 2,
            pageOrientation: 'landscape',
            pageSize: 'a4',
            pageWidth: 1,
            attachMap: 1,
            extendBounds: 1,
            hideMapBasis: 0,
            compress: 1,
            outputFileName: String(nombre || 'recorridos').replace(/\.pdf$/i, '')
        };
        return base + (base.indexOf('?') >= 0 ? '&' : '?') +
            'svc=report/export_result&sid=' + encodeURIComponent(sid) +
            '&params=' + encodeURIComponent(JSON.stringify(params));
    }
    function rxMasDescargaBlob(blob, nombre) {
        try {
            const url = URL.createObjectURL(blob);
            const a = makeEl('a', { href: url });
            a.download = nombre;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) { /* noop */ } }, 4000);
        } catch (_) { /* noop */ }
    }
    // Baja el archivo nativo. Primero por peticion binaria (permite saber
    // cuando termino, sin que la limpieza del siguiente informe corte la
    // descarga a medias); si el gestor no la soporta, navega un iframe oculto
    // (el servidor responde con Content-Disposition: attachment).
    function rxMasBajaNativo(url, nombre) {
        if (!url) return Promise.resolve(false);
        return new Promise((resolve) => {
            let hecho = false;
            const fin = (ok) => { if (!hecho) { hecho = true; resolve(!!ok); } };
            const gm = (typeof gmXhr === 'function') ? gmXhr() : null;
            if (gm) {
                try {
                    gm({
                        method: 'GET', url: url, responseType: 'blob', timeout: 60000,
                        onload: (r) => {
                            if (r.status >= 200 && r.status < 300 && r.response && r.response.size) {
                                rxMasDescargaBlob(r.response, nombre); fin(true);
                            } else fin(false);
                        },
                        onerror: () => fin(false),
                        ontimeout: () => fin(false)
                    });
                } catch (_) { fin(false); }
                return;
            }
            // Ultimo recurso: navegar un iframe oculto. El servidor responde
            // con Content-Disposition: attachment y el navegador lo guarda.
            const porIframe = () => {
                try {
                    const fr = document.createElement('iframe');
                    fr.style.display = 'none';
                    fr.src = url;
                    document.body.appendChild(fr);
                    setTimeout(() => { try { fr.remove(); } catch (_) { /* noop */ } }, 60000);
                    setTimeout(() => fin(true), 3000);
                } catch (_) { fin(false); }
            };
            if (typeof fetch === 'function') {
                fetch(url).then((r) => {
                    if (!r.ok) { porIframe(); return null; }
                    return r.blob().then((b) => { rxMasDescargaBlob(b, nombre); fin(true); });
                }).catch(() => porIframe());
                return;
            }
            porIframe();
        });
    }
    // Ejecuta el informe de UNA unidad sin leer filas: para PDF nativo solo
    // hace falta que la plataforma deje el resultado cargado para exportarlo.
    // No parte el intervalo (un PDF no se puede unir de trozos).
    async function rxMasEjecuta(tpl, u, desde, hasta, token) {
        const enviado = {
            reportResourceId: tpl.rid,
            reportTemplateId: tpl.id,
            reportObjectId: u.id, reportObjectSecId: '0',
            interval: { from: desde, to: hasta, flags: 0 }
        };
        let err = '';
        for (let i = 0; i < 3; i++) {
            if (token && token.cancelado) return { nativo: false, filas: [], error: 'cancelado' };
            try {
                await rxInfLimpiarInforme();
                await remoteCall('report/exec_report', enviado);
                return { nativo: true, filas: [] };
            } catch (e) {
                err = (e && e.message) || String(e);
                if (!/code (1003|1004|4)\b/.test(err) || i === 2) break;
                await rxInfEspera(700 * (i + 1));
            }
        }
        return { nativo: false, filas: [], error: err };
    }
    // Motor del lote. `ejecuta(unidad)` ejecuta el informe nativo de la unidad
    // y `descarga(unidad, resultado)` guarda el archivo (CSV de filas o PDF
    // nativo). Va de una en una porque la plataforma rechaza ejecuciones
    // simultaneas (code 1003/1004). Devuelve el resumen por unidad.
    async function rxMasCorre(unidades, onProg, token, ejecuta, descarga) {
        const res = [];
        const total = (unidades || []).length;
        for (let i = 0; i < total; i++) {
            if (token && token.cancelado) break;
            const u = unidades[i];
            if (onProg) onProg(i, total, u.eco);
            let r = null, err = '';
            try { r = await ejecuta(u); }
            catch (e) { err = (e && e.message) || String(e); }
            const filas = (r && r.filas) || [];
            err = err || (r && r.error) || '';
            const nativo = !!(r && r.nativo && !err);
            res.push({ eco: u.eco, filas: filas.length, error: err, nativo: nativo });
            if (!err && (filas.length || nativo) && typeof descarga === 'function') {
                try {
                    const d = descarga(u, r);
                    if (d && typeof d.then === 'function') await d;
                } catch (e) {
                    // Una descarga fallida no tira el lote, pero queda dicha.
                    res[res.length - 1].error = (e && e.message) || String(e);
                    res[res.length - 1].nativo = false;
                }
                await rxInfEspera(RX_MAS_ESPERA_DESCARGA);
            }
        }
        if (onProg) onProg(total, total, '');
        return res;
    }
    // ── Dialogo ─────────────────────────────────────────────────────────
    function abrirReportesMasivos() {
        const hoy = (typeof rxReplayFechaHoy === 'function') ? rxReplayFechaHoy() : new Date().toISOString().slice(0, 10);
        if (!RX_MAS.hasta) RX_MAS.hasta = hoy;
        if (!RX_MAS.desde) {
            const d = new Date(); d.setDate(d.getDate() - 1);
            RX_MAS.desde = d.toISOString().slice(0, 10);
        }
        abrirDialogo({
            icon: UIS.export,
            titulo: 'Reportes masivos de recorridos',
            ancho: 720,
            okText: 'Cerrar',
            cancel: false,
            html: '<div class="rgi-tool"><div id="rmas-box"></div></div>',
            onOpen: (el) => {
                const box = el.querySelector('#rmas-box');
                // Mismo cuidado que en Rendimientos: el memo de setHtml es por
                // id y al reabrir el nodo es nuevo. Sin invalidar, el cuerpo
                // quedaba vacio. Tambien se cancela una corrida anterior viva.
                try { invalidarHtml('rmas-box'); } catch (_) { /* noop */ }
                if (RX_MAS._token) RX_MAS._token.cancelado = true;
                RX_MAS._busy = false;
                RX_MAS._token = null;
                const tplsFiltradas = () => {
                    const t = norm(RX_MAS.buscaTpl || '');
                    return (RX_MAS.tpls || []).filter((p) => !t || norm(p.nombre).indexOf(t) >= 0).slice(0, 60);
                };
                const unisFiltradas = () => {
                    const t = norm(RX_MAS.uniBusca || '');
                    return rxMasUnidades().filter((u) => !t || norm(u.eco).indexOf(t) >= 0).slice(0, 120);
                };
                const nMarcadas = () => Object.keys(RX_MAS.uni).filter((k) => RX_MAS.uni[k]).length;
                const resumen = () => {
                    const r = RX_MAS.res;
                    if (!r) return '<p class="rgi-more">A\u00fan no se ha generado ning\u00fan lote. Elige plantilla, unidades y periodo y pulsa "Generar y descargar".</p>';
                    const ok = r.filter((x) => !x.error && (x.filas > 0 || x.nativo)).length;
                    const vacias = r.filter((x) => !x.filas && !x.error && !x.nativo).length;
                    const err = r.filter((x) => x.error).length;
                    let h = '<div class="rgi-kpis">' +
                        '<div class="rgi-kpi"><b>' + r.length + '</b><span>Unidades</span></div>' +
                        '<div class="rgi-kpi ok"><b>' + ok + '</b><span>Descargadas</span></div>' +
                        (vacias ? '<div class="rgi-kpi"><b>' + vacias + '</b><span>Sin filas</span></div>' : '') +
                        (err ? '<div class="rgi-kpi vivo"><b>' + err + '</b><span>Con error</span></div>' : '') +
                        '</div>';
                    h += '<p class="rgi-res">' + esc(ok + ' de ' + r.length + ' unidades descargadas' +
                        (vacias ? ', ' + vacias + ' sin filas en el periodo' : '') +
                        (err ? ', ' + err + ' con error' : '') + '.') + '</p>';
                    if (err) {
                        h += '<div class="rgi-prev"><table><thead><tr><th>Unidad</th><th>Detalle</th></tr></thead><tbody>';
                        for (const x of r) {
                            if (!x.error) continue;
                            h += '<tr><td>' + esc(x.eco) + '</td><td>' + esc(rxInfExplicaError(x.error)) + '</td></tr>';
                        }
                        h += '</tbody></table></div>';
                    }
                    return h;
                };
                // Paso numerado, igual que el resto de dialogos de Rondo.
                const paso = (n, tit, cont) => '<div class="rgi-cfg"><div class="rgi-paso-c"><i>' + n + '</i><b>' +
                    esc(tit) + '</b></div>' + cont + '</div>';
                const listaTplHtml = () => {
                    if (!RX_MAS._cargadas) {
                        return '<div class="rgi-tpls" id="rmas-tpls"><p class="rgi-more">Se est\u00e1n leyendo las plantillas de la plataforma\u2026</p></div>';
                    }
                    const lista = tplsFiltradas();
                    if (!lista.length) {
                        return '<div class="rgi-tpls" id="rmas-tpls"><p class="rgi-more">Sin plantillas con ese nombre.</p></div>';
                    }
                    const dis = RX_MAS._busy ? ' disabled' : '';
                    return '<div class="rgi-tpls" id="rmas-tpls">' + lista.map((p) =>
                        '<div class="rgi-tpl' + (RX_MAS.tpl && rxInfClave(RX_MAS.tpl) === rxInfClave(p) ? ' activo' : '') + '">' +
                        '<button type="button" class="rgi-tpl-sel" data-tpl="' + esc(rxInfClave(p)) + '"' + dis + '>' +
                        '<b>' + esc(p.nombre) + '</b><i>Plantilla ' + esc(String(p.id)) + '</i></button>' +
                        '</div>').join('') + '</div>';
                };
                const listaUniHtml = () => {
                    const dis = RX_MAS._busy ? ' disabled' : '';
                    return unisFiltradas().map((u) =>
                        '<button type="button" class="rgi-chip' + (RX_MAS.uni[u.id] ? ' activo' : '') +
                        '" data-uni="' + esc(u.id) + '"' + dis + '>' + esc(u.eco) + '</button>').join('');
                };
                const cuerpo = () => {
                    const dis = RX_MAS._busy ? ' disabled' : '';
                    const hero = '<div class="rgi-hero"><span class="rgi-heroico rondo-usym">' + UIS.export + '</span>' +
                        '<div class="rgi-herot"><b>' + esc(RX_MAS.tpl ? RX_MAS.tpl.nombre : 'Reportes masivos de recorridos') + '</b>' +
                        '<span>' + esc(RX_MAS.tpl
                            ? (RX_MAS.formato === 'csv'
                                ? 'Un CSV por unidad con las filas del informe nativo'
                                : 'PDF nativo de la plataforma por unidad, con su mapa')
                            : 'Elige la plantilla nativa de recorridos de la plataforma') + '</span></div>' +
                        '<i class="rgi-ori">API</i></div>';
                    const paso1 = paso(1, 'Plantilla de recorridos',
                        '<div class="rgi-row"><span class="rgi-lb">Buscar</span>' +
                        '<span class="rgi-busca"><span class="rondo-usym">' + UIS.filter + '</span>' +
                        '<input type="text" id="rmas-tpl-busca" class="filtro" placeholder="Buscar plantilla\u2026" value="' + esc(RX_MAS.buscaTpl) + '"' + dis + '>' +
                        '<i id="rmas-tpl-n">' + tplsFiltradas().length + '/' + (RX_MAS.tpls || []).length + '</i></span>' +
                        '<button type="button" class="mini" id="rmas-tpl-cargar"' + dis + '>' +
                        '<span class="rondo-usym">' + UIS.refresh + '</span> Leer plantillas</button></div>' +
                        listaTplHtml() +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        'Usa la plantilla de recorridos que ya tienes definida en la plataforma (con sus filtros y columnas).</span></div>');
                    const paso2 = paso(2, 'Unidades',
                        '<div class="rgi-row"><span class="rgi-lb">Buscar</span>' +
                        '<span class="rgi-busca"><span class="rondo-usym">' + UIS.filter + '</span>' +
                        '<input type="text" id="rmas-uni-busca" class="filtro" placeholder="Buscar unidad\u2026" value="' + esc(RX_MAS.uniBusca) + '"' + dis + '>' +
                        '<i id="rmas-uni-n">' + nMarcadas() + ' marcada(s)</i></span>' +
                        '<button type="button" class="mini" id="rmas-unis-todas"' + dis + '>todas</button>' +
                        '<button type="button" class="mini" id="rmas-unis-ninguna"' + dis + '>ninguna</button></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><div class="rgi-chips rgi-unis" id="rmas-unis">' +
                        listaUniHtml() + '</div></div>');
                    const fmtChip = (v, txt, tit) => '<button type="button" class="rgi-chip' +
                        (RX_MAS.formato === v ? ' activo' : '') + '" data-fmt="' + v + '"' + dis +
                        (tit ? ' title="' + esc(tit) + '"' : '') + '>' + esc(txt) + '</button>';
                    const paso3 = paso(3, 'Periodo y formato',
                        '<div class="rgi-row"><span class="rgi-lb">Fechas</span><span class="rgi-rango">' +
                        '<input type="date" id="rmas-desde" class="filtro" title="Dia inicial (incluido)" value="' + esc(RX_MAS.desde) + '"' + dis + '>' +
                        '<span class="sep">\u2192</span>' +
                        '<input type="date" id="rmas-hasta" class="filtro" title="Dia final (incluido)" value="' + esc(RX_MAS.hasta) + '"' + dis + '>' +
                        '</span></div>' +
                        '<div class="rgi-row"><span class="rgi-lb">Formato</span><div class="rgi-chips">' +
                        fmtChip('pdf', 'PDF nativo (plataforma)', 'report/export_result: el mismo PDF de la plataforma, con mapa') +
                        fmtChip('csv', 'CSV', 'Las filas del informe en un archivo por unidad') +
                        '</div></div>');
                    const aviso = '<div class="rgi-aviso">Se descarga <b>un ' +
                        (RX_MAS.formato === 'csv' ? 'CSV' : 'PDF') + ' por unidad</b>. ' +
                        'El navegador puede pedir permiso para descargas m\u00faltiples: conc\u00e9delo para no perder ninguno.</div>';
                    const ejecutar = RX_MAS._busy
                        ? '<button type="button" class="rgi-btn gen busy" id="rmas-cancel">' +
                          '<span class="rondo-usym">' + UIS.close + '</span><b>Cancelar</b><i>lo descargado se conserva</i></button>'
                        : '<button type="button" class="rgi-btn gen pulsa" id="rmas-generar">' +
                          '<span class="rondo-usym">' + UIS.play + '</span><b>Generar y descargar</b><i>' +
                          (RX_MAS.formato === 'csv' ? 'CSV' : 'PDF nativo') + ' \u00b7 ' +
                          (nMarcadas() ? (nMarcadas() + ' unidad(es)') : 'marca unidades') + '</i></button>';
                    const barra = '<div class="rgi-generar">' + ejecutar +
                        '<span class="rgi-gen-hint">' + esc(RX_MAS._busy
                            ? 'La plataforma calcula un informe a la vez; no cierres el di\u00e1logo.'
                            : (RX_MAS.formato === 'csv'
                                ? 'Se ejecuta la plantilla unidad por unidad y cada resultado se descarga en CSV.'
                                : 'La plataforma genera su PDF (con mapa); se baja uno por unidad.')) + '</span></div>';
                    const prog = '<div class="rgi-carga" id="rmas-prog"' + (RX_MAS.prog.activo ? ' style="display:flex"' : '') + '>' +
                        '<span id="rmas-prog-t">' + esc(RX_MAS.prog.txt || '') + '</span>' +
                        '<span class="rgi-barra"><i id="rmas-prog-b" style="width:' + Math.max(2, RX_MAS.prog.pct || 0) + '%"></i></span></div>';
                    return '<div class="rgi">' + hero + paso1 + paso2 + paso3 + aviso + prog + barra +
                        '<div id="rmas-dyn">' + resumen() + '</div></div>';
                };
                const pinta = () => { if (box && box.isConnected !== false) setHtml(box, cuerpo()); };
                const setProg = (pct, txt, hechas, total) => {
                    RX_MAS.prog = {
                        activo: pct != null, pct: pct || 0, txt: txt || '',
                        hechas: hechas || 0, total: total || 0
                    };
                    const p = byId('rmas-prog');
                    if (!p) return;
                    p.style.display = (pct != null) ? 'flex' : 'none';
                    const t = byId('rmas-prog-t'), b = byId('rmas-prog-b');
                    if (t) t.textContent = txt || '';
                    if (b) b.style.width = clamp(pct || 0, 0, 100) + '%';
                };
                const generar = async () => {
                    if (RX_MAS._busy) return;
                    if (!RX_MAS.tpl) { adviceWarn('Recorridos masivos', 'Elige la plantilla de recorridos.'); return; }
                    const unidades = rxMasUnidades().filter((u) => RX_MAS.uni[u.id]);
                    if (!unidades.length) { adviceWarn('Recorridos masivos', 'Marca al menos una unidad.'); return; }
                    const desde = rxRendFechaSeg(RX_MAS.desde, false);
                    const hasta = rxRendFechaSeg(RX_MAS.hasta, true);
                    if (!desde || !hasta || hasta <= desde) { adviceWarn('Recorridos masivos', 'Revisa el periodo (desde/hasta).'); return; }
                    const tpl = RX_MAS.tpl;
                    const fmt = RX_MAS.formato === 'csv' ? 'csv' : 'pdf';
                    RX_MAS._busy = true;
                    RX_MAS._token = { cancelado: false };
                    RX_MAS.res = null;
                    pinta();
                    try {
                        // CSV: filas del informe (rxInfEjecuta, con troceado).
                        // PDF: ejecuta y deja el resultado cargado; el archivo
                        // lo genera la propia plataforma con report/export_result.
                        const ejecuta = fmt === 'csv'
                            ? (u) => rxInfEjecuta(tpl, { id: u.id, eco: u.eco }, desde, hasta, RX_MAS._token, 0, null)
                            : (u) => rxMasEjecuta(tpl, u, desde, hasta, RX_MAS._token);
                        const descarga = fmt === 'csv'
                            ? (u, r) => {
                                rxInfDescarga(rxMasCSV(tpl, u.eco, r.cols, r.filas),
                                    rxMasNombreArchivo(tpl, u.eco, RX_MAS.desde, RX_MAS.hasta, '.csv'), 'text/csv;charset=utf-8;');
                            }
                            : (u) => {
                                const nombre = rxMasNombreArchivo(tpl, u.eco, RX_MAS.desde, RX_MAS.hasta, '.pdf');
                                return rxMasBajaNativo(rxMasExportUrl(nombre), nombre).then((ok) => {
                                    if (!ok) throw new Error('la plataforma no devolvio el PDF');
                                });
                            };
                        const res = await rxMasCorre(unidades,
                            (h, t, eco) => {
                                const pct = t ? 4 + Math.round((h / t) * 94) : 4;
                                setProg(pct, eco ? ('Unidad ' + (h + 1) + ' de ' + t + ': ' + eco) : 'Lote terminado', h, t);
                            },
                            RX_MAS._token, ejecuta, descarga);
                        RX_MAS.res = res;
                        setProg(null);
                        const ok = res.filter((x) => !x.error && (x.filas > 0 || x.nativo)).length;
                        const err = res.filter((x) => x.error).length;
                        if (RX_MAS._token.cancelado) adviceWarn('Recorridos masivos', 'Lote cancelado. Lo ya descargado queda en el equipo.');
                        else if (!res.length || !ok) adviceWarn('Recorridos masivos', 'El lote termino sin archivos. Revisa la plantilla y el periodo.');
                        else adviceOk('Recorridos masivos', ok + (fmt === 'csv' ? ' CSV descargados' : ' PDF descargados') +
                            (err ? ', ' + err + ' con error' : '') + '.');
                    } catch (e) {
                        setProg(null);
                        adviceErr('Recorridos masivos', 'No se pudo completar el lote: ' + ((e && e.message) || e));
                    } finally {
                        RX_MAS._busy = false;
                        RX_MAS._token = null;
                        pinta();
                    }
                };
                // Catalogo de plantillas: la misma via que los informes por
                // plantilla (core/search_items sobre avl_resource).
                const cargarTpls = () => {
                    if (RX_MAS._busy) return;
                    RX_MAS._cargadas = false;
                    pinta();
                    rxInfPlantillas().then((lista) => {
                        RX_MAS.tpls = lista || [];
                        RX_MAS._cargadas = true;
                        // Pista: si solo hay una plantilla con cara de
                        // "recorridos" se preselecciona; el operador la puede
                        // cambiar.
                        const pista = RX_MAS.tpls.filter((p) => /RECORRIDO|VIAJE|TRIP/i.test(norm(p.nombre)));
                        if (!RX_MAS.tpl && pista.length === 1) RX_MAS.tpl = pista[0];
                        pinta();
                    }).catch(() => { RX_MAS._cargadas = true; pinta(); });
                };
                if (!box) return;
                pinta();
                if (!RX_MAS._cargadas) cargarTpls();
                box.addEventListener('click', (e) => {
                    const b = e.target && e.target.closest ? e.target.closest('button') : null;
                    if (!b || RX_MAS._busy) return;
                    if (b.id === 'rmas-tpl-cargar') { cargarTpls(); return; }
                    if (b.id === 'rmas-generar') { generar(); return; }
                    if (b.id === 'rmas-cancel') {
                        if (RX_MAS._token) RX_MAS._token.cancelado = true;
                        return;
                    }
                    if (b.id === 'rmas-unis-todas') {
                        rxMasUnidades().forEach((u) => { RX_MAS.uni[u.id] = 1; });
                        pinta();
                        return;
                    }
                    if (b.id === 'rmas-unis-ninguna') {
                        RX_MAS.uni = {};
                        pinta();
                        return;
                    }
                    if (b.dataset && b.dataset.tpl != null) {
                        RX_MAS.tpl = rxInfTplDeClave(b.dataset.tpl);
                        // El nombre legible viene del catalogo (la clave solo
                        // trae rid:id).
                        const p = (RX_MAS.tpls || []).find((x) => rxInfClave(x) === b.dataset.tpl);
                        if (p) RX_MAS.tpl = p;
                        pinta();
                        return;
                    }
                    if (b.dataset && b.dataset.fmt) {
                        RX_MAS.formato = (b.dataset.fmt === 'csv') ? 'csv' : 'pdf';
                        pinta();
                        return;
                    }
                    if (b.dataset && b.dataset.uni != null) {
                        const id = b.dataset.uni;
                        if (RX_MAS.uni[id]) delete RX_MAS.uni[id]; else RX_MAS.uni[id] = 1;
                        pinta();
                    }
                });
                box.addEventListener('change', (e) => {
                    const t = e.target;
                    if (!t || !t.id) return;
                    if (t.id === 'rmas-desde') RX_MAS.desde = String(t.value || '');
                    else if (t.id === 'rmas-hasta') RX_MAS.hasta = String(t.value || '');
                });
                // Los buscadores repintan SOLO la lista que filtran: repintar
                // el cuerpo entero perderia el foco (y una tecla) en cada
                // pulsacion.
                box.addEventListener('input', (e) => {
                    const t = e.target;
                    if (!t || !t.id) return;
                    if (t.id === 'rmas-tpl-busca') {
                        RX_MAS.buscaTpl = String(t.value || '');
                        const cont = byId('rmas-tpls');
                        if (cont) setHtml(cont, listaTplHtml());
                        else pinta();
                        const n = byId('rmas-tpl-n');
                        if (n) n.textContent = tplsFiltradas().length + '/' + (RX_MAS.tpls || []).length;
                    } else if (t.id === 'rmas-uni-busca') {
                        RX_MAS.uniBusca = String(t.value || '');
                        const cont = byId('rmas-unis');
                        if (cont) setHtml(cont, listaUniHtml());
                        else pinta();
                    }
                });
            }
        });
    }
