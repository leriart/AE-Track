/* ====================== EVENTOS ====================== */
    function bindEvents() {
        mainBtn.addEventListener('click', () => {
            const ta = byId('rondo-txt'); if (ta) ta.value = '';
            pintarModalLista();
            modalEl.style.display = 'flex';
            const ni = byId('rondo-modal-new-eco'); if (ni) ni.focus();
        });
        function abrirModalLista(prefill) {
            const ta = byId('rondo-txt');
            if (ta) ta.value = prefill ? prefill : '';
            pintarModalLista();
            modalEl.style.display = 'flex';
            const ni = byId('rondo-modal-new-eco'); if (ni) ni.focus();
        }
        byId('rondo-cancelar').addEventListener('click', () => {
            modalEl.style.display = 'none';
            const ta = byId('rondo-txt'); if (ta) ta.value = '';
            const ni = byId('rondo-modal-new-eco'); if (ni) ni.value = '';
        });
        byId('rondo-modal-parse').addEventListener('click', () => {
            const ta = byId('rondo-txt');
            const n = parsearPegado(ta ? ta.value : '');
            if (ta) ta.value = '';
            pintarModalLista();
            paintInfo();
            adviceOk('Pegado', n + ' unidad(es) procesadas');
        });
        byId('rondo-orden-pegado').addEventListener('click', () => aplicarOrdenModo('pegado'));
        byId('rondo-orden-numero').addEventListener('click', () => aplicarOrdenModo('numero'));
        byId('rondo-orden-numero-desc').addEventListener('click', () => aplicarOrdenModo('numero-desc'));
        byId('rondo-orden-alfabetico').addEventListener('click', () => aplicarOrdenModo('alfabetico'));
        byId('rondo-orden-invertir').addEventListener('click', () => aplicarOrdenModo('invertir'));
        inicializarDragLista();
        byId('rondo-modal-clear-txt').addEventListener('click', () => {
            const ta = byId('rondo-txt'); if (ta) ta.value = '';
            ta && ta.focus();
        });
        byId('rondo-modal-add').addEventListener('click', () => {
            const ne = byId('rondo-modal-new-eco');
            const eco = ne ? ne.value.trim() : '';
            if (!eco) { if (ne) ne.focus(); return; }
            agregarALista(eco, '');
            if (ne) ne.value = '';
            pintarModalLista();
            paintInfo();
            if (ne) ne.focus();
        });
        byId('rondo-modal-add-plan').addEventListener('click', () => {
            const ne = byId('rondo-modal-new-eco');
            const eco = ne ? ne.value.trim() : '';
            if (!eco) { if (ne) ne.focus(); return; }
            agregarALista(eco, '');
            if (ne) ne.value = '';
            pintarModalLista();
            paintInfo();
            abrirEditorParadas(eco);
        });
        const unidadesMenu = byId('rondo-unidades-menu');
        if (unidadesMenu) unidadesMenu.addEventListener('click', () => abrirModalLista(''));
        byId('rondo-modal-vaciar').addEventListener('click', () => {
            rondoConfirm('Vaciar la lista', 'Se quitaran todas las unidades de la lista vigilada. Esta accion no se puede deshacer.', () => {
                APP.watchMap = {};
                guardarLista();
                pintarModalLista();
                paintInfo();
                adviceOk('Lista vaciada');
            }, { peligro: true, okText: 'Vaciar' });
        });
        document.getElementById('rondo-modal-lista').addEventListener('click', (e) => {
            const b = e.target.closest && e.target.closest('button');
            const eco = (b && b.dataset && b.dataset.eco) || (e.target.dataset && e.target.dataset.eco);
            if (!eco) return;
            if (b && b.classList.contains('rondo-plan-open')) {
                abrirEditorParadas(eco);
                return;
            }
            if (b && b.classList.contains('rondo-del')) {
                quitarDeLista(eco);
                pintarModalLista();
                paintInfo();
            }
        });
        // Nota (v5.15.2): los destinos y multipuntos se editan en el editor
        // unificado "Paradas" de cada fila (abrirEditorParadas), no en un
        // input en linea. Pegar texto sigue soportando "eco=destino" y
        // "eco=A | B | C".
        byId('rondo-ejecutar').addEventListener('click', async () => {
            const ta = byId('rondo-txt');
            const texto = ta ? ta.value : '';
            if (texto && texto.trim()) parsearPegado(texto);
            const ecos = Object.keys(APP.watchMap);
            if (!ecos.length) {
                advice('Lista vacía', 'Añade al menos una unidad.');
                return;
            }
            modalEl.style.display = 'none';
            await execList(ecos);
            if (ta) ta.value = '';
        });
        closeBtn.addEventListener('click', (e) => cerrarTodasSeguro(e.currentTarget));
        panelBtn.addEventListener('click', () => {
            togglePanel();
            paintPanel();
        });
        if (railEl) railEl.addEventListener('click', togglePanel);
        byId('rondo-sb-main').addEventListener('click', () => mainBtn.click());
        byId('rondo-sb-close').addEventListener('click', (e) => cerrarTodasSeguro(e.currentTarget));
        byId('rondo-sb-panel').addEventListener('click', alternarVentanas);
        pintarBotonVentanas();
        byId('rondo-sb-mas').addEventListener('click', () => rxAjustarVentanas(1));
        byId('rondo-sb-menos').addEventListener('click', () => rxAjustarVentanas(-1));
        // Clic fuera del panel en modo barra lateral: se oculta.
        document.addEventListener('pointerdown', (e) => {
            if (!APP.config.ocultarAlClicFuera) return;
            if (e.button !== 0) return;
            if (!esLateral() || APP.panelHidden) return;
            const t = e.target;
            if (!t || !t.closest) return;
            if (esUIPropia(t)) return;
            ocultarSidebar();
        }, true);
        byId('rondo-cerrar-panel').addEventListener('click', () => { if (!APP.panelHidden) togglePanel(); });
        byId('rondo-collapse').addEventListener('click', togglePanel);
        byId('rondo-ayuda-btn').addEventListener('click', () => { ayudaEl.style.display = 'flex'; });
        helpBtn.addEventListener('click', () => { ayudaEl.style.display = 'flex'; });
        byId('rondo-ayuda-x').addEventListener('click', () => { ayudaEl.style.display = 'none'; });
        byId('rondo-ayuda-cerrar').addEventListener('click', () => { ayudaEl.style.display = 'none'; });
        byId('rondo-ayuda-config').addEventListener('click', () => {
            ayudaEl.style.display = 'none';
            abrirCfg();
        });
        byId('rondo-refresh').addEventListener('click', (e) => conBusy(e.currentTarget, refresh));
        const rutasTrazar = byId('rondo-rutas-trazar');
        if (rutasTrazar) rutasTrazar.addEventListener('click', (e) => conBusy(e.currentTarget, () => trazarRutasAhora()));
        const rutasVentanas = byId('rondo-rutas-ventanas');
        if (rutasVentanas) rutasVentanas.addEventListener('click', () => rxMapaVentanasToggle());
        byId('rondo-csv').addEventListener('click', exportUnits);
        byId('rondo-csv-al').addEventListener('click', exportAlertas);
        byId('rondo-informe').addEventListener('click', exportInforme);
        const listaRutasEl = byId('rondo-lista-rutas');
        if (listaRutasEl) {
            listaRutasEl.addEventListener('click', (e) => {
                const b = e.target.closest && e.target.closest('button');
                if (!b) return;
                const eco = b.dataset.eco;
                if (b.classList.contains('rondo-ruta-del')) {
                    rondoConfirm('Eliminar ruta', 'Se eliminara la ruta planificada de ' + eco + '.', () => {
                        if (eliminarRuta(eco)) adviceOk('Ruta eliminada', eco); else adviceWarn('Sin ruta', eco);
                    }, { peligro: true, okText: 'Eliminar', icon: UIS.close });
                } else if (b.classList.contains('rondo-plan-edit')) abrirEditorParadas(eco);
                else if (b.classList.contains('rondo-ruta-trazar')) {
                    const it = unitByEco(eco);
                    const destino = it ? watchDest(it.info) : '';
                    if (!destino) { adviceWarn('Sin destino', eco); }
                    else {
                        if (it) delete APP.rutaIntentos[it.info.clave];
                        planearRuta(eco, destino, null, (APP.config.autoRutaModo === 'astar' && APP.config.overpass) ? 'astar' : 'osrm');
                    }
                }
                else if (b.classList.contains('rondo-ruta-mapa')) rxMapaDibujarRuta(eco);
                else if (b.classList.contains('rondo-ruta-gmaps')) rxRutaGoogleMaps(eco);
                else if (b.classList.contains('rondo-ruta-geo')) exportRutaGeoJSON(eco);
                else if (b.classList.contains('rondo-traza-geo')) exportTraza(eco);
                else if (b.classList.contains('rondo-ruta-calc')) {
                    const it = unitByEco(eco);
                    const r = it ? rutaDe(it.info) : APP.rutas[eco];
                    if (r) planearRuta(eco, r.plan || r.destinoTexto || (r.destino.lat + ',' + r.destino.lon), null, r.modo);
                }
            });
        }
        const listaViajesEl = byId('rondo-lista-viajes');
        if (listaViajesEl) {
            listaViajesEl.addEventListener('click', (e) => {
                const b = e.target.closest && e.target.closest('button');
                if (!b) return;
                const eco = b.dataset.eco;
                if (b.classList.contains('rondo-viaje-geo')) exportViajeGeoJSON(eco);
                else if (b.classList.contains('rondo-viaje-re')) analizarViaje(eco, false);
            });
        }
        byId('rondo-captura').addEventListener('click', (e) => conBusy(e.currentTarget, captureSelection));
        byId('rondo-verifica').addEventListener('click', (e) => conBusy(e.currentTarget, () => verifyWindows(false)));
        byId('rondo-sel-all').addEventListener('click', () => { selectAllVisible(); });
        byId('rondo-sel-clear').addEventListener('click', () => { clearSelection(); });
        byId('rondo-verif').addEventListener('click', () => {
            APP.config.verificar = !APP.config.verificar;
            writeJSON(LS.cfg, APP.config);
            restartVerificationLoop();
            advice('Verificación ' + (APP.config.verificar ? 'activada' : 'desactivada'),
                APP.config.verificar ? 'Solo se mantendran las ventanas seleccionadas' : '');
        });
        byId('rondo-filtro').addEventListener('input', (e) => {
            APP.filtro = e.target.value;
            if (APP.tab === 'alertas') paintAlertas();
            else if (APP.tab === 'unidades') paintTabla();
        });
        const selEst = byId('rondo-filtro-estado');
        if (selEst) {
            selEst.value = APP.filtEstado || 'todas';
            selEst.addEventListener('change', (e) => {
                APP.filtEstado = e.target.value;
                writeJSON(LS.filtEstado, APP.filtEstado);
                if (APP.tab === 'unidades') paintTabla();
            });
        }
        const selOrden = byId('rondo-orden-sel');
        if (selOrden) {
            selOrden.addEventListener('change', (e) => {
                const modo = e.target.value;
                if (modo) aplicarOrdenModo(modo);
                e.target.value = '';
            });
        }
        const ordenUnid = byId('rondo-uni-orden');
        if (ordenUnid) {
            ordenUnid.addEventListener('change', () => {
                APP.sortCol = ordenUnid.value || '';
                if (APP.sortCol) APP.sortDir = APP.sortDir || 'asc';
                writeJSON(LS.sortCol, APP.sortCol);
                writeJSON(LS.sortDir, APP.sortDir);
                paintTabla();
            });
        }
        const dirUnid = byId('rondo-uni-dir');
        if (dirUnid) {
            dirUnid.addEventListener('click', () => {
                APP.sortDir = (APP.sortDir === 'desc') ? 'asc' : 'desc';
                writeJSON(LS.sortDir, APP.sortDir);
                paintTabla();
            });
        }
        // Dashboard: KPI clicables (filtran Unidades) y filas de "Requieren atención".
        const dashEl = byId('rondo-dash');
        if (dashEl) {
            dashEl.addEventListener('click', (e) => {
                const item = e.target.closest && e.target.closest('.rondo-atencion-item');
                if (item && item.dataset.eco) { openUnitWindow(item.dataset.eco); return; }
                const kpi = e.target.closest && e.target.closest('.kpi[data-kpi]');
                if (!kpi) return;
                const acc = kpi.dataset.kpi;
                if (acc === 'alertas') { setTab('alertas'); return; }
                if (acc === 'zonas') { setTab('zonas'); return; }
                APP.filtEstado = (acc === 'online') ? 'todas' : acc;
                const selF = byId('rondo-filtro-estado');
                if (selF) selF.value = APP.filtEstado;
                writeJSON(LS.filtEstado, APP.filtEstado);
                setTab('unidades');
            });
        }
        document.addEventListener('pointerdown', unlockAudio, { once: true });
        document.addEventListener('keydown', unlockAudio, { once: true });
        document.querySelectorAll('#rondo-tabs .tab').forEach((t) =>
            t.addEventListener('click', () => setTab(t.dataset.tab)));
        document.querySelectorAll('#rondo-filtroseveridad span').forEach((s) =>
            s.addEventListener('click', () => { APP.filtSever = s.dataset.sev; paintAlertas(); }));
        // Delegacion: click en un boton "IA" dentro de una tarjeta de Avisos.
        // Usamos un solo listener en el contenedor.
        const listaAlertasEl = byId('rondo-lista-alertas');
        if (listaAlertasEl) listaAlertasEl.addEventListener('click', (ev) => {
            const btn = ev.target.closest && ev.target.closest('.rondo-ia-btn');
            if (!btn) return;
            ev.preventDefault();
            aiAnalizarAviso(btn.dataset.clave, +btn.dataset.ts);
        });
        // v5.14.1: chip de version en cabecera. Click fuerza una comprobacion;
        // doble click abre la pestana de Ajustes > Avanzado donde esta el
        // boton 'Buscar actualizaciones' y el detalle completo.
        const verChip = byId('rondo-version-chip');
        if (verChip) {
            let lastClickChip = 0;
            verChip.addEventListener('click', (e) => {
                const ahora = Date.now();
                if (ahora - lastClickChip < 350) {
                    // doble click: abrir Ajustes > Avanzado
                    abrirCfg();
                    const tab = document.querySelector('#rondo-cfg-tabs .cfg-tab[data-cfg="avanzado"]');
                    if (tab) tab.click();
                    lastClickChip = 0;
                    return;
                }
                lastClickChip = ahora;
                // Si hay update disponible (o modulos desfasados por cache),
                // aplicar/reinstalar; si no, forzar re-comprobacion.
                if (APP.update && APP.update.state === 'available') {
                    aplicarActualizacion();
                } else if (APP.update && APP.update.state === 'stale') {
                    // Reinstalar fuerza al gestor a re-descargar los @require.
                    try { window.open(UPDATE_URL, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
                    advice('Reinstalando modulos', 'Confirma la instalacion en el gestor de userscripts y recarga la pagina.');
                } else {
                    APP.update.notificado = false;
                    comprobarActualizacion();
                }
                e.stopPropagation();
            });
        }
        byId('rondo-tema').addEventListener('click', () => {
            APP.config.theme = APP.config.theme === 'oscuro' ? 'claro' : (APP.config.theme === 'claro' ? 'auto' : 'oscuro');
            writeJSON(LS.cfg, APP.config);
            applyTheme();
            advice('Tema', APP.config.theme);
        });
        byId('rondo-ia').addEventListener('click', () => toggleIA());
        // Despues de Guardar config: repintar Avisos para que aparezcan/
        // desaparezcan los botones "IA" segun iaHabilitada + iaApiKey.
        // Se hace en cerrarCfg/Guardar abajo, pero nos aseguramos tambien
        // cuando cambia el tema u otras opciones que afectan la UI.
        const _repintarAlertasSi = () => { if (APP.tab === 'alertas') paintAlertas(); };
        byId('rondo-actualizar').addEventListener('click', aplicarActualizacion);
        updateBtn.addEventListener('click', aplicarActualizacion);
        byId('rondo-nmolestar').addEventListener('click', () => { toggleNoMolestar(); });
        byId('rondo-test-btn').addEventListener('click', testNotify);
        byId('rondo-exportar-btn').addEventListener('click', exportConfig);
        byId('rondo-importar-btn').addEventListener('click', importConfig);
        foldBtn.addEventListener('click', () => {
            APP.barra.plegada = !APP.barra.plegada;
            applyBar();
        });
        gripEl.addEventListener('dblclick', () => {
            APP.barra.vertical = !APP.barra.vertical;
            applyBar();
            advice('Barra', APP.barra.vertical ? 'orientacion vertical' : 'orientacion horizontal');
        });

        document.getElementById('rondo-body').addEventListener('change', (e) => {
            if (!e.target.classList.contains('rondo-sel')) return;
            e.stopPropagation();
            const eco = e.target.dataset.eco || '';
            const placa = e.target.dataset.placa || '';
            if (e.target.checked) addToSelection(eco, placa);
            else removeFromSelection(eco, placa);
            const card = e.target.closest('.fila');
            if (card) card.classList.toggle('sel-row', !!e.target.checked);
        });
        document.getElementById('rondo-body').addEventListener('click', (e) => {
            if (e.target.classList && (e.target.classList.contains('rondo-sel') || e.target.closest('label.u-check'))) {
                e.stopPropagation();
                return;
            }
            const card = e.target.closest('.fila');
            if (!card) return;
            const eco = card.dataset.eco;
            if (!eco) return;
            const btn = e.target.closest('button');
            const cl = btn ? btn.classList : null;
            if (cl && cl.contains('rondo-sil')) {
                if (APP.dismissed.has(eco)) APP.dismissed.delete(eco); else APP.dismissed.add(eco);
                writeSession(SS.dismissed, Array.from(APP.dismissed));
                paintTabla();
                return;
            }
            if (cl && cl.contains('u-open')) { openUnitWindow(eco); return; }
            if (cl && cl.contains('u-route')) { abrirEditorParadas(eco); return; }
            if (cl && cl.contains('u-map')) { openMap(eco, 'osm'); return; }
            if (cl && cl.contains('u-watch')) {
                if (APP.watchMap[eco] !== undefined) { quitarDeLista(eco); adviceOk('Quitada de la lista', eco); }
                else { agregarALista(eco, ''); adviceOk('Anadida a la lista', eco); }
                paintTabla();
                return;
            }
            openUnitWindow(eco);
        });
        document.getElementById('rondo-body').addEventListener('contextmenu', (e) => {
            const card = e.target.closest && e.target.closest('.fila');
            const eco = card ? card.dataset.eco : null;
            if (!eco) return;
            e.preventDefault();
            const it = unitByEco(eco);
            const lim = it ? limiteDe(it.info) : APP.config.velMax;
            const silenciado = APP.dismissed.has(eco);
            const enLista = APP.watchMap[eco] !== undefined;
            showMenu(e.clientX, e.clientY, [
                { id: 'open', icon: UIS.panel, label: 'Abrir ventana' },
                { id: 'sil', icon: silenciado ? UIS.mute : UIS.alertas, label: silenciado ? 'Reactivar avisos' : 'Silenciar esta unidad' },
                { id: 'verif', icon: UIS.check, label: 'Aplicar verificación' },
                { sep: 1 },
                { id: 'lista', icon: UIS.watch, label: enLista ? 'Quitar de lista vigilada' : 'Añadir a lista vigilada' },
                { id: 'limite', icon: UIS.speed, label: 'Límite de velocidad (actual ' + lim + ' km/h)' },
                { sep: 1 },
                { id: 'ruta-paradas', icon: UIS.route, label: 'Destinos y paradas (multipunto)…' },
                { id: 'ruta-mapa', icon: UIS.map, label: 'Dibujar ruta en el mapa de la plataforma' },
                { id: 'ruta-mapa-diag', icon: UIS.info, label: 'Diagnosticar mapa (consola)' },
                { id: 'ruta-gmaps', icon: UIS.pin, label: 'Abrir ruta en Google Maps' },
                { id: 'ruta-osm', icon: UIS.zone, label: 'Abrir ruta en OpenStreetMap' },
                { id: 'ruta-geo', icon: UIS.export, label: 'Exportar ruta GeoJSON' },
                { id: 'ruta-del', icon: UIS.close, label: 'Eliminar ruta' },
                { id: 'traza-geo', icon: UIS.csv, label: 'Exportar traza GeoJSON' },
                { id: 'viaje-analizar', icon: UIS.clock, label: 'Analizar viaje (historial)' },
                { id: 'viaje-geo', icon: UIS.export, label: 'Exportar viaje GeoJSON' },
                { id: 'odo-reset', icon: UIS.refresh, label: 'Reiniciar odómetro' },
                { sep: 1 },
                { id: 'mapa-osm', icon: UIS.zone, label: 'Ver en OpenStreetMap' },
                { id: 'mapa-google', icon: UIS.zone, label: 'Ver en Google Maps' },
                { id: 'copy-eco', icon: UIS.copy, label: 'Copiar economico' },
                { id: 'copy-placa', icon: UIS.copy, label: 'Copiar placa' },
                { id: 'copy-coords', icon: UIS.copy, label: 'Copiar coordenadas' }
            ], card);
            ctxEl._target = { eco };
        });
        ctxEl.addEventListener('click', (e) => {
            // El clic puede caer en el icono SVG dentro de la opcion: subimos
            // al .op para leer su data-acc (antes, pulsar el icono no hacia nada).
            const op = e.target.closest && e.target.closest('.op');
            const acc = op ? op.dataset.acc : (e.target.dataset && e.target.dataset.acc);
            if (!acc || !ctxEl._target) return;
            const eco = ctxEl._target.eco;
            if (acc === 'open') openUnitWindow(eco);
            else if (acc === 'sil') {
                if (APP.dismissed.has(eco)) APP.dismissed.delete(eco); else APP.dismissed.add(eco);
                writeSession(SS.dismissed, Array.from(APP.dismissed));
                paintTabla();
            } else if (acc === 'verif') verifyWindows(false);
            else if (acc === 'lista') {
                if (APP.watchMap[eco] !== undefined) { quitarDeLista(eco); adviceOk('Quitada de la lista', eco); }
                else { agregarALista(eco, ''); adviceOk('Anadida a la lista', eco); }
                paintTabla();
            } else if (acc === 'limite') {
                const it = unitByEco(eco);
                const actual = it ? limiteDe(it.info) : APP.config.velMax;
                rondoPrompt('Límite de velocidad', 'Para ' + eco + '. Dejalo vacio para usar el global (' + APP.config.velMax + ' km/h).', actual, (val) => {
                    setLimite(eco, val);
                    adviceOk('Límite actualizado', eco + ': ' + (APP.limites[eco] ? APP.limites[eco] + ' km/h' : 'global ' + APP.config.velMax + ' km/h'));
                }, { type: 'number', icon: UIS.speed, okText: 'Guardar' });
            } else if (acc === 'ruta-paradas') abrirEditorParadas(eco);
            else if (acc === 'ruta-mapa') rxMapaDibujarRuta(eco);
            else if (acc === 'ruta-mapa-diag') rxMapaDiagnostico();
            else if (acc === 'ruta-gmaps') rxRutaGoogleMaps(eco);
            else if (acc === 'ruta-osm') rxRutaOSM(eco);
            else if (acc === 'ruta-geo') exportRutaGeoJSON(eco);
            else if (acc === 'ruta-del') {
                rondoConfirm('Eliminar ruta', 'Se eliminara la ruta planificada de ' + eco + '.', () => {
                    if (eliminarRuta(eco)) adviceOk('Ruta eliminada', eco); else adviceWarn('Sin ruta', eco);
                }, { peligro: true, okText: 'Eliminar', icon: UIS.close });
            } else if (acc === 'traza-geo') exportTraza(eco);
            else if (acc === 'viaje-analizar') analizarViaje(eco, false);
            else if (acc === 'viaje-geo') exportViajeGeoJSON(eco);
            else if (acc === 'odo-reset') {
                rondoConfirm('Reiniciar odómetro', 'El odómetro acumulado de ' + eco + ' volverá a 0 km.', () => resetOdometro(eco), { okText: 'Reiniciar', icon: UIS.refresh });
            }
            else if (acc === 'mapa-osm') openMap(eco, 'osm');
            else if (acc === 'mapa-google') openMap(eco, 'google');
            else if (acc === 'copy-eco') { copyToClipboard(eco); advice('Copiado', eco); }
            else if (acc === 'copy-placa') {
                const u = APP.unidades.find((x) => parseUnitName(x).eco === eco);
                const placa = u ? parseUnitName(u).placa : '';
                copyToClipboard(placa);
                advice('Copiado', placa || eco);
            } else if (acc === 'copy-coords') {
                const it = unitByEco(eco);
                const txt = (it && it.st.lat != null) ? (it.st.lat + ',' + it.st.lon) : '';
                if (!txt) adviceWarn('Sin ubicación', 'La unidad no reporta coordenadas');
                else { copyToClipboard(txt); advice('Coordenadas copiadas', txt); }
            }
            hideMenu();
        });

        document.querySelectorAll('#rondo-cfg-tabs .cfg-tab').forEach((b) => b.addEventListener('click', () => {
            document.querySelectorAll('#rondo-cfg-tabs .cfg-tab').forEach((x) => x.classList.remove('activo'));
            b.classList.add('activo');
            const sel = b.dataset.cfg;
            document.querySelectorAll('#rondo-config .cfg-pane').forEach((p) => {
                p.style.display = (p.dataset.cfg === sel) ? '' : 'none';
            });
        }));

        function abrirCfg() {
            limpiarCfgDirty();
            const g = (id) => byId(id);
            g('c-poll').value = APP.config.pollMs;
            g('c-off').value = APP.config.offlineMin;
            g('c-cd').value = APP.config.cooldownMin;
            g('c-gps').value = APP.config.gpsMin;
            g('c-stop').value = APP.config.stopMin;
            g('c-zona').value = APP.config.zonaMin;
            g('c-desco').value = APP.config.descoMin;
            g('c-vel').value = APP.config.velMax;
            g('c-toastSeg').value = APP.config.toastSeg;
            g('c-sevmin').value = APP.config.severidadMin;
            g('c-voz').checked = !!APP.config.voice;
            g('c-voz-lang').value = APP.config.voiceLang || 'es-MX';
            g('c-voz-motor').value = APP.config.vozMotor || 'web';
            const vozTestTextEl = byId('c-voz-test-text');
            if (vozTestTextEl) vozTestTextEl.value = APP.config.vozTest || DEFAULTS.vozTest;
            poblarVozSelect();
            // Pestana IA: precarga valores. La API key se enmascara al
            // mostrarla (nunca el texto plano en el DOM).
            const iaOnEl = byId('c-ia-on');
            if (iaOnEl) iaOnEl.checked = !!APP.config.iaHabilitada;
            const iaProvEl = byId('c-ia-prov');
            if (iaProvEl) iaProvEl.value = APP.config.iaProveedor || 'deepseek';
            const iaKeyEl = byId('c-ia-key');
            if (iaKeyEl) iaKeyEl.value = APP.config.iaApiKey ? '********' : '';
            const iaEndpointEl = byId('c-ia-endpoint');
            if (iaEndpointEl) iaEndpointEl.value = APP.config.iaEndpoint || '';
            const iaModeloEl = byId('c-ia-modelo');
            if (iaModeloEl) iaModeloEl.value = APP.config.iaModelo || '';
            const iaTempEl = byId('c-ia-temp');
            if (iaTempEl) iaTempEl.value = (APP.config.iaTemperature == null ? '' : APP.config.iaTemperature);
            const iaMaxTokEl = byId('c-ia-maxtok');
            if (iaMaxTokEl) iaMaxTokEl.value = (APP.config.iaMaxTokens == null ? '' : APP.config.iaMaxTokens);
            const iaRadioEl = byId('c-ia-radio');
            if (iaRadioEl) iaRadioEl.value = APP.config.iaRadioPoisM != null ? APP.config.iaRadioPoisM : 250;
            const iaTimeoutEl = byId('c-ia-timeout');
            if (iaTimeoutEl) iaTimeoutEl.value = APP.config.iaTimeoutS != null ? APP.config.iaTimeoutS : 25;
            // v6.0.9: contexto ampliado por API y reporte del servidor.
            const iaCtxEl = byId('c-ia-contexto-api');
            if (iaCtxEl) iaCtxEl.checked = APP.config.iaContextoAPI !== false;
            const iaRepEl = byId('c-ia-reporte-servidor');
            if (iaRepEl) iaRepEl.checked = !!APP.config.iaReporteServidor;
            // v5.14: analisis en lote + resumen + limite diario.
            const iaResumenEl = byId('c-ia-resumen-on');
            if (iaResumenEl) iaResumenEl.checked = !!APP.config.iaResumenInforme;
            const iaBatchmaxEl = byId('c-ia-batchmax');
            if (iaBatchmaxEl) iaBatchmaxEl.value = APP.config.iaBatchMax != null ? APP.config.iaBatchMax : DEFAULTS.iaBatchMax;
            const iaLimiteEl = byId('c-ia-limite');
            if (iaLimiteEl) iaLimiteEl.value = APP.config.iaLimiteDiario != null ? APP.config.iaLimiteDiario : DEFAULTS.iaLimiteDiario;
            paintIAUso();
            const iaStatusEl = byId('c-ia-status');
            if (iaStatusEl) iaStatusEl.textContent = '';
            actualizarNotaProveedorIA();
            g('c-beep').checked = !!APP.config.beep;
            g('c-beep-vol').value = APP.config.beepVol;
            g('c-beep-vol').step = '0.01';
            g('c-desktop').checked = !!APP.config.desktop;
            g('c-watchAll').checked = !!APP.config.watchAll;
            g('c-auto').checked = !!APP.config.autoOpen;
            g('c-zonas').checked = !!APP.config.loadZones;
            g('c-geo').checked = !!APP.config.geocode;
            g('c-hist').checked = !!APP.config.historico;
            const cGeoPais = byId('c-geo-pais'); if (cGeoPais) cGeoPais.value = APP.config.geoPais || '';
            const cGeoBias = byId('c-geo-bias'); if (cGeoBias) cGeoBias.value = (APP.config.geoBiasKm != null ? APP.config.geoBiasKm : DEFAULTS.geoBiasKm);
            g('c-verif').checked = !!APP.config.verificar;
            g('c-verif-seg').value = APP.config.verifSeg;
            g('c-tema').value = APP.config.theme;
            g('c-dens').value = APP.config.density;
            g('c-escala').value = String(normalizarEscala(APP.config.escalaUI));
            g('c-acento').value = APP.config.acento || '#850D22';
            g('c-coords').checked = !!APP.config.mostrarCoords;
            g('c-contornos').checked = !!APP.config.contornos;
            g('c-contorno-horas').value = APP.config.contornoHoras;
            g('c-panel-clicfuera').checked = !!APP.config.ocultarAlClicFuera;
            g('c-confirmar-cierre').checked = !!APP.config.confirmarCierre;
            g('c-panel-lado').value = APP.config.panelLado || 'derecha';
            g('c-panel-ancho').value = APP.config.panelAncho || 460;
            g('c-r-off').checked = !!APP.config.reglas.offline;
            g('c-r-gps').checked = !!APP.config.reglas.gpsPerdido;
            g('c-r-det').checked = !!APP.config.reglas.detenido;
            g('c-r-zona').checked = !!APP.config.reglas.zona;
            g('c-r-geo').checked = !!APP.config.reglas.geocerca;
            const cRGeoDet = byId('c-r-geo-det'); if (cRGeoDet) cRGeoDet.checked = !!APP.config.reglas.geocercaDetenido;
            const cGeoDetMin = byId('c-geo-det-min');
            if (cGeoDetMin) cGeoDetMin.value = APP.config.geocercaDetenidoMin != null ? APP.config.geocercaDetenidoMin : DEFAULTS.geocercaDetenidoMin;
            const cGeoEst = byId('c-geo-estable');
            if (cGeoEst) cGeoEst.value = APP.config.geocercaEstableSeg != null ? APP.config.geocercaEstableSeg : DEFAULTS.geocercaEstableSeg;
            g('c-r-des').checked = !!APP.config.reglas.destino;
            g('c-r-dis').checked = !!APP.config.reglas.desconexion;
            g('c-r-vel').checked = !!APP.config.reglas.velocidad;
            g('c-r-riesgo').checked = !!APP.config.reglas.riesgoSinSenal;
            const cRRiesgoPre = g('c-r-riesgo-pre'); if (cRRiesgoPre) cRRiesgoPre.checked = !!APP.config.reglas.riesgoPredict;
            g('c-riesgo-url').value = APP.config.riesgoUrl || '';
            g('c-riesgo-formato').value = APP.config.riesgoFormato || 'auto';
            g('c-riesgo-min').value = APP.config.riesgoMinScore;
            g('c-riesgo-mul').value = APP.config.riesgoRadioMul;
            // v5.14: regla predictiva.
            const cRiesgoPreMin = g('c-riesgo-pre-min');
            if (cRiesgoPreMin) cRiesgoPreMin.value = APP.config.riesgoPredictMinScore != null ? APP.config.riesgoPredictMinScore : DEFAULTS.riesgoPredictMinScore;
            const cRiesgoPreBuffer = g('c-riesgo-pre-buffer');
            if (cRiesgoPreBuffer) cRiesgoPreBuffer.value = APP.config.riesgoPredictBufferM != null ? APP.config.riesgoPredictBufferM : DEFAULTS.riesgoPredictBufferM;
            const cRiesgoPreVel = g('c-riesgo-pre-vel');
            if (cRiesgoPreVel) cRiesgoPreVel.value = APP.config.riesgoPredictVelMin != null ? APP.config.riesgoPredictVelMin : DEFAULTS.riesgoPredictVelMin;
            const cRiesgoPreCd = g('c-riesgo-pre-cooldown');
            if (cRiesgoPreCd) cRiesgoPreCd.value = APP.config.riesgoPredictCooldownS != null ? APP.config.riesgoPredictCooldownS : DEFAULTS.riesgoPredictCooldownS;
            const cRiesgoPreNoct = g('c-riesgo-pre-noct');
            if (cRiesgoPreNoct) cRiesgoPreNoct.checked = !!APP.config.riesgoPredictNocturno;
            const cRiesgoPreDesde = g('c-riesgo-pre-desde');
            if (cRiesgoPreDesde) cRiesgoPreDesde.value = APP.config.riesgoPredictNocturnoDesde || DEFAULTS.riesgoPredictNocturnoDesde;
            const cRiesgoPreHasta = g('c-riesgo-pre-hasta');
            if (cRiesgoPreHasta) cRiesgoPreHasta.value = APP.config.riesgoPredictNocturnoHasta || DEFAULTS.riesgoPredictNocturnoHasta;
            g('c-r-desvio').checked = !!APP.config.reglas.desvio;
            g('c-desvio-m').value = APP.config.desvioM;
            g('c-desvio-min').value = APP.config.desvioMin;
            if (g('c-desvio-municipio')) g('c-desvio-municipio').checked = !!APP.config.desvioMunicipio;
            if (g('c-desvio-municipio-m')) g('c-desvio-municipio-m').value = APP.config.desvioMunicipioM;
            if (g('c-parada-llegada')) g('c-parada-llegada').value = APP.config.paradaLlegadaM;
            g('c-r-retorno').checked = !!APP.config.reglas.retorno;
            g('c-retorno-m').value = APP.config.retornoM;
            g('c-retorno-pct').value = APP.config.retornoPct;
            g('c-r-giro').checked = !!APP.config.reglas.giroU;
            g('c-giro-grados').value = APP.config.giroGrados;
            g('c-giro-min').value = APP.config.giroMin;
            g('c-r-demora-base').checked = !!APP.config.reglas.demoraBase;
            g('c-demora-base-min').value = APP.config.demoraBaseMin;
            g('c-partida-horas').value = APP.config.partidaHoras;
            g('c-parada-min').value = APP.config.paradaMin;
            g('c-hist-horas').value = APP.config.historialHoras;
            g('c-analizar-auto').checked = !!APP.config.analizarAuto;
            g('c-osrm').checked = !!APP.config.osrm;
            g('c-overpass').checked = !!APP.config.overpass;
            g('c-trazado').checked = !!APP.config.trazado;
            g('c-trazado-max').value = APP.config.trazadoMax;
            g('c-auto-ruta').checked = APP.config.autoRuta !== false;
            g('c-auto-ruta-modo').value = APP.config.autoRutaModo || 'osrm';
            g('c-caravana-m').value = APP.config.caravanaM;
            g('c-caravana-cerca').value = APP.config.caravanaCercaM;
            g('c-hor-on').checked = !!APP.config.horario.on;
            g('c-hor-a').value = APP.config.horario.desde;
            g('c-hor-b').value = APP.config.horario.hasta;
            pintarPerfiles();
            pintarInfoUpdate();
            const N = PAGE.Notification;
            if (APP.config.desktop && typeof N !== 'undefined' && N.permission === 'default') {
                N.requestPermission();
            }
            cfgWinEl.style.display = 'flex';
        }
        byId('rondo-cfg-btn').addEventListener('click', abrirCfg);
        const vozMotorEl = byId('c-voz-motor');
        if (vozMotorEl) vozMotorEl.addEventListener('change', () => poblarVozSelect());
        const vozLangEl = byId('c-voz-lang');
        if (vozLangEl) vozLangEl.addEventListener('change', () => {
            if ((byId('c-voz-motor') || {}).value === 'online') poblarVozSelect();
        });
        // Probar voz / Detener: lee la frase configurada con el motor, idioma
        // y voz actuales. El texto se guarda en APP.config.vozTest al pulsar
        // Guardar en la pestana de Avisos.
        const vozTestBtn = byId('c-voz-test');
        if (vozTestBtn) vozTestBtn.addEventListener('click', () => probarVoz());
        const vozStopBtn = byId('c-voz-detener');
        if (vozStopBtn) vozStopBtn.addEventListener('click', () => _ttsDetener());

        // Pestana IA: probar conexion y borrar API key.
        const iaTestBtn = byId('c-ia-test');
        if (iaTestBtn) iaTestBtn.addEventListener('click', () => aiProbar());
        const iaClearBtn = byId('c-ia-clear');
        if (iaClearBtn) iaClearBtn.addEventListener('click', () => {
            APP.config.iaApiKey = '';
            writeJSON(LS.cfg, APP.config);
            const k = byId('c-ia-key'); if (k) k.value = '';
            const s = byId('c-ia-status');
            if (s) { s.textContent = 'API key borrada.'; s.style.color = 'var(--rondo-fg-dim)'; }
            paintIASwitch();
            paintIABatchBtn();
            paintIAUso();
            if (APP.tab === 'alertas') paintAlertas();
        });
        // v5.14: analisis en lote desde la cabecera de Avisos.
        const iaBatchBtn = byId('rondo-ia-batch');
        if (iaBatchBtn) iaBatchBtn.addEventListener('click', () => aiAnalizarLoteUI());
        const iaFlotaBtn = byId('rondo-ia-flota');
        if (iaFlotaBtn) iaFlotaBtn.addEventListener('click', () => aiFlotaUI());
        // v5.14: deteccion de patrones desde la pestana IA.
        const iaPatronesBtn = byId('c-ia-patrones');
        if (iaPatronesBtn) iaPatronesBtn.addEventListener('click', () => aiPatronesUI());
        // v5.14.6: chat con IA (send, clear, textarea autoresize, enter).
        const chatSendBtn = byId('rondo-chat-send');
        if (chatSendBtn) chatSendBtn.addEventListener('click', () => chatEnviar());
        const chatInput = byId('rondo-chat-input');
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    chatEnviar();
                }
            });
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(140, chatInput.scrollHeight) + 'px';
            });
        }
        const chatClearBtn = byId('rondo-chat-clear');
        if (chatClearBtn) chatClearBtn.addEventListener('click', () => {
            rondoConfirm('Limpiar conversacion', 'Se borraran todos los mensajes del chat actual.', () => limpiarChat());
        });
        // v5.14.7: toggle "Toda la flota" (alcance del contexto que ve la IA).
        const chatAllEl = byId('rondo-chat-all');
        if (chatAllEl) {
            chatAllEl.checked = !!APP.config.chatTodaFlota;
            chatAllEl.addEventListener('change', () => {
                APP.config.chatTodaFlota = !!chatAllEl.checked;
                writeJSON(LS.cfg, APP.config);
                adviceOk('Alcance del chat', chatAllEl.checked
                    ? 'La IA vera toda la flota que reporta en la plataforma.'
                    : 'La IA vera solo las unidades que vigilas.');
            });
        }
        // Al cambiar cualquier toggle/input de IA, refresca el contador de uso.
        ['c-ia-batchmax', 'c-ia-limite'].forEach((id) => {
            const el = byId(id);
            if (el) el.addEventListener('input', () => paintIAUso());
        });
        // Al cambiar de proveedor, actualizamos la nota (keys esperadas) y
        // los placeholders de endpoint/modelo. No borramos lo que el user
        // haya escrito: solo ajustamos las pistas visuales.
        const iaProvSel = byId('c-ia-prov');
        if (iaProvSel) iaProvSel.addEventListener('change', () => actualizarNotaProveedorIA());
        // Las voces del navegador cargan de forma asincrona.
        if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                if (cfgWinEl && cfgWinEl.style.display !== 'none' && (byId('c-voz-motor') || {}).value === 'web') poblarVozSelect();
            };
        }
        byId('c-lista-editar').addEventListener('click', () => {
            cfgWinEl.style.display = 'none';
            const prefill = Object.keys(APP.watchMap).map((k) =>
                APP.watchMap[k] ? k + '=' + APP.watchMap[k] : k
            ).join('\n');
            abrirModalLista(prefill);
        });
        function cerrarCfg() {
            if (cfgDirty) {
                rondoConfirm('Descartar cambios', 'Tienes cambios sin guardar en la configuracion. ¿Quieres descartarlos?', () => {
                    limpiarCfgDirty();
                    applyTheme(); // revierte la vista previa de escala/tema
                    cfgWinEl.style.display = 'none';
                }, { peligro: true, okText: 'Descartar', icon: UIS.gear });
            } else {
                cfgWinEl.style.display = 'none';
            }
        }
        byId('rondo-cfg-cerrar').addEventListener('click', cerrarCfg);
        byId('rondo-cfg-cerrar-x').addEventListener('click', cerrarCfg);
        const cfgBody = byId('rondo-cfg-body');
        if (cfgBody) {
            cfgBody.addEventListener('input', marcarCfgDirty);
            cfgBody.addEventListener('change', marcarCfgDirty);
        }
        // Vista previa de la escala de UI mientras se elige (se confirma al Guardar).
        const selEscala = byId('c-escala');
        if (selEscala) {
            selEscala.addEventListener('change', (e) => {
                document.documentElement.style.setProperty('--rondo-esc', String(normalizarEscala(e.target.value)));
            });
        }
        byId('rondo-cfg-guardar').addEventListener('click', () => {
            const g = (id) => byId(id);
            const cf = APP.config;
            cf.pollMs = Math.max(2000, isoNum(g('c-poll').value, cf.pollMs));
            cf.offlineMin = Math.max(1, isoNum(g('c-off').value, cf.offlineMin));
            cf.cooldownMin = Math.max(1, isoNum(g('c-cd').value, cf.cooldownMin));
            cf.gpsMin = Math.max(1, isoNum(g('c-gps').value, cf.gpsMin));
            cf.stopMin = Math.max(1, isoNum(g('c-stop').value, cf.stopMin));
            cf.zonaMin = Math.max(1, isoNum(g('c-zona').value, cf.zonaMin));
            cf.descoMin = Math.max(1, isoNum(g('c-desco').value, cf.descoMin));
            cf.velMax = Math.max(10, isoNum(g('c-vel').value, cf.velMax));
            cf.toastSeg = Math.max(3, isoNum(g('c-toastSeg').value, cf.toastSeg));
            cf.severidadMin = g('c-sevmin').value;
            // Texto del boton Probar voz (truncado a 180 chars por el input).
            const vozTestEl = byId('c-voz-test-text');
            if (vozTestEl) cf.vozTest = String(vozTestEl.value || '').trim().slice(0, 180) || DEFAULTS.vozTest;
            // IA: recoge config. La API key se acepta tal cual (la pega el
            // usuario) pero si llega enmascarada ('********') se respeta
            // la anterior.
            const iaOnEl = byId('c-ia-on'); if (iaOnEl) cf.iaHabilitada = !!iaOnEl.checked;
            const iaProvEl = byId('c-ia-prov'); if (iaProvEl) cf.iaProveedor = iaProvEl.value || 'deepseek';
            const iaKeyEl = byId('c-ia-key');
            if (iaKeyEl) {
                const v = String(iaKeyEl.value || '').trim();
                if (v && v !== '********') cf.iaApiKey = v;
                // Si el usuario la dejo enmascarada y no la cambio, se conserva.
            }
            const iaEndpointEl = byId('c-ia-endpoint'); if (iaEndpointEl) cf.iaEndpoint = String(iaEndpointEl.value || '').trim().slice(0, 300);
            const iaModeloEl = byId('c-ia-modelo'); if (iaModeloEl) cf.iaModelo = String(iaModeloEl.value || '').trim().slice(0, 120);
            const iaTempEl = byId('c-ia-temp');
            if (iaTempEl) {
                const v = String(iaTempEl.value || '').trim();
                cf.iaTemperature = (v === '' || !isFinite(Number(v))) ? '' : clamp(Number(v), 0, 2);
            }
            const iaMaxTokEl = byId('c-ia-maxtok');
            if (iaMaxTokEl) {
                const v = String(iaMaxTokEl.value || '').trim();
                cf.iaMaxTokens = (v === '' || !isFinite(Number(v))) ? '' : clamp(Math.round(Number(v)), 64, 4000);
            }
            const iaRadioEl = byId('c-ia-radio'); if (iaRadioEl) cf.iaRadioPoisM = clamp(isoNum(iaRadioEl.value, 250), 50, 2000);
            const iaTimeoutEl = byId('c-ia-timeout'); if (iaTimeoutEl) cf.iaTimeoutS = clamp(isoNum(iaTimeoutEl.value, 25), 5, 120);
            const iaCtxEl = byId('c-ia-contexto-api'); if (iaCtxEl) cf.iaContextoAPI = !!iaCtxEl.checked;
            const iaRepEl = byId('c-ia-reporte-servidor'); if (iaRepEl) cf.iaReporteServidor = !!iaRepEl.checked;
            // v5.14: analisis en lote + resumen narrativo.
            const iaResumenEl = byId('c-ia-resumen-on'); if (iaResumenEl) cf.iaResumenInforme = !!iaResumenEl.checked;
            const iaBatchmaxEl = byId('c-ia-batchmax'); if (iaBatchmaxEl) cf.iaBatchMax = clamp(isoNum(iaBatchmaxEl.value, DEFAULTS.iaBatchMax), 5, 50);
            const iaLimiteEl = byId('c-ia-limite'); if (iaLimiteEl) cf.iaLimiteDiario = clamp(isoNum(iaLimiteEl.value, DEFAULTS.iaLimiteDiario), 0, 10000);
            cf.voice = g('c-voz').checked;
            cf.voiceLang = g('c-voz-lang').value || DEFAULTS.voiceLang;
            cf.vozMotor = g('c-voz-motor').value || 'web';
            const vozSel = g('c-voz-voice');
            if (vozSel) {
                if (cf.vozMotor === 'online') cf.vozOnline = vozSel.value || DEFAULTS.vozOnline;
                else cf.voiceVoice = vozSel.value || '';
            }
            cf.vozVolumen = 1;
            cf.beep = g('c-beep').checked;
            cf.beepVol = clamp(parseFloat(g('c-beep-vol').value) || cf.beepVol || DEFAULTS.beepVol, 0, 1);
            cf.desktop = g('c-desktop').checked;
            cf.watchAll = g('c-watchAll').checked;
            cf.autoOpen = g('c-auto').checked;
            cf.loadZones = g('c-zonas').checked;
            cf.geocode = g('c-geo').checked;
            cf.historico = g('c-hist').checked;
            cf.geoPais = String((g('c-geo-pais') || {}).value || '').trim().toLowerCase().replace(/[^a-z,]/g, '');
            cf.geoBiasKm = clamp(isoNum((g('c-geo-bias') || {}).value, cf.geoBiasKm), 0, 2000);
            cf.verificar = g('c-verif').checked;
            cf.verifSeg = Math.max(2, isoNum(g('c-verif-seg').value, cf.verifSeg));
            cf.theme = g('c-tema').value;
            cf.density = g('c-dens').value;
            cf.escalaUI = normalizarEscala(g('c-escala').value);
            cf.acento = g('c-acento').value;
            cf.mostrarCoords = g('c-coords').checked;
            cf.contornos = g('c-contornos').checked;
            cf.contornoHoras = Math.max(1, isoNum(g('c-contorno-horas').value, cf.contornoHoras));
            cf.reglas.offline = g('c-r-off').checked;
            cf.reglas.gpsPerdido = g('c-r-gps').checked;
            cf.reglas.detenido = g('c-r-det').checked;
            cf.reglas.zona = g('c-r-zona').checked;
            cf.reglas.geocerca = g('c-r-geo').checked;
            const geoDetEl = g('c-r-geo-det'); if (geoDetEl) cf.reglas.geocercaDetenido = !!geoDetEl.checked;
            const geoDetMinEl = g('c-geo-det-min');
            if (geoDetMinEl) cf.geocercaDetenidoMin = clamp(isoNum(geoDetMinEl.value, DEFAULTS.geocercaDetenidoMin), 1, 240);
            const geoEstEl = g('c-geo-estable');
            if (geoEstEl) cf.geocercaEstableSeg = clamp(isoNum(geoEstEl.value, DEFAULTS.geocercaEstableSeg), 2, 300);
            cf.reglas.destino = g('c-r-des').checked;
            cf.reglas.desconexion = g('c-r-dis').checked;
            cf.reglas.velocidad = g('c-r-vel').checked;
            cf.reglas.riesgoSinSenal = g('c-r-riesgo').checked;
            const riesgoPreEl = g('c-r-riesgo-pre'); if (riesgoPreEl) cf.reglas.riesgoPredict = !!riesgoPreEl.checked;
            cf.riesgoUrl = (g('c-riesgo-url').value || '').trim();
            cf.riesgoFormato = g('c-riesgo-formato').value || 'auto';
            cf.riesgoMinScore = clamp(isoNum(g('c-riesgo-min').value, DEFAULTS.riesgoMinScore), 0, 100);
            cf.riesgoRadioMul = clamp(parseFloat(g('c-riesgo-mul').value) || DEFAULTS.riesgoRadioMul, 0.1, 5);
            // v5.14: regla predictiva.
            const riesgoPreMinEl = g('c-riesgo-pre-min');
            if (riesgoPreMinEl) cf.riesgoPredictMinScore = clamp(isoNum(riesgoPreMinEl.value, DEFAULTS.riesgoPredictMinScore), 0, 100);
            const riesgoPreBufferEl = g('c-riesgo-pre-buffer');
            if (riesgoPreBufferEl) cf.riesgoPredictBufferM = clamp(isoNum(riesgoPreBufferEl.value, DEFAULTS.riesgoPredictBufferM), 0, 5000);
            const riesgoPreVelEl = g('c-riesgo-pre-vel');
            if (riesgoPreVelEl) cf.riesgoPredictVelMin = clamp(isoNum(riesgoPreVelEl.value, DEFAULTS.riesgoPredictVelMin), 0, 200);
            const riesgoPreCdEl = g('c-riesgo-pre-cooldown');
            if (riesgoPreCdEl) cf.riesgoPredictCooldownS = clamp(isoNum(riesgoPreCdEl.value, DEFAULTS.riesgoPredictCooldownS), 60, 3600);
            const riesgoPreNoctEl = g('c-riesgo-pre-noct');
            if (riesgoPreNoctEl) cf.riesgoPredictNocturno = !!riesgoPreNoctEl.checked;
            const riesgoPreDesdeEl = g('c-riesgo-pre-desde');
            if (riesgoPreDesdeEl) cf.riesgoPredictNocturnoDesde = riesgoPreDesdeEl.value || DEFAULTS.riesgoPredictNocturnoDesde;
            const riesgoPreHastaEl = g('c-riesgo-pre-hasta');
            if (riesgoPreHastaEl) cf.riesgoPredictNocturnoHasta = riesgoPreHastaEl.value || DEFAULTS.riesgoPredictNocturnoHasta;
            // Si la URL cambi\u00f3 (o se activ\u00f3), recarga de inmediato.
            if (cf.riesgoUrl !== APP._riesgoFetched || APP.riesgoEstado === 'error') {
                APP._riesgoFetched = cf.riesgoUrl;
                cargarRiesgo();
            }
            cf.reglas.desvio = g('c-r-desvio').checked;
            cf.desvioM = Math.max(30, isoNum(g('c-desvio-m').value, cf.desvioM));
            cf.desvioMin = Math.max(1, isoNum(g('c-desvio-min').value, cf.desvioMin));
            cf.desvioMunicipio = !!(g('c-desvio-municipio') && g('c-desvio-municipio').checked);
            cf.desvioMunicipioM = clamp(isoNum(g('c-desvio-municipio-m').value, cf.desvioMunicipioM), 100, 30000);
            cf.paradaLlegadaM = clamp(isoNum(g('c-parada-llegada').value, cf.paradaLlegadaM), 50, 3000);
            cf.reglas.retorno = g('c-r-retorno').checked;
            cf.retornoM = Math.max(50, isoNum(g('c-retorno-m').value, cf.retornoM));
            cf.retornoPct = clamp(isoNum(g('c-retorno-pct').value, cf.retornoPct), 5, 90);
            cf.reglas.giroU = g('c-r-giro').checked;
            cf.giroGrados = clamp(isoNum(g('c-giro-grados').value, cf.giroGrados), 90, 180);
            cf.giroMin = Math.max(1, isoNum(g('c-giro-min').value, cf.giroMin));
            cf.reglas.demoraBase = g('c-r-demora-base').checked;
            cf.demoraBaseMin = Math.max(5, isoNum(g('c-demora-base-min').value, cf.demoraBaseMin));
            cf.partidaHoras = Math.max(1, isoNum(g('c-partida-horas').value, cf.partidaHoras));
            cf.paradaMin = Math.max(1, isoNum(g('c-parada-min').value, cf.paradaMin));
            cf.historialHoras = Math.max(2, isoNum(g('c-hist-horas').value, cf.historialHoras));
            cf.analizarAuto = g('c-analizar-auto').checked;
            cf.osrm = g('c-osrm').checked;
            cf.overpass = g('c-overpass').checked;
            cf.trazado = g('c-trazado').checked;
            cf.trazadoMax = Math.max(50, isoNum(g('c-trazado-max').value, cf.trazadoMax));
            cf.autoRuta = g('c-auto-ruta').checked;
            const _modo = g('c-auto-ruta-modo').value;
            cf.autoRutaModo = (_modo === 'astar' && cf.overpass) ? 'astar' : 'osrm';
            cf.caravanaM = Math.max(50, isoNum(g('c-caravana-m').value, DEFAULTS.caravanaM));
            cf.caravanaCercaM = Math.max(200, isoNum(g('c-caravana-cerca').value, DEFAULTS.caravanaCercaM));
            // Si el usuario acaba de activar el trazado automatico, lanzamos
            // un pase inmediato para las unidades pendientes.
            const _autoAntes = APP.config.autoRuta;
            if (!_autoAntes && cf.autoRuta) {
                setTimeout(() => autoTrazarRutas(), 200);
            }
            cf.horario.on = g('c-hor-on').checked;
            cf.horario.desde = g('c-hor-a').value || DEFAULTS.horario.desde;
            cf.horario.hasta = g('c-hor-b').value || DEFAULTS.horario.hasta;
            cf.panelLado = g('c-panel-lado').value || 'derecha';
            cf.panelAncho = clamp(isoNum(g('c-panel-ancho').value, cf.panelAncho), 360, 900);
            cf.ocultarAlClicFuera = g('c-panel-clicfuera').checked;
            cf.confirmarCierre = g('c-confirmar-cierre').checked;
            applyBar();
            paintVerifyButton();
            if (!cf.loadZones) APP.zonas = [];
            writeJSON(LS.cfg, APP.config);
            writeSession(SS.watch, APP.watchMap);
            writeJSON(LS.barra, APP.barra);
            applyTheme();
            aplicarModoPanel();
            restartTimers();
            limpiarCfgDirty();
            cfgWinEl.style.display = 'none';
            refresh();
            // Repintar Avisos para que aparezcan/desaparezcan los botones IA
            // y actualizar el indicador de IA de la cabecera.
            paintAlertas();
            paintIASwitch();
            adviceOk(LANG.guardado);
        });

        byId('rondo-reset-panel').addEventListener('click', () => {
            APP.config.panelAncho = 460;
            writeJSON(LS.cfg, APP.config);
            aplicarModoPanel();
            const inp = byId('c-panel-ancho');
            if (inp) inp.value = 460;
            adviceOk('Ancho restablecido', '460 px');
        });
        byId('rondo-perfil-guardar').addEventListener('click', () => {
            rondoPrompt('Guardar perfil', 'Ponle un nombre a la configuracion actual.', '', (n) => {
                if (n && n.trim()) {
                    guardarPerfil(n.trim());
                    adviceOk('Perfil guardado', n.trim());
                }
            }, { icon: UIS.export, okText: 'Guardar', placeholder: 'Ej. Turno manana' });
        });
        byId('rondo-perfil-cargar').addEventListener('click', () => {
            const sel = byId('rondo-perfil-sel');
            const n = sel ? sel.value : '';
            if (!n) { adviceWarn('Sin perfil', 'Guarda un perfil primero'); return; }
            if (cargarPerfil(n)) {
                cfgWinEl.style.display = 'none';
                adviceOk('Perfil cargado', n);
            }
        });
        byId('rondo-perfil-borrar').addEventListener('click', () => {
            const sel = byId('rondo-perfil-sel');
            const n = sel ? sel.value : '';
            if (!n) return;
            rondoConfirm('Borrar perfil', 'Se borrara el perfil "' + n + '".', () => {
                borrarPerfil(n);
                adviceOk('Perfil borrado', n);
            }, { peligro: true, okText: 'Borrar', icon: UIS.close });
        });
        byId('rondo-check-update').addEventListener('click', async (e) => {
            await conBusy(e.currentTarget, async () => {
                await comprobarActualizacion();
                const u = APP.update;
                if (u.state === 'available') adviceOk('Nueva version disponible', u.remote + ' (instalada ' + VER + ')');
                else if (u.state === 'current') adviceOk('Estas al dia', 'Versión instalada ' + VER + ' · remota ' + (u.remote || '?'));
                else adviceErr('No se pudo comprobar', u.lastError || 'sin conexion');
            });
        });
        byId('rondo-limpiar-hist').addEventListener('click', () => {
            if (!APP.historial.length) { adviceWarn('Sin avisos', 'El historial ya esta vacio'); return; }
            rondoConfirm('Limpiar historial', 'Se borrarán todos los avisos registrados en esta pestaña.', () => {
                limpiarBitacora();
                adviceOk('Historial limpiado');
            }, { peligro: true, okText: 'Limpiar', icon: UIS.clear });
        });
        byId('rondo-borrar-memo').addEventListener('click', () => {
            rondoConfirm('Borrar estado', 'Se reinicia el estado interno de las reglas (detenciones, desvíos, etc.).', () => {
                APP.memo = {}; writeSession(SS.memo, APP.memo); refresh();
                adviceOk('Estado borrado');
            }, { okText: 'Borrar', icon: UIS.clear });
        });
        byId('rondo-borrar-todo').addEventListener('click', () => {
            rondoConfirm('Borrar TODO', 'Se borrará la configuración, el estado, el historial de avisos, rutas y odómetros. Esta accion no se puede deshacer.', () => {
                Object.keys(LS).forEach((k) => { try { localStorage.removeItem(LS[k]); } catch (_) { /* noop */ } });
                Object.keys(SS).forEach((k) => { try { sessionStorage.removeItem(SS[k]); } catch (_) { /* noop */ } });
                avisoEl.textContent = 'Estado borrado, recargando...';
                avisoEl.style.display = 'block';
                setTimeout(() => { try { location.reload(); } catch (_) { /* noop */ } }, 700);
            }, { peligro: true, okText: 'Borrar TODO' });
        });
        // Acciones de los estados vacios (delegado, un solo listener).
        panelEl.addEventListener('click', (e) => {
            const b = e.target.closest && e.target.closest('.rondo-vacio-acc');
            if (!b) return;
            const acc = b.dataset.acc;
            if (acc === 'abrir-lista') mainBtn.click();
            else if (acc === 'ajustes') abrirCfg();
            else if (acc === 'tab-unidades') setTab('unidades');
        });
    }

