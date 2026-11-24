# Web de Beauty Salon Merche (maqueta que funciona) — léelo antes de tocarla

Tienda online de **Beauty Salon Merche** (Merche Herrera, Motril) para vender **ghd** y **Schwarzkopf Professional**.
Contexto, decisiones y pendientes del proyecto: `merche/README.md`. Esto explica cómo está hecha la web y cómo se cambia.

## Verla
- **Enlace privado (vista previa en claude.ai, publicado el 24-11-2026 porque Javi lo pidió):** https://claude.ai/artifact/MyPr7aV3fpCqdQVF3dcX62
  Solo lo abre Javi con su cuenta hasta que lo comparta desde el menú «Compartir» (Merche no puede abrirlo mientras tanto).
  Para actualizarlo: `OUT=<ruta>/beauty-salon-merche.html node tools/bundle.mjs --artifact` y publicar ese archivo con la herramienta Artifact
  pasando esa `url` (si no, se crea un enlace nuevo). Esa versión es un «fragmento» (sin `<html>`/`<head>`/`<body>`) y lleva la ruta en memoria
  (`window.__MEM_ROUTER`, ver `js/nav.js`), porque dentro del marco de claude.ai no pasan direcciones como `#/tienda`: allí el botón «atrás» del
  navegador no cambia de página dentro de la tienda. Como la web lleva el nombre de un negocio real, **no se publica ni se comparte sin que Javi lo pida**.
- **Sin servidor:** abre `dist/beauty-salon-merche-demo.html` (todo en un archivo). Se regenera con `node tools/bundle.mjs` (necesita `esbuild`).
- **En desarrollo:** `python3 -m http.server` dentro de esta carpeta y abre `http://localhost:8000`.
- `?sinintro` salta la intro y `?intro` la fuerza. La intro solo sale en la primera visita, y nunca si se entra directamente a un producto
  (para que quien llegue desde un anuncio vea el producto al instante).
- Es una maqueta: **la caja no cobra ni guarda datos**. La versión real se montará en Shopify con este diseño.

## Archivos
| Archivo | Qué es |
|---|---|
| `index.html` | El esqueleto: intro, avisos, cabecera, menú, bolsa, buscador y el hueco `#view` donde se pinta cada página |
| `css/styles.css` | Base: colores, fuentes, botones, tarjetas, ficha, bolsa, caja |
| `css/motion.css` | Escenas con movimiento y ajustes de móvil. **Va después y manda sobre la base** |
| `js/config.js` | **Lo que decide Merche**: avisos, envíos, lo más vendido, guía de ghd, packs, y las rutas de vídeos y fotos generales |
| `js/products.js` | El catálogo. **Generado: no se edita a mano** (sale de `data/`) |
| `js/catalog.js` | Búsqueda, precios, tarjeta de producto e ilustración provisional |
| `js/art.js` | Siluetas provisionales por tipo de producto (no imitan ningún envase real) |
| `js/fx.js` | Todo el movimiento: escenas fijadas, cintas, aparecer, telón, cursor, producto que vuela a la bolsa |
| `js/home.js` | La portada, escena a escena, y el test de rutina |
| `js/views.js` | Tienda, ficha de producto, caja, «gracias» y textos legales |
| `js/cart.js` | La bolsa (se guarda en el navegador) |
| `js/intro.js` | La intro: vídeo con IA si existe; si no, la bolsa en 3D (three.js) |
| `js/app.js` | Arranque y rutas (`#/tienda`, `#/p/<id>`, `#/caja`…) |
| `js/nav.js` | Navegación: ruta en la dirección (normal) o en memoria (vista previa de claude.ai). **Nunca uses `location.hash` directamente: usa `navigate()` y `hash()`** |
| `data/` | Catálogo en JSON + `build.py` + `overrides.json` |
| `tools/bundle.mjs` | Empaqueta todo en un archivo |

