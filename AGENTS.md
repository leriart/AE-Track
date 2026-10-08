# AGENTS.md · Filosofia y reglas de Rondo

Este documento define **que es Rondo, como se piensa y como se cambia**. Es la
guia para cualquier persona o agente que trabaje en el repositorio.

## Que es Rondo

Rondo es un **userscript** (Tampermonkey/Violentmonkey) que añade una capa de
vigilancia de flota sobre **AE-Track** y **Wialon**. Corre dentro del navegador
del operador, sobre la sesion que ya existe, y no depende de servidores propios.

## Resumen tecnico

| Aspecto | Detalle |
| --- | --- |
| Tipo | Userscript (una sola IIFE, `'use strict'`, un unico ambito) |
| Lenguaje | JavaScript moderno (ES2020+). **Sin** TypeScript, frameworks ni bundlers externos |
| Runtime | Navegador del operador: Chrome/Edge/Firefox/Opera/Safari via Tampermonkey o Violentmonkey |
| Plataformas | AE-Track (`*://*.ae-track.com/*`) y Wialon (`*://*.wialon.com/*`), en `@match` |
| Build | Node **>= 20**, cero dependencias npm (`scripts/*.mjs`) |
| Persistencia | `localStorage` / `sessionStorage`, prefijo `rondo.api.*` y `rondo.api.s.*` |
| Backend | Ninguno propio. Solo servicios publicos OSM y proveedores IA/voz opt-in |
| CI/CD | GitHub Actions: `ci.yml`, `release.yml`, `dev.yml` |
| Licencia | MIT |

Regla mental: **Rondo no es una app web; es un script que vive dentro de otra
app**. No controla el DOM de la plataforma salvo para insertar su propio panel,
no asume backend y debe sobrevivir a que falte la red, la API de Wialon o datos.


## Filosofia del proyecto

1. **Todo en el navegador, nada en servidores propios.** El estado vive en
   `localStorage`/`sessionStorage` con prefijo `rondo.api.*`. No se envia nada
   a infraestructura nuestra.
2. **Auditable.** Sin dependencias npm, sin CDN, sin `eval` remoto. El codigo
   es legible y el build es Node puro.
3. **Un monitorista, no una alarma ruidosa.** Las alertas deben ser utiles y
   razonables: umbrales, cooldowns, histeresis y contexto (hora, zona, ruta).
4. **IA opt-in y con contexto real.** La IA (5 proveedores + personalizado) se
   activa con API key y solo entonces se llama. Recibe el estado real de la
   plataforma; no inventa datos.
5. **Servicios publicos de OpenStreetMap** (Nominatim, OSRM, Overpass) con
   cache y respeto a sus limites.
6. **Privacidad primero.** La API key solo se envia al endpoint configurado.
7. **Español, sin emojis.** La UI puede llevar acentos; identificadores y
   comentarios seguimos la convencion existente (mayormente sin acentos).
8. **Modo estricto y sin fugas globales.** Todo comparte el ambito del script;
   no se contamina `window` de la pagina.

## Arquitectura (6.0.0+)

- Fuente en `src/`: `header.js`, `prelude.js`, `manifest.json` y `parts/NN-*.js`
  ordenados.
- Los fragmentos se agrupan en 3 **chunks contiguos**: `core`, `engine`, `ui`.
- `scripts/build.mjs` (Node puro) genera:
  - `--mode=bundle`: un solo archivo (tests/auditoria).
  - `--mode=require`: bootstrap + `dist/rondo-{core,engine,ui}.js` (hibrido).
- `rondo.user.js` es **generado**: nunca se edita a mano.
- La version vive en `VERSION`; el build inyecta `@version` y `const VER`.

Lee `ARCHITECTURE.md` para el mapa completo y `CONTRIBUTING.md` para el flujo.

## Mapa del repositorio

