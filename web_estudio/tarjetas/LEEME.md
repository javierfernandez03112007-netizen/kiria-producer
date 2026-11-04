# Tarjetas de visita de kiria.ai (4-11-2026)

Javi: «tarjetas para dar a las empresas de la zona en físico sobre kiria y la web». Mismo estilo que kiriaai.com (Anton, Instrument
Sans, JetBrains Mono; fondo oscuro con el degradado rojo-violeta-azul).

- `tarjeta_imprenta.pdf`: frente y dorso de 91 × 61 mm (85 × 55 mm + 3 mm de sangrado), para una imprenta online o una copistería.
  Pedir: 85 × 55 mm, doble cara, papel de 350 g mate.
- `tarjetas_A4.pdf`: 10 frentes + 10 dorsos en A4 con marcas de corte, para imprimir en casa a doble cara (girando por el lado largo).
- `frente.png`, `dorso.png`: vistas previas (ya recortadas a 85 × 55 mm).
- Dorso: lo que hacemos (vídeos para redes, tu producto en 3D, webs), «Vídeos desde 6,99 €» (el precio de la web; en los vídeos no se
  ponen precios, en la tarjeta sí), QR a https://kiriaai.com (comprobado que se lee), kiriaai.com · @kiria.ai · kiriaai2026@gmail.com.
  Sin teléfono (como en la web).
- Para cambiar textos o precio: `hacer_tarjetas.cjs` (FRONT y BACK) → `node hacer_tarjetas.cjs` y unir con `pdfunite` (ver el final de
  este archivo). El QR se rehace con Python (librería qrcode) si cambia la dirección.

```bash
node hacer_tarjetas.cjs && pdfunite _frente.pdf _dorso.pdf tarjeta_imprenta.pdf && pdfunite _A4_frentes.pdf _A4_dorsos.pdf tarjetas_A4.pdf && rm _*.pdf
```
