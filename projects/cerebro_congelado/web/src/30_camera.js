// ---------------------------------------------------------------- cámara: plano de dron sobre la casa de Springfield que baja hasta Homer → al morder, se mete de golpe en la
// cabeza (el cerebro se congela; vuelta alrededor) → el paladar → se lanza dentro del nervio (primer plano de neuronas) → el cerebro con la alarma → el cuello y
// la sangre que sube → la arteria que se ensancha → el cráneo y las meninges → la frente → la arteria de 2012 → fuera, las peanas en el césped → dentro, el truco
// → fuera, Homer aliviado → el dron vuelve a subir (bucle con el primer fotograma).
let CKS = [];
const DR0 = [[38, 98, 262], [20, -4, -24], 45];
function buildCam() {
  const D = DR0, mt = macT();
  const A = [
    [-0.6, [33, 84, 228], [18, -4, -22], 44], [0.0, D[0], D[1], D[2]],
    [0.5, [24, 55, 150], [8, -3, -14], 42], [0.95, [10, 14, 62], [3, -5, -4], 38], [1.3, [-1.8, -0.4, 13.5], [0, -1.3, 0.2], 34], [T_HIT - 0.05, [-1.5, -0.45, 10.2], [0, -1.0, 0.3], 33],
    [T_HIT + 0.32, [1.0, 0.55, 4.6], [0, 0.45, -0.05], 34], [T_HIT + 0.8, [2.8, 0.85, 2.9], [0, 0.6, -0.12], 34], [3.2, [3.9, 0.8, 0.9], [0, 0.6, -0.12], 34], [4.05, [3.7, 0.45, -1.4], [0, 0.45, -0.12], 34],
    [K.helado3, [3.3, -0.25, 0.9], [0, -0.4, 0.3], 33], [K.paladar3, [2.6, -0.45, 0.75], [0, -0.52, 0.42], 32], [K.nervio3, [2.3, -0.2, 0.6], [0.2, -0.25, 0.35], 32], [mt[0] - 0.02, [0.95, -0.16, 0.44], [0.26, -0.18, 0.3], 30],
    [mt[1], [4.6, 0.5, 1.2], [0, 0.45, -0.15], 34], [K.sangre4, [4.4, -0.8, 0.6], [0.3, -0.8, -0.1], 34], [9.9, [4.0, -0.3, 0.6], [0.25, -0.25, -0.05], 33], [K.arteria4, [3.3, 0.45, 0.8], [0.05, 0.45, 0.15], 33],
    [K.ensancha4, [2.3, 0.62, 0.75], [0.02, 0.62, 0.3], 32], [K.segundos4 + 0.3, [2.25, 0.65, 0.7], [0.02, 0.64, 0.3], 32],
    [K.craneo5, [3.9, 1.4, -2.4], [0, 0.6, -0.15], 34], [K.presion5, [3.5, 1.0, 2.0], [0, 0.65, -0.12], 34], [K.capas5, [2.9, 0.95, 1.3], [0, 0.72, -0.12], 33], [K.esas5, [2.2, 0.85, 1.0], [0, 0.75, -0.1], 32], [K.duelen5 + 0.3, [2.15, 0.88, 0.9], [0, 0.76, -0.1], 32],
    [K.nervio6, [2.8, 0.2, 2.6], [0.15, 0.2, 0.15], 34], [K.frente6, [1.0, 0.6, 3.5], [0.05, 0.5, 0.5], 34], [K.ahi6, [0.9, 0.62, 3.4], [0.05, 0.5, 0.5], 34],
    [K.n2012, [3.6, 0.75, 0.6], [0, 0.65, 0.1], 34], [K.abre7, [2.6, 0.72, 0.65], [0, 0.68, 0.2], 33], [K.cierra7, [2.7, 0.72, 0.6], [0, 0.68, 0.2], 33],
    [K.cierra7 + 0.6, [4, 0, 14], [0, -2, 0], 36], [K.comes8 + 0.3, [0, 4, 92], [0, -9.5, 16], 44], [K.n13 + 0.3, [0.6, 3.4, 88], [0, -9.5, 16], 44],
    [K.truco9 + 0.5, [2.2, -0.2, 3.6], [0, -0.3, 0.3], 34], [K.medicos9, [2.7, -0.4, 0.8], [0, -0.52, 0.4], 32], [K.paladar9, [2.5, -0.5, 0.75], [0, -0.56, 0.42], 32], [K.calentarlo9 + 0.1, [2.6, -0.5, 0.8], [0, -0.55, 0.42], 32],
    [K.calentarlo9 + 0.75, [-2.0, -0.9, 9.0], [0, -1.1, 0.3], 34], [K.mandaselo10, [-2.4, -1.2, 10.5], [0, -1.4, 0.3], 34], [END - 1.5, [6, 6, 40], [2, -4, -5], 38],
    [END, D[0], D[1], D[2]], [END + 0.6, [33, 84, 228], [18, -4, -22], 44],
  ];
  CKS = [A];
}
// el primer plano de neuronas va con su propia cámara (en las coordenadas del grupo de neuronas)
function camAt(t) {
  if (macK(t) && S.nrn) { const [a, b] = macT(), c = neuronsCam(clamp((t - a) / (b - a))), g = S.nrn.group;
    const p = v3(c[0], c[1], c[2]).multiplyScalar(NRN_SC).add(g.position), l = v3(c[3], c[4], c[5]).multiplyScalar(NRN_SC).add(g.position); return { p, l, f: c[6] || 34, roll: 0 }; }
  const st = camKeys(t, CKS[0]);
  const u = t - T_HIT; if (u > 0 && u < 0.35) { const a = 0.012 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; }
  return st;
}
// el fotograma anterior (para el desenfoque de movimiento) no cruza un corte de plano
function prevT(t, dt) { const a = t - dt; return macK(a) !== macK(t) ? t : a; }
function flashAt(t) { let f = 0; const mt = macT(); for (const [t0, k] of [[T_HIT, 0.035], [mt[0], 0.06], [mt[1], 0.05], [K.n27, 0.012], [K.calentarlo9, 0.02]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const c = st.l, yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), d = st.p.distanceTo(c);
  sunAt(c, d, yaw);
}
