// ---------------------------------------------------------------- «Empieza torcido» (v2): LO QUE PASA EN CADA FOTOGRAMA (todo depende solo de t).
const FLY = 0.38;
function launchT(k) { return TT.fly0 + (TT.fly1 - FLY - TT.fly0) * Math.pow(k / (STEPS.n - 1), 0.82); }
function landT(k) { return launchT(k) + FLY; }
// en qué escalón está (con decimales mientras salta al siguiente)
function climbI(t) { let c = 0; for (let i = 1; i <= STEPS.n; i++) { const t0 = landT(i - 1) + 0.08; c += eio(seg(t, t0, t0 + 0.26)); } return c; }
const doorC = () => _v(DOOR.x, DOOR.y + DOOR.h * 0.55, DOOR.z);
// ---- el cubo: en el suelo delante de él → lo levanta → lo deja un poco más allá (primer escalón)
function cubeAt(t) { if (t < TT.stand + 0.2) return CUBE0.clone(); if (t >= TT.place) return STEP0.clone();
  const u = seg(t, TT.stand + 0.2, TT.place), p = CUBE0.clone().lerp(STEP0, eio(u)); p.y += Math.sin(u * Math.PI) * 0.22; return p; }
function animA(t) { const A = CAST.A, U = A.userData, J = U.J; poseReset(A); const cb = cubeAt(t);
  if (t < TT.stand) {                                                  // arrodillado, pule; luego para y mira la puerta
    A.position.copy(KNEEL); A.rotation.set(0, Math.PI / 2, 0); poseKneel(A, 1); poseHunch(A, 0.8); A.updateMatrixWorld(true);
    const stop = win(t, TT.look - 0.25, 0.3); posePolish(A, cb.clone().add(_v(0, 0.02, 0)), t, 1 - 0.999 * stop, 1 - stop);
    const lk = win(t, TT.look, 0.4); if (lk > 0) { J.spine.rotation.x = lerp(J.spine.rotation.x, 0.15, lk); J.chest.rotation.x = lerp(J.chest.rotation.x, 0, lk); J.neck.rotation.x = lerp(J.neck.rotation.x, 0, lk); J.head.rotation.x = lerp(J.head.rotation.x, 0, lk); A.updateMatrixWorld(true); lookAtP(A, doorC(), lk); }
  } else if (t < TT.step0) {                                           // se levanta, lleva el cubo un poco más allá, lo deja y se sube
    const up = eio(seg(t, TT.stand, TT.stand + 0.3)), w = eio(seg(t, TT.stand + 0.15, TT.place)), on = eio(seg(t, TT.place + 0.02, TT.step0));
    const base = KNEEL.clone().lerp(_v(STEP0.x - 0.42, 0, STEP0.z), w); A.position.copy(base); A.rotation.set(0, Math.PI / 2, 0);
    poseKneel(A, 1 - up); const bend = Math.sin(clamp(seg(t, TT.stand + 0.1, TT.place + 0.05)) * Math.PI) * 0.8 + 0.3 * (1 - up);
    J.spine.rotation.x += 0.6 * bend; J.hpL.rotation.x -= 0.5 * bend; J.hpR.rotation.x -= 0.5 * bend; J.knL.rotation.x += 0.8 * bend; J.knR.rotation.x += 0.8 * bend; J.pelvis.position.y -= 0.16 * bend;
    if (w > 0.02 && w < 0.98) poseWalk(A, w * 1.2, 0.35);
    A.updateMatrixWorld(true); const hold = t < TT.place ? 1 : 1 - seg(t, TT.place, TT.place + 0.1);
    reachTo(A, 'L', cb.clone().add(_v(-0.02, 0.04, 0.17)), hold, _v(0, -1, -0.3)); reachTo(A, 'R', cb.clone().add(_v(-0.02, 0.04, -0.17)), hold, _v(0, -1, -0.3));
    lookAtP(A, cb, 0.7);
  } else if (t < TT.open) {                                            // sube escalón a escalón mirando los bloques que vuelan; arriba, la mano en la puerta
    const c = climbI(t), c0 = Math.floor(c), f = c - c0, on = eio(seg(t, TT.step0, TT.step0 + 0.22));
    const a = stepTopAt(c0), b = stepTopAt(Math.min(STEPS.n, c0 + 1)), p = c0 >= STEPS.n ? a : a.clone().lerp(b, f); p.y += Math.sin(f * Math.PI) * 0.1;
    if (on < 1) { const st = _v(STEP0.x - 0.42, 0, STEP0.z); p.lerp(st, 1 - on); p.y += Math.sin(on * Math.PI) * 0.08; }
    A.position.copy(p); A.rotation.set(0, Math.PI / 2, 0); breathe(A, t);
    const hop = Math.sin(f * Math.PI); J.hpL.rotation.x = -0.55 * hop; J.knL.rotation.x = 0.95 * hop; J.hpR.rotation.x = 0.15 * hop; J.knR.rotation.x = 0.35 * hop;
    J.shL.rotation.z = -0.25; J.shR.rotation.z = 0.25; J.elL.rotation.x = -0.35; J.elR.rotation.x = -0.35;
    let tgt = null; for (const bk of PB.list) if (bk.step && t >= launchT(bk.i) - 0.05 && t < landT(bk.i) + 0.1) { tgt = bk.m.position.clone(); break; }
    A.updateMatrixWorld(true); lookAtP(A, tgt || doorC(), 0.8);
    const push = win(t, TT.push - 0.15, 0.2); if (push > 0) reachTo(A, 'L', _v(DOOR.x + DOOR.w / 2 - 0.14, DOOR.y + DOOR.h * 0.48, 0.12), push, _v(0, -1, 0.3));
  } else {                                                             // entra por la puerta y se queda en el umbral, de espaldas, a contraluz
    const w = eio(seg(t, TT.walk0, TT.walk1)), from = stepTopAt(STEPS.n), to = _v(DOOR.x + 0.02, DOOR.y, 0.0), p = from.clone().lerp(to, w);
    p.y += Math.sin(w * Math.PI) * 0.06; A.position.copy(p); A.rotation.set(0, lerp(Math.PI / 2, Math.PI, eio(seg(t, TT.open, TT.walk0 + 0.4))), 0); breathe(A, t);
    if (w > 0.01 && w < 0.99) poseWalk(A, w * 1.4, 0.5);
    const open = win(t, TT.walk1, 0.9); J.shL.rotation.z = -0.06 - 0.32 * open; J.shR.rotation.z = 0.06 + 0.32 * open; J.head.rotation.x = -0.12 * open; }
  const warm = clamp((A.position.y - 0.25) / 2.1); CAST.AM.color.copy(CAST.A0).lerp(CAST.A1, sm5(warm)); CAST.AM.emissive = CAST.AM.emissive || new THREE.Color(); }
