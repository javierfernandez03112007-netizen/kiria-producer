// ---------------------------------------------------------------- LA ESCENA Y SU COREOGRAFÍA (segundos del guion técnico; cada plano tiene su decorado)
// 0–5 biblioteca: llega el aviso y A coge el móvil · 5–10 responden B (bus), C (cocina) y D (cama) · 10–20 los cuatro en el sofá comparan
// 20–24 votación cenital y «Reservar» · 24–25 abrazo · 25–35 el viaje: llegan con maletas, corren al mar, comen en el murete y se hacen el selfi.
let TL = {};
const trap = (x, e = 0.16) => { x = clamp(x); const v = 1 / (1 - e); return x < e ? v * x * x / (2 * e) : x > 1 - e ? 1 - v * (1 - x) * (1 - x) / (2 * e) : v * (x - e / 2); };
const bump = (t, a, b, fi = 0.25, fo = 0.3) => win(t, a, fi) * (1 - win(t, b, fo));               // 0→1→0 suave entre a y b
function poseSit(d, k = 1) { poseZero(d); const J = d.userData.J; J.hip.position.y = lerp(0.5, 0.5 / d.userData.s0, k); J.hpL.rotation.x = J.hpR.rotation.x = -1.5 * k; J.knL.rotation.x = J.knR.rotation.x = 1.5 * k; }
function handsLap(d) { const J = d.userData.J; J.shL.rotation.x = J.shR.rotation.x = -0.45; J.elL.rotation.x = J.elR.rotation.x = -0.9; J.shL.rotation.z = 0.12; J.shR.rotation.z = -0.12; }
function armsUp(d, k = 1, t = 0, ph = 0) { const J = d.userData.J, w = 0.18 * Math.sin(t * 11 + ph); J.shL.rotation.x = lerp(J.shL.rotation.x, -2.75 + w, k); J.shR.rotation.x = lerp(J.shR.rotation.x, -2.75 - w, k); J.shL.rotation.z = lerp(J.shL.rotation.z, -0.35, k); J.shR.rotation.z = lerp(J.shR.rotation.z, 0.35, k); J.elL.rotation.x = lerp(J.elL.rotation.x, -0.35, k); J.elR.rotation.x = lerp(J.elR.rotation.x, -0.35, k); }
const PEOPLE = { A: { shirt: 0xf2664b, pants: 0x3b4f7a, skin: 0xe6b996, hair: 0x4a2a16, hairStyle: 'ponytail', scale: 1.55 }, B: { shirt: 0x2f9e6b, pants: 0xcbb894, skin: 0xc68a62, hair: 0x1c1410, scale: 1.66 },
  C: { shirt: 0xf2b632, pants: 0x2b2d42, skin: 0xd9a27c, hair: 0x8a5a2a, hairStyle: 'ponytail', scale: 1.52 }, D: { shirt: 0x7d5fd0, pants: 0x55606e, skin: 0xe6b996, hair: 0x3a2618, scale: 1.62 } };
