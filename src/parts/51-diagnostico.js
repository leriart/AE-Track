    /* ====================== DIAGNOSTICO ======================
     * Panel de diagnostico tecnico (solo lectura) en Ajustes > Avanzado.
     * Resume el estado del propio Rondo: uso de storage por clave, fallos de
     * escritura, tamano de las caches, uso de IA del dia, errores de reglas y
     * diagnostico de geocercas. No persiste nada ni cambia la configuracion.
     *
     * Se inyecta en runtime para no tocar el HTML de Ajustes. Las funciones
     * son declaraciones (hoisting) porque rxDiagBind() se llama desde init().
     * ====================================================================== */

    function rxDiagBytes(n) {
        n = Number(n) || 0;
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        return (n / (1024 * 1024)).toFixed(2) + ' MB';
    }

    // Toma el "peso" (bytes UTF-16 aprox) de cada clave rondo.api.* del
    // localStorage y del sessionStorage. Si el storage esta bloqueado,
    // devuelve lo que se haya podido leer.
    function rxDiagStorage() {
        const out = { local: [], session: [], totalLocal: 0, totalSession: 0 };
        const scan = (store, destino, campo) => {
            try {
                for (let i = 0; i < store.length; i++) {
                    const k = store.key(i);
                    if (!k || k.indexOf('rondo.api.') !== 0) continue;
                    const v = store.getItem(k) || '';
                    const bytes = (k.length + v.length) * 2;
                    destino.push({ clave: k, bytes: bytes });
                    out[campo] += bytes;
                }
            } catch (_) { /* storage bloqueado o inaccesible */ }
        };
        scan(localStorage, out.local, 'totalLocal');
        scan(sessionStorage, out.session, 'totalSession');
        out.local.sort((a, b) => b.bytes - a.bytes);
        out.session.sort((a, b) => b.bytes - a.bytes);
        return out;
    }

    function rxDiagRecolectar() {
        let iaHoy = { llamadas: 0, errores: 0 };
        try { iaHoy = iaContadorHoy() || iaHoy; } catch (_) { /* noop */ }
        return {
            ver: (typeof VER !== 'undefined') ? VER : '',
            online: (typeof navigator !== 'undefined') ? navigator.onLine : null,
            // v6.0.14: identidad de la plataforma (sitio, skin, API, idioma).
            plataforma: {
                nombre: rxPlatNombre(),
                api: rxPlatApiUrl(),
                idioma: rxPlatIdioma(),
                skin: rxPlatSkin(),
                acento: rxPlatAcento(),
                webgis: rxPlatWebgis(),
                pos: rxPlatPosDefecto()
            },
            storage: rxDiagStorage(),
            caches: {
                memo: Object.keys(APP.memo || {}).length,
                geoCache: Object.keys(APP.geoCache || {}).length,
                snapMemo: Object.keys(APP.snapMemo || {}).length,
                grafoCache: Object.keys(APP.grafoCache || {}).length,
                iaCache: (typeof IA_CACHE !== 'undefined' && IA_CACHE) ? Object.keys(IA_CACHE).length : 0
            },
            zonas: (APP.zonas || []).length,
            zonasDiag: APP.zonasDiag || null,
            // v6.12: estado de la alerta dirigida por geocerca (util para
            // saber por que no avisa: geocercas elegidas, alcance, etc).
            geoAlerta: (function () {
                try {
                    const mapa = geoAlertaPorZona();
                    const nom = Object.keys(mapa);
                    return {
                        activa: !!(APP.config.reglas && APP.config.reglas.geoAlerta),
                        geocercas: nom.length,
                        flotas: nom.filter((k) => mapa[k].alcance === 'todas').length,
                        dentro: Object.keys(APP.geoAlertaVivo || {}).length
                    };
                } catch (_) { return null; }
            })(),
            unidades: (APP.unidades || []).length,
            historial: (APP.historial || []).length,
            ia: {
                hoy: iaHoy,
                limite: +APP.config.iaLimiteDiario || 0,
                cacheTTL: +APP.config.iaCacheTTL || 0
            },
            stats: APP.stats || {},
            fallos: {
                json: (typeof writeJSON === 'function' && writeJSON._fallos) || 0,
                session: (typeof writeSession === 'function' && writeSession._fallos) || 0
            }
        };
    }

    // Texto plano del diagnostico: sirve tanto para pintar como para copiar.
    function rxDiagTexto(d) {
        if (!d) d = rxDiagRecolectar();
        const L = [];
        L.push('Rondo ' + d.ver + ' \u00b7 ' + (d.online === false ? 'sin conexion' : 'en linea'));
        const plat = d.plataforma || {};
        L.push('Plataforma: ' + (plat.nombre || 'n/d') +
            (plat.skin ? ' \u00b7 skin ' + plat.skin : '') +
            (plat.acento ? ' \u00b7 acento ' + plat.acento : '') +
            (plat.idioma ? ' \u00b7 idioma ' + plat.idioma : '') +
            (plat.webgis ? ' \u00b7 webgis ' + plat.webgis : '') +
            (plat.pos ? ' \u00b7 pos ' + plat.pos : '') +
            (plat.api ? ' \u00b7 ' + plat.api : ''));
        L.push('Unidades: ' + d.unidades + ' \u00b7 avisos: ' + d.historial + ' \u00b7 geocercas: ' + d.zonas);
        L.push('Storage local: ' + rxDiagBytes(d.storage.totalLocal) + ' (' + d.storage.local.length +
            ' claves) \u00b7 sesion: ' + rxDiagBytes(d.storage.totalSession) + ' (' + d.storage.session.length + ' claves)');
        L.push('Caches: memo ' + d.caches.memo + ' \u00b7 geo ' + d.caches.geoCache + ' \u00b7 snap ' +
            d.caches.snapMemo + ' \u00b7 grafo ' + d.caches.grafoCache + ' \u00b7 IA ' + d.caches.iaCache);
        L.push('IA hoy: ' + (d.ia.hoy.llamadas || 0) + (d.ia.limite ? '/' + d.ia.limite : '') +
            ' (errores ' + (d.ia.hoy.errores || 0) + ') \u00b7 TTL cache ' + Math.round((+d.ia.cacheTTL || 0) / 60) + ' min');
        L.push('Reglas: ' + (d.stats.erroresReglas || 0) + ' error(es) \u00b7 A* tope: ' + (d.stats.astarCap || 0));
        if (d.geoAlerta) {
            const g = d.geoAlerta;
            L.push('Alerta de geocercas: ' + (g.activa ? 'activa' : 'apagada') +
                ' \u00b7 ' + g.geocercas + ' geocerca(s) \u00b7 ' + g.flotas + ' en toda la flota' +
                ' \u00b7 ' + g.dentro + ' dentro ahora');
        }
        L.push('Fallos de escritura: local ' + d.fallos.json + ' \u00b7 sesion ' + d.fallos.session);
        if (d.zonasDiag) {
            try { L.push('Geocercas: ' + JSON.stringify(d.zonasDiag).slice(0, 300)); } catch (_) { /* noop */ }
        }
        const top = d.storage.local.slice(0, 6).map((x) => '  ' + x.clave + ' \u00b7 ' + rxDiagBytes(x.bytes));
        if (top.length) { L.push('Top storage:'); L.push.apply(L, top); }
        return L.join('\n');
    }

    function rxDiagPintar() {
        try {
            const out = byId('rondo-diag-out');
            if (out) out.textContent = rxDiagTexto(rxDiagRecolectar());
        } catch (_) { /* noop */ }
    }

    /* ===== Exportador de estilos de la plataforma ======================
     * Barre TODO el CSS accesible (documento, shadow roots anidados,
     * iframes del mismo origen y adoptedStyleSheets), no solo lo visible,
     * y lista cada color literal con los selectores donde se usa y todas
     * las variables del tema. Sirve para mapear con precision en vez de
     * adivinar. Solo lectura: no toca el estilo de la pagina.
     *   - usa     selector { propiedad }
     *   - vars    {"--token":"valor"}
     * Descarga un .json local (Blob + <a>), sin enviar nada. */
    function rxEstilosColector(cap) {
        const CAP = cap || 30;
        const colores = new Map();
        const variables = new Map();
        const hojas = [];
        let nReglas = 0, nRoots = 0;
        const LIT = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
        const norm = (x) => String(x || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const add = (lit, sel, prop) => {
            const k = norm(lit);
            let e = colores.get(k);
            if (!e) { e = { valor: k, n: 0, usos: [] }; colores.set(k, e); }
            e.n++;
            if (e.usos.length < CAP) {
                const u = sel + ' {' + prop + '}';
                if (e.usos.indexOf(u) < 0) e.usos.push(u);
            }
        };
        const reglas = (rs, origen) => {
            for (let i = 0; i < rs.length; i++) {
                const r = rs[i];
                if (r.cssRules && (r.type === 4 || r.type === 12)) {
                    reglas(r.cssRules, origen + '@' + (r.conditionText || '') + ' ');
                    continue;
                }
                if (!r.style) continue;
                if (r.selectorText) nReglas++;
                for (let k = 0; k < r.style.length; k++) {
                    const prop = r.style[k];
                    const val = r.style.getPropertyValue(prop);
                    if (prop.indexOf('--') === 0) { if (!variables.has(prop)) variables.set(prop, norm(val)); continue; }
                    if (!/color|background|border|outline|fill|stroke|shadow|filter/.test(prop)) continue;
                    const m = val.match(LIT);
                    if (m) for (let j = 0; j < m.length; j++) add(m[j], r.selectorText || ('@' + origen), prop);
                }
            }
        };
        const raiz = (root, origen) => {
            nRoots++;
            const etiq = origen + ' >shadow#' + nRoots;
            const hs = [];
            const ad = root.adoptedStyleSheets || [];
            for (let i = 0; i < ad.length; i++) hs.push(ad[i]);
            const st = root.querySelectorAll ? root.querySelectorAll('style') : [];
            for (let i = 0; i < st.length; i++) if (st[i].sheet) hs.push(st[i].sheet);
            for (let i = 0; i < hs.length; i++) {
                try { reglas(hs[i].cssRules || [], etiq); } catch (_) { /* noop */ }
            }
            if (root.querySelectorAll) {
                const todos = root.querySelectorAll('*');
                for (let i = 0; i < todos.length; i++) if (todos[i].shadowRoot) raiz(todos[i].shadowRoot, etiq);
            }
        };
        const doc = (d, origen, prof) => {
            if (prof > 3) return;
            const ss = d.styleSheets || [];
            for (let i = 0; i < ss.length; i++) {
                const sh = ss[i];
                const nombre = sh.href ? String(sh.href).split('/').pop() : '(inline)';
                try { reglas(sh.cssRules, origen); hojas.push({ origen: origen, href: sh.href || '(inline)', archivo: nombre, reglas: sh.cssRules.length }); }
                catch (_) { hojas.push({ origen: origen, href: sh.href || '(cross-origin)', archivo: nombre, reglas: -1 }); }
            }
            const ad = d.adoptedStyleSheets || [];
            for (let i = 0; i < ad.length; i++) { try { reglas(ad[i].cssRules, origen + ' adopted'); } catch (_) { /* noop */ } }
            if (!d.querySelectorAll) return;
            const todos = d.querySelectorAll('*');
            for (let i = 0; i < todos.length; i++) if (todos[i].shadowRoot) raiz(todos[i].shadowRoot, origen);
            const frames = d.querySelectorAll('iframe,frame');
            for (let i = 0; i < frames.length; i++) {
                try { const cd = frames[i].contentDocument; if (cd) doc(cd, origen + ' >iframe', prof + 1); } catch (_) { /* noop */ }
            }
        };
        doc(document, 'document', 0);
        const lista = [];
        colores.forEach((v) => lista.push(v));
        lista.sort((a, b) => b.n - a.n);
        const vars = {};
        variables.forEach((v, k) => { vars[k] = v; });
        // Elementos con texto practicamente del mismo color que su fondo: son
        // los que se ven "vacios" aunque tengan dato. Se recalcula el fondo
        // efectivo subiendo por los ancestros (el propio suele ser transparente).
        const invisibles = [];
        try {
            const parseC = (c) => {
                const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
            };
            const rutaCorta = (el) => {
                const p = [];
                let n = el, c = 0;
                while (n && n.nodeType === 1 && c < 5) {
                    let s = n.tagName.toLowerCase();
                    if (n.id) s += '#' + n.id;
                    else if (typeof n.className === 'string' && n.className.trim()) s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.');
                    p.unshift(s); n = n.parentElement; c++;
                }
                return p.join(' > ');
            };
            const raiz = document.body || document.documentElement;
            const todos = raiz && raiz.querySelectorAll ? raiz.querySelectorAll('*') : [];
            for (let i = 0; i < todos.length && invisibles.length < 80; i++) {
                const el = todos[i];
                if (el.id && el.id.indexOf('rondo') === 0) continue;
                if (el.closest && el.closest('#rondo-panel,#rondo-barra,#rondo-rail')) continue;
                let txt = '';
                for (let ch = el.firstChild; ch; ch = ch.nextSibling) if (ch.nodeType === 3) txt += ch.nodeValue;
                txt = txt.trim();
                if (!txt) continue;
                const cs = window.getComputedStyle ? getComputedStyle(el) : null;
                if (!cs || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
                const f = parseC(cs.color);
                let bg = 'rgba(0, 0, 0, 0)', p = el;
                while (p) {
                    const c2 = getComputedStyle(p).backgroundColor;
                    if (c2 && !/rgba\(0, 0, 0, 0\)|transparent/.test(c2)) { bg = c2; break; }
                    p = p.parentElement;
                }
                const b = parseC(bg);
                if (!f || !b) continue;
                const d = Math.abs(f.r - b.r) + Math.abs(f.g - b.g) + Math.abs(f.b - b.b);
                if (d < 40) {
                    invisibles.push({
                        tag: el.tagName.toLowerCase(),
                        clase: String(el.className || '').slice(0, 140),
                        texto: txt.slice(0, 40),
                        color: cs.color, fondo: bg,
                        inline: String(el.getAttribute('style') || '').slice(0, 200),
                        ruta: rutaCorta(el)
                    });
                }
            }
        } catch (_) { /* noop */ }
        return {
            version: 1,
            generado: new Date().toISOString(),
            url: (location ? location.href : ''),
            resumen: { colores: lista.length, variables: variables.size, hojas: hojas.length, reglas: nReglas, shadowRoots: nRoots, invisibles: invisibles.length },
            colores: lista,
            variables: vars,
            hojas: hojas,
            invisibles: invisibles
        };
    }
    // Descarga el JSON de estilos (Blob + <a>, todo local).
    function rxEstilosExportar() {
        let datos;
        try { datos = rxEstilosColector(30); }
        catch (e) { adviceWarn('No se pudo recolectar', 'Revisa la consola.'); return; }
        let txt;
        try { txt = JSON.stringify(datos, null, 1); }
        catch (_) { adviceWarn('No se pudo serializar', 'Intenta de nuevo.'); return; }
        try {
            const blob = new Blob([txt], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'rondo-estilos-plataforma.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                try { URL.revokeObjectURL(url); } catch (_) { /* noop */ }
                if (a.parentNode) a.parentNode.removeChild(a);
            }, 500);
            adviceOk('Estilos exportados', datos.resumen.colores + ' colores · ' + datos.resumen.variables +
                ' variables · ' + datos.resumen.shadowRoots + ' shadow roots · ' +
                datos.resumen.invisibles + ' textos invisibles');
        } catch (_) { adviceWarn('No se pudo descargar', 'Copia el texto manualmente.'); }
    }
    // Inyecta el bloque en la seccion Avanzado de Ajustes (una sola vez) y
    /* Captura en diferido: la ventana de unidad es un tooltip de hover que
     * desaparece al mover el raton, asi que no se puede pulsar un boton con
     * ella abierta. Este modo vigila unos segundos y captura SOLO la ventana
     * cuando aparece (el elemento visible con fondo claro mas grande), con su
     * ruta, las reglas que lo pintan y su HTML. */
    function rxCapturarVentana(segundos) {
        const limite = Date.now() + (segundos || 25) * 1000;
        const salida = byId('rondo-diag-out');
        if (salida) salida.textContent = 'Esperando la ventana... mueve el raton sobre una unidad (tooltip).';
        const parse = (c) => {
            const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
            return m ? { lum: (0.2126 * (+m[1]) + 0.7152 * (+m[2]) + 0.0722 * (+m[3])) / 255, a: m[4] === undefined ? 1 : +m[4] } : null;
        };
        const claro = (c) => { const p = parse(c); return p && p.a > 0.5 && p.lum > 0.85; };
        const corto = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
            (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
        const reglas = [];
        for (let i = 0; i < document.styleSheets.length; i++) {
            const sh = document.styleSheets[i];
            let rs; try { rs = sh.cssRules; } catch (_) { continue; }
            const href = (sh.href || 'inline').split('/').pop();
            const walk = (l) => {
                for (let k = 0; k < l.length; k++) {
                    const r = l[k];
                    if (r.cssRules && (r.type === 4 || r.type === 12)) { walk(r.cssRules); continue; }
                    if (!r.selectorText || !r.style) continue;
                    const bg = r.style.getPropertyValue('background-color') || r.style.getPropertyValue('background');
                    if (bg) reglas.push({ sel: r.selectorText, bg: bg, prio: r.style.getPropertyPriority('background-color') || r.style.getPropertyPriority('background'), href: href });
                }
            };
            walk(rs);
        }
        const timer = setInterval(() => {
            if (Date.now() > limite) { clearInterval(timer); if (salida) salida.textContent = 'Timeout: no aparecio ninguna ventana con fondo claro.'; return; }
            const todos = document.querySelectorAll('body *');
            let mejor = null, area = 0;
            for (let i = 0; i < todos.length; i++) {
                const el = todos[i];
                const cs = window.getComputedStyle(el);
                if (cs.display === 'none' || cs.visibility === 'hidden') continue;
                if (!claro(cs.backgroundColor)) continue;
                const r = el.getBoundingClientRect();
                if (r.width < 60 || r.height < 40) continue;
                const a = r.width * r.height;
                if (a > area) { area = a; mejor = el; }
            }
            if (!mejor) return;
            clearInterval(timer);
            const out = ['CAPTURADO: ' + corto(mejor) + '  ' + Math.round(area) + 'px'];
            const ruta = [corto(mejor)];
            let p = mejor.parentElement, n = 0;
            while (p && n < 4) { ruta.push(corto(p)); p = p.parentElement; n++; }
            out.push('ruta: ' + ruta.join('  <  '));
            for (let i = 0; i < reglas.length; i++) {
                try { if (mejor.matches(reglas[i].sel)) out.push('regla: ' + reglas[i].sel + '{' + reglas[i].bg + (reglas[i].prio ? ' !important' : '') + '} @' + reglas[i].href); } catch (_) { /* noop */ }
            }
            out.push('inline: ' + (mejor.style.cssText || '-'));
            out.push('HTML: ' + String(mejor.outerHTML).slice(0, 3500));
            const txt = out.join('\n');
            if (salida) salida.textContent = txt;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
                adviceOk('Ventana capturada', 'Copiada al portapapeles. Pegala tal cual.');
            } catch (_) { adviceWarn('Copia el texto', 'Selecciona el texto de abajo.'); }
        }, 200);
    }
    // cablea sus botones. Se llama desde init().
    function rxDiagBind() {
        const pane = document.querySelector('#rondo-config .cfg-pane[data-cfg="avanzado"]');
        if (!pane || pane.querySelector('#rondo-diag-box')) return;
        const box = makeEl('div', { id: 'rondo-diag-box' });
        box.innerHTML =
            '<h4>Diagnostico</h4>' +
            '<div class="rondo-acciones">' +
            '<button class="accbtn" id="rondo-diag-ver"><span class="rondo-usym">' + UIS.info + '</span> Ver diagnostico</button>' +
            '<button class="accbtn" id="rondo-diag-copiar"><span class="rondo-usym">' + UIS.export + '</span> Copiar</button>' +
            '<button class="accbtn" id="rondo-diag-estilos" title="Descarga el JSON con TODOS los colores literales y variables del tema de la plataforma (documento, shadow roots e iframes)"><span class="rondo-usym">' + UIS.export + '</span> Exportar estilos</button>' +
            '<button class="accbtn" id="rondo-diag-fondos" title="Espera 25 s y captura la primera ventana con fondo claro que aparezca (mueve el raton sobre una unidad para que salga el tooltip)"><span class="rondo-usym">' + UIS.info + '</span> Fondos claros</button>' +
            '</div>' +
            '<div id="rondo-diag-out" style="font-size:11.5px;color:var(--rondo-fg-dim);margin-top:6px;white-space:pre-wrap;font-family:monospace;line-height:1.45"></div>';
        pane.appendChild(box);
        const ver = box.querySelector('#rondo-diag-ver');
        if (ver) ver.addEventListener('click', rxDiagPintar);
        const est = box.querySelector('#rondo-diag-estilos');
        if (est) est.addEventListener('click', rxEstilosExportar);
        const fondos = box.querySelector('#rondo-diag-fondos');
        if (fondos) fondos.addEventListener('click', () => {
            try { rxCapturarVentana(25); } catch (e) { adviceWarn('No se pudo inspeccionar', e && e.message); }
        });
        const cop = box.querySelector('#rondo-diag-copiar');
        if (cop) cop.addEventListener('click', () => {
            const txt = rxDiagTexto(rxDiagRecolectar());
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
                adviceOk('Diagnostico copiado', 'Pegalo donde lo necesites.');
            } catch (_) { adviceWarn('No se pudo copiar', 'Selecciona el texto y copialo a mano.'); }
        });
    }
