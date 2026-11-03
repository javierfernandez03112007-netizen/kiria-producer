// ---------------------------------------------------------------- estado de cada pieza según el tiempo (puerta, resbalón, cerrojo, rotor, llave, pitones, lámina, fantasma, corte)
let TT = {};
const r60 = x => Math.round(x * 60) / 60;
function buildTimes() {
  TT.cut1 = r60(K.dentro2 + 0.1);         // zambullida en la bocallave (negro)
  TT.cut2 = r60(K.pero7 - 0.05);          // planta del resbalón
  TT.cut3 = r60(K.y10 - 0.04);            // las 200 casas
  TT.cut4 = r60(K.el11 - 0.04);           // planta del cerrojo
  TT.cut5 = r60(K.asi12 - 0.04);          // echa la llave
  TT.l7in = K.resbalon7 + 0.32; TT.l7open = TT.l7in + 0.12; TT.l7rel = TT.l7open + 0.55; TT.l7close = K.portazo7 - 0.62; TT.slam7 = K.portazo7;
  TT.turn6 = [K.gira6, K.gira6 + 1.85]; TT.turn12 = [K.echa12, K.minuto12 + 0.12]; TT.unturn = [K.mandaselo13 + 0.05, K.mandaselo13 + 0.95];
  TT.endOpen = END - 1.7;
}
const inSeg = (t, a, b) => t >= a && t < b;
// la puerta del bucle: abierta del todo en τ = −1 y se cierra de golpe en K.portazo1 (τ = t al principio, τ = t − END al final)
function thetaLoop(tau) {
  const tm = -1.0, T = K.portazo1, TH = 0.75;
  if (tau <= tm - 0.7) return 0;
  if (tau <= tm) return TH * eo(clamp((tau - (tm - 0.7)) / 0.7));
  if (tau < T) { const u = (tau - tm) / (T - tm); return TH * (1 - u * u * u); }
  return 0;
}
function doorTheta(t) {
  if (t < TT.cut1) return thetaLoop(t) + 0.085 * eo(clamp((t - (K.abrirla1 - 0.06)) / 0.5));
  if (inSeg(t, TT.cut2, TT.cut3)) {
    const o = win(t, TT.l7open, 0.6), c = t < TT.slam7 ? Math.pow(clamp((t - TT.l7close) / (TT.slam7 - TT.l7close)), 3) : 1;
    return 0.11 * o * (1 - c) + 0.06 * eo(clamp((t - (K.mete9 + 0.02)) / 0.45));
  }
  if (t >= TT.cut5) return thetaLoop(t - END);
  return 0;
}
// el resbalón empujado por la esquina del marco al cerrar (geometría de la cara inclinada; salta al llegar al agujero del cerradero)
function latchClose(th) {
  if (th <= 0.0018 || th > 0.2) return 0;
  const zr = -0.55 + (4.3 - HING.x) * Math.sin(th);
  return clamp((0.08 - zr) / 0.5909 - 0.07, 0, 0.15);
}
const latchFilm = zTip => clamp((0.08 - (zTip - 0.004)) / 0.5909 - 0.02, 0, 0.2);
// la lámina: { zTip, a, off, flex, buck, t } o null
function filmState(t) {
  if (t >= K.radiografia1 - 0.25 && t < TT.cut1) {
    const t0 = K.radiografia1 - 0.25, ap = 1 - eo(clamp((t - t0) / 0.55));
    const zTip = keyed(t, [[t0 + 0.5, 0.7], [K.puede1 - 0.12, 0.075], [K.abrirla1 - 0.04, -0.065]]);
    return { zTip, a: 1.2, off: v3(2.8 * ap, 0, 1.1 * ap), flex: 0.06 * ap, buck: 0, t };
  }
  if (inSeg(t, K.lamina9 - 0.35, TT.cut3)) {
    const t0 = K.lamina9 - 0.35, ap = 1 - eo(clamp((t - t0) / 0.6));
    const zTip = keyed(t, [[K.entra9 - 0.05, 0.72], [K.rendija9 + 0.1, 0.08], [K.empuja9, 0.072], [K.cara9 + 0.05, 0.0], [K.mete9 - 0.06, -0.065]]);
    const fl = 0.24 * env(t, K.flexible9 - 0.25, K.radiografia9 + 0.2, 0.2, 0.5);
    return { zTip, a: 1.2, off: v3(2.6 * ap, 0, 1.3 * ap), flex: fl + 0.05 * ap, buck: 0, t };
  }
  if (inSeg(t, K.ninguna11 - 0.35, TT.cut5)) {
    const t0 = K.ninguna11 - 0.35, ap = 1 - eo(clamp((t - t0) / 0.5));
    const zTip = keyed(t, [[K.ninguna11 + 0.05, 0.72], [K.lamina11 + 0.05, 0.068]]);
    const push = win(t, K.lamina11 + 0.05, 0.35), bk = push * (0.032 + 0.006 * Math.sin(t * 23));
    return { zTip: Math.max(zTip, 0.066), a: 1.2 + 0.35 * push, off: v3(2.2 * ap, 0, 1.2 * ap), flex: 0.12 * push * (0.6 + 0.4 * Math.sin(t * 13)), buck: bk, t };
  }
  return null;
}
function latchR(t, th, fs) {
  let r = latchClose(th);
  if (inSeg(t, TT.cut2, TT.cut3)) r = Math.max(r, 0.17 * win(t, TT.l7in, 0.14) * (1 - win(t, TT.l7rel, 0.1)));
  if (fs && t < TT.cut4) r = Math.max(r, latchFilm(fs.zTip));
  if (t >= TT.cut5) r = Math.max(r, 0.17 * win(t, END - 1.95, 0.14) * (1 - win(t, END - 1.42, 0.1)));
  return clamp(r, 0, 0.2);
}
function plugPhi(t) {
  let p = 0;
  if (inSeg(t, TT.cut1, TT.cut2)) {
    p += 0.035 * Math.sin((t - K.bloquean4) * Math.PI * 2 * 7.5) * env(t, K.bloquean4 - 0.06, K.giro4 + 0.3, 0.05, 0.15);
    p += 4 * Math.PI * eio(clamp((t - TT.turn6[0]) / (TT.turn6[1] - TT.turn6[0])));
  }
  if (t >= TT.cut5) { p += 4 * Math.PI * eio(clamp((t - TT.turn12[0]) / (TT.turn12[1] - TT.turn12[0]))); p -= 4 * Math.PI * eio(clamp((t - TT.unturn[0]) / (TT.unturn[1] - TT.unturn[0]))); }
  return p;
}
function fPhi(p) { const k = Math.floor(p / (2 * Math.PI)), fr = p - 2 * Math.PI * k; return clamp(k + sm5(clamp((fr - (Math.PI - 0.7)) / 1.4)), 0, 2); }
function boltB(t, p) { if (inSeg(t, TT.cut4, TT.cut5)) return 2 * BSTEP; if (inSeg(t, TT.cut1, TT.cut2) || t >= TT.cut5) return BSTEP * fPhi(p); return 0; }
// la llave: z de su punta (o null si no está)
function keyZ(t) {
  if (inSeg(t, TT.cut1, TT.cut2)) { if (t < K.diente5 - 0.18) return null; return keyed(t, [[K.diente5 - 0.18, 0.66], [K.diente5 + 0.12, 0.31], [K.sube5 + 0.2, 0.2], [K.piton5 + 0.35, 0.1], [K.altura5 - 0.05, KTIP]]); }
  if (t >= TT.cut5) { if (t > END - 1.6) return null; return KTIP + 0.6 * Math.pow(clamp((t - (END - 1.95)) / 0.35), 2); }
  return null;
}
function ghostAt(t) {
  if (t < TT.cut1) return 1 - win(t, K.portazo1 + 0.1, 0.5);
  if (inSeg(t, TT.cut1, TT.cut2)) return 1;
  if (t >= TT.cut5) return Math.max(1 - win(t, K.tu13 - 0.25, 0.6), win(t, END - 1.55, 0.6));
  return 0;
}
function xrayAt(t) { if (t < TT.cut1) return 1 - win(t, K.portazo1 + 0.1, 0.5); if (t >= TT.cut5) return win(t, END - 1.55, 0.6); return 0; }
function clipAt(t) {
  if (inSeg(t, TT.cut2, TT.cut3)) { const up = win(t, K.lamina9 - 0.3, 0.45) * (1 - win(t, K.entra9 + 0.25, 0.45)); return lerp(LY + 0.12, 32, up * up); }
  if (inSeg(t, TT.cut4, TT.cut5)) return BY + 0.18;
  return CLIPOFF;
}
const cutMode = t => inSeg(t, TT.cut1, TT.cut2);

