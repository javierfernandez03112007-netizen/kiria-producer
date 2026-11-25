# Beauty Salon Merche · tienda online + vídeos + anuncios (léelo antes de tocar nada de Merche)

Proyecto decidido con Javi el 21-11-2026. Cliente del estudio: **Beauty Salón Merche**, de **Merche Herrera**,
peluquera de Motril (Granada) especializada en novias y eventos, con más de 20 años de experiencia.

## La idea (decisión de Javi, 21-11-2026)
1. **Una web de venta** a nombre de Beauty Salon Merche con productos y herramientas de **ghd** y **Schwarzkopf Professional**.
2. **Vídeos profesionales** de cada producto, con la imagen de Merche o hechos con IA (Higgsfield, Veo, Kling…), que lleven a la gente a la web.
3. **Anuncios** en Meta Ads (Instagram y Facebook) y similares, que dirigen a la ficha del producto.
4. **Después de la compra**, un correo automático con un vídeo tutorial de Merche usando ese producto o aconsejándolo (más una tarjeta con QR en el paquete).

No competimos en precio con Druni, Primor, El Corte Inglés, Sephora ni con la propia ghd. Lo que vendemos es **la peluquera que te aconseja y te enseña**.

## Cómo trabajamos (el flujo)
1. **Yo** mantengo la lista de todos los vídeos: `merche/GUION_GENERAL_VIDEOS.pdf`.
2. **Javi** me manda, por cada producto, la ficha rellena con la idea de Merche (plantilla en el mismo PDF).
3. **Yo** devuelvo el guion de ese producto: anuncio 9:16 con 3 ganchos, vídeo para la web, tutorial y texto del anuncio.
   Cada guion lleva la lista de tomas que hay que grabar y, si hay partes con IA, sus indicaciones (prompts).
4. **Javi** graba o genera los vídeos y me los manda.
5. **Yo** los edito: montaje, subtítulos, rótulos, detalles en 3D, sonido y versiones de cada formato.
- Los guiones de cada producto van en `merche/guiones/<producto>.md` y los vídeos en `merche/videos/<producto>/`.
- **La web**: el 24-11 Javi pidió montarla ya entera y «de 10»: dinámica (escenas que se mueven en horizontal, cambios de plano, nada de
  «una página que baja y ya»), con **todos los productos de ghd y Schwarzkopf Professional** y huecos para las fotos y vídeos que irá mandando.

## La web (`web_merche/`) — estado el 24-11-2026: montada entera como maqueta que funciona
**Cómo está hecha y cómo se toca: `web_merche/README.md`** (léelo antes de cambiar nada). Resumen:
- HTML, CSS y JS sin librerías (solo three.js para la intro), fuentes alojadas en la propia web (RGPD). Cuando esté aprobada, se pasa a un tema de Shopify.
- **Enlace privado de vista previa** (lo pidió Javi el 24-11): https://claude.ai/artifact/MyPr7aV3fpCqdQVF3dcX62 — solo lo abre él hasta que lo comparta.
  Cómo se actualiza: `web_merche/README.md`.
- **Para enseñarla sin servidor:** `web_merche/dist/beauty-salon-merche-demo.html` (un solo archivo de ≈ 1,7 MB; se abre con doble clic).
- **Catálogo: 160 productos** (59 ghd + 101 Schwarzkopf Professional) con descripción, ventajas, modo de uso, datos técnicos, precio de referencia y fuente.
  Eran 169: el 25-11-2026 se quitaron 9 de Schwarzkopf que la marca ya no publica (ver «Fotos, estado» más abajo).
  Sale de `web_merche/data/*.json`. Los precios son PVP o de tiendas (nov. 2026): **el precio final lo pone Merche**; los campos dudosos van en `confirm`.
- **Fotos y vídeos:** basta con dejar el archivo en `web_merche/media/productos/<id>.jpg` (foto), `<id>.mp4` (vídeo) o `<id>-tutorial.mp4`
  (tutorial de Merche) y ejecutar `python3 data/build.py`. Los generales (intro, vídeo de portada, foto de Merche) se ponen en `js/config.js`.
