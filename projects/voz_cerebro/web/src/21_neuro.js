// ---------------------------------------------------------------- LAS NEURONAS (en NEU), como la lámina de Javi: cuerpos azules translúcidos con el núcleo de oro, ramas azules con motas de oro,
// una sinapsis en el centro con la chispa dorada entre los dos botones, y neuronas desenfocadas al fondo. Entra la punta de un electrodo (aguja plateada con la punta de oro)
// que «escucha»: cuando una neurona dispara, la chispa viaja hasta la punta, que se enciende, y la señal sube por la aguja.
const NEU = new THREE.Vector3(0, 0, -400);
function neuronCell(seed, R = 0.32, o = {}) { const g = new THREE.Group(), curves = [];
  const memb = holoMat(new THREE.Color(0.38, 0.6, 1.0), 1, { edge: 1.5, col2: new THREE.Color(0.14, 0.22, 0.62), scan: 0 });
  const soma = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), memb); soma.scale.set(1, 1.12, 0.95); g.add(soma);
  const nucG = glowSprite(0xffa040, R * 3.0, 0.85); g.add(nucG); const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.3, 24, 16), addM(new THREE.Color(1.0, 0.72, 0.35).multiplyScalar(1.8), 0.95)); g.add(core);
  const dm = holoMat(new THREE.Color(0.38, 0.62, 1.0), 0.95, { edge: 1.3, col2: new THREE.Color(0.12, 0.22, 0.65), scan: 0 });
  const branch = (o0, dir, len, r0, depth, sd) => { const pts = [o0.clone()]; let p = o0.clone(), d = dir.clone().normalize(); const k = 7;
    for (let i = 1; i <= k; i++) { d.add(_v().set(hash(sd * 7 + i) - 0.5, hash(sd * 11 + i) - 0.5, hash(sd * 13 + i) - 0.5).multiplyScalar(0.5)).normalize(); p = p.clone().addScaledVector(d, len / k); pts.push(p); }
    const c = new THREE.CatmullRomCurve3(pts); curves.push(c); const tg = new THREE.TubeGeometry(c, 48, r0, 10), pp = tg.attributes.position, uv = tg.attributes.uv;
    for (let i = 0; i < pp.count; i++) { const u = uv.getX(i), cc = c.getPointAt(u), sc = 1 - 0.82 * u; pp.setXYZ(i, cc.x + (pp.getX(i) - cc.x) * sc, cc.y + (pp.getY(i) - cc.y) * sc, cc.z + (pp.getZ(i) - cc.z) * sc); } tg.computeVertexNormals();
    g.add(new THREE.Mesh(tg, dm)); if (depth > 0) for (let j = 0; j < 2; j++) { const at = 0.4 + j * 0.3; branch(c.getPointAt(at), c.getTangentAt(at).add(_v().set(hash(sd + j) - 0.5, hash(sd * 2 + j) - 0.5, hash(sd * 3 + j) - 0.5).multiplyScalar(1.5)), len * 0.55, r0 * 0.55, depth - 1, sd * 1.7 + j * 3.3); } };
  const nd = o.nd ?? (5 + Math.floor(hash(seed * 3.1) * 3));
  for (let i = 0; i < nd; i++) { const a = i / nd * Math.PI * 2 + hash(seed + i) * 0.6, el = (hash(seed * 5 + i) - 0.4) * 1.3, d = _v().set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); branch(d.clone().multiplyScalar(R * 0.85), d, 1.7 + hash(seed * 9 + i) * 1.4, R * 0.26, 2, seed * 31 + i * 7); }
  // motas de oro sobre las ramas (como en la lámina)
  const dots = []; curves.forEach((c, i) => { for (let k = 0; k < 3; k++) { const u = hash(seed * 17 + i * 5 + k); if (u < 0.15) continue; const s = glowSprite(0xffc070, 0.07 + hash(i + k) * 0.06, 0.85); s.position.copy(c.getPointAt(u)); g.add(s); dots.push(s); } });
  g.userData = { curves, nucG, core, memb, dm, R, dots }; return g; }
// el botón de una sinapsis (el extremo bulboso del axón), con vesículas de oro dentro
function synBouton(dir, len = 2.4) { const g = new THREE.Group(), memb = holoMat(new THREE.Color(0.4, 0.62, 1.0), 1, { edge: 1.4, col2: new THREE.Color(0.14, 0.24, 0.66), scan: 0 });
  const pr = [[0.0, 0], [0.42, 0.05], [0.52, 0.28], [0.44, 0.55], [0.22, 0.8], [0.12, 1.1], [0.1, len]].map(q => new THREE.Vector2(q[0], q[1])); const m = new THREE.Mesh(new THREE.LatheGeometry(pr, 40), memb); g.add(m);
  const ves = []; for (let i = 0; i < 26; i++) { const s = glowSprite(i % 3 ? 0xffb040 : 0xffe0a0, 0.07 + hash(i * 3) * 0.05, 0.9); s.position.set((hash(i) - 0.5) * 0.6, 0.12 + hash(i * 2) * 0.45, (hash(i * 5) - 0.5) * 0.6); g.add(s); ves.push(s); }
  g.quaternion.setFromUnitVectors(_v().set(0, 1, 0), dir.clone().normalize()); g.userData = { ves, memb }; return g; }
