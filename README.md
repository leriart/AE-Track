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
- Panel con cuatro secciones: Dashboard, Unidades, Bitácora y Geocercas.
- Automatización de ventanas: apertura, acomodo, resaltado, cierre y
  verificación periódica de que solo sigan abiertas las seleccionadas.
- Lista vigilada (una por línea, formato `eco` o `eco=destino`).
- Límite de velocidad global y por unidad, con resaltado cuando se excede.
- Filtro por estado en la pestaña Unidades (moviendo, detenidas, sin señal,
  vigiladas, silenciadas) combinable con la búsqueda de texto.
- Menú contextual por unidad: abrir ventana, silenciar, agregar o quitar de la
  lista, definir límite de velocidad, ver en OpenStreetMap o Google Maps y
  copiar económico, placa o coordenadas.
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
| Horario activo | 06:00 a 23:00 |
| Tema | oscuro |

## Estructura del repositorio

```
HJP-Wialon.user.js   Userscript completo (un solo archivo, IIFE en modo estricto)
README.md            Este documento
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
