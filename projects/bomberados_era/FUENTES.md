# Fuentes — «Tu botella va a 300 bares»: las 10 piezas del ERA

## La idea y la lista
- Idea de **Adrián (Élite Bomberos)** en Notion, fila «MIÉRCOLES 25» (PUBLICIDAD BOMBERADOS): «Explicar de forma rápida los
  componentes de un equipo de respiración autónomo (ERACA)»: 1 máscara completa · 2 espaldera o placa dorsal · 3 botella de
  aire comprimido · 4 grifo · 5 manorreductor o reductor de presión · 6 avisador acústico o silbato · 7 manómetro ·
  8 bodyguard · 9 pulmoautomático o reductor de caudal · 10 mangueras de alta y media presión. Con una foto de un equipo con
  las piezas numeradas (la manguera de alta va del reductor al manómetro y al silbato; la de media, al pulmoautomático de la
  máscara). La foto no se sube al repositorio (es pública) ni sale en el vídeo: el equipo del vídeo es 3D y sin marcas.
- **Pendiente:** la página del manual que usáis (Javi / Adrián) para citarla tal cual.

## Los datos que dice el vídeo
- **Botella a 300 bar.** Los equipos de dos etapas admiten botellas de 200 o 300 bar; p. ej. «botella de acero aleado de
  6 litros con presión máxima de carga 300 bar» ([Universidad de Cantabria, manual del ERA Dräger PA 90](https://personales.gestion.unican.es/martinji/archivos/era.pdf)).
  La foto de Adrián es de una de 207 bar; el vídeo usa 300 (la más corriente hoy).
- **«Si te llegaran así a la boca, te reventarían los pulmones».** El pulmón se rompe (barotrauma) con sobrepresiones de
  décimas de bar (≈ 0,1 bar = 80–100 mmHg por encima de la del ambiente, lo que se cita en medicina del buceo para la
  sobrepresión pulmonar); 300 bar son tres mil veces más. Por eso el aire se reduce por etapas.
- **El manorreductor baja la presión a unos 7 bar (presión media).** «reductor de presión… adecuado para acoplar botellas de
  300 bar, presión media entre 7 y 8 bar», con válvula de seguridad y silbato ([Interempresas, «Cuatro décadas en el
  desarrollo del ERA»](https://www.interempresas.net/Proteccion-laboral/253392-Cuatro-decadas-en-el-desarrollo-del-ERA.html));
  «el manorreductor… reduce la presión de la botella y proporciona aire respirable al pulmoautomático a través de una
  manguera de presión media» ([Dräger PAS Lite, instrucciones de uso](https://www.draeger.com/Content/Documents/Products/pas-lite-series-ifu-3358972-es.pdf);
  presión nominal de salida de la 1.ª etapa: 7,5 bar).
- **El silbato pita al entrar en la reserva.** «El silbato deberá actuar cuando la presión de la botella baje a 55 bar»
  (manual del PA 90, Universidad de Cantabria); 50–60 bar en la ficha del Dräger PSS 3000 (silbato de más de 90 dBA). Ver
  también `projects/bomberados_botella/FUENTES.md` (55 ± 5 bar según TEBMOR). La reserva es el aire para salir.
- **El manómetro**, al final de la manguera de alta, «muestra siempre la presión de la botella».
- **El pulmoautomático da el aire cuando inspiras** (válvula a demanda: suministra el aire según la respiración del usuario;
  hoy, con una ligera sobrepresión dentro de la máscara para que no entre humo).
- **El bodyguard pita si te quedas quieto.** Es la unidad electrónica / alarma personal (PASS) del equipo: «detector de
  inmovilidad» con «alertas visuales y acústicas» ([Dräger Bodyguard 1500](https://www.draeger.com/es_csa/Products/Bodyguard-1500));
  el Bodyguard 7000 además muestra la presión y el tiempo de aire que queda ([ficha](https://www.draeger.com/es_mx/Products/Bodyguard-7000)).
  En el temario se llama así, por el nombre del aparato.
- **La espaldera** (placa dorsal) sujeta la botella, el reductor y el arnés.

## La escena (todo es 3D generado)
- De día, en una calle (regla de Javi del 25 nov, «vida real»): un edificio en llamas (humo negro por las ventanas), la
  autobomba con otro bombero en la bomba y la manguera de ataque entrando por la puerta, el cordón con curiosos (uno graba
  con el móvil, otro señala, otra se tapa la boca) y una vecina asomada al balcón de enfrente.
- Bomberos y equipo genéricos (sin escudos ni marcas). El aire como luz azul que corre por dentro, la botella y los
  pulmones en «rayos X», el ⏩ hasta la reserva y el ⏪ son recursos visuales. Dentro del humo, un bombero en el suelo con el
  bodyguard pitando hasta que una linterna le encuentra.
- Voz: Danny (ElevenLabs, Eleven v3), grabada por Javi. Efectos: de la biblioteca de vídeos anteriores (silbato, fuego,
  ciudad, vapor…) y sintetizados en `compose.py` (la alarma del bodyguard y la respiración por el pulmoautomático).
