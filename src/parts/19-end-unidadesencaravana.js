    /* === END: unidadesEnCaravana === */
    function descargarJSON(obj, nombre, tipo) {
        const a = makeEl('a', { href: URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: tipo || 'application/geo+json;charset=utf-8;' })) });
        a.download = nombre;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }
    function exportRutaGeoJSON(eco) {
        const it = unitByEco(eco);
        const r = it ? rutaDe(it.info) : null;
        if (!r) { adviceWarn('Sin ruta', eco); return; }
        const geojson = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: { tipo: 'ruta', eco, modo: r.modo, distancia_m: Math.round(r.total) }, geometry: { type: 'LineString', coordinates: r.coords } },
                { type: 'Feature', properties: { tipo: 'origen' }, geometry: { type: 'Point', coordinates: [r.origen.lon, r.origen.lat] } },
                { type: 'Feature', properties: { tipo: 'destino', texto: r.destinoTexto || '' }, geometry: { type: 'Point', coordinates: [r.destino.lon, r.destino.lat] } }
            ]
        };
        descargarJSON(geojson, 'rondo_ruta_' + eco + '_' + new Date().toISOString().slice(0, 10) + '.geojson');
        adviceOk('Ruta exportada', Math.round(r.total / 1000) + ' km');
    }
    function registrarTraza(info, st) {
        if (!APP.config.trazado || !st.online || st.lat == null) return;
        const k = info.eco || info.placa || String(info.id);
        if (!k) return;
        const arr = APP.trazas[k] || (APP.trazas[k] = []);
        const ult = arr[arr.length - 1];
        if (ult && haversine(ult.lat, ult.lon, st.lat, st.lon) < 20) return;
        arr.push({ t: st.t || Math.floor(Date.now() / 1000), lat: st.lat, lon: st.lon, v: Math.round(st.vel) });
        const max = Math.max(50, APP.config.trazadoMax || 500);
        if (arr.length > max) arr.splice(0, arr.length - max);
    }
    function trazaDe(info) {
        const k = info && (info.eco || info.placa || String(info.id));
        return (k && APP.trazas[k]) || [];
    }
    function exportTraza(eco) {
        const it = unitByEco(eco);
        const arr = it ? trazaDe(it.info) : [];
        if (!arr.length) { advice('Sin traza', 'Aun no hay puntos registrados'); return; }
        const geojson = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    eco, puntos: arr.length,
                    desde: new Date(arr[0].t * 1000).toISOString(),
                    hasta: new Date(arr[arr.length - 1].t * 1000).toISOString()
                },
                geometry: { type: 'LineString', coordinates: arr.map((p) => [p.lon, p.lat]) }
            }]
        };
        descargarJSON(geojson, 'rondo_traza_' + eco + '_' + new Date().toISOString().slice(0, 10) + '.geojson');
        adviceOk('Traza exportada', arr.length + ' puntos');
    }

