// ---------------------------------------------------------------- cámara: un solo plano continuo alrededor del móvil (sin cortes) que acaba donde empieza (bucle)
let CKS = [];
const CUTS = [];
function buildCam() {
  const A0 = [[1.05, 1.42, 5.3], [0.02, 1.36, 0.35], 34];
  CKS = [
    [0, ...A0],
    [K.millones1 + 0.1, [0.72, 1.6, 5.85], [0.0, 1.5, 0.2], 34],
    [K.siete1, [0.35, 1.68, 6.15], [0.0, 1.44, 0.2], 34],
    [K.ni1 + 0.2, [0.85, 1.35, 5.8], [0.2, 0.95, 0.45], 34],
    [TT.land + 0.3, [1.0, 1.0, 4.6], [0.3, 0.58, 0.95], 34],
    [TT.morph1 + 0.1, [0.3, 1.15, 3.7], [0.0, 1.04, 0.85], 34],
    [K.segundo3 + 0.2, [0.1, 1.1, 3.4], [0.0, 1.05, WKZ], 34],
    [K.voz4 + 0.25, [-0.15, 1.05, 3.45], [0.0, 1.0, WKZ], 34],
    [K.d3_5 + 0.2, [0.75, 1.02, 3.35], [-0.06, 0.74, WKZ + 0.2], 34],
    [K.mueve5, [0.95, 0.86, 3.45], [0.0, 0.46, WKZ + 0.15], 34],
    [TT.slam, [0.82, 0.62, 3.05], [0.0, 0.3, WKZ + 0.1], 34],
    [K.subtitulos6 + 0.35, [0.25, 1.0, 4.15], [0.0, 0.68, WKZ], 34],
    [K.efecto7, [-0.2, 0.98, 4.05], [0.0, 0.7, WKZ], 34],
    [K.si11 + 0.1, [-0.05, 1.1, 4.3], [0.0, 0.9, 0.6], 34],
    [K.cuenta11, [0.18, 1.12, 2.95], [0.0, 1.0, 0.0], 34],
    [K.negocio11 + 0.3, [0.42, 1.55, 4.5], [0.04, 1.4, 0.2], 34],
    [K.kiria11 + 0.4, [0.42, 1.56, 4.45], [0.14, 1.45, 0.3], 34],
    [END - 1.0, [0.6, 1.5, 4.85], [0.06, 1.42, 0.3], 34],
    [END, ...A0],
  ];
}
function camAt(t) {
  const st = camKeys(t, CKS);
  for (const [t0, a0] of [[TT.land, 0.02], [TT.slam, 0.045]]) { const u = t - t0; if (u > 0 && u < 0.5) { const a = a0 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.5; } }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[TT.land, 0.04], [TT.slam, 0.1], [TT.suck + 0.42, 0.05], [K.kiria11, 0.04]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { return 0; }
function darkAt(t) { return 0; }
let NOWT = 0;
function stageAt(t, st) {
  NOW = t; NOWT = t;
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.35, 1.3);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.14;
  scene.fog.density = 0.02;
  stageAt2(t);
  post.uniforms.fade.value = 0;
}
