// ---------------------------------------------------------------- LA CÁMARA del día 4: un solo plano, sin cortes, y DESPACIO donde hay gente con nombre.
// Empieza pegada a los pliegues de la tela roja → se aleja: estatua tapada y el rey → la tarjeta del comentario → sube sobre la plaza de noche → entra por el
// portón del cuartel y recorre la fila de soldados (en diagonal: se leen los nombres) → la ferretería, el electricista y el apagón → sube por la fachada del
// hotel (las plantas se encienden) hasta la azotea: piscina y bar → los drones con «6.438» → baja a la plaza, la gente, el tirón, la estatua de Kiria →
// y acaba en los pliegues de la tela caída (bucle).
let CK = [], CUTS = [];
function buildCam() { const T = TL, PY = S.hotel.userData.PY, P0 = [-2.2, 2.6, 7.2], L0 = [0.15, 5.3, 0.0];
  CK = [
    [0, P0, L0, 42], [T.oro, [-0.6, 2.5, 7.4], [0.3, 4.8, 0.2], 42],                                                                         // la estatua tapada contra la luna…
    [T.rey1, [4.6, 2.55, 6.4], [1.4, 2.6, 1.0], 42], [T.para + 0.2, [4.25, 2.1, 4.95], [2.4, 2.0, 1.7], 36],                                  // …y el rey («no es para él»)
    [T.E[2] + 0.2, [-2.6, 2.6, 5.9], [0.1, 4.3, 0.0], 42],                                                                                  // la silueta tapada (brazo en alto)
    [T.coment, [-0.6, 3.4, 9.0], [0.6, 4.45, 3.2], 42], [T.gusta + 0.25, [-0.1, 3.5, 8.3], [0.6, 4.5, 3.2], 40],                                                                                     // la tarjeta del comentario sobre la gente
    [T.sigue + 0.5, [4.4, 1.95, 4.5], [2.85, 1.62, 2.15], 32], [T.premio + 0.2, [5.6, 2.4, 6.2], [1.6, 3.0, 1.0], 42],                    // el rey, y su premio
    [T.L[4] + 0.4, [3.5, 8.5, 12.0], [-6.0, 4.0, 0.5], 50], [T.duerme, [-6.0, 11.0, 6.5], [-20.0, 3.0, 0.0], 50],                         // sube: la ciudad de noche
    [T.cuartel, [-11.8, 3.9, 1.4], [-17.0, 3.7, 0.0], 44], [T.militar, [-16.8, 2.4, 1.0], [-21.5, 1.9, 0.6], 44],                          // entra por el portón (por el centro)
    [T.medianoche + 0.5, [-19.0, 1.9, 6.3], [-22.0, 1.5, 0.2], 42], [T.E[5] - 0.1, [-18.9, 1.82, 4.7], [-22.4, 1.55, -1.2], 40],          // la fila en diagonal (despacio)
    [T.ferre + 0.4, [-6.0, 6.5, 13.5], [5.0, 2.0, 22.0], 48], [T.ferre + 1.4, [6.4, 1.8, 20.8], [6.6, 1.5, 27.5], 40],                     // vuela a la ferretería: @iz.her_019 en el mostrador
    [T.electricista + 0.1, [9.6, 1.8, 21.3], [12.2, 1.35, 22.7], 40], [T.trabajo, [10.4, 1.62, 22.45], [12.25, 1.3, 22.65], 36],          // el electricista, de lado
    [T.luz + 0.15, [8.4, 2.3, 19.4], [18.5, 4.0, 23.5], 48], [T.fix - 0.25, [10.5, 1.65, 22.3], [12.3, 1.2, 22.75], 38],                   // ¡apagón! (se ve el hotel apagado) y lo arregla
    [T.L[7] + 0.25, [13.8, 3.0, 18.6], [28.0, 7.0, 21.5], 46], [T.hotel - 0.5, [22.6, 9.5, 13.8], [30.6, 14.0, 23.5], 46], [T.hotel + 0.45, [26.2, 23.5, 14.4], [30.6, 27.0, 23.5], 46],   // el hotel: sube por la fachada
    [T.azotea + 0.2, [33.6, PY + 3.4, 21.6], [31.4, PY + 0.4, 30.2], 44], [T.bar, [31.6, PY + 1.9, 25.2], [27.2, PY + 1.3, 26.8], 42],    // la azotea, la piscina y el bar
    [T.nadie, [31.3, PY + 1.85, 27.9], [27.4, PY + 1.3, 26.6], 42],                                                                        // la gente del bar (despacio)
    [T.somos, [31.0, PY + 2.0, 22.8], [4.0, 27.0, 4.0], 48], [T.visto, [29.6, PY + 1.7, 22.3], [4.0, 26.0, 4.0], 46],                      // los drones: «6.438» y la lupa
    [T.plaza, [17.0, 9.5, 8.0], [2.0, 3.0, 3.0], 46], [T.rey9 + 0.1, [5.6, 2.1, 6.9], [2.0, 2.1, 1.8], 40],                              // baja a la plaza (en curva): la gente y el tirón
    [T.L[10] + 0.1, [3.6, 1.7, 7.6], [0.2, 4.4, 0.0], 44], [T.orden, [0.9, 2.5, 7.6], [0.0, 1.95, 0.5], 26],                               // ¡Kiria! y la placa (desde fuera del corro)
    [T.justo, [-2.8, 2.4, 8.2], [0.4, 3.0, 2.4], 42], [T.manda, [-2.0, 2.5, 7.4], [0.1, 4.8, 0.0], 42],                                    // la gente discute
    [END, P0, L0, 42],                                                                                                                      // …la estatua contra la luna, ya destapada (bucle)
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: f < 1.2 ? 0.35 * f : 0.05 * f }; }
