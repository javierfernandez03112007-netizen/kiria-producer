// ---------------------------------------------------------------- cámara: un solo plano que recorre la maqueta. Empieza a ras de suelo junto a la figurita
// (la lluvia de ofertas, la señal de SALIDA) y acaba exactamente igual: el último fotograma enlaza con el primero.
let CKS = [];
const K0C = [[0.05, 0.075, 1.5], [0.0, 0.19, 0.72], 34];
function buildCam() {
  const D5 = FLY(5) + 0.062;                                                     // centro de las puertas de arriba
  CKS = [
    [0, ...K0C],
    [1.9, [0.045, 0.08, 1.45], [0.0, 0.2, 0.7], 34],
    [K.y2 + 0.05, [0.0, 0.11, 1.42], [-0.12, 0.24, 0.7], 34],                 // 2: sube y se ve la torre de ADE
    [K.empresas2 + 0.1, [-0.2, 0.5, 2.1], [-0.6, 0.42, 0.46], 34],
    [K.trampa3, [0.3, 0.46, 1.95], [0.0, 0.42, 0.3], 34],                     // 3: «tiene trampa»
    [K.cuento3 + 0.15, [0.15, 0.36, 1.55], [0.0, 0.34, 0.25], 34],
    [K.aparece4, [-0.55, 0.5, 2.25], [-0.78, 0.42, 0.46], 34],                // 4: las tres torres
    [K.segunda4 + 0.2, [-0.6, 0.52, 2.15], [-0.79, 0.43, 0.46], 34],
    [K.n4_5 + 0.15, [0.3, 0.52, 1.95], [0.0, 0.12, 0.62], 34],                 // 5: la plaza y las 100
    [K.trabajando5 + 0.3, [0.22, 0.4, 1.66], [0.0, 0.12, 0.45], 34],
    [K.n32_6, [0.12, 0.5, 1.9], [0.02, 0.36, 0.25], 34],                       // 6: el sueldo
    [K.ahora7, [0.06, 0.62, 2.3], [0.06, 0.6, 0.0], 34],                       // 7: de frente; se abre la fachada
    [K.solo7 + 0.3, [0.08, 0.66, 2.35], [0.06, 0.62, 0.0], 34],
    [K.universitario7 + 0.4, [0.06, 0.56, 2.05], [0.04, 0.5, 0.0], 34],
    [K.resto8 + 0.05, [-0.5, 0.21, 0.86], [-0.06, 0.06, -0.03], 34],          // 8: la planta baja, de lado (se caen los birretes)
    [K.carrera8 + 0.3, [-0.54, 0.19, 0.8], [-0.08, 0.055, -0.04], 34],
    [K.salen9, [0.85, 0.85, 2.35], [0.25, 0.12, 0.62], 34],                    // 9: llegan los nuevos por la derecha
    [K.nuevos9 + 0.3, [0.9, 0.95, 2.5], [0.15, 0.2, 0.55], 34],
    [K.tres10 + 0.15, [0.0, D5 + 0.03, 1.55], [0.0, D5, -0.2], 34],             // 10: las tres puertas de arriba
    [K.tipicas10 + 0.35, [0.0, D5 + 0.03, 1.4], [0.0, D5, -0.2], 34],
    [K.auditorias11 + 0.1, [-0.2, D5 + 0.02, 0.46], [-0.24, D5, -0.2], 34],     // 11: auditoría
    [K.estado11 + 0.2, [-0.18, D5 + 0.01, 0.42], [-0.235, D5 - 0.005, -0.2], 34],
    [K.banco12, [0.05, D5 + 0.02, 0.46], [0.0, D5, -0.2], 34],                  // 12: banca
    [K.aparte12 + 0.25, [0.06, D5 + 0.01, 0.42], [0.0, D5 - 0.005, -0.2], 34],
    [K.hacienda13, [0.2, D5 + 0.02, 0.46], [0.235, D5, -0.2], 34],              // 13: Hacienda (por delante del ascensor)
    [K.oposicion13 + 0.5, [0.2, D5 + 0.0, 0.44], [0.235, D5 - 0.015, -0.2], 34],
    [TT.tries[0], [-0.16, D5 + 0.04, 0.72], [-0.24, D5, -0.2], 34],             // 14: la llave prueba las tres
    [TT.tries[1], [0.06, D5 + 0.04, 0.72], [0.0, D5, -0.2], 34],
    [TT.tries[2] + 0.2, [0.19, D5 + 0.04, 0.72], [0.235, D5, -0.2], 34],
    [TT.fly + 0.5, [0.55, 0.72, 1.45], [0.18, 0.55, 0.22], 34],                 // 15: baja con la llave hasta el portal
    [TT.keyIn + 0.1, [0.36, 0.27, 1.05], [0.05, 0.13, 0.38], 34],
    [TT.openP + 0.15, [0.3, 0.26, 0.98], [0.02, 0.13, 0.34], 34],
    [K.despachos15 + 0.2, [0.05, 0.72, 2.45], [0.02, 0.64, 0.0], 34],           // «muchos despachos»: todo el edificio
    [K.cerradura15 + 0.3, [0.02, 0.74, 2.5], [0.02, 0.65, 0.0], 34],
    [K.atajos16, [0.2, 0.7, 2.45], [0.1, 0.6, 0.1], 34],                         // 16: salidas encendidas; la escalera «ATAJO»
    [K.ninguno16 + 0.5, [0.28, 0.62, 2.3], [0.15, 0.5, 0.2], 34],
    [K.salidas17, [0.22, 0.2, 1.75], [0.0, 0.2, 0.7], 34],                       // 17: vuelve a la plaza
    [K.banca17 + 0.2, [0.06, 0.08, 1.52], [0.0, 0.19, 0.72], 34],
    [END, ...K0C],
  ];
}
const _cf = new THREE.Vector3();
function camAt(t) {
  const c = camKeys(t, CKS);
  if (t > TT.fly && t < TT.keyIn) { const u = clamp((t - TT.fly) / (TT.keyIn - TT.fly)); keyFlight(t, _cf); c.l.lerp(_cf, Math.pow(Math.sin(Math.PI * u), 0.7) * 0.85); }   // sigue a la llave
  return c;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.cut, 0.03], [TT.openP + 0.1, 0.06], [TT.allOn, 0.025], [TT.ladX + 0.02, 0.03]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st0) {
  NOW = t;
  const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 3.2, 0.3, 1.1);
  rigAt(c, yaw, k, 0.8, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.16;
  scene.fog.density = lerp(0.12, 0.05, clamp((d - 0.6) / 2));
  sceneAt(t);
  post.uniforms.fade.value = 0;
}
