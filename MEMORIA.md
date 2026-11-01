# Memoria del proyecto (léela al empezar cualquier sesión)

Lo que se ha decidido y aprendido en las conversaciones con Javi (dueño del canal). Las sesiones nuevas no recuerdan el chat:
esto, `CLAUDE.md` y los `.md` de `engine/` son la memoria. Actualízala cuando cambie algo importante.

## Cómo trabajamos
- Respuestas en español, claras y con estimaciones de tiempo honestas.
- Cada cambio se hace commit y push a `master` (sin PR salvo que lo pida), con las líneas de atribución que indique el sistema y sin
  identificadores de modelo.
- Javi manda el **audio de ElevenLabs (voz Danny)**: yo le doy el guion y él graba la voz (decidido el 1 nov 2026; la voz
  por API solo si lo pide). La API de ElevenLabs se usa para los **efectos de sonido**, cada uno pegado a su imagen
  (acaba cuando acaba en pantalla lo que lo produce).
- Guion: lo escribo yo siguiendo `engine/REGLAS.md`, `engine/GUION.md` y `engine/HOOKS.md`; se lo doy **todo junto en un solo bloque**
  para pegarlo en ElevenLabs. Datos siempre reales y con fuente en `FUENTES.md` (lo dudoso, «CONFIRMAR»).
- Entrega de cada vídeo: `out/<nombre>.mp4` (1080x1920, 60 fps, 20–60 MB, ≈ −15/−16 LUFS), `out/portada.jpg` (9:16), `out/miniatura.jpg`
  (4:5) y `DESCRIPCION.txt` (versión larga + corta para TikTok + notas de entrega).
- Nada de aviones en vídeos que no sean de aeronáutica; nada cortado por los lados; sin logos reales; sin la marca kiria.ai en los vídeos.

## Render en varias máquinas (cuando Javi lo aprueba en ese vídeo)
- Plantilla completa: `projects/derecho/` (escena en `web/src/*.js` → `web/build.sh` → `web/scene.js`; `render_local.sh`, `fetch_compose.sh`,
  `compose_der.py`, `portada.py`).
- Esta máquina hace un trozo con `WK=3 ./render_local.sh A B`; las de ayuda se crean con `create_session` (modelo Sonnet, etiqueta
  `kiria-render-<proj>`), cada una renderiza un rango, lo codifica (`chunks/chunk_A_B.mp4`, crf 14) y lo sube a la rama `render-<proj>-x`,
  y avisa con `send_message`. `fetch_compose.sh` recoge los trozos y compone solo al tener todos los fotogramas.
- Rendimiento: ≈ 0,6 fotogramas/s por máquina de 4 núcleos (3 procesos). Un vídeo de 72 s (4.352 fotogramas) con 6 máquinas: ≈ 35–45 min.
- Pendiente de permiso: borrar ramas `render-*` antiguas y archivar las sesiones de ayuda (no hacerlo sin que lo diga).

## Resultados del canal (datos que ha dado Javi)
| Vídeo | Datos |
|---|---|
| Ingeniería Industrial | 460.000 visitas, 22.000 me gusta, muchos seguidores |
| Ingeniería Informática | 165.000 visitas y 9.400 me gusta (en su momento) |
| Derecho por dentro | 378.000 visitas en 15 h, 25.100 me gusta, 78 comentarios, 811 guardados, 4.285 envíos, 820 seguidores (ver `projects/derecho/METRICAS.md`; faltan los datos de 24 h y 48 h) |
| Total canal | ≈ 800.000 visitas entre todos; vídeos con 14.000, 10.000 y 6.000 me gusta |

Lo que funciona: carreras «por dentro» con un giro verdadero («acabas la carrera… y todavía no eres…», «menos de 3 de cada 100»),
datos oficiales, respuesta al final y pregunta de bando al cierre («¿abogado o juez?»). Los duelos generan comentarios.

## Próximas ideas
1. **Psicología**: «Estudias cuatro años de Psicología… y la ley no te deja tratar ni a un solo paciente» → Máster en Psicología General
   Sanitaria o PIR. (Comprobar Ley 33/2011, créditos del máster, plazas PIR y nota de corte antes del guion.)
