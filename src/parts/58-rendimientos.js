    /* ====================== RENDIMIENTOS POR UNIDAD ======================
     * Reporte de rendimiento: dada una geocerca (de la plataforma o dibujada
     * en Rondo) o un punto de partida con radio, se toma la salida de ese
     * origen y se mide, entre cada parada, la distancia en km y el tiempo en
     * movimiento. La traza se baja con messages/load_interval (el mismo
     * paginador del informe por geocerca) y las paradas se detectan con el
     * umbral de velocidad, igual que el resto de motores.
     *
     * El nucleo (rxRendCalcula) es puro: recibe puntos, un predicado
     * `dentroDe` y umbrales; se prueba en tests/rendimientos.test.js.
     */
    // Estado de la pantalla (dialog-local, como RX_INF): nada de esto se
    // persiste; son parametros de una consulta puntual.
    const RX_REND = {
        unidad: '',           // id de la unidad elegida
        modo: 'zona',         // 'zona' (geocerca) | 'punto' (lat/lon + radio)
        zona: '',             // nombre de la geocerca de partida
        lat: '', lon: '', radio: 100,
        desde: '', hasta: '', // fechas YYYY-MM-DD
        paradaMin: 5,         // minutos quieto que ya cuentan como parada
        vel: 3,               // km/h por debajo de los cuales esta "quieta"
        res: null,            // ultimo calculo {filas, kmTotal, minTotal, salidas}
        eco: '',              // eco de la unidad del ultimo calculo
        prog: { activo: false, pct: 0, txt: '' },
        _token: null, _busy: false
    };
    // Fecha de formulario ('YYYY-MM-DD') a epoch segundos; `fin` la lleva al
    // final del dia (23:59:59) para que el rango incluya todo el dia elegido.
    function rxRendFechaSeg(s, fin) {
        const m = String(s || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return 0;
        const d = new Date(+m[1], +m[2] - 1, +m[3], fin ? 23 : 0, fin ? 59 : 0, fin ? 59 : 0);
        const t = Math.floor(d.getTime() / 1000);
        return (isFinite(t) && t > 0) ? t : 0;
    }
    // Mensajes crudos de load_interval -> puntos ordenados {t, lat, lon, s}.
    // Solo se aceptan mensajes con posicion valida (flags:1 ya lo filtra en el
    // servidor, pero la defensa no cuesta nada).
    function rxRendPuntos(msgs) {
        const out = [];
        for (const m of (msgs || [])) {
            const pos = m && m.pos;
            const t = Number(m && m.t) || 0;
            if (!pos || !isFinite(+pos.y) || !isFinite(+pos.x) || t <= 0) continue;
            out.push({ t: t, lat: +pos.y, lon: +pos.x, s: (pos.s != null && isFinite(+pos.s)) ? +pos.s : null });
        }
        out.sort((a, b) => a.t - b.t);
        return out;
    }
    // Nucleo puro. `dentroDe(p)` dice si un punto esta en el origen (geocerca
    // o circulo). Cada transicion dentro->fuera re-ancla el tramo: el km y el
    // tiempo de la siguiente parada se miden desde ESA salida. Las paradas
    // cuyo centro cae dentro del origen no se listan (son la estancia en el
    // punto de partida, no una parada del recorrido). Los saltos de GPS
    // mayores a `saltoM` no suman distancia (teleportaciones del receptor).
    function rxRendCalcula(puntos, dentroDe, opts) {
        const o = opts || {};
        const paradaSeg = Math.max(30, (Number(o.paradaMin) || 5) * 60);
        const vel = (o.vel != null && isFinite(+o.vel)) ? +o.vel : 3;
        const salto = (o.saltoM != null && isFinite(+o.saltoM)) ? +o.saltoM : 5000;
        const dentro = (typeof dentroDe === 'function') ? dentroDe : function () { return false; };
        const pts = (puntos || []).filter((p) => p && isFinite(+p.t) && isFinite(+p.lat) && isFinite(+p.lon))
            .sort((a, b) => a.t - b.t);
        const filas = [];
        let salidas = 0, kmTotal = 0, minTotal = 0;
        if (pts.length < 2) return { filas: filas, kmTotal: kmTotal, minTotal: minTotal, salidas: salidas };
        let ancla = 0;                                  // indice donde arranca el tramo actual
        let qIni = -1, qUlt = -1, qLat = 0, qLon = 0, qN = 0; // grupo quieto abierto
        let estabaDentro = !!dentro(pts[0]);
        const cerrar = () => {
            if (qIni < 0) return;
            const dur = pts[qUlt].t - pts[qIni].t;
            const clat = qN ? (qLat / qN) : null, clon = qN ? (qLon / qN) : null;
            if (dur >= paradaSeg && clat != null && !dentro({ lat: clat, lon: clon })) {
                let m = 0;
                for (let i = ancla; i < qIni; i++) {
                    const d = haversine(pts[i].lat, pts[i].lon, pts[i + 1].lat, pts[i + 1].lon);
                    if (d <= salto) m += d;
                }
                const km = m / 1000;
                const minMov = Math.max(0, (pts[qIni].t - pts[ancla].t) / 60);
                filas.push({
                    n: filas.length + 1,
                    llegada: pts[qIni].t, salida: pts[qUlt].t, paradaSeg: dur,
                    km: km, minMov: minMov, lat: clat, lon: clon
                });
                kmTotal += km; minTotal += minMov;
                // El siguiente tramo arranca donde cerro esta parada.
                ancla = qUlt;
            }
            qIni = -1; qUlt = -1; qLat = 0; qLon = 0; qN = 0;
        };
        for (let i = 1; i < pts.length; i++) {
            const p = pts[i];
            const ahoraDentro = !!dentro(p);
            if (estabaDentro && !ahoraDentro) { salidas++; ancla = i; }
            estabaDentro = ahoraDentro;
            if (p.s == null || +p.s <= vel) {
                if (qIni < 0) { qIni = i; qLat = 0; qLon = 0; qN = 0; }
                qLat += p.lat; qLon += p.lon; qN++; qUlt = i;
            } else {
                cerrar();
            }
        }
        cerrar();
        return { filas: filas, kmTotal: kmTotal, minTotal: minTotal, salidas: salidas };
    }
    // Predicado de origen segun la pantalla: circulo (punto + radio) o
    // geocerca (geometria normalizada una vez, como hace rxGeoInfZonaSel).
    function rxRendDentroDe() {
        if (RX_REND.modo === 'punto') {
            const lat = +RX_REND.lat, lon = +RX_REND.lon;
            const r = clamp(+RX_REND.radio || 100, 10, 5000);
            if (!isFinite(lat) || !isFinite(lon)) return null;
            return (p) => haversine(lat, lon, p.lat, p.lon) <= r;
        }
        const z = (APP.zonas || []).find((x) => rxGeoInfNombre(x) === RX_REND.zona);
        if (!z) return null;
        let p = z.p;
        if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) { p = null; } }
        const zz = Object.assign({}, z, { p: Array.isArray(p) ? p : null });
        return (pt) => { try { return !!inZone(pt.lat, pt.lon, zz); } catch (_) { return false; } };
    }
    // Unidad elegida (objeto completo de APP.unidades) o null.
    function rxRendUnidadSel() {
        const id = String(RX_REND.unidad || '');
        if (!id) return null;
        return (APP.unidades || []).find((u) => u && String(u.id) === id) || null;
    }
    // Texto del lugar de una parada: geocerca que la contiene o municipio.
    function rxRendLugar(lat, lon) {
        if (lat == null || lon == null) return '';
        try { const z = zoneAt(lat, lon); if (z) return z; } catch (_) { /* noop */ }
        try {
            if (typeof municipioEn === 'function') {
                const m = municipioEn(lat, lon);
                if (m) return m.nombre || String(m);
            }
        } catch (_) { /* noop */ }
        return '';
    }
    function rxRendNombreArchivo(eco, d, h) {
        const e = String(eco || 'unidad').replace(/[^\w\-]+/g, '_').slice(0, 30);
        return 'rondo_rendimientos_' + e + '_' + (d || '') + '_a_' + (h || '') + '.csv';
    }
    function rxRendCSV(eco, res) {
        const cols = ['#', 'Llegada', 'Salida', 'Parada', 'km', 'Min en movimiento', 'Ubicacion', 'Lat', 'Lon'];
        const filas = (res && res.filas ? res.filas : []).map((f) => [
            f.n, rxFechaHora(f.llegada), rxFechaHora(f.salida), rxInfFmtDur(f.paradaSeg),
            rxInfFmt(f.km), rxInfFmt(f.minMov), rxRendLugar(f.lat, f.lon),
            (f.lat != null ? (+f.lat).toFixed(5) : ''), (f.lon != null ? (+f.lon).toFixed(5) : '')
        ]);
        return rxInfCSVTexto(cols, filas, [
            'Rendimientos', 'Unidad: ' + (eco || ''),
            'Periodo: ' + (RX_REND.desde || '') + ' a ' + (RX_REND.hasta || ''),
            'km totales: ' + rxInfFmt(res ? res.kmTotal : 0),
            'Minutos en movimiento: ' + rxInfFmt(res ? res.minTotal : 0)
        ]);
    }
    // ── Dialogo ─────────────────────────────────────────────────────────
    function abrirRendimientos() {
        const hoy = (typeof rxReplayFechaHoy === 'function') ? rxReplayFechaHoy() : new Date().toISOString().slice(0, 10);
        if (!RX_REND.desde) RX_REND.hasta = hoy;
        if (!RX_REND.desde) {
            const d = new Date(); d.setDate(d.getDate() - 1);
            RX_REND.desde = d.toISOString().slice(0, 10);
        }
        abrirDialogo({
            icon: UIS.route,
            titulo: 'Rendimientos por unidad',
            ancho: 720,
            okText: 'Cerrar',
            cancel: false,
            html: '<div class="rgi-tool"><div id="rrnd-box"></div></div>',
            onOpen: (el) => {
                const box = el.querySelector('#rrnd-box');
                const unidades = () => (APP.unidades || [])
                    .filter((u) => u && u.id != null)
                    .map((u) => {
                        let info = null;
                        try { info = parseUnitName(u); } catch (_) { info = null; }
                        return { id: String(u.id), eco: (info && (info.eco || info.clave)) || u.nm || String(u.id) };
                    })
                    .sort((a, b) => String(a.eco).localeCompare(String(b.eco), 'es', { numeric: true }));
                const zonas = () => (APP.zonas || []).map((z) => rxGeoInfNombre(z)).filter(Boolean)
                    .sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }));
                const cuerpo = () => {
                    const us = unidades();
                    const zs = zonas();
                    let h = '<div class="rgi-hero"><b>Rendimiento entre paradas</b><span>' +
                        'Elige la unidad y su punto de partida (geocerca o punto con radio). ' +
                        'Desde cada salida del origen se miden los km y el tiempo en movimiento hasta cada parada.</span></div>';
                    h += '<div class="rgi-paso-c"><b>1. Unidad</b><div class="rgi-row">' +
                        '<select id="rrnd-unidad" class="filtro"><option value="">Elige una unidad</option>' +
                        us.map((u) => '<option value="' + esc(u.id) + '"' + (RX_REND.unidad === u.id ? ' selected' : '') + '>' + esc(u.eco) + '</option>').join('') +
                        '</select></div></div>';
                    h += '<div class="rgi-paso-c"><b>2. Punto de partida</b>' +
                        '<div class="rgi-chips">' +
                        '<button class="rgi-chip' + (RX_REND.modo === 'zona' ? ' on' : '') + '" data-rr="modo" data-v="zona">Geocerca</button>' +
                        '<button class="rgi-chip' + (RX_REND.modo === 'punto' ? ' on' : '') + '" data-rr="modo" data-v="punto">Punto y radio</button>' +
                        '</div>';
                    if (RX_REND.modo === 'zona') {
                        h += '<div class="rgi-row"><select id="rrnd-zona" class="filtro"><option value="">Elige una geocerca</option>' +
                            zs.map((z) => '<option value="' + esc(z) + '"' + (RX_REND.zona === z ? ' selected' : '') + '>' + esc(z) + '</option>').join('') +
                            '</select></div>';
                    } else {
                        h += '<div class="rgi-row">' +
                            '<label class="rgi-lb">Latitud <input id="rrnd-lat" class="filtro" type="number" step="any" value="' + esc(RX_REND.lat) + '" placeholder="20.6597"></label>' +
                            '<label class="rgi-lb">Longitud <input id="rrnd-lon" class="filtro" type="number" step="any" value="' + esc(RX_REND.lon) + '" placeholder="-103.3496"></label>' +
                            '<label class="rgi-lb">Radio (m) <input id="rrnd-radio" class="filtro" type="number" min="10" max="5000" value="' + esc(RX_REND.radio) + '"></label>' +
                            '</div>';
                    }
                    h += '</div>';
                    h += '<div class="rgi-paso-c"><b>3. Periodo y parada</b><div class="rgi-row">' +
                        '<label class="rgi-lb">Desde <input type="date" id="rrnd-desde" class="filtro" value="' + esc(RX_REND.desde) + '"></label>' +
                        '<label class="rgi-lb">Hasta <input type="date" id="rrnd-hasta" class="filtro" value="' + esc(RX_REND.hasta) + '"></label>' +
                        '<label class="rgi-lb">Parada (min) <input id="rrnd-parada" class="filtro" type="number" min="1" max="240" value="' + esc(RX_REND.paradaMin) + '"></label>' +
                        '<label class="rgi-lb">Quieta bajo (km/h) <input id="rrnd-vel" class="filtro" type="number" min="0" max="80" value="' + esc(RX_REND.vel) + '"></label>' +
                        '</div></div>';
                    h += '<div class="rgi-generar">' +
                        '<button class="rgi-btn pri" id="rrnd-generar"' + (RX_REND._busy ? ' disabled' : '') + '>Generar</button>' +
                        '<button class="rgi-btn" id="rrnd-cancel"' + (RX_REND._busy ? '' : ' style="display:none"') + '>Cancelar</button>' +
                        '</div>';
                    h += '<div class="rgi-carga" id="rrnd-prog"' + (RX_REND.prog.activo ? ' style="display:flex"' : '') + '>' +
                        '<span id="rrnd-prog-t">' + esc(RX_REND.prog.txt || '') + '</span>' +
                        '<span class="rgi-barra"><i id="rrnd-prog-b" style="width:' + (RX_REND.prog.pct || 0) + '%"></i></span></div>';
                    h += '<div id="rrnd-dyn">' + resultados() + '</div>';
                    return h;
                };
                const resultados = () => {
                    const r = RX_REND.res;
                    if (!r) return '';
                    if (!r.filas.length) {
                        return '<div class="rgi-aviso">Sin paradas fuera del origen en el periodo. ' +
                            'Prueba con otro rango o baja el minimo de parada.</div>';
                    }
                    let h = '<div class="rgi-kpis">' +
                        '<div class="rgi-kpi"><b>' + r.filas.length + '</b><span>Paradas</span></div>' +
                        '<div class="rgi-kpi"><b>' + rxInfFmt(r.kmTotal) + '</b><span>km entre paradas</span></div>' +
                        '<div class="rgi-kpi"><b>' + rxInfFmt(r.minTotal) + '</b><span>min en movimiento</span></div>' +
                        '<div class="rgi-kpi"><b>' + r.salidas + '</b><span>Salidas del origen</span></div></div>';
                    h += '<div class="rgi-res"><table><thead><tr>' +
                        '<th>#</th><th>Llegada</th><th>Salida</th><th>Parada</th><th>km</th><th>Min mov.</th><th>Ubicacion</th>' +
                        '</tr></thead><tbody>';
                    for (const f of r.filas.slice(0, 500)) {
                        h += '<tr><td>' + f.n + '</td><td>' + esc(rxFechaHora(f.llegada)) + '</td><td>' + esc(rxFechaHora(f.salida)) + '</td>' +
                            '<td>' + esc(rxInfFmtDur(f.paradaSeg)) + '</td><td>' + esc(rxInfFmt(f.km)) + '</td>' +
                            '<td>' + esc(rxInfFmt(f.minMov)) + '</td><td>' + esc(rxRendLugar(f.lat, f.lon) || '-') + '</td></tr>';
                    }
                    h += '</tbody></table></div>' +
                        (r.filas.length > 500 ? '<div class="rgi-more">Se listan 500 paradas; el CSV lleva todas.</div>' : '') +
                        '<div class="rgi-generar"><button class="rgi-btn" id="rrnd-csv"><span class="rondo-usym">' + UIS.csv + '</span> Descargar CSV</button></div>';
                    return h;
                };
                const pinta = () => { if (box && box.isConnected !== false) setHtml(box, cuerpo()); };
                const setProg = (pct, txt) => {
                    RX_REND.prog = { activo: pct != null, pct: pct || 0, txt: txt || '' };
                    const p = byId('rrnd-prog');
                    if (!p) return;
                    p.style.display = (pct != null) ? 'flex' : 'none';
                    const t = byId('rrnd-prog-t'), b = byId('rrnd-prog-b');
                    if (t) t.textContent = txt || '';
                    if (b) b.style.width = clamp(pct || 0, 0, 100) + '%';
                };
                const generar = async () => {
                    if (RX_REND._busy) return;
                    const u = rxRendUnidadSel();
                    if (!u) { adviceWarn('Rendimientos', 'Elige una unidad.'); return; }
                    const dentroDe = rxRendDentroDe();
                    if (!dentroDe) {
                        adviceWarn('Rendimientos', RX_REND.modo === 'zona'
                            ? 'Elige una geocerca de partida.'
                            : 'Escribe latitud y longitud del punto de partida.');
                        return;
                    }
                    const desde = rxRendFechaSeg(RX_REND.desde, false);
                    const hasta = rxRendFechaSeg(RX_REND.hasta, true);
                    if (!desde || !hasta || hasta <= desde) { adviceWarn('Rendimientos', 'Revisa el periodo (desde/hasta).'); return; }
                    let info = null;
                    try { info = parseUnitName(u); } catch (_) { info = null; }
                    const eco = (info && (info.eco || info.clave)) || u.nm || String(u.id);
                    RX_REND._busy = true;
                    RX_REND._token = { cancelado: false };
                    RX_REND.res = null;
                    pinta();
                    setProg(10, 'Descargando historial de ' + eco + '…');
                    try {
                        const got = await rxGeoInfFetchMensajes(u.id, desde, hasta, RX_REND._token);
                        if (RX_REND._token.cancelado) { setProg(null); return; }
                        if (got.error) throw new Error(got.error);
                        setProg(70, 'Calculando paradas…');
                        const pts = rxRendPuntos(got.msgs);
                        const res = rxRendCalcula(pts, dentroDe, { paradaMin: RX_REND.paradaMin, vel: RX_REND.vel });
                        RX_REND.res = res;
                        RX_REND.eco = eco;
                        setProg(100, 'Listo: ' + res.filas.length + ' paradas');
                        setTimeout(() => setProg(null), 800);
                        pinta();
                        if (!pts.length) adviceWarn('Rendimientos', 'La unidad no tiene posiciones en el periodo.');
                    } catch (e) {
                        setProg(null);
                        adviceErr('Rendimientos', 'No se pudo calcular: ' + ((e && e.message) || e));
                    } finally {
                        RX_REND._busy = false;
                        RX_REND._token = null;
                        pinta();
                    }
                };
                if (!box) return;
                pinta();
                box.addEventListener('click', (e) => {
                    const b = e.target && e.target.closest ? e.target.closest('button') : null;
                    if (!b) return;
                    if (b.id === 'rrnd-generar') { generar(); return; }
                    if (b.id === 'rrnd-cancel') {
                        if (RX_REND._token) RX_REND._token.cancelado = true;
                        setProg(99, 'Cancelando…');
                        return;
                    }
                    if (b.id === 'rrnd-csv') {
                        if (RX_REND.res && RX_REND.res.filas.length) {
                            rxInfDescarga(rxRendCSV(RX_REND.eco, RX_REND.res),
                                rxRendNombreArchivo(RX_REND.eco, RX_REND.desde, RX_REND.hasta), 'text/csv;charset=utf-8;');
                            adviceOk('Rendimientos', 'CSV descargado.');
                        }
                        return;
                    }
                    if (b.dataset && b.dataset.rr === 'modo') {
                        RX_REND.modo = (b.dataset.v === 'punto') ? 'punto' : 'zona';
                        RX_REND.res = null;
                        pinta();
                    }
                });
                box.addEventListener('change', (e) => {
                    const t = e.target;
                    if (!t || !t.id) return;
                    if (t.id === 'rrnd-unidad') RX_REND.unidad = String(t.value || '');
                    else if (t.id === 'rrnd-zona') RX_REND.zona = String(t.value || '');
                    else if (t.id === 'rrnd-desde') RX_REND.desde = String(t.value || '');
                    else if (t.id === 'rrnd-hasta') RX_REND.hasta = String(t.value || '');
                    else return;
                    RX_REND.res = null;
                });
                // Los numericos no repintan: el input conserva su valor y el
                // foco; solo se acota lo que guardan.
                box.addEventListener('input', (e) => {
                    const t = e.target;
                    if (!t || !t.id) return;
                    if (t.id === 'rrnd-lat') RX_REND.lat = String(t.value || '');
                    else if (t.id === 'rrnd-lon') RX_REND.lon = String(t.value || '');
                    else if (t.id === 'rrnd-radio') RX_REND.radio = clamp(+t.value || 100, 10, 5000);
                    else if (t.id === 'rrnd-parada') RX_REND.paradaMin = clamp(+t.value || 5, 1, 240);
                    else if (t.id === 'rrnd-vel') RX_REND.vel = clamp(+t.value || 3, 0, 80);
                });
            }
        });
    }
