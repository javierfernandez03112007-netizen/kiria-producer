// ---------------------------------------------------------------- LA CÁMARA: un solo plano desde arriba, en diagonal, que va de sitio en sitio. Claves:
// [t, x, z (punto del suelo al que mira, en metros del mundo), altura a la que mira, distancia, elevación°, giro°]. La distancia se interpola en logaritmo.
let CK = [];
function buildCam() {
  const C0 = [0, 0, 6, 1400, 41, 0], sp = n => { const p = SITES.find(s => s.name === n).p; return [p.x, p.z]; }, k = (t, xz, ...r) => [t, xz[0], xz[1], ...r], B = (i, j, dx = 0, dz = 0) => [i * PITCH + dx, j * PITCH + dz];
  CK = [[0, ...C0], k(TL.name + 0.5, fromUV(0, -14), 6, 620, 40, 0),                                                                    // el pueblo y su cartel
    k(TL.king + 0.9, [0.5, 0.5], 12, 150, 27, 0), k(TL.crown + 0.5, [0.5, 0.5], 13.2, 78, 22, 5),                                          // el rey y su corona
    k(TL.pop + 0.9, B(0, 2, 14, 2), 3, 150, 39, 0), k(TL.life - 0.5, B(0, 2, 15, -4), 1.5, 52, 38, -3), k(TL.pelu - 0.3, B(0, 2, 13, -10), 1.5, 46, 38, -4),   // una manzana de casas: cada uno a lo suyo
    k(TL.pelu + 0.75, [-9.0, 31.4], 1.6, 46, 38, 0), k(TL.sofia + 0.9, [-9.6, 31.0], 1.6, 38, 37, 3),                                       // la peluquería
    k(TL.carro + 0.35, [-8.6, -44.5], 1.6, 44, 38, 0), k(TL.caja - 0.25, [-7.8, -42], 1.6, 42, 38, 2), k(TL.caja + 0.55, [-4.0, -35.4], 1.6, 44, 38, 0), k(TL.banco - 0.3, [-3.4, -36.2], 1.6, 41, 38, -2),   // el carro lleno · la caja y su cola
    k(TL.banco + 0.8, [-40, 7], 1.6, 82, 38, 0), k(TL.furgon + 0.6, [-37.5, 13], 1.6, 52, 37, 3),                                       // el banco: los guardias y el furgón
    k(TL.pan + 0.14, [8.3, 33.6], 1.6, 48, 38, 0), k(TL.bomb - 0.3, [8.8, 34.2], 1.6, 46, 38, 1), k(TL.bomb + 0.14, [40.5, 49], 1.6, 58, 38, 0), k(TL.taxi - 0.3, [41.5, 49.2], 1.6, 56, 38, 1),
    k(TL.taxi + 0.14, [59, 43], 1.6, 52, 38, 0), k(TL.profe - 0.3, [59.4, 43.8], 1.6, 50, 38, 1),      // panaderos, bomberos, taxistas…
    k(TL.profe + 0.14, [80.5, 47.5], 1.6, 50, 38, 0), k(TL.pesca - 0.3, [80, 48], 1.6, 48, 38, 1), k(TL.pesca + 0.14, [47.5, 7.5], 1.6, 62, 38, 0), k(TL.ley - 0.75, [46, 7], 1.6, 56, 38, -2),   // …la profesora y el pescador
    k(TL.ley + 0.9, [0.5, 2], 14, 250, 27, 0), k(TL.gusta + 0.4, [0.5, 1], 14.5, 235, 26, 4), k(TL.nuevo - 0.4, [0.5, 0.5], 15, 215, 25, -3), k(TL.nuevo + 1.2, [0.5, 0.5], 17, 205, 24, 0),   // las leyes y el nuevo rey
    k(END - 2.0, [72, -2], 3, 150, 38, 0), [END, ...C0]];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0] + ' → ' + CK[i][0]);
}
function camAt(t) {
  t = clamp(t, 0, END); if (t >= END - 1e-6) t = 0;
  const T = CK.map(k => k[0]), c = j => mono(t, T, CK.map(k => k[j])), d = Math.exp(mono(t, T, CK.map(k => Math.log(k[4])))), el = c(5) * Math.PI / 180, az = Math.PI / 4 + c(6) * Math.PI / 180, x = c(1), z = c(2), l = v3(x, c(3), z);
  return { p: v3(x + d * Math.cos(el) * Math.sin(az), l.y + d * Math.sin(el), z + d * Math.cos(el) * Math.cos(az)), l, f: 20, roll: 0 };
}
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: (f > 400 ? 0.55 : 0.3) * f }; }
