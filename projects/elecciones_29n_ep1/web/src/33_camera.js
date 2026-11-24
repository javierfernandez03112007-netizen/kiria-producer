// ---------------------------------------------------------------- 29N · LA CÁMARA: un solo plano, casi siempre de frente (las fotos están en pantallas). Empieza DENTRO de la urna
// (cae el sobre) → sale por el metacrilato y sube a la pantalla grande (350 diputados → presidente) → abre a los cuatro atriles (hay más, en penumbra) y la cita del jueves →
// se planta delante de cada candidato, a la MISMA distancia y altura y los mismos segundos (cara arriba, medidas sobre el atril, apellido debajo) → abre para la nómina
// delante de los cuatro → la letra pequeña → «mañana, capítulo 1» → vuelve a meterse en la urna (bucle).
let CK = [], CUTS = [];
function buildCam() { const T = TL, UB = S.urn.position.y, UZ = SET.URN[2], P0 = [0.0, UB + 0.2, UZ + 0.17], L0 = [0.0, 1.9, 0.0], WIDE = [[0.0, 1.98, 8.6], [0.0, 1.98, 0.0], 50];
  // delante del atril i: dx = deriva lateral (se nota el relieve de la foto), k = acercamiento
  const mid = (i, dx, k) => { const ry = lectRy(i), nx = Math.sin(ry), nz = Math.cos(ry), cx = lectX(i), cz = lectZ(i) - 0.2, d = 3.2 - 0.2 * k, y = S.FL + 1.6;
    return [[cx + nx * d + nz * dx, y, cz + nz * d - nx * dx], [cx + nz * dx * 0.25, y, cz - nx * dx * 0.25], 44]; };
  CK = [
    [0, P0, L0, 58],                                                                                                                     // dentro de la urna: cae el sobre
    [T.E[1] + 0.25, [0.0, UB + 0.34, UZ - 0.6], [0.0, 2.7, -2.0], 60],                                                                    // sale por la pared de metacrilato
    [T.trescientos + 0.1, [0.0, 2.9, 6.6], [0.0, 4.0, -5.0], 50], [T.eligen2 + 0.3, [0.0, 3.0, 7.1], [0.0, 3.9, -5.0], 50],             // la pantalla grande: 350 → presidente
    [T.partidos + 0.15, [-2.4, 2.2, 8.5], [0.4, 2.0, 0.0], 50],                                                                          // abre por la izquierda: hay más atriles en penumbra
    [T.debaten + 0.25, ...WIDE],                                                                                                         // los cuatro y la cita del jueves
    [T.L[4] - 0.45, [-0.1, 1.97, 8.3], [-0.12, 1.97, 0.0], 50],
    [T.feijoo + 0.3, ...mid(0, 0.1, 0)], [T.E[4] + 0.05, ...mid(0, -0.07, 1)],                                                            // Feijóo (PP)
    [T.sanchez + 0.3, ...mid(1, 0.1, 0)], [T.E[5] + 0.05, ...mid(1, -0.07, 1)],                                                           // Sánchez (PSOE)
    [T.abascal + 0.3, ...mid(2, 0.1, 0)], [T.E[6] + 0.05, ...mid(2, -0.07, 1)],                                                           // Abascal (Vox)
    [T.colau + 0.3, ...mid(3, 0.1, 0)], [T.E[7] + 0.05, ...mid(3, -0.07, 1)],                                                             // Colau (Frente Amplio)
    [T.lleva + 0.15, [0.45, 1.98, 8.65], [0.0, 1.98, 0.0], 50],                                                                          // abre: los cuatro y, delante, la nómina
    [T.si + 0.2, [0.12, 1.9, 8.25], [0.0, 1.88, 0.0], 50], [T.trabajo + 0.3, [-0.4, 1.86, 7.95], [0.0, 1.84, 0.0], 50],                  // deriva lateral: la nómina se despega del fondo
    [T.quien + 0.3, [0.0, 1.9, 8.1], [0.0, 1.9, 0.0], 50],                                                                               // ¿quién?
    [T.letra - 0.3, [0.72, 1.7, 7.35], [0.2, 1.1, 3.3], 48],                                                                             // rodea la urna por un lado…
    [T.letra + 0.4, [0.5, 1.2, 6.1], [-0.12, 0.78, 3.3], 46],                                                                             // …y baja a la letra pequeña
    [T.manana + 0.25, [0.6, 1.75, 7.5], [0.1, 1.7, 0.0], 50],
    [T.capitulo + 0.1, ...WIDE],                                                                                                         // «mañana, capítulo 1»
    [T.manda + 0.5, [0.0, 2.1, UZ + 1.2], [0.0, 1.6, UZ - 1.2], 56],                                                                      // baja hacia la urna…
    [END - 0.7, [0.0, UB + 0.42, UZ + 0.4], [0.0, 1.6, 1.5], 60], [END, P0, L0, 58],                                                      // …y entra (bucle)
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
// desenfoque de fondo SOLO dentro y cerca de la urna (el principio y el final): en el resto no se nota (todo está casi a la misma distancia) y cuesta el 40 % del render
function dofAt(t, st) { const f = st.p.distanceTo(st.l), k = Math.max(1 - win(t, TL.E[1] + 0.3, 0.9), win(t, TL.manda + 0.6, 0.9)); return { focus: f, scale: k < 0.004 ? 0 : k * (f < 1.2 ? 0.35 * f : 0.03 * f) }; }
