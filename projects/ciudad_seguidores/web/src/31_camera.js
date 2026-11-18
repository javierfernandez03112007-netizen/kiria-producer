// ---------------------------------------------------------------- LA CÁMARA: un solo plano desde arriba, en diagonal (como en los juegos de construir ciudades), que
// baja hasta la gente, sube, recorre lo que crecerá y acaba en el trono. Claves: [t, U, V, altura a la que mira, distancia, elevación°, giro°].
// (U = derecha en pantalla, V = hacia el fondo; ver 05_world.js.) La distancia se interpola en logaritmo: el zoom se nota uniforme.
let CK = [];
function buildCam() {
  const pu = toU(PLOTP.x, PLOTP.z), pv = toV(PLOTP.x, PLOTP.z), C0 = [0, 0, 6, 1085, 40, 0];
  CK = [[0, ...C0], [2.2, 0, -4, 6, 930, 40, 0],
    [TL.you + 0.1, -6, -24, 1.5, 46, 38, 0], [5.3, -9, -21, 1.5, 42, 38, 2], [K['nombre_2'] + 0.1, -22, -8, 1.5, 40, 37, 4],          // una eres tú · con su nombre encima
    [TL.plot0 + 0.1, -24, -14, 1.5, 48, 38, 3], [9.4, pu, pv + 3, 1.5, 46, 38, 0], [TL.plot1, pu + 1.5, pv + 4, 1.5, 42, 38, -2],                   // tu casa todavía no existe
    [12.6, 0, 10, 3, 520, 40, 0], [TL.more1, 0, 0, 3, 1300, 41, 0],                                                                       // un campamento · más crece
    [TL.city + 0.6, 0, 18, 6, 640, 40, 0], [TL.mercado + 0.4, 4, 34, 8, 440, 40, 0], [TL.tax + 0.6, -2, 38, 8, 420, 40, 0],                 // pueblo, ciudad, mercado, banco, impuestos
    [TL.dry - 0.4, 8, 10, 6, 540, 40, 0], [TL.dry + 0.55, 26, -24, 3, 265, 39, 0], [TL.price + 0.75, 28, 27, 4, 255, 39, 0], [TL.crisis + 0.5, 0, 16, 8, 620, 40, 0],   // sequía, precios, crisis
    [TL.back1 - 0.15, 0, -2, 12, 330, 34, 0], [TL.who + 0.9, 0, 0, 17, 215, 24, 0], [TL.like + 0.4, 0, 0, 17, 225, 24, 6], [TL.name + 1.1, 0, 0, 17, 235, 25, -4],        // el trono
    [TL.reign + 0.65, 0, 0, 18, 210, 24, 0], [END - 1.35, 0, -4, 12, 380, 32, 0], [END, ...C0]];
}
function camAt(t) {
  t = clamp(t, 0, END); if (t >= END - 1e-6) t = 0;
  const T = CK.map(k => k[0]), c = j => mono(t, T, CK.map(k => k[j])), d = Math.exp(mono(t, T, CK.map(k => Math.log(k[4])))), el = c(5) * Math.PI / 180, az = Math.PI / 4 + c(6) * Math.PI / 180;
  const [x, z] = fromUV(c(1), c(2)), l = v3(x, c(3), z);
  return { p: v3(x + d * Math.cos(el) * Math.sin(az), l.y + d * Math.sin(el), z + d * Math.cos(el) * Math.cos(az)), l, f: 20, roll: 0 };
}
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: (f > 400 ? 0.55 : 0.3) * f }; }
