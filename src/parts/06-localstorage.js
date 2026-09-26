    /* ============================ LOCALSTORAGE ============================ */
    const LS = Object.freeze({
        cfg: 'rondo.api.cfg',
        watch: 'rondo.api.watch',
        memo: 'rondo.api.memo',
        dismissed: 'rondo.api.dismissed',
        hist: 'rondo.api.hist',
        geo: 'rondo.api.geo',
        barra: 'rondo.api.barra',
        panelsize: 'rondo.api.panelsize',
        seleccion: 'rondo.api.seleccion',
        kpi: 'rondo.api.kpi',
        nmolestar: 'rondo.api.nmolestar',
        limites: 'rondo.api.limites',
        perfiles: 'rondo.api.perfiles',
        filtEstado: 'rondo.api.filtEstado',
        sortCol: 'rondo.api.sortCol',
        sortDir: 'rondo.api.sortDir',
        rutas: 'rondo.api.rutas',
        odometro: 'rondo.api.odometro',
        riesgo: 'rondo.api.riesgo',
        // v5.15: municipios de OpenStreetMap (poligonos/bbox) para la
        // tolerancia de desvio y como parada tipo "municipio".
        municipios: 'rondo.api.municipios'
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
        viajes: 'rondo.api.s.viajes',
        riesgo: 'rondo.api.s.riesgo',
        iaCache: 'rondo.api.s.iaCache',
        // v5.15: planes de ruta multipunto por unidad (pestana).
        planes: 'rondo.api.s.planes'
    });

