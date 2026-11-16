// ---------------------------------------------------------------- UN SOLO PLANO, SIN CORTES: la cámara viaja por la maqueta y cambia de sitio ENTRANDO en los sitios
// (el agua, la ventana, la antena, la fibra). Claves en el mundo (con ayudas por marco: Bw playa, Sw franja, Iw península, Tw Tonga, Fw fibra) y
// «ventanas» donde manda la cámara que trae cada pieza (BEA_CAM0, IBE_CAM_IN/OUT, FIB_CAM, INC_CAM, TON_CAM). La fibra es un decorado aparte: se entra
// y se sale con un destello blanco (el salto no se ve y el desenfoque de movimiento no lo cruza).
let CK = [], CWIN = [], FIBW = [0, 0];
const camArr = c => [[c[0], c[1], c[2]], [c[3], c[4], c[5]], c[6] || 40];
function inFiberWin(t) { return t >= FIBW[0] && t < FIBW[1]; }
// cámara de una pieza (marco local) → mundo
function winCam(fr, c) { const p = fr(c[0], c[1], c[2]), l = fr(c[3], c[4], c[5]); return [p.x, p.y, p.z, l.x, l.y, l.z, c[6] || 40]; }
function buildCam() {
  const fv = n => { const f = fnOf(n); return f ? f : null; }, val = n => { try { return eval('typeof ' + n + " !== 'undefined' ? " + n + ' : null'); } catch (e) { return null; } };
  const A = S.beach.userData.anchors || {}, ph = A.phone ? S.beach.worldToLocal(A.phone.isVector3 ? A.phone.clone() : wpos(A.phone)) : v3(-7, 0.72, 9);
  const C0 = val('BEA_CAM0') || [ph.x + 0.1, ph.y + 0.21, ph.z + 0.14, ph.x, ph.y, ph.z + 0.01, 38];
  const P = (p, l, f = 40) => [p, l, f], k = (t, a) => [t, ...a], V = v => [v.x, v.y, v.z];
  const kB = (t, p, l, f) => k(t, P(V(Bw(...p)), V(Bw(...l)), f)), kS = (t, p, l, f) => k(t, P(V(Sw(...p)), V(Sw(...l)), f)), kI = (t, p, l, f) => k(t, P(V(Iw(...p)), V(Iw(...l)), f));
  const kW = (t, p, l, f) => k(t, P(p, l, f)), kT = (t, p, l, f) => k(t, P(V(Tw(...p)), V(Tw(...l)), f));
  const c0 = winCam(Bw, C0);
  // ventanas de las piezas
  const ibeIn = fv('IBE_CAM_IN'), ibeOut = fv('IBE_CAM_OUT'), fibC = fv('FIB_CAM'), incC = fv('INC_CAM'), tonC = fv('TON_CAM');
  const T = { inA: 13.35, inB: 14.95, outA: 15.1, outB: 20.95, fibA: 20.95, fibB: 26.95, incA: 38.55, incB: 42.6, tonA: 44.15, tonB: 49.65 };
  FIBW = [T.fibA, T.fibB];
  CWIN = [];
  if (ibeIn) CWIN.push([T.inA, T.inB, u => winCam(Iw, ibeIn(u))]);
  if (ibeOut) CWIN.push([T.outA, T.outB, u => winCam(Iw, ibeOut(u))]);
  CWIN.push([T.fibA, T.fibB, fibC ? (u => winCam(Fw, fibC(u))) : (u => winCam(Fw, [u * 2400, 0.2, 0.15, u * 2400 + 40, 0, 0, 70])), true]);
  if (incC) CWIN.push([T.incA, T.incB, u => winCam(Bw, incC(u))]);
  if (tonC) CWIN.push([T.tonA, T.tonB, u => winCam(Tw, tonC(u))]);
  const W0 = (t0, f, fr) => k(t0, camArr(winCam(fr, f(0)))), W1 = (t1, f, fr) => k(t1, camArr(winCam(fr, f(1))));
  const keys = [
    // A · 0–3,3 el móvil en la toalla (= último fotograma); «y tú estás en Brasil»: sube y se ve la playa con el mar
    k(0, camArr(c0)), k(1.05, camArr([c0[0] + (ph.x - C0[0]) * 0, c0[1] - 0.02, c0[2], c0[3], c0[4], c0[5], C0[6] - 1.5])),
    kB(1.75, [ph.x + 0.35, ph.y + 0.7, ph.z + 0.55], [ph.x, ph.y, ph.z], 42), kB(2.45, [ph.x - 2.2, ph.y + 2.2, ph.z + 4.2], [ph.x + 1.5, ph.y - 0.2, ph.z - 1], 44),
    kB(3.25, [ph.x - 6.5, 4.6, ph.z + 4.5], [5, -0.2, 6], 46),
    // B · 3,3–5,8 vuela sobre la orilla, se mete en el agua: el cable en el fondo, la luz corre hacia la playa
    kB(3.95, [-3, 2.3, 11], [14, -1.2, 7], 50), kB(4.35, [7.5, 0.55, 10], [20, -3.6, 7], 54), kB(4.62, [11.2, -1.25, 9.8], [22, -5.6, 6.5], 56),
    kB(5.2, [16.5, -3.4, 9.6], [26, -6.6, 6], 54), kB(5.8, [20.5, -4.0, 9.8], [29, -6.2, 6], 52),
    // C · 5,8–10,6 sube a toda prisa, sale del agua y de la maqueta: la franja sobre el mapa, se encienden los cables del mundo
    kB(6.2, [23.5, -1.6, 11], [33, 0.6, 6], 52), kB(6.5, [26.5, 2.6, 13], [40, -0.8, 4], 50),
    kS(7.3, [8, 95, 78], [82, 30, 0], 44), kS(8.6, [-24, 168, 128], [112, 18, -10], 42), kS(10.1, [42, 206, 168], [205, 14, -16], 42),
    // D · 10,6–13,3 hacia Mauritania: el cable se rompe y el país se queda sin internet
    kS(11.35, [228, 142, 176], [300, 4, 52], 42), kS(12.6, [262, 101, 142], [308, 0, 56], 40), kS(13.25, [292, 92, 114], [338, 14, 28], 42),
    // E · al pueblo de España (de noche): entra por la ventana de la cocina; la madre envía
    ...(ibeIn ? [W0(T.inA, ibeIn, Iw), W1(T.inB, ibeIn, Iw)] : [kI(13.75, [-60, 70, 70], [30, 5, 10], 44), kI(14.15, [20, 18, 32], [40, 5, 10], 46), kI(14.45, [39, 5.5, 14], [40, 4.5, 9], 50),
      kI(14.75, [40, 4.6, 10.6], [40.2, 4.1, 9.2], 50), kI(T.inB, [40.05, 4.55, 10.5], [40.2, 4.1, 9.2], 49)]),
    // F · las ondas a la antena, baja por la torre y bajo la calle: la onda se vuelve luz en la fibra
    ...(ibeOut ? [W0(T.outA, ibeOut, Iw), W1(T.outB, ibeOut, Iw)] : [kI(T.outA, [40.1, 4.6, 10.8], [40.2, 4.2, 9.2], 49), kI(15.8, [41, 6, 18], [34, 12, 0], 50), kI(16.9, [36, 16, 14], [30, 25, -6], 48),
      kI(17.8, [32, 27, 3], [30, 27.5, -6], 46), kI(18.6, [31.5, 20, -2], [30, 10, -6], 48), kI(19.4, [30, 4.5, 4], [24, 1.5, 20], 50), kI(20.2, [20, 2.5, 26], [16, 1.6, 20], 46), kI(T.outB, [14, 1.75, 21], [10, 1.6, 20], 44)]),
    // G · dentro de la fibra (ventana con destello)
    // H · 26,9–33 sale en Portugal junto a la arqueta; el cable se hunde en el mar; sube y se ve cruzar la luz hasta Brasil
    kI(T.fibB, [3.5, 0.45, 6.5], [2.0, 0.2, 6], 50), kI(27.5, [5.2, 2.3, 10.5], [-3, -0.5, 6], 50), kI(28.1, [-1.5, 0.9, 9], [-10, -4, 6], 52), kI(28.42, [-5, -1.25, 8.5], [-14, -5.2, 6], 54),
    kI(29.0, [-13.5, -4.6, 9.5], [-26, -12, 6], 54), kS(29.6, [SL - 22, 41.5, 22], [SL - 70, 26, 0], 50), kS(30.6, [SL - 90, 112, 190], [300, 20, 0], 44),
    kS(32.0, [262, 212, 300], [222, 14, 0], 42), kS(33.0, [182, 300, 362], [200, 0, -40], 42),
    // I · 33–37,9 el mapa entero: más de 600 cables; chispas rojas donde se rompen
    kW(34.6, [-260, 720, 860], [160, 0, -260], 42), kW(36.4, [-420, 820, 980], [80, 0, -320], 42), kW(37.6, [-300, 380, 420], [-170, 20, 40], 44),
    // J · baja al fondo junto a Brasil: tiburón, ancla, red
    kS(38.15, [16, 58, 34], [20, 34, 4], 48), kS(38.45, [17, 41, 15], [22, 33, 4], 52),
    ...(incC ? [W0(T.incA, incC, Bw), W1(T.incB, incC, Bw)] : [kS(T.incA, [17.5, 37.4, 13], [24, 32.6, 2], 54), kS(40.5, [20, 36.6, 12], [25, 32.6, 0], 54), kS(T.incB, [23, 36.8, 13], [28, 33, 0], 54)]),
    // K · sale y vuela a Tonga (al otro lado del mapa)
    kS(42.95, [24, 46, 20], [0, 80, 120], 52), kW(43.4, [-300, 190, 110], [-760, 60, 160], 46), kW(43.8, [-880, 330, 170], [-1400, 40, 200], 44),
    ...(tonC ? [W0(T.tonA, tonC, Tw), W1(T.tonB, tonC, Tw)] : [kT(T.tonA, [-40, 150, 140], [-30, 0, 0], 44), kT(46.5, [-30, 60, 90], [-25, -5, 0], 44), kT(T.tonB, [-5, 35, 60], [5, 0, 0], 44)]),
    // L · vuelve a Brasil: la burbuja sale del mar y sube por la playa
    kW(50.15, [-1180, 330, 260], [-620, 40, 110], 46), kW(50.7, [-470, 210, 120], [-190, 40, 40], 46), kB(51.35, [24, 8, 30], [2, 0, 6], 46),
    kB(52.2, [8, 3.2, 17], [0, 0.4, 6], 44), kB(53.2, [1.5, 2.4, 15], [-3, 0.6, 8], 42), kB(54.2, [-3.2, 1.9, 13.5], [-5.6, 0.7, 8.6], 42),
    // M · baja al móvil: igual que el primer fotograma (bucle)
    kB(55.6, [ph.x + 0.9, ph.y + 1.2, ph.z + 1.4], [ph.x, ph.y, ph.z], 40), kB(56.6, [ph.x + 0.25, ph.y + 0.42, ph.z + 0.32], [ph.x, ph.y, ph.z], 39), k(END, camArr(c0)),
  ].filter(Boolean).sort((a, b) => a[0] - b[0]);
  CK = keys; S.C0 = c0;
}
function camAt(t) {
  for (const [a, b, f] of CWIN) if (t >= a && t <= b) { const c = f(clamp((t - a) / (b - a))); return { p: v3(c[0], c[1], c[2]), l: v3(c[3], c[4], c[5]), f: c[6] || 40, roll: 0 }; }
  if (t >= END - 1e-6 || t <= 1e-6) return { p: v3(S.C0[0], S.C0[1], S.C0[2]), l: v3(S.C0[3], S.C0[4], S.C0[5]), f: S.C0[6], roll: 0 };
  return camKeys(t, CK);
}
// el fotograma anterior (desenfoque de movimiento): no cruza los saltos a la fibra y desde la fibra
function prevT(t, dt) { const a = t - dt; for (const [w0, w1, f, jump] of CWIN) if (jump && ((a < w0) !== (t < w0) || (a < w1) !== (t < w1))) return t; return Math.max(0, a); }
// destellos: al entrar y salir de la fibra (todo blanco un instante), y la erupción de Tonga
function whiteAt(t) { const [a, b] = FIBW; return Math.max(Math.exp(-Math.pow((t - a) / 0.09, 2)), Math.exp(-Math.pow((t - b) / 0.09, 2))) * 0.97; }
function flashAt(t) { const te = t - (K['volcan_11'] + 0.05); return te > 0 ? 0.35 * Math.exp(-te / 0.18) : 0; }
// velo de agua al cruzar la superficie del mar (sube o baja)
function fillAt(t) { const st = camAt(t), sl = slabLocal(st.p); if (inFiberWin(t) || sl.x < 0 || sl.x > SL || Math.abs(sl.z) > SW / 2) return { k: 0, c: [0.6, 0.85, 0.95] };
  const d = Math.abs(sl.y - SEA); return { k: 0.55 * (1 - _sm(0.05, 0.5, d)), c: [0.62, 0.88, 0.96] }; }
// profundidad de campo: de cerca, suave; en el mapa, un poco (aspecto de maqueta)
function dofAt(t, st) { const f = st.p.distanceTo(st.l); if (inFiberWin(t)) return { focus: f, scale: 0 }; const k = f < 1.5 ? 0.55 : f < 40 ? 0.3 : 0.18; return { focus: f, scale: k * f }; }
