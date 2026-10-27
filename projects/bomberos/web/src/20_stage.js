// ---------------------------------------------------------------- estado de la escena en cada instante (todo es función de t)
const wpos = (o, v = new THREE.Vector3()) => o.getWorldPosition(v);
const popS = (t, t0, d = 0.35) => Math.max(1e-4, pop(t, t0, d));
function loopT(t) { return t > END - 0.72 ? t - END : t; }      // al final, el principio otra vez (bucle)
const _ec = new THREE.Color(), _m = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _ee = new THREE.Euler(), _pp = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
const GREY = new THREE.Color(0x3a3c40), DIMC = new THREE.Color(0.16, 0.17, 0.19);

// 1: los diez cascos — se tiñen de rojo al decir «ocho» y caen al decir «se quedan sin plaza»; los dos que quedan brillan
function helmetsAt(t) {
  const H = S.helm, tt = loopT(t), inLoop = t > END - 0.72;
  const vis = tt < K.ultima + 0.7; H.G.visible = vis; if (!vis) return;
  let n = 0;
  H.hs.forEach((h, i) => {
    const P = hpos(i), keep = KEEP.includes(i), idx = keep ? -1 : n++;
    const red = keep || inLoop ? 0 : sm5(clamp((tt - K.ocho - (7 - idx) * 0.06) / 0.2));
    const fall = keep || inLoop ? 0 : clamp((tt - K.quedan - idx * 0.05) / 0.9);
    const y = P.y - (fall > 0 ? Math.min(P.y - 0.09, 4.5 * fall * fall * 0.81) : 0);
    h.position.set(P.x + fall * (hash(i * 3.1) - 0.5) * 0.5, y, P.z + fall * (hash(i * 5.7) - 0.3) * 0.6);
    h.rotation.set(0.25 + 0.06 * Math.sin(tt * 1.3 + i) + fall * (2 + hash(i) * 3), Math.sin(tt * 0.8 + i * 0.7) * 0.35 + fall * 2, fall * (hash(i * 9) - 0.5) * 4);
    const dark = keep || inLoop ? 0 : sm5(clamp((tt - K.quedan - idx * 0.05) / 0.35));
    _ec.set(GOLD).lerp(new THREE.Color(RED), red * (1 - dark)).lerp(GREY, dark);
    H.hs[i].userData.mats.forEach(m => { m.color.copy(_ec); m.emissive.copy(_ec).multiplyScalar(keep ? 0.12 + 0.25 * sm5(clamp((tt - K.plaza) / 0.4)) : 0.05 * red * (1 - dark)); });
  });
  H.glow.forEach((g, k) => { const a = inLoop ? 0 : sm5(clamp((tt - K.plaza + 0.1) / 0.4)); g.visible = a > 0.01; g.scale.setScalar(0.6 + 0.4 * a + 0.04 * Math.sin(tt * 6 + k)); });
}
// 2-3: multitudes — aparecen por filas; en Madrid y València se encienden en oro los que entran; en el País Vasco, rojo el 75 % que suspende
function crowdsAt(t) {
  const C = S.crowd, vis = t > K.ultima - 1.0 && t < K.porque + 0.8; C.Z.visible = vis; if (!vis) return;
  const t0s = [K.ultima + 0.2, K.valencia - 0.3, K.pais - 0.4], fdur = [K.personas - K.ultima - 0.2, K.aspirantes - K.valencia + 0.3, 0.6], tok = [K.doscientas, K.noventa, K.setenta];
  C.blocks.forEach((B, k) => {
    const rows = Math.ceil(B.R.n / B.cols);
    B.P.forEach((P, i) => {
      const r = Math.floor(i / B.cols), app = sm5(clamp((t - t0s[k] - (r / rows) * fdur[k]) / 0.25)), ok = B.ok.has(i), lit = sm5(clamp((t - tok[k] - hash(i * 1.3) * 0.25) / 0.3));
      let sink = 0;
      if (k === 2 && !ok) sink = lit;
      _m.compose(_pp.set(P.x, P.y - sink * 0.02, P.z), _qq.identity(), _one.set(Math.max(1e-3, app), Math.max(1e-3, app * (1 - 0.6 * sink)), Math.max(1e-3, app))); B.m.setMatrixAt(i, _m);
      if (ok) _ec.setRGB(0.75, 0.78, 0.82).lerp(CGold, lit); else _ec.setRGB(0.75, 0.78, 0.82).lerp(k === 2 ? CRed : DIMC, lit);
      B.m.setColorAt(i, _ec);
    });
    _one.set(1, 1, 1); B.m.instanceMatrix.needsUpdate = true; B.m.instanceColor.needsUpdate = true;
    B.lab.material.opacity = sm5(clamp((t - t0s[k]) / 0.4));
  });
}
// 5-7: el examen — se rellenan las respuestas, los fallos se ponen rojos y restan; el cronómetro se queda sin tiempo
function examAt(t) {
  const E = S.exam, vis = t > K.uno - 1.0 && t < K.duro + 0.5; E.Z.visible = vis; if (!vis) return;
  const nAns = Math.floor(NQ * 0.72 * clamp((t - K.decenas + 0.2) / Math.max(0.8, K.contestar - K.decenas)));
  let n = 0; const wr = t > K.fallo - 0.05;
  E.ans.forEach((a, q) => { if (q >= nAns) return; const [x, y] = bubbleXY(q, a.o); _m.makeTranslation(x, y, 0); E.marks.setMatrixAt(n, _m);
    _ec.copy(a.wrong && wr ? CRed : new THREE.Color(0.12, 0.12, 0.14)); E.marks.setColorAt(n, _ec); n++; });
  E.marks.count = n; E.marks.instanceMatrix.needsUpdate = true; if (E.marks.instanceColor) E.marks.instanceColor.needsUpdate = true;
  const wrongQs = E.ans.map((a, q) => q).filter(q => E.ans[q].wrong && q < nAns);
  E.minus.forEach((m, k) => { const q = wrongQs[k], u = clamp((t - K.resta + 0.1 - k * 0.08) / 1.2); m.visible = q !== undefined && u > 0 && u < 1;
    if (!m.visible) return; const [x, y] = bubbleXY(q, E.ans[q].o); m.position.set(x + 0.12, 1.0 + y + u * 0.35, 0.05); m.material.opacity = 1 - u * u; });
  // cronómetro: la aguja corre y el arco rojo se llena hasta «no llegar a contestar»
  const tw = clamp((t - K.tiempo + 0.2) / Math.max(0.6, K.contestar - K.tiempo + 0.2));
  E.sw.userData.hand.rotation.z = -tw * 6.2832 * 3; E.sw.userData.arc.geometry.dispose();
  E.sw.userData.arc.geometry = new THREE.RingGeometry(0.2, 0.235, 64, 1, Math.PI / 2 - tw * 6.2832, Math.max(0.001, tw * 6.2832));
  E.sw.userData.arc.material.opacity = 0.85 * (t > K.contestar ? 0.5 + 0.5 * Math.sign(Math.sin(t * 18)) : 1);
  E.sw.scale.setScalar(popS(t, K.tiempo - 0.25, 0.4)); E.sw.visible = t > K.tiempo - 0.3;
  // leer ≠ entrenar: el temario aparece al nombrarlo y el libro abierto sobre la pila
  E.books.visible = E.bl.visible = t > K.tres - 0.25; E.books.scale.setScalar(popS(t, K.tres - 0.25, 0.45)); E.bl.material.opacity = sm5(clamp((t - K.tres) / 0.3));
  E.open.visible = t > K.leerse - 0.2; E.open.scale.setScalar(popS(t, K.leerse - 0.2, 0.4)); E.open.rotation.y = 0.15 * Math.sin(t);
}
// 8: la criba — casi todos se quedan en la puerta del test
function gatesAt(t) {
  const G = S.gates, vis = t > K.duro - 1.0 && t < K.eso + 0.5; G.Z.visible = vis; if (!vis) return;
  const fall = sm5(clamp((t - K.cae + 0.1) / 0.5));
  G.F.forEach((f, i) => { const red = f.stage === 0 ? fall : 0, tip = f.stage === 0 ? clamp((t - K.cae - f.d * 0.4) / 0.35) : 0;
    _ee.set(tip * 1.45, f.d * 6, 0); _qq.setFromEuler(_ee); _m.compose(_pp.set(f.x, 0.065 - tip * 0.03, f.z), _qq, _one.set(1, 1, 1)); G.figs.setMatrixAt(i, _m);
    _ec.setRGB(0.75, 0.78, 0.82).lerp(f.stage === 2 ? CGold : CRed, f.stage === 2 ? sm5(clamp((t - K.antes) / 0.4)) : red); G.figs.setColorAt(i, _ec); });
  G.figs.instanceMatrix.needsUpdate = true; G.figs.instanceColor.needsUpdate = true;
}
// 9-12: la app
function appAt(t) {
  const A = S.app, tt = t, vis = t > K.eso - 1.0 && t < END - 0.3; A.Z.visible = vis; if (!vis) return;
  // el nombre: aparece en «Bomberados», se va al girar la ruleta y vuelve al final
  const t1 = popS(t, K.bomberados9 - 0.05, 0.45) * (1 - sm5(clamp((t - K.giras + 0.25) / 0.3))), t2 = popS(t, K.bomberados12 - 0.05, 0.5);
  const tk = t < K.giras ? t1 : t2; A.end.visible = tk > 0.01; A.end.scale.setScalar(Math.max(1e-3, tk)); A.sub.visible = t < K.giras || t > K.bomberados12 + 0.2;
  // ruleta: gira y frena en «CALLEJERO»
  const wv = t > K.giras - 0.3 && t < K.compites + 0.2; A.wheel.visible = wv;
  if (wv) { const u = clamp((t - K.giras + 0.2) / Math.max(0.8, K.haces - K.giras + 0.2)), target = 3.5 / 8 * 6.2832; A.disc.rotation.y = target + (1 - eo(u)) * 6.2832 * 3;
    A.wheel.scale.setScalar(Math.max(1e-3, popS(t, K.giras - 0.3, 0.4) * (1 - sm5(clamp((t - K.haces + 0.1) / 0.4))))); A.wheel.position.set(0, 1.35 + 0.35 * sm5(clamp((t - K.haces + 0.1) / 0.4)), -0.3 * sm5(clamp((t - K.haces) / 0.4))); }
  // pregunta: aparece en «haces test» y se acierta la B
  const cv = t > K.haces - 0.2 && t < K.compites + 0.3; A.card.visible = cv;
  if (cv) { A.card.scale.setScalar(popS(t, K.haces - 0.2, 0.4) * (1 - sm5(clamp((t - K.compites) / 0.3)))); A.okBar.material.opacity = 0.85 * sm5(clamp((t - K.test10 - 0.35) / 0.2)); A.card.rotation.y = 0.12 * Math.sin(t * 1.5); }
  // duelo en directo y, después, contra la IA
  const dv = t > K.compites - 0.3 && t < K.bomberados12 - 0.05; A.duel.visible = dv;
  if (dv) { const ia = sm5(clamp((t - K.inteligencia + 0.1) / 0.35));
    A.duel.scale.setScalar(popS(t, K.compites - 0.3, 0.45) * (1 - sm5(clamp((t - K.bomberados12 + 0.35) / 0.3))));
    A.dB.scale.setScalar(Math.max(1e-3, 1.2 * (1 - ia))); A.ai.scale.setScalar(Math.max(1e-3, ia)); A.ai.rotation.y = -0.5 + 0.2 * Math.sin(t * 2);
    const cheer = sm5(clamp((t - K.jugando) / 0.3)) * (1 - sm5(clamp((t - K.bomberados12 + 0.4) / 0.3)));
    for (const [d, s] of [[A.dA, -1], [A.dB, 1]]) { const J = d.userData.J; J.shL.rotation.set(0, 0, -0.15 - 2.5 * cheer * (s < 0 ? 1 : 0)); J.shR.rotation.set(0, 0, 0.15 + 2.5 * cheer * (s < 0 ? 1 : 0)); J.neck.rotation.x = 0.05 * Math.sin(t * 8); }
    A.bars.forEach((b, k) => { const v = clamp((t - K.compites) / 4) * (k ? 0.75 : 0.9) + 0.06 * Math.sin(t * 5 + k); b.scale.x = Math.max(0.02, v); b.position.x = (k ? 0.55 : -0.55) - 0.25 * (1 - b.scale.x); });
  }
}
function stageAt(t) { helmetsAt(t); crowdsAt(t); examAt(t); gatesAt(t); appAt(t); }
