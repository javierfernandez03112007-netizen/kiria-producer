// ---------------------------------------------------------------- cámara. Planos: A) un único plano de dron, desde arriba y detrás, siguiendo al avión que
// vuela sobre el valle (del principio a «te lo enseño al final»); B) la pizarra y la explicación (como estaba); la avioneta, con su
// propia cámara; C) y E) el túnel; D) y F) el avión en el cielo; G) vuelta al plano del dron (bucle: el último fotograma enlaza con el primero).
// Un plano «big» o «acro» lleva la cámara pegada al avión o a la avioneta (las claves son posiciones relativas).
let SHOTS = [], CUTS = [];
const K0C = [[96, 50, 30], [-12, 6, 0], 54];                      // dron: detrás, arriba y a la izquierda del avión (se ven las alas por encima)
function buildCam() {
  const TX = TUN.x, TY = TUN.y, TZ = TUN.z, SK = (a, l, f) => [a, l, f];
  SHOTS = [
    [0, [                                                                                     // A: el avión vuela sobre el valle (un solo plano)
      [0, ...K0C],
      [K.mal1, [89, 46, 34], [-11, 5, 0], 54],
      [K.n575_2 - 0.1, [78, 40, 38], [-9, 4, 0], 53],                                          //    575 t: más cerca
      [K.contaron3 - 0.4, [72, 37, 40], [-8, 3.5, 0], 53],
    ], 'big'],
    [K.contaron3 - 0.4, [                                                                     // B: la pizarra; el ala sale de ella; el «mito»; el túnel de viento
      [K.contaron3 - 0.4, [0.28, 1.66, 4.35], [0.02, 1.62, -3.0], 34],
      [K.ala3 + 0.05, [0.3, 1.66, 4.2], [0.02, 1.6, -3.0], 34],
      [TT.fly1 + 0.05, [0.5, 1.82, 6.3], [0.42, 1.6, TZ], 34],
      [K.camino3, [0.5, 1.77, 5.8], [0.45, 1.56, TZ], 34],
      [K.vez3, [0.7, 1.71, 5.5], [0.7, TY, TZ], 34],                                               //    «a la vez»
      [K.cita4 + 0.1, [0.8, 1.69, 5.35], [0.8, TY, TZ], 34],
      [K.viento4, [0.55, 1.8, 7.9], [0.55, TY, TZ], 34],                                           // 4: el túnel de viento
      [K.llega4, [0.6, 1.74, 6.9], [0.62, TY, TZ], 34],
      [K.antes4b + 0.2, [0.75, 1.7, 6.6], [0.78, TY - 0.03, TZ], 34],                              //    el de arriba llega antes
      [K.si5 - 0.05, [0.78, 1.7, 6.55], [0.8, TY - 0.03, TZ], 34],
    ]],
    [K.si5 - 0.05, [                                                                          // 5: la avioneta, con su propia cámara: se da la vuelta
      [K.si5 - 0.05, [20, 5, 32], [-1, 0, 0], 44],
      [K.boca5, [13, 5.5, 29], [0, 0, 0], 44],
      [K.clave6 - 0.08, [9, 5.5, 27], [-1, 0, 0], 44],
    ], 'acro'],
    [K.clave6 - 0.08, [                                                                       // C: el ala se inclina y empuja el aire hacia abajo
      [K.clave6 - 0.08, [0.55, 1.78, 7.2], [0.5, TY, TZ], 34],
      [K.inclinada6, [0.62, 1.72, 6.5], [0.6, TY - 0.04, TZ], 34],
      [K.empuja6 + 0.2, [0.95, 1.62, 6.3], [0.95, TY - 0.08, TZ], 34],
      [K.cientos7 - 0.03, [1.12, 1.6, 6.6], [1.1, TY - 0.12, TZ], 34],
    ]],
    [K.cientos7 - 0.03, [                                                                     // D: el avión en el cielo (desde detrás y abajo): los bloques de aire caen de las alas
      [K.cientos7 - 0.03, [26, -20, 96], [2, -12, 0], 52],
      [K.si8 - 0.03, [22, -19, 92], [2, -13, 0], 51],
    ], 'big'],
    [K.si8 - 0.03, [                                                                          // E: acción y reacción; la presión
      [K.si8 - 0.03, [0.78, 1.75, 7.3], [0.78, TY - 0.05, TZ], 34],
      [K.abajo8, [0.82, 1.7, 7.0], [0.8, TY - 0.05, TZ], 34],
      [K.arriba8, [0.72, 1.74, 6.9], [0.7, TY, TZ], 34],
      [K.arriba9 + 0.1, [0.5, 1.72, 7.0], [0.5, TY, TZ], 34],
      [K.sube9 + 0.3, [0.45, 1.66, 6.4], [0.45, TY, TZ], 34],
      [K.levanta9 - 0.05, [0.45, 1.64, 6.2], [0.45, TY, TZ], 34],
    ]],
    [K.levanta9 - 0.05, [                                                                     // F: el avión sube (la cámara no sube con él); no flota: la estela
      [K.levanta9 - 0.05, [26, -20, 96], [2, -12, 0], 52],
      [K.respuesta10, [36, -21, 92], [2, -12, 0], 52],
      [K.flota10, [62, -24, 82], [0, -15, 0], 53],
      [K.rato10, [70, -25, 80], [0, -16, 0], 53],
      [K.ventanilla11 - 0.03, [72, -25, 79], [0, -16, 0], 53],
    ], 'big'],
    [K.ventanilla11 - 0.03, [                                                                 // G: vuelta al dron del principio (bucle)
      [K.ventanilla11 - 0.03, [116, 60, 16], [-14, -40, 0], 54],                                  //    (el avión arriba: la encuesta va debajo)
      [END, ...K0C],
    ], 'big'],
  ];
  CUTS = SHOTS.slice(1).map(s => s[0]);
}
function camAt(t, tb = t) { let S0 = SHOTS[0]; for (const s of SHOTS) if (t >= s[0]) S0 = s; const c = camKeys(t, S0[1]); c.kind = S0[2] || 'room';
  if (c.kind !== 'room') { const B = c.kind === 'big' ? bigBase(tb) : acroPose(tb); c.p.x += B.x; c.p.y += B.y; c.p.z += B.z; c.l.x += B.x; c.l.y += B.y; c.l.z += B.z; }
  return c; }
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return c; return t - dt; }
function flashAt(t) { let f = 0; for (const [t0, k] of [[TT.crack + 0.02, 0.025], [TT.nasa + 0.05, 0.02]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
function stageAt(t, st0) {
  NOW = t;
  const R = S.rig, sun = R.sun, room = st0.kind === 'room';
  if (room) { const c = st0.l, d = st0.p.distanceTo(c), yaw = Math.atan2(st0.p.x - c.x, st0.p.z - c.z), k = clamp(d / 3.0, 0.3, 4.0); rigAt(c, yaw, k, 0.35, 0.7); }
  else { R.key.intensity = R.a.intensity = R.b.intensity = R.f.intensity = 0; }        // en el cielo, solo el sol y el cielo
  R.sun.intensity = room ? 2.4 : 2.9; R.hemi.intensity = room ? 0.95 : 0.75; R.hemi.color.setHex(0xbfdcff); R.hemi.groundColor.setHex(room ? 0x6a8a4a : 0x7b8270);
  R.key.color.setHex(0xfff1dc); R.a.color.setHex(0xcfe6ff); R.b.color.setHex(0xffe2c4); R.f.color.setHex(0xffffff);
  // la sombra del sol: en el aula, alrededor del aula; en el cielo, alrededor del avión (su sombra cae en el valle) o de la avioneta
  const T0 = room ? _p2.set(0, 0, 0) : (st0.kind === 'big' ? _p2.copy(bigPose(t)) : _p2.set(acroPose(t).x, acroPose(t).y, acroPose(t).z));
  if (st0.kind === 'big' && !bigPose(t).on) T0.copy(bigBase(t));
  const sc = sun.shadow.camera, half = room ? 9 : st0.kind === 'big' ? 46 : 12, dist = room ? 60 : 400;
  sun.target.position.copy(T0); sun.position.copy(T0).addScaledVector(SUN, dist); sun.target.updateMatrixWorld();
  if (sc.right !== half || sc.far !== (room ? 120 : 4500)) { sc.left = sc.bottom = -half; sc.right = sc.top = half; sc.near = 1; sc.far = room ? 120 : 4500; sc.updateProjectionMatrix(); }
  scene.fog.density = 0.00009; S.sky.position.copy(st0.p);
  sceneAt(t);
  post.uniforms.fade.value = 0;
}
