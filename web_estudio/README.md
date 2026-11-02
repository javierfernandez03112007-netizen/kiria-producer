# Web del estudio (venta de vídeos a empresas) — versión 4

Idea aprobada por el usuario el 31-10-2026 («vamos a partir de esa idea»): **una web muy profesional para vender
vídeos hechos con IA directamente a empresas** (no se vende el motor ni las ideas). El 1-11-2026 Javi pidió
profesionalizarla para monetizar «por todo lo alto», con esta portada: un poco de información arriba, fondo blanco,
a la izquierda una cabeza humana con el cerebro a la vista y a la derecha una de IA; al deslizar hacia abajo se juntan,
explotan y sigue la página. Después pidió un globo 3D que se pueda girar, con flechas curvas que unan España con
países de todo el mundo y el mensaje «de España a todo el mundo».

- Página: `index.html` (un solo archivo, sin librerías: WebGL escrito a mano) + `media/`.
- Vista previa privada (Artifact): https://claude.ai/artifact/31hjcpiCg4H1Wdvx2Qb8vy — se actualiza publicando
  este mismo `index.html` con esa `url` y los archivos nuevos de `media/` en `files`. Solo el dueño la ve hasta que
  la comparta desde el menú «Compartir».
- Versiones fijas: v1 (oscura) en la rama `web-estudio-v1` (commit 5913977). El Artifact no sirve archivos `.bin`:
  los datos 3D van en base64 dentro de `.txt`.

## Webs y vídeos en Precios (v4.3, 2-11-2026)
- Apartado **Webs** (`#webs`, en el menú): «Web con tus fotos» **250 €** y «Web con fotos nuestras» **350 €** (sesión de fotos
  en su negocio; zona: consultar), pago único y todo incluido (diseño adaptado al móvil, textos con IA revisados, detalles con IA,
  enlaces a Instagram/correo/reservas, publicada). Navegador animado que se inclina con el scroll y enseña esta misma web
  (`media/web_demo.jpg`, capturas de las secciones). «Pagar ahora» abre `#pago` en modo web (claves `PAY_LINKS` `web-0` y `web-1`);
  «Pedir mi web» rellena el formulario. Pregunta frecuente «¿También hacéis páginas web?».
- **Cada caja de Precios lleva un vídeo de ejemplo** que se reproduce solo (en silencio) y cambia con el tipo elegido:
  Básico → Bomberados IA, Bomberados, Software, Civil · Publicidad → Bomberados, Bomberados IA, Magisterio, Industrial ·
  Completo → Industrial, Derecho, Magisterio, Economía · Pro → Aeroespacial, Derecho, Software, Civil (`media/economia.*` nuevo).

## Contacto (v4.2, 2-11-2026, decisión de Javi)
- **Sin número de teléfono ni WhatsApp en ninguna parte.** Las dudas, por Instagram **@kiria.ai** (https://www.instagram.com/kiria.ai/,
  la cuenta conectada a Metricool) o por correo (javierfernandez03112007@gmail.com). Botón flotante «¿Dudas? @kiria.ai».
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

### Tabla de precios (2-11-2026: +1 € a cada tipo; redondeo al céntimo, mitad hacia arriba)
| Tipo | Duración | 1 vídeo | 4/mes (−10 %) | 10/mes (−12 %) | 30/mes, uno al día (−15 %) |
|---|---|---|---|---|---|
| Básico | 15–30 s | 5,99 € | 21,56 € (antes 23,96) | 52,71 € (antes 59,90) | 152,75 € (antes 179,70) |
| Publicidad | 30–45 s | 8,99 € | 32,36 € (35,96) | 79,11 € (89,90) | 229,25 € (269,70) |
| Completo | 45 s – 1 min | 12,99 € | 46,76 € (51,96) | 114,31 € (129,90) | 331,25 € (389,70) |
| Pro | más de 1 min | 15,99 € | 57,56 € (63,96) | 140,71 € (159,90) | 407,75 € (479,70) |
**Difusión en kiria.ai: +2 € por cada vídeo** (sin descuento), en cualquier plan; p. ej. 10 de Publicidad con difusión = 99,11 €.
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
- Plazo habitual de entrega y rondas de cambios; **precios** de los 3 planes; tarifas de patrocinio.
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
