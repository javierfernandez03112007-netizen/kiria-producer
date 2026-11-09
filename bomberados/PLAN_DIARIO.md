# Bomberados — plan de cada mañana (chat «Bomberados · plan de cada mañana»)

Lo pidió Javi el 6 nov: «cada mañana a las 7 recopila toda la información de Notion, cambia cosas si es necesario […] y una
vez recopilada la información y cambiados los planes, lo tenemos en cuenta para hacer los demás vídeos». Javi actualiza a
diario los números de los vídeos y, cada 3 días, los seguidores. **Javi da permiso para todos los cambios en Notion de
Bomberados** («acepto todo lo que me pidas de Notion», 6 nov).

Este chat **no hace vídeos**: analiza, ajusta el plan y deja escrito lo que la sesión de producción tiene que tener en
cuenta. La sesión de producción lee `bomberados/ANALISIS.md` antes de cada vídeo (está en `CLAUDE.md`).

## Cada mañana (empieza a las 6:33, hora de Madrid, para estar listo a las 7)

1. `git pull --rebase origin master` y lee: `CLAUDE.md`, `bomberados/ANALISIS.md` (el plan de ayer),
   `bomberados/MEMORIA_BOMBERADOS.md` (estado de cada vídeo), `bomberados/IDEAS.md`, `bomberados/FORMATOS.md` y
   `bomberados/MARCA.md`.
2. Recopila TODO lo de Bomberados en Notion (página «Bomberados — Centro de trabajo», `409d785b2d758116bfcfc9cf65d9f2ed`):
   - **👥 Seguidores de las cuentas** (`collection://1b778735-44d1-4848-a376-b7c608b6239a`): filas «Seguidores Bomberados» y
     «Seguidores Élite»; una columna cada 3 días («6 nov», «9 nov», «12 nov»…). Calcula cuánto crece cada cuenta por
     periodo y por día, y relaciónalo con lo publicado en ese periodo. Si se acaban las columnas (después de «30 dic»),
     añade las siguientes de 3 en 3 y ponlas en orden en la vista «Seguidores cada 3 días».
   - **📊 Métricas por vídeo** (`collection://29d4dd57-c184-41eb-8063-541ee3e9d240`): Vistas, Me gusta, Comentarios,
     Compartidos y sus «por 1.000». **Solo lo que se ve como espectador**: Javi no tiene acceso a las estadísticas internas;
     no pidas guardados, retención, alcance ni seguidores ganados por vídeo.
   - **Vídeos de Bomberados** (`collection://5422fb68-0692-456e-8aac-49a9c79151c9`): estado, formato, nivel, fecha y hora
     de publicación, descripción, fuente y notas. Fíjate en lo nuevo o cambiado, sobre todo lo que escriba **Adrián Luna**
     (Élite Bomberos): ideas, guiones y preguntas de examen. **Marca la casilla «Adrián Luna»** en cada fila nueva suya (Javi,
     9 nov: sus vídeos van al final de la tabla, los últimos que escribe abajo del todo; la vista «Todos los vídeos» ordena
     por esa casilla, luego por fecha, nivel y «Creado»). Para encontrarlas: `notion-search` en la base con el filtro
     `created_by_user_ids: ["437aba8b-31f4-4c21-ab9c-bafe78ac64d1"]` (su usuario de invitado).
   - Lo demás del centro de trabajo (agenda, temarios que manda Javi, comentarios nuevos): `notion-search` dentro de la
     página y, si hace falta, `notion-get-version-changes` de las páginas tocadas en las últimas 24 h.
   - Cada vídeo entregado ya tiene su fila en Métricas (la crea quien lo entrega, desde el 9 nov). Si aun así uno
     «Listo para subir», «Programado» o «Publicado» no la tiene, créasela (mismo título y la relación) con las cifras vacías.
3. Analiza: qué ha cambiado desde ayer; ranking por vistas y por cada 1.000 vistas (me gusta, comentarios, compartidos);
   qué funciona y qué no por formato, gancho, tema, duración, día y hora; y el crecimiento de seguidores de las dos
   cuentas. Lo que tenga pocos datos, «provisional». **No inventes cifras.**
4. Cambia el plan si hace falta. **Regla de Javi (6 nov): cambia solo para mejorar.** Los requisitos de los vídeos
   (sección «🎬 Requisitos» de `ANALISIS.md` y de la página de análisis) solo se actualizan cuando un vídeo supera al
   estándar actual en vistas o en las métricas por 1.000; entonces se incorpora lo que le ha funcionado, mezclando estilos
   si hace falta (p. ej., otro formato que supere al 3D con dron → se combina con el dron). Si nada lo supera, se mantienen.
   - Página **📈 Análisis de contenido de Bomberados** (`40fd785b-2d75-8178-a380-df98f5fb42bb`): reescribe solo la parte del
     análisis (de «## Última actualización» hacia abajo). Conserva tal cual, arriba: «## 👥 Seguidores totales», la base
     «👥 Seguidores de las cuentas» (database `166e5e8690984daf8eaf15610ada0d6b`), el aviso azul, la base
     «📊 Métricas por vídeo» (database `c0f6e2b7fcf24b308302d0bcb538285d`) y la subpágina «Cómo analizar los vídeos». Usa
     `update_content` (con `replace_content` hay que copiar sus etiquetas exactas). Rellena la «Conclusión» de los vídeos
     con datos nuevos.
   - **Vídeos de Bomberados**: ajusta lo que viene (filas en «Idea» o «Guion»): prioridad, formato, gancho propuesto y notas;
     mueve fechas previstas de lo que aún no está listo si los datos lo piden; crea filas de ideas nuevas si hace falta.
     **No** pongas nada en «Publicado», **no** toques la fecha de lo que Javi ya ha programado o publicado y **no** borres
     filas (tampoco las vacías).
5. Deja el plan para producción en el repositorio:
   - `bomberados/ANALISIS.md`: arriba del todo, **«📌 Para los próximos vídeos (plan del <fecha>)»** con 5–8 reglas concretas
     para quien haga los vídeos (formatos que priorizar, ganchos, duración, temas, CTA, horas), y debajo el análisis.
   - `bomberados/IDEAS.md` si cambia el orden de lo próximo a producir.
   - Commit y push a master (`git pull --rebase` antes; nunca force push).
6. Resumen a Javi en el chat (5–8 líneas): lo más importante de los datos, qué has cambiado en Notion y qué haremos en los
   próximos vídeos.

Si no hay datos nuevos desde ayer, dilo en una línea y no reescribas el análisis (pero mira igualmente si Adrián ha escrito
algo nuevo).
