// ---------------------------------------------------------------- cámara: entre las figuritas bajo el mazo → el campo desde la grúa → los códigos y la
// balanza → se zambulle en la página del libro abierto (blanco) → vuela por fuera del círculo de estaciones → vuelve al centro (bucle).
let CKS = [], CUTS = [];
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const T0 = [0.52, 0.15, 1.02], L0 = [0, 0.34, 0], TA = [0.58, 0.19, 1.16], LA = [0, 0.32, 0];
function buildCam() {
  const { B, CI, PE, AD, ME, PR, IN, SA, AB, JU, TO } = ANG;
  const g56 = gridPos(56), gc = S.gcenter;
  const cut = Math.round((K.dentro4 + 0.5) * 60) / 60; CUTS = [cut];
  const A1 = [
    [-1.0, TA, LA, 44], [0.0, T0, L0, 44], [T_HIT, [0.47, 0.14, 0.92], [0, 0.24, 0], 43],
    [K.tres1, [0.5, 0.36, 0.95], [0, 0.03, 0], 38], [K.cien1, [0.62, 0.55, 1.0], [0, 0, 0], 37], [K.derecho1, [-0.15, 0.32, 0.78], [0, 0.03, 0], 35],
    [K.jueces1, [g56.x + 0.13, 0.11, g56.z + 0.26], [g56.x, 0.04, g56.z], 33], [K.fiscales1 + 0.3, [g56.x + 0.17, 0.15, g56.z + 0.32], [g56.x - 0.02, 0.045, g56.z - 0.02], 33],
    [K.y2 + 0.1, [0.0, 0.27, 0.68], [0, 0.24, -0.6], 37], [K.carrera2, [0.06, 0.31, 1.2], [0, 0.2, 0.0], 38], [K.final2, [0.0, 0.33, 0.3], [0, 0.36, -0.6], 34], [K.falta2 + 0.05, [0.0, 0.39, -0.16], [0, 0.38, -0.55], 32],
    [K.cada3 + 0.1, [0.0, 0.6, 0.4], [0, 0.06, -0.5], 37], [K.veintiseis3, [1.0, 2.2, 3.0], [0, 0, -0.8], 40], [K.estudiantes3, [1.8, 4.6, 4.6], [0.2, 0, -1.2], 42],
    [K.plazas3, [2.2, 7.6, 5.6], [0.4, 0, -1.4], 42], [K.menos3, [1.6, 9.0, 5.0], [0.5, 0, -1.5], 40], [K.seiscientas3 + 0.6, [1.35, 9.5, 4.7], [0.5, 0, -1.5], 40],
    [K.crees4 + 0.35, [0.6, 0.95, 1.6], [0, 0.25, 0], 35], [K.memorizar4, [0.26, 0.56, 0.74], [0, 0.33, 0.05], 34], [K.realidad4 + 0.1, [0.0, 0.92, 2.95], [0, 0.55, -0.25], 38],
    [K.ganar4, [-0.42, 0.82, 2.65], [0, 0.58, -0.25], 38], [K.ellas4, [0.0, 0.84, 1.9], [0, 0.45, 0.42], 36], [K.asi4, [0.05, 0.64, 1.0], [0.1, 0.4, 0.52], 34],
    [cut - 0.0005, [0.17, 0.47, 0.62], [0.17, 0.4, 0.55], 32],
  ];
  const hold = (t, a, d, h, dx, ly, ldx, lr = R_ST, f = 34) => [t, stCam(a, d, h, dx), stLook(a, ly, ldx, lr), f];
  const A2 = [
    [cut, stCam(B, 9.35, 1.0, -0.32), stLook(B, 0.9, -0.34), 34], [K.romano5, stCam(B, 9.45, 1.02, -0.38), stLook(B, 0.92, -0.42), 34], [K.constitucional5, stCam(B, 9.7, 1.0, 0.0), stLook(B, 0.76, 0.0), 34],
    [K.teoria5 + 0.2, stCam(B, 9.85, 1.05, 0.3), stLook(B, 0.7, 0.4), 35], hold(K.civil6 - 0.25, B, 9.9, 1.07, 0.34, 0.71, 0.43, R_ST, 35),
    [K.civil6 + 0.15, stCam(CI, 10.2, 1.4), stLook(CI, 0.6), 35], [K.contratos6 + 0.1, stCam(CI, 9.4, 1.25, -0.1), stLook(CI, 0.56, -0.12, R_ST + 0.12), 34], [K.herencias6 + 0.1, stCam(CI, 9.5, 1.15, 0.2), stLook(CI, 0.58, 0.27, R_ST - 0.05), 34],
    [K.familia6 + 0.1, stCam(CI, 9.6, 0.95, -0.2), stLook(CI, 0.68, -0.3, R_ST - 0.4), 34], [K.todo6 + 0.1, stCam(CI, 8.9, 0.95, -0.12), stLook(CI, 0.56, -0.12, R_ST + 0.22), 32], [K.leer6 + 0.15, stCam(CI, 8.95, 0.92, -0.08), stLook(CI, 0.56, -0.11, R_ST + 0.22), 32],
    [K.penal7 + 0.15, stCam(PE, 9.9, 1.2, -0.2), stLook(PE, 0.6, -0.25, R_ST + 0.15), 34], [K.delito7, stCam(PE, 9.4, 0.85, 0.05), stLook(PE, 0.7, 0.05, R_ST - 0.12), 34], [K.pena7 + 0.1, stCam(PE, 9.45, 0.9, 0.35), stLook(PE, 0.7, 0.42, R_ST + 0.1), 34],
    [K.prueba7 + 0.1, stCam(PE, 9.0, 0.78, 0.08), stLook(PE, 0.72, 0.09, R_ST - 0.12), 32], hold(K.admin8 - 0.2, PE, 9.05, 0.8, 0.11, 0.72, 0.09, R_ST - 0.12, 32),
    [K.admin8 + 0.2, stCam(AD, 10.0, 0.9, 0), stLook(AD, 0.85, 0, R_ST - 0.25), 36], [K.defiende8 + 0.1, stCam(AD, 9.5, 0.95, 0.3), stLook(AD, 0.62, 0.36, R_ST + 0.2), 34],
    [K.ciudadano8 + 0.1, stCam(AD, 9.15, 0.66, -0.12), stLook(AD, 0.72, -0.08, R_ST + 0.1), 34], [K.administracion8 + 0.2, stCam(AD, 9.1, 0.6, -0.05), stLook(AD, 1.0, 0, R_ST - 0.3), 36], hold(K.mercantil9 - 0.12, AD, 9.12, 0.58, -0.03, 1.02, 0, R_ST - 0.3, 36),
    [K.mercantil9 + 0.2, stCam(ME, 10.0, 1.2, -0.25), stLook(ME, 0.8, -0.3, R_ST - 0.15), 35], [K.empresas9, stCam(ME, 9.6, 1.0, -0.3), stLook(ME, 0.85, -0.31, R_ST - 0.2), 34],
    [K.despidos9 + 0.1, stCam(ME, 9.5, 1.0, 0.1), stLook(ME, 0.65, 0.1, R_ST + 0.12), 34], [K.nominas9 + 0.1, stCam(ME, 9.45, 1.15, 0.38), stLook(ME, 0.57, 0.4, R_ST + 0.1), 34], hold(K.procesal10 - 0.08, ME, 9.4, 1.12, 0.41, 0.57, 0.4, R_ST + 0.1),
    [K.procesal10 + 0.25, stCam(PR, 10.1, 1.5, 0), stLook(PR, 0.6, 0, R_ST - 0.05), 35], [K.juicio10, stCam(PR, 9.4, 1.0, -0.15), stLook(PR, 0.7, 0, R_ST - 0.1), 34],
    [K.demanda10 + 0.1, stCam(PR, 9.3, 0.9, -0.2), stLook(PR, 0.75, -0.12, R_ST + 0.05), 34], [K.sentencia10 + 0.2, stCam(PR, 9.2, 0.95, 0.05), stLook(PR, 0.83, 0, R_ST - 0.1), 33], hold(K.internacional11 - 0.3, PR, 9.25, 0.97, 0.08, 0.83, 0.02, R_ST - 0.1, 33),
    [K.internacional11 + 0.2, stCam(IN, 9.8, 1.0, 0), stLook(IN, 0.97), 34], [K.europeo11 + 0.1, stCam(IN, 9.6, 1.05, 0.2), stLook(IN, 0.97), 35], [K.espana11, stCam(IN, 9.35, 1.1, -0.15), stLook(IN, 0.97), 34], hold(K.abogados12 - 0.4, IN, 9.3, 1.1, -0.18, 0.97, 0, R_ST, 34),
    [K.abogados12, stCam(SA, 9.4, 0.85, -0.42), stLook(SA, 0.68, -0.42), 33], [K.jueces12, stCam(SA, 9.4, 0.85, -0.14), stLook(SA, 0.68, -0.14), 33], [K.fiscales12, stCam(SA, 9.4, 0.85, 0.14), stLook(SA, 0.68, 0.14), 33],
    [K.notarios12, stCam(SA, 9.45, 0.85, 0.42), stLook(SA, 0.68, 0.42), 33], [K.pero12 + 0.1, stCam(SA, 10.3, 1.0, 0), stLook(SA, 0.72, 0, R_ST + 0.2), 36], [K.carrera12, stCam(SA, 10.15, 0.95, 0), stLook(SA, 0.78, 0, R_ST + 0.3), 36], hold(K.falta13 - 0.3, SA, 10.15, 0.96, 0.02, 0.78, 0, R_ST + 0.3, 36),
    [K.falta13 + 0.1, stCam(AB, 10.1, 1.2, -0.1), stLook(AB, 0.75, 0), 35], [K.master13 + 0.1, stCam(AB, 9.5, 0.95, 0.15), stLook(AB, 0.72, 0.12, R_ST + 0.3), 34], [K.practicas13 + 0.1, stCam(AB, 9.45, 1.0, 0.15), stLook(AB, 0.79, 0.12, R_ST + 0.13), 34],
    [K.examen13 + 0.1, stCam(AB, 9.45, 1.05, 0.12), stLook(AB, 0.86, 0.12, R_ST - 0.04), 34], [K.colegiarte13 + 0.2, stCam(AB, 9.75, 1.15, 0.02), stLook(AB, 0.9, 0.0, R_ST - 0.2), 35], hold(K.juez14 - 0.5, AB, 9.78, 1.16, 0.0, 0.9, -0.02, R_ST - 0.2, 35),
    [K.juez14 + 0.15, stCam(JU, 10.2, 1.25, 0), stLook(JU, 0.72, 0, R_ST - 0.15), 35], [K.test14, stCam(JU, 9.3, 1.0, -0.42), stLook(JU, 0.72, -0.46, R_ST + 0.2), 33], [K.orales14, stCam(JU, 9.5, 0.95, 0.12), stLook(JU, 0.68, 0.12, R_ST - 0.35), 34],
    [K.tribunal14 + 0.1, stCam(JU, 9.3, 0.82, 0.14), stLook(JU, 0.66, 0.12, R_ST - 0.42), 34], [K.escuela14, stCam(JU, 9.45, 1.0, 0.5), stLook(JU, 0.75, 0.5, R_ST + 0.18), 34], [K.barcelona14 + 0.1, stCam(JU, 9.55, 1.05, 0.48), stLook(JU, 0.86, 0.5, R_ST + 0.18), 34], hold(K.cuatro15 - 0.25, JU, 9.6, 1.06, 0.47, 0.87, 0.5, R_ST + 0.18),
    [K.cuatro15 + 0.1, stCam(TO, 9.7, 0.95, -0.1), stLook(TO, 0.72, -0.09), 36], [K.toga15, stCam(TO, 9.3, 0.9, 0.03), stLook(TO, 0.8, 0.03), 34], [K.despues15 + 0.3, stCam(TO, 9.4, 0.95, 0.04), stLook(TO, 0.82, 0.05), 34],
    [K.si16 + 0.3, stCam(TO, 9.9, 1.35, 0), stLook(TO, 0.62), 36], [K.guardalo16, [1.4, 1.6, 4.0], [0, 0.15, 0], 38], [K.dime16, [0.75, 0.55, 1.75], [0, 0.18, 0], 40],
    [END - 1.0, TA, LA, 44], [END, T0, L0, 44], [END + T_HIT, [0.47, 0.14, 0.92], [0, 0.24, 0], 43],
  ];
  CKS = [A1, A2];
}
function camAt(t) {
  const st = camKeys(t, t < CUTS[0] ? CKS[0] : CKS[1]);
  const u = t - T_HIT; if (u > 0 && u < 0.45) { const a = 0.012 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.6; }
  return st;
}
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// ---------------------------------------------------------------- destellos y blanco (la zambullida en la página)
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.16], [K.tres1, 0.05], [K.jueces1, 0.04], [K.ninguno2, 0.05], [K.plazas3, 0.06], [K.ganar4 + 0.3, 0.06], [K.romano5, 0.04], [K.delito7, 0.05], [K.defiende8 + 0.07, 0.07],
    [K.sentencia10, 0.08], [K.europeo11, 0.05], [K.ninguno12, 0.06], [K.colegiarte13 + 0.3, 0.06], [K.barcelona14, 0.05], [K.toga15 + 0.4, 0.12]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { const c = CUTS[0]; return t < c ? eio(clamp((t - (c - 0.3)) / 0.3)) : 1 - eo(clamp((t - c - 0.05) / 0.4)); }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.2, 1.2);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.12;
}
