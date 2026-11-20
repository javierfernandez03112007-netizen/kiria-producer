// ---------------------------------------------------------------- EL PUEBLO (día 3, más realista): plaza de piedra con el pedestal, ayuntamiento con pórtico y salón del trono,
// la calle de las tiendas con calzada, aceras y bordillos, franjas de césped de verdad (briznas), árboles, farolas, bancos y edificios alrededor.
const T = {};       // materiales del pueblo
function townMats() {
  const [pc, ph] = tileCanvases([190, 182, 170], 7, 512, 5, 7, 5); T.plaza = texMat(pc, ph, [10, 10], { r: 0.88, ns: 0.8 });
  const [sc, sh] = tileCanvases([176, 176, 172], 19, 512, 4, 4, 4); T.walk = texMat(sc, sh, [1, 1], { r: 0.85, ns: 0.7 });
  const [ac, ah] = asphaltCanvases(13); T.road = texMat(ac, ah, [1, 1], { r: 0.92, ns: 0.6 });
  T.curb = stdM(0xb8b4ac, 0.75); T.mark = stdM(0xf2f0e8, 0.6, { emissive: 0x111111 });
  T.lawn = new THREE.MeshStandardMaterial({ map: texOf(lawnCanvas(), [6, 6]), roughness: 0.95 });
  const [hc, hh] = stuccoCanvases([226, 214, 190], 21); T.stone = texMat(hc, hh, [3, 3], { r: 0.8, ns: 0.6 });
  T.stoneW = stdM(0xeee7da, 0.55); T.gold = new THREE.MeshStandardMaterial({ color: 0xffc85a, roughness: 0.25, metalness: 1 }); T.goldD = new THREE.MeshStandardMaterial({ color: 0xc8922e, roughness: 0.35, metalness: 1 });
  T.iron = stdM(0x23272b, 0.45, { metalness: 0.6 }); T.woodD = stdM(0x4a2e1c, 0.6); T.bark = stdM(0x5a4433, 0.95); T.glassDark = new THREE.MeshPhysicalMaterial({ color: 0x2a3a48, roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.85, envMapIntensity: 1.4 });
  T.glass = new THREE.MeshPhysicalMaterial({ color: 0xdfeef2, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.08, envMapIntensity: 0.55, depthWrite: false });
  T.frame = stdM(0x2c2f33, 0.4, { metalness: 0.5 }); T.velvet = stdM(0x8c1426, 0.75); T.purple = stdM(0x4b2a78, 0.7);
  T.lampGlow = new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd89a, emissiveIntensity: 1.6, roughness: 0.3 });
  { const c = cnv(256, 256), g = c.getContext('2d'), R = rng(77); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { const v = (90 + R() * 120) | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(R() * 256, R() * 256, 4 + R() * 6, 2 + R() * 3, R() * 3.14, 0, 7); g.fill(); }
    const ln = normalFrom(c, 4); ln.repeat.set(3, 3); const lc = cnv(256, 256), lg = lc.getContext('2d'), R2 = rng(78); lg.fillStyle = '#7a7a7a'; lg.fillRect(0, 0, 256, 256); for (let i = 0; i < 1400; i++) { const v = (110 + R2() * 145) | 0; lg.fillStyle = `rgb(${v},${v},${v})`; lg.beginPath(); lg.ellipse(R2() * 256, R2() * 256, 3 + R2() * 5, 2 + R2() * 2, R2() * 3.14, 0, 7); lg.fill(); }
    const lmap = texOf(lc, [3, 3]); T.leaf = [0x3f7a35, 0x4f8a3b, 0x356b2e, 0x5c9440].map(col => new THREE.MeshStandardMaterial({ color: col, map: lmap, normalMap: ln, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.82 })); }
  T.hedge = stdM(0x3a6f30, 0.9);
}
function plane(w, d, m, x, y, z, rep) { const g = new THREE.PlaneGeometry(w, d); if (rep) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rep[0], uv.getY(i) * rep[1]); } const p = new THREE.Mesh(g, m); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; return p; }

