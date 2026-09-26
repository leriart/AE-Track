    /* ====================== GEOCERCAS: ANALISIS Y EXPORT (v5.15) ====================== */
    function zonaRol(z) {
        const n = (z && z.n) || '';
        if (isBase(n)) return 'base';
        if (esZonaCarga(n)) return 'carga';
        return 'normal';
    }
    function _zonaPuntos(z) {
        let p = z && z.p;
        if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) { p = null; } }
        return Array.isArray(p) ? p : null;
    }
    function _zonaRadio(z) {
        const r = (z && (z.w != null ? z.w : z.r));
        const n = +r;
        return Number.isFinite(n) && n > 0 ? n : 0;
    }
    function _zonaEsCirculo(z, pts) {
        if (!z) return false;
        if (z.t === 3) return true;
        const minimoPts = (z.t === 1) ? 2 : 3;
        if (Array.isArray(pts) && pts.length >= minimoPts) return false;
        const b = z.b;
        return !!(b && b.cen_x != null && b.cen_y != null && _zonaRadio(z) > 0);
    }
    function zonaAreaM2(z) {
        if (!z) return 0;
        const pts = _zonaPuntos(z);
        const c = centroDeZona(z) || { lat: 0, lon: 0 };
        const mx = 111320 * Math.cos(rad(c.lat)), my = 110540;
        if (_zonaEsCirculo(z, pts)) {
            const r = _zonaRadio(z);
            return Math.PI * r * r;
        }
        const xy = (a) => {
            const la = (a && a.y != null) ? +a.y : (Array.isArray(a) ? +a[1] : null);
            const lo = (a && a.x != null) ? +a.x : (Array.isArray(a) ? +a[0] : null);
            return (la == null || lo == null || isNaN(la) || isNaN(lo)) ? null : [lo * mx, la * my];
        };
        if (Array.isArray(pts) && pts.length >= 2) {
            // Linea (t=1) o polilinea de 2 puntos: longitud x ancho.
            if (z.t === 1 || (z.t !== 2 && pts.length === 2)) {
                let len = 0;
                for (let i = 1; i < pts.length; i++) {
                    const a = xy(pts[i - 1]), b2 = xy(pts[i]);
                    if (!a || !b2) continue;
                    len += Math.hypot(b2[0] - a[0], b2[1] - a[1]);
                }
                let ancho = _zonaRadio(z);
                if (!ancho) {
                    ancho = pts.reduce((m, a) => Math.max(m, +(a && a.r) || 0), 0);
                }
                return len * ancho * 2; // el radio/medio-ancho se cuenta a ambos lados
            }
            // Poligono: formula del area (shoelace) en metros.
            if (pts.length >= 3) {
                let a2 = 0;
                let prev = xy(pts[pts.length - 1]);
                for (let i = 0; i < pts.length; i++) {
                    const cur = xy(pts[i]);
                    if (!cur || !prev) { prev = cur; continue; }
                    a2 += prev[0] * cur[1] - cur[0] * prev[1];
                    prev = cur;
                }
                return Math.abs(a2 / 2);
            }
        }
        if (z.b && z.b.min_x != null && z.b.max_x != null && z.b.min_y != null && z.b.max_y != null) {
            const w = (z.b.max_x - z.b.min_x) * mx, h = (z.b.max_y - z.b.min_y) * my;
            return Math.abs(w * h);
        }
        return 0;
    }
    function zonaGeometry(z) {
        const pts = _zonaPuntos(z);
        const c = centroDeZona(z);
        if (_zonaEsCirculo(z, pts)) return c ? { type: 'Point', coordinates: [c.lon, c.lat] } : null;
        if (Array.isArray(pts) && pts.length >= 3) {
            // Descarta puntos sin coordenadas validas: un GeoJSON con NaN es
            // invalido y algunos visores lo rechazan entero.
            const ring = pts.map((a) => {
                const la = (a && a.y != null) ? +a.y : (Array.isArray(a) ? +a[1] : NaN);
                const lo = (a && a.x != null) ? +a.x : (Array.isArray(a) ? +a[0] : NaN);
                return [lo, la];
            }).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
            if (ring.length >= 3) {
                if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]);
                return { type: 'Polygon', coordinates: [ring] };
            }
        }
        if (z.b && z.b.min_x != null && z.b.max_x != null && z.b.min_y != null && z.b.max_y != null) {
            const ring = [
                [z.b.min_x, z.b.min_y], [z.b.max_x, z.b.min_y], [z.b.max_x, z.b.max_y],
                [z.b.min_x, z.b.max_y], [z.b.min_x, z.b.min_y]
            ];
            return { type: 'Polygon', coordinates: [ring] };
        }
        return c ? { type: 'Point', coordinates: [c.lon, c.lat] } : null;
    }
    function zonasStats(unidades) {
        const zonas = APP.zonas || [];
        let ocupadas = 0, base = 0, carga = 0, areaM2 = 0;
        for (let i = 0; i < zonas.length; i++) {
            const z = zonas[i];
            const rol = zonaRol(z);
            if (rol === 'base') base++;
            else if (rol === 'carga') carga++;
            areaM2 += zonaAreaM2(z);
            let occ = false;
            for (let k = 0; k < unidades.length; k++) {
                const u = unidades[k];
                if (u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z)) { occ = true; break; }
            }
            if (occ) ocupadas++;
        }
        return { total: zonas.length, ocupadas, base, carga, areaM2 };
    }
    function geocercasSubsetVisible() {
        // Devuelve las geocercas segun el filtro/rol actuales (para export).
        const f = (APP.geoFiltro || '').toLowerCase();
        const rol = APP.geoRol || 'todas';
        const unidades = (APP.unidades || []).filter(shouldWatch).map((u) => ({ st: unitState(u), info: parseUnitName(u) }));
        return (APP.zonas || []).filter((z) => {
            const r = zonaRol(z);
            if (rol !== 'todas' && rol !== r && !(rol === 'ocupadas' && unidades.some((u) => u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z)))) return false;
            if (f) {
                const ecos = unidades.filter((u) => u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z)).map((u) => u.info.eco);
                if (!((z.n || '').toLowerCase().indexOf(f) >= 0 || ecos.some((e) => (e || '').toLowerCase().indexOf(f) >= 0))) return false;
            }
            return true;
        });
    }
    function exportarGeocercasCSV() {
        const items = geocercasSubsetVisible();
        if (!items.length) { adviceWarn('Sin geocercas', 'Nada que exportar con los filtros actuales'); return; }
        const unidades = (APP.unidades || []).filter(shouldWatch).map((u) => ({ st: unitState(u), info: parseUnitName(u) }));
        const filas = [['nombre', 'rol', 'area_km2', 'lat', 'lon', 'unidades']];
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            const c = centroDeZona(z) || {};
            const ecos = unidades.filter((u) => u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z)).map((u) => u.info.eco);
            filas.push([z.n || ('Zona ' + z.id), zonaRol(z), (zonaAreaM2(z) / 1e6).toFixed(3),
                c.lat == null ? '' : c.lat, c.lon == null ? '' : c.lon, ecos.join(' ')]);
        }
        const csv = filas.map((r) => r.map(rxCsvCelda).join(',')).join('\n');
        const a = makeEl('a', { href: URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })) });
        a.download = 'rondo_geocercas_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        adviceOk('Geocercas exportadas', items.length + ' zonas');
    }
    function exportarGeocercasGeoJSON() {
        const items = geocercasSubsetVisible();
        if (!items.length) { adviceWarn('Sin geocercas', 'Nada que exportar con los filtros actuales'); return; }
        const unidades = (APP.unidades || []).filter(shouldWatch).map((u) => ({ st: unitState(u), info: parseUnitName(u) }));
        const features = items.map((z) => {
            const ecos = unidades.filter((u) => u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z)).map((u) => u.info.eco);
            const geom = zonaGeometry(z);
            return {
                type: 'Feature',
                properties: { nombre: z.n || ('Zona ' + z.id), rol: zonaRol(z), area_km2: +(zonaAreaM2(z) / 1e6).toFixed(3), unidades: ecos },
                geometry: geom || { type: 'Point', coordinates: [0, 0] }
            };
        });
        descargarJSON({ type: 'FeatureCollection', features }, 'rondo_geocercas_' + new Date().toISOString().slice(0, 10) + '.geojson');
        adviceOk('Geocercas exportadas', items.length + ' zonas');
    }
    // Anade una geocerca como parada del plan de una unidad vigilada.
    function elegirUnidadParaGeocerca(z) {
        if (!z) return;
        const vigiladas = (APP.unidades || []).filter(shouldWatch).map((u) => parseUnitName(u)).filter((i) => i.eco || i.clave);
        if (!vigiladas.length) {
            adviceWarn('Sin unidades vigiladas', 'Vigila una unidad para asignarle paradas. Puedes hacerlo en Automatizar Unidades.');
            return;
        }
        let elegido = vigiladas[0].eco || vigiladas[0].clave;
        const opciones = vigiladas.map((i) => {
            const eco = i.eco || i.clave;
            return '<option value="' + esc(eco) + '">' + esc(eco) + (i.placa ? ' \u00b7 ' + esc(i.placa) : '') + '</option>';
        }).join('');
        abrirDialogo({
            icon: UIS.route,
            titulo: 'Usar geocerca como parada',
            okText: 'Anadir',
            html: '<p>Anade <b>' + esc(z.n || ('Zona ' + z.id)) + '</b> como parada del plan de:</p>' +
                '<select id="rondo-geo-unit" class="filtro" style="width:100%">' + opciones + '</select>',
            onOpen: (el) => {
                const sel = el.querySelector('#rondo-geo-unit');
                if (sel) { elegido = sel.value; sel.addEventListener('change', () => { elegido = sel.value; }); }
            },
            onOk: () => {
                const eco = elegido;
                const it = unitByEco(eco);
                const clave = it ? it.info.clave : eco;
                const plan = (it ? planDe(it.info) : null) || { modo: 'secuencial', circuito: false, paradas: [] };
                plan.paradas = (plan.paradas || []).concat([nuevaParada('geocerca', z.n || ('Zona ' + z.id), centroDeZona(z))]);
                APP.planes[clave] = plan;
                APP.watchMap[eco] = planATexto(plan);
                if (APP.orden.indexOf(eco) < 0) APP.orden.push(eco);
                guardarPlanes(); guardarLista(); guardarOrden();
                adviceOk('Parada anadida', (z.n || '') + ' \u2192 ' + eco);
                if (APP.config.autoRuta) planearRuta(eco, plan, null, (APP.config.autoRutaModo === 'astar' && APP.config.overpass) ? 'astar' : 'osrm');
            }
        });
    }

    function paintGeocercas() {
        const body = byId('rondo-body-zonas');
        const countEl = byId('rondo-geo-count');
        const zonas = APP.zonas || [];
        const total = zonas.length;
        if (countEl) countEl.textContent = total;
        const unidades = (APP.unidades || []).filter(shouldWatch).map((u) => ({ st: unitState(u), info: parseUnitName(u) }));
        const stats = zonasStats(unidades);
        const setK = (id, v) => { const e = byId(id); if (e) e.textContent = v; };
        setK('rondo-geo-kpi-total', stats.total);
        setK('rondo-geo-kpi-ocupadas', stats.ocupadas);
        setK('rondo-geo-kpi-base', stats.base);
        setK('rondo-geo-kpi-carga', stats.carga);
        if (!body) return;
        if (!APP.config.loadZones || !total) {
            let hint = 'Activa <b>Cargar geocercas</b> en Ajustes &gt; General para verlas.';
            if (APP.config.loadZones) {
                hint = 'No se encontraron geocercas. Usa <b>Recargar</b> o revisa que tu usuario tenga geocercas en la plataforma.';
                const d = APP.zonasDiag;
                if (d) {
                    hint += '<br><span style="font-size:10px;color:var(--rondo-fg-mute)">'
                        + 'Recursos: ' + (d.recursos || 0)
                        + (d.claves && d.claves.length ? ' \u00b7 claves: ' + esc(d.claves.join(', ')) : '')
                        + (d.error ? ' \u00b7 ' + esc(d.error) : '')
                        + '</span>';
                }
            }
            const accion = !APP.config.loadZones
                ? '<button class="mini rondo-vacio-acc" data-acc="ajustes"><span class="rondo-usym">' + UIS.gear + '</span> Abrir Ajustes</button>'
                : '<button class="mini" id="rondo-geo-vacio-recargar"><span class="rondo-usym">' + UIS.refresh + '</span> Recargar</button>';
            setHtml(body, '<div class="rondo-geo-empty">' + emptyState(UIS.map, 'Sin geocercas cargadas', hint, accion) + '</div>');
            const b = byId('rondo-geo-vacio-recargar');
            if (b) b.addEventListener('click', () => recargarGeocercas());
            return;
        }
        const f = (APP.geoFiltro || '').toLowerCase();
        const rol = APP.geoRol || 'todas';
        let lista = zonas.map((z) => {
            const dentro = unidades.filter((u) => u.st.online && u.st.lat != null && inZone(u.st.lat, u.st.lon, z));
            const ecos = dentro.map((u) => u.info.eco).filter(Boolean);
            return { z: z, ecos: ecos, rol: zonaRol(z), area: zonaAreaM2(z) };
        });
        if (rol === 'base' || rol === 'carga') lista = lista.filter((x) => x.rol === rol);
        else if (rol === 'ocupadas') lista = lista.filter((x) => x.ecos.length);
        if (f) {
            lista = lista.filter((x) => ((x.z.n || '').toLowerCase().indexOf(f) >= 0) || x.ecos.some((e) => (e || '').toLowerCase().indexOf(f) >= 0));
        }
        const orden = APP.geoOrden || 'nombre';
        lista.sort((a, b) => {
            if (orden === 'unidades') return b.ecos.length - a.ecos.length || (a.z.n || '').localeCompare(b.z.n || '', 'es');
            if (orden === 'area') return b.area - a.area;
            return (a.z.n || '').localeCompare(b.z.n || '', 'es');
        });
        const cards = lista.map((x) => {
            const z = x.z;
            const rolTxt = x.rol === 'base' ? 'Base' : (x.rol === 'carga' ? 'Carga' : 'Normal');
            const areaTxt = x.area ? fmtArea(x.area / 1e6) : '';
            return '<div class="rondo-geo-card' + (x.ecos.length ? ' ocupada' : '') + ' rol-' + x.rol + '" data-zona="' + esc(z.n || '') + '" title="' + esc(z.n || '') + '">' +
                '<span class="rondo-geo-dot"></span>' +
                '<div class="rondo-geo-body">' +
                '<b class="rondo-geo-name">' + esc(z.n || ('Zona ' + z.id)) + '</b>' +
                '<span class="rondo-geo-inside">' +
                (x.ecos.length
                    ? esc(x.ecos.slice(0, 8).join(' \u00b7 ')) + (x.ecos.length > 8 ? ' +' + (x.ecos.length - 8) : '')
                    : 'sin unidades dentro') +
                '</span>' +
                '</div>' +
                '<span class="rondo-geo-role">' + rolTxt + (areaTxt ? ' \u00b7 ' + areaTxt : '') + '</span>' +
                '<span class="rondo-geo-acc">' +
                '<button class="mini rondo-geo-usar" data-zona="' + esc(z.n || '') + '" title="Anadir como parada a una unidad"><span class="rondo-usym">' + UIS.route + '</span></button>' +
                '<button class="mini rondo-geo-copy" data-zona="' + esc(z.n || '') + '" title="Copiar nombre y centro"><span class="rondo-usym">' + UIS.copy + '</span></button>' +
                '</span>' +
                '<span class="rondo-geo-badge">' + x.ecos.length + '</span>' +
                '</div>';
        });
        setHtml(body, cards.join('') || '<div class="rondo-geo-empty">' + emptyState(UIS.filter, LANG.sinCoin,
            'Ninguna geocerca coincide con los filtros actuales.') + '</div>');
    }
    // Muestra el panel de la pestana Zonas segun el segmentado (geocercas|riesgo).
    function aplicarZonasVista() {
        const v = (APP.zonasVista === 'riesgo') ? 'riesgo' : 'geocercas';
        const g = byId('rondo-zpane-geocercas');
        const r = byId('rondo-zpane-riesgo');
        if (g) g.style.display = (v === 'geocercas') ? '' : 'none';
        if (r) r.style.display = (v === 'riesgo') ? '' : 'none';
        document.querySelectorAll('#rondo-zonas-seg .rondo-zseg').forEach((b) => {
            b.classList.toggle('activo', b.dataset.ztab === v);
        });
    }
    // Vuelve a consultar las geocercas de la plataforma y repinta la pestaña.
    async function recargarGeocercas() {
        try {
            APP.config.loadZones = true;
            APP.zonas = await fetchZones();
            paintGeocercas();
            if (APP.tab === 'zonas') paintRiesgo();
            if (APP.zonas.length) adviceOk('Geocercas recargadas', APP.zonas.length + ' geocercas');
            else adviceWarn('Sin geocercas', 'La plataforma no devolvio geocercas. Revisa que tu usuario las tenga.');
        } catch (e) {
            adviceErr('No se pudieron cargar', (e && e.message) || 'error');
        }
    }
    function paintViajes() {
        const cont = byId('rondo-lista-viajes');
        if (!cont) return;
        const ecos = Object.keys(APP.viajes || {});
        if (!ecos.length) {
            setHtml(cont, emptyState(UIS.clock, 'Sin viajes analizados',
                'Clic derecho en una unidad &gt; <b>Analizar viaje</b> para detectar el punto de partida (parada de mas de '
                + (APP.config.partidaHoras || 6) + ' h), el trayecto, las paradas y la carga.'));
            return;
        }
        setHtml(cont, ecos.map((eco) => {
            const v = APP.viajes[eco];
            const flags = [];
            if (v.cargo) flags.push('carga');
            if (v.paradas.length) flags.push(v.paradas.length + ' parada(s)');
            if (v.llego) flags.push('llego a destino');
            if (v.regreso) flags.push('en regreso');
            const color = v.regreso ? 'var(--rondo-warn-fg)' : (v.llego ? 'var(--rondo-ok-fg)' : 'var(--rondo-accent-2)');
            return '<div class="alerta" style="border-left:4px solid ' + color + '">' +
                '<span class="ico rondo-usym" style="color:' + color + '">' + UIS.clock + '</span>' +
                '<div class="cuerpo"><b>' + esc(eco) + ' · VIAJE</b>' +
                '<span>Partida ' + new Date(v.partida.t * 1000).toLocaleString().slice(0, 16) + (v.zonaPartida ? ' · ' + esc(v.zonaPartida) : '') + '</span>' +
                '<div class="meta">' +
                '<span class="regla">' + v.distanciaKm + ' km</span>' +
                '<span>' + v.puntos + ' puntos</span>' +
                (v.salida ? '<span>salida ' + new Date(v.salida * 1000).toLocaleTimeString().slice(0, 5) + '</span>' : '') +
                (flags.length ? '<span>' + esc(flags.join(' · ')) + '</span>' : '') +
                '<span>' + new Date(v.analizado).toLocaleTimeString().slice(0, 5) + '</span>' +
                '</div></div>' +
                '<button class="mini rondo-viaje-geo" data-eco="' + esc(eco) + '" title="Exportar viaje GeoJSON"><span class="rondo-usym">' + UIS.export + '</span></button>' +
                '<button class="mini rondo-viaje-re" data-eco="' + esc(eco) + '" title="Reanalizar viaje"><span class="rondo-usym">' + UIS.refresh + '</span></button>' +
                '</div>';
        }).join(''));
    }
    // v6.0.7: formato legible de distancias y duraciones para la tarjeta de rutas.
    function rxFmtDist(m) {
        if (!isFinite(m)) return '-';
        if (m < 1000) return Math.round(m) + ' m';
        const km = m / 1000;
        return (km >= 100 ? Math.round(km) : Math.round(km * 10) / 10).toLocaleString('es-MX') + ' km';
    }
    function rxFmtDur(seg) {
        const min = Math.round((seg || 0) / 60);
        if (min < 60) return min + ' min';
        return Math.floor(min / 60) + ' h ' + (min % 60) + ' min';
    }
    function paintRutas() {
        paintViajes();
        const cont = byId('rondo-lista-rutas');
        if (!cont) return;
        const watched = (APP.unidades || []).filter(shouldWatch).map((u) => ({ info: parseUnitName(u), st: unitState(u) }));
        const filas = watched.filter((x) => rutaDe(x.info));
        const pendientes = watched.filter((x) => !rutaDe(x.info) && !!watchDest(x.info));
        const sinUnidad = Object.keys(APP.rutas || {}).filter((eco) => !watched.some((x) => x.info.clave === eco || x.info.eco === eco));
        const pendEl = byId('rondo-rutas-pend');
        if (pendEl) pendEl.textContent = pendientes.length ? (pendientes.length + ' sin trazar') : '';
        if (!filas.length && !sinUnidad.length && !pendientes.length) {
            setHtml(cont, emptyState(UIS.route, 'Sin rutas planificadas',
                'Haz <b>clic derecho</b> en una unidad de la pestaña Unidades y elige <b>Planear ruta (OSRM)</b> o <b>(A*)</b>. Aquí verás el progreso, la distancia y los desvíos.',
                '<button class="mini rondo-vacio-acc" data-acc="tab-unidades"><span class="rondo-usym">' + UIS.panel + '</span> Ir a Unidades</button>'));
            return;
        }
        const tarjeta = (info, st) => {
            const eco = info.clave;
            const r = rutaDe(info);
            const er = estadoRuta(info, st);
            const s = er.snap || null;
            const llego = !!er.llego, desviado = !!er.desviado;
            const est = !s ? 'SIN POSICION' : (llego ? 'LLEGO' : (desviado ? 'DESVIADO' : 'EN RUTA'));
            const estClase = llego ? 'ok' : (desviado ? 'desv' : (s ? 'ruta' : 'sin'));
            const dest = r.destinoTexto || (r.destino.lat.toFixed(4) + ',' + r.destino.lon.toFixed(4));
            const etaSeg = s ? calcularETA(s, r, st.vel) : null;
            const pct = s ? Math.round(s.progreso * 100) : 0;
            const totalP = er.totalParadas || (r.paradas ? r.paradas.length : 0);
            const chips = [];
            if (s) chips.push('progreso ' + pct + '%');
            if (totalP > 1) chips.push('parada ' + Math.min(totalP, (er.llegadas || 0) + (llego ? 0 : 1)) + '/' + totalP);
            if (s) chips.push('a ' + rxFmtDist(s.dist) + ' del trazado');
            if (etaSeg != null) chips.push('ETA ' + rxFmtDur(etaSeg));
            if (r.duracion) chips.push(esc(r.modo || '') + ' ' + rxFmtDur(r.duracion));
            if (!llego && er.parada) chips.push('siguiente: ' + esc(er.parada.texto || ''));
            chips.push(new Date(r.creada).toLocaleString().slice(0, 16));
            return '<div class="rondo-ruta-card est-' + estClase + '">' +
                '<div class="rr-head">' +
                '<span class="rr-eco">' + esc(eco || info.nombre) + '</span>' +
                '<span class="rr-est rr-est-' + estClase + '">' + esc(est) + '</span>' +
                '<span class="rr-km">' + rxFmtDist(r.total) + '</span>' +
                '<span class="rr-modo">' + esc(r.optimo ? 'mejor ruta' : 'secuencial') + ' \u00b7 ' + esc(r.modo || '') + '</span>' +
                '<span class="rr-actions">' +
                '<button class="mini rondo-plan-edit" data-eco="' + esc(eco) + '" title="Editar paradas del plan"><span class="rondo-usym">' + UIS.watch + '</span></button>' +
                '<button class="mini rondo-ruta-mapa" data-eco="' + esc(eco) + '" title="Ver la ruta en el mini-mapa"><span class="rondo-usym">' + UIS.map + '</span></button>' +
                '<button class="mini rondo-ruta-gmaps" data-eco="' + esc(eco) + '" title="Abrir la ruta en Google Maps (con paradas)"><span class="rondo-usym">' + UIS.pin + '</span></button>' +
                '<button class="mini rondo-ruta-geo" data-eco="' + esc(eco) + '" title="Exportar ruta GeoJSON"><span class="rondo-usym">' + UIS.export + '</span></button>' +
                '<button class="mini rondo-traza-geo" data-eco="' + esc(eco) + '" title="Exportar traza GeoJSON"><span class="rondo-usym">' + UIS.csv + '</span></button>' +
                '<button class="mini rondo-ruta-calc" data-eco="' + esc(eco) + '" title="Recalcular"><span class="rondo-usym">' + UIS.refresh + '</span></button>' +
                '<button class="mini rondo-ruta-del" data-eco="' + esc(eco) + '" title="Eliminar ruta"><span class="rondo-usym">' + UIS.close + '</span></button>' +
                '</span>' +
                '</div>' +
                '<div class="rr-dest" title="' + esc(dest) + '">' + esc(dest) + '</div>' +
                (totalP > 1 || s ? '<div class="rr-progress"><div class="rr-progress-fill" style="width:' + pct + '%"></div></div>' : '') +
                '<div class="rr-meta">' + chips.map((c) => '<span class="rr-chip">' + c + '</span>').join('') + '</div>' +
                '</div>';
        };
        let html = pendientes.map((x) => {
            const eco = x.info.clave;
            const dest = watchDest(x.info);
            const intentos = (APP.rutaIntentos && APP.rutaIntentos[eco]) || 0;
            return '<div class="rondo-ruta-card est-pend">' +
                '<div class="rr-head">' +
                '<span class="rr-eco">' + esc(eco) + '</span>' +
                '<span class="rr-est rr-est-pend">SIN TRAZAR</span>' +
                '<span class="rr-actions">' +
                '<button class="mini rondo-plan-edit" data-eco="' + esc(eco) + '" title="Editar paradas"><span class="rondo-usym">' + UIS.watch + '</span></button>' +
                '<button class="mini rondo-ruta-trazar" data-eco="' + esc(eco) + '" title="Trazar ahora"><span class="rondo-usym">' + UIS.refresh + '</span></button>' +
                '</span>' +
                '</div>' +
                '<div class="rr-dest" title="' + esc(dest) + '">' + esc(dest) + '</div>' +
                '<div class="rr-meta">' +
                '<span class="rr-chip">pendiente</span>' +
                (intentos ? '<span class="rr-chip">' + intentos + ' intento(s)</span>' : '') +
                (intentos >= 2 ? '<span class="rr-chip">usa Trazar pendientes</span>' : '') +
                '</div>' +
                '</div>';
        }).join('');
        html += filas.map((x) => tarjeta(x.info, x.st)).join('');
        sinUnidad.forEach((eco) => {
            const r = APP.rutas[eco];
            if (!r) return;
            html += '<div class="rondo-ruta-card est-sin" style="opacity:.75">' +
                '<div class="rr-head">' +
                '<span class="rr-eco">' + esc(eco) + '</span>' +
                '<span class="rr-est rr-est-sin">FUERA DE VIGILANCIA</span>' +
                '<span class="rr-km">' + rxFmtDist(r.total) + '</span>' +
                '<span class="rr-actions"><button class="mini rondo-ruta-del" data-eco="' + esc(eco) + '" title="Eliminar ruta"><span class="rondo-usym">' + UIS.close + '</span></button></span>' +
                '</div>' +
                '<div class="rr-dest" title="' + esc(r.destinoTexto || '') + '">' + esc(r.destinoTexto || '') + '</div>' +
                '</div>';
        });
        setHtml(cont, html);
    }
    function paintPanel() { setTab(APP.tab); }

