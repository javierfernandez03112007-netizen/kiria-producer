// ---------------------------------------------------------------- cámara: frente a la mano gigante en rayos X → retrocede en línea recta (sin girar) hasta el primer
// pedestal → la resonancia → el debate y el reloj → las manos de Unger → las radiografías y las 215 personas → vuelve rodeando la mano hasta la pose
// del primer fotograma (bucle).
let CKS = [], CUTS = [];
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const T0 = [0.5, 2.0, 4.2], L0 = [0, 2.35, 0], T1 = [0.49, 1.995, 4.15], L1 = [0, 2.345, 0], Tm = [0.51, 2.005, 4.25], Lm = [0, 2.355, 0];
function buildCam() {
  const { D, C, K: KK, P, B } = ANG;
  const hold = (t, a, d, h, dx, ly, ldx, lr = R_ST, f = 34) => [t, stCam(a, d, h, dx), stLook(a, ly, ldx, lr), f];
  const A = [
    [-0.4, Tm, Lm, 40], [0.0, T0, L0, 40], [0.5, T1, L1, 40],
    [K.artritis1, [0.9, 2.1, 4.0], [0, 2.3, 0], 40], [K.n50, [0.3, 1.9, 4.5], [0, 2.2, 0], 40], [K.razon2, [-0.4, 2.2, 4.3], [0, 2.3, 0], 40],
    [K.final2 + 0.25, [0.4, 1.9, 4.6], [0, 2.1, 0], 40],
    // al primer pedestal sin girar: retrocede mirando a la mano, pasa por encima del pedestal y baja delante de él
    [K.final2 + 0.79, [1.55, 1.75, 5.7], [0.0, 1.9, 0.0], 40], [K.final2 + 1.43, [2.7, 1.7, 6.85], [0.2, 1.4, 0.8], 40],
    [K.final2 + 1.83, [3.7, 1.75, 7.8], [2.3, 0.75, 4.6], 40], [K.final2 + 2.28, stCam(D, 10.3, 1.35, -0.15), stLook(D, 0.8, -0.05), 38],
    [K.tirar3, stCam(D, 9.55, 1.05, -0.05), stLook(D, 0.8, -0.02, R_ST + 0.06), 36], [K.presion3, stCam(D, 9.62, 1.08, 0.14), stLook(D, 0.8, 0.14, R_ST), 36],
    [K.golpe3, stCam(D, 9.38, 0.98, 0.0), stLook(D, 0.8, 0.0, R_ST + 0.06), 33], hold(K.n2015 - 0.25, D, 9.36, 0.97, 0.0, 0.8, 0.0, R_ST + 0.06, 33),
    [K.n2015 + 0.35, stCam(C, 10.15, 1.2, 0.04), stLook(C, 0.82, 0.04), 38], [K.resonancia4, stCam(C, 9.6, 1.05, 0.15), stLook(C, 0.95, 0.2, R_ST - 0.05), 35],
    [K.tercio4, stCam(C, 9.45, 1.02, 0.22), stLook(C, 0.97, 0.27, R_ST), 34], hold(K.discute5 - 0.45, C, 9.45, 1.02, 0.23, 0.97, 0.28, R_ST, 34),
    [K.discute5 + 0.15, stCam(KK, 9.75, 1.0, 0.0), stLook(KK, 0.72, 0.0, R_ST + 0.05), 37], [K.nacer5, stCam(KK, 9.6, 0.95, -0.12), stLook(KK, 0.7, -0.12, R_ST + 0.1), 35],
    [K.romperse5, stCam(KK, 9.6, 0.95, 0.12), stLook(KK, 0.7, 0.12, R_ST + 0.1), 35], [K.durar6, stCam(KK, 9.8, 1.1, 0.0), stLook(KK, 0.95, 0.0, R_ST - 0.15), 36],
    [K.crujir6, stCam(KK, 9.7, 1.0, -0.15), stLook(KK, 0.8, -0.15, R_ST), 35], hold(K.respuesta7 - 0.25, KK, 9.72, 1.0, -0.16, 0.8, -0.16, R_ST, 35),
    [K.respuesta7 + 0.35, stCam(P, 10.0, 1.15, 0.0), stLook(P, 0.95, 0.0), 37], [K.crujio7, stCam(P, 9.75, 1.05, -0.04), stLook(P, 0.95, -0.04, R_ST), 36],
    [K.dos7, stCam(P, 9.75, 1.05, -0.05), stLook(P, 0.96, -0.05), 36], hold(K.tuvo8 - 0.25, P, 9.8, 1.07, 0.0, 0.96, 0.0, R_ST, 36),
    [K.tuvo8 + 0.35, stCam(B, 10.2, 1.25, 0.0), stLook(B, 0.95, 0.0, R_ST - 0.1), 37], [K.ig8, stCam(B, 9.8, 1.05, 0.3), stLook(B, 0.85, 0.35, R_ST), 35],
    [K.n215, stCam(B, 9.9, 1.35, 0.0), stLook(B, 0.62, 0.0, R_ST + 0.2), 37], hold(K.tu9 - 0.25, B, 9.95, 1.36, 0.0, 0.62, 0.0, R_ST + 0.2, 37),
    // vuelta: sale de la estación hacia el hueco de 205° y rodea la mano hasta ponerse delante
    [K.tu9 + 0.3, stCam(B, 10.5, 1.75, -1.7), stLook(B, 1.0, -0.7), 38], [K.mandaselo9 + 0.4, [5.2 * Math.sin(205 * D2), 2.1, 5.2 * Math.cos(205 * D2)], [0, 2.1, 0], 42],
    [END - 2.0, [-3.9, 2.1, -0.4], [0, 2.2, 0], 42], [END - 1.15, [-2.3, 2.05, 3.4], [0, 2.3, 0], 41], [END - 0.4, Tm, Lm, 40],
    [END, T0, L0, 40], [END + 0.5, T1, L1, 40],
  ];
  CKS = [A];
}
function camAt(t) {
  const st = camKeys(t, CKS[0]);
  const u = t - T_HIT; if (u > 0 && u < 0.35) { const a = 0.008 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.06], [K.golpe3, 0.06], [K.nacer5, 0.03], [K.romperse5, 0.03], [K.ninguna8, 0.03], [K.ig8, 0.04]])
    if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { return 0; }
function coneFade(cone, base, t, st, k = 1) {        // el haz se apaga solo mientras la cámara atraviesa su superficie (si no, la pantalla se pone blanca); k: cuánto se aplica
  const w = new THREE.Vector3(); cone.getWorldPosition(w); const R0 = cone.geometry.parameters.radiusBottom, H = cone.geometry.parameters.height, y = st.p.y - (w.y - H / 2);
  const r = R0 + (0.06 - R0) * clamp(y / H), d = Math.hypot(st.p.x - w.x, st.p.z - w.z); cone.material.uniforms.op.value = base * (1 - k + k * clamp((Math.abs(d - r) - 0.05) / 0.2));
}
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const fk = t > K.tu9 - 0.2 && t < END - 1.3 ? 1 : win(t, K.final2 + 0.25, 0.3) * (1 - win(t, K.final2 + 2.6, 0.3));
  coneFade(S.ctrCone, 0.05, t, st, fk); for (const k in ST) if (ST[k].Z.visible) coneFade(ST[k].cone, 0.055, t, st, fk);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.2, 1.2);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.12;
}
