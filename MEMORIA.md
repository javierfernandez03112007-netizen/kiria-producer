# Memoria del proyecto (léela al empezar cualquier sesión)

Lo que se ha decidido y aprendido en las conversaciones con Javi (dueño del canal). Las sesiones nuevas no recuerdan el chat:
esto, `CLAUDE.md` y los `.md` de `engine/` son la memoria. Actualízala cuando cambie algo importante.

## Cómo trabajamos
- Respuestas en español, claras y con estimaciones de tiempo honestas.
- Cada cambio se hace commit y push a `master` (sin PR salvo que lo pida), con las líneas de atribución que indique el sistema y sin
  identificadores de modelo.
- **Orden de trabajo, SIEMPRE (Javi, 5-11-2026: «¿por qué nunca me das el guion primero para darte la voz y ya sigues editando?»)**:
  1) le doy el guion en un solo bloque para pegarlo en ElevenLabs, 2) **espero su MP3 (voz Danny)**, 3) monto y renderizo el vídeo con su
  voz (se sincroniza con el texto conocido). Mientras llega su audio se puede preparar la escena, pero no generar yo la voz ni renderizar
  el vídeo final con una voz provisional, salvo que él lo pida.
- Guion: lo escribo yo siguiendo `engine/REGLAS.md`, `engine/GUION.md` y `engine/HOOKS.md`; se lo doy **todo junto en un solo bloque**
  para pegarlo en ElevenLabs. Datos siempre reales y con fuente en `FUENTES.md` (lo dudoso, «CONFIRMAR»).
- Entrega de cada vídeo: `out/<nombre>.mp4` (1080x1920, 60 fps, 20–60 MB, ≈ −15/−16 LUFS), `out/portada.jpg` (9:16), `out/miniatura.jpg`
  (4:5) y `DESCRIPCION.txt` (versión larga + corta para TikTok + notas de entrega).
- Nada de aviones en vídeos que no sean de aeronáutica; nada cortado por los lados; sin logos reales; sin la marca kiria.ai en los vídeos.

## Sistema de 3 chats (Javi, 6-11-2026)
1. **Producción** (este tipo de chat): guion → voz de Javi → vídeo, portada, descripción (y TikTok: `projects/canal/TIKTOK.md`).
2. **Métricas** (chat «Recopilación de métricas de vídeos en Notion», `session_014gBm8Nojm4JMj7MbLpxerp`): tarea programada «kiria.ai ·
   métricas de los vídeos a Notion» a las 08:33 y 20:33 (Metricool → «🕒 Historial de métricas» y «📊 Métricas por vídeo»). Se había
   parado el 6-11 por la mañana (el chat pasó a recoger noticias cada 8 h, que sigue); reactivada ese día.
3. **Análisis y plan** (chat «Análisis y plan · kiria.ai», `session_014gBm8SaSv1G456NUVzrJKf`): tarea programada diaria a las 09:47 que
   sigue `projects/canal/ANALISIS_DIARIO.md`: rellena las fichas de cada vídeo (formato, tema, gancho, duración, voz, letra, efectos,
   estilo visual), analiza qué funciona, escribe la página de Notion «📈 Análisis de contenido · kiria.ai» y `projects/canal/ANALISIS.md`
   y deja el siguiente vídeo con el guion listo en el Calendario (Estado «Guion»). Javi elige y el chat de producción lo hace.

## Render en varias máquinas (cuando Javi lo aprueba en ese vídeo)
- Plantilla completa: `projects/derecho/` (escena en `web/src/*.js` → `web/build.sh` → `web/scene.js`; `render_local.sh`, `fetch_compose.sh`,
  `compose_der.py`, `portada.py`).
- Esta máquina hace un trozo con `WK=3 ./render_local.sh A B`; las de ayuda se crean con `create_session` (modelo Sonnet, etiqueta
  `kiria-render-<proj>`), cada una renderiza un rango, lo codifica (`chunks/chunk_A_B.mp4`, crf 14) y lo sube a la rama `render-<proj>-x`,
  y avisa con `send_message`. `fetch_compose.sh` recoge los trozos y compone solo al tener todos los fotogramas.
- Rendimiento: ≈ 0,6 fotogramas/s por máquina de 4 núcleos (3 procesos). Un vídeo de 72 s (4.352 fotogramas) con 6 máquinas: ≈ 35–45 min.
- Pendiente de permiso: borrar ramas `render-*` antiguas y archivar las sesiones de ayuda (no hacerlo sin que lo diga).
- Las máquinas «Bomberados · render N» solo aceptan órdenes de la sesión BOMBERADOS (rechazan las de otras sesiones): para los vídeos de
  kiria.ai se crean máquinas propias con `create_session` (4-11-2026: «Lanzamiento · render 1–6», etiqueta `kiria-render-lan`).

## Resultados del canal (datos que ha dado Javi)
| Vídeo | Datos |
|---|---|
| Ingeniería Industrial | ≈ 500.000 visitas (1-11-2026; antes 460.000 visitas, 22.000 me gusta), muchos seguidores |
| Ingeniería Informática | 165.000 visitas y 9.400 me gusta (en su momento) |
| Derecho por dentro | ≈ 750.000 visitas y ≈ 60.000 me gusta (1-11-2026, noche); ≈ 720.000 y ≈ 50.000 a mediodía; 378.000 visitas en 15 h, 25.100 me gusta, 78 comentarios, 811 guardados, 4.285 envíos, 820 seguidores (ver `projects/derecho/METRICAS.md`; faltan los datos de 24 h y 48 h) |
| Total canal | **≈ 3,2 millones de visitas en 7 días** (Instagram, dato de Javi del 1-11-2026, noche); antes ≈ 800.000 entre todos; vídeos con 14.000, 10.000 y 6.000 me gusta |

Lo que funciona: carreras «por dentro» con un giro verdadero («acabas la carrera… y todavía no eres…», «menos de 3 de cada 100»),
datos oficiales, respuesta al final y pregunta de bando al cierre («¿abogado o juez?»). Los duelos generan comentarios.

## Próximas ideas
1. **Psicología** (elegida el 1-11-2026; plan y datos en `projects/psicologia/IDEA.md` y `FUENTES.md`): «Estudias cuatro años de Psicología… y la ley no te deja tratar ni a un solo paciente» → Máster en Psicología General
   Sanitaria o PIR. (Comprobar Ley 33/2011, créditos del máster, plazas PIR y nota de corte antes del guion.)
2. Medicina (6 años + MIR), duelos (ADE vs Economía, Matemáticas vs Física, Arquitectura vs Edificación, Informática vs Ciencia de Datos),
   «la nota de corte más alta no es Medicina», serie numerada «Carreras por dentro».
