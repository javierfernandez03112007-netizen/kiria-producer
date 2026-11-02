# Plantilla «Pregunta del día» (Bomberados, formato 3)

Vídeo 2D de 20–30 s: intro propia de cada pregunta → enunciado + 4 opciones a la vez → cuenta atrás de 5 s →
«¿A, B, C o D?» → «La respuesta, en la descripción» → placa BOMBERADOS + «Pruébala gratis 5 días».
Chispas de fuego realistas por detrás, subtítulos Impact palabra a palabra, 1080x1920 a 60 fps.

## Pasos (≈ 20–30 min por vídeo)

1. `projects/bomberados_<nombre>/` con `pregunta.json` (enunciado, opciones, correcta, fuente, cues, voz, subs_key,
   portada), `script.txt` (guion), `script_tts.txt` (para ElevenLabs, números y letras escritos como se dicen),
   `web/index.html` (copia de otro proyecto) y `web/node_modules` → `../../fp_carrera/web/node_modules`.
2. La voz (Danny) en `assets/voz_original.mp3`: la manda Javi o se genera con la API
   (`python3 bomberados/plantillas/pregunta/elevenlabs.py voz projects/<p>`, que además deja `asr_original.json` con los
   tiempos exactos de ElevenLabs; luego comprobar con `asr.py` que dijo todas las palabras y con el acento bien).
3. `python3 bomberados/plantillas/pregunta/asr.py projects/<p>/assets/voz_original.mp3 projects/<p>/asr_original.json`
   (solo si la voz la manda Javi)
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

## Fondo «carretera» e intro «pas» (`carretera.js`, Nº 4)

`"fondo": "carretera"` + `"intro": "pas"` en pregunta.json y, en `web/index.html`, cargar `carretera.js` DESPUÉS de
`scene.js`. Escena 2D con perspectiva real (focal 1.400 px): POV de noche bajo la lluvia a 72 km/h, relámpago en el primer
fotograma, aviso ⚠ con la distancia, frenazo con cabeceo y ABS (cue `accidente`), coche accidentado (malla de caras
proyectadas, luna rota, piloto roto, vapor, cristales), chip «1 HERIDO» con ECG y la grúa de cámara que sube (cue
`herido`), pulso rojo en `instinto`, intermitentes al ritmo de la cuenta atrás y la lluvia que se convierte en brasas en
`marca`. Render ≈ 1 fotograma/s con 4 procesos (25 s → ≈ 25 min).
Sonido: `compose.py` usa `assets/sfx/*.mp3` (efectos de ElevenLabs) y `sfx_track_pas`; `"mezcla": {"sfx": 1.0, "ganancia": 1.1}`
(«ganancia»: dB sobre la mezcla final, para quedar en ≈ −15,5 LUFS con una voz muy dinámica).

Otras opciones nuevas de pregunta.json: `"ey"` (altura de la tarjeta del enunciado), `"iconos"` (phone, cross, shield,
exit: icono tras la letra), cue `"comenta"` (las letras se vuelven bocadillos), `"portada": {"desfase": 2.1}` (fotograma
de la portada, en s tras las opciones).

## Momentos de venta (regla de Javi): lo más destacado del vídeo

La llamada a compartir («mándaselo / compártelo con tu compañero de oposición»), «¡Bomberados!» y «¡Pruébala gratis cinco
días!» tienen que sonar más fuertes, con más ímpetu y más claras que todo lo demás (gancho incluido) y algo más pausadas:
- Voz: indicaciones de ímpetu en `script_tts.txt` (eleven_v3), pausa «…» antes de «¡Bomberados!», mayúsculas en la palabra
  clave. Comprobar cada toma con `python3 bomberados/plantillas/pregunta/medir_voz.py projects/<p> [--toma <dir>]` → «OK».
- Mezcla: `"realce": ["compartir", "marca", "prueba"]` en pregunta.json → `compose.py` sube la voz +3 dB y baja los
  efectos −8 dB en esas frases (rampas de 80 ms).
- Imagen: el golpe más grande del vídeo en esos momentos (zoom, destello), sin nada que compita.

## Fondo «escritorio» e intro «leyes» (`leyes.js`, Nº 5)

`"fondo": "escritorio"` + `"intro": "leyes"` y, en `web/index.html`, `leyes.js` DESPUÉS de `scene.js`. Escritorio de opositor
de noche con flexo: caen cuatro libros (`"libros": [["LEY", "2/1985"], …]`, con la letra de cada opción), un cepo de acero se
cierra en el cue `trampa`, un rotativo se enciende en `civil0`, la cámara sube en `enunciado`, un sello DEROGADA baja en
`derogada` y flota de libro en libro con la cuenta atrás sin posarse (no da la respuesta), y los libros arden en `marca`.
`"cuenta_pos": [x, y, r]` coloca la cuenta atrás (aquí a la derecha, para que se vea el sello). Sonido: `sfx_track_leyes`
con `_tramo()`: cada efecto se recorta o se repite para que acabe justo cuando acaba su imagen.
Otras opciones: `"compartir_a"` (a quién va el avión de papel) y el golpe visual de los momentos de venta (`"realce"`).

## Formato 9 «Explicado en 30 s»: escena «tetraedro» (`tetraedro.js`, vídeo medio del 5 nov)

`video.json` con `"formato": "tetraedro"` y, en `web/index.html`, `tetraedro.js` DESPUÉS de `scene.js` (sustituye `renderAt`).
Pizarra de clase pintada una vez (`makeBoard`): triángulo de tiza que arde como una mecha en el primer fotograma (rastro de
llamitas, chispas, cámara que se abre), llama central (`flame`), el triángulo se despega en 3D (`proj`, giro yaw/pitch) con
una cuarta esquina «?», insignias con icono (`badge`: tronco, O₂, termómetro, cadena), extintor con nube de polvo
(`extinguisher`, `powder`), anillo de eslabones de fuego que se encienden unos a otros y se parte (`ringScene`),
tetraedro 3D con caras de cristal que gira, encuesta TRIÁNGULO / TETRAEDRO que se vuelve bocadillos y estallido en brasas
antes de la placa. Cues: ver `projects/bomberados_tetraedro/video.json`. La línea de tiempo `TT` (en `ttInit`) es la que
tiene que repetir `compose.py` para los efectos.

## Tiempos provisionales (para hacer la escena mientras Javi graba)

`python3 bomberados/plantillas/pregunta/tiempos_prov.py projects/<p>` → `tiempos.json` repartido por sílabas (≈ 6,3 sílabas/s;
las frases de venta a ≈ 5). Con la voz de verdad, `asr.py` + `ajustar_voz.py` lo sustituyen.
