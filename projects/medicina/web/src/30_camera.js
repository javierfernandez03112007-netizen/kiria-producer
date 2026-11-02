// ---------------------------------------------------------------- cámara: entre las figuritas bajo el martillo → la vitrina → los libros, los huesos y el negatoscopio → se zambulle
// en la lámina del atlas (blanco) → estaciones (cuerpo sano, lo que falla, clínicas, hospital, MIR) → corte al campo de los 15.000 → corte a la residencia,
// los años y quirófano o consulta → vuelve al centro (bucle)
let CKS = [], CUTS = [];
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const T0 = [0.52, 0.15, 1.02], L0 = [0, 0.34, 0], TA = [0.58, 0.19, 1.16], LA = [0, 0.32, 0];
function buildCam() {
  const { CS, LF, CL, HO, MI, RE, AN, DU } = ANG;
  const g56 = gridPos(56), me = fieldPos(ME_C, ME_R);
  const cut1 = Math.round((K.dentro3 + 0.5) * 60) / 60, cut2 = Math.round((K.mas9 - 0.05) * 60) / 60, cut3 = Math.round((K.y11 - 0.05) * 60) / 60; CUTS = [cut1, cut2, cut3];
  const A1 = [
    [-1.0, TA, LA, 44], [0.0, T0, L0, 44], [T_HIT, [0.47, 0.14, 0.92], [0, 0.24, 0], 43],
    [K.cuatro1, [0.5, 0.36, 0.95], [0, 0.03, 0], 38], [K.cien1, [0.62, 0.55, 1.0], [0, 0, 0], 37], [K.medicos1, [-0.15, 0.32, 0.78], [0, 0.03, 0], 35],
    [K.elegir1, [g56.x + 0.13, 0.11, g56.z + 0.26], [g56.x, 0.04, g56.z], 33], [K.dermatologos1 + 0.3, [g56.x + 0.17, 0.15, g56.z + 0.32], [g56.x - 0.02, 0.045, g56.z - 0.02], 33],
    [K.y2 + 0.1, [0.0, 0.27, 0.68], [0, 0.24, -0.6], 37], [K.carrera2, [0.06, 0.31, 1.2], [0, 0.2, 0.0], 38], [K.final2, [0.0, 0.33, 0.3], [0, 0.36, -0.6], 34], [K.falta2 + 0.05, [0.0, 0.39, -0.16], [0, 0.38, -0.55], 32],
    [K.crees3 + 0.35, [0.6, 0.95, 1.6], [0, 0.25, 0], 35], [K.memorizar3, [0.26, 0.56, 0.74], [0, 0.33, 0.05], 34], [K.huesos3 + 0.25, [0.05, 0.5, 0.95], [-0.05, 0.18, 0.1], 36],
    [K.realidad3 + 0.1, [0.0, 0.62, 1.55], [0, 0.3, -0.2], 38], [K.encontrar3, [-0.04, 0.42, 0.8], [-0.06, 0.24, -0.2], 34], [K.falla3 + 0.1, [-0.07, 0.3, 0.36], [-0.08, 0.215, -0.18], 30],
    [K.asi3, [0.05, 0.64, 1.0], [0.1, 0.4, 0.52], 34], [cut1 - 0.0005, [0.17, 0.47, 0.62], [0.17, 0.4, 0.55], 32],
  ];
  const hold = (t, a, d, h, dx, ly, ldx, lr = R_ST, f = 34) => [t, stCam(a, d, h, dx), stLook(a, ly, ldx, lr), f];
  const A2 = [
    [cut1, stCam(CS, 9.35, 1.0, -0.32), stLook(CS, 0.9, -0.34), 34], [K.anatomia4 + 0.1, stCam(CS, 9.3, 0.95, -0.38), stLook(CS, 0.78, -0.42), 34],
    [K.fisiologia4 + 0.15, stCam(CS, 9.4, 0.98, 0.0), stLook(CS, 0.85, 0.02), 34], [K.bioquimica4 + 0.2, stCam(CS, 9.5, 1.05, 0.35), stLook(CS, 0.9, 0.44), 35], hold(K.luego5 - 0.25, CS, 9.55, 1.06, 0.38, 0.9, 0.45, R_ST, 35),
    [K.luego5 + 0.15, stCam(LF, 10.0, 1.3), stLook(LF, 0.65), 35], [K.patologia5 + 0.1, stCam(LF, 9.35, 1.05, -0.3), stLook(LF, 0.8, -0.36), 34],
    [K.microbiologia5 + 0.1, stCam(LF, 9.2, 0.95, 0.02), stLook(LF, 0.58, 0.02, R_ST + 0.2), 33], [K.farmacologia5 + 0.15, stCam(LF, 9.35, 1.0, 0.33), stLook(LF, 0.65, 0.36), 34], hold(K.desde6 - 0.2, LF, 9.4, 1.0, 0.36, 0.65, 0.38, R_ST, 34),
    [K.desde6 + 0.2, stCam(CL, 10.1, 1.3, 0), stLook(CL, 0.7, 0), 35], [K.clinicas6 + 0.1, stCam(CL, 9.5, 0.95, -0.2), stLook(CL, 0.62, -0.24, R_ST + 0.25), 34],
    [K.corazon6 + 0.1, stCam(CL, 9.4, 1.05, -0.32), stLook(CL, 0.95, -0.36, R_ST - 0.2), 34], [K.cerebro6 + 0.1, stCam(CL, 9.35, 1.0, 0.05), stLook(CL, 0.85, 0.06), 34],
    [K.ninos6 + 0.1, stCam(CL, 9.35, 0.85, 0.36), stLook(CL, 0.66, 0.38, R_ST + 0.15), 34], hold(K.sexto7 - 0.2, CL, 9.4, 0.86, 0.38, 0.66, 0.4, R_ST + 0.15, 34),
    [K.sexto7 + 0.2, stCam(HO, 10.2, 1.4, 0), stLook(HO, 0.7, 0), 36], [K.entero7 + 0.1, stCam(HO, 9.6, 1.05, 0.25), stLook(HO, 0.72, 0.1, R_ST + 0.1), 35],
    [K.hospital7 + 0.2, stCam(HO, 9.45, 1.0, -0.1), stLook(HO, 0.75, -0.1, R_ST - 0.05), 34], hold(K.que8 + 0.1, HO, 9.45, 1.0, -0.12, 0.75, -0.12, R_ST - 0.05, 34),
    [K.falta8 + 0.3, stCam(MI, 10.0, 1.4, 0), stLook(MI, 0.7, 0), 35], [K.n200 + 0.1, stCam(MI, 9.2, 1.15, -0.08), stLook(MI, 0.68, -0.06, R_ST + 0.05), 33],
    [K.cuatro8 + 0.1, stCam(MI, 9.35, 1.05, 0.25), stLook(MI, 0.98, 0.3, R_ST - 0.1), 34], [K.media8 + 0.2, stCam(MI, 9.4, 1.1, 0.2), stLook(MI, 0.9, 0.22, R_ST - 0.1), 34],
    [K.fallo8, stCam(MI, 9.0, 0.95, -0.05), stLook(MI, 0.68, -0.05, R_ST + 0.08), 31], hold(cut2 - 0.0005, MI, 8.98, 0.94, -0.04, 0.68, -0.05, R_ST + 0.08, 31),
  ];
  const A3 = [
    [cut2, [1.0, 2.0, 6.4], [0, 0, 2.0], 40], [K.n15000 + 0.3, [1.4, 3.4, 7.0], [0, 0, 1.0], 42], [K.n9000 + 0.1, [2.0, 6.6, 7.8], [0.2, 0, 0.3], 42], [K.plazas9 + 0.4, [2.0, 8.2, 7.2], [0.2, 0, 0.0], 41],
    [K.tu9 + 0.1, [0.3, 2.4, 4.3], [-0.6, 0, 1.6], 38], [K.numero9 + 0.3, [-0.55, 0.5, 2.1], [me.x, 0.05, me.z], 35], [K.especialidad9 + 0.1, [-0.5, 0.42, 1.88], [me.x, 0.06, me.z], 33], [K.ciudad9 + 0.3, [-0.42, 0.62, 2.1], [me.x, 0.04, me.z - 0.06], 34],
    [K.este10 + 0.2, [0.8, 1.5, 5.4], [0, 0, 3.3], 38], [K.dermatologia10 + 0.3, [0.5, 0.85, 4.6], [0, 0, 3.45], 36], [K.agoto10 + 0.2, [0.15, 0.68, 4.35], [0, 0, 3.42], 34], [K.n500 + 0.3, [-0.4, 1.1, 5.0], [0, 0, 3.2], 37],
    [cut3 - 0.0005, [-0.5, 1.2, 5.2], [0, 0, 3.15], 37],
  ];
  const A4 = [
    [cut3, stCam(RE, 10.2, 1.3, 0), stLook(RE, 0.7, 0), 36], [K.cuatro11 + 0.1, stCam(RE, 9.6, 1.0, -0.1), stLook(RE, 0.68, -0.08, R_ST + 0.1), 34], [K.residencia11 + 0.4, stCam(RE, 9.5, 1.1, -0.05), stLook(RE, 0.85, -0.08, R_ST - 0.1), 34],
    [K.cobrando11 + 0.1, stCam(RE, 9.4, 0.95, 0.36), stLook(RE, 0.6, 0.42, R_ST + 0.15), 33], [K.guardias11 + 0.1, stCam(RE, 9.5, 1.15, 0.3), stLook(RE, 0.95, 0.35, R_ST - 0.2), 34], hold(K.seis12 - 0.25, RE, 9.55, 1.16, 0.3, 0.95, 0.35, R_ST - 0.2, 34),
    [K.seis12 + 0.15, stCam(AN, 9.6, 1.0, -0.15), stLook(AN, 0.75, -0.18, R_ST + 0.06), 34], [K.cinco12 + 0.2, stCam(AN, 9.55, 1.25, -0.12), stLook(AN, 0.98, -0.18, R_ST + 0.06), 34], [K.once12 + 0.1, stCam(AN, 9.9, 1.3, 0.0), stLook(AN, 0.92, 0.0), 36],
    [K.cirujano12 + 0.2, stCam(AN, 9.45, 1.0, 0.22), stLook(AN, 0.8, 0.24, R_ST + 0.05), 34], hold(K.si13 - 0.3, AN, 9.5, 1.0, 0.22, 0.8, 0.24, R_ST + 0.05, 34),
    [K.si13 + 0.2, stCam(DU, 10.4, 1.4, 0), stLook(DU, 0.7, 0), 37], [K.guardalo13, stCam(DU, 10.1, 1.25, 0), stLook(DU, 0.72, 0), 37],
    [K.quirofano13 + 0.1, stCam(DU, 9.5, 1.05, -0.4), stLook(DU, 0.8, -0.42), 35], [K.consulta13 + 0.12, stCam(DU, 9.5, 1.05, 0.38), stLook(DU, 0.78, 0.4), 35], [K.consulta13 + 0.4, stCam(DU, 10.0, 1.2, 0.2), stLook(DU, 0.75, 0.1), 36],
    [END - 0.25, TA, LA, 44], [END, T0, L0, 44], [END + T_HIT, [0.47, 0.14, 0.92], [0, 0.24, 0], 43],
  ];
  CKS = [A1, A2, A3, A4];
}
function camAt(t) {
  let i = 0; while (i < CUTS.length && t >= CUTS[i]) i++;
  const st = camKeys(t, CKS[i]);
  const u = t - T_HIT; if (u > 0 && u < 0.45) { const a = 0.012 * Math.exp(-u * 9); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.6; }
  return st;
}
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// ---------------------------------------------------------------- destellos y blanco (la zambullida en la lámina del atlas)
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.16], [K.cuatro1, 0.05], [K.ninguno2, 0.05], [K.falla3, 0.06], [K.anatomia4, 0.04], [K.patologia5, 0.04], [K.corazon6, 0.04], [K.sexto7, 0.04], [K.mir8, 0.05], [K.fallo8, 0.06],
    [CUTS[1], 0.14], [K.n9000, 0.06], [K.numero9 + 0.2, 0.05], [K.agoto10, 0.08], [CUTS[2], 0.14], [K.cobrando11, 0.04], [K.once12, 0.08], [K.quirofano13, 0.05], [K.consulta13, 0.05]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { const c = CUTS[0]; return t < c ? eio(clamp((t - (c - 0.3)) / 0.3)) : 1 - eo(clamp((t - c - 0.05) / 0.4)); }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.2, 1.6);
  rigAt(c, yaw, k, 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.12 + 0.25 * (t > CUTS[1] && t < CUTS[2] ? 1 : 0);
}