| Ruta | Rol | Se edita a mano |
| --- | --- | --- |
| `src/header.js` | Cabecera `==UserScript==` (contiene `@@VERSION@@`) | Si (salvo `@version`) |
| `src/prelude.js` | Comentario de arquitectura | Si |
| `src/manifest.json` | Orden y chunk de cada fragmento | Si (al añadir/quitar partes) |
| `src/parts/NN-slug.js` | Codigo fuente por dominio; `NN` fija el orden de ejecucion | **Si: aqui se trabaja** |
| `scripts/build.mjs` | Build `--mode=bundle`/`--mode=require` | Si |
| `scripts/next-version.mjs` | Calcula la version desde commits convencionales | Si |
| `scripts/gen-changelog.mjs` | Genera `changelogs/X.Y.Z.md` | Si |
| `scripts/bump-readme.mjs` | Actualiza el badge de version del README | Si |
| `scripts/test-all.mjs` | Runner de las suites (Node puro) + total de checks | Si |
| `scripts/check-docs.mjs` | Verifica/sincroniza cifras y enlaces de la documentacion | Si |
| `tests/*.test.js` | 21 suites; `tests/_source.js` es el cargador comun | Si |
| `rondo.user.js` | **Generado**: bootstrap hibrido (o bundle) | **Nunca** |
| `dist/*.js` | **Generado**: `rondo-core/engine/ui.js` (se commitean) | **Nunca** |
| `build/` | Bundle temporal para tests (gitignored) | Nunca |
| `changelogs/` | Un `.md` por version | Si (opcional, escrito a mano) |
| `.github/workflows/` | CI, release y canal dev | Si |
| `README.md`, `MANUAL.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` | Documentacion de usuario y tecnica | Si |

## Build, distribucion y releases

```bash
# Bundle unico (tests y auditoria) -> build/rondo.bundle.js
node scripts/build.mjs --mode=bundle --out build/rondo.bundle.js

# Hibrido (bootstrap + dist/), como se publica
node scripts/build.mjs --mode=require --channel=release --out rondo.user.js
node scripts/build.mjs --mode=require --channel=dev --version 6.7.0-dev.1 --out rondo.user.js
```

- Opciones de `build.mjs`: `--mode`, `--version`, `--channel=release|dev|main`,
  `--dist=DIR`, `--out`, `--quiet`. La version sale de `VERSION` si no se pasa.
- El build inyecta `@version` en la cabecera y `const VER` en el cuerpo: quedan
  siempre sincronizados.
- **Canales**: `main` (raw versionado `dist/vX.Y.Z/…`), `dev` (igual sobre la
  rama `dev`) y `release` (assets inmutables del release).
- **Version automatica**: al hacer push a `main`, `release.yml` calcula la
  version, genera changelog, construye, prueba, actualiza el badge del README,
  commitea artefactos, etiqueta y publica el release. **No toques `VERSION` ni
  `@version` a mano.**
- Escribe commits convencionales (`feat:`, `fix:`, `perf:`, `refactor:`,
  `docs:`, `chore:`; `!` o `BREAKING CHANGE` para major). De ahi sale la version.

| Workflow | Disparo | Que hace |
| --- | --- | --- |
| `ci.yml` | push/PR a `main`/`dev` | build bundle + 21 suites; en `main` verifica que `dist/` y el bootstrap commiteados coinciden con `src/` |
| `release.yml` | push a `main` (o manual) | version, changelog, build, tests, badge, commit, tag, release y push |
| `dev.yml` | push a `dev` | build con `X.Y.Z-dev.N`, tests y commit de `dist/` + bootstrap en `dev` |

`scripts/check-docs.mjs` mantiene sincronizadas las cifras de la documentacion
(suites, checks, pestanas, version y rangos de chunk) con el codigo. `ci.yml` lo
verifica en los PR; `release.yml` y `dev.yml` lo ejecutan con `--fix` antes de
commitear, asi que la doc no se desfasa sola.


## Reglas para cambios

- **Edita `src/parts/`**, nunca `rondo.user.js` ni `dist/`.
- **No renombres ni elimines** funciones/variables existentes: otras partes del
  script (mismo ambito) pueden usarlas. Si añades un helper, comprueba que el
  nombre no exista (busca en `src/parts/`) y usa un prefijo claro.
- **No añadas dependencias** ni imports: el codigo es un unico ambito.
- Mantén el **comportamiento por defecto**: nuevas funciones apagadas por
  defecto salvo que sean una mejora evidente y segura.
- Los cortes de chunk son **contiguos**: si tu fragmento va antes de la IA es
  `core`; entre IA y CSS, `engine`; despues de CSS, `ui`.
