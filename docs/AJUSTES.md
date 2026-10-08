# Ajustes de Rondo

Referencia generada automaticamente desde `DEFAULTS`
(`src/parts/07-valores-por-defecto.js`). **No editar a mano**: ejecuta
`node scripts/gen-settings.mjs` para regenerarla. La clave es la misma que
usa `APP.config`, asi que puedes consultarla desde la consola del navegador
(`APP.config.pollMs`).

Total: **104 claves**.

| Clave | Tipo | Valor por defecto | Descripcion |
| --- | --- | --- | --- |
| `pollMs` | number | `10000` |  |
| `offlineMin` | number | `5` |  |
| `gpsMin` | number | `15` |  |
| `stopMin` | number | `30` |  |
| `zonaMin` | number | `20` |  |
| `descoMin` | number | `25` |  |
| `velMax` | number | `110` |  |
| `cooldownMin` | number | `45` |  |
| `velSostenidaKmh` | number | `90` | v6.0.11: regla "exceso de velocidad sostenido". A diferencia de `velocidad` (instantanea), exige mantener la velocidad por encima del umbral durante N minutos, asi que no avisa por picos puntuales. |
| `velSostenidaMin` | number | `5` |  |
| `voice` | boolean | `true` |  |
| `voiceLang` | string | `'es-MX'` |  |
| `voiceVoice` | string | `''` | nombre exacto de la voz del navegador (opcional) |
| `vozMotor` | string | `'online'` | 'web' (navegador) \| 'online' (StreamElements) \| 'google'. Por defecto online: la Web Speech API no suena en muchos Linux. |
| `vozOnline` | string | `'Mia'` | voz online (StreamElements/Polly) |
| `vozVolumen` | number | `1` | volumen 0..1 |
| `vozTest` | string | `'Aviso de prueba de Rondo. Unidad 1234 sin senal hace cinco minutos.'` | frase del boton Probar voz |
| `iaHabilitada` | boolean | `false` | requiere API key para activarse |
| `iaProveedor` | string | `'deepseek'` | 'deepseek'\|'nvidia'\|'kimi'\|'moonshot'\|'minimax'\|'custom' |
| `iaApiKey` | string | `''` | API key (NUNCA sale del navegador salvo al endpoint) |
| `iaEndpoint` | string | `''` | opcional: override del endpoint (util para Kimi.ai vs Moonshot) |
| `iaModelo` | string | `''` | opcional: override del modelo (si vacio, usa el del proveedor) |
| `iaTemperature` | string | `''` | opcional: '' = omitir (usa el default del modelo) |
| `iaMaxTokens` | string | `''` | opcional: '' = omitir (usa el default del modelo) |
| `iaRadioPoisM` | number | `250` | radio (m) para pedir POIs a Overpass |
| `iaTimeoutS` | number | `25` | timeout para la llamada a la IA |
| `iaBatchMax` | number | `25` | tope de avisos que envia aiAnalizarLote en una sola llamada |
| `iaResumenInforme` | boolean | `true` | anadir bloque "## Resumen IA" al informe Markdown diario |
| `iaLimiteDiario` | number | `200` | tope blando de llamadas IA/dia (cache + colas) |
| `iaCacheTTL` | number | `21600` | TTL del cache de respuestas IA (s, 6h por defecto) |
| `iaMaxUnidades` | number | `120` | unidades incluidas en el contexto de la IA |
| `iaMaxGeocercas` | number | `1200` | geocercas incluidas en el contexto de la IA |
| `iaContextoAPI` | boolean | `true` | (campos personalizados e historial de las unidades mencionadas en la pregunta). Solo lectura. El reporte del servidor es opcional porque puede interferir con los reportes de la propia plataforma. |
| `iaReporteServidor` | boolean | `false` |  |
| `beep` | boolean | `true` |  |
| `beepVol` | number | `0.06` |  |
| `desktop` | boolean | `false` |  |
| `toastSeg` | number | `12` |  |
| `severidadMin` | string | `'bajo'` |  |
| `watchAll` | boolean | `false` |  |
| `autoOpen` | boolean | `false` |  |
| `loadZones` | boolean | `true` |  |
| `geocode` | boolean | `true` |  |
| `historico` | boolean | `true` |  |
| `geoPais` | string | `'mx'` | v6.0.7: busqueda de lugares/municipios. Pais ISO (por defecto Mexico) y sesgo por cercania a la unidad para no traer resultados en ingles ni de otros paises. |
| `geoBiasKm` | number | `200` |  |
| `verificar` | boolean | `false` |  |
| `verifSeg` | number | `6` |  |
| `theme` | string | `'oscuro'` |  |
| `density` | string | `'normal'` |  |
| `acento` | string | `'#850D22'` |  |
| `temaPlataforma` | boolean | `false` | v6.0.14: heredar el color de acento del skin de la plataforma (AE-Track/Wialon) para que el panel combine con la pagina. Opt-in. |
| `estiloPagina` | boolean | `false` | v6.9.1: reestiliza la pagina de la plataforma con la paleta de Rondo (experimental, opt-in). Cubre acento, superficies, texto y bordes; se aplica con !important sobre :root,html,body y respeta el tema claro/oscuro. |
| `idiomaPlataforma` | boolean | `false` |  |
| `escalaUI` | number | `1` |  |
| `contornos` | boolean | `true` |  |
| `contornoHoras` | number | `24` |  |
| `mostrarCoords` | boolean | `false` |  |
| `panelLado` | string | `'derecha'` |  |
| `panelAncho` | number | `460` |  |
| `panelVisible` | boolean | `false` |  |
| `ocultarAlClicFuera` | boolean | `true` |  |
| `confirmarCierre` | boolean | `true` |  |
| `osrm` | boolean | `true` |  |
| `overpass` | boolean | `false` |  |
| `desvioM` | number | `250` |  |
| `desvioMin` | number | `5` |  |
| `retornoM` | number | `400` |  |
| `retornoPct` | number | `25` |  |
| `giroGrados` | number | `130` |  |
| `giroMin` | number | `3` |  |
| `demoraBaseMin` | number | `30` |  |
| `trazado` | boolean | `true` |  |
| `trazadoMax` | number | `500` |  |
| `partidaHoras` | number | `6` |  |
| `paradaMin` | number | `15` |  |
| `replayGapMin` | number | `15` | igual se interpreta como parada con el motor apagado (la unidad dejo de reportar). Sirve para clasificar las paradas cuando la instalacion no expone un sensor de motor. |
| `replayReporte` | object | `{ mapa: true, kpis: true, paradas: true, eventos: true, puntos: true, coords: true, soloOff: false }` | Opciones del reporte PDF del recorrido (checkboxes de la pestana Replay). Cada clave decide si esa parte aparece en el PDF. |
| `historialHoras` | number | `168` |  |
| `analizarAuto` | boolean | `true` |  |
| `autoRuta` | boolean | `false` |  |
| `autoRutaModo` | string | `'osrm'` |  |
| `caravanaM` | number | `300` |  |
| `caravanaCercaM` | number | `2000` |  |
| `riesgoUrl` | string | `''` | Zonas de riesgo. Por defecto URL vac\u00eda: Rondo no intenta cargar nada hasta que el usuario pegue una URL en Ajustes > Riesgo. |
| `riesgoFormato` | string | `'auto'` | 'csv' \| 'json' \| 'auto' |
| `riesgoMinScore` | number | `1` |  |
| `riesgoRadioMul` | number | `1` |  |
| `riesgoPredictMinScore` | number | `4` | score minimo de la zona para disparar |
| `riesgoPredictBufferM` | number | `500` | metros extra de anticipacion mas alla del radio |
| `riesgoPredictNocturno` | boolean | `false` | si true, solo dispara de noche |
| `riesgoPredictNocturnoDesde` | string | `'22:00'` |  |
| `riesgoPredictNocturnoHasta` | string | `'05:00'` |  |
| `riesgoPredictVelMin` | number | `5` | km/h: ignorar unidades detenidas |
| `riesgoPredictCooldownS` | number | `300` | segundos entre alertas repetidas por misma unidad+zona |
| `geocercaDetenidoMin` | number | `5` | minutos detenido dentro de geocerca para alertar |
| `geocercaEstableSeg` | number | `15` | v6.0.2: segundos que debe sostenerse un cambio de geocerca antes de avisar ENTER/EXIT. Evita el parpadeo de avisos cuando el GPS oscila en el borde de una geocerca. |
| `geoAlertas` | object | `{ zonas: '', alcance: 'vigiladas', severidad: 'medio', disparo: 'paso', minMin: 2, motorMin: 15, estableSeg: 20… }` | formato que los planes multipunto) porque DEFAULTS es plano y las suites comparan sus claves. Sin geocercas elegidas la regla no hace nada, aunque este activada. |
| `desvioMunicipio` | boolean | `true` | v5.15: tolerancia de desvio por municipio. Mientras la unidad siga DENTRO de un municipio por el que pasa su ruta (o una de sus paradas), el desvio no se marca hasta desvioMunicipioM metros. |
| `desvioMunicipioM` | number | `3000` |  |
| `paradaLlegadaM` | number | `150` | v5.15: radio (m) para considerar "llego" a cada parada del plan. |
| `chatTodaFlota` | boolean | `false` | v5.14.7: checkbox del chat IA. false = solo vigiladas (default, mas enfocado), true = toda la flota que reporta en la plataforma. |
| `horario` | object | `{ on: true, desde: '06:00', hasta: '23:00' }` |  |
| `reglas` | object | `{ offline: true, gpsPerdido: true, detenido: true, zona: true, geocerca: true, destino: false, desconexion: tru… }` |  |
