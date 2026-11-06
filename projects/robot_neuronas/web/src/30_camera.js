// ---------------------------------------------------------------- cámara: un solo plano que sigue al perro (claves relativas a su posición en el suelo).
// Empieza delante de él mientras anda hacia ti y acaba igual, PER metros más allá: el último fotograma es el primero.
let CKS = [];
const K0 = [[1.85, 0.98, 0.75], [0.05, 0.42, 0.0], 34];
function buildCam() {
  const C = CHIP_Y;
  CKS = [
    [0, ...K0],
    [0.6, [1.78, 0.95, 0.74], [0.08, 0.43, 0.0], 34],
    [K.cerebro1 + 0.12, [1.25, 0.7, 0.55], [0.42, 0.48, 0.0], 34],                 // «no tiene cerebro»: la cabeza
    [K.pero1 + 0.28, [0.85, 1.25, 0.6], [0.05, 0.55, 0.0], 34],
    [K.neuronas1 + 0.35, [0.3, 0.86, 0.24], [0.0, C, 0.0], 34],                       // «neuronas humanas vivas»: la cúpula
    [K.vivas1 + 0.45, [0.26, 0.84, 0.32], [0.0, C, 0.0], 34],
    [K.aprendido2 + 0.35, [2.3, 1.45, 2.0], [0.05, 0.8, 0.0], 34],             // 2: la pantalla con la pregunta
    [K.como2, [2.0, 1.3, 1.75], [0.05, 0.75, 0.0], 34],
    [K.digo2 + 0.25, [2.0, 1.6, 1.6], [0.05, 0.8, 0.0], 34],
    [K.cortical3 + 0.25, [-0.3, 3.4, 2.2], [0.3, 0.3, -0.35], 34],                  // 3: sube; Australia en el suelo
    [K.australia3 + 0.15, [0.25, 9.5, -0.82], [0.85, 0.0, -0.82], 34],
    [K.en4 - 0.12, [0.32, 9.1, -0.8], [0.84, 0.0, -0.8], 34],
    [K.chip4 + 0.25, [-0.14, 0.87, 0.14], [0.0, C, 0.0], 34],                        // 4: baja en picado al chip
    [K.electrodos4 + 0.3, [-0.17, 0.81, 0.1], [0.0, C, 0.0], 34],
    [K.crecen4 + 0.45, [-0.07, 0.83, 0.2], [0.0, C, 0.005], 34],
    [K.cultivadas4 + 0.2, [0.12, 0.8, 0.21], [0.0, C, 0.0], 34],
    [K.laboratorio4 + 0.5, [0.2, 0.76, 0.17], [0.0, C, 0.0], 34],
    [K.chip5 + 0.2, [0.23, 0.69, 0.18], [0.0, C + 0.004, 0.0], 34],                  // 5: señales y respuesta, a ras del chip
    [K.senales5 + 0.2, [0.19, 0.67, 0.12], [0.0, C, 0.0], 34],
    [K.escucha5, [0.15, 0.68, 0.21], [0.0, C, 0.0], 34],
    [K.responden5 + 0.3, [0.17, 0.73, 0.19], [0.0, C + 0.008, 0.0], 34],
    [K.programa6 + 0.18, [-0.9, 1.4, 1.95], [-0.1, 0.62, 0.2], 34],                // 6: el programa, los pasos
    [K.pasos6 + 0.1, [-1.15, 1.3, 1.85], [-0.1, 0.6, 0.2], 34],
    [K.izquierda6 - 0.08, [-2.6, 1.85, 0.4], [0.6, 0.2, 0.0], 34],                 // por detrás: izquierda y derecha se ven como son
    [K.adelante6 + 0.35, [-2.55, 1.85, 0.4], [0.65, 0.2, 0.0], 34],
    [K.objetivo7, [-2.4, 1.9, 0.45], [0.7, 0.15, 0.0], 34],                         // 7: hacia el objetivo
    [K.mapa7 + 0.35, [-2.3, 3.6, 0.15], [-0.45, 0.0, 0.0], 34],                       // «mapa»: la ruta, desde arriba
    [K.ojo8 + 0.05, [-2.25, 3.55, 0.18], [-0.42, 0.0, 0.0], 34],
    [K.no8 + 0.15, [1.5, 1.1, 2.2], [0.0, 0.6, 0.0], 34],                          // 8: «no es un cerebro»
    [K.cerebro8 + 0.45, [2.3, 1.6, 3.6], [0.0, 1.0, 0.0], 34],
    [K.millones8, [2.05, 1.7, 3.2], [0.0, 1.1, 0.0], 34],
    [K.aqui8 - 0.05, [1.75, 1.5, 2.7], [0.0, 1.0, 0.0], 34],
    [K.punado8 + 0.15, [0.3, 0.86, 0.28], [0.0, C, 0.0], 34],                         // «aquí hay un puñado»: la cúpula
    [K.chip9 - 0.05, [0.6, 1.05, 0.65], [0.0, 0.58, 0.0], 34],
    [K.chip9 + 0.4, [2.15, 1.45, 2.25], [0.18, 0.7, 0.0], 34],                         // 9: el despiece
    [K.motores9 + 0.2, [1.85, 1.1, 2.45], [0.15, 0.52, 0.05], 34],
    [K.maquina9 + 0.25, [2.3, 1.45, 2.15], [0.15, 0.6, 0.0], 34],
    [K.revisado10, [2.4, 1.3, 1.4], [0.0, 0.5, 0.0], 34],                          // 10: sin revisar
    [K.cientificos10 + 0.45, [2.2, 1.35, 1.8], [0.0, 0.55, 0.0], 34],
    [K.aprendido11 + 0.25, [1.9, 1.5, 1.9], [-0.05, 0.86, -0.05], 34],               // 11: la pantalla vuelve: Pong y el pasillo
    [K.neuronas11 + 0.2, [1.8, 1.4, 1.8], [0.0, 0.85, 0.0], 34],
    [K.jugaron11 + 0.15, [1.35, 1.35, 1.35], [-0.08, 1.0, -0.08], 34],
    [K.doom11 + 0.1, [1.2, 1.32, 1.2], [-0.05, 1.08, 0.0], 34],
    [K.le12 + 0.4, [0.6, 0.8, 2.7], [0.25, 0.46, 0.0], 34],                          // 12: de lado; gira la cabeza hacia ti
    [K.maquina12, [0.62, 0.8, 2.55], [0.25, 0.46, 0.0], 34],
    [K.neuronas12 + 0.25, [1.0, 0.9, 2.0], [0.1, 0.45, 0.0], 34],
    [END - 1.2, [1.6, 1.0, 1.15], [0.06, 0.42, 0.0], 34],
    [END, ...K0],
  ];
}
// la cámara va donde va el perro (su posición en el suelo, sin el balanceo del paso)
function camAt(t) { const c = camKeys(t, CKS), [x, z] = dogXZ(t); c.p.x += x; c.p.z += z; c.l.x += x; c.l.z += z; return c; }
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[K.chip4 + 0.2, 0.04], [TT.fb, 0.035], [K.cerebro8, 0.045], [K.revisado10, 0.035], [K.pong11, 0.03], [K.doom11, 0.04]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st0) {
  NOW = t;
  const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 5, 0.35, 1.4);
  rigAt(c, yaw, k, 0.85, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = 0.12;
  scene.fog.density = lerp(0.085, 0.022, clamp((st0.p.y - 1.5) / 5));
  dogAt(t); chipAt(t); mapAt(t); brainAt(t); screenAt(t); codeAt(t);
  post.uniforms.fade.value = 0;
}
