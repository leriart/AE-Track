    /* ====================== REPORTE PDF (v6.0.13) ======================
     * Genera un informe operativo completo y lo abre en el dialogo de
     * impresion del navegador para guardarlo como PDF. Sin dependencias:
     * se construye un documento HTML con CSS de impresion (A4, saltos de
     * pagina, encabezados de tabla repetidos) y se imprime desde un iframe.
     *
     * v6.11: cada fila lleva fecha y hora completas y coordenadas. El
     * reporte gana secciones, portada, indice y un resumen mas detallado.
     */
    // Fecha y hora legibles a partir de un timestamp en segundos o ms.
    function rxFechaHora(t, conSeg) {
        let n = Number(t);
        if (!isFinite(n) || n <= 0) return '-';
        if (n < 1e12) n *= 1000; // segundos -> ms
        const d = new Date(n);
        if (!isFinite(d.getTime())) return '-';
        const o = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        if (conSeg) o.second = '2-digit';
        try { return d.toLocaleString('es-MX', o); } catch (_) { return d.toLocaleString(); }
    }
    function rxFechaHoraCorta(t) {
        let n = Number(t);
        if (!isFinite(n) || n <= 0) return '-';
        if (n < 1e12) n *= 1000;
        const d = new Date(n);
        if (!isFinite(d.getTime())) return '-';
        try { return d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
        catch (_) { return d.toLocaleString(); }
    }
    // Coordenadas en formato "lat, lon" con 5-6 decimales.
    function rxCoord(lat, lon, dec) {
        if (lat == null || lon == null || !isFinite(+lat) || !isFinite(+lon)) return '-';
        const n = (dec == null ? 5 : dec);
        return (+lat).toFixed(n) + ', ' + (+lon).toFixed(n);
    }
    // Enlace a OpenStreetMap en texto plano (util para ubicar el dato).
    function rxInfOSMUrl(lat, lon) {
        if (lat == null || lon == null) return '';
        return 'https://www.openstreetmap.org/?mlat=' + (+lat).toFixed(6) + '&mlon=' + (+lon).toFixed(6) + '#map=16/' + (+lat).toFixed(6) + '/' + (+lon).toFixed(6);
    }
    function rxInfResumenTexto(d) {
        const total = d.watched.length;
        const avisos = d.hoy.length;
        const crit = d.porSev.critico || 0;
        const alto = d.porSev.alto || 0;
        const partes = [];
        partes.push('De ' + total + ' unidad(es) en el alcance, ' + d.online.length + ' reportan en linea y ' + d.sinSenal.length + ' estan sin senal.');
        if (d.zonasCargadas) partes.push(d.enZona.length + ' dentro de geocerca y ' + d.fueraZona.length + ' fuera (de las que reportan posicion).');
        else partes.push('Las geocercas no estan cargadas, por lo que no se evaluo la pertenencia a zonas.');
        partes.push('En el dia se registraron ' + avisos + ' aviso(s)' + (avisos ? ' (' + crit + ' critico(s), ' + alto + ' alto(s)).' : '.'));
        if (d.moviendo.length || d.detenidas.length) partes.push(d.moviendo.length + ' en movimiento y ' + d.detenidas.length + ' detenidas.');
        return partes.join(' ');
    }
    function rxInformeDatos() {
        const now = new Date();
        const ini = new Date(); ini.setHours(0, 0, 0, 0);
        const toda = !!APP.config.watchAll;
        const watched = (APP.unidades || []).filter((u) => { try { return toda || shouldWatch(u); } catch (_) { return false; } });
        const filas = watched.map((u) => ({ info: parseUnitName(u), st: unitState(u) }));
        const zonasCargadas = !!(APP.config.loadZones && (APP.zonas || []).length);
        const conPos = filas.filter((x) => x.st.lat != null);
        const enZona = zonasCargadas ? conPos.filter((x) => { try { return !!zoneAt(x.st.lat, x.st.lon); } catch (_) { return false; } }) : [];
        const fueraZona = zonasCargadas ? conPos.filter((x) => enZona.indexOf(x) < 0) : [];
        const hoy = (APP.historial || []).filter((a) => a.ts >= ini.getTime());
        const porSev = {};
        hoy.forEach((a) => { porSev[a.sev] = (porSev[a.sev] || 0) + 1; });
        return {
            now: now, ini: ini, toda: toda, watched: filas, zonasCargadas: zonasCargadas,
            enZona: enZona, fueraZona: fueraZona, hoy: hoy, porSev: porSev,
            online: filas.filter((x) => x.st.online),
            moviendo: filas.filter((x) => x.st.online && x.st.vel > 3),
            detenidas: filas.filter((x) => x.st.online && x.st.vel <= 3),
            sinSenal: filas.filter((x) => !x.st.online)
        };
    }
    function rxInfSevBadge(sev) {
        const s = String(sev || '').toLowerCase();
        const txt = s ? s.charAt(0).toUpperCase() + s.slice(1) : '-';
        return '<span class="badge sev-' + esc(s || 'bajo') + '">' + esc(txt) + '</span>';
    }
    function rxInfTabla(cabeceras, filas) {
        if (!filas.length) return '<p class="muted">Sin datos.</p>';
        return '<table><thead><tr>' + cabeceras.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
            filas.map((f) => '<tr>' + f.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') +
            '</tbody></table>';
    }
    function rxInfEstilo() {
        return '*{box-sizing:border-box}' +
            'body{font:10.5px/1.5 "Segoe UI",system-ui,Arial,sans-serif;color:#1c2030;margin:0;padding:0}' +
            '@page{size:A4;margin:14mm 12mm 16mm}' +
            'h1,h2,h3{margin:0}' +
            // Portada / cabecera
            '.cover{border-bottom:3px solid #850D22;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;gap:14px}' +
            '.brand{font-size:23px;font-weight:800;letter-spacing:.6px;color:#850D22;line-height:1.05}' +
            '.brand small{display:block;font-size:10.5px;font-weight:600;color:#5a6072;letter-spacing:.3px;margin-top:3px}' +
            '.meta{text-align:right;font-size:9.5px;color:#5a6072;line-height:1.55;min-width:210px}' +
            '.meta b{color:#1c2030}' +
            '.meta .tag{display:inline-block;margin-left:4px;padding:0 6px;border-radius:8px;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;background:#f0e2e6;color:#850D22;border:1px solid #e3c3ca}' +
            // KPIs
            '.kpis{display:flex;flex-wrap:wrap;gap:7px;margin:6px 0 14px}' +
            '.kpi{flex:1 1 100px;border:1px solid #d9dce4;border-radius:8px;padding:7px 9px;background:#fafbfd;border-top:2px solid #850D22}' +
            '.kpi b{display:block;font-size:17px;color:#1c2030;font-variant-numeric:tabular-nums;line-height:1.15}' +
            '.kpi span{font-size:8.5px;text-transform:uppercase;letter-spacing:.5px;color:#5a6072}' +
            // Indice
            '.toc{border:1px solid #e3e6ee;border-radius:8px;padding:8px 12px;background:#f7f8fb;margin:0 0 12px;font-size:10px;color:#3a4050;columns:2;column-gap:22px}' +
            '.toc b{color:#850D22;display:block;font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;column-span:all}' +
            '.toc a{color:#3a4050;text-decoration:none}' +
            '.toc li{margin:1px 0}' +
            // Secciones
            'h2.seccion{font-size:12px;border-left:4px solid #850D22;padding:2px 0 2px 8px;margin:16px 0 7px;color:#1c2030;page-break-after:avoid;background:linear-gradient(90deg,#f7f8fb,transparent)}' +
            // Tablas
            'table{width:100%;border-collapse:collapse;font-size:9.3px;margin:0 0 8px}' +
            'th,td{border:1px solid #d9dce4;padding:3.5px 5px;text-align:left;vertical-align:top}' +
            'thead th{background:#eef1f6;font-size:8.4px;text-transform:uppercase;letter-spacing:.4px;color:#3a4050;font-weight:700}' +
            'tbody tr:nth-child(even){background:#fafbfd}' +
            'thead{display:table-header-group}tr{page-break-inside:avoid}' +
            'td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}' +
            'td.mono,.mono{font-family:"Consolas","SFMono-Regular",Menlo,monospace;font-size:8.6px;white-space:nowrap;color:#3a4050}' +
            '.badge{display:inline-block;padding:0 6px;border-radius:8px;font-size:8.4px;font-weight:700;text-transform:uppercase;border:1px solid #ccc;white-space:nowrap}' +
            '.sev-critico{color:#b71c1c;border-color:#e7a3a3;background:#fdeaea}' +
            '.sev-alto{color:#e65100;border-color:#f0c39a;background:#fdf1e6}' +
            '.sev-medio{color:#8a6d00;border-color:#e6d79a;background:#fdf9e6}' +
            '.sev-bajo{color:#1565c0;border-color:#a9c8e8;background:#eaf3fc}' +
            '.pill{display:inline-block;padding:0 6px;border-radius:9px;font-size:8.6px;font-weight:600;background:#eef1f6;color:#3a4050;border:1px solid #d9dce4}' +
            '.ok{color:#2e7d32}.warn{color:#a1720a}.bad{color:#b71c1c}.muted{color:#6b7280}' +
            'p{margin:0 0 8px;font-size:10.2px;line-height:1.5}' +
            '.resumen{background:#f7f8fb;border:1px solid #e3e6ee;border-radius:8px;padding:9px 12px;margin:0 0 4px}' +
            '.resumen .sevline{margin-top:4px}' +
            '.ia{border:1px solid #e3e6ee;border-left:4px solid #1565c0;border-radius:6px;padding:8px 10px;background:#f7f9fc}' +
            '.callout{border:1px solid #e3e6ee;border-left:4px solid #850D22;border-radius:6px;padding:7px 10px;background:#fbfbfd;font-size:9.8px;color:#3a4050;margin:0 0 10px}' +
            '.pie{margin-top:18px;border-top:1px solid #d9dce4;padding-top:6px;font-size:8.2px;color:#8890a2;display:flex;justify-content:space-between;gap:10px}' +
            '.rondo-mm-print{position:relative;overflow:hidden;background:#eef1f6;border:1px solid #d9dce4;border-radius:6px;margin:4px 0 10px}' +
            '.rondo-mm-print .rondo-mm-tile{position:absolute;width:256px;height:256px}' +
            '.rondo-mm-print svg{position:absolute;left:0;top:0}' +
            '.mapa-leyenda{display:flex;gap:14px;flex-wrap:wrap;font-size:9.2px;color:#5a6072;margin:0 0 10px}' +
            '.mapa-leyenda i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px;vertical-align:-1px}' +
            '.grid2{display:flex;gap:10px;flex-wrap:wrap}.grid2>div{flex:1 1 46%;min-width:0}' +
            '.vacio{border:1px dashed #d9dce4;border-radius:6px;padding:8px 10px;color:#6b7280;font-size:9.6px;background:#fafbfd}';
    }
    function rxInfCabecera(titulo, subtitulo, meta) {
        return '<div class="cover">' +
            '<div class="brand">' + esc(titulo) + '<small>' + esc(subtitulo) + '</small></div>' +
            '<div class="meta">' + meta + '</div>' +
            '</div>';
    }
    function rxInfPie() {
        return '<div class="pie"><span>Rondo &middot; generado automaticamente</span><span>Documento de solo lectura: no modifica datos en la plataforma.</span></div>';
    }
    function rxInformeHTML() {
        const d = rxInformeDatos();
        const fecha = d.now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        const hora = d.now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const kpi = (n, t) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(t) + '</span></div>';
        const kpis = [
            kpi(d.watched.length, 'Unidades'),
            kpi(d.online.length, 'En linea'),
            kpi(d.sinSenal.length, 'Sin senal'),
            kpi(d.moviendo.length, 'En movimiento'),
            kpi(d.detenidas.length, 'Detenidas'),
            kpi(d.zonasCargadas ? d.enZona.length : '-', 'En geocerca'),
            kpi(d.zonasCargadas ? d.fueraZona.length : '-', 'Fuera de geocerca'),
            kpi(d.hoy.length, 'Avisos hoy')
        ].join('');
        const sevOrden = ['critico', 'alto', 'medio', 'bajo'].filter((s) => d.porSev[s]);
        const sevResumen = sevOrden.length
            ? sevOrden.map((s) => rxInfSevBadge(s) + ' ' + d.porSev[s]).join(' &nbsp; ')
            : '<span class="muted">Sin avisos registrados hoy.</span>';

        const coords = (lat, lon) => (lat == null || lon == null)
            ? '<span class="muted">-</span>'
            : '<span class="mono">' + esc(rxCoord(lat, lon, 5)) + '</span>';

        const filasUnidades = d.watched.map((x) => {
            const info = x.info, st = x.st;
            const zona = (st.lat != null) ? (zoneAt(st.lat, st.lon) || (d.zonasCargadas ? 'Fuera de geocerca' : '-')) : '-';
            const r = rutaDe(info);
            let rutaTxt = '-';
            if (r) {
                const er = estadoRuta(info, st) || {};
                const pct = er.snap ? Math.round(er.snap.progreso * 100) : 0;
                rutaTxt = (er.estado || 'EN RUTA') + (er.snap ? ' (' + pct + '%)' : '');
            }
            const odo = odometroDe(info);
            return [
                '<b>' + esc(info.eco || info.nombre) + '</b>',
                esc(info.placa || '-'),
                st.online ? '<span class="ok">En linea</span>' : '<span class="bad">Sin senal</span>',
                esc(rxFechaHora(st.t)),
                Math.round(st.vel) + ' km/h',
                esc(zona),
                esc(rutaTxt),
                odo ? Math.round((+odo.m || 0) / 1000) + ' km' : '-',
                esc(String(limiteDe(info))) + ' km/h',
                esc(info.id == null ? '-' : String(info.id)),
                coords(st.lat, st.lon)
            ];
        });
        const filasAvisos = d.hoy.slice(0, 400).map((a) => [
            esc(rxFechaHora(a.ts, true)),
            rxInfSevBadge(a.sev),
            esc(a.regla || '-'),
            esc(a.eco || '-'),
            coords(a.lat, a.lon),
            esc(a.titulo || '') + (a.detalle ? '<br><span class="muted">' + esc(a.detalle) + '</span>' : '')
        ]);
        const rutas = d.watched.filter((x) => rutaDe(x.info)).map((x) => {
            const r = rutaDe(x.info);
            const er = estadoRuta(x.info, x.st) || {};
            const pct = er.snap ? Math.round(er.snap.progreso * 100) : 0;
            const eta = er.snap ? calcularETA(er.snap, r, x.st.vel) : null;
            return [
                '<b>' + esc(x.info.eco || x.info.nombre) + '</b>',
                esc(r.destinoTexto || '-'),
                esc(er.estado || 'EN RUTA'),
                pct + '%',
                rxFmtDist(r.total),
                eta != null ? rxFmtDur(eta) : '-',
                er.desviado ? '<span class="bad">Si</span>' : 'No',
                esc(rxFechaHora(x.st.t))
            ];
        });
        const riesgo = (APP.riesgo || []).slice(0, 200).map((z) => {
            const cen = (z.centro && z.centro.length === 2) ? z.centro : [z.lat, z.lon];
            return [
                esc(z.municipio || z.nombre || '-'),
                esc(z.estado || '-'),
                String(z.score == null ? '-' : z.score),
                z.radio_m ? Math.round(z.radio_m) + ' m' : '-',
                coords(cen[0], cen[1])
            ];
        });
        const geocercas = (APP.zonas || []).slice(0, 300).map((z) => {
            const nom = z.n || z.nombre || ('Zona ' + z.id);
            const dentro = [];
            try {
                d.watched.forEach((x) => { if (x.st.lat != null && inZone(x.st.lat, x.st.lon, z)) dentro.push(x.info.eco || x.info.nombre); });
            } catch (_) { /* noop */ }
            const tipo = z.t === 3 ? 'Circulo' : (z.t === 2 ? 'Poligono' : (z.t === 1 ? 'Linea' : 'Zona'));
            const cen = centroDeZona(z) || {};
            let area = '-';
            try { const a = zonaAreaM2(z); if (a > 0) area = (a / 1e6).toFixed(3) + ' km2'; } catch (_) { /* noop */ }
            return [
                '<b>' + esc(nom) + '</b>',
                esc(tipo),
                esc(area),
                coords(cen.lat, cen.lon),
                dentro.length ? String(dentro.length) : '0',
                esc(dentro.slice(0, 12).join(', ') + (dentro.length > 12 ? '…' : ''))
            ];
        });
        const sinSenal = d.sinSenal.map((x) => [
            '<b>' + esc(x.info.eco || x.info.nombre) + '</b>',
            esc(x.info.placa || '-'),
            esc(rxFechaHora(x.st.t)),
            esc(ageText(x.st.edadMin)),
            x.st.lat != null ? (esc(zoneAt(x.st.lat, x.st.lon) || 'Fuera de geocerca')) : '-',
            coords(x.st.lat, x.st.lon)
        ]);

        // Se construyen las secciones y a la vez el indice.
        const secciones = [];
        let n = 0;
        const push = (titulo, filas) => {
            n++;
            secciones.push({ id: 's' + n, titulo: n + '. ' + titulo, html: rxInfTabla(filas.cab, filas.rows) });
        };
        push('Unidades (' + d.watched.length + ')', {
            cab: ['Eco', 'Placa', 'Estado', 'Ultimo reporte', 'Velocidad', 'Zona', 'Ruta', 'Odometro', 'Limite', 'ID', 'Coordenadas'],
            rows: filasUnidades
        });
        push('Avisos del dia (' + d.hoy.length + ')', {
            cab: ['Fecha y hora', 'Severidad', 'Regla', 'Eco', 'Coordenadas', 'Titulo y detalle'],
            rows: filasAvisos
        });
        push('Rutas activas (' + rutas.length + ')', {
            cab: ['Eco', 'Destino', 'Estado', 'Progreso', 'Distancia', 'ETA', 'Desviado', 'Ultimo reporte'],
            rows: rutas
        });
        push('Unidades sin senal (' + sinSenal.length + ')', {
            cab: ['Eco', 'Placa', 'Ultimo reporte', 'Sin reportar', 'Ultima zona', 'Coordenadas'],
            rows: sinSenal
        });
        if (d.zonasCargadas) {
            push('Geocercas (' + (APP.zonas || []).length + ')', {
                cab: ['Geocerca', 'Tipo', 'Area', 'Centro', 'Unidades dentro', 'Ecos'],
                rows: geocercas
            });
        }
        if ((APP.riesgo || []).length) {
            push('Zonas de riesgo (' + APP.riesgo.length + ')', {
                cab: ['Municipio', 'Estado', 'Score', 'Radio', 'Coordenadas'],
                rows: riesgo
            });
        }
        const indice = '<div class="toc"><b>Contenido</b><ol>' +
            secciones.map((s) => '<li><a href="#' + s.id + '">' + esc(s.titulo) + '</a></li>').join('') +
            '</ol></div>';
        const seccion = (s) => '<h2 class="seccion" id="' + s.id + '">' + esc(s.titulo) + '</h2>' + s.html;

        return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
            '<title>Reporte Rondo ' + esc(fecha) + '</title>' +
            '<style>' + rxInfEstilo() + '</style></head><body>' +
            rxInfCabecera('Rondo', 'Vigilancia de flota',
                'Reporte operativo <span class="tag">' + esc(d.toda ? 'toda la flota' : 'vigiladas') + '</span><br>' +
                '<b>' + esc(fecha) + ', ' + esc(hora) + '</b><br>' +
                'Periodo de avisos: hoy (00:00 a ' + esc(hora) + ')<br>' +
                'Unidades en el alcance: ' + d.watched.length) +
            '<div class="kpis">' + kpis + '</div>' +
            indice +
            '<h2 class="seccion" id="resumen">Resumen ejecutivo</h2>' +
            '<div class="resumen"><p>' + esc(rxInfResumenTexto(d)) + '</p><p class="sevline" style="margin:0">' + sevResumen + '</p></div>' +
            '<div class="callout">Cada fila incluye fecha y hora y, cuando se conoce, las coordenadas del dato (latitud, longitud). ' +
            'Las coordenadas abren la ubicacion exacta en OpenStreetMap.</div>' +
            secciones.map(seccion).join('') +
            (d.zonasCargadas ? '' : '<div class="vacio">Las geocercas no estan cargadas (Ajustes &gt; General &gt; "Cargar geocercas"); no se evaluo la pertenencia a zonas.</div>') +
            rxInfPie() +
            '</body></html>';
    }
    // Reporte PDF de un recorrido del Replay (botón junto a GeoJSON/CSV).
    function rxReplayInformeHTML() {
        const r = RX_REPLAY;
        if (!r) return '';
        const s = r.resumen || {};
        const fecha = new Date((s.inicio || 0) * 1000).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        // Rango completo con fecha y hora (el recorrido puede cruzar medianoche).
        const rango = rxFechaHora(r.desde || s.inicio) + '  ->  ' + rxFechaHora(r.hasta || s.fin);
        const kpi = (n, t) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(t) + '</span></div>';
        const kpis = [
            kpi(r.eco, 'Unidad'),
            kpi(rxFmtDist(s.distM || 0), 'Distancia'),
            kpi(rxFmtDur(s.durSeg || 0), 'Duracion'),
            kpi((r.msgs || []).length, 'Puntos'),
            kpi((r.paradas || []).length, 'Paradas'),
            kpi((r.paradas || []).filter((p) => p.motor === 'off').length, 'Motor apagado'),
            kpi(rxFmtDur(s.moviendoSeg || 0), 'En movimiento'),
            kpi(rxFmtDur(s.detenidoSeg || 0), 'Detenido'),
            kpi((s.velMax || 0) + ' km/h', 'Vel. maxima'),
            kpi(s.excesos || 0, 'Excesos')
        ].join('');
        const coords = (lat, lon) => (lat == null || lon == null)
            ? '<span class="muted">-</span>'
            : '<span class="mono">' + esc(rxCoord(lat, lon, 5)) + '</span>';
        const filasParadas = (r.paradas || []).map((p, i) => [
            String(i + 1),
            esc(rxFechaHora(p.t, true)),
            esc(rxFmtDur(p.dur)),
            (p.motor ? (p.motor === 'off' ? '<span class="muted">Apagado</span>' : '<span class="ok">Encendido</span>') + (p.motorFuente === 'estimado' ? ' <span class="pill">est.</span>' : '') : '-'),
            '<b>' + esc(rxReplayParadaEtiqueta(p)) + '</b>',
            esc(p.direccion || ''),
            esc(p.zona || ''),
            esc(p.municipio || ''),
            coords(p.lat, p.lon)
        ]);
        const filasEventos = (r.eventos || []).map((e2) => [
            esc(rxFechaHora(e2.t, true)),
            '<span class="pill">' + esc(e2.tipo) + '</span>',
            esc(e2.txt),
            coords(e2.lat, e2.lon)
        ]);
        // Puntos del recorrido (muestreados para no generar miles de filas).
        const msgs = r.msgs || [];
        const paso = Math.max(1, Math.ceil(msgs.length / 400));
        const filasPuntos = [];
        for (let i = 0; i < msgs.length; i += paso) {
            const m = msgs[i];
            filasPuntos.push([
                String(i + 1),
                esc(rxFechaHora(m.t, true)),
                coords(m.lat, m.lon),
                Math.round(m.s || 0) + ' km/h',
                (m.c != null ? Math.round(m.c) + '\u00b0' : '-'),
                Math.round((m.km || 0) / 1000) + ' km'
            ]);
        }
        // Mapa del recorrido con los puntos marcados (tiles de OSM + trazo SVG).
        const marcasMapa = [];
        (r.paradas || []).forEach((p, i) => marcasMapa.push({ lat: p.lat, lon: p.lon, color: '#7d8595', radio: 6, num: i + 1, txt: 'Parada ' + (i + 1) + ' \u00b7 ' + rxReplayHHMM(p.t) + ' \u00b7 ' + rxReplayParadaEtiqueta(p) }));
        (r.eventos || []).forEach((e2) => marcasMapa.push({ lat: e2.lat, lon: e2.lon, color: rxReplayColor(e2.tipo), radio: 5, txt: rxReplayHHMM(e2.t) + ' \u00b7 ' + e2.txt }));
        const mapa = rxMiniMapaHTML({
            lineas: [{ pts: msgs.map((m) => ({ lat: m.lat, lon: m.lon })), color: '#850D22', width: 4, opacity: 0.95, glow: true }],
            marcas: marcasMapa
        }, 680, 300);
        const leyenda = '<div class="mapa-leyenda">' +
            '<span><i style="background:#850D22"></i>Recorrido</span>' +
            '<span><i style="background:#7d8595"></i>Parada (numerada)</span>' +
            '<span><i style="background:#1565c0"></i>Geocerca</span>' +
            '<span><i style="background:#b71c1c"></i>Exceso</span>' +
            '<span><i style="background:#e65100"></i>Desvio</span>' +
            '<span class="muted">Mapa: OpenStreetMap</span></div>';
        const seccion = (titulo, contenido) => '<h2 class="seccion">' + esc(titulo) + '</h2>' + contenido;
        const notaPuntos = paso > 1
            ? '<div class="callout">Se listan ' + filasPuntos.length + ' de ' + msgs.length + ' puntos (cada ' + paso + ' registros) con fecha, hora y coordenadas. El total de puntos aparece en los KPIs.</div>'
            : '<div class="callout">Se listan los ' + filasPuntos.length + ' puntos del recorrido con fecha, hora y coordenadas.</div>';
        return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
            '<title>Recorrido ' + esc(r.eco) + ' ' + esc(fecha) + '</title>' +
            '<style>' + rxInfEstilo() + '</style></head><body>' +
            rxInfCabecera('Rondo', 'Recorrido de la unidad',
                'Unidad <b>' + esc(r.eco) + '</b><br>' + esc(rango) + '<br>Documento de solo lectura') +
            '<div class="kpis">' + kpis + '</div>' +
            seccion('1. Mapa del recorrido', mapa + leyenda) +
            seccion('2. Paradas (' + filasParadas.length + ')', rxInfTabla(['#', 'Fecha y hora', 'Duracion', 'Motor', 'Lugar (OpenStreetMap)', 'Direccion', 'Geocerca', 'Municipio', 'Coordenadas'], filasParadas)) +
            seccion('3. Eventos (' + filasEventos.length + ')', rxInfTabla(['Fecha y hora', 'Tipo', 'Detalle', 'Coordenadas'], filasEventos)) +
            seccion('4. Puntos del recorrido', notaPuntos + rxInfTabla(['#', 'Fecha y hora', 'Coordenadas', 'Velocidad', 'Rumbo', 'Acumulado'], filasPuntos)) +
            (r.truncado ? '<p class="muted">Nota: el historial se trunco al limite de mensajes; el resumen puede ser parcial.</p>' : '') +
            rxInfPie() +
            '</body></html>';
    }
    function exportReplayPDF() {
        if (!RX_REPLAY) { adviceWarn('Sin recorrido', 'Carga un recorrido antes de generar el PDF.'); return; }
        rxImprimirHTML(rxReplayInformeHTML());
        advice('Reporte listo', 'Elige "Guardar como PDF" en el dialogo de impresion.');
    }
    function rxImprimirHTML(html) {
        let fr = document.getElementById('rondo-print-frame');
        if (fr && fr.parentNode) fr.parentNode.removeChild(fr);
        fr = document.createElement('iframe');
        fr.id = 'rondo-print-frame';
        fr.setAttribute('style', 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none');
        document.body.appendChild(fr);
        let doc = null;
        try {
            doc = fr.contentWindow.document;
            doc.open(); doc.write(html); doc.close();
        } catch (_) {
            adviceWarn('No se pudo preparar el reporte', 'Intenta de nuevo.');
            try { fr.remove(); } catch (_) { /* noop */ }
            return;
        }
        // Espera a que carguen los tiles del mapa antes de imprimir.
        const pendientes = () => {
            try { return Array.prototype.filter.call(doc.images || [], (i) => !i.complete).length; }
            catch (_) { return 0; }
        };
        const t0 = Date.now();
        const listo = () => {
            if (pendientes() && (Date.now() - t0) < 5000) { setTimeout(listo, 150); return; }
            setTimeout(() => {
                try { fr.contentWindow.focus(); fr.contentWindow.print(); }
                catch (_) { adviceWarn('No se pudo imprimir', 'Permite la impresion/ventanas emergentes e intenta de nuevo.'); }
                setTimeout(() => { try { fr.remove(); } catch (_) { /* noop */ } }, 60000);
            }, 250);
        };
        setTimeout(listo, 400);
    }
    function exportReportePDF() {
        const d = rxInformeDatos();
        if (!d.watched.length) { adviceWarn('Sin unidades', 'No hay unidades en el alcance para el reporte.'); return; }
        rxImprimirHTML(rxInformeHTML());
        advice('Reporte listo', 'Elige "Guardar como PDF" en el dialogo de impresion.');
    }
