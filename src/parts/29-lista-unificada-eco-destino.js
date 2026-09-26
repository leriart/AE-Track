    /* ====================== LISTA UNIFICADA (eco + destino) ====================== */
    function guardarLista() {
        writeSession(SS.watch, APP.watchMap);
        paintInfo();
    }
    function guardarOrden() { writeSession(SS.orden, APP.orden); }
    // Mantiene APP.orden alineado con la lista: agrega las nuevas al final y
    // quita las que ya no estan.
    function sincronizarOrden() {
        if (!Array.isArray(APP.orden)) APP.orden = [];
        const keys = Object.keys(APP.watchMap);
        keys.forEach((k) => { if (APP.orden.indexOf(k) < 0) APP.orden.push(k); });
        APP.orden = APP.orden.filter((k) => keys.indexOf(k) >= 0);
        guardarOrden();
    }
    function indiceOrden(eco) {
        const i = APP.orden.indexOf(String(eco));
        return i < 0 ? 1e9 : i;
    }
    // Ordena un arreglo de objetos segun APP.orden usando getEco para extraer
    // el economico de cada elemento.
    function ordenarPorLista(arr, getEco) {
        return arr.slice().sort((a, b) => indiceOrden(getEco(a)) - indiceOrden(getEco(b)));
    }
    function claveNumerica(eco) {
        const n = parseInt(eco, 10);
        return Number.isFinite(n) ? n : null;
    }
    function marcarModoOrden(modo) {
        ['pegado', 'numero', 'numero-desc', 'alfabetico'].forEach((m) => {
            const b = byId('rondo-orden-' + m);
            if (b) b.classList.toggle('activo', m === modo);
        });
    }
    // Reacomoda las ventanas ya abiertas para que reflejen el orden actual.
    function reacomodarVentanas() {
        try { if (openWindows().length) organizeWindows(); } catch (_) { /* noop */ }
    }
    function aplicarOrdenModo(modo) {
        const base = Object.keys(APP.watchMap);
        if (!base.length) { advice('Lista vacia', 'Agrega unidades para poder ordenarlas'); return; }
        if (modo === 'pegado') {
            APP.orden = base.slice();
        } else if (modo === 'numero' || modo === 'numero-desc') {
            APP.orden = base.slice().sort((a, b) => {
                const na = claveNumerica(a), nb = claveNumerica(b);
                if (na == null && nb == null) return a.localeCompare(b, undefined, { numeric: true });
                if (na == null) return 1;
                if (nb == null) return -1;
                return na - nb;
            });
            if (modo === 'numero-desc') APP.orden.reverse();
        } else if (modo === 'alfabetico') {
            APP.orden = base.slice().sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        } else if (modo === 'invertir') {
            APP.orden = APP.orden.slice().reverse();
        }
        APP.ordenModo = (modo === 'invertir') ? '' : modo;
        guardarOrden();
        pintarModalLista();
        paintInfo();
        reacomodarVentanas();
        const etq = { pegado: 'orden de pegado', numero: 'numero (menor a mayor)', 'numero-desc': 'numero (mayor a menor)', alfabetico: 'alfabetico', invertir: 'invertido' }[modo] || modo;
        advice('Orden actualizado', etq);
    }
    function agregarALista(eco, destino) {
        eco = normEco(eco);
        if (!eco) return false;
        const destinoPrev = APP.watchMap[eco] || '';
        APP.watchMap[eco] = (destino || APP.watchMap[eco] || '').trim();
        if (APP.orden.indexOf(eco) < 0) APP.orden.push(eco);
        // v5.15: si el texto pegado cambia el destino, descarta el plan
        // estructurado previo para que el texto sea la fuente del plan.
        const it = unitByEco(eco);
        if (it && APP.planes[it.info.clave] && APP.watchMap[eco] !== destinoPrev) {
            delete APP.planes[it.info.clave];
            guardarPlanes();
        }
        guardarOrden();
        guardarLista();
        // Si se anade o cambia un destino y esta el auto-trazado activo,
        // se recalcula la ruta de esa unidad en background.
        if (APP.config.autoRuta && APP.watchMap[eco] && APP.watchMap[eco] !== destinoPrev) {
            const it = unitByEco(eco);
            if (it) {
                const r = rutaDe(it.info);
                if (!r || r.destinoTexto !== watchDest(it.info)) {
                    autoTrazarRutas();
                }
            }
        }
        return true;
    }
    function quitarDeLista(eco) {
        if (!eco) return;
        if (Object.prototype.hasOwnProperty.call(APP.watchMap, eco)) {
            delete APP.watchMap[eco];
            APP.orden = APP.orden.filter((k) => k !== eco);
            guardarOrden();
            guardarLista();
        }
        // v5.15: elimina tambien el plan estructurado de esa unidad.
        const it = unitByEco(eco);
        const clave = it ? it.info.clave : eco;
        if (APP.planes[clave]) { delete APP.planes[clave]; guardarPlanes(); }
    }
    function parsearPegado(texto) {
        if (!texto || !texto.trim()) return 0;
        const lineas = texto.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        let n = 0;
        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i];
            const ix = linea.indexOf('=');
            let eco, destino;
            if (ix < 0) { eco = linea; destino = ''; }
            else { eco = linea.slice(0, ix).trim(); destino = linea.slice(ix + 1).trim(); }
            if (eco && agregarALista(eco, destino)) n++;
        }
        return n;
    }
    // Resumen legible del plan de una unidad para la lista (chips de paradas).
    function resumenPlanHTML(eco) {
        const it = unitByEco(eco);
        let plan = it ? planDe(it.info) : null;
        if (!plan) plan = APP.planes[eco] || null;
        if (!plan || !plan.paradas || !plan.paradas.length) {
            return '<span class="rondo-dest-vacio">sin destino</span>';
        }
        const paradas = plan.paradas;
        const chips = paradas.slice(0, 3).map((p) => {
            const pre = p.tipo === 'geocerca' ? 'geo:' : (p.tipo === 'municipio' ? 'mun:' : (p.tipo === 'coord' ? '' : ''));
            return '<span class="rondo-dest-chip" title="' + esc(p.texto || '') + '">' + esc(pre + (p.texto || '')) + '</span>';
        }).join('');
        const mas = paradas.length > 3 ? '<span class="rondo-dest-mas" title="' + paradas.length + ' paradas">+' + (paradas.length - 3) + '</span>' : '';
        const modo = plan.modo === 'optimo' ? '<span class="rondo-dest-modo" title="Mejor ruta (optimiza y cierra el circuito)">mejor ruta</span>' : '';
        return chips + mas + modo;
    }
    function pintarModalLista() {
        const body = byId('rondo-modal-lista');
        if (!body) return;
        sincronizarOrden();
        marcarModoOrden(APP.ordenModo || '');
        const ecos = APP.orden.slice();
        const cnt = byId('rondo-modal-count');
        if (cnt) cnt.textContent = ecos.length;
        if (!ecos.length) {
            body.innerHTML = '<div class="lista-empty">Lista vacía. Pega arriba o añade una unidad.</div>';
            return;
        }
        body.innerHTML = ecos.map((eco, i) => (
            '<div class="lista-row" data-eco="' + esc(eco) + '">' +
            '<span class="rondo-drag-handle" draggable="true" title="Arrastrar para cambiar el orden">⠿</span>' +
            '<span class="orden-num">' + (i + 1) + '</span>' +
            '<span class="eco">' + esc(eco) + '</span>' +
            '<span class="rondo-dest-resumen">' + resumenPlanHTML(eco) + '</span>' +
            '<button class="mini rondo-plan-open" data-eco="' + esc(eco) + '" title="Editar destinos y paradas (geocercas, municipios, lugares)"><span class="rondo-usym">' + UIS.route + '</span> Paradas</button>' +
            '<button class="rondo-del" data-eco="' + esc(eco) + '" draggable="false" title="Quitar de la lista"><span class="rondo-usym">' + UIS.close + '</span></button>' +
            '</div>'
        )).join('');
    }
    // Arrastrar y soltar para reordenar la lista.
    function inicializarDragLista() {
        const cont = byId('rondo-modal-lista');
        if (!cont || cont._dragInit) return;
        cont._dragInit = true;
        let dragEco = null;
        cont.addEventListener('dragstart', (e) => {
            const h = e.target.closest && e.target.closest('.rondo-drag-handle');
            if (!h) { e.preventDefault(); return; }
            const row = h.closest('.lista-row');
            dragEco = row ? row.dataset.eco : null;
            if (row) row.classList.add('arrastrando');
            try { e.dataTransfer.setData('text/plain', dragEco || ''); e.dataTransfer.effectAllowed = 'move'; } catch (_) { /* noop */ }
        });
        cont.addEventListener('dragover', (e) => {
            if (!dragEco) return;
            e.preventDefault();
            const over = e.target.closest && e.target.closest('.lista-row');
            const dragging = cont.querySelector('.lista-row.arrastrando');
            if (!over || !dragging || over === dragging) return;
            const rect = over.getBoundingClientRect();
            const after = (e.clientY - rect.top) > rect.height / 2;
            cont.insertBefore(dragging, after ? over.nextSibling : over);
        });
        cont.addEventListener('drop', (e) => { if (dragEco) e.preventDefault(); });
        cont.addEventListener('dragend', () => {
            const dragging = cont.querySelector('.lista-row.arrastrando');
            if (dragging) dragging.classList.remove('arrastrando');
            dragEco = null;
            const ecos = Array.prototype.slice.call(cont.querySelectorAll('.lista-row')).map((r) => r.dataset.eco).filter(Boolean);
            if (ecos.length) {
                APP.orden = ecos;
                APP.ordenModo = '';
                guardarOrden();
            }
            pintarModalLista();
            reacomodarVentanas();
        });
    }

