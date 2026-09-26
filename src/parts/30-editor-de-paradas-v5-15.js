    /* ====================== EDITOR DE PARADAS (v5.15) ======================
     * Permite construir un plan multipunto por unidad: anadir geocercas,
     * municipios o lugares (con sugerencias difusas), reordenarlos, fijarlos
     * y elegir entre recorrido secuencial o "mejor ruta".
     */
    let _planEdit = null;
    let _rpmOsmTimer = null;
    let _rpmSugList = [];
    let _rpmSugIdx = -1;
    // v6.0.9: posicion y tamano del editor multipunto. Se conserva durante la
    // sesion para que el operador no tenga que recolocarlo cada vez.
    let _rpmWin = { dx: 0, dy: 0, w: null, h: null };
    const RPM_WIN_KEY = 'rondo.api.s.rpmWin';
    function rpmWinCargar() {
        try {
            const j = JSON.parse(sessionStorage.getItem(RPM_WIN_KEY) || 'null');
            if (j && typeof j === 'object') {
                _rpmWin = {
                    dx: Number(j.dx) || 0,
                    dy: Number(j.dy) || 0,
                    w: Number(j.w) > 0 ? Number(j.w) : null,
                    h: Number(j.h) > 0 ? Number(j.h) : null
                };
            }
        } catch (_) { /* noop */ }
    }
    function rpmWinGuardar() {
        try { sessionStorage.setItem(RPM_WIN_KEY, JSON.stringify(_rpmWin)); } catch (_) { /* noop */ }
    }
    function rpmAplicarWin(el) {
        const card = el.querySelector('.rpm-card');
        if (!card) return;
        if (_rpmWin.w) card.style.width = _rpmWin.w + 'px';
        if (_rpmWin.h) card.style.height = _rpmWin.h + 'px';
        rpmClampWin(card);
        card.style.transform = 'translate(' + _rpmWin.dx + 'px,' + _rpmWin.dy + 'px)';
    }
    // El modal centra la tarjeta con flex; el desplazamiento se aplica con
    // transform. Aqui se acota para que nunca quede fuera de la pantalla.
    function rpmClampWin(card) {
        const vw = window.innerWidth, vh = window.innerHeight;
        const w = card.offsetWidth || 0, h = card.offsetHeight || 0;
        const cx = vw / 2, cy = vh / 2;
        const minDX = 8 - (cx - w / 2), maxDX = (vw - 8) - (cx + w / 2);
        const minDY = 8 - (cy - h / 2), maxDY = (vh - 8) - (cy + h / 2);
        _rpmWin.dx = (minDX <= maxDX) ? clamp(_rpmWin.dx || 0, minDX, maxDX) : Math.round(minDX);
        _rpmWin.dy = (minDY <= maxDY) ? clamp(_rpmWin.dy || 0, minDY, maxDY) : Math.round(minDY);
    }
    function rpmMoverWin(card) {
        card.style.transform = 'translate(' + _rpmWin.dx + 'px,' + _rpmWin.dy + 'px)';
    }
    function rpmBindWin(el) {
        const card = el.querySelector('.rpm-card');
        if (!card) return;
        const head = card.querySelector('.rpm-head');
        const grip = card.querySelector('.rpm-resize');
        if (head) {
            let drag = null;
            head.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('button')) return;
                drag = { x: e.clientX, y: e.clientY, dx: _rpmWin.dx || 0, dy: _rpmWin.dy || 0 };
                card.classList.add('moviendo');
                try { head.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
                e.preventDefault();
            });
            head.addEventListener('pointermove', (e) => {
                if (!drag) return;
                _rpmWin.dx = drag.dx + (e.clientX - drag.x);
                _rpmWin.dy = drag.dy + (e.clientY - drag.y);
                rpmClampWin(card);
                rpmMoverWin(card);
            });
            const fin = () => {
                if (!drag) return;
                drag = null;
                card.classList.remove('moviendo');
                rpmWinGuardar();
            };
            head.addEventListener('pointerup', fin);
            head.addEventListener('pointercancel', fin);
        }
        if (grip) {
            let rs = null;
            grip.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                rs = { x: e.clientX, y: e.clientY, w: card.offsetWidth, h: card.offsetHeight };
                try { grip.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
                e.preventDefault();
                e.stopPropagation();
            });
            grip.addEventListener('pointermove', (e) => {
                if (!rs) return;
                const vw = window.innerWidth, vh = window.innerHeight;
                const w = clamp(rs.w + (e.clientX - rs.x), 360, Math.round(vw * 0.96));
                const h = clamp(rs.h + (e.clientY - rs.y), 320, Math.round(vh * 0.92));
                _rpmWin.w = Math.round(w);
                _rpmWin.h = Math.round(h);
                card.style.width = _rpmWin.w + 'px';
                card.style.height = _rpmWin.h + 'px';
                rpmClampWin(card);
                rpmMoverWin(card);
            });
            const fin = () => {
                if (!rs) return;
                rs = null;
                rpmWinGuardar();
            };
            grip.addEventListener('pointerup', fin);
            grip.addEventListener('pointercancel', fin);
        }
    }
    // Reordenar paradas arrastrando (con indicador de destino).
    function rpmBindReorden(el) {
        const cont = el.querySelector('.rpm-stops');
        if (!cont) return;
        const filas = Array.prototype.slice.call(cont.querySelectorAll('.rpm-stop'));
        if (filas.length < 2) return;
        filas.forEach((fila) => {
            fila.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('button')) return;
                e.preventDefault();
                const from = +fila.dataset.i;
                const x0 = e.clientX, y0 = e.clientY;
                const restantes = filas.filter((_, i) => i !== from);
                let ins = -1, activo = false;
                const marcar = (ev) => {
                    ins = restantes.length;
                    for (let i = 0; i < restantes.length; i++) {
                        const rr = restantes[i].getBoundingClientRect();
                        if (ev.clientY < rr.top + rr.height / 2) { ins = i; break; }
                    }
                    restantes.forEach((r, i) => r.classList.toggle('drop-target', i === ins));
                };
                const mover = (ev) => {
                    if (!activo) {
                        if (Math.abs(ev.clientY - y0) < 4 && Math.abs(ev.clientX - x0) < 4) return;
                        activo = true;
                        fila.classList.add('dragging');
                    }
                    marcar(ev);
                };
                const limpiar = () => {
                    fila.classList.remove('dragging');
                    restantes.forEach((r) => r.classList.remove('drop-target'));
                };
                const soltar = () => {
                    document.removeEventListener('pointermove', mover);
                    document.removeEventListener('pointerup', soltar);
                    document.removeEventListener('pointercancel', soltar);
                    limpiar();
                    if (!activo || ins < 0) return;
                    const arr = _planEdit && _planEdit.paradas;
                    if (!arr || from >= arr.length) return;
                    const item = arr.splice(from, 1)[0];
                    arr.splice(Math.min(ins, arr.length), 0, item);
                    renderEditorParadas();
                };
                document.addEventListener('pointermove', mover);
                document.addEventListener('pointerup', soltar);
                document.addEventListener('pointercancel', soltar);
            });
        });
    }
    function rpmResaltarSug() {
        const sug = byId('rpm-sug');
        if (!sug) return;
        sug.querySelectorAll('.rpm-sug-item').forEach((n) => n.classList.toggle('sel', +n.dataset.k === _rpmSugIdx));
        const sel = sug.querySelector('.rpm-sug-item.sel');
        if (sel && sel.scrollIntoView) { try { sel.scrollIntoView({ block: 'nearest' }); } catch (_) { /* noop */ } }
    }
    function rpmSeleccionarSug(k) {
        const item = _rpmSugList[k];
        if (!item) return;
        if (item.libre) agregarParadaEditor('lugar', item.texto, null);
        else agregarParadaEditor(item.tipoFinal, item.texto, item.coords, item.extra);
        _rpmSugList = [];
        _rpmSugIdx = -1;
    }
    function planModalEl() {
        let el = byId('rondo-plan-modal');
        if (el) return el;
        el = makeEl('div', { id: 'rondo-plan-modal' });
        document.body.appendChild(el);
        el.addEventListener('pointerdown', (e) => { if (e.target === el) cerrarEditorParadas(); });
        // Si cambia el tamano de la ventana, reacota la posicion guardada.
        window.addEventListener('resize', () => {
            const card = el.querySelector('.rpm-card');
            if (card) { rpmClampWin(card); rpmMoverWin(card); }
        });
        return el;
    }
    function cerrarEditorParadas() {
        const el = byId('rondo-plan-modal');
        if (el) el.classList.remove('abierto');
        _planEdit = null;
    }
    function abrirEditorParadas(eco, engine) {
        const it = unitByEco(eco);
        const clave = it ? it.info.clave : eco;
        const plan = (it ? planDe(it.info) : null) || { modo: 'secuencial', circuito: false, paradas: [] };
        _planEdit = {
            eco: eco, clave: clave,
            modo: plan.modo || 'secuencial',
            circuito: !!plan.circuito,
            engine: (engine === 'astar' || engine === 'osrm') ? engine : (APP.config.autoRutaModo || 'osrm'),
            paradas: (plan.paradas || []).map((p) => Object.assign({}, p))
        };
        rpmWinCargar();
        // Muestra el modal antes de medir, para que el acotado de la ventana
        // use el tamano real de la tarjeta (si esta en display:none mide 0).
        planModalEl().classList.add('abierto');
        renderEditorParadas();
    }
    function renderEditorParadas() {
        const el = planModalEl();
        if (!el || !_planEdit) return;
        const modo = _planEdit.modo;
        const stops = _planEdit.paradas;
        const filas = stops.map((p, i) => (
            '<div class="rpm-stop' + (p.fijo ? ' pinned' : '') + '" data-i="' + i + '">' +
            '<span class="rpm-grip" title="Arrastrar para reordenar">\u283F</span>' +
            '<span class="rpm-idx">' + (i + 1) + '</span>' +
            '<span class="rpm-tipo">' + esc(p.tipo || 'lugar') + '</span>' +
            '<span class="rpm-txt" title="' + esc(p.texto) + '">' + esc(p.texto) + (p.coords ? '' : ' <em>(sin ubicar)</em>') + '</span>' +
            '<button class="rpm-mini rpm-pin" data-i="' + i + '" title="Fijar esta parada en su orden">' + (p.fijo ? 'Fijada' : 'Fijar') + '</button>' +
            '<button class="rpm-mini rpm-up" data-i="' + i + '" title="Subir"><span class="rondo-usym">' + UIS.up + '</span></button>' +
            '<button class="rpm-mini rpm-down" data-i="' + i + '" title="Bajar"><span class="rondo-usym">' + UIS.down + '</span></button>' +
            '<button class="rpm-mini rpm-del" data-i="' + i + '" title="Quitar"><span class="rondo-usym">' + UIS.close + '</span></button>' +
            '</div>'
        )).join('') || '<div class="rpm-hint">Sin paradas. Anade geocercas, municipios o lugares abajo.</div>';
        const engine = _planEdit.engine || 'osrm';
        el.innerHTML =
            '<div class="rpm-card">' +
            '<div class="rpm-head"><span class="rondo-usym">' + UIS.route + '</span> <span class="rpm-eco">' + esc(_planEdit.eco) + '</span> &middot; Ruta multipunto' +
            '<span class="rpm-count">' + stops.length + (stops.length === 1 ? ' parada' : ' paradas') + '</span>' +
            '<span style="flex:1"></span><button class="rpm-mini" id="rpm-x" title="Cerrar"><span class="rondo-usym">' + UIS.close + '</span></button></div>' +
            '<div class="rpm-body">' +
            '<div class="rpm-row">' +
            '<label class="rpm-lbl">Modo</label>' +
            '<select id="rpm-modo">' +
            '<option value="secuencial"' + (modo === 'secuencial' ? ' selected' : '') + '>Secuencial (en este orden)</option>' +
            '<option value="optimo"' + (modo === 'optimo' ? ' selected' : '') + '>Mejor ruta (optimiza y regresa a base)</option>' +
            '</select>' +
            '<label class="rpm-lbl">Motor</label>' +
            '<select id="rpm-engine">' +
            '<option value="osrm"' + (engine === 'osrm' ? ' selected' : '') + '>OSRM (rapido)</option>' +
            '<option value="astar"' + (engine === 'astar' ? ' selected' : '') + '>A* OSM (experimental)</option>' +
            '</select>' +
            '</div>' +
            '<div class="rpm-row">' +
            '<label class="rpm-lbl"><input type="checkbox" id="rpm-circuito"' + (_planEdit.circuito || modo === 'optimo' ? ' checked' : '') + (modo === 'optimo' ? ' disabled' : '') + '> Regresar al origen</label>' +
            '<span style="flex:1"></span>' +
            '<button class="rpm-mini" id="rpm-vaciar" title="Quitar todas las paradas"><span class="rondo-usym">' + UIS.clear + '</span> Vaciar paradas</button>' +
            '</div>' +
            '<div class="rpm-hint">En modo <b>mejor ruta</b> las paradas no fijadas se reordenan por cercania y el recorrido cierra en el origen. Usa <b>Fijar</b> para respetar el orden de una parada. <b>A*</b> requiere activar Overpass y rutas de menos de ~150 km.</div>' +
            '<div class="rpm-stops">' + filas + '</div>' +
            '<div class="rpm-add">' +
            '<input type="text" id="rpm-buscar" placeholder="Buscar geocerca, municipio o lugar, o escribe lat,lon..." autocomplete="off">' +
            '<button class="rpm-mini" id="rpm-agregar" title="Anadir el texto como lugar o coordenadas"><span class="rondo-usym">' + UIS.check + '</span> Anadir</button>' +
            '<div class="rpm-sug" id="rpm-sug"></div>' +
            '</div>' +
            '<div class="rpm-hint">Escribe para ver sugerencias de <b>geocercas</b> y <b>municipios</b> (OpenStreetMap); Enter anade el texto como lugar y <code>lat,lon</code> como coordenadas.</div>' +
            '</div>' +
            '<div class="rpm-foot">' +
            '<button id="rpm-cancelar">Cancelar</button>' +
            '<button id="rpm-guardar">Solo guardar</button>' +
            '<button class="primary" id="rpm-guardar-trazar"><span class="rondo-usym">' + UIS.route + '</span> Guardar y trazar</button>' +
            '</div>' +
            '<div class="rpm-resize" title="Arrastrar para redimensionar"></div>' +
            '</div>';
        try { rxBarridoAutofill(el); } catch (_) { /* noop */ }
        rpmAplicarWin(el);
        rpmBindWin(el);
        rpmBindReorden(el);
        byId('rpm-x').onclick = cerrarEditorParadas;
        byId('rpm-cancelar').onclick = cerrarEditorParadas;
        byId('rpm-guardar').onclick = () => guardarEditorParadas(false);
        byId('rpm-guardar-trazar').onclick = () => guardarEditorParadas(true);
        const modoEl = byId('rpm-modo');
        modoEl.onchange = () => {
            _planEdit.modo = modoEl.value;
            if (modoEl.value === 'optimo') _planEdit.circuito = true;
            renderEditorParadas();
        };
        const engineEl = byId('rpm-engine');
        if (engineEl) engineEl.onchange = () => { _planEdit.engine = engineEl.value; };
        const circEl = byId('rpm-circuito');
        if (circEl) circEl.onchange = () => { _planEdit.circuito = circEl.checked; };
        byId('rpm-vaciar').onclick = () => {
            if (!_planEdit || !_planEdit.paradas.length) return;
            _planEdit.paradas = [];
            renderEditorParadas();
        };
        el.querySelectorAll('.rpm-pin').forEach((b) => {
            b.onclick = () => { const i = +b.dataset.i; _planEdit.paradas[i].fijo = !_planEdit.paradas[i].fijo; renderEditorParadas(); };
        });
        el.querySelectorAll('.rpm-del').forEach((b) => {
            b.onclick = () => { _planEdit.paradas.splice(+b.dataset.i, 1); renderEditorParadas(); };
        });
        el.querySelectorAll('.rpm-up').forEach((b) => {
            b.onclick = () => { const i = +b.dataset.i; const a = _planEdit.paradas; if (i > 0) { const t = a[i - 1]; a[i - 1] = a[i]; a[i] = t; renderEditorParadas(); } };
        });
        el.querySelectorAll('.rpm-down').forEach((b) => {
            b.onclick = () => { const i = +b.dataset.i; const a = _planEdit.paradas; if (i < a.length - 1) { const t = a[i + 1]; a[i + 1] = a[i]; a[i] = t; renderEditorParadas(); } };
        });
        const buscar = byId('rpm-buscar');
        const sug = byId('rpm-sug');
        const pintarSug = () => {
            const q = buscar.value.trim();
            _rpmSugIdx = -1;
            if (!q) { sug.classList.remove('abierto'); sug.innerHTML = ''; _rpmSugList = []; return; }
            const icoTipo = (t) => (t === 'geocerca') ? UIS.zone : ((t === 'municipio' || t === 'ciudad') ? UIS.map : UIS.pin);
            const render = (items) => {
                const lista = items.map((cand) => ({
                    tipo: cand.tipo,
                    tipoFinal: cand.tipo === 'ciudad' ? 'municipio' : cand.tipo,
                    texto: cand.texto,
                    coords: cand.coords || null,
                    extra: cand
                }));
                // Ultimo elemento: buscar el texto tal cual en OpenStreetMap.
                lista.push({ libre: true, texto: q });
                _rpmSugList = lista;
                if (_rpmSugIdx >= lista.length) _rpmSugIdx = lista.length - 1;
                sug.innerHTML = lista.map((it, k) => {
                    const cls = 'rpm-sug-item' + (k === _rpmSugIdx ? ' sel' : '');
                    if (it.libre) {
                        return '<div class="' + cls + '" data-k="' + k + '"><span class="rondo-usym">' + UIS.pin + '</span><span class="k">lugar</span><span class="t">Buscar "' + esc(q) + '" en OpenStreetMap</span></div>';
                    }
                    return '<div class="' + cls + '" data-k="' + k + '"><span class="rondo-usym">' + icoTipo(it.tipo) + '</span>' +
                        '<span class="k">' + esc(it.tipo) + '</span>' +
                        '<span class="t">' + esc(it.texto || '') + (it.extra && it.extra.sub ? ' <span class="k">' + esc(it.extra.sub) + '</span>' : '') + '</span></div>';
                }).join('');
                sug.classList.add('abierto');
                sug.querySelectorAll('.rpm-sug-item').forEach((n) => {
                    n.onclick = () => rpmSeleccionarSug(+n.dataset.k);
                    n.onmouseenter = () => { _rpmSugIdx = +n.dataset.k; rpmResaltarSug(); };
                });
            };
            const locales = catalogoParadas(q, 8);
            render(locales);
            // Ampliacion en linea: municipios/ciudades/direcciones de OSM.
            if (_rpmOsmTimer) clearTimeout(_rpmOsmTimer);
            _rpmOsmTimer = setTimeout(async () => {
                if (buscar.value.trim() !== q) return;
                // Sesga las sugerencias hacia la posicion de la unidad.
                const itRef = _planEdit ? unitByEco(_planEdit.eco) : null;
                APP.geoRef = (itRef && itRef.st.lat != null) ? { lat: itRef.st.lat, lon: itRef.st.lon } : null;
                const osm = await sugerenciasOSM(q);
                if (!osm.length || buscar.value.trim() !== q) return;
                const vistos = new Set(locales.map((x) => norm(x.texto)));
                const extra = osm.filter((x) => !vistos.has(norm(x.texto)));
                if (extra.length) render(locales.concat(extra));
            }, 450);
        };
        buscar.oninput = pintarSug;
        buscar.onfocus = pintarSug;
        // Teclado: flechas para recorrer las sugerencias, Enter para elegir la
        // resaltada (o el texto libre si no hay ninguna seleccionada).
        buscar.onkeydown = (e) => {
            const abierto = sug.classList.contains('abierto') && _rpmSugList.length;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!abierto) { pintarSug(); return; }
                _rpmSugIdx = (_rpmSugIdx + 1) % _rpmSugList.length;
                rpmResaltarSug();
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!abierto) return;
                _rpmSugIdx = (_rpmSugIdx - 1 + _rpmSugList.length) % _rpmSugList.length;
                rpmResaltarSug();
                return;
            }
            if (e.key === 'Escape') {
                // Si hay sugerencias abiertas, Esc solo cierra el desplegable;
                // de lo contrario se deja pasar para cerrar el editor.
                if (sug.classList.contains('abierto')) {
                    e.stopPropagation();
                    sug.classList.remove('abierto');
                    _rpmSugIdx = -1;
                }
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (abierto && _rpmSugIdx >= 0) { rpmSeleccionarSug(_rpmSugIdx); return; }
                const q = buscar.value.trim();
                if (!q) return;
                agregarParadaEditor('lugar', q, null);
                buscar.value = '';
                sug.classList.remove('abierto');
                _rpmSugList = [];
                _rpmSugIdx = -1;
            }
        };
        byId('rpm-agregar').onclick = () => {
            const q = buscar.value.trim();
            if (!q) return;
            agregarParadaEditor('lugar', q, null);
            buscar.value = '';
            sug.classList.remove('abierto');
        };
    }
    function agregarParadaEditor(tipo, texto, coords, extra) {
        if (!_planEdit) return;
        if (_planEdit.paradas.length >= 25) { adviceWarn('Maximo 25 paradas', 'Quita alguna antes de anadir otra.'); return; }
        // Detecta "lat,lon" y lo trata como coordenadas (sin geocodificar).
        const cm = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(String(texto || '').trim());
        if (cm) { tipo = 'coord'; coords = { lat: parseFloat(cm[1]), lon: parseFloat(cm[2]) }; }
        // Rango valido: una coordenada imposible deja la parada "sin ubicar"
        // para siempre y hace fallar el trazado. Mejor avisar y no agregarla.
        if (coords && coords.lat != null && coords.lon != null &&
            (coords.lat < -90 || coords.lat > 90 || coords.lon < -180 || coords.lon > 180)) {
            adviceWarn('Coordenadas invalidas', 'Latitud entre -90 y 90, longitud entre -180 y 180.');
            return;
        }
        const p = nuevaParada(tipo, texto, coords);
        if (extra && extra.zonaId) p.zonaId = extra.zonaId;
        if (extra && extra.municipioId) p.municipioId = extra.municipioId;
        _planEdit.paradas.push(p);
        renderEditorParadas();
    }
    function guardarEditorParadas(trazar) {
        if (!_planEdit) return;
        const clave = _planEdit.clave, eco = _planEdit.eco;
        const modo = _planEdit.modo === 'optimo' ? 'optimo' : 'secuencial';
        // El motor se captura ANTES de cerrar el editor: cerrarEditorParadas()
        // pone _planEdit = null y luego no se puede leer _planEdit.engine.
        const engine = (_planEdit.engine === 'astar') ? 'astar' : 'osrm';
        const plan = {
            modo: modo,
            circuito: (modo === 'optimo') ? true : !!_planEdit.circuito,
            paradas: _planEdit.paradas
        };
        APP.planes[clave] = plan;
        APP.watchMap[eco] = planATexto(plan);
        if (APP.orden.indexOf(eco) < 0) APP.orden.push(eco);
        guardarPlanes();
        guardarLista();
        guardarOrden();
        cerrarEditorParadas();
        pintarModalLista();
        paintInfo();
        if (trazar) {
            if (engine === 'astar' && !APP.config.overpass) adviceWarn('A* desactivado', 'Activa "Permitir A* sobre datos OSM" en Ajustes · Rutas. Se usara OSRM.');
            planearRuta(eco, plan, null, (engine === 'astar' && APP.config.overpass) ? 'astar' : 'osrm');
        } else if (APP.config.autoRuta) {
            autoTrazarRutas();
        }
    }

