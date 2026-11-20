// ---------------------------------------------------------------- LA IMPLANTACIÓN (lámina del brazo robótico): cuatro herramientas cromadas con aros de luz cian bajan desde arriba,
// cada una con un chip de 8 × 8 agujas, y lo colocan en la corteza del habla del cerebro rosa. Medidas de los chips en mm (≈ 3,2 mm de lado, agujas de 1,5 mm),
// a la escala del cerebro.
const CHIPMM = { side: 3.2, n: 8, len: 1.5, base: 0.35 };
function chipMM() { const g = new THREE.Group(), C = CHIPMM;
  const base = new THREE.Mesh(new THREE.BoxGeometry(C.side, C.base, C.side), new THREE.MeshPhysicalMaterial({ color: 0xbfd6e6, roughness: 0.12, metalness: 0.3, transmission: 0.0, clearcoat: 1, emissive: 0x0b2236, emissiveIntensity: 0.9,
    map: canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#6f8ea6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffd27a'; c.lineWidth = 3; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = 16 + i * 32, y = 16 + j * 32; c.beginPath(); c.arc(x, y, 7, 0, 7); c.stroke(); } c.strokeStyle = '#9fe6ff'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); }) }));
  base.position.y = C.base / 2; g.add(base);
  const ng = new THREE.ConeGeometry(0.09, C.len, 10); ng.translate(0, -C.len / 2, 0); ng.rotateX(Math.PI);                       // punta hacia abajo
  const nm = new THREE.InstancedMesh(ng, new THREE.MeshStandardMaterial({ color: 0xe9eef3, roughness: 0.15, metalness: 1.0, emissive: 0x223344, emissiveIntensity: 0.5 }), C.n * C.n); const m4 = new THREE.Matrix4(), st = C.side / C.n; let k = 0;
  for (let i = 0; i < C.n; i++) for (let j = 0; j < C.n; j++) { m4.makeTranslation(-C.side / 2 + st * (i + 0.5), -C.len / 2, -C.side / 2 + st * (j + 0.5)); nm.setMatrixAt(k++, m4); } g.add(nm);
  // haz de cables (sale del chip hacia arriba)
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6, 10), new THREE.MeshStandardMaterial({ color: 0xd4a84a, roughness: 0.3, metalness: 0.9, emissive: 0x3a2008, emissiveIntensity: 0.6 })); wire.position.set(C.side / 2 - 0.3, C.base + 3, 0); wire.visible = false; g.add(wire);
  const halo = glowSprite(0x7fd8ff, C.side * 2.4, 0); halo.position.y = C.base; g.add(halo);
  g.userData = { base, nm, halo, wire }; return g; }
// herramienta cromada (cuerpo largo, anillos, aro de luz y boquilla); la punta está en el origen y el cuerpo sube por +y
function tool() { const g = new THREE.Group(), chrome = new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.12, metalness: 1.0 }), dark = new THREE.MeshStandardMaterial({ color: 0x15191f, roughness: 0.35, metalness: 0.8 }), led = addM(new THREE.Color(0.25, 0.9, 1.0).multiplyScalar(2.4), 1);
  const r = 0.02; const add = (m, y) => { m.position.y = y; g.add(m); return m; };
  add(cyl(r * 0.25, r * 0.55, r * 1.6, chrome, 24), r * 0.8); add(cyl(r * 0.75, r * 0.75, r * 0.5, dark, 32), r * 1.85); add(new THREE.Mesh(new THREE.TorusGeometry(r * 0.78, r * 0.08, 10, 40), led), r * 1.85).rotation.x = Math.PI / 2;
  add(cyl(r, r, r * 3, chrome, 32), r * 3.6); add(cyl(r * 1.08, r * 1.08, r * 0.35, dark, 32), r * 5.3); add(new THREE.Mesh(new THREE.TorusGeometry(r * 1.1, r * 0.07, 10, 40), led), r * 5.3).rotation.x = Math.PI / 2;
  add(cyl(r * 0.9, r * 0.9, 1.2, chrome, 32), r * 5.5 + 0.6); const tipL = glowSprite(0x7fefff, r * 3, 0.9); tipL.position.y = r * 0.1; g.add(tipL);
  g.userData = { tipL }; return g; }