async function buildScene() {
  TL = { on: 1.0, notif: 1.15, grab0: 3.05, grab1: 3.75, lift1: 4.9, bub: [5.5, 7.1, 8.8], panel: 10.7, sort: 11.2, rev: K['mirad_1'], split: K['sale_2'], div: K['dividimos_2'], no: K['uf_3'], si: K['este_4'],
    vota: K['votamos_5'], c3: K['tres_5'], c2: K['dos_5'], c1: K['uno_5'], point: K['uno_5'] + 0.42, ex: K['uno_5'] + 0.75, press: 23.3, ok: 23.45, fly: 23.62, snap: 34.2 };
  S.sets = { lib: buildLib(), bus: buildBus(), kit: buildKit(), bed: buildBed(), sofa: buildSofa(), town: buildTown() }; for (const k in S.sets) scene.add(S.sets[k]);
  S.P = {}; for (const k in PEOPLE) { const d = addFace(gtaDoll(PEOPLE[k])); d.rotation.order = 'YXZ'; scene.add(d); S.P[k] = d; }
  { const cp = dollCap(0xf5f1e6); S.P.B.userData.J.neck.add(cp); S.capB = cp; const c2 = dollCap(0x2f6fd0); S.P.D.userData.J.neck.add(c2); c2.rotation.y = Math.PI; S.capD = c2; }
  // figurantes
  const xc = [0x4a8fc2, 0xd97aa6, 0xe39b3b, 0x8d6cab, 0xc8553d, 0x5aa469]; S.X = xc.map((c, i) => { const d = addFace(gtaDoll({ shirt: c, pants: [0x3a4660, 0x2b2d42, 0x6b5a48][i % 3], skin: [0xd9a27c, 0xe6b996, 0xc68a62][i % 3], hair: [0x1c1410, 0x5a3a22, 0x8a5a2a, 0x2c2c30][i % 4], hairStyle: i % 2 ? 'ponytail' : undefined, scale: 1.5 + hash(i) * 0.14 })); scene.add(d); return d; });
  // móviles: el protagonista (pantalla que cambia) y los de B, C y D con el chat
  S.heroTex = canvasTex(540, 1160, g => { g.fillStyle = '#050608'; g.fillRect(0, 0, 540, 1160); }); S.ph = phoneModel(S.heroTex); scene.add(S.ph);
  S.phB = phoneModel(chatTex('¡¡SÍ!!'), 0x2b6cb0); S.phC = phoneModel(chatTex('¿cuánto nos sale?'), 0xd9488f); S.phD = phoneModel(chatTex('yo pongo mis ahorros'), 0x1c1d21); scene.add(S.phB, S.phC, S.phD);
  S.cases = [0xe5533d, 0x2f6fd0, 0xe0a526, 0x1f9e9a].map(c => { const s = suitcase(c); scene.add(s); return s; }); S.food = [0, 1, 2, 3].map(() => { const b = bocadillo(); scene.add(b); return b; });
  S.arms = ['A', 'B', 'C', 'D'].map(k => { const a = voteArm(PEOPLE[k].shirt, PEOPLE[k].skin); scene.add(a); return a; });
}
function heroDraw(fn) { const U = S.heroTex.userData; fn(U.g, 540, 1160); S.heroTex.needsUpdate = true; }
const SETOF = { lib: 'lib', bus: 'bus', kit: 'kit', bed: 'bed', sofa: 'sofa', vote: 'sofa', hug: 'sofa', arrive: 'town', beach: 'town', wall: 'town', selfie: 'town' };
const MOODOF = { lib: 'dia', bus: 'dia', kit: 'tarde', bed: 'tarde', sofa: 'tarde', town: 'playa' };
function stageAt(t, st) {
  NOW = t; const sh = shotAt(t), n = sh.n, set = SETOF[n], P = S.P, { A, B, C, D } = P, ox = O[set], vz = voice(t), u = t - sh.a;
  for (const k in S.sets) S.sets[k].visible = k === set; moodSet(MOODOF[set]); lightsAt(st.l, Math.max(2.2, st.p.distanceTo(st.l) * 1.3));
  for (const d of [A, B, C, D, ...S.X]) { d.visible = false; d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); poseZero(d); smile(d, 0.35, 0, t, d.id); }
  for (const o of [S.ph, S.phB, S.phC, S.phD, ...S.cases, ...S.food, ...S.arms]) o.visible = false; S.ph.scale.setScalar(1); S.ph.up.set(0, 1, 0); S.capB.visible = S.capD.visible = set === 'town';
  const put = (d, x, y, z, ry = 0) => { d.visible = true; d.position.set(ox + x, y, z); d.rotation.y = ry; return d.userData.J; };
  const sitX = (d, x, z, ry, y = 0.08) => { const J = put(d, x, y, z, ry); poseSit(d); handsLap(d); return J; };

  if (n === 'lib') {
    // ---- 1 · LA CHISPA: el móvil entre los apuntes; se enciende con el aviso del grupo y la mano de A lo coge
    const J = sitX(A, 0.02, 0.8, Math.PI, 0.07); J.chest.rotation.x = 0.22; J.neck.rotation.x = 0.45;
    sitX(S.X[0], -0.85, -0.8, 0, 0.07).chest.rotation.x = 0.3; S.X[0].userData.J.neck.rotation.x = 0.5; sitX(S.X[1], 0.7, -1.14, Math.PI, 0.07).chest.rotation.x = 0.25; sitX(S.X[2], -0.6, -2.72, 0, 0.07).neck.rotation.x = 0.4;
    const on = seg(t, TL.on, TL.on + 0.22), nf = seg(t, TL.notif, TL.notif + 0.45), buzz = bump(t, TL.on, TL.on + 0.55, 0.05, 0.2), g1 = sm5(seg(t, TL.grab0, TL.grab1)), lf = sm5(seg(t, TL.grab1 + 0.05, TL.lift1));
    heroDraw((g, w, h) => drawLock(g, w, h, on, nf));
    const ph = S.ph; ph.visible = true; const p0 = v3(ox + 0.13 + 0.0012 * buzz * Math.sin(t * 190), 0.7665, 0.2), p1 = v3(ox + 0.17, 0.9, 0.3); ph.position.lerpVectors(p0, p1, lf);
    const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.1 + 0.02 * buzz * Math.sin(t * 170))), q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.15, 0, -0.06)); ph.quaternion.copy(q0).slerp(q1, lf);
    // la mano entra por abajo a la derecha (brazo con dedos), agarra el móvil por el borde y lo levanta; los brazos del muñeco quedan fuera de plano
    armTo(A, 'L', v3(ox + 0.42, 0.79, 0.56)); armTo(A, 'R', v3(ox - 0.2, 0.785, 0.34));
    { const a = S.arms[0]; a.visible = true; const out = v3(ox + 0.5, 0.86, 0.62), grip = ph.position.clone().add(v3(0.022, 0.012, 0.04).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)))); armPose(a, out.lerp(grip, g1), -0.95 + 0.25 * lf, 0.34 + 0.2 * lf); }
    const lk = win(t, TL.notif + 0.1, 0.35); if (lk > 0) { J.neck.rotation.y = -0.25 * lk; } smile(A, 0.35 + 0.65 * win(t, 1.8, 0.6), 0, t, 1);
  } else if (n === 'bus') {
    // ---- 2a · B, en el autobús: lee, sonríe y celebra con el puño
    busAt(S.sets.bus, t); const J = sitX(B, 0.5, -0.5, Math.PI / 2, 0.1); J.chest.rotation.x = 0.06; S.phB.visible = true; holdPhone(B, S.phB, { y: 0.3, z: 0.27, look: 0.55 });
    const k = win(t, TL.bub[0] + 0.1, 0.25), w = Math.sin((t - TL.bub[0]) * 16); J.shL.rotation.x = lerp(J.shL.rotation.x, -2.3 + 0.2 * w, k); J.elL.rotation.x = lerp(J.elL.rotation.x, -1.5, k); J.shL.rotation.z = lerp(J.shL.rotation.z, -0.3, k); J.neck.rotation.x -= 0.15 * k; smile(B, 0.3 + 0.7 * win(t, 5.25, 0.25), k > 0.5 ? 1 : 0, t, 2);
    B.position.y += 0.012 * Math.sin(t * 23) * 0.5; sitX(S.X[0], -1.4, -0.98, Math.PI / 2, 0.1); sitX(S.X[1], 2.4, 1.08, Math.PI / 2, 0.1); sitX(S.X[2], -2.35, 1.08, Math.PI / 2, 0.1); sitX(S.X[3], -0.45, -0.98, Math.PI / 2, 0.1); S.X[3].userData.J.neck.rotation.y = -0.9; J.neck.rotation.y -= 0.42 * k; J.neck.rotation.x -= 0.12 * k;
  } else if (n === 'kit') {
    // ---- 2b · C, en la cocina, apoyada en la encimera: escribe con los pulgares y se ríe
    const J = put(C, 0.25, 0, -0.96, 0.28); J.hip.rotation.x = -0.08; J.chest.rotation.x = 0.1; J.hpL.rotation.x = -0.12; J.knL.rotation.x = 0.2; S.phC.visible = true; holdPhone(C, S.phC, { both: true, x: 0.0, y: 0.29, z: 0.25, look: 0.5 });
    const k = win(t, TL.bub[1] - 0.2, 0.3); J.neck.rotation.z = 0.14 * k; J.chest.rotation.z = 0.04 * Math.sin(t * 3); smile(C, 0.3 + 0.7 * win(t, 6.95, 0.3), 0, t, 3);
  } else if (n === 'bed') {
    // ---- 2c · D, tumbado en la cama con el móvil sobre la cara; patalea de alegría
    D.visible = true; D.position.set(ox + 0.92, 0.705, -0.75); D.rotation.set(-Math.PI / 2, Math.PI / 2, 0); const J = D.userData.J, k = win(t, TL.bub[2] - 0.1, 0.3), w = Math.sin((t - TL.bub[2]) * 15);
    J.hpR.rotation.x = -0.95 - 0.25 * k * Math.max(0, w); J.knR.rotation.x = 1.7; J.hpL.rotation.x = -0.25 * k * Math.max(0, -w) - 0.05; J.knL.rotation.x = 0.1 + 0.5 * k * Math.max(0, -w); J.neck.rotation.x = 0.22;
    D.updateMatrixWorld(true); const hw = headW(D), Pp = v3(hw.x + 0.2, hw.y + 0.33 + 0.012 * Math.sin(t * 2.2), hw.z + 0.02); S.phD.visible = true; S.phD.position.copy(Pp); S.phD.up.set(-1, 0, 0); S.phD.lookAt(hw);
    armTo(D, 'L', Pp.clone().add(v3(0.05, -0.012, -0.035))); armTo(D, 'R', Pp.clone().add(v3(0.05, -0.012, 0.035))); smile(D, 0.3 + 0.7 * win(t, 8.6, 0.3), k > 0.5 ? 1 : 0, t, 4);
  } else if (n === 'sofa') {
    // ---- 3 · COMPARAR ENTRE TODOS: los cuatro apretados en el sofá alrededor del móvil de A
    const xs = { B: -0.74, A: -0.25, C: 0.25, D: 0.74 }, z0 = SOFA.z + 0.1, pp = v3(ox + 0.0, 1.0, z0 + 0.4 + 0.01 * Math.sin(t * 1.7));
    const no = bump(t, TL.no - 0.05, TL.no + 1.0, 0.2, 0.3), si = win(t, TL.si - 0.05, 0.25), rev = bump(t, TL.rev - 0.15, TL.rev + 1.9, 0.3, 0.35), spl = bump(t, TL.split - 0.1, TL.split + 2.6, 0.3, 0.4);
    for (const k of ['B', 'A', 'C', 'D']) { const d = P[k], x = xs[k], J = sitX(d, x, z0, -x * 0.42, 0.09), ln = -x * 0.3; J.hip.rotation.z = ln * 0.9; J.chest.rotation.z = ln * 0.5; J.chest.rotation.x = 0.14 - 0.16 * no + 0.06 * si; d.position.x -= x * 0.12 * (1 - no * 0.5);
      d.position.y += 0.012 * si * Math.abs(Math.sin((t - TL.si) * 9 + x * 3)); }
    // A sostiene el móvil en el centro (la pantalla hacia ellos) y pasa el dedo
    { const J = A.userData.J; S.ph.visible = true; S.ph.position.copy(pp); S.ph.lookAt(v3(ox, 1.3, z0 - 0.1)); armTo(A, 'R', pp.clone().add(v3(-0.03, -0.055, 0.012))); const sw = 0.5 + 0.5 * Math.sin(t * 5.2); armTo(A, 'L', pp.clone().add(v3(-0.045, -0.01 + 0.03 * sw, -0.03))); }
    // C señala la pantalla («¡Mirad las reseñas de este!»)
    { const J = C.userData.J; armTo(C, 'L', pp.clone().add(v3(0.03, 0.035, -0.025)), rev + 0.6 * si * (1 - rev)); J.chest.rotation.x += 0.05 * vz * rev; }
    // B cuenta con la mano («…si lo dividimos entre cuatro»)
    { const J = B.userData.J; J.shL.rotation.x = lerp(J.shL.rotation.x, -1.5, spl); J.elL.rotation.x = lerp(J.elL.rotation.x, -1.75 + 0.25 * Math.sin(t * 7), spl); J.shL.rotation.z = lerp(J.shL.rotation.z, -0.45, spl); J.chest.rotation.x += 0.05 * vz * spl; }
    // D celebra el «este sí»
    { const J = D.userData.J; J.shR.rotation.x = lerp(J.shR.rotation.x, -2.6, si); J.elR.rotation.x = lerp(J.elR.rotation.x, -1.3 + 0.3 * Math.sin(t * 13), si); J.shR.rotation.z = lerp(J.shR.rotation.z, 0.35, si); }
    for (const k of ['B', 'A', 'C', 'D']) { const d = P[k], J = d.userData.J; lookAtPt(d, pp, 0.5); if (k === 'B') J.neck.rotation.y += 0.55 * spl * (0.6 + 0.4 * Math.sin(t * 2.3)); J.neck.rotation.y += 0.32 * no * Math.sin((t - TL.no) * 13 + xs[k]); J.neck.rotation.x += -0.15 * no + 0.2 * si * Math.sin((t - TL.si) * 11);
      smile(d, clamp(0.45 + 0.2 * rev - 0.6 * no + 0.6 * si), si > 0.6 && (k === 'D' || k === 'C') ? 1 : 0, t, xs[k] * 9); }
  } else if (n === 'vote') {
    // ---- 4 · LA VOTACIÓN (cenital): el móvil en la mesa y cuatro manos; todos señalan la misma; D pulsa «Reservar»
    const ph = S.ph; ph.visible = true; ph.scale.setScalar(1.15); ph.position.set(ox + TBL.x, TBL.y + 0.0056, TBL.z + 0.02); ph.rotation.set(-Math.PI / 2, 0, 0); ph.updateMatrixWorld(true);
    const pt = win(t, TL.point, 0.16), ex = seg(t, TL.ex, TL.ex + 0.3), press = bump(t, TL.press, TL.press + 0.14, 0.06, 0.1), ok = seg(t, TL.ok, TL.ok + 0.32), fly = win(t, TL.fly, 0.3), back = win(t, TL.ex - 0.05, 0.25);
    heroDraw((g, w, h) => drawVote(g, w, h, { sel: t >= TL.point + 0.12 ? 1 : 0, ex, press: t >= TL.press + 0.05 && t < TL.ok + 0.02 ? 1 : 0, ok }));
    const c = v3(ox + TBL.x, TBL.y + 0.02, TBL.z + 0.02), yaw = [Math.PI * 1.25, 2.5, 0.6435, -Math.PI / 4], rest = [[-0.1, 0.09], [-0.115, -0.075], [0.115, -0.075], [0.1, 0.09]], tg = [[150, 610], [170, 520], [400, 520], [390, 620]];
    const tap = Math.max(bump(t, TL.c3, TL.c3 + 0.18, 0.07, 0.11), bump(t, TL.c2, TL.c2 + 0.18, 0.07, 0.11), bump(t, TL.c1, TL.c1 + 0.18, 0.07, 0.11)), inn = win(t, 20.05, 0.4);
    S.arms.forEach((a, i) => { a.visible = true; const r = v3(c.x + rest[i][0] * (1.9 - 0.9 * inn), c.y + 0.012 + 0.016 * (1 - tap) + 0.004 * Math.sin(t * 3 + i), c.z + rest[i][1] * (1.9 - 0.9 * inn)), p = scrPt(ph, tg[i][0], tg[i][1], 0.006);
      let tip = r.clone().lerp(p, pt * (1 - (i === 3 ? 0 : back))); if (i === 3) { const b = scrPt(ph, 400, 880, 0.02 - 0.016 * press); tip.lerp(b, sm5(seg(t, TL.ex + 0.05, TL.press - 0.02))); }
      tip.y += 0.28 * fly * (1 + 0.2 * i); tip.x += rest[i][0] * 1.6 * fly; tip.z += rest[i][1] * 1.6 * fly; armPose(a, tip, yaw[i], 0.3 + 0.25 * fly + 0.1 * (1 - pt) * tap); });
  } else if (n === 'hug') {
    // ---- 4 (final) · ¡reservado!: saltan y se abrazan delante del sofá
    const xs = { B: -0.52, A: -0.17, C: 0.17, D: 0.52 }; let i = 0; for (const k of ['B', 'A', 'C', 'D']) { const d = P[k], x = xs[k], J = put(d, x, 0, 0.18 + 0.1 * Math.abs(x), -x * 0.4), jp = Math.abs(Math.sin((t - 24.0) * 6.6 + i * 0.9)); d.position.y = 0.2 * jp; J.knL.rotation.x = J.knR.rotation.x = 0.5 * (1 - jp); J.hpL.rotation.x = J.hpR.rotation.x = -0.25 * (1 - jp);
      if (k === 'A' || k === 'C') armsUp(d, 1, t, i); else { armsUp(d, 1, t, i); const s = k === 'B' ? 'L' : 'R'; J['sh' + s].rotation.x = -1.3; J['sh' + s].rotation.z = k === 'B' ? 0.9 : -0.9; J['el' + s].rotation.x = -0.6; } J.neck.rotation.x = -0.2; smile(d, 1, 1, t, i); i++; }
  } else if (n === 'arrive') {
    // ---- 5a · EL VIAJE: llegan andando con las maletas por la calle de casas blancas
    const off = [[0, 21.3], [-1.0, 20.5], [-1.9, 21.6], [-2.9, 20.8]]; ['A', 'C', 'B', 'D'].forEach((k, i) => { const d = P[k], J = put(d, -3 + 1.35 * u + off[i][0], 0, off[i][1], Math.PI / 2); poseWalk(d, (u * 1.35 + i * 0.7) * 4.3, 0.55, 0.06); d.rotation.y = Math.PI / 2;
      const s = i % 2 ? 'L' : 'R', c = S.cases[i]; c.visible = true; dragCase(c, d, s); smile(d, 1, i === 0 ? 1 : 0, t, i);
      if (k === 'A') { const pk = bump(t, 25.5, 27.0, 0.3, 0.3); J.shL.rotation.x = lerp(J.shL.rotation.x, -1.75, pk); J.elL.rotation.x = lerp(J.elL.rotation.x, -0.15, pk); J.shL.rotation.z = -0.15; } if (k === 'D') J.neck.rotation.y = 0.6 * Math.sin(t * 1.8); if (k === 'C') J.neck.rotation.y = -0.45; });
    put(S.X[0], 9.5, 0, 19.4, 2.2); put(S.X[1], 10.2, 0, 19.2, -2.4); put(S.X[4], -9, 0, 19.3, 1.2);
  } else if (n === 'beach') {
    // ---- 5b · corren hacia el mar
    townAt(S.sets.town, t); const xs = [-1.6, -0.5, 0.55, 1.7], zo = [0.4, -0.3, 0, 0.6]; ['B', 'A', 'C', 'D'].forEach((k, i) => { const d = P[k], J = put(d, xs[i] + 0.15 * Math.sin(t * 2 + i), 0, -5.6 - 2.5 * u + zo[i], Math.PI); poseRun(d, (u * 2.5 + i * 0.8) * 3.4); d.rotation.y = Math.PI + 0.1 * Math.sin(t * 3 + i);
      if (i !== 2) armsUp(d, i === 1 ? 1 : 0.85, t, i); smile(d, 1, 1, t, i); });
    put(S.X[2], -7.2, 0, -7.5, 0.6); put(S.X[3], 8.3, 0, -9.2, -0.4); put(S.X[5], -10.5, 0, -4.2, 0.2);
  } else if (n === 'wall') {
    // ---- 5c · comen un bocadillo sentados en el murete, con el mar detrás
    townAt(S.sets.town, t); const xs = [-0.93, -0.31, 0.31, 0.93]; ['B', 'A', 'C', 'D'].forEach((k, i) => { const d = P[k], J = sitX(d, xs[i], TOWN.wall + 0.06, (i - 1.5) * -0.1, 0.19); J.knL.rotation.x = 1.5 + 0.28 * Math.sin(t * 3.1 + i); J.knR.rotation.x = 1.5 - 0.28 * Math.sin(t * 3.1 + i * 1.7);
      const f = S.food[i]; f.visible = true; const bite = bump(t, 29.9 + i * 0.5, 30.5 + i * 0.5, 0.3, 0.3) + bump(t, 31.3 + (3 - i) * 0.15, 32.4, 0.3, 0.3); eatAt(d, f, i % 2 ? 'L' : 'R', Math.min(1, bite)); const lg = bump(t, 30.6 + i * 0.4, 31.6 + i * 0.3, 0.2, 0.3);
      J.chest.rotation.x = -0.1 * lg; J.neck.rotation.y = (i < 2 ? 0.5 : -0.5) * lg; J.neck.rotation.x = -0.15 * lg; smile(d, 0.8, lg > 0.5 && bite < 0.3 ? 1 : 0, t, i); });
    put(S.X[2], -7.2, 0, -7.5, 0.6); put(S.X[3], 8.3, 0, -9.2, -0.4); put(S.X[5], -10.5, 0, -4.2, 0.2);
  } else {
    // ---- 5d · EL SELFI: se juntan; A estira el brazo con el móvil (la cámara es el móvil) y posan
    townAt(S.sets.town, t); const zc = -4.6, inn = sm5(seg(t, 32.1, 33.0)), peak = win(t, TL.snap - 0.5, 0.4), bob = 0.01 * Math.sin(t * 5);
    const cfg = { A: [-0.2, 0.12, 0.13, 0.15], C: [0.2, 0.1, 0.16, -0.15], B: [-0.5, -0.22, 0, 0.3], D: [0.52, -0.2, 0, -0.32] };
    for (const k of ['A', 'C', 'B', 'D']) { const d = P[k], c = cfg[k], far = (k === 'B' ? -1.3 : k === 'D' ? 1.4 : k === 'C' ? 0.5 : -0.3) * (1 - inn), J = put(d, c[0] + far, 0, zc + c[1] - 0.5 * (1 - inn) * (k === 'B' || k === 'D' ? 1 : 0), c[3]); poseCrouch(d, c[2] * 1.6); J.shL.rotation.x = J.shR.rotation.x = 0; J.elL.rotation.x = J.elR.rotation.x = -0.2; J.neck.rotation.x = 0; J.chest.rotation.x = 0.04;
      J.hip.rotation.z = -c[0] * 0.3 * inn; d.position.y = bob * (k === 'A' ? 0 : 1) + (k === 'D' ? 0.1 * bump(t, 33.0, 33.5, 0.2, 0.25) : 0); lookAtPt(d, st.p); J.neck.rotation.z = -c[0] * 0.3; smile(d, 1, peak > 0.3 || k === 'D' ? 1 : 0, t, c[0] * 7); }
    armTo(A, 'L', v3(ox - 0.62, 1.12, zc + 0.6)); { const J = A.userData.J; J.shR.rotation.x = -0.4; J.elR.rotation.x = -2.3; J.shR.rotation.z = -0.3; }                         // A: una mano al móvil (sale del plano) y la otra, saludo
    { const J = C.userData.J; J.shR.rotation.x = lerp(0, -0.35, peak); J.shR.rotation.z = 0.5 * peak; J.elR.rotation.x = lerp(-0.2, -2.5, peak); }                                           // C: la uve
    armsUp(B, peak, 0, 1); { const J = D.userData.J; J.shL.rotation.x = -2.7 * inn; J.shL.rotation.z = -0.3; J.elL.rotation.x = -0.3; J.shR.rotation.x = -1.2 * peak; J.shR.rotation.z = -0.8 * peak; J.elR.rotation.x = -0.9 * peak; }
    put(S.X[2], -7.2, 0, -7.5, 0.6); put(S.X[3], 8.3, 0, -9.2, -0.4);
  }
}
