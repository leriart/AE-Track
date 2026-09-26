    /* ====================== PAINT ====================== */
    function setTab(name) {
        APP.tab = name;
        const ids = ['dash', 'unidades', 'alertas', 'rutas', 'caravana', 'replay', 'chat', 'zonas'];
        ids.forEach((n) => {
            const el = byId('rondo-wrap-' + n);
            if (el) el.style.display = (n === name) ? '' : 'none';
        });
        document.querySelectorAll('#rondo-tabs .tab').forEach((t) => {
            const act = t.dataset.tab === name;
            t.classList.toggle('activo', act);
            t.setAttribute('aria-selected', act ? 'true' : 'false');
        });
        paintTools();
        if (name === 'dash') paintKPI();
        else if (name === 'unidades') paintTabla();
        else if (name === 'alertas') paintAlertas();
        else if (name === 'rutas') paintRutas();
        else if (name === 'caravana') paintCaravana();
        else if (name === 'replay') { rxReplayPintar(); }
        else if (name === 'chat') pintarChat();
        else if (name === 'zonas') { aplicarZonasVista(); paintGeocercas(); paintRiesgo(); }
        paintCounters();
        paintStateBadge();
        paintInfo();
    }
    // Muestra solo las herramientas relevantes a la pestaña activa. Cada
    // boton/select/input de la barra .tools lleva data-tabs con las pestañas
    // en las que aplica (vacio = siempre).
    function paintTools() {
        const tab = APP.tab || 'dash';
        const cont = byId('rondo-tools');
        if (!cont) return;
        let visibles = 0;
        cont.querySelectorAll('.rondo-tool').forEach((el) => {
            const tabs = String(el.dataset.tabs || '').split(',').map((s) => s.trim()).filter(Boolean);
            const show = tabs.length === 0 || tabs.indexOf(tab) >= 0;
            el.style.display = show ? '' : 'none';
            if (show) visibles++;
        });
        cont.style.display = visibles ? '' : 'none';
    }
    function paintInfo() {
        const info = byId('rondo-info');
        if (!info) return;
        const n = APP.unidades.filter(shouldWatch).length;
        info.textContent = n + ' unidades · ' + (APP.config.watchAll ? 'monitor todas' : ('sel ' + APP.seleccion.size))
            + ' · ' + APP.historial.length + ' avisos';
    }
    function paintCounters() {
        const watched = APP.unidades.filter(shouldWatch);
        const on = watched.filter((u) => unitState(u).online).length;
        const cOn = byId('rondo-c-on');
        const cTot = byId('rondo-c-tot');
        const cAl = byId('rondo-c-al');
        const cRu = byId('rondo-c-ru');
        const cZn = byId('rondo-c-zn');
        if (cOn) cOn.textContent = on;
        if (cTot) cTot.textContent = watched.length;
        if (cAl) cAl.textContent = APP.historial.length;
        if (cRu) cRu.textContent = Object.keys(APP.rutas).length;
        if (cZn) cZn.textContent = (APP.zonas || []).length;
        const cCv = byId('rondo-c-cv');
        if (cCv) cCv.textContent = APP.caravanaEco ? countCaravana() : 0;
    }
    function countCaravana() {
        const it = unitByEco(APP.caravanaEco);
        if (!it) return 0;
        const info = parseUnitName(it.u);
        const st = unitState(it.u);
        try {
            const r = unidadesEnCaravana(info, st);
            return (r && r.miembros) ? r.miembros.length : 0;
        } catch (_) { return 0; }
    }
    function paintStateBadge() {
        const b = byId('rondo-estado-barra');
        if (!b) return;
        const watched = APP.unidades.filter(shouldWatch);
        const off = watched.filter((u) => !unitState(u).online).length;
        const det = watched.filter((u) => { const s = unitState(u); return s.online && s.estado === 'detenida'; }).length;
        const criticos = APP.historial.filter((a) => a.sev === 'critico' && (Date.now() - a.ts) < 30 * 60000).length;
        let cls = 'ok';
        if (nmActivo()) cls = 'nm';
        else if (criticos > 0) cls = 'bad';
        else if (off > 0 || det > watched.length / 3) cls = 'warn';
        b.className = 'rondo-badge-estado ' + cls;
        b.title = nmActivo()
            ? 'No molestar hasta ' + new Date(APP.noMolestar.hasta).toLocaleTimeString().slice(0, 5)
            : 'criticos: ' + criticos + ' · sin señal: ' + off + ' · detenidas: ' + det;
    }
    // Igual que setHtml, pero conserva la posicion de scroll del propio
    // contenedor cuando se reescribe. Las listas del Dashboard se repintan
    // cada segundo; sin esto, quien habia bajado en la lista volvia arriba
    // en cada refresco.
    function rxSetHtmlKeepScroll(el, html) {
        if (!el) return false;
        const top = el.scrollTop, left = el.scrollLeft;
        const cambio = setHtml(el, html);
        if (cambio && (top || left)) { el.scrollTop = top; el.scrollLeft = left; }
        return cambio;
    }
    // Lista "Requieren atención": unidades sin señal, con exceso, desviadas,
    // detenidas o con ruta nueva sin trazar, ordenadas por prioridad. Cada fila
    // abre la ventana de la unidad.
    function paintAtencion(watched) {
        const cont = byId('rondo-atencion');
        if (!cont) return;
        const ahora = Date.now() / 1000;
        const items = [];
        watched.forEach((u) => {
            const info = parseUnitName(u);
            const st = unitState(u);
            const memo = APP.memo[info.clave] || {};
            const eco = info.eco || info.placa || String(info.id);
            if (!st.online) {
                items.push({ eco, tipo: 'offline', peso: 4000 + (st.edadMin || 0), txt: 'sin señal hace ' + ageText(st.edadMin) });
                return;
            }
            const lim = limiteDe(info);
            if (st.vel > lim) items.push({ eco, tipo: 'vel', peso: 3000 + st.vel, txt: 'a ' + Math.round(st.vel) + ' km/h (límite ' + lim + ')' });
            if (memo.desviadoDesde) {
                const min = (ahora - memo.desviadoDesde) / 60;
                items.push({ eco, tipo: 'desv', peso: 2000 + min, txt: 'desviada de su ruta hace ' + ageText(min) });
            }
            // Pendiente de trazar ruta: el destino esta definido pero la ruta
            // aun no esta calculada (o esta obsoleta). Es prioritario para que
            // el operario sepa que la unidad esta sin guia de ruta.
            const dest = watchDest(info);
            const ruta = rutaDe(info);
            if (dest && (!ruta || ruta.destinoTexto !== dest)) {
                items.push({ eco, tipo: 'ruta-pend', peso: 1500, txt: 'sin ruta hacia ' + dest });
            }
            if (st.estado === 'detenida' && memo.detenidoDesde) {
                const min = (ahora - memo.detenidoDesde) / 60;
                items.push({ eco, tipo: 'det', peso: 1000 + min, txt: 'detenida hace ' + ageText(min) });
            }
        });
        items.sort((a, b) => b.peso - a.peso);
        const top = items.slice(0, 5);
        if (!top.length) {
            rxSetHtmlKeepScroll(cont, '<div style="padding:8px;color:var(--rondo-fg-mute)">Todo en orden: ninguna unidad requiere atención.</div>');
            return;
        }
        const meta = {
            offline: { col: 'var(--rondo-bad-fg)', ic: UIS.offline },
            vel: { col: 'var(--rondo-warn-fg)', ic: UIS.speed },
            desv: { col: 'var(--rondo-warn-fg)', ic: UIS.route },
            det: { col: 'var(--rondo-accent-2)', ic: UIS.stopped },
            'ruta-pend': { col: 'var(--rondo-warn-fg)', ic: UIS.route }
        };
        rxSetHtmlKeepScroll(cont, top.map((it) => {
            const mm = meta[it.tipo] || meta.det;
            return '<div class="alerta rondo-atencion-item" data-eco="' + esc(it.eco) + '" style="border-left:3px solid ' + mm.col + ';cursor:pointer" title="Abrir la ventana de ' + esc(it.eco) + '">' +
                '<span class="ico rondo-usym" style="color:' + mm.col + '">' + mm.ic + '</span>' +
                '<div class="cuerpo"><b>' + esc(it.eco) + '</b><span>' + esc(it.txt) + '</span></div>' +
                '</div>';
        }).join(''));
    }
    function paintKPI() {
        const watched = APP.unidades.filter(shouldWatch);
        const estados = watched.map(unitState);
        const total = estados.length;
        const on = estados.filter((s) => s.online).length;
        const off = total - on;
        const mov = estados.filter((s) => s.estado === 'moviendo').length;
        const det = estados.filter((s) => s.estado === 'detenida').length;
        const vel = estados.filter((s) => s.online).reduce((a, s) => a + s.vel, 0) / Math.max(1, on);
        const enZona = new Set();
        estados.forEach((s) => { if (s.online) { const z = zoneAt(s.lat, s.lon); if (z) enZona.add(z); } });
        const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
        const aho = APP.historial.filter((a) => a.ts >= inicio.getTime()).length;
        const critAho = APP.historial.filter((a) => a.sev === 'critico' && a.ts >= inicio.getTime()).length;
        const kv = (id, v) => { const e = byId(id); if (e) e.textContent = v; };
        kv('rondo-kpi-on', on);
        kv('rondo-kpi-off', off);
        kv('rondo-kpi-det', det);
        kv('rondo-kpi-mov', mov);
        kv('rondo-kpi-vel', on ? Math.round(vel) + ' km/h prom.' : '');
        kv('rondo-kpi-on-pct', total ? ((on / total) * 100).toFixed(0) + '%' : '');
        kv('rondo-kpi-off-pct', total ? ((off / total) * 100).toFixed(0) + '%' : '');
        kv('rondo-kpi-zonas', enZona.size);
        kv('rondo-kpi-zonas-pct', (APP.zonas || []).length ? 'de ' + APP.zonas.length : '');
        kv('rondo-kpi-aho', aho);
        kv('rondo-kpi-criticos', critAho ? critAho + ' criticas' : '');

        paintSalud(on, off, total, mov, det);
        const totalD = Math.max(1, total);
        const segOn = byId('rondo-dist-on');
        const segDet = byId('rondo-dist-det');
        const segOff = byId('rondo-dist-off');
        if (segOn) segOn.style.width = (mov / totalD * 100) + '%';
        if (segDet) segDet.style.width = (det / totalD * 100) + '%';
        if (segOff) segOff.style.width = (off / totalD * 100) + '%';
        const legend = byId('rondo-dist-legend');
        if (legend) {
            const pct = (v) => (total ? Math.round((v / total) * 100) + '%' : '0%');
            setHtml(legend,
                '<span><i class="on"></i> Mov. ' + mov + ' (' + pct(mov) + ')</span>' +
                '<span><i class="det"></i> Det. ' + det + ' (' + pct(det) + ')</span>' +
                '<span><i class="off"></i> Off ' + off + ' (' + pct(off) + ')</span>');
        }
        paintAtencion(watched);
        paintZonasDash();
        paintRutasDash();

        const recientes = byId('rondo-kpi-recientes');
        if (recientes) {
            const items = APP.historial.slice(0, 6);
            rxSetHtmlKeepScroll(recientes, items.length
                ? items.slice(0, 4).map((a) => (
                    '<div class="alerta" style="border-left:3px solid ' + (COL[a.sev] || '#555') + '">' +
                    '<span class="ico rondo-usym" style="color:' + (COL[a.sev] || '#777') + '">' + (SEV_UIS[a.sev] || UIS.info) + '</span>' +
                    '<div class="cuerpo"><b>' + esc(a.titulo) + '</b>' +
                    (a.detalle ? '<span>' + esc(a.detalle) + '</span>' : '') + '</div>' +
                    '<span class="hora">' + new Date(a.ts).toLocaleTimeString().slice(0, 5) + '</span>' +
                    '</div>'
                )).join('')
                : '<div class="rondo-dash-empty">' + LANG.recientesNone + '</div>');
        }
        paintSparkline();
    }
    function paintSalud(on, off, total, mov, det) {
        const pctEl = byId('rondo-salud-pct');
        const subEl = byId('rondo-salud-sub');
        const tagEl = byId('rondo-salud-tag');
        if (!pctEl) return;
        const pct = total ? Math.round((on / total) * 100) : null;
        pctEl.textContent = (pct == null) ? '\u2014' : pct + '%';
        let cls = 'ok', tag = 'OK';
        if (pct == null) { cls = ''; tag = '\u2014'; }
        else if (pct < 50) { cls = 'bad'; tag = 'BAJA'; }
        else if (pct < 85) { cls = 'warn'; tag = 'ATENCION'; }
        pctEl.className = 'rondo-salud-pct ' + cls;
        if (tagEl) { tagEl.className = 'rondo-salud-tag ' + cls; tagEl.textContent = tag; }
        const card = byId('rondo-salud');
        if (card) { card.classList.toggle('warn', cls === 'warn'); card.classList.toggle('bad', cls === 'bad'); }
        if (subEl) {
            const resumen = total
                ? '<b>' + on + '</b> en linea \u00b7 <b>' + off + '</b> sin senal \u00b7 <b>' + det + '</b> detenidas \u00b7 <b>' + mov + '</b> en mov.'
                : 'Sin unidades vigiladas (abre la lista para anadir).';
            subEl.innerHTML = resumen;
        }
    }
    function paintZonasDash() {
        const cont = byId('rondo-dash-zonas');
        const countEl = byId('rondo-zonas-n');
        if (!cont) return;
        const watched = APP.unidades.filter(shouldWatch);
        const items = [];
        if (APP.zonas && APP.zonas.length) {
            for (let i = 0; i < APP.zonas.length; i++) {
                const z = APP.zonas[i];
                const dentro = watched.filter((u) => {
                    const st = unitState(u); return st.online && inZone(st.lat, st.lon, z);
                });
                if (dentro.length) {
                    const ecos = dentro.map((u) => parseUnitName(u).eco || parseUnitName(u).placa).filter(Boolean);
                    items.push({ z, dentro, ecos });
                }
            }
        }
        items.sort((a, b) => b.dentro.length - a.dentro.length);
        const top = items.slice(0, 6);
        if (countEl) countEl.textContent = items.length;
        rxSetHtmlKeepScroll(cont, top.length
            ? top.map((it) =>
                '<div class="rondo-geo-dash" data-zona="' + esc(it.z.n || '') + '">' +
                '<span class="ico rondo-usym">' + UIS.zone + '</span>' +
                '<div class="body">' +
                '<b>' + esc(it.z.n || ('Zona ' + it.z.id)) + '</b>' +
                '<span>' + esc(it.ecos.slice(0, 6).join(' \u00b7 ')) + (it.ecos.length > 6 ? ' \u2026' : '') + '</span>' +
                '</div>' +
                '<span class="pct">' + it.dentro.length + '</span>' +
                '</div>'
              ).join('')
            : '<div class="rondo-dash-empty">Ninguna geocerca con unidades dentro (activa <b>Cargar geocercas</b> en Ajustes).</div>');
    }
    function paintRutasDash() {
        const cont = byId('rondo-dash-rutas');
        const countEl = byId('rondo-rutas-n');
        if (!cont) return;
        const watched = APP.unidades.filter(shouldWatch);
        const items = [];
        for (let i = 0; i < watched.length; i++) {
            const u = watched[i];
            const info = parseUnitName(u);
            const st = unitState(u);
            const destino = watchDest(info);
            const ruta = rutaDe(info);
            if (!destino) continue;
            const er = estadoRuta(info, st);
            if (er.estado === 'SIN POSICION') continue;
            const pct = er.snap ? Math.round(er.snap.progreso * 100) : null;
            const etaSeg = er.snap ? calcularETA(er.snap, er.ruta, st.vel) : null;
            items.push({ eco: info.eco || info.placa || String(info.id), estado: er.estado, pct, etaSeg, destino });
        }
        items.sort((a, b) => (b.pct || 0) - (a.pct || 0));
        const top = items.slice(0, 6);
        if (countEl) countEl.textContent = items.length;
        rxSetHtmlKeepScroll(cont, top.length
            ? top.map((it) => {
                const etaTxt = (it.etaSeg != null && isFinite(it.etaSeg)) ? (Math.round(it.etaSeg / 60) + ' min') : '\u2014';
                return '<div class="rondo-ruta-dash" data-eco="' + esc(it.eco) + '">' +
                    '<span class="ico rondo-usym">' + UIS.route + '</span>' +
                    '<div class="body">' +
                    '<b>' + esc(it.eco) + ' \u00b7 ' + esc(it.estado) + '</b>' +
                    '<span>' + esc(it.destino || '') + '</span>' +
                    (it.pct != null ? '<div class="ruta-bar"><div class="ruta-bar-fill" style="width:' + it.pct + '%"></div></div>' : '') +
                    '</div>' +
                    '<span class="pct">' + (it.pct != null ? (it.pct + '%') : '\u2014') + '</span>' +
                    '</div>';
              }).join('')
            : '<div class="rondo-dash-empty">Sin rutas activas (define destinos desde la lista vigilada).</div>');
    }
        function paintSparkline() {
        const svg = byId('rondo-spark');
        if (!svg) { return; }
        const on = (APP.kpi.online || []).slice(-60);
        const off = (APP.kpi.offline || []).slice(-60);
        if (on.length < 2) {
            setHtml(svg, '<text x="100" y="22" text-anchor="middle" fill="currentColor" font-size="11">Recolectando datos...</text>');
            return;
        }
        const todos = on.concat(off);
        const max = Math.max.apply(null, todos);
        const min = Math.min.apply(null, todos);
        const h = 32, w = 200;
        const dx = w / (on.length - 1);
        const linea = (data) => data.map((v, i) => {
            const x = i * dx;
            const y = h - ((v - min) / Math.max(1, max - min)) * h;
            return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
        }).join(' ');
        const puntosOn = linea(on);
        const areaOn = puntosOn + ' L' + w + ',' + h + ' L0,' + h + ' Z';
        const puntosOff = off.length === on.length ? linea(off) : '';
        setHtml(svg,
            '<path d="' + areaOn + '" fill="var(--rondo-accent-2)" fill-opacity="0.18" stroke="none"></path>' +
            '<path d="' + puntosOn + '" stroke="var(--rondo-accent-2)" stroke-width="1.6"></path>' +
            (puntosOff ? '<path d="' + puntosOff + '" stroke="var(--rondo-fg-mute)" stroke-width="1" stroke-dasharray="3 3" fill="none"></path>' : '') +
            '<text x="6" y="14" fill="var(--rondo-fg-dim)" font-size="10">ONLINE ' + on[on.length - 1] + ' · OFFLINE ' + (off[off.length - 1] != null ? off[off.length - 1] : '-') + '</text>');
    }
    // Valor de ordenamiento por columna de la tabla de unidades.
    function valorOrden(x, col) {
        switch (col) {
            case 'eco': return x.info.eco || '';
            case 'placa': return x.info.placa || '';
            case 'estado': return x.st.estado || '';
            case 'edad': return x.st.edadMin == null ? Infinity : x.st.edadMin;
            case 'vel': return x.st.vel || 0;
            case 'zona': return (x.zona != null) ? x.zona : zoneAt(x.st.lat, x.st.lon);
            case 'odo': { const o = odometroDe(x.info); return o ? o.m : 0; }
            case 'ruta': {
                // Orden por estado de ruta: primero "LLEGO", luego "DESV",
                // "EN RUTA", "SIN RUTA" y al final "SIN POSICION".
                const er = estadoRuta(x.info, x.st);
                const peso = { 'LLEGO': 0, 'DESV': 1, 'EN RUTA': 2, 'SIN RUTA': 3, 'SIN POSICION': 4 };
                return (peso[er.estado] != null) ? peso[er.estado] : 5;
            }
            default: return '';
        }
    }
    function cmpOrd(a, b) {
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    }
    function rutaClasePill(estado) {
        switch (estado) {
            case 'LLEGO': return 'ok';
            case 'DESV': return 'warn';
            case 'EN RUTA': return 'on';
            case 'SIN POSICION': return 'off';
            default: return 'mute';
        }
    }
    function actualizarCabecerasOrden() {
        const sel = byId('rondo-uni-orden');
        if (sel && sel.value !== (APP.sortCol || '')) sel.value = APP.sortCol || '';
        const dir = byId('rondo-uni-dir');
        if (dir) {
            const icon = dir.querySelector('.rondo-usym');
            if (icon) icon.innerHTML = APP.sortDir === 'desc' ? UIS.down : UIS.up;
            dir.title = APP.sortDir === 'desc' ? 'Orden descendente (clic para ascendente)' : 'Orden ascendente (clic para descendente)';
        }
    }
    // Render incremental de listas: reutiliza los nodos existentes y actualiza
    // sus campos EN EL SITIO (sin reescribir innerHTML), de modo que no se
    // reinician animaciones/transiciones ni se pierde el scroll ni el foco.
    function renderLista(cont, items, claveDe, crear, actualizar) {
        const mapa = cont._rondoItems || (cont._rondoItems = new Map());
        invalidarHtml(cont.id);
        cont._rondoVacio = null;
        const nodos = [];
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const k = claveDe(it);
            let n = mapa.get(k);
            if (!n) { n = crear(it); mapa.set(k, n); }
            actualizar(n, it);
            nodos.push(n);
        }
        const vigentes = new Set(items.map(claveDe));
        mapa.forEach((n, k) => {
            if (vigentes.has(k)) return;
            if (n.parentNode) n.parentNode.removeChild(n);
            mapa.delete(k);
        });
        const setNodos = new Set(nodos);
        Array.prototype.slice.call(cont.children).forEach((ch) => {
            if (!setNodos.has(ch)) cont.removeChild(ch);
        });
        let igual = cont.children.length === nodos.length;
        if (igual) {
            for (let i = 0; i < nodos.length; i++) {
                if (cont.children[i] !== nodos[i]) { igual = false; break; }
            }
        }
        if (!igual) {
            for (let i = 0; i < nodos.length; i++) cont.appendChild(nodos[i]);
        }
    }
    // Crea el esqueleto de una tarjeta de unidad y cachea las referencias a
    // los nodos que cambian con frecuencia.
    function unidCardNode() {
        const n = document.createElement('div');
        n.className = 'rondo-uni-card fila';
        n.innerHTML =
            '<label class="u-check" title="Seleccionar la unidad">' +
            '<input type="checkbox" class="rondo-sel">' +
            '</label>' +
            '<div class="u-body">' +
            '<div class="u-head">' +
            '<span class="u-eco"><span class="rondo-usym u-eco-watch" title="En lista vigilada" style="display:none">' + UIS.watch + '</span><span class="u-eco-txt"></span></span>' +
            '<span class="u-placa"></span>' +
            '<span class="rondo-pill u-estado"><span class="rondo-usym u-estado-ico"></span><span class="u-estado-txt"></span></span>' +
            '<span class="u-vel"><span class="u-vel-num"></span><small class="u-vel-lim" style="display:none"></small><em>km/h</em></span>' +
            '<span class="u-quick">' +
            '<button class="mini u-open" title="Abrir ventana de la unidad"><span class="rondo-usym">' + UIS.panel + '</span></button>' +
            '<button class="mini u-route" title="Paradas y ruta"><span class="rondo-usym">' + UIS.route + '</span></button>' +
            '<button class="mini u-map" title="Ver en OpenStreetMap"><span class="rondo-usym">' + UIS.pin + '</span></button>' +
            '<button class="mini u-watch" title="Anadir a la lista vigilada"><span class="rondo-usym">' + UIS.watch + '</span></button>' +
            '<button class="mini u-sil rondo-sil" title="Silenciar unidad"><span class="rondo-usym">' + UIS.alertas + '</span></button>' +
            '</span>' +
            '</div>' +
            '<div class="u-meta">' +
            '<span class="u-tag"><span class="rondo-usym">' + UIS.clock + '</span><span class="u-v-edad"></span></span>' +
            '<span class="u-tag u-t-zona" style="display:none"><span class="rondo-usym">' + UIS.zone + '</span><span class="u-v-zona"></span></span>' +
            '<span class="u-tag u-t-coords" style="display:none"><span class="rondo-usym">' + UIS.info + '</span><span class="u-v-coords"></span></span>' +
            '<span class="u-tag"><span class="rondo-usym">' + UIS.pin + '</span><span class="u-v-km"></span></span>' +
            '</div>' +
            '<div class="u-ruta">' +
            '<span class="rondo-pill u-ruta-pill">SIN RUTA</span>' +
            '<div class="u-ruta-bar" style="display:none"><div class="u-ruta-fill" style="width:0%"></div></div>' +
            '<span class="u-ruta-meta" style="display:none"></span>' +
            '</div>' +
            '</div>';
        const q = (s) => n.querySelector(s);
        n._ref = {
            check: q('.rondo-sel'),
            ecoWatch: q('.u-eco-watch'), ecoTxt: q('.u-eco-txt'), placa: q('.u-placa'),
            estado: q('.u-estado'), estadoIco: q('.u-estado-ico'), estadoTxt: q('.u-estado-txt'),
            vel: q('.u-vel'), velNum: q('.u-vel-num'), velLim: q('.u-vel-lim'),
            btnWatch: q('.u-watch'), btnSil: q('.u-sil'), silIco: q('.u-sil .rondo-usym'),
            tZona: q('.u-t-zona'), vZona: q('.u-v-zona'),
            tCoords: q('.u-t-coords'), vCoords: q('.u-v-coords'),
            vEdad: q('.u-v-edad'), vKm: q('.u-v-km'),
            rutaPill: q('.u-ruta-pill'), rutaBar: q('.u-ruta-bar'),
            rutaFill: q('.u-ruta-fill'), rutaMeta: q('.u-ruta-meta')
        };
        return n;
    }
    // Actualiza los campos de una tarjeta de unidad sin recrear el DOM.
    function unidCardUpdate(n, x) {
        const info = x.info, st = x.st, zona = x.zona;
        const r = n._ref;
        const eco = info.eco || '';
        const clave = info.clave;
        const sel = APP.seleccion.has(info.eco) || APP.seleccion.has(info.placa);
        const sil = APP.dismissed.has(clave);
        const vig = isWatched(info);
        const clase = st.estado === 'offline' ? 'off' : (st.estado === 'detenida' ? 'det' : 'on');
        const nuevaClase = 'rondo-uni-card fila ' + clase + (sel ? ' sel-row' : '');
        if (n.className !== nuevaClase) n.className = nuevaClase;
        n.dataset.eco = eco;
        if (r.check.dataset.eco !== eco) r.check.dataset.eco = eco;
        if (r.check.dataset.placa !== (info.placa || '')) r.check.dataset.placa = info.placa || '';
        if (r.check.checked !== sel) r.check.checked = sel;
        if (n._estadoKey !== clase) {
            n._estadoKey = clase;
            r.estadoIco.innerHTML = st.estado === 'offline' ? UIS.offline : (st.estado === 'detenida' ? UIS.stopped : UIS.moving);
        }
        r.estado.className = 'rondo-pill u-estado ' + clase;
        const txt = st.estado === 'offline' ? 'sin señal' : (st.estado === 'detenida' ? 'detenida' : 'moviendo');
        if (r.estadoTxt.textContent !== txt) r.estadoTxt.textContent = txt;
        if (r.ecoWatch.style.display !== (vig ? '' : 'none')) r.ecoWatch.style.display = vig ? '' : 'none';
        const ecoTxt = eco || '-';
        if (r.ecoTxt.textContent !== ecoTxt) r.ecoTxt.textContent = ecoTxt;
        const placa = info.placa || '';
        if (r.placa.textContent !== placa) r.placa.textContent = placa;
        const lim = limiteDe(info);
        const excede = st.online && st.vel > lim;
        const velTxt = String(Math.round(st.vel));
        if (r.velNum.textContent !== velTxt) r.velNum.textContent = velTxt;
        const limTxt = (lim !== APP.config.velMax) ? '/' + lim : '';
        if (r.velLim.textContent !== limTxt) r.velLim.textContent = limTxt;
        if (r.velLim.style.display !== (limTxt ? '' : 'none')) r.velLim.style.display = limTxt ? '' : 'none';
        r.vel.classList.toggle('excede', excede);
        const velTitle = (lim !== APP.config.velMax ? 'límite de la unidad: ' + lim + ' km/h' : 'límite global: ' + lim + ' km/h');
        if (r.vel.title !== velTitle) r.vel.title = velTitle;
        if (n._vig !== vig) {
            n._vig = vig;
            r.btnWatch.classList.toggle('on', vig);
            r.btnWatch.title = vig ? 'Quitar de la lista vigilada' : 'Anadir a la lista vigilada';
        }
        if (n._sil !== sil) {
            n._sil = sil;
            r.silIco.innerHTML = sil ? UIS.mute : UIS.alertas;
            r.btnSil.classList.toggle('on', sil);
            r.btnSil.title = sil ? 'Reactivar avisos' : 'Silenciar unidad';
        }
        const edad = ageText(st.edadMin);
        if (r.vEdad.textContent !== edad) r.vEdad.textContent = edad;
        const zonaTxt = zona || '';
        if (r.vZona.textContent !== zonaTxt) r.vZona.textContent = zonaTxt;
        if (r.tZona.style.display !== (zonaTxt ? '' : 'none')) r.tZona.style.display = zonaTxt ? '' : 'none';
        const coords = (APP.config.mostrarCoords && st.lat != null) ? st.lat.toFixed(3) + ', ' + st.lon.toFixed(3) : '';
        if (r.vCoords.textContent !== coords) r.vCoords.textContent = coords;
        if (r.tCoords.style.display !== (coords ? '' : 'none')) r.tCoords.style.display = coords ? '' : 'none';
        const odo = odometroDe(info);
        const kmTxt = (odo ? Math.round(odo.m / 100) / 10 : 0).toFixed(1) + ' km';
        if (r.vKm.textContent !== kmTxt) r.vKm.textContent = kmTxt;
        // Ruta: pill, barra de progreso (con su transicion) y ETA.
        const er = estadoRuta(info, st);
        if (r.rutaPill.textContent !== er.estado) r.rutaPill.textContent = er.estado;
        r.rutaPill.className = 'rondo-pill u-ruta-pill ' + rutaClasePill(er.estado);
        if (er.snap) {
            const pct = Math.round(er.snap.progreso * 100);
            const etaSeg = calcularETA(er.snap, er.ruta, velSuavizada(info, st));
            const etaTxt = etaSeg != null ? Math.round(etaSeg / 60) + ' min' : '-';
            if (r.rutaBar.style.display) r.rutaBar.style.display = '';
            r.rutaFill.style.width = pct + '%';
            const meta = pct + '% · ' + etaTxt;
            if (r.rutaMeta.textContent !== meta) r.rutaMeta.textContent = meta;
            if (r.rutaMeta.style.display) r.rutaMeta.style.display = '';
        } else if (watchDest(info)) {
            if (r.rutaBar.style.display !== 'none') r.rutaBar.style.display = 'none';
            if (r.rutaMeta.textContent !== 'trazando...') r.rutaMeta.textContent = 'trazando...';
            if (r.rutaMeta.style.display) r.rutaMeta.style.display = '';
        } else {
            if (r.rutaBar.style.display !== 'none') r.rutaBar.style.display = 'none';
            if (r.rutaMeta.style.display !== 'none') r.rutaMeta.style.display = 'none';
        }
    }
    function paintTabla() {
        const body = byId('rondo-body');
        if (!body) return;
        const filtro = (APP.filtro || '').toLowerCase();
        const est = APP.filtEstado || 'todas';
        const lista = APP.unidades
            .filter(shouldWatch)
            .map((u) => {
                const info = parseUnitName(u);
                const st = unitState(u);
                // La zona se calcula una sola vez por unidad y se reutiliza en
                // el filtro, la tarjeta y el orden.
                return { info: info, st: st, zona: zoneAt(st.lat, st.lon) };
            })
            .filter((x) => {
                if (est === 'moviendo' && x.st.estado !== 'moviendo') return false;
                if (est === 'detenida' && x.st.estado !== 'detenida') return false;
                if (est === 'offline' && x.st.estado !== 'offline') return false;
                if (est === 'vigilada' && !isWatched(x.info)) return false;
                if (est === 'silenciada' && !APP.dismissed.has(x.info.clave)) return false;
                if (!filtro) return true;
                return (x.info.eco + ' ' + x.info.placa + ' ' + x.info.nombre + ' ' + x.zona).toLowerCase().indexOf(filtro) >= 0;
            });
        if (APP.sortCol) {
            const col = APP.sortCol;
            lista.forEach((x) => { x._ord = valorOrden(x, col); });
        }
        lista.sort((a, b) => {
            if (APP.sortCol) {
                const r = cmpOrd(a._ord, b._ord);
                if (r !== 0) return APP.sortDir === 'desc' ? -r : r;
            } else {
                const peso = (e) => e === 'offline' ? 0 : (e === 'detenida' ? 1 : 2);
                const d = peso(a.st.estado) - peso(b.st.estado);
                if (d !== 0) return d;
            }
            return a.info.eco.localeCompare(b.info.eco, undefined, { numeric: true });
        });
        if (!lista.length) {
            body._rondoItems = new Map();
            const vacio = emptyState(UIS.panel, LANG.sinUni,
                'Activa <b>Monitorear todas</b> en Ajustes, o abre la lista y agrega tus economicos.',
                '<button class="mini rondo-vacio-acc" data-acc="abrir-lista"><span class="rondo-usym">' + UIS.gear + '</span> Abrir lista de unidades</button>');
            const html = '<div class="rondo-uni-empty">' + vacio + '</div>';
            // Solo se escribe si cambio: antes se reescribia cada segundo y el
            // estado vacio tambien parpadeaba.
            if (body._rondoVacio !== html) {
                body._rondoVacio = html;
                invalidarHtml(body.id);
                body.innerHTML = html;
            }
        } else {
            renderLista(body, lista, (x) => x.info.clave || x.info.eco, unidCardNode, unidCardUpdate);
        }
        const aviso = byId('rondo-sel-vacio');
        if (aviso) {
            const noHaySel = (!APP.config.watchAll && APP.seleccion.size === 0 && lista.length > 0);
            aviso.style.display = noHaySel ? 'block' : 'none';
        }
        byId('rondo-upd').innerHTML = '<span class="rondo-usym sm">' + UIS.clock + '</span> ' + new Date().toLocaleTimeString();
        actualizarCabecerasOrden();
        paintInfo();
    }
    function paintAlertas() {
        const cont = byId('rondo-lista-alertas');
        if (!cont) return;
        const f = (APP.filtro || '').toLowerCase();
        const lista = APP.historial.filter((a) => {
            if (APP.filtSever && APP.filtSever !== 'todas' && a.sev !== APP.filtSever) return false;
            if (!f) return true;
            return (a.titulo + ' ' + (a.detalle || '') + ' ' + (a.eco || '')).toLowerCase().indexOf(f) >= 0;
        });
        // Estructura por alerta para poder actualizar la IA sin re-pintar
        // toda la lista (delegamos el click abajo).
        const iah = !!(APP.config && APP.config.iaHabilitada && APP.config.iaApiKey);
        // v5.14: muestra/oculta el boton "Analizar lote" segun si la IA
        // esta activa y hay avisos en el historial.
        paintIABatchBtn();
        setHtml(cont, lista.length
            ? lista.map((a) => (
                '<div class="alerta" data-clave="' + esc(a.clave) + '" data-ts="' + a.ts + '" style="border-left:4px solid ' + (COL[a.sev] || '#555') + '">' +
                '<span class="ico rondo-usym" style="color:' + (COL[a.sev] || '#777') + '">' + (UIS[a.icono] || SEV_UIS[a.sev] || UIS.info) + '</span>' +
                '<div class="cuerpo">' +
                '<b>' + esc(a.titulo) + '</b>' +
                (a.detalle ? '<span>' + esc(a.detalle) + '</span>' : '') +
                '<div class="meta"><span class="regla">' + esc(a.regla) + '</span>' +
                '<span>' + new Date(a.ts).toLocaleString().slice(0, 16) + '</span></div>' +
                '<div class="rondo-ia-verdict" data-clave="' + esc(a.clave) + '" data-ts="' + a.ts + '" style="display:none"></div>' +
                '</div>' +
                '<span class="hora">' + new Date(a.ts).toLocaleTimeString().slice(0, 5) + '</span>' +
                (iah ? '<button type="button" class="mini rondo-ia-btn" data-clave="' + esc(a.clave) + '" data-ts="' + a.ts + '" title="Analizar con IA (DeepSeek / NVIDIA / Kimi)"><span class="rondo-usym sm">' + UIS.robot + '</span> IA</button>' : '') +
                '</div>'
            )).join('')
            : emptyState(UIS.alertas, 'Sin avisos registrados',
                'Aqui se acumula el historial de alertas. Cuando una regla se dispare, aparecera en esta lista.'));
        paintSeverity();
    }

    // Lanza el analisis IA para un aviso concreto. Re-pinta solo el bloque
    // del veredicto dentro de la tarjeta correspondiente.
    async function aiAnalizarAviso(clave, ts) {
        if (!APP.config.iaHabilitada || !APP.config.iaApiKey) {
            adviceWarn('IA deshabilitada', 'Activala y mete tu API key en Ajustes > IA.');
            return;
        }
        const item = APP.historial.find((h) => h.clave === clave && h.ts === +ts);
        if (!item) return;
        const verEl = document.querySelector('.rondo-ia-verdict[data-clave="' + cssEscape(clave) + '"][data-ts="' + ts + '"]');
        const btn = document.querySelector('.rondo-ia-btn[data-clave="' + cssEscape(clave) + '"][data-ts="' + ts + '"]');
        if (verEl) verEl.innerHTML = '<span class="rondo-ia-loading">Analizando con IA... (' + (IA_PROVEEDORES[APP.config.iaProveedor].nombre) + ')</span>';
        if (btn) { btn.disabled = true; btn.textContent = '...'; }
        const res = await aiAnalizar(item);
        if (!verEl) return;
        if (res.error) {
            verEl.style.display = 'block';
            verEl.innerHTML = '<div class="rondo-ia-err"><b>Error IA:</b> ' + esc(res.error) + '</div>';
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="rondo-usym sm">' + UIS.refresh + '</span> Reintentar'; }
            return;
        }
        const v = String(res.veredicto || '?');
        const colores = { falso_positivo: '#2e7d32', normal: '#1565c0', sospechoso: '#e65100', critico: '#b71c1c' };
        const color = colores[v] || '#555';
        const resumen = res.resumen ? esc(res.resumen) : '(sin resumen)';
        const ev = Array.isArray(res.evidencia) ? res.evidencia : [];
        const rec = res.recomendacion ? '<div class="rondo-ia-rec"><b>Recomendacion:</b> ' + esc(res.recomendacion) + '</div>' : '';
        const provNombre = (IA_PROVEEDORES[APP.config.iaProveedor] || {}).nombre || APP.config.iaProveedor;
        verEl.style.display = 'block';
        verEl.style.borderLeft = '3px solid ' + color;
        verEl.style.paddingLeft = '6px';
        verEl.innerHTML =
            '<div class="rondo-ia-head"><b style="color:' + color + '">' + v.toUpperCase().replace('_', ' ') + '</b>' +
            ' <span style="color:var(--rondo-fg-dim);font-size:11px"> · ' + esc(provNombre) +
            ' · confianza ' + (res.confianza != null ? res.confianza : '?') + '</span></div>' +
            '<div class="rondo-ia-summary">' + resumen + '</div>' +
            (ev.length ? '<ul class="rondo-ia-ev">' + ev.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '') +
            rec;
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="rondo-usym sm">' + UIS.refresh + '</span> Reanalizar'; }
    }
    function paintSeverity() {
        document.querySelectorAll('#rondo-filtroseveridad span[data-sev]').forEach((s) => {
            s.classList.toggle('activo', s.dataset.sev === (APP.filtSever || 'todas'));
        });
    }