- Tras cambiar `src/`, **construye y prueba**:
  ```bash
  node scripts/build.mjs --mode=bundle --out build/rondo.bundle.js
  node scripts/test-all.mjs
  ```
  Las 21 suites (~1675 checks) deben quedar en verde. Si añades logica nueva,
  añade o amplia una suite.
- La version se calcula **automaticamente** al hacer push a `main` (workflow
  Release, segun commits convencionales). No cambies `@version` a mano: usa
  `feat:` / `fix:` / `BREAKING CHANGE` en los mensajes y deja que el workflow
  genere el changelog, el tag y el release.

## Convenciones de codigo

- **Un unico ambito.** Todo el script comparte scope (los `@require` se
  concatenan). No hay `import`/`export`, ni modulos, ni `window` propio.
- **No renombrar ni eliminar** simbolos existentes: otra parte puede usarlos.
  Antes de crear un helper, busca su nombre en `src/parts/` y elige un prefijo
  claro para evitar colisiones.
- **Nombres**: camelCase en funciones/variables, `UPPER` para constantes
  (`DEFAULTS`, `LS`, `SS`, `VER`). Los prefijos por dominio (`riesgo*`, `ia*`,
  `ruta*`, `voz*`) agrupan helpers relacionados.
- **Idioma**: español. Identificadores y comentarios **sin acentos**; la UI
  puede llevar acentos. **Sin emojis**: solo Unicode permitido (◉ ◎ × △ ◆ ◇ ✓
  ⚑ ⌖ ⧗ ↻ ⇩ ⌂ ↦ ↤ ⓘ ▂▄▆█ ☾ ☼ ⎘ ⌫ ⤢ ⤡ ⚙).
- **Comentarios**: explican el *por que* (decisiones, limites, v5.x al dia),
  no el *que*. Los banners de seccion mantienen el estilo
  `/* ====== NOMBRE ====== */` y `/* ====================== NOMBRE ====================== */`.
- **Robustez**: `try/catch`, `||`/fallbacks y validaciones. Nada debe romper si
  falta red, la API de Wialon o datos. Los `catch` vacios llevan `/* noop */`.
- **Rendimiento**: memoiza lo caro (`snapMemo`, caches de geo/A*/IA) y calcula
  una sola vez por refresco. Evita escanear polilineas o el DOM en bucle.
- **Opt-in y compatibilidad**: las funciones nuevas van apagadas por defecto
  (`DEFAULTS`) salvo mejora evidente y segura; nunca rompas el comportamiento
  existente ni la forma de los datos guardados.

## Estado y almacenamiento

- El estado en memoria vive en `APP` (`src/parts/09-estado.js`). La
  configuracion efectiva es `APP.config = deepMerge(readObject(LS.cfg, {}), DEFAULTS)`
  con `DEFAULTS` congelado (`Object.freeze`).
- Claves **persistentes** en `LS` (localStorage, `rondo.api.*`): `cfg`, `watch`,
  `memo`, `dismissed`, `hist`, `geo`, `barra`, `panelsize`, `seleccion`, `kpi`,
  `nmolestar`, `limites`, `perfiles`, `rutas`, `odometro`, `riesgo`,
  `municipios`, etc.
- Claves **por pestaña** en `SS` (sessionStorage, `rondo.api.s.*`): `watch`,
  `memo`, `hist`, `geo`, `planes`, `viajes`, `iaCache`, etc. `readSession*`
  migra automaticamente desde la clave global la primera vez.
- Usa **siempre** los helpers `readJSON`/`writeJSON`, `readSession`/
  `writeSession`, `readObject`/`readArray`, `readSessionObject`/`readSessionArray`:
  capturan cuota llena, storage bloqueado y JSON corrupto.
- La **API key de IA** se guarda en `localStorage` y solo se envia al endpoint
  configurado. Las **zonas de riesgo** viven solo en memoria (no se persisten ni
  se incluye dataset en el repo).
- La migracion desde **HJP Wialon** (version anterior) esta en
  `src/parts/02-migracion-desde-hjp-wialon.js` y **copia** (no mueve) los datos.

## Pruebas

```bash
node scripts/build.mjs --mode=bundle --out build/rondo.bundle.js
node scripts/test-all.mjs
```

- **21 suites, ~1675 checks**. Ninguna usa red ni navegador: las suites extraen
  funciones del bundle con stubs de DOM/localStorage.
