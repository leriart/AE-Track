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
        municipios: 'rondo.api.municipios',
        // v6.13: copia persistente de las geocercas creadas en Rondo. Solo
        // se escribe si el operador marca "Recordar en este navegador".
        geolocal: 'rondo.api.geolocal',
        // v7.x: eventos ya calculados del informe por geocerca, por unidad y
        // semana. Con una flota grande el barrido no cabe en una pasada, asi
        // que lo ya consultado se guarda: al recargar o al volver a generar
        // se continua solo por lo que falta en vez de empezar de cero.
        geoinf: 'rondo.api.geoinf',
        // Resultados de los informes por plantilla: filas ya calculadas por
        // la plataforma, por trozo. Permite repetir un informe largo sin
        // volver a pedirle lo mismo al servidor.
        infplant: 'rondo.api.infplant',
        // V8.0: filtros de cada plantilla de informe elegidos por el
        // operador (units, geozones...), para no tener que volver a
        // teclearlos cada vez.
        infplantfilt: 'rondo.api.infplantfilt'
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
        planes: 'rondo.api.s.planes',
        // v6.0.11: ultima pestana del panel usada (para retomarla al recargar).
        tab: 'rondo.api.s.tab',
        // v6.0.11: ultima seccion de Ajustes abierta (General, Reglas, IA...).
        cfgTab: 'rondo.api.s.cfgTab',
        // v6.12: estado de la alerta de geocercas de las unidades que NO son
        // vigiladas (flota completa). Las vigiladas lo llevan en su memo
        // normal, dentro de R.geoAlerta.
        geoAlerta: 'rondo.api.s.geoalerta',
        // v6.13: geocercas dibujadas en Rondo (fuera de la plataforma).
        geolocal: 'rondo.api.s.geolocal'
    });

