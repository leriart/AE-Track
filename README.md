<div align="center">

<h1>HJP · Wialon</h1>

<p><strong>Vigilancia de flota sobre la API nativa de Wialon y AE-Track, dentro de tu navegador.</strong></p>

<p>Sin servidores, sin instalar nada en la plataforma: el userscript lee la API
que ya carga tu sesión de Wialon y te avisa de todo lo importante.</p>

<p>
<a href="https://raw.githubusercontent.com/leriart/AE-Track/main/HJP-Wialon.user.js"><img src="https://img.shields.io/badge/Instalar-HJP--Wialon-2ea44f?style=for-the-badge" alt="Instalar"></a>
<a href="./MANUAL.md"><img src="https://img.shields.io/badge/Manual-usuario-1f6feb?style=for-the-badge" alt="Manual de usuario"></a>
<a href="./changelogs/"><img src="https://img.shields.io/badge/Changelog-versiones-6f42c1?style=for-the-badge" alt="Changelog"></a>
</p>

<p>
<img src="https://img.shields.io/badge/version-4.11.0-2563eb?style=flat-square" alt="version">
<img src="https://img.shields.io/badge/Tampermonkey-compatible-f57c00?style=flat-square" alt="Tampermonkey">
<img src="https://img.shields.io/badge/Violentmonkey-compatible-f57c00?style=flat-square" alt="Violentmonkey">
<img src="https://img.shields.io/badge/navegadores-Chrome%20%7C%20Edge%20%7C%20Firefox%20%7C%20Opera-2ea44f?style=flat-square" alt="navegadores">
<img src="https://img.shields.io/badge/OpenStreetMap-OSRM%20%7C%20A*-6b8e23?style=flat-square" alt="OpenStreetMap">
<img src="https://img.shields.io/badge/tests-passing-2ea44f?style=flat-square" alt="tests">
</p>

<p>Proyecto original de <a href="https://github.com/HectorRamirez-cpu">Héctor Ramírez (HectorRamirez-cpu)</a>.</p>

</div>

---

## Tabla de contenido

