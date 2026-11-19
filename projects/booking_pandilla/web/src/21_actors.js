// ---------------------------------------------------------------- los actores: muñecos de maqueta (con ropa aparte del cuerpo, para que la ropa pueda quedarse sola),
// coches (deportivo, berlina y patrulla con su barra de luces) y los haces de los focos. El frente de un muñeco es +z; el de un coche, +x.
function gtaDoll(o = {}) {
  const mk = (c, r = 0.62) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const mSkin = o.skinMat || mk(o.skin ?? 0xd9a27c), mShirt = o.shirtMat || mk(o.shirt ?? 0xff7a2a), mPants = o.pantsMat || mk(o.pants ?? 0xf1ede2), mShoe = o.shoeMat || mk(o.shoe ?? 0x24242a, 0.5), mHair = o.hairMat || mk(o.hair ?? 0x4a3020, 0.8);
  const d = new THREE.Group(), R = new THREE.Group(), J = {}, skin = [], cloth = []; d.add(R);
  const cap = (r, h, m, list) => { const x = new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 6, 14), m); list.push(x); return x; };
  const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  J.hip = pivot(R, 0, 0.5, 0);
  const pel = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), mPants); pel.scale.set(1.3, 0.8, 0.9); J.hip.add(pel); cloth.push(pel);
  J.chest = pivot(J.hip, 0, 0.05, 0); const tor = cap(0.085, 0.22, mShirt, cloth); tor.position.y = 0.17; tor.scale.set(1.25, 1, 0.8); J.chest.add(tor);
  J.neck = pivot(J.chest, 0, 0.36, 0); const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 10), mSkin); nk.position.y = 0.0; J.neck.add(nk); skin.push(nk);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 18), mSkin); head.scale.set(0.9, 1.1, 0.95); head.position.y = 0.08; J.neck.add(head); skin.push(head); J.head = head;
  if (o.hairStyle !== 'none') { const hr = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mHair); hr.scale.set(0.93, 1.1, 1.0); hr.position.set(0, 0.085, -0.008); hr.rotation.x = -0.25; J.neck.add(hr); skin.push(hr);
    if (o.hairStyle === 'ponytail') { const pt = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.14, 4, 10), mHair); pt.position.set(0, 0.06, -0.1); pt.rotation.x = 0.5; J.neck.add(pt); skin.push(pt); } }
  for (const sd of [-1, 1]) {
    const sh = pivot(J.chest, sd * 0.13, 0.31, 0); const ua = cap(0.034, 0.13, mShirt, cloth); ua.position.y = -0.085; sh.add(ua);
    const el = pivot(sh, 0, -0.19, 0); const la = cap(0.028, 0.13, mSkin, skin); la.position.y = -0.085; el.add(la);
    const hand = pivot(el, 0, -0.19, 0); const hm = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), mSkin); hand.add(hm); skin.push(hm);
    const hp = pivot(J.hip, sd * 0.07, -0.03, 0); const ul = cap(0.044, 0.18, mPants, cloth); ul.position.y = -0.12; hp.add(ul);
    const kn = pivot(hp, 0, -0.25, 0); const ll = cap(0.038, 0.17, mPants, cloth); ll.position.y = -0.11; kn.add(ll);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.15), mShoe); ft.position.set(0, -0.225, 0.035); kn.add(ft); cloth.push(ft);
    J[sd < 0 ? 'shL' : 'shR'] = sh; J[sd < 0 ? 'elL' : 'elR'] = el; J[sd < 0 ? 'hL' : 'hR'] = hand; J[sd < 0 ? 'hpL' : 'hpR'] = hp; J[sd < 0 ? 'knL' : 'knR'] = kn;
  }
  R.scale.setScalar(o.scale ?? 1.68);
  d.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  d.userData = { J, R, skin, cloth, s0: o.scale ?? 1.68 }; return d;
}
// gorra y gafas de sol (se cuelgan del cuello: quedan en la cabeza)
function dollCap(col = 0x2a6bd6) { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 });
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.083, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m); c.scale.set(0.95, 0.95, 1.02); g.add(c);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 20, 1, false, -Math.PI / 2, Math.PI), m); b.scale.set(1, 1, 1.25); b.position.set(0, 0.006, 0.06); g.add(b); g.position.set(0, 0.105, 0.0); g.traverse(x => { if (x.isMesh) x.castShadow = true; }); return g; }
function dollGlasses() { const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0x0c0c12, roughness: 0.08, metalness: 0.5, clearcoat: 1 });
  for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.034, 0.012), m); l.position.set(sx * 0.031, 0, 0); g.add(l); }
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.01), m); g.add(br); g.position.set(0, 0.092, 0.07); return g; }
// ---- posturas (ángulos en x: negativo = hacia delante)
function poseZero(d) { const J = d.userData.J; for (const k of ['shL', 'shR', 'elL', 'elR', 'hpL', 'hpR', 'knL', 'knR', 'chest', 'neck']) J[k].rotation.set(0, 0, 0); J.hip.position.y = 0.5; J.hip.rotation.set(0, 0, 0); J.shL.rotation.z = -0.1; J.shR.rotation.z = 0.1; }
function poseWalk(d, ph, a = 0.55, lean = 0.05) { poseZero(d); const J = d.userData.J, s = Math.sin(ph);
  J.hpL.rotation.x = -s * a; J.hpR.rotation.x = s * a; J.knL.rotation.x = Math.max(0, Math.cos(ph)) * a * 1.5; J.knR.rotation.x = Math.max(0, -Math.cos(ph)) * a * 1.5;
  J.shL.rotation.x = s * a * 0.9; J.shR.rotation.x = -s * a * 0.9; J.elL.rotation.x = -0.25 - a * 0.6; J.elR.rotation.x = -0.25 - a * 0.6; J.chest.rotation.x = lean; J.hip.position.y = 0.5 - 0.012 * Math.abs(Math.cos(ph)) * (a / 0.55); }
