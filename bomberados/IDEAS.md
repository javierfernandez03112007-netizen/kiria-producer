# Bomberados — banco de ideas

Estado: 💡 idea · ✍️ guion · 🎬 hecho. **Antes de escribir el guion, buscar y apuntar la fuente oficial**
(norma, ley, BOE, guía oficial o bases de la convocatoria) y comprobar que la respuesta es la que dice aquí; si
no se encuentra fuente, la idea no se hace. El formato es el número de `FORMATOS.md`.

## Hechos
- 🎬 «Ocho de cada diez opositores a bombero en Madrid se quedan sin plaza» (F2) — `projects/bomberos/`
- 🎬 «Un fuego de aceite en una sartén es de clase B. ¿V o F?» (F1) — `projects/bomberados_ia/`
- 🎬 Pregunta del día #1: reducción de 45 a 25 mm, ¿presión y velocidad? (F3; respuesta en la descripción) — `projects/bomberados_reduccion/`
- 🎬 Pregunta del día #2: bradipnea, examen del Ayuntamiento de Albacete 2026 (F3; reto «¿quién acierta?») — `projects/bomberados_bradipnea/`
- 🎬 Pregunta del día #3: panel naranja ADR, ¿qué indica el número de arriba? (F3, estilo de la app) — `projects/bomberados_adr/`
- 🎬 Pregunta del día #4: llegas el primero a un accidente con un herido, ¿qué haces primero? (F3, conducta PAS; fondo «carretera» con escena propia y efectos de ElevenLabs) — `projects/bomberados_pas/`
- 🎬 Promo: simulacro en directo de Élite Bomberos con Adrián Luna, domingo 1 nov, 10 € (escena propia, estilo de la app) — `projects/bomberados_simulacro/`

