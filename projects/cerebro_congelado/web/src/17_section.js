// ---------------------------------------------------------------- la cabeza por dentro, en corte de perfil (como una lámina de anatomía): cada estructura es una
// lámina extruida cuyo contorno sale de un campo de distancias en el plano medio (x = 0): la piel coincide con la de la cabeza, y dentro van el cráneo,
// las meninges, el cerebro (con cerebelo, tronco y médula), las fosas nasales, el paladar, la lengua, los dientes, la faringe y las vértebras. Encima,
// en tubos: la arteria cerebral anterior (se ensancha), la carótida y el nervio trigémino (se enciende).
// marching squares: contornos cerrados de f(z, y) = 0 en la caja dada → [[ [z, y], … ], …]
function contour2D(f, z0, y0, z1, y1, h) {
  const nz = Math.ceil((z1 - z0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, F = new Float32Array(nz * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nz; i++) F[i + j * nz] = (i === 0 || j === 0 || i === nz - 1 || j === ny - 1) ? 1 : f(z0 + i * h, y0 + j * h);
  const pts = new Map(), adj = new Map();
  const ep = (i, j, ax) => { const key = (i + j * nz) * 2 + ax; if (!pts.has(key)) { const a = F[i + j * nz], b = ax === 0 ? F[i + 1 + j * nz] : F[i + (j + 1) * nz], t = a / (a - b);
    pts.set(key, ax === 0 ? [z0 + (i + t) * h, y0 + j * h] : [z0 + i * h, y0 + (j + t) * h]); } return key; };
  const link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nz - 1; i++) {
    const c = (F[i + j * nz] < 0 ? 1 : 0) | (F[i + 1 + j * nz] < 0 ? 2 : 0) | (F[i + 1 + (j + 1) * nz] < 0 ? 4 : 0) | (F[i + (j + 1) * nz] < 0 ? 8 : 0);
    if (c === 0 || c === 15) continue;
    const B = () => ep(i, j, 0), R = () => ep(i + 1, j, 1), T = () => ep(i, j + 1, 0), L = () => ep(i, j, 1);
    switch (c) { case 1: case 14: link(L(), B()); break; case 2: case 13: link(B(), R()); break; case 3: case 12: link(L(), R()); break; case 4: case 11: link(R(), T()); break;
      case 6: case 9: link(B(), T()); break; case 7: case 8: link(L(), T()); break; case 5: link(L(), T()); link(B(), R()); break; case 10: link(L(), B()); link(R(), T()); break; }
  }
  const seen = new Set(), loops = [];
  for (const s of adj.keys()) { if (seen.has(s)) continue; const loop = []; let prev = -1, cur = s;
    while (cur !== undefined && !seen.has(cur)) { seen.add(cur); loop.push(pts.get(cur)); const nb = adj.get(cur); const nx = nb.find(k => k !== prev && !seen.has(k)); prev = cur; cur = nx; }
    if (loop.length > 8) loops.push(loop); }
  return loops;
}
const area2 = L => { let a = 0; for (let i = 0; i < L.length; i++) { const p = L[i], q = L[(i + 1) % L.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
function inPoly(p, L) { let c = false; for (let i = 0, j = L.length - 1; i < L.length; j = i++) { const a = L[i], b = L[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
// los contornos → formas (el mayor, con los que caen dentro como huecos) → lámina extruida hacia −x con la cara cortada en x = off
const SEC_BOX = [-1.22, -1.95, 1.16, 1.27];
function slab(f, mat, off, o = {}) {
  const loops = contour2D(f, ...SEC_BOX, o.h || 0.008).sort((a, b) => Math.abs(area2(b)) - Math.abs(area2(a)));
  const shapes = [];
  for (const L of loops) { const host = shapes.find(s => inPoly(L[0], s.userData.L)); const pts = L.map(([z, y]) => new THREE.Vector2(z, y));
    if (host && !o.noHoles) host.holes.push(new THREE.Path(pts)); else { const s = new THREE.Shape(pts); s.userData = { L }; shapes.push(s); } }
  const bv = o.bevel ?? 0.004, geo = new THREE.ExtrudeGeometry(shapes, { depth: o.depth ?? 0.045, bevelEnabled: bv > 0, bevelSize: bv, bevelThickness: bv, bevelSegments: 2, curveSegments: 4 });
  geo.rotateY(-Math.PI / 2); geo.translate(off - bv, 0, 0);
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; return m;
}
const secM = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: o.r ?? 0.5, clearcoat: o.cc ?? 0.35, clearcoatRoughness: 0.35, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0, map: o.map || null });
function texRep(t, s) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(s, s); return t; }
// suelo del cráneo (por encima, el cerebro): altura por tramos
const FLOOR = [[1.2, 0.12], [0.75, 0.1], [0.3, 0.02], [0.0, -0.08], [-0.3, -0.42], [-0.5, -0.5], [-0.85, -0.42], [-1.2, -0.2]];
function yFloor(z) { for (let i = 0; i < FLOOR.length - 1; i++) { const [za, ya] = FLOOR[i], [zb, yb] = FLOOR[i + 1]; if (z <= za && z >= zb) return ya + (yb - ya) * (z - za) / (zb - za); } return z > 0 ? 0.12 : -0.2; }
const sdE2 = (z, y, cz, cy, rz, ry) => (Math.hypot((z - cz) / rz, (y - cy) / ry) - 1) * Math.min(rz, ry);
const sdC2 = (z, y, az, ay, bz, by, ra, rb = ra) => { const pz = z - az, py = y - ay, dz = bz - az, dy = by - ay, h = clamp((pz * dz + py * dy) / (dz * dz + dy * dy)); return Math.hypot(pz - dz * h, py - dy * h) - (ra + (rb - ra) * h); };
const sdChain = (z, y, P, r) => { let d = 1e9; for (let i = 0; i < P.length - 1; i++) d = Math.min(d, sdC2(z, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], r)); return d; };
const sdRR = (z, y, cz, cy, hz, hy, r) => { const qz = Math.abs(z - cz) - hz + r, qy = Math.abs(y - cy) - hy + r; return Math.hypot(Math.max(qz, 0), Math.max(qy, 0)) + Math.min(Math.max(qz, qy), 0) - r; };
const cranD = (z, y) => ellD(0, y, z, HEADP.cran);
function brainTex() {
  return canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e4a7a2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) { let x = hash(i * 3.3) * w, y = hash(i * 7.1) * h, a = hash(i * 5.9) * 6.283; g.strokeStyle = `rgba(150,72,80,${0.35 + hash(i) * 0.25})`; g.lineWidth = 3 + hash(i * 2.7) * 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 26; k++) { a += (hash(i * 31 + k) - 0.5) * 1.6; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,230,225,${0.05 + hash(i * 4.4) * 0.08})`; g.fillRect(hash(i * 1.9) * w, hash(i * 8.3) * h, 2, 2); } });
}
function boneTex() { return canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#efe4cc'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(175,140,95,${0.12 + hash(i) * 0.25})`; g.beginPath(); g.arc(hash(i * 3.3) * w, hash(i * 5.1) * h, 1 + hash(i * 2.2) * 3, 0, 7); g.fill(); } }); }
function buildSection(head) {
  const G = new THREE.Group(); head.add(G);
  const M = { tissue: secM(0xe5a08a, { map: texRep(muscleTex(), 1.6), r: 0.55 }), skin: secM(0xd9957a), fat: secM(0xe8c27a), bone: secM(0xf0e5cd, { map: texRep(boneTex(), 3) }), men: secM(0xe7b9b2, { cc: 0.2, r: 0.6 }),
    brain: secM(0xffffff, { map: texRep(brainTex(), 1.1), r: 0.6 }), cb: secM(0xd9969a), wm: secM(0xf5e6e0), cord: secM(0xf3e3c8), cav: secM(0x9c3b43, { r: 0.4 }), dark: secM(0x4d1518, { r: 0.6 }),
    tongue: secM(0xd46a6a, { map: texRep(muscleTex(), 2.5) }), soft: secM(0xdc8a8f), teeth: secM(0xf7f3ea, { cc: 1 }), disc: secM(0xbcd6ea, { cc: 0.8 }) };
  M.tissue.color.set(0xf0b8a6);
  const H = (z, y) => sdHead(0, y, z);
  const add = (f, m, off, o) => { const s = slab(f, m, off, o); G.add(s); return s; };
  // piel (banda) y tejido blando (relleno), con la grasa debajo de la piel
  add((z, y) => H(z, y), M.tissue, 0.0);
  add((z, y) => Math.max(H(z, y), -(H(z, y) + 0.05)), M.fat, 0.004);
  add((z, y) => Math.max(H(z, y), -(H(z, y) + 0.022)), M.skin, 0.006);
  // cráneo: bóveda + suelo (con el agujero por donde baja el tronco)
  const vault = (z, y) => Math.max(Math.max(cranD(z, y) + 0.06, -(cranD(z, y) + 0.14)), (yFloor(z) - 0.03) - y);
  const floor = (z, y) => Math.max(Math.max(Math.abs(y - yFloor(z)) - 0.035, cranD(z, y) + 0.08), -(Math.abs(z + 0.3) - 0.075));
  add((z, y) => Math.min(vault(z, y), floor(z, y), sdC2(z, y, 0.74, 0.14, 0.86, -0.16, 0.022)), M.bone, 0.01);
  // meninges (la capa que envuelve el cerebro) y el cerebro
  const brain = (z, y) => Math.max(cranD(z, y) + 0.185, (yFloor(z) + 0.075) - y);
  G.userData.men = add((z, y) => Math.max(cranD(z, y) + 0.14, (yFloor(z) + 0.03) - y), M.men, 0.012);
  add(brain, M.brain, 0.016);
  add((z, y) => sdChain(z, y, [[0.3, 0.16], [0.38, 0.29], [0.28, 0.42], [0.0, 0.47], [-0.3, 0.45], [-0.44, 0.34]], 0.035), M.wm, 0.02, { bevel: 0.003 });
  add((z, y) => sdE2(z, y, -0.64, -0.3, 0.3, 0.17), M.cb, 0.02);
  add((z, y) => Math.min(sdC2(z, y, -0.13, -0.05, -0.34, -0.6, 0.095, 0.075), sdChain(z, y, [[-0.34, -0.6], [-0.56, -0.9], [-0.62, -1.4], [-0.64, -1.96]], 0.05)), M.cord, 0.022);
  // fosas nasales, paladar duro y blando, cavidad de la boca, lengua, dientes, mandíbula, faringe
  add((z, y) => Math.min(Math.max(sdE2(z, y, 0.34, -0.27, 0.48, 0.19), -0.48 - y, z - 0.86), sdC2(z, y, -0.1, -0.36, -0.2, -0.56, 0.085)), M.cav, 0.008);
  add((z, y) => Math.min(sdE2(z, y, 0.4, -0.33, 0.28, 0.032), sdE2(z, y, 0.36, -0.2, 0.26, 0.028)), M.soft, 0.012, { bevel: 0.003 });
  G.userData.palate = add((z, y) => sdC2(z, y, 0.71, -0.52, 0.1, -0.49, 0.032), M.bone, 0.014);
  add((z, y) => sdC2(z, y, 0.1, -0.49, -0.12, -0.6, 0.03, 0.022), M.soft, 0.014);
  add((z, y) => sdC2(z, y, -0.18, -0.48, -0.22, -1.96, 0.075), M.dark, 0.008);
  const jaw = new THREE.Group(); jaw.position.copy(JAW_P); G.add(jaw); G.userData.jaw = jaw;
  const toJaw = m => { m.position.sub(JAW_P); jaw.add(m); return m; };
  toJaw(slab((z, y) => sdE2(z, y, 0.42, -0.6, 0.36, 0.055), M.dark, 0.009));
  const tg = new THREE.Group(); jaw.add(tg); G.userData.tongue = tg;
  { const t = slab((z, y) => Math.min(sdE2(z, y, 0.3, -0.76, 0.42, 0.15), sdC2(z, y, 0.04, -0.78, -0.12, -1.04, 0.15, 0.1)), M.tongue, 0.012); t.position.sub(JAW_P); tg.add(t); }
  add((z, y) => sdC2(z, y, 0.72, -0.55, 0.75, -0.66, 0.028, 0.02), M.teeth, 0.02, { bevel: 0.003 });
  toJaw(slab((z, y) => sdC2(z, y, 0.71, -0.82, 0.73, -0.7, 0.028, 0.02), M.teeth, 0.02, { bevel: 0.003 }));
  toJaw(slab((z, y) => Math.min(sdE2(z, y, 0.56, -0.95, 0.12, 0.17), sdC2(z, y, 0.5, -1.06, 0.12, -1.09, 0.03)), M.bone, 0.014));
  // vértebras del cuello (con sus discos)
  for (let i = 0; i < 6; i++) { const cy = -0.72 - i * 0.22; add((z, y) => sdRR(z, y, -0.42, cy, 0.11, 0.08, 0.025), M.bone, 0.014); if (i < 5) add((z, y) => sdRR(z, y, -0.42, cy - 0.11, 0.1, 0.02, 0.012), M.disc, 0.014, { bevel: 0.002 }); }
  // tubos: carótida y arteria cerebral anterior (se ensancha), nervio trigémino (se enciende), y la sangre
  const tubeAt = (P, x) => new THREE.CatmullRomCurve3(P.map(([z, y]) => v3(x, y, z)));
  const art = new THREE.MeshPhysicalMaterial({ color: 0xc8202a, roughness: 0.3, clearcoat: 0.8, emissive: 0x6a0408, emissiveIntensity: 0.4 });
  G.userData.carC = tubeAt([[-0.02, -1.96], [0.0, -1.2], [0.02, -0.6], [0.06, -0.22], [0.1, -0.04]], 0.04);
  G.add(new THREE.Mesh(new THREE.TubeGeometry(G.userData.carC, 60, 0.024, 12), art));
  G.userData.acaC = tubeAt([[0.1, -0.04], [0.24, 0.06], [0.37, 0.18], [0.42, 0.33], [0.33, 0.5], [0.11, 0.6], [-0.18, 0.62], [-0.44, 0.54]], 0.04);
  G.userData.aca = new THREE.Mesh(new THREE.TubeGeometry(G.userData.acaC, 90, 0.015, 12), art); G.add(G.userData.aca); G.userData.artM = art;
  const nerveMat = P => { const m = new THREE.MeshPhysicalMaterial({ color: 0xf2c84b, roughness: 0.35, clearcoat: 0.6, emissive: 0xffb820, emissiveIntensity: 0.0 });
    m.onBeforeCompile = sh => { sh.uniforms.pp = P.p; sh.uniforms.pw = P.w;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vU;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvU = uv.x;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vU; uniform float pp, pw;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.85, 0.35) * 2.2 * exp(-pow((vU - pp) / pw, 2.0));'); };
    return m; };
  const pulseU = { p: { value: -1 }, w: { value: 0.12 } }, pulse2 = { p: { value: -1 }, w: { value: 0.12 } }, nv = nerveMat(pulseU), nv2 = nerveMat(pulse2);
  G.userData.nervM = nv; G.userData.nervM2 = nv2; G.userData.pulse = pulseU; G.userData.pulse2 = pulse2;
  G.userData.n1C = tubeAt([[0.6, -0.47], [0.4, -0.41], [0.18, -0.32], [0.0, -0.21], [-0.14, -0.13]], 0.05);
  G.userData.n2C = tubeAt([[0.0, -0.21], [0.16, -0.06], [0.38, 0.05], [0.57, 0.2], [0.68, 0.42], [0.7, 0.56]], 0.05);
  G.add(new THREE.Mesh(new THREE.TubeGeometry(G.userData.n1C, 60, 0.014, 10), nv)); G.add(new THREE.Mesh(new THREE.TubeGeometry(G.userData.n2C, 70, 0.012, 10), nv2));
  const gang = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), nv); gang.position.set(0.05, -0.21, 0.0); gang.scale.set(0.6, 1, 1.5); G.add(gang);
  const NB = 40; G.userData.blood = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xe0303a, roughness: 0.25, clearcoat: 1, emissive: 0x7a0a10, emissiveIntensity: 0.6 }), NB);
  G.userData.blood.frustumCulled = false; G.add(G.userData.blood);
  { const o = new THREE.Object3D(); o.scale.setScalar(0.00001); o.updateMatrix(); for (let i = 0; i < NB; i++) G.userData.blood.setMatrixAt(i, o.matrix); }
  // frío y calor (brillos sobre el paladar) y dolor (la capa del cerebro y la frente)
  const glowT = (r, g2, b) => canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, `rgba(${r},${g2},${b},.95)`); gr.addColorStop(0.45, `rgba(${r},${g2},${b},.45)`); gr.addColorStop(1, `rgba(${r},${g2},${b},0)`); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const spr = (t, ro = 12) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); s.renderOrder = ro; s.scale.setScalar(0.0001); G.add(s); return s; };
  G.userData.cold = spr(glowT(90, 170, 255)); G.userData.cold.position.set(0.06, -0.52, 0.5);
  G.userData.warm = spr(glowT(255, 150, 60)); G.userData.warm.position.set(0.06, -0.55, 0.45);
  G.userData.fore = spr(glowT(240, 50, 40), 13); G.userData.fore.position.set(0.02, 0.45, 0.76);
  G.userData.M = M; G.visible = false;
  return G;
}
// la arteria: radio r (se rehace la malla)
function acaRadius(G, r) { const U = G.userData; if (U._r === r) return; U._r = r; U.aca.geometry.dispose(); U.aca.geometry = new THREE.TubeGeometry(U.acaC, 90, r, 12); }
