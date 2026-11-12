// ---------------------------------------------------------------- cámara: siempre en movimiento. Avenida hacia la dentadura gigante que se cierra de golpe → el cartel de la clínica
// («ESPECIALISTA» se cae) → el ortodoncista con la interrogación → vuelo por encima de la dentadura hasta la facultad y subida piso a piso → la boca
// abierta: empaste, la muela que sale, los brackets → los dentistas que salen de la facultad y llenan la plaza (grúa) → el mapa de Europa → las seis
// solicitudes selladas → el ortodoncista con su máster → brackets o invisibles → rebobina hasta el principio (bucle)
let CKS = [], CUTS = [];
const T_HIT = 0;
const S0 = [0.35, 0.5, -26.3], L0 = [0.0, 0.62, -33.2], S1 = [0.3, 0.5, -27.0], L1 = [0.0, 0.62, -33.2], Sm = [0.45, 0.52, -25.2], Lm = [0.0, 0.62, -33.2];
function buildCam() {
  const cz = S.clinicB.g.position.z, sg = v3(-0.25, GH + 0.62, 0.3).applyMatrix4(S.clinicB.g.matrixWorld), H = PS.heroPos;
  const fy = i => FL.y0 + i * FL.h + 0.24;
  const A = [
    [-1.0, Sm, Lm, 46], [0.0, S0, L0, 46], [0.5, S1, L1, 46],
    [K.especialista1, [0.05, 0.95, -18.0], [sg.x, sg.y, sg.z], 42], [K.porque1, [0.28, 0.98, -18.55], [sg.x, sg.y - 0.02, sg.z], 40],
    [K.existe1, [0.38, 0.92, -18.75], [sg.x, sg.y - 0.08, sg.z], 40], [K.existe1 + 0.55, [0.42, 0.75, -18.85], [sg.x, sg.y - 0.45, sg.z], 40],
    [K.entonces2, [0.62, 0.32, H.z + 1.05], [H.x, 0.23, H.z], 40], [K.final2 + 0.3, [0.68, 0.3, H.z + 0.95], [H.x, 0.22, H.z], 38],
    [K.odontologia3 + 0.15, [0.0, 2.3, -30.6], [0.0, 1.4, -42.0], 46], [K.cinco3, [-0.25, 1.35, -38.0], [0.0, 1.35, -42.6], 46],
    [K.anatomia3, [-0.08, fy(0) + 0.02, -40.6], [0.0, fy(0) - 0.02, -42.5], 40], [K.materiales3, [-0.03, fy(1) + 0.02, -40.6], [0.0, fy(1) - 0.02, -42.5], 40],
    [K.protesis3, [0.03, fy(2) + 0.02, -40.6], [0.0, fy(2) - 0.02, -42.5], 40], [K.cirugia3, [0.08, fy(3) + 0.02, -40.6], [0.0, fy(3) - 0.02, -42.5], 40],
    [K.pacientes3, [0.12, fy(4) + 0.02, -40.6], [0.0, fy(4) - 0.02, -42.5], 40], [K.pacientes3 + 0.7, [0.2, fy(4) + 0.2, -40.0], [0.0, fy(4) - 0.05, -42.5], 42],
    [K.acabar4, [0.8, 1.45, -29.4], [0.0, 0.55, -33.4], 44], [K.empastar4, [-0.85, 1.4, -31.4], [-1.35, 0.55, -33.4], 40],
    [K.muelas4, [1.0, 1.45, -31.3], [1.45, 0.6, -33.9], 40], [K.muelas4 + 0.5, [1.05, 1.6, -31.2], [1.45, 1.0, -33.9], 42],
    [K.brackets4, [0.25, 0.95, -29.7], [0.0, 0.62, -32.8], 42], [K.todo4 + 0.3, [0.1, 1.05, -29.0], [0.0, 0.65, -32.9], 44],
    [K.salen5, [0.0, 2.6, -29.2], [0.0, 0.3, -38.6], 46], [K.dentistas5 + 0.4, [0.0, 3.2, -29.6], [0.0, 0.2, -37.0], 46],
    [K.pais5, [0.0, 5.0, -39.0], [0.0, 0.0, -26.0], 50], [K.n43000 + 0.5, [0.0, 6.2, -40.5], [0.0, 0.0, -22.0], 50],
    [K.segun6, [0.0, 5.0, -27.4], [0.0, 3.1, -33.2], 46], [K.unico6, [0.0, 4.8, -27.8], [0.0, 3.0, -33.2], 46],
    [K.sin6, [-0.45, 4.0, -29.6], [-0.85, 2.8, -32.4], 42], [K.odontologia6 + 0.3, [-0.55, 3.85, -30.0], [-0.85, 2.75, -32.4], 40],
    [K.julio6, [-1.3, 0.8, -28.7], [-0.9, 0.35, -31.2], 42], [K.rechazo6, [-1.2, 0.75, -28.8], [-0.8, 0.33, -31.2], 42],
    [K.seis6, [0.1, 0.8, -28.3], [0.2, 0.33, -31.2], 44], [K.ortodoncia6, [0.32, 0.65, -29.2], [0.29, 0.34, -31.05], 42],
    [K.asi7, [0.55, 0.4, H.z + 1.0], [H.x - 0.08, 0.28, H.z], 40], [K.master7, [0.6, 0.38, H.z + 0.9], [H.x - 0.14, 0.28, H.z - 0.04], 40],
    [K.buenisimo7, [0.6, 0.4, H.z + 1.05], [H.x - 0.13, 0.31, H.z - 0.03], 42], [K.especialista7, [0.58, 0.42, H.z + 1.05], [H.x - 0.12, 0.33, H.z - 0.03], 42], [K.serlo7 + 0.3, [0.56, 0.43, H.z + 1.1], [H.x - 0.12, 0.33, H.z - 0.03], 42],
    [K.brackets8, [0.3, 0.8, -29.0], [0.0, 0.62, -32.8], 42], [K.invisibles8, [0.95, 0.8, -29.4], [0.6, 0.6, -32.9], 40],
    [K.mandaselo8 + 0.2, [0.4, 0.75, -28.4], [0.0, 0.58, -33.1], 44], [END - 0.6, [0.45, 0.6, -26.0], [0.0, 0.6, -33.2], 46],
    [END, S0, L0, 46], [END + 0.5, S1, L1, 46],
  ];
  CKS = [A];
}
function camAt(t) {
  const st = camKeys(t, CKS[0]);
  const sh = 0.012 * Math.exp(-Math.max(0, t - 0.05) * 5) * (t > -0.1 ? 1 : 0);        // el golpe de la mordida
  st.p.x += Math.sin(t * 41) * sh + 0.004 * Math.sin(t * 1.3); st.p.y += Math.sin(t * 33 + 1) * sh + 0.003 * Math.sin(t * 1.7 + 2);
  return st;
}
function prevT(t, dt) { return t - dt; }
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[0.02, 0.03], [K.existe1, 0.03], [K.empastar4, 0.03], [K.brackets4, 0.03], [K.n43000, 0.04], [K.sin6, 0.04], [K.ortodoncia6, 0.04], [K.serlo7, 0.04]])
    if (t > t0) f += k * Math.exp(-(t - t0) / 0.08);
  return f;
}
function whiteAt(t) { return 0; }
function stageAt(t, st) {
  NOW = t; mapAt(t); cityAt(t, st); teethAt(t); plazaAt(t);
  const c = st.l, d = st.p.distanceTo(c); sunAt(v3(c.x, 0, c.z).lerp(st.p, 0.2), clamp(d * 0.75 + 1.6, 2.6, 9));
}
