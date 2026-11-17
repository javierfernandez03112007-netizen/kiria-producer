// ---------------------------------------------------------------- la escena y su animación, guiada por la voz (K = inicio de cada palabra). Actores: Jason (camisa hawaiana), el
// maniquí gris (Jason «sin su ropa»: la policía busca la ropa, no a él), Lucía, el testigo, el deportivo naranja (y la berlina verde por la que
// se cambia) y tres patrullas. Primer fotograma = último: las patrullas rodean la ropa vacía mientras el maniquí se escabulle.
let TL = {};
const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => v3(p[0], 0, p[1])), false, 'centripetal', 0.5);
function onCurve(c, u) { const p = c.getPointAt(clamp(u)), tg = c.getTangentAt(clamp(u)); return [p.x, p.z, Math.atan2(-tg.z, tg.x)]; }
const seg = (t, a, b) => clamp((t - a) / (b - a));
function ramp(tau, acc, vmax) { const t1 = vmax / acc; return tau <= 0 ? 0 : tau < t1 ? 0.5 * acc * tau * tau : 0.5 * acc * t1 * t1 + vmax * (tau - t1); }   // distancia recorrida arrancando
async function buildScene() {
  TL = { merge0: 5.62, merge1: 6.7, lu0: 6.9, lu1: 9.2, run0: 10.0, run1: 11.95, p3go: 10.95, p2back0: 6.0, p2back1: 9.5, p1pass: K['cuantas_9'] - 0.45, back0: 14.8, back1: 17.7, wit0: 21.4, wit1: 24.3, witGo: K['nadie_6'] + 0.05,
    swap0: K['cambia_8'] - 0.05, swap1: K['coche_8'] + 0.45, gl: K['gafas_8'] + 0.05, cp: K['gorra_8'] + 0.02, p2in0: 39.05, p2in1: 40.85, split: K['separalos_10'] + 0.05,
    p1in0: 43.35, p1in1: 45.35, p3in0: 43.6, p3in1: 45.7, pop: 45.15, unswap0: 44.45, unswap1: 45.15 };
  S.set = buildSet(); scene.add(S.set);
  // la camisa hawaiana (naranja con flores)
  const hw = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ff7a1a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const x = hash(i * 3.1) * w, y = hash(i * 7.7) * h, r = 9 + hash(i * 5.3) * 9; g.fillStyle = i % 3 ? '#fff3d6' : '#ffd23f';
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + i; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, r * 0.3, a, 0, 7); g.fill(); } g.fillStyle = '#ff4f6a'; g.beginPath(); g.arc(x, y, r * 0.28, 0, 7); g.fill(); } });
  hw.wrapS = hw.wrapT = THREE.RepeatWrapping; hw.repeat.set(2, 2);
  S.jason = gtaDoll({ shirtMat: new THREE.MeshStandardMaterial({ map: hw, roughness: 0.7 }), pants: 0xf3efe4, skin: 0xd9a27c, hair: 0x5a3a22 });
  S.cap = dollCap(0x2a6bd6); S.glasses = dollGlasses(); S.jason.userData.J.neck.add(S.cap, S.glasses); S.cap.visible = S.glasses.visible = false;
  const mMan = new THREE.MeshPhysicalMaterial({ color: 0xdfe3ea, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  S.nude = gtaDoll({ skinMat: mMan, shirtMat: mMan, pantsMat: mMan, shoeMat: mMan, hairStyle: 'none' });
  S.lucia = gtaDoll({ shirt: 0xe8336e, pants: 0x35508f, skin: 0xc68a62, hair: 0x1c1410, hairStyle: 'ponytail', scale: 1.58 });
  S.wit = gtaDoll({ shirt: 0xffd23f, pants: 0x4a4f5c, skin: 0xe6b996, hair: 0x2c2c30, scale: 1.62 });
  { const ph = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.085, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fe8ff).multiplyScalar(1.6), toneMapped: false })); ph.position.set(0, -0.03, 0.03); S.wit.userData.J.hR.add(ph); S.witPhone = ph; }
  scene.add(S.jason, S.nude, S.lucia, S.wit);
  S.car = carModel({ kind: 'sport', color: 0xff7a1a }); S.car2 = carModel({ kind: 'sedan', color: 0x1fb8a8 }); scene.add(S.car, S.car2);
  S.pol = [0, 1, 2].map(() => { const c = carModel({ kind: 'police' }); scene.add(c); return c; });
  S.beams = [0, 1, 2].map(() => { const b = beamMesh(); scene.add(b); return b; });
  // el «cono de visión» de GTA 5 (como en el minimapa): un sector azul en el suelo delante de la patrulla 3
  { const m = new THREE.Mesh(new THREE.CircleGeometry(10, 28, -0.5, 1.0), new THREE.MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(2.2, 0.07, 0); m.renderOrder = 4; S.pol[2].add(m); S.cone5 = m; }
  S.strobe = new THREE.PointLight(0xff3050, 0, 34, 1.7); scene.add(S.strobe);
  S.ex = label('!', { size: 170, color: '#ffd34a', w: 0.55, weight: 900 }); S.qm = label('?', { size: 170, color: '#ffffff', w: 0.9, weight: 900 }); scene.add(S.ex, S.qm);
  S.puff = sparks(scene, 70, 0xfff0c0, 0.16);
  // trayectos
  S.cv = { jRun: curve([[0, 0], [0.8, -1.6], [1.0, -2.9], [3.0, -5.0], [5.9, -7.6], [6.95, -9.4], [6.9, -10.6], [6.85, -11.1]]),
    lIn: curve([[5.8, -7.8], [3.0, -5.0], [1.0, -2.9], [0.8, -1.2], [LUC.x, LUC.z]]), lOut: curve([[LUC.x, LUC.z], [-0.5, 2.6], [-6, 4.8], [-24, 5.6]]),
    wIn: curve([[-15, -5.5], [-8, -5.5], [WIT.x, WIT.z]]), wOut: curve([[WIT.x, WIT.z], [-8, -5.7], [-22, -5.6]]),
    p1out: curve([[RINGP[0][0], RINGP[0][1]], [-2, -1.4], [1.2, -2.9], [7, -2.9], [13, -2.2], [70, -2]]), p1in: curve([[-60, -1.4], [-18, -1.4], [-11, -1.3], [RINGP[0][0], RINGP[0][1]]]),
    p2in: curve([[46, -2.2], [18, -2.2], [12.5, -2.0], [RINGP[1][0], RINGP[1][1]]]),
    p3out: curve([[RINGP[2][0], RINGP[2][1]], [2, -3.1], [7, -3.2], [13, -2.4], [70, -2.0]]), p3in: curve([[-60, -3.6], [-12, -3.6], [-6, -3.5], [RINGP[2][0], RINGP[2][1]]]) };
  // polvo en el aire (deja estelas cuando se mueve la cámara)
  S.flow.push(flowCloud(4200, i => [-34 + hash(i * 1.3) * 68, 0.3 + Math.pow(hash(i * 2.7), 1.3) * 13, -9 + hash(i * 3.9) * 26], { size: 1.5, bright: 0.42, nearF: 0.5, farF: 0.02, drift: 0.35, seed: 3, col: 0xffd9e6 }));
  S.flow.push(flowCloud(900, i => [ALLEY.x0 + 0.2 + hash(i * 4.3) * 3.1, 0.3 + hash(i * 5.1) * 6, -18.5 + hash(i * 6.7) * 11], { size: 1.3, bright: 0.4, nearF: 0.3, farF: 0.03, drift: 0.2, seed: 5, col: 0xffe2c0 }));
  S.anc = { car: v3(), shirt: v3(), face: v3(), cctv: v3(), lucia: v3(), wit: v3(), alarm: SHOP.alarm.clone(), p2: v3(), nude: v3() };
  envAll(scene);
}
const NUDE0 = new THREE.Vector3(2.2, 0, 1.0), NUDEV = new THREE.Vector3(0.25, 0, 0.05), LUC = new THREE.Vector3(0.9, 0, 0.9);
function showSkin(d, on) { for (const m of d.userData.skin) m.visible = on; }
function setCloth(d, on) { for (const m of d.userData.cloth) m.visible = on; }
// una patrulla en t: [x, z, orientación, luces 0..1]
//  1 (detrás del protagonista): se queda con las luces apagadas; en la frase 9 arranca y PASA DE LARGO; vuelve al final por el oeste.
//  2 (junto a la cámara): se retira marcha atrás sin que se vea; llega por el este en la frase 10 buscando a una pareja.
//  3 (a la derecha): en GTA 5 pasa por delante del callejón con su cono de visión; vuelve al final por el oeste.
function polAt(i, t) {
  const R = RINGP[i], cv = S.cv;
  if (i === 0) { if (t < TL.p1pass) return [R[0], R[1], R[2], 1 - win(t, 10.4, 0.5)];
    if (t < TL.p1in0 - 0.5) { const c = onCurve(cv.p1out, ramp(t - TL.p1pass, 3.4, 8) / cv.p1out.getLength()); return [c[0], c[1], c[2], 0.7]; }
    if (t < TL.p1in0) return [-80, -1.4, 0, 0]; const c = onCurve(cv.p1in, eo(seg(t, TL.p1in0, TL.p1in1))); return [c[0], c[1], t >= TL.p1in1 ? R[2] : c[2], 1]; }
  if (i === 1) { if (t < TL.p2back0) return [R[0], R[1], R[2], 1];
    if (t < TL.p2back1) { const u = eio(seg(t, TL.p2back0, TL.p2back1)); return [R[0] + u * 45, R[1], R[2], 1 - u]; }
    if (t < TL.p2in0) return [80, -2.2, Math.PI, 0]; const c = onCurve(cv.p2in, eo(seg(t, TL.p2in0, TL.p2in1))); return [c[0], c[1], t >= TL.p2in1 ? R[2] : c[2], 1]; }
  if (t < TL.p3go) return [R[0], R[1], R[2], 1 - win(t, 10.4, 0.5)];
  if (t < 26) { const c = onCurve(cv.p3out, ramp(t - TL.p3go, 2.6, 7) / cv.p3out.getLength()); return [c[0], c[1], c[2], 0]; }
  if (t < TL.p3in0) return [-80, -3.6, 0, 0];
  const c = onCurve(cv.p3in, eo(seg(t, TL.p3in0, TL.p3in1))); return [c[0], c[1], t >= TL.p3in1 ? R[2] : c[2], 1];
}
function stageAt(t, st) {
  NOW = t; const J = S.jason, N = S.nude, Lu = S.lucia, Wt = S.wit, cv = S.cv, tw = (t + 1e-4) % END;                 // tw: para que el bucle case
  // ---- ambiente: en el callejón, más de noche
  const dark = sm5(clamp((-8.5 - st.p.z) / 3)) * (st.p.y < 9 ? 1 : clamp((14 - st.p.y) / 5)); moodMix({ vice: 1 - 0.75 * dark, noche: 0.75 * dark });
  setAt(t, { cctv: win(t, K['grabado_5'] - 0.1, 0.5) * (1 - win(t, 41.8, 0.8)), alarm: 0, alley: clamp(dark * 1.3) });
  // ---- las patrullas, sus luces y sus focos
  let ringK = 0;
  for (let i = 0; i < 3; i++) { const p = polAt(i, t); carPose(S.pol[i], p[0], p[1], p[2]); barAt(S.pol[i], t, p[3]); carLights(S.pol[i], p[3]); S.pol[i].visible = Math.abs(p[0]) < 60;
    const near = clamp(1 - Math.hypot(p[0] - RING.x, p[1] - RING.z) / 16) * p[3]; ringK = Math.max(ringK, near);
    const from = v3(p[0], 1.75, p[1]); let to = v3(RING.x, 1.15, RING.z), bk = 0;
    if (t < 10.4) { bk = 1 - win(t, 9.9, 0.4); if (i === 1) { to.lerp(v3(CAR0.p.x, 0.8, CAR0.p.z), win(t, K['coche_1'] - 0.12, 0.35)); bk *= 1 - win(t, TL.p2back0, 0.5); } }
    else if (i === 0 && t >= TL.p1pass && t < TL.p1in0 - 0.5) { bk = clamp(1 - Math.abs(p[0] + 1) / 12); const ah = win(t, TL.p1pass + 1.5, 0.9); to = v3(lerp(RING.x, p[0] + 7, ah), lerp(1.1, 0.3, ah), lerp(RING.z, p[1] + 2.6 + Math.sin(t * 2.4) * 0.9, ah)); }   // pasa de largo: el foco le roza y sigue
    else if (i === 1 && t >= TL.p2in0) { bk = win(t, TL.p2in0 + 0.5, 0.5); const sp = win(t, TL.split, 0.5) * (1 - win(t, TL.pop - 0.7, 0.6)); to = v3(0.5 + Math.sin(t * 3.1) * 1.5 * sp, 1.05, 0.4 + Math.cos(t * 2.3) * 1.1 * sp); }   // busca a una pareja… y ya no la hay
    else if (t >= TL.p1in0) bk = win(t, [TL.p1in1, 0, TL.p3in1][i] - 0.5, 0.5);
    beamSet(S.beams[i], from, to, 0.95, bk * (i === 0 ? 0.55 : 1)); }
  S.cone5.material.opacity = 0.55 * win(t, TL.p3go + 0.3, 0.6) * (1 - win(t, 15.4, 0.8));
  { const ph = Math.floor(t * 6) % 2; S.strobe.color.setHex(ph ? 0x2a6bff : 0xff2a3a); S.strobe.intensity = 26 * ringK; S.strobe.position.set(RING.x + (ph ? 1.5 : -3.5), 2.8, RING.z - 1.6); }
  // ---- Jason: su ropa sola (principio y final), el maniquí que se escabulle y vuelve, la carrera al callejón y la vuelta
  const ghost = t < TL.merge1 || t >= TL.pop; showSkin(J, !ghost); J.visible = true;
  let jp = v3(RING.x, 0, RING.z), jyaw = Math.PI / 2 - 0.12;
  if (t >= TL.run0 && t < TL.back0) { const u = eio(seg(t, TL.run0, TL.run1)), c = onCurve(cv.jRun, u); jp.set(c[0], 0, c[1]); const tg = cv.jRun.getTangentAt(clamp(u)); jyaw = u < 1 ? Math.atan2(tg.x, tg.z) : lerp(Math.atan2(tg.x, tg.z), 0.5, win(t, TL.run1, 0.3));
    if (u < 1) poseRun(J, t * 15); else poseCrouch(J, win(t, TL.run1 - 0.05, 0.3)); }
  else if (t >= TL.back0 && t < TL.back1) { const u = 1 - eio(seg(t, TL.back0, TL.back1)), c = onCurve(cv.jRun, u); jp.set(c[0], 0, c[1]); const tg = cv.jRun.getTangentAt(clamp(u)); jyaw = Math.atan2(-tg.x, -tg.z); poseWalk(J, t * 9.5, 0.7, 0.1); }
  else if (ghost) poseGhost(J, tw);
  else { poseZero(J); const jj = J.userData.J; jj.chest.rotation.x = 0.02 * Math.sin(t * 1.7); jj.neck.rotation.y = 0.25 * Math.sin(t * 0.8); }
  jp.y = jp.z < -4.05 ? 0.16 * clamp((-4.05 - jp.z) / 0.3) : 0;                                         // sube a la acera
  const hover = ghost ? 0.16 + 0.05 * Math.sin(tw / END * Math.PI * 2 * 22) : 0; const pk = t < TL.merge1 + 0.4 && t >= TL.merge1 ? 1 + 0.14 * (1 - seg(t, TL.merge1, TL.merge1 + 0.4)) : 1;
  J.position.set(jp.x, jp.y + hover, jp.z); J.rotation.y = jyaw; J.userData.R.scale.setScalar(J.userData.s0 * pk);
  // el maniquí: se escabulle (principio), vuelve a su ropa, y al final se sale otra vez (bucle)
  { let vis = false, p = v3(), yaw = Math.atan2(NUDEV.x, NUDEV.z);
    if (t < TL.merge0) { vis = true; p.copy(NUDE0).addScaledVector(NUDEV, t); poseSneak(N, tw / END * Math.PI * 2 * 44); }
    else if (t < TL.merge1) { vis = true; const u = eio(seg(t, TL.merge0, TL.merge1)), a = NUDE0.clone().addScaledVector(NUDEV, TL.merge0); p.lerpVectors(a, v3(RING.x, 0, RING.z), u); yaw = Math.atan2(RING.x - a.x, RING.z - a.z); poseRun(N, t * 16); p.y = Math.sin(u * Math.PI) * 0.25; }
    else if (t >= TL.pop) { vis = true; const u = eo(seg(t, TL.pop, END)); p.lerpVectors(v3(RING.x, 0, RING.z), NUDE0, u); p.y = Math.sin(clamp(u * 2.2) * Math.PI) * 0.3; poseSneak(N, tw / END * Math.PI * 2 * 44); }
    N.visible = vis; N.position.copy(p); N.rotation.y = yaw; }
  // gafas y gorra (frase 8); se van al final
  { const g = S.glasses, c = S.cap, kg = pop(t, TL.gl, 0.3) * (1 - win(t, TL.pop - 0.25, 0.25)), kc = pop(t, TL.cp, 0.3) * (1 - win(t, TL.pop - 0.25, 0.25));
    g.visible = kg > 0.01; c.visible = kc > 0.01; g.position.y = 0.092 + (1 - Math.min(1, kg)) * 0.5; g.scale.setScalar(Math.max(0.001, kg)); c.position.y = 0.105 + (1 - Math.min(1, kc)) * 0.5; c.scale.setScalar(Math.max(0.001, kc)); }
  // ---- Lucía: llega (frase 2), se queda junto a Jason, y al separarse sale corriendo (frase 10)
  { let vis = t >= TL.lu0 && t < 43.2, p = v3(LUC.x, 0, LUC.z), yaw = Math.PI / 2 - 0.25;
    if (t < TL.lu1) { const u = eio(seg(t, TL.lu0, TL.lu1)), c = onCurve(cv.lIn, u), tg = cv.lIn.getTangentAt(clamp(u)); p.set(c[0], 0, c[1]); yaw = Math.atan2(tg.x, tg.z); poseWalk(Lu, t * 10, 0.6); if (u >= 1) { poseZero(Lu); yaw = Math.PI / 2 - 0.25; } }
    else if (t >= TL.split) { const u = seg(t, TL.split, TL.split + 2.3), c = onCurve(cv.lOut, u * u * 0.4 + u * 0.6), tg = cv.lOut.getTangentAt(clamp(u)); p.set(c[0], 0, c[1]); yaw = Math.atan2(tg.x, tg.z); poseRun(Lu, t * 16); }
    else { poseZero(Lu); const jj = Lu.userData.J; jj.shR.rotation.z = 0.55; jj.elR.rotation.x = -1.5; jj.hip.rotation.z = 0.05; jj.neck.rotation.y = 0.3 * Math.sin(t * 0.7 + 1); }
    p.y = p.z < -4.05 ? 0.16 : (p.z > 4.05 ? 0.16 : 0); Lu.visible = vis; Lu.position.copy(p); Lu.rotation.y = yaw; }
  // ---- el testigo: llega por la acera, llama (frase 6) y, «si nadie te ve», se da la vuelta y se va
  { let vis = t >= TL.wit0 && t < 31.5, p = v3(WIT.x, WIT.y, WIT.z), yaw = Math.atan2(RING.x - WIT.x, RING.z - WIT.z);
    if (t < TL.wit1) { const u = seg(t, TL.wit0, TL.wit1), c = onCurve(cv.wIn, u); p.set(c[0], WIT.y, c[1]); yaw = lerp(Math.PI / 2, yaw, win(t, TL.wit1 - 0.5, 0.5)); poseWalk(Wt, t * 9, 0.5); }
    else if (t >= TL.witGo) { const u = seg(t, TL.witGo + 0.35, TL.witGo + 5), c = onCurve(cv.wOut, u); p.set(c[0], WIT.y, c[1]); yaw = lerp(yaw, -Math.PI / 2, win(t, TL.witGo, 0.4)); if (u > 0) poseWalk(Wt, t * 9, 0.5); else poseZero(Wt); posePhone(Wt, 1 - win(t, TL.witGo, 0.4)); }
    else { poseZero(Wt); posePhone(Wt, win(t, TL.wit1 + 0.1, 0.4)); }
    Wt.visible = vis; Wt.position.copy(p); Wt.rotation.y = yaw; }
  // ---- el coche: deportivo naranja → berlina verde (frase 8) y vuelta al naranja al final (bucle)
  { const a = seg(t, TL.swap0, TL.swap1), b = seg(t, TL.unswap0, TL.unswap1), k = t < TL.unswap0 ? a : 1 - b, spin = (t < TL.unswap0 ? a : b) * Math.PI * 2;
    const s1 = k < 0.5 ? 1 - Math.pow(k * 2, 2) * 0.85 : 0, s2 = k >= 0.5 ? 0.15 + 0.85 * Math.min(1, pop((k - 0.5) * 2, 0, 1)) : 0;
    S.car.visible = k < 0.5; S.car2.visible = k >= 0.5; for (const [c, s] of [[S.car, s1], [S.car2, s2]]) { carPose(c, CAR0.p.x, CAR0.p.z, CAR0.yaw + spin); c.scale.setScalar(Math.max(0.001, s)); c.position.y = Math.sin(Math.min(1, (t < TL.unswap0 ? a : b)) * Math.PI) * 0.5; }
    const tb = t < TL.unswap0 ? (TL.swap0 + TL.swap1) / 2 : (TL.unswap0 + TL.unswap1) / 2; S.puff.visible = t > tb && t < tb + 0.6; if (S.puff.visible) { burst(S.puff, v3(CAR0.p.x, 0.9, CAR0.p.z), t, tb, 2.4, 0.6, false, 2); S.puff.material.opacity = 1 - seg(t, tb, tb + 0.6); } }
  // ---- «!» del testigo y «?» de la patrulla que busca a una pareja
  { const k1 = pop(t, TL.wit1 + 0.35, 0.3) * (1 - win(t, TL.witGo - 0.1, 0.3)); S.ex.position.set(Wt.position.x, WIT.y + 2.35, Wt.position.z); lookLab(S.ex, k1); S.ex.scale.setScalar(Math.max(0.001, k1));
    const pp = S.pol[1].position, k2 = pop(t, TL.split + 0.45, 0.3) * (1 - win(t, 43.2, 0.4)); S.qm.position.set(pp.x - 1.7, 2.45 + 0.08 * Math.sin(t * 5), pp.z + 0.75); lookLab(S.qm, k2); S.qm.scale.setScalar(Math.max(0.001, k2)); }
  // ---- anclas para los rótulos
  scene.updateMatrixWorld(true); const A = S.anc; A.car.set(CAR0.p.x, 1.25, CAR0.p.z); wpos(J.userData.J.chest, A.shirt).y += 0.3; wpos(J.userData.J.head, A.face); wpos(SETU.cctv.head, A.cctv);
  wpos(Lu.userData.J.head, A.lucia); wpos(S.witPhone, A.wit); A.p2.copy(S.pol[1].position).setY(1.6); wpos(N.userData.J.head, A.nude);
  const c = st.l; lightsAt(c, st.p.distanceTo(c));
}
