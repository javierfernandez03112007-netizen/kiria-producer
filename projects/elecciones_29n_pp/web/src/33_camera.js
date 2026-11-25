// ---------------------------------------------------------------- 29N · capítulo de un partido: LA CÁMARA (un solo plano). Empieza pegada a la fila del IRPF de la nómina (la rueda gira y se para en 0) →
// se aleja: la nómina entera, la lupa en la letra pequeña y las barras de la rebaja → baja al atril del partido y se queda de frente (cara arriba, medidas sobre el
// atril, apellido debajo), con una deriva lenta en cada medida → abre a las cuatro (se enciende la siguiente) → el atril del siguiente partido, a la MISMA
// distancia y altura → sube otra vez al candado (bucle).
let CK = [], CUTS = [];
function buildCam() { const T = TL, BP = HP, RY = HP[1] + ROWY, K0 = [[BP[0] + 0.0, RY + 0.2, BP[2] + 1.9], [BP[0] + 0.0, RY + 0.16, BP[2]], 50], i = ORDER.indexOf(CH.id), j = ORDER.indexOf(CH.next), WIDE = [[0.0, 1.98, 8.6], [0.0, 1.98, 0.0], 50];
  // de frente a un atril: gira «th» radianes alrededor de los rótulos (la cara, detrás, se desplaza un poco: relieve), se acerca con «k» y sube «dy» mirando algo hacia abajo
  // (así la cara no cambia de sitio y los objetos se ven desde arriba). Con th = 0, k = 0 y dy = 0 es el plano base: cara arriba, medidas sobre el atril, apellido y siglas debajo.
  const mid = (n, th, k, dy = 0) => { const ry = lectRy(n), a = ry + th, d = 2.88 - 0.2 * k, y0 = S.FL + 1.6, sx = lectX(n) + Math.sin(ry) * 0.12, sz = lectZ(n) + Math.cos(ry) * 0.12;
    return [[sx + Math.sin(a) * d, y0 + dy, sz + Math.cos(a) * d], [sx, y0 + dy * (1 - d / (d + 0.52)), sz], 44]; };
  CK = [
    [0, ...K0],                                                                                              // la fila del IRPF, de cerca: la rueda gira y se para en 0
    [T.primer + 0.5, [BP[0] + 0.02, BP[1] + 0.12, BP[2] + 2.5], [BP[0] + 0.02, BP[1] + 0.1, BP[2]], 50],     // se aleja: la nómina entera («primer año de trabajo»)
    [T.pp + 0.35, [BP[0] + 0.08, BP[1] + 0.02, BP[2] + 2.3], [BP[0] + 0.06, BP[1] + 0.0, BP[2]], 50],        // «…una promesa del PP» (el sello)
    [T.pequena + 0.3, [BP[0] + 0.0, BP[1] - 0.3, BP[2] + 1.55], [BP[0] - 0.04, BP[1] - 0.34, BP[2]], 50],    // «la letra pequeña»: baja al pie de la nómina con la lupa
    [T.treinta + 0.6, [BP[0] + 0.04, BP[1] - 0.32, BP[2] + 1.45], [BP[0] - 0.02, BP[1] - 0.36, BP[2]], 50],  // «de 18 a 35 años»
    [T.setenta - 0.1, [BP[0] + 0.72, 3.3, 3.5], [BP[0] + 0.74, 3.72, -5.2], 50],                             // se aleja hacia la derecha: las barras de la rebaja de cada año
    [T.cuarto + 0.5, [BP[0] + 0.84, 3.32, 3.4], [BP[0] + 0.84, 3.74, -5.2], 50],
    [T.E[2] + 0.25, [BP[0] + 0.84, 3.32, 3.35], [BP[0] + 0.84, 3.74, -5.2], 50],
    [T.L[3] + 1.0, ...mid(i, 0.03, 0)],                                                                      // baja al atril del partido (la nómina estaba justo encima)
    [T.cuatro + 0.5, ...mid(i, -0.03, 0.6)],
    // en cada medida la cámara rodea el atril hacia un lado, sube un poco y se acerca; en la siguiente, hacia el otro
    [T.L[4] + 0.5, ...mid(i, -0.17, 0.9, 0.22)], [T.E[4], ...mid(i, -0.05, 1.2, 0.3)],                                                  // 1 · vivienda
    [T.L[5] + 0.45, ...mid(i, 0.12, 0.6, 0.12)], [T.E[5], ...mid(i, 0.17, 1.1, 0.26)],                                                   // 2 · la compra
    [T.L[6] + 0.45, ...mid(i, -0.1, 0.5, 0.05)], [T.E[6], ...mid(i, -0.19, 1.2, 0.3)],                                                  // 3 · pensiones
    [T.L[7] + 0.45, ...mid(i, 0.05, 0.8, 0.2)], [T.control - 0.1, ...mid(i, 0.18, 1.1, 0.28)], [T.E[7], ...mid(i, 0.08, 0.7, 0.12)],       // 4 · inmigración
    [T.L[8] + 0.4, ...mid(i, 0.0, 0.2, 0.0)], [T.E[8], ...mid(i, -0.12, 1.0, 0.2)],                                                     // ¿y con qué dinero? (de frente: el atril entero)
    [Math.min(T.proximo + 0.55, T.psoe - 0.25), ...WIDE],                                                  // «en el próximo capítulo…»: las cuatro; se enciende la siguiente
    [T.psoe + 0.3, [0.0, 1.96, 8.25], [0.0, 1.98, 0.0], 50],
    [T.blindar + 0.5, ...mid(j, 0.04, 0)], [T.E[9] + 0.1, ...mid(j, -0.06, 0.9, 0.1)],                        // el atril del siguiente partido: su intriga (mismo plano base)
    [T.manda + 0.8, [BP[0] + 0.3, 2.9, 5.2], [BP[0] + 0.15, 3.5, -3.0], 50],                                 // sube otra vez a la nómina (bucle)
    [END, ...K0],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
// desenfoque de fondo solo cerca del candado (el principio y el final): en el resto no se nota y cuesta el 40 % del render
function dofAt(t, st) { const f = st.p.distanceTo(st.l), k = Math.max(1 - win(t, TL.primer + 0.2, 0.9), win(t, TL.manda + 1.3, 0.9)); return { focus: f, scale: k < 0.004 ? 0 : k * 0.03 * f }; }
