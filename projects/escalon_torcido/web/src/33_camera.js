// ---------------------------------------------------------------- «El escalón torcido»: LA CÁMARA (un solo plano, siempre moviéndose).
// La casa entera (primer fotograma = último) → se acerca a la planta baja (el que pule) → sube a la alta y mira escalera arriba hasta el cielo → baja deprisa a la
// cabeza del de abajo (cerebro, foco) → detrás de la sala de siluetas (la mitad, uno de cada cuatro) → vuelve delante (quieto) → la casa entera (el año otra vez) y
// sube con la escalera hasta el ×37 → baja a la trampilla (la mano) → mira arriba mientras sube → baja al banco (otra persona) → la casa entera.
let CK = [], CUTS = [];
function buildCam() { const T = TL, WIDE = [[0.0, 3.0, 14.6], [0.0, 3.55, 0.0], 50];
  CK = [
    [0, ...WIDE],
    [T.mismo, [0.12, 2.3, 9.6], [0.08, 1.8, 0.0], 48],                                   // se acerca a la planta baja
    [T.E[1] + 0.15, [0.3, 1.5, 5.0], [0.15, 1.05, 0.2], 44],
    [T.puesto, [0.3, 4.15, 7.0], [0.0, 4.45, -0.6], 46],                                 // la planta alta: la escalera de dentro
    [T.dia2, [0.6, 4.9, 6.2], [0.4, 5.4, -0.8], 46],
    [T.torcidos + 0.1, [0.9, 5.7, 5.9], [0.7, 6.3, -0.8], 46],                            // los ángulos de los bloques (por delante de la casa)
    [T.casi + 0.25, [1.0, 6.0, 5.6], [0.7, 6.9, -0.8], 46],
    [T.todos + 0.15, [1.2, 6.8, 5.2], [0.6, 12.5, -1.4], 48],                            // mira escalera arriba…
    [T.E[2] + 0.15, [1.5, 7.9, 4.6], [0.4, 30, -2.2], 50],                               // …hasta el cielo (él, arriba del todo)
    [T.L[3] + 0.08, [1.45, 7.8, 4.65], [0.45, 30, -2.0], 49],
    [T.abajo3 - 0.05, [0.8, 3.7, 7.2], [0.1, 2.0, 0.0], 46],                             // baja por delante de la casa
    [T.abajo3 + 0.35, [0.3, 1.45, 3.4], [0.0, 1.0, 0.3], 42],                          // al de abajo
    [T.cerebro + 0.1, [0.15, 1.4, 1.95], [-0.12, 1.1, 0.42], 38],                         // su cabeza: el cerebro
    [T.foco + 0.25, [0.32, 1.62, 2.8], [-0.02, 1.0, 0.35], 42],                            // el foco
    [T.mundo + 0.1, [0.55, 2.95, 7.8], [-0.1, 1.05, 0.5], 42],                              // detrás de la sala
    [T.errores + 0.2, [0.45, 2.7, 6.9], [-0.08, 1.0, 0.5], 40],
    [T.camiseta, [0.35, 2.55, 6.4], [-0.05, 1.15, 0.7], 40],                                // la camiseta
    [T.E[6], [0.3, 2.75, 7.0], [-0.05, 1.1, 0.6], 42],                                    // la mitad → uno de cada cuatro
    [T.miedo, [0.3, 1.4, 3.8], [0.05, 1.0, 0.3], 42],                                     // vuelve delante del de abajo: quieto
    [T.quieto7 + 0.3, [0.28, 1.35, 3.5], [0.05, 0.98, 0.3], 41],
    [T.mejorar, [0.0, 3.0, 13.6], [0.0, 3.5, 0.0], 50],                                   // la casa entera: el año otra vez
    [T.anyo8, [0.0, 4.6, 15.4], [0.0, 6.2, 0.0], 50],
    [T.siete + 0.2, [1.5, 7.9, 4.6], [0.4, 34, -2.2], 54],                                // ×37: escalera arriba
    [T.E[8] + 0.3, [0.9, 3.9, 7.6], [0.15, 1.9, 0.0], 46],                                // baja por delante de la casa
    [T.escalon9 + 0.25, [0.25, 1.1, 3.5], [0.0, 1.5, 0.4], 50],                           // la planta baja: el de abajo y la trampilla que se abre
    [T.deja9b, [0.3, 1.15, 3.1], [0.02, 1.6, 0.42], 48],                                  // se levanta y pone su escalón
    [T.poco, [0.48, 1.3, 1.75], [0.07, 1.95, 0.42], 44],                                  // las dos manos
    [T.manda + 0.3, [0.6, 0.9, 2.2], [0.05, 2.9, 0.35], 50],                               // mira arriba mientras sube
    [T.quien + 0.05, [0.5, 1.2, 2.7], [0.02, 1.0, 0.4], 46],                               // baja al banco: otra persona
    [T.perfecto, [0.15, 2.4, 8.2], [0.05, 2.0, 0.0], 48],
    [END, ...WIDE],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { return { focus: st.p.distanceTo(st.l), scale: 0 }; }
