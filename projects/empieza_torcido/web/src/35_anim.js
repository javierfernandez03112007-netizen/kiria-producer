// ---------------------------------------------------------------- «Empieza torcido»: LO QUE PASA EN CADA FOTOGRAMA (todo depende solo de t).
const FLY = 0.36;                                                     // lo que tarda cada bloque en volar del montón a su sitio
function launchT(k) { const n = PB.list.length - 1; return TT.fly0 + (TT.fly1 - FLY - TT.fly0) * Math.pow(k / n, 0.78); }
function landT(k) { return launchT(k) + FLY; }
function colDone(c) { let last = -1; PB.list.forEach((b, i) => { if (b.c === c) last = i; }); return landT(last); }
const SLOT0 = () => _v(STP.x0, STP.bh / 2, STP.z);
const colTop = c => _v(STP.x0 + STP.dx * c, STP.bh * (c + 1), STP.z);   // dónde pisa en la columna c (0 = el bloque perfecto)
// en qué columna está subido (con decimales mientras salta a la siguiente)
function climbC(t) { let c = 0; for (let k = 1; k < STP.cols; k++) { const t0 = colDone(k) + 0.1; c += eio(seg(t, t0, t0 + 0.26)); } return c; }
// ---- el bloque perfecto: en el banco → en sus manos → en el suelo (primer escalón)
function carryPos(t) { const A = CAST.A; A.updateMatrixWorld(true); const f = _v(Math.sin(A.rotation.y), 0, Math.cos(A.rotation.y)); return A.position.clone().addScaledVector(f, 0.3).add(_v(0, 0.98, 0)); }
function blockAt(t) { if (t < TT.stand + 0.05) return { p: BLOCK0.clone(), r: 0 };
  if (t >= TT.place) return { p: SLOT0(), r: 0 };
  const up = BLOCK0.clone().add(_v(0.05, 0.22, 0.05)), a = eio(seg(t, TT.stand + 0.05, TT.stand + 0.3));
  if (t < TT.stand + 0.3) return { p: BLOCK0.clone().lerp(up, a), r: 0 };
  const c = carryPos(t), b = eio(seg(t, TT.place - 0.32, TT.place)); return { p: c.lerp(SLOT0(), b), r: 0 }; }
