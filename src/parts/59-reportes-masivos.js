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
        prog: { activo: false, hechas: 0, total: 0, txt: '', pct: 0 },
        res: null,                         // [{eco, filas, error}] del ultimo lote
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
    function rxMasNombreArchivo(tpl, eco, d, h) {
        const t = String((tpl && tpl.nombre) || 'recorridos').replace(/[^\w\-]+/g, '_').slice(0, 30);
        const e = String(eco || 'unidad').replace(/[^\w\-]+/g, '_').slice(0, 30);
        return 'rondo_recorridos_' + t + '_' + e + '_' + (d || '') + '_a_' + (h || '') + '.csv';
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
    // Motor del lote. `ejecuta(unidad)` ejecuta el informe nativo de la unidad
    // (en produccion es rxInfEjecuta sobre la plantilla) y `descarga(txt,
    // nombre)` guarda el CSV. Va de una en una porque la plataforma rechaza
    // ejecuciones simultaneas (code 1003/1004). Devuelve el resumen por
    // unidad: cuantas filas trajo o con que error salio.
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
            res.push({ eco: u.eco, filas: filas.length, error: err });
            if (filas.length && typeof descarga === 'function') {
                try { descarga(u, r); } catch (_) { /* la descarga no tira el lote */ }
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
                    if (!r) return '';
                    const ok = r.filter((x) => x.filas > 0).length;
                    const err = r.filter((x) => x.error).length;
                    let h = '<div class="rgi-kpis">' +
                        '<div class="rgi-kpi"><b>' + r.length + '</b><span>Unidades</span></div>' +
                        '<div class="rgi-kpi"><b>' + ok + '</b><span>Descargadas</span></div>' +
                        (err ? '<div class="rgi-kpi"><b>' + err + '</b><span>Con error</span></div>' : '') +
                        '</div>';
                    if (err) {
                        h += '<div class="rgi-res"><table><thead><tr><th>Unidad</th><th>Detalle</th></tr></thead><tbody>';
                        for (const x of r) {
                            if (!x.error) continue;
                            h += '<tr><td>' + esc(x.eco) + '</td><td>' + esc(rxInfExplicaError(x.error)) + '</td></tr>';
                        }
                        h += '</tbody></table></div>';
                    }
                    return h;
                };
                const cuerpo = () => {
                    let h = '<div class="rgi-hero"><b>Un informe por unidad, descargado solo</b><span>' +
                        'Elige la plantilla nativa de recorridos, las unidades y el periodo. ' +
                        'Cada unidad se ejecuta con el reporte de la plataforma y su CSV se descarga automaticamente al terminar. ' +
                        'El navegador puede pedir permiso para descargas multiples.</span></div>';
                    h += '<div class="rgi-paso-c"><b>1. Plantilla de recorridos</b>' +
                        '<input id="rmas-tpl-busca" class="filtro rgi-busca" placeholder="Buscar plantilla" value="' + esc(RX_MAS.buscaTpl) + '"' + (RX_MAS._busy ? ' disabled' : '') + '>' +
                        (RX_MAS._cargadas
                            ? (tplsFiltradas().length
                                ? '<div class="rgi-chips">' + tplsFiltradas().map((p) =>
                                    '<button class="rgi-chip' + (RX_MAS.tpl && rxInfClave(RX_MAS.tpl) === rxInfClave(p) ? ' on' : '') +
                                    '" data-tpl="' + esc(rxInfClave(p)) + '"' + (RX_MAS._busy ? ' disabled' : '') + '>' + esc(p.nombre) + '</button>').join('') + '</div>'
                                : '<div class="rgi-aviso">Sin plantillas con ese nombre.</div>')
                            : '<div class="rgi-aviso">Cargando plantillas de la plataforma…</div>') +
                        '</div>';
                    h += '<div class="rgi-paso-c"><b>2. Unidades</b> <span>(' + nMarcadas() + ' marcadas)</span>' +
                        '<div class="rgi-row">' +
                        '<input id="rmas-uni-busca" class="filtro rgi-busca" placeholder="Buscar unidad" value="' + esc(RX_MAS.uniBusca) + '"' + (RX_MAS._busy ? ' disabled' : '') + '>' +
                        '<button class="rgi-btn" id="rmas-unis-todas"' + (RX_MAS._busy ? ' disabled' : '') + '>Todas</button>' +
                        '<button class="rgi-btn" id="rmas-unis-ninguna"' + (RX_MAS._busy ? ' disabled' : '') + '>Ninguna</button>' +
                        '</div>' +
                        '<div class="rgi-chips rgi-unis">' + unisFiltradas().map((u) =>
                            '<button class="rgi-chip' + (RX_MAS.uni[u.id] ? ' on' : '') + '" data-uni="' + esc(u.id) + '"' + (RX_MAS._busy ? ' disabled' : '') + '>' + esc(u.eco) + '</button>').join('') +
                        '</div></div>';
                    h += '<div class="rgi-paso-c"><b>3. Periodo</b><div class="rgi-row">' +
                        '<label class="rgi-lb">Desde <input type="date" id="rmas-desde" class="filtro" value="' + esc(RX_MAS.desde) + '"' + (RX_MAS._busy ? ' disabled' : '') + '></label>' +
                        '<label class="rgi-lb">Hasta <input type="date" id="rmas-hasta" class="filtro" value="' + esc(RX_MAS.hasta) + '"' + (RX_MAS._busy ? ' disabled' : '') + '></label>' +
                        '</div></div>';
                    h += '<div class="rgi-generar">' +
                        '<button class="rgi-btn pri" id="rmas-generar"' + (RX_MAS._busy ? ' disabled' : '') + '>Generar y descargar</button>' +
                        '<button class="rgi-btn" id="rmas-cancel"' + (RX_MAS._busy ? '' : ' style="display:none"') + '>Cancelar</button>' +
                        '</div>';
                    h += '<div class="rgi-carga" id="rmas-prog"' + (RX_MAS.prog.activo ? ' style="display:flex"' : '') + '>' +
                        '<span id="rmas-prog-t">' + esc(RX_MAS.prog.txt || '') + '</span>' +
                        '<span class="rgi-barra"><i id="rmas-prog-b" style="width:' + (RX_MAS.prog.pct || 0) + '%"></i></span></div>';
                    h += '<div id="rmas-dyn">' + resumen() + '</div>';
                    return h;
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
                    RX_MAS._busy = true;
                    RX_MAS._token = { cancelado: false };
                    RX_MAS.res = null;
                    pinta();
                    try {
                        const res = await rxMasCorre(unidades,
                            (h, t, eco) => {
                                const pct = t ? 4 + Math.round((h / t) * 94) : 4;
                                setProg(pct, eco ? ('Unidad ' + (h + 1) + ' de ' + t + ': ' + eco) : 'Lote terminado', h, t);
                            },
                            RX_MAS._token,
                            (u) => rxInfEjecuta(tpl, { id: u.id, eco: u.eco }, desde, hasta, RX_MAS._token, 0, null),
                            (u, r) => {
                                rxInfDescarga(rxMasCSV(tpl, u.eco, r.cols, r.filas),
                                    rxMasNombreArchivo(tpl, u.eco, RX_MAS.desde, RX_MAS.hasta), 'text/csv;charset=utf-8;');
                            });
                        RX_MAS.res = res;
                        setProg(null);
                        const ok = res.filter((x) => x.filas > 0).length;
                        const err = res.filter((x) => x.error).length;
                        if (RX_MAS._token.cancelado) adviceWarn('Recorridos masivos', 'Lote cancelado. Lo ya descargado queda en el equipo.');
                        else if (!res.length || !ok) adviceWarn('Recorridos masivos', 'El lote termino sin filas. Revisa la plantilla y el periodo.');
                        else adviceOk('Recorridos masivos', ok + ' reportes descargados' + (err ? ', ' + err + ' con error' : '') + '.');
                    } catch (e) {
                        setProg(null);
                        adviceErr('Recorridos masivos', 'No se pudo completar el lote: ' + ((e && e.message) || e));
                    } finally {
                        RX_MAS._busy = false;
                        RX_MAS._token = null;
                        pinta();
                    }
                };
                if (!box) return;
                pinta();
                // Catalogo de plantillas: la misma via que los informes por
                // plantilla (core/search_items sobre avl_resource).
                if (!RX_MAS._cargadas) {
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
                }
                box.addEventListener('click', (e) => {
                    const b = e.target && e.target.closest ? e.target.closest('button') : null;
                    if (!b || RX_MAS._busy) return;
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
                // Los buscadores repintan solo la lista que filtran para no
                // perder el foco del input (el memo de setHtml deja intacto el
                // resto del cuerpo).
                box.addEventListener('input', (e) => {
                    const t = e.target;
                    if (!t || !t.id) return;
                    if (t.id === 'rmas-tpl-busca') { RX_MAS.buscaTpl = String(t.value || ''); pinta(); }
                    else if (t.id === 'rmas-uni-busca') { RX_MAS.uniBusca = String(t.value || ''); pinta(); }
                });
            }
        });
    }
