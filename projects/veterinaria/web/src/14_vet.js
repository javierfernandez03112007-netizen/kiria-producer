// ---------------------------------------------------------------- «Veterinaria por dentro»: materiales y piezas (la clínica en miniatura con su pared que revienta,
// camilla, frasco y jeringas, garrapata y microbios, granja con silo, pienso y ADN, quirófano, supermercado y matadero, útero y arco de rayos X)
function buildVetMats() {
  M.tile = new THREE.MeshPhysicalMaterial({ map: canvasTex(512, 512, (g, w, h) => { const n = 8; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 222 + Math.round(hash(i * 7.1 + j * 3.3) * 14) - ((i + j) % 2 ? 22 : 0); g.fillStyle = `rgb(${v},${v - 1},${v - 4})`; g.fillRect(i * w / n, j * h / n, w / n, h / n); }
    g.strokeStyle = 'rgba(90,90,96,.55)'; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w / n, 0); g.lineTo(i * w / n, h); g.moveTo(0, i * h / n); g.lineTo(w, i * h / n); g.stroke(); } }), roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  M.plaster = new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e4dfd6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '255,255,255' : '120,110,100'},${0.03 + hash(i * 3.3) * 0.05})`; g.fillRect(hash(i * 1.7) * w, hash(i * 2.9) * h, 2, 2); } }), roughness: 0.82 });
  M.plasterIn = new THREE.MeshStandardMaterial({ color: 0x9c8f80, roughness: 0.95 });
  M.band = new THREE.MeshPhysicalMaterial({ color: 0x3c6f78, roughness: 0.45, clearcoat: 0.5 });
  M.steelB = metal(0xd3d9e0, 0.26);
  M.barnR = new THREE.MeshPhysicalMaterial({ color: 0x8c2a22, roughness: 0.5, clearcoat: 0.4 });
  M.roofG = new THREE.MeshPhysicalMaterial({ color: 0x3b3f46, roughness: 0.55, clearcoat: 0.3 });
  M.trim = new THREE.MeshPhysicalMaterial({ color: 0xf2f0ea, roughness: 0.4, clearcoat: 0.5 });
  M.hay = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9b45a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.strokeStyle = `rgba(${hash(i) > 0.5 ? '255,236,170' : '150,110,40'},.5)`; g.lineWidth = 1.5; const x = hash(i * 1.3) * w, y = hash(i * 2.7) * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + hash(i * 5.1) * 30, y + (hash(i * 7.7) - 0.5) * 8); g.stroke(); } }), roughness: 0.92 });
  M.pellet = new THREE.MeshStandardMaterial({ color: 0x7a5532, roughness: 0.8 });
  M.foam = new THREE.MeshStandardMaterial({ color: 0xf5f5f2, roughness: 0.75 });
  M.meat = new THREE.MeshPhysicalMaterial({ map: canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#7c1119'; g.fillRect(0, 0, w, h); for (let i = 0; i < 18; i++) { let x = hash(i * 4.1) * w, y = hash(i * 8.7) * h, a = hash(i * 2.9) * 6.28; g.strokeStyle = 'rgba(240,215,205,.55)'; g.lineWidth = 1 + hash(i * 6.3) * 2; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 24; k++) { a += (hash(i * 31 + k * 1.3) - 0.5) * 0.9; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = 'rgba(245,232,214,.95)'; g.fillRect(0, h - 40, w, 40); }), roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 });
  M.wrap = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.07, clearcoat: 1, depthWrite: false });
  M.concrete = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9a9c9f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '255,255,255' : '40,40,40'},${0.04 + hash(i * 3.1) * 0.06})`; g.fillRect(hash(i * 1.9) * w, hash(i * 2.3) * h, 3, 3); } }), roughness: 0.9 });
  M.tickM = new THREE.MeshPhysicalMaterial({ color: 0x4a2c20, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  M.tickD = new THREE.MeshPhysicalMaterial({ color: 0x1e1410, roughness: 0.4, clearcoat: 0.6 });
  M.germ = new THREE.MeshStandardMaterial({ color: 0x0a1a0e, emissive: 0x7dff6a, emissiveIntensity: 1.6, roughness: 0.4 });
  M.germ2 = new THREE.MeshStandardMaterial({ color: 0x1a0a14, emissive: 0xff5ab4, emissiveIntensity: 1.5, roughness: 0.4 });
  M.drape = new THREE.MeshPhysicalMaterial({ color: 0x2f7d6b, roughness: 0.8, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x8fe0c8), side: THREE.DoubleSide });
  M.helmet = plastic(0xf4f4f1, 0.28);
  M.grass = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3f6b2a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '120,170,70' : '30,60,20'},.35)`; g.fillRect(hash(i * 1.3) * w, hash(i * 2.1) * h, 2, 3); } }), roughness: 0.9 });
}
// ---------- pared que revienta: rejilla irregular de trozos (cada uno extruido, con su centro y su velocidad para la explosión)
function wallShards(w, h, nx, ny, thick, seed = 1) {
  const P = []; for (let i = 0; i <= nx; i++) { P.push([]); for (let j = 0; j <= ny; j++) { let x = i / nx * w - w / 2, y = j / ny * h - h / 2;
    if (i > 0 && i < nx) x += (hash(i * 13.1 + j * 7.7 + seed) - 0.5) * w / nx * 0.7; if (j > 0 && j < ny) y += (hash(i * 3.7 + j * 11.3 + seed) - 0.5) * h / ny * 0.7; P[i].push(new THREE.Vector2(x, y)); } }
  const out = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const q = [P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1]], c = q.reduce((a, b) => a.clone().add(b), new THREE.Vector2()).multiplyScalar(0.25);
    const split = hash(i * 5.3 + j * 9.1 + seed) > 0.55, polys = split ? (hash(i + j * 3 + seed) > 0.5 ? [[q[0], q[1], q[2]], [q[0], q[2], q[3]]] : [[q[0], q[1], q[3]], [q[1], q[2], q[3]]]) : [q];
    for (const poly of polys) {
      const pc = poly.reduce((a, b) => a.clone().add(b), new THREE.Vector2()).multiplyScalar(1 / poly.length);
      const sh = new THREE.Shape(poly.map(p => p.clone().sub(pc).multiplyScalar(0.985)));
      const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false }); g.translate(0, 0, -thick / 2);
      const m = new THREE.Mesh(g, [M.plaster, M.plasterIn]); m.castShadow = true; m.receiveShadow = true;
      m.userData = { c: new THREE.Vector3(pc.x, pc.y, 0), r: Math.hypot(pc.x / (w / 2), pc.y / (h / 2)), k: hash(i * 2.1 + j * 4.3 + seed * 1.7), k2: hash(i * 6.7 + j * 1.9 + seed * 3.1) };
      out.push(m);
    }
  }
  return out;
}
// ---------- camilla de exploración (acero) con columna hidráulica
function examTable(s = 1) {
  const g = new THREE.Group();
  const top = rbox(0.56, 0.3, 0.03, M.steelB, 0.02); top.rotation.x = -Math.PI / 2; top.position.y = 0.215; g.add(top);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 6, 4), M.steelB); lip.visible = false; g.add(lip);
  g.add(at(cyl(0.035, 0.045, 0.18, M.steelB, 24), 0, 0.11, 0)); g.add(at(cyl(0.12, 0.13, 0.02, M.enamel, 32), 0, 0.01, 0));
  g.add(at(cyl(0.05, 0.05, 0.03, M.enamel, 24), 0, 0.19, 0));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.scale.setScalar(s); return g;
}
// ---------- frasco de medicamento inyectable (vidrio, tapón de goma, cápsula de aluminio, etiqueta)
function vial(s = 1) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.05, 0], [0.053, 0.008], [0.053, 0.11], [0.046, 0.125], [0.022, 0.135], [0.02, 0.15], [0, 0.15]], 48, M.dish));
  const liq = lathe([[0, 0.004], [0.049, 0.004], [0.05, 0.01], [0.05, 0.085], [0, 0.085]], 40, new THREE.MeshPhysicalMaterial({ color: 0xf2c75a, roughness: 0.05, transparent: true, opacity: 0.75, clearcoat: 1, emissive: 0x3a2a05 })); g.add(liq);
  g.add(at(cyl(0.026, 0.026, 0.02, metal(0xc9ced6, 0.25), 32), 0, 0.158, 0)); g.add(at(cyl(0.02, 0.02, 0.006, plastic(0xc8323a, 0.35), 24), 0, 0.17, 0));
  const lt = canvasTex(512, 200, (c, w, h) => { c.fillStyle = '#f6f4ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b2a4a'; c.fillRect(0, 0, w, 34); c.fillStyle = '#ffffff'; c.font = '800 24px Inter'; c.textAlign = 'center'; c.fillText('USO VETERINARIO', w / 2, 25);
    c.fillStyle = '#1b2a4a'; c.font = '900 64px Inter'; c.fillText('FÁRMACO', w / 2, 110); c.font = '600 26px Inter'; c.fillText('mg / kg · EJEMPLO', w / 2, 160); });
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0535, 0.0535, 0.07, 48, 1, true, -1.3, 2.6), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.6 })); lab.position.y = 0.055; g.add(lab);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// ---------- jeringa con el líquido que se llena (fill 0–1) y el émbolo que se mueve; a lo largo de +x, aguja a la derecha
function syringeV(s = 1) {
  const g = new THREE.Group(), L = 0.14;
  const barrel = cyl(0.012, 0.012, L, M.dish, 24); barrel.rotation.z = Math.PI / 2; g.add(barrel);
  for (let i = 0; i <= 10; i++) { const tk = mesh(new THREE.BoxGeometry(0.0012, 0.004, 0.001), new THREE.MeshBasicMaterial({ color: 0x2a3a5a })); tk.position.set(-L / 2 + 0.01 + i * 0.012, 0.0085, 0.0085); g.add(tk); }
  const liq = cyl(0.0105, 0.0105, 1, new THREE.MeshPhysicalMaterial({ color: 0xf2c75a, roughness: 0.05, transparent: true, opacity: 0.85, emissive: 0x3a2a05 }), 20); liq.rotation.z = Math.PI / 2; g.add(liq);
  const pl = new THREE.Group(); g.add(pl);
  pl.add(at(cyl(0.0105, 0.0105, 0.008, plastic(0x22252b, 0.4), 20), 0, 0, 0, 0, 0, Math.PI / 2)); pl.add(at(cyl(0.004, 0.004, 0.12, plastic(0xf4f4f2, 0.4), 10), -0.064, 0, 0, 0, 0, Math.PI / 2));
  pl.add(at(cyl(0.016, 0.016, 0.004, plastic(0xf4f4f2, 0.4), 20), -0.125, 0, 0, 0, 0, Math.PI / 2));
  g.add(at(cyl(0.017, 0.017, 0.004, plastic(0xf4f4f2, 0.4), 20), -L / 2, 0, 0, 0, 0, Math.PI / 2));
  g.add(at(cyl(0.004, 0.003, 0.012, plastic(0x2b78c4, 0.3), 12), L / 2 + 0.006, 0, 0, 0, 0, Math.PI / 2)); g.add(at(cyl(0.0012, 0.0012, 0.06, M.chrome, 6), L / 2 + 0.042, 0, 0, 0, 0, Math.PI / 2));
  g.userData.setFill = f => { const ff = clamp(f) * (L - 0.012); liq.visible = ff > 0.001; liq.scale.set(1, Math.max(0.0001, ff), 1); liq.position.x = L / 2 - 0.004 - ff / 2; pl.position.x = L / 2 - 0.008 - ff; };
  g.userData.setFill(0); g.scale.setScalar(s); return g;
}
// ---------- garrapata (cuerpo ovalado brillante, escudo, cabeza y ocho patas) mirando a +z
function tick(s = 1) {
  const g = new THREE.Group();
  const body = sph(0.05, M.tickM, 28, 18); body.scale.set(0.8, 0.42, 1); body.position.y = 0.03; g.add(body);
  const shield = sph(0.03, M.tickD, 20, 12); shield.scale.set(0.9, 0.35, 0.8); shield.position.set(0, 0.046, 0.025); g.add(shield);
  const head = sph(0.014, M.tickD, 14, 10); head.scale.set(1, 0.7, 1.4); head.position.set(0, 0.03, 0.058); g.add(head);
  const legs = [];
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const z = 0.03 - i * 0.02, l = new THREE.Group(); l.position.set(sd * 0.03, 0.028, z); g.add(l);
    const a = v3(0, 0, 0), b = v3(sd * 0.035, 0.02, (1.5 - i) * 0.012), c = v3(sd * 0.06, -0.025, (1.5 - i) * 0.022); l.add(tube([a, b, c], 0.0035, M.tickD, 12, false, 6)); legs.push(l); }
  g.userData.legs = legs; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// ---------- microbio: esfera que brilla con pinchos (una sola malla)
function microbe(r = 0.012, m = M.germ) {
  const gs = [new THREE.IcosahedronGeometry(r, 2)];
  for (let i = 0; i < 14; i++) { const d = v3(hash(i * 3.3) - 0.5, hash(i * 7.1) - 0.5, hash(i * 1.9) - 0.5).normalize(); const c = new THREE.CylinderGeometry(r * 0.12, r * 0.12, r * 0.7, 5); c.translate(0, r * 1.2, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d)); gs.push(c); const k = new THREE.SphereGeometry(r * 0.22, 6, 4); k.translate(0, r * 1.55, 0); k.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d)); gs.push(k); }
  return new THREE.Mesh(mergeGeometries(gs.map(g => { const q = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(q.attributes)) if (!['position', 'normal'].includes(k)) q.deleteAttribute(k); return q; })), m);
}
// ---------- granja: establo rojo con tejado a dos aguas, silo, valla, pacas, comedero con pienso y la doble hélice del ADN
function barn(s = 1) {
  const g = new THREE.Group(), w = 0.5, d = 0.36, h = 0.26;
  g.add(at(mesh(new THREE.BoxGeometry(w, h, d), M.barnR), 0, h / 2, 0));
  const sh = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.03, 0), new THREE.Vector2(w / 2 + 0.03, 0), new THREE.Vector2(0, 0.17)]);
  const gab = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, 0.15)]), { depth: d, bevelEnabled: false }); gab.translate(0, h, -d / 2); g.add(mesh(gab, M.barnR));
  for (const sd of [-1, 1]) { const r = mesh(new THREE.BoxGeometry(Math.hypot(w / 2 + 0.04, 0.16) + 0.02, 0.016, d + 0.06), M.roofG); r.position.set(sd * (w / 4 + 0.01), h + 0.085, 0); r.rotation.z = -sd * Math.atan2(0.16, w / 2 + 0.04); g.add(r); }
  const door = mesh(new THREE.BoxGeometry(0.16, 0.18, 0.006), M.barnR); door.position.set(0, 0.09, d / 2 + 0.003); g.add(door);
  for (const [x0, y0, x1, y1] of [[-0.08, 0, -0.08, 0.18], [0.08, 0, 0.08, 0.18], [-0.08, 0.18, 0.08, 0.18], [-0.08, 0, 0.08, 0.18], [-0.08, 0.18, 0.08, 0]]) g.add(bar(v3(x0, y0, d / 2 + 0.008), v3(x1, y1, d / 2 + 0.008), 0.006, M.trim, 6));
  g.add(at(mesh(new THREE.BoxGeometry(0.07, 0.06, 0.006), M.trim), 0, 0.3, d / 2 + 0.004)); g.add(at(mesh(new THREE.BoxGeometry(0.06, 0.05, 0.007), M.black), 0, 0.3, d / 2 + 0.005));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.scale.setScalar(s); return g;
}
function silo(s = 1) {
  const g = new THREE.Group(); g.add(at(cyl(0.085, 0.085, 0.5, metal(0xc5cbd2, 0.32), 40), 0, 0.25, 0));
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.087, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), metal(0xd8dde3, 0.25)), 0, 0.5, 0));
  for (let i = 1; i < 7; i++) g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.003, 6, 40), M.dsteel), 0, i * 0.07, 0, 0, Math.PI / 2));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.scale.setScalar(s); return g;
}
function fence(len = 0.6, n = 5) { const g = new THREE.Group(); for (let i = 0; i <= n; i++) g.add(at(mesh(new THREE.BoxGeometry(0.014, 0.08, 0.014), M.woodL), -len / 2 + i * len / n, 0.04, 0));
  for (const y of [0.03, 0.065]) g.add(at(mesh(new THREE.BoxGeometry(len, 0.012, 0.006), M.woodL), 0, y, 0.008)); return g; }
function hayBale(s = 1) { const b = rbox(0.12, 0.07, 0.07, M.hay, 0.012); b.rotation.x = -Math.PI / 2; b.position.y = 0.035; const g = grp(b); g.scale.setScalar(s); return g; }
function trough(s = 1) {
  const g = new THREE.Group(); g.add(at(mesh(new THREE.BoxGeometry(0.3, 0.012, 0.09), M.woodL), 0, 0.006, 0));
  for (const z of [-1, 1]) g.add(at(mesh(new THREE.BoxGeometry(0.3, 0.06, 0.01), M.woodL), 0, 0.03, z * 0.045)); for (const x of [-1, 1]) g.add(at(mesh(new THREE.BoxGeometry(0.01, 0.06, 0.09), M.woodL), x * 0.15, 0.03, 0));
  const N = 160, pm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), M.pellet, N); pm.castShadow = true; g.add(pm);
  g.userData = { pm, N }; g.scale.setScalar(s); return g;
}
function fillTrough(T, k, t) {      // k: 0–1 lo lleno; los granos caen desde arriba
  const { pm, N } = T.userData, o = new THREE.Object3D();
  for (let i = 0; i < N; i++) { const ki = clamp((k * 1.25 - hash(i * 3.7) * 0.25)); const x = (hash(i * 1.1) - 0.5) * 0.27, z = (hash(i * 2.3) - 0.5) * 0.07, y0 = 0.018 + hash(i * 5.9) * 0.03;
    const fall = clamp((ki - 0.0) / 1.0); const y = lerp(0.35, y0, eo(fall)); o.position.set(x, ki > 0.001 ? y : -1, z); o.scale.setScalar(ki > 0.001 ? 1 : 0.0001); o.rotation.set(i, i * 2, 0); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); }
  pm.instanceMatrix.needsUpdate = true;
}
function dnaHelix(h = 0.5, r = 0.06, turns = 2.2) {
  const g = new THREE.Group(), n = 26, mA = plastic(0x3d8bff, 0.2), mB = plastic(0xff6a2b, 0.2), mR = [plastic(0x19d98a, 0.25), plastic(0xf2b415, 0.25)];
  const items = [];
  for (let i = 0; i < n; i++) { const u = i / (n - 1), a = u * turns * Math.PI * 2, y = u * h; const pA = v3(Math.cos(a) * r, y, Math.sin(a) * r), pB = v3(-Math.cos(a) * r, y, -Math.sin(a) * r);
    const sA = sph(0.013, mA, 14, 10); sA.position.copy(pA); const sB = sph(0.013, mB, 14, 10); sB.position.copy(pB); const rung = bar(pA, pB, 0.005, mR[i % 2], 8);
    const it = grp(sA, sB, rung); g.add(it); items.push(it); }
  const strands = [0, 1].map(k => { const pts = []; for (let i = 0; i <= 120; i++) { const u = i / 120, a = u * turns * Math.PI * 2 + k * Math.PI; pts.push(v3(Math.cos(a) * r, u * h, Math.sin(a) * r)); } return tube(pts, 0.006, k ? mB : mA, 240, false, 8); });
  strands.forEach(s => g.add(s)); g.userData = { items, strands, n }; return g;
}
// ---------- quirófano: lámpara de techo con anillo de luces, máquina de anestesia (fuelle y dial) y sutura
function surgLamp(s = 1) {
  const g = new THREE.Group(), lamp = new THREE.Group(); g.add(lamp);
  lamp.add(at(cyl(0.16, 0.13, 0.05, plastic(0xe9edf0, 0.35), 40), 0, 0, 0)); const leds = [];
  for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI * 2, r = i ? 0.085 : 0, l = cyl(0.028, 0.028, 0.004, glowM(0xfff6e8, 0.2), 20); l.position.set(Math.cos(a) * r, -0.027, Math.sin(a) * r); lamp.add(l); leds.push(l); }
  g.add(tube([v3(0, 0.02, 0), v3(0, 0.18, 0), v3(0.12, 0.3, 0), v3(0.3, 0.32, 0)], 0.012, M.chrome, 30, false, 10));
  g.userData = { leds, lamp }; g.scale.setScalar(s); return g;
}
function anesthesia(s = 1) {
  const g = new THREE.Group(); g.add(at(rbox(0.16, 0.26, 0.12, M.enamel, 0.015), 0, 0.15, 0));
  const dial = cyl(0.03, 0.03, 0.01, M.chrome, 32); dial.rotation.x = Math.PI / 2; dial.position.set(-0.035, 0.22, 0.062); g.add(dial);
  const face = cyl(0.026, 0.026, 0.004, new THREE.MeshBasicMaterial({ color: 0xf4f4f0 }), 32); face.rotation.x = Math.PI / 2; face.position.set(-0.035, 0.22, 0.068); g.add(face);
  const needle = mesh(new THREE.BoxGeometry(0.002, 0.022, 0.002), M.redLed); needle.position.set(-0.035, 0.22, 0.072); g.add(needle);
  const bag = sph(0.035, new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.6, clearcoat: 0.3 }), 20, 14); bag.scale.set(1, 1.3, 1); bag.position.set(0.045, 0.06, 0.07); g.add(bag);
  for (let i = 0; i < 3; i++) { const fl = cyl(0.012, 0.012, 0.06, M.dish, 12); fl.position.set(0.03 + i * 0.016, 0.24, 0.05); g.add(fl); const bl = sph(0.005, glowM(0x7fd6ff, 2), 8, 6); bl.position.set(0.03 + i * 0.016, 0.22 + i * 0.008, 0.05); g.add(bl); }
  g.userData = { bag, needle }; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// ---------- supermercado: bandeja de carne (bandeja de corcho, filete con vetas, film y etiqueta) y estante refrigerado
function meatTray(s = 1, label = true) {
  const g = new THREE.Group(); const tr = rbox(0.2, 0.14, 0.018, M.foam, 0.012); tr.rotation.x = -Math.PI / 2; tr.position.y = 0.009; g.add(tr);
  const steak = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape((() => { const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = 1 + 0.12 * Math.sin(a * 2 + 0.6) + 0.06 * Math.sin(a * 5); pts.push(new THREE.Vector2(Math.cos(a) * 0.078 * r, Math.sin(a) * 0.05 * r)); } return pts; })()), { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3 }), M.meat);
  steak.rotation.x = -Math.PI / 2; steak.position.y = 0.018; steak.castShadow = true; g.add(steak);
  const film = rbox(0.205, 0.145, 0.03, M.wrap, 0.014); film.rotation.x = -Math.PI / 2; film.position.y = 0.022; film.userData.tr = 1; g.add(film);
  if (label) { const lb = plateText(0.07, 0.04, [['TERNERA', 0.32, 0.36], ['EJEMPLO', 0.2, 0.72]], { fg: '#1b2a4a', bg: '#f4f2ea' }); lb.rotation.x = -Math.PI / 2; lb.position.set(0.055, 0.038, 0.035); g.add(lb); }
  g.userData = { steak, film }; g.scale.setScalar(s); return g;
}
// ---------- matadero (edificio industrial genérico con su puerta, rótulo y semáforo) y casco blanco
function abattoir(s = 1) {
  const g = new THREE.Group(), w = 0.62, h = 0.3, d = 0.36;
  g.add(at(mesh(new THREE.BoxGeometry(w, h, d), M.concrete), 0, h / 2, 0));
  g.add(at(mesh(new THREE.BoxGeometry(w + 0.03, 0.025, d + 0.03), M.roofG), 0, h + 0.012, 0));
  const door = mesh(new THREE.BoxGeometry(0.16, 0.17, 0.008), metal(0xa9b0b8, 0.35)); door.position.set(0.08, 0.085, d / 2 + 0.004); g.add(door);
  for (let i = 0; i < 9; i++) g.add(at(mesh(new THREE.BoxGeometry(0.16, 0.002, 0.003), M.dsteel), 0.08, 0.012 + i * 0.019, d / 2 + 0.009));
  const sign = plateText(0.34, 0.06, [['MATADERO', 0.62, 0.52]], { fg: '#f2f2ee', bg: '#1b1e24' }); sign.position.set(-0.08, 0.235, d / 2 + 0.003); g.add(sign);
  for (let i = 0; i < 3; i++) g.add(at(mesh(new THREE.BoxGeometry(0.07, 0.05, 0.004), glowM(0xffe2a8, 0.6)), -0.22 + i * 0.09, 0.12, d / 2 + 0.003));
  const lampR = sph(0.016, glowM(0xff3b30, 0.0), 16, 12), lampG = sph(0.016, glowM(0x34ff8a, 0.0), 16, 12); lampR.position.set(0.2, 0.2, d / 2 + 0.012); lampG.position.set(0.2, 0.158, d / 2 + 0.012);
  g.add(at(mesh(new THREE.BoxGeometry(0.045, 0.09, 0.012), M.black), 0.2, 0.179, d / 2 + 0.004)); g.add(lampR, lampG);
  g.userData = { door, lampR, lampG }; g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.scale.setScalar(s); return g;
}
function helmet(r = 0.08) { const g = new THREE.Group(); const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), M.helmet); dome.scale.set(1, 0.85, 1.08); g.add(dome);
  const brim = cyl(r * 1.05, r * 1.12, r * 0.08, M.helmet, 24); brim.scale.z = 1.12; g.add(brim); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
// ---------- arco del escáner de rayos X (dos postes, travesaño y una lámina de luz azul)
function scanArch(w = 0.7, h = 0.62) {
  const g = new THREE.Group(), m = plastic(0x1d2026, 0.3);
  for (const x of [-w / 2, w / 2]) g.add(at(rbox(0.04, 0.04, h, m, 0.01), x, h / 2, 0, 0, 0, 0)), g.children[g.children.length - 1].rotation.x = Math.PI / 2;
  const top = rbox(w + 0.04, 0.05, 0.05, m, 0.01); top.position.y = h; g.add(top);
  const strip = mesh(new THREE.BoxGeometry(w - 0.02, 0.008, 0.012), glowM(0x8fd2ff, 4)); strip.position.set(0, h - 0.03, 0.022); g.add(strip);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.04, h - 0.04), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { op: { value: 0 }, time: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float op, time; varying vec2 vU; void main(){ float l = 0.35 + 0.65 * smoothstep(0.0, 0.25, vU.y) * smoothstep(1.0, 0.75, vU.y); float s = 0.7 + 0.3 * sin(vU.y * 120.0 - time * 14.0); gl_FragColor = vec4(vec3(0.35, 0.72, 1.0) * op * l * s * 0.55, 1.0); }' }));
  sheet.position.y = h / 2; sheet.renderOrder = 8; sheet.userData.keepOp = true; g.add(sheet);
  g.userData = { sheet, strip }; return g;
}
// ---------- útero de vaca preñada (bolsa con dos cuernos) para la radiografía
function uterusGeo() { return loftGeo([[0, 0, -0.1], [0, 0.02, 0.0], [0, 0.0, 0.12], [0, -0.04, 0.22], [0, -0.1, 0.28]], [[0.05, 0.05], [0.09, 0.08], [0.13, 0.12], [0.12, 0.11], [0.06, 0.06]], { cap0: 0.6, cap1: 0.8, nr: 24 }); }
// ---------- lámpara de rayos X para la plataforma de Anatomía: poste en el centro, brazo hasta el borde, cabezal con lente azul y cono de luz hasta la plataforma
function xrayLamp(R = 0.6, h = 0.66) {
  const g = new THREE.Group(), m = plastic(0x23262c, 0.3);
  g.add(at(cyl(0.005, 0.005, 2.0, M.dsteel, 8), 0, h + 1.0, R));
  const head = rbox(0.16, 0.16, 0.11, m, 0.02); head.rotation.x = -Math.PI / 2; head.position.set(0, h, R); g.add(head);
  const lens = cyl(0.05, 0.05, 0.006, glowM(0x8fd2ff, 5), 32); lens.position.set(0, h - 0.058, R); g.add(lens);
  const cone = lightCone(0.17, h - 0.06, 0.32, 0x8fd2ff); cone.position.set(0, (h - 0.06) / 2, R); g.add(cone);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.17, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fd2ff).multiplyScalar(2.5), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.002, R); g.add(ring);
  const line = mesh(new THREE.BoxGeometry(0.004, 0.002, 0.34), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fd2ff).multiplyScalar(3), toneMapped: false }), false); line.position.set(0, 0.003, R); g.add(line);
  const pt = new THREE.Object3D(); pt.position.set(0, 0, R); g.add(pt);
  g.userData = { cone, lens, ring, pt }; return g;
}
