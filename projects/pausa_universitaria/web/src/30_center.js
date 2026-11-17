// ---------------------------------------------------------------- la escena y su coreografía (segundos del guion técnico):
// 0–4 aula (cierra el cuaderno, mira el reloj, suena el timbre) · 4–9 pasillo (ella le propone bajar) · 9–16 la barra (café, leche, tostada, tomate, aceite)
// 16–25 desayunan en la mesa («Ahora sí») · 25–33 cogen las mochilas y vuelven al aula · 33–40 plano final del café y la media tostada.
let TL = {};
const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => v3(p[0], 0, p[1])), false, 'centripetal', 0.5);
const trap = (x, e = 0.16) => { x = clamp(x); const v = 1 / (1 - e); return x < e ? v * x * x / (2 * e) : x > 1 - e ? 1 - v * (1 - x) * (1 - x) / (2 * e) : v * (x - e / 2); };   // arranca y frena suave; en medio, paso constante
function poseSit(d, k = 1) { poseZero(d); const J = d.userData.J; J.hip.position.y = lerp(0.5, 0.5 / d.userData.s0, k); J.hpL.rotation.x = J.hpR.rotation.x = -1.5 * k; J.knL.rotation.x = J.knR.rotation.x = 1.5 * k; }
function armsFwd(d, k = 1) { const J = d.userData.J; J.shL.rotation.x = J.shR.rotation.x = -0.55 * k; J.elL.rotation.x = J.elR.rotation.x = -1.0 * k; }
function walkOn(d, cv, u, ph0 = 0, a = 0.5) { u = clamp(u); const p = cv.getPointAt(u), tg = cv.getTangentAt(u); d.position.set(p.x, 0, p.z); d.rotation.y = Math.atan2(tg.x, tg.z); if (u <= 0 || u >= 1) poseZero(d); else poseWalk(d, u * cv.getLength() * 4.2 + ph0, a, 0.05); }
const yawOf = (cv, u) => { const tg = cv.getTangentAt(clamp(u)); return Math.atan2(tg.x, tg.z); };
async function buildScene() {
  renderer.localClippingEnabled = true;
  TL = { nb0: 0.7, nb1: 1.7, look0: 1.95, bell: 2.9, up0: 3.0, w0: 3.45, w1: 5.5, s0: 3.3, s1: 5.35, goE: 8.6, goH: 8.85, sit: 12.5,
    coffee: [9.55, 10.6], milk: [10.6, 11.5], pop: [11.8, 12.55], tomato: [12.75, 13.9], oil: [14.0, 15.3], slide: [15.3, 15.9],
    sipH: 17.7, yes: K['ahora_4'], sipE: 21.5, st0: 25.2, b0: 25.75, b1: 32.9, bE0: 25.95, bE1: 33.3 };
  S.set = buildSet(); scene.add(S.set); S.prep = buildPrep(); scene.add(S.prep);
  // ---- los protagonistas: él (sudadera azul) y ella (jersey mostaza, coleta), cada uno con su mochila
  S.el = gtaDoll({ shirt: 0x2f6fd0, pants: 0x34466e, skin: 0xd9a27c, hair: 0x3a2618, scale: 1.6 });
  S.ella = gtaDoll({ shirt: 0xe0a526, pants: 0x2b2d42, skin: 0xe6b996, hair: 0x4a2a16, hairStyle: 'ponytail', scale: 1.52 }); scene.add(S.el, S.ella);
  S.bpH = backpack(0xd9482b); S.bpH.position.set(0, 0.2, -0.115); S.el.userData.J.chest.add(S.bpH); S.bpE = backpack(0x1fa39a); S.bpE.position.set(0, 0.2, -0.115); S.ella.userData.J.chest.add(S.bpE);
  S.bpC = backpack(0xd9482b); S.bpC.scale.setScalar(1.6); S.bpC.position.set(DESK.x + 0.47 + 0.34, 0.6, DESK.z); S.bpC.rotation.y = -Math.PI / 2; scene.add(S.bpC);       // colgada del respaldo, en clase
  S.bpF1 = backpack(0xd9482b); S.bpF1.scale.setScalar(1.6); S.bpF1.position.set(TABLE.x - 1.02, 0.2, TABLE.z + 0.3); S.bpF1.rotation.set(-0.18, 0.4, 0); S.bpF2 = backpack(0x1fa39a); S.bpF2.scale.setScalar(1.52); S.bpF2.position.set(TABLE.x + 1.02, 0.19, TABLE.z + 0.3); S.bpF2.rotation.set(-0.18, -0.5, 0); scene.add(S.bpF1, S.bpF2);
  // ---- figurantes: alumnos sentados, la profesora en la pizarra, el camarero y una pareja en otra mesa
  const cols = [0xc8553d, 0x5aa469, 0x8d6cab, 0xe39b3b, 0x4a8fc2, 0xd97aa6], mkx = (i, s) => gtaDoll({ shirt: cols[i % 6], pants: [0x3a4660, 0x2b2d42, 0x6b5a48][i % 3], skin: [0xd9a27c, 0xe6b996, 0xc68a62][i % 3], hair: [0x1c1410, 0x5a3a22, 0x8a5a2a, 0x2c2c30][i % 4], hairStyle: i % 2 ? 'ponytail' : undefined, scale: s ?? 1.5 + hash(i) * 0.12 });
  S.studs = [[-6.9, -0.5], [-8.6, 1.2], [-10.3, -0.5], [DESK.x, -2.2], [-8.6, -2.2], [-6.9, 1.2]].map((p, i) => { const d = mkx(i); d.position.set(p[0] + 0.47, 0, p[1]); d.rotation.y = -Math.PI / 2; scene.add(d); return d; });
  S.prof = gtaDoll({ shirt: 0x7a5c8a, pants: 0x2b2d42, skin: 0xe6b996, hair: 0x6b4a2e, hairStyle: 'ponytail', scale: 1.6 }); S.prof.position.set(-12.3, 0, 0.1); S.prof.rotation.y = -Math.PI / 2; scene.add(S.prof);
  S.bar = gtaDoll({ shirt: 0xf4f1ea, pants: 0x26282e, skin: 0xc68a62, hair: 0x1c1410, scale: 1.64 }); { const a = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.3, 0.012), stdM(0x2b2d42, 0.8)); a.position.set(0, 0.1, 0.072); S.bar.userData.J.chest.add(a); } S.bar.position.set(4.1, 0, -3.02); scene.add(S.bar);
  S.cafe = [[11.3 - 0.6, 1.9, Math.PI / 2], [11.3 + 0.6, 1.9, -Math.PI / 2]].map((p, i) => { const d = mkx(i + 3, 1.56); d.position.set(p[0], 0, p[1]); d.rotation.y = p[2]; scene.add(d); return d; });
  // ---- el cuaderno del pupitre (se cierra: la tapa cae hacia el fondo y queda la cubierta azul arriba) y un boli
  { const nb = new THREE.Group(); nb.position.set(DESK.x - 0.02, 0.742, DESK.z); scene.add(nb); const blue = stdM(0x2f5fb8, 0.6);
    const ptex = sd => canvasTex(256, 360, (g, w, h) => { g.fillStyle = '#fdfcf7'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(70,110,190,.4)'; g.lineWidth = 2; for (let i = 1; i < 17; i++) { g.beginPath(); g.moveTo(14, i * 20 + 12); g.lineTo(w - 14, i * 20 + 12); g.stroke(); }
      g.strokeStyle = 'rgba(30,40,70,.75)'; g.lineWidth = 2.5; for (let i = 1; i < 14; i++) { g.beginPath(); let x = 22; g.moveTo(x, i * 20 + 6); const end = w - 30 - hash(i * sd) * 110; while (x < end) { x += 7 + hash(x * i + sd) * 9; g.lineTo(x, i * 20 + 7 - hash(x + sd) * 8); } g.stroke(); } });
    const page = sd => { const o = new THREE.Group(), p = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.27), stdM(0xffffff, 0.9, { map: ptex(sd) })); p.rotation.z = Math.PI / 2; p.receiveShadow = true; o.add(p); o.rotation.x = -Math.PI / 2; return o; };
    const b0 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.008, 0.2), blue); b0.position.set(0, 0.004, -0.1); b0.castShadow = true; nb.add(b0); const p0 = page(2); p0.position.set(0, 0.0086, -0.1); nb.add(p0);
    const fl = new THREE.Group(); fl.position.set(0, 0.0085, 0); nb.add(fl); const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.008, 0.2), blue); b1.position.set(0, -0.0045, 0.1); b1.castShadow = true; fl.add(b1); const p1 = page(7); p1.position.set(0, 0.0004, 0.1); fl.add(p1);
    const lb = plateText(0.17, 0.075, [['APUNTES', 0.6, 0.54]], { fg: '#24304f', bg: '#fdfcf7', weight: 900, px: 256 }); lb.rotation.x = Math.PI / 2; lb.position.set(0, -0.0092, 0.1); fl.add(lb); S.nbFlap = fl;
    const pen = cyl(0.005, 0.005, 0.14, stdM(0xd23a2a, 0.4), 8); pen.rotation.set(Math.PI / 2, 0, 0.5); pen.position.set(DESK.x + 0.12, 0.747, DESK.z - 0.27); scene.add(pen); }
  // ---- la mesa del desayuno: dos tazas con su plato, dos medias tostadas y los apuntes a un lado
  const tt = 0.7395; S.restH = v3(TABLE.x - 0.19, tt, TABLE.z + 0.2); S.restE = v3(TABLE.x + 0.19, tt, TABLE.z + 0.2);
  S.cupH = cupModel(); S.cupE = cupModel(); for (const [c, r] of [[S.cupH, S.restH], [S.cupE, S.restE]]) { const s = c.userData.sau; s.position.copy(r); scene.add(s, c); c.position.copy(r); }
  S.cupH.rotation.y = 2.4; S.cupE.rotation.y = 0.7;
  S.tabT = [[-0.14, -0.14, 0.5], [0.15, -0.16, -0.4]].map(p => { const o = toastModel(); o.position.set(TABLE.x + p[0], tt, TABLE.z + p[1]); o.rotation.y = p[2]; scene.add(o); return o; });
  { const n = new THREE.Group(); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.14), stdM([0xffffff, 0xfff3c4, 0xffffff][i], 0.9)); p.position.y = 0.002 + i * 0.004; p.rotation.y = (i - 1) * 0.12; p.castShadow = true; n.add(p); } const c = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.1), stdM(0x2f5fb8, 0.6)); c.position.set(0.02, 0.02, 0); c.rotation.y = -0.3; n.add(c); n.position.set(TABLE.x + 0.02, tt, TABLE.z - 0.3); scene.add(n); }
  // ---- trayectos
  S.cv = { h1: curve([[DESK.x + 0.6, 1.5], [-4.3, 2.0], [-3.65, 1.7], [-3.0, 1.05], [-2.2, 1.0], [-1.55, 1.2]]), e1: curve([[2.9, 0.95], [1.5, 1.0], [0.4, 1.25], [-0.35, 1.35]]),
    hGo: curve([[-1.55, 1.2], [-0.5, 1.7], [1.0, 1.6], [2.4, 1.4], [4.5, 1.5], [6.6, 1.7]]), eGo: curve([[-0.35, 1.35], [0.6, 1.15], [2.0, 1.0], [4.5, 1.1], [7.0, 1.9], [8.6, 1.9]]),
    hBk: curve([[TABLE.x - 0.66, 1.6], [6.5, 1.8], [4.5, 1.5], [2.0, 1.3], [0, 1.3], [-2.2, 1.15], [-3.4, 1.0]]), eBk: curve([[TABLE.x + 0.68, 1.65], [7.6, 2.15], [5.0, 2.05], [2.0, 1.85], [0, 1.9], [-1.8, 1.7], [-2.75, 1.4]]) };
  // motas de polvo en el aire (dejan estela al mover la cámara)
  S.flow.push(flowCloud(2600, i => [-13 + hash(i * 1.3) * 27, 0.3 + hash(i * 2.7) * 2.6, ZB + 0.3 + hash(i * 3.9) * 7], { size: 1.2, bright: 0.22, nearF: 0.3, farF: 0.03, drift: 0.12, seed: 3, col: 0xfff2dc }));
  envAll(scene);
}
// gesto de beber: la taza va de su plato a la boca y vuelve (k 0..1); brazo: 'L' o 'R' (el del lado de la cámara)
function sipAt(d, cup, rest, arm, k, t, level) { const J = d.userData.J, sh = J['sh' + arm], el = J['el' + arm], sg = arm === 'L' ? 1 : -1; k = clamp(k);
  sh.rotation.x = lerp(-0.55, -1.12, k); el.rotation.x = lerp(-1.0, -2.0, k); sh.rotation.z = (arm === 'L' ? -0.1 : 0.1) + sg * 0.42 * k;
  d.updateMatrixWorld(true); const hd = wpos(J.head), f = v3(Math.sin(d.rotation.y), 0, Math.cos(d.rotation.y)), m = hd.clone().addScaledVector(f, 0.14).add(v3(0, -0.11, 0));
  cup.position.lerpVectors(rest, m, sm5(k)); cup.rotation.set(0, cup.rotation.y, 0); cup.rotateOnWorldAxis(v3(-f.z, 0, f.x), -0.75 * sm5(clamp(k * 1.4 - 0.4))); cup.userData.set(level, 1, t, 1); J.neck.rotation.x += -0.12 * k; }
