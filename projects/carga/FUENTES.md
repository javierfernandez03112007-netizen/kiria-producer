# Fuentes — «Carga sin cable: tu móvil habla con el cargador»

Todo se refiere a la carga inalámbrica estándar Qi (la de los cargadores «por contacto» en los que se apoya el móvil).

- **«Su corriente cambia de sentido más de 100.000 veces por segundo»**: los cargadores Qi (perfiles BPP/EPP) trabajan
  entre 87 y 205 kHz, y el perfil magnético de Qi2 (MPP) a 360 kHz:
  Granite River Labs https://www.graniteriverlabs.com/en-us/technical-blog/qi2-wireless-charging-standards-evolution ;
  Wikipedia https://en.wikipedia.org/wiki/Qi_(standard) ; ib-lenhardt https://ib-lenhardt.com/kb/qi-wireless-charging
  Cálculo propio: en cada ciclo la corriente cambia de sentido dos veces → a 87 kHz, 2 × 87.000 = 174.000 veces por
  segundo como mínimo (más de 100.000 en cualquier cargador Qi). En pantalla: «87–205 kHz».
- **Inducción electromagnética, Faraday (en pantalla «1831»)**: Michael Faraday la descubrió en 1831 (29-08-1831,
  Royal Institution; Joseph Henry llegó a lo mismo por su cuenta en 1832):
  Computer History Museum https://www.computerhistory.org/storageengine/faraday-describes-electro-magnetic-induction ;
  https://www.philipharris.co.uk/blogs/news/1831-electromagnetic-induction-is-discovered
- **«Las dos bobinas nunca se tocan»**: entre la bobina emisora y la receptora están la carcasa del cargador y la
  trasera del móvil; el acoplamiento solo es fuerte a pocos milímetros (en el prototipo de arXiv 2408.09852, a unos
  4 mm la modulación ya se puede descodificar): https://arxiv.org/pdf/2408.09852
- **«Cargar sin cable gastó casi un 50 % más que con cable» / «Descentrado, aún más»**: prueba de OneZero (agosto de
  2020) con un mismo móvil (Pixel 4) de 0 a 100 % y un medidor en el enchufe: con cable 14,26 Wh; sin cable, de media,
  21,01 Wh (+47 %); con la base del propio fabricante 19,8 Wh (+39 %); con una base barata y el móvil mal colocado,
  25,62 Wh (+80 %). Citado en The Next Web https://thenextweb.com/news/wireless-charging-sucks ;
  iPhone in Canada https://www.iphoneincanada.ca/news/wireless-efficiency/ ;
  HotHardware https://amp.hothardware.com/news/wireless-charging-power-grid-impact-inefficient ;
  Boing Boing https://boingboing.net/2020/08/11/report-wireless-phone-chargin.html
  Ojo: es una sola prueba con un modelo de móvil (por eso en la voz «en una prueba»). El 47 % es energía de más, no
  «eficiencia del 47 %» (la eficiencia sale ≈ 14,26 / 21,01 ≈ 68 %, cálculo propio). En pantalla, sin marcas.
- **«La energía perdida se convierte en calor»**: lo que no llega a la batería se disipa en bobinas y electrónica
  (por eso el móvil y la base se calientan); misma prueba y física básica.
- **«Hay cargadores con imanes que lo centran»**: Qi2 (Wireless Power Consortium, presentado en el CES el 3-01-2023)
  añade el Magnetic Power Profile, un anillo de imanes que alinea las bobinas, basado en una aportación de Apple:
  TechCrunch https://techcrunch.com/2023/01/04/wireless-power-consortium-is-working-with-apple-to-bring-magsafe-like-capabilities-to-android ;
  audioXpress https://audioxpress.com/news/wireless-power-consortium-introduces-new-qi2-standard-for-wireless-charging-and-universal-compatibility ;
  Macworld https://www.macworld.com/article/1445626/magsafe-iphone-qi2-standard-magnetic-power-profile-wpc.html
  (sin nombres de marca en el vídeo).
- **La conversación (respuesta)**:
  - «¿Hay alguien?» = el cargador lanza un *ping* (enciende un momento la bobina) y espera; «Sí, soy compatible» = el
    receptor contesta con un paquete de intensidad de señal y luego se identifica (fabricante, dispositivo) y dice su
    configuración (potencia). Si nada contesta, no empieza a cargar.
  - «Varias veces por segundo le pide más, menos o así está bien» = paquetes de *control error* (positivo: sube;
    negativo: baja; cero: así), al menos cada 250 ms (≥ 4 por segundo); si dejan de llegar, el cargador para.
  - «Con el mismo campo magnético, a golpecitos» = modulación de carga: el móvil conecta y desconecta una pequeña carga
    y el cargador ve los cambios en su propia corriente (codificación bi-fase diferencial). «Como en morse» es una
    comparación, no es código morse.
  - «Le cuenta cuánta energía recibe» = paquetes de potencia recibida.
  Fuentes: arXiv 2408.09852 (secuencia ping → intensidad de señal → ID → configuración → control error → potencia
  recibida) https://arxiv.org/pdf/2408.09852 ; NXP AN4701 (bi-fase diferencial) https://www.nxp.com/docs/en/application-note/AN4701.pdf ;
  TI bq51003, modulador de comunicación https://www.ti.com/document-viewer/BQ51003/datasheet/communication-modulator-lit69829021
- **«Si no cuadra, algo la está robando… y el cargador corta»**: detección de objetos extraños (FOD) por pérdida de
  potencia: el cargador compara lo que envía con lo que el móvil dice recibir; si la diferencia supera un umbral (un
  metal como una moneda o unas llaves se calienta con las corrientes inducidas), deja de transmitir. Qi recomienda
  combinarla con el método del factor Q: patentes US12413104 https://patents.google.com/patent/US12413104 y
  US11005304 https://patents.google.com/patent/US11005304 (no se pudo abrir la especificación de WPC; lo describen
  patentes y notas de aplicación coincidentes). Puede tardar unos segundos en cortar.