// ---- suelo: plaza, aceras con bordillo, calzada con rayas, franjas de césped
function buildGround(G) {
  G.add(plane(29, 30, T.plaza, -0.5, 0, 0, [1, 1]));                                            // plaza x ∈ [−15, 14], z ∈ [−15, 15]
  G.add(plane(200, 200, T.lawn, 0, -0.02, 0, [20, 20]));                                         // fondo verde (lejos)
  // calle norte-sur de las tiendas: acera oeste x ∈ [13.6, 15.6], calzada [15.6, 22.4], acera este [22.4, 25]
  G.add(plane(2.0, 60, T.walk, 14.6, 0.14, 0, [1, 30])); G.add(plane(2.6, 60, T.walk, 23.7, 0.14, 0, [1.3, 30]));
  G.add(plane(6.8, 80, T.road, 19.0, 0.0, 0, [3.4, 40]));
  for (const x of [15.6, 22.4]) { const c = box(0.22, 0.15, 60, T.curb, x, 0.075, 0); G.add(c); }
  for (let z = -30; z < 30; z += 3.2) G.add(plane(0.14, 1.6, T.mark, 20.0, 0.012, z, null));     // raya discontinua (aparcamiento al oeste, un carril por sentido)
  // calle este-oeste del sur (la esquina de la cola): calzada z ∈ [16, 22]
  G.add(plane(80, 6, T.road, 10, 0.001, 19, [40, 3])); for (let x = -30; x < 50; x += 3.2) { const m = plane(1.6, 0.14, T.mark, x, 0.013, 19, null); G.add(m); }
  G.add(plane(60, 1.6, T.walk, 0, 0.14, 15.8, [30, 0.8])); G.add(box(60, 0.15, 0.22, T.curb, 0, 0.075, 16.6));
  // césped: entre la plaza y la acera (con árboles) y dos parterres en la plaza
  T.lawns = [[12.0, 13.6, -14, 14], [-14.5, -11.5, -12, 12], [-8.5, -4.5, 7.5, 12.5], [4.5, 8.5, 7.5, 12.5]];
  for (const [x0, x1, z0, z1] of T.lawns) { G.add(plane(x1 - x0, z1 - z0, T.lawn, (x0 + x1) / 2, 0.05, (z0 + z1) / 2, [(x1 - x0) / 4, (z1 - z0) / 4]));
    for (const [w, d, x, z] of [[x1 - x0 + 0.24, 0.12, (x0 + x1) / 2, z0], [x1 - x0 + 0.24, 0.12, (x0 + x1) / 2, z1], [0.12, z1 - z0, x0, (z0 + z1) / 2], [0.12, z1 - z0, x1, (z0 + z1) / 2]]) G.add(box(w, 0.14, d, T.curb, x, 0.07, z)); }
}
// ---- briznas de hierba (instancias con vaivén de viento): miles en los céspedes cercanos
const GRASS_VS_INJ = `
  float sway = sin(time * 1.7 + instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.9) * 0.08 + sin(time * 3.1 + instanceMatrix[3].z * 2.1) * 0.03;
  transformed.x += sway * position.y * position.y * 6.0;`;
function grassField(G, rects, n, seed = 1) { const R = rng(seed), g = new THREE.BufferGeometry(), w = 0.012, hgt = 0.11;
  g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.6, hgt * 0.5, 0.004, w * 0.6, hgt * 0.5, 0.004, 0, hgt, 0.012], 3)); g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide, vertexColors: false });
  m.onBeforeCompile = sh => { sh.uniforms.time = S.grassTime = S.grassTime || { value: 0 }; sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + GRASS_VS_INJ); };
  const area = rects.reduce((s, r) => s + (r[1] - r[0]) * (r[3] - r[2]), 0), im = new THREE.InstancedMesh(g, m, n), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let i = 0;
  for (const [x0, x1, z0, z1] of rects) { const cnt = Math.round(n * (x1 - x0) * (z1 - z0) / area); for (let j = 0; j < cnt && i < n; j++, i++) { const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0), s = 0.6 + R() * 0.9;
    q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.5, R() * Math.PI * 2, (R() - 0.5) * 0.5)); M4.compose(_v(x, 0.05, z), q, _v(s, s * (0.7 + R() * 0.8), s)); im.setMatrixAt(i, M4);
    c.setHSL(0.26 + R() * 0.06, 0.45 + R() * 0.2, 0.22 + R() * 0.16); im.setColorAt(i, c); } }
  im.count = i; im.receiveShadow = true; im.castShadow = false; G.add(im); return im; }
// ---- árbol: tronco torneado con ramas y copa de varios racimos de hojas (esferas deformadas, de colores distintos)
const _leafG = []; function leafBlob(seed) { if (_leafG[seed % 6]) return _leafG[seed % 6]; const g = new THREE.IcosahedronGeometry(1, 5), p = g.attributes.position, R = rng(seed + 50), N = Array.from({ length: 8 }, () => [_v(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), R() * 0.25]);
  for (let i = 0; i < p.count; i++) { const v = _v(p.getX(i), p.getY(i), p.getZ(i)); let d = 1; for (const [n, a] of N) d += a * Math.max(0, v.dot(n)) ** 2; v.multiplyScalar(d); p.setXYZ(i, v.x, v.y * 0.85, v.z); }
  g.computeVertexNormals(); return (_leafG[seed % 6] = g); }
function tree(seed, hgt = 6) { const R = rng(seed), g = new THREE.Group(), k = hgt / 6;
  const trunk = new THREE.Mesh(new THREE.LatheGeometry([[0.22, 0], [0.17, 0.4], [0.14, 2.0], [0.11, 3.2], [0.07, 4.2]].map(q => new THREE.Vector2(q[0] * k, q[1] * k)), 12), T.bark); trunk.castShadow = trunk.receiveShadow = true; g.add(trunk);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + R(), b = bar(_v(0, (2.4 + R() * 1.2) * k, 0), _v(Math.cos(a) * 1.2 * k, (3.4 + R()) * k, Math.sin(a) * 1.2 * k), 0.06 * k, T.bark, 6); g.add(b); }
  const n = 7 + Math.floor(R() * 4); for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, r = (0.4 + R() * 1.2) * k, y = (3.6 + R() * 2.0) * k, s = (0.9 + R() * 0.8) * k, l = new THREE.Mesh(leafBlob(seed + i), T.leaf[(seed + i) % 4]);
    l.position.set(Math.cos(a) * r, y, Math.sin(a) * r); l.scale.setScalar(s); l.rotation.set(R() * 3, R() * 3, R() * 3); l.castShadow = l.receiveShadow = true; g.add(l); }
  return g; }
