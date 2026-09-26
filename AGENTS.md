# AGENTS.md · Filosofia y reglas de Rondo

Este documento define **que es Rondo, como se piensa y como se cambia**. Es la
guia para cualquier persona o agente que trabaje en el repositorio.

## Que es Rondo

Rondo es un **userscript** (Tampermonkey/Violentmonkey) que añade una capa de
vigilancia de flota sobre **AE-Track** y **Wialon**. Corre dentro del navegador
del operador, sobre la sesion que ya existe, y no depende de servidores propios.

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
  for t in tests/*.test.js; do node "$t"; done
  ```
  Las 12 suites (~971 checks) deben quedar en verde. Si añades logica nueva,
  añade o amplia una suite.
- La version se calcula **automaticamente** al hacer push a `main` (workflow
  Release, segun commits convencionales). No cambies `@version` a mano: usa
  `feat:` / `fix:` / `BREAKING CHANGE` en los mensajes y deja que el workflow
  genere el changelog, el tag y el release.

## Mapa de sectores

| Sector | Fragmentos | Contenido |
| --- | --- | --- |
| base | 00–11 | contexto/peticiones, migracion, iconos, idioma, version, storage, defaults, utilidades, estado, DOM, voz, API Wialon |
| geo-rutas | 12–20 | geodesia, Douglas-Peucker, OSM/OSRM/A*, municipios, busqueda difusa, paradas, rutas, caravana, analisis de viaje |
| notif-ia | 21–24 | nombre/estado de unidades, notificaciones, IA de razonamiento, dialogos |
| engine | 25–32 | motor de reglas, zonas de riesgo, refresh, ventanas, lista vigilada, editor de paradas, verificacion, tema |
| ui | 33–47 | CSS, build de UI, drag, paint, geocercas, caravana, export, actualizaciones, menu, teclas, eventos, bindings, init |

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
