# Manual de usuario · HJP Wialon

Guia completa para usar el userscript HJP Wialon sobre AE-Track o Wialon.
Para instalar el script revisa el [README](./README.md).

Indice:

- [Que es y que necesitas](#que-es-y-que-necesitas)
- [Primeros pasos](#primeros-pasos)
- [La barra de botones](#la-barra-de-botones)
- [El panel: flotante o barra lateral](#el-panel-flotante-o-barra-lateral)
- [Las cinco pestanas](#las-cinco-pestanas)
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

## Que es y que necesitas

HJP Wialon es una capa de vigilancia que se ejecuta dentro de tu navegador
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

Si es la primera vez, aparece un aviso de bienvenida. Pulsa el boton **?** de la
cabecera para abrir la ayuda rapida en cualquier momento.

## La barra de botones

Es la barra flotante que puedes arrastrar por la pantalla (arrastra desde los
puntos de la izquierda). Doble clic sobre los puntos cambia la orientacion
horizontal o vertical.

- **Automatizar Unidades**: abre la lista de unidades. Desde ahi defines que
  unidades vigilar y lanza la apertura y el acomodo automatico de sus ventanas.
- **Panel API**: muestra u oculta el panel de control.
- **Cerrar Todas**: cierra todas las ventanas de unidades abiertas.
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

- Pulsa el boton de expandir/contraer en la cabecera del panel, o
- Usa **Alt + L**, o
- Ve a Ajustes, pestana **Ventanas**, y elige **Modo** (flotante o barra
  lateral), **Lado** (derecha o izquierda) y **Ancho lateral (px)**.

La barra de botones se mantiene por encima del panel lateral para que siempre
puedas cambiarlo o cerrarlo.

## Las cinco pestanas

En la parte superior del panel:

- **Dashboard**: resumen de la flota. En linea, sin senal, detenidas, en
  movimiento, en zonas y alertas del dia. Incluye una grafica de unidades en
  linea y los avisos recientes.
- **Unidades**: lista de unidades vigiladas con estado, ultimo reporte,
  velocidad, zona y acciones. Clic en una fila para abrir su ventana. La
  campana silencia los avisos de esa unidad.
- **Avisos**: historial de alertas con filtro por severidad (criticas, altas,
  medias, bajas). Cada aviso indica la regla que lo genero y la hora.
- **Rutas**: seguimiento de las rutas planificadas: progreso, distancia al
  trazado, ETA y acciones para recalcular, exportar o eliminar.
- **Geocercas**: cuantas unidades hay dentro de cada geocerca y cuales.

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

Tambien puedes marcar y desmarcar unidades directamente con la casilla de la
columna **Sel** en la pestana Unidades.

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
| Destino | Llega al destino o inicia el regreso | segun ruta/destino |
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
  esta en la cabecera del panel; el estado se refleja en el punto de la barra.

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

### Seguimiento

En la pestana **Rutas** veras por unidad:

- El estado: EN RUTA, DESVIADO, LLEGO o SIN POSICION.
- El progreso (0 a 100 %), la distancia al trazado y el ETA.
- Botones para recalcular, exportar la ruta a GeoJSON y exportar la traza.

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
- Ver en OpenStreetMap, ver en Google Maps.
- Copiar economico, copiar placa, copiar coordenadas.

## Atajos de teclado

| Atajo | Accion |
| --- | --- |
| `Alt` + `1` | Dashboard |
| `Alt` + `2` | Unidades |
| `Alt` + `3` | Avisos |
| `Alt` + `4` | Rutas |
| `Alt` + `5` | Geocercas |
| `Alt` + `P` | Mostrar u ocultar el panel |
| `Alt` + `L` | Panel flotante o barra lateral |
| `Alt` + `H` | Plegar la barra de botones |
| `Esc` | Cerrar ventanas emergentes |

## Informes, respaldos y CSV

- **CSV** (Unidades): descarga la lista de unidades con estado, velocidad y zona.
- **Bitacora** (CSV): descarga el historial de avisos.
- **Informe**: genera un informe del dia en Markdown con alertas por severidad,
  por regla, unidades con mas avisos y unidades sin senal.
- **Exportar configuracion** (cabecera): descarga un JSON con toda tu
  configuracion, listas, limites y rutas.
- **Importar configuracion** (cabecera): restaura ese JSON.
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
- **Visual**: tema (oscuro, claro, automatico), densidad, color de acento y
  mostrar coordenadas.
- **Ventanas**: modo del panel, lado y ancho de la barra lateral, botones de la
  barra, orientacion, verificacion automatica y tamano del panel.
- **Rutas**: servicios de OpenStreetMap, trazado y alertas de ruta.
- **Avanzado**: perfiles de configuracion, limpiar bitacora y resets.

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
una vez en cualquier parte y comprueba que Voz y Pitido esten activados. Usa el
boton de probar avisos de la cabecera.

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

## Privacidad y datos

- Todos los datos (configuracion, listas, limites, rutas y bitacora) se guardan
  en el almacenamiento local de tu navegador, bajo claves `hjp.api.*`.
- El script no envia datos a servidores propios. Solo consulta servicios
  publicos de OpenStreetMap (Nominatim, OSRM y, si lo activas, Overpass) para
  geocodificar y calcular rutas.
- Al cerrar sesion o borrar los datos del sitio, desaparece la informacion
  guardada. Usa **Exportar configuracion** para conservar un respaldo.
