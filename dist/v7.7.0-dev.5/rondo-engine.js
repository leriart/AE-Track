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
- Zonas: dos vistas: Geocercas de la plataforma (unidades dentro) y Zonas de riesgo. Aqui se cargan las zonas de riesgo (URL/archivo/data:). Con el boton Nueva se dibujan geocercas propias en un mapa (no estan en la plataforma, se marcan APP y se importan/exportan). Cada geocerca tiene ademas su propia alerta (campana en su tarjeta): a quien vigila (solo la lista vigilada o toda la flota), la gravedad y que lo dispara (solo paso / se detuvo / motor apagado).
- Caravana: unidades cerca de una unidad lider (distancia firmada, sentido contrario, no vigiladas).
- Replay: reproduce el recorrido de una unidad en un dia o rango de horas, con buscador de unidades, mini-mapa (tiles de OpenStreetMap), perfil de velocidad, resumen, lista de paradas (hora, duracion y lugar resuelto con OpenStreetMap: comercio, direccion o municipio) y eventos (geocercas, excesos, desvios). Exporta el recorrido a GeoJSON, las paradas a CSV y un reporte PDF del recorrido. Solo lectura.
- Informe por geocerca: boton de pin junto al Reporte PDF y tambien desde Reproducir recorrido (donde ya toma las fechas del recorrido). Elige si quieres cruces por unidad o paradas dentro, la geocerca, el rango de dias, si mira toda la flota o solo las seleccionadas, y los datos (rastreo de las trazas, avisos de la sesion, viajes analizados o el recorrido cargado en Replay); sale en PDF, CSV o Markdown con el detalle evento a evento.
- Reporte PDF: desde la barra de herramientas se genera un reporte operativo completo (resumen, KPIs, unidades, avisos del dia, rutas, sin senal, geocercas y zonas de riesgo) paginado en A4 y listo para guardar como PDF.
- Chat IA: consultas libres a la IA (solo si la IA esta habilitada con API key). La IA ve el estado de la flota.
- Riesgo: se ve dentro de Zonas (segmentado).

REGLAS DE ALERTA (se activan y ajustan en Ajustes > Reglas):
Sin senal (5 min), Reconecto, GPS perdido en marcha (15 min), Detenido (30 min, fuera de bases), Zona no prevista (20 min), Geocercas (entra/sale, inmediato), Destino (progreso >=95% o <400 m), Desconexion (25 min), Velocidad (110 km/h), Desvio de ruta (250 m durante 5 min), Giro en U (130 grados durante 3 min), Retorno/viaje cancelado (25% o 400 m), Perdio senal en zona de riesgo (critico), Aproximacion a zona de riesgo (predictiva, opcional), Detenida en geocerca (opcional), Alerta de geocercas (por geocerca: gravedad + disparador paso/detenida/motor apagado, en Zonas > Geocercas).
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

