// ---------------------------------------------------------------- el escenario en cada instante: estaciones, mundo (amanecer o espacio), luces y transiciones
// Los tres saltos de lugar se hacen como pide REGLAS.md, acercándose a algo blanco hasta que llena la pantalla: la piel del avión
// («así es por dentro»), el chorro del cohete («mecánica orbital») y una nube de la Tierra («de aquí sale…», que sale de un cúmulo).
let CUT1 = 0, CUT2 = 0, CUT3 = 0;
function setCuts() { CUT1 = K.asi4 + 0.27; CUT2 = K.mecanica - 0.03; CUT3 = K.de11 - 0.03; }
const inSpace = t => t >= CUT2 && t < CUT3;
function whiteAt(t) {
  const w = (c, a, b) => (t < c ? win(t, c - a, a) : 1 - win(t, c, b));
  return Math.max(w(CUT1, 0.16, 0.2), w(CUT2, 0.2, 0.26), w(CUT3, 0.2, 0.28));
}
// destellos de golpe (cuando algo encaja o choca)
function flashAt(t) {
  let f = 0; const tLand = K.master1 + 0.42;
  for (const [t0, k] of [[K.no1 + 0.08, 0.1], [K.aero1 + 0.02, 0.07], [K.nota + 0.1, 0.05], [K.sobre, 0.04], [tLand, 0.12], [K.habilitante + 0.12, 0.06], [K.seis + 0.05, 0.06]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.07);
  return f;
}
const _sunD = new THREE.Vector3();
function stageAt(t, st) {
  NOW = t;
  const sp = inSpace(t);
  S.sky.material.uniforms.dawn.value = 1; S.sky.material.uniforms.space.value = sp ? 1 : 0; S.sky.material.uniforms.starK.value = sp ? 2.2 : 1.4;
  S.cfloor.visible = !sp; S.puffs.visible = !sp;
  for (const J of FXS) J.u.floorY.value = sp ? -1e9 : CLOUD_Y;
  gradAt(t); climbAt(t); familyAt(t); tunnelAt(t); aeroAt(t); wingAt(t); engineAt(t); orbitAt(t); formationAt(t);
  if (sp) for (const P of PUFFS) P.visible = false;
  // luces: siempre alrededor de lo que mira la cámara, con la principal del lado de la cámara; el sol bajo del amanecer como contraluz
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 6, 0.35, 2.6);
  const pw = sp ? 0.15 : t > CUT1 && t < K.aerod - 0.2 ? 1.25 : 0.9;
  rigAt(c, yaw, k, pw);
  const R = S.rig; _sunD.copy(sp ? S.earthU.sunDir.value : SUN);
  R.sun.position.copy(c).addScaledVector(_sunD, 40); R.sun.target.position.copy(c); R.sun.target.updateMatrixWorld();
  R.sun.intensity = sp ? 3.2 : 2.3; R.sun.color.set(sp ? 0xffffff : 0xffc89a); R.hemi.intensity = sp ? 0.0 : 0.45;
  scene.environmentIntensity = sp ? 0.18 : 1.0;
}
