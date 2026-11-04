// ---------------------------------------------------------------- cámara: un solo plano continuo (sin cortes) que acaba donde empieza (bucle)
let CKS = [];
function buildCam() {
  const A0 = [[1.05, 0.8, 2.3], [0.0, 0.64, 0.05], 34];          // la polaroid con el tarro saliendo del papel, de lado
  CKS = [
    [0, ...A0],
    [K.una1, [0.45, 0.76, 2.45], [0.0, 0.6, 0.12], 34],
    [K.foto1 + 0.1, [-0.6, 0.86, 2.85], [0.0, 0.52, 0.3], 34],         // se ve que tiene fondo
    [TT.land, [-0.85, 0.86, 3.3], [0.0, 0.42, 0.66], 34],
    [K.producto2 + 0.3, [-0.6, 0.74, 3.2], [0.0, 0.38, 0.8], 34],   // 2: tu producto, en 3D (en la peana)
    [K.d3_2 + 0.25, [0.3, 0.7, 3.2], [0.0, 0.38, 0.8], 34],
    [K.subes3, [0.8, 0.86, 3.3], [0.0, 0.46, 0.5], 34],              // 3: la foto se revela y se mete en la peana
    [K.foto3 + 0.1, [1.45, 1.05, 3.1], [0.0, 0.5, 0.42], 34],
    [TT.upIn, [1.3, 0.98, 3.25], [0.0, 0.44, 0.75], 34],
    [K.caja3 + 0.35, [0.85, 0.9, 3.25], [0.0, 0.42, 0.8], 34],        // caja, bolsa, tarro, botella, lata, taza
    [K.tarro3 + 0.2, [0.05, 0.86, 3.32], [0.0, 0.42, 0.8], 34],
    [K.lata3 + 0.2, [-0.8, 0.88, 3.2], [0.0, 0.43, 0.8], 34],
    [K.taza3 + 0.2, [-0.65, 0.92, 3.25], [0.0, 0.45, 0.7], 34],
    [K.web4 + 0.3, [0.22, 1.2, 3.95], [0.0, 1.12, 0.12], 34],        // 4: el móvil sube: tu tienda online
    [K.giran4, [0.1, 1.18, 3.8], [0.0, 1.1, 0.15], 34],
    [K.comprarlo4 + 0.3, [-0.12, 1.14, 3.85], [0.0, 1.06, 0.12], 34],
    [K.redes4, [0.14, 1.18, 3.92], [0.0, 1.1, 0.12], 34],             // en redes
    [K.domingo5, [0.3, 1.24, 3.98], [0.05, 1.14, 0.12], 34],          // 5: el domingo, pruébalo con el tuyo
    [K.tuyo5, [0.08, 1.18, 3.85], [0.0, 1.1, 0.12], 34],
    [K.comenta6 + 0.3, [0.4, 1.32, 4.1], [0.1, 1.18, 0.2], 34],      // 6: comenta KIRIA
    [K.privado6 + 0.2, [0.3, 1.28, 4.0], [0.05, 1.14, 0.2], 34],
    [TT.pedBack0, [0.5, 1.12, 3.85], [0.0, 0.9, 0.3], 34],
    [TT.jarIn0, [1.0, 0.9, 3.0], [0.0, 0.62, 0.3], 34],
    [END - 0.35, ...A0],
    [END, ...A0],
  ];
}
function camAt(t) {
  const st = camKeys(t, CKS);
  const u = t - TT.land; if (u > 0 && u < 0.45) { const a = 0.012 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.upIn, 0.035], [TT.tap, 0.02], [TT.plane1, 0.03]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t;
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.35, 1.3);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.16;
  scene.fog.density = 0.02;
  stageAt2(t);
  post.uniforms.fade.value = 0;
}
