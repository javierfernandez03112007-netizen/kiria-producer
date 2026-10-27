// ---------------------------------------------------------------- cámara: sartén (0,·,0) → la V vuela a la mesa (8,·,-14) → manuales → portátil → la F vuelve a la sartén
let CK = [], CK_OPEN = [];
const D = (x, y, z) => v3(DZ.x + x, y, DZ.z + z);
function follow(path, t0, t1, back = 1.0, up = 0.16, side = 0.08, us = [0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88]) {        // claves que siguen a una letra en vuelo
  return us.map(u => { const t = t0 + u * (t1 - t0), P = path(t).p, dir = path(t + 0.02).p.sub(path(t - 0.02).p).normalize(), sd = v3(-dir.z, 0, dir.x).normalize();
    return [t, P.clone().addScaledVector(dir, -back).add(v3(0, up, 0)).addScaledVector(sd, side).toArray(), P.clone().addScaledVector(dir, 0.3).toArray(), 34, 0.04 * (u - 0.5)]; });
}
function buildCam() {
  const A = anchors(), at = (x, y, z) => A.at(x, y, z).toArray(), arr = v => v.toArray();
  // primer segundo: dentro de las llamas, pegados al aceite ardiendo
  CK_OPEN = [
    [-1.5, [0.07, 0.2, 0.86], [0, 0.22, 0], 30, 0.02],
    [0.0, [0.05, 0.2, 0.74], [0, 0.23, 0], 30, 0.03],
    [0.85, [0.02, 0.3, 1.15], [0, 0.3, 0], 32, 0.0],
  ];
  CK = [
    ...CK_OPEN,
    [K.clase, [0.0, 0.42, 1.75], [0, 0.4, 0], 32],
    [K.verdadero + 0.15, [-0.04, 0.56, 2.2], [0, 0.52, 0], 32, -0.01],
    [K.piensalo, [0.0, 0.6, 2.15], [0, 0.56, 0], 32],
    [TV0(), [0.03, 0.62, 1.95], [0, 0.58, 0], 32, 0.01],
    // la V vuela hasta la hoja de respuestas (la cámara va detrás de ella)
    ...follow(vPath, TV0(), TV1()),
    [TV1() + 0.05, arr(A.sheetC.clone().add(v3(0.0, 0.52, 0.07))), arr(A.sheetC.clone().add(v3(0, 0, -0.01))), 32],
    [K.treinta - 0.1, arr(A.row37b.clone().add(v3(0.0, 0.32, 0.035))), arr(A.row37b), 32],
    [K.rojo + 0.2, arr(A.row37b.clone().add(v3(0.01, 0.29, 0.03))), arr(A.row37b), 32],
    // buscarla a mano: la mesa, la torre de manuales, las pestañas, el libro abierto
    [K.toca + 0.25, arr(D(1.55, 1.72, 1.75)), arr(D(-0.05, 0.82, 0.05)), 36],
    [K.manual3 + 0.1, arr(D(-0.78, 1.06, 0.58)), arr(D(-0.47, 0.84, 0.06)), 32],
    [K.tema + 0.1, arr(D(-0.16, 1.06, 0.22)), arr(D(-0.42, 0.82, 0.0)), 32],
    [K.pagina3 + 0.1, arr(D(-0.5, 1.02, 0.48)), arr(D(-0.18, 0.77, 0.14)), 32],
    [K.hojas + 0.1, arr(D(-0.5, 0.93, 0.3)), arr(D(-0.17, 0.765, 0.13)), 33],
    [K.indices + 0.15, arr(D(-0.42, 0.89, 0.22)), arr(D(-0.17, 0.76, 0.13)), 33],
    [K.apuntes + 0.35, arr(D(0.55, 1.25, 0.8)), arr(D(-0.12, 0.95, 0.05)), 34, 0.03],
    [K.manual4 + 0.05, arr(D(-0.62, 1.28, 0.85)), arr(D(-0.25, 0.92, 0.0)), 34, -0.02],
    [K.manual4b + 0.05, arr(D(-0.95, 1.18, 0.3)), arr(D(-0.35, 0.9, -0.1)), 34],
    [K.va + 0.1, arr(D(1.15, 1.45, 1.6)), arr(D(0.05, 1.05, -0.3)), 36],
    [K.tarde + 0.35, arr(D(1.05, 1.42, 1.5)), arr(D(0.05, 1.05, -0.3)), 36],
    // con Bomberados: por encima del hombro, y dentro de la pantalla
    [K.ahora + 0.2, arr(D(0.33, 1.3, 1.0)), arr(A.sc), 32],
    [K.bomberados5, arr(A.sc.clone().addScaledVector(A.sn, 0.68).add(v3(0, 0.03, 0))), arr(A.sc), 32],
    // (la app un poco más abajo en el encuadre: arriba van los subtítulos)
    [K.tocas - 0.15, at(0, 0.028, 0.43), at(0, 0.028, 0), 32],
    [K.fallado, at(0.0, 0.032, 0.4), at(0, 0.030, 0), 32],
    [K.inteligencia + 0.1, at(0.035, 0.018, 0.42), at(0, 0.023, 0.01), 32],
    [K.artificial + 0.6, at(-0.04, 0.028, 0.4), at(0, 0.028, 0.02), 32],
    [K.manual6 + 0.1, at(0.0, 0.064, 0.42), at(0, 0.064, 0.008), 32],
    [K.pagina6 + 0.3, at(0.008, 0.060, 0.4), at(0.003, 0.062, 0.008), 32],
    [K.define + 0.1, at(-0.006, 0.022, 0.42), at(0, 0.022, 0.008), 32],
    [K.rodeos + 0.4, at(0.006, 0.018, 0.41), at(0, 0.020, 0.008), 32],
    [K.compara + 0.1, at(0.0, -0.024, 0.44), at(0, -0.028, 0.008), 32],
    [K.trampa8 + 0.05, at(0.0, -0.040, 0.4), at(0.0, -0.040, 0.006), 32],
    [TF0(), at(0.0, -0.042, 0.36), at(0.012, -0.044, 0.006), 32],
    // «Falso.»: la F sale de la pantalla y la seguimos hasta la sartén
    ...[0.5, 1.0].map(k => { const t = TF0() + k * TF_OUT, P = fPath(t).p; return [t, P.clone().addScaledVector(A.sn, 0.42).addScaledVector(A.sr, 0.1 + 0.06 * k).add(v3(0, 0.12 - 0.07 * k, 0)).toArray(), P.toArray(), 32, 0.02 * k]; }),
    (() => { const t0 = TF0() + TF_OUT, t = t0 + 0.15 * (TF1() - t0), P = fPath(t).p; return [t, P.clone().addScaledVector(A.sn, 0.55).addScaledVector(A.sr, 0.18).add(v3(0, -0.05, 0)).toArray(), P.toArray(), 32, 0.03]; })(),
    ...follow(fPath, TF0() + TF_OUT, TF1(), 1.0, 0.14, -0.1, [0.38, 0.56, 0.72, 0.88]),
    [TF1() + 0.05, [0.3, 0.62, 1.95], [0.0, 0.58, 0], 32],
    [K.liquido, [-0.32, 0.6, 1.3], [-0.44, 0.52, 0], 32],
    [K.b10 + 0.1, [-0.4, 0.56, 1.2], [-0.45, 0.51, 0], 32],
    [K.pero + 0.25, [-0.15, 0.62, 1.7], [-0.2, 0.52, 0], 32],
    [K.cocina + 0.1, [0.05, 0.58, 1.65], [0.0, 0.5, 0], 32],
    [K.propia, [0.03, 0.66, 1.5], [0.0, 0.66, 0], 32],
    [K.f10 + 0.25, [0.0, 0.67, 1.38], [0.0, 0.67, 0], 32],
    [K.tu + 0.2, [0.0, 0.64, 2.3], [0, 0.6, 0], 32],
    [K.comentarios + 0.2, [0.1, 0.65, 2.2], [0.0, 0.61, 0], 32, -0.01],
    [K.bomberados12 + 0.25, [0, 0.78, 2.45], [0, 0.74, 0], 32],
    [K.examen12, [0, 0.77, 2.55], [0, 0.74, 0], 32],
    [END - 0.75, [0, 0.76, 2.6], [0, 0.74, 0], 32],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ' (' + CK[i][0].toFixed(2) + ')');
}
function blendCam(A, B, w) { return { p: A.p.clone().lerp(B.p, w), l: A.l.clone().lerp(B.l, w), f: lerp(A.f, B.f, w), roll: lerp(A.roll, B.roll, w) }; }
function camAt(t) {
  let c = camKeys(t, CK);
  const we = win(t, END - 0.72, 0.62); if (we > 0) c = blendCam(c, camKeys(t - END, CK_OPEN), we);   // golpe de vuelta a las llamas (bucle)
  let sh = 0; for (const [t0, a] of [[K.treinta, 0.006], [K.rojo, 0.003], [K.falso9, 0.01], [K.f10, 0.008], [K.bomberados12, 0.01]]) if (t > t0) sh += a * Math.exp(-(t - t0) * 8);
  if (sh > 1e-4) { const k = c.p.distanceTo(c.l); c.p.x += sh * k * Math.sin(t * 97); c.p.y += sh * k * Math.cos(t * 83); }
  return c;
}
// luces: en la sartén, de estudio y siguiendo a lo que se mira; en la habitación, el sol por la ventana (que se va) y la noche
const _dzc = v3(DZ.x, 0.9, DZ.z);
function rigFollow(l, t) {
  const R = S.rig, wr = clamp(1 - (l.distanceTo(_dzc) - 2.2) / 1.5), night = S.night || 0;
  if (wr < 0.5) {
    R.key.position.set(l.x - 1.7, Math.max(l.y, 0.6) + 3.0, l.z + 2.1); R.key.target.position.set(l.x, Math.max(0, l.y - 0.6), l.z); R.key.intensity = 16;
    R.rimC.position.set(l.x - 2.3, 0.6, l.z - 1.9); R.rimC.intensity = 1.0; R.rimW.position.set(l.x + 2.3, 0.7, l.z - 1.7); R.rimW.intensity = 1.4;
    R.fill.position.set(l.x + 0.6, l.y + 1.4, l.z + 3.2); R.fill.intensity = 1.6;
  } else {
    R.key.position.set(DZ.x + 0.35, 2.7, DZ.z - 2.7); R.key.target.position.set(DZ.x - 0.1, DY, DZ.z + 0.25); R.key.intensity = 46 * (1 - night) + 4;
    R.rimC.position.set(DZ.x + 0.05, 1.5, DZ.z - 0.55); R.rimC.intensity = 0.4 + 1.6 * night;
    R.rimW.position.set(DZ.x + 0.9, 1.25, DZ.z + 0.7); R.rimW.intensity = 0.7;
    R.fill.position.set(DZ.x + 0.5, 1.7, DZ.z + 1.9); R.fill.intensity = 1.3 - 0.5 * night;
  }
  R.key.target.updateMatrixWorld();
  R.fireL.position.set(PZ.x, 0.3, PZ.z); R.fireL.intensity = wr < 0.5 ? 4.5 * (S.firePow || 1) * (0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 9)) : 0;
  wpos(S.room.bulb, R.lampL.position); R.lampL.intensity = wr > 0.5 ? 3.2 * (S.lampOn || 0) : 0;
  const A = anchors(); R.screenL.position.copy(A.sc).addScaledVector(A.sn, 0.25); R.screenL.intensity = 1.2 * (S.screenOn || 0);
}