// ---------------------------------------------------------------- extras: línea de corte (dorada) y bloqueos (rojos) en el corte del bombín; polvo
function buildExtras() {
  const sl = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.0035, 0.27), basicGlow(0xffc24a, 2.4)); sl.position.set(0.0012, SHEAR, 0.17); S.cyl.add(sl); S.shearLine = sl; sl.material.opacity = 0;
  S.blockMarks = PZ.map(z => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.004, 0.032), basicGlow(0xff4433, 2.6)); b.position.set(0.0014, SHEAR, z); S.cyl.add(b); b.material.opacity = 0; return b; });
  S.flow = [
    flowCloud(9000, i => [3.8 + gauss(i) * 1.6, 10.8 + gauss(i + 5e3) * 1.4, 0.6 + Math.abs(gauss(i + 9e3)) * 1.8], { size: 1.4, bright: 0.5, seed: 1, nearF: 0.05, farF: 0.05, col: 0xfff0d8, drift: 0.02 }),
    flowCloud(4000, i => [3.55 + gauss(i) * 0.35, 10.55 + gauss(i + 3e3) * 0.3, gauss(i + 6e3) * 0.4], { size: 1.0, bright: 0.35, seed: 2, nearF: 0.02, farF: 0.1, col: 0xd8ecff, drift: 0.004 }),
    flowCloud(5000, i => [gauss(i) * 14, 0.3 + hash(i * 4.4) * 7, 60 - 9 + clamp(gauss(i + 7e3), -2.5, 1.2) * 6], { size: 1.3, bright: 0.45, seed: 3, nearF: 2.0, farF: 0.02, col: 0xffe0b8, drift: 0.02 }),
  ];
}
function ghostSet(g, lines = 1) {
  for (const it of GH) { const m = it.m, op = 1 - g * (1 - it.min), tr = op < 0.999; m.opacity = op; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.depthWrite = op > 0.6; }
  for (const it of GE) { const a = g * it.a * (it.grp === 'door' ? lines : 1); it.l.material.opacity = a; it.l.visible = a > 0.01; }
  for (const o of S.ghostCasters) o.castShadow = g < 0.5;
}