3. **Vídeos del lanzamiento: SIN PRECIOS (Javi, 4-11-2026: «no pongas ningún precio ni nada en los vídeos, solamente quiero mostrar resultados,
   visitas, seguidores etc.»).** Solo resultados reales (con fuente: panel de Instagram o Metricool) y «comenta KIRIA». Vídeo 1 «Ni una sola cámara» (`projects/lanzamiento/`,
   entregado el 4-11-2026: 23 s, 1380 fotogramas, −14,7 LUFS; voz de Danny con las frases de los precios recortadas). A Javi le
   encantó y pidió la **versión larga (v3, 33 s, 1980 fotogramas)**: «más de 2.500 seguidores nuevos en 6 días. ¿Cómo?», «puedes probar tu
   objeto en 3D… en redes… o en una página web» y el cierre «comenta KIRIA y te paso el enlace por privado». Voz: **la toma completa que
   mandó Javi** (11:41; antes había generado yo las frases nuevas con su voz y ajustes, `tts_extra.py` + `voz_con_extra.py`, ya sin usar);
   render por trozos en ramas `render-lan4-*`. **v3 entregada el 4-11-2026 (12:05): 33 s, 1980 fotogramas, −14,6 LUFS.** La v2 queda en
   `out/lanzamiento_v2_23s.mp4`. Pendiente antes de publicar: la captura de los 3,2 M en 7 días (Metricool da 1,93 M del 26 oct al
   1 nov) y la respuesta automática a «KIRIA» con el enlace.
3. **Lanzamiento de la web del estudio (plan de Javi, 4-11-2026)**: varios reels con «comenta KIRIA» → mensaje privado con el enlace a
   WhatsApp → allí la web con un 10 % extra. Propuesto: decir «tener un vídeo así», no «aprender» (no hay curso); Canal de WhatsApp
   en vez de grupo (en un grupo se ve su número, que no quiere enseñar, y el tope es 1.024); respuesta automática a «KIRIA» con
   una herramienta aprobada por Meta; vídeos: «tu negocio por dentro», cómo se hace un vídeo (proceso), antes/después con
   negocios reales en colaboración, el reto «comenta tu negocio», el precio (desde 6,99 €) y «tu producto en 3D»; 10 % con plazo
   real; publicar la web el día del lanzamiento (ahora sin publicar) y añadir un código de descuento.
   **Fecha: domingo 8-11-2026 a las 12:00** (Javi, 4-11-2026). **Web PUBLICADA el 4-11-2026** (provisional, GitHub Pages:
   https://javierfernandez03112007-netizen.github.io/kiria-producer/) porque Stripe pide la dirección de la web. **Dominio: kiriaai.com** (Javi lo
   pagó el 4-11-2026 en DonDominio) → Cloudflare Pages (proyecto `kiriaai`, rama `gh-pages`). **Web en https://kiriaai.com desde el
   4-11-2026** (www y github.io llevan ahí). Enlaces de pago de Stripe: los crea Javi, apuntados en `web_estudio/README.md`. Guía de cobros (Stripe con enlaces de pago, dominio, alta de autónomo) en Notion: «Cobrar con tarjeta, dominio y alta de autónomo».
   **Correo de la web (Javi, 4-11-2026): kiriaai2026@gmail.com** (contacto, formulario FormSubmit — hay que activarlo de nuevo con ese
   correo — y correo de atención de Stripe). Plan, calendario y textos (canal, mensaje automático, bienvenida,
   lanzamiento) en `projects/lanzamiento/whatsapp/PLAN_LANZAMIENTO.md`; foto = la de Instagram (`whatsapp/foto_canal.png`).
   **CAMBIO (Javi, 5-11-2026, 10:15): se deja lo de WhatsApp y la web ya está en la bio de Instagram** (la regla de abajo ya no vale).
   El reel L2 «Tu producto, en 3D» se publicó el 5-11 a las 08:56: a las 10:15, 433 visualizaciones, 115 de alcance, 24 me gusta, 7 comentarios,
   12 guardados (Metricool). Los anuncios llegan poco (Bomberados: 8,1 mil) frente a los reels informativos (10 mil–880 mil). Seguidores
   (Metricool, 5-11): ≈ 4.500; 31 % España, 69 % Latinoamérica (México 13 %); 25-34 años el 33 %, 25-54 el 64 %; 65 % hombres.
   **REGLA (Javi, 5-11-2026): nadie debe saber que la web ya está abierta.** Hasta el domingo 8 a las 12:00 no se enseña kiriaai.com en ningún
   sitio (ni el correo kiriaai2026@gmail.com, que la delata): solo «abrimos nuestra web el domingo», con adelantos, pistas y cuenta atrás
   (`cuenta_3/2/1/hoy.png`). El vídeo L2 ya tapa la dirección («••••••••.com»). Las tarjetas (QR a la web), a partir del domingo.
   **Guía profesional de la comunidad (5-11-2026):** `projects/lanzamiento/whatsapp/COMUNIDAD.md` + Notion «Comunidad de WhatsApp · qué poner en cada sitio»
   (ficha, ajustes, avisos día a día, normas, evento del domingo, respuesta a «KIRIA», Business) e imágenes `bienvenida.png`, `lanzamiento.png`, `historia_comunidad.png`.
   Javi creó una **comunidad** de WhatsApp (https://chat.whatsapp.com/ElEyf2TCRzt0nYZaW3mblE; no canal; «no importa que quede visible el número») y lo quiere **todo gratis** (si
   automatizar el enlace es de pago, lo manda él a mano). En Notion: «Lanzamiento · plan día a día hasta el domingo 8» + «Guía paso a
   paso del lanzamiento (todo gratis)» y cada vídeo con su hora en «Calendario de contenido» (columna «Subir el», vista «📅 Subidas»).
   Lanzamiento: L1 «Ni una sola cámara» jue 5 10:00 · L2 «Tu producto, en 3D» vie 6 10:00 · L3 «Tu negocio, por dentro» sáb 7 10:00 ·
   L4 «Ya está abierta» dom 8 12:00 (Claude entrega cada uno la víspera antes de las 21:00). Cuenta a las 18:00: La cerradura (mié 4),
   Gafas (jue 5), Medicina (vie 6, si se confirma el MIR), Economía (sáb 7, si se confirma SPIVA), Magisterio (lun 9).

