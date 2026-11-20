// ---------------------------------------------------------------- LA CÁMARA: un solo plano. Tres «saltos» de mundo (entrar en la corteza, salir por la aguja y volver de la cara a la cabeza) van tapados por un destello
// y por las estelas del flujo óptico; el desenfoque de movimiento no cruza esos saltos.
let CK = [], CUTS = [];
function buildCam() {
  const U = S.head.userData, SP = U.speech, N = U.speechNW.clone().normalize(), BC = S.head.localToWorld(_v().set(0, 0.56, -0.1)), A = v => [v.x, v.y, v.z];
  const bc = (x, y, z) => A(BC.clone().add(_v().set(x, y, z))), nu = (x, y, z) => [NEU.x + x, NEU.y + y, NEU.z + z];
  S.voice.updateMatrixWorld(true); const vo = (x, y, z) => A(S.voice.localToWorld(_v().set(x, y, z)));       // la escena de la voz está girada 90°
  const tip = NEU.clone().add(_v().set(-1.55, 0.95, 0.3));
  const D0 = [2.62, 0.45, 2.75], L0 = [-0.07, 0.16, 0.16], far = k => D0.map((d, i) => L0[i] + (d - L0[i]) * k);
  // el implante: plano general del cerebro rosa (las herramientas llegan por la normal, arriba a la derecha) y acercamiento en órbita hacia la zona del habla
  const Cw = BC.clone().add(_v().set(3.0, 0.2, 3.3)), tg = Cw.clone().sub(SP); tg.addScaledVector(N, -tg.dot(N)).normalize();
  const orb = (d, ang) => A(SP.clone().addScaledVector(N, d * Math.cos(ang)).addScaledVector(tg, d * Math.sin(ang)));
  const chip0 = U.arms.userData.spots[0], mid = (a, b, k) => A(a.clone().lerp(b, k));
  TL.cuts = CUTS = [TL.captar - 0.62, TL.intenta + 0.95, TL.todavia - 0.05];
  CK = [
    [0, D0, L0, 36], [TL.decir, far(0.93), L0, 36],                                                                                 // la cabeza: la palabra se queda en los labios
    [TL.ela + 0.6, [3.15, 0.05, 1.45], [0, 0.02, 0.22], 38], [TL.musc + 0.6, [3.0, 0.02, 1.32], [0, 0.0, 0.24], 38],                // la vía hacia la boca y la garganta
    [TL.pens + 0.7, bc(3.35, -0.09, 1.5), bc(0, -0.09, -0.03), 32], [TL.cient - 0.1, bc(3.12, -0.05, 1.33), bc(0, -0.09, -0.03), 32],  // el cerebro solo, entero (lámina 1)
    [TL.cient + 1.0, A(Cw), bc(0.06, 0.0, 0.05), 32],                                                                               // se vuelve rosa: plano general con las herramientas
    [TL.impl, orb(2.7, 0.62), mid(BC.clone().add(_v().set(0.06, 0, 0.05)), SP, 0.6), 32], [TL.k[1], orb(1.35, 0.72), A(SP), 32],     // los chips, uno a uno
    [TL.k[3] + 0.2, orb(0.6, 0.86), A(SP), 32], [TL.e256 + 0.35, orb(0.26, 1.0), A(SP), 32], [TL.e256 + 0.95, orb(0.2, 0.75), A(SP), 32],   // las agujas entran
    [CUTS[0] - 0.45, A(chip0.clone().addScaledVector(N, 0.09).addScaledVector(tg, 0.02)), A(chip0), 32], [CUTS[0] - 0.05, A(chip0.clone().addScaledVector(N, 0.004)), A(chip0.clone().addScaledVector(N, -0.05)), 32],   // y la cámara entra por un chip
    [CUTS[0], nu(-1.25, 3.6, 1.6), A(tip), 34], [TL.captar + 0.5, nu(0.6, 1.5, 3.3), nu(-1.6, 1.05, -0.2), 34], [TL.cuando - 0.1, nu(0.9, 1.0, 3.8), nu(-1.2, 0.8, -0.2), 34],   // las neuronas y el electrodo
    [CUTS[1] - 0.05, nu(0.9, 5.2, 3.6), nu(-0.4, 4.2, 0.3), 36],                                                                    // sube con la señal por la aguja…
    [CUTS[1], bc(4.7, 0.1, 0.08), bc(0, -0.09, -0.03), 32], [TL.palabras, bc(4.25, 0.08, 0.05), bc(0, -0.09, -0.03), 32], [TL.fly0, bc(3.95, 0.06, 0.03), bc(0, -0.09, -0.03), 32],   // …y sale al cerebro azul con la onda
    [TL.fly0 + 0.35, [1.3, 0.47, -0.1], [-3, 0.42, -0.1], 32], [TL.fly0 + 0.65, [-12, 0.4, -0.05], [-20, 0.38, 0], 34], [TL.fly0 + 0.95, [-40, 0.25, 0.1], [-48, 0.1, 0.2], 34],   // vuelo recto: atraviesa el cerebro y el túnel de luz
    [TL.fly1 - 0.3, [-52.6, 0.1, 0.35], vo(-0.55, -0.1, 0), 34], [TL.fly1, vo(-0.55, -0.1, 5.6), vo(-0.55, -0.1, 0), 34],              // …hasta la cara de partículas
    [TL.robot + 0.4, vo(-0.6, -0.08, 5.3), vo(-0.58, -0.1, 0), 34], [TL.todavia - 0.5, vo(-0.62, -0.05, 5.0), vo(-0.6, -0.08, 0), 34],
    [CUTS[2] - 0.03, vo(-0.66, -0.12, 1.6), vo(-0.66, -0.14, -2), 34],                                                              // se lanza hacia su boca…
    [CUTS[2], far(2.9), L0, 36], [CUTS[2] + 0.6, far(1.25), L0, 36],                                                                // …y llega volando a la cabeza de cristal
    [TL.posib, [2.5, 0.38, 2.6], [0, 0.18, 0.18], 36], [TL.labios + 0.5, [2.75, 0.12, 3.0], [0, 0.08, 0.55], 36],                     // la voz sale sin mover los labios
    [END - 0.6, D0, L0, 36], [END, D0, L0, 36],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0] + ' → ' + CK[i][0]);
}
// entre dos claves que cruzan un salto, la cámara no interpola: salta
function camAt(t) { t = clamp(t, 0, END); const cut = CUTS.find(c => Math.abs(t - c) < 1e-9); let ks = CK; for (const c of CUTS) { if (t < c) { ks = ks.filter(k => k[0] < c); break; } ks = ks.filter(k => k[0] >= c); }
  if (ks.length < 2) ks = CK; return camKeys(t, ks); }
function prevT(t, dt) { let p = Math.max(0, t - dt); for (const c of CUTS) if (t >= c && p < c) p = c; return p; }
function whiteAt(t) { return 0; }
function flashAt(t) { return CUTS.reduce((s, c) => Math.max(s, bump(t, c - 0.14, c + 0.04, 0.12, 0.28)), 0) * 0.7; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l), inN = st.p.distanceTo(NEU) < 30; return { focus: f, scale: (inN ? 0.55 : f < 0.6 ? 0.5 : 0.18) * f }; }
