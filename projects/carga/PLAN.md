# Plan visual — «Carga sin cable» (palabra → forma)

Estilo nuevo (referencia: vídeo técnico con despieces tipo HUD/plano): **espacio 3D negro con flujo óptico** (polvo de
partículas y estelas finas que pasan junto a la cámara, siempre en movimiento), objetos realistas y oscuros, y encima
**explicaciones de ingeniería en blanco y grises**: líneas finas de guía, corchetes, cotas y etiquetas en mayúsculas
monoespaciadas. **Color suave solo para lo que importa**: cobre/ámbar = corriente, turquesa = campo magnético,
naranja tenue = calor, rojo apagado = alerta. Móvil genérico sin logos en burdeos metálico (como la imagen de
referencia), cargador redondo grafito mate. Encuadre vertical: el móvil y la base siempre enteros en el centro.
Motor: three.js como `industrial/` (60 fps, bloom suave, desenfoque de movimiento, grano), suelo espejo muy oscuro.

| Voz | Qué se ve |
|---|---|
| «Tu móvil habla con el cargador cada vez que lo apoyas» (0–1 s, hook 02) | Negro. Un móvil flota y se despieza en el aire en capas (cristal, bobina, batería, chasis) sobre el cargador; de la bobina del móvil baja a la del cargador una onda de luz con forma de onda de voz. Etiquetas «RX» / «TX». |
| «¿Y qué le dice?» | La onda se dobla en un bocadillo de líneas técnicas con «?». |
| «Te lo cuento al final» | Las capas se cierran en el móvil; «[ … ]» parpadea junto a la base. |
| «El truco: dentro del cargador hay una bobina de cobre» | La cámara atraviesa la carcasa del cargador (rayos X: solo aristas) y se enciende la espiral de cobre; etiqueta «BOBINA EMISORA · Cu». |
| «cambia de sentido más de 100.000 veces por segundo» | Flechas ámbar recorren la espiral y se invierten cada vez más rápido; contador «> 100 000 / s» y «87–205 kHz». |
| «Crea un campo magnético» | Bucles turquesa salen de la bobina y respiran. |
| «que atraviesa la bobina del móvil… y en ella aparece corriente» | El móvil baja, las líneas atraviesan su bobina (despiece) y en ella arrancan flechas ámbar que suben a la batería. |
| «Se llama inducción, y la descubrió Faraday» | Las dos bobinas se transforman en el anillo de hierro de Faraday con dos devanados, dibujado en líneas de plano antiguo; «INDUCCIÓN · M. FARADAY · 1831». |
| «Parece que carga por contacto. En realidad, las dos bobinas nunca se tocan» (re-hook 16) | Corte de perfil: entre las bobinas, cota de separación con las capas (carcasa, cristal); el hueco brilla: «NO SE TOCAN». |
| «Pero parte de la energía se pierde, en forma de calor» | Algunas flechas ámbar se desvían y se vuelven calor: mapa térmico naranja suave. |
| «En una prueba, cargar sin cable gastó casi un 50 % más que con cable» | Dos barras de cristal: CON CABLE 14,26 Wh · SIN CABLE 21,01 Wh «+47 %»; rótulo pequeño «PRUEBA 2020 · MISMO MÓVIL 0→100 %». |
| «Descentrado, aún más» | El móvil resbala a un lado, las líneas de campo fallan la bobina; tercera barra «+80 %». |
| «Por eso hay cargadores con imanes que lo centran» | Un anillo de imanes aparece en la base y el móvil hace «clic» al centro; bobinas alineadas. |
| «¿Y qué le dice? El cargador pregunta: “¿Hay alguien?”» (respuesta, ≈ 40 s) | La base lanza un ping: un anillo turquesa sube como un sonar; «PING». |
| «Y el móvil: “Sí, soy compatible”» | La bobina del móvil devuelve una ráfaga de pulsos; «ID · CONFIG ✓». |
| «varias veces por segundo, le pide más, menos o “así está bien”» | Paquetes «+», «−», «0» bajan del móvil a la base; un dial de potencia sube y baja con cada uno. |
| «con el mismo campo magnético, a golpecitos, como en morse» | Las líneas de campo laten en puntos y rayas; una tira de puntos y rayas cruza entre las bobinas. |
| «Y le cuenta cuánta energía recibe. Si no cuadra» | Dos barras: ENVÍA / RECIBE (sin cifras); no cuadran: hueco rojo «Δ». |
| «algo la está robando, una moneda, unas llaves» | Entre el móvil y la base aparece una moneda (genérica, sin cara real) que se pone al rojo; luego unas llaves. |
| «y el cargador corta» (mejor plano) | Todo el campo se apaga de golpe; la moneda se enfría; «FOD · STOP». |
| «La próxima vez que lo apoyes, ya sabes: están hablando» | El móvil vuelve a apoyarse y se despieza como al principio, la onda de voz vuelve (bucle). |
| «¿Tú cargas con cable o sin cable?» | Un cable a un lado y la base al otro; vuelta al primer fotograma. |