function buildNeuro() { const g = new THREE.Group(), U = g.userData; g.position.copy(NEU);
  // la sinapsis en el centro: dos botones casi tocándose (hueco de 0,18) y la chispa entre ellos
  U.b1 = synBouton(_v().set(-1, 0.25, 0.1)); U.b1.position.set(-0.11, 0, 0); g.add(U.b1);
  U.b2 = synBouton(_v().set(1, -0.2, -0.1)); U.b2.position.set(0.11, 0, 0); g.add(U.b2);
  U.spark = glowSprite(0xffd070, 1.6, 0); g.add(U.spark); U.spark2 = glowSprite(0xffffff, 0.5, 0); g.add(U.spark2);
  U.rays = new THREE.Group(); for (let i = 0; i < 10; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.02), addM(new THREE.Color(1.0, 0.8, 0.4).multiplyScalar(2), 0)); r.rotation.z = i / 10 * Math.PI; U.rays.add(r); } g.add(U.rays);
  // neuronas alrededor (las cercanas, nítidas; las del fondo, más grandes y desenfocadas por la profundidad de campo)
  U.cells = []; const P = [[-2.6, 1.4, -0.8, 0.42], [2.4, 1.6, -1.2, 0.36], [2.0, -1.8, -0.4, 0.34], [-2.2, -2.0, -1.4, 0.3], [0.4, 3.0, -2.6, 0.32], [-3.6, -0.2, -3.5, 0.4], [3.8, 0.2, -3.8, 0.38], [0.2, -3.4, -2.8, 0.34], [-1.2, 2.6, -5, 0.45], [1.8, -0.4, -6, 0.5], [-4.6, 2.8, -7, 0.5], [4.4, -3.0, -7.5, 0.55]];
  P.forEach((q, i) => { const c = neuronCell(i + 3, q[3]); c.position.set(q[0], q[1], q[2]); c.rotation.set(hash(i) * 3, hash(i * 2) * 3, hash(i * 5) * 3); g.add(c); U.cells.push(c); });
  // chispas que viajan por las ramas
  U.sparks = []; for (let i = 0; i < 40; i++) { const s = glowSprite(i % 4 ? 0xffc060 : 0xa0e0ff, 0.26, 0); g.add(s); U.sparks.push(s); }
  // el electrodo: una aguja que baja desde arriba; su punta queda junto a la neurona 0
  const nd = new THREE.Group(), L = 6; const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.012, L, 32), new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.15, metalness: 1.0, emissive: 0x1a2a3a, emissiveIntensity: 0.6 }));
  cone.position.y = L / 2; nd.add(cone); U.tipM = addM(new THREE.Color(1.0, 0.78, 0.35).multiplyScalar(2.2), 0.6); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), U.tipM); nd.add(tip); U.tipG = glowSprite(0xffc060, 0.6, 0); nd.add(U.tipG);
  const sig = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L, 8, 1, true), new THREE.ShaderMaterial({ vertexShader: PATH_VS, fragmentShader: PATH_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, alive: { value: 1 }, op: { value: 0 }, speed: { value: 2.5 }, col: { value: GOLD.clone() } } })); sig.position.y = L / 2; nd.add(sig); U.sig = sig;
  nd.position.set(-1.55, 0.95, 0.3); nd.rotation.z = -0.35; g.add(nd); U.needle = nd;
  U.target = U.cells[0]; return g; }
// k = 1: la neurona del electrodo dispara; fire = actividad general; a = brillo de todo
function neuroAt(N, t, o) { const U = N.userData, a = o.a ?? 1; N.visible = a > 0.01; if (!N.visible) return;
  const sp = o.syn ?? 0, ph = (t * 1.3) % 1, flash = Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 6) * sp;
  U.spark.material.opacity = (0.25 + 0.75 * flash) * sp * a; U.spark.scale.setScalar(0.9 + 1.2 * flash); U.spark2.material.opacity = flash * a; U.rays.children.forEach((r, i) => { r.material.opacity = flash * 0.5 * a * (0.5 + 0.5 * hash(i + Math.floor(t * 8))); r.scale.x = 0.4 + flash * (0.6 + hash(i) * 0.8); });
  [U.b1, U.b2].forEach(b => b.userData.ves.forEach((v, i) => { v.material.opacity = a * (0.5 + 0.5 * Math.sin(t * 3 + i)); }));
  // chispas por las ramas
  let k = 0; U.cells.forEach((c, ci) => { c.userData.memb.uniforms.op.value = a; c.userData.dm.uniforms.op.value = a * 0.95; c.userData.nucG.material.opacity = 0.85 * a * (1 + 0.5 * (o.fire ?? 0) * Math.max(0, Math.sin(t * 7 + ci)));
    c.userData.dots.forEach(d => d.material.opacity = 0.85 * a); c.updateMatrixWorld(true);
    for (let j = 0; j < 3 && k < U.sparks.length; j++, k++) { const cv = c.userData.curves[(j * 3 + ci) % c.userData.curves.length], u = (t * (0.35 + 0.2 * hash(ci * 3 + j)) + hash(ci + j * 7)) % 1, s = U.sparks[k];
      s.position.copy(c.localToWorld(cv.getPointAt(1 - u))).sub(NEU); s.material.opacity = a * (o.fire ?? 0.4) * Math.sin(u * Math.PI); } });
  // la punta del electrodo: se enciende cuando le llega la chispa de la neurona 0
  const lis = o.listen ?? 0, beat = Math.pow(Math.max(0, Math.sin(t * 5.2)), 8) * lis; U.tipM.opacity = (0.4 + 0.6 * beat) * a; U.tipG.material.opacity = (0.15 + 0.85 * beat) * a * lis; U.tipG.scale.setScalar(0.4 + 0.6 * beat);
  U.sig.material.uniforms.op.value = lis * a; U.sig.material.uniforms.time.value = t; U.needle.children[0].material.opacity = a; }