## Vídeos recientes
- **El perro robot con neuronas humanas** (`projects/robot_neuronas/`, 6-11-2026): Javi: «otro que no sea de publicidad sino de contenido,
  algo muy muy fuerte, por ejemplo algo de robots». Noticia de Cortical Labs (Australia). Guion primero → su MP3 (57,9 s) → ×1,08 y pausas
  recortadas (48,2 s; vídeo de 51 s). Escena (un solo plano que sigue al perro): perro robot blanco con cúpula de cristal y un chip de
  electrodos con neuronas rosas → «SIN CEREBRO» en la cabeza → pantalla «?» y candado «AL FINAL» → Australia dibujada en el suelo (contorno
  real de `engine/geo/countries-50m.json`) con el perro en Melbourne → picado al chip: electrodos, las neuronas se recogen y vuelven a crecer,
  medio de cultivo → estímulo/respuesta con osciloscopio → «PROGRAMA · EJEMPLO» → «izquierda, derecha, adelante» con la cámara DETRÁS (para
  que izquierda sea izquierda) → objetivo y ruta → cerebro holograma con el contador hasta 86.000.000.000 → «UN PUÑADO» → despiece → «SIN
  REVISAR» → Pong y un pasillo de videojuego genérico → «¿DERECHOS?» (gira la cabeza hacia ti). 21 efectos nuevos de ElevenLabs.
  Trucos que sirven para otros vídeos: (1) **bucle exacto con algo que anda**: el mapa y el polvo se repiten cada 3,6 m y el perro acaba
  3,6 m más allá (la cámara va pegada a él), con la semilla del polvo por baldosa (`seedOf`) y sin deriva; (2) el paso sale de la distancia
  recorrida (+ lo girado) y la zancada se ajusta para que quepa un número exacto de pasos; patas con IK de dos huesos; (3) una cúpula de
  cristal delante de la cámara lo llena todo de neblina: su opacidad baja al acercarse; (4) `clearcoat` sin rugosidad hace un punto
  brillante con cada luz puntual (el marco de la pantalla): sin clearcoat; (5) **al unir los módulos chocan los nombres** (`PR` es la
  resolución, `PL` los colores, `burst`, `TEAL` ya existen): comprobar duplicados antes de probar; (6) el cerebro se lee como cerebro visto
  desde arriba: dos hemisferios con la cara de dentro plana y un sombreador que brilla en los surcos (donde el ruido cruza 0) y en el borde.
- **ADE «no tiene salidas»** (`projects/ade/`, 7-11-2026): Javi: «un vídeo potencial muy potencial […] algo muy controversial como ADE,
  el falso humo de que ADE no tiene salidas». Guion primero (159 palabras) → su MP3 (63,7 s) → Parakeet + `ajustar_voz.py` solo con las
  pausas recortadas, sin acelerar: 58,0 s (vídeo de 59 s en bucle exacto). Datos: Infoempleo Adecco (ADE 3,67 % de las ofertas frente a
  1,57 % de la segunda), U-Ranking 2026 (80,3 % trabajando, 42,1 % con puesto de universitario, 32.427 €, 14.988 graduados), Ley 22/2015,
  CNMV GT 4/2017 y la oposición de Inspector de Hacienda (CONFIRMAR U-Ranking y que no hay ranking de Infoempleo de 2026 con otro orden).
  Escena: maqueta de un edificio de oficinas cuya fachada se abre con «Ahora, lo feo»; lluvia de ofertas «ADE» desde el primer fotograma y
  la señal verde de SALIDA que se apaga («no tiene salidas») y se enciende («Salidas tiene»); torres de folios con una torre fantasma («el
  doble… y no llega»); 100 figuritas (entran 80; 34 suben en un ascensor de cristal a despachos dorados; a 46 se les cae el birrete);
  700 graduados nuevos; tres despachos con su cerradura (calendario de 3 años y examen, certificado, temario); la llave «ADE» que no gira
  en ninguna y abre el portal; candados en cascada; escalera «ATAJO» que se tacha y se cae; pregunta «¿Auditoría o banca?».
  **Entregado el 7-11-2026** (`out/ade.mp4`, 59 s, 60 fps, 51 MB, −15,0 LUFS, uniones y bucle limpios; subida propuesta mar 10 a las 10:00).
  Render: 0–204 aquí + las 6 máquinas del robot (ramas `render-ade-1…7`; la 3 hizo también 204–420 porque esta sesión se reinició tres veces). Lecciones: (1) **un reinicio del proceso de la sesión mata
  los renders en segundo plano**: lanzarlos con `setsid nohup …`, comprobar con `pgrep` al volver y relanzar (`SKIP=1` reanuda);
  (2) bucle con lluvia: la lluvia empieza antes del 0 (inicios entre −1,6 y 1,8 s) y al final los folios pasan de las torres a la lluvia
  cuando la cámara ya no ve las torres; (3) en vertical no cabe un edificio con 4 despachos por planta: 3 por planta (0,78 de ancho) y la
  cámara a ≈ 2,4; (4) una llave vista a lo largo de su eje se ve de canto: el ojo se gira hacia la cámara en cada fotograma.
- **«GTA 6 ocupa 212 gigas»** (`projects/gta6/`, 9-11-2026): Javi: «vamos a hacer el del GTA porque ocupa 212 gigas, pero de la mejor
  manera posible y que sea una barbaridad de vídeo muy muy enganchador». Guion reescrito sobre la propuesta del análisis (164 palabras):
  gancho «GTA 6 todavía no ha salido… y ya no te cabría en el móvil», escala (212 GB según Rockstar, más que 50.000 canciones, el doble
  que Red Dead 2, hora y media con 300 megas), reenganche «el programa es lo de menos», respuesta «no te estás descargando un juego: te
  estás descargando una ciudad… con cada ladrillo ya pintado», cierre «¿PlayStation o Xbox?» + «mándaselo a quien ya está haciendo hueco».
  Su MP3 (60,3 s) → 55,6 s con pausas recortadas (vídeo de 57 s). Escena (nada del juego): un móvil en una mesa del que brota una columna
  de cristal con datos y, encima, una ciudad tropical en miniatura (hoteles pastel, torres, palmeras instanciadas, playa, noria, coches
  en bucle exacto); caja de 128 GB que revienta; regla 0–200 GB; discos que caen; columna de Red Dead 2; fibra con pulsos; cubito de
  código en un césped (enorme → diminuto); la fachada, el coche y la cara se despegan como pegatinas (debajo, la forma gris), suben al
  cielo con su cuadrícula de píxeles y vuelven; pared mitad borrosa / mitad nítida; ondas de sonido que se guardan en la columna; la
  ciudad entra en el móvil (plano de recorte en la pantalla: todo lo de la ciudad solo se ve por encima); un ladrillo pintado; iconos
  que salen del móvil («haciendo hueco»). **Entregado el 9-11-2026** (`out/gta6.mp4`, 57 s, 60 fps, 50 MB, −15,3 LUFS, uniones y bucle
  limpios; subida hoy a las 18:00). Render entero en las 6 máquinas (ramas `render-gta-1…6`, ≈ 25 min). **El saldo de efectos de
  ElevenLabs se agotó** (quedan 3 créditos; la clave no tiene permiso para ver cuándo se renueva): 10 efectos nuevos + reutilizados.
  Lecciones: (1) en vertical, una columna ancha tapa todo: columna estrecha y cámara lejos (≈ 8 para la torre entera); (2) la cámara no
  puede ir en línea recta entre dos puntos de la ciudad: pasar por arriba de los edificios; (3) las palmeras tapan calles vistas desde
  arriba: el coche que corre va por una avenida sin palmeras; (4) bucle exacto con texturas que corren: desplazamientos con vueltas
  enteras (`k · t / END`) y las luces de la ciudad se apagan al volver al móvil; (5) la hoja de un objeto que se despega tiene que separarse
  hacia la cámara e inclinarse: si solo gira sobre su borde, no se ve.
