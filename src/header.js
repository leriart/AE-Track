// ==UserScript==
// @name         Rondo
// @namespace    https://github.com/leriart/AE-Track
// @version      @@VERSION@@
// @description  Rondo es el script de vigilancia de flota de AE-TrackRondo. Corre sobre la API nativa de Wialon o AE-Track y evalua reglas de negocio, notifica con toasts/voz/pitido, automatiza la apertura y acomodo de ventanas de unidades y mantiene abiertas solo las seleccionadas. Panel con 7 pestanas: Dashboard, Unidades, Avisos, Rutas, Geocercas, Caravana y Riesgo (zonas de alto riesgo con dona SVG, histograma, KPIs clicables, slider, drag-and-drop y export CSV/GeoJSON). Unidades en tarjetas responsivas sin desbordes. Rutas con OpenStreetMap (OSRM), algoritmo A*, trazado automatico al asignar destino, deteccion de desvios, giros en U, retorno por viaje cancelado y trazado con exportacion GeoJSON. Incluye odometro por unidad, limite de velocidad por unidad, perfiles de configuracion, filtros, tema oscuro/claro, backup JSON y barra lateral redimensionable. Tamano de interfaz ajustable. IA de razonamiento: analisis por aviso, analisis en lote del dia, resumen narrativo del informe y deteccion de patrones con sugerencias aplicables. Rutas multipunto (secuencial o mejor ruta), municipios de OpenStreetMap con tolerancia de desvio, busqueda difusa de geocercas/municipios, geocercas con KPIs y exportacion, y monitor de flota con IA. Sin emojis.
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
// @grant        GM_xmlhttpRequest
// @connect      api.deepseek.com
// @connect      integrate.api.nvidia.com
// @connect      api.kimi.ai
// @connect      api.moonshot.ai
// @connect      api.minimax.io
// @connect      api.github.com
// @connect      raw.githubusercontent.com
// @connect      overpass-api.de
// @connect      ttsmp3.com
// @connect      api.streamelements.com
// @connect      translate.google.com
// @connect      *
// ==/UserScript==
