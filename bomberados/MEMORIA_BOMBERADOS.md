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
- **Momentos de venta = lo más destacado del vídeo** (Javi, 1 nov): «¡Bomberados!», «¡Pruébala gratis cinco días!» y «compártelo / mándaselo a tu compañero de oposición» son cuando se vende la app: la voz ahí tiene que sonar MÁS fuerte, con más ímpetu y más clara que todo lo demás (gancho incluido) y algo más pausada (≈ 5 sílabas/s), sin efectos que la tapen, y la imagen con su golpe más grande.
  Cómo: en `script_tts.txt` (eleven_v3) indicaciones de ímpetu en esas frases ([excited], [emphatic], [proud]), una pausa corta («…») antes de «¡Bomberados!» y mayúsculas en la palabra clave (p. ej. «¡Pruébala GRATIS cinco días!»; los subtítulos salen de `script.txt` y no cambian); el gancho, urgente pero sin gritar más que la venta. Medir cada toma con `bomberados/plantillas/pregunta/medir_voz.py` (tiene que dar «OK»; si da «OJO», otra toma o generar esas frases aparte) y poner `"realce": ["compartir", "marca", "prueba"]` en pregunta.json (la mezcla sube la voz +3 dB y baja los efectos −8 dB en esas frases). En el PAS (ya entregado) no se cumplió: venta −20/−22 dB frente al gancho −17 dB, y «mándaselo…» demasiado rápido (7,7 sílabas/s).
- Voz por defecto: Danny con eleven_v3 e indicaciones de emoción (ánimo: caótica en el caos, con ímpetu en la venta).
- **Forma de trabajar desde el 1 nov (Javi)**: yo escribo el guion (siguiente vídeo según Notion) y se lo mando en
  `GUION_PARA_GRABAR.txt` con `SendUserFile` (versión Eleven v3 con indicaciones entre corchetes + versión sin corchetes);
  **la voz la graba Javi** y me manda 2–3 tomas (elijo con `medir_voz.py`). ElevenLabs por API **solo para efectos de
  sonido** (la voz por API, solo si él lo pide). Mientras graba, voy haciendo la escena con tiempos provisionales.
- **Efectos de sonido muy profesionales y pegados a la imagen (Javi)**: cada sonido empieza cuando empieza en pantalla lo
  que lo produce y **acaba cuando acaba esa situación** (si el humo desaparece, el siseo se apaga en ese fotograma; si la
  lluvia para, la lluvia para). Nada de colas que sigan sonando tras el final visual ni sonidos que acaben antes que su imagen.
  En `compose.py`: `_tramo()` recorta o repite cada efecto a su tramo exacto (inicio, fin) con fundidos cortos.
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
| PD #4 PAS (el primero en un accidente) | `projects/bomberados_pas/` | **listo para subir** (26,1 s, voz v3 con ánimo, −15,5 LUFS; respuesta C; propuesta: miér 4 nov 14:00) |
| PD #5 Protección civil (¿qué ley?) | `projects/bomberados_proteccion/` | **listo para subir** (28,8 s; voz de Javi, Eleven v3; respuesta D; Notion: lun 2 nov 14:00) |
| ¿Qué nota sacarías? Dominadas (formato nuevo, para todo el mundo) | `projects/bomberados_dominadas/` | **listo para subir** (37,5 s; voz de Javi; tabla intermedia por CONFIRMAR; fecha por decidir) |
| Medio «Al fuego le falta una pieza» (¿triángulo o tetraedro?) | `projects/bomberados_tetraedro/` | **listo para subir** (2 nov; voz de Javi; efectos de ElevenLabs reutilizados; Notion: jue 5 nov 20:30) |
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
- Voz: Danny generada con la API (`bomberados/plantillas/pregunta/elevenlabs.py voz`). Primero con eleven_multilingual_v2
  (dijo «opósite» → en `script_tts.txt` va «oposíte»). Javi aprobó el vídeo pero pidió **voz con ánimo: caótica en el caos y
  con ímpetu en «¡Bomberados!» y en «mándaselo…»** → versión final con **eleven_v3 + indicaciones de emoción** ([panicked],
  [urgent], [tense], [excited], [energetic]; stability 0.5; 3 tomas, se elige la que el reconocedor entiende entera y tiene más
  variación de tono). **Usar este estilo de voz por defecto en Bomberados.** Las marcas de tiempo de v3 fallan a veces
  ~0,15 s tras una pausa: `elevenlabs.py` las engancha al inicio real de la voz (`snap`).
