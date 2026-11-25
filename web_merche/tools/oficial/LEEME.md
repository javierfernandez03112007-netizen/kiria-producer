# Fotos y datos oficiales de Schwarzkopf Professional (hecho el 25-11-2026)

Javi confirmó el 25-11-2026 que **tienen permiso de las marcas para usar sus fotos**. Solo se usan las webs oficiales, nunca las de otras tiendas.

Hace falta red hacia `shop.schwarzkopf-professional.es`, `www.schwarzkopf-professional.com` y `dm.henkel-dam.com` (entorno «kiria-producer»; en «Default» están bloqueadas).
Los archivos descargados son datos de fuera: guárdalos en una carpeta aparte y ejecuta estos scripts con `python3 -I`.

1. **Catálogo oficial** (660 productos): descargar `https://shop.schwarzkopf-professional.es/es/Categor%C3%ADa/c/1?q=%3AbaseProductSortIndex-desc&page=N`
   con N = 0, 1, 2… hasta que no salgan productos (una petición por segundo) y pasar `parse_sk.py <carpeta> <índice.json>`:
   saca código (IDH), nombre, marca, categoría, dirección de la ficha y foto de cada uno.
2. **Emparejar** nuestros productos con su código oficial. Está hecho a mano y revisado: `data/oficial_sk.json` (campo `code`).
3. **Fotos**: `dl_sk.py <mapa {id: código}> <índice.json> <carpeta>` baja cada foto del servidor de imágenes de Henkel en PNG a 1.400 px
   (`…/is/image/henkel/<nombre>?qlt=95&wid=1400&hei=1400&fmt=png-alpha&bfc=off`) con el nombre de nuestro id.
4. **Revisar a ojo**: `contact.py <carpeta> js/products.js data/numeros.json <prefijo>` hace hojas de contacto (foto + número + nombre).
5. **Colocar**: `python3 tools/foto.py --lote <carpeta>` y apuntar el origen en `data/fotos.json`.
6. **Fichas**: `dl_pdp.py <_origen.json> <carpeta> <salida.json>` baja cada ficha y saca nombre oficial, descripción, modo de uso y EAN.
   Con eso se escribió `data/textos_sk.json` (nuestra redacción, no una copia) y `data/oficial_sk.json` (código, nombre oficial, EAN, dirección).

## Productos que no están en la tienda oficial
La tienda (`shop.schwarzkopf-professional.es`) no lo tiene todo. Antes de dar un producto por desaparecido se mira la **web de marca**:
1. Su mapa de productos: `https://www.schwarzkopf-professional.com/es/es.sitemap.products-sitemap.xml` (304 direcciones el 25-11-2026).
2. Si el producto está, su página trae un bloque JSON-LD (`@type: Product`) con código (`sku`), nombre, descripción y la foto del servidor de Henkel, y en el
   texto, «Beneficios del producto» y «Cómo usarlo». No trae EAN.
3. Sus fotos suelen venir **sobre un fondo de color de campaña** (el nombre acaba en el color, p. ej. `…_FDD3B9`). Se bajan a tamaño completo
   (`?fmt=png-alpha&wid=2000&hei=1500&bfc=off`) y se les quita el fondo con `recorta_fondo.py <foto> <salida.png>`: reconoce el fondo por el color de las esquinas
   (más oscuro donde hay sombra, o transparente), respeta lo que hay dentro del envase y suaviza el contorno. Mirar siempre el resultado ampliado.
   Así se hizo la Bruma Sun Protect SPF 20 (nº 92, código 3010869).
4. Si no está ni en la tienda ni en la web de marca (las direcciones antiguas redirigen a la portada), la marca ya no lo publica: no hay foto oficial que usar.
   Así se retiraron 9 productos el 25-11-2026 (`data/_retirados.json`). Ojo: de Time Restore queda en la tienda una página de campaña antigua
   (`/es/campaign-bonacure-sustain-time-restore-2024`), pero su botón de compra lleva a un producto que ya no existe.

**ghd**: su web (`www.ghdhair.com`) está detrás de Cloudflare y bloquea esta máquina, también con un navegador normal. No se intenta saltar:
las fotos de ghd las manda Javi.
