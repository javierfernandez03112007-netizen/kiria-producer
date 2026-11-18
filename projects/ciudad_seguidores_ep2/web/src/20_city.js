// ---------------------------------------------------------------- EL PUEBLO: suelo, carreteras con su raya, aceras, manzanas con 16 casas (una por cada 5 seguidores)
// y un patio en medio, árboles, la plaza, el trono gigante, la corona y el cartel con el nombre. Todo con instancias y sin texturas ajenas.
const CITY = {};
const stdM = (c, r = 0.85, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const cM = stdM;
function inst(geo, mat, n, cast = true) { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = n; m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m; }
const _IM = new THREE.Matrix4(), _IP = new THREE.Vector3(), _IQ = new THREE.Quaternion(), _IS = new THREE.Vector3(), _IE = new THREE.Euler(), _IC = new THREE.Color(), _IC2 = new THREE.Color(), _IE2 = new THREE.Vector3();
function setI(m, i, x, y, z, sx, sy, sz, ry = 0) { _IE.set(0, ry, 0); _IQ.setFromEuler(_IE); _IP.set(x, y, z); _IS.set(Math.max(1e-4, sx), Math.max(1e-4, sy), Math.max(1e-4, sz)); _IM.compose(_IP, _IQ, _IS); m.setMatrixAt(i, _IM); }
// lo mismo, pero escribiendo la matriz a mano (giro en Y + escala): para las miles de figuritas que se mueven
function setYS(arr, i, x, y, z, s, yaw) { const o = i * 16, c = Math.cos(yaw) * s, n = Math.sin(yaw) * s; arr[o] = c; arr[o + 1] = 0; arr[o + 2] = -n; arr[o + 3] = 0; arr[o + 4] = 0; arr[o + 5] = s; arr[o + 6] = 0; arr[o + 7] = 0; arr[o + 8] = n; arr[o + 9] = 0; arr[o + 10] = c; arr[o + 11] = 0; arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1; }
const boxG = (w, h, d, y = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, y, 0); return g; };
function addBox(par, w, h, d, m, x, y, z, ry = 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.y = ry; b.castShadow = b.receiveShadow = true; par.add(b); return b; }
const popK = k => { k = clamp(k); return k <= 0 ? 0 : k >= 1 ? 1 : 1 + Math.sin(k * Math.PI * 1.15) * (1 - k) * 0.5 + (eo(k) - 1); };

function buildThrone() { const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.9 }), red = stdM(0xb3202a, 0.75), stone = stdM(0xdcd6c8, 0.9);
  const s1 = cyl(13, 14, 0.9, stone, 44); s1.position.y = 0.45; const s2 = cyl(10.6, 11.6, 0.9, stone, 44); s2.position.y = 1.35; g.add(s1, s2); const y0 = 1.8;
  addBox(g, 9, 5, 8, gold, 0, y0 + 2.5, 0); addBox(g, 7.2, 1.0, 6.2, red, 0, y0 + 5.5, 0.5); addBox(g, 9, 15, 1.6, gold, 0, y0 + 12.5, -3.2); addBox(g, 6.6, 11, 0.4, red, 0, y0 + 11.5, -2.3);
  { const a = cyl(4.5, 4.5, 1.6, gold, 36); a.rotation.x = Math.PI / 2; a.position.set(0, y0 + 20, -3.2); g.add(a); const b = cyl(3.3, 3.3, 0.4, red, 30); b.rotation.x = Math.PI / 2; b.position.set(0, y0 + 20, -2.3); g.add(b); }
  for (const sx of [-1, 1]) { addBox(g, 1.5, 3, 7, gold, sx * 3.75, y0 + 6.5, 0.4); const f = sph(1.0, gold, 16, 12); f.position.set(sx * 3.75, y0 + 8.6, 3.5); f.castShadow = true; g.add(f); const f2 = sph(1.0, gold, 16, 12); f2.position.set(sx * 4.5, y0 + 20.8, -3.2); g.add(f2); }
  g.rotation.y = Math.PI / 4; g.scale.setScalar(1.3); g.userData.seatY = (y0 + 6) * 1.3; return g; }