- Lo que tiene:
  | Parte | Qué hace |
  |---|---|
  | Intro de 5 s | La bolsa en 3D (o el vídeo con IA cuando exista). Solo la primera visita y nunca si se llega directo a un producto desde un anuncio. Se puede repetir desde el pie |
  | Entrada | El nombre sube desde la bolsa a la cabecera y la portada aparece por partes |
  | Lo más vendido | Escena fijada: al bajar, las tarjetas se desplazan en horizontal (en el móvil, carrusel con el dedo). **La selección es provisional** |
  | ¿Qué necesita tu pelo? | Lista grande; al pasar por cada necesidad cambia el plano de la derecha |
  | ¿Cuál es tu ghd? | Escena negra fijada por pasos (Original → Gold → Platinum+ → Chronos → Sculpt). Textos orientativos nuestros: que los revise Merche |
  | Novedades | Cinta grande que corre en sentido contrario + carril |
  | Compras, y Merche te enseña | Los 3 pasos y el móvil con el correo del tutorial |
  | Schwarzkopf | Paneles que se abren por línea (Bonacure, Fibre Clinix, BLONDME, Scalp Clinix, OSiS, Session Label, Silhouette) |
  | Tu rutina en 30 s | Test de 3 preguntas que propone productos y los añade a la bolsa |
  | Packs y estuches | Carril que se arrastra. El precio del pack es la suma (sin descuentos inventados) |
  | Merche y novias | Texto real (20 años, Motril, novias); foto pendiente |
  | Tienda | Filtros por grupo, marca, necesidad, línea y tipo; ordenar; «ver más»; buscador |
  | Ficha | Foto, hueco de vídeo y de tutorial, precio, «recíbelo el…», consejo de Merche (pendiente), datos, «combínalo con» |
  | La bolsa y la caja | Bolsa lateral con barra de envío gratis; caja en un paso con envíos, recogida en el salón y pago. **Es una demostración: no cobra ni guarda datos** |
- Todo lo que falta por confirmar sale en la web con una etiqueta amarilla discontinua («pendiente», «por confirmar»).
- Vídeos de cómo se ve: `merche/web_avances/` (recorrido en ordenador y en móvil).

## Reglas de los vídeos
- Cada dato del producto sale de la ficha oficial de la marca y se dice como suyo («según ghd…»). Lo dudoso se marca con «CONFIRMAR».
- **Nunca resultados falsos**: nada de «antes y después» inventados.
- **Las etiquetas, siempre de la foto o del vídeo real del producto.** La IA las deforma: sirve para el ambiente, el pelo, las manos y los movimientos de cámara.
- Si sale una persona generada con IA, se avisa, y no se usa la cara de nadie sin su consentimiento por escrito (Merche y las clientas).
- Música solo con licencia; en los anuncios, nunca canciones de moda.
- Los anuncios llevan a la ficha concreta del producto, no a la portada.

## Lo que se sabe (investigado el 21-11-2026; detalle en `PLAN_TIENDA_MERCHE.pdf`)
- Merche ya vende online en beautysalonmerche.es (WooCommerce, 124 productos). **Google muestra su portada con spam de apuestas: es probable que esté hackeada.** Hay que avisarla.
- Datos públicos (de 2022, hay que confirmarlos): teléfono 635 99 35 49, salonpeluestetic@hotmail.com, Urb. El Pilar, C/ Ntra. Sra. de Lourdes s/n, Motril. Su Instagram no está confirmado.
- **ghd** solo deja vender a salones autorizados, aunque admite que lo hagan desde su propia web. **Schwarzkopf/Henkel**: no tiene una norma pública para España; hay que preguntar al comercial. Las dos marcas tienen que dar permiso para usar sus logos y fotos.
- Plataforma recomendada: Shopify con diseño a medida (píxel de Meta, catálogo y correos automáticos casi sin configurar).