## Temario (preguntas con trampa)
| Idea | Formato | Respuesta a comprobar | Fuente a buscar |
|---|---|---|---|
| 💡 «Si echas agua a una sartén con aceite ardiendo, se apaga. ¿V o F?» | 1 / 6 | Falso: el agua se evapora de golpe y proyecta el aceite en llamas | guías de prevención (112, protección civil) |
| ✍️ ¿Triángulo o tetraedro del fuego? («Al fuego le falta una pieza»; guion enviado y escena hecha el 2 nov, falta la voz) | 9 | Tetraedro: combustible, comburente, energía de activación y reacción en cadena | INSST NTP 599, NTP 99 y Tema 5 (en `projects/bomberados_tetraedro/FUENTES.md`) |
| 💡 Los 4 métodos de extinción en 30 s (enfriar, sofocar, quitar combustible, inhibir) | 9 | uno por lado del tetraedro | ídem |
| 💡 «Un extintor de CO2 sirve para cualquier fuego» | 6 | Falso: según clases de fuego y eficacia del extintor | RD 513/2017 (RIPCI), UNE-EN 3-7 |
| ✍️ ¿Qué significa «21A-113B» en un extintor? (pregunta del 4 nov, versión cinematográfica en 3D; guion enviado el 3 nov) | 3 | A: pila de madera del ensayo de 2,1 m; B: bandeja con 113 L de líquido (2/3 heptano + 1/3 agua) | UNE-EN 3-7; CTE DB SI 4 tabla 1.1 (en `projects/bomberados_extintor/FUENTES.md`) |
| ✍️ **Idea de Javi (3 nov; guion enviado el 5 nov, `projects/bomberados_acoplamiento/`): acoplamiento de autobombas EN SERIE o EN PARALELO.** Explicarlo MUY bien: qué se gana con cada uno (en serie se suman presiones para llegar lejos o alto con el mismo caudal; en paralelo se suman caudales con la misma presión), cuándo se usa cada uno y la trampa típica del examen | 9 (explicado, cinematográfico) | comprobar con el manual | manual de bombas / hidráulica que use Javi (pedirle la página) o manual oficial de bomberos |
| 💡 Flashover vs backdraft: la pregunta que más se confunde | 8 | combustión súbita generalizada vs explosión de humo por entrada de aire | manuales oficiales |
| 💡 Panel naranja de un camión: ¿qué número va arriba? | 3 / 8 | arriba el número de peligro, abajo el número ONU | ADR (acuerdo europeo de mercancías peligrosas) |
| 💡 RCP: ¿cuántas compresiones y cuántas ventilaciones? | 3 | 30:2 en adultos | guías del ERC (Consejo Español de RCP) |
| 💡 ¿Qué ley regula el Sistema Nacional de Protección Civil? | 3 | Ley 17/2015 | BOE |
| 💡 Constitución: artículos que entran en casi todos los temarios | 4 | según bases | BOE (CE 1978) + bases de convocatorias |
| 💡 Agentes extintores: agua, espuma, polvo, CO2 — cuál para cada clase | 4 / 9 | tabla de idoneidad | RIPCI / UNE-EN 3-7 |
| 🎬 **Idea de Adrián (Notion, 5 nov, con su guion en la fila «AUTONOMIA DE BOTELLA»; hecho el 6 nov: «¿Cuánto aire te queda?», `projects/bomberados_botella/`)**: autonomía de un ERA. Botella de 230 bar y 7 L, reserva 60 bar, consumo 35 L/min → a) 46 b) 40 c) 34 d) 30 min. Gancho: «¿cuánto tiempo tienes antes de quedarte sin aire?» | 3 / 9 | C) 34 min: (230 − 60) × 7 = 1.190 L ÷ 35 L/min | pregunta de examen (Adrián no pone cuál): pedirle convocatoria; manual de ERA |
| 🎬 **Idea de Adrián (Notion, 6 nov, con su guion en la fila «PRESION EN BOMBA»; HECHO el 6 nov, listo para subir, `projects/bomberados_presion/`)**: examen del Ayto. de Santiago de Compostela 2017. Tendido que sube 50 m sobre la bomba, lanza CERRADA y manómetro a 8 bar: ¿presión en punta? a) 1,5 b) 2 c) 3 d) 8 bar | 3 (enlaza con el de acoplamiento) | C) 3 bar: cada 10 m de altura ≈ 1 bar (8 − 5); con la lanza cerrada no hay pérdidas por rozamiento | examen de Santiago de Compostela 2017 (buscar el cuadernillo) + manual de hidráulica |
| 💡 Nudos: «¿cuál es este nudo?» (as de guía, ballestrinque…) | 3 | — | manuales oficiales de cuerdas |

## Oposición y opositores
| Idea | Formato | Dato a comprobar | Fuente |
|---|---|---|---|
| 💡 Plazas abiertas este mes en España (resumen de convocatorias) | 10 | plazas, fechas, plazo | BOE / boletines autonómicos |
| 💡 Pruebas físicas de [convocatoria]: ¿las pasarías? | 11 | marcas exigidas | bases oficiales |
| 💡 «En Navarra, solo el 14 % aprobó el teórico» | 2 | 83 de 579 (2022) | ya en `projects/bomberos/FUENTES.md` |
| 💡 «El 75 % suspendió el primer examen en el País Vasco» | 2 | 75,5 % oficial | ya en `projects/bomberos/FUENTES.md` |
| 💡 Cuánto cobra un bombero en [ciudad] | 2 | sueldo según RPT / tablas salariales | documentos oficiales del ayuntamiento |
| 💡 Requisitos para opositar (edad, carnet C, estudios) | 10 | según bases | bases oficiales |
| 💡 POV: el día antes del examen | 7 | — (humor, sin datos) | — |
| 💡 POV: te sale en el examen la pregunta que fallaste ayer | 7 | — | — |

## La app (CONFIRMAR cada función con la marca)
| Idea | Formato |
|---|---|
| 💡 Tú contra la IA: partida en directo | 5 |
| 💡 La ruleta del temario: te toca el tema que menos te gusta | 7 / 5 |
| 💡 Pregunta del día (serie diaria) | 3 |
| 💡 Test relámpago: ¿cuántas aciertas de 3? | 4 |
| 💡 Pregunta fallada → la IA te dice manual y página (versión corta de `bomberados_ia`, 15 s) | 3 / 5 |

