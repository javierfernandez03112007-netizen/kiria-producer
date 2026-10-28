// ---------------------------------------------------------------- estado de la escena en cada instante (todo es función de t)
const wpos = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const popS = (t, t0, d = 0.35) => Math.max(1e-4, pop(t, t0, d));
const bump = (t, t0, d) => { const u = (t - t0) / d; return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u); };
function loopT(t) { return t > END - 0.72 ? t - END : t; }      // al final, el principio otra vez (bucle)
const _m = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _one = new THREE.Vector3(1, 1, 1), _ee = new THREE.Euler();
const LV = v3(-0.13, 0.66, 0), LF = v3(0.13, 0.66, 0), LFC = v3(0, 0.68, 0), LH = 0.22, LHC = 0.26;   // la V y la F sobre la sartén
let ANCH = null;
function anchors() {          // puntos del mundo que usan los vuelos y la cámara (tapa del portátil abierta)
  if (ANCH) return ANCH;
  S.room.R.updateMatrixWorld(true); const op = S.lap.lid.rotation.x;
  const bub = S.sheet.bubV(), sheetC = S.sheet.G.localToWorld(v3(0, 0, 0)), row37 = S.sheet.row37();
  S.lap.setOpen(1); S.room.R.updateMatrixWorld(true);
  const Mo = S.lap.scr.matrixWorld.clone(), at = (x, y, z) => v3(x, y, z).applyMatrix4(Mo);     // la pantalla con la tapa abierta (copia fija)
  const sc = at(0, 0, 0), sn = at(0, 0, 1).sub(sc).normalize(), su = at(0, 1, 0).sub(sc).normalize(), sr = at(1, 0, 0).sub(sc).normalize();
  const q = at(...QMARK_LOCAL().toArray());
  S.lap.lid.rotation.x = op; S.room.R.updateMatrixWorld(true);
  const row37b = S.sheet.G.localToWorld(S.sheet.xy(415, rowY(6)));
  ANCH = { bub, sheetC, row37, row37b, sc, sn, su, sr, q, at };
  return ANCH;
}
const TV0 = () => K.trampa1 + 0.5, TV1 = () => TV0() + 0.85;          // la V vuela de la sartén a la hoja
const TF0 = () => K.falso9 - 0.05, TF1 = () => K.falso9 + 0.85;       // la F vuela de la pantalla a la sartén
function bez3(a, b, c, d, u) { const v = 1 - u; return a.clone().multiplyScalar(v * v * v).addScaledVector(b, 3 * u * v * v).addScaledVector(c, 3 * u * u * v).addScaledVector(d, u * u * u); }
// la V sube, cruza el aire y entra en la mesa por la derecha (sin pasar por la cabeza del opositor)
function vPath(t) { const A = anchors(), u = eio(clamp((t - TV0()) / (TV1() - TV0())));
  return { p: bez3(LV, LV.clone().add(v3(1.6, 1.3, -1.2)), A.bub.clone().add(v3(1.25, 0.75, 0.25)), A.bub.clone().add(v3(0, 0.01, 0)), u), h: lerp(LH, 0.026, Math.pow(u, 0.7)), u }; }
// la F sale de la pantalla y sube por encima del portátil (0,3 s); luego cruza el aire y cae sobre la sartén
const TF_OUT = 0.3;
const fQ1 = () => { const A = anchors(); return A.q.clone().addScaledVector(A.sn, 0.12).add(v3(0, 0.32, 0)); };
function fPath(t) {
  const A = anchors(), Q1 = fQ1(), u1 = clamp((t - TF0()) / TF_OUT);
  if (t < TF0() + TF_OUT) return { p: A.q.clone().lerp(Q1, eo(u1)), h: lerp(0.006, 0.1, sm5(u1)), u: 0 };
  const u = eio(clamp((t - TF0() - TF_OUT) / (TF1() - TF0() - TF_OUT)));
  return { p: bez3(Q1, Q1.clone().add(v3(0, 0.6, 0)).addScaledVector(A.sn, 0.5), LFC.clone().add(v3(0.4, 1.6, 2.0)), LFC, u), h: lerp(0.1, LHC, sm5(clamp(u / 0.5))), u };
}
const flare = (t, t0, k) => (t > t0 ? Math.exp(-(t - t0) * k) : 0);

