'use strict';
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
- Rutas: seguimiento de rutas planificadas (progreso, distancia al trazado, ETA). Se planea con clic derecho sobre una unidad. En el editor multipunto la ventana se mueve (arrastra el encabezado) y se redimensiona (esquina inferior derecha); las sugerencias se recorren con flechas arriba/abajo y Enter; las paradas se reordenan arrastrando el asa. La ruta se puede ver en un mini-mapa propio con tiles de OpenStreetMap.
- Zonas: dos vistas: Geocercas de la plataforma (unidades dentro) y Zonas de riesgo. Aqui se cargan las zonas de riesgo (URL/archivo/data:).
- Caravana: unidades cerca de una unidad lider (distancia firmada, sentido contrario, no vigiladas).
- Replay: reproduce el recorrido de una unidad en un dia, con mini-mapa (tiles de OpenStreetMap), linea de tiempo y eventos (paradas, geocercas, excesos, desvios). Solo lectura.
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

IA: opt-in. Se configura en Ajustes > IA con la API key del proveedor (solo se envia al endpoint del proveedor). El boton IA en cada aviso da un veredicto (falso_positivo/normal/sospechoso/critico). "Analizar lote" prioriza varios avisos. "Detectar patrones" propone ajustes de umbrales. El chat responde consultas libres y, si la pregunta menciona un economico, consulta por API su historial de 24 h y sus campos personalizados. El boton Ocultar (junto a Automatizar) oculta/muestra las ventanas de unidades abiertas sin cerrarlas; los botones + y - las agrandan o encogen. Los resultados de Analizar lote/flota se acotan al alto de la pantalla y hacen scroll.

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
                ancho: 760
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
                ancho: 780
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
    // Trampa de foco: Tab/Shift+Tab ciclan solo dentro del dialogo abierto
    // (accesibilidad: el foco no debe escapar al contenido de atras).
    function rxDialogoTrapTab(e) {
        if (e.key !== 'Tab') return;
        const el = e.currentTarget;
        const nodos = el.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
        const vis = Array.prototype.filter.call(nodos, (n) => !n.disabled && n.getClientRects().length > 0);
        if (!vis.length) return;
        const primero = vis[0];
        const ultimo = vis[vis.length - 1];
        const activo = document.activeElement;
        if (e.shiftKey && activo === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && activo === ultimo) { e.preventDefault(); primero.focus(); }
        else if (!el.contains(activo)) { e.preventDefault(); primero.focus(); }
    }
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
        // v5.14.6: auto-hide del boton Cancel si su texto coincide con
        // el del OK (ej. cancelText:'Cerrar' + okText:'Cerrar'). Antes
        // salian DOS botones identicos, lo que confundia al operador.
        // El caller sigue pudiendo forzar ambos pasando opts.cancel ===
        // 'forzar' (cualquier string truthy distinto de false).
        const cancelText = esc(opts.cancelText || 'Cancelar');
        const okText = esc(opts.okText || 'Aceptar');
        const showCancel = opts.cancel !== false && cancelText !== okText;
        el.innerHTML =
            '<div class="dlg-head"><span class="rondo-usym">' + (opts.icon || UIS.info) + '</span>' +
            '<span id="rondo-dlg-title">' + esc(opts.titulo) + '</span></div>' +
            '<div class="dlg-body">' +
            (opts.html || '') +
            (opts.input ? '<input id="' + inputId + '" type="' + (inp.type || 'text') + '" placeholder="' +
                esc(inp.placeholder || '') + '" value="' + esc(inp.value == null ? '' : inp.value) + '">' : '') +
            '</div>' +
            '<div class="dlg-foot">' +
            (showCancel ? '<button type="button" class="dlg-cancel">' + cancelText + '</button>' : '') +
            '<button type="button" class="dlg-ok' + (opts.peligro ? ' peligro' : '') + '">' + okText + '</button>' +
            '</div>';
        // Nombre accesible del dialogo (rol dialog ya lo pone ensureDialog).
        el.setAttribute('aria-labelledby', 'rondo-dlg-title');
        // v6.0.10: ancho configurable por dialogo. Los resultados de IA son
        // anchos y largos; se acotan a la pantalla y el cuerpo hace scroll.
        if (opts.ancho) el.style.width = 'min(' + Math.max(320, Math.round(Number(opts.ancho) || 0)) + 'px,94vw)';
        else el.style.width = '';
        try { rxBarridoAutofill(el); } catch (_) { /* noop */ }
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
        // El listener vive en el elemento persistente: se registra una vez.
        if (!el._rondoTrap) {
            el._rondoTrap = true;
            el.addEventListener('keydown', rxDialogoTrapTab);
        }
        if (inpEl) inpEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); okBtn.click(); }
        });
        // v5.14: hook para que callers externos enganchen handlers
        // sobre los botones del cuerpo del dialogo. Se llama DESPUES
        // de montar el HTML y antes de devolver el elemento.
        if (typeof opts.onOpen === 'function') {
            try { opts.onOpen(el); } catch (e) { try { console.log('[Rondo] onOpen dialogo: ' + e); } catch (_) { /* noop */ } }
        }
        return el;
    }
    function rondoConfirm(titulo, mensaje, onOk, opts) {
        const o = opts || {};
        abrirDialogo({
            icon: o.icon || UIS.warn,
            titulo: titulo,
            // o.html permite HTML confiable (p. ej. negritas de la IA); por
            // defecto el mensaje se escapa para no inyectar HTML.
            html: o.html ? '<p>' + mensaje + '</p>' : '<p>' + esc(mensaje) + '</p>',
            okText: o.okText || 'Confirmar',
            peligro: !!o.peligro,
            onOk: onOk
        });
    }
    function rondoPrompt(titulo, label, value, onOk, opts) {
        const o = opts || {};
        abrirDialogo({
            icon: o.icon || UIS.gear,
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
            '<span class="rondo-usym">' + icon + '</span>' +
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
        try { rxBarridoAutofill(el); } catch (_) { /* noop */ }
        return true;
    }
    function invalidarHtml(id) { delete _htmlMemo[id]; }
    function abrirBienvenida() {
        abrirDialogo({
            icon: UIS.gear,
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

    /* ====================== RIESGO ======================
     * Zonas de alto riesgo alimentadas por una URL externa (CSV o JSON).
     * El repositorio de Rondo no incluye datos: el usuario pega en
     * Ajustes > Riesgo una URL que apunta a un CSV/JSON publico, o
     * importa un archivo desde disco.
     *
     * Formatos aceptados al cargar:
     *   JSON: { items: [...] }  |  { features: [...] } (GeoJSON)  |  [ ... ]
     *   CSV :  1 fila por zona con columnas lat/lon/score/radio/estado/municipio/delito/conteo
     *
     * La regla `riesgoSinSenal` dispara una alerta critica cuando una unidad
     * transiciona de con senal -> sin senal y su ultima posicion valida cae
     * dentro del buffer de una zona cargada.
     */
    function _norm(s) {
        return (s == null) ? '' : String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    }
    function _splitCSVLine(line, sep) {
        const out = [];
        let cell = '', inQ = false, i = 0;
        while (i < line.length) {
            const c = line[i];
            if (inQ) {
                if (c === '"') {
                    if (line[i + 1] === '"') { cell += '"'; i += 2; continue; }
                    inQ = false; i++; continue;
                }
                cell += c; i++; continue;
            }
            if (c === '"') { inQ = true; i++; continue; }
            if (c === sep) { out.push(cell); cell = ''; i++; continue; }
            cell += c; i++;
        }
        out.push(cell);
        return out;
    }
    function _parseCSV(text, sep) {
        const t = String(text || '').replace(/^\uFEFF/, '');
        const lines = t.split(/\r?\n/).filter((l) => l.length > 0);
        if (!lines.length) return { header: [], rows: [] };
        // El separador efectivo puede haber sido sobreescrito o autodetectado.
        const rows = lines.map((l) => _splitCSVLine(l, sep));
        const header = rows.shift().map((h) => _norm(h));
        return { header, rows };
    }
    function _autoSep(text) {
        const sample = String(text || '').slice(0, 2048);
        const lines = sample.split(/\r?\n/).filter(Boolean);
        if (!lines.length) return ',';
        const c = (lines[0].match(/,/g) || []).length;
        const s = (lines[0].match(/;/g) || []).length;
        const t = (lines[0].match(/\t/g) || []).length;
        if (t >= c && t >= s && t > 0) return '\t';
        if (s > c) return ';';
        return ',';
    }
    function _findCol(header, keys) {
        for (let i = 0; i < header.length; i++) {
            const h = header[i];
            for (let k = 0; k < keys.length; k++) {
                if (h === keys[k] || h.indexOf(keys[k]) >= 0) return i;
            }
        }
        return -1;
    }
    function _normItem(z, source, idx) {
        if (!z) return null;
        let lat = null, lon = null;
        if (Array.isArray(z.centro) && z.centro.length >= 2) {
            lat = +z.centro[0]; lon = +z.centro[1];
        } else {
            if (z.lat != null) lat = +z.lat;
            // OJO: usar != null (no ||) para no descartar lon = 0 (meridiano
            // de Greenwich) ni confundirlo con una columna ausente.
            if (z.lon != null) lon = +z.lon;
            else if (z.lng != null) lon = +z.lng;
            else if (z.long != null) lon = +z.long;
        }
        if (lat == null || lon == null || !isFinite(lat) || !isFinite(lon)) return null;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
        const radio = +(z.radio_m || z.radio || z.buffer || z.distancia || 0);
        const score = +(z.score || z.severidad || z.riesgo || z.incidencia || 0);
        const estado = z.estado || z.state || z.entidad || z.entidad_federativa || '';
        const municipio = z.municipio || z.municipality || z.city || z.ciudad || z.alcaldia || z.alcald\u00eda || '';
        const id = z.id || ((source || 'item') + '-' + idx + '-' + Math.round(lat * 100) + '-' + Math.round(lon * 100));
        const delitos = (z.delitos && typeof z.delitos === 'object') ? z.delitos : null;
        // Suma de delitos (para derivar score cuando falta o es 0).
        let total = 0;
        if (delitos) {
            for (const k in delitos) {
                const v = +delitos[k];
                if (isFinite(v) && v > 0) total += v;
            }
        }
        // Si no hay delitos pero hay "nota" tipo "total X", intenta extraer.
        if (!total && typeof z.nota === 'string') {
            const m = /total\s*[:=]?\s*(\d+)/i.exec(z.nota);
            if (m) total = +m[1];
        }
        return {
            id, estado: String(estado), municipio: String(municipio),
            centro: [lat, lon], radio_m: radio, score,
            fuente: z.fuente || source || 'usuario',
            delitos: delitos || null,
            nota: z.nota || z.note || '',
            _total: total
        };
    }
    // Devuelve el radio (m) derivado del score cuando el dataset no lo incluye.
    function _radioDeScore(score) {
        if (score >= 70) return 4000;
        if (score >= 40) return 2200;
        if (score >= 20) return 1400;
        return 500;
    }
    function _itemsFromJSON(data) {
        let arr = null;
        if (Array.isArray(data)) arr = data;
        else if (data && Array.isArray(data.items)) arr = data.items;
        else if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
            arr = data.features.map((f) => {
                if (!f || !f.geometry) return null;
                const g = f.geometry;
                if (g.type === 'Point' && Array.isArray(g.coordinates)) {
                    return Object.assign({}, f.properties || {}, {
                        centro: [g.coordinates[1], g.coordinates[0]]
                    });
                }
                return null;
            }).filter(Boolean);
        }
        if (!arr) return [];
        const out = [];
        for (let i = 0; i < arr.length; i++) {
            const it = _normItem(arr[i], 'json', i);
            if (it) out.push(it);
        }
        // Si la mayoria de items no tienen score explicito, derivar del total
        // de delitos normalizado por el maximo del dataset.
        let sinScore = 0;
        for (let i = 0; i < out.length; i++) if (!(out[i].score > 0)) sinScore++;
        if (out.length > 0 && sinScore / out.length > 0.5) {
            let maxTotal = 0;
            for (let i = 0; i < out.length; i++) if (out[i]._total > maxTotal) maxTotal = out[i]._total;
            if (maxTotal > 0) {
                for (let i = 0; i < out.length; i++) {
                    const it = out[i];
                    if (!(it.score > 0) && it._total > 0) {
                        // Distribucion con raiz para abrir el espectro.
                        it.score = Math.max(1, Math.min(100, Math.round(Math.sqrt(it._total / maxTotal) * 100)));
                    }
                }
            }
        }
        // Si no hay radio_m, derivarlo del score.
        for (let i = 0; i < out.length; i++) {
            const it = out[i];
            if (!(it.radio_m > 0) && it.score > 0) {
                it.radio_m = _radioDeScore(it.score);
            }
        }
        // Limpia campos auxiliares.
        for (let i = 0; i < out.length; i++) delete out[i]._total;
        return out;
    }
    function _itemsFromCSV(text) {
        const sep = _autoSep(text);
        const { header, rows } = _parseCSV(text, sep);
        if (!header.length || !rows.length) return [];
        const iLat = _findCol(header, ['lat', 'latitud']);
        const iLon = _findCol(header, ['lon', 'lng', 'long', 'longitud']);
        if (iLat < 0 || iLon < 0) return [];
        const iScore = _findCol(header, ['score', 'severidad', 'riesgo', 'incidencia', 'peligrosidad']);
        const iRadio = _findCol(header, ['radio_m', 'radio', 'buffer', 'distancia', 'distancia_m']);
        const iEstado = _findCol(header, ['estado', 'entidad', 'state']);
        const iMun = _findCol(header, ['municipio', 'municipality', 'ciudad', 'alcaldia', 'alcald\u00eda']);
        const iDelito = _findCol(header, ['delito', 'tipo', 'categoria', 'crime', 'crimen']);
        const iConteo = _findCol(header, ['conteo', 'count', 'casos', 'incidentes', 'valor', 'frecuencia']);
        // Agrupa filas por (lat,lon,radio,score).
        const buckets = new Map();
        let defaultRadio = 0, defaultScore = 0;
        let anonIdx = 0;
        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const lat = +row[iLat];
            const lon = +row[iLon];
            if (!isFinite(lat) || !isFinite(lon)) continue;
            const radio = (iRadio >= 0) ? +row[iRadio] : defaultRadio;
            const score = (iScore >= 0) ? +row[iScore] : defaultScore;
            const key = lat.toFixed(5) + ',' + lon.toFixed(5) + ',' + radio + ',' + score;
            let b = buckets.get(key);
            if (!b) {
                b = {
                    id: 'csv-' + (++anonIdx),
                    estado: (iEstado >= 0) ? row[iEstado] : '',
                    municipio: (iMun >= 0) ? row[iMun] : '',
                    centro: [lat, lon],
                    radio_m: (radio > 0) ? radio : 0,
                    score,
                    fuente: 'csv',
                    delitos: {},
                    nota: ''
                };
                buckets.set(key, b);
            }
            if (iDelito >= 0 && iConteo >= 0) {
                const d = (row[iDelito] || '').trim();
                const c = parseFloat(row[iConteo]);
                if (d && isFinite(c)) b.delitos[d] = (b.delitos[d] || 0) + c;
            }
            if (!b.estado && iEstado >= 0) b.estado = row[iEstado] || '';
            if (!b.municipio && iMun >= 0) b.municipio = row[iMun] || '';
        }
        // Si no hay columna de radio se deriva del score mas abajo (en el
        // bucle de salida), no hace falta estimarlo aqui.
        const out = [];
        // Acumula total de delitos por bucket para derivar score si falta.
        for (const b of buckets.values()) {
            let total = 0;
            if (b.delitos) for (const k in b.delitos) { const v = +b.delitos[k]; if (isFinite(v) && v > 0) total += v; }
            b._total = total;
        }
        // Si la mayoria de buckets no tienen score, derivarlo del total normalizado.
        let sinScore = 0;
        for (const b of buckets.values()) if (!(b.score > 0)) sinScore++;
        const totalBuckets = buckets.size;
        if (totalBuckets > 0 && sinScore / totalBuckets > 0.5) {
            let maxTotal = 0;
            for (const b of buckets.values()) if (b._total > maxTotal) maxTotal = b._total;
            if (maxTotal > 0) {
                for (const b of buckets.values()) {
                    if (!(b.score > 0) && b._total > 0) {
                        b.score = Math.max(1, Math.min(100, Math.round(Math.sqrt(b._total / maxTotal) * 100)));
                    }
                }
            }
        }
        for (const b of buckets.values()) {
            if (!(b.radio_m > 0) && b.score > 0) {
                b.radio_m = _radioDeScore(b.score);
            }
            if (!(b.radio_m > 0)) continue;
            out.push({
                id: b.id,
                estado: String(b.estado || ''),
                municipio: String(b.municipio || ''),
                centro: b.centro,
                radio_m: b.radio_m,
                score: b.score,
                fuente: 'csv',
                delitos: Object.keys(b.delitos).length ? b.delitos : null,
                nota: ''
            });
        }
        return out;
    }
    async function cargarRiesgo(url) {
        const src = (url != null) ? String(url).trim() : (APP.config && APP.config.riesgoUrl || '');
        if (!src) { APP.riesgo = null; APP.riesgoErr = null; APP.riesgoEstado = 'idle'; return; }
        if (typeof fetch !== 'function') { APP.riesgoErr = 'fetch() no disponible'; APP.riesgoEstado = 'error'; return; }
        if (APP._riesgoFetched === src && APP.riesgoEstado === 'cargando') return;
        APP._riesgoFetched = src;
        APP.riesgoEstado = 'cargando';
        if (APP.tab === 'riesgo') paintRiesgo();
        try {
            const formato = (APP.config && APP.config.riesgoFormato) || 'auto';
            const r = await fetch(src, { cache: 'no-store', credentials: 'omit' });
            if (!r.ok) {
                APP.riesgoErr = 'HTTP ' + r.status + ' desde la URL de riesgo';
                APP.riesgo = null;
                APP.riesgoEstado = 'error';
            } else {
                const text = await r.text();
                const trimmed = String(text || '').trim();
                let items = [];
                let fmt = (formato || 'auto').toLowerCase();
                if (fmt === 'auto') {
                    fmt = (trimmed.length && (trimmed[0] === '[' || trimmed[0] === '{')) ? 'json' : 'csv';
                }
                if (fmt === 'json') {
                    try {
                        const data = JSON.parse(trimmed);
                        items = _itemsFromJSON(data);
                        if (!items.length) {
                            APP.riesgoErr = 'JSON sin items v\u00e1lidos ({} o [])';
                            APP.riesgo = null;
                            APP.riesgoEstado = 'error';
                            if (APP.tab === 'riesgo') paintRiesgo();
                            return;
                        }
                    } catch (e) {
                        APP.riesgoErr = 'JSON inv\u00e1lido: ' + (e && e.message || '');
                        APP.riesgo = null;
                        APP.riesgoEstado = 'error';
                        if (APP.tab === 'riesgo') paintRiesgo();
                        return;
                    }
                } else {
                    items = _itemsFromCSV(trimmed);
                    if (!items.length) {
                        APP.riesgoErr = 'CSV sin columnas lat/lon reconocibles';
                        APP.riesgo = null;
                        APP.riesgoEstado = 'error';
                        if (APP.tab === 'riesgo') paintRiesgo();
                        return;
                    }
                }
                APP.riesgo = items;
                APP.riesgoErr = null;
                APP.riesgoTs = Date.now();
                APP.riesgoEstado = 'ok';
                recalcularMunicipiosRiesgo();
                if (APP.unlocked) {
                    try { console.log('[Rondo] riesgo cargado:', items.length, 'zonas (' + fmt + ')'); } catch (_) {}
                }
            }
        } catch (e) {
            APP.riesgoErr = (e && e.message) ? e.message : String(e);
            APP.riesgo = null;
            APP.riesgoEstado = 'error';
        }
        if (APP.tab === 'riesgo') paintRiesgo();
    }
    function puntoEnZonaDeRiesgo(lat, lon) {
        if (!APP.riesgo || !APP.riesgo.length) return null;
        if (lat == null || lon == null) return null;
        const minScore = Number((APP.config && APP.config.riesgoMinScore) || 0);
        const mul = Number((APP.config && APP.config.riesgoRadioMul) || 1);
        let mejor = null;
        for (let i = 0; i < APP.riesgo.length; i++) {
            const z = APP.riesgo[i];
            if (!z || !z.centro || !Array.isArray(z.centro)) continue;
            if (!(z.radio_m > 0)) continue;
            if (typeof z.score !== 'number' || !isFinite(z.score) || z.score < minScore) continue;
            const radioKm = (z.radio_m * mul) / 1000;
            // Prefiltro barato por bounding box antes del haversine: con
            // datasets grandes (miles de zonas) y una llamada por unidad y
            // refresco, evita calcular distancias de zonas lejanas. El margen
            // es conservador (nunca descarta una zona que pueda contener el
            // punto), asi que el resultado es identico al de antes.
            const margenLat = radioKm / 110.5 + 0.001;
            if (Math.abs(lat - z.centro[0]) > margenLat) continue;
            const cosLat = Math.cos(Math.max(Math.abs(lat), Math.abs(z.centro[0])) * Math.PI / 180);
            const margenLon = (cosLat > 1e-6) ? (radioKm / (111.32 * cosLat) + 0.001) : 180;
            if (Math.abs(lon - z.centro[1]) > margenLon) continue;
            const distKm = haversine(lat, lon, z.centro[0], z.centro[1]);
            if (distKm <= radioKm) {
                if (!mejor || z.score > mejor.score) {
                    mejor = {
                        id: z.id, estado: z.estado, municipio: z.municipio,
                        score: z.score, dist: distKm * 1000, fuente: z.fuente
                    };
                }
            }
        }
        return mejor;
    }
    /* ── Algoritmos UI de la pestana Riesgo ─────────────────────────────
     * Clasificacion, estadisticas, filtrado, ordenamiento y agrupacion.
     * Funciones puras: no leen DOM ni APP, salvo donde se indica.
     */
    // Umbrales de nivel. Se exponen aqui para que tests y UI coincidan.
    const RIESGO_NIVEL = Object.freeze({ ALTO: 70, MEDIO: 40 });
    function nivelRiesgo(score) {
        const s = Number(score) || 0;
        if (s >= RIESGO_NIVEL.ALTO) return 'alto';
        if (s >= RIESGO_NIVEL.MEDIO) return 'medio';
        return 'bajo';
    }
    // Radio efectivo ya con el multiplicador configurado.
    function radioEfectivo(z, mul) {
        const r = (z && z.radio_m) || 0;
        const m = Number(mul);
        return r * (Number.isFinite(m) && m > 0 ? m : 1);
    }
    // Area de un circulo en km^2 a partir del radio en metros.
    function areaKm2DeRadio(radio_m) {
        if (!(radio_m > 0)) return 0;
        const km = radio_m / 1000;
        return Math.PI * km * km;
    }
    // Texto corto para area: < 1 km^2 -> m^2; si no, km^2 con 1 decimal.
    function fmtArea(km2) {
        if (!km2) return '0';
        if (km2 < 1) return Math.round(km2 * 1e6).toLocaleString('es-MX') + ' m\u00b2';
        return km2.toFixed(1) + ' km\u00b2';
    }
    // Convierte los delitos del item en una cadena legible (top 3).
    function delitosTop(z, max) {
        const d = z && z.delitos;
        if (!d || typeof d !== 'object') return '';
        const keys = Object.keys(d).filter((k) => d[k] > 0);
        keys.sort((a, b) => d[b] - d[a]);
        const n = Math.max(1, max || 3);
        return keys.slice(0, n).map((k) => k.replace(/_/g, ' ') + ': ' + d[k]).join(' \u00b7 ');
    }
    // Convierte el item a un texto "haystack" para busqueda difusa.
    function riesgoHaystack(z) {
        if (!z) return '';
        const partes = [
            z.id, z.estado, z.municipio, z.fuente,
            (z.delitos && typeof z.delitos === 'object') ? Object.keys(z.delitos).join(' ') : ''
        ];
        return partes.filter(Boolean).join(' ').toLowerCase();
    }
    // Calcula estadisticas agregadas para el hero / KPIs.
    function calcularStatsRiesgo(items) {
        const out = { total: 0, alto: 0, medio: 0, bajo: 0, areaKm2: 0,
            municipios: 0, fuenteSet: {}, maxScore: 0, sumScore: 0, delitosAcum: {} };
        if (!items || !items.length) return out;
        const muns = new Set();
        out.total = items.length;
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            const score = Number(z.score) || 0;
            const nivel = nivelRiesgo(score);
            out[nivel]++;
            out.sumScore += score;
            if (score > out.maxScore) out.maxScore = score;
            if (z.radio_m > 0) out.areaKm2 += areaKm2DeRadio(z.radio_m);
            if (z.municipio) muns.add(z.estado + '|' + z.municipio);
            if (z.fuente) out.fuenteSet[z.fuente] = (out.fuenteSet[z.fuente] || 0) + 1;
            if (z.delitos && typeof z.delitos === 'object') {
                Object.keys(z.delitos).forEach((k) => {
                    const n = Number(z.delitos[k]) || 0;
                    if (n > 0) out.delitosAcum[k] = (out.delitosAcum[k] || 0) + n;
                });
            }
        }
        out.municipios = muns.size;
        out.areaKm2 = Math.round(out.areaKm2 * 10) / 10;
        out.promScore = Math.round(out.sumScore / out.total);
        return out;
    }
    // Filtra por texto libre y nivel. Devuelve un array nuevo.
    function filtrarZonas(items, query, nivel) {
        if (!items || !items.length) return [];
        const q = String(query || '').toLowerCase().trim();
        const lvl = nivel || 'todas';
        if (!q && (lvl === 'todas' || !lvl)) return items.slice();
        const out = [];
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            if (lvl !== 'todas' && nivelRiesgo(z.score) !== lvl) continue;
            if (q && riesgoHaystack(z).indexOf(q) < 0) continue;
            out.push(z);
        }
        return out;
    }
    // Ordena por el criterio dado. Devuelve un array nuevo.
    function ordenarZonas(items, criterio) {
        if (!items) return [];
        const arr = items.slice();
        const c = criterio || 'score';
        const cmpStr = (a, b) => String(a || '').localeCompare(String(b || ''), 'es');
        switch (c) {
            case 'score-asc': arr.sort((a, b) => (Number(a.score) || 0) - (Number(b.score) || 0)); break;
            case 'score-desc': arr.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)); break;
            case 'estado': arr.sort((a, b) => cmpStr(a.estado, b.estado) || ((Number(b.score) || 0) - (Number(a.score) || 0))); break;
            case 'municipio': arr.sort((a, b) => cmpStr(a.municipio, b.municipio) || ((Number(b.score) || 0) - (Number(a.score) || 0))); break;
            case 'radio-desc': arr.sort((a, b) => (Number(b.radio_m) || 0) - (Number(a.radio_m) || 0)); break;
            case 'radio-asc': arr.sort((a, b) => (Number(a.radio_m) || 0) - (Number(b.radio_m) || 0)); break;
            default: arr.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
        }
        return arr;
    }
    // Agrupa por estado. Cada grupo incluye count, maxScore, municipios.
    function agruparPorEstado(items) {
        const grupos = Object.create(null);
        if (!items) return [];
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            const est = z.estado || 'Sin estado';
            if (!grupos[est]) {
                grupos[est] = { estado: est, count: 0, municipios: new Set(),
                    maxScore: 0, sumScore: 0, alto: 0, medio: 0, bajo: 0, areaKm2: 0, zonas: [] };
            }
            const g = grupos[est];
            g.count++;
            g.zonas.push(z);
            const score = Number(z.score) || 0;
            if (score > g.maxScore) g.maxScore = score;
            g.sumScore += score;
            g[nivelRiesgo(score)]++;
            if (z.municipio) g.municipios.add(z.municipio);
            if (z.radio_m > 0) g.areaKm2 += areaKm2DeRadio(z.radio_m);
        }
        const arr = Object.values(grupos);
        arr.forEach((g) => {
            g.municipios = g.municipios.size;
            g.promScore = Math.round(g.sumScore / g.count);
            g.areaKm2 = Math.round(g.areaKm2 * 10) / 10;
            g.zonas = ordenarZonas(g.zonas, 'score-desc');
            delete g.sumScore;
        });
        arr.sort((a, b) => b.maxScore - a.maxScore || b.count - a.count);
        return arr;
    }
    // Top N delitos agregados (para el footer del hero).
    function topDelitos(stats, n) {
        if (!stats || !stats.delitosAcum) return [];
        const arr = Object.keys(stats.delitosAcum).map((k) => ({ key: k, n: stats.delitosAcum[k] }));
        arr.sort((a, b) => b.n - a.n);
        return arr.slice(0, n || 3);
    }
    // ── Dona y distribucion ────────────────────────────────────────
    // Dado el total y los segmentos, devuelve los parametros del arco SVG
    // para dibujarlo. size es el diametro, grosor el ancho del anillo.
    // Salida: array [{fraccion, colorKey, dashArray, dashOffset}] para 3 segmentos.
    function donutSegmentos(alto, medio, bajo, size, grosor) {
        const total = (alto || 0) + (medio || 0) + (bajo || 0);
        if (total === 0 || !size) {
            return { total: 0, segmentos: [], radio: (size || 0) / 2 - (grosor || 0) / 2,
                circunferencia: 0, grosor: grosor || 0 };
        }
        const radio = size / 2 - grosor / 2;
        const circunferencia = 2 * Math.PI * radio;
        const seg = (n, key) => ({
            n: n || 0,
            fraccion: (n || 0) / total,
            colorKey: key,
            longitud: ((n || 0) / total) * circunferencia,
        });
        return { total, radio, circunferencia, grosor: grosor || 0,
            segmentos: [seg(alto, 'alto'), seg(medio, 'medio'), seg(bajo, 'bajo')] };
    }
    // Calcula los offset y longitudes para un stroke-dasharray de 3 segmentos
    // que cubran la circunferencia sin huecos. Salida: 3 objetos {len, off}.
    function donutDashArray(seg, circ) {
        if (!seg || !circ) return [];
        let acumulado = 0;
        return seg.map((s) => {
            const len = Math.max(0.0001, s.longitud);
            const off = -acumulado;
            acumulado += s.longitud;
            return { len, off, colorKey: s.colorKey, fraccion: s.fraccion, n: s.n };
        });
    }
    // ── Histograma de scores ───────────────────────────────────────
    // Cuenta zonas por buckets de score. Por defecto 5 buckets de 20 puntos.
    // Devuelve {buckets: [[lo,hi],...], counts: [...], max, total}.
    function histogramaScores(items, buckets) {
        const bk = buckets || [[0, 20], [20, 40], [40, 60], [60, 80], [80, 101]];
        const counts = bk.map(() => 0);
        if (!items || !items.length) {
            return { buckets: bk, counts: counts, max: 0, total: 0 };
        }
        let max = 0;
        let total = 0;
        for (let i = 0; i < items.length; i++) {
            const s = Number(items[i].score) || 0;
            if (s < 0 || s > 100) continue;
            for (let j = 0; j < bk.length; j++) {
                if (s >= bk[j][0] && s < bk[j][1]) {
                    counts[j]++;
                    total++;
                    if (counts[j] > max) max = counts[j];
                    break;
                }
            }
        }
        return { buckets: bk, counts, max, total };
    }
    // ── Tiempo relativo ────────────────────────────────────────────
    // Devuelve "hace 5 min", "hace 2 h", "recien" segun el timestamp.
    function tiempoRelativo(ts) {
        if (!ts) return '';
        const d = Date.now() - ts;
        if (d < 0) return 'recien';
        const s = Math.floor(d / 1000);
        if (s < 45) return 'hace ' + s + ' s';
        const m = Math.floor(s / 60);
        if (m < 60) return 'hace ' + m + ' min';
        const h = Math.floor(m / 60);
        if (h < 24) return 'hace ' + h + ' h';
        const dd = Math.floor(h / 24);
        return 'hace ' + dd + ' d';
    }
    // ── Formato de exportacion ─────────────────────────────────────
    // Construye un array de filas (header + datos) para CSV.
    // Columnas: estado, municipio, score, radio_m, lat, lon, fuente, id, delitos_resumen.
    function riesgoParaCSV(items) {
        const header = ['estado', 'municipio', 'score', 'radio_m', 'lat', 'lon', 'fuente', 'id', 'delitos'];
        const filas = [header];
        if (!items || !items.length) return filas;
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            const d = (z.delitos && typeof z.delitos === 'object')
                ? Object.keys(z.delitos).filter((k) => z.delitos[k] > 0)
                    .map((k) => k + ':' + z.delitos[k]).join(';')
                : '';
            filas.push([
                z.estado || '', z.municipio || '',
                Number(z.score) || 0, Number(z.radio_m) || 0,
                z.lat != null ? z.lat : (z.centro && z.centro[0] != null ? z.centro[0] : ''),
                z.lon != null ? z.lon : (z.centro && z.centro[1] != null ? z.centro[1] : ''),
                z.fuente || '', z.id || '', d,
            ]);
        }
        return filas;
    }
    // Construye un objeto GeoJSON FeatureCollection para exportacion.
    function riesgoParaGeoJSON(items) {
        const features = [];
        if (!items || !items.length) {
            return { type: 'FeatureCollection', features: [] };
        }
        for (let i = 0; i < items.length; i++) {
            const z = items[i];
            const lat = z.lat != null ? z.lat : (z.centro && z.centro[0] != null ? z.centro[0] : null);
            const lon = z.lon != null ? z.lon : (z.centro && z.centro[1] != null ? z.centro[1] : null);
            if (lat == null || lon == null) continue;
            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [lon, lat] },
                properties: {
                    id: z.id || null,
                    estado: z.estado || null,
                    municipio: z.municipio || null,
                    score: Number(z.score) || 0,
                    radio_m: Number(z.radio_m) || 0,
                    fuente: z.fuente || null,
                    delitos: (z.delitos && typeof z.delitos === 'object') ? z.delitos : null,
                },
            });
        }
        return { type: 'FeatureCollection', features: features };
    }
    // Construye texto para copiar al portapapeles.
    function riesgoParaClipboard(items) {
        if (!items || !items.length) return '';
        const lineas = [];
        lineas.push('ZONAS DE RIESGO (' + items.length + ')');
        lineas.push('=====================');
        items.forEach((z) => {
            const score = Number(z.score) || 0;
            const radio = z.radio_m || 0;
            const lat = z.lat != null ? z.lat : (z.centro && z.centro[0] != null ? z.centro[0] : null);
            const lon = z.lon != null ? z.lon : (z.centro && z.centro[1] != null ? z.centro[1] : null);
            const coord = (lat != null && lon != null)
                ? ('  ' + lat.toFixed(4) + ', ' + lon.toFixed(4)) : '';
            lineas.push((z.estado || '?') + ' \u00b7 ' + (z.municipio || '?') + ' \u00b7 score ' + score + '/100 \u00b7 buffer ' + radio + ' m' + coord);
        });
        return lineas.join('\n');
    }
    // Devuelve los parametros necesarios para dibujar una sola card de zona
    // como texto enriquecido (usado por el detalle expandible).
    function riesgoDetalleHTML(z) {
        if (!z) return '';
        const partes = [];
        partes.push('<b>' + esc(z.estado || '?') + '</b>');
        if (z.municipio) partes.push(esc(z.municipio));
        if (z.id) partes.push('id: ' + esc(z.id));
        const score = Number(z.score) || 0;
        partes.push('score <b>' + score + '/100</b>');
        if (z.radio_m) partes.push('buffer <b>' + z.radio_m + ' m</b>');
        const lat = z.lat != null ? z.lat : (z.centro && z.centro[0] != null ? z.centro[0] : null);
        const lon = z.lon != null ? z.lon : (z.centro && z.centro[1] != null ? z.centro[1] : null);
        if (lat != null && lon != null) {
            partes.push('coordenadas <span class="coord">' + lat.toFixed(4) + ', ' + lon.toFixed(4) + '</span>');
        }
        if (z.fuente) partes.push('fuente <i>' + esc(z.fuente) + '</i>');
        if (z.delitos && typeof z.delitos === 'object') {
            const det = delitosTop(z, 5);
            if (det) partes.push('delitos: ' + esc(det));
        }
        return partes.join(' \u00b7 ');
    }
    // ── Export y copia (operan sobre el subset visible) ──────────────
    // Devuelve el subset de zonas actualmente filtrado y ordenado.
    function riesgoSubsetVisible() {
        const items = APP.riesgo || [];
        const filtradas = filtrarZonas(items, APP.riesgoFiltro, APP.riesgoNivel);
        return ordenarZonas(filtradas, APP.riesgoOrden || 'score');
    }
    // Dispara descarga de un CSV con el subset visible.
    function exportarRiesgoCSV() {
        const items = riesgoSubsetVisible();
        if (!items.length) { adviceWarn('Nada que exportar', 'No hay zonas visibles con los filtros actuales.'); return; }
        const filas = riesgoParaCSV(items);
        const escCsv = (c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"';
        const csv = filas.map((f) => f.map(escCsv).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = 'rondo_riesgo_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        adviceOk('CSV exportado', items.length + ' zonas');
    }
    // Dispara descarga de un GeoJSON con el subset visible.
    function exportarRiesgoGeoJSON() {
        const items = riesgoSubsetVisible();
        if (!items.length) { adviceWarn('Nada que exportar', 'No hay zonas visibles con los filtros actuales.'); return; }
        const geo = riesgoParaGeoJSON(items);
        const text = JSON.stringify(geo, null, 2);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'application/geo+json;charset=utf-8;' }));
        a.download = 'rondo_riesgo_' + new Date().toISOString().slice(0, 10) + '.geojson';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        adviceOk('GeoJSON exportado', items.length + ' zonas');
    }
    // Copia el subset visible al portapapeles.
    function copiarRiesgoFiltrado() {
        const items = riesgoSubsetVisible();
        if (!items.length) { adviceWarn('Nada que copiar', 'No hay zonas visibles con los filtros actuales.'); return; }
        const text = riesgoParaClipboard(items);
        copiarAlPortapapeles(text, 'Copiado al portapapeles', items.length + ' zonas (' + items.length + ' lineas)');
    }
    // Copia una sola zona al portapapeles.
    function copiarZonaRiesgo(z) {
        const text = riesgoParaClipboard([z]);
        copiarAlPortapapeles(text, 'Zona copiada', esc(z.estado || '?') + ' \u00b7 ' + esc(z.municipio || '?'));
    }
    // Helper: usa copyToClipboard (definida mas abajo) y avisa con toast.
    function copiarAlPortapapeles(text, titulo, resumen) {
        const cb = (typeof copyToClipboard === 'function') ? copyToClipboard : null;
        const p = cb ? cb(text) : Promise.resolve(false);
        Promise.resolve(p).then((ok) => {
            if (ok) adviceOk(titulo, resumen);
            else adviceErr(titulo, 'No se pudo copiar');
        }).catch(() => adviceErr(titulo, 'No se pudo copiar'));
    }
    // Menu contextual del boton "Exportar" grande. Usa showMenu() que ya existe.
    function mostrarMenuExportarRiesgo() {
        const btn = byId('rondo-riesgo-exportar');
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const items = riesgoSubsetVisible();
        const n = items.length;
        showMenu(rect.left, rect.bottom + 4, [
            { id: 'riesgo-export-csv', icon: UIS.csv, label: 'CSV (' + n + ' zonas)' },
            { id: 'riesgo-export-geo', icon: UIS.export, label: 'GeoJSON (' + n + ' zonas)' },
            { id: 'riesgo-export-copiar', icon: UIS.copy, label: 'Copiar al portapapeles' },
        ]);
        // Delegamos click sobre el ctxEl.
        const handler = (e) => {
            const op = e.target.closest && e.target.closest('.op');
            if (!op) return;
            const acc = op.dataset.acc;
            if (acc === 'riesgo-export-csv') exportarRiesgoCSV();
            else if (acc === 'riesgo-export-geo') exportarRiesgoGeoJSON();
            else if (acc === 'riesgo-export-copiar') copiarRiesgoFiltrado();
            if (typeof hideMenu === 'function') hideMenu();
        };
        if (ctxEl) {
            ctxEl.removeEventListener('click', ctxEl._riesgoHandler);
            ctxEl._riesgoHandler = handler;
            ctxEl.addEventListener('click', handler);
        }
    }
    // Abre la ventana de Ajustes (helper para el empty state).
    function abrirAjustes() {
        const b = byId('rondo-cfg-btn');
        if (b) b.click();
    }
    async function reglaRiesgoSinSenal(st, prev, R, info, etq) {
        if (!APP.config.reglas.riesgoSinSenal) return;
        if (!APP.riesgo || !APP.riesgo.length) return;
        if (!prev) return;
        if (prev.estado === 'offline' || st.estado !== 'offline') return;
        if (st.edadMin < APP.config.offlineMin) return;
        const lat = (st.lat != null) ? st.lat : prev.lat;
        const lon = (st.lon != null) ? st.lon : prev.lon;
        if (lat == null || lon == null) return;
        // Reutiliza la zona ya buscada en evaluateUnit para esta transicion
        // (undefined = no se calculo antes; null = no habia zona).
        const z = (R._zRiesgoOffline !== undefined) ? R._zRiesgoOffline : puntoEnZonaDeRiesgo(lat, lon);
        if (!z) return;
        if (R.riesgoSinSenalAlerta) return;
        R.riesgoSinSenalAlerta = true;
        const etqTxt = z.municipio ? (z.municipio + ', ' + (z.estado || '')) : (z.estado || 'zona desconocida');
        pushAlert({
            regla: 'riesgoSinSenal', sev: 'critico', clave: info.clave, eco: info.eco, icono: 'riesgo',
            titulo: 'PERDIO SENAL EN ZONA DE RIESGO \u00b7 ' + etq,
            detalle: 'Ultima posicion en ' + etqTxt + ' (score ' + z.score + '/100). Sin reporte hace ' + ageText(st.edadMin) + '.',
            hablar: 'Atencion critica. La unidad ' + etq + ' perdio senal en zona de riesgo'
        });
    }

    // v5.14: regla predictiva. Dispara cuando una unidad EN MOVIMIENTO se
    // esta ACERCANDO a una zona de riesgo de alto score, ANTES de que
    // entre o pierda senal. Pensado para horarios nocturnos donde el
    // riesgo de detenerse en un deshuesadero/lote aislado es alto.
    //
    // Condiciones:
    //  - regla activa en config.reglas.riesgoPredict
    //  - APP.riesgo cargado y con score >= riesgoPredictMinScore
    //  - unidad no offline, velocidad >= riesgoPredictVelMin km/h
    //  - (opcional) hora actual dentro de la ventana nocturna
    //  - distancia ACTUAL a la zona <= (radio*mul + buffer)
    //  - distancia PREVIA estrictamente MAYOR que la actual (se acerca)
    //  - sin alerta reciente para esta misma unidad+zona (cooldown)
    async function reglaRiesgoPredict(st, prev, R, info, etq) {
        if (!APP.config.reglas.riesgoPredict) return;
        if (!APP.riesgo || !APP.riesgo.length) return;
        if (!prev) return;
        if (st.estado === 'offline') return;
        if (st.lat == null || st.lon == null) return;
        if (prev.lat == null || prev.lon == null) return;
        const velMin = +APP.config.riesgoPredictVelMin || 5;
        if (!isFinite(st.vel) || st.vel < velMin) return;
        // v5.14: ventana nocturna opcional.
        if (APP.config.riesgoPredictNocturno) {
            const d = parseHora('c-riesgo-pre-desde', APP.config.riesgoPredictNocturnoDesde || '22:00');
            const h = parseHora('c-riesgo-pre-hasta', APP.config.riesgoPredictNocturnoHasta || '05:00');
            const ahora = ahoraMinutos();
            if (!d || !h || !enVentanaHoraria(ahora, d, h)) return;
        }
        const minScore = Math.max(0, +APP.config.riesgoPredictMinScore || 4);
        const mul = +APP.config.riesgoRadioMul || 1;
        const bufferM = Math.max(0, +APP.config.riesgoPredictBufferM || 500);
        // Busca la zona mas cercana que cumpla el umbral.
        let candidata = null;
        for (let i = 0; i < APP.riesgo.length; i++) {
            const z = APP.riesgo[i];
            if (!z || !z.centro || !Array.isArray(z.centro)) continue;
            if (!(z.radio_m > 0)) continue;
            if (typeof z.score !== 'number' || z.score < minScore) continue;
            const dKm = haversine(st.lat, st.lon, z.centro[0], z.centro[1]);
            const dM = dKm * 1000;
            const radioM = z.radio_m * mul;
            // La zona "cuenta" para esta regla si estamos a menos de radio+buffer.
            if (dM > radioM + bufferM) continue;
            if (!candidata || dM < candidata.dist) {
                candidata = { id: z.id, estado: z.estado, municipio: z.municipio,
                    score: z.score, fuente: z.fuente, dist: dM, radio: radioM };
            }
        }
        if (!candidata) return;
        // Distancia previa: se recalcula con la zona completa (no con el
        // resumen `candidata`, que no lleva centro) para no perder precision.
        const zObj = APP.riesgo.find((z) => z && z.id === candidata.id);
        let distPrev = Infinity;
        if (zObj && zObj.centro) {
            const prevKm = haversine(prev.lat, prev.lon, zObj.centro[0], zObj.centro[1]);
            distPrev = prevKm * 1000;
        }
        // Si no se acerca (distPrev no es estrictamente mayor), descartar.
        // Caso limite: misma posicion -> no alertar.
        if (!(distPrev > candidata.dist + 5)) return;
        // Cooldown por unidad+zona (mas corto que el global).
        const ck = info.clave + '::riesgoPredict::' + candidata.id;
        const cd = Math.max(60, (+APP.config.riesgoPredictCooldownS || 300)) * 1000;
        if (APP.cooldowns[ck] && Date.now() - APP.cooldowns[ck] < cd) return;
        APP.cooldowns[ck] = Date.now();
        const etqTxt = candidata.municipio ? (candidata.municipio + ', ' + (candidata.estado || '')) : (candidata.estado || 'zona desconocida');
        const acercarse = Math.max(0, Math.round(distPrev - candidata.dist));
        pushAlert({
            regla: 'riesgoPredict', sev: 'medio', clave: info.clave, eco: info.eco, icono: 'riesgo',
            titulo: 'ACERCANDOSE A ZONA DE RIESGO \u00b7 ' + etq,
            detalle: 'A ' + Math.round(candidata.dist) + ' m de zona en ' + etqTxt +
                ' (score ' + candidata.score + '/100, radio ' + Math.round(candidata.radio) + ' m). ' +
                'Se acerco ' + acercarse + ' m desde la ultima posicion. Velocidad: ' + Math.round(st.vel) + ' km/h.',
            hablar: 'Atencion. La unidad ' + etq + ' se aproxima a una zona de riesgo'
        });
    }
    // Helpers para la ventana nocturna de la regla predictiva.
    function parseHora(id, fallback) {
        const m = String(fallback || '').match(/^(\d{1,2}):(\d{2})$/);
        if (m) return (+m[1]) * 60 + (+m[2]);
        return null;
    }
    function ahoraMinutos() {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
    }
    function enVentanaHoraria(ahora, desdeMin, hastaMin) {
        if (desdeMin == null || hastaMin == null) return false;
        if (desdeMin === hastaMin) return true;
        // Ventana que cruza medianoche (ej 22:00 -> 05:00).
        if (desdeMin < hastaMin) return ahora >= desdeMin && ahora < hastaMin;
        return ahora >= desdeMin || ahora < hastaMin;
    }

    async function reglaOffline(st, prev, R, info, etq) {
        if (!APP.config.reglas.offline) return;
        if (prev && prev.estado !== 'offline' && st.estado === 'offline') {
            // Si la transicion cae en zona de riesgo, el aviso critico de
            // reglaRiesgoSinSenal ya da el contexto; no se duplica con el
            // generico "SIN SENAL" en el mismo tick.
            if (R._zRiesgoOffline) return;
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
        // v5.15.2: umbral sobre la velocidad suavizada para que los picos de
        // ruido del GPS no reinicien el temporizador de detencion.
        if (st.online && velSuavizada(info, st) <= 1.5) {
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
                // Presupuesto de geocodificacion por refresco (ver refresh):
                // evita que muchas detenciones simultaneas encadenen llamadas
                // a Nominatim y alarguen el refresco por encima del poll.
                const geoOk = (APP.geoRestante == null) || (APP.geoRestante > 0);
                if (ctxTxt == null && ctx.quotaGeo && geoOk) {
                    if (APP.geoRestante != null) APP.geoRestante--;
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
            // v5.15: una zona es "esperada" si coincide con cualquiera de las
            // paradas del plan multipunto (geocercas incluidas).
            const plan = planDe(info);
            let esperada = false;
            if (plan && plan.paradas) {
                for (let i = 0; i < plan.paradas.length; i++) {
                    const t = norm(plan.paradas[i].texto || '');
                    if (!t) continue;
                    if (norm(z).indexOf(t) >= 0 || t.indexOf(norm(z)) >= 0) { esperada = true; break; }
                }
            }
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
        if (!APP.config.reglas.geocerca) return;
        // v6.0.2: histeresis. Un cambio de geocerca solo se confirma si se
        // sostiene geocercaEstableSeg segundos; asi el GPS que oscila en el
        // borde no genera ENTER/EXIT repetidos.
        const actual = R.zona || '';
        if (R.zonaEst == null) R.zonaEst = actual;
        if (actual === R.zonaEst) {
            R.zonaPend = null;
            return;
        }
        if (R.zonaPend !== actual) {
            R.zonaPend = actual;
            R.zonaPendDesde = Date.now();
            return;
        }
        const minSeg = Math.max(2, +APP.config.geocercaEstableSeg || 15);
        if ((Date.now() - R.zonaPendDesde) / 1000 < minSeg) return;
        const previo = R.zonaEst || '';
        R.zonaEst = actual;
        R.zonaPend = null;
        if (actual) {
            pushAlert({
                regla: 'geocerca', sev: 'bajo', clave: info.clave, eco: info.eco,
                titulo: 'ENTRO \u00b7 ' + etq,
                detalle: 'entro a ' + actual + ' \u00b7 ' + Math.round(st.vel) + ' km/h'
            });
        } else if (previo) {
            pushAlert({
                regla: 'geocerca', sev: 'bajo', clave: info.clave, eco: info.eco,
                titulo: 'SALIO \u00b7 ' + etq,
                detalle: 'salio de ' + previo + ' \u00b7 ' + Math.round(st.vel) + ' km/h'
            });
        }
    }
    // v5.14.4: regla "detenida en geocerca". Complementa reglaGeocerca
    // (que avisa al ENTRAR/SALIR) y reglaDetenido (que avisa al llevar
    // parado N min en general). Esta es mas especifica: detecta el caso
    // "unidad parada DENTRO de una geocerca" y lo comunica con el
    // texto literal pedido: "La unidad X se encuentra detenida en la
    // geocerca Y".
    //
    // Dispara una sola vez por episodio (cuando la unidad lleva
    // geocercaDetenidoMin minutos parada dentro de una geocerca). Si la
    // unidad se mueve o sale de la geocerca, rearma para volver a
    // avisar en el siguiente episodio.
    function reglaGeocercaDetenido(st, R, info, etq) {
        if (!APP.config.reglas.geocercaDetenido) return;
        if (!st.online) { R.geoDetenidoDesde = null; return; }
        // Reset: si se mueve o sale de la geocerca, vuelve a contar.
        if (velSuavizada(info, st) > 1.5 || !R.zona) { R.geoDetenidoDesde = null; return; }
        if (!R.geoDetenidoDesde) R.geoDetenidoDesde = Date.now() / 1000;
        const minDet = Math.max(1, +APP.config.geocercaDetenidoMin || 5);
        const m = (Date.now() / 1000 - R.geoDetenidoDesde) / 60;
        if (m < minDet) return;
        if (R.geoDetenidoAlerta) return;
        R.geoDetenidoAlerta = true;
        pushAlert({
            regla: 'geocercaDetenido', sev: 'bajo', clave: info.clave, eco: info.eco,
            titulo: 'DETENIDA EN GEOCERCA \u00b7 ' + etq,
            detalle: 'La unidad ' + etq + ' se encuentra detenida en la geocerca ' + R.zona +
                ' \u00b7 hace ' + Math.round(m) + ' min',
            hablar: 'La unidad ' + etq + ' se encuentra detenida en la geocerca ' + R.zona
        });
    }
    async function reglaDestino(st, R, info, etq) {
        if (!APP.config.reglas.destino) return;
        const plan = planDe(info);
        if (!plan || !plan.paradas || !plan.paradas.length || !st.online) return;
        const ruta = rutaDe(info);
        const paradas = (ruta && ruta.paradas && ruta.paradas.length) ? ruta.paradas : null;
        const llegadaM = Math.max(80, +APP.config.paradaLlegadaM || 150);
        if (paradas && st.lat != null && st.lon != null) {
            const memo = APP.snapMemo[info.clave] || (APP.snapMemo[info.clave] = { idx: 0 });
            const s = snapRuta(st.lat, st.lon, ruta, memo);
            if (s) {
                if (!Array.isArray(R.llegadas) || R.llegadas.length !== paradas.length) {
                    R.llegadas = new Array(paradas.length);
                    for (let i = 0; i < paradas.length; i++) R.llegadas[i] = false;
                }
                for (let i = 0; i < paradas.length; i++) {
                    if (R.llegadas[i]) continue;
                    const p = paradas[i];
                    if (p.acum == null) continue;
                    const esUlt = (i === paradas.length - 1);
                    const alcanzada = (s.recorrido >= p.acum - llegadaM) ||
                        (esUlt && s.dist <= llegadaM);
                    if (!alcanzada) continue;
                    R.llegadas[i] = true;
                    R.paradaActual = i + 1;
                    R.enDestino = true;
                    const restantes = paradas.length - i - 1;
                    pushAlert({
                        regla: 'destino', sev: esUlt ? 'ok' : 'bajo', clave: info.clave, eco: info.eco,
                        titulo: (esUlt ? 'LLEGO A DESTINO' : 'LLEGO A PARADA ' + (i + 1)) + ' \u00b7 ' + etq,
                        detalle: (p.texto || ('parada ' + (i + 1))) +
                            (esUlt ? '' : ' \u00b7 faltan ' + restantes + ' parada(s)'),
                        hablar: esUlt
                            ? ('La unidad ' + etq + ' llego a su destino')
                            : ('La unidad ' + etq + ' llego a la parada ' + (i + 1))
                    });
                }
                // Circuito completado: todas las paradas visitadas y de
                // regreso en el origen. No es un viaje cancelado.
                if (ruta.circuito && R.llegadas.length === paradas.length && R.llegadas.every(Boolean)) {
                    const dOrigen = haversine(st.lat, st.lon, ruta.origen.lat, ruta.origen.lon);
                    if (dOrigen <= Math.max(APP.config.retornoM, llegadaM) && !R.circuitoAlerta) {
                        R.circuitoAlerta = true;
                        pushAlert({
                            regla: 'retorno', sev: 'ok', clave: info.clave, eco: info.eco,
                            titulo: 'REGRESO A BASE \u00b7 ' + etq,
                            detalle: 'circuito completado \u00b7 ' + paradas.length + ' parada(s) visitada(s)',
                            hablar: 'La unidad ' + etq + ' completo su circuito y regreso a la base'
                        });
                    }
                }
                return;
            }
        }
        // Fallback legacy: sin ruta trazada, geocoding inverso contra la
        // primera parada del plan.
        const primera = plan.paradas[0].texto || '';
        if (!primera) return;
        // Sin presupuesto de geocodificacion en este refresco: se reintenta en
        // el siguiente tick en vez de bloquear la cola de unidades.
        if (APP.geoRestante != null && APP.geoRestante <= 0) return;
        if (APP.geoRestante != null) APP.geoRestante--;
        const geo = await reverseGeocode(st.lat, st.lon);
        const ciudad = geo ? geo.ciudad : '';
        const enDestino = !!(ciudad && (norm(ciudad).indexOf(norm(primera)) >= 0 || norm(primera).indexOf(norm(ciudad)) >= 0));
        if (enDestino && !R.enDestino) {
            R.enDestino = true;
            pushAlert({
                regla: 'destino', sev: 'ok', clave: info.clave, eco: info.eco,
                titulo: 'LLEGO A DESTINO \u00b7 ' + etq,
                detalle: 'en ' + ciudad,
                hablar: 'La unidad ' + etq + ' llego a su destino'
            });
        } else if (!enDestino && R.enDestino && st.vel > 10) {
            R.enDestino = false;
            pushAlert({
                regla: 'destino', sev: 'bajo', clave: info.clave, eco: info.eco,
                titulo: 'EN REGRESO \u00b7 ' + etq,
                detalle: 'salio de ' + primera + ' \u00b7 ' + Math.round(st.vel) + ' km/h',
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
        if (!st.online || velSuavizada(info, st) > 1.5) { R.demoraBaseAlerta = 0; return; }
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
            let umbral = +APP.config.desvioM || 250;
            let tolerado = false;
            // v5.15: tolerancia de municipio. Si la unidad sigue dentro de un
            // municipio por el que pasa su ruta, el alejamiento no se marca
            // como desvio mientras no supere desvioMunicipioM.
            if (s.dist > umbral && APP.config.desvioMunicipio) {
                const mun = municipioEn(st.lat, st.lon);
                if (mun && municipioDeRuta(ruta, mun)) {
                    const cap = Math.max(umbral, +APP.config.desvioMunicipioM || 3000);
                    if (s.dist <= cap) tolerado = true;
                    else umbral = cap;
                }
            }
            R.desvioTolerado = tolerado;
            if (!tolerado && s.dist > umbral) {
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
            } else if (s.dist <= umbral * 0.8) {
                // Histeresis: para limpiar el desvio hay que volver bien al eje.
                R.desviadoDesde = null;
            }
        }

        if (APP.config.reglas.retorno) {
            if (s.progreso > (R.progMax || 0)) R.progMax = s.progreso;
            const dOrigen = haversine(st.lat, st.lon, ruta.origen.lat, ruta.origen.lon);
            const dDestino = haversine(st.lat, st.lon, ruta.destino.lat, ruta.destino.lon);
            const retrocedio = (R.progMax - s.progreso) >= (APP.config.retornoPct / 100);
            const enOrigen = dOrigen <= APP.config.retornoM && R.progMax >= 0.2;
            // Marca "llego" (lo usa la regla de demora en base) sin duplicar
            // la alerta: la llegada a cada parada la emite reglaDestino.
            const paradas = ruta.paradas || [];
            if (paradas.length) {
                const lm = Math.max(80, +APP.config.paradaLlegadaM || 150);
                let lleg = 0;
                for (let i = 0; i < paradas.length; i++) {
                    if (paradas[i].acum != null && s.recorrido >= paradas[i].acum - lm) lleg++;
                }
                if (lleg >= paradas.length) R.llego = true;
            } else if (dDestino <= APP.config.retornoM && s.progreso >= 0.85) {
                R.llego = true;
            }
            // En un plan de circuito volver al origen es lo esperado: no se
            // reporta como "viaje cancelado" (de eso se encarga reglaDestino).
            if (!ruta.circuito && !R.retornoAlerta && !R.llego && R.progMax >= 0.15 && (enOrigen || retrocedio)) {
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
        // v5.15.2: media exponencial de velocidad (suaviza GPS y ETA).
        if (clave && Number.isFinite(st.vel)) {
            const pv = APP.velSuave[clave];
            APP.velSuave[clave] = (pv == null) ? st.vel : (pv * 0.65 + st.vel * 0.35);
        }
        const R = {
            estado: st.estado, t: st.t, vel: st.vel, lat: st.lat, lon: st.lon,
            zona: zoneAt(st.lat, st.lon),
            // v6.0.2: geocerca "estabilizada" para avisos ENTER/EXIT (con
            // histeresis) y candidato pendiente.
            zonaEst: prev ? (prev.zonaEst !== undefined ? prev.zonaEst : (prev.zona || '')) : null,
            zonaPend: prev ? (prev.zonaPend !== undefined ? prev.zonaPend : null) : null,
            zonaPendDesde: prev ? (prev.zonaPendDesde || 0) : 0,
            detenidoDesde: prev ? prev.detenidoDesde : null,
            zonaExt: prev ? prev.zonaExt : null,
            enDestino: prev ? prev.enDestino : false,
            descoAlerta: prev ? prev.descoAlerta : false,
            desviadoDesde: prev ? prev.desviadoDesde : null,
            progMax: prev ? prev.progMax : 0,
            retornoAlerta: prev ? prev.retornoAlerta : false,
            rumboOpDesde: prev ? prev.rumboOpDesde : null,
            demoraBaseAlerta: prev ? (prev.demoraBaseAlerta || 0) : 0,
            llego: prev ? prev.llego : false,
            riesgoSinSenalAlerta: prev ? prev.riesgoSinSenalAlerta : false,
            // v5.14.4: estado para la regla "detenida en geocerca".
            // geoDetenidoDesde: timestamp del inicio del episodio de
            //   detencion dentro de geocerca (null si no esta).
            // geoDetenidoAlerta: true si ya se emitio la alerta para
            //   este episodio; rearma cuando sale o se mueve.
            geoDetenidoDesde: prev ? prev.geoDetenidoDesde : null,
            geoDetenidoAlerta: prev ? !!prev.geoDetenidoAlerta : false,
            // v5.15: seguimiento de paradas del plan multipunto.
            llegadas: (prev && Array.isArray(prev.llegadas)) ? prev.llegadas : null,
            paradaActual: prev ? (prev.paradaActual || 0) : 0,
            circuitoAlerta: prev ? !!prev.circuitoAlerta : false,
            desvioTolerado: false
        };
        try {
            // Transicion a offline: se busca una sola vez si la ultima
            // posicion cae en zona de riesgo. reglaOffline usa el resultado
            // para no duplicar el aviso y reglaRiesgoSinSenal lo reutiliza.
            if (prev && prev.estado !== 'offline' && st.estado === 'offline' &&
                st.edadMin >= APP.config.offlineMin) {
                const latT = (st.lat != null) ? st.lat : prev.lat;
                const lonT = (st.lon != null) ? st.lon : prev.lon;
                R._zRiesgoOffline = (APP.config.reglas.riesgoSinSenal &&
                    APP.riesgo && APP.riesgo.length && latT != null && lonT != null)
                    ? puntoEnZonaDeRiesgo(latT, lonT)
                    : null;
            }
            await reglaOffline(st, prev, R, info, etq);
            // Si la unidad vuelve a reportar, rearma la alerta de desconexion
            // aunque la regla general este desactivada.
            if (st.estado !== 'offline') R.descoAlerta = false;
            if (st.estado !== 'offline') R.riesgoSinSenalAlerta = false;
            await reglaGpsPerdido(st, prev, R, info, etq);
            await reglaDetenido(u, st, R, info, etq, ctx);
            reglaZona(st, R, info, etq);
            reglaGeocerca(st, prev, R, info, etq);
            // v5.14.4: regla "detenida en geocerca" (mensaje literal
            // "La unidad X se encuentra detenida en la geocerca Y").
            // Una sola vez por episodio.
            reglaGeocercaDetenido(st, R, info, etq);
            await reglaDestino(st, R, info, etq);
            await reglaDesconexion(st, R, info, etq);
            await reglaRiesgoSinSenal(st, prev, R, info, etq);
            await reglaRiesgoPredict(st, prev, R, info, etq);
            reglaVelocidad(st, R, info, etq);
            reglaDemoraBase(st, R, info, etq);
            reglaRuta(st, R, info, etq);
        } catch (e) {
            APP.stats.erroresReglas = (APP.stats.erroresReglas || 0) + 1;
            if (APP.unlocked) console.warn('[Rondo] regla', clave, e && e.message);
        }
        // Campo interno de un solo tick: no debe persistirse en el memo.
        delete R._zRiesgoOffline;
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
            // Presupuesto de geocodificacion inversa por refresco: los avisos
            // con contexto de municipio (detenido, destino) no deben encadenar
            // llamadas a Nominatim para toda la flota y retrasar el refresco.
            APP.geoRestante = 8;
            const ubicaciones = {};
            const nuevas = {};
            // El recorrido se calcula una sola vez (antes se llamaba a
            // shouldWatch/unitState dos veces por unidad y por refresco).
            const watched = [];
            let onNow = 0;
            for (let i = 0; i < unidades.length; i++) {
                const u = unidades[i];
                if (!shouldWatch(u)) continue;
                watched.push(u);
                const info = parseUnitName(u);
                const st = unitState(u);
                if (st.online) onNow++;
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
        // Eventos y prototype del REALM DE LA PAGINA (PAGE): en el sandbox de
        // Tampermonkey los constructores propios no los reconoce React y la
        // automatizacion de ventanas deja de funcionar.
        const d = Object.getOwnPropertyDescriptor(PAGE.HTMLInputElement.prototype, 'value');
        if (d && d.set) d.set.call(input, texto); else input.value = texto;
        input.dispatchEvent(new PAGE.Event('input', { bubbles: true }));
        input.dispatchEvent(new PAGE.Event('change', { bubbles: true }));
        ['keydown', 'keyup'].forEach((t) => {
            try { input.dispatchEvent(new PAGE.KeyboardEvent(t, { bubbles: true, key: 'Enter', keyCode: 13 })); } catch (_) { /* noop */ }
        });
    }
    function clearInput(input) {
        const d = Object.getOwnPropertyDescriptor(PAGE.HTMLInputElement.prototype, 'value');
        if (d && d.set) d.set.call(input, ''); else input.value = '';
        input.dispatchEvent(new PAGE.Event('input', { bubbles: true }));
        input.dispatchEvent(new PAGE.Event('change', { bubbles: true }));
    }
    // Devuelve true si el elemento pertenece a la UI del propio script (panel,
    // barra, modales, etc.), para no confundirlo con el DOM nativo de Wialon.
    function esUIPropia(el) {
        try {
            return !!(el && el.closest && el.closest('#rondo-panel,#rondo-barra,#rondo-modal,#rondo-config,#rondo-ayuda,#rondo-contexto,#rondo-toasts,#rondo-aviso,#rondo-rail,#rondo-dialog,#rondo-plan-modal,#rondo-carga-modal'));
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
            // MouseEvent del realm de la pagina (PAGE) para que React lo acepte.
            return new PAGE.MouseEvent(tipo, Object.assign({
                bubbles: true, cancelable: true, view: PAGE,
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
                    // DOMMatrixReadOnly del realm de la pagina; si no existe,
                    // cae al try/catch y se usa left/top.
                    const DMR = PAGE.DOMMatrixReadOnly || DOMMatrixReadOnly;
                    const m = new DMR(t);
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
        btn.dispatchEvent(new PAGE.MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
    }
    function closeAllWindows() {
        document.querySelectorAll('[id$="_pursuit_win_close_id"]').forEach((b) => {
            b.dispatchEvent(new PAGE.MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        // Si estaban ocultas, al cerrarlas el modo deja de aplicar.
        _ventanasOcultas = false;
        pintarBotonVentanas();
    }
    // v6.0.9: el boton "Ocultar" (junto a Automatizar) oculta o vuelve a
    // mostrar las ventanas de unidades abiertas, sin cerrarlas.
    let _ventanasOcultas = false;
    function ventanasOcultasOn() { return _ventanasOcultas; }
    function pintarBotonVentanas() {
        const btn = byId('rondo-sb-panel');
        if (!btn) return;
        const icon = btn.querySelector('.rondo-usym');
        const lbl = btn.querySelector('.tile-lbl');
        if (_ventanasOcultas) {
            if (icon) icon.innerHTML = UIS.panel;
            if (lbl) lbl.textContent = 'Mostrar';
            btn.title = 'Mostrar las ventanas de unidades que ocultaste';
            btn.classList.add('activo');
        } else {
            if (icon) icon.innerHTML = UIS.collapse;
            if (lbl) lbl.textContent = 'Ocultar';
            btn.title = 'Ocultar las ventanas de unidades abiertas (sin cerrarlas)';
            btn.classList.remove('activo');
        }
    }
    function ocultarVentanas() {
        const list = openWindows();
        if (!list.length) { adviceWarn('Sin ventanas', 'No hay ventanas de unidades abiertas.'); return; }
        list.forEach((v) => {
            if (!v.cont) return;
            v.cont.dataset.rondoOculta = '1';
            v.cont.style.display = 'none';
        });
        _ventanasOcultas = true;
        pintarBotonVentanas();
        advice('Ventanas ocultas', list.length + ' ventana(s) · pulsa de nuevo para mostrarlas');
    }
    function mostrarVentanas() {
        const list = openWindows();
        list.forEach((v) => {
            if (!v.cont) return;
            if (v.cont.dataset.rondoOculta) { v.cont.style.display = ''; delete v.cont.dataset.rondoOculta; }
        });
        _ventanasOcultas = false;
        pintarBotonVentanas();
        advice('Ventanas visibles', list.length + ' ventana(s)');
    }
    function alternarVentanas() {
        if (_ventanasOcultas) mostrarVentanas(); else ocultarVentanas();
    }
    // Mantiene ocultas las ventanas nuevas que se abran mientras el modo este
    // activo (se llama desde el intervalo de 1 s).
    function rxVentanasSync() {
        if (!_ventanasOcultas) return;
        openWindows().forEach((v) => {
            if (v.cont && !v.cont.dataset.rondoOculta) {
                v.cont.dataset.rondoOculta = '1';
                v.cont.style.display = 'none';
            }
        });
    }
    // v6.0.10: botones +/- para agrandar o encoger las ventanas abiertas.
    const RX_VENTANA_PASO = 80;
    function rxDesplazarVentana(c, dx, dy) {
        const cs = getComputedStyle(c);
        const t = cs.transform;
        if (t && t !== 'none' && t.indexOf('matrix') === 0) {
            try {
                const DMR = PAGE.DOMMatrixReadOnly || DOMMatrixReadOnly;
                const m = new DMR(t);
                c.style.transform = 'translate(' + (m.m41 + dx) + 'px,' + (m.m42 + dy) + 'px)';
                return;
            } catch (_) { /* fallback a left/top */ }
        }
        c.style.left = ((parseFloat(cs.left) || 0) + dx) + 'px';
        c.style.top = ((parseFloat(cs.top) || 0) + dy) + 'px';
    }
    function rxAjustarVentanas(dir) {
        const list = openWindows();
        if (!list.length) { adviceWarn('Sin ventanas', 'No hay ventanas de unidades abiertas.'); return; }
        const d = dir >= 0 ? 1 : -1;
        const vw = window.innerWidth, vh = window.innerHeight;
        let ajustadas = 0;
        list.forEach((v) => {
            const c = v.cont;
            if (!c) return;
            const r = c.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0) return; // oculta o sin tamano
            const w = Math.round(clamp(r.width + d * RX_VENTANA_PASO, 260, Math.max(260, vw - 20)));
            const h = Math.round(clamp(r.height + d * RX_VENTANA_PASO, 170, Math.max(170, vh - 20)));
            if (w === Math.round(r.width) && h === Math.round(r.height)) return;
            c.style.width = w + 'px';
            c.style.height = h + 'px';
            // Reubica si se salio por abajo/derecha (asi no se pierde).
            const r2 = c.getBoundingClientRect();
            let nx = r2.left, ny = r2.top;
            if (nx + w > vw - 4) nx = Math.max(4, vw - 4 - w);
            if (ny + h > vh - 4) ny = Math.max(4, vh - 4 - h);
            if (nx < 4) nx = 4;
            if (ny < 4) ny = 4;
            if (Math.abs(nx - r2.left) > 1 || Math.abs(ny - r2.top) > 1) rxDesplazarVentana(c, nx - r2.left, ny - r2.top);
            ajustadas++;
        });
        // Avisa a los mapas (Leaflet) de que el contenedor cambio de tamano.
        try {
            const W = PAGE || window;
            W.dispatchEvent(new (W.Event || Event)('resize'));
        } catch (_) { /* noop */ }
        if (ajustadas) advice(d >= 0 ? 'Ventanas mas grandes' : 'Ventanas mas pequenas', ajustadas + ' ventana(s)');
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
        btn.innerHTML = '<span class="rondo-usym">' + UIS.warn + '</span> Confirmar';
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
        // v5.15: si el texto pegado cambia el destino, descarta el plan
        // estructurado previo para que el texto sea la fuente del plan.
        const it = unitByEco(eco);
        if (it && APP.planes[it.info.clave] && APP.watchMap[eco] !== destinoPrev) {
            delete APP.planes[it.info.clave];
            guardarPlanes();
        }
        guardarOrden();
        guardarLista();
        // Si se anade o cambia un destino y esta el auto-trazado activo,
        // se recalcula la ruta de esa unidad en background.
        if (APP.config.autoRuta && APP.watchMap[eco] && APP.watchMap[eco] !== destinoPrev) {
            const it = unitByEco(eco);
            if (it) {
                const r = rutaDe(it.info);
                if (!r || r.destinoTexto !== watchDest(it.info)) {
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
        // v5.15: elimina tambien el plan estructurado de esa unidad.
        const it = unitByEco(eco);
        const clave = it ? it.info.clave : eco;
        if (APP.planes[clave]) { delete APP.planes[clave]; guardarPlanes(); }
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
    // Resumen legible del plan de una unidad para la lista (chips de paradas).
    function resumenPlanHTML(eco) {
        const it = unitByEco(eco);
        let plan = it ? planDe(it.info) : null;
        if (!plan) plan = APP.planes[eco] || null;
        if (!plan || !plan.paradas || !plan.paradas.length) {
            return '<span class="rondo-dest-vacio">sin destino</span>';
        }
        const paradas = plan.paradas;
        const chips = paradas.slice(0, 3).map((p) => {
            const pre = p.tipo === 'geocerca' ? 'geo:' : (p.tipo === 'municipio' ? 'mun:' : (p.tipo === 'coord' ? '' : ''));
            return '<span class="rondo-dest-chip" title="' + esc(p.texto || '') + '">' + esc(pre + (p.texto || '')) + '</span>';
        }).join('');
        const mas = paradas.length > 3 ? '<span class="rondo-dest-mas" title="' + paradas.length + ' paradas">+' + (paradas.length - 3) + '</span>' : '';
        const modo = plan.modo === 'optimo' ? '<span class="rondo-dest-modo" title="Mejor ruta (optimiza y cierra el circuito)">mejor ruta</span>' : '';
        return chips + mas + modo;
    }
    function pintarModalLista() {
        const body = byId('rondo-modal-lista');
        if (!body) return;
        sincronizarOrden();
        marcarModoOrden(APP.ordenModo || '');
        const ecos = APP.orden.slice();
        const cnt = byId('rondo-modal-count');
        if (cnt) cnt.textContent = ecos.length;
        if (!ecos.length) {
            body.innerHTML = '<div class="lista-empty">Lista vacía. Pega arriba o añade una unidad.</div>';
            return;
        }
        body.innerHTML = ecos.map((eco, i) => (
            '<div class="lista-row" data-eco="' + esc(eco) + '">' +
            '<span class="rondo-drag-handle" draggable="true" title="Arrastrar para cambiar el orden">⠿</span>' +
            '<span class="orden-num">' + (i + 1) + '</span>' +
            '<span class="eco">' + esc(eco) + '</span>' +
            '<span class="rondo-dest-resumen">' + resumenPlanHTML(eco) + '</span>' +
            '<button class="mini rondo-plan-open" data-eco="' + esc(eco) + '" title="Editar destinos y paradas (geocercas, municipios, lugares)"><span class="rondo-usym">' + UIS.route + '</span> Paradas</button>' +
            '<button class="rondo-del" data-eco="' + esc(eco) + '" draggable="false" title="Quitar de la lista"><span class="rondo-usym">' + UIS.close + '</span></button>' +
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

    /* ====================== EDITOR DE PARADAS (v5.15) ======================
     * Permite construir un plan multipunto por unidad: anadir geocercas,
     * municipios o lugares (con sugerencias difusas), reordenarlos, fijarlos
     * y elegir entre recorrido secuencial o "mejor ruta".
     */
    let _planEdit = null;
    let _rpmOsmTimer = null;
    let _rpmSugList = [];
    let _rpmSugIdx = -1;
    // v6.0.9: posicion y tamano del editor multipunto. Se conserva durante la
    // sesion para que el operador no tenga que recolocarlo cada vez.
    let _rpmWin = { dx: 0, dy: 0, w: null, h: null };
    const RPM_WIN_KEY = 'rondo.api.s.rpmWin.v2';
    function rpmWinCargar() {
        try {
            const j = JSON.parse(sessionStorage.getItem(RPM_WIN_KEY) || 'null');
            if (j && typeof j === 'object') {
                _rpmWin = {
                    dx: Number(j.dx) || 0,
                    dy: Number(j.dy) || 0,
                    w: Number(j.w) > 0 ? Number(j.w) : null,
                    h: Number(j.h) > 0 ? Number(j.h) : null
                };
            }
        } catch (_) { /* noop */ }
    }
    function rpmWinGuardar() {
        try { sessionStorage.setItem(RPM_WIN_KEY, JSON.stringify(_rpmWin)); } catch (_) { /* noop */ }
    }
    function rpmAplicarWin(el) {
        const card = el.querySelector('.rpm-card');
        if (!card) return;
        if (_rpmWin.w) card.style.width = _rpmWin.w + 'px';
        if (_rpmWin.h) card.style.height = _rpmWin.h + 'px';
        rpmClampWin(card);
        card.style.transform = 'translate(' + _rpmWin.dx + 'px,' + _rpmWin.dy + 'px)';
    }
    // El modal centra la tarjeta con flex; el desplazamiento se aplica con
    // transform. Aqui se acota para que nunca quede fuera de la pantalla.
    function rpmClampWin(card) {
        const vw = window.innerWidth, vh = window.innerHeight;
        const w = card.offsetWidth || 0, h = card.offsetHeight || 0;
        const cx = vw / 2, cy = vh / 2;
        const minDX = 8 - (cx - w / 2), maxDX = (vw - 8) - (cx + w / 2);
        const minDY = 8 - (cy - h / 2), maxDY = (vh - 8) - (cy + h / 2);
        _rpmWin.dx = (minDX <= maxDX) ? clamp(_rpmWin.dx || 0, minDX, maxDX) : Math.round(minDX);
        _rpmWin.dy = (minDY <= maxDY) ? clamp(_rpmWin.dy || 0, minDY, maxDY) : Math.round(minDY);
    }
    function rpmMoverWin(card) {
        card.style.transform = 'translate(' + _rpmWin.dx + 'px,' + _rpmWin.dy + 'px)';
    }
    function rpmBindWin(el) {
        const card = el.querySelector('.rpm-card');
        if (!card) return;
        const head = card.querySelector('.rpm-head');
        const grip = card.querySelector('.rpm-resize');
        if (head) {
            let drag = null;
            head.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('button')) return;
                drag = { x: e.clientX, y: e.clientY, dx: _rpmWin.dx || 0, dy: _rpmWin.dy || 0 };
                card.classList.add('moviendo');
                try { head.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
                e.preventDefault();
            });
            head.addEventListener('pointermove', (e) => {
                if (!drag) return;
                _rpmWin.dx = drag.dx + (e.clientX - drag.x);
                _rpmWin.dy = drag.dy + (e.clientY - drag.y);
                rpmClampWin(card);
                rpmMoverWin(card);
            });
            const fin = () => {
                if (!drag) return;
                drag = null;
                card.classList.remove('moviendo');
                rpmWinGuardar();
            };
            head.addEventListener('pointerup', fin);
            head.addEventListener('pointercancel', fin);
        }
        if (grip) {
            let rs = null;
            grip.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                rs = { x: e.clientX, y: e.clientY, w: card.offsetWidth, h: card.offsetHeight };
                try { grip.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
                e.preventDefault();
                e.stopPropagation();
            });
            grip.addEventListener('pointermove', (e) => {
                if (!rs) return;
                const vw = window.innerWidth, vh = window.innerHeight;
                const w = clamp(rs.w + (e.clientX - rs.x), 360, Math.round(vw * 0.96));
                const h = clamp(rs.h + (e.clientY - rs.y), 320, Math.round(vh * 0.92));
                _rpmWin.w = Math.round(w);
                _rpmWin.h = Math.round(h);
                card.style.width = _rpmWin.w + 'px';
                card.style.height = _rpmWin.h + 'px';
                rpmClampWin(card);
                rpmMoverWin(card);
            });
            const fin = () => {
                if (!rs) return;
                rs = null;
                rpmWinGuardar();
            };
            grip.addEventListener('pointerup', fin);
            grip.addEventListener('pointercancel', fin);
        }
    }
    // Reordenar paradas arrastrando (con indicador de destino).
    function rpmBindReorden(el) {
        const cont = el.querySelector('.rpm-stops');
        if (!cont) return;
        const filas = Array.prototype.slice.call(cont.querySelectorAll('.rpm-stop'));
        if (filas.length < 2) return;
        filas.forEach((fila) => {
            fila.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('button')) return;
                e.preventDefault();
                const from = +fila.dataset.i;
                const x0 = e.clientX, y0 = e.clientY;
                const restantes = filas.filter((_, i) => i !== from);
                let ins = -1, activo = false;
                const marcar = (ev) => {
                    ins = restantes.length;
                    for (let i = 0; i < restantes.length; i++) {
                        const rr = restantes[i].getBoundingClientRect();
                        if (ev.clientY < rr.top + rr.height / 2) { ins = i; break; }
                    }
                    restantes.forEach((r, i) => r.classList.toggle('drop-target', i === ins));
                };
                const mover = (ev) => {
                    if (!activo) {
                        if (Math.abs(ev.clientY - y0) < 4 && Math.abs(ev.clientX - x0) < 4) return;
                        activo = true;
                        fila.classList.add('dragging');
                    }
                    marcar(ev);
                };
                const limpiar = () => {
                    fila.classList.remove('dragging');
                    restantes.forEach((r) => r.classList.remove('drop-target'));
                };
                const soltar = () => {
                    document.removeEventListener('pointermove', mover);
                    document.removeEventListener('pointerup', soltar);
                    document.removeEventListener('pointercancel', soltar);
                    limpiar();
                    if (!activo || ins < 0) return;
                    const arr = _planEdit && _planEdit.paradas;
                    if (!arr || from >= arr.length) return;
                    const item = arr.splice(from, 1)[0];
                    arr.splice(Math.min(ins, arr.length), 0, item);
                    renderEditorParadas();
                };
                document.addEventListener('pointermove', mover);
                document.addEventListener('pointerup', soltar);
                document.addEventListener('pointercancel', soltar);
            });
        });
    }
    function rpmResaltarSug() {
        const sug = byId('rpm-sug');
        if (!sug) return;
        sug.querySelectorAll('.rpm-sug-item').forEach((n) => n.classList.toggle('sel', +n.dataset.k === _rpmSugIdx));
        const sel = sug.querySelector('.rpm-sug-item.sel');
        if (sel && sel.scrollIntoView) { try { sel.scrollIntoView({ block: 'nearest' }); } catch (_) { /* noop */ } }
    }
    function rpmSeleccionarSug(k) {
        const item = _rpmSugList[k];
        if (!item) return;
        if (item.libre) agregarParadaEditor('lugar', item.texto, null);
        else agregarParadaEditor(item.tipoFinal, item.texto, item.coords, item.extra);
        _rpmSugList = [];
        _rpmSugIdx = -1;
    }
    function planModalEl() {
        let el = byId('rondo-plan-modal');
        if (el) return el;
        el = makeEl('div', { id: 'rondo-plan-modal' });
        document.body.appendChild(el);
        el.addEventListener('pointerdown', (e) => { if (e.target === el) cerrarEditorParadas(); });
        // Si cambia el tamano de la ventana, reacota la posicion guardada.
        window.addEventListener('resize', () => {
            const card = el.querySelector('.rpm-card');
            if (card) { rpmClampWin(card); rpmMoverWin(card); }
        });
        return el;
    }
    function cerrarEditorParadas() {
        const el = byId('rondo-plan-modal');
        if (el) el.classList.remove('abierto');
        _planEdit = null;
    }
    function abrirEditorParadas(eco, engine) {
        const it = unitByEco(eco);
        const clave = it ? it.info.clave : eco;
        const plan = (it ? planDe(it.info) : null) || { modo: 'secuencial', circuito: false, paradas: [] };
        _planEdit = {
            eco: eco, clave: clave,
            modo: plan.modo || 'secuencial',
            circuito: !!plan.circuito,
            engine: (engine === 'astar' || engine === 'osrm') ? engine : (APP.config.autoRutaModo || 'osrm'),
            paradas: (plan.paradas || []).map((p) => Object.assign({}, p))
        };
        rpmWinCargar();
        // Muestra el modal antes de medir, para que el acotado de la ventana
        // use el tamano real de la tarjeta (si esta en display:none mide 0).
        planModalEl().classList.add('abierto');
        renderEditorParadas();
    }
    function renderEditorParadas() {
        const el = planModalEl();
        if (!el || !_planEdit) return;
        const modo = _planEdit.modo;
        const stops = _planEdit.paradas;
        const filas = stops.map((p, i) => (
            '<div class="rpm-stop' + (p.fijo ? ' pinned' : '') + '" data-i="' + i + '">' +
            '<span class="rpm-grip" title="Arrastrar para reordenar">\u283F</span>' +
            '<span class="rpm-idx">' + (i + 1) + '</span>' +
            '<span class="rpm-tipo">' + esc(p.tipo || 'lugar') + '</span>' +
            '<span class="rpm-txt" title="' + esc(p.texto) + '">' + esc(p.texto) + (p.coords ? '' : ' <em>(sin ubicar)</em>') + '</span>' +
            '<button class="rpm-mini rpm-pin" data-i="' + i + '" title="Fijar esta parada en su orden">' + (p.fijo ? 'Fijada' : 'Fijar') + '</button>' +
            '<button class="rpm-mini rpm-up" data-i="' + i + '" title="Subir"><span class="rondo-usym">' + UIS.up + '</span></button>' +
            '<button class="rpm-mini rpm-down" data-i="' + i + '" title="Bajar"><span class="rondo-usym">' + UIS.down + '</span></button>' +
            '<button class="rpm-mini rpm-del" data-i="' + i + '" title="Quitar"><span class="rondo-usym">' + UIS.close + '</span></button>' +
            '</div>'
        )).join('') || '<div class="rpm-hint">Sin paradas. Anade geocercas, municipios o lugares abajo.</div>';
        const engine = _planEdit.engine || 'osrm';
        el.innerHTML =
            '<div class="rpm-card">' +
            '<div class="rpm-head"><span class="rondo-usym">' + UIS.route + '</span> <span class="rpm-eco">' + esc(_planEdit.eco) + '</span> &middot; Ruta multipunto' +
            '<span class="rpm-count">' + stops.length + (stops.length === 1 ? ' parada' : ' paradas') + '</span>' +
            '<span style="flex:1"></span><button class="rpm-mini" id="rpm-x" title="Cerrar"><span class="rondo-usym">' + UIS.close + '</span></button></div>' +
            '<div class="rpm-body">' +
            '<div class="rpm-row">' +
            '<label class="rpm-lbl">Modo</label>' +
            '<select id="rpm-modo">' +
            '<option value="secuencial"' + (modo === 'secuencial' ? ' selected' : '') + '>Secuencial (en este orden)</option>' +
            '<option value="optimo"' + (modo === 'optimo' ? ' selected' : '') + '>Mejor ruta (optimiza y regresa a base)</option>' +
            '</select>' +
            '<label class="rpm-lbl">Motor</label>' +
            '<select id="rpm-engine">' +
            '<option value="osrm"' + (engine === 'osrm' ? ' selected' : '') + '>OSRM (rapido)</option>' +
            '<option value="astar"' + (engine === 'astar' ? ' selected' : '') + '>A* OSM (experimental)</option>' +
            '</select>' +
            '</div>' +
            '<div class="rpm-row">' +
            '<label class="rpm-lbl"><input type="checkbox" id="rpm-circuito"' + (_planEdit.circuito || modo === 'optimo' ? ' checked' : '') + (modo === 'optimo' ? ' disabled' : '') + '> Regresar al origen</label>' +
            '<span style="flex:1"></span>' +
            '<button class="rpm-mini" id="rpm-vaciar" title="Quitar todas las paradas"><span class="rondo-usym">' + UIS.clear + '</span> Vaciar paradas</button>' +
            '</div>' +
            '<div class="rpm-hint">En modo <b>mejor ruta</b> las paradas no fijadas se reordenan por cercania y el recorrido cierra en el origen. Usa <b>Fijar</b> para respetar el orden de una parada. <b>A*</b> requiere activar Overpass y rutas de menos de ~150 km.</div>' +
            '<div class="rpm-stops">' + filas + '</div>' +
            '<div class="rpm-add">' +
            '<input type="text" id="rpm-buscar" placeholder="Buscar geocerca, municipio o lugar, o escribe lat,lon..." autocomplete="off">' +
            '<button class="rpm-mini" id="rpm-agregar" title="Anadir el texto como lugar o coordenadas"><span class="rondo-usym">' + UIS.check + '</span> Anadir</button>' +
            '<div class="rpm-sug" id="rpm-sug"></div>' +
            '</div>' +
            '<div class="rpm-hint">Escribe para ver sugerencias de <b>geocercas</b> y <b>municipios</b> (OpenStreetMap); Enter anade el texto como lugar y <code>lat,lon</code> como coordenadas.</div>' +
            '</div>' +
            '<div class="rpm-foot">' +
            '<button id="rpm-cancelar">Cancelar</button>' +
            '<button id="rpm-guardar">Solo guardar</button>' +
            '<button class="primary" id="rpm-guardar-trazar"><span class="rondo-usym">' + UIS.route + '</span> Guardar y trazar</button>' +
            '</div>' +
            '<div class="rpm-resize" title="Arrastrar para redimensionar"></div>' +
            '</div>';
        try { rxBarridoAutofill(el); } catch (_) { /* noop */ }
        rpmAplicarWin(el);
        rpmBindWin(el);
        rpmBindReorden(el);
        byId('rpm-x').onclick = cerrarEditorParadas;
        byId('rpm-cancelar').onclick = cerrarEditorParadas;
        byId('rpm-guardar').onclick = () => guardarEditorParadas(false);
        byId('rpm-guardar-trazar').onclick = () => guardarEditorParadas(true);
        const modoEl = byId('rpm-modo');
        modoEl.onchange = () => {
            _planEdit.modo = modoEl.value;
            if (modoEl.value === 'optimo') _planEdit.circuito = true;
            renderEditorParadas();
        };
        const engineEl = byId('rpm-engine');
        if (engineEl) engineEl.onchange = () => { _planEdit.engine = engineEl.value; };
        const circEl = byId('rpm-circuito');
        if (circEl) circEl.onchange = () => { _planEdit.circuito = circEl.checked; };
        byId('rpm-vaciar').onclick = () => {
            if (!_planEdit || !_planEdit.paradas.length) return;
            _planEdit.paradas = [];
            renderEditorParadas();
        };
        el.querySelectorAll('.rpm-pin').forEach((b) => {
            b.onclick = () => { const i = +b.dataset.i; _planEdit.paradas[i].fijo = !_planEdit.paradas[i].fijo; renderEditorParadas(); };
        });
        el.querySelectorAll('.rpm-del').forEach((b) => {
            b.onclick = () => { _planEdit.paradas.splice(+b.dataset.i, 1); renderEditorParadas(); };
        });
        el.querySelectorAll('.rpm-up').forEach((b) => {
            b.onclick = () => { const i = +b.dataset.i; const a = _planEdit.paradas; if (i > 0) { const t = a[i - 1]; a[i - 1] = a[i]; a[i] = t; renderEditorParadas(); } };
        });
        el.querySelectorAll('.rpm-down').forEach((b) => {
            b.onclick = () => { const i = +b.dataset.i; const a = _planEdit.paradas; if (i < a.length - 1) { const t = a[i + 1]; a[i + 1] = a[i]; a[i] = t; renderEditorParadas(); } };
        });
        const buscar = byId('rpm-buscar');
        const sug = byId('rpm-sug');
        const pintarSug = () => {
            const q = buscar.value.trim();
            _rpmSugIdx = -1;
            if (!q) { sug.classList.remove('abierto'); sug.innerHTML = ''; _rpmSugList = []; return; }
            const icoTipo = (t) => (t === 'geocerca') ? UIS.zone : ((t === 'municipio' || t === 'ciudad') ? UIS.map : UIS.pin);
            const render = (items) => {
                const lista = items.map((cand) => ({
                    tipo: cand.tipo,
                    tipoFinal: cand.tipo === 'ciudad' ? 'municipio' : cand.tipo,
                    texto: cand.texto,
                    coords: cand.coords || null,
                    extra: cand
                }));
                // Ultimo elemento: buscar el texto tal cual en OpenStreetMap.
                lista.push({ libre: true, texto: q });
                _rpmSugList = lista;
                if (_rpmSugIdx >= lista.length) _rpmSugIdx = lista.length - 1;
                sug.innerHTML = lista.map((it, k) => {
                    const cls = 'rpm-sug-item' + (k === _rpmSugIdx ? ' sel' : '');
                    if (it.libre) {
                        return '<div class="' + cls + '" data-k="' + k + '"><span class="rondo-usym">' + UIS.pin + '</span><span class="k">lugar</span><span class="t">Buscar "' + esc(q) + '" en OpenStreetMap</span></div>';
                    }
                    return '<div class="' + cls + '" data-k="' + k + '"><span class="rondo-usym">' + icoTipo(it.tipo) + '</span>' +
                        '<span class="k">' + esc(it.tipo) + '</span>' +
                        '<span class="t">' + esc(it.texto || '') + (it.extra && it.extra.sub ? ' <span class="k">' + esc(it.extra.sub) + '</span>' : '') + '</span></div>';
                }).join('');
                sug.classList.add('abierto');
                sug.querySelectorAll('.rpm-sug-item').forEach((n) => {
                    n.onclick = () => rpmSeleccionarSug(+n.dataset.k);
                    n.onmouseenter = () => { _rpmSugIdx = +n.dataset.k; rpmResaltarSug(); };
                });
            };
            const locales = catalogoParadas(q, 8);
            render(locales);
            // Ampliacion en linea: municipios/ciudades/direcciones de OSM.
            if (_rpmOsmTimer) clearTimeout(_rpmOsmTimer);
            _rpmOsmTimer = setTimeout(async () => {
                if (buscar.value.trim() !== q) return;
                // Sesga las sugerencias hacia la posicion de la unidad.
                const itRef = _planEdit ? unitByEco(_planEdit.eco) : null;
                APP.geoRef = (itRef && itRef.st.lat != null) ? { lat: itRef.st.lat, lon: itRef.st.lon } : null;
                const osm = await sugerenciasOSM(q);
                if (!osm.length || buscar.value.trim() !== q) return;
                const vistos = new Set(locales.map((x) => norm(x.texto)));
                const extra = osm.filter((x) => !vistos.has(norm(x.texto)));
                if (extra.length) render(locales.concat(extra));
            }, 450);
        };
        buscar.oninput = pintarSug;
        buscar.onfocus = pintarSug;
        // Teclado: flechas para recorrer las sugerencias, Enter para elegir la
        // resaltada (o el texto libre si no hay ninguna seleccionada).
        buscar.onkeydown = (e) => {
            const abierto = sug.classList.contains('abierto') && _rpmSugList.length;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!abierto) { pintarSug(); return; }
                _rpmSugIdx = (_rpmSugIdx + 1) % _rpmSugList.length;
                rpmResaltarSug();
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!abierto) return;
                _rpmSugIdx = (_rpmSugIdx - 1 + _rpmSugList.length) % _rpmSugList.length;
                rpmResaltarSug();
                return;
            }
            if (e.key === 'Escape') {
                // Si hay sugerencias abiertas, Esc solo cierra el desplegable;
                // de lo contrario se deja pasar para cerrar el editor.
                if (sug.classList.contains('abierto')) {
                    e.stopPropagation();
                    sug.classList.remove('abierto');
                    _rpmSugIdx = -1;
                }
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (abierto && _rpmSugIdx >= 0) { rpmSeleccionarSug(_rpmSugIdx); return; }
                const q = buscar.value.trim();
                if (!q) return;
                agregarParadaEditor('lugar', q, null);
                buscar.value = '';
                sug.classList.remove('abierto');
                _rpmSugList = [];
                _rpmSugIdx = -1;
            }
        };
        byId('rpm-agregar').onclick = () => {
            const q = buscar.value.trim();
            if (!q) return;
            agregarParadaEditor('lugar', q, null);
            buscar.value = '';
            sug.classList.remove('abierto');
        };
    }
    function agregarParadaEditor(tipo, texto, coords, extra) {
        if (!_planEdit) return;
        if (_planEdit.paradas.length >= 25) { adviceWarn('Maximo 25 paradas', 'Quita alguna antes de anadir otra.'); return; }
        // Detecta "lat,lon" y lo trata como coordenadas (sin geocodificar).
        const cm = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(String(texto || '').trim());
        if (cm) { tipo = 'coord'; coords = { lat: parseFloat(cm[1]), lon: parseFloat(cm[2]) }; }
        // Rango valido: una coordenada imposible deja la parada "sin ubicar"
        // para siempre y hace fallar el trazado. Mejor avisar y no agregarla.
        if (coords && coords.lat != null && coords.lon != null &&
            (coords.lat < -90 || coords.lat > 90 || coords.lon < -180 || coords.lon > 180)) {
            adviceWarn('Coordenadas invalidas', 'Latitud entre -90 y 90, longitud entre -180 y 180.');
            return;
        }
        const p = nuevaParada(tipo, texto, coords);
        if (extra && extra.zonaId) p.zonaId = extra.zonaId;
        if (extra && extra.municipioId) p.municipioId = extra.municipioId;
        _planEdit.paradas.push(p);
        renderEditorParadas();
    }
    function guardarEditorParadas(trazar) {
        if (!_planEdit) return;
        const clave = _planEdit.clave, eco = _planEdit.eco;
        const modo = _planEdit.modo === 'optimo' ? 'optimo' : 'secuencial';
        // El motor se captura ANTES de cerrar el editor: cerrarEditorParadas()
        // pone _planEdit = null y luego no se puede leer _planEdit.engine.
        const engine = (_planEdit.engine === 'astar') ? 'astar' : 'osrm';
        const plan = {
            modo: modo,
            circuito: (modo === 'optimo') ? true : !!_planEdit.circuito,
            paradas: _planEdit.paradas
        };
        APP.planes[clave] = plan;
        APP.watchMap[eco] = planATexto(plan);
        if (APP.orden.indexOf(eco) < 0) APP.orden.push(eco);
        guardarPlanes();
        guardarLista();
        guardarOrden();
        cerrarEditorParadas();
        pintarModalLista();
        paintInfo();
        if (trazar) {
            if (engine === 'astar' && !APP.config.overpass) adviceWarn('A* desactivado', 'Activa "Permitir A* sobre datos OSM" en Ajustes · Rutas. Se usara OSRM.');
            planearRuta(eco, plan, null, (engine === 'astar' && APP.config.overpass) ? 'astar' : 'osrm');
        } else if (APP.config.autoRuta) {
            autoTrazarRutas();
        }
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
        const rows = document.querySelectorAll('#rondo-body .fila');
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
                b.innerHTML = '<span class="rondo-usym">' + UIS.gear + '</span> Buscando (' + (i + 1) + '/' + ordenados.length + ')...';
                b.style.background = 'linear-gradient(135deg,#f57c00,#ff9800)';
            }
            await openUnitWindow(ordenados[i]);
            await sleep(250);
        }
        const inp = findSearchInput();
        if (inp) clearInput(inp);
        const b = byId('rondo-btn-main');
        if (b) {
            b.innerHTML = '<span class="rondo-usym">' + UIS.panel + '</span> Organizando...';
            b.style.background = 'var(--rondo-accent-grad)';
        }
        await sleep(400);
        await organizeWindows();
        await verifyWindows(true);
        resetMainBtn();
    }
    function resetMainBtn() {
        mainBtn.innerHTML = '<span class="rondo-usym">' + UIS.gear + '</span> Automatizar Unidades';
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
        const ti = document.querySelector('#rondo-tema .rondo-usym');
        if (ti) ti.innerHTML = UIS.theme;
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
