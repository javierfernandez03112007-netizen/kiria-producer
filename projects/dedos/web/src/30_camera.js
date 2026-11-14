// ---------------------------------------------------------------- cámara: primer plano del índice abierto (cruje a los 0,3 s) → se aleja y se ve la mano entera → entra en el
// dedo (frase 3) → el anillo de resonancia y su pantalla → los dos círculos del debate → vuelve al dedo con el reloj → las dos manos de Unger → la peana con el
// premio y las 215 personas → vuelve a la mano y al primer plano del principio (bucle).
let CKS = [];
const T0 = [0.06, 1.59, 1.32], L0 = [-0.33, 1.31, 0.0], T0b = [0.055, 1.585, 1.34], L0b = [-0.33, 1.308, 0.0], Tm = [0.07, 1.6, 1.28], Lm = [-0.33, 1.312, 0.0];
function buildCam() {
  const HL = HAND_L / 2;
  const A = [
    [-0.4, Tm, Lm, 36], [0.0, T0, L0, 36], [0.35, T0b, L0b, 36],
    [1.3, [0.5, 1.2, 3.3], [-0.1, 0.82, 0], 38], [2.4, [1.0, 1.15, 3.05], [-0.09, 0.84, 0], 38], [K.medico1, [1.2, 1.08, 2.9], [-0.08, 0.86, 0], 38],
    [K.tenian2 - 0.1, [1.05, 1.12, 2.85], [-0.12, 0.88, 0], 38], [K.final2, [0.55, 1.3, 2.0], [-0.25, 1.05, 0], 38],
    [K.nudillo3 + 0.1, [0.1, 1.45, 1.1], [-0.33, 1.25, 0], 37], [K.capsula3, [-0.13, 1.45, 0.62], [-0.35, 1.29, 0.0], 36], [K.liquido3, [-0.2, 1.4, 0.5], [-0.35, 1.285, 0.0], 36],
    [K.tirar3, [-0.12, 1.42, 0.8], [-0.42, 1.33, 0.02], 36], [K.presion3, [-0.24, 1.36, 1.15], [-0.45, 1.26, 0.1], 36], [K.cae3 + 0.45, [-0.235, 1.355, 1.12], [-0.445, 1.262, 0.1], 36], [K.gas3, [-0.2, 1.37, 0.5], [-0.35, 1.287, 0.0], 36],
    [K.golpe3, [-0.23, 1.345, 0.41], [-0.35, 1.287, 0.0], 35], [K.n2015 - 0.2, [-0.235, 1.34, 0.4], [-0.35, 1.286, 0.0], 35],
    [K.n2015 + 0.7, [-0.44, 1.47, 2.3], [-0.59, 1.35, 0.15], 36], [K.resonancia4, [-0.46, 1.45, 2.25], [-0.59, 1.34, 0.15], 36], [K.discute5 - 0.35, [-0.48, 1.44, 2.15], [-0.59, 1.34, 0.15], 36],
    [K.discute5 + 0.4, [-0.345, 1.64, 3.5], [-0.345, 1.6, 0.62], 36], [K.nacer5, [-0.37, 1.64, 3.42], [-0.36, 1.6, 0.62], 36], [K.romperse5, [-0.32, 1.64, 3.42], [-0.33, 1.6, 0.62], 36], [K.burbuja6 - 0.45, [-0.31, 1.64, 3.38], [-0.33, 1.6, 0.62], 36],
    [K.burbuja6 + 0.3, [-0.17, 1.42, 0.6], [-0.36, 1.3, 0.02], 36], [K.durar6 + 0.05, [-0.18, 1.43, 0.68], [-0.38, 1.31, 0.04], 36], [K.durar6 + 0.75, [-0.24, 1.53, 1.32], [-0.46, 1.38, 0.1], 36], [K.minutos6 + 0.3, [-0.245, 1.53, 1.33], [-0.46, 1.38, 0.1], 36], [K.crujir6, [-0.23, 1.52, 1.3], [-0.45, 1.37, 0.09], 36],
    [K.respuesta7 - 0.2, [-0.22, 1.52, 1.32], [-0.44, 1.37, 0.09], 36],
    [K.donald7, [HL, 1.15, 6.6], [HL, 0.82, 0], 38], [K.crujio7, [HL - 0.15, 1.05, 6.2], [HL - 0.1, 0.82, 0], 38], [K.anos7, [HL - 0.1, 1.1, 6.3], [HL, 0.84, 0], 38],
    [K.ninguna8, [HL, 1.45, 4.1], [HL, 1.25, 0], 38], [K.ig8 - 0.35, [HL, 1.42, 4.3], [HL, 1.15, 0.1], 38],
    [K.ig8 + 0.4, [HL, 1.3, 5.6], [HL, 0.35, 0.6], 38], [K.n215, [HL, 1.6, 5.3], [HL, 0.15, 0.8], 38], [K.tu9 - 0.2, [HL + 0.05, 1.62, 5.25], [HL, 0.16, 0.8], 38],
    [K.mandaselo9, [0.45, 1.2, 3.3], [-0.1, 0.85, 0], 38], [K.dara9, [0.6, 1.25, 3.1], [-0.12, 0.88, 0], 38], [END - 1.2, [0.3, 1.38, 1.7], [-0.3, 1.2, 0], 37],
    [END - 0.4, Tm, Lm, 36], [END, T0, L0, 36], [END + 0.35, T0b, L0b, 36],
  ];
  CKS = [A];
}
function camAt(t) {
  const st = camKeys(t, CKS[0]);
  for (const [t0, a0] of [[T_HIT, 0.004], [K.golpe3, 0.004]]) { const u = t - t0; if (u > 0 && u < 0.35) { const a = a0 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; } }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.035], [K.golpe3, 0.045], [K.nacer5, 0.02], [K.romperse5, 0.02], [K.ig8, 0.02]])
    if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const c = st.l, yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), d = st.p.distanceTo(c);
  lightsAt(c, yaw, clamp(d / 2.6, 0.35, 1.6));
}
