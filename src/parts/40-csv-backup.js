    /* ====================== CSV + BACKUP ====================== */
    // Escapa una celda CSV y neutraliza formulas (=, +, @, tab, CR) que una
    // hoja de calculo podria ejecutar (CSV injection). Los numeros negativos
    // no se tocan: '-' no entra en la lista.
    function rxCsvCelda(c) {
        let s = String(c == null ? '' : c);
        if (/^[=+@\t\r]/.test(s)) s = "'" + s;
        return '"' + s.replace(/"/g, '""') + '"';
    }
    function downloadCSV(filas, nombre) {
        const csv = (filas || []).map((f) => (f || []).map(rxCsvCelda).join(',')).join('\n');
        const a = makeEl('a', { href: URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })) });
        a.download = (nombre || 'rondo') + '_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }
    function exportUnits() {
        // v6.11: incluye la fecha y hora del ultimo reporte y las coordenadas.
        const filas = [['Eco', 'Placa', 'Nombre', 'ID', 'Estado', 'Ultimo', 'Ultimo(min)', 'km/h', 'Lat', 'Lon', 'Zona', 'Silenciada', 'Vigilada']];
        (APP.unidades || []).filter(shouldWatch).forEach((u) => {
            const info = parseUnitName(u), st = unitState(u);
            filas.push([info.eco, info.placa, info.nombre, info.id, st.estado,
                rxFechaHora(st.t),
                isFinite(st.edadMin) ? st.edadMin.toFixed(1) : '', Math.round(st.vel),
                st.lat, st.lon, zoneAt(st.lat, st.lon),
                APP.dismissed.has(info.clave) ? 'si' : '',
                isWatched(info) ? 'si' : ''
            ]);
        });
        downloadCSV(filas, 'wialon_unidades');
    }
    function exportAlertas() {
        // v6.11: fecha y hora completas + coordenadas de cada aviso.
        const filas = [['Fecha y hora', 'Severidad', 'Regla', 'Titulo', 'Detalle', 'Eco', 'Lat', 'Lon']];
        (APP.historial || []).forEach((a) => filas.push([
            rxFechaHora(a.ts, true), a.sev, a.regla, a.titulo, a.detalle, a.eco,
            a.lat == null ? '' : a.lat, a.lon == null ? '' : a.lon
        ]));
        downloadCSV(filas, 'wialon_bitacora');
    }
    function exportInforme() {
        const inicio = new Date();
        inicio.setHours(0, 0, 0, 0);
        const hoy = (APP.historial || []).filter((a) => a.ts >= inicio.getTime());
        const cuenta = (lista, campo) => lista.reduce((acc, a) => {
            const k = a[campo] || '—';
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {});
        const porSev = cuenta(hoy, 'sev');
        const porRegla = cuenta(hoy, 'regla');
        const porEco = cuenta(hoy.filter((a) => a.eco), 'eco');
        const watched = (APP.unidades || []).filter(shouldWatch).map((u) => ({ info: parseUnitName(u), st: unitState(u) }));
        const off = watched.filter((x) => !x.st.online);

        const enLinea = watched.filter((x) => x.st.online).length;
        const coords = (lat, lon) => (lat == null || lon == null) ? '-' : (+lat).toFixed(5) + ', ' + (+lon).toFixed(5);
        const lineas = [];
        lineas.push('# Informe Rondo');
        lineas.push('');
        lineas.push('Generado: ' + rxFechaHora(Date.now(), true));
        lineas.push('Alcance: ' + (APP.config.watchAll ? 'toda la flota' : 'unidades vigiladas'));
        lineas.push('Unidades vigiladas: ' + watched.length);
        lineas.push('En línea: ' + enLinea + ' · Off: ' + off.length);
        lineas.push('');
        // v5.14: bloque de resumen IA (placeholder; se rellena async abajo).
        const resumenIdx = lineas.length;
        lineas.push('## Resumen IA');
        lineas.push('_Generando resumen con IA..._');
        lineas.push('');
        lineas.push('## Alertas de hoy (' + hoy.length + ')');
        const sevs = Object.keys(porSev).sort((a, b) => pickSeverity(b) - pickSeverity(a));
        if (sevs.length) sevs.forEach((s) => lineas.push('- ' + s + ': ' + porSev[s]));
        else lineas.push('- Sin alertas registradas.');
        lineas.push('');
        lineas.push('## Por regla');
        const reglas = Object.keys(porRegla).sort((a, b) => porRegla[b] - porRegla[a]);
        if (reglas.length) reglas.forEach((r) => lineas.push('- ' + r + ': ' + porRegla[r]));
        else lineas.push('- Sin datos.');
        lineas.push('');
        lineas.push('## Unidades con mas alertas');
        const ecos = Object.keys(porEco).sort((a, b) => porEco[b] - porEco[a]).slice(0, 15);
        if (ecos.length) ecos.forEach((e) => lineas.push('- ' + e + ': ' + porEco[e]));
        else lineas.push('- Sin datos.');
        lineas.push('');
        // v6.11: tabla de unidades con fecha/hora del ultimo reporte y coords.
        lineas.push('## Unidades (' + watched.length + ')');
        lineas.push('');
        lineas.push('| Eco | Placa | Estado | Ultimo reporte | Velocidad | Zona | Coordenadas |');
        lineas.push('| --- | --- | --- | --- | --- | --- | --- |');
        if (watched.length) {
            const zonasCargadas = !!(APP.config.loadZones && (APP.zonas || []).length);
            watched.forEach((x) => {
                const zona = (x.st.lat != null) ? (zoneAt(x.st.lat, x.st.lon) || (zonasCargadas ? 'Fuera de geocerca' : '-')) : '-';
                lineas.push('| ' + (x.info.eco || x.info.nombre || '-') + ' | ' + (x.info.placa || '-') + ' | ' +
                    (x.st.online ? 'En linea' : 'Sin senal') + ' | ' + rxFechaHora(x.st.t) + ' | ' +
                    Math.round(x.st.vel) + ' km/h | ' + zona + ' | ' + coords(x.st.lat, x.st.lon) + ' |');
            });
        } else {
            lineas.push('| - | - | - | - | - | - | - |');
        }
        lineas.push('');
        lineas.push('## Unidades sin señal ahora (' + off.length + ')');
        if (off.length) {
            lineas.push('');
            lineas.push('| Eco | Placa | Ultimo reporte | Sin reportar | Coordenadas |');
            lineas.push('| --- | --- | --- | --- | --- |');
            off.forEach((x) => lineas.push('| ' + (x.info.eco || x.info.nombre || '-') + ' | ' + (x.info.placa || '-') + ' | ' +
                rxFechaHora(x.st.t) + ' | ' + ageText(x.st.edadMin) + ' | ' + coords(x.st.lat, x.st.lon) + ' |'));
        } else {
            lineas.push('- Todas reportando.');
        }
        lineas.push('');
        lineas.push('## Ultimos avisos');
        if ((APP.historial || []).length) {
            lineas.push('');
            lineas.push('| Fecha y hora | Severidad | Regla | Eco | Coordenadas | Titulo |');
            lineas.push('| --- | --- | --- | --- | --- | --- |');
            (APP.historial || []).slice(0, 50).forEach((a) => lineas.push(
                '| ' + rxFechaHora(a.ts, true) + ' | ' + a.sev + ' | ' + (a.regla || '-') + ' | ' + (a.eco || '-') + ' | ' +
                coords(a.lat, a.lon) + ' | ' + String(a.titulo || '').replace(/\|/g, '/') +
                (a.detalle ? ' — ' + String(a.detalle).replace(/\|/g, '/') : '') + ' |'
            ));
        } else {
            lineas.push('- Sin avisos.');
        }
        const nombre = 'rondo_informe_' + new Date().toISOString().slice(0, 10) + '.md';
        // v5.14: si la IA esta habilitada y el usuario quiere resumen, lo
        // pedimos DESPUES de generar el .md para que el placeholder viaje
        // siempre en el archivo y, cuando llegue el texto, lo sustituimos
        // y volvemos a descargar el .md con el resumen rellenado.
        const quiereResumen = !!(APP.config && APP.config.iaHabilitada && APP.config.iaApiKey && APP.config.iaResumenInforme);
        const descarga = (lineasFinal) => {
            const a = makeEl('a', { href: URL.createObjectURL(new Blob([lineasFinal.join('\n')], { type: 'text/markdown;charset=utf-8;' })) });
            a.download = nombre;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        };
        descarga(lineas);
        advice('Informe generado', hoy.length + ' alertas hoy');
        if (!quiereResumen) return;
        // Llamada async a la IA para rellenar el bloque de resumen. Si falla,
        // dejamos el placeholder y avisamos al operador.
        aiResumenDia(hoy).then((r) => {
            if (r && r.error) {
                lineas[resumenIdx + 1] = '_' + r.error + '_';
            } else if (r && r.texto) {
                // Metemos el texto tal cual en una sola linea (es texto
                // libre, no markdown); lo partimos en lineas de ~120 chars.
                const txt = String(r.texto).replace(/\s*\n\s*/g, ' ').trim();
                lineas[resumenIdx + 1] = txt;
            } else {
                lineas[resumenIdx + 1] = '_La IA no devolvio resumen._';
            }
            descarga(lineas);
            adviceOk('Resumen IA anadido', 'El informe se volvio a descargar con el resumen.');
        }).catch((e) => {
            lineas[resumenIdx + 1] = '_Error al generar resumen IA: ' + (e && e.message ? e.message : e) + '_';
            descarga(lineas);
        });
    }

