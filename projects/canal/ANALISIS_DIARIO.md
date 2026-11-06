# Análisis diario y plan del siguiente vídeo (chat «Análisis y plan · kiria.ai»)

Sistema de 3 chats (Javi, 6-11-2026: «primero tenemos este chat para crear los vídeos, luego el de recopilación de métricas que pasa los
datos a Notion, y por último un chat que recopile esos datos de Notion automáticamente una vez al día de todos los vídeos subidos y en
base a eso planificamos el vídeo siguiente» + «formato, letra, audio, efectos, contenido… todo eso vemos lo que va petando para seguir
mejorando»):
1. **Producción** (el chat que hace los vídeos): guion → voz de Javi → vídeo, portada y descripción.
2. **Métricas** (chat «Recopilación de métricas de vídeos en Notion»): Metricool → Notion a las 08:33 y 20:33 (hora de Madrid).
3. **Análisis y plan** (este): cada día a las 09:47 lee Notion, analiza qué funciona y propone el siguiente vídeo.

## Cada día
0. Al día con el repositorio: `git fetch origin claude/stoic-newton-ja94mt && git checkout -B analisis origin/claude/stoic-newton-ja94mt`.
   Lee `MEMORIA.md`, `engine/REGLAS.md`, `engine/GUION.md` y `engine/HOOKS.md` (reglas de guion, ganchos ya usados y lo que funciona).
1. **Notion** (solo leer, salvo lo del punto 5):
   - «📊 Métricas por vídeo» `collection://e7139401-c71c-4076-af0b-95353fb25eb0` (una fila por vídeo, cifras más recientes) y
     «🕒 Historial de métricas (cada 12 h)» `collection://c8ba2abc-2a70-4b2d-975f-b6f8b67b6f0d` (capturas, visitas nuevas, tiempo medio
     visto, % que pasa de 3 s). Solo `Cuenta = @kiria.ai` (Bomberados tiene su propio análisis). Instagram y, cuando lo haya, TikTok.
   - «Calendario de contenido» `collection://c194bf8b-4e4a-46b8-b6ad-c1953f4d0f2b`: qué está publicado, listo o en guion, y cuándo se sube.
   - Noticias `collection://a031950f-1e17-44bf-9025-b88c7bbc1552` (filas en Estado «Nueva», con idea de vídeo).
   - Si la última captura de métricas tiene más de 14 h, dilo en el resumen (el chat de métricas se ha parado).
2. **Fichas**: a cada vídeo de «📊 Métricas por vídeo» que no tenga Formato, Tema, Gancho, Duración (s), Voz, Letra, Efectos, Estilo visual
   y Carpeta, rellénaselas desde el repositorio (`projects/<carpeta>/`): gancho = primera frase de `script.txt`; duración = `tiempos.json`
   (fin de la voz + la cola de la escena) o el MP4 si está; letra = `face="impact"` en `compose_*.py`; efectos = archivos de ElevenLabs en
   `assets/sfx` (ElevenLabs) o `engine.sfx` (Sintetizados); voz = MEMORIA.md / DESCRIPCION.txt («voz de Javi» o generada); estilo visual =
   la escena en dos frases (primer fotograma, cámara, objetos). Si no estás seguro, déjalo vacío.
3. **Analizar** (solo datos reales; con pocos vídeos o pocas horas, «provisional»):
   - Ranking por visualizaciones y, por cada 1.000 visualizaciones: compartidos, guardados, comentarios y seguidores ganados; tiempo medio
     visto (y en % de la duración) y % que pasa de 3 s (= fuerza del gancho y del primer fotograma).
   - Qué funciona y qué no por: formato, tema, tipo de gancho (plantilla de HOOKS.md), duración, voz, letra, efectos, estilo visual y
     primer fotograma, día y hora de subida, descripción y hashtags. Compara Instagram con TikTok cuando haya datos de los dos.
   - Qué vídeos siguen creciendo (visitas nuevas entre capturas).
   - Qué ha cambiado desde el análisis anterior (`projects/canal/ANALISIS.md`).
4. **Planificar**: 1 vídeo recomendado + 2 alternativas.
   - Tema (de lo que funciona y de las Noticias), formato, gancho (HOOKS.md, sin repetir la fórmula del vídeo anterior), datos con fuente
     (lo dudoso, «CONFIRMAR»), qué se ve en el primer segundo y en cada frase (REGLAS.md), duración ≤ 60 s, día y hora de subida
     (`getBestTimeToPostByNetwork` de Metricool, brandId 7793103, zona Europe/Madrid) y por qué (los datos que lo apoyan).
   - **El guion completo en un solo bloque para pegar en ElevenLabs** (números y siglas escritos como se dicen), listo para que Javi grabe
     la voz: el orden es guion → voz de Javi → vídeo.
   - Una prueba A/B a la semana (cambiar una sola cosa: gancho, duración, hora, primer fotograma, letra…).
   - Reglas: sin precios en los vídeos; datos reales con fuente; sin logos reales; la marca kiria solo en los anuncios del estudio.
5. **Escribir**:
   - Notion, página «📈 Análisis de contenido · kiria.ai» (`410d785b-2d75-8163-b41c-d7fffbc1f18e`): reescribe solo desde
     «## Última actualización» hacia abajo (fecha y hora; datos clave; qué funciona; qué no; prueba A/B; vídeo recomendado con su guion y
     las 2 alternativas). Conserva el texto de arriba tal cual.
   - «Calendario de contenido»: la fila del vídeo recomendado (Estado «Guion», Canal kiria.ai, Vídeo, Formato, Gancho, Notas con el guion y
     el porqué, «Subir el» con la hora propuesta). Si ya hay una fila «Guion» que propusiste tú y Javi no la ha tocado, actualízala en vez de
     crear otra.
   - Repositorio: `projects/canal/ANALISIS.md` (el mismo análisis), commit y push a `claude/stoic-newton-ja94mt` (si ha cambiado, rebase;
     nunca force push). Mensaje de commit en español, sin identificadores de modelo, con las líneas de atribución que indique el sistema.
5b. **La receta** («🏆 La receta de kiria.ai · lo mejor en cada vídeo», Notion `410d785b-2d75-81f0-ab28-dea7f6c2104f`, y
   `projects/canal/RECETA.md`): con lo aprendido hoy, actualiza lo mejor de cada apartado (tema, texto/gancho/cierre, duración, primer
   segundo e imagen, letra, voz y sonido, publicación, lo que no hacer). Cada punto con su prueba y ✅ / 🧪 / 👤; un punto pasa de 🧪 a ✅
   con 3 vídeos o una prueba A/B. Las decisiones de Javi (👤) no se cambian con datos: si los datos las contradicen, se dice en el resumen.
   El guion recomendado tiene que cumplir la receta.
6. **Resumen** al final (3–5 líneas): lo más importante de los datos y el vídeo recomendado (título, gancho y hora de subida).

Nunca publiques ni programes nada (ni en Metricool ni en redes), ni cambies estados o fechas de vídeos ya publicados. Si no hay datos nuevos
desde la última vez, dilo en una línea y no reescribas el análisis.
