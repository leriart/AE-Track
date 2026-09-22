// ==UserScript==
// @name         Rondo
// @namespace    https://github.com/leriart/AE-Track
// @version      5.1.0
// @description  Rondo es el script de vigilancia de flota de AE-TrackRondo. Corre sobre la API nativa de Wialon o AE-Track y evalua reglas de negocio, notifica con toasts/voz/pitido, automatiza la apertura y acomodo de ventanas de unidades y mantiene abiertas solo las seleccionadas. Panel con Dashboard, Unidades, Avisos, Geocercas y Rutas. Rutas con OpenStreetMap (OSRM), algoritmo A*, trazado automatico al asignar destino, deteccion de desvios, giros en U, retorno por viaje cancelado y trazado con exportacion GeoJSON. Incluye odometro por unidad, limite de velocidad por unidad, perfiles de configuracion, filtros, tema oscuro/claro, backup JSON y panel flotante o barra lateral. Tamano de interfaz ajustable. Sin emojis.
// @author       lerit, Hector Ramirez (HectorRamirez-cpu)
// @contributor  Hector Ramirez (https://github.com/HectorRamirez-cpu), creador del proyecto original
// @copyright    Proyecto original de Hector Ramirez (https://github.com/HectorRamirez-cpu)
// @homepageURL  https://github.com/leriart/AE-Track
// @supportURL   https://github.com/leriart/AE-Track/issues
// @updateURL    https://raw.githubusercontent.com/leriart/AE-Track/main/rondo.user.js
// @downloadURL  https://raw.githubusercontent.com/leriart/AE-Track/main/rondo.user.js
// @match        *://*.ae-track.com/*
// @match        *://ae-track.com/*
// @match        *://*.wialon.com/*
// @match        *://wialon.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/* ============================================================================
   Rondo — arquitectura

   - Una sola IIFE, modo estricto.
   - El estado vive en un objeto APP (auditable y consistente).
   - Las funciones se declaran una sola vez; cero warnings de ESLint.
   - Sin emojis: solo Unicode (◉ ◎ × △ ◆ ◇ ✓ ⚑ ⌖ ⧗ ↻ ⇩ ⌂ ↦ ↤ ⓘ ▂▄▆█ ☾ ☼ ⎘ ⌫ ⤢ ⤡ ⚙).
   - Reentrante: si la API de Wialon no está lista, avisa y reintenta.
   ============================================================================ */

(function Rondo() {
    'use strict';

    /* ====================== MIGRACION DESDE HJP WIALON ======================
     * Rondo es un proyecto nuevo (namespace/nombre distinto). Para que los
     * usuarios existentes conserven su configuracion, lista vigilada, rutas,
     * odometro y perfiles, copiamos las claves antiguas hjp.api.* -> rondo.api.*
     * y hjp.api.s.* -> rondo.api.s.* la primera vez que arranca el script.
     * COPIAMOS, no movemos: asi el script "HJP · Wialon" (si alguien conserva
     * la version anterior instalada) sigue funcionando con sus propios datos.
     * La marca de migracion evita repetir el trabajo en arranques sucesivos.
     */
    (function migrarDesdeHjp() {
        try {
            if (window.localStorage.getItem('rondo.api.migrated')) return;
            const pares = [
                ['hjp.api.cfg',      'rondo.api.cfg'],
                ['hjp.api.watch',    'rondo.api.watch'],
                ['hjp.api.memo',     'rondo.api.memo'],
                ['hjp.api.dismissed','rondo.api.dismissed'],
                ['hjp.api.hist',     'rondo.api.hist'],
                ['hjp.api.geo',      'rondo.api.geo'],
                ['hjp.api.barra',    'rondo.api.barra'],
                ['hjp.api.panelpos', 'rondo.api.panelpos'],
                ['hjp.api.panelsize','rondo.api.panelsize'],
                ['hjp.api.nmolestar','rondo.api.nmolestar'],
                ['hjp.api.expanded', 'rondo.api.expanded'],
                ['hjp.api.fullscreen','rondo.api.fullscreen'],
                ['hjp.api.limites',  'rondo.api.limites'],
                ['hjp.api.perfiles', 'rondo.api.perfiles'],
                ['hjp.api.filtEstado','rondo.api.filtEstado'],
                ['hjp.api.sortCol',  'rondo.api.sortCol'],
                ['hjp.api.sortDir',  'rondo.api.sortDir'],
                ['hjp.api.rutas',    'rondo.api.rutas'],
                ['hjp.api.odometro', 'rondo.api.odometro'],
                ['hjp.api.s.watch',  'rondo.api.s.watch'],
                ['hjp.api.s.memo',   'rondo.api.s.memo'],
                ['hjp.api.s.dismissed','rondo.api.s.dismissed'],
                ['hjp.api.s.hist',   'rondo.api.s.hist'],
                ['hjp.api.s.geo',    'rondo.api.s.geo'],
                ['hjp.api.s.seleccion','rondo.api.s.seleccion'],
                ['hjp.api.s.kpi',    'rondo.api.s.kpi'],
                ['hjp.api.s.limites', 'rondo.api.s.limites'],
                ['hjp.api.s.orden',  'rondo.api.s.orden'],
                ['hjp.api.s.viajes', 'rondo.api.s.viajes'],
                ['hjp.api.s.filtEstado','rondo.api.s.filtEstado']
            ];
            for (let i = 0; i < pares.length; i++) {
                const from = pares[i][0], to = pares[i][1];
                const v = window.localStorage.getItem(from);
                if (v == null) continue;
                if (window.localStorage.getItem(to) == null) window.localStorage.setItem(to, v);
                // No borramos la clave antigua para no romper la version vieja.
            }
            window.localStorage.setItem('rondo.api.migrated', '1');
        } catch (_) { /* sin localStorage o bloqueado: continuar */ }
    })();

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
        titlePanel: 'Rondo',
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
    const VER = '5.1.0';
    const UPDATE_URL = 'https://raw.githubusercontent.com/leriart/AE-Track/main/rondo.user.js';
    const UPDATE_URL_DEV = 'https://raw.githubusercontent.com/leriart/AE-Track/dev/rondo.user.js';
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
        cfg: 'rondo.api.cfg',
        watch: 'rondo.api.watch',
        memo: 'rondo.api.memo',
        dismissed: 'rondo.api.dismissed',
        hist: 'rondo.api.hist',
        geo: 'rondo.api.geo',
        barra: 'rondo.api.barra',
        panelpos: 'rondo.api.panelpos',
        panelsize: 'rondo.api.panelsize',
        seleccion: 'rondo.api.seleccion',
        kpi: 'rondo.api.kpi',
        nmolestar: 'rondo.api.nmolestar',
        expanded: 'rondo.api.expanded',
        fullscreen: 'rondo.api.fullscreen',
        limites: 'rondo.api.limites',
        perfiles: 'rondo.api.perfiles',
        filtEstado: 'rondo.api.filtEstado',
        sortCol: 'rondo.api.sortCol',
        sortDir: 'rondo.api.sortDir',
        rutas: 'rondo.api.rutas',
        odometro: 'rondo.api.odometro'
    });

    // Datos por pestaña (sessionStorage): cada pestaña tiene su propia copia.
    // Se migran desde LS en el primer acceso para no perder datos existentes.
    const SS = Object.freeze({
        watch: 'rondo.api.s.watch',
        memo: 'rondo.api.s.memo',
        dismissed: 'rondo.api.s.dismissed',
        hist: 'rondo.api.s.hist',
        geo: 'rondo.api.s.geo',
        seleccion: 'rondo.api.s.seleccion',
        kpi: 'rondo.api.s.kpi',
        limites: 'rondo.api.s.limites',
        orden: 'rondo.api.s.orden',
        viajes: 'rondo.api.s.viajes'
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
        escalaUI: 1,
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
        demoraBaseMin: 30,
        trazado: true,
        trazadoMax: 500,
        partidaHoras: 6,
        paradaMin: 15,
        historialHoras: 168,
        analizarAuto: true,
        autoRuta: true,
        autoRutaModo: 'osrm',
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
            giroU: false,
            demoraBase: false
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
                // Copia la lista antigua (global) a esta pestaña la primera vez.
                const legacy = localStorage.getItem(legacyKey);
                if (legacy != null) {
                    const parsed = JSON.parse(legacy);
                    sessionStorage.setItem(key, JSON.stringify(parsed));
                    return parsed;
                }
            }
        } catch (_) { /* noop */ }
        return fallback;
    }
    function writeSession(key, value) {
        try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* noop */ }
    }
    function readSessionArray(key, fallback, legacyKey) {
        const v = readSession(key, fallback, legacyKey);
        return Array.isArray(v) ? v : fallback;
    }
    function readSessionObject(key, fallback, legacyKey) {
        const v = readSession(key, fallback, legacyKey);
        return (v && typeof v === 'object' && !Array.isArray(v)) ? v : fallback;
    }
    function clearSession(key) {
        try { sessionStorage.removeItem(key); } catch (_) { /* noop */ }
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
        watchMap: readSessionObject(SS.watch, {}, LS.watch),
        seleccion: new Set(readSessionArray(SS.seleccion, [], LS.seleccion)),
        dismissed: new Set(readSessionArray(SS.dismissed, [], LS.dismissed)),
        memo: readSessionObject(SS.memo, {}, LS.memo),
        historial: readSessionArray(SS.hist, [], LS.hist),
        geoCache: readSessionObject(SS.geo, {}, LS.geo),
        limites: readSessionObject(SS.limites, {}, LS.limites),
        perfiles: readObject(LS.perfiles, {}),
        rutas: readObject(LS.rutas, {}),
        odometro: readObject(LS.odometro, {}),
        viajes: readSessionObject(SS.viajes, {}, null),
        trazas: {},
        grafoCache: {},
        snapMemo: {},
        barra: readObject(LS.barra, {
            x: null, y: null, plegada: false, vertical: false,
            botones: { main: true, panel: true, close: true }
        }),
        panelPos: readJSON(LS.panelpos, null),
        panelSize: readJSON(LS.panelsize, null),
        noMolestar: readJSON(LS.nmolestar, null),
        kpi: readSessionObject(SS.kpi, { online: [], offline: [] }, LS.kpi),
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
        sortCol: readJSON(LS.sortCol, ''),
        sortDir: readJSON(LS.sortDir, 'asc'),
        panelHidden: true,
        update: { state: 'idle', remote: null, local: VER },
        unlocked: false,
        consultaRestante: 0,
        stats: { erroresReglas: 0, astarCap: 0 }
    };
    APP.panelHidden = !APP.config.panelVisible;
    APP.orden = readSessionArray(SS.orden, [], null);
    APP.ordenModo = '';
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
            writeSession(SS.geo, APP.geoCache);
            return info;
        } catch (_) { return null; }
    }

    /* ====================== ALGORITMOS GEO / RUTAS (OSM + A*) ====================== */
    const RADIO_TIERRA = 6371008.8;
    // Umbral (km) por debajo del cual la proyeccion equirectangular local
    // tiene precision suficiente y es mas barata que la geodesica esferica.
    const DIST_LOCAL_UMBRAL_KM = 1;
    function rad(d) { return d * Math.PI / 180; }
    function grad(r) { return r * 180 / Math.PI; }
    function haversine(lat1, lon1, lat2, lon2) {
        const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
        const s = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * RADIO_TIERRA * Math.asin(Math.min(1, Math.sqrt(s)));
    }
    // Haversine en radianes (util para trigonometria esferica).
    function haversineAngular(lat1, lon1, lat2, lon2) {
        const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
        const s = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * Math.asin(Math.min(1, Math.sqrt(s)));
    }
    function bearing(lat1, lon1, lat2, lon2) {
        const p1 = rad(lat1), p2 = rad(lat2), dl = rad(lon2 - lon1);
        const y = Math.sin(dl) * Math.cos(p2);
        const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
        return (grad(Math.atan2(y, x)) + 360) % 360;
    }
    function difAngulo(a, b) { return Math.abs(((a - b + 540) % 360) - 180); }

    // Distancia punto->segmento. Para segmentos cortos usa proyeccion
    // equirectangular local (barata, suficiente); para los largos usa la
    // formula de cross-track sobre la esfera (geodesica).
    function distPuntoSegmento(lat, lon, aLat, aLon, bLat, bLon) {
        const dAB = haversine(aLat, aLon, bLat, bLon);
        if (dAB < DIST_LOCAL_UMBRAL_KM * 1000) {
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
        // Cross-track sobre la esfera (formula geodesica exacta).
        const d13 = haversineAngular(aLat, aLon, lat, lon);
        const d12 = haversineAngular(aLat, aLon, bLat, bLon);
        if (d12 < 1e-12) return { dist: d13 * RADIO_TIERRA, t: 0 };
        const t13 = rad(bearing(aLat, aLon, lat, lon));
        const t12 = rad(bearing(aLat, aLon, bLat, bLon));
        const sinXt = Math.sin(d13) * Math.sin(t13 - t12);
        const dXt = Math.asin(clamp(sinXt, -1, 1));
        // Along-track firmado: negativo si el pie cae antes de A.
        const dAtSigned = Math.atan2(Math.sin(d13) * Math.cos(t13 - t12), Math.cos(d13));
        if (dAtSigned < 0) return { dist: haversine(aLat, aLon, lat, lon), t: 0 };
        if (dAtSigned > d12) return { dist: haversine(bLat, bLon, lat, lon), t: 1 };
        return { dist: Math.abs(dXt) * RADIO_TIERRA, t: dAtSigned / d12 };
    }
    // Reduce una polilinea con Douglas-Peucker (iterativo, sin recursion).
    // Conserva mejor los vertices y curvas que un filtro por distancia minima.
    // epsM: tolerancia en metros. Default 25 m (equivalente aproximado al
    // antiguo minM=40 en lineas rectas, mejor en esquinas).
    function simplificarRuta(coords, epsM) {
        if (!coords || coords.length < 3) return coords ? coords.slice() : [];
        const eps = (epsM == null ? 25 : epsM);
        const n = coords.length;
        const keep = new Uint8Array(n);
        keep[0] = 1; keep[n - 1] = 1;
        const stack = [0, n - 1];
        while (stack.length) {
            const end = stack.pop();
            const start = stack.pop();
            if (end - start < 2) continue;
            const aLat = coords[start][1], aLon = coords[start][0];
            const bLat = coords[end][1], bLon = coords[end][0];
            let maxD = 0, maxI = -1;
            for (let i = start + 1; i < end; i++) {
                const d = distPuntoSegmento(coords[i][1], coords[i][0], aLat, aLon, bLat, bLon).dist;
                if (d > maxD) { maxD = d; maxI = i; }
            }
            if (maxI >= 0 && maxD > eps) {
                keep[maxI] = 1;
                stack.push(start, maxI);
                stack.push(maxI, end);
            }
        }
        const out = [];
        for (let i = 0; i < n; i++) if (keep[i]) out.push(coords[i]);
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
    // Proyecta un punto sobre la polilinea de una ruta. Si se pasa memo
    // (objeto { idx }), prueba primero ese segmento y sus vecinos (idx-1, idx,
    // idx+1); si el mejor candidato esta a menos de MEMO_UMBRAL_M (1 km),
    // se considera valido y se evita el escaneo completo. Si no, se hace
    // escaneo lineal (saltos grandes: recalculo, ruta nueva, GPS erratico).
    const MEMO_UMBRAL_M = 1000;
    function snapRuta(lat, lon, ruta, memo) {
        if (!ruta || !ruta.coords || ruta.coords.length < 2 || lat == null || lon == null) return null;
        const c = ruta.coords;
        const n = c.length;
        function proyectar(i) {
            if (i < 0 || i >= n - 1) return null;
            const d = distPuntoSegmento(lat, lon, c[i][1], c[i][0], c[i + 1][1], c[i + 1][0]);
            return { dist: d.dist, idx: i, t: d.t };
        }
        function resultado(mejor) {
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
        if (memo && Number.isInteger(memo.idx) && memo.idx >= 0 && memo.idx < n - 1) {
            const cands = [memo.idx, memo.idx - 1, memo.idx + 1];
            let mejor = null;
            for (let k = 0; k < cands.length; k++) {
                const p = proyectar(cands[k]);
                if (p && (!mejor || p.dist < mejor.dist)) mejor = p;
            }
            if (mejor && mejor.dist <= MEMO_UMBRAL_M) {
                memo.idx = mejor.idx;
                return resultado(mejor);
            }
        }
        // Fallback: escaneo completo (memo no disponible o vehiculo salto lejos).
        let mejor = { dist: Infinity, idx: 0, t: 0 };
        for (let i = 0; i < n - 1; i++) {
            const d = distPuntoSegmento(lat, lon, c[i][1], c[i][0], c[i + 1][1], c[i + 1][0]);
            if (d.dist < mejor.dist) mejor = { dist: d.dist, idx: i, t: d.t };
        }
        if (memo) memo.idx = mejor.idx;
        return resultado(mejor);
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

    // A* generico sobre un grafo de nodos { id: { lat, lon } } y adyacencia.
    // Cada arista puede ser: un id numerico (coste = haversine) o
    // { to, costo } donde costo es el peso real (ej. segundos). Esto permite
    // usar A* sobre el grafo OSM ponderado por maxspeed sin perder compatibilidad
    // con tests existentes.
    // Heuristica: tiempo minimo restante a la velocidad maxima posible
    // (110 km/h por autopista). Admisible y consistente.
    const VEL_MAX_RUTA_KMH = 110;
    function aEstrella(nodos, adyacencia, inicio, meta) {
        if (!nodos.has(inicio) || !nodos.has(meta)) return null;
        const metaN = nodos.get(meta);
        const hTiempo = (id) => {
            const n = nodos.get(id);
            const dM = haversine(n.lat, n.lon, metaN.lat, metaN.lon);
            return (dM / 1000) / VEL_MAX_RUTA_KMH * 3600; // segundos
        };
        const abiertos = new MinHeap();
        const g = new Map(), padre = new Map(), cerrados = new Set();
        g.set(inicio, 0);
        abiertos.push({ id: inicio, f: hTiempo(inicio) });
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
                const e = vecinos[i];
                const v = (typeof e === 'object' && e) ? e.to : e;
                const peso = (typeof e === 'object' && e && e.costo != null)
                    ? e.costo
                    : (() => {
                        const nv = nodos.get(v);
                        return nv ? haversine(nActual.lat, nActual.lon, nv.lat, nv.lon) : Infinity;
                    })();
                if (cerrados.has(v)) continue;
                const nv = nodos.get(v);
                if (!nv) continue;
                const ng = gActual + peso;
                if (g.has(v) && ng >= g.get(v)) continue;
                g.set(v, ng); padre.set(v, actual);
                abiertos.push({ id: v, f: ng + hTiempo(v) });
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
        const q = '[out:json][timeout:30];way["highway"~"motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|service|living_street"](' +
            minLat + ',' + minLon + ',' + maxLat + ',' + maxLon + ');(._;>;);out body;';
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(q)
        });
        if (!res.ok) throw new Error('Overpass HTTP ' + res.status);
        const d = await res.json();
        const nodos = new Map();
        const tagsPorWay = new Map(); // wayId -> tags
        (d.elements || []).forEach((el) => {
            if (el.type === 'node') nodos.set(el.id, { lat: el.lat, lon: el.lon });
            else if (el.type === 'way') tagsPorWay.set(el.id, el.tags || {});
        });
        // Adyacencia: Map<id, {to, distanciaM, costo}[]> donde costo es tiempo
        // estimado en segundos (distancia / velocidadPorTipo). Esto permite
        // que A* optimice por tiempo y respeta sentido unico y maxspeed.
        const ady = new Map();
        function pushArista(from, to, dist, costo) {
            if (!ady.has(from)) ady.set(from, []);
            ady.get(from).push({ to: to, distanciaM: dist, costo: costo });
        }
        (d.elements || []).forEach((el) => {
            if (el.type !== 'way' || !el.nodes || el.nodes.length < 2) return;
            const tags = tagsPorWay.get(el.id) || {};
            const sentido = sentidoOneWay(tags); // 0 bidi, 1 hacia adelante, -1 inverso
            const v = parseMaxspeed(tags) || VEL_POR_TIPO[tags.highway] || VEL_POR_TIPO.default;
            for (let i = 0; i < el.nodes.length - 1; i++) {
                const a = el.nodes[i], b = el.nodes[i + 1];
                const na = nodos.get(a), nb = nodos.get(b);
                if (!na || !nb) continue;
                const dist = haversine(na.lat, na.lon, nb.lat, nb.lon);
                const costo = (dist / 1000) / Math.max(v, 5) * 3600; // segundos
                if (sentido >= 0) pushArista(a, b, dist, costo);
                if (sentido <= 0) pushArista(b, a, dist, costo);
            }
        });
        const grafo = { nodos, ady };
        const claves = Object.keys(APP.grafoCache);
        if (claves.length > 5) claves.forEach((k) => { delete APP.grafoCache[k]; });
        APP.grafoCache[clave] = grafo;
        return grafo;
    }
    // Sentido de una calle: 0 bidireccional, 1 hacia adelante, -1 inverso.
    function sentidoOneWay(tags) {
        if (!tags) return 0;
        const v = String(tags.oneway || '').toLowerCase();
        if (v === 'yes' || v === 'true' || v === '1') return 1;
        if (v === '-1' || v === 'reverse') return -1;
        return 0;
    }
    function parseMaxspeed(tags) {
        if (!tags || !tags.maxspeed) return null;
        const m = /^\s*(\d+)/.exec(String(tags.maxspeed));
        return m ? parseInt(m[1], 10) : null;
    }
    // Velocidades por defecto por tipo de via (km/h), usadas si falta maxspeed.
    const VEL_POR_TIPO = {
        motorway: 100, motorway_link: 60,
        trunk: 80, trunk_link: 50,
        primary: 60, primary_link: 40,
        secondary: 50, secondary_link: 35,
        tertiary: 40, tertiary_link: 30,
        unclassified: 30, residential: 30,
        service: 20, living_street: 10,
        default: 30
    };
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
        if (spanLat > 1.5 || spanLon > 1.5) throw new Error('Ruta demasiado larga para A* (límite ~150 km)');
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
        if (m) {
            m.progMax = 0; m.retornoAlerta = false; m.llego = false;
            m.desviadoDesde = null; m.rumboOpDesde = null;
            writeSession(SS.memo, APP.memo);
        }
        if (APP.snapMemo[clave]) delete APP.snapMemo[clave];
    }
    async function planearRuta(eco, destinoTexto, origenOv, modo) {
        const it = unitByEco(eco);
        if (!it) { adviceErr('Unidad no encontrada', eco); return null; }
        let origen = origenOv || null;
        if (!origen && APP.config.analizarAuto) {
            // Punto de partida detectado en el historial (parada > partidaHoras).
            try {
                const v = await analizarViaje(eco, true);
                if (v && v.partida) origen = { lat: v.partida.lat, lon: v.partida.lon };
            } catch (_) { /* noop */ }
        }
        if (!origen) origen = (it.st.lat != null ? { lat: it.st.lat, lon: it.st.lon } : null);
        if (!origen) { adviceWarn('Sin origen', 'La unidad no reporta posición actual ni historial'); return null; }
        let destino = null;
        const txt = String(destinoTexto || '').trim();
        if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(txt)) {
            const p = txt.split(',').map(Number);
            destino = { lat: p[0], lon: p[1] };
        } else if (txt) {
            destino = await geocodificarLugar(txt);
        }
        if (!destino) { adviceErr('Destino no resuelto', 'Escribe un lugar o "lat,lon"'); return null; }
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
            adviceOk('Ruta creada', Math.round(ruta.total / 1000) + ' km · ' + ruta.modo);
            if (APP.tab === 'rutas') paintRutas();
            // Reanaliza el viaje ahora que existe destino (llegada/regreso/carga).
            analizarViaje(eco, true);
            return ruta;
        } catch (e) {
            adviceErr('Error de ruta', (e && e.message) || 'sin conexion');
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
    // Traza automaticamente la ruta de toda unidad vigilada que tenga destino
    // pero aun no tenga ruta (o cuya ruta apunte a un destino distinto).
    // Devuelve la cantidad de rutas que se programaron para calcular.
    function autoTrazarRutasPendientes() {
        if (!APP.config.autoRuta) return [];
        if (!APP.unidades || !APP.unidades.length) return [];
        const modo = (APP.config.autoRutaModo === 'astar' && APP.config.overpass) ? 'astar' : 'osrm';
        if (modo === 'osrm' && !APP.config.osrm) return [];
        const pendientes = [];
        const vistos = new Set();
        for (let i = 0; i < APP.unidades.length; i++) {
            if (!shouldWatch(APP.unidades[i])) continue;
            const info = parseUnitName(APP.unidades[i]);
            const eco = info.eco || info.placa || String(info.id);
            if (!eco || vistos.has(eco)) continue;
            vistos.add(eco);
            const destino = watchDest(info);
            if (!destino) continue;
            const r = rutaDe(info);
            if (r && r.destinoTexto === destino && r.modo === modo) continue;
            pendientes.push({ eco, destino, modo });
        }
        return pendientes;
    }
    // Despacha las pendientes una por una para no saturar los servicios publicos.
    async function autoTrazarRutas() {
        const pendientes = autoTrazarRutasPendientes();
        if (!pendientes.length) return 0;
        let ok = 0;
        for (let i = 0; i < pendientes.length; i++) {
            const p = pendientes[i];
            try {
                const r = await planearRuta(p.eco, p.destino, null, p.modo);
                if (r) ok++;
            } catch (_) { /* planearRuta ya muestra el error */ }
            // Pausa entre peticiones para respetar el limite de Nominatim/OSRM.
            if (i < pendientes.length - 1) await sleep(1200);
        }
        return ok;
    }
    // Tiempo estimado restante (segundos) usando la velocidad reportada o, en
    // su defecto, una velocidad prudencial de carretera. Devuelve null si no
    // hay datos suficientes.
    function calcularETA(s, ruta, vel) {
        if (!s || !ruta || !ruta.total) return null;
        const restante = Math.max(0, ruta.total - (s.recorrido || 0));
        const v = (Number.isFinite(vel) && vel > 5) ? vel : 50;
        return restante / 1000 / v * 3600;
    }
    // Estado de la unidad respecto a su ruta, segun la posicion actual.
    // Usa snapRuta cuando hay coordenadas validas; si la unidad esta offline
    // o sin coordenadas lo refleja explicitamente. Ademas exige cercania real
    // al destino: un snap con progreso alto pero distancia enorme (punto
    // "pasado" del final de la polilinea) no cuenta como llegada.
    function estadoRuta(info, st) {
        const r = rutaDe(info);
        if (!r) return { estado: 'SIN RUTA' };
        if (!st || !st.online) return { estado: 'SIN POSICION', ruta: r };
        if (st.lat == null || st.lon == null) return { estado: 'SIN POSICION', ruta: r };
        const memo = APP.snapMemo[info.clave] || (APP.snapMemo[info.clave] = { idx: 0 });
        const s = snapRuta(st.lat, st.lon, r, memo);
        if (!s) return { estado: 'SIN POSICION', ruta: r };
        const llego = s.progreso >= 0.95 && s.dist <= APP.config.retornoM;
        const desviado = s.dist > APP.config.desvioM;
        const estado = llego ? 'LLEGO' : (desviado ? 'DESV' : 'EN RUTA');
        return { estado, ruta: r, snap: s, llego, desviado };
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
        if (!r) { adviceWarn('Sin ruta', eco); return; }
        const geojson = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: { tipo: 'ruta', eco, modo: r.modo, distancia_m: Math.round(r.total) }, geometry: { type: 'LineString', coordinates: r.coords } },
                { type: 'Feature', properties: { tipo: 'origen' }, geometry: { type: 'Point', coordinates: [r.origen.lon, r.origen.lat] } },
                { type: 'Feature', properties: { tipo: 'destino', texto: r.destinoTexto || '' }, geometry: { type: 'Point', coordinates: [r.destino.lon, r.destino.lat] } }
            ]
        };
        descargarJSON(geojson, 'rondo_ruta_' + eco + '_' + new Date().toISOString().slice(0, 10) + '.geojson');
        adviceOk('Ruta exportada', Math.round(r.total / 1000) + ' km');
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
        descargarJSON(geojson, 'rondo_traza_' + eco + '_' + new Date().toISOString().slice(0, 10) + '.geojson');
        adviceOk('Traza exportada', arr.length + ' puntos');
    }

    /* ====================== ANALISIS DE VIAJE (historial) ====================== */
    function esZonaCarga(nombre) {
        return /\b(CARGA|CARGAR|DESCARGA|CEDIS|PATIO|PLANTA|OFICINAS|ALMACEN|TALLER|BODEGA|BASCULA|RASTRO|LABORATORIO|SILO)\b/.test(norm(nombre));
    }
    // Descarga el historial de posiciones y velocidad de una unidad.
    async function fetchHistorial(uid, horas) {
        const ahora = Math.floor(Date.now() / 1000);
        const r = await remoteCall('messages/load_interval', {
            itemId: uid,
            timeFrom: ahora - Math.max(1, horas) * 3600,
            timeTo: ahora,
            flags: 1, flagsMask: 1, loadCount: 5000
        });
        return (r.messages || []).map((m) => {
            const pos = m.pos || {};
            return { t: m.t, lat: pos.y, lon: pos.x, s: pos.s || 0 };
        }).filter((p) => p.lat != null && p.lon != null && p.t).sort((a, b) => a.t - b.t);
    }
    // Punto de partida: el ultimo tramo parado (<=3 km/h) de al menos `horas`
    // horas, es decir, donde el vehiculo estuvo apagado/parado mas de 6 horas.
    // Usa DBSCAN con grid espacial sobre los puntos con velocidad baja para
    // agrupar lecturas cercanas (insensible al jitter GPS).
    function detectarPuntoPartida(puntos, horas) {
        const grupos = segmentosParados(puntos, 0, puntos.length);
        const umbralSeg = Math.max(1, horas) * 3600;
        // El tramo "abierto" (que llega hasta el final) no cuenta como inicio.
        const tFin = puntos[puntos.length - 1].t;
        for (let i = grupos.length - 1; i >= 0; i--) {
            const g = grupos[i];
            const abierto = (tFin - g.hasta) <= 60;
            if (abierto) continue;
            if (g.durSeg >= umbralSeg) {
                return {
                    lat: g.lat, lon: g.lon, t: g.desde,
                    durHoras: g.durSeg / 3600, finIdx: g.finIdx
                };
            }
        }
        return null;
    }
    // Paradas de al menos `paradaMin` minutos dentro del trayecto.
    function analizarParadas(puntos, desde, paradaMin, partidaSeg) {
        const grupos = segmentosParados(puntos, desde, puntos.length);
        return grupos.filter((g) => {
            return g.durSeg >= paradaMin * 60 && g.durSeg < partidaSeg;
        }).map((g) => ({
            lat: g.lat, lon: g.lon, desde: g.desde, hasta: g.hasta,
            durMin: g.durSeg / 60, abierto: false
        }));
    }
    // Umbrales y helpers de clusterizacion de paradas (DBSCAN espacial).
    const UMBRAL_PARADO_KMH = 3;
    const DBSCAN_EPS_M = 80;
    const DBSCAN_MIN_PTS = 2;

    // Agrupa puntos cercanos (clusterizacion por densidad).
    function dbscanStops(puntos, epsM, minPts) {
        if (!puntos || puntos.length === 0) return [];
        const eps = epsM || DBSCAN_EPS_M;
        const minN = minPts || DBSCAN_MIN_PTS;
        const cellDeg = eps / 110000;
        const grid = new Map();
        for (let i = 0; i < puntos.length; i++) {
            const key = Math.floor(puntos[i].lat / cellDeg) + ',' + Math.floor(puntos[i].lon / cellDeg);
            let arr = grid.get(key);
            if (!arr) { arr = []; grid.set(key, arr); }
            arr.push(i);
        }
        const visitado = new Uint8Array(puntos.length);
        const clusters = [];
        for (let i = 0; i < puntos.length; i++) {
            if (visitado[i]) continue;
            visitado[i] = 1;
            const vecinos = vecinosCercanos(puntos, i, eps, cellDeg, grid);
            if (vecinos.length < minN) continue;
            const cluster = [i];
            const cola = vecinos.slice();
            while (cola.length) {
                const k = cola.pop();
                if (!visitado[k]) {
                    visitado[k] = 1;
                    const n2 = vecinosCercanos(puntos, k, eps, cellDeg, grid);
                    if (n2.length >= minN) {
                        for (let q = 0; q < n2.length; q++) cola.push(n2[q]);
                    }
                }
                if (cluster.indexOf(k) < 0) cluster.push(k);
            }
            clusters.push(cluster);
        }
        return clusters;
    }
    function vecinosCercanos(puntos, i, eps, cellDeg, grid) {
        const cx = Math.floor(puntos[i].lat / cellDeg);
        const cy = Math.floor(puntos[i].lon / cellDeg);
        const out = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const cell = grid.get((cx + dx) + ',' + (cy + dy));
                if (!cell) continue;
                for (let m = 0; m < cell.length; m++) {
                    const j = cell[m];
                    if (j === i) continue;
                    if (haversine(puntos[i].lat, puntos[i].lon, puntos[j].lat, puntos[j].lon) <= eps) {
                        out.push(j);
                    }
                }
            }
        }
        return out;
    }
    function segmentosParados(puntos, desde, hasta) {
        const candidatos = [];
        const indices = [];
        for (let i = desde; i < hasta; i++) {
            if (puntos[i].s <= UMBRAL_PARADO_KMH) {
                candidatos.push(puntos[i]);
                indices.push(i);
            }
        }
        if (candidatos.length === 0) return [];
        const clusters = dbscanStops(candidatos, DBSCAN_EPS_M, DBSCAN_MIN_PTS);
        const grupos = [];
        for (let c = 0; c < clusters.length; c++) {
            const cl = clusters[c];
            let sumLat = 0, sumLon = 0;
            let tIni = Infinity, tFin = -Infinity;
            let idxIni = -1, idxFin = -1;
            for (let q = 0; q < cl.length; q++) {
                const k = cl[q];
                const p = candidatos[k];
                sumLat += p.lat; sumLon += p.lon;
                if (p.t < tIni) { tIni = p.t; idxIni = indices[k]; }
                if (p.t > tFin) { tFin = p.t; idxFin = indices[k]; }
            }
            grupos.push({
                lat: sumLat / cl.length, lon: sumLon / cl.length,
                desde: tIni, hasta: tFin, durSeg: tFin - tIni,
                iniIdx: idxIni, finIdx: idxFin,
                nPuntos: cl.length
            });
        }
        grupos.sort((a, b) => a.desde - b.desde);
        return grupos;
    }
    async function analizarViaje(eco, silencioso) {
        const it = unitByEco(eco);
        if (!it) { if (!silencioso) adviceErr('Unidad no encontrada', eco); return null; }
        const horas = Math.max(2, Number(APP.config.historialHoras) || 168);
        const partidaHoras = Math.max(1, Number(APP.config.partidaHoras) || 6);
        const paradaMin = Math.max(1, Number(APP.config.paradaMin) || 15);
        if (!silencioso) advice('Analizando viaje', 'historial de ' + horas + ' h...');
        let puntos = [];
        try { puntos = await fetchHistorial(it.u.id, horas); }
        catch (e) { if (!silencioso) adviceWarn('Sin historial', (e && e.message) || 'sin conexion'); return null; }
        if (puntos.length < 3) { if (!silencioso) adviceWarn('Sin datos', 'No hay suficiente historial'); return null; }
        const partida = detectarPuntoPartida(puntos, partidaHoras);
        if (!partida) { if (!silencioso) advice('Sin punto de partida', 'No se halló una parada de más de ' + partidaHoras + ' h'); return null; }
        const desde = partida.finIdx;
        const trayecto = puntos.slice(desde);
        const paradas = analizarParadas(puntos, desde, paradaMin, partidaHoras * 3600);
        let dist = 0;
        for (let i = 1; i < trayecto.length; i++) {
            dist += haversine(trayecto[i - 1].lat, trayecto[i - 1].lon, trayecto[i].lat, trayecto[i].lon);
        }
        let salida = null;
        for (let i = desde; i < puntos.length; i++) { if (puntos[i].s > 3) { salida = puntos[i]; break; } }
        const fin = puntos[puntos.length - 1];
        let maxDist = 0;
        for (let i = desde; i < puntos.length; i++) {
            const d = haversine(partida.lat, partida.lon, puntos[i].lat, puntos[i].lon);
            if (d > maxDist) maxDist = d;
        }
        const ruta = rutaDe(it.info);
        let llego = false, tLlegada = null, destino = null;
        const radio = Math.max(150, Number(APP.config.retornoM) || 400);
        if (ruta && ruta.destino) {
            for (let i = desde; i < puntos.length; i++) {
                if (haversine(puntos[i].lat, puntos[i].lon, ruta.destino.lat, ruta.destino.lon) <= radio) {
                    llego = true; tLlegada = puntos[i].t;
                    destino = { lat: ruta.destino.lat, lon: ruta.destino.lon };
                    break;
                }
            }
        }
        const distInicio = haversine(fin.lat, fin.lon, partida.lat, partida.lon);
        const regreso = !!(llego && distInicio > 300 && distInicio < maxDist * 0.6);
        const zonaPartida = zoneAt(partida.lat, partida.lon);
        const cargo = esZonaCarga(zonaPartida)
            || (paradas.length > 0 && haversine(paradas[0].lat, paradas[0].lon, partida.lat, partida.lon) < 300);
        const traza = simplificarRuta(trayecto.map((p) => [p.lon, p.lat]), 120);
        const v = {
            eco: it.info.eco, uid: it.u.id,
            partida, salida: salida ? salida.t : partida.t,
            fin: { lat: fin.lat, lon: fin.lon, t: fin.t },
            paradas, puntos: trayecto.length, distanciaKm: Math.round(dist / 1000),
            zonaPartida, cargo, llego, tLlegada, destino, regreso,
            maxDistKm: Math.round(maxDist / 1000), traza, analizado: Date.now()
        };
        APP.viajes[it.info.eco] = v;
        writeSession(SS.viajes, APP.viajes);
        if (APP.tab === 'rutas') paintRutas();
        if (!silencioso) {
            adviceOk('Viaje analizado', v.distanciaKm + ' km · ' + v.paradas.length + ' parada(s)'
                + (cargo ? ' · carga' : '') + (llego ? ' · llego a destino' : '') + (regreso ? ' · en regreso' : ''));
        }
        return v;
    }
    function exportViajeGeoJSON(eco) {
        const v = APP.viajes[eco];
        if (!v) { adviceWarn('Sin análisis', 'Analiza el viaje primero'); return; }
        const features = [];
        if (v.traza && v.traza.length > 1) {
            features.push({ type: 'Feature', properties: { tipo: 'trayecto', eco, distancia_km: v.distanciaKm }, geometry: { type: 'LineString', coordinates: v.traza } });
        }
        features.push({ type: 'Feature', properties: { tipo: 'partida', zona: v.zonaPartida || '' }, geometry: { type: 'Point', coordinates: [v.partida.lon, v.partida.lat] } });
        if (v.destino) features.push({ type: 'Feature', properties: { tipo: 'destino' }, geometry: { type: 'Point', coordinates: [v.destino.lon, v.destino.lat] } });
        v.paradas.forEach((p, i) => features.push({ type: 'Feature', properties: { tipo: 'parada', n: i + 1, minutos: Math.round(p.durMin) }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } }));
        descargarJSON({ type: 'FeatureCollection', features }, 'rondo_viaje_' + eco + '_' + new Date().toISOString().slice(0, 10) + '.geojson');
        adviceOk('Viaje exportado', eco);
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
        writeSession(SS.limites, APP.limites);
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
            adviceWarn('Sin ubicación', 'La unidad no reporta coordenadas');
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
    // Acumula distancia recorrida por unidad cuando se mueve a mas de 1 km/h.
    // Saltos GPS anomalos (>5 km en 1 minuto) se descartan para no inflar el
    // odometro. Persiste en localStorage.
    const ODOMETRO_MAX_SALTO_M = 5000;
    function actualizarOdometro(info, st, prev) {
        if (!info || !info.clave || !st || st.online !== true) return;
        if (st.lat == null || st.lon == null) return;
        if (st.vel != null && st.vel <= 1) return;
        const clave = info.clave;
        const od = APP.odometro[clave] || (APP.odometro[clave] = { m: 0, ultimoLat: null, ultimoLon: null, ultimoT: null });
        if (od.ultimoLat != null && od.ultimoLon != null && st.t && od.ultimoT) {
            const dt = Math.max(1, st.t - od.ultimoT);
            const d = haversine(od.ultimoLat, od.ultimoLon, st.lat, st.lon);
            if (d <= ODOMETRO_MAX_SALTO_M) od.m += d;
        }
        od.ultimoLat = st.lat;
        od.ultimoLon = st.lon;
        od.ultimoT = st.t || Math.floor(Date.now() / 1000);
        writeJSON(LS.odometro, APP.odometro);
    }
    function resetOdometro(eco) {
        const it = unitByEco(eco);
        if (!it) return;
        APP.odometro[it.info.clave] = { m: 0, ultimoLat: null, ultimoLon: null, ultimoT: null };
        writeJSON(LS.odometro, APP.odometro);
        adviceOk('Odómetro reiniciado', it.info.eco);
    }
    function odometroDe(info) {
        if (!info || !info.clave) return null;
        return APP.odometro[info.clave] || null;
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
        writeSession(SS.hist, APP.historial);

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
        const cont = byId('rondo-toasts');
        if (!cont) return;
        const card = makeEl('div', { className: 'rondo-toast' });
        card.style.borderLeftColor = COL[item.sev] || '#555';
        const color = COL[item.sev] || '#777';
        card.innerHTML =
            '<span class="ico rondo-mi" style="color:' + color + '">' + item.icono + '</span>' +
            '<div class="cuerpo"><b>' + esc(item.titulo) + '</b>' +
            (item.detalle ? '<span>' + esc(item.detalle) + '</span>' : '') +
            '</div><span class="hora">' + new Date(item.ts).toLocaleTimeString().slice(0, 5) + '</span>' +
            '<button class="mini" data-acc="x">×</button>';
        card.querySelector('[data-acc="x"]').addEventListener('click', () => { if (card.parentNode) card.parentNode.removeChild(card); });
        cont.appendChild(card);
        setTimeout(() => {
            card.classList.add('sale');
            setTimeout(() => { if (card.parentNode) card.parentNode.removeChild(card); }, 400);
        }, APP.config.toastSeg * 1000);
        while (cont.children.length > 6) cont.removeChild(cont.firstChild);
    }
    // Toasts informativos con severidad opcional: 'info' (default), 'ok',
    // 'warn'/'medio', 'err'/'critico'. El color del borde y del icono sale de
    // COL, por lo que cada severidad se distingue de un vistazo.
    function advice(titulo, detalle, sev) {
        const s = sev || 'info';
        const ic = (s === 'ok') ? ICO.ok
            : (s === 'warn' || s === 'medio') ? ICO.medio
                : (s === 'err' || s === 'critico' || s === 'alto') ? ICO.critico
                    : ICO.info;
        // 'info' usa el color azul de la severidad 'bajo' (COL no tiene 'info').
        const sevCol = (s === 'info') ? 'bajo' : s;
        toast({ sev: sevCol, icono: ic, titulo, detalle: detalle || '', ts: Date.now() });
    }
    function adviceOk(t, d) { advice(t, d, 'ok'); }
    function adviceWarn(t, d) { advice(t, d, 'medio'); }
    function adviceErr(t, d) { advice(t, d, 'critico'); }
    // Pone un boton en estado ocupado: spinner, aria-busy y deshabilitado.
    // Restaura el contenido original al terminar.
    function setBusy(btn, on) {
        if (!btn) return;
        if (on) {
            if (btn.dataset.rondoTxt == null) btn.dataset.rondoTxt = btn.innerHTML;
            btn.classList.add('rondo-busy');
            btn.setAttribute('aria-busy', 'true');
            btn.disabled = true;
            btn.innerHTML = '<span class="rondo-spin"></span>';
        } else {
            btn.classList.remove('rondo-busy');
            btn.removeAttribute('aria-busy');
            btn.disabled = false;
            if (btn.dataset.rondoTxt != null) {
                btn.innerHTML = btn.dataset.rondoTxt;
                delete btn.dataset.rondoTxt;
            }
        }
    }
    // Ejecuta una accion async mostrando el boton ocupado hasta que termine.
    async function conBusy(btn, fn) {
        setBusy(btn, true);
        try { return await fn(); } finally { setBusy(btn, false); }
    }

    /* ====================== DIALOGO PROPIO ======================
     * Sustituye a window.confirm/window.prompt con la misma estetica del
     * panel. Api:
     *   rondoConfirm(titulo, mensaje, onOk, {peligro, okText, icon})
     *   rondoPrompt(titulo, label, valor, onOk, {placeholder, type, okText})
     *   abrirDialogo({...})  // generico
     */
    let dlgEl = null, dlgPrevFocus = null;
    function ensureDialog() {
        if (dlgEl && dlgEl.isConnected) return dlgEl;
        dlgEl = makeEl('div', { id: 'rondo-dialog' });
        dlgEl.setAttribute('role', 'dialog');
        dlgEl.setAttribute('aria-modal', 'true');
        document.body.appendChild(dlgEl);
        return dlgEl;
    }
    function dialogoAbierto() { return !!(dlgEl && dlgEl.classList.contains('abierto')); }
    function cerrarDialogo() {
        if (!dlgEl) return;
        dlgEl.classList.remove('abierto');
        dlgEl.innerHTML = '';
        if (dlgPrevFocus && dlgPrevFocus.focus && dlgPrevFocus.isConnected) {
            try { dlgPrevFocus.focus(); } catch (_) { /* noop */ }
        }
        dlgPrevFocus = null;
    }
    function abrirDialogo(opts) {
        const el = ensureDialog();
        dlgPrevFocus = document.activeElement;
        const inputId = opts.input ? 'rondo-dlg-input' : '';
        const inp = opts.input || {};
        el.innerHTML =
            '<div class="dlg-head"><span class="rondo-mi">' + (opts.icon || ICO.info) + '</span>' +
            '<span>' + esc(opts.titulo) + '</span></div>' +
            '<div class="dlg-body">' +
            (opts.html || '') +
            (opts.input ? '<input id="' + inputId + '" type="' + (inp.type || 'text') + '" placeholder="' +
                esc(inp.placeholder || '') + '" value="' + esc(inp.value == null ? '' : inp.value) + '">' : '') +
            '</div>' +
            '<div class="dlg-foot">' +
            (opts.cancel === false ? '' : '<button class="dlg-cancel">' + esc(opts.cancelText || 'Cancelar') + '</button>') +
            '<button class="dlg-ok' + (opts.peligro ? ' peligro' : '') + '">' + esc(opts.okText || 'Aceptar') + '</button>' +
            '</div>';
        el.classList.add('abierto');
        const okBtn = el.querySelector('.dlg-ok');
        const cancelBtn = el.querySelector('.dlg-cancel');
        const inpEl = opts.input ? byId(inputId) : null;
        if (inpEl) { inpEl.focus(); if (inpEl.select) inpEl.select(); }
        else if (okBtn) okBtn.focus();
        okBtn.addEventListener('click', () => {
            const val = inpEl ? inpEl.value : undefined;
            cerrarDialogo();
            if (opts.onOk) opts.onOk(val);
        });
        if (cancelBtn) cancelBtn.addEventListener('click', cerrarDialogo);
        if (inpEl) inpEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); okBtn.click(); }
        });
        return el;
    }
    function rondoConfirm(titulo, mensaje, onOk, opts) {
        const o = opts || {};
        abrirDialogo({
            icon: o.icon || ICO.medio,
            titulo: titulo,
            html: '<p>' + esc(mensaje) + '</p>',
            okText: o.okText || 'Confirmar',
            peligro: !!o.peligro,
            onOk: onOk
        });
    }
    function rondoPrompt(titulo, label, value, onOk, opts) {
        const o = opts || {};
        abrirDialogo({
            icon: o.icon || ICO.ajustes,
            titulo: titulo,
            html: label ? '<p>' + esc(label) + '</p>' : '',
            input: { value: value == null ? '' : value, placeholder: o.placeholder || '', type: o.type || 'text' },
            okText: o.okText || 'Aceptar',
            onOk: (val) => { if (val !== null && val !== undefined) onOk(val); }
        });
    }
    // Estado vacio reutilizable: icono + titulo + pista + accion opcional.
    // `hint` admite HTML controlado; `accion` es HTML de botones.
    // Indicador de cambios sin guardar en la ventana de ajustes.
    let cfgDirty = false;
    function marcarCfgDirty() {
        cfgDirty = true;
        const d = byId('rondo-cfg-dirty');
        if (d) d.classList.add('on');
    }
    function limpiarCfgDirty() {
        cfgDirty = false;
        const d = byId('rondo-cfg-dirty');
        if (d) d.classList.remove('on');
    }
    function emptyState(icon, titulo, hint, accion) {
        return '<div class="rondo-vacio">' +
            '<span class="rondo-mi">' + icon + '</span>' +
            '<b>' + esc(titulo) + '</b>' +
            (hint ? '<span>' + hint + '</span>' : '') +
            (accion || '') +
            '</div>';
    }
    // Solo reescribe innerHTML si el contenido cambio. El panel se repinta cada
    // segundo; reasignar el mismo HTML destruye y recrea los nodos, lo que
    // reinicia las animaciones CSS de entrada (parpadeo). La clave es el id del
    // contenedor.
    const _htmlMemo = Object.create(null);
    function setHtml(el, html) {
        if (!el) return false;
        const key = el.id || '';
        if (_htmlMemo[key] === html) return false;
        _htmlMemo[key] = html;
        el.innerHTML = html;
        return true;
    }
    function invalidarHtml(id) { delete _htmlMemo[id]; }
    function abrirBienvenida() {
        abrirDialogo({
            icon: ICO.automatizar,
            titulo: 'Bienvenido a Rondo',
            cancel: false,
            okText: 'Empezar',
            html:
                '<p>Vigilancia de flota sobre Wialon, directo en el navegador. En 3 pasos:</p>' +
                '<div class="pasos">' +
                '<div class="paso"><span class="n">1</span><div><b>Elige unidades</b>' +
                '<span>En <i>Automatizar Unidades</i> pega los economicos, o activa <i>Monitorear todas</i> en Ajustes.</span></div></div>' +
                '<div class="paso"><span class="n">2</span><div><b>Evalua reglas</b>' +
                '<span>El script vigila sin señal, detenciones, zonas, geocercas, velocidad y rutas. Ajustalo en Ajustes.</span></div></div>' +
                '<div class="paso"><span class="n">3</span><div><b>Vigila los avisos</b>' +
                '<span>Tarjetas, voz, pitido y notificación. Revisa el historial en la pestaña <i>Avisos</i>.</span></div></div>' +
                '</div>'
        });
    }