- **Parrilla de publicación del 9 al 22-11** (`web_estudio/ventas/parrilla_publicacion_kiria.pdf`, 9-11-2026): Javi pidió «un guion de los
  vídeos que tenemos que subir a cada día, incluso si subimos varios, profesional». Reglas (1 informativo al día; 2 solo si son de distinto
  tipo y con 6 h o más entre ellos; 10:00 y las noticias cuanto antes), las dos semanas día a día, lo que necesita Javi con fecha y la
  lista para cada publicación. Fechas pasadas al calendario de Notion (GTA lun 9 18:00, Tapas mar 10, Psicología mié 11, Neveras sáb 14)
  y PDF avisado al chat «Plan escalabilidad Kiria».
- **«La tapa gratis no existe»** (`projects/tapas/`, 8-11-2026): primer vídeo **puente** del plan de crecimiento (negocios por
  dentro: gusta a todos y además a los dueños de negocios). Javi: «cómo es posible que los bares que sirven tapas gratis obtengan beneficio,
  no lo digas así, dilo de la manera más profesional y enganchante posible». Guion primero (156 palabras) → su MP3 (55,8 s) → Parakeet +
  `ajustar_voz.py` solo con pausas recortadas: 50,5 s (vídeo de 52 s en bucle exacto). Datos: guías de Granada (caña con tapa 2,50–3,20 €),
  Ley del IVA (hostelería al 10 %: 0,27 € de 3 €), coste de la cerveza ≈ 0,50 € (estimación del sector, Qamarero: barril de 30 l, ≈ 150
  cañas), la sal y la sed (Unión de Mutuas). Escena: un bar de Granada de noche, de una planta para que se vea la Alhambra encima (fondo
  pintado en un lienzo lejano, sin niebla, con las luces de la ciudad en la colina); la etiqueta «GRATIS» que se raja; la caña convertida en
  un vaso gigante con capas (IVA gris, cerveza dorada, «lo que queda» verde con iconos de tapa, local, sueldos y moneda); picado a la bodega
  (barril y tubo por el que sube la cerveza); las rondas con tapas cada vez mejores; la sal y el medidor de sed; la tapa que vuela y se
  queda como el letrero del bar (con aro de luz) y la gente que entra; un cartel de publicidad de pago que se apaga con «ellos te la
  sirven…»; las otras tiendas de la calle con un plato vacío y «?»; el camarero pone otra tapa con su etiqueta (bucle). 15 efectos nuevos
  de ElevenLabs. **Entregado el 8-11-2026** (`out/tapas.mp4`, 52 s, 60 fps, 38,9 MB, −15,3 LUFS, uniones y bucle limpios; subida propuesta
  vie 13 a las 10:00). Render entero en las 6 máquinas de ayuda (ramas `render-tapa-1…6`, ≈ 20 min). Lecciones: (1) **un nombre del
  objeto `S` puede estar ya cogido** (`S.flow` era el polvo: la cerveza del tubo es `S.beerFlow`); (2) al renderizar por trozos, el orden
  dentro del fotograma importa: colocar la tapa nueva ANTES de la etiqueta que la sigue (si no, en el primer fotograma de un trozo la
  etiqueta lee la posición vieja); (3) la palabra que se dice tiene que verse entera cuando se oye: la cámara llega al cartel con
  «publicidad», no después; (4) `srcLine` mide el texto y lo encoge si no cabe; (5) un cielo de noche no puede ser un negro plano:
  degradado y miles de luces; (6) `sfx_eleven.py nombre…` regenera solo esos efectos (los muy flojos, como un pico de 0,03, se repiten).
- **Anuncio de la web «¿Qué hace que alguien se pare?»** (`projects/promo_web/`, 6-11-2026): Javi: «vamos a hacer un video para
  promocionar la pagina de kiria […] algo muy profesional». Guion primero → su MP3 (34 s) → `engine/alinear.py` + `ajustar_voz.py` ×1,06
  (29,9 s, vídeo de 33 s). Escena: un móvil gigante tumbado es el escenario; publicaciones con productos «TU MARCA» (los de la web) que caen
  al vacío por el borde; la cinta se para en «pare»; foto → se sube → el tarro sale en 3D a la peana con focos, vuelta y onda de la voz;
  portadas reales de nuestros vídeos; cámara de cine que se deshace («0 CÁMARAS»); contador 3.200.000 y «3,2 M» en 3D; la barra del vídeo
  con el primer segundo; **rebobinado** de toda la escena hasta el primer fotograma (dos relojes: `t` del vídeo y `sceneT` de la escena,
  `20_anim.js`); cierre con la web real («Vídeos que paran el scroll.», «Pedir propuesta») y el perfil con el enlace en la bio. Sin precios.
  Ojo: (1) el reconocedor de ElevenLabs puede poner el inicio de una palabra en el silencio de antes (y `ajustar_voz.py` metía la pausa
  dentro de la palabra anterior): `alinear.py` ya lo corrige; (2) **`fetch_compose.sh` mata TODOS los `render_local.sh` y capturas de la
  máquina al reunir los fotogramas**: no renderizar dos vídeos a la vez aquí (mató el render del anuncio al acabar Derecho); (3) para
  rehacer un vídeo antiguo, `out/` no está en git: los trozos siguen en sus ramas `render-*` y solo falta el trozo que se hizo aquí.
