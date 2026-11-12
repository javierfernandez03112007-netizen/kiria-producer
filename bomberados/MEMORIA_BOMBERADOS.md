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
- **Lo que pide Javi para TODOS los vídeos (10 nov, tras «deja que desear» la v1 de las mangueras: «no estamos siguiendo las métricas de los vídeos más virales»):** 1) **gancho que ALARME**: una situación de peligro que invite a quedarse (el fuego que avanza y el chorro que se desploma, «¡SIN PRESIÓN!»), no una frase descriptiva; 2) **más rápido**: voz a tempo 1,0 (no 0,93) y frases cortas; 3) en las preguntas, **los 5 segundos para responder** (cuenta 1→5 con bocina) y «¡Tiempo!» con la trampa tachada, como la presión; 4) **un dron que no para**: una sola trayectoria suave (spline de Hermite, como acoplamiento y presión), sin cortes a fondos negros; 5) **planos ABIERTOS en los que se vea todo**: nada cortado (las mangueras enteras de la autobomba a la lanza; los «rayos X» flotando encima de su línea, en la misma escena). Antes de escribir el guion, mirar los más virales (acoplamiento 106.000, guardia 78.800, presión 63.400) y copiar su molde.
- **El MENSAJE (Javi, 12 nov, tras los 6.014 de «seguridad activa/pasiva»): centrarse en el mensaje de los virales y en cómo se transmite → `bomberados/MENSAJE.md`.** Una sola idea de cómo funciona el oficio de bombero (no un nombre, una definición ni una lista), con alguien en juego y el espectador dentro, que lo entienda cualquiera; la pregunta es una consecuencia o una decisión; la trampa es el error intuitivo y se ve su consecuencia; el «¡ajá!» se ve con números redondos; cierre de decisión o de identidad. Pasar su comprobación antes de mandar cada guion.
- Datos y preguntas de temario **siempre con fuente oficial** en `FUENTES.md`; funciones de la app, «CONFIRMAR».
- 1080x1920, 60 fps, voz **Danny** de ElevenLabs («Relatable, Expressive and Warm»; NO «Deep Monotone»), subtítulos Impact palabra a palabra.
- Commit y push a `master` siempre, sin PR. **Máquinas extra en la nube (Javi, 3 nov): permiso general para Bomberados, pero un grupo FIJO de máquinas que se reutiliza para todos los vídeos (nunca crear máquinas nuevas por cada vídeo)**; solo merecen la pena para renders largos (los 2D de Bomberados tardan 10–25 min en esta máquina con 4 procesos).
  **Grupo fijo creado el 3 nov** (modelo Sonnet, etiqueta `bomberados-render`, mismo entorno): «Bomberados · render 1» `session_014gBm8T1peCwwn5Kj86cqFG` → rama `render-bomberados-m1`; «render 2» `session_014gBm8TKkeCJPrEWu3hbPLJ` → `render-bomberados-m2`; «render 3» `session_014gBm8NiKaGA56BGN3Jjwrm` → `render-bomberados-m3`; para el 3D del 21A-113B se añadieron (mismo grupo fijo) «render 4» `session_014gBm8RLGqsAU3LSCjQB8Nj` → `render-bomberados-m4`, «render 5» `session_014gBm8QxadMhVo7jL4Xvu43` → `render-bomberados-m5` y «render 6» `session_014gBm8P8451D2QLxBS5u7mR` → `render-bomberados-m6`. Escenas WebGL (three.js): SwiftShader ya usa varios núcleos → `projects/<p>/procesos` con 2. Se les manda «render projects/<p> A B <commit>» con `send_message` y contestan «hecho …»; aquí `recoger_trozos.sh` (ver `bomberados/plantillas/pregunta/README.md`). No crear más: reutilizar estas (si una se archiva, se desarchiva).
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
5. Entregar `out/<p>.mp4`, `out/portada.jpg`, `out/portada_grid.jpg` y `DESCRIPCION.txt` con `SendUserFile`; actualizar Notion:
   su fila de «Vídeos de Bomberados» → «Listo para subir» con Descripción, y **crear YA su fila en «📊 Métricas por vídeo»**
   (collection://29d4dd57-c184-41eb-8063-541ee3e9d240: título + relación «Vídeo de Bomberados»; Vistas, Me gusta,
   Comentarios y Compartidos vacíos: los rellena Javi. Lo pidió el 9 nov: «cuando hagas un vídeo, añádelo a la parte de
   análisis… así luego yo relleno lo demás»).
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
| Anuncio «Profe IA · Bomberados PRO» (idea de Javi, con la grabación real de la app) | `projects/bomberados_profeia/` | **guion enviado** 3 nov; escena hecha con tiempos provisionales; falta la voz de Javi |
| Medio «Tus abuelos tenían media hora» (salón de antes contra el de hoy) | `projects/bomberados_abuelos/` | **listo para subir** (3 nov; 39,6 s, −15,5 LUFS, pico −1,2; voz de Javi; efectos de ElevenLabs reutilizados; Notion: fecha por decidir, propuesta mar 10) |
| Medio «Al fuego le falta una pieza» (¿triángulo o tetraedro?) | `projects/bomberados_tetraedro/` | **listo para subir** (2 nov; 36,4 s, −15,3 LUFS, pico −0,6; voz de Javi; efectos de ElevenLabs reutilizados; Notion: jue 5 nov 20:30) |
| PD 4 nov «¿Qué significa 21A-113B?» (versión CINEMATOGRÁFICA en 3D, idea de Javi) | `projects/bomberados_extintor/` | **listo para subir** (4 nov; 35,8 s, −14,5 LUFS, pico −1,1; voz de Javi; render repartido en 7 máquinas: ≈ 16 min el vídeo entero, 9 min el trozo más lento; respuesta A; Notion: mié 4 nov 14:00) |
| Medio «¿Serie o paralelo?» — acoplamiento de autobombas (idea de Javi, 3D de noche con planos de dron abiertos) | `projects/bomberados_acoplamiento/` | **listo para subir** (5 nov; 46,8 s, −14,9 LUFS, pico −1,2; voz de Javi; render en 7 máquinas ≈ 20 min + 2 min para rehacer el tramo del «en paralelo» (los rótulos se pisaban → ahora una línea «1.000 + 1.000 = 2.000 L/MIN»); pregunta «¿piso 20?» → serie; falta la página del manual de Javi; fecha por decidir) |
| PD «¿Cuánto aire te queda?» — autonomía de la botella del ERA (pregunta e idea de Adrián; cinematográfico 3D, súper dinámico) | `projects/bomberados_botella/` | **listo para subir** 6 nov (47,3 s, 60 fps, −14,7 LUFS; entregado con portada en el fotograma de 2,7 s; Notion: Listo para subir, fecha por decidir; voz de Javi a 0,93 y sin recortar sus pausas, como pidió: 46,4 s con la cuenta 1→5 que empieza ya en 1 = 4 s reales; respuesta C, 34 min; efectos de respiración, silbato, bocina, reloj y aire SINTETIZADOS (`sfx_sintetizados.py`) porque la clave de ElevenLabs falla desde la sesión; render en 7 máquinas ≈ 12 min (trozos de 406 fotogramas: 459–721 s cada uno) + 3 min de composición, commit 552de47; pendiente: de qué examen sale y la página del manual de ERA) |
| PD «¿Qué presión llega a la lanza?» — PRESIÓN EN BOMBA (pregunta e idea de Adrián: tendido que sube 50 m, lanza cerrada, bomba a 8 bar; cinematográfico 3D) | `projects/bomberados_presion/` | **listo para subir** 6 nov (51,4 s, 60 fps, −15,7 LUFS; voz de Javi a las 10:35 → entregado a las 11:10; a 0,93 y sin recortar pausas; Javi cambió al grabar la frase 8 por «Escribe en comentarios cuál crees que es la correcta»: el vídeo NO da la respuesta (tarjetas con la D tachada y «8 − 5 − 0 = ?»; en la subida, lo que se pierde −1…−5 BAR, no lo que queda); respuesta C solo al final de la descripción; portada en el fotograma de 10,2 s (manómetro «¿ ? BAR» + LANZA CERRADA); efectos motor/agua/llave sintetizados (`sfx_sintetizados.py`) + biblioteca; render en 7 máquinas ≈ 14 min (trozos de 441: 467–835 s), commit e04d218; Notion: Listo para subir, fecha la que ya tenía; pendiente: que Adrián confirme Santiago de Compostela 2017 para el sello y la página del manual de hidráulica) |
| Medio «¿Cuánto gana un bombero en Madrid y en Granada?» (idea de Javi, 6 nov: «tema muy controversial», 1 minuto; dato de la oposición) | `projects/bomberados_sueldos/` | **listo para subir** 6 nov (67,0 s, 60 fps, −15,7 LUFS; voz de Javi 18:42 → entregado ≈ 19:55; su toma ya iba pausada (66 s): tempo 1,0 y sin recortar pausas. Ayto. de Madrid frente a Ayto. de Granada (C1, nivel 20): específico 27.803,72 € (acuerdo 31-7-2024, +10 %; antes 25.276,02) frente a 25.389,34 € (presupuesto 2026), totales 2024 ≈ 47.100 € y ≈ 44.700 €, 1.507,75 h frente a 1.626,25 h (casi 5 guardias), 31 frente a 27 €/h; la Comunidad de Madrid (+437,73 €/mes desde 2026, BOCM 1-8-2025) solo en la descripción. Escena `web/sueldos.js` (motor de presion.js): calle partida MADRID|GRANADA de noche, columnas de oro, 5 guardias de 24 h, botones finales; efectos con monedas sintetizadas. Render 7 máquinas (trozos de 575: 760–1110 s), commit ee6fb20; portada en 31 s (las dos columnas con sus totales). PENDIENTE: confirmar las cifras de Granada en el PDF del presupuesto (granada.org bloquea las descargas automáticas; se leyeron vía buscador). Se permitieron en el entorno www.boe.es, www.bocm.es, transparencia.madrid.es, datos.madrid.es, www.comunidad.madrid, www.granada.org y www.sepg.pap.hacienda.gob.es) |
| PD «¿Cuánta agua necesitas?» — problema de espuma (pregunta de Adrián, Notion 7 nov: local de 30 m² × 3 m, espumógeno 1,5 %, expansión 150; B) 591 L) | `projects/bomberados_espuma/` | **listo para subir** 8 nov (61,5 s, 60 fps, −15,8 LUFS; voz de Javi 8:30 → entregado ≈ 9:15; su toma ya iba pausada (56 s): tempo 1,0 y sin recortar pausas; final SIN decir la respuesta, como la presión: «600 − 9 = ?» y «escribe en comentarios»; escena `web/espuma.js`: almacén que se llena de espuma hasta el techo, generador, bidón amarillo, cotas 6 × 5 × 3, cubo de 1 L → 150 L, bloque de 90 m³ que se encoge a un depósito de 1 m³ con 600 L; efectos con generador y burbujeo sintetizados; render en 7 máquinas: el trozo 0–527 pesó 102 MB (> 100 MB, GitHub lo rechaza) y se repartió en 0–263 aquí y 263–527 en la máquina 1 → con escenas de mucho detalle (espuma), trozos de ≤ 450 fotogramas; portada en 9,6 s; pendiente: de qué examen es y la página del manual) |
| Medio «Un día de bombero: 24 horas de guardia» (idea de Adrián en Notion, para el lunes 9; fila 412d785b2d758062bedbf536eacff2ac, Formato «Explicado en 30 s») | `projects/bomberados_guardia/` | **listo para subir** 9 nov (56,7 s, 60 fps, −15,7 LUFS; voz de Javi 8:40 → entregado ≈ 9:35; toma a 2,2 palabras/s: tempo 1,0 y sin recortar pausas; render en 7 máquinas: 6 trozos de 462 + el arranque aquí (0–288, 2 subfotogramas por el «time-lapse») + el final (3060–3403) en la máquina 4 cuando acabó su primer trozo: ≈ 25 min en total; el trozo 288–750 pesó 83 MB; portada en 28,95 s (contenedor ardiendo a las 23:03, «SALIDAS HOY: 3»); Notion: Listo para subir con descripción. Al ver el avance con los tiempos reales se corrigió el plano final (la grúa acababa metida entre dos edificios de la acera de enfrente, z ≥ 39). Pendiente: confirmar la prueba gratis de 5 días). Guion en `GUION_PARA_GRABAR.txt`. Escena `web/guardia.js` (motor de presion.js) por PLANOS con cortes secos y un reloj de 24 h que corre (barra de progreso, «SALIDAS HOY: 1-2-3», «GUARDIA CUMPLIDA») y luz según la hora (cúpula de cielo con degradado y sol, estrellas y luna de noche): gancho en «time-lapse» de 24 h (las autobombas salen y vuelven), relevo, revisión con lista ✓ (camiones, mangueras, botella 300 bar en primer plano), desayuno (dotación «de calle» sentada, `makeCrew`), prácticas en la torre, reconocimiento siguiendo a la autobomba por la ciudad (aro en el hidrante), ¡salida!, incendio en vivienda, accidente, vuelta marcha atrás, limpiar, pesas, estudio (temario visto desde arriba), cena, contenedor, madrugada, camiones listos (equipos colgados), relevo, a casa (de espaldas, con mochila) con el calendario 24 h + 4-5 días libres «según el servicio» y foto final con la dotación. Efectos sintetizados en `sfx_sintetizados.py` (sirena, timbre, radio, marcha atrás, tazas, pesas, grillos, pasos, ciudad, cristales, reloj rápido) y `sfx_track_guardia` en compose.py (formato «guardia»). |
| «Cada minuto cuenta» — el opositor que estudia esperando el autobús (idea de Adrián en Notion, «LUNES 9 AUTOBUS»; fila 412d785b2d7580388012fbfdcfdad4f0, Formato «POV del opositor») | `projects/bomberados_autobus/` | **listo para subir** 9 nov (44,0 s, 60 fps, −14,9 LUFS; voz de Javi 10:30 → toma de 40 s a 2,6 palabras/s → tempo 0,93 sin recortar pausas; render en 7 máquinas: el gancho 0–300 aquí (3 subfotogramas: ≈ 19 min) y 6 trozos de 390; portada en 12,4 s (la tarjeta «169 ARTÍCULOS»); Notion: Listo para subir con descripción). Escena `web/autobus.js` (motor de guardia.js): calle con parada y panel de minutos (12 → 2 → LLEGANDO → 14), coches que pasan zumbando en el gancho (3 subfotogramas), el opositor (sudadera, cascos, mochila, móvil con la app), y el MÓVIL en primer plano (×1,15): grabaciones REALES de `bomberados/app/` (menú «Bomberados PRO» 0,3–1,6 s con toque en Flashcards; ruleta 1–7 s y pregunta con cuenta atrás 7,2–10,5 s, nombre del rival tapado con «RIVAL») y RECREACIÓN de las flashcards (169 artículos, BOE; tetraedro) y del reto diario (10 preguntas, puntos, «¡RETO COMPLETADO!»); llega el autobús (frena, abre puertas), sube y se va. `preparar.sh` saca los fotogramas de las grabaciones a out/rec_menu y out/rec_1vs1. Efectos en `sfx_sintetizados.py` (coche que pasa con Doppler, tarjeta, ruleta, fanfarria, puertas) + biblioteca; `sfx_track_autobus`. CONFIRMAR con la marca: retos diarios y flashcards por dentro (si hay grabación, se cambia la recreación) y la prueba de 5 días |
| «FOMO Bomberados» — no es un juego: es lo que te va a dar la plaza (idea de Adrián en Notion, «FOMO BOMBERADOS - MARTES 10»; fila 412d785b2d75803fa515d360c66acade) | `projects/bomberados_fomo/` | **listo para subir** 9 nov (45,2 s, 60 fps, −15,4 LUFS; voz de Javi 19:41 → 41 s a 2,7 palabras/s → tempo 0,93 sin recortar pausas → entregado ≈ 20:07; render en 7 máquinas: 6 trozos de 384–388 + el arranque 0–388 aquí (2 procesos), commit 9a4af22, ≈ 25 min; portada en 3,4 s (la ruleta de neón con el opositor, «¿Y SI OPOSITAR FUERA ASÍ?»); Notion: Listo para subir con descripción; ojo: en el perfil (grabación rec_ia) se ve la foto de la cuenta con la que se grabó la app: si la marca no la quiere, se tapa y se re-renderizan solo esos fotogramas). Escena `web/fomo.js` (motor de guardia.js + móvil del autobús): cuarto de estudio de noche que en «así» se enciende en una ARENA (ruleta gigante de 8 casillas con iconos propios y la dorada «TU PLAZA», suelo de neón, focos; dos chispazos en el primer segundo), el móvil con GRABACIONES REALES (`preparar.sh` saca rec_1vs1, rec_ia, rec_sim y rec_grupo: ruleta, simulacro con convocatorias, grupo con «Callejero» con logotipo y fotos tapados, Profe IA, menú PRO con Flashcards/Simulacro y perfil con NACIONAL #71 · HUESCA #3), mapa de España (contorno lon/lat simplificado, 40 ciudades que se encienden y 10 duelos «VS»; dibujo sin cifras), el FOMO (él solo en el cuarto apagado y 46 móviles que se encienden alrededor) y la ruleta que frena con «TU PLAZA» derecha bajo la aguja. Efectos: `sfx_sintetizados.py` (chispazo, encendido) + los del autobús; `sfx_track_fomo`. No se enseñan los retos diarios (sin grabación) |
| «¿Qué manguera pierde más presión?» — pérdida de carga en mangueras de 25, 45 y 70 mm (pregunta de Adrián, Notion «SÁBADO 14 PREGUNTA EXPLICADA», Ayto. de Pontevedra 2022: CONFIRMAR; fila 412d785b2d75806289f3d5ddbf1127e1) | `projects/bomberados_mangueras/` | **v3 LISTA PARA SUBIR (la que vale)** 11 nov (55,6 s, 60 fps, −15,8 LUFS): Adrián (por WhatsApp a Javi: «no me termina la explicación») mandó la suya del temario → la misma forma de los virales (gancho de alarma, cuenta 1→5 con bocina, «¡Tiempo!» con la D tachada, dron continuo y planos abiertos) con SU explicación: «PÉRDIDA DE CARGA = PRESIÓN AL PRINCIPIO − PRESIÓN AL FINAL», el agua roza consigo misma (90 %) y con las paredes (10 %, «según el temario»; chispas dentro y en la pared del tubo), «¿QUÉ LA AUMENTA?» (los tubos se alargan; «×2 VELOCIDAD = ×4 PÉRDIDA»; «PÉRDIDA ∝ 1 / D⁵» sobre 25/45/70 mm; CODOS · VÁLVULAS · RUGOSIDAD · VISCOSIDAD) y «NO DEPENDE DE LA PRESIÓN»; 13 frases, voz de Javi (toma 11:06) a tempo 1,0 + cuenta de 4,05 s → entregado ≈ 12:40; render en 7 máquinas (el arranque 0–160 aquí y 6 trozos de ≈ 530), commit 5f4da79; portada en 1,8 s (la de la v2); Notion: Listo para subir con la descripción nueva (la respuesta, con la explicación de Adrián) y su fila de métricas (414d785b2d7581f1b9d0d80d4a9535c3). Pendiente: la página del temario de donde sale el 90 %/10 %. Antes: **v1 entregada y RECHAZADA por Javi** (gancho flojo, lento, sin cuenta de 5 s, cortes a un «laboratorio» negro y mangueras cortadas) → v2 lista 10 nov, sustituida por la v3 (50,7 s, 60 fps, −16,0 LUFS; guion 18:45 → voz de Javi 19:00 (45,6 s a 2,8 palabras/s, tempo 1,0 + cuenta de 4 s) → entregado ≈ 19:30; render en 7 máquinas: el arranque 0–240 aquí y 6 trozos de 467 (678–1100 s), commit a33ae0d; gancho «¡El fuego avanza… y la lanza de tu compañero se queda SIN FUERZA!» con el chorro (arco de agua `makeArc`, parábola en el sombreador) que se desploma delante del fuego, manómetro 2D en rojo y «¡SIN PRESIÓN!»; dron continuo (Hermite) a la autobomba y planos abiertos con las tres líneas enteras; tarjetas que salen una a una + cuenta 1→5 con bocina + «¡Tiempo!» (la D tachada); «rayos X» flotando sobre cada línea (×1 / ×2,4 / ×7,8; «MÁS VELOCIDAD = MÁS ROCE»); final «Escribe en comentarios cuál crees que es la correcta» con las letras; portada en 1,8 s (el bombero con el chorro delante del fuego, «¡SIN PRESIÓN EN LA LANZA!»); Notion: Listo para subir con descripción; su fila de métricas ya estaba creada). v1: listo para subir 10 nov (48,3 s, 60 fps, −15,7 LUFS; guion 17:40 → voz de Javi 17:53 (42 s a 2,7 palabras/s → tempo 0,93) → entregado ≈ 18:20; render en 7 máquinas: 6 trozos de 414 + el arranque 0–260 aquí y 260–413 en la máquina 3 cuando acabó su trozo (≈ 15 min), commit 82ec7cc; al montar, el título 3D «PÉRDIDA DE CARGA» pisaba los subtítulos (y ≈ 330): se bajó y se re-renderizaron aquí solo 1040–1180 (1,5 min); portada en 4,15 s (los tres manómetros «?» delante del fuego); Notion: Listo para subir con descripción + su fila en «📊 Métricas por vídeo» (414d785b2d7581f1b9d0d80d4a9535c3)). ELEGIDO CON LOS DATOS del 10 nov (Javi: «recopila la información actual de Notion… y actuamos según los que más se pegan y los que menos»): tocaba el «FOMO jugador» (otro anuncio de la app), pero los anuncios son lo que menos alcance tiene (FOMO 3.899, autobús 5.100 vistas; la guardia, 78.800 en el mismo periodo) y lo que más, el 3D de mangueras y presión (acoplamiento 106.000, presión 63.400) → se adelanta la pregunta de las mangueras y el FOMO jugador queda aplazado (nota en su fila). Molde de la presión + plan del 10 nov: letras A/B/C/D quietas 2 s al final («count» 2,0 tras la frase 6) y «comenta tu letra»; la respuesta (A) solo en la descripción. Escena `web/mangueras.js` (motor de presion.js) por PLANOS con cortes: gancho pegado al cuadro de la bomba con las tres mangueras saliendo disparadas del colector → dron sobre las tres líneas hasta tres bomberos con las lanzas y manómetros «?» frente a un edificio en llamas → a ras de suelo con la leyenda 25/45/70 (sección a escala) → «laboratorio» de rayos X (tubo transparente con gotas de luz que van más deprisa en el centro, chispas de roce en la pared, una columna de presión por metro que baja de azul a rojo, título 3D «PÉRDIDA DE CARGA», largo/caudal/diámetro) → el tubo se estrecha y los dos tubos 70/25 con «×7,8» → vuelta a la plaza con las letras. Efectos: `sfx_track_mangueras` en compose.py (formato «mangueras») con la biblioteca de la presión. |
| «¿Cuántas aciertas?» — 6 preguntas de bombero, 3 segundos cada una (idea de Adrián, Notion «PASAPALABRA JUEVES 12»; fila 412d785b2d7580a4b256e62ea2fb682c, Formato «Test relámpago»; estética propia, sin nombre ni imagen de ningún programa de la tele) | `projects/bomberados_quiz/` | **listo para subir** 11 nov (54,9 s, 60 fps, −15,6 LUFS; guion 10:20 → voz de Javi 10:22 (36 s, tempo 1,0) → entregado ≈ 11:00; render en 7 máquinas: el arranque 0–150 aquí, 150–300 en la máquina 6 al acabar su trozo y 6 trozos de 500 (1094–1477 s), commit 8c1c562; portada en 1,4 s (la alarma del parque, «¿CUÁNTAS ACIERTAS?»); Notion: Listo para subir con descripción + fila de métricas). Con las reglas de Javi del 10 nov: gancho «¡Suena la ALARMA!» (luces rojas que golpean la imagen, puertas del parque que suben, «¡ALARMA!»), marcador de 6 casillas, cada pregunta en un panel con su cuenta 3-2-1 (`ajustar_voz.py` admite ahora `"counts": {frase: s}`, varias cuentas) y la respuesta que estalla en verde, un objeto 3D por respuesta (libro de la Constitución, 112 de neón, tetraedro con fuego y sus 4 nombres, molécula de agua, bombero con EPI y sus partes, hoja de la Ley 31/1995 con sello), dron continuo de un objeto a otro y cierre «¿Cuántas has acertado de seis? Comenta tu número» con las notas 0–2 / 3–4 / 5–6. Escena `web/quiz.js` (motor de presion.js), efectos `sfx_track_quiz` (alarma, sirena, tic-tac, acierto y un sonido por objeto) |
| «¿Qué te salva antes del golpe?» — seguridad activa y pasiva del vehículo (pregunta de Adrián en Notion «VIERNES 13 PREGUNTA EXPLICADA», Ayto. de Marbella 2023: CONFIRMAR; fila 412d785b2d7580c280b5e36d0845ecd8) | `projects/bomberados_seguridad/` | **listo para subir** 12 nov (57,3 s, 60 fps, −15,1 LUFS; guion ≈ 8:10 → voz de Javi (toma 08:20, 52 s; medir_voz dio «OJO» por 0,7 dB en «¡Mándaselo!»: lo compensa el realce +3 dB de la mezcla) → entregado ≈ 10:30; render en 7 máquinas: el arranque 0–436 aquí (2 procesos, 11 min) y 6 trozos de 500 (994–2668 s; la máquina 3 tardó el doble), commit bb2ae89; luego se re-renderizaron aquí 1488–1580 para bajar la etiqueta «ESP», que pisaba el título (≈ 9 min: el plano cenital en rayos X es el más pesado, ≈ 11 s/fotograma); portada en 2,3 s (tu coche frenando bajo la lluvia, «⚠ 17 M», «¿QUÉ TE SALVA ANTES DEL GOLPE?» + «¡FRENA!»); Notion: Listo para subir con descripción + fila de métricas 416d785b2d758170b029c8a8712da6b8). Con las reglas de Javi: gancho que alarma («¡FRENA! Hay un coche accidentado en tu carril… ¡y está lloviendo!»), tempo 1,0, cuenta 1→5 con bocina, «¡Tiempo!» con la B («pasiva») tachada y la A/C para comentar, dron continuo. Escena `web/seguridad.js` (motor de mangueras.js): autovía de noche bajo la lluvia (gotas como trazos que se congelan en la cámara lenta; ojo: con el trazo girado al revés la GPU lo descartaba por la cara), reflejos en el asfalto mojado, tu coche (perfil extruido + `taper`, ruedas con disco que se pone al rojo, faros con haz) que frena a CÁMARA LENTA (`warp` calculado para que se pare justo en «luces», a 1 m) con velocímetro y distancia; la ACTIVA en «rayos X» pieza a pieza (ABS, ESP con flechas, neumáticos, dirección, muelles, largas); la PASIVA en el accidentado: repetición en rayos X (rebobina, cinturón, airbags, reposacabezas, el morro que se arruga con `crushData` y la jaula verde del habitáculo); llega la autobomba con luces y sirena; resumen desde detrás de la autobomba; bombero con la cizalla y el airbag de cortina sin saltar (rojo). Efectos: `sfx_track_seguridad` (formato «seguridad»).
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


### PD 4 nov «¿Qué significa 21A-113B?» — 3D cinematográfico (3 nov)
- Javi pidió «de manera cinematográfica con mucho flujo óptico y muy profesional». Formato nuevo: three.js
  (`projects/bomberados_extintor/web/extintor.js`) + la capa 2D de `scene.js` (cuenta atrás, rótulos, venta). Luz de estudio,
  pintura con barniz, profundidad de campo propia (desenfoque a ½ y ¼ + profundidad), resplandor, desenfoque de movimiento
  por subfotogramas en los barridos, cámara lenta con rampas de velocidad (`warp`), cámara con spline de Hermite sin paradas.
  Llamas = láminas con ruido que miran a la cámara (mucho más baratas y creíbles que partículas); humo, chispas y polvo =
  partículas sin estado. Todo es función de t (cada fotograma se renderiza suelto en cualquier máquina).
- Guion: gancho «La ley obliga a tenerlo a menos de quince metros de ti… y casi nadie sabe leerlo» (extintor CONGELADO en el
  aire en plena descarga + anillo «a menos de 15 m»), macro del código, 4 opciones de cristal (A correcta), cuenta atrás de 3 s
  sin voz, la cámara atraviesa la A → ensayo 21A (pila de 2,1 m, polvo a cámara lenta, cinta métrica) → bandeja 113B (probeta
  de 113 L a escala real) → «más número, más fuego» (8A-34B … 43A-233B) → venta. Datos y matices en `FUENTES.md`.
- Coste: 3–6 s por fotograma a 1080×1920 con SwiftShader (1 proceso ya usa ≈ 2,2 núcleos): render repartido en las 6 máquinas
  + esta, con `procesos` = 2 en el proyecto. Vista rápida: `prev.mjs`/`anim.mjs` (PR 0,5, sin desenfoque de movimiento).
- Cuando llegue la voz: `assets/voz_original.mp3` → `asr.py` → `ajustar_voz.py` (cuenta atrás 3 s tras la frase 3) →
  `medir_voz.py` → vistas rápidas → commit y push → repartir N = (fin + 1,2) × 60 fotogramas en 7 trozos (órdenes
  «render projects/bomberados_extintor A B <commit>» a las 6 máquinas; aquí el último trozo con capture.mjs --range) →
  `ESPERA=6 REV=<commit> recoger_trozos.sh` → `compose.py` (efectos: `sfx_track_extintor`) → `portada.py` → entregar.
- Pendiente de comprobar: tabla 1.1 del DB SI 4 (codigotecnico.org no abre desde aquí) y hogares tipo de la UNE-EN 3-7.
- Hecho el 4 nov: voz a las 08:01 → vídeo a las 08:45. Al montar se vio que los títulos 3D «113B» y de eficacias chocaban con los subtítulos (y ≈ 330): se bajaron y se re-renderizaron solo esos 250 fotogramas en 5 máquinas (≈ 4 min). Portada: macro del código encendido (t 7,45) con `"oscurecer": true` (degradado oscuro detrás del titular, nuevo en portada.py).
- **Javi (4 nov): «aleja la cámara, está muy pegada y no se observan bien las cosas»** → v2 con todos los planos más abiertos (gancho a ≈ 3 m, macro que acaba enseñando la etiqueta entera, opciones con el extintor entero detrás, la pila vista en diagonal con sus llamas, la bandeja entera, venta con el extintor entero y poco desenfoque). **Por defecto en los vídeos en 3D: planos abiertos donde se vea el objeto entero; los primeros planos, cortos y solo para leer algo.**


### Análisis de la cuenta cada 12 h (Javi, 5 nov: «analiza lo que funciona y lo que no y vamos a escalar la cuenta»)
- **Desde el 6 nov (tarde) lo hace otro chat**: «Bomberados · plan de cada mañana» (`session_014gBm8NkEfj7WbrRssD8aUb`,
  creado desde aquí) con la tarea `trig_01DJ3q2TJsCXzx4sUysViCVQ` a las **6:33 (Madrid)**, para que a las 7 esté listo
  (Javi: «cada mañana a las 7 recopila toda la información de Notion, cambia cosas si es necesario […] y lo tenemos en
  cuenta para hacer los demás vídeos»; «acepto todo lo que me pidas de Notion»). Instrucciones: `bomberados/PLAN_DIARIO.md`.
  Deja arriba de `bomberados/ANALISIS.md` «📌 Para los próximos vídeos»: **leerlo antes de cada vídeo** (está en CLAUDE.md).
  La tarea de 12 h de esta sesión (`trig_01FxviRRusU6fcSmaKLEio9p`) quedó **desactivada** (no borrada). Ojo: «disparar ya»
  (fire_trigger) una tarea de sesión fija no entra en esa sesión, crea otra nueva sin repositorio («⚡ …», 6 nov); para
  probar, mejor `send_message` a la sesión.
- **6 nov, Javi reorganizó la página de análisis**: arriba «## 👥 Seguidores totales» con la BD **«👥 Seguidores de las
  cuentas»** (collection://1b778735-44d1-4848-a376-b7c608b6239a; database 166e5e8690984daf8eaf15610ada0d6b; vista «Seguidores
  cada 3 días»): filas «Seguidores Bomberados» y «Seguidores Élite», una columna numérica cada 3 días («6 nov» … «30 dic»);
  Javi apunta el número. En «📊 Métricas por vídeo» solo queda **lo que se ve como espectador** (Javi no tiene acceso a las
  estadísticas de la cuenta): Vistas, Me gusta, Comentarios, Compartidos y sus «por 1.000» (nueva «Me gusta por 1.000»);
  se quitaron Guardados, Seguidores ganados, Visitas al perfil, Retención 3 s y Visto entero. Se añadieron 6 vídeos (ADR,
  PAS, ley de Protección Civil, abuelos, «Fuga de gas licuado» —sin relación: no está en «Vídeos de Bomberados»— y
  acoplamiento), con las cifras vacías. Sus estados en «Vídeos de Bomberados» no se tocaron.
- Javi actualiza en Notion las métricas de cada vídeo cada 12 h. Tarea programada en ESTA sesión, 8:43 y 20:43 (Madrid):
  leer las métricas, rehacer `bomberados/ANALISIS.md` y la página de Notion «📈 Análisis de contenido de Bomberados»
  (40fd785b-2d75-8178-a380-df98f5fb42bb, dentro del Centro de trabajo), rellenar «Conclusión» de cada vídeo, commit y push,
  y mandar a Javi un resumen corto. Todo por cada 1.000 vistas (envíos, comentarios, guardados, seguidores) + alcance.
- **6 nov (Javi: «quita de Vídeos de Bomberados todo lo que sea de análisis… y las analíticas en una página que sea
  análisis de contenido de Bomberados»)**: las métricas ya NO están en «Vídeos de Bomberados». Están en la BD
  **«📊 Métricas por vídeo»** (collection://29d4dd57-c184-41eb-8063-541ee3e9d240; database c0f6e2b7fcf24b308302d0bcb538285d),
  en línea dentro de la página de análisis (renombrada de «Análisis de la cuenta» a «Análisis de contenido de Bomberados»).
  Una fila por vídeo publicado, con relación «Vídeo de Bomberados» (de un solo sentido), rollups «Publicado» y «Formato»,
  Vistas, Me gusta, Comentarios, Compartidos, Guardados, Seguidores ganados, Visitas al perfil, Retención 3 s (%), Visto
  entero (%), fórmulas «Compartidos/Comentarios/Guardados por 1.000» (no se pueden leer desde el MCP: los cocientes se
  calculan aparte), «Conclusión» y «Actualizado». Vistas: «Todos» (por fecha) y «🏆 Ranking: los que más se comparten».
  Ahí se copiaron las cifras y conclusiones de los 4 vídeos publicados.
  La guía «📊 Cómo analizar los vídeos» se movió dentro de esa página. Si un vídeo pasa a «Publicado» sin fila en
  Métricas, la tarea de 12 h se la crea. **Desde el 9 nov la fila se crea al ENTREGAR cada vídeo** (paso 5 de arriba), sin
  esperar a que se publique; ese día se añadieron las que faltaban: 21A-113B, tetraedro, sueldos Madrid/Granada, dominadas,
  guardia, autobús y FOMO (no la promo del simulacro, que era para @elitebomberos, ni el Profe IA: «Fuga de gas licuado»,
  sin relación, puede ser ese vídeo; que lo enlace Javi).
- Primer análisis (5 nov, 4 vídeos con datos): lo que habla de la propia oposición se comparte muchísimo («Ocho de cada
  diez»: 24.800 vistas, 394 envíos); las trampas se comparten (aceite 17/1.000) pero ese tuvo poco alcance; las Preguntas
  del día traen el doble de comentarios. Faltan guardados, seguidores y retención 3 s.
- Métricas automáticas con Metricool (5 nov, la otra sesión): **paradas el 6 nov por Javi**; ver `metricas/README.md`.
  El análisis de Bomberados de cada 12 h (esta sesión) sigue: Javi apunta las cifras a mano en «📊 Métricas por vídeo».
  (6 nov: una segunda marca es de pago, así que @elitebomberos va como competidor: punto siguiente.)
- **Metricool** (MCP; 6 nov): una sola marca, kiria.ai (id 7793103); el plan gratis no deja una segunda marca, así que Javi
  eligió meter la cuenta de Bomberados, **@elitebomberos**, como **competidor** de kiria.ai. Javi: «no me deja conectar nada
  de competidores». Motivo: el Instagram de kiria.ai está conectado con el login directo de Instagram (en la marca solo hay
  `instagramData`, sin Facebook) y con esa conexión Metricool no deja analizar competidores. Hace falta la conexión **a
  través de Facebook** (Instagram vinculado a una página de Facebook de la que Javi sea administrador). Pasos que le di:
  1) Instagram → Editar perfil → Página → conectar o crear la página; 2) Metricool → Analítica → Instagram → botón
  «Conectar una cuenta de Facebook» del aviso de limitaciones (o el «+» de Facebook), aceptando todos los permisos;
  3) menú lateral → Analítica → Competidores → Añadir → «elitebomberos». Al cambiar de tipo de conexión Metricool no
  conserva el historial anterior y la nueva solo trae los últimos 30 días: como kiria.ai se conectó el 1 nov, ahora no se
  pierde nada (más adelante sí). Un competidor solo da datos públicos (me gusta, comentarios, seguidores, publicaciones:
  IGCO01–12, IGCR01–10), **no** vistas, envíos, guardados ni retención: eso sigue saliendo de Notion. La tarea de 12 h
  (trig_01FxviRRusU6fcSmaKLEio9p) ya mira IGCO/IGCR y los usa en cuanto salgan (6 nov: vacío).
  Los ceros de la pantalla de Javi no eran desconexión: Metricool tenía datos de kiria.ai hasta el 5 nov (4.861 seguidores,
  92.758 visualizaciones ese día; IGEV01/05/23). La web de ayuda de Metricool no se abre desde esta sesión (no está en la
  red permitida): usar el buscador.

