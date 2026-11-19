// ---------------------------------------------------------------- EL CHICO (estilo anime, según la lámina de Javi): cabeza con barbilla, ojos grandes dibujados en lienzo
// (se redibujan: parpadeo, mirada, cejas de preocupación, reflejo), pelo revuelto de mechones, sudadera oscura con capucha, pantalón gris claro y manos con dedos.
// El frente es +z; su izquierda (L) es +x. Medidas reales en metros. Articulaciones en userData.J (cadera, pecho, cuello, cabeza, hombros, codos, muñecas, caderas, rodillas).
const HEAD_R = 0.112;
function headPt(az, el, k = 1, out = new THREE.Vector3()) {
  const ce = Math.cos(el); let x = Math.sin(az) * ce, y = Math.sin(el), z = Math.cos(az) * ce;
  x *= 0.9; z *= z > 0 ? 0.93 : 0.98;
  if (y < 0) { const t = -y, fr = Math.max(0, Math.cos(az)); x *= 1 - 0.42 * Math.pow(t, 1.5); if (z > 0) z = z * (1 - 0.1 * t * t) + 0.17 * Math.sin(Math.PI * t) * fr * fr; else z *= 1 - 0.3 * t; y *= 1 + 0.13 * t; }
  return out.set(x * HEAD_R * k, y * HEAD_R * k, z * HEAD_R * k);
}
// malla de un trozo de superficie: fn(az, v) → punto; u crece con az (hacia +x), v hacia arriba
function surfGeo(az0, az1, na, nv, fn) { const pos = [], uv = [], idx = [], p = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= na; i++) { const u = i / na, v = j / nv; fn(lerp(az0, az1, u), v, p); pos.push(p.x, p.y, p.z); uv.push(u, v); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < na; i++) { const a = j * (na + 1) + i, b = a + 1, c = a + na + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }
const patchGeo = (az0, az1, el0, el1, k, na = 16, nv = 16) => surfGeo(az0, az1, na, nv, (az, v, p) => headPt(az, lerp(el0, el1, v), k, p));
// mechón: tubo aplastado que se afila, apoyado en la cabeza (la cara ancha mira hacia fuera)
function lockGeo(pts, w, th, sg = 9) { const cv = new THREE.CatmullRomCurve3(pts), pos = [], idx = [], R = 6, p = new THREE.Vector3(), t = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i <= sg; i++) { const u = i / sg; cv.getPoint(u, p); cv.getTangent(u, t); n.copy(p).normalize(); n.addScaledVector(t, -t.dot(n)).normalize(); b.crossVectors(t, n); const f = Math.pow(1 - u, 0.7) * (0.5 + 0.5 * Math.min(1, u * 5));
    for (let k = 0; k < R; k++) { const a = k / R * Math.PI * 2; pos.push(p.x + b.x * w * f * Math.cos(a) + n.x * th * f * Math.sin(a), p.y + b.y * w * f * Math.cos(a) + n.y * th * f * Math.sin(a), p.z + b.z * w * f * Math.cos(a) + n.z * th * f * Math.sin(a)); } }
  for (let i = 0; i < sg; i++) for (let k = 0; k < R; k++) { const a = i * R + k, b2 = i * R + (k + 1) % R, c = a + R, d = b2 + R; idx.push(a, c, b2, b2, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }

// ---- el ojo (lienzo 384 × 512; el ojo derecho se dibuja en espejo). o: open 0–1, gx/gy mirada (−1…1), worry 0–1, refl 0–1 (el LUNES reflejado), mirror
function drawEye(tex, o) { const c = tex.userData.g, W2 = 384, H2 = 512; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W2, H2); c.save(); if (o.mirror) { c.translate(W2, 0); c.scale(-1, 1); }
  const cx = 192, cy = 372, ew = 112, op = clamp(o.open ?? 1), eh = 66 * (0.25 + 0.75 * op), w = clamp(o.worry ?? 0), gx = (o.gx ?? 0) * (o.mirror ? -1 : 1), gy = o.gy ?? 0, inX = cx - ew, inY = cy + 8, outX = cx + ew, outY = cy - 4 + 12 * w;
  const lidU = () => { c.moveTo(inX, inY); c.bezierCurveTo(cx - ew * 0.5, cy - eh * (1.25 - 0.35 * w), cx + ew * 0.45, cy - eh * 1.42, outX, outY); }, lidL = () => c.bezierCurveTo(cx + ew * 0.5, cy + eh * 0.82, cx - ew * 0.4, cy + eh * 0.78, inX, inY);
  if (op > 0.1) {
    c.save(); c.beginPath(); lidU(); lidL(); c.closePath(); c.fillStyle = '#f6f0ea'; c.fill(); c.clip();
    const ix = cx + gx * 30, iy = cy - 6 + gy * 22, ir = 62, gr = c.createRadialGradient(ix, iy + 14, 6, ix, iy, ir); gr.addColorStop(0, '#6a7c9c'); gr.addColorStop(0.55, '#3c4660'); gr.addColorStop(1, '#1d2230'); c.fillStyle = gr; c.beginPath(); c.arc(ix, iy, ir, 0, 7); c.fill();
    c.strokeStyle = '#11141c'; c.lineWidth = 6; c.beginPath(); c.arc(ix, iy, ir - 2, 0, 7); c.stroke();
    { const g2 = c.createRadialGradient(ix, iy + ir * 0.62, 2, ix, iy + ir * 0.62, ir * 0.75); g2.addColorStop(0, 'rgba(255,170,90,.7)'); g2.addColorStop(1, 'rgba(255,170,90,0)'); c.fillStyle = g2; c.beginPath(); c.arc(ix, iy, ir - 3, 0, 7); c.fill(); }      // el atardecer en el iris
    c.fillStyle = '#090a10'; c.beginPath(); c.arc(ix, iy, 25, 0, 7); c.fill();
    if ((o.refl ?? 0) > 0.01) { c.save(); c.beginPath(); c.arc(ix, iy, ir - 4, 0, 7); c.clip(); c.globalAlpha = o.refl; if (o.mirror) { c.translate(ix, 0); c.scale(-1, 1); c.translate(-ix, 0); } c.fillStyle = '#fff3d8'; c.shadowColor = '#ffe0a0'; c.shadowBlur = 10; c.font = '900 30px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('LUNES', ix, iy + 34 - 16 * o.refl); c.restore(); }
    { const g3 = c.createLinearGradient(0, cy - eh * 1.4, 0, cy); g3.addColorStop(0, 'rgba(40,24,50,.62)'); g3.addColorStop(1, 'rgba(40,24,50,0)'); c.fillStyle = g3; c.fillRect(0, 0, W2, H2); }                                             // sombra del párpado
    c.fillStyle = 'rgba(255,255,255,.96)'; c.beginPath(); c.ellipse(ix - 22, iy - 26, 13, 17, -0.3, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(ix + 24, iy + 22, 6, 0, 7); c.fill(); c.restore();
    c.strokeStyle = '#1a1116'; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 15; c.beginPath(); lidU(); c.stroke();                                                         // pestañas de arriba (línea gruesa)
    c.fillStyle = '#1a1116'; c.beginPath(); c.moveTo(outX - 26, outY - 16); c.quadraticCurveTo(outX + 8, outY - 6, outX + 22, outY - 20); c.quadraticCurveTo(outX + 10, outY + 8, outX - 12, outY + 4); c.fill();
    c.strokeStyle = 'rgba(120,70,60,.55)'; c.lineWidth = 4; c.beginPath(); c.moveTo(inX + 26, inY - eh * 1.0 - 14); c.quadraticCurveTo(cx + 10, cy - eh * 1.42 - 26, outX - 12, outY - 30); c.stroke();                               // pliegue del párpado
    c.strokeStyle = 'rgba(110,64,56,.75)'; c.lineWidth = 4; c.beginPath(); c.moveTo(outX - 4, outY + 6); c.bezierCurveTo(cx + ew * 0.5, cy + eh * 0.84, cx - ew * 0.1, cy + eh * 0.82, cx - ew * 0.45, cy + eh * 0.62); c.stroke();
  } else { c.strokeStyle = '#1a1116'; c.lineCap = 'round'; c.lineWidth = 13; c.beginPath(); c.moveTo(inX, inY); c.quadraticCurveTo(cx, cy + 34, outX, outY + 6); c.stroke(); }
  // ceja: gruesa junto a la nariz y fina fuera; con preocupación, el extremo de dentro sube
  { const by = cy - 150, yi = by - 4 - 30 * w, yo = by + 6 + 14 * w, xi = cx - ew * 0.98, xo = cx + ew * 1.12, ym = by - 16 - 6 * w; c.fillStyle = '#231718'; c.beginPath(); c.moveTo(xi, yi - 12); c.quadraticCurveTo(cx, ym - 12, xo, yo - 3); c.lineTo(xo, yo + 3); c.quadraticCurveTo(cx, ym + 10, xi, yi + 13); c.closePath(); c.fill(); }
  c.restore(); tex.needsUpdate = true; }
// la boca (lienzo 256 × 160): m de −1 (triste) a +1 (sonrisa)
function drawMouth(tex, m) { const c = tex.userData.g; c.clearRect(0, 0, 256, 160); c.lineCap = 'round'; c.strokeStyle = '#7a3a38'; c.lineWidth = 7; c.beginPath(); c.moveTo(92, 74 - 5 * m); c.quadraticCurveTo(128, 74 + 13 * m, 164, 74 - 5 * m); c.stroke();
  c.strokeStyle = 'rgba(150,80,70,.4)'; c.lineWidth = 5; c.beginPath(); c.moveTo(112, 98); c.quadraticCurveTo(128, 103, 144, 98); c.stroke(); tex.needsUpdate = true; }

// ---- mano con dedos: la muñeca en el origen, los dedos hacia −y y la palma mirando a −z. side: +1 izquierda, −1 derecha (el pulgar cambia de lado)
function handModel(side, mSkin) { const g = new THREE.Group(), F = []; const cap = (r, l, par, y) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 5, 10), mSkin); c.position.y = y; c.castShadow = true; par.add(c); return c; };
  const palm = rbox(0.078, 0.084, 0.026, mSkin, 0.012); palm.position.set(0, -0.046, 0); g.add(palm);
  [[-0.028, 0.03, 0.022], [-0.0095, 0.034, 0.025], [0.0095, 0.032, 0.024], [0.028, 0.026, 0.019]].forEach(([x, l1, l2], i) => { const a = new THREE.Group(); a.position.set(x * side * -1, -0.088, 0); g.add(a); cap(0.0088, l1, a, -l1 / 2 - 0.004); const b = new THREE.Group(); b.position.y = -l1 - 0.012; a.add(b); cap(0.0082, l2, b, -l2 / 2 - 0.004); F.push([a, b]); });
  const t0 = new THREE.Group(); t0.position.set(-0.036 * side, -0.03, -0.004); t0.rotation.z = -0.75 * side; g.add(t0); cap(0.0098, 0.032, t0, -0.022); const t1 = new THREE.Group(); t1.position.y = -0.046; t0.add(t1); cap(0.009, 0.022, t1, -0.014);
  g.userData = { F, t0, t1, side }; return g; }