- **Derecho, reenviado el 6-11-2026** (Javi: «pásame de nuevo el vídeo de derecho con la miniatura y la descripción», más descripción para
  TikTok y la foto de perfil): faltaba el trozo 0–726 (hecho en las 6 máquinas, ramas `render-der-g1…g6`, con `projects/derecho/render_chunk.sh`);
  además el trozo antiguo `render-der-e` tenía el suelo naranja liso de 3455 a 3645 (58–60,8 s, la textura de madera no salió) y daba un
  salto al pasar al siguiente: rehechos aquí. Foto de perfil de TikTok = la de Instagram (`projects/lanzamiento/whatsapp/foto_canal.png`).
- **El mayor robo cripto · hackeo a Binance** (`projects/cripto/`, 5-11-2026): de la lista de noticias virales (Javi: «Vamos a hacer el
  video de las criptomonedas»). 15 frases, 60 s, un solo plano en bucle: el portátil del ingeniero con la videollamada y las monedas ₿
  metiéndose en la pantalla; la cartera caliente de cristal detrás; el programa espía (bicho negro de ojos rojos) baja por el cable, espera
  y salta a otros dos portátiles; 1.400 monedas salen por diez cadenas de bloques con reloj 00:00→20:00; torres del récord (×4 frente a
  Bybit 2025); FBI / «LO NIEGAN»; cuatro cadenas se congelan (≈ 2.850 M$); la cartera se vuelve a llenar («LO PONE BINANCE»); «SOSPECHA».
  Datos en `FUENTES.md`; cabecera con «VÍDEO HECHO CON IA · KIRIAAI.COM» y comentario fijado con la web. Se montó primero con la voz de
  Danny generada por mí (`engine/tts.py`, ×1,12): **error de orden**, Javi dio él la voz (su MP3 de 71 s, «…pvc_s50_sim75_v4») →
  tiempos por palabra con `engine/alinear.py`, ×1,13 para 60 s, y se volvió a renderizar entero (ramas `render-crv-*`, ≈ 35 min con las
  6 máquinas + esta; la versión provisional quedó en `out/old_tts/`). En la revisión, el sello «29 OCT 2026» y el reloj se pisaban
  ≈ 0,7 s: arreglado en `40_hudplan.js` y rehechos solo los fotogramas 2100–2175. **Entregado el 5-11-2026** (`out/cripto.mp4`, 60 s,
  −14,9 LUFS; subida vie 6 a las 18:00). Notion: fila «El mayor robo cripto (hackeo a Binance)».
  Ojo: el trozo 900–1440 se cayó en la máquina 2 (se cerró Chromium) y lo reanudó ella misma; los registros (`fetch.log`, eventos de las
  sesiones) van en hora UTC (Madrid = UTC+1 en noviembre). Al volver a renderizar, usar un prefijo de ramas NUEVO (si no, `fetch_compose.sh`
  mete los trozos viejos) y quitar `out/DONE`.
- **Lanzamiento 2 · Tu producto, en 3D** (`projects/lanzamiento2/`, 5-11-2026): 6 frases, 23 s, sin precios. Un tarro «TU MARCA · Fresa»
  sale de una polaroid y salta a la peana del visor de kiriaai.com; las seis presentaciones (caja, bolsa, tarro, botella, lata, taza) son
  las mismas formas y etiquetas que la web (código portado de `web_estudio/index.html` a `web/src/12_l2.js`); móvil con la tienda (el dedo
  gira el tarro y lo añade a la cesta), vídeo en redes, «DOMINGO» y «Pruébalo con el tuyo»; cierre «comenta KIRIA». Voz Danny v4 (×1,04),
  efectos del lanzamiento 1. **Entregado el 5-11-2026** (`out/lanzamiento2.mp4`, −15,1 LUFS, ramas `render-l2-*`; subida vie 6 a las 10:00).
  Ojo: los reinicios de la sesión matan los procesos en segundo plano (render local y `fetch_compose.sh`): comprobar y relanzar.
- **Química vs Ingeniería Química** (`projects/quimica/`, 4/5-11-2026): duelo de carreras (Javi: «el de magisterio ya está subido hazme el
  de quimica»). Gancho: una fábrica química en miniatura dentro de un tubo de ensayo que rompe el cristal y crece hasta su tamaño real;
  laboratorio delante y planta (reactor, columna, tuberías, camión cisterna) detrás, en un solo plano. 12 frases, voz Danny v4 con los
  ajustes de Javi (`engine/tts.py`, ×1,08), 22 efectos de ElevenLabs. Datos: U-Ranking 2025 (afiliación 81,2 % / 84,6 %; base media de
  cotización 27.253 € / 31.202 €, egresados de 2019); el orden de las columnas lo confirma la búsqueda, las cifras exactas se confirman en
  el PDF antes de publicar (u-ranking.es no se abre desde la sesión). **Entregado el 5-11-2026** (`out/quimica.mp4`, 59 s, −15,1 LUFS,
  render en ramas `render-qui-*` en ≈ 20 min con las 6 máquinas; subida prevista jue 5 a las 18:00). Notion: fila «Química vs Ingeniería Química».
- **El túnel del Banco Central** (`projects/robo_banco/`, 4-11-2026): idea de Javi («el mayor robo de la historia de un banco»). Lo honesto:
  el mayor del mundo fue el del Banco Central de Irak (2003, con una carta); se cuenta Fortaleza (2005), «el mayor robo a un banco de la
  historia de Brasil». Cambios de Javi al guion: empezar por «Cavaron un túnel…», sin Irak, contar cómo rompieron el suelo de la cámara,
  1 min. Maqueta en corte de noche (casa del «GRAMA SINTÉTICA», avenida acortada, túnel con vigas/luz/ventilación, losa de 1,10 m con
  acero y agujero de 75 cm que se perfora dejando la capa fina, cámara acorazada con palés de billetes, puerta redonda). 27 efectos de
  ElevenLabs (máx. 4 peticiones a la vez). Voz provisional con `engine/tts.py --similitud 0.75`; luego la de Javi (ajustada a ×1,09).
  **Entregado el 4-11-2026** (`out/robo_banco.mp4`, 62 s, render en ramas `render-robo2-*`, −15,2 LUFS; subida prevista mié 4 a las 19:00).
  Datos: grosor ≈ 1,1 m OK; las herramientas (martillos y discos) no se confirman y las cámaras no grababan (no es que no funcionaran):
  aclarado en la descripción («Para ser exactos»). Portada «CAVARON UN TÚNEL DE 78 METROS».
