# HJP · Wialon

Userscript para Tampermonkey que añade una capa de vigilancia de flota sobre la
API nativa de Wialon y sobre AE-Track. Evalúa reglas de negocio, notifica de
forma visual, sonora y por voz, automatiza la apertura y el acomodo de ventanas
y mantiene abiertas solo las unidades seleccionadas.

- Script: [`HJP-Wialon.user.js`](./HJP-Wialon.user.js)
- Versión actual: ver la cabecera `@version` del script
- Compatible con: Chrome, Chromium, Edge, Brave, Opera, Vivaldi y Firefox (Tampermonkey) y con Violentmonkey

## Características

- Vigilancia continua de unidades sobre la API nativa de Wialon (sin backend).
- Reglas de negocio configurables: offline, GPS perdido, detenido, entrada y
  salida de zona, geocercas, destino, desconexión y exceso de velocidad.
- Notificaciones por toast, voz (`SpeechSynthesis`), pitido (`WebAudio`) y
  notificación de escritorio opcional.
- Cooldown por unidad para evitar alertas repetidas y ventana de horario.
- Panel con cinco secciones: Dashboard, Unidades, Bitácora, Rutas y Geocercas.
- Rutas sobre OpenStreetMap: cálculo con OSRM o con algoritmo A* sobre el grafo
  vial descargado de Overpass.
- Detección de desvío de ruta (distancia y tiempo fuera del trazado).
- Detección de giro en U (rumbo opuesto al de la ruta).
- Detección de retorno o viaje cancelado (retroceso de progreso o regreso al
  origen) y aviso de llegada a destino.
- Trazado del recorrido en memoria y exportación de ruta y traza a GeoJSON.
- Automatización de ventanas: apertura, acomodo, resaltado, cierre y
  verificación periódica de que solo sigan abiertas las seleccionadas.
- Lista vigilada (una por línea, formato `eco` o `eco=destino`).
- Límite de velocidad global y por unidad, con resaltado cuando se excede.
- Filtro por estado en la pestaña Unidades (moviendo, detenidas, sin señal,
  vigiladas, silenciadas) combinable con la búsqueda de texto.
- Menú contextual por unidad: abrir ventana, silenciar, agregar o quitar de la
  lista, definir límite de velocidad, planear ruta con OSRM o A*, exportar ruta
  y traza GeoJSON, ver en OpenStreetMap o Google Maps y copiar económico, placa
  o coordenadas.
- Perfiles de configuración con nombre (guardar, cargar, borrar).
- Limpieza de la bitácora de avisos.
- Idioma de voz seleccionable y volumen del pitido.
- Horario de alertas con soporte de rangos que cruzan medianoche.
- Tema oscuro y claro, densidad normal o compacta y color de acento.
- Exportación e importación de configuración y respaldo en JSON (incluye
  límites por unidad).
- Exportación de unidades y bitácora a CSV.
- Informe diario descargable en Markdown (resumen de alertas por severidad,
  por regla, unidades con más avisos y unidades sin señal).
- Reentrante: si la API de Wialon no está lista, avisa y reintenta.
- Sin emojis: solo glifos Unicode.
- Persistencia en `localStorage` bajo las claves `hjp.api.*`.

## Instalación

### 1. Instala un gestor de userscripts

Necesitas un gestor de userscripts. Tampermonkey es el recomendado y es el que
soporta la actualización automática definida en este repositorio.

| Navegador | Extensión | Enlace |
| --- | --- | --- |
| Chrome / Chromium / Brave / Vivaldi | Tampermonkey | https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo |
| Microsoft Edge | Tampermonkey | https://www.tampermonkey.net/?browser=edge |
| Opera | Tampermonkey | https://www.tampermonkey.net/?browser=opera |
| Firefox | Tampermonkey | https://addons.mozilla.org/firefox/addon/tampermonkey/ |
| Safari (macOS) | Tampermonkey | https://www.tampermonkey.net/?browser=safari |

Alternativas:

- Violentmonkey para Chrome: https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag
- Violentmonkey para Firefox: https://addons.mozilla.org/firefox/addon/violentmonkey/
- Tampermonkey (web oficial, detecta tu navegador): https://www.tampermonkey.net/

Después de instalar la extensión, si el navegador lo solicita, habilita el modo
desarrollador y activa la extensión para los sitios:

- `*://*.ae-track.com/*` y `*://ae-track.com/*`
- `*://*.wialon.com/*` y `*://wialon.com/*`

### 2. Instalación automática del userscript

