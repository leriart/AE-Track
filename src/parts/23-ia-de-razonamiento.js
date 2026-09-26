    /* ====================== IA DE RAZONAMIENTO ====================== */
    // Tres proveedores compatibles con OpenAI Chat Completions que dan API
    // key gratis sin tarjeta: DeepSeek, NVIDIA NIM, Moonshot Kimi.
    // Se invoca MANUALMENTE desde el boton "Analizar con IA" en cada
    // aviso de la pestana Avisos. No toca el flujo automatico de reglas.
    //
    // El endpoint OpenAI de cada proveedor y el modelo por defecto se
    // exponen aqui para que sea facil añadir un proveedor nuevo.
    //
    // OJO con Kimi: "Kimi for Coding" (kimi.com/code, keys `kimi-...`) y
    // "Moonshot" (platform.moonshot.ai, keys `sk-...`) son productos
    // DISTINTOS con endpoints distintos. Kimi for Coding usa
    // api.kimi.ai/coding/v1 (NO /v1, que da 404); Moonshot usa
    // api.moonshot.ai/v1. Por eso hay dos proveedores separados + un campo
    // "Endpoint" opcional en la UI para sobreescribir cualquiera de ellos.
    const IA_PROVEEDORES = Object.freeze({
        deepseek: {
            nombre: 'DeepSeek',
            endpoint: 'https://api.deepseek.com/v1/chat/completions',
            modelo: 'deepseek-chat',
            headerAuth: 'Authorization',
            prefijo: 'Bearer ',
            nota: 'keys sk-...'
        },
        nvidia: {
            nombre: 'NVIDIA NIM',
            endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
            modelo: 'meta/llama-3.1-70b-instruct',
            headerAuth: 'Authorization',
            prefijo: 'Bearer ',
            nota: 'keys nvapi-...'
        },
        kimi: {
            // Kimi Code (kimi.com/code). OJO: la API vive bajo /coding/v1,
            // NO bajo /v1 (api.kimi.ai/v1 da 404 de nginx). Keys kimi-...
            nombre: 'Kimi for Coding (kimi.com)',
            endpoint: 'https://api.kimi.ai/coding/v1/chat/completions',
            modelo: 'kimi-for-coding',
            headerAuth: 'Authorization',
            prefijo: 'Bearer ',
            nota: 'keys kimi-... de kimi.com/code · endpoint /coding/v1'
        },
        moonshot: {
            nombre: 'Moonshot (platform.moonshot.ai)',
            endpoint: 'https://api.moonshot.ai/v1/chat/completions',
            modelo: 'kimi-k2.6',
            headerAuth: 'Authorization',
            prefijo: 'Bearer ',
            nota: 'keys sk-... (platform.moonshot.ai)'
        },
        minimax: {
            nombre: 'MiniMax',
            endpoint: 'https://api.minimax.io/v1/chat/completions',
            modelo: 'MiniMax-M3',
            headerAuth: 'Authorization',
            prefijo: 'Bearer ',
            nota: 'keys sk-... (platform.minimax.io)'
        },
        custom: {
            nombre: 'Personalizado (OpenAI-compatible)',
            endpoint: '',
            modelo: '',
            headerAuth: 'Authorization',
            prefijo: 'Bearer ',
            nota: 'cualquier endpoint compatible con OpenAI'
        }
    });

    // Prompt del sistema para el analista de flota. Le pedimos veredicto
    // estructurado en JSON para poder parsearlo de forma robusta y pintar
    // el resultado en la UI.
    const IA_SYSTEM = String.raw`Eres un analista de seguridad de flotas de vehiculos en Mexico.
Tu trabajo: dado el contexto de una alerta, decides si es un FALSO POSITIVO, un evento NORMAL, un caso SOSPECHOSO o un incidente CRITICO.

Reglas de razonamiento:
- Si la unidad esta "sin senal" pero su ultima posicion conocida cae DENTRO de una geocerca conocida del cliente (base, proveedor habitual, instalaciones), suele ser un falso positivo: solo se apago la unidad / entro a zona sin cobertura.
- Si esta "sin senal" y la ultima posicion esta EN UNA CARRETERA o PUNTO AISLADO (fuera de geocercas), sube la sospecha a "sospechoso" o "critico" segun los POIs cercanos.
- POIs cercanos (via Overpass): talleres mecanicos, deshuesaderos, estacionamientos privados, zonas industriales, bares o lotes baldios cerca del ultimo punto conocido aumentan la sospecha de robo.
- "Desvio de ruta" persistente (>5 min) suele ser sospechoso si el nuevo trazado pasa por puntos aislados o se aleja de la geocerca destino.
- "Velocidad excedida" en zona escolar / hospital / pueblo es critico.
- "Detenido en zona no prevista" en un punto conocido de carga/descarga es normal; si es en un lote aislado o cerca de un deshuesadero, es sospechoso.
- Hora del dia importa: 2-5 AM en un lugar aislado y sospechoso suele ser critico.
- No inventes datos: usa solo el contexto JSON recibido; si un campo no viene, no lo afirmes ni supongas su valor.

Devuelve EXCLUSIVAMENTE un objeto JSON (sin markdown, sin prosa) con esta forma EXACTA:
{
  "veredicto": "falso_positivo" | "normal" | "sospechoso" | "critico",
  "confianza": numero entre 0 y 1,
  "resumen": "una o dos frases explicando el razonamiento en espanol",
  "evidencia": ["..."],
  "recomendacion": "una accion concreta (verificar con central, llamar al operador, marcar para revision, etc.)
}`;

    // v5.14: prompt para ANALISIS EN LOTE. Recibe hasta N alertas y debe
    // devolver un ranking priorizado y un resumen ejecutivo. Util para
    // que el operador revise un turno completo sin pulsar IA N veces.
    const IA_SYSTEM_LOTE = String.raw`Eres un analista de seguridad de flotas de vehiculos en Mexico. Te pasan entre 5 y 50 alertas de un mismo turno (de medio dia o un dia completo) y debes priorizarlas.

Para CADA alerta, decide si es un FALSO POSITIVO, NORMAL, SOSPECHOSA o CRITICA aplicando las mismas reglas de razonamiento del analista por aviso (geocercas conocidas, POIs cercanos via Overpass, hora del dia, etc.).

Devuelve EXCLUSIVAMENTE un objeto JSON (sin markdown, sin prosa) con esta forma EXACTA:
{
  "resumen": "parrafo de 2-4 frases en espanol explicando el turno: cuantos avisos, cuantos criticos/sospechosos, patron general si lo hay, unidades o ventanas horarias problematicas",
  "ranking": [
    { "clave": "la clave exacta de la alerta", "ts": "ISO de la alerta", "veredicto": "falso_positivo|normal|sospechoso|critico", "confianza": 0.0-1.0, "motivo": "frase corta en espanol explicando el por que" }
  ],
  "recomendaciones": ["accion concreta 1", "accion concreta 2"]
}

Reglas:
- El ranking va de MAS urgente a MENOS urgente (criticos primero, luego sospechosos, luego normales, luego falsos positivos al final).
- Si tienes mas de 15 alertas, prioriza las 10 mas importantes en el ranking y omite el resto (no hace falta listar las 50).
- "recomendaciones" son acciones operativas (revisar X, llamar a Y, ajustar umbral de Z).
- NO incluyas avisos duplicados: si varias alertas son de la misma unidad en la misma ventana de 10 min, colapsalas en una sola entrada.
- Todo en espanol, tono profesional y directo.`;

    // v5.15: prompt para el analisis proactivo de TODA la flota (no de
    // alertas sueltas). Recibe el snapshot completo de la plataforma y
    // devuelve una lista priorizada de lo que requiere atencion AHORA,
    // como lo haria un monitorista experimentado.
    const IA_SYSTEM_FLOTA = String.raw`Eres un monitorista experto de flotas de vehiculos en Mexico. Recibes un snapshot EN VIVO de la plataforma: unidades (posicion, estado, zona, municipio, ruta con paradas, odometro, limite, silenciada), geocercas, municipios, zonas de riesgo, viajes, alertas del dia y la configuracion de umbrales de Rondo.

Tu trabajo es vigilar la flota y decir que requiere atencion AHORA, con criterio de operador (no alarmista). Devuelve EXCLUSIVAMENTE un objeto JSON (sin markdown, sin prosa) con esta forma:
{
  "resumen": "2-4 frases en espanol con el estado general de la flota",
  "atencion": [
    { "eco": "eco o placa", "prioridad": "critica|alta|media", "motivo": "frase corta", "accion": "que deberia hacer el operador" }
  ],
  "riesgos": ["observacion de riesgo concreta (unidad cerca de zona de riesgo, sin senal en municipio peligroso, etc.)"],
  "recomendaciones": ["ajuste operativo o de parametros de Rondo"]
}

Reglas:
- Ordena "atencion" de mas a menos urgente; maximo 12 entradas. Si una unidad esta bien, no la incluyas.
- Prioriza: sin senal + zona/municipio de riesgo; desvio de ruta sostenido; detenciones largas fuera de base; excesos claros; rutas sin avanzar; odometro incongruente.
- Considera la hora del dia y si la unidad esta en una zona de riesgo o en un municipio con score alto.
- No inventes datos: si un campo no viene en el snapshot, no lo afirmes.
- Espanol de Mexico, tono profesional y directo, sin emojis.`;

    // v5.14: prompt para RESUMEN NARRATIVO del dia (encabezado del
    // informe Markdown). Devuelve texto libre, NO JSON. Pensado para
    // que un supervisor lea el informe y de un vistazo sepa que paso.
    const IA_SYSTEM_RESUMEN = String.raw`Eres un analista de seguridad de flotas de vehiculos en Mexico. Te pasan el listado de alertas de un dia y debes escribir un resumen ejecutivo breve (3-6 frases) en espanol para encabezar el informe diario.

El resumen debe:
- Mencionar el total de alertas y desglose por severidad (criticas, altas, medias, bajas).
- Destacar 1-3 unidades problematicas si las hay (eco o placa), con el motivo (perdio senal, desvio, etc.).
- Senalar cualquier patron relevante (misma hora, misma zona, misma regla repetida).
- Terminar con una recomendacion operativa corta si hay algo accionable.

Reglas:
- Tono profesional, espanol Mexico, sin emojis.
- Si NO hay alertas: devuelve un parrafo breve confirmando que el dia estuvo sin incidencias y cuales unidades estuvieron sin senal.
- NO uses markdown (sin #, sin *, sin listas). Parrafos corridos.
- NO inventes unidades que no aparezcan en el JSON. Si no sabes un detalle, no lo menciones.`;

    // v5.14: prompt para DETECCION DE PATRONES en la bitacora historica.
