// ---------------------------------------------------------------- UN SOLO PLANO, SIN CORTES (Javi, 16-11: «la cámara está en constante movimiento… ningún corte ni cambio de
// plano: es la cámara la que accede a algún lugar para cambiar de escena»). Fases (la letra la usa stageAt):
//  A  0–0,7      el agua congelada en pleno estallido dentro del horno (primer fotograma = último)
//  B  →3,0       el estallido se rebobina y la cámara sale por la puerta: el micro entero, encendido
//  C  →tu        vuelve a entrar a toda prisa: el agua salta a la cara (gotas en el objetivo)
//  D  →magnetrón sale y sube: la carcasa se abre en rayos X, se ven las piezas
//  E  →dispara   el magnetrón sube y a su alrededor aparece un radar de la II Guerra Mundial
//  F  →+1,4      el magnetrón vuelve a su sitio y la cámara vuela por la guía de ondas hasta el horno
//  G  →agua      las ondas llenan el horno; la cámara rodea la taza
//  H  →+0,7      se zambulle en el agua (velo azul)
//  I  →cazo      las moléculas (su mundo; al final, velo naranja del calor)
//  J  →abajo     sale del agua… en el cazo, y se aleja: el cazo en la placa al rojo
//  K  →microondas6 baja al fondo del cazo: las burbujas nacen en las rayitas
//  L  →lisa      sube y vuela hasta el micro; al cruzar el cristal, vista térmica: el agua caliente, la taza no
//  M  →agua7     se zambulle en la taza: el fondo liso, una burbuja sin sitio
//  N  →pero      sale: el termómetro pasa de 100 °C y el agua sigue quieta
//  O  →hierve    se abre la puerta, cae el café
//  P  →FDA       estalla y sale fuera; la cámara retrocede
//  Q  →truco     avisos de la FDA: la mano que se quema
//  R  →mete      el panel: 1:00
//  S  →micro     el palito cae en la taza y la cámara baja por sus vetas
//  T  →mándaselo ¿micro… o cazo? (de uno al otro)
//  U  →fin       vuelve dentro del micro: estalla y se congela (= primer fotograma)
let SHT = {}, SHOTS = [], CK = [], CWIN = [];
function shotAt(t) { let s = SHOTS[0][0]; for (const [k, t0] of SHOTS) if (t >= t0) s = k; return s; }
function segAt(t) { return 0; }
const camArr = (c) => [[c[0], c[1], c[2]], [c[3], c[4], c[5]], c[6] || 45];
function buildCam() {
  const m = MUGW, mx = m.x, my = m.y, mz = m.z, wy = my + MUG.WY;                       // la taza (base) y la superficie del agua
  const pot = v3(STOVE_POS.x + POT_L.x, STOVE_POS.y + POT_L.y, STOVE_POS.z + POT_L.z), pw = pot.y + POT_WY;   // el cazo (base) y su agua
  const MG = MAGLIFT;                                                                    // el magnetrón levantado
  SHT = { A0: 0, B0: 0.7, C0: 3.0, D0: K.tu2, E0: K.magnetron2, F0: K.dispara3, G0: K.dispara3 + 1.4, H0: K.agua4, I0: K.agua4 + 0.7, J0: K.cazo5, K0: K.abajo5,
    L0: K.microondas6 - 0.05, M0: K.lisa6, N0: K.agua7, O0: K.pero8, P0: K.hierve8, Q0: K.fda9, R0: K.truco10, S0: K.mete10, T0: K.micro11, U0: K.mandaselo11, U1: K.microondas11 - 0.05 };
  SHOTS = 'ABCDEFGHIJKLMNOPQRSTU'.split('').map(k => [k, SHT[k + '0']]);
  // ventanas con su propia cámara (módulos): [t0, t1, función(u) → [px,py,pz, lx,ly,lz, fov], salto?]
  const fx = typeof xrayCam === 'function' ? xrayCam : null, fmol = typeof moleculesCam === 'function' ? moleculesCam : null;
  const fpot = typeof macCamPot === 'function' ? macCamPot : null, fmug = typeof macCamMug === 'function' ? macCamMug : null, fstk = typeof macCamStick === 'function' ? macCamStick : null;
  CWIN = [];
  if (fx) CWIN.push([K.dispara3 + 0.35, SHT.G0 - 0.05, fx]);
  if (fmol) CWIN.push([SHT.I0, SHT.J0, fmol, true]);                                        // true: se entra y se sale con un velo (sin empalme)
  if (fpot) CWIN.push([K.abajo5 + 0.45, SHT.L0 - 0.2, fpot]);
  if (fmug) CWIN.push([K.lisa6 + 0.25, SHT.N0 - 0.15, fmug]);
  if (fstk) CWIN.push([K.vetas10 - 0.25, SHT.T0 - 0.15, fstk]);
  const P = (p, l, f = 45) => [p, l, f], k = (t, c) => [t, ...c];
  const at = (f, u) => camArr(f(u));
  const win0 = (f, t0) => f ? k(t0, at(f, 0)) : null, win1 = (f, t1) => f ? k(t1, at(f, 1)) : null;
  const A0 = P([2, 21, -9], [mx, my + 8.4, mz], 58), A1 = P([0.6, 21.2, -9.3], [mx, my + 8.6, mz], 58);
  const keys = [
    k(0, A0), k(SHT.B0, A1),
    // B: el estallido se rebobina; la cámara sale hacia atrás por la puerta y se ve el micro entero
    k(1.45, P([1, 19.5, -1.5], [mx, my + 7, mz], 50)), k(2.2, P([18, 21, 28], [-4, 13, -20], 44)), k(SHT.C0, P([28, 22, 40], [-3, 13, -20], 42)),
    // C: vuelve a entrar a toda prisa; el agua salta hacia el objetivo
    k(3.5, P([3, 19.5, 3], [mx, wy + 1, mz], 46)), k(3.86, P([-3.6, 18.6, -8.6], [mx, wy + 2, mz], 52)), k(SHT.D0 - 0.05, P([-3, 19.2, -7.4], [mx, wy + 2.5, mz], 54)),
    // D: sale por la puerta subiendo; la carcasa se abre: las piezas por dentro
    k(4.8, P([0, 23, 5], [4, 16, -20], 50)), k(5.3, P([24, 38, 28], [8, 16, -20], 46)), k(SHT.E0, P([38, 46, 26], [9, 17, -20], 44)),
    // E: el magnetrón sube; alrededor aparece el radar de la II Guerra Mundial; la cámara lo rodea
    k(6.5, P([44, 52, 6], [MG.x, MG.y - 2, MG.z], 42)), k(K.radares2 + 0.1, P([34, 64, 22], [MG.x, MG.y + 4, MG.z], 50)), k(8.3, P([-8, 62, 24], [MG.x, MG.y + 6, MG.z], 54)),
    k(K.dispara3 - 0.1, P([4, 44, 2], [14, 24, -20], 48)),
    // F: el magnetrón vuelve; la cámara se mete por la guía de ondas (módulo) y sale al horno por la mica
    ...(fx ? [win0(fx, K.dispara3 + 0.35), win1(fx, SHT.G0 - 0.05)] : [k(K.dispara3 + 0.35, P([13, 17, -20], [9, 15.5, -20], 60)), k(SHT.G0 - 0.05, P([6, 16, -20], [mx, wy, mz], 58))]),
    // G: las ondas llenan el horno; la cámara rodea la taza por dentro
    k(11.4, P([-1, 19.5, -11.5], [mx, wy - 1, mz], 56)), k(12.4, P([-16, 20, -16], [mx, wy - 1, mz - 1.5], 56)), k(13.3, P([-13, 21.5, -30], [mx, wy - 1, mz], 56)),
    k(SHT.H0, P([-7.5, 21.5, -25], [mx, wy, mz], 50)),
    // H: se zambulle en el agua de la taza
    k(14.32, P([-6.2, 16.2, -22.8], [mx, wy - 6, mz - 0.1], 50)), k(SHT.I0, P([-6.05, wy - 0.2, -22.55], [mx, wy - 7, mz], 52)),
    // I: las moléculas (su mundo, entre velos)
    ...(fmol ? [] : [k(SHT.I0 + 0.01, P([mx, wy - 1, mz], [mx, wy - 5, mz], 50)), k(SHT.J0 - 0.01, P([mx, wy - 1.5, mz], [mx, wy - 5, mz], 50))]),
    // J: sale del agua… dentro del cazo; sube y se aleja: el cazo en la placa al rojo
    k(SHT.J0, P([pot.x - 0.2, pw - 1.6, pot.z + 0.3], [pot.x, pw + 6, pot.z], 62)), k(19.35, P([pot.x + 1.6, pw + 5.5, pot.z + 2.4], [pot.x, pw - 3, pot.z], 54)),
    k(20.05, P([pot.x + 26, pot.y + 21, pot.z + 31], [pot.x, pot.y + 2, pot.z], 44)),
    // K: baja al fondo del cazo (módulo): las burbujas nacen en las rayitas
    ...(fpot ? [win0(fpot, K.abajo5 + 0.45), win1(fpot, SHT.L0 - 0.2)] : [k(K.abajo5 + 0.45, P([pot.x + 2, pw + 4, pot.z + 3], [pot.x, pot.y + 1, pot.z], 50)), k(SHT.L0 - 0.2, P([pot.x + 1, pot.y + 1.2, pot.z + 1.5], [pot.x - 2, pot.y + 0.3, pot.z - 2], 54))]),
    // L: sube, cruza la cocina hasta el micro y entra por el cristal: vista térmica
    k(23.85, P([pot.x - 0.5, pw + 6, pot.z + 1], [mx + 20, 14, -16], 52)), k(24.55, P([24, 22, 18], [-4, 14, -20], 50)), k(25.2, P([-2, 18.5, -3.4], [mx, wy - 2, mz], 52)),
    k(26.0, P([3, 20.5, -10], [mx, my + 6, mz], 54)), k(SHT.M0, P([-10, 21.5, -11.5], [mx, my + 6, mz], 54)),
    // M: se zambulle en la taza (módulo): el fondo liso, una burbuja sin sitio
    ...(fmug ? [win0(fmug, K.lisa6 + 0.25), win1(fmug, SHT.N0 - 0.15)] : [k(K.lisa6 + 0.25, P([mx - 1, wy + 3, mz + 2], [mx, my + 1, mz], 52)), k(SHT.N0 - 0.15, P([mx + 1, my + 1.6, mz + 1], [mx - 1.5, my + 0.9, mz - 2], 56))]),
    // N: sale: el termómetro pasa de 100 °C; el agua quieta
    k(29.95, P([mx + 1.5, wy + 2.5, mz + 3], [mx, wy - 2, mz], 52)), k(30.7, P([5, 21, -9], [mx, my + 8, mz], 50)), k(31.7, P([-12, 21, -10], [mx, my + 8, mz], 50)),
    k(SHT.O0, P([2, 21.5, -8.5], [mx, my + 8, mz], 50)),
    // O: se abre la puerta y la cámara sale; cae el café (la cámara lo sigue hasta el agua)
    k(32.9, P([7, 25, 7], [mx, my + 9, mz], 48)), k(33.6, P([2, 31, 8], [mx, wy + 3, mz], 46)), k(34.4, P([-4.5, 25, -12], [mx, wy, mz], 46)), k(SHT.P0, P([-4.8, 22.5, -13], [mx, wy + 0.5, mz], 48)),
    // P: estalla y sale fuera; la cámara retrocede deprisa
    k(35.45, P([-3, 22.5, -3], [mx, wy + 3, mz], 54)), k(36.2, P([5, 26, 28], [mx, wy + 2, mz + 2], 46)), k(SHT.Q0, P([20, 33, 55], [-4, 15, -18], 44)),
    // Q: los avisos de la FDA alrededor; la mano que va a coger la taza y se quema
    k(38.4, P([-28, 30, 52], [-2, 16, -18], 46)), k(39.6, P([16, 27, 26], [-4, 13, -20], 44)), k(40.9, P([12, 25, 20], [-5, 13, -20], 44)), k(SHT.R0 - 0.1, P([22, 30, 30], [10, 20, -8], 42)),
    // R: el panel: 1:00
    k(42.9, P([31, 30, 22], [17.9, 24.6, -3.8], 32)), k(43.8, P([27, 28.5, 16], [17.9, 24.2, -3.8], 32)),
    // S: el palito cae en la taza; la cámara baja por sus vetas (módulo)
    k(44.6, P([4, 30, 14], [mx, my + 8, mz], 46)),
    ...(fstk ? [win0(fstk, K.vetas10 - 0.25), win1(fstk, SHT.T0 - 0.15)] : [k(K.vetas10 - 0.25, P([mx + 2, wy + 3, mz + 3], [mx + 1, wy - 2, mz], 50)), k(SHT.T0 - 0.15, P([mx + 1.5, my + 3, mz + 2], [mx + 1, my + 1, mz], 52))]),
    // T: ¿micro… o cazo?
    k(48.6, P([10, 40, 40], [0, 15, -20], 46)), k(49.15, P([pot.x + 6, 34, 34], [pot.x, pot.y + 5, pot.z], 44)), k(SHT.U0, P([40, 36, 46], [18, 12, -15], 44)),
    // U: vuelve dentro del micro; estalla y se congela (bucle)
    k(50.4, P([12, 24, 22], [-5, 14, -20], 46)), k(51.2, P([2, 21, -3], [mx, wy + 2, mz], 52)), k(END, A0),
  ].filter(Boolean);
  CK = keys;
}
// la cámara en t: el recorrido por claves, y dentro de cada ventana, la cámara del módulo
function camAt(t) {
  for (const [a, b, f] of CWIN) if (t >= a && t <= b) { const c = f(clamp((t - a) / (b - a))); return { p: v3(c[0], c[1], c[2]), l: v3(c[3], c[4], c[5]), f: c[6] || 45, roll: 0 }; }
  const st = camKeys(t, CK);
  for (const [t0, a0] of [[K.cara1, 0.35], [SHT.P0 + 0.1, 0.4], [K.manos9 - 0.05, 0.3], [K.cara9, 0.5]]) { const u = t - t0;
    if (u > 0 && u < 0.6) { const a = a0 * Math.exp(-u * 6); st.p.x += Math.sin(u * 83) * a; st.p.y += Math.sin(u * 71 + 1) * a * 0.8; } }
  return st;
}
// el fotograma anterior (desenfoque de movimiento): no cruza los saltos entre mundos (entrar y salir de las moléculas, tapados por el velo)
function prevT(t, dt) { const a = t - dt; for (const [w0, w1, f, jump] of CWIN) if (jump && ((a < w0) !== (t < w0) || (a < w1) !== (t < w1))) return t; return Math.max(0, a); }
function flashAt(t) { let f = 0; for (const [t0, k] of [[K.cara1 + 0.02, 0.025], [SHT.P0 + 0.08, 0.03]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
// velo de color a pantalla completa: azul al entrar en el agua, naranja del calor al salir de las moléculas
function fillAt(t) {
  const blue = win(t, SHT.H0 + 0.42, 0.26) * (1 - win(t, SHT.I0 + 0.02, 0.32));
  const hot = win(t, SHT.J0 - 0.45, 0.4) * (1 - win(t, SHT.J0 + 0.02, 0.3));
  return blue > hot ? { k: blue, c: [0.62, 0.86, 0.96] } : { k: hot, c: [1.0, 0.62, 0.3] };
}
// profundidad de campo: suave (que se lea todo); algo más en los planos de cerca
const DOFK = { A: 0.9, B: 0.5, C: 0.9, D: 0.3, E: 0.3, F: 0.4, G: 0.5, H: 0.6, I: 0, J: 0.5, K: 0.8, L: 0.4, M: 0.8, N: 0.6, O: 0.5, P: 0.6, Q: 0.4, R: 0.5, S: 0.6, T: 0.3, U: 0.6 };
function dofAt(t, st) { const sh = shotAt(t), f = st.p.distanceTo(st.l), k = DOFK[sh] ?? 0.5; return { focus: f, scale: k * f }; }
