// ---------------------------------------------------------------- 0 · el graduado (sobre una plataforma flotando sobre las nubes): birrete → avión de papel → avión → alas que no llegan;
// «¿qué te falta?»; y la respuesta (el máster) al final. Zona local como en «Industrial»: el graduado mira hacia +x local (= +z del mundo).
const GRADP = v3(0, 0, 0);
function buildGrad() {
  const Z = new THREE.Group(); Z.position.copy(GRADP); Z.rotation.y = -Math.PI / 2; scene.add(Z); S.gradZ = Z;
  const ped = cyl(0.95, 1.0, 0.22, plastic(0x161a24, 0.3), 64); ped.position.y = 0.11; Z.add(ped); S.ped = ped;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.975, 0.018, 8, 96), glowM(0x47d6ff, 3)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.1; ped.add(rim);
  const under = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.6, 64, 1, true), plastic(0x10131b, 0.4)); under.rotation.x = Math.PI; under.position.y = -0.3; Z.add(under);
  // graduado: maniquí blanco con toga azul marino y estola amarilla (como en «Industrial»)
  const body = plastic(0xf1f3f7, 0.18), d = makeDoll(body); d.scale.setScalar(1.6); d.position.y = 0.22; d.rotation.y = Math.PI / 2; Z.add(d); S.grad = d;
  const gown = new THREE.Mesh(new THREE.LatheGeometry([v3(0.001, 0.88, 0), v3(0.1, 0.875, 0), v3(0.155, 0.84, 0), v3(0.17, 0.7, 0), v3(0.19, 0.4, 0), v3(0.23, 0.1, 0), v3(0.245, 0.04, 0), v3(0.001, 0.04, 0)].reverse().map(p => new THREE.Vector2(p.x, p.y)), 48), plastic(PL.navy, 0.24));
  gown.castShadow = true; d.add(gown);
  for (const s of [-1, 1]) { const st = rbox(0.05, 0.36, 0.012, plastic(PL.yellow, 0.2), 0.01); st.position.set(s * 0.055, 0.68, 0.135); st.rotation.x = 0.12; d.add(st); }
  const J = d.userData.J;
  for (const sd of ['shL', 'shR', 'elL', 'elR']) J[sd].children.forEach(o => { if (o.isMesh) o.material = plastic(PL.navy, 0.24); });
  S.dip = diploma(); S.dip.scale.setScalar(0.9); J.hR.add(S.dip); S.dip.position.set(0, -0.02, 0.02);
  S.bir = birrete(); S.bir.scale.setScalar(0.34); Z.add(S.bir);
  S.paper = makePaperPlane(); S.paper.scale.setScalar(0.42); scene.add(S.paper);
  S.badge = makeBadge(); S.badge.scale.setScalar(0.3); Z.add(S.badge);
  S.flashS = sparks(Z, 90, 0xfff0b0, 0.07);
  S.conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3 }), 240);
  S.conf.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(240 * 3), 3); S.conf.frustumCulled = false; Z.add(S.conf);
  for (let i = 0; i < 240; i++) S.conf.setColorAt(i, _c.set([PL.yellow, PL.pink, PL.sky, PL.green, PL.orange, 0xffffff][i % 6]));
  S.bar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff3b4e, transparent: true, toneMapped: false })); Z.add(S.bar);
  S.barX = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (q, w, h) => { q.strokeStyle = '#ff4d5e'; q.lineWidth = 46; q.lineCap = 'round'; q.beginPath(); q.moveTo(50, 50); q.lineTo(206, 206); q.moveTo(206, 50); q.lineTo(50, 206); q.stroke(); }), transparent: true, depthWrite: false, toneMapped: false })); S.barX.renderOrder = 9; Z.add(S.barX);
  S.q = qmark(new THREE.MeshPhysicalMaterial({ color: 0xffc21a, emissive: 0xff9a00, emissiveIntensity: 0.55, roughness: 0.2, clearcoat: 1 })); S.q.scale.setScalar(0.5); Z.add(S.q);
  S.mblock = rbox(0.62, 0.2, 0.2, plastic(PL.yellow, 0.18), 0.05); Z.add(S.mblock);
  const mf = facePlane(canvasTex(512, 160, (q, w, h) => { q.fillStyle = '#10131a'; q.font = '900 104px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('MÁSTER', w / 2, h / 2 + 6); }), 0.56, 0.175); mf.position.z = 0.101; S.mblock.add(mf);
  const mb = mf.clone(); mb.position.z = -0.101; mb.rotation.y = Math.PI; S.mblock.add(mb);
  S.badgeMaster = BADGE_TXT('MÁSTER', '#ffc35a'); S.badgeQ = S.badge.userData.mt.material.map;
  S.wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })); S.wave.rotation.x = -Math.PI / 2; S.wave.position.y = 0.03; Z.add(S.wave);
  // sello «profesión regulada»
  const seal = new THREE.Group(); Z.add(seal); S.seal = seal;
  const sd2 = cyl(0.42, 0.42, 0.08, MAT.gold, 48); sd2.rotation.x = Math.PI / 2; seal.add(sd2);
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, tk = rbox(0.07, 0.07, 0.07, MAT.gold, 0.02); tk.position.set(Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0); tk.rotation.z = a + Math.PI / 4; seal.add(tk); }
  const sf = facePlane(canvasTex(512, 512, (q, w, h) => { q.fillStyle = '#8a5a12'; q.beginPath(); q.arc(256, 256, 214, 0, 7); q.lineWidth = 14; q.strokeStyle = '#8a5a12'; q.stroke();
    q.font = '900 170px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('★', 256, 250); }), 0.8, 0.8); sf.position.z = 0.045; seal.add(sf);
  for (const s of [-1, 1]) { const rb = rbox(0.14, 0.5, 0.02, plastic(PL.red, 0.25), 0.01); rb.position.set(s * 0.14, -0.5, -0.02); rb.rotation.z = s * 0.25; seal.add(rb); }
  S.sealL = pill('PROFESIÓN REGULADA', '#ffd76a', 'rgba(16,20,30,.9)', 1.25, 64); Z.add(S.sealL);
  // candado y llave (grado + máster = la llave que habilita)
  const lock = new THREE.Group(); Z.add(lock); S.lock = lock;
  const lb = rbox(0.56, 0.5, 0.22, plastic(0x2a2f3a, 0.25), 0.07); lock.add(lb);
  const kh = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshBasicMaterial({ color: 0x050608 })); kh.position.set(0, 0.03, 0.111); lock.add(kh);
  const kh2 = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.1), kh.material); kh2.position.set(0, -0.04, 0.111); lock.add(kh2);
  S.shackle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 14, 40, Math.PI), MAT.steel); S.shackle.position.y = 0.25; lock.add(S.shackle);
  for (const s of [-1, 1]) { const leg = cyl(0.045, 0.045, 0.12, MAT.steel, 16); leg.position.set(s * 0.17, -0.06, 0); S.shackle.add(leg); }
  S.keyG = new THREE.Group(); Z.add(S.keyG);
  const halfK = (txt, col, w) => { const b = rbox(w, 0.16, 0.12, plastic(col, 0.2), 0.04); const f = facePlane(canvasTex(512, 140, (q, ww, hh) => { q.fillStyle = '#ffffff'; q.font = '900 92px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(txt, ww / 2, hh / 2 + 4); }), w * 0.92, 0.135); f.position.z = 0.061; b.add(f); return b; };
  S.kGrado = halfK('GRADO', PL.blue, 0.5); S.keyG.add(S.kGrado);
  S.kMaster = halfK('MÁSTER', PL.yellow, 0.5); S.keyG.add(S.kMaster);
  S.kBit = new THREE.Group(); S.keyG.add(S.kBit);
  const shaft = cyl(0.03, 0.03, 0.34, MAT.gold, 16); shaft.rotation.z = Math.PI / 2; shaft.position.x = 0.17; S.kBit.add(shaft);
  for (const x of [0.22, 0.3]) { const tooth = rbox(0.04, 0.09, 0.04, MAT.gold, 0.01); tooth.position.set(x, -0.05, 0); S.kBit.add(tooth); }
  S.tecL = pill2('CON EL GRADO', 'INGENIERO TÉCNICO AERONÁUTICO', '#9fd0ff', 1.0); Z.add(S.tecL);
  S.ingL = pill2('CON EL MÁSTER HABILITANTE', 'INGENIERO AERONÁUTICO', '#ffd76a', 0.86); Z.add(S.ingL);
  S.years = []; for (let i = 0; i < 6; i++) { const c = rbox(0.3, 0.3, 0.3, plastic(i < 4 ? PL.blue : PL.yellow, 0.18), 0.06); Z.add(c); S.years.push(c);
    const f = facePlane(canvasTex(256, 256, (q, w, h) => { q.fillStyle = '#ffffff'; q.font = '900 150px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(String(i + 1), w / 2, h / 2 + 8); }), 0.24, 0.24); f.position.z = 0.151; c.add(f);
    const f2 = f.clone(); f2.rotation.y = Math.PI / 2; f2.position.set(0.151, 0, 0); c.add(f2); }
  S.yGr = pill('GRADO · 4 AÑOS', '#9fd0ff', 'rgba(16,20,30,.9)', 1.0, 62); Z.add(S.yGr);
  S.yMa = pill('MÁSTER · 2', '#ffd76a', 'rgba(16,20,30,.9)', 0.8, 62); Z.add(S.yMa);
  S.ySix = pill('6 AÑOS', '#ffffff', 'rgba(255,170,30,.92)', 0.8, 74); Z.add(S.ySix);
  const bm = new THREE.Shape(); bm.moveTo(-0.22, 0.34); bm.lineTo(0.22, 0.34); bm.lineTo(0.22, -0.34); bm.lineTo(0, -0.17); bm.lineTo(-0.22, -0.34); bm.closePath();
  S.bmark = new THREE.Mesh(new THREE.ExtrudeGeometry(bm, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 4 }), plastic(PL.yellow, 0.18)); S.bmark.geometry.center(); S.bmark.castShadow = true; Z.add(S.bmark);
  const bub = new THREE.Shape(); { const w = 0.8, h = 0.5, r = 0.18; bub.moveTo(-w / 2 + r, -h / 2); bub.lineTo(-0.05, -h / 2); bub.lineTo(-0.2, -h / 2 - 0.18); bub.lineTo(-0.2, -h / 2); bub.lineTo(-w / 2 + r, -h / 2);
    bub.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + r); bub.lineTo(-w / 2, h / 2 - r); bub.quadraticCurveTo(-w / 2, h / 2, -w / 2 + r, h / 2); bub.lineTo(w / 2 - r, h / 2); bub.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r); bub.lineTo(w / 2, -h / 2 + r); bub.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2); bub.lineTo(-0.05, -h / 2); }
  S.bubble = new THREE.Mesh(new THREE.ExtrudeGeometry(bub, { depth: 0.06, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 4 }), plastic(0xffffff, 0.2)); S.bubble.castShadow = true; Z.add(S.bubble);
  S.dots = [0, 1, 2].map(i => { const s = sph(0.05, plastic(PL.blue, 0.2)); s.position.set(-0.2 + i * 0.2, 0, 0.1); S.bubble.add(s); return s; });
  // el avión del gancho: nace del avión de papel y se va (y luego se convierte en las alas)
  S.hookJet = makeJet(); S.hookJet.scale.setScalar(2.4); scene.add(S.hookJet);
}
const ZL = (x, y, z) => S.gradZ.localToWorld(v3(x, y, z));      // local de la zona → mundo
const CHEST = v3(0.27, 1.5, 0), HOVER = v3(0.64, 1.6, 0);        // alas puestas (sobre el pecho) y flotando a un palmo delante
const BIR0 = v3(0, 3.3, 0);
// oscilaciones «de bucle»: frecuencia redondeada para que en t = END estén igual que en t = 0 (el último fotograma enlaza con el primero)
const lfreq = f => 2 * Math.PI * Math.max(1, Math.round(f * END / (2 * Math.PI))) / END, lsin = (t, f) => Math.sin(t * lfreq(f));
function birSpin(t) { return t * lfreq(2.6); }
// trayectoria del avión de papel → avión de verdad (mundo): sale del birrete, cruza delante de la cámara y se aleja sobre las nubes
function hookPath(t) {
  const T = [K.aero0 - 0.2, K.aero0 + 0.28, K.aero0 + 0.62, K.acabas + 0.15, K.acabas + 0.75], P = [ZL(0, 3.3, 0), v3(1.3, 3.46, -0.55), v3(4.0, 3.72, -2.9), v3(9.2, 4.3, -10.2), v3(12, 4.8, -18)];
  const x = mono(t, T, P.map(p => p.x)), y = mono(t, T, P.map(p => p.y)), z = mono(t, T, P.map(p => p.z));
  return v3(x, y, z);
}
function gradAt(t) {
  const Z = S.gradZ, J = S.grad.userData.J, tEnd = END, tToss = K.te2 + 0.12;
  const tLand = K.master1 + 0.42, up = env(t, -1, K.y1 + 0.2, 0.01, 0.5), cheer = env(t, tLand, K.regulada + 0.3, 0.12, 0.5), toss = env(t, K.guardalo + 0.1, tEnd + 1, 0.4, 0.01), look = env(t, K.para14 - 0.3, K.si3 + 0.2, 0.4, 0.4);
  J.shR.rotation.z = lerp(0.18, 2.75, Math.max(up, cheer)); J.elR.rotation.z = 0.25 * Math.max(up, cheer);
  J.shL.rotation.z = -lerp(0.18, 2.6, Math.max(up * 0.85, cheer));
  J.shL.rotation.x = -1.0 * toss * (t < tToss + 0.25 ? 1 : 1 - clamp((t - tToss - 0.25) / 0.4)) - (t > tToss && t < tToss + 0.3 ? 1.2 * Math.sin((t - tToss) / 0.3 * Math.PI) : 0);
  J.elL.rotation.x = -0.9 * toss;
  J.neck.rotation.z = 0.12 * up - 0.18 * env(t, K.y1, K.al1, 0.3, 0.3) + 0.55 * look;
  S.grad.updateMatrixWorld(true); const handL = new THREE.Vector3(); J.hL.getWorldPosition(handL); Z.worldToLocal(handL);
  // ---- birrete → avión de papel (gancho) y birrete lanzado al final (bucle)
  const morph = clamp((t - (K.aero0 - 0.15)) / 0.4), endFly = t > K.guardalo + 0.2;
  let bk = 0;
  if (t < K.aero0 + 0.3) { bk = 1 - sm5(clamp((morph - 0.2) / 0.45)); const sq = Math.sin(clamp(morph / 0.5) * Math.PI) * 0.45;
    S.bir.position.copy(BIR0).add(v3(0, 0.05 * lsin(t, 3), 0)); S.bir.rotation.set(0.35 + 0.15 * lsin(t, 2.2), birSpin(t), 0.2 * lsin(t, 1.7)); S.bir.scale.set(0.34 * (1 + sq) * bk, 0.34 * (1 - sq * 1.2) * bk + 0.0001, 0.34 * (1 + sq) * bk);
  } else if (endFly) {
    const u = clamp((t - tToss) / (tEnd - tToss)), e = sm5(u), hand = handL.clone().add(v3(0.05, 0.06, 0));
    bk = clamp((t - K.guardalo - 0.2) / 0.25);
    const p = hand.clone().lerp(BIR0.clone().add(v3(0, 0.05 * lsin(t, 3), 0)), e); p.y += 0.5 * Math.sin(Math.PI * e) * (1 - e);
    S.bir.position.copy(t < tToss ? hand.clone().add(v3(0, 0.03 * Math.sin(t * 4), 0)) : p);
    const spinEnd = birSpin(t) - (1 - e) * 6.0;
    S.bir.rotation.set(t < tToss ? 0.2 : lerp(0.2, 0.35 + 0.15 * lsin(t, 2.2), e), t < tToss ? 0.4 : spinEnd + (1 - e) * 6.0, t < tToss ? 0 : 0.2 * lsin(t, 1.7) * e);
    S.bir.scale.setScalar(0.34 * Math.max(0.001, bk));
  }
  S.bir.visible = bk > 0.003;
  // ---- avión de papel → avión de verdad → alas
  const pk = sm5(clamp((morph - 0.25) / 0.4)), tJet = K.aero0 + 0.42, jk = clamp((t - tJet) / 0.3);
  const hp = hookPath(t), hd = hookPath(t + 0.02).sub(hookPath(t - 0.02)).normalize();
  S.paper.visible = pk > 0.01 && jk < 1; if (S.paper.visible) { S.paper.position.copy(hp); S.paper.quaternion.setFromUnitVectors(v3(1, 0, 0), hd); S.paper.rotateX(0.5 * Math.sin(t * 6)); S.paper.scale.setScalar(0.42 * pk * (1 - jk) + 0.0001); }
  const jv = jk > 0.001 && t < K.acabas + 0.35; S.hookJet.visible = jv;
  if (jv) { S.hookJet.position.copy(hp); S.hookJet.quaternion.setFromUnitVectors(v3(1, 0, 0), hd); S.hookJet.rotateX(-0.45 * Math.sin(clamp((t - tJet) / 1.2) * Math.PI)); S.hookJet.scale.setScalar(2.4 * Math.max(0.0001, eo(jk))); S.hookJet.userData.update(t, { halo: 0.06 }); }
  // ---- alas: vuelan desde el avión, bajan hacia el pecho… y se quedan a un palmo (barrera); con el máster, encajan
  const tIn = K.acabas + 0.25, bb = pop(t, tIn, 0.45);
  let bp = HOVER.clone(), bs = bb, brx = 0, brz = 0;
  if (t < K.y1 + 0.3) { const u = sm5(clamp((t - tIn) / (K.y1 + 0.3 - tIn))); bp = Z.worldToLocal(hookPath(K.acabas + 0.3)).lerp(HOVER.clone().add(v3(0, 0.6, 0)), u); }
  else { const u = clamp((t - (K.y1 + 0.3)) / (K.no1 + 0.08 - (K.y1 + 0.3))); bp = HOVER.clone().add(v3(0, 0.6, 0)).lerp(HOVER, sm5(u));
    const b1 = Math.max(0, t - (K.no1 + 0.08)), b2 = Math.max(0, t - (K.aero1 + 0.02));
    bp.y += 0.12 * Math.exp(-b1 * 7) * Math.abs(Math.sin(b1 * 16)) * (b1 > 0 ? 1 : 0) + 0.08 * Math.exp(-b2 * 7) * Math.abs(Math.sin(b2 * 16)) * (b2 > 0 ? 1 : 0);
    brz = 0.08 * Math.sin(t * 5.2) * Math.exp(-Math.max(0, t - K.no1) * 0.6) + 0.025 * Math.sin(t * 2.3); brx = 0.04 * Math.sin(t * 3.7); }
  if (t > tLand - 0.22) { const u = clamp((t - (tLand - 0.22)) / 0.22); bp = bp.clone().lerp(CHEST, u * u); brz *= 1 - u; brx *= 1 - u; if (t > tLand) { const q = t - tLand; bs = 1 + 0.12 * Math.exp(-q * 9) * Math.sin(q * 30); } }
  if (t > tLand) { bp = CHEST.clone(); brx = 0; brz = 0; }
  S.badge.position.copy(bp); S.badge.rotation.set(brx, Math.PI / 2 + (t < tIn + 0.4 ? (1 - clamp((t - tIn) / 0.4)) * 6.0 : 0), brz); S.badge.scale.setScalar(0.3 * Math.max(0.0001, bs));
  S.badge.visible = t > tIn;
  S.badge.userData.mt.material.map = t > K.master1 + 0.3 ? S.badgeMaster : S.badgeQ;
  // chispas: nace el avión, y cuando encajan las alas
  if (t > tJet - 0.05 && t < tJet + 0.8) { S.flashS.visible = true; burst(S.flashS, Z.worldToLocal(hookPath(tJet)), t, tJet, 0.9, 0.7, false, 1.2); S.flashS.material.opacity = clamp(1 - (t - tJet) / 0.7); }
  else if (t > tLand - 0.05 && t < tLand + 0.9) { S.flashS.visible = true; burst(S.flashS, CHEST.clone().add(v3(0.1, 0.05, 0)), t, tLand, 1.0, 0.8, false, 2.5); S.flashS.material.opacity = clamp(1 - (t - tLand) / 0.8); }
  else S.flashS.visible = false;
  // ---- barrera: anillo rojo y ✕ al chocar
  const hit = Math.max(Math.exp(-Math.max(0, t - K.no1 - 0.08) * 5) * (t > K.no1 + 0.08 ? 1 : 0), Math.exp(-Math.max(0, t - K.aero1) * 5) * (t > K.aero1 ? 1 : 0)) * (t < tLand - 0.3 ? 1 : 0);
  S.bar.visible = hit > 0.02; S.bar.position.copy(HOVER).add(v3(-0.12, 0, 0)); S.bar.rotation.set(0, 0, Math.PI / 2); S.bar.scale.setScalar(0.9 + (1 - hit) * 0.6); S.bar.material.opacity = hit; S.bar.material.color.setRGB(2.4, 0.35, 0.45);
  lookLab(S.barX, hit * 1.2, HOVER.clone().add(v3(-0.05, -0.28, 0.0))); S.barX.scale.setScalar(0.8 + 0.4 * hit);
  // ---- interrogación en el hueco; el bloque «MÁSTER» sale de ella y entra en las alas
  const gap = CHEST.clone().lerp(HOVER, 0.5).add(v3(0.06, -0.06, 0));
  const qk = pop(t, K.que1, 0.4) * (1 - clamp((t - K.master1 - 0.02) / 0.12));
  S.q.visible = qk > 0.01; S.q.position.copy(gap); S.q.rotation.y = 0.3 * Math.sin(t * 1.4) + Math.PI / 2 + 0.45; S.q.scale.setScalar(Math.max(0.0001, qk * 0.5));
  const mk = pop(t, K.master1, 0.3) * (1 - clamp((t - (K.master1 + 0.38)) / 0.08)), mu = sm5(clamp((t - (K.master1 + 0.22)) / 0.18));
  S.mblock.visible = mk > 0.01; S.mblock.scale.setScalar(Math.max(0.001, mk) * 0.45); S.mblock.position.copy(gap.clone().lerp(HOVER, mu)); S.mblock.rotation.set(0, Math.PI / 2 + 0.2 * (1 - mu), 0);
  // ---- confeti (gancho, aterrizaje y final)
  const cA = env(t, -1, K.al1 + 0.6, 0.01, 0.6), cB = env(t, tLand, K.regulada + 0.8, 0.05, 0.6), cC = env(t, K.cuentame - 0.3, tEnd - 0.35, 0.4, 0.5);
  const ck = Math.max(cA * 0.0, cB, cC); S.conf.visible = ck > 0.01;
  if (S.conf.visible) for (let i = 0; i < 240; i++) {
    const base = i < 120 ? 0 : tLand, life = 3.2, tt = ((t - base) + hash(i) * life) % life, x = (hash(i * 3) - 0.5) * 3.2, z = (hash(i * 5) - 0.5) * 3.2;
    _p.set(x + 0.2 * Math.sin(tt * 2 + i), 4.4 - tt * 1.25, z + 0.2 * Math.cos(tt * 1.7 + i));
    _e.set(tt * 4 + i, tt * 3 + i * 0.7, tt * 2); _q.setFromEuler(_e); _s.setScalar(ck * (0.7 + hash(i * 7) * 0.8)); _m4.compose(_p, _q, _s); S.conf.setMatrixAt(i, _m4);
  }
  S.conf.instanceMatrix.needsUpdate = true;
  const wv = clamp((t - tLand) / 0.9); S.wave.visible = t > tLand && wv < 1; S.wave.scale.setScalar(1 + wv * 3.5); S.wave.material.opacity = (1 - wv) * 0.9; S.wave.material.color.setRGB(1.4, 2.2, 2.6);
  // ---- sello, candado y llave, títulos, años, marcapáginas y bocadillo
  const sk = pop(t, K.profesion, 0.32) * (1 - clamp((t - (K.grado - 0.25)) / 0.3));
  show(S.seal, sk * 0.42); S.seal.position.set(0.8, 2.5 + 0.7 * (1 - eo(clamp((t - K.profesion) / 0.2))), 0.0); S.seal.rotation.set(0, Math.PI / 2 - 0.3, 0);
  lookLab(S.sealL, env(t, K.regulada, K.grado - 0.15, 0.2, 0.3), v3(0.95, 2.13, 0.0)); S.sealL.scale.setScalar(0.62);
  const lk = pop(t, K.grado - 0.1, 0.32) * (1 - clamp((t - (K.en13 - 0.1)) / 0.3));
  show(S.lock, lk * 0.5); S.lock.position.set(1.0, 1.1, -0.2); S.lock.rotation.set(0, Math.PI / 2 - 0.3, 0);
  const open = sm5(clamp((t - K.habilitante - 0.12) / 0.25)); S.shackle.position.y = 0.25 + 0.14 * open; S.shackle.rotation.y = 1.2 * open;
  const g1 = pop(t, K.grado, 0.3), m1 = pop(t, K.master2, 0.3), join = sm5(clamp((t - (K.master2 + 0.15)) / 0.25)), ins = sm5(clamp((t - (K.habilitante - 0.25)) / 0.3));
  S.keyG.visible = g1 > 0.01 && t < K.en13 + 0.1; S.keyG.rotation.order = 'YXZ'; S.keyG.scale.setScalar(0.45); S.keyG.position.set(1.0, 1.1, lerp(0.5, 0.3, ins)); S.keyG.rotation.set(Math.PI / 2 * clamp((t - K.habilitante) / 0.18), Math.PI / 2, 0);
  S.kGrado.scale.setScalar(Math.max(0.001, g1)); S.kGrado.position.set(lerp(-0.42, -0.26, join), 0, 0);
  S.kMaster.scale.setScalar(Math.max(0.001, m1)); S.kMaster.position.set(lerp(0.42, 0.26, join), lerp(0.25, 0, join), 0);
  S.kBit.visible = join > 0.5; S.kBit.position.x = 0.5; S.kBit.scale.setScalar(Math.max(0.001, clamp((join - 0.5) * 2)));
  lookLab(S.tecL, env(t, K.grado + 0.25, K.para13 - 0.05, 0.25, 0.25), v3(1.15, 0.66, 0.0)); S.tecL.scale.setScalar(0.62);
  lookLab(S.ingL, env(t, K.ingeniero13b - 0.1, K.en13 - 0.1, 0.25, 0.25), v3(1.15, 0.66, 0.0)); S.ingL.scale.setScalar(0.62);
  const yr = [K.y4, K.y4 + 0.09, K.y4 + 0.18, K.y4 + 0.27, K.dos - 0.04, K.dos + 0.06], six = sm5(clamp((t - K.seis) / 0.45));
  S.years.forEach((c, i) => { const k = pop(t, yr[i], 0.3) * (t < K.si3 ? 1 : 1 - clamp((t - K.si3) / 0.3));
    const row = v3(1.18, 0.31 + i * 0.125, 0.5 - i * 0.2), ring = v3(Math.cos(i / 6 * Math.PI * 2 + t * 0.6) * 1.15, 0.35 + 0.08 * Math.sin(t * 2 + i), Math.sin(i / 6 * Math.PI * 2 + t * 0.6) * 1.15);
    c.visible = k > 0.01; c.scale.setScalar(Math.max(0.001, k) * lerp(0.55, 0.62, six)); c.position.copy(row.lerp(ring, six)); c.position.y += Math.sin(Math.PI * six) * 0.5; c.rotation.set(0, Math.PI / 2 - 0.3 + six * (i / 6 * Math.PI * 2), 0); });
  lookLab(S.yGr, env(t, K.y4 + 0.2, K.seis - 0.05, 0.2, 0.2), v3(1.25, 0.78, 0.05)); S.yGr.scale.setScalar(0.62);
  lookLab(S.yMa, env(t, K.dos + 0.1, K.seis - 0.05, 0.2, 0.2), v3(1.25, 1.2, -0.45)); S.yMa.scale.setScalar(0.62);
  lookLab(S.ySix, env(t, K.seis + 0.25, K.para14 + 0.4, 0.2, 0.3), v3(1.05, 1.18, 0.28)); S.ySix.scale.setScalar(0.85 + 0.15 * pop(t, K.seis + 0.25, 0.3));
  const bmk = pop(t, K.guardalo, 0.35) * (1 - clamp((t - K.te2) / 0.3));
  show(S.bmark, bmk * 0.42); S.bmark.position.set(0.9, 1.95 + 0.5 * (1 - clamp((t - K.guardalo) / 0.25)), -0.2); S.bmark.rotation.set(0, Math.PI / 2 - 0.3, 0.12 * Math.sin(t * 3));
  const bbk = pop(t, K.cuentame, 0.35) * (1 - clamp((t - K.te2 - 0.25) / 0.3));
  show(S.bubble, bbk * 0.5); S.bubble.position.set(0.8, 2.42, 0.32); S.bubble.rotation.set(0, Math.PI / 2 - 0.3, 0);
  S.dots.forEach((s, i) => { s.position.y = 0.05 * Math.max(0, Math.sin(t * 9 - i * 0.9)); });
}
