# Arquitectura de Rondo

Desde la **6.0.0** el proyecto dejo de ser un archivo monolitico. Ahora el codigo
vive en `src/`, se construye con un script de Node **sin dependencias** y se
distribuye de forma **hibrida**: un `rondo.user.js` pequeno (bootstrap) que carga
tres modulos con `@require`.

## Fuente (`src/`)

```
src/
├─ header.js          Cabecera ==UserScript== (con @@VERSION@@)
├─ prelude.js         Comentario de arquitectura
├─ manifest.json      Orden de los fragmentos y chunk de cada uno
└─ parts/
   ├─ 00-… 22-…        chunk core
   ├─ 23-… 32-…        chunk engine
   └─ 33-… 46-…        chunk ui
```

Los fragmentos estan **ordenados** y su concatenacion reproduce exactamente el
script completo. Los cortes son las secciones historicas (`CONTEXTO`, `GEO`,
`IA`, `MOTOR DE REGLAS`, `CSS`, `PAINT`, `EVENTOS`, `INIT`, etc.).

## Modulos y chunks

| Chunk | Contenido |
| --- | --- |
| `core` | contexto/peticiones, almacenamiento, estado (`APP`, `DEFAULTS`), utilidades, DOM, voz, API Wialon, geo/OSM, municipios, busqueda difusa, paradas, rutas y analisis de viaje. |
| `engine` | IA de razonamiento, dialogos, motor de reglas, zonas de riesgo, refresh, automatizacion de ventanas, lista vigilada, editor de paradas, verificacion y tema. |
| `ui` | CSS, construccion de la interfaz, paint (lista, alertas, rutas, zonas, caravana), exportaciones, actualizaciones, menu contextual, eventos e `init`. |

Los cortes son **contiguos** (core → engine → ui) para preservar el orden de
ejecucion global; el ambito es compartido porque los gestores de userscripts
**concatenan** los `@require` con el script antes de ejecutarlos.

## Build (`scripts/build.mjs`)

Un unico script, sin dependencias:

```bash
# Un solo archivo (tests, auditoria)
node scripts/build.mjs --mode=bundle --out build/rondo.bundle.js

# Hibrido: bootstrap + dist/rondo-{core,engine,ui}.js
node scripts/build.mjs --mode=require --channel=release --out rondo.user.js
node scripts/build.mjs --mode=require --channel=dev --version 6.0.0-dev.3 --out rondo.user.js
```

Opciones: `--version`, `--channel=release|dev`, `--dist=DIR`, `--out`, `--quiet`.
La version sale del archivo `VERSION` salvo que se pase `--version`.

El build inyecta `@version` en la cabecera y `const VER` en el cuerpo, de modo
que ambos quedan siempre sincronizados.

## Distribucion

- **main (estable)**: el bootstrap apunta a assets **inmutables por tag**:
  `https://github.com/leriart/AE-Track/releases/download/vX.Y.Z/rondo-core.js`.
- **dev (pruebas)**: el bootstrap apunta a
  `https://raw.githubusercontent.com/leriart/AE-Track/dev/dist/rondo-core.js?v=…`.
- `@updateURL`/`@downloadURL` se mantienen en raw `main` para no romper la
  cadena de actualizacion de versiones anteriores.
- **Resiliencia**: si falta un modulo, el bootstrap muestra un aviso claro
  (`#rondo-aviso`) en lugar de fallar en silencio.

## Pruebas

`tests/_source.js` construye el bundle si `src/` cambio y lo expone a las 12
suites. Asi las pruebas analizan el script completo aunque el repositorio guarde
fragmentos.

## Automatizacion

| Workflow | Disparo | Que hace |
| --- | --- | --- |
| `ci.yml` | push/PR a `main`/`dev` | build bundle + 12 suites; en `main` verifica que `dist/` y el bootstrap commiteados coinciden con `src/`. |
| `release.yml` | manual | valida version y changelog, build, tests, commit, tag, release con assets (antes de tocar `main`), smoke test y push a `main`. |
| `dev.yml` | push a `dev` | build con `X.Y.Z-dev.N`, tests y commit de `dist/` + bootstrap en `dev`. |

## Estado y compatibilidad

El estado del usuario sigue en `localStorage`/`sessionStorage` con el prefijo
`rondo.api.*`. Reorganizar el codigo no requiere migracion de datos.
