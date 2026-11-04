# Web del estudio (venta de vídeos a empresas) — versión 4

Idea aprobada por el usuario el 31-10-2026 («vamos a partir de esa idea»): **una web muy profesional para vender
vídeos hechos con IA directamente a empresas** (no se vende el motor ni las ideas). El 1-11-2026 Javi pidió
profesionalizarla para monetizar «por todo lo alto», con esta portada: un poco de información arriba, fondo blanco,
a la izquierda una cabeza humana con el cerebro a la vista y a la derecha una de IA; al deslizar hacia abajo se juntan,
explotan y sigue la página. Después pidió un globo 3D que se pueda girar, con flechas curvas que unan España con
países de todo el mundo y el mensaje «de España a todo el mundo».

- Página: `index.html` (un solo archivo; WebGL escrito a mano, salvo el visor de productos en 3D, que carga three.js) + `media/`.
- Vista previa privada (Artifact): https://claude.ai/artifact/31hjcpiCg4H1Wdvx2Qb8vy — se actualiza publicando
  este mismo `index.html` con esa `url` y los archivos nuevos de `media/` en `files`. Solo el dueño la ve hasta que
  la comparta desde el menú «Compartir».
- Versiones fijas: v1 (oscura) en la rama `web-estudio-v1` (commit 5913977). El Artifact no sirve archivos `.bin`:
  los datos 3D van en base64 dentro de `.txt`.
- **PUBLICADA el 4-11-2026**, provisional, en https://javierfernandez03112007-netizen.github.io/kiria-producer/ (Javi: «la ponemos ya
  en la web y empezamos a editar cosas ya publicada para poder generar Stripe»: Stripe pide la dirección de la web). El 3-11 estuvo retirada.
- **Dominio: kiriaai.com** (Javi lo pagó el 4-11-2026 en DonDominio). **EN MARCHA desde el 4-11-2026** (kiriaai.com y www, «Active»; publicada
  la versión con kiriaai.com, gh-pages 3c74bfc). Está en **Cloudflare Pages**: proyecto `kiriaai`, rama `gh-pages`,
  sin compilación, dominios `kiriaai.com` y `www.kiriaai.com`; los nameservers de DonDominio apuntan a Cloudflare. GitHub Pages no admite
  webs para vender: cuando kiriaai.com funcione, Javi lo apaga (Settings → Pages → Branch: None). Pasos para Javi: guía de cobros de Notion, Parte 3.
- `publicar.sh` ya usa https://kiriaai.com/ (canonical y og) y su cabecera lleva un script que manda `www.kiriaai.com` y `*.github.io` a
  https://kiriaai.com/. **No publicar con ese valor hasta que kiriaai.com abra la web**; si hace falta antes:
  `WEB_URL=https://javierfernandez03112007-netizen.github.io/kiria-producer/ ./web_estudio/publicar.sh --publicar` (no redirige).
- Stripe: web del negocio https://kiriaai.com; en cada enlace de pago, «Después del pago» → redirigir a https://kiriaai.com/#pagado
  (la web enseña el aviso «¡Pago recibido!» y borra el pedido guardado).