function buildArms(head) { const U = head.userData, g = new THREE.Group(), A = g.userData; head.add(g);
  const n = U.speechNW.clone(), up = _v().set(0, 1, 0), t1 = _v().crossVectors(n, up).normalize(), t2 = _v().crossVectors(n, t1).normalize(), BS = U.brain.scale.x, sp = 5.2 * BS;
  A.spots = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => U.speech.clone().addScaledVector(t1, a * sp / 2).addScaledVector(t2, b * sp / 2));
  A.n = n; A.q = new THREE.Quaternion().setFromUnitVectors(_v().set(0, 1, 0), n);
  A.chips = A.spots.map(() => { const c = chipMM(); c.scale.setScalar(BS); g.add(c); return c; });
  A.tools = A.spots.map((p, i) => { const t = tool(); t.traverse(o => o.renderOrder = 4); g.add(t); return t; }); A.chips.forEach(c => c.traverse(o => o.renderOrder = 4));
  // luces del quirófano (solo cuando el cerebro es rosa)
  A.lights = new THREE.Group(); g.add(A.lights); const k1 = new THREE.PointLight(0xfff0e6, 0, 6, 1.4); k1.position.copy(U.speech).addScaledVector(n, 0.9).add(_v().set(0, 0.6, 0.3)); const k2 = new THREE.PointLight(0x5fd8ff, 0, 4, 1.6); k2.position.copy(U.speech).addScaledVector(n, 0.4).add(_v().set(0, -0.3, -0.5));
  const k3 = new THREE.PointLight(0xffd0d8, 0, 6, 1.4); k3.position.set(-1.2, 1.6, 1.2); A.lights.add(k1, k2, k3); A.L = [k1, k2, k3];
  return g; }
// kk[i] = 0 arriba (lejos) … 1 chip colocado; out = la herramienta se retira tras soltarlo; ins = cuánto han entrado las agujas (0–1)
function armsAt(head, t, o) { const U = head.userData, A = head.userData.arms.userData, BS = U.brain.scale.x, Lr = o.lights ?? 0;
  A.L[0].intensity = 1.5 * Lr; A.L[1].intensity = 1.4 * Lr; A.L[2].intensity = 0.6 * Lr;
  A.spots.forEach((p, i) => { const k = o.k[i], out = o.out[i], T = A.tools[i], C = A.chips[i], L = CHIPMM.len * BS, Bh = CHIPMM.base * BS;
    const sway = _v().set(Math.sin(i * 1.7) * 0.05, 0, Math.cos(i * 2.1) * 0.05).multiplyScalar(1 - sm5(k));
    T.position.copy(p).addScaledVector(A.n, L + Bh + 0.25 * (1 - sm5(k)) + 0.45 * sm5(out)).add(sway); T.quaternion.copy(A.q); T.visible = (o.a ?? 1) > 0.01 && out < 0.999;
    const ins = sm5(o.ins ?? 0); C.visible = (o.a ?? 1) > 0.01 && (o.showChips ?? 1) > 0; C.quaternion.copy(A.q);
    if (k < 0.999) C.position.copy(T.position).addScaledVector(A.n, -Bh); else C.position.copy(p).addScaledVector(A.n, L * (1 - ins));
    C.userData.halo.material.opacity = Math.min(1, o.glow ?? 0) * (0.6 + 0.4 * Math.sin(t * 6 + i)); C.userData.halo.scale.setScalar(CHIPMM.side * 2.4 * (1 + 3.5 * (o.big ?? 0))); T.userData.tipL.material.opacity = 0.9 * (1 - out); }); }   // big: al final los chips brillan desde lejos (la voz sale de ahí)