## Catálogo (169 productos: 59 ghd + 110 Schwarzkopf Professional)
- `data/base.json` (los 32 principales, escritos a mano) + `data/ghd_extra.json`, `data/sk_care.json`, `data/sk_styling.json` (investigados el 24-11-2026).
- Cada producto: `id`, `brand`, `line`, `name`, `cat`, `size`, `price`, `priceSrc`, `short`, `desc`, `benefits`, `use`, `facts`, `needs`, `colors`, `url`, `confirm`.
- **Fuentes y honestidad:** las webs de las marcas están bloqueadas desde la sesión, así que los datos salen de resultados de buscador
  (web oficial, tienda oficial de Schwarzkopf, Sephora, Druni, El Corte Inglés, Primor, Keshop, Coserty…). Los textos están redactados por nosotros
  y las cifras se dicen como de la marca («según ghd»). **Los precios son de referencia (PVP o de tiendas, nov. 2026): el precio lo pone Merche.**
  Lo dudoso está en `confirm` y sale en la ficha como «por confirmar». 4 productos van sin precio («Consultar»).
- **Para cambiar un dato sin tocar los ficheros grandes:** `data/overrides.json` → `{"<id>": {"price": 239, "new": true, "merche": "Su consejo…"}}`.
- Después de cualquier cambio: `python3 data/build.py` (regenera `js/products.js`).

## Fotos y vídeos (lo que irá mandando Javi)
Basta con dejar el archivo con el nombre del `id` del producto y ejecutar `python3 data/build.py`:
| Archivo | Dónde sale |
|---|---|
| `media/productos/<id>.jpg` (o `.webp`, `.png`) | Foto del producto en tarjetas, ficha, bolsa (sustituye a la silueta) |
| `media/productos/<id>-2.jpg`, `-3.jpg`… | Más fotos en la ficha |
| `media/productos/<id>.mp4` | Vídeo del producto: en la tarjeta (al pasar el ratón; en el móvil, al verse) y en la ficha |
| `media/productos/<id>-tutorial.mp4` | Tutorial de Merche en la ficha |
Generales, en `js/config.js`: `intro.video.portrait` / `landscape` (vídeo de la intro en 9:16 y 16:9), `media.heroVideo` (Merche en su mostrador),
`media.merchePhoto` (foto de Merche) y `media.tutorialTeaser` (trozo de tutorial en el móvil dibujado).
Recomendado: fotos 1200×1500 (4:5) con fondo limpio; vídeos de producto 4:5, 4–6 s, sin sonido, ≈ 1 MB; intro ≤ 3 MB.

## Reglas que hay que respetar
- **Nada inventado:** ni reseñas, ni frases de Merche, ni descuentos, ni «más vendido» sin sus datos. Lo que falta lleva la etiqueta `.pend` (amarilla, discontinua).
- **Nombres de clase:** las clases de estado van con prefijo (`is-quick`) o son muy concretas. Ya hubo dos choques: `.ghost` (botón) con el producto que vuela
  y `.quick` (botón «añadir» de la tarjeta) puesta en `<body>`. No reutilices nombres cortos.
- **Nada fuera de pantalla sin recortar:** la bolsa cerrada, el telón y el cursor viven dentro de `.clip` (caja fija con `overflow:hidden`). Si no, en el
  móvil la página se ensancha y todo lo fijo se descoloca. Rejillas de una columna: `minmax(0, 1fr)`.
- **Animaciones de entrada sin `forwards`:** un `animation` que se queda activo convierte al elemento en contenedor de lo `position: fixed` que lleve dentro.
- **Zonas seguras del móvil:** el margen lateral (`--pad`) y lo que va pegado a un borde (cabecera, bolsa, buscador, menú) suman `env(safe-area-inset-*)`.
- Las escenas fijadas (lo más vendido, ghd) solo se activan en pantallas de más de 860 px y sin «reducir movimiento»; en el móvil son carruseles y pestañas.
- Las marcas se escriben en texto. **Logos y fotos oficiales, solo con permiso de ghd y de Henkel.**

## Comprobado el 24-11-2026 (con Playwright)
Compra completa en ordenador y móvil (ficha → bolsa → caja con validación → «gracias»), test de rutina, buscador, filtros, «ver más», pestañas de ghd,
paneles, menú móvil, intro repetida, sin errores de consola y sin desbordes a 320, 390 y 900 px. El archivo único funciona abierto desde disco.
No comprobado: Safari/iPhone real ni rendimiento en móviles antiguos.

## Pendiente
Fotos y vídeos reales · textos de Merche por producto · su selección de productos, precios y «lo más vendido» · envíos y pagos reales · WhatsApp e Instagram ·
textos legales con sus datos · permisos de marca · pasar a Shopify (píxel de Meta, catálogo, correos del tutorial).
