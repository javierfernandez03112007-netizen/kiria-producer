// ---------------------------------------------------------------- cámara: tramos (claves fijas, claves que siguen a algo que vuela, o claves fijas mirando a algo que vuela)
// que se funden entre sí; tres cortes (en blanco). El último fotograma es el primero (bucle).
let SEGS = [], CUTS = [];
const absSeg = KS => t => camKeys(t, KS);
const trackSeg = (base, KS) => t => { const b = base(t), c = camKeys(t, KS); c.p.add(b); c.l.add(b); return c; };
const lookSeg = (KS, target, off) => t => { const c = camKeys(t, KS); c.l = target(t).add(off); return c; };
const rocketW = t => launch(t).p.add(EC);
function buildCam() {
  setCuts();
  const N = llv(-3.56, 40.49).normalize(), east = v3(0, 1, 0).cross(N).normalize(), north = N.clone().cross(east).normalize(), M = EC.clone().addScaledVector(N, ER);
  const at = (b, ...o) => { const p = b.clone(); for (let i = 0; i < o.length; i += 2) p.addScaledVector(o[i], o[i + 1]); return [p.x, p.y, p.z]; };
  // primer fotograma (y el último): el birrete a contraluz, con el sol del amanecer justo detrás
  const T0 = [1.3, 3.08, 1.78], L0 = [0.0, 3.36, 0.0], TA = [1.42, 3.06, 1.95];
  // 0 · gancho (birrete → avión de papel que pasa rozando la cámara → avión) y el graduado con las alas que no llegan
  const HOOK = [
    [-1.0, TA, L0, 32], [0.0, T0, L0, 32], [0.5, [1.22, 3.1, 1.7], [0.1, 3.38, 0.0], 31],
    [0.95, [1.35, 3.15, 1.9], [1.35, 3.46, -0.55], 32], [1.3, [1.7, 3.3, 2.3], [4.0, 3.72, -2.9], 32, -0.04], [1.75, [2.2, 3.5, 2.9], [8.0, 4.15, -8.6], 31, -0.03],
    [2.15, [2.4, 3.5, 3.4], [10.0, 4.5, -13.0], 30], [2.55, [1.3, 2.7, 4.4], [3.0, 2.5, -3.0], 33], [3.0, [-1.6, 1.88, 3.25], [-0.1, 1.62, 0.3], 33],
    [K.no1 + 0.05, [-1.72, 1.76, 2.95], [-0.05, 1.56, 0.4], 32], [K.aero1 + 0.05, [-1.66, 1.72, 2.78], [-0.03, 1.55, 0.42], 32], [K.al1, [-1.52, 1.68, 2.52], [-0.02, 1.53, 0.45], 31],
    [K.que1 + 0.1, [-1.32, 1.62, 2.18], [-0.02, 1.51, 0.45], 30], [6.25, [-1.42, 1.7, 2.32], [-0.05, 1.5, 0.4], 31], [7.0, [0.6, 0.4, 5.4], [4.0, -3.0, -1.5], 34],
  ];
  // 1 · la subida: cámara al lado del avión (claves fijas), mirando siempre al avión y a la cinta
  const CLIMB = [
    [6.6, [1.7, 0.2, 5.4], 34], [7.3, [2.7, -3.9, 7.8], 32], [7.9, [4.2, -4.1, 8.6], 32], [8.6, [7.6, -2.6, 9.2], 32], [9.4, [12.2, 0.7, 9.6], 32],
    [10.4, [18.6, 4.4, 9.8], 32], [11.4, [24.6, 6.6, 9.6], 33], [12.4, [30.8, 7.3, 9.2], 33], [13.1, [35.2, 7.4, 8.6], 33],
  ].map(([t, p, f]) => [t, p, [0, 0, 0], f]);
  // 2 · crucero y «todo lo que vuela» (siguiendo al avión) y el picado hacia su piel
  const CRUISE = [
    [12.9, [-5.0, 0.6, 8.6], [0.6, 0.1, 0.4], 33], [13.55, [2.3, 0.45, 3.5], [-0.4, 0.05, 0.0], 34], [14.35, [2.6, 0.3, 3.2], [-0.5, 0.0, 0.0], 34],
    [15.0, [-0.2, 1.5, 10.2], [0.1, 1.55, -1.5], 38], [16.45, [-0.35, 1.7, 10.8], [0.15, 1.75, -2.0], 38], [16.78, [0.15, 0.55, 2.8], [0.05, 0.05, 0.0], 40], [CUT1 + 0.01, [0.05, 0.08, 0.3], [0.0, 0.0, -0.5], 52],
  ];
  // 3 · dentro del fuselaje (de −x a +x), túnel de viento, ensayo del ala, turbofán, tobera… y al chorro
  const tun = t => TUN.x + tunCamX(t);
  const INSIDE = [
    ...[CUT1, 17.6, 18.4, 19.2, 20.0, 20.8, 21.5].map((t, i) => [t, [tun(t), 4.28, 0.0], [tun(t) + 3.2, 4.0, 0.0], 48, 0.12 * Math.sin(i * 1.3)]),
    [21.85, [tun(21.85), 4.15, 0.05], [tun(21.85) + 3.0, 3.9, 0.2], 46], [22.25, [41.2, 4.0, 2.6], [44.0, 3.7, 0.0], 38],
    [22.75, [44.15, 3.75, 4.5], [44.05, 3.65, 0.0], 34], [23.1, [44.1, 3.8, 4.4], [44.05, 3.68, 0.0], 34], [23.65, [44.35, 4.7, 6.6], [44.1, 4.75, -0.4], 34],
    [24.5, [44.45, 4.8, 7.1], [44.12, 4.7, -0.4], 34], [25.5, [44.6, 4.85, 7.3], [44.15, 4.75, -0.4], 34],
    [26.0, [50.8, 4.4, 5.0], [55.5, 2.6, 2.0], 36], [26.55, [55.4, 3.3, 0.9], [60.0, 2.4, 3.8], 40], [K.alas, [55.4, 3.3, 0.9], [60.0, 2.45, 3.8], 40],
    [K.sin7 + 0.1, [55.3, 3.25, 0.7], [60.0, 2.95, 3.7], 40], [K.fibra - 0.2, [55.5, 3.4, 0.6], [58.0, 2.6, 2.4], 40], [K.fibra + 0.35, [56.1, 3.35, 0.75], [56.3, 2.55, 1.5], 38],
    [K.propulsion - 0.15, [56.15, 3.4, 0.7], [56.35, 2.7, 1.5], 38], [K.propulsion + 0.05, [60.5, 3.5, 4.4], [64.5, 2.6, 1.0], 36],
    [K.propulsion + 0.45, [70.6, 3.0, 4.4], [67.6, 2.4, 0.2], 34], [K.motores + 0.3, [69.8, 3.4, 4.9], [67.0, 2.45, 0.0], 34], [K.reaccion + 0.3, [68.6, 3.1, 4.7], [66.6, 2.3, -0.2], 34],
    [K.cohetes + 0.15, [73.2, 3.6, 6.2], [75.0, 1.6, -0.6], 34], [K.cohetes + 0.75, [75.6, 1.9, 4.2], [75.0, 0.8, -0.6], 36], [CUT2 - 0.01, [75.12, 0.35, 0.85], [75.0, -1.2, -0.6], 52],
  ];
  // 7 · la Tierra: el cohete de cerca, la órbita (vista de lado: elipse alta que cabe en vertical), Europa de noche y las llegadas a Madrid
  const RCAM = [[CUT2, [0.55, -0.1, 0.9], [0.0, -0.05, 0.0], 40], [34.3, [0.6, 0.12, 1.3], [0.0, 0.0, 0.0], 38], [35.05, [0.35, 0.3, 1.4], [0.0, 0.05, 0.0], 36], [35.7, [0.25, 0.55, 1.9], [-0.1, 0.12, 0.0], 36]];
  const ORBIT = [
    [35.9, [226.0, 5.5, 4.2], [220.6, 4.2, 0.0], 36], [36.6, [237.6, 3.1, 10.6], [220.0, 0.4, 0.0], 36], [K.y10 - 0.1, [236.8, 3.6, 11.6], [220.0, 0.5, 0.0], 36],
    [K.navegacion + 0.6, at(EC, N, 12.5, east, 0.6), at(EC, N, 2.6), 34], [K.aeropuertos + 0.1, at(EC, N, 9.0, east, 0.3), at(EC, N, 3.2), 34],
    [K.miles10, at(M, N, 2.4, north, -0.15), at(M, north, -0.2), 34], [K.sin10 + 0.1, at(M, N, 2.1, north, -0.1), at(M, north, -0.18), 34],
    [CUT3 - 0.01, at(M, N, 0.45, north, -0.1), at(M, north, -0.15), 46],
  ];
  // 8 · la formación (siguiendo al punto de la formación, que va hacia −x)
  const FORM = [
    [CUT3, [3.2, 0.55, 3.9], [-1.6, 0.1, -0.5], 34], [K.aviones11 - 0.35, [3.4, 0.7, 4.3], [5.0, 1.3, 0.6], 34], [K.aviones11, [3.0, 0.75, 4.0], [2.6, 0.85, -1.0], 34], [K.aviones11 + 0.3, [2.6, 0.75, 3.6], [1.2, 0.6, -2.0], 34],
    [K.motores11 - 0.25, [-1.2, 0.2, 1.4], [-1.7, -0.12, 0.0], 38], [K.motores11 + 0.15, [-2.3, -0.06, 0.32], [-1.86, -0.13, -0.04], 42], [K.motores11 + 0.42, [-2.34, -0.05, 0.34], [-1.86, -0.13, -0.04], 42],
    [K.cohetes11 + 0.2, [1.6, 1.3, 4.0], [-14, 2.5, -24], 34], [K.satelites11 - 0.15, [2.0, 0.9, 4.4], [-6, 4.5, -14], 36], [K.satelites11 + 0.3, [2.6, 0.6, 4.6], [3.0, 5.6, -3.0], 36],
    [K.y11 + 0.2, [4.6, 2.3, 6.5], [-0.4, 0.3, 0.0], 36], [K.seguro11 - 0.2, [5.2, 2.9, 7.2], [-0.8, 0.0, 0.2], 36],
  ];
  // 9 · de vuelta al graduado: el máster, profesión regulada, la llave, los años, «6 años» con todo pasando por encima, y el birrete al aire (bucle)
  const tEnd = END;
  const GRAD2 = [
    [48.55, [-2.2, 2.6, 4.4], [0.0, 1.8, 0.3], 34], [K.ingeniero12 - 0.1, [-1.7, 1.8, 3.0], [-0.02, 1.56, 0.42], 32], [K.el12, [-1.4, 1.65, 2.3], [-0.02, 1.52, 0.45], 30],
    [K.master1 + 0.15, [-1.3, 1.62, 2.15], [-0.02, 1.52, 0.45], 30], [K.master1 + 0.65, [-1.5, 1.7, 2.6], [0.0, 1.5, 0.35], 32],
    [K.profesion + 0.1, [-0.9, 2.2, 3.6], [0.0, 2.0, 0.6], 34], [K.grado + 0.1, [-0.8, 1.6, 3.7], [0.0, 1.35, 0.8], 34], [K.tecnico, [-0.7, 1.45, 3.8], [0.0, 1.05, 0.9], 34],
    [K.ingeniero13b, [-0.7, 1.45, 3.8], [0.0, 1.05, 0.9], 34], [K.master2 + 0.1, [-0.75, 1.4, 3.3], [-0.1, 1.1, 0.95], 33], [K.habilitante + 0.3, [-0.7, 1.35, 3.0], [0.0, 1.1, 1.0], 32],
    [K.en13 + 0.1, [-0.5, 1.15, 3.7], [0.0, 0.7, 1.0], 34], [K.dos + 0.2, [-0.4, 1.1, 3.9], [0.0, 0.65, 1.0], 34],
    [K.seis + 0.05, [-0.7, 0.75, 3.6], [0.0, 1.6, 0.0], 38], [K.para14 + 0.1, [-0.55, 0.5, 3.3], [0.0, 2.6, -0.8], 42], [K.vuela14 + 0.2, [-0.4, 0.55, 3.2], [0.0, 2.9, -1.2], 42],
    [K.si3 + 0.3, [-1.1, 1.9, 3.5], [0.0, 1.65, 0.6], 34], [K.guardalo + 0.3, [-0.9, 1.95, 3.3], [0.1, 1.7, 0.7], 34], [K.cuentame + 0.2, [-0.6, 2.15, 3.4], [-0.1, 2.05, 0.6], 34],
    [K.te2 + 0.15, [0.3, 2.3, 3.0], [0.0, 2.3, 0.3], 34], [tEnd - 1.0, TA, L0, 32], [tEnd, T0, L0, 32],
  ];
  SEGS = [
    { t: -9, bl: 0, f: absSeg(HOOK) },
    { t: 6.6, bl: 0.9, f: lookSeg(CLIMB, climbLook, v3(0.3, 0.35, 0.4)) },
    { t: 12.95, bl: 0.6, f: trackSeg(climbPos, CRUISE) },
    { t: CUT1, bl: 0, f: absSeg(INSIDE) },
    { t: CUT2, bl: 0, f: trackSeg(rocketW, RCAM) },
    { t: 35.85, bl: 0.7, f: absSeg(ORBIT) },
    { t: CUT3, bl: 0, f: trackSeg(fmC, FORM) },
    { t: 48.35, bl: 0.7, f: absSeg(GRAD2) },
  ];
  CUTS = SEGS.filter(s => s.bl === 0 && s.t > -1).map(s => s.t);
}
function camAt(t) {
  let i = 0; while (i + 1 < SEGS.length && t >= SEGS[i + 1].t) i++;
  const A = SEGS[i], nx = SEGS[i + 1];
  const mix = (a, b, w) => ({ p: a.p.lerp(b.p, w), l: a.l.lerp(b.l, w), f: lerp(a.f, b.f, w), roll: lerp(a.roll, b.roll, w) });
  if (nx && nx.bl > 0 && t > nx.t - nx.bl / 2) return mix(A.f(t), nx.f(t), sm5((t - (nx.t - nx.bl / 2)) / nx.bl));
  if (A.bl > 0 && i > 0 && t < A.t + A.bl / 2) return mix(SEGS[i - 1].f(t), A.f(t), sm5((t - (A.t - A.bl / 2)) / A.bl));
  return A.f(t);
}
// instante «anterior» para el desenfoque de movimiento: no cruza un corte
function prevT(t, dt) { let c = -1e9; for (const x of CUTS) if (x <= t && x > c) c = x; return Math.max(t - dt, c); }