function handCurl(h, k, spread = 0) { const U = h.userData; U.F.forEach(([a, b], i) => { a.rotation.x = k * 1.25; b.rotation.x = k * 1.35; a.rotation.z = spread * (i - 1.5) * 0.09 * U.side; }); U.t1.rotation.x = k * 0.7; U.t0.rotation.x = k * 0.9; U.t0.rotation.z = -U.side * lerp(0.75, 0.12, clamp(k * 1.2)); }

function animeBoy() {
  const d = new THREE.Group(), J = {}, U = { J }, mSkin = toonM(0xf2c5a2), mSkinH = toonM(0xf2c5a2), mHood = toonM(0x34314a), mHood2 = toonM(0x403c58), mPants = toonM(0xc4c2c6), mHair = toonM(0x2b1d1f), mSock = toonM(0xe9e6ee);
  U.mats = { mSkin, mSkinH, mHair, mHood, mHood2, mPants }; const piv = (par, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); par.add(p); return p; };
  const mesh = (geo, m, par, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  const cap = (r, l, m, par, y) => mesh(new THREE.CapsuleGeometry(r, l, 6, 14), m, par, 0, y, 0);
  J.hip = piv(d, 0, 0.09, 0); { const p = mesh(new THREE.SphereGeometry(0.15, 20, 14), mPants, J.hip); p.scale.set(1.12, 0.62, 0.9); }
  J.chest = piv(J.hip, 0, 0.12, 0);
  { const pr = [[0.001, -0.17], [0.172, -0.17], [0.19, -0.1], [0.186, 0], [0.18, 0.12], [0.19, 0.24], [0.186, 0.31], [0.145, 0.365], [0.075, 0.4], [0.056, 0.425], [0.001, 0.425]].map(p => new THREE.Vector2(p[0], p[1]));
    const t = mesh(new THREE.LatheGeometry(pr, 36), mHood, J.chest); t.scale.set(1, 1, 0.7); U.torso = t;
    const hood = mesh(new THREE.SphereGeometry(0.09, 18, 12), mHood2, J.chest, 0, 0.365, -0.085); hood.scale.set(1.3, 0.8, 0.8); const col = mesh(new THREE.TorusGeometry(0.068, 0.03, 10, 24), mHood2, J.chest, 0, 0.405, 0.004); col.rotation.x = Math.PI / 2 + 0.25; col.scale.set(1, 0.85, 1);
    const pk = rbox(0.21, 0.1, 0.03, mHood2, 0.03); pk.position.set(0, -0.045, 0.122); J.chest.add(pk); for (const s of [-1, 1]) { const st = mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.085, 6), toonM(0x8f8aa6), J.chest, s * 0.03, 0.325, 0.126); st.rotation.x = -0.12; } }
  J.neck = piv(J.chest, 0, 0.4, 0); mesh(new THREE.CylinderGeometry(0.04, 0.046, 0.11, 14), mSkinH, J.neck, 0, 0.035, 0);
  J.head = piv(J.neck, 0, 0.075, 0); const HC = piv(J.head, 0, 0.1, 0); U.headC = HC;                           // HC: centro de la cabeza
  U.headMesh = mesh(surfGeo(-Math.PI, Math.PI, 144, 90, (az, v, p) => headPt(az, lerp(-Math.PI / 2, Math.PI / 2, v), 1, p)), mSkinH, HC);
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.023, 12, 10), mSkinH, HC); headPt(s * 1.52, -0.1, 0.99, e.position); e.scale.set(0.45, 1, 0.72); }
  { const n = mesh(new THREE.SphereGeometry(0.009, 12, 10), mSkinH, HC); headPt(0, -0.36, 1.0, n.position); n.position.z -= 0.0035; n.scale.set(0.55, 0.9, 0.9); n.castShadow = false; }
  // ojos, boca (lienzos sobre la piel)
  const eyeTex = () => canvasTex(384, 512, null), eyeM = t => new THREE.MeshToonMaterial({ map: t, gradientMap: mSkinH.gradientMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  U.eyeL = eyeTex(); U.eyeR = eyeTex(); U.mouthT = canvasTex(256, 160, null); const AZ = 0.385, DA = 0.37;
  U.eyeML = mesh(patchGeo(AZ - DA, AZ + DA, -0.3, 0.56, 1.004, 24, 24), eyeM(U.eyeL), HC); U.eyeMR = mesh(patchGeo(-AZ - DA, -AZ + DA, -0.3, 0.56, 1.004, 24, 24), eyeM(U.eyeR), HC); U.mouthM = mesh(patchGeo(-0.3, 0.3, -0.86, -0.5, 1.004, 14, 10), eyeM(U.mouthT), HC);
  for (const m of [U.eyeML, U.eyeMR, U.mouthM]) { m.castShadow = false; m.renderOrder = 3; }
  // pelo: casquete + flequillo + patillas + mechones revueltos de coronilla y nuca
  const hairline = az => { const a = Math.abs(az); return a < 0.9 ? 0.74 : a < 1.5 ? lerp(0.74, 0.1, (a - 0.9) / 0.6) : a < 2.0 ? lerp(0.1, -0.38, (a - 1.5) / 0.5) : -0.62; };
  const HG = new THREE.Group(); HC.add(HG); U.hair = HG; mesh(surfGeo(-Math.PI, Math.PI, 64, 22, (az, v, p) => { const el = lerp(hairline(az), Math.PI / 2, v); headPt(az, el, 1.045 + 0.03 * Math.sin(Math.max(0, el)), p); }), mHair, HG);
  const hp = (az, el, k) => headPt(az, el, k), lock = (pts, w, th = 0.0075) => mesh(lockGeo(pts, w, th), mHair, HG);
  for (let i = 0; i < 10; i++) { const a = -0.92 + i * 0.205 + (hash(i * 3.1) - 0.5) * 0.08, sw = 0.1 + (hash(i * 5.7) - 0.3) * 0.22, tip = 0.2 + hash(i * 7.3) * 0.2 + Math.abs(a) * 0.12; lock([hp(a * 0.75, 1.08, 1.06), hp(a * 0.95, 0.72, 1.11), hp(a + sw * 0.5, 0.45, 1.1), hp(a + sw, tip, 1.075)], 0.026 + hash(i) * 0.008); }
  for (const s of [-1, 1]) { for (let i = 0; i < 3; i++) lock([hp(s * (0.95 + i * 0.16), 0.8, 1.06), hp(s * (1.08 + i * 0.17), 0.3, 1.1), hp(s * (1.12 + i * 0.15), -0.1 - i * 0.05, 1.08), hp(s * (1.06 + i * 0.16), -0.36 + i * 0.1, 1.05)], 0.022);
    for (let i = 0; i < 2; i++) lock([hp(s * (1.45 + i * 0.3), 0.6, 1.07), hp(s * (1.55 + i * 0.3), 0.1, 1.12), hp(s * (1.6 + i * 0.3), -0.34, 1.12 + i * 0.03)], 0.032); }
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 + hash(i * 2.3) * 0.3, e0 = 0.85 + hash(i * 4.1) * 0.5, tw = (hash(i * 6.7) - 0.5) * 0.7; lock([hp(a, e0, 1.05), hp(a + tw * 0.4, e0 - 0.22, 1.16), hp(a + tw, e0 - 0.42, 1.2 + hash(i * 9.1) * 0.1)], 0.03 + hash(i) * 0.012, 0.009); }
  for (let i = 0; i < 11; i++) { const a = 2.0 + (i / 10) * (Math.PI * 2 - 4.0), tw = (hash(i * 3.7) - 0.5) * 0.25; lock([hp(a, 0.25, 1.06), hp(a + tw * 0.5, -0.25, 1.12), hp(a + tw, -0.74 - hash(i * 5.1) * 0.12, 1.16)], 0.034, 0.009); }
  // brazos y manos
  for (const s of [1, -1]) { const k = s > 0 ? 'L' : 'R', sh = piv(J.chest, s * 0.172, 0.325, 0); cap(0.056, 0.2, mHood, sh, -0.135); const sph = mesh(new THREE.SphereGeometry(0.066, 14, 10), mHood, sh);
    const el = piv(sh, 0, -0.27, 0); cap(0.05, 0.16, mHood, el, -0.115); mesh(new THREE.CylinderGeometry(0.052, 0.05, 0.045, 14), mHood2, el, 0, -0.225, 0); const h = piv(el, 0, -0.25, 0); const hm = handModel(s, mSkin); h.add(hm); hm.traverse(o => { if (o.isMesh) o.castShadow = true; });
    J['sh' + k] = sh; J['el' + k] = el; J['h' + k] = h; U['hand' + k] = hm;
    const hpj = piv(J.hip, s * 0.09, -0.01, 0); cap(0.076, 0.3, mPants, hpj, -0.2); const kn = piv(hpj, 0, -0.42, 0); cap(0.062, 0.3, mPants, kn, -0.2); mesh(new THREE.SphereGeometry(0.07, 12, 10), mPants, kn);
    const ft = rbox(0.085, 0.2, 0.07, mSock, 0.03); ft.position.set(0, -0.43, 0.05); ft.rotation.x = Math.PI / 2 - 0.5; kn.add(ft); J['hp' + k] = hpj; J['kn' + k] = kn; }
  d.userData = U; return d;
}
// ---- posturas
const _yn = new THREE.Vector3(0, -1, 0), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _m4b = new THREE.Matrix4();
function aimJoint(j, dirParent) { j.quaternion.setFromUnitVectors(_yn, dirParent.clone().normalize()); }
// sentado con las piernas cruzadas (direcciones en el espacio del muñeco)
function poseCross(d) { const J = d.userData.J; for (const k of ['hip', 'chest', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'hL', 'hR', 'hpL', 'hpR', 'knL', 'knR']) J[k].rotation.set(0, 0, 0);
  const leg = (k, s, ankle) => { const hp = J['hp' + k], kn = J['kn' + k], td = new THREE.Vector3(0.72 * s, -0.045, 0.69).normalize(); aimJoint(hp, td); const knee = hp.position.clone().addScaledVector(td, 0.42), sd = ankle.clone().sub(knee).normalize(); kn.quaternion.setFromUnitVectors(_yn, sd.applyQuaternion(hp.quaternion.clone().invert())); };
  leg('L', 1, new THREE.Vector3(-0.06, -0.035, 0.5)); leg('R', -1, new THREE.Vector3(0.08, -0.035, 0.37)); }