- `tests/_source.js` reconstruye `build/rondo.bundle.js` solo si `src/`,
  `VERSION` o `build.mjs` estan mas nuevos, y expone `src` a cada suite.
- Cada suite imprime `ok - …` por check y termina con `Todos los tests pasan`;
  si algo falla, sale `FALLO - …` y el proceso termina con codigo distinto de 0.
- **Al añadir logica nueva, añade o amplia una suite.** Cubre el caso feliz y,
  si aplica, el borde (datos faltantes, red caida, GPS con jitter).

| Suite | Cubre |
| --- | --- |
| `algorithms.test.js` | geodesia, rumbo, punto-segmento, Douglas-Peucker, DBSCAN, A*/MinHeap |
| `geo*` / `paradas.test.js` | municipios OSM, busqueda difusa, paradas multipunto y optimizador |
| `autoruta.test.js` | trazado automatico, ETA y estado de ruta |
| `caravana.test.js` | proyeccion al eje, distancia firmada, sentido contrario y cercania |
| `trip.test.js` | analisis de viaje y punto de partida |
| `odometro.test.js` | odometro y saltos GPS anomalos |
| `riesgo.test.js` | clasificacion, estadisticas, filtros y orden de zonas de riesgo |
| `extraer_patrones.test.js` | deteccion de patrones de alertas |
| `carga.test.js` | carga/embarque y emparejamiento difuso |
| `geocercas.test.js` | KPIs y analisis de geocercas |
| `geocerca-alerta.test.js` | config por geocerca, histeresis, motor (sensor/estimado), cooldown, alcance y flota |
| `geocerca-local.test.js` | geocercas dibujadas en Rondo: geometria, fusion con `APP.zonas`, import/export e inversa del mapa |
| `informe-geocerca.test.js` | informe por geocerca: lectura de avisos, cruces sobre la traza, paradas y agregacion por unidad |
| `ui.test.js` | orden de tabla, escala de UI, iconos SVG, voz, IA y dialogo |
| `version.test.js` | parseo de `@version`/`VER` y sincronia |
| `syntax.test.js` | el bundle compila sin errores de sintaxis |
| `replay.test.js` | rango fecha/hora inicio-fin del replay y clasificacion del motor |
| `settings.test.js` | `docs/AJUSTES.md` lista todas las claves de `DEFAULTS` |
| `diagnostico.test.js` | formato y texto del panel de Diagnostico tecnico |
| `plataforma.test.js` | deteccion de metadatos de la plataforma (skin, acento, API, idioma) |

## Mapa de sectores

`src/manifest.json` es la **fuente de verdad** del orden y el chunk de cada
fragmento; la tabla siguiente es una guia rapida por dominio.

| Sector | Fragmentos | Contenido |
| --- | --- | --- |
| base | 00–11 | contexto/peticiones, migracion, iconos, idioma, version, storage, defaults, utilidades, estado, DOM, voz, API Wialon |
| geo-rutas | 12–20 | geodesia, Douglas-Peucker, OSM/OSRM/A*, municipios, busqueda difusa, paradas, rutas, caravana, analisis de viaje |
| notif-ia | 21–24 | nombre/estado de unidades, notificaciones, IA de razonamiento, dialogos |
| engine | 25–32 | motor de reglas, zonas de riesgo, refresh, ventanas, lista vigilada, editor de paradas, verificacion, tema |
| ui | 33–54 | CSS, build de UI, drag, paint, geocercas, caravana, export, actualizaciones, menu, teclas, eventos, bindings, init, mapa, replay, informe PDF, informe por geocerca, diagnostico, alerta de geocercas, geocercas de la app |

## Definicion de "mejora"

- **Correccion**: bug real, condicion de carrera, valor por defecto inseguro.
- **Robustez**: validaciones, fallbacks, manejo de errores, no romper si falta
  red o datos.
- **Rendimiento**: evitar trabajo repetido (memoizacion, indices, calculos una
  vez por refresco).
- **Claridad**: nombres, comentarios que expliquen el *por que*, eliminar codigo
  muerto.
- **Ampliacion**: funciones nuevas coherentes con el producto, opt-in y sin
  romper lo existente.

Evita refactors masivos o cambios de estilo globales que dificulten la revision.

## Tareas frecuentes

**Añadir un fragmento de codigo**

