# Tarjetas de visita de kiria.ai (4-11-2026)

Javi: «tarjetas para dar a las empresas de la zona en físico sobre kiria y la web» y después «no quiero que haya nada de precios,
algo muy muy profesional». Dos versiones sobrias, sin precios ni teléfono, con el estilo de kiriaai.com (Anton para la marca,
Instrument Sans y JetBrains Mono; la línea con el degradado rojo-violeta-azul):

- **noche**: frente oscuro (como la web) y dorso claro.
- **blanca**: frente y dorso blancos, minimalista.

Archivos de cada versión (`<v>` = noche o blanca):
- `tarjeta_imprenta_<v>.pdf`: frente y dorso de 91 × 61 mm (85 × 55 mm + 3 mm de sangrado), para una imprenta online o una copistería.
  Pedir: 85 × 55 mm, doble cara, papel de 350 g mate.
- `tarjetas_A4_<v>.pdf`: 10 frentes + 10 dorsos en A4 con marcas de corte, para imprimir en casa a doble cara (girando por el lado largo).
- `<v>_frente.png`, `<v>_dorso.png`: vistas previas ya recortadas a 85 × 55 mm.

Dorso: «Vídeos 3D para redes sociales · Tu producto, en 3D · Páginas web para negocios», QR a https://kiriaai.com (comprobado que se
lee), @kiria.ai y kiriaai2026@gmail.com. Para cambiar textos: FRONT y BACK en `hacer_tarjetas.cjs` → `node hacer_tarjetas.cjs` (une los
PDF con pdfunite). El QR (`qr.svg`) se rehace con Python (librería qrcode) si cambia la dirección.

## Catálogo de 16 modelos (5-11-2026)
Javi: «hazme 10 modelos diferentes… también en tonos grises, o por los dos lados modo noche, uno blanco y otro noche, al revés…
entre 10 y 20». `node hacer_modelos.cjs` → `modelos/catalogo_1.png` y `catalogo_2.png` (8 modelos cada uno, frente y dorso
numerados), `modelos/mNN_frente.png`, `mNN_dorso.png` y `mNN_imprenta.pdf` (91 × 61 mm con sangrado, frente y dorso) de cada uno.
Colores: noche, negro, grafito, gris, perla, piedra, blanco y degradado de la marca. Frentes: A (izquierda), B (centrado),
C (editorial: logo grande abajo), D (barra de color a la izquierda). Dorsos: A (lista + QR a la derecha), B (QR centrado).
QR comprobado (se lee https://kiriaai.com) en los modelos 1, 6, 9 y 13.
