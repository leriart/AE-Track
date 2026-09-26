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
        voiceVoice: '',         // nombre exacto de la voz del navegador (opcional)
        vozMotor: 'online',     // 'web' (navegador) | 'online' (StreamElements) | 'google'. Por defecto online: la Web Speech API no suena en muchos Linux.
        vozOnline: 'Mia',       // voz online (StreamElements/Polly)
        vozVolumen: 1,          // volumen 0..1
        vozTest: 'Aviso de prueba de Rondo. Unidad 1234 sin senal hace cinco minutos.', // frase del boton Probar voz

        // ── IA de razonamiento ───────────────────────────────────────────
        // El user mete su API key (se guarda en localStorage, prefijo
        // rondo.api.*, nunca sale del navegador salvo al endpoint del
        // proveedor). La IA se invoca manualmente desde el boton
        // "Analizar con IA" en cada aviso. Devuelve veredicto:
        //   {verdict:'falso_positivo'|'normal'|'sospechoso'|'critico',
        //    resumen:'...', recomendaciones:['...']}
        iaHabilitada: false,    // requiere API key para activarse
        iaProveedor: 'deepseek', // 'deepseek'|'nvidia'|'kimi'|'moonshot'|'minimax'|'custom'
        iaApiKey: '',           // API key (NUNCA sale del navegador salvo al endpoint)
        iaEndpoint: '',         // opcional: override del endpoint (util para Kimi.ai vs Moonshot)
        iaModelo: '',           // opcional: override del modelo (si vacio, usa el del proveedor)
        iaTemperature: '',      // opcional: '' = omitir (usa el default del modelo)
        iaMaxTokens: '',        // opcional: '' = omitir (usa el default del modelo)
        iaRadioPoisM: 250,      // radio (m) para pedir POIs a Overpass
        iaTimeoutS: 25,         // timeout para la llamada a la IA
        // v5.14: analisis en lote y resumen narrativo del informe.
        iaBatchMax: 25,         // tope de avisos que envia aiAnalizarLote en una sola llamada
        iaResumenInforme: true, // anadir bloque "## Resumen IA" al informe Markdown diario
        iaLimiteDiario: 200,    // tope blando de llamadas IA/dia (cache + colas)
        iaCacheTTL: 21600,      // TTL del cache de respuestas IA (s, 6h por defecto)
        // v6.0.9: la IA amplia el contexto consultando la API de Wialon
        // (campos personalizados e historial de las unidades mencionadas en
        // la pregunta). Solo lectura. El reporte del servidor es opcional
        // porque puede interferir con los reportes de la propia plataforma.
        iaContextoAPI: true,
        iaReporteServidor: false,
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
        // v6.0.7: busqueda de lugares/municipios. Pais ISO (por defecto Mexico)
        // y sesgo por cercania a la unidad para no traer resultados en ingles
        // ni de otros paises.
        geoPais: 'mx',
        geoBiasKm: 200,
        verificar: false,
        verifSeg: 6,
        theme: 'oscuro',
        density: 'normal',
        acento: '#850D22',
        escalaUI: 1,
        contornos: true,
        contornoHoras: 24,
        mostrarCoords: false,
        panelLado: 'derecha',
        panelAncho: 460,
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
        autoRuta: false,
        autoRutaModo: 'osrm',
        caravanaM: 300,
        caravanaCercaM: 2000,
        // Zonas de riesgo. Por defecto URL vac\u00eda: Rondo no intenta cargar nada
        // hasta que el usuario pegue una URL en Ajustes > Riesgo.
        riesgoUrl: '',
        riesgoFormato: 'auto',   // 'csv' | 'json' | 'auto'
        riesgoMinScore: 1,
        riesgoRadioMul: 1,
        // v5.14: regla predictiva de aproximacion a zona de riesgo. Avisa
        // ANTES de que la unidad llegue a la zona (no despues como
        // riesgoSinSenal). Pensado para horarios nocturnos y ventanas de
        // alto riesgo (deshuesaderos, lotes, etc).
        riesgoPredictMinScore: 4,         // score minimo de la zona para disparar
        riesgoPredictBufferM: 500,        // metros extra de anticipacion mas alla del radio
        riesgoPredictNocturno: false,     // si true, solo dispara de noche
        riesgoPredictNocturnoDesde: '22:00',
        riesgoPredictNocturnoHasta: '05:00',
        riesgoPredictVelMin: 5,           // km/h: ignorar unidades detenidas
        riesgoPredictCooldownS: 300,      // segundos entre alertas repetidas por misma unidad+zona
        // v5.14.4: regla "detenida en geocerca". Dispara una sola vez
        // por episodio (cuando la unidad lleva N min parada dentro de
        // una geocerca). Si la unidad se mueve o sale de la geocerca,
        // rearma para volver a avisar en el siguiente episodio.
        geocercaDetenidoMin: 5,          // minutos detenido dentro de geocerca para alertar
        // v6.0.2: segundos que debe sostenerse un cambio de geocerca antes de
        // avisar ENTER/EXIT. Evita el parpadeo de avisos cuando el GPS oscila
        // en el borde de una geocerca.
        geocercaEstableSeg: 15,
        // v5.15: tolerancia de desvio por municipio. Mientras la unidad siga
        // DENTRO de un municipio por el que pasa su ruta (o una de sus
        // paradas), el desvio no se marca hasta desvioMunicipioM metros.
        desvioMunicipio: true,
        desvioMunicipioM: 3000,
        // v5.15: radio (m) para considerar "llego" a cada parada del plan.
        paradaLlegadaM: 150,
        // v5.14.7: checkbox del chat IA. false = solo vigiladas (default,
        // mas enfocado), true = toda la flota que reporta en la plataforma.
        chatTodaFlota: false,
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
            demoraBase: false,
            riesgoSinSenal: true,
            // v5.14: alerta predictiva cuando una unidad en movimiento se
            // aproxima a una zona de alto riesgo. Apagada por defecto
            // para no generar ruido; se recomienda activarla en flotas
            // con paradas recurrentes cerca de deshuesaderos/lotes.
            riesgoPredict: false,
            // v5.14.4: alerta "detenida en geocerca". Cuando una unidad
            // lleva >= X min detenida DENTRO de una geocerca (no fuera,
            // no en movimiento), avisa con el texto literal pedido:
            // "La unidad X se encuentra detenida en la geocerca Y".
            geocercaDetenido: true
        })
    });

