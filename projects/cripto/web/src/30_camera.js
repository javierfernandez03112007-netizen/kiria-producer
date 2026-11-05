// ---------------------------------------------------------------- cámara: un solo plano continuo (sin cortes) que acaba donde empieza (bucle)
let CKS = [];
function buildCam() {
  const A0 = [[1.3, 1.62, 2.15], [0.0, 1.0, -0.35], 34];          // el portátil con la videollamada y las monedas metiéndose en la pantalla
  CKS = [
    [0, ...A0],
    [K.recuperado2, [0.45, 1.6, 2.4], [0.0, 0.95, -0.6], 34],        // la cartera vacía, detrás
    [K.binance3 + 0.3, [-0.95, 1.75, 1.75], [0.0, 0.85, -1.4], 34],  // 3: la cartera caliente
    [K.conectadas3, [-0.75, 2.15, 1.95], [0.0, 1.55, -1.4], 34],     // … conectada a internet
    [K.ingenieros4, [0.5, 1.4, 2.15], [0.0, 0.98, 0.42], 34],      // 4: el portátil del ingeniero
    [K.videollamadas5, [0.16, 1.2, 1.95], [0.0, 0.98, 0.42], 34],   // 5: las videollamadas
    [K.prueba6, [-0.16, 1.18, 1.92], [0.0, 0.97, 0.42], 34],          // 6: la prueba
    [K.programa7, [0.45, 1.15, 1.7], [0.0, 0.86, 0.45], 34],          // 7: sale el programa espía
    [K.esperaron8, [0.95, 1.25, 1.4], [0.0, 0.42, -0.1], 34],         // 8: baja por el cable y espera
    [K.saltaron9, [0.0, 2.25, 2.95], [0.0, 0.85, 0.15], 40],          // 9: salta a los otros dos portátiles
    [K.ingenieros9, [0.0, 2.1, 2.8], [0.0, 0.85, 0.1], 40],
    [K.atacan10, [0.45, 1.95, 1.65], [0.0, 0.9, -1.45], 34],          // 10: el ataque
    [K.salen10, [0.0, 3.4, 3.9], [0.0, 1.3, -3.4], 38],               // … salen por diez cadenas de bloques
    [K.bloques10, [0.0, 4.6, 5.0], [0.0, 1.6, -4.6], 40],
    [K.mayor11, [0.3, 2.05, 5.2], [0.0, 1.3, 1.3], 42],           // 11: las torres del récord
    [K.record11, [-0.35, 1.9, 5.35], [-0.12, 1.1, 1.3], 42],
    [K.fbi12, [0.0, 3.6, 4.6], [0.0, 1.5, -3.6], 40],                 // 12: el FBI
    [K.congelado13, [1.6, 3.4, 3.7], [0.0, 1.5, -4.2], 40],           // 13: congelado
    [K.resto14, [0.6, 1.95, 2.45], [0.0, 0.85, -1.4], 34],            // 14: la cartera se vuelve a llenar
    [K.entrevista15, [0.32, 1.25, 2.05], [0.0, 0.97, 0.45], 34],        // 15: «si te piden descargar algo… sospecha»
    [K.sospecha15, [0.2, 1.2, 1.95], [0.0, 0.98, 0.45], 34],
    [END - 0.25, ...A0],
    [END, ...A0],
  ];
}
function camAt(t) {
  const st = camKeys(t, CKS);
  const u = t - TT.attack; if (u > 0 && u < 0.6) { const a = 0.02 * Math.exp(-u * 7); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.attack, 0.06], [TT.out0, 0.05], [TT.frz, 0.05], [TT.sus, 0.04]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t;
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.35, 1.3);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.16;
  scene.fog.density = 0.018;
  stageAt2(t);
  post.uniforms.fade.value = 0;
}
