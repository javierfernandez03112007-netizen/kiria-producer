// ---------------------------------------------------------------- cámara: siempre en movimiento. Desde el paseo, la torre de GTA 5 revienta la arena junto a la bobina gigante →
// barrido a la torre de cristal de GTA 6 (calendario e interrogación) → vuelo por el paseo hasta el contador de días (800 → 1.000 M$, la medalla) → la torre de
// cajas frente a la pirámide de Brasil → giro y vuelo por la orilla hasta el coste (el rascacielos, el «NO», la película más cara) → la etiqueta del precio →
// GTA 6 se llena y pasa a la película n.º 1 (grúa) → vuelta por encima de la plaza hasta el primer plano (bucle)
let CKS = [], CUTS = [];
const H0 = [0.6, 0.42, 8.2], L0 = [3.6, 2.75, -1.1], H1 = [0.65, 0.44, 7.85], L1 = [3.62, 2.78, -1.1], Hm = [0.63, 0.5, 8.75], Lm = [3.58, 2.72, -1.1];
function buildCam() {
  const A = [
    [-0.4, Hm, Lm, 48], [0.0, H0, L0, 48], [0.5, H1, L1, 48], [K.videojuego1 + 0.3, [0.8, 0.52, 7.3], [3.7, 2.95, -1.1], 47],
    [K.gta2, [0.9, 0.62, 9.2], [3.3, 3.0, -1.0], 47], [K.y2, [2.3, 1.2, 9.6], [5.3, 2.3, -0.6], 46],
    [K.sale2, [3.6, 1.55, 8.6], [6.5, 2.3, -0.4], 44], [K.cuanto2, [4.6, 1.5, 6.4], [6.85, 2.15, -0.5], 42], [K.final2 + 0.25, [4.9, 1.45, 5.7], [6.9, 2.05, -0.5], 42],
    [K.el3 + 0.3, [2.4, 1.0, 3.4], [1.3, 0.85, -6.0], 48], [K.el3 + 0.62, [0.72, 0.6, -0.8], [1.8, 0.7, -9.0], 48], [K.gta3 + 0.05, [0.95, 0.68, -3.2], [2.3, 0.75, -12.0], 48],
    [K.n800, [3.9, 0.92, -7.9], [2.3, 0.85, -12.4], 46], [K.en3, [4.05, 0.9, -8.15], [2.3, 0.88, -12.4], 46], [K.n1000, [4.12, 0.92, -8.3], [2.32, 0.98, -12.45], 46],
    [K.record3, [4.2, 1.05, -8.45], [2.4, 1.22, -12.5], 46], [K.lleva4 - 0.1, [4.25, 1.1, -8.55], [2.42, 1.28, -12.5], 46],
    [K.n230, [3.82, 1.35, -13.6], [3.85, 1.0, -20.6], 46], [K.copias4, [3.82, 1.42, -13.8], [3.88, 1.1, -20.65], 46], [K.brasil4, [3.82, 1.48, -14.0], [3.9, 1.18, -20.7], 46],
    [K.y5, [3.65, 1.5, -14.3], [4.4, 1.2, -20.4], 46], [K.y5 + 0.65, [1.6, 1.4, -16.0], [7.4, 1.0, -17.2], 47],
    [K.rockstar5, [1.15, 1.3, -16.35], [7.4, 1.0, -16.45], 46], [K.negar5, [1.05, 1.25, -16.38], [7.4, 1.05, -16.4], 45], [K.edificio5, [1.0, 1.3, -16.3], [7.4, 1.15, -16.25], 45],
    [K.mundo5, [1.0, 1.38, -16.3], [7.4, 1.25, -16.2], 45], [K.entre6, [1.05, 1.32, -16.45], [7.4, 1.15, -16.4], 45],
    [K.cualquier6, [1.25, 1.05, -16.7], [7.4, 0.85, -16.8], 45], [K.y7 - 0.1, [1.35, 1.05, -16.6], [7.4, 0.85, -16.8], 45],
    [K.ti7 + 0.25, [2.5, 1.25, -15.7], [7.0, 1.5, -8.0], 46], [K.euros7 + 0.2, [3.3, 1.3, -14.4], [6.5, 1.8, -4.0], 46],
    [K.respuesta8 + 0.15, [8.8, 1.7, -12.6], [6.0, 2.2, -1.0], 46], [K.segun8, [11.9, 1.9, -11.4], [5.8, 2.3, -1.0], 46], [K.tres8, [12.4, 2.0, -10.6], [5.8, 2.4, -1.0], 46],
    [K.ano8, [12.2, 2.3, -10.2], [5.8, 2.7, -1.0], 46], [K.pelicula8, [12.1, 3.0, -10.0], [5.8, 3.2, -1.0], 46], [K.historia8 + 0.3, [12.0, 3.8, -9.8], [5.7, 3.4, -1.0], 46],
    [K.pagarias9 + 0.3, [12.4, 3.4, -4.5], [5.2, 2.9, -1.0], 47], [K.videojuego9, [11.2, 2.8, 4.0], [4.6, 2.7, -1.0], 48],
    [K.mandaselo9, [7.4, 2.0, 9.4], [4.0, 2.7, -1.1], 48], [END - 1.2, [2.2, 0.9, 10.2], [3.7, 2.7, -1.1], 48], [END - 0.4, Hm, Lm, 48],
    [END, H0, L0, 48], [END + 0.5, H1, L1, 48],
  ];
  CKS = [A];
  { const st = camKeys(K.diecinueve2 + 0.4, A); S.cal.rotation.y = Math.atan2(st.p.x - PZ.cal.x, st.p.z - PZ.cal.z); }
  { const st = camKeys(K.n800, A); S.dayBoard.rotation.y = Math.atan2(st.p.x - ST1.sign.x, st.p.z - ST1.sign.z); }
}
function camAt(t) {
  const st = camKeys(t, CKS[0]);
  const te = eruptT(t), sh = 0.012 * Math.exp(-Math.max(0, te - ERUPT0) * 3.5) * (te < 1.6 ? 1 : 0);      // la arena tiembla cuando sale la torre
  st.p.x += Math.sin(t * 41) * sh + 0.004 * Math.sin(t * 1.3); st.p.y += Math.sin(t * 33 + 1) * sh + 0.003 * Math.sin(t * 1.7 + 2);
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.n1000 + 0.3, 0.03], [K.record3, 0.04], [K.brasil4, 0.03], [K.mundo5 - 0.05, 0.04], [K.euros7, 0.03], [K.pelicula8, 0.05]])
    if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; cityAt(t, st); moneyAt(t);
  const c = st.l, d = st.p.distanceTo(c); sunAt(v3(c.x, 0, c.z).lerp(st.p, 0.25), clamp(d * 0.8 + 2.4, 3.5, 13));
}
