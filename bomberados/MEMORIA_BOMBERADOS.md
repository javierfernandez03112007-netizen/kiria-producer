# Memoria de Bomberados (léela al empezar cualquier sesión de Bomberados)

Todo lo hablado con Javi en la conversación de octubre–noviembre 2026 sobre Bomberados / Élite Bomberos. Complementa a
`bomberados/MARCA.md`, `FORMATOS.md` e `IDEAS.md` (léelos también) y a `MEMORIA.md` (general del repo).

## La marca y el objetivo
- **Bomberados**: app para opositores a bombero de la academia **Élite Bomberos** (Instagram **@elitebomberos**; la web
  elitebomberos.com no abre desde las máquinas de la nube). Profesor: **Adrián Luna**.
- Objetivo: escalar Bomberados en Reels, TikTok y Shorts con muchos vídeos baratos (serie diaria «Pregunta del día» + medios + estrella).
- Plan completo (documento): https://claude.ai/artifact/QPzFnpSRGB35RgCeqVNHsK
- Funciones de la app vistas en capturas reales: estudiar solo, **1 vs 1**, **Battle Royale hasta 6 jugadores**, dificultad del rival
  (Fácil 40 %, Medio 55 %, Difícil 75 %), modo callejero de Albacete (2147 calles, 431 lugares). «Prueba gratis 5 días» y la IA que dice
  manual y página: **CONFIRMAR** con la marca. Estilo visual de la app: fondo oscuro, Bebas en mayúsculas con palabra clave en naranja
  (#FF7A1A), tarjetas oscuras con borde fino, círculos de letra turquesa/naranja/rosa/violeta, rejilla de puntos.

## Reglas fijas (de Javi)
- Datos y preguntas de temario **siempre con fuente oficial** en `FUENTES.md`; funciones de la app, «CONFIRMAR».
- 1080x1920, 60 fps, voz **Danny** de ElevenLabs («Relatable, Expressive and Warm»; NO «Deep Monotone»), subtítulos Impact palabra a palabra.
- Commit y push a `master` siempre, sin PR. Máquinas extra en la nube solo con permiso cada vez.
- Hook verdadero y apuntado en «Hooks ya usados» de `engine/HOOKS.md`. Nada de datos inventados ni ataques a la competencia;
  colaboraciones pagadas con #publi (si lo publica la propia academia, no hace falta).
- La respuesta de la Pregunta del día NO va en el vídeo: va al final de la descripción, tras el bloque fijo de Bomberados.
- **Importante para responder**: Javi solo ve bien el **último mensaje** de cada turno; lo que escribo a mitad del trabajo no le aparece.
  Los guiones y entregas van en el mensaje final y en archivos con `SendUserFile` (esos sí los ve). Le gusta que sea rápido.

## Cómo se hace una Pregunta del día (plantilla `bomberados/plantillas/pregunta/`, ver su README)
1. `projects/<p>/`: `pregunta.json`, `script.txt` (subtítulos, con cifras), `script_tts.txt` (para ElevenLabs: «be, ce, de», números en
   letra), `GUION_PARA_GRABAR.txt`, `web/index.html` (copia de otro proyecto), `web/node_modules` → `../../fp_carrera/web/node_modules`.
2. Voz en `assets/voz_original.mp3` → `asr.py` (Parakeet, modelo en `/root/asr/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`) →
   `ajustar_voz.py projects/<p>` (acorta pausas, mete el silencio de la cuenta atrás, atempo; lee `voz` de `pregunta.json` o `video.json`).
   Si el reconocedor dice «sin oír» alguna palabra, comprobar si la voz la dijo de verdad (Danny a veces se salta palabras) y quitarla de
   `script.txt` si no.
3. Prueba rápida: `cd projects/<p> && PROJ=projects/<p> FPS=60 node ../../bomberados/plantillas/pregunta/capture.mjs out/test 1,5,9` y
   `python3 bomberados/plantillas/pregunta/compose.py projects/<p> --test 1 5 9` (subtítulos encima, en `out/ctest`).
4. `bomberados/plantillas/pregunta/render.sh projects/<p>` (4 procesos, ≈ 10 min para 27 s) → `compose.py projects/<p>` (≈ 1,5 min) →
   `portada.py projects/<p>` (fotograma de `opciones` + 1,3 s; textos en `pregunta.json` → `portada`).
5. Entregar `out/<p>.mp4`, `out/portada.jpg`, `out/portada_grid.jpg` y `DESCRIPCION.txt` con `SendUserFile`; actualizar Notion.
- Estilo «app» (`"estilo": "app"`): Bebas, tarjetas oscuras, rejilla de puntos, chispas, cámara que empuja, estelas en cada bloque,
  barra de progreso. Intros propias por vídeo (`"intro"`: `reduccion`, `respiracion`, `adr`). Impact: `python3 engine/fonts/get_impact.py`
  (necesita cabextract; no se sube). Si faltan: `pip install opencv-python-headless`; three en `fp_carrera/web` con
  `npm install --no-save --no-package-lock three@0.170.0`.

## Vídeos hechos
| Vídeo | Proyecto | Estado |
|---|---|---|
| «Ocho de cada diez opositores…» | `projects/bomberos/` | publicado 28 oct (24.800 visitas, 13 com., 394 compartidos) |
| Aceite en la sartén (V o F) | `projects/bomberados_ia/` | publicado 29 oct (6.604 / 7 / 112) |
| PD #1 Reducción 45→25 mm | `projects/bomberados_reduccion/` | publicado 29 oct (19.800 / 22 / 129) |
| PD #2 Bradipnea (examen Albacete 2026) | `projects/bomberados_bradipnea/` | publicado 30 oct (12.900 / 14 / 109) |
| PD #3 Panel naranja ADR (estilo app) | `projects/bomberados_adr/` | **listo para subir** (26,7 s; Notion: mar 3 nov 14:00; respuesta B) |
| Promo 2º simulacro examen bombero Ciudad Real | `projects/bomberados_simulacro/` | **entregado** 31 oct (21,8 s, 12 €, para la cuenta @elitebomberos) |
| PD #4 PAS (el primero en un accidente) | `projects/bomberados_pas/` | **listo para subir** (25,1 s; respuesta C; propuesta: miér 4 nov 14:00) |
Lo que más se comparte: vídeos sobre la propia oposición y preguntas con trampa (compartidos por cada 1.000 visitas: Ocho 15,9,
Aceite 17,0, Reducción 6,5, Bradipnea 8,4).

### Simulacro (Ciudad Real) — datos y pendientes
- Cartel de la academia: «SEGUNDO SIMULACRO · EXAMEN OPOSICIÓN BOMBERO · CIUDAD REAL · DOMINGO 1 DE OCTUBRE · 12 €». La fecha del cartel
  está mal (el 1 oct 2026 fue jueves): es el **domingo 1 de noviembre**. Javi dijo antes: online, en directo, con Adrián Luna; inscripción
  por el Instagram de Élite Bomberos; hora sin fijar. Pendiente de Javi: ¿inscripción por DM o enlace de la bio? ¿sigue siendo online y
  con Adrián? En la voz final Danny no dijo «En directo» (quitado de subtítulos; el cartelito EN DIRECTO sí sale).
- Escena propia: `projects/bomberados_simulacro/web/scene.js` (hoja con ✗ y SUSPENSO → calendario 0→1 → SEGUNDO SIMULACRO / EXAMEN
  OPOSICIÓN BOMBERO / CIUDAD REAL / EN DIRECTO / Adrián Luna → casa con portátil + etiqueta 12 € → APÚNTATE @elitebomberos → ✗→✓ →
  BOMBERADOS). Composición: `compose_simulacro.py`; portada: `portada.py`; config: `video.json`.

### PD #4 PAS — hecho (1 nov), cómo se hizo
- Guion final (`script.txt`): «Llegas el primero a un accidente de tráfico. / Hay un herido. ¿Qué es lo primero que haces? /
  Ojo, que el instinto te la juega… Tienes cinco segundos. / ¿A, B, C o D? Comenta tu letra y mándaselo a quien oposite
  contigo, a ver quién acierta. / La solución, en la descripción. / Bomberados: falla en casa, no en el examen. / Pruébala
  gratis cinco días.» («Comenta tu letra» en vez de «tu respuesta»: más concreto). Respuesta C (Proteger), en la descripción.
- Voz: Danny generada con la API (`bomberados/plantillas/pregunta/elevenlabs.py voz`, eleven_multilingual_v2, stability 0.38,
  style 0.35); en la primera toma dijo «opósite» → en `script_tts.txt` va «oposíte». La v3 salió lenta y teatral (descartada).
- Escena: fondo nuevo «carretera» (`bomberados/plantillas/pregunta/carretera.js`): POV de noche con lluvia, relámpago en el
  primer fotograma, aviso ⚠ con la distancia, frenazo con ABS y velocímetro 72 → 0, coche accidentado con la luna rota, vapor y
  cristales, encuadre naranja, chip «1 HERIDO» con ECG y anillo sobre la cabeza del conductor, grúa de cámara al decir
  «herido», opciones con iconos, pulso rojo en «instinto», cuenta atrás al ritmo de los intermitentes, letras que se vuelven
  bocadillos en «comenta», y la lluvia que se convierte en brasas en «Bomberados». No sale «PAS» en pantalla.
- Sonido: 12 efectos generados con la API de efectos de ElevenLabs (`assets/sfx/`), colocados en `compose.py`
  (`sfx_track_pas`): trueno, lluvia dentro/fuera (baja sola con la voz), frenazo, vapor, latido al ritmo del ECG, relé de los
  intermitentes (más fuerte en la cuenta atrás), golpe de tensión, brasas y marca. Mezcla −16 LUFS.
- Render: ≈ 1,1 fotogramas/s con 4 procesos (1.505 fotogramas en 22,7 min) + composición 1,8 min. Vídeo: 20,3 MB, −16,1 LUFS.
  Portada: fotograma 2,1 s tras las opciones. Notion: fila 409d785b-2d75-818c-be6c-cc95d13f2993 en «Listo para subir» (su fecha,
  dom 1 nov, es anterior a la Nº 3: Javi decide; propuesta miér 4 nov 14:00).
- Pendiente antes de publicar: comprobar en dgt.es lo de la baliza V-16 (citada en la explicación) y la prueba de 5 días.
- Fuentes (honestidad): DGT «Qué hacer ante un accidente de tráfico», Cruz Roja «En mi carretera», RACE y Ministerio de
  Sanidad (módulo 6); dgt.es y sanidad.gob.es no abren desde estas máquinas («comprobar página»). Ver `FUENTES.md`.

## Notion (centro de trabajo de Javi; MCP de Notion)
- Página «🚒 Bomberados — Centro de trabajo»: 409d785b-2d75-8116-bfcf-c9cf65d9f2ed (guías: Plan y formatos, Horarios, Cómo analizar).
- BD **Vídeos de Bomberados**: collection://5422fb68-0692-456e-8aac-49a9c79151c9 (vista principal ordenada por «Publicación (día y
  hora)»; estados: Idea, Guion, Voz grabada, En producción, Listo para subir, Programado, Publicado, Descartado; horas en CET = UTC+1).
  Filas: ADR 409d785b-2d75-817b-b6c9-ded54b8406f2 (Listo para subir); Simulacro 40ad785b-2d75-8161-bf9f-e950f0e762a1 (Listo para subir);
  PAS: 409d785b-2d75-818c-be6c-cc95d13f2993 (Listo para subir; fecha por decidir, después de la ADR). Hay una fila duplicada de bradipnea creada por Javi
  (40ad785b2d7580e48f2fef57fe507f62): no borrarla sin su permiso.
- BD **Agenda**: collection://4c1519e9-87cc-4110-8c5b-625ed6610ef6 (filas diarias «📤 publicar» del 31 oct al 30 nov; el lote del 16 al
  30 nov se creó en segundo plano y no se ha comprobado). Rutina semanal: lunes revisión + temas + guiones + Javi graba voces a las 18:00,
  render del lote lunes 19:00–martes 12:00, miércoles–jueves medios, viernes carrusel + BOE.

## Otras ideas pendientes
- Medio «¿Puedes ser bombero solo con la ESO?» (titulaciones ESO / Bachiller / FP; verificar TREBEP art. 76, convocatoria de Madrid C1
  y una convocatoria oficial; si no se encuentra la de Cataluña, quitarla). Hueco propuesto: mar 3 nov 20:30.
- Pedir a la marca: logo y colores oficiales, capturas, precio, temarios, ejemplos reales de la IA, si la prueba de 5 días es real.
- ElevenLabs: generar la voz y los efectos con `bomberados/plantillas/pregunta/elevenlabs.py` (ver `MEMORIA.md` si falla la clave).
- Siguiente Pregunta del día: reutilizar el fondo «carretera» solo si la pregunta pasa en carretera; si no, el de brasas.
