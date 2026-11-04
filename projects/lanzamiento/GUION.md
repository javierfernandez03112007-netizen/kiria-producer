# Lanzamiento · vídeo 1: «Ni una sola cámara» (33 s) — versión larga, SIN PRECIOS

Idea de Javi (4-11-2026): un móvil con nuestros vídeos y los resultados de la cuenta; quien quiera vídeos así para su cuenta, sus
productos o su negocio, que comente KIRIA. **Decisión de Javi (4-11-2026): ningún precio ni descuento en los vídeos, solo
resultados (visitas, seguidores…) y «comenta KIRIA».**

Versiones:
- v2 (23 s, 7 frases): `out/lanzamiento_v2_23s.mp4` — a Javi le encantó («espectacular, pero espectacular»).
- **v3 (33 s, 9 frases)**: Javi pidió hacerlo «un poco más largo», cerrar con «si quieres vídeos así comenta KIRIA y te paso el
  enlace por privado» y añadir «puedes probar tu objeto en 3D para ver cómo se vería en redes o en una página web».

Voz: **la toma de Javi de la versión larga** (Danny en ElevenLabs, eleven_v4, estabilidad 0,50, similitud 0,75; la mandó el
4-11-2026 a las 11:41) en `assets/voz_original.mp3`, reconocida con `asr_parakeet.py` y ajustada en `ajustar_voz.py` (pausas entre
frases de 0,2–0,45 s y atempo 1,04 → 30,6 s de voz). Antes de que llegara, las frases nuevas se habían generado con su voz y ajustes
(`tts_extra.py` + `voz_con_extra.py`); ya no se usan.

Reglas del canal (`engine/REGLAS.md`): primer segundo rarísimo (los objetos de nuestros vídeos salen disparados del móvil), cada frase
se ve al oírla y los objetos se transforman unos en otros. Bucle: el final enlaza con el principio.

## Voz (lo que dice Danny)
```text
3,2 millones de visualizaciones en 7 días… y ni una sola cámara.
Más de 2.500 seguidores nuevos en 6 días. ¿Cómo?
Un guion que engancha desde el primer segundo.
Una voz.
Cada objeto, construido en 3D… que se mueve justo cuando lo oyes.
Subtítulos palabra a palabra.
Y el sonido, efecto a efecto.
Y además, puedes probar tu objeto en 3D… y ver cómo se vería en redes… o en una página web.
Si quieres vídeos así, comenta KIRIA y te paso el enlace por privado.
```

## Qué se ve (palabra → forma)
| s | Voz | Qué se ve |
|---|---|---|
| 0–4,8 | «3,2 millones de visualizaciones en 7 días… y ni una sola cámara.» | Primer fotograma: un móvil del que salen disparados, entre cristales, el mazo, la llave, el martillo de reflejos, las gafas, el birrete y una figurita dorada; vuelan y forman **3,2 M**; miles de ▶ suben de la pantalla a las cifras; 7 fichas L M X J V S D; cae una cámara de cine y se queda en aristas. |
| 4,8–8,7 | «Más de 2.500 seguidores nuevos en 6 días. ¿Cómo?» | Las aristas de la cámara se meten en la pantalla y salen los **resultados reales**, de cerca: 3,2 M visualizaciones en 7 días, **+2.500 seguidores nuevos en 6 días** (resaltado, con su gráfica por día), +150.000 me gusta y +37.000 envíos en 2 semanas. En «¿Cómo?» sale de la pantalla un **¿?** en 3D. |
| 9,1–11,5 | «Un guion que engancha desde el primer segundo.» | Del móvil sale un papel: el **GUION**, que se escribe solo; se subraya la primera línea y sale **0:01**. |
| 11,7–12,2 | «Una voz.» | Los renglones se levantan y son una **onda de voz** que se mueve con la voz. |
| 12,4–16,4 | «Cada objeto, construido en 3D… que se mueve justo cuando lo oyes.» | La onda se recoge y se dibuja un **mazo** en líneas; se vuelve sólido en «3D»; se levanta y **golpea el taco justo en «oyes»**. |
| 16,6–18,3 | «Subtítulos palabra a palabra.» | Las palabras caen a su sitio como un subtítulo: SUBTÍTULOS / PALABRA A PALABRA. |
| 18,6–20,5 | «Y el sonido, efecto a efecto.» | Cada palabra suena y suelta un anillo. |
| 20,8–26,3 | «Y además, puedes probar tu objeto en 3D… y ver cómo se vería en redes… o en una página web.» | Todo se mete en el móvil. Entra la foto de **TU OBJETO** (un tarro de mermelada dibujado, de ejemplo) y en «3D» se vuelve un **tarro en 3D** («TU MARCA»); en «redes» se pone delante de un vídeo de redes («NUEVO»), girando como en un expositor, y le cae un **me gusta**; en «página web» el móvil se estira y es una **web** («Tu producto en 3D · Gíralo con el dedo») con el tarro en 3D. |
| 26,7–30,3 | «Si quieres vídeos así, comenta KIRIA y te paso el enlace por privado.» | El tarro entra en el móvil y siguen nuestros vídeos; se abren los comentarios, un bocadillo escribe **KIRIA** y se publica; un **avión de papel** lleva el enlace a los mensajes: «¡Aquí tienes el enlace!». |
| 28,8–33 | — | «COMENTA «KIRIA»» y «Y TE PASO EL ENLACE POR PRIVADO»; los objetos vuelven a salir del móvil (bucle). |

## Antes de publicar
- [ ] Captura del panel de Instagram con los **3,2 millones de visualizaciones en 7 días** y sus fechas (Metricool da 1,93 M del
      26 oct al 1 nov para las visualizaciones de la cuenta: el panel de Instagram cuenta distinto). Si no se confirma, hay que cambiar
      la primera frase de la voz.
- [ ] Ninguno de los vídeos que salen en el móvil lleva imágenes grabadas con cámara.
- [ ] La respuesta automática a «KIRIA» con el enlace (canal de WhatsApp) lista: el vídeo promete «te paso el enlace por privado».

## Descripción (sin precios)
```text
3,2 millones de visualizaciones en 7 días con vídeos en 3D hechos con IA, sin una sola cámara.
¿Quieres vídeos así para tu cuenta, tus productos o tu negocio? Comenta KIRIA y te paso el enlace por privado.
```
Comentario fijado: «Comenta KIRIA y te paso el enlace por privado 👇»
