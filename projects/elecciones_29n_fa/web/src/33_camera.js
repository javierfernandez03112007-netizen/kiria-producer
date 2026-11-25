// ---------------------------------------------------------------- 29N · capítulo de un partido: LA CÁMARA (un solo plano). Empieza pegada a la torre de lingotes (se apila sola) →
// la raya del tope, los lingotes que pasan y la vivienda social → baja al atril del partido y se queda de frente (cara arriba, medidas sobre el
// atril, apellido debajo), con una deriva lenta en cada medida → abre a las cuatro (se enciende la siguiente) → el atril del siguiente partido, a la MISMA
// distancia y altura → sube otra vez al candado (bucle).
let CK = [], CUTS = [];
function buildCam() { const T = TL, BP = TP, K0 = [[BP[0] - 0.02, BP[1] + 0.62, BP[2] + 2.3], [BP[0] - 0.02, BP[1] + 0.66, BP[2]], 50], i = ORDER.indexOf(CH.id), WIDE = [[0.0, 1.98, 8.6], [0.0, 1.98, 0.0], 50];
  // de frente a un atril: gira «th» radianes alrededor de los rótulos (la cara, detrás, se desplaza un poco: relieve), se acerca con «k» y sube «dy» mirando algo hacia abajo
  // (así la cara no cambia de sitio y los objetos se ven desde arriba). Con th = 0, k = 0 y dy = 0 es el plano base: cara arriba, medidas sobre el atril, apellido y siglas debajo.
  const mid = (n, th, k, dy = 0) => { const ry = lectRy(n), a = ry + th, d = 2.88 - 0.2 * k, y0 = S.FL + 1.6, sx = lectX(n) + Math.sin(ry) * 0.12, sz = lectZ(n) + Math.cos(ry) * 0.12;
    return [[sx + Math.sin(a) * d, y0 + dy, sz + Math.cos(a) * d], [sx, y0 + dy * (1 - d / (d + 0.52)), sz], 44]; };
  CK = [
    [0, ...K0],                                                                                              // la torre de lingotes se apila sola
    [T.diez + 0.3, [BP[0] - 0.32, BP[1] + 0.7, BP[2] + 2.9], [BP[0] - 0.32, BP[1] + 0.74, BP[2]], 50],       // la raya del tope: «10 millones por heredero»
    [T.pase + 0.4, [BP[0] - 0.27, BP[1] + 0.95, BP[2] + 3.15], [BP[0] - 0.27, BP[1] + 1.0, BP[2]], 50],        // «¿y lo que pase de ahí?»: los lingotes de arriba
    [T.cien + 0.6, [BP[0] - 0.3, BP[1] + 0.97, BP[2] + 3.0], [BP[0] - 0.3, BP[1] + 1.02, BP[2]], 50],       // «100 %»
    [T.duplicar - 0.1, [BP[0] - 0.74, BP[1] + 0.55, BP[2] + 4.7], [BP[0] - 0.74, BP[1] + 0.62, BP[2]], 50],  // se aleja hacia la izquierda: vuelan a la vivienda social
    [T.E[2] + 0.25, [BP[0] - 0.76, BP[1] + 0.52, BP[2] + 4.5], [BP[0] - 0.76, BP[1] + 0.58, BP[2]], 50],
    [T.L[3] + 1.0, ...mid(i, 0.03, 0)],                                                                      // baja al atril del partido (la torre estaba justo encima)
    [T.cuatro + 0.5, ...mid(i, -0.03, 0.6)],
    // en cada medida la cámara rodea el atril hacia un lado, sube un poco y se acerca; en la siguiente, hacia el otro
    [T.L[4] + 0.5, ...mid(i, -0.17, 0.9, 0.22)], [T.salario - 0.1, ...mid(i, -0.05, 1.2, 0.3)], [T.E[4], ...mid(i, 0.1, 0.7, 0.15)],     // 1 · trabajo (jornada y salario mínimo)
    [T.L[5] + 0.45, ...mid(i, 0.12, 0.6, 0.12)], [T.tope - 0.1, ...mid(i, 0.17, 1.1, 0.26)], [T.E[5], ...mid(i, 0.04, 0.8, 0.18)],       // 2 · vivienda
    [T.L[6] + 0.45, ...mid(i, -0.1, 0.5, 0.05)], [T.E[6], ...mid(i, -0.19, 1.2, 0.3)],                                                  // 3 · familias
    [T.L[7] + 0.4, ...mid(i, 0.05, 0.8, 0.2)], [T.E[7] + 0.1, ...mid(i, 0.16, 1.1, 0.26)],                                              // 4 · colegio
    [T.L[8] + 0.4, ...mid(i, 0.0, 0.2, 0.0)], [T.E[8], ...mid(i, -0.12, 1.0, 0.2)],                                                     // ¿y con qué dinero?
    [T.visto + 0.75, ...WIDE],                                                                               // «ya has visto los cuatro programas»: las cuatro pantallas encendidas
    [T.E[9] + 0.3, [0.0, 1.96, 8.2], [0.0, 1.98, 0.0], 50],                                                  // «el domingo decides tú»
    [T.manda + 1.2, [BP[0] - 0.3, 2.9, 5.0], [BP[0] - 0.15, 3.5, -3.0], 50],                                 // sube otra vez a la torre (bucle)
    [END, ...K0],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
// desenfoque de fondo solo cerca del candado (el principio y el final): en el resto no se nota y cuesta el 40 % del render
function dofAt(t, st) { const f = st.p.distanceTo(st.l), k = Math.max(1 - win(t, TL.diez - 0.4, 0.9), win(t, TL.manda + 1.7, 0.7)); return { focus: f, scale: k < 0.004 ? 0 : k * 0.03 * f }; }
