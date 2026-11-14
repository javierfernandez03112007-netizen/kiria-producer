// ---------------------------------------------------------------- cámara: el heladero de frente (muerde y se congela) → gira hasta su perfil y la cabeza se abre → el
// paladar y el nervio → la arteria → el cráneo y las capas → tres cuartos para ver la frente → la pantalla del Doppler → las peanas → el truco por dentro →
// de frente se derrite y sonríe → vuelve a morder (bucle).
let CKS = [];
const T0 = [-1.6, -0.3, 5.6], L0 = [-0.15, -0.55, 0.6], Tm = [-1.66, -0.32, 5.72], Lm = [-0.16, -0.56, 0.6], T0b = [-1.55, -0.28, 5.5], L0b = [-0.14, -0.54, 0.6];
function buildCam() {
  const A = [
    [-0.45, Tm, Lm, 34], [0.0, T0, L0, 34], [0.35, T0b, L0b, 34],
    [1.6, [-1.0, -0.12, 4.5], [-0.05, -0.38, 0.5], 33], [K.final2, [-0.55, -0.05, 4.25], [0, -0.3, 0.45], 33],
    [K.truco2 + 0.25, [2.7, 0.05, 3.6], [0, -0.25, 0.25], 34], [K.helado3, [5.0, -0.2, 0.6], [0, -0.3, 0.05], 34],
    [K.paladar3, [3.1, -0.42, 0.62], [0, -0.48, 0.36], 33], [K.nervio3, [3.4, -0.28, 0.32], [0, -0.32, 0.18], 33], [K.alarma3 + 0.3, [3.5, -0.22, 0.25], [0, -0.28, 0.12], 33],
    [K.sangre4, [5.8, -0.45, -0.05], [0, -0.45, -0.05], 34], [K.arteria4, [3.9, 0.35, 0.12], [0, 0.3, 0.02], 33], [K.ensancha4, [3.0, 0.33, 0.24], [0, 0.32, 0.14], 32],
    [K.segundos4 + 0.4, [3.05, 0.34, 0.22], [0, 0.32, 0.12], 32],
    [K.craneo5, [4.7, 0.3, 0.0], [0, 0.25, -0.1], 34], [K.capas5, [3.5, 0.45, -0.2], [0, 0.4, -0.15], 33], [K.duelen5, [3.4, 0.46, -0.22], [0, 0.4, -0.16], 33],
    [K.nervio6, [3.6, 0.55, 2.6], [0, 0.12, 0.15], 34], [K.frente6, [2.7, 0.55, 2.9], [0, 0.28, 0.42], 33], [K.ahi6 + 0.2, [2.75, 0.56, 2.85], [0, 0.28, 0.4], 33],
    [K.midieron7, [4.8, 0.48, -0.1], [0, 0.45, -0.1], 34], [K.cierra7, [4.7, 0.47, -0.08], [0, 0.45, -0.1], 34], [K.cierra7 + 0.48, [6.4, 0.6, 5.2], [0, -1.0, 1.5], 35],
    [K.comes8 + 0.3, [0, -1.0, 9.6], [0, -2.45, 3.3], 34], [K.n13 + 0.3, [0.06, -0.98, 9.4], [0, -2.45, 3.3], 34], [K.truco9 + 0.45, [6.0, -0.2, 5.0], [0, -0.5, 0.5], 35],
    [K.medicos9, [3.1, -0.42, 0.62], [0, -0.48, 0.36], 33], [K.calentarlo9 - 0.2, [3.0, -0.42, 0.6], [0, -0.48, 0.36], 33], [K.calentarlo9 + 0.3, [3.4, -0.25, 3.6], [0, -0.38, 0.4], 34],
    [K.calentarlo9 + 0.9, [-1.1, -0.15, 5.0], [0, -0.35, 0.4], 34], [K.mandaselo10, [-1.3, -0.25, 5.2], [-0.1, -0.5, 0.5], 34],
    [END - 0.45, Tm, Lm, 34], [END, T0, L0, 34], [END + 0.35, T0b, L0b, 34],
  ];
  CKS = [A];
}
function camAt(t) {
  const st = camKeys(t, CKS[0]);
  const u = t - T_HIT; if (u > 0 && u < 0.35) { const a = 0.01 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[T_HIT, 0.03], [K.n27, 0.015], [K.calentarlo9, 0.02]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const c = st.l, yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), d = st.p.distanceTo(c);
  lightsAt(c, yaw, clamp(d / 2.6, 0.35, 2.4));
}
