// ---------------------------------------------------------------- cámara: un solo plano. Empieza en el aula mirando la pizarra con el avión gigante encima
// y acaba igual: el último fotograma enlaza con el primero.
let CKS = [];
const K0C = [[1.4, 1.2, 3.7], [0.5, 3.55, -3.0], 34];
function buildCam() {
  const TX = TUN.x, TY = TUN.y, TZ = TUN.z;
  CKS = [
    [0, ...K0C],
    [K.avion1, [1.1, 1.35, 3.2], [0.4, 3.0, -3.0], 34],
    [K.mal1 + 0.1, [0.35, 1.72, 1.9], [0.2, 1.72, -3.0], 34],                                   // 1: la pizarra y la equis
    [K.nasa2 + 0.3, [0.3, 1.74, 2.1], [0.2, 1.74, -3.0], 34],
    [K.toneladas2 + 0.1, [6.5, 3.6, 13.5], [-4.0, 8.0, -12.0], 34],                             // 2: el avión de 575 t encima del aula
    [K.final2 + 0.2, [5.0, 3.0, 11.0], [-4.5, 7.5, -12.0], 34],
    [K.contaron3 + 0.2, [0.45, 1.95, 6.4], [0.2, 1.7, -0.8], 34],                               // 3: el ala sale de la pizarra
    [K.arriba3, [0.55, 1.78, 5.7], [TX + 0.05, TY + 0.05, TZ], 34],
    [K.vez3, [0.95, 1.7, 4.6], [TX + 0.55, TY, TZ], 34],                                        //    «a la vez»: el borde de salida
    [K.cita4 + 0.2, [0.95, 1.7, 4.5], [TX + 0.55, TY, TZ], 34],
    [K.viento4 + 0.2, [0.6, 1.78, 7.6], [0.6, TY, TZ], 34],                                     // 4: el túnel de viento entero
    [K.llega4, [0.75, 1.7, 6.2], [0.75, TY, TZ], 34],
    [K.antes4b + 0.3, [0.95, 1.66, 5.1], [0.95, TY, TZ], 34],                                   //    el de arriba llega antes
    [K.curva5 + 0.2, [0.7, 1.45, 4.8], [0.4, 5.5, -6.0], 34],                                   // 5: boca abajo, por encima del aula
    [K.abajo5 + 0.2, [0.6, 1.35, 4.6], [-0.6, 6.5, -6.5], 34],
    [K.clave6 + 0.2, [0.6, 1.78, 7.0], [0.6, TY, TZ], 34],                                      // 6: el ala se inclina
    [K.empuja6 + 0.3, [1.25, 1.5, 6.0], [1.05, TY - 0.15, TZ], 34],                             //    y empuja el aire hacia abajo
    [K.cientos7 + 0.25, [3.5, 6.0, 15.0], [6.0, 15.5, -34.0], 34],                              // 7: el avión y los bloques de aire
    [K.segundo7 + 0.2, [3.0, 6.5, 14.0], [3.5, 15.0, -34.0], 34],
    [K.si8 + 0.25, [0.7, 1.72, 6.2], [0.7, TY + 0.05, TZ], 34],                                 // 8: acción y reacción
    [K.arriba8, [0.65, 1.7, 5.8], [0.65, TY + 0.1, TZ], 34],
    [K.arriba9 + 0.1, [0.6, 1.66, 6.3], [0.6, TY, TZ], 34],                                     // 9: la presión
    [K.sube9 + 0.2, [0.55, 1.62, 6.1], [0.55, TY, TZ], 34],
    [K.levanta9, [6.0, 9.0, 16.0], [8.0, 21.0, -34.0], 34],                                     //    levanta el avión entero
    [K.entero9 + 0.3, [5.0, 10.0, 15.0], [6.0, 22.0, -34.0], 34],
    [K.flota10, [-1.5, 20.0, 20.0], [0.0, 17.0, -34.0], 34],                                    // 10: no flota: la estela
    [K.rato10 + 0.2, [-4.0, 19.0, 19.0], [-3.0, 16.0, -34.0], 34],
    [K.ventanilla11 + 0.3, [2.4, 4.4, 12.5], [0.4, 2.6, -3.0], 34],                            // 11: vuelve al aula
    [END - 1.0, [1.45, 1.22, 3.8], [0.5, 3.5, -3.0], 34],
    [END, ...K0C],
  ];
}
function camAt(t) { return camKeys(t, CKS); }
function prevT(t, dt) { return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.crack + 0.02, 0.04], [TT.nasa + 0.05, 0.02]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st0) {
  NOW = t;
  const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 3.0, 0.3, 4.0);
  rigAt(c, yaw, k, 0.35, 0.7);
  const R = S.rig; R.sun.intensity = 2.4; R.hemi.intensity = 0.95; R.hemi.color.setHex(0xbfdcff); R.hemi.groundColor.setHex(0x6a8a4a);
  R.key.color.setHex(0xfff1dc); R.a.color.setHex(0xcfe6ff); R.b.color.setHex(0xffe2c4); R.f.color.setHex(0xffffff);
  scene.fog.density = 0.0035;
  sceneAt(t);
  post.uniforms.fade.value = 0;
}