function buildCrown() { const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xffd04a, roughness: 0.22, metalness: 0.95, side: THREE.DoubleSide, emissive: 0x6a4a00, emissiveIntensity: 0.5 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.45, 1.7, 28, 1, true), gold); ring.castShadow = true; g.add(ring);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.9, 4), gold); c.position.set(Math.cos(a) * 2.7, 1.75, Math.sin(a) * 2.7); c.castShadow = true; g.add(c);
    const j = sph(0.36, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd9263a : 0x2f7fe0, roughness: 0.15, metalness: 0.2, emissive: i % 2 ? 0x5a0a12 : 0x0a2a5a }), 10, 8); j.position.set(Math.cos(a) * 2.7, 2.85, Math.sin(a) * 2.7); g.add(j); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xffe08a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(16); g.add(halo); g.userData.halo = halo; return g; }

function buildCity() {
  const g = new THREE.Group(), C = CITY; C.g = g; const BL = C.BL = makeBlocks();
  // ---- suelo: hierba, el asfalto del pueblo, la raya discontinua de cada calle y la plaza
  { const t = canvasTex(256, 256, (q, w, h) => { q.fillStyle = '#7cb657'; q.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { q.fillStyle = hash(i * 1.3) > 0.5 ? 'rgba(255,255,220,.07)' : 'rgba(20,60,10,.08)'; q.fillRect(hash(i * 2.1) * w, hash(i * 3.7) * h, 3, 3); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(260, 260); const gr = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), stdM(0xffffff, 0.95, { map: t })); gr.rotation.x = -Math.PI / 2; gr.receiveShadow = true; g.add(gr);
    const rot = new THREE.Group(); rot.rotation.y = Math.PI / 4; g.add(rot); const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * (REG2.u + 9), 2 * (REG2.v + 9)), stdM(0x666c74, 0.95)); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.receiveShadow = true; rot.add(m);
    const pz = cyl(28.5, 28.5, 0.14, stdM(0xd9cdb2, 0.9), 56); pz.position.y = 0.1; pz.castShadow = false; g.add(pz);
    const inR = (x, z) => Math.abs(toU(x, z)) < REG2.u + 6 && Math.abs(toV(x, z)) < REG2.v + 6 && Math.hypot(x, z) > 30, ds = [];
    for (let i = -11; i <= 11; i++) for (let k = -80; k <= 80; k++) { const a = (i + 0.5) * PITCH, b = k * 5.2; if (inR(a, b)) ds.push([a, b, 0]); if (inR(b, a)) ds.push([b, a, Math.PI / 2]); }
    const dm = inst(boxG(0.22, 0.04, 2.2, 0.07), new THREE.MeshBasicMaterial({ color: 0xe9e9e4, toneMapped: false }), ds.length, false); ds.forEach((d, i) => setI(dm, i, d[0], 0, d[1], 1, 1, 1, d[2])); dm.receiveShadow = false; g.add(dm); }
  // ---- manzanas: acera y césped (las especiales van pavimentadas)
  C.walk = inst(boxG(BLOCK + 4, 0.3, BLOCK + 4, 0.15), stdM(0xffffff, 0.9), BL.length, false); C.lawn = inst(boxG(BLOCK, 0.5, BLOCK, 0.25), stdM(0xffffff, 0.95), BL.length, false); g.add(C.walk, C.lawn);
  const pav = { super: 0xbfc4c8, tiendas: 0xd8cdb8, bomberos: 0xc4c2bb, mercado: 0xd6c8a4, obra: 0xc9b98f, cole: 0x9ccf70, banco: 0x9fcf6a, lago: 0x8cc063, parque: 0x7fbf5c, deporte: 0xb9beb2 };
  BL.forEach((b, i) => { setI(C.walk, i, b.x, 0, b.z, 1, 1, 1); setI(C.lawn, i, b.x, 0, b.z, 1, 1, 1); C.walk.setColorAt(i, _IC.set(0xd4d4cf)); C.lawn.setColorAt(i, _IC.set(b.kind ? pav[b.kind] : [0x8cc063, 0x93c468, 0x86bb5f][Math.floor(b.h * 3)])); });
  // ---- hogares: 16 parcelas por manzana (el borde de una cuadrícula de 5 × 5); dentro queda el patio. La casa n es de los seguidores 5n … 5n+4.
  const G16 = []; for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) if (Math.max(Math.abs(a), Math.abs(c)) === 2) G16.push([a * 5.6, c * 5.6]);
  C.homes = []; const res = C.res = BL.filter(b => !b.kind); res.forEach(b => G16.forEach((o, k) => C.homes.push({ b, x: b.x + o[0], z: b.z + o[1], ox: Math.abs(o[0]) > Math.abs(o[1]) || (Math.abs(o[0]) === Math.abs(o[1]) && k % 2) ? Math.sign(o[0]) : 0, oz: 0 })));
  for (const h of C.homes) if (!h.ox) h.oz = Math.sign(h.z - h.b.z) || 1;
  C.NH = Math.ceil(NPOP / 5); if (C.homes.length < C.NH) console.error('ERROR faltan parcelas: ' + C.homes.length + ' < ' + C.NH);
  { const n = C.NH, rg = new THREE.ConeGeometry(3.55, 2.3, 4, 1); rg.rotateY(Math.PI / 4); rg.translate(0, 0.5 + 3.0 + 1.15, 0);
    const walls = inst(boxG(4.5, 3.0, 4.5, 0.5 + 1.5), stdM(0xffffff, 0.9), n), roofs = inst(rg, stdM(0xffffff, 0.85), n), doors = inst(boxG(0.9, 1.7, 0.12, 0.5 + 0.85), stdM(0x6b4a2e, 0.8), n, false); g.add(walls, roofs, doors);
    const wc = [0xf6ecd9, 0xf7dcae, 0xe9e3d3, 0xdfeaf2, 0xf2d6c8], rc = [0xc8553d, 0xb4472f, 0x7a5c8a, 0x3f7fb0, 0xd98b3a, 0x4f9a6a];
    for (let i = 0; i < n; i++) { const q = C.homes[i], s = 0.92 + h2(i * 1.3, 7.7) * 0.16; setI(walls, i, q.x, 0, q.z, s, s, s); setI(roofs, i, q.x, 0, q.z, s, s, s); setI(doors, i, q.x + q.ox * 2.26 * s, 0, q.z + q.oz * 2.26 * s, 1, 1, 1, q.ox ? Math.PI / 2 : 0);
      walls.setColorAt(i, _IC.set(wc[Math.floor(h2(i * 2.9, 1.1) * wc.length)])); roofs.setColorAt(i, _IC.set(rc[Math.floor(h2(q.b.i * 3 + q.b.j, Math.floor(i / 6)) * rc.length)])); }
    walls.instanceColor.needsUpdate = roofs.instanceColor.needsUpdate = true; }
  // ---- patios: un árbol y dos bancos por manzana de casas; y el bosque de alrededor
  { const pts = []; res.forEach(b => { pts.push([b.x + (b.h - 0.5) * 3, b.z + (h2(b.j, b.i) - 0.5) * 3, 0.75], [b.x - 6.6, b.z - 6.4, 0.5], [b.x + 6.4, b.z + 6.6, 0.55]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push([b.x + sx * 14.15, b.z + sz * 14.15, 0.42 + h2(b.i + sx, b.j + sz) * 0.14]); });
    for (let i = 0, n0 = pts.length; i < 2600 && pts.length < n0 + 1150; i++) { const u = (hash(i * 1.7) - 0.5) * 1000, v = (hash(i * 2.9) - 0.5) * 1600; if (Math.abs(u) < REG2.u + 16 && Math.abs(v) < REG2.v + 16) continue; pts.push([...fromUV(u, v), 0.8 + hash(i * 5.1) * 0.9]); }
    const fg = new THREE.ConeGeometry(2.6, 6.5, 7); fg.translate(0, 5, 0); const tf = inst(fg, stdM(0xffffff, 0.9), pts.length), kg = new THREE.CylinderGeometry(0.45, 0.6, 2.2, 6); kg.translate(0, 1.1, 0); const tk = inst(kg, stdM(0x7a5a3a, 0.9), pts.length, false); g.add(tf, tk);
    pts.forEach((p, i) => { setI(tf, i, p[0], 0.4, p[1], p[2], p[2], p[2], hash(i) * 6); setI(tk, i, p[0], 0.4, p[1], p[2], p[2], p[2]); tf.setColorAt(i, _IC.set([0x3f8a4b, 0x4f9a52, 0x357a45, 0x5aa457][i % 4])); }); tf.instanceColor.needsUpdate = true;
    C.benches = []; res.forEach(b => { C.benches.push([b.x - 4.5, b.z + 6.3, 0], [b.x + 6.3, b.z - 4.5, Math.PI / 2]); }); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + 0.3; C.benches.push([Math.cos(a) * 26.6, Math.sin(a) * 26.6, Math.atan2(Math.cos(a), Math.sin(a))]); }
    const bm = inst(boxG(2.2, 0.16, 0.6, 0.5), stdM(0x9a6a3c, 0.8), C.benches.length), bb = inst(boxG(2.2, 0.5, 0.1, 0.82), stdM(0x9a6a3c, 0.8), C.benches.length, false); g.add(bm, bb);
    C.benches.forEach((q, i) => { const y = Math.hypot(q[0], q[1]) < 29 ? 0.16 : 0.5; setI(bm, i, q[0], y - 0.05, q[1], 1, 1, 1, q[2]); setI(bb, i, q[0] + Math.sin(q[2]) * 0.3, y - 0.05, q[1] + Math.cos(q[2]) * 0.3, 1, 1, 1, q[2]); }); }
  // ---- el trono (gigante), la corona del rey y el cartel con el nombre del pueblo (delante de la plaza)
  C.throne = buildThrone(); g.add(C.throne); C.crown = buildCrown(); g.add(C.crown);
  { const s = new THREE.Group(), t = canvasTex(1024, 256, (q, w, h) => { q.fillStyle = '#1f7a4d'; q.fillRect(0, 0, w, h); q.strokeStyle = '#ffffff'; q.lineWidth = 12; q.strokeRect(16, 16, w - 32, h - 32); q.fillStyle = '#ffffff'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.font = '900 150px Inter, sans-serif'; q.fillText('KIRIA WORLD', w / 2, h / 2 + 8); });
    const p = new THREE.Mesh(new THREE.BoxGeometry(22, 5.5, 0.4), [0, 0, 0, 0, 1, 0].map(k => k ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) : stdM(0x18603c, 0.8))); p.position.y = 8.2; p.castShadow = true; s.add(p); for (const x of [-8, 8]) addBox(s, 0.5, 5.6, 0.5, stdM(0x7a8088, 0.6), x, 2.8, -0.1);
    const [x, z] = fromUV(0, -37.5); s.position.set(x, 0, z); s.rotation.y = Math.PI / 4; g.add(s); C.sign = s; }
  return g;
}
// lo que se mueve del decorado: la corona (sobre la cabeza del rey; al final se levanta) y el cartel (aparece al decir el nombre)
function cityAt(t, o) {
  const C = CITY, c = o.crown, s = popK(c.k); C.crown.visible = c.k > 0.01; C.crown.scale.setScalar(Math.max(0.001, s) * c.s); C.crown.position.set(c.x, c.y, c.z); C.crown.rotation.set(0.12 * Math.sin(t * 2.1) * c.wob, t * 1.2, 0.12 * Math.cos(t * 1.7) * c.wob); C.crown.userData.halo.material.opacity = 0.5 * clamp(c.k);
  const k = popK(o.sign ?? 1); C.sign.visible = k > 0.01; C.sign.scale.set(k, k, k);
}