- `ajustar_voz.py` tenía un fallo: en vez de dejar la pausa pedida (`pause`, 0,17 s dentro de la frase) la RESTABA del
  silencio (frases pegadas). Arreglado el 1 nov: ahora deja exactamente esa pausa. Los vídeos anteriores no cambian.
- Escena: fondo nuevo «carretera» (`bomberados/plantillas/pregunta/carretera.js`): POV de noche con lluvia, relámpago en el
  primer fotograma, aviso ⚠ con la distancia, frenazo con ABS y velocímetro 72 → 0, coche accidentado con la luna rota, vapor y
  cristales, encuadre naranja, chip «1 HERIDO» con ECG y anillo sobre la cabeza del conductor, grúa de cámara al decir
  «herido», opciones con iconos, pulso rojo en «instinto», cuenta atrás al ritmo de los intermitentes, letras que se vuelven
  bocadillos en «comenta», y la lluvia que se convierte en brasas en «Bomberados». No sale «PAS» en pantalla.
- Sonido: 12 efectos generados con la API de efectos de ElevenLabs (`assets/sfx/`), colocados en `compose.py`
  (`sfx_track_pas`): trueno, lluvia dentro/fuera (baja sola con la voz), frenazo, vapor, latido al ritmo del ECG, relé de los
  intermitentes (más fuerte en la cuenta atrás), golpe de tensión, brasas y marca. Mezcla −16 LUFS.
- Render: ≈ 1,1 fotogramas/s con 4 procesos (≈ 23 min para 26 s) + composición ≈ 2 min.
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

### PD #5 Protección civil — cómo se hizo (1 nov)
- Primer vídeo con el flujo nuevo: guion mío → voz de Javi (una toma, Eleven v3 con indicaciones; `medir_voz.py` dio «OK»:
  venta −21 dB frente a −22 dB del resto y tono 184–237 Hz) → escena «escritorio» (`leyes.js`) → 15 efectos de ElevenLabs
  pegados a su imagen (`sfx_track_leyes`, `_tramo`). Mezcla con «realce»: venta −12/−13 dB frente al gancho −15 dB.
- ElevenLabs devolvió casi silencio para «quiet room tone»: `_to()` ya no sube más de +24 dB (antes lo convertía en ruido).
- Limitador de la mezcla a −1 dBFS (antes −0,5): con el realce el pico real pasaba de 0 dBFS.

## Alcance y siguiente paso (Javi, 1 nov)
- Las Preguntas del día rondan las **10.000 visitas de media con poca interacción**. Se siguen haciendo (familiaridad con la
  serie), pero hay que alternar con formatos de más alcance e interacción.
- Formato nuevo (FORMATOS nº 13): **«¿Qué nota sacarías en la prueba física de bombero?»**, pensado para cualquier persona
  que entrene (más alcance), con el muñeco de bombero haciendo la prueba, el contador y la nota subiendo según el baremo
  oficial, partes con voz y una parte sin voz (la demostración), técnica para que no te anulen repeticiones y la pregunta
  «¿cuántas haces tú? comenta tu número». Primero: dominadas (Decreto 36/2025 de Andalucía; tabla intermedia por CONFIRMAR).
  Siguientes ideas: colocar un puntal (buscar convocatoria con baremo por tiempo), trepa de cuerda, press de banca, 100 m.

### ¿Qué nota sacarías? Dominadas — cómo se hizo (1 nov)
- Escena `bomberados/plantillas/pregunta/dominadas.js` (sustituye el renderAt de scene.js; config en `video.json`, que ahora
  leen scene.js, compose.py, portada.py y medir_voz.py): estudio claro, muñeco de bombero con cinemática real de dominada
  (manos fijas, codos por IK), contador, nota por umbral, escala H/M, ×4 honesto en la parte acelerada, técnica ✓/✗ y venta.
- La parte sin voz es el hueco de `voz.count` tras la frase 2 (`count_line: 1`): ajustar_voz.py la mete sola.
- El reconocedor oyó «1 minadas» en el archivo entero; aislado oye «once dominadas»: se corrigieron esas dos palabras a mano.
- Mezcla: música solo en la parte sin voz; venta −14,8/−13,8 dB frente al gancho −15,6. Limitador de la plantilla a −1,5 dBFS
  (con AAC el pico real pasaba de 0 dBFS) y «ganancia» −0,4 → −15,8 LUFS, pico −0,7.