// v5.14.2: prompt recortado ~50% (lo que mas ocupa: la lista de
// parametros). El modelo solo necesita los NOMBRES, no las descripciones
// largas de cada uno (los defaults vienen en el JSON de contexto).
const IA_SYSTEM_PATRONES = String.raw`Eres analista senior de flotas en Mexico. Recibes la bitacora de alertas de Rondo (JSON con timestamp ISO, severidad, regla, eco, titulo, detalle) y debes identificar PATRONES RECURRENTES y proponer AJUSTES CONCRETOS de parametros.

PARAMETROS AJUSTABLES (usar exactamente estos nombres):
pollMs, offlineMin, gpsMin, stopMin, zonaMin, descoMin, velMax, cooldownMin,
desvioM, desvioMin, retornoM, retornoPct, giroGrados, giroMin, demoraBaseMin,
paradaMin, partidaHoras.

Devuelve SOLO este JSON (sin markdown, sin prosa):
{
  "patrones": [
    {
      "tipo": "unidad" | "regla" | "hora" | "zona" | "regla_unidad",
      "descripcion": "frase explicando el patron observado",
      "evidencia": ["clave1", "clave2"]
    }
  ],
  "sugerencias": [
    {
      "parametro": "nombre exacto de la lista",
      "valor_actual": numero,
      "valor_sugerido": numero,
      "motivo": "frase justificando el cambio"
    }
  ]
}

Reglas:
- Solo sugiere si hay >=3 ocurrencias claras.
- Si los parametros parecen razonables, devuelve sugerencias vacio.
- NO sugieras activar/desactivar reglas.
- NO inventes claves; usa solo las del JSON.
- Si hay <10 alertas, devuelve ambos arrays vacios.
- Espanol, sin emojis, JSON estricto.`;

    // Junta el contexto para una alerta: eco, placa, estado, ultima posicion,
    // geocerca actual, POIs cercanos por Overpass y ultimas alertas.
    async function aiContexto(alert) {
        const eco = String(alert.eco || '');
        const unidades = APP.unidades || [];
        // Exige coincidencia real de eco o clave: con eco vacio, antes se
        // asociaba a la primera unidad sin economico.
        const u = unidades.find((x) => {
            const ix = parseUnitName(x);
            return (eco && ix.eco === eco) || (alert.clave && ix.clave === alert.clave);
        });
        const info = u ? parseUnitName(u) : { eco, placa: '', nombre: eco };
        const st = u ? unitState(u) : { lat: null, lon: null, vel: 0, edadMin: 0, online: false, estado: 'desconocido' };
        const pos = (st.lat != null && st.lon != null)
            ? { lat: +(+st.lat).toFixed(6), lon: +(+st.lon).toFixed(6), ts: u && u.pos ? u.pos.t : null }
            : null;
        // Geocerca actual (si la unidad esta dentro). Usa inZone (poligono/circulo).
        const geocercaActual = (function () {
            if (!pos) return null;
            for (const z of APP.zonas || []) {
                if (inZone(pos.lat, pos.lon, z)) return z.n || z.nombre || z.name || 'geocerca';
            }
            return null;
        })();
        // POIs cercanos via Overpass (amenity + shop + leisure peligrosos).
        let pois = [];
        if (pos && APP.config.iaRadioPoisM > 0) {
            pois = await aiOverpassPois(pos.lat, pos.lon, +APP.config.iaRadioPoisM || 250);
        }
        // Historial reciente de la misma unidad (ultimas 5).
        const hist = (APP.historial || [])
            .filter((h) => h.eco === eco)
            .slice(0, 5)
            .map((h) => ({ regla: h.regla, sev: h.sev, ts: new Date(h.ts).toISOString(), titulo: h.titulo }));
        // v5.15: mas datos de plataforma para que el veredicto tenga contexto.
        const mun = pos ? municipioEn(pos.lat, pos.lon) : null;
        const ruta = u ? rutaDe(info) : null;
        const memoU = (u && APP.memo[info.clave]) || {};
        const odo = u ? odometroDe(info) : null;
        const er = ruta ? estadoRuta(info, st) : { estado: 'SIN RUTA' };
        const rutaInfo = ruta ? {
            estado: er.estado, modo: ruta.modo, optimo: !!ruta.optimo, circuito: !!ruta.circuito,
            destino: ruta.destinoTexto || '', km: Math.round((ruta.total || 0) / 1000),
            progreso: er.snap ? Math.round(er.snap.progreso * 100) : null,
            desviado: !!er.desviado,
            paradas: (ruta.paradas || []).map((p) => ({ texto: p.texto, tipo: p.tipo })).slice(0, 12),
            paradaActual: (+memoU.paradaActual || 0)
        } : null;
        return {
            eco, placa: info.placa || '', nombre: info.nombre || '',
            regla: alert.regla, sev: alert.sev,
            titulo: alert.titulo, detalle: alert.detalle || '',
            ultimaPosicion: pos, edadMin: st.edadMin || 0,
            velocidad: st.vel || 0, estado: st.estado || 'desconocido',
            geocercaActual, pois, alertasRecientes: hist,
            municipioActual: (mun && mun.nombre) ? { nombre: mun.nombre, estado: mun.estado || '' } : null,
            silenciada: APP.dismissed.has(eco),
            limiteKmh: u ? limiteDe(info) : null,
            odometroKm: odo ? Math.round((+odo.m || 0) / 1000) : 0,
            ruta: rutaInfo
        };
    }

    // Pide a Overpass POIs alrededor de un punto. Devuelve [{nombre, tipo, dist_m}].
    // Timeout corto: si falla, devolvemos lista vacia (la IA no se bloquea).
    async function aiOverpassPois(lat, lon, radioM) {
        // lat/lon 0 son coordenadas validas: solo descartamos null/undefined.
        if (lat == null || lon == null || !radioM) return [];
        const radio = Math.max(50, Math.min(2000, +radioM || 250));
        const q = '[out:json][timeout:10];(' +
            'node["amenity"~"workshop|fuel|parking|car_wash|nightclub|bar|driving_school|place_of_worship|grave_yard|prison|courthouse|police"](around:' + radio + ',' + lat + ',' + lon + ');' +
            'node["shop"~"car_repair|car_parts|scrap_yard|tyres|motorcycle"](around:' + radio + ',' + lat + ',' + lon + ');' +
            'node["leisure"~"park|pitch|garden"](around:' + radio + ',' + lat + ',' + lon + ');' +
            'way["amenity"~"parking|fuel|industrial"](around:' + radio + ',' + lat + ',' + lon + ');' +
            ');out body 30;';
        try {
            const res = await httpRequest({
                method: 'POST',
                url: 'https://overpass-api.de/api/interpreter',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(q),
                timeoutMs: 8000
            });
            if (!res.ok) return [];
            let d;
            try { d = JSON.parse(res.texto || '{}'); } catch (_) { return []; }
            const out = [];
            (d.elements || []).forEach((el) => {
                if (!el.lat || !el.lon) return;
                const t = el.tags || {};
                const nombre = t.name || t.operator || t.brand
                    || (t.amenity ? ('amenity:' + t.amenity) : null)
                    || (t.shop ? ('shop:' + t.shop) : null)
                    || (t.leisure ? ('leisure:' + t.leisure) : null)
                    || 'lugar';
                out.push({
                    nombre: String(nombre).slice(0, 80),
                    tipo: t.amenity || t.shop || t.leisure || 'desconocido',
                    dist_m: Math.round(haversine(lat, lon, el.lat, el.lon))
                });
            });
            // Ordena por distancia y devuelve los 8 mas cercanos.
            out.sort((a, b) => a.dist_m - b.dist_m);
            return out.slice(0, 8);
        } catch (_) {
            return [];
        }
    }

    // Llama al proveedor configurado y devuelve el objeto de veredicto
    // parseado (o {error, raw} si fallo).
    async function aiLlamarProveedor(contexto) {
        const cfg = APP.config || {};
        if (!cfg.iaHabilitada) return { error: 'IA deshabilitada. Activala en Ajustes > IA.' };
        if (!cfg.iaApiKey) return { error: 'Falta la API key. Pegala en Ajustes > IA.' };
        // El analisis de una sola alerta tambien consume cuota: respeta el
        // tope diario igual que lote, patrones, flota y chat.
        if (iaLimiteExcedido()) {
            const hoy = iaContadorHoy();
            return { error: 'Limite diario de IA alcanzado (' + (hoy.llamadas || 0) + '/' +
                (+cfg.iaLimiteDiario || 200) + '). Sube "Limite diario" en Ajustes > IA o espera a manana.' };
        }
        const prov = IA_PROVEEDORES[cfg.iaProveedor];
        if (!prov) return { error: 'Proveedor IA desconocido: ' + cfg.iaProveedor };
        // El endpoint puede sobreescribirse en la UI (campo "Endpoint").
        // Asi un cambio de region/producto no exige tocar el script.
        const endpoint = String(cfg.iaEndpoint || '').trim() || prov.endpoint;
        if (!endpoint) return { error: 'Falta el endpoint del proveedor. Rellenalo en Ajustes > IA.' };
        const modelo = cfg.iaModelo && String(cfg.iaModelo).trim() ? cfg.iaModelo : prov.modelo;
        if (!modelo) return { error: 'Falta el modelo. Rellenalo en Ajustes > IA.' };
        const body = {
            model: modelo,
            messages: [
                { role: 'system', content: IA_SYSTEM },
                { role: 'user', content: 'Contexto de la alerta (JSON):\n' + JSON.stringify(contexto, null, 0) }
            ],
            stream: false
        };
        // temperature es OPCIONAL: varios modelos (p. ej. Kimi for Coding)
        // solo aceptan un valor concreto (1) y rechazan el resto con 400.
        // Si el user no la define, se omite y el modelo usa su default.
        if (cfg.iaTemperature !== '' && cfg.iaTemperature != null && isFinite(Number(cfg.iaTemperature))) {
            body.temperature = Number(cfg.iaTemperature);
        }
        // max_tokens tambien es opcional por la misma razon (algunos modelos
        // exigen max_completion_tokens o rechazan valores bajos).
        if (cfg.iaMaxTokens !== '' && cfg.iaMaxTokens != null && isFinite(Number(cfg.iaMaxTokens))) {
            body.max_tokens = Math.max(64, Math.min(4000, Number(cfg.iaMaxTokens)));
        }
        const headers = { 'Content-Type': 'application/json' };
        headers[prov.headerAuth || 'Authorization'] = (prov.prefijo || 'Bearer ') + cfg.iaApiKey;
        const ms = Math.max(2000, (+cfg.iaTimeoutS || 25) * 1000);
        const res = await httpRequest({
            method: 'POST',
            url: endpoint,
            headers: headers,
            body: JSON.stringify(body),
            timeoutMs: ms
        });
        // Contabiliza la llamada (OK o error) para el tope diario.
        iaContadorSumar(res && !res.red && res.ok);
        if (res.red) {
            // Sin respuesta del servidor: red caida, CORS o URL mal.
            const gm = !!gmXhr();
            return {
                error: 'No se pudo contactar ' + prov.nombre + ' (' + (res.timeout ? 'timeout' : 'fallo de red') + ')' +
                    ' [transporte=' + (gm ? 'GM' : 'fetch') + ']' +
                    (gm ? '. Revisa el endpoint.' : ' · CORS: activa GM_xmlhttpRequest o usa un gestor que lo soporte.')
            };
        }
        if (!res.ok) {
            // 401/403: la key suele ser de OTRO producto o endpoint.
            // 404: la RUTA del endpoint esta mal (p. ej. Kimi usa /coding/v1).
            // Damos pistas concretas en vez del volcado crudo.
            let pista = '';
            if (res.status === 401 || res.status === 403) {
                pista = ' · Revisa que la API key corresponda a ' + prov.nombre +
                    ' (endpoint ' + endpoint + ')' + (prov.nota ? '. ' + prov.nota : '') +
                    '. Si tu key es de otro producto (p. ej. Kimi.ai vs Moonshot), cambia de proveedor o ajusta el endpoint.';
            } else if (res.status === 404) {
                pista = ' · La RUTA del endpoint no existe. ' + (prov.nota ? prov.nota + '. ' : '') +
                    'Endpoint actual: ' + endpoint + '. Revisa la URL exacta del proveedor.';
            } else if (res.status === 429) {
                pista = ' · Limite de uso alcanzado (rate limit). Espera un poco o cambia de proveedor.';
            } else if (res.status === 400) {
                pista = ' · El modelo rechazo un parametro (revisa Temperatura/Max tokens o el modelo elegido).';
            }
            const gmUsado = !!gmXhr();
            const error = prov.nombre + ' HTTP ' + res.status + pista + (res.texto ? ' · ' + res.texto : '');
            try { console.log('[Rondo][IA] ' + error + ' · transporte=' + (gmUsado ? 'GM_xmlhttpRequest' : 'fetch')); } catch (_) { /* noop */ }
            return { error: error };
        }
        let data;
        try { data = JSON.parse(res.texto || '{}'); } catch (e) { return { error: 'Respuesta no-JSON de ' + prov.nombre }; }
        const txt = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!txt) return { error: 'Sin contenido en la respuesta de ' + prov.nombre, raw: data };
        // El modelo a veces envuelve el JSON en ```json ... ``` o lo mezcla
        // con prosa. rxParseJSON tolera ambos casos y comas finales.
        const j = rxParseJSON(String(txt));
        if (j !== null && typeof j === 'object') return j;
        return { error: 'La IA no devolvio JSON parseable', raw: String(txt).slice(0, 500) };
    }

    // Pipeline principal: junta contexto y llama al proveedor.
    async function aiAnalizar(alert) {
        if (!APP.config.iaHabilitada) return { error: 'IA deshabilitada' };
        if (!APP.config.iaApiKey) return { error: 'Falta API key' };
        const ctx = await aiContexto(alert);
        const veredicto = await aiLlamarProveedor(ctx);
        return Object.assign({ contexto: ctx }, veredicto);
    }

    // ── v5.14: analisis en lote y resumen narrativo ──────────────────────
    // Manda hasta N alertas en una sola llamada. Devuelve un ranking de las
    // mas sospechosas/criticas con un resumen ejecutivo. Util para el
    // cierre de turno: evita que el operador tenga que pulsar IA N veces.
    //
    // El prompt pide JSON {ranking:[{clave, eco, veredicto, confianza,
    // motivo}], resumen} y se cachea en APP.iaCache para no volver a
    // facturar al proveedor si el lote no cambia.
    async function aiAnalizarLote(alertas) {
        if (!APP.config.iaHabilitada) return { error: 'IA deshabilitada' };
        if (!APP.config.iaApiKey) return { error: 'Falta API key' };
        const max = clamp(Math.round(+APP.config.iaBatchMax || 25), 5, 50);
        const muestra = (Array.isArray(alertas) ? alertas : []).slice(0, max);
        if (!muestra.length) return { error: 'Sin avisos para analizar' };
        // Cache: si ya analizamos este mismo lote hoy, devolvemos lo previo.
        const cacheKey = 'lote:' + muestra.map((a) => a.clave + '@' + a.ts).join('|');
        const cacheHit = iaCacheGet(cacheKey);
        if (cacheHit) return cacheHit;
        // Compactamos: mandamos solo lo necesario para no inflar tokens.
        const compact = muestra.map((a) => ({
            clave: a.clave,
            ts: new Date(a.ts).toISOString(),
            sev: a.sev,
            regla: a.regla,
            eco: a.eco || '',
            titulo: a.titulo,
            detalle: (a.detalle || '').slice(0, 240)
        }));
        const ctx = {
            total: muestra.length,
            fecha: new Date().toISOString().slice(0, 10),
            alertas: compact
        };
        const r = await aiLlamarProveedorPrompt(IA_SYSTEM_LOTE, ctx);
        if (r && !r.error) iaCacheSet(cacheKey, r);
        return r;
    }

    // v5.15: analisis proactivo de TODA la flota. A diferencia del lote
    // (que prioriza avisos ya generados), este revisa el snapshot completo
    // de la plataforma y devuelve que unidades requieren atencion. Se
    // cachea por minuto para no repetir llamadas seguidas.
    async function aiAnalizarFlota() {
        if (!APP.config.iaHabilitada) return { error: 'IA deshabilitada' };
        if (!APP.config.iaApiKey) return { error: 'Falta API key' };
        const ctx = chatContextoFlota();
        const cacheKey = 'flota:' + new Date().toISOString().slice(0, 16) + ':' + (ctx.unidades ? ctx.unidades.length : 0);
        const cacheHit = iaCacheGet(cacheKey);
        if (cacheHit) return cacheHit;
        const r = await aiLlamarProveedorPrompt(IA_SYSTEM_FLOTA, ctx);
        if (r && !r.error) iaCacheSet(cacheKey, r);
        return r;
    }

    // Resumen narrativo del dia para incluir al principio del informe
    // Markdown (exportInforme). Llamada unica, cacheada por fecha+dia.
    async function aiResumenDia(alertas) {
        if (!APP.config.iaHabilitada) return { error: 'IA deshabilitada' };
        if (!APP.config.iaApiKey) return { error: 'Falta API key' };
        const max = clamp(Math.round(+APP.config.iaBatchMax || 25), 5, 50);
        const muestra = (Array.isArray(alertas) ? alertas : []).slice(0, max);
        if (!muestra.length) return { texto: 'Sin avisos en el dia. No hay actividad para resumir.', confianza: 1 };
        const cacheKey = 'resumen:' + new Date().toISOString().slice(0, 10) + ':' + muestra.length;
        const cacheHit = iaCacheGet(cacheKey);
        if (cacheHit) return cacheHit;
        const compact = muestra.map((a) => ({
            ts: new Date(a.ts).toISOString(),
            sev: a.sev,
            regla: a.regla,
            eco: a.eco || '',
            titulo: a.titulo,
            detalle: (a.detalle || '').slice(0, 200)
        }));
        const ctx = {
            total: muestra.length,
            fecha: new Date().toISOString().slice(0, 10),
            unidadesVigiladas: APP.unidades.filter(shouldWatch).length,
            alertas: compact
        };
        const r = await aiLlamarProveedorPrompt(IA_SYSTEM_RESUMEN, ctx);
        // El resumen narrativo se espera como texto libre (no JSON).
        if (r && !r.error) iaCacheSet(cacheKey, r);
        return r;
    }

    // v5.14: deteccion de patrones recurrentes en la bitacora. Envia las
    // ultimas N alertas al proveedor con un prompt que pide identificar
    // patrones (por unidad, regla, hora, zona, combinaciones) y proponer
    // sugerencias concretas de ajuste de umbrales del script.
    //
    // v5.14.2: limite de muestra bajado de max(50, iaBatchMax*4)/200 a
    // max(15, iaBatchMax*2)/80 para no exceder el context window de
    // modelos como DeepSeek-chat (8K). detalle truncado a 80 chars (era
    // 160). Esto elimina la mayoria de los 400 "context length exceeded".
    async function aiPatrones(historial) {
        if (!APP.config.iaHabilitada) return { error: 'IA deshabilitada' };
        if (!APP.config.iaApiKey) return { error: 'Falta API key' };
        const lista = Array.isArray(historial) ? historial : (APP.historial || []);
        if (lista.length < 10) return { error: 'Se necesitan al menos 10 avisos en el historial para buscar patrones.' };
        // v5.14.2: limite conservador para no reventar el context window.
        const max = clamp(Math.round(Math.max(15, (+APP.config.iaBatchMax || 25) * 2)), 15, 80);
        const muestra = lista.slice(0, max);
        const cacheKey = 'patrones:' + muestra.length + ':' + (muestra[0] ? muestra[0].ts : 0) + ':' +
            (muestra[muestra.length - 1] ? muestra[muestra.length - 1].ts : 0);
        const cacheHit = iaCacheGet(cacheKey);
        if (cacheHit) return cacheHit;
        const compact = muestra.map((a) => ({
            clave: a.clave,
            ts: new Date(a.ts).toISOString(),
            sev: a.sev,
            regla: a.regla,
            eco: a.eco || '',
            titulo: a.titulo,
            detalle: (a.detalle || '').slice(0, 80)
        }));
        // v5.14.2: solo mandamos defaults (no descripciones largas) para
        // que la IA sepa los valores actuales; los rangos validos los
        // tiene en el system prompt.
        const cf = APP.config || {};
        const defaults = DEFAULTS || {};
        const params = ['pollMs', 'offlineMin', 'gpsMin', 'stopMin', 'zonaMin', 'descoMin',
            'velMax', 'cooldownMin', 'desvioM', 'desvioMin', 'retornoM', 'retornoPct',
            'giroGrados', 'giroMin', 'demoraBaseMin', 'paradaMin', 'partidaHoras'];
        const parametrosActuales = {};
        for (const k of params) parametrosActuales[k] = cf[k] != null ? cf[k] : defaults[k];
        const ctx = {
            total: muestra.length,
            ventana: compact.length > 1 ? { desde: compact[compact.length - 1].ts, hasta: compact[0].ts } : null,
            unidadesVigiladas: (APP.unidades || []).filter((u) => { try { return shouldWatch(u); } catch (_) { return false; } }).length,
            parametrosActuales,
            alertas: compact
        };
        const r = await aiLlamarProveedorPrompt(IA_SYSTEM_PATRONES, ctx);
        // v5.14.2: si el proveedor devolvio JSON malformado pero contiene
        // texto util, intentamos extraer las listas basicas por regex.
        if (r && r.error && /JSON parseable/i.test(String(r.error))) {
            const reparado = extraerPatronesDeTexto(r.raw);
            if (reparado) {
                r.reparadoDeTexto = true;
                return { patrones: reparado.patrones || [], sugerencias: reparado.sugerencias || [] };
            }
        }
        // aiLlamarProveedorPrompt devuelve {texto} cuando no logra parsear
        // el JSON; antes el fallback de arriba quedaba inalcanzable y la UI
        // decia "sin patrones" aunque el modelo si los hubiera dado.
        if (r && !r.error && !Array.isArray(r.patrones) && !Array.isArray(r.sugerencias) && (r.texto || r.raw)) {
            const reparado = extraerPatronesDeTexto(String(r.texto || r.raw || ''));
            if (reparado) {
                const out = {
                    patrones: reparado.patrones || [],
                    sugerencias: reparado.sugerencias || [],
                    reparadoDeTexto: true
                };
                iaCacheSet(cacheKey, out);
                return out;
            }
        }
        if (r && !r.error) iaCacheSet(cacheKey, r);
        return r;
    }
    // Extrae el primer objeto/array JSON de una respuesta de IA aunque
    // venga con prosa, bloques markdown o comas finales. Devuelve el valor
    // parseado o null. Es la unica pieza que decide si una respuesta es
    // JSON estructurado; el texto libre (resumenes) se maneja aparte.
    function rxParseJSON(texto) {
        if (texto == null) return null;
        let s = String(texto).trim();
        if (!s) return null;
        // 1) Bloque markdown ```json ... ``` en cualquier posicion.
        const fence = s.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
        if (fence && fence[1]) s = fence[1].trim();
        // 2) Intento directo.
        try { return JSON.parse(s); } catch (_) { /* seguimos */ }
        // 3) Recorte al primer {/[ y al ultimo }/].
        const ini = s.search(/[\{\[]/);
        const fin = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
        if (ini >= 0 && fin > ini) s = s.slice(ini, fin + 1);
        try { return JSON.parse(s); } catch (_) { /* seguimos */ }
        // 4) Ultimo intento: comas finales y comillas tipograficas.
        const suave = s
            .replace(/,\s*([\}\]])/g, '$1')
            .replace(/[\u201c\u201d]/g, '"')
            .replace(/[\u2018\u2019]/g, "'");
        try { return JSON.parse(suave); } catch (_) { return null; }
    }
    // v5.14.2: fallback regex cuando el proveedor devuelve texto libre
    // en vez de JSON estricto. Busca "parametro": "X", "valor_sugerido": Y.
    function extraerPatronesDeTexto(texto) {
        if (!texto || typeof texto !== 'string') return null;
        // Sugerencias: "parametro" + "valor_sugerido" en el mismo bloque.
        const sugRegex = /"parametro"\s*:\s*"([a-zA-Z]+)"[\s\S]{0,200}?"valor_sugerido"\s*:\s*([0-9.]+)/g;
        const sugerencias = [];
        let m;
        while ((m = sugRegex.exec(texto)) !== null) {
            sugerencias.push({ parametro: m[1], valor_sugerido: parseFloat(m[2]), motivo: '(extraido de texto libre)' });
        }
        // Patrones: cualquier bloque "descripcion" con texto de mas de 20 chars.
        const patRegex = /"descripcion"\s*:\s*"([^"]{20,200})"/g;
        const patrones = [];
        while ((m = patRegex.exec(texto)) !== null) {
            patrones.push({ tipo: 'observado', descripcion: m[1], evidencia: [] });
            if (patrones.length >= 10) break;
        }
        if (!sugerencias.length && !patrones.length) return null;
        return { patrones, sugerencias };
    }

    // v5.14.3: dialogo de error estandar para llamadas IA (usado por
    // aiPatronesUI y aiAnalizarLoteUI). Antes v5.14.2 era un bloque
    // inline que se repetia; ahora vive aqui y muestra: detalle del
    // error, pista contextual por tipo de error, endpoint que se
    // intento, tips especificos del proveedor y un boton "Cambiar a
    // DeepSeek" para los proveedores problematicos (Kimi/Moonshot).
    function mostrarDialogoErrorIA(r, contexto) {
        const errTxt = String((r && r.error) || 'error desconocido');
        const prov = (IA_PROVEEDORES || {})[APP.config.iaProveedor] || {};
        const provNombre = prov.nombre || APP.config.iaProveedor || '(sin proveedor)';
        const endpoint = String(APP.config.iaEndpoint || '').trim() || prov.endpoint || '';
        // Pista contextual segun el tipo de error.
        let pista = '';
        if (/context length|too long|max tokens/i.test(errTxt)) {
            pista = 'El prompt + alertas exceden el limite del modelo. Prueba con un modelo mas grande (moonshot/kimi-k2.6, nvidia/llama-3.1-70b) o baja "Max avisos por analisis en lote" en Ajustes > IA.';
        } else if (/401|403/.test(errTxt)) {
            pista = 'La API key no corresponde a este proveedor/modelo. Cambia de proveedor en Ajustes > IA o corrige la key.';
        } else if (/429/.test(errTxt)) {
            pista = 'Limite de uso del proveedor alcanzado. Espera o cambia a otro proveedor.';
        } else if (/400/.test(errTxt)) {
            pista = 'El modelo rechazo un parametro (revisa Temperatura/Max tokens o el modelo elegido).';
        } else if (/JSON|no-JSON|parseable/i.test(errTxt)) {
            pista = 'La IA devolvio texto que no se pudo parsear como JSON. Problema del modelo, no de Rondo. Reintentar suele funcionar.';
        } else if (/timeout|red/i.test(errTxt)) {
            pista = 'Timeout o fallo de red. Verifica tu conexion, sube "Timeout" en Ajustes > IA o prueba con otro proveedor.';
        }
        // Tips especificos por proveedor.
        const tipsPorProv = {
            kimi: 'Kimi for Coding (kimi.com/code) usa el endpoint /coding/v1 con keys kimi-... Si te da timeout, prueba con Moonshot (sk-...) o DeepSeek (sk-...) que suelen ser mas estables.',
            moonshot: 'Moonshot (platform.moonshot.ai) usa el endpoint /v1 con keys sk-... Si te da timeout o 404, prueba con DeepSeek que tiene baja latencia.',
            nvidia: 'NVIDIA NIM requiere API key nvapi-... y tiene rate limits por minuto. Si te da 429, espera un minuto.',
            deepseek: 'DeepSeek suele ser el mas estable. Si te da error, prueba subiendo "Timeout" en Ajustes > IA o reduciendo "Max avisos".',
            minimax: 'MiniMax (platform.minimax.io) es estable y rapido. Si te da error de modelo, prueba con deepseek-chat o moonshot/kimi-k2.6.'
        };
        const provKey = String(APP.config.iaProveedor || '').toLowerCase();
        const tipProv = tipsPorProv[provKey] || '';
        // Sugerencias de proveedores alternativos (muestra los 3 mas
        // fiables: deepseek, minimax, nvidia). Si el actual YA es uno
        // de ellos, sugiere los otros dos.
        const fiables = ['deepseek', 'minimax', 'nvidia'].filter((k) => k !== provKey);
        const sugerenciasHTML = fiables.length ? '<div style="margin:8px 0;display:flex;gap:6px;flex-wrap:wrap">' +
            '<span style="font-size:11.5px;color:var(--rondo-fg-dim);margin-right:4px">Probar con:</span>' +
            fiables.map((k) => {
                const p = (IA_PROVEEDORES || {})[k] || {};
                return '<button type="button" class="mini rondo-ia-cambiar-prov" data-prov="' + esc(k) + '" style="font-size:11px" title="' + esc(p.nota || '') + '">' + esc(p.nombre || k) + '</button>';
            }).join('') + '</div>' : '';
        abrirDialogo({
            titulo: contexto || 'Error al llamar a la IA',
            html: '<div style="text-align:left;font-size:12.5px;line-height:1.45">' +
                '<div style="margin:0 0 6px"><b>Proveedor:</b> ' + esc(provNombre) + '</div>' +
                (endpoint ? '<div style="margin:0 0 8px;font-family:monospace;font-size:11px;color:var(--rondo-fg-dim);word-break:break-all;background:var(--rondo-bg-soft);padding:4px 6px;border-radius:4px">' + esc(endpoint) + '</div>' : '') +
                '<div style="margin:0 0 8px"><b>Detalle:</b> ' + esc(errTxt) + '</div>' +
                (pista ? '<div style="margin:0 0 8px;padding:6px 8px;border-left:3px solid var(--rondo-accent-2);background:var(--rondo-bg-soft);border-radius:3px"><b>Sugerencia:</b> ' + esc(pista) + '</div>' : '') +
                (tipProv ? '<div style="margin:0 0 8px;font-size:11.5px;color:var(--rondo-fg-dim)"><b>Sobre este proveedor:</b> ' + esc(tipProv) + '</div>' : '') +
                (sugerenciasHTML) +
                (r.raw ? '<details style="margin-top:6px"><summary style="cursor:pointer;color:var(--rondo-fg-dim);font-size:11.5px">Respuesta cruda del modelo</summary>' +
                    '<pre style="font-size:10.5px;background:var(--rondo-bg-soft);padding:6px;border-radius:4px;overflow:auto;max-height:180px;margin:6px 0 0;white-space:pre-wrap">' + esc(String(r.raw).slice(0, 1500)) + '</pre></details>' : '') +
                '</div>',
            cancelText: 'Cerrar',
            okText: 'Cerrar',
            onOk: () => {},
            ancho: 580,
            onOpen: (el) => {
                el.querySelectorAll('.rondo-ia-cambiar-prov').forEach((b) => {
                    b.addEventListener('click', () => {
                        const nuevo = b.dataset.prov;
                        if (!nuevo || !(nuevo in (IA_PROVEEDORES || {}))) return;
                        APP.config.iaProveedor = nuevo;
                        writeJSON(LS.cfg, APP.config);
                        const sel = byId('c-ia-prov');
                        if (sel) sel.value = nuevo;
                        actualizarNotaProveedorIA();
                        adviceOk('Proveedor cambiado a ' + ((IA_PROVEEDORES[nuevo] || {}).nombre || nuevo),
                            'Vuelve a pulsar "Detectar patrones" o "Probar conexion" para verificar.');
                        cerrarDialogo();
                    });
                });
            }
        });
    }

    // v5.14: aplica una sugerencia puntual al config (con confirmacion).
    // Se llama desde aiPatronesUI cuando el operador pulsa "Aplicar" en
    // una sugerencia concreta del dialogo de patrones.
    function aplicarSugerenciaIA(s) {
        if (!s || !s.parametro) return;
        const cf = APP.config || {};
        // hasOwnProperty (no `in`) para no aceptar claves heredadas como
        // "__proto__" o "constructor" que la IA pudiera devolver.
        if (!Object.prototype.hasOwnProperty.call(cf, s.parametro)) {
            adviceErr('Parametro desconocido', s.parametro + ' no existe en la configuracion de Rondo.');
            return;
        }
        const v = Number(s.valor_sugerido);
        if (!isFinite(v)) {
            adviceErr('Valor invalido', 'valor_sugerido no es numerico: ' + s.valor_sugerido);
            return;
        }
        const antes = cf[s.parametro];
        cf[s.parametro] = v;
        writeJSON(LS.cfg, cf);
        adviceOk('Sugerencia aplicada', s.parametro + ': ' + antes + ' -> ' + v);
        // Re-pintar contadores / lista de avisos por si cambia algo visible.
        paintCounters();
        if (APP.tab === 'alertas') paintAlertas();
    }

    // Wrapper de aiLlamarProveedor que permite pasar un system prompt
    // alternativo (lote / resumen). Mantiene el resto de la logica
    // (endpoint, key, temperature, max_tokens, 401/404/429/400) intacta.
    async function aiLlamarProveedorPrompt(systemPrompt, contexto) {
        const cfg = APP.config || {};
        if (!cfg.iaHabilitada) return { error: 'IA deshabilitada. Activala en Ajustes > IA.' };
        if (!cfg.iaApiKey) return { error: 'Falta la API key. Pegala en Ajustes > IA.' };
        // v5.14: respeta el tope diario para no agotar la cuota del proveedor.
        if (iaLimiteExcedido()) {
            const hoy = iaContadorHoy();
            return { error: 'Limite diario de IA alcanzado (' + (hoy.llamadas || 0) + '/' +
                (+cfg.iaLimiteDiario || 200) + '). Sube "Limite diario" en Ajustes > IA o espera a manana.' };
        }
        const prov = IA_PROVEEDORES[cfg.iaProveedor];
        if (!prov) return { error: 'Proveedor IA desconocido: ' + cfg.iaProveedor };
        const endpoint = String(cfg.iaEndpoint || '').trim() || prov.endpoint;
        if (!endpoint) return { error: 'Falta el endpoint del proveedor. Rellenalo en Ajustes > IA.' };
        const modelo = cfg.iaModelo && String(cfg.iaModelo).trim() ? cfg.iaModelo : prov.modelo;
        if (!modelo) return { error: 'Falta el modelo. Rellenalo en Ajustes > IA.' };
        const body = {
            model: modelo,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Contexto (JSON):\n' + JSON.stringify(contexto, null, 0) }
            ],
            stream: false
        };
        if (cfg.iaTemperature !== '' && cfg.iaTemperature != null && isFinite(Number(cfg.iaTemperature))) {
            body.temperature = Number(cfg.iaTemperature);
        }
        if (cfg.iaMaxTokens !== '' && cfg.iaMaxTokens != null && isFinite(Number(cfg.iaMaxTokens))) {
            body.max_tokens = Math.max(64, Math.min(4000, Number(cfg.iaMaxTokens)));
        }
        const headers = { 'Content-Type': 'application/json' };
        headers[prov.headerAuth || 'Authorization'] = (prov.prefijo || 'Bearer ') + cfg.iaApiKey;
        const ms = Math.max(2000, (+cfg.iaTimeoutS || 25) * 1000);
        const res = await httpRequest({
            method: 'POST',
            url: endpoint,
            headers: headers,
            body: JSON.stringify(body),
            timeoutMs: ms
        });
        // v5.14: contabiliza la llamada (OK o error) para el tope diario.
        const exito = res && !res.red && res.ok;
        iaContadorSumar(exito);
        if (res.red) {
            const gm = !!gmXhr();
            return {
                error: 'No se pudo contactar ' + prov.nombre + ' (' + (res.timeout ? 'timeout' : 'fallo de red') + ')' +
                    ' [transporte=' + (gm ? 'GM' : 'fetch') + ']' +
                    (gm ? '. Revisa el endpoint.' : ' · CORS: activa GM_xmlhttpRequest o usa un gestor que lo soporte.')
            };
        }
        if (!res.ok) {
            let pista = '';
            if (res.status === 401 || res.status === 403) {
                pista = ' · Revisa que la API key corresponda a ' + prov.nombre +
                    ' (endpoint ' + endpoint + ')' + (prov.nota ? '. ' + prov.nota : '');
            } else if (res.status === 404) {
                pista = ' · La RUTA del endpoint no existe. ' + (prov.nota ? prov.nota + '. ' : '') +
                    'Endpoint actual: ' + endpoint + '.';
            } else if (res.status === 429) {
                pista = ' · Limite de uso alcanzado (rate limit). Espera un poco o cambia de proveedor.';
            } else if (res.status === 400) {
                pista = ' · El modelo rechazo un parametro (revisa Temperatura/Max tokens o el modelo elegido).';
            }
            return { error: prov.nombre + ' HTTP ' + res.status + pista + (res.texto ? ' · ' + res.texto : '') };
        }
        let data;
        try { data = JSON.parse(res.texto || '{}'); } catch (e) { return { error: 'Respuesta no-JSON de ' + prov.nombre }; }
        const txt = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!txt) return { error: 'Sin contenido en la respuesta de ' + prov.nombre, raw: data };
        // Parseo tolerante (markdown, prosa alrededor, comas finales).
        const j = rxParseJSON(String(txt));
        if (j !== null && typeof j === 'object') return j;
        // No era JSON: texto libre (resumen narrativo) o respuesta que no
        // pudimos interpretar. Devolvemos el texto para que la UI decida.
        return { texto: String(txt).slice(0, 4000) };
    }

    // Cache en memoria + sessionStorage con TTL. Clave -> {ts, valor}.
    // El TTL viene de APP.config.iaCacheTTL (s). Para reiniciarlo basta
    // con cambiar la version del script.
    // Se inicializa lazy para no romper los tests que cortan el codigo
    // entre marcadores (autoruta, etc.) y no tienen readSessionObject
    // en su closure.
    const IA_CACHE = (typeof readSessionObject === 'function') ? readSessionObject(SS.iaCache, {}, null) : {};
    function iaCacheGet(clave) {
        if (!clave) return null;
        const it = IA_CACHE[clave];
        if (!it) return null;
        const ttl = Math.max(60, (+APP.config.iaCacheTTL || 21600)) * 1000;
        if (!it.ts || (Date.now() - it.ts) > ttl) {
            delete IA_CACHE[clave];
            return null;
        }
        return it.valor;
    }
    function iaCacheSet(clave, valor) {
        if (!clave) return;
        IA_CACHE[clave] = { ts: Date.now(), valor };
        try { writeSession(SS.iaCache, IA_CACHE); } catch (_) { /* noop */ }
    }
    function iaCacheLimpiar() {
        for (const k of Object.keys(IA_CACHE)) delete IA_CACHE[k];
        try { writeSession(SS.iaCache, IA_CACHE); } catch (_) { /* noop */ }
    }

    // Contador diario de llamadas IA para evitar pasar el limite del
    // proveedor (gratis suelen capear 200-500/dia). Persiste en LS.
    const LS_iaContador = 'rondo.api.iaContador';
    function iaContadorHoy() {
        const hoy = new Date().toISOString().slice(0, 10);
        let c;
        try { c = JSON.parse(localStorage.getItem(LS_iaContador) || 'null'); } catch (_) { c = null; }
        if (!c || c.fecha !== hoy) return { fecha: hoy, llamadas: 0, errores: 0 };
        return c;
    }
    function iaContadorSumar(exito) {
        const hoy = new Date().toISOString().slice(0, 10);
        const c = iaContadorHoy();
        c.llamadas = (c.llamadas || 0) + 1;
        if (!exito) c.errores = (c.errores || 0) + 1;
        c.fecha = hoy;
        try { localStorage.setItem(LS_iaContador, JSON.stringify(c)); } catch (_) { /* noop */ }
        return c;
    }
    function iaLimiteExcedido() {
        const limite = +APP.config.iaLimiteDiario || 0;
        if (!limite) return false;
        return iaContadorHoy().llamadas >= limite;
    }

    // ── v5.14.6: chat con la IA ────────────────────────────────────────
    // Conversacion persistente en sessionStorage (se borra al cerrar
    // la pestaña). Mensajes: { role: 'user' | 'ia' | 'system', text, ts,
    // meta?: {provider, modelo, ms} }. Cada turno envia todo el
    // historial al proveedor con un system prompt que incluye contexto
    // actual de la flota (numero de unidades, alertas recientes, etc.)
    const CHAT_KEY = 'rondo.api.chat';
    // v5.14.8: base de conocimiento condensada de Rondo. Se inyecta en el
    // system prompt del chat para que la IA pueda responder dudas de uso
    // (que hace cada pestana, como activar una regla, atajos, etc.) ademas
    // de consultas sobre el estado de la flota.
    const RONDO_DOC = String.raw`RONDO — GUIA DE USO (resumen del manual)
Rondo es un userscript (Tampermonkey/Violentmonkey) que corre sobre AE-Track o Wialon Hosting. Anade vigilancia de flota: evalua reglas, notifica (voz, pitido, toasts, notificacion del navegador) y muestra un panel lateral con tabs. No envia datos a servidores propios; usa la API nativa de la plataforma y servicios publicos de OpenStreetMap.

PANEL (barra lateral a pantalla completa, lado y ancho configurables):
- Dashboard: salud de la flota, KPIs (en linea, sin senal, detenidas, en movimiento, en zonas, avisos hoy), unidades que requieren atencion, zonas con unidades, rutas activas, avisos recientes. Las tarjetas KPI son clicables y filtran.
- Unidades: tarjetas por unidad con estado, placa, velocidad, ultimo reporte, zona y ruta. Clic para abrir su ventana; clic derecho para mas opciones (planear ruta, geocerca, odometro, limite de velocidad, silenciar). Barra "Ordenar".
- Avisos: historial de alertas filtrable por severidad (criticas/altas/medias/bajas). Boton IA por aviso, boton "Analizar lote" (resumen + ranking) y "Avisos CSV".
- Rutas: seguimiento de rutas planificadas (progreso, distancia al trazado, ETA). Se planea con clic derecho sobre una unidad. En el editor multipunto la ventana se mueve (arrastra el encabezado) y se redimensiona (esquina inferior derecha); las sugerencias se recorren con flechas arriba/abajo y Enter; las paradas se reordenan arrastrando el asa.
- Zonas: dos vistas: Geocercas de la plataforma (unidades dentro) y Zonas de riesgo. Aqui se cargan las zonas de riesgo (URL/archivo/data:).
- Caravana: unidades cerca de una unidad lider (distancia firmada, sentido contrario, no vigiladas).
- Chat IA: consultas libres a la IA (solo si la IA esta habilitada con API key). La IA ve el estado de la flota.
- Riesgo: se ve dentro de Zonas (segmentado).

REGLAS DE ALERTA (se activan y ajustan en Ajustes > Reglas):
Sin senal (5 min), Reconecto, GPS perdido en marcha (15 min), Detenido (30 min, fuera de bases), Zona no prevista (20 min), Geocercas (entra/sale, inmediato), Destino (progreso >=95% o <400 m), Desconexion (25 min), Velocidad (110 km/h), Desvio de ruta (250 m durante 5 min), Giro en U (130 grados durante 3 min), Retorno/viaje cancelado (25% o 400 m), Perdio senal en zona de riesgo (critico), Aproximacion a zona de riesgo (predictiva, opcional), Detenida en geocerca (opcional).
Cooldown por unidad+regla (45 min por defecto). Se puede limitar a un horario. Las zonas tipo base (patio, cedis, taller) no generan "detenido".

AJUSTES (engranaje del panel):
- General: refresco (ms), umbral sin senal, cooldown, monitorear todas, abrir al caer, cargar geocercas, geocodificacion, historico.
- Reglas: umbrales + activacion de cada regla, zonas de riesgo (URL/formato/score/radio) y alerta predictiva.
- Avisos: voz (Web/StreamElements/Google), idioma y voz, pitido y volumen, notificacion del navegador, duracion de toasts, severidad minima, horario, editor de la lista vigilada.
- Visual: tema (oscuro/claro/auto), densidad, tamano de interfaz, color de acento, coordenadas, contornos.
- Ventanas: lado y ancho de la barra, ocultar al clic fuera, confirmacion al cerrar, botones de la barra.
- Rutas: OSRM/Overpass, trazado automatico, alertas de ruta.
- IA: habilitar, proveedor (DeepSeek, NVIDIA NIM, Kimi for Coding, Moonshot, MiniMax, Personalizado), API key, endpoint/modelo opcionales, temperatura, max tokens, radio de POIs, timeout, limite diario, max avisos por lote, botones Probar conexion, Detectar patrones y Borrar API key.
- Avanzado: buscar actualizaciones, perfiles de configuracion, exportar/importar config, probar avisos, limpiar historial, resets.

ATAJOS: Alt+1..6 cambia de tab (Dashboard..Caravana), Alt+P y Alt+L muestran/ocultan el panel, Alt+H pliega la barra, Esc cierra dialogos.

IA: opt-in. Se configura en Ajustes > IA con la API key del proveedor (solo se envia al endpoint del proveedor). El boton IA en cada aviso da un veredicto (falso_positivo/normal/sospechoso/critico). "Analizar lote" prioriza varios avisos. "Detectar patrones" propone ajustes de umbrales. El chat responde consultas libres y, si la pregunta menciona un economico, consulta por API su historial de 24 h y sus campos personalizados. El boton Ocultar (junto a Automatizar) oculta/muestra las ventanas de unidades abiertas sin cerrarlas.

POPULAR: los avisos criticos abren la ventana de la unidad (si esta activado). Las ventanas de unidad se resaltan con un contorno del color de la severidad. El odometro y el limite de velocidad se editan con clic derecho sobre la unidad.`;

    const CHAT_SYS = String.raw`Eres el asistente integrado de Rondo, un sistema de vigilancia de flotas de vehiculos en Mexico. Respondes en espanol, de forma concisa y profesional.

Tienes DOS fuentes de informacion:
1) El MANUAL DE RONDO (abajo): usalo para explicar como funciona el sistema, que hace cada pestana, como activar reglas, atajos, configuracion, etc. Si te preguntan "como hago X" o "que hace Y", responde con el manual.
2) El CONTEXTO DE LA FLOTA que se adjunta en cada mensaje del usuario (JSON). Es un snapshot EN VIVO de los datos de la plataforma. Campos:
   - unidadesEnAlcance, enLinea, sinSenal: conteos.
   - geocercasCargadas: si son false, "fuera de geocerca" NO es fiable (no se pudieron evaluar).
   - unidades[]: por unidad -> eco, placa, estado (online/offline), zona (nombre de la geocerca, null = fuera de toda geocerca), edadMin (minutos sin reportar), vel (km/h).
   - unidadesFueraDeGeocerca / ecosFueraDeGeocerca: unidades fuera de toda geocerca.
   - offlineFueraDeGeocerca: unidades SIN SENAL y fuera de geocerca (esta es la respuesta directa a "que unidades fuera de geocerca se desconectaron").
   - geocercas[]: TODAS las geocercas, cada una con su tipo (circulo/poligono/linea) y las unidades dentro.
   - zonasDeRiesgo: resumen (total/alto/medio/bajo) o null si no hay dataset.
   - municipiosCatalogo[] / municipiosRiesgoCatalogo[]: nombres de municipios cargados (OSM y de riesgo).
   - consultaUnidades[]: SOLO aparece si tu pregunta menciona economicos (numeros de 3 a 5 digitos). Por unidad -> camposPersonalizados (conductor, marca...), ultimas24h (km, velMax, movimientoMin, detenidoMin, paradas, primera/ultima posicion) y, si esta activado, reporteServidorHoy.
   - alertasHoy, porSeveridad: conteos de hoy.
   - ultimosAvisos[]: ultimos avisos con ts, sev, regla, eco, titulo y detalle (el detalle suele indicar la zona o "fuera de geocercas").
   - desconexionesHoy[]: avisos de sin senal/desconexion de hoy con su detalle (para correlacionar con la zona).
   - rutasActivas: numero de rutas planificadas.

Reglas:
- Se breve: 2-5 lineas salvo que pidan detalle.
- Si la pregunta menciona un economico, revisa consultaUnidades[] (historial de 24 h y campos personalizados); si no aparece ahi, di que esa unidad no esta en el alcance o no reporta en el periodo.
- Para datos concretos usa SOLO el contexto adjunto. Si el dato no esta (p.ej. historial de dias anteriores), dilo claramente y explica con que reporte/accion se obtendria.
- Si geocercasCargadas es false, NO afirmes que una unidad esta "fuera de geocerca": di que las geocercas no estan cargadas.
- Para dudas de uso, apóyate en el manual y da pasos concretos (ruta de menu incluida).
- NO inventes numeros, telefonos, direcciones exactas, coordenadas ni kilometrajes.
- Si no estas seguro, dilo honestamente.
- Para recomendaciones operativas, razona con el contexto.
- Usa listas o pasos solo cuando aporten claridad.
- Espanol Mexico, sin emojis.

=== MANUAL DE RONDO (contexto de uso) ===
` + RONDO_DOC;

    // Estado del chat: lista de mensajes (cargada de sessionStorage al inicio).
    let CHAT = { mensajes: [], cargando: false };
    function cargarChat() {
        try {
            const raw = sessionStorage.getItem(CHAT_KEY);
            if (!raw) return;
            const j = JSON.parse(raw);
            // Descarta entradas corruptas o con roles invalidos (una version
            // antigua pudo guardar algo que la API no acepta).
            if (j && Array.isArray(j.mensajes)) {
                CHAT.mensajes = j.mensajes.filter((m) => m && typeof m.text === 'string' &&
                    (m.role === 'user' || m.role === 'ia' || m.role === 'error' || m.role === 'system'));
            }
        } catch (_) { /* noop */ }
    }
    function guardarChat() {
        try {
            // Solo guardamos los ultimos 50 mensajes para no inflar LS.
            const slice = CHAT.mensajes.slice(-50);
            sessionStorage.setItem(CHAT_KEY, JSON.stringify({ mensajes: slice, ts: Date.now() }));
        } catch (_) { /* noop */ }
    }
    function limpiarChat() {
        CHAT.mensajes = [];
        try { sessionStorage.removeItem(CHAT_KEY); } catch (_) { /* noop */ }
        // v5.14.7: renderChatLog en vez de pintarChat, porque pintarChat
        // ya no re-renderiza el log si tiene hijos (para no parpadear).
        renderChatLog();
    }
    // Devuelve un resumen del estado actual de la flota para inyectar en
    // cada turno del system prompt. Asi la IA tiene contexto fresco
    // (numero de unidades, alertas del dia, ultimos avisos) sin que el
    // usuario tenga que explicarselo.
    function chatContextoFlota() {
        try {
            const ini = new Date(); ini.setHours(0, 0, 0, 0);
            const toda = !!APP.config.chatTodaFlota;
            // v5.14.7: si "Toda la flota" esta activo, contamos todas las
            // unidades que reportan; si no, solo las vigiladas (shouldWatch).
            const unidadesRaw = (APP.unidades || []).filter((u) => {
                if (toda) return true;
                try { return shouldWatch(u); } catch (_) { return false; }
            });
            const zonasCargadas = !!(APP.config.loadZones && (APP.zonas || []).length);
            const hoy = (APP.historial || []).filter((a) => a.ts >= ini.getTime());
            const ecos = new Set(unidadesRaw.map((u) => { try { return parseUnitName(u).eco; } catch (_) { return ''; } }));
            const hoyFiltrado = toda ? hoy : hoy.filter((a) => !a.eco || ecos.has(a.eco));
            const porSev = {};
            hoyFiltrado.forEach((a) => { porSev[a.sev] = (porSev[a.sev] || 0) + 1; });
            // v5.14.8: snapshot por unidad con su geocerca actual. La IA
            // puede responder "que unidades estan fuera de geocerca", "cuales
            // estan sin senal", "donde esta la unidad X", etc.
            const detalle = [];
            const offlineFuera = [];
            const fueraDeGeocerca = [];        // todas (online u offline)
            // v6.0.9: unidades agrupadas por geocerca (para la lista completa).
            const porZona = new Map();
            for (const u of unidadesRaw) {
                let info, st;
                try { info = parseUnitName(u); st = unitState(u); } catch (_) { continue; }
                const eco = info.eco || info.clave || String(info.id);
                // zona: nombre si esta dentro; '' si esta fuera (y hay
                // geocercas cargadas); null si no se pudo determinar.
                const zona = zonasCargadas ? (st.lat != null ? zoneAt(st.lat, st.lon) : '') : null;
                const online = !!st.online;
                const edad = isFinite(st.edadMin) ? Math.round(st.edadMin) : null;
                if (zona === '') {
                    fueraDeGeocerca.push(eco);
                    if (!online) offlineFuera.push(eco);
                } else if (zona) {
                    if (!porZona.has(zona)) porZona.set(zona, []);
                    porZona.get(zona).push(eco);
                }
                if (detalle.length < 80) {
                    // v5.15: contexto enriquecido por unidad: posicion,
                    // municipio, limite, odometro, plan de ruta y estado de
                    // reglas, para que la IA pueda asistir de verdad.
                    const r = rutaDe(info) || null;
                    const memoU = APP.memo[info.clave] || {};
                    const er = (r && st.lat != null && st.online) ? estadoRuta(info, st) : { estado: r ? 'SIN POSICION' : 'SIN RUTA' };
                    const odo = odometroDe(info);
                    const mun = (st.lat != null) ? municipioEn(st.lat, st.lon) : null;
                    const visitadas = (Array.isArray(memoU.llegadas)) ? memoU.llegadas.filter(Boolean).length : 0;
                    const paradaProg = (r && r.paradas && r.paradas.length) ? {
                        total: r.paradas.length,
                        visitadas: visitadas,
                        siguiente: (r.paradas[Math.min(r.paradas.length - 1, (+memoU.paradaActual || 0))] || {}).texto || null
                    } : null;
                    detalle.push({
                        eco, placa: info.placa || '',
                        estado: online ? 'online' : 'offline',
                        zona: zona || null,
                        municipio: (mun && mun.nombre) ? mun.nombre : null,
                        edadMin: edad,
                        vel: isFinite(st.vel) ? Math.round(st.vel) : 0,
                        curso: isFinite(st.curso) ? Math.round(st.curso) : null,
                        lat: st.lat != null ? +(+st.lat).toFixed(4) : null,
                        lon: st.lon != null ? +(+st.lon).toFixed(4) : null,
                        limite: limiteDe(info),
                        odometroKm: odo ? Math.round((+odo.m || 0) / 1000) : 0,
                        silenciada: APP.dismissed.has(eco),
                        detenidoMin: memoU.detenidoDesde ? Math.round((Date.now() / 1000 - memoU.detenidoDesde) / 60) : null,
                        ruta: r ? {
                            estado: er.estado,
                            modo: r.modo,
                            optimo: !!r.optimo,
                            circuito: !!r.circuito,
                            destino: r.destinoTexto || '',
                            km: Math.round((r.total || 0) / 1000),
                            progreso: er.snap ? Math.round(er.snap.progreso * 100) : null,
                            desviado: !!er.desviado,
                            parada: paradaProg
                        } : null
                    });
                }
            }
            let enLinea = 0;
            for (const u of unidadesRaw) {
                try { if (unitState(u).online) enLinea++; } catch (_) { /* noop */ }
            }
            // Geocercas de la plataforma con las unidades dentro de cada una.
            // Permite responder "que unidades hay en CEDIS Norte", "cuantas
            // geocercas tengo", etc.
            // v6.0.9: lista COMPLETA de geocercas (antes se recortaba a 40).
            // Se acota a un maximo alto por seguridad de tamano.
            const geocercasTodas = zonasCargadas ? (APP.zonas || []).map((z) => {
                const nom = z.n || z.nombre || ('Zona ' + z.id);
                return {
                    nombre: nom,
                    tipo: (z.t === 3 ? 'circulo' : (z.t === 2 ? 'poligono' : (z.t === 1 ? 'linea' : 'zona'))),
                    unidadesDentro: porZona.get(nom) || []
                };
            }) : [];
            const geocercasTotal = geocercasTodas.length;
            const geocercas = geocercasTodas.slice(0, 800);
            const geocercasTruncado = geocercasTotal > geocercas.length;
            // Zonas de riesgo cargadas (resumen).
            const riesgoResumen = (APP.riesgo && APP.riesgo.length) ? {
                total: APP.riesgo.length,
                alto: APP.riesgo.filter((z) => z.score >= 75).length,
                medio: APP.riesgo.filter((z) => z.score >= 40 && z.score < 75).length,
                bajo: APP.riesgo.filter((z) => z.score < 40).length
            } : null;
            // Ultimos avisos CON su detalle (que incluye la zona o "fuera de
            // geocercas"), para que la IA pueda correlacionar geocerca + evento.
            const ultimos = (APP.historial || []).filter((a) => toda || !a.eco || ecos.has(a.eco))
                .slice(0, 10).map((a) => ({
                    ts: new Date(a.ts).toISOString().slice(11, 16),
                    sev: a.sev, regla: a.regla, eco: a.eco, titulo: a.titulo,
                    detalle: (a.detalle || '').slice(0, 160)
                }));
            // Desconexiones de hoy con su contexto de zona (correlacion
            // directa con la pregunta del reporte).
            const desconexiones = hoyFiltrado.filter((a) => /offline|desconexion|riesgoSinSenal|gpsPerdido/i.test(a.regla || ''))
                .slice(0, 20).map((a) => ({
                    ts: new Date(a.ts).toISOString().slice(11, 16),
                    eco: a.eco, regla: a.regla, detalle: (a.detalle || '').slice(0, 160)
                }));
            const porRegla = {};
            hoyFiltrado.forEach((a) => { porRegla[a.regla] = (porRegla[a.regla] || 0) + 1; });
            const moviendo = detalle.filter((d) => d.estado === 'online' && d.vel > 1).length;
            const detenidas = detalle.filter((d) => d.estado === 'online' && d.vel <= 1).length;
            const velProm = (() => {
                const v = detalle.filter((d) => d.estado === 'online');
                return v.length ? Math.round(v.reduce((s, d) => s + d.vel, 0) / v.length) : 0;
            })();
            const rutasResumen = detalle.filter((d) => d.ruta).slice(0, 30).map((d) => Object.assign({ eco: d.eco }, d.ruta));
            const viajes = Object.keys(APP.viajes || {}).slice(0, 12).map((eco) => {
                const v = APP.viajes[eco] || {};
                return {
                    eco, km: v.distanciaKm || 0, paradas: (v.paradas || []).length,
                    cargo: !!v.cargo, llego: !!v.llego, regreso: !!v.regreso,
                    zonaPartida: v.zonaPartida || null
                };
            });
            const riesgoZonas = (APP.riesgo && APP.riesgo.length)
                ? APP.riesgo.slice().sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 15)
                    .map((z) => ({ id: z.id, estado: z.estado || '', municipio: z.municipio || '', score: z.score, radio_m: z.radio_m || 0 }))
                : [];
            const municipios = { osm: (APP.municipios || []).length, deRiesgo: (APP.municipiosRiesgo || []).length };
            // v6.0.9: catalogo de municipios (nombres) para que la IA pueda
            // ubicar destinos/preguntas por municipio. Acotado para no inflar.
            const municipiosCatalogo = (APP.municipios || []).slice(0, 600)
                .map((m) => String(m.nombre || '') + (m.estado ? ', ' + m.estado : ''));
            const municipiosRiesgoCatalogo = (APP.municipiosRiesgo || []).slice(0, 300).map((m) => String(m.nombre || ''));
            const configResumen = {
                cadenciaSeg: Math.round((APP.config.pollMs || 10000) / 1000),
                offlineMin: APP.config.offlineMin, gpsMin: APP.config.gpsMin,
                stopMin: APP.config.stopMin, zonaMin: APP.config.zonaMin,
                descoMin: APP.config.descoMin, velMax: APP.config.velMax, cooldownMin: APP.config.cooldownMin,
                desvioM: APP.config.desvioM, desvioMin: APP.config.desvioMin,
                retornoM: APP.config.retornoM, retornoPct: APP.config.retornoPct,
                giroGrados: APP.config.giroGrados, giroMin: APP.config.giroMin,
                desvioMunicipio: !!APP.config.desvioMunicipio, desvioMunicipioM: APP.config.desvioMunicipioM,
                paradaLlegadaM: APP.config.paradaLlegadaM,
                reglasActivas: Object.keys(APP.config.reglas || {}).filter((k) => APP.config.reglas[k]),
                horario: APP.config.horario
            };
            return {
                alcance: toda ? 'toda la flota' : 'solo unidades vigiladas',
                fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
                geocercasCargadas: zonasCargadas,
                unidadesEnAlcance: unidadesRaw.length,
                enLinea, sinSenal: unidadesRaw.length - enLinea,
                moviendo, detenidas, velocidadPromedio: velProm,
                unidadesFueraDeGeocerca: fueraDeGeocerca.length,
                ecosFueraDeGeocerca: fueraDeGeocerca.slice(0, 40),
                offlineFueraDeGeocerca: offlineFuera.slice(0, 40),
                alertasHoy: hoyFiltrado.length,
                porSeveridad: porSev,
                alertasPorRegla: porRegla,
                ultimosAvisos: ultimos,
                desconexionesHoy: desconexiones,
                geocercas,
                geocercasTotal,
                geocercasTruncado,
                zonasDeRiesgo: riesgoResumen,
                riesgoZonas,
                municipios,
                municipiosCatalogo,
                municipiosRiesgoCatalogo,
                rutasActivas: Object.keys(APP.rutas || {}).length,
                rutas: rutasResumen,
                viajes,
                configResumen,
                unidades: detalle
            };
        } catch (_) { return { fecha: new Date().toISOString().slice(0, 16).replace('T', ' ') }; }
    }
    // v6.0.9: datos ampliados por unidad para el chat. Detecta economicos
    // (3-5 digitos) mencionados en la pregunta y trae, solo para esos,
    // campos personalizados e historial de las ultimas 24 h. Todo lectura.
    function iaEcosEnTexto(texto) {
        const out = [];
        const vistos = new Set();
        const matches = String(texto || '').match(/\b\d{3,5}\b/g) || [];
        for (let i = 0; i < matches.length; i++) {
            const n = normEco(matches[i]);
            if (!n || vistos.has(n)) continue;
            vistos.add(n);
            const it = unitByEco(n);
            if (it) out.push(it);
            if (out.length >= 3) break;
        }
        return out;
    }
    const _iaUnidadCache = new Map(); // eco -> { t, datos }
    async function iaDatosUnidad(it) {
        const eco = it.info.eco || it.info.clave;
        const hit = _iaUnidadCache.get(eco);
        if (hit && (Date.now() - hit.t) < 45000) return hit.datos;
        const uid = it.u && it.u.id != null ? it.u.id : null;
        const datos = { eco: eco, nombre: it.info.nombre, placa: it.info.placa || null };
        try {
            if (APP.config.iaContextoAPI !== false) {
                const props = await iaFetchUnidadProps(uid, it.info.nombre);
                if (props && Object.keys(props).length) datos.camposPersonalizados = props;
                const hist = await iaFetchUnidadHistorial(uid, 24);
                if (hist) datos.ultimas24h = hist;
                if (APP.config.iaReporteServidor && uid != null) {
                    const rep = await iaFetchReporteDia(uid);
                    if (rep && rep.length) datos.reporteServidorHoy = rep;
                }
            }
        } catch (_) { /* devuelve lo basico */ }
        _iaUnidadCache.set(eco, { t: Date.now(), datos: datos });
        return datos;
    }
    async function iaContextoAmpliado(ultimoTexto) {
        const base = chatContextoFlota();
        try {
            if (APP.config.iaContextoAPI === false) return base;
            const its = iaEcosEnTexto(ultimoTexto);
            if (!its.length) return base;
            const detalle = [];
            for (let i = 0; i < its.length; i++) detalle.push(await iaDatosUnidad(its[i]));
            base.consultaUnidades = detalle;
            return base;
        } catch (_) { return base; }
    }
    // v5.14.7: el chat se renderiza de forma INCREMENTAL para no parpadear.
