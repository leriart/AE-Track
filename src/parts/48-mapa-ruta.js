    /* ====================== MINI-MAPA PROPIO + RUTA (v6.0.11) ======================
     * v6.0.11: se elimino el overlay sobre el mapa de la plataforma (dependia
     * del motor del mapa y no era fiable). En su lugar, Rondo trae su propio
     * mini-mapa de tiles de OpenStreetMap: no depende del mapa de la
     * plataforma, asi que siempre funciona. Se usa para ver una ruta
     * planificada y para el replay del dia.
     *
     * Es solo lectura: pide tiles publicos de OSM (con atribucion) y dibuja
     * encima el trazo y los marcadores.
     */
    function rxMMLonX(lon, z) { return ((lon + 180) / 360) * Math.pow(2, z) * 256; }
    function rxMMLatY(lat, z) {
        const l = clamp(Number(lat) || 0, -85.05112878, 85.05112878);
        const s = Math.sin(l * Math.PI / 180);
        return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * Math.pow(2, z) * 256;
    }
    function rxMMMuestrear(arr, max) {
        if (!arr || arr.length <= max) return arr || [];
        const paso = Math.ceil(arr.length / max);
        const out = [];
        for (let i = 0; i < arr.length; i += paso) out.push(arr[i]);
        if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
        return out;
    }
    function rxMMPt(inst, lat, lon) {
        return [rxMMLonX(lon, inst.z) - inst.ox, rxMMLatY(lat, inst.z) - inst.oy];
    }
    function rxMMPuntos(inst) {
        const out = [];
        (inst.lineas || []).forEach((ln) => { if (ln && ln.pts) for (let i = 0; i < ln.pts.length; i++) out.push(ln.pts[i]); });
        (inst.marcas || []).forEach((m) => out.push(m));
        if (inst.pos) out.push(inst.pos);
        return out;
    }
    function rxMMFit(inst) {
        const pts = rxMMPuntos(inst);
        if (!pts.length) return;
        let latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (!p || !isFinite(p.lat) || !isFinite(p.lon)) continue;
            if (p.lat < latMin) latMin = p.lat;
            if (p.lat > latMax) latMax = p.lat;
            if (p.lon < lonMin) lonMin = p.lon;
            if (p.lon > lonMax) lonMax = p.lon;
        }
        if (!isFinite(latMin)) return;
        const W = Math.max(80, inst.W), H = Math.max(80, inst.H);
        if (latMax - latMin < 1e-5 && lonMax - lonMin < 1e-5) {
            inst.z = 16;
            inst.ox = rxMMLonX(lonMin, 16) - W / 2;
            inst.oy = rxMMLatY(latMin, 16) - H / 2;
            return;
        }
        let z = 19;
        for (; z >= 2; z--) {
            const pw = rxMMLonX(lonMax, z) - rxMMLonX(lonMin, z);
            const ph = rxMMLatY(latMin, z) - rxMMLatY(latMax, z);
            if (pw <= W - 40 && ph <= H - 40) break;
        }
        inst.z = clamp(z, 2, 19);
        const cx = (rxMMLonX(lonMin, inst.z) + rxMMLonX(lonMax, inst.z)) / 2;
        const cy = (rxMMLatY(latMin, inst.z) + rxMMLatY(latMax, inst.z)) / 2;
        inst.ox = cx - W / 2;
        inst.oy = cy - H / 2;
    }
    function rxMMTiles(inst) {
        const z = inst.z;
        const n = Math.pow(2, z);
        const x0 = Math.floor(inst.ox / 256), x1 = Math.floor((inst.ox + inst.W) / 256);
        const y0 = Math.floor(inst.oy / 256), y1 = Math.floor((inst.oy + inst.H) / 256);
        let html = '';
        for (let tx = x0; tx <= x1; tx++) {
            for (let ty = y0; ty <= y1; ty++) {
                if (ty < 0 || ty >= n) continue;
                const wx = ((tx % n) + n) % n;
                const left = tx * 256 - inst.ox;
                const top = ty * 256 - inst.oy;
                html += '<img class="rondo-mm-tile" src="https://tile.openstreetmap.org/' + z + '/' + wx + '/' + ty + '.png"' +
                    ' style="left:' + left + 'px;top:' + top + 'px" alt="" draggable="false" loading="lazy">';
            }
        }
        inst.capaTiles.innerHTML = html;
    }
    function rxMMLineaHTML(inst, ln) {
        if (!ln || !ln.pts || ln.pts.length < 2) return '';
        const pts = rxMMMuestrear(ln.pts, 2000);
        let d = '';
        for (let i = 0; i < pts.length; i++) {
            const q = rxMMPt(inst, pts[i].lat, pts[i].lon);
            d += (d ? ' ' : '') + q[0].toFixed(1) + ',' + q[1].toFixed(1);
        }
        return '<polyline fill="none" stroke="' + (ln.color || '#850D22') + '" stroke-width="' + (ln.width || 3) +
            '" stroke-opacity="' + (ln.opacity == null ? 1 : ln.opacity) + '" stroke-linejoin="round" stroke-linecap="round" points="' + d + '"/>';
    }
    function rxMMMarcasHTML(inst) {
        let html = '';
        (inst.marcas || []).forEach((m) => {
            if (!m || !isFinite(m.lat) || !isFinite(m.lon)) return;
            const q = rxMMPt(inst, m.lat, m.lon);
            html += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + (m.radio || 5) +
                '" fill="' + (m.color || '#1565c0') + '" stroke="#fff" stroke-width="1.5">' +
                (m.txt ? '<title>' + esc(m.txt) + '</title>' : '') + '</circle>';
        });
        return html;
    }
    function rxMMDibujar(inst, soloDinamico) {
        const est = inst.svg.querySelector('.rondo-mm-est');
        const din = inst.svg.querySelector('.rondo-mm-din');
        if (!soloDinamico && est) {
            let h = '';
            (inst.lineas || []).forEach((ln) => { if (ln && !ln.dyn) h += rxMMLineaHTML(inst, ln); });
            h += rxMMMarcasHTML(inst);
            est.innerHTML = h;
        }
        if (din) {
            let h = '';
            (inst.lineas || []).forEach((ln) => { if (ln && ln.dyn) h += rxMMLineaHTML(inst, ln); });
            if (inst.pos && isFinite(inst.pos.lat)) {
                const q = rxMMPt(inst, inst.pos.lat, inst.pos.lon);
                h += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="7" fill="#850D22" stroke="#fff" stroke-width="2"/>';
            }
            din.innerHTML = h;
        }
    }
    // Crea un mini-mapa dentro de `cont`.
    // cfg: { lineas:[{pts:[{lat,lon}], color, width, opacity, dyn}], marcas:[{lat,lon,color,radio,txt}], pos }
    function rxMiniMapa(cont, cfg) {
        if (!cont) return null;
        const o = cfg || {};
        cont.classList.add('rondo-mm');
        cont.innerHTML = '<div class="rondo-mm-tiles"></div>' +
            '<svg class="rondo-mm-svg" xmlns="http://www.w3.org/2000/svg"><g class="rondo-mm-est"></g><g class="rondo-mm-din"></g></svg>' +
            '<div class="rondo-mm-atrib">\u00a9 OpenStreetMap</div>';
        const inst = {
            cont: cont,
            capaTiles: cont.querySelector('.rondo-mm-tiles'),
            svg: cont.querySelector('.rondo-mm-svg'),
            lineas: o.lineas || [],
            marcas: o.marcas || [],
            pos: o.pos || null,
            W: 0, H: 0, z: 16, ox: 0, oy: 0
        };
        inst.medir = () => {
            inst.W = Math.max(80, cont.clientWidth || 300);
            inst.H = Math.max(80, cont.clientHeight || 240);
            inst.svg.setAttribute('viewBox', '0 0 ' + inst.W + ' ' + inst.H);
        };
        inst.render = () => { rxMMTiles(inst); rxMMDibujar(inst, false); };
        inst.encuadrar = () => { inst.medir(); rxMMFit(inst); inst.render(); };
        inst.ponerDatos = (d) => {
            if (!d) return;
            if (d.lineas) inst.lineas = d.lineas;
            if (d.marcas) inst.marcas = d.marcas;
            inst.pos = d.pos || null;
            inst.encuadrar();
        };
        inst.setPos = (lat, lon) => { inst.pos = { lat: lat, lon: lon }; if (inst.svg) rxMMDibujar(inst, true); };
        inst.setLinea = (i, pts, color, width, opacity) => {
            inst.lineas[i] = { pts: pts, color: color, width: width, opacity: opacity, dyn: true };
            if (inst.svg) rxMMDibujar(inst, true);
        };
        inst.destruir = () => { try { cont.innerHTML = ''; } catch (_) { /* noop */ } };
        // Pan con arrastre.
        let drag = null;
        cont.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            drag = { x: e.clientX, y: e.clientY, ox: inst.ox, oy: inst.oy };
            try { cont.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
            e.preventDefault();
        });
        cont.addEventListener('pointermove', (e) => {
            if (!drag) return;
            inst.ox = drag.ox - (e.clientX - drag.x);
            inst.oy = drag.oy - (e.clientY - drag.y);
            rxMMTiles(inst); rxMMDibujar(inst, false);
        });
        const fin = () => { drag = null; };
        cont.addEventListener('pointerup', fin);
        cont.addEventListener('pointercancel', fin);
        // Zoom con rueda, centrado en el cursor.
        cont.addEventListener('wheel', (e) => {
            const nz = clamp(inst.z + (e.deltaY < 0 ? 1 : -1), 2, 19);
            if (nz === inst.z) return;
            e.preventDefault();
            const rect = cont.getBoundingClientRect();
            const mx = e.clientX - rect.left, my = e.clientY - rect.top;
            const f = Math.pow(2, nz - inst.z);
            inst.ox = (inst.ox + mx) * f - mx;
            inst.oy = (inst.oy + my) * f - my;
            inst.z = nz;
            rxMMTiles(inst); rxMMDibujar(inst, false);
        }, { passive: false });
        inst.encuadrar();
        return inst;
    }
    // Abre una ventana con el mini-mapa de la ruta planificada de una unidad.
    function rxRutaMiniMapa(eco) {
        const it = unitByEco(eco);
        const r = it ? rutaDe(it.info) : (APP.rutas[eco] || null);
        if (!r || !r.coords || r.coords.length < 2) { adviceWarn('Sin ruta', 'No hay una ruta trazada para ' + eco + '.'); return; }
        const lineas = [{ pts: r.coords.map((c) => ({ lat: c[1], lon: c[0] })), color: '#850D22', width: 4, opacity: 0.95 }];
        const marcas = [];
        if (r.origen) marcas.push({ lat: r.origen.lat, lon: r.origen.lon, color: '#2e7d32', radio: 7, txt: 'Origen' });
        (r.paradas || []).forEach((p, i) => {
            if (p.coords) marcas.push({ lat: p.coords.lat, lon: p.coords.lon, color: '#1565c0', radio: 6, txt: (i + 1) + '. ' + (p.texto || '') });
        });
        if (r.destino) marcas.push({ lat: r.destino.lat, lon: r.destino.lon, color: '#b71c1c', radio: 7, txt: 'Destino' });
        const resumen = Math.round((r.total || 0) / 1000) + ' km' +
            (r.modo ? ' \u00b7 ' + r.modo : '') + ' \u00b7 ' + ((r.paradas || []).length) + ' parada(s)';
        abrirDialogo({
            icon: UIS.map,
            titulo: 'Ruta de ' + eco,
            html: '<div class="rondo-mm-resumen">' + esc(resumen) + '</div>' +
                '<div id="rondo-ruta-minimapa" class="rondo-minimapa"></div>' +
                '<div class="rondo-mm-hint">Arrastra para mover, rueda para acercar. Trazo y marcadores de Rondo.</div>',
            cancelText: 'Cerrar',
            okText: 'Cerrar',
            onOk: () => {},
            ancho: 860,
            onOpen: (el) => {
                const cont = el.querySelector('#rondo-ruta-minimapa');
                if (cont) rxMiniMapa(cont, { lineas: lineas, marcas: marcas });
            }
        });
    }
    // Alternativa garantizada: abrir la ruta en Google Maps con paradas.
    function rxRutaGoogleMaps(eco) {
        const it = unitByEco(eco);
        const r = it ? rutaDe(it.info) : (APP.rutas[eco] || null);
        if (!r || !r.origen || !r.destino) { adviceWarn('Sin ruta', eco); return; }
        const paradas = (r.paradas || []).map((p) => p.coords).filter(Boolean);
        const o = r.origen, d = r.destino;
        let url = 'https://www.google.com/maps/dir/?api=1&origin=' + o.lat + ',' + o.lon +
            '&destination=' + d.lat + ',' + d.lon + '&travelmode=driving';
        if (paradas.length > 1) {
            const wp = paradas.slice(0, -1).map((p) => p.lat + ',' + p.lon).slice(0, 10).join('|');
            if (wp) url += '&waypoints=' + encodeURIComponent(wp);
        }
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
    }
    // Alternativa: abrir la ruta en OpenStreetMap (una parada como destino).
    function rxRutaOSM(eco) {
        const it = unitByEco(eco);
        const r = it ? rutaDe(it.info) : (APP.rutas[eco] || null);
        if (!r || !r.origen) { adviceWarn('Sin ruta', eco); return; }
        const d = r.destino || r.origen;
        const url = 'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=' +
            r.origen.lat + ',' + r.origen.lon + ';' + d.lat + ',' + d.lon;
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
    }
