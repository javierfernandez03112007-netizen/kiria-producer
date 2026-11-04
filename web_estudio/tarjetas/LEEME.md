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
