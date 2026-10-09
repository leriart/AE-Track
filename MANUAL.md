# Manual de usuario · Rondo

Guia completa para usar el userscript Rondo sobre AE-Track o Wialon.
Para instalar el script revisa el [README](./README.md).

Indice:

- [Que es y que necesitas](#que-es-y-que-necesitas)
- [Primeros pasos](#primeros-pasos)
- [La barra de botones](#la-barra-de-botones)
- [El panel: barra lateral](#el-panel-barra-lateral)
- [Las ocho pestanas](#las-ocho-pestanas)
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
- **Panel**: muestra u oculta la barra lateral de control.
- **Cerrar Todas**: cierra todas las ventanas de unidades abiertas. Para evitar
  cierres accidentales, el primer clic arma el boton (se pone rojo y dice
  "Confirmar") y el segundo clic cierra; si no confirmas en 4 segundos se
  desarma. Se puede desactivar en Ajustes, pestana Ventanas.
- **Plegar**: oculta los botones y deja solo la barra; util si estorba.
- El punto de color indica el estado general: verde normal, ambar atencion,
  rojo alertas criticas recientes, gris con borde punteado si esta activo
  **No molestar**.

La barra se puede arrastrar por la pantalla (desde el asa) y no se sale de la
ventana. Con **doble clic** en el asa cambias su orientacion.

## El panel: barra lateral

Rondo vive como **barra lateral** a pantalla completa, fija al lado derecho o
izquierdo de la ventana, ideal para dejar la vigilancia siempre visible
mientras trabajas. Ya no existe el modo flotante: el panel siempre ocupa el
alto completo y se ajusta en ancho.

Para ajustar la barra ve a Ajustes, pestana **Ventanas**, y elige **Lado**
(derecha o izquierda) y **Ancho de la barra (px)**.

Para mostrar u ocultar la barra usa el boton **Panel** de la barra superior, el
icono de campana con tachado del menu **No molestar**, o el atajo **Alt + P**
(tambien **Alt + L**). Al ocultarla queda una pequena pestana vertical en el
borde (el **rail**) que la trae de vuelta con un clic y una animacion suave.

El boton **Ocultar** (junto a **Automatizar**, arriba de la barra lateral) ya no
oculta la barra: **oculta o vuelve a mostrar las ventanas de unidades abiertas**
sin cerrarlas. Mientras estan ocultas, el boton dice **Mostrar** y las ventanas
nuevas que se abran se ocultan solas.

A su lado, los botones **+** y **-** **agrandan o encogen** todas las ventanas
de unidades abiertas en pasos, reubicandolas si hiciera falta para que no se
salgan de la pantalla.

Ademas, **al hacer clic fuera del panel** la barra se oculta automaticamente y
deja el rail visible. Puedes desactivar este comportamiento en Ajustes, pestana
**Ventanas** ("Ocultar la barra lateral al hacer clic fuera").

La barra **recuerda como la dejaste**: el lado, el ancho y si estaba abierta o
cerrada. Al recargar la pagina se restaura en ese estado.

## Las ocho pestanas

En la parte superior del panel:

- **Dashboard**: resumen general de la flota. **Nueve tarjetas KPI** (en línea,
  sin señal, detenidas, en movimiento, en zonas, avisos de hoy, en ruta, exceso
  de velocidad y silenciadas). Son **clicables**: abren la pestaña Unidades
  filtrada por ese estado, o Avisos / Rutas / Zonas. Incluye una fila de
  **accesos rápidos** (Unidades, Avisos, Rutas, Zonas), la **barra de
  distribución** de la flota (en movimiento / detenidas / sin señal), la
  **gráfica de tendencia** de unidades en línea y sin señal, una lista de
  **"Requieren atención"** con las 5 unidades más urgentes (sin señal, exceso,
  desviadas o detenidas) que abren su ventana al pulsarlas, un **ranking de
  unidades con más avisos hoy** (clic para filtrar Avisos por esa unidad) y los
  avisos recientes.
- **Unidades**: lista de **tarjetas** de las unidades vigiladas, con estado,
  economico, placa, velocidad, ultimo reporte, zona y ruta. Cada tarjeta tiene
  **botones rapidos** (abrir ventana, paradas/ruta, ver en mapa, vigilar y
  silenciar) y clic en la tarjeta para abrir su ventana; la campana silencia los
  avisos de esa unidad. La lista se actualiza **sin parpadeo** (solo se
  redibuja la unidad que cambia). El estado se muestra como **pildora de color**
  (verde en linea, ambar detenida, rojo sin senal) y hay una barra **Ordenar**
  (estado, eco, placa, velocidad, zona, odometro o ruta) con boton para
  invertir la direccion.
- **Avisos**: historial de alertas con filtro por severidad (criticas, altas,
  medias, bajas). Cada aviso indica la regla que lo genero y la hora.
- **Rutas**: seguimiento de las rutas planificadas: progreso, distancia al
  trazado, ETA y acciones para recalcular, exportar o eliminar.
- **Zonas**: fusiona las **geocercas de la plataforma**, las **dibujadas en
  Rondo** y las **zonas de riesgo**. En el lado de **Geocercas** hay KPIs (total, con unidades, base,
  carga), buscador, orden (nombre/unidades/area), filtro por rol, area y centro
  por zona, boton **Recargar** y exportacion a **CSV / GeoJSON**; desde cada
  tarjeta puedes **usar la geocerca como parada** de una unidad o copiar su
  nombre y centro. El boton **Nueva** abre un editor con mapa para **dibujar
  una geocerca dentro de Rondo** (no esta en la plataforma, se marca APP y se
  guarda en la sesion; se puede importar/exportar). Debajo de los KPIs esta la
  franja **Alerta de geocercas**: cada geocerca se vigila por separado desde la **campana** de
  su tarjeta (a quien, gravedad y si dispara al pasar, al detenerse o al
  detenerse con el motor apagado), con su barra lateral, su pastilla de
  disparador y una pastilla de resumen con acciones en cascada. Ver
  [Alerta de geocercas](#alerta-de-geocercas) y las dibujadas en Rondo en
  [Geocercas de la app](#geocercas-de-la-app). El lado de **Riesgo**
  mantiene la dona con la distribucion
  por nivel, el histograma de scores, KPIs clicables Total/Alto/Medio/Bajo,
  busqueda libre, chips de nivel, 6 criterios de orden, vista agrupada o plana,
  drag-and-drop de CSV/JSON y exportacion a CSV / GeoJSON / portapapeles. Ver
  [Zonas de riesgo](#zonas-de-riesgo).
- **Caravana**: unidades (vigiladas o no) que acompanian a una unidad
  "lider" en la misma ruta (proyeccion al eje) o dentro del radio de
  cercania. Muestra distancia firmada (+450 m delante / -300 m detras), modo
  "cerca" cuando no toca la ruta, sentido contrario y velocidad. Ver
  [Modo caravana](#modo-caravana).
- **Replay**: reproduce el recorrido de una unidad en un dia o **rango de
  horas**, con buscador de unidades, mini-mapa, perfil de velocidad, resumen y
  eventos. Ver [Reproducir el recorrido (Replay)](#reproducir-el-recorrido-replay).
- **Chat IA**: asistente conversacional. Solo aparece si la IA esta
  habilitada con una API key en Ajustes > IA. Sirve tanto para consultar
  el estado de la flota como para resolver dudas del propio Rondo. Ver
  [Chat con la IA](#chat-con-la-ia).

## Vigilar unidades, destinos y rutas (menu unificado)

Pulsa **Automatizar Unidades** en la barra (o **Unidades y rutas** en la barra
de herramientas de la pestana Unidades). Se abre el menu **Unidades y rutas**,
que reune todo en una sola pantalla. El campo **Buscar unidad o destino** filtra
la lista por economico, placa o destino, y el contador muestra cuantas quedan
visibles ("3 de 12"):

- **Pegar varias unidades** a la vez, una por linea, con el formato `eco`,
  `eco=destino` o `eco=A | B | C`. Puedes indicar el tipo con los prefijos
  `geo:` (geocerca), `mun:` (municipio) y `coord:` (coordenadas). Ejemplos:
  ```
  4381
  4132=Monterrey
  4201=geo:CEDIS Norte | mun:Saltillo | coord:25.68,-100.31
  ```
- **Anadir** una unidad por su economico (boton **Anadir**).
- **Anadir con paradas**: agrega la unidad y abre el editor de destinos.
- Cada fila muestra un **resumen de sus paradas** en etiquetas (`geo:…`,
  `mun:…`, `+N`, `mejor ruta`) y el boton **Paradas** para editarlas.
- Quitar unidades con la x, o **Vaciar lista**.
- **Ejecutar (abrir ventanas)** abre y acomoda las ventanas de las unidades.

### Editor de destinos y rutas multipunto

El editor (boton **Paradas**, o clic derecho &gt; **Destinos y paradas
(multipunto)…**) permite construir la ruta de una unidad:

- **Modo**: **Secuencial** (en el orden indicado) o **Mejor ruta** (reordena
  por cercania y cierra el circuito en el origen).
- **Motor**: OSRM o A* sobre OSM.
- **Regresar al origen**: cierra el circuito.
- Anade paradas con el buscador: **geocercas**, **municipios** (OpenStreetMap)
  o lugares; escribe `lat,lon` para una coordenada. Mientras escribes aparecen
  **sugerencias** con su tipo.
- Reordena con las flechas, **arrastrando** el asa (⠿) de cada parada o con los
  botones subir/bajar. **Fija** una parada para conservar su posicion o quitala
  con la x. **Vaciar paradas** las borra todas.
- La ventana del editor es **amplia** y se **ajusta al contenido**: crece con
  las paradas hasta el alto de la pantalla y, si hay mas, la lista hace scroll;
  nunca se sale de la pantalla. Ademas se puede **mover** (arrastra el
  encabezado) y **redimensionar** (esquina inferior derecha), y recuerda su
  posicion y tamano durante la sesion.
- En el buscador, usa las **flechas arriba/abajo** para recorrer las sugerencias
  y **Enter** para elegir la resaltada; si no hay ninguna resaltada, Enter anade
  el texto como lugar. **Esc** cierra el desplegable.
- **Guardar y trazar** calcula la ruta y la sigue en la pestana Rutas.

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
| Geocercas | Entra o sale de cualquier geocerca | confirmado 15 s (evita parpadeo en el borde) |
| Destino | Llega al destino o inicia el regreso | progreso >= 95% o a menos de 400 m |
| Llegada a parada | Alcanza una parada intermedia de una ruta multipunto | acumulado de la parada |
| Regreso a base | Completa un circuito (todas las paradas + vuelta al origen) | circuito del plan |
| Desconexion | Sigue sin senal demasiado tiempo | 25 min |
| Velocidad | Supera el limite (global o por unidad) | 110 km/h |
| Exceso sostenido | Mantiene la velocidad por encima del umbral durante N min | 90 km/h · 5 min |
| Desvio de ruta | Se aleja del trazado de la ruta | 250 m durante 5 min |
| Giro en U | Toma rumbo opuesto al de la ruta | 130 grados durante 3 min |
| Retorno / viaje cancelado | Retrocede o vuelve al origen | 25 % de retroceso o 400 m del origen |
| Perdio senal en zona de riesgo | Transicion online -> offline y ultima posicion valida cae dentro de una zona de riesgo cargada | depende de los parametros de la zona (radio y score) |
| Aproximacion a zona de riesgo | Una unidad en movimiento se acerca a una zona de alto score | score >= 4, buffer 500 m (apagada por defecto) |
| Detenida en geocerca | Lleva parada dentro de una geocerca | 5 min (una sola vez por episodio) |
| Alerta de geocercas | Pasa, se detiene o apaga el motor dentro de una geocerca vigilada | por geocerca, desde su campana (pestana Zonas > Geocercas) |

Notas:

- Los umbrales de tipo "mayor a" indican cuanto tiempo debe sostenerse la
  situacion antes de avisar.
- Las zonas tipo base (patio, cedis, taller, etc.) no generan aviso de detenido.
- Hay un **cooldown** por unidad y regla para no repetir la misma alerta
  demasiado seguido (45 min por defecto).
- Puedes limitar los avisos a un **horario** (por ejemplo 06:00 a 23:00).
  Tambien admite rangos que cruzan medianoche, como 22:00 a 06:00.

### Zonas de riesgo

La regla *Perdio senal en zona de riesgo* convierte un evento
ordinario (sin senal) en un evento critico si la ultima posicion
conocida de la unidad cae dentro de un buffer de zona de alto riesgo.
Su proposito es hacer ruido cuando un vehiculo desaparece justo donde
mas probable que sea victima de un delito: robos a transporte, asalto,
etc.

**Como se alimentan las zonas:** Rondo **no incluye ningun dataset**
en este repo. Vos decidis donde vive esa informacion y la ruta es
configurable desde el panel. Hay tres formas:

1. **URL remota** (CSV o JSON). Pegala en Ajustes > Reglas > "Zonas de
   riesgo" > "URL del CSV / JSON". Rondo la consulta al arrancar y cada
   vez que pulses **Recargar** en la pestana Riesgo. Si la URL falla,
   la regla se desactiva silenciosamente.
2. **Archivo local**. Usa el boton **Importar archivo** de la pestana
   Riesgo o de Ajustes. Acepta CSV, TSV, JSON o TXT. La informacion
   vive solo en memoria hasta que cierres el navegador.
3. **Pegar el contenido** como URL `data:` (pequenos datasets que
   caben en una sola linea). Util para pruebas.

**Que pasa si no hay dataset cargado?** La regla existe pero nunca
dispara. Es la opcion mas segura si no queres configurar nada: la
alerta generica de "sin senal" sigue funcionando como siempre.

**Formato JSON esperado:**

```json
{
  "version": 1,
  "fuente": "tu proveedor o fuente",
  "items": [
    {
      "id": "identificador-estable",
      "estado": "CDMX",
      "municipio": "Cuauhtemoc",
      "centro": [19.4326, -99.1332],
      "radio_m": 1500,
      "score": 78,
      "delitos": { "robo_vehiculo": 5, "asalto": 12 }
    }
  ]
}
```

Tambien acepta GeoJSON FeatureCollection (`{ type: "FeatureCollection",
features: [...] }`) y un array directo en la raiz.

**Formato CSV esperado (autodetectado):**

```
id,estado,municipio,lat,lon,radio_m,score,delito,conteo
mx-01,CDMX,Cuauhtemoc,19.4326,-99.1332,1500,78,robo_vehiculo,5
mx-01,CDMX,Cuauhtemoc,19.4326,-99.1332,1500,78,asalto,12
```

Las filas con la misma (lat, lon, radio, score) se agrupan y suman sus
delitos. Si no se incluye columna `radio_m`, Rondo lo estima segun el
score: 4.5 km (>= 70), 2.2 km (>= 50), 1.4 km (>= 30), 0.5 km (resto).
Las columnas reconocibles por sinonimos: lat/latitud, lon/lng/long,
score/severidad/riesgo, radio/buffer/distancia, delito/tipo/categoria,
conteo/count/casos/incidentes.

**Parametros configurables (Ajustes > Reglas > Zonas de riesgo):**

| Parametro | Que hace | Por defecto |
| --- | --- | --- |
| URL del CSV / JSON | Direccion a consultar al arrancar | vacio |
| Formato | Auto / CSV / JSON | auto |
| Score minimo | Ignora zonas con score menor a este valor | 1 |
| Multiplicador de radio | Escala el radio declarado en cada zona (0.1x a 5x) | 1 |
| Regla *Perdio senal en zona de riesgo* | Toggles globales de la regla | activado |

**La alerta en pantalla:**

```
PERDIO SENAL EN ZONA DE RIESGO \u00b7 <unidad>
Ultima posicion en <municipio>, <estado> (score N/100). Sin reporte hace X min.
```

Se entrega como **critica** (color rojo, sonido de alarma, TTS grave)
y queda registrada en la pestana Avisos como cualquier otra alerta.

### Alerta predictiva (aproximacion a zona de riesgo)

Opcional y apagada por defecto. Cuando una unidad **en movimiento** se
esta **acercando** a una zona de riesgo de alto score, avisa **antes**
de que llegue o pierda senal. Se configura en Ajustes > Reglas:

- **Score minimo para anticipar** (4 por defecto).
- **Buffer de anticipacion** en metros (500 por defecto).
- **Velocidad minima** para considerar que va en marcha (5 km/h).
- **Cooldown** por unidad+zona.
- **Solo de noche** con ventana horaria (22:00 a 05:00 por defecto),
  util porque la mayoria de robos ocurren de madrugada.

### Detenida en geocerca

Opcional (activada por defecto). Cuando una unidad lleva **parada**
dentro de una geocerca al menos N minutos (5 por defecto), avisa una
sola vez por episodio con el texto:

```
DETENIDA EN GEOCERCA · <unidad>
La unidad <eco> se encuentra detenida en la geocerca <nombre> · hace N min
```

Se rearma cuando la unidad se mueve o sale de la geocerca. Ajusta el
minimo en Ajustes > Reglas > "Min detenido para alertar (min)".

### Geocercas de la app

Geocercas que **no estan en la plataforma**: las dibujas tu en Rondo sobre un
mapa de OpenStreetMap, con coordenadas escritas o a mano. Funcionan como las
de la plataforma (cuentan en los KPIs, se pueden usar como parada, admiten su
propia alerta, salen en el informe y la IA las ve), pero se guardan en **esta
pestana** y se distinguen con la etiqueta **APP** en la tarjeta.

Para abrir el editor: boton **Nueva** en la barra de geocercas (o el lapiz de
una tarjeta marcada APP para editarla).

#### Como se dibuja

- **Marco** (poligono): clic en cada esquina; doble clic (o **Cerrar figura**)
  para cerrarlo. Minimo 3 puntos.
- **Círculo**: un clic pone el centro y otro el radio (tambien puedes escribir
  el radio en metros). Al mover el raton se ve el circulo en vivo.
- **Línea** (corredor): clic en cada punto del trazo, doble clic para
  terminar. El ancho en metros se escribe a mano.

En los tres modos el mapa se mueve arrastrando y se acerca con la rueda. Se
puede **escribir el centro** (lat, lon) y pulsar **Ir** para saltar ahi, lo
que es practico si copias las coordenadas de un WhatsApp o de otro sistema.

El panel lateral indica en todo momento cuantos puntos lleva la figura, su
superficie y su perimetro (en el circulo, el radio y la circunferencia). Sobre
el mapa hay una chapa con el modo activo y como se dibuja. **Guardar
geocerca** pide el nombre (si choca con otra geocerca le anade "2"), lo deja
creado y lo pinta en el mapa y en la tarjeta.

#### Previsualizacion en el mapa

Mientras dibujas, el mapa muestra las geocercas que ya existen, cada una con
su color segun de donde venga:

| En el mapa | De donde es |
| --- | --- |
| Trazo ambar relleno | La figura que estas trazando (borrador) |
| Gris discontinuo | Geocercas creadas en Rondo (las tuyas) |
| Azul discontinuo | Geocercas de la plataforma (Wialon / AE-Track) |

Abajo a la izquierda hay una **leyenda** con el numero de cada tipo y tres
botones para filtrar: **Todas**, **App** o **Plataforma**. Sirve para no
tapar el mapa si la instalacion tiene muchas geocercas (se dibujan como
mucho 140 de cada tipo; el resto queda fuera sin que nada falle).

En la lista del editor hay otro selector, **Mias (app) / Plataforma /
Todas**, con el numero de cada grupo. Al elegir *Plataforma* se explica que
esos no se editan aqui: se crean en AE-Track o Wialon.

#### Donde se guardan

Por defecto solo en la **sesion** de esa pestana: al recargar se pierden. Marca
**Recordar en este navegador** para que se guarden tambien en el navegador y
sobrevivan a cerrarlo (en Ajustes > General se ve el interruptor y en el
editor se puede cambiar en cualquier momento).

#### Importar y exportar

- **Exportar**: descarga un `.json` de Rondo (formato propio, con los puntos)
  o un **GeoJSON** abrible en cualquier visor de mapas.
- **Copiar**: pone el mismo JSON en el portapapeles para pegarlo en un chat.
- **Importar**: acepta el JSON de Rondo, un GeoJSON (`Polygon`, `MultiPolygon`,
  `LineString`, `Point` con radio en `radio_m`) o un array de geocercas.

Al importar se abre una ventana con **una casilla por geocerca**: puedes
traer **una sola** de un archivo que trae diez, o marcarlas todas con el
boton *Todas*. Cada fila dice de que tipo es, cuanto mide y si **ya existe una
con ese nombre** (se guardara con otro); los nombres que ya existan se
renombran solos y cada importacion genera ids nuevos, asi que **importar dos
veces el mismo archivo no pisa nada**. Si el archivo trae algo inservible, se
avisa de cuantas se descartaron.

#### De donde viene cada geocerca

El origen se muestra siempre, para que una geocerca dibujada en Rondo no se
confunda con una de la plataforma:

| Etiqueta | Significado |
| --- | --- |
| **APP** (ambar) | Creada en Rondo. Con el tick verde al lado significa que ademas se recuerda al cerrar el navegador |
| **PLAT** (azul) | Geocerca de la plataforma (Wialon / AE-Track), solo lectura desde Rondo |

Aparece en la tarjeta de la lista de geocercas, en cada fila del editor, en
la leyenda del mapa y en las exportaciones: el **CSV** suma las columnas
`origen` y `guardado` (`navegador` o `sesion`) y el **GeoJSON** los campos
`origen` y `guardado`.

### Informe por geocerca

Aparte del reporte general y del de cada unidad (Replay), hay un **informe
por geocerca** que responde dos preguntas: *¿quien cruzo esta geocerca?* y
*¿quien se paro aqui?*. Se abre desde dos sitios:

- el boton **Informe geocerca** de la pestana **Reproducir recorrido** (a la
  derecha de *Paradas CSV*), que al abrirse toma **las fechas del recorrido
  que estas viendo**; y
- el boton de pin de la barra, junto al de Reporte PDF.

Sale en **PDF**, **CSV** o **Markdown**.

#### Que eliges

| Opcion | Valores |
| --- | --- |
| Informe de | **Cruces por unidad** / **Paradas dentro** |
| Geocerca | Cualquiera de las cargadas (las de la plataforma y las de Rondo), o *Todas las geocercas*. Tiene **buscador** y muestra cuantos eventos tiene cada una |
| Periodo | Hoy / 24 h / 7 dias / 15 dias / 30 dias / Todo |
| Rango de dias | Dos fechas (desde – hasta), ambas incluidas |
| Unidades | **Toda la flota** (todas las que Rondo rastrea) o **solo las seleccionadas** (la lista vigilada) |
| Datos | De donde salen los eventos (ver abajo) |
| **Generar reporte** | Los cambios de opciones **no recargan solos**: el informe se calcula al pulsar el boton (y se recalcula solo al abrir, salvo con la fuente *Plataforma*) |

El **rango de dias** escrito a mano manda sobre los atajos: si eliges un
periodo corto se borra el rango, y si inviertes las fechas (desde posterior a
hasta) se corrigen solas. El resumen siempre dice el periodo exacto
("08/10/2026 – hoy").

La ventana incluye un **mapa** con la geocerca marcada y las unidades
encontradas (verde = dentro ahora, naranja = parada, rojo = motor apagado),
una **barra de progreso** mientras reune y agrupa los datos, seis KPIs
(unidades, cruces, entradas, paradas, minutos quietos, paradas con motor
apagado) y una **vista previa** de las primeras 12 unidades. Abajo, la barra
de descarga: **PDF** (reporte listo para imprimir), **CSV** (evento a evento)
y **Markdown**.

Para que sea agil con muchas geocercas, el informe solo comprueba la
geocerca elegida en cada punto (y usa el indice espacial de Rondo cuando
pides *Todas*), en vez de recorrer toda la lista punto por punto. El
historial de la plataforma se pide en paralelo y solo cuando pulsas
**Generar reporte**.

Sobre el alcance de los datos: la fuente **Rastreo** trabaja con la traza de
la sesion (un punto cada vez que la unidad avanza 20 m, con un maximo por
unidad), asi que es la que mejor responde a "quien anduvo por aqui" sin
depender de que las reglas hayan avisado. La fuente **Avisos** solo guarda lo
ocurrido en esta pestana (hasta 300 avisos), asi que un rango de muchos dias
saldra vacio salvo que uses el rastreo, tengas viajes analizados o cargues un
recorrido.

Con **Unidades** eliges si el informe mira **toda la flota** que Rondo rastrea
o solo **las seleccionadas** (la lista vigilada).

#### De donde salen los datos

| Fuente | Que trae | Cuando hay datos |
| --- | --- | --- |
| **Plataforma** (por defecto al elegir geocerca) | Consulta el **historial de toda la flota** en la plataforma (el mismo endpoint que Reproducir recorrido) y saca quien entro, quien salio y quien se paro dentro, aunque no estuviera vigilada ni hubiera avisado. Las peticiones van **en paralelo** (6 a la vez), priorizando las unidades vigiladas y las que reportaron mas reciente, y la barra muestra el avance y cuantos eventos van saliendo | Siempre que la flota reporte en el rango elegido |
| **Rastreo** | Recorre la traza que Rondo ya guarda de cada unidad y saca **todas** las entradas, salidas y paradas dentro de la geocerca, haya avisado o no. Ademas lista quien esta **dentro ahora** | En cuanto hay unidades rastreando (traza activa), sin depender de reglas |
| **Avisos** | Entradas y salidas (regla *Geocercas*), paradas dentro (regla *Detenida en geocerca*) y las de tu alerta de geocercas, con **hora exacta** | Siempre que haya avisos con geocerca en esta sesion |
| **Viajes analizados** | Paradas con duracion y cruces deducidos de la traza | Tras analizar el viaje de esa unidad |
| **Recorrido cargado** | Eventos con hora y paradas con motor y lugar | Con un recorrido cargado en la pestana Replay |

El selector solo muestra las fuentes que tienen datos y pone cuantas lleva
cada una. Si no hay ninguna, avisa de que actives la regla *Geocercas*,
analices un viaje o cargues un recorrido.

#### Que contiene

- **Mapa**: la geocerca dibujada sobre OpenStreetMap con las unidades que
  estuvieron o estan dentro (verde = dentro ahora, naranja = parada, rojo =
  motor apagado) y su leyenda. Si eliges *Todas las geocercas*, entran las
  que tienen datos.
- **Ficha de la geocerca**: tipo, origen, superficie y centro.
- **Dentro de la geocerca ahora**: con el rastreo, la lista de unidades que
  estan dentro en este momento, con su velocidad, si reportan y sus
  coordenadas.
- **Geocerca**: nombre, tipo, origen (plataforma o creada en Rondo),
  superficie y centro.
- **Unidades**: cruces, entradas, salidas, paradas, minutos quieto y, en modo
  paradas, minutos con el motor apagado; mas la primera y la ultima vez.
- **Geocercas**: cuantos cruces y paradas lleva cada una y cuantos cambios
  vio (o cuantas unidades distintas).
- **Detalle de eventos**: hora, tipo, geocerca, unidad, detalle y
  coordenadas (el PDF muestra 200; el CSV los lleva todos).

#### Detalle por unidad

El CSV trae **dos tablas**: la de unidades y la de **eventos uno a uno**
(fecha, evento, geocerca, unidad, minutos, detalle, lat, lon y fuente). Es la
que se analiza para saber quien entro, cuanto tiempo se quedo y con el motor
apagado o no.

Nota: el conteo se apoya en el campo `zona` de cada aviso, asi que es exacto.
Los avisos anteriores a esta version lo sacan del texto del mensaje.

### Alerta de geocercas

Vigilancia **dirigida y por geocerca**: cada geocerca de la plataforma
tiene **su propia alerta**, con su campana en la tarjeta. En lugar de una
configuracion global aplicada a un grupo, eliges geocerca por geocerca a
quien vigilar, con que gravedad y que debe pasar dentro para avisar.

Apagada por defecto (interruptor general en *Ajustes > Reglas*), y sin
geocercas marcadas no ocurre nada aunque el interruptor este encendido.

#### Como configurarla

Pulsa la **campana** de cualquier tarjeta de la lista de geocercas (pestana
**Zonas > Geocercas**). Se abre un menu con:

| Opcion | Valores | Que hace |
| --- | --- | --- |
| Interruptor | Sin vigilar / Vigilada | Enciende o apaga la alerta de **esta** geocerca |
| Unidades | Solo vigiladas / Toda la flota | A quien se le aplica |
| Gravedad | Baja, Media, Alta, Critica | Severidad del aviso (color, voz, pitido y filtro de la pestana Avisos) |
| Dispara cuando | Solo paso / Se detuvo / Motor apagado | Que hecho dentro de la geocerca dispara el aviso |
| Parada (min) | 1 a 240 | Minutos quieta dentro para *Se detuvo* |
| Motor (min) | 1 a 720 | Minutos quieta sin reportar posicion para *Motor apagado* |
| Confirmar (s) | 0 a 600 | Histeresis: segundos que debe sostenerse la entrada |
| Cooldown (s) | 0 a 86400 | Espera entre avisos de la misma unidad en esa geocerca (0 = la global) |

El menu edita en memoria: cambios y **Guardar** aplican, **Cancelar** no toca
nada. Abajo aparece la **vista previa** del aviso tal y como saldria en la
pestana Avisos, para elegir el disparador viendo el texto y no la etiqueta.

#### Indicadores en la pestana

- **Franja resumen** (bajo los KPIs): cuantas geocercas de las cargadas
  estan vigiladas, si hay unidades cumpliendo ahora, una **pastilla por
  geocerca** (punto de color = gravedad, texto = ambito, gravedad y
  disparador, contador = unidades dentro que cumplen) y dos acciones en
  cascada: **Todas** (vigilar todas con los ajustes por defecto) y
  **Ninguna**. Cada pastilla abre el menu de su geocerca.
- **KPI En alerta**: unidades que cumplen ahora mismo alguna de las
  geocercas vigiladas.
- **Tarjeta**: barra lateral del color de la gravedad y pastilla
  `DENTRO` / `PARADA` / `MOTOR` con el disparador elegido.

#### Como funciona

- **Solo paso**: avisa una vez cuando la unidad entra y se mantiene dentro
  el tiempo de *Confirmar*. Para dar la salida se exige estar fuera con un
  margen de 40 m, asi el borde no genera parpadeo.
- **Se detuvo**: avisa una sola vez cuando la unidad lleva *Parada* minutos
  quieta dentro. Si se mueve o sale, se rearma.
- **Motor apagado**: avisa cuando la unidad lleva ese tiempo quieta sin
  reportar posicion dentro. Si la unidad publica un sensor de motor o
  ignicion como campo personalizado se usa ese dato; si no, Rondo lo estima
  por el corte de reporte (dejo de emitir), igual que hace el Replay, y el
  aviso lo indica como *motor apagado estimado*.
- Sin senal no se confirma entrada ni parada (la posicion puede ser vieja);
  el disparador de motor si trabaja con la posicion congelada.
- Al activar la alerta no dispara avisos retroactivos: si la unidad ya
  estaba dentro, Rondo toma esa situacion como punto de partida.
- Cada geocerca avisa **una vez por episodio**. El aviso sale con la regla
  `geoAlerta` y se puede silenciar por unidad como cualquier otro.

El estado en vivo se muestra en la franja y se recalcula en cada refresco.
Si eliges *Toda la flota* en alguna geocerca, Rondo recorre tambien las
unidades que no vigilas (solo para esta regla: no les afecta el resto de
alertas, el odometro ni las trazas).

## Chat con la IA

La pestana **Chat IA** es un asistente conversacional integrado. **Solo
aparece si la IA esta habilitada y con API key** en Ajustes > IA. Si
desactivas la IA, la pestana se oculta.

### Para que sirve

El chat conoce **dos cosas**:

1. **El manual de Rondo**: puede explicarte como usar el sistema, que
   hace cada pestana, como activar una regla, que significa un boton o
   un atajo, etc.
2. **Los datos de la plataforma**: se adjunta automaticamente un
   resumen en vivo en cada mensaje con:
   - **Unidades** en el alcance: economico, placa, estado
     (online/offline), geocerca actual (o fuera de toda geocerca),
     municipio (OpenStreetMap), minutos desde el ultimo reporte, velocidad,
     rumbo, limite de velocidad, odometro, si esta silenciada y su ruta con
     paradas, progreso y siguiente parada.
   - **Conteos y agregados**: en linea, sin senal, en movimiento, detenidas,
     velocidad promedio, cuantas fuera de geocerca, cuantas sin senal **y**
     fuera de geocerca.
   - **Geocercas**: la lista completa (no un recorte), con su tipo y las
     unidades dentro de cada una.
   - **Zonas de riesgo** cargadas: total, por nivel y las de mayor score con
     estado/municipio.
   - **Municipios** conocidos (OSM y derivados de riesgo), con el catalogo de
     nombres.
   - **Viajes** analizados (km, paradas, carga, llegada, regreso).
   - **Alertas de hoy** por severidad y por regla, y los ultimos avisos con su
     detalle, mas las **desconexiones** del dia.
   - **Rutas** activas, con destino, modo (secuencial/mejor ruta) y paradas.
   - **Detalle por unidad**: si tu pregunta menciona un economico (3 a 5
     digitos), Rondo consulta por API sus **campos personalizados** (conductor,
     marca, etc.) y su **historial de las ultimas 24 h** (km, velocidad maxima,
     tiempo en movimiento/detenido, paradas y ultima posicion). Opcionalmente,
     y si lo activas en Ajustes &gt; IA, un **reporte del dia** del servidor.
   - **Configuracion** de umbrales activa, para que pueda explicar y proponer.

Asi puedes preguntar, por ejemplo, "que unidades estan fuera de
geocerca y sin senal" y la IA responde con la lista concreta.

### Monitor de flota (Analizar flota)

Ademas del chat, en la cabecera de la pestana **Avisos** esta el boton
**Analizar flota**. Envia el snapshot completo de la plataforma a la IA y
devuelve:

- un **resumen** del estado general;
- la lista de unidades que **requieren atencion**, ordenadas por prioridad,
  con motivo y accion sugerida;
- **riesgos** detectados (por ejemplo, cerca de una zona de riesgo);
- **recomendaciones** operativas o de ajuste de parametros.

Es la forma mas rapida de obtener una revision tipo monitorista sin revisar
unidad por unidad.

> Si las geocercas no estan cargadas (Ajustes > General > "Cargar
> geocercas"), la IA te lo indicara y no afirmara que una unidad esta
> fuera de geocerca.

### Ejemplos de consultas

Dudas de uso:

- "Como activo la regla de destino?"
- "Que hace el boton Analizar lote?"
- "Para que sirve la zona de riesgo y como la cargo?"
- "Que atajos de teclado hay?"

Estado de la flota:

- "Que unidades estan sin senal ahora y donde fue su ultima posicion?"
- "Que unidades estan fuera de geocerca y detenidas?"
- "Cual es la alerta mas urgente de revisar?"
- "Cuantas unidades estan en movimiento?"

### Controles

- **Toda la flota**: switch en la cabecera del chat. **Off** (por
  defecto) = la IA ve solo las unidades que vigilas. **On** = la IA ve
  todas las unidades que reportan en la plataforma.
- **Limpiar**: borra la conversacion actual (pide confirmacion).
- **Enter** envia el mensaje; **Shift + Enter** inserta un salto de
  linea. La caja de texto crece sola hasta 140 px.
- La conversacion se guarda **por pestaña** (sessionStorage): al cerrar
  la pestaña se descarta. Se conservan los ultimos 50 mensajes.

### Notas

- El chat respeta el **limite diario de llamadas** de Ajustes > IA.
- Las ventanas de **Analizar lote** y **Analizar flota** se acotan al alto de la
  pantalla y hacen scroll si el resultado es largo, para que no se desborden.
- Cada turno envia los ultimos 20 mensajes del historial mas el contexto.
- La IA **no inventa** datos que no esten en el contexto: si preguntas
  por algo que no tiene (por ejemplo, el historial de un dia anterior),
  te lo dira y te indicara que reporte o accion lo daria.
- Atajo: **Alt + 7** abre la pestana de Chat IA (si la IA esta activa).

## Notificaciones

- **Tarjetas (toasts)**: aparecen arriba a la derecha. Cada una se puede cerrar.
- **Voz**: lee el aviso en voz alta. En Ajustes puedes elegir el **motor**
  (Navegador sin internet, **StreamElements** online, o **Google** online),
  el **idioma** y la **voz** concreta entre las disponibles. Las voces online
  (StreamElements) son gratis, no requieren clave y ofrecen decenas de voces
  en varios idiomas.
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

### Rutas multipunto (varias paradas)

Cada unidad puede tener una ruta con **varias paradas**. Abre el editor con:

- el boton **Paradas** de la fila en el menu **Unidades y rutas**;
- el boton **Editar paradas** en la pestana **Rutas**;
- el clic derecho sobre la unidad &gt; **Destinos y paradas (multipunto)…**.

En el editor puedes anadir paradas de varios tipos:

- **Geocercas** de la plataforma;
- **Municipios** (se buscan en OpenStreetMap);
- **Lugares o direcciones** (Nominatim);
- **Coordenadas** `lat,lon`.

Mientras escribes aparecen **sugerencias**: primero tus **geocercas** y
municipios guardados, y despues **resultados en linea de OpenStreetMap**
(municipios, ciudades y direcciones). La busqueda es **difusa** (sin acentos y
tolera errores). Enter anade el texto como lugar.

Cada plan tiene un **modo**:

- **Secuencial**: las paradas se visitan en el orden indicado. Puedes
  reordenarlas con las flechas.
- **Mejor ruta**: Rondo reordena las paradas por cercania (vecino mas
  cercano + 2-opt) y **cierra el recorrido volviendo al punto de partida**.
  Usa **Fijar** en una parada para que conserve su posicion en el orden.

Pulsa **Guardar y trazar** para calcular la ruta. La pestana **Rutas** muestra
el progreso, la **parada actual/total**, la **siguiente parada** y la ETA.
Durante el recorrido Rondo avisa de:

- **LLEGO A PARADA n** al alcanzar una parada intermedia;
- **LLEGO A DESTINO** al alcanzar la ultima;
- **REGRESO A BASE** cuando se completa un circuito.

El formato de texto rapido tambien admite varias paradas separadas por `|`,
`;` o saltos de linea, con los prefijos `geo:` (geocerca), `mun:` (municipio)
y `coord:` (coordenadas). Por ejemplo:

```
eco=Monterrey | geo:CEDIS Norte | mun:Saltillo
```

### Ver la ruta en el mapa

En la pestana **Rutas** (y en el clic derecho de una unidad) hay acciones para
ver la ruta:

- **Mini-mapa**: abre una ventana con un **mini-mapa propio de Rondo** (tiles
  de OpenStreetMap) con el trazo y los marcadores (origen, paradas y destino).
  Arrastra para moverlo y usa la rueda para acercar. No depende del mapa de la
  plataforma, por lo que funciona siempre. Ademas, cada tarjeta de la pestana
  **Rutas** incluye su propio **mini-mapa del trazo** (resaltado) con la posicion
  actual y el tramo ya recorrido.
- **Google Maps**: abre la ruta en Google Maps con las paradas como *waypoints*
  (alternativa garantizada).
- **OpenStreetMap**: abre el trayecto origen-destino en OSM.

El dibujo es **solo lectura**: no crea ni modifica nada en Wialon.

> **Como se decide que una unidad esta "desviada":** se mide la **distancia
> perpendicular** de la unidad al trazado planificado (proyeccion sobre la
> polilinea). La tarjeta marca **DESVIADO** cuando esa distancia supera
> `desvioM` (250 m por defecto). La **alerta** de desvio requiere que se
> mantenga `desvioMin` (5 min). Si la unidad sigue dentro de un municipio por el
> que pasa la ruta, se tolera hasta `desvioMunicipioM` (3000 m). Ajustable en
> Ajustes &gt; Rutas.

### Reproducir el recorrido (Replay)

La pestana **Replay** reproduce el recorrido de una unidad:

1. **Busca la unidad** por economico, placa o nombre (tambien puedes escribir un
   economico y pulsar Enter) y elige el **dia** y el **rango de horas**
   (desde/hasta). Los botones **Hoy**, **Ayer**, **Turno dia** y **Turno noche**
   lo rellenan de un clic. Pulsa **Cargar**.
2. **Cargar** muestra su progreso ("Cargando...") y, al terminar, la unidad,
   el rango, los km y las paradas justo debajo del boton (que pasa a
   **Recargar**). Con **Play/Pausa** (icono cambia entre ▶ y ⏸), **Reiniciar**
   (vuelve al inicio) y la velocidad (**1 min/s** a **1 h/s**) se reproduce el
   tramo; la barra inferior y el **perfil de velocidad** (haz clic en la grafica)
   permiten saltar a un momento concreto. Los controles estan apagados hasta
   que cargas un recorrido; con la pestana Replay activa, la **barra
   espaciadora** alterna Play/Pausa.
3. El **mini-mapa** (tiles de OpenStreetMap) muestra el trazo completo, el tramo
   ya recorrido y la posicion actual. Arrastra para moverlo, rueda para acercar
   y **Centrar** para volver a encuadrarlo.
4. **Paradas** (hora, duracion y **lugar**) y **Eventos** (entradas/salidas de
   geocerca, excesos de velocidad y desvios). El lugar de cada parada se
   resuelve con **OpenStreetMap**: si se detuvo en un OXXO, una tienda, una
   gasolinera o un restaurante, lo menciona (y si no, la direccion o el
   municipio). Con **Overpass** activado en Ajustes se afinan mas los nombres de
   comercios. Haz clic en una parada o en un evento para saltar a ese momento.
5. Arriba veras un **resumen** (rango de horas, distancia, duracion, paradas,
   tiempo en movimiento y detenido, velocidad maxima y excesos) y, abajo, la
   tarjeta **Opciones del reporte** con casillas para elegir que incluir en el
   PDF: **Mapa del recorrido**, **Resumen (KPIs)**, **Paradas**, **Eventos**,
   **Puntos del recorrido**, **Coordenadas** y **Solo paradas con motor
   apagado**. Cada opcion se recuerda entre sesiones.
6. Junto a **GeoJSON** y **Paradas CSV**, el boton **Reporte PDF** genera un PDF
   del recorrido con las secciones marcadas (mapa con los puntos marcados,
   resumen, paradas con su lugar, eventos y puntos del recorrido). Si no marcas
   ninguna seccion, el PDF avisa de que no hay nada que incluir.

Es solo lectura (historial de la plataforma). Atajo: **Alt + 8**. Tambien puedes
abrirla desde el **clic derecho** sobre una unidad, en **Reproducir el dia
(replay)**.

### Carga rapida de rutas (embarque)

Para asignar de golpe la ruta de un embarque a una unidad:

1. En la pestana **Unidades**, pulsa **Carga rapida** (barra de herramientas).
2. Elige la **unidad** y el **modo** (mejor ruta / secuencial) y el **motor**.
3. Pega la lista de **clientes** (una por linea o la tabla completa copiada de
   Excel: detecta la columna **Cliente**), o **arrastra el archivo**
   `.xlsx` / `.csv` / `.tsv` / `.txt`.
4. Pulsa **Emparejar clientes**: Rondo compara cada cliente con tus
   **geocercas** usando **busqueda difusa** (tolera acentos y errores de
   escritura) y propone la mejor coincidencia con su nivel de confianza
   (alta / media / baja / sin).
5. Revisa: puedes **desmarcar** clientes o **cambiar** la geocerca con el
   desplegable.
6. **Asignar y trazar** crea la ruta multipunto de esa unidad y la calcula; o
   **Solo asignar** si la trazas despues.

Notas:

- Es **solo lectura**: no crea ni modifica nada en Wialon; unicamente arma el
  plan de ruta local de Rondo.
- Si un cliente no tiene geocerca, puedes dejar la parada sin asignar (se
  omite) o elegir otra a mano.
- El `.xlsx` se lee en el navegador sin subirlo a ningun servidor.

### Municipios y tolerancia de desvio

Rondo consulta los municipios en **OpenStreetMap** (Nominatim) y guarda su
poligono (o su boundingbox) para reutilizarlo sin conexion. Un municipio puede
ser una parada mas de la ruta.

Ademas, el municipio funciona como **rango de tolerancia**: mientras una
unidad siga dentro de un municipio por el que pasa su ruta, un alejamiento del
eje **no se marca como desvio** hasta `desvioMunicipioM` metros (3000 por
defecto). Ajustalo en **Ajustes &gt; Rutas**, en **"No marcar desvio dentro
del municipio"** y **"Tolerancia dentro del municipio (m)"**.

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
  **autodetecta el tipo** en este orden: **municipio/ciudad** (OpenStreetMap),
  **geocerca** (por nombre, busqueda difusa) y, si no, **lugar/direccion**
  (Nominatim). Si son coordenadas, se usan directamente.
- **Regreso**: detecta cuando la unidad vuelve al punto de partida tras
  haber llegado al destino, ya sea por la misma ruta o por un camino
  alterno, y lo refleja en la columna **Ruta** y en el analisis de viaje.

Comportamiento:

- Cuando anades una unidad con `eco=destino` en la lista, se calcula al
  instante la ruta de punto de partida a destino.
- Si cambias el destino en la lista, se recalcula (con un pequeno debounce
  para no lanzar peticiones en cada pulsacion).
- Al iniciar el script, se traza cualquier ruta pendiente.
- **Reintentos**: si una ruta no se puede trazar (aun no hay posicion, el
  destino no se resolvio, etc.) Rondo **reintenta automaticamente 2 veces**
  (la segunda ~45 s despues) y luego se detiene. En la pestana **Rutas** las
  unidades con destino pero sin trazar aparecen como **SIN TRAZAR**, con un
  boton **Trazar ahora** por unidad y un boton **Trazar pendientes** en la
  cabecera para reintentar sin limite cuando tu quieras.
- Si el destino no se puede resolver, aparece un aviso y la unidad
  queda marcada como pendiente hasta que se corrija.
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
- **Destinos y paradas (multipunto)…**, exportar ruta GeoJSON, eliminar ruta,
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
| `Alt` + `5` | Zonas |
| `Alt` + `6` | Caravana |
| `Alt` + `7` | Chat IA (si la IA esta activa) |
| `Alt` + `8` | Replay |
| `Alt` + `P` | Mostrar u ocultar la barra lateral |
| `Alt` + `L` | Mostrar u ocultar la barra lateral |
| `Alt` + `H` | Plegar la barra de botones |
| `Esc` | Cerrar el dialogo superior (dialogo, menu contextual y luego ventanas) |

## Informes, respaldos y CSV

- **CSV** (Unidades): descarga la lista de unidades con estado, velocidad, zona,
  la **fecha y hora del ultimo reporte** y las **coordenadas** (lat, lon).
- **Avisos CSV**: descarga el historial de avisos con **fecha y hora completas**
  y las **coordenadas** de cada aviso.
- **Reporte PDF**: genera un **reporte operativo completo** y abre el dialogo de
  impresion del navegador; elige **Guardar como PDF**. Incluye portada, indice,
  KPIs, resumen ejecutivo, y tablas de: **unidades** (con fecha/hora del ultimo
  reporte, ID y coordenadas), **avisos del dia** (fecha/hora por aviso y
  coordenadas), **rutas activas**, **unidades sin senal** (con coordenadas),
  **geocercas** (tipo, area, centro y unidades dentro) y **zonas de riesgo**
  (con coordenadas). Cada dato lleva **fecha, hora y coordenadas** cuando se
  conocen. Esta paginado en A4, con encabezados de tabla que se repiten y sin
  emojis.
- **Informe (Markdown)**: el icono junto a Reporte PDF descarga el informe del
  dia en texto Markdown: resumen IA (opcional), alertas por severidad y por
  regla, unidades con mas alertas, una **tabla de unidades** (con fecha/hora y
  coordenadas), las **unidades sin senal** (con coordenadas) y los **ultimos
  avisos** con fecha/hora y coordenadas.
- **Reporte PDF del recorrido** (pestana Replay): incluye el mapa, los KPIs, las
  paradas, los eventos y una seccion **Puntos del recorrido** con fecha, hora,
  coordenadas, velocidad, rumbo y km acumulado de cada punto (muestreado). Que
  secciones aparecen se elige con las casillas de **Opciones del reporte** en la
  propia pestana. Ver
  [Reproducir el recorrido](#reproducir-el-recorrido-replay).
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
  todas, abrir al caer, cargar geocercas, geocodificacion, historico y
  **busqueda de lugares/municipios** (pais por codigo ISO, por defecto `mx`, y
  sesgo por cercania a la unidad en km).
- **Reglas**: umbrales y activacion de cada regla.
- **Avisos**: motor de voz (Navegador / StreamElements / Google), idioma y
  voz, pitido y volumen, notificacion del navegador, duracion de tarjetas,
  severidad minima, horario y editor de la lista.
- **Visual**: tema (oscuro, claro, automatico), densidad, **tamaño de la
  interfaz** (Normal, Grande, Muy grande, Enorme), color de acento y
  mostrar coordenadas. El tamaño de la interfaz agranda el texto y los
  controles de todo el panel, útil si te cuesta ver; se previsualiza al
  elegirlo y se aplica al guardar. La casilla **Usar el color de acento de
  la plataforma** hereda el acento del skin de AE-Track/Wialon (debajo se
  indica qué sitio y color se detectaron), para que el panel combine con la
  pagina. Tambien hay **Aplicar el estilo de Rondo a la pagina**
  (experimental: reescribe los colores de la plataforma con la paleta de Rondo
  apoyandose en sus propias variables CSS; cubre acento, superficies, texto y
  bordes, y respeta el tema oscuro/claro. Al desactivarlo se restaura). Junto
  a ella esta **Modo rendimiento de la pagina**, que baja el trabajo de
  pintado del navegador sobre la plataforma (fuera los desenfoques, las
  filas fuera de pantalla no se pintan, scrollbars y controles nativos con el
  esquema del tema, transiciones cortas) y deja de consultar datos mientras la
  pestana esta oculta, refrescando al volver; es reversible al apagarla. Y
  **Usar el idioma de la plataforma para la voz** (ajusta el idioma de la voz
  al del sitio).

  Con el estilo activo, el logo de la plataforma se sustituye por **RONDO**
  en tipografia Ndot (matriz de puntos, dibujada en SVG, sin fuentes
  externas). El remap recorre el CSS accesible una sola vez y deja las reglas
  apuntando a variables, asi que cambiar de tema o de acento es inmediato y no
  vuelve a analysing el estilo.
- **Ventanas**: lado y ancho de la barra lateral, ocultar al hacer clic
  fuera, confirmacion al cerrar todas las ventanas, verificacion automatica y
  tamano del panel.
- **Rutas**: servicios de OpenStreetMap, trazado, paradas multipunto y
  alertas de ruta (incluye la tolerancia de desvio por municipio).
- **IA**: habilita la IA de razonamiento. Elige proveedor (DeepSeek,
  NVIDIA NIM, Kimi for Coding, Moonshot, MiniMax o Personalizado), pega
  tu API key y, opcionalmente, endpoint y modelo. Aqui tambien estan el
  radio de POIs, el timeout, el limite diario de llamadas, el maximo de
  avisos por analisis en lote y los botones **Probar conexion**,
  **Detectar patrones** y **Borrar API key**. Ver
  [Chat con la IA](#chat-con-la-ia).
- **Avanzado**: versiones y busqueda de actualizaciones, perfiles de
  configuracion, limpiar bitacora y resets, y el **Diagnostico tecnico**
  (identidad de la plataforma detectada, espacio usado en local/sesion y
  estado del ciclo de actualizacion).

> **Diagnostico: exportar estilos de la plataforma.** En Ajustes, pestana
> Avanzado, seccion Diagnostico, el boton **Exportar estilos** barre *todo* el
> CSS accesible —no solo el visible—: hojas del documento, shadow roots
> anidados e iframes del mismo origen, y descarga un `.json` local con cada
> color literal (y los selectores donde se usa), todas las variables del tema
> y el inventario de hojas. No envia nada a ningun servidor. Sirve para
> revisar de donde sale cada color de la plataforma.

> **Diagnostico: campos "vacios" o ilegibles.** Si un campo de una ventana de la
> plataforma sale del color del fondo, hay tres botones en la misma seccion:
> **Copiar ventana** (espera a que aparezca la ventana de unidad, copia su HTML
> y el color/fondo efectivo de cada texto), **Textos invisibles** (30 s de
> muestreo mientras pasas el raton por las unidades; acumula los elementos cuyo
> texto casi coincide con su fondo) y el propio **Exportar estilos**, que ahora
> incluye la lista `invisibles`. Todo se calcula en local y se copia al
> portapapeles. Si la lista sale vacia, el campo no esta en blanco por color
> sino tapado por una capa translucida o fuera de la caja.

> **Estilo de Rondo en la pagina: que cubre.** Ademas de las variables del skin
> y los colores literales de todas las hojas, reescribe: los atajos con variables
> (`background: var(--x)`, `border: 1px solid var(--y)`; el navegador no los expone
> como propiedades sueltas, y son ~1000 reglas, entre ellas el fondo de los
> dialogos), las definiciones
> derivadas (`--x: var(--white)`), las hojas que crecen en vivo (react-select y
> Ant Design insertan reglas al abrir un dialogo; se vigilan y solo se procesan
> las nuevas), los colores *inline* de ventanas, dialogos y avisos, y las capas
> `::before` translucidas de las tablas (se mantienen translucidas para no tapar
> el dato). Los colores de estado (error, exito, aviso, ayuda) pasan a una pareja
> fondo/texto propia de cada tema, legible en oscuro y con los pasteles
> originales en claro.
> Tres garantias adicionales: las hojas del remap se mantienen siempre **al
> final del `<head>** (si la plataforma carga un modulo despues, sus reglas ya no
> pisan el tema ni dejan un dialogo en blanco), el **acento usado como texto**
> se aclara u oscurece hasta 4,5:1 de contraste (pestana activa, "Cancel",
> "Restore properties") y las reglas dentro de `@layer`/`@container` tambien se
> remapean.

> **Ajustes, mas rapidos.** El campo **Buscar ajuste...** de la cabecera filtra
> las opciones de todas las secciones a la vez y salta a la primera con
> coincidencias (vale el texto visible o el nombre interno, p. ej. `velMax`);
> `Esc` limpia la busqueda. El boton **Restaurar** devuelve todas las opciones a
> su valor por defecto **sin borrar tus datos** (lista vigilada, rutas, odometro
> y perfiles). Al reabrir Ajustes se vuelve a la ultima seccion usada, y el
> panel recuerda su ultima pestaña al recargar la pagina.

## Actualizaciones

El script comprueba la cabecera `@version` del repositorio al iniciar y cada
30 minutos. Cuando hay una version nueva:

- Aparece un boton verde **Actualizar X.Y.Z** en la barra de botones (visible sin
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
Cambia la barra lateral de lado o reduce su ancho en Ajustes &gt; Ventanas.

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
