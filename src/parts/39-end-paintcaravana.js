    /* === END: paintCaravana === */

    function paintRiesgo() {
        const cfg = APP.config || {};
        const items = APP.riesgo || [];
        // ── Estado / status banner ───────────────────────────────────
        const estadoEl = byId('rondo-riesgo-estado');
        if (estadoEl) {
            let html;
            const rel = tiempoRelativo(APP.riesgoTs);
            const fechaAbs = APP.riesgoTs ? new Date(APP.riesgoTs).toLocaleString() : '\u2014';
            if (APP.riesgoEstado === 'cargando') {
                html = '<div class="rondo-riesgo-status load"><span class="ico rondo-usym rondo-usym-spin">' + UIS.load + '</span><div class="cuerpo"><b>Cargando zonas de riesgo\u2026</b><span>Descargando desde la URL configurada.</span></div></div>';
            } else if (items.length > 0) {
                html = '<div class="rondo-riesgo-status ok"><span class="ico rondo-usym">' + UIS.info + '</span><div class="cuerpo"><b>' + items.length + ' zonas cargadas</b><span>\u00daltima carga ' + esc(rel) + ' \u00b7 ' + esc(fechaAbs) + '</span></div></div>';
            } else if (APP.riesgoEstado === 'error') {
                html = '<div class="rondo-riesgo-status err"><span class="ico rondo-usym">' + UIS.warn + '</span><div class="cuerpo"><b>Sin dataset activo</b><span>' + esc(APP.riesgoErr || 'configura una URL en Ajustes > Reglas, o importa un archivo') + '. La alerta cr\u00edtica de zona de riesgo queda desactivada.</span></div></div>';
            } else if (!cfg.riesgoUrl) {
                html = '<div class="rondo-riesgo-status"><span class="ico rondo-usym">' + UIS.info + '</span><div class="cuerpo"><b>A\u00fan no hay URL configurada</b><span>Pega una URL en <b>Ajustes &gt; Reglas &gt; Zonas de riesgo</b> o arrastra un archivo CSV/JSON aqui.</span></div></div>';
            } else {
                html = '<div class="rondo-riesgo-status"><span class="ico rondo-usym">' + UIS.info + '</span><div class="cuerpo"><b>Sin zonas cargadas</b><span>Pulsa <b>Recargar</b> o arrastra un CSV/JSON aqui.</span></div></div>';
            }
            estadoEl.innerHTML = html;
        }
        // ── Contador de la pestana ───────────────────────────────────
        const tabContador = byId('rondo-c-riesgo');
        if (tabContador) tabContador.textContent = items.length || 0;
        // ── Cuenta + fuente (linea compacta) ────────────────────────
        const cuentaEl = byId('rondo-riesgo-status-cuenta');
        if (cuentaEl) {
            cuentaEl.textContent = items.length + (items.length === 1 ? ' zona' : ' zonas');
        }
        const fuenteEl = byId('rondo-riesgo-status-fuente');
        if (fuenteEl) {
            const partes = [];
            // Fuente del dataset: primero config (URL), luego APP._riesgoFetched,
            // luego la fuente del primer item.
            const fuente = (cfg.riesgoUrl && APP._riesgoFetched) || '';
            if (fuente) {
                let tag = fuente;
                try {
                    const u = new URL(fuente);
                    tag = u.hostname + u.pathname;
                    if (tag.length > 38) tag = tag.slice(0, 35) + '\u2026';
                } catch (_) { /* noop */ }
                partes.push(esc(tag));
            }
            if (APP.riesgoTs && items.length) {
                partes.push('carga ' + esc(tiempoRelativo(APP.riesgoTs)));
            }
            fuenteEl.innerHTML = partes.length ? ' \u00b7 ' + partes.join(' \u00b7 ') : '';
            fuenteEl.title = fuente;
        }
        // ── Dona SVG ─────────────────────────────────────────────────
        const stats = calcularStatsRiesgo(items);
        renderRiesgoDona(stats);
        // ── Histograma ───────────────────────────────────────────────
        const hist = histogramaScores(items);
        renderRiesgoHistograma(hist);
        // ── KPIs ─────────────────────────────────────────────────────
        const totalEl = byId('rondo-riesgo-kpi-total');
        if (totalEl) totalEl.textContent = stats.total;
        const promEl = byId('rondo-riesgo-kpi-prom');
        if (promEl) {
            if (stats.total) promEl.textContent = 'prom. ' + stats.promScore + '/100';
            else promEl.innerHTML = '&mdash;';
        }
        const altoEl = byId('rondo-riesgo-kpi-alto');
        if (altoEl) altoEl.textContent = stats.alto;
        const medioEl = byId('rondo-riesgo-kpi-medio');
        if (medioEl) medioEl.textContent = stats.medio;
        const bajoEl = byId('rondo-riesgo-kpi-bajo');
        if (bajoEl) bajoEl.textContent = stats.bajo;
        // Marca el KPI activo segun el nivel filtrado
        document.querySelectorAll('#rondo-wrap-zonas .rondo-riesgo-kpi').forEach((k) => {
            k.classList.toggle('activo', k.dataset.kpiNivel === (APP.riesgoNivel || 'todas'));
        });
        // ── Filtros (sync UI con APP.riesgoFiltro/Nivel/Orden/Vista) ──
        const buscar = byId('rondo-riesgo-buscar');
        if (buscar && document.activeElement !== buscar && buscar.value !== (APP.riesgoFiltro || '')) {
            buscar.value = APP.riesgoFiltro || '';
        }
        const ordenSel = byId('rondo-riesgo-orden');
        if (ordenSel && ordenSel.value !== (APP.riesgoOrden || 'score')) ordenSel.value = APP.riesgoOrden || 'score';
        const vistaSel = byId('rondo-riesgo-vista');
        if (vistaSel && vistaSel.value !== (APP.riesgoVista || 'grupo')) vistaSel.value = APP.riesgoVista || 'grupo';
        document.querySelectorAll('#rondo-wrap-zonas .rondo-chip').forEach((c) => {
            c.classList.toggle('activo', c.dataset.nivel === (APP.riesgoNivel || 'todas'));
        });
        // ── Lista: filtrar -> ordenar -> (agrupar o plano) ────────────
        const listaEl = byId('rondo-riesgo-lista');
        const totalLabel = byId('rondo-riesgo-total');
        const filtradasLabel = byId('rondo-riesgo-filtradas');
        if (totalLabel) totalLabel.textContent = items.length;
        if (filtradasLabel) filtradasLabel.textContent = '...';
        if (!listaEl) return;
        const filtradas = filtrarZonas(items, APP.riesgoFiltro, APP.riesgoNivel);
        const ordenadas = ordenarZonas(filtradas, APP.riesgoOrden || 'score');
        if (filtradasLabel) filtradasLabel.textContent = ordenadas.length;
        // Summary line
        const summary = byId('rondo-riesgo-summary');
        if (summary) {
            const partes = [];
            partes.push('<span><b>' + ordenadas.length + '</b> visibles</span>');
            if (ordenadas.length !== items.length) partes.push('<span class="sep">de</span><span>' + items.length + ' totales</span>');
            const estSet = new Set();
            ordenadas.forEach((z) => { if (z.estado) estSet.add(z.estado); });
            if (estSet.size > 1) partes.push('<span class="sep">\u00b7</span><span>' + estSet.size + ' estados</span>');
            const sumArea = ordenadas.reduce((acc, z) => acc + areaKm2DeRadio(z.radio_m || 0), 0);
            if (sumArea > 0) partes.push('<span class="sep">\u00b7</span><span>' + fmtArea(Math.round(sumArea * 10) / 10) + '</span>');
            const top = topDelitos(calcularStatsRiesgo(ordenadas), 2);
            if (top.length) {
                partes.push('<span class="sep">\u00b7</span><span>top ' + top.map((t) => t.key.replace(/_/g, ' ') + ' ' + t.n).join(', ') + '</span>');
            }
            summary.innerHTML = partes.join(' ');
        }
        // Empty state: con onboarding si no hay items, con sugerencias si los hay pero el filtro no devuelve nada.
        if (!ordenadas.length) {
            let inner;
            if (items.length === 0) {
                inner =
                    '<span class="rondo-usym">' + UIS.zone + '</span>' +
                    '<b>Aun no hay zonas cargadas</b>' +
                    '<span>Sigue estos pasos para empezar.</span>' +
                    '<div class="pasos">' +
                        '<div class="paso"><span class="n">1</span><span class="t">Pega la URL</span><span class="d">En <b>Origen del dataset</b> arriba. Acepta CSV o JSON publico.</span></div>' +
                        '<div class="paso"><span class="n">2</span><span class="t">Recarga</span><span class="d">Pulsa <b>Recargar</b>. Tambien puedes arrastrar un archivo CSV/JSON al recuadro.</span></div>' +
                        '<div class="paso"><span class="n">3</span><span class="t">Activa la regla</span><span class="d">Si quieres alerta critica cuando una unidad pierda senal en zona, marca <b>PERDIO SENAL EN ZONA DE RIESGO</b>.</span></div>' +
                    '</div>' +
                    '<button class="mini" id="rondo-riesgo-empty-ajustes"><span class="rondo-usym">' + UIS.gear + '</span> Abrir Ajustes</button>';
            } else {
                inner =
                    '<span class="rondo-usym">' + UIS.filter + '</span>' +
                    '<b>Ninguna zona coincide</b>' +
                    '<span>Ajusta el texto o el nivel. Visibles: 0 de ' + items.length + '.</span>' +
                    '<button class="mini" id="rondo-riesgo-empty-clear"><span class="rondo-usym">' + UIS.clear + '</span> Limpiar filtros</button>';
            }
            listaEl.innerHTML = '<div class="rondo-riesgo-empty">' + inner + '</div>';
            return;
        }
        // Render: agrupado o plano
        if (APP.riesgoVista === 'plano') {
            listaEl.innerHTML = renderZonasPlano(ordenadas);
        } else {
            listaEl.innerHTML = renderZonasAgrupadas(ordenadas);
        }
        // Footer con conteo
        const totalShown = APP.riesgoVista === 'plano' ? ordenadas.length
            : agruparPorEstado(ordenadas).reduce((acc, g) => acc + g.zonas.length, 0);
        const fHtml = totalShown < items.length
            ? '<span>Mostrando <b>' + totalShown + '</b> de <b>' + items.length + '</b></span>'
            : '<span>Mostrando <b>' + totalShown + '</b></span>';
        const fHtmlR = APP.riesgoColapsado && Object.keys(APP.riesgoColapsado).filter((k) => APP.riesgoColapsado[k]).length
            ? '<span>' + Object.values(APP.riesgoColapsado).filter(Boolean).length + ' grupo(s) colapsado(s)</span>'
            : '';
        listaEl.insertAdjacentHTML('beforeend', '<div class="rondo-riesgo-foot">' + fHtml + fHtmlR + '</div>');
    }
    // Render de la dona SVG del hero.
    function renderRiesgoDona(stats) {
        const valEl = byId('rondo-riesgo-dona-val');
        if (valEl) valEl.textContent = stats.total;
        const radio = 28.5;
        const circ = 2 * Math.PI * radio;
        const seg = donutSegmentos(stats.alto, stats.medio, stats.bajo, 74, 9);
        const dash = donutDashArray(seg.segmentos, circ);
        const els = [
            byId('rondo-riesgo-dona-alto'),
            byId('rondo-riesgo-dona-medio'),
            byId('rondo-riesgo-dona-bajo'),
        ];
        let acc = 0;
        for (let i = 0; i < 3; i++) {
            const el = els[i];
            if (!el) continue;
            const d = dash[i];
            if (!d || d.fraccion <= 0 || stats.total === 0) {
                el.setAttribute('stroke-dasharray', '0 999');
                continue;
            }
            // stroke-dasharray: visible_len, (circ - visible_len) para que el resto sea hueco.
            el.setAttribute('stroke-dasharray', (d.len - 0.5) + ' ' + (circ + 1));
            // offset: empezamos donde termina el segmento previo (rotacion -90deg ya aplicada al SVG).
            acc += d.len;
            el.setAttribute('stroke-dashoffset', -(acc - d.len));
        }
    }
    // Render del histograma de scores (5 barras verticales).
    function renderRiesgoHistograma(hist) {
        const wrap = byId('rondo-riesgo-hist');
        if (!wrap) return;
        if (!hist.total) {
            wrap.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--rondo-fg-mute);font-size:10.5px">Sin datos</div>';
            return;
        }
        const lvlOf = (lo, hi) => {
            // Score maximo del bucket: alto >= 60, medio >= 20, bajo < 20.
            const mid = (lo + hi - 1) / 2;
            return nivelRiesgo(mid);
        };
        let html = '';
        for (let i = 0; i < hist.buckets.length; i++) {
            const b = hist.buckets[i];
            const c = hist.counts[i];
            const pct = hist.max ? Math.max(4, Math.round((c / hist.max) * 100)) : 0;
            const lvl = lvlOf(b[0], b[1]);
            const lbl = (b[0] === 80 ? '80+' : b[0] + '\u2013' + (b[1] - 1));
            html += '<div class="rondo-riesgo-hist-b" title="Score ' + lbl + ': ' + c + ' zonas">' +
                '<div class="bar ' + lvl + '" style="height:' + pct + '%"></div>' +
                '<div class="lbl">' + lbl + '</div>' +
                '</div>';
        }
        wrap.innerHTML = html;
    }
    // Render plano: una card por zona, sin agrupar.
    function renderZonasPlano(ordenadas) {
        const MAX = 500;
        const html = [];
        for (let i = 0; i < ordenadas.length && i < MAX; i++) html.push(renderZonaCard(ordenadas[i]));
        return html.join('');
    }
    // Render agrupado: un grupo colapsable por estado.
    function renderZonasAgrupadas(ordenadas) {
        const grupos = agruparPorEstado(ordenadas);
        const out = [];
        for (let i = 0; i < grupos.length; i++) {
            const g = grupos[i];
            const colapsado = !!(APP.riesgoColapsado && APP.riesgoColapsado[g.estado]);
            const max = Math.min(3, g.zonas.length);
            const meta = [];
            meta.push('<span class="pill"><b>' + g.count + '</b></span>');
            meta.push('<span class="pill ' + (nivelRiesgo(g.maxScore)) + '">max ' + g.maxScore + '</span>');
            if (g.municipios > 1) meta.push('<span class="pill">' + g.municipios + ' mun.</span>');
            const bodyHtml = g.zonas.map(renderZonaCard).join('');
            out.push(
                '<div class="rondo-riesgo-grupo' + (colapsado ? ' colapsado' : '') + '" data-estado="' + esc(g.estado) + '">' +
                '<div class="rondo-riesgo-grupo-head">' +
                '<span class="rondo-usym g-toggle">' + UIS.smallDown + '</span>' +
                '<span class="g-estado">' + esc(g.estado) + '</span>' +
                '<span class="g-meta">' + meta.join('') + '</span>' +
                '</div>' +
                '<div class="rondo-riesgo-grupo-body">' + bodyHtml + '</div>' +
                '</div>'
            );
        }
        return out.join('');
    }
    // Render de una sola card de zona (reusada por plano y agrupado).
    function renderZonaCard(z) {
        const score = Number(z.score) || 0;
        const nivel = nivelRiesgo(score);
        const estado = esc(z.estado || '?');
        const municipio = esc(z.municipio || '(sin municipio)');
        const radio = z.radio_m || 0;
        const lat = (z.lat != null) ? z.lat.toFixed(3) : (z.centro && z.centro[0] != null ? z.centro[0].toFixed(3) : '');
        const lon = (z.lon != null) ? z.lon.toFixed(3) : (z.centro && z.centro[1] != null ? z.centro[1].toFixed(3) : '');
        const coord = (lat && lon) ? (lat + ', ' + lon) : '';
        const detalle = delitosTop(z, 3);
        const fuenteTag = z.fuente ? '<span class="pill fuente" title="Fuente del dato">' + esc(z.fuente) + '</span>' : '';
        const idTag = z.id ? '<span class="pill" title="ID">' + esc(z.id) + '</span>' : '';
        // Boton copiar: data-acc="copy-zone" con data-eco apunta al index en APP.riesgo (no tenemos id estable).
        const idx = (APP.riesgo || []).indexOf(z);
        const dataIdx = idx >= 0 ? ' data-zona-idx="' + idx + '"' : '';
        return '<div class="rondo-riesgo-card ' + nivel + '"' + dataIdx +
            ' title="' + esc(riesgoDetalleHTML(z).replace(/<\/?b>/g, '')) + '">' +
            '<div class="rb-head">' +
                '<span class="rb-loc"><span class="rb-est">' + estado + '</span><span class="rb-mun"> \u00b7 ' + municipio + '</span></span>' +
                '<span class="rb-bar" title="Score ' + score + '/100"><span class="rb-bar-fill ' + nivel + '" style="width:' + score + '%"></span></span>' +
                '<span class="rb-score ' + nivel + '">' + score + '</span>' +
            '</div>' +
            (detalle ? '<div class="rb-sub">' + esc(detalle) + '</div>' : '') +
            '<div class="rb-meta">' +
                (radio ? '<span class="pill">buffer ' + radio + ' m</span>' : '') +
                (coord ? '<span class="pill coord">' + coord + '</span>' : '') +
                idTag +
                fuenteTag +
                '<span class="rb-actions">' +
                    '<button class="rondo-copy-zone" data-acc="copy-zone" data-zona-idx="' + idx + '" title="Copiar al portapapeles">' + UIS.copy + '</button>' +
                '</span>' +
            '</div>' +
            '</div>';
    }
    // Helper: actualiza el texto "n grupo(s) colapsado(s)" en el footer de la lista.
    function actualizarContadorColapsados(footEl) {
        if (!footEl) return;
        const n = (APP.riesgoColapsado && Object.values(APP.riesgoColapsado).filter(Boolean).length) || 0;
        const span = footEl.querySelector('.rondo-foot-grupos');
        if (n > 0) {
            if (span) span.textContent = n + ' grupo(s) colapsado(s)';
            else footEl.insertAdjacentHTML('beforeend', '<span class="rondo-foot-grupos">' + n + ' grupo(s) colapsado(s)</span>');
        } else if (span) {
            span.remove();
        }
    }

    setInterval(() => {
        if (panelEl.style.display === 'none') return;
        if (APP.tab === 'unidades') paintTabla();
        if (APP.tab === 'dash') paintKPI();
        if (APP.tab === 'rutas') paintRutas();
        if (APP.tab === 'zonas' && APP.zonasVista !== 'riesgo') paintGeocercas();
        if (APP.tab === 'caravana') paintCaravana();
        // Riesgo NO se repinta cada segundo para evitar parpadeo: solo se
        // re-pinta cuando cambian los datos, los filtros o se carga el dataset.
        byId('rondo-upd').innerHTML = '<span class="rondo-usym sm">' + UIS.clock + '</span> ' + new Date().toLocaleTimeString();
        if (nmActivo()) updateNoMolestar();
        paintStateBadge();
        paintInfo();
    }, 1000);

