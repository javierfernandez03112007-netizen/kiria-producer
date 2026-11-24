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
- **La web se hace parte por parte** (decisión de Javi, 24-11): yo propongo cada sección, la monto, te mando capturas y vídeo (`merche/web_avances/`) y seguimos cuando le da el visto bueno.

## La web (`web_merche/`), parte por parte
Es una maqueta en HTML, CSS y JS sin librerías (salvo three.js para la intro), con las fuentes alojadas en la propia web por el RGPD.
Cuando esté aprobada, se pasa a un tema de Shopify. Para verla: `cd web_merche && python3 -m http.server`.
Añadiendo `?sinintro` a la dirección se salta la intro, y con `?intro` se fuerza.
| # | Parte | Estado |
|---|---|---|
| 1 | Base + intro de 5 s (bolsa 3D; el vídeo con IA se enchufa en `js/config.js`) + avisos + cabecera + portada | **hecha 24-11**, esperando el visto bueno |
| 2 | Tienda: categorías por necesidad y tarjetas con vídeo | siguiente |
| 3 | Ficha de producto (vídeo, consejo de Merche, «lo recibes el…», combínalo con) | — |
| 4 | Carrito y caja (envíos, recogida en el salón, pago) | — |
| 5 | «¿Cuál es tu ghd?» (comparador) | — |
| 6 | «Compra y Merche te enseña» (el tutorial) + packs | — |
| 7 | Tu rutina en 30 s (test) | — |
| 8 | Merche, el salón y novias | — |
| 9 | Confianza (original, garantía, envíos, devoluciones) + preguntas frecuentes | — |
| 10 | Pie + textos legales + buscador | — |
- `js/art.js`: siluetas provisionales del producto, mientras no haya foto oficial. `css/styles.css` ya trae los estilos de casi todas las partes.

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
- **No hay clave de vídeo con IA.** La API de Google (Veo) sí responde desde aquí, así que solo haría falta la clave.
- **Cómo me pasa los vídeos Javi:** adjuntos en el chat, como el audio. Si pesan mucho, comprimidos o en trozos; lo probamos con el primero.

## Pendiente
- **De Merche:** permisos de ghd y de Henkel, consentimiento de imagen, logo y bolsa, precios (de venta y de compra) y acceso a su Meta Business.
- **De Javi:** qué era «triple» (¿TPV? ¿Stripe?), si la web actual la hicimos nosotros, la clave de la IA de vídeo, la clave de ElevenLabs y el precio que le cobra a Merche.
