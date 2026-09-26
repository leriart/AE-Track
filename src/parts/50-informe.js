    /* ====================== REPORTE PDF (v6.0.13) ======================
     * Genera un informe operativo completo y lo abre en el dialogo de
     * impresion del navegador para guardarlo como PDF. Sin dependencias:
     * se construye un documento HTML con CSS de impresion (A4, saltos de
     * pagina, encabezados de tabla repetidos) y se imprime desde un iframe.
     */
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
            'body{font:11px/1.45 "Segoe UI",system-ui,Arial,sans-serif;color:#1c2030;margin:0}' +
            '@page{size:A4;margin:14mm 12mm 18mm}' +
            'h1,h2,h3{margin:0}' +
            '.cover{border-bottom:3px solid #850D22;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end}' +
            '.brand{font-size:22px;font-weight:800;letter-spacing:.6px;color:#850D22;line-height:1.1}' +
            '.brand small{display:block;font-size:11px;font-weight:600;color:#5a6072;letter-spacing:.3px}' +
            '.meta{text-align:right;font-size:10px;color:#5a6072;line-height:1.5}' +
            '.meta b{color:#1c2030}' +
            '.kpis{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 16px}' +
            '.kpi{flex:1 1 108px;border:1px solid #d9dce4;border-radius:8px;padding:8px 10px;background:#fafbfd}' +
            '.kpi b{display:block;font-size:18px;color:#1c2030}' +
            '.kpi span{font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#5a6072}' +
            'h2.seccion{font-size:12.5px;border-left:4px solid #850D22;padding-left:8px;margin:18px 0 8px;color:#1c2030;page-break-after:avoid}' +
            'table{width:100%;border-collapse:collapse;font-size:10px;margin:0 0 6px}' +
            'th,td{border:1px solid #d9dce4;padding:4px 6px;text-align:left;vertical-align:top}' +
            'thead th{background:#eef1f6;font-size:9px;text-transform:uppercase;letter-spacing:.4px;color:#3a4050}' +
            'tbody tr:nth-child(even){background:#fafbfd}' +
            'thead{display:table-header-group}tr{page-break-inside:avoid}' +
            '.badge{display:inline-block;padding:0 6px;border-radius:8px;font-size:9px;font-weight:700;text-transform:uppercase;border:1px solid #ccc}' +
            '.sev-critico{color:#b71c1c;border-color:#e7a3a3;background:#fdeaea}' +
            '.sev-alto{color:#e65100;border-color:#f0c39a;background:#fdf1e6}' +
            '.sev-medio{color:#8a6d00;border-color:#e6d79a;background:#fdf9e6}' +
            '.sev-bajo{color:#1565c0;border-color:#a9c8e8;background:#eaf3fc}' +
            '.muted{color:#6b7280}' +
            'p{margin:0 0 8px;font-size:10.5px;line-height:1.5}' +
            '.resumen{background:#f7f8fb;border:1px solid #e3e6ee;border-radius:8px;padding:10px 12px;margin:0 0 4px}' +
            '.ia{border:1px solid #e3e6ee;border-left:4px solid #1565c0;border-radius:6px;padding:8px 10px;background:#f7f9fc}' +
            '.pie{margin-top:20px;border-top:1px solid #d9dce4;padding-top:6px;font-size:8.5px;color:#8890a2;display:flex;justify-content:space-between}';
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
    function rxInformeHTML(resumenIA) {
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
                st.online ? 'En linea' : 'Sin senal',
                esc(ageText(st.edadMin)),
                Math.round(st.vel) + ' km/h',
                esc(zona),
                esc(rutaTxt),
                odo ? Math.round((+odo.m || 0) / 1000) + ' km' : '-',
                esc(String(limiteDe(info))) + ' km/h'
            ];
        });
        const filasAvisos = d.hoy.slice(0, 250).map((a) => [
            esc(new Date(a.ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })),
            rxInfSevBadge(a.sev),
            esc(a.regla || '-'),
            esc(a.eco || '-'),
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
                er.desviado ? 'Si' : 'No'
            ];
        });
        const riesgo = (APP.riesgo || []).slice(0, 120).map((z) => [
            esc(z.municipio || z.nombre || '-'),
            esc(z.estado || '-'),
            String(z.score == null ? '-' : z.score),
            z.radio_m ? Math.round(z.radio_m) + ' m' : '-'
        ]);
        const geocercas = (APP.zonas || []).slice(0, 200).map((z) => {
            const nom = z.n || z.nombre || ('Zona ' + z.id);
            let dentro = 0;
            try { dentro = d.watched.filter((x) => x.st.lat != null && inZone(x.st.lat, x.st.lon, z)).length; } catch (_) { dentro = 0; }
            const tipo = z.t === 3 ? 'Circulo' : (z.t === 2 ? 'Poligono' : (z.t === 1 ? 'Linea' : 'Zona'));
            return [esc(nom), tipo, String(dentro)];
        });
        const sinSenal = d.sinSenal.map((x) => [
            '<b>' + esc(x.info.eco || x.info.nombre) + '</b>',
            esc(x.info.placa || '-'),
            esc(ageText(x.st.edadMin)),
            x.st.lat != null ? (esc(zoneAt(x.st.lat, x.st.lon) || 'Fuera de geocerca')) : '-'
        ]);

        const seccion = (titulo, contenido) => '<h2 class="seccion">' + esc(titulo) + '</h2>' + contenido;

        return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
            '<title>Reporte Rondo ' + esc(fecha) + '</title>' +
            '<style>' + rxInfEstilo() + '</style></head><body>' +
            rxInfCabecera('Rondo', 'Vigilancia de flota',
                'Reporte operativo<b>' + esc(fecha) + ', ' + esc(hora) + '</b>' +
                'Alcance: ' + esc(d.toda ? 'toda la flota' : 'unidades vigiladas') + '<br>' +
                'Periodo de avisos: hoy (00:00 a ' + esc(hora) + ')') +
            '<div class="kpis">' + kpis + '</div>' +
            '<h2 class="seccion">Resumen ejecutivo</h2>' +
            '<div class="resumen"><p>' + esc(rxInfResumenTexto(d)) + '</p><p style="margin:0">' + sevResumen + '</p></div>' +
            (resumenIA ? '<h2 class="seccion">Analisis con IA</h2><div class="ia"><p>' + esc(resumenIA) + '</p></div>' : '') +
            seccion('1. Unidades (' + d.watched.length + ')', rxInfTabla(['Eco', 'Placa', 'Estado', 'Ultimo reporte', 'Velocidad', 'Zona', 'Ruta', 'Odometro', 'Limite'], filasUnidades)) +
            seccion('2. Avisos del dia (' + d.hoy.length + ')', rxInfTabla(['Hora', 'Severidad', 'Regla', 'Eco', 'Titulo y detalle'], filasAvisos)) +
            seccion('3. Rutas activas (' + rutas.length + ')', rxInfTabla(['Eco', 'Destino', 'Estado', 'Progreso', 'Distancia', 'ETA', 'Desviado'], rutas)) +
            seccion('4. Unidades sin senal (' + sinSenal.length + ')', rxInfTabla(['Eco', 'Placa', 'Ultimo reporte', 'Ultima zona'], sinSenal)) +
            (d.zonasCargadas ? seccion('5. Geocercas (' + (APP.zonas || []).length + ')', rxInfTabla(['Geocerca', 'Tipo', 'Unidades dentro'], geocercas)) : '') +
            ((APP.riesgo || []).length ? seccion((d.zonasCargadas ? '6' : '5') + '. Zonas de riesgo (' + APP.riesgo.length + ')', rxInfTabla(['Municipio', 'Estado', 'Score', 'Radio'], riesgo)) : '') +
            rxInfPie() +
            '</body></html>';
    }
    // Reporte PDF de un recorrido del Replay (botón junto a GeoJSON/CSV).
    function rxReplayInformeHTML() {
        const r = RX_REPLAY;
        if (!r) return '';
        const s = r.resumen || {};
        const fecha = new Date((s.inicio || 0) * 1000).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        const rango = rxReplayHHMM(s.inicio) + ' - ' + rxReplayHHMM(s.fin);
        const kpi = (n, t) => '<div class="kpi"><b>' + esc(String(n)) + '</b><span>' + esc(t) + '</span></div>';
        const kpis = [
            kpi(r.eco, 'Unidad'),
            kpi(rxFmtDist(s.distM || 0), 'Distancia'),
            kpi(rxFmtDur(s.durSeg || 0), 'Duracion'),
            kpi(s.paradas || 0, 'Paradas'),
            kpi(rxFmtDur(s.moviendoSeg || 0), 'En movimiento'),
            kpi(rxFmtDur(s.detenidoSeg || 0), 'Detenido'),
            kpi((s.velMax || 0) + ' km/h', 'Velocidad maxima'),
            kpi(s.excesos || 0, 'Excesos')
        ].join('');
        const filasParadas = (r.paradas || []).map((p, i) => [
            String(i + 1),
            rxReplayHHMM(p.t),
            rxFmtDur(p.dur),
            '<b>' + esc(rxReplayParadaEtiqueta(p)) + '</b>',
            esc(p.direccion || ''),
            esc(p.zona || ''),
            esc(p.municipio || ''),
            (+p.lat).toFixed(5) + ',' + (+p.lon).toFixed(5)
        ]);
        const filasEventos = (r.eventos || []).map((e2) => [
            rxReplayHHMM(e2.t),
            esc(e2.tipo),
            esc(e2.txt),
            (+e2.lat).toFixed(5) + ',' + (+e2.lon).toFixed(5)
        ]);
        const seccion = (titulo, contenido) => '<h2 class="seccion">' + esc(titulo) + '</h2>' + contenido;
        return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
            '<title>Recorrido ' + esc(r.eco) + ' ' + esc(fecha) + '</title>' +
            '<style>' + rxInfEstilo() + '</style></head><body>' +
            rxInfCabecera('Rondo', 'Recorrido de la unidad',
                'Unidad <b>' + esc(r.eco) + '</b><br>' + esc(fecha) + ' &middot; ' + esc(rango) + '<br>Documento de solo lectura') +
            '<div class="kpis">' + kpis + '</div>' +
            seccion('1. Paradas (' + filasParadas.length + ')', rxInfTabla(['#', 'Hora', 'Duracion', 'Lugar (OpenStreetMap)', 'Direccion', 'Geocerca', 'Municipio', 'Coordenadas'], filasParadas)) +
            seccion('2. Eventos (' + filasEventos.length + ')', rxInfTabla(['Hora', 'Tipo', 'Detalle', 'Coordenadas'], filasEventos)) +
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
        try {
            const doc = fr.contentWindow.document;
            doc.open(); doc.write(html); doc.close();
        } catch (_) {
            adviceWarn('No se pudo preparar el reporte', 'Intenta de nuevo.');
            try { fr.remove(); } catch (_) { /* noop */ }
            return;
        }
        setTimeout(() => {
            try { fr.contentWindow.focus(); fr.contentWindow.print(); }
            catch (_) { adviceWarn('No se pudo imprimir', 'Permite la impresion/ventanas emergentes e intenta de nuevo.'); }
            setTimeout(() => { try { fr.remove(); } catch (_) { /* noop */ } }, 60000);
        }, 600);
    }
    async function exportReportePDF() {
        const d = rxInformeDatos();
        if (!d.watched.length) { adviceWarn('Sin unidades', 'No hay unidades en el alcance para el reporte.'); return; }
        let resumenIA = '';
        const quiereIA = !!(APP.config && APP.config.iaHabilitada && APP.config.iaApiKey && APP.config.iaResumenInforme);
        if (quiereIA) {
            advice('Generando reporte', 'Pidiendo el resumen a la IA...');
            try {
                const r = await aiResumenDia(d.hoy);
                if (r && r.texto) resumenIA = String(r.texto).replace(/\s*\n\s*/g, ' ').trim();
            } catch (_) { resumenIA = ''; }
        }
        rxImprimirHTML(rxInformeHTML(resumenIA));
        advice('Reporte listo', 'Elige "Guardar como PDF" en el dialogo de impresion.');
    }
