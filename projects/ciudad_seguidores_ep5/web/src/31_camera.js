// ---------------------------------------------------------------- LA CÁMARA del día 5: un solo plano, sin cortes, y DESPACIO donde hay gente con nombre.
// Empieza a ras del suelo de mármol con la corona rodando hacia nosotros → sube a la nuca del rey (sin corona) → la tarjeta de @yugo_gb y se aleja por el salón →
// sale por la puerta girando hacia la fragua → sube sobre la plaza al atardecer → el club (portero, cola, «COMPLETO») → el cine con estreno → el escaparate del chino
// (el último rollito) → al oeste, el campo: el gol y el 7 → sigue a @victorelcrepeer_mc hasta la puerta sur del cuartel («¡Adelante!») → teleobjetivo al balcón y
// se acerca hasta la máscara que refleja el cielo → se aleja sobre la gente (tarjeta) → entra por la puerta del ayuntamiento y acaba a ras del suelo (bucle).
let CK = [], CUTS = [];
function buildCam() { const T = TL, P0 = [0.62, 0.84, -27.25], L0 = [0.45, 1.25, -30.0];
  CK = [
    [0, P0, L0, 50], [1.0, [0.85, 0.86, -26.25], [0.7, 1.15, -29.0], 50], [2.1, [1.15, 0.95, -25.45], [0.95, 0.95, -28.0], 48],                                                                    // la corona rueda hacia nosotros
    [T.E[1] + 0.4, [1.7, 1.35, -24.9], [1.0, 0.75, -26.8], 46],                                                                              // gira como una moneda
    [T.lugar, [0.4, 2.75, -29.6], [-0.05, 2.85, -31.7], 42],                                                                                 // la nuca del rey: sin corona
    [T.coment3, [0.8, 3.1, -26.6], [0.15, 3.6, -31.0], 44], [T.gusta3, [0.9, 3.3, -24.6], [0.1, 3.5, -31.2], 44],                             // la tarjeta de @yugo_gb
    [T.condicion, [0.4, 3.45, -22.5], [0.0, 3.1, -31.4], 42], [T.E[3] + 0.05, [0.3, 3.5, -21.2], [0.0, 3.0, -31.4], 42],                     // se aleja: el dedo en alto
    [T.mientras, [0.15, 3.5, -20.4], [-8.0, 3.0, -20.0], 46], [T.forjan - 0.15, [0.0, 3.4, -17.6], [-2.0, 2.0, -8.0], 48],                 // gira dentro del salón y sale por la puerta
    [T.ciudad - 0.3, [-0.6, 2.0, -11.8], [-2.6, 0.95, -10.0], 42], [T.ciudad + 0.15, [-0.9, 2.5, -11.0], [-2.8, 1.0, -9.9], 40],             // la fragua (chispas)
    [T.cumple + 0.25, [0.4, 5.6, -8.4], [-4.0, 2.5, 21.0], 50], [T.cumple + 0.9, [-1.6, 9.8, -3.6], [-7.0, 2.5, 21.0], 50], [T.E[4] + 0.2, [-4.2, 10.8, 2.5], [-8.0, 2.0, 22.5], 50],                    // sube: la ciudad al atardecer
    [T.club5, [-5.4, 5.5, 13.6], [-7.8, 2.6, 23.0], 46], [T.portero, [-5.8, 2.3, 18.4], [-6.6, 1.7, 23.0], 44],                              // el club
    [T.nadie + 0.3, [-4.4, 2.3, 18.2], [-6.3, 1.6, 23.0], 44],                                                                               // el portero para a la cola
    [WORDS.find(w => w.li === 6 && w.n === 'queria').start, [-12.6, 2.2, 18.2], [-16.2, 1.6, 22.4], 46],                                     // el cine: @god_nika0206
    [T.estreno - 0.3, [-15.0, 3.3, 13.4], [-16.0, 3.3, 23.0], 46],                                                                           // ESTRENO HOY
    [T.ni + 0.25, [-22.3, 1.85, 20.7], [-24.9, 1.3, 24.8], 40], [T.rollito + 0.6, [-23.2, 1.65, 21.8], [-25.1, 1.2, 24.8], 36],           // el escaparate: el último rollito
    [T.luquita + 0.4, [-29.2, 2.6, 21.6], [-44.0, 1.0, 31.0], 46], [T.futbol - 0.5, [-31.0, 2.6, 28.5], [-41.0, 1.2, 31.2], 44],             // al oeste: el campo
    [T.futbol + 0.4, [-32.6, 2.1, 34.6], [-39.5, 1.2, 31.4], 42], [T.suyo + 0.25, [-33.2, 2.3, 35.0], [-42.0, 1.4, 29.5], 42],               // el gol y el 7 a la espalda
    [WORDS.find(w => w.li === 8 && w.n === 'queria').start, [-31.0, 2.4, 25.5], [-27.0, 1.5, 16.6], 44],                                     // @victorelcrepeer_mc va al cuartel
    [T.marcos, [-28.2, 2.1, 19.8], [-25.6, 1.6, 13.4], 42], [T.adelante + 0.25, [-27.5, 2.0, 18.6], [-25.5, 1.7, 13.0], 40],                 // la puerta sur: «¡Adelante!»
    [T.ahora + 0.3, [-22.5, 6.0, 12.0], [-8.0, 9.0, -8.0], 34], [T.sale + 0.1, [-16.5, 8.5, 4.5], [0.0, 13.6, -15.3], 24],                   // sale del patio: teleobjetivo al balcón
    [T.mascara - 0.05, [-8.5, 11.0, -3.5], [0.0, 13.9, -15.2], 28], [T.acero + 0.2, [-2.5, 13.2, -10.6], [0.0, 14.0, -15.2], 32],            // se acerca…
    [T.refleja + 0.3, [0.9, 13.8, -12.7], [0.0, 14.05, -15.1], 36], [T.E[10] + 0.3, [0.45, 14.05, -13.6], [0.0, 14.05, -15.1], 36],          // …la máscara refleja el cielo
    [T.E[10] + 1.33, [1.8, 11.5, -4.0], [0.0, 13.3, -15.1], 46], [T.coment11 + 0.7, [3.6, 6.5, 4.0], [2.4, 5.9, -9.0], 50], [T.rey11, [3.3, 6.3, 3.2], [2.3, 5.9, -9.0], 50],                                // la gente y la tarjeta del próximo rey
    [T.manda, [2.2, 6.0, 0.5], [0.8, 4.4, -10.5], 48], [T.manda + 1.21, [1.0, 4.6, -11.6], [0.2, 3.0, -20.0], 46],                          // entra en el ayuntamiento…
    [T.manda + 1.91, [0.2, 3.1, -17.0], [0.3, 2.2, -26.0], 48], [END - 0.81, [0.8, 1.35, -23.8], [0.4, 1.4, -29.6], 50],
    [END, P0, L0, 50],                                                                                                                       // …a ras del suelo (bucle)
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: f < 1.2 ? 0.35 * f : 0.05 * f }; }
