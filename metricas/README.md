# Métricas cada 12 h (Metricool → Notion) — PARADO

**6 nov 2026: Javi mandó parar esta tarea** («olvídate de todo lo que teníamos») y la sustituyó por `noticias/`.
La tarea programada está borrada; las bases de Notion se quedan con la captura del 5 nov. Esto queda como referencia.

Petición de Javi (5 nov 2026): recopilar cada 12 h los datos de cada vídeo de las cuentas de kiria.ai y Bomberados
(visitas, me gusta, comentarios…) con Metricool e ir guardándolos en Notion.

## Dónde queda en Notion (dentro de «🎬 kiria.ai · Centro de producción»)
- **📊 Métricas por vídeo** — `collection://e7139401-c71c-4076-af0b-95353fb25eb0` (BD f3e09754705f44a0a2f148073a7900a8).
  Una fila por vídeo publicado: Vídeo, Sección (kiria.ai / Bomberados), Cuenta (@kiria.ai / @elitebomberos), Red,
  Publicado, Enlace, ID (id del reel en Metricool), Notas. Las cifras (Visitas, Alcance, Me gusta, Comentarios, Guardados,
  Compartidos, Interacciones, Última captura) son *rollups* del historial (máximo = último dato, porque son acumuladas):
  no se escriben a mano. Vista «🏆 Ranking por visitas».
- **🕒 Historial de métricas (cada 12 h)** — `collection://c8ba2abc-2a70-4b2d-975f-b6f8b67b6f0d` (BD 9c096bdd631f4e8987a87c926e1adcdd).
  Una fila por vídeo y captura: Captura («<vídeo> · dd/mm hh:mm»), Vídeo (relación), Capturado, Horas desde publicación,
  Visitas, **Visitas nuevas** (diferencia con la captura anterior), Alcance, Me gusta, Comentarios, Guardados, Compartidos,
  Interacciones, Engagement (%), Tiempo medio visto (s), Vistas de más de 3 s (%). Vistas «🕒 Últimas capturas» y gráfico
  «Visitas nuevas por día».

## Tarea programada
Esta sesión (`session_014gBm8Nojm4JMj7MbLpxerp`) tiene la tarea «Métricas kiria.ai y Bomberados a Notion»
(`trig_015bCNXPkPsBExCz8VFiVZ1S`), `CRON_TZ=Europe/Madrid 33 8,20 * * *`: a las 08:33 y 20:33 (10 min antes del análisis
de Bomberados de las 08:43/20:43, que hace otra sesión; ver `bomberados/MEMORIA_BOMBERADOS.md`).

## Pasos de cada captura
1. `getBrandSettings` (Metricool): marcas conectadas. Hoy solo **kiria.ai** (brandId `7793103`, Instagram `kiria.ai`).
2. Por marca: `getAnalyticsDataByMetrics` desde `2026-10-01T00:00:00+02:00` hasta ahora con, en este orden,
   `IGRE04 IGRE02 IGRE23 IGRE11 IGRE10 IGRE07 IGRE12 IGRE21 IGRE09 IGRE08 IGRE24 IGRE28`
   (id, fecha, visitas, alcance, me gusta, comentarios, guardados, compartidos, interacciones, engagement %, tiempo medio
   visto, vistas de más de 3 s %). Guardar la respuesta tal cual como `filas.json` en el scratchpad.
   - No usar `IGRE13`/`IGRE15` (obsoletas). `IGRE26` (duración), `IGRE27` (retención) y `IGRE29` (reposts) llegan vacías.
   - La fecha de Metricool está en la zona de la marca (Europe/Madrid).
   - Metricool no refresca al instante: dos capturas seguidas pueden dar lo mismo.