Con Tampermonkey (o Violentmonkey) ya instalado, abre este enlace. El gestor
detectará el userscript y mostrará la pantalla de instalación:

**Instalar:** https://raw.githubusercontent.com/leriart/AE-Track/main/HJP-Wialon.user.js

También puedes abrir el archivo [`HJP-Wialon.user.js`](./HJP-Wialon.user.js) en
GitHub y usar el botón `Raw`; el gestor lo interceptará igualmente.

## Actualizaciones automáticas

El script declara en su cabecera:

```
// @updateURL    https://raw.githubusercontent.com/leriart/AE-Track/main/HJP-Wialon.user.js
// @downloadURL  https://raw.githubusercontent.com/leriart/AE-Track/main/HJP-Wialon.user.js
```

Con esto, cada vez que se publique un cambio en la rama `main` y se aumente el
campo `@version`, Tampermonkey descargará la nueva versión automáticamente
(comprueba actualizaciones cada 24 horas por defecto, según tu configuración).

Para forzar una comprobación manual:

1. Abre el panel de Tampermonkey.
2. Ve a `Utilidades`.
3. Pulsa `Buscar actualizaciones de userscripts`.

Notas:

- La actualización solo se aplica si `@version` es mayor que la instalada.
- `raw.githubusercontent.com` puede tardar unos minutos en servir la última
  revisión por caché de la CDN.

## Uso

1. Entra a tu instancia de Wialon o de AE-Track con la sesión iniciada.
2. El panel de HJP · Wialon aparece en pantalla. Si la API de Wialon aún no
   está lista, el script avisa y reintenta.
3. Configura reglas, umbrales, notificaciones y la lista vigilada desde el
   panel de Configuración.

### Configuración por defecto

| Ajuste | Valor |
| --- | --- |
| Intervalo de sondeo (`pollMs`) | 10000 ms |
| Umbral offline (`offlineMin`) | 5 min |
| Umbral GPS perdido (`gpsMin`) | 15 min |
| Umbral detenido (`stopMin`) | 30 min |
| Umbral en zona (`zonaMin`) | 20 min |
| Umbral desconexión (`descoMin`) | 25 min |
| Velocidad máxima global (`velMax`) | 110 km/h |
| Cooldown entre alertas (`cooldownMin`) | 45 min |
| Voz / pitido / notificación escritorio | activada / activada / desactivada |
| Idioma de voz (`voiceLang`) | es-MX |
| Volumen del pitido (`beepVol`) | 0.06 |
| Desvío de ruta (`desvioM` / `desvioMin`) | 250 m / 5 min |
| Retorno (`retornoM` / `retornoPct`) | 400 m / 25 % |
| Giro en U (`giroGrados` / `giroMin`) | 130 grados / 3 min |
| Trazado (`trazado` / `trazadoMax`) | activado / 500 puntos |
| OSRM / A* sobre Overpass | activado / desactivado |
| Horario activo | 06:00 a 23:00 |
| Tema | oscuro |

## Rutas y algoritmos

El módulo de rutas usa datos y servicios de OpenStreetMap:

- **Geocodificación**: Nominatim convierte una dirección o lugar en coordenadas.
- **Ruta con OSRM**: `router.project-osrm.org` devuelve la geometría completa de
  la ruta de conducción (`osrmRoute`).
- **Ruta con A***: `overpassGrafo` descarga el grafo vial de la caja que
  contiene origen y destino, y `aEstrella` calcula el camino mínimo con una
  cola de prioridad binaria (`MinHeap`) y heurística de distancia haversine.
- **Proyección sobre la ruta**: `snapRuta` proyecta cada posición sobre la
  polilínea (`distPuntoSegmento`) y devuelve distancia al trazado, progreso
  (0 a 1) y rumbo del tramo.

Con eso el motor evalúa, por unidad que tenga una ruta planificada:

- **Desvío**: permanece a más de `desvioM` metros de la ruta durante
  `desvioMin` minutos.
- **Retorno / viaje cancelado**: avance máximo superado y luego retroceso de al
  menos `retornoPct` por ciento, o regreso dentro de `retornoM` metros del
  origen. Se avisa también la llegada a destino.
- **Giro en U**: rumbo opuesto al de la ruta en más de `giroGrados` grados
  durante `giroMin` minutos.

El trazado del recorrido se guarda en memoria (no se persiste en
`localStorage`) y se puede exportar como GeoJSON, igual que la ruta planificada.

### Uso de las rutas

1. Abre el panel y ve a la pestaña Unidades.
2. Clic derecho sobre una unidad, elige `Planear ruta (OSRM)` o
   `Planear ruta (A*)`.
