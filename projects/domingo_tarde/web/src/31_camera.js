// ---------------------------------------------------------------- LA CÁMARA: un solo plano continuo, sin cortes. Claves [t, posición, mira, focal°, giro].
// Sigue la lámina de Javi: puerta → hombro y ventana → cara → cuerpo sentado → mano en el pecho → ojos → (sale por la ventana) cabeza y pecho → fachada → cuaderno → puerta.
let CK = [];
function buildCam() {
  stageAt(8, { p: v3(0, 1.5, 2), l: v3(0, 1.3, -1.3) }); const b = S.boy; b.updateMatrixWorld(true);
  const H = headW(b), f = v3(0, 0, 1).applyQuaternion(b.quaternion), px = v3(-f.z, 0, f.x), C = b.userData.J.chest.localToWorld(v3(0, 0.2, 0.1)), E = H.clone().addScaledVector(f, 0.1).add(v3(0, 0.0, 0)); S.headRef = H.clone();
  const at = (o, a, s, u) => o.clone().addScaledVector(f, a).addScaledVector(px, s).add(v3(0, u, 0)), A = p => [p.x, p.y, p.z], D0 = [0.42, 1.5, 2.62], L0 = [0.1, 1.42, -2.2];
  const nbP = b.localToWorld(v3(0.03, 0.215, 0.36)), k = (t, p, l, fv, r = 0) => [t, Array.isArray(p) ? p : A(p), Array.isArray(l) ? l : A(l), fv, r];
  const eP = at(H, 0.5, 0.1, 0.012), eL = H.clone().add(eP.clone().sub(H).normalize().multiplyScalar(0.1)).add(v3(0, 0.012, 0));          // los ojos: con la cabeza ya girada hacia la cámara
  const facC = [(FAC.cols[0] + FAC.cols[1]) / 2, (WIN.y0 + WIN.y1) / 2];
  CK = [
    k(0, D0, L0, 54), k(1.7, [0.52, 1.55, 0.25], [0.36, 1.68, -2.2], 46), k(TL.lunes + 1.9, [0.5, 1.52, -0.42], [0.38, 1.7, -2.2], 42),                                  // puerta → por encima del hombro: el LUNES sale
    k(TL.face + 0.25, at(H, 0.3, 0.8, 0.02), at(H, 0, 0, -0.01), 34), k(TL.face + 1.0, at(H, 0.74, 0.3, 0.0), at(H, 0, 0, -0.015), 30), k(TL.room - 0.1, at(H, 0.76, 0.25, -0.01), at(H, 0, 0, -0.02), 30),     // «¿Por qué pesa tanto?»: su cara
    k(TL.room + 1.0, [1.27, 1.3, -1.9], at(C, 0, 0, 0.2), 51), k(TL.chest - 0.75, [1.2, 1.28, -1.93], at(C, 0, 0, 0.2), 51),                                       // «Estás en tu cuarto, sin nada que hacer…»
    k(TL.chest + 0.15, at(C, 0.74, 0.3, 0.1), at(C, 0.02, 0, 0.05), 36), k(TL.eyes - 0.35, at(C, 0.68, 0.26, 0.1), at(C, 0.02, 0, 0.06), 36),                           // «…y se te encoge el pecho»
    k(TL.eyes + 0.2, eP, eL, 27), k(TL.brain - 0.15, A(eP.clone().lerp(eL, 0.08)), eL, 27),                                     // «No es pereza»: los ojos
    k(TL.viv - 0.1, [0.6, H.y + 0.06, -2.82], at(H, 0, 0, -0.13), 36), k(TL.alarm, [0.64, H.y + 0.05, -2.88], at(H, 0, 0, -0.14), 36), k(TL.only - 0.05, [0.62, H.y + 0.03, -2.86], at(H, 0, 0, -0.15), 36),      // el cerebro, los pensamientos, la alarma (la cámara ya está saliendo por la ventana)
    k(TL.only + 0.8, [0.9, 1.5, -7.0], [0.5, 1.5, -2.2], 35), k(TL.only + 2.0, [facC[0], facC[1] + 0.1, -25.6], [facC[0], facC[1], -2.2], 34), k(TL.help - 0.55, [facC[0], facC[1] + 0.05, -24.4], [facC[0], facC[1], -2.2], 34),   // sale: la fachada entera
    k(TL.help + 0.1, [0.6, 1.62, -3.2], at(H, 0, 0, -0.2), 36), k(TL.help + 0.6, at(nbP, 0.3, 0, 0.78), at(nbP, 0.07, 0, 0), 38),                                                           // vuelve a entrar por la ventana y sube sobre el cuaderno
    k(TL.write - 0.15, at(nbP, 0.02, 0, 0.62), at(nbP, 0.05, 0, 0), 38), k(TL.est - 0.25, at(nbP, 0.02, 0, 0.6), at(nbP, 0.05, 0, 0), 38),                                                 // cenital: escribe la lista
    k(TL.est + 0.6, at(nbP, -0.03, 0, 0.56), at(nbP, 0.0, 0, 0), 36), k(TL.send - 0.15, at(nbP, -0.03, 0, 0.53), at(nbP, 0.0, 0, 0), 36),                                                     // baja a la mitad de abajo: las barras y «9 min antes»
    k(TL.send + 0.75, [0.42, 1.8, -1.0], [0.34, 1.5, -2.2], 40), k(TL.send + 1.7, [0.5, 1.58, 0.4], [0.3, 1.5, -2.2], 46), k(END, D0, L0, 54),                                             // suelta el boli, respira… y vuelta a la puerta
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0] + ' → ' + CK[i][0]);
}
function camAt(t) { t = clamp(t, 0, END); const T = CK.map(k => k[0]), c = (j, i) => mono(t, T, CK.map(k => k[j][i])); const st = { p: v3(c(1, 0), c(1, 1), c(1, 2)), l: v3(c(2, 0), c(2, 1), c(2, 2)), f: mono(t, T, CK.map(k => k[3])), roll: mono(t, T, CK.map(k => k[4])) };
  const a = 0.004 * clamp(Math.hypot(st.l.x - st.p.x, st.l.z - st.p.z) / 0.4); st.p.x += a * Math.sin(t * 1.3); st.p.y += a * Math.sin(t * 1.7 + 1) * 0.8; return st; }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: (f < 1.2 ? 0.5 : f < 4 ? 0.36 : 0.25) * f }; }
