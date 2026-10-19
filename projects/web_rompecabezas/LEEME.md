# Web · RompeCabezas (Granada)

Propuesta de web en un solo archivo, `index.html`. Todo es JavaScript y SVG propios, sin librerías.

## Escenas al hacer scroll
1. **Nombre:** 12 piezas de puzzle, una por letra de ROMPECABEZAS, llegan desordenadas y encajan.
2. **Hamburguesa en despiece:** las 8 capas se separan con su rótulo y vuelven a encajar («¡Rompecabezas resuelto!»).
   - **Torre de la casa:** la foto real se corta en 5 rodajas que se separan, con lo que lleva cada capa.
   - **Terraza:** la foto se ve primero por el hueco de una pieza de puzzle, que crece hasta llenar la pantalla.
3. **Caña + tapa:** la caña se llena, sube la espuma y entra el plato de jamón asado.
4. **Carta en horizontal:** 6 tarjetas de platos que corren de lado.
5. **Reseñas:** salen de un mazo y se reparten por la pantalla.
6. **Carta con pestañas** (Tapas, Raciones, Hamburguesas, Pizzas y Bebidas): los platos entran volando y encajan. Cada plato enlaza a Glovo.
7. Por qué venir, ficha con cartel, horario y mapa, y llamada final.

Pedidos a domicilio: https://glovoapp.com/es/es/granada/rompecabezas-granada/ (botón de la barra, carta y final).

## Fotos
Las fotos `terraza.jpg`, `torre.jpg`, `cartel.jpg` y `cana.jpg` son las que nos pasaron, ampliadas y retocadas (menos ruido, mejor luz y color). Las originales eran muy pequeñas, así que conviene pedir las fotos en alta calidad.

Cada tarjeta de la carta tiene un dibujo. Si se guarda la foto en `img/` con su nombre, aparece la foto y se oculta el dibujo:
`jamon-asado.jpg`, `flamenquin.jpg`, `raciones.jpg`, `hamburguesa.jpg`, `terraza.jpg`, `futbol.jpg`.

## Datos a confirmar con el bar
- **Dirección:** Calle Ribera del Genil, 7. El encargo decía «calle Ziríes».
- **Horario:** provisional, de 12:00 a 00:00 y martes cerrado (las fuentes no coinciden).
- **Platos:** que tengan hamburguesa, y sus ingredientes reales. Los de la web son de ejemplo.
- **Carta:** la constante `CARTA` del `<script>` lleva platos sacados de reseñas y sin precio («Precio en Glovo»). Hay que copiar la carta real de Glovo con sus precios.
- **Torre:** que las capas sean paté, queso crema y mango, como se ha supuesto por la foto.
- **Reseñas:** son frases y títulos sacados de opiniones públicas. Mejor sustituirlas por reseñas de Google con nombre, si el bar lo aprueba.
- **Nota:** el 4,1 de Google sale de agregadores.
