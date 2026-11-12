// ---------------------------------------------------------------- cámara (como en Derecho): entre las bobinas cuando cae la caja → la portada de GTA 5 → la vitrina de
// GTA 6 → vuela al círculo de pedestales: los fajos y la medalla, las copias frente a Brasil, el coste (sello, maqueta, columna de los analistas), el precio y la
// balanza → vuelve al centro: las bobinas se levantan y la caja sube hasta la pose del primer fotograma (bucle).
let CKS = [], CUTS = [];
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const T0 = [0.5, 0.16, 1.1], L0 = [0, 0.42, 0], T1 = [0.485, 0.163, 1.07], L1 = [0, 0.415, 0], Tm = [0.52, 0.156, 1.14], Lm = [0, 0.425, 0];
function buildCam() {
  const { D, C, K: KK, P, B } = ANG;
  const hold = (t, a, d, h, dx, ly, ldx, lr = R_ST, f = 34) => [t, stCam(a, d, h, dx), stLook(a, ly, ldx, lr), f];
  const A = [
    [-0.4, Tm, Lm, 42], [0.0, T0, L0, 42], [0.5, T1, L1, 42], [T_HIT + 0.35, [0.5, 0.18, 1.05], [0, 0.32, 0], 41],
    [K.historia1, [0.68, 0.46, 1.15], [0, 0.14, 0], 40], [K.dinero1, [0.45, 0.55, 1.25], [0, 0.18, 0], 38], [K.videojuego1, [0.32, 0.36, 1.3], [0, 0.3, 0], 37],
    [K.es2 + 0.2, [0.08, 0.33, 1.12], [0, 0.3, 0], 36], [K.y2, [0.8, 0.58, 1.3], [0.38, 0.36, -0.4], 38], [K.sale2, [1.3, 0.6, 0.75], [0.56, 0.38, -0.5], 37],
    [K.cuanto2, [1.28, 0.56, 0.5], [0.57, 0.38, -0.5], 35], [K.final2 + 0.25, [1.26, 0.55, 0.42], [0.57, 0.38, -0.5], 34],
    // de la vitrina al pedestal D sin girar: la cámara retrocede en línea recta (la vitrina y el centro se alejan), sube, pasa por encima
    // del pedestal y baja delante de él; mira siempre hacia el centro (rumbo 217° → 206°), así que no hay barrido ni fotogramas vacíos
    [K.el3 + 0.2, [2.14, 0.95, 2.48], [0.35, 0.42, -0.3], 38], [K.gta3, [3.2, 1.55, 4.96], [0.3, 0.42, -0.2], 40],
    [K.gta3 + 0.4, [4.25, 1.75, 7.43], [2.5, 0.5, 3.83], 40], [K.gta3 + 0.85, stCam(D, 10.3, 1.35, -0.15), stLook(D, 0.72, -0.05), 38],
    [K.n800, stCam(D, 9.55, 1.0, -0.03), stLook(D, 0.8, -0.03), 36], [K.en3, stCam(D, 9.45, 0.92, -0.12), stLook(D, 0.72, -0.1, R_ST + 0.08), 35],
    [K.n1000, stCam(D, 9.55, 1.02, 0.04), stLook(D, 0.86, 0.04), 36], [K.record3, stCam(D, 9.7, 1.15, 0.06), stLook(D, 1.02, 0.06), 37], hold(K.lleva4 - 0.25, D, 9.72, 1.17, 0.07, 1.04, 0.07, R_ST, 37),
    [K.lleva4 + 0.35, stCam(C, 9.8, 1.55, -0.25), stLook(C, 0.56, -0.05), 40], [K.n230, stCam(C, 9.4, 1.3, -0.1), stLook(C, 0.56, -0.04), 38],
    [K.copias4, stCam(C, 9.28, 1.15, 0.04), stLook(C, 0.56, 0.0), 37], [K.mas4b, stCam(C, 9.22, 1.02, 0.14), stLook(C, 0.57, 0.1, R_ST + 0.02), 36],
    [K.brasil4, stCam(C, 9.15, 0.92, 0.28), stLook(C, 0.57, 0.28, R_ST + 0.05), 34], hold(K.y5 - 0.1, C, 9.14, 0.9, 0.3, 0.57, 0.3, R_ST + 0.05, 34),
    [K.y5 + 0.45, stCam(KK, 9.85, 1.02, -0.42), stLook(KK, 0.68, -0.45, R_ST + 0.2), 36], [K.rockstar5, stCam(KK, 9.3, 1.08, -0.1), stLook(KK, 0.6, -0.06, R_ST + 0.2), 35],
    [K.negar5, stCam(KK, 9.15, 0.95, -0.05), stLook(KK, 0.58, -0.05, R_ST + 0.26), 33], [K.costara5 + 0.3, stCam(KK, 9.2, 0.97, -0.02), stLook(KK, 0.58, -0.04, R_ST + 0.26), 33],
    [K.edificio5, stCam(KK, 9.6, 1.02, 0.22), stLook(KK, 0.95, 0.26, R_ST - 0.3), 36], [K.mundo5, stCam(KK, 9.7, 1.15, 0.2), stLook(KK, 1.02, 0.24, R_ST - 0.3), 37],
    [K.entre6, stCam(KK, 9.85, 1.08, 0.08), stLook(KK, 0.92, 0.06, R_ST - 0.3), 38], [K.cualquier6, stCam(KK, 9.95, 1.02, -0.16), stLook(KK, 0.85, -0.14, R_ST - 0.3), 39], hold(K.y7 - 0.2, KK, 9.97, 1.02, -0.17, 0.85, -0.15, R_ST - 0.3, 39),
    [K.y7 + 0.35, stCam(P, 9.95, 0.98, -0.02), stLook(P, 0.8, 0.0), 36], [K.n80, stCam(P, 9.85, 0.96, 0.0), stLook(P, 0.82, 0.02, R_ST + 0.05), 35], hold(K.euros7 + 0.35, P, 9.83, 0.96, 0.01, 0.82, 0.02, R_ST + 0.05, 35),
    [K.respuesta8 + 0.35, stCam(B, 10.6, 1.36, 0.0), stLook(B, 1.02, 0.0), 36], [K.tres8, stCam(B, 10.4, 1.3, 0.05), stLook(B, 1.0, 0.04), 35], [K.ano8, stCam(B, 10.32, 1.26, 0.08), stLook(B, 0.99, 0.07), 34],
    [K.mas8, stCam(B, 10.45, 1.28, 0.0), stLook(B, 1.01, 0.0), 35], [K.historia8 + 0.3, stCam(B, 10.6, 1.32, 0.0), stLook(B, 1.02, 0.0), 36],
    [K.pagarias9 + 0.3, stCam(B, 9.75, 1.12, 0.28), stLook(B, 1.0, 0.3, R_ST + 0.05), 34], [K.videojuego9, stCam(B, 9.7, 1.12, 0.32), stLook(B, 1.02, 0.34, R_ST + 0.05), 33],
    [K.videojuego9 + 0.5, stCam(B, 10.5, 1.65, -1.7), stLook(B, 1.0, -0.7), 38], [K.mandaselo9 + 0.35, [5.0 * Math.sin(205 * D2), 1.4, 5.0 * Math.cos(205 * D2)], [0, 0.3, 0], 42],
    [END - 2.2, [-1.7, 0.85, 1.0], [0, 0.3, 0], 42], [END - 1.4, [0.85, 0.34, 1.6], [0, 0.3, 0], 42], [END - 0.4, Tm, Lm, 42],
    [END, T0, L0, 42], [END + 0.5, T1, L1, 42],
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
  for (const [t0, k] of [[T_HIT, 0.16], [K.historia1, 0.04], [K.n1000, 0.04], [K.record3, 0.06], [K.brasil4, 0.05], [K.negar5 + 0.15, 0.07], [K.n80, 0.04], [K.mas8 + 0.3, 0.08]])
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
  const fk = t > K.videojuego9 && t < END - 1.3 ? 1 : win(t, K.final2 + 0.25, 0.3) * (1 - win(t, K.gta3 + 0.9, 0.3));
  coneFade(S.ctrCone, 0.05, t, st, fk); for (const k in ST) if (ST[k].Z.visible) coneFade(ST[k].cone, 0.055, t, st, fk);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.2, 1.2);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.12;
}