ATAJOS: Alt+1..8 cambia de tab (Dashboard..Replay y Chat IA), Alt+P y Alt+L muestran/ocultan el panel, Alt+H pliega la barra, Esc cierra dialogos.

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
                // v6.0.11: tope configurable (antes fijo en 80) para ampliar
                // o recortar el alcance del contexto segun el modelo.
                if (detalle.length < (Number(APP.config.iaMaxUnidades) || 120)) {
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
            // v6.0.11: tope configurable (antes fijo en 800).
            const geocercas = geocercasTodas.slice(0, Number(APP.config.iaMaxGeocercas) || 1200);
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

        // v6.11: guarda la posicion de la unidad en el momento de la alerta
        // (la mayoria de los reportes necesitan fecha/hora y coordenadas por
        // dato). Si la regla ya trae lat/lon se usan; si no, se toma el
        // estado actual de la unidad del mismo ciclo de refresco.
        let aLat = (alert.lat != null && isFinite(+alert.lat)) ? +alert.lat : null;
        let aLon = (alert.lon != null && isFinite(+alert.lon)) ? +alert.lon : null;
        if ((aLat == null || aLon == null) && alert.eco) {
            try {
                const u = (APP.unidades || []).find((x) => {
                    try { const i = parseUnitName(x); return i.eco === alert.eco || i.clave === alert.clave; } catch (_) { return false; }
                });
                if (u) {
                    const st = unitState(u);
                    if (aLat == null) aLat = (st.lat != null && isFinite(+st.lat)) ? +st.lat : null;
                    if (aLon == null) aLon = (st.lon != null && isFinite(+st.lon)) ? +st.lon : null;
                }
            } catch (_) { /* noop */ }
        }
        const item = {
            regla: alert.regla, sev: alert.sev,
            titulo: alert.titulo, detalle: alert.detalle || '',
            eco: alert.eco || '', clave: alert.clave, ts: ahora,
            lat: aLat, lon: aLon,
            // v6.15: geocerca del aviso. Sin esto el reporte por geocerca
            // tendria que sacarla del texto; con el campo la agregacion es
            // exacta (y los avisos antiguos, sin campo, se siguen leyendo
            // del texto en el reporte).
            zona: alert.zona || '',
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
    // v6.9.1: `label` opcional para mostrar un texto junto al spinner
    // (p. ej. "Cargando recorrido..."). Sin label el comportamiento es el
    // de siempre (solo spinner).
    function setBusy(btn, on, label) {
        if (!btn) return;
        if (on) {
            if (btn.dataset.rondoTxt == null) btn.dataset.rondoTxt = btn.innerHTML;
            btn.classList.add('rondo-busy');
            btn.setAttribute('aria-busy', 'true');
            btn.disabled = true;
            btn.innerHTML = '<span class="rondo-spin"></span>' +
                (label ? '<span class="rondo-busy-lbl">' + esc(label) + '</span>' : '');
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
                regla: 'geocerca', sev: 'bajo', clave: info.clave, eco: info.eco, zona: actual,
                titulo: 'ENTRO \u00b7 ' + etq,
                detalle: 'entro a ' + actual + ' \u00b7 ' + Math.round(st.vel) + ' km/h'
            });
        } else if (previo) {
            pushAlert({
                regla: 'geocerca', sev: 'bajo', clave: info.clave, eco: info.eco, zona: previo,
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
            regla: 'geocercaDetenido', sev: 'bajo', clave: info.clave, eco: info.eco, zona: R.zona,
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
    // v6.0.11: exceso de velocidad SOSTENIDO. La regla `velocidad` avisa del
    // pico instantaneo (util pero ruidosa); esta exige que la unidad (con la
    // velocidad ya suavizada) se mantenga por encima del umbral durante
    // `velSostenidaMin` minutos. Se rearma tras avisar, asi que un trayecto
    // largo genera un aviso por ventana, no uno por refresco.
    function reglaVelocidadSostenida(st, R, info, etq) {
        if (!APP.config.reglas.velocidadSostenida) return;
        if (!st.online || st.lat == null) { R.velSostDesde = 0; return; }
        const umbral = +APP.config.velSostenidaKmh || 0;
        const min = +APP.config.velSostenidaMin || 0;
        if (!umbral || !min) return;
        const vel = velSuavizada(info, st);
        // Histeresis: para rearmar hay que bajar claramente del umbral, no
        // basta con rozarlo (evita parpadeo en el limite).
        if (vel < umbral - 5) { R.velSostDesde = 0; return; }
        if (vel < umbral) return;
        if (!R.velSostDesde) { R.velSostDesde = Date.now() / 1000; return; }
        const minutos = (Date.now() / 1000 - R.velSostDesde) / 60;
        if (minutos < min) return;
        pushAlert({
            regla: 'velocidadSostenida', sev: 'alto', clave: info.clave, eco: info.eco, soloHorario: true,
            titulo: 'EXCESO SOSTENIDO · ' + etq,
            detalle: Math.round(vel) + ' km/h durante ' + Math.round(minutos) + ' min (umbral ' + umbral + ')',
            hablar: 'La unidad ' + etq + ' mantiene exceso de velocidad'
        });
        // Re-armar la ventana desde ahora (el cooldown de pushAlert evita
        // duplicados si la ventana es mas corta que el cooldown).
        R.velSostDesde = Date.now() / 1000;
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
        // v6.0.11: el factor se pondera por el TIEMPO real entre muestras, no
        // por el numero de refrescos (polling irregular, pestaña oculta).
        if (clave && Number.isFinite(st.vel)) {
            const pv = APP.velSuave[clave];
            if (pv == null) {
                APP.velSuave[clave] = st.vel;
            } else {
                const ahoraS = Date.now() / 1000;
                const pollSeg = Math.max(1, (Number(APP.config.pollMs) || 10000) / 1000);
                const dtSeg = APP.velSuaveTs[clave] ? (ahoraS - APP.velSuaveTs[clave]) : pollSeg;
                const tau = pollSeg * 2.32; // equivale al antiguo alpha=0.35
                const a = alphaEMA(dtSeg, tau);
                APP.velSuave[clave] = pv * (1 - a) + st.vel * a;
            }
            APP.velSuaveTs[clave] = Date.now() / 1000;
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
            // v6.0.11: inicio de la ventana de exceso sostenido.
            velSostDesde: prev ? (prev.velSostDesde || 0) : 0,
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
            // v6.12: alerta de geocercas (pestana Zonas > Geocercas).
            // Episodios por geocerca vigilada: dentro confirmado, minutos
            // de parada y si el motor ya esta apagado. Los reinicia
            // geoAlertaReinicia cuando el operador cambia la seleccion.
            geoAlerta: (prev && prev.geoAlerta && typeof prev.geoAlerta === 'object') ? prev.geoAlerta : null,
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
            // v6.12: alerta dirigida por geocerca. Solo mira las geocercas
            // que el operador selecciono en Zonas > Geocercas y avisa segun
            // el disparador elegido (paso / detenida / motor apagado).
            reglaGeoAlerta(u, info, st, R);
            await reglaDestino(st, R, info, etq);
            await reglaDesconexion(st, R, info, etq);
            await reglaRiesgoSinSenal(st, prev, R, info, etq);
            await reglaRiesgoPredict(st, prev, R, info, etq);
            reglaVelocidad(st, R, info, etq);
            // v6.0.11: exceso sostenido (velocidad suavizada por encima del
            // umbral durante N minutos).
            reglaVelocidadSostenida(st, R, info, etq);
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
        // v6.19.7: en modo rendimiento no se refresca con la pestana oculta.
        if (APP.config.rendimientoPagina && document.hidden) return;
        APP.refBusy = true;
        try {
            const unidades = await fetchUnits();
            APP.unidades = unidades;
            if (APP.config.loadZones && APP.zonas.length === 0) {
                try { APP.zonas = await fetchZones(); } catch (_) { APP.zonas = []; }
                // v6.13: las geocercas dibujadas en Rondo se anaden DESPUES
                // de consultar la plataforma (si se metieran antes, APP.zonas
                // dejaria de estar vacia y las nativas no se cargarian).
                try { glocSincroniza(); } catch (e) { if (APP.unlocked) console.warn('[Rondo] gloc', e && e.message); }
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
            // v6.12: la alerta de geocercas puede vigilar TODA la flota. El
            // bucle anterior solo recorre las unidades vigiladas, asi que
            // las demas se evaluan aqui solo para esa regla.
            geoAlertaFlota(unidades, nuevas);

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
            return !!(el && el.closest && el.closest('#rondo-panel,#rondo-barra,#rondo-modal,#rondo-config,#rondo-ayuda,#rondo-contexto,#rondo-toasts,#rondo-aviso,#rondo-rail,#rondo-dialog,#rondo-plan-modal,#rondo-carga-modal,#rondo-geocerca-modal'));
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
        const todos = APP.orden.slice();
        const cnt = byId('rondo-modal-count');
        // v6.0.13: buscador de la lista (por eco, placa, nombre o destino).
        const buscaEl = byId('rondo-modal-buscar');
        const q = norm(buscaEl ? buscaEl.value : '');
        const ecos = q ? todos.filter((eco) => {
            const it = unitByEco(eco);
            const info = it ? parseUnitName(it.u) : { eco: eco, placa: '', nombre: '' };
            const plan = planDe(info);
            const destino = plan ? planATexto(plan) : (APP.watchMap[eco] || '');
            return norm([eco, info.placa, info.nombre, destino].join(' ')).indexOf(q) >= 0;
        }) : todos;
        if (cnt) cnt.textContent = q ? (ecos.length + ' de ' + todos.length) : String(todos.length);
        if (!todos.length) {
            body.innerHTML = '<div class="lista-empty"><span class="rondo-usym">' + UIS.watch + '</span><div>Lista vacía. Pega unidades arriba o añade una con el campo de abajo.</div></div>';
            return;
        }
        if (!ecos.length) {
            body.innerHTML = '<div class="lista-empty"><span class="rondo-usym">' + UIS.filter + '</span><div>Ninguna unidad coincide con <b>' + esc(buscaEl ? buscaEl.value : '') + '</b>.</div></div>';
            return;
        }
        body.innerHTML = ecos.map((eco) => (
            '<div class="lista-row" data-eco="' + esc(eco) + '">' +
            '<span class="rondo-drag-handle" draggable="true" title="Arrastrar para cambiar el orden">⠿</span>' +
            '<span class="orden-num">' + (todos.indexOf(eco) + 1) + '</span>' +
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
            // Con el buscador activo solo se ven algunas filas: no reordenamos
            // la lista completa para no perder unidades.
            if (ecos.length && ecos.length === APP.orden.length) {
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
    function oscurecer(hex, f) {
        const h = String(hex || '').replace('#', '');
        if (h.length !== 6) return hex;
        const n = parseInt(h, 16);
        const mix = (x) => Math.round(x * (1 - f));
        return '#' + [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)]
            .map((x) => x.toString(16).padStart(2, '0')).join('');
    }
    function rxLum(c) {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    }
    function rxContraste(h1, h2) {
        const a = hexToRgb(h1), b = hexToRgb(h2);
        if (!a || !b) return 21; // no se puede medir: se deja tal cual
        const x = rxLum(a), y = rxLum(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    }
    // El acento sirve de FONDO (con texto blanco encima) pero como COLOR DE
    // TEXTO sobre una superficie oscura puede quedar ilegible (el verde azulado
    // #0d6e87 sobre #272d3c da ~2:1: pestana activa, "Cancel", "Restore..."). Se
    // aclara (tema oscuro) u oscurece (claro) hasta llegar a 4.5:1 (WCAG AA).
    function rxAcentoTexto(acc, P, extra) {
        let c = acc;
        const base = P && P.soft;
        if (!base || !hexToRgb(c)) return c;
        for (let i = 0; i < 10 && rxContraste(c, base) < 4.5; i++) {
            c = P.claro ? oscurecer(c, 0.14) : aclarar(c, 0.14);
        }
        return extra ? (P.claro ? oscurecer(c, extra) : aclarar(c, extra)) : c;
    }
    // v6.0.14 / v6.9.1: reestiliza la pagina de la plataforma con la paleta
    // de Rondo. Se apoya en las PROPIAS variables CSS del skin (las del
    // objeto de configuracion del CMS), asi que no reescribe el DOM: solo
    // pinta. Es opt-in y reversible (al desactivarlo se elimina la hoja).
    //
    // v6.9.1:
    //   - Se emiten con `!important` y sobre `:root, html, body`, porque la
    //     plataforma tambien declara sus variables y, al mismo nivel de
    //     especificidad, la ultima hoja ganaba (el reestilizado "no hacia
    //     nada").
    //   - Se amplia el mapeo: acento, hover, bordes, superficies y texto,
    //     tomando la paleta segun el tema activo (oscuro/claro) para que la
    //     pagina quede coherente con el panel.
    //
    // v6.19.3: se completa el mapeo del skin (p. ej. skytracking3). Antes
    //   solo se pintaban las pestañas y los botones; quedaban sin tocar los
    //   paneles (superior/izquierdo/inferior), las barras horizontales, el
    //   acordeon, los dialogos de ayuda/asistente y el login. Ademas cada
    //   variable cae ahora en la categoria que le corresponde por SU
    //   significado (fondo de acento, hover, texto sobre acento, superficie,
    //   texto o borde) en vez de asumir acento para todo. Esto corrige de
    //   paso un bug: `execute-button-border-color` y los bordes del login
    //   son colores sueltos, no el shorthand `1px solid`, y antes se
    //   pintaban como "1px solid <color>" (invalido).
    // v6.19.4: el mapa se extrae del :root real de la plataforma (728 tokens
    //   con nombre propio). Muchos se DEFINEN como var(--otro) (p. ej.
    //   --featured-dot-background: var(--accent-color)), asi que basta con
    //   reescribir los tokens BASE y el resto se recolorea en cascada; los que
    //   llevan color literal se mapean uno a uno. Clave -> color de Rondo
    //   (lo resuelve rxPaginaToken):
    //     accent / accent-2 / hover      acento, acento claro, hover oscuro
    //     on                             texto sobre acento (#fff)
    //     accent-bg / accent-bg-hover    tinte de acento translucido
    //     bg / soft / strong             superficies (fondo, paneles, tarjetas)
    //     fg / dim / mute / border       texto y bordes
    //     transparent
    const RX_PAGINA_MAPA = {
        // --- base: acento ---
        'accent-color': 'accent', 'accent-hover-color': 'hover', 'accent-active-color': 'hover',
        'accent-bg-color': 'strong', 'accent-bg-color-hover': 'strong',
        'accent-bg-color-active': 'accent-bg', 'accent-bg-light': 'strong',
        // --- base: texto ---
        'primary-color': 'fg', 'secondary-color': 'dim', 'color-text-secondary': 'dim',
        'color-text-disabled': 'mute',
        // --- base: superficies --- 'hover-bg-color': 'strong', 'editable-hover-bg-color': 'strong',
        'accent-gray-bg-color': 'veil', 'available-components-bg-color': 'soft',
        'disabled-components-bg-color': 'strong', 'table-selected-item-bg-color': 'strong',
        'higlighted-normal': 'strong', 'higlighted-hover': 'strong', 'higlighted-active': 'strong',
        'bg-dark-surface': 'strong', 'hover-bg-dark-surface': 'strong', 'active-bg-dark-surface': 'strong',
        'dialog-background-block': 'strong', 'preloader-box-background': 'soft',
        // --- base: bordes --- 'borders-color-inverted': 'border', 'borders-border-color': 'border',
        'checkbox-borders-color': 'border', 'monitoring-button-border-color': 'border', 'color-border': 'border',
        // --- paneles y barra horizontal ---
        'panel-top-background': 'soft', 'panel-top-color': 'fg',
        'panel-left-background': 'soft', 'panel-left-sub-background': 'bg',
        'panel-left-color': 'fg', 'panel-left-sub-color': 'fg',
        'panel-bottom-background': 'soft', 'panel-bottom-color': 'fg',
        'panel-bottom-item-active-background': 'strong',
        'horizontal-bar-item-color': 'fg', 'horizontal-bar-item-background': 'transparent',
        'horizontal-bar-item-hover-color': 'on', 'horizontal-bar-item-hover-background': 'accent',
        'horizontal-bar-item-active-color': 'on', 'horizontal-bar-item-active-background': 'accent',
        'panel-top-border-color': 'border', 'panel-left-border-color': 'border',
        'panel-bottom-border-color': 'border', 'panel-center-border-color': 'border',
        // --- listas y tablas ---
        'list-table-background': 'soft', 'list-table-background-warn': 'soft',
        'list-table-background-error': 'soft', 'list-table-background-gray': 'strong',
        'list-table-color': 'fg', 'list-table-separator-color': 'border',
        'list-table-group-background': 'strong', 'list-table-group-background-hover': 'strong',
        'list-table-head-background': 'strong', 'list-row-hover-bg-color': 'strong',
        'icons-action-color-hover': 'strong', 'icons-action-color-active': 'strong',
        // --- tooltip --- 'tooltip-text-primary-color': 'fg',
        'tooltip-text-secondary-color': 'dim', 'tooltip-separator-color': 'border',
        // --- acordeon ---
        'accordion-normal-background': 'soft', 'accordion-normal-color': 'fg',
        'accordion-active-background': 'accent', 'accordion-active-color': 'on',
        'accordion-hover-background': 'strong', 'accordion-hover-color': 'fg',
        'accordion-border-color': 'border',
        // --- wizard / ayuda / modal ---
        'wizard-dialog-header-background': 'accent', 'wizard-dialog-header-color': 'on', 'modal-background': 'soft',
        'help-window-background': 'soft', 'help-window-header-background': 'accent',
        'help-window-header-color': 'on', 'help-window-collapser-header-background': 'strong',
        // --- pestañas ---
        'tab-bg-color': 'soft', 'tab-bg-color-hover': 'strong', 'tab-color-active': 'hover',
        'tabs-item-text-color': 'accent', 'tabs-item-hover-text-color': 'hover',
        'tabs-selected-item-text-color': 'accent', 'tabs-selected-item-line-color': 'accent',
        // --- botones ---
        'execute-button-background': 'accent', 'execute-button-color': 'on',
        'execute-button-border-color': 'accent', 'execute-button-hover-background': 'hover',
        'execute-button-hover-color': 'on', 'execute-button-hover-border-color': 'hover',
        'button-background': 'soft', 'button-color': 'accent', 'button-hover-background': 'strong',
        'button-hover-color': 'hover', 'button-hover-border-color': 'border', 'button-border-color': 'border',
        'button-disabled-background': 'strong', 'button-disabled-color': 'mute', 'button-disabled-border-color': 'border',
        'fast-button-background': 'soft', 'fast-button-background-hover': 'strong',
        'fast-button-color': 'accent', 'fast-button-border-color': 'border', 'fast-button-border-color-hover': 'border',
        'split-button-divider-color': 'border',
        'list-table-tab_button-background': 'soft', 'list-table-tab_button-color': 'accent',
        'list-table-tab_button-active-background': 'accent', 'list-table-tab_button-active-color': 'on',
        'list-table-tab_button-hover-background': 'strong', 'list-table-tab_button-hover-color': 'hover',
        'list-table-tab_button-disabled-background': 'strong', 'list-table-tab_button-disabled-color': 'mute',
        'list-table-tab_button-disabled-border': 'border',
        // --- formularios ---
        'input-background': 'soft', 'input-color': 'fg',
        'input-border-color-hover': 'border', 'input-stepper-active-bg-color': 'strong',
        'disabled-input-background-color': 'strong', 'disabled-input-color': 'mute', 'placeholder-color': 'mute',
        'select-border-color': 'border', 'select-hover-border-color': 'border',
        'chip-bg-color': 'strong', 'chip-bg-hover-color': 'strong', 'header-badge-bg-color': 'strong',
        'checkbox-bg-color': 'soft', 'checkbox-checked-bg-color': 'accent', 'checkbox-checkmark-color': 'on', 'checkbox-hover-color-secondary': 'hover', 'switch-on-bg': 'accent',
        'switch-on-hover-bg': 'hover', 'switch-thumb-bg': 'on',
        'tag-text-color': 'fg', 'tag-bg-color': 'strong', 'tag-remove-hover-color': 'accent',
        'preloader-text-color': 'fg',
        // --- panel lateral (wui2) ---
        'panel-list-item-color': 'fg', 'panel-list-item-description-color': 'dim',
        'panel-list-item-bg': 'strong', 'panel-list-item-hover-bg': 'strong', 'panel-list-item-active-bg': 'strong',
        'panel-list-item-resizer-color': 'border', 'panel-list-item-resizer-active-color': 'accent',
        'panel-list-item-icon-color': 'dim', 'panel-list-item-input-color': 'fg',
        'panel-list-item-input-icon-color': 'dim', 'panel-list-item-input-readonly-color': 'fg',
        'panel-list-item-input-disabled-bg': 'strong', 'panel-list-item-input-border-color': 'border',
        'panel-list-item-input-hover-border-color': 'border', 'panel-list-item-input-focused-border-color': 'accent',
        'panel-list-item-input-disabled-border-color': 'border',
        'panel-list-item-add-color': 'accent', 'panel-list-item-add-hover-color': 'accent',
        'panel-list-item-add-hover-bg': 'strong', 'panel-list-item-add-active-bg': 'strong',
        'panel-list-item-header-color': 'dim', 'panel-list-item-header-icon-color': 'dim',
        'panel-list-item-header-hover-color': 'fg', 'panel-list-item-header-bg': 'bg',
        'panel-list-item-header-hover-bg': 'strong', 'panel-list-item-header-active-bg': 'strong',
        'panel-list-item-header-border-color': 'border', 'panel-list-item-footer-color': 'dim',
        'panel-list-item-footer-bg': 'strong', 'panel-list-item-footer-hover-bg': 'strong',
        'panel-list-item-footer-border-color': 'border',
        'panel-list-item-button-noaccent-hover-bg': 'strong', 'panel-list-item-button-noaccent-active-bg': 'strong',
        'panel-list-group-color': 'fg', 'panel-list-group-expanded-color': 'fg',
        'panel-list-group-icon-color': 'dim', 'transfer-list-item-hover-bg': 'strong',
        'transfer-list-item-active-bg': 'strong',
        // --- calendario ---
        'calendar-background': 'soft', 'calendar-main-text-hover-background': 'strong',
        'calendar-othermonth-text-color': 'dim', 'calendar-border-color': 'border',
        // --- iconos y enlaces ---
        'icon-grey-dark-color': 'dim', 'icon-disabled-color': 'mute', 'icon-hover-color': 'fg',
        'icon-button-active-bg-color': 'accent', 'icon-button-hover-bg-color': 'strong',
        'link-initial-color': 'accent', 'link-hover-color': 'hover', 'link-disabled-color': 'mute',
        // --- login ---
        'monitoring-login-text-color': 'fg', 'monitoring-login-forgot-pwd-color': 'accent',
        'monitoring-login-forgot-pwd-hover-color': 'hover', 'monitoring-login-input-bg-color': 'soft',
        'monitoring-login-input-hover-bg-color': 'soft', 'monitoring-login-input-focused-bg-color': 'soft',
        'monitoring-login-input-text-color': 'fg', 'monitoring-login-input-text-hover-color': 'fg',
        'monitoring-login-input-text-focused-color': 'fg', 'monitoring-login-input-placeholder-color': 'mute',
        'monitoring-login-input-border-color': 'border', 'monitoring-login-input-border-hover-color': 'border',
        'monitoring-login-input-border-focused-color': 'accent', 'monitoring-login-language-border-color': 'border',
        'monitoring-login-primary-button-color': 'accent', 'monitoring-login-primary-button-text-color': 'on',
        'monitoring-login-primary-button-border-color': 'accent',
        'monitoring-login-primary-button-hover-color': 'hover',
        'monitoring-login-primary-button-hover-text-color': 'on',
        'monitoring-login-primary-button-hover-border-color': 'hover',
        'monitoring-login-secondary-button-color': 'accent', 'monitoring-login-secondary-button-text-color': 'on',
        'monitoring-login-secondary-button-border-color': 'accent',
        'monitoring-login-secondary-button-hover-color': 'hover',
        'monitoring-login-secondary-button-hover-text-color': 'on',
        'monitoring-login-secondary-button-hover-border-color': 'hover',
        'monitoring-login-form-bg-color': 'soft', 'monitoring-login-separator-color': 'border',
        'monitoring-login-separator-text-color': 'mute',
        // --- pestañas, calendario, avisos, estados ---
        'tab-color': 'fg', 'tab-color-hover': 'fg', 'vtab-color-active': 'fg',
        'tab-border-color': 'border', 'tab-border-color-hover': 'border', 'tab-border-color-active': 'border',
        'tabs-item-hover-bg-color': 'strong',
        'featured-dot-background': 'accent', 'notify-name-color': 'accent',
        'calendar-main-text-color': 'accent', 'calendar-today-color': 'accent',
        'calendar-restore-data-color': 'accent', 'calendar-main-text-hover-color': 'hover',
        'calendar-weeknumber-text-color': 'dim',
        'help-window-collapser-header-color': 'dim',
        'switch-off-hover-bg': 'strong', 'switch-thumb-hover-border-color': 'border',
        'switch-off-bg': 'strong', 'switch-disabled-bg': 'border',
        'panel-list-item-button-noaccent-progress-bg': 'border',
        'panel-list-group-button-noaccent-progress-bg': 'border',
        'panel-list-group-expanded-button-noaccent-progress-bg': 'border',
        'panel-list-item-input-button-noaccent-hover-bg': 'strong',
        'panel-list-item-input-button-noaccent-active-bg': 'strong', 'secondary-color-message-box': 'dim',
        'checkbox-border-color': 'border',
        'list-table-tab_button-active-disabled-color': 'on',
        'list-table-tab_button-active-disabled-background': 'accent',
        'panel-list-item-button-noaccent-color': 'dim',
        'panel-list-item-button-noaccent-hover-color': 'fg',
        'panel-list-item-button-noaccent-disabled-color': 'mute',
        'panel-list-item-input-button-noaccent-color': 'dim',
        'panel-list-group-button-noaccent-color': 'dim',
        'panel-list-group-button-noaccent-hover-color': 'fg',
        'panel-list-group-button-noaccent-disabled-color': 'mute',
        'panel-list-group-expanded-button-noaccent-color': 'dim',
        'panel-list-group-expanded-button-noaccent-hover-color': 'fg',
        'panel-list-group-expanded-button-noaccent-disabled-color': 'mute',
        'panel-list-item-add-disabled-color': 'mute',
        // ------------------------------------------------------------------
        // Paleta de grises. En la plataforma esta pensada para tema CLARO:
        // --gray-900 (#172336) es texto oscuro, --gray-200 (#EFEFF1) es fondo
        // claro. En un tema oscuro quedan invisibles. Se mapea cada nivel por
        // su USO REAL (texto vs fondo, ver volcado): los oscuros -> texto de
        // Rondo, los claros -> superficie.
        // ------------------------------------------------------------------
        // --- compatibilidad con nombres sueltos de la version previa ---
        'background': 'bg', 'background-content': 'bg', 'background-body': 'bg', 'background-app': 'bg',
        'background-header': 'soft', 'background-sidebar': 'soft', 'background-panel': 'soft',
        'background-item': 'soft', 'background-dialog': 'soft', 'background-popup': 'soft',
        'background-modal': 'soft', 'background-menu': 'soft', 'background-dropdown': 'soft',
        'background-input': 'bg', 'background-tooltip': 'strong', 'background-item-hover': 'strong',
        'background-table-header': 'strong', 'background-table-row': 'soft', 'background-table-row-hover': 'strong',
        'text-color': 'fg', 'text-color-primary': 'fg', 'text-color-strong': 'fg',
        'text-color-secondary': 'dim', 'text-color-dim': 'dim', 'text-color-muted': 'mute',
        'text-color-disabled': 'mute', 'input-text-color': 'fg', 'input-placeholder-color': 'mute',
        'border-color': 'border', 'border-color-soft': 'strong', 'divider-color': 'strong'
    };
    // Paleta de grises: SOLO se aplica en tema OSCURO. En el tema claro de
    // Wialon estos grises ya son correctos (texto oscuro / fondos claros), y
    // ademas estan MEZCLADOS (--gray-200/300 se usan de fondo y de texto), asi
    // que aplicarlos en claro pintaba el texto con color de fondo.
    // Variables que Wialon usa a la vez como TEXTO y como FONDO. Mapearlas
    // globalmente rompe uno de los dos roles; se resuelven por PROPIEDAD en el
    // remap (texto -> color de texto, fondo -> color de fondo, borde -> borde).
    // 'veil' = velo TRANSLUCIDO (no una superficie opaca). Wialon usa varios
    // fondos con ~5% de opacidad (--accent-gray-bg-color #1723360A,
    // --hover-bg-color #1723360F) como CAPA: p. ej. td::before{position:absolute;
    // inset:0;z-index:0} en las tablas del hint de unidad (velocidad, km, horas
    // de motor, satelites) y ::before de botones. Esa capa se pinta ENCIMA del
    // texto no posicionado; con un gris opaco tapaba el dato (campos "vacios").
    const RX_PAGINA_MIXTOS = {
        // El skin define --white como blanco y lo usa de FONDO de botones,
        // pestanas, checkboxes, calendario y del cuadro de mensaje de unidad,
        // pero tambien de TEXTO (iconos/botones sobre acento). Forzarlo a blanco
        // dejaba, en tema oscuro, texto claro sobre fondo blanco (invisible);
        // forzarlo a superficie pintaba de oscuro el texto. Se resuelve por
        // propiedad en el remap: fondo -> superficie, texto -> blanco (on).
        'white': { texto: 'on', fondo: 'soft', borde: 'border' },
        // ._messageBox_ (ventana/tarjeta flotante de unidad) saca su fondo de
        // aqui. Su texto es --primary-color-message-box. Si el fondo queda
        // blanco y el texto claro (tema oscuro), la ventana se ve vacia.
        'white-color-message-box': { texto: 'on', fondo: 'soft' },
        'white-color-border-message-box': { texto: 'border', fondo: 'border', borde: 'border' },
        'popup-background-suggestion': { texto: 'fg', fondo: 'soft' },
        'inline-background-suggestion': { texto: 'fg', fondo: 'strong' },
        'gray-50': { texto: 'on', fondo: 'soft' },
        'base-bg-color': { texto: 'fg', fondo: 'bg' },
        'hover-bg-color': { texto: 'fg', fondo: 'veil' },
        'borders-color': { texto: 'dim', fondo: 'border', borde: 'border' },
        'tooltip-bg-color': { texto: 'fg', fondo: 'strong' },
        'input-border-color': { texto: 'fg', fondo: 'border', borde: 'border' },
        'checkbox-hover-color': { texto: 'fg', fondo: 'strong' },
        'gray-200': { texto: 'mute', fondo: 'strong' },
        'gray-300': { texto: 'mute', fondo: 'border', borde: 'border' },
        'icons-action-color': { texto: 'dim', fondo: 'strong' },
        'checkbox-disabled-checked-bg-color': { texto: 'mute', fondo: 'strong' },
        'gray-700': { texto: 'dim', fondo: 'strong' },
        'color-text': { texto: 'fg', fondo: 'strong' },
        'light-color': { texto: 'mute', fondo: 'strong' },
        'primary-color-message-box': { texto: 'fg', fondo: 'strong' },
        'wizard-dialog-background': { texto: 'fg', fondo: 'soft' },
    };
    // Colores de ESTADO (aviso/exito/error/ayuda). Wialon usa pasteles claros
    // (--red-50, --orange-50...) de fondo y tonos 700 de texto; sobre un panel
    // oscuro quedaban como islas claras con el texto del tema (claro) encima, o
    // el texto de estado (rojo oscuro) sobre fondo oscuro. Cada tema trae su
    // pareja fondo/texto en la paleta (en claro coinciden con los originales).
    const RX_PAGINA_ESTADOS = {
        'red-50': 'badbg', 'green-50': 'okbg', 'orange-50': 'warnbg', 'amber-50': 'warnbg',
        'yellow-50': 'warnbg', 'blue-50': 'infobg',
        'inline-background-error': 'badbg', 'inline-background-warning': 'warnbg',
        'inline-background-success': 'okbg', 'inline-background-help': 'infobg',
        'popup-background-warning': 'warnbg',
        'higlighted-normal': 'infobg', 'higlighted-hover': 'infobg', 'higlighted-active': 'infobg',
        'list-table-background-warn': 'warnbg', 'list-table-background-error': 'badbg',
        'red-700': 'badfg', 'green-700': 'okfg', 'orange-700': 'warnfg', 'blue-700': 'infofg',
        'color-danger': 'badfg'
    };
    Object.keys(RX_PAGINA_ESTADOS).forEach((k) => { RX_PAGINA_MAPA[k] = RX_PAGINA_ESTADOS[k]; });
    // Solo los grises de USO CLARO: unos como texto (900/700/500/400) y otros
    // como superficie (100/50/800/600). Se EXCLUYEN gray-200 y gray-300 porque
    // Wialon los usa a la vez de fondo Y de texto (fecha, direccion): mapearlos
    // pintaba ese texto con color de fondo.
    const RX_PAGINA_GRISES_OSCURO = {
        'gray-900': 'fg', 'gray-800': 'strong', 'gray-600': 'strong',
        'gray-500': 'mute', 'gray-400': 'mute', 'gray-100': 'strong'
    };
    // Unico token que espera el shorthand completo "1px solid <color>".
    const RX_PAGINA_BORDE_SHORTHAND = {
        'list-table-tab_button-active-border': 'accent',
        'list-table-tab_button-border': 'border',
        'button-border': 'border'
    };
    // Todas las familias de scrollbar comparten la misma forma (bg + thumb +
    // hover + active). Con estos prefijos se cubren las ~120 variables sin
    // enumerarlas una a una.
    const RX_PAGINA_SCROLL = ['default', 'modal', 'help', 'panel-left', 'input', 'tooltip',
        'popup-hint', 'popup-help', 'popup-warning', 'popup-error', 'popup-success',
        'banner-hint', 'banner-help', 'banner-warning', 'banner-error', 'banner-success'];
    // Redondeos: la plataforma usa 4px; Rondo es mas suave (8-12px). Como son
    // tokens, cambiarlos redondea de golpe botones, inputs, tarjetas y dialogos.
    const RX_PAGINA_RADIOS = {
        'controls-border-radius': '8px', 'other-border-radius': '8px', 'modal-border-radius': '12px',
        'button-border-radius': '8px', 'input-border-radius': '8px', 'tag-border-radius': '6px',
        'panel-list-item-border-radius': '8px', 'panel-list-group-border-radius': '8px',
        'tooltip-border-radius': '8px'
    };
    // Resuelve una clave del mapa al color de la paleta activa.
    function rxPaginaToken(clave, P, acc, acc2, accD) {
        if (clave === 'accent') return acc;
        if (clave === 'accent-2') return acc2;
        if (clave === 'hover') return accD;
        if (clave === 'on') return '#ffffff';
        if (clave === 'transparent') return 'transparent';
        if (clave === 'accent-bg') return acc2 + '22';
        if (clave === 'accent-bg-hover') return acc2 + '33';
        if (clave === 'acctxt') return rxAcentoTexto(acc, P);
        if (clave === 'hovtxt') return rxAcentoTexto(acc, P, 0.12);
        return P[clave] || P.fg;
    }
    // Lee la paleta activa de Rondo (--rondo-*) con respaldo literal, para que
    // la pagina use EXACTAMENTE los mismos colores que el panel (y siga los
    // cambios de tema sin duplicar valores a mano).
    function rxPaginaPaleta(claro) {
        let cs = null;
        try { cs = getComputedStyle(document.body || document.documentElement); } catch (_) { cs = null; }
        const g = (n, def) => {
            const v = cs && (cs.getPropertyValue(n) || '').trim();
            return v || def;
        };
        return claro ? {
            bg: g('--rondo-bg', '#f5f7fa'), soft: g('--rondo-bg-soft', '#ffffff'),
            strong: g('--rondo-bg-strong', '#eef2f7'), fg: g('--rondo-fg', '#1d2433'),
            dim: g('--rondo-fg-dim', '#5b6577'), mute: g('--rondo-fg-mute', '#8993a3'),
            border: g('--rondo-border', '#dfe4ec'), veil: 'rgba(23,35,54,.05)',
            claro: true,
            okbg: '#edf7ee', warnbg: '#fff5e5', badbg: '#fff0f2', infobg: '#e7f4fd',
            okfg: '#2d8631', warnfg: '#c25e00', badfg: '#d11f1f', infofg: '#0073ce'
        } : {
            bg: g('--rondo-bg', '#1f2330'), soft: g('--rondo-bg-soft', '#272d3c'),
            strong: g('--rondo-bg-strong', '#313849'), fg: g('--rondo-fg', '#e8ecf3'),
            dim: g('--rondo-fg-dim', '#9aa4b5'), mute: g('--rondo-fg-mute', '#6f7888'),
            border: g('--rondo-border', '#3a4252'), veil: 'rgba(255,255,255,.06)',
            claro: false,
            okbg: '#22362c', warnbg: '#3a3326', badbg: '#3b2a30', infobg: '#213447',
            okfg: '#6bbd6f', warnfg: '#ffb952', badfg: '#ff8a80', infofg: '#6ab8f6'
        };
    }
    function rxAplicarEstiloPagina() {
        const elPrev = document.getElementById('rondo-estilo-pagina');
        if (!(APP.config && APP.config.estiloPagina)) {
            if (elPrev && elPrev.parentNode) elPrev.parentNode.removeChild(elPrev);
            return;
        }
        // Acento: el de Rondo, salvo que se pida heredar el de la plataforma
        // (mismo criterio que applyTheme para el panel).
        const acc = (APP.config.temaPlataforma && rxPlatAcento())
            ? rxPlatAcento() : (APP.config.acento || '#850D22');
        const acc2 = aclarar(acc, 0.28);
        const accD = oscurecer(acc, 0.14);
        // Paleta de superficies/texto segun el tema efectivo. Se leen los
        // tokens --rondo-* reales (con respaldo literal) para que la pagina use
        // EXACTAMENTE los mismos colores que el panel.
        const claro = APP.config.theme === 'claro' ||
            (APP.config.theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
        const P = rxPaginaPaleta(claro);
        const accT = rxAcentoTexto(acc, P);
        const decl = [];
        Object.keys(RX_PAGINA_MAPA).forEach((v) => {
            decl.push('  --' + v + ':' + rxPaginaToken(RX_PAGINA_MAPA[v], P, acc, acc2, accD) + ' !important;');
        });
        Object.keys(RX_PAGINA_BORDE_SHORTHAND).forEach((v) => {
            decl.push('  --' + v + ':1px solid ' +
                rxPaginaToken(RX_PAGINA_BORDE_SHORTHAND[v], P, acc, acc2, accD) + ' !important;');
        });
        Object.keys(RX_PAGINA_RADIOS).forEach((v) => {
            decl.push('  --' + v + ':' + RX_PAGINA_RADIOS[v] + ' !important;');
        });
        // Los grises solo en oscuro (en claro, los de Wialon ya valen).
        if (!claro) {
            Object.keys(RX_PAGINA_GRISES_OSCURO).forEach((v) => {
                decl.push('  --' + v + ':' + rxPaginaToken(RX_PAGINA_GRISES_OSCURO[v], P, acc, acc2, accD) + ' !important;');
            });
        }
        // Scrollbars acordes al tema (color + hover + activo).
        decl.push('  --scrollbar-bg:' + P.bg + ' !important;');
        RX_PAGINA_SCROLL.forEach((p) => {
            decl.push('  --' + p + '-scrollbar-bg:' + P.bg + ' !important;');
            decl.push('  --' + p + '-scrollbar-thumb-color:' + P.border + ' !important;');
            decl.push('  --' + p + '-scrollbar-thumb-hover-color:' + P.dim + ' !important;');
            decl.push('  --' + p + '-scrollbar-thumb-active-color:' + acc + ' !important;');
        });
        // Logo "RONDO" (Ndot) en lugar del de SkyTracking.
        decl.push('  --logo-background:' + rondoLogoURI(acc) + ' no-repeat center center !important;');
        decl.push('  --monitoring-login-logo:' + rondoLogoURI(acc) + ' !important;');
        decl.push('  --login-logo-bg-url:' + rondoLogoURI(acc) + ' !important;');
        // v6.19.4: los componentes base de Wialon (wui-*) no siempre leen las
        // variables del skin, asi que se visten aparte para que no queden
        // islas con el tema original. Se limita a clases wui-* y a los
        // contenedores raiz; nunca a etiquetas sueltas (romperia el panel).
        const comp = [
            'html,body{background:' + P.bg + ' !important;color:' + P.fg + ' !important;}',
            '::selection{background:' + acc + ' !important;color:#fff !important;}',
            'input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible,' +
                '.ant-btn:focus-visible,.wui-button:focus-visible{outline:2px solid ' + acc + ' !important;outline-offset:1px;}',
            '.wui-input,.wui-select,.wui-textarea,.wui-combobox input{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            '.wui-checkmark{border-color:' + P.border + ' !important;}',
            '.wui-checkbox input:checked~.wui-checkmark{background:' + acc + ' !important;border-color:' + acc + ' !important;}',
            '.wui-tooltip,.wui-popup,.wui-dropdown,.wui-menu{background:' + P.strong +
                ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            // Ant Design compila los colores en cada regla (no usa variables),
            // asi que se visten sus componentes base a mano. Sin esto, en tema
            // oscuro el texto de AntD quedaria oscuro sobre oscuro.
            '.ant-btn-primary{background:' + acc + ' !important;border-color:' + acc + ' !important;color:#fff !important;}',
            '.ant-btn-primary:hover{background:' + accD + ' !important;border-color:' + accD + ' !important;}',
            '.ant-btn-default{background:' + P.soft + ' !important;border-color:' + P.border + ' !important;color:' + P.fg + ' !important;}',
            '.ant-btn,.ant-typography,.ant-form-item-label>label,.ant-descriptions-item-label,.ant-descriptions-item-content{color:' + P.fg + ' !important;}',
            '.ant-input,.ant-input-affix-wrapper,.ant-input-number,.ant-select-selector,.ant-picker{background:' + P.soft +
                ' !important;border-color:' + P.border + ' !important;color:' + P.fg + ' !important;}',
            '.ant-input::placeholder,.ant-input-affix-wrapper input::placeholder{color:' + P.mute + ' !important;}',
            '.ant-select-dropdown,.ant-dropdown-menu,.ant-picker-panel-container,.ant-modal-content,.ant-drawer-content,' +
                '.ant-popover-inner,.ant-notification-notice,.ant-message-notice-content,.ant-cascader-menu{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            '.ant-modal-header,.ant-drawer-header,.ant-tooltip-inner{background:' + P.soft + ' !important;color:' + P.fg + ' !important;}',
            '.ant-table,.ant-table-cell,.ant-table-thead>tr>th{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            '.ant-tabs-tab,.ant-tabs-tab-btn{color:' + P.dim + ' !important;}',
            '.ant-tabs-tab-active .ant-tabs-tab-btn{color:' + accT + ' !important;}',
            '.ant-checkbox-inner,.ant-radio-inner{background:' + P.soft + ' !important;border-color:' + P.border + ' !important;}',
            '.ant-checkbox-checked .ant-checkbox-inner,.ant-radio-checked .ant-radio-inner{background:' + acc + ' !important;border-color:' + acc + ' !important;}',
            '.ant-switch{background:' + P.strong + ' !important;}',
            '.ant-switch-checked{background:' + acc + ' !important;}',
            '.ant-tag{background:' + P.strong + ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            // Ventanas y tarjetas por vehiculo de Wialon: traen colores
            // literales (rgb(255,255,255), #172336...), no leen el skin. Se
            // visten a mano para que no queden islas claras en tema oscuro.
            '#tooltip,#tooltip2,.wui-tooltip,.mini-window-extra,.pursuit-window,.x-unit-info,.x-unit-tooltip,' +
                '.x-monitoring-units-extra-info-row,.monitoring_units_state_gps_wrapper,' +
                '.workspace-units-panel,.workspace-units-panel-main,.workspace-units-caption,' +
                '.x-map-report-marker-info,.map-control-info,.control-with-info,' +
                '.items-group-page-window,.notifications-list-dialog-window-container,' +
                '.gdpr-wizard-dialog-window,.help-window{background:' + P.soft + ' !important;color:' + P.fg + ' !important;}',
            '#tooltip .block-header,#tooltip2 .block-header,.x-unit-tooltip>.header,' +
                '.x-monitoring-units-extra-info-row{border-color:' + P.border + ' !important;}',
            '.pursuit-window .pursuit-top-container{background:' + P.strong + ' !important;color:' + P.fg + ' !important;}',
            '.pursuit-window .panoram-disable-button{background:' + P.soft + ' !important;color:' + P.fg + ' !important;}',
            '#tooltip a,#tooltip2 a,.x-unit-info a,.mini-window-extra a{color:' + accT + ' !important;}',
            // Ventana de unidad: cabeceras de tabla, bordes y boton de mapa.
            '.x-unit-info > .unit-table-data th{background:' + P.strong + ' !important;color:' + P.fg + ' !important;}',
            '.x-unit-info > .unit-table-data .td{border-color:' + P.border + ' !important;color:' + P.fg + ' !important;}',
            '.x-unit-info .external-map-link{background-color:' + P.soft + ' !important;}',
            // Contenedores de dialogos (propiedades de unidad, asistentes): si por
            // orden de hojas o por especificidad ganase la regla original, el
            // cuerpo saldria blanco con el texto claro del tema ilegible.
            '.wizard-dlg-content-target,.help-window-content,.vtabs .tabs-containers{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;}',
            '.wizard-dlg-content-target .block:not(:first-child),.wizard-dlg-content-target .block-separator{border-color:' +
                P.border + ' !important;}',
            // Valores de la tabla del unit-hint (velocidad, kilometraje, horas
            // de motor, satelites): van en <td class="icon"><div>...</div>. Se
            // fuerzan legibles (el icono del td si queda en color de icono).
            '[class*="_table_10z2h_"] td>div:not([class]){color:' + P.fg + ' !important;}',
            // Cinturon y tirantes: el contenido de la celda se eleva sobre su
            // velo ::before (z-index:0), sea cual sea su opacidad.
            '[class*="_table_"] td:not(:empty)>*{position:relative;z-index:1;}',
            // La ventana flotante de unidad (que sale al pasar el raton) es un
            // tippy: .tippy-box._messageBox_*. Su fondo sale de
            // --white-color-message-box (que tambien es el texto blanco de los
            // popups de severidad, por eso NO se toca el token). Se viste la
            // clase del contenedor con [class*=] para sobrevivir a los hashes.
            '.tippy-box,[class*="_messageBox_"],[class*="_messageBoxWrapper_"]{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;}',
            '[class*="_content-wrapper_"],[class*="_contentText_"],[class*="_contentWrapper_"],' +
                '.tippy-content{background:transparent !important;color:' + P.fg + ' !important;}',
            // --gray-900 se usa tambien de fondo en 2 sitios: al volverse claro
            // hay que forzarlos oscuros.
            '.win-video-cams-wrapper{background:' + P.bg + ' !important;}',
            '[class*="_backdrop_"]{background:rgba(0,0,0,.5) !important;}',
            // .wui-tooltip NO define fondo propio en la plataforma (solo
            // box-shadow/color/padding), asi que se transparentaba y se veia
            // el mapa detras. Se fuerza opaco + los fondos claros que la
            // plataforma si declara dentro de la ventana.
            '#tooltip td.h-separator,#tooltip2 td.h-separator,' +
                '#tooltip .block-mixed tr.colored-row,#tooltip2 .block-mixed tr.colored-row,' +
                '#tooltip #tooltip_zone .zone-units tr:nth-child(2n+1),' +
                '.hittest-ctrl-point-description .block-mixed tr.colored-row,' +
                'tr.unit-cmds-response-row,tr.unit-cmds-response-row-msg,' +
                '.pursuit-window .no-flash,' +
                'div.pursuit-window div.mini-window-extra#tooltip,' +
                'div.pursuit-window div.mini-window-extra#tooltip2{background:' + P.soft + ' !important;}',
            'div.pursuit-window #tooltip .win-video-cams-table{background:' + P.soft + ' !important;}',
            'div.pursuit-window #tooltip .win-video-grid-panel{background:' + P.strong + ' !important;}',
            'div.pursuit-window #tooltip .win-video-header{background:' + P.strong + ' !important;color:' + P.fg + ' !important;}',
            '#tooltip h3,#tooltip2 h3,.wui-tooltip h3{color:' + P.fg + ' !important;}',
            '.x-unit-info .entity-block-item > .image-container{border-color:' + P.border + ' !important;}',
            // Botones junto al mapa: el blanco real viene de
            // .wui-button-icon-shadow (background-color:#fff), no de un
            // contenedor, asi que se viste esa clase y setransparentan los
            // contenedores que solo maquetan (ol-maps-control, ol-bar...).
            '.wui-button-icon-shadow{background:' + P.soft + ' !important;border-radius:8px !important;}',
            '.wui-button-icon-shadow:hover{background:' + P.strong + ' !important;}',
            '.wui-button-icon-shadow button,.wui-button-icon-shadow:hover button{background:' + P.soft + ' !important;}',
            '.ol-maps-control,.control-search,.ol-bar-container,.menu-smart-search,' +
                '.ol-layers-control,.ol-tools-panel{background:transparent !important;}',
            // Reportes, avisos, rutas y listas legacy (del volcado de estilos).
            '.report-result-body-table,.report-dialog-tables-dialog,.report-table-filters,.notify_dlg_table,' +
                '.unit-cmds-response-table,.x-cookie-policy,.whats-new-box,.chart_tooltip,' +
                '.route-control-create-cp-actions,.report-result-toolbar-icon,.waypoint_toolbar_btn,' +
                '.export-control,.time-tags-container,.map_webgis_search_list{background:' + P.soft +
                ' !important;color:' + P.fg + ' !important;border-color:' + P.border + ' !important;}',
            '.report-result-body-table th,.report-dialog-tables-dialog th,.notify_dlg_table th,' +
                '.report-table-filters th{background:' + P.strong + ' !important;color:' + P.fg + ' !important;}',
            '.tag-switcher,.trackbar,.x-cookie-policy{color:' + P.dim + ' !important;}',
            'html .ol-viewport{background:' + P.bg + ' !important;}',
            '.map-control-info{background:' + P.strong + ' !important;color:' + P.fg +
                ' !important;border-color:' + P.border + ' !important;}',
            '.mapboxgl-ctrl-group{background:transparent !important;box-shadow:none !important;border-radius:0 !important;}',
            '.mapboxgl-ctrl-group button{background:' + P.soft + ' !important;border-radius:8px !important;' +
                'margin:4px 0 !important;box-shadow:0 1px 3px rgba(0,0,0,.35) !important;}',
            '.mapboxgl-ctrl-group button+button{border-top:none !important;}',
            '.MicrosoftMap .NavBar_Container,.MicrosoftMap .streetsideToolPanel{background:transparent !important;}',
            '.MicrosoftMap .NavBar_Button,.MicrosoftMap .streetsideToolPanelButton{background:' + P.soft +
                ' !important;border-radius:8px !important;}',
            // Ajusta el logo RONDO a su caja (el SVG trae su propio tamano).
            '.top .logo,.logo,#block_top_panel .logo,.logo-wrapper .logo{background-size:contain !important;' +
                'background-repeat:no-repeat !important;background-position:center !important;}',
            '._LoginContainerLogo,.logo-img,#monitoringLoginLogo{background-size:contain !important;' +
                'background-repeat:no-repeat !important;background-position:center !important;}'
        ].join('\n');
        _rxCompCSS = comp;
        let el = elPrev;
        if (!el) {
            el = document.createElement('style');
            el.id = 'rondo-estilo-pagina';
            (document.head || document.documentElement).appendChild(el);
        }
        // Se aplica a :root, html y body para ganar a las variables del skin
        // que la plataforma declare en cualquiera de esos niveles.
        el.textContent = ':root,html,body{\n' + decl.join('\n') + '\n}\n' + comp + '\n';
    }
    // v6.19.5: capa de rendimiento CSS. No toca JS ni red: reduce el trabajo de
    // pintado/composicion del navegador sobre la plataforma, que es lo que
    // produce el "trabado" al hacer scroll o animar. Es opt-in y reversible.
    function rxAplicarRendimientoPagina() {
        const elPrev = document.getElementById('rondo-rendimiento-pagina');
        if (!(APP.config && APP.config.rendimientoPagina)) {
            if (elPrev && elPrev.parentNode) elPrev.parentNode.removeChild(elPrev);
            return;
        }
        let el = elPrev;
        if (!el) {
            el = document.createElement('style');
            el.id = 'rondo-rendimiento-pagina';
            (document.head || document.documentElement).appendChild(el);
        }
        const reglas = [
            // Controles nativos (inputs, scrollbars, date pickers...) con el
            // esquema del tema: menos repintado y sin estilos de scrollbar por
            // JS. Barra fina con color de borde de Rondo.
            'html{color-scheme:' + (APP.config.theme === 'claro' ? 'light'
                : (APP.config.theme === 'auto' ? 'light dark' : 'dark')) + ' !important;}',
            '*{scrollbar-width:thin;scrollbar-color:var(--rondo-border) transparent;}',
            // Los desenfoques (backdrop-filter) son de lo mas caro por frame.
            '*{-webkit-backdrop-filter:none !important;backdrop-filter:none !important;}',
            // El scroll suave va por el hilo principal: fuera.
            'html{scroll-behavior:auto !important;}',
            // Filas/cartas fuera de pantalla: no se calculan ni se pintan.
            '.wui2-list_row,.wui-list_item,.ant-table-row,.ant-list-item,.ant-select-item,' +
                '.ant-table-tbody>tr,.wui2-list_group-row{content-visibility:auto;contain-intrinsic-size:auto 38px;}',
            // Cada fila se pinta aislada: un cambio dentro no refluye el resto.
            '.wui2-list_row,.wui-list_item,.ant-table-row{contain:layout style paint;}',
            // Transiciones cortas y solo de propiedades que no repintan.
            '.wui-button,.wui-icon,.ant-btn,.wui2-button{transition:background-color .1s,color .1s,border-color .1s,opacity .1s !important;}',
            // Respeta "reducir movimiento" del sistema.
            '@media (prefers-reduced-motion: reduce){*{animation:none !important;transition:none !important;}}'
        ].join('\n');
        el.textContent = reglas + '\n';
    }
    /* --- Remapeo de colores literales (v6.19.6) -------------------------
     * Solo ~9% de las reglas de la plataforma traen color literal, pero son
     * las "islas" que no siguen el tema (tarjetas y ventanas por vehiculo,
     * grillas viejas como .flexigrid, controles del mapa .MicrosoftMap,
     * .date_selector...). En vez de enumerar cientos de selectores, se
     * recorren las hojas y se reescriben esas declaraciones segun su
     * PROPIEDAD, que es lo que quita la ambiguedad:
     *   - fondo claro      -> superficie (soft/strong/bg)
     *   - texto            -> fg/dim/mute (o #fff si era casi blanco)
     *   - borde            -> borde de Rondo
     *   - azul/rojo saturado -> acento (verde/naranja de estado se respetan)
     * Se ignoran los valores con var() y las custom properties: eso ya lo
     * cubre el mapa de tokens. La hoja reescrita se inserta al final del
     * head, asi gana en cascada sin usar !important (no rompe :hover). */
    // Parsea un color CSS a {r,g,b,a}. Admite hex (3/4/6/8 digitos), rgb()/rgba()
    // con coma o espacio, alfa con "/" y porcentajes. Devuelve null para
    // transparent/currentcolor/inherit/none y para lo que no sabe leer (var()).
    function rxParseAlfa(x) {
        const t = String(x).trim();
        const n = t.indexOf('%') >= 0 ? parseFloat(t) / 100 : parseFloat(t);
        if (!isFinite(n)) return null;
        return Math.max(0, Math.min(1, n));
    }
    function rxColorParse(v) {
        const t = String(v || '').trim().toLowerCase();
        if (t === 'white') return { r: 255, g: 255, b: 255, a: 1 };
        if (t === 'black') return { r: 0, g: 0, b: 0, a: 1 };
        if (t === 'transparent' || t === 'currentcolor' || t === 'inherit' || t === 'none') return null;
        let m = /^#([0-9a-f]{3,8})$/.exec(t);
        if (m) {
            let h = m[1];
            if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
            else if (h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
            if (h.length === 6) h += 'ff';
            if (h.length !== 8) return null;
            return {
                r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16),
                b: parseInt(h.slice(4, 6), 16), a: parseInt(h.slice(6, 8), 16) / 255
            };
        }
        m = /^rgba?\((.*)\)$/.exec(t);
        if (!m) return null;
        let cuerpo = m[1].trim();
        let alfa = 1;
        const barra = cuerpo.split('/');
        if (barra.length === 2) { cuerpo = barra[0]; alfa = rxParseAlfa(barra[1]); }
        const p = cuerpo.split(/[\s,]+/).filter(Boolean);
        if (p.length === 4) alfa = rxParseAlfa(p[3]);
        if (p.length < 3 || alfa === null) return null;
        const num = (x) => (x.indexOf('%') >= 0 ? parseFloat(x) * 2.55 : parseFloat(x));
        const r = num(p[0]), g = num(p[1]), b = num(p[2]);
        if (![r, g, b].every((x) => isFinite(x))) return null;
        return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: alfa };
    }
    // Alfa de un valor (1 si no es un color leible, p. ej. var()).
    function rxAlfaDe(valor) {
        const c = rxColorParse(valor);
        return c ? c.a : 1;
    }
    // Aplica un alfa a un color. Si el color ya trae alfa, se multiplican.
    // Un alfa de 1 devuelve el valor tal cual (no se degrada a rgb).
    function rxConAlfaCss(valor, a) {
        if (a === undefined || a === null || a >= 0.999) return valor;
        const c = rxColorParse(valor);
        if (!c) return valor;
        const fin = Math.max(0, Math.min(1, a * c.a));
        return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (Math.round(fin * 1000) / 1000) + ')';
    }
    function rxColorHue(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
        if (!d) return 0;
        let h;
        if (mx === r) h = ((g - b) / d) % 6;
        else if (mx === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        return h < 0 ? h + 360 : h;
    }
    // Rol (clave de paleta) de un color literal segun la PROPIEDAD donde
    // aparece. Devuelve la clave, NO un color: la regla reescrita usara
    // var(--rpg-*) y cambiar de tema sera solo repintar esas variables, sin
    // volver a recorrer el CSS de la pagina.
    let _rxTemaClaro = false; // tema activo durante la pasada (lo fija rxAplicarColoresPagina)
    let _rxCtx = null;        // { P, acc, accD } de la pasada, para mapear literales
    let _rxVarsMapa = null;   // variables de la plataforma de la pasada (con su alfa)
    // En SVG, `fill` pinta tanto texto/iconos como fondos de region (las bandas
    // del grafico). Un <text> o un simbolo dentro de <defs>/<symbol> es TEXTO;
    // una forma suelta (g, rect, path...) con relleno claro es una SUPERFICIE.
    function rxEsFormaSVG(el) {
        try {
            const t = String(el && el.tagName || '').toLowerCase();
            if (!/^(svg|g|rect|circle|ellipse|polygon|polyline|path|line|use)$/.test(t)) return false;
            if (el.closest && el.closest('defs,symbol,marker,pattern,clipPath')) return false;
            return true;
        } catch (_) { return false; }
    }
    function rxColorClave(v, prop, el) {
        const c = rxColorParse(v);
        if (!c) return null;
        const p = String(prop || '').toLowerCase();
        if (p.indexOf('--') === 0) return null;
        if (/shadow|image|filter|transition|animation|opacity|transform|content/.test(p)) return null;
        if (c.a < 0.08) return null;
        const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
        const lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
        const sat = max === 0 ? 0 : (max - min) / max;
        if (sat > 0.25) {
            const hue = rxColorHue(c.r, c.g, c.b);
            // En SVG, el relleno de una forma (icono) es fondo; el de un <text> es
            // texto. Pintar un icono con la variante de texto lo dejaria apagado.
            const esTexto = p === 'color' || p === 'caret-color' ||
                ((p === 'fill' || p === 'stroke') && !(el && rxEsFormaSVG(el)));
            if (hue <= 20 || hue >= 330) return esTexto ? 'acctxt' : 'accent';                // rojo del skin
            if (hue >= 190 && hue <= 265 && lum > 0.16) return esTexto ? 'acctxt' : 'accent'; // azul brillante
            if (lum > 0.16) return null;                                 // verde/ambar: estado
            // oscuro y saturado (azul marino del texto): cae a neutro
        }
        if (p.indexOf('background') === 0) {
            // Un velo claro translucido (rgba(255,255,255,.1)) en tema oscuro debe
            // seguir siendo un realce claro, no un oscurecimiento.
            if (c.a < 1 && lum > 0.5) return _rxTemaClaro ? 'soft' : 'fg';
            if (lum > 0.9) return 'soft';
            if (lum > 0.45) return 'strong';
            return 'bg';
        }
        if (p.indexOf('border') === 0 || p.indexOf('outline') === 0 || p.indexOf('column-rule') === 0) return 'border';
        // Relleno claro de una forma SVG sin texto: es una region/fondo, no
        // texto sobre acento (el blanco de los iconos va por 'on').
        if (p === 'fill' && el && rxEsFormaSVG(el)) {
            if (lum > 0.98) return 'bg';
            if (lum > 0.85) return 'soft';
            if (lum > 0.45) return 'strong';
            if (lum < 0.25) return 'fg';
        }
        if (p === 'color' || p === 'fill' || p === 'stroke' || p === 'caret-color') {
            if (lum > 0.85) return 'on';
            if (lum > 0.55) return 'mute';
            if (lum > 0.3) return 'dim';
            return 'fg';
        }
        return null;
    }
    // Debe dar el MISMO color que rxPaginaToken para cada clave: el remap
    // (var(--rpg-*)) y la emision global de variables comparten el mapa. Si
    // faltaba una clave (transparent, tintes de acento), el remap caia al color
    // de TEXTO y, p. ej., la barra superior (fondo transparente) salia clara.
    function rxColorValor(clave, P, acc, accD) {
        if (clave === 'accent') return acc;
        if (clave === 'hover') return accD;
        if (clave === 'on') return '#ffffff';
        if (clave === 'transparent') return 'transparent';
        if (clave === 'accent-2') return aclarar(acc, 0.28);
        if (clave === 'accent-bg') return aclarar(acc, 0.28) + '22';
        if (clave === 'accent-bg-hover') return aclarar(acc, 0.28) + '33';
        if (clave === 'acctxt') return rxAcentoTexto(acc, P);
        if (clave === 'hovtxt') return rxAcentoTexto(acc, P, 0.12);
        return P[clave] || P.fg;
    }
    // Rol de una clave de paleta: a que propiedad pertenece.
    function rxPaginaRolClave(clave) {
        if (clave === 'bg' || clave === 'soft' || clave === 'strong' || clave === 'veil') return 'fondo';
        if (/^(ok|warn|bad|info)bg$/.test(clave)) return 'fondo';
        if (/^(ok|warn|bad|info)fg$/.test(clave)) return 'texto';
        if (clave === 'border') return 'borde';
        if (clave === 'fg' || clave === 'dim' || clave === 'mute' || clave === 'on') return 'texto';
        return 'acento'; // accent, hover, accent-2, accent-bg*, transparent
    }
    function rxPropRol(prop) {
        if (/^(border|outline|column-rule)/.test(prop)) return 'borde';
        if (prop.indexOf('background') === 0) return 'fondo';
        return 'texto';
    }
    // Rol de una CUSTOM PROPERTY (--tab-bg-color, --color-text...) por su
    // NOMBRE. Sirve para reescribir definiciones tipo `--x: var(--white)`:
    // el rol del token destino manda (una variable *-background es fondo
    // aunque apunte a --white, que tambien vale como texto).
    function rxRolNombre(name) {
        const n = String(name || '').replace(/^--/, '').toLowerCase();
        if (n.indexOf('border') >= 0) return 'borde';
        if (n.indexOf('background') >= 0 || /(^|-)bg(-|$)/.test(n)) return 'fondo';
        return 'texto';
    }
    function rxAcentoComoTexto(clave) {
        if (clave === 'accent') return 'acctxt';
        if (clave === 'hover') return 'hovtxt';
        return clave;
    }
    // Clave de paleta para una variable del tema segun el ROL (texto, fondo o
    // borde) donde se use. Asi una variable que Wialon usa como fondo Y como
    // texto nunca contagia un rol con el otro. Los tokens de acento valen para
    // cualquier rol.
    function rxTokenClave(tok, rol) {
        if (RX_PAGINA_MIXTOS[tok]) return RX_PAGINA_MIXTOS[tok][rol] || RX_PAGINA_MIXTOS[tok].fondo;
        const clave = RX_PAGINA_MAPA[tok] || RX_PAGINA_GRISES_OSCURO[tok];
        if (!clave) return null;
        if (rxPaginaRolClave(clave) === 'acento') return rol === 'texto' ? rxAcentoComoTexto(clave) : clave;
        if (rol === rxPaginaRolClave(clave)) return clave;
        if (rol === 'fondo') return 'soft';
        if (rol === 'borde') return 'border';
        return 'fg';
    }
    // Literales de color dentro de un valor (hex o rgb/rgba).
    const RX_COLOR_LIT = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
    // Registro de variables del remap. El id es AUTODESCRIPTIVO (clave + alfa), no
    // un hash: asi cualquier var(--rpg-*) que ya este escrita en el DOM (estilos
    // inline de un SVG, un nodo clonado o un ciclo desactivar/reactivar) se puede
    // volver a registrar sin conocer el literal original. Con ids opacos,
    // reactivar dejaba var(--rpg-c9y16pd) sin definir y la grafica salia blanca.
    const _rxVars = {};
    const _rxVarsOrden = [];
    const _rxVarsAlfa = {}; // id -> alfa (transparencias)
    function rxVarId(lit, clave, alfa) {
        const a = alfa === undefined ? rxAlfaDe(lit) : alfa;
        const redondeado = Math.round(a * 100) / 100;
        const id = redondeado < 0.999 ? clave + '-a' + Math.round(a * 100) : clave;
        rxRegistrarVar(id, clave, redondeado < 0.999 ? redondeado : 1);
        return id;
    }
    function rxRegistrarVar(id, clave, alfa) {
        if (id === undefined || id === null || id === '') return;
        if (_rxVars[id] === undefined) _rxVarsOrden.push(id);
        _rxVars[id] = clave;
        _rxVarsAlfa[id] = alfa === undefined ? 1 : alfa;
    }
    // Claves de paleta validas: un id de la version anterior (hash opaco,
    // p. ej. "c9y16pd") NO es una clave y no debe re-registrarse (se pintaria
    // con el color de texto por defecto).
    const RX_RPG_KEYS = {
        bg: 1, soft: 1, strong: 1, veil: 1, fg: 1, dim: 1, mute: 1, border: 1, on: 1,
        transparent: 1, accent: 1, hover: 1, 'accent-2': 1, 'accent-bg': 1,
        'accent-bg-hover': 1, acctxt: 1, hovtxt: 1, okbg: 1, warnbg: 1, badbg: 1,
        infobg: 1, okfg: 1, warnfg: 1, badfg: 1, infofg: 1
    };
    // Interpreta un id autodescriptivo: "soft", "soft-a12", "accent-2".
    function rxParseVarId(id) {
        const m = /^(.*?)(?:-a(\d{1,3}))?$/.exec(String(id));
        if (!m || !m[1] || !RX_RPG_KEYS[m[1]]) return null;
        return { clave: m[1], alfa: m[2] ? Math.min(1, parseInt(m[2], 10) / 100) : 1 };
    }
    // Atajos de color. Cuando un atajo lleva var() (background: var(--x);
    // border: 1px solid var(--y)) el navegador lista las propiedades SUELTAS
    // (background-color, border-top-color...) con valor VACIO y guarda el
    // texto solo en el atajo. Recorrer unicamente style[i] ignoraba todas esas
    // reglas (~1000 en la plataforma: fondos de dialogos, pestanas, bordes).
    const RX_ATAJOS_COLOR = ['background', 'border', 'border-top', 'border-right', 'border-bottom',
        'border-left', 'border-color', 'outline', 'column-rule'];
    // Reescribe var(--token) por el color del rol y, fuera de variables, los
    // literales por su rol. Devuelve el mismo texto si nada cambia.
    function rxReescribirColor(val, prop, rol, esCustom, el) {
        let v = val.replace(/var\(--([a-zA-Z0-9_-]+)\)/g, (full, tok) => {
            if (tok.indexOf('rpg-') === 0) {
                // Ya reescrita antes: se re-registra por si el registro se
                // reinicio (desactivar/reactivar) o el nodo viene de otra parte.
                const id = tok.slice(4);
                if (!_rxVars[id]) {
                    const p = rxParseVarId(id);
                    if (p) rxRegistrarVar(id, p.clave, p.alfa);
                }
                return full;
            }
            const clave = rxTokenClave(tok, rol);
            if (!clave) return full;
            // El token hereda el alfa de la variable original (--accent-bg-color
            // es translucida): sin esto el remap la volvia opaca.
            const orig = _rxVarsMapa ? _rxVarsMapa.get(tok) : undefined;
            const alfa = orig !== undefined ? rxAlfaDe(orig) : 1;
            return 'var(--rpg-' + rxVarId('tok:' + tok + ':' + clave, clave, alfa) + ')';
        });
        // Los literales solo en reglas normales: reescribir el valor de una
        // variable por un literal la fijaria fuera del tema.
        if (!esCustom) {
            v = v.replace(RX_COLOR_LIT, (lit) => {
                const clave = rxColorClave(lit, prop, el);
                return clave ? 'var(--rpg-' + rxVarId(lit, clave) + ')' : lit;
            });
        }
        return v;
    }
    function rxDeclaracionesRondo(style, P, acc, acc2, accD) {
        let cambio = false;
        const partes = [];
        const hechos = {};
        for (let i = 0; i < style.length; i++) {
            const prop = style[i];
            const val0 = style.getPropertyValue(prop);
            if (!val0) continue; // longhand de un atajo con var(): se ve abajo
            const esCustom = prop.indexOf('--') === 0;
            // Propiedades de color Y definiciones de variables: en ambos casos
            // se sustituye `var(--token)` por el color del rol correcto. Para
            // las custom properties el rol sale del NOMBRE (--tab-bg-color ->
            // fondo), porque el valor de la var no dice donde se usara.
            if (!(esCustom || /color|background|border|outline|fill|stroke|caret/.test(prop))) continue;
            const val = rxReescribirColor(val0, prop, esCustom ? rxRolNombre(prop) : rxPropRol(prop), esCustom);
            if (val === val0) continue; // solo se emite lo que cambio
            cambio = true;
            hechos[prop] = true;
            const prio = style.getPropertyPriority(prop);
            partes.push(prop + ':' + val + (prio ? ' !important' : '') + ';');
        }
        for (let k = 0; k < RX_ATAJOS_COLOR.length; k++) {
            const atajo = RX_ATAJOS_COLOR[k];
            if (hechos[atajo]) continue;
            const v0 = style.getPropertyValue(atajo);
            if (!v0 || v0.indexOf('var(') < 0) continue;
            const v = rxReescribirColor(v0, atajo, rxPropRol(atajo), false);
            if (v === v0) continue;
            cambio = true;
            partes.push(atajo + ':' + v + (style.getPropertyPriority(atajo) ? ' !important' : '') + ';');
        }
        return cambio ? partes.join('') : '';
    }
    function rxReglasRondo(reglas, P, acc, acc2, accD) {
        const out = [];
        for (let i = 0; i < reglas.length; i++) {
            const r = reglas[i];
            if (r.cssRules && (r.type === 4 || r.type === 12)) {
                const cond = r.conditionText || (r.media && r.media.mediaText) || '';
                const inner = rxReglasRondo(r.cssRules, P, acc, acc2, accD);
                if (inner) out.push((r.type === 4 ? '@media ' : '@supports ') + cond + '{' + inner + '}');
                continue;
            }
            // @layer / @container / @scope: la plataforma hoy solo usa @media y
            // @supports, pero Vite/Ant Design ya emiten estos; sus reglas
            // quedarian sin tema. Se conserva la cabecera para no cambiar la
            // prioridad de las capas. (@keyframes y @font-face no se tocan.)
            if (r.cssRules && !r.selectorText && r.type !== 4 && r.type !== 12 && r.type !== 7 &&
                typeof r.cssText === 'string') {
                const cab = /^@(layer|container|scope)\b[^{]*/.exec(r.cssText);
                if (cab) {
                    const inner = rxReglasRondo(r.cssRules, P, acc, acc2, accD);
                    if (inner) out.push(cab[0].trim() + '{' + inner + '}');
                }
                continue;
            }
            if (!r.selectorText || !r.style) continue;
            const decls = rxDeclaracionesRondo(r.style, P, acc, acc2, accD);
            if (decls) out.push(r.selectorText + '{' + decls + '}');
        }
        return out.join('');
    }
    let _rxObs = null;
    let _rxObsBody = null;
    // hoja -> n.o de reglas ya procesadas. Las hojas CSS-in-JS (emotion de
    // react-select, cssinjs de Ant Design) CRECEN con insertRule cuando se abre
    // un dialogo; si la hoja se diera por "vista" esas reglas quedarian sin tema.
    let _rxHojasVistas = null;
    let _rxPoll = 0;
    let _rxUltimoN = -1;
    let _rxTimer = 0;
    let _rxCompCSS = '';
    function rxHojaRondo(id) {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('style');
            el.id = id;
            (document.head || document.documentElement).appendChild(el);
        }
        return el;
    }
    // Asigna el contenido solo si cambio. Reasignar textContent aunque sea igual
    // obliga al navegador a REPARSEAR la hoja entera y a recalcular estilos de
    // toda la plataforma: en cada pasada eso se notaba como "pesado".
    function rxHojaSet(id, txt) {
        const el = rxHojaRondo(id);
        if (el.__rondoTxt === txt) return el;
        el.textContent = txt;
        el.__rondoTxt = txt;
        return el;
    }
    // Anexa a una hoja (colores) sin reescribir lo ya puesto: crece con CSS-in-JS.
    function rxHojaAnexar(id, txt) {
        const el = rxHojaRondo(id);
        el.textContent += txt;
        el.__rondoTxt = el.textContent;
        return el;
    }
    // Pinta SOLO las variables del remap (barato): es lo unico que hay que
    // rehacer al cambiar de tema o acento.
    // v6.0.14: redefine las variables DE LA PLATAFORMA (no las nuestras). Se
    // refresca cada pasada porque una hoja cargada tarde declara variables nuevas.
    function rxPintarVariablesPlataforma(P, acc, acc2) {
        try {
            const txt = rxHojaVariables(P, P.claro, acc, acc2);
            if (txt) rxHojaSet('rondo-var-plataforma', txt);
        } catch (_) { /* noop */ }
    }
    function rxPintarTokens(P, acc, accD) {
        if (!_rxVarsOrden.length) return;
        const partes = [];
        for (let i = 0; i < _rxVarsOrden.length; i++) {
            const id = _rxVarsOrden[i];
            const v = rxColorValor(_rxVars[id], P, acc, accD);
            partes.push('  --rpg-' + id + ':' + rxConAlfaCss(v, _rxVarsAlfa[id]) + ';');
        }
        rxHojaSet('rondo-tokens-pagina', ':root,html,body{\n' + partes.join('\n') + '\n}\n');
    }
    function rxProgramarColoresPagina() {
        clearTimeout(_rxTimer);
        _rxTimer = setTimeout(() => { try { rxAplicarColoresPagina(); } catch (_) { /* noop */ } }, 400);
    }
    function rxDesactivarColores() {
        rxRestaurarInline();
        rxRestaurarLiterales();
        _rxVarsPlat = null; _rxVarsLista = null; _rxVarsHojas = null;
        ['rondo-colores-pagina', 'rondo-tokens-pagina', 'rondo-var-plataforma'].forEach((id) => {
            const el = document.getElementById(id);
            if (el && el.parentNode) el.parentNode.removeChild(el);
        });
        if (_rxObs) { _rxObs.disconnect(); _rxObs = null; }
        if (_rxObsBody) { _rxObsBody.disconnect(); _rxObsBody = null; }
        Object.keys(_rxVars).forEach((k) => delete _rxVars[k]);
        _rxVarsOrden.length = 0;
        Object.keys(_rxVarsAlfa).forEach((k) => delete _rxVarsAlfa[k]);
        _rxVarsMapa = null;
        _rxSueltosVistos = null;
        _rxHojasVistas = null;
        if (_rxPoll) { clearInterval(_rxPoll); _rxPoll = 0; }
        _rxUltimoN = -1;
    }
    // Procesa las reglas de una hoja que aun no se vieron. Incremental: una hoja
    // ya hecha no se reparsea, pero si ha ganado reglas (CSS-in-JS) solo se
    // procesan las NUEVAS. Si encoge (deleteRule) se reprocesa entera.
    function rxProcesarHoja(hoja, P, acc, acc2, accD) {
        if (!hoja) return false;
        if (!_rxHojasVistas) _rxHojasVistas = typeof WeakMap === 'function' ? new WeakMap() : null;
        let rs;
        try { rs = hoja.cssRules || []; } catch (_) { return false; }
        let desde = _rxHojasVistas ? (_rxHojasVistas.get(hoja) || 0) : 0;
        if (rs.length < desde) desde = 0;
        if (rs.length === desde) return false;
        if (_rxHojasVistas) _rxHojasVistas.set(hoja, rs.length);
        let t = '';
        try { t = rxReglasRondo(desde ? Array.prototype.slice.call(rs, desde) : rs, P, acc, acc2, accD); } catch (_) { return false; }
        if (!t) return false;
        rxHojaAnexar('rondo-colores-pagina', '\n' + t);
        return true;
    }
    // Las hojas del remap deben ser las ULTIMAS del <head>. A igual especificidad
    // gana la ultima en el orden del documento, y la plataforma carga modulos
    // con sus hojas (<link>/<style>, emotion...) DESPUES de nuestra primera
    // pasada: sin esto sus reglas (p. ej. .wizard-dlg-content-target{background:
    // var(--wizard-dialog-background)}) volvian a ganar y el dialogo salia
    // blanco. Solo se mueve si hace falta (reinsertar reparsea la hoja).
    function rxMantenerAlFinal() {
        try {
            const head = document.head || document.documentElement;
            const col = document.getElementById('rondo-colores-pagina');
            if (!col || !head || !head.children) return false;
            const tok = document.getElementById('rondo-tokens-pagina');
            const vrp = document.getElementById('rondo-var-plataforma');
            const h = head.children, n = h.length;
            const fin = vrp || tok || col;
            const bien = n >= 1 && h[n - 1] === fin;
            if (bien) return false;
            head.appendChild(col);
            if (tok) head.appendChild(tok);
            if (vrp) head.appendChild(vrp);
            return true;
        } catch (_) { return false; }
    }
    // Suma de reglas de las hojas ajenas a Rondo (barato: ~60 hojas). Cambia
    // cuando la plataforma inserta reglas sin anadir ningun <style>.
    function rxContarReglas() {
        let n = 0;
        try {
            const hs = document.styleSheets;
            for (let i = 0; i < hs.length; i++) {
                const o = hs[i].ownerNode;
                if (o && o.id && o.id.indexOf('rondo') === 0) continue;
                try { n += hs[i].cssRules.length; } catch (_) { /* cross-origin */ }
            }
        } catch (_) { /* noop */ }
        return n;
    }
    // Wialon pinta los valores de sensores/tarjetas con colores INLINE
    // (style="background-color:#fff; color:#fff"). El remap de hojas no los ve,
    // asi que quedan como islas: texto claro sobre fondo claro del mismo color.
    // Se remapean igual (por propiedad) dentro de las ventanas/tarjetas, nunca
    // en el panel de Rondo.
    // ===== CAPA 3: LITERALES REESCRITOS EN SITIO =====
    // Lo que no pasa por variables (un color escrito a pelo en la regla, un SVG,
    // un fondo de Ant Design) se modifica DENTRO de la regla original: misma
    // posicion en la cascada, misma especificidad y mismo !important. Nada que
    //_gainar, nada que clonar.
    const RX_PROPS_COLOR = /^(color|background-color|border-top-color|border-right-color|border-bottom-color|border-left-color|outline-color|column-rule-color|fill|stroke|caret-color|text-decoration-color|box-shadow|text-shadow)$/;
    // Literal de color dentro de un valor (hex o rgb/rgba, con alfa).
    const RX_COLOR_LIT_G = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
    // Las hojas de Rondo NO se tocan: si el motor se reescribiera a si mismo
    // (sus tokens y sus reglas de compatibilidad) el tema se deformaria en cada
    // pasada. Es el mismo filtro que usa rxAplicarColoresPagina.
    function rxEsHojaRondo(sh) {
        const o = sh && sh.ownerNode;
        return !!(o && o.id && String(o.id).indexOf('rondo') === 0);
    }
    let _rxLitHojas = null;    // WeakMap hoja -> reglas ya leidas
    let _rxLitHechos = null;   // WeakSet de reglas ya reescritas
    let _rxLitTema = '';
    let _rxLitRegistro = null; // [regla, prop, valorOriginal, prioridad] para restaurar
    function rxLiteralColor(v) {
        v = String(v || '').trim();
        if (/^transparent$/i.test(v)) return { hex: null };
        if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return { hex: v };
        const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v);
        if (m) return { hex: '#' + [1, 2, 3].map((i) => (+m[i]).toString(16).padStart(2, '0')).join('') };
        return null;
    }
    // v6.19.7: incremental. Antes recorria las ~11.000 reglas de la plataforma en
    // CADA pasada (60-80 ms) y las reescribia una y otra vez: con el sondeo cada
    // 1,5 s eso bloqueaba el hilo principal y las ventanas tardaban o no se
    // montaban. Ahora cada hoja se lee una vez y solo se reescriben las reglas
    // NUEVAS (las de CSS-in-JS, que crecen al abrir un dialogo). Cambiar de tema
    // reinicia el registro, y rxDesactivarColores restaura los literales.
    function rxReescribirLiterales(P, tema) {
        let n = 0;
        let rs = null;
        try { rs = document.styleSheets; } catch (_) { return n; }
        if (typeof WeakMap !== 'function') return n;
        const clave = (P && P.fg) + '|' + (P && P.soft) + '|' + (tema || '');
        if (clave !== _rxLitTema || !_rxLitHojas) {
            // Cambio de tema: primero se deshace lo escrito con el tema anterior.
            // Sin esto el texto claro del tema oscuro se remapearia como si fuera
            // el original y el tema claro quedaria con texto blanco.
            if (_rxLitRegistro && _rxLitRegistro.length) rxRestaurarLiterales();
            _rxLitTema = clave;
            _rxLitHojas = new WeakMap();
            _rxLitHechos = new WeakSet();
            _rxLitRegistro = [];
        }
        for (let i = 0; i < rs.length; i++) {
            const hoja = rs[i];
            if (rxEsHojaRondo(hoja)) continue;
            let reglas = null;
            try { reglas = hoja.cssRules; } catch (_) { continue; }
            if (!reglas) continue;
            if (_rxLitHojas.get(hoja) === reglas.length) continue;
            _rxLitHojas.set(hoja, reglas.length);
            n += rxLiteralesDeReglas(reglas, P, 0);
        }
        return n;
    }
    // Mapea UN literal de color al de la paleta conservando su alfa: un
    // rgba(0,0,0,.5) de fondo sigue siendo un velo al 50%, con el color del tema.
    function rxMapearLiteral(lit, prop) {
        if (!_rxCtx) return lit;
        const clave = rxColorClave(lit, prop);
        if (!clave) return lit;
        const base = rxColorValor(clave, _rxCtx.P, _rxCtx.acc, _rxCtx.accD);
        if (!rxColorParse(base)) return lit; // transparent u otro no mapeable
        return rxConAlfaCss(base, rxAlfaDe(lit));
    }
    // Reescribe los literales de cada LONGHAND. Chromium lista los atajos
    // (border, background) como sus longhands, asi que el color de un
    // "border: 1px solid #E3E4E6" se cambia sin tocar el resto del atajo.
    function rxLiteralesDeReglas(reglas, P, prof) {
        let n = 0;
        if (!reglas || prof > 4) return n;
        for (let i = 0; i < reglas.length; i++) {
            const r = reglas[i];
            if (r.cssRules && !r.style) { n += rxLiteralesDeReglas(r.cssRules, P, prof + 1); continue; }
            const st = r.style;
            if (!st || !st.length) continue;
            if (_rxLitHechos.has(r)) continue;
            let toco = false;
            for (let j = st.length - 1; j >= 0; j--) {
                const prop = st[j];
                if (!RX_PROPS_COLOR.test(prop)) continue;
                const v = st.getPropertyValue(prop);
                if (!v) continue;
                const nv = v.replace(RX_COLOR_LIT_G, (lit) => rxMapearLiteral(lit, prop));
                if (nv === v) continue;
                const prio = st.getPropertyPriority(prop);
                _rxLitRegistro.push([r, prop, v, prio]);
                st.setProperty(prop, nv, prio);
                toco = true;
                n++;
            }
            if (toco) _rxLitHechos.add(r);
        }
        return n;
    }
    // Deshacer la reescritura en sitio: sin esto, desactivar estiloPagina dejaba
    // las hojas de la plataforma con los colores oscuros ya escritos dentro.
    function rxRestaurarLiterales() {
        try {
            if (_rxLitRegistro) {
                for (let i = 0; i < _rxLitRegistro.length; i++) {
                    const q = _rxLitRegistro[i];
                    try { q[0].style.setProperty(q[1], q[2], q[3]); } catch (_) { /* noop */ }
                }
            }
        } catch (_) { /* noop */ }
        _rxLitRegistro = null;
        _rxLitHojas = null;
        _rxLitHechos = null;
        _rxLitTema = '';
    }
    // ===== MOTOR DE VARIABLES (enfoque Dark Reader) =====
    // La plataforma define ~850 variables (:root) y pinta TODO con ellas. En vez
    // de clonar reglas y pelear por especificidad, se redefinen las variables
    // con !important en :root/html/body: la cascada hace el resto y TODO lo que
    // las use queda tematizado a la vez (dialogos, campos, avisos, scrollbars,
    // estados, sombras...). No hay orden de hojas ni "!important" que gainar.
    const RX_NOMBRES = /^(transparent|white|black|red|green|blue|gray|grey|orange|yellow|purple|pink|cyan|magenta|silver|maroon|navy|olive|lime|aqua|fuchsia|teal|currentcolor)$/i;
    // v6.0.14 / v6.9.1: un valor es color si es hex, rgb()/hsl(), un nombre o var().
    function rxEsColorValor(v) {
        v = String(v || '').trim();
        if (/^#[0-9a-fA-F]{3,8}\b/.test(v) || /^(rgb|hsl)a?\(/i.test(v) ||
            RX_NOMBRES.test(v) || /var\(/.test(v)) return true;
        // Sombra de caja: "0 4px 12px 0 #1723361A" o con varias capas separadas
        // por comas. Trae longitudes Y color, asi que no es una medida suelta.
        return /^-?[\d.]+(px|em|rem|%)?\b.*(#[0-9a-fA-F]{3,8}\b|(rgb|hsl)a?\()/i.test(v);
    }
    // Filtra medidas/cifras: --layer-modal, --time-input-width, --gap... no son color.
    const RX_NO_ROL = /font|size|radius|duration|width|height|spacing|padding|margin|index|offset|line-|weight|family|transition|animation|transform|image|url\(|-layer-|container|gap/i;
    function rxRolPorNombre(nombre, valor) {
        if (!rxEsColorValor(valor)) return null;
        const n = String(nombre).toLowerCase().replace(/^--/, '');
        if (RX_NO_ROL.test(n) && !/shadow|(^|-)(bg|background|surface)(-|$)|-color$/.test(n)) return null;
        const esFondo = /(^|-)(bg|background|surface|fill)(-|$)/.test(n);
        const esBorde = /border|separator|outline|divider/.test(n);
        const esSombra = /shadow/.test(n);
        const esTexto = /(^|-)(color|fg|foreground|text)(-|$)|text-color|color$/.test(n);
        if (esFondo && /error|danger|fail/.test(n)) return 'badbg';
        if (esFondo && /warn/.test(n)) return 'warnbg';
        if (esFondo && /success|(^|-)ok(-|$)/.test(n)) return 'okbg';
        if (esFondo && /help|info/.test(n)) return 'infobg';
        if (esSombra) return 'sombra';
        if (esFondo) return 'fondo';
        if (esBorde) return 'borde';
        if (esTexto && /error|danger|fail/.test(n)) return 'badfg';
        if (esTexto && /warn/.test(n)) return 'warnfg';
        if (esTexto && /success/.test(n)) return 'okfg';
        if (esTexto && /help|info/.test(n)) return 'infofg';
        if (esTexto && /secondary|muted|disabled|placeholder|^light-/.test(n)) return 'dim';
        if (esTexto) return 'fg';
        return null;
    }
    // Recorre todas las hojas accesibles y recoge las variables que declara la
    // plataforma. Una variable se considera "de la plataforma" si la usan reglas
    // suyas: basta con estar declarada en una hoja ajena a Rondo.
    let _rxVarsHojas = null; // WeakMap hoja -> n.o de reglas leidas
    let _rxVarsPlat = null;  // Map con las variables de la plataforma
    let _rxVarsLista = null; // [{hoja, n, mapa}] para mezclarlas en orden
    function rxEscanearVariables(forzar) {
        if (typeof WeakMap !== 'function') return new Map();
        if (forzar || !_rxVarsPlat) {
            _rxVarsHojas = new WeakMap();
            _rxVarsPlat = new Map();
            _rxVarsLista = [];
        }
        let rs = null;
        try { rs = document.styleSheets; } catch (_) { return _rxVarsPlat; }
        for (let i = 0; i < rs.length; i++) {
            const hoja = rs[i];
            if (rxEsHojaRondo(hoja)) continue;
            let reglas = null;
            try { reglas = hoja.cssRules; } catch (_) { continue; } // hoja de otro origen
            if (!reglas) continue;
            if (_rxVarsHojas.get(hoja) === reglas.length) continue;
            _rxVarsHojas.set(hoja, reglas.length);
            const propio = new Map();
            rxVarsDeReglas(reglas, propio);
            // La hoja mas reciente gana: el CSS-in-JS redefine :root al final.
            _rxVarsLista.push([hoja, reglas.length, propio]);
            _rxVarsPlat = new Map();
            for (let q = 0; q < _rxVarsLista.length; q++) {
                const m = _rxVarsLista[q][2];
                m.forEach((v, k) => _rxVarsPlat.set(k, v));
            }
        }
        return _rxVarsPlat;
    }
    function rxVarsDeReglas(reglas, out, profundidad) {
        if (!reglas || (profundidad || 0) > 4) return;
        for (let i = 0; i < reglas.length; i++) {
            const r = reglas[i];
            if (r.cssRules && !r.style) { rxVarsDeReglas(r.cssRules, out, (profundidad || 0) + 1); continue; }
            const st = r.style;
            if (!st || !st.length) continue;
            for (let j = 0; j < st.length; j++) {
                const prop = st[j];
                if (prop.indexOf('--') !== 0) continue;
                const clave = prop.slice(2);
                // Ni las nuestras (--rondo-*) ni los ids del remap (--rpg-*).
                if (clave.indexOf('rondo-') === 0 || clave.indexOf('rpg-') === 0) continue;
                const val = st.getPropertyValue(prop);
                if (!rxEsColorValor(val)) continue;
                if (!out.has(clave)) out.set(clave, val);
            }
        }
    }
    // Construye la hoja de redefiniciones. Prioridad: mapa manual > clasificacion
    // por nombre > valor por defecto segun el tipo de variable.
    function rxHojaVariables(P, claro, acc, acc2) {
        const vars = rxEscanearVariables();
        const decl = [];
        for (const clave of vars.keys()) {
            const orig = vars.get(clave);
            if (/^\s*transparent\s*$/i.test(orig)) continue; // transparencia explicita
            const manual = rxRolManual(clave);
            if (manual === 'mixto') continue;
            const rol = manual || rxRolPorNombre(clave, orig);
            if (!rol) continue;
            const v = rxValorRol(rol, P, acc, acc2);
            if (v) decl.push('--' + clave + ':' + rxConAlfaCss(v, rxAlfaDe(orig)) + ' !important');
        }
        if (!decl.length) return '';
        // Son 850+ lineas: se agrupan de 60 para no crear un nodo de estilo enorme.
        let css = '';
        for (let i = 0; i < decl.length; i += 60) css += decl.slice(i, i + 60).join(';') + ';';
        return ':root,html,body{' + css + '}';
    }
    // El mapa manual gana sobre la clasificacion automatica.
    function rxRolManual(clave) {
        const c = clave.replace(/^--/, '');
        // Las variables MIXTAS (--white, --borders-color: valen como texto, fondo
        // y borde segun donde se usen) NO se redefinen a la fuerza: un unico
        // valor no puede ser superficie y a la vez texto legible. Las resuelve el
        // remap por propiedad, que si sabe en que contexto esta cada uso.
        if (RX_PAGINA_MIXTOS[c]) return 'mixto';
        const r = RX_PAGINA_MAPA[c];
        // El mapa manual usa claves de paleta (soft, border, fg, on...); hay que
        // traducirlas al ROL que espera rxValorRol.
        if (typeof r === 'string') return rxRolDeClave(r);
        return RX_PAGINA_ESTADOS[c] || null;
    }
    function rxRolDeClave(k) {
        if (k === 'bg' || k === 'soft' || k === 'strong' || k === 'veil') return 'fondo';
        if (k === 'border') return 'borde';
        if (k === 'fg') return 'fg';
        if (k === 'dim' || k === 'mute') return 'dim';
        if (k === 'on') return 'on';
        if (/^(ok|warn|bad|info)bg$/.test(k)) return k;
        if (/^(ok|warn|bad|info)fg$/.test(k)) return k;
        if (k === 'shadow') return 'sombra';
        return 'acento';
    }
    function rxValorRol(rol, P, acc, acc2) {
        if (rol === 'fondo') return P.soft;
        if (rol === 'borde') return P.border;
        if (rol === 'fg') return P.fg;
        if (rol === 'dim') return P.dim;
        if (rol === 'sombra') return P.shadow || 'none';
        if (rol === 'okbg') return P.okbg; if (rol === 'warnbg') return P.warnbg;
        if (rol === 'badbg') return P.badbg; if (rol === 'infobg') return P.infobg;
        if (rol === 'okfg') return P.okfg; if (rol === 'warnfg') return P.warnfg;
        if (rol === 'badfg') return P.badfg; if (rol === 'infofg') return P.infofg;
        if (rol === 'on') return '#ffffff';
        if (rol === 'acento') return rxAcentoTexto(acc, P);
        if (rol === 'accent') return acc;
        return null;
    }
    const RX_VENTANA_SEL = '[class*="_messageBox_"],[class*="_messageBoxWrapper_"],[class*="_contentWrapper_"],' +
        '[class*="_content-wrapper_"],[class*="_cell_"],[class*="_row_"],[class*="_table_"],' +
        '.tippy-box,.wui2-message-box,.wui-message-box,#tooltip,#tooltip2,.wui-tooltip,.x-unit-info,' +
        '.mini-window-extra,.x-monitoring-units-extra-info-row,' +
        // dialogos (propiedades de unidad...), ayuda, avisos y notificaciones
        '#TB_window,.wizard-dlg-content-target,.help-window,.x-popup,.wui-toast-alert,.wui2-banner,' +
        '.ant-modal,.ant-notification,.ant-popover,.ant-message';
    function rxEsRondo(el) {
        try { return !!(el && el.closest && el.closest('#rondo-panel,#rondo-barra,#rondo-rail,#rondo-nmolestar,#rondo-btn-panel')); }
        catch (_) { return false; }
    }
    // Originales de los estilos inline tocados: sin esto, desactivar dejaba el
    // style="background-color: var(--rpg-...)" apuntando a un token que ya no
    // existe y el elemento quedaba transparente.
    let _rxInlineHechos = null; // WeakMap el -> { prop: true }
    let _rxInlineReg = null;    // [[el, prop, valor, prioridad]]
    function rxAnotarInline(el, prop, val, prio) {
        if (typeof WeakMap !== 'function') return;
        if (!_rxInlineHechos) { _rxInlineHechos = new WeakMap(); _rxInlineReg = []; }
        let m = _rxInlineHechos.get(el);
        if (!m) { m = {}; _rxInlineHechos.set(el, m); }
        if (m[prop]) return;
        m[prop] = 1;
        _rxInlineReg.push([el, prop, val, prio]);
    }
    function rxRestaurarInline() {
        try {
            if (_rxInlineReg) {
                for (let i = 0; i < _rxInlineReg.length; i++) {
                    const q = _rxInlineReg[i];
                    try { q[0].style.setProperty(q[1], q[2], q[3]); } catch (_) { /* noop */ }
                }
            }
        } catch (_) { /* noop */ }
        _rxInlineHechos = null;
        _rxInlineReg = null;
    }
    function rxRemapearInline(el) {
        const st = el && el.style;
        if (!st || !st.length || rxEsRondo(el)) return false;
        let cambio = false;
        for (let i = 0; i < st.length; i++) {
            const prop = st[i];
            if (prop.indexOf('--') === 0) continue;
            if (!/color|background|fill|stroke/.test(prop)) continue;
            const val0 = st.getPropertyValue(prop);
            if (!val0) continue; // longhand de un atajo con var(): se ve abajo
            const prio = st.getPropertyPriority(prop);
            const val = rxReescribirColor(val0, prop, rxPropRol(prop), false, el);
            if (val !== val0) { rxAnotarInline(el, prop, val0, prio); st.setProperty(prop, val, prio); cambio = true; }
        }
        for (let k = 0; k < RX_ATAJOS_COLOR.length; k++) {
            const atajo = RX_ATAJOS_COLOR[k];
            const v0 = st.getPropertyValue(atajo);
            if (!v0 || v0.indexOf('var(') < 0) continue;
            const pr = st.getPropertyPriority(atajo);
            const v = rxReescribirColor(v0, atajo, rxPropRol(atajo), false);
            if (v !== v0) { rxAnotarInline(el, atajo, v0, pr); st.setProperty(atajo, v, pr); cambio = true; }
        }
        return cambio;
    }
    // Remapea el estilo inline del nodo y de sus descendientes con [style].
    function rxRemapearInlineArbol(root) {
        if (!root || root.nodeType !== 1 || rxEsRondo(root)) return false;
        let cambio = rxRemapearInline(root);
        let els;
        try { els = root.querySelectorAll('[style]'); } catch (_) { return cambio; }
        for (let i = 0; i < els.length; i++) { if (rxRemapearInline(els[i])) cambio = true; }
        return cambio;
    }
    // Nodos con estilo inline ya vistos: reescanearlos en cada pasada era el
    // grueso del coste (~60 ms con 1200 nodos) y era trabajo repetido, porque
    // rxRemapearInline ya deja el valor en var(--rpg-*) (idempotente).
    let _rxSueltosVistos = null;
    function rxRemapearVentanas() {
        let cambiado = false;
        try {
            const roots = document.querySelectorAll(RX_VENTANA_SEL);
            for (let i = 0; i < roots.length; i++) { if (rxRemapearInlineArbol(roots[i])) cambiado = true; }
            // Red de seguridad para nodos que ya existian y no son "ventana": se
            // recorre UNA vez cada nodo con [style] con color (WeakSet). Los nodos
            // nuevos los cubre el observador del body.
            if (typeof WeakSet !== 'function') return cambiado;
            if (!_rxSueltosVistos) _rxSueltosVistos = new WeakSet();
            const sueltos = document.querySelectorAll('[style*="background"],[style*="color"],[style*="fill"],[style*="stroke"]');
            for (let i = 0; i < sueltos.length; i++) {
                const el = sueltos[i];
                if (_rxSueltosVistos.has(el)) continue;
                _rxSueltosVistos.add(el);
                if (rxRemapearInline(el)) cambiado = true;
            }
        } catch (_) { /* noop */ }
        return cambiado;
    }
    function rxAplicarColoresPagina() {
        if (!(APP.config && APP.config.estiloPagina)) { rxDesactivarColores(); return; }
        const acc = (APP.config.temaPlataforma && rxPlatAcento()) ? rxPlatAcento() : (APP.config.acento || '#850D22');
        const acc2 = aclarar(acc, 0.28);
        const accD = oscurecer(acc, 0.14);
        const claro = APP.config.theme === 'claro' ||
            (APP.config.theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
        const P = rxPaginaPaleta(claro);
        _rxCtx = { P: P, acc: acc, accD: accD };
        _rxTemaClaro = !!claro;
        _rxVarsMapa = rxEscanearVariables();
        // Se procesan TODAS las hojas cargadas; rxProcesarHoja ignora las ya
        // vistas, asi que esto es barato y no deja ninguna sin reescribir (la
        // plataforma carga el CSS de las ventanas de unidad en diferido).
        let bloqueadas = 0, procesadas = 0;
        try {
            const hojas = document.styleSheets;
            for (let i = 0; i < hojas.length; i++) {
                const h = hojas[i];
                const owner = h.ownerNode;
                if (owner && owner.id && owner.id.indexOf('rondo') === 0) continue;
                try { if (h.cssRules) { if (rxProcesarHoja(h, P, acc, acc2, accD)) procesadas++; } else bloqueadas++; }
                catch (_) { bloqueadas++; }
            }
        } catch (_) { /* noop */ }
        if (APP.unlocked && !rxAplicarColoresPagina._avisado && procesadas === 0 && bloqueadas > 0) {
            rxAplicarColoresPagina._avisado = true;
            try { console.warn('[Rondo] ' + bloqueadas + ' hojas CSS no accesibles (cross-origin); el remap no puede leerlas.'); } catch (_) { /* noop */ }
        }
        rxRemapearVentanas();
        rxPintarTokens(P, acc, accD);
        rxPintarVariablesPlataforma(P, acc, accD);
        rxReescribirLiterales(P, APP.config.theme);
        rxMantenerAlFinal();
        rxObservar();
    }
    // Vigila hojas NUEVAS. Un <link rel=stylesheet> recien insertado tiene
    // .sheet = null hasta que termina de cargar: si no se espera su evento
    // 'load', su CSS (p. ej. el de la ventana de unidad) se perderia.
    function rxObservar() {
        if (_rxObs || !window.MutationObserver) return;
        _rxObs = new MutationObserver((muts) => {
            let hayNueva = false;
            for (let i = 0; i < muts.length; i++) {
                const nodos = muts[i].addedNodes;
                for (let j = 0; j < nodos.length; j++) {
                    const n = nodos[j];
                    if (!n || n.nodeType !== 1) continue;
                    if (n.id && n.id.indexOf('rondo') === 0) continue;
                    if (n.tagName === 'STYLE') hayNueva = true;
                    else if (n.tagName === 'LINK' && /stylesheet/i.test(n.rel || '')) { hayNueva = true; rxEsperarHoja(n); }
                }
            }
            if (hayNueva) { rxMantenerAlFinal(); rxProgramarColoresPagina(); }
        });
        const head = document.head || document.documentElement;
        try { _rxObs.observe(head, { childList: true }); } catch (_) { _rxObs = null; }
        // Segundo observador: las ventanas/tarjetas de unidad se inyectan en el
        // body en diferido y traen colores INLINE (sensores). Se remapean al
        // aparecer (y solo entonces, para no recorrer el DOM en cada cambio).
        if (!_rxObsBody) {
            _rxObsBody = new MutationObserver((muts) => {
                let hayInline = false;
                for (let i = 0; i < muts.length; i++) {
                    const nodos = muts[i].addedNodes;
                    for (let j = 0; j < nodos.length; j++) {
                        const n = nodos[j];
                        if (!n || n.nodeType !== 1 || rxEsRondo(n)) continue;
                        let esVentana = false, dentro = false, conEstilo = false;
                        try {
                            esVentana = !!(n.matches && n.matches(RX_VENTANA_SEL));
                            dentro = !!(n.closest && n.closest(RX_VENTANA_SEL));
                            conEstilo = !!(n.matches && n.matches('[style]'));
                        } catch (_) { esVentana = dentro = conEstilo = false; }
                        if ((esVentana || dentro) && rxRemapearInlineArbol(n)) hayInline = true;
                        else if (conEstilo && rxRemapearInline(n)) hayInline = true;
                    }
                }
                if (hayInline) rxProgramarColoresPagina();
            });
            const body = document.body || document.documentElement;
            try { _rxObsBody.observe(body, { childList: true, subtree: true }); } catch (_) { _rxObsBody = null; }
        }
        // Las reglas insertadas con insertRule no disparan ningun observador:
        // se vigila el recuento y se reprocesa solo si cambia.
        if (!_rxPoll) {
            _rxUltimoN = rxContarReglas();
            _rxPoll = setInterval(() => {
                if (document.hidden) return;
                const n = rxContarReglas();
                if (n !== _rxUltimoN) { _rxUltimoN = n; rxProgramarColoresPagina(); }
            }, 1500);
        }
    }
    // Un <link rel=stylesheet> tiene .sheet = null hasta que carga. Se vuelve a
    // disparar el barrido cuando termina, para no perder su CSS.
    function rxEsperarHoja(link) {
        if (link.sheet) return;
        try { link.addEventListener('load', () => { try { rxProgramarColoresPagina(); } catch (_) { /* noop */ } }, { once: true }); } catch (_) { /* noop */ }
    }
    // Logo "RONDO" en tipografia Ndot (matriz de puntos). Se dibuja como SVG
    // embebido para no depender de fuentes externas ni CDN: la plataforma lo
    // usa como background-image (--logo-background) y el panel como SVG inline
    // con currentColor. Mapa 5x7 por glifo (solo las letras de RONDO).
    const RX_NDOT = {
        R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
        O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
        N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
        D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
        ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
    };
    function rondoLogoSVG(color) {
        const txt = 'RONDO';
        const filas = 7, paso = 10, radio = 4.4;
        let col = 0;
        let circles = '';
        for (let i = 0; i < txt.length; i++) {
            const g = RX_NDOT[txt[i]] || RX_NDOT[' '];
            for (let r = 0; r < filas; r++) {
                const row = g[r] || '';
                for (let c = 0; c < row.length; c++) {
                    if (row[c] === '1') {
                        circles += '<circle cx="' + ((col + c) * paso + paso / 2) +
                            '" cy="' + (r * paso + paso / 2) + '" r="' + radio + '"/>';
                    }
                }
            }
            col += 6; // 5 columnas + 1 de separacion
        }
        const w = (col - 1) * paso, h = filas * paso;
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
            '" width="' + w + '" height="' + h + '" role="img" aria-label="RONDO" fill="' +
            (color || 'currentColor') + '">' + circles + '</svg>';
    }
    function rondoLogoURI(color) {
        return 'url("data:image/svg+xml,' + encodeURIComponent(rondoLogoSVG(color)) + '")';
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
        // v6.0.14: si esta activo, el acento sale del skin de la plataforma.
        const acento = (c.temaPlataforma && rxPlatAcento()) ? rxPlatAcento() : c.acento;
        if (acento) {
            const a2 = aclarar(acento, 0.28);
            document.documentElement.style.setProperty('--rondo-accent', acento);
            document.documentElement.style.setProperty('--rondo-accent-2', a2);
            document.documentElement.style.setProperty('--rondo-accent-grad', 'linear-gradient(135deg,' + acento + ',' + a2 + ')');
            const rgb = hexToRgb(acento);
            if (rgb) {
                document.documentElement.style.setProperty('--rondo-accent-rgb', rgb.r + ',' + rgb.g + ',' + rgb.b);
                // Texto legible sobre el acento: si el acento es CLARO, el
                // texto sobre el va oscuro; si es oscuro, blanco. Asi los
                // iconos/numeros sobre pestañas, tiles y botones siempre se ven.
                const lumA = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
                document.documentElement.style.setProperty('--rondo-accent-fg', lumA < 0.55 ? '#ffffff' : '#10151f');
            }
        }
        const p = byId('rondo-panel');
        if (p) p.classList.toggle('density-compact', c.density === 'compact');
        // Escala de interfaz: un solo factor multiplica textos y controles.
        document.documentElement.style.setProperty('--rondo-esc', String(normalizarEscala(c.escalaUI)));
        // v6.0.14: aplica/quita el reestilizado de la pagina de la plataforma.
        try { rxAplicarEstiloPagina(); } catch (_) { /* noop */ }
        // v6.19.5: aplica/quita la capa de rendimiento CSS.
        try { rxAplicarRendimientoPagina(); } catch (_) { /* noop */ }
        // v6.19.3: remap de los colores literales de la plataforma (una vez;
        // despues solo se repintan las variables al cambiar de tema).
        try { rxProgramarColoresPagina(); } catch (_) { /* noop */ }
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
