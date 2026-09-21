# HJP · Wialon

Userscript para Tampermonkey que anade vigilancia de flota sobre la API nativa
de Wialon y sobre AE-Track.

- Script: [`HJP-Wialon.user.js`](./HJP-Wialon.user.js)
- Manual completo: [`MANUAL.md`](./MANUAL.md)
- Compatible con: Chrome, Chromium, Edge, Brave, Opera, Vivaldi y Firefox
  (Tampermonkey) y con Violentmonkey.

## Instalacion

### 1. Instala un gestor de userscripts

| Navegador | Extension | Enlace |
| --- | --- | --- |
| Chrome / Chromium / Brave / Vivaldi | Tampermonkey | https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo |
| Microsoft Edge | Tampermonkey | https://www.tampermonkey.net/?browser=edge |
| Opera | Tampermonkey | https://www.tampermonkey.net/?browser=opera |
| Firefox | Tampermonkey | https://addons.mozilla.org/firefox/addon/tampermonkey/ |
| Safari (macOS) | Tampermonkey | https://www.tampermonkey.net/?browser=safari |

Alternativas:

- Violentmonkey para Chrome: https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag
- Violentmonkey para Firefox: https://addons.mozilla.org/firefox/addon/violentmonkey/
- Tampermonkey (web oficial): https://www.tampermonkey.net/

### 2. Instala el script

Con el gestor ya instalado, abre este enlace. Se mostrara la pantalla de
instalacion:

**Instalar:** https://raw.githubusercontent.com/leriart/AE-Track/main/HJP-Wialon.user.js

### 3. Actualizaciones automaticas

El script declara `@updateURL` y `@downloadURL` apuntando a la rama `main`. Cada
vez que se publique un cambio en `main` con la `@version` aumentada,
Tampermonkey lo actualizara solo (comprueba cada 24 horas, o manualmente en
`Utilidades > Buscar actualizaciones de userscripts`).

## Ramas

- `main`: version estable; es la que usan las actualizaciones automaticas.
- `dev`: desarrollo y pruebas. Para probar esa version:
  https://raw.githubusercontent.com/leriart/AE-Track/dev/HJP-Wialon.user.js

Los cambios de `dev` no afectan a `main` hasta fusionarlos.

## Soporte

Reporta fallos o solicita cambios en:

https://github.com/leriart/AE-Track/issues

## Lo que puedes hacer

- Ver el estado de la flota: en linea, sin senal, detenidas, en movimiento y en
  zonas, en un panel con Dashboard, Unidades, Avisos, Rutas y Geocercas.
- Recibir alertas por tarjeta, voz, pitido y notificacion del navegador.
- Vigilar reglas de negocio: sin senal, GPS perdido, detenido, zonas, geocercas,
  destino, desconexion y exceso de velocidad.
- Abrir y acomodar automaticamente las ventanas de las unidades y mantener
  abiertas solo las seleccionadas.
- Planear rutas con OpenStreetMap (OSRM o algoritmo A*) y detectar desvios,
  giros en U y retorno por viaje cancelado.
- Guardar el trazado del recorrido y exportar ruta y traza a GeoJSON.
- Definir limite de velocidad por unidad, filtrar por estado y editar la lista
  vigilada con destinos.
- Abrir el panel como barra lateral o dejarlo flotante.
- Exportar informes a CSV y Markdown, y respaldar o restaurar la configuracion.

Detalle de uso, reglas, rutas, atajos y preguntas frecuentes en el
[manual de usuario](./MANUAL.md).
