// ---------------------------------------------------------------- planos y cámara. Cada letra es un plano (lo que pasa en la escena); los tramos (SEG) son
// movimientos de cámara seguidos: entre tramo y tramo hay un corte (y el desenfoque de movimiento no lo cruza).
//  A  0–0,75      el estallido congelado dentro del horno (primer fotograma = último)
//  B  →saltar     fuera, el horno encendido con la taza; la cámara entra por la ventana de la puerta
//  C  →tu         el agua estalla hacia la cámara
//  D  →magnetrón  la cámara sale por la puerta: el horno entero en la encimera
//  E  →dispara    la carcasa se vuelve de cristal y sale el magnetrón
//  F  →2.450+     el magnetrón en corte: el cátodo brilla, los electrones giran, salen las ondas
//  G  →agua       las ondas llenan el horno desde la tapa de mica
//  H  →+0,7       la cámara se zambulle en el agua
//  I  →cazo       las moléculas de agua giran con el campo
//  J  →burbujas   el cazo en la placa al rojo
//  K  →microondas el cazo en corte: las burbujas nacen en las rayitas del fondo
//  L  →lisa       la taza en corte, vista térmica: el agua caliente, la taza no
//  M  →agua       la pared lisa por dentro: ninguna burbuja
//  N  →pero       el agua quieta: «> 100 °C»
//  O  →hierve     se abre la puerta, cae el café
//  P  →FDA        estalla y sale fuera del horno
//  Q  →truco      la mano coge la taza: le salta a la mano (aviso de la FDA)
//  R  →mete       la pantalla: 1:00
//  S  →micro      el palito de madera: las burbujas nacen en sus vetas
//  T  →cazo       «¿micro…»: el microondas, de frente
//  W  →mándaselo  «…o cazo?»: el cazo en la placa
//  U  →fin        la cámara vuelve dentro del horno: estalla y se congela (= primer fotograma)
let SHT = {}, SHOTS = [], SEG = [];
function shotAt(t) { let s = SHOTS[0][0]; for (const [k, t0] of SHOTS) if (t >= t0) s = k; return s; }
function segAt(t) { let i = 0; for (let k = 0; k < SEG.length; k++) if (t >= SEG[k].t0) i = k; return i; }
function buildCam() {
  const m = MUGW, mx = m.x, my = m.y, mz = m.z, wy = my + MUG.WY;                     // la taza (base) y la superficie del agua
  SHT = { A0: 0, B0: 0.75, C0: K.saltar1 - 0.05, D0: K.tu2, E0: K.magnetron2 - 0.1, F0: K.dispara3 - 0.05, G0: K.n2450 + 0.6, H0: K.agua4 - 0.05, I0: K.agua4 + 0.7,
    J0: K.cazo5 - 0.05, K0: K.burbujas5 - 0.4, L0: K.microondas6 - 0.05, M0: K.lisa6 - 0.3, N0: K.agua7 - 0.05, O0: K.pero8 - 0.05, P0: K.hierve8 - 0.1, Q0: K.fda9 - 0.05,
    R0: K.truco10 - 0.05, S0: K.mete10 - 0.05, T0: K.micro11 - 0.05, W0: K.cazo11 - 0.05, U0: K.mandaselo11 - 0.1, U1: K.microondas11 - 0.05 };
  SHOTS = 'ABCDEFGHIJKLMNOPQRSTWU'.split('').map(k => [k, SHT[k + '0']]);
  const P = (p, l, f = 40, r = 0) => [p, l, f, r];
  const A0 = P([mx - 3.5, my + 15.5, mz + 13], [mx, my + 11, mz], 46), A1 = P([mx + 0.6, my + 15.2, mz + 12.6], [mx, my + 11, mz], 46);
  const mag = v3(17.6, 29.5, -13);                                                      // el magnetrón, ya fuera de la carcasa (ver stageAt)
  const pot = v3(STOVE_POS.x + POT_L.x, STOVE_POS.y + POT_L.y, STOVE_POS.z + POT_L.z);    // base del cazo
  const k = (t, c) => [t, ...c];
  SEG = [
    { t0: 0, keys: [k(0, A0), k(SHT.B0, A1)] },
    { t0: SHT.B0, keys: [                                                                // B → F: fuera, entra por la puerta, estalla, sale, el magnetrón
      k(SHT.B0, P([14, 22, 30], [-5, 13, -20], 40)), k(K.microondas1, P([4, 19.5, 9], [mx, wy + 0.5, mz], 40)), k(2.62, P([-3.6, 19.6, -4.2], [mx, wy + 1.5, mz], 42)),
      k(SHT.C0, P([mx + 0.8, my + 14.5, mz + 12.6], [mx, wy + 2.6, mz], 44)), k(SHT.C0 + 0.5, P([mx + 1.0, my + 15.2, mz + 14.8], [mx, wy + 3.6, mz], 50)),
      k(SHT.D0, P([mx + 1.2, my + 15.4, mz + 15.6], [mx, wy + 3, mz], 50)), k(SHT.D0 + 0.55, P([-2.5, 20.5, -2.5], [mx + 2, wy + 1, mz], 44)),
      k(SHT.E0, P([42, 34, 66], [6, 15, -20], 36)), k(K.radares2, P([40, 40, 38], [mag.x - 2, mag.y - 4, mag.z - 2], 34)),
      k(SHT.F0, P([mag.x + 22, mag.y + 9, mag.z + 26], [mag.x, mag.y, mag.z], 32)), k(SHT.G0, P([mag.x + 14, mag.y + 5, mag.z + 18], [mag.x, mag.y, mag.z], 30))] },
    { t0: SHT.G0, keys: [                                                                // G → H: dentro del horno (la tapa de mica a la derecha), y se zambulle en el agua
      k(SHT.G0, P([-17.5, 20.5, -8.5], [1, 13.5, -22], 58)), k(K.agua4 - 0.35, P([-12, 19.5, -11], [mx, wy, mz], 50)),
      k(SHT.H0 + 0.35, P([mx - 1.2, wy + 3.2, mz + 4.2], [mx, wy - 4, mz - 1], 40)), k(SHT.I0, P([mx - 0.2, wy + 0.15, mz + 0.5], [mx, wy - 8, mz - 1], 38))] },
    { t0: SHT.I0, mol: true, keys: [] },                                                 // I: las moléculas (su propia cámara)
    { t0: SHT.J0, keys: [                                                                // J: el cazo en la placa al rojo
      k(SHT.J0, P([pot.x + 24, pot.y + 13, pot.z + 40], [pot.x, pot.y + 4, pot.z], 38)), k(K.abajo5, P([pot.x + 16, pot.y + 5, pot.z + 30], [pot.x, pot.y + 1, pot.z], 38)),
      k(SHT.K0, P([pot.x + 14, pot.y + 3.5, pot.z + 26], [pot.x, pot.y + 0.5, pot.z], 38))] },
    { t0: SHT.K0, keys: [                                                                // K: el cazo visto desde arriba: las burbujas nacen en las rayitas del fondo
      k(SHT.K0, P([pot.x + 2.5, pot.y + 18, pot.z + 9], [pot.x - 0.4, pot.y + 0.6, pot.z - 1.2], 42)), k(K.rayitas5, P([pot.x + 1.4, pot.y + 12.5, pot.z + 5.5], [pot.x - 0.6, pot.y + 0.6, pot.z - 1.6], 40)), k(SHT.L0, P([pot.x + 1.0, pot.y + 11, pot.z + 4.6], [pot.x - 0.7, pot.y + 0.6, pot.z - 1.8], 40))] },
    { t0: SHT.L0, keys: [                                                                // L: vista térmica, desde arriba
      k(SHT.L0, P([mx + 4, my + 17, mz + 12.5], [mx, my + 6, mz], 48)), k(SHT.M0, P([mx + 2.2, my + 16, mz + 11], [mx, my + 6.2, mz], 46))] },
    { t0: SHT.M0, keys: [                                                                // M: dentro del agua de la taza, a ras del fondo liso: nada
      k(SHT.M0, P([mx + 1.5, my + 10.5, mz + 25], [mx + 0.3, my + 4.6, mz - 0.5], 40)), k(SHT.N0, P([mx + 1.2, my + 8.6, mz + 18.5], [mx + 0.2, my + 4.4, mz - 0.5], 40))] },
    { t0: SHT.N0, keys: [k(SHT.N0, P([mx - 0.6, my + 18.3, mz + 6.6], [mx, wy - 0.3, mz - 0.4], 44)), k(SHT.O0, P([mx - 0.3, my + 17.0, mz + 5.4], [mx, wy - 0.3, mz - 0.4], 42))] },
    { t0: SHT.O0, keys: [                                                                // O → P: la puerta se abre, cae el café, estalla hacia fuera
      k(SHT.O0, P([8, 25, 28], [mx, wy + 1, mz], 38)), k(K.echas8, P([1.5, 21, 9], [mx, wy + 3, mz], 38)), k(SHT.P0, P([-1.5, 19.5, 2], [mx, wy + 0.5, mz], 40)),
      k(SHT.P0 + 0.6, P([0, 19, 10], [mx, wy + 2, mz + 2], 44)), k(SHT.Q0, P([2, 18.5, 17], [mx, wy + 1, mz + 3], 46))] },
    { t0: SHT.Q0, keys: [                                                                // Q: en primera persona: tu mano va a coger la taza
      k(SHT.Q0, P([4, 26, 36], [mx + 1, my + 8, mz], 44)), k(K.quemaduras9, P([3.5, 25, 31], [mx + 1, my + 8.5, mz], 44)), k(SHT.R0, P([4.5, 26.5, 38], [mx + 1, my + 8.5, mz], 46))] },
    { t0: SHT.R0, keys: [k(SHT.R0, P([32, 31, 40], [17.9, 23, -3.8], 26)), k(SHT.S0, P([28, 28.5, 33], [17.9, 23.6, -3.8], 26))] },                // R: la pantalla
    { t0: SHT.S0, keys: [k(SHT.S0, P([mx + 1.5, my + 10, mz + 24], [mx + 0.8, my + 5, mz - 0.5], 40)), k(K.burbujas10, P([mx + 1.2, my + 8, mz + 16.5], [mx + 0.8, my + 5, mz - 0.5], 40)),
      k(SHT.T0, P([mx + 1, my + 7.5, mz + 14.5], [mx + 0.8, my + 5, mz - 0.5], 38))] },  // S: el palito (taza en corte)
    { t0: SHT.T0, keys: [k(SHT.T0, P([30, 22, 45], [-2, 14, -18], 40)), k(SHT.W0, P([27, 21, 40], [-2, 14, -18], 40))] },                           // T: «¿micro…»
    { t0: SHT.W0, keys: [k(SHT.W0, P([pot.x + 16, pot.y + 24, pot.z + 30], [pot.x, pot.y + 5, pot.z], 38)), k(SHT.U0, P([pot.x + 14, pot.y + 22, pot.z + 27], [pot.x, pot.y + 5, pot.z], 38))] },   // W: «…o cazo?»
    { t0: SHT.U0, keys: [                                                                // U: vuelta dentro del horno (bucle)
      k(SHT.U0, P([24, 24, 50], [-4, 13, -20], 38)), k(SHT.U0 + 1.15, P([2, 21, 18], [mx, wy + 1, mz], 40)),
      k(SHT.U1 + 0.15, P([-3.4, 20.6, -4.4], [mx, wy + 2, mz], 44)), k(END, A0)] },
  ];
}
// la cámara en t (sacudida en los estallidos)
function camAt(t) {
  const s = SEG[segAt(t)];
  if (s.mol) { const [a, b] = [SHT.I0, SHT.J0]; if (S.mol && typeof moleculesCam === 'function') { const c = moleculesCam(clamp((t - a) / (b - a))); return { p: v3(c[0], c[1], c[2]), l: v3(c[3], c[4], c[5]), f: c[6] || 40, roll: 0 }; }
    return { p: v3(MUGW.x, MUGW.y + 6, MUGW.z + 2), l: v3(MUGW.x, MUGW.y + 2, MUGW.z), f: 40, roll: 0 }; }
  const st = camKeys(t, s.keys);
  for (const [t0, a0] of [[SHT.C0 + 0.04, 0.22], [SHT.P0 + 0.12, 0.3], [K.quemaduras9 - 0.2, 0.2], [SHT.U1 + 0.06, 0.12]]) { const u = t - t0;
    if (u > 0 && u < 0.6) { const a = a0 * Math.exp(-u * 6); st.p.x += Math.sin(u * 83) * a; st.p.y += Math.sin(u * 71 + 1) * a * 0.8; } }
  return st;
}
// el fotograma anterior (para el desenfoque de movimiento) no cruza un corte
function prevT(t, dt) { const a = t - dt; return segAt(a) !== segAt(t) ? t : Math.max(0, a); }
function flashAt(t) { let f = 0; for (const [t0, k] of [[SHT.C0 + 0.03, 0.03], [SHT.I0, 0.07], [SHT.P0 + 0.1, 0.025], [K.quemaduras9 - 0.18, 0.02]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.09); return f; }
function whiteAt(t) { return 0; }
// profundidad de campo por plano: enfoca a lo que se mira; k = cuánto se desenfoca lo demás (más en los planos de cerca)
const DOFK = { A: 2.0, B: 1.2, C: 2.0, D: 1.2, E: 0.9, F: 1.0, G: 1.2, H: 1.5, I: 0, J: 1.2, K: 1.6, L: 0.5, M: 1.6, N: 1.5, O: 1.2, P: 1.5, Q: 1.3, R: 1.5, S: 1.5, T: 1.0, W: 1.0, U: 1.3 };
function dofAt(t, st) { const sh = shotAt(t), f = st.p.distanceTo(st.l), k = DOFK[sh] ?? 1; return { focus: f, scale: k * f }; }
