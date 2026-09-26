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

## Versionado y releases
- La version vive en `VERSION`. El build inyecta `@version` y `VER`.
- Escribe `changelogs/X.Y.Z.md` antes de publicar.
- Un responsable lanza el workflow **Release** (manual) con la version; el
  workflow valida, construye, prueba, etiqueta y publica el release con assets,
  y actualiza `main`.
- El canal `dev` se regenera solo en cada push a `dev`.

## Estilo
- Sin emojis en el codigo/UI (solo Unicode).
- Espanol sin acentos en identificadores y comentarios donde ya se venia
  haciendo; la UI puede usar acentos.
- Manten el modo estricto y evita variables globales fuera del scope del script.
