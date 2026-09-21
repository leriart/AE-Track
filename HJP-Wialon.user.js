// ==UserScript==
// @name         HJP · Wialon (gestión de flota en AE-Track / Wialon)
// @namespace    https://github.com/leriart/AE-Track
// @version      4.0.1
// @description  Vigilancia de flota sobre la API nativa de Wialon. Evalúa reglas de negocio, notifica visualmente con toasts/voz/pitido, automatiza la apertura y acomodo de ventanas, mantiene abiertas solo las seleccionadas. Panel con Dashboard, Unidades, Bitácora y Geocercas. Tema oscuro/claro, backup JSON. Sin emojis.
// @author       lerit
// @homepageURL  https://github.com/leriart/AE-Track
// @supportURL   https://github.com/leriart/AE-Track/issues
// @updateURL    https://raw.githubusercontent.com/leriart/AE-Track/main/HJP-Wialon.user.js
// @downloadURL  https://raw.githubusercontent.com/leriart/AE-Track/main/HJP-Wialon.user.js
// @match        *://*.ae-track.com/*
// @match        *://*.wialon.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/* ============================================================================
   HJP-Wialon V4 — arquitectura

   - Una sola IIFE, modo estricto.
   - El estado vive en un objeto APP (auditable y consistente).
   - Las funciones se declaran una sola vez; cero warnings de ESLint.
   - Sin emojis: solo Unicode (◉ ◎ ✕ △ ◆ ◇ ✓ ⚑ ⌖ ⧗ ↻ ⇩ ⌂ ↦ ↤ ⓘ ▂▄▆█ ☾ ☼ ⎘ ⌫ ⤢ ⤡ ⚙).
   - Reentrante: si la API de Wialon no está lista, avisa y reintenta.
   ============================================================================ */