// ---- fuego y letras
function letters(t) {
  const inLoop = t > END - 0.72, tt = loopT(t);
  let fv = win(tt, K.verdadero - 0.1, 0.5), hv = 1, Lv = LV.clone(), lv = LH;
  let ff = win(tt, K.falso1 - 0.1, 0.5), hf = 1, Lf = LF.clone(), lf = LH;
  if (!inLoop) {
    if (t > TV0()) { const P = vPath(t); Lv = P.p; lv = P.h; hv = 1 - win(t, TV1() - 0.04, 0.3); }
    if (t > TV1() + 0.3) { hv = 0; fv = 0; }
    hf = 1 - win(t, TV0() + 0.25, 0.4);
    if (t > TF0() - 0.1) { ff = 1; hf = win(t, TF0() - 0.1, 0.12) * (1 + 0.6 * flare(t, K.f10, 3)); const P = fPath(t); Lf = P.p; lf = P.h; }
    if (t > K.tu - 0.25) { const k = win(t, K.tu - 0.25, 0.6); Lf = LFC.clone().lerp(LF, k); lf = lerp(LHC, LH, k); hv = 1; fv = win(t, K.v11 - 0.3, 0.55); Lv = LV.clone(); lv = LH; }
    if (t > K.bomberados12 - 0.12) { const k = 1 - win(t, K.bomberados12 - 0.12, 0.45); fv *= k; ff *= k; }
  }
  return { fv, hv, Lv, lv, ff, hf, Lf, lf };
}
const _L0p = new THREE.Vector4(), _L1p = new THREE.Vector4();
function fireAt(t) {
  const u = S.fire.u, tt = loopT(t), A = letters(t), B = letters(t - 1 / 36);
  let pw = 1 - 0.22 * win(tt, K.falso1 + 0.3, 0.6);
  if (t < END - 0.72) pw += 0.22 * win(t, TV0(), 0.4) + 0.5 * flare(t, K.f10, 3) + 0.7 * flare(t, K.bomberados12, 2.2) - 0.15 * win(t, K.tu, 0.5) * (1 - win(t, K.bomberados12 - 0.1, 0.3));
  u.power.value = pw;
  u.L0.value.set(A.Lv.x, A.Lv.y, A.Lv.z, A.lv); u.L1.value.set(A.Lf.x, A.Lf.y, A.Lf.z, A.lf);
  u.L0p.value.set(B.Lv.x, B.Lv.y, B.Lv.z, B.lv); u.L1p.value.set(B.Lf.x, B.Lf.y, B.Lf.z, B.lf);
  u.form.value.set(A.fv, A.ff); u.heat.value.set(A.hv, A.hf);
  S.firePow = pw;
  const P = S.pan; P.oil.material.color.setScalar(1.25 + 0.3 * Math.sin(t * 17) * Math.sin(t * 7.3) + 0.4 * flare(t, K.f10, 3));
}