3. Escribe un lugar, una dirección o `lat,lon` como destino.
4. La pestaña Rutas muestra progreso, distancia al trazado y ETA, y permite
   recalcular, exportar GeoJSON o eliminar la ruta.

Nota sobre los servicios públicos: OSRM, Overpass y Nominatim son servicios
gratuitos con límites de uso. El script limita las consultas, cachea el grafo
por caja geográfica y el geocodificado inverso por celda, y solo usa A* cuando
se activa en `Ajustes · Rutas`. Un uso intensivo puede recibir errores HTTP
429; en ese caso espera o reduce la frecuencia de sondeo.

## Estructura del repositorio

```
HJP-Wialon.user.js        Userscript completo (un solo archivo, IIFE en modo estricto)
tests/algorithms.test.js  Pruebas de los algoritmos geográficos y de rutas
README.md                 Este documento
```

## Pruebas

Los algoritmos puros (haversine, rumbo, distancia punto-segmento, simplificado
de ruta, proyección `snapRuta`, `MinHeap` y `A*`) se prueban sin navegador ni
red extrayendo el bloque de algoritmos del userscript:

```
node tests/algorithms.test.js
```

## Ramas: main y dev

- `main` es la rama estable. Es la única que apuntan `@updateURL` y
  `@downloadURL`, así que solo los cambios fusionados aquí llegan a los
  usuarios por actualización automática.
- `dev` es la rama de desarrollo y pruebas. Los cambios hechos aquí no afectan
  ni actualizan la instalación de los usuarios.

### Probar la rama dev

La versión de `dev` tiene una `@version` mayor que la de `main`. Para probarla
sin afectar la instalación estable, instala el script desde la URL de `dev` en
un navegador o perfil de pruebas:

https://raw.githubusercontent.com/leriart/AE-Track/dev/HJP-Wialon.user.js

Nota: el `@updateURL` del script sigue apuntando a `main`; por eso, cuando la
versión de `main` alcance o supere la de `dev` probada, Tampermonkey podrá
reemplazarla. Durante las pruebas, desactiva la actualización automática de ese
userscript o mantén la copia de `main` en otro perfil.

### Publicar una nueva versión

1. Trabaja y prueba los cambios en `dev`.
2. Edita `HJP-Wialon.user.js` y sube el número en `// @version` (por ejemplo
   `4.1.0` a `4.1.1`).
3. Haz commit y sube `dev`.
4. Fusiona `dev` en `main` (por ejemplo con GitHub Desktop: `dev` -> `main`).
5. Tampermonkey detectará la nueva versión en la siguiente comprobación de
   actualizaciones.

Si el cambio modifica los datos guardados en `localStorage`, mantén la
compatibilidad o documenta la migración en este README.

## Historial de cambios

### 4.2.0 (rama dev)

- Pestaña Rutas y módulo de rutas sobre OpenStreetMap.
- Cálculo con OSRM y con algoritmo A* sobre grafo vial de Overpass.
- Algoritmos de bajo nivel: haversine, rumbo, distancia punto-segmento,
  simplificación de polilínea, proyección sobre ruta, cola de prioridad binaria
  (`MinHeap`) y `A*`.
- Detección de desvío de ruta, giro en U y retorno o viaje cancelado, más aviso
  de llegada a destino.
- Trazado del recorrido y exportación de ruta y traza a GeoJSON.
- Pruebas automatizadas de los algoritmos en `tests/algorithms.test.js`.

### 4.1.0 (rama dev)

- Límite de velocidad por unidad, además del límite global.
- Filtro por estado en la pestaña Unidades.
- Menú contextual ampliado: lista vigilada, límite, OpenStreetMap y Google
  Maps, copiar económico, placa y coordenadas.
- Perfiles de configuración con nombre.
- Limpieza de la bitácora.
- Informe diario en Markdown.
- Idioma de voz seleccionable y volumen del pitido.
- Correcciones: horario con rangos que cruzan medianoche, rearme de la alerta
  de desconexión, reanudación del `AudioContext` tras la interacción del
  usuario, poda de la tabla de cooldowns, lectura robusta de `localStorage` e
  importación JSON validada.
- Soporte de dominios base `ae-track.com` y `wialon.com` en `@match`.

### 4.0.1

- Metadatos de instalación y actualización automática, README y renombrado a
  `HJP-Wialon.user.js`.

## Soporte

Reporta fallos o solicita cambios en:

https://github.com/leriart/AE-Track/issues

Incluye tu navegador, versión de Tampermonkey, versión del script (`@version`) y
los pasos para reproducir el problema.
