# kiria_producer

Productora automática de reels verticales (1080x1920, 30 fps) para **kiria.ai**: Python + OpenCV + numpy + PIL + ffmpeg.

## Estructura

```
engine/
  fin_draw.py   primitivas 2D: texto, cristal, halos, chips, monedas, iconos, NPCs, fondos y cámara
  audio.py      alineación voz ↔ guion sin Whisper (silencios RMS + programación dinámica)
  post.py       zoom-through con desenfoque radial, glitch, viñeteado, grano y marca
  fonts/        Inter (OFL) y DejaVu Sans Mono
projects/
  inflacion/    reel «Inflación 4,9 %: el boss final de tu cartera»
```

## Flujo de un proyecto (ejemplo: inflación)

```bash
pip install opencv-python-headless numpy pillow      # y ffmpeg en el sistema
cd projects/inflacion

# 1. Ritmo de la voz (acorta pausas, +4 % de velocidad sin cambiar el tono)
python3 tools_ajustar_voz.py assets/voz_original.mp3 assets/voz.mp3

# 2. Tiempos de cada frase y pausas
(cd ../.. && python3 -m engine.audio projects/inflacion/assets/voz.mp3 projects/inflacion/script_tts.txt projects/inflacion/tiempos.json)

# 3. Previsualización y render
python3 render_inflacion.py --preview          # out/preview/hoja_contactos.jpg
python3 render_inflacion.py                    # out/inflacion.mp4 (libx264 crf 16, loudnorm -15 LUFS)

# 4. Portada
python3 portada.py                             # out/portada.jpg
```

Fondos: si existe `assets/<fondo>.jpg` (juego, cafeteria, fruteria, restaurante, obra, aula, ciudad) se usa la
foto con cámara, desenfoque y tono de marca; si no, un fondo procedimental. Se controla con `USAR_FOTOS`.
