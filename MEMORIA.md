# Memoria del proyecto (léela al empezar cualquier sesión)

Lo que se ha decidido y aprendido en las conversaciones con Javi (dueño del canal). Las sesiones nuevas no recuerdan el chat:
esto, `CLAUDE.md` y los `.md` de `engine/` son la memoria. Actualízala cuando cambie algo importante.

## Cómo trabajamos
- Respuestas en español, claras y con estimaciones de tiempo honestas.
- Cada cambio se hace commit y push a `master` (sin PR salvo que lo pida), con las líneas de atribución que indique el sistema y sin
  identificadores de modelo.
- Javi suele mandar el **audio de ElevenLabs (voz Danny)**; si no, se genera con la API (ver «Herramientas»).
- Guion: lo escribo yo siguiendo `engine/REGLAS.md`, `engine/GUION.md` y `engine/HOOKS.md`; se lo doy **todo junto en un solo bloque**
  para pegarlo en ElevenLabs. Datos siempre reales y con fuente en `FUENTES.md` (lo dudoso, «CONFIRMAR»).
- Entrega de cada vídeo: `out/<nombre>.mp4` (1080x1920, 60 fps, 20–60 MB, ≈ −15/−16 LUFS), `out/portada.jpg` (9:16), `out/miniatura.jpg`
  (4:5) y `DESCRIPCION.txt` (versión larga + corta para TikTok + notas de entrega).
- Nada de aviones en vídeos que no sean de aeronáutica; nada cortado por los lados; sin logos reales; sin la marca kiria.ai en los vídeos.

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
   visitas, seguidores etc.»).** Solo resultados reales (con fuente: panel de Instagram o Metricool) y «comenta KIRIA». Vídeo 1: `projects/lanzamiento/`.
3. **Lanzamiento de la web del estudio (plan de Javi, 4-11-2026)**: varios reels con «comenta KIRIA» → mensaje privado con el enlace a
   WhatsApp → allí la web con un 10 % extra. Propuesto: decir «tener un vídeo así», no «aprender» (no hay curso); Canal de WhatsApp
   en vez de grupo (en un grupo se ve su número, que no quiere enseñar, y el tope es 1.024); respuesta automática a «KIRIA» con
   una herramienta aprobada por Meta; vídeos: «tu negocio por dentro», cómo se hace un vídeo (proceso), antes/después con
   negocios reales en colaboración, el reto «comenta tu negocio», el precio (desde 6,99 €) y «tu producto en 3D»; 10 % con plazo
   real; publicar la web el día del lanzamiento (ahora sin publicar) y añadir un código de descuento.

## Vídeos recientes
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
- **Voz y efectos desde la sesión**: `python3 engine/tts.py projects/<p>` (voz de Danny + tiempos de cada palabra, sin reconocedor)
  → `ajustar_voz.py` → `env_voz.py`; efectos realistas: `projects/magisterio/sfx_eleven.py` (copiar y cambiar la lista).
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
