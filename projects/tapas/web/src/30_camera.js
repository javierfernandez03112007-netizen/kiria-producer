// ---------------------------------------------------------------- cámara: un solo plano. Empieza pegada a la caña y la tapa con su etiqueta «GRATIS» y acaba
// exactamente igual (el camarero pone otra tapa igual): el último fotograma enlaza con el primero.
let CKS = [];
const K0C = [[-0.03, 1.33, -0.06], [-0.26, 1.2, -0.68], 34];
function buildCam() {
  const S1 = [-0.05, 1.31, -0.13], L1 = [-0.26, 1.19, -0.68];
  CKS = [
    [0, ...K0C],
    [K.en2 - 0.1, S1, L1, 34],
    [K.aun2 + 0.2, [0.5, 1.8, 5.5], [0.0, 1.7, -0.4], 34],                      // 2: sale a la calle: el bar entero y la Alhambra
    [K.dinero2 + 0.4, [0.3, 2.2, 13.5], [0.0, 4.2, 0.0], 34],
    [K.dentro3 - 0.1, [0.2, 1.6, 4.4], [-0.2, 1.3, -0.6], 34],                  // 3: «te lo enseño por dentro»
    [K.ves3 + 0.15, [0.02, 1.45, 1.35], [-0.24, 1.24, -0.66], 34],
    [K.cuenta4 + 0.3, [0.75, 1.25, 5.0], [-0.35, 0.85, 0.95], 34],              // 4: el vaso gigante
    [K.iva5 + 0.2, [0.65, 1.15, 4.8], [-0.35, 0.8, 0.95], 34],
    [K.cerveza6 + 0.05, [0.25, 0.85, 2.0], [0.15, 0.0, 0.1], 34],               // 6: picado a la bodega
    [K.n50_6 - 0.15, [0.95, -1.0, 1.45], [0.2, -1.95, -0.6], 34],
    [K.centimos6 + 0.35, [1.0, -1.15, 1.3], [0.25, -1.85, -0.6], 34],
    [K.quedan7 + 0.3, [0.7, 1.1, 4.8], [-0.35, 0.85, 0.95], 34],                // 7: vuelve al vaso: lo que queda
    [K.ganar7 + 0.4, [0.95, 1.2, 5.2], [-0.3, 0.92, 0.95], 34],
    [K.primera8, [-0.12, 1.42, 0.5], [-0.2, 1.19, -0.68], 34],                   // 8: la barra: la segunda caña
    [K.segunda8 + 0.5, [-0.05, 1.42, 0.48], [-0.12, 1.19, -0.68], 34],
    [K.siguiente9, [0.12, 1.44, 0.52], [0.1, 1.19, -0.68], 34],                  // 9: las rondas
    [K.mejor9 + 0.4, [0.3, 1.45, 0.56], [0.3, 1.19, -0.68], 34],
    [K.sal10 + 0.2, [0.32, 1.38, 0.3], [0.3, 1.18, -0.66], 34],                  // 10: la sal
    [K.canas10 + 0.35, [0.3, 1.5, 0.78], [0.25, 1.2, -0.66], 34],
    [K.otro11 + 0.1, [0.3, 2.2, 13.5], [0.0, 4.1, 0.0], 34],                    // 11: a la calle
    [K.regalo12 + 0.1, [0.2, 2.3, 9.4], [0.0, 3.1, 2.4], 34],                   // 12: la tapa se convierte en el letrero
    [K.bar12, [0.0, 2.2, 10.6], [0.0, 2.7, 2.4], 34],
    [K.publicidad13 - 0.15, [-1.2, 2.6, 16.5], [-1.5, 2.7, 4.0], 34],          // 13: el anuncio de pago, entero al oír «publicidad», frente a la tapa
    [K.sirven13 + 0.2, [-1.3, 2.62, 16.9], [-1.55, 2.7, 4.0], 34],             //     se apaga con «ellos te la sirven…»
    [K.negocio14 + 0.1, [6.2, 3.8, 21.0], [7.0, 4.3, 2.6], 34],                // 14: las otras tiendas
    [K.tapa14 + 0.3, [7.4, 3.8, 21.5], [7.8, 4.4, 2.6], 34],
    [K.granada15 - 0.2, [0.4, 1.7, 2.6], [-0.25, 1.22, -0.6], 34],              // 15: vuelve a la barra
    [END - 1.0, [-0.03, 1.33, -0.05], [-0.26, 1.2, -0.68], 34],
    [END, ...K0C],
  ];
}
function camAt(t) { return camKeys(t, CKS); }
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.crack + 0.02, 0.03], [TT.reg + 0.05, 0.02], [TT.ringOn + 0.9, 0.05]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st0) {
  NOW = t;
  const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 3.2, 0.14, 3.2);
  rigAt(c, yaw, k, 0.6, 0.62);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.22;
  scene.fog.density = lerp(0.05, 0.012, clamp((d - 0.6) / 8));
  sceneAt(t);
  post.uniforms.fade.value = 0;
}
