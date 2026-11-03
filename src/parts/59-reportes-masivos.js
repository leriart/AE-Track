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
                    if (!r) return '<p class="rgi-more">A\u00fan no se ha generado ning\u00fan lote. Elige plantilla, unidades y periodo y pulsa "Generar y descargar".</p>';
                    const ok = r.filter((x) => x.filas > 0).length;
                    const vacias = r.filter((x) => !x.filas && !x.error).length;
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
                            ? 'Un informe nativo por unidad en el periodo elegido; cada CSV se descarga al terminar'
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
                    const paso3 = paso(3, 'Periodo',
                        '<div class="rgi-row"><span class="rgi-lb">Fechas</span><span class="rgi-rango">' +
                        '<input type="date" id="rmas-desde" class="filtro" title="Dia inicial (incluido)" value="' + esc(RX_MAS.desde) + '"' + dis + '>' +
                        '<span class="sep">\u2192</span>' +
                        '<input type="date" id="rmas-hasta" class="filtro" title="Dia final (incluido)" value="' + esc(RX_MAS.hasta) + '"' + dis + '>' +
                        '</span></div>');
                    const aviso = '<div class="rgi-aviso">Se descarga <b>un archivo por unidad</b>. ' +
                        'El navegador puede pedir permiso para descargas m\u00faltiples: conc\u00e9delo para no perder ninguno.</div>';
                    const ejecutar = RX_MAS._busy
                        ? '<button type="button" class="rgi-btn gen busy" id="rmas-cancel">' +
                          '<span class="rondo-usym">' + UIS.close + '</span><b>Cancelar</b><i>lo descargado se conserva</i></button>'
                        : '<button type="button" class="rgi-btn gen pulsa" id="rmas-generar">' +
                          '<span class="rondo-usym">' + UIS.play + '</span><b>Generar y descargar</b><i>' +
                          (nMarcadas() ? (nMarcadas() + ' unidad(es)') : 'marca unidades') + '</i></button>';
                    const barra = '<div class="rgi-generar">' + ejecutar +
                        '<span class="rgi-gen-hint">' + esc(RX_MAS._busy
                            ? 'La plataforma calcula un informe a la vez; no cierres el di\u00e1logo.'
                            : 'Se ejecuta la plantilla unidad por unidad y cada resultado se descarga.') + '</span></div>';
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
