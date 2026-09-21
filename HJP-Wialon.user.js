// ==UserScript==
// @name         HJP · Wialon (gestión de flota en AE-Track / Wialon)
// @namespace    https://github.com/leriart/AE-Track
// @version      4.9.0
// @description  Vigilancia de flota sobre la API nativa de Wialon. Evalúa reglas de negocio, notifica visualmente con toasts/voz/pitido, automatiza la apertura y acomodo de ventanas, mantiene abiertas solo las seleccionadas. Panel con Dashboard, Unidades, Bitácora, Geocercas y Rutas. Rutas con OpenStreetMap (OSRM), algoritmo A*, detección de desvíos, giros en U y retorno por viaje cancelado, trazado con exportación GeoJSON, límite de velocidad por unidad, perfiles, filtros, tema oscuro/claro, backup JSON y panel flotante o barra lateral. Sin emojis.
// @author       lerit, Héctor Ramírez (HectorRamirez-cpu)
// @contributor  Héctor Ramírez (https://github.com/HectorRamirez-cpu) · creador del proyecto original
// @copyright    Proyecto original de Héctor Ramírez (https://github.com/HectorRamirez-cpu)
// @homepageURL  https://github.com/leriart/AE-Track
// @supportURL   https://github.com/leriart/AE-Track/issues
// @updateURL    https://raw.githubusercontent.com/leriart/AE-Track/main/HJP-Wialon.user.js
// @downloadURL  https://raw.githubusercontent.com/leriart/AE-Track/main/HJP-Wialon.user.js
// @match        *://*.ae-track.com/*
// @match        *://ae-track.com/*
// @match        *://*.wialon.com/*
// @match        *://wialon.com/*
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
    const MAT = Object.freeze({
        moviendo: 'E531', detenida: 'E047', offline: 'E1CE', online: 'E1B3', sinluz: 'E1CE',
        critico: 'E000', alto: 'E002', medio: 'E7EE', bajo: 'E5DB', ok: 'E86C',
        panel: 'E8EC', dashboard: 'E871', alertas: 'E002', automatizar: 'E037', cerrar: 'E5CD',
        refrescar: 'E5D5', ajustes: 'E8B8', descargar: 'E2C4', filtro: 'E6B0', copiar: 'E14D',
        zona: 'E55F', tiempo: 'E889', velocidad: 'E9E4', base: 'E88A',
        entra: 'E5C8', sale: 'E5C4', destino: 'E153', regreso: 'E8D5',
        reconecta: 'E1E2', desconecta: 'E1E1', info: 'E88E', reloj: 'E8B5',
        senal: 'E202', silencio: 'E7F6', sonido: 'E7F4', bandera: 'E153',
        geocercas: 'E55B', subir: 'E316', bajar: 'E313',
        luna: 'E51C', sol: 'E518', limpiar: 'E14A',
        expandir: 'E5D0', colapsar: 'E5D1', ayuda: 'E887', importar: 'E2C6', exportar: 'E2C4',
        silencioTotal: 'E644',
        fullscreen: 'E5D0',
        fullscreenOff: 'E5D1',
        verif: 'E834',
        captura: 'E15F',
        verifica: 'E14E',
        selAll: 'E834',
        selClear: 'E14A',
        arrowLeft: 'E314',
        arrowRight: 'E315',
        actualizar: 'E5D5'
    });
    function ico(name) {
        const h = MAT[name];
        return h ? String.fromCharCode(parseInt(h, 16)) : '?';
    }
    const ICO = new Proxy({}, {
        get(_, k) { return ico(k); },
        ownKeys() { return Object.keys(MAT); }
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

    /* ====================== VERSION Y ACTUALIZACIONES ====================== */
    const VER = '4.9.0';
    const UPDATE_URL = 'https://raw.githubusercontent.com/leriart/AE-Track/main/HJP-Wialon.user.js';
    const UPDATE_URL_DEV = 'https://raw.githubusercontent.com/leriart/AE-Track/dev/HJP-Wialon.user.js';
    function parseVersionHeader(text) {
        const m = text.match(/@version\s+(\S+)/);
        return m ? m[1] : null;
    }
    function cmpVersion(a, b) {
        if (!a || !b) return 0;
        const pa = String(a).split('.').map(Number);
        const pb = String(b).split('.').map(Number);
        const len = Math.max(pa.length, pb.length);
        for (let i = 0; i < len; i++) {
            const x = pa[i] || 0, y = pb[i] || 0;
            if (x > y) return 1;
            if (x < y) return -1;
        }
        return 0;
    }

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
        fullscreen: 'hjp.api.fullscreen',
        limites: 'hjp.api.limites',
        perfiles: 'hjp.api.perfiles',
        filtEstado: 'hjp.api.filtEstado',
        rutas: 'hjp.api.rutas'
    });

    // Datos por pestaña (sessionStorage): cada pestaña tiene su propia copia.
    // Se migran desde LS en el primer acceso para no perder datos existentes.
    const SS = Object.freeze({
        watch: 'hjp.api.s.watch',
        memo: 'hjp.api.s.memo',
        dismissed: 'hjp.api.s.dismissed',
        hist: 'hjp.api.s.hist',
        geo: 'hjp.api.s.geo',
        seleccion: 'hjp.api.s.seleccion',
        kpi: 'hjp.api.s.kpi',
        limites: 'hjp.api.s.limites'
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
        beepVol: 0.06,
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
        acento: '#850D22',
        contornos: true,
        contornoHoras: 24,
        mostrarCoords: false,
        panelMode: 'flotante',
        panelLado: 'derecha',
        panelAncho: 420,
        panelVisible: false,
        ocultarAlClicFuera: true,
        confirmarCierre: true,
        osrm: true,
        overpass: false,
        desvioM: 250,
        desvioMin: 5,
        retornoM: 400,
        retornoPct: 25,
        giroGrados: 130,
        giroMin: 3,
        trazado: true,
        trazadoMax: 500,
        horario: Object.freeze({ on: true, desde: '06:00', hasta: '23:00' }),
        reglas: Object.freeze({
            offline: true,
            gpsPerdido: true,
            detenido: true,
            zona: true,
            geocerca: true,
            destino: false,
            desconexion: true,
            velocidad: false,
            desvio: false,
            retorno: false,
            giroU: false
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

    // sessionStorage por pestaña. Migra desde LS la primera vez para no perder
    // los datos guardados en versiones anteriores.
    function readSession(key, fallback, legacyKey) {
        try {
            const raw = sessionStorage.getItem(key);
            if (raw != null) {
                const v = JSON.parse(raw);
                if (v != null) return v;
            }
            if (legacyKey) {
                const legacy = localStorage.getItem(legacyKey);
                if (legacy != null) {
                    const parsed = JSON.parse(legacy);
                    sessionStorage.setItem(key, JSON.stringify(parsed));
                    try { localStorage.removeItem(legacyKey); } catch (_) { /* noop */ }
                    return parsed;
                }
            }
        } catch (_) { /* noop */ }
        return fallback;
    }
    function writeSession(key, value) {
        try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* noop */ }
    }

    function readArray(key, fallback) {
        const v = readJSON(key, fallback);
        return Array.isArray(v) ? v : fallback;
    }

    function readObject(key, fallback) {
        const v = readJSON(key, fallback);
        return (v && typeof v === 'object' && !Array.isArray(v)) ? v : fallback;
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
        watchMap: readObject(LS.watch, {}),
        seleccion: new Set(readArray(LS.seleccion, [])),
        dismissed: new Set(readArray(LS.dismissed, [])),
        memo: readObject(LS.memo, {}),
        historial: readArray(LS.hist, []),
        geoCache: readObject(LS.geo, {}),
        limites: readObject(LS.limites, {}),
        perfiles: readObject(LS.perfiles, {}),
        rutas: readObject(LS.rutas, {}),
        trazas: {},
        grafoCache: {},
        barra: readObject(LS.barra, {
            x: null, y: null, plegada: false, vertical: false,
            botones: { main: true, panel: true, close: true }
        }),
        panelPos: readJSON(LS.panelpos, null),
        panelSize: readJSON(LS.panelsize, null),
        noMolestar: readJSON(LS.nmolestar, null),
        kpi: readObject(LS.kpi, { online: [], offline: [] }),
        expanded: readJSON(LS.expanded, false),
        config: deepMerge(readObject(LS.cfg, {}), DEFAULTS),

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
        filtEstado: readJSON(LS.filtEstado, 'todas'),
        panelHidden: true,
        update: { state: 'idle', remote: null, local: VER },
        unlocked: false,
        consultaRestante: 0
    };
    APP.panelHidden = !APP.config.panelVisible;
    APP.barra.botones = Object.assign({ main: true, panel: true, close: true }, APP.barra.botones || {});
    if (!Array.isArray(APP.kpi.online)) APP.kpi.online = [];
    if (!Array.isArray(APP.kpi.offline)) APP.kpi.offline = [];

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

    /* ====================== ALGORITMOS GEO / RUTAS (OSM + A*) ====================== */
    const RADIO_TIERRA = 6371008.8;
    function rad(d) { return d * Math.PI / 180; }
    function grad(r) { return r * 180 / Math.PI; }
    function haversine(lat1, lon1, lat2, lon2) {
        const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
        const s = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * RADIO_TIERRA * Math.asin(Math.min(1, Math.sqrt(s)));
    }
    function bearing(lat1, lon1, lat2, lon2) {
        const p1 = rad(lat1), p2 = rad(lat2), dl = rad(lon2 - lon1);
        const y = Math.sin(dl) * Math.cos(p2);
        const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
        return (grad(Math.atan2(y, x)) + 360) % 360;
    }
    function difAngulo(a, b) { return Math.abs(((a - b + 540) % 360) - 180); }

    // Distancia punto->segmento en metros con proyeccion equirectangular local.
    function distPuntoSegmento(lat, lon, aLat, aLon, bLat, bLon) {
        const lat0 = (aLat + bLat) / 2;
        const mx = 111320 * Math.cos(rad(lat0)), my = 110540;
        const px = (lon - aLon) * mx, py = (lat - aLat) * my;
        const bx = (bLon - aLon) * mx, by = (bLat - aLat) * my;
        const len2 = bx * bx + by * by;
        let t = len2 > 0 ? (px * bx + py * by) / len2 : 0;
        t = clamp(t, 0, 1);
        const dx = px - bx * t, dy = py - by * t;
        return { dist: Math.sqrt(dx * dx + dy * dy), t };
    }
    // Reduce una polilinea conservando puntos separados al menos minM metros.
    function simplificarRuta(coords, minM) {
        if (!coords || coords.length < 3) return coords ? coords.slice() : [];
        const sep = minM || 40;
        const out = [coords[0]];
        let last = coords[0];
        for (let i = 1; i < coords.length - 1; i++) {
            if (haversine(last[1], last[0], coords[i][1], coords[i][0]) >= sep) { out.push(coords[i]); last = coords[i]; }
        }
        out.push(coords[coords.length - 1]);
        return out;
    }
    function precomputarRuta(coords) {
        const acum = [0];
        let total = 0;
        for (let i = 1; i < coords.length; i++) {
            total += haversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
            acum.push(total);
        }
        return { acum, total };
    }
    // Proyecta un punto sobre la polilinea de una ruta y calcula progreso y rumbo.
    function snapRuta(lat, lon, ruta) {
        if (!ruta || !ruta.coords || ruta.coords.length < 2 || lat == null || lon == null) return null;
        const c = ruta.coords;
        let mejor = { dist: Infinity, idx: 0, t: 0 };
        for (let i = 0; i < c.length - 1; i++) {
            const d = distPuntoSegmento(lat, lon, c[i][1], c[i][0], c[i + 1][1], c[i + 1][0]);
            if (d.dist < mejor.dist) mejor = { dist: d.dist, idx: i, t: d.t };
        }
        const acum = ruta.acum || [0, ruta.total || 1];
        const segLen = (acum[mejor.idx + 1] || 0) - (acum[mejor.idx] || 0);
        const recorrido = (acum[mejor.idx] || 0) + mejor.t * segLen;
        const total = ruta.total || 1;
        const a = c[mejor.idx], b = c[mejor.idx + 1];
        return {
            dist: mejor.dist, idx: mejor.idx, t: mejor.t,
            progreso: clamp(recorrido / total, 0, 1),
            recorrido, total,
            rumbo: bearing(a[1], a[0], b[1], b[0])
        };
    }

    // Cola de prioridad binaria para A*.
    function MinHeap() { this.a = []; }
    MinHeap.prototype.push = function (item) {
        const a = this.a; a.push(item);
        let i = a.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (a[p].f <= a[i].f) break;
            const t = a[p]; a[p] = a[i]; a[i] = t; i = p;
        }
    };
    MinHeap.prototype.pop = function () {
        const a = this.a;
        if (!a.length) return null;
        const top = a[0], last = a.pop();
        if (a.length) {
            a[0] = last;
            let i = 0;
            for (;;) {
                const l = 2 * i + 1, r = l + 1;
                let m = i;
                if (l < a.length && a[l].f < a[m].f) m = l;
                if (r < a.length && a[r].f < a[m].f) m = r;
                if (m === i) break;
                const t = a[m]; a[m] = a[i]; a[i] = t; i = m;
            }
        }
        return top;
    };
    MinHeap.prototype.size = function () { return this.a.length; };

    // A* generico sobre un grafo de nodos { id: { lat, lon } } y adyacencia { id: [id] }.
    // Heuristica: distancia haversine al objetivo (admisible para grafos viales).
    function aEstrella(nodos, adyacencia, inicio, meta) {
        if (!nodos.has(inicio) || !nodos.has(meta)) return null;
        const metaN = nodos.get(meta);
        const h = (id) => { const n = nodos.get(id); return haversine(n.lat, n.lon, metaN.lat, metaN.lon); };
        const abiertos = new MinHeap();
        const g = new Map(), padre = new Map(), cerrados = new Set();
        g.set(inicio, 0);
        abiertos.push({ id: inicio, f: h(inicio) });
        let iter = 0;
        while (abiertos.size() && iter < 300000) {
            iter++;
            const actual = abiertos.pop().id;
            if (actual === meta) {
                const camino = [actual];
                let c = actual;
                while (padre.has(c)) { c = padre.get(c); camino.push(c); }
                camino.reverse();
                return { camino, costo: g.get(meta), iteraciones: iter };
            }
            if (cerrados.has(actual)) continue;
            cerrados.add(actual);
            const vecinos = adyacencia.get(actual) || [];
            const nActual = nodos.get(actual);
            const gActual = g.get(actual);
            for (let i = 0; i < vecinos.length; i++) {
                const v = vecinos[i];
                if (cerrados.has(v)) continue;
                const nv = nodos.get(v);
                if (!nv) continue;
                const ng = gActual + haversine(nActual.lat, nActual.lon, nv.lat, nv.lon);
                if (g.has(v) && ng >= g.get(v)) continue;
                g.set(v, ng); padre.set(v, actual);
                abiertos.push({ id: v, f: ng + h(v) });
            }
        }
        return null;
    }

    // OSRM publico (OpenStreetMap): ruta de conduccion entre dos puntos.
    async function osrmRoute(origen, destino) {
        const url = 'https://router.project-osrm.org/route/v1/driving/' +
            origen.lon + ',' + origen.lat + ';' + destino.lon + ',' + destino.lat +
            '?overview=full&geometries=geojson&alternatives=false&steps=false';
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM HTTP ' + res.status);
        const d = await res.json();
        if (!d.routes || !d.routes.length) throw new Error('OSRM sin ruta');
        const r = d.routes[0];
        return { coords: r.geometry.coordinates, distancia: r.distance, duracion: r.duration, modo: 'osrm' };
    }

    // Overpass (OpenStreetMap): descarga el grafo vial de una caja y lo cachea.
    async function overpassGrafo(minLat, minLon, maxLat, maxLon) {
        const clave = [minLat, minLon, maxLat, maxLon].map((v) => v.toFixed(2)).join(',');
        if (APP.grafoCache[clave]) return APP.grafoCache[clave];
        const q = '[out:json][timeout:30];way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street"](' +
            minLat + ',' + minLon + ',' + maxLat + ',' + maxLon + ');(._;>;);out body;';
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(q)
        });
        if (!res.ok) throw new Error('Overpass HTTP ' + res.status);
        const d = await res.json();
        const nodos = new Map(), ady = new Map();
        (d.elements || []).forEach((el) => {
            if (el.type === 'node') nodos.set(el.id, { lat: el.lat, lon: el.lon });
        });
        (d.elements || []).forEach((el) => {
            if (el.type !== 'way' || !el.nodes) return;
            for (let i = 0; i < el.nodes.length - 1; i++) {
                const a = el.nodes[i], b = el.nodes[i + 1];
                if (!nodos.has(a) || !nodos.has(b)) continue;
                if (!ady.has(a)) ady.set(a, []);
                if (!ady.has(b)) ady.set(b, []);
                ady.get(a).push(b); ady.get(b).push(a);
            }
        });
        const grafo = { nodos, ady };
        const claves = Object.keys(APP.grafoCache);
        if (claves.length > 5) claves.forEach((k) => { delete APP.grafoCache[k]; });
        APP.grafoCache[clave] = grafo;
        return grafo;
    }
    function nodoCercano(nodos, lat, lon) {
        let mejor = null, mejorD = Infinity;
        nodos.forEach((n, id) => {
            const d = haversine(lat, lon, n.lat, n.lon);
            if (d < mejorD) { mejorD = d; mejor = id; }
        });
        return mejor;
    }
    // Ruta con A* sobre el grafo vial de OpenStreetMap.
    async function astarRoute(origen, destino) {
        const spanLat = Math.abs(origen.lat - destino.lat);
        const spanLon = Math.abs(origen.lon - destino.lon);
        if (spanLat > 1.5 || spanLon > 1.5) throw new Error('Ruta demasiado larga para A* (limite ~150 km)');
        const pad = 0.015;
        const grafo = await overpassGrafo(
            Math.min(origen.lat, destino.lat) - pad, Math.min(origen.lon, destino.lon) - pad,
            Math.max(origen.lat, destino.lat) + pad, Math.max(origen.lon, destino.lon) + pad
        );
        if (!grafo.nodos.size) throw new Error('Grafo OSM vacio');
        const ini = nodoCercano(grafo.nodos, origen.lat, origen.lon);
        const fin = nodoCercano(grafo.nodos, destino.lat, destino.lon);
        if (ini == null || fin == null) throw new Error('Sin nodos cercanos');
        const r = aEstrella(grafo.nodos, grafo.ady, ini, fin);
        if (!r || !r.camino.length) throw new Error('A* sin camino');
        const coords = r.camino.map((id) => { const n = grafo.nodos.get(id); return [n.lon, n.lat]; });
        return { coords, distancia: precomputarRuta(coords).total, duracion: null, modo: 'astar', nodos: coords.length };
    }

    async function geocodificarLugar(texto) {
        const espera = 1100 - (Date.now() - APP.geoLast);
        if (espera > 0) await sleep(espera);
        APP.geoLast = Date.now();
        try {
            const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es&q=' + encodeURIComponent(texto));
            const d = await res.json();
            if (!d || !d.length) return null;
            return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) };
        } catch (_) { return null; }
    }

    /* ====================== RUTAS (almacenamiento y planificacion) ====================== */
    function rutaDe(info) {
        if (!info) return null;
        return APP.rutas[info.clave] || APP.rutas[info.eco] || APP.rutas[info.placa] || APP.rutas[String(info.id)] || null;
    }
    function guardarRutas() { writeJSON(LS.rutas, APP.rutas); }
    function resetEstadoRuta(clave) {
        const m = APP.memo[clave];
        if (!m) return;
        m.progMax = 0; m.retornoAlerta = false; m.llego = false;
        m.desviadoDesde = null; m.rumboOpDesde = null;
        writeJSON(LS.memo, APP.memo);
    }
    async function planearRuta(eco, destinoTexto, origenOv, modo) {
        const it = unitByEco(eco);
        if (!it) { advice('Unidad no encontrada', eco); return null; }
        const origen = origenOv || (it.st.lat != null ? { lat: it.st.lat, lon: it.st.lon } : null);
        if (!origen) { advice('Sin origen', 'La unidad no reporta posicion actual'); return null; }
        let destino = null;
        const txt = String(destinoTexto || '').trim();
        if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(txt)) {
            const p = txt.split(',').map(Number);
            destino = { lat: p[0], lon: p[1] };
        } else if (txt) {
            destino = await geocodificarLugar(txt);
        }
        if (!destino) { advice('Destino no resuelto', 'Escribe un lugar o "lat,lon"'); return null; }
        advice('Calculando ruta', (modo === 'astar' ? 'A* sobre OSM' : 'OSRM') + '...');
        try {
            const calc = (modo === 'astar') ? await astarRoute(origen, destino) : await osrmRoute(origen, destino);
            const coords = simplificarRuta(calc.coords, 40);
            const pre = precomputarRuta(coords);
            const clave = it.info.clave;
            const ruta = {
                eco: it.info.eco || clave, origen, destino, destinoTexto: txt,
                coords, acum: pre.acum, total: pre.total,
                distancia: calc.distancia || pre.total, duracion: calc.duracion || null,
                modo: calc.modo, creada: Date.now()
            };
            APP.rutas[clave] = ruta;
            guardarRutas();
            resetEstadoRuta(clave);
            advice('Ruta creada', Math.round(ruta.total / 1000) + ' km · ' + ruta.modo);
            if (APP.tab === 'rutas') paintRutas();
            return ruta;
        } catch (e) {
            advice('Error de ruta', (e && e.message) || 'sin conexion');
            return null;
        }
    }
    function eliminarRuta(eco) {
        if (!eco) return false;
        const it = unitByEco(eco);
        const clave = it ? it.info.clave : eco;
        if (APP.rutas[clave] || APP.rutas[eco]) {
            delete APP.rutas[clave];
            delete APP.rutas[eco];
            guardarRutas();
            if (it) resetEstadoRuta(clave);
            if (APP.tab === 'rutas') paintRutas();
            return true;
        }
        return false;
    }
    function descargarJSON(obj, nombre, tipo) {
        const a = makeEl('a', { href: URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: tipo || 'application/geo+json;charset=utf-8;' })) });
        a.download = nombre;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }
    function exportRutaGeoJSON(eco) {
        const it = unitByEco(eco);
        const r = it ? rutaDe(it.info) : null;
        if (!r) { advice('Sin ruta', eco); return; }
        const geojson = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: { tipo: 'ruta', eco, modo: r.modo, distancia_m: Math.round(r.total) }, geometry: { type: 'LineString', coordinates: r.coords } },
                { type: 'Feature', properties: { tipo: 'origen' }, geometry: { type: 'Point', coordinates: [r.origen.lon, r.origen.lat] } },
                { type: 'Feature', properties: { tipo: 'destino', texto: r.destinoTexto || '' }, geometry: { type: 'Point', coordinates: [r.destino.lon, r.destino.lat] } }
            ]
        };
        descargarJSON(geojson, 'hjp_ruta_' + eco + '_' + new Date().toISOString().slice(0, 10) + '.geojson');
        advice('Ruta exportada', Math.round(r.total / 1000) + ' km');
    }
    function registrarTraza(info, st) {
        if (!APP.config.trazado || !st.online || st.lat == null) return;
        const k = info.eco || info.placa || String(info.id);
        if (!k) return;
        const arr = APP.trazas[k] || (APP.trazas[k] = []);
        const ult = arr[arr.length - 1];
        if (ult && haversine(ult.lat, ult.lon, st.lat, st.lon) < 20) return;
        arr.push({ t: st.t || Math.floor(Date.now() / 1000), lat: st.lat, lon: st.lon, v: Math.round(st.vel) });
        const max = Math.max(50, APP.config.trazadoMax || 500);
        if (arr.length > max) arr.splice(0, arr.length - max);
    }
    function trazaDe(info) {
        const k = info && (info.eco || info.placa || String(info.id));
        return (k && APP.trazas[k]) || [];
    }
    function exportTraza(eco) {
        const it = unitByEco(eco);
        const arr = it ? trazaDe(it.info) : [];
        if (!arr.length) { advice('Sin traza', 'Aun no hay puntos registrados'); return; }
        const geojson = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    eco, puntos: arr.length,
                    desde: new Date(arr[0].t * 1000).toISOString(),
                    hasta: new Date(arr[arr.length - 1].t * 1000).toISOString()
                },
                geometry: { type: 'LineString', coordinates: arr.map((p) => [p.lon, p.lat]) }
            }]
        };
        descargarJSON(geojson, 'hjp_traza_' + eco + '_' + new Date().toISOString().slice(0, 10) + '.geojson');
        advice('Traza exportada', arr.length + ' puntos');
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
    function limiteDe(info) {
        const e = info.eco, p = info.placa, i = String(info.id);
        const v = (e && APP.limites[e]) || (p && APP.limites[p]) || APP.limites[i];
        const n = Number(v);
        return (Number.isFinite(n) && n > 0) ? n : APP.config.velMax;
    }
    function setLimite(eco, val) {
        if (!eco) return;
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) APP.limites[eco] = n;
        else delete APP.limites[eco];
        writeJSON(LS.limites, APP.limites);
        refresh();
    }
    function unitByEco(eco) {
        if (!eco) return null;
        const u = APP.unidades.find((x) => {
            const info = parseUnitName(x);
            return info.eco === eco || info.placa === eco || String(info.id) === eco;
        });
        if (!u) return null;
        return { u, info: parseUnitName(u), st: unitState(u) };
    }
    function openMap(eco, kind) {
        const it = unitByEco(eco);
        if (!it || it.st.lat == null || it.st.lon == null) {
            advice('Sin ubicacion', 'La unidad no reporta coordenadas');
            return;
        }
        const lat = it.st.lat, lon = it.st.lon;
        const url = (kind === 'google')
            ? 'https://www.google.com/maps?q=' + lat + ',' + lon
            : 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=16/' + lat + '/' + lon;
        try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
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
    function hhmmMin(t) {
        const p = String(t == null ? '' : t).split(':');
        if (p.length < 2) return null;
        const h = parseInt(p[0], 10), m = parseInt(p[1], 10);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        const r = (h * 60 + m) % 1440;
        return r < 0 ? r + 1440 : r;
    }
    function inHorario() {
        const cfg = APP.config;
        if (!cfg.horario.on) return true;
        const a = hhmmMin(cfg.horario.desde);
        const b = hhmmMin(cfg.horario.hasta);
        if (a == null || b == null) return true;
        const d = new Date();
        const m = d.getHours() * 60 + d.getMinutes();
        // Rango normal (06:00-23:00) o rango nocturno que cruza medianoche (22:00-06:00).
        return (a <= b) ? (m >= a && m <= b) : (m >= a || m <= b);
    }
    function normEco(s) { return String(s || '').replace(/^0+/, '') || String(s || ''); }

    /* ====================== NOTIFICACIONES ====================== */
    function speak(text) {
        if (!APP.config.voice || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            const lang = APP.config.voiceLang || 'es-MX';
            u.lang = lang;
            u.rate = 1.05; u.pitch = 1.0;
            const pref = lang.slice(0, 2).toLowerCase();
            const voces = window.speechSynthesis.getVoices() || [];
            const voz = voces.find((v) => String(v.lang || '').toLowerCase().replace('_', '-') === lang.toLowerCase())
                || voces.find((v) => String(v.lang || '').toLowerCase().indexOf(pref) === 0);
            if (voz) u.voice = voz;
            window.speechSynthesis.speak(u);
        } catch (_) { /* noop */ }
    }
    function audioCtx() {
        try {
            const Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor) return null;
            return beep._ctx || (beep._ctx = new Ctor());
        } catch (_) { return null; }
    }
    function unlockAudio() {
        const ctx = audioCtx();
        if (ctx && ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (_) { /* noop */ } }
    }
    function beep(sev) {
        if (!APP.config.beep) return;
        try {
            const ctx = audioCtx();
            if (!ctx) return;
            if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (_) { /* noop */ } }
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'square';
            o.frequency.value = (sev === 'critico') ? 880 : (sev === 'alto') ? 660 : 440;
            g.gain.value = clamp(Number(APP.config.beepVol) || 0.06, 0, 1);
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
    function pruneCooldowns(ahora) {
        const keys = Object.keys(APP.cooldowns);
        if (keys.length < 500) return;
        const limite = (Number(APP.config.cooldownMin) || 45) * 60000;
        keys.forEach((k) => { if (ahora - APP.cooldowns[k] > limite) delete APP.cooldowns[k]; });
    }
    function pushAlert(alert) {
        if (APP.dismissed.has(alert.clave)) return;
        if (alert.soloHorario && !inHorario()) return;
        const ck = alert.clave + '::' + alert.regla;
        const ahora = Date.now();
        pruneCooldowns(ahora);
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
            '<span class="ico hjp-mi" style="color:' + color + '">' + item.icono + '</span>' +
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
            descoAlerta: prev ? prev.descoAlerta : false,
            desviadoDesde: prev ? prev.desviadoDesde : null,
            progMax: prev ? prev.progMax : 0,
            retornoAlerta: prev ? prev.retornoAlerta : false,
            rumboOpDesde: prev ? prev.rumboOpDesde : null,
            llego: prev ? prev.llego : false
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
        // Si la unidad vuelve a reportar, se rearma la alerta de desconexion
        // aunque la regla general de "sin senal" este desactivada.
        if (st.estado !== 'offline') R.descoAlerta = false;

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

        // h) Exceso de velocidad (limite global o por unidad)
        if (APP.config.reglas.velocidad && st.online) {
            const lim = limiteDe(info);
            if (st.vel > lim) {
                pushAlert({
                    regla: 'velocidad', sev: 'medio', clave, eco: info.eco, soloHorario: true,
                    titulo: 'EXCESO DE VELOCIDAD · ' + etq,
                    detalle: Math.round(st.vel) + ' km/h (limite ' + lim + ')',
                    hablar: 'La unidad ' + etq + ' excede la velocidad'
                });
            }
        }

        // i) Ruta: desvio, retorno/viaje cancelado y giro en U
        const ruta = rutaDe(info);
        const sigueRuta = APP.config.reglas.desvio || APP.config.reglas.retorno || APP.config.reglas.giroU;
        if (ruta && sigueRuta && st.online && st.lat != null) {
            const s = snapRuta(st.lat, st.lon, ruta);
            if (s) {
                R.rutaDist = Math.round(s.dist);
                R.rutaProg = s.progreso;

                if (APP.config.reglas.desvio) {
                    if (s.dist > APP.config.desvioM) {
                        if (!R.desviadoDesde) R.desviadoDesde = Date.now() / 1000;
                        const m = (Date.now() / 1000 - R.desviadoDesde) / 60;
                        if (m >= APP.config.desvioMin) {
                            pushAlert({
                                regla: 'desvio', sev: 'alto', clave, eco: info.eco,
                                titulo: 'DESVIO DE RUTA · ' + etq,
                                detalle: Math.round(s.dist) + ' m de la ruta · ' + Math.round(m) + ' min',
                                hablar: 'Atencion, la unidad ' + etq + ' se ha desviado de la ruta'
                            });
                        }
                    } else {
                        R.desviadoDesde = null;
                    }
                }

                if (APP.config.reglas.retorno) {
                    if (s.progreso > (R.progMax || 0)) R.progMax = s.progreso;
                    const dOrigen = haversine(st.lat, st.lon, ruta.origen.lat, ruta.origen.lon);
                    const dDestino = haversine(st.lat, st.lon, ruta.destino.lat, ruta.destino.lon);
                    const retrocedio = (R.progMax - s.progreso) >= (APP.config.retornoPct / 100);
                    const enOrigen = dOrigen <= APP.config.retornoM && R.progMax >= 0.2;
                    if (dDestino <= APP.config.retornoM && s.progreso >= 0.85) {
                        if (!R.llego) {
                            R.llego = true;
                            R.retornoAlerta = false;
                            pushAlert({
                                regla: 'destino', sev: 'ok', clave, eco: info.eco,
                                titulo: 'LLEGO A DESTINO · ' + etq,
                                detalle: ruta.destinoTexto ? 'en ' + ruta.destinoTexto : 'en el punto de destino',
                                hablar: 'La unidad ' + etq + ' llego a su destino'
                            });
                        }
                    }
                    if (!R.retornoAlerta && !R.llego && R.progMax >= 0.15 && (enOrigen || retrocedio)) {
                        R.retornoAlerta = true;
                        pushAlert({
                            regla: 'retorno', sev: 'critico', clave, eco: info.eco,
                            titulo: 'POSIBLE VIAJE CANCELADO · ' + etq,
                            detalle: (enOrigen ? 'volvio al origen' : 'retrocedio ' + Math.round((R.progMax - s.progreso) * 100) + '%') +
                                ' · avance max ' + Math.round(R.progMax * 100) + '%',
                            hablar: 'Atencion, la unidad ' + etq + ' regreso. El viaje puede estar cancelado'
                        });
                    }
                }

                if (APP.config.reglas.giroU && st.vel > 10) {
                    const dif = difAngulo(st.curso || 0, s.rumbo);
                    if (dif > APP.config.giroGrados) {
                        if (!R.rumboOpDesde) R.rumboOpDesde = Date.now() / 1000;
                        const m = (Date.now() / 1000 - R.rumboOpDesde) / 60;
                        if (m >= APP.config.giroMin) {
                            pushAlert({
                                regla: 'giroU', sev: 'medio', clave, eco: info.eco, soloHorario: true,
                                titulo: 'GIRO EN U · ' + etq,
                                detalle: 'rumbo opuesto a la ruta (' + Math.round(dif) + ' grados)',
                                hablar: 'La unidad ' + etq + ' hizo un giro en U'
                            });
                        }
                    } else {
                        R.rumboOpDesde = null;
                    }
                }
            }
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
                registrarTraza(info, st);
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
            revalidarContornos();
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
    // Devuelve true si el elemento pertenece a la UI del propio script (panel,
    // barra, modales, etc.), para no confundirlo con el DOM nativo de Wialon.
    function esUIPropia(el) {
        try {
            return !!(el && el.closest && el.closest('#hjp-panel,#hjp-barra,#hjp-modal,#hjp-config,#hjp-ayuda,#hjp-contexto,#hjp-toasts,#hjp-aviso,#hjp-rail'));
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
        revalidarContornos();
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
        btn.innerHTML = '<span class="hjp-mi">' + ICO.alto + '</span> Confirmar';
        btn.classList.add('armado');
        btn.title = 'Pulsa otra vez para cerrar todas las ventanas';
        clearTimeout(btn._tArmado);
        btn._tArmado = setTimeout(() => { delete btn.dataset.armado; restaurarBotonCerrar(btn); }, 4000);
    }
    function restaurarBotonCerrar(btn) {
        if (!btn) return;
        btn.classList.remove('armado');
        if (btn.dataset.prevHtml) btn.innerHTML = btn.dataset.prevHtml;
        if (btn.id === 'hjp-btn-close') btn.title = 'Cerrar todas las ventanas de unidades';
        if (btn.id === 'hjp-sb-close') btn.title = 'Cerrar todas las ventanas de unidades';
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
                b.innerHTML = '<span class="hjp-mi">' + ICO.automatizar + '</span> Buscando (' + (i + 1) + '/' + ecos.length + ')...';
                b.style.background = 'linear-gradient(135deg,#f57c00,#ff9800)';
            }
            await openUnitWindow(ecos[i]);
            await sleep(250);
        }
        const inp = findSearchInput();
        if (inp) clearInput(inp);
        const b = byId('hjp-btn-main');
        if (b) {
            b.innerHTML = '<span class="hjp-mi">' + ICO.panel + '</span> Organizando...';
            b.style.background = 'var(--hjp-accent-grad)';
        }
        await sleep(400);
        await organizeWindows();
        await verifyWindows(true);
        resetMainBtn();
    }
    function resetMainBtn() {
        mainBtn.innerHTML = '<span class="hjp-mi">' + ICO.automatizar + '</span> Automatizar Unidades';
        mainBtn.style.background = '';
    }

    /* ====================== TEMA / NO MOLESTAR ====================== */
    function aclarar(hex, f) {
        const h = String(hex || '').replace('#', '');
        if (h.length !== 6) return hex;
        const n = parseInt(h, 16);
        const mix = (x) => Math.round(x + (255 - x) * f);
        return '#' + [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)]
            .map((x) => x.toString(16).padStart(2, '0')).join('');
    }
    function hexToRgb(hex) {
        const h = String(hex || '').replace('#', '');
        if (h.length !== 6) return null;
        const n = parseInt(h, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function applyTheme() {
        const c = APP.config;
        const theme = (c.theme === 'auto')
            ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro')
            : c.theme;
        if (theme === 'claro') document.body.setAttribute('data-hjp-theme', 'claro');
        else document.body.removeAttribute('data-hjp-theme');
        const ti = document.querySelector('#hjp-tema .hjp-mi');
        if (ti) ti.textContent = (theme === 'claro') ? ICO.sol : ICO.luna;
        const btnTema = byId('hjp-tema');
        if (btnTema) btnTema.title = 'Tema: ' + theme;
        if (c.acento) {
            const a2 = aclarar(c.acento, 0.28);
            document.documentElement.style.setProperty('--hjp-accent', c.acento);
            document.documentElement.style.setProperty('--hjp-accent-2', a2);
            document.documentElement.style.setProperty('--hjp-accent-grad', 'linear-gradient(135deg,' + c.acento + ',' + a2 + ')');
            const rgb = hexToRgb(c.acento);
            if (rgb) document.documentElement.style.setProperty('--hjp-accent-rgb', rgb.r + ',' + rgb.g + ',' + rgb.b);
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
            "  --hjp-bg:#1f2330; --hjp-bg-soft:#272d3c; --hjp-bg-strong:#313849;\n" +
            "  --hjp-border:#3a4252; --hjp-border-soft:#2f3645;\n" +
            "  --hjp-fg:#e8ecf3; --hjp-fg-dim:#9aa4b5; --hjp-fg-mute:#6f7888;\n" +
            "  --hjp-accent:#850D22; --hjp-accent-2:#B52C44;\n" +
            "  --hjp-ok:#43a047; --hjp-ok-fg:#a5d6a7; --hjp-ok-bg:#1b3320;\n" +
            "  --hjp-warn:#f9a825; --hjp-warn-fg:#ffe082; --hjp-warn-bg:#33270e;\n" +
            "  --hjp-bad:#e53935; --hjp-bad-fg:#ef9a9a; --hjp-bad-bg:#2b1010;\n" +
            "  --hjp-shadow:0 4px 14px rgba(0,0,0,.32);\n" +
            "  --hjp-radius:10px;\n" +
            "  --hjp-radius-sm:7px;\n" +
            "  --hjp-accent-grad:linear-gradient(135deg,#950f27,#B52C44);\n" +
            "  --hjp-elev:0 10px 26px rgba(0,0,0,.42);\n" +
            "  --hjp-font:'Inter','Roboto','Segoe UI','Helvetica Neue',Arial,sans-serif;\n" +
            "  --hjp-easing:cubic-bezier(.4,0,.2,1);\n" +
            "}\n" +
            "body[data-hjp-theme='claro']{\n" +
            "  --hjp-bg:#f5f7fa; --hjp-bg-soft:#ffffff; --hjp-bg-strong:#eef2f7;\n" +
            "  --hjp-border:#dfe4ec; --hjp-border-soft:#ebeef3;\n" +
            "  --hjp-fg:#1d2433; --hjp-fg-dim:#5b6577; --hjp-fg-mute:#8993a3;\n" +
            "  --hjp-accent:#850D22; --hjp-accent-2:#B52C44;\n" +
            "  --hjp-ok:#2e7d32; --hjp-ok-fg:#1b5e20; --hjp-ok-bg:#e8f5e9;\n" +
            "  --hjp-warn:#f9a825; --hjp-warn-fg:#8d6b00; --hjp-warn-bg:#fff4d4;\n" +
            "  --hjp-bad:#c62828; --hjp-bad-fg:#b71c1c; --hjp-bad-bg:#fde2e2;\n" +
            "  --hjp-shadow:0 2px 8px rgba(20,30,50,.10);\n" +
            "  --hjp-elev:0 8px 22px rgba(20,30,50,.16);\n" +
            "}\n" +
            "#hjp-toasts{position:fixed;bottom:20px;right:15px;z-index:1000002;display:flex;flex-direction:column;gap:8px;width:330px;pointer-events:none;transition:opacity .2s}\n" +
            ".hjp-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:9px;background:var(--hjp-bg-soft);color:var(--hjp-fg);\n" +
            "  border-left:4px solid var(--hjp-accent);border-radius:var(--hjp-radius);padding:10px 12px;box-shadow:var(--hjp-shadow);\n" +
            "  font:12.5px/1.35 var(--hjp-font);animation:hjpIn .28s var(--hjp-easing) both}\n" +
            ".hjp-toast.sale{opacity:0;transform:translateX(40px);transition:all .35s var(--hjp-easing)}\n" +
            "@keyframes hjpIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}\n" +
            ".hjp-toast .ico{font-size:18px;line-height:1;width:18px;text-align:center}\n" +
            ".hjp-toast .cuerpo{display:flex;flex-direction:column;flex:1;min-width:0}\n" +
            ".hjp-toast .cuerpo b{font-size:12.5px}\n" +
            ".hjp-toast .cuerpo span{color:var(--hjp-fg-dim);font-size:11.5px;margin-top:2px}\n" +
            ".hjp-toast .hora{color:var(--hjp-fg-mute);font-size:10px}\n" +
            ".hjp-toast .mini{background:transparent;border:none;color:var(--hjp-fg-mute);cursor:pointer;font-size:11px}\n" +
            "#hjp-barra{position:fixed;top:80px;right:15px;z-index:999999;display:flex;flex-wrap:wrap;row-gap:4px;align-items:center;gap:6px;\n" +
            "  background:rgba(28,30,36,.94);border:1px solid var(--hjp-border);border-radius:10px;padding:5px;\n" +
            "  box-shadow:var(--hjp-shadow);font:12px var(--hjp-font);user-select:none;touch-action:none;max-width:95vw}\n" +
            "#hjp-barra.vertical{flex-direction:column;align-items:stretch}\n" +
            "#hjp-barra .hjp-grip{cursor:grab;color:var(--hjp-fg-mute);padding:0 3px;font-size:15px;line-height:1;letter-spacing:-2px;user-select:none}\n" +
            "#hjp-barra .hjp-grip:active{cursor:grabbing}\n" +
            "#hjp-barra .hjp-btn{display:inline-flex;align-items:center;gap:4px;background:var(--hjp-bg-strong);color:var(--hjp-fg);border:1px solid var(--hjp-border-soft);border-radius:var(--hjp-radius-sm);padding:7px 11px;\n" +
            "  cursor:pointer;font:600 12px var(--hjp-font);white-space:nowrap;transition:filter .15s,transform .1s,box-shadow .15s}\n" +
            "#hjp-barra .hjp-btn:hover{filter:brightness(1.15);transform:translateY(-1px);box-shadow:var(--hjp-shadow)}\n" +
            "#hjp-barra .hjp-btn:active{transform:translateY(0)}\n" +
            "#hjp-barra .hjp-fold{background:var(--hjp-bg);color:var(--hjp-fg-dim);padding:4px 9px}\n" +
            "#hjp-barra.plegada .hjp-btn:not(.hjp-fold){display:none}\n" +
            "#hjp-btn-main,#hjp-btn-panel,#hjp-btn-modo{background:var(--hjp-accent-grad);color:#fff;border-color:transparent}\n" +
            "#hjp-btn-close{background:var(--hjp-bg-strong);color:var(--hjp-fg-dim)}\n" +
            "#hjp-btn-update{background:linear-gradient(135deg,#2e7d32,#43a047);color:#fff;border-color:transparent;box-shadow:0 0 0 0 rgba(67,160,71,.5);animation:hjpPulseGreen 2s infinite}\n" +
            "#hjp-panel .hjp-tile.armado,#hjp-barra .hjp-btn.armado{background:linear-gradient(135deg,#b71c1c,#e53935)!important;color:#fff!important;border-color:transparent!important;animation:hjpArmPulse .7s ease infinite}\n" +
            "@keyframes hjpArmPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}\n" +
            "@keyframes hjpPulseGreen{0%{box-shadow:0 0 0 0 rgba(67,160,71,.55)}70%{box-shadow:0 0 0 9px rgba(67,160,71,0)}100%{box-shadow:0 0 0 0 rgba(67,160,71,0)}}\n" +
            "#hjp-panel .hjp-iconbtn.warn{color:var(--hjp-warn)}\n" +
            "#hjp-panel{position:fixed;left:10px;bottom:10px;width:470px;height:440px;display:none;flex-direction:column;\n" +
            "  background:var(--hjp-bg);color:var(--hjp-fg);font:12.5px/1.4 var(--hjp-font);border:1px solid var(--hjp-border);border-radius:var(--hjp-radius);\n" +
            "  box-shadow:var(--hjp-elev);z-index:1000000;overflow:hidden;resize:both;min-width:360px;min-height:260px;max-width:1000px;max-height:92vh;\n" +
            "  transition:transform .3s var(--hjp-easing),opacity .2s ease,border-color .2s}\n" +
            "#hjp-panel.visible{opacity:1}\n" +
            "#hjp-panel.lateral{left:auto;right:0;top:0;bottom:0;height:100vh;max-height:100vh;border-radius:0;resize:none;\n" +
            "  box-shadow:-14px 0 34px rgba(0,0,0,.35);border-top:none;border-bottom:none;border-right:none;will-change:transform}\n" +
            "#hjp-panel.lateral.izquierda{left:0;right:auto;box-shadow:14px 0 34px rgba(0,0,0,.35);border-left:none;border-right:1px solid var(--hjp-border)}\n" +
            "#hjp-panel.lateral header{cursor:default}\n" +
            "#hjp-panel.lateral.oculto{transform:translateX(100%);opacity:0;pointer-events:none}\n" +
            "#hjp-panel.lateral.izquierda.oculto{transform:translateX(-100%)}\n" +
            "#hjp-panel.dragging{transition:none;opacity:1}\n" +
            "#hjp-rail{position:fixed;top:50%;transform:translateY(-50%);width:34px;height:104px;background:var(--hjp-accent-grad);\n" +
            "  border:none;border-radius:17px;display:none;align-items:center;justify-content:center;flex-direction:column;gap:2px;\n" +
            "  cursor:pointer;z-index:999999;box-shadow:var(--hjp-elev);color:#fff;font:600 15px var(--hjp-font);\n" +
            "  opacity:0;transition:transform .25s var(--hjp-easing),opacity .25s ease,filter .15s}\n" +
            "#hjp-rail:hover{transform:translateY(-50%) scale(1.08);filter:brightness(1.12)}\n" +
            "#hjp-rail.mostrar{display:flex;opacity:1;animation:hjpRailIn .3s var(--hjp-easing)}\n" +
            "#hjp-rail .hjp-rail-txt{writing-mode:vertical-rl;text-orientation:mixed;font-size:9px;letter-spacing:1.5px;opacity:.85}\n" +
            "#hjp-rail.derecha{right:0;border-radius:17px 0 0 17px;padding-right:2px}\n" +
            "#hjp-rail.izquierda{left:0;border-radius:0 17px 17px 0;padding-left:2px}\n" +
            "@keyframes hjpRailIn{from{opacity:0;transform:translateY(-50%) scale(.8)}to{opacity:1;transform:translateY(-50%) scale(1)}}\n" +
            ".hjp-mi{font-family:'Material Icons','Material Symbols Outlined';font-weight:normal;font-style:normal;font-size:1.1em;line-height:1;vertical-align:-2px;display:inline-block;text-transform:none;letter-spacing:normal;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}\n" +
            "#hjp-barra .hjp-btn .hjp-mi{font-size:1.05em;vertical-align:-2px;margin-right:1px}\n" +
            "#hjp-panel header{display:flex;align-items:center;gap:4px;padding:8px 10px;background:linear-gradient(180deg,var(--hjp-bg-strong),var(--hjp-bg-soft));cursor:move;border-bottom:1px solid var(--hjp-border-soft);flex-wrap:wrap;box-shadow:0 1px 0 rgba(255,255,255,.03)}\n" +
            "#hjp-panel header h3{margin:0 6px 0 2px;font-size:13px;flex:1;letter-spacing:.2px;font-weight:700;min-width:110px}\n" +
            "#hjp-panel .hjp-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;background:transparent;border:1px solid transparent;color:var(--hjp-fg-dim);cursor:pointer;border-radius:var(--hjp-radius-sm);font-size:13px;line-height:1;transition:background .15s var(--hjp-easing),color .15s,transform .1s,box-shadow .15s}\n" +
            "#hjp-panel .hjp-iconbtn:hover{background:var(--hjp-bg);border-color:var(--hjp-border);color:var(--hjp-fg);transform:translateY(-1px);box-shadow:var(--hjp-shadow)}\n" +
            "#hjp-panel .hjp-iconbtn:active{transform:translateY(0)}\n" +
            "#hjp-panel .hjp-iconbtn.activo{background:var(--hjp-accent-grad);color:#fff;border-color:transparent;box-shadow:0 3px 10px rgba(var(--hjp-accent-rgb),.4)}\n" +
            "#hjp-panel .tabs{display:flex;gap:4px;background:var(--hjp-bg-soft);padding:6px 8px;border-bottom:1px solid var(--hjp-border-soft)}\n" +
            "#hjp-panel .tab{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:4px;background:transparent;border:1px solid transparent;color:var(--hjp-fg-dim);padding:8px 4px;cursor:pointer;font:600 11.5px/1 var(--hjp-font);border-radius:var(--hjp-radius-sm);letter-spacing:.2px;transition:background .18s var(--hjp-easing),color .18s,box-shadow .18s,transform .1s}\n" +
            "#hjp-panel .tab .etqt{font-size:11px;letter-spacing:.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#hjp-panel .tab:hover{color:var(--hjp-fg);background:var(--hjp-bg-strong);transform:translateY(-1px)}\n" +
            "#hjp-panel .tab.activo{color:#fff;background:var(--hjp-accent-grad);box-shadow:0 3px 10px rgba(var(--hjp-accent-rgb),.35)}\n" +
            "#hjp-panel .tab .contador{font-size:10px;background:var(--hjp-bg-strong);color:var(--hjp-fg-dim);padding:1px 5px;border-radius:8px;margin-left:2px;display:inline-block;font-weight:700}\n" +
            "#hjp-panel .tab.activo .contador{background:rgba(255,255,255,.25);color:#fff}\n" +
            "#hjp-panel .tools{display:flex;gap:6px;padding:7px 9px;border-bottom:1px solid var(--hjp-border-soft);flex-wrap:wrap;align-items:center;background:var(--hjp-bg-soft)}\n" +
            "#hjp-panel .tools button{display:inline-flex;align-items:center;gap:4px;background:var(--hjp-bg-strong);color:var(--hjp-fg);border:1px solid var(--hjp-border-soft);border-radius:var(--hjp-radius-sm);padding:5px 9px;cursor:pointer;font-size:11px;font-weight:600;transition:background .15s,transform .1s,box-shadow .15s,border-color .15s}\n" +
            "#hjp-panel .tools button:hover{background:var(--hjp-bg);border-color:var(--hjp-fg-mute);transform:translateY(-1px);box-shadow:var(--hjp-shadow)}\n" +
            "#hjp-panel .tools button:active{transform:translateY(0)}\n" +
            "#hjp-panel .tools button.activo{background:var(--hjp-accent-grad);color:#fff;border-color:transparent}\n" +
            "#hjp-panel input.filtro{flex:1;min-width:90px;background:var(--hjp-bg);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:6px;padding:4px 7px;font-size:12px}\n" +
            "#hjp-panel input.filtro:focus{outline:none;border-color:var(--hjp-accent-2)}\n" +
            "#hjp-panel select.filtro{flex:0 0 auto;background:var(--hjp-bg);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:6px;padding:4px 7px;font-size:12px}\n" +
            "#hjp-panel select.filtro:focus{outline:none;border-color:var(--hjp-accent-2)}\n" +
            "#hjp-panel .severidad-pick{display:flex;gap:3px;align-items:center;padding:6px 9px;background:var(--hjp-bg-soft);border-bottom:1px solid var(--hjp-border-soft)}\n" +
            "#hjp-panel .severidad-pick span{cursor:pointer;padding:2px 6px;border-radius:5px;font:600 11px var(--hjp-font);border:1px solid var(--hjp-border);color:var(--hjp-fg-dim)}\n" +
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
            "#hjp-panel .mini{display:inline-flex;align-items:center;justify-content:center;gap:3px;background:var(--hjp-bg-strong);border:1px solid var(--hjp-border-soft);color:var(--hjp-fg-dim);border-radius:var(--hjp-radius-sm);cursor:pointer;padding:3px 8px;font-size:11px;transition:background .15s,color .15s,transform .1s,border-color .15s}\n" +
            "#hjp-panel .mini:hover{background:var(--hjp-bg);color:var(--hjp-fg);border-color:var(--hjp-fg-mute);transform:translateY(-1px)}\n" +
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
            "#hjp-panel .kpi .valor{font:600 18px/1 var(--hjp-font);color:var(--hjp-fg)}\n" +
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
            "#hjp-modal,#hjp-config,#hjp-ayuda,#hjp-contexto{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--hjp-bg-soft);padding:14px;\n" +
            "  border-radius:10px;box-shadow:var(--hjp-shadow);z-index:1000001;display:none;flex-direction:column;gap:10px;\n" +
            "  width:340px;color:var(--hjp-fg);font:13px var(--hjp-font);border:1px solid var(--hjp-border)}\n" +
            "#hjp-modal{width:520px;max-height:88vh;overflow:hidden;padding:0}\n" +
            "#hjp-modal > h3{padding:12px 14px 6px}\n" +
            "#hjp-modal > p{padding:0 14px 8px}\n" +
            "#hjp-modal > textarea{margin:0 14px 0;width:calc(100% - 28px);height:88px}\n" +
            "#hjp-modal .hjp-modal-actions{display:flex;gap:6px;padding:6px 14px 0}\n" +
            "#hjp-modal .hjp-modal-actions button{background:var(--hjp-bg);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:6px;padding:4px 10px;cursor:pointer;font:11.5px var(--hjp-font)}\n" +
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
            "#hjp-ayuda{width:620px;max-width:94vw;max-height:88vh;overflow:hidden;padding:0}\n" +
            "#hjp-ayuda .cfg-head{display:flex;align-items:center;gap:6px;padding:10px 12px;background:var(--hjp-bg);border-bottom:1px solid var(--hjp-border-soft);border-radius:10px 10px 0 0}\n" +
            "#hjp-ayuda .cfg-head h3{margin:0;flex:1;font-size:13px}\n" +
            "#hjp-ayuda .ayuda-body{overflow:auto;padding:12px 14px;max-height:calc(88vh - 60px)}\n" +
            "#hjp-ayuda h4{margin:12px 0 6px;font-size:11px;color:var(--hjp-accent-2);text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid var(--hjp-border-soft);padding-bottom:4px}\n" +
            "#hjp-ayuda h4:first-child{margin-top:0}\n" +
            "#hjp-ayuda p,#hjp-ayuda li{font-size:12.5px;color:var(--hjp-fg);margin:4px 0}\n" +
            "#hjp-ayuda ul{margin:4px 0 4px 18px;padding:0}\n" +
            "#hjp-ayuda code,#hjp-ayuda kbd{background:var(--hjp-bg);padding:1px 5px;border-radius:4px;font:11.5px monospace;color:var(--hjp-accent-2);border:1px solid var(--hjp-border-soft)}\n" +
            "#hjp-ayuda .pasos{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:6px}\n" +
            "#hjp-ayuda .paso{background:var(--hjp-bg);border:1px solid var(--hjp-border);border-radius:8px;padding:9px 11px}\n" +
            "#hjp-ayuda .paso b{display:block;color:var(--hjp-accent-2);font-size:12px;margin-bottom:3px}\n" +
            "#hjp-ayuda .cfg-foot{display:flex;justify-content:space-between;gap:8px;padding:9px 12px;background:var(--hjp-bg);border-top:1px solid var(--hjp-border-soft);border-radius:0 0 10px 10px}\n" +
            "#hjp-ayuda .hjp-iconbtn{background:transparent;border:1px solid transparent;color:var(--hjp-fg-dim);cursor:pointer;border-radius:6px;padding:3px 7px;font-size:13px;line-height:1}\n" +
            "#hjp-ayuda .hjp-iconbtn:hover{background:var(--hjp-bg-strong);border-color:var(--hjp-border);color:var(--hjp-fg)}\n" +
            "#hjp-ayuda button.accbtn{background:var(--hjp-accent-grad);color:#fff;border:none;border-radius:var(--hjp-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--hjp-font);transition:transform .12s,box-shadow .15s,filter .15s}\n" +
            "#hjp-ayuda button.accbtn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(var(--hjp-accent-rgb),.4);filter:brightness(1.05)}\n" +
            "#hjp-ayuda button.cancel{background:var(--hjp-bg-strong);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:var(--hjp-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--hjp-font);transition:background .15s,transform .12s}\n" +
            "#hjp-ayuda button.cancel:hover{background:var(--hjp-bg);transform:translateY(-1px)}\n" +
            "#hjp-config .cfg-head{display:flex;align-items:center;gap:6px;padding:10px 12px;background:var(--hjp-bg);border-bottom:1px solid var(--hjp-border-soft);border-radius:10px 10px 0 0}\n" +
            "#hjp-config .cfg-head h3{margin:0;flex:1;font-size:13px}\n" +
            "#hjp-config .cfg-tabs{display:flex;background:var(--hjp-bg);padding:0 10px;border-bottom:1px solid var(--hjp-border-soft);gap:6px;flex-wrap:wrap}\n" +
            "#hjp-config .cfg-tab{background:transparent;border:none;color:var(--hjp-fg-dim);padding:9px 12px;cursor:pointer;font:600 11.5px var(--hjp-font);border-bottom:2px solid transparent;letter-spacing:.4px;text-transform:uppercase}\n" +
            "#hjp-config .cfg-tab.activo{color:var(--hjp-fg);border-bottom-color:var(--hjp-accent-2)}\n" +
            "#hjp-config .cfg-body{overflow:auto;padding:12px;max-height:calc(88vh - 110px)}\n" +
            "#hjp-config .cfg-body h4{margin:8px 0 6px;font-size:11px;color:var(--hjp-accent-2);text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid var(--hjp-border-soft);padding-bottom:4px}\n" +
            "#hjp-config .cfg-body h4:first-child{margin-top:0}\n" +
            "#hjp-config label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0}\n" +
            "#hjp-config label.full{display:block}\n" +
            "#hjp-config input[type=number],#hjp-config input[type=text],#hjp-config input[type=time],\n" +
            "#hjp-config input[type=color],#hjp-config textarea,#hjp-config select{background:var(--hjp-bg);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:5px;padding:4px 7px;font:12px var(--hjp-font)}\n" +
            "#hjp-config input[type=number],#hjp-config input[type=text],#hjp-config input[type=time]{width:90px}\n" +
            "#hjp-config input[type=color]{width:55px;padding:0;height:30px}\n" +
            "#hjp-config textarea{width:100%;height:90px;font:11.5px monospace;resize:vertical;box-sizing:border-box}\n" +
            "#hjp-config .cfg-foot{display:flex;justify-content:space-between;gap:8px;padding:9px 12px;background:var(--hjp-bg);border-top:1px solid var(--hjp-border-soft);border-radius:0 0 10px 10px}\n" +
            "#hjp-config .row-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px}\n" +
            "#hjp-config .row-grid label{padding:1px 0}\n" +
            "#hjp-config button.accbtn{background:var(--hjp-accent-grad);color:#fff;border:none;border-radius:var(--hjp-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--hjp-font);transition:transform .12s,box-shadow .15s,filter .15s}\n" +
            "#hjp-config button.accbtn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(var(--hjp-accent-rgb),.4);filter:brightness(1.05)}\n" +
            "#hjp-config button.cancel{background:var(--hjp-bg-strong);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:var(--hjp-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--hjp-font);transition:background .15s,transform .12s}\n" +
            "#hjp-config button.cancel:hover{background:var(--hjp-bg);transform:translateY(-1px)}\n" +
            "#hjp-modal textarea{width:100%;height:160px;resize:none;padding:10px;border-radius:6px;border:1px solid var(--hjp-border);background:var(--hjp-bg);color:var(--hjp-fg);box-sizing:border-box;font:12px monospace}\n" +
            "#hjp-modal h3{margin:0;text-align:center;font-size:13px;color:var(--hjp-fg)}\n" +
            "#hjp-modal button.accbtn{background:var(--hjp-accent-grad);color:#fff;border:none;border-radius:var(--hjp-radius-sm);padding:8px 16px;cursor:pointer;font:600 12px var(--hjp-font);transition:transform .12s,box-shadow .15s,filter .15s}\n" +
            "#hjp-modal button.accbtn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(var(--hjp-accent-rgb),.4);filter:brightness(1.05)}\n" +
            "#hjp-modal button.cancel{background:var(--hjp-bg-strong);color:var(--hjp-fg);border:1px solid var(--hjp-border);border-radius:var(--hjp-radius-sm);padding:8px 16px;cursor:pointer;font:600 12px var(--hjp-font);transition:background .15s,transform .12s}\n" +
            "#hjp-modal button.cancel:hover{background:var(--hjp-bg);transform:translateY(-1px)}\n" +
            "#hjp-contexto{padding:4px;gap:0;width:auto;min-width:170px}\n" +
            "#hjp-contexto .op{padding:7px 12px;cursor:pointer;font-size:12.5px;border-bottom:1px solid var(--hjp-border-soft);display:flex;align-items:center;gap:8px}\n" +
            "#hjp-contexto .op .hjp-mi{color:var(--hjp-accent-2);font-size:1.15em}\n" +
            "#hjp-contexto .op:last-child{border-bottom:none}\n" +
            "#hjp-contexto .op:hover{background:var(--hjp-bg-strong)}\n" +
            "#hjp-contexto .sep{height:1px;background:var(--hjp-border-soft);margin:2px 0}\n" +
            ".hjp-acciones{display:flex;justify-content:space-between;gap:8px}\n" +
            "#hjp-aviso{position:fixed;top:5px;left:50%;transform:translateX(-50%);background:var(--hjp-bad);color:#fff;padding:6px 16px;\n" +
            "  border-radius:5px;z-index:1000002;font:12px var(--hjp-font);display:none;box-shadow:var(--hjp-shadow)}\n" +
            "body.hjp-lateral #hjp-barra{display:none}\n" +
            "#hjp-panel .hjp-sidebar-tools{display:none;gap:8px;padding:10px;background:linear-gradient(180deg,var(--hjp-bg-strong),var(--hjp-bg-soft));border-bottom:1px solid var(--hjp-border-soft)}\n" +
            "#hjp-panel.lateral .hjp-sidebar-tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(76px,1fr));border-top:3px solid var(--hjp-accent)}\n" +
            "#hjp-panel .hjp-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-width:0;overflow:hidden;padding:11px 6px;border-radius:var(--hjp-radius);background:var(--hjp-bg-soft);border:1px solid var(--hjp-border-soft);color:var(--hjp-fg);cursor:pointer;font:600 10.5px var(--hjp-font);transition:background .16s var(--hjp-easing),transform .12s,box-shadow .16s,border-color .16s}\n" +
            "#hjp-panel .hjp-tile:hover{background:var(--hjp-bg);border-color:var(--hjp-fg-mute);transform:translateY(-2px);box-shadow:var(--hjp-shadow)}\n" +
            "#hjp-panel .hjp-tile:active{transform:translateY(0)}\n" +
            "#hjp-panel .hjp-tile .hjp-mi{font-size:21px;color:var(--hjp-accent-2);line-height:1}\n" +
            "#hjp-panel .hjp-tile .tile-lbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:center}\n" +
            "#hjp-panel .hjp-tile.primary{background:var(--hjp-accent-grad);border-color:transparent;color:#fff;box-shadow:0 4px 12px rgba(var(--hjp-accent-rgb),.35)}\n" +
            "#hjp-panel .hjp-tile.primary .hjp-mi{color:#fff}\n" +
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
            "#hjp-panel table th:first-child{padding-left:10px}\n" +
            "#hjp-panel ::-webkit-scrollbar,#hjp-config ::-webkit-scrollbar,#hjp-modal ::-webkit-scrollbar,#hjp-ayuda ::-webkit-scrollbar{width:9px;height:9px}\n" +
            "#hjp-panel ::-webkit-scrollbar-thumb,#hjp-config ::-webkit-scrollbar-thumb,#hjp-modal ::-webkit-scrollbar-thumb,#hjp-ayuda ::-webkit-scrollbar-thumb{background:var(--hjp-border);border-radius:8px;border:2px solid transparent;background-clip:content-box}\n" +
            "#hjp-panel ::-webkit-scrollbar-thumb:hover,#hjp-config ::-webkit-scrollbar-thumb:hover,#hjp-modal ::-webkit-scrollbar-thumb:hover,#hjp-ayuda ::-webkit-scrollbar-thumb:hover{background:var(--hjp-fg-mute);background-clip:content-box}\n" +
            "#hjp-panel ::-webkit-scrollbar-track{background:transparent}\n" +
            "#hjp-panel .hjp-sidebar-tools .hjp-tile:focus-visible,#hjp-panel .mini:focus-visible{outline:2px solid var(--hjp-accent-2);outline-offset:1px}\n" +
            "@keyframes hjpFadeUp{from{opacity:0}to{opacity:1}}\n" +
            "#hjp-panel .kpi,#hjp-panel .recent,#hjp-panel .hjp-tile{animation:hjpFadeUp .3s var(--hjp-easing) both}\n" +
            "#hjp-panel .kpi{position:relative;overflow:hidden}\n" +
            "#hjp-panel .kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--hjp-accent-grad);opacity:.7}\n" +
            "#hjp-panel .kpi.ok::before{background:var(--hjp-ok)}\n" +
            "#hjp-panel .kpi.warn::before{background:var(--hjp-warn)}\n" +
            "#hjp-panel .kpi.bad::before{background:var(--hjp-bad)}\n" +
            "#hjp-panel .kpi:hover{transform:translateY(-2px);box-shadow:var(--hjp-shadow)}\n" +
            "#hjp-panel .kpi{transition:transform .15s var(--hjp-easing),box-shadow .15s}\n" +
            "#hjp-barra{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}\n" +
            "#hjp-panel header{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}\n";

        const style = makeEl('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ====================== UI BUILD ====================== */
    let mainBtn, panelBtn, modoBtn, helpBtn, closeBtn, updateBtn, foldBtn, gripEl, barraEl,
        panelEl, modalEl, cfgWinEl, ayudaEl, ctxEl, toastsEl, avisoEl, railEl;

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
        const iconFont = document.createElement('link');
        iconFont.rel = 'stylesheet';
        iconFont.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
        try { document.head.appendChild(iconFont); } catch (_) { /* noop */ }
        mainBtn = makeEl('button', { innerHTML: '<span class="hjp-mi">' + ICO.automatizar + '</span> Automatizar Unidades', id: 'hjp-btn-main', className: 'hjp-btn', title: 'Abrir lista de unidades y automatizar ventanas' });
        panelBtn = makeEl('button', { innerHTML: '<span class="hjp-mi">' + ICO.panel + '</span> Panel', id: 'hjp-btn-panel', className: 'hjp-btn', title: 'Mostrar u ocultar el panel (Alt+P)' });
        modoBtn = makeEl('button', { innerHTML: '<span class="hjp-mi">' + ICO.expandir + '</span> <span class="hjp-modo-label">Flotante</span>', id: 'hjp-btn-modo', className: 'hjp-btn', title: 'Alternar entre panel flotante y barra lateral (Alt+L)' });
        closeBtn = makeEl('button', { innerHTML: '<span class="hjp-mi">' + ICO.cerrar + '</span> Cerrar Todas', id: 'hjp-btn-close', className: 'hjp-btn', title: 'Cerrar todas las ventanas de unidades' });
        helpBtn = makeEl('button', { innerHTML: '<span class="hjp-mi">' + ICO.ayuda + '</span>', id: 'hjp-btn-help', className: 'hjp-btn', title: 'Ayuda rapida (?)' });
        updateBtn = makeEl('button', { innerHTML: '<span class="hjp-mi">' + ICO.actualizar + '</span> Actualizar', id: 'hjp-btn-update', className: 'hjp-btn hjp-update', title: 'Nueva version disponible', style: 'display:none' });
        foldBtn = makeEl('button', { innerText: '▾', id: 'hjp-btn-fold', className: 'hjp-btn hjp-fold', title: 'Plegar barra' });
        gripEl = makeEl('span', { innerText: '⠿', id: 'hjp-grip', className: 'hjp-grip', title: 'Arrastrar barra · doble clic para orientar' });
        barraEl = makeEl('div', { id: 'hjp-barra' });
        barraEl.append(gripEl, updateBtn, mainBtn, panelBtn, modoBtn, helpBtn, closeBtn, foldBtn);
        if (APP.barra.vertical) barraEl.classList.add('vertical');

        panelEl = makeEl('div', { id: 'hjp-panel' });
        panelEl.innerHTML = (
            '<div class="hjp-sidebar-tools" id="hjp-sidebar-tools">' +
            '<button class="hjp-tile primary" id="hjp-sb-main" title="Abrir lista de unidades y automatizar ventanas"><span class="hjp-mi">' + ICO.automatizar + '</span><span class="tile-lbl">Automatizar</span></button>' +
            '<button class="hjp-tile" id="hjp-sb-panel" title="Ocultar el panel (Alt+P)"><span class="hjp-mi">' + ICO.colapsar + '</span><span class="tile-lbl">Ocultar</span></button>' +
            '<button class="hjp-tile" id="hjp-sb-modo" title="Volver al modo flotante"><span class="hjp-mi">' + ICO.expandir + '</span><span class="tile-lbl hjp-sb-modo-label">Flotante</span></button>' +
            '<button class="hjp-tile" id="hjp-sb-close" title="Cerrar todas las ventanas de unidades"><span class="hjp-mi">' + ICO.cerrar + '</span><span class="tile-lbl">Cerrar</span></button>' +
            '</div>' +
            '<header id="hjp-drag">' +
            '<span id="hjp-estado-barra" class="hjp-badge-estado"></span>' +
            '<h3>' + esc(LANG.titlePanel) + '</h3>' +
            '<button class="hjp-iconbtn" id="hjp-actualizar" title="Buscar actualizaciones" style="display:none;color:var(--hjp-accent-2)"><span class="hjp-mi">' + ICO.actualizar + '</span></button>' +
            '<button class="hjp-iconbtn" id="hjp-tema" title="Tema"><span class="hjp-mi">' + ICO.luna + '</span></button>' +
            '<button class="hjp-iconbtn" id="hjp-nmolestar" title="No molestar"><span class="hjp-mi">' + ICO.silencioTotal + '</span></button>' +
            '<button class="hjp-iconbtn" id="hjp-collapse" title="Colapsar/expandir barra lateral"><span class="hjp-mi">' + ICO.colapsar + '</span></button>' +
            '<button class="hjp-iconbtn" id="hjp-ayuda-btn" title="Ayuda rápida"><span class="hjp-mi">' + ICO.ayuda + '</span></button>' +
            '<button class="hjp-iconbtn" id="hjp-cerrar-panel" title="Cerrar panel"><span class="hjp-mi">' + ICO.cerrar + '</span></button>' +
            '</header>' +
            '<div class="tabs" id="hjp-tabs">' +
            '<button class="tab activo" data-tab="dash" title="Resumen general de la flota"><span class="hjp-mi">' + ICO.dashboard + '</span><span class="etqt">Dashboard</span><span class="contador" id="hjp-c-on">0</span></button>' +
            '<button class="tab" data-tab="unidades" title="Lista de unidades y acciones"><span class="hjp-mi">' + ICO.panel + '</span><span class="etqt">Unidades</span><span class="contador" id="hjp-c-tot">0</span></button>' +
            '<button class="tab" data-tab="alertas" title="Historial de avisos"><span class="hjp-mi">' + ICO.alertas + '</span><span class="etqt">Avisos</span><span class="contador" id="hjp-c-al">0</span></button>' +
            '<button class="tab" data-tab="rutas" title="Rutas planificadas y seguimiento"><span class="hjp-mi">' + ICO.destino + '</span><span class="etqt">Rutas</span><span class="contador" id="hjp-c-ru">0</span></button>' +
            '<button class="tab" data-tab="geocercas" title="Geocercas y unidades dentro"><span class="hjp-mi">' + ICO.geocercas + '</span><span class="etqt">Geocercas</span><span class="contador" id="hjp-c-zn">0</span></button>' +
            '</div>' +
            '<div class="tools" id="hjp-tools">' +
            '<input class="filtro" id="hjp-filtro" placeholder="' + esc(LANG.busq) + '">' +
            '<select class="filtro" id="hjp-filtro-estado" title="Filtrar por estado">' +
            '<option value="todas">Todas</option>' +
            '<option value="moviendo">Moviendo</option>' +
            '<option value="detenida">Detenidas</option>' +
            '<option value="offline">Sin senal</option>' +
            '<option value="vigilada">Vigiladas</option>' +
            '<option value="silenciada">Silenciadas</option>' +
            '</select>' +
            '<button id="hjp-refresh" title="Refrescar"><span class="hjp-mi">' + ICO.refrescar + '</span></button>' +
            '<button id="hjp-cfg-btn" title="Ajustes"><span class="hjp-mi">' + ICO.ajustes + '</span></button>' +
            '<button id="hjp-csv" title="Exportar unidades"><span class="hjp-mi">' + ICO.descargar + '</span> CSV</button>' +
            '<button id="hjp-csv-al" title="Exportar bitacora"><span class="hjp-mi">' + ICO.descargar + '</span> Bitacora</button>' +
            '<button id="hjp-informe" title="Generar informe del dia"><span class="hjp-mi">' + ICO.descargar + '</span> Informe</button>' +
            '<button id="hjp-verif" title="Solo ventanas seleccionadas"><span class="hjp-mi">' + ICO.verif + '</span> Solo seleccion</button>' +
            '<button id="hjp-captura" title="Capturar ventanas"><span class="hjp-mi">' + ICO.captura + '</span> Capturar</button>' +
            '<button id="hjp-verifica" title="Verificar ahora"><span class="hjp-mi">' + ICO.verifica + '</span> Aplicar</button>' +
            '<button id="hjp-sel-all" title="Seleccionar todas las unidades visibles"><span class="hjp-mi">' + ICO.selAll + '</span> Sel. visibles</button>' +
            '<button id="hjp-sel-clear" title="Quitar toda la selección"><span class="hjp-mi">' + ICO.selClear + '</span> Quitar selección</button>' +
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
            '<div class="tabla" id="hjp-wrap-rutas" style="display:none">' +
            '<div id="hjp-lista-rutas"></div>' +
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
            '<div class="cfg-head"><h3><span class="hjp-mi">' + ICO.ajustes + '</span> Configuracion</h3>' +
            '<button class="hjp-iconbtn" id="hjp-cfg-cerrar-x" title="Cerrar">✕</button></div>' +
            '<div class="cfg-tabs" id="hjp-cfg-tabs">' +
            '<button class="cfg-tab activo" data-cfg="general">General</button>' +
            '<button class="cfg-tab" data-cfg="reglas">Reglas</button>' +
            '<button class="cfg-tab" data-cfg="avisos">Avisos</button>' +
            '<button class="cfg-tab" data-cfg="visual">Visual</button>' +
            '<button class="cfg-tab" data-cfg="ventanas">Ventanas</button>' +
            '<button class="cfg-tab" data-cfg="rutas">Rutas</button>' +
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
            checkRow('c-voz', 'Voz') +
            '<label>Idioma de voz <select id="c-voz-lang">' +
            '<option value="es-MX">Espanol (Mexico)</option>' +
            '<option value="es-ES">Espanol (Espana)</option>' +
            '<option value="es-US">Espanol (EE. UU.)</option>' +
            '<option value="en-US">Ingles (EE. UU.)</option>' +
            '</select></label>' +
            checkRow('c-beep', 'Pitido en alertas graves') +
            numRow('c-beep-vol', 'Volumen del pitido (0-1)') +
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
            checkRow('c-contornos', 'Remarcar contornos de ventanas abiertas') +
            numRow('c-contorno-horas', 'Antiguedad de contornos (h)') +
            '<h4>Informacion</h4>' +
            '<span style="font-size:11.5px;color:var(--hjp-fg-dim)">Atajos: <b>Alt+1..4</b> cambia pestanas · <b>Alt+P</b> panel · <b>Alt+H</b> pliega barra · <b>Esc</b> cierra modales</span>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="ventanas" style="display:none">' +
            '<h4>Panel</h4>' +
            '<label>Modo <select id="c-panel-modo">' +
            '<option value="flotante">Flotante</option>' +
            '<option value="lateral">Barra lateral</option>' +
            '</select></label>' +
            '<label>Lado de la barra <select id="c-panel-lado">' +
            '<option value="derecha">Derecha</option>' +
            '<option value="izquierda">Izquierda</option>' +
            '</select></label>' +
            numRow('c-panel-ancho', 'Ancho lateral (px)') +
            checkRow('c-panel-clicfuera', 'Ocultar la barra lateral al hacer clic fuera') +
            checkRow('c-confirmar-cierre', 'Pedir confirmacion al cerrar todas las ventanas') +
            '<p style="font-size:11px;color:var(--hjp-fg-dim);margin:2px 0 0">El panel recuerda el modo (flotante o lateral) y si estaba abierto.</p>' +
            '<h4>Barra de botones</h4>' +
            '<div class="row-grid">' +
            checkRow('c-b-main', 'Automatizar') +
            checkRow('c-b-panel', 'Panel') +
            checkRow('c-b-close', 'Cerrar') +
            '</div>' +
            checkRow('c-b-plegada', 'Barra plegada') +
            checkRow('c-b-vertical', 'Orientacion vertical') +
            '<div style="margin-top:6px"><button class="accbtn" id="hjp-b-reset" style="width:100%"><span class="hjp-mi">' + ICO.expandir + '</span> Recentrar barra</button></div>' +
            '<h4>Verificacion</h4>' +
            checkRow('c-verif', 'Verificacion automatica') +
            numRow('c-verif-seg', 'Revisar cada (seg)') +
            '<h4>Tamano del panel</h4>' +
            '<button class="accbtn" id="hjp-reset-panel" style="width:100%"><span class="hjp-mi">' + ICO.colapsar + '</span> Restablecer tamano</button>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="rutas" style="display:none">' +
            '<h4>Rutas y OpenStreetMap</h4>' +
            checkRow('c-osrm', 'Calcular rutas con OSRM (OpenStreetMap)') +
            checkRow('c-overpass', 'Permitir A* sobre datos OSM (Overpass, experimental)') +
            checkRow('c-trazado', 'Registrar trazado del recorrido') +
            numRow('c-trazado-max', 'Puntos por traza') +
            '<h4>Alertas de ruta</h4>' +
            checkRow('c-r-desvio', 'Desvio de ruta') +
            numRow('c-desvio-m', 'Desvio mayor a (m)') +
            numRow('c-desvio-min', 'Desvio sostenido (min)') +
            checkRow('c-r-retorno', 'Retorno / viaje cancelado') +
            numRow('c-retorno-m', 'Radio de origen (m)') +
            numRow('c-retorno-pct', 'Retroceso minimo (%)') +
            checkRow('c-r-giro', 'Giro en U') +
            numRow('c-giro-grados', 'Angulo de giro (grados)') +
            numRow('c-giro-min', 'Giro sostenido (min)') +
            '</div>' +
            '<div class="cfg-pane" data-cfg="avanzado" style="display:none">' +
            '<h4>Actualizaciones</h4>' +
            '<div id="hjp-update-info" style="font-size:11.5px;color:var(--hjp-fg-dim);margin-bottom:6px">Version instalada: <b>' + VER + '</b></div>' +
            '<button class="accbtn" id="hjp-check-update" style="width:100%"><span class="hjp-mi">' + ICO.refrescar + '</span> Buscar actualizaciones</button>' +
            '<h4>Datos y prueba</h4>' +
            '<div class="hjp-acciones">' +
            '<button class="accbtn" id="hjp-test-btn"><span class="hjp-mi">' + ICO.senal + '</span> Probar avisos</button>' +
            '<button class="accbtn" id="hjp-exportar-btn"><span class="hjp-mi">' + ICO.exportar + '</span> Exportar</button>' +
            '<button class="accbtn" id="hjp-importar-btn"><span class="hjp-mi">' + ICO.importar + '</span> Importar</button>' +
            '</div>' +
            '<h4>Perfiles de configuracion</h4>' +
            '<label>Perfil <select id="hjp-perfil-sel" style="flex:1"></select></label>' +
            '<div class="hjp-acciones" style="margin-top:6px">' +
            '<button class="accbtn" id="hjp-perfil-guardar">Guardar como...</button>' +
            '<button class="accbtn" id="hjp-perfil-cargar">Cargar</button>' +
            '<button class="accbtn" id="hjp-perfil-borrar" style="background:#b71c1c">Borrar</button>' +
            '</div>' +
            '<h4>Bitacora</h4>' +
            '<button class="accbtn" id="hjp-limpiar-hist" style="width:100%;background:var(--hjp-accent)">' + '<span class="hjp-mi">' + ICO.limpiar + '</span> Limpiar bitacora</button>' +
            '<h4>Reseteo</h4>' +
            '<div class="hjp-acciones">' +
            '<button class="accbtn" id="hjp-borrar-memo" style="background:var(--hjp-accent)"><span class="hjp-mi">' + ICO.limpiar + '</span> Borrar estado</button>' +
            '<button class="accbtn" id="hjp-borrar-todo" style="background:#5d0007">Borrar TODO</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="cfg-foot">' +
            '<button class="cancel" id="hjp-cfg-cerrar">Cerrar</button>' +
            '<button class="accbtn" id="hjp-cfg-guardar">Guardar</button>' +
            '</div>'
        );

        ayudaEl = makeEl('div', { id: 'hjp-ayuda' });
        ayudaEl.innerHTML = (
            '<div class="cfg-head"><h3>? Ayuda rapida</h3>' +
            '<button class="hjp-iconbtn" id="hjp-ayuda-x" title="Cerrar">✕</button></div>' +
            '<div class="ayuda-body">' +
            '<h4>En 3 pasos</h4>' +
            '<div class="pasos">' +
            '<div class="paso"><b>1. Elige unidades</b>Abre <i>Unidades</i> y marca con la casilla las que quieras vigilar, o activa <i>Monitorear todas</i> en Ajustes.</div>' +
            '<div class="paso"><b>2. Abre sus ventanas</b>Pulsa <i>Automatizar Unidades</i> (arriba a la derecha) para abrirlas y acomodarlas solas.</div>' +
            '<div class="paso"><b>3. Vigila los avisos</b>Las alertas aparecen como tarjetas, voz y pitido. Revisalas en <i>Avisos</i>.</div>' +
            '</div>' +
            '<h4>Que hace cada pestana</h4>' +
            '<ul>' +
            '<li><b>Dashboard</b>: cuantas en linea, sin senal, detenidas y alertas del dia.</li>' +
            '<li><b>Unidades</b>: lista con estado, velocidad, zona y acciones. Clic para abrir su ventana; clic derecho para mas opciones.</li>' +
            '<li><b>Avisos</b>: historial filtrable por severidad. Exportable a CSV.</li>' +
            '<li><b>Rutas</b>: progreso de cada ruta y desvios. Se planea desde el clic derecho de una unidad.</li>' +
            '<li><b>Geocercas</b>: unidades dentro de cada geocerca.</li>' +
            '</ul>' +
            '<h4>Alertas de ruta</h4>' +
            '<p>Con una ruta planeada, el script avisa si la unidad se <b>desvia</b> del trazado, hace un <b>giro en U</b> o <b>regresa al origen</b> (posible viaje cancelado). Activadas en Ajustes &gt; Rutas.</p>' +
            '<h4>Atajos de teclado</h4>' +
            '<ul>' +
            '<li><kbd>Alt</kbd>+<kbd>1</kbd>..<kbd>5</kbd>: cambiar de pestana.</li>' +
            '<li><kbd>Alt</kbd>+<kbd>P</kbd>: mostrar u ocultar el panel.</li>' +
            '<li><kbd>Alt</kbd>+<kbd>L</kbd>: alternar entre panel flotante y barra lateral.</li>' +
            '<li><kbd>Alt</kbd>+<kbd>H</kbd>: plegar la barra de botones.</li>' +
            '<li><kbd>Esc</kbd>: cerrar ventanas emergentes.</li>' +
            '</ul>' +
            '<h4>Actualizaciones</h4>' +
            '<p>El script revisa si hay una version nueva al iniciar y cada 30 minutos. Si la hay, aparece un indicador en la cabecera del panel; al pulsarlo se abre la URL para que Tampermonkey actualice el script.</p>' +
            '<h4>Consejo</h4>' +
            '<p>Usa el boton <b>Flotante / Lateral</b> de la barra superior para cambiar el modo del panel. Al ocultar la barra lateral queda una pestana en el borde (rail) que la trae de vuelta con un clic.</p>' +
            '</div>' +
            '<div class="cfg-foot">' +
            '<button class="cancel" id="hjp-ayuda-cerrar">Cerrar</button>' +
            '<button class="accbtn" id="hjp-ayuda-config">Abrir ajustes</button>' +
            '</div>'
        );

        ctxEl = makeEl('div', { id: 'hjp-contexto' });
        toastsEl = makeEl('div', { id: 'hjp-toasts' });
        avisoEl = makeEl('div', { id: 'hjp-aviso' });
        railEl = makeEl('div', { id: 'hjp-rail' });
        railEl.title = 'Mostrar el panel';

        document.body.appendChild(barraEl);
        document.body.appendChild(panelEl);
        document.body.appendChild(modalEl);
        document.body.appendChild(cfgWinEl);
        document.body.appendChild(ayudaEl);
        document.body.appendChild(ctxEl);
        document.body.appendChild(toastsEl);
        document.body.appendChild(avisoEl);
        document.body.appendChild(railEl);
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
    function esLateral() { return (APP.config.panelMode || 'flotante') === 'lateral'; }
    function aplicarModoPanel() {
        if (!panelEl) return;
        const lado = APP.config.panelLado || 'derecha';
        const ancho = clamp(Number(APP.config.panelAncho) || 420, 360, Math.max(360, window.innerWidth - 20));
        panelEl.classList.toggle('lateral', esLateral());
        panelEl.classList.toggle('izquierda', esLateral() && lado === 'izquierda');
        document.body.classList.toggle('hjp-lateral', esLateral());
        if (esLateral()) {
            panelEl.style.top = '0px';
            panelEl.style.bottom = '0px';
            panelEl.style.height = '100vh';
            panelEl.style.width = ancho + 'px';
            if (lado === 'izquierda') { panelEl.style.left = '0px'; panelEl.style.right = 'auto'; }
            else { panelEl.style.left = 'auto'; panelEl.style.right = '0px'; }
        } else {
            panelEl.classList.remove('izquierda');
            panelEl.style.right = 'auto';
            panelEl.style.bottom = 'auto';
            panelEl.style.top = (APP.panelPos ? APP.panelPos.y : 60) + 'px';
            panelEl.style.left = (APP.panelPos ? APP.panelPos.x : 10) + 'px';
            panelEl.style.height = ((APP.panelSize && APP.panelSize.h) ? APP.panelSize.h : 440) + 'px';
            panelEl.style.width = ((APP.panelSize && APP.panelSize.w) ? APP.panelSize.w : 470) + 'px';
        }
        const colIcon = document.querySelector('#hjp-collapse .hjp-mi');
        if (colIcon) colIcon.textContent = esLateral() ? ICO.colapsar : ICO.expandir;
        const colBtn = byId('hjp-collapse');
        if (colBtn) colBtn.title = esLateral() ? 'Ocultar barra lateral' : 'Ocultar panel';
        if (esLateral()) {
            panelEl.style.display = 'flex';
            panelEl.classList.toggle('oculto', !!APP.panelHidden);
        } else {
            panelEl.classList.remove('oculto');
            panelEl.style.display = APP.panelHidden ? 'none' : 'flex';
        }
        aplicarRail();
        writeJSON(LS.cfg, APP.config);
    }
    function toggleSidebar() {
        APP.config.panelMode = esLateral() ? 'flotante' : 'lateral';
        APP.panelHidden = false;
        APP.config.panelVisible = true;
        panelEl.style.display = 'flex';
        aplicarModoPanel();
        actualizarBotonesModo();
        advice('Panel', esLateral() ? 'modo barra lateral' : 'modo flotante');
    }
    function actualizarBotonesModo() {
        const lbl = document.querySelector('#hjp-btn-modo .hjp-modo-label');
        if (lbl) lbl.textContent = esLateral() ? 'Lateral' : 'Flotante';
        const icon = document.querySelector('#hjp-btn-modo .hjp-mi');
        if (icon) icon.textContent = esLateral() ? ICO.colapsar : ICO.expandir;
        const sbLbl = document.querySelector('#hjp-sb-modo .hjp-sb-modo-label');
        if (sbLbl) sbLbl.textContent = esLateral() ? 'Flotante' : 'Lateral';
        const sbIcon = document.querySelector('#hjp-sb-modo .hjp-mi');
        if (sbIcon) sbIcon.textContent = esLateral() ? ICO.expandir : ICO.colapsar;
        const sbModo = byId('hjp-sb-modo');
        if (sbModo) sbModo.title = esLateral() ? 'Volver al modo flotante' : 'Pasar a barra lateral';
        const panelLbl = byId('hjp-btn-panel');
        if (panelLbl) panelLbl.title = APP.panelHidden ? 'Mostrar el panel (Alt+P)' : 'Ocultar el panel (Alt+P)';
    }
    function togglePanel() {
        APP.panelHidden = !APP.panelHidden;
        APP.config.panelVisible = !APP.panelHidden;
        if (esLateral()) {
            panelEl.style.display = 'flex';
        } else {
            panelEl.style.display = APP.panelHidden ? 'none' : 'flex';
        }
        aplicarModoPanel();
        const icon = document.querySelector('#hjp-btn-panel .hjp-mi');
        if (icon) icon.textContent = APP.panelHidden ? ICO.panel : ICO.cerrar;
        const t = byId('hjp-btn-panel');
        if (t) t.title = APP.panelHidden ? 'Mostrar el panel (Alt+P)' : 'Ocultar el panel (Alt+P)';
        if (APP.panelHidden) advice('Panel', 'oculto · usa el boton de la barra o el rail para mostrarlo');
        actualizarBotonesModo();
    }
    // Oculta la barra lateral sin avisos (util para el clic fuera del panel).
    function ocultarSidebar() {
        if (!esLateral() || APP.panelHidden) return;
        APP.panelHidden = true;
        APP.config.panelVisible = false;
        aplicarModoPanel();
        actualizarBotonesModo();
    }
    function aplicarRail() {
        if (!railEl) return;
        const lado = APP.config.panelLado || 'derecha';
        railEl.classList.toggle('izquierda', lado === 'izquierda');
        railEl.classList.toggle('derecha', lado !== 'izquierda');
        railEl.innerHTML = '<span class="hjp-mi">' + (lado === 'izquierda' ? ICO.arrowRight : ICO.arrowLeft) + '</span>' +
            '<span class="hjp-rail-txt">PANEL</span>';
        const show = esLateral() && APP.panelHidden;
        railEl.classList.toggle('mostrar', show);
    }
    function placePanel() {
        if (esLateral()) return;
        if (!APP.panelPos) { aplicarModoPanel(); return; }
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
                if (esLateral()) return;
                activo = true;
                panelEl.classList.add('dragging');
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
            const end = () => { if (activo) { activo = false; savePanelPos(); panelEl.classList.remove('dragging'); } };
            head.addEventListener('pointerup', end);
            head.addEventListener('pointercancel', end);
        })();

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => {
                if (esLateral()) return;
                const w = panelEl.offsetWidth;
                const h = panelEl.offsetHeight;
                APP.panelSize = { w: w, h: h };
                writeJSON(LS.panelsize, APP.panelSize);
            });
            ro.observe(panelEl);
        }

        window.addEventListener('resize', () => {
            placeBar();
            if (esLateral()) { aplicarModoPanel(); return; }
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
        const ids = ['dash', 'unidades', 'alertas', 'rutas', 'geocercas'];
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
        else if (name === 'rutas') paintRutas();
        else if (name === 'geocercas') paintGeocercas();
        paintCounters();
        paintStateBadge();
        paintInfo();
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
        const cRu = byId('hjp-c-ru');
        const cZn = byId('hjp-c-zn');
        if (cOn) cOn.textContent = on;
        if (cTot) cTot.textContent = watched.length;
        if (cAl) cAl.textContent = APP.historial.length;
        if (cRu) cRu.textContent = Object.keys(APP.rutas).length;
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
                    '<span class="ico hjp-mi" style="color:' + (COL[a.sev] || '#777') + '">' + a.icono + '</span>' +
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
                const est = APP.filtEstado || 'todas';
                if (est === 'moviendo' && x.st.estado !== 'moviendo') return false;
                if (est === 'detenida' && x.st.estado !== 'detenida') return false;
                if (est === 'offline' && x.st.estado !== 'offline') return false;
                if (est === 'vigilada' && !isWatched(x.info)) return false;
                if (est === 'silenciada' && !APP.dismissed.has(x.info.clave)) return false;
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
            const lim = limiteDe(info);
            const excede = st.online && st.vel > lim;
            const celVel = '<td' + (excede ? ' style="color:var(--hjp-bad-fg);font-weight:bold"' : '') + ' title="' +
                (lim !== APP.config.velMax ? 'limite de la unidad: ' + lim + ' km/h' : 'limite global: ' + lim + ' km/h') + '">' +
                Math.round(st.vel) + (lim !== APP.config.velMax ? ' <span style="font-size:10px">/' + lim + '</span>' : '') + '</td>';
            return (
                '<tr class="fila ' + clase + (sel ? ' sel-row' : '') + '" data-eco="' + esc(info.eco) + '">' +
                '<td class="col-sel" data-eco="' + esc(info.eco) + '">' +
                '<input type="checkbox" class="hjp-sel" data-eco="' + esc(info.eco) + '" data-placa="' + esc(info.placa) + '"' + (sel ? ' checked' : '') + '>' +
                '</td>' +
                '<td class="estadoicon ' + clase + '"><span class="hjp-mi">' + ic + '</span></td>' +
                '<td class="eco">' + (vig ? '<span class="hjp-mi">' + ICO.bandera + '</span> ' : '') + esc(info.eco || '-') + '</td>' +
                '<td>' + esc(info.placa || '') + '</td>' +
                '<td>' + txt + '</td>' +
                '<td>' + ageText(st.edadMin) + '</td>' +
                celVel +
                '<td>' + esc(zona) + coords + '</td>' +
                '<td><button class="mini hjp-sil ' + (sil ? 'on' : '') + '" data-eco="' + esc(info.eco) + '" title="' + (sil ? 'Reactivar' : 'Silenciar') + '">' +
                '<span class="hjp-mi">' + (sil ? ICO.silencio : ICO.sonido) + '</span></button></td>' +
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
                '<span class="ico hjp-mi" style="color:' + (COL[a.sev] || '#777') + '">' + a.icono + '</span>' +
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
    function paintRutas() {
        const cont = byId('hjp-lista-rutas');
        if (!cont) return;
        const watched = APP.unidades.filter(shouldWatch).map((u) => ({ info: parseUnitName(u), st: unitState(u) }));
        const filas = watched.filter((x) => rutaDe(x.info));
        const sinUnidad = Object.keys(APP.rutas).filter((eco) => !watched.some((x) => x.info.clave === eco || x.info.eco === eco));
        if (!filas.length && !sinUnidad.length) {
            cont.innerHTML = '<div class="vacio" style="padding:18px;text-align:center;color:var(--hjp-fg-dim)">' +
                'Sin rutas planificadas. Usa el menú contextual de una unidad (clic derecho en Unidades) para planear una ruta con OpenStreetMap (OSRM o A*).</div>';
            return;
        }
        const tarjeta = (info, st) => {
            const eco = info.clave;
            const r = rutaDe(info);
            const s = (st && st.online && st.lat != null && r) ? snapRuta(st.lat, st.lon, r) : null;
            const desviado = !!(s && s.dist > APP.config.desvioM);
            const llego = !!(s && s.progreso >= 0.95);
            const est = !s ? 'SIN POSICION' : (llego ? 'LLEGO' : (desviado ? 'DESVIADO' : 'EN RUTA'));
            const color = llego ? 'var(--hjp-ok-fg)' : (desviado ? 'var(--hjp-bad-fg)' : 'var(--hjp-accent-2)');
            const dest = r.destinoTexto || (r.destino.lat.toFixed(4) + ',' + r.destino.lon.toFixed(4));
            return '<div class="alerta" style="border-left:4px solid ' + color + '">' +
                '<span class="ico hjp-mi" style="color:' + color + '">' + ICO.destino + '</span>' +
                '<div class="cuerpo"><b>' + esc(eco || info.nombre) + ' · ' + est + '</b>' +
                '<span>' + esc(dest) + ' · ' + Math.round(r.total / 1000) + ' km · ' + esc(r.modo || '') + '</span>' +
                '<div class="meta">' +
                '<span class="regla">' + (s ? 'progreso ' + Math.round(s.progreso * 100) + '%' : 'sin datos') + '</span>' +
                (s ? '<span>' + Math.round(s.dist) + ' m de la ruta</span>' : '') +
                (r.duracion ? '<span>' + Math.round(r.duracion / 60) + ' min ETA</span>' : '') +
                '<span>' + new Date(r.creada).toLocaleString().slice(0, 16) + '</span>' +
                '</div></div>' +
                '<button class="mini hjp-ruta-geo" data-eco="' + esc(eco) + '" title="Exportar ruta GeoJSON"><span class="hjp-mi">' + ICO.exportar + '</span></button>' +
                '<button class="mini hjp-traza-geo" data-eco="' + esc(eco) + '" title="Exportar traza GeoJSON"><span class="hjp-mi">' + ICO.descargar + '</span></button>' +
                '<button class="mini hjp-ruta-calc" data-eco="' + esc(eco) + '" title="Recalcular"><span class="hjp-mi">' + ICO.refrescar + '</span></button>' +
                '<button class="mini hjp-ruta-del" data-eco="' + esc(eco) + '" title="Eliminar ruta"><span class="hjp-mi">' + ICO.cerrar + '</span></button>' +
                '</div>';
        };
        let html = filas.map((x) => tarjeta(x.info, x.st)).join('');
        sinUnidad.forEach((eco) => {
            const r = APP.rutas[eco];
            if (!r) return;
            html += '<div class="alerta" style="border-left:4px solid var(--hjp-fg-mute);opacity:.75">' +
                '<span class="ico hjp-mi">' + ICO.destino + '</span>' +
                '<div class="cuerpo"><b>' + esc(eco) + ' · FUERA DE VIGILANCIA</b>' +
                '<span>' + esc(r.destinoTexto || '') + ' · ' + Math.round(r.total / 1000) + ' km</span></div>' +
                '<button class="mini hjp-ruta-del" data-eco="' + esc(eco) + '" title="Eliminar ruta"><span class="hjp-mi">' + ICO.cerrar + '</span></button>' +
                '</div>';
        });
        cont.innerHTML = html;
    }
    function paintPanel() { setTab(APP.tab); }

    setInterval(() => {
        if (panelEl.style.display === 'none') return;
        if (APP.tab === 'unidades') paintTabla();
        if (APP.tab === 'dash') paintKPI();
        if (APP.tab === 'rutas') paintRutas();
        if (APP.tab === 'geocercas') paintGeocercas();
        byId('hjp-upd').textContent = ICO.reloj + ' ' + new Date().toLocaleTimeString();
        if (nmActivo()) updateNoMolestar();
        paintStateBadge();
        paintInfo();
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
    function exportInforme() {
        const inicio = new Date();
        inicio.setHours(0, 0, 0, 0);
        const hoy = APP.historial.filter((a) => a.ts >= inicio.getTime());
        const cuenta = (lista, campo) => lista.reduce((acc, a) => {
            const k = a[campo] || '—';
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {});
        const porSev = cuenta(hoy, 'sev');
        const porRegla = cuenta(hoy, 'regla');
        const porEco = cuenta(hoy.filter((a) => a.eco), 'eco');
        const watched = APP.unidades.filter(shouldWatch).map((u) => ({ info: parseUnitName(u), st: unitState(u) }));
        const off = watched.filter((x) => !x.st.online);

        const lineas = [];
        lineas.push('# Informe HJP · Wialon');
        lineas.push('');
        lineas.push('Generado: ' + new Date().toLocaleString());
        lineas.push('Unidades vigiladas: ' + watched.length);
        lineas.push('En linea: ' + (watched.length - off.length) + ' · Sin senal: ' + off.length);
        lineas.push('');
        lineas.push('## Alertas de hoy (' + hoy.length + ')');
        const sevs = Object.keys(porSev).sort((a, b) => pickSeverity(b) - pickSeverity(a));
        if (sevs.length) sevs.forEach((s) => lineas.push('- ' + s + ': ' + porSev[s]));
        else lineas.push('- Sin alertas registradas.');
        lineas.push('');
        lineas.push('## Por regla');
        const reglas = Object.keys(porRegla).sort((a, b) => porRegla[b] - porRegla[a]);
        if (reglas.length) reglas.forEach((r) => lineas.push('- ' + r + ': ' + porRegla[r]));
        else lineas.push('- Sin datos.');
        lineas.push('');
        lineas.push('## Unidades con mas alertas');
        const ecos = Object.keys(porEco).sort((a, b) => porEco[b] - porEco[a]).slice(0, 15);
        if (ecos.length) ecos.forEach((e) => lineas.push('- ' + e + ': ' + porEco[e]));
        else lineas.push('- Sin datos.');
        lineas.push('');
        lineas.push('## Unidades sin senal ahora');
        if (off.length) off.forEach((x) => lineas.push('- ' + (x.info.eco || x.info.nombre) + ' (' + ageText(x.st.edadMin) + ')'));
        else lineas.push('- Todas reportando.');
        lineas.push('');
        lineas.push('## Ultimos avisos');
        if (APP.historial.length) {
            APP.historial.slice(0, 25).forEach((a) => lineas.push(
                '- [' + new Date(a.ts).toLocaleString() + '] ' + a.titulo + (a.detalle ? ' · ' + a.detalle : '')
            ));
        } else {
            lineas.push('- Sin avisos.');
        }
        const a = makeEl('a', { href: URL.createObjectURL(new Blob([lineas.join('\n')], { type: 'text/markdown;charset=utf-8;' })) });
        a.download = 'hjp_informe_' + new Date().toISOString().slice(0, 10) + '.md';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        advice('Informe generado', hoy.length + ' alertas hoy');
    }

    /* ====================== ACTUALIZACIONES ====================== */
    function pintarActualizacion() {
        const b = byId('hjp-actualizar');
        const u = APP.update;
        const bar = byId('hjp-btn-update');
        if (bar) {
            const ver = (u.state === 'available');
            const visible = bar.style.display !== 'none';
            if (visible !== ver) {
                bar.style.display = ver ? '' : 'none';
                try { placeBar(); } catch (_) { /* noop */ }
            }
        }
        if (b) {
            b.classList.remove('warn');
            if (u.state === 'available') {
                b.style.display = '';
                b.classList.add('activo');
                const icon = b.querySelector('.hjp-mi');
                if (icon) icon.textContent = ICO.actualizar;
                b.title = 'Actualizar a la version ' + u.remote + ' (instalada ' + u.local + ')';
            } else if (u.state === 'installed') {
                b.style.display = '';
                b.classList.add('activo');
                const icon = b.querySelector('.hjp-mi');
                if (icon) icon.textContent = ICO.refrescar;
                b.title = 'Actualizacion instalada · recarga para aplicar';
            } else if (u.state === 'error') {
                b.style.display = '';
                b.classList.remove('activo');
                b.classList.add('warn');
                const icon = b.querySelector('.hjp-mi');
                if (icon) icon.textContent = ICO.alto;
                b.title = 'No se pudo comprobar actualizaciones' + (u.lastError ? ' (' + u.lastError + ')' : '') + ' · clic para reintentar';
            } else {
                b.style.display = 'none';
                b.classList.remove('activo');
            }
        }
        pintarInfoUpdate();
    }
    function pintarInfoUpdate() {
        const el = byId('hjp-update-info');
        if (!el) return;
        const u = APP.update;
        let html = 'Version instalada: <b>' + VER + '</b>';
        if (u.remote) html += ' · remota: <b>' + esc(u.remote) + '</b>' + (u.canal ? ' (' + esc(u.canal) + ')' : '');
        if (u.state === 'checking') html += ' · comprobando...';
        else if (u.state === 'current' && u.lastCheck) html += ' · al dia (revisado ' + new Date(u.lastCheck).toLocaleTimeString() + ')';
        else if (u.state === 'available') html += ' · <b style="color:var(--hjp-accent-2)">actualizacion disponible</b>';
        else if (u.state === 'installed') html += ' · <b style="color:var(--hjp-accent-2)">actualizada · recarga</b>';
        else if (u.state === 'error') html += ' · <b style="color:var(--hjp-warn-fg)">no se pudo comprobar</b>' + (u.lastError ? ' (' + esc(u.lastError) + ')' : '');
        el.innerHTML = html;
    }
    async function fetchVersionRemota(url) {
        const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const tmo = ctl ? setTimeout(() => ctl.abort(), 15000) : null;
        try {
            const res = await fetch(url + '?t=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const text = await res.text();
            const v = parseVersionHeader(text);
            if (!v) throw new Error('version no encontrada');
            return v;
        } finally {
            if (tmo) clearTimeout(tmo);
        }
    }
    async function comprobarActualizacion() {
        APP.update.state = 'checking';
        pintarActualizacion();
        try {
            // Canal estable (main).
            const main = await fetchVersionRemota(UPDATE_URL);
            let mejor = { v: main, url: UPDATE_URL, canal: 'main' };
            // Si la copia instalada va por delante de main (build de desarrollo),
            // revisamos tambien el canal dev para no quedarnos sin avisos.
            if (cmpVersion(VER, main) > 0) {
                try {
                    const dev = await fetchVersionRemota(UPDATE_URL_DEV);
                    if (cmpVersion(dev, VER) > 0) mejor = { v: dev, url: UPDATE_URL_DEV, canal: 'dev' };
                } catch (_) { /* dev opcional */ }
            }
            APP.update.remote = mejor.v;
            APP.update.canal = mejor.canal;
            APP.update.url = mejor.url;
            APP.update.local = VER;
            APP.update.lastCheck = Date.now();
            log('update check:', 'instalada', VER, '· main', main, '· canal', mejor.canal, mejor.v);
            if (cmpVersion(mejor.v, VER) > 0) {
                APP.update.state = 'available';
                pintarActualizacion();
                if (!APP.update.notificado) {
                    APP.update.notificado = true;
                    advice('Nueva version disponible', mejor.v + ' (instalada ' + VER + ') · canal ' + mejor.canal);
                }
            } else {
                APP.update.state = 'current';
                pintarActualizacion();
            }
        } catch (e) {
            APP.update.state = 'error';
            APP.update.lastError = (e && e.message) || 'sin conexion';
            try { console.warn('[HJP] update check error:', APP.update.lastError); } catch (_) { /* noop */ }
            pintarActualizacion();
        }
    }
    function aplicarActualizacion() {
        const u = APP.update;
        if (u.state === 'available') {
            u.state = 'installed';
            pintarActualizacion();
            try { window.open(u.url || UPDATE_URL, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
            advice('Actualizacion iniciada', 'instala la nueva version en Tampermonkey y recarga esta pagina');
        } else if (u.state === 'installed') {
            try { location.reload(); } catch (_) { /* noop */ }
        } else {
            comprobarActualizacion();
        }
    }

    function exportConfig() {
        const data = {
            version: 6, ts: Date.now(),
            config: APP.config, barra: APP.barra,
            seleccion: Array.from(APP.seleccion), dismissed: Array.from(APP.dismissed),
            watchMap: APP.watchMap, limites: APP.limites, rutas: APP.rutas,
            panelPos: APP.panelPos, panelSize: APP.panelSize
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
                    if (!d || typeof d !== 'object') throw new Error('JSON invalido');
                    if (d.config && typeof d.config === 'object') APP.config = deepMerge(d.config, DEFAULTS);
                    writeJSON(LS.cfg, APP.config);
                    if (d.barra && typeof d.barra === 'object') APP.barra = d.barra;
                    writeJSON(LS.barra, APP.barra);
                    if (Array.isArray(d.seleccion)) { APP.seleccion = new Set(d.seleccion); writeJSON(LS.seleccion, Array.from(APP.seleccion)); }
                    if (Array.isArray(d.dismissed)) { APP.dismissed = new Set(d.dismissed); writeJSON(LS.dismissed, Array.from(APP.dismissed)); }
                    if (d.watchMap && typeof d.watchMap === 'object') { APP.watchMap = d.watchMap; writeJSON(LS.watch, APP.watchMap); }
                    if (d.limites && typeof d.limites === 'object') { APP.limites = d.limites; writeJSON(LS.limites, APP.limites); }
                    if (d.rutas && typeof d.rutas === 'object') { APP.rutas = d.rutas; guardarRutas(); }
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
    function pintarPerfiles() {
        const sel = byId('hjp-perfil-sel');
        if (!sel) return;
        const nombres = Object.keys(APP.perfiles).sort((a, b) => a.localeCompare(b));
        sel.innerHTML = nombres.length
            ? nombres.map((n) => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('')
            : '<option value="">(sin perfiles)</option>';
    }
    function guardarPerfil(nombre) {
        if (!nombre) return false;
        APP.perfiles[nombre] = {
            config: JSON.parse(JSON.stringify(APP.config)),
            limites: JSON.parse(JSON.stringify(APP.limites)),
            ts: Date.now()
        };
        writeJSON(LS.perfiles, APP.perfiles);
        pintarPerfiles();
        const sel = byId('hjp-perfil-sel');
        if (sel) sel.value = nombre;
        return true;
    }
    function cargarPerfil(nombre) {
        const p = APP.perfiles[nombre];
        if (!p) return false;
        if (p.config) { APP.config = deepMerge(p.config, DEFAULTS); writeJSON(LS.cfg, APP.config); }
        if (p.limites) { APP.limites = p.limites; writeJSON(LS.limites, APP.limites); }
        applyBar();
        applyTheme();
        restartTimers();
        refresh();
        return true;
    }
    function borrarPerfil(nombre) {
        if (!nombre || !APP.perfiles[nombre]) return false;
        delete APP.perfiles[nombre];
        writeJSON(LS.perfiles, APP.perfiles);
        pintarPerfiles();
        return true;
    }
    function limpiarBitacora() {
        const n = APP.historial.length;
        APP.historial = [];
        writeJSON(LS.hist, APP.historial);
        paintCounters();
        if (APP.tab === 'alertas') paintAlertas();
        if (APP.tab === 'dash') paintKPI();
        paintStateBadge();
        return n;
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
            o.sep ? '<div class="sep"></div>' : '<div class="op" data-acc="' + esc(o.id) + '">' + (o.icon ? '<span class="hjp-mi">' + o.icon + '</span> ' : '') + esc(o.label) + '</div>'
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
                const tabs = { '1': 'dash', '2': 'unidades', '3': 'alertas', '4': 'rutas', '5': 'geocercas' };
                if (tabs[e.key]) {
                    setTab(tabs[e.key]);
                    if (APP.panelHidden) togglePanel();
                    e.preventDefault();
                    return;
                }
                if (e.key.toLowerCase() === 'p') {
                    togglePanel();
                    paintPanel();
                    e.preventDefault(); return;
                }
                if (e.key.toLowerCase() === 'l') {
                    toggleSidebar();
                    e.preventDefault(); return;
                }
                if (e.key.toLowerCase() === 'h') {
                    APP.barra.plegada = !APP.barra.plegada;
                    applyBar();
                    e.preventDefault(); return;
                }
            }
            if (e.key === 'Escape') {
                [modalEl, cfgWinEl, ayudaEl, ctxEl].forEach((w) => { if (w) w.style.display = 'none'; });
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
        closeBtn.addEventListener('click', (e) => cerrarTodasSeguro(e.currentTarget));
        panelBtn.addEventListener('click', () => {
            togglePanel();
            paintPanel();
        });
        modoBtn.addEventListener('click', toggleSidebar);
        if (railEl) railEl.addEventListener('click', togglePanel);
        byId('hjp-sb-main').addEventListener('click', () => mainBtn.click());
        byId('hjp-sb-close').addEventListener('click', (e) => cerrarTodasSeguro(e.currentTarget));
        byId('hjp-sb-modo').addEventListener('click', toggleSidebar);
        byId('hjp-sb-panel').addEventListener('click', togglePanel);
        // Clic fuera del panel en modo barra lateral: se oculta.
        document.addEventListener('pointerdown', (e) => {
            if (!APP.config.ocultarAlClicFuera) return;
            if (e.button !== 0) return;
            if (!esLateral() || APP.panelHidden) return;
            const t = e.target;
            if (!t || !t.closest) return;
            if (esUIPropia(t)) return;
            ocultarSidebar();
        }, true);
        byId('hjp-cerrar-panel').addEventListener('click', () => { if (!APP.panelHidden) togglePanel(); });
        byId('hjp-collapse').addEventListener('click', togglePanel);
        byId('hjp-ayuda-btn').addEventListener('click', () => { ayudaEl.style.display = 'flex'; });
        helpBtn.addEventListener('click', () => { ayudaEl.style.display = 'flex'; });
        byId('hjp-ayuda-x').addEventListener('click', () => { ayudaEl.style.display = 'none'; });
        byId('hjp-ayuda-cerrar').addEventListener('click', () => { ayudaEl.style.display = 'none'; });
        byId('hjp-ayuda-config').addEventListener('click', () => {
            ayudaEl.style.display = 'none';
            abrirCfg();
        });
        byId('hjp-refresh').addEventListener('click', refresh);
        byId('hjp-csv').addEventListener('click', exportUnits);
        byId('hjp-csv-al').addEventListener('click', exportAlertas);
        byId('hjp-informe').addEventListener('click', exportInforme);
        const listaRutasEl = byId('hjp-lista-rutas');
        if (listaRutasEl) {
            listaRutasEl.addEventListener('click', (e) => {
                const b = e.target.closest && e.target.closest('button');
                if (!b) return;
                const eco = b.dataset.eco;
                if (b.classList.contains('hjp-ruta-del')) eliminarRuta(eco);
                else if (b.classList.contains('hjp-ruta-geo')) exportRutaGeoJSON(eco);
                else if (b.classList.contains('hjp-traza-geo')) exportTraza(eco);
                else if (b.classList.contains('hjp-ruta-calc')) {
                    const it = unitByEco(eco);
                    const r = it ? rutaDe(it.info) : APP.rutas[eco];
                    if (r) planearRuta(eco, r.destinoTexto || (r.destino.lat + ',' + r.destino.lon), null, r.modo);
                }
            });
        }
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
        const selEst = byId('hjp-filtro-estado');
        if (selEst) {
            selEst.value = APP.filtEstado || 'todas';
            selEst.addEventListener('change', (e) => {
                APP.filtEstado = e.target.value;
                writeJSON(LS.filtEstado, APP.filtEstado);
                if (APP.tab === 'unidades') paintTabla();
            });
        }
        document.addEventListener('pointerdown', unlockAudio, { once: true });
        document.addEventListener('keydown', unlockAudio, { once: true });
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
        byId('hjp-actualizar').addEventListener('click', aplicarActualizacion);
        updateBtn.addEventListener('click', aplicarActualizacion);
        byId('hjp-nmolestar').addEventListener('click', () => { toggleNoMolestar(); });
        byId('hjp-test-btn').addEventListener('click', testNotify);
        byId('hjp-exportar-btn').addEventListener('click', exportConfig);
        byId('hjp-importar-btn').addEventListener('click', importConfig);
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
            const it = unitByEco(eco);
            const lim = it ? limiteDe(it.info) : APP.config.velMax;
            const silenciado = APP.dismissed.has(eco);
            const enLista = APP.watchMap[eco] !== undefined;
            showMenu(e.clientX, e.clientY, [
                { id: 'open', icon: ICO.panel, label: 'Abrir ventana' },
                { id: 'sil', icon: silenciado ? ICO.sonido : ICO.silencio, label: silenciado ? 'Reactivar avisos' : 'Silenciar esta unidad' },
                { id: 'verif', icon: ICO.verifica, label: 'Aplicar verificacion' },
                { sep: 1 },
                { id: 'lista', icon: ICO.bandera, label: enLista ? 'Quitar de lista vigilada' : 'Anadir a lista vigilada' },
                { id: 'limite', icon: ICO.velocidad, label: 'Limite de velocidad (actual ' + lim + ' km/h)' },
                { sep: 1 },
                { id: 'ruta-plan', icon: ICO.destino, label: 'Planear ruta (OSRM)' },
                { id: 'ruta-astar', icon: ICO.destino, label: 'Planear ruta (A*)' },
                { id: 'ruta-geo', icon: ICO.exportar, label: 'Exportar ruta GeoJSON' },
                { id: 'ruta-del', icon: ICO.cerrar, label: 'Eliminar ruta' },
                { id: 'traza-geo', icon: ICO.descargar, label: 'Exportar traza GeoJSON' },
                { sep: 1 },
                { id: 'mapa-osm', icon: ICO.zona, label: 'Ver en OpenStreetMap' },
                { id: 'mapa-google', icon: ICO.zona, label: 'Ver en Google Maps' },
                { id: 'copy-eco', icon: ICO.copiar, label: 'Copiar economico' },
                { id: 'copy-placa', icon: ICO.copiar, label: 'Copiar placa' },
                { id: 'copy-coords', icon: ICO.copiar, label: 'Copiar coordenadas' }
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
            else if (acc === 'lista') {
                if (APP.watchMap[eco] !== undefined) { quitarDeLista(eco); advice('Quitada de la lista', eco); }
                else { agregarALista(eco, ''); advice('Anadida a la lista', eco); }
                paintTabla();
            } else if (acc === 'limite') {
                const it = unitByEco(eco);
                const actual = it ? limiteDe(it.info) : APP.config.velMax;
                const val = window.prompt('Limite de velocidad para ' + eco + ' (km/h). Dejalo vacio para usar el global (' + APP.config.velMax + ').', actual);
                if (val !== null) {
                    setLimite(eco, val);
                    advice('Limite actualizado', eco + ': ' + (APP.limites[eco] ? APP.limites[eco] + ' km/h' : 'global ' + APP.config.velMax + ' km/h'));
                }
            } else if (acc === 'ruta-plan' || acc === 'ruta-astar') {
                if (acc === 'ruta-astar' && !APP.config.overpass) {
                    advice('A* desactivado', 'Activa "Permitir A* sobre datos OSM" en Ajustes · Rutas');
                } else {
                    const dest = window.prompt('Destino (lugar, direccion o "lat,lon"):', '');
                    if (dest && dest.trim()) planearRuta(eco, dest.trim(), null, acc === 'ruta-astar' ? 'astar' : 'osrm');
                }
            } else if (acc === 'ruta-geo') exportRutaGeoJSON(eco);
            else if (acc === 'ruta-del') { if (eliminarRuta(eco)) advice('Ruta eliminada', eco); else advice('Sin ruta', eco); }
            else if (acc === 'traza-geo') exportTraza(eco);
            else if (acc === 'mapa-osm') openMap(eco, 'osm');
            else if (acc === 'mapa-google') openMap(eco, 'google');
            else if (acc === 'copy-eco') { copyToClipboard(eco); advice('Copiado', eco); }
            else if (acc === 'copy-placa') {
                const u = APP.unidades.find((x) => parseUnitName(x).eco === eco);
                const placa = u ? parseUnitName(u).placa : '';
                copyToClipboard(placa);
                advice('Copiado', placa || eco);
            } else if (acc === 'copy-coords') {
                const it = unitByEco(eco);
                const txt = (it && it.st.lat != null) ? (it.st.lat + ',' + it.st.lon) : '';
                if (!txt) advice('Sin ubicacion', 'La unidad no reporta coordenadas');
                else { copyToClipboard(txt); advice('Coordenadas copiadas', txt); }
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
            g('c-voz-lang').value = APP.config.voiceLang || 'es-MX';
            g('c-beep').checked = !!APP.config.beep;
            g('c-beep-vol').value = APP.config.beepVol;
            g('c-beep-vol').step = '0.01';
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
            g('c-acento').value = APP.config.acento || '#850D22';
            g('c-coords').checked = !!APP.config.mostrarCoords;
            g('c-contornos').checked = !!APP.config.contornos;
            g('c-contorno-horas').value = APP.config.contornoHoras;
            g('c-panel-modo').value = APP.config.panelMode || 'flotante';
            g('c-panel-clicfuera').checked = !!APP.config.ocultarAlClicFuera;
            g('c-confirmar-cierre').checked = !!APP.config.confirmarCierre;
            g('c-panel-lado').value = APP.config.panelLado || 'derecha';
            g('c-panel-ancho').value = APP.config.panelAncho || 420;
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
            g('c-r-desvio').checked = !!APP.config.reglas.desvio;
            g('c-desvio-m').value = APP.config.desvioM;
            g('c-desvio-min').value = APP.config.desvioMin;
            g('c-r-retorno').checked = !!APP.config.reglas.retorno;
            g('c-retorno-m').value = APP.config.retornoM;
            g('c-retorno-pct').value = APP.config.retornoPct;
            g('c-r-giro').checked = !!APP.config.reglas.giroU;
            g('c-giro-grados').value = APP.config.giroGrados;
            g('c-giro-min').value = APP.config.giroMin;
            g('c-osrm').checked = !!APP.config.osrm;
            g('c-overpass').checked = !!APP.config.overpass;
            g('c-trazado').checked = !!APP.config.trazado;
            g('c-trazado-max').value = APP.config.trazadoMax;
            g('c-hor-on').checked = !!APP.config.horario.on;
            g('c-hor-a').value = APP.config.horario.desde;
            g('c-hor-b').value = APP.config.horario.hasta;
            pintarPerfiles();
            pintarInfoUpdate();
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
            cf.voiceLang = g('c-voz-lang').value || DEFAULTS.voiceLang;
            cf.beep = g('c-beep').checked;
            cf.beepVol = clamp(parseFloat(g('c-beep-vol').value) || cf.beepVol || DEFAULTS.beepVol, 0, 1);
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
            cf.contornos = g('c-contornos').checked;
            cf.contornoHoras = Math.max(1, isoNum(g('c-contorno-horas').value, cf.contornoHoras));
            cf.reglas.offline = g('c-r-off').checked;
            cf.reglas.gpsPerdido = g('c-r-gps').checked;
            cf.reglas.detenido = g('c-r-det').checked;
            cf.reglas.zona = g('c-r-zona').checked;
            cf.reglas.geocerca = g('c-r-geo').checked;
            cf.reglas.destino = g('c-r-des').checked;
            cf.reglas.desconexion = g('c-r-dis').checked;
            cf.reglas.velocidad = g('c-r-vel').checked;
            cf.reglas.desvio = g('c-r-desvio').checked;
            cf.desvioM = Math.max(30, isoNum(g('c-desvio-m').value, cf.desvioM));
            cf.desvioMin = Math.max(1, isoNum(g('c-desvio-min').value, cf.desvioMin));
            cf.reglas.retorno = g('c-r-retorno').checked;
            cf.retornoM = Math.max(50, isoNum(g('c-retorno-m').value, cf.retornoM));
            cf.retornoPct = clamp(isoNum(g('c-retorno-pct').value, cf.retornoPct), 5, 90);
            cf.reglas.giroU = g('c-r-giro').checked;
            cf.giroGrados = clamp(isoNum(g('c-giro-grados').value, cf.giroGrados), 90, 180);
            cf.giroMin = Math.max(1, isoNum(g('c-giro-min').value, cf.giroMin));
            cf.osrm = g('c-osrm').checked;
            cf.overpass = g('c-overpass').checked;
            cf.trazado = g('c-trazado').checked;
            cf.trazadoMax = Math.max(50, isoNum(g('c-trazado-max').value, cf.trazadoMax));
            cf.horario.on = g('c-hor-on').checked;
            cf.horario.desde = g('c-hor-a').value || DEFAULTS.horario.desde;
            cf.horario.hasta = g('c-hor-b').value || DEFAULTS.horario.hasta;
            cf.panelMode = g('c-panel-modo').value || 'flotante';
            cf.panelLado = g('c-panel-lado').value || 'derecha';
            cf.panelAncho = clamp(isoNum(g('c-panel-ancho').value, cf.panelAncho), 360, 900);
            cf.ocultarAlClicFuera = g('c-panel-clicfuera').checked;
            cf.confirmarCierre = g('c-confirmar-cierre').checked;
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
            aplicarModoPanel();
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
        byId('hjp-perfil-guardar').addEventListener('click', () => {
            const n = window.prompt('Nombre del perfil de configuracion:', '');
            if (n && n.trim()) {
                guardarPerfil(n.trim());
                advice('Perfil guardado', n.trim());
            }
        });
        byId('hjp-perfil-cargar').addEventListener('click', () => {
            const sel = byId('hjp-perfil-sel');
            const n = sel ? sel.value : '';
            if (!n) { advice('Sin perfil', 'Guarda un perfil primero'); return; }
            if (cargarPerfil(n)) {
                cfgWinEl.style.display = 'none';
                advice('Perfil cargado', n);
            }
        });
        byId('hjp-perfil-borrar').addEventListener('click', () => {
            const sel = byId('hjp-perfil-sel');
            const n = sel ? sel.value : '';
            if (!n) return;
            if (!window.confirm('¿Borrar el perfil "' + n + '"?')) return;
            borrarPerfil(n);
            advice('Perfil borrado', n);
        });
        byId('hjp-check-update').addEventListener('click', async () => {
            await comprobarActualizacion();
            const u = APP.update;
            if (u.state === 'available') advice('Nueva version disponible', u.remote + ' (instalada ' + VER + ')');
            else if (u.state === 'current') advice('Estas al dia', 'Version instalada ' + VER + ' · remota ' + (u.remote || '?'));
            else advice('No se pudo comprobar', u.lastError || 'sin conexion');
        });
        byId('hjp-limpiar-hist').addEventListener('click', () => {
            if (!APP.historial.length) { advice('Bitacora vacia', ''); return; }
            if (!window.confirm('¿Borrar toda la bitacora de avisos?')) return;
            limpiarBitacora();
            advice('Bitacora limpiada');
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
        const primerUso = !localStorage.getItem(LS.cfg);
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
        aplicarModoPanel();
        placePanel();
        paintVerifyButton();
        updateNoMolestar();
        await refresh();
        restartTimers();
        if (primerUso) {
            setTimeout(() => advice('Bienvenido a HJP · Wialon', 'Pulsa ? (en la barra o en la cabecera del panel) para la ayuda rapida'), 900);
        }
        setTimeout(comprobarActualizacion, 5000);
        setInterval(comprobarActualizacion, 30 * 60 * 1000);
        // Las ventanas de unidad pueden restaurarse despues de cargar la pagina;
        // revalidamos el contorno varias veces al inicio.
        [1500, 4000, 8000, 15000].forEach((t) => setTimeout(revalidarContornos, t));
    }
    function log() { try { console.log.apply(console, ['[HJP]'].concat(Array.prototype.slice.call(arguments))); } catch (_) { /* noop */ } }

    init();

})();
