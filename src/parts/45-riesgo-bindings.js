    /* ====================== RIESGO: BINDINGS ====================== */
    function bindRiesgo() {
        const wrap = byId('rondo-wrap-zonas');
        if (!wrap) return;
        // ── Delegacion de change en inputs/selects de la pestana ──────
        wrap.addEventListener('change', (e) => {
            const t = e.target;
            if (!t || !t.id) return;
            const cfg = APP.config;
            if (t.id === 'rondo-riesgo-url') {
                const newUrl = (t.value || '').trim();
                if (newUrl !== (cfg.riesgoUrl || '')) {
                    cfg.riesgoUrl = newUrl;
                    APP._riesgoFetched = newUrl;
                    writeJSON(LS.cfg, APP.config);
                    cargarRiesgo();
                }
            } else if (t.id === 'rondo-riesgo-formato-sel') {
                cfg.riesgoFormato = t.value || 'auto';
                writeJSON(LS.cfg, APP.config);
            } else if (t.id === 'rondo-riesgo-min') {
                cfg.riesgoMinScore = clamp(parseFloat(t.value) || DEFAULTS.riesgoMinScore, 0, 100);
                t.value = cfg.riesgoMinScore;
                writeJSON(LS.cfg, APP.config);
                paintRiesgo();
            } else if (t.id === 'rondo-riesgo-mul') {
                cfg.riesgoRadioMul = clamp(parseFloat(t.value) || DEFAULTS.riesgoRadioMul, 0.1, 5);
                t.value = cfg.riesgoRadioMul;
                writeJSON(LS.cfg, APP.config);
                paintRiesgo();
            } else if (t.id === 'rondo-riesgo-orden') {
                APP.riesgoOrden = t.value || 'score';
                paintRiesgo();
            } else if (t.id === 'rondo-riesgo-vista') {
                APP.riesgoVista = (t.value === 'plano') ? 'plano' : 'grupo';
                paintRiesgo();
            }
        });
        // ── Slider de score min: actualiza valor mostrado y repinta en vivo ──
        const slider = byId('rondo-riesgo-min');
        const sliderVal = byId('rondo-riesgo-min-val');
        if (slider && sliderVal) {
            slider.addEventListener('input', () => {
                sliderVal.textContent = slider.value;
                APP.config.riesgoMinScore = parseFloat(slider.value) || 0;
                paintRiesgo();
            });
            slider.addEventListener('change', () => {
                writeJSON(LS.cfg, APP.config);
            });
        }
        // ── Busqueda: input con debounce ──────────────────────────────
        const buscar = byId('rondo-riesgo-buscar');
        if (buscar) {
            let to = null;
            buscar.addEventListener('input', () => {
                clearTimeout(to);
                to = setTimeout(() => {
                    APP.riesgoFiltro = buscar.value || '';
                    paintRiesgo();
                }, 120);
            });
        }
        // ── Click delegation: chips, KPI, grupo, copy zone, etc. ──────
        wrap.addEventListener('click', (e) => {
            // Boton copiar de una card.
            const copyBtn = e.target.closest('[data-acc="copy-zone"]');
            if (copyBtn && wrap.contains(copyBtn)) {
                const idx = parseInt(copyBtn.dataset.zonaIdx, 10);
                const z = (APP.riesgo || [])[idx];
                if (z) copiarZonaRiesgo(z);
                return;
            }
            // Boton empty-state "Abrir Ajustes".
            const ajBtn = e.target.closest('#rondo-riesgo-empty-ajustes');
            if (ajBtn) {
                abrirAjustes();
                return;
            }
            // KPI: click para filtrar por ese nivel.
            const kpi = e.target.closest('.rondo-riesgo-kpi');
            if (kpi && kpi.dataset.kpiNivel) {
                APP.riesgoNivel = (APP.riesgoNivel === kpi.dataset.kpiNivel) ? 'todas' : kpi.dataset.kpiNivel;
                paintRiesgo();
                return;
            }
            // Chips de nivel.
            const chip = e.target.closest('.rondo-chip');
            if (chip && wrap.contains(chip) && chip.dataset.nivel) {
                APP.riesgoNivel = chip.dataset.nivel;
                paintRiesgo();
                return;
            }
            // Header de grupo: colapsar / expandir.
            const head = e.target.closest('.rondo-riesgo-grupo-head');
            if (head) {
                const grupo = head.closest('.rondo-riesgo-grupo');
                if (grupo && grupo.dataset.estado) {
                    APP.riesgoColapsado = APP.riesgoColapsado || {};
                    APP.riesgoColapsado[grupo.dataset.estado] = !grupo.classList.contains('colapsado');
                    grupo.classList.toggle('colapsado');
                    const f = wrap.querySelector('.rondo-riesgo-foot');
                    if (f) actualizarContadorColapsados(f);
                    return;
                }
            }
            // Limpiar filtros.
            const clearBtn = e.target.closest('#rondo-riesgo-limpiar-filtros, #rondo-riesgo-empty-clear');
            if (clearBtn) {
                APP.riesgoFiltro = '';
                APP.riesgoNivel = 'todas';
                APP.riesgoOrden = 'score';
                APP.riesgoVista = 'grupo';
                paintRiesgo();
                return;
            }
            // Expandir / colapsar todos los grupos.
            const expBtn = e.target.closest('#rondo-riesgo-expandir');
            if (expBtn) {
                const grupos = wrap.querySelectorAll('.rondo-riesgo-grupo');
                const todosColapsados = Array.from(grupos).every((g) => g.classList.contains('colapsado'));
                APP.riesgoColapsado = APP.riesgoColapsado || {};
                grupos.forEach((g) => {
                    const col = !todosColapsados;
                    g.classList.toggle('colapsado', col);
                    if (g.dataset.estado) APP.riesgoColapsado[g.dataset.estado] = col;
                });
                const f = wrap.querySelector('.rondo-riesgo-foot');
                if (f) actualizarContadorColapsados(f);
                return;
            }
        });
        // ── Drag and drop sobre la seccion de estado ───────────────────
        const dropZone = byId('rondo-riesgo-drop');
        if (dropZone) {
            ['dragenter', 'dragover'].forEach((evt) =>
                dropZone.addEventListener(evt, (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    dropZone.classList.add('drag-over');
                }));
            ['dragleave', 'drop'].forEach((evt) =>
                dropZone.addEventListener(evt, (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (evt === 'dragleave' && dropZone.contains(ev.relatedTarget)) return;
                    dropZone.classList.remove('drag-over');
                }));
            dropZone.addEventListener('drop', (ev) => {
                const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
                if (f) cargarRiesgoDesdeArchivo(f);
            });
        }
        // ── Botones de exportacion ────────────────────────────────────
        const csvBtn = byId('rondo-riesgo-csv');
        if (csvBtn) csvBtn.addEventListener('click', () => exportarRiesgoCSV());
        const geoBtn = byId('rondo-riesgo-geo');
        if (geoBtn) geoBtn.addEventListener('click', () => exportarRiesgoGeoJSON());
        const copiarBtn = byId('rondo-riesgo-copiar');
        if (copiarBtn) copiarBtn.addEventListener('click', () => copiarRiesgoFiltrado());
        // Boton "Exportar" grande (muestra menu).
        const exportBig = byId('rondo-riesgo-exportar');
        if (exportBig) exportBig.addEventListener('click', () => mostrarMenuExportarRiesgo());
        // ── Segmentado Geocercas / Riesgo (pestana Zonas) ─────────────
        const seg = byId('rondo-zonas-seg');
        if (seg) {
            seg.addEventListener('click', (ev) => {
                const b = ev.target.closest('.rondo-zseg');
                if (!b || !seg.contains(b) || !b.dataset.ztab) return;
                APP.zonasVista = b.dataset.ztab;
                aplicarZonasVista();
                if (APP.zonasVista === 'riesgo') paintRiesgo();
                else paintGeocercas();
            });
        }
        // ── Geocercas de la plataforma (pestana Zonas) ────────────────
        const geoRec = byId('rondo-geo-recargar');
        if (geoRec) geoRec.addEventListener('click', () => recargarGeocercas());
        const geoCfg = byId('rondo-geo-configurar');
        if (geoCfg) geoCfg.addEventListener('click', () => abrirAjustes());
        // v5.15: filtros, orden y acciones de las geocercas.
        const geoBuscar = byId('rondo-geo-buscar');
        let _geoBusqT = null;
        if (geoBuscar) geoBuscar.addEventListener('input', () => {
            clearTimeout(_geoBusqT);
            _geoBusqT = setTimeout(() => { APP.geoFiltro = geoBuscar.value.trim(); paintGeocercas(); }, 120);
        });
        const geoOrdenEl = byId('rondo-geo-orden');
        if (geoOrdenEl) geoOrdenEl.addEventListener('change', () => { APP.geoOrden = geoOrdenEl.value; paintGeocercas(); });
        const geoRolEl = byId('rondo-geo-rol');
        if (geoRolEl) geoRolEl.addEventListener('change', () => { APP.geoRol = geoRolEl.value; paintGeocercas(); });
        const geoCsv = byId('rondo-geo-csv');
        if (geoCsv) geoCsv.addEventListener('click', exportarGeocercasCSV);
        const geoGeo = byId('rondo-geo-geo');
        if (geoGeo) geoGeo.addEventListener('click', exportarGeocercasGeoJSON);
        const geoBody = byId('rondo-body-zonas');
        if (geoBody) geoBody.addEventListener('click', (ev) => {
            const b = ev.target.closest && ev.target.closest('button');
            if (!b) return;
            const nombre = b.dataset.zona;
            const z = (APP.zonas || []).find((x) => (x.n || '') === nombre);
            if (!z) return;
            if (b.classList.contains('rondo-geo-usar')) elegirUnidadParaGeocerca(z);
            else if (b.classList.contains('rondo-geo-copy')) {
                const c = centroDeZona(z);
                copiarAlPortapapeles((z.n || '') + (c ? '\n' + c.lat.toFixed(6) + ',' + c.lon.toFixed(6) : ''), 'Geocerca copiada', z.n || '');
            }
        });
        // ── Botones existentes (recargar / limpiar / archivo) ─────────
        const rec = byId('rondo-riesgo-recargar');
        if (rec) rec.addEventListener('click', () => cargarRiesgo());
        const lim = byId('rondo-riesgo-limpiar');
        if (lim) {
            lim.addEventListener('click', () => {
                APP.riesgo = null;
                APP.riesgoErr = null;
                APP.riesgoEstado = 'idle';
                APP.riesgoTs = 0;
                paintRiesgo();
            });
        }
    }
    // Lee un archivo CSV/JSON y lo aplica como dataset de riesgo.
    function cargarRiesgoDesdeArchivo(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = String(ev.target.result || '');
            const trimmed = text.trim();
            let items = [];
            let fmt = trimmed.length && (trimmed[0] === '[' || trimmed[0] === '{') ? 'json' : 'csv';
            try {
                if (fmt === 'json') {
                    const data = JSON.parse(trimmed);
                    items = _itemsFromJSON(data);
                } else {
                    items = _itemsFromCSV(trimmed);
                }
            } catch (e1) {
                APP.riesgoErr = 'Archivo invalido: ' + (e1 && e1.message || '');
                APP.riesgo = null;
                APP.riesgoEstado = 'error';
                paintRiesgo();
                return;
            }
            if (!items.length) {
                APP.riesgoErr = 'Archivo sin items reconocibles (revisa columnas lat/lon)';
                APP.riesgo = null;
                APP.riesgoEstado = 'error';
                paintRiesgo();
                return;
            }
            APP.riesgo = items;
            APP.riesgoErr = null;
            APP.riesgoTs = Date.now();
            APP.riesgoEstado = 'ok';
            // El archivo cargado reemplaza la URL: dejamos constancia.
            APP._riesgoFetched = (APP.config && APP.config.riesgoUrl) || 'archivo local';
            paintRiesgo();
            if (APP.unlocked) {
                try { console.log('[Rondo] riesgo cargado desde archivo:', items.length, 'zonas'); } catch (_) {}
            }
            adviceOk('Dataset cargado', items.length + ' zonas');
        };
        reader.onerror = () => {
            APP.riesgoErr = 'No se pudo leer el archivo';
            APP.riesgo = null;
            APP.riesgoEstado = 'error';
            paintRiesgo();
        };
        reader.readAsText(file);
    }

