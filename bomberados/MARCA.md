# Bomberados — sección de la marca (léelo antes de cualquier vídeo de Bomberados)

Objetivo: **escalar Bomberados en redes** (Instagram Reels, TikTok, YouTube Shorts) con muchos vídeos, variados
y baratos de producir. Esta sección usa el mismo motor que kiria.ai (`engine/`, three.js + Playwright, voz,
subtítulos Impact, `engine/sfx.py`), pero **no está obligada a la estructura de kiria.ai**: aquí mandan los
formatos de `bomberados/FORMATOS.md`. Ideas listas para guion: `bomberados/IDEAS.md`.

Cada vídeo vive en `projects/bomberados_<nombre>/` (mismo esquema que siempre: `script.txt`, `script_tts.txt`,
`tiempos.json`, `web/`, `compose_*.py`, `FUENTES.md`, `DESCRIPCION.txt`, `portada.py`). Plantillas ya hechas:
- `projects/bomberos/` — «Ocho de cada diez opositores… se quedan sin plaza» (dato a pelo, 3D con HUD).
- `projects/bomberados_ia/` — «Un fuego de aceite… ¿clase B? V o F» (pregunta test, sartén con letras de fuego,
  personaje estudiando, manuales que pasan, pantalla de la app con cursor). Portada con la placa BOMBERADOS:
  `projects/bomberos/portada.py` (`plate()`, `glow()`).

## Lo que sabemos de la marca (todo pendiente de CONFIRMAR con la marca)
- **Bomberados**: app para opositores a bombero, de la academia **Élite Bomberos** (Instagram @elitebomberos,
  https://elitebomberos.com/ — la web no se abre desde estas máquinas: el dominio no está en la lista de red permitida).
- Funciones conocidas: ruleta con los temarios; test; partidas en directo o en diferido contra otros opositores
  y contra una IA; una IA que, para una pregunta fallada, dice en qué manual y página está, la define y la compara
  con preguntas parecidas; **prueba gratis de 5 días**.
- Lema usado: «Bomberados: falla en casa, no en el examen.»
- Falta pedir a la marca: logo y colores oficiales, capturas reales de la app, precio, temarios/comunidades que
  cubre, ejemplos reales de la IA (manual, tema, página y definición), datos propios (usuarios, preguntas más
  falladas…) y si los vídeos se publican en su cuenta, en la nuestra o como colaboración.

## Reglas que se mantienen (de `engine/REGLAS.md`)
- **Honestidad**: ni una cifra ni una pregunta de temario sin fuente en `FUENTES.md` (norma, ley, BOE, bases de
  la convocatoria, guías oficiales). Ejemplos propios marcados «EJEMPLO». Lo que diga de la app, «CONFIRMAR».
- **Hook** de `engine/HOOKS.md` (o dos combinados), verdadero; apuntarlo en «Hooks ya usados».
- Cada frase se ve cuando se oye; cámara en movimiento; nada cortado por los lados.
- Subtítulos palabra a palabra en **Impact** (`python3 engine/fonts/get_impact.py`, no se sube al repo).
- 1080x1920, **60 fps**, voz en español de España (ElevenLabs, voz Danny), loudnorm ≈ −15 LUFS, 20–60 MB.
- Sin logotipos de otras marcas, sin capturas de academias de la competencia.

## Lo que cambia respecto a kiria.ai
- **Color**: paleta de la marca (fuego: naranja, oro, rojo brasa sobre negro) en vez de monocromo — hasta tener
  los colores oficiales.
- **Marca visible**: se puede (y se debe) mostrar BOMBERADOS (placa dorada) y la llamada a la acción «Pruébala
  gratis 5 días» al final. Nunca la marca kiria.ai.
- **Estructura libre**: además del bucle abierto de 60 s, valen formatos cortos (8–25 s), series diarias,
  POV, duelos, carruseles… (ver `FORMATOS.md`). La respuesta al final sigue siendo lo normal en preguntas-test.
- **Publicidad**: si se publica como colaboración pagada, etiqueta «Colaboración pagada» / #publi visible.
- **Volumen**: priorizar formatos que se rendericen rápido (2D/HUD, pocas partículas, plantillas reutilizables).
  Meta: un vídeo corto en < 30 min de render en una máquina; los 3D grandes (como `bomberados_ia`, horas con
  4 máquinas) solo para piezas estrella. Máquinas extra en la nube solo con permiso del usuario cada vez.

## Voz y momentos de venta (regla de Javi, 1 nov 2026)
- **Momentos de venta = lo más destacado del vídeo** (Javi, 1 nov): «¡Bomberados!», «¡Pruébala gratis cinco días!» y «compártelo / mándaselo a tu compañero de oposición» son cuando se vende la app: la voz ahí tiene que sonar MÁS fuerte, con más ímpetu y más clara que todo lo demás (gancho incluido) y algo más pausada (≈ 5 sílabas/s), sin efectos que la tapen, y la imagen con su golpe más grande.
- Cómo: en `script_tts.txt` (eleven_v3) indicaciones de ímpetu en esas frases ([excited], [emphatic], [proud]), una pausa corta («…») antes de «¡Bomberados!» y mayúsculas en la palabra clave (p. ej. «¡Pruébala GRATIS cinco días!»; los subtítulos salen de `script.txt` y no cambian); el gancho, urgente pero sin gritar más que la venta. Medir cada toma con `bomberados/plantillas/pregunta/medir_voz.py` (tiene que dar «OK»; si da «OJO», otra toma o generar esas frases aparte) y poner `"realce": ["compartir", "marca", "prueba"]` en pregunta.json (la mezcla sube la voz +3 dB y baja los efectos −8 dB en esas frases). En el PAS (ya entregado) no se cumplió: venta −20/−22 dB frente al gancho −17 dB, y «mándaselo…» demasiado rápido (7,7 sílabas/s).
- Voz Danny con ánimo (eleven_v3 con indicaciones de emoción): tensa o caótica en la situación, con ímpetu en la venta.

## Descripción (esquema)
Gancho con emoji → situación → qué hace Bomberados → la respuesta → «Pruébala gratis 5 días: enlace en la bio»
→ pregunta para comentarios + «mándaselo a quien esté opositando» → fuente → hashtags
(#bomberos #oposicionesbombero #opositores #oposiciones #bombero #testoposiciones #bomberados) → versión corta
para TikTok → notas de entrega (no publicar). Ejemplo: `projects/bomberados_ia/DESCRIPCION.txt`.
