<div align="center">

# Rondo

**El script de vigilancia de flota de AE-TrackRondo.**

Supervision en tiempo real sobre la API nativa de Wialon y AE-Track, directo en el navegador.
Sin servidores propios, sin instalar nada en la plataforma: el userscript lee la API que ya
carga tu sesion y te avisa de todo lo importante.

[Instalar Rondo](#instalacion) &nbsp;&middot;&nbsp;&nbsp; [Manual de usuario](./MANUAL.md) &nbsp;&middot;&nbsp;&nbsp; [Changelog](./changelogs/) &nbsp;&middot;&nbsp;&nbsp; [Repositorio](https://github.com/leriart/AE-Track)

</div>

<div align="center">

[![version](https://img.shields.io/badge/version-5.8.0-850D22?style=for-the-badge&labelColor=1f2330)](https://github.com/leriart/AE-Track/releases)
[![tests](https://img.shields.io/badge/tests-8%20suites%20OK-43a047?style=for-the-badge&labelColor=1f2330)](./tests)
[![tampermonkey](https://img.shields.io/badge/Tampermonkey-compatible-f57c00?style=for-the-badge&labelColor=1f2330)](https://www.tampermonkey.net/)
[![violentmonkey](https://img.shields.io/badge/Violentmonkey-compatible-f57c00?style=for-the-badge&labelColor=1f2330)](https://violentmonkey.github.io/)
[![license](https://img.shields.io/badge/license-MIT-313849?style=for-the-badge&labelColor=1f2330)](./LICENSE)
[![platforms](https://img.shields.io/badge/Chrome%20%7C%20Edge%20%7C%20Firefox%20%7C%20Opera%20%7C%20Safari-2f80ed?style=for-the-badge&labelColor=1f2330)]()

</div>

---

## Tabla de contenidos

- [Que es](#que-es)
- [Features](#features)
- [Instalacion](#instalacion)
- [La interfaz en un vistazo](#la-interfaz-en-un-vistazo)
- [Rutas y algoritmos](#rutas-y-algoritmos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Pruebas](#pruebas)
- [Ramas](#ramas)
- [Privacidad y datos](#privacidad-y-datos)
- [Creditos](#creditos)
- [Nota historica](#nota-historica)
- [Licencia](#licencia)

---

## Que es

**Rondo** es el userscript (Tampermonkey o Violentmonkey) que añade una capa de
supervision sobre AE-Track y Wialon. Trabaja con la sesion que ya tienes abierta:
evalua reglas de negocio sobre cada unidad, notifica por tarjeta, voz, pitido y
notificacion del navegador, automatiza la apertura y el acomodo de las ventanas
de unidades, y mantiene abiertas solo las que vigilas. Tambien planifica rutas
con OpenStreetMap (OSRM o A*), detecta desvios, giros en U y mide distancia y
odometro por unidad.

Todo se guarda en tu navegador. No se envia nada a servidores propios.

## Features

- **Reglas de alerta** personalizables: sin senal, GPS perdido en marcha,
  detenido en carretera, zona no prevista, geocercas, destino, desconexion,
  velocidad, desvio de ruta, giro en U, retorno y demora en base.
- **Avisos con color** y diferenciacion de exitos, advertencias y errores.
  Voz y pitido en alertas graves; notificacion del navegador opcional.
- **Rutas con OpenStreetMap**: planifica con OSRM (servidor publico) o con
  A* local sobre el grafo de OSM (Overpass), con respeto a `oneway` y
  `maxspeed`. **Trazado automatico** al asignar un destino en la lista
  vigilada: cuando una unidad tiene `eco=destino`, Rondo calcula la ruta
  en background y actualiza una columna "Ruta" en la tabla de unidades
  con estado (EN RUTA / LLEGO / DESV), progreso y ETA.
- **Modo caravana**: pestana dedicada que muestra las unidades (vigiladas
  o no) cerca de una unidad "lider" en la misma ruta (distancia firmada
  delante/detras) o dentro del radio de cercania, con marca de sentido
  contrario, velocidad y la pildora **NO VIGILADA** para las que no
  estan en tu lista. Util para convoyes y escoltas.
- **Zonas de riesgo** (optativo): configura una URL o importa un CSV/JSON
  con zonas de alto riesgo delictivo. Cuando una unidad transiciona de
  con-senal a sin-senal y su ultima posicion valida cae dentro del
  buffer de una zona cargada, Rondo dispara una alerta **critica**
  ("PERDIO SENAL EN ZONA DE RIESGO") con prioridad sobre las demas. Los
  datos viven solo en memoria y se consultan en cada arranque desde la
  URL configurada; el repo **no incluye ningun dataset**.
- **Analisis de viaje**: punto de partida (donde estuvo parada mas de N
  horas), trayecto, paradas y carga detectada.
- **Odometro por unidad** persistente, con deteccion de saltos GPS anomalos.
- **Barra lateral unica** redimensionable en ancho y cambiable de lado, con
  tema oscuro o claro y **tamano de interfaz ajustable** para mayor
  legibilidad. Ancho por defecto de **460px** y contenido sin desbordes
  (Unidades y Riesgo usan tarjetas responsivas).
- **Lista vigilada** editable con destinos, **perfiles de configuracion**,
  **filtros**, **exportacion a CSV/Markdown/GeoJSON** y **respaldo JSON**.
- **Dialogos y confirmaciones** coherentes con el estilo del panel, y
  **estado vacio util** con pista y accion en cada pestana.

## Instalacion

### 1. Instala un gestor de userscripts

| Navegador | Extension | Enlace |
| --- | --- | --- |
| Chrome / Chromium / Brave / Vivaldi | Tampermonkey | [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Microsoft Edge | Tampermonkey | [Edge Add-ons](https://www.tampermonkey.net/?browser=edge) |
| Opera | Tampermonkey | [Opera Add-ons](https://www.tampermonkey.net/?browser=opera) |
| Firefox | Tampermonkey | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |
| Safari (macOS) | Tampermonkey | [Web oficial](https://www.tampermonkey.net/?browser=safari) |

Alternativas:

| Navegador | Extension | Enlace |
| --- | --- | --- |
| Chrome / Edge | Violentmonkey | [Chrome Web Store](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) |
| Firefox | Violentmonkey | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/violentmonkey/) |

### 2. Instala Rondo

Con el gestor ya instalado, abre el enlace. Se mostrara la pantalla de
instalacion:

<div align="center">

[Instalar Rondo](https://raw.githubusercontent.com/leriart/AE-Track/main/rondo.user.js)

</div>

### 3. Actualizaciones automaticas

El script declara `@updateURL` y `@downloadURL` apuntando a `main`. Cada vez
que se publique una `@version` nueva en `main`, Tampermonkey o Violentmonkey
la instalaran solas (revision cada 24 horas, o manual desde
*Utilidades &middot; Buscar actualizaciones de userscripts*).

> Requisitos: tener sesion iniciada en AE-Track o Wialon y, si quieres
> notificaciones del sistema, aceptar el permiso del navegador.

## La interfaz en un vistazo

El panel es una **barra lateral** a pantalla completa, a la derecha o a la
izquierda, con ancho ajustable. Al ocultarla queda un rail en el borde que la
trae de vuelta. Se muestra u oculta con el boton de la barra, con `Alt+P` o
con `Alt+L`.

| Pestana | Para que sirve |
| --- | --- |
| **Dashboard** | Resumen compacto para la barra lateral: cabecera con velocidad promedio, 6 KPIs en cuadricula 3x2 (en linea, sin senal, detenidas, en mov., en zonas, avisos hoy) clicables para filtrar Unidades, distribucion de la flota con leyenda, "Requieren atencion" y avisos recientes. |
| **Unidades** | Lista de **tarjetas** (sin desbordes) con estado, velocidad, ultimo reporte, geocerca, odometro y **estado de ruta** con barra de progreso y ETA. Barra **Ordenar** por estado, eco, placa, velocidad, zona, odometro o ruta, con boton para invertir la direccion. Clic en una tarjeta abre su ventana. |
| **Avisos** | Historial de alertas con filtro por severidad y exportable a CSV o Markdown. |
| **Rutas** | Progreso, distancia al trazado, ETA y desvios de cada ruta planificada. Analisis de viaje por unidad. |
| **Zonas** | Fusiona las geocercas de la plataforma (con las unidades dentro, boton Recargar) y las zonas de riesgo (dona, histograma, KPIs, filtros, export y lista). |
| **Caravana** | Unidades (vigiladas o no) que acompanian a una unidad "lider" en la misma ruta (distancia firmada delante/detras) o dentro del radio de cercania. Marca sentido contrario, velocidad y si la unidad no esta vigilada. |


Atajos de teclado: `Alt+1..6` cambian de pestana, `Alt+P` / `Alt+L` muestran u
ocultan la barra lateral, `Alt+H` pliega la barra, `Esc` cierra el dialogo
superior.

## Rutas y algoritmos

El modulo de rutas usa servicios publicos de OpenStreetMap:

- **Nominatim** convierte direcciones o lugares en coordenadas.
- **OSRM** calcula la ruta de conduccion con su geometria completa.
- **Overpass** descarga el grafo vial que usa el algoritmo **A***.

Algoritmos de bajo nivel incluidos en el script:

- Distancia **haversine** y **rumbo** entre puntos.
- **Distancia punto-segmento** con proyeccion local para segmentos cortos y
  **cross-track geodesico** para segmentos largos.
- **Simplificacion de polilinea** con **Douglas-Peucker** para conservar la
  forma al reducir puntos.
- **Proyeccion sobre la ruta** (`snapRuta`): distancia al trazado, progreso y
  rumbo del tramo, memoizada para evitar escanear la polilinea cada
  refresco.
- **Cola de prioridad binaria** (`MinHeap`) y **A*** con heuristica
  haversina, que respeta `oneway` y `maxspeed` del grafo de OSM.
- **DBSCAN espacial** para detectar paradas reales aunque haya jitter GPS.

Con una ruta planificada, el motor avisa de:

| Alerta | Condicion |
| --- | --- |
| Desvio de ruta | Se aleja mas de 250 m del trazado durante 5 min |
| Giro en U | Rumbo opuesto al de la ruta (130 grados) durante 3 min |
| Retorno / viaje cancelado | Retrocede 25 % o vuelve a 400 m del origen |
| Llegada a destino | Alcanza el punto de destino |

Tambien guarda el trazado del recorrido y permite exportar la ruta y la
traza a GeoJSON.

> Los servicios publicos de OpenStreetMap tienen limites de uso. Rondo
> cachea el grafo y el geocodificado, y solo usa A* cuando lo activas.

## Estructura del proyecto

```
rondo.user.js          Userscript completo (un solo archivo, IIFE en modo estricto)
MANUAL.md              Manual de usuario completo
LICENSE                Licencia MIT
README.md              Este documento
changelogs/            Historial de cambios, un archivo por version
tests/                 Pruebas de algoritmos, version, viaje y UI
```

## Pruebas

Los algoritmos y utilidades se prueban sin navegador ni red:

```bash
node tests/algorithms.test.js
node tests/version.test.js
node tests/trip.test.js
node tests/odometro.test.js
node tests/ui.test.js
node tests/autoruta.test.js
node tests/caravana.test.js
node tests/riesgo.test.js
```

Las ocho suites verifican geodesica, Douglas-Peucker, DBSCAN, A* ponderado,
deteccion de punto de partida, paradas con jitter GPS, odometro, orden de
la tabla, escala de UI, parseo de version, trazado automatico de rutas,
calculo de ETA, estado de ruta, modo caravana (proyeccion al eje,
distancia firmada, sentido contrario y cercania directa) y algoritmos de
la pestana de zonas de riesgo (clasificacion por nivel, estadisticas,
filtrado, ordenamiento y agrupacion).

## Ramas

| Rama | Uso | Actualizacion automatica |
| --- | --- | --- |
| `main` | Version estable | Si, es la que apunta el script |
| `dev` | Desarrollo y pruebas | No |

Version de desarrollo:

```
https://raw.githubusercontent.com/leriart/AE-Track/dev/rondo.user.js
```

## Privacidad y datos

- Todo se ejecuta en tu navegador y se guarda en `localStorage` con el
  prefijo `rondo.api.*`.
- Si tienes instalada la version anterior (**HJP Wialon**), la primera
  vez que Rondo arranca **copia** automaticamente tu configuracion, lista
  vigilada, rutas, odometro y perfiles al nuevo namespace. La copia (no el
  movimiento) preserva los datos de ambas instalaciones, de modo que el
  script antiguo sigue funcionando con su propia configuracion.
- No se envia ningun dato a servidores propios. Solo se usan los servicios
  publicos de OpenStreetMap (Nominatim, OSRM, Overpass) cuando lo necesitas.

## Creditos

- Proyecto original y autoria de la idea: **Hector Ramirez**
  ([HectorRamirez-cpu](https://github.com/HectorRamirez-cpu)).
- Adaptacion, mantenimiento y nuevas funciones: **lerit**.

Historial detallado en [`changelogs/`](./changelogs/).

## Nota historica

Antes de la version **5.0.0** este proyecto se llamaba **HJP Wialon** y el
archivo del userscript era `HJP-Wialon.user.js`. Rondo es la continuacion
natural del mismo proyecto con un nuevo nombre, una nueva identidad y un
conjunto ampliado de algoritmos (geodesica, Douglas-Peucker, DBSCAN,
A* ponderado, snap memoizado, etc.). Si actualizas desde la version
anterior, Rondo migra tu configuracion automaticamente la primera vez.

## Licencia

MIT. Puedes usar, modificar y distribuir respetando los terminos de la
licencia. Consulta el archivo [LICENSE](./LICENSE) para el texto
completo.

<div align="center">

Hecho con cuidado para la comunidad de AE-Track y Wialon.

</div>