// ---- los bloques tachados: del montón a su escalón (arco y un pequeño aplastamiento al posarse)
const _bq = new THREE.Quaternion(), _bq2 = new THREE.Quaternion(), _be = new THREE.Euler();
function animBlocks(t) { for (const b of PB.list) { if (!b.step) continue; const t0 = launchT(b.i), u = clamp((t - t0) / FLY), m = b.m, f = b.from, to = b.to;
    m.position.copy(f.p).lerp(to.p, eio(u)); m.position.y += Math.sin(u * Math.PI) * (0.5 + 0.25 * f.p.distanceTo(to.p));
    const land = clamp((t - t0 - FLY) / 0.18), sq = land > 0 && land < 1 ? Math.sin(land * Math.PI) * 0.08 : 0; m.scale.set(1 + sq, 1 - sq, 1 + sq);
    _bq.setFromEuler(_be.set(f.r.x, f.r.y, f.r.z)); _bq2.setFromEuler(_be.set(to.r.x, to.r.y, to.r.z)); m.quaternion.copy(_bq).slerp(_bq2, eio(u)); if (u > 0 && u < 1) m.rotateX(u * Math.PI * 2 * (b.i % 2 ? 1 : -1)); } }
// ---- polvo de cada bloque al posarse
function animDust(t) { const a = DUST.p.geometry.attributes.position, per = DUST.n; let any = false;
  for (let j = 0; j < STEPS.n; j++) { const b = PB.list[j], u = t - landT(j), c = b.to.p.clone().add(_v(0, -b.h / 2, 0));
    for (let k = 0; k < per; k++) { const s = DUST.seed[j * per + k], i = j * per + k; if (u < 0 || u > 0.7) { a.setXYZ(i, 0, -50, 0); continue; } any = true;
      const r = s.v * Math.min(u, 0.35) * 1.2; a.setXYZ(i, c.x + Math.cos(s.a) * r, c.y + s.up * u - 1.1 * u * u, c.z + Math.sin(s.a) * r * 0.6); } }
  a.needsUpdate = true; DUST.p.visible = any; }
// ---- la puerta: rendijas, entreabierta (el rayo), abierta (la luz lo inunda)
function animDoor(t) { const U = S.st.userData, crack = win(t, TT.crack, 0.35), open = eio(seg(t, TT.open, TT.open + 0.5));
  U.hinge.rotation.y = -(0.14 * crack * (1 - open) + 1.95 * open);
  const k = 0.25 + 0.45 * crack + 1.0 * open; U.sp.intensity = 6 + 28 * crack + 110 * open; U.frameM.emissiveIntensity = 0.7 + 0.6 * crack + 1.6 * open;
  U.lightM.color.setScalar(2.2 + 2.5 * open); beamAt(U, 0.35 * crack + 0.9 * open, 0.35 + 1.4 * open);
  S.cube.userData.m.emissiveIntensity = 0.25 * crack * (1 - win(t, TT.place, 0.3)) + 0.18 * win(t, TT.place - 0.05, 0.1) * (1 - win(t, TT.place + 0.1, 0.5)); }
function animGlint(t) { const g = S.glint, ph = ((t + 0.2) % 1.8) / 1.8, k = t < TT.look ? Math.sin(clamp(ph / 0.35) * Math.PI) : win(t, TT.crack, 0.2) * (1 - win(t, TT.stand, 0.3));
  const cb = cubeAt(t); g.position.copy(cb).add(_v(-0.1 + 0.2 * clamp(ph / 0.35), 0.15, 0.16)); g.material.opacity = 0.95 * k; g.scale.setScalar(0.08 + 0.18 * k); g.material.rotation = t * 0.8; }
function animAt(t, st) { animA(t); animBlocks(t); animDust(t); animDoor(t); animGlint(t); S.cube.position.copy(cubeAt(t)); }