2. Medicina (6 años + MIR), duelos (ADE vs Economía, Matemáticas vs Física, Arquitectura vs Edificación, Informática vs Ciencia de Datos),
   «la nota de corte más alta no es Medicina», serie numerada «Carreras por dentro».

## Herramientas y accesos
- **ElevenLabs**: la clave está como secreto del entorno «Predeterminado»; el entorno añade el encabezado `xi-api-key` a las peticiones a
  `api.elevenlabs.io` (no hay que ponerla en el código). Uso: voz Danny para guiones y efectos de sonido realistas.
  Herramienta: `bomberados/plantillas/pregunta/elevenlabs.py` (voz con tiempos exactos por palabra y efectos). Voz Danny
  («Relatable, Expressive and Warm», español peninsular): `wnKyx1zkUEUnfURKiuaP`. La cuenta no es Creator (mp3 a 128 kbps).
  El 1-11-2026 el proxy respondía «upstream auth failed» (no leía la clave del entorno) y se trabajó con una clave que Javi
  pegó en el chat solo para esa sesión (no está guardada en ningún sitio): **pedirle que la regenere y la vuelva a guardar en
  el entorno**. Comprobar al empezar: `curl -s -D - -o /dev/null https://api.elevenlabs.io/v1/voices`.
- Dominios pedidos para el entorno: `www.boe.es`, `boe.es`, `www.ciencia.gob.es` (verificar datos), `polyhaven.com`, `api.polyhaven.com`,
  `dl.polyhaven.org` (texturas, modelos y luces HDRI CC0 para más realismo). Comprobar en cada sesión nueva que responden.
- Reconocedor de voz: Parakeet TDT v3 (sherpa-onnx), ver `projects/derecho/asr_parakeet.py` (el modelo se descarga aparte).
- Plan futuro: tarea programada nocturna (buscar noticias del nicho, analizar competencia, guion, voz, vídeo con plantillas fijas) y
  publicación vía Metricool **solo tras revisión de Javi** al principio. Conectores sugeridos: Metricool y vidIQ (claude.ai → conectores).

## Negocio (vender vídeos a empresas)
- Web del estudio: `web_estudio/` (ver su `README.md`; copia fija en la rama `web-estudio-v1`). Vista previa privada:
  https://claude.ai/artifact/31hjcpiCg4H1Wdvx2Qb8vy. Marcas: Élite Bomberos, Bomberados, Fersalv, Beauty Salon Merche.
- Publicarla: Cloudflare Pages o Netlify (gratis) + dominio propio (≈ 10–15 €/año); contacto por WhatsApp con mensaje prellenado.
- Falta de Javi: nombre comercial y dominio, qué se hizo para Fersalv y Beauty Salon Merche, logos y permisos, contacto (correo, WhatsApp,
  Instagram), plazos, precios, opiniones y datos legales (titular, NIF, dirección).
- Legal en España (orientativo, confirmar con gestor): aviso legal (LSSI), privacidad (RGPD) y cookies; para cobrar, alta de autónomo
  (modelo 036 en Hacienda, epígrafe 961.1/961.2/844 según el caso, RETA con tarifa plana ≈ 88 €/mes el primer año en 2026), IVA 21 %
  (303 trimestral, 390 anual), IRPF (130 trimestral si es actividad empresarial), VeriFactu obligatorio para autónomos desde el 1-7-2027.
  ElevenLabs necesita plan de pago para uso comercial.

## Bomberados (Élite Bomberos)
Todo lo de la marca, el estado de cada vídeo, Notion y la siguiente tarea (Pregunta del día #4 PAS): **`bomberados/MEMORIA_BOMBERADOS.md`**.

## Notion (gestión)
- Página «kiria.ai · Centro de producción» (privada): https://app.notion.com/p/40bd785b2d75818493f1f70b6c3a610b
  - Base «Calendario de contenido» (collection://c194bf8b-4e4a-46b8-b6ad-c1953f4d0f2b): cada vídeo con estado, formato, gancho,
    fecha y métricas. Al terminar un vídeo o recibir datos, actualizarla.
  - Base «Clientes y marcas» (collection://2bea0963-17fa-474e-b9e2-42839b86e428): empresas, qué se hizo, permisos, logo, precio.

## Canal de YouTube
Kit hecho en `projects/canal/`: `perfil.png`, `banner.jpg`, `DESCRIPCION_CANAL.txt` («Las carreras, por dentro»).