// ---- farola de hierro con farol, banco de listones, papelera, seto
function lampPost() { const g = new THREE.Group(); ad(g, cyl(0.09, 0.12, 0.4, T.iron, 16)).position.y = 0.2; const p = cyl(0.05, 0.065, 3.6, T.iron, 12); p.position.y = 2.2; g.add(p);
  const arm = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 16, Math.PI), T.iron); arm.position.set(0.28, 4.0, 0); g.add(arm);
  const lan = new THREE.Group(); lan.position.set(0.56, 3.72, 0); g.add(lan); ad(lan, cyl(0.06, 0.16, 0.12, T.iron, 6)).position.y = 0.08; const gl = cyl(0.13, 0.09, 0.3, T.lampGlow, 6); gl.position.y = -0.12; lan.add(gl); ad(lan, cyl(0.1, 0.05, 0.06, T.iron, 6)).position.y = -0.3;
  shadowAll(g, true, true); return g; }
function bench() { const g = new THREE.Group(), w = stdM(0x8a5a34, 0.7); for (let i = 0; i < 4; i++) g.add(box(1.7, 0.035, 0.09, w, 0, 0.45, -0.18 + i * 0.12)); for (let i = 0; i < 3; i++) { const b = box(1.7, 0.09, 0.035, w, 0, 0.62 + i * 0.12, -0.26); b.rotation.x = -0.15; g.add(b); }
  for (const x of [-0.7, 0.7]) { g.add(box(0.06, 0.45, 0.06, T.iron, x, 0.22, 0.15)); g.add(box(0.06, 0.9, 0.06, T.iron, x, 0.45, -0.24)); g.add(box(0.06, 0.06, 0.46, T.iron, x, 0.42, -0.04)); } return g; }
function hedge(w, d, h) { return rboxM(w, h, d, Math.min(0.25, h * 0.4), T.hedge, 2); }

// ---- el pedestal del centro de la plaza (mármol, canto de oro, placa) y la estatua de oro que aparecerá
function pedestal() { const g = new THREE.Group(), mt = texOf(marbleCanvas(31, 512, false), [1, 1]), mar = new THREE.MeshPhysicalMaterial({ color: 0xf6f2ea, map: mt, roughness: 0.22, clearcoat: 0.5, clearcoatRoughness: 0.15 });
  ad(g, cyl(1.75, 1.85, 0.25, stdM(0xcfc8bb, 0.6), 48)).position.y = 0.125; ad(g, cyl(1.45, 1.5, 0.2, mar, 48)).position.y = 0.35;
  const prof = [[0.95, 0], [0.95, 0.12], [0.82, 0.22], [0.8, 0.3], [0.68, 0.36], [0.66, 1.9], [0.78, 1.98], [0.8, 2.08], [0.92, 2.16], [0.92, 2.3], [0, 2.3]];
  const col = new THREE.Mesh(new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0], q[1])), 4, Math.PI / 4), mar); col.position.y = 0.45; col.castShadow = col.receiveShadow = true; g.add(col);
  ad(g, box(1.42, 0.08, 1.42, T.gold, 0, 2.8, 0)); ad(g, box(1.36, 0.06, 1.36, T.gold, 0, 0.85, 0));
  const plates = []; for (const [rx, x, z] of [[0, 0, 0.475], [Math.PI / 2, 0.475, 0], [Math.PI, 0, -0.475], [-Math.PI / 2, -0.475, 0]]) { const pl = signPlane(0.78, 0.42, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e6bf5c'); gr.addColorStop(1, '#a87c26'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = '#6e4c12'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#4a3108'; c.font = '900 150px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', w / 2, h / 2 + 8); }, { metal: 0.85, r: 0.3 });
    pl.position.set(x, 1.62, z); pl.rotation.y = rx; g.add(pl); plates.push(pl); }
  g.userData.plates = plates; g.userData.top = 2.84; shadowAll(g); return g; }
// la estatua de oro: una persona de pie con el brazo en alto, toda de oro pulido (aparece al final)
function goldStatue() { const p = person({ seed: 777, hairStyle: 'short', topType: 'long' }), gold = new THREE.MeshStandardMaterial({ color: 0xffc95a, roughness: 0.18, metalness: 1 });
  p.traverse(o => { if (o.isMesh) o.material = gold; }); poseReset(p); const J = p.userData.J; J.shR.rotation.z = 2.7; J.elR.rotation.z = 0.3; J.shL.rotation.z = -0.25; J.shL.rotation.x = -0.2; J.head.rotation.x = -0.12; J.hpL.rotation.x = -0.1; J.knL.rotation.x = 0.15;
  p.scale.setScalar(1.25); return p; }