// ---------------------------------------------------------------- aplica el estado
function lockAt(t) {
  const lock = !inSeg(t, TT.cut3, TT.cut4);
  S.root.visible = lock; S.houses.visible = !lock;
  if (!lock) { housesAt(t, h => clamp((t - K.n200 + 0.15 - h.d * 0.022) / 0.3)); return; }
  const th = doorTheta(t), fs = filmState(t), g = ghostAt(t), cy = clipAt(t), cm = cutMode(t);
  S.DG.rotation.y = th;
  const side = inSeg(t, TT.cut1, TT.cut2) ? win(t, K.dentro3, 0.5) * (1 - win(t, K.entonces6 + 0.2, 0.5)) : 0;     // vista lateral del bombín
  ghostSet(g, 1 - side); post.uniforms.xray.value = xrayAt(t);
  M.boltM.opacity = 1 - 0.85 * side; M.boltM.depthWrite = side < 0.5;
  for (const m of S.sideFade) { m.opacity = 1 - 0.9 * side; m.depthWrite = side < 0.5; }
  S.clipPl.constant = cy;
  for (const c of S.caps) { c.visible = cy < 100; c.position.y = cy - 0.0005; }
  S.floor.d.visible = cy > 100; S.inside.visible = cy > 100;
  // bombín: entero o cortado por la mitad (para ver los pitones)
  const U = S.cyl.userData; U.full.visible = !cm; U.cut.visible = cm; S.plugCut.visible = cm; U.full.userData.plugFace.visible = !cm;
  S.frontPlate.visible = !cm;
  const p = plugPhi(t), zk = keyZ(t); S.plug.rotation.z = p;
  S.key.visible = zk !== null; if (zk !== null) S.key.position.z = zk;
  const pw = Math.abs(Math.atan2(Math.sin(p), Math.cos(p))) > 0.06;
  for (const P of S.pins) {
    let yb = PREST; if (zk !== null) { const u = P.z - zk; if (u >= 0 && u <= KLEN) yb = Math.max(PREST, keyTop(u)); }
    P.kp.position.y = yb; const db = pw ? SHEAR : yb + KPL[P.i], dt = db + DRV;
    P.dp.position.y = db; P.sp.position.y = dt; P.sp.scale.y = Math.max(0.01, CHTOP - dt);
  }
  // cerrojo y resbalón
  S.bolt.position.x = boltB(t, p);
  const r = latchR(t, th, fs); S.latch.position.x = -r; S.latchSpring.scale.x = Math.max(0.05, 0.476 - r);
  // lámina
  // (en planta, la lámina se dibuja solo como su corte: una línea que brilla)
  S.film.visible = !!fs && cy > FILM.y1 + 0.3; if (fs) filmSet(fs, cy); S.filmLine.visible = !!fs && cy < FILM.y1;
  // resaltes
  S.bevel.material.opacity = 0.75 * cw2(t, K.cara8 - 0.05, K.lamina9 - 0.2) * (0.75 + 0.25 * Math.sin(t * 9)) + 0.6 * cw2(t, K.empuja9, K.mete9 + 0.2);
  S.boltFace.material.opacity = 0.4 * cw2(t, K.recto11 - 0.05, K.mueve11 + 0.5);
  S.shearLine.material.opacity = 0.9 * cw2(t, K.alinean5 - 0.08, K.gira6 + 0.1) + 0.5 * cw2(t, K.altura5, K.alinean5 - 0.08);
  const bl = cw2(t, K.bloquean4 - 0.05, K.cada5 - 0.1) * (0.7 + 0.3 * Math.sin(t * 20)); for (const b of S.blockMarks) b.material.opacity = bl;
  // el interior (luz cálida por la rendija; más cuando se abre; casi nada en modo fantasma)
  S.inside.material.color.setScalar((0.45 + 2.2 * clamp(th / 0.1)) * Math.pow(1 - g, 3));
}
const cw2 = (t, t0, t1) => win(t, t0, 0.2) * (1 - win(t, t1, 0.2));