function poseRun(d, ph) { poseWalk(d, ph, 1.0, 0.28); const J = d.userData.J; J.elL.rotation.x = -1.4; J.elR.rotation.x = -1.4; }
function poseCrouch(d, k = 1) { poseZero(d); const J = d.userData.J; J.hip.position.y = 0.5 - 0.2 * k; J.hpL.rotation.x = J.hpR.rotation.x = -1.35 * k; J.knL.rotation.x = J.knR.rotation.x = 2.2 * k; J.chest.rotation.x = 0.55 * k; J.neck.rotation.x = -0.45 * k;
  J.shL.rotation.x = J.shR.rotation.x = -0.9 * k; J.elL.rotation.x = J.elR.rotation.x = -1.3 * k; }
function poseSneak(d, ph) { poseZero(d); const J = d.userData.J, s = Math.sin(ph);                        // de puntillas, exagerado (dibujos animados)
  J.hip.position.y = 0.46 + 0.02 * Math.abs(s); J.hpL.rotation.x = -0.55 - s * 0.55; J.hpR.rotation.x = -0.55 + s * 0.55; J.knL.rotation.x = 0.9 + Math.max(0, s) * 0.7; J.knR.rotation.x = 0.9 + Math.max(0, -s) * 0.7;
  J.chest.rotation.x = 0.32; J.neck.rotation.x = -0.25; J.shL.rotation.x = -1.2; J.shR.rotation.x = -1.2; J.shL.rotation.z = -0.35; J.shR.rotation.z = 0.35; J.elL.rotation.x = -1.7 + s * 0.2; J.elR.rotation.x = -1.7 - s * 0.2; }