1. Crea `src/parts/NN-slug.js` con el `NN` que le corresponda en el orden de
   ejecucion (no reutilices numeros).
2. Registralo en `src/manifest.json` con su `chunk` (`core`, `engine` o `ui`),
   respetando que los cortes son **contiguos**.
3. Si abre seccion, añade el banner `/* ====== NOMBRE ====== */`.
4. Construye el bundle y corre las suites.

**Añadir una opcion configurable**

1. Declara el valor por defecto en `DEFAULTS` (`07-valores-por-defecto.js`).
2. Lee el valor desde `APP.config` (nunca de `localStorage` directo).
3. Añade el control en Ajustes (UI) y cablea su evento en `44-eventos.js`.
4. Si cambia la forma de un dato ya persistido, contempla una migracion.

**Añadir una regla de alerta**

1. Implementa la evaluacion en `src/parts/25-motor-de-reglas.js` (respeta
   umbrales, cooldowns e histeresis; no generes ruido).
2. Añade su ajuste a `DEFAULTS` y a la UI.
3. Cubre la regla en una suite (`riesgo.test.js`, `extraer_patrones.test.js` o
   una nueva).

**Añadir una clave de almacenamiento**

1. Declara la clave en `LS` o `SS` (`06-localstorage.js`).
2. Se inicializa y migra en `APP` (`09-estado.js`).
3. Accede siempre mediante los helpers `read*`/`write*`.

## Errores comunes (evitalos)

- Editar `rondo.user.js` o `dist/*.js`: son **generados** y se sobrescriben.
- Colocar un fragmento en el chunk equivocado: rompe el orden/scope global.
- Renombrar o borrar un simbolo que otras partes usan (mismo ambito).
- Añadir una dependencia, un `import` o un `<script>` remoto.
- Olvidar registrar el fragmento en `src/manifest.json`.
- Cambiar `VERSION`/`@version` a mano (lo hace el workflow de release).
- Meter emojis o acentos en identificadores.
- En `main`, no regenerar `dist/` + bootstrap: `ci.yml` fallara al compararlos.
- Escribir un `catch` silencioso sin `/* noop */`.

## Checklist antes de cerrar un cambio

- [ ] Los cambios estan en `src/` (y `manifest.json` si se añadieron partes).
- [ ] `node scripts/build.mjs --mode=bundle --out build/rondo.bundle.js` sin errores.
- [ ] Las 21 suites pasan (rojo = no cerrar el cambio).
- [ ] Si hay logica nueva, hay suite nueva o ampliada.
- [ ] El comportamiento por defecto no cambia (o la mejora es evidente y segura).
- [ ] Sin dependencias, sin emojis, sin fugas a `window`, sin `eval` remoto.
- [ ] Persistencia via helpers y `APP` (sin `localStorage` suelto).
- [ ] Mensaje de commit convencional (`feat:`/`fix:`/…) para que suba bien la version.

## Glosario

- **Unidad**: vehiculo de la plataforma (Wialon/AE-Track) que se vigila.
- **Lista vigilada**: conjunto de unidades que el operador monitorea (`watchMap`).
- **Geocerca**: zona definida en la plataforma; Rondo las consulta en vivo.
- **Zona de riesgo**: dato externo opt-in (URL/CSV/JSON) que vive solo en memoria.
- **Parada / plan multipunto**: puntos de una ruta por unidad (secuencial o mejor
  ruta), persistidos en `SS.planes` y derivables de un destino simple.
- **Caravana**: unidades cercanas a una unidad "lider" en la misma ruta.
- **Odometro**: distancia acumulada por unidad, persistente.
- **Snap**: proyeccion de una posicion sobre la polilinea de la ruta (memoizada).
- **DP / DBSCAN / A\***: Douglas-Peucker (simplificar), clustering espacial de
  paradas y busqueda de ruta sobre el grafo OSM (con `oneway`/`maxspeed`).
- **Parte (fragmento)**: archivo de `src/parts/`, concatenado en el bundle.
- **Chunk**: agrupacion contigua `core` → `engine` → `ui`.
- **Bundle**: un solo archivo (`--mode=bundle`) para tests/auditoria.
- **Bootstrap**: `rondo.user.js` minimo que carga los 3 chunks con `@require`.
- **Canal**: origen de los chunks (`main` raw, `dev` raw o assets del `release`).

