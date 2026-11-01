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
| PD #4 PAS | `projects/bomberados_pas/` | **guion entregado, falta la voz y la escena** (ver abajo) |
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

### PD #4 PAS — lo que falta (siguiente tarea)
- Guion (ya entregado, en `projects/bomberados_pas/GUION_PARA_GRABAR.txt`):
  «Llegas el primero a un accidente de tráfico. / Hay un herido. ¿Qué es lo primero que haces? / Ojo, que el instinto te la juega…
  Tienes cinco segundos. / ¿A, be, ce o de? Comenta tu respuesta y mándaselo a quien oposite contigo, a ver quién acierta. / La
  solución, en la descripción. / Bomberados: falla en casa, no en el examen. / Pruébala gratis cinco días.»
- Pregunta: «Llegas el primero a un accidente de tráfico con un herido. ¿Qué es lo primero que debes hacer?» A) Llamar al 112.
  B) Atender al herido. C) **Proteger el lugar del accidente** (correcta). D) Sacar al herido del vehículo. Config en `pregunta.json`
  (Nº 4, `"intro": "pas"`, `"fondo": "carretera"`, `"secciones"`, `"iconos"`). Publicar después de la ADR (Nº 3).
- Javi pidió: «muy muy profesional, mucho flujo óptico, que enganche de principio a fin, cambia el fondo si ayuda». Diseño acordado
  (falta programarlo en la plantilla `scene.js` + efectos en `compose.py`):
  - Fondo nuevo «carretera»: de noche, POV a ~85 km/h con perspectiva (focal ~1400 px, cámara a 1,2 m), discontinuas y postes con
    captafaros que pasan, lluvia, líneas de velocidad; a lo lejos parpadean los **intermitentes de emergencia** (periodo ≈ 0,88 s).
  - En «accidente»: frenazo (cabeceo + sacudida + chirrido) y se para a ~5 m de un coche accidentado visto por detrás, inclinado,
    con humo, luna rota, piloto que parpadea y cristales en el suelo; faros propios lo iluminan.
  - En «herido»: chip «1 HERIDO» con latido (ECG) sobre el coche + sonido de corazón.
  - En «qué»: la cámara sube y se aleja (horizonte 770→480, altura 1,2→2,5 m, distancia 5→11 m) y entra la tarjeta de la pregunta
    (hacer `EY` configurable, p. ej. `"ey": 840`, porque el enunciado ocupa 3 líneas); paralaje lento de cámara para no perder movimiento.
  - Opciones con icono tras la letra (móvil/112, cruz, escudo, salida), sin pisar el lado derecho (botones de TikTok/Reels).
  - Cuenta atrás al ritmo del «tic-tac» del relé de los intermitentes; lluvia siempre; al llegar a «Bomberados» vuelve el fondo de
    brasas con la placa.
  - No poner «PAS» en pantalla (delataría la respuesta). La explicación PAS va al final de la descripción.
- Fuente (honestidad): conducta PAS = Proteger, Avisar (112), Socorrer, en ese orden (Cruz Roja, manual de primeros auxilios básicos;
  Ministerio de Sanidad, «Accidentes, módulo 6»: sanidad.gob.es/ca/ciudadanos/accidentes/docs/modulo6.pdf; DGT). Desde estas máquinas
  no abren sanidad.gob.es, gobiernodecanarias.net ni defensa.gob.es: citar con la URL y marcar «comprobar página». No mover al herido
  salvo peligro inminente. Si se menciona la baliza V-16 (obligatoria desde 2026 según la DGT), verificarlo en la web de la DGT.

## Notion (centro de trabajo de Javi; MCP de Notion)
- Página «🚒 Bomberados — Centro de trabajo»: 409d785b-2d75-8116-bfcf-c9cf65d9f2ed (guías: Plan y formatos, Horarios, Cómo analizar).
- BD **Vídeos de Bomberados**: collection://5422fb68-0692-456e-8aac-49a9c79151c9 (vista principal ordenada por «Publicación (día y
  hora)»; estados: Idea, Guion, Voz grabada, En producción, Listo para subir, Programado, Publicado, Descartado; horas en CET = UTC+1).
  Filas: ADR 409d785b-2d75-817b-b6c9-ded54b8406f2 (Listo para subir); Simulacro 40ad785b-2d75-8161-bf9f-e950f0e762a1 (Listo para subir);
  PAS: fila del dom 1 nov 12:00 (sin producir; pasarla a «Guion»). Hay una fila duplicada de bradipnea creada por Javi
  (40ad785b2d7580e48f2fef57fe507f62): no borrarla sin su permiso.
- BD **Agenda**: collection://4c1519e9-87cc-4110-8c5b-625ed6610ef6 (filas diarias «📤 publicar» del 31 oct al 30 nov; el lote del 16 al
  30 nov se creó en segundo plano y no se ha comprobado). Rutina semanal: lunes revisión + temas + guiones + Javi graba voces a las 18:00,
  render del lote lunes 19:00–martes 12:00, miércoles–jueves medios, viernes carrusel + BOE.

## Otras ideas pendientes
- Medio «¿Puedes ser bombero solo con la ESO?» (titulaciones ESO / Bachiller / FP; verificar TREBEP art. 76, convocatoria de Madrid C1
  y una convocatoria oficial; si no se encuentra la de Cataluña, quitarla). Hueco propuesto: mar 3 nov 20:30.
- Pedir a la marca: logo y colores oficiales, capturas, precio, temarios, ejemplos reales de la IA, si la prueba de 5 días es real.
- ElevenLabs: si el entorno tiene la clave (ver `MEMORIA.md`), generar la voz Danny directamente en vez de esperar el mp3.
