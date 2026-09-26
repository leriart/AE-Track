// ==UserScript==
// @name         Rondo
// @namespace    https://github.com/leriart/AE-Track
// @version      6.6.0-dev.12
// @description  Rondo es el script de vigilancia de flota de AE-TrackRondo. Corre sobre la API nativa de Wialon o AE-Track y evalua reglas de negocio, notifica con toasts/voz/pitido, automatiza la apertura y acomodo de ventanas de unidades y mantiene abiertas solo las seleccionadas. Panel con 7 pestanas: Dashboard, Unidades, Avisos, Rutas, Geocercas, Caravana y Riesgo (zonas de alto riesgo con dona SVG, histograma, KPIs clicables, slider, drag-and-drop y export CSV/GeoJSON). Unidades en tarjetas responsivas sin desbordes. Rutas con OpenStreetMap (OSRM), algoritmo A*, trazado automatico al asignar destino, deteccion de desvios, giros en U, retorno por viaje cancelado y trazado con exportacion GeoJSON. Incluye odometro por unidad, limite de velocidad por unidad, perfiles de configuracion, filtros, tema oscuro/claro, backup JSON y barra lateral redimensionable. Tamano de interfaz ajustable. IA de razonamiento: analisis por aviso, analisis en lote del dia, resumen narrativo del informe y deteccion de patrones con sugerencias aplicables. Rutas multipunto (secuencial o mejor ruta), municipios de OpenStreetMap con tolerancia de desvio, busqueda difusa de geocercas/municipios, geocercas con KPIs y exportacion, y monitor de flota con IA. Sin emojis.
// @author       lerit, Hector Ramirez (HectorRamirez-cpu)
// @contributor  Hector Ramirez (https://github.com/HectorRamirez-cpu), creador del proyecto original
// @copyright    Proyecto original de Hector Ramirez (https://github.com/HectorRamirez-cpu)
// @homepageURL  https://github.com/leriart/AE-Track
// @supportURL   https://github.com/leriart/AE-Track/issues
// @updateURL    https://raw.githubusercontent.com/leriart/AE-Track/main/rondo.user.js
// @downloadURL  https://raw.githubusercontent.com/leriart/AE-Track/main/rondo.user.js
// @require      https://raw.githubusercontent.com/leriart/AE-Track/dev/dist/v6.6.0-dev.12/rondo-core.js
// @require      https://raw.githubusercontent.com/leriart/AE-Track/dev/dist/v6.6.0-dev.12/rondo-engine.js
// @require      https://raw.githubusercontent.com/leriart/AE-Track/dev/dist/v6.6.0-dev.12/rondo-ui.js
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

(function () {
    'use strict';
    if (typeof init === 'function') { init(); return; }
    // Falta un modulo (@require) o el gestor no comparte el ambito.
    try {
        if (document.getElementById('rondo-aviso')) return;
        var a = document.createElement('div');
        a.id = 'rondo-aviso';
        a.style.cssText = 'position:fixed;z-index:2147483647;left:16px;bottom:16px;right:16px;max-width:560px;background:#8b1a1a;color:#fff;font:13px/1.45 system-ui,sans-serif;padding:12px 14px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.45)';
        a.textContent = 'Rondo no pudo cargar sus modulos (@require). Reinstala o actualiza el script desde GitHub.';
        (document.body || document.documentElement).appendChild(a);
    } catch (_) { /* noop */ }
})();
