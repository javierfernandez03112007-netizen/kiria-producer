// ---------------------------------------------------------------- 29N · LA CÁMARA: un solo plano. Empieza DENTRO de la urna (cae el sobre) → sale por el metacrilato y sube a la
// pantalla (350 diputados → presidente) → abre a los cuatro atriles (por la izquierda; al final volverá por la derecha: mismo trato) y la cita del jueves →
// plano medio de cada candidato, los mismos segundos y la misma distancia → abre para la nómina sobre los cuatro → la letra pequeña → «mañana, capítulo 1» →
// vuelve a meterse en la urna (bucle).
let CK = [], CUTS = [];
function buildCam() { const T = TL, UB = S.urn.position.y, UZ = SET.URN[2], P0 = [0.0, UB + 0.2, UZ + 0.17], L0 = [0.0, 1.75, 0.3];
  const mid = (i, dx) => [[lectX(i) + dx, 2.15, lectZ(i) + 4.5], [lectX(i), 2.1, lectZ(i) + 0.1], 44];
  CK = [
    [0, P0, L0, 70],                                                                                                                     // dentro de la urna: cae el sobre
    [T.E[1] + 0.25, [0.0, UB + 0.34, UZ - 0.6], [0.0, 2.4, -2.0], 60],                                                                    // sale por la pared de metacrilato
    [T.trescientos + 0.1, [0.0, 3.0, 8.0], [0.0, 3.55, -5.0], 50], [T.eligen2 + 0.3, [0.0, 3.1, 8.6], [0.0, 3.4, -5.0], 50],            // la pantalla: 350 → presidente
    [T.partidos + 0.1, [-2.6, 2.5, 8.2], [0.5, 2.1, 0.0], 50],                                                                           // abre por la izquierda: hay más atriles en penumbra
    [T.debaten + 0.2, [0.0, 2.7, 9.6], [0.0, 2.75, 0.0], 50],                                                                            // los cuatro y la cita del jueves
    [T.L[4] - 0.3, [-1.2, 2.4, 7.2], [-1.4, 2.3, 0.0], 48],
    [T.feijoo + 0.35, ...mid(0, 0.12)], [T.E[4] + 0.05, ...mid(0, -0.06)],                                                               // Feijóo (PP)
    [T.sanchez + 0.35, ...mid(1, 0.12)], [T.E[5] + 0.05, ...mid(1, -0.06)],                                                              // Sánchez (PSOE)
    [T.abascal + 0.35, ...mid(2, 0.12)], [T.E[6] + 0.05, ...mid(2, -0.06)],                                                              // Abascal (Vox)
    [T.colau + 0.35, ...mid(3, 0.12)], [T.E[7] + 0.05, ...mid(3, -0.06)],                                                                // Colau (Frente Amplio)
    [T.lleva + 0.2, [2.4, 2.9, 8.4], [0.0, 2.9, 0.8], 50],                                                                               // abre por la derecha: la nómina sobre los cuatro
    [T.si + 0.2, [0.0, 3.2, 7.2], [0.0, 3.15, 1.6], 46], [T.trabajo + 0.35, [0.0, 3.1, 7.6], [0.0, 3.05, 1.6], 46],
    [T.letra + 0.2, [0.25, 3.0, 5.4], [0.15, 2.9, 1.6], 40],                                                                             // la letra pequeña
    [T.capitulo, [0.0, 2.8, 9.4], [0.0, 2.9, 0.0], 50],                                                                                  // «mañana, capítulo 1»
    [T.manda + 0.5, [0.0, 2.2, UZ + 2.0], [0.0, 1.5, UZ - 1.0], 54],                                                                     // baja hacia la urna…
    [END - 0.7, [0.0, UB + 0.42, UZ + 0.4], [0.0, 1.5, 1.5], 64], [END, P0, L0, 70],                                                      // …y entra (bucle)
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: f < 1.2 ? 0.35 * f : 0.035 * f }; }
