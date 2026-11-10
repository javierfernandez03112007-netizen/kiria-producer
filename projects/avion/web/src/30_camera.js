// ---------------------------------------------------------------- cámara: planos con cortes limpios. Empieza en el aula mirando la pizarra con el avión
// gigante en el cielo, detrás (teleobjetivo), y acaba igual: el último fotograma enlaza con el primero.
let SHOTS = [], CUTS = [];
const K0C = [[0.9, 1.25, 6.8], [0.47, 2.63, -3.0], 36];
const bigAt = (t, dy = 0) => { const P = bigPose(t); return [P.x, P.y + dy, P.z]; };
// cámara del cielo: delante del avión, a un lado y por debajo (las alas abiertas a lo ancho y el aire que cae debajo, sobre cielo azul)
const SKY = [-73.7, -43.7, 60.8], skyCam = (t, k, y) => { const P = bigPose(t); return [P.x + SKY[0] * k, y - 57 + BIG.y0, P.z + SKY[2] * k]; }, bigLook = (t, y) => { const P = bigPose(t); return [P.x, y - 57 + BIG.y0, P.z]; };
function buildCam() {
  const TX = TUN.x, TY = TUN.y, TZ = TUN.z, ac = (t, dx = 0) => { const A = acroPose(t); return [A.x + dx, 14, -22]; };
  SHOTS = [
    [0, [                                                                                     // A: el aula, la pizarra, el avión; el ala sale de la pizarra; el túnel; la avioneta
      [0, ...K0C],
      [K.avion1, [0.72, 1.32, 6.0], [0.4, 2.45, -3.0], 35.5],
      [K.mal1 - 0.15, [0.32, 1.62, 4.1], [0.14, 1.62, -3.0], 34],                                  // 1: la equis
      [K.nasa2 - 0.45, [0.28, 1.62, 3.95], [0.13, 1.61, -3.0], 34],
      [K.nasa2 + 0.6, [0.22, 1.63, 3.75], [0.12, 1.62, -3.0], 34],                                 // 2: «INCORRECTA según la NASA»
      [K.sostiene2 + 0.1, [0.24, 1.66, 3.8], [0.0, 2.3, -3.0], 34],
      [K.avion2 + 0.1, [0.4, 1.5, 4.2], bigAt(K.avion2 + 0.1), 36],                                //    el avión de 575 t, en el cielo
      [K.toneladas2 + 0.3, [0.4, 1.5, 4.2], bigAt(K.toneladas2 + 0.3), 35.5],
      [K.final2 + 0.05, [0.4, 1.5, 4.2], bigAt(K.final2 + 0.05), 35],
      [K.contaron3 + 0.1, [0.3, 1.66, 4.4], [0.0, 1.58, -3.0], 34],                                // 3: vuelta a la pizarra: el ala sale de ella
      [TT.fly1 + 0.05, [0.5, 1.82, 6.3], [0.42, 1.6, TZ], 34],
      [K.camino3, [0.5, 1.77, 5.8], [0.45, 1.56, TZ], 34],
      [K.vez3, [0.7, 1.71, 5.5], [0.7, TY, TZ], 34],                                               //    «a la vez»
      [K.cita4 + 0.1, [0.8, 1.69, 5.35], [0.8, TY, TZ], 34],
      [K.viento4, [0.55, 1.8, 7.9], [0.55, TY, TZ], 34],                                           // 4: el túnel de viento
      [K.llega4, [0.6, 1.74, 6.9], [0.62, TY, TZ], 34],
      [K.antes4b + 0.2, [0.75, 1.7, 6.6], [0.78, TY - 0.03, TZ], 34],                              //    el de arriba llega antes
      [K.si5 + 0.1, [0.85, 1.6, 6.9], [0.7, 3.5, 0.0], 34],                                        // 5: arriba, la avioneta
      [K.curva5 + 0.05, [0.6, 1.3, 6.5], ac(K.curva5 + 0.05), 36],
      [K.boca5, [0.6, 1.3, 6.5], ac(K.boca5, 0.3), 36],
      [K.clave6 - 0.08, [0.6, 1.3, 6.5], ac(K.clave6 - 0.08, 1.2), 36],
    ]],
    [K.clave6 - 0.08, [                                                                       // C: el ala se inclina y empuja el aire hacia abajo
      [K.clave6 - 0.08, [0.55, 1.78, 7.2], [0.5, TY, TZ], 34],
      [K.inclinada6, [0.62, 1.72, 6.5], [0.6, TY - 0.04, TZ], 34],
      [K.empuja6 + 0.2, [0.95, 1.62, 6.3], [0.95, TY - 0.08, TZ], 34],
      [K.cientos7 - 0.03, [1.12, 1.6, 6.6], [1.1, TY - 0.12, TZ], 34],
    ]],
    [K.cientos7 - 0.03, [                                                                     // D: el avión en el cielo, de frente y desde abajo: los bloques de aire caen de las alas
      [K.cientos7 - 0.03, skyCam(K.cientos7, 1, 13.3), bigLook(K.cientos7, 60), 50],
      [K.si8 - 0.03, skyCam(K.si8, 0.95, 14), bigLook(K.si8, 59.5), 48],
    ]],
    [K.si8 - 0.03, [                                                                          // E: acción y reacción; la presión
      [K.si8 - 0.03, [0.78, 1.75, 7.3], [0.78, TY - 0.05, TZ], 34],
      [K.abajo8, [0.82, 1.7, 7.0], [0.8, TY - 0.05, TZ], 34],
      [K.arriba8, [0.72, 1.74, 6.9], [0.7, TY, TZ], 34],
      [K.arriba9 + 0.1, [0.5, 1.72, 7.0], [0.5, TY, TZ], 34],
      [K.sube9 + 0.3, [0.45, 1.66, 6.4], [0.45, TY, TZ], 34],
      [K.levanta9 - 0.05, [0.45, 1.64, 6.2], [0.45, TY, TZ], 34],
    ]],
    [K.levanta9 - 0.05, [                                                                     // F: el avión sube (cámara quieta); no flota: la estela, todo el rato
      [K.levanta9 - 0.05, skyCam(K.levanta9, 1, 13.3), bigLook(K.levanta9, 59), 50],
      [K.respuesta10, skyCam(K.respuesta10, 1, 13.5), bigLook(K.respuesta10, 59.5), 50],
      [K.flota10, skyCam(K.flota10, 1.02, 14), bigLook(K.flota10, 61), 50],
      [K.rato10, skyCam(K.rato10, 1.05, 14.5), bigLook(K.rato10, 61), 51],
      [K.ventanilla11 - 0.03, skyCam(K.ventanilla11, 1.06, 14.6), bigLook(K.ventanilla11, 61), 51],
    ]],
    [K.ventanilla11 - 0.03, [                                                                 // G: vuelta al aula (bucle)
      [K.ventanilla11 - 0.03, [1.25, 1.35, 8.6], [0.35, 2.9, -3.0], 37],
      [END, ...K0C],
    ]],
  ];
  CUTS = SHOTS.slice(1).map(s => s[0]);
}
function camAt(t) { let S0 = SHOTS[0]; for (const s of SHOTS) if (t >= s[0]) S0 = s; const c = camKeys(t, S0[1]);
  // golpe de la equis: un pequeño temblor
  const sh = Math.max(0, 1 - (t - TT.crack) / 0.35) * (t > TT.crack ? 1 : 0); if (sh > 0) { c.l.x += Math.sin(t * 90) * 0.035 * sh; c.l.y += Math.cos(t * 77) * 0.03 * sh; }
  return c; }
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return c; return t - dt; }
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