function stageAt(t, st) {
  NOW = t; const H = S.el, E = S.ella, JH = H.userData.J, JE = E.userData.J, cv = S.cv, vz = voice(t);
  const cw = sm5(clamp((st.p.x - 0.5) / 3)); moodMix({ dia: 1 - cw, cafe: cw }); setAt(t, { bell: TL.bell });
  // ---- la barra: café, leche, la tostada salta al plato, tomate, aceite y la taza se arrima
  const sg2 = (a, tt2) => seg(tt2, a[0], a[1]);
  prepAt(t, { coffee: sg2(TL.coffee, t), milk: sg2(TL.milk, t), pop: sg2(TL.pop, t), tomato: sg2(TL.tomato, t), oil: sg2(TL.oil, t), slide: sg2(TL.slide, t) });
  // ---- el cuaderno se cierra
  const nk = sm5(seg(t, TL.nb0, TL.nb1)); S.nbFlap.rotation.x = -Math.PI * nk;
  const atTable = t >= TL.sit && t < TL.st0 + 0.35; S.bpF1.visible = S.bpF2.visible = atTable; S.bpE.visible = !atTable; S.bpH.visible = t >= TL.up0 + 0.3 && !atTable; S.bpC.visible = t < TL.up0 + 0.3;
  // ---- ÉL
  const seat = v3(DESK.x + 0.47, 0, DESK.z), sH = v3(TABLE.x - 0.6, 0, TABLE.z), sE = v3(TABLE.x + 0.6, 0, TABLE.z);
  if (t < TL.w0) {                                             // en clase: cierra el cuaderno, mira el reloj y se levanta
    const up = win(t, TL.up0, TL.w0 - TL.up0), p0 = cv.h1.getPointAt(0); poseSit(H, 1 - up); armsFwd(H, 1 - up);
    const a = Math.sin(Math.PI * nk); JH.shR.rotation.x += -0.5 * a * (1 - up); JH.shR.rotation.z = lerp(0.42, -0.12, nk) * (1 - up) + 0.1 * up; JH.elR.rotation.x += 0.25 * a;
    const lk = win(t, TL.look0, 0.45) * (1 - up); JH.chest.rotation.y = -0.4 * lk; JH.neck.rotation.y = -0.75 * lk; JH.neck.rotation.x = lerp(0.32, -0.26, lk) * (1 - up); JH.chest.rotation.x = 0.1 * (1 - lk) * (1 - up);
    H.position.lerpVectors(seat, p0, up); H.rotation.y = lerp(-Math.PI / 2, yawOf(cv.h1, 0), up);
  } else if (t < TL.goH) {                                     // sale al pasillo, se encuentran y hablan
    const u = trap(seg(t, TL.w0, TL.w1)); walkOn(H, cv.h1, u, 0, 0.55);
    if (u >= 1) { const k = win(t, TL.w1, 0.3); H.rotation.y = lerp(yawOf(cv.h1, 1), 1.12, k); JH.neck.rotation.y = 0.12 * k;
      const nod = Math.sin(clamp((t - K['venga_2']) / 0.5) * Math.PI), sh = win(t, K['no_2'] - 0.12, 0.3) * (1 - win(t, 8.5, 0.3));          // «Venga» (asiente) · «no me da la vida» (se encoge de hombros)
      JH.neck.rotation.x = 0.22 * nod; JH.shL.rotation.z = -0.1 - 0.5 * sh; JH.shR.rotation.z = 0.1 + 0.5 * sh; JH.shL.rotation.x = JH.shR.rotation.x = -0.25 * sh; JH.elL.rotation.x = JH.elR.rotation.x = -1.45 * sh; JH.neck.rotation.y += 0.14 * sh * Math.sin(t * 9);
      if (t > 6.7 && t < 8.7) JH.chest.rotation.x = 0.05 * vz; }
  } else if (t < TL.sit) { walkOn(H, cv.hGo, trap(seg(t, TL.goH, TL.sit)), 0, 0.5); }
  else if (t < TL.b0) {                                        // en la mesa: bebe, «Ahora sí», y se levanta
    const up = win(t, TL.st0, TL.b0 - TL.st0), p0 = cv.hBk.getPointAt(0); poseSit(H, 1 - up); armsFwd(H, 1 - up); H.position.lerpVectors(sH, p0, up); H.rotation.y = lerp(Math.PI / 2, yawOf(cv.hBk, 0), up);
    const k = win(t, TL.sipH, 0.6) * (1 - win(t, TL.sipH + 1.0, 0.5)), k2 = win(t, 22.9, 0.55) * (1 - win(t, 23.8, 0.5)), ys = win(t, TL.yes - 0.05, 0.3) * (1 - win(t, TL.yes + 1.3, 0.5));
    if (up < 0.01) { sipAt(H, S.cupH, S.restH, 'L', Math.max(k, k2), t, t < TL.sipH + 0.6 ? 0.98 : t < 23.3 ? 0.8 : 0.62);
      JH.chest.rotation.x = 0.1 - 0.2 * ys + 0.04 * vz * ys; JH.neck.rotation.x += 0.2 * Math.sin(clamp((t - TL.yes) / 0.45) * Math.PI); JH.shR.rotation.z = 0.1 + 0.3 * ys; JH.shR.rotation.x += 0.25 * ys; JH.neck.rotation.y = 0.1 * Math.sin(t * 0.9); }
    else { S.cupH.position.copy(S.restH); S.cupH.rotation.set(0, 2.4, 0); }
  } else { walkOn(H, cv.hBk, trap(seg(t, TL.b0, TL.b1), 0.1), 0, 0.55); }
  // ---- ELLA
  E.visible = t >= TL.s0 - 0.6;
  if (t < TL.goE) {                                            // llega por el pasillo saludando: «¿Bajamos a desayunar?»
    const u = trap(seg(t, TL.s0, TL.s1)); walkOn(E, cv.e1, u, 1, 0.5); const wv = win(t, 4.35, 0.3) * (1 - win(t, 5.3, 0.3)), pt = win(t, K['desayunar_1'] - 0.1, 0.3) * (1 - win(t, 6.5, 0.4));
    if (u >= 1) { const k = win(t, TL.s1, 0.3); E.rotation.y = lerp(yawOf(cv.e1, 1), -1.12, k); JE.neck.rotation.y = -0.1 * k; JE.hip.rotation.z = 0.04 * k; }
    JE.shR.rotation.z = 0.1 + 2.3 * wv; JE.shR.rotation.x = JE.shR.rotation.x * (1 - wv); JE.elR.rotation.x = lerp(JE.elR.rotation.x, -0.5 + 0.35 * Math.sin(t * 13), wv);
    JE.shL.rotation.x = lerp(JE.shL.rotation.x, 0.75, pt); JE.shL.rotation.z = -0.1 - 0.35 * pt; JE.elL.rotation.x = lerp(JE.elL.rotation.x, -0.35, pt); JE.neck.rotation.z = 0.16 * pt;       // señala hacia la cafetería, a su espalda
    if (t > 4.65 && t < 6.25) JE.chest.rotation.x = 0.05 * vz; if (t > 6.7) JE.neck.rotation.x = 0.1 * Math.sin(clamp((t - 7.4) / 0.6) * Math.PI);
  } else if (t < TL.sit) { walkOn(E, cv.eGo, trap(seg(t, TL.goE, TL.sit)), 1, 0.5); }
  else if (t < TL.bE0) {                                       // en la mesa: habla con las manos, bebe, mira la hora y se levanta
    const up = win(t, TL.st0 + 0.15, TL.bE0 - TL.st0 - 0.15), p0 = cv.eBk.getPointAt(0); poseSit(E, 1 - up); armsFwd(E, 1 - up); E.position.lerpVectors(sE, p0, up); E.rotation.y = lerp(-Math.PI / 2, yawOf(cv.eBk, 0), up);
    const k = win(t, TL.sipE, 0.6) * (1 - win(t, TL.sipE + 1.1, 0.5)), tk = (win(t, 16.0, 0.4) * (1 - win(t, 17.6, 0.4)) + win(t, 20.4, 0.4) * (1 - win(t, 21.3, 0.3))), wt = win(t, 24.1, 0.35) * (1 - win(t, 25.1, 0.3));
    if (up < 0.01) { sipAt(E, S.cupE, S.restE, 'R', k, t, t < TL.sipE + 0.6 ? 0.98 : 0.78);
      JE.shL.rotation.x += -0.35 * tk + 0.12 * tk * Math.sin(t * 5.5); JE.elL.rotation.x += -0.5 * tk + 0.25 * tk * Math.sin(t * 7.1 + 1); JE.shL.rotation.z = -0.1 - 0.25 * tk; JE.neck.rotation.y = -0.08 * Math.sin(t * 1.1); JE.neck.rotation.z = 0.08 * tk * Math.sin(t * 3);
      JE.shL.rotation.x += -0.3 * wt; JE.elL.rotation.x += -0.85 * wt; JE.shL.rotation.z += 0.45 * wt; JE.neck.rotation.x += 0.3 * wt; JE.chest.rotation.x = 0.1 + 0.05 * Math.sin(clamp((t - TL.yes - 0.5) / 0.9) * Math.PI); }
    else { S.cupE.position.copy(S.restE); S.cupE.rotation.set(0, 0.7, 0); }
  } else { walkOn(E, cv.eBk, trap(seg(t, TL.bE0, TL.bE1), 0.1), 1, 0.5); }
  // ---- figurantes
  S.studs.forEach((d, i) => { poseSit(d); armsFwd(d); const J = d.userData.J, st2 = i === 1 ? win(t, 3.3, 0.6) * (1 - win(t, 5.2, 0.6)) : 0; J.neck.rotation.y = 0.35 * Math.sin(t * 0.5 + i * 2.1); J.neck.rotation.x = 0.22 * (0.5 + 0.5 * Math.sin(t * 0.7 + i)); J.chest.rotation.x = 0.1; J.elR.rotation.x += 0.12 * Math.sin(t * 6 + i * 3);
    J.shL.rotation.x = lerp(J.shL.rotation.x, -2.9, st2); J.shR.rotation.x = lerp(J.shR.rotation.x, -2.9, st2); J.elL.rotation.x = lerp(J.elL.rotation.x, -0.3, st2); J.elR.rotation.x = lerp(J.elR.rotation.x, -0.3, st2); J.chest.rotation.x -= 0.2 * st2; });
  { poseZero(S.prof); const J = S.prof.userData.J; J.shR.rotation.x = -2.0 + 0.15 * Math.sin(t * 5); J.elR.rotation.x = -0.5 + 0.2 * Math.sin(t * 7); J.neck.rotation.x = -0.1; }
  { poseZero(S.bar); const J = S.bar.userData.J; J.shL.rotation.x = J.shR.rotation.x = -0.5; J.elL.rotation.x = J.elR.rotation.x = -1.1 + 0.1 * Math.sin(t * 2.3); J.neck.rotation.y = 0.3 * Math.sin(t * 0.6); J.neck.rotation.x = 0.2; J.chest.rotation.y = 0.15 * Math.sin(t * 0.45); }
  S.cafe.forEach((d, i) => { poseSit(d); armsFwd(d); const J = d.userData.J; J.neck.rotation.y = 0.2 * Math.sin(t * 0.8 + i * 3); J.elL.rotation.x += 0.3 * Math.sin(t * 3.1 + i * 2) * (i ? 1 : 0.3); J.chest.rotation.x = 0.1; });
  for (const b of SETU.lamps) b.material.color.setHex(0xffd9a0).multiplyScalar(2.2);
  scene.updateMatrixWorld(true); const c = st.l; lightsAt(c, st.p.distanceTo(c));
}
