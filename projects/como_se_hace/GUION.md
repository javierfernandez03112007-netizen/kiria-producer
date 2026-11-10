# «Cómo se hace un vídeo de casi 900.000 visualizaciones» · viernes 13, 10:00 (PUENTE)

Derecho por dentro, por dentro: del dato a la escena 3D. Vende el servicio sin anunciarlo (el enlace va en el comentario fijado).
Guion para la voz de Javi (ElevenLabs, como siempre): **175 palabras ≈ 58 s** (texto exacto en `script.txt`).

## Guion

> Este vídeo lo han visto casi novecientas mil veces… y no hay ni una sola cámara.
> ¿Cómo se hace? Te lo enseño por dentro… y al final, lo que más trabajo lleva.
> Primero, un dato que escuece: menos de tres de cada cien estudiantes de Derecho llegarán a jueces o fiscales.
> Con ese dato, el guion: ciento setenta palabras, lo que cabe en un minuto.
> Luego, la voz, con inteligencia artificial.
> Y lo bueno: cada frase se convierte en un objeto en 3D. Cien figuritas. Un mazo gigante. Una toga.
> La cámara tampoco existe: es código que decide adónde mirar.
> Pero esto todavía no es un vídeo.
> Hay que dibujar cada fotograma, uno a uno: más de cuatro mil. Varios ordenadores a la vez.
> Después, los sonidos: uno por cada cosa que pasa. Sin música.
> ¿Y lo que más trabajo lleva? El primer segundo: la imagen que decide si te quedas… o pasas.
> En Derecho, tres de cada cuatro se quedaron más de tres segundos.
> ¿Qué carrera hacemos por dentro la próxima vez? Te leo.

- **Gancho**: plantilla 08 («esto no lo ha hecho nadie») + dato; no repite la fórmula del avión (creencia rota).
- **Pregunta** antes del segundo 4 («¿Cómo se hace?») y **respuesta** al final («el primer segundo»), con re-gancho a mitad
  («Pero esto todavía no es un vídeo»).
- **Cierre** con pregunta para comentar (como «¿abogado o juez?»), sin venta en el vídeo.

## Escena (cada frase, su objeto)

Un solo escenario: la escena de Derecho «desmontada», como una maqueta en corte, y la cámara siempre en movimiento.

| Frase | Lo que se ve |
|---|---|
| casi 900.000 veces… ni una sola cámara | El primer fotograma de Derecho (el mazo sobre las 100 figuritas) en un móvil; el contador sube a 887.817; una cámara de cine cae y se deshace en píxeles |
| ¿Cómo se hace? Te lo enseño por dentro | La cámara atraviesa la pantalla del móvil y entra en la escena 3D, que se ve en malla (sin texturas) |
| menos de 3 de cada 100… jueces o fiscales | Las 100 figuritas en malla; 97 se apagan, 3 quedan doradas |
| guion: 170 palabras, un minuto | Las palabras del guion caen como fichas y llenan una barra de 60 s |
| la voz, con IA | Una onda de voz recorre la barra y enciende cada palabra |
| cada frase, un objeto en 3D: figuritas, mazo, toga | Las palabras se convierten en sus objetos: «figuritas» → figuritas; «mazo» → mazo; «toga» → toga (de malla a acabado) |
| la cámara es código que decide adónde mirar | Aparece la trayectoria de la cámara como una línea con puntos (claves) y una cámara virtual recorriéndola |
| esto todavía no es un vídeo | La escena se congela en gris |
| cada fotograma, uno a uno: más de 4.000; varios ordenadores | Una tira de fotogramas que se va llenando (contador hasta 4.352) repartida entre varias pantallas |
| los sonidos: uno por cada cosa; sin música | Marcas en la línea de tiempo en cada suceso (golpe del mazo, caída…) y una nota musical tachada |
| lo que más trabajo lleva: el primer segundo | Vuelve el primer fotograma, enorme; el dedo que desliza se para |
| tres de cada cuatro, más de 3 segundos | Medidor de retención: 75 % pasa de los 3 s |
| ¿Qué carrera hacemos por dentro la próxima vez? | Vuelta al primer fotograma (bucle) |

## Datos y fuentes

| Dato | Fuente |
|---|---|
| Casi 900.000 visualizaciones | Derecho por dentro: 887.817 visualizaciones (panel de Instagram, `MEMORIA.md`). Decir «visualizaciones/veces», no «personas». |
| Menos de 3 de cada 100 llegarán a jueces o fiscales | Guion y fuentes del vídeo de Derecho (`projects/derecho/FUENTES.md`). |
| ≈ 170 palabras por minuto de vídeo | `projects/canal/RECETA.md` (Javi habla a ≈ 3 palabras por segundo). |
| Más de 4.000 fotogramas | `projects/derecho/out/derecho.mp4`: 4.352 fotogramas a 60 fps. |
| Varios ordenadores a la vez | Render repartido en varias máquinas (`MEMORIA.md`, «Render en varias máquinas»). |
| Un sonido por suceso, sin música | `projects/canal/RECETA.md` (regla de Javi). |
| 3 de cada 4 pasaron de los 3 s | Derecho: 75,6 % pasa de 3 s (`projects/canal/RECETA.md`, datos de Instagram). |

**Comentario fijado (propuesto):** «🎬 Así hacemos los vídeos en kiria. ¿Quieres uno así para tu negocio? → kiriaai.com (enlace en la bio)».
