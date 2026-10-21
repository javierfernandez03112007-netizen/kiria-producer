# Formato «código + animación» (algoritmos explicados)

Plantilla de referencia: `projects/burbuja/` (ordenamiento burbuja). Para un algoritmo nuevo se copia esa carpeta y
se cambian el código, la simulación y las animaciones; el aspecto se mantiene.

## Pantalla dividida 9:16 (1080×1920)
- **Mitad superior: monitor 3D** (bisel oscuro con barniz, peana metálica) en el espacio. La pantalla es una textura
  de canvas estilo editor oscuro (`#0d1117`): pestaña con el nombre del archivo, números de línea, resaltado de
  sintaxis (palabras clave `#c586ff`, funciones `#ffd866`, números `#ff9e64`, texto `#e6edf3`), fuente Mono.
  - **Línea activa**: banda verde translúcida + barra verde a la izquierda + número de línea en verde (`#2ee68c`).
  - **Panel de variables** (i, j, n…) arriba a la derecha.
  - **Array debajo del código**: celdas redondeadas con índice `[k]`; las que se comparan en verde, las colocadas en
    azul (`#58a6ff`); las celdas se deslizan cuando hay intercambio.
  - **Línea de estado** abajo: qué decide el código ahora («v[5] = 10 > v[6] = 2 → intercambiar» en rojo, «≤ → seguir»
    en gris, la instrucción que se ejecuta en verde, «¡array ordenado!» al final).
  - El código se escribe rápido en la intro.
- **Mitad inferior: datos en 3D** (barras = valores). Altura proporcional al número, número blanco en la cara frontal.
  - Material **plástico plastificado**: `MeshPhysicalMaterial` azul claro `#46b4ff`, `clearcoat 1`,
    `clearcoatRoughness 0.05`, algo de `sheen`; seleccionado **verde vivo** `#19e37c` con emisivo y luz verde encima y
    anillo en el suelo; colocado con brillo azul.
  - Escenario: fondo espacial (estrellas y nebulosas tenues), **suelo reflectante oscuro** (`Reflector` + capa oscura
    al 88 %), sombras suaves (foco blanco), contraluces cian y violeta, `RoomEnvironment` para los reflejos.
  - Movimiento: comparar = saltito; intercambiar = una barra pasa por delante y otra por detrás en arco, aterrizan con
    aplastamiento y chispas; colocada = destello + anillo azul; intro = caen del cielo y rebotan; final = ola verde.
- Las dos vistas se dibujan en el mismo render target con `rtA.viewport/scissor` (no `renderer.setViewport`: el
  `Reflector` restaura el render target y pisaría la vista). Post: ACES + saturación 1.2 + viñeta suave.

## Sincronía
- `plan.py` simula el algoritmo y genera `timeline.json` (pasos con `kind`, `t0`, `t1`, índices y el array en ese
  momento). La escena 3D, la pantalla y el sonido leen la misma línea de tiempo: la barra, la celda del array y la
  línea de código se seleccionan a la vez.
- Ritmo: cada pasada más rápida que la anterior (×(1 + 0,42·i)); vídeo de ~35 s.

## Sonido (`engine/sfx.py`, sintetizado, sin música)
- `tick(valor)` al comparar (más agudo cuanto mayor es el número), `whoosh` al moverse, `clack` al colocarse/chocar,
  `ding` cuando una barra queda en su sitio (sube de tono en cada pasada), arpegio + acorde al terminar,
  `drone` espacial de fondo muy bajo. `sfx.write` satura suave y escribe WAV estéreo 48 kHz.

## Portada
Fotograma de un intercambio (dos barras verdes cruzándose) + título en la franja entre el monitor y las barras
(dentro del recorte 4:5 de la cuadrícula). Ver `projects/burbuja/portada.py`.