- Publicar: `./web_estudio/publicar.sh --publicar` (cabecera completa, `media/` y rama `gh-pages`; Cloudflare se actualiza solo).
- **Carrito y pago con Stripe (4-11-2026, Javi: «que la persona añada todo al carrito y lo pague ahí»)**: los botones de precios y
  de webs añaden al carrito (localStorage `kiria_carrito`, insignia en la cabecera) y #pago es el carrito: vídeos sueltos con cantidad,
  planes mensuales (= suscripción), difusión y webs; «Hoy pagas / Y después, cada mes». «Pagar» llama a `functions/api/checkout.js`
  (Cloudflare Pages Functions; publicar.sh copia `web_estudio/functions/`), que recalcula los precios con las mismas tablas (KT, KP,
  KW, kCalc: **si cambias un precio, cámbialo en los dos sitios**) y abre Stripe Checkout (modo `subscription` si hay planes; si no,
  `payment`), con códigos promocionales, dirección de facturación y NIF; al pagar vuelve a /#pagado (vacía el carrito). La clave es
  una **clave restringida** de Javi (Checkout Sessions, Products, Prices y Customers en escritura) guardada en Cloudflare como secreto
  `STRIPE_KEY`; nunca en el repo ni en el chat. Sin clave, la función responde 503 y la web usa la reserva: un único Vídeo Básico va al
  enlace de pago de Javi (https://buy.stripe.com/3cI8wPf004QlgT7gSpcZa00, 6,99 €); lo demás ofrece mandar el pedido por correo.
  Antes de redirigir, el pedido llega a kiriaai2026@gmail.com por FormSubmit (AJAX). Pruebas: función con fetch simulado (precios
  iguales que la web en las 34 combinaciones) y carrito con Playwright. Falta: el portal de bajas de Stripe (enlace en la web) y las
  condiciones de suscripción.

## Webs (v5, 3-11-2026: rehecho a petición de Javi, «muy frío» → más profesional y cercano)
Inspirado en páginas de agencias y de servicios de «web en una semana» (búsqueda web; algunas no se pudieron abrir desde la
sesión): proceso por pasos, precio cerrado por escrito, aprobar el diseño antes de publicar, dudas propias y cierre sin compromiso.
- Cabecera «Una web que se parece **a tu negocio**» + tres sellos de confianza (precio cerrado por escrito · ves el diseño antes
  de publicarlo · te lo explicamos todo, sin tecnicismos).
- **«Imagina la tuya»** (demo interactiva): el visitante escribe el nombre de su negocio y elige sector (peluquería, restaurante,
  academia, fisioterapia, tienda, reformas) y ve al momento una web de ejemplo en un navegador y en un móvil (colores, textos,
  dirección `nombre.es`); «Ejemplo real: esta web» enseña `media/web_demo.jpg`. Los nombres por defecto son inventados y la
  vista previa avisa de que la web real se diseña a medida. El navegador se inclina con el scroll, como antes.
- **Así trabajamos contigo** (4 pasos con una línea que se llena al bajar): nos cuentas tu idea → fotos y textos → ves tu web →
  publicada. **Qué incluye** (6 tarjetas con icono). **Planes** 250 € / 350 € (mismos precios y contenido), botones «Empezar mi
  web» (abre `#pago` en modo web, claves `web-0`/`web-1`) y «Prefiero hablarlo antes» (rellena el formulario).
- **Dudas sobre las webs** (qué necesito, cambios, pago, ¿sabré manejarla?) y tarjeta **«¿Hablamos de tu web?»** (Instagram
  @kiria.ai, formulario y correo como texto). Sin plazos ni número de revisiones: aún no están decididos para las webs.
- Las cajas de Precios llevaron un vídeo de ejemplo según el tipo, pero Javi pidió quitarlo (2-11-2026): van sin vídeo.

## Formulario y pedidos (v5.1, 3-11-2026): sin mailto
- Javi avisó de que al escribir «se peta la página o sale todo en blanco»: el formulario y la página de pago abrían enlaces `mailto:`,
  que dentro de la vista previa de Claude dejan el marco en blanco. Ya no hay ningún `mailto` en la web.
- **Web publicada (GitHub Pages o dominio propio)**: «Enviar mensaje» y «Enviar pedido» mandan los datos con **FormSubmit** (formsubmit.co, gratis,
  sin cuenta) a kiriaai2026@gmail.com (correo de la web desde el 4-11-2026), con `_autoresponse` (al cliente le llega un correo de confirmación) y `_next`
  (vuelve a la web con `#gracias` y sale arriba el aviso «¡Mensaje enviado!»; abajo tapaba el aviso de cookies). **La primera vez FormSubmit manda a ese correo un mensaje
  para activar el formulario: hay que pulsar «Activate Form».** Después se puede cambiar el correo por el alias que da FormSubmit.
  Según varias fuentes, la confirmación al cliente solo funciona con el envío normal (con su paso «no soy un robot»), no por AJAX:
  por eso se usa el envío normal. Probado con una simulación (la sesión no llega a formsubmit.co).
- **Vista previa (dentro de un marco) o archivo local**: no se puede enviar a otra web; sale «Tu mensaje está listo» con «Copiar y
  abrir Instagram» (copia el texto y abre `ig.me/m/kiria.ai`) y «Copiar mensaje», y el correo como texto para copiar.
- Correo mal escrito: aviso en rojo y se queda en el campo. Privacidad y cookies: FormSubmit añadido como proveedor.

## Foto propia en «Imagina la tuya» (v5.2, 3-11-2026, idea de Javi)
- Botón «Prueba con una foto tuya» (y arrastrar una imagen sobre la vista previa): la foto se reduce en el propio navegador
  (máx. 1400 px) y se pone en la web de ejemplo (ordenador y móvil) en cualquier sector; «Quitar foto» la retira. No se sube a
  ningún sitio (FileReader + canvas, solo en la pantalla del visitante).

## Productos en 3D (v5.3, 3-11-2026, idea de Javi: «si vendes productos… muéstralo en 3D como la esfera, modo mockups»)
- Apartado «¿Vendes productos?» · «Tus productos, en 3D», justo antes de los planes de pago y de las dudas. El visitante sube la
  foto de su producto (o la arrastra al visor) y lo ve en 3D sobre una peana que se gira arrastrando, con inercia, como el globo
  (en móvil, el arrastre vertical sigue moviendo la página; también con las flechas del teclado). Siete maquetas: caja, bolsa,
  tarro (cristal de verdad, con el contenido del color de la foto), botella, lata, taza y «foto en 3D» (bloque de metacrilato).
- Las etiquetas se pintan en un canvas con la foto, la marca (el nombre escrito en «Imagina la tuya»), el nombre del producto y
  el precio; los colores salen del tono más vivo de la foto. Sin foto, cada maqueta lleva un ejemplo (galletas, miel de romero,
  aceite…) con un monograma. Al cambiar de maqueta el producto da una vuelta y se queda de frente; luego gira solo.
- Debajo, una ficha de tienda (marca, nombre, precio y «Añadir a la cesta», que avisa de que es una demo) y la dirección
  `tunegocio.es/tienda/producto`. Botón «Lo quiero en mi web» → formulario con el plan «Web con tienda y productos en 3D»
  (sin precio propio: no está decidido; se habla con el cliente).
- three.js 0.170.0 desde jsDelivr, solo cuando el visitante se acerca al apartado (el resto de la web sigue sin librerías).
  La foto no sale del navegador (FileReader + canvas).

## Fotos de los sectores (pendiente, 3-11-2026)
- Javi pidió fotos «muy estéticas» y sin derechos para cada sector de «Imagina la tuya». El código ya las busca en
  `media/sectores/<clave>.jpg` (claves: peluqueria, restaurante, academia, fisioterapia, tienda, reformas); si no están, sale el
  degradado con el icono. La red de la sesión bloquea images.unsplash.com e images.pexels.com: Javi tiene que permitirlos
  (ajustes del entorno → Network access → Allowed domains). Licencias de Unsplash y Pexels: uso libre, también comercial.

## Contacto (v4.2, 2-11-2026, decisión de Javi)
- **Sin número de teléfono ni WhatsApp en ninguna parte.** Las dudas, por Instagram **@kiria.ai** (https://www.instagram.com/kiria.ai/,
  la cuenta conectada a Metricool) o por correo (kiriaai2026@gmail.com, el correo de la web desde el 4-11-2026). Botón flotante «¿Dudas? @kiria.ai».
- El formulario prepara el mensaje para enviarlo por correo (enlace `mailto`), copiarlo o abrir Instagram.
- Página de pago: **sin Bizum** (solo tarjeta y Apple Pay/Google Pay). Sin pasarela conectada, ofrece enviar el pedido por correo,
  copiarlo o escribir por Instagram.

## Página de pago (v4.1, 2-11-2026)
- Cada plan tiene **«Pagar ahora»**, que abre la página de pago `#pago` (vista dentro de la misma web): resumen del pedido
  (tipo, plan y difusión se pueden cambiar; líneas con el descuento y la difusión; total), datos (nombre, correo, empresa),
  método (tarjeta o Apple Pay/Google Pay; Bizum quitado por Javi) y botón «Pagar X €». **No pide datos de tarjeta**: el cobro irá en la página
  segura de Stripe. Para activarlo, rellenar `PAY_LINKS` en el script (clave «tipo-vídeos-difusión», p. ej. `'1-10-0'` =
  Publicidad, 10 al mes, sin difusión → enlace de pago de Stripe; se le añade `prefilled_email`). Mientras esté vacío, el botón
  muestra «El pago online se está activando» y ofrece enviar el pedido por correo, copiarlo o escribir por Instagram.
- Sin mención al IVA (Javi, 2-11-2026). Las palabras clave tienen el degradado en movimiento hacia la derecha (4,5 s por vuelta).

## Novedades de la v4 (2-11-2026, pedido de Javi)
- **Página en tonos oscuros** (`--bg #0a0b10`, paneles `#141823`, texto `#f2f4f8`). La portada sigue empezando en blanco (las
  cabezas) y **el fondo se apaga con la explosión** (progreso 0,6–0,8) hasta fundirse con el resto; la cabecera es clara solo
  sobre la parte blanca. Las cabezas usan tokens claros dentro de `.stage`; el titular final, tokens oscuros.
- **Sin recuadros amarillos**: las palabras clave van en letra con degradado rojo → violeta → azul (`--grad`).
- Anúnciate: fuera «Seguidores» y «Edad y país»; «Tarifas» es un botón que lleva a Precios; se añade «Difusión: 2 €/vídeo».
- Globo y preguntas: fuera «Otros idiomas».

## Novedades de la v3 (2-11-2026, pedido de Javi)
- **Más movimiento**: franja de texto que se desliza sola y con el scroll (dos filas en sentidos opuestos), **rueda 3D
  de trabajos** (los 8 clips en círculo: gira con el scroll, se arrastra, se para en un vídeo, flechas y puntos; avanza
  sola cada 6,5 s) y el texto de «Sobre nosotros» que se enciende palabra a palabra (rojo lo humano, azul la IA).
- **Sobre nosotros** (`#nosotros`): kiria.ai es una marca digital española que crea vídeos con IA + 4 pilares.
- **Precios** (`#precios`) con los de Javi y un extra de **difusión en kiria.ai: +2 € por cada vídeo** (confirmado por Javi).
  «Lo quiero» abre WhatsApp con el pedido escrito.
- **Cookies profesionales**: aviso con «Rechazar» y «Aceptar» al mismo nivel (guía de la AEPD) y «Configurar»;
  la elección se guarda 12 meses en `localStorage` (`kiria_cookies`); hoy no hay cookies de análisis ni de publicidad.
  Ventanas con **Aviso legal** (LSSI-CE art. 10), **Política de privacidad** (RGPD y LOPDGDD) y **Política de cookies**
  (LSSI-CE art. 22.2), con los datos del titular marcados «pendiente». Enlaces directos: `#aviso-legal`, `#privacidad`, `#cookies`.

### Tabla de precios (3-11-2026: otro +1 € a cada tipo, pedido de Javi; antes 5,99 / 8,99 / 12,99 / 15,99; redondeo al céntimo, mitad hacia arriba)
| Tipo | Duración | 1 vídeo | 4/mes (−10 %) | 10/mes (−12 %) | 30/mes, uno al día (−15 %) |
|---|---|---|---|---|---|
| Básico | 15–30 s | 6,99 € | 25,16 € (antes 27,96) | 61,51 € (antes 69,90) | 178,25 € (antes 209,70) |
| Publicidad | 30–45 s | 9,99 € | 35,96 € (39,96) | 87,91 € (99,90) | 254,75 € (299,70) |
| Completo | 45 s – 1 min | 13,99 € | 50,36 € (55,96) | 123,11 € (139,90) | 356,75 € (419,70) |
| Pro | más de 1 min | 16,99 € | 61,16 € (67,96) | 149,51 € (169,90) | 433,25 € (509,70) |
**Difusión en kiria.ai: +2 € por cada vídeo** (sin descuento), en cualquier plan; p. ej. 10 de Publicidad con difusión = 107,91 €.
Javi escribió «publicidad 30-35 seg» y luego el precio «30-45»: se puso 30–45 s.
Pendiente: qué incluye cada tipo, enlaces de pago de Stripe y condiciones de contratación. (El IVA no se menciona, por decisión de Javi.)

## Concepto (v2)
«Ideas humanas + ejecución con IA». Fondo blanco de laboratorio, tinta casi negra, el recuadro amarillo de nuestros
subtítulos para las palabras clave, **rojo para lo humano** y **azul para la IA**. Un solo tema claro, elegido a propósito
(portada blanca por petición de Javi); las bandas oscuras (Anunciarse, pie) llevan sus colores fijos.
- Colores: `--ink #0c0e12`, `--soft #f5f5f2`, `--line #e4e4df`, `--yellow #ffc83d`, `--red #e5243f`, `--blue #2357ff`,
  `--amber #f59e0b`, `--night #0b0d11`.
- Fuentes (Google Fonts): Anton (titulares), Instrument Sans (texto), JetBrains Mono (datos).

## Secciones (en orden)
1. Cabecera fija y translúcida: marca + Trabajos · Mundo · Anunciarse · Planes + «Pedir propuesta».
2. **Portada (420 vh, fija mientras se desliza)**: arriba, «3,2 millones de visualizaciones en 7 días» y una frase.
   Cabeza humana punteada (escaneo real) con el cerebro en rojo (circunvoluciones, cisura de Silvio, surco central,
   cerebelo y tronco) y cabeza de IA (anillos de escáner, red de nodos y cerebro de vóxeles). Al deslizar: giran de
   tres cuartos a perfil, se acercan, se tocan, se funden (vibran, destello amarillo), explotan en partículas con una
   onda, y aparece «Vídeos que **paran** el scroll.» con los botones. Subiendo, todo vuelve a su sitio.
   Progreso del scroll → tiempos: acercarse 0,03–0,40 · fundirse 0,40–0,555 · explotar 0,56–0,90 · titular 0,70–0,86.
3. Cifras: **3,2 M visualizaciones en 7 días** (cuenta animada) · +20 vídeos · 4 marcas · 60 s · 100 % online.
4. Han confiado en nosotros (con lo que se hizo de verdad para cada marca).
5. Trabajos: 8 clips de 7 s que se cargan y reproducen al verse (Derecho, Industrial, Software vs Informática,
   Aeroespacial, Magisterio, Bomberados, Civil, Bomberados IA) + «¿Quieres el tuyo?».
6. Formatos (4) y anatomía de un reel (barra de 60 s).
7. Cómo trabajamos (4 pasos) y qué recibes (especificaciones).
8. **Mundo**: «De España, para todo el **mundo**.» + globo 3D de puntos (Natural Earth) que se gira arrastrando, con
   30 arcos desde España (cometa rojo → ámbar, punta de flecha y onda en cada destino); vuelve solo a España si nadie lo toca.
9. **Anúnciate en kiria.ai** (banda oscura): vídeo patrocinado, serie con tu marca, mención al cierre, colaboración;
   media kit (3,2 M en 7 días, +20 vídeos; seguidores, público y tarifas pendientes). «Toda la publicidad va identificada».
10. Precios (v3): ver la tabla de arriba; sustituye a los planes de la v2.
11. Preguntas frecuentes (8).
12. Contacto: el formulario abre WhatsApp (+34 601 621 977) con el mensaje escrito (también correo o copiar);
    correo javierfernandez03112007@gmail.com, Instagram @javifer.h; botón flotante de WhatsApp.
13. Pie: legales (pendientes) y créditos de la cabeza 3D y del mapa.

Sin movimiento (`prefers-reduced-motion`) las cabezas salen quietas y el titular debajo; sin WebGL sale `media/cabezas.jpg`.

## Decisiones de Javi (respetarlas)
- **No poner cifras de un solo vídeo** en la web (1-11-2026): solo el total del canal. En las tarjetas de trabajos NO van visitas.
- Clientes: Élite Bomberos / Bomberados (reels de la app), Fersalv (vídeos de construcción generados con IA),
  Beauty Salon Merche (su página web).

## Datos: solo reales (regla de honestidad de `engine/REGLAS.md`)
- **3,2 M visualizaciones en 7 días** en la cuenta de Instagram (dato de Javi, 1-11-2026; antes 2,1 M).
- **+20 vídeos**: proyectos con vídeo final en `projects/*/out/`. **4 marcas**: la lista de Javi.
- Duraciones de los formatos medidas en los vídeos finales (ver la v1).
- Los arcos del globo enseñan alcance online («trabajamos con marcas de cualquier país»), no clientes por país.

## Pendiente (en la página sale como recuadro discontinuo «pendiente»)
- Nombre comercial y dominio; textos legales (titular, NIF, dirección: aviso legal, privacidad y cookies).
- Rondas de cambios; tarifas de patrocinio. (Plazo de entrega ya puesto: **entre 12 y 72 h desde la compra efectiva**, Javi 3-11-2026,
  en el paso «Entrega» de Cómo trabajamos y en la pregunta «¿Cuánto tarda?».)
- Media kit: seguidores, edad y país del público, alcance medio por vídeo (capturas de Instagram).
- Otros idiomas (¿voz en inglés o portugués?).
- Opiniones de clientes con permiso; logos y permiso de cada marca.
- Para publicarla de verdad: hosting (Cloudflare Pages, Netlify o GitHub Pages) + dominio; servicio para el
  formulario (Formspree/Tally) o seguir con WhatsApp; analítica (Plausible) y aviso de cookies si hace falta.
- Revisar promesas comerciales (derechos del vídeo, licencia comercial de la voz en ElevenLabs).

## Media y herramientas
- `media/*.mp4`: fragmentos de 7 s a 540×960, sin audio, H.264 crf 27, con póster `.jpg` del mismo nombre.
- `media/cabezas.txt` (≈ 1,3 MB, base64): nubes de puntos de la portada — piel (24.900), cerebro (21.400),
  anillos (21.000), nodos (≈ 1.040) + aristas y vóxeles (≈ 7.900); posiciones int16, normales int8, semilla y valores.
- `media/globo.txt` (≈ 55 KB): 8.189 puntos de tierra (rejilla de 1,2°), 28 marcados como España.
- `media/cabezas.jpg`: imagen fija de las dos cabezas (para sin WebGL).
- `tools/gen.py` (cabezas; necesita `LeePerrySmith.glb` del repositorio de three.js r170, CC BY 3.0, y
  `pip install scipy scikit-image`), `tools/globe_gen.py` (globo; GeoJSON 1:110m de Natural Earth, dominio público,
  y `pip install shapely`), `tools/prev.py` (vista rápida), `tools/shot.mjs` (capturas con Playwright).
- Créditos obligatorios (CC BY 3.0): «Cabeza 3D: escaneo de Lee Perry-Smith (Infinite-Realities)». Ya están en el pie.
