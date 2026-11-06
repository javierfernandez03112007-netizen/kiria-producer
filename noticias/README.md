# Noticias del mundo cada 8 h (→ Notion → ideas de vídeo)

Petición de Javi (6 nov 2026): «cada 8 horas recopilar las noticias más impactantes a nivel mundial, que sean interesantes
para más del 90 % de la población, ponerlas en Notion en una página nueva llamada Noticias, y de ahí sacamos vídeos nuevos».
Sustituye a la captura de métricas de Metricool (`metricas/`), que Javi mandó parar ese mismo día.

## Dónde está en Notion
- Página **📰 Noticias** (410d785b-2d75-8131-9f7e-ed8f1ce5ba4a), dentro de «🎬 kiria.ai · Centro de producción».
- Base **Noticias del mundo**: `collection://a031950f-1e17-44bf-9025-b88c7bbc1552` (BD 735182faec784f649a840bb9a933e060).
  Vistas: «📰 Últimas noticias» (tabla, lo último arriba) y «🎬 Para vídeos» (tablero por Estado).
  Columnas: Noticia (título), Estado (Nueva → Elegida para vídeo → En guion → Vídeo hecho / Descartada), Impacto
  (🔥🔥🔥 Enorme, 🔥🔥 Muy alto, 🔥 Alto), Categoría, Fecha de la noticia, Recopilada (fecha y hora), Dato clave, Resumen,
  Por qué le importa a todos, Idea de vídeo (gancho + giro final), Fuente principal (URL), Más fuentes.

## Tarea programada
Esta sesión (`session_014gBm8Nojm4JMj7MbLpxerp`) tiene la tarea «Noticias mundiales a Notion»:
`CRON_TZ=Europe/Madrid 35 6,14,22 * * *` (06:35, 14:35 y 22:35, hora de España).

## Cómo se elige una noticia
1. **Le importa a más del 90 % de la gente**: toca su dinero (precios, gasolina, bancos, bolsa, pensiones), su salud, su
   comida, su móvil o internet, el clima que vive, su seguridad, o es un hecho histórico que todo el mundo comentará.
   Fuera: política interna de un país, fichajes y cotilleos, sucesos locales, notas de prensa de empresas.
2. **Confirmada**: al menos dos fuentes fiables (agencias, organismos oficiales, medios de referencia) o una oficial.
   Lo que solo diga una parte (p. ej. un ejército) se escribe atribuido («según…») y lo dudoso con «CONFIRMAR».
   Si el titular solo sale en agregadores sin confirmar (6 nov: «Cristiano Ronaldo se retira de la selección»), no entra.
3. **Da para un vídeo de kiria.ai**: tiene un dato que sorprende y se puede explicar en 60 s con objetos (ver
   `engine/REGLAS.md` y `engine/HOOKS.md`). Sin causas políticas: atribuir; nada de culpar a países.
4. **Nueva**: antes de escribir, consultar las noticias de los últimos 3 días en la base; si es la misma historia con
   novedades, se actualiza su fila (Dato clave, Resumen, Más fuentes) en vez de crear otra.
5. Entre 3 y 6 por captura, de más a menos impacto. Si no hay nada a la altura, no se rellena por rellenar.

## Pasos de cada captura
1. `WebSearch` (modo `extended`) en inglés y en español: titulares del día (agencias, Euronews, Anadolu, EFE/Infobae),
   mercados y precios (petróleo, bolsa, inflación), salud (OMS), ciencia y espacio, tecnología, clima y desastres.
2. Contrastar cada candidata con otra búsqueda. `WebFetch` no llega a la mayoría de medios desde esta máquina (red del
   entorno), así que se contrasta con varias búsquedas y se pone la URL de la fuente más fiable.
3. Notion SQL: `SELECT "Noticia", url, "date:Recopilada:start" FROM "collection://a031950f-1e17-44bf-9025-b88c7bbc1552"
   WHERE "date:Recopilada:start" >= date('now','-3 days')` para no repetir.
4. `notion-create-pages` con `data_source_id` a031950f-1e17-44bf-9025-b88c7bbc1552 (Estado «Nueva», Recopilada con hora
   de Madrid). Actualizar con `notion-update-page` las que solo tengan novedades.
5. Resumen a Javi en 3–5 líneas: titulares añadidos y cuál daría el mejor vídeo.