- [Que es](#que-es)
- [Instalacion](#instalacion)
- [La interfaz en un vistazo](#la-interfaz-en-un-vistazo)
- [Rutas y algoritmos](#rutas-y-algoritmos)
- [Ramas del repositorio](#ramas-del-repositorio)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Pruebas](#pruebas)
- [Creditos](#creditos)
- [Soporte](#soporte)
- [Lo que puedes hacer](#lo-que-puedes-hacer)

---

## Que es

HJP Wialon es un userscript (Tampermonkey o Violentmonkey) que añade una capa de
vigilancia sobre AE-Track y Wialon. Trabaja con la sesión que ya tienes abierta:

- Evalúa reglas de negocio sobre cada unidad y genera alertas.
- Notifica por tarjeta, voz, pitido y notificación del navegador.
- Automatiza la apertura y el acomodo de las ventanas de seguimiento.
- Seguimiento de rutas sobre OpenStreetMap, con detección de desvíos y retorno.
- Guarda toda la configuración en tu navegador, sin backend propio.

## Instalacion

### 1. Instala un gestor de userscripts

| Navegador | Extensión | Enlace |
| --- | --- | --- |
| Chrome / Chromium / Brave / Vivaldi | Tampermonkey | [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Microsoft Edge | Tampermonkey | [Edge Add-ons](https://www.tampermonkey.net/?browser=edge) |
| Opera | Tampermonkey | [Opera Add-ons](https://www.tampermonkey.net/?browser=opera) |
| Firefox | Tampermonkey | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |
| Safari (macOS) | Tampermonkey | [Web oficial](https://www.tampermonkey.net/?browser=safari) |

Alternativas:

| Navegador | Extensión | Enlace |
| --- | --- | --- |
| Chrome / Edge | Violentmonkey | [Chrome Web Store](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) |
| Firefox | Violentmonkey | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/violentmonkey/) |

### 2. Instala el script

Con el gestor ya instalado, abre el enlace. Se mostrará la pantalla de
instalación:

<div align="center">

<a href="https://raw.githubusercontent.com/leriart/AE-Track/main/HJP-Wialon.user.js"><img src="https://img.shields.io/badge/Instalar%20HJP%20Wialon-2ea44f?style=for-the-badge" alt="Instalar HJP Wialon"></a>

</div>

### 3. Actualizaciones automáticas

El script declara `@updateURL` y `@downloadURL` apuntando a la rama `main`. Cada
vez que se publique una `@version` nueva en `main`, Tampermonkey la instalará
sola (revisa cada 24 horas, o manualmente en
`Utilidades > Buscar actualizaciones de userscripts`).

> Requisitos: tener sesión iniciada en AE-Track o Wialon y, si quieres
> notificaciones del sistema, aceptar el permiso del navegador.

## La interfaz en un vistazo

El panel puede ser **flotante** (movible y redimensionable) o una **barra
lateral** a pantalla completa a la derecha o a la izquierda. Se cambia con el
botón de la cabecera o con `Alt+L`.

| Pestaña | Para qué sirve |
| --- | --- |
| Dashboard | En línea, sin señal, detenidas, en movimiento, en zonas y alertas del día |
| Unidades | Lista con estado, velocidad, zona y acciones; clic derecho para más opciones |
| Avisos | Historial de alertas filtrable por severidad, exportable a CSV |
| Rutas | Progreso, distancia al trazado, ETA y desvíos de cada ruta planificada |
| Geocercas | Cuántas unidades hay dentro de cada geocerca |

Atajos: `Alt+1`..`Alt+5` cambian de pestaña, `Alt+P` muestra u oculta el panel,
`Alt+L` alterna barra lateral, `Alt+H` pliega la barra y `Esc` cierra ventanas.

## Rutas y algoritmos

<details>
<summary>Ver detalle del modulo de rutas (OpenStreetMap, OSRM y A*)</summary>

El módulo de rutas usa servicios públicos de OpenStreetMap:

- **Nominatim** convierte direcciones o lugares en coordenadas.
- **OSRM** calcula la ruta de conducción con su geometría completa.
- **Overpass** descarga el grafo vial que usa el algoritmo **A***.

Algoritmos de bajo nivel incluidos en el script:

- Distancia **haversine** y **rumbo** entre puntos.
- **Distancia punto-segmento** con proyección equirectangular local.
- **Simplificación de polilínea** para reducir el trazado.
- **Proyección sobre la ruta** (`snapRuta`): distancia al trazado, progreso y
  rumbo del tramo.
- **Cola de prioridad binaria** (`MinHeap`) y **A*** con heurística haversine.

Con una ruta planificada, el motor avisa de:

| Alerta | Condición |
| --- | --- |
| Desvío de ruta | Se aleja más de 250 m del trazado durante 5 min |
| Giro en U | Rumbo opuesto al de la ruta (130 grados) durante 3 min |
| Retorno / viaje cancelado | Retrocede 25 % o vuelve a 400 m del origen |
| Llegada a destino | Alcanza el punto de destino |

También guarda el trazado del recorrido y permite exportar la ruta y la traza a
GeoJSON.

> Los servicios públicos de OpenStreetMap tienen límites de uso. El script
> cachea el grafo y el geocodificado, y solo usa A* cuando lo activas.

</details>

## Ramas del repositorio

| Rama | Uso | Actualización automática |
| --- | --- | --- |
| `main` | Versión estable | Sí, es la que apunta el script |
| `dev` | Desarrollo y pruebas | No |

Versión de desarrollo:

```
https://raw.githubusercontent.com/leriart/AE-Track/dev/HJP-Wialon.user.js
```

## Estructura del proyecto

```
HJP-Wialon.user.js        Userscript completo (un solo archivo, IIFE en modo estricto)
MANUAL.md                 Manual de usuario completo
README.md                 Este documento
changelogs/               Historial de cambios, un archivo por versión
tests/algorithms.test.js  Pruebas de los algoritmos geográficos y de rutas
```

## Pruebas

Los algoritmos puros (haversine, rumbo, distancia punto-segmento, simplificado
de polilínea, `snapRuta`, `MinHeap` y `A*`) se prueban sin navegador ni red:

```bash
node tests/algorithms.test.js
```

## Creditos

- Proyecto original y autoría de la idea: **Héctor Ramírez**
  ([HectorRamirez-cpu](https://github.com/HectorRamirez-cpu)).
- Adaptación, mantenimiento y nuevas funciones: **lerit**.

Historial detallado en [`changelogs/`](./changelogs/).

## Soporte

Reporta fallos o solicita cambios en
[GitHub Issues](https://github.com/leriart/AE-Track/issues). Incluye navegador,
versión de Tampermonkey, `@version` del script y pasos para reproducir.

---

## Lo que puedes hacer

| Área | Capacidades |
| --- | --- |
| Vigilancia | Reglas de sin señal, GPS perdido, detenido, zonas, geocercas, destino, desconexión, velocidad, desvío, giro en U y retorno |
| Avisos | Tarjetas, voz, pitido, notificación del navegador, severidad mínima, horario y modo No molestar |
| Ventanas | Apertura y acomodo automático, resaltado, cierre y verificación de solo las seleccionadas |
| Rutas | Planeación con OSRM o A*, seguimiento de progreso, exportación a GeoJSON y trazado del recorrido |
| Unidades | Límite de velocidad por unidad, filtros por estado, lista vigilada con destinos y menú contextual |
| Datos | Informes a CSV y Markdown, respaldo y restauración de configuración, y perfiles con nombre |
| Interfaz | Panel flotante o barra lateral, tema oscuro o claro, densidad y color de acento |
| Ayuda | Ayuda rápida integrada, manual de usuario y atajos de teclado |

Guía detallada en el [manual de usuario](./MANUAL.md).
