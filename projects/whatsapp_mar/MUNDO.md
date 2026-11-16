# MUNDO · «Así funciona: el viaje del mensaje de tu madre» (contrato para las piezas)

Vídeo vertical 1080×1920, 57,6 s, **un solo plano sin cortes**: la cámara siempre se mueve y cambia de sitio **entrando** en los sitios
(se mete en el agua, por una ventana, en la antena, dentro de la fibra…). Guion y fuentes: `GUION.md`, `FUENTES.md`, `script.txt`.
Lo que pidió Javi (dueño del canal) para el estilo: planos medios/abiertos **donde se vea todo y sea fácil de distinguir**; 3D que parece real
pero se nota que es animación (referencia: `projects/microondas/ref/estilo/metro_*.png`: formas sencillas y limpias, luz cálida, bruma,
colores claros de leer, nada de ruido); rótulos de neón tipo «200 m» (esos los pongo yo en el HUD). Criticó un vídeo anterior por «la cámara
pegada a los objetos, no se ve nada, escenas que giran porque sí». **Cada pieza tiene que leerse a la primera en un móvil.**

## La idea
Todo es **una maqueta de museo**: una franja de océano Atlántico en corte (un acuario largo con cristal a los lados) apoyada sobre un mapa del
mundo de noche (cables de luz por el fondo del mar). En un extremo, **Brasil** (la playa al atardecer: el móvil del hijo en la toalla); en el
otro, **la península**: la costa de **Portugal** (la estación donde el cable sale del mar) y un pueblo de **España** de noche (la cocina de la
madre y la antena). **Tonga** es otra maqueta pequeña en el Pacífico. **La fibra por dentro** es un decorado aparte (escala micro).

## Medidas (están en `web/src/05_world.js`; úsalas, no las copies)
- Viñetas (playa, pueblo, cocina, Tonga, incidentes): **1 unidad = 1 m**, y arriba. El nivel del mar es **y = 0** en tu grupo.
- Ejes de la franja (y de las viñetas): **+X de Brasil hacia la península**, **+Z hacia la cara de cristal delantera** (desde donde suele mirar
  la cámara), ancho de la franja `SW = 40` (z ∈ [−20, 20]).
- Brasil: tierra en x ∈ [−40, 0] (la orilla en x = 0, el mar en x > 0). La península: tierra en x ∈ [0, 60] (orilla en x = 0, mar en x < 0).
- El fondo del mar en la franja: `seaDepth(x)` / `seabedY(x)` (x desde la orilla de Brasil; en Brasil: 2 m de hondo a 3 m de la orilla, 8 m a
  25 m; en Portugal, `seaDepth(SL − x)` igual de corto). El mar y el fondo de la franja los hago yo; tu viñeta empieza en la orilla.
- Bajo tu tierra hay 40 m de «maqueta» hasta el mapa (y = −40): las caras cortadas se hacen con `strataFace(xs, top, z, {bot: -40, band})`
  (capas de tierra y roca, igual en todas las piezas). Para caras en x usa `normalX: ±1` (entonces `z` es la x de la cara y `xs` son z).
- Cables: el nuestro (el del mensaje) va por z = `CABLE_Z` = 6; otro cable al lado por z = `CABLE2_Z` = −5 (el que rompe el ancla).
- Colores: `COL` (verde del mensaje `COL.msg`, luz de la fibra `COL.light` cian). Burbuja 3D del mensaje: `msgBubble()` (≈ 1 × 0,42 m).
- Luz y cielo: `moodSet('brasil' | 'iberia' | 'agua' | 'fibra' | 'tonga' | 'museo')` (en `11_env.js`). No pongas luces direccionales
  propias; luces de punto, como mucho 2–3 por pieza (mejor emisivos + el resplandor del motor, que hace «bloom» de lo que pase de 1,7).
- Nada de logos ni marcas (el chat es genérico: burbuja verde, icono genérico verde con un bocadillo blanco). Textos en español.

## Cómo se prueba
```bash
cd projects/whatsapp_mar/web && npm install            # una vez (three r170)
bash lab/lab.sh ../src/22_beach.js test_beach.js beach 0 1.5 3   # → projects/whatsapp_mar/out/lab_beach/sheet.jpg
```
`lab/test_x.js` define `async labBuild()` (construye) y `labAt(t)` (anima y devuelve la cámara `[px,py,pz, lx,ly,lz, fov, desenfoque?, enfoque?]`;
desenfoque 0 = nada, ~0,5–1 suave). Mira la hoja con la herramienta de leer imágenes y corrige hasta que se lea bien. Un fotograma tarda
1–4 s (SwiftShader, CPU): no hagas cientos de pruebas a la vez. `EXTRA="../src/05_otra.js"` añade otros archivos. Errores: `out/lab_x/log.txt`.