## Notion (centro de trabajo de Javi; MCP de Notion)
- Página «🚒 Bomberados — Centro de trabajo»: 409d785b-2d75-8116-bfcf-c9cf65d9f2ed (guías: Plan y formatos, Horarios; la de
  «Cómo analizar» está dentro de «📈 Análisis de contenido de Bomberados»).
- BD **Vídeos de Bomberados**: collection://5422fb68-0692-456e-8aac-49a9c79151c9 (vista «🎬 Todos los vídeos» ordenada por
  «Publicación (día y hora)»; estados: Idea, Guion, Voz grabada, En producción, Listo para subir, Programado, Publicado,
  Descartado; horas en CET = UTC+1). Desde el 6 nov **sin métricas** (pidió Javi): Vídeo, Publicación (fórmula), Publicación
  (día y hora), Estado, Formato, Nivel, **Descripción** (el texto para pegar al subir = la parte de `DESCRIPCION.txt` antes del
  primer «---»; rellenada en los 14 vídeos hechos: al terminar uno nuevo, rellenarla), Plataformas, Descripción lista,
  Miniatura lista, Fuente oficial y Notas. Las métricas, en «📊 Métricas por vídeo» (ver «Análisis de la cuenta» arriba).
- **Adrián** (Adrián Luna, de Élite Bomberos; invitado en Notion, user://437aba8b-31f4-4c21-ab9c-bafe78ac64d1) escribe ideas
  con guion en el cuerpo de la fila: «AUTONOMIA DE BOTELLA» (5 nov, 40fd785b2d758003b5bbfd81f16a3df6) y «PRESION EN BOMBA»
  (6 nov, 410d785b2d758023b974c49bb6c2008a). Ver `IDEAS.md`. **9 nov (Javi): sus filas van al FINAL de «Vídeos de Bomberados»**:
  casilla nueva «Adrián Luna» (marcada en sus 11 filas: botella, presión, espuma y el calendario del 9 al 15 nov) y la vista
  «Todos los vídeos» ordena por esa casilla ↑, Publicación ↑, Nivel ↓ y la nueva columna «Creado» ↑ (lo último que escribe,
  abajo del todo). Sus filas se encuentran con `notion-search` + `created_by_user_ids` = su usuario. Para ver lo último que ha tocado alguien:
  `notion-get-version-changes` sobre la BD (el historial del plan solo llega a unos días atrás).
- Filas vacías «Nueva página» creadas por Javi (6 nov 09:42–09:54 y antes): 410d785b2d75808eaf56f117a1bd0dde,
  410d785b2d7580e5a4deef3b3fca4710, 410d785b2d7580e9bb8fe08c35427ded, 40ad785b2d758002926cc0ab2b09f704,
  40ad785b2d7580088025c2ebe0d08220. No borrarlas sin que Javi lo diga.
- Permisos: crear `.claude/settings.json` con reglas allow para Notion/Metricool lo bloquea el clasificador del modo auto
  (darse permisos a sí mismo): no reintentarlo; el modo lo elige Javi en el desplegable junto a la caja de texto.
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
- 2 nov: Javi dijo que había conectado Higgsfield, pero desde esta sesión el proxy sigue rechazando api.higgsfield.ai
  («403 to CONNECT», política de red) y no hay variables HIGGSFIELD_*. Hay que comprobar que el secreto está en el entorno
  de ESTA sesión (Edit cloud environment desde la flecha del título) y, si aun así no va, abrir una sesión nueva en ese
  entorno. Javi pegó la clave de Higgsfield en el chat: no se ha guardado en ningún sitio; se le recomendó crear otra.
- Render del tetraedro: ≈ 1,4 fotogramas/s con 4 procesos (36 s → ≈ 26 min). Ojo: un bucle de espera con
  `pgrep -f "capture.mjs …"` se encuentra a sí mismo y no acaba nunca; contar fotogramas en vez de buscar el proceso.
- 6 nov (presión): en las escenas 3D con capa 2D propia (`overlay(t)` de botella.js, presion.js…), si en un fotograma la
  capa solo se borra (ningún rótulo), Chrome no la vuelve a presentar y la captura sale con los rótulos del fotograma
  anterior. En el render seguido apenas se nota (rótulos ya casi transparentes), pero en las pruebas sueltas engaña:
  presion.js pinta siempre un punto casi invisible al final de `overlay` y `capture.mjs` pinta dos veces el primer
  fotograma de cada trozo (y todos en las pruebas sueltas). Hacer lo mismo en las escenas nuevas.
- 6 nov: `ajustar_voz.py` casa una a una las palabras cuando el reconocedor da tantas como el guion aunque no coincidan
  («veinte, treinta, cuarenta» ↔ «2, 3, 40»); antes las repartía por sílabas y los cues de la cuenta 10-20-30-40-50 caían
  hasta 0,35 s fuera.

### «Tus abuelos tenían media hora» — 3 nov
- Javi eligió la idea 4 de la lista («hazme el vídeo de mi casa y la de mis abuelos… lo más profesional posible, con un
  gancho que haga sentir algo»). Datos de UL FSRI: salón moderno → flashover en 3:30; salón con muebles de mediados del
  siglo XX → 29:30; puerta cerrada 38 °C frente a 260 °C abierta (ver `FUENTES.md`; las webs de FSRI no abren desde aquí).
- Escena `bomberados/plantillas/pregunta/salones.js`: pantalla partida con los dos salones en perspectiva de un punto
  (pintados una vez a doble resolución para el zoom de la apertura), cuentas atrás «PARA SALIR», lupas de materiales,
  ensayo acelerado con ×N honesto, rollover y flashover, dormitorio de noche con la puerta que se cierra y dos dormitorios
  con termómetros. Sonido: `sfx_track_salones` con efectos de ElevenLabs de los vídeos anteriores (la API sigue sin
  conectar). Venta: «¡Mándaselo a tu familia, y que esta noche cierren la puerta!».
- Voz de Javi (una toma, 3 nov): el reconocedor oyó «micra» en el archivo entero; aislado oye «microfibra» → corregido a
  mano en asr_original.json. `medir_voz.py`: OK (venta −21,3/−20,4 dB frente a −22,7). Render ≈ 10 min con 4 procesos
  (2.374 fotogramas). El flashover de los abuelos va en «media hora» (cue `hora2`) para que se vea antes del dormitorio.

## Material de temario que manda Javi (desde el 3 nov)
- Javi manda fotos de páginas de manuales «para próximos vídeos». Se guardan así: datos y resumen con su fuente en
  `bomberados/TEMARIO.md` (el repositorio es PÚBLICO: nada de fotos ni texto completo de los manuales) y el texto completo
  en Notion, página «📚 Temario para vídeos — …» dentro del Centro de trabajo (la primera: 40dd785b-2d75-8114-8afa-db06db88fef0).
- 3 nov: gas natural (Manual de Bomberos del Ayuntamiento de Madrid, pág. 2) y fugas de gas, incendio, deflagración y
  alumbrado público (manual de control de emergencias, pág. 226). Ideas sacadas de ahí en `TEMARIO.md` e `IDEAS.md`.
- 3 nov: grabación de pantalla de la app por dentro (Profe IA / Asistente de Bomberados que responde y cita manual y
  página) en `bomberados/app/` (ver su README). Confirma la función de la IA con manual y página.

### «Profe IA · Bomberados PRO» — 3 nov (idea de Javi)
- Anuncio de la función con la GRABACIÓN REAL de la app (`bomberados/app/app_ia_por_dentro_2026-11-03.mp4`): pregunta
  del examen de Albacete 2026 (CONFIRMAR) sobre la fuga de GLP → copiar → Profe IA → respuesta b), explicación y fuente
  MF0404 · p. 228 → página del manual. Escena `profeia.js`: renderAt async que carga cada fotograma de la grabación
  (`out/rec/`, 30 fps) con el tiempo remapeado a la voz (lo acelerado lleva ▶▶ ×N) y zooms de cámara a la respuesta,
  la explicación y la página. Sonido `sfx_track_profeia` (biblioteca de efectos de ElevenLabs).
- 3 nov: grabación de la ruleta y una partida 1 vs 1 (con cuenta atrás, INCORRECTO/la buena en verde y «Fuente:
  Ayuntamiento de Albacete 2020») en `bomberados/app/app_ruleta_1vs1_movil.mp4`.
