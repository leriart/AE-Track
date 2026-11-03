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
        uniBusca: '',         // filtro del buscador de unidades
        zonaBusca: '',        // filtro del buscador de geocercas
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
                    const d = rxDistM(pts[i].lat, pts[i].lon, pts[i + 1].lat, pts[i + 1].lon);
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
            // Comparacion al cuadrado: se llama por cada punto del historial.
            return (p) => rxDist2M(lat, lon, p.lat, p.lon) <= r * r;
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
                // Listas fijas mientras el dialogo esta abierto: buscar y
                // repintar sugerencias no vuelve a recorrer la flota.
                const US = unidades();
                const ZS = zonas();
                // Buscador con sugerencias, igual que "Informes de la
                // plataforma": se escribe y la lista de chips se filtra; la
                // eleccion queda marcada (una sola, este informe es por
                // unidad).
                const filtra = (lista, texto, clave) => {
                    const q = norm(texto || '');
                    return lista.filter((x) => !q || norm(clave(x)).indexOf(q) >= 0);
                };
                const unisFiltradas = () => filtra(US, RX_REND.uniBusca, (u) => u.eco).slice(0, 120);
                const zonasFiltradas = () => filtra(ZS, RX_REND.zonaBusca, (z) => z).slice(0, 120);
                const uniEco = () => {
                    const u = US.filter((x) => x.id === RX_REND.unidad)[0];
                    return u ? u.eco : '';
                };
                const listaUniHtml = () => {
                    const l = unisFiltradas();
                    const dis = RX_REND._busy ? ' disabled' : '';
                    if (!l.length) return '<p class="rgi-more">Sin unidades con ese nombre.</p>';
                    return l.map((u) => '<button type="button" class="rgi-chip' + (RX_REND.unidad === u.id ? ' activo' : '') +
                        '" data-uni="' + esc(u.id) + '"' + dis + '>' + esc(u.eco) + '</button>').join('');
                };
                const listaZonaHtml = () => {
                    const l = zonasFiltradas();
                    const dis = RX_REND._busy ? ' disabled' : '';
                    if (!l.length) return '<p class="rgi-more">Sin geocercas con ese nombre.</p>';
                    return l.map((z) => '<button type="button" class="rgi-chip' + (RX_REND.zona === z ? ' activo' : '') +
                        '" data-zona="' + esc(z) + '"' + dis + '>' + esc(z) + '</button>').join('');
                };
                // Paso numerado, igual que el resto de dialogos de Rondo.
                const paso = (n, tit, cont) => '<div class="rgi-cfg"><div class="rgi-paso-c"><i>' + n + '</i><b>' +
                    esc(tit) + '</b></div>' + cont + '</div>';
                const cuerpo = () => {
                    const dis = RX_REND._busy ? ' disabled' : '';
                    const hero = '<div class="rgi-hero"><span class="rgi-heroico rondo-usym">' + UIS.route + '</span>' +
                        '<div class="rgi-herot"><b>Rendimiento entre paradas</b><span>Km y tiempo en movimiento entre cada parada, contados desde cada salida del punto de partida</span></div>' +
                        '<i class="rgi-ori">Historial</i></div>';
                    const paso1 = paso(1, 'Unidad',
                        '<div class="rgi-row"><span class="rgi-lb">Buscar</span>' +
                        '<span class="rgi-busca"><span class="rondo-usym">' + UIS.filter + '</span>' +
                        '<input type="text" id="rrnd-uni-busca" class="filtro" placeholder="Buscar unidad\u2026" value="' + esc(RX_REND.uniBusca || '') + '"' + dis + '>' +
                        '<i id="rrnd-uni-n">' + unisFiltradas().length + '/' + US.length + '</i></span></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><div class="rgi-chips rgi-unis" id="rrnd-unis">' +
                        listaUniHtml() + '</div></div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        esc(uniEco()
                            ? ('Seleccionada: ' + uniEco() + '. Se baja su historial en el periodo y se detectan sus paradas.')
                            : 'Escribe para filtrar y pulsa la unidad.') + '</span></div>');
                    const paso2 = paso(2, 'Punto de partida',
                        '<div class="rgi-row"><span class="rgi-lb">Origen</span><div class="rgi-chips">' +
                        '<button type="button" class="rgi-chip' + (RX_REND.modo === 'zona' ? ' activo' : '') + '" data-rr="modo" data-v="zona"' + dis + '>Geocerca</button>' +
                        '<button type="button" class="rgi-chip' + (RX_REND.modo === 'punto' ? ' activo' : '') + '" data-rr="modo" data-v="punto"' + dis + '>Punto y radio</button>' +
                        '</div></div>' +
                        (RX_REND.modo === 'zona'
                            ? '<div class="rgi-row"><span class="rgi-lb">Buscar</span>' +
                              '<span class="rgi-busca"><span class="rondo-usym">' + UIS.zone + '</span>' +
                              '<input type="text" id="rrnd-zona-busca" class="filtro" placeholder="Buscar geocerca\u2026" value="' + esc(RX_REND.zonaBusca || '') + '"' + dis + '>' +
                              '<i id="rrnd-zona-n">' + zonasFiltradas().length + '/' + ZS.length + '</i></span></div>' +
                              '<div class="rgi-row"><span class="rgi-lb"></span><div class="rgi-chips rgi-zonas" id="rrnd-zonas">' +
                              listaZonaHtml() + '</div></div>'
                            : '<div class="rgi-row"><span class="rgi-lb">Coordenadas</span>' +
                              '<span class="rgi-num">lat <input type="number" step="any" id="rrnd-lat" value="' + esc(RX_REND.lat) + '" placeholder="20.6597"' + dis + '></span>' +
                              '<span class="rgi-num">lon <input type="number" step="any" id="rrnd-lon" value="' + esc(RX_REND.lon) + '" placeholder="-103.3496"' + dis + '></span>' +
                              '<span class="rgi-num">radio <input type="number" min="10" max="5000" id="rrnd-radio" value="' + esc(String(RX_REND.radio)) + '"' + dis + '> m</span>' +
                              '</div>') +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        esc(RX_REND.modo === 'zona'
                            ? (RX_REND.zona
                                ? ('Partida: ' + RX_REND.zona + '. Cada salida inicia un tramo nuevo.')
                                : 'Escribe para filtrar y pulsa la geocerca de partida.')
                            : 'El circulo del radio indicado es el punto de partida.') +
                        '</span></div>');
                    const paso3 = paso(3, 'Periodo y parada',
                        '<div class="rgi-row"><span class="rgi-lb">Fechas</span><span class="rgi-rango">' +
                        '<input type="date" id="rrnd-desde" class="filtro" title="Dia inicial (incluido)" value="' + esc(RX_REND.desde) + '"' + dis + '>' +
                        '<span class="sep">\u2192</span>' +
                        '<input type="date" id="rrnd-hasta" class="filtro" title="Dia final (incluido)" value="' + esc(RX_REND.hasta) + '"' + dis + '>' +
                        '</span></div>' +
                        '<div class="rgi-row"><span class="rgi-lb">Parada</span>' +
                        '<span class="rgi-num"><input type="number" min="1" max="240" id="rrnd-parada" value="' + esc(String(RX_REND.paradaMin)) + '"' + dis + '> min o mas</span>' +
                        '<span class="rgi-num">quieta bajo <input type="number" min="0" max="80" id="rrnd-vel" value="' + esc(String(RX_REND.vel)) + '"' + dis + '> km/h</span>' +
                        '</div>' +
                        '<div class="rgi-row"><span class="rgi-lb"></span><span class="rgi-gen-hint">' +
                        'Una parada empieza cuando la unidad lleva esos minutos bajo esa velocidad.</span></div>');
                    const ejecutar = RX_REND._busy
                        ? '<button type="button" class="rgi-btn gen busy" id="rrnd-cancel">' +
                          '<span class="rondo-usym">' + UIS.close + '</span><b>Cancelar</b><i>descarta lo calculado</i></button>'
                        : '<button type="button" class="rgi-btn gen pulsa" id="rrnd-generar">' +
                          '<span class="rondo-usym">' + UIS.play + '</span><b>Generar</b><i>km y tiempo entre paradas</i></button>';
                    const barra = '<div class="rgi-generar">' + ejecutar +
                        '<span class="rgi-gen-hint">' + esc(RX_REND._busy
                            ? 'Leyendo el historial de la unidad\u2026'
                            : 'Un clic y el reporte queda listo para descargar.') + '</span></div>';
                    const prog = '<div class="rgi-carga" id="rrnd-prog"' + (RX_REND.prog.activo ? ' style="display:flex"' : '') + '>' +
                        '<span id="rrnd-prog-t">' + esc(RX_REND.prog.txt || '') + '</span>' +
                        '<span class="rgi-barra"><i id="rrnd-prog-b" style="width:' + Math.max(2, RX_REND.prog.pct || 0) + '%"></i></span></div>';
                    return '<div class="rgi">' + hero + paso1 + paso2 + paso3 + prog + barra +
                        '<div id="rrnd-dyn">' + resultados() + '</div></div>';
                };
                const resultados = () => {
                    const r = RX_REND.res;
                    if (!r) return '<p class="rgi-more">Sin resultados todav\u00eda. Elige unidad, origen y periodo, y pulsa "Generar".</p>';
                    if (!r.filas.length) {
                        return '<div class="rgi-aviso">Sin paradas fuera del origen en el periodo. ' +
                            'Prueba con otro rango o baja el m\u00ednimo de parada.</div>';
                    }
                    let h = '<div class="rgi-kpis">' +
                        '<div class="rgi-kpi ok"><b>' + r.filas.length + '</b><span>Paradas</span></div>' +
                        '<div class="rgi-kpi"><b>' + rxInfFmt(r.kmTotal) + '</b><span>km entre paradas</span></div>' +
                        '<div class="rgi-kpi"><b>' + rxInfFmt(r.minTotal) + '</b><span>min en movimiento</span></div>' +
                        '<div class="rgi-kpi"><b>' + r.salidas + '</b><span>Salidas del origen</span></div></div>';
                    h += '<div class="rgi-prev"><table><thead><tr>' +
                        '<th>#</th><th>Llegada</th><th>Salida</th><th>Parada</th><th>km</th><th>Min mov.</th><th>Ubicaci\u00f3n</th>' +
                        '</tr></thead><tbody>';
                    for (const f of r.filas.slice(0, 500)) {
                        h += '<tr><td>' + f.n + '</td><td>' + esc(rxFechaHora(f.llegada)) + '</td><td>' + esc(rxFechaHora(f.salida)) + '</td>' +
                            '<td>' + esc(rxInfFmtDur(f.paradaSeg)) + '</td><td class="num">' + esc(rxInfFmt(f.km)) + '</td>' +
                            '<td class="num">' + esc(rxInfFmt(f.minMov)) + '</td><td>' + esc(rxRendLugar(f.lat, f.lon) || '-') + '</td></tr>';
                    }
                    h += '</tbody></table>' +
                        (r.filas.length > 500 ? '<p class="rgi-more">Primeras 500 paradas de ' + r.filas.length + '. El CSV lleva todas.</p>' : '') + '</div>';
                    h += '<div class="rgi-io"><button type="button" class="rgi-btn primary" id="rrnd-csv">' +
                        '<span class="rondo-usym">' + UIS.csv + '</span><b>CSV</b><i>una fila por parada</i></button></div>';
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
                    // Sugerencias: elegir unidad o geocerca marca el chip.
                    if (b.dataset && b.dataset.uni != null) {
                        if (RX_REND._busy) return;
                        RX_REND.unidad = String(b.dataset.uni);
                        RX_REND.res = null;
                        pinta();
                        return;
                    }
                    if (b.dataset && b.dataset.zona != null) {
                        if (RX_REND._busy) return;
                        RX_REND.zona = String(b.dataset.zona);
                        RX_REND.res = null;
                        pinta();
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
                    if (t.id === 'rrnd-desde') RX_REND.desde = String(t.value || '');
                    else if (t.id === 'rrnd-hasta') RX_REND.hasta = String(t.value || '');
                    else return;
                    RX_REND.res = null;
                });
                // Buscadores: repintan SOLO su lista de sugerencias para no
                // perder el foco ni una pulsacion. Los numericos no repintan:
                // el input conserva su valor y el foco; solo se acota.
                box.addEventListener('input', (e) => {
                    const t = e.target;
                    if (!t || !t.id) return;
                    if (t.id === 'rrnd-uni-busca') {
                        RX_REND.uniBusca = String(t.value || '');
                        const cont = byId('rrnd-unis');
                        if (cont) setHtml(cont, listaUniHtml()); else pinta();
                        const n = byId('rrnd-uni-n');
                        if (n) n.textContent = unisFiltradas().length + '/' + US.length;
                    } else if (t.id === 'rrnd-zona-busca') {
                        RX_REND.zonaBusca = String(t.value || '');
                        const cont = byId('rrnd-zonas');
                        if (cont) setHtml(cont, listaZonaHtml()); else pinta();
                        const n = byId('rrnd-zona-n');
                        if (n) n.textContent = zonasFiltradas().length + '/' + ZS.length;
                    } else if (t.id === 'rrnd-lat') RX_REND.lat = String(t.value || '');
                    else if (t.id === 'rrnd-lon') RX_REND.lon = String(t.value || '');
                    else if (t.id === 'rrnd-radio') RX_REND.radio = clamp(+t.value || 100, 10, 5000);
                    else if (t.id === 'rrnd-parada') RX_REND.paradaMin = clamp(+t.value || 5, 1, 240);
                    else if (t.id === 'rrnd-vel') RX_REND.vel = clamp(+t.value || 3, 0, 80);
                });
            }
        });
    }
