# Web · Beauty Salón Merche (Motril)

Propuesta de web en un solo archivo: `index.html` (sin dependencias, abre directamente en el navegador).

## Fotos
Cada hueco de foto tiene tres capas, de arriba abajo:
1. La foto propia del salón en `img/` (si existe, es la que se ve).
2. Una foto de stock de Unsplash (se carga desde internet al abrir la página).
3. Un degradado cálido, por si no carga ninguna.

Nombres de archivo para las fotos propias:

| Archivo | Dónde sale |
|---|---|
| `img/hero.jpg` | Arco grande de la portada (vertical) |
| `img/detalle.jpg` | Arco pequeño de la portada |
| `img/novia.jpg` | Sección «Para novias» (vertical) |
| `img/galeria-1.jpg` … `img/galeria-7.jpg` | Galería |
| `img/mar.jpg` | Sección «Novias con vistas al mar» (horizontal) |
| `img/mar-2.jpg` | Fondo de la llamada final (horizontal) |

Las fotos de stock son solo para la maqueta: sustituirlas por fotos del propio salón (con su permiso y el de las clientas que salgan). Formato JPG, ~1600 px de lado mayor.

## Datos a confirmar con el salón
- **Horario**: solo consta «abre el lunes a las 9:00». En el `<script>` (`HORARIO`) se ha puesto L-V 9:00–20:00 como provisional.
- Servicios y años de experiencia sacados de su ficha en Bodas.net; reseñas, de Google.
- Correo, WhatsApp e Instagram: no encontrados; añadir si tienen.
