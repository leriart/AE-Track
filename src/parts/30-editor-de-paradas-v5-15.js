    /* ====================== EDITOR DE PARADAS (v5.15) ======================
     * Permite construir un plan multipunto por unidad: anadir geocercas,
     * municipios o lugares (con sugerencias difusas), reordenarlos, fijarlos
     * y elegir entre recorrido secuencial o "mejor ruta".
     */
    let _planEdit = null;
    function planModalEl() {
        let el = byId('rondo-plan-modal');
        if (el) return el;
        el = makeEl('div', { id: 'rondo-plan-modal' });
        document.body.appendChild(el);
        el.addEventListener('pointerdown', (e) => { if (e.target === el) cerrarEditorParadas(); });
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
        renderEditorParadas();
        planModalEl().classList.add('abierto');
    }
    function renderEditorParadas() {
        const el = planModalEl();
        if (!el || !_planEdit) return;
        const modo = _planEdit.modo;
        const stops = _planEdit.paradas;
        const filas = stops.map((p, i) => (
            '<div class="rpm-stop' + (p.fijo ? ' pinned' : '') + '" data-i="' + i + '">' +
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
            '</div>';
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
            if (!q) { sug.classList.remove('abierto'); sug.innerHTML = ''; return; }
            const items = catalogoParadas(q, 8);
            const icoTipo = (t) => (t === 'geocerca') ? UIS.zone : (t === 'municipio' ? UIS.map : UIS.pin);
            let html = items.map((cand, k) =>
                '<div class="rpm-sug-item" data-k="' + k + '"><span class="rondo-usym">' + icoTipo(cand.tipo) + '</span>' +
                '<span class="k">' + esc(cand.tipo) + '</span>' +
                '<span class="t">' + esc(cand.texto || '') + (cand.sub ? ' <span class="k">' + esc(cand.sub) + '</span>' : '') + '</span></div>'
            ).join('');
            html += '<div class="rpm-sug-item" data-libre="1"><span class="rondo-usym">' + UIS.pin + '</span><span class="k">lugar</span><span class="t">Buscar "' + esc(q) + '" en OpenStreetMap</span></div>';
            sug.innerHTML = html;
            sug.classList.add('abierto');
            sug.querySelectorAll('.rpm-sug-item').forEach((n) => {
                n.onclick = () => {
                    if (n.dataset.libre) agregarParadaEditor('lugar', q, null);
                    else {
                        const cand = items[+n.dataset.k];
                        agregarParadaEditor(cand.tipo, cand.texto, cand.coords || null, cand);
                    }
                    buscar.value = '';
                    sug.classList.remove('abierto');
                };
            });
        };
        buscar.oninput = pintarSug;
        buscar.onfocus = pintarSug;
        buscar.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const q = buscar.value.trim();
                if (!q) return;
                agregarParadaEditor('lugar', q, null);
                buscar.value = '';
                sug.classList.remove('abierto');
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
            const engine = (_planEdit.engine === 'astar') ? 'astar' : 'osrm';
            if (engine === 'astar' && !APP.config.overpass) adviceWarn('A* desactivado', 'Activa "Permitir A* sobre datos OSM" en Ajustes · Rutas. Se usara OSRM.');
            planearRuta(eco, plan, null, (engine === 'astar' && APP.config.overpass) ? 'astar' : 'osrm');
        } else if (APP.config.autoRuta) {
            autoTrazarRutas();
        }
    }