// ---- A
function animA(t) { const A = CAST.A, U = A.userData, J = U.J; poseReset(A); A.visible = true;
  const bp = blockAt(t).p.add(S.B.position);                             // en coordenadas del mundo (la IK trabaja en el mundo)
  if (t < TT.stand) {                                                    // sentado: pule; luego se queda quieto y mira la luz
    A.position.set(SEAT.x, SEAT.h - 0.47 * U.k, SEAT.z); A.rotation.set(0, Math.PI / 2, 0); poseSit(A, 0.08); poseHunch(A, 1); A.updateMatrixWorld(true);
    const stop = win(t, TT.look - 0.25, 0.3); posePolish(A, bp, t, 1 - 0.999 * stop, 1 - stop);
    const lk = win(t, TT.look, 0.4); if (lk > 0) { J.spine.rotation.x = lerp(J.spine.rotation.x, 0.05, lk); J.chest.rotation.x = lerp(J.chest.rotation.x, 0, lk); J.neck.rotation.x = lerp(J.neck.rotation.x, 0, lk); J.head.rotation.x = lerp(J.head.rotation.x, 0, lk); A.updateMatrixWorld(true); lookAtP(A, _v(HATCH.x - 0.1, BS.y1, HATCH.z), lk); }
  } else if (t < TT.step0) {                                             // se levanta con el bloque, va al sitio y lo deja en el suelo
    const up = eio(seg(t, TT.stand, TT.stand + 0.35)), w = seg(t, TT.stand + 0.25, TT.place - 0.3), dest = _v(STP.x0 - 0.36, 0, STP.z), from = _v(SEAT.x, 0, SEAT.z);
    const p = from.clone().lerp(dest, eio(w)); A.position.copy(p); A.position.y = (SEAT.h - 0.47 * U.k) * (1 - up);
    const ang = Math.atan2(dest.x - from.x, dest.z - from.z); A.rotation.set(0, lerp(Math.PI / 2, ang, eio(seg(t, TT.stand + 0.1, TT.stand + 0.4))) * (1 - eio(seg(t, TT.place - 0.45, TT.place - 0.2))) + Math.PI / 2 * eio(seg(t, TT.place - 0.45, TT.place - 0.2)), 0);
    poseSit(A, 0.08); for (const n of ['hpL', 'hpR', 'knL', 'knR']) J[n].rotation.x *= 1 - up; J.pelvis.position.y = lerp(0.47 * U.k, U.base.pelY, up);
    if (w > 0 && w < 1) poseWalk(A, w * 1.6, 0.7);
    const bend = Math.sin(clamp(seg(t, TT.place - 0.32, TT.step0 - 0.02)) * Math.PI); J.spine.rotation.x += 0.75 * bend; J.hpL.rotation.x -= 0.6 * bend; J.hpR.rotation.x -= 0.6 * bend; J.knL.rotation.x += 0.9 * bend; J.knR.rotation.x += 0.9 * bend; J.pelvis.position.y -= 0.2 * bend;
    J.head.rotation.x = 0.25; A.updateMatrixWorld(true);
    const hold = t < TT.place ? 1 : 1 - seg(t, TT.place, TT.place + 0.12); reachTo(A, 'L', bp.clone().add(_v(-0.02, 0.02, 0.2)), hold, _v(0, -1, -0.3)); reachTo(A, 'R', bp.clone().add(_v(-0.02, 0.02, -0.2)), hold, _v(0, -1, -0.3));
  } else if (t < TT.open) {                                              // sube columna a columna mirando los bloques que vuelan; arriba, empuja la trampilla
    const c = climbC(t), c0 = Math.floor(c), f = c - c0, a = colTop(c0), b = colTop(Math.min(STP.cols - 1, c0 + 1)), on = eio(seg(t, TT.step0, TT.step0 + 0.22));
    const p = c0 >= STP.cols - 1 ? a : a.clone().lerp(b, f); p.y += Math.sin(f * Math.PI) * 0.12; if (on < 1) { const st = _v(STP.x0 - 0.36, 0, STP.z); p.lerp(st, 1 - on); p.y += Math.sin(on * Math.PI) * 0.1; }
    A.position.copy(p); A.rotation.set(0, Math.PI / 2, 0); breathe(A, t);
    const hop = Math.sin(f * Math.PI); J.hpL.rotation.x = -0.5 * hop; J.knL.rotation.x = 0.9 * hop; J.hpR.rotation.x = 0.15 * hop; J.knR.rotation.x = 0.3 * hop;
    J.shL.rotation.z = -0.25; J.shR.rotation.z = 0.25; J.elL.rotation.x = -0.4; J.elR.rotation.x = -0.4;
    // mira el bloque que vuela (o arriba, a la trampilla, cuando ya no quedan)
    let tgt = null; for (const bk of PB.list) if (t >= launchT(bk.i) - 0.05 && t < landT(bk.i) + 0.1) { tgt = bk.m.position.clone(); break; }
    A.updateMatrixWorld(true); const hatchL = _v(HATCH.x, BS.y1 - BS.y0, HATCH.z); lookAtP(A, (tgt || hatchL).clone().add(S.B.position), 0.8);
    const push = win(t, TT.push - 0.2, 0.25); if (push > 0) { const hy = BS.y1 - BS.y0 - 0.02 + 0.08 * win(t, TT.open - 0.1, 0.1); reachTo(A, 'L', _v(HATCH.x - 0.12, hy, HATCH.z + 0.18).add(S.B.position), push, _v(0, 0, -1)); reachTo(A, 'R', _v(HATCH.x - 0.12, hy, HATCH.z - 0.18).add(S.B.position), push, _v(0, 0, -1)); J.head.rotation.x = -0.5 * push; }
  } else {                                                               // sale a la hierba y se queda de cara al sol
    const o = eio(seg(t, TT.out0, TT.out1)), top = colTop(STP.cols - 1), grassY = -BS.y0, out = _v(HATCH.x - 0.02, grassY, HATCH.z - HATCH.s / 2 - 0.42);
    const p = top.clone().lerp(out, o); p.y = lerp(top.y, grassY, eio(seg(t, TT.open, TT.out1 - 0.25))); A.position.copy(p);
    A.rotation.set(0, lerp(Math.PI / 2, Math.PI, eio(seg(t, TT.out0 + 0.3, TT.out1 + 0.2))), 0); breathe(A, t);
    const climb = Math.sin(clamp(seg(t, TT.open, TT.out1)) * Math.PI); J.hpL.rotation.x = -0.9 * climb; J.knL.rotation.x = 1.3 * climb; J.spine.rotation.x = 0.35 * climb;
    J.shL.rotation.x = J.shR.rotation.x = -2.6 * climb; J.elL.rotation.x = J.elR.rotation.x = -0.3 * climb;
    const open = win(t, TT.turn, 1.2); J.shL.rotation.z = -0.06 - 0.5 * open; J.shR.rotation.z = 0.06 + 0.5 * open; J.head.rotation.x = -0.25 * open; J.chest.rotation.x = -0.08 * open; }
  // color: se calienta al subir
  const warm = clamp((A.position.y - 0.15) / 2.6); CAST.AM.color.copy(CAST.A0).lerp(CAST.A1, sm5(warm)); }