// brazo (dos huesos de 0,27 y 0,25 m) hasta un punto del mundo; sw gira el codo alrededor de la línea hombro–mano
function armTo(d, side, target, sw = 0, k = 1) { if (k <= 0.001) return; const J = d.userData.J, sh = J['sh' + side], el = J['el' + side], a = 0.27, b = 0.25; d.updateMatrixWorld(true);
  const p = sh.parent.worldToLocal(target.clone()).sub(sh.position), dist = clamp(p.length(), Math.abs(a - b) + 0.01, a + b - 0.002), al = Math.acos(clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1)), be = Math.acos(clamp((a * a + b * b - dist * dist) / (2 * a * b), -1, 1));
  const q0 = sh.quaternion.clone(), e0 = el.quaternion.clone(); sh.quaternion.setFromUnitVectors(_yn, p.normalize()); sh.rotateY(sw); sh.rotateX(al); el.rotation.set(-(Math.PI - be), 0, 0);
  if (k < 0.999) { sh.quaternion.copy(q0.slerp(sh.quaternion, k)); el.quaternion.copy(e0.slerp(el.quaternion, k)); } }
// orienta la mano en el mundo: los dedos hacia F y la palma mirando hacia N
function handAim(d, side, F, N, k = 1) { const h = d.userData.J['h' + side]; d.updateMatrixWorld(true); const y = F.clone().normalize().negate(), z = N.clone().normalize().negate(); z.addScaledVector(y, -y.dot(z)).normalize(); const x = new THREE.Vector3().crossVectors(y, z);
  _m4b.makeBasis(x, y, z); _qa.setFromRotationMatrix(_m4b); h.parent.getWorldQuaternion(_qb); _qa.premultiply(_qb.invert()); if (k >= 0.999) h.quaternion.copy(_qa); else h.quaternion.slerp(_qa, k); }
const headW = d => wpos(d.userData.headC);
// la cabeza mira a un punto del mundo (reparte entre cuello y cabeza)
function lookAtPt(d, target, k = 1, lim = 0.9) { const J = d.userData.J; d.updateMatrixWorld(true); const p = J.chest.worldToLocal(target.clone()).sub(J.neck.position).sub(new THREE.Vector3(0, 0.175, 0)); const yaw = clamp(Math.atan2(p.x, p.z), -lim, lim) * k, pit = clamp(-Math.atan2(p.y, Math.hypot(p.x, p.z)), -0.5, 0.75) * k;
  J.neck.rotation.y += yaw * 0.45; J.head.rotation.y += yaw * 0.55; J.neck.rotation.x += pit * 0.4; J.head.rotation.x += pit * 0.6; }
// «fantasma»: la piel y el pelo se vuelven translúcidos para ver el cerebro
function boyGhost(d, g) { const U = d.userData, M = U.mats; g = clamp(g); for (const [m, o] of [[M.mSkinH, 1 - 0.7 * g], [M.mHair, 1 - 0.8 * g]]) { const tr = g > 0.005; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = o; }
  for (const m of [U.eyeML, U.eyeMR, U.mouthM]) m.material.opacity = 1 - 0.85 * g; }