## Reglas para el código
- Un archivo `web/src/2N_nombre.js` con funciones y constantes **con prefijo propio** (todo es global y se concatena: `beaX`, `ibeX`, `fibX`,
  `tonX`, `incX`, `mapX`). Nada de `import`. Usa lo del motor (`00_head.js`, `01_common.js`, `10_parts.js`, `13_skin.js` tiene una mano realista).
- API: `buildX()` devuelve un `THREE.Group` en su marco local, con `userData.anchors` (puntos para rótulos y cámara), y `xAt(t, o)` anima con
  parámetros 0..1 que yo controlo desde la línea de tiempo (no uses los tiempos de la voz dentro).
- Rendimiento: < 300 000 triángulos por pieza, sombras solo de la luz principal, texturas generadas en canvas o CC0 de Poly Haven (1k).
- Al terminar: `git checkout -b wa-<nombre>` desde `claude/stoic-newton-ja94mt`, commit de tu `src/2N_*.js`, `lab/test_*.js` y una hoja
  pequeña en `web/lab/review/<nombre>.jpg`; push a `wa-<nombre>`; y avísame con `send_message` a la sesión `session_014gBm8QV3AiAojuFQBkMUAp`
  (qué hay, API, anclas, qué falta). No toques otros archivos. No publiques nada en redes.

## Los momentos (tiempos de la voz, para que sepas qué se ve y cuánto dura)
| s | voz | dónde | se ve |
|---|---|---|---|
| 0–1,6 | «"Hijo, ¿dónde estás?"…» | playa de Brasil | el móvil en la toalla, la notificación «Mamá: Hijo, ¿dónde estás?» (primer fotograma = último) |
| 1,6–3,2 | «Y tú estás en Brasil» | playa | la cámara sube: toalla, chanclas, coco, palmeras, el mar al atardecer |
| 3,3–5,7 | «Ese mensaje ha cruzado el fondo del mar» | mar de Brasil | vuela sobre las olas, se mete en el agua: el cable en el fondo, una luz corre por él |
| 5,8–10,5 | «Más de 99 de cada 100 datos… por cables» | sube, sale de la maqueta | la franja sobre el mapa; se encienden los cables del mundo; un satélite pequeño casi solo |
| 10,7–14,1 | «Y si uno se rompe, un país entero se puede apagar» | mapa, Mauritania | un cable se rompe (rojo) y el país se queda sin internet |
| 14,3–17,9 | «Al enviarlo, su móvil lo lanza en ondas hasta la antena» | pueblo de España, noche | entra por la ventana de la cocina: la madre envía; la burbuja sale en anillos de ondas hasta la antena |
| 18,2–21,3 | «Ahí entra en un cable de fibra y se convierte en luz» | antena → bajo la calle | baja por la torre, bajo tierra (se ve en el corte): la onda se vuelve un pulso de luz |
| 21,4–26,8 | «Luz que corre por un hilo de cristal fino como un pelo, a 200.000 km/s» | dentro de la fibra | túnel de luz; un pelo al lado, del mismo grosor; estelas |
| 26,9–32,9 | «En Portugal se hunde en el mar y cruza 6.000 km… en tres centésimas de segundo» | costa de Portugal → franja | sale por la estación, el cable baja al mar; la luz cruza hasta Brasil |
| 33–38,2 | «Hay más de 600 cables… se rompen entre 150 y 200» | mapa entero | todos los cables; chispas rojas donde se rompen |
| 38,3–42,9 | «Y no son los tiburones: tres de cada cuatro… un ancla o una red de pesca» | fondo junto a Brasil | un tiburón huele el cable y se va; un ancla lo engancha y lo parte; una red de arrastre |
| 43–49,9 | «En 2022, un volcán partió el único cable de Tonga… cinco semanas casi sin internet» | maqueta de Tonga | el volcán estalla bajo el mar, el cable salta en trozos, la isla se queda sin internet |
| 49,9–53,8 | «Así que contéstale: su mensaje ha cruzado un océano para encontrarte» | vuelta a Brasil | la burbuja sale del mar y sube por la playa hasta el móvil |
| 53,9–57,6 | «¿Satélite o cable? Mándaselo a tu madre» | el móvil | la cámara baja al móvil: igual que el primer fotograma |