## Ideas para petarlo (2 nov, tras mirar la competencia: ver `COMPETENCIA.md`)
| Idea | Gancho / mecánica | Fuente a comprobar |
|---|---|---|
| 💡 «Si echas agua aquí… pasa esto» (sartén con aceite, cámara superlenta; es el «Mito o realidad» del sáb 7) | bola de fuego en el 1.er segundo; «mándaselo a quien cocina en tu casa» | guías oficiales 112 / Protección Civil |
| 💡 «Encuentra los 5 peligros de incendio de esta casa» (10 s para mirar) | «comenta cuántos has visto»; cada peligro se revela con su mini incendio | guías oficiales de prevención en el hogar |
| 💡 «Para el vídeo en el 10,00» (muñeco trepando la cuerda con cronómetro gigante) | reto de reflejos: comentan su tiempo y lo vuelven a ver | marca del 10 en unas bases oficiales |
| 💡 «Hoy tienes 4 minutos para salir de tu casa en llamas. Tus abuelos tenían casi 30.» | dos salones ardiendo a la vez hasta el flashover; enlaza con «flashover vs backdraft» | UL FSRI (3:40 frente a 29:30) |
| 💡 «Las pruebas más raras para ser bombero» (palear arena, claustrofobia, viga…) | «¿cuál te parece más difícil? comenta el número» | bases de cada convocatoria |
| 💡 «¿Cuántos opositores hay por plaza en tu ciudad?» (mapa que se enciende) | «¿y en tu ciudad?» → serie con los comentarios | listas oficiales de admitidos y plazas |
| 💡 «La pregunta que más falla la gente en Bomberados» | reto con datos que solo tiene la app | dato de la marca (CONFIRMAR) |

## Del temario que manda Javi (ver `TEMARIO.md`, con manual y página)
| Idea | Formato | Dato | Fuente |
|---|---|---|---|
| 💡 «¿El gas de tu casa sube o baja?» | 3 / 6 | gas natural 0,62 (sube, rejilla a 180 cm); butano 2,03 y propano 1,54 (bajan, rejilla a 30 cm) | Manual de Bomberos del Ayto. de Madrid, Gas Natural, pág. 2 |
| 💡 «El gas no huele a nada» | 6 | el olor es THT, un aditivo (0,005 ppm) | ídem |
| 💡 «Mira la llama de tu cocina» | 6 / 9 | azul = buena combustión; amarilla = CO, tóxico > 50 ppm | ídem |
| 💡 «Si arde una fuga de gas, los bomberos no la apagan» | 8 | se corta el flujo de gas y el fuego se apaga solo | manual de control de emergencias, pág. 226 |
| 💡 «El gas natural no es tóxico… pero te puede matar» | 6 | asfixia con O2 < 19,5 % | Manual del Ayto. de Madrid, pág. 2 |
| 💡 «¿Por qué tu cocina de butano no vale para gas natural?» | 9 | familias de gases, índice de Wobbe (UNE-EN 437) | ídem |
| 💡 «¿Por qué si se rompe una farola no se apagan todas?» | 9 | farolas en fases alternas | manual de control de emergencias, pág. 226 |
| ✍️ **Idea de Javi (6 nov; guion enviado el 6 nov, `projects/bomberados_sueldos/`): «¿Cuánto gana un bombero en Madrid y en Granada… y por qué?»** Tema polémico, 1 minuto, 3D de noche con dron (estilo del acoplamiento) | 2 (dato de la oposición: lo que más se comparte) | Ayto. de Madrid 27.803,72 € de específico frente a 25.389,34 € en Granada; mismo sueldo base del Estado; Granada, casi 5 guardias más al año | acuerdo del Ayto. de Madrid (31-7-2024), presupuesto de Granada 2026, BOCM 9-2-2026 y 1-8-2025 |
