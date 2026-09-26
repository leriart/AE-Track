    /* ====================== RUTA EN EL MAPA DE LA PLATAFORMA ======================
     * v6.0.4. Dibuja la ruta planificada de una unidad ENCIMA del mapa de la
     * plataforma. El overlay es una capa vectorial, asi que funciona con
     * cualquiera de los mapas base de la plataforma (WebGIS, Bing, OSM...).
     *
     * Es solo lectura: agrega una capa de dibujo y no toca nada de Wialon.
     * Se intenta detectar el motor del mapa (Leaflet, OpenLayers, Mapbox o el
     * WebGIS de Wialon) y, si no se puede, se ofrecen alternativas (Google
     * Maps / exportar GeoJSON).
     */
    let _rxMapaLayer = null;   // capa/overlay activo
    let _rxMapaMotor = null;   // 'leaflet' | 'openlayers' | 'mapbox'
    let _rxMapaInst = null;    // instancia del mapa
    let _rxMapaClave = null;   // ruta dibujada

    function rxMapaClasificar(o) {
        if (!o || typeof o !== 'object') return null;
        try {
            if (typeof o.addLayer === 'function' && o._container && typeof o.getCenter === 'function') return 'leaflet';
            if (typeof o.getTargetElement === 'function' && typeof o.getView === 'function' && typeof o.addLayer === 'function') return 'openlayers';
            if (typeof o.addSource === 'function' && typeof o.addLayer === 'function' && typeof o.getCanvas === 'function') return 'mapbox';
            if (o.map && typeof o.map.addLayer === 'function') return 'wialon';
        } catch (_) { /* noop */ }
        return null;
    }
    // Busca una instancia de mapa: nombres tipicos, globals conocidos y, si no,
    // un escaneo superficial del objeto global de la pagina.
    function rxMapaCandidatos() {
        const out = [];
        const vistos = new Set();
        const probar = (nombre, obj) => {
            if (!obj || typeof obj !== 'object' || vistos.has(obj)) return;
            const motor = rxMapaClasificar(obj);
            if (motor) { vistos.add(obj); out.push({ nombre: nombre, motor: motor, obj: obj }); }
        };
        // Globals conocidos (Wialon WebGIS, Leaflet, OpenLayers, Mapbox).
        try { probar('webgis', PAGE.webgis); } catch (_) { /* noop */ }
        try { probar('map', PAGE.map); } catch (_) { /* noop */ }
        try { probar('mapa', PAGE.mapa); } catch (_) { /* noop */ }
        try { probar('leafletMap', PAGE.leafletMap); } catch (_) { /* noop */ }
        try { probar('wialonMap', PAGE.wialonMap); } catch (_) { /* noop */ }
        try { probar('gmap', PAGE.gmap); } catch (_) { /* noop */ }
        try { probar('_map', PAGE._map); } catch (_) { /* noop */ }
        try { if (PAGE.webgis && PAGE.webgis.map) probar('webgis.map', PAGE.webgis.map); } catch (_) { /* noop */ }
        try { if (PAGE.L && PAGE.L.Map && PAGE.L.Map._instances) Object.keys(PAGE.L.Map._instances).forEach((k) => probar('L.Map#' + k, PAGE.L.Map._instances[k])); } catch (_) { /* noop */ }
        // Escaneo superficial.
        try {
            let n = 0;
            for (const k in PAGE) {
                if (n > 4000 || out.length > 3) break;
                n++;
                let v = null;
                try { v = PAGE[k]; } catch (_) { continue; }
                probar(k, v);
            }
        } catch (_) { /* noop */ }
        // Prefiere motores que sepamos dibujar.
        const orden = { leaflet: 0, mapbox: 1, openlayers: 2, wialon: 3 };
        out.sort((a, b) => (orden[a.motor] || 9) - (orden[b.motor] || 9));
        return out;
    }
    function rxMapaDiagnostico() {
        const c = rxMapaCandidatos();
        try {
            console.log('[Rondo] mapas detectados:', c.map((x) => x.nombre + ' (' + x.motor + ')'));
            console.log('[Rondo] L:', !!PAGE.L, 'ol:', !!PAGE.ol, 'mapboxgl:', !!PAGE.mapboxgl, 'webgis:', !!PAGE.webgis);
        } catch (_) { /* noop */ }
        advice(c.length ? 'Mapa detectado' : 'Mapa no detectado',
            c.length ? (c[0].nombre + ' \u00b7 ' + c[0].motor) : 'Revisa la consola (F12) para mas detalle.');
        return c;
    }
    function rxMapaQuitar() {
        try {
            if (_rxMapaLayer) {
                if (_rxMapaMotor === 'leaflet' && typeof _rxMapaLayer.remove === 'function') _rxMapaLayer.remove();
                else if (_rxMapaMotor === 'openlayers' && _rxMapaInst && typeof _rxMapaInst.removeLayer === 'function') _rxMapaInst.removeLayer(_rxMapaLayer);
                else if (_rxMapaMotor === 'mapbox' && _rxMapaInst) {
                    if (_rxMapaInst.getLayer('rondo-ruta-line')) _rxMapaInst.removeLayer('rondo-ruta-line');
                    if (_rxMapaInst.getLayer('rondo-ruta-pts')) _rxMapaInst.removeLayer('rondo-ruta-pts');
                    if (_rxMapaInst.getSource('rondo-ruta')) _rxMapaInst.removeSource('rondo-ruta');
                }
            }
        } catch (_) { /* noop */ }
        _rxMapaLayer = null; _rxMapaMotor = null; _rxMapaInst = null; _rxMapaClave = null;
    }
    function rxMapaRutaActiva() { return !!_rxMapaLayer; }

    function rxMapaDibujarLeaflet(map, L, r, fit) {
        const grp = L.layerGroup();
        const pts = r.coords.map((c) => [c[1], c[0]]);
        L.polyline(pts, { color: '#850D22', weight: 4, opacity: 0.9 }).addTo(grp);
        if (r.origen) L.circleMarker([r.origen.lat, r.origen.lon], { radius: 6, color: '#2e7d32', fillColor: '#2e7d32', fillOpacity: 1 }).bindTooltip('Origen').addTo(grp);
        (r.paradas || []).forEach((p, i) => {
            if (!p.coords) return;
            L.circleMarker([p.coords.lat, p.coords.lon], { radius: 5, color: '#1565c0', fillColor: '#1565c0', fillOpacity: 1 })
                .bindTooltip((i + 1) + '. ' + (p.texto || '')).addTo(grp);
        });
        if (r.destino) L.circleMarker([r.destino.lat, r.destino.lon], { radius: 6, color: '#b71c1c', fillColor: '#b71c1c', fillOpacity: 1 }).bindTooltip('Destino').addTo(grp);
        grp.addTo(map);
        if (fit !== false) { try { map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] }); } catch (_) { /* noop */ } }
        return grp;
    }
    function rxMapaDibujarMapbox(map, r) {
        const src = { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: r.coords } } };
        if (map.getSource('rondo-ruta')) map.removeSource('rondo-ruta');
        map.addSource('rondo-ruta', src);
        map.addLayer({ id: 'rondo-ruta-line', type: 'line', source: 'rondo-ruta', paint: { 'line-color': '#850D22', 'line-width': 4, 'line-opacity': 0.9 } });
        const feat = (r.paradas || []).filter((p) => p.coords).map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.coords.lon, p.coords.lat] } }));
        feat.unshift({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [r.origen.lon, r.origen.lat] } });
        map.addSource('rondo-ruta-pts', { type: 'geojson', data: { type: 'FeatureCollection', features: feat } });
        map.addLayer({ id: 'rondo-ruta-pts', type: 'circle', source: 'rondo-ruta-pts', paint: { 'circle-radius': 5, 'circle-color': '#1565c0' } });
        try {
            const xs = r.coords.map((c) => c[0]), ys = r.coords.map((c) => c[1]);
            map.fitBounds([[Math.min.apply(null, xs), Math.min.apply(null, ys)], [Math.max.apply(null, xs), Math.max.apply(null, ys)]], { padding: 40 });
        } catch (_) { /* noop */ }
        return true;
    }
    function rxMapaDibujarOL(map, ol, r) {
        const geom = new ol.geom.LineString(r.coords);
        if (ol.proj && ol.proj.fromLonLat) geom.transform('EPSG:4326', 'EPSG:3857');
        const features = [new ol.Feature({ geometry: geom })];
        (r.paradas || []).forEach((p) => {
            if (!p.coords) return;
            const g = new ol.geom.Point([p.coords.lon, p.coords.lat]);
            if (ol.proj && ol.proj.fromLonLat) g.transform('EPSG:4326', 'EPSG:3857');
            features.push(new ol.Feature({ geometry: g }));
        });
        const source = new ol.source.Vector({ features: features });
        const layer = new ol.layer.Vector({ source: source, style: new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#850D22', width: 4 }), image: new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: '#1565c0' }) }) }) });
        map.addLayer(layer);
        try {
            const ext = source.getExtent();
            if (ext && map.getView) map.getView().fit(ext, { padding: [30, 30, 30, 30] });
        } catch (_) { /* noop */ }
        return layer;
    }

    function rxMapaDibujarRuta(eco) {
        const it = unitByEco(eco);
        const r = it ? rutaDe(it.info) : (APP.rutas[eco] || null);
        if (!r || !r.coords || r.coords.length < 2) { adviceWarn('Sin ruta', 'No hay una ruta trazada para ' + eco + '.'); return false; }
        const clave = (it && it.info.clave) || eco;
        if (_rxMapaLayer && _rxMapaClave === clave) { rxMapaQuitar(); advice('Ruta quitada del mapa', eco); if (APP.tab === 'rutas') paintRutas(); return true; }
        const cands = rxMapaCandidatos();
        if (!cands.length) {
            adviceWarn('Mapa no detectado', 'Usa "Google Maps" o exporta el GeoJSON. Abre la consola (F12) y pulsa el boton del mapa para diagnosticar.');
            try { console.log('[Rondo] sin mapa detectado. L=', !!PAGE.L, 'ol=', !!PAGE.ol, 'mapboxgl=', !!PAGE.mapboxgl, 'webgis=', !!PAGE.webgis); } catch (_) { /* noop */ }
            return false;
        }
        const c = cands[0];
        rxMapaQuitar();
        try {
            if (c.motor === 'leaflet') {
                const L = PAGE.L;
                _rxMapaLayer = rxMapaDibujarLeaflet(c.obj, L, r);
                _rxMapaMotor = 'leaflet'; _rxMapaInst = c.obj;
            } else if (c.motor === 'mapbox') {
                rxMapaDibujarMapbox(c.obj, r);
                _rxMapaLayer = true; _rxMapaMotor = 'mapbox'; _rxMapaInst = c.obj;
            } else if (c.motor === 'openlayers') {
                _rxMapaLayer = rxMapaDibujarOL(c.obj, PAGE.ol, r);
                _rxMapaMotor = 'openlayers'; _rxMapaInst = c.obj;
            } else {
                adviceWarn('Motor no soportado', 'Mapa "' + c.nombre + '". Exporta el GeoJSON.');
                return false;
            }
            _rxMapaClave = clave;
            adviceOk('Ruta dibujada en el mapa', eco + ' \u00b7 ' + Math.round((r.total || 0) / 1000) + ' km');
            if (APP.tab === 'rutas') paintRutas();
            return true;
        } catch (e) {
            adviceErr('No se pudo dibujar', (e && e.message) || '');
            return false;
        }
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

    // ---- Rutas dibujadas en las ventanas de cada vehiculo (v6.0.8) ----
    // Cada ventana de unidad tiene su propio mapa; si el motor es Leaflet se
    // detecta el mapa dentro de cada ventana y se dibuja la ruta de esa unidad.
    let _rxWinsOn = false;
    const _rxWinsLayers = new Map(); // eco -> capa Leaflet
    function rxMapaVentanasOn() { return _rxWinsOn; }
    function rxMapaVentanasQuitar() {
        _rxWinsLayers.forEach((layer) => { try { layer.remove(); } catch (_) { /* noop */ } });
        _rxWinsLayers.clear();
    }
    function rxMapaVentanasSync() {
        if (!_rxWinsOn) return;
        if (typeof openWindows !== 'function') return;
        const L = PAGE && PAGE.L;
        if (!L) return;
        const mapas = rxMapaCandidatos().filter((c) => c.motor === 'leaflet').map((c) => c.obj);
        if (!mapas.length) return;
        const wins = openWindows();
        const activos = new Set();
        for (let i = 0; i < wins.length; i++) {
            const eco = wins[i].eco;
            const cont = wins[i].cont;
            if (!eco || !cont) continue;
            const it = unitByEco(eco);
            const r = it ? rutaDe(it.info) : null;
            if (!r || !r.coords || r.coords.length < 2) continue;
            activos.add(eco);
            if (_rxWinsLayers.has(eco)) continue;
            let map = null;
            for (let k = 0; k < mapas.length; k++) {
                const c = mapas[k] && mapas[k]._container;
                if (c && cont.contains(c)) { map = mapas[k]; break; }
            }
            if (!map) continue;
            try { _rxWinsLayers.set(eco, rxMapaDibujarLeaflet(map, L, r, false)); } catch (_) { /* noop */ }
        }
        _rxWinsLayers.forEach((layer, eco) => {
            if (activos.has(eco)) return;
            try { layer.remove(); } catch (_) { /* noop */ }
            _rxWinsLayers.delete(eco);
        });
    }
    function rxMapaVentanasToggle() {
        _rxWinsOn = !_rxWinsOn;
        if (_rxWinsOn) {
            rxMapaVentanasSync();
            adviceOk('Rutas en ventanas', 'Dibujando la ruta en el mapa de cada ventana abierta.');
        } else {
            rxMapaVentanasQuitar();
            advice('Rutas en ventanas', 'Se dejo de dibujar en las ventanas.');
        }
        if (APP.tab === 'rutas') paintRutas();
    }