## Accesos (comprobado el 21-11-2026)
- **Funciona:** nuestro motor de vídeo, Metricool (solo con kiria.ai) y Notion.
- **Bloqueado desde la sesión:** ElevenLabs (403 del proxy), Instagram/Meta, las webs de las marcas, Google Drive, Dropbox y WeTransfer.
- **Por qué (visto el 25-11):** esta sesión corre en el entorno «Default», que no tiene ningún dominio permitido ni claves. Las claves de Javi
  (ElevenLabs y Higgsfield) y sus dominios están en su otro entorno, «Predeterminado», al que una sesión en marcha no se puede cambiar: hay que
  abrir una sesión nueva en él. En «Predeterminado» la clave de Higgsfield está guardada para `api.higgfield.ai` (sin la «s»): parece una errata.
- **No hay clave de vídeo con IA.** La API de Google (Veo) sí responde desde aquí, así que solo haría falta la clave.
- **Cómo me pasa los vídeos Javi:** adjuntos en el chat, como el audio. Si pesan mucho, comprimidos o en trozos; lo probamos con el primero.

## Pendiente
- **De Merche:** permisos de ghd y de Henkel, consentimiento de imagen, logo y bolsa, precios (de venta y de compra) y acceso a su Meta Business.
  Para la web: qué productos vende de verdad (de los 160), sus precios, lo más vendido real, envíos (transportista, costes, gratis desde…),
  formas de pago, su WhatsApp e Instagram, sus datos fiscales para los textos legales, su foto y una frase por producto estrella.
- **De Javi:** qué era «triple» (¿TPV? ¿Stripe?), si la web actual la hicimos nosotros, la clave de la IA de vídeo, la clave de ElevenLabs y el precio que le cobra a Merche.
  Para la web: visto bueno o cambios de la maqueta, fotos y vídeos (los va mandando) y si quiere un enlace privado para verla en el móvil.
- **Mío (siguiente):** poner fotos y vídeos reales según lleguen, textos de Merche por producto, y pasar la maqueta aprobada a Shopify.
- **Fotos, estado el 25-11-2026:** 101 de 160 puestas: **Schwarzkopf está completo** (sus 101 productos llevan la foto y la ficha oficiales, descargadas de la
  propia marca: **Javi confirmó que tienen permiso de ghd y Schwarzkopf para usar sus fotos**). 100 salen de la tienda oficial y la Bruma Sun Protect SPF 20,
  de la web de marca. **Solo faltan las 59 de ghd** (su web bloquea esta máquina: **las manda Javi**). El enlace privado va por la versión 3.
- **Productos quitados el 25-11-2026 (9):** Javi dijo «los que no aparezcan quítalos». No están ni en la tienda oficial ni en la web de marca de
  Schwarzkopf España: Moisture Kick Curl Bounce (nº 79), Frizz Away ×4 (82–85), Time Restore ×3 (86–88) y OSiS Pump Up (128). Sus números no se reutilizan
  y sus fichas están guardadas en `web_merche/data/_retirados.json` por si Merche los tiene en el salón y hay que volver a ponerlos.
- **Entorno:** el 25-11 Javi aprobó el entorno «kiria-producer» (solo permite `www.ghdhair.com`, `shop.schwarzkopf-professional.es`,
  `www.schwarzkopf-professional.com` y `dm.henkel-dam.com`). Las claves de ElevenLabs y Higgsfield siguen solo en «Predeterminado».
- **En curso desde el 25-11: las fotos de producto.** Javi dijo que la base de la web «es muy buena» y que él va mandando las fotos por el chat.
  Tiene la lista numerada (`merche/LISTA_PRODUCTOS_FOTOS.pdf`); el estado foto a foto está en `merche/LISTA_FOTOS.md` y el procedimiento en `web_merche/README.md`.
  Tras cada tanda: colocar, regenerar, republicar el enlace privado y decirle cuántas van y cuáles faltan.