// ---- los bloques tachados: del montón a la escalera
const _bq = new THREE.Quaternion(), _bq2 = new THREE.Quaternion(), _be = new THREE.Euler();
function animPile(t) { for (const b of PB.list) { const t0 = launchT(b.i), u = clamp((t - t0) / FLY), m = b.m;
    const f = b.from, to = b.to; m.position.copy(f.p).lerp(to.p, u); m.position.y += Math.sin(u * Math.PI) * (0.45 + 0.3 * f.p.distanceTo(to.p));
    // al posarse, un pequeño aplastamiento
    const land = clamp((t - t0 - FLY) / 0.18), sq = land > 0 && land < 1 ? Math.sin(land * Math.PI) * 0.08 : 0; m.scale.set(1 + sq, 1 - sq, 1 + sq);
    _bq.setFromEuler(_be.set(f.r.x, f.r.y, f.r.z)); _bq2.setFromEuler(_be.set(to.r.x, to.r.y, to.r.z)); m.quaternion.copy(_bq).slerp(_bq2, eio(u)); if (u > 0 && u < 1) m.rotateX(u * Math.PI * 2 * (b.i % 2 ? 1 : -1)); } }
// ---- la trampilla, las rendijas, el rayo, la luz de arriba, el flexo, el árbol, la hierba
function animLight(t) { const U = S.bas.userData, o = eio(seg(t, TT.open, TT.open + 0.35)) + Math.sin(clamp(seg(t, TT.open + 0.35, TT.open + 0.7)) * Math.PI) * 0.06, push = win(t, TT.push, 0.25) * (1 - o);
  for (const h of U.hatch) h.piv.rotation.z = -h.s * (1.95 * o + 0.08 * push);
  U.leak.visible = o < 0.05; U.leakM.opacity = 0.75 + 0.25 * win(t, TT.ray - 0.2, 0.3) + 0.3 * push;
  const ry = win(t, TT.ray, 0.25) * (1 - win(t, TT.stand + 0.3, 0.5)), from = _v(HATCH.x - 0.08, BS.y1 - BS.y0, HATCH.z + 0.02), to = BLOCK0.clone().add(_v(0.02, 0.1, 0)), d = to.clone().sub(from);
  S.ray.visible = ry > 0.01; S.ray.position.copy(from); S.ray.quaternion.setFromUnitVectors(_v(0, -1, 0), d.clone().normalize()); S.ray.scale.set(1, d.length(), 1); S.ray.material.uniforms.k.value = ry;
  S.raySrc.p.copy(to).add(S.B.position).add(_v(0, 0.12, 0.1)); S.raySrc.I = 1.6 * ry;
  S.block.userData.m.emissiveIntensity = 0.35 * ry + 0.25 * win(t, TT.place, 0.3) * (1 - o * 0.5);
  S.hsp.visible = o > 0.01; S.hsp.intensity = 34 * o; S.shaft.visible = o > 0.01; S.shaft.material.uniforms.k.value = o; S.hsrc.I = 5 * o;
  S.lamp.bulbM.emissiveIntensity = 3.0 * (1 - 0.5 * o);
  // el árbol: desnudo; florece cuando sale
  const T = S.tree.userData, bl = win(t, TT.bloom - 0.15, 0.6); T.crown.visible = bl > 0.01; T.crown.scale.setScalar(Math.max(0.001, 0.3 + 0.7 * eo(bl)));
  for (const c of T.crown.children) if (c.isMesh) c.visible = false; T.flowers.visible = bl > 0.01; T.flowers.children.forEach(f => { const k = eo(clamp((bl - f.userData.d * 0.5) / 0.5)); f.scale.setScalar(Math.max(0.001, k)); });
  T.bloom.emissiveIntensity = 0.25 * bl; S.isl.userData.grass.color.set(0x7a7a4e).lerp(new THREE.Color(0x6f9e48), bl); }
function animGlint(t) { const g = S.glint, ph = ((t + 0.2) % 2.0) / 2.0, k = t < TT.look ? Math.sin(clamp(ph / 0.35) * Math.PI) : Math.max(0, win(t, TT.ray + 0.05, 0.2) * (1 - win(t, TT.stand, 0.3)));
  const bp = blockAt(t).p; g.position.copy(bp).add(_v(-0.12 + 0.24 * clamp(ph / 0.35), STP.bh / 2 + 0.01, STP.bd / 2 - 0.05)); g.material.opacity = 0.95 * k; g.scale.setScalar(0.1 + 0.2 * k); g.material.rotation = t * 0.8; }
function animAt(t, st) {
  animA(t); animPile(t); animLight(t); animGlint(t); fallAt(t);
  const bk = blockAt(t); S.block.position.copy(bk.p); S.block.rotation.set(0, 0, 0);
}
