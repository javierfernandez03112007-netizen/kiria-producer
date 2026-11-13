// ---------------------------------------------------------------- cámara (como en Derecho y GTA): baja frente al chip cuando cae la alianza → la silla que se va → la
// vitrina con la carpeta → retrocede en línea recta (sin girar) hasta el primer pedestal → la carta y el consejo → la bolsa → el expediente y las siluetas →
// la balanza → vuelve al centro por el hueco de 205°: el chip se cierra y la alianza sube hasta la pose del primer fotograma (bucle).
let CKS = [], CUTS = [];
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const T0 = [0.18, 0.42, 2.25], L0 = [0, 0.5, 0], T1 = [0.176, 0.416, 2.21], L1 = [0, 0.498, 0], Tm = [0.184, 0.424, 2.29], Lm = [0, 0.502, 0];
function buildCam() {
  const { D, C, K: KK, P, B } = ANG;
  const hold = (t, a, d, h, dx, ly, ldx, lr = R_ST, f = 34) => [t, stCam(a, d, h, dx), stLook(a, ly, ldx, lr), f];
  const A = [
    [-0.4, Tm, Lm, 40], [0.0, T0, L0, 40], [0.5, T1, L1, 40], [T_HIT + 0.35, [0.2, 0.45, 2.12], [0, 0.46, 0], 40],
    [K.dimitido1, [0.3, 0.62, 2.25], [0.0, 0.52, -0.6], 38], [K.confesar1, [0.16, 0.7, 2.0], [0, 0.46, -0.3], 38], [K.infidelidad1, [0.08, 0.55, 1.98], [0, 0.44, 0], 38],
    [K.empresa2, [0.8, 0.6, 1.5], [0.45, 0.4, -0.4], 38], [K.investiga2, [1.25, 0.6, 0.8], [0.56, 0.38, -0.5], 37],
    [K.otra2, [1.28, 0.56, 0.52], [0.57, 0.38, -0.5], 35], [K.final2 + 0.25, [1.26, 0.55, 0.42], [0.57, 0.38, -0.5], 34],
    // de la vitrina al pedestal D sin girar: retrocede en línea recta mirando al centro, sube, pasa por encima del pedestal y baja delante de él
    [K.final2 + 0.79, [2.14, 0.95, 2.48], [0.35, 0.42, -0.3], 38], [K.final2 + 1.43, [3.2, 1.55, 4.96], [0.3, 0.42, -0.2], 40],
    [K.final2 + 1.83, [4.25, 1.75, 7.43], [2.5, 0.5, 3.83], 40], [K.final2 + 2.28, stCam(D, 10.3, 1.35, -0.15), stLook(D, 0.72, -0.1), 38],
    [K.anos3, stCam(D, 9.6, 1.08, -0.18), stLook(D, 0.6, -0.16, R_ST + 0.05), 36], [K.frente3, stCam(D, 9.5, 1.04, -0.12), stLook(D, 0.6, -0.1, R_ST + 0.08), 35],
    [K.nvidia3, stCam(D, 9.7, 1.1, 0.05), stLook(D, 0.85, 0.1), 36], [K.valiosa3, stCam(D, 9.85, 1.25, 0.15), stLook(D, 1.05, 0.2), 38], hold(K.domingo4 - 0.25, D, 9.9, 1.27, 0.16, 1.07, 0.2, R_ST, 38),
    [K.domingo4 + 0.35, stCam(C, 9.6, 1.25, -0.05), stLook(C, 0.58, -0.02, R_ST + 0.1), 37], [K.fui4, stCam(C, 9.15, 1.15, -0.04), stLook(C, 0.56, -0.04, R_ST + 0.28), 34],
    hold(K.mujer4 + 0.3, C, 9.13, 1.14, -0.04, 0.56, -0.04, R_ST + 0.28, 34),
    [K.consejo5 + 0.2, stCam(C, 9.5, 1.2, -0.3), stLook(C, 0.58, -0.3, R_ST - 0.1), 35], hold(K.investigacion5 + 0.35, C, 9.45, 1.17, -0.3, 0.58, -0.31, R_ST - 0.1, 35),
    [K.dimitio5, stCam(C, 9.6, 1.05, 0.25), stLook(C, 0.66, 0.28, R_ST - 0.15), 36], hold(K.jueves6 - 0.25, C, 9.65, 1.07, 0.27, 0.66, 0.3, R_ST - 0.15, 36),
    [K.jueves6 + 0.35, stCam(KK, 9.7, 1.1, -0.3), stLook(KK, 0.85, -0.3), 37], [K.abrir6, stCam(KK, 9.45, 1.0, -0.35), stLook(KK, 0.82, -0.36, R_ST + 0.1), 35],
    [K.hundio6, stCam(KK, 9.6, 1.05, 0.05), stLook(KK, 0.98, 0.05, R_ST - 0.2), 36], [K.n13, stCam(KK, 9.75, 1.1, 0.2), stLook(KK, 0.92, 0.22, R_ST - 0.1), 37], hold(K.respuesta7 - 0.25, KK, 9.78, 1.1, 0.22, 0.92, 0.23, R_ST - 0.1, 37),
    [K.respuesta7 + 0.35, stCam(P, 9.75, 0.98, -0.12), stLook(P, 0.62, -0.08, R_ST + 0.12), 36], [K.espionaje7, stCam(P, 9.4, 0.9, 0.0), stLook(P, 0.6, 0.04, R_ST + 0.2), 33],
    hold(K.extranjero7 + 0.3, P, 9.42, 0.9, 0.0, 0.6, 0.04, R_ST + 0.2, 33),
    [K.mujer8, stCam(P, 9.6, 1.0, -0.3), stLook(P, 0.75, -0.36, R_ST - 0.1), 35], [K.china8, stCam(P, 9.5, 0.98, -0.32), stLook(P, 0.76, -0.36, R_ST - 0.12), 34],
    [K.otra8, stCam(P, 9.7, 1.05, 0.2), stLook(P, 0.85, 0.28, R_ST - 0.2), 36], [K.directiva8, stCam(P, 9.6, 1.0, 0.24), stLook(P, 0.82, 0.3, R_ST - 0.18), 35], hold(K.crees9 - 0.25, P, 9.62, 1.0, 0.25, 0.82, 0.31, R_ST - 0.18, 35),
    [K.crees9 + 0.35, stCam(B, 10.6, 1.36, 0.0), stLook(B, 1.02, 0.0), 36], [K.obligar9, stCam(B, 10.4, 1.3, 0.05), stLook(B, 1.0, 0.04), 35], [K.dimitir9 + 0.2, stCam(B, 10.45, 1.32, 0.0), stLook(B, 1.0, 0.0), 35],
    [K.mandaselo9 - 0.1, stCam(B, 10.5, 1.65, -1.7), stLook(B, 1.0, -0.7), 38], [K.mandaselo9 + 0.6, [5.0 * Math.sin(205 * D2), 1.4, 5.0 * Math.cos(205 * D2)], [0, 0.35, 0], 42],
    [END - 1.9, [-1.6, 0.85, 1.6], [0, 0.45, 0], 41], [END - 1.2, [0.7, 0.5, 2.3], [0, 0.48, 0], 40], [END - 0.4, Tm, Lm, 40],
    [END, T0, L0, 40], [END + 0.5, T1, L1, 40],
  ];
  CKS = [A];
}
function camAt(t) {
  const st = camKeys(t, CKS[0]);
  const u = t - T_HIT; if (u > 0 && u < 0.45) { const a = 0.012 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.6; }
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.16], [K.valiosa3, 0.05], [K.investigacion5 + 0.17, 0.06], [K.dimitio5 + 0.3, 0.04], [K.abrir6, 0.05], [K.hundio6 + 0.05, 0.06], [K.espionaje7, 0.04]])
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
  // vuelos que cruzan haces: de la vitrina al pedestal D (entra y sale suave) y de la balanza al centro; fuera de ellos, el haz a su valor
  const fk = t > K.mandaselo9 - 0.1 && t < END - 1.3 ? 1 : win(t, K.final2 + 0.25, 0.3) * (1 - win(t, K.final2 + 2.6, 0.3));
  coneFade(S.ctrCone, 0.05, t, st, fk); for (const k in ST) if (ST[k].Z.visible) coneFade(ST[k].cone, 0.055, t, st, fk);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.2, 1.2);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.12;
}
