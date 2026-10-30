# Plantilla «Pregunta del día» (Bomberados, formato 3)

Vídeo 2D de 20–30 s: intro propia de cada pregunta → enunciado + 4 opciones a la vez → cuenta atrás de 5 s →
«¿A, B, C o D?» → «La respuesta, en la descripción» → placa BOMBERADOS + «Pruébala gratis 5 días».
Chispas de fuego realistas por detrás, subtítulos Impact palabra a palabra, 1080x1920 a 60 fps.

## Pasos (≈ 20–30 min por vídeo)

1. `projects/bomberados_<nombre>/` con `pregunta.json` (enunciado, opciones, correcta, fuente, cues, voz, subs_key,
   portada), `script.txt` (guion), `script_tts.txt` (para ElevenLabs, números y letras escritos como se dicen),
   `web/index.html` (copia de otro proyecto) y `web/node_modules` → `../../fp_carrera/web/node_modules`.
2. La voz (Danny) en `assets/voz_original.mp3`.
3. `python3 bomberados/plantillas/pregunta/asr.py projects/<p>/assets/voz_original.mp3 projects/<p>/asr_original.json`
4. `python3 bomberados/plantillas/pregunta/ajustar_voz.py projects/<p>` → `assets/voz.mp3` + `tiempos.json`
5. `bomberados/plantillas/pregunta/render.sh projects/<p>` → `out/frames` (≈ 8 min, 4 procesos)
6. `python3 bomberados/plantillas/pregunta/compose.py projects/<p>` → `out/<p>.mp4`
7. `python3 bomberados/plantillas/pregunta/portada.py projects/<p>` → `out/portada.jpg`, `out/portada_grid.jpg`

Pruebas rápidas: `PROJ=projects/<p> FPS=60 node bomberados/plantillas/pregunta/capture.mjs projects/<p>/out/test 1,5,9`
y `python3 bomberados/plantillas/pregunta/compose.py projects/<p> --test 1 5 9` (con subtítulos) o `--sfx`.

## Intros que hay (`"intro"` en pregunta.json)

- `reduccion`: manguera estrangulada con chorro → reducción en corte con cotas Ø y manómetro con «?» (cues `manometro`, `d1`, `d2`).
- `respiracion`: pulmones de brasa que respiran → sello «EXAMEN OFICIAL» (cues `sello`, `albacete`, `anio`) →
  monitor «FR ? rpm» con la onda (cue `fr`).

Cues comunes: `enunciado`, `opciones`, `cuenta` (empieza la cuenta atrás), `letras` (A, B, C, D), `descripcion`,
`marca`, `prueba`. Cada cue es `[palabra, nº de aparición, nº de frase]`.
Opcionales: `"examen"` (rótulo rojo bajo la marca en el HUD), `"resaltar"` (palabras del enunciado en oro).
