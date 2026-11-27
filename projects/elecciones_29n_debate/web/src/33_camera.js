// ---------------------------------------------------------------- 29N · capítulo de un partido: LA CÁMARA (un solo plano). Empieza pegada al reloj del marcador →
// se aleja: los relojes de posesión y los cuatro atriles → en cada ataque, el par de pantallas (atacante y atacado) con el marcador encima y se queda de frente (cara arriba, medidas sobre el
// atril, apellido debajo), con una deriva lenta en cada medida → abre a las cuatro (se enciende la siguiente) → el atril del siguiente partido, a la MISMA
// distancia y altura → sube otra vez al candado (bucle).
let CK = [], CUTS = [];
function buildCam() { const T = TL, K0 = [[SB.X, SB.Y - 0.02, SB.Z + 3.95], [SB.X, SB.Y - 0.04, SB.Z], 50], WIDE = [[0.0, 1.98, 8.6], [0.0, 1.98, 0.0], 50];
  const pair = (cx, d, y = 2.95) => [[cx, y, SB.Z + d], [cx, y + 0.14, SB.Z], 50];
  CK = [
    [0, ...K0],                                                                                              // el reloj del marcador, de cerca: corre
    [T.candidatos + 0.2, [0.0, 3.4, 3.4], [0.0, 3.32, -0.6], 50],                                            // se aleja: los relojes de posesión encima de las pantallas
    [T.E[1] + 0.35, ...WIDE],                                                                                // los cuatro atriles
    [T.millones + 0.2, ...pair(0.0, 6.2, 3.1)], [T.E[2], ...pair(0.0, 5.5, 3.25)],                            // audiencia y cinco bloques: el marcador, más cerca
    [T.colau3 + 0.4, ...pair(0.3, 7.0, 2.9)], [T.sanchez3 - 0.1, ...pair(0.22, 7.2, 2.9)], [T.E[3], [0.0, 2.35, 8.1], [0.0, 2.5, 0.0], 50],   // el arranque: Colau; luego los cuatro
    [T.E[4], ...pair(0.0, 6.0, 3.0)],                                                                         // ocho ataques, dos de cada uno
    [T.pizza + 0.2, ...pair(-0.4, 6.9, 2.9)], [T.E[5], ...pair(-0.36, 6.7, 2.9)],                              // 1 · Feijóo → Sánchez (la pizza)
    [T.gestion + 0.2, [0.0, 2.3, 8.3], [0.0, 2.45, 0.0], 50], [T.E[6], [0.0, 2.32, 8.15], [0.0, 2.47, 0.0], 50],     // 2 · Colau → Feijóo (los extremos: plano abierto)
    [T.usted + 0.2, [0.0, 2.34, 8.0], [0.0, 2.49, 0.0], 50], [T.E[7], [0.0, 2.36, 7.85], [0.0, 2.5, 0.0], 50],         // 3 · Feijóo → Colau
    [T.buitre + 0.2, ...pair(0.0, 5.8)], [T.banda, ...pair(0.04, 5.6)], [T.E[8], ...pair(0.0, 5.5)],          // 4 y 5 · Abascal → Sánchez
    [T.gobernar + 0.2, ...pair(-0.3, 6.6, 2.85)], [T.E[9], ...pair(-0.26, 6.45, 2.85)],                        // 6 · Sánchez → PP y Vox
    [T.feijoo10 + 0.2, ...pair(-0.24, 6.3, 2.85)], [T.E[10], ...pair(-0.2, 6.15, 2.85)],                       // 7 · Sánchez → Feijóo y Abascal
    [T.abascal11 + 0.2, ...pair(0.4, 6.9, 2.9)], [T.E[11], ...pair(0.36, 6.75, 2.9)],                          // 8 · Colau → Abascal
    [T.tutearon + 0.2, ...pair(0.0, 6.7, 2.85)], [T.E[12], ...pair(0.0, 6.5, 2.87)],                           // el dato: los dos arcos
    [T.encuestas + 0.2, ...pair(0.0, 6.0, 3.0)], [T.E[13], ...pair(0.0, 5.8, 3.02)],                           // ¿quién ganó?: el marcador y las cuatro pantallas
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
