    /* ====================== VENTANAS DE LA APP (AbrirVehiculos++) ====================== */
    const escRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const RE_TITULO = /[A-Z0-9]{2,}\.\s?\d{3,5}\s*-\s*[A-Z0-9]{5,}/;
    function setValueReact(input, texto) {
        // Eventos y prototype del REALM DE LA PAGINA (PAGE): en el sandbox de
        // Tampermonkey los constructores propios no los reconoce React y la
        // automatizacion de ventanas deja de funcionar.
        const d = Object.getOwnPropertyDescriptor(PAGE.HTMLInputElement.prototype, 'value');
        if (d && d.set) d.set.call(input, texto); else input.value = texto;
        input.dispatchEvent(new PAGE.Event('input', { bubbles: true }));
        input.dispatchEvent(new PAGE.Event('change', { bubbles: true }));
        ['keydown', 'keyup'].forEach((t) => {
            try { input.dispatchEvent(new PAGE.KeyboardEvent(t, { bubbles: true, key: 'Enter', keyCode: 13 })); } catch (_) { /* noop */ }
        });
    }
    function clearInput(input) {
        const d = Object.getOwnPropertyDescriptor(PAGE.HTMLInputElement.prototype, 'value');
        if (d && d.set) d.set.call(input, ''); else input.value = '';
        input.dispatchEvent(new PAGE.Event('input', { bubbles: true }));
        input.dispatchEvent(new PAGE.Event('change', { bubbles: true }));
    }
    // Devuelve true si el elemento pertenece a la UI del propio script (panel,
    // barra, modales, etc.), para no confundirlo con el DOM nativo de Wialon.
    function esUIPropia(el) {
        try {
            return !!(el && el.closest && el.closest('#rondo-panel,#rondo-barra,#rondo-modal,#rondo-config,#rondo-ayuda,#rondo-contexto,#rondo-toasts,#rondo-aviso,#rondo-rail,#rondo-dialog,#rondo-plan-modal,#rondo-carga-modal'));
        } catch (_) { return false; }
    }
    function findSearchInput() {
        const inputs = Array.prototype.slice.call(document.querySelectorAll('input'))
            .filter((i) => i.type !== 'hidden' && i.offsetParent && !i.disabled && !esUIPropia(i));
        const byPh = inputs.find((i) => {
            const t = ((i.placeholder || '') + ' ' + (i.getAttribute('aria-label') || '') + ' ' + (i.title || '')).toLowerCase();
            return /buscar|search/.test(t);
        });
        return byPh
            || inputs.find((i) => i.type === 'search')
            || inputs.find((i) => {
                const t = ((i.placeholder || '') + ' ' + (i.getAttribute('aria-label') || '') + ' ' + (i.title || '')).toLowerCase();
                return /filtr|filtro/.test(t);
            })
            || inputs[0]
            || null;
    }
    function pickRow(eco) {
        const plano = normEco(eco);
        const e = escRegex(plano);
        const reEco = new RegExp('\\.\\s*0*' + e + '(?!\\d)');
        const reNum = new RegExp('(^|\\D)0*' + e + '(?!\\d)');
        const filas = document.querySelectorAll('tr[id*="monitoring_units_custom_row_"]:not(.monitoring-units-custom-row-group-row)');
        let best = null, bestScore = -1, bestLen = 1e9;
        for (let i = 0; i < filas.length; i++) {
            const f = filas[i];
            if (f.getBoundingClientRect().width <= 0) continue;
            const t = (f.innerText || '').trim();
            if (t.indexOf(plano) < 0 || t.length > 200) continue;
            const puntaje = reEco.test(t) ? 3 : (reNum.test(t) ? 2 : 1);
            if (puntaje > bestScore || (puntaje === bestScore && t.length < bestLen)) {
                best = f; bestScore = puntaje; bestLen = t.length;
            }
        }
        return best;
    }
    function doubleClick(el) {
        const r = el.getBoundingClientRect();
        const x = r.left + Math.min(20, r.width / 2);
        const y = r.top + Math.max(4, r.height / 2);
        function mk(tipo, det) {
            // MouseEvent del realm de la pagina (PAGE) para que React lo acepte.
            return new PAGE.MouseEvent(tipo, Object.assign({
                bubbles: true, cancelable: true, view: PAGE,
                clientX: x, clientY: y, button: 0
            }, det || {}));
        }
        ['mouseover', 'mouseenter', 'mousemove'].forEach((t) => {
            try { el.dispatchEvent(mk(t)); } catch (_) { /* noop */ }
        });
        el.dispatchEvent(mk('pointerdown')); el.dispatchEvent(mk('mousedown'));
        el.dispatchEvent(mk('pointerup')); el.dispatchEvent(mk('mouseup'));
        el.dispatchEvent(mk('click', { detail: 1 }));
        setTimeout(() => {
            el.dispatchEvent(mk('mousedown'));
            el.dispatchEvent(mk('mouseup'));
            el.dispatchEvent(mk('click', { detail: 2 }));
            el.dispatchEvent(mk('dblclick', { detail: 2 }));
        }, 40);
    }
    function contFromCell(td) {
        let cur = td;
        while (cur && cur !== document.body) {
            const s = getComputedStyle(cur);
            if (s.position === 'absolute' && s.zIndex) return cur;
            cur = cur.parentElement;
        }
        return null;
    }
    function areaOf(el) { const r = el.getBoundingClientRect(); return r.width * r.height; }
    function ecoFromText(txt) {
        const s = String(txt || '');
        const m = s.match(/\.\s*0*(\d{3,5})(?!\d)/);
        if (m) return m[1];
        const m2 = s.match(/\b0*(\d{3,5})\b/);
        return m2 ? m2[1] : '';
    }
    function windowFromEcoGeneric(eco) {
        if (!eco) return null;
        const e = escRegex(normEco(eco));
        const re = new RegExp('[A-Z0-9]{2,}\\.\\s?0*' + e + '(?!\\d)');
        const cands = [];
        const all = document.querySelectorAll('div');
        for (let i = 0; i < all.length; i++) {
            const el = all[i];
            if (esUIPropia(el)) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 250 || r.height < 180) continue;
            if (r.width > window.innerWidth * 0.7 || r.height > window.innerHeight * 0.9) continue;
            if (!re.test((el.textContent || '').slice(0, 60))) continue;
            if (!el.querySelector('button, [class*="close" i]')) continue;
            cands.push(el);
        }
        if (!cands.length) return null;
        const externos = cands.filter((a) => !cands.some((b) => b !== a && a.contains(b)));
        externos.sort((a, b) => areaOf(b) - areaOf(a));
        return externos[0] || null;
    }
    function findUnitWindow(eco) {
        if (!eco) return null;
        const cells = document.querySelectorAll('td[id$="_pursuit_win_title_id"]');
        const plano = normEco(eco);
        for (let i = 0; i < cells.length; i++) {
            const td = cells[i];
            const txt = td.innerText || '';
            if (ecoFromText(txt) === plano || txt.indexOf(eco) >= 0 || txt.indexOf(plano) >= 0) {
                const cont = contFromCell(td);
                if (cont) return cont;
            }
        }
        return windowFromEcoGeneric(eco);
    }
    async function waitForWindow(eco, ms) {
        const t0 = Date.now();
        while (Date.now() - t0 < (ms || 8000)) {
            if (findUnitWindow(eco)) return true;
            await sleep(200);
        }
        return false;
    }
    function cabecerade(el) {
        let best = null, bestAncho = 0;
        const wide = el.getBoundingClientRect().width;
        const children = el.querySelectorAll('div,header,section,span');
        for (let i = 0; i < children.length; i++) {
            const h = children[i];
            if (!h.offsetParent) continue;
            if (!RE_TITULO.test((h.textContent || '').slice(0, 60))) continue;
            const r = h.getBoundingClientRect();
            if (r.width < 120 || r.width > wide + 2) continue;
            if (r.width > bestAncho) { best = h; bestAncho = r.width; }
        }
        return best;
    }
    async function moverYMedir(cont, x, y) {
        for (let i = 1; i <= 5; i++) {
            if (!cont.isConnected) return null;
            const vis = (cabecerade(cont) || cont).getBoundingClientRect();
            const dx = Math.round(x - vis.left);
            const dy = Math.round(y - vis.top);
            if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) break;
            const cs = getComputedStyle(cont);
            const t = cs.transform;
            if (t && t !== 'none' && t.indexOf('matrix') === 0) {
                try {
                    const m = new DOMMatrixReadOnly(t);
                    cont.style.transform = 'translate(' + (m.m41 + dx) + 'px,' + (m.m42 + dy) + 'px)';
                } catch (_) {
                    cont.style.left = ((parseFloat(cs.left) || 0) + dx) + 'px';
                    cont.style.top = ((parseFloat(cs.top) || 0) + dy) + 'px';
                }
            } else {
                cont.style.left = ((parseFloat(cs.left) || 0) + dx) + 'px';
                cont.style.top = ((parseFloat(cs.top) || 0) + dy) + 'px';
            }
            await sleep(140);
        }
        const c = cont.getBoundingClientRect();
        return { cont, top: c.top, bottom: c.bottom, w: c.width, h: c.height };
    }
    function openWindows() {
        const tds = document.querySelectorAll('td[id$="_pursuit_win_title_id"]');
        const seen = new Set();
        const list = [];
        for (let i = 0; i < tds.length; i++) {
            const td = tds[i];
            const cont = contFromCell(td);
            if (!cont || seen.has(cont)) continue;
            seen.add(cont);
            list.push({ eco: ecoFromText(td.innerText || ''), texto: (td.innerText || '').trim(), cont });
        }
        return list;
    }
    async function organizeWindows() {
        const abiertas = openWindows();
        if (!abiertas.length) return;
        // Ordena las ventanas segun la lista (orden configurado/arrastrado).
        const list = ordenarPorLista(abiertas, (v) => v.eco);
        // Algoritmo portado del proyecto original: rejilla con origen fijo (380, 60),
        // gap=15 y tamaño de celda tomado de la primera ventana. Coloca en filas
        // de izquierda a derecha y baja por filas hasta agotar el ancho.
        const startX = 380, startY = 60, gap = 15;
        const r0 = list[0].cont.getBoundingClientRect();
        const cellW = r0.width || list[0].cont.offsetWidth || 400;
        const cellH = r0.height || list[0].cont.offsetHeight || 300;
        let cols = Math.floor((window.innerWidth - startX) / (cellW + gap));
        if (cols < 1) cols = 1;
        for (let i = 0; i < list.length; i++) {
            if (document.hidden) return;
            const win = list[i].cont;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const targetX = startX + col * (cellW + gap);
            const targetY = startY + row * (cellH + gap);
            // Posiciona respetando transform si la ventana está posicionada por
            // transform (algunas skins de Wialon lo hacen); de lo contrario usa
            // left/top como el original.
            const cs = getComputedStyle(win);
            const t = cs.transform;
            const vis = (cabecerade(win) || win).getBoundingClientRect();
            const dx = targetX - vis.left;
            const dy = targetY - vis.top;
            if (t && t !== 'none' && t.indexOf('matrix') === 0) {
                try {
                    // DOMMatrixReadOnly del realm de la pagina; si no existe,
                    // cae al try/catch y se usa left/top.
                    const DMR = PAGE.DOMMatrixReadOnly || DOMMatrixReadOnly;
                    const m = new DMR(t);
                    win.style.transform = 'translate(' + (m.m41 + dx) + 'px,' + (m.m42 + dy) + 'px)';
                    continue;
                } catch (e) { /* fallback a left/top */ }
            }
            const la = parseFloat(cs.left) || 0;
            const ta = parseFloat(cs.top) || 0;
            win.style.left = (la + dx) + 'px';
            win.style.top = (ta + dy) + 'px';
        }
    }
    async function openUnitWindow(eco) {
        if (!eco) return false;
        const inp = findSearchInput();
        if (!inp) return false;
        inp.click(); inp.focus();
        await sleep(40);
        clearInput(inp);
        await sleep(120);
        setValueReact(inp, eco);
        let fila = null, wait = 0;
        while (wait < 3000) {
            fila = pickRow(eco);
            if (fila) break;
            await sleep(100); wait += 100;
        }
        if (!fila) return false;
        const target = fila.querySelector('.name-container') || fila.querySelector('.monitoring-unit-name-cell') || fila;
        doubleClick(target);
        await waitForWindow(eco, 6000);
        revalidarContornos();
        return true;
    }
    function closeContainer(cont) {
        if (!cont) return false;
        const btn = cont.querySelector('[id$="_pursuit_win_close_id"]')
            || cont.querySelector('button[class*="close" i], [class*="close" i]');
        if (!btn) return false;
        btn.dispatchEvent(new PAGE.MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
    }
    function closeAllWindows() {
        document.querySelectorAll('[id$="_pursuit_win_close_id"]').forEach((b) => {
            b.dispatchEvent(new PAGE.MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        // Si estaban ocultas, al cerrarlas el modo deja de aplicar.
        _ventanasOcultas = false;
        pintarBotonVentanas();
    }
    // v6.0.9: el boton "Ocultar" (junto a Automatizar) oculta o vuelve a
    // mostrar las ventanas de unidades abiertas, sin cerrarlas.
    let _ventanasOcultas = false;
    function ventanasOcultasOn() { return _ventanasOcultas; }
    function pintarBotonVentanas() {
        const btn = byId('rondo-sb-panel');
        if (!btn) return;
        const icon = btn.querySelector('.rondo-usym');
        const lbl = btn.querySelector('.tile-lbl');
        if (_ventanasOcultas) {
            if (icon) icon.innerHTML = UIS.panel;
            if (lbl) lbl.textContent = 'Mostrar';
            btn.title = 'Mostrar las ventanas de unidades que ocultaste';
            btn.classList.add('activo');
        } else {
            if (icon) icon.innerHTML = UIS.collapse;
            if (lbl) lbl.textContent = 'Ocultar';
            btn.title = 'Ocultar las ventanas de unidades abiertas (sin cerrarlas)';
            btn.classList.remove('activo');
        }
    }
    function ocultarVentanas() {
        const list = openWindows();
        if (!list.length) { adviceWarn('Sin ventanas', 'No hay ventanas de unidades abiertas.'); return; }
        list.forEach((v) => {
            if (!v.cont) return;
            v.cont.dataset.rondoOculta = '1';
            v.cont.style.display = 'none';
        });
        _ventanasOcultas = true;
        pintarBotonVentanas();
        advice('Ventanas ocultas', list.length + ' ventana(s) · pulsa de nuevo para mostrarlas');
    }
    function mostrarVentanas() {
        const list = openWindows();
        list.forEach((v) => {
            if (!v.cont) return;
            if (v.cont.dataset.rondoOculta) { v.cont.style.display = ''; delete v.cont.dataset.rondoOculta; }
        });
        _ventanasOcultas = false;
        pintarBotonVentanas();
        advice('Ventanas visibles', list.length + ' ventana(s)');
    }
    function alternarVentanas() {
        if (_ventanasOcultas) mostrarVentanas(); else ocultarVentanas();
    }
    // Mantiene ocultas las ventanas nuevas que se abran mientras el modo este
    // activo (se llama desde el intervalo de 1 s).
    function rxVentanasSync() {
        if (!_ventanasOcultas) return;
        openWindows().forEach((v) => {
            if (v.cont && !v.cont.dataset.rondoOculta) {
                v.cont.dataset.rondoOculta = '1';
                v.cont.style.display = 'none';
            }
        });
    }
    // Cierre seguro en dos pasos: el primer clic "arma" el boton y el segundo
    // ejecuta el cierre. Asi un clic accidental no cierra todas las ventanas.
    function cerrarTodasSeguro(btn) {
        if (!APP.config.confirmarCierre) { closeAllWindows(); advice('Ventanas cerradas', ''); return; }
        if (btn && btn.dataset.armado === '1') {
            delete btn.dataset.armado;
            clearTimeout(btn._tArmado);
            restaurarBotonCerrar(btn);
            closeAllWindows();
            advice('Ventanas cerradas', 'Se cerraron las ventanas de unidades');
            return;
        }
        if (!btn) { closeAllWindows(); return; }
        if (btn.dataset.armado !== '1') btn.dataset.prevHtml = btn.innerHTML;
        btn.dataset.armado = '1';
        btn.innerHTML = '<span class="rondo-usym">' + UIS.warn + '</span> Confirmar';
        btn.classList.add('armado');
        btn.title = 'Pulsa otra vez para cerrar todas las ventanas';
        clearTimeout(btn._tArmado);
        btn._tArmado = setTimeout(() => { delete btn.dataset.armado; restaurarBotonCerrar(btn); }, 4000);
    }
    function restaurarBotonCerrar(btn) {
        if (!btn) return;
        btn.classList.remove('armado');
        if (btn.dataset.prevHtml) btn.innerHTML = btn.dataset.prevHtml;
        if (btn.id === 'rondo-btn-close') btn.title = 'Cerrar todas las ventanas de unidades';
        if (btn.id === 'rondo-sb-close') btn.title = 'Cerrar todas las ventanas de unidades';
        delete btn.dataset.prevHtml;
    }
    function aplicarContorno(cont, color) {
        if (!cont) return;
        if (!color) { cont.style.border = ''; cont.style.boxShadow = ''; return; }
        cont.style.border = '3px solid ' + color;
        cont.style.boxShadow = '0 0 20px ' + color;
    }
    function highlightUnitWindow(eco, color) {
        const w = findUnitWindow(eco);
        if (!w) return;
        aplicarContorno(w, color);
    }
    function colorContorno(info) {
        const limite = Date.now() - (Number(APP.config.contornoHoras) || 24) * 3600000;
        for (let i = 0; i < APP.historial.length; i++) {
            const a = APP.historial[i];
            if (a.ts && a.ts < limite) continue;
            if (a.eco && (a.eco === info.eco || a.eco === info.placa)) return COL[a.sev] || null;
        }
        return null;
    }
    // Reaplica el contorno a las ventanas de unidad que ya estan abiertas
    // (por ejemplo, despues de recargar la pagina o al abrir una ventana).
    function revalidarContornos() {
        if (!APP.config.contornos) return;
        const list = openWindows();
        if (!list.length) return;
        for (let i = 0; i < list.length; i++) {
            const eco = list[i].eco;
            if (!eco) continue;
            const it = unitByEco(eco);
            if (it && APP.dismissed.has(it.info.clave)) { aplicarContorno(list[i].cont, null); continue; }
            let color = it ? colorContorno(it.info) : null;
            if (!color && it) {
                if (!it.st.online) color = COL.critico;
                else if (it.st.estado === 'detenida') color = COL.medio;
            }
            aplicarContorno(list[i].cont, color);
        }
    }

