// ---------------------------------------------------------------- 29N · capítulo de un partido: LA CÁMARA (un solo plano). Empieza pegada al reloj del marcador →
// se aleja: los relojes de posesión y los cuatro atriles → en cada ataque, el par de pantallas (atacante y atacado) con el marcador encima y se queda de frente (cara arriba, medidas sobre el
// atril, apellido debajo), con una deriva lenta en cada medida → abre a las cuatro (se enciende la siguiente) → el atril del siguiente partido, a la MISMA
// distancia y altura → sube otra vez al candado (bucle).
let CK = [], CUTS = [];
function buildCam() { const T = TL, K0 = [[SB.X, SB.Y - 0.02, SB.Z + 3.95], [SB.X, SB.Y - 0.04, SB.Z], 50], WIDE = [[0.0, 1.98, 8.6], [0.0, 1.98, 0.0], 50];
  const pair = (cx, d, y = 2.95) => [[cx, y, SB.Z + d], [cx, y + 0.14, SB.Z], 50];
  CK = [
    [0, ...K0],                                                                                              // el reloj del marcador, de cerca: corre
    [T.candidatos + 0.2, [0.0, 3.4, 3.4], [0.0, 3.32, -0.6], 50],                                           // se aleja: los relojes de posesión encima de las pantallas
    [T.E[1] + 0.35, ...WIDE],                                                                                // los cuatro atriles
    [T.millones + 0.2, ...pair(0.0, 6.2, 3.1)],                                                             // audiencia y cinco bloques: el marcador, más cerca
    [T.E[2], ...pair(0.0, 5.5, 3.25)],
    [T.E[3], [0.0, 2.35, 7.3], [0.0, 2.5, 0.0], 50],                                                         // cuatro ataques, uno de cada uno
    [T.usted + 0.2, [0.0, 2.3, 8.3], [0.0, 2.45, 0.0], 50], [T.E[4], [0.0, 2.32, 8.1], [0.0, 2.47, 0.0], 50],                               // 1 · Feijóo → Colau (los dos extremos: plano abierto)
    [T.buitre + 0.2, ...pair(0.0, 5.8)], [T.E[5], ...pair(0.05, 5.6)],                                         // 2 · Abascal → Sánchez (vecinos)
    [T.feijoo6 + 0.2, ...pair(-0.28, 6.4, 2.85)], [T.E[6], ...pair(-0.24, 6.2, 2.85)],                         // 3 · Sánchez → Feijóo y Abascal
    [T.abascal7 + 0.2, ...pair(0.24, 6.2)], [T.E[7], ...pair(0.22, 6.05)],                                      // 4 · Colau → Abascal
    [T.tutearon + 0.2, ...pair(0.0, 6.7, 2.85)], [T.E[8], ...pair(0.0, 6.5, 2.87)],                                // el dato: los dos arcos
    [T.encuestas + 0.2, ...pair(0.0, 6.0, 3.0)], [T.E[9], ...pair(0.0, 5.8, 3.02)],                           // ¿quién ganó?: el marcador y las cuatro pantallas
    [T.manda + 0.7, [0.0, 3.4, 3.4], [0.0, 3.32, -0.6], 50],
    [END, ...K0],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
// desenfoque de fondo solo cerca del candado (el principio y el final): en el resto no se nota y cuesta el 40 % del render
function dofAt(t, st) { const f = st.p.distanceTo(st.l), k = Math.max(1 - win(t, TL.candidatos - 0.4, 0.9), win(t, TL.manda + 1.0, 0.8)); return { focus: f, scale: k < 0.004 ? 0 : k * 0.03 * f }; }
