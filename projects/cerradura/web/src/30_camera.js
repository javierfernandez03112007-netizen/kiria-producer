// ---------------------------------------------------------------- cámara: portazo en rayos X → la radiografía abre la puerta → zambullida en la bocallave (negro) → el bombín
// cortado (pitones, llave, giro, cerrojo) → corte: planta del resbalón (portazo, cara inclinada, la lámina) → corte: 200 casas → corte: planta del cerrojo
// → corte: echa la llave → se abre la puerta y vuelve al principio (bucle)
let CKS = [], CUTS = [];
const kh = th => doorPt(LCX, LCY, 0.30, th);        // bocallave (con la puerta entreabierta)
function buildCam() {
  CUTS = [TT.cut1, TT.cut2, TT.cut3, TT.cut4, TT.cut5];
  const PM = [6.9, 12.3, 5.6], LMd = [3.3, 10.7, -2.4], P0 = [6.4, 11.7, 3.7], L0 = [3.0, 10.85, -3.4], P1 = [5.75, 11.4, 3.45], L1 = [4.0, 10.85, -0.2];
  const k1 = kh(0.085), n1 = v3(Math.sin(0.085), 0, Math.cos(0.085)), a = (d, dx = 0, dy = 0) => [k1.x + n1.x * d + dx, k1.y + dy, k1.z + n1.z * d];
  const A1 = [
    [-1.5, PM, LMd, 40], [0, P0, L0, 38], [K.portazo1, P1, L1, 36], [K.y1 + 0.05, [5.9, 11.7, 5.6], [4.15, 10.9, 0.2], 38],
    [K.radiografia1 + 0.2, [7.6, 12.0, 6.6], [4.6, 10.9, 0.3], 40], [K.puede1, [7.3, 11.9, 6.2], [4.45, 10.9, 0.2], 39], [K.abrirla1 + 0.3, [7.0, 11.8, 5.9], [4.25, 10.9, 0.0], 38],
    [K.como2 + 0.05, a(1.6, 0.6, 0.35), [k1.x, k1.y, k1.z], 34], [K.vamos2 + 0.15, a(0.45, 0.06, 0.05), [k1.x, k1.y, k1.z], 30], [TT.cut1 - 0.0005, a(0.035), [k1.x - n1.x * 0.2, k1.y, k1.z - n1.z * 0.2], 28],
  ];
  const SV = (z, d, y = 10.6, f = 30, dy = 0) => [[LCX + d, y + dy, z], [LCX, y, z]];
  const A2 = [
    [TT.cut1, [3.95, 10.62, 1.3], [3.6, 10.55, 0.2], 34], [K.cerradura2 + 0.2, [5.2, 11.5, 2.9], [3.75, 10.68, 0], 36], [K.final2, [4.4, 11.25, 3.4], [3.72, 10.68, 0], 36], [K.evitarlo2 + 0.3, [3.2, 11.1, 3.3], [3.72, 10.66, 0], 36],
    [K.dentro3 + 0.25, [4.6, 10.85, 1.4], [3.6, 10.6, 0.15], 34], [K.cilindro3 + 0.15, ...SV(0.14, 1.42), 30], [K.fila3, ...SV(0.12, 1.38), 30], [K.pitones3 + 0.2, ...SV(0.17, 1.3), 30], [K.muelles3 + 0.3, ...SV(0.16, 1.28, 10.63), 30],
    [K.sin4 + 0.1, ...SV(0.13, 1.5, 10.6), 32], [K.bloquean4 + 0.1, ...SV(0.15, 1.36, 10.6), 30], [K.giro4 + 0.3, ...SV(0.14, 1.45, 10.59), 31],
    [K.cada5, ...SV(0.24, 1.55, 10.6), 31], [K.sube5 + 0.1, ...SV(0.2, 1.45, 10.6), 30], [K.altura5 + 0.15, ...SV(0.165, 1.05, 10.62), 28], [K.justa5 + 0.2, ...SV(0.16, 1.0, 10.62), 28],
    [K.alinean5 + 0.05, ...SV(0.16, 1.4, 10.6), 30], [K.entonces6 + 0.2, ...SV(0.16, 1.45, 10.6), 31],
    [K.gira6 - 0.1, [4.95, 11.05, 3.1], [3.75, 10.42, 0.28], 36], [K.empuja6 + 0.2, [5.15, 10.95, 2.85], [3.85, 10.38, 0.18], 36], [K.cerrojo6 + 0.2, [5.3, 10.85, 2.3], [4.05, 10.3, 0.05], 35],
    [K.barra6 + 0.15, [5.5, 10.85, 2.4], [4.25, 10.25, 0], 35], [TT.cut2 - 0.0005, [5.6, 10.8, 2.25], [4.3, 10.22, 0], 34],
  ];
  const PV = (x, z, h, lz = 0, f = 34) => [[x, LY + h, z + h * 0.18], [x, LY, lz], f];
  const A2b = [
    [TT.cut2, [4.75, 12.55, 2.6], [4.1, 10.95, 0.05], 36], [K.resbalon7 - 0.1, ...PV(4.12, 0.0, 2.5, -0.05)], [K.cierra7 - 0.3, ...PV(4.05, -0.25, 3.3, -0.35)], [K.portazo7 + 0.2, ...PV(4.1, -0.15, 3.0, -0.2)],
    [K.cara8, ...PV(4.24, 0.0, 2.2, 0.0, 33)], [K.punto8 + 0.1, ...PV(4.27, 0.0, 1.9, 0.0, 32)], [K.lamina9 - 0.35, ...PV(4.3, 0.05, 2.0, 0.0, 32)],
    [K.lamina9 + 0.25, [6.6, 11.8, 7.8], [5.1, 10.95, 1.2], 38], [K.radiografia9 + 0.1, [6.2, 11.4, 6.6], [5.15, 10.95, 1.2], 37], [K.entra9 + 0.1, [5.6, 13.6, 4.4], [4.55, 10.95, 0.6], 36],
    [K.rendija9 + 0.1, [4.55, 13.4, 1.4], [4.3, 10.95, 0.25], 34], [K.empuja9, ...PV(4.3, 0.15, 2.0, 0.1, 34)], [K.cara9 + 0.2, ...PV(4.25, 0.05, 1.7, 0.02, 32)], [K.mete9, ...PV(4.22, 0.0, 1.75, -0.05, 32)],
    [TT.cut3 - 0.0005, ...PV(4.2, -0.05, 1.9, -0.1, 33)],
  ];
  const H = (x, y, z) => [HZC.x + x, HZC.y + y, HZC.z + z];
  const A3 = [[TT.cut3, H(-7.5, 2.0, 6.5), H(-3.0, 0.5, -1.5), 38], [K.denuncian10, H(-3.5, 4.4, 8.0), H(-1.0, 0.3, -3.5), 40], [K.n200 + 0.2, H(0.5, 9.5, 9.0), H(0.5, 0.0, -6.0), 42], [TT.cut4 - 0.0005, H(3.0, 12.5, 8.0), H(0.8, 0.0, -7.0), 42]];
  const BV = (x, z, h, lz = 0, f = 34) => [[x, BY + h, z + h * 0.18], [x, BY, lz], f];
  const A4 = [[TT.cut4, ...BV(4.15, 0.1, 2.6, 0.0)], [K.cerrojo11 + 0.3, ...BV(4.2, 0.05, 2.3, 0.0)], [K.recto11 + 0.1, ...BV(4.2, 0.12, 1.5, 0.05, 32)], [K.ninguna11, ...BV(4.4, 0.3, 2.5, 0.18)], [K.lamina11 + 0.3, ...BV(4.45, 0.32, 2.6, 0.2)],
    [TT.cut5 - 0.0005, ...BV(4.45, 0.3, 2.8, 0.2)]];
  const A5 = [
    [TT.cut5, [4.75, 11.0, 2.95], [3.72, 10.42, 0.2], 37], [K.echa12 + 0.3, [4.6, 10.95, 2.8], [3.72, 10.4, 0.15], 36], [K.minuto12, [4.8, 10.85, 2.6], [3.9, 10.33, 0.1], 36],
    [K.tu13 + 0.15, [4.0, 11.0, 4.5], [3.4, 10.5, 0], 36], [K.echas13, [2.6, 11.6, 16.0], [0.6, 10.5, 0], 40], [K.mandaselo13 + 0.2, [2.4, 11.8, 21.0], [0.4, 10.6, 0], 40],
    [END - 1.5, PM, LMd, 40], [END, P0, L0, 38], [END + K.portazo1, P1, L1, 36],
  ];
  CKS = [A1, A2, A2b, A3, A4, A5];
}
function camAt(t) {
  let i = 0; while (i < CUTS.length && t >= CUTS[i]) i++;
  const st = camKeys(t, CKS[i]);
  for (const [t0, a0] of [[K.portazo1, 0.05], [K.portazo7, 0.02]]) { const u = t - t0; if (u > 0 && u < 0.5) { const a = a0 * Math.exp(-u * 8); st.p.x += Math.sin(u * 91) * a; st.p.y += Math.sin(u * 77 + 1) * a; st.l.y += Math.sin(u * 83 + 2) * a * 0.5; } }
  return st;
}
function prevT(t, dt) { for (const c of CUTS) if (t >= c && t - dt < c) return t; return t - dt; }
// ---------------------------------------------------------------- destellos y fundido a negro (la bocallave)
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.portazo1, 0.14], [K.abrirla1, 0.05], [K.alinean5, 0.05], [K.cerrojo6, 0.04], [CUTS[1], 0.1], [K.portazo7, 0.07], [K.debil8, 0.05], [K.mete9, 0.07],
    [CUTS[2], 0.12], [K.n200, 0.1], [CUTS[3], 0.1], [K.mueve11, 0.05], [CUTS[4], 0.1], [K.llave12, 0.04]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { return 0; }
function darkAt(t) { const c = CUTS[0]; return t < c ? eio(clamp((t - (c - 0.36)) / 0.33)) : 1 - eo(clamp((t - c - 0.03) / 0.45)); }
// ---------------------------------------------------------------- un instante de la escena
function stageAt(t, st) {
  NOW = t; lockAt(t);
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 5, 0.25, 1.6), hs = inSeg(t, TT.cut3, TT.cut4);
  rigAt(c, yaw, k, hs ? 1.4 : 1.15, 0.6);
  const R = S.rig; R.sun.intensity = 0; R.hemi.intensity = hs ? 0.35 : 0.1;
  scene.fog.density = hs ? 0.028 : 0.016;
  post.uniforms.fade.value = darkAt(t);
}
