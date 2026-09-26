<div align="center">

# Rondo

**Vigilancia de flota para AE-Track y Wialon, directo en tu navegador.**

Userscript que supervisa las unidades en tiempo real sobre la API nativa de
Wialon, sin servidores propios ni instalar nada en la plataforma: lee los
datos que ya carga tu sesion y te avisa de todo lo importante.

[Instalar Rondo](#instalacion) &nbsp;&middot;&nbsp;&nbsp; [Manual de usuario](./MANUAL.md) &nbsp;&middot;&nbsp;&nbsp; [Changelog](./changelogs/) &nbsp;&middot;&nbsp;&nbsp; [Repositorio](https://github.com/leriart/AE-Track)

</div>

<div align="center">

[![version](https://img.shields.io/badge/version-6.0.0-850D22?style=for-the-badge&labelColor=1f2330)](./changelogs/6.0.0.md)
[![tests](https://img.shields.io/badge/tests-971%20checks%20OK-43a047?style=for-the-badge&labelColor=1f2330)](./tests)
[![tampermonkey](https://img.shields.io/badge/Tampermonkey-compatible-f57c00?style=for-the-badge&labelColor=1f2330)](https://www.tampermonkey.net/)
[![violentmonkey](https://img.shields.io/badge/Violentmonkey-compatible-f57c00?style=for-the-badge&labelColor=1f2330)](https://violentmonkey.github.io/)
[![license](https://img.shields.io/badge/license-MIT-313849?style=for-the-badge&labelColor=1f2330)](./LICENSE)
[![platforms](https://img.shields.io/badge/Chrome%20%7C%20Edge%20%7C%20Firefox%20%7C%20Opera%20%7C%20Safari-2f80ed?style=for-the-badge&labelColor=1f2330)]()

</div>

---

## Tabla de contenidos

- [Que es](#que-es)
- [Features](#features)
- [Compatibilidad](#compatibilidad)
- [Instalacion](#instalacion)
- [Quickstart](#quickstart)
- [La interfaz en un vistazo](#la-interfaz-en-un-vistazo)
- [Rutas y algoritmos](#rutas-y-algoritmos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Pruebas](#pruebas)
- [Ramas](#ramas)
- [Privacidad y datos](#privacidad-y-datos)
- [Seguridad](#seguridad)
- [Creditos](#creditos)
- [Nota historica](#nota-historica)
- [Licencia](#licencia)

---

## Que es

**Rondo** es un userscript (Tampermonkey o Violentmonkey) que añade una capa
de supervision sobre **AE-Track** y **Wialon**. Trabaja con la sesion que ya
tienes abierta: evalua reglas de negocio sobre cada unidad, notifica por
tarjeta, voz, pitido y notificacion del navegador, automatiza la apertura y
el acomodo de las ventanas de unidades, y mantiene abiertas solo las que
vigilas. Tambien planifica rutas con OpenStreetMap (OSRM o A*), detecta
desvios, giros en U y mide distancia y odometro por unidad.

Todo se guarda en tu navegador. No se envia nada a servidores propios.

## Features

### Alertas y supervision

- **Reglas de alerta** personalizables: sin senal, GPS perdido en marcha,
  detenido en carretera, zona no prevista, geocercas, destino, desconexion,
  velocidad, desvio de ruta, giro en U, retorno y demora en base.
- **Avisos con color** y diferenciacion de exitos, advertencias y errores.
  Voz y pitido en alertas graves; notificacion del navegador opcional.
- **Modo No molestar** (cabecera) que silencia voz, pitido y toasts durante
  30 minutos con un clic.
- **Silenciar por unidad** desde la tarjeta o el menu contextual: la unidad
  deja de generar avisos hasta que la reactives.

### Rutas y trayectos

- **Rutas con OpenStreetMap**: planifica con OSRM (servidor publico) o con
  A* local sobre el grafo de OSM (Overpass), respetando `oneway` y
  `maxspeed`.
- **Rutas multipunto**: cada unidad puede tener varias **paradas**
  (geocercas, municipios, coordenadas o lugares) en modo **secuencial** o
  **mejor ruta** (optimiza el orden y cierra el circuito en el origen). El
  editor de paradas tiene **busqueda difusa con sugerencias** de geocercas y
  municipios.
- **Municipios de OpenStreetMap**: se guarda su poligono/bbox y se usa como
  **tolerancia de desvio** (si la unidad sigue dentro del municipio de la ruta,
  no se marca desvio hasta un margen configurable).
- **Trazado automatico** al asignar un destino en la lista vigilada: cuando
  una unidad tiene `eco=destino`, Rondo calcula la ruta en background y
  actualiza una columna "Ruta" con estado (EN RUTA / LLEGO / DESV),
  progreso y ETA. Con varias paradas indica ademas la **parada actual** y la
  **siguiente**.
- **Deteccion de desvios, giros en U y retornos** con alertas propias, mas
  llegada a cada parada y **regreso a base** al completar el circuito.
- **Modo caravana**: unidades (vigiladas o no) cerca de una unidad "lider"
  en la misma ruta, con distancia firmada delante/detras, marca de sentido
  contrario y pildora **NO VIGILADA** para las que no estan en tu lista.
- **Analisis de viaje**: punto de partida, trayecto, paradas (con DBSCAN
  para ignorar jitter GPS) y carga detectada.
- **Odometro por unidad** persistente, con deteccion de saltos GPS anomalos.

### Zonas

- **Geocercas** de la plataforma consultadas en tiempo real, con KPIs (total,
  con unidades, base, carga), busqueda, orden, filtro por rol, unidades dentro,
  area/centro y exportacion a CSV/GeoJSON. Desde cada tarjeta puedes convertir
  la geocerca en **parada** de una unidad.
- **Zonas de riesgo** (optativo): configura una URL o importa un CSV/JSON
  con zonas de alto riesgo delictivo. Cuando una unidad transiciona de
  con-senal a sin-senal y su ultima posicion valida cae dentro del buffer
  de una zona cargada, Rondo dispara una alerta **critica**
  ("PERDIO SENAL EN ZONA DE RIESGO") con prioridad sobre las demas. Los
  datos viven solo en memoria; el repo **no incluye ningun dataset**.

### Interfaz

- **Barra lateral unica** redimensionable en ancho y cambiable de lado, con
  tema oscuro o claro y **tamano de interfaz ajustable** para mayor
  legibilidad. Ancho por defecto de **460px** y contenido sin desbordes
  (Unidades y Riesgo usan tarjetas responsivas).
- **6 pestanas** con los mismos iconos que la plataforma AE-Track
  (Ant Design, SVG inline, sin fuente externa).
- **Lista vigilada** editable desde el menu unificado **Unidades y rutas**
  (agregar, pegar, destinos/rutas multipunto, orden de ventanas), con
  **perfiles de configuracion**, **filtros**, **exportacion a
  CSV/Markdown/GeoJSON** y **respaldo JSON**.
- **Dialogos y confirmaciones** coherentes con el estilo del panel, y
  **estado vacio util** con pista y accion en cada pestana.
- **Atajos de teclado** para abrir/cerrar el panel y cambiar de pestana.
- **Test de voz** en Ajustes > Avisos: boton Probar / Detener que
  reproduce una frase editable con el motor (Web, StreamElements,
  Google), idioma y voz configurados.

### IA de razonamiento (optativa)

- **5 proveedores gratis** (OpenAI-compatible) mas uno Personalizado:
  DeepSeek (`deepseek-chat`), NVIDIA NIM (`meta/llama-3.1-70b-instruct`),
  Kimi for Coding (`kimi-for-coding`), Moonshot (`kimi-k2.6`) y MiniMax
  (`MiniMax-M3`). El endpoint y el modelo se pueden sobreescribir en la UI.
- En cada aviso de la pestana **Avisos** hay un boton **IA** que manda
  contexto (estado de la unidad, geocercas, POIs cercanos por Overpass
  y alertas recientes) al proveedor y devuelve un veredicto
  estructurado (`falso_positivo` / `normal` / `sospechoso` / `critico`)
  con resumen, evidencia y recomendacion.
- **Analisis en lote** (cabecera de Avisos): envia hasta 25 avisos en
  una sola llamada y devuelve resumen ejecutivo + ranking priorizado
  + recomendaciones operativas.
- **Analizar flota** (cabecera de Avisos): revision proactiva de **toda la
  plataforma** con las unidades que requieren atencion, riesgos detectados y
  recomendaciones. La IA recibe posicion, municipio, zona, limite, odometro,
  ruta con paradas, zonas de riesgo, viajes, configuracion y alertas del dia.
- **Resumen narrativo del informe** (boton Informe): el `.md` diario
  arranca con un bloque `## Resumen IA` de 3-6 frases en espanol.
- **Deteccion de patrones** (Ajustes > IA): la IA analiza las
  ultimas 50-200 alertas, identifica patrones recurrentes por
  unidad / regla / hora / zona y propone sugerencias concretas de
  ajuste de parametros del script con un boton **Aplicar** por
  sugerencia.
- **Chat IA** (pestana propia, `Alt+7`): asistente conversacional que
  conoce el **manual de Rondo** y el **estado actual de la flota**.
  Sirve para consultar datos ("que unidades estan sin senal") o
  resolver dudas de uso ("como activo la regla de destino"). Switch
  **Toda la flota** / solo vigiladas. Ver
  [Chat con la IA](./MANUAL.md#chat-con-la-ia).
- **Cache TTL + tope diario** blando (configurable, 200 por defecto)
  para no agotar la cuota del proveedor.
- La API key se guarda en `localStorage` y solo se envia al endpoint del
  proveedor; el flujo automatico de alertas no se ve afectado.

### Regla predictiva de aproximacion a zona de riesgo

Nueva regla `riesgoPredict` (apagada por defecto) que avisa **antes**
de que la unidad llegue a una zona de alto score: cuando una unidad
**en movimiento** se esta acercando y, opcionalmente, estamos dentro
de la ventana nocturna (22:00-05:00 por defecto). Es complementaria a
`riesgoSinSenal`: esta ultima sigue disparando cuando la unidad ya
perdio senal dentro de la zona.

## Compatibilidad

| Navegador | Soporte | Notas |
| --- | --- | --- |
| Chrome, Chromium, Brave, Vivaldi | ✅ | via Tampermonkey o Violentmonkey |
| Microsoft Edge | ✅ | via Tampermonkey o Violentmonkey |
| Opera | ✅ | via Tampermonkey o Violentmonkey |
| Firefox | ✅ | via Tampermonkey o Violentmonkey |
| Safari (macOS) | ✅ | via Tampermonkey |

Plataformas de seguimiento soportadas: **AE-Track** (cualquier instancia) y
**Wialon Hosting** (cualquier dominio `*.wialon.com/*` y derivados).

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

**[Instalar Rondo](https://raw.githubusercontent.com/leriart/AE-Track/main/rondo.user.js)**

</div>

> Version de desarrollo (mas nueva pero menos probada):
> `https://raw.githubusercontent.com/leriart/AE-Track/dev/rondo.user.js`

### 3. Actualizaciones automaticas

El script declara `@updateURL` y `@downloadURL` apuntando a `main`. Cada vez
que se publique una `@version` nueva en `main`, Tampermonkey o Violentmonkey
la instalaran solas (revision cada 24 horas, o manual desde
*Utilidades &middot; Buscar actualizaciones de userscripts*).

> Requisitos: tener sesion iniciada en AE-Track o Wialon y, si quieres
> notificaciones del sistema, aceptar el permiso del navegador.

## Quickstart

1. **Instala** el script siguiendo los pasos de [Instalacion](#instalacion).
2. **Inicia sesion** en tu instancia de AE-Track o Wialon.
3. **Abre Rondo** con el boton **Panel** de la barra superior, `Alt+P` o
   `Alt+L`. Aparece una barra lateral.
4. **Vigila unidades** en la pestana *Unidades*: marca las casillas de las
   unidades que quieres monitorear (o activa *Monitorear todas* en
   *Ajustes*).
5. **Pulsa Automatizar Unidades** para abrir y acomodar las ventanas de las
   unidades vigiladas.
6. *(Opcional)* Configura reglas y avisos en *Ajustes* (severidad minima,
   motor de voz, zonas de riesgo, etc.).

Para el resto (geocercas, rutas, modo caravana, exportar CSV, etc.) consulta
el [Manual de usuario](./MANUAL.md).

## La interfaz en un vistazo

El panel es una **barra lateral** a pantalla completa, a la derecha o a la
izquierda, con ancho ajustable. Al ocultarla queda un rail en el borde que la
trae de vuelta. Se muestra u oculta con el boton de la barra, con `Alt+P` o
con `Alt+L`.

| Pestana | Para que sirve |
| --- | --- |
| **Dashboard** | Resumen compacto para la barra lateral: cabecera con velocidad promedio, 6 KPIs en cuadricula 3x2 (en linea, sin senal, detenidas, en mov., en zonas, avisos hoy) clicables para filtrar Unidades, distribucion de la flota con leyenda, "Requieren atencion" y avisos recientes. |
| **Unidades** | Lista de **tarjetas** (sin desbordes ni parpadeo) con estado, velocidad, ultimo reporte, geocerca, odometro y **estado de ruta** con barra de progreso y ETA. Cada tarjeta tiene **botones rapidos** (abrir, paradas/ruta, mapa, vigilar, silenciar). Barra **Ordenar** por estado, eco, placa, velocidad, zona, odometro o ruta, con boton para invertir la direccion. Clic en una tarjeta abre su ventana. |
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

Desde la **6.0.0** el codigo vive en `src/` (fragmentos organizados por dominio)
y el userscript se **construye** con un script de Node sin dependencias. El
archivo que se instala (`rondo.user.js`) es un **bootstrap** que carga tres
modulos con `@require` desde los assets del release; en el repositorio tambien
se guarda el bundle completo para auditar y para las pruebas.

```
src/                   Codigo fuente (header, prelude y parts/ ordenados)
scripts/build.mjs      Build (--mode=bundle | --mode=require), sin dependencias
scripts/bump-readme.mjs  Actualiza el badge de version (lo usa el release)
dist/                  Modulos generados (rondo-core/engine/ui.js)
rondo.user.js          Bootstrap instalable (o bundle, en modo bundle)
MANUAL.md              Manual de usuario completo
ARCHITECTURE.md        Mapa de modulos y flujo de datos
CONTRIBUTING.md        Como construir, probar y contribuir
changelogs/            Historial de cambios, un archivo por version
tests/                 Pruebas que leen el bundle construido
.github/workflows/     CI, release y canal dev
```

Comandos:

```bash
node scripts/build.mjs --mode=bundle --out build/rondo.bundle.js   # un archivo
node scripts/build.mjs --mode=require --out rondo.user.js          # hibrido + dist/
```

## Pruebas

El cargador de pruebas (`tests/_source.js`) construye el bundle si hace falta y
las suites lo leen. Los algoritmos y utilidades se prueban sin navegador ni red:

```bash
node tests/algorithms.test.js
node tests/version.test.js
node tests/trip.test.js
node tests/odometro.test.js
node tests/ui.test.js
node tests/autoruta.test.js
node tests/caravana.test.js
node tests/riesgo.test.js
node tests/paradas.test.js
node tests/geocercas.test.js
node tests/syntax.test.js
node tests/extraer_patrones.test.js
```

**12 suites, ~971 checks** que verifican geodesica, Douglas-Peucker, DBSCAN,
A* ponderado, deteccion de punto de partida, paradas con jitter GPS,
odometro, orden de la tabla, escala de UI, parseo de version, trazado
automatico de rutas, calculo de ETA, estado de ruta, modo caravana
(proyeccion al eje, distancia firmada, sentido contrario y cercania
directa), algoritmos de la pestana de zonas de riesgo (clasificacion por
nivel, estadisticas, filtrado, ordenamiento y agrupacion), integridad
del set de iconos (paths SVG, diferenciacion de pares y regresion de
bugs), la integracion de voz (test de voz, IA con DeepSeek / NVIDIA /
Kimi, contexto Overpass, boton en alertas) y, desde la 5.15.0, busqueda
difusa, parser de paradas multipunto, optimizador de orden y municipios de
OpenStreetMap.

## Ramas

| Rama | Uso | `@updateURL` |
| --- | --- | --- |
| `main` | Version estable, recomendada para uso en produccion | Si |
| `dev`  | Desarrollo y pruebas, puede contener regresiones | No |

Version de desarrollo (usar bajo tu cuenta y riesgo):

```
https://raw.githubusercontent.com/leriart/AE-Track/dev/rondo.user.js
```

Para contribuir: rama tu trabajo desde `dev`, abre un PR contra `dev`, y
tras verificar en `dev` se promueve a `main`.

## Privacidad y datos

- Todo se ejecuta en tu navegador y se guarda en `localStorage` (prefijo
  `rondo.api.*`) y `sessionStorage` (prefijo `rondo.api.s.*` para datos
  por pestana).
- Si tienes instalada la version anterior (**HJP Wialon**), la primera
  vez que Rondo arranca **copia** automaticamente tu configuracion, lista
  vigilada, rutas, odometro y perfiles al nuevo namespace. La copia (no el
  movimiento) preserva los datos de ambas instalaciones, de modo que el
  script antiguo sigue funcionando con su propia configuracion.
- No se envia ningun dato a servidores propios. Solo se usan los servicios
  publicos de OpenStreetMap (Nominatim, OSRM, Overpass) y los proveedores
  de voz online (StreamElements, Google) cuando los activas en
  *Ajustes &rsaquo; Avisos*.
- El codigo es 100% JS embebido en el userscript: auditable con un clic
  (*Ver codigo fuente* en el panel del gestor de userscripts).

## Seguridad

- **Mismo origen**: el script solo se activa en `*://*.ae-track.com/*`,
  `*://ae-track.com/*` y `*://*.wialon.com/*` (declarado en `@match`).
- **Sin eval remoto**: no carga JS desde ningun CDN. Los iconos son SVG
  inline.
- **Permisos minimos**: solo pide `notifications` cuando el usuario activa
  *Avisos de escritorio* en Ajustes.
- **CSP-friendly**: funciona en paginas con Content-Security-Policy
  restrictiva porque no inyecta `<script>` remotos.
- **IA optativa con `GM_xmlhttpRequest`**: para que la IA funcione, el
  script declara `@grant GM_xmlhttpRequest` y `@connect` a los
  proveedores (DeepSeek, NVIDIA, Moonshot, Kimi.ai, MiniMax, Overpass).
  Esas peticiones salen por el gestor de userscripts (no por la pagina),
  asi que **no las afecta CORS ni la CSP**. La API key solo se envia al
  endpoint que configures. Si desactivas la IA (`Ajustes > IA`), Rondo no
  hace ninguna peticion a esos proveedores.

## Creditos

- Proyecto original y autoria de la idea: **Hector Ramirez**
  ([HectorRamirez-cpu](https://github.com/HectorRamirez-cpu)).
- Adaptacion, mantenimiento y nuevas funciones: **lerit**.
- Iconos: **Ant Design Icons** ([@ant-design/icons](https://github.com/ant-design/ant-design-icons)),
  mismo set que usa la plataforma AE-Track a traves de `@wialon/ui`.

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