- **Magisterio** (`projects/magisterio/`, 1-11-2026): idea de Javi (desmentir que Magisterio es «solo collares de macarrones»). 60 s (Javi
  pidió vídeos de 60 s, no más largos) y **todo dentro del aula de Infantil** (Javi: «que no se salga del entorno de Magisterio»): pizarra
  con tiza, rincones, mesas con macarrones, mesa de la maestra. Voz generada aquí con `engine/tts.py`; efectos reales con `sfx_eleven.py`.
  Entregado el 1-11-2026 (61,2 s, 60 fps, 50 MB, −15 LUFS). Render: esta máquina va a ≈ 0,3–0,4 fotogramas/s con esta escena; con
  6 máquinas de ayuda (`render_chunk.sh A B X` → ramas `render-mag-1…6`, `fetch_compose.sh` las recoge y compone) tardó ≈ 30 min.
  Pendiente de permiso: borrar las ramas `render-mag-*` y archivar las 6 sesiones «Render Magisterio».
- **Economía** (`projects/economia/`, 1-11-2026): «La bolsa española subió un 58 %… y 96 de cada 100 fondos lo hicieron peor».
  Todo dentro de una sala de bolsa (panel LED, cinta de valores, mesas de operadores). Voz de Javi (su MP3, Danny v4),
  efectos solo de ElevenLabs (`sfx_eleven.py`, 27). 60,1 s, 60 fps, −15 LUFS. Render: esta máquina 0–600 + 6 de ayuda
  (`render-ecob-1…6`) ≈ 30 min; tras revisarlo se rehízo 55,5–57,7 s (el panel quedaba vacío en «esto no es asesoramiento
  financiero»: ahora sale grande). Antes de publicar: confirmar en el PDF de SPIVA el «2 de 50» y el +58,4 % (ver DESCRIPCION.txt).
  Pendiente de permiso: borrar las ramas `render-ecob-*` y archivar las 6 sesiones «Render Economía».
- **Gafas de esquí** (`projects/gafas/`, 2-11-2026): idea de Javi («por qué las gafas de esquí tienen colores… polarizadas…
  esquiador en la nieve → el sol → los rayos → desmontar las gafas», «profesional y cinematográfico») y «que las gafas resalten
  en naranja». Esquiador congelado con la nieve suspendida a contraluz → rayos del cielo y del suelo → cristal de hielo con el
  espectro y la UV → la nieve devuelve el 80 % y quema el ojo → gafas grandes desmontadas capa a capa (espejo, lente UV,
  polarizado con ondas y rejilla, cámara de aire) → categoría 3 con 100 fotones → día nublado: la lente naranja entra de izquierda
  a derecha y vuelve el relieve (la nieve se aplana fuera de la lente: `RELIEF` en `10_world.js`) → duelo naranja/espejo → bucle.
  Voz de Javi (su MP3, 58,8 s), 28 efectos de ElevenLabs. Render: esta máquina 0–385 + 8 de ayuda (`render-gafas-1…8`); las
  de ayuda iban a ≈ 100 fotogramas/min (un trozo de 400 en ≈ 4 min), mucho más rápidas que esta (≈ 20/min).
  Entregado el 2-11-2026 (59,75 s, 60 fps, 50 MB, −15 LUFS) con portada «¿NARANJA O ESPEJO?». Javi se queda con esa versión 1
  (en 49,9–50,5 s la cámara pierde un momento las gafas al rodearlas; le propuse arreglarlo y dijo que no hacía falta).
  Pendiente de permiso: borrar las ramas `render-gafas-*` y archivar las 9 sesiones «Render Gafas» (la 4 se repitió).
- **Medicina** (`projects/medicina/`, 2-11-2026): Javi pidió «uno del mismo estilo que Derecho porque ha arrasado». Plantilla de
  Derecho (figuritas, pedestales con haz de luz, HUD, cámara con zambullida en una lámina). Martillo de reflejos gigante sobre
  100 figuritas con bata (quedan 3 doradas: «menos de 4 de cada 100 pueden elegir Dermatología») → vitrina «especialista» →
  libros y huesos → negatoscopio «aquí falla» → estaciones (cuerpo sano, lo que falla, clínicas, hospital, hoja del MIR con
  reloj) → corte al campo de 15.129 figuritas (9.225 doradas = plazas; las 4 primeras filas = Dermatología, «agotada antes
  del 500») → residencia R1–R5 → 6 + 5 = 11 libros y cirujano → ¿quirófano o consulta? → bucle. Voz: su MP3 (69,5 s → sin
  pausas y atempo 1,04 → 60,1 s). 37 efectos de ElevenLabs. Render: esta máquina 0–200 + 8 de ayuda (`render-med-1…8`).
  Entregado el 2-11-2026 (61,1 s, 60 fps, 51 MB, −15 LUFS) con portada «MEDICINA · MENOS DE 4 DE CADA 100». Ojo: la
  plantilla de Derecho no traía `web/package.json` y las máquinas de ayuda fallaron 55 min sin three.js (copiarlo siempre).
  Antes de publicar: confirmar presentados MIR 2026 y el número exacto de cierre de Dermatología (ver DESCRIPCION.txt).
  Pendiente de permiso: borrar las ramas `render-med-*` y archivar las 8 sesiones «Render Medicina».
- **La cerradura por dentro** (`projects/cerradura/`, 3-11-2026): primer tema que no es una carrera («explica por dentro la
  cerradura y cómo abrir una puerta con una radiografía»). Enfoque honesto: se enseña el método del resbalón para que se evite
  (echar la llave). Escena propia (no plantilla): puerta a escala (1 unidad = 10 cm) que se vuelve transparente, bombín de perfil
  europeo cortado por la mitad (pitones de latón, contrapitones de acero, muelles, llave con dientes que los sube), leva y cerrojo
  de dos vueltas, vista en planta con plano de corte (`clipPl` + tapas rayadas) para el resbalón y la radiografía (una mano «RX ·
  EJEMPLO», en planta solo su línea de corte), 200 casitas con alarma roja. Primer segundo: el portazo visto en rayos X (post
  `xray`). Truco técnico: si un material cambia de opaco a transparente hay que poner `needsUpdate` (si no, three.js lo deja opaco).
  Voz: su MP3 (59,5 s → sin pausas largas → 52,7 s). 30 efectos de ElevenLabs. Render: esta máquina 3160–3217 + 8 de ayuda
  nuevas (`render-cer-1…8`, ≈ 10 min) y, para los arreglos, las 8 de Medicina ya abiertas (`render-cer-m/n/p/q*`, trozos de
  ≈ 56 fotogramas en ≈ 3 min; `overwrite_chunks.sh` mete encima un tramo rehecho). Entregado el 3-11-2026 (53,6 s, 60 fps,
  46 MB, −15,1 LUFS) con portada «UNA RADIOGRAFÍA PUEDE ABRIR TU PUERTA · si solo das el portazo».
  Lecciones: (1) Javi quiere ver fotos del proceso mientras se hace y que se REUTILICEN las máquinas ya abiertas (no abrir
  nuevas); (2) a una máquina de ayuda NO se le puede dar un segundo encargo si su primer mensaje decía «no hagas nada más»: las
  8 de la cerradura lo rechazaron y se perdió una hora sin darme cuenta. Al crearlas, decir «espera más trozos míos» y comprobar
  con list_events que cada una arranca; (3) un material que pasa de opaco a transparente necesita `needsUpdate`; (4) revisar los
  trozos según llegan (bolas negras, reflejo de luz y el cerradero tapando el bombín se arreglaron rehaciendo solo esos tramos).
  Pendiente de permiso: borrar las ramas `render-cer-*` y archivar las 8 sesiones «Render cerradura».

