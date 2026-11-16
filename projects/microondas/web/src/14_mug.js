// ---------------------------------------------------------------- la taza de cerámica esmaltada (verde azulado por fuera, blanca por dentro) con el agua, el estallido
// del agua sobrecalentada a cámara lenta (gotas que se estiran con la velocidad, la columna del centro y el vapor), el café soluble que cae, el palito de madera
// (textura real de roble, CC0) con las burbujas que nacen en sus vetas, y la vista en corte. Unidades: cm; origen de la taza abajo en el centro.
const MUG = { R: 4.15, H: 9.6, WY: 7.9, rIn: y => 3.62 + 0.27 * clamp((y - 0.7) / 8.6) };
function mugProfile() {
  const O = [[0.01, 0], [3.55, 0], [3.82, 0.12], [3.95, 0.45], [4.05, 2], [4.15, 6], [4.24, 9.25], [4.3, 9.5], [4.26, 9.66], [4.14, 9.7], [4.0, 9.6]];
  const I = [[MUG.rIn(9.3), 9.3], [MUG.rIn(6), 6], [MUG.rIn(2), 2], [3.5, 0.95], [3.1, 0.7], [0.01, 0.62]];
  return { pts: [...O, ...I].map(([r, y]) => new THREE.Vector2(r, y)), nOut: O.length };
}
function buildMug(o = {}) {
  const G = new THREE.Group(), U = {};
  const { pts, nOut } = mugProfile(), seg = 96;
  const g = new THREE.LatheGeometry(pts, seg); g.computeVertexNormals();
  // color por vértice: esmalte de fuera (verde azulado oscuro) y de dentro (blanco)
  const col = new Float32Array(g.attributes.position.count * 3), cOut = new THREE.Color(o.color ?? 0x2b5a68), cIn = new THREE.Color(0xf3f1ec), cc = new THREE.Color();
  for (let i = 0; i <= seg; i++) for (let j = 0; j < pts.length; j++) { const k = i * pts.length + j; cc.copy(j < nOut - 1 ? cOut : cIn); if (j === nOut - 1 || j === nOut - 2) cc.copy(cOut).lerp(cIn, 0.35); col[k * 3] = cc.r; col[k * 3 + 1] = cc.g; col[k * 3 + 2] = cc.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const speck = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(${hash(i) > 0.5 ? '0,0,0' : '255,255,255'},${0.05 + hash(i * 3.3) * 0.08})`; c.beginPath(); c.arc(hash(i * 1.9) * w, hash(i * 7.1) * h, 0.6 + hash(i * 2.2) * 1.4, 0, 7); c.fill(); } });
  speck.wrapS = speck.wrapT = THREE.RepeatWrapping; speck.repeat.set(6, 3); speck.colorSpace = THREE.NoColorSpace;
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, roughnessMap: speck, bumpMap: speck, bumpScale: 0.02, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.0 });
  const body = new THREE.Mesh(g, mat); body.castShadow = true; body.receiveShadow = true; G.add(body); U.mat = mat; U.body = body;
  // el asa: curva en C con sección ovalada
  { const cv = new THREE.CatmullRomCurve3([v3(3.9, 7.6, 0), v3(5.6, 7.7, 0), v3(6.8, 6.4, 0), v3(6.7, 4.0, 0), v3(5.5, 2.6, 0), v3(4.0, 2.4, 0)]);
    const hg = new THREE.TubeGeometry(cv, 64, 0.58, 18, false); const P = hg.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, P.getZ(i) * 0.62); hg.computeVertexNormals();
    const hm = new THREE.MeshPhysicalMaterial({ color: o.color ?? 0x2b5a68, roughness: 0.32, roughnessMap: speck, bumpMap: speck, bumpScale: 0.02, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.0 });
    const h = new THREE.Mesh(hg, hm); h.castShadow = true; G.add(h); U.handle = h; U.hmat = hm; }
  // el agua: superficie (rejilla polar que se deforma: menisco, hervor, el bulto del estallido) en dos capas: un velo de color y el reflejo (aditivo)
  { const NR = 40, NA = 96, rW = MUG.rIn(MUG.WY) - 0.02, pos = [], idx = [];
    for (let i = 0; i <= NR; i++) for (let j = 0; j <= NA; j++) { const r = rW * i / NR, a = j / NA * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex(idx); sg.computeVertexNormals();
    U.surfBase = Float32Array.from(pos); U.NR = NR; U.NA = NA; U.rW = rW;
    const tint = new THREE.MeshPhysicalMaterial({ color: 0x8fb2b8, roughness: 0.02, transparent: true, opacity: 0.16, depthWrite: false });
    const refl = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.015, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.01, ior: 1.33, envMapIntensity: 2.4, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const s1 = new THREE.Mesh(sg, tint), s2 = new THREE.Mesh(sg, refl); for (const s of [s1, s2]) { s.position.y = MUG.WY; s.renderOrder = 7; G.add(s); }
    U.surf = sg; U.surfMeshes = [s1, s2];
    // el cuerpo del agua (solo se ve en corte)
    const wb = new THREE.Mesh(new THREE.CylinderGeometry(rW - 0.01, MUG.rIn(0.8) - 0.02, MUG.WY - 0.65, 64, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x6f9aa6, roughness: 0.05, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    wb.position.y = (MUG.WY + 0.65) / 2; wb.renderOrder = 6; wb.visible = false; G.add(wb); U.waterBody = wb; }
  G.userData = U; return G;
}
// la superficie del agua: menisco en el borde + rizos de hervor (amp) + el bulto del centro (bulge, en cm) y el anillo que se abre (crown)
function mugSurface(M, t, o = {}) {
  const U = M.userData, P = U.surf.attributes.position, B = U.surfBase, amp = o.amp ?? 0, bulge = o.bulge ?? 0, crown = o.crown ?? 0;
  for (let k = 0; k < P.count; k++) { const x = B[k * 3], z = B[k * 3 + 2], r = Math.hypot(x, z), u = r / U.rW;
    let y = 0.09 * Math.pow(u, 14);                                            // menisco
    y += amp * (0.12 * Math.sin(x * 5.1 + t * 13) * Math.sin(z * 4.3 - t * 11) + 0.06 * Math.sin(r * 9 - t * 20));
    y += bulge * Math.exp(-r * r / 2.2) + crown * 0.6 * Math.exp(-Math.pow((r - 1.6 - crown * 1.5) / 0.55, 2));
    P.setY(k, y); }
  P.needsUpdate = true; U.surf.computeVertexNormals();
}
// corte de la taza (plano x = 0: se quita la mitad de delante) para ver el agua por dentro
function mugCut(M, on) {
  const U = M.userData; if (!U.cutP) U.cutP = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
  const cp = on ? U.cutP : null; for (const m of [U.mat, U.hmat]) { m.clippingPlanes = cp; m.side = on ? THREE.DoubleSide : THREE.FrontSide; m.needsUpdate = true; }
  for (const s of U.surfMeshes) { s.material.clippingPlanes = cp; s.material.needsUpdate = true; }
  U.waterBody.visible = !!on; U.waterBody.material.clippingPlanes = cp;
}
// ---------- el estallido: gotas (instanciadas, se estiran con la velocidad), la columna y el vapor. τ = tiempo REAL del estallido en segundos
function buildSplash(n = 1400, seed = 1) {
  const G = new THREE.Group(), geo = new THREE.IcosahedronGeometry(1, 2);
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transmission: 1, thickness: 0.25, ior: 1.33, envMapIntensity: 1.6, specularIntensity: 1 });
  const im = new THREE.InstancedMesh(geo, m, n); im.frustumCulled = false; im.renderOrder = 9; G.add(im);
  const D = new Float32Array(n * 8);           // x0, z0, vx, vy, vz, size, τ0, kind
  for (let i = 0; i < n; i++) { const h = k => hash(i * 7.31 + k * 1.913 + seed * 13.7); const core = i < n * 0.18;
    const r = (core ? 1.1 : 3.4) * Math.sqrt(h(1)), a = h(2) * 6.283, x0 = Math.cos(a) * r, z0 = Math.sin(a) * r, up = core ? 60 + 70 * h(3) : 80 + 140 * h(3), out = (core ? 8 : 20) + 50 * h(4) * (r / 3.4);
    D.set([x0, z0, Math.cos(a) * out, up, Math.sin(a) * out, core ? 0.22 + 0.3 * h(5) : 0.04 + 0.16 * Math.pow(h(5), 2), (core ? 0.004 : 0.012) * h(6) + (r / 3.4) * 0.01, core ? 1 : 0], i * 8); }
  _o.scale.setScalar(0.0001); _o.position.set(0, -1000, 0); _o.updateMatrix(); for (let i = 0; i < n; i++) im.setMatrixAt(i, _o.matrix);
  // vapor: manchas suaves que suben y se abren
  const st = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const steam = []; for (let i = 0; i < 46; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0 })); s.renderOrder = 10; G.add(s); steam.push(s); }
  G.userData = { im, D, n, steam, seed }; return G;
}
const _sv = new THREE.Vector3(), _sq = new THREE.Quaternion(), _sY = new THREE.Vector3(0, 1, 0);
// τ: segundos reales desde que estalla; o.dir: empuja el chorro hacia un lado (p. ej. hacia la cámara); o.floor: altura donde se paran las gotas que caen fuera
function splashAt(SP, tau, o = {}) {
  const U = SP.userData, D = U.D, g = 981, dir = o.dir || null, floor = o.floor ?? -0.2, rimR = MUG.R + 0.3;
  for (let i = 0; i < U.n; i++) { const b = i * 8, t = tau - D[b + 6];
    if (tau <= 0 || t <= 0) { _o.position.set(0, -1000, 0); _o.scale.setScalar(0.0001); _o.updateMatrix(); U.im.setMatrixAt(i, _o.matrix); continue; }
    let vx = D[b + 2], vy = D[b + 3], vz = D[b + 4]; if (dir) { vx += dir.x * vy * 0.45; vz += dir.z * vy * 0.45; }
    let x = D[b] + vx * t, y = MUG.WY + vy * t - 0.5 * g * t * t, z = D[b + 1] + vz * t, vyy = vy - g * t, s = D[b + 5];
    const inside = Math.hypot(x, z) < MUG.rIn(MUG.WY) - 0.1;
    if (inside && y < MUG.WY && vyy < 0) s *= clamp((y - MUG.WY + 1.2) / 1.2);                   // las que vuelven a caer dentro se hunden
    if (!inside && y < floor) { const tl = (y - floor) / Math.max(1, -vyy); y = floor; s *= clamp(1 + tl * 12); }   // las que caen fuera se aplastan y se van
    const sp = Math.hypot(vx, vyy, vz), stretch = 1 + Math.min(4, sp * 0.012 * (o.blur ?? 1));
    _o.position.set(x, y, z); _sv.set(vx, vyy, vz).normalize(); _o.quaternion.setFromUnitVectors(_sY, _sv);
    _o.scale.set(Math.max(0.0001, s), Math.max(0.0001, s * stretch), Math.max(0.0001, s)); _o.updateMatrix(); U.im.setMatrixAt(i, _o.matrix); }
  U.im.instanceMatrix.needsUpdate = true;
  U.steam.forEach((s, i) => { const t = tau - 0.01 - (i % 12) * 0.006, k = clamp(t / 0.12); s.visible = t > 0;
    if (!s.visible) return; const a = hash(i * 3.7) * 6.283, r = 1 + 3 * hash(i * 5.1) + 18 * k * hash(i * 1.3);
    s.position.set(Math.cos(a) * r, MUG.WY + 2 + 26 * k * (0.5 + hash(i * 2.9)), Math.sin(a) * r); s.scale.setScalar(3 + 14 * k); s.material.opacity = 0.32 * Math.sin(Math.PI * clamp(k * 1.1)) * (o.steam ?? 1); });
}
// ---------- el café soluble: gránulos que caen (a cámara lenta) y tocan el agua en τHit
function buildCoffee(n = 140) {
  const geo = new THREE.IcosahedronGeometry(1, 1); { const P = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); v.multiplyScalar(0.7 + 0.45 * hash(Math.round(v.x * 50) * 3.1 + Math.round(v.y * 50) * 7.7 + Math.round(v.z * 50) * 1.3)); P.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); }
  const m = new THREE.MeshPhysicalMaterial({ color: 0x24140b, roughness: 0.62, clearcoat: 0.25, sheen: 0.4, sheenColor: new THREE.Color(0x6b4a30) });
  const im = new THREE.InstancedMesh(geo, m, n); im.castShadow = true; im.frustumCulled = false;
  _o.scale.setScalar(0.0001); _o.position.set(0, -1000, 0); _o.updateMatrix(); for (let i = 0; i < n; i++) im.setMatrixAt(i, _o.matrix);
  im.userData = { n }; return im;
}
// u: 0 arriba … 1 tocan el agua (cada gránulo con su retraso)
function coffeeAt(CF, u) {
  const n = CF.userData.n;
  for (let i = 0; i < n; i++) { const h = k => hash(i * 3.17 + k * 9.1), uu = clamp((u - h(1) * 0.25) / 0.75), a = h(2) * 6.283, r = 1.6 * Math.sqrt(h(3));
    const y = MUG.WY + 16 * (1 - uu) * (1 - uu) + 0.3, s = 0.08 + 0.12 * h(4);
    _o.position.set(Math.cos(a) * r, uu >= 1 ? -1000 : y, Math.sin(a) * r); _o.rotation.set(h(5) * 6 + u * 4, h(6) * 6, h(7) * 6); _o.scale.set(s, s * (0.6 + h(8) * 0.6), s * 0.8); _o.updateMatrix(); CF.setMatrixAt(i, _o.matrix); }
  CF.instanceMatrix.needsUpdate = true;
}
// ---------- el palito de madera (textura real de roble) y las burbujas que nacen en sus vetas y suben despacio
function buildStick() {
  const s = new THREE.Shape(), w = 0.32, L = 14; s.moveTo(-w, 0); s.lineTo(-w, L); s.absarc(0, L, w, Math.PI, 0, true); s.lineTo(w, 0); s.absarc(0, 0, w, 0, Math.PI, true);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 16 }); g.translate(0, 0, -0.08);
  const P = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / 6 + 0.5, P.getY(i) / 6);
  const m = new THREE.MeshPhysicalMaterial({ map: tx('ph/white_oak_veneer/white_oak_veneer_Diffuse_2k.jpg'), normalMap: tx('ph/white_oak_veneer/white_oak_veneer_nor_gl_2k.jpg', false), roughnessMap: tx('ph/white_oak_veneer/white_oak_veneer_Rough_2k.jpg', false), roughness: 0.75 });
  for (const t of [m.map, m.normalMap, m.roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); }
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}
function buildBubbles(n = 90) {
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), bubbleMat(0.9), n); im.frustumCulled = false; im.renderOrder = 8;
  _o.scale.setScalar(0.0001); _o.position.set(0, -1000, 0); _o.updateMatrix(); for (let i = 0; i < n; i++) im.setMatrixAt(i, _o.matrix);
  im.userData = { n }; return im;
}
// burbujas que nacen en puntos de un segmento (a → b, en coordenadas de la taza), crecen, se sueltan y suben hasta la superficie; k: 0..1 cuántas
function bubblesAt(BB, t, a, b, k, o = {}) {
  const n = BB.userData.n, top = o.top ?? MUG.WY, rate = o.rate ?? 1;
  for (let i = 0; i < n; i++) { const h = q => hash(i * 5.33 + q * 2.71), per = 0.9 + 1.4 * h(1), ph = ((t * rate / per + h(2)) % 1 + 1) % 1, u = h(3);
    const on = i / n < k; const nx = a.x + (b.x - a.x) * u + (h(4) - 0.5) * 0.25, ny = a.y + (b.y - a.y) * u, nz = a.z + (b.z - a.z) * u + (h(5) - 0.5) * 0.25;
    let x = nx, y = ny, z = nz, r;
    if (ph < 0.45) r = 0.04 + 0.11 * (ph / 0.45); else { const q = (ph - 0.45) / 0.55; r = 0.15; y = ny + (top - ny) * q * q * 1.2; x += Math.sin(q * 9 + i) * 0.12; }
    const vis = on && y < top - 0.05; _o.position.set(x, vis ? y : -1000, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(vis ? r * (o.scale ?? 1) : 0.0001); _o.updateMatrix(); BB.setMatrixAt(i, _o.matrix); }
  BB.instanceMatrix.needsUpdate = true;
}