function posePhone(d, k = 1) { const J = d.userData.J; J.shR.rotation.x = -0.75 * k; J.shR.rotation.z = 0.35 * k; J.elR.rotation.x = -2.25 * k; }
function poseGhost(d, t) { poseZero(d); const J = d.userData.J; J.shL.rotation.z = -0.5 + 0.05 * Math.sin(t * 2.1); J.shR.rotation.z = 0.5 - 0.05 * Math.sin(t * 2.1); J.elL.rotation.x = -0.3; J.elR.rotation.x = -0.3; }
const faceTo = (d, dx, dz) => { d.rotation.y = Math.atan2(dx, dz); };
// ---- coches
function carModel(o = {}) {
  const kind = o.kind || 'sedan', sport = kind === 'sport', pol = kind === 'police', g = new THREE.Group(), L = sport ? 4.3 : 4.55, Wd = 1.86, bh = sport ? 0.5 : 0.62, y0 = 0.3;
  const mBody = paint(pol ? 0x14161c : (o.color ?? 0xff7a1a), 0.6, 0.1), mGlass = new THREE.MeshPhysicalMaterial({ color: 0x0c1420, roughness: 0.22, metalness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3 }), mTyre = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.85 });
  const flat = m => { m.rotation.x = -Math.PI / 2; return m; };
  const body = flat(rbox(L, Wd, bh, mBody, 0.24)); body.position.y = y0 + bh / 2; g.add(body);
  if (pol) { const wh = flat(rbox(L * 0.44, Wd + 0.03, bh * 0.96, paint(0xf4f6f9, 0.3), 0.12)); wh.position.set(-0.12, y0 + bh / 2, 0); g.add(wh);
    const tx2 = canvasTex(512, 110, (c, W2, H2) => { c.fillStyle = '#16264a'; c.font = '900 84px Inter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('POLICÍA', W2 / 2, H2 / 2 + 4); });
    for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.32), new THREE.MeshBasicMaterial({ map: tx2, transparent: true, depthWrite: false })); p.position.set(-0.12, y0 + bh * 0.5, sz * (Wd / 2 + 0.03)); p.rotation.y = sz < 0 ? Math.PI : 0; g.add(p); } }
  const ch = sport ? 0.4 : 0.5, cab = flat(rbox(L * (sport ? 0.4 : 0.5), Wd * 0.84, ch, mGlass, 0.2)); cab.position.set(sport ? -0.35 : -0.18, y0 + bh + ch / 2 - 0.06, 0); g.add(cab);
  const roof = flat(rbox(L * (sport ? 0.3 : 0.4), Wd * 0.8, 0.07, pol ? paint(0xf4f6f9, 0.3) : mBody, 0.03)); roof.position.set(cab.position.x, y0 + bh + ch - 0.05, 0); g.add(roof);
  if (sport) { const sp = flat(rbox(0.3, Wd * 0.9, 0.05, mBody, 0.02)); sp.position.set(-L / 2 + 0.25, y0 + bh + 0.2, 0); g.add(sp); for (const sz of [-0.6, 0.6]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), mBody); st.position.set(-L / 2 + 0.25, y0 + bh + 0.1, sz); g.add(st); } }
  const wheels = []; for (const [x, z] of [[L * 0.31, Wd / 2 - 0.1], [-L * 0.31, Wd / 2 - 0.1], [L * 0.31, -Wd / 2 + 0.1], [-L * 0.31, -Wd / 2 + 0.1]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 18), mTyre); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); w.castShadow = true; g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.27, 12), new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.3, metalness: 0.8 })); hub.rotation.x = Math.PI / 2; hub.position.copy(w.position); g.add(hub); wheels.push(w); }
  const mHead = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d0).multiplyScalar(1.1), toneMapped: false, fog: false }), mTail = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2030).multiplyScalar(1.3), toneMapped: false, fog: false });
  for (const sz of [-0.6, 0.6]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.36), mHead); h.position.set(L / 2 - 0.01, y0 + bh * 0.58, sz); g.add(h); const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.4), mTail); tl.position.set(-L / 2 + 0.01, y0 + bh * 0.62, sz); g.add(tl); }
  const U = { kind, body, L, top: y0 + bh + ch, headM: mHead };
  if (pol) { const base = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 1.25), mTyre); base.position.set(cab.position.x, U.top + 0.02, 0); g.add(base); U.bar = [];
    for (const [sz, c] of [[-0.33, 0xff2a3a], [0.33, 0x2a6bff]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.52), new THREE.MeshBasicMaterial({ color: c, toneMapped: false, fog: false })); b.position.set(cab.position.x, U.top + 0.1, sz); b.userData.c = c; g.add(b); U.bar.push(b);
      const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); hl.position.copy(b.position); hl.scale.setScalar(3.2); g.add(hl); b.userData.halo = hl; } }
  g.traverse(x => { if (x.isMesh && !x.material.transparent) { x.castShadow = true; } }); g.userData = U; return g;
}
// la barra de luces: rojo y azul alternos (k = 0 apagada)
function barAt(car, t, k = 1) { const U = car.userData; if (!U.bar) return; const ph = Math.floor(t * 6) % 2;
  U.bar.forEach((b, i) => { const on = k > 0.01 && ph === i; b.material.color.setHex(b.userData.c).multiplyScalar(on ? 2.4 : 0.25); b.userData.halo.material.opacity = on ? 0.5 * k : 0; }); }
function carLights(car, k) { car.userData.headM.color.setHex(0xfff2d0).multiplyScalar(lerp(0.22, 1.45, clamp(k))); }
function carPose(car, x, z, yaw) { car.position.set(x, 0, z); car.rotation.y = yaw; }
// ---- haz de un foco (cono aditivo de a hacia b) y su mancha de luz en el suelo
let _beamT = null;
function beamMesh(col = 0xfff4d8) {
  _beamT = _beamT || canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0.12)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const cg = new THREE.CylinderGeometry(0.1, 1, 1, 28, 1, true); cg.translate(0, -0.5, 0); cg.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: _beamT, color: col, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false })); m.renderOrder = 5; m.frustumCulled = false;
  const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ map: starTex0(), color: col, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })); spot.rotation.x = -Math.PI / 2; spot.renderOrder = 4;
  const g = new THREE.Group(); g.add(m, spot); g.userData = { m, spot }; return g;
}
function beamSet(B, a, b, r, k) { const U = B.userData; B.visible = k > 0.01; if (!B.visible) return; U.m.position.copy(a); U.m.lookAt(b); const L = a.distanceTo(b); U.m.scale.set(r, r, L); U.m.material.opacity = 0.085 * k;
  U.spot.position.set(b.x, 0.05, b.z); U.spot.scale.setScalar(r * 1.9); U.spot.material.opacity = 0.2 * k; }
