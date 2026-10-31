// ---------------------------------------------------------------- el escenario en cada instante
function flashAt(t) {
  let f = 0;
  for (const [t0, k] of [[K.rivales + 0.12, 0.08], [K.boe1 + 0.16, 0.1], [K.parte + 0.3, 0.07], [K.ninguna, 0.05], [K.por3 + 0.05, 0.08], [K.millones + 0.05, 0.08], [K.n1 + 1.1, 0.05], [K.n2 + 1.1, 0.05],
    [K.especialidades, 0.06], [K.n48, 0.06], [K.nada, 0.07], [K.titulo12 + 0.05, 0.07], [K.colegio + 0.05, 0.07], [K.hacerlo, 0.1]]) if (t > t0) f += k * Math.exp(-(t - t0) / 0.07);
  return f;
}
function whiteAt() { return 0; }
const _v = new THREE.Vector3();
// pose de un aspirante (local del ring): x, y, giro, escala
function champ(t, side) {      // side −1 = chip (izquierda), +1 = código (derecha)
  const ph = side < 0 ? 0 : 1.7, bob = 0.018 * lsin(t, 2.4, ph), shake = Math.exp(-Math.max(0, t - K.ninguna) * 5) * (t > K.ninguna ? 1 : 0) * 0.02 * Math.sin(t * 70 + ph);
  let x = side * 0.25, y = RING_H + 0.34 + bob, ry = -side * 0.42, s = 0.85;
  const apart = win(t, K.pelea - 0.6, 0.6) * (1 - win(t, END - 1.4, 0.9)); x += side * 0.2 * apart; ry = lerp(ry, -side * 0.2, apart);
  if (side < 0 && t > K.vosotros3 && t < K.dentro + 0.3) { s = 1 + 0.06 * voice(t); }
  if (side > 0 && t > K.solo && t < K.nosotros3 + 0.4) { s = 1 - 0.18 * win(t, K.solo, 0.25) * (1 - win(t, K.nosotros3, 0.35)); }
  if (side > 0 && t > K.software14 - 0.1) { const k = env(t, K.software14 - 0.05, K.informatica14, 0.15, 0.3); y += 0.08 * k; s += 0.12 * k; }
  if (side < 0 && t > K.informatica14 - 0.1) { const k = env(t, K.informatica14 - 0.05, K.comentarios, 0.15, 0.3); y += 0.08 * k; s += 0.12 * k; }
  return { x: x + shake, y, ry, s };
}
// oscilación de bucle (en t = END igual que en t = 0)
const lfreq = f => 2 * Math.PI * Math.max(1, Math.round(f * END / (2 * Math.PI))) / END, lsin = (t, f, ph = 0) => Math.sin(t * lfreq(f) + ph);
function ringAt(t) {
  // ---- aspirantes y guantes
  const C = champ(t, -1), D = champ(t, 1);
  // el bloque de código entra en el chip («una es parte de la otra») y vuelve a su esquina
  const into = win(t, K.parte - 0.05, 0.42) * (1 - win(t, K.y2 + 0.02, 0.4));
  const r5k = pop(t, K.una1 - 0.05, 0.4) * (1 - win(t, K.y2 + 0.15, 0.35));
  S.chip.position.set(C.x, C.y, 0); S.chip.rotation.set(0, C.ry, 0); S.chip.scale.setScalar(C.s);
  S.chip.userData.die.material.emissiveIntensity = 0.9 + 1.2 * (t > K.dicen3 - 0.2 && t < K.dentro + 0.3 ? voice(t) : 0) + 0.8 * env(t, K.informatica14 - 0.05, K.comentarios, 0.15, 0.3);
  S.ring5.G.visible = r5k > 0.01; S.ring5.G.position.set(C.x, C.y, 0.06); S.ring5.G.rotation.set(0, C.ry, 0); S.ring5.G.scale.setScalar(0.55 * Math.max(0.001, r5k));
  const sec = S.ring5.parts[2], am = sec.userData.am, slot = v3(Math.cos(am) * 0.31 * 0.55, Math.sin(am) * 0.31 * 0.55, 0.05).applyAxisAngle(v3(0, 1, 0), C.ry).add(v3(C.x, C.y, 0.06));
  const home = v3(D.x, D.y, 0); S.code.position.copy(home).lerp(slot, sm5(into)); S.code.rotation.set(0, lerp(D.ry, C.ry, into), 0); S.code.scale.setScalar(D.s * lerp(1, 0.34, sm5(into)));
  const punch = (t0, len = 0.28) => { const u = (t - t0) / len; return u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0; };
  const jab = (side, k) => { const per = 0.85, ph = side < 0 ? 0 : 0.42, u = ((t + ph) % per) / per; return (u < 0.28 ? Math.sin(u / 0.28 * Math.PI) : 0) * k; };
  const fight = 1 - win(t, K.una1 - 0.3, 0.3) * (1 - win(t, K.y2 + 0.2, 0.3));      // cuando el código entra en el chip, se para la pelea
  const calm = (1 - win(t, K.dicen3 - 0.3, 0.4)) + win(t, K.pelea - 0.6, 0.6) * 0 + win(t, END - 1.6, 0.8);
  const clash = punch(K.rivales - 0.05, 0.3);
  const drop = env(t, K.ninguna, K.dicen3, 0.15, 0.4);
  [[S.glovesI, C, -1], [S.glovesS, D, 1]].forEach(([gl, P, side]) => {
    const show_ = 1 - sm5(into) * (side > 0 ? 1 : 0.85);
    gl.forEach((g, i) => { const lr = i ? 1 : -1, fwd = v3(-side, 0, 0).applyAxisAngle(v3(0, 1, 0), P.ry * 0.5);
      const ext = Math.max(clash * (i === 0 ? 1 : 0.4), jab(side, clamp(calm) * fight * (i === (side < 0 ? 0 : 1) ? 1 : 0.25)) * 0.9);
      const base = v3(P.x, P.y - 0.05 - 0.07 * drop, 0.12).add(v3(0, lr * 0.06, 0)).add(fwd.clone().multiplyScalar(0.1 + ext * 0.12));
      g.position.copy(base); g.visible = show_ > 0.02; g.scale.setScalar(Math.max(0.001, show_) * (P.s));
      g.lookAt(g.getWorldPosition(_v).add(fwd.clone().multiplyScalar(1)).add(v3(0, 0, 0.0))); g.rotation.z += lr * 0.3; });
  });
  // rayo entre los dos (pelea) y chispas al chocar
  const bk = fight * clamp(calm) * (0.55 + 0.45 * Math.max(clash, Math.abs(Math.sin(t * 13)))), A = v3(C.x + 0.11, C.y, 0.13), B = v3(D.x - 0.11, D.y, 0.13);
  [S.bolt, S.bolt2].forEach((L, li) => { L.visible = bk > 0.05 && into < 0.05; if (!L.visible) return; const n = 24, seed = Math.floor(t * 24) + li * 100; let prev = A.clone();
    for (let i = 1; i <= n; i++) { const u = i / n, p = A.clone().lerp(B, u); p.y += (hash(seed + i * 1.7) - 0.5) * 0.09 * Math.sin(u * Math.PI); p.z += (hash(seed + i * 3.1) - 0.5) * 0.06 * Math.sin(u * Math.PI); if (i === n) p.copy(B); L.userData.set(i - 1, prev, p); prev = p; }
    L.userData.flush(); L.material.opacity = bk * (li ? 0.8 : 1); });
  lookLab(S.lblI, env(t, -1, K.una1, 0.01, 0.3) + env(t, K.dicen3 - 0.2, K.programais, 0.3, 0.3) + env(t, K.informatica14 - 0.2, END - 1.2, 0.3, 0.3), v3(C.x, RING_H + 0.1, 0.25)); S.lblI.scale.setScalar(1);
  lookLab(S.lblS, env(t, -1, K.una1, 0.01, 0.3) + env(t, K.software14 - 0.2, END - 1.2, 0.3, 0.3), v3(D.x, RING_H + 0.1, 0.25));
  // ---- el BOE cae en medio; la «?» encima en «la ley»
  const bt = K.boe1 - 0.25, bu = clamp((t - bt) / 0.4), gone = win(t, K.dicen3 - 0.4, 0.4);
  S.boe.G.visible = t > bt && gone < 0.99; S.boe.G.position.set(-0.13 * 0.62 * 0 - 0.13, RING_H + 0.002 + 1.6 * (1 - bu * bu) + 0.02 * Math.exp(-Math.max(0, t - bt - 0.4) * 9) * Math.sin((t - bt) * 40) + 0.8 * gone * gone, 0.1);
  S.boe.G.rotation.set(0, 0.25 * (1 - bu), 0); S.boe.hinge.rotation.z = -Math.PI; S.boe.G.scale.setScalar(0.62 * Math.max(0.001, 1 - gone));
  const qk = pop(t, K.ley2 - 0.05, 0.4) * (1 - win(t, K.dicen3 - 0.3, 0.3)); S.qm.visible = qk > 0.01; S.qm.position.set(0, RING_H + 0.36 + 0.02 * Math.sin(t * 3), 0.1); S.qm.rotation.y = 0.4 * Math.sin(t * 1.3); S.qm.scale.setScalar(0.42 * Math.max(0.001, qk));
  // ---- final: quien sabe hacerlo (con el portátil) y el cinturón; todo se va antes del último fotograma
  const ck = pop(t, K.pelea - 0.3, 0.4) * (1 - win(t, END - 1.25, 0.4));
  S.coder.visible = ck > 0.01; S.coder.scale.setScalar(Math.max(0.001, ck)); S.coder.position.y = 0;
  if (S.coder.visible) { const J = S.doll.userData.J; J.shL.rotation.x = J.shR.rotation.x = -1.1; J.elL.rotation.x = J.elR.rotation.x = -0.4 + 0.08 * Math.sin(t * 22); J.hpL.rotation.x = J.hpR.rotation.x = -1.4; J.knL.rotation.x = J.knR.rotation.x = 1.4; J.neck.rotation.x = 0.25;
    const up = win(t, K.hacerlo - 0.15, 0.35); J.shL.rotation.x = J.shR.rotation.x = lerp(-1.1, -2.9, up); J.elL.rotation.x = J.elR.rotation.x = lerp(-0.4 + 0.08 * Math.sin(t * 22), -0.3, up);
    drawScreen(S.lap.scrT, clamp((t - K.pelea) / 2.4), t > K.hacerlo - 0.2); }
  const bl = clamp((t - (K.quien - 0.1)) / 0.75), be = 1 - Math.pow(1 - bl, 3), beltOn = t > K.quien - 0.1 && ck > 0.01;
  S.belt.visible = beltOn; if (beltOn) { const above = v3(0, RING_H + 0.66, -0.14); S.belt.position.copy(above).add(v3(0, 0.9 * (1 - be), 0)); S.belt.rotation.set(0.25, (1 - be) * 4 + 0.3 * Math.sin(t * 1.5), 0); S.belt.scale.setScalar(0.62 * ck * (bl >= 1 ? 1 + 0.08 * Math.exp(-(t - K.hacerlo) * 8) * Math.sin((t - K.hacerlo) * 30) : 1)); }
}
// ---------------------------------------------------------------- C · el ordenador: se abre en despiece en «por dentro» y vuelve a montarse con «montar»
function pcAt(t) {
  const G = S.pc, on = t > K.dicen3 && t < K.construimos + 0.3; G.visible = on; if (!on) return;
  const ex = win(t, K.por3 - 0.05, 0.45) * (1 - win(t, K.montar - 0.05, 0.6));
  G.userData.parts.forEach((p, i) => { const k = sm5(clamp(ex * 1.25 - i * 0.05)); p.position.copy(p.userData.home).addScaledVector(p.userData.off, k); p.rotation.set(0.25 * k * (i % 2 ? 1 : -1), 0.4 * k * (i % 3 - 1), 0); });
  setOp(G.userData.caseG, 1 - 0.75 * ex); G.userData.glass.position.z = 0.2 + 0.5 * ex; G.userData.glass.position.y = 0.31 + 0.25 * ex; G.userData.glass.rotation.x = -0.6 * ex; G.userData.glass.material.opacity = 0.16 * (1 - clamp(ex * 3)); G.userData.glass.visible = ex < 0.33; if (G.userData.glass.userData.edges) G.userData.glass.userData.edges.material.opacity = 0.8 * (1 - clamp(ex * 3));
}
// ---------------------------------------------------------------- D · el código se compila en una app, la app entra en el móvil y el móvil se multiplica
function phonesAt(t) {
  const G = S.ph, on = t > K.ordenador4 - 0.3 && t < K.generalista + 0.4; G.visible = on; if (!on) return; const U = G.userData;
  drawTerm(U.tT, clamp((t - (K.nosotros4 - 0.4)) / 1.0));
  const ak = pop(t, K.construimos + 0.25, 0.3), am = sm5(clamp((t - (K.programas + 0.1)) / 0.45));
  U.app.visible = ak > 0.01 && am < 1; U.app.position.copy(v3(0, 0.95, 0.04).lerp(v3(0, 0.44, 0.12), am)); U.app.scale.setScalar(Math.max(0.001, ak) * (1 - 0.6 * am)); U.app.rotation.y = 0.5 * Math.sin(t * 3);
  const pk = pop(t, K.programas - 0.05, 0.35); U.phone.visible = pk > 0.01; U.phone.scale.setScalar(Math.max(0.001, pk)); U.phone.rotation.y = 0.15 * Math.sin(t * 1.2);
  // el mar de móviles: se enciende en ola desde el móvil hacia el ring
  const sk = clamp((t - (K.millones - 0.25)) / 0.9); U.sea.visible = sk > 0.001;
  if (U.sea.visible) { U.pos.forEach(([x, y, z, h], i) => { const d = Math.hypot(x, z - 0.25), k = clamp(sk * 3.2 - d * 0.9 - h * 0.3); _p.set(x, y + 0.0, z); _q.setFromEuler(_e.set(-Math.PI / 2, 0, (h - 0.5) * 0.3)); _s.setScalar(Math.max(0.0001, sm5(k))); _m4.compose(_p, _q, _s); U.sea.setMatrixAt(i, _m4); }); U.sea.instanceMatrix.needsUpdate = true; }
}
// ---------------------------------------------------------------- E · la generalista: las 5 ramas salen del chip, una por palabra
function hubAt(t) {
  const G = S.hub, on = t > K.generalista - 1.2 && t < K.grano + 0.3; G.visible = on; if (!on) return; const U = G.userData;
  const ws = [K.circuitos, K.redes, K.sistemas, K.inteligencia, K.software5];
  U.chip.userData.die.material.emissiveIntensity = 0.9 + 0.6 * voice(t);
  U.sats.forEach((s, i) => { const k = pop(t, ws[i] - 0.05, 0.4), from = v3(0, 0.72, 0.06); s.visible = k > 0.01; s.scale.setScalar(Math.max(0.001, k) * (i === 4 ? 1 + 0.15 * env(t, ws[4], ws[4] + 0.8, 0.1, 0.4) : 1)); s.position.copy(from).lerp(v3(U.at[i][0], U.at[i][1], 0.05), sm5(clamp((t - ws[i] + 0.05) / 0.35))); s.rotation.y = 0.25 * Math.sin(t * 1.4 + i);
    U.links.userData.set(i, from, s.position); });
  U.links.userData.flush(); U.links.material.opacity = 0.8;
}
// ---------------------------------------------------------------- F · requisitos ✓, arquitectura, pruebas en verde y versiones que salen del ciclo
function pipeAt(t) {
  const G = S.pipe, on = t > K.software6 - 0.4 && t < K.politecnica + 0.3; G.visible = on; if (!on) return; const U = G.userData;
  const rk = pop(t, K.requisitos - 0.05, 0.35); U.req.scale.setScalar(Math.max(0.001, rk)); drawReq(U.reqT, Math.floor(clamp((t - K.requisitos) / 0.6) * 3.01));
  const ak = pop(t, K.arquitectura - 0.05, 0.35); U.arch.scale.setScalar(Math.max(0.001, ak));
  const hub = U.boxes[3].position; U.boxes.forEach((b, i) => { if (i < 3) { const k = sm5(clamp((t - K.arquitectura - i * 0.1) / 0.3)); b.position.y = [0.06, 0.06, -0.06][i] + 0.12 * (1 - k); U.archL.userData.set(i, b.position, hub); } });
  U.archL.userData.set(3, U.boxes[0].position, U.boxes[1].position); U.archL.userData.flush(); U.archL.material.opacity = 0.9 * clamp((t - K.arquitectura - 0.25) / 0.3);
  const tk = pop(t, K.pruebas - 0.05, 0.35); U.tests.scale.setScalar(Math.max(0.001, tk)); drawTests(U.testT, Math.floor(clamp((t - K.pruebas) / 0.7) * 5.01));
  const lk = pop(t, K.equipos - 0.05, 0.35); U.loop.scale.setScalar(Math.max(0.001, lk)); U.loop.rotation.z = -Math.max(0, t - K.equipos) * 5.5;
  U.vers.forEach((v, i) => { const t0 = K.entregan + i * 0.42, u = clamp((t - t0) / 0.9); v.visible = t > t0 && u < 1; v.position.set(0.12 + u * 0.32, 0.24 + u * 0.25, 0.02); v.material.opacity = 1 - u * u; v.scale.setScalar(0.9 + 0.3 * eo(clamp(u * 3))); lookLab(v, 1 - u * u, null); });
}
// ---------------------------------------------------------------- G · el marcador: las dos barras suben a su nota; casi iguales
function scoreAt(t) {
  const G = S.score, on = t > K.politecnica - 0.5 && t < K.boe8 + 0.3; G.visible = on; if (!on) return; const U = G.userData;
  const v1 = 10.175 * eo(clamp((t - (K.n1 - 0.25)) / 1.2)), v2 = 10.036 * eo(clamp((t - (K.n2 - 0.25)) / 1.2));
  [v1, v2].forEach((v, i) => { const b = U.bars[i]; b.visible = v > 0.01; b.scale.y = Math.max(0.001, v * SC_K); b.position.y = 0.05 + v * SC_K / 2; });
  U.names.forEach(n => lookLab(n, 1, null)); lookLab(U.uni, win(t, K.politecnica, 0.4), null);
}
// ---------------------------------------------------------------- H · el BOE se abre y sale el anillo de las 5 especialidades; la del software se separa
function specAt(t) {
  const G = S.spec, on = t > K.boe8 - 0.6 && t < K.mitad + 0.3; G.visible = on; if (!on) return; const U = G.userData;
  U.book.hinge.rotation.z = -Math.PI * (1 - win(t, K.boe8 + 0.1, 0.5));
  const rk = pop(t, K.cinco - 0.05, 0.45); U.r5.G.visible = rk > 0.01; U.r5.G.scale.setScalar(1.15 * Math.max(0.001, rk)); U.r5.G.position.y = 1.08 + 0.05 * Math.sin(t * 1.5); U.r5.G.rotation.z = 0.1 * Math.sin(t * 0.7);
  const out = win(t, K.especialidades + 0.2, 0.4), sec = U.r5.parts[2]; sec.position.set(Math.cos(sec.userData.am) * 0.09 * out, Math.sin(sec.userData.am) * 0.09 * out, 0.06 * out);
  sec.material.emissiveIntensity = 0.55 + 0.6 * out;
}
// ---------------------------------------------------------------- I · los créditos: 12 cubos iguales en las dos columnas; luego los 5 de la especialidad (≈ 48)
function credAt(t) {
  const G = S.cred, on = t > K.mitad - 0.6 && t < K.ley10 + 0.2; G.visible = on; if (!on) return; const U = G.userData;
  U.cols.forEach((cubes, ci) => cubes.forEach((c, i) => { const t0 = i < 12 ? K.mitad - 0.1 + i * 0.05 : i < 17 ? K.n48 - 0.1 + (i - 12) * 0.07 : K.especialidad9 + (i - 17) * 0.04, k = pop(t, t0, 0.3); c.visible = k > 0.01; c.scale.setScalar(Math.max(0.001, k)); c.position.y = 0.023 + i * 0.047 + 0.15 * (1 - clamp((t - t0) / 0.25)); }));
  const bk = win(t, K.misma - 0.05, 0.35), x0 = 0.24, y0 = 0.0, y1 = 12 * 0.047;
  U.brace.userData.set(0, v3(x0, y0 + 0.01, 0.07), v3(x0 + 0.03, y0 + 0.01, 0.07)); U.brace.userData.set(1, v3(x0 + 0.03, y0 + 0.01, 0.07), v3(x0 + 0.03, y1, 0.07)); U.brace.userData.set(2, v3(x0 + 0.03, y1, 0.07), v3(x0, y1, 0.07)); U.brace.userData.flush(); U.brace.material.opacity = 0.9 * bk; U.brace.visible = bk > 0.01;
  lookLab(U.lbBase, bk, v3(0.0, y1 / 2, 0.12)); lookLab(U.lb48, win(t, K.n48 + 0.1, 0.3), v3(0.0, 0.023 + 14.5 * 0.047, 0.12));
}
// ---------------------------------------------------------------- J · la ley en blanco; los títulos que se van; el portátil que compila; «ni un título, ni un colegio»
function lawAt(t) {
  const G = S.law, on = t > K.ley10 - 0.7 && t < K.pelea + 0.2; G.visible = on; if (!on) return; const U = G.userData;
  const lawK = 1 - win(t, K.profesion - 0.5, 0.35); U.law.G.visible = lawK > 0.01; U.law.G.scale.setScalar(Math.max(0.001, lawK)); U.law.G.position.set(-0.2, 0.0, 0.0);
  U.law.hinge.rotation.z = -Math.PI * (1 - win(t, K.programar10 - 0.1, 0.55));
  const mid = env(t, K.profesion - 0.35, K.titulo12 - 0.1, 0.3, 0.25);
  U.lap.G.visible = mid > 0.01; U.lap.G.position.set(0, 0.0, 0.05); U.lap.G.scale.setScalar(1.2 * Math.max(0.001, mid)); drawScreen(U.lap.scrT, clamp((t - K.profesion) / 3.2), t > K.otra11 - 0.4);
  U.scrolls.forEach((s, i) => { const tg = i === 0 ? K.una11 : K.otra11, fly = clamp((t - tg) / 0.6); s.visible = mid > 0.01 && fly < 1; s.position.set((i ? 0.09 : -0.09) + (i ? 1 : -1) * fly * 0.6, (i ? 0.5 : 0.64) + fly * 0.9 + 0.02 * Math.sin(t * 2 + i), 0.08); s.rotation.set(0, 0, (i ? -1 : 1) * fly * 2); s.scale.setScalar(Math.max(0.001, mid) * (1 - fly * 0.5)); });
  const tk = pop(t, K.titulo12 - 0.15, 0.3) * (1 - win(t, K.pelea - 0.3, 0.3)); U.title.visible = tk > 0.01; U.title.position.set(-0.15, 0.45, 0.1); U.title.scale.setScalar(Math.max(0.001, tk)); U.title.rotation.y = 0.15;
  const ck = pop(t, K.colegio - 0.2, 0.3) * (1 - win(t, K.pelea - 0.3, 0.3)); U.college.visible = ck > 0.01; U.college.position.set(0.17, 0.18, 0.06); U.college.scale.setScalar(Math.max(0.001, ck)); U.college.rotation.y = -0.2;
  [[U.xs[0], K.titulo12 + 0.05, v3(-0.15, 0.45, 0.13)], [U.xs[1], K.colegio + 0.05, v3(0.17, 0.32, 0.14)]].forEach(([x, t0, p]) => { const k = pop(t, t0, 0.22) * (1 - win(t, K.pelea - 0.3, 0.3)); x.visible = k > 0.01; x.position.copy(p); x.scale.setScalar(Math.max(0.001, k) * (1 + 0.4 * (1 - clamp((t - t0) / 0.15)))); x.material.opacity = clamp(k * 2); });
}
const _sunD = new THREE.Vector3();
function stageAt(t, st) {
  NOW = t;
  ringAt(t); pcAt(t); phonesAt(t); hubAt(t); pipeAt(t); scoreAt(t); specAt(t); credAt(t); lawAt(t);
  // luces alrededor de lo que mira la cámara (la principal del lado de la cámara)
  const c = st.l, d = st.p.distanceTo(c), yaw = Math.atan2(st.p.x - c.x, st.p.z - c.z), k = clamp(d / 6, 0.22, 1.2);
  rigAt(c, yaw, k, 1.2);
  const R = S.rig; R.sun.intensity = 0.0; R.hemi.intensity = 0.08;
  S.gridM.uniforms.camP.value.copy(st.p);
}
