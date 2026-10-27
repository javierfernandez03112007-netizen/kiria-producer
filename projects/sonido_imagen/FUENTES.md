# Fuentes — «Ingeniería de Sonido e Imagen» (el vídeo borrado)

- **«Más del noventa y nueve por ciento de este vídeo está borrado» / «sin comprimir, un minuto pesaría más de diez
  gigas»**: cálculo propio. Imagen sin comprimir 1080×1920 píxeles × 3 bytes (RGB de 8 bits): a 30 fps son 11,2 GB por
  minuto (a 60 fps, 22,4 GB). El máster que entregamos pesa ≈ 35–45 MB por minuto (H.264, crf 22) e Instagram lo
  recomprime aún más: se guarda menos del 0,5 % de los datos → «más del 99 % borrado» (compresión con pérdida).
  Comprobar el tamaño del máster final antes de publicar.
- **«Es una Teleco» / «sales con el título de ingeniero técnico de telecomunicación»**: los grados de Sonido e Imagen
  (UC3M, UPV, UMA, UA, UPM…) cumplen la Orden CIN/352/2009 (BOE 20-02-2009) y habilitan para la profesión regulada de
  Ingeniero Técnico de Telecomunicación, especialidad Sonido e Imagen. UC3M https://uc3m.es/grado/sonido-imagen ;
  UPV https://www.upv.es/titulaciones/GISTSI/index-es.html ; memoria UMA
  https://www.uma.es/media/files/MV_Ingenier%C3%ADa_Sonido_e_Imagen_26-02-2025.pdf
- **«Crees que es para poner música en conciertos»**: idea que se oye (se confunde con el técnico de sonido de FP); es
  una creencia, no un dato.
- **Asignaturas** (base, señales, acústica, electroacústica, vídeo y televisión): plan de la UPM (álgebra, cálculo,
  circuitos, electrónica, programación, electromagnetismo; luego audio y vídeo) https://www.upm.es/gsfs/SFS48262 ;
  UCAM (Acústica obligatoria de 2.º, Electroacústica en la mención de Sonido e Imagen)
  https://www.ucam.edu/sites/default/files/documentos/reconocimiento-creditos/fp-sonido-audiovisuales-espectaculos-grado-ingenieria-telecomunicacion.pdf ;
  UC3M: procesamiento, grabación, almacenamiento y reproducción de señales de audio, vídeo y televisión.
- **Salidas** (tele, radio, estudios de grabación, acústica, vídeo por internet): UPV (estudios de radio y televisión,
  grabación, doblaje, acondicionamiento acústico, difusión televisiva); folleto UPM (aislamiento y acondicionamiento
  acústico, electroacústica y megafonía, control de ruido); UC3M (servicios audiovisuales sobre redes de comunicaciones).
- **«El color se guarda con cuatro veces menos»**: submuestreo de crominancia 4:2:0 (el habitual en H.264 y en los
  vídeos de redes): el color va a la mitad de resolución en horizontal y en vertical (¼ de muestras), porque el ojo es
  más sensible al brillo que al color. Citrix https://docs.citrix.com/es-es/citrix-virtual-apps-desktops/graphics/thinwire/colorspace ;
  https://www.profesionalreview.com/2019/11/09/que-es-444-422-y-420-subsampling/
- **«Solo se guarda lo que se mueve»**: predicción entre fotogramas (H.264): se guardan vectores de movimiento y la
  diferencia con el fotograma anterior en vez de cada imagen entera. Simplificación divulgativa.
- **«Un ruido fuerte tapa a uno flojo parecido: el flojo se tira»**: enmascaramiento psicoacústico (MP3, ISO/IEC
  11172-3, modelo psicoacústico; AAC igual): el codificador descarta o cuantiza al mínimo lo que queda por debajo del
  umbral de enmascaramiento. IEEE https://technav.ieee.org/topic/psychoacoustic-models/
