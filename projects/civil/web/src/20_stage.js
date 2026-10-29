// ---------------------------------------------------------------- escenario: cada pieza según el tiempo (todo sale de K, los tiempos de la voz)
const LOOP_D = 0.62;                                   // últimos segundos: el plano vuelve a como empieza (bucle)
const loopT = t => (t > END - LOOP_D ? t - END : t);
const ARC_CEN = () => v3(BRX.x, 0, BRX.z + (-ARC_C));  // centro del arco dibujado en el papel
const SIGN_P = v3(-0.35, 0, 0.75), GAV2_P = v3(-0.35, 0, 0.75);
function arcPaper(k) { const s = -ARC_P0 + 2 * ARC_P0 * k, [x, y] = arcXY(s); return v3(BRX.x + x, 0.006, BRX.z - y); }
function setUp(o, k) { o.visible = k > 0.002; }
function popE(t, t0, d = 0.45) { return Math.max(0, pop(t, t0, d)); }
const shake = [];                                     // golpes: [t, fuerza]

function bridgeAt(tb) {
  const B = S.bridge, C = S.comp;
  // el compás dibuja el arco y se va
  const kd = clamp((tb + 0.45) / 1.25), up = win(tb, 0.82, 0.7);
  C.G.visible = tb < 1.75 && tb > -2;
  if (C.G.visible) {
    const Cc = ARC_CEN(), P = arcPaper(kd), M = Cc.clone().lerp(P, 0.5), R = Cc.distanceTo(P), hh = Math.sqrt(Math.max(0.01, C.LG * C.LG - R * R / 4));
    C.G.position.set(M.x, hh + 0.06 + up * 2.6, M.z - up * 0.6); C.G.rotation.set(0, Math.atan2(-(P.z - Cc.z), P.x - Cc.x), -up * 0.6);
    const a = Math.asin(clamp(R / (2 * C.LG), 0, 0.99)); C.legA.rotation.z = -a; C.legB.rotation.z = a;
  }
  drawK(B.line, kd); B.line.material.opacity = 1 - 0.6 * win(tb, 1.6, 0.6);
  // el arco se levanta del papel (como un libro desplegable), luego los estribos y el tablero
  const ka = popE(tb, 0.5, 0.75); B.arch.rotation.x = -Math.PI / 2 * (1 - ka); B.arch.visible = tb > 0.47;
  const kb = popE(tb, 1.0, 0.45); for (const a of B.ab) { a.scale.y = Math.max(0.001, kb); a.position.y = 0.19 * kb; a.visible = kb > 0.002; }
  const kk = popE(tb, (K.puente1 || 1.77) - 0.3, 0.5); B.deck.scale.y = Math.max(0.001, kk); B.deck.visible = kk > 0.002;
}
function houseAt(t, tb) {
  const Hh = S.house, st = S.stamp;
  // se despliega con «ingeniero de Caminos», un sello rojo gigante la aplasta en «no», y vuelve a levantarse cuando la ley «mira» quién duerme dentro
  const kup = popE(tb, K.ingeniero - 0.1, 0.5);
  Hh.P.rotation.x = -Math.PI / 2 * (1 - kup);
  const tHit = K.no1 + 0.02, sq = t < K.ley11 ? win(t, tHit - 0.06, 0.07) : 1 - popE(t, K.ley11 + 0.1, 0.55);
  Hh.B.scale.set(1 + 0.25 * sq, Math.max(0.05, 1 - 0.95 * sq), 1 + 0.15 * sq);
  if (t > END - LOOP_D) Hh.B.scale.set(1, 1, 1);
  // el sello: baja, golpea y sube; deja «NO» impreso en el papel
  const kd = win(t, tHit - 0.32, 0.3), ku = win(t, tHit + 0.35, 0.5);
  st.G.visible = t > tHit - 0.45 && t < tHit + 1.0;
  st.G.position.set(HSX.x, lerp(1.6, 0.04, kd) + ku * 1.8, HSX.z + ku * 0.4); st.G.rotation.set(0.1 * (1 - kd) - 0.25 * ku, 0.2, 0.05 * (1 - kd));
  const kn = t > tHit ? 1 - win(t, K.ley11, 0.5) : 0; st.decal.material.opacity = kn * 0.92; st.decal.visible = kn > 0.01 && tb > 0;
}
function bookAt(t) {
  const b = S.book; b.G.visible = t > K.dicen - 0.2 && t < K.caminos4; S.gavel.G.visible = t > K.tribunal - 0.25 && t < K.caminos4;
  if (!b.G.visible) return;
  const k = clamp((t - (K.dicen - 0.15)) / (K.ley2 - K.dicen + 0.15)), y = 1.7 * (1 - k * k), land = t > K.ley2 ? Math.exp(-(t - K.ley2) * 9) * Math.sin((t - K.ley2) * 40) * 0.012 : 0;
  b.G.position.set(0.5, Math.max(0, y) + Math.abs(land), -1.05); b.G.rotation.set(0.5 * (1 - k), 0.35 + 0.6 * (1 - k), 0.3 * (1 - k));
  b.hinge.rotation.z = -Math.PI;
  const g = S.gavel;
  const kp = popE(t, K.tribunal - 0.2, 0.4); g.G.scale.setScalar(Math.max(0.001, kp)); g.G.position.set(1.35, 0, -1.15); g.G.rotation.y = -0.5;
  const ts = K.supremo2 + 0.08; g.arm.rotation.z = t < ts ? -0.95 * win(t, K.tribunal, 0.3) : -0.95 * (1 - win(t, ts - 0.12, 0.12)) - 0.12 * Math.exp(-(t - ts) * 10) * Math.abs(Math.sin((t - ts) * 30));
}
function qAt(t) {
  const Q = S.q, on = t > K.porque3 - 0.25 && t < K.caminos4 + 0.4; Q.segs.visible = on; if (!on) return;
  const sc = 1.25, rot = 0.22 * Math.sin(t * 0.9) - 0.15, ca = Math.cos(rot), sa = Math.sin(rot), out = win(t, K.caminos4 - 0.15, 0.4);
  const W_ = p => v3(QPOS.x + (p.x * ca + p.z * sa) * sc, QPOS.y + p.y * sc + out * 1.2, QPOS.z + (-p.x * sa + p.z * ca) * sc);
  const dotT = K.final3 - 0.05;
  for (let i = 0; i < Q.n; i++) {
    const isDot = i >= Q.dotFrom, t0 = isDot ? dotT : K.porque3 - 0.2 + (i / Q.dotFrom) * 0.55, k = sm5(clamp((t - t0) / (isDot ? 0.3 : 0.42)));
    const [a, b] = Q.S[i], [fa, fb] = Q.from[i], A = W_(a), B_ = W_(b);
    const lift = Math.sin(Math.PI * k) * 0.25;
    const pa = fa.clone().lerp(A, k), pb = fb.clone().lerp(B_, k); pa.y += lift; pb.y += lift;
    if (isDot && t > dotT + 0.3) { const bo = Math.exp(-(t - dotT - 0.3) * 7) * Math.abs(Math.sin((t - dotT - 0.3) * 18)) * 0.08; pa.y += bo; pb.y += bo; }
    if (k <= 0) { pa.copy(fa); pb.copy(fa); }
    Q.segs.userData.set(i, pa, pb);
  }
  Q.segs.userData.flush();
  Q.segs.material.opacity = 1; Q.segs.material.linewidth = 2.6 + 2.5 * Math.exp(-Math.max(0, t - K.nadie) * 5) * (t > K.nadie ? 1 : 0);
}
function duelAt(t) {
  const D_ = S.duel, on = t > K.caminos4 - 1.2 && t < K.esto + 0.6; D_.G.visible = on; if (!on) return;
  // la fachada se dibuja con «dibujáis»
  const kf = clamp((t - (K.vosotros4 - 0.1)) / (K.nosotros4 - K.vosotros4 + 0.1)), n = D_.nseg, m = Math.floor(n * kf);
  D_.fl.geometry.instanceCount = Math.max(0, m); D_.fl.visible = m > 0;
  const seg = D_.segs[Math.min(n - 1, m)], u = n * kf - m, tip = seg ? v3(lerp(seg[0][0], seg[1][0], u), lerp(seg[0][1], seg[1][1], u), 0) : v3(0, 0, 0);
  const pk = env(t, K.vosotros4 - 0.25, K.nosotros4 + 0.3, 0.25, 0.3); D_.pencil.visible = pk > 0.01;
  D_.pencil.position.set(D_.F.position.x + tip.x, tip.y + (1 - pk) * 0.3, 0.03); D_.pencil.rotation.set(0.35, 0, -0.45);
  // «que no se caiga»: la fachada se tambalea (y Arquitectura responde: se endereza)
  const tw = K.no4 - 0.05; let ang = 0;
  if (t > tw && t < K.arquitectos5 + 0.3) ang = -0.3 * Math.sin((t - tw) * 9.5) * Math.exp(-(t - tw) * 1.4);
  ang *= 1 - win(t, K.arquitectos5 - 0.1, 0.4);
  D_.F.rotation.z = ang; D_.F.position.x = Math.sin(ang) * 0.1;
  // la viga: la carga cae, la ley de momentos se dibuja, la flecha aparece
  const kl = popE(t, K.caminos4 + 0.15, 0.35); D_.loads.visible = kl > 0.01; D_.loads.position.y = (1 - Math.min(1, kl)) * 0.25; D_.loads.material.opacity = clamp(kl);
  drawK(D_.mline, clamp((t - K.hacemos4) / 0.5)); D_.hatch.visible = t > K.hacemos4 + 0.35; D_.hatch.material.opacity = 0.6 * win(t, K.hacemos4 + 0.35, 0.3); D_.axis.visible = t > K.hacemos4;
  drawK(D_.defl, clamp((t - K.que4) / 0.4));
  const kfo = popE(t, K.calculais - 0.1, 0.4); D_.formula.visible = kfo > 0.01; D_.formula.scale.setScalar(Math.max(0.001, kfo)); D_.formula.material.opacity = clamp(kfo) * (0.75 + 0.25 * Math.sin(t * 12));
  // «vivir dentro»: se encienden las ventanas y aparece gente
  D_.lit.forEach((p, i) => { p.material.opacity = 0.85 * win(t, K.vivir - 0.05 + i * 0.07, 0.2); });
  D_.people.forEach((p, i) => { p.material.opacity = win(t, K.dentro5 - 0.05 + i * 0.06, 0.2); });
}
function soilAt(t) {
  const Sl = S.soil, on = t > K.por6 - 0.2 && t < K.trenes; Sl.G.visible = on; if (!on) return;
  Sl.bulbs.forEach((b, i) => { drawK(b, clamp((t - K.suelos - i * 0.1) / 0.45)); });
  // se inclina («inclina») y se cae («estructuras») convirtiéndose en el tablero del puente
  const lean = -0.13 * popE(t, K.inclina - 0.05, 0.6), fall = clamp((t - (K.estructuras - 0.12)) / 0.42), fe = fall * fall;
  Sl.piv.rotation.z = lean + (-Math.PI / 2 - lean) * fe; Sl.piv.position.y = -0.012 * win(t, K.inclina, 0.5);
  Sl.T.visible = fall < 1;
}
function deckAt(t) {
  const Dk = S.deck, tf = K.estructuras + 0.3, on = t > tf - 0.02 && t < K.presas + 0.9; Dk.G.visible = on; if (!on) return;
  const kg = popE(t, tf, 0.5), kgc = clamp(kg);
  // de la torre tumbada (0,11 → 1,06; y ≈ 0,11) al tablero (−1,0 → 1,8; y = 0,38)
  const x0 = lerp(0.11, -1.0, kgc), x1 = lerp(0.11 + S.soil.H, 1.8, kgc), y = lerp(0.105, 0.38, kg);
  Dk.deck.scale.x = Math.max(0.01, x1 - x0); Dk.deck.position.set((x0 + x1) / 2, y, 0); Dk.deck.scale.y = lerp(3.0, 1, kgc); Dk.deck.scale.z = lerp(0.9, 1, kgc);
  Dk.piers.forEach((p, i) => { const k = popE(t, tf + 0.15 + i * 0.07, 0.4); p.scale.y = Math.max(0.001, k); p.position.y = 0.18 * k; p.visible = k > 0.002; });
  // el tren cruza; el viento empuja (flechas) y el tablero se mueve un poco
  const ktr = clamp((t - (K.trenes - 0.45)) / 1.6); Dk.train.visible = ktr > 0 && ktr < 1; Dk.train.position.set(lerp(-1.6, 2.6, ktr), 0.38 + 0.035, 0);
  const kw = env(t, K.viento - 0.05, K.presas + 0.4, 0.15, 0.3); Dk.wind.visible = kw > 0.01; Dk.wind.material.opacity = 0.9 * kw;
  for (let i = 0; i < 14; i++) { const ph = ((t * 1.6 + hash(i * 3.3)) % 1), x = -0.9 + (i / 13) * 2.6, y0 = 0.3 + hash(i * 1.7) * 0.25, z = lerp(-1.0, -0.16, ph), L = 0.18;
    const a = v3(x, y0, z - L), b = v3(x, y0, z); Dk.wind.userData.set(i * 3, a, b); Dk.wind.userData.set(i * 3 + 1, b, v3(x - 0.02, y0, z - 0.03)); Dk.wind.userData.set(i * 3 + 2, b, v3(x + 0.02, y0, z - 0.03)); }
  Dk.wind.userData.flush();
  Dk.G.rotation.x = 0.025 * kw * Math.sin(t * 7); Dk.tag.visible = false;
}
function riverAt(t, VP, PVP) {
  const R = S.river, on = t > K.viento - 0.4 && t < K.vias + 0.6; R.G.visible = on; if (!on) return;
  const u = R.u; u.VP.value.copy(VP); u.PVP.value.copy(PVP); u.time.value = t;
  const kd = popE(t, K.presas - 0.05, 0.45), flat = win(t, K.carreteras - 0.25, 0.4);
  R.dam.scale.y = Math.max(0.01, kd * (1 - flat)); R.dam.visible = kd > 0.002;
  u.stop.value = win(t, K.frenan - 0.1, 0.6); u.lvl.value = 0.05 * win(t, K.frenan, 0.8); u.bright.value = 1.1 * (1 - flat);
  R.pool.material.opacity = 0.12 * win(t, K.frenan, 0.6) * (1 - flat); R.pool.position.y = 0.02 + 0.05 * win(t, K.frenan, 0.8);
  for (const b of R.banks) { b.scale.y = Math.max(0.01, 1 - flat); b.visible = flat < 0.97; }
}
function mapAt(t) {
  const M = S.map, on = t > K.rios && t < K.porque9 + 0.6; for (const o of [M.coast, M.nbr, M.roads, M.hsr, M.dots]) o.visible = on; M.sea.visible = on; if (!on) return;
  const kc = clamp((t - (K.carreteras - 0.2)) / 0.75); M.coast.geometry.instanceCount = Math.floor(M.coast.userData.total * kc);
  M.nbr.material.opacity = 0.6 * win(t, K.carreteras, 0.5); M.sea.material.opacity = 0.9 * win(t, K.carreteras - 0.2, 0.5);
  M.roads.geometry.instanceCount = Math.floor(M.roads.userData.total * clamp((t - K.carreteras) / 0.7));
  M.hsr.geometry.instanceCount = Math.floor(M.hsr.userData.total * clamp((t - (K.vias - 0.05)) / 0.85));
  const pulse = env(t, K.alta - 0.05, K.mundo + 0.5, 0.1, 0.3) * (0.5 + 0.5 * Math.sin((t - K.alta) * 18));
  M.hsr.material.linewidth = 3.2 + 2.8 * pulse; M.dots.material.opacity = win(t, K.espana - 0.1, 0.3);
  const dim = 1 - 0.45 * win(t, K.supremo8, 0.6); M.coast.material.opacity = dim; M.roads.material.opacity = 0.75 * dim; M.hsr.material.opacity = dim;
}
function sportsAt(t) {
  const Sp = S.sports, H2 = S.house2, on = t > K.aun && t < K.porque9 + 0.6; Sp.G.visible = H2.G.visible = on; if (!on) return;
  const ks = popE(t, K.polideportivo - 0.05, 0.5); Sp.B.scale.set(1, Math.max(0.001, ks), 1); Sp.G.visible = ks > 0.002;
  const kh = popE(t, K.tu8 - 0.1, 0.45); H2.P.rotation.x = -Math.PI / 2 * (1 - clamp(kh)); H2.B.scale.y = Math.max(0.001, kh); H2.G.visible = kh > 0.002;
  const sq = win(t, K.no8 - 0.04, 0.08); H2.B.scale.y *= 1 - 0.0 * sq;
}
function lawAt(t) {
  const b = S.book2, on = t > K.porque9 - 0.3 && t < K.puente10 - 0.4; b.G.visible = on; S.icons.forEach(i => i.visible = false); S.blds.forEach(i => i.visible = false); S.sig.visible = false; if (!on) return;
  const ko = sm5(clamp((t - (K.ley9 - 0.15)) / 0.55)); b.hinge.rotation.z = -Math.PI * (1 - ko) + 0.04 * Math.sin(Math.PI * ko);
  b.hinge.userData.pagesL.visible = ko > 0.5;
  const verbs = [K.vive, K.estudia, K.cura, K.reza];
  verbs.forEach((tv, i) => {
    const ic = S.icons[i], bd = S.blds[i], slot = S.slots[i], P0 = S.iconFrom[i];
    const ki = popE(t, tv - 0.08, 0.35), km = sm5(clamp((t - (tv + 0.32)) / 0.3));
    ic.visible = ki > 0.002 && km < 1; const p = P0.clone().lerp(slot, km); p.y += 0.12 * ki + Math.sin(Math.PI * km) * 0.25; ic.position.copy(p); ic.scale.setScalar(Math.max(0.001, 3.0 * ki * (1 - km))); ic.rotation.y = (1 - clamp(ki)) * 2 + t * 0.6 * (1 - km);
    const kb = popE(t, tv + 0.5, 0.45); bd.visible = kb > 0.002; bd.position.copy(slot); bd.scale.set(1.25, 1.25 * Math.max(0.001, kb), 1.25);
  });
  drawK(S.sig, clamp((t - (K.firma - 0.05)) / 0.55)); S.sig.visible = t > K.firma - 0.05;
}
function signAt(t) {
  const Sg = S.sign, on = t > K.colegio - 0.3 && t < K.dormir; Sg.G.visible = on; S.gavel2.G.visible = false; if (!on) return;
  const ks = popE(t, K.colegio - 0.1, 0.45); Sg.G.position.copy(SIGN_P); Sg.G.scale.set(1, Math.max(0.001, ks), 1); Sg.G.rotation.y = 0.25;
  const glow = env(t, K.exclusiva - 0.05, K.dijo, 0.1, 0.2) * (0.6 + 0.4 * Math.sin(t * 20));
  // el mazo del Supremo baja sobre el cartel y lo parte en dos
  const g = S.gavel2, ts = K.dijo + 0.04, kp = popE(t, K.supremo10 - 0.15, 0.35);
  g.G.visible = t > K.supremo10 - 0.2 && t < K.no10 + 0.8; g.G.position.copy(SIGN_P).add(v3(0.0, 0.66 - 0.083, 0)); g.G.rotation.y = 0.25; g.G.scale.setScalar(Math.max(0.001, kp) * 1.0);
  g.base.visible = false;
  g.arm.rotation.z = t < ts ? -1.1 * win(t, K.supremo10, 0.25) : -1.1 * (1 - win(t, ts - 0.1, 0.1)) - 0.25 * win(t, ts + 0.15, 0.4);
  const tb = ts, kb = clamp((t - tb) / 0.6);
  Sg.halves.forEach((h, i) => { const s = i ? 1 : -1, fall = t > tb ? (t - tb) : 0;
    h.position.set(s * (0.15 + 0.35 * kb), Math.max(0.03, 0.5 - 2.6 * fall * fall), 0.02 + 0.1 * kb); h.rotation.set(-0.3 * kb, 0, s * (-0.9 * kb - (fall > 0.35 ? 0.6 : 0)));
    h.children[0].material.emissiveIntensity = 0.8 + 1.4 * glow; });
  Sg.post.scale.y = 1; const sink = win(t, K.mira11b, 0.5); Sg.G.position.y = -0.6 * sink;
}
function formulasAt(t) {
  const on = t > K.ley11 - 0.2 && t < K.dormir; S.formulas.forEach((p, i) => {
    p.visible = on; if (!on) return;
    const ka = popE(t, K.ley11 - 0.1 + i * 0.06, 0.35), kd = win(t, K.mejor - 0.05 + i * 0.03, 0.45), a = Math.PI * (1.02 + 0.96 * i / (S.formulas.length - 1)) + 0.12 * Math.sin(t * 0.8 + i);
    p.position.set(HSX.x + Math.cos(a) * 0.6, 0.3 + (i % 3) * 0.1 + kd * 0.25, HSX.z + Math.sin(a) * 0.36 - 0.02);
    p.lookAt(cam.position); p.scale.setScalar(Math.max(0.001, clamp(ka) * (1 - kd * 0.7)));
    p.material.opacity = clamp(ka) * (1 - kd) * (t > K.calcula && t < K.mejor ? 0.8 + 0.2 * Math.sin(t * 25 + i) : 0.85);
  });
}
function roomAt(t) {
  const H_ = S.house; if (!H_.blanket) return;
  H_.blanket.scale.y = 1 + 0.12 * Math.sin(t * 2.6); H_.blanket.position.y = 0.072 + 0.002 * Math.sin(t * 2.6);
}
function stageAt(t, VP, PVP) {
  const tb = loopT(t);
  bridgeAt(tb); houseAt(t, tb); bookAt(t); qAt(t); duelAt(t); soilAt(t); deckAt(t); riverAt(t, VP, PVP); mapAt(t); sportsAt(t); lawAt(t); signAt(t); formulasAt(t); roomAt(t);
}