## Herramientas y accesos
- **Voz de Javi en ElevenLabs** (1-11-2026, del nombre de su archivo): Danny (`wnKyx1zkUEUnfURKiuaP`), modelo **v4** (`eleven_v4`),
  velocidad 1,00, estabilidad 0,50, similitud 1,00. Con la voz que generé yo (modelo v2 y efectos sintetizados y de ambiente) a Javi
  **no le gustó el audio**: o él manda su MP3 (se sincroniza con `asr_parakeet.py` → `ajustar_voz.py`) o se usa `engine/tts.py`
  (ya con sus ajustes). **Efectos: solo de ElevenLabs, uno por suceso, en el instante exacto y cortados cuando el suceso termina**
  (nada de fondo continuo ni sonidos sintetizados). Modelo de Parakeet: se baja de las «releases» de sherpa-onnx en GitHub (≈ 490 MB).
- **Voz de Javi (su MP3) → tiempos por palabra**: copiarlo a `projects/<p>/assets/voz_original.mp3` y
  `ELEVENLABS_KEY_FILE=<archivo fuera del repo> python3 engine/alinear.py projects/<p>` (Scribe de ElevenLabs: la clave no tiene permiso
  de alineación forzada; la del entorno da «Invalid API key») → `ajustar_voz.py` → `env_voz.py`. Sin descargar Parakeet. ≈ 1 min.
- **Voz y efectos desde la sesión**: `python3 engine/tts.py projects/<p>` (voz de Danny + tiempos de cada palabra, sin reconocedor)
  → `ajustar_voz.py` → `env_voz.py`; efectos realistas: `projects/magisterio/sfx_eleven.py` (copiar y cambiar la lista).
- **`ajustar_voz.py`: copiar el de `projects/lanzamiento/`** (4-11-2026). En los demás proyectos el recorte de silencios QUITA del centro
  la duración de `PAUSE`/`INNER_MAX` en vez de DEJARLA: con silencios poco más largos que ese valor casi no queda pausa (en la toma de Javi
  del lanzamiento, 0,09 s tras «cámara» y 0,02 s tras «redes…»). En el de lanzamiento ya deja la pausa indicada; los vídeos ya entregados
  no se han tocado.
- **Metricool**: conectado en claude.ai (1-11-2026); publicar solo tras la revisión de Javi.
- **ElevenLabs**: la clave está como secreto del entorno «Predeterminado»; el entorno añade el encabezado `xi-api-key` a las peticiones a
  `api.elevenlabs.io` (no hay que ponerla en el código). Uso: voz Danny para guiones y efectos de sonido realistas.
  Voz Danny: `voice_id` **wnKyx1zkUEUnfURKiuaP** (modelo `eleven_multilingual_v2`). Efectos: `POST /v1/sound-generation`.
  Ojo (1-11-2026): la clave guardada en el entorno daba «Invalid API key»; Javi dio una clave nueva (sin permiso `user_read`,
  pero con voz, voces y efectos). Si vuelve a fallar, pedirle que la actualice en Network secrets del entorno; nunca escribirla en el repo.
- Dominios pedidos para el entorno: `www.boe.es`, `boe.es`, `www.ciencia.gob.es` (verificar datos), `polyhaven.com`, `api.polyhaven.com`,
  `dl.polyhaven.org` (texturas, modelos y luces HDRI CC0 para más realismo). Comprobar en cada sesión nueva que responden.
- Reconocedor de voz: Parakeet TDT v3 (sherpa-onnx), ver `projects/derecho/asr_parakeet.py` (el modelo se descarga aparte).
- Plan futuro: tarea programada nocturna (buscar noticias del nicho, analizar competencia, guion, voz, vídeo con plantillas fijas) y
  publicación vía Metricool **solo tras revisión de Javi** al principio. Conectores sugeridos: Metricool y vidIQ (claude.ai → conectores).

