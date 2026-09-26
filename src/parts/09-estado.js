    /* ============================ ESTADO ============================ */
    const APP = {
        unidades: [],
        zonas: [],
        zonasPorNombre: new Map(),
        zonasIndex: null,       // indice espacial de geocercas (v6.0.2)
        zonasDiag: null,        // diagnostico de la ultima extraccion de geocercas
        watchMap: readSessionObject(SS.watch, {}, LS.watch),
        seleccion: new Set(readSessionArray(SS.seleccion, [], LS.seleccion)),
        dismissed: new Set(readSessionArray(SS.dismissed, [], LS.dismissed)),
        memo: readSessionObject(SS.memo, {}, LS.memo),
        historial: readSessionArray(SS.hist, [], LS.hist),
        geoCache: readSessionObject(SS.geo, {}, LS.geo),
        limites: readSessionObject(SS.limites, {}, LS.limites),
        perfiles: readObject(LS.perfiles, {}),
        rutas: readObject(LS.rutas, {}),
        // v5.15: planes de ruta multipunto por unidad. Si no hay plan se
        // deriva del destino simple (watchMap) para no romper lo existente.
        planes: readSessionObject(SS.planes, {}, null),
        // v5.15: municipios OSM (poligono o bbox) persistidos localmente.
        municipios: readArray(LS.municipios, []),
        municipiosRiesgo: [],   // aproximacion derivada de las zonas de riesgo
        odometro: readObject(LS.odometro, {}),
        viajes: readSessionObject(SS.viajes, {}, null),
        trazas: {},
        grafoCache: {},
        snapMemo: {},
        barra: readObject(LS.barra, {
            x: null, y: null, plegada: false, vertical: false,
            botones: { main: true, panel: true, close: true }
        }),
        panelSize: readJSON(LS.panelsize, null),
        noMolestar: readJSON(LS.nmolestar, null),
        kpi: readSessionObject(SS.kpi, { online: [], offline: [] }, LS.kpi),
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
        stats: { erroresReglas: 0, astarCap: 0 },
        // v5.15.2: velocidad suavizada por unidad (media exponencial) para
        // ETAs y estados mas estables, sin depender del ultimo reporte.
        velSuave: {},
        // v6.0.6: cache de resolucion de paradas (texto -> tipo/coords) y
        // control de reintentos del trazado automatico (2 automaticos + manual).
        resolucionCache: {},
        rutaIntentos: {},
        rutaTrazando: false,
        rutaRetryTimer: null,
        caravanaEco: '',

        // Riesgo: zonas de alto riesgo para flota, consultadas en cada arranque
        // desde APP.config.riesgoUrl. Sin default; vive solo en memoria.
        riesgo: null,           // Array<Item> o null si no se carg\u00f3 a\u00fan.
        riesgoTs: 0,            // ms de la ultima carga exitosa.
        riesgoErr: null,        // String del ultimo error o null.
        riesgoEstado: 'idle',   // 'idle' | 'cargando' | 'ok' | 'error'
        _riesgoFetched: '',     // ultima URL por la que se pidi\u00f3 cargar
        // Estado de UI de la pestana Riesgo (sesion; se pierde al recargar).
        riesgoFiltro: '',       // texto libre (estado / municipio / delito / id)
        riesgoNivel: 'todas',   // 'todas' | 'alto' | 'medio' | 'bajo'
        riesgoOrden: 'score',   // 'score' | 'estado' | 'municipio' | 'radio'
        riesgoVista: 'grupo',   // 'grupo' (por estado) | 'plano' (lista)
        riesgoColapsado: {},    // mapa estado -> bool (true = colapsado)
        zonasVista: 'geocercas', // 'geocercas' | 'riesgo' (segmentado de la pestana Zonas)
        // v5.15: filtros/orden de las geocercas (pestana Zonas > Geocercas).
        geoFiltro: '',
        geoOrden: 'nombre',
        geoRol: 'todas'
    };
    APP.panelHidden = !APP.config.panelVisible;
    APP.orden = readSessionArray(SS.orden, [], null);
    APP.ordenModo = '';
    APP.barra.botones = Object.assign({ main: true, panel: true, close: true }, APP.barra.botones || {});
    if (!Array.isArray(APP.kpi.online)) APP.kpi.online = [];
    if (!Array.isArray(APP.kpi.offline)) APP.kpi.offline = [];

