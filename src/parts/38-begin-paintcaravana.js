    /* === BEGIN: paintCaravana === */
    function paintCaravana() {
        const sel = byId('rondo-caravana-sel');
        const body = byId('rondo-caravana-body');
        if (!sel || !body) return;
        const vigiladas = (APP.unidades || []).filter(shouldWatch);
        if (!vigiladas.length) {
            sel.innerHTML = '';
            body.innerHTML = '<div class="rondo-cv-empty">No hay unidades vigiladas. Agrega unidades desde la lista para usar el modo caravana.</div>';
            return;
        }
        // Reconstruye el <select> solo si cambia la lista de economicos (asi
        // no se pierde la seleccion del usuario en cada repaint).
        const ecosActuales = vigiladas.map((u) => (parseUnitName(u).eco || parseUnitName(u).placa || String(parseUnitName(u).id)));
        const firma = ecosActuales.join('|');
        if (sel.dataset.firma !== firma) {
            const previo = APP.caravanaEco;
            sel.innerHTML = ecosActuales.map((e) => '<option value="' + esc(e) + '">' + esc(e) + '</option>').join('');
            let candidato = previo;
            if (!candidato || !ecosActuales.includes(candidato)) {
                const conRuta = vigiladas.find((u) => { const i = parseUnitName(u); return rutaDe(i); });
                candidato = conRuta ? (parseUnitName(conRuta).eco || parseUnitName(conRuta).placa || String(parseUnitName(conRuta).id)) : ecosActuales[0];
            }
            APP.caravanaEco = candidato;
            sel.value = candidato;
            sel.dataset.firma = firma;
        } else {
            if (APP.caravanaEco && sel.value !== APP.caravanaEco) sel.value = APP.caravanaEco;
        }
        const it = unitByEco(APP.caravanaEco);
        if (!it) { body.innerHTML = ''; return; }
        const info = parseUnitName(it.u);
        const st = unitState(it.u);
        let res;
        try { res = unidadesEnCaravana(info, st); }
        catch (e) { body.innerHTML = '<div class="rondo-cv-empty">Error: ' + esc(e.message) + '</div>'; return; }
        const miembros = res.miembros;
        const ruta = res.rutaLider;
        const html = [];
        // Tarjeta del lider
        html.push(renderCaravanaLider(info, st, ruta, res.snapLider));
        if (!miembros.length) {
            html.push('<div class="rondo-cv-empty">Ninguna unidad vigilada cercana a ' + esc(APP.caravanaEco) + '.</div>');
        } else {
            miembros.forEach((m) => { html.push(renderCaravanaMiembro(m)); });
        }
        setHtml(body, html.join(''));
        const cCv = byId('rondo-c-cv');
        if (cCv) cCv.textContent = miembros.length;
    }
    function renderCaravanaLider(info, st, ruta, snap) {
        const eco = info.eco || info.placa || String(info.id);
        const cls = ['rondo-cv-card', 'lider'];
        const meta = [];
        if (ruta) {
            const totalKm = ruta.total ? (ruta.total / 1000).toFixed(1) + ' km' : '';
            meta.push('<span class="pill en-ruta">EN RUTA ' + esc(totalKm) + '</span>');
        } else {
            meta.push('<span class="pill dim">SIN RUTA</span>');
        }
        meta.push('<span class="pill">' + (st.online ? 'online' : 'offline') + '</span>');
        if (st.vel != null) meta.push('<span class="pill">' + Math.round(st.vel) + ' km/h</span>');
        if (snap && Number.isFinite(snap.progreso)) {
            meta.push('<span class="pill">' + Math.round(snap.progreso * 100) + '% ruta</span>');
        }
        return '<div class="' + cls.join(' ') + '">' +
            '<div class="cv-head"><span class="cv-eco">' + esc(eco) + '</span><span>· lider</span></div>' +
            '<div class="cv-meta">' + meta.join('') + '</div>' +
            '</div>';
    }
    function fmtDistancia(d) {
        if (!Number.isFinite(d)) return '';
        if (d >= 1000) return (d / 1000).toFixed(2) + ' km';
        return Math.round(d) + ' m';
    }
    function fmtDelta(d) {
        if (d == null) return '';
        const a = Math.abs(d);
        const txt = fmtDistancia(a);
        return (d >= 0 ? '+' : '−') + txt;
    }
    function renderCaravanaMiembro(m) {
        const eco = m.info.eco || m.info.placa || String(m.info.id);
        const cls = ['rondo-cv-card'];
        if (m.contrario) cls.push('contrario');
        const meta = [];
        let distTxt = '';
        if (m.enRuta && m.deltaRuta != null) {
            if (Math.abs(m.deltaRuta) < 25) distTxt = 'a ' + fmtDistancia(Math.abs(m.deltaRuta));
            else if (m.deltaRuta >= 0) distTxt = fmtDelta(m.deltaRuta) + ' delante';
            else distTxt = fmtDelta(m.deltaRuta) + ' detras';
        } else {
            distTxt = 'a ' + fmtDistancia(m.distDirecta);
        }
        if (m.enRuta) meta.push('<span class="pill en-ruta">EN RUTA</span>');
        else meta.push('<span class="pill dim">CERCA</span>');
        if (!m.vigilada) meta.push('<span class="pill dim">NO VIGILADA</span>');
        meta.push('<span class="pill">' + (m.st.online ? 'online' : 'offline') + '</span>');
        if (m.st.vel != null) meta.push('<span class="pill">' + Math.round(m.st.vel) + ' km/h</span>');
        if (m.enRuta && m.distEje != null) meta.push('<span class="pill">' + Math.round(m.distEje) + ' m del eje</span>');
        if (m.contrario) meta.push('<span class="pill contrario">SENTIDO CONTRARIO</span>');
        return '<div class="' + cls.join(' ') + '" data-eco="' + esc(eco) + '">' +
            '<div class="cv-head"><span class="cv-eco">' + esc(eco) + '</span><span class="cv-dist">' + esc(distTxt) + '</span></div>' +
            '<div class="cv-meta">' + meta.join('') + '</div>' +
            '</div>';
    }
    function bindCaravanaSelect() {
        const sel = byId('rondo-caravana-sel');
        if (!sel) return;
        sel.addEventListener('change', () => {
            APP.caravanaEco = sel.value || '';
            paintCaravana();
        });
        const body = byId('rondo-caravana-body');
        if (body) {
            body.addEventListener('click', (ev) => {
                const card = ev.target.closest('.rondo-cv-card');
                if (!card || !card.dataset.eco) return;
                if (card.classList.contains('lider')) return;
                openUnitWindow(card.dataset.eco);
            });
        }
    }