// ---- la habitación: la tarde que se va, el flexo y el reloj
function roomAt(t) {
  const R = S.room, vis = t > TV0() + 0.1 && t < TF1() + 0.2; R.R.visible = vis; S.pan.G.visible = !(t > TV1() + 0.2 && t < TF0() - 0.1);
  S.floor.refl.visible = !(t > TV1() + 0.1 && t < TF0() - 0.05);     // en la habitación el espejo queda bajo la madera: no se calcula
  S.gridM.uniforms.op.value = 1 - win(t, TV0() + 0.2, 0.4) * (1 - win(t, TF0() + 0.4, 0.4));
  if (!vis) return;
  const night = win(t, K.va - 0.15, 0.9); S.night = night;
  R.skyA.material.color.setScalar(1.25 - 0.75 * night); R.skyB.material.opacity = night;
  const lt = K.tarde - 0.02, lamp = t < lt ? 0 : (t < lt + 0.3 ? (Math.sin((t - lt) * 75) > -0.3 ? 1 : 0.25) : 1);
  R.bulb.material.color.setRGB(0.2 + 2.9 * lamp, 0.18 + 2.4 * lamp, 0.15 + 1.7 * lamp); S.lampOn = lamp;
  const hrs = 17 + 5 / 60 + (4 + 45 / 60) * sm5(clamp((t - K.va + 0.35) / 1.0)) + Math.max(0, t - 7) / 1800;
  R.clock.hh.rotation.z = -(hrs % 12) / 12 * 6.2832; R.clock.mh.rotation.z = -(hrs % 1) * 6.2832; S.hrs = hrs;
}
// ---- el opositor
const PKEYS = () => [[0, 'read'], [K.rojo - 0.1, 'read'], [K.rojo + 0.15, 'shock'], [K.toca + 0.2, 'read'], [K.manual3 - 0.2, 'read'], [K.manual3 + 0.1, 'lookL'], [K.pagina3 - 0.3, 'lookL'], [K.pagina3 + 0.1, 'read'],
  [K.hojas - 0.25, 'read'], [K.hojas, 'flip'], [K.manual4 - 0.1, 'flip'], [K.manual4 + 0.1, 'lookL'], [K.va - 0.2, 'lookL'], [K.va + 0.1, 'slump'], [K.ahora - 0.05, 'slump'], [K.ahora + 0.3, 'up'], [K.bomberados5 + 0.2, 'up'], [K.tocas - 0.2, 'mouse']];
