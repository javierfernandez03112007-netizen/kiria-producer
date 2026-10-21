# kiria-producer

Productor de reels para el canal kiria.ai (economía, España). Antes de hacer o tocar cualquier vídeo, lee y
cumple `engine/REGLAS.md` (retención: primer segundo rarísimo, cada frase visible al oírla con objetos que se
transforman, respuesta al final; honestidad y estilo) y usa `engine/GUION.md` para el guion.

Motor: `engine/` (Python: audio, subtítulos, marioneta, dibujo 2D) y `engine/web/` (three.js: `morph.js`,
`cues.js`). Cada vídeo vive en `projects/<nombre>/` con `web/` (escena 3D renderizada con Playwright),
`compose_*.py` (subtítulos, marioneta, voz), `FUENTES.md` y `DESCRIPCION.txt`.

Formatos guardados: `engine/FORMATO_CODIGO.md` (algoritmos: monitor con código arriba + barras 3D de plástico abajo,
sonido sintetizado con `engine/sfx.py`; plantilla `projects/burbuja/`).
