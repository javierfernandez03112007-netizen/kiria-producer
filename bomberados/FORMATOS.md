# Bomberados — formatos (salir de la estructura de kiria.ai)

Cada formato dice duración, estructura, coste de render y plantilla. Rotar formatos: no repetir el mismo dos
vídeos seguidos. Los que tienen ⚡ son los baratos para publicar a diario.

| # | Formato | Duración | Estructura | Render | Plantilla |
|---|---|---|---|---|---|
| 1 | **V o F con trampa** | 35–50 s | Afirmación-test → «piénsalo» → situación del opositor → demo de la app → respuesta → «¿qué habías puesto?» | 3D, caro | `projects/bomberados_ia/` |
| 2 | **Dato a pelo** | 45–60 s | Cifra real de una convocatoria → por qué pasa (3 motivos) → la app como solución → marca | 3D/HUD | `projects/bomberos/` |
| 3 | ⚡ **Pregunta del día** (serie) | 8–15 s | Pregunta tipo test con 4 opciones en pantalla, cuenta atrás 5 s, la respuesta se ilumina, «¿la has acertado?». Voz opcional (solo leer la pregunta) | 2D, < 10 min | crear `bomberados/plantillas/pregunta/` |
| 4 | ⚡ **Test relámpago** | 20–25 s | 3 preguntas seguidas, marcador «0/3 → 3/3», la última es la trampa; «comenta tu nota» | 2D | igual que 3, encadenado |
| 5 | **Tú contra la IA** | 25–40 s | Partida en directo recreada: marcador opositor vs IA, pregunta, tiempo, quién acierta; cierre «¿le ganas tú?» (función real de la app: CONFIRMAR) | 2D + pantalla de app | pantalla de `bomberados_ia` (`15_ui.js`) |
| 6 | **Mito o realidad** | 25–40 s | Creencia común («el agua apaga cualquier fuego») → se rompe con imagen → explicación con norma → marca | 3D medio | — |
| 7 | **POV del opositor** | 15–30 s | Texto «POV: te quedan 30 días para el examen…» + escena del personaje (`makePerson`) en bucle; humor; app como alivio | 3D medio | personaje de `bomberados_ia` |
| 8 | **Error típico del examen** | 25–40 s | «El 90 % confunde X con Y» (solo con dato de la marca) o «Esta pregunta tiene trampa» → las dos opciones lado a lado → la diferencia en una imagen | 2D/3D | — |
| 9 | **Explicado en 30 s** | 30–45 s | Un concepto del temario con objetos que se transforman (triángulo → tetraedro del fuego, métodos de extinción…) | 3D | `engine/web/morph.js` |
| 10 | **Convocatoria al día** | 15–30 s | Plazas abiertas / fechas / requisitos de una convocatoria real (BOE / boletín autonómico, con fecha) → «prepárala con Bomberados» | 2D, rápido | HUD de `projects/bomberos/` |
| 11 | **Prueba física** | 25–45 s | Marcas exigidas en una convocatoria concreta (bases oficiales) con el cronómetro y el atleta-maniquí | 3D | — |
| 12 | **Carrusel / foto** | — | 5–8 láminas 1080x1350 (miniaturas con preguntas, «guarda esto») desde `portada.py` | imagen | `projects/bomberados_ia/portada.py` |

## Reglas propias de las series ⚡
- Mismo diseño fijo (fondo de fuego en bucle prerenderizado una vez + tarjetas 2D), solo cambia el texto:
  se generan en lote desde un JSON de preguntas (`pregunta`, `opciones`, `correcta`, `fuente`).
- Cada pregunta con su fuente (norma, ley, manual oficial) en el JSON; nada de preguntas inventadas.
- Cierre fijo de 1,5 s: placa BOMBERADOS + «Pruébala gratis 5 días».
- Portada automática con la pregunta.

## Calendario orientativo (para escalar)
- 1 pieza ⚡ al día (formatos 3–4), 2–3 piezas medias a la semana (5–9), 1 pieza estrella al mes (1–2, 11).
- Medir: retención a los 3 s, % que ve entero, comentarios (las preguntas V/F y «¿qué nota sacas?» los provocan).
