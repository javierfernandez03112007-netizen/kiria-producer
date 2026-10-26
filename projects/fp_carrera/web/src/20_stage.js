// ---------------------------------------------------------------- estado de la escena en cada instante (todo es función de t)
const wpos = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const popS = (t, t0, d = 0.35) => Math.max(1e-4, pop(t, t0, d));
// avance de la lluvia de tarjetas (velocidad alta al principio, luego flota)
function rainDist(t) { let d = 0; const dt = 1 / 120; for (let x = -3; x < t; x += dt) d += (x < 0.15 ? 26 : lerp(26, 2.2, sm5(clamp((x - 0.15) / 1.2)))) * dt; return d; }
function loopT(t) { return t > END - 1.25 ? t - END : t; }      // al final, el principio otra vez (bucle)
function cardsAt(t) {
  const C = S.cards, tt = loopT(t), inLoop = t > END - 1.25;
  const out = inLoop ? 0 : sm5(clamp((t - (K.y2 - 0.12)) / 0.7));
  const vis = tt < K.y2 + 0.9;
  // diez tarjetas: llegan volando hasta la cuadrícula
  const arr = eo(clamp((tt + 0.7) / 1.6));
  C.cards.forEach((c, i) => {
    c.g.visible = vis;
    if (!vis) return;
    const P = gridPos(i), stg = i * 0.04, a2 = eo(clamp((tt + 0.5 - stg) / 1.0));
    c.g.position.set(P.x * (1 + 1.5 * (1 - a2)), P.y + (1 - a2) * (i % 3 - 1) * 0.5, P.z - 9 * (1 - a2) + out * 8 * (i % 2 ? 1 : -0.6));
    c.g.position.x += out * (i % 2 ? 3 : -3); c.g.position.y += out * (1.5 - (i % 5) * 0.6);
    c.g.rotation.set((1 - a2) * (2.5 + i) + out * 3 * (i % 3), (1 - a2) * (1.7 - i * 0.3) + 0.12 * Math.sin(tt * 1.3 + i), out * (i % 2 ? 2 : -2));
    // relleno: casi cinco turquesa (4 + 0,7), dos ámbar (2 + 0,14)
    let f = 0, col = null, badge = '';
    if (i < 5 && !inLoop) { f = (i < 4 ? 1 : 0.7) * sm5(clamp((tt - (K.cinco + i * 0.12)) / 0.3)); col = CT; badge = 'FP'; }
    if (i >= 5 && i <= 7 && !inLoop) { f = (i < 7 ? 1 : 0.14) * sm5(clamp((tt - (K.carrera1 + (i - 5) * 0.12)) / 0.3)); col = CA; badge = 'GRADO'; }
    c.fill.visible = f > 0.002;
    if (c.fill.visible) { c.fill.material.color.copy(col); c.fill.scale.y = f; c.fill.position.y = -(CARD_H - 0.01) / 2 * (1 - f); }
    c.bFP.visible = f > 0.6 && badge === 'FP'; c.bGR.visible = f > 0.6 && badge === 'GRADO';
    const dim = i >= 8 || i === 7 ? 0.55 + 0.45 * (1 - sm5(clamp((tt - K.carrera1 - 0.5) / 0.4))) : 1;
    c.face.material.color.setScalar(dim);
  });
  // lluvia
  const R = C.rain, rv = tt < K.y2 + 0.6, dm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1);
  R.visible = rv;
  if (rv) { const d = rainDist(tt), fade = 1 - out;
    C.seeds.forEach((sd, i) => { let z = sd.z + d; z = ((z + 42) % 51 + 51) % 51 - 42; const side = sd.x < 0 ? -1 : 1, x = side * (0.5 + Math.abs(sd.x) * 0.62);
      e.set(sd.rx + tt * 0.7, sd.ry + tt * 0.5, 0); q.setFromEuler(e); s.setScalar(fade); dm.compose(_p.set(x, sd.y, z), q, s); R.setMatrixAt(i, dm); });
    R.instanceMatrix.needsUpdate = true; }
}
// muñecos: pose base + gestos
function dollPose(d, side, t, speak, point, cheer) {
  const J = d.userData.J, br = Math.sin(t * 2.2 + side) * 0.02;
  J.chest.rotation.x = br; J.neck.rotation.set(0.05 * Math.sin(t * 9) * speak, 0, 0);
  const sw = speak * Math.sin(t * 7.5 + side);
  J.shL.rotation.set(0.15 * sw, 0, 0.18 + 0.1 * speak); J.shR.rotation.set(-0.15 * sw, 0, -0.18 - 0.1 * speak);
  J.elL.rotation.set(-0.5 * speak, 0, 0); J.elR.rotation.set(-0.5 * speak, 0, 0);
  if (point > 0) { const sh = side < 0 ? J.shR : J.shL, el = side < 0 ? J.elR : J.elL; sh.rotation.z = lerp(sh.rotation.z, side < 0 ? -1.45 : 1.45, point); sh.rotation.x = lerp(sh.rotation.x, -0.25, point); el.rotation.x = lerp(el.rotation.x, 0, point); }
  if (cheer > 0) { J.shL.rotation.z = lerp(J.shL.rotation.z, 2.7, cheer); J.shR.rotation.z = lerp(J.shR.rotation.z, -2.7, cheer); J.elL.rotation.x = J.elR.rotation.x = -0.3 * cheer; d.position.y += 0.06 * cheer * Math.abs(Math.sin(t * 9)); }
}
function arenaAt(t) {
  const A = S.arena.userData, V = S.verdict;
  const hC = 0.35 + 0.45 * sm5(clamp((t - K.nunca) / 0.6)) * (1 - sm5(clamp((t - K.quien) / 0.5)));
  setPodiumH(A.pF, 0.35); setPodiumH(A.pC, hC);
  A.dF.position.set(-0.62, 0.35, 0); A.dC.position.set(0.62, hC, 0);
  A.dF.rotation.y = 0.55; A.dC.rotation.y = -0.55;
  const spF = env(t, K.los4, K.vosotros + 1.3, 0.2, 0.3), spC = Math.max(env(t, K.y5, K.debajo + 0.5, 0.2, 0.3), env(t, K.dicen2, K.nivel + 0.4, 0.2, 0.3));
  const ptF = env(t, K.vosotros - 0.05, K.teoria + 0.6, 0.2, 0.3), ptC = env(t, K.sabeis - 0.05, K.debajo + 0.4, 0.2, 0.3);
  const chF = env(t, K.fp15 - 0.05, K.equipo2, 0.15, 0.25) + env(t, K.las, K.primero, 0.2, 0.3), chC = env(t, K.carrera15 - 0.05, K.comentarios + 0.5, 0.15, 0.3) + env(t, K.las, K.primero, 0.2, 0.3);
  dollPose(A.dF, -1, t, spF, ptF, Math.min(1, chF)); dollPose(A.dC, 1, t, spC, ptC, Math.min(1, chC));
  if (t > K.nunca && t < K.quien) A.dC.userData.J.neck.rotation.x = 0.25 * sm5(clamp((t - K.nunca) / 0.5)) * (1 - sm5(clamp((t - K.tienen) / 0.6)));   // mira por encima del hombro
  // trofeo con interrogación; se ilumina de los dos colores en «las dos»
  const tk = sm5(clamp((t - K.las) / 0.35));
  const trv = Math.max(env(t, K.tienen - 0.35, K.los4 + 0.2, 0.35, 0.3), t > K.entonces - 0.2 && t < END - 1.25 ? sm5(clamp((t - K.entonces + 0.2) / 0.4)) : 0);
  A.tr.visible = trv > 0.01; A.tr.scale.setScalar(Math.max(1e-3, trv)); A.tr.position.y = 1.0 + 0.04 * Math.sin(t * 2); A.tr.rotation.y = t * 0.6;
  A.tr.userData.mL.emissive.copy(CT).multiplyScalar(1.0 * tk); A.tr.userData.mR.emissive.copy(CA).multiplyScalar(1.0 * tk);
  A.q.visible = tk < 0.99 && trv > 0.01; A.q.position.set(0, 1.42 + 0.03 * Math.sin(t * 3), -0.45); A.q.scale.setScalar(0.75 * (1 - tk) * trv + 1e-3); A.q.rotation.y = Math.sin(t * 1.5) * 0.4;
  // años: 2 turquesa / 4 ámbar (se quedan hasta el final), maletín, pizarras, herramientas
  A.yF.forEach((b, k) => { const p = popS(t, K.dos4 + k * 0.13, 0.4); b.visible = t > K.dos4; b.scale.setScalar(p); b.position.set(-1.15, 0.16 + k * 0.31, 0.38); b.rotation.y = 0.35; });
  A.yC.forEach((b, k) => { const p = popS(t, K.cuatro + k * 0.1, 0.4); b.visible = t > K.cuatro; b.scale.setScalar(p); b.position.set(1.15, 0.16 + k * 0.31, 0.38); b.rotation.y = -0.35; });
  A.half.visible = t > K.convalidado - 0.05; A.half.scale.x = sm5(clamp((t - K.convalidado + 0.05) / 0.3)) + 1e-3;
  const bk = env(t, K.practicas, K.responden, 0.3, 0.4); A.bc.visible = bk > 0.01; A.bc.scale.setScalar(popS(t, K.practicas, 0.4) * (bk > 0 ? 1 : 0) + 1e-3);
  A.bc.position.set(-1.15 + 0.25 * sm5(clamp((t - K.trabajar) / 0.5)), 0.95 + 0.04 * Math.sin(t * 2.5), 0.4); A.bc.rotation.set(0.1, 0.5 + t * 0.4, 0);
  A.boards.forEach((b, k) => { const p = env(t, K.teoria + k * 0.12, K.herramientas, 0.3, 0.3); b.visible = p > 0.01; b.scale.setScalar(popS(t, K.teoria + k * 0.12, 0.4));
    const P = [[1.7, 1.5, 0.1], [1.05, 1.85, -0.3], [1.8, 0.72, -0.25]][k]; b.position.set(P[0], P[1] + 0.03 * Math.sin(t * 2 + k), P[2]); b.rotation.set(0, -0.45, 0.06 * Math.sin(t + k)); });
  const tl = env(t, K.herramientas - 0.05, K.vamos + 0.2, 0.3, 0.3);
  [A.wr, A.hm].forEach((o, k) => { o.visible = tl > 0.01; o.scale.setScalar(Math.max(1e-3, tl) * 1.6); const a = t * 2.2 + k * Math.PI; o.position.set(-0.62 + Math.cos(a) * 0.42, 1.6 + 0.08 * Math.sin(a * 2), Math.sin(a) * 0.42); o.rotation.set(t * 1.5, t * 2 + k, 0.4); });
  A.gears.forEach((g, k) => { g.rotation.z = (k % 2 ? -1 : 1) * t * (1.2 + k * 0.4); });
  // veredicto
  const rk = clamp((t - K.antes) / 0.9);
  V.rocket.visible = t > K.antes - 0.3 && t < K.las; V.rocket.position.set(-1.15, 0.78 + 4.2 * rk * rk, 0.38); V.rocket.rotation.y = t * 4; V.rocket.userData.fl.scale.set(1, 0.6 + 0.5 * Math.sin(t * 40) * 0.3 + (rk > 0 ? 0.8 : 0), 1);
  V.fan.forEach((d, i) => { const p = env(t, K.puertas + i * 0.08, K.las, 0.3, 0.4); d.visible = p > 0.01; d.scale.setScalar(Math.max(1e-3, p) * 1.0);
    d.position.set(1.15 + (i - 1) * 0.32, 1.42, 0.38 - Math.abs(i - 1) * 0.12); d.rotation.y = -0.35 + (i - 1) * 0.35;
    const op = sm5(clamp((t - K.abiertas - i * 0.08) / 0.35)); d.userData.hinge.rotation.y = -1.3 * op; d.userData.light.material.opacity = 0.85 * op; d.userData.light.material.color.copy(CA); });
  const ub = sm5(clamp((t - K.luego) / 0.5)); V.uni.visible = ub > 0.01; V.uni.scale.set(1, Math.max(1e-3, ub), 1);
  V.U.uA.value = sm5(clamp((t - K.primero) / (K.carrera14 + 0.4 - K.primero))); V.bridge.visible = V.U.uA.value > 0.002;
  const bp = V.curve.getPoint(0.55); V.bar.visible = t > K.carrera14 - 0.2 && t < END - 1.3; V.arm.rotation.z = 1.35 * sm5(clamp((t - K.selectividad) / 0.4));
  V.ects.visible = t > K.medio - 0.05 && t < END - 1.3; V.ects.scale.setScalar(popS(t, K.medio, 0.35)); V.ects.position.copy(V.curve.getPoint(0.35)).add(v3(0, 0.22, 0)); V.ects.quaternion.copy(cam.quaternion);
  const bt = (b, y, t0, tp) => { const p = env(t, t0, END - 1.3, 0.35, 0.3); b.visible = p > 0.01; b.scale.setScalar(Math.max(1e-3, pop(t, t0, 0.45)));
    const press = Math.exp(-Math.max(0, t - tp) * 6) * (t > tp ? 1 : 0); b.position.set(0, y - 0.04 * press, 0.35 - 0.05 * press); b.children[0].material.emissiveIntensity = 0.9 + 1.4 * press; };
  bt(V.bF, 2.55, K.equipo - 0.05, K.fp15); bt(V.bC, 2.08, K.equipo + 0.1, K.carrera15);
}
function dataAt(t) {
  const D = S.data.userData;
  const sh = t > K.exige;
  [D.dipF, D.dipC].forEach((d, k) => { d.visible = !sh && t > K.vamos; d.position.set(0, k ? 1.12 : 1.88, 0.45); d.rotation.set(t * 1.4 + k, 0.3 * Math.sin(t + k), 0.15); d.scale.setScalar(2.4 * popS(t, K.vamos + 0.3 + k * 0.1, 0.4)); });
  [[D.shF, 1.88], [D.shC, 1.12]].forEach(([m, y], k) => { const u = t - K.exige; m.visible = u > 0 && u < 1.6; if (!m.visible) return; const dm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < m.count; i++) { const a = hash(i * 3.1 + k) * Math.PI * 2, b = (hash(i * 5.7 + k) - 0.5) * 2, sp = 0.8 + hash(i * 7.3 + k) * 2.2;
      const x0 = (hash(i * 1.9 + k) - 0.5) * 0.86, P = v3(x0 + Math.cos(a) * sp * u * 0.8, y + b * 0.1 + Math.sin(a) * sp * u * 0.6 - 0.6 * u * u, 0.45 + (hash(i * 2.3) - 0.3) * sp * u);
      e.set(u * 7 + i, u * 5 + i * 2, 0); q.setFromEuler(e); const s = 0.03 * (0.5 + hash(i * 9.9)) * (1 - u / 1.6); dm.compose(_p.copy(P).add(DZ), q, _s.set(s, s * 0.4, s)); m.setMatrixAt(i, dm); }
    m.instanceMatrix.needsUpdate = true; });
  const pk = sm5(clamp((t - K.ingenieria + 0.1) / 0.5)); D.panel.visible = pk > 0.01 && t < K.oposiciones; D.panel.scale.set(Math.max(1e-3, pk), Math.max(1e-3, pk), 1); D.panel.rotation.y = -0.12 + 0.05 * Math.sin(t * 0.7);
  const rt = [K.industrial, K.teleco, K.informatica7]; D.rows.forEach((r, i) => { const p = popS(t, rt[i], 0.35); r.visible = t > rt[i]; r.scale.setScalar(p); });
  D.strike.visible = t > K.regulada; D.strike.scale.x = Math.max(1e-3, sm5(clamp((t - K.regulada) / 0.35)));
}
function gatesAt(t) {
  const G = S.gates.userData, yk = k => 0.12 + k * 0.66;
  // llave ámbar (grado): sube hasta A1/A2 y las abre; llave turquesa (FP): sube hasta B y choca en A2
  const ua = sm5(clamp((t - K.oposiciones) / 2.3)), yA = lerp(0.3, yk(4) + 0.25, ua);
  const ut = sm5(clamp((t - K.con9) / 1.4)), bump = env(t, K.b9 - 0.05, K.b9 + 0.5, 0.12, 0.3), yT = lerp(0.3, yk(2) + 0.25, ut) + 0.42 * bump;
  const toM = sm5(clamp((t - K.y10) / 0.6)), toMa = sm5(clamp((t - K.master - 0.2) / 0.45));
  const md = wpos(G.md).sub(GZ).add(v3(0.12, 0.65, 0.12));
  G.kC.position.copy(v3(0.86, yA, 0.12).lerp(md, toMa)); G.kC.rotation.set(0, 0.3, t * 2.5 * (1 - toMa));
  G.kF.position.copy(v3(0.98, yT, 0.12).lerp(md.clone().add(v3(-0.1, 0.0, 0.08)), toM * (1 - sm5(clamp((t - K.master - 0.1) / 0.3))) )); G.kF.rotation.set(0, 0.3, t * 2.5 * (1 - toM));
  G.kF.visible = t > K.oposiciones - 0.2; G.kC.visible = t > K.oposiciones - 0.2;
  G.lv.forEach((l, k) => {
    let open = 0;
    if (k >= 3) open = sm5(clamp((t - (K.exigen + (k - 3) * 0.18)) / 0.5));
    else if (k === 2) open = sm5(clamp((t - K.mucho) / 0.5));
    else open = Math.max(sm5(clamp((t - K.con9 - 0.25 - k * 0.2) / 0.4)), sm5(clamp((t - K.oposiciones - 0.2 - k * 0.25) / 0.4)));
    l.d.userData.hinge.rotation.y = -1.25 * open; const lm = l.d.userData.light.material; lm.opacity = 0.75 * open; lm.color.copy(k >= 3 ? CA : CT);
    if (l.lock.visible) { const lo = sm5(clamp((t - (K.exigen + (k - 3) * 0.18 - 0.15)) / 0.25)); l.lock.userData.sh.position.y = 0.045 + 0.03 * lo; l.lock.scale.setScalar(1 - 0.999 * sm5(clamp((t - K.exigen - 0.6) / 0.3))); l.lock.userData.m.emissive.set(lo > 0.5 ? 0xffb547 : 0xff5247); }
  });
  const mo = sm5(clamp((t - K.universitario) / 0.5)); G.md.userData.hinge.rotation.y = -1.3 * mo; G.md.userData.light.material.opacity = 0.85 * mo; G.md.userData.light.material.color.copy(CA);
  G.mlock.userData.sh.position.y = 0.045 + 0.03 * sm5(clamp((t - K.universitario + 0.1) / 0.2)); G.mlock.visible = mo < 0.6;
  G.mlock.userData.m.emissive.set(t > K.universitario - 0.1 ? 0xffb547 : 0xff5247);
}
function stageAt(t) {
  // cada zona solo existe mientras se ve (así no aparecen al fondo de otra)
  const inLoop = t > END - 1.3;
  S.cards.G.visible = t < K.hay2 + 0.3 || inLoop;
  S.arena.visible = (t > K.y2 - 0.4 && t < K.programar + 0.2) || (t > K.punto11 && t < END - 0.15);
  S.data.visible = t > K.debajo && t < K.oposiciones + 0.4;
  S.gates.visible = t > K.si7 && t < K.quien + 0.3;
  cardsAt(t); if (S.arena.visible) arenaAt(t); if (S.data.visible) dataAt(t); if (S.gates.visible) gatesAt(t);
  S.data.userData.shF.visible = S.data.userData.shF.visible && S.data.visible; S.data.userData.shC.visible = S.data.userData.shC.visible && S.data.visible;
}
