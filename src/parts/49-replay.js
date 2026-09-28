    /* ====================== REPLAY DEL DIA (v6.0.12) ======================
     * Reproduce el recorrido de una unidad en un dia o en un rango de horas.
     * Solo lectura: pide el historial con messages/load_interval y lo dibuja en
     * el mini-mapa propio de Rondo (tiles de OSM), sin depender del mapa de la
     * plataforma.
     *
     * Incluye: buscador de unidades, rango por dia y horas, resumen del tramo,
     * perfil de velocidad, paradas (zona/municipio), eventos (geocercas,
     * excesos, desvios) y exportacion (GeoJSON del recorrido, CSV de paradas).
     */
    let RX_REPLAY = null;
    let _rxRepSug = [];
    let _rxRepSugIdx = -1;

    function rxReplayHHMM(t) {
        try { return new Date((Number(t) || 0) * 1000).toLocaleTimeString().slice(0, 5); } catch (_) { return '--:--'; }
    }
    function rxReplayFechaHoy() {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + mm + '-' + dd;
    }
    function rxReplayRango(fecha, h1, h2, fecha2) {
        // Inicio y fin son fecha+hora independientes: si no se indica fecha de
        // fin, el rango cae en el mismo dia que el inicio (compatibilidad).
        const f1 = String(fecha || rxReplayFechaHoy());
        const f2 = String(fecha2 || f1);
        const t1 = /^\d{1,2}:\d{2}$/.test(h1) ? h1 : '00:00';
        const t2 = /^\d{1,2}:\d{2}$/.test(h2) ? h2 : '23:59';
        let desde = Math.floor(new Date(f1 + 'T' + t1 + ':00').getTime() / 1000);
        let hasta = Math.floor(new Date(f2 + 'T' + t2 + ':59').getTime() / 1000);
        const ahora = Math.floor(Date.now() / 1000);
        if (!isFinite(desde)) desde = ahora - 86400;
        if (!isFinite(hasta)) hasta = ahora;
        if (hasta > ahora) hasta = ahora;
        return { desde: desde, hasta: hasta };
    }
    // Estado de motor (ignicion) de un mensaje, si el sensor viene entre sus
    // parametros. Devuelve true/false, o null si no hay dato. El nombre del
    // sensor depende de cada instalacion, asi que se aceptan los tipicos.
    const RX_MOTOR_KEYS = ['engine', 'ignition', 'acc', 'motor', 'encendido', 'engineoperation', 'ignicion'];
    function rxMotorMsg(m) {
        if (!m) return null;
        if (m.eng === true || m.eng === false) return m.eng;
        const p = m.params;
        if (!p || typeof p !== 'object') return null;
        for (const k of Object.keys(p)) {
            const kk = String(k).toLowerCase().replace(/[\s_]/g, '');
            if (RX_MOTOR_KEYS.indexOf(kk) < 0) continue;
            const v = p[k];
            if (v === true || v === 1) return true;
            if (v === false || v === 0) return false;
            const s = String(v).trim().toLowerCase();
            if (s === '1' || s === 'on' || s === 'true' || s === 'encendido') return true;
            if (s === '0' || s === 'off' || s === 'false' || s === 'apagado') return false;
        }
        return null;
    }
    // Clasifica el motor de una parada a partir de las muestras del sensor y
    // del mayor hueco de reporte (s). Si no hay sensor, estima: un hueco
    // largo = apagado; reporte continuo a velocidad 0 = encendido (ralenti).
    function rxMotorClasificar(muestras, gapMaxS, gapMinS) {
        let on = 0, off = 0;
        for (const v of (muestras || [])) { if (v === true) on++; else if (v === false) off++; }
        if (on || off) return { motor: (on >= off) ? 'on' : 'off', fuente: 'sensor' };
        return { motor: ((Number(gapMaxS) || 0) >= (Number(gapMinS) || 0)) ? 'off' : 'on', fuente: 'estimado' };
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
    // ---- Buscador de unidades (combobox) ----
    function rxReplayUnidades() {
        const out = [], vistos = new Set();
        const push = (u) => {
            let info; try { info = parseUnitName(u); } catch (_) { return; }
            const eco = info.eco || info.clave;
            if (!eco || vistos.has(eco)) return;
            vistos.add(eco);
            out.push({ eco: eco, placa: info.placa || '', nombre: info.nombre || '', etq: eco + (info.placa ? ' \u00b7 ' + info.placa : '') });
        };
        (APP.unidades || []).forEach((u) => { try { if (shouldWatch(u)) push(u); } catch (_) { /* noop */ } });
        (APP.unidades || []).forEach(push);
        return out;
    }
    function rxReplayFiltrar(q) {
        const cat = rxReplayUnidades();
        const t = String(q || '').trim();
        if (!t) return cat.slice(0, 40);
        const sc = cat.map((u) => ({ u: u, s: fuzzyScore(t, u.eco + ' ' + u.placa + ' ' + u.nombre) }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 30)
            .map((x) => x.u);
        // Si escribieron un economico exacto y no aparecio, lo agregamos.
        const m = /^0*(\d{3,5})\b/.exec(t);
        if (m && !sc.some((u) => u.eco === m[1])) {
            const exacto = cat.filter((u) => u.eco === m[1])[0];
            if (exacto) sc.unshift(exacto);
        }
        return sc;
    }
    function rxReplaySugResaltar() {
        const box = byId('rondo-replay-sug');
        if (!box) return;
        box.querySelectorAll('.rondo-replay-sug-item').forEach((n) => n.classList.toggle('sel', +n.dataset.i === _rxRepSugIdx));
        const sel = box.querySelector('.rondo-replay-sug-item.sel');
        if (sel && sel.scrollIntoView) { try { sel.scrollIntoView({ block: 'nearest' }); } catch (_) { /* noop */ } }
    }
    function rxReplaySugRender() {
        const inp = byId('rondo-replay-buscar');
        const box = byId('rondo-replay-sug');
        if (!inp || !box) return;
        _rxRepSug = rxReplayFiltrar(inp.value);
        if (!_rxRepSug.length) { box.classList.remove('abierto'); box.innerHTML = ''; return; }
        if (_rxRepSugIdx >= _rxRepSug.length) _rxRepSugIdx = _rxRepSug.length - 1;
        box.innerHTML = _rxRepSug.map((u, i) =>
            '<div class="rondo-replay-sug-item' + (i === _rxRepSugIdx ? ' sel' : '') + '" data-i="' + i + '">' +
            '<span class="su-eco">' + esc(u.eco) + '</span>' +
            '<span class="su-sub">' + esc([u.placa, u.nombre].filter(Boolean).join(' \u00b7 ')) + '</span>' +
            '</div>').join('');
        box.classList.add('abierto');
        box.querySelectorAll('.rondo-replay-sug-item').forEach((n) => {
            n.onclick = () => rxReplayElegir(+n.dataset.i);
            n.onmouseenter = () => { _rxRepSugIdx = +n.dataset.i; rxReplaySugResaltar(); };
        });
    }
    function rxReplayCerrarSug() {
        const box = byId('rondo-replay-sug');
        if (box) { box.classList.remove('abierto'); box.innerHTML = ''; }
        _rxRepSugIdx = -1;
    }
    function rxReplayElegir(i) {
        const u = _rxRepSug[i];
        if (!u) return;
        rxReplaySetUnidad(u.eco, u.etq);
    }
    function rxReplaySetUnidad(eco, etq) {
        APP.replayEco = eco || '';
        const hid = byId('rondo-replay-eco');
        if (hid) hid.value = APP.replayEco;
        const inp = byId('rondo-replay-buscar');
        if (inp) inp.value = etq || eco || '';
        rxReplayCerrarSug();
    }
    // ---- Analisis del recorrido ----
    function rxReplayDetalleParada(lat, lon, zonas) {
        let zona = '', municipio = '';
        try { if (zonas && lat != null) zona = zoneAt(lat, lon) || ''; } catch (_) { /* noop */ }
        try { const m = municipioEn(lat, lon); municipio = (m && m.nombre) ? m.nombre : ''; } catch (_) { /* noop */ }
        return { zona: zona, municipio: municipio };
    }
    // ---- Lugares de OpenStreetMap para las paradas ----
    // Etiqueta de una parada: lugar de OSM > geocerca > municipio > coordenadas.
    function rxReplayParadaEtiqueta(p) {
        if (!p) return '';
        if (p.lugar) return p.lugar + (p.categoria ? ' (' + p.categoria + ')' : '');
        if (p.zona) return p.zona;
        if (p.municipio) return p.municipio;
        return (+p.lat).toFixed(4) + ',' + (+p.lon).toFixed(4);
    }
    function rxReplayParadaTooltip(p) {
        const partes = [];
        if (p.lugar) partes.push(p.lugar + (p.categoria ? ' (' + p.categoria + ')' : ''));
        if (p.direccion && p.direccion !== p.lugar) partes.push(p.direccion);
        if (p.zona) partes.push('geocerca: ' + p.zona);
        if (p.municipio) partes.push('municipio: ' + p.municipio);
        partes.push((+p.lat).toFixed(5) + ',' + (+p.lon).toFixed(5));
        return partes.join(' \u00b7 ');
    }
    function rxReplayCatPOI(t) {
        if (!t) return 'lugar';
        if (t.shop) {
            const map = { convenience: 'tienda de conveniencia', supermarket: 'supermercado', bakery: 'panaderia', butcher: 'carniceria', greengrocer: 'fruteria', clothes: 'ropa', hardware: 'ferreteria', car_repair: 'taller', tyres: 'llantera', pharmacy: 'farmacia', beverages: 'bebidas', department_store: 'tienda', variety_store: 'tienda', wholesale: 'mayoreo', doityourself: 'ferreteria', mall: 'plaza' };
            return map[t.shop] || ('tienda de ' + t.shop);
        }
        if (t.amenity) {
            const map = { fuel: 'gasolinera', restaurant: 'restaurante', fast_food: 'comida rapida', cafe: 'cafeteria', bank: 'banco', atm: 'cajero', pharmacy: 'farmacia', hospital: 'hospital', clinic: 'clinica', school: 'escuela', parking: 'estacionamiento', marketplace: 'mercado', toilets: 'sanitarios', place_of_worship: 'templo', police: 'policia' };
            return map[t.amenity] || ('servicio de ' + t.amenity);
        }
        if (t.tourism) return 'turismo';
        if (t.leisure) return 'ocio';
        if (t.office) return 'oficina';
        return 'lugar';
    }
    async function rxReplayPoiCerca(lat, lon, radio) {
        const q = '[out:json][timeout:12];(' +
            'nwr(around:' + radio + ',' + lat + ',' + lon + ')["name"]["shop"];' +
            'nwr(around:' + radio + ',' + lat + ',' + lon + ')["name"]["amenity"];' +
            'nwr(around:' + radio + ',' + lat + ',' + lon + ')["name"]["tourism"];' +
            'nwr(around:' + radio + ',' + lat + ',' + lon + ')["name"]["leisure"];' +
            'nwr(around:' + radio + ',' + lat + ',' + lon + ')["name"]["office"];' +
            ');out center 25;';
        const res = await _rxFetchJson('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(q)
        }, 12000);
        const els = (res && res.elements) || [];
        let mejor = null;
        els.forEach((el) => {
            const t = el.tags || {};
            if (!t.name) return;
            const y = (el.lat != null) ? el.lat : (el.center && el.center.lat);
            const x = (el.lon != null) ? el.lon : (el.center && el.center.lon);
            if (y == null || x == null) return;
            const d = haversine(lat, lon, y, x);
            if (d > radio) return;
            if (!mejor || d < mejor.dist) mejor = { nombre: t.name, categoria: rxReplayCatPOI(t), direccion: '', dist: Math.round(d) };
        });
        return mejor;
    }
    async function rxReplayReversa(lat, lon) {
        const espera = 1100 - (Date.now() - APP.geoLast);
        if (espera > 0) await sleep(espera);
        APP.geoLast = Date.now();
        const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=es&lat=' + lat + '&lon=' + lon;
        const d = await _rxFetchJson(url, {}, 15000);
        if (!d) return null;
        const a = d.address || {};
        const via = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(' ');
        const colonia = a.suburb || a.neighbourhood || a.city_district || a.quarter || '';
        const ciudad = a.city || a.town || a.village || a.municipality || a.county || '';
        const direccion = [via, colonia, ciudad].filter(Boolean).join(', ');
        const nombre = (d.name && d.name !== ciudad) ? d.name : '';
        if (!nombre && !direccion) return null;
        return { nombre: nombre, categoria: '', direccion: direccion, dist: null };
    }
    const _rxRepLugares = new Map(); // "lat,lon" -> lugar|null
    async function rxReplayLugarOSM(lat, lon) {
        if (lat == null || lon == null) return null;
        const key = (+lat).toFixed(5) + ',' + (+lon).toFixed(5);
        if (_rxRepLugares.has(key)) return _rxRepLugares.get(key);
        let out = null;
        if (APP.config && APP.config.overpass) {
            try { out = await rxReplayPoiCerca(lat, lon, 90); } catch (_) { out = null; }
        }
        if (!out) {
            try { out = await rxReplayReversa(lat, lon); } catch (_) { out = null; }
        }
        _rxRepLugares.set(key, out);
        return out;
    }
    // Ubica las paradas con OSM en segundo plano y refresca la lista/mapa.
    async function rxReplayUbicarParadas() {
        const r = RX_REPLAY;
        if (!r || !r.paradas || !r.paradas.length) return;
        const pend = r.paradas.filter((p) => p.lugar === undefined);
        if (!pend.length) return;
        r.ubicando = true;
        const pars = byId('rondo-replay-paradas');
        if (pars) pars.innerHTML = rxReplayParadasHTML();
        for (let i = 0; i < pend.length; i++) {
            if (RX_REPLAY !== r) return;
            const p = pend[i];
            let lugar = null;
            try { lugar = await rxReplayLugarOSM(p.lat, p.lon); } catch (_) { lugar = null; }
            p.lugar = lugar ? (lugar.nombre || lugar.direccion || '') : '';
            p.categoria = lugar ? (lugar.categoria || '') : '';
            p.direccion = lugar ? (lugar.direccion || '') : '';
            if (pars) {
                const celda = pars.querySelector('.rondo-replay-par[data-idx="' + p.idx + '"] .par-lugar');
                if (celda) { celda.textContent = rxReplayParadaEtiqueta(p); celda.title = rxReplayParadaTooltip(p); }
            }
        }
        if (RX_REPLAY !== r) return;
        r.ubicando = false;
        if (pars) pars.innerHTML = rxReplayParadasHTML();
        if (r.mapa) {
            const marcas = [];
            r.paradas.forEach((p, i) => marcas.push({ lat: p.lat, lon: p.lon, color: rxReplayColor('parada'), radio: 5, txt: 'Parada ' + (i + 1) + ' \u00b7 ' + rxReplayHHMM(p.t) + ' \u00b7 ' + rxFmtDur(p.dur) + ' \u00b7 ' + rxReplayParadaEtiqueta(p) }));
            r.eventos.forEach((m) => marcas.push({ lat: m.lat, lon: m.lon, color: rxReplayColor(m.tipo), radio: 5, txt: rxReplayHHMM(m.t) + ' \u00b7 ' + m.txt }));
            r.mapa.setMarcas(marcas);
        }
    }
    function rxReplayAnalizar(msgs, info) {
        const eventos = [], paradas = [];
        const paradaMinS = Math.max(60, (Number(APP.config.paradaMin) || 15) * 60);
        const limite = info ? limiteDe(info) : APP.config.velMax;
        const zonas = !!(APP.config.loadZones && (APP.zonas || []).length);
        let enParadaDesde = null, paradaLat = null, paradaLon = null, paradaIdx = 0;
        let paradaGapMax = 0, motorSamples = [];
        let zonaPrev = null;
        let excesoDesde = null, excesoMax = 0, excesoLat = null, excesoLon = null, excesos = 0;
        let detenido = 0, moviendo = 0, velMax = 0;
        const cerrarParada = (tFin, idxFin) => {
            const dur = tFin - enParadaDesde;
            if (dur >= paradaMinS) {
                const det = rxReplayDetalleParada(paradaLat, paradaLon, zonas);
                // Clasificacion del motor: si hay sensor, manda el sensor; si
                // no, se estima (hueco largo de reporte = apagado; reporte
                // continuo a velocidad 0 = encendido en ralenti).
                const gapMinS = Math.max(60, (Number(APP.config.replayGapMin) || 15) * 60);
                const cl = rxMotorClasificar(motorSamples, paradaGapMax, gapMinS);
                const motor = cl.motor, motorFuente = cl.fuente;
                paradas.push({
                    t: enParadaDesde, dur: dur, idx: paradaIdx, idxFin: idxFin,
                    lat: paradaLat, lon: paradaLon, zona: det.zona, municipio: det.municipio,
                    motor: motor, motorFuente: motorFuente, gapMax: Math.round(paradaGapMax)
                });
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
            else {
                if (enParadaDesde == null) {
                    enParadaDesde = m.t; paradaLat = m.lat; paradaLon = m.lon;
                    paradaIdx = i; paradaGapMax = 0; motorSamples = [];
                } else if (dt > paradaGapMax) paradaGapMax = dt;
                const em = rxMotorMsg(m);
                if (em !== null) motorSamples.push(em);
            }
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
            '<span class="rr-chip">' + rxReplayHHMM(s.inicio) + '-' + rxReplayHHMM(s.fin) + '</span>' +
            '<span class="rr-chip">' + rxFmtDist(s.distM) + '</span>' +
            '<span class="rr-chip">' + rxFmtDur(s.durSeg) + '</span>' +
            '<span class="rr-chip">' + s.paradas + ' parada(s)</span>' +
            '<span class="rr-chip">mov ' + rxFmtDur(s.moviendoSeg) + '</span>' +
            '<span class="rr-chip">det ' + rxFmtDur(s.detenidoSeg) + '</span>' +
            '<span class="rr-chip">max ' + s.velMax + ' km/h</span>' +
            (s.excesos ? '<span class="rr-chip">' + s.excesos + ' exceso(s)</span>' : '');
    }
    function rxReplayParadasHTML() {
        const r = RX_REPLAY;
        if (!r) return '';
        if (!r.paradas.length) return '<div class="rondo-replay-hint">Sin paradas de mas de ' + (APP.config.paradaMin || 15) + ' min.</div>';
        let html = r.paradas.map((p, i) =>
            '<div class="rondo-replay-par" data-idx="' + p.idx + '" data-idxfin="' + (p.idxFin == null ? p.idx : p.idxFin) + '">' +
            '<span class="par-idx">' + (i + 1) + '</span>' +
            '<span class="par-hora">' + rxReplayHHMM(p.t) + '</span>' +
            '<span class="par-dur">' + rxFmtDur(p.dur) + '</span>' +
            (p.motor ? '<span class="par-motor' + (p.motor === 'off' ? ' off' : '') + '" title="' +
                (p.motorFuente === 'sensor' ? 'Segun el sensor de motor de la unidad' : 'Estimado por el patron de reporte (hueco largo = apagado)') + '">' +
                'motor ' + (p.motor === 'off' ? 'apagado' : 'encendido') + (p.motorFuente === 'estimado' ? ' (est.)' : '') + '</span>' : '') +
            '<span class="par-lugar" title="' + esc(rxReplayParadaTooltip(p)) + '">' + esc(rxReplayParadaEtiqueta(p)) + '</span>' +
            '</div>'
        ).join('');
        if (r.ubicando) html += '<div class="rondo-replay-hint">Ubicando las paradas con OpenStreetMap...</div>';
        return html;
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
    // ---- Perfil de velocidad ----
    function rxReplayChartHTML() {
        const r = RX_REPLAY;
        if (!r || !r.msgs.length) return '<div class="rondo-replay-vacio">Perfil de velocidad</div>';
        const W = 1000, H = 100;
        const t0 = r.msgs[0].t, t1 = r.msgs[r.msgs.length - 1].t;
        const dur = Math.max(1, t1 - t0);
        const vmax = Math.max(10, r.resumen.velMax);
        const paso = Math.max(1, Math.ceil(r.msgs.length / 500));
        let d = '';
        for (let i = 0; i < r.msgs.length; i += paso) {
            const m = r.msgs[i];
            const x = ((m.t - t0) / dur) * W;
            const y = H - (Math.min(m.s, vmax) / vmax * (H - 8)) - 4;
            d += (d ? ' ' : '') + x.toFixed(1) + ',' + y.toFixed(1);
        }
        const last = r.msgs[r.msgs.length - 1];
        d += ' ' + W + ',' + (H - (Math.min(last.s, vmax) / vmax * (H - 8)) - 4).toFixed(1);
        let mx = '';
        r.paradas.forEach((p) => { mx += '<circle cx="' + (((p.t - t0) / dur) * W).toFixed(1) + '" cy="' + (H - 3) + '" r="2.5" fill="#7d8595"/>'; });
        r.eventos.forEach((e2) => { mx += '<circle cx="' + (((e2.t - t0) / dur) * W).toFixed(1) + '" cy="' + (H - 8) + '" r="2.5" fill="' + rxReplayColor(e2.tipo) + '"/>'; });
        return '<svg id="rondo-replay-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="rondo-replay-chart-svg">' +
            '<polyline fill="none" stroke="var(--rondo-accent-2)" stroke-width="2" vector-effect="non-scaling-stroke" points="' + d + '"/>' +
            mx +
            '<line id="rondo-replay-chart-cur" x1="0" y1="0" x2="0" y2="' + H + '" stroke="var(--rondo-accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
            '</svg>';
    }
    function rxReplayChartRender() {
        const cont = byId('rondo-replay-chart');
        if (cont) cont.innerHTML = rxReplayChartHTML();
    }
    function rxReplayChartCursor() {
        const r = RX_REPLAY;
        const cur = byId('rondo-replay-chart-cur');
        if (!r || !cur) return;
        const t0 = r.msgs[0].t, t1 = r.msgs[r.msgs.length - 1].t;
        const dur = Math.max(1, t1 - t0);
        const x = ((r.msgs[r.idx].t - t0) / dur) * 1000;
        cur.setAttribute('x1', x.toFixed(1));
        cur.setAttribute('x2', x.toFixed(1));
    }
    // ---- Mini-mapa ----
    function rxReplayMapaCrear() {
        const r = RX_REPLAY;
        const cont = byId('rondo-replay-mapa');
        if (!cont || !r) return;
        if (r.mapa) { try { r.mapa.destruir(); } catch (_) { /* noop */ } r.mapa = null; }
        cont.innerHTML = '';
        const full = r.msgs.map((m) => ({ lat: m.lat, lon: m.lon }));
        const marcas = [];
        r.paradas.forEach((p, i) => marcas.push({ lat: p.lat, lon: p.lon, color: rxReplayColor('parada'), radio: 5, txt: 'Parada ' + (i + 1) + ' \u00b7 ' + rxReplayHHMM(p.t) + ' \u00b7 ' + rxFmtDur(p.dur) + ' \u00b7 ' + rxReplayParadaEtiqueta(p) }));
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
    // v6.9.1: centraliza el estado visual del boton Play/Pausa (icono + texto
    // + color + habilitado) para no romper el icono al cambiar de estado.
    // `enabled` es opcional: si se pasa, tambien ajusta el disabled.
    function rxReplaySetPlayBtn(playing, enabled) {
        const pb = byId('rondo-replay-play');
        if (!pb) return;
        if (enabled != null) pb.disabled = !enabled;
        const txt = pb.querySelector('.rrc-play-txt');
        if (txt) txt.textContent = playing ? 'Pausa' : 'Play';
        else pb.textContent = playing ? 'Pausa' : 'Play';
        const ico = pb.querySelector('.rrc-play-ico');
        if (ico) ico.innerHTML = playing ? UIS.pause : UIS.play;
        pb.classList.toggle('activo', !!playing);
        pb.title = playing ? 'Pausar el recorrido' : 'Reproducir el recorrido';
    }
    // v6.9.1: habilita/deshabilita los controles de reproduccion y el
    // reinicio segun haya o no un recorrido cargado.
    function rxReplaySetControles(on) {
        const pb = byId('rondo-replay-play');
        if (pb) pb.disabled = !on;
        const rb = byId('rondo-replay-reiniciar');
        if (rb) rb.disabled = !on;
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
        rxReplaySetPlayBtn(!!r.playing, true);
        const tl = byId('rondo-replay-tiempo');
        if (tl) {
            const finM = r.msgs[r.msgs.length - 1];
            tl.textContent = rxReplayHHMM(m.t) + ' / ' + rxReplayHHMM(finM ? finM.t : m.t);
        }
        if (r.mapa) {
            r.mapa.setPos(m.lat, m.lon);
            rxReplayMarcarViajado();
        }
        rxReplayChartCursor();
        const evs = byId('rondo-replay-eventos');
        if (evs) evs.querySelectorAll('.rondo-replay-ev').forEach((n) => n.classList.toggle('activo', +n.dataset.idx === r.idx));
        const pars = byId('rondo-replay-paradas');
        if (pars) pars.querySelectorAll('.rondo-replay-par').forEach((n) => {
            const a = +n.dataset.idx, b = +n.dataset.idxfin;
            n.classList.toggle('activo', r.idx >= a && r.idx <= b);
        });
    }
    // v6.11.1: opciones del reporte del recorrido (que incluir en el PDF).
    // Devuelve siempre todas las claves (con sus defaults) aunque la config
    // guardada sea parcial.
    function rxReplayReporteOpts() {
        const def = { mapa: true, kpis: true, paradas: true, eventos: true, puntos: true, coords: true, soloOff: false };
        const c = (APP.config && APP.config.replayReporte) || {};
        const o = {};
        Object.keys(def).forEach((k) => { o[k] = (c[k] === undefined) ? def[k] : !!c[k]; });
        return o;
    }
    function rxReplayOpcionesSync() {
        const o = rxReplayReporteOpts();
        const map = { 'rondo-rep-mapa': 'mapa', 'rondo-rep-kpis': 'kpis', 'rondo-rep-paradas': 'paradas', 'rondo-rep-eventos': 'eventos', 'rondo-rep-puntos': 'puntos', 'rondo-rep-coords': 'coords', 'rondo-rep-solooff': 'soloOff' };
        Object.keys(map).forEach((id) => { const el = byId(id); if (el) el.checked = !!o[map[id]]; });
    }
    function rxReplayPintar() {
        const r = RX_REPLAY;
        rxReplayOpcionesSync();
        const resumen = byId('rondo-replay-resumen');
        if (resumen) resumen.innerHTML = rxReplayResumenHTML();
        const pars = byId('rondo-replay-paradas');
        if (pars) pars.innerHTML = rxReplayParadasHTML();
        const evs = byId('rondo-replay-eventos');
        if (evs) evs.innerHTML = rxReplayEventosHTML();
        rxReplayChartRender();
        if (r) rxReplayMapaCrear();
        else {
            const cont = byId('rondo-replay-mapa');
            if (cont) cont.innerHTML = '<div class="rondo-replay-vacio"><span class="rondo-usym rv-ico">' + UIS.map + '</span><span>Carga un recorrido para verlo en el mapa</span></div>';
        }
        const sl = byId('rondo-replay-slider');
        if (sl && r) { sl.min = 0; sl.max = Math.max(0, r.msgs.length - 1); sl.value = r.idx; }
        // v6.9.1: habilita Play/Reiniciar en cuanto hay un recorrido.
        rxReplaySetControles(!!r);
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
    function rxReplayIrAFraccion(frac) {
        const r = RX_REPLAY;
        if (!r) return;
        const t0 = r.msgs[0].t, t1 = r.msgs[r.msgs.length - 1].t;
        const t = t0 + clamp(frac, 0, 1) * Math.max(1, t1 - t0);
        let lo = 0, hi = r.msgs.length - 1, idx = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (r.msgs[mid].t <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
        }
        if (r.playing) rxReplayPausar();
        rxReplayIrA(idx);
    }
    function rxReplayRangoRapido(kind) {
        const f = byId('rondo-replay-fecha');
        const f2 = byId('rondo-replay-fecha2');
        const d = byId('rondo-replay-desde');
        const h = byId('rondo-replay-hasta');
        const set = (fecha, h1, h2, fechaFin) => {
            if (f) f.value = fecha;
            if (f2) f2.value = fechaFin || fecha;
            if (d) d.value = h1;
            if (h) h.value = h2;
        };
        const hoy = rxReplayFechaHoy();
        const ayer = (() => { const x = new Date(); x.setDate(x.getDate() - 1); const mm = String(x.getMonth() + 1).padStart(2, '0'); const dd = String(x.getDate()).padStart(2, '0'); return x.getFullYear() + '-' + mm + '-' + dd; })();
        if (kind === 'ayer') set(ayer, '00:00', '23:59');
        else if (kind === 'dia') set(f && f.value ? f.value : hoy, '06:00', '18:00');
        else if (kind === 'noche') set(f && f.value ? f.value : hoy, '18:00', '23:59');
        else if (kind === '24h') {
            // Ultimas 24 h cruzando la medianoche (ayer a esta hora -> hoy).
            const x = new Date();
            const hhmm = String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0');
            set(ayer, hhmm, hhmm, hoy);
        }
        else set(hoy, '00:00', '23:59');
    }
    function rxReplayExportarGeoJSON() {
        const r = RX_REPLAY;
        if (!r) { adviceWarn('Sin recorrido', 'Carga un recorrido primero.'); return; }
        const features = [{
            type: 'Feature',
            properties: { eco: r.eco, desde: new Date(r.resumen.inicio * 1000).toISOString(), hasta: new Date(r.resumen.fin * 1000).toISOString(), km: Math.round(r.resumen.distM / 1000) },
            geometry: { type: 'LineString', coordinates: r.msgs.map((m) => [+m.lon.toFixed(6), +m.lat.toFixed(6)]) }
        }];
        r.paradas.forEach((p, i) => features.push({
            type: 'Feature',
            properties: { tipo: 'parada', n: i + 1, hora: rxReplayHHMM(p.t), durMin: Math.round(p.dur / 60), motor: p.motor || '', motorFuente: p.motorFuente || '', zona: p.zona || '', municipio: p.municipio || '' },
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
        const filas = [['n', 'hora', 'duracion_min', 'motor', 'lat', 'lon', 'zona', 'municipio']];
        r.paradas.forEach((p, i) => filas.push([i + 1, rxReplayHHMM(p.t), Math.round(p.dur / 60), (p.motor || '') + (p.motorFuente === 'estimado' ? ' (est.)' : ''), p.lat.toFixed(5), p.lon.toFixed(5), p.zona || '', p.municipio || '']));
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
        if (cont) cont.innerHTML = '<div class="rondo-replay-vacio"><span class="rondo-usym rv-ico">' + UIS.map + '</span><span>Carga un recorrido para verlo en el mapa</span></div>';
        const chart = byId('rondo-replay-chart');
        if (chart) chart.innerHTML = '<div class="rondo-replay-vacio">Perfil de velocidad</div>';
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
        const tl = byId('rondo-replay-tiempo');
        if (tl) tl.textContent = '--:-- / --:--';
        // v6.9.1: restaura el boton Play sin romper el icono y apaga los
        // controles hasta que se cargue un recorrido.
        rxReplaySetPlayBtn(false, false);
        rxReplaySetControles(false);
        const est = byId('rondo-replay-estado');
        if (est) { est.textContent = ''; est.className = 'rrc-estado'; }
        const cargarTxt = byId('rondo-replay-cargar');
        if (cargarTxt) {
            const t = cargarTxt.querySelector('.rrc-cargar-txt');
            if (t) t.textContent = 'Cargar recorrido';
        }
    }
    // v6.9.1: linea de estado bajo el boton Cargar (cargando / cargado /
    // sin resultados / error). `tipo` cambia el color via CSS.
    function rxReplayEstado(txt, tipo) {
        const el = byId('rondo-replay-estado');
        if (!el) return;
        el.textContent = txt || '';
        el.className = 'rrc-estado' + (tipo ? ' ' + tipo : '');
    }
    async function rxReplayCargar() {
        let eco = APP.replayEco || '';
        if (!eco) {
            const inp = byId('rondo-replay-buscar');
            const t = inp ? inp.value.trim() : '';
            if (t) { const cand = rxReplayFiltrar(t)[0]; if (cand) eco = cand.eco; }
        }
        if (!eco) {
            const inp = byId('rondo-replay-buscar');
            if (inp) try { inp.focus(); } catch (_) { /* noop */ }
            rxReplayEstado('Elige una unidad para reproducir.', 'warn');
            adviceWarn('Sin unidad', 'Busca y elige una unidad para reproducir.');
            return;
        }
        const it = unitByEco(eco);
        if (!it) { rxReplayEstado('Unidad no encontrada: ' + eco, 'err'); adviceWarn('Unidad no encontrada', eco); return; }
        const ucat = rxReplayUnidades().filter((x) => x.eco === eco)[0];
        rxReplaySetUnidad(eco, ucat ? ucat.etq : eco);
        const fechaEl = byId('rondo-replay-fecha');
        const fecha2El = byId('rondo-replay-fecha2');
        const h1 = byId('rondo-replay-desde');
        const h2 = byId('rondo-replay-hasta');
        const fecha = (fechaEl && fechaEl.value) || rxReplayFechaHoy();
        const fecha2 = (fecha2El && fecha2El.value) || fecha;
        const rango = rxReplayRango(fecha, h1 ? h1.value : '', h2 ? h2.value : '', fecha2);
        if (rango.hasta <= rango.desde) {
            rxReplayEstado('El fin debe ser posterior al inicio.', 'warn');
            adviceWarn('Rango invalido', 'El fin debe ser posterior al inicio.');
            return;
        }
        const btn = byId('rondo-replay-cargar');
        const etq = ucat ? ucat.etq : eco;
        rxReplayEstado('Cargando recorrido de ' + etq + '...', 'cargando');
        // Mientras carga, Play/Reiniciar quedan deshabilitados para evitar
        // estados raros (se re-habilitan al terminar, ver finally).
        rxReplaySetControles(false);
        if (btn) setBusy(btn, true, 'Cargando...');
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
                .map((m) => ({ t: Number(m.t) || 0, lat: +m.pos.y, lon: +m.pos.x, s: Number(m.pos.s) || 0, c: Number(m.pos.c) || 0, eng: rxMotorMsg(m), params: m.params || null }))
                .filter((m) => m.t > 0)
                .sort((a, b) => a.t - b.t);
            if (!msgs.length) {
                rxReplayLimpiar();
                rxReplayEstado('Sin recorrido de ' + etq + ' en ese rango.', 'warn');
                advice('Sin recorrido', 'No hay mensajes con posicion de ' + eco + ' en ese rango.');
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
                eco: eco, clave: it.info.clave, info: it.info, fecha: fecha, fecha2: fecha2,
                desde: rango.desde, hasta: rango.hasta,
                msgs: msgs, paradas: an.paradas, eventos: an.eventos, resumen: an.resumen,
                idx: 0, vt: msgs[0].t, factor: 300, playing: false, _timer: null, _tick: 0,
                truncado: msgs.length >= 10000
            };
            rxReplayPintar();
            rxReplayUbicarParadas();
            // Resumen visible bajo el boton (sin depender del toast).
            rxReplayEstado(etq + ' \u00b7 ' + rxReplayHHMM(msgs[0].t) + '\u2013' + rxReplayHHMM(msgs[msgs.length - 1].t) +
                ' \u00b7 ' + Math.round(acum / 1000) + ' km \u00b7 ' + an.paradas.length + ' parada(s)' +
                (msgs.length >= 10000 ? ' \u00b7 truncado' : ''), 'ok');
            // Cambia el texto del boton a "Recargar" tras la primera carga.
            if (btn) {
                const t = btn.querySelector('.rrc-cargar-txt');
                if (t) t.textContent = 'Recargar recorrido';
            }
            adviceOk('Recorrido cargado', eco + ' \u00b7 ' + rxReplayHHMM(msgs[0].t) + '-' + rxReplayHHMM(msgs[msgs.length - 1].t) +
                ' \u00b7 ' + Math.round(acum / 1000) + ' km \u00b7 ' + an.paradas.length + ' parada(s)' + (msgs.length >= 10000 ? ' (truncado)' : ''));
        } catch (e) {
            rxReplayEstado('Error al cargar el recorrido: ' + ((e && e.message) || e), 'err');
        } finally {
            if (btn) setBusy(btn, false);
            // Re-habilita los controles si quedo un recorrido cargado.
            rxReplaySetControles(!!RX_REPLAY);
        }
    }
    function rxReplayAbrirUnidad(eco) {
        const u = rxReplayUnidades().filter((x) => x.eco === eco)[0];
        rxReplaySetUnidad(eco, u ? u.etq : eco);
        const f = byId('rondo-replay-fecha');
        if (f && !f.value) f.value = rxReplayFechaHoy();
        const f2 = byId('rondo-replay-fecha2');
        if (f2 && !f2.value) f2.value = (f && f.value) || rxReplayFechaHoy();
        setTab('replay');
        rxReplayCargar();
    }
    function bindReplay() {
        const f = byId('rondo-replay-fecha');
        if (f && !f.value) f.value = rxReplayFechaHoy();
        const f2 = byId('rondo-replay-fecha2');
        if (f2 && !f2.value) f2.value = (f && f.value) || rxReplayFechaHoy();
        const inp = byId('rondo-replay-buscar');
        if (inp) {
            inp.addEventListener('input', () => { _rxRepSugIdx = -1; rxReplaySugRender(); });
            inp.addEventListener('focus', () => rxReplaySugRender());
            inp.addEventListener('keydown', (e) => {
                const abierto = byId('rondo-replay-sug') && byId('rondo-replay-sug').classList.contains('abierto');
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (!abierto) { rxReplaySugRender(); return; }
                    if (_rxRepSug.length) { _rxRepSugIdx = (_rxRepSugIdx + 1) % _rxRepSug.length; rxReplaySugResaltar(); }
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (abierto && _rxRepSug.length) { _rxRepSugIdx = (_rxRepSugIdx - 1 + _rxRepSug.length) % _rxRepSug.length; rxReplaySugResaltar(); }
                    return;
                }
                if (e.key === 'Escape') {
                    if (abierto) { e.stopPropagation(); rxReplayCerrarSug(); }
                    return;
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (abierto && _rxRepSugIdx >= 0) { rxReplayElegir(_rxRepSugIdx); rxReplayCargar(); return; }
                    if (_rxRepSug.length) { rxReplayElegir(0); rxReplayCargar(); return; }
                    rxReplayCargar();
                }
            });
        }
        document.addEventListener('click', (e) => {
            const wrap = e.target.closest && e.target.closest('.rondo-replay-buscar');
            if (!wrap) rxReplayCerrarSug();
        });
        const cargar = byId('rondo-replay-cargar');
        if (cargar) cargar.addEventListener('click', () => rxReplayCargar());
        const play = byId('rondo-replay-play');
        if (play) play.addEventListener('click', () => rxReplayAlternar());
        // v6.9.1: reiniciar al inicio del recorrido.
        const reiniciar = byId('rondo-replay-reiniciar');
        if (reiniciar) reiniciar.addEventListener('click', () => {
            if (!RX_REPLAY) return;
            if (RX_REPLAY.playing) rxReplayPausar();
            rxReplayIrA(0);
        });
        // v6.9.1: barra espaciadora = Play/Pausa cuando la tab Replay esta
        // activa y el foco no esta en un campo de texto.
        document.addEventListener('keydown', (e) => {
            if (APP.tab !== 'replay') return;
            const tag = ((e.target && e.target.tagName) || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (e.key === ' ' || e.key === 'Spacebar') {
                if (!RX_REPLAY || RX_REPLAY.playing === undefined) return;
                e.preventDefault();
                rxReplayAlternar();
            }
        });
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
        const pdf = byId('rondo-replay-pdf');
        if (pdf) pdf.addEventListener('click', () => exportReplayPDF());
        // Rangos rapidos.
        document.querySelectorAll('#rondo-wrap-replay .rondo-replay-quick button[data-rango]').forEach((b) => {
            b.addEventListener('click', () => {
                document.querySelectorAll('#rondo-wrap-replay .rondo-replay-quick button[data-rango]').forEach((x) => x.classList.remove('activo'));
                b.classList.add('activo');
                rxReplayRangoRapido(b.dataset.rango);
                rxReplayCargar();
            });
        });
        // Perfil de velocidad: clic para saltar.
        const chart = byId('rondo-replay-chart');
        if (chart) chart.addEventListener('click', (e) => {
            const rect = chart.getBoundingClientRect();
            rxReplayIrAFraccion((e.clientX - rect.left) / Math.max(1, rect.width));
        });
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
        // v6.11.1: opciones del reporte (checkboxes). Se guardan en la config.
        rxReplayOpcionesSync();
        [['rondo-rep-mapa', 'mapa'], ['rondo-rep-kpis', 'kpis'], ['rondo-rep-paradas', 'paradas'],
         ['rondo-rep-eventos', 'eventos'], ['rondo-rep-puntos', 'puntos'],
         ['rondo-rep-coords', 'coords'], ['rondo-rep-solooff', 'soloOff']].forEach((par) => {
            const el = byId(par[0]);
            if (!el) return;
            el.addEventListener('change', () => {
                APP.config.replayReporte = Object.assign({}, APP.config.replayReporte, { [par[1]]: !!el.checked });
                try { writeJSON(LS.cfg, APP.config); } catch (_) { /* noop */ }
            });
        });
    }
