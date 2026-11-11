# Fuentes — «¿Qué manguera pierde más presión?» (pérdida de carga en mangueras de 25, 45 y 70 mm)

## La pregunta
- Pregunta tipo test que propuso **Adrián (Élite Bomberos)** en Notion (fila «SÁBADO 14 PREGUNTA EXPLICADA»):
  «¿Qué tipo de manguera ocasionará mayor pérdida de carga? a) La de 25 mm. b) La de 45 mm. c) La de 70 mm. D) las tres
  por igual (Ayuntamiento de Pontevedra 2022)», con la indicación «Explicar gráficamente las diferencias entre pérdidas de
  carga».
- **Pendiente:** confirmar con Adrián el examen (Ayto. de Pontevedra, 2022). Hasta entonces, la voz NO dice «oficial» y el
  sello de pantalla («EXAMEN · AYTO. DE PONTEVEDRA 2022») se puede quitar sin regrabar.
- Por qué se adelanta (era la del sábado 14): con los datos de Notion del 10 nov, lo que más alcance tiene es el 3D con
  dron de mangueras y presión (acoplamiento 106.000 vistas, presión 63.400) y lo que menos, los anuncios de la app (FOMO
  3.899, autobús 5.100). Ver `bomberados/ANALISIS.md`.

## La respuesta: A) la de 25 mm (no se dice en el vídeo: se pide en comentarios; está al final de la descripción)
- **Pérdida de carga** = presión que pierde el agua por el rozamiento con la pared de la manguera (y entre sus propias
  partículas). Depende de la longitud, el diámetro, la rugosidad de la manguera y el caudal; a menor diámetro, mayor pérdida
  (guías de mangueras y pitones de la Academia Nacional de Bomberos de Chile:
  [Guía «Mangueras y pitones»](https://www.anb.cl/documentos_sitio/Guia-Mangueras-y-pitones2.pdf); regla de cálculo para
  bomberos, [instrucciones en español](https://photocalcul.com/Calcul/Regles/Notices-regles/reglas_bomberos_es_v6.pdf);
  vistos en el buscador el 10 nov 2026). **Pendiente:** la página del manual de hidráulica que usáis (Javi / Adrián) para
  citarla tal cual.
- **Velocidad (continuidad, Q = v · S):** con el mismo caudal, la velocidad es inversamente proporcional a la sección
  (π·D²/4): v₂₅ / v₇₀ = (70 / 25)² = 7,84 → «casi ocho veces más rápido» (en pantalla «×7,8» y «(70/25)² ≈ 7,8»). Con 45 mm:
  (45 / 25)² = 3,24. Son los diámetros nominales (interiores) de las mangueras de 25, 45 y 70 mm.
- **Por qué pierde más:** la pérdida por rozamiento crece con el cuadrado de la velocidad y es inversamente proporcional al
  diámetro (Darcy-Weisbach: h = f · (L/D) · v²/2g); a igual caudal y longitud, en la práctica ∝ 1/D⁵ (Darcy) o 1/D^4,87
  (Hazen-Williams): la de 25 mm pierde unas 17–19 veces más que la de 45 y unas 150–170 veces más que la de 70 (orientativo:
  depende de la rugosidad de cada manguera). En la descripción se dice «decenas de veces más que la de 45 y más de cien veces
  más que la de 70».
- La trampa: la D («las tres por igual»: pensar que la pérdida solo depende de la longitud) y la C (pensar que la gorda,
  como lleva «más agua», pierde más: aquí el caudal es el mismo).

## La escena (todo es 3D generado)
- Plaza de noche, autobomba genérica (sin escudos ni marcas reales) con un colector y tres salidas, tres líneas de manguera
  con su grosor relativo real (dibujadas al doble de diámetro para que se vean), tres bomberos con las lanzas aún cerradas y un
  edificio en llamas al fondo. El agua dentro de las mangueras es una luz azul (recurso visual, igual en las tres).
- El «laboratorio»: un tubo transparente (rayos X) con el agua (gotas de luz) que va más deprisa en el centro que junto a la
  pared, chispas de roce en la pared, una columna de presión por metro que baja (más largo → más columnas; más agua → bajan
  más deprisa) y los dos tubos de 70 y 25 mm con la misma agua (en el de 25 va 7,8 veces más rápida). Las cifras de las
  columnas son ilustrativas (no hay escala en pantalla).
- Voz: Danny (ElevenLabs, Eleven v3), grabada por Javi. Efectos: biblioteca de vídeos anteriores (presión, botella,
  autobús) y sintetizados.

## Versión 3 (11 nov): la explicación que pidió Adrián
Adrián (cliente, por WhatsApp a Javi) pidió que el vídeo explique así la pérdida de carga (temario de Élite Bomberos):
«La caída de presión ocasionada por la resistencia a fluir se denomina pérdida de carga: pérdida de presión que sufre un
líquido por el rozamiento consigo mismo y con las paredes. Se deben a la fricción de las partículas entre sí (90 %) y contra
las paredes de la tubería (10 %). Es la diferencia de presión entre el principio y el final de un conducto. Factores que las
AUMENTAN: mayor longitud (directamente proporcional); mayor caudal o velocidad (proporcional al cuadrado: doble velocidad =
cuádruple pérdida); menor diámetro (inversamente proporcional a su quinta potencia); los elementos de la instalación
(rugosidad, codos, bifurcaciones, válvulas…); mayor viscosidad. Las pérdidas de carga son independientes de la presión.»
- En pantalla, el 90 % / 10 % va con «(según el temario)»: es el dato del temario de la academia; no lo hemos encontrado en
  una fuente técnica pública. **Pendiente:** la página del manual de donde sale.
- Lo demás coincide con la física: Darcy-Weisbach h = f·(L/D)·v²/2g (∝ L, ∝ v², y a igual caudal ∝ 1/D⁵ porque v ∝ 1/D²).
