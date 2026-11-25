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
| `tools/bundle.mjs` | Empaqueta todo en un archivo (y con `--artifact`, la versión para claude.ai) |
| `tools/foto.py` | Coloca la foto de un producto (recorta, iguala y guarda) |
| `tools/lista.py` | Lista numerada de productos y qué fotos faltan (`merche/LISTA_FOTOS.md`) |
| `tools/oficial/` | Cómo se sacaron las fotos y fichas oficiales de Schwarzkopf (`LEEME.md`) y `recorta_fondo.py` (quita el fondo de color de una foto de marca) |

## Catálogo (160 productos: 59 ghd + 101 Schwarzkopf Professional)
- `data/base.json` (los 32 principales, escritos a mano) + `data/ghd_extra.json`, `data/sk_care.json`, `data/sk_styling.json` (investigados el 24-11-2026).
- Cada producto: `id`, `brand`, `line`, `name`, `cat`, `size`, `price`, `priceSrc`, `short`, `desc`, `benefits`, `use`, `facts`, `needs`, `colors`, `url`, `confirm`.
- **Fuentes y honestidad:** las webs de las marcas están bloqueadas desde la sesión, así que los datos salen de resultados de buscador
  (web oficial, tienda oficial de Schwarzkopf, Sephora, Druni, El Corte Inglés, Primor, Keshop, Coserty…). Los textos están redactados por nosotros
  y las cifras se dicen como de la marca («según ghd»). **Los precios son de referencia (PVP o de tiendas, nov. 2026): el precio lo pone Merche.**
  Lo dudoso está en `confirm` y sale en la ficha como «por confirmar». 3 productos van sin precio («Consultar»).
- **Schwarzkopf, contrastado con la web oficial (25-11-2026): los 101 productos.** 100 están en la tienda oficial de la marca
  (`shop.schwarzkopf-professional.es`) y la Bruma Sun Protect SPF 20, que ya no está en la tienda, en la web de marca (`www.schwarzkopf-professional.com`).
  De ahí salen su **foto oficial**, el nombre, el EAN (la Bruma no lo trae) y la base de la descripción y del modo de uso:
  `data/oficial_sk.json` (código, nombre oficial, EAN, dirección), `data/textos_sk.json` (nuestra redacción a partir de la ficha oficial) y
  `data/fotos.json` (de dónde sale cada foto). Cómo se hizo y cómo repetirlo: `tools/oficial/LEEME.md`.
- **Retirados el 25-11-2026 (9 productos):** no aparecen en ninguna de las dos webs oficiales (sus direcciones antiguas redirigen a la portada) y Javi dijo
  «los que no aparezcan quítalos»: Moisture Kick Curl Bounce (79), Frizz Away ×4 (82–85), Time Restore ×3 (86–88) y OSiS Pump Up (128).
  Sus fichas completas están en `data/_retirados.json` (no se carga). Para volver a poner uno: devolver su ficha a su fichero de catálogo (campo `origen`),
  borrarlo de `_retirados.json` y ejecutar `python3 data/build.py`. `tools/foto.py` se niega a colocar fotos de un producto retirado.
  La marca tiene además unos 40 productos de venta al público que no están en nuestro catálogo (otros tamaños, Fibre Clinix antiencrespado, Scalp Clinix tratamientos…).
- **ghd:** datos de buscadores (sin contrastar con su web, que bloquea esta máquina). Fotos: las manda Javi.
- **Para cambiar un dato sin tocar los ficheros grandes:** `data/overrides.json` → `{"<id>": {"price": 239, "new": true, "merche": "Su consejo…"}}`.
- Después de cualquier cambio: `python3 data/build.py` (regenera `js/products.js`).

## Fotos y vídeos (los va mandando Javi por el chat)
**Flujo acordado el 25-11-2026:** Javi tiene la lista numerada (`merche/LISTA_PRODUCTOS_FOTOS.pdf`; en texto, `merche/LISTA_FOTOS.md`) y va adjuntando fotos
en el chat; yo las coloco. Los adjuntos llegan a `/mnt/user-data/uploads/`.
1. Cada producto tiene un **número fijo** (`data/numeros.json`, generado por `tools/lista.py`; no cambia aunque se añadan productos).
2. Colocar una foto: `python3 tools/foto.py <archivo> <número o id>` (añade `--extra` para una foto más del mismo producto).
   Un lote: `python3 tools/foto.py --lote <carpeta>` con archivos llamados `23.jpg`, `23-2.png`, `ghd-gold.webp`… Los que no lleven número o id
   salen como «sin asignar»: se miran (se reconoce el producto por la etiqueta), se confirma con Javi si hay duda y se colocan a mano.
3. La herramienta endereza la foto, le quita los metadatos, recorta el fondo blanco o transparente que sobra, la deja a 1.200 px como mucho y la guarda en
   `media/productos/<id>.webp` (más una miniatura en `media/productos/mini/`). Después regenera el catálogo y la lista (`[x]` = ya tiene foto).
4. Regenerar y republicar: `node tools/bundle.mjs --artifact` (ver «Verla»). En la versión de claude.ai las fotos **no van incrustadas**: se publican como
   archivos aparte con el parámetro `files` de la herramienta Artifact, usando el mapa que deja el empaquetador en `<salida>.archivos.json`
   (ruta publicada → archivo). En el archivo único de `dist/` van incrustadas las miniaturas.
- Cómo se ven: la clase `.pimg` las muestra **enteras y sobre blanco** en tarjetas, ficha, bolsa, packs y en el círculo de la escena de ghd.
- Si Javi dice que Merche no vende un producto: se quita del catálogo pasando su ficha de su JSON en `data/` a `data/_retirados.json`
  (con número, fecha y motivo) y **su número no se reutiliza** (se queda apuntado en `data/numeros.json`). La lista y el PDF dicen qué números ya no existen.
- Una foto de marca que venga sobre un fondo de color (no blanco): `python3 tools/oficial/recorta_fondo.py <foto> <salida.png>` le quita el fondo y la sombra
  y después se coloca con `tools/foto.py`. Hay que mirar el resultado ampliado sobre blanco y sobre oscuro, y apuntarlo en la `nota` de `data/fotos.json`.
- Otros archivos por producto (mismo sistema, a mano): `media/productos/<id>.mp4` (vídeo en tarjeta y ficha) y `media/productos/<id>-tutorial.mp4` (tutorial de Merche).
- Generales, en `js/config.js`: `intro.video.portrait` / `landscape` (vídeo de la intro en 9:16 y 16:9), `media.heroVideo` (Merche en su mostrador),
  `media.merchePhoto` (foto de Merche) y `media.tutorialTeaser` (trozo de tutorial en el móvil dibujado).
- Recomendado: fotos de 800 px o más, producto entero sobre fondo blanco o liso; vídeos de producto 4:5, 4–6 s, sin sonido, ≈ 1 MB; intro ≤ 3 MB.
- **Las fotos oficiales de ghd y Schwarzkopf necesitan el permiso de las marcas antes de publicar la web.**

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
**Repetido el 25-11-2026** tras quitar los 9 productos y poner la última foto de Schwarzkopf: mismas pruebas, todas bien (también el archivo único y la
versión de claude.ai); la dirección de un producto retirado muestra «No encontramos ese producto» con el botón a la tienda.

## Pendiente
Fotos y vídeos reales · textos de Merche por producto · su selección de productos, precios y «lo más vendido» · envíos y pagos reales · WhatsApp e Instagram ·
textos legales con sus datos · permisos de marca · pasar a Shopify (píxel de Meta, catálogo, correos del tutorial).