- Render ligero: 2,8 fotogramas/s (37 s en 14 min). Si se cambia un tramo, se puede renderizar solo ese rango
  (`capture.mjs out/frames --range A B w 4`) y volver a componer.

### Medio «Al fuego le falta una pieza» (¿triángulo o tetraedro?) — 2 nov
- Javi preguntó «lo del vídeo medio, ¿cómo lo hacemos o sobre qué?» → el siguiente medio de Notion (jue 5 nov 20:30,
  «Explicado en 30 s»), con un gancho para todo el mundo: «Te enseñaron que el fuego es un triángulo… y le falta una pieza».
  Alternativas que se le dieron: sartén con aceite + agua (Mito o realidad, sáb 7: el más «para todo el mundo») y
  «¿Puedes ser bombero solo con la ESO?» (hay que comprobar convocatorias).
- Escena `bomberados/plantillas/pregunta/tetraedro.js` (ver README de la plantilla) y `tiempos_prov.py` para trabajar sin voz.
- Fuentes: INSST NTP 599, NTP 99 y Tema 5 (insst.es no abre desde aquí: comprobar frases). El vídeo dice que el polvo
  apaga las llamas «de otra forma» (inhibición de la reacción en cadena), no que solo actúe así.
- ElevenLabs NO estaba conectado en esta sesión (el proxy no añadía la clave: 401/«API key is invalid»). Se resolvió
  reutilizando la biblioteca de efectos de ElevenLabs de los vídeos anteriores (copiados en `assets/sfx`): fuego, brasas,
  vapor (chorro del extintor y humo), cepo (eslabón que se parte), barra (eslabones), golpe (tetraedro), diez (rótulo),
  whoosh, nota, latido, toque, burbuja, destello, avión y marca. Para generar efectos nuevos: Network secrets del entorno
  con `api.elevenlabs.io` y cabecera `xi-api-key` (sin prefijo), nunca la clave en el chat.
- Voz de Javi (una toma): el reconocedor la entendió entera; `medir_voz.py` OK. En video.json, las claves de `voz.pause`
  son el número de frase (desde 1) tras la que va la pausa.

## Idea de Javi (2 nov): «dron» alrededor de una persona que habla a cámara
- Pregunta: con un vídeo de una persona hablando y fotos de lo que tiene delante y a los lados, ¿se pueden hacer varias
  escenas como si un dron girara a su alrededor mientras sigue hablando a cámara? Respuesta: sí, en «2,5D»: se recorta a la
  persona fotograma a fotograma (segmentación: el modelo selfie de MediaPipe y los de rembg/RobustVideoMatting se descargan
  bien desde aquí) y se coloca como un panel dentro del sitio reconstruido con las fotos (panorama alrededor + suelo) en
  three.js; la cámara virtual vuela en arcos (mejor 30–90° por plano, con cortes), y él sigue mirando a cámara. Límites: es un
  recorte plano (no se le ve el perfil), la luz del vídeo y de las fotos tiene que coincidir y no deben verse los pies.
  Pedirle: vídeo en trípode con margen alrededor, panorámica de 360° (o 6–8 fotos solapadas) desde el sitio exacto donde
  estaba, misma luz y hora, y unos segundos del fondo sin él. Primero una prueba de 5 s.
- Javi propuso añadir **Higgsfield** (2 nov). No hay conector para Claude; tiene API oficial (docs.higgsfield.ai: clave
  «Key ID» + «Secret», imagen → vídeo con movimientos de cámara como órbita 360° o dron, y otros modelos como Kling o
  Seedance). Con ella los planos de dron serían 3D de verdad (se le ve el perfil), pero cada plano dura pocos segundos, el
  modelo se inventa lo que no ve y la boca no sigue la voz → mezclar planos reales hablando + planos de dron generados con
  la voz por encima (o sincronizar labios después). Para usarla desde aquí: permitir api.higgsfield.ai, cloud.higgsfield.ai
  y platform.higgsfield.ai en el acceso a red del entorno (hoy están bloqueados) y guardar la clave como variables
  `HIGGSFIELD_KEY_ID` y `HIGGSFIELD_KEY_SECRET`; vale desde la siguiente sesión. Gasta créditos de Higgsfield por plano.
