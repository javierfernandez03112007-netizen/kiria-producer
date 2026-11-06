# Fuentes — «¿Qué presión llega a la lanza?» (presión en punta con la manguera subiendo 50 m)

## La pregunta
- Pregunta tipo test que propuso **Adrián (Élite Bomberos)** en Notion el 6 nov 2026 (fila «PRESION EN BOMBA», con su
  guion): «(Examen de ayto Santiago de Compostela 2017) En un tendido de mangueras que se eleva 50 m. sobre la bomba,
  ¿Qué presión tendríamos en punta de lanza si esta se encuentra cerrada y el manómetro de la bomba indica 8 bar?
  a) 1,5 bar b) 2 bar c) 3 bar d) 8 bar».
- **Pendiente:** confirmar con Adrián el examen. En la web no aparece el cuadernillo; sí consta que el Ayuntamiento de
  Santiago de Compostela convocó plazas de Bombero-Conductor de las ofertas de 2016 y 2017
  ([BOE-A-2018-13798, 10 oct 2018](https://boe.es/boe/dias/2018/10/10/pdfs/BOE-A-2018-13798.pdf)). Hasta confirmarlo, la
  voz NO dice «oficial» y el sello de pantalla («EXAMEN · AYTO. DE SANTIAGO DE COMPOSTELA») se puede quitar sin regrabar.

## La respuesta: C) 3 bar (no se dice en el vídeo: se pide en comentarios; está al final de la descripción)
- Presión hidrostática: p = ρ·g·h. Con agua (ρ ≈ 1.000 kg/m³, g = 9,81 m/s²), 10 m de altura son ≈ 0,98 bar: la regla
  de «1 bar por cada 10 m» (1 bar ≈ 10 m de columna de agua). 50 m → 4,9 bar ≈ 5 bar. Equivalencia 1 bar = 10 m.c.a. en
  [PCPI, tema 7 «Presión y caudal»](https://paulinoposada.github.io/web/websites/fp_basica/temas_pcpi/PCPI_tema_7_presion_y_caudal.pdf)
  (visto en el buscador el 6 nov 2026). La misma regla está en `projects/bomberados_acoplamiento/FUENTES.md`.
  **Pendiente:** la página del manual de hidráulica que uséis (Javi / Adrián) para citarla tal cual.
- Con la lanza cerrada no hay caudal: el agua está quieta y las pérdidas de carga por rozamiento (que dependen de la
  velocidad del agua) son cero. Solo cuenta la altura: 8 − 4,9 ≈ 3 bar.
- Las trampas: D) 8 bar (olvidar la altura: «la lanza está cerrada, así que llega toda la presión»); A) 1,5 y B) 2 bar
  (restar además un rozamiento que, con la lanza cerrada, no existe).

## La escena (todo es 3D generado)
- Autobomba genérica (sin escudos ni marcas reales), edificio alto de noche con fuego arriba, manguera por la fachada
  hasta 50 m; el agua que se ve dentro de la manguera es una luz azul (recurso visual). Regla de altura cada 10 m.
- Voz: Danny (ElevenLabs, Eleven v3), grabada por Javi. Efectos: biblioteca de efectos de vídeos anteriores y los
  sintetizados de `projects/bomberados_botella/sfx_sintetizados.py`.