let _pk = null;
function personAt(t) {
  if (!S.room.R.visible) return;
  const J = S.person.userData.J; _pk = _pk || PKEYS(); applyPose(J, _pk, t);
  // pasando hojas: el brazo derecho va y viene sobre el libro
  const fl = win(t, K.hojas - 0.1, 0.25) * (1 - win(t, K.apuntes + 0.2, 0.3));
  if (fl > 0) { J.shR.rotation.y += fl * 0.32 * Math.sin(t * 12); J.elR.rotation.x += fl * 0.18 * Math.sin(t * 12 + 1); J.head.rotation.y += fl * 0.08 * Math.sin(t * 12 - 0.6); }
  // respira; con el ratón, la mano acompaña al cursor
  J.spine.rotation.x += 0.012 * Math.sin(t * 2.1); J.head.rotation.x += 0.02 * Math.sin(t * 1.3);
  const ms = win(t, K.tocas - 0.2, 0.3); if (ms > 0) { J.shR.rotation.y += ms * 0.05 * Math.sin(t * 3); J.wrR.rotation.x += ms * 0.15 * (bump(t, K.fallado - 0.05, 0.15) + bump(t, K.inteligencia - 0.05, 0.15)); }
}
// ---- manuales: la torre (se buscan), pestañas, el libro abierto (páginas que pasan a toda velocidad)
function booksAt(t) {
  if (!S.room.R.visible) return;
  const B = S.books;
  B.books.forEach((b, i) => { const dx = 0.075 * bump(t, K.manual3 - 0.05 + i * 0.1, 0.42) + 0.05 * bump(t, K.manual4 - 0.05 + (5 - i) * 0.03, 0.3) + 0.05 * bump(t, K.manual4b - 0.05 + i * 0.03, 0.3);
    b.b.position.x = b.x0 + dx; b.b.position.y = b.y0 + 0.03 * (bump(t, K.manual4 - 0.05 + (5 - i) * 0.03, 0.3) + bump(t, K.manual4b - 0.05 + i * 0.03, 0.3)); });
  B.tabs.forEach((tb, i) => { const s = popS(t, K.tema - 0.08 + i * 0.07, 0.35); tb.scale.set(s, 1, 1); tb.visible = t > K.tema - 0.1 + i * 0.07; });
  const T0 = K.hojas - 0.12, T1 = K.apuntes + 0.25, iv = 0.085, D = 0.3, cyc = B.pages.length * iv;
  B.pages.forEach((pg, k) => { let th = 0; const base = T0 + k * iv;
    if (t > base) { const n = Math.min(Math.floor((t - base) / cyc), Math.floor((T1 - base) / cyc)); if (n >= 0) { const tau = t - (base + n * cyc); th = tau < D ? Math.PI * sm5(tau / D) : Math.PI; } }
    if (pg.th !== th) { bendPage(pg, th); pg.th = th; } pg.m.position.y = pg.b.position.y = 0.023 + 0.0006 * k; });
}
// ---- apuntes en remolino que acaban por el suelo
function sheetsAt(t) {
  const Sh = S.sheets, t0 = K.apuntes - 0.12, tf = K.va - 0.1, vis = S.room.R.visible && t > t0;
  Sh.sets.forEach(m => { m.visible = m.userData.back.visible = vis; }); if (!vis) return;
  const C = v3(-0.17, DY + 0.03, 0.15);
  Sh.sets.forEach((m, k) => { for (let j = 0; j < Sh.per; j++) { const i = k * Sh.per + j, p = Sh.P[i], a = t - (t0 + p.d * 0.45);
      if (a <= 0) { _m.makeScale(1e-4, 1e-4, 1e-4); m.setMatrixAt(j, _m); continue; }
      const ang = p.a0 + p.sp * a, r = p.r1 * Math.min(1, a * 1.7), y = C.y + p.h1 * Math.min(1, a * 1.15) + 0.06 * Math.sin(a * 3 + p.tx);
      const P = v3(C.x + Math.cos(ang) * r, y, C.z + Math.sin(ang) * r * 0.85);
      let ex = p.tx + a * 3.1, ey = p.ty + a * 2.3, ez = a * 1.7;
      const f = sm5(clamp((t - tf - p.d * 0.35) / 0.65));
      if (f > 0) { P.lerp(v3(p.fx, 0.007 + i * 0.00012, p.fz), f); ex = lerp(ex % 6.283, -Math.PI / 2, f); ey = lerp(ey % 6.283, 0, f); ez = lerp(ez % 6.283, p.fr, f); }
      _ee.set(ex, ey, ez); _m.compose(P, _qq.setFromEuler(_ee), _one); m.setMatrixAt(j, _m); }
    m.instanceMatrix.needsUpdate = true; });
}
// ---- la hoja de respuestas: la V aterriza en la 37, entra la plantilla, ✓ … ✗
let _plt = -1;
function sheetAt(t) {
  if (!S.room.R.visible) return;
  const Sh = S.sheet, land = TV1();
  Sh.vMark.visible = t > land - 0.06; Sh.vMark.scale.setScalar(popS(t, land - 0.06, 0.3));
  const sl = eo(clamp((t - land - 0.02) / 0.42)); Sh.ov.position.set(0.3 * (1 - sl), 0.0004, -0.03 * (1 - sl)); Sh.ov.visible = sl > 0.001;
  let rows = 0; for (let i = 0; i < NROW; i++) { const ti = i < 6 ? land + 0.45 + i * Math.max(0.06, (K.treinta - land - 0.55) / 6) : K.treinta + 0.3 + (i - 7) * 0.05; if (t > ti) rows = i + 1; }
  if (rows !== _plt) { plantillaTex(rows)(Sh.plt.userData.g, 600, 848); Sh.plt.needsUpdate = true; _plt = rows; }
  Sh.xMark.visible = t > K.treinta - 0.03; const xs = 1 + 0.9 * (1 - eo(clamp((t - K.treinta + 0.03) / 0.2)));
  Sh.xMark.scale.setScalar(Sh.xMark.visible ? xs : 1e-4); Sh.xMark.material.color.setScalar(1.3 + 1.6 * flare(t, K.rojo, 3) + 0.4 * flare(t, K.treinta, 5));
}
// ---- el portátil: se abre, la app, el cursor, la IA pensando y sus tarjetas
const CUR = () => [[K.tocas - 0.45, 760, 1240], [K.fallado - 0.12, 450, 560], [K.fallado + 0.15, 452, 562], [K.inteligencia - 0.12, 450, 850], [K.inteligencia + 0.1, 452, 852], [K.inteligencia + 0.7, 790, 1235]];
let _cur = null;
const CARD_T = () => [K.manual6 - 0.22, K.define - 0.12, K.compara - 0.12];
function laptopAt(t) {
  if (!S.room.R.visible) { S.screenOn = 0; return; }
  const Lp = S.lap; Lp.setOpen(eio(clamp((t - K.ahora + 0.05) / 0.6)));
  const on = win(t, K.ahora + 0.32, 0.35); S.screenOn = on;
  Lp.dispM.color.setScalar(on * 0.85); Lp.appM.color.setScalar(on * 1.15); Lp.app.visible = on > 0.01;
  if (on > 0.01) { drawApp(Lp.appT.userData.g, t); Lp.appT.needsUpdate = true; }
  _cur = _cur || CUR(); const cv = t > K.tocas - 0.5 && t < TF0(); Lp.cursor.visible = cv;
  if (cv) { const T = _cur.map(k => k[0]); const px = mono(t, T, _cur.map(k => k[1])), py = mono(t, T, _cur.map(k => k[2])); const [x, y] = appXY(px, py);
    Lp.cursor.position.set(x, y, 0.004); Lp.cursor.scale.setScalar(1 - 0.18 * (bump(t, K.fallado - 0.06, 0.16) + bump(t, K.inteligencia - 0.06, 0.16))); }
  // orbe de la IA
  const t0 = K.inteligencia + 0.08, t1 = K.manual6 - 0.15, ov = t > t0 && t < t1 + 0.25; Lp.orb.visible = ov;
  if (ov) { const s = popS(t, t0, 0.45) * (1 - sm5(clamp((t - t1) / 0.22))); Lp.orb.scale.setScalar(Math.max(1e-3, s)); Lp.orb.position.set(0.012 * Math.sin(t * 2.2), -0.004 + 0.006 * Math.sin(t * 3.1), 0.034);
    Lp.halo.material.opacity = 0.8 + 0.2 * Math.sin(t * 9); Lp.halo.lookAt(cam.position);
    for (let i = 0; i < 40; i++) { const a = t * (2.5 + hash(i) * 2) + i * 0.7, r = 0.017 + 0.012 * hash(i * 2.3) + 0.004 * Math.sin(t * 5 + i), el = (hash(i * 3.7) - 0.5) * 1.6;
      _m.makeTranslation(Math.cos(a) * r * Math.cos(el), Math.sin(el) * r, Math.sin(a) * r * Math.cos(el)); Lp.sparks.setMatrixAt(i, _m); } Lp.sparks.instanceMatrix.needsUpdate = true; }
  // tarjetas: salen de la pantalla, la que se nombra se acerca a la cámara
  const CT = CARD_T(), rev = win(t, K.falso9 - 0.02, 0.22), dur = [1.0, 1.1, 0.8];
  Lp.cards.forEach((c, i) => { const ta = CT[i], vis = t > ta && t < TF1() + 0.2; c.g.visible = vis; if (!vis) return;
    const k = clamp((t - ta) / dur[i]); drawCard(i, c.t.userData.g, c.t.image.width, c.t.image.height, k, t, rev); c.t.needsUpdate = true;
    const focus = i === 2 ? win(t, ta, 0.3) : win(t, ta, 0.3) * (1 - win(t, CT[i + 1] - 0.05, 0.3));
    const s = popS(t, ta, 0.45); c.g.scale.setScalar(s); c.g.position.set(0, c.y, 0.002 + 0.011 * focus + 0.03 * (1 - eo(clamp((t - ta) / 0.45))));
    c.g.rotation.set(0.05 * Math.sin(t * 1.3 + i) * focus, 0.06 * Math.sin(t * 0.9 + i * 2) * focus, 0);
    const dim = i < 2 ? win(t, CT[i + 1], 0.35) * (i === 1 ? 1 - rev : 1) : 0; c.m.material.opacity = 1 - 0.68 * dim; });   // las ya leídas se apagan
}
// ---- la respuesta: gota de aceite → «B» de líquido; la F se aviva; la placa de la marca sale del fuego
const DP = v3(-0.46, 0.5, 0.02);
function answerAt(t) {
  const A = S.ans, td0 = K.aceite10 - 0.1, tB = K.b10 - 0.08;
  A.drop.visible = t > td0 && t < tB + 0.2;
  if (A.drop.visible) { const fall = eo(clamp((t - td0) / 0.45)), sq = 1 - sm5(clamp((t - tB) / 0.16)), w0 = t > td0 + 0.45 ? Math.exp(-(t - td0 - 0.45) * 4) : 0, wob = 1 + 0.1 * Math.sin((t - td0) * 18) * w0;
    A.drop.position.set(DP.x, lerp(1.15, DP.y, fall) + 0.01 * Math.sin(t * 6), DP.z); A.drop.scale.set(1.9 * sq / wob, 1.9 * sq * wob, 1.9 * sq / wob); A.drop.rotation.y = t * 0.7; }
  A.bL.visible = t > tB && t < K.tu + 0.7;
  if (A.bL.visible) { const k = popS(t, tB, 0.45) * (1 - sm5(clamp((t - K.tu - 0.1) / 0.45))); A.bL.scale.setScalar(Math.max(1e-3, k)); A.bL.position.set(DP.x, DP.y + 0.015, DP.z); A.bL.rotation.set(0, 0.3 * Math.sin(t * 0.9) - 0.15, 0);
    const dim = win(t, K.pero + 0.1, 0.5); A.oilM.color.setRGB(lerp(1, 0.4, dim), lerp(0.636, 0.38, dim), lerp(0.12, 0.36, dim)); A.oilM.emissive.setRGB(lerp(0.16, 0.0, dim), lerp(0.06, 0.0, dim), 0); }
  A.drops.visible = t > tB && t < tB + 0.9;
  if (A.drops.visible) { const a = t - tB; for (let i = 0; i < 36; i++) { const th = hash(i * 1.7) * 6.283, v = 0.5 + hash(i * 2.9) * 0.6, up = 0.6 + hash(i * 4.3) * 0.8, s = Math.max(1e-3, 1 - a / 0.9);
      _m.compose(v3(DP.x + Math.cos(th) * v * a, DP.y + up * a - 2.2 * a * a, DP.z + Math.sin(th) * v * a), _qq.identity(), _one.set(s, s, s)); A.drops.setMatrixAt(i, _m); } _one.set(1, 1, 1); A.drops.instanceMatrix.needsUpdate = true; }
  const tp = K.bomberados12 - 0.1; A.plate.visible = t > tp;
  if (A.plate.visible) { const k = popS(t, tp, 0.55), r = eo(clamp((t - tp) / 0.6)); A.plate.scale.setScalar(0.72 * k); A.plate.position.set(0, lerp(0.3, 0.8, r) + 0.006 * Math.sin(t * 2), 0.05); A.plate.rotation.set(0.04 * Math.sin(t * 1.1), 0.08 * Math.sin(t * 0.8), 0.035 * (1 - r)); }
}
function stageAt(t) { fireAt(t); roomAt(t); personAt(t); booksAt(t); sheetsAt(t); sheetAt(t); laptopAt(t); answerAt(t); }
