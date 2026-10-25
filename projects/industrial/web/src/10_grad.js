
// ---------------------------------------------------------------- 0 · el graduado: birrete → casco que no llega (gancho), «¿qué te falta?», y la respuesta (el máster) al final
// Zona «grad»: al final de la línea, girada 180°: en coordenadas locales el graduado mira hacia +x (= hacia la línea, -x del mundo).
const GX = 78;
function buildGrad() {
  const Z = zone('grad', GX); Z.rotation.y = Math.PI;
  const ped = cyl(0.95, 1.0, 0.22, plastic(0x161a24, 0.3), 64); ped.position.y = 0.11; Z.add(ped); S.ped = ped;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.975, 0.018, 8, 96), glowM(0x47d6ff, 3)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.205; ped.add(rim); rim.position.y = 0.1;
  // graduado: maniquí blanco con toga azul marino y estola amarilla
  const body = plastic(0xf1f3f7, 0.18), d = makeDoll(body); d.scale.setScalar(1.6); d.position.y = 0.22; d.rotation.y = Math.PI / 2; Z.add(d); S.grad = d;
  const gown = new THREE.Mesh(new THREE.LatheGeometry([v3(0.001, 0.88, 0), v3(0.1, 0.875, 0), v3(0.155, 0.84, 0), v3(0.17, 0.7, 0), v3(0.19, 0.4, 0), v3(0.23, 0.1, 0), v3(0.245, 0.04, 0), v3(0.001, 0.04, 0)].reverse().map(p => new THREE.Vector2(p.x, p.y)), 48), plastic(PL.navy, 0.24));
  gown.castShadow = true; d.add(gown);
  for (const s of [-1, 1]) { const st = rbox(0.05, 0.36, 0.012, plastic(PL.yellow, 0.2), 0.01); st.position.set(s * 0.055, 0.68, 0.135); st.rotation.x = 0.12; d.add(st); }
  const J = d.userData.J;
  for (const sd of ['shL', 'shR', 'elL', 'elR']) J[sd].children.forEach(o => { if (o.isMesh) o.material = plastic(PL.navy, 0.24); });   // mangas de la toga
  S.dip = diploma(); S.dip.scale.setScalar(0.9); J.hR.add(S.dip); S.dip.position.set(0, -0.02, 0.02);
  // birrete (gancho y final) y casco
  S.bir = birrete(); S.bir.scale.setScalar(0.34); Z.add(S.bir);
  S.hat = hardHat(); S.hat.scale.setScalar(0.3); Z.add(S.hat);
  S.flashS = sparks(Z, 90, 0xfff0b0, 0.07);
  S.conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3 }), 240);
  S.conf.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(240 * 3), 3); S.conf.frustumCulled = false; Z.add(S.conf);
  for (let i = 0; i < 240; i++) S.conf.setColorAt(i, _c.set([PL.yellow, PL.pink, PL.sky, PL.green, PL.orange, 0xffffff][i % 6]));
  // barrera invisible: anillo rojo que se enciende cuando el casco choca
  S.bar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff3b4e, transparent: true, toneMapped: false })); S.bar.rotation.x = Math.PI / 2; Z.add(S.bar);
  S.barX = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (q, w, h) => { q.strokeStyle = '#ff4d5e'; q.lineWidth = 46; q.lineCap = 'round'; q.beginPath(); q.moveTo(50, 50); q.lineTo(206, 206); q.moveTo(206, 50); q.lineTo(50, 206); q.stroke(); }), transparent: true, depthWrite: false, toneMapped: false })); S.barX.renderOrder = 9; Z.add(S.barX);
  S.q = qmark(new THREE.MeshPhysicalMaterial({ color: 0xffc21a, emissive: 0xff9a00, emissiveIntensity: 0.55, roughness: 0.2, clearcoat: 1 })); S.q.scale.setScalar(0.42); Z.add(S.q);
  // bloque «MÁSTER» (sale de la interrogación y entra en el casco)
  S.mblock = rbox(0.62, 0.2, 0.2, plastic(PL.yellow, 0.18), 0.05); Z.add(S.mblock);
  const mf = facePlane(canvasTex(512, 160, (q, w, h) => { q.fillStyle = '#10131a'; q.font = '900 104px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('MÁSTER', w / 2, h / 2 + 6); }), 0.56, 0.175); mf.position.z = 0.101; S.mblock.add(mf);
  const mb = mf.clone(); mb.position.z = -0.101; mb.rotation.y = Math.PI; S.mblock.add(mb);
  S.wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 96), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })); S.wave.rotation.x = -Math.PI / 2; S.wave.position.y = 0.03; Z.add(S.wave);
  // sello «profesión regulada»
  const seal = new THREE.Group(); Z.add(seal); S.seal = seal;
  const sd2 = cyl(0.42, 0.42, 0.08, MAT.gold, 48); sd2.rotation.x = Math.PI / 2; seal.add(sd2);
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, tk = rbox(0.07, 0.07, 0.07, MAT.gold, 0.02); tk.position.set(Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0); tk.rotation.z = a + Math.PI / 4; seal.add(tk); }
  const sf = facePlane(canvasTex(512, 512, (q, w, h) => { q.fillStyle = '#8a5a12'; q.beginPath(); q.arc(256, 256, 214, 0, 7); q.lineWidth = 14; q.strokeStyle = '#8a5a12'; q.stroke();
    q.font = '900 170px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('★', 256, 250); }), 0.8, 0.8); sf.position.z = 0.045; seal.add(sf);
  for (const s of [-1, 1]) { const rb = rbox(0.14, 0.5, 0.02, plastic(PL.red, 0.25), 0.01); rb.position.set(s * 0.14, -0.5, -0.02); rb.rotation.z = s * 0.25; seal.add(rb); }
  S.sealL = pill('PROFESIÓN REGULADA', '#ffd76a', 'rgba(16,20,30,.9)', 1.25, 64); Z.add(S.sealL);
  // candado y llave (grado + máster = llave que habilita)
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
  // años: 4 (grado) + 2 (máster)
  S.years = []; for (let i = 0; i < 6; i++) { const c = rbox(0.3, 0.3, 0.3, plastic(i < 4 ? PL.blue : PL.yellow, 0.18), 0.06); Z.add(c); S.years.push(c);
    const f = facePlane(canvasTex(256, 256, (q, w, h) => { q.fillStyle = '#ffffff'; q.font = '900 150px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(String(i + 1), w / 2, h / 2 + 8); }), 0.24, 0.24); f.position.z = 0.151; c.add(f);
    const f2 = f.clone(); f2.rotation.y = Math.PI / 2; f2.position.set(0.151, 0, 0); c.add(f2); }
  S.yGr = pill('GRADO · 4 AÑOS', '#9fd0ff', 'rgba(16,20,30,.9)', 1.0, 62); Z.add(S.yGr);
  S.yMa = pill('MÁSTER · 2', '#ffd76a', 'rgba(16,20,30,.9)', 0.8, 62); Z.add(S.yMa);
  S.ySix = pill('6 AÑOS', '#ffffff', 'rgba(255,170,30,.92)', 0.8, 74); Z.add(S.ySix);
  // marcapáginas («guárdalo») y bocadillo
  const bm = new THREE.Shape(); bm.moveTo(-0.22, 0.34); bm.lineTo(0.22, 0.34); bm.lineTo(0.22, -0.34); bm.lineTo(0, -0.17); bm.lineTo(-0.22, -0.34); bm.closePath();
  S.bmark = new THREE.Mesh(new THREE.ExtrudeGeometry(bm, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 4 }), plastic(PL.yellow, 0.18)); S.bmark.geometry.center(); S.bmark.castShadow = true; Z.add(S.bmark);
  const bub = new THREE.Shape(); { const w = 0.8, h = 0.5, r = 0.18; bub.moveTo(-w / 2 + r, -h / 2); bub.lineTo(-0.05, -h / 2); bub.lineTo(-0.2, -h / 2 - 0.18); bub.lineTo(-0.2, -h / 2); bub.lineTo(-w / 2 + r, -h / 2);
    bub.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + r); bub.lineTo(-w / 2, h / 2 - r); bub.quadraticCurveTo(-w / 2, h / 2, -w / 2 + r, h / 2); bub.lineTo(w / 2 - r, h / 2); bub.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r); bub.lineTo(w / 2, -h / 2 + r); bub.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2); bub.lineTo(-0.05, -h / 2); }
  S.bubble = new THREE.Mesh(new THREE.ExtrudeGeometry(bub, { depth: 0.06, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 4 }), plastic(0xffffff, 0.2)); S.bubble.castShadow = true; Z.add(S.bubble);
  S.dots = [0, 1, 2].map(i => { const s = sph(0.05, plastic(PL.blue, 0.2)); s.position.set(-0.2 + i * 0.2, 0, 0.1); S.bubble.add(s); return s; });
  S.gradZ = Z;
}
const HEAD_Y = () => 0.22 + 1.6 * 1.07;        // altura de la coronilla del graduado (local)
const HAT_Y = 0.22 + 1.6 * 1.0;                 // el casco puesto: el ala a la altura de la frente
const BIR0 = v3(0, 3.3, 0), CAM0 = [v3(1.8, 3.2, 0.5), v3(0, 3.26, 0.04), 34];    // primer (y último) fotograma: el birrete girando en el aire
function birSpin(t) { return t * 2.6; }
function gradAt(t) {
  const Z = S.gradZ, J = S.grad.userData.J, H0 = v3(0, HAT_Y, 0);
  const tEnd = END, tToss = K.te2 + 0.12;
  // ---- graduado: brazos (lanza el birrete, levanta el diploma, dirige la fábrica)
  const tLand = K.master1 + 0.42, up = env(t, -1, K.y1 + 0.2, 0.01, 0.5), dir = env(t, K.dirigiendo - 0.3, K.falta2 + 0.2, 0.4, 0.5), cheer = env(t, tLand, K.regulada + 0.3, 0.12, 0.5), toss = env(t, K.guardalo + 0.1, tEnd + 1, 0.4, 0.01);
  J.shR.rotation.z = lerp(0.18, 2.75, Math.max(up, cheer)); J.shR.rotation.x = -1.35 * dir;
  J.elR.rotation.z = 0.25 * Math.max(up, cheer);
  J.shL.rotation.z = -lerp(0.18, 2.6, Math.max(up * 0.85, cheer));
  J.shL.rotation.x = -1.0 * toss * (t < tToss + 0.25 ? 1 : 1 - clamp((t - tToss - 0.25) / 0.4)) - (t > tToss && t < tToss + 0.3 ? 1.2 * Math.sin((t - tToss) / 0.3 * Math.PI) : 0);
  J.elL.rotation.x = -0.9 * toss;
  J.neck.rotation.z = 0.12 * up - 0.18 * env(t, K.y1, K.al1, 0.3, 0.3);
  S.grad.updateMatrixWorld(true); const handL = new THREE.Vector3(); J.hL.getWorldPosition(handL); Z.worldToLocal(handL);
  // ---- birrete: vuela al principio (se transforma en casco) y vuelve a volar al final (bucle)
  const morph = clamp((t - (K.industrial1 - 0.12)) / 0.42), endFly = t > K.guardalo + 0.2;
  let bk = 0;
  if (t < K.industrial1 + 0.4) {
    bk = 1 - sm5(clamp((morph - 0.35) / 0.4));
    const sq = Math.sin(clamp(morph / 0.5) * Math.PI) * 0.45;
    S.bir.position.copy(BIR0).add(v3(0, 0.05 * Math.sin(t * 3), 0));
    S.bir.rotation.set(0.35 + 0.15 * Math.sin(t * 2.2), birSpin(t), 0.2 * Math.sin(t * 1.7));
    S.bir.scale.set(0.34 * (1 + sq), 0.34 * (1 - sq * 1.2), 0.34 * (1 + sq));
  } else if (endFly) {
    // en la mano izquierda y lanzado: termina exactamente como empezó el vídeo
    const u = clamp((t - tToss) / (tEnd - tToss)), e = sm5(u), hand = handL.clone().add(v3(0.05, 0.06, 0));
    bk = clamp((t - K.guardalo - 0.2) / 0.25);
    const p = hand.clone().lerp(BIR0, e); p.y += 0.5 * Math.sin(Math.PI * e) * (1 - e);
    S.bir.position.copy(t < tToss ? hand.clone().add(v3(0, 0.03 * Math.sin(t * 4), 0)) : p);
    const spinEnd = birSpin(tEnd) - (tEnd - t) * 2.6 - (1 - e) * 6.0;
    S.bir.rotation.set(t < tToss ? 0.2 : lerp(0.2, 0.35 + 0.15 * Math.sin(t * 2.2), e), t < tToss ? 0.4 : spinEnd + (1 - e) * 6.0, t < tToss ? 0 : 0.2 * Math.sin(t * 1.7) * e);
    S.bir.scale.setScalar(0.34 * Math.max(0.001, bk));
  }
  S.bir.visible = bk > 0.003;
  // ---- casco: nace del birrete, baja y se queda flotando (barrera), luego encaja con el máster
  const hk = sm5(clamp((morph - 0.3) / 0.45)), born = pop(t, K.industrial1 + 0.02, 0.45);
  const hover = H0.clone().add(v3(0, 0.36, 0));
  let hp = BIR0.clone(), hs = born, hrx = 0, hrz = 0;
  if (t > K.y1 - 0.1) {
    const u = clamp((t - (K.y1 - 0.1)) / (K.no1 + 0.08 - (K.y1 - 0.1)));
    hp = BIR0.clone().lerp(hover, sm5(u));
    const b1 = Math.max(0, t - (K.no1 + 0.08)), b2 = Math.max(0, t - (K.industrial2 + 0.02));
    hp.y += 0.12 * Math.exp(-b1 * 7) * Math.abs(Math.sin(b1 * 16)) * (b1 > 0 ? 1 : 0) + 0.08 * Math.exp(-b2 * 7) * Math.abs(Math.sin(b2 * 16)) * (b2 > 0 ? 1 : 0);
    hrz = 0.08 * Math.sin(t * 5.2) * Math.exp(-Math.max(0, t - K.no1) * 0.6) + 0.025 * Math.sin(t * 2.3); hrx = 0.04 * Math.sin(t * 3.7);
  }
  if (t > tLand - 0.22) {      // encaja: baja del todo y aplasta un poco
    const u = clamp((t - (tLand - 0.22)) / 0.22);
    hp = hp.clone().lerp(H0.clone().add(v3(0, -0.005, 0)), u * u);
    hrz *= 1 - u; hrx *= 1 - u;
    if (t > tLand) { const q = t - tLand; hs = 1 + 0.12 * Math.exp(-q * 9) * Math.sin(q * 30); }
  }
  if (t > tLand) { hp = H0.clone(); hrx = 0; hrz = 0; }
  S.hat.position.copy(hp); S.hat.rotation.set(hrx, t < K.y1 - 0.1 ? birSpin(t) * 0.6 : 0, hrz);
  S.hat.scale.set(0.3 * hs * (t > tLand && t < tLand + 0.3 ? 1 + 0.06 * Math.exp(-(t - tLand) * 9) : 1), 0.3 * hs * (t > tLand && t < tLand + 0.3 ? 1 - 0.1 * Math.exp(-(t - tLand) * 9) : 1), 0.3 * hs);
  S.hat.visible = hs > 0.003 && hk > 0.001 || t > K.industrial1 + 0.1;
  S.hat.userData.sticker.visible = t > K.master1 + 0.3;
  // chispas de la transformación y del aterrizaje
  if (t > K.industrial1 - 0.1 && t < K.industrial1 + 0.9) { S.flashS.visible = true; burst(S.flashS, BIR0, t, K.industrial1 + 0.08, 0.9, 0.7, false, 1.2); S.flashS.material.opacity = clamp(1 - (t - K.industrial1 - 0.08) / 0.7); }
  else if (t > tLand - 0.05 && t < tLand + 0.9) { S.flashS.visible = true; burst(S.flashS, H0.clone().add(v3(0, 0.15, 0)), t, tLand, 1.0, 0.8, false, 2.5); S.flashS.material.opacity = clamp(1 - (t - tLand) / 0.8); }
  else S.flashS.visible = false;
  // ---- barrera: anillo rojo y ✕ al chocar
  const hit = Math.max(Math.exp(-Math.max(0, t - K.no1 - 0.08) * 5) * (t > K.no1 + 0.08 ? 1 : 0), Math.exp(-Math.max(0, t - K.industrial2) * 5) * (t > K.industrial2 ? 1 : 0)) * (t < tLand - 0.3 ? 1 : 0);
  S.bar.visible = hit > 0.02; S.bar.position.copy(hover).add(v3(0, -0.05, 0)); S.bar.scale.setScalar(0.75 + (1 - hit) * 0.6); S.bar.material.opacity = hit; S.bar.material.color.setRGB(2.4, 0.35, 0.45);
  lookLab(S.barX, hit * 1.2, hover.clone().add(v3(0.0, -0.2, 0.0))); S.barX.scale.setScalar(0.8 + 0.4 * hit);
  // ---- interrogación en el hueco (desde «qué» hasta que se convierte en el bloque del máster)
  const gap = H0.clone().lerp(hover, 0.55).add(v3(0, 0.02, 0));
  const qk = pop(t, K.que1, 0.4) * (1 - clamp((t - K.master1 - 0.02) / 0.12));
  show(S.q, qk * 0.42); S.q.position.copy(gap); S.q.rotation.y = 0.3 * Math.sin(t * 1.4) + Math.PI / 2 - 0.25; S.q.scale.setScalar(Math.max(0.0001, qk * 0.38));
  // ---- el máster: bloque que nace de la interrogación y sube al casco
  const mk = pop(t, K.master1, 0.3) * (1 - clamp((t - (K.master1 + 0.38)) / 0.08));
  const mu = sm5(clamp((t - (K.master1 + 0.22)) / 0.18));
  S.mblock.visible = mk > 0.01; S.mblock.scale.setScalar(Math.max(0.001, mk) * 0.55); S.mblock.position.copy(gap.clone().lerp(hover.clone().add(v3(0, 0.05, 0)), mu)); S.mblock.rotation.set(0, Math.PI / 2 + 0.2 * (1 - mu), 0);
  // ---- confeti (gancho) y celebración (aterrizaje)
  const cA = env(t, -1, K.al1 + 0.6, 0.01, 0.6), cB = env(t, tLand, K.regulada + 0.8, 0.05, 0.6), cC = env(t, K.cuentame - 0.3, tEnd + 1, 0.4, 0.01);
  const ck = Math.max(cA, cB, cC); S.conf.visible = ck > 0.01;
  if (S.conf.visible) for (let i = 0; i < 240; i++) {
    const base = i < 120 ? 0 : tLand, life = 3.2, tt = ((t - base) + hash(i) * life) % life, x = (hash(i * 3) - 0.5) * 3.2, z = (hash(i * 5) - 0.5) * 3.2;
    _p.set(x + 0.2 * Math.sin(tt * 2 + i), 4.4 - tt * 1.25, z + 0.2 * Math.cos(tt * 1.7 + i));
    _e.set(tt * 4 + i, tt * 3 + i * 0.7, tt * 2); _q.setFromEuler(_e); _s.setScalar(ck * (0.7 + hash(i * 7) * 0.8)); _m4.compose(_p, _q, _s); S.conf.setMatrixAt(i, _m4);
  }
  S.conf.instanceMatrix.needsUpdate = true;
  // ---- onda en el suelo al encajar
  const wv = clamp((t - tLand) / 0.9); S.wave.visible = t > tLand && wv < 1; S.wave.scale.setScalar(1 + wv * 3.5); S.wave.material.opacity = (1 - wv) * 0.9; S.wave.material.color.setRGB(1.4, 2.2, 2.6);
  S.dip.visible = t < K.dirigiendo || t > tLand;
  // ---- sello, candado y llave, años, marcapáginas, bocadillo
  const sk = pop(t, K.profesion, 0.32) * (1 - clamp((t - (K.en3 - 0.2)) / 0.3));
  show(S.seal, sk * 0.42); S.seal.position.set(1.15, 1.25 + 0.6 * (1 - clamp((t - K.profesion) / 0.2)), 0.42); S.seal.rotation.set(0, Math.PI / 2 - 0.35, 0);
  lookLab(S.sealL, env(t, K.regulada, K.ejercerla + 0.45, 0.2, 0.3), v3(1.2, 0.8, 0.12)); S.sealL.scale.setScalar(0.68);
  const lk = pop(t, K.ejercerla, 0.32) * (1 - clamp((t - (K.en3 - 0.1)) / 0.3));
  show(S.lock, lk * 0.62); S.lock.position.set(0.85, 1.3, -0.95); S.lock.rotation.set(0, 0.35, 0);
  const open = sm5(clamp((t - K.habilitante - 0.12) / 0.25)); S.shackle.position.y = 0.25 + 0.14 * open; S.shackle.rotation.y = 1.2 * open;
  const g1 = pop(t, K.grado, 0.3), m1 = pop(t, K.master2, 0.3), join = sm5(clamp((t - (K.master2 + 0.15)) / 0.25)), ins = sm5(clamp((t - (K.habilitante - 0.25)) / 0.3));
  S.keyG.visible = g1 > 0.01 && t < K.en3 + 0.1; S.keyG.rotation.order = 'YXZ'; S.keyG.position.set(0.85 + 0.05 * ins, 1.28, lerp(-0.1, -0.36, ins)); S.keyG.rotation.set(Math.PI / 2 * clamp((t - K.habilitante) / 0.18), Math.PI / 2 + 0.35, 0);
  S.kGrado.scale.setScalar(Math.max(0.001, g1)); S.kGrado.position.set(lerp(-0.42, -0.26, join), 0, 0);
  S.kMaster.scale.setScalar(Math.max(0.001, m1)); S.kMaster.position.set(lerp(0.42, 0.26, join), lerp(0.25, 0, join), 0);
  S.kBit.visible = join > 0.5; S.kBit.position.x = 0.5; S.kBit.scale.setScalar(Math.max(0.001, clamp((join - 0.5) * 2)));
  const yr = [K.y4, K.y4 + 0.09, K.y4 + 0.18, K.y4 + 0.27, K.dos - 0.04, K.dos + 0.06];
  const six = sm5(clamp((t - K.seis) / 0.45));
  S.years.forEach((c, i) => { const k = pop(t, yr[i], 0.3) * (t < K.guardalo ? 1 : 1 - clamp((t - K.guardalo) / 0.3));
    const a = lerp(-0.92, 0.92, i / 5), row = v3(1.2, 0.36, a);
    const ring = v3(Math.cos(i / 6 * Math.PI * 2) * 1.12, 0.15, Math.sin(i / 6 * Math.PI * 2) * 1.12);
    c.visible = k > 0.01; c.scale.setScalar(Math.max(0.001, k)); c.position.copy(row.lerp(ring, six)); c.position.y += Math.sin(Math.PI * six) * 0.5; c.rotation.set(0, Math.PI / 2 + six * (i / 6 * Math.PI * 2), 0); });
  lookLab(S.yGr, env(t, K.y4 + 0.2, K.seis - 0.05, 0.2, 0.2), v3(1.25, 0.76, 0.35)); S.yGr.scale.setScalar(0.7);
  lookLab(S.yMa, env(t, K.dos + 0.1, K.seis - 0.05, 0.2, 0.2), v3(1.25, 0.76, -0.75)); S.yMa.scale.setScalar(0.7);
  lookLab(S.ySix, env(t, K.seis + 0.25, K.si3 - 0.1, 0.2, 0.3), v3(0.9, 0.62, 0.0)); S.ySix.scale.setScalar(0.85 + 0.15 * pop(t, K.seis + 0.25, 0.3));
  S.ped.position.y = 0.11 + 0.0 * six;
  const bmk = pop(t, K.guardalo, 0.35) * (1 - clamp((t - K.te2) / 0.3));
  show(S.bmark, bmk * 0.5); S.bmark.position.set(0.95, 1.62 + 0.5 * (1 - clamp((t - K.guardalo) / 0.25)), -0.8); S.bmark.rotation.set(0, Math.PI / 2 - 0.3, 0.12 * Math.sin(t * 3));
  const bbk = pop(t, K.cuentame, 0.35) * (1 - clamp((t - K.te2 - 0.25) / 0.3));
  show(S.bubble, bbk * 0.62); S.bubble.position.set(0.8, 2.4, 0.5); S.bubble.rotation.set(0, Math.PI / 2 + 0.25, 0);
  S.dots.forEach((s, i) => { s.position.y = 0.05 * Math.max(0, Math.sin(t * 9 - i * 0.9)); });
  // ---- cámara
  return camKeys(t, gradKeys(t), Z);
}
function gradKeys(t) {
  if (t < 30) {
    const ga = H0g(), hov = ga.clone().add(v3(0, 0.36, 0));
    return [
      [0, CAM0[0].toArray(), CAM0[1].toArray(), CAM0[2]],
      [K.industrial1 + 0.35, [1.6, 3.2, 0.45], [0, 3.26, 0.02], 34],
      [K.acabas + 0.5, [4.2, 2.45, 1.35], [0, 2.1, 0], 34],
      [K.y1 + 0.2, [4.7, 2.3, 1.45], [0, 2.0, 0], 34],
      [K.no1 + 0.3, [3.9, 2.25, 1.15], [0, 2.0, 0], 34],
      [K.al1, [3.0, 2.2, 0.9], [0, 2.05, 0], 34],
      [K.que1 + 0.15, [1.9, hov.y - 0.08, 0.5], [0, hov.y - 0.12, 0], 34],
      [K.y2, [1.6, hov.y - 0.08, 0.42], [0, hov.y - 0.12, 0], 34],
    ];
  }
  const hov = H0g().clone().add(v3(0, 0.36, 0));
  return [
    [K.y_q, [-12, 6.0, -2.6], [22, 0.8, 0.3], 40],            // (lo empalma la vista de la fábrica entera, con el graduado de espaldas)
    [K.falta2 + 0.1, [-4.5, 3.6, -4.2], [0, 1.9, 0], 36],
    [K.industrial3 + 0.15, [2.5, 2.4, -1.25], [0, hov.y - 0.1, 0], 34],
    [K.master1 + 0.5, [2.6, 2.3, -1.1], [0, 2.05, 0], 34],
    [K.profesion + 0.2, [5.0, 1.8, -0.4], [0.5, 1.3, 0.35], 34],
    [K.ejercerla + 0.25, [4.6, 1.75, -0.8], [0.5, 1.3, -0.35], 34],
    [K.habilitante + 0.3, [4.0, 1.55, -1.0], [0.7, 1.25, -0.6], 34],
    [K.y4 - 0.1, [5.8, 1.35, -0.1], [0.8, 0.9, 0.0], 36],
    [K.dos + 0.3, [6.0, 1.4, 0.0], [0.8, 0.9, 0.0], 36],
    [K.seis + 0.5, [-3.2, 3.0, -4.6], [1.0, 1.4, 0.0], 36],
    [K.fabrica3, [-6.5, 4.4, -1.6], [14, 0.9, 0.3], 40],
    [K.fabrica3 + 0.35, [-1.0, 3.8, -4.4], [0.6, 1.9, 0.0], 36],
    [K.si3 + 0.3, [4.4, 2.3, -1.6], [0.4, 1.75, -0.1], 34],
    [K.guardalo + 0.3, [3.6, 2.25, -1.3], [0.4, 1.85, -0.2], 34],
    [K.te2, [3.0, 2.45, -0.6], [0.2, 2.15, 0.0], 34],
    [END - 0.6, [2.4, 3.05, 0.6], [0.02, 3.25, 0.04], 34],
    [END, CAM0[0].toArray(), CAM0[1].toArray(), CAM0[2]],
  ];
}
function H0g() { return v3(0, HAT_Y, 0); }
