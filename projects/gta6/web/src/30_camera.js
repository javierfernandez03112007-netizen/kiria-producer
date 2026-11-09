// ---------------------------------------------------------------- cámara: un solo plano. Empieza junto al móvil con la ciudad brotando y acaba
// exactamente igual (la ciudad vuelve a brotar): el último fotograma enlaza con el primero.
let CKS = [];
const K0C = [[1.6, 1.3, 4.5], [0.0, 0.75, 0.0], 34];
function buildCam() {
  const CY = CTOP;            // altura del suelo de la ciudad
  CKS = [
    [0, ...K0C],
    [K.salido1 + 0.2, [2.2, 1.7, 5.6], [0.0, 1.25, 0.0], 34],
    [K.movil1 + 0.15, [3.2, 2.4, 7.6], [0.0, 1.75, 0.0], 34],                                      // 1: la torre entera; la caja de 128 GB revienta
    [K.por2 + 0.3, [2.4, CY + 1.5, 5.2], [0.2, CY + 0.6, 0.0], 34],                               // 2: «¿por qué pesa tanto?»
    [K.abrirlo2 + 0.3, [0.9, CY + 0.95, 2.3], [0.0, CY + 0.15, 0.0], 34],                         //    «vamos a abrirlo»: a la ciudad
    [K.ocupa2 + 0.1, [0.25, CY + 0.5, 1.35], [-0.15, CY + 0.08, -0.2], 34],
    [K.hasta3, [2.9, 1.9, 6.6], [0.15, 1.55, 0.0], 34],                                             // 3: la torre con la regla: 212 GB
    [K.gigas3 + 0.3, [2.7, 1.75, 6.1], [0.15, 1.45, 0.0], 34],
    [K.n50000_4 + 0.25, [-0.3, 1.0, 3.4], [-1.0, 0.55, 0.2], 34],
    [K.doble4 - 0.25, [-0.2, 1.05, 3.55], [-0.9, 0.6, 0.2], 34],                               // 4: las canciones
    [K.doble4 + 0.45, [0.5, 1.3, 5.2], [0.48, 1.15, 0.0], 34],                                     //    el doble que Red Dead 2
    [K.fibra5 + 0.2, [-1.5, 0.42, 3.0], [-0.45, 0.12, 1.25], 34],                                  // 5: la fibra
    [K.hora5 + 0.2, [0.9, 0.75, 2.6], [0.0, 0.35, 0.4], 34],
    [K.codigo6 - 0.1, [-0.065, CY + 0.045, 0.95], [-0.14, CY + 0.015, 0.84], 34],                  // 6: el cubito de código, enorme…
    [K.realidad6 + 0.05, [-0.062, CY + 0.05, 0.957], [-0.14, CY + 0.016, 0.84], 34],
    [K.menos6 + 0.2, [-0.45, CY + 1.25, 2.5], [-0.14, CY + 0.0, 0.84], 34],                         //    …y diminuto
    [K.ves7 - 1.1, [-1.25, CY + 0.75, 0.62], [0.3, CY + 0.0, 0.58], 34],                          // 7: baja a la calle por arriba (sin atravesar edificios)
    [K.ves7 - 0.55, [-1.25, CY + 0.17, 0.62], [0.4, CY + 0.05, 0.56], 34],                          // 7: por la calle; se enciende todo
    [K.oyes7 + 0.4, [-0.62, CY + 0.17, 0.66], [0.6, CY + 0.06, 0.52], 34],
    [K.pared8, [0.02, CY + 0.2, 1.7], [0.02, CY + 0.15, 0.5], 34],                             // 8: la fachada, el coche y la cara
    [K.coche8 + 0.3, [0.03, CY + 0.17, 1.4], [0.03, CY + 0.12, 0.5], 34],
    [K.cara8 + 0.3, [0.15, CY + 0.1, 0.8], [0.2, CY + 0.085, 0.555], 34],                         //    la cara de la figurita, de cerca
    [K.enormes8, [0.15, CY + 0.5, 3.8], [0.08, CY + 1.65, -1.6], 34],                               //    las láminas, enormes, en el cielo
    [K.para8 + 0.15, [0.2, CY + 0.45, 3.0], [0.05, CY + 1.4, -1.2], 34],
    [K.cerca8 + 0.1, [-0.04, CY + 0.18, 0.92], [-0.04, CY + 0.18, 0.5], 34],                       //    de cerca: borrosa / nítida
    [K.borrosa8 + 0.35, [-0.04, CY + 0.18, 0.9], [-0.04, CY + 0.18, 0.5], 34],
    [K.voz9 + 0.1, [-0.1, CY + 0.16, 1.15], [0.1, CY + 0.08, 0.57], 34],                          // 9: voz, canción, calle
    [K.ruido9 + 0.2, [0.0, CY + 0.3, 1.5], [0.2, CY + 0.08, 0.3], 34],
    [K.sonido9 + 0.35, [1.6, 2.45, 4.0], [0.1, 1.9, 0.0], 34],                                     //    se guarda en la columna
    [K.ciudad10 + 0.2, [2.3, CY + 2.6, 3.7], [0.0, CY, -0.1], 34],                                 // 10: la ciudad entera
    [K.lista10 + 0.15, [-0.1, CY + 0.75, -1.9], [-0.35, CY + 0.0, -0.8], 34],                      //     el coche por el paseo
    [K.esperar10 + 0.3, [-0.1, CY + 0.75, 1.15], [-0.35, CY + 0.0, 1.6], 34],
    [K.respuesta11 + 0.1, [3.0, 2.6, 8.6], [0.0, 1.75, 0.0], 34],                                  // 11: la respuesta
    [K.no11 + 0.2, [0.8, CY + 0.6, 4.4], [0.0, CY + 0.5, 0.8], 34],
    [K.juego11 + 0.3, [0.75, CY + 0.55, 4.2], [0.0, CY + 0.5, 0.8], 34],                                //     no es un juego
    [K.te11b + 0.2, [2.0, 2.0, 5.6], [0.0, 1.2, 0.0], 34],                                         //     es una ciudad: baja al móvil
    [K.ciudad11 + 0.5, [1.5, 1.1, 3.4], [0.0, 0.3, 0.0], 34],
    [K.cada11 + 0.55, [0.07, 0.79, 1.0], [0.0, 0.72, 0.62], 34],                                   //     cada ladrillo, pintado
    [K.pintado11 + 0.3, [0.05, 0.775, 0.96], [0.0, 0.72, 0.62], 34],
    [K.playstation12 + 0.3, [0.95, 1.15, 2.15], [0.0, 0.3, 0.1], 34],                              // 12: votación y «haciendo hueco»
    [K.haciendo12, [0.85, 1.45, 2.3], [0.0, 0.42, 0.0], 34],
    [END - 0.9, [1.55, 1.25, 4.4], [0.0, 0.72, 0.0], 34],
    [END, ...K0C],
  ];
}
function camAt(t) { return camKeys(t, CKS); }
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.crack + 0.02, 0.05], [TT.n212 + 0.05, 0.03], [TT.padX + 0.05, 0.03], [TT.brick + 0.3, 0.02]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st0) {
  NOW = t;
  const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 3.0, 0.12, 2.6);
  rigAt(c, yaw, k, 0.7, 0.62);
  const R = S.rig; R.key.color.setHex(0xffd2b4); R.a.color.setHex(0xff5fae); R.b.color.setHex(0x47e6d6); R.f.color.setHex(0xc9d8ff);
  R.sun.intensity = 0; R.hemi.intensity = 0.28;
  scene.fog.density = lerp(0.03, 0.006, clamp((d - 0.3) / 6));
  sceneAt(t);
  post.uniforms.fade.value = 0;
}