/* ====================== MOTOR DE REGLAS ======================
 * Cada regla recibe (u, st, prev, R, info, etq, ctx), muta R con su estado
 * persistente (desde cuando, maximo progreso, etc.) y puede llamar a
 * pushAlert. evaluateUnit solo orquesta; asi se pueden anadir o quitar
 * reglas sin tocar el resto.
 */
    async function reglaOffline(st, prev, R, info, etq) {
        if (!APP.config.reglas.offline) return;
        if (prev && prev.estado !== 'offline' && st.estado === 'offline') {
            pushAlert({
                regla: 'offline', sev: 'alto', clave: info.clave, eco: info.eco,
                titulo: 'SIN SENAL · ' + etq,
                detalle: 'sin reportar hace ' + ageText(st.edadMin) + (R.zona ? ' · ' + R.zona : ''),
                hablar: 'Atención, la unidad ' + etq + ' se ha desconectado'
            });
        } else if (prev && prev.estado === 'offline' && st.estado !== 'offline') {
            pushAlert({
                regla: 'offline', sev: 'ok', clave: info.clave, eco: info.eco,
                titulo: 'RECONECTO · ' + etq,
                detalle: 'volvió a reportar · ' + Math.round(st.vel) + ' km/h',
                hablar: 'La unidad ' + etq + ' volvió a estar en línea'
            });
            R.descoAlerta = false;
        }
    }
    async function reglaGpsPerdido(st, prev, R, info, etq) {
        if (!APP.config.reglas.gpsPerdido || !prev || prev.estado === 'offline') return;
        if (prev.vel > 5 && st.estado === 'offline' && st.edadMin >= APP.config.gpsMin) {
            pushAlert({
                regla: 'gpsPerdido', sev: 'critico', clave: info.clave, eco: info.eco,
                titulo: 'SENAL PERDIDA EN MARCHA · ' + etq,
                detalle: 'ultima velocidad ' + Math.round(prev.vel) + ' km/h · sin datos ' + ageText(st.edadMin) + (prev.zona ? ' · ' + prev.zona : ''),
                hablar: 'Atención, se perdio la señal de la unidad ' + etq + ' en marcha'
            });
        }
    }
    async function reglaDetenido(u, st, R, info, etq, ctx) {
        if (!APP.config.reglas.detenido) return;
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
                let ctxTxt = ctx.ubicaciones[info.clave];
                if (ctxTxt == null && ctx.quotaGeo) {
                    const g = await reverseGeocode(st.lat, st.lon);
                    ctx.ubicaciones[info.clave] = ctxTxt = g ? (g.texto || g.ciudad || '') : '';
                }
                pushAlert({
                    regla: 'detenido', sev: 'medio', clave: info.clave, eco: info.eco, soloHorario: true,
                    titulo: 'DETENIDO ' + Math.round(m) + ' min · ' + etq,
                    detalle: (R.zona ? 'zona: ' + R.zona : 'fuera de geocercas') + (ctxTxt ? ' · ' + ctxTxt : ''),
                    hablar: 'La unidad ' + etq + ' lleva ' + Math.round(m) + ' minutos detenida'
                });
            }
        } else {
            R.detenidoDesde = null;
        }
    }
    function reglaZona(st, R, info, etq) {
        if (!APP.config.reglas.zona) return;
        const z = R.zona;
        if (z && !isBase(z)) {
            const destino = watchDest(info);
            const esperada = destino && norm(z).indexOf(norm(destino)) >= 0;
            if (!esperada) {
                if (!R.zonaExt || R.zonaExt.n !== z) R.zonaExt = { n: z, desde: Date.now() / 1000 };
                const m = (Date.now() / 1000 - R.zonaExt.desde) / 60;
                if (m >= APP.config.zonaMin) {
                    pushAlert({
                        regla: 'zona', sev: 'medio', clave: info.clave, eco: info.eco, soloHorario: true,
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
    function reglaGeocerca(st, prev, R, info, etq) {
        if (!APP.config.reglas.geocerca || !prev || prev.zona === R.zona) return;
        if (R.zona) {
            pushAlert({
                regla: 'geocerca', sev: 'bajo', clave: info.clave, eco: info.eco,
                titulo: 'ENTRO · ' + etq,
                detalle: ICO.entra + ' ' + R.zona + ' · ' + Math.round(st.vel) + ' km/h'
            });
        } else if (prev.zona) {
            pushAlert({
                regla: 'geocerca', sev: 'bajo', clave: info.clave, eco: info.eco,
                titulo: 'SALIO · ' + etq,
                detalle: ICO.sale + ' ' + prev.zona + ' · ' + Math.round(st.vel) + ' km/h'
            });
        }
    }
    async function reglaDestino(st, R, info, etq) {
        if (!APP.config.reglas.destino) return;
        const destino = watchDest(info);
        if (!destino || !st.online) return;
        const ruta = rutaDe(info);
        let enDestino = false;
        let detalle = '';
        // Preferimos la deteccion geometrica cuando hay ruta trazada: el
        // avance sobre la polilinea es mas preciso y rapido que el geocoding
        // inverso, y no depende del area行政 devuelta por Nominatim.
        if (ruta && st.lat != null && st.lon != null) {
            const memo = APP.snapMemo[info.clave] || (APP.snapMemo[info.clave] = { idx: 0 });
            const s = snapRuta(st.lat, st.lon, ruta, memo);
            if (s) {
                if (s.progreso >= 0.95) {
                    enDestino = true;
                    detalle = 'a ' + Math.round(s.dist) + ' m del destino';
                } else if (s.dist <= APP.config.retornoM) {
                    // Muy cerca del destino aunque el progreso no este completo
                    // (por ejemplo, llegada por un camino alterno).
                    enDestino = true;
                    detalle = 'cerca del destino (' + Math.round(s.dist) + ' m)';
                }
            }
        }
        if (!enDestino) {
            const geo = await reverseGeocode(st.lat, st.lon);
            const ciudad = geo ? geo.ciudad : '';
            if (ciudad && (norm(ciudad).indexOf(norm(destino)) >= 0 || norm(destino).indexOf(norm(ciudad)) >= 0)) {
                enDestino = true;
                detalle = 'en ' + ciudad;
            }
        }
        if (enDestino && !R.enDestino) {
            R.enDestino = true;
            pushAlert({
                regla: 'destino', sev: 'ok', clave: info.clave, eco: info.eco,
                titulo: 'LLEGO A DESTINO · ' + etq,
                detalle: detalle || 'cerca del destino',
                hablar: 'La unidad ' + etq + ' llego a su destino'
            });
        } else if (!enDestino && R.enDestino && st.vel > 10) {
            R.enDestino = false;
            pushAlert({
                regla: 'destino', sev: 'bajo', clave: info.clave, eco: info.eco,
                titulo: 'EN REGRESO · ' + etq,
                detalle: 'salio de ' + destino + ' · ' + Math.round(st.vel) + ' km/h',
                hablar: 'La unidad ' + etq + ' va en regreso'
            });
        }
    }
    async function reglaDesconexion(st, R, info, etq) {
        if (!APP.config.reglas.desconexion || st.estado !== 'offline' || st.edadMin < APP.config.descoMin) return;
        if (!R.descoAlerta) {
            R.descoAlerta = true;
            pushAlert({
                regla: 'desconexion', sev: 'critico', clave: info.clave, eco: info.eco,
                titulo: 'DESCONEXION PROLONGADA · ' + etq,
                detalle: 'lleva ' + ageText(st.edadMin) + ' sin señal',
                hablar: 'Atención, la unidad ' + etq + ' sigue desconectada'
            });
        }
    }
    function reglaVelocidad(st, R, info, etq) {
        if (!APP.config.reglas.velocidad || !st.online) return;
        const lim = limiteDe(info);
        if (st.vel > lim) {
            pushAlert({
                regla: 'velocidad', sev: 'medio', clave: info.clave, eco: info.eco, soloHorario: true,
                titulo: 'EXCESO DE VELOCIDAD · ' + etq,
                detalle: Math.round(st.vel) + ' km/h (límite ' + lim + ')',
                hablar: 'La unidad ' + etq + ' excede la velocidad'
            });
        }
    }
    function reglaDemoraBase(st, R, info, etq) {
        if (!APP.config.reglas.demoraBase) return;
        if (!st.online || st.vel > 1) { R.demoraBaseAlerta = 0; return; }
        if (!isBase(R.zona)) { R.demoraBaseAlerta = 0; return; }
        if (R.enDestino || R.llego) return;
        if (!R.demoraBaseAlerta) R.demoraBaseAlerta = Date.now() / 1000;
        const min = (Date.now() / 1000 - R.demoraBaseAlerta) / 60;
        if (min >= APP.config.demoraBaseMin) {
            pushAlert({
                regla: 'demoraBase', sev: 'bajo', clave: info.clave, eco: info.eco, soloHorario: true,
                titulo: 'DEMORA EN BASE · ' + etq,
                detalle: Math.round(min) + ' min parado en ' + R.zona,
                hablar: 'La unidad ' + etq + ' lleva ' + Math.round(min) + ' minutos en base sin salir'
            });
            // Re-armar: la proxima alerta se disparara tras demoraBaseMin
            // desde este momento (el cooldown de pushAlert evita duplicados).
            R.demoraBaseAlerta = Date.now() / 1000;
        }
    }
    function reglaRuta(st, R, info, etq) {
        const ruta = rutaDe(info);
        const sigueRuta = APP.config.reglas.desvio || APP.config.reglas.retorno || APP.config.reglas.giroU;
        if (!ruta || !sigueRuta || !st.online || st.lat == null) return;
        if (!APP.snapMemo[info.clave]) APP.snapMemo[info.clave] = { idx: 0 };
        const s = snapRuta(st.lat, st.lon, ruta, APP.snapMemo[info.clave]);
        if (!s) return;
        R.rutaDist = Math.round(s.dist);
        R.rutaProg = s.progreso;

        if (APP.config.reglas.desvio) {
            if (s.dist > APP.config.desvioM) {
                if (!R.desviadoDesde) R.desviadoDesde = Date.now() / 1000;
                const m = (Date.now() / 1000 - R.desviadoDesde) / 60;
                if (m >= APP.config.desvioMin) {
                    pushAlert({
                        regla: 'desvio', sev: 'alto', clave: info.clave, eco: info.eco,
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
                        regla: 'destino', sev: 'ok', clave: info.clave, eco: info.eco,
                        titulo: 'LLEGO A DESTINO · ' + etq,
                        detalle: ruta.destinoTexto ? 'en ' + ruta.destinoTexto : 'en el punto de destino',
                        hablar: 'La unidad ' + etq + ' llego a su destino'
                    });
                }
            }
            if (!R.retornoAlerta && !R.llego && R.progMax >= 0.15 && (enOrigen || retrocedio)) {
                R.retornoAlerta = true;
                pushAlert({
                    regla: 'retorno', sev: 'critico', clave: info.clave, eco: info.eco,
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
                        regla: 'giroU', sev: 'medio', clave: info.clave, eco: info.eco, soloHorario: true,
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
            demoraBaseAlerta: prev ? (prev.demoraBaseAlerta || 0) : 0,
            llego: prev ? prev.llego : false
        };
        try {
            await reglaOffline(st, prev, R, info, etq);
            // Si la unidad vuelve a reportar, rearma la alerta de desconexion
            // aunque la regla general este desactivada.
            if (st.estado !== 'offline') R.descoAlerta = false;
            await reglaGpsPerdido(st, prev, R, info, etq);
            await reglaDetenido(u, st, R, info, etq, ctx);
            reglaZona(st, R, info, etq);
            reglaGeocerca(st, prev, R, info, etq);
            await reglaDestino(st, R, info, etq);
            await reglaDesconexion(st, R, info, etq);
            reglaVelocidad(st, R, info, etq);
            reglaDemoraBase(st, R, info, etq);
            reglaRuta(st, R, info, etq);
        } catch (e) {
            APP.stats.erroresReglas = (APP.stats.erroresReglas || 0) + 1;
            if (APP.unlocked) console.warn('[Rondo] regla', clave, e && e.message);
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
                    actualizarOdometro(info, st, prev);
                } catch (e) {
                    if (APP.unlocked) { try { console.warn('[Rondo] reg', info.clave, e && e.message); } catch (_) { /* noop */ } }
                }
            }
            APP.memo = nuevas;
            writeSession(SS.memo, APP.memo);

            const watched = unidades.filter(shouldWatch);
            const onNow = watched.filter((u) => unitState(u).online).length;
            APP.kpi.online = APP.kpi.online.concat(onNow).slice(-180);
            APP.kpi.offline = APP.kpi.offline.concat(watched.length - onNow).slice(-180);
            writeSession(SS.kpi, APP.kpi);

            paintPanel();
            revalidarContornos();
        } catch (e) {
            if (APP.unlocked) { try { console.warn('[Rondo] refresh', e && e.message); } catch (_) { /* noop */ } }
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
            return !!(el && el.closest && el.closest('#rondo-panel,#rondo-barra,#rondo-modal,#rondo-config,#rondo-ayuda,#rondo-contexto,#rondo-toasts,#rondo-aviso,#rondo-rail,#rondo-dialog'));
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
        btn.innerHTML = '<span class="rondo-mi">' + ICO.alto + '</span> Confirmar';
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
        guardarOrden();
        guardarLista();
        // Si se anade o cambia un destino y esta el auto-trazado activo,
        // se recalcula la ruta de esa unidad en background.
        if (APP.config.autoRuta && APP.watchMap[eco] && APP.watchMap[eco] !== destinoPrev) {
            const it = unitByEco(eco);
            if (it) {
                const r = rutaDe(it.info);
                if (!r || r.destinoTexto !== APP.watchMap[eco]) {
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
        const body = byId('rondo-modal-lista');
        if (!body) return;
        sincronizarOrden();
        marcarModoOrden(APP.ordenModo || '');
        const ecos = APP.orden.slice();
        if (!ecos.length) {
            body.innerHTML = '<div class="lista-empty">Lista vacía. Pega abajo o añade uno.</div>';
            return;
        }
        body.innerHTML = ecos.map((eco, i) => (
            '<div class="lista-row" data-eco="' + esc(eco) + '">' +
            '<span class="rondo-drag-handle" draggable="true" title="Arrastrar para cambiar el orden">⠿</span>' +
            '<span class="orden-num">' + (i + 1) + '</span>' +
            '<span class="eco">' + esc(eco) + '</span>' +
            '<input type="text" class="rondo-dest" data-eco="' + esc(eco) + '" value="' + esc(APP.watchMap[eco] || '') + '" placeholder="destino opcional">' +
            '<button class="rondo-del" data-eco="' + esc(eco) + '" draggable="false" title="Quitar de la lista"><span class="rondo-mi">' + ICO.cerrar + '</span></button>' +
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

    /* ====================== VERIFICACION ====================== */
    function captureSelection() {
        const list = openWindows();
        APP.seleccion = new Set(list.map((v) => v.eco).filter(Boolean));
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        advice('Selección capturada', APP.seleccion.size + ' ventana(s) / unidad(es)');
        paintInfo();
        if (APP.tab === 'unidades') paintTabla();
        return APP.seleccion.size;
    }
    function addToSelection(eco, placa) {
        if (eco) APP.seleccion.add(eco);
        else if (placa) APP.seleccion.add(placa);
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        paintInfo();
    }
    function removeFromSelection(eco, placa) {
        if (eco) APP.seleccion.delete(eco);
        else if (placa) APP.seleccion.delete(placa);
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        paintInfo();
    }
    function selectAllVisible() {
        const rows = document.querySelectorAll('#rondo-body tr.fila');
        let n = 0;
        rows.forEach((tr) => {
            const eco = tr.dataset.eco;
            if (!eco) return;
            if (!APP.seleccion.has(eco)) {
                APP.seleccion.add(eco);
                n++;
            }
        });
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        advice('Selección añadida', n + ' unidad(es) visible(s)');
        paintInfo();
        paintTabla();
        return n;
    }
    function clearSelection() {
        const n = APP.seleccion.size;
        APP.seleccion.clear();
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        advice('Selección vaciada', n + ' unidad(es) liberadas');
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
                if (!silent) advice('Verificación', cerradas + ' ventana(s) ajena(s) cerrada(s)');
            } else if (!silent) {
                advice('Verificación', 'Solo estan abiertas las ventanas seleccionadas');
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
        const b = byId('rondo-verif');
        if (!b) return;
        b.classList.toggle('activo', !!APP.config.verificar);
        b.title = APP.config.verificar
            ? 'Verificacion activa: solo se mantienen las ventanas seleccionadas'
            : 'Activar verificación de ventanas';
    }
    async function execList(ecos) {
        // Respeta el orden configurado (pegado, numero o arrastrado).
        sincronizarOrden();
        const ordenados = ordenarPorLista(ecos, (e) => e);
        APP.seleccion = new Set(ordenados.map((e) => normEco(e)).filter(Boolean));
        writeSession(SS.seleccion, Array.from(APP.seleccion));
        paintInfo();
        for (let i = 0; i < ordenados.length; i++) {
            const b = byId('rondo-btn-main');
            if (b) {
                b.innerHTML = '<span class="rondo-mi">' + ICO.automatizar + '</span> Buscando (' + (i + 1) + '/' + ordenados.length + ')...';
                b.style.background = 'linear-gradient(135deg,#f57c00,#ff9800)';
            }
            await openUnitWindow(ordenados[i]);
            await sleep(250);
        }
        const inp = findSearchInput();
        if (inp) clearInput(inp);
        const b = byId('rondo-btn-main');
        if (b) {
            b.innerHTML = '<span class="rondo-mi">' + ICO.panel + '</span> Organizando...';
            b.style.background = 'var(--rondo-accent-grad)';
        }
        await sleep(400);
        await organizeWindows();
        await verifyWindows(true);
        resetMainBtn();
    }
    function resetMainBtn() {
        mainBtn.innerHTML = '<span class="rondo-mi">' + ICO.automatizar + '</span> Automatizar Unidades';
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
        if (theme === 'claro') document.body.setAttribute('data-rondo-theme', 'claro');
        else document.body.removeAttribute('data-rondo-theme');
        const ti = document.querySelector('#rondo-tema .rondo-mi');
        if (ti) ti.textContent = (theme === 'claro') ? ICO.sol : ICO.luna;
        const btnTema = byId('rondo-tema');
        if (btnTema) btnTema.title = 'Tema: ' + theme;
        if (c.acento) {
            const a2 = aclarar(c.acento, 0.28);
            document.documentElement.style.setProperty('--rondo-accent', c.acento);
            document.documentElement.style.setProperty('--rondo-accent-2', a2);
            document.documentElement.style.setProperty('--rondo-accent-grad', 'linear-gradient(135deg,' + c.acento + ',' + a2 + ')');
            const rgb = hexToRgb(c.acento);
            if (rgb) document.documentElement.style.setProperty('--rondo-accent-rgb', rgb.r + ',' + rgb.g + ',' + rgb.b);
        }
        const p = byId('rondo-panel');
        if (p) p.classList.toggle('density-compact', c.density === 'compact');
        // Escala de interfaz: un solo factor multiplica textos y controles.
        document.documentElement.style.setProperty('--rondo-esc', String(normalizarEscala(c.escalaUI)));
    }
    // Normaliza el factor de escala de UI a uno de los valores permitidos.
    const ESCALAS_UI = [1, 1.15, 1.3, 1.5];
    function normalizarEscala(v) {
        const n = Number(v);
        if (!Number.isFinite(n)) return 1;
        let mejor = ESCALAS_UI[0];
        for (let i = 0; i < ESCALAS_UI.length; i++) {
            if (Math.abs(ESCALAS_UI[i] - n) < Math.abs(mejor - n)) mejor = ESCALAS_UI[i];
        }
        return mejor;
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
        const b = byId('rondo-nmolestar');
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
            "  --rondo-bg:#1f2330; --rondo-bg-soft:#272d3c; --rondo-bg-strong:#313849;\n" +
            "  --rondo-border:#3a4252; --rondo-border-soft:#2f3645;\n" +
            "  --rondo-fg:#e8ecf3; --rondo-fg-dim:#9aa4b5; --rondo-fg-mute:#6f7888;\n" +
            "  --rondo-accent:#850D22; --rondo-accent-2:#B52C44; --rondo-accent-rgb:133,13,34;\n" +
            "  --rondo-ok:#43a047; --rondo-ok-fg:#a5d6a7; --rondo-ok-bg:#1b3320;\n" +
            "  --rondo-warn:#f9a825; --rondo-warn-fg:#ffe082; --rondo-warn-bg:#33270e;\n" +
            "  --rondo-bad:#e53935; --rondo-bad-fg:#ef9a9a; --rondo-bad-bg:#2b1010;\n" +
            "  --rondo-shadow:0 4px 14px rgba(0,0,0,.32);\n" +
            "  --rondo-radius:10px;\n" +
            "  --rondo-radius-sm:7px;\n" +
            "  --rondo-accent-grad:linear-gradient(135deg,#950f27,#B52C44);\n" +
            "  --rondo-elev:0 10px 26px rgba(0,0,0,.42);\n" +
            "  --rondo-font:'Inter','Roboto','Segoe UI','Helvetica Neue',Arial,sans-serif;\n" +
            "  --rondo-easing:cubic-bezier(.4,0,.2,1);\n" +
            "  --rondo-esc:1;\n" +
            "}\n" +
            "body[data-rondo-theme='claro']{\n" +
            "  --rondo-bg:#f5f7fa; --rondo-bg-soft:#ffffff; --rondo-bg-strong:#eef2f7;\n" +
            "  --rondo-border:#dfe4ec; --rondo-border-soft:#ebeef3;\n" +
            "  --rondo-fg:#1d2433; --rondo-fg-dim:#5b6577; --rondo-fg-mute:#8993a3;\n" +
            "  --rondo-accent:#850D22; --rondo-accent-2:#B52C44;\n" +
            "  --rondo-ok:#2e7d32; --rondo-ok-fg:#1b5e20; --rondo-ok-bg:#e8f5e9;\n" +
            "  --rondo-warn:#f9a825; --rondo-warn-fg:#8d6b00; --rondo-warn-bg:#fff4d4;\n" +
            "  --rondo-bad:#c62828; --rondo-bad-fg:#b71c1c; --rondo-bad-bg:#fde2e2;\n" +
            "  --rondo-shadow:0 2px 8px rgba(20,30,50,.10);\n" +
            "  --rondo-elev:0 8px 22px rgba(20,30,50,.16);\n" +
            "}\n" +
            "#rondo-toasts{position:fixed;bottom:20px;right:15px;z-index:1000002;display:flex;flex-direction:column;gap:8px;width:330px;pointer-events:none;transition:opacity .2s}\n" +
            ".rondo-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:9px;background:var(--rondo-bg-soft);color:var(--rondo-fg);\n" +
            "  border-left:4px solid var(--rondo-accent);border-radius:var(--rondo-radius);padding:10px 12px;box-shadow:var(--rondo-shadow);\n" +
            "  font:12.5px/1.35 var(--rondo-font);animation: rondoIn .28s var(--rondo-easing) both}\n" +
            ".rondo-toast.sale{opacity:0;transform:translateX(40px);transition:all .35s var(--rondo-easing)}\n" +
            "@keyframes rondoIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}\n" +
            ".rondo-toast .ico{font-size:18px;line-height:1;width:18px;text-align:center}\n" +
            ".rondo-toast .cuerpo{display:flex;flex-direction:column;flex:1;min-width:0}\n" +
            ".rondo-toast .cuerpo b{font-size:12.5px}\n" +
            ".rondo-toast .cuerpo span{color:var(--rondo-fg-dim);font-size:11.5px;margin-top:2px}\n" +
            ".rondo-toast .hora{color:var(--rondo-fg-mute);font-size:10px}\n" +
            ".rondo-toast .mini{background:transparent;border:none;color:var(--rondo-fg-mute);cursor:pointer;font-size:11px}\n" +
            "#rondo-barra{position:fixed;top:80px;right:15px;z-index:999999;display:flex;flex-wrap:wrap;row-gap:4px;align-items:center;gap:6px;\n" +
            "  background:rgba(28,30,36,.94);border:1px solid var(--rondo-border);border-radius:10px;padding:5px;\n" +
            "  box-shadow:var(--rondo-shadow);font:12px var(--rondo-font);user-select:none;touch-action:none;max-width:95vw}\n" +
            "#rondo-barra.vertical{flex-direction:column;align-items:stretch}\n" +
            "#rondo-barra .rondo-grip{cursor:grab;color:var(--rondo-fg-mute);padding:0 3px;font-size:15px;line-height:1;letter-spacing:-2px;user-select:none}\n" +
            "#rondo-barra .rondo-grip:active{cursor:grabbing}\n" +
            "#rondo-barra .rondo-btn{display:inline-flex;align-items:center;gap:4px;background:var(--rondo-bg-strong);color:var(--rondo-fg);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);padding:7px 11px;\n" +
            "  cursor:pointer;font:600 12px var(--rondo-font);white-space:nowrap;transition:filter .15s,transform .1s,box-shadow .15s}\n" +
            "#rondo-barra .rondo-btn:hover{filter:brightness(1.15);transform:translateY(-1px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-barra .rondo-btn:active{transform:translateY(0)}\n" +
            "#rondo-barra .rondo-fold{background:var(--rondo-bg);color:var(--rondo-fg-dim);padding:4px 9px}\n" +
            "#rondo-barra.plegada .rondo-btn:not(.rondo-fold){display:none}\n" +
            "#rondo-btn-main,#rondo-btn-panel,#rondo-btn-modo{background:var(--rondo-accent-grad);color:#fff;border-color:transparent}\n" +
            "#rondo-btn-close{background:var(--rondo-bg-strong);color:var(--rondo-fg-dim)}\n" +
            "#rondo-btn-update{background:linear-gradient(135deg,#2e7d32,#43a047);color:#fff;border-color:transparent;box-shadow:0 0 0 0 rgba(67,160,71,.5);animation: rondoPulseGreen 2s infinite}\n" +
            "#rondo-panel .rondo-tile.armado,#rondo-barra .rondo-btn.armado{background:linear-gradient(135deg,#b71c1c,#e53935)!important;color:#fff!important;border-color:transparent!important;animation: rondoArmPulse .7s ease infinite}\n" +
            "@keyframes rondoArmPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}\n" +
            "@keyframes rondoPulseGreen{0%{box-shadow:0 0 0 0 rgba(67,160,71,.55)}70%{box-shadow:0 0 0 9px rgba(67,160,71,0)}100%{box-shadow:0 0 0 0 rgba(67,160,71,0)}}\n" +
            "#rondo-panel .rondo-iconbtn.warn{color:var(--rondo-warn)}\n" +
            "#rondo-panel{position:fixed;left:10px;bottom:10px;width:470px;height:440px;display:none;flex-direction:column;\n" +
            "  background:var(--rondo-bg);color:var(--rondo-fg);font:12.5px/1.4 var(--rondo-font);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius);\n" +
            "  box-shadow:var(--rondo-elev);z-index:1000000;overflow:hidden;resize:both;min-width:360px;min-height:260px;max-width:1000px;max-height:92vh;\n" +
            "  transition:transform .3s var(--rondo-easing),opacity .2s ease,border-color .2s}\n" +
            "#rondo-panel.visible{opacity:1}\n" +
            "#rondo-panel.lateral{left:auto;right:0;top:0;bottom:0;height:100vh;max-height:100vh;border-radius:0;resize:none;\n" +
            "  box-shadow:-14px 0 34px rgba(0,0,0,.35);border-top:none;border-bottom:none;border-right:none;will-change:transform}\n" +
            "#rondo-panel.lateral.izquierda{left:0;right:auto;box-shadow:14px 0 34px rgba(0,0,0,.35);border-left:none;border-right:1px solid var(--rondo-border)}\n" +
            "#rondo-panel.lateral header{cursor:default}\n" +
            "#rondo-panel.lateral.oculto{transform:translateX(100%);opacity:0;pointer-events:none}\n" +
            "#rondo-panel.lateral.izquierda.oculto{transform:translateX(-100%)}\n" +
            "#rondo-panel.dragging{transition:none;opacity:1}\n" +
            "#rondo-rail{position:fixed;top:50%;transform:translateY(-50%);width:34px;height:104px;background:var(--rondo-accent-grad);\n" +
            "  border:none;border-radius:17px;display:none;align-items:center;justify-content:center;flex-direction:column;gap:2px;\n" +
            "  cursor:pointer;z-index:999999;box-shadow:var(--rondo-elev);color:#fff;font:600 15px var(--rondo-font);\n" +
            "  opacity:0;transition:transform .25s var(--rondo-easing),opacity .25s ease,filter .15s}\n" +
            "#rondo-rail:hover{transform:translateY(-50%) scale(1.08);filter:brightness(1.12)}\n" +
            "#rondo-rail.mostrar{display:flex;opacity:1;animation: rondoRailIn .3s var(--rondo-easing)}\n" +
            "#rondo-rail .rondo-rail-txt{writing-mode:vertical-rl;text-orientation:mixed;font-size:9px;letter-spacing:1.5px;opacity:.85}\n" +
            "#rondo-rail.derecha{right:0;border-radius:17px 0 0 17px;padding-right:2px}\n" +
            "#rondo-rail.izquierda{left:0;border-radius:0 17px 17px 0;padding-left:2px}\n" +
            "@keyframes rondoRailIn{from{opacity:0;transform:translateY(-50%) scale(.8)}to{opacity:1;transform:translateY(-50%) scale(1)}}\n" +
            ".rondo-mi{font-family:'Material Icons','Material Symbols Outlined';font-weight:normal;font-style:normal;font-size:1.1em;line-height:1;vertical-align:-2px;display:inline-block;text-transform:none;letter-spacing:normal;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}\n" +
            "#rondo-barra .rondo-btn .rondo-mi{font-size:1.05em;vertical-align:-2px;margin-right:1px}\n" +
            "#rondo-panel header{display:flex;align-items:center;gap:4px;padding:8px 10px;background:linear-gradient(180deg,var(--rondo-bg-strong),var(--rondo-bg-soft));cursor:move;border-bottom:1px solid var(--rondo-border-soft);flex-wrap:wrap;box-shadow:0 1px 0 rgba(255,255,255,.03)}\n" +
            "#rondo-panel header h3{margin:0 6px 0 2px;font-size:13px;flex:1;letter-spacing:.2px;font-weight:700;min-width:110px}\n" +
            "#rondo-panel .rondo-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;background:transparent;border:1px solid transparent;color:var(--rondo-fg-dim);cursor:pointer;border-radius:var(--rondo-radius-sm);font-size:13px;line-height:1;transition:background .15s var(--rondo-easing),color .15s,transform .1s,box-shadow .15s}\n" +
            "#rondo-panel .rondo-iconbtn:hover{background:var(--rondo-bg);border-color:var(--rondo-border);color:var(--rondo-fg);transform:translateY(-1px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .rondo-iconbtn:active{transform:translateY(0)}\n" +
            "#rondo-panel .rondo-iconbtn.activo{background:var(--rondo-accent-grad);color:#fff;border-color:transparent;box-shadow:0 3px 10px rgba(var(--rondo-accent-rgb),.4)}\n" +
            "#rondo-panel .tabs{display:flex;gap:4px;background:var(--rondo-bg-soft);padding:6px 8px;border-bottom:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-panel .tab{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:4px;background:transparent;border:1px solid transparent;color:var(--rondo-fg-dim);padding:8px 4px;cursor:pointer;font:600 11.5px/1 var(--rondo-font);border-radius:var(--rondo-radius-sm);letter-spacing:.2px;transition:background .18s var(--rondo-easing),color .18s,box-shadow .18s,transform .1s}\n" +
            "#rondo-panel .tab .etqt{font-size:11px;letter-spacing:.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n" +
            "#rondo-panel .tab:hover{color:var(--rondo-fg);background:var(--rondo-bg-strong);transform:translateY(-1px)}\n" +
            "#rondo-panel .tab.activo{color:#fff;background:var(--rondo-accent-grad);box-shadow:0 3px 10px rgba(var(--rondo-accent-rgb),.35)}\n" +
            "#rondo-panel .tab .contador{font-size:10px;background:var(--rondo-bg-strong);color:var(--rondo-fg-dim);padding:1px 5px;border-radius:8px;margin-left:2px;display:inline-block;font-weight:700}\n" +
            "#rondo-panel .tab.activo .contador{background:rgba(255,255,255,.25);color:#fff}\n" +
            "#rondo-panel .tools{display:flex;gap:6px;padding:7px 9px;border-bottom:1px solid var(--rondo-border-soft);flex-wrap:wrap;align-items:center;background:var(--rondo-bg-soft)}\n" +
            "#rondo-panel .tools button{display:inline-flex;align-items:center;gap:4px;background:var(--rondo-bg-strong);color:var(--rondo-fg);border:1px solid var(--rondo-border-soft);border-radius:var(--rondo-radius-sm);padding:5px 9px;cursor:pointer;font-size:11px;font-weight:600;transition:background .15s,transform .1s,box-shadow .15s,border-color .15s}\n" +
            "#rondo-panel .tools button:hover{background:var(--rondo-bg);border-color:var(--rondo-fg-mute);transform:translateY(-1px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .tools button:active{transform:translateY(0)}\n" +
            "#rondo-panel .tools button.activo{background:var(--rondo-accent-grad);color:#fff;border-color:transparent}\n" +
            "#rondo-panel input.filtro{flex:1;min-width:90px;background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:6px;padding:4px 7px;font-size:12px}\n" +
            "#rondo-panel input.filtro:focus{outline:none;border-color:var(--rondo-accent-2)}\n" +
            "#rondo-panel select.filtro{flex:0 0 auto;background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:6px;padding:4px 7px;font-size:12px}\n" +
            "#rondo-panel select.filtro:focus{outline:none;border-color:var(--rondo-accent-2)}\n" +
            "#rondo-panel .severidad-pick{display:flex;gap:3px;align-items:center;padding:6px 9px;background:var(--rondo-bg-soft);border-bottom:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-panel .severidad-pick span{cursor:pointer;padding:2px 6px;border-radius:5px;font:600 11px var(--rondo-font);border:1px solid var(--rondo-border);color:var(--rondo-fg-dim)}\n" +
            "#rondo-panel .severidad-pick span.activo{border-color:var(--rondo-accent-2);color:var(--rondo-fg)}\n" +
            "#rondo-panel .tabla{overflow:auto;flex:1}\n" +
            "#rondo-panel table{width:100%;border-collapse:collapse}\n" +
            "#rondo-panel th{position:sticky;top:0;background:var(--rondo-bg-soft);text-align:left;padding:6px 9px;font-size:11px;color:var(--rondo-fg-dim);border-bottom:1px solid var(--rondo-border-soft);z-index:1;letter-spacing:.3px;text-transform:uppercase}\n" +
            "#rondo-panel td{padding:5px 9px;border-top:1px solid var(--rondo-border-soft);white-space:nowrap;font-size:12px}\n" +
            "#rondo-panel tr.fila{cursor:pointer;transition:background .1s}\n" +
            "#rondo-panel tr.fila:hover{background:var(--rondo-bg-soft)}\n" +
            "@keyframes rondoPulse{0%{background:var(--rondo-warn-bg)}to{background:transparent}}\n" +
            "#rondo-panel tr.off td.eco{color:var(--rondo-bad-fg);font-weight:bold}\n" +
            "#rondo-panel tr.det td.eco{color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel tr.on td.eco{color:var(--rondo-ok-fg)}\n" +
            "#rondo-panel .estadoicon{display:inline-block;width:18px;text-align:center;font-size:13px}\n" +
            "#rondo-panel .estadoicon.off{color:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .estadoicon.det{color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .estadoicon.on{color:var(--rondo-ok-fg)}\n" +
            "#rondo-panel .mini{display:inline-flex;align-items:center;justify-content:center;gap:3px;background:var(--rondo-bg-strong);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);border-radius:var(--rondo-radius-sm);cursor:pointer;padding:3px 8px;font-size:11px;transition:background .15s,color .15s,transform .1s,border-color .15s}\n" +
            "#rondo-panel .mini:hover{background:var(--rondo-bg);color:var(--rondo-fg);border-color:var(--rondo-fg-mute);transform:translateY(-1px)}\n" +
            "#rondo-panel .minusil.on{background:var(--rondo-warn-bg);color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .alerta{display:flex;gap:9px;padding:8px 10px;border-bottom:1px solid var(--rondo-border-soft);align-items:flex-start;transition:background .1s}\n" +
            "#rondo-panel .alerta:hover{background:var(--rondo-bg-soft)}\n" +
            "#rondo-panel .alerta .ico{font-size:16px;line-height:1.15;width:18px;text-align:center}\n" +
            "#rondo-panel .alerta .cuerpo{flex:1;min-width:0;display:flex;flex-direction:column}\n" +
            "#rondo-panel .alerta b{font-size:12px;letter-spacing:.2px}\n" +
            "#rondo-panel .alerta span{color:var(--rondo-fg-dim);font-size:11.5px;margin-top:2px}\n" +
            "#rondo-panel .alerta .hora{color:var(--rondo-fg-mute);font-size:10px}\n" +
            "#rondo-panel .alerta .meta{display:flex;gap:6px;font-size:10px;color:var(--rondo-fg-mute);margin-top:3px;flex-wrap:wrap}\n" +
            "#rondo-panel .alerta .meta .regla{background:var(--rondo-bg-strong);padding:1px 5px;border-radius:4px}\n" +
            "#rondo-dash{display:flex;flex-direction:column;padding:14px;gap:12px;overflow:auto;flex:1;max-width:1200px;margin:0 auto;box-sizing:border-box}\n" +
            "#rondo-dash .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}\n" +
            "#rondo-panel .tabla{padding:8px 4px}\n" +
            "#rondo-panel .tabla table{width:auto;max-width:100%;min-width:100%;margin:0 auto;border-collapse:collapse}\n" +
            "#rondo-panel .kpi{background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:8px;padding:9px 11px;display:flex;flex-direction:column;gap:3px}\n" +
            "#rondo-panel .kpi .etq{font-size:10px;color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.5px}\n" +
            "#rondo-panel .kpi .valor{font:600 18px/1 var(--rondo-font);color:var(--rondo-fg)}\n" +
            "#rondo-panel .kpi.ok .valor{color:var(--rondo-ok-fg)}\n" +
            "#rondo-panel .kpi.warn .valor{color:var(--rondo-warn-fg)}\n" +
            "#rondo-panel .kpi.bad .valor{color:var(--rondo-bad-fg)}\n" +
            "#rondo-panel .kpi.sub .valor{color:var(--rondo-fg)}\n" +
            "#rondo-panel .kpi .resumen{font-size:11px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-dash .sparkline{display:block;width:100%;height:44px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:7px;padding:6px}\n" +
            "#rondo-dash .sparkline path{fill:none;stroke-width:1.6}\n" +
            "#rondo-dash .recent{padding:9px;background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);border-radius:8px}\n" +
            "#rondo-dash .recent h4{margin:0 0 6px;font-size:11px;color:var(--rondo-fg-dim);text-transform:uppercase;letter-spacing:.5px}\n" +
            "#rondo-dash .recent .alerta{padding:5px 0;border-bottom-color:var(--rondo-border-soft)}\n" +
            "#rondo-panel table.zone td{padding:5px 9px}\n" +
            "#rondo-panel table.zone tr.fila td:first-child{color:var(--rondo-accent-2);font-weight:600}\n" +
            "#rondo-panel .zone .contador-unidades{color:var(--rondo-ok-fg);font-weight:600}\n" +
            "#rondo-modal,#rondo-config,#rondo-ayuda,#rondo-contexto{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--rondo-bg-soft);padding:14px;\n" +
            "  border-radius:10px;box-shadow:var(--rondo-shadow);z-index:1000001;display:none;flex-direction:column;gap:10px;\n" +
            "  width:340px;color:var(--rondo-fg);font:13px var(--rondo-font);border:1px solid var(--rondo-border)}\n" +
            "#rondo-modal{width:520px;max-height:88vh;overflow-y:auto;overflow-x:hidden;padding:0}\n" +
            "#rondo-modal > h3{padding:12px 14px 6px}\n" +
            "#rondo-modal > p{padding:0 14px 8px}\n" +
            "#rondo-modal > textarea{margin:0 14px 0;width:calc(100% - 28px);height:88px}\n" +
            "#rondo-modal .rondo-modal-actions{display:flex;gap:6px;padding:6px 14px 0}\n" +
            "#rondo-modal .rondo-modal-actions button{background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:6px;padding:4px 10px;cursor:pointer;font:11.5px var(--rondo-font)}\n" +
            "#rondo-modal .rondo-modal-actions button:hover{background:var(--rondo-bg-strong);border-color:var(--rondo-fg-mute)}\n" +
            "#rondo-modal .mini{display:inline-flex;align-items:center;justify-content:center;gap:3px;background:var(--rondo-bg-strong);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg-dim);border-radius:var(--rondo-radius-sm);cursor:pointer;padding:4px 9px;font:600 11px var(--rondo-font);transition:background .15s,color .15s,transform .1s,border-color .15s,box-shadow .15s}\n" +
            "#rondo-modal .mini:hover{background:var(--rondo-bg);color:var(--rondo-fg);border-color:var(--rondo-fg-mute);transform:translateY(-1px)}\n" +
            "#rondo-modal-lista-wrap{margin:8px 14px 0;border:1px solid var(--rondo-border);border-radius:7px;max-height:200px;overflow:auto}\n" +
            "#rondo-modal-lista .lista-row{display:flex;gap:6px;align-items:center;padding:5px 8px;border-bottom:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-modal-lista .lista-row:last-child{border-bottom:none}\n" +
            "#rondo-modal-lista .lista-row .eco{font:600 12px monospace;color:var(--rondo-accent-2);min-width:64px}\n" +
            "#rondo-modal-lista .lista-row .rondo-dest{flex:1;background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:5px;padding:4px 7px;font-size:12px}\n" +
            "#rondo-modal-lista .lista-row .rondo-dest:focus{outline:none;border-color:var(--rondo-accent-2)}\n" +
            "#rondo-modal-lista .lista-row button{background:transparent;border:1px solid var(--rondo-border);color:var(--rondo-fg-dim);border-radius:5px;padding:2px 9px;cursor:pointer;font-size:11px}\n" +
            "#rondo-modal-lista .lista-row button:hover{color:var(--rondo-bad-fg);border-color:var(--rondo-bad-fg)}\n" +
            "#rondo-modal-lista .lista-empty{padding:14px;text-align:center;color:var(--rondo-fg-mute);font-size:12px}\n" +
            "#rondo-modal-lista .lista-row.arrastrando{opacity:.5;background:var(--rondo-bg-strong)}\n" +
            "#rondo-modal-lista .rondo-drag-handle{cursor:grab;color:var(--rondo-fg-mute);font-size:14px;letter-spacing:-2px;padding:0 4px;user-select:none;touch-action:none}\n" +
            "#rondo-modal-lista .rondo-drag-handle:active{cursor:grabbing}\n" +
            "#rondo-modal-lista .orden-num{font:600 10px monospace;color:var(--rondo-fg-mute);min-width:16px;text-align:right}\n" +
            "#rondo-modal .rondo-order-tools{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:8px 14px 0;padding:7px 9px;background:var(--rondo-bg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius-sm);font-size:11px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-modal .rondo-order-tools .etq{font-weight:600;color:var(--rondo-fg)}\n" +
            "#rondo-modal .rondo-order-tools button.activo{background:var(--rondo-accent);color:#fff;border-color:transparent;box-shadow:0 2px 8px rgba(var(--rondo-accent-rgb),.35)}\n" +
            "#rondo-modal .rondo-modal-add{display:flex;gap:6px;padding:8px 14px 0}\n" +
            "#rondo-modal .rondo-modal-add input{background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:5px;padding:5px 7px;font-size:12px;flex:1;min-width:60px}\n" +
            "#rondo-modal .rondo-modal-add input:focus{outline:none;border-color:var(--rondo-accent-2)}\n" +
            "#rondo-modal > .rondo-acciones{margin-top:10px;padding:10px 14px;border-top:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-modal p code{background:var(--rondo-bg);padding:1px 4px;border-radius:3px;color:var(--rondo-accent-2)}\n" +
            "#rondo-config{width:560px;max-height:88vh;overflow:hidden;padding:0}\n" +
            "#rondo-ayuda{width:620px;max-width:94vw;max-height:88vh;overflow:hidden;padding:0}\n" +
            "#rondo-ayuda .cfg-head{display:flex;align-items:center;gap:6px;padding:10px 12px;background:var(--rondo-bg);border-bottom:1px solid var(--rondo-border-soft);border-radius:10px 10px 0 0}\n" +
            "#rondo-ayuda .cfg-head h3{margin:0;flex:1;font-size:13px}\n" +
            "#rondo-ayuda .ayuda-body{overflow:auto;padding:12px 14px;max-height:calc(88vh - 60px)}\n" +
            "#rondo-ayuda h4{margin:12px 0 6px;font-size:11px;color:var(--rondo-accent-2);text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid var(--rondo-border-soft);padding-bottom:4px}\n" +
            "#rondo-ayuda h4:first-child{margin-top:0}\n" +
            "#rondo-ayuda p,#rondo-ayuda li{font-size:12.5px;color:var(--rondo-fg);margin:4px 0}\n" +
            "#rondo-ayuda ul{margin:4px 0 4px 18px;padding:0}\n" +
            "#rondo-ayuda code,#rondo-ayuda kbd{background:var(--rondo-bg);padding:1px 5px;border-radius:4px;font:11.5px monospace;color:var(--rondo-accent-2);border:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-ayuda .pasos{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:6px}\n" +
            "#rondo-ayuda .paso{background:var(--rondo-bg);border:1px solid var(--rondo-border);border-radius:8px;padding:9px 11px}\n" +
            "#rondo-ayuda .paso b{display:block;color:var(--rondo-accent-2);font-size:12px;margin-bottom:3px}\n" +
            "#rondo-ayuda .cfg-foot{display:flex;justify-content:space-between;gap:8px;padding:9px 12px;background:var(--rondo-bg);border-top:1px solid var(--rondo-border-soft);border-radius:0 0 10px 10px}\n" +
            "#rondo-ayuda .rondo-iconbtn{background:transparent;border:1px solid transparent;color:var(--rondo-fg-dim);cursor:pointer;border-radius:6px;padding:3px 7px;font-size:13px;line-height:1}\n" +
            "#rondo-ayuda .rondo-iconbtn:hover{background:var(--rondo-bg-strong);border-color:var(--rondo-border);color:var(--rondo-fg)}\n" +
            "#rondo-ayuda button.accbtn{background:var(--rondo-accent-grad);color:#fff;border:none;border-radius:var(--rondo-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--rondo-font);transition:transform .12s,box-shadow .15s,filter .15s}\n" +
            "#rondo-ayuda button.accbtn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(var(--rondo-accent-rgb),.4);filter:brightness(1.05)}\n" +
            "#rondo-ayuda button.cancel{background:var(--rondo-bg-strong);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--rondo-font);transition:background .15s,transform .12s}\n" +
            "#rondo-ayuda button.cancel:hover{background:var(--rondo-bg);transform:translateY(-1px)}\n" +
            "#rondo-config .cfg-head{display:flex;align-items:center;gap:6px;padding:10px 12px;background:var(--rondo-bg);border-bottom:1px solid var(--rondo-border-soft);border-radius:10px 10px 0 0}\n" +
            "#rondo-config .cfg-head h3{margin:0;flex:1;font-size:13px}\n" +
            "#rondo-config .cfg-tabs{display:flex;background:var(--rondo-bg);padding:0 10px;border-bottom:1px solid var(--rondo-border-soft);gap:6px;flex-wrap:wrap}\n" +
            "#rondo-config .cfg-tab{background:transparent;border:none;color:var(--rondo-fg-dim);padding:9px 12px;cursor:pointer;font:600 11.5px var(--rondo-font);border-bottom:2px solid transparent;letter-spacing:.4px;text-transform:uppercase}\n" +
            "#rondo-config .cfg-tab.activo{color:var(--rondo-fg);border-bottom-color:var(--rondo-accent-2)}\n" +
            "#rondo-config .cfg-body{overflow:auto;padding:12px;max-height:calc(88vh - 110px)}\n" +
            "#rondo-config .cfg-body h4{margin:8px 0 6px;font-size:11px;color:var(--rondo-accent-2);text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid var(--rondo-border-soft);padding-bottom:4px}\n" +
            "#rondo-config .cfg-body h4:first-child{margin-top:0}\n" +
            "#rondo-config label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0}\n" +
            "#rondo-config label.full{display:block}\n" +
            "#rondo-config input[type=number],#rondo-config input[type=text],#rondo-config input[type=time],\n" +
            "#rondo-config input[type=color],#rondo-config textarea,#rondo-config select{background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:5px;padding:4px 7px;font:12px var(--rondo-font)}\n" +
            "#rondo-config input[type=number],#rondo-config input[type=text],#rondo-config input[type=time]{width:90px}\n" +
            "#rondo-config input[type=color]{width:55px;padding:0;height:30px}\n" +
            "#rondo-config textarea{width:100%;height:90px;font:11.5px monospace;resize:vertical;box-sizing:border-box}\n" +
            "#rondo-config .cfg-foot{display:flex;justify-content:space-between;gap:8px;padding:9px 12px;background:var(--rondo-bg);border-top:1px solid var(--rondo-border-soft);border-radius:0 0 10px 10px}\n" +
            "#rondo-config .row-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px}\n" +
            "#rondo-config .row-grid label{padding:1px 0}\n" +
            "#rondo-config button.accbtn{background:var(--rondo-accent-grad);color:#fff;border:none;border-radius:var(--rondo-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--rondo-font);transition:transform .12s,box-shadow .15s,filter .15s}\n" +
            "#rondo-config button.accbtn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(var(--rondo-accent-rgb),.4);filter:brightness(1.05)}\n" +
            "#rondo-config button.cancel{background:var(--rondo-bg-strong);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius-sm);padding:8px 14px;cursor:pointer;font:600 12px var(--rondo-font);transition:background .15s,transform .12s}\n" +
            "#rondo-config button.cancel:hover{background:var(--rondo-bg);transform:translateY(-1px)}\n" +
            "#rondo-modal textarea{width:100%;height:160px;resize:none;padding:10px;border-radius:6px;border:1px solid var(--rondo-border);background:var(--rondo-bg);color:var(--rondo-fg);box-sizing:border-box;font:12px monospace}\n" +
            "#rondo-modal h3{margin:0;text-align:center;font-size:13px;color:var(--rondo-fg)}\n" +
            "#rondo-modal button.accbtn{background:var(--rondo-accent-grad);color:#fff;border:none;border-radius:var(--rondo-radius-sm);padding:8px 16px;cursor:pointer;font:600 12px var(--rondo-font);transition:transform .12s,box-shadow .15s,filter .15s}\n" +
            "#rondo-modal button.accbtn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(var(--rondo-accent-rgb),.4);filter:brightness(1.05)}\n" +
            "#rondo-modal button.cancel{background:var(--rondo-bg-strong);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius-sm);padding:8px 16px;cursor:pointer;font:600 12px var(--rondo-font);transition:background .15s,transform .12s}\n" +
            "#rondo-modal button.cancel:hover{background:var(--rondo-bg);transform:translateY(-1px)}\n" +
            "#rondo-contexto{padding:4px;gap:0;width:auto;min-width:170px}\n" +
            "#rondo-contexto .op{padding:7px 12px;cursor:pointer;font-size:12.5px;border-bottom:1px solid var(--rondo-border-soft);display:flex;align-items:center;gap:8px}\n" +
            "#rondo-contexto .op .rondo-mi{color:var(--rondo-accent-2);font-size:1.15em}\n" +
            "#rondo-contexto .op:last-child{border-bottom:none}\n" +
            "#rondo-contexto .op:hover{background:var(--rondo-bg-strong)}\n" +
            "#rondo-contexto .sep{height:1px;background:var(--rondo-border-soft);margin:2px 0}\n" +
            ".rondo-acciones{display:flex;justify-content:space-between;gap:8px}\n" +
            "#rondo-aviso{position:fixed;top:5px;left:50%;transform:translateX(-50%);background:var(--rondo-bad);color:#fff;padding:6px 16px;\n" +
            "  border-radius:5px;z-index:1000002;font:12px var(--rondo-font);display:none;box-shadow:var(--rondo-shadow)}\n" +
            "body.rondo-lateral #rondo-barra{display:none}\n" +
            "#rondo-panel .rondo-sidebar-tools{display:none;gap:8px;padding:10px;background:linear-gradient(180deg,var(--rondo-bg-strong),var(--rondo-bg-soft));border-bottom:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-panel.lateral .rondo-sidebar-tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(76px,1fr));border-top:3px solid var(--rondo-accent)}\n" +
            "#rondo-panel .rondo-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-width:0;overflow:hidden;padding:11px 6px;border-radius:var(--rondo-radius);background:var(--rondo-bg-soft);border:1px solid var(--rondo-border-soft);color:var(--rondo-fg);cursor:pointer;font:600 10.5px var(--rondo-font);transition:background .16s var(--rondo-easing),transform .12s,box-shadow .16s,border-color .16s}\n" +
            "#rondo-panel .rondo-tile:hover{background:var(--rondo-bg);border-color:var(--rondo-fg-mute);transform:translateY(-2px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .rondo-tile:active{transform:translateY(0)}\n" +
            "#rondo-panel .rondo-tile .rondo-mi{font-size:21px;color:var(--rondo-accent-2);line-height:1}\n" +
            "#rondo-panel .rondo-tile .tile-lbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:center}\n" +
            "#rondo-panel .rondo-tile.primary{background:var(--rondo-accent-grad);border-color:transparent;color:#fff;box-shadow:0 4px 12px rgba(var(--rondo-accent-rgb),.35)}\n" +
            "#rondo-panel .rondo-tile.primary .rondo-mi{color:#fff}\n" +
            "#rondo-barra .rondo-badge-estado{display:inline-block;width:11px;height:11px;border-radius:50%;background:#7d8595;flex-shrink:0;border:1px solid rgba(255,255,255,.15)}\n" +
            "#rondo-barra .rondo-badge-estado.ok{background:var(--rondo-ok)}\n" +
            "#rondo-barra .rondo-badge-estado.warn{background:var(--rondo-warn)}\n" +
            "#rondo-barra .rondo-badge-estado.bad{background:var(--rondo-bad)}\n" +
            "#rondo-barra .rondo-badge-estado.nm{background:#7d8595;outline:2px dashed var(--rondo-warn)}\n" +
            "#rondo-panel.density-compact .kpi{padding:6px 9px}\n" +
            "#rondo-panel.density-compact .kpi .valor{font-size:16px}\n" +
            "#rondo-panel.density-compact td,#rondo-panel.density-compact th{padding:3px 9px;font-size:11.5px}\n" +
            "#rondo-panel .rondo-iconbtn:focus-visible,#rondo-panel .tab:focus-visible,#rondo-panel .tools button:focus-visible{outline:2px solid var(--rondo-accent-2);outline-offset:1px}\n" +
            "#rondo-panel table .col-sel{width:28px;text-align:center;padding:4px 6px}\n" +
            "#rondo-panel table .rondo-sel{accent-color:var(--rondo-accent);cursor:pointer;width:14px;height:14px}\n" +
            "#rondo-panel tr.sel-row td{background:var(--rondo-ok-bg)}\n" +
            "#rondo-panel tr.sel-row:hover td{background:linear-gradient(0deg,var(--rondo-ok-bg),var(--rondo-bg-soft))}\n" +
            "#rondo-panel table th:first-child{padding-left:10px}\n" +
            "#rondo-panel ::-webkit-scrollbar,#rondo-config ::-webkit-scrollbar,#rondo-modal ::-webkit-scrollbar,#rondo-ayuda ::-webkit-scrollbar{width:9px;height:9px}\n" +
            "#rondo-panel ::-webkit-scrollbar-thumb,#rondo-config ::-webkit-scrollbar-thumb,#rondo-modal ::-webkit-scrollbar-thumb,#rondo-ayuda ::-webkit-scrollbar-thumb{background:var(--rondo-border);border-radius:8px;border:2px solid transparent;background-clip:content-box}\n" +
            "#rondo-panel ::-webkit-scrollbar-thumb:hover,#rondo-config ::-webkit-scrollbar-thumb:hover,#rondo-modal ::-webkit-scrollbar-thumb:hover,#rondo-ayuda ::-webkit-scrollbar-thumb:hover{background:var(--rondo-fg-mute);background-clip:content-box}\n" +
            "#rondo-panel ::-webkit-scrollbar-track{background:transparent}\n" +
            "#rondo-panel .rondo-sidebar-tools .rondo-tile:focus-visible,#rondo-panel .mini:focus-visible{outline:2px solid var(--rondo-accent-2);outline-offset:1px}\n" +
            "@keyframes rondoFadeUp{from{opacity:0}to{opacity:1}}\n" +
            "#rondo-panel .kpi,#rondo-panel .recent,#rondo-panel .rondo-tile{animation: rondoFadeUp .3s var(--rondo-easing) both}\n" +
            "#rondo-panel .kpi{position:relative;overflow:hidden}\n" +
            "#rondo-panel .kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--rondo-accent-grad);opacity:.7}\n" +
            "#rondo-panel .kpi.ok::before{background:var(--rondo-ok)}\n" +
            "#rondo-panel .kpi.warn::before{background:var(--rondo-warn)}\n" +
            "#rondo-panel .kpi.bad::before{background:var(--rondo-bad)}\n" +
            "#rondo-panel .kpi:hover{transform:translateY(-2px);box-shadow:var(--rondo-shadow)}\n" +
            "#rondo-panel .kpi{transition:transform .15s var(--rondo-easing),box-shadow .15s}\n" +
            "#rondo-barra{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}\n" +
            "#rondo-panel header{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}\n" +
            /* ── Estados vacios ── */
            ".rondo-vacio{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:36px 22px;text-align:center;color:var(--rondo-fg-dim);animation: rondoFadeUp .3s var(--rondo-easing) both}\n" +
            ".rondo-vacio .rondo-mi{font-size:40px;color:var(--rondo-fg-mute);opacity:.6;line-height:1}\n" +
            ".rondo-vacio b{font-size:13px;color:var(--rondo-fg);font-weight:600}\n" +
            ".rondo-vacio span{font-size:12px;max-width:380px;line-height:1.5}\n" +
            ".rondo-vacio button{margin-top:6px}\n" +
            /* ── Spinner / estado de carga ── */
            "@keyframes rondoSpin{to{transform:rotate(360deg)}}\n" +
            ".rondo-spin{display:inline-block;width:13px;height:13px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation: rondoSpin .7s linear infinite;vertical-align:-2px}\n" +
            "button.rondo-busy{opacity:.65;pointer-events:none;cursor:progress}\n" +
            "[aria-busy='true']{cursor:progress}\n" +
            /* ── Toasts: icono por severidad ── */
            ".rondo-toast.ok .ico{color:var(--rondo-ok-fg)}\n" +
            ".rondo-toast.medio .ico{color:var(--rondo-warn-fg)}\n" +
            ".rondo-toast.alto .ico,.rondo-toast.critico .ico,.rondo-toast.err .ico{color:var(--rondo-bad-fg)}\n" +
            /* ── Focus visible global ── */
            "#rondo-panel button:focus-visible,#rondo-barra button:focus-visible,#rondo-modal button:focus-visible,#rondo-config button:focus-visible,#rondo-ayuda button:focus-visible,#rondo-contexto .op:focus-visible,#rondo-panel input:focus-visible,#rondo-config input:focus-visible,#rondo-config select:focus-visible,#rondo-dialog button:focus-visible,#rondo-dialog input:focus-visible{outline:2px solid var(--rondo-accent-2);outline-offset:1px}\n" +
            /* ── Dialogo propio (confirm / prompt / bienvenida) ── */
            "#rondo-dialog{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--rondo-bg-soft);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:var(--rondo-radius);box-shadow:var(--rondo-elev);z-index:1000004;display:none;flex-direction:column;width:min(420px,92vw);font:13px var(--rondo-font);overflow:hidden}\n" +
            "#rondo-dialog.abierto{display:flex;animation: rondoPop .18s var(--rondo-easing) both}\n" +
            "@keyframes rondoPop{from{opacity:0;transform:translate(-50%,-48%) scale(.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}\n" +
            "#rondo-dialog .dlg-head{padding:16px 18px 4px;font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px}\n" +
            "#rondo-dialog .dlg-head .rondo-mi{color:var(--rondo-accent-2);font-size:20px}\n" +
            "#rondo-dialog .dlg-body{padding:4px 18px 16px;display:flex;flex-direction:column;gap:10px}\n" +
            "#rondo-dialog p{margin:0;font-size:12.5px;color:var(--rondo-fg-dim);line-height:1.5}\n" +
            "#rondo-dialog input{background:var(--rondo-bg);color:var(--rondo-fg);border:1px solid var(--rondo-border);border-radius:7px;padding:8px 10px;font:13px var(--rondo-font);width:100%;box-sizing:border-box}\n" +
            "#rondo-dialog input:focus{outline:none;border-color:var(--rondo-accent-2);box-shadow:0 0 0 3px rgba(var(--rondo-accent-rgb),.2)}\n" +
            "#rondo-dialog .dlg-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;background:var(--rondo-bg);border-top:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-dialog .dlg-foot button{border-radius:7px;padding:8px 16px;cursor:pointer;font:600 12px var(--rondo-font);border:1px solid transparent;transition:transform .12s,filter .15s,box-shadow .15s}\n" +
            "#rondo-dialog .dlg-foot .dlg-cancel{background:var(--rondo-bg-strong);color:var(--rondo-fg);border-color:var(--rondo-border)}\n" +
            "#rondo-dialog .dlg-foot .dlg-ok{background:var(--rondo-accent-grad);color:#fff}\n" +
            "#rondo-dialog .dlg-foot .dlg-ok.peligro{background:linear-gradient(135deg,#b71c1c,#e53935)}\n" +
            "#rondo-dialog .dlg-foot button:hover{transform:translateY(-1px);filter:brightness(1.06)}\n" +
            /* ── Bienvenida ── */
            "#rondo-dialog.rondo-bienvenida{width:min(510px,94vw)}\n" +
            "#rondo-dialog .pasos{display:grid;gap:8px}\n" +
            "#rondo-dialog .paso{display:flex;gap:10px;align-items:flex-start;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft);border-radius:9px;padding:10px 12px}\n" +
            "#rondo-dialog .paso .n{flex:0 0 24px;height:24px;border-radius:50%;background:var(--rondo-accent-grad);color:#fff;display:flex;align-items:center;justify-content:center;font:700 12px var(--rondo-font)}\n" +
            "#rondo-dialog .paso b{display:block;font-size:12.5px;margin-bottom:2px}\n" +
            "#rondo-dialog .paso span{font-size:11.5px;color:var(--rondo-fg-dim);line-height:1.45}\n" +
            "#rondo-config .cfg-foot{align-items:center}\n" +
            ".cfg-dirty{font-size:11px;color:var(--rondo-warn-fg);display:none;align-items:center;gap:5px;font-weight:600}\n" +
            ".cfg-dirty.on{display:inline-flex}\n" +
            ".cfg-dirty::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--rondo-warn)}\n" +
            /* ── Tabla ordenable y pildoras de estado ── */
            "#rondo-panel th.rondo-sortable{cursor:pointer;user-select:none;white-space:nowrap}\n" +
            "#rondo-panel th.rondo-sortable:hover{color:var(--rondo-fg)}\n" +
            "#rondo-panel th.rondo-sortable .rondo-sort{font-size:10px;color:var(--rondo-accent-2);margin-left:3px;opacity:.45}\n" +
            "#rondo-panel th.rondo-sort-asc .rondo-sort,#rondo-panel th.rondo-sort-desc .rondo-sort{opacity:1}\n" +
            ".rondo-pill{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:999px;font:600 10.5px var(--rondo-font);line-height:1.7;white-space:nowrap}\n" +
            ".rondo-pill.on{background:var(--rondo-ok-bg);color:var(--rondo-ok-fg)}\n" +
            ".rondo-pill.det{background:var(--rondo-warn-bg);color:var(--rondo-warn-fg)}\n" +
            ".rondo-pill.off{background:var(--rondo-bad-bg);color:var(--rondo-bad-fg)}\n" +
            ".rondo-pill.ok{background:var(--rondo-ok-bg);color:var(--rondo-ok-fg)}\n" +
            ".rondo-pill.warn{background:var(--rondo-warn-bg);color:var(--rondo-warn-fg)}\n" +
            ".rondo-pill.mute{background:var(--rondo-bg-alt);color:var(--rondo-fg-mute)}\n" +
            /* ── Columna de Ruta en la tabla de unidades ── */
            "#rondo-body td.ruta{min-width:128px;padding:5px 7px;line-height:1.2;vertical-align:middle}\n" +
            "#rondo-body td.ruta .ronda-pill{font-size:10px}\n" +
            "#rondo-body td.ruta .ruta-bar{margin-top:3px;height:4px;background:var(--rondo-bg-alt);border-radius:3px;overflow:hidden;min-width:96px}\n" +
            "#rondo-body td.ruta .ruta-bar-fill{height:100%;background:var(--rondo-accent-2);transition:width .3s ease}\n" +
            "#rondo-body td.ruta .ruta-meta{margin-top:2px;font:500 10px monospace;color:var(--rondo-fg-dim);white-space:nowrap}\n" +
            +
            /* ── Responsive ── */
            "@media (max-width:720px){\n" +
            "  #rondo-panel{min-width:0;max-width:96vw}\n" +
            "  #rondo-config{width:min(96vw,560px)}\n" +
            "  #rondo-ayuda{width:min(96vw,620px)}\n" +
            "  #rondo-modal{width:min(96vw,520px)}\n" +
            "  #rondo-panel .kpi-grid{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}\n" +
            "  #rondo-config .row-grid{grid-template-columns:1fr}\n" +
            "  #rondo-dash{padding:10px}\n" +
            "  #rondo-toasts{width:min(92vw,330px);right:8px;bottom:8px}\n" +
            "}\n" +
            "@media (max-width:480px){\n" +
            "  #rondo-panel .tab .etqt{display:none}\n" +
            "  #rondo-barra .rondo-modo-label{display:none}\n" +
            "}\n" +
            /* ── Dashboard: distribucion y atencion ── */
            "#rondo-dash .dist{display:flex;flex-direction:column;gap:7px}\n" +
            "#rondo-dash .dist-bar{display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--rondo-bg);border:1px solid var(--rondo-border-soft)}\n" +
            "#rondo-dash .dist-seg{height:100%;transition:width .4s var(--rondo-easing)}\n" +
            "#rondo-dash .dist-seg.on{background:var(--rondo-ok)}\n" +
            "#rondo-dash .dist-seg.det{background:var(--rondo-warn)}\n" +
            "#rondo-dash .dist-seg.off{background:var(--rondo-bad)}\n" +
            "#rondo-dash .dist-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:var(--rondo-fg-dim)}\n" +
            "#rondo-dash .dist-legend span{display:inline-flex;align-items:center;gap:5px}\n" +
            "#rondo-dash .dist-legend i{width:9px;height:9px;border-radius:50%;display:inline-block}\n" +
            "#rondo-dash .dist-legend i.on{background:var(--rondo-ok)}\n" +
            "#rondo-dash .dist-legend i.det{background:var(--rondo-warn)}\n" +
            "#rondo-dash .dist-legend i.off{background:var(--rondo-bad)}\n" +
            "#rondo-dash .kpi[data-kpi]{cursor:pointer}\n" +
            "#rondo-dash .kpi[data-kpi]::after{content:'›';position:absolute;right:9px;top:8px;color:var(--rondo-fg-mute);font-size:15px;opacity:.6}\n" +
            "#rondo-dash .rondo-atencion-item:hover{background:var(--rondo-bg-strong)}\n" +
            /* ── Escala de interfaz (accesibilidad visual) ──
               Se controla con --rondo-esc. Todos los tamanos se multiplican por el
               factor elegido en Ajustes > Visual. */
            "#rondo-panel{font-size:calc(12.5px * var(--rondo-esc))}\n" +
            "#rondo-panel header h3{font-size:calc(13px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-iconbtn{width:calc(30px * var(--rondo-esc));height:calc(30px * var(--rondo-esc));font-size:calc(13px * var(--rondo-esc))}\n" +
            "#rondo-panel .tab{padding:calc(8px * var(--rondo-esc)) calc(4px * var(--rondo-esc));font-size:calc(11.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .tab .etqt{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel .tab .contador{font-size:calc(10px * var(--rondo-esc));padding:calc(1px * var(--rondo-esc)) calc(5px * var(--rondo-esc))}\n" +
            "#rondo-panel .tools button{padding:calc(5px * var(--rondo-esc)) calc(9px * var(--rondo-esc));font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel input.filtro,#rondo-panel select.filtro{padding:calc(4px * var(--rondo-esc)) calc(7px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-panel th{padding:calc(6px * var(--rondo-esc)) calc(9px * var(--rondo-esc));font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel td{padding:calc(5px * var(--rondo-esc)) calc(9px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-panel .mini{padding:calc(3px * var(--rondo-esc)) calc(8px * var(--rondo-esc));font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-pill{font-size:calc(10.5px * var(--rondo-esc));padding:calc(1px * var(--rondo-esc)) calc(8px * var(--rondo-esc))}\n" +
            "#rondo-panel .alerta{padding:calc(8px * var(--rondo-esc)) calc(10px * var(--rondo-esc))}\n" +
            "#rondo-panel .alerta .ico{font-size:calc(16px * var(--rondo-esc))}\n" +
            "#rondo-panel .alerta b{font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-panel .alerta span{font-size:calc(11.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .alerta .hora,#rondo-panel .alerta .meta{font-size:calc(10px * var(--rondo-esc))}\n" +
            "#rondo-panel .kpi{padding:calc(9px * var(--rondo-esc)) calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel .kpi .etq{font-size:calc(10px * var(--rondo-esc))}\n" +
            "#rondo-panel .kpi .valor{font-size:calc(18px * var(--rondo-esc))}\n" +
            "#rondo-panel .kpi .resumen{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-dash{padding:calc(14px * var(--rondo-esc));gap:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-dash .kpi-grid{gap:calc(10px * var(--rondo-esc))}\n" +
            "#rondo-dash .sparkline{height:calc(44px * var(--rondo-esc))}\n" +
            "#rondo-dash .recent{padding:calc(9px * var(--rondo-esc))}\n" +
            "#rondo-dash .recent h4{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel footer{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-vacio{padding:calc(36px * var(--rondo-esc)) calc(22px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-vacio .rondo-mi{font-size:calc(40px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-vacio b{font-size:calc(13px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-vacio span{font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-tile{padding:calc(11px * var(--rondo-esc)) calc(6px * var(--rondo-esc));font-size:calc(10.5px * var(--rondo-esc))}\n" +
            "#rondo-panel .rondo-tile .rondo-mi{font-size:calc(21px * var(--rondo-esc))}\n" +
            "#rondo-barra{font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-barra .rondo-btn{padding:calc(7px * var(--rondo-esc)) calc(11px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            ".rondo-toast{font:calc(12.5px * var(--rondo-esc))/1.35 var(--rondo-font);padding:calc(10px * var(--rondo-esc)) calc(12px * var(--rondo-esc))}\n" +
            ".rondo-toast .cuerpo b{font-size:calc(12.5px * var(--rondo-esc))}\n" +
            ".rondo-toast .cuerpo span{font-size:calc(11.5px * var(--rondo-esc))}\n" +
            "#rondo-config,#rondo-modal,#rondo-ayuda,#rondo-dialog{font-size:calc(13px * var(--rondo-esc))}\n" +
            "#rondo-config label{font-size:calc(12px * var(--rondo-esc));padding:calc(3px * var(--rondo-esc)) 0}\n" +
            "#rondo-config .cfg-tab{padding:calc(9px * var(--rondo-esc)) calc(12px * var(--rondo-esc));font-size:calc(11.5px * var(--rondo-esc))}\n" +
            "#rondo-config input[type=number],#rondo-config input[type=text],#rondo-config input[type=time],#rondo-config input[type=color],#rondo-config textarea,#rondo-config select{padding:calc(4px * var(--rondo-esc)) calc(7px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-config input[type=number],#rondo-config input[type=text],#rondo-config input[type=time]{width:calc(90px * var(--rondo-esc))}\n" +
            "#rondo-config .cfg-body h4{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-config button.accbtn,#rondo-config button.cancel{padding:calc(8px * var(--rondo-esc)) calc(14px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-modal h3,#rondo-modal > h3,.rondo-dialog .dlg-head{font-size:calc(14px * var(--rondo-esc))}\n" +
            "#rondo-modal p,.rondo-dialog p{font-size:calc(12.5px * var(--rondo-esc))}\n" +
            "#rondo-modal .mini{padding:calc(4px * var(--rondo-esc)) calc(9px * var(--rondo-esc));font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-modal button.accbtn,#rondo-modal button.cancel{padding:calc(8px * var(--rondo-esc)) calc(16px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n" +
            "#rondo-ayuda p,#rondo-ayuda li{font-size:calc(12.5px * var(--rondo-esc))}\n" +
            "#rondo-ayuda h4{font-size:calc(11px * var(--rondo-esc))}\n" +
            "#rondo-contexto .op{padding:calc(7px * var(--rondo-esc)) calc(12px * var(--rondo-esc));font-size:calc(12.5px * var(--rondo-esc))}\n" +
            "#rondo-dialog .dlg-foot button{padding:calc(8px * var(--rondo-esc)) calc(16px * var(--rondo-esc));font-size:calc(12px * var(--rondo-esc))}\n";

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
        mainBtn = makeEl('button', { innerHTML: '<span class="rondo-mi">' + ICO.automatizar + '</span> Automatizar Unidades', id: 'rondo-btn-main', className: 'rondo-btn', title: 'Abrir lista de unidades y automatizar ventanas' });
        panelBtn = makeEl('button', { innerHTML: '<span class="rondo-mi">' + ICO.panel + '</span> Panel', id: 'rondo-btn-panel', className: 'rondo-btn', title: 'Mostrar u ocultar el panel (Alt+P)' });
        modoBtn = makeEl('button', { innerHTML: '<span class="rondo-mi">' + ICO.expandir + '</span> <span class="rondo-modo-label">Flotante</span>', id: 'rondo-btn-modo', className: 'rondo-btn', title: 'Alternar entre panel flotante y barra lateral (Alt+L)' });
        closeBtn = makeEl('button', { innerHTML: '<span class="rondo-mi">' + ICO.cerrar + '</span> Cerrar Todas', id: 'rondo-btn-close', className: 'rondo-btn', title: 'Cerrar todas las ventanas de unidades' });
        helpBtn = makeEl('button', { innerHTML: '<span class="rondo-mi">' + ICO.ayuda + '</span>', id: 'rondo-btn-help', className: 'rondo-btn', title: 'Ayuda rápida (?)' });
        updateBtn = makeEl('button', { innerHTML: '<span class="rondo-mi">' + ICO.actualizar + '</span> Actualizar', id: 'rondo-btn-update', className: 'rondo-btn rondo-update', title: 'Nueva version disponible', style: 'display:none' });
        foldBtn = makeEl('button', { innerText: '▾', id: 'rondo-btn-fold', className: 'rondo-btn rondo-fold', title: 'Plegar barra' });
        gripEl = makeEl('span', { innerText: '⠿', id: 'rondo-grip', className: 'rondo-grip', title: 'Arrastrar barra · doble clic para orientar' });
        barraEl = makeEl('div', { id: 'rondo-barra' });
        barraEl.append(gripEl, updateBtn, mainBtn, panelBtn, modoBtn, helpBtn, closeBtn, foldBtn);
        if (APP.barra.vertical) barraEl.classList.add('vertical');

        panelEl = makeEl('div', { id: 'rondo-panel' });
        panelEl.innerHTML = (
            '<div class="rondo-sidebar-tools" id="rondo-sidebar-tools">' +
            '<button class="rondo-tile primary" id="rondo-sb-main" title="Abrir lista de unidades y automatizar ventanas"><span class="rondo-mi">' + ICO.automatizar + '</span><span class="tile-lbl">Automatizar</span></button>' +
            '<button class="rondo-tile" id="rondo-sb-panel" title="Ocultar el panel (Alt+P)"><span class="rondo-mi">' + ICO.colapsar + '</span><span class="tile-lbl">Ocultar</span></button>' +
            '<button class="rondo-tile" id="rondo-sb-modo" title="Volver al modo flotante"><span class="rondo-mi">' + ICO.expandir + '</span><span class="tile-lbl rondo-sb-modo-label">Flotante</span></button>' +
            '<button class="rondo-tile" id="rondo-sb-close" title="Cerrar todas las ventanas de unidades"><span class="rondo-mi">' + ICO.cerrar + '</span><span class="tile-lbl">Cerrar</span></button>' +
            '</div>' +
            '<header id="rondo-drag">' +
            '<span id="rondo-estado-barra" class="rondo-badge-estado"></span>' +
            '<h3>' + esc(LANG.titlePanel) + '</h3>' +
            '<button class="rondo-iconbtn" id="rondo-actualizar" title="Buscar actualizaciones" style="display:none;color:var(--rondo-accent-2)"><span class="rondo-mi">' + ICO.actualizar + '</span></button>' +
            '<button class="rondo-iconbtn" id="rondo-tema" title="Tema"><span class="rondo-mi">' + ICO.luna + '</span></button>' +
            '<button class="rondo-iconbtn" id="rondo-nmolestar" title="No molestar"><span class="rondo-mi">' + ICO.silencioTotal + '</span></button>' +
            '<button class="rondo-iconbtn" id="rondo-collapse" title="Colapsar/expandir barra lateral"><span class="rondo-mi">' + ICO.colapsar + '</span></button>' +
            '<button class="rondo-iconbtn" id="rondo-ayuda-btn" title="Ayuda rápida"><span class="rondo-mi">' + ICO.ayuda + '</span></button>' +
            '<button class="rondo-iconbtn" id="rondo-cerrar-panel" title="Cerrar panel"><span class="rondo-mi">' + ICO.cerrar + '</span></button>' +
            '</header>' +
            '<div class="tabs" id="rondo-tabs">' +
            '<button class="tab activo" data-tab="dash" title="Resumen general de la flota"><span class="rondo-mi">' + ICO.dashboard + '</span><span class="etqt">Dashboard</span><span class="contador" id="rondo-c-on">0</span></button>' +
            '<button class="tab" data-tab="unidades" title="Lista de unidades y acciones"><span class="rondo-mi">' + ICO.panel + '</span><span class="etqt">Unidades</span><span class="contador" id="rondo-c-tot">0</span></button>' +
            '<button class="tab" data-tab="alertas" title="Historial de avisos"><span class="rondo-mi">' + ICO.alertas + '</span><span class="etqt">Avisos</span><span class="contador" id="rondo-c-al">0</span></button>' +
            '<button class="tab" data-tab="rutas" title="Rutas planificadas y seguimiento"><span class="rondo-mi">' + ICO.destino + '</span><span class="etqt">Rutas</span><span class="contador" id="rondo-c-ru">0</span></button>' +
            '<button class="tab" data-tab="geocercas" title="Geocercas y unidades dentro"><span class="rondo-mi">' + ICO.geocercas + '</span><span class="etqt">Geocercas</span><span class="contador" id="rondo-c-zn">0</span></button>' +
            '</div>' +
            '<div class="tools" id="rondo-tools">' +
            '<input class="filtro" id="rondo-filtro" placeholder="' + esc(LANG.busq) + '">' +
            '<select class="filtro" id="rondo-filtro-estado" title="Filtrar por estado">' +
            '<option value="todas">Todas</option>' +
            '<option value="moviendo">Moviendo</option>' +
            '<option value="detenida">Detenidas</option>' +
            '<option value="offline">Sin señal</option>' +
            '<option value="vigilada">Vigiladas</option>' +
            '<option value="silenciada">Silenciadas</option>' +
            '</select>' +
            '<select class="filtro" id="rondo-orden-sel" title="Orden de las ventanas de unidades">' +
            '<option value="">Orden de ventanas…</option>' +
            '<option value="pegado">Pegado</option>' +
            '<option value="numero">Número (menor a mayor)</option>' +
            '<option value="numero-desc">Número (mayor a menor)</option>' +
            '<option value="alfabetico">Alfabético A-Z</option>' +
            '<option value="invertir">Invertir orden</option>' +
            '</select>' +
            '<button id="rondo-refresh" title="Refrescar"><span class="rondo-mi">' + ICO.refrescar + '</span></button>' +
            '<button id="rondo-cfg-btn" title="Ajustes"><span class="rondo-mi">' + ICO.ajustes + '</span></button>' +
            '<button id="rondo-csv" title="Exportar unidades"><span class="rondo-mi">' + ICO.descargar + '</span> CSV</button>' +
            '<button id="rondo-csv-al" title="Exportar el historial de avisos a CSV"><span class="rondo-mi">' + ICO.descargar + '</span> Avisos CSV</button>' +
            '<button id="rondo-informe" title="Generar informe del dia"><span class="rondo-mi">' + ICO.descargar + '</span> Informe</button>' +
            '<button id="rondo-verif" title="Solo ventanas seleccionadas"><span class="rondo-mi">' + ICO.verif + '</span> Solo selección</button>' +
            '<button id="rondo-captura" title="Capturar ventanas"><span class="rondo-mi">' + ICO.captura + '</span> Capturar</button>' +
            '<button id="rondo-verifica" title="Verificar ahora"><span class="rondo-mi">' + ICO.verifica + '</span> Aplicar</button>' +
            '<button id="rondo-sel-all" title="Seleccionar todas las unidades visibles"><span class="rondo-mi">' + ICO.selAll + '</span> Sel. visibles</button>' +
            '<button id="rondo-sel-clear" title="Quitar toda la selección"><span class="rondo-mi">' + ICO.selClear + '</span> Quitar selección</button>' +
            '</div>' +
            '<div class="tabla" id="rondo-wrap-dash">' +
            '<div id="rondo-dash">' +
            '<div class="kpi-grid">' +
            '<div class="kpi ok" data-kpi="online" title="Unidades que reportaron dentro del umbral de sin señal · clic para verlas"><span class="etq">En línea</span><span class="valor" id="rondo-kpi-on">0</span><span class="resumen" id="rondo-kpi-on-pct">—</span></div>' +
            '<div class="kpi bad" data-kpi="offline" title="Unidades cuyo último reporte superó el umbral de sin señal · clic para verlas"><span class="etq">Sin señal</span><span class="valor" id="rondo-kpi-off">0</span><span class="resumen" id="rondo-kpi-off-pct">—</span></div>' +
            '<div class="kpi warn" data-kpi="detenida" title="Unidades en línea con velocidad muy baja · clic para verlas"><span class="etq">Detenidas</span><span class="valor" id="rondo-kpi-det">0</span><span class="resumen">VEL &lt;= 3 km/h</span></div>' +
            '<div class="kpi sub" data-kpi="moviendo" title="Unidades en línea con velocidad normal · clic para verlas"><span class="etq">En movimiento</span><span class="valor" id="rondo-kpi-mov">0</span><span class="resumen" id="rondo-kpi-vel">— km/h prom.</span></div>' +
            '<div class="kpi sub" data-kpi="zonas" title="Geocercas ocupadas por al menos una unidad online · clic para verlas"><span class="etq">En zonas</span><span class="valor" id="rondo-kpi-zonas">0</span><span class="resumen">de 0 geocercas</span></div>' +
            '<div class="kpi" data-kpi="alertas" title="Avisos registrados desde la medianoche · clic para verlos"><span class="etq">Avisos hoy</span><span class="valor" id="rondo-kpi-aho">0</span><span class="resumen" id="rondo-kpi-criticos">0 críticas</span></div>' +
            '</div>' +
            '<div class="recent"><h4>Distribución de la flota</h4>' +
            '<div class="dist"><div class="dist-bar">' +
            '<span class="dist-seg on" id="rondo-dist-on"></span>' +
            '<span class="dist-seg det" id="rondo-dist-det"></span>' +
            '<span class="dist-seg off" id="rondo-dist-off"></span>' +
            '</div><div class="dist-legend" id="rondo-dist-legend"></div></div></div>' +
            '<div><svg class="sparkline" id="rondo-spark" viewBox="0 0 200 36" preserveAspectRatio="none"></svg></div>' +
            '<div class="recent"><h4>Requieren atención</h4><div id="rondo-atencion"></div></div>' +
            '<div class="recent"><h4>Avisos recientes</h4><div id="rondo-kpi-recientes"></div></div>' +
            '</div>' +
            '</div>' +
            '<div class="tabla" id="rondo-wrap-unidades" style="display:none">' +
            '<table><thead><tr><th title="Seleccionar">Sel</th>' +
            '<th class="rondo-sortable" data-sort="eco" title="Ordenar por economico">Eco<span class="rondo-sort"></span></th>' +
            '<th class="rondo-sortable" data-sort="placa" title="Ordenar por placa">Placa<span class="rondo-sort"></span></th>' +
            '<th class="rondo-sortable" data-sort="estado" title="Ordenar por estado">Estado<span class="rondo-sort"></span></th>' +
            '<th class="rondo-sortable" data-sort="edad" title="Ordenar por antiguedad del ultimo reporte">Ultimo<span class="rondo-sort"></span></th>' +
            '<th class="rondo-sortable" data-sort="vel" title="Ordenar por velocidad">km/h<span class="rondo-sort"></span></th>' +
            '<th class="rondo-sortable" data-sort="zona" title="Ordenar por geocerca">Zona<span class="rondo-sort"></span></th>' +
            '<th class="rondo-sortable" data-sort="odo" title="Odómetro acumulado (km)">km<span class="rondo-sort"></span></th>' +
            '<th class="rondo-sortable" data-sort="ruta" title="Estado de la ruta trazada">Ruta<span class="rondo-sort"></span></th>' +
            '<th></th></tr></thead>' +
            '<tbody id="rondo-body"></tbody></table>' +
            '<div id="rondo-sel-vacio" style="display:none;padding:18px;text-align:center;color:var(--rondo-fg-dim);font-size:12px">No has seleccionado ninguna unidad. Activa <b>Monitorear todas</b> en Configuración o marca los vehículos que quieres monitorear con la casilla de esta columna.</div>' +
            '</div>' +
            '<div class="tabla" id="rondo-wrap-alertas" style="display:none">' +
            '<div class="severidad-pick" id="rondo-filtroseveridad">' +
            '<span data-sev="todas" class="activo">Todas</span>' +
            '<span data-sev="critico">Criticas</span>' +
            '<span data-sev="alto">Altas</span>' +
            '<span data-sev="medio">Medias</span>' +
            '<span data-sev="bajo">Bajas</span>' +
            '</div>' +
            '<div id="rondo-lista-alertas"></div>' +
            '</div>' +
            '<div class="tabla" id="rondo-wrap-rutas" style="display:none">' +
            '<div id="rondo-lista-rutas"></div>' +
            '<div id="rondo-lista-viajes"></div>' +
            '</div>' +
            '<div class="tabla" id="rondo-wrap-geocercas" style="display:none">' +
            '<table class="zone"><thead><tr><th>Geocerca</th><th>Dentro</th></tr></thead>' +
            '<tbody id="rondo-body-zonas"></tbody></table>' +
            '</div>' +
            '<footer><span id="rondo-info">iniciando...</span><span id="rondo-upd"></span></footer>'
        );
        panelEl.style.width = (APP.panelSize && APP.panelSize.w) ? APP.panelSize.w + 'px' : '470px';
        panelEl.style.height = (APP.panelSize && APP.panelSize.h) ? APP.panelSize.h + 'px' : '440px';

        modalEl = makeEl('div', { id: 'rondo-modal' });
        modalEl.innerHTML = (
            '<h3>Lista de unidades</h3>' +
            '<p style="font-size:11.5px;color:var(--rondo-fg-dim);margin:-4px 0 8px">Una sola lista para abrir ventanas, registrar destinos y filtrar las alertas. Pega <code>eco</code> o <code>eco=destino</code> por línea.</p>' +
            '<textarea id="rondo-txt" placeholder="eco por línea, o eco=destino&#10;4381&#10;4132=Monterrey"></textarea>' +
            '<div class="rondo-modal-actions">' +
            '<button class="mini" id="rondo-modal-parse">⇭ Pegar a la lista</button>' +
            '<button class="mini" id="rondo-modal-clear-txt">⌫ Limpiar área</button>' +
            '</div>' +
            '<div class="rondo-order-tools">' +
            '<span class="etq">Orden de las ventanas:</span>' +
            '<button class="mini" id="rondo-orden-pegado" title="En el orden en que se pegaron">Pegado</button>' +
            '<button class="mini" id="rondo-orden-numero" title="Por numero de economico (menor a mayor)">Número</button>' +
            '<button class="mini" id="rondo-orden-numero-desc" title="Por numero de economico (mayor a menor)">Número inverso</button>' +
            '<button class="mini" id="rondo-orden-alfabetico" title="Orden alfabetico">A-Z</button>' +
            '<button class="mini" id="rondo-orden-invertir" title="Invertir el orden actual">Invertir</button>' +
            '</div>' +
            '<div id="rondo-modal-lista-wrap">' +
                '<div id="rondo-modal-lista"></div>' +
            '</div>' +
            '<p style="font-size:11px;color:var(--rondo-fg-dim);margin:4px 14px 0">Arrastra el asa ⠿ de cada unidad para cambiar el orden con el que se acomodan las ventanas.</p>' +
            '<div class="rondo-modal-add">' +
                '<input type="text" id="rondo-modal-new-eco" placeholder="eco (ej. 4381)">' +
                '<input type="text" id="rondo-modal-new-dest" placeholder="destino (opcional)">' +
                '<button class="accbtn" id="rondo-modal-add">+ Añadir</button>' +
            '</div>' +
            '<div class="rondo-acciones">' +
            '<button class="cancel" id="rondo-cancelar">Cancelar</button>' +
            '<button class="mini" id="rondo-modal-vaciar" style="background:#b71c1c;color:#fff">⌫ Vaciar lista</button>' +
            '<button class="accbtn" id="rondo-ejecutar">▶ Ejecutar (abrir ventanas)</button>' +
            '</div>'
        );

        cfgWinEl = makeEl('div', { id: 'rondo-config' });
        cfgWinEl.innerHTML = (
            '<div class="cfg-head"><h3><span class="rondo-mi">' + ICO.ajustes + '</span> Configuración</h3>' +
            '<button class="rondo-iconbtn" id="rondo-cfg-cerrar-x" title="Cerrar">×</button></div>' +
            '<div class="cfg-tabs" id="rondo-cfg-tabs">' +
            '<button class="cfg-tab activo" data-cfg="general">General</button>' +
            '<button class="cfg-tab" data-cfg="reglas">Reglas</button>' +
            '<button class="cfg-tab" data-cfg="avisos">Avisos</button>' +
            '<button class="cfg-tab" data-cfg="visual">Visual</button>' +
            '<button class="cfg-tab" data-cfg="ventanas">Ventanas</button>' +
            '<button class="cfg-tab" data-cfg="rutas">Rutas</button>' +
            '<button class="cfg-tab" data-cfg="avanzado">Avanzado</button>' +
            '</div>' +
            '<div class="cfg-body" id="rondo-cfg-body">' +
            '<div class="cfg-pane" data-cfg="general">' +
            '<h4>General</h4>' +
            numRow('c-poll', 'Refresco (ms)') +
            numRow('c-off', 'Sin señal > (min)') +
            numRow('c-cd', 'Cooldown alerta (min)') +
            checkRow('c-watchAll', 'Monitorear todas las unidades (ignora selección)') +
            checkRow('c-auto', 'Abrir al caer (critico)') +
            checkRow('c-zonas', 'Cargar geocercas') +
            checkRow('c-geo', 'Geocodificación inversa') +
            checkRow('c-hist', 'Consultar histórico de detención') +
            '</div>' +
            '<div class="cfg-pane" data-cfg="reglas" style="display:none">' +
            '<h4>Umbrales</h4>' +
            numRow('c-gps', 'GPS perdido > (min)') +
            numRow('c-stop', 'Detenido > (min)') +
            numRow('c-zona', 'Zona no prevista > (min)') +
            numRow('c-desco', 'Desconexión > (min)') +
            numRow('c-vel', 'Velocidad máxima (km/h)') +
            '<h4>Reglas activas</h4>' +
            '<div class="row-grid">' +
            checkRow('c-r-off', 'Sin señal') +
            checkRow('c-r-gps', 'GPS en marcha') +
            checkRow('c-r-det', 'Detenido') +
            checkRow('c-r-zona', 'Zona') +
            checkRow('c-r-geo', 'Geocercas') +
            checkRow('c-r-des', 'Destino') +
            checkRow('c-r-dis', 'Desconexión') +
            checkRow('c-r-vel', 'Velocidad') +
            '</div>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="avisos" style="display:none">' +
            '<h4>Avisos</h4>' +
            checkRow('c-voz', 'Voz') +
            '<label>Idioma de voz <select id="c-voz-lang">' +
            '<option value="es-MX">Español (México)</option>' +
            '<option value="es-ES">Español (España)</option>' +
            '<option value="es-US">Español (EE. UU.)</option>' +
            '<option value="en-US">Inglés (EE. UU.)</option>' +
            '</select></label>' +
            checkRow('c-beep', 'Pitido en alertas graves') +
            numRow('c-beep-vol', 'Volumen del pitido (0-1)') +
            checkRow('c-desktop', 'Notificación del navegador') +
            numRow('c-toastSeg', 'Duración de toasts (s)') +
            '<label>Severidad mínima en toasts' +
            '<select id="c-sevmin">' +
            '<option value="bajo">Bajo y arriba</option>' +
            '<option value="medio">Medio y arriba</option>' +
            '<option value="alto">Alto y arriba</option>' +
            '<option value="critico">Solo críticas</option>' +
            '</select>' +
            '</label>' +
            '<h4>Horario y vigilancia</h4>' +
            '<label>Horario activo <input type="checkbox" id="c-hor-on"></label>' +
            '<label>Desde <input type="time" id="c-hor-a"></label>' +
            '<label>Hasta <input type="time" id="c-hor-b"></label>' +
            '<div class="rondo-acciones" style="margin-top:8px">' +
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
            '<label>Tamaño de la interfaz <select id="c-escala" title="Agranda el texto y los controles del panel, util si te cuesta ver">' +
            '<option value="1">Normal (100%)</option>' +
            '<option value="1.15">Grande (115%)</option>' +
            '<option value="1.3">Muy grande (130%)</option>' +
            '<option value="1.5">Enorme (150%)</option>' +
            '</select></label>' +
            '<label>Color de acento <input type="color" id="c-acento"></label>' +
            checkRow('c-coords', 'Mostrar lat/lon en unidades') +
            checkRow('c-contornos', 'Remarcar contornos de ventanas abiertas') +
            numRow('c-contorno-horas', 'Antigüedad de contornos (h)') +
            '<h4>Informacion</h4>' +
            '<span style="font-size:11.5px;color:var(--rondo-fg-dim)">Atajos: <b>Alt+1..5</b> cambia pestañas · <b>Alt+P</b> panel · <b>Alt+L</b> lateral · <b>Alt+H</b> pliega barra · <b>Esc</b> cierra el dialogo superior</span>' +
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
            checkRow('c-confirmar-cierre', 'Pedir confirmación al cerrar todas las ventanas') +
            '<p style="font-size:11px;color:var(--rondo-fg-dim);margin:2px 0 0">El panel recuerda el modo (flotante o lateral) y si estaba abierto.</p>' +
            '<h4>Barra de botones</h4>' +
            '<div class="row-grid">' +
            checkRow('c-b-main', 'Automatizar') +
            checkRow('c-b-panel', 'Panel') +
            checkRow('c-b-close', 'Cerrar') +
            '</div>' +
            checkRow('c-b-plegada', 'Barra plegada') +
            checkRow('c-b-vertical', 'Orientacion vertical') +
            '<div style="margin-top:6px"><button class="accbtn" id="rondo-b-reset" style="width:100%"><span class="rondo-mi">' + ICO.expandir + '</span> Recentrar barra</button></div>' +
            '<h4>Verificacion</h4>' +
            checkRow('c-verif', 'Verificación automática') +
            numRow('c-verif-seg', 'Revisar cada (seg)') +
            '<h4>Tamaño del panel</h4>' +
            '<button class="accbtn" id="rondo-reset-panel" style="width:100%"><span class="rondo-mi">' + ICO.colapsar + '</span> Restablecer tamano</button>' +
            '</div>' +
            '<div class="cfg-pane" data-cfg="rutas" style="display:none">' +
            '<h4>Rutas y OpenStreetMap</h4>' +
            checkRow('c-osrm', 'Calcular rutas con OSRM (OpenStreetMap)') +
            checkRow('c-overpass', 'Permitir A* sobre datos OSM (Overpass, experimental)') +
            checkRow('c-trazado', 'Registrar trazado del recorrido') +
            numRow('c-trazado-max', 'Puntos por traza') +
            '<h4>Trazado automático</h4>' +
            checkRow('c-auto-ruta', 'Trazar ruta automáticamente al asignar un destino') +
            '<label>Trazar con ' +
            '<select id="c-auto-ruta-modo" style="flex:1">' +
            '<option value="osrm">OSRM (rápido)</option>' +
            '<option value="astar">A* sobre OSM (experimental)</option>' +
            '</select></label>' +
            '<p style="font-size:11px;color:var(--rondo-fg-dim);margin:4px 0 8px">Al guardar un destino en la lista vigilada, se calcula la ruta en background respetando los servicios públicos (OSRM/Nominatim).</p>' +
            '<h4>Alertas de ruta</h4>' +
            checkRow('c-r-desvio', 'Desvío de ruta') +
            numRow('c-desvio-m', 'Desvío mayor a (m)') +
            numRow('c-desvio-min', 'Desvío sostenido (min)') +
            checkRow('c-r-retorno', 'Retorno / viaje cancelado') +
            numRow('c-retorno-m', 'Radio de origen (m)') +
            numRow('c-retorno-pct', 'Retroceso mínimo (%)') +
            checkRow('c-r-giro', 'Giro en U') +
            numRow('c-giro-grados', 'Ángulo de giro (grados)') +
            numRow('c-giro-min', 'Giro sostenido (min)') +
            checkRow('c-r-demora-base', 'Demora en base (parado en CEDIS/patio)') +
            numRow('c-demora-base-min', 'Tiempo en base para alertar (min)') +
            '<h4>Análisis de viaje (historial)</h4>' +
            numRow('c-partida-horas', 'Punto de partida: parada mayor a (h)') +
            numRow('c-parada-min', 'Parada mínima (min)') +
            numRow('c-hist-horas', 'Historial a analizar (h)') +
            checkRow('c-analizar-auto', 'Analizar automáticamente al planear ruta') +
            '</div>' +
            '<div class="cfg-pane" data-cfg="avanzado" style="display:none">' +
            '<h4>Actualizaciones</h4>' +
            '<div id="rondo-update-info" style="font-size:11.5px;color:var(--rondo-fg-dim);margin-bottom:6px">Versión instalada: <b>' + VER + '</b></div>' +
            '<button class="accbtn" id="rondo-check-update" style="width:100%"><span class="rondo-mi">' + ICO.refrescar + '</span> Buscar actualizaciones</button>' +
            '<h4>Datos y prueba</h4>' +
            '<div class="rondo-acciones">' +
            '<button class="accbtn" id="rondo-test-btn"><span class="rondo-mi">' + ICO.senal + '</span> Probar avisos</button>' +
            '<button class="accbtn" id="rondo-exportar-btn"><span class="rondo-mi">' + ICO.exportar + '</span> Exportar</button>' +
            '<button class="accbtn" id="rondo-importar-btn"><span class="rondo-mi">' + ICO.importar + '</span> Importar</button>' +
            '</div>' +
            '<h4>Perfiles de configuración</h4>' +
            '<label>Perfil <select id="rondo-perfil-sel" style="flex:1"></select></label>' +
            '<div class="rondo-acciones" style="margin-top:6px">' +
            '<button class="accbtn" id="rondo-perfil-guardar">Guardar como...</button>' +
            '<button class="accbtn" id="rondo-perfil-cargar">Cargar</button>' +
            '<button class="accbtn" id="rondo-perfil-borrar" style="background:#b71c1c">Borrar</button>' +
            '</div>' +
            '<h4>Historial de avisos</h4>' +
            '<button class="accbtn" id="rondo-limpiar-hist" style="width:100%;background:var(--rondo-accent)">' + '<span class="rondo-mi">' + ICO.limpiar + '</span> Limpiar historial</button>' +
            '<h4>Reseteo</h4>' +
            '<div class="rondo-acciones">' +
            '<button class="accbtn" id="rondo-borrar-memo" style="background:var(--rondo-accent)"><span class="rondo-mi">' + ICO.limpiar + '</span> Borrar estado</button>' +
            '<button class="accbtn" id="rondo-borrar-todo" style="background:#5d0007">Borrar TODO</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="cfg-foot">' +
            '<span class="cfg-dirty" id="rondo-cfg-dirty" title="Tienes cambios sin guardar">Cambios sin guardar</span>' +
            '<div style="display:flex;gap:8px">' +
            '<button class="cancel" id="rondo-cfg-cerrar">Cerrar</button>' +
            '<button class="accbtn" id="rondo-cfg-guardar">Guardar</button>' +
            '</div>' +
            '</div>'
        );

        ayudaEl = makeEl('div', { id: 'rondo-ayuda' });
        ayudaEl.innerHTML = (
            '<div class="cfg-head"><h3>? Ayuda rapida</h3>' +
            '<button class="rondo-iconbtn" id="rondo-ayuda-x" title="Cerrar">×</button></div>' +
            '<div class="ayuda-body">' +
            '<h4>En 3 pasos</h4>' +
            '<div class="pasos">' +
            '<div class="paso"><b>1. Elige unidades</b>Abre <i>Unidades</i> y marca con la casilla las que quieras vigilar, o activa <i>Monitorear todas</i> en Ajustes.</div>' +
            '<div class="paso"><b>2. Abre sus ventanas</b>Pulsa <i>Automatizar Unidades</i> (arriba a la derecha) para abrirlas y acomodarlas solas.</div>' +
            '<div class="paso"><b>3. Vigila los avisos</b>Las alertas aparecen como tarjetas, voz y pitido. Revisalas en <i>Avisos</i>.</div>' +
            '</div>' +
            '<h4>Qué hace cada pestaña</h4>' +
            '<ul>' +
            '<li><b>Dashboard</b>: cuántas en línea, sin señal, detenidas y alertas del dia.</li>' +
            '<li><b>Unidades</b>: lista con estado, velocidad, zona y acciones. Clic para abrir su ventana; clic derecho para mas opciones.</li>' +
            '<li><b>Avisos</b>: historial filtrable por severidad. Exportable a CSV.</li>' +
            '<li><b>Rutas</b>: progreso de cada ruta y desvíos. Se planea desde el clic derecho de una unidad.</li>' +
            '<li><b>Geocercas</b>: unidades dentro de cada geocerca.</li>' +
            '</ul>' +
            '<h4>Alertas de ruta</h4>' +
            '<p>Con una ruta planeada, el script avisa si la unidad se <b>desvia</b> del trazado, hace un <b>giro en U</b> o <b>regresa al origen</b> (posible viaje cancelado). Activadas en Ajustes &gt; Rutas.</p>' +
            '<h4>Atajos de teclado</h4>' +
            '<ul>' +
            '<li><kbd>Alt</kbd>+<kbd>1</kbd>..<kbd>5</kbd>: cambiar de pestaña.</li>' +
            '<li><kbd>Alt</kbd>+<kbd>P</kbd>: mostrar u ocultar el panel.</li>' +
            '<li><kbd>Alt</kbd>+<kbd>L</kbd>: alternar entre panel flotante y barra lateral.</li>' +
            '<li><kbd>Alt</kbd>+<kbd>H</kbd>: plegar la barra de botones.</li>' +
            '<li><kbd>Esc</kbd>: cerrar ventanas emergentes.</li>' +
            '</ul>' +
            '<h4>Actualizaciones</h4>' +
            '<p>El script revisa si hay una version nueva al iniciar y cada 30 minutos. Si la hay, aparece un indicador en la cabecera del panel; al pulsarlo se abre la URL para que Tampermonkey actualice el script.</p>' +
            '<h4>Consejo</h4>' +
            '<p>Usa el boton <b>Flotante / Lateral</b> de la barra superior para cambiar el modo del panel. Al ocultar la barra lateral queda una pestaña en el borde (rail) que la trae de vuelta con un clic.</p>' +
            '</div>' +
            '<div class="cfg-foot">' +
            '<button class="cancel" id="rondo-ayuda-cerrar">Cerrar</button>' +
            '<button class="accbtn" id="rondo-ayuda-config">Abrir ajustes</button>' +
            '</div>'
        );

        ctxEl = makeEl('div', { id: 'rondo-contexto' });
        toastsEl = makeEl('div', { id: 'rondo-toasts' });
        avisoEl = makeEl('div', { id: 'rondo-aviso' });
        railEl = makeEl('div', { id: 'rondo-rail' });
        railEl.title = 'Mostrar el panel';

        // Accesibilidad base: dialogos, regiones vivas y tabs.
        try {
            [[modalEl, 'Lista de unidades'], [cfgWinEl, 'Configuración'], [ayudaEl, 'Ayuda rápida']].forEach(([el, lbl]) => {
                el.setAttribute('role', 'dialog');
                el.setAttribute('aria-modal', 'true');
                el.setAttribute('aria-label', lbl);
            });
            toastsEl.setAttribute('role', 'status');
            toastsEl.setAttribute('aria-live', 'polite');
            avisoEl.setAttribute('role', 'alert');
            // panelEl aun no esta en el DOM: se consulta sobre el propio nodo.
            const tabsEl = panelEl.querySelector('#rondo-tabs');
            if (tabsEl) tabsEl.setAttribute('role', 'tablist');
            panelEl.querySelectorAll('#rondo-tabs .tab').forEach((t) => t.setAttribute('role', 'tab'));
        } catch (_) { /* noop */ }

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
        document.body.classList.toggle('rondo-lateral', esLateral());
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
        const colIcon = document.querySelector('#rondo-collapse .rondo-mi');
        if (colIcon) colIcon.textContent = esLateral() ? ICO.colapsar : ICO.expandir;
        const colBtn = byId('rondo-collapse');
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
        const lbl = document.querySelector('#rondo-btn-modo .rondo-modo-label');
        if (lbl) lbl.textContent = esLateral() ? 'Lateral' : 'Flotante';
        const icon = document.querySelector('#rondo-btn-modo .rondo-mi');
        if (icon) icon.textContent = esLateral() ? ICO.colapsar : ICO.expandir;
        const sbLbl = document.querySelector('#rondo-sb-modo .rondo-sb-modo-label');
        if (sbLbl) sbLbl.textContent = esLateral() ? 'Flotante' : 'Lateral';
        const sbIcon = document.querySelector('#rondo-sb-modo .rondo-mi');
        if (sbIcon) sbIcon.textContent = esLateral() ? ICO.expandir : ICO.colapsar;
        const sbModo = byId('rondo-sb-modo');
        if (sbModo) sbModo.title = esLateral() ? 'Volver al modo flotante' : 'Pasar a barra lateral';
        const panelLbl = byId('rondo-btn-panel');
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
        const icon = document.querySelector('#rondo-btn-panel .rondo-mi');
        if (icon) icon.textContent = APP.panelHidden ? ICO.panel : ICO.cerrar;
        const t = byId('rondo-btn-panel');
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
        railEl.innerHTML = '<span class="rondo-mi">' + (lado === 'izquierda' ? ICO.arrowRight : ICO.arrowLeft) + '</span>' +
            '<span class="rondo-rail-txt">PANEL</span>';
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
                if (e.target.closest('button') && !e.target.closest('.rondo-grip')) return;
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
            const head = byId('rondo-drag');
            let activo = false, dx = 0, dy = 0;
            head.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('.rondo-iconbtn')) return;
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
            const el = byId('rondo-wrap-' + n);
            if (el) el.style.display = (n === name) ? '' : 'none';
        });
        document.querySelectorAll('#rondo-tabs .tab').forEach((t) => {
            const act = t.dataset.tab === name;
            t.classList.toggle('activo', act);
            t.setAttribute('aria-selected', act ? 'true' : 'false');
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
        if (cZn) cZn.textContent = APP.zonas.length;
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
            setHtml(cont, '<div style="padding:8px;color:var(--rondo-fg-mute)">Todo en orden: ninguna unidad requiere atención.</div>');
            return;
        }
        const meta = {
            offline: { col: 'var(--rondo-bad-fg)', ic: ICO.offline },
            vel: { col: 'var(--rondo-warn-fg)', ic: ICO.velocidad },
            desv: { col: 'var(--rondo-warn-fg)', ic: ICO.destino },
            det: { col: 'var(--rondo-accent-2)', ic: ICO.detenida },
            'ruta-pend': { col: 'var(--rondo-warn-fg)', ic: ICO.destino }
        };
        setHtml(cont, top.map((it) => {
            const mm = meta[it.tipo] || meta.det;
            return '<div class="alerta rondo-atencion-item" data-eco="' + esc(it.eco) + '" style="border-left:3px solid ' + mm.col + ';cursor:pointer" title="Abrir la ventana de ' + esc(it.eco) + '">' +
                '<span class="ico rondo-mi" style="color:' + mm.col + '">' + mm.ic + '</span>' +
                '<div class="cuerpo"><b>' + esc(it.eco) + '</b><span>' + esc(it.txt) + '</span></div>' +
                '<span class="hora rondo-mi" style="color:var(--rondo-fg-mute)">' + ICO.panel + '</span>' +
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
        kv('rondo-kpi-vel', Math.round(vel) + ' km/h prom.');
        kv('rondo-kpi-on-pct', total ? ((on / total) * 100).toFixed(0) + '%' : '-');
        kv('rondo-kpi-off-pct', total ? ((off / total) * 100).toFixed(0) + '%' : '-');
        kv('rondo-kpi-zonas', enZona.size);
        kv('rondo-kpi-aho', aho);
        kv('rondo-kpi-criticos', critAho + ' críticas');
        const resumenZ = document.querySelector('.kpi .valor#rondo-kpi-zonas + .resumen');
        if (resumenZ) resumenZ.textContent = 'de ' + APP.zonas.length + ' geocercas';

        // Distribucion de la flota (barra + leyenda): movimiento / detenidas / sin señal.
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
                '<span><i class="on"></i> En movimiento ' + mov + ' (' + pct(mov) + ')</span>' +
                '<span><i class="det"></i> Detenidas ' + det + ' (' + pct(det) + ')</span>' +
                '<span><i class="off"></i> Sin señal ' + off + ' (' + pct(off) + ')</span>');
        }
        paintAtencion(watched);

        const recientes = byId('rondo-kpi-recientes');
        if (recientes) {
            const items = APP.historial.slice(0, 6);
            setHtml(recientes, items.length
                ? items.map((a) => (
                    '<div class="alerta" style="border-left:3px solid ' + (COL[a.sev] || '#555') + '">' +
                    '<span class="ico rondo-mi" style="color:' + (COL[a.sev] || '#777') + '">' + a.icono + '</span>' +
                    '<div class="cuerpo"><b>' + esc(a.titulo) + '</b>' +
                    (a.detalle ? '<span>' + esc(a.detalle) + '</span>' : '') + '</div>' +
                    '<span class="hora">' + new Date(a.ts).toLocaleTimeString().slice(0, 5) + '</span>' +
                    '</div>'
                )).join('')
                : '<div style="padding:8px;color:var(--rondo-fg-mute)">' + LANG.recientesNone + '</div>');
        }
        paintSparkline();
    }
    function paintSparkline() {
        const svg = byId('rondo-spark');
        if (!svg) return;
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
            case 'zona': return zoneAt(x.st.lat, x.st.lon) || '';
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
        document.querySelectorAll('#rondo-wrap-unidades th.rondo-sortable').forEach((th) => {
            const act = APP.sortCol === th.dataset.sort;
            th.classList.toggle('rondo-sort-asc', act && APP.sortDir !== 'desc');
            th.classList.toggle('rondo-sort-desc', act && APP.sortDir === 'desc');
            const s = th.querySelector('.rondo-sort');
            if (s) s.textContent = act ? (APP.sortDir === 'desc' ? '▾' : '▴') : '⇅';
        });
    }
    function paintTabla() {
        const body = byId('rondo-body');
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
                const zona = zoneAt(x.st.lat, x.st.lon);
                return (x.info.eco + ' ' + x.info.placa + ' ' + x.info.nombre + ' ' + zona).toLowerCase().indexOf(f) >= 0;
            })
            .sort((a, b) => {
                if (APP.sortCol) {
                    const r = cmpOrd(valorOrden(a, APP.sortCol), valorOrden(b, APP.sortCol));
                    if (r !== 0) return APP.sortDir === 'desc' ? -r : r;
                    return a.info.eco.localeCompare(b.info.eco, undefined, { numeric: true });
                }
                const peso = (e) => e === 'offline' ? 0 : (e === 'detenida' ? 1 : 2);
                const d = peso(a.st.estado) - peso(b.st.estado);
                return d !== 0 ? d : a.info.eco.localeCompare(b.info.eco, undefined, { numeric: true });
            });
        setHtml(body, lista.map(({ info, st }) => {
            const clave = info.clave;
            const sel = APP.seleccion.has(info.eco) || APP.seleccion.has(info.placa);
            const sil = APP.dismissed.has(clave);
            const vig = isWatched(info);
            const zona = zoneAt(st.lat, st.lon);
            const clase = st.estado === 'offline' ? 'off' : (st.estado === 'detenida' ? 'det' : 'on');
            const ic = st.estado === 'offline' ? ICO.offline : (st.estado === 'detenida' ? ICO.detenida : ICO.moviendo);
            const txt = st.estado === 'offline' ? 'sin señal' : (st.estado === 'detenida' ? 'detenida' : 'moviendo');
            const coords = (APP.config.mostrarCoords && st.lat != null)
                ? ' <span style="color:var(--rondo-fg-mute);font-size:10px">' + st.lat.toFixed(3) + ',' + st.lon.toFixed(3) + '</span>' : '';
            const lim = limiteDe(info);
            const excede = st.online && st.vel > lim;
            const celVel = '<td' + (excede ? ' style="color:var(--rondo-bad-fg);font-weight:bold"' : '') + ' title="' +
                (lim !== APP.config.velMax ? 'límite de la unidad: ' + lim + ' km/h' : 'límite global: ' + lim + ' km/h') + '">' +
                Math.round(st.vel) + (lim !== APP.config.velMax ? ' <span style="font-size:10px">/' + lim + '</span>' : '') + '</td>';
            const odo = odometroDe(info);
            const km = odo ? Math.round(odo.m / 100) / 10 : 0;
            const celOdo = '<td class="odo" title="Odómetro acumulado (clic derecho para reiniciar)">' + km.toFixed(1) + '</td>';
            // Columna Ruta: estado preciso respecto a la ruta trazada
            // (EN RUTA / LLEGO / DESV / SIN POSICION / SIN RUTA) con el
            // porcentaje y ETA cuando estan disponibles.
            const er = estadoRuta(info, st);
            let celRuta = '<td class="ruta" title="' + esc(er.estado) + '"><span class="rondo-pill ' + rutaClasePill(er.estado) + '">' + esc(er.estado) + '</span>';
            if (er.snap) {
                const pct = Math.round(er.snap.progreso * 100);
                celRuta += '<div class="ruta-bar"><div class="ruta-bar-fill" style="width:' + pct + '%"></div></div>';
                const etaSeg = calcularETA(er.snap, er.ruta, st.vel);
                const etaTxt = etaSeg != null ? Math.round(etaSeg / 60) + ' min' : '-';
                celRuta += '<div class="ruta-meta">' + pct + '% · ' + etaTxt + '</div>';
            } else if (watchDest(info)) {
                // Hay destino pero la unidad esta sin coordenadas: indica que
                // se esta trazando la ruta o que falta ubicacion.
                celRuta += '<div class="ruta-meta">trazando...</div>';
            }
            celRuta += '</td>';
            return (
                '<tr class="fila ' + clase + (sel ? ' sel-row' : '') + '" data-eco="' + esc(info.eco) + '">' +
                '<td class="col-sel" data-eco="' + esc(info.eco) + '">' +
                '<input type="checkbox" class="rondo-sel" data-eco="' + esc(info.eco) + '" data-placa="' + esc(info.placa) + '"' + (sel ? ' checked' : '') + '>' +
                '</td>' +
                '<td class="eco">' + (vig ? '<span class="rondo-mi">' + ICO.bandera + '</span> ' : '') + esc(info.eco || '-') + '</td>' +
                '<td>' + esc(info.placa || '') + '</td>' +
                '<td><span class="rondo-pill ' + clase + '"><span class="rondo-mi">' + ic + '</span>' + txt + '</span></td>' +
                '<td>' + ageText(st.edadMin) + '</td>' +
                celVel +
                '<td>' + esc(zona) + coords + '</td>' +
                celOdo +
                celRuta +
                '<td><button class="mini rondo-sil ' + (sil ? 'on' : '') + '" data-eco="' + esc(info.eco) + '" title="' + (sil ? 'Reactivar' : 'Silenciar') + '">' +
                '<span class="rondo-mi">' + (sil ? ICO.silencio : ICO.sonido) + '</span></button></td>' +
                '</tr>'
            );
        }).join('') || '<tr><td colspan="10">' + emptyState(ICO.panel, LANG.sinUni,
            'Activa <b>Monitorear todas</b> en Ajustes, o abre la lista y agrega tus economicos.',
            '<button class="mini rondo-vacio-acc" data-acc="abrir-lista"><span class="rondo-mi">' + ICO.automatizar + '</span> Abrir lista de unidades</button>') + '</td></tr>');
        const aviso = byId('rondo-sel-vacio');
        if (aviso) {
            const noHaySel = (!APP.config.watchAll && APP.seleccion.size === 0 && lista.length > 0);
            aviso.style.display = noHaySel ? 'block' : 'none';
        }
        byId('rondo-upd').textContent = ICO.reloj + ' ' + new Date().toLocaleTimeString();
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
        setHtml(cont, lista.length
            ? lista.map((a) => (
                '<div class="alerta" style="border-left:4px solid ' + (COL[a.sev] || '#555') + '">' +
                '<span class="ico rondo-mi" style="color:' + (COL[a.sev] || '#777') + '">' + a.icono + '</span>' +
                '<div class="cuerpo">' +
                '<b>' + esc(a.titulo) + '</b>' +
                (a.detalle ? '<span>' + esc(a.detalle) + '</span>' : '') +
                '<div class="meta"><span class="regla">' + esc(a.regla) + '</span>' +
                '<span>' + new Date(a.ts).toLocaleString().slice(0, 16) + '</span></div>' +
                '</div>' +
                '<span class="hora">' + new Date(a.ts).toLocaleTimeString().slice(0, 5) + '</span>' +
                '</div>'
            )).join('')
            : emptyState(ICO.alertas, 'Sin avisos registrados',
                'Aqui se acumula el historial de alertas. Cuando una regla se dispare, aparecera en esta lista.'));
        paintSeverity();
    }
    function paintSeverity() {
        document.querySelectorAll('#rondo-filtroseveridad span[data-sev]').forEach((s) => {
            s.classList.toggle('activo', s.dataset.sev === (APP.filtSever || 'todas'));
        });
    }
    function paintGeocercas() {
        const body = byId('rondo-body-zonas');
        if (!body) return;
        if (!APP.config.loadZones || !APP.zonas.length) {
            setHtml(body, '<tr><td colspan="2">' + emptyState(ICO.geocercas, 'Sin geocercas cargadas',
                APP.config.loadZones
                    ? 'No se encontraron geocercas en tu cuenta de Wialon.'
                    : 'Activa <b>Cargar geocercas</b> en Ajustes &gt; General para verlas.',
                APP.config.loadZones ? '' : '<button class="mini rondo-vacio-acc" data-acc="ajustes"><span class="rondo-mi">' + ICO.ajustes + '</span> Abrir Ajustes</button>') + '</td></tr>');
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
        setHtml(body, rows.join('') || '<tr><td colspan="2">' + emptyState(ICO.filtro, LANG.sinCoin,
            'Ninguna geocerca coincide con el filtro actual.') + '</td></tr>');
    }
    function paintViajes() {
        const cont = byId('rondo-lista-viajes');
        if (!cont) return;
        const ecos = Object.keys(APP.viajes);
        if (!ecos.length) {
            setHtml(cont, emptyState(ICO.tiempo, 'Sin viajes analizados',
                'Clic derecho en una unidad &gt; <b>Analizar viaje</b> para detectar el punto de partida (parada de mas de '
                + (APP.config.partidaHoras || 6) + ' h), el trayecto, las paradas y la carga.'));
            return;
        }
        setHtml(cont, ecos.map((eco) => {
            const v = APP.viajes[eco];
            const flags = [];
            if (v.cargo) flags.push('carga');
            if (v.paradas.length) flags.push(v.paradas.length + ' parada(s)');
            if (v.llego) flags.push('llego a destino');
            if (v.regreso) flags.push('en regreso');
            const color = v.regreso ? 'var(--rondo-warn-fg)' : (v.llego ? 'var(--rondo-ok-fg)' : 'var(--rondo-accent-2)');
            return '<div class="alerta" style="border-left:4px solid ' + color + '">' +
                '<span class="ico rondo-mi" style="color:' + color + '">' + ICO.tiempo + '</span>' +
                '<div class="cuerpo"><b>' + esc(eco) + ' · VIAJE</b>' +
                '<span>Partida ' + new Date(v.partida.t * 1000).toLocaleString().slice(0, 16) + (v.zonaPartida ? ' · ' + esc(v.zonaPartida) : '') + '</span>' +
                '<div class="meta">' +
                '<span class="regla">' + v.distanciaKm + ' km</span>' +
                '<span>' + v.puntos + ' puntos</span>' +
                (v.salida ? '<span>salida ' + new Date(v.salida * 1000).toLocaleTimeString().slice(0, 5) + '</span>' : '') +
                (flags.length ? '<span>' + esc(flags.join(' · ')) + '</span>' : '') +
                '<span>' + new Date(v.analizado).toLocaleTimeString().slice(0, 5) + '</span>' +
                '</div></div>' +
                '<button class="mini rondo-viaje-geo" data-eco="' + esc(eco) + '" title="Exportar viaje GeoJSON"><span class="rondo-mi">' + ICO.exportar + '</span></button>' +
                '<button class="mini rondo-viaje-re" data-eco="' + esc(eco) + '" title="Reanalizar viaje"><span class="rondo-mi">' + ICO.refrescar + '</span></button>' +
                '</div>';
        }).join(''));
    }
    function paintRutas() {
        paintViajes();
        const cont = byId('rondo-lista-rutas');
        if (!cont) return;
        const watched = APP.unidades.filter(shouldWatch).map((u) => ({ info: parseUnitName(u), st: unitState(u) }));
        const filas = watched.filter((x) => rutaDe(x.info));
        const sinUnidad = Object.keys(APP.rutas).filter((eco) => !watched.some((x) => x.info.clave === eco || x.info.eco === eco));
        if (!filas.length && !sinUnidad.length) {
            setHtml(cont, emptyState(ICO.destino, 'Sin rutas planificadas',
                'Haz <b>clic derecho</b> en una unidad de la pestaña Unidades y elige <b>Planear ruta (OSRM)</b> o <b>(A*)</b>. Aquí verás el progreso, la distancia y los desvíos.',
                '<button class="mini rondo-vacio-acc" data-acc="tab-unidades"><span class="rondo-mi">' + ICO.panel + '</span> Ir a Unidades</button>'));
            return;
        }
        const tarjeta = (info, st) => {
            const eco = info.clave;
            const r = rutaDe(info);
            const memo = APP.snapMemo[eco] || (APP.snapMemo[eco] = { idx: 0 });
            const s = (st && st.online && st.lat != null && r) ? snapRuta(st.lat, st.lon, r, memo) : null;
            const desviado = !!(s && s.dist > APP.config.desvioM);
            const llego = !!(s && s.progreso >= 0.95);
            const est = !s ? 'SIN POSICION' : (llego ? 'LLEGO' : (desviado ? 'DESVIADO' : 'EN RUTA'));
            const color = llego ? 'var(--rondo-ok-fg)' : (desviado ? 'var(--rondo-bad-fg)' : 'var(--rondo-accent-2)');
            const dest = r.destinoTexto || (r.destino.lat.toFixed(4) + ',' + r.destino.lon.toFixed(4));
            const etaSeg = s ? calcularETA(s, r, st.vel) : null;
            const etaTxt = etaSeg != null ? Math.round(etaSeg / 60) + ' min ETA' : '';
            return '<div class="alerta" style="border-left:4px solid ' + color + '">' +
                '<span class="ico rondo-mi" style="color:' + color + '">' + ICO.destino + '</span>' +
                '<div class="cuerpo"><b>' + esc(eco || info.nombre) + ' · ' + est + '</b>' +
                '<span>' + esc(dest) + ' · ' + Math.round(r.total / 1000) + ' km · ' + esc(r.modo || '') + '</span>' +
                '<div class="meta">' +
                '<span class="regla">' + (s ? 'progreso ' + Math.round(s.progreso * 100) + '%' : 'sin datos') + '</span>' +
                (s ? '<span>' + Math.round(s.dist) + ' m de la ruta</span>' : '') +
                (etaTxt ? '<span>' + etaTxt + '</span>' : '') +
                (r.duracion ? '<span>' + Math.round(r.duracion / 60) + ' min OSRM</span>' : '') +
                '<span>' + new Date(r.creada).toLocaleString().slice(0, 16) + '</span>' +
                '</div></div>' +
                '<button class="mini rondo-ruta-geo" data-eco="' + esc(eco) + '" title="Exportar ruta GeoJSON"><span class="rondo-mi">' + ICO.exportar + '</span></button>' +
                '<button class="mini rondo-traza-geo" data-eco="' + esc(eco) + '" title="Exportar traza GeoJSON"><span class="rondo-mi">' + ICO.descargar + '</span></button>' +
                '<button class="mini rondo-ruta-calc" data-eco="' + esc(eco) + '" title="Recalcular"><span class="rondo-mi">' + ICO.refrescar + '</span></button>' +
                '<button class="mini rondo-ruta-del" data-eco="' + esc(eco) + '" title="Eliminar ruta"><span class="rondo-mi">' + ICO.cerrar + '</span></button>' +
                '</div>';
        };
        let html = filas.map((x) => tarjeta(x.info, x.st)).join('');
        sinUnidad.forEach((eco) => {
            const r = APP.rutas[eco];
            if (!r) return;
            html += '<div class="alerta" style="border-left:4px solid var(--rondo-fg-mute);opacity:.75">' +
                '<span class="ico rondo-mi">' + ICO.destino + '</span>' +
                '<div class="cuerpo"><b>' + esc(eco) + ' · FUERA DE VIGILANCIA</b>' +
                '<span>' + esc(r.destinoTexto || '') + ' · ' + Math.round(r.total / 1000) + ' km</span></div>' +
                '<button class="mini rondo-ruta-del" data-eco="' + esc(eco) + '" title="Eliminar ruta"><span class="rondo-mi">' + ICO.cerrar + '</span></button>' +
                '</div>';
        });
        setHtml(cont, html);
    }
    function paintPanel() { setTab(APP.tab); }

    setInterval(() => {
        if (panelEl.style.display === 'none') return;
        if (APP.tab === 'unidades') paintTabla();
        if (APP.tab === 'dash') paintKPI();
        if (APP.tab === 'rutas') paintRutas();
        if (APP.tab === 'geocercas') paintGeocercas();
        byId('rondo-upd').textContent = ICO.reloj + ' ' + new Date().toLocaleTimeString();
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
        lineas.push('# Informe Rondo');
        lineas.push('');
        lineas.push('Generado: ' + new Date().toLocaleString());
        lineas.push('Unidades vigiladas: ' + watched.length);
        lineas.push('En línea: ' + (watched.length - off.length) + ' · Sin señal: ' + off.length);
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
        lineas.push('## Unidades sin señal ahora');
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
        a.download = 'rondo_informe_' + new Date().toISOString().slice(0, 10) + '.md';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        advice('Informe generado', hoy.length + ' alertas hoy');
    }

    /* ====================== ACTUALIZACIONES ====================== */
    function pintarActualizacion() {
        const b = byId('rondo-actualizar');
        const u = APP.update;
        const bar = byId('rondo-btn-update');
        if (bar) {
            const ver = (u.state === 'available');
            const visible = bar.style.display !== 'none';
            if (visible !== ver) {
                bar.style.display = ver ? '' : 'none';
                try { placeBar(); } catch (_) { /* noop */ }
            }
            if (ver) {
                bar.innerHTML = '<span class="rondo-mi">' + ICO.actualizar + '</span> Actualizar' + (u.remote ? ' ' + esc(u.remote) : '');
                bar.title = 'Actualizar a la version ' + esc(u.remote || '') + ' (instalada ' + u.local + ')';
            }
        }
        if (b) {
            b.classList.remove('warn');
            if (u.state === 'available') {
                b.style.display = '';
                b.classList.add('activo');
                const icon = b.querySelector('.rondo-mi');
                if (icon) icon.textContent = ICO.actualizar;
                b.title = 'Actualizar a la version ' + u.remote + ' (instalada ' + u.local + ')';
            } else if (u.state === 'installed') {
                b.style.display = '';
                b.classList.add('activo');
                const icon = b.querySelector('.rondo-mi');
                if (icon) icon.textContent = ICO.refrescar;
                b.title = 'Actualizacion instalada · recarga para aplicar';
            } else if (u.state === 'error') {
                b.style.display = '';
                b.classList.remove('activo');
                b.classList.add('warn');
                const icon = b.querySelector('.rondo-mi');
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
        const el = byId('rondo-update-info');
        if (!el) return;
        const u = APP.update;
        let html = 'Version instalada: <b>' + VER + '</b>';
        if (u.remote) html += ' · remota: <b>' + esc(u.remote) + '</b>' + (u.canal ? ' (' + esc(u.canal) + ')' : '');
        if (u.state === 'checking') html += ' · comprobando...';
        else if (u.state === 'current' && u.lastCheck) html += ' · al dia (revisado ' + new Date(u.lastCheck).toLocaleTimeString() + ')';
        else if (u.state === 'available') html += ' · <b style="color:var(--rondo-accent-2)">actualizacion disponible</b>';
        else if (u.state === 'installed') html += ' · <b style="color:var(--rondo-accent-2)">actualizada · recarga</b>';
        else if (u.state === 'error') html += ' · <b style="color:var(--rondo-warn-fg)">no se pudo comprobar</b>' + (u.lastError ? ' (' + esc(u.lastError) + ')' : '');
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
            try { console.warn('[Rondo] update check error:', APP.update.lastError); } catch (_) { /* noop */ }
            pintarActualizacion();
        }
    }
    function recargarUnaVez() {
        if (APP.update.recargando) return;
        APP.update.recargando = true;
        try { location.reload(); } catch (_) { /* noop */ }
    }
    function aplicarActualizacion() {
        const u = APP.update;
        if (u.state === 'available') {
            u.state = 'installed';
            pintarActualizacion();
            const url = u.url || UPDATE_URL;
            // Abre la URL de instalacion: Tampermonkey/Violentmonkey mostrara el
            // dialogo de actualizacion con la nueva version.
            let abierto = null;
            try { abierto = window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) { /* noop */ }
            if (!abierto) { try { location.href = url; return; } catch (_) { /* noop */ } }
            advice('Actualizando a ' + (u.remote || 'la nueva version'), 'confirma la instalacion en Tampermonkey; al volver se recargara sola');
            // Al volver a esta pestaña, recarga para aplicar la version nueva.
            const alVolver = () => {
                setTimeout(recargarUnaVez, 900);
            };
            window.addEventListener('focus', alVolver, { once: true });
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) alVolver();
            }, { once: true });
        } else if (u.state === 'installed') {
            recargarUnaVez();
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
        a.download = 'rondo_config_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        adviceOk('Configuración exportada');
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
                    if (Array.isArray(d.seleccion)) { APP.seleccion = new Set(d.seleccion); writeSession(SS.seleccion, Array.from(APP.seleccion)); }
                    if (Array.isArray(d.dismissed)) { APP.dismissed = new Set(d.dismissed); writeSession(SS.dismissed, Array.from(APP.dismissed)); }
                    if (d.watchMap && typeof d.watchMap === 'object') {
                        APP.watchMap = d.watchMap;
                        writeSession(SS.watch, APP.watchMap);
                        APP.orden = Object.keys(APP.watchMap);
                        guardarOrden();
                    }
                    if (d.limites && typeof d.limites === 'object') { APP.limites = d.limites; writeSession(SS.limites, APP.limites); }
                    if (d.rutas && typeof d.rutas === 'object') { APP.rutas = d.rutas; guardarRutas(); }
                    if (d.panelPos) { APP.panelPos = d.panelPos; writeJSON(LS.panelpos, APP.panelPos); }
                    if (d.panelSize) { APP.panelSize = d.panelSize; writeJSON(LS.panelsize, APP.panelSize); }
                    applyBar(); applyTheme(); placePanel();
                    refresh();
                    adviceOk('Configuración importada');
                } catch (e) {
                    adviceErr('Error importando', (e && e.message) || '');
                }
            };
            r.readAsText(f);
        });
        inp.click();
    }
    function pintarPerfiles() {
        const sel = byId('rondo-perfil-sel');
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
        const sel = byId('rondo-perfil-sel');
        if (sel) sel.value = nombre;
        return true;
    }
    function cargarPerfil(nombre) {
        const p = APP.perfiles[nombre];
        if (!p) return false;
        if (p.config) { APP.config = deepMerge(p.config, DEFAULTS); writeJSON(LS.cfg, APP.config); }
        if (p.limites) { APP.limites = p.limites; writeSession(SS.limites, APP.limites); }
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
        writeSession(SS.hist, APP.historial);
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
            o.sep ? '<div class="sep"></div>' : '<div class="op" data-acc="' + esc(o.id) + '">' + (o.icon ? '<span class="rondo-mi">' + o.icon + '</span> ' : '') + esc(o.label) + '</div>'
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
                // Cierra solo el dialogo superior: primero el flotante, luego
                // el menu contextual, y por ultimo las ventanas modales.
                if (dialogoAbierto()) { cerrarDialogo(); return; }
                if (ctxEl && ctxEl.style.display === 'flex') { ctxEl.style.display = 'none'; return; }
                const ventanas = [modalEl, cfgWinEl, ayudaEl];
                for (let i = ventanas.length - 1; i >= 0; i--) {
                    const w = ventanas[i];
                    if (w && w.style.display && w.style.display !== 'none') { w.style.display = 'none'; return; }
                }
            }
        });
    }
/* ====================== EVENTOS ====================== */
    function bindEvents() {
        mainBtn.addEventListener('click', () => {
            const ta = byId('rondo-txt'); if (ta) ta.value = '';
            pintarModalLista();
            modalEl.style.display = 'flex';
            const ni = byId('rondo-modal-new-eco'); if (ni) ni.focus();
        });
        function abrirModalLista(prefill) {
            const ta = byId('rondo-txt');
            if (ta) ta.value = prefill ? prefill : '';
            pintarModalLista();
            modalEl.style.display = 'flex';
            const ni = byId('rondo-modal-new-eco'); if (ni) ni.focus();
        }
        byId('rondo-cancelar').addEventListener('click', () => {
            modalEl.style.display = 'none';
            const ta = byId('rondo-txt'); if (ta) ta.value = '';
            const ni = byId('rondo-modal-new-eco'); if (ni) ni.value = '';
            const nd = byId('rondo-modal-new-dest'); if (nd) nd.value = '';
        });
        byId('rondo-modal-parse').addEventListener('click', () => {
            const ta = byId('rondo-txt');
            const n = parsearPegado(ta ? ta.value : '');
            if (ta) ta.value = '';
            pintarModalLista();
            paintInfo();
            adviceOk('Pegado', n + ' unidad(es) procesadas');
        });
        byId('rondo-orden-pegado').addEventListener('click', () => aplicarOrdenModo('pegado'));
        byId('rondo-orden-numero').addEventListener('click', () => aplicarOrdenModo('numero'));
        byId('rondo-orden-numero-desc').addEventListener('click', () => aplicarOrdenModo('numero-desc'));
        byId('rondo-orden-alfabetico').addEventListener('click', () => aplicarOrdenModo('alfabetico'));
        byId('rondo-orden-invertir').addEventListener('click', () => aplicarOrdenModo('invertir'));
        inicializarDragLista();
        byId('rondo-modal-clear-txt').addEventListener('click', () => {
            const ta = byId('rondo-txt'); if (ta) ta.value = '';
            ta && ta.focus();
        });
        byId('rondo-modal-add').addEventListener('click', () => {
            const ne = byId('rondo-modal-new-eco');
            const nd = byId('rondo-modal-new-dest');
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
        byId('rondo-modal-vaciar').addEventListener('click', () => {
            rondoConfirm('Vaciar la lista', 'Se quitaran todas las unidades de la lista vigilada. Esta accion no se puede deshacer.', () => {
                APP.watchMap = {};
                guardarLista();
                pintarModalLista();
                paintInfo();
                adviceOk('Lista vaciada');
            }, { peligro: true, okText: 'Vaciar' });
        });
        document.getElementById('rondo-modal-lista').addEventListener('click', (e) => {
            const eco = e.target.dataset && e.target.dataset.eco;
            if (!eco) return;
            if (e.target.classList.contains('rondo-del')) {
                quitarDeLista(eco);
                pintarModalLista();
                paintInfo();
            }
        });
        // Cola de destinos editados por el usuario para planear su ruta con un
        // debounce (asi no se lanza una peticion a OSRM por cada pulsacion).
        const _destinoDebounce = new Map();
        document.getElementById('rondo-modal-lista').addEventListener('input', (e) => {
            if (!e.target.classList || !e.target.classList.contains('rondo-dest')) return;
            const eco = e.target.dataset.eco;
            const destino = e.target.value.trim();
            if (APP.watchMap[eco] !== undefined) {
                APP.watchMap[eco] = destino;
                guardarLista();
                paintInfo();
                if (APP.config.autoRuta && destino) {
                    if (_destinoDebounce.has(eco)) clearTimeout(_destinoDebounce.get(eco));
                    _destinoDebounce.set(eco, setTimeout(() => {
                        _destinoDebounce.delete(eco);
                        const it = unitByEco(eco);
                        if (!it) return;
                        const r = rutaDe(it.info);
                        if (r && r.destinoTexto === destino) return;
                        planearRuta(eco, destino, null,
                            (APP.config.autoRutaModo === 'astar' && APP.config.overpass) ? 'astar' : 'osrm');
                    }, 1500));
                }
            }
        });
        byId('rondo-ejecutar').addEventListener('click', async () => {
            const ta = byId('rondo-txt');
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
        byId('rondo-sb-main').addEventListener('click', () => mainBtn.click());
        byId('rondo-sb-close').addEventListener('click', (e) => cerrarTodasSeguro(e.currentTarget));
        byId('rondo-sb-modo').addEventListener('click', toggleSidebar);
        byId('rondo-sb-panel').addEventListener('click', togglePanel);
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
        byId('rondo-cerrar-panel').addEventListener('click', () => { if (!APP.panelHidden) togglePanel(); });
        byId('rondo-collapse').addEventListener('click', togglePanel);
        byId('rondo-ayuda-btn').addEventListener('click', () => { ayudaEl.style.display = 'flex'; });
        helpBtn.addEventListener('click', () => { ayudaEl.style.display = 'flex'; });
        byId('rondo-ayuda-x').addEventListener('click', () => { ayudaEl.style.display = 'none'; });
        byId('rondo-ayuda-cerrar').addEventListener('click', () => { ayudaEl.style.display = 'none'; });
        byId('rondo-ayuda-config').addEventListener('click', () => {
            ayudaEl.style.display = 'none';
            abrirCfg();
        });
        byId('rondo-refresh').addEventListener('click', (e) => conBusy(e.currentTarget, refresh));
        byId('rondo-csv').addEventListener('click', exportUnits);
        byId('rondo-csv-al').addEventListener('click', exportAlertas);
        byId('rondo-informe').addEventListener('click', exportInforme);
        const listaRutasEl = byId('rondo-lista-rutas');
        if (listaRutasEl) {
            listaRutasEl.addEventListener('click', (e) => {
                const b = e.target.closest && e.target.closest('button');
                if (!b) return;
                const eco = b.dataset.eco;
                if (b.classList.contains('rondo-ruta-del')) {
                    rondoConfirm('Eliminar ruta', 'Se eliminara la ruta planificada de ' + eco + '.', () => {
                        if (eliminarRuta(eco)) adviceOk('Ruta eliminada', eco); else adviceWarn('Sin ruta', eco);
                    }, { peligro: true, okText: 'Eliminar', icon: ICO.cerrar });
                } else if (b.classList.contains('rondo-ruta-geo')) exportRutaGeoJSON(eco);
                else if (b.classList.contains('rondo-traza-geo')) exportTraza(eco);
                else if (b.classList.contains('rondo-ruta-calc')) {
                    const it = unitByEco(eco);
                    const r = it ? rutaDe(it.info) : APP.rutas[eco];
                    if (r) planearRuta(eco, r.destinoTexto || (r.destino.lat + ',' + r.destino.lon), null, r.modo);
                }
            });
        }
        const listaViajesEl = byId('rondo-lista-viajes');
        if (listaViajesEl) {
            listaViajesEl.addEventListener('click', (e) => {
                const b = e.target.closest && e.target.closest('button');
                if (!b) return;
                const eco = b.dataset.eco;
                if (b.classList.contains('rondo-viaje-geo')) exportViajeGeoJSON(eco);
                else if (b.classList.contains('rondo-viaje-re')) analizarViaje(eco, false);
            });
        }
        byId('rondo-captura').addEventListener('click', (e) => conBusy(e.currentTarget, captureSelection));
        byId('rondo-verifica').addEventListener('click', (e) => conBusy(e.currentTarget, () => verifyWindows(false)));
        byId('rondo-sel-all').addEventListener('click', () => { selectAllVisible(); });
        byId('rondo-sel-clear').addEventListener('click', () => { clearSelection(); });
        byId('rondo-verif').addEventListener('click', () => {
            APP.config.verificar = !APP.config.verificar;
            writeJSON(LS.cfg, APP.config);
            restartVerificationLoop();
            advice('Verificación ' + (APP.config.verificar ? 'activada' : 'desactivada'),
                APP.config.verificar ? 'Solo se mantendran las ventanas seleccionadas' : '');
        });
        byId('rondo-filtro').addEventListener('input', (e) => {
            APP.filtro = e.target.value;
            if (APP.tab === 'alertas') paintAlertas();
            else if (APP.tab === 'unidades') paintTabla();
            else if (APP.tab === 'geocercas') paintGeocercas();
        });
        const selEst = byId('rondo-filtro-estado');
        if (selEst) {
            selEst.value = APP.filtEstado || 'todas';
            selEst.addEventListener('change', (e) => {
                APP.filtEstado = e.target.value;
                writeJSON(LS.filtEstado, APP.filtEstado);
                if (APP.tab === 'unidades') paintTabla();
            });
        }
        const selOrden = byId('rondo-orden-sel');
        if (selOrden) {
            selOrden.addEventListener('change', (e) => {
                const modo = e.target.value;
                if (modo) aplicarOrdenModo(modo);
                e.target.value = '';
            });
        }
        const theadUnid = document.querySelector('#rondo-wrap-unidades thead');
        if (theadUnid) {
            theadUnid.addEventListener('click', (e) => {
                const th = e.target.closest && e.target.closest('th.rondo-sortable');
                if (!th) return;
                const col = th.dataset.sort;
                if (APP.sortCol === col) APP.sortDir = (APP.sortDir === 'desc') ? 'asc' : 'desc';
                else { APP.sortCol = col; APP.sortDir = 'asc'; }
                writeJSON(LS.sortCol, APP.sortCol);
                writeJSON(LS.sortDir, APP.sortDir);
                paintTabla();
            });
        }
        // Dashboard: KPI clicables (filtran Unidades) y filas de "Requieren atención".
        const dashEl = byId('rondo-dash');
        if (dashEl) {
            dashEl.addEventListener('click', (e) => {
                const item = e.target.closest && e.target.closest('.rondo-atencion-item');
                if (item && item.dataset.eco) { openUnitWindow(item.dataset.eco); return; }
                const kpi = e.target.closest && e.target.closest('.kpi[data-kpi]');
                if (!kpi) return;
                const acc = kpi.dataset.kpi;
                if (acc === 'alertas') { setTab('alertas'); return; }
                if (acc === 'zonas') { setTab('geocercas'); return; }
                APP.filtEstado = (acc === 'online') ? 'todas' : acc;
                const selF = byId('rondo-filtro-estado');
                if (selF) selF.value = APP.filtEstado;
                writeJSON(LS.filtEstado, APP.filtEstado);
                setTab('unidades');
            });
        }
        document.addEventListener('pointerdown', unlockAudio, { once: true });
        document.addEventListener('keydown', unlockAudio, { once: true });
        document.querySelectorAll('#rondo-tabs .tab').forEach((t) =>
            t.addEventListener('click', () => setTab(t.dataset.tab)));
        document.querySelectorAll('#rondo-filtroseveridad span').forEach((s) =>
            s.addEventListener('click', () => { APP.filtSever = s.dataset.sev; paintAlertas(); }));
        byId('rondo-tema').addEventListener('click', () => {
            APP.config.theme = APP.config.theme === 'oscuro' ? 'claro' : (APP.config.theme === 'claro' ? 'auto' : 'oscuro');
            writeJSON(LS.cfg, APP.config);
            applyTheme();
            advice('Tema', APP.config.theme);
        });
        byId('rondo-actualizar').addEventListener('click', aplicarActualizacion);
        updateBtn.addEventListener('click', aplicarActualizacion);
        byId('rondo-nmolestar').addEventListener('click', () => { toggleNoMolestar(); });
        byId('rondo-test-btn').addEventListener('click', testNotify);
        byId('rondo-exportar-btn').addEventListener('click', exportConfig);
        byId('rondo-importar-btn').addEventListener('click', importConfig);
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
                    advice('Botón oculto: ' + name, 'Reactívalo en Ajustes · Barra de botones');
                });
            });

        document.getElementById('rondo-body').addEventListener('change', (e) => {
            if (!e.target.classList.contains('rondo-sel')) return;
            e.stopPropagation();
            const eco = e.target.dataset.eco || '';
            const placa = e.target.dataset.placa || '';
            if (e.target.checked) addToSelection(eco, placa);
            else removeFromSelection(eco, placa);
            const tr = e.target.closest('tr.fila');
            if (tr) tr.classList.toggle('sel-row', !!e.target.checked);
        });
        document.getElementById('rondo-body').addEventListener('click', (e) => {
            if (e.target.classList && (e.target.classList.contains('rondo-sel') || e.target.closest('label.col-sel'))) {
                e.stopPropagation();
                return;
            }
            const tr = e.target.closest('tr.fila');
            if (!tr) return;
            const eco = tr.dataset.eco;
            if (!eco) return;
            if (e.target.classList && e.target.classList.contains('rondo-sil')) {
                if (APP.dismissed.has(eco)) APP.dismissed.delete(eco); else APP.dismissed.add(eco);
                writeSession(SS.dismissed, Array.from(APP.dismissed));
                paintTabla();
                return;
            }
            openUnitWindow(eco);
        });
        document.getElementById('rondo-body').addEventListener('contextmenu', (e) => {
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
                { id: 'verif', icon: ICO.verifica, label: 'Aplicar verificación' },
                { sep: 1 },
                { id: 'lista', icon: ICO.bandera, label: enLista ? 'Quitar de lista vigilada' : 'Añadir a lista vigilada' },
                { id: 'limite', icon: ICO.velocidad, label: 'Límite de velocidad (actual ' + lim + ' km/h)' },
                { sep: 1 },
                { id: 'ruta-plan', icon: ICO.destino, label: 'Planear ruta (OSRM)' },
                { id: 'ruta-astar', icon: ICO.destino, label: 'Planear ruta (A*)' },
                { id: 'ruta-geo', icon: ICO.exportar, label: 'Exportar ruta GeoJSON' },
                { id: 'ruta-del', icon: ICO.cerrar, label: 'Eliminar ruta' },
                { id: 'traza-geo', icon: ICO.descargar, label: 'Exportar traza GeoJSON' },
                { id: 'viaje-analizar', icon: ICO.tiempo, label: 'Analizar viaje (historial)' },
                { id: 'viaje-geo', icon: ICO.exportar, label: 'Exportar viaje GeoJSON' },
                { id: 'odo-reset', icon: ICO.refrescar, label: 'Reiniciar odómetro' },
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
                writeSession(SS.dismissed, Array.from(APP.dismissed));
                paintTabla();
            } else if (acc === 'verif') verifyWindows(false);
            else if (acc === 'lista') {
                if (APP.watchMap[eco] !== undefined) { quitarDeLista(eco); adviceOk('Quitada de la lista', eco); }
                else { agregarALista(eco, ''); adviceOk('Anadida a la lista', eco); }
                paintTabla();
            } else if (acc === 'limite') {
                const it = unitByEco(eco);
                const actual = it ? limiteDe(it.info) : APP.config.velMax;
                rondoPrompt('Límite de velocidad', 'Para ' + eco + '. Dejalo vacio para usar el global (' + APP.config.velMax + ' km/h).', actual, (val) => {
                    setLimite(eco, val);
                    adviceOk('Límite actualizado', eco + ': ' + (APP.limites[eco] ? APP.limites[eco] + ' km/h' : 'global ' + APP.config.velMax + ' km/h'));
                }, { type: 'number', icon: ICO.velocidad, okText: 'Guardar' });
            } else if (acc === 'ruta-plan' || acc === 'ruta-astar') {
                if (acc === 'ruta-astar' && !APP.config.overpass) {
                    adviceWarn('A* desactivado', 'Activa "Permitir A* sobre datos OSM" en Ajustes · Rutas');
                } else {
                    rondoPrompt('Planear ruta', 'Destino de ' + eco + ': un lugar, una dirección o "lat,lon".', '', (dest) => {
                        if (dest && dest.trim()) planearRuta(eco, dest.trim(), null, acc === 'ruta-astar' ? 'astar' : 'osrm');
                    }, { icon: ICO.destino, okText: 'Calcular', placeholder: 'Monterrey, NL  ·  o  25.68,-100.31' });
                }
            } else if (acc === 'ruta-geo') exportRutaGeoJSON(eco);
            else if (acc === 'ruta-del') {
                rondoConfirm('Eliminar ruta', 'Se eliminara la ruta planificada de ' + eco + '.', () => {
                    if (eliminarRuta(eco)) adviceOk('Ruta eliminada', eco); else adviceWarn('Sin ruta', eco);
                }, { peligro: true, okText: 'Eliminar', icon: ICO.cerrar });
            } else if (acc === 'traza-geo') exportTraza(eco);
            else if (acc === 'viaje-analizar') analizarViaje(eco, false);
            else if (acc === 'viaje-geo') exportViajeGeoJSON(eco);
            else if (acc === 'odo-reset') {
                rondoConfirm('Reiniciar odómetro', 'El odómetro acumulado de ' + eco + ' volverá a 0 km.', () => resetOdometro(eco), { okText: 'Reiniciar', icon: ICO.refrescar });
            }
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
                if (!txt) adviceWarn('Sin ubicación', 'La unidad no reporta coordenadas');
                else { copyToClipboard(txt); advice('Coordenadas copiadas', txt); }
            }
            hideMenu();
        });

        document.querySelectorAll('#rondo-cfg-tabs .cfg-tab').forEach((b) => b.addEventListener('click', () => {
            document.querySelectorAll('#rondo-cfg-tabs .cfg-tab').forEach((x) => x.classList.remove('activo'));
            b.classList.add('activo');
            const sel = b.dataset.cfg;
            document.querySelectorAll('#rondo-config .cfg-pane').forEach((p) => {
                p.style.display = (p.dataset.cfg === sel) ? '' : 'none';
            });
        }));

        function abrirCfg() {
            limpiarCfgDirty();
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
            g('c-escala').value = String(normalizarEscala(APP.config.escalaUI));
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
            g('c-r-demora-base').checked = !!APP.config.reglas.demoraBase;
            g('c-demora-base-min').value = APP.config.demoraBaseMin;
            g('c-partida-horas').value = APP.config.partidaHoras;
            g('c-parada-min').value = APP.config.paradaMin;
            g('c-hist-horas').value = APP.config.historialHoras;
            g('c-analizar-auto').checked = !!APP.config.analizarAuto;
            g('c-osrm').checked = !!APP.config.osrm;
            g('c-overpass').checked = !!APP.config.overpass;
            g('c-trazado').checked = !!APP.config.trazado;
            g('c-trazado-max').value = APP.config.trazadoMax;
            g('c-auto-ruta').checked = APP.config.autoRuta !== false;
            g('c-auto-ruta-modo').value = APP.config.autoRutaModo || 'osrm';
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
        byId('rondo-cfg-btn').addEventListener('click', abrirCfg);
        byId('c-lista-editar').addEventListener('click', () => {
            cfgWinEl.style.display = 'none';
            const prefill = Object.keys(APP.watchMap).map((k) =>
                APP.watchMap[k] ? k + '=' + APP.watchMap[k] : k
            ).join('\n');
            abrirModalLista(prefill);
        });
        function cerrarCfg() {
            if (cfgDirty) {
                rondoConfirm('Descartar cambios', 'Tienes cambios sin guardar en la configuracion. ¿Quieres descartarlos?', () => {
                    limpiarCfgDirty();
                    applyTheme(); // revierte la vista previa de escala/tema
                    cfgWinEl.style.display = 'none';
                }, { peligro: true, okText: 'Descartar', icon: ICO.ajustes });
            } else {
                cfgWinEl.style.display = 'none';
            }
        }
        byId('rondo-cfg-cerrar').addEventListener('click', cerrarCfg);
        byId('rondo-cfg-cerrar-x').addEventListener('click', cerrarCfg);
        const cfgBody = byId('rondo-cfg-body');
        if (cfgBody) {
            cfgBody.addEventListener('input', marcarCfgDirty);
            cfgBody.addEventListener('change', marcarCfgDirty);
        }
        // Vista previa de la escala de UI mientras se elige (se confirma al Guardar).
        const selEscala = byId('c-escala');
        if (selEscala) {
            selEscala.addEventListener('change', (e) => {
                document.documentElement.style.setProperty('--rondo-esc', String(normalizarEscala(e.target.value)));
            });
        }
        byId('rondo-cfg-guardar').addEventListener('click', () => {
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
            cf.escalaUI = normalizarEscala(g('c-escala').value);
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
            cf.reglas.demoraBase = g('c-r-demora-base').checked;
            cf.demoraBaseMin = Math.max(5, isoNum(g('c-demora-base-min').value, cf.demoraBaseMin));
            cf.partidaHoras = Math.max(1, isoNum(g('c-partida-horas').value, cf.partidaHoras));
            cf.paradaMin = Math.max(1, isoNum(g('c-parada-min').value, cf.paradaMin));
            cf.historialHoras = Math.max(2, isoNum(g('c-hist-horas').value, cf.historialHoras));
            cf.analizarAuto = g('c-analizar-auto').checked;
            cf.osrm = g('c-osrm').checked;
            cf.overpass = g('c-overpass').checked;
            cf.trazado = g('c-trazado').checked;
            cf.trazadoMax = Math.max(50, isoNum(g('c-trazado-max').value, cf.trazadoMax));
            cf.autoRuta = g('c-auto-ruta').checked;
            const _modo = g('c-auto-ruta-modo').value;
            cf.autoRutaModo = (_modo === 'astar' && cf.overpass) ? 'astar' : 'osrm';
            // Si el usuario acaba de activar el trazado automatico, lanzamos
            // un pase inmediato para las unidades pendientes.
            const _autoAntes = APP.config.autoRuta;
            if (!_autoAntes && cf.autoRuta) {
                setTimeout(() => autoTrazarRutas(), 200);
            }
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
            writeSession(SS.watch, APP.watchMap);
            writeJSON(LS.barra, APP.barra);
            applyTheme();
            aplicarModoPanel();
            restartTimers();
            limpiarCfgDirty();
            cfgWinEl.style.display = 'none';
            refresh();
            adviceOk(LANG.guardado);
        });

        byId('rondo-b-reset').addEventListener('click', () => {
            APP.barra.x = Math.max(4, window.innerWidth - barraEl.offsetWidth - 15);
            APP.barra.y = 80;
            applyBar();
            adviceOk('Barra recentrada');
        });
        byId('rondo-reset-panel').addEventListener('click', () => {
            panelEl.style.width = '470px';
            panelEl.style.height = '440px';
            APP.panelSize = { w: 470, h: 440 };
            writeJSON(LS.panelsize, APP.panelSize);
            adviceOk('Tamaño restablecido');
        });
        byId('rondo-perfil-guardar').addEventListener('click', () => {
            rondoPrompt('Guardar perfil', 'Ponle un nombre a la configuracion actual.', '', (n) => {
                if (n && n.trim()) {
                    guardarPerfil(n.trim());
                    adviceOk('Perfil guardado', n.trim());
                }
            }, { icon: ICO.exportar, okText: 'Guardar', placeholder: 'Ej. Turno manana' });
        });
        byId('rondo-perfil-cargar').addEventListener('click', () => {
            const sel = byId('rondo-perfil-sel');
            const n = sel ? sel.value : '';
            if (!n) { adviceWarn('Sin perfil', 'Guarda un perfil primero'); return; }
            if (cargarPerfil(n)) {
                cfgWinEl.style.display = 'none';
                adviceOk('Perfil cargado', n);
            }
        });
        byId('rondo-perfil-borrar').addEventListener('click', () => {
            const sel = byId('rondo-perfil-sel');
            const n = sel ? sel.value : '';
            if (!n) return;
            rondoConfirm('Borrar perfil', 'Se borrara el perfil "' + n + '".', () => {
                borrarPerfil(n);
                adviceOk('Perfil borrado', n);
            }, { peligro: true, okText: 'Borrar', icon: ICO.cerrar });
        });
        byId('rondo-check-update').addEventListener('click', async (e) => {
            await conBusy(e.currentTarget, async () => {
                await comprobarActualizacion();
                const u = APP.update;
                if (u.state === 'available') adviceOk('Nueva version disponible', u.remote + ' (instalada ' + VER + ')');
                else if (u.state === 'current') adviceOk('Estas al dia', 'Versión instalada ' + VER + ' · remota ' + (u.remote || '?'));
                else adviceErr('No se pudo comprobar', u.lastError || 'sin conexion');
            });
        });
        byId('rondo-limpiar-hist').addEventListener('click', () => {
            if (!APP.historial.length) { adviceWarn('Sin avisos', 'El historial ya esta vacio'); return; }
            rondoConfirm('Limpiar historial', 'Se borrarán todos los avisos registrados en esta pestaña.', () => {
                limpiarBitacora();
                adviceOk('Historial limpiado');
            }, { peligro: true, okText: 'Limpiar', icon: ICO.limpiar });
        });
        byId('rondo-borrar-memo').addEventListener('click', () => {
            rondoConfirm('Borrar estado', 'Se reinicia el estado interno de las reglas (detenciones, desvíos, etc.).', () => {
                APP.memo = {}; writeSession(SS.memo, APP.memo); refresh();
                adviceOk('Estado borrado');
            }, { okText: 'Borrar', icon: ICO.limpiar });
        });
        byId('rondo-borrar-todo').addEventListener('click', () => {
            rondoConfirm('Borrar TODO', 'Se borrará la configuración, el estado, el historial de avisos, rutas y odómetros. Esta accion no se puede deshacer.', () => {
                Object.keys(LS).forEach((k) => { try { localStorage.removeItem(LS[k]); } catch (_) { /* noop */ } });
                Object.keys(SS).forEach((k) => { try { sessionStorage.removeItem(SS[k]); } catch (_) { /* noop */ } });
                avisoEl.textContent = 'Estado borrado, recargando...';
                avisoEl.style.display = 'block';
                setTimeout(() => { try { location.reload(); } catch (_) { /* noop */ } }, 700);
            }, { peligro: true, okText: 'Borrar TODO' });
        });
        // Acciones de los estados vacios (delegado, un solo listener).
        panelEl.addEventListener('click', (e) => {
            const b = e.target.closest && e.target.closest('.rondo-vacio-acc');
            if (!b) return;
            const acc = b.dataset.acc;
            if (acc === 'abrir-lista') mainBtn.click();
            else if (acc === 'ajustes') abrirCfg();
            else if (acc === 'tab-unidades') setTab('unidades');
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
            avisoEl.textContent = 'Sesión de Wialon no iniciada. Inicia sesión para monitorear.';
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
            setTimeout(abrirBienvenida, 900);
        }
        setTimeout(comprobarActualizacion, 5000);
        setInterval(comprobarActualizacion, 30 * 60 * 1000);
        // Las ventanas de unidad pueden restaurarse despues de cargar la pagina;
        // revalidamos el contorno varias veces al inicio.
        [1500, 4000, 8000, 15000].forEach((t) => setTimeout(revalidarContornos, t));
        // Trazado automatico inicial: cualquier unidad vigilada con destino
        // pendiente recibe su ruta en background. Si ya hay ruta valida para
        // el destino actual, no se recalcula.
        setTimeout(() => { autoTrazarRutas(); }, 2500);
    }
    function log() { try { console.log.apply(console, ['[Rondo]'].concat(Array.prototype.slice.call(arguments))); } catch (_) { /* noop */ } }

    init();

})();