//   - pintarChat(): pinta la cabecera (provider) y, si no hay mensajes,
//     el empty state. NO toca el log si ya hay contenido.
//   - renderChatLog(): reconstruye el log entero (solo al limpiar o al
//     cargar el historial inicial).
//   - appendMensajeChat(m): anyade UN mensaje al final del log (sin
//     re-renderizar lo anterior). Devuelve el nodo creado.
//   - setChatTyping(on): muestra/oculta el indicador de escritura.
//   - scrollChatBottom(): lleva el scroll al fondo de forma suave si
//     el usuario ya estaba abajo; si ha scrolleado arriba, no lo mueve.
function chatMsgHTML(m) {
        const cls = m.role === 'user' ? 'user' : (m.role === 'system' ? 'system' : (m.role === 'error' ? 'ia error' : 'ia'));
        const meta = m.role === 'ia' ? '<div class="rondo-chat-meta">' +
            (m.meta && m.meta.ms != null ? Math.round(m.meta.ms / 100) / 10 + 's' : '') +
            (m.meta && m.meta.proveedor ? ' \u00b7 ' + esc(m.meta.proveedor) : '') +
            '</div>' : (m.role === 'user' ? '<div class="rondo-chat-meta">' +
            new Date(m.ts || Date.now()).toLocaleTimeString().slice(0, 5) + '</div>' : '');
        return '<div class="rondo-chat-msg ' + cls + '"><div class="rondo-chat-bubble">' +
            esc(m.text || '') + '</div>' + meta + '</div>';
    }
    function chatEmptyHTML() {
        return '<div class="rondo-chat-empty">' +
            '<span class="rondo-usym">' + UIS.robot + '</span>' +
            '<div>Preguntale algo a la IA. Ejemplos:</div>' +
            '<div style="opacity:.7;font-size:11.5px;line-height:1.5">' +
            '\u00bfCuantas unidades tengo sin senal ahora?<br>' +
            '\u00bfQue unidades llevan mas tiempo detenidas?<br>' +
            '\u00bfQue alerta critica es la mas urgente de revisar?' +
            '</div></div>';
    }
    function setChatTyping(on) {
        const log = byId('rondo-chat-log');
        if (!log) return;
        const el = log.querySelector('.rondo-chat-typing-msg');
        if (on && !el) {
            const wrap = makeEl('div', { className: 'rondo-chat-msg ia rondo-chat-typing-msg' });
            wrap.innerHTML = '<div class="rondo-chat-bubble">' +
                '<span class="rondo-chat-typing"><span></span><span></span><span></span></span></div>';
            log.appendChild(wrap);
            scrollChatBottom();
        } else if (!on && el) {
            if (el.parentNode) el.parentNode.removeChild(el);
        }
    }
    function scrollChatBottom() {
        const log = byId('rondo-chat-log');
        if (!log) return;
        // Solo autoscroll si ya estabamos cerca del fondo (no molestar
        // a quien esta leyendo mensajes antiguos).
        const lejos = log.scrollHeight - log.scrollTop - log.clientHeight;
        if (lejos < 120) log.scrollTop = log.scrollHeight;
    }
    function appendMensajeChat(m) {
        const log = byId('rondo-chat-log');
        if (!log) return;
        // Si el empty state estaba puesto, quitarlo.
        const vacio = log.querySelector('.rondo-chat-empty');
        if (vacio && vacio.parentNode) vacio.parentNode.removeChild(vacio);
        const wrap = makeEl('div');
        wrap.innerHTML = chatMsgHTML(m);
        const nodo = wrap.firstChild;
        log.appendChild(nodo);
        scrollChatBottom();
        return nodo;
    }
    function renderChatLog() {
        const log = byId('rondo-chat-log');
        if (!log) return;
        if (!CHAT.mensajes.length) log.innerHTML = chatEmptyHTML();
        else log.innerHTML = CHAT.mensajes.map(chatMsgHTML).join('');
        setChatTyping(!!CHAT.cargando);
        scrollChatBottom();
    }
    function pintarChat() {
        const log = byId('rondo-chat-log');
        if (!log) return;
        const provNombre = ((IA_PROVEEDORES || {})[APP.config.iaProveedor] || {}).nombre || APP.config.iaProveedor || '-';
        const provEl = byId('rondo-chat-prov');
        if (provEl) provEl.textContent = provNombre + (APP.config.iaModelo ? ' \u00b7 ' + APP.config.iaModelo : '');
        // Sincroniza el toggle de alcance (Toda la flota).
        const allEl = byId('rondo-chat-all');
        if (allEl) allEl.checked = !!APP.config.chatTodaFlota;
        // Si el log ya tiene el empty state o mensajes, no lo tocamos
        // (evita el parpadeo al cambiar de tab). Solo lo pintamos si
        // esta vacio del todo.
        if (log.children.length) return;
        renderChatLog();
    }
    // Llamada al proveedor para chat: envia todo el historial al
    // endpoint actual con CHAT_SYS + contexto de flota + mensajes.
    async function aiChatLlamar(mensajes, onChunk) {
        const cfg = APP.config || {};
        if (!cfg.iaHabilitada) return { error: 'IA deshabilitada' };
        if (!cfg.iaApiKey) return { error: 'Falta API key' };
        const prov = (IA_PROVEEDORES || {})[cfg.iaProveedor];
        if (!prov) return { error: 'Proveedor desconocido: ' + cfg.iaProveedor };
        const endpoint = String(cfg.iaEndpoint || '').trim() || prov.endpoint;
        const modelo = (cfg.iaModelo && String(cfg.iaModelo).trim()) || prov.modelo;
        if (!endpoint) return { error: 'Falta endpoint' };
        if (!modelo) return { error: 'Falta modelo' };
        if (iaLimiteExcedido()) {
            const hoy = iaContadorHoy();
            return { error: 'Limite diario alcanzado (' + (hoy.llamadas || 0) + '/' +
                (+cfg.iaLimiteDiario || 200) + ')' };
        }
        // Filtra los mensajes de error locales: la API solo acepta roles
        // system/user/assistant y el chat se rompia tras el primer fallo.
        const validos = (Array.isArray(mensajes) ? mensajes : []).filter((m) => m && m.role !== 'error');
        // v6.0.9: el contexto se amplia consultando la API para las unidades
        // mencionadas en la ultima pregunta (historial, propiedades...).
        const ultimo = validos.slice().reverse().find((m) => m.role === 'user');
        const contexto = await iaContextoAmpliado(ultimo ? ultimo.text : '');
        const messages = [
            { role: 'system', content: CHAT_SYS + '\n\nContexto actual de la flota:\n' +
                JSON.stringify(contexto, null, 0) },
            ...validos.map((m) => ({ role: m.role === 'ia' ? 'assistant' : m.role, content: m.text || '' }))
        ];
        const body = {
            model: modelo,
            messages,
            stream: false
        };
        if (cfg.iaTemperature !== '' && cfg.iaTemperature != null && isFinite(Number(cfg.iaTemperature))) {
            body.temperature = Number(cfg.iaTemperature);
        }
        if (cfg.iaMaxTokens !== '' && cfg.iaMaxTokens != null && isFinite(Number(cfg.iaMaxTokens))) {
            body.max_tokens = Math.max(64, Math.min(4000, Number(cfg.iaMaxTokens)));
        }
        const headers = { 'Content-Type': 'application/json' };
        headers[prov.headerAuth || 'Authorization'] = (prov.prefijo || 'Bearer ') + cfg.iaApiKey;
        const ms = Math.max(2000, (+cfg.iaTimeoutS || 25) * 1000);
        const t0 = Date.now();
        const res = await httpRequest({
            method: 'POST', url: endpoint, headers: headers,
            body: JSON.stringify(body), timeoutMs: ms
        });
        iaContadorSumar(res && !res.red && res.ok);
        if (res.red) return { error: 'Sin conexion (' + (res.timeout ? 'timeout' : 'red') + ')' };
        if (!res.ok) {
            let pista = '';
            if (res.status === 401 || res.status === 403) pista = 'API key invalida';
            else if (res.status === 429) pista = 'rate limit';
            else if (res.status === 404) pista = 'endpoint incorrecto';
            else if (res.status === 400) pista = 'parametros rechazados';
            return { error: 'HTTP ' + res.status + (pista ? ' \u00b7 ' + pista : '') + (res.texto ? ' \u00b7 ' + res.texto.slice(0, 200) : '') };
        }
        let data;
        try { data = JSON.parse(res.texto || '{}'); } catch (e) { return { error: 'Respuesta no-JSON' }; }
        const txt = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!txt) return { error: 'Sin contenido en la respuesta' };
        return { texto: String(txt), ms: Date.now() - t0, proveedor: prov.nombre };
    }
    async function chatEnviar() {
        const ta = byId('rondo-chat-input');
        const btn = byId('rondo-chat-send');
        if (!ta || !btn) return;
        const texto = String(ta.value || '').trim();
        if (!texto || CHAT.cargando) return;
        if (!APP.config.iaHabilitada || !APP.config.iaApiKey) {
            adviceWarn('IA no configurada', 'Activa la IA y mete tu API key en Ajustes > IA para usar el chat.');
            abrirCfg();
            const tab = document.querySelector('#rondo-cfg-tabs .cfg-tab[data-cfg="ia"]');
            if (tab) tab.click();
            return;
        }
ta.value = '';
        ta.style.height = 'auto';
        const userMsg = { role: 'user', text: texto, ts: Date.now() };
        CHAT.mensajes.push(userMsg);
        CHAT.cargando = true;
        btn.disabled = true;
        // v5.14.7: append incremental (no re-render completo) para que
        // el chat no parpadee. Mostramos el typing y anyadimos el
        // mensaje del usuario.
        appendMensajeChat(userMsg);
        setChatTyping(true);
        // Enviamos SOLO los ultimos 20 mensajes para mantener el
        // contexto manejable y no agotar tokens.
        const slice = CHAT.mensajes.slice(-20);
        const r = await aiChatLlamar(slice);
        CHAT.cargando = false;
        btn.disabled = false;
        setChatTyping(false);
        if (r.error) {
            const errMsg = { role: 'error', text: 'Error: ' + r.error, ts: Date.now() };
            CHAT.mensajes.push(errMsg);
            appendMensajeChat(errMsg);
        } else {
            const iaMsg = {
                role: 'ia', text: r.texto, ts: Date.now(),
                meta: { ms: r.ms, proveedor: r.proveedor }
            };
            CHAT.mensajes.push(iaMsg);
            appendMensajeChat(iaMsg);
        }
        guardarChat();
        // Foco de vuelta al input para escribir seguido.
        try { ta.focus(); } catch (_) { /* noop */ }
    }
    function paintTabsChat() {
        // Muestra la tab de chat solo si la IA esta habilitada y con API key.
        const tab = document.querySelector('#rondo-tabs .tab[data-tab="chat"]');
        if (!tab) return;
        const visible = !!(APP.config.iaHabilitada && APP.config.iaApiKey);
        tab.style.display = visible ? '' : 'none';
        if (!visible && APP.tab === 'chat') {
            // Si estaba abierta y se desactivo la IA, salta al dashboard.
            APP.tab = 'dash';
            const dashTab = document.querySelector('#rondo-tabs .tab[data-tab="dash"]');
            if (dashTab) dashTab.click();
        }
    }

    // Mini-probe de conexion (la pestana IA). Manda un ping corto y
    // devuelve texto listo para pintar en #c-ia-status.
    async function aiProbar() {
        const el = byId('c-ia-status');
        const set = (txt, ok) => { if (el) { el.textContent = txt; el.style.color = ok ? 'var(--rondo-ok-fg)' : 'var(--rondo-bad-fg)'; } };
        set('Probando...', true);
        // Eco fake: no se persiste en historial ni dispara reglas reales.
        const fake = { regla: 'test', sev: 'medio', eco: 'TEST-IA', clave: 'TEST-IA-' + Date.now(),
            titulo: 'Ping de conexion', detalle: 'Comprobando que el proveedor responde.' };
        const r = await aiAnalizar(fake);
        if (r.error) { set('ERROR: ' + r.error, false); return false; }
        const provNombre = (IA_PROVEEDORES[APP.config.iaProveedor] || {}).nombre || APP.config.iaProveedor;
        set('OK · ' + provNombre + ' respondio · veredicto=' + (r.veredicto || '?') +
            ' · confianza=' + (r.confianza != null ? r.confianza : '?'), true);
        return true;
    }

    // Pinta el boton de IA de la cabecera segun el estado:
    //   - sin API key: oculto (no se puede usar)
    //   - key + desactivada: robot atenuado + punto ambar ("disponible")
    //   - key + activa: robot + check verde ("activa")
    // El boton sirve para activar/desactivar la IA (analisis en Avisos)
    // y, en el estado sin key, abre Ajustes > IA.
    function paintIASwitch() {
        const b = byId('rondo-ia');
        if (!b) return;
        const cfg = APP.config || {};
        const tieneKey = !!(cfg.iaApiKey && String(cfg.iaApiKey).trim());
        const activa = !!cfg.iaHabilitada && tieneKey;
        if (!tieneKey) {
            b.style.display = 'none';
            b.setAttribute('aria-pressed', 'false');
            return;
        }
        b.style.display = '';
        b.setAttribute('aria-pressed', activa ? 'true' : 'false');
        b.classList.toggle('ia-on', activa);
        b.classList.toggle('ia-off', !activa);
        const prov = (IA_PROVEEDORES[cfg.iaProveedor] || {}).nombre || cfg.iaProveedor || '';
        b.title = activa
            ? 'IA activa (' + prov + ') · analiza los avisos · clic para desactivar'
            : 'IA disponible pero desactivada (' + prov + ') · clic para activar';
    }
    // v5.14: muestra/oculta el boton "Analizar lote" segun si la IA esta
    // activa y hay avisos. Se llama desde paintAlertas y tras cambios de
    // config (paintIASwitch, borrar key, etc).
    function paintIABatchBtn() {
        const bar = byId('rondo-ia-bar');
        const cfg = APP.config || {};
        const ok = !!(cfg.iaHabilitada && cfg.iaApiKey);
        const hay = (APP.historial || []).length > 0;
        if (bar) bar.style.display = ok ? '' : 'none';
        const b = byId('rondo-ia-batch');
        if (b) { b.disabled = !hay; b.style.opacity = hay ? '' : '.55'; }
        const f = byId('rondo-ia-flota');
        if (f) f.disabled = false;
    }
    // v5.14: pinta el contador de uso diario en la pestana IA.
    function paintIAUso() {
        const el = byId('c-ia-uso');
        if (!el) return;
        const cfg = APP.config || {};
        const c = iaContadorHoy();
        const lim = +cfg.iaLimiteDiario || 0;
        const txt = 'Hoy: ' + (c.llamadas || 0) + ' llamada(s)' + (lim ? ' / ' + lim + ' (limite diario)' : ' (sin limite)') +
            (c.errores ? ' · ' + c.errores + ' con error' : '');
        el.textContent = txt;
        el.style.color = (lim && (c.llamadas || 0) >= lim) ? 'var(--rondo-bad-fg)' : 'var(--rondo-fg-dim)';
    }
    // v5.14: dispara el analisis en lote desde la UI y muestra el
    // resultado (resumen + ranking) en un dialogo. Manda hasta
    // APP.config.iaBatchMax avisos actuales.
    async function aiAnalizarLoteUI() {
        const cfg = APP.config || {};
        if (!cfg.iaHabilitada || !cfg.iaApiKey) {
            adviceWarn('IA deshabilitada', 'Activala y mete tu API key en Ajustes > IA.');
            abrirCfg();
            const tab = document.querySelector('#rondo-cfg-tabs .cfg-tab[data-cfg="ia"]');
            if (tab) tab.click();
            return;
        }
        const btn = byId('rondo-ia-batch');
        setBusy(btn, true);
        try {
            // Mezcla las alertas del dia con las ultimas del historial para
            // llegar al menos a iaBatchMax aunque el dia este tranquilo.
            const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
            const hoy = APP.historial.filter((a) => a.ts >= inicio.getTime());
            const muestra = hoy.length >= cfg.iaBatchMax ? hoy : APP.historial.slice(0, cfg.iaBatchMax);
            if (!muestra.length) {
                advice('Sin avisos', 'Todavia no hay avisos para analizar.');
                return;
            }
            const r = await aiAnalizarLote(muestra);
            paintIAUso();
            // v5.14.3: dialog rico con endpoint + tips + cambio rapido.
            if (r.error) {
                mostrarDialogoErrorIA(r, 'Error al analizar lote');
                return;
            }
            // Construye el HTML del resultado: resumen ejecutivo + ranking.
            const colores = { falso_positivo: '#2e7d32', normal: '#1565c0', sospechoso: '#e65100', critico: '#b71c1c' };
            const ranking = Array.isArray(r.ranking) ? r.ranking : [];
            const recos = Array.isArray(r.recomendaciones) ? r.recomendaciones : [];
            const provNombre = (IA_PROVEEDORES[APP.config.iaProveedor] || {}).nombre || APP.config.iaProveedor;
            const sevCount = muestra.reduce((m, a) => { m[a.sev] = (m[a.sev] || 0) + 1; return m; }, {});
            const sevTxt = ['critico', 'alto', 'medio', 'bajo'].filter((s) => sevCount[s])
                .map((s) => sevCount[s] + ' ' + s).join(' \u00b7 ');
            const html =
                '<div style="text-align:left;font-size:12.5px;line-height:1.45">' +
                '<div style="color:var(--rondo-fg-dim);margin-bottom:6px">Proveedor: <b>' + esc(provNombre) + '</b>' +
                ' \u00b7 ' + muestra.length + ' aviso(s)' + (sevTxt ? ' (' + esc(sevTxt) + ')' : '') + '</div>' +
                (r.resumen ? '<div style="margin:0 0 10px"><b>Resumen:</b> ' + esc(r.resumen) + '</div>' : '') +
                (ranking.length ? '<div style="margin:0 0 10px"><b>Ranking:</b><ol style="margin:4px 0 0 18px;padding:0">' +
                    ranking.map((it) => {
                        const c = colores[String(it.veredicto || '')] || '#555';
                        return '<li style="margin-bottom:4px"><b style="color:' + c + '">' + esc(String(it.veredicto || '?').toUpperCase().replace('_', ' ')) + '</b>' +
                            ' · ' + esc(it.motivo || '') +
                            ' <span style="color:var(--rondo-fg-dim);font-size:11px">(' + esc(it.clave || '?') + ' · conf ' + (it.confianza != null ? it.confianza : '?') + ')</span></li>';
                    }).join('') + '</ol></div>' : '') +
                (recos.length ? '<div><b>Recomendaciones:</b><ul style="margin:4px 0 0 18px;padding:0">' +
                    recos.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '') +
                '</div>';
            abrirDialogo({
                titulo: 'Analisis en lote · ' + muestra.length + ' avisos',
                html: html,
                cancelText: 'Cerrar',
                okText: 'Cerrar',
                onOk: () => {},
                ancho: 520
            });
        } finally {
            setBusy(btn, false);
        }
    }

    // v5.15: revision proactiva de la flota con IA. Muestra en un dialogo
    // el resumen, las unidades que requieren atencion y los riesgos.
    async function aiFlotaUI() {
        const cfg = APP.config || {};
        if (!cfg.iaHabilitada || !cfg.iaApiKey) {
            adviceWarn('IA deshabilitada', 'Activala y mete tu API key en Ajustes > IA.');
            abrirCfg();
            const tab = document.querySelector('#rondo-cfg-tabs .cfg-tab[data-cfg="ia"]');
            if (tab) tab.click();
            return;
        }
        const btn = byId('rondo-ia-flota');
        setBusy(btn, true);
        try {
            const r = await aiAnalizarFlota();
            paintIAUso();
            if (r.error) { mostrarDialogoErrorIA(r, 'Error al analizar la flota'); return; }
            const atencion = Array.isArray(r.atencion) ? r.atencion : [];
            const riesgos = Array.isArray(r.riesgos) ? r.riesgos : [];
            const recos = Array.isArray(r.recomendaciones) ? r.recomendaciones : [];
            const colores = { critica: '#b71c1c', alta: '#e65100', media: '#f9a825' };
            const provNombre = (IA_PROVEEDORES[APP.config.iaProveedor] || {}).nombre || APP.config.iaProveedor;
            const html =
                '<div style="text-align:left;font-size:12.5px;line-height:1.45">' +
                '<div style="color:var(--rondo-fg-dim);margin-bottom:6px">Proveedor: <b>' + esc(provNombre) + '</b>' +
                (atencion.length ? ' \u00b7 ' + atencion.length + ' unidad(es) por atender' : '') + '</div>' +
                (r.resumen ? '<div style="margin:0 0 10px"><b>Resumen:</b> ' + esc(r.resumen) + '</div>' : '') +
                (atencion.length ? '<div style="margin:0 0 10px"><b>Requieren atencion:</b><ol style="margin:4px 0 0 18px;padding:0">' +
                    atencion.map((it) => {
                        const c = colores[String(it.prioridad || '').toLowerCase()] || '#555';
                        return '<li style="margin-bottom:5px"><b style="color:' + c + '">' + esc(String(it.prioridad || '?').toUpperCase()) + '</b>' +
                            ' \u00b7 <b>' + esc(it.eco || '') + '</b> \u00b7 ' + esc(it.motivo || '') +
                            (it.accion ? '<div style="color:var(--rondo-fg-dim);font-size:11.5px;margin-left:2px">\u2192 ' + esc(it.accion) + '</div>' : '') +
                            '</li>';
                    }).join('') + '</ol></div>' : '') +
                (riesgos.length ? '<div style="margin:0 0 10px"><b>Riesgos:</b><ul style="margin:4px 0 0 18px;padding:0">' +
                    riesgos.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '') +
                (recos.length ? '<div><b>Recomendaciones:</b><ul style="margin:4px 0 0 18px;padding:0">' +
                    recos.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '') +
                '</div>';
            abrirDialogo({
                titulo: 'Monitor de flota \u00b7 IA',
                html: html,
                cancelText: 'Cerrar',
                okText: 'Cerrar',
                onOk: () => {},
                ancho: 540
            });
        } finally {
            setBusy(btn, false);
        }
    }

    // v5.14: deteccion de patrones en la bitacora. Envia las ultimas
    // N alertas (50..200) al proveedor con un prompt que pide patrones
    // recurrentes y sugerencias de ajuste de parametros. Las sugerencias
    // se pueden aplicar con un click (con confirmacion previa).
    async function aiPatronesUI() {
        const cfg = APP.config || {};
        if (!cfg.iaHabilitada || !cfg.iaApiKey) {
            adviceWarn('IA deshabilitada', 'Activala y mete tu API key en Ajustes > IA.');
            abrirCfg();
            const tab = document.querySelector('#rondo-cfg-tabs .cfg-tab[data-cfg="ia"]');
            if (tab) tab.click();
            return;
        }
        const btn = byId('c-ia-patrones');
        setBusy(btn, true);
        try {
            const r = await aiPatrones(APP.historial || []);
            // Por si aiPatrones reventara con un error no controlado
            // (p.ej. la IA devuelve un JSON valido pero con campos
            // inesperados que rompen aiPatronesUI), mostramos el error
            // en un dialogo en lugar de un toast.
            paintIAUso();
            // v5.14.2: en vez de un toast generico, abrimos un dialogo
            // con el error completo y pistas. Asi el operador sabe si
            // es un 400 (context length), 401 (key mala), 429 (rate
            // limit) o un parseo de JSON fallido.
            if (r.error) {
                mostrarDialogoErrorIA(r, 'Error al detectar patrones');
                return;
            }
            const patrones = Array.isArray(r.patrones) ? r.patrones : [];
            const sugerencias = Array.isArray(r.sugerencias) ? r.sugerencias : [];
            const provNombre = (IA_PROVEEDORES[APP.config.iaProveedor] || {}).nombre || APP.config.iaProveedor;
            const reparadoDeTexto = !!r.reparadoDeTexto;
            if (!patrones.length && !sugerencias.length) {
                abrirDialogo({
                    titulo: 'Patrones en la bitacora',
                    html: '<div style="font-size:12.5px">La IA no encontro patrones ni sugerencias con los datos actuales. ' +
                        'Esto suele pasar cuando hay pocos avisos o cuando los parametros ya son razonables.</div>',
                    cancelText: 'Cerrar',
                    okText: 'Cerrar',
                    onOk: () => {},
                    ancho: 480
                });
                return;
            }
            // Indice estable para poder identificar cada sugerencia al aplicar.
            const html =
                '<div style="text-align:left;font-size:12.5px;line-height:1.45">' +
                '<div style="color:var(--rondo-fg-dim);margin-bottom:6px">Proveedor: <b>' + esc(provNombre) + '</b>' +
                ' · ' + APP.historial.length + ' avisos en bitacora</div>' +
                (patrones.length ? '<div style="margin:0 0 10px"><b>Patrones observados:</b><ol style="margin:4px 0 0 18px;padding:0">' +
                    patrones.map((p) => '<li style="margin-bottom:5px"><b>[' + esc(String(p.tipo || '?')) + ']</b> ' +
                        esc(p.descripcion || '') +
                        (p.evidencia && p.evidencia.length ? '<div style="color:var(--rondo-fg-dim);font-size:11px;margin-top:2px">Evidencia: ' +
                            p.evidencia.slice(0, 5).map((e) => '<code>' + esc(String(e).slice(0, 40)) + '</code>').join(', ') + '</div>' : '') +
                        '</li>').join('') + '</ol></div>' : '') +
                (sugerencias.length ? '<div style="margin:0 0 6px"><b>Sugerencias de ajuste:</b><ul style="margin:4px 0 0 0;padding:0;list-style:none">' +
                    sugerencias.map((s, idx) => {
                        const aplicable = !!s.parametro && Object.prototype.hasOwnProperty.call(APP.config || {}, s.parametro);
                        return '<li style="margin-bottom:8px;padding:6px 8px;border:1px solid var(--rondo-border-soft);border-radius:6px;background:var(--rondo-bg-soft)">' +
                            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
                            '<div><b>' + esc(s.parametro || '?') + '</b>: ' +
                            '<span style="color:var(--rondo-fg-dim);text-decoration:line-through">' + esc(String(s.valor_actual != null ? s.valor_actual : '?')) + '</span>' +
                            ' &rarr; <b>' + esc(String(s.valor_sugerido != null ? s.valor_sugerido : '?')) + '</b></div>' +
                            (aplicable ? '<button type="button" class="mini rondo-ia-aplicar" data-idx="' + idx + '" style="font-size:11px">Aplicar</button>' : '<span style="font-size:11px;color:var(--rondo-fg-dim)">N/A</span>') +
                            '</div>' +
                            '<div style="margin-top:3px;color:var(--rondo-fg-dim);font-size:11.5px">' + esc(s.motivo || '') + '</div>' +
                            '</li>';
                    }).join('') + '</ul></div>' : '') +
                '<div style="margin-top:6px;color:var(--rondo-fg-dim);font-size:11px">Las sugerencias solo modifican el parametro en la configuracion. Si quieres revertirlo, vuelve a abrir Ajustes.</div>' +
                '</div>';
            // Guardamos las sugerencias en el dataset del dialogo para
            // que el handler de aplicar las recupere por indice.
            abrirDialogo({
                titulo: 'Patrones en la bitacora · ' + patrones.length + ' patrones, ' + sugerencias.length + ' sugerencias' +
                    (reparadoDeTexto ? ' · (recuperado de texto)' : ''),
                html: html,
                cancelText: 'Cerrar',
                okText: 'Cerrar',
                onOk: () => {},
                ancho: 560,
                onOpen: (el) => {
                    el._sugerencias = sugerencias;
                    el.querySelectorAll('.rondo-ia-aplicar').forEach((b) => {
                        b.addEventListener('click', () => {
                            const idx = +b.dataset.idx;
                            const s = (el._sugerencias || [])[idx];
                            if (!s) return;
                            const antes = APP.config[s.parametro];
                            rondoConfirm(
                                'Aplicar sugerencia',
                                'Cambiar ' + s.parametro + ' de <b>' + antes + '</b> a <b>' + s.valor_sugerido + '</b>?<br><br>' +
                                '<span style="color:var(--rondo-fg-dim);font-size:11.5px">' + esc(s.motivo || '') + '</span>',
                                () => aplicarSugerenciaIA(s),
                                { okText: 'Aplicar', icon: UIS.check, html: true }
                            );
                        });
                    });
                }
            });
        } catch (e) {
            // v5.14.2: si algo reventaba aqui (p.ej. la IA devolvio un
            // JSON con campos inesperados que rompen un .map), antes el
            // boton se quedaba en estado busy para siempre y el operador
            // veia solo un toast rojo generico. Ahora abrimos un dialogo
            // con el stack trace para diagnosticar.
            try { console.error('[Rondo] aiPatronesUI:', e); } catch (_) { /* noop */ }
            abrirDialogo({
                titulo: 'Error interno al detectar patrones',
                html: '<div style="text-align:left;font-size:12.5px;line-height:1.45">' +
                    '<div style="margin:0 0 6px"><b>Mensaje:</b> ' + esc((e && e.message) || String(e)) + '</div>' +
                    '<pre style="font-size:10.5px;background:var(--rondo-bg-soft);padding:8px;border-radius:4px;overflow:auto;max-height:200px;margin:6px 0 0;white-space:pre-wrap">' +
                    esc((e && e.stack) || '(sin stack)') + '</pre></div>',
                cancelText: 'Cerrar',
                okText: 'Cerrar',
                onOk: () => {},
                ancho: 560
            });
        } finally {
            setBusy(btn, false);
        }
    }
    // Alterna la IA desde la cabecera. Si no hay API key, lleva a Ajustes > IA.
    function toggleIA() {
        const cfg = APP.config || {};
        const tieneKey = !!(cfg.iaApiKey && String(cfg.iaApiKey).trim());
        if (!tieneKey) {
            abrirCfg();
            const tab = document.querySelector('#rondo-cfg-tabs .cfg-tab[data-cfg="ia"]');
            if (tab) tab.click();
            adviceWarn('IA sin API key', 'Pega tu API key en Ajustes > IA para activarla.');
            return;
        }
        cfg.iaHabilitada = !cfg.iaHabilitada;
        writeJSON(LS.cfg, cfg);
        paintIASwitch();
        paintIABatchBtn();
        paintTabsChat();
        if (APP.tab === 'alertas') paintAlertas();
        advice(cfg.iaHabilitada ? 'IA activada' : 'IA desactivada',
            cfg.iaHabilitada
                ? 'El boton IA aparece en cada aviso y la IA puede analizarlos.'
                : 'La IA dejo de usarse para analisis y notificaciones.');
    }

    // Ajusta la nota y los placeholders de la pestana IA segun el
    // proveedor elegido. NO borra lo que el user haya escrito.
    function actualizarNotaProveedorIA() {
        const sel = byId('c-ia-prov');
        if (!sel) return;
        const prov = IA_PROVEEDORES[sel.value] || {};
        const notaEl = byId('c-ia-prov-nota');
        if (notaEl) {
            notaEl.textContent = prov.nota
                ? 'Se esperan keys del tipo ' + prov.nota + '. Endpoint por defecto: ' + (prov.endpoint || '(lo rellenas tu)')
                : '';
        }
        const ep = byId('c-ia-endpoint');
        if (ep && prov.endpoint && !ep.value) ep.placeholder = prov.endpoint;
        const mod = byId('c-ia-modelo');
        if (mod && prov.modelo && !mod.value) mod.placeholder = prov.modelo;
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
        const N = PAGE.Notification;
        if (typeof N === 'undefined' || N.permission !== 'granted') return;
        try { new N(title, { body }); } catch (_) { /* noop */ }
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
            // Se guarda la CLAVE del icono (no el SVG) para no inflar el
            // sessionStorage. Se resuelve al pintar con UIS[...].
            icono: alert.icono || alert.sev || 'info'
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
    // Resuelve el icono de un toast: acepta un SVG ya listo (el que pasa
    // advice con UIS.*) o la CLAVE guardada en el historial (p. ej.
    // 'riesgo', 'critico'), que antes se pintaba como texto literal.
    function rxIconoToast(item) {
        const ic = item && item.icono;
        if (typeof ic === 'string' && ic.charAt(0) === '<') return ic;
        return (ic && UIS[ic]) || (item && SEV_UIS[item.sev]) || UIS.info;
    }
    function toast(item) {
        const cont = byId('rondo-toasts');
        if (!cont) return;
        const card = makeEl('div', { className: 'rondo-toast' });
        card.style.borderLeftColor = COL[item.sev] || '#555';
        const color = COL[item.sev] || '#777';
        card.innerHTML =
            '<span class="ico rondo-usym" style="color:' + color + '">' + rxIconoToast(item) + '</span>' +
            '<div class="cuerpo"><b>' + esc(item.titulo) + '</b>' +
            (item.detalle ? '<span>' + esc(item.detalle) + '</span>' : '') +
            '</div><span class="hora">' + new Date(item.ts).toLocaleTimeString().slice(0, 5) + '</span>' +
            '<button class="mini" data-acc="x">×</button>';
        card.querySelector('[data-acc="x"]').addEventListener('click', () => { if (card.parentNode) card.parentNode.removeChild(card); });
        cont.appendChild(card);
        // Fallback numerico: un toastSeg invalido no debe auto-cerrar el
        // aviso al instante (setTimeout NaN => 0).
        const ms = (Number(APP.config.toastSeg) || 12) * 1000;
        setTimeout(() => {
            card.classList.add('sale');
            setTimeout(() => { if (card.parentNode) card.parentNode.removeChild(card); }, 400);
        }, ms);
        while (cont.children.length > 6) cont.removeChild(cont.firstChild);
    }
    // Toasts informativos con severidad opcional: 'info' (default), 'ok',
    // 'warn'/'medio', 'err'/'critico'. El color del borde y del icono sale de
    // COL, por lo que cada severidad se distingue de un vistazo.
    function advice(titulo, detalle, sev) {
        const s = sev || 'info';
        const ic = (s === 'ok') ? UIS.ok
            : (s === 'warn' || s === 'medio') ? UIS.warn
                : (s === 'err' || s === 'critico' || s === 'alto') ? UIS.error
                    : UIS.info;
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

