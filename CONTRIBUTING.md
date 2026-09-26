# Como contribuir a Rondo

## Requisitos
- Node 20 o superior. **No hay dependencias npm**: el build es Node puro.

## Flujo de trabajo
1. Crea una rama desde `dev`.
2. Edita el codigo en `src/` (no en `rondo.user.js`, que es generado).
3. Construye y prueba.
4. Abre un PR contra `dev`.

## Construir

```bash
# Bundle completo (lo que usan las pruebas y la auditoria)
node scripts/build.mjs --mode=bundle --out build/rondo.bundle.js

# Hibrido (bootstrap + dist/), como se publica
node scripts/build.mjs --mode=require --channel=release --out rondo.user.js
```

`build/` esta en `.gitignore`. `dist/` y `rondo.user.js` **si** se commitean
porque son el artefacto instalable y el canal `dev` los sirve desde raw.

## Probar

```bash
for t in tests/*.test.js; do node "$t"; done
```

`tests/_source.js` construye el bundle automaticamente si `src/` cambio. Las 12
suites no usan red ni navegador.

## Anadir una seccion de codigo
- Crea/edita un fragmento en `src/parts/NN-slug.js` respetando el orden.
- Registra el fragmento en `src/manifest.json` con su chunk (`core`, `engine` o
  `ui`). Recuerda que los chunks son **contiguos**: si tu fragmento va antes de
  la IA es `core`; entre IA y CSS, `engine`; despues de CSS, `ui`.
- Si anades un banner de seccion, manten el estilo `/* ====== NOMBRE ====== */`.

## Versionado y releases (automatico)
- La version vive en `VERSION`. El build inyecta `@version` y `VER`.
- Al hacer **push a `main`**, el workflow `release.yml` hace todo solo:
  1. calcula la siguiente version segun los commits convencionales
     (`feat` → minor, `BREAKING CHANGE`/`!` → major, resto → patch);
  2. genera `changelogs/X.Y.Z.md` (si no existe uno escrito a mano);
  3. construye (`--channel=main`), corre las 12 suites y actualiza el badge del
     README;
  4. commitea `VERSION`, `rondo.user.js`, `dist/`, `changelogs/` y `README.md`
     (`[skip ci]`), crea el tag `vX.Y.Z`, publica el release con assets y sube
     `main`.
- Tambien se puede lanzar a mano desde **Actions → Release** con una version
  exacta (input opcional).
- Escribe `feat:` / `fix:` / `BREAKING CHANGE` en tus mensajes de commit: de eso
  depende el salto de version.
- El canal `dev` se regenera solo en cada push a `dev`.
- El bootstrap de `main` usa raw `main/dist?=vX.Y.Z`, asi que **cada push a main
  ya funciona** sin depender de que exista el release.

## Estilo
- Sin emojis en el codigo/UI (solo Unicode).
- Espanol sin acentos en identificadores y comentarios donde ya se venia
  haciendo; la UI puede usar acentos.
- Manten el modo estricto y evita variables globales fuera del scope del script.
