// ---------------------------------------------------------------- cámara: en la clínica (el cachorro, la vaca que revienta la pared, el guante) → se aleja y aparecen los
// animales grandes → se zambulle en la mancha blanca de la vaca (blanco) → estaciones (Anatomía, Farmacología, Microbiología, Producción, Cirugía, lo que comes,
// Reproducción) → corte a la clínica → perros y gatos o vacas y caballos → vuelve al primer fotograma mientras la pared se rebobina (bucle)
let CKS = [], CUTS = [];
const T_HIT = -0.14;          // el reventón empezó justo antes del primer fotograma (el primer fotograma ya es la pared saltando)
const stCam = (a, dist, h, dx = 0) => { const p = stP(a, dist, h).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const stLook = (a, y, dx = 0, r = R_ST) => { const p = stP(a, r, y).add(stT(a).multiplyScalar(dx)); return [p.x, p.y, p.z]; };
const T0 = [0.42, 0.45, 1.05], L0 = [-0.02, 0.64, -0.4], TA = [0.46, 0.47, 1.15], LA = [-0.02, 0.64, -0.4], T1 = [0.38, 0.44, 0.98], L1 = [-0.03, 0.66, -0.38];
function buildCam() {
  const { AN, FA, MI, PR, CI, SA, RE } = ANG;
  const cut1 = Math.round((K.anatomia4 - 0.12) * 60) / 60, cut3 = Math.round((K.asi11 - 0.08) * 60) / 60; CUTS = [cut1, cut3];
  const A1 = [
    [-1.0, TA, LA, 40], [0.0, T0, L0, 40], [0.3, T1, L1, 39],
    [K.curando1, [0.36, 0.48, 0.95], [0.06, 0.42, -0.05], 37], [K.gatos1, [0.12, 0.5, 1.08], [0.0, 0.38, 0.0], 37],
    [K.dia1, [0.5, 0.5, 1.05], [0.26, 0.47, 0.12], 36], [K.entero1, [0.7, 0.56, 1.0], [0.33, 0.5, 0.16], 36],
    [K.dentro1, [0.42, 0.62, 0.62], [0.0, 0.66, -0.3], 36], [K.vaca1 + 0.2, [0.28, 0.68, 0.42], [-0.04, 0.66, -0.3], 36],
    [K.por2 + 0.2, [0.3, 0.5, 0.95], [0.08, 0.4, 0.0], 36], [K.final2 + 0.2, [0.18, 0.5, 0.92], [0.06, 0.39, 0.0], 36],
    [K.mascotas3, [-0.06, 0.52, 1.0], [0.02, 0.36, 0.02], 36], [K.realidad3, [0.15, 0.62, 1.1], [0.0, 0.5, -0.15], 38],
    [K.muchos3, [0.9, 1.75, 3.0], [-0.3, 0.85, -0.8], 40], [K.vez3, [0.75, 1.95, 2.7], [-0.2, 1.0, -1.1], 40],
    [cut1 - 0.0005, [0.12, 1.62, -1.25], [0.05, 1.45, -1.65], 36],
  ];
  const hold = (t, a, d, h, dx, ly, ldx, lr = R_ST, f = 34) => [t, stCam(a, d, h, dx), stLook(a, ly, ldx, lr), f];
  const A2 = [
    [cut1, stCam(AN, 9.6, 0.9, 0.0), stLook(AN, 0.8, 0.0, 8.5), 34], [K.anatomia4 + 0.3, stCam(AN, 9.95, 1.05, 0.15), stLook(AN, 0.78, 0, 8.55), 35],
    [K.muchos4, stCam(AN, 10.2, 1.25, 0.1), stLook(AN, 0.75, 0, 8.4), 36], [K.perro4, stCam(AN, 10.0, 1.05, 0.05), stLook(AN, 0.76, 0.0, 8.6), 34],
    [K.gallina4 + 0.3, stCam(AN, 10.0, 1.1, -0.08), stLook(AN, 0.76, -0.05, 8.6), 34], hold(K.farmacologia5 - 0.3, AN, 10.0, 1.1, -0.1, 0.76, -0.06, 8.6, 34),
    [K.farmacologia5 + 0.1, stCam(FA, 9.9, 1.25, -0.1), stLook(FA, 0.85, 0.0, 8.05), 35], [K.mismo5, stCam(FA, 9.75, 1.15, -0.25), stLook(FA, 0.82, -0.15, 7.9), 34],
    [K.otra5, stCam(FA, 9.85, 1.2, 0.05), stLook(FA, 0.9, 0.05, 8.05), 35], [K.especie5 + 0.2, stCam(FA, 9.9, 1.25, 0.15), stLook(FA, 0.92, 0.1, 8.0), 35],
    hold(K.microbiologia6 - 0.28, FA, 9.92, 1.25, 0.17, 0.92, 0.11, 8.0, 35),
    [K.microbiologia6 + 0.05, stCam(MI, 9.3, 1.5, -0.28), stLook(MI, 0.6, -0.3, 7.7), 34], [K.parasitos6 - 0.15, stCam(MI, 9.25, 1.45, -0.22), stLook(MI, 0.6, -0.26, 7.72), 34], [K.parasitos6 + 0.25, stCam(MI, 9.6, 1.05, 0.25), stLook(MI, 0.62, 0.25, 8.3), 34],
    [K.enferma6, stCam(MI, 9.8, 1.2, 0.15), stLook(MI, 0.72, 0.25, 7.8), 34], [K.y6, stCam(MI, 10.0, 1.3, 0.0), stLook(MI, 0.75, 0.0, 8.0), 36],
    [K.ti6, stCam(MI, 9.75, 1.1, -0.2), stLook(MI, 0.7, -0.25, 8.3), 34], hold(K.produccion7 - 0.22, MI, 9.75, 1.1, -0.22, 0.7, -0.26, 8.3, 34),
    [K.produccion7 + 0.15, stCam(PR, 10.0, 1.45, 0.0), stLook(PR, 0.7, 0.0, 7.95), 36], [K.granjas7, stCam(PR, 9.9, 1.35, -0.15), stLook(PR, 0.72, -0.15, 7.75), 35],
    [K.alimentacion7, stCam(PR, 9.6, 1.05, -0.1), stLook(PR, 0.62, -0.08, 8.3), 34], [K.genetica7, stCam(PR, 9.7, 1.15, 0.2), stLook(PR, 0.85, 0.28, 8.25), 34],
    hold(K.cirugia8 - 0.25, PR, 9.72, 1.17, 0.22, 0.87, 0.29, 8.25, 34),
    [K.cirugia8 + 0.1, stCam(CI, 10.2, 1.7, 0.0), stLook(CI, 0.98, 0.0, 8.0), 36], [K.quirofano8, stCam(CI, 10.0, 1.6, -0.05), stLook(CI, 1.05, 0.0, 8.0), 36],
    [K.anestesia8, stCam(CI, 9.8, 1.45, 0.25), stLook(CI, 0.92, 0.18, 7.95), 35], [K.puntos8, stCam(CI, 9.55, 1.5, 0.02), stLook(CI, 0.9, 0.02, 7.98), 33],
    hold(K.y9 - 0.22, CI, 9.53, 1.5, 0.02, 0.9, 0.02, 7.98, 33),
    [K.y9 + 0.12, stCam(SA, 10.1, 1.3, -0.2), stLook(SA, 0.65, -0.2, 8.5), 35], [K.vigilas9, stCam(SA, 9.75, 1.05, -0.15), stLook(SA, 0.6, -0.12, 8.6), 33],
    [K.espana9, stCam(SA, 10.2, 1.25, 0.15), stLook(SA, 0.78, 0.2, 7.7), 36], [K.funcionar9, stCam(SA, 10.0, 1.15, 0.25), stLook(SA, 0.75, 0.25, 7.7), 35],
    [K.veterinario9, stCam(SA, 10.0, 1.15, 0.45), stLook(SA, 0.72, 0.42, 7.8), 35], [K.dentro9, stCam(SA, 9.95, 1.1, 0.35), stLook(SA, 0.72, 0.3, 7.75), 35],
    [K.revisando9 + 0.2, stCam(SA, 10.1, 1.2, 0.35), stLook(SA, 0.68, 0.35, 8.2), 35], [K.antes9, stCam(SA, 10.05, 1.15, 0.2), stLook(SA, 0.66, 0.25, 8.2), 35],
    [K.despues9, stCam(SA, 9.85, 1.05, -0.1), stLook(SA, 0.6, -0.12, 8.65), 33], hold(K.y10 - 0.25, SA, 9.83, 1.04, -0.11, 0.6, -0.12, 8.65, 33),
    [K.y10 + 0.1, stCam(RE, 10.7, 1.35, 0.15), stLook(RE, 0.92, 0.1, 7.95), 38], [K.reproduccion10, stCam(RE, 10.6, 1.3, 0.2), stLook(RE, 0.95, 0.15, 7.95), 38],
    [K.prenada10, stCam(RE, 10.2, 1.25, 0.4), stLook(RE, 1.0, 0.38, 7.95), 36], [K.palpa10, stCam(RE, 10.2, 1.3, 0.62), stLook(RE, 1.05, 0.58, 7.9), 36],
    [K.dentro10, stCam(RE, 10.05, 1.25, 0.6), stLook(RE, 1.03, 0.52, 7.92), 35], [K.metido10 + 0.2, stCam(RE, 10.3, 1.3, 0.62), stLook(RE, 1.02, 0.55, 7.92), 36],
    hold(cut3 - 0.0005, RE, 10.32, 1.31, 0.63, 1.02, 0.55, 7.92, 36),
  ];
  const A3 = [
    [cut3, [1.08, 0.66, 0.72], [-0.05, 0.4, -0.02], 36], [K.curar11, [1.0, 0.62, 0.6], [-0.05, 0.39, 0.0], 35],
    [K.pero11, [0.2, 0.5, 0.7], [0.0, 0.5, -0.2], 36], [K.vaca11 + 0.1, [0.3, 0.66, 0.45], [-0.04, 0.68, -0.3], 36],
    [K.perros12, [0.2, 0.5, 0.95], [0.04, 0.38, 0.0], 37], [K.vacas12, [0.6, 1.9, 3.1], [-0.4, 0.95, -0.9], 40], [K.leo12, [0.75, 1.95, 3.25], [-0.35, 0.95, -0.85], 40],
    [END - 1.0, [0.8, 0.6, 1.5], [-0.02, 0.56, -0.4], 40], [END - 0.25, TA, LA, 40], [END, T0, L0, 40], [END + 0.3, T1, L1, 39],
  ];
  CKS = [A1, A2, A3];
}
function camAt(t) {
  let i = 0; while (i < CUTS.length && t >= CUTS[i]) i++;
  const st = camKeys(t, CKS[i]);
  for (const th of [T_HIT, END + T_HIT]) { const u = t - th; if (u > 0 && u < 0.5) { const a = 0.014 * Math.exp(-u * 8); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.6; } }
  return st;
}
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// ---------------------------------------------------------------- destellos y blanco (la zambullida en la mancha blanca de la vaca)
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[T_HIT, 0.16], [END + T_HIT, 0.16], [K.entero1, 0.04], [K.muchos3, 0.04], [K.anatomia4, 0.04], [K.farmacologia5, 0.04], [K.microbiologia6, 0.04], [K.produccion7, 0.04], [K.cirugia8, 0.04], [K.quirofano8, 0.06],
    [K.matadero9, 0.04], [K.dentro9, 0.05], [K.despues9, 0.08], [K.reproduccion10, 0.07], [K.utero10, 0.05], [CUTS[1], 0.14], [K.vaca11, 0.05], [K.vacas12, 0.05]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { const c = CUTS[0]; return t < c ? eio(clamp((t - (c - 0.32)) / 0.32)) : 1 - eo(clamp((t - c - 0.05) / 0.4)); }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) {
  NOW = t; centerAt(t, st); stationsAt(t);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.2, 1.6);
  const xr = t > K.reproduccion10 && t < CUTS[1] ? win(t, K.reproduccion10, 0.5) : 0;
  rigAt(c, yaw, k, 1.15 * (1 - 0.55 * xr), 0.6);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.12 * (1 - 0.5 * xr);
}
