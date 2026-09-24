# Changelog

Historial de cambios de Rondo, un archivo por version. Antes de la 5.0.0
este proyecto se llamaba **HJP Wialon** y el archivo era `HJP-Wialon.user.js`;
el contenido es compatible y la primera vez Rondo migra automaticamente la
configuracion, la lista vigilada, las rutas, el odometro y los perfiles.

- [5.12.4](./5.12.4.md) - Fix del 400 de Kimi for Coding: temperature y max_tokens opcionales (vacios = se omiten), pista 400.
- [5.12.3](./5.12.3.md) - Fix del 404 de Kimi.ai (endpoint /coding/v1, modelo kimi-for-coding) y pistas para 404/429.
- [5.12.2](./5.12.2.md) - Fix del "Failed to fetch" de la IA con GM_xmlhttpRequest (salta CORS/CSP), @connect a los proveedores y alias de pagina para la API de Wialon.
- [5.12.1](./5.12.1.md) - Fix del 401 de Kimi (Kimi.ai y Moonshot separados), proveedor MiniMax y Personalizado, y endpoint configurable en Ajustes > IA.
- [5.12.0](./5.12.0.md) - Test de voz integrado (boton Probar/Detener + texto editable) e IA de razonamiento manual sobre Avisos con DeepSeek / NVIDIA NIM / Moonshot Kimi, contexto de geocercas + POIs de Overpass.
- [5.11.1](./5.11.1.md) - Iconos de Ant Design diferenciados (riesgo/alertas/mute/pin), 8 entradas sin uso eliminadas y fix del toggle de silenciar unidad.
- [5.11.0](./5.11.0.md) - Rondo usa los mismos iconos que la plataforma (Ant Design, SVG inline); se elimina Material Icons.
- [5.10.0](./5.10.0.md) - Motores de voz online gratis (StreamElements/Google), iconos Unicode en pestanas y cabecera, y dashboard sin acciones rapidas.
- [5.9.1](./5.9.1.md) - Ayuda rapida ampliada, seleccion de voz por modelo, y pulido visual de la barra lateral (cabecera sin icono, salud de flota mas prominente).
- [5.9.0](./5.9.0.md) - Dashboard expandido para monitoristas, pestana Zonas con segmentado y tarjetas, fix del bug de extraccion de geocercas (campo crudo `zl`) y limpieza del icono "G".
- [5.8.1](./5.8.1.md) - Arreglo del solapamiento en Zonas (flex-shrink), simbolos Unicode garantizados y retiro de la tarjeta de actualizaciones del Dashboard.
- [5.8.0](./5.8.0.md) - Arreglo critico del bucle infinito de geocercas, fusion Geocercas+Zonas de riesgo en la pestana Zonas, y sistema de actualizaciones rehecho con tarjeta en el Dashboard.
- [5.7.0](./5.7.0.md) - Dashboard rehecho, soporte del dataset nacional de incidencia delictiva, config de riesgo movida a Ajustes, barra de herramientas contextual y cabecera ampliada.
- [5.6.1](./5.6.1.md) - Pestanas solo con icono y sin parpadeo ni marco verde en la pestaña de Zonas de riesgo.
- [5.6.0](./5.6.0.md) - Unidad en tarjetas sin desbordes, arreglo de las zonas de riesgo que no aparecian, y modo sidebar unico (sin panel flotante).
- [5.5.0](./5.5.0.md) - Expansion mayor de la UI de Riesgo: dona SVG, histograma, KPIs clicables, slider de score, sticky filters, drag-and-drop, export CSV/GeoJSON/copiar, tooltip rico y empty states con onboarding.
- [5.4.0](./5.4.0.md) - Rediseño completo de la pestaña Riesgo: hero con KPIs, filtros, vista agrupada y 12 algoritmos nuevos.
- [5.3.0](./5.3.0.md) - Nueva pestaña Riesgo con regla `riesgoSinSenal` y carga de CSV/JSON desde URL o archivo.
- [5.0.0](./5.0.0.md) - Rebrand a Rondo, nueva identidad y archivo `rondo.user.js`.
- [4.13.0](./4.13.0.md)
- [4.12.0](./4.12.0.md)
- [4.11.0](./4.11.0.md)
- [4.10.0](./4.10.0.md)
- [4.9.0](./4.9.0.md)
- [4.8.1](./4.8.1.md)
- [4.8.0](./4.8.0.md)
- [4.7.1](./4.7.1.md)
- [4.7.0](./4.7.0.md)
- [4.6.1](./4.6.1.md)
- [4.6.0](./4.6.0.md)
- [4.5.0](./4.5.0.md)
- [4.4.0](./4.4.0.md)
- [4.3.1](./4.3.1.md)
- [4.3.0](./4.3.0.md)
- [4.2.0](./4.2.0.md)
- [4.1.0](./4.1.0.md)
- [4.0.1](./4.0.1.md)

Formato: cada archivo describe lo anadido, lo cambiado y lo corregido en esa
version. La version vigente se indica en la cabecera `@version` de
`rondo.user.js`.