## Negocio (vender vídeos a empresas)
- **Cambio de plan (Javi, 6/7-11-2026)**: el público de la cuenta son jóvenes y estudiantes (69 % Latinoamérica) y así no llegan
  empresas; el contenido debe atraer a dueños de pequeños negocios (lo que funciona en redes con nuestros datos, negocios por dentro,
  noticias que les afectan, casos reales de la zona). Sus 6 pasos para escalar: adquisición (orgánico, colaboraciones, puerta a puerta,
  publicidad; audiencia fría → templada con educación), autoridad (discurso, lo que dicen otros, casos de éxito), conversión
  (cualificar, educar, propuesta: por qué, a quién, qué consigue, en cuánto tiempo y garantía; cierre como consecuencia natural),
  entrega y retención (low → mid → high ticket), recomendaciones con premio y números (leads, coste por cliente, lo que deja cada
  cliente, suscripciones y bajas: «MUY IMPORTANTE»). Javi reparte ≈ 100 tarjetas en Motril y Granada desde el 7-11.
  En Notion (Centro de producción): «🤝 Visitas a empresas · guion y plan de clientes» (guion de 5 pasos con la demo de la web en el
  móvil del cliente, objeciones, mensajes de seguimiento a los 0/2/5/10 días, escalera de precios, recomendaciones y KPI),
  «🎯 Empresas · leads» (`collection://6e34e876-1fb1-4d5f-bc2c-7a87fd7e0791`) y «📊 KPI semanales · ventas»
  (`collection://7b8bc88a-bf52-436b-bf42-ba1207508d5a`). Pendiente de Javi: la garantía, el premio por recomendar y si hay muestras gratis.
  Decir siempre «visualizaciones», no «personas» (Derecho: 887.817 visualizaciones, 733.000 personas).
  **Plan comercial completo** (7-11-2026): Notion «🧭 Plan comercial · de la calle al cliente» (embudo de 6 estados, negocios A/B,
  lista de la noche antes con «Idea de vídeo», explicaciones, visita, objeciones, llamadas en frío, de seguimiento y tras la entrega, mensajes,
  propuesta escrita, cobro, entrega, recomendaciones y rutina semanal). La tabla de leads ganó «Por visitar», Prioridad, Instagram,
  Idea de vídeo y Teléfono del negocio.
  **Plan de crecimiento** (Javi, 8-11-2026: «¿cambiamos de contenido o seguimos con el nicho y vendo yo en persona?»): Notion
  «📈 Plan de crecimiento · de visitas a clientes». Decisión: **dos públicos, una marca** (≈ 60 % alcance con carreras e historias,
  ≈ 30 % puente —negocios por dentro, historias de negocios, cómo hacemos un vídeo viral, antes y después con negocios reales— y ≈ 10 %
  Javi en primera persona: serie «Vendo vídeos con IA a los negocios de mi pueblo», grabada por él y editada por mí). Los clientes salen
  del motor local: visitas, colaboraciones de Instagram con cada negocio, Perfil de Empresa de Google, Facebook y grupos de comercios,
  asociaciones y prensa local. Servicio nuevo propuesto: «Grábalo tú, lo editamos con IA» (precio de Javi). Metas a 30 y 90 días
  (9.000 y 20.000 seguidores; 5 y 20 clientes). Partida: 5.011 seguidores (6-11), ≈ 2 seguidores por cada 1.000 visualizaciones.
  **Chat «Plan escalabilidad Kiria»** (`session_014gBm8SfARWLK3AmTNFKY9M`, creado el 8-11-2026 a petición de Javi): es el sitio del plan de
  crecimiento. Allí se le pasa toda la información del plan, **siempre que se pueda en PDF** (`web_estudio/ventas/plan_crecimiento_kiria.pdf`,
  se regenera con `node web_estudio/ventas/hacer_pdf.mjs plan_crecimiento.html plan_crecimiento_kiria.pdf "Plan de crecimiento · de visitas a clientes"`;
  sin emojis en el PDF: salen como cuadrados).
  **Código KIRIA10** (Javi, 7-11-2026): 10 % hasta el 30-11-2026, anunciado en la web (se quita solo el 1-12); el código lo crea Javi en
  Stripe (pasos en `web_estudio/README.md`). Javi lo pidió como «KORIA10» y confirmó que era KIRIA10.
- Web del estudio: `web_estudio/` (ver su `README.md`; v1 oscura en la rama `web-estudio-v1`). Vista previa privada:
  https://claude.ai/artifact/31hjcpiCg4H1Wdvx2Qb8vy. **v2 (1-11-2026, noche)**: portada blanca con cabeza humana (cerebro
  rojo) y cabeza de IA (azul) que se juntan y explotan al deslizar; globo 3D con arcos desde España («De España, para todo
  el mundo»); sección «Anúnciate en kiria.ai» (patrocinio) y 3 planes con precios pendientes. Reglas de Javi: en la web solo
  el total del canal (3,2 M en 7 días), nunca cifras de un solo vídeo ni visitas en las tarjetas.
- **Precios de Javi (2-11-2026, ya con +1 €)**: Básico 15–30 s 5,99 € · Publicidad 30–45 s 8,99 € · Completo 45 s–1 min 12,99 € ·
  Pro +1 min 15,99 €. Packs: 4 vídeos/mes −10 %, 10/mes −12 %, 30/mes (uno al día) −15 % sobre la suma. Difusión en kiria.ai:
  +2 € por cada vídeo.
- **Gustos de Javi para la web (2-11-2026)**: mayoritariamente oscura; nada de recuadros amarillos para destacar (letra en otro
  color: degradado rojo → azul); quiere mucho movimiento (cabezas, globo, rueda 3D…); no enseñar idiomas ni datos de público. Sin mención al IVA. Página de pago `#pago` lista: falta crear la cuenta de Stripe y pegar
  los enlaces en `PAY_LINKS` (ver `web_estudio/README.md`); mientras, el pedido se manda por correo o Instagram.
- **Contacto en la web (2-11-2026)**: NUNCA el teléfono de Javi ni WhatsApp; dudas por Instagram **@kiria.ai** o por correo.
  Pago sin Bizum (solo tarjeta y Apple Pay/Google Pay).
- **Webs para empresas (2-11-2026)**: con fotos de la empresa 250 € y con fotos nuestras 350 €, pago único, todo incluido (con IA). Tabla completa en `web_estudio/README.md`. Web v3: rueda 3D de trabajos, «Sobre nosotros», cookies y textos legales. Marcas: Élite Bomberos, Bomberados, Fersalv, Beauty Salon Merche.
- **Web SIN publicar (Javi, 3-11-2026): «no quiero que esté publicada aún, solo aquí para ir supervisando».** Se supervisa en
  el Artifact. Estuvo ~50 min en GitHub Pages; la rama `gh-pages` quedó vacía (la dirección da 404). Publicar solo cuando Javi
  lo pida: `./web_estudio/publicar.sh --publicar` (sin esa orden el script no hace nada). En la web publicada el formulario se
  envía solo con FormSubmit; el primer mensaje hace que FormSubmit mande a Javi el correo «Activate Form» (hay que pulsarlo).
  La sesión no puede borrar ramas remotas (el proxy de git corta `push --delete`).
- **Productos en 3D (3-11-2026, idea de Javi)**: en «Webs», antes de los planes, el visitante sube la foto de su producto y lo ve en
  caja, bolsa, tarro, botella, lata, taza o foto en 3D, girándolo como el globo (three.js solo en ese apartado). Ver README.
- Falta de Javi: nombre comercial y dominio, qué se hizo para Fersalv y Beauty Salon Merche, logos y permisos, contacto (correo, WhatsApp,
  Instagram), plazos, precios, opiniones y datos legales (titular, NIF, dirección).
- Legal en España (orientativo, confirmar con gestor): aviso legal (LSSI), privacidad (RGPD) y cookies; para cobrar, alta de autónomo
  (modelo 036 en Hacienda, epígrafe 961.1/961.2/844 según el caso, RETA con tarifa plana ≈ 88 €/mes el primer año en 2026), IVA 21 %
  (303 trimestral, 390 anual), IRPF (130 trimestral si es actividad empresarial), VeriFactu obligatorio para autónomos desde el 1-7-2027.
  ElevenLabs necesita plan de pago para uso comercial.

## Canal de YouTube
Kit hecho en `projects/canal/`: `perfil.png`, `banner.jpg`, `DESCRIPCION_CANAL.txt` («Las carreras, por dentro»).
