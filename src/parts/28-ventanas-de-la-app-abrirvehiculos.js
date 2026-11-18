    /* ====================== VENTANAS DE LA APP (AbrirVehiculos++) ====================== */
    const escRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const RE_TITULO = /[A-Z0-9]{2,}\.\s?\d{3,5}\s*-\s*[A-Z0-9]{5,}/;
    // Prototipo correcto segun el campo (la plataforma usa input y, en
    // algunas versiones, textarea para el buscador de unidades).
    function rxProtoValor(input) {
        try {
            if (input && String(input.tagName || '').toUpperCase() === 'TEXTAREA' && PAGE.HTMLTextAreaElement) {
                return PAGE.HTMLTextAreaElement.prototype;
            }
        } catch (_) { /* noop */ }
        return PAGE.HTMLInputElement.prototype;
    }
    function setValueReact(input, texto) {
        // Eventos y prototype del REALM DE LA PAGINA (PAGE): en el sandbox de
        // Tampermonkey los constructores propios no los reconoce React y la
        // automatizacion de ventanas deja de funcionar.
        const d = Object.getOwnPropertyDescriptor(rxProtoValor(input), 'value');
        if (d && d.set) d.set.call(input, texto); else input.value = texto;
        input.dispatchEvent(new PAGE.Event('input', { bubbles: true }));
        input.dispatchEvent(new PAGE.Event('change', { bubbles: true }));
        ['keydown', 'keyup'].forEach((t) => {
            try { input.dispatchEvent(new PAGE.KeyboardEvent(t, { bubbles: true, key: 'Enter', keyCode: 13 })); } catch (_) { /* noop */ }
        });
    }
    function clearInput(input) {
        const d = Object.getOwnPropertyDescriptor(rxProtoValor(input), 'value');
        if (d && d.set) d.set.call(input, ''); else input.value = '';
        input.dispatchEvent(new PAGE.Event('input', { bubbles: true }));
        input.dispatchEvent(new PAGE.Event('change', { bubbles: true }));
    }
    // Devuelve true si el elemento pertenece a la UI del propio script (panel,
    // barra, modales, etc.), para no confundirlo con el DOM nativo de Wialon.
    // El selector generico [id^="rondo-"] cubre tambien las ventanas nuevas
    // (replay, dialogos propios, diagnostico...) sin tener que listarlas.
    function esUIPropia(el) {
        try {
            return !!(el && el.closest && el.closest('#rondo-panel,#rondo-barra,#rondo-modal,#rondo-config,#rondo-ayuda,#rondo-contexto,#rondo-toasts,#rondo-aviso,#rondo-rail,#rondo-dialog,#rondo-plan-modal,#rondo-carga-modal,#rondo-geocerca-modal,[id^="rondo-"]'));
        } catch (_) { return false; }
    }
    // Recorre shadow roots (componentes web). Algunas versiones de la
    // plataforma montan la lista dentro de un shadow root y un
    // querySelectorAll normal no la ve.
    function rxEnSombras(raiz, sel, out, limite) {
        const tope = limite || 300;
        let nodos = [];
        try { nodos = Array.prototype.slice.call(raiz.querySelectorAll('*')); } catch (_) { nodos = []; }
        for (let i = 0; i < nodos.length && out.length < tope; i++) {
            const sr = nodos[i].shadowRoot;
            if (!sr) continue;
            try {
                const hallados = sr.querySelectorAll(sel);
                for (let j = 0; j < hallados.length && out.length < tope; j++) out.push(hallados[j]);
            } catch (_) { /* noop */ }
            rxEnSombras(sr, sel, out, tope);
        }
        return out;
    }
    function rxTextoCampo(i) {
        try {
            return String((i.placeholder || '') + ' ' + (i.getAttribute('aria-label') || '') + ' ' +
                (i.title || '') + ' ' + (i.name || '') + ' ' + (i.id || '')).toLowerCase();
        } catch (_) { return ''; }
    }
    // Solo campos donde tenga sentido escribir el economico (no checkbox,
    // fechas, colores, botones...). Un textarea tambien vale.
    function rxTipoTexto(i) {
        try {
            if (!i || String(i.tagName || '').toUpperCase() !== 'INPUT') return true;
            const t = String(i.type || 'text').toLowerCase();
            return t === 'text' || t === 'search' || t === 'tel' || t === 'url';
        } catch (_) { return false; }
    }
    function rxCampoVisible(i) {
        try {
            if (!i || i.disabled || !rxTipoTexto(i)) return false;
            if (esUIPropia(i)) return false;
            const r = i.getBoundingClientRect();
            if (r.width > 1 && r.height > 1) return true;
            // Respaldo: algunos skins dejan el campo con tamano 0 y aun asi
            // enfocable (offsetParent no es null si esta en el arbol visible).
            return !!i.offsetParent;
        } catch (_) { return false; }
    }
    // Filas conocidas de la lista de unidades (varias generaciones de la
    // plataforma). Sirve para preferir SU buscador y para encontrar la fila.
    function rxFilasDeLista() {
        const sels = [
            'tr[id*="monitoring_units_custom_row_"]:not(.monitoring-units-custom-row-group-row)',
            'tr[id*="monitoring_units"][id*="row"]:not([id*="group"])',
            '[id*="monitoring" i] tr',
            '[class*="monitoring" i] tr'
        ];
        for (let i = 0; i < sels.length; i++) {
            let lista = [];
            try { lista = document.querySelectorAll(sels[i]); } catch (_) { lista = []; }
            if (lista.length) return Array.prototype.slice.call(lista);
        }
        return [];
    }
    function rxContenedorUnidades() {
        const filas = rxFilasDeLista();
        for (let i = 0; i < filas.length && i < 4; i++) {
            let p = filas[i].parentElement, n = 0;
            while (p && p !== document.body && n < 8) {
                const idc = String(p.id || '') + ' ' + (typeof p.className === 'string' ? p.className : '');
                if (/monitoring|unit|unidad|flota|lista/i.test(idc)) return p;
                p = p.parentElement; n++;
            }
        }
        return null;
    }
    function rxAmbitoBuscador(inp) {
        let p = inp && inp.parentElement, n = 0;
        while (p && p !== document.body && n < 10) {
            try { if (p.querySelector('tr,[role="row"],.wui2-list_row,.wui-list_item')) return p; } catch (_) { /* noop */ }
            p = p.parentElement; n++;
        }
        return null;
    }
    // Candidatos a buscador de unidades, ordenados por probabilidad. Se
    // prueban TODOS hasta que uno filtre la lista: si la plataforma añade
    // otro campo "Buscar" (global, de mensajes...), el primero ya no bloquea
    // la automatizacion como pasaba antes.
    function rxCandidatosBuscador() {
        let inputs = [];
        try { inputs = Array.prototype.slice.call(document.querySelectorAll('input:not([type="hidden"]),textarea')); } catch (_) { inputs = []; }
        const cand = [];
        const contUnidades = rxContenedorUnidades();
        for (let i = 0; i < inputs.length; i++) {
            const el = inputs[i];
            if (!rxCampoVisible(el)) continue;
            const t = rxTextoCampo(el);
            if (/password|passwd|correo|email|login|usuario|user/.test(t)) continue;
            let s = 0;
            if (/unidad|vehiculo|veh\u00edculo|economico|econ\u00f3mico|(^|\\W)eco(\\W|$)|placa|nombre|flota|monitor/.test(t)) s += 8;
            if (/buscar|search|filtr|filtro/.test(t)) s += 4;
            if (el.type === 'search') s += 2;
            try { if (contUnidades && contUnidades.contains(el)) s += 16; } catch (_) { /* noop */ }
            try { if (el.closest && el.closest('[id*="monitoring" i],[class*="monitoring" i]')) s += 12; } catch (_) { /* noop */ }
            cand.push({ el: el, s: s });
        }
        // Si el DOM normal no ofrece un candidato claro, se busca tambien
        // dentro de shadow roots (componentes web). No se hace siempre para
        // no recorrer todo el documento en cada clic.
        const fuerte = cand.some((o) => o.s >= 8);
        if (!fuerte) {
            const sombras = rxEnSombras(document, 'input:not([type="hidden"]),textarea', [], 120);
            for (let i = 0; i < sombras.length; i++) {
                const el = sombras[i];
                if (!rxCampoVisible(el)) continue;
                const t = rxTextoCampo(el);
                if (/password|passwd|correo|email|login|usuario|user/.test(t)) continue;
                let s = 0;
                if (/unidad|vehiculo|veh\u00edculo|economico|econ\u00f3mico|(^|\\W)eco(\\W|$)|placa|nombre|flota|monitor/.test(t)) s += 8;
                if (/buscar|search|filtr|filtro/.test(t)) s += 4;
                if (el.type === 'search') s += 2;
                try {
                    const host = el.getRootNode ? el.getRootNode().host : null;
                    if (host && host.closest && host.closest('[id*="monitoring" i],[class*="monitoring" i]')) s += 12;
                } catch (_) { /* noop */ }
                cand.push({ el: el, s: s });
            }
        }
        // Orden estable: a igual puntaje se respeta el orden del DOM.
        cand.sort((a, b) => b.s - a.s);
        return cand.map((o) => o.el).slice(0, 5);
    }
    // Ultimo campo que se uso con exito: al terminar un lote se limpia ESE y
    // no el primero de la lista (que podria ser otro buscador de la pagina).
    let _rxCampoUsado = null;
    function findSearchInput() {
        if (_rxCampoUsado && _rxCampoUsado.isConnected && rxCampoVisible(_rxCampoUsado)) return _rxCampoUsado;
        return rxCandidatosBuscador()[0] || null;
    }
    function pickRow(eco, ambito, soloRapido) {
        const plano = normEco(eco);
        if (!plano) return null;
        const e = escRegex(plano);
        const reEco = new RegExp('\\.\\s*0*' + e + '(?!\\d)');
        const reNum = new RegExp('(^|\\D)0*' + e + '(?!\\d)');
        let best = null, bestScore = -1, bestLen = 1e9;
        const puntuar = (f) => {
            try {
                if (!f || f.nodeType !== 1 || esUIPropia(f)) return -1;
                let t = '';
                try { t = String(f.textContent || '').replace(/\s+/g, ' ').trim(); } catch (_) { t = ''; }
                if (!t || t.indexOf(plano) < 0 || t.length > 260) return -1;
                // Las filas de menus, tooltips y ventanas flotantes no cuentan.
                try {
                    if (f.closest('.tippy-box,.wui-tooltip,#tooltip,#tooltip2,[class*="_messageBox_"],[class*="_contentWrapper_"],[class*="dropdown" i],[class*="menu" i]')) return -1;
                } catch (_) { /* noop */ }
                // Rect despues del texto: evita lecturas de layout en cada fila.
                const r = f.getBoundingClientRect();
                if (r.width <= 0 || r.height <= 0) return -1;
                let s = 1;
                if (reEco.test(t)) s = 4;
                else if (reNum.test(t)) s = 3;
                try { if (f.closest('[id*="monitoring" i],[class*="monitoring" i]')) s += 6; } catch (_) { /* noop */ }
                if (s > bestScore || (s === bestScore && t.length < bestLen)) {
                    best = f; bestScore = s; bestLen = t.length;
                }
                return s;
            } catch (_) { return -1; }
        };
        const barrer = (lista) => { for (let i = 0; i < lista.length; i++) puntuar(lista[i]); };
        barrer(rxFilasDeLista());
        if (bestScore >= 3) return best;
        if (soloRapido) return null;
        // La plataforma pudo renombrar las filas: se busca en cualquier fila
        // visible, primero cerca del buscador y luego en el panel de unidades
        // (nunca en desplegables de busqueda: esas filas no son la lista).
        if (ambito) {
            try { barrer(ambito.querySelectorAll('tr,[role="row"],.wui2-list_row,.wui-list_item')); } catch (_) { /* noop */ }
        }
        if (bestScore >= 3) return best;
        const cont = rxContenedorUnidades();
        if (cont) {
            try { barrer(cont.querySelectorAll('tr,[role="row"],.wui2-list_row,.wui-list_item')); } catch (_) { /* noop */ }
        }
        if (bestScore >= 3) return best;
        let genericas = [];
        try { genericas = Array.prototype.slice.call(document.querySelectorAll('tr,[role="row"],.wui2-list_row,.wui-list_item')); } catch (_) { genericas = []; }
        barrer(genericas);
        if (best) return best;
        barrer(rxEnSombras(document, 'tr,[role="row"],.wui2-list_row', [], 400));
        return best;
    }
    // Eventos sinteticos: MouseEvent y PointerEvent del realm de la pagina
    // (PAGE) para que React los acepte, con `buttons` coherente en down/up.
    function rxMouse(tipo, x, y, det) {
        const C = PAGE.MouseEvent || MouseEvent;
        return new C(tipo, Object.assign({
            bubbles: true, cancelable: true, view: PAGE, detail: 0,
            clientX: x, clientY: y, screenX: x, screenY: y, button: 0, buttons: 0
        }, det || {}));
    }
    function rxPointer(tipo, x, y, det) {
        const C = PAGE.PointerEvent || (typeof PointerEvent !== 'undefined' ? PointerEvent : null);
        if (C) {
            try {
                return new C(tipo, Object.assign({
                    bubbles: true, cancelable: true, view: PAGE,
                    clientX: x, clientY: y, button: 0, buttons: 0,
                    pointerId: 1, pointerType: 'mouse', isPrimary: true
                }, det || {}));
            } catch (_) { /* cae a MouseEvent */ }
        }
        return rxMouse(tipo, x, y, det);
    }
    function doubleClick(el) {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = r.left + Math.min(20, r.width / 2);
        const y = r.top + Math.max(4, r.height / 2);
        const enviar = (ev) => { try { el.dispatchEvent(ev); } catch (_) { /* noop */ } };
        ['mouseover', 'mouseenter', 'mousemove'].forEach((t) => enviar(rxMouse(t, x, y)));
        ['pointerover', 'pointerenter', 'pointermove'].forEach((t) => enviar(rxPointer(t, x, y)));
        const pulsar = (det) => {
            enviar(rxPointer('pointerdown', x, y, { buttons: 1 }));
            enviar(rxMouse('mousedown', x, y, { buttons: 1, detail: det }));
            enviar(rxPointer('pointerup', x, y));
            enviar(rxMouse('mouseup', x, y, { buttons: 0, detail: det }));
            enviar(rxMouse('click', x, y, { buttons: 0, detail: det }));
        };
        pulsar(1);
        setTimeout(() => {
            pulsar(2);
            enviar(rxMouse('dblclick', x, y, { buttons: 0, detail: 2 }));
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
    // Si la plataforma cambio el titulo de la ventana y findUnitWindow ya no
    // la reconoce, al menos se detecta que se abrio UNA ventana nueva.
    function rxCuentaVentanas() {
        try { return document.querySelectorAll('[id$="_pursuit_win_title_id"]').length; } catch (_) { return 0; }
    }
    function rxObjetivoFila(fila) {
        if (!fila) return null;
        try {
            return fila.querySelector('.name-container')
                || fila.querySelector('.monitoring-unit-name-cell')
                || fila.querySelector('[class*="name" i]')
                || fila;
        } catch (_) { return fila; }
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
    // Un doble clic sobre la tarjeta dispara dos llamadas seguidas: la segunda
    // limpiaba el buscador mientras la primera ya estaba escribiendo y ninguna
    // abria la ventana. Se descarta la repetida mientras la primera trabaja.
    const _rxAbriendo = new Set();
    let _rxUltimoAvisoAbrir = 0;
    function rxAvisoNoAbrio(motivo, eco) {
        const t = Date.now();
        if (t - _rxUltimoAvisoAbrir < 6000) return;
        _rxUltimoAvisoAbrir = t;
        try {
            if (motivo === 'buscador') {
                adviceWarn('No encontre el buscador', 'Rondo no localizo el buscador de unidades. Abre la lista de unidades de la plataforma e intenta de nuevo.');
            } else {
                adviceWarn('No se abrio la ventana', 'No pude abrir ' + eco + '. Comprueba que la unidad aparece en la lista y que el doble clic manual abre su ventana.');
            }
            log('abrir ventana ' + eco + ': ' + motivo);
        } catch (_) { /* noop */ }
    }
    async function rxAbrirUnaUnidad(eco) {
        // Ya abierta: no hace falta tocar el buscador (y no se cierra).
        const ya = findUnitWindow(eco);
        if (ya) {
            const rr = ya.getBoundingClientRect();
            if (rr.width > 0 && rr.height > 0) { revalidarContornos(); return true; }
            // La oculto el boton "Ocultar": mostrarla sin cerrarla.
            if (ya.dataset && ya.dataset.rondoOculta) {
                ya.style.display = '';
                delete ya.dataset.rondoOculta;
            }
            revalidarContornos();
            return true;
        }
        const campos = rxCandidatosBuscador();
        if (!campos.length) {
            const fila = pickRow(eco, null, false);
            if (fila) {
                doubleClick(rxObjetivoFila(fila));
                if (await waitForWindow(eco, 4000)) { revalidarContornos(); return true; }
            }
            rxAvisoNoAbrio('buscador', eco);
            return false;
        }
        for (let c = 0; c < campos.length; c++) {
            const inp = campos[c];
            _rxCampoUsado = inp;
            const ambito = rxAmbitoBuscador(inp);
            const antes = rxCuentaVentanas();
            try { inp.click(); inp.focus(); } catch (_) { /* noop */ }
            await sleep(30);
            try { clearInput(inp); } catch (_) { /* noop */ }
            await sleep(90);
            try { setValueReact(inp, eco); } catch (_) { /* noop */ }
            let fila = null, wait = 0;
            const espera = c < 2 ? 2000 : 1200;
            while (wait < espera) {
                fila = pickRow(eco, ambito, wait < 900);
                if (fila) break;
                await sleep(100); wait += 100;
            }
            if (fila) {
                const objetivo = rxObjetivoFila(fila);
                doubleClick(objetivo);
                if (await waitForWindow(eco, 4200) || rxCuentaVentanas() > antes) { revalidarContornos(); return true; }
                // Segundo intento sobre la fila completa (algunas skins
                // enganchan el doble clic a la fila y no al nombre).
                if (objetivo !== fila) {
                    doubleClick(fila);
                    if (await waitForWindow(eco, 2200) || rxCuentaVentanas() > antes) { revalidarContornos(); return true; }
                }
                // La fila SI aparecio: este era el buscador correcto. Probar
                // otros campos solo alargaria la espera sin abrir nada.
                rxAvisoNoAbrio('ventana', eco);
                return false;
            }
            try { clearInput(inp); } catch (_) { /* noop */ }
            await sleep(80);
        }
        rxAvisoNoAbrio('ventana', eco);
        return false;
    }
    function openUnitWindow(eco) {
        const clave = normEco(eco);
        if (!clave) return Promise.resolve(false);
        if (_rxAbriendo.has(clave)) return Promise.resolve(true);
        _rxAbriendo.add(clave);
        return rxAbrirUnaUnidad(clave).then(
            (ok) => { _rxAbriendo.delete(clave); return ok; },
            (err) => {
                _rxAbriendo.delete(clave);
                try { log('abrir ventana ' + clave + ': ' + ((err && err.message) || err)); } catch (_) { /* noop */ }
                return false;
            }
        );
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
    // v6.0.10: botones +/- para agrandar o encoger las ventanas abiertas.
    const RX_VENTANA_PASO = 80;
    function rxDesplazarVentana(c, dx, dy) {
        const cs = getComputedStyle(c);
        const t = cs.transform;
        if (t && t !== 'none' && t.indexOf('matrix') === 0) {
            try {
                const DMR = PAGE.DOMMatrixReadOnly || DOMMatrixReadOnly;
                const m = new DMR(t);
                c.style.transform = 'translate(' + (m.m41 + dx) + 'px,' + (m.m42 + dy) + 'px)';
                return;
            } catch (_) { /* fallback a left/top */ }
        }
        c.style.left = ((parseFloat(cs.left) || 0) + dx) + 'px';
        c.style.top = ((parseFloat(cs.top) || 0) + dy) + 'px';
    }
    function rxAjustarVentanas(dir) {
        const list = openWindows();
        if (!list.length) { adviceWarn('Sin ventanas', 'No hay ventanas de unidades abiertas.'); return; }
        const d = dir >= 0 ? 1 : -1;
        const vw = window.innerWidth, vh = window.innerHeight;
        let ajustadas = 0;
        list.forEach((v) => {
            const c = v.cont;
            if (!c) return;
            const r = c.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0) return; // oculta o sin tamano
            const w = Math.round(clamp(r.width + d * RX_VENTANA_PASO, 260, Math.max(260, vw - 20)));
            const h = Math.round(clamp(r.height + d * RX_VENTANA_PASO, 170, Math.max(170, vh - 20)));
            if (w === Math.round(r.width) && h === Math.round(r.height)) return;
            c.style.width = w + 'px';
            c.style.height = h + 'px';
            // Reubica si se salio por abajo/derecha (asi no se pierde).
            const r2 = c.getBoundingClientRect();
            let nx = r2.left, ny = r2.top;
            if (nx + w > vw - 4) nx = Math.max(4, vw - 4 - w);
            if (ny + h > vh - 4) ny = Math.max(4, vh - 4 - h);
            if (nx < 4) nx = 4;
            if (ny < 4) ny = 4;
            if (Math.abs(nx - r2.left) > 1 || Math.abs(ny - r2.top) > 1) rxDesplazarVentana(c, nx - r2.left, ny - r2.top);
            ajustadas++;
        });
        // Avisa a los mapas (Leaflet) de que el contenedor cambio de tamano.
        try {
            const W = PAGE || window;
            W.dispatchEvent(new (W.Event || Event)('resize'));
        } catch (_) { /* noop */ }
        if (ajustadas) advice(d >= 0 ? 'Ventanas mas grandes' : 'Ventanas mas pequenas', ajustadas + ' ventana(s)');
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