(function HJPWialon() {
    'use strict';

    /* ====================== ICONOS (UAX#39, sin color emoji) ====================== */
    const ICO = Object.freeze({
        moviendo: '◉', detenida: '◎', offline: '✕', online: '●', sinluz: '○',
        critico: '▲', alto: '△', medio: '◆', bajo: '◇', ok: '✓',
        panel: '▦', dashboard: '▤', alertas: '⚑', automatizar: '▷', cerrar: '✕',
        refrescar: '↻', ajustes: '⚙\uFE0E', descargar: '⇩', filtro: '⌕', copiar: '⎘',
        zona: '⌖', tiempo: '⧗', velocidad: '▸', base: '⌂',
        entra: '↦', sale: '↤', destino: '✓', regreso: '⇄',
        reconecta: '↻', desconecta: '⊘', info: 'ⓘ', reloj: '⧗',
        senal: '▂▄▆█', silencio: '◇', sonido: '◆', bandera: '⚑',
        geocercas: '⌖', subir: '▴', bajar: '▾',
        luna: '☾', sol: '☼', limpiar: '⌫',
        expandir: '⤢', colapsar: '⤡', ayuda: '?', importar: '↥', exportar: '↧',
        silencioTotal: '⤬',
        fullscreen: '⤢',
        fullscreenOff: '⤡'
    });

    const COL = Object.freeze({
        critico: '#b71c1c', alto: '#e65100', medio: '#f9a825',
        bajo: '#1565c0', ok: '#2e7d32'
    });

    /* ============================== IDIOMA ============================== */
    const LANG = Object.freeze({
        titlePanel: 'HJP · API Wialon',
        busq: 'Filtrar eco / placa / zona…',
        velProm: 'km/h prom.',
        criticasHoy: 'críticas',
        recientes: 'Avisos recientes',
        recientesNone: 'Sin avisos recientes.',
        geoNone: 'No hay geocercas cargadas. Activa "Cargar geocercas" en Configuración.',
        sinCoin: 'Sin coincidencias.',
        sinUni: 'Sin unidades.',
        listaEco: 'Lista vigilada (eco o eco=destino, una por línea)',
        guardado: 'Configuración guardada',
        importar: 'Configuración importada'
    });

    /* ============================ LOCALSTORAGE ============================ */
    const LS = Object.freeze({
        cfg: 'hjp.api.cfg',
        watch: 'hjp.api.watch',
        memo: 'hjp.api.memo',
        dismissed: 'hjp.api.dismissed',
        hist: 'hjp.api.hist',
        geo: 'hjp.api.geo',
        barra: 'hjp.api.barra',
        panelpos: 'hjp.api.panelpos',
        panelsize: 'hjp.api.panelsize',
        seleccion: 'hjp.api.seleccion',
        kpi: 'hjp.api.kpi',
        nmolestar: 'hjp.api.nmolestar',
        expanded: 'hjp.api.expanded',
        fullscreen: 'hjp.api.fullscreen'
    });

    /* ============================ VALORES POR DEFECTO ============================ */
    const DEFAULTS = Object.freeze({
        pollMs: 10000,
        offlineMin: 5,
        gpsMin: 15,
        stopMin: 30,
        zonaMin: 20,
        descoMin: 25,
        velMax: 110,
        cooldownMin: 45,
        voice: true,
        voiceLang: 'es-MX',
        beep: true,
        desktop: false,
        toastSeg: 12,
        severidadMin: 'bajo',
        watchAll: false,
        autoOpen: false,
        loadZones: true,
        geocode: true,
        historico: true,
        verificar: false,
        verifSeg: 6,
        fullscreen: false,
        theme: 'oscuro',
        density: 'normal',
        acento: '#1565c0',
        mostrarCoords: false,
        horario: Object.freeze({ on: true, desde: '06:00', hasta: '23:00' }),
        reglas: Object.freeze({
            offline: true,
            gpsPerdido: true,
            detenido: true,
            zona: true,
            geocerca: true,
            destino: false,
            desconexion: true,
            velocidad: false
        })
    });

    /* ============================ UTILIDADES ============================ */
    const sleep = (ms) => new Promise((res) => { setTimeout(res, ms); });

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw == null) return fallback;
            const v = JSON.parse(raw);
            return v == null ? fallback : v;
        } catch (_) { return fallback; }
    }

    function writeJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* noop */ }
    }

    function clearKey(key) {
        try { localStorage.removeItem(key); } catch (_) { /* noop */ }
    }

    function deepMerge(over, base) {
        const out = Object.assign({}, base, over);
        if (base.reglas) out.reglas = Object.assign({}, base.reglas, (over && over.reglas) || {});
        if (base.horario) out.horario = Object.assign({}, base.horario, (over && over.horario) || {});
        return out;
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    function norm(s) {
        return String(s == null ? '' : s).normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    }

    function pickSeverity(level) {
        return { bajo: 1, medio: 2, alto: 3, critico: 4 }[level] || 1;
    }

    function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

    function isoNum(v, d) {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : d;
    }

    /* ============================ ESTADO ============================ */
    const APP = {
        unidades: [],
        zonas: [],
        zonasPorNombre: new Map(),
        watchMap: readJSON(LS.watch, {}),
        seleccion: new Set(readJSON(LS.seleccion, [])),
        dismissed: new Set(readJSON(LS.dismissed, [])),
        memo: readJSON(LS.memo, {}),
        historial: readJSON(LS.hist, []),
        geoCache: readJSON(LS.geo, {}),
        barra: readJSON(LS.barra, {
            x: null, y: null, plegada: false, vertical: false,
            botones: { main: true, panel: true, close: true }
        }),
        panelPos: readJSON(LS.panelpos, null),
        panelSize: readJSON(LS.panelsize, null),
        noMolestar: readJSON(LS.nmolestar, null),
        kpi: readJSON(LS.kpi, { online: [], offline: [] }),
        expanded: readJSON(LS.expanded, false),
        config: deepMerge(readJSON(LS.cfg, {}), DEFAULTS),

        timer: null,
        timerVerif: null,
        timerVerifBusy: false,
        refBusy: false,
        cooldowns: {},
        geoQueue: 0,
        geoLast: 0,

        tab: 'dash',
        filtSever: 'todas',
        filtro: '',
        unlocked: false,
        consultaRestante: 0
    };
    APP.barra.botones = Object.assign({ main: true, panel: true, close: true }, APP.barra.botones || {});

    /* ======================== DOM HELPERS ======================== */
    function byId(id) { return document.getElementById(id); }
    function makeEl(tag, props, styles, children) {
        const n = document.createElement(tag);
        if (props) Object.assign(n, props);
        if (styles) Object.assign(n.style, styles);
        if (children && children.length) {
            for (let i = 0; i < children.length; i++) {
                const c = children[i];
                if (c == null) continue;
                if (typeof c === 'string') n.appendChild(document.createTextNode(c));
                else n.appendChild(c);
            }
        }
        return n;
    }

/* ====================== API WIALON ====================== */
    async function wialonReady(timeout) {
        const ms = timeout || 60000;
        const t0 = Date.now();
        while (true) {
            if (typeof wialon !== 'undefined' && wialon.core && wialon.core.Session) return true;
            if (Date.now() - t0 > ms) return false;
            await sleep(400);
        }
    }
    function session() { return wialon.core.Session.getInstance(); }
    function currentUser() { try { return session().getCurrUser(); } catch (_) { return null; } }
    function remoteCall(service, params) {
        const remote = wialon.core.Remote.getInstance();
        return new Promise((resolve, reject) => {
            try {
                remote.remoteCall(service, params, (code, result) => {
                    if (code) reject(new Error(service + ' -> code ' + code));
                    else resolve(result || {});
                });
            } catch (e) { reject(e); }
        });
    }
    async function fetchUnits() {
        const r = await remoteCall('core/search_items', {
            spec: { itemsType: 'avl_unit', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 1024, from: 0, to: 0
        });
        return r.items || [];
    }
    async function fetchZones() {
        if (!APP.config.loadZones) return [];
        const r = await remoteCall('core/search_items', {
            spec: { itemsType: 'avl_resource', propName: 'sys_name', propValueMask: '*', sortType: 'sys_name' },
            force: 1, flags: 1 | 4096, from: 0, to: 0
        });
        const out = [];
        ((r.items || [])).forEach((res) => {
            try {
                if (typeof res.getZones !== 'function') return;
                const zs = res.getZones() || {};
                Object.keys(zs).forEach((k) => out.push(zs[k]));
            } catch (_) { /* noop */ }
        });
        APP.zonasPorNombre = new Map(out.map((z) => [z.n || '', z]));
        return out;
    }
    async function fetchLastMotion(uid, minutos) {
        const ahora = Math.floor(Date.now() / 1000);
        const r = await remoteCall('messages/load_interval', {
            itemId: uid,
            timeFrom: ahora - (minutos || 180) * 60,
            timeTo: ahora,
            flags: 1, flagsMask: 1, loadCount: 1000
        });
        const msgs = r.messages || [];
        const mov = msgs.filter((m) => (((m.pos || {}).s) || 0) > 3).map((m) => m.t);
        if (!mov.length) return null;
        return Math.max.apply(null, mov);
    }

    /* ====================== GEO ====================== */
    function inZone(lat, lon, z) {
        if (!z || lat == null || lon == null) return false;
        try {
            const x = lon, y = lat, b = z.b;
            if (b && (x < b.min_x || x > b.max_x || y < b.min_y || y > b.max_y)) return false;
            const p = z.p;
            if (Array.isArray(p) && p.length >= 3) {
                let inside = false;
                for (let i = 0, j = p.length - 1; i < p.length; j = i) {
                    const a = p[i], c = p[j];
                    const xi = (a.x != null) ? a.x : a[0];
                    const yi = (a.y != null) ? a.y : a[1];
                    const xj = (c.x != null) ? c.x : c[0];
                    const yj = (c.y != null) ? c.y : c[1];
                    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
                }
                return inside;
            }
            if (z.c && z.w != null) {
                const dx = (x - z.c.x) * Math.cos(y * Math.PI / 180) * 111320;
                const dy = (y - z.c.y) * 110540;
                return Math.sqrt(dx * dx + dy * dy) <= z.w;
            }
            return !!b;
        } catch (_) { return false; }
    }
    function zoneAt(lat, lon) {
        if (!APP.config.loadZones || lat == null || lon == null) return '';
        const zs = APP.zonas;
        for (let i = 0; i < zs.length; i++) {
            if (inZone(lat, lon, zs[i])) return zs[i].n || ('Zona ' + zs[i].id);
        }
        return '';
    }
    async function reverseGeocode(lat, lon) {
        if (!APP.config.geocode || lat == null || lon == null) return null;
        const key = lat.toFixed(3) + ',' + lon.toFixed(3);
        if (APP.geoCache[key]) return APP.geoCache[key];
        const espera = 1100 - (Date.now() - APP.geoLast);
        if (espera > 0) await sleep(espera);
        APP.geoLast = Date.now();
        try {
            const res = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&accept-language=es&lat=' + lat + '&lon=' + lon);
            const d = await res.json();
            const a = d.address || {};
            const detalle = a.road || a.pedestrian || a.suburb || a.village || a.hamlet || '';
            const ciudad = a.city || a.town || a.municipality || a.county || a.state || '';
            const info = { texto: [detalle, ciudad].filter(Boolean).join(', '), ciudad };
            APP.geoCache[key] = info;
            writeJSON(LS.geo, APP.geoCache);
            return info;
        } catch (_) { return null; }
    }

    /* ====================== NOMBRE + ESTADO ====================== */
    function parseUnitName(u) {
        const nombre = u.nm || String(u.id);
        let eco = '';
        const mEco = nombre.match(/\.\s*0*(\d{3,5})(?!\d)/);
        if (mEco) eco = mEco[1];
        if (!eco) {
            const m = nombre.match(/\b0*(\d{3,5})\b/);
            if (m) eco = m[1];
        }
        let placa = '';
        const mPlaca = nombre.match(/\b([A-Z]{2,4}[-\s]?\d{2,4}[A-Z]{0,3})\b/);
        if (mPlaca) placa = mPlaca[1];
        return { id: u.id, nombre, eco, placa, clave: eco || placa || String(u.id) };
    }
    function unitState(u) {
        const pos = u.pos || {};
        const lmsg = u.lmsg || {};
        const t = pos.t || lmsg.t || 0;
        const edadMin = t ? (Date.now() / 1000 - t) / 60 : Infinity;
        const online = edadMin < APP.config.offlineMin;
        const vel = pos.s || 0;
        const estado = !online ? 'offline' : (vel > 3 ? 'moviendo' : 'detenida');
        return {
            t, edadMin, online, vel, estado,
            lat: (pos.y != null) ? pos.y : null,
            lon: (pos.x != null) ? pos.x : null,
            curso: pos.c || 0, sat: pos.sc || 0
        };
    }
    function isWatched(info) {
        const e = info.eco, p = info.placa, i = String(info.id);
        return !!(e && APP.watchMap[e]) || !!(p && APP.watchMap[p]) || !!APP.watchMap[i];
    }
    function watchDest(info) {
        const e = info.eco, p = info.placa, i = String(info.id);
        return (e && APP.watchMap[e]) || (p && APP.watchMap[p]) || (APP.watchMap[i]) || '';
    }
    function shouldWatch(u) {
        if (APP.config.watchAll) return true;
        const info = parseUnitName(u);
        const e = info.eco, p = info.placa, i = String(info.id);
        if (e && APP.seleccion.has(e)) return true;
        if (p && APP.seleccion.has(p)) return true;
        if (APP.seleccion.has(i)) return true;
        return false;
    }
    function isBase(zona) {
        return /\b(GENA|CEDIS|PATIO|PLANTA|OFICINAS|ALMACEN|TALLER|BODEGA|LABORATORIO|BASCULA|RASTRO)\b/.test(norm(zona));
    }
    function ageText(min) {
        if (!isFinite(min)) return 'sin datos';
        if (min < 1) return 'ahora';
        if (min < 60) return Math.round(min) + 'm';
        const h = min / 60;
        if (h < 24) return h.toFixed(1) + 'h';
        return Math.round(h / 24) + 'd';
    }
    function inHorario() {
        const cfg = APP.config;
        if (!cfg.horario.on) return true;
        const a = cfg.horario.desde.split(':').map(Number);
        const b = cfg.horario.hasta.split(':').map(Number);
        const d = new Date();
        const m = d.getHours() * 60 + d.getMinutes();
        return m >= a[0] * 60 + a[1] && m <= b[0] * 60 + b[1];
    }
    function normEco(s) { return String(s || '').replace(/^0+/, '') || String(s || ''); }

    /* ====================== NOTIFICACIONES ====================== */
    function speak(text) {
        if (!APP.config.voice || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = APP.config.voiceLang;
            u.rate = 1.05; u.pitch = 1.0;
            window.speechSynthesis.speak(u);
        } catch (_) { /* noop */ }
    }
    function beep(sev) {
        if (!APP.config.beep) return;
        try {
            const Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor) return;
            const ctx = beep._ctx || (beep._ctx = new Ctor());
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'square';
            o.frequency.value = (sev === 'critico') ? 880 : (sev === 'alto') ? 660 : 440;
            g.gain.value = 0.05;
            o.connect(g); g.connect(ctx.destination);
            o.start();
            o.stop(ctx.currentTime + (sev === 'critico' ? 0.35 : 0.18));
        } catch (_) { /* noop */ }
    }
    function desktopNotify(title, body) {
        if (!APP.config.desktop) return;
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        try { new Notification(title, { body }); } catch (_) { /* noop */ }
    }
    function pushAlert(alert) {
        if (APP.dismissed.has(alert.clave)) return;
        if (alert.soloHorario && !inHorario()) return;
        const ck = alert.clave + '::' + alert.regla;
        const ahora = Date.now();
        if (APP.cooldowns[ck] && ahora - APP.cooldowns[ck] < APP.config.cooldownMin * 60000) return;
        APP.cooldowns[ck] = ahora;

        const item = {
            regla: alert.regla, sev: alert.sev,
            titulo: alert.titulo, detalle: alert.detalle || '',
            eco: alert.eco || '', clave: alert.clave, ts: ahora,
            icono: alert.icono || ICO[alert.sev] || ICO.info
        };
        APP.historial.unshift(item);
        if (APP.historial.length > 300) APP.historial.length = 300;
        writeJSON(LS.hist, APP.historial);

        const nivel = pickSeverity(item.sev);
        const minNivel = pickSeverity(APP.config.severidadMin);
        const nm = APP.noMolestar && APP.noMolestar.hasta > Date.now();
        if (nivel >= minNivel && !nm) {
            toast(item);
            if (alert.hablar) speak(alert.hablar);
            if (item.sev === 'critico' || item.sev === 'alto') beep(item.sev);
            desktopNotify(item.titulo, item.detalle);
        }
        if (alert.eco) {
            highlightUnitWindow(alert.eco, COL[item.sev]);
            if (APP.config.autoOpen && item.sev === 'critico') openUnitWindow(alert.eco);
        }
        paintCounters();
        if (APP.tab === 'alertas') paintAlertas();
        if (APP.tab === 'dash') paintKPI();
        paintStateBadge();
    }
    function toast(item) {
        const cont = byId('hjp-toasts');
        if (!cont) return;
        const card = makeEl('div', { className: 'hjp-toast' });
        card.style.borderLeftColor = COL[item.sev] || '#555';
        const color = COL[item.sev] || '#777';
        card.innerHTML =
            '<span class="ico" style="color:' + color + '">' + esc(item.icono) + '</span>' +
            '<div class="cuerpo"><b>' + esc(item.titulo) + '</b>' +
            (item.detalle ? '<span>' + esc(item.detalle) + '</span>' : '') +
            '</div><span class="hora">' + new Date(item.ts).toLocaleTimeString().slice(0, 5) + '</span>' +
            '<button class="mini" data-acc="x">✕</button>';
        card.querySelector('[data-acc="x"]').addEventListener('click', () => { if (card.parentNode) card.parentNode.removeChild(card); });
        cont.appendChild(card);
        setTimeout(() => {
            card.classList.add('sale');
            setTimeout(() => { if (card.parentNode) card.parentNode.removeChild(card); }, 400);
        }, APP.config.toastSeg * 1000);
        while (cont.children.length > 6) cont.removeChild(cont.firstChild);
    }
    function advice(titulo, detalle) {
        toast({ sev: 'bajo', icono: ICO.info, titulo, detalle: detalle || '', ts: Date.now() });
    }
/* ====================== MOTOR DE REGLAS ====================== */
    async function evaluateUnit(u, info, st, prev, ctx) {
        const clave = info.clave;
        const etq = (info.eco || info.placa || info.nombre || info.id || '');
        const R = {
            estado: st.estado, t: st.t, vel: st.vel, lat: st.lat, lon: st.lon,
            zona: zoneAt(st.lat, st.lon),
            detenidoDesde: prev ? prev.detenidoDesde : null,
            zonaExt: prev ? prev.zonaExt : null,
            enDestino: prev ? prev.enDestino : false,
            descoAlerta: prev ? prev.descoAlerta : false
        };

        // a) sin senal
        if (APP.config.reglas.offline) {
            if (prev && prev.estado !== 'offline' && st.estado === 'offline') {
                pushAlert({
                    regla: 'offline', sev: 'alto', clave, eco: info.eco,
                    titulo: 'SIN SENAL · ' + etq,
                    detalle: 'sin reportar hace ' + ageText(st.edadMin) + (R.zona ? ' · ' + R.zona : ''),
                    hablar: 'Atención, la unidad ' + etq + ' se ha desconectado'
                });
            } else if (prev && prev.estado === 'offline' && st.estado !== 'offline') {
                pushAlert({
                    regla: 'offline', sev: 'ok', clave, eco: info.eco,
                    titulo: 'RECONECTO · ' + etq,
                    detalle: 'volvio a reportar · ' + Math.round(st.vel) + ' km/h',
                    hablar: 'La unidad ' + etq + ' volvio a estar en linea'
                });
                R.descoAlerta = false;
            }
        }

        // b) GPS perdido en marcha
        if (APP.config.reglas.gpsPerdido && prev && prev.estado !== 'offline') {
            if (prev.vel > 5 && st.estado === 'offline' && st.edadMin >= APP.config.gpsMin) {
                pushAlert({
                    regla: 'gpsPerdido', sev: 'critico', clave, eco: info.eco,
                    titulo: 'SENAL PERDIDA EN MARCHA · ' + etq,
                    detalle: 'ultima velocidad ' + Math.round(prev.vel) + ' km/h · sin datos ' + ageText(st.edadMin) + (prev.zona ? ' · ' + prev.zona : ''),
                    hablar: 'Atención, se perdio la señal de la unidad ' + etq + ' en marcha'
                });
            }
        }

        // c) Detenido en carretera
        if (APP.config.reglas.detenido) {
            if (st.online && st.vel <= 1) {
                if (!R.detenidoDesde) {
                    R.detenidoDesde = Date.now() / 1000;
                    if (APP.config.historico && APP.consultaRestante > 0 && ctx.quotaOk) {
                        APP.consultaRestante--;
                        try {
                            const um = await fetchLastMotion(u.id);
                            if (um) R.detenidoDesde = um;
                        } catch (_) { /* noop */ }
                    }
                }
                const m = (Date.now() / 1000 - R.detenidoDesde) / 60;
                if (m >= APP.config.stopMin && !isBase(R.zona)) {
                    let ctxTxt = ctx.ubicaciones[clave];
                    if (ctxTxt == null && ctx.quotaGeo) {
                        const g = await reverseGeocode(st.lat, st.lon);
                        ctx.ubicaciones[clave] = ctxTxt = g ? (g.texto || g.ciudad || '') : '';
                    }
                    pushAlert({
                        regla: 'detenido', sev: 'medio', clave, eco: info.eco, soloHorario: true,
                        titulo: 'DETENIDO ' + Math.round(m) + ' min · ' + etq,
                        detalle: (R.zona ? 'zona: ' + R.zona : 'fuera de geocercas') + (ctxTxt ? ' · ' + ctxTxt : ''),
                        hablar: 'La unidad ' + etq + ' lleva ' + Math.round(m) + ' minutos detenida'
                    });
                }
            } else {
                R.detenidoDesde = null;
            }
        }

        // d) Zona no prevista
        if (APP.config.reglas.zona) {
            const z = R.zona;
            if (z && !isBase(z)) {
                const destino = watchDest(info);
                const esperada = destino && norm(z).indexOf(norm(destino)) >= 0;
                if (!esperada) {
                    if (!R.zonaExt || R.zonaExt.n !== z) R.zonaExt = { n: z, desde: Date.now() / 1000 };
                    const m = (Date.now() / 1000 - R.zonaExt.desde) / 60;
                    if (m >= APP.config.zonaMin) {
                        pushAlert({
                            regla: 'zona', sev: 'medio', clave, eco: info.eco, soloHorario: true,
                            titulo: 'ZONA NO PREVISTA ' + Math.round(m) + ' min · ' + etq,
                            detalle: 'permanece en ' + z,
                            hablar: 'La unidad ' + etq + ' lleva ' + Math.round(m) + ' minutos en zona no prevista'
                        });
                    }
                } else {
                    R.zonaExt = null;
                }
            } else {
                R.zonaExt = null;
            }
        }

        // e) Entrada / salida de geocerca
        if (APP.config.reglas.geocerca && prev && prev.zona !== R.zona) {
            if (R.zona) {
                pushAlert({
                    regla: 'geocerca', sev: 'bajo', clave, eco: info.eco,
                    titulo: 'ENTRO · ' + etq,
                    detalle: ICO.entra + ' ' + R.zona + ' · ' + Math.round(st.vel) + ' km/h'
                });
            } else if (prev.zona) {
                pushAlert({
                    regla: 'geocerca', sev: 'bajo', clave, eco: info.eco,
                    titulo: 'SALIO · ' + etq,
                    detalle: ICO.sale + ' ' + prev.zona + ' · ' + Math.round(st.vel) + ' km/h'
                });
            }
        }

        // f) Destino / regreso
        if (APP.config.reglas.destino) {
            const destino = watchDest(info);
            if (destino && st.online) {
                const geo = await reverseGeocode(st.lat, st.lon);
                const ciudad = geo ? geo.ciudad : '';
                const enDestino = !!ciudad && (norm(ciudad).indexOf(norm(destino)) >= 0 || norm(destino).indexOf(norm(ciudad)) >= 0);
                if (enDestino && !R.enDestino) {
                    R.enDestino = true;
                    pushAlert({
                        regla: 'destino', sev: 'ok', clave, eco: info.eco,
                        titulo: 'LLEGO A DESTINO · ' + etq,
                        detalle: 'en ' + ciudad,
                        hablar: 'La unidad ' + etq + ' llego a su destino'
                    });
                } else if (!enDestino && R.enDestino && st.vel > 10) {
                    R.enDestino = false;
                    pushAlert({
                        regla: 'destino', sev: 'bajo', clave, eco: info.eco,
                        titulo: 'EN REGRESO · ' + etq,
                        detalle: 'salio de ' + destino + ' · ' + Math.round(st.vel) + ' km/h',
                        hablar: 'La unidad ' + etq + ' va en regreso'
                    });
                }
            }
        }

        // g) Desconexion prolongada
        if (APP.config.reglas.desconexion && st.estado === 'offline' && st.edadMin >= APP.config.descoMin) {
            if (!R.descoAlerta) {
                R.descoAlerta = true;
                pushAlert({
                    regla: 'desconexion', sev: 'critico', clave, eco: info.eco,
                    titulo: 'DESCONEXION PROLONGADA · ' + etq,
                    detalle: 'lleva ' + ageText(st.edadMin) + ' sin senal',
                    hablar: 'Atención, la unidad ' + etq + ' sigue desconectada'
                });
            }
        }

        // h) Exceso de velocidad
        if (APP.config.reglas.velocidad && st.online && st.vel > APP.config.velMax) {
            pushAlert({
                regla: 'velocidad', sev: 'medio', clave, eco: info.eco, soloHorario: true,
                titulo: 'EXCESO DE VELOCIDAD · ' + etq,
                detalle: Math.round(st.vel) + ' km/h (limite ' + APP.config.velMax + ')',
                hablar: 'La unidad ' + etq + ' excede la velocidad'
            });
        }

        return R;
    }

    /* ====================== REFRESH ====================== */
    async function refresh() {
        if (APP.refBusy || !currentUser()) return;
        APP.refBusy = true;
        try {
            const unidades = await fetchUnits();
            APP.unidades = unidades;
            if (APP.config.loadZones && APP.zonas.length === 0) {
                try { APP.zonas = await fetchZones(); } catch (_) { APP.zonas = []; }
            }
            APP.consultaRestante = 40;
            const ubicaciones = {};
            const nuevas = {};
            for (let i = 0; i < unidades.length; i++) {
                const u = unidades[i];
                if (!shouldWatch(u)) continue;
                const info = parseUnitName(u);
                const st = unitState(u);
                const prev = APP.memo[info.clave];
                const ctx = {
                    ubicaciones: ubicaciones,
                    quotaOk: APP.config.historico,
                    quotaGeo: APP.config.geocode
                };
                try {
                    const R = await evaluateUnit(u, info, st, prev, ctx);
                    nuevas[info.clave] = R;
                } catch (e) {
                    if (APP.unlocked) { try { console.warn('[HJP] reg', info.clave, e && e.message); } catch (_) { /* noop */ } }
                }
            }
            APP.memo = nuevas;
            writeJSON(LS.memo, APP.memo);

            const watched = unidades.filter(shouldWatch);
            const onNow = watched.filter((u) => unitState(u).online).length;
            APP.kpi.online = APP.kpi.online.concat(onNow).slice(-180);
            APP.kpi.offline = APP.kpi.offline.concat(watched.length - onNow).slice(-180);
            writeJSON(LS.kpi, APP.kpi);

            paintPanel();
        } catch (e) {
            if (APP.unlocked) { try { console.warn('[HJP] refresh', e && e.message); } catch (_) { /* noop */ } }
        } finally {
            APP.refBusy = false;
        }
    }

    function restartTimers() {
        if (APP.timer) clearInterval(APP.timer);
        APP.timer = setInterval(refresh, APP.config.pollMs);
        restartVerificationLoop();
    }

    /* ====================== VENTANAS DE LA APP (AbrirVehiculos++) ====================== */
    const escRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const RE_TITULO = /[A-Z0-9]{2,}\.\s?\d{3,5}\s*-\s*[A-Z0-9]{5,}/;
    function setValueReact(input, texto) {
        const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (d && d.set) d.set.call(input, texto); else input.value = texto;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        ['keydown', 'keyup'].forEach((t) => {
            try { input.dispatchEvent(new KeyboardEvent(t, { bubbles: true, key: 'Enter', keyCode: 13 })); } catch (_) { /* noop */ }
        });
    }
    function clearInput(input) {
        const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (d && d.set) d.set.call(input, ''); else input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function findSearchInput() {
        const inputs = Array.prototype.slice.call(document.querySelectorAll('input'))
            .filter((i) => i.type !== 'hidden' && i.offsetParent && !i.disabled);
        const byPh = inputs.find((i) => {
            const t = ((i.placeholder || '') + ' ' + (i.getAttribute('aria-label') || '') + ' ' + (i.title || '')).toLowerCase();
            return /buscar|search|filtr|filtro/.test(t);
        });
        return byPh || inputs.find((i) => i.type === 'search') || document.querySelector('input[placeholder="Buscar"]') || inputs[0] || null;
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
            return new MouseEvent(tipo, Object.assign({
                bubbles: true, cancelable: true, view: window,
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
        const list = openWindows();
        if (!list.length) return;
        // Algoritmo portado del HJP original: rejilla con origen fijo (380, 60),
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
            // left/top como el HJP original.
            const cs = getComputedStyle(win);
            const t = cs.transform;
            const vis = (cabecerade(win) || win).getBoundingClientRect();
            const dx = targetX - vis.left;
            const dy = targetY - vis.top;
            if (t && t !== 'none' && t.indexOf('matrix') === 0) {
                try {
                    const m = new DOMMatrixReadOnly(t);
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
        return true;
    }
    function closeContainer(cont) {
        if (!cont) return false;
        const btn = cont.querySelector('[id$="_pursuit_win_close_id"]')
            || cont.querySelector('button[class*="close" i], [class*="close" i]');
        if (!btn) return false;
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
    }
    function closeAllWindows() {
        document.querySelectorAll('[id$="_pursuit_win_close_id"]').forEach((b) => {
            b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
    }
    function highlightUnitWindow(eco, color) {
        const w = findUnitWindow(eco);
        if (!w) return;
        w.style.border = '4px solid ' + color;
        w.style.boxShadow = '0 0 22px ' + color;
    }

    /* ====================== LISTA UNIFICADA (eco + destino) ====================== */
    function guardarLista() {
        writeJSON(LS.watch, APP.watchMap);
        paintInfo();
    }
    function agregarALista(eco, destino) {
        eco = normEco(eco);
        if (!eco) return false;
        APP.watchMap[eco] = (destino || APP.watchMap[eco] || '').trim();
        guardarLista();
        return true;
    }
    function quitarDeLista(eco) {
        if (!eco) return;
        if (Object.prototype.hasOwnProperty.call(APP.watchMap, eco)) {
            delete APP.watchMap[eco];
            guardarLista();
        }
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
    function pintarModalLista() {
        const body = byId('hjp-modal-lista');
        if (!body) return;
        const ecos = Object.keys(APP.watchMap);
        ecos.sort((a, b) => a.localeCompare(b));
        if (!ecos.length) {
            body.innerHTML = '<div class="lista-empty">Lista vacía. Pega abajo o añade uno.</div>';
            return;
        }
        body.innerHTML = ecos.map((eco) => (
            '<div class="lista-row" data-eco="' + esc(eco) + '">' +
            '<span class="eco">' + esc(eco) + '</span>' +
            '<input type="text" class="hjp-dest" data-eco="' + esc(eco) + '" value="' + esc(APP.watchMap[eco] || '') + '" placeholder="destino opcional">' +
            '<button class="hjp-del" data-eco="' + esc(eco) + '" title="Quitar de la lista">✕</button>' +
            '</div>'
        )).join('');
    }

    /* ====================== VERIFICACION ====================== */
    function captureSelection() {
        const list = openWindows();
        APP.seleccion = new Set(list.map((v) => v.eco).filter(Boolean));
        writeJSON(LS.seleccion, Array.from(APP.seleccion));
        advice('Seleccion capturada', APP.seleccion.size + ' ventana(s) / unidad(es)');
        paintInfo();
        if (APP.tab === 'unidades') paintTabla();
        return APP.seleccion.size;
    }
    function addToSelection(eco, placa) {
        if (eco) APP.seleccion.add(eco);
        else if (placa) APP.seleccion.add(placa);
        writeJSON(LS.seleccion, Array.from(APP.seleccion));
        paintInfo();
    }
    function removeFromSelection(eco, placa) {
        if (eco) APP.seleccion.delete(eco);
        else if (placa) APP.seleccion.delete(placa);
        writeJSON(LS.seleccion, Array.from(APP.seleccion));
        paintInfo();
    }
    function selectAllVisible() {
        const rows = document.querySelectorAll('#hjp-body tr.fila');
        let n = 0;
        rows.forEach((tr) => {
            const eco = tr.dataset.eco;
            if (!eco) return;
            if (!APP.seleccion.has(eco)) {
                APP.seleccion.add(eco);
                n++;
            }
        });
        writeJSON(LS.seleccion, Array.from(APP.seleccion));
        advice('Seleccion anadida', n + ' unidad(es) visible(s)');
        paintInfo();
        paintTabla();
        return n;
    }
    function clearSelection() {
        const n = APP.seleccion.size;
        APP.seleccion.clear();
        writeJSON(LS.seleccion, Array.from(APP.seleccion));
        advice('Seleccion vaciada', n + ' unidad(es) liberadas');
        paintInfo();
        paintTabla();
    }
    async function verifyWindows(silent) {
        if (APP.timerVerifBusy) return 0;
        if (!APP.seleccion.size) {
            if (!silent) advice('Sin seleccion', 'Ejecuta una lista o captura las ventanas abiertas');
            return 0;
        }
        APP.timerVerifBusy = true;
        try {
            let cerradas = 0;
            const list = openWindows();
            for (let i = 0; i < list.length; i++) {
                if (list[i].eco && APP.seleccion.has(list[i].eco)) continue;
                if (closeContainer(list[i].cont)) { cerradas++; await sleep(120); }
            }
            if (cerradas) {
                paintCounters();
                if (!silent) advice('Verificacion', cerradas + ' ventana(s) ajena(s) cerrada(s)');
            } else if (!silent) {
                advice('Verificacion', 'Solo estan abiertas las ventanas seleccionadas');
            }
            return cerradas;
        } finally {
            APP.timerVerifBusy = false;
        }
    }
    function restartVerificationLoop() {
        if (APP.timerVerif) clearInterval(APP.timerVerif);
        APP.timerVerif = null;
        if (APP.config.verificar) {
            APP.timerVerif = setInterval(() => { verifyWindows(true); }, Math.max(2, APP.config.verifSeg) * 1000);
        }
        paintVerifyButton();
    }
    function paintVerifyButton() {
        const b = byId('hjp-verif');
        if (!b) return;
        b.classList.toggle('activo', !!APP.config.verificar);
        b.title = APP.config.verificar
            ? 'Verificacion activa: solo se mantienen las ventanas seleccionadas'
            : 'Activar verificacion de ventanas';
    }
    async function execList(ecos) {
        APP.seleccion = new Set(ecos.map((e) => normEco(e)).filter(Boolean));
        writeJSON(LS.seleccion, Array.from(APP.seleccion));
        paintInfo();
        for (let i = 0; i < ecos.length; i++) {
            const b = byId('hjp-btn-main');
            if (b) {
                b.innerText = ICO.automatizar + ' Buscando (' + (i + 1) + '/' + ecos.length + ')...';
                b.style.background = '#f57c00';
            }
            await openUnitWindow(ecos[i]);
            await sleep(250);
        }
        const inp = findSearchInput();
        if (inp) clearInput(inp);
        const b = byId('hjp-btn-main');
        if (b) { b.innerText = ICO.panel + ' Organizando...'; b.style.background = '#1565c0'; }
        await sleep(400);
        await organizeWindows();
        await verifyWindows(true);
        resetMainBtn();
    }
    function resetMainBtn() {
        mainBtn.innerText = ICO.automatizar + ' Automatizar Unidades';
        mainBtn.style.background = '#d32f2f';
    }

    /* ====================== TEMA / NO MOLESTAR ====================== */
    function applyTheme() {
        const c = APP.config;
        const theme = (c.theme === 'auto')
            ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro')
            : c.theme;
        if (theme === 'claro') document.body.setAttribute('data-hjp-theme', 'claro');
        else document.body.removeAttribute('data-hjp-theme');
        const b = byId('hjp-tema');
        if (b) b.innerText = (theme === 'claro') ? ICO.sol : ICO.luna;
        if (c.acento) {
            document.documentElement.style.setProperty('--hjp-accent', c.acento);
            document.documentElement.style.setProperty('--hjp-accent-2', c.acento);
        }
        const p = byId('hjp-panel');
        if (p) p.classList.toggle('density-compact', c.density === 'compact');
    }
    function nmActivo() { return APP.noMolestar && APP.noMolestar.hasta > Date.now(); }
    function toggleNoMolestar(min) {
        if (min === undefined) {
            if (nmActivo()) {
                APP.noMolestar = null; advice('No molestar desactivado', '');
            } else {
                APP.noMolestar = { hasta: Date.now() + 30 * 60000, motivo: 'manual' };
                advice('No molestar', 'Pausado por 30 min · silencio voz / pitido / toasts');
            }
        } else {
            APP.noMolestar = { hasta: Date.now() + min * 60000, motivo: 'manual' };
        }
        writeJSON(LS.nmolestar, APP.noMolestar);
        updateNoMolestar();
        paintStateBadge();
    }
    function updateNoMolestar() {
        const b = byId('hjp-nmolestar');
        if (!b) return;
        if (nmActivo()) {
            const m = Math.ceil((APP.noMolestar.hasta - Date.now()) / 60000);
            b.classList.add('activo'); b.title = 'No molestar (' + m + ' min) · clic para desactivar';
        } else { b.classList.remove('activo'); b.title = 'No molestar (silencia voz/pitido/toasts)'; }
    }
    setInterval(() => {
        if (nmActivo()) updateNoMolestar();
        else if (APP.noMolestar) { APP.noMolestar = null; writeJSON(LS.nmolestar, null); }
    }, 30000);
/* ====================== CSS ====================== */
    function injectCSS() {
        const css =
            ":root{\n" +
            "  --hjp-bg:#1a1c20; --hjp-bg-soft:#25282e; --hjp-bg-strong:#2c2f36;\n" +
            "  --hjp-border:#33373f; --hjp-border-soft:#2a2d33;\n" +
            "  --hjp-fg:#e6e6e6; --hjp-fg-dim:#8a92a0; --hjp-fg-mute:#6f7783;\n" +
            "  --hjp-accent:#1565c0; --hjp-accent-2:#42a5f5;\n" +
            "  --hjp-ok:#2e7d32; --hjp-ok-fg:#a5d6a7; --hjp-ok-bg:#1b3320;\n" +
            "  --hjp-warn:#f9a825; --hjp-warn-fg:#ffe082; --hjp-warn-bg:#33270e;\n" +
            "  --hjp-bad:#b71c1c; --hjp-bad-fg:#ef9a9a; --hjp-bad-bg:#2b1010;\n" +
            "  --hjp-shadow:0 12px 34px rgba(0,0,0,.55);\n" +
            "}\n" +
            "body[data-hjp-theme='claro']{\n" +
            "  --hjp-bg:#ffffff; --hjp-bg-soft:#f4f5f7; --hjp-bg-strong:#e7e9ec;\n" +
            "  --hjp-border:#d4d7de; --hjp-border-soft:#e7e9ec;\n" +
            "  --hjp-fg:#1a1a1a; --hjp-fg-dim:#555b65; --hjp-fg-mute:#7c818b;\n" +
            "  --hjp-ok-fg:#2e7d32; --hjp-ok-bg:#e8f3e9;\n" +
            "  --hjp-warn-fg:#8d6b00; --hjp-warn-bg:#fff4d4;\n" +
            "  --hjp-bad-fg:#b71c1c; --hjp-bad-bg:#fde2e2;\n" +
            "  --hjp-shadow:0 8px 22px rgba(0,0,0,.18);\n" +
            "}\n" +
            "#hjp-toasts{position:fixed;top:210px;right:15px;z-index:1000002;display:flex;flex-direction:column;gap:8px;width:330px;pointer-events:none}\n" +
            ".hjp-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:9px;background:var(--hjp-bg-soft);color:var(--hjp-fg);\n" +
            "  border-left:5px solid var(--hjp-fg-mute);border-radius:7px;padding:10px 11px;box-shadow:var(--hjp-shadow);\n" +
            "  font:12.5px/1.35 system-ui,sans-serif;animation:hjpIn .25s ease}\n" +
            ".hjp-toast.sale{opacity:0;transform:translateX(36px);transition:all .35s}\n" +
            "@keyframes hjpIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}\n" +
            ".hjp-toast .ico{font-size:18px;line-height:1;width:18px;text-align:center}\n" +
            ".hjp-toast .cuerpo{display:flex;flex-direction:column;flex:1;min-width:0}\n" +
            ".hjp-toast .cuerpo b{font-size:12.5px}\n" +
            ".hjp-toast .cuerpo span{color:var(--hjp-fg-dim);font-size:11.5px;margin-top:2px}\n" +
            ".hjp-toast .hora{color:var(--hjp-fg-mute);font-size:10px}\n" +
            ".hjp-toast .mini{background:transparent;border:none;color:var(--hjp-fg-mute);cursor:pointer;font-size:11px}\n" +
            "#hjp-barra{position:fixed;top:80px;right:15px;z-index:999999;display:flex;align-items:center;gap:6px;\n" +
            "  background:rgba(28,30,36,.94);border:1px solid var(--hjp-border);border-radius:10px;padding:5px;\n" +
            "  box-shadow:var(--hjp-shadow);font:12px system-ui,sans-serif;user-select:none;touch-action:none;max-width:95vw}\n" +
            "#hjp-barra.vertical{flex-direction:column;align-items:stretch}\n" +
            "#hjp-barra .hjp-grip{cursor:grab;color:var(--hjp-fg-mute);padding:0 3px;font-size:15px;line-height:1;letter-spacing:-2px;user-select:none}\n" +
            "#hjp-barra .hjp-grip:active{cursor:grabbing}\n" +
            "#hjp-barra .hjp-btn{background:#33373f;color:#fff;border:none;border-radius:7px;padding:7px 11px;\n" +
            "  cursor:pointer;font:12px system-ui,sans-serif;font-weight:bold;white-space:nowrap;transition:filter .12s,transform .08s}\n" +
            "#hjp-barra .hjp-btn:hover{filter:brightness(1.18)}\n" +
            "#hjp-barra .hjp-btn:active{transform:translateY(1px)}\n" +
            "#hjp-barra .hjp-fold{background:#22242a;color:#9aa2b1;padding:4px 9px}\n" +
            "#hjp-barra.plegada .hjp-btn:not(.hjp-fold){display:none}\n" +
            "#hjp-btn-main{background:#d32f2f}\n" +
            "#hjp-btn-panel{background:#1565c0}\n" +
            "#hjp-btn-close{background:#37474f}\n" +
            "#hjp-panel{position:fixed;left:10px;bottom:10px;width:470px;height:440px;display:none;flex-direction:column;\n" +
            "  background:var(--hjp-bg);color:var(--hjp-fg);font:12.5px/1.4 system-ui,sans-serif;border:1px solid var(--hjp-border);border-radius:10px;\n" +
            "  box-shadow:var(--hjp-shadow);z-index:1000000;overflow:hidden;resize:both;min-width:360px;min-height:260px;max-width:1000px;max-height:92vh}\n" +
            "#hjp-panel header{display:flex;align-items:center;gap:6px;padding:7px 9px;background:var(--hjp-bg-soft);cursor:move;border-bottom:1px solid var(--hjp-border-soft)}\n" +
            "#hjp-panel header h3{margin:0;font-size:13px;flex:1;letter-spacing:.2px}\n" +
            "#hjp-panel .hjp-iconbtn{background:transparent;border:1px solid transparent;color:var(--hjp-fg-dim);cursor:pointer;border-radius:6px;padding:3px 7px;font-size:13px;line-height:1;transition:all .12s}\n" +
            "#hjp-panel .hjp-iconbtn:hover{background:var(--hjp-bg-strong);border-color:var(--hjp-border);color:var(--hjp-fg)}\n" +
            "#hjp-panel .hjp-iconbtn.activo{background:var(--hjp-accent);color:#fff;border-color:var(--hjp-accent-2)}\n" +
            "#hjp-panel .tabs{display:flex;background:var(--hjp-bg-soft);padding:0 4px;border-bottom:1px solid var(--hjp-border-soft)}\n" +
            "#hjp-panel .tab{flex:1;background:transparent;border:none;color:var(--hjp-fg-dim);padding:8px 4px;cursor:pointer;font:600 11.5px/1 system-ui;border-bottom:2px solid transparent;letter-spacing:.3px;transition:color .12s}\n" +
            "#hjp-panel .tab:hover{color:var(--hjp-fg)}\n" +
            "#hjp-panel .tab.activo{color:var(--hjp-fg);border-bottom-color:var(--hjp-accent-2)}\n" +
            "#hjp-panel .tab .contador{font-size:10px;background:var(--hjp-bg-strong);color:var(--hjp-fg-dim);padding:1px 5px;border-radius:8px;margin-left:4px;display:inline-block}\n" +
            "#hjp-panel .tab.activo .contador{background:var(--hjp-accent);color:#fff}\n" +
            "#hjp-panel .tools{display:flex;gap:6px;padding:6px 9px;border-bottom:1px solid var(--hjp-border-soft);flex-wrap:wrap;align-items:center;background:var(--hjp-bg-soft)}\n" +
            "#hjp-panel .tools button{background:var(--hjp-bg-strong);color:var(--hjp-fg);border:1px solid transparent;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;transition:all .12s}\n" +
            "#hjp-panel .tools button:hover{background:var(--hjp-border);border-color:var(--hjp-fg-mute)}\n" +
            "#hjp-panel .tools button.activo{background:var(--hjp-accent);color:#fff;border-color:var(--hjp-accent-2)}\n" +
            "#hjp-panel input.filtro{flex:1;min-width:90px;background:var(--hjp-bg);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:6px;padding:4px 7px;font-size:12px}\n" +
            "#hjp-panel input.filtro:focus{outline:none;border-color:var(--hjp-accent-2)}\n" +
            "#hjp-panel .severidad-pick{display:flex;gap:3px;align-items:center;padding:6px 9px;background:var(--hjp-bg-soft);border-bottom:1px solid var(--hjp-border-soft)}\n" +
            "#hjp-panel .severidad-pick span{cursor:pointer;padding:2px 6px;border-radius:5px;font:600 11px system-ui;border:1px solid var(--hjp-border);color:var(--hjp-fg-dim)}\n" +
            "#hjp-panel .severidad-pick span.activo{border-color:var(--hjp-accent-2);color:var(--hjp-fg)}\n" +
            "#hjp-panel .tabla{overflow:auto;flex:1}\n" +
            "#hjp-panel table{width:100%;border-collapse:collapse}\n" +
            "#hjp-panel th{position:sticky;top:0;background:var(--hjp-bg-soft);text-align:left;padding:6px 9px;font-size:11px;color:var(--hjp-fg-dim);border-bottom:1px solid var(--hjp-border-soft);z-index:1;letter-spacing:.3px;text-transform:uppercase}\n" +
            "#hjp-panel td{padding:5px 9px;border-top:1px solid var(--hjp-border-soft);white-space:nowrap;font-size:12px}\n" +
            "#hjp-panel tr.fila{cursor:pointer;transition:background .1s}\n" +
            "#hjp-panel tr.fila:hover{background:var(--hjp-bg-soft)}\n" +
            "@keyframes hjpPulse{0%{background:var(--hjp-warn-bg)}to{background:transparent}}\n" +
            "#hjp-panel tr.off td.eco{color:var(--hjp-bad-fg);font-weight:bold}\n" +
            "#hjp-panel tr.det td.eco{color:var(--hjp-warn-fg)}\n" +
            "#hjp-panel tr.on td.eco{color:var(--hjp-ok-fg)}\n" +
            "#hjp-panel .estadoicon{display:inline-block;width:18px;text-align:center;font-size:13px}\n" +
            "#hjp-panel .estadoicon.off{color:var(--hjp-bad-fg)}\n" +
            "#hjp-panel .estadoicon.det{color:var(--hjp-warn-fg)}\n" +
            "#hjp-panel .estadoicon.on{color:var(--hjp-ok-fg)}\n" +
            "#hjp-panel .mini{background:var(--hjp-bg-strong);border:none;color:var(--hjp-fg-dim);border-radius:5px;cursor:pointer;padding:2px 7px;font-size:11px;transition:all .12s}\n" +
            "#hjp-panel .mini:hover{background:var(--hjp-border);color:var(--hjp-fg)}\n" +
            "#hjp-panel .minusil.on{background:var(--hjp-warn-bg);color:var(--hjp-warn-fg)}\n" +
            "#hjp-panel .alerta{display:flex;gap:9px;padding:8px 10px;border-bottom:1px solid var(--hjp-border-soft);align-items:flex-start;transition:background .1s}\n" +
            "#hjp-panel .alerta:hover{background:var(--hjp-bg-soft)}\n" +
            "#hjp-panel .alerta .ico{font-size:16px;line-height:1.15;width:18px;text-align:center}\n" +
            "#hjp-panel .alerta .cuerpo{flex:1;min-width:0;display:flex;flex-direction:column}\n" +
            "#hjp-panel .alerta b{font-size:12px;letter-spacing:.2px}\n" +
            "#hjp-panel .alerta span{color:var(--hjp-fg-dim);font-size:11.5px;margin-top:2px}\n" +
            "#hjp-panel .alerta .hora{color:var(--hjp-fg-mute);font-size:10px}\n" +
            "#hjp-panel .alerta .meta{display:flex;gap:6px;font-size:10px;color:var(--hjp-fg-mute);margin-top:3px;flex-wrap:wrap}\n" +
            "#hjp-panel .alerta .meta .regla{background:var(--hjp-bg-strong);padding:1px 5px;border-radius:4px}\n" +
            "#hjp-dash{display:flex;flex-direction:column;padding:14px;gap:12px;overflow:auto;flex:1;max-width:1200px;margin:0 auto;box-sizing:border-box}\n" +
            "#hjp-dash .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}\n" +
            "#hjp-panel .tabla{padding:8px 4px}\n" +
            "#hjp-panel .tabla table{width:auto;max-width:100%;min-width:100%;margin:0 auto;border-collapse:collapse}\n" +
            "#hjp-panel .kpi{background:var(--hjp-bg-soft);border:1px solid var(--hjp-border-soft);border-radius:8px;padding:9px 11px;display:flex;flex-direction:column;gap:3px}\n" +
            "#hjp-panel .kpi .etq{font-size:10px;color:var(--hjp-fg-dim);text-transform:uppercase;letter-spacing:.5px}\n" +
            "#hjp-panel .kpi .valor{font:600 18px/1 system-ui;color:var(--hjp-fg)}\n" +
            "#hjp-panel .kpi.ok .valor{color:var(--hjp-ok-fg)}\n" +
            "#hjp-panel .kpi.warn .valor{color:var(--hjp-warn-fg)}\n" +
            "#hjp-panel .kpi.bad .valor{color:var(--hjp-bad-fg)}\n" +
            "#hjp-panel .kpi.sub .valor{color:var(--hjp-fg)}\n" +
            "#hjp-panel .kpi .resumen{font-size:11px;color:var(--hjp-fg-dim)}\n" +
            "#hjp-dash .sparkline{display:block;width:100%;height:44px;background:var(--hjp-bg-soft);border:1px solid var(--hjp-border-soft);border-radius:7px;padding:6px}\n" +
            "#hjp-dash .sparkline path{fill:none;stroke-width:1.6}\n" +
            "#hjp-dash .recent{padding:9px;background:var(--hjp-bg-soft);border:1px solid var(--hjp-border-soft);border-radius:8px}\n" +
            "#hjp-dash .recent h4{margin:0 0 6px;font-size:11px;color:var(--hjp-fg-dim);text-transform:uppercase;letter-spacing:.5px}\n" +
            "#hjp-dash .recent .alerta{padding:5px 0;border-bottom-color:var(--hjp-border-soft)}\n" +
            "#hjp-panel table.zone td{padding:5px 9px}\n" +
            "#hjp-panel table.zone tr.fila td:first-child{color:var(--hjp-accent-2);font-weight:600}\n" +
            "#hjp-panel .zone .contador-unidades{color:var(--hjp-ok-fg);font-weight:600}\n" +
            "#hjp-modal,#hjp-config,#hjp-contexto{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--hjp-bg-soft);padding:14px;\n" +
            "  border-radius:10px;box-shadow:var(--hjp-shadow);z-index:1000001;display:none;flex-direction:column;gap:10px;\n" +
            "  width:340px;color:var(--hjp-fg);font:13px system-ui;border:1px solid var(--hjp-border)}\n" +
            "#hjp-modal{width:520px;max-height:88vh;overflow:hidden;padding:0}\n" +
            "#hjp-modal > h3{padding:12px 14px 6px}\n" +
            "#hjp-modal > p{padding:0 14px 8px}\n" +
            "#hjp-modal > textarea{margin:0 14px 0;width:calc(100% - 28px);height:88px}\n" +
            "#hjp-modal .hjp-modal-actions{display:flex;gap:6px;padding:6px 14px 0}\n" +
            "#hjp-modal .hjp-modal-actions button{background:var(--hjp-bg);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:6px;padding:4px 10px;cursor:pointer;font:11.5px system-ui}\n" +
            "#hjp-modal .hjp-modal-actions button:hover{background:var(--hjp-bg-strong);border-color:var(--hjp-fg-mute)}\n" +
            "#hjp-modal-lista-wrap{margin:8px 14px 0;border:1px solid var(--hjp-border);border-radius:7px;max-height:200px;overflow:auto}\n" +
            "#hjp-modal-lista .lista-row{display:flex;gap:6px;align-items:center;padding:5px 8px;border-bottom:1px solid var(--hjp-border-soft)}\n" +
            "#hjp-modal-lista .lista-row:last-child{border-bottom:none}\n" +
            "#hjp-modal-lista .lista-row .eco{font:600 12px monospace;color:var(--hjp-accent-2);min-width:64px}\n" +
            "#hjp-modal-lista .lista-row .hjp-dest{flex:1;background:var(--hjp-bg);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:5px;padding:4px 7px;font-size:12px}\n" +
            "#hjp-modal-lista .lista-row .hjp-dest:focus{outline:none;border-color:var(--hjp-accent-2)}\n" +
            "#hjp-modal-lista .lista-row button{background:transparent;border:1px solid var(--hjp-border);color:var(--hjp-fg-dim);border-radius:5px;padding:2px 9px;cursor:pointer;font-size:11px}\n" +
            "#hjp-modal-lista .lista-row button:hover{color:var(--hjp-bad-fg);border-color:var(--hjp-bad-fg)}\n" +
            "#hjp-modal-lista .lista-empty{padding:14px;text-align:center;color:var(--hjp-fg-mute);font-size:12px}\n" +
            "#hjp-modal .hjp-modal-add{display:flex;gap:6px;padding:8px 14px 0}\n" +
            "#hjp-modal .hjp-modal-add input{background:var(--hjp-bg);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:5px;padding:5px 7px;font-size:12px;flex:1;min-width:60px}\n" +
            "#hjp-modal .hjp-modal-add input:focus{outline:none;border-color:var(--hjp-accent-2)}\n" +
            "#hjp-modal > .hjp-acciones{margin-top:10px;padding:10px 14px;border-top:1px solid var(--hjp-border-soft)}\n" +
            "#hjp-modal p code{background:var(--hjp-bg);padding:1px 4px;border-radius:3px;color:var(--hjp-accent-2)}\n" +
            "#hjp-config{width:560px;max-height:88vh;overflow:hidden;padding:0}\n" +
            "#hjp-config .cfg-head{display:flex;align-items:center;gap:6px;padding:10px 12px;background:var(--hjp-bg);border-bottom:1px solid var(--hjp-border-soft);border-radius:10px 10px 0 0}\n" +
            "#hjp-config .cfg-head h3{margin:0;flex:1;font-size:13px}\n" +
            "#hjp-config .cfg-tabs{display:flex;background:var(--hjp-bg);padding:0 10px;border-bottom:1px solid var(--hjp-border-soft);gap:6px;flex-wrap:wrap}\n" +
            "#hjp-config .cfg-tab{background:transparent;border:none;color:var(--hjp-fg-dim);padding:9px 12px;cursor:pointer;font:600 11.5px system-ui;border-bottom:2px solid transparent;letter-spacing:.4px;text-transform:uppercase}\n" +
            "#hjp-config .cfg-tab.activo{color:var(--hjp-fg);border-bottom-color:var(--hjp-accent-2)}\n" +
            "#hjp-config .cfg-body{overflow:auto;padding:12px;max-height:calc(88vh - 110px)}\n" +
            "#hjp-config .cfg-body h4{margin:8px 0 6px;font-size:11px;color:var(--hjp-accent-2);text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid var(--hjp-border-soft);padding-bottom:4px}\n" +
            "#hjp-config .cfg-body h4:first-child{margin-top:0}\n" +
            "#hjp-config label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0}\n" +
            "#hjp-config label.full{display:block}\n" +
            "#hjp-config input[type=number],#hjp-config input[type=text],#hjp-config input[type=time],\n" +
            "#hjp-config input[type=color],#hjp-config textarea,#hjp-config select{background:var(--hjp-bg);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:5px;padding:4px 7px;font:12px system-ui}\n" +
            "#hjp-config input[type=number],#hjp-config input[type=text],#hjp-config input[type=time]{width:90px}\n" +
            "#hjp-config input[type=color]{width:55px;padding:0;height:30px}\n" +
            "#hjp-config textarea{width:100%;height:90px;font:11.5px monospace;resize:vertical;box-sizing:border-box}\n" +
            "#hjp-config .cfg-foot{display:flex;justify-content:space-between;gap:8px;padding:9px 12px;background:var(--hjp-bg);border-top:1px solid var(--hjp-border-soft);border-radius:0 0 10px 10px}\n" +
            "#hjp-config .row-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px}\n" +
            "#hjp-config .row-grid label{padding:1px 0}\n" +
            "#hjp-config button.accbtn{background:var(--hjp-accent);color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:bold;font:12px system-ui}\n" +
            "#hjp-config button.cancel{background:#555;color:#fff}\n" +
            "#hjp-modal textarea{width:100%;height:160px;resize:none;padding:10px;border-radius:6px;border:1px solid var(--hjp-border);background:var(--hjp-bg);color:var(--hjp-fg);box-sizing:border-box;font:12px monospace}\n" +
            "#hjp-modal h3{margin:0;text-align:center;font-size:13px;color:var(--hjp-fg)}\n" +
            "#hjp-modal button.accbtn{background:var(--hjp-accent);color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-weight:bold;font:12px system-ui}\n" +
            "#hjp-modal button.cancel{background:#555;color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-weight:bold;font:12px system-ui}\n" +
            "#hjp-contexto{padding:4px;gap:0;width:auto;min-width:170px}\n" +
            "#hjp-contexto .op{padding:7px 12px;cursor:pointer;font-size:12.5px;border-bottom:1px solid var(--hjp-border-soft)}\n" +
            "#hjp-contexto .op:last-child{border-bottom:none}\n" +
            "#hjp-contexto .op:hover{background:var(--hjp-bg-strong)}\n" +
            "#hjp-contexto .sep{height:1px;background:var(--hjp-border-soft);margin:2px 0}\n" +
            ".hjp-acciones{display:flex;justify-content:space-between;gap:8px}\n" +
            "#hjp-aviso{position:fixed;top:5px;left:50%;transform:translateX(-50%);background:var(--hjp-bad);color:#fff;padding:6px 16px;\n" +
            "  border-radius:5px;z-index:1000002;font:12px system-ui;display:none;box-shadow:var(--hjp-shadow)}\n" +
            "#hjp-barra .hjp-badge-estado{display:inline-block;width:11px;height:11px;border-radius:50%;background:#7d8595;flex-shrink:0;border:1px solid rgba(255,255,255,.15)}\n" +
            "#hjp-barra .hjp-badge-estado.ok{background:var(--hjp-ok)}\n" +
            "#hjp-barra .hjp-badge-estado.warn{background:var(--hjp-warn)}\n" +
            "#hjp-barra .hjp-badge-estado.bad{background:var(--hjp-bad)}\n" +
            "#hjp-barra .hjp-badge-estado.nm{background:#7d8595;outline:2px dashed var(--hjp-warn)}\n" +
            "#hjp-panel.density-compact .kpi{padding:6px 9px}\n" +
            "#hjp-panel.density-compact .kpi .valor{font-size:16px}\n" +
            "#hjp-panel.density-compact td,#hjp-panel.density-compact th{padding:3px 9px;font-size:11.5px}\n" +
            "#hjp-panel .hjp-iconbtn:focus-visible,#hjp-panel .tab:focus-visible,#hjp-panel .tools button:focus-visible{outline:2px solid var(--hjp-accent-2);outline-offset:1px}\n" +
            "#hjp-panel table .col-sel{width:28px;text-align:center;padding:4px 6px}\n" +
            "#hjp-panel table .hjp-sel{accent-color:var(--hjp-accent);cursor:pointer;width:14px;height:14px}\n" +
            "#hjp-panel tr.sel-row td{background:var(--hjp-ok-bg)}\n" +
            "#hjp-panel tr.sel-row:hover td{background:linear-gradient(0deg,var(--hjp-ok-bg),var(--hjp-bg-soft))}\n" +
            "#hjp-panel table th:first-child{padding-left:10px}\n";

        const style = makeEl('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ====================== UI BUILD ====================== */
    let mainBtn, panelBtn, closeBtn, foldBtn, gripEl, barraEl,
        panelEl, modalEl, cfgWinEl, ctxEl, toastsEl, avisoEl;

    function checkRow(id, txt) {
        return '<label>' + txt + ' <input type="checkbox" id="' + id + '"></label>';
    }
    function numRow(id, txt) {
        return '<label>' + txt + ' <input type="number" id="' + id + '"></label>';
    }
    function textRow(id, txt, ph) {
        return '<label class="full">' + txt + '<textarea id="' + id + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></textarea></label>';
    }
    function buildUI() {
        mainBtn = makeEl('button', { innerText: ICO.automatizar + ' Automatizar Unidades', id: 'hjp-btn-main', className: 'hjp-btn', title: 'Abrir ventanas de unidades' });
        panelBtn = makeEl('button', { innerText: ICO.panel + ' Panel API', id: 'hjp-btn-panel', className: 'hjp-btn', title: 'Mostrar/ocultar panel' });
        closeBtn = makeEl('button', { innerText: ICO.cerrar + ' Cerrar Todas', id: 'hjp-btn-close', className: 'hjp-btn', title: 'Cerrar todas las ventanas de unidades' });
        foldBtn = makeEl('button', { innerText: '▾', id: 'hjp-btn-fold', className: 'hjp-btn hjp-fold', title: 'Plegar barra' });
        gripEl = makeEl('span', { innerText: '⠿', id: 'hjp-grip', className: 'hjp-grip', title: 'Arrastrar barra · doble clic para orientar' });
        barraEl = makeEl('div', { id: 'hjp-barra' });
        barraEl.append(gripEl, mainBtn, panelBtn, closeBtn, foldBtn);
        if (APP.barra.vertical) barraEl.classList.add('vertical');

        panelEl = makeEl('div', { id: 'hjp-panel' });
        panelEl.innerHTML = (
            '<header id="hjp-drag">' +
            '<span id="hjp-estado-barra" class="hjp-badge-estado"></span>' +
            '<h3>' + esc(LANG.titlePanel) + '</h3>' +
            '<button class="hjp-iconbtn" id="hjp-tema" title="Tema">' + ICO.luna + '</button>' +
            '<button class="hjp-iconbtn" id="hjp-nmolestar" title="No molestar">' + ICO.silencioTotal + '</button>' +
            '<button class="hjp-iconbtn" id="hjp-test" title="Probar avisos">' + ICO.senal + '</button>' +
            '<button class="hjp-iconbtn" id="hjp-exportar-todo" title="Exportar configuración">' + ICO.exportar + '</button>' +
            '<button class="hjp-iconbtn" id="hjp-importar-todo" title="Importar configuración">' + ICO.importar + '</button>' +
            '<button class="hjp-iconbtn" id="hjp-cerrar-panel" title="Cerrar panel">✕</button>' +
            '</header>' +
            '<div class="tabs" id="hjp-tabs">' +
            '<button class="tab activo" data-tab="dash">' + ICO.dashboard + '<span class="contador" id="hjp-c-on">0</span></button>' +
            '<button class="tab" data-tab="unidades">' + ICO.panel + '<span class="contador" id="hjp-c-tot">0</span></button>' +
            '<button class="tab" data-tab="alertas">' + ICO.alertas + '<span class="contador" id="hjp-c-al">0</span></button>' +
            '<button class="tab" data-tab="geocercas">' + ICO.geocercas + '<span class="contador" id="hjp-c-zn">0</span></button>' +
            '</div>' +
            '<div class="tools" id="hjp-tools">' +
            '<input class="filtro" id="hjp-filtro" placeholder="' + esc(LANG.busq) + '">' +
            '<button id="hjp-refresh" title="Refrescar">' + ICO.refrescar + '</button>' +
            '<button id="hjp-cfg-btn" title="Ajustes">' + ICO.ajustes + '</button>' +
            '<button id="hjp-csv" title="Exportar unidades">' + ICO.descargar + ' CSV</button>' +
            '<button id="hjp-csv-al" title="Exportar bitacora">' + ICO.descargar + ' Bitacora</button>' +
            '<button id="hjp-verif" title="Solo ventanas seleccionadas">▣ Solo seleccion</button>' +
            '<button id="hjp-captura" title="Capturar ventanas">⊞ Capturar</button>' +
            '<button id="hjp-verifica" title="Verificar ahora">⊘ Aplicar</button>' +
            '<button id="hjp-sel-all" title="Seleccionar todas las unidades visibles">☑ Sel. visibles</button>' +
            '<button id="hjp-sel-clear" title="Quitar toda la selección">⌫ Quitar selección</button>' +
            '</div>' +
            '<div class="tabla" id="hjp-wrap-dash">' +
            '<div id="hjp-dash">' +
            '<div class="kpi-grid">' +
            '<div class="kpi ok"><span class="etq">En linea</span><span class="valor" id="hjp-kpi-on">0</span><span class="resumen" id="hjp-kpi-on-pct">—</span></div>' +
            '<div class="kpi bad"><span class="etq">Sin senal</span><span class="valor" id="hjp-kpi-off">0</span><span class="resumen" id="hjp-kpi-off-pct">—</span></div>' +
            '<div class="kpi warn"><span class="etq">Detenidas</span><span class="valor" id="hjp-kpi-det">0</span><span class="resumen">VEL <= 3 km/h</span></div>' +
            '<div class="kpi sub"><span class="etq">En movimiento</span><span class="valor" id="hjp-kpi-mov">0</span><span class="resumen" id="hjp-kpi-vel">— km/h prom.</span></div>' +
            '<div class="kpi sub"><span class="etq">En zonas</span><span class="valor" id="hjp-kpi-zonas">0</span><span class="resumen">de 0 geocercas</span></div>' +
            '<div class="kpi"><span class="etq">Alertas hoy</span><span class="valor" id="hjp-kpi-aho">0</span><span class="resumen" id="hjp-kpi-criticos">0 criticas</span></div>' +
            '</div>' +
            '<div><svg class="sparkline" id="hjp-spark" viewBox="0 0 200 36" preserveAspectRatio="none"></svg></div>' +
            '<div class="recent"><h4>Avisos recientes</h4><div id="hjp-kpi-recientes"></div></div>' +
            '</div>' +
            '</div>' +
            '<div class="tabla" id="hjp-wrap-unidades" style="display:none">' +
            '<table><thead><tr><th title="Seleccionar">Sel</th><th></th><th>Eco</th><th>Placa</th><th>Estado</th><th>Ultimo</th><th>km/h</th><th>Zona</th><th></th></tr></thead>' +
            '<tbody id="hjp-body"></tbody></table>' +
            '<div id="hjp-sel-vacio" style="display:none;padding:18px;text-align:center;color:var(--hjp-fg-dim);font-size:12px">No has seleccionado ninguna unidad. Activa <b>Monitorear todas</b> en Configuración o marca los vehículos que quieres monitorear con la casilla de esta columna.</div>' +
            '</div>' +
            '<div class="tabla" id="hjp-wrap-alertas" style="display:none">' +
            '<div class="severidad-pick" id="hjp-filtroseveridad">' +
            '<span data-sev="todas" class="activo">Todas</span>' +
            '<span data-sev="critico">Criticas</span>' +
            '<span data-sev="alto">Altas</span>' +
            '<span data-sev="medio">Medias</span>' +
            '<span data-sev="bajo">Bajas</span>' +
            '</div>' +
            '<div id="hjp-lista-alertas"></div>' +
            '</div>' +
            '<div class="tabla" id="hjp-wrap-geocercas" style="display:none">' +
            '<table class="zone"><thead><tr><th>Geocerca</th><th>Dentro</th></tr></thead>' +
            '<tbody id="hjp-body-zonas"></tbody></table>' +
            '</div>' +
            '<footer><span id="hjp-info">iniciando...</span><span id="hjp-upd"></span></footer>'
        );
        panelEl.style.width = (APP.panelSize && APP.panelSize.w) ? APP.panelSize.w + 'px' : '470px';
        panelEl.style.height = (APP.panelSize && APP.panelSize.h) ? APP.panelSize.h + 'px' : '440px';

        modalEl = makeEl('div', { id: 'hjp-modal' });
        modalEl.innerHTML = (
            '<h3>Lista de unidades</h3>' +
            '<p style="font-size:11.5px;color:var(--hjp-fg-dim);margin:-4px 0 8px">Una sola lista para abrir ventanas, registrar destinos y filtrar las alertas. Pega <code>eco</code> o <code>eco=destino</code> por línea.</p>' +
            '<textarea id="hjp-txt" placeholder="eco por línea, o eco=destino&#10;4381&#10;4132=Monterrey"></textarea>' +
            '<div class="hjp-modal-actions">' +
            '<button class="mini" id="hjp-modal-parse">⇭ Pegar a la lista</button>' +
            '<button class="mini" id="hjp-modal-clear-txt">⌫ Limpiar área</button>' +
            '</div>' +
            '<div id="hjp-modal-lista-wrap">' +
                '<div id="hjp-modal-lista"></div>' +
            '</div>' +
            '<div class="hjp-modal-add">' +
                '<input type="text" id="hjp-modal-new-eco" placeholder="eco (ej. 4381)">' +
                '<input type="text" id="hjp-modal-new-dest" placeholder="destino (opcional)">' +
                '<button class="accbtn" id="hjp-modal-add">+ Añadir</button>' +
            '</div>' +
            '<div class="hjp-acciones">' +
            '<button class="cancel" id="hjp-cancelar">Cancelar</button>' +
            '<button class="mini" id="hjp-modal-vaciar" style="background:#b71c1c;color:#fff">⌫ Vaciar lista</button>' +
            '<button class="accbtn" id="hjp-ejecutar">▶ Ejecutar (abrir ventanas)</button>' +
            '</div>'
        );

        cfgWinEl = makeEl('div', { id: 'hjp-config' });
        cfgWinEl.innerHTML = (
            '<div class="cfg-head"><h3>' + ICO.ajustes + ' Configuracion</h3>' +
            '<button class="hjp-iconbtn" id="hjp-cfg-cerrar-x" title="Cerrar">✕</button></div>' +
            '<div class="cfg-tabs" id="hjp-cfg-tabs">' +
            '<button class="cfg-tab activo" data-cfg="general">General</button>' +
            '<button class="cfg-tab" data-cfg="reglas">Reglas</button>' +
            '<button class="cfg-tab" data-cfg="avisos">Avisos</button>' +
            '<button class="cfg-tab" data-cfg="visual">Visual</button>' +
            '<button class="cfg-tab" data-cfg="ventanas">Ventanas</button>' +
            '<button class="cfg-tab" data-cfg="avanzado">Avanzado</button>' +
            '</div>' +
            '<div class="cfg-body" id="hjp-cfg-body">' +
            '<div class="cfg-pane" data-cfg="general">' +
            '<h4>General</h4>' +
            numRow('c-poll', 'Refresco (ms)') +
            numRow('c-off', 'Sin senal > (min)') +
            numRow('c-cd', 'Cooldown alerta (min)') +
            checkRow('c-watchAll', 'Monitorear todas las unidades (ignora selección)') +
            checkRow('c-auto', 'Abrir al caer (critico)') +
            checkRow('c-zonas', 'Cargar geocercas') +
            checkRow('c-geo', 'Geocodificacion inversa') +
            checkRow('c-hist', 'Consultar historico de detencion') +
            '</div>' +
            '<div class="cfg-pane" data-cfg="reglas" style="display:none">' +
            '<h4>Umbrales</h4>' +
            numRow('c-gps', 'GPS perdido > (min)') +
            numRow('c-stop', 'Detenido > (min)') +
            numRow('c-zona', 'Zona no prevista > (min)') +
            numRow('c-desco', 'Desconexion > (min)') +
            numRow('c-vel', 'Velocidad maxima (km/h)') +
            '<h4>Reglas activas</h4>' +
            '<div class="row-grid">' +
            checkRow('c-r-off', 'Sin senal') +
            checkRow('c-r-gps', 'GPS en marcha') +
            checkRow('c-r-det', 'Detenido') +
            checkRow('c-r-zona', 'Zona') +
            checkRow('c-r-geo', 'Geocercas') +
            checkRow('c-r-des', 'Destino') +
            checkRow('c-r-dis', 'Desconexion') +
            checkRow('c-r-vel', 'Velocidad') +
            '</div>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="avisos" style="display:none">' +
            '<h4>Avisos</h4>' +
            checkRow('c-voz', 'Voz (es-MX)') +
            checkRow('c-beep', 'Pitido en alertas graves') +
            checkRow('c-desktop', 'Notificacion del navegador') +
            numRow('c-toastSeg', 'Duracion de toasts (s)') +
            '<label>Severidad minima en toasts' +
            '<select id="c-sevmin">' +
            '<option value="bajo">Bajo y arriba</option>' +
            '<option value="medio">Medio y arriba</option>' +
            '<option value="alto">Alto y arriba</option>' +
            '<option value="critico">Solo criticas</option>' +
            '</select>' +
            '</label>' +
            '<h4>Horario y vigilancia</h4>' +
            '<label>Horario activo <input type="checkbox" id="c-hor-on"></label>' +
            '<label>Desde <input type="time" id="c-hor-a"></label>' +
            '<label>Hasta <input type="time" id="c-hor-b"></label>' +
            '<div class="hjp-acciones" style="margin-top:8px">' +
                '<button class="accbtn" id="c-lista-editar" style="flex:1">⎘ Editar lista de unidades</button>' +
            '</div>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="visual" style="display:none">' +
            '<h4>Apariencia</h4>' +
            '<label>Tema <select id="c-tema">' +
            '<option value="oscuro">Oscuro</option>' +
            '<option value="claro">Claro</option>' +
            '<option value="auto">Automatico</option>' +
            '</select></label>' +
            '<label>Densidad <select id="c-dens">' +
            '<option value="normal">Normal</option>' +
            '<option value="compact">Compacta</option>' +
            '</select></label>' +
            '<label>Color de acento <input type="color" id="c-acento"></label>' +
            checkRow('c-coords', 'Mostrar lat/lon en unidades') +
            '<h4>Informacion</h4>' +
            '<span style="font-size:11.5px;color:var(--hjp-fg-dim)">Atajos: <b>Alt+1..4</b> cambia pestanas · <b>Alt+P</b> panel · <b>Alt+H</b> pliega barra · <b>Esc</b> cierra modales</span>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="ventanas" style="display:none">' +
            '<h4>Barra de botones</h4>' +
            '<div class="row-grid">' +
            checkRow('c-b-main', 'Automatizar') +
            checkRow('c-b-panel', 'Panel') +
            checkRow('c-b-close', 'Cerrar') +
            '</div>' +
            checkRow('c-b-plegada', 'Barra plegada') +
            checkRow('c-b-vertical', 'Orientacion vertical') +
            '<div style="margin-top:6px"><button class="accbtn" id="hjp-b-reset" style="width:100%">' + ICO.expandir + ' Recentrar barra</button></div>' +
            '<h4>Verificacion</h4>' +
            checkRow('c-verif', 'Verificacion automatica') +
            numRow('c-verif-seg', 'Revisar cada (seg)') +
            '<h4>Tamano del panel</h4>' +
            '<button class="accbtn" id="hjp-reset-panel" style="width:100%">' + ICO.colapsar + ' Restablecer tamano</button>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="avanzado" style="display:none">' +
            '<h4>Reseteo</h4>' +
            '<div class="hjp-acciones">' +
            '<button class="accbtn" id="hjp-borrar-memo" style="background:#b71c1c">' + ICO.limpiar + ' Borrar estado</button>' +
            '<button class="accbtn" id="hjp-borrar-todo" style="background:#5d0007">Borrar TODO</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="cfg-foot">' +
            '<button class="cancel" id="hjp-cfg-cerrar">Cerrar</button>' +
            '<button class="accbtn" id="hjp-cfg-guardar">Guardar</button>' +
            '</div>'
        );

        ctxEl = makeEl('div', { id: 'hjp-contexto' });
        toastsEl = makeEl('div', { id: 'hjp-toasts' });
        avisoEl = makeEl('div', { id: 'hjp-aviso' });

        document.body.appendChild(barraEl);
        document.body.appendChild(panelEl);
        document.body.appendChild(modalEl);
        document.body.appendChild(cfgWinEl);
        document.body.appendChild(ctxEl);
        document.body.appendChild(toastsEl);
        document.body.appendChild(avisoEl);
    }
/* ====================== PLACE / DRAG ====================== */
    function placeBar() {
        const r = barraEl.getBoundingClientRect();
        const maxX = Math.max(0, window.innerWidth - r.width - 4);
        const maxY = Math.max(0, window.innerHeight - r.height - 4);
        APP.barra.x = clamp(APP.barra.x || 0, 0, maxX);
        APP.barra.y = clamp(APP.barra.y || 0, 0, maxY);
        barraEl.style.left = APP.barra.x + 'px';
        barraEl.style.top = APP.barra.y + 'px';
        barraEl.style.right = 'auto';
    }
    function applyBar() {
        const b = APP.barra.botones;
        mainBtn.style.display = b.main ? '' : 'none';
        panelBtn.style.display = b.panel ? '' : 'none';
        closeBtn.style.display = b.close ? '' : 'none';
        barraEl.classList.toggle('plegada', !!APP.barra.plegada);
        barraEl.classList.toggle('vertical', !!APP.barra.vertical);
        foldBtn.innerText = APP.barra.plegada ? '▸' : '▾';
        if (APP.barra.x == null || APP.barra.y == null) {
            APP.barra.x = Math.max(4, window.innerWidth - barraEl.offsetWidth - 15);
            APP.barra.y = 80;
        }
        placeBar();
        writeJSON(LS.barra, APP.barra);
    }
    function placePanel() {
        if (!APP.panelPos) return;
        panelEl.style.left = APP.panelPos.x + 'px';
        panelEl.style.top = APP.panelPos.y + 'px';
        panelEl.style.bottom = 'auto';
    }
    function attachDraggables() {
        (function dragBar() {
            let activo = false, dx = 0, dy = 0;
            barraEl.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('button') && !e.target.closest('.hjp-grip')) return;
                activo = true;
                const r = barraEl.getBoundingClientRect();
                dx = e.clientX - r.left; dy = e.clientY - r.top;
                try { barraEl.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
                e.preventDefault();
            });
            barraEl.addEventListener('pointermove', (e) => {
                if (!activo) return;
                const r = barraEl.getBoundingClientRect();
                const maxX = Math.max(0, window.innerWidth - r.width - 4);
                const maxY = Math.max(0, window.innerHeight - r.height - 4);
                APP.barra.x = clamp(e.clientX - dx, 0, maxX);
                APP.barra.y = clamp(e.clientY - dy, 0, maxY);
                barraEl.style.left = APP.barra.x + 'px';
                barraEl.style.top = APP.barra.y + 'px';
                barraEl.style.right = 'auto';
            });
            const end = () => { if (activo) { activo = false; writeJSON(LS.barra, APP.barra); } };
            barraEl.addEventListener('pointerup', end);
            barraEl.addEventListener('pointercancel', end);
        })();

        (function dragPanel() {
            const head = byId('hjp-drag');
            let activo = false, dx = 0, dy = 0;
            head.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('.hjp-iconbtn')) return;
                activo = true;
                const r = panelEl.getBoundingClientRect();
                dx = e.clientX - r.left; dy = e.clientY - r.top;
                try { head.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
                e.preventDefault();
            });
            head.addEventListener('pointermove', (e) => {
                if (!activo) return;
                panelEl.style.left = (e.clientX - dx) + 'px';
                panelEl.style.top = (e.clientY - dy) + 'px';
                panelEl.style.bottom = 'auto';
            });
            const end = () => { if (activo) { activo = false; savePanelPos(); } };
            head.addEventListener('pointerup', end);
            head.addEventListener('pointercancel', end);
        })();

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => {
                const w = panelEl.offsetWidth;
                const h = panelEl.offsetHeight;
                APP.panelSize = { w: w, h: h };
                writeJSON(LS.panelsize, APP.panelSize);
            });
            ro.observe(panelEl);
        }

        window.addEventListener('resize', () => {
            placeBar();
            placePanel();
            const r = panelEl.getBoundingClientRect();
            APP.panelSize = { w: r.width, h: r.height };
            writeJSON(LS.panelsize, APP.panelSize);
        });
    }
    function savePanelPos() {
        if (!panelEl) return;
        const r = panelEl.getBoundingClientRect();
        APP.panelPos = { x: r.left, y: r.top };
        writeJSON(LS.panelpos, APP.panelPos);
    }

    /* ====================== PAINT ====================== */
    function setTab(name) {
        APP.tab = name;
        const ids = ['dash', 'unidades', 'alertas', 'geocercas'];
        ids.forEach((n) => {
            const el = byId('hjp-wrap-' + n);
            if (el) el.style.display = (n === name) ? '' : 'none';
        });
        document.querySelectorAll('#hjp-tabs .tab').forEach((t) => {
            t.classList.toggle('activo', t.dataset.tab === name);
        });
        if (name === 'dash') paintKPI();
        else if (name === 'unidades') paintTabla();
        else if (name === 'alertas') paintAlertas();
        else if (name === 'geocercas') paintGeocercas();
        paintCounters();
        paintStateBadge();
    }
    function paintInfo() {
        const info = byId('hjp-info');
        if (!info) return;
        const n = APP.unidades.filter(shouldWatch).length;
        info.textContent = n + ' unidades · ' + (APP.config.watchAll ? 'monitor todas' : ('sel ' + APP.seleccion.size))
            + ' · ' + APP.historial.length + ' avisos';
    }
    function paintCounters() {
        const watched = APP.unidades.filter(shouldWatch);
        const on = watched.filter((u) => unitState(u).online).length;
        const cOn = byId('hjp-c-on');
        const cTot = byId('hjp-c-tot');
        const cAl = byId('hjp-c-al');
        const cZn = byId('hjp-c-zn');
        if (cOn) cOn.textContent = on;
        if (cTot) cTot.textContent = watched.length;
        if (cAl) cAl.textContent = APP.historial.length;
        if (cZn) cZn.textContent = APP.zonas.length;
    }
    function paintStateBadge() {
        const b = byId('hjp-estado-barra');
        if (!b) return;
        const watched = APP.unidades.filter(shouldWatch);
        const off = watched.filter((u) => !unitState(u).online).length;
        const det = watched.filter((u) => { const s = unitState(u); return s.online && s.estado === 'detenida'; }).length;
        const criticos = APP.historial.filter((a) => a.sev === 'critico' && (Date.now() - a.ts) < 30 * 60000).length;
        let cls = 'ok';
        if (nmActivo()) cls = 'nm';
        else if (criticos > 0) cls = 'bad';
        else if (off > 0 || det > watched.length / 3) cls = 'warn';
        b.className = 'hjp-badge-estado ' + cls;
        b.title = nmActivo()
            ? 'No molestar hasta ' + new Date(APP.noMolestar.hasta).toLocaleTimeString().slice(0, 5)
            : 'criticos: ' + criticos + ' · sin senal: ' + off + ' · detenidas: ' + det;
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
        kv('hjp-kpi-on', on);
        kv('hjp-kpi-off', off);
        kv('hjp-kpi-det', det);
        kv('hjp-kpi-mov', mov);
        kv('hjp-kpi-vel', Math.round(vel) + ' km/h prom.');
        kv('hjp-kpi-on-pct', total ? ((on / total) * 100).toFixed(0) + '%' : '-');
        kv('hjp-kpi-off-pct', total ? ((off / total) * 100).toFixed(0) + '%' : '-');
        kv('hjp-kpi-zonas', enZona.size);
        kv('hjp-kpi-aho', aho);
        kv('hjp-kpi-criticos', critAho + ' criticas');
        const resumenZ = document.querySelector('.kpi .valor#hjp-kpi-zonas + .resumen');
        if (resumenZ) resumenZ.textContent = 'de ' + APP.zonas.length + ' geocercas';

        const recientes = byId('hjp-kpi-recientes');
        if (recientes) {
            const items = APP.historial.slice(0, 6);
            recientes.innerHTML = items.length
                ? items.map((a) => (
                    '<div class="alerta" style="border-left:3px solid ' + (COL[a.sev] || '#555') + '">' +
                    '<span class="ico" style="color:' + (COL[a.sev] || '#777') + '">' + esc(a.icono) + '</span>' +
                    '<div class="cuerpo"><b>' + esc(a.titulo) + '</b>' +
                    (a.detalle ? '<span>' + esc(a.detalle) + '</span>' : '') + '</div>' +
                    '<span class="hora">' + new Date(a.ts).toLocaleTimeString().slice(0, 5) + '</span>' +
                    '</div>'
                )).join('')
                : '<div style="padding:8px;color:var(--hjp-fg-mute)">' + LANG.recientesNone + '</div>';
        }
        paintSparkline();
    }
    function paintSparkline() {
        const svg = byId('hjp-spark');
        if (!svg) return;
        const data = (APP.kpi.online || []).slice(-60);
        if (data.length < 2) {
            svg.innerHTML = '<text x="100" y="22" text-anchor="middle" fill="currentColor" font-size="11">Recolectando datos...</text>';
            return;
        }
        const max = Math.max.apply(null, data);
        const min = Math.min.apply(null, data);
        const h = 32, w = 200;
        const dx = w / (data.length - 1);
        const puntos = data.map((v, i) => {
            const x = i * dx;
            const y = h - ((v - min) / Math.max(1, max - min)) * h;
            return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
        });
        const area = puntos.join(' ') + ' L' + w + ',' + h + ' L0,' + h + ' Z';
        svg.innerHTML =
            '<path d="' + area + '" fill="var(--hjp-accent-2)" fill-opacity="0.18" stroke="none"></path>' +
            '<path d="' + puntos.join(' ') + '" stroke="var(--hjp-accent-2)"></path>' +
            '<text x="6" y="14" fill="var(--hjp-fg-dim)" font-size="10">ONLINE · ' + data.length + ' ciclos · max ' + max + '</text>';
    }
    function paintTabla() {
        const body = byId('hjp-body');
        if (!body) return;
        const lista = APP.unidades
            .filter(shouldWatch)
            .map((u) => ({ info: parseUnitName(u), st: unitState(u) }))
            .filter((x) => {
                if (!APP.filtro) return true;
                const f = APP.filtro.toLowerCase();
                return (x.info.eco + ' ' + x.info.placa + ' ' + x.info.nombre).toLowerCase().indexOf(f) >= 0;
            })
            .sort((a, b) => {
                const peso = (e) => e === 'offline' ? 0 : (e === 'detenida' ? 1 : 2);
                const d = peso(a.st.estado) - peso(b.st.estado);
                return d !== 0 ? d : a.info.eco.localeCompare(b.info.eco);
            });
        body.innerHTML = lista.map(({ info, st }) => {
            const clave = info.clave;
            const sel = APP.seleccion.has(info.eco) || APP.seleccion.has(info.placa);
            const sil = APP.dismissed.has(clave);
            const vig = isWatched(info);
            const zona = zoneAt(st.lat, st.lon);
            const clase = st.estado === 'offline' ? 'off' : (st.estado === 'detenida' ? 'det' : 'on');
            const ic = st.estado === 'offline' ? ICO.offline : (st.estado === 'detenida' ? ICO.detenida : ICO.moviendo);
            const txt = st.estado === 'offline' ? 'sin senal' : (st.estado === 'detenida' ? 'detenida' : 'moviendo');
            const coords = (APP.config.mostrarCoords && st.lat != null)
                ? ' <span style="color:var(--hjp-fg-mute);font-size:10px">' + st.lat.toFixed(3) + ',' + st.lon.toFixed(3) + '</span>' : '';
            return (
                '<tr class="fila ' + clase + (sel ? ' sel-row' : '') + '" data-eco="' + esc(info.eco) + '">' +
                '<td class="col-sel" data-eco="' + esc(info.eco) + '">' +
                '<input type="checkbox" class="hjp-sel" data-eco="' + esc(info.eco) + '" data-placa="' + esc(info.placa) + '"' + (sel ? ' checked' : '') + '>' +
                '</td>' +
                '<td class="estadoicon ' + clase + '">' + ic + '</td>' +
                '<td class="eco">' + (vig ? ICO.bandera + ' ' : '') + esc(info.eco || '-') + '</td>' +
                '<td>' + esc(info.placa || '') + '</td>' +
                '<td>' + txt + '</td>' +
                '<td>' + ageText(st.edadMin) + '</td>' +
                '<td>' + Math.round(st.vel) + '</td>' +
                '<td>' + esc(zona) + coords + '</td>' +
                '<td><button class="mini hjp-sil ' + (sil ? 'on' : '') + '" data-eco="' + esc(info.eco) + '" title="' + (sil ? 'Reactivar' : 'Silenciar') + '">' +
                (sil ? ICO.silencio : ICO.sonido) + '</button></td>' +
                '</tr>'
            );
        }).join('') || '<tr><td colspan="9" class="vacio">' + LANG.sinUni + '</td></tr>';
        const aviso = byId('hjp-sel-vacio');
        if (aviso) {
            const noHaySel = (!APP.config.watchAll && APP.seleccion.size === 0 && lista.length > 0);
            aviso.style.display = noHaySel ? 'block' : 'none';
        }
        byId('hjp-upd').textContent = ICO.reloj + ' ' + new Date().toLocaleTimeString();
        paintInfo();
        
    }
    function paintAlertas() {
        const cont = byId('hjp-lista-alertas');
        if (!cont) return;
        const f = (APP.filtro || '').toLowerCase();
        const lista = APP.historial.filter((a) => {
            if (APP.filtSever && APP.filtSever !== 'todas' && a.sev !== APP.filtSever) return false;
            if (!f) return true;
            return (a.titulo + ' ' + (a.detalle || '') + ' ' + (a.eco || '')).toLowerCase().indexOf(f) >= 0;
        });
        cont.innerHTML = lista.length
            ? lista.map((a) => (
                '<div class="alerta" style="border-left:4px solid ' + (COL[a.sev] || '#555') + '">' +
                '<span class="ico" style="color:' + (COL[a.sev] || '#777') + '">' + esc(a.icono) + '</span>' +
                '<div class="cuerpo">' +
                '<b>' + esc(a.titulo) + '</b>' +
                (a.detalle ? '<span>' + esc(a.detalle) + '</span>' : '') +
                '<div class="meta"><span class="regla">' + esc(a.regla) + '</span>' +
                '<span>' + new Date(a.ts).toLocaleString().slice(0, 16) + '</span></div>' +
                '</div>' +
                '<span class="hora">' + new Date(a.ts).toLocaleTimeString().slice(0, 5) + '</span>' +
                '</div>'
            )).join('')
            : '<div class="vacio">Sin avisos registrados.</div>';
        paintSeverity();
    }
    function paintSeverity() {
        document.querySelectorAll('#hjp-filtroseveridad span[data-sev]').forEach((s) => {
            s.classList.toggle('activo', s.dataset.sev === (APP.filtSever || 'todas'));
        });
    }
    function paintGeocercas() {
        const body = byId('hjp-body-zonas');
        if (!body) return;
        if (!APP.config.loadZones || !APP.zonas.length) {
            body.innerHTML = '<tr><td colspan="2" class="vacio">' + LANG.geoNone + '</td></tr>';
            return;
        }
        const unidades = APP.unidades.filter(shouldWatch).map((u) => ({ st: unitState(u), info: parseUnitName(u) }));
        const f = (APP.filtro || '').toLowerCase();
        const rows = [];
        for (let i = 0; i < APP.zonas.length; i++) {
            const z = APP.zonas[i];
            const dentro = unidades.filter((u) => u.st.online && inZone(u.st.lat, u.st.lon, z));
            const ecos = dentro.map((u) => u.info.eco);
            if (f) {
                const hit = ecos.some((e) => e && e.indexOf(f) >= 0) || ((z.n || '').toLowerCase().indexOf(f) >= 0);
                if (!hit) continue;
            }
            rows.push(
                '<tr class="fila" data-zona="' + esc(z.n || '') + '">' +
                '<td>' + esc(z.n || ('Zona ' + z.id)) + '</td>' +
                '<td><span class="contador-unidades">' + dentro.length + '</span> ' +
                (dentro.length ? '· ' + esc(ecos.slice(0, 6).join(' · ')) + (ecos.length > 6 ? ' +' + (ecos.length - 6) : '') : 'vacia') +
                '</td>' +
                '</tr>'
            );
        }
        body.innerHTML = rows.join('') || '<tr><td colspan="2" class="vacio">' + LANG.sinCoin + '</td></tr>';
    }
    function paintPanel() { setTab(APP.tab); }

    setInterval(() => {
        if (panelEl.style.display === 'none') return;
        if (APP.tab === 'unidades') paintTabla();
        if (APP.tab === 'dash') paintKPI();
        if (APP.tab === 'geocercas') paintGeocercas();
        byId('hjp-upd').textContent = ICO.reloj + ' ' + new Date().toLocaleTimeString();
        if (nmActivo()) updateNoMolestar();
        paintStateBadge();
    }, 1000);

    /* ====================== CSV + BACKUP ====================== */
    function downloadCSV(filas, nombre) {
        const escCsv = (c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"';
        const csv = filas.map((f) => f.map(escCsv).join(',')).join('\n');
        const a = makeEl('a', { href: URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })) });
        a.download = nombre + '_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }
    function exportUnits() {
        const filas = [['Eco', 'Placa', 'Nombre', 'ID', 'Estado', 'Ultimo(min)', 'km/h', 'Lat', 'Lon', 'Zona', 'Silenciada', 'Vigilada']];
        APP.unidades.filter(shouldWatch).forEach((u) => {
            const info = parseUnitName(u), st = unitState(u);
            filas.push([info.eco, info.placa, info.nombre, info.id, st.estado,
                isFinite(st.edadMin) ? st.edadMin.toFixed(1) : '', Math.round(st.vel),
                st.lat, st.lon, zoneAt(st.lat, st.lon),
                APP.dismissed.has(info.clave) ? 'si' : '',
                isWatched(info) ? 'si' : ''
            ]);
        });
        downloadCSV(filas, 'wialon_unidades');
    }
    function exportAlertas() {
        const filas = [['Fecha', 'Severidad', 'Regla', 'Titulo', 'Detalle', 'Eco']];
        APP.historial.forEach((a) => filas.push([
            new Date(a.ts).toLocaleString(), a.sev, a.regla, a.titulo, a.detalle, a.eco
        ]));
        downloadCSV(filas, 'wialon_bitacora');
    }
    function exportConfig() {
        const data = {
            version: 4, ts: Date.now(),
            config: APP.config, barra: APP.barra,
            seleccion: Array.from(APP.seleccion), dismissed: Array.from(APP.dismissed),
            watchMap: APP.watchMap, panelPos: APP.panelPos, panelSize: APP.panelSize
        };
        const a = makeEl('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })) });
        a.download = 'hjp_config_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        advice('Configuracion exportada');
    }
    function importConfig() {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'application/json';
        inp.addEventListener('change', () => {
            const f = inp.files && inp.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                try {
                    const d = JSON.parse(r.result);
                    if (d.config) APP.config = deepMerge(d.config, DEFAULTS);
                    writeJSON(LS.cfg, APP.config);
                    if (d.barra) APP.barra = d.barra;
                    writeJSON(LS.barra, APP.barra);
                    if (Array.isArray(d.seleccion)) { APP.seleccion = new Set(d.seleccion); writeJSON(LS.seleccion, Array.from(APP.seleccion)); }
                    if (Array.isArray(d.dismissed)) { APP.dismissed = new Set(d.dismissed); writeJSON(LS.dismissed, Array.from(APP.dismissed)); }
                    if (d.watchMap) { APP.watchMap = d.watchMap; writeJSON(LS.watch, APP.watchMap); }
                    if (d.panelPos) { APP.panelPos = d.panelPos; writeJSON(LS.panelpos, APP.panelPos); }
                    if (d.panelSize) { APP.panelSize = d.panelSize; writeJSON(LS.panelsize, APP.panelSize); }
                    applyBar(); applyTheme(); placePanel();
                    refresh();
                    advice('Configuracion importada');
                } catch (e) {
                    advice('Error importando', (e && e.message) || '');
                }
            };
            r.readAsText(f);
        });
        inp.click();
    }
    function testNotify() {
        const previo = APP.noMolestar;
        APP.noMolestar = null;
        pushAlert({
            regla: 'test', sev: 'medio', eco: 'TEST', clave: 'TEST',
            titulo: 'TEST · Aviso de prueba',
            detalle: 'Comprueba voz, pitido, toast y notificacion del navegador',
            hablar: 'Aviso de prueba de la unidad 4340'
        });
        APP.noMolestar = previo;
    }

    /* ====================== MENU CONTEXTUAL ====================== */
    function showMenu(x, y, options) {
        ctxEl.innerHTML = options.map((o) =>
            o.sep ? '<div class="sep"></div>' : '<div class="op" data-acc="' + esc(o.id) + '">' + esc(o.label) + '</div>'
        ).join('');
        ctxEl.style.display = 'flex';
        ctxEl.style.left = '0px'; ctxEl.style.top = '0px';
        const r = ctxEl.getBoundingClientRect();
        ctxEl.style.left = Math.min(x, window.innerWidth - r.width - 6) + 'px';
        ctxEl.style.top = Math.min(y, window.innerHeight - r.height - 6) + 'px';
        ctxEl._options = options;
    }
    function hideMenu() { ctxEl.style.display = 'none'; ctxEl._target = null; }
    document.addEventListener('click', (e) => {
        if (ctxEl.style.display !== 'none' && !ctxEl.contains(e.target)) hideMenu();
    });
    function copyToClipboard(text) {
        try { return navigator.clipboard.writeText(String(text || '')); } catch (_) {
            const t = document.createElement('textarea');
            t.value = text; t.style.position = 'fixed'; t.style.left = '-9999px';
            document.body.appendChild(t); t.select();
            try { document.execCommand('copy'); } catch (e) { /* noop */ }
            document.body.removeChild(t);
            return Promise.resolve();
        }
    }

    /* ====================== TECLAS ====================== */
    function bindKeys() {
        document.addEventListener('keydown', (e) => {
            if (e.altKey && !e.ctrlKey && !e.shiftKey) {
                const tabs = { '1': 'dash', '2': 'unidades', '3': 'alertas', '4': 'geocercas' };
                if (tabs[e.key]) { setTab(tabs[e.key]); e.preventDefault(); return; }
                if (e.key.toLowerCase() === 'p') {
                    panelEl.style.display = panelEl.style.display === 'flex' ? 'none' : 'flex';
                    paintPanel();
                    e.preventDefault(); return;
                }
                if (e.key.toLowerCase() === 'h') {
                    APP.barra.plegada = !APP.barra.plegada;
                    applyBar();
                    e.preventDefault(); return;
                }
            }
            if (e.key === 'Escape') {
                [modalEl, cfgWinEl, ctxEl].forEach((w) => { if (w) w.style.display = 'none'; });
            }
        });
    }
/* ====================== EVENTOS ====================== */
    function bindEvents() {
        mainBtn.addEventListener('click', () => {
            const ta = byId('hjp-txt'); if (ta) ta.value = '';
            pintarModalLista();
            modalEl.style.display = 'flex';
            const ni = byId('hjp-modal-new-eco'); if (ni) ni.focus();
        });
        function abrirModalLista(prefill) {
            const ta = byId('hjp-txt');
            if (ta) ta.value = prefill ? prefill : '';
            pintarModalLista();
            modalEl.style.display = 'flex';
            const ni = byId('hjp-modal-new-eco'); if (ni) ni.focus();
        }
        byId('hjp-cancelar').addEventListener('click', () => {
            modalEl.style.display = 'none';
            const ta = byId('hjp-txt'); if (ta) ta.value = '';
            const ni = byId('hjp-modal-new-eco'); if (ni) ni.value = '';
            const nd = byId('hjp-modal-new-dest'); if (nd) nd.value = '';
        });
        byId('hjp-modal-parse').addEventListener('click', () => {
            const ta = byId('hjp-txt');
            const n = parsearPegado(ta ? ta.value : '');
            if (ta) ta.value = '';
            pintarModalLista();
            paintInfo();
            advice('Pegado', n + ' unidad(es) procesadas');
        });
        byId('hjp-modal-clear-txt').addEventListener('click', () => {
            const ta = byId('hjp-txt'); if (ta) ta.value = '';
            ta && ta.focus();
        });
        byId('hjp-modal-add').addEventListener('click', () => {
            const ne = byId('hjp-modal-new-eco');
            const nd = byId('hjp-modal-new-dest');
            const eco = ne ? ne.value.trim() : '';
            const destino = nd ? nd.value.trim() : '';
            if (!eco) return;
            agregarALista(eco, destino);
            if (ne) ne.value = '';
            if (nd) nd.value = '';
            pintarModalLista();
            paintInfo();
            if (ne) ne.focus();
        });
        byId('hjp-modal-vaciar').addEventListener('click', () => {
            if (!window.confirm('¿Vaciar la lista? Esta accion no se puede deshacer.')) return;
            APP.watchMap = {};
            guardarLista();
            pintarModalLista();
            paintInfo();
            advice('Lista vaciada');
        });
        document.getElementById('hjp-modal-lista').addEventListener('click', (e) => {
            const eco = e.target.dataset && e.target.dataset.eco;
            if (!eco) return;
            if (e.target.classList.contains('hjp-del')) {
                quitarDeLista(eco);
                pintarModalLista();
                paintInfo();
            }
        });
        document.getElementById('hjp-modal-lista').addEventListener('input', (e) => {
            if (!e.target.classList || !e.target.classList.contains('hjp-dest')) return;
            const eco = e.target.dataset.eco;
            const destino = e.target.value.trim();
            if (APP.watchMap[eco] !== undefined) {
                APP.watchMap[eco] = destino;
                guardarLista();
                paintInfo();
            }
        });
        byId('hjp-ejecutar').addEventListener('click', async () => {
            const ta = byId('hjp-txt');
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
        closeBtn.addEventListener('click', closeAllWindows);
        panelBtn.addEventListener('click', () => {
            panelEl.style.display = panelEl.style.display === 'flex' ? 'none' : 'flex';
            paintPanel();
        });
        byId('hjp-cerrar-panel').addEventListener('click', () => { panelEl.style.display = 'none'; });
        byId('hjp-refresh').addEventListener('click', refresh);
        byId('hjp-csv').addEventListener('click', exportUnits);
        byId('hjp-csv-al').addEventListener('click', exportAlertas);
        byId('hjp-captura').addEventListener('click', captureSelection);
        byId('hjp-verifica').addEventListener('click', () => { verifyWindows(false); });
        byId('hjp-sel-all').addEventListener('click', () => { selectAllVisible(); });
        byId('hjp-sel-clear').addEventListener('click', () => { clearSelection(); });
        byId('hjp-verif').addEventListener('click', () => {
            APP.config.verificar = !APP.config.verificar;
            writeJSON(LS.cfg, APP.config);
            restartVerificationLoop();
            advice('Verificacion ' + (APP.config.verificar ? 'activada' : 'desactivada'),
                APP.config.verificar ? 'Solo se mantendran las ventanas seleccionadas' : '');
        });
        byId('hjp-filtro').addEventListener('input', (e) => {
            APP.filtro = e.target.value;
            if (APP.tab === 'alertas') paintAlertas();
            else if (APP.tab === 'unidades') paintTabla();
            else if (APP.tab === 'geocercas') paintGeocercas();
        });
        document.querySelectorAll('#hjp-tabs .tab').forEach((t) =>
            t.addEventListener('click', () => setTab(t.dataset.tab)));
        document.querySelectorAll('#hjp-filtroseveridad span').forEach((s) =>
            s.addEventListener('click', () => { APP.filtSever = s.dataset.sev; paintAlertas(); }));
        byId('hjp-tema').addEventListener('click', () => {
            APP.config.theme = APP.config.theme === 'oscuro' ? 'claro' : (APP.config.theme === 'claro' ? 'auto' : 'oscuro');
            writeJSON(LS.cfg, APP.config);
            applyTheme();
            advice('Tema', APP.config.theme);
        });
        byId('hjp-nmolestar').addEventListener('click', () => { toggleNoMolestar(); });
        byId('hjp-test').addEventListener('click', testNotify);
        byId('hjp-exportar-todo').addEventListener('click', exportConfig);
        byId('hjp-importar-todo').addEventListener('click', importConfig);
        foldBtn.addEventListener('click', () => {
            APP.barra.plegada = !APP.barra.plegada;
            applyBar();
        });
        gripEl.addEventListener('dblclick', () => {
            APP.barra.vertical = !APP.barra.vertical;
            applyBar();
            advice('Barra', APP.barra.vertical ? 'orientacion vertical' : 'orientacion horizontal');
        });
        [[mainBtn, 'main', 'Automatizar'], [panelBtn, 'panel', 'Panel'], [closeBtn, 'close', 'Cerrar']]
            .forEach(([btn, key, name]) => {
                btn.addEventListener('contextmenu', (ev) => {
                    ev.preventDefault();
                    APP.barra.botones[key] = false;
                    applyBar();
                    advice('Boton oculto: ' + name, 'Reactivalo en Ajustes · Barra de botones');
                });
            });

        document.getElementById('hjp-body').addEventListener('change', (e) => {
            if (!e.target.classList.contains('hjp-sel')) return;
            e.stopPropagation();
            const eco = e.target.dataset.eco || '';
            const placa = e.target.dataset.placa || '';
            if (e.target.checked) addToSelection(eco, placa);
            else removeFromSelection(eco, placa);
            const tr = e.target.closest('tr.fila');
            if (tr) tr.classList.toggle('sel-row', !!e.target.checked);
        });
        document.getElementById('hjp-body').addEventListener('click', (e) => {
            if (e.target.classList && (e.target.classList.contains('hjp-sel') || e.target.closest('label.col-sel'))) {
                e.stopPropagation();
                return;
            }
            const tr = e.target.closest('tr.fila');
            if (!tr) return;
            const eco = tr.dataset.eco;
            if (!eco) return;
            if (e.target.classList && e.target.classList.contains('hjp-sil')) {
                if (APP.dismissed.has(eco)) APP.dismissed.delete(eco); else APP.dismissed.add(eco);
                writeJSON(LS.dismissed, Array.from(APP.dismissed));
                paintTabla();
                return;
            }
            openUnitWindow(eco);
        });
        document.getElementById('hjp-body').addEventListener('contextmenu', (e) => {
            const tr = e.target.closest && e.target.closest('tr.fila');
            const eco = tr ? tr.dataset.eco : null;
            if (!eco) return;
            e.preventDefault();
            showMenu(e.clientX, e.clientY, [
                { id: 'open', label: '▷ Abrir ventana' },
                { id: 'sil', label: (APP.dismissed.has(eco) ? '◆ Reactivar avisos' : '◇ Silenciar esta unidad') },
                { id: 'verif', label: '⊘ Aplicar verificacion' },
                { sep: 1 },
                { id: 'copy-eco', label: '⎘ Copiar economico' },
                { id: 'copy-placa', label: '⎘ Copiar placa' }
            ]);
            ctxEl._target = { eco };
        });
        ctxEl.addEventListener('click', (e) => {
            const acc = e.target.dataset && e.target.dataset.acc;
            if (!acc || !ctxEl._target) return;
            const eco = ctxEl._target.eco;
            if (acc === 'open') openUnitWindow(eco);
            else if (acc === 'sil') {
                if (APP.dismissed.has(eco)) APP.dismissed.delete(eco); else APP.dismissed.add(eco);
                writeJSON(LS.dismissed, Array.from(APP.dismissed));
                paintTabla();
            } else if (acc === 'verif') verifyWindows(false);
            else if (acc === 'copy-eco') { copyToClipboard(eco); advice('Copiado', eco); }
            else if (acc === 'copy-placa') {
                const u = APP.unidades.find((x) => parseUnitName(x).eco === eco);
                const placa = u ? parseUnitName(u).placa : '';
                copyToClipboard(placa);
                advice('Copiado', placa || eco);
            }
            hideMenu();
        });

        document.querySelectorAll('#hjp-cfg-tabs .cfg-tab').forEach((b) => b.addEventListener('click', () => {
            document.querySelectorAll('#hjp-cfg-tabs .cfg-tab').forEach((x) => x.classList.remove('activo'));
            b.classList.add('activo');
            const sel = b.dataset.cfg;
            document.querySelectorAll('#hjp-config .cfg-pane').forEach((p) => {
                p.style.display = (p.dataset.cfg === sel) ? '' : 'none';
            });
        }));

        function abrirCfg() {
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
            g('c-beep').checked = !!APP.config.beep;
            g('c-desktop').checked = !!APP.config.desktop;
            g('c-watchAll').checked = !!APP.config.watchAll;
            g('c-auto').checked = !!APP.config.autoOpen;
            g('c-zonas').checked = !!APP.config.loadZones;
            g('c-geo').checked = !!APP.config.geocode;
            g('c-hist').checked = !!APP.config.historico;
            g('c-verif').checked = !!APP.config.verificar;
            g('c-verif-seg').value = APP.config.verifSeg;
            g('c-tema').value = APP.config.theme;
            g('c-dens').value = APP.config.density;
            g('c-acento').value = APP.config.acento || '#1565c0';
            g('c-coords').checked = !!APP.config.mostrarCoords;
            g('c-b-main').checked = !!APP.barra.botones.main;
            g('c-b-panel').checked = !!APP.barra.botones.panel;
            g('c-b-close').checked = !!APP.barra.botones.close;
            g('c-b-plegada').checked = !!APP.barra.plegada;
            g('c-b-vertical').checked = !!APP.barra.vertical;
            g('c-r-off').checked = !!APP.config.reglas.offline;
            g('c-r-gps').checked = !!APP.config.reglas.gpsPerdido;
            g('c-r-det').checked = !!APP.config.reglas.detenido;
            g('c-r-zona').checked = !!APP.config.reglas.zona;
            g('c-r-geo').checked = !!APP.config.reglas.geocerca;
            g('c-r-des').checked = !!APP.config.reglas.destino;
            g('c-r-dis').checked = !!APP.config.reglas.desconexion;
            g('c-r-vel').checked = !!APP.config.reglas.velocidad;
            g('c-hor-on').checked = !!APP.config.horario.on;
            g('c-hor-a').value = APP.config.horario.desde;
            g('c-hor-b').value = APP.config.horario.hasta;
            if (APP.config.desktop && typeof Notification !== 'undefined' && Notification.permission === 'default') {
                Notification.requestPermission();
            }
            cfgWinEl.style.display = 'flex';
        }
        byId('hjp-cfg-btn').addEventListener('click', abrirCfg);
        byId('c-lista-editar').addEventListener('click', () => {
            cfgWinEl.style.display = 'none';
            const prefill = Object.keys(APP.watchMap).map((k) =>
                APP.watchMap[k] ? k + '=' + APP.watchMap[k] : k
            ).join('\n');
            abrirModalLista(prefill);
        });
        byId('hjp-cfg-cerrar').addEventListener('click', () => { cfgWinEl.style.display = 'none'; });
        byId('hjp-cfg-cerrar-x').addEventListener('click', () => { cfgWinEl.style.display = 'none'; });
        byId('hjp-cfg-guardar').addEventListener('click', () => {
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
            cf.voice = g('c-voz').checked;
            cf.beep = g('c-beep').checked;
            cf.desktop = g('c-desktop').checked;
            cf.watchAll = g('c-watchAll').checked;
            cf.autoOpen = g('c-auto').checked;
            cf.loadZones = g('c-zonas').checked;
            cf.geocode = g('c-geo').checked;
            cf.historico = g('c-hist').checked;
            cf.verificar = g('c-verif').checked;
            cf.verifSeg = Math.max(2, isoNum(g('c-verif-seg').value, cf.verifSeg));
            cf.theme = g('c-tema').value;
            cf.density = g('c-dens').value;
            cf.acento = g('c-acento').value;
            cf.mostrarCoords = g('c-coords').checked;
            cf.reglas.offline = g('c-r-off').checked;
            cf.reglas.gpsPerdido = g('c-r-gps').checked;
            cf.reglas.detenido = g('c-r-det').checked;
            cf.reglas.zona = g('c-r-zona').checked;
            cf.reglas.geocerca = g('c-r-geo').checked;
            cf.reglas.destino = g('c-r-des').checked;
            cf.reglas.desconexion = g('c-r-dis').checked;
            cf.reglas.velocidad = g('c-r-vel').checked;
            cf.horario.on = g('c-hor-on').checked;
            cf.horario.desde = g('c-hor-a').value || DEFAULTS.horario.desde;
            cf.horario.hasta = g('c-hor-b').value || DEFAULTS.horario.hasta;
            APP.barra.botones.main = g('c-b-main').checked;
            APP.barra.botones.panel = g('c-b-panel').checked;
            APP.barra.botones.close = g('c-b-close').checked;
            APP.barra.plegada = g('c-b-plegada').checked;
            APP.barra.vertical = g('c-b-vertical').checked;
            applyBar();
            paintVerifyButton();
            if (!cf.loadZones) APP.zonas = [];
            writeJSON(LS.cfg, APP.config);
            writeJSON(LS.watch, APP.watchMap);
            writeJSON(LS.barra, APP.barra);
            applyTheme();
            restartTimers();
            cfgWinEl.style.display = 'none';
            refresh();
            advice(LANG.guardado);
        });

        byId('hjp-b-reset').addEventListener('click', () => {
            APP.barra.x = Math.max(4, window.innerWidth - barraEl.offsetWidth - 15);
            APP.barra.y = 80;
            applyBar();
            advice('Barra recentrada');
        });
        byId('hjp-reset-panel').addEventListener('click', () => {
            panelEl.style.width = '470px';
            panelEl.style.height = '440px';
            APP.panelSize = { w: 470, h: 440 };
            writeJSON(LS.panelsize, APP.panelSize);
            advice('Tamano restablecido');
        });
        byId('hjp-borrar-memo').addEventListener('click', () => {
            APP.memo = {}; writeJSON(LS.memo, APP.memo); refresh();
            advice('Estado borrado');
        });
        byId('hjp-borrar-todo').addEventListener('click', () => {
            if (!window.confirm('Borrar TODO (configuracion, estado, bitacora, historial)?')) return;
            Object.keys(LS).forEach((k) => { try { localStorage.removeItem(LS[k]); } catch (_) { /* noop */ } });
            avisoEl.textContent = 'Estado borrado, recargando...';
            avisoEl.style.display = 'block';
            setTimeout(() => { try { location.reload(); } catch (_) { /* noop */ } }, 700);
        });
    }

    /* ====================== INIT ====================== */
    async function init() {
        injectCSS();
        buildUI();
        attachDraggables();
        bindKeys();
        bindEvents();

        const ok = await wialonReady();
        if (!ok) {
            avisoEl.textContent = 'No se encontró la API de Wialon (wialon.core) en esta página.';
            avisoEl.style.display = 'block';
            APP.unlocked = true;
            return;
        }
        log('API de Wialon detectada. Esperando sesion...');
        let intentos = 0;
        while (!currentUser() && intentos < 120) { await sleep(1000); intentos++; }
        if (!currentUser()) {
            avisoEl.textContent = 'Sesion de Wialon no iniciada. Inicia sesion para monitorear.';
            avisoEl.style.display = 'block';
            APP.unlocked = true;
            return;
        }
        APP.unlocked = true;
        applyBar();
        applyTheme();
        placePanel();
        paintVerifyButton();
        updateNoMolestar();
        await refresh();
        restartTimers();
    }
    function log() { try { console.log.apply(console, ['[HJP]'].concat(Array.prototype.slice.call(arguments))); } catch (_) { /* noop */ } }

    init();

})();
