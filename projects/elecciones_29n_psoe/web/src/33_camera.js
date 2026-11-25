// ---------------------------------------------------------------- 29N · capítulo de un partido: LA CÁMARA (un solo plano). Empieza pegada al candado (las cifras giran) →
// se aleja: el candado delante del hemiciclo y las cuatro pantallas debajo → baja al atril del partido y se queda de frente (cara arriba, medidas sobre el
// atril, apellido debajo), con una deriva lenta en cada medida → abre a las cuatro (se enciende la siguiente) → el atril del siguiente partido, a la MISMA
// distancia y altura → sube otra vez al candado (bucle).
let CK = [], CUTS = [];
function buildCam() { const T = TL, PP = PADP, K0 = [[0.0, PP[1] + 0.1, PP[2] + 2.3], [0.0, PP[1] + 0.06, PP[2]], 50], i = ORDER.indexOf(CH.id), j = ORDER.indexOf(CH.next), WIDE = [[0.0, 1.98, 8.6], [0.0, 1.98, 0.0], 50];
  const mid = (n, dx, k) => { const ry = lectRy(n), nx = Math.sin(ry), nz = Math.cos(ry), cx = lectX(n), cz = lectZ(n) - 0.2, d = 3.2 - 0.2 * k, y = S.FL + 1.6;
    return [[cx + nx * d + nz * dx, y, cz + nz * d - nx * dx], [cx + nz * dx * 0.25, y, cz - nx * dx * 0.25], 44]; };
  CK = [
    [0, ...K0],                                                                                              // el candado, de cerca: las cifras giran
    [T.hacen - 0.1, [0.1, PP[1] - 0.1, PP[2] + 3.6], [0.0, PP[1] + 0.1, PP[2]], 50],
    [T.doscientos + 0.3, [0.0, 3.0, 5.4], [0.0, 3.6, -3.0], 50],                                            // se aleja: el candado delante del hemiciclo (210 escaños dorados)
    [T.E[1] + 0.35, [0.0, 2.7, 7.3], [0.0, 3.35, -3.0], 50],                                                // …y las cuatro pantallas debajo
    [T.record + 0.3, [-0.15, 2.85, 6.2], [-0.05, 3.5, -3.0], 50],                                           // el récord: 202; faltan 8 (algo más cerca)
    [T.E[2] + 0.3, [-0.25, 2.9, 5.7], [-0.1, 3.55, -3.0], 50],
    [T.psoe + 0.2, ...mid(i, 0.1, 0)],                                                                       // baja al atril del partido
    [T.cuatro + 0.5, ...mid(i, -0.05, 0.6)],
    [T.L[4] + 0.4, ...mid(i, 0.08, 0.2)], [T.E[4], ...mid(i, -0.06, 1)],                                     // 1 · vivienda
    [T.L[5] + 0.4, ...mid(i, -0.1, 0.3)], [T.salario, ...mid(i, 0.02, 0.9)], [T.E[5], ...mid(i, 0.1, 0.4)],  // 2 · trabajo (jornada y salario mínimo)
    [T.L[6] + 0.4, ...mid(i, 0.1, 0.1)], [T.E[6], ...mid(i, -0.08, 1)],                                      // 3 · familias
    [T.L[7] + 0.4, ...mid(i, -0.1, 0.2)], [T.ayuda, ...mid(i, 0.0, 0.8)], [T.E[7], ...mid(i, 0.1, 0.3)],     // 4 · estudiantes y dentista
    [T.L[8] + 0.4, ...mid(i, 0.08, 0.0)], [T.E[8], ...mid(i, -0.06, 1)],                                     // ¿y con qué dinero?
    [Math.min(T.proximo + 0.55, T.vox - 0.25), ...WIDE],                                                     // «en el próximo capítulo…»: las cuatro; se enciende la siguiente
    [T.vox + 0.05, [0.0, 1.96, 8.25], [0.0, 1.98, 0.0], 50],
    [T.irpf - 0.25, ...mid(j, 0.1, 0)], [T.E[9] + 0.1, ...mid(j, -0.06, 1)],                                 // el atril del siguiente partido: su intriga
    [T.manda + 0.8, [0.1, 2.9, 5.4], [0.0, 3.5, -3.0], 50],                                                  // sube otra vez al candado (bucle)
    [END, ...K0],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
// desenfoque de fondo solo cerca del candado (el principio y el final): en el resto no se nota y cuesta el 40 % del render
function dofAt(t, st) { const f = st.p.distanceTo(st.l), k = Math.max(1 - win(t, TL.hacen - 0.3, 0.9), win(t, TL.manda + 1.3, 0.9)); return { focus: f, scale: k < 0.004 ? 0 : k * 0.03 * f }; }
