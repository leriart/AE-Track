    /* ====================== REPLAY DEL DIA (v6.0.12) ======================
     * Reproduce el recorrido de una unidad en un dia. Solo lectura: pide el
     * historial con messages/load_interval y lo dibuja en el mini-mapa propio
     * de Rondo (tiles de OSM), sin depender del mapa de la plataforma.
     *
     * Analiza y muestra: resumen del dia, paradas (con zona/municipio),
     * entradas/salidas de geocerca, excesos de velocidad y desvios respecto a
     * una ruta planificada. Permite exportar el recorrido (GeoJSON) y las
     * paradas (CSV).
     */
    let RX_REPLAY = null;

    function rxReplayHHMM(t) {
        try { return new Date((Number(t) || 0) * 1000).toLocaleTimeString().slice(0, 5); } catch (_) { return '--:--'; }
    }
    function rxReplayFechaHoy() {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + mm + '-' + dd;
    }
    function rxReplayRango(fecha) {
        const d = new Date(String(fecha || rxReplayFechaHoy()) + 'T00:00:00');
        const desde = Math.floor(d.getTime() / 1000);
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const esHoy = d.getTime() === hoy.getTime();
        const hasta = esHoy ? Math.floor(Date.now() / 1000) : desde + 86399;
        return { desde: desde, hasta: hasta, esHoy: esHoy };
    }
    function rxReplayColor(tipo) {
        return { parada: '#7d8595', exceso: '#b71c1c', zona: '#1565c0', desvio: '#e65100' }[tipo] || '#888';
    }
    function rxReplayDescargar(nombre, texto, mime) {
        try {
            const a = makeEl('a', { href: URL.createObjectURL(new Blob([texto], { type: mime || 'text/plain;charset=utf-8;' })) });
            a.download = nombre;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (_) { /* noop */ } }, 1500);
        } catch (_) { adviceWarn('No se pudo exportar', nombre); }
    }
    function rxReplayPoblarSelect() {
        const sel = byId('rondo-replay-eco');
        if (!sel) return;
        const prev = sel.value || APP.replayEco || '';
        const vistos = new Set();
        const opciones = [];
        const push = (u) => {
            let info; try { info = parseUnitName(u); } catch (_) { return; }
            const eco = info.eco || info.clave;
            if (!eco || vistos.has(eco)) return;
            vistos.add(eco);
            opciones.push('<option value="' + esc(eco) + '">' + esc(eco + (info.placa ? ' \u00b7 ' + info.placa : '')) + '</option>');
        };
        (APP.unidades || []).forEach((u) => { try { if (shouldWatch(u)) push(u); } catch (_) { /* noop */ } });
        (APP.unidades || []).forEach(push);
        sel.innerHTML = opciones.join('') || '<option value="">(sin unidades)</option>';
        if (prev && Array.prototype.some.call(sel.options, (o) => o.value === prev)) sel.value = prev;
    }
    function rxReplayDetalleParada(lat, lon, zonas) {
        let zona = '', municipio = '';
        try { if (zonas && lat != null) zona = zoneAt(lat, lon) || ''; } catch (_) { /* noop */ }
        try { const m = municipioEn(lat, lon); municipio = (m && m.nombre) ? m.nombre : ''; } catch (_) { /* noop */ }
        return { zona: zona, municipio: municipio };
    }
    // Analiza un recorrido: paradas, eventos (zona/exceso/desvio) y resumen.
    function rxReplayAnalizar(msgs, info) {
        const eventos = [], paradas = [];
        const paradaMinS = Math.max(60, (Number(APP.config.paradaMin) || 15) * 60);
        const limite = info ? limiteDe(info) : APP.config.velMax;
        const zonas = !!(APP.config.loadZones && (APP.zonas || []).length);
        let enParadaDesde = null, paradaLat = null, paradaLon = null, paradaIdx = 0;
        let zonaPrev = null;
        let excesoDesde = null, excesoMax = 0, excesoLat = null, excesoLon = null, excesos = 0;
        let detenido = 0, moviendo = 0, velMax = 0;
        const cerrarParada = (tFin, idxFin) => {
            const dur = tFin - enParadaDesde;
            if (dur >= paradaMinS) {
                const det = rxReplayDetalleParada(paradaLat, paradaLon, zonas);
                paradas.push({ t: enParadaDesde, dur: dur, idx: paradaIdx, idxFin: idxFin, lat: paradaLat, lon: paradaLon, zona: det.zona, municipio: det.municipio });
            }
            enParadaDesde = null;
        };
        const cerrarExceso = (idx) => {
            if (excesoDesde == null) return;
            excesos++;
            eventos.push({ t: excesoDesde, tipo: 'exceso', idx: idx, lat: excesoLat, lon: excesoLon, txt: 'Exceso ' + Math.round(excesoMax) + ' km/h (limite ' + Math.round(limite) + ')' });
            excesoDesde = null;
        };
        for (let i = 0; i < msgs.length; i++) {
            const m = msgs[i];
            const dt = (i > 0) ? Math.max(0, m.t - (msgs[i - 1].t || m.t)) : 0;
            if (m.s > 3) { moviendo += dt; if (m.s > velMax) velMax = m.s; } else { detenido += dt; }
            if (m.s > 3) { if (enParadaDesde != null) cerrarParada(m.t, i); }
            else if (enParadaDesde == null) { enParadaDesde = m.t; paradaLat = m.lat; paradaLon = m.lon; paradaIdx = i; }
            if (limite && m.s > limite) {
                if (excesoDesde == null) { excesoDesde = m.t; excesoMax = m.s; excesoLat = m.lat; excesoLon = m.lon; }
                else if (m.s > excesoMax) excesoMax = m.s;
            } else if (excesoDesde != null) cerrarExceso(i);
            if (zonas && m.lat != null) {
                const z = zoneAt(m.lat, m.lon) || null;
                if (z !== zonaPrev) {
                    if (z) eventos.push({ t: m.t, tipo: 'zona', idx: i, lat: m.lat, lon: m.lon, txt: 'Entra a ' + z });
                    else if (zonaPrev) eventos.push({ t: m.t, tipo: 'zona', idx: i, lat: m.lat, lon: m.lon, txt: 'Sale de ' + zonaPrev });
                    zonaPrev = z;
                }
            }
        }
        const ult = msgs[msgs.length - 1];
        if (enParadaDesde != null && ult) cerrarParada(ult.t, msgs.length - 1);
        cerrarExceso(msgs.length - 1);
        // Desvio respecto a la ruta planificada (muestreado, ruta acotada).
        try {
            const ruta = info ? rutaDe(info) : null;
            if (ruta && ruta.coords && ruta.coords.length >= 2 && ruta.coords.length <= 4000) {
                const umbral = Number(APP.config.desvioM) || 250;
                const minSost = Math.max(60, (Number(APP.config.desvioMin) || 5) * 60);
                const paso = Math.max(1, Math.floor(msgs.length / 400));
                let memo = null, desde = null, max = 0, dLat = null, dLon = null;
                for (let i = 0; i < msgs.length; i += paso) {
                    const m = msgs[i];
                    let s = null;
                    try { s = snapRuta(m.lat, m.lon, ruta, memo); } catch (_) { s = null; }
                    memo = s;
                    if (s && s.dist > umbral) {
                        if (desde == null) { desde = m.t; max = s.dist; dLat = m.lat; dLon = m.lon; }
                        else if (s.dist > max) max = s.dist;
                    } else if (desde != null) {
                        if (m.t - desde >= minSost) eventos.push({ t: desde, tipo: 'desvio', idx: i, lat: dLat, lon: dLon, txt: 'Desvio ' + Math.round(max) + ' m del trazado' });
                        desde = null;
                    }
                }
                if (desde != null && ult && ult.t - desde >= minSost) {
                    eventos.push({ t: desde, tipo: 'desvio', idx: msgs.length - 1, lat: dLat, lon: dLon, txt: 'Desvio ' + Math.round(max) + ' m del trazado' });
                }
            }
        } catch (_) { /* sin desvios */ }
        eventos.sort((a, b) => a.t - b.t);
        const resumen = {
            distM: Math.round((ult && ult.km) || 0),
            durSeg: (ult && msgs[0]) ? Math.max(0, ult.t - msgs[0].t) : 0,
            inicio: msgs[0] ? msgs[0].t : 0,
            fin: ult ? ult.t : 0,
            detenidoSeg: Math.round(detenido),
            moviendoSeg: Math.round(moviendo),
            paradas: paradas.length,
            velMax: Math.round(velMax),
            excesos: excesos
        };
        return { eventos: eventos, paradas: paradas, resumen: resumen };
    }
    function rxReplayResumenHTML() {
        const r = RX_REPLAY;
        if (!r || !r.resumen) return '';
        const s = r.resumen;
        return '<span class="rr-chip"><b>' + esc(r.eco) + '</b></span>' +
            '<span class="rr-chip">' + rxFmtDist(s.distM) + '</span>' +
            '<span class="rr-chip">' + rxFmtDur(s.durSeg) + '</span>' +
            '<span class="rr-chip">' + s.paradas + ' parada(s)</span>' +
            '<span class="rr-chip">detenido ' + rxFmtDur(s.detenidoSeg) + '</span>' +
            '<span class="rr-chip">max ' + s.velMax + ' km/h</span>' +
            (s.excesos ? '<span class="rr-chip">' + s.excesos + ' exceso(s)</span>' : '');
    }
    function rxReplayParadasHTML() {
        const r = RX_REPLAY;
        if (!r) return '';
        if (!r.paradas.length) return '<div class="rondo-replay-hint">Sin paradas de mas de ' + (APP.config.paradaMin || 15) + ' min.</div>';
        return r.paradas.map((p, i) =>
            '<div class="rondo-replay-par" data-idx="' + p.idx + '" data-idxfin="' + (p.idxFin == null ? p.idx : p.idxFin) + '">' +
            '<span class="par-idx">' + (i + 1) + '</span>' +
            '<span class="par-hora">' + rxReplayHHMM(p.t) + '</span>' +
            '<span class="par-dur">' + rxFmtDur(p.dur) + '</span>' +
            '<span class="par-lugar" title="' + esc(p.zona || p.municipio || (p.lat.toFixed(4) + ',' + p.lon.toFixed(4))) + '">' +
            esc(p.zona || p.municipio || (p.lat.toFixed(4) + ',' + p.lon.toFixed(4))) + '</span>' +
            '</div>'
        ).join('');
    }
    function rxReplayEventosHTML() {
        const r = RX_REPLAY;
        if (!r) return '';
        if (!r.eventos.length) return '<div class="rondo-replay-hint">Sin eventos (geocercas, excesos o desvios).</div>';
        return r.eventos.map((m) =>
            '<div class="rondo-replay-ev" data-idx="' + m.idx + '">' +
            '<span class="ev-hora">' + rxReplayHHMM(m.t) + '</span>' +
            '<span class="ev-tipo ev-' + m.tipo + '">' + esc(m.tipo) + '</span>' +
            '<span class="ev-txt" title="' + esc(m.txt) + '">' + esc(m.txt) + '</span>' +
            '</div>'
        ).join('');
    }
    // Crea (o recrea) el mini-mapa del replay con el recorrido completo.
    function rxReplayMapaCrear() {
        const r = RX_REPLAY;
        const cont = byId('rondo-replay-mapa');
        if (!cont || !r) return;
        if (r.mapa) { try { r.mapa.destruir(); } catch (_) { /* noop */ } r.mapa = null; }
        cont.innerHTML = '';
        const full = r.msgs.map((m) => ({ lat: m.lat, lon: m.lon }));
        const marcas = [];
        r.paradas.forEach((p, i) => marcas.push({ lat: p.lat, lon: p.lon, color: rxReplayColor('parada'), radio: 5, txt: 'Parada ' + (i + 1) + ' \u00b7 ' + rxReplayHHMM(p.t) + ' \u00b7 ' + rxFmtDur(p.dur) + (p.zona ? ' \u00b7 ' + p.zona : '') }));
        r.eventos.forEach((m) => marcas.push({ lat: m.lat, lon: m.lon, color: rxReplayColor(m.tipo), radio: 5, txt: rxReplayHHMM(m.t) + ' \u00b7 ' + m.txt }));
        r.mapa = rxMiniMapa(cont, {
            lineas: [
                { pts: full, color: '#850D22', width: 4, opacity: 0.35, glow: true },
                { pts: [], dyn: true }
            ],
            marcas: marcas,
            pos: { lat: r.msgs[r.idx].lat, lon: r.msgs[r.idx].lon }
        });
        rxReplayMarcarViajado();
    }
    function rxReplayMarcarViajado() {
        const r = RX_REPLAY;
        if (!r || !r.mapa) return;
        const n = r.idx + 1;
        const paso = Math.max(1, Math.ceil(n / 400));
        const pts = [];
        for (let i = 0; i < n; i += paso) pts.push({ lat: r.msgs[i].lat, lon: r.msgs[i].lon });
        pts.push({ lat: r.msgs[r.idx].lat, lon: r.msgs[r.idx].lon });
        r.mapa.setLinea(1, pts, '#1565c0', 4, 0.95);
    }
    function rxReplayActualizar() {
        const r = RX_REPLAY;
        if (!r) return;
        const m = r.msgs[r.idx] || r.msgs[0];
        const info = byId('rondo-replay-info');
        if (info) {
            const zonas = !!(APP.config.loadZones && (APP.zonas || []).length);
            const zona = (zonas && m.lat != null) ? (zoneAt(m.lat, m.lon) || '') : '';
            const mun = (m.lat != null) ? municipioEn(m.lat, m.lon) : null;
            info.innerHTML =
                '<span class="rr-chip"><b>' + rxReplayHHMM(m.t) + '</b></span>' +
                '<span class="rr-chip">' + Math.round(m.s) + ' km/h</span>' +
                '<span class="rr-chip">' + ((m.km || 0) / 1000).toFixed(1) + ' km</span>' +
                (zona ? '<span class="rr-chip">' + esc(zona) + '</span>' : '') +
                (mun && mun.nombre ? '<span class="rr-chip">' + esc(mun.nombre) + '</span>' : '');
        }
        const sl = byId('rondo-replay-slider');
        if (sl) sl.value = r.idx;
        const pb = byId('rondo-replay-play');
        if (pb) pb.textContent = r.playing ? 'Pausa' : 'Play';
        if (r.mapa) {
            r.mapa.setPos(m.lat, m.lon);
            rxReplayMarcarViajado();
        }
        const evs = byId('rondo-replay-eventos');
        if (evs) evs.querySelectorAll('.rondo-replay-ev').forEach((n) => n.classList.toggle('activo', +n.dataset.idx === r.idx));
        const pars = byId('rondo-replay-paradas');
        if (pars) pars.querySelectorAll('.rondo-replay-par').forEach((n) => {
            const a = +n.dataset.idx, b = +n.dataset.idxfin;
            n.classList.toggle('activo', r.idx >= a && r.idx <= b);
        });
    }
    function rxReplayPintar() {
        const r = RX_REPLAY;
        const resumen = byId('rondo-replay-resumen');
        if (resumen) resumen.innerHTML = rxReplayResumenHTML();
        const pars = byId('rondo-replay-paradas');
        if (pars) pars.innerHTML = rxReplayParadasHTML();
        const evs = byId('rondo-replay-eventos');
        if (evs) evs.innerHTML = rxReplayEventosHTML();
        if (r) rxReplayMapaCrear();
        else {
            const cont = byId('rondo-replay-mapa');
            if (cont) cont.innerHTML = '<div class="rondo-replay-vacio">Carga un recorrido para verlo aqui.</div>';
        }
        const sl = byId('rondo-replay-slider');
        if (sl && r) { sl.min = 0; sl.max = Math.max(0, r.msgs.length - 1); sl.value = r.idx; }
        if (r) rxReplayActualizar();
    }
    function rxReplayTick() {
        const r = RX_REPLAY;
        if (!r || !r.playing) return;
        const ahora = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const dt = Math.max(0, (ahora - (r._tick || ahora)) / 1000);
        r._tick = ahora;
        const fin = r.msgs[r.msgs.length - 1].t;
        r.vt = Math.min(fin, r.vt + dt * r.factor);
        let lo = 0, hi = r.msgs.length - 1, idx = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (r.msgs[mid].t <= r.vt) { idx = mid; lo = mid + 1; } else hi = mid - 1;
        }
        r.idx = idx;
        rxReplayActualizar();
        if (r.vt >= fin) rxReplayPausar();
    }
    function rxReplayReproducir() {
        const r = RX_REPLAY;
        if (!r) return;
        if (r.idx >= r.msgs.length - 1) { r.idx = 0; r.vt = r.msgs[0].t; rxReplayActualizar(); }
        r.playing = true;
        r._tick = 0;
        if (r._timer) clearInterval(r._timer);
        r._timer = setInterval(rxReplayTick, 120);
        rxReplayActualizar();
    }
    function rxReplayPausar() {
        const r = RX_REPLAY;
        if (!r) return;
        r.playing = false;
        if (r._timer) { clearInterval(r._timer); r._timer = null; }
        rxReplayActualizar();
    }
    function rxReplayAlternar() {
        const r = RX_REPLAY;
        if (!r) return;
        if (r.playing) rxReplayPausar(); else rxReplayReproducir();
    }
    function rxReplayIrA(idx) {
        const r = RX_REPLAY;
        if (!r) return;
        r.idx = clamp(+idx || 0, 0, r.msgs.length - 1);
        r.vt = r.msgs[r.idx].t;
        rxReplayActualizar();
    }
    function rxReplayExportarGeoJSON() {
        const r = RX_REPLAY;
        if (!r) { adviceWarn('Sin recorrido', 'Carga un recorrido primero.'); return; }
        const features = [{
            type: 'Feature',
            properties: { eco: r.eco, fecha: r.fecha, km: Math.round(r.resumen.distM / 1000), inicio: new Date(r.resumen.inicio * 1000).toISOString(), fin: new Date(r.resumen.fin * 1000).toISOString() },
            geometry: { type: 'LineString', coordinates: r.msgs.map((m) => [+m.lon.toFixed(6), +m.lat.toFixed(6)]) }
        }];
        r.paradas.forEach((p, i) => features.push({
            type: 'Feature',
            properties: { tipo: 'parada', n: i + 1, hora: rxReplayHHMM(p.t), durMin: Math.round(p.dur / 60), zona: p.zona || '', municipio: p.municipio || '' },
            geometry: { type: 'Point', coordinates: [+p.lon.toFixed(6), +p.lat.toFixed(6)] }
        }));
        r.eventos.forEach((e2) => features.push({
            type: 'Feature',
            properties: { tipo: e2.tipo, hora: rxReplayHHMM(e2.t), texto: e2.txt },
            geometry: { type: 'Point', coordinates: [+e2.lon.toFixed(6), +e2.lat.toFixed(6)] }
        }));
        rxReplayDescargar('rondo-replay-' + r.eco + '-' + r.fecha + '.geojson',
            JSON.stringify({ type: 'FeatureCollection', features: features }, null, 2),
            'application/geo+json;charset=utf-8;');
    }
    function rxReplayExportarParadasCSV() {
        const r = RX_REPLAY;
        if (!r) { adviceWarn('Sin recorrido', 'Carga un recorrido primero.'); return; }
        const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        const filas = [['n', 'hora', 'duracion_min', 'lat', 'lon', 'zona', 'municipio']];
        r.paradas.forEach((p, i) => filas.push([i + 1, rxReplayHHMM(p.t), Math.round(p.dur / 60), p.lat.toFixed(5), p.lon.toFixed(5), p.zona || '', p.municipio || '']));
        rxReplayDescargar('rondo-paradas-' + r.eco + '-' + r.fecha + '.csv',
            '\uFEFF' + filas.map((f) => f.map(q).join(',')).join('\r\n'),
            'text/csv;charset=utf-8;');
    }
    function rxReplayLimpiar() {
        const r = RX_REPLAY;
        if (r && r._timer) clearInterval(r._timer);
        if (r && r.mapa) { try { r.mapa.destruir(); } catch (_) { /* noop */ } }
        RX_REPLAY = null;
        const cont = byId('rondo-replay-mapa');
        if (cont) cont.innerHTML = '<div class="rondo-replay-vacio">Carga un recorrido para verlo aqui.</div>';
        const info = byId('rondo-replay-info');
        if (info) info.innerHTML = '';
        const resumen = byId('rondo-replay-resumen');
        if (resumen) resumen.innerHTML = '';
        const pars = byId('rondo-replay-paradas');
        if (pars) pars.innerHTML = '';
        const evs = byId('rondo-replay-eventos');
        if (evs) evs.innerHTML = '';
        const sl = byId('rondo-replay-slider');
        if (sl) { sl.max = 0; sl.value = 0; }
        const pb = byId('rondo-replay-play');
        if (pb) pb.textContent = 'Play';
    }
    async function rxReplayCargar() {
        const sel = byId('rondo-replay-eco');
        const eco = sel ? sel.value : '';
        if (!eco) { adviceWarn('Sin unidad', 'Elige una unidad para reproducir su dia.'); return; }
        const it = unitByEco(eco);
        if (!it) { adviceWarn('Unidad no encontrada', eco); return; }
        const fechaEl = byId('rondo-replay-fecha');
        const fecha = (fechaEl && fechaEl.value) || rxReplayFechaHoy();
        const rango = rxReplayRango(fecha);
        const btn = byId('rondo-replay-cargar');
        if (btn) setBusy(btn, true);
        try {
            let crudos = [];
            try {
                const r = await remoteCall('messages/load_interval', {
                    itemId: it.u.id,
                    timeFrom: rango.desde, timeTo: rango.hasta,
                    flags: 1, flagsMask: 1, loadCount: 10000
                });
                crudos = r.messages || [];
            } catch (e) { crudos = []; }
            const msgs = crudos
                .filter((m) => m && m.pos && isFinite(+m.pos.y) && isFinite(+m.pos.x))
                .map((m) => ({ t: Number(m.t) || 0, lat: +m.pos.y, lon: +m.pos.x, s: Number(m.pos.s) || 0, c: Number(m.pos.c) || 0 }))
                .filter((m) => m.t > 0)
                .sort((a, b) => a.t - b.t);
            if (!msgs.length) {
                rxReplayLimpiar();
                advice('Sin recorrido', 'No hay mensajes con posicion de ' + eco + ' para ' + fecha + '.');
                return;
            }
            let acum = 0;
            msgs[0].km = 0;
            for (let i = 1; i < msgs.length; i++) {
                const d = haversine(msgs[i - 1].lat, msgs[i - 1].lon, msgs[i].lat, msgs[i].lon);
                if (d <= 5000) acum += d;
                msgs[i].km = acum;
            }
            const an = rxReplayAnalizar(msgs, it.info);
            if (RX_REPLAY && RX_REPLAY._timer) clearInterval(RX_REPLAY._timer);
            RX_REPLAY = {
                eco: eco, clave: it.info.clave, info: it.info, fecha: fecha,
                msgs: msgs, paradas: an.paradas, eventos: an.eventos, resumen: an.resumen,
                idx: 0, vt: msgs[0].t, factor: 300, playing: false, _timer: null, _tick: 0,
                truncado: msgs.length >= 10000
            };
            rxReplayPintar();
            adviceOk('Recorrido cargado', eco + ' \u00b7 ' + rxReplayHHMM(msgs[0].t) + '-' + rxReplayHHMM(msgs[msgs.length - 1].t) +
                ' \u00b7 ' + Math.round(acum / 1000) + ' km \u00b7 ' + an.paradas.length + ' parada(s)' + (msgs.length >= 10000 ? ' (truncado)' : ''));
        } finally {
            if (btn) setBusy(btn, false);
        }
    }
    function rxReplayAbrirUnidad(eco) {
        rxReplayPoblarSelect();
        const sel = byId('rondo-replay-eco');
        if (sel && eco) sel.value = eco;
        APP.replayEco = eco || (sel ? sel.value : '');
        const f = byId('rondo-replay-fecha');
        if (f && !f.value) f.value = rxReplayFechaHoy();
        setTab('replay');
        rxReplayCargar();
    }
    function bindReplay() {
        const f = byId('rondo-replay-fecha');
        if (f && !f.value) f.value = rxReplayFechaHoy();
        const sel = byId('rondo-replay-eco');
        if (sel) sel.addEventListener('change', () => { APP.replayEco = sel.value || ''; });
        const cargar = byId('rondo-replay-cargar');
        if (cargar) cargar.addEventListener('click', () => rxReplayCargar());
        const play = byId('rondo-replay-play');
        if (play) play.addEventListener('click', () => rxReplayAlternar());
        const sl = byId('rondo-replay-slider');
        if (sl) sl.addEventListener('input', () => {
            if (RX_REPLAY && RX_REPLAY.playing) rxReplayPausar();
            rxReplayIrA(+sl.value);
        });
        const vel = byId('rondo-replay-vel');
        if (vel) vel.addEventListener('change', () => {
            if (RX_REPLAY) RX_REPLAY.factor = clamp(+vel.value || 300, 10, 7200);
        });
        const centrar = byId('rondo-replay-centrar');
        if (centrar) centrar.addEventListener('click', () => { if (RX_REPLAY && RX_REPLAY.mapa) RX_REPLAY.mapa.encuadrar(); });
        const geo = byId('rondo-replay-geo');
        if (geo) geo.addEventListener('click', () => rxReplayExportarGeoJSON());
        const csv = byId('rondo-replay-csv');
        if (csv) csv.addEventListener('click', () => rxReplayExportarParadasCSV());
        const paradas = byId('rondo-replay-paradas');
        if (paradas) paradas.addEventListener('click', (e) => {
            const n = e.target.closest && e.target.closest('.rondo-replay-par');
            if (!n) return;
            if (RX_REPLAY && RX_REPLAY.playing) rxReplayPausar();
            rxReplayIrA(+n.dataset.idx);
        });
        const evs = byId('rondo-replay-eventos');
        if (evs) evs.addEventListener('click', (e) => {
            const n = e.target.closest && e.target.closest('.rondo-replay-ev');
            if (!n) return;
            if (RX_REPLAY && RX_REPLAY.playing) rxReplayPausar();
            rxReplayIrA(+n.dataset.idx);
        });
    }
