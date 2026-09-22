# Manual de usuario · Rondo

Guia completa para usar el userscript Rondo sobre AE-Track o Wialon.
Para instalar el script revisa el [README](./README.md).

Indice:

- [Que es y que necesitas](#que-es-y-que-necesitas)
- [Primeros pasos](#primeros-pasos)
- [La barra de botones](#la-barra-de-botones)
- [El panel: flotante o barra lateral](#el-panel-flotante-o-barra-lateral)
- [Las seis pestanas](#las-seis-pestanas)
- [Vigilar unidades (lista vigilada)](#vigilar-unidades-lista-vigilada)
- [Reglas de alerta](#reglas-de-alerta)
- [Notificaciones](#notificaciones)
- [Rutas con OpenStreetMap](#rutas-con-openstreetmap)
- [Limite de velocidad por unidad](#limite-de-velocidad-por-unidad)
- [Filtrar y buscar](#filtrar-y-buscar)
- [Menu contextual (clic derecho)](#menu-contextual-clic-derecho)
- [Atajos de teclado](#atajos-de-teclado)
- [Informes, respaldos y CSV](#informes-respaldos-y-csv)
- [Configuracion paso a paso](#configuracion-paso-a-paso)
- [Preguntas frecuentes](#preguntas-frecuentes)
- [Privacidad y datos](#privacidad-y-datos)
- [Creditos](#creditos)

## Que es y que necesitas

Rondo es una capa de vigilancia que se ejecuta dentro de tu navegador
mientras usas AE-Track o Wialon. No necesitas servidores ni instalar nada en la
plataforma: lee la API nativa de Wialon que ya carga la pagina y trabaja con los
datos de tu propia sesion.

Necesitas:

- Un navegador con Tampermonkey (o Violentmonkey) y el script instalado.
- Tu sesion de Wialon o AE-Track iniciada.
- Permiso de notificaciones del navegador si quieres avisos de escritorio.

Al entrar, veras una barra con botones y un panel. Todo se guarda en tu
navegador (localStorage), no se envia a ningun servidor propio.

## Primeros pasos

1. Entra a tu instancia de Wialon o AE-Track e inicia sesion.
2. En la pestana **Unidades**, marca la casilla de las unidades que quieras
   vigilar. Si prefieres vigilarlas todas, activa **Monitorear todas** en
   Ajustes.
3. Pulsa **Automatizar Unidades** para abrir y acomodar las ventanas de esas
   unidades.
4. Deja el panel abierto: las alertas apareceran solas como tarjetas, voz y
   pitido segun tu configuracion.

Si es la primera vez, aparece una **ventana de bienvenida** con los tres pasos
básicos. Pulsa el botón **?** de la cabecera para abrir la ayuda rápida en
cualquier momento.

### Avisos con color y confirmaciones

Los mensajes del panel distinguen su tipo: **verde** para confirmaciones,
**ámbar** para advertencias y **rojo** para errores. Las acciones que tardan
(refrescar, abrir ventanas, verificar, buscar actualizaciones) muestran un
indicador de progreso en el propio botón. Las acciones destructivas (eliminar
ruta, reiniciar odómetro, borrar perfiles o el historial) piden confirmación
en un diálogo con la misma apariencia del panel.

## La barra de botones

Es la barra flotante que puedes arrastrar por la pantalla (arrastra desde los
puntos de la izquierda). Doble clic sobre los puntos cambia la orientacion
horizontal o vertical.

- **Automatizar Unidades**: abre la lista de unidades. Desde ahi defines que
  unidades vigilar y lanza la apertura y el acomodo automatico de sus ventanas.
- **Panel**: muestra u oculta el panel de control. Funciona en modo flotante y
  en barra lateral.
- **Flotante / Lateral**: alterna entre los dos modos del panel. Su icono y
  etiqueta reflejan el modo actual.
- **Cerrar Todas**: cierra todas las ventanas de unidades abiertas. Para evitar
  cierres accidentales, el primer clic arma el boton (se pone rojo y dice
  "Confirmar") y el segundo clic cierra; si no confirmas en 4 segundos se
  desarma. Se puede desactivar en Ajustes, pestana Ventanas.
- **Plegar**: oculta los botones y deja solo la barra; util si estorba.
- El punto de color indica el estado general: verde normal, ambar atencion,
  rojo alertas criticas recientes, gris con borde punteado si esta activo
  **No molestar**.

Con el boton derecho sobre un boton de la barra lo ocultas; lo vuelves a
activar en Ajustes, pestana Ventanas.

## El panel: flotante o barra lateral

El panel puede mostrarse de dos formas:

- **Flotante**: ventana movible y redimensionable. Arrastrala desde su cabecera
  y cambia su tamano desde la esquina inferior derecha.
- **Barra lateral**: panel fijo a pantalla completa en el lado derecho o
  izquierdo, ideal para dejar la vigilancia siempre visible mientras trabajas.

Para cambiar de modo:

- Pulsa el boton **Flotante / Lateral** de la barra superior (siempre
  visible), o
- Usa **Alt + L**, o
- Ve a Ajustes, pestana **Ventanas**, y elige **Modo** (flotante o barra
  lateral), **Lado** (derecha o izquierda) y **Ancho lateral (px)**.

Para mostrar u ocultar el panel (ambos modos) usa el boton **Panel** de la
barra, el boton **Ocultar** de la barra lateral, el icono de campana con tachado
del menu **No molestar** o el atajo **Alt + P**. En modo barra lateral, al
ocultarla queda una pequena pestana vertical en el borde (el **rail**) que la
trae de vuelta con un clic y una animacion suave.

Ademas, en modo barra lateral, **al hacer clic fuera del panel** la barra se
oculta automaticamente y deja el rail visible. Puedes desactivar este
comportamiento en Ajustes, pestana **Ventanas** ("Ocultar la barra lateral al
hacer clic fuera").

El panel **recuerda como lo dejaste**: el modo (flotante o barra lateral), el
lado, el ancho y si estaba abierto o cerrado. Al recargar la pagina se restaura
en ese estado.

## Las seis pestanas

En la parte superior del panel:

- **Dashboard**: resumen de la flota. Tarjetas con en línea, sin señal,
  detenidas, en movimiento, en zonas y avisos del día. Las tarjetas son
  **clicables**: al pulsar una se abre la pestaña Unidades filtrada por ese
  estado (o Avisos / Geocercas). Incluye una **barra de distribución** de la
  flota (en movimiento / detenidas / sin señal), la gráfica de unidades en
  línea, una lista de **"Requieren atención"** con las 5 unidades más
  urgentes (sin señal, exceso, desviadas o detenidas) que abren su ventana
  al pulsarlas, y los avisos recientes.
- **Unidades**: lista de unidades vigiladas con estado, ultimo reporte,
  velocidad, zona, odometro y acciones. Clic en una fila para abrir su
  ventana. La campana silencia los avisos de esa unidad. El estado se
  muestra como **pildora de color** (verde en linea, ambar detenida, rojo
  sin senal) y las columnas se pueden **ordenar** con clic en la cabecera.
- **Avisos**: historial de alertas con filtro por severidad (criticas, altas,
  medias, bajas). Cada aviso indica la regla que lo genero y la hora.
- **Rutas**: seguimiento de las rutas planificadas: progreso, distancia al
  trazado, ETA y acciones para recalcular, exportar o eliminar.
- **Geocercas**: cuantas unidades hay dentro de cada geocerca y cuales.
- **Caravana**: unidades (vigiladas o no) que acompanian a una unidad
  "lider" en la misma ruta (proyeccion al eje) o dentro del radio de
  cercania. Muestra distancia firmada (+450 m delante / -300 m detras), modo
  "cerca" cuando no toca la ruta, sentido contrario y velocidad. Ver
  [Modo caravana](#modo-caravana).

## Vigilar unidades (lista vigilada)

Pulsa **Automatizar Unidades** en la barra. Se abre la lista, donde puedes:

- Pegar varias unidades a la vez, una por linea, con el formato `eco` o
  `eco=destino`.
- Anadir una unidad con sus campos de economico y destino, y el boton **+ Anadir**.
- Editar el destino de cada unidad (se usa para la regla de destino y para
  validar si una geocerca es la esperada).
- Quitar unidades con la x, o vaciar la lista completa.
- Pulsar **Ejecutar (abrir ventanas)** para abrir y acomodar las ventanas de las
  unidades de la lista.

### Orden de las ventanas

El orden de la lista es el orden en el que se abren y se acomodan las ventanas
de los vehiculos. Puedes cambiarlo de dos formas:

- Con los botones de la parte superior de la lista: **Pegado** (orden en que las
  pegaste), **Numero** (de menor a mayor), **Numero inverso**, **A-Z** e
  **Invertir**. El boton del modo activo se resalta.
- **Arrastrando** el asa (⠿) de cada fila para colocarla donde quieras. El
  numero a la izquierda indica la posicion actual.
- Con el selector **Orden de ventanas** de la barra de herramientas de la
  pestana Unidades, sin abrir la lista. Asi puedes ver como se reacomodan las
  ventanas en el momento.

Al cambiar el orden, las ventanas que ya estan abiertas se **reacomodan al
instante**; no hace falta volver a pulsar Ejecutar. El orden se guarda por
pestaña y se aplica tambien al pulsar **Ejecutar (abrir ventanas)**.

Tambien puedes marcar y desmarcar unidades directamente con la casilla de la
columna **Sel** en la pestana Unidades.

### Ordenar la tabla de unidades

Haz clic en la cabecera de **Eco**, **Placa**, **Estado**, **Ultimo**,
**km/h**, **Zona** o **km** para ordenar por esa columna. Un segundo clic
invierte el sentido. El indicador de la cabecera (⇅, ▴, ▾) muestra la
columna y direccion activas. El orden natural respeta los numeros: 2 va
antes que 10. La eleccion se recuerda entre sesiones.

### Contornos de las ventanas

Cada vez que una regla genera una alerta, la ventana de esa unidad se resalta
con un contorno del color de la severidad. Al recargar la pagina, el script
vuelve a detectar las ventanas de unidad que ya estan abiertas y **re marca su
contorno**: usa el color de la ultima alerta de la unidad (de las ultimas 24
horas) o, si no hay alerta reciente, rojo si esta sin senal y ambar si esta
detenida. Las unidades silenciadas no se resaltan.

Puedes desactivarlo o cambiar la antiguedad de los contornos en Ajustes,
pestana **Visual**.

## Reglas de alerta

Cada regla se activa o desactiva y tiene sus umbrales en Ajustes. Por defecto:

| Regla | Que detecta | Umbral por defecto |
| --- | --- | --- |
| Sin senal | La unidad deja de reportar | 5 min |
| Reconecto | La unidad vuelve a reportar | automatico |
| GPS perdido en marcha | Pierde senal mientras iba en movimiento | 15 min |
| Detenido | Lleva parada fuera de una base | 30 min |
| Zona no prevista | Permanece en una geocerca no esperada | 20 min |
| Geocercas | Entra o sale de cualquier geocerca | inmediato |
| Destino | Llega al destino o inicia el regreso | progreso >= 95% o a menos de 400 m |
| Desconexion | Sigue sin senal demasiado tiempo | 25 min |
| Velocidad | Supera el limite (global o por unidad) | 110 km/h |
| Desvio de ruta | Se aleja del trazado de la ruta | 250 m durante 5 min |
| Giro en U | Toma rumbo opuesto al de la ruta | 130 grados durante 3 min |
| Retorno / viaje cancelado | Retrocede o vuelve al origen | 25 % de retroceso o 400 m del origen |

Notas:

- Los umbrales de tipo "mayor a" indican cuanto tiempo debe sostenerse la
  situacion antes de avisar.
- Las zonas tipo base (patio, cedis, taller, etc.) no generan aviso de detenido.
- Hay un **cooldown** por unidad y regla para no repetir la misma alerta
  demasiado seguido (45 min por defecto).
- Puedes limitar los avisos a un **horario** (por ejemplo 06:00 a 23:00).
  Tambien admite rangos que cruzan medianoche, como 22:00 a 06:00.

## Notificaciones

- **Tarjetas (toasts)**: aparecen arriba a la derecha. Cada una se puede cerrar.
- **Voz**: lee el aviso en voz alta. Puedes elegir el idioma de voz en Ajustes.
- **Pitido**: sonido para alertas altas y criticas. Su volumen es configurable.
- **Notificacion del navegador**: aviso del sistema. La primera vez el
  navegador pide permiso.
- **Severidad minima**: puedes hacer que solo las alertas de cierta gravedad
  generen tarjeta/voz/pitido.
- **No molestar**: pausa voz, pitido y tarjetas durante 30 minutos. El boton
  (campana tachada) esta en la cabecera del panel; el estado se refleja en el
  punto de la barra.

## Rutas con OpenStreetMap

El modulo de rutas usa servicios publicos de OpenStreetMap: Nominatim para
convertir direcciones en coordenadas, OSRM para calcular la ruta de conduccion
y, opcionalmente, datos de Overpass para calcular con el algoritmo A*.

### Planear una ruta

1. Ve a la pestana **Unidades**.
2. Haz clic derecho sobre una unidad y elige **Planear ruta (OSRM)** o
   **Planear ruta (A*)**.
3. Escribe el destino como un lugar o direccion, o como coordenadas `lat,lon`.
4. El origen es la posicion actual de la unidad.

### Trazado automatico al asignar destino

Hay un check en **Ajustes > Rutas** llamado **Trazar ruta automaticamente
al asignar un destino** que viene **desactivado por defecto**. Al
activarlo, cuando una unidad vigilada tiene un destino en la lista,
Rondo hace tres cosas automaticamente con sus algoritmos:

- **Punto de partida**: detecta la ultima parada larga del viaje en
  curso (mas de `partidaHoras` en el historial, configurable) y la usa
  como origen de la ruta. Se aplica el algoritmo `detectarPuntoPartida`
  con DBSCAN sobre los puntos de baja velocidad.
- **Destino**: traza la ruta desde el punto de partida hacia el destino
  guardado (`eco=destino` en la lista vigilada). Si es un texto, se
  geocodifica con Nominatim; si son coordenadas, se usan directamente.
- **Regreso**: detecta cuando la unidad vuelve al punto de partida tras
  haber llegado al destino, ya sea por la misma ruta o por un camino
  alterno, y lo refleja en la columna **Ruta** y en el analisis de viaje.

Comportamiento:

- Cuando anades una unidad con `eco=destino` en la lista, se calcula al
  instante la ruta de punto de partida a destino.
- Si cambias el destino en la lista, se recalcula (con un pequeno debounce
  para no lanzar peticiones en cada pulsacion).
- Al iniciar el script, se traza cualquier ruta pendiente.
- Si el destino no se puede geocodificar, aparece un aviso y la unidad
  queda con la marca "trazando..." en la columna Ruta hasta que se
  corrija.
- El modo por defecto es **OSRM** (rapido). Puedes cambiar a **A* sobre
  OSM** en Ajustes > Rutas si necesitas rutas peatonales o mas detalle
  en grafos locales (experimental, requiere activar Overpass).

### Seguimiento

En la pestana **Rutas** veras por unidad:

- El estado: EN RUTA, DESVIADO, LLEGO o SIN POSICION.
- El progreso (0 a 100 %), la distancia al trazado y el ETA calculado a
  partir de la velocidad actual (con minimo prudente de 50 km/h cuando
  la unidad esta parada).
- Botones para recalcular, exportar la ruta a GeoJSON y exportar la traza.

En la columna **Ruta** de la pestana Unidades encontraras ademas una
pildora con el mismo estado y una mini-barra de progreso: util para ver
de un vistazo el avance de toda la flota sin abrir la pestana Rutas.

### Modo caravana

La pestana **Caravana** (atajo `Alt+6`) sirve para ver de un vistazo
que unidades estan muy cerca de una unidad vigilada "lider". Util para
coordinar convoyes, escoltas o simplemento ver que vehiculos van
juntos por la misma ruta, sean o no parte de tu lista vigilada.

Como funciona:

1. Elige la unidad lider en el selector superior (solo unidades
   vigiladas). Por defecto se elige la primera unidad vigilada que
   tenga una ruta trazada.
2. La tarjeta del lider muestra si tiene ruta, su velocidad, el
   porcentaje de avance y el estado online/offline.
3. Debajo se listan **todas las unidades cercanas** (vigiladas o no),
   ordenadas de mas cerca a mas lejos (los que van detras primero, los
   que van delante al final). Las que no estan vigiladas se marcan
   con la pildora **NO VIGILADA** para que sepas que no las tienes en
   seguimiento.

Reglas de inclusion:

- **En ruta**: la unidad se proyecta sobre la ruta del lider y queda a
  menos de la **tolerancia lateral** del eje (por defecto 300 m,
  configurable en **Ajustes > Rutas > c-caravana-m**). En este caso se
  muestra la distancia firmada sobre la polilinea (delante/detras).
- **Cerca**: la unidad no toca la polilinea pero esta a menos del
  **radio de cercania** del lider (por defecto 2000 m, configurable en
  **c-caravana-cerca**). Se muestra la distancia directa por haversine.
- Tanto las unidades **vigiladas** como las que no estan en tu lista
  vigilada pueden aparecer. Las no vigiladas se distinguen por la
  pildora **NO VIGILADA**.

Pildoras y metricas:

- **EN RUTA**: acompanante proyectado al eje.
- **CERCA**: acompanante por cercania directa, fuera de la ruta.
- **+450 m delante / -300 m detras**: distancia firmada sobre la
  polilinea (positiva = delante, negativa = detras).
- **a 1.2 km**: distancia directa cuando no toca la ruta.
- **45 m del eje**: distancia lateral al eje de la ruta.
- **SENTIDO CONTRARIO**: pildora roja cuando el rumbo de la unidad
  difiere mas de 130 grados del rumbo del segmento donde se proyecta.
  Es la misma regla que la deteccion de giro en U.
- **online / offline** y velocidad actual.

Notas:

- Si el lider no tiene ruta trazada, la pestana solo usa el radio de
  cercania directa (no hay eje sobre el que proyectar).
- Si el lider no reporta posicion (offline o sin GPS), no hay
  referencia para medir distancias y aparece el mensaje de "Ninguna
  unidad vigilada cercana".
- Click en una tarjeta de acompanante abre la ventana de Wialon de esa
  unidad. La tarjeta del lider no es clickable.
- La pestana es de solo lectura: la unidad seleccionada y los
  acompanantes se recalculan en cada repaint periodico. No se guarda
  estado persistente.

### Alertas de ruta

Se activan en Ajustes, pestana **Rutas**:

- **Desvio de ruta**: avisa si se aleja mas de X metros del trazado durante Y
  minutos.
- **Giro en U**: avisa si el rumbo es opuesto al de la ruta de forma sostenida.
- **Retorno / viaje cancelado**: avisa si retrocede respecto a su avance maximo
  o si regresa al origen. Es util para detectar un viaje cancelado.
- **Llegada a destino**: aviso cuando alcanza el destino.

### Trazado

El script va guardando el recorrido de cada unidad en memoria. Puedes exportarlo
como GeoJSON desde el clic derecho o desde la pestana Rutas. Ese archivo se abre
en cualquier visor de mapas.

Los servicios de OpenStreetMap son gratuitos y tienen limites de uso. Si ves
errores de conexion o el codigo 429, espera unos minutos o baja la frecuencia
de sondeo.

## Analisis de viaje (historial)

El script puede leer el historial de posiciones de una unidad y reconstruir su
viaje. Para ello:

1. Clic derecho sobre una unidad en la pestana **Unidades**.
2. Elige **Analizar viaje (historial)**.
3. Mira el resultado en la pestana **Rutas**, en la lista de viajes.

Que detecta:

- **Punto de partida**: el ultimo lugar donde la unidad estuvo parada (menos de
  3 km/h) durante mas de **6 horas** (configurable). Ese lugar se marca como
  inicio del viaje.
- **Trayecto**: el recorrido desde el punto de partida hasta ahora, con la
  distancia total.
- **Salida**: la hora a la que empezo a moverse tras la parada larga.
- **Paradas**: las detenciones de mas de 15 min (configurable) dentro del
  trayecto.
- **Carga**: se estima que cargo si el punto de partida o la primera parada esta
  en una zona de carga (cedis, planta, bodega, patio, bascula, etc.).
- **Destino**: si hay una ruta planificada, cuando se acerco al destino.
- **Regreso**: si, tras llegar, se esta acercando de nuevo al punto de partida.

Al planear una ruta, el **origen** se toma del punto de partida detectado en el
historial (si la opcion esta activada en Ajustes). Si no, se usa la posicion
actual.

Puedes **exportar el viaje a GeoJSON** (trayecto, punto de partida, paradas y
destino) desde el clic derecho o desde el boton de la lista de viajes. Los
parametros del analisis (horas de partida, parada minima y horas de historial)
se ajustan en Ajustes, pestana **Rutas**.

## Limite de velocidad por unidad

Ademas del limite global, cada unidad puede tener su propio limite:

1. Clic derecho sobre la unidad en la pestana Unidades.
2. Elige **Limite de velocidad**.
3. Escribe el valor en km/h, o dejalo vacio para volver al limite global.

En la tabla, si una unidad supera su limite, la velocidad se resalta en rojo y
muestra su limite. La regla de velocidad debe estar activa en Ajustes, pestana
Reglas.

## Filtrar y buscar

En la barra de herramientas del panel:

- **Cuadro de busqueda**: filtra por economico, placa o nombre.
- **Selector de estado**: todas, moviendo, detenidas, sin senal, vigiladas o
  silenciadas.
- Los botones **CSV**, **Bitacora** e **Informe** exportan datos.
- **Solo seleccion**, **Capturar**, **Aplicar**, **Sel. visibles** y
  **Quitar seleccion** controlan la lista de unidades activas.

## Menu contextual (clic derecho)

Sobre una unidad en la pestana Unidades:

- Abrir ventana.
- Silenciar o reactivar avisos de esa unidad.
- Aplicar verificacion.
- Anadir o quitar de la lista vigilada.
- Limite de velocidad.
- Planear ruta (OSRM), planear ruta (A*), exportar ruta GeoJSON, eliminar ruta,
  exportar traza GeoJSON.
- Analizar viaje (historial), exportar viaje GeoJSON.
- Reiniciar odometro.
- Ver en OpenStreetMap, ver en Google Maps.
- Copiar economico, copiar placa, copiar coordenadas.

## Odómetro por unidad

La columna **km** de la lista de unidades muestra la distancia acumulada
desde la primera vez que se vio esa unidad (o desde el último reinicio).
Solo se suma distancia cuando la unidad se mueve a más de 1 km/h y los
saltos GPS anómalos (> 5 km en 1 min) se descartan para no inflarlo.
Persiste entre sesiones en `localStorage`. Reinícialo desde el menú
contextual ("Reiniciar odómetro") cuando hagas un servicio mayor; el panel
te pedirá confirmación.

## Atajos de teclado

| Atajo | Accion |
| --- | --- |
| `Alt` + `1` | Dashboard |
| `Alt` + `2` | Unidades |
| `Alt` + `3` | Avisos |
| `Alt` + `4` | Rutas |
| `Alt` + `5` | Geocercas |
| `Alt` + `6` | Caravana |
| `Alt` + `P` | Mostrar u ocultar el panel |
| `Alt` + `L` | Panel flotante o barra lateral |
| `Alt` + `H` | Plegar la barra de botones |
| `Esc` | Cerrar el dialogo superior (dialogo, menu contextual y luego ventanas) |

## Informes, respaldos y CSV

- **CSV** (Unidades): descarga la lista de unidades con estado, velocidad y zona.
- **Avisos CSV**: descarga el historial de avisos.
- **Informe**: genera un informe del dia en Markdown con alertas por severidad,
  por regla, unidades con mas avisos y unidades sin senal.
- **Exportar** configuracion: en Ajustes, pestana Avanzado, seccion Datos y
  prueba; descarga un JSON con toda tu configuracion, listas, limites y rutas.
- **Importar** configuracion: en la misma seccion; restaura ese JSON.
- **Probar avisos**: en la misma seccion; lanza una alerta de prueba.
- **Perfiles**: en Ajustes, pestana Avanzado, guarda configuraciones con nombre
  y cargalas cuando quieras.
- **Limpiar bitacora**: borra el historial de avisos.
- **Borrar estado** y **Borrar TODO**: reinician datos y configuracion.

## Configuracion paso a paso

Abre Ajustes con el boton de engranaje del panel. Pestanas:

- **General**: frecuencia de refresco, umbral de sin senal, cooldown, monitorear
  todas, abrir al caer, cargar geocercas, geocodificacion y historico.
- **Reglas**: umbrales y activacion de cada regla.
- **Avisos**: voz e idioma, pitido y volumen, notificacion del navegador,
  duracion de tarjetas, severidad minima, horario y editor de la lista.
- **Visual**: tema (oscuro, claro, automatico), densidad, **tamaño de la
  interfaz** (Normal, Grande, Muy grande, Enorme), color de acento y
  mostrar coordenadas. El tamaño de la interfaz agranda el texto y los
  controles de todo el panel, útil si te cuesta ver; se previsualiza al
  elegirlo y se aplica al guardar.
- **Ventanas**: modo del panel, lado y ancho de la barra lateral, ocultar al
  hacer clic fuera, confirmacion al cerrar todas las ventanas, botones de la
  barra, orientacion, verificacion automatica y tamano del panel.
- **Rutas**: servicios de OpenStreetMap, trazado y alertas de ruta.
- **Avanzado**: versiones y busqueda de actualizaciones, perfiles de
  configuracion, limpiar bitacora y resets.

## Actualizaciones

El script comprueba la cabecera `@version` del repositorio al iniciar y cada
30 minutos. Cuando hay una version nueva:

- Aparece un boton verde **Actualizar X.Y.Z** en la barra flotante (visible sin
  abrir el panel) y un indicador en la cabecera del panel. Su titulo indica la
  version disponible.
- Al hacer clic se abre la URL de instalacion de la nueva version en una
  pestana nueva para que Tampermonkey o Violentmonkey muestren el dialogo de
  actualizacion. Si tu copia procede de la rama `dev` (mas nueva que `main`),
  el script tambien revisa esa rama.
- Al volver a esta pestana, la pagina **se recarga sola** para aplicar la
  version nueva. Si prefieres hacerlo a mano, el boton cambia a **Recargar**.
- Si la comprobacion falla (por ejemplo sin conexion o bloqueada por el sitio),
  el icono de la cabecera se muestra en ambar con el motivo; al pulsarlo se
  reintenta.
- Tambien puedes comprobar manualmente desde Ajustes, pestana **Avanzado**,
  con el boton **Buscar actualizaciones**, que muestra la version instalada,
  la version remota detectada y si hay una nueva disponible.

Nota: la deteccion solo vera una version nueva cuando el repositorio tenga una
`@version` mayor que la instalada. Si acabas de preparar cambios pero aun no
los has subido a GitHub, no habra nada que detectar. La cache de GitHub puede
tardar unos minutos en servir la ultima version.

Las tarjetas de avisos (toasts) aparecen en la esquina inferior derecha para
no estorbar la cabecera.

## Preguntas frecuentes

**Aparece un aviso de que no se encontro la API de Wialon.**
Asegurate de estar en AE-Track o Wialon y de que la pagina termino de cargar.
Si tu plataforma usa otro dominio, pide que se agregue a las coincidencias del
script.

**Aparece un aviso de que la sesion no esta iniciada.**
Inicia sesion en Wialon o AE-Track y recarga la pagina.

**No veo unidades.**
Marca unidades en la columna Sel o activa **Monitorear todas** en Ajustes. Si
solo tienes el panel abierto y no hay seleccion, la lista aparece vacia.

**No suenan la voz ni el pitido.**
Los navegadores bloquean el audio hasta que interactuas con la pagina. Haz clic
una vez en cualquier parte y comprueba que Voz y Pitido esten activados. Usa
**Probar avisos** en Ajustes, pestana Avanzado, seccion Datos y prueba.

**No aparecen las notificaciones del navegador.**
Activa la opcion en Ajustes y acepta el permiso del navegador.

**Una ruta no se calcula.**
Revisa que OSRM este activo en Ajustes, pestana Rutas. Para A* ademas hay que
activar Overpass y la distancia no debe superar ~150 km. Los servicios publicos
pueden limitar el uso; espera unos minutos.

**El panel tapa cosas de la plataforma.**
Usa el modo flotante y muevelo, o cambia la barra lateral de lado.

**Quiero empezar de cero.**
Ajustes, pestana Avanzado, **Borrar TODO**. La pagina se recargara.

## Una lista por pestaña

La **lista de unidades**, la seleccion, las unidades silenciadas, los limites de
velocidad, el historial de avisos y la cache de direcciones se guardan **por
pestaña** del navegador. Asi, si tienes dos pestañas abiertas (por ejemplo dos
instancias o dos vistas con datos distintos), cada una mantiene su propia lista
de unidades sin afectar a la otra.

- Los datos de cada pestaña se conservan al recargar esa pestaña.
- La primera vez, cada pestaña hereda la lista que tuvieras guardada antes de
  forma global, para no perderla.
- La configuracion general (tema, acento, reglas, panel, notificaciones) sigue
  siendo comun a todas las pestañas.
- Al cerrar una pestaña se descarta su lista. Para conservarla usa **Exportar
  configuracion** en Ajustes, pestana Avanzado.

## Privacidad y datos

- La configuracion general (tema, acento, reglas, panel, notificaciones) se
  guarda en el almacenamiento local del navegador, bajo claves `hjp.api.*`.
- La lista de unidades y demas datos de trabajo se guardan por pestaña en el
  almacenamiento de sesion del navegador.
- El script no envia datos a servidores propios. Solo consulta servicios
  publicos de OpenStreetMap (Nominatim, OSRM y, si lo activas, Overpass) para
  geocodificar y calcular rutas.
- Al cerrar sesion o borrar los datos del sitio, desaparece la informacion
  guardada. Usa **Exportar configuracion** para conservar un respaldo.

## Creditos

- Proyecto original e idea: **Héctor Ramírez**
  ([HectorRamirez-cpu](https://github.com/HectorRamirez-cpu)).
- Adaptacion, mantenimiento y nuevas funciones: **lerit**.

Los cambios de cada version estan en la carpeta
[`changelogs/`](./changelogs/) del repositorio.
