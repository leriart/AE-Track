    /* ====================== CARGA RAPIDA DE RUTAS (embarque) ======================
     * v6.0.3. Pegas (o sueltas el .xlsx/.csv de) una lista de clientes, se
     * emparejan con las geocercas existentes por BUSQUEDA DIFUSA y se arma la
     * ruta multipunto de una unidad.
     *
     * Es 100% local y de SOLO LECTURA: no crea ni modifica nada en Wialon.
     * Unicamente construye el plan de ruta de Rondo (APP.planes).
     */

    /* === BEGIN: rxCargaParse === */
    // Limpia el nombre de un cliente: quita numeracion ("1. ", "2) ") y espacios.
    function rxCargaLimpiarCliente(txt) {
        let s = String(txt == null ? '' : txt).replace(/\s+/g, ' ').trim();
        s = s.replace(/^\d+\s*[.):\-]?\s*/, '');
        return s.trim();
    }
    // Busca la fila de encabezado con la columna "Cliente".
    function rxCargaColumnaCliente(filas) {
        for (let i = 0; i < filas.length; i++) {
            const fila = filas[i] || [];
            for (let j = 0; j < fila.length; j++) {
                if (norm(fila[j] || '') === 'CLIENTE') return { header: i, col: j };
            }
        }
        return null;
    }
    // Convierte una matriz de celdas en la lista (unica) de clientes.
    function rxCargaParsearFilas(filas) {
        const out = [];
        const vistos = new Set();
        const empujar = (s) => {
            const c = rxCargaLimpiarCliente(s);
            if (!c || c.length < 3) return;
            const k = norm(c);
            if (vistos.has(k)) return;
            vistos.add(k); out.push(c);
        };
        const hdr = rxCargaColumnaCliente(filas);
        if (hdr) {
            for (let i = hdr.header + 1; i < filas.length; i++) empujar((filas[i] || [])[hdr.col] || '');
        } else {
            for (let i = 0; i < filas.length; i++) {
                const fila = filas[i] || [];
                let cand = '';
                for (let j = 0; j < fila.length; j++) {
                    const v = String(fila[j] || '').trim();
                    if (v && !/^[\d.,\/-]+$/.test(v)) cand = v;
                }
                if (!cand) cand = String(fila[0] || '').trim();
                empujar(cand);
            }
        }
        return out;
    }
    // Texto pegado (columnas separadas por tabulador) -> clientes.
    function rxCargaParsearTexto(texto) {
        const filas = String(texto || '').split(/\r?\n/).map((l) => l.split('\t').map((c) => c.trim()));
        return rxCargaParsearFilas(filas);
    }
    // Puntua la mejor geocerca para un cliente. Devuelve {zona, score}.
    function rxCargaEmparejarCliente(cliente, zonas) {
        let best = null, bestSc = 0;
        const zs = zonas || [];
        for (let i = 0; i < zs.length; i++) {
            const n = zs[i] ? (zs[i].texto || zs[i].n || '') : '';
            if (!n) continue;
            const sc = fuzzyScore(cliente, n);
            if (sc > bestSc) { bestSc = sc; best = zs[i]; }
        }
        return { zona: best, score: bestSc };
    }
    function rxCargaConfianza(score) {
        if (score >= 800) return { etq: 'alta', clase: 'ok' };
        if (score >= 400) return { etq: 'media', clase: 'warn' };
        if (score > 0) return { etq: 'baja', clase: 'dim' };
        return { etq: 'sin', clase: 'no' };
    }
    /* === END: rxCargaParse === */

    // ---------------------------------------------------------------- xlsx (solo lectura)
    function rxCargaColIndex(letras) {
        let n = 0;
        for (let i = 0; i < letras.length; i++) n = n * 26 + (letras.charCodeAt(i) - 64);
        return n - 1;
    }
    async function rxCargaUnzip(buf) {
        const dv = new DataView(buf), u8 = new Uint8Array(buf);
        let eocd = -1;
        const from = Math.max(0, u8.length - 66000);
        for (let i = u8.length - 22; i >= from; i--) {
            if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) return null;
        const n = dv.getUint16(eocd + 10, true);
        let off = dv.getUint32(eocd + 16, true);
        const out = {};
        const dec = new TextDecoder();
        for (let k = 0; k < n && off + 46 <= u8.length; k++) {
            if (dv.getUint32(off, true) !== 0x02014b50) break;
            const method = dv.getUint16(off + 10, true);
            const compSize = dv.getUint32(off + 20, true);
            const nameLen = dv.getUint16(off + 28, true);
            const extraLen = dv.getUint16(off + 30, true);
            const commentLen = dv.getUint16(off + 32, true);
            const localOff = dv.getUint32(off + 42, true);
            const name = dec.decode(u8.subarray(off + 46, off + 46 + nameLen));
            const lNameLen = dv.getUint16(localOff + 26, true);
            const lExtraLen = dv.getUint16(localOff + 28, true);
            const dataStart = localOff + 30 + lNameLen + lExtraLen;
            out[name] = { method: method, data: u8.subarray(dataStart, dataStart + compSize) };
            off += 46 + nameLen + extraLen + commentLen;
        }
        return out;
    }
    async function rxCargaInflate(entry) {
        if (!entry) return null;
        if (entry.method === 0) return new TextDecoder().decode(entry.data);
        if (typeof DecompressionStream === 'undefined') return null;
        try {
            const stream = new Blob([entry.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            const buf = await new Response(stream).arrayBuffer();
            return new TextDecoder().decode(buf);
        } catch (_) { return null; }
    }
    function rxCargaSharedStrings(xml) {
        const out = [];
        if (!xml || typeof DOMParser === 'undefined') return out;
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const sis = doc.getElementsByTagName('si');
        for (let i = 0; i < sis.length; i++) {
            const ts = sis[i].getElementsByTagName('t');
            let s = '';
            for (let j = 0; j < ts.length; j++) s += ts[j].textContent || '';
            out.push(s);
        }
        return out;
    }
    function rxCargaSheetRows(xml, shared) {
        const rows = [];
        if (!xml || typeof DOMParser === 'undefined') return rows;
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const rowEls = doc.getElementsByTagName('row');
        for (let i = 0; i < rowEls.length; i++) {
            const cells = rowEls[i].getElementsByTagName('c');
            const fila = [];
            for (let j = 0; j < cells.length; j++) {
                const c = cells[j];
                const ref = c.getAttribute('r') || '';
                const idx = rxCargaColIndex(ref.replace(/[0-9]/g, ''));
                const t = c.getAttribute('t');
                const v = c.getElementsByTagName('v')[0];
                let val = v ? (v.textContent || '') : '';
                if (t === 's') val = shared[parseInt(val, 10)] || '';
                if (idx >= 0) fila[idx] = val;
            }
            rows.push(fila);
        }
        return rows;
    }
    async function rxCargaLeerXlsx(buf) {
        const files = await rxCargaUnzip(buf);
        if (!files) return null;
        const shared = rxCargaSharedStrings(await rxCargaInflate(files['xl/sharedStrings.xml']));
        const hoja = Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
        if (!hoja) return null;
        return rxCargaSheetRows(await rxCargaInflate(files[hoja]), shared);
    }

    // ------------------------------------------------------------------- UI
    let _carga = null;
    function cargaModalEl() {
        let el = byId('rondo-carga-modal');
        if (el) return el;
        el = makeEl('div', { id: 'rondo-carga-modal' });
        document.body.appendChild(el);
        el.addEventListener('pointerdown', (e) => { if (e.target === el) cerrarCarga(); });
        return el;
    }
    function cerrarCarga() {
        const el = byId('rondo-carga-modal');
        if (el) el.classList.remove('abierto');
        _carga = null;
    }
    function abrirCarga(eco) {
        const vigiladas = (APP.unidades || []).filter(shouldWatch).map((u) => parseUnitName(u));
        if (!vigiladas.length) {
            adviceWarn('Sin unidades vigiladas', 'Vigila una unidad antes de asignarle una ruta.');
            return;
        }
        const sel = eco || APP.cargaEco || (vigiladas[0].eco || vigiladas[0].clave);
        _carga = { eco: sel, modo: 'optimo', engine: APP.config.autoRutaModo || 'osrm', filas: [], crudo: '', catalogo: null };
        renderCarga();
        cargaModalEl().classList.add('abierto');
    }
    // Catalogo de destinos: geocercas + municipios (OSM y zonas de riesgo).
    function cargaCatalogo() {
        const out = [];
        const zs = (APP.zonas || []).slice().sort((a, b) => String(a.n || '').localeCompare(String(b.n || ''), 'es'));
        for (let i = 0; i < zs.length; i++) {
            const z = zs[i];
            out.push({ tipo: 'geocerca', texto: z.n || ('Zona ' + z.id), sub: 'geocerca', coords: centroDeZona(z), ref: z });
        }
        const ms = (APP.municipios || []).concat(APP.municipiosRiesgo || []);
        const vistos = new Set();
        for (let i = 0; i < ms.length; i++) {
            const m = ms[i];
            if (!m || !m.nombre) continue;
            const k = norm(m.nombre) + '|' + norm(m.estado || '');
            if (vistos.has(k)) continue;
            vistos.add(k);
            out.push({ tipo: 'municipio', texto: m.nombre, sub: (m.estado || '') + ' \u00b7 municipio', coords: m.centro });
        }
        return out;
    }
    function renderCarga() {
        const el = cargaModalEl();
        if (!el || !_carga) return;
        const vigiladas = (APP.unidades || []).filter(shouldWatch).map((u) => parseUnitName(u)).filter((i) => i.eco || i.clave);
        const opcionesUnidad = vigiladas.map((i) => {
            const eco = i.eco || i.clave;
            return '<option value="' + esc(eco) + '"' + (eco === _carga.eco ? ' selected' : '') + '>' + esc(eco) + (i.placa ? ' \u00b7 ' + esc(i.placa) : '') + '</option>';
        }).join('');
        if (!_carga.catalogo) _carga.catalogo = cargaCatalogo();
        const catalogo = _carga.catalogo;
        const opcionesCatalogo = (sel) => '<option value="">\u2014 sin asignar \u2014</option>' + catalogo.map((it, k) =>
            '<option value="' + k + '"' + (sel && it.texto === sel.texto && it.tipo === sel.tipo ? ' selected' : '') + '>' + esc(it.texto) + ' \u00b7 ' + esc(it.tipo) + '</option>').join('');
        const filasHtml = _carga.filas.map((f, i) => {
            const conf = rxCargaConfianza(f.score);
            return '<div class="carga-row' + (f.incluir ? '' : ' off') + '" data-i="' + i + '">' +
                '<label class="carga-check"><input type="checkbox" data-carga-fila="' + i + '"' + (f.incluir ? ' checked' : '') + '></label>' +
                '<div class="carga-cliente"><b>' + esc(f.cliente) + '</b><small class="carga-conf carga-conf-' + conf.clase + '">' + conf.etq + '</small></div>' +
                '<select class="carga-zona" data-carga-fila="' + i + '">' + opcionesCatalogo(f.item) + '</select>' +
                '</div>';
        }).join('') || '<div class="carga-vacio">Pega la lista de clientes o suelta el archivo (.xlsx, .csv, .txt) y pulsa <b>Emparejar</b>.</div>';
        const nMatch = _carga.filas.filter((f) => f.item).length;
        el.innerHTML =
            '<div class="carga-card">' +
            '<div class="carga-head"><span class="rondo-usym">' + UIS.route + '</span> Carga rapida de rutas' +
            '<span style="flex:1"></span><button class="carga-mini" data-carga="cerrar"><span class="rondo-usym">' + UIS.close + '</span></button></div>' +
            '<div class="carga-body">' +
            '<div class="carga-rowline">' +
            '<label>Unidad <select id="carga-unidad">' + opcionesUnidad + '</select></label>' +
            '<label>Modo <select id="carga-modo">' +
            '<option value="optimo"' + (_carga.modo === 'optimo' ? ' selected' : '') + '>Mejor ruta (circuito)</option>' +
            '<option value="secuencial"' + (_carga.modo === 'secuencial' ? ' selected' : '') + '>Secuencial</option>' +
            '</select></label>' +
            '<label>Motor <select id="carga-engine">' +
            '<option value="osrm"' + (_carga.engine === 'osrm' ? ' selected' : '') + '>OSRM</option>' +
            '<option value="astar"' + (_carga.engine === 'astar' ? ' selected' : '') + '>A*</option>' +
            '</select></label>' +
            '</div>' +
            '<textarea id="carga-texto" placeholder="Pega aqui los clientes (una linea o la tabla completa de Excel; detecta la columna Cliente).">' + esc(_carga.crudo || '') + '</textarea>' +
            '<div class="carga-drop" id="carga-drop"><span class="rondo-usym">' + UIS.drop + '</span> Arrastra aqui el .xlsx / .csv / .txt (o usa el selector) <input type="file" id="carga-file" accept=".xlsx,.csv,.tsv,.txt" hidden></div>' +
            '<div class="carga-actions">' +
            '<button class="carga-btn" data-carga="file"><span class="rondo-usym">' + UIS.upload + '</span> Elegir archivo</button>' +
            '<button class="carga-btn primary" data-carga="match"><span class="rondo-usym">' + UIS.check + '</span> Emparejar ' + (_carga.filas.length ? 'de nuevo' : 'clientes') + '</button>' +
            '<span class="carga-resumen">' + (_carga.filas.length ? (_carga.filas.length + ' cliente(s) \u00b7 ' + nMatch + ' con geocerca') : '') + '</span>' +
            '</div>' +
            '<div class="carga-list">' + filasHtml + '</div>' +
            '</div>' +
            '<div class="carga-foot">' +
            '<button class="carga-btn" data-carga="cerrar">Cancelar</button>' +
            '<button class="carga-btn" data-carga="asignar">Solo asignar</button>' +
            '<button class="carga-btn primary" data-carga="asignar-trazar"><span class="rondo-usym">' + UIS.route + '</span> Asignar y trazar</button>' +
            '</div>' +
            '</div>';
        try { rxBarridoAutofill(el); } catch (_) { /* noop */ }
        byId('carga-unidad').onchange = (e) => { if (_carga) _carga.eco = e.target.value; };
        byId('carga-modo').onchange = (e) => { if (_carga) _carga.modo = e.target.value; };
        byId('carga-engine').onchange = (e) => { if (_carga) _carga.engine = e.target.value; };
        byId('carga-texto').oninput = (e) => { if (_carga) _carga.crudo = e.target.value; };
        el.querySelectorAll('input[data-carga-fila]').forEach((b) => {
            b.onchange = () => { const i = +b.dataset.cargaFila; if (_carga && _carga.filas[i]) _carga.filas[i].incluir = b.checked; renderCarga(); };
        });
        el.querySelectorAll('select.carga-zona').forEach((s) => {
            s.onchange = () => {
                const i = +s.dataset.cargaFila;
                if (!_carga || !_carga.filas[i]) return;
                const it = catalogo[+s.value] || null;
                _carga.filas[i].item = it; _carga.filas[i].score = it ? 999 : 0;
                renderCarga();
            };
        });
        const drop = byId('carga-drop');
        if (drop) {
            drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
            drop.addEventListener('dragleave', () => drop.classList.remove('over'));
            drop.addEventListener('drop', (e) => {
                e.preventDefault(); drop.classList.remove('over');
                const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                if (f) cargarArchivo(f);
            });
        }
    }
    async function cargarArchivo(file) {
        if (!file || !_carga) return;
        try {
            let clientes = [];
            if (/\.xlsx$/i.test(file.name)) {
                const buf = await file.arrayBuffer();
                const filas = await rxCargaLeerXlsx(buf);
                if (!filas) { adviceWarn('No se pudo leer el Excel', 'Copia y pega la columna de clientes.'); return; }
                clientes = rxCargaParsearFilas(filas);
            } else {
                clientes = rxCargaParsearTexto(await file.text());
            }
            if (!clientes.length) { adviceWarn('Sin clientes', 'No se reconocio ninguna fila de cliente.'); return; }
            _carga.crudo = clientes.join('\n');
            emparejarCarga();
            adviceOk('Archivo cargado', clientes.length + ' cliente(s)');
        } catch (e) {
            adviceErr('Error leyendo el archivo', (e && e.message) || '');
        }
    }
    function emparejarCarga() {
        if (!_carga) return;
        const texto = (byId('carga-texto') && byId('carga-texto').value) || _carga.crudo || '';
        const clientes = rxCargaParsearTexto(texto);
        _carga.crudo = texto;
        _carga.catalogo = cargaCatalogo();
        _carga.filas = clientes.map((c) => {
            const m = rxCargaEmparejarCliente(c, _carga.catalogo);
            return { cliente: c, item: m.zona, score: m.score, incluir: !!m.zona };
        });
        renderCarga();
    }
    function asignarCarga(trazar) {
        if (!_carga) return;
        const eco = _carga.eco;
        const it = unitByEco(eco);
        const clave = it ? it.info.clave : eco;
        const paradas = _carga.filas
            .filter((f) => f.incluir && f.item)
            .map((f) => {
                const item = f.item;
                if (item.tipo === 'geocerca' && item.ref) return nuevaParada('geocerca', item.texto, centroDeZona(item.ref));
                return nuevaParada(item.tipo === 'ciudad' ? 'municipio' : item.tipo, item.texto, item.coords || null);
            });
        if (!paradas.length) { adviceWarn('Sin paradas', 'Empareja al menos un cliente con una geocerca.'); return; }
        const modo = _carga.modo === 'secuencial' ? 'secuencial' : 'optimo';
        const plan = { modo: modo, circuito: modo === 'optimo', paradas: paradas };
        APP.planes[clave] = plan;
        APP.watchMap[eco] = planATexto(plan);
        APP.cargaEco = eco;
        if (APP.orden.indexOf(eco) < 0) APP.orden.push(eco);
        guardarPlanes(); guardarLista(); guardarOrden();
        const engine = _carga.engine === 'astar' ? 'astar' : 'osrm';
        cerrarCarga();
        pintarModalLista();
        paintInfo();
        adviceOk('Ruta asignada a ' + eco, paradas.length + ' parada(s) \u00b7 ' + (modo === 'optimo' ? 'mejor ruta' : 'secuencial'));
        if (trazar) {
            if (engine === 'astar' && !APP.config.overpass) adviceWarn('A* desactivado', 'Se usara OSRM; activa Overpass en Ajustes \u00b7 Rutas.');
            planearRuta(eco, plan, null, (engine === 'astar' && APP.config.overpass) ? 'astar' : 'osrm');
            if (APP.tab === 'rutas') paintRutas();
        }
    }
    // Delegacion de clics (el boton y el modal se crean/inyectan dinamicamente).
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('#rondo-carga-btn')) { e.preventDefault(); abrirCarga(); return; }
        const acc = t.closest('[data-carga]');
        if (!acc) return;
        const a = acc.dataset.carga;
        if (a === 'cerrar') cerrarCarga();
        else if (a === 'file') { const f = byId('carga-file'); if (f) f.click(); }
        else if (a === 'match') emparejarCarga();
        else if (a === 'asignar') asignarCarga(false);
        else if (a === 'asignar-trazar') asignarCarga(true);
    });
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'carga-file' && e.target.files && e.target.files[0]) cargarArchivo(e.target.files[0]);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const el = byId('rondo-carga-modal');
        if (el && el.classList.contains('abierto')) cerrarCarga();
    });