3. Notion (SQL, una BD por consulta):
   - `SELECT "userDefined:ID" AS id, url AS pagina, "Vídeo" AS titulo, "Sección" AS seccion, "Cuenta" AS cuenta FROM "collection://e7139401-c71c-4076-af0b-95353fb25eb0"` → `videos.json`
   - `SELECT "Vídeo" AS video, "Visitas" AS visitas, MAX("date:Capturado:start") AS capturado FROM "collection://c8ba2abc-2a70-4b2d-975f-b6f8b67b6f0d" GROUP BY "Vídeo"` → `anteriores.json`
4. `python3 metricas/captura.py filas.json videos.json anteriores.json > paginas.json`. Si avisa «FALTA FILA» (reel
   nuevo): pedir a Metricool `IGRE04 IGRE02 IGRE03 IGRE06` (texto y enlace), crear la fila en «Métricas por vídeo»
   (título corto como los demás, Sección según el contenido, Cuenta, Red Instagram, Publicado con hora de Madrid, Enlace,
   ID) y volver a ejecutar el script.
   Si avisa «SIN CAMBIOS» (Metricool aún no ha refrescado y todo da igual que en la captura anterior), no se crean filas:
   se dice en el resumen y se espera a la siguiente captura. Si se repite, comprobar si Metricool sincroniza: pedir
   `IGEV01 IGEV05 IGEV23` (seguidores, visualizaciones, visualizaciones de reels) de un solo día; si el día anterior sale
   todo a 0, Metricool ha perdido la conexión con Instagram y Javi tiene que reconectarla (6 nov: último día con datos, el 4).
5. `notion-create-pages` con `paginas.json` en el historial (`data_source_id` c8ba2abc-2a70-4b2d-975f-b6f8b67b6f0d,
   hasta 100 páginas por llamada).
6. Resumen corto a Javi: vídeos capturados, el que más visitas ha ganado en 12 h, errores. Nunca inventar datos ni dejar
   una captura a medias.

## Bomberados
- El Instagram **@elitebomberos** no está en Metricool (5 nov): solo está la marca kiria.ai. Para que entre, Javi tiene que
  crear una marca nueva en Metricool y conectar ahí @elitebomberos (cuenta profesional; hace falta acceso de administrador).
  En cuanto aparezca en `getBrandSettings`, la tarea la incluye con Cuenta «@elitebomberos» y Sección «Bomberados».
- 6 nov: una segunda marca en Metricool es de pago, así que Javi va a añadir @elitebomberos como **competidor** de
  kiria.ai (para eso tiene que reconectar el Instagram de kiria.ai por Facebook; ver `bomberados/MEMORIA_BOMBERADOS.md`).
  Un competidor no sale en `getBrandSettings` ni da visitas, guardados o compartidos: solo me gusta, comentarios y
  seguidores (IGCO/IGCR). Esos los usa el análisis de Bomberados de las 08:43/20:43; las visitas siguen viniendo de Notion.
  Ojo: al cambiar el tipo de conexión de Instagram, Metricool solo trae los últimos 30 días de la conexión nueva.
- 6 nov: los datos del día 5 llegaron más tarde (hacia las 09:50, hora de Madrid, ya estaban: 4.861 seguidores): un día a 0 por la mañana
  puede ser solo retraso de Metricool; volver a mirarlo antes de pedir a Javi que reconecte.
- Lo que ya se publicó de Bomberados en @kiria.ai (p. ej. «Aceite en la sartén», 28 oct) se marca con Sección «Bomberados».
- Pendiente cuando esté conectada: copiar también los últimos datos a la BD «📊 Métricas por vídeo» de Bomberados
  (`collection://29d4dd57-c184-41eb-8063-541ee3e9d240`: Vistas, Me gusta, Comentarios, Compartidos, Guardados, Retención 3 s;
  una fila por vídeo con la relación «Vídeo de Bomberados») para que el análisis de las 08:43/20:43 no dependa de que Javi
  los copie a mano. Desde el 6 nov «Vídeos de Bomberados» ya no tiene columnas de métricas (lo pidió Javi).
