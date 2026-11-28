// ---------------------------------------------------------------- «Empieza torcido»: LOS MUEBLES DEL SÓTANO (coordenadas del sótano: el suelo es y = 0; x y z como el mundo).
// Banco, taburete, flexo frío, el bloque perfecto (brillo de espejo), bolas de papel, bocetos tachados en la pared y EL MONTÓN: 20 bloques torcidos con una X roja
// (los intentos que fue tirando). Al final vuelan uno a uno y forman la escalera: 6 columnas (1 + 2 + 3 + 4 + 5 + 6); la primera, el bloque perfecto.
const BENCH = { x: -0.42, z: -1.0, top: 0.7, L: 0.9, W: 0.55 };
const SEAT = { x: -1.12, z: -1.0, h: 0.56 };
const BLOCK0 = _v(-0.72, BENCH.top + 0.11, -1.0);                // el bloque perfecto, encima del banco
const STP = { x0: -0.25, dx: 0.27, z: -0.45, bw: 0.32, bh: 0.22, bd: 0.55, cols: 6 };
const PILE = { x: -1.22, z: -1.78 };
function workbench(G) { const g = new THREE.Group(); g.position.set(BENCH.x, 0, BENCH.z); G.add(g); const wood = stdM(0x6f5642, 0.75), dark = stdM(0x3f3127, 0.85);
  g.add(box(BENCH.L, 0.06, BENCH.W, wood, 0, BENCH.top - 0.03, 0)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.05, BENCH.top - 0.06, 0.05, dark, sx * (BENCH.L / 2 - 0.06), (BENCH.top - 0.06) / 2, sz * (BENCH.W / 2 - 0.06)));
  g.add(box(BENCH.L - 0.1, 0.03, BENCH.W - 0.1, dark, 0, 0.18, 0));
  const sand = stdM(0xc9a46a, 0.95); for (let i = 0; i < 4; i++) { const s = box(0.14, 0.004, 0.1, sand, 0.05 + i * 0.05, BENCH.top + 0.003 + i * 0.004, -0.14 + i * 0.02); s.rotation.y = i * 0.4; g.add(s); }
  const rule = box(0.32, 0.006, 0.03, metal(0xc8ccd2, 0.3), 0.15, BENCH.top + 0.004, 0.19); rule.rotation.y = 0.3; g.add(rule);
  shadowAll(g); return g; }
function stool(G) { const g = new THREE.Group(); g.position.set(SEAT.x, 0, SEAT.z); G.add(g); const w = stdM(0x5e4838, 0.8);
  ad(g, cyl(0.19, 0.19, 0.05, w, 20)).position.y = SEAT.h - 0.025; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, l = cyl(0.018, 0.022, SEAT.h - 0.04, w, 8); l.position.set(Math.cos(a) * 0.12, (SEAT.h - 0.04) / 2, Math.sin(a) * 0.12); l.rotation.set(Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1); g.add(l); }
  shadowAll(g); return g; }
// flexo: pie, dos brazos y la pantalla; la bombilla es una luz barata fría
function deskLamp(G) { const g = new THREE.Group(); g.position.set(BENCH.x + 0.32, BENCH.top, BENCH.z - 0.16); g.rotation.y = Math.PI; G.add(g); const m = stdM(0x2c3036, 0.4, { metalness: 0.5 });
  ad(g, cyl(0.08, 0.09, 0.025, m, 20)).position.y = 0.012; const a1 = new THREE.Group(); a1.position.y = 0.03; a1.rotation.z = 0.5; g.add(a1); const r1 = cyl(0.012, 0.012, 0.36, m, 8); r1.position.y = 0.18; a1.add(r1);
  const a2 = new THREE.Group(); a2.position.y = 0.36; a2.rotation.z = 1.35; a1.add(a2); const r2 = cyl(0.011, 0.011, 0.32, m, 8); r2.position.y = 0.16; a2.add(r2);
  const hd = new THREE.Group(); hd.position.y = 0.32; hd.rotation.z = 0.75; a2.add(hd); const sh = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.13, 24, 1, true), stdM(0x2c3036, 0.4, { metalness: 0.5, side: THREE.DoubleSide })); sh.position.y = -0.03; hd.add(sh);
  const bulbM = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, emissive: 0xdfe9ff, emissiveIntensity: 3.0 }); const bulb = sph(0.03, bulbM, 14, 10); bulb.position.y = -0.07; hd.add(bulb);
  shadowAll(g); g.updateMatrixWorld(true); const wp = bulb.getWorldPosition(new THREE.Vector3());
  return { g, bulbM, bulb, src: nightSrc(wp.clone().add(_v(0, -0.05, 0)), 0xcfe0ff, 3.0, 1.35, 'lamp'), glow: nightGlow(G, wp, 0xe8f0ff, 0.32, 0.55, 'lamp') }; }
// el bloque perfecto: canto vivo, brillo de espejo
function perfectBlock() { const m = new THREE.MeshPhysicalMaterial({ color: 0xf6f3ee, roughness: 0.06, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.02, reflectivity: 0.6, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const b = rboxM(STP.bw, STP.bh, STP.bd, 0.004, m, 2); b.userData.m = m; return b; }
// bolas de papel por el suelo
const PAPER = { N: 46 };
function paperBalls(G) { const geo = new THREE.IcosahedronGeometry(0.045, 1); { const p = geo.attributes.position, R = rng(31); for (let i = 0; i < p.count; i++) { const v = _v(p.getX(i), p.getY(i), p.getZ(i)), k = 0.75 + R() * 0.5; p.setXYZ(i, v.x * k, v.y * k, v.z * k); } geo.computeVertexNormals(); }
  const m = new THREE.MeshStandardMaterial({ color: 0xe6e3da, roughness: 0.95, flatShading: true }); const im = new THREE.InstancedMesh(geo, m, PAPER.N); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; G.add(im);
  const R = rng(37), o = new THREE.Object3D();
  for (let i = 0; i < PAPER.N; i++) { let x, z, ok = false; for (let k = 0; k < 40 && !ok; k++) { x = -1.55 + R() * 1.6; z = -2.0 + R() * 1.85;
      ok = !(Math.abs(x - BENCH.x) < 0.5 && Math.abs(z - BENCH.z) < 0.32) && !(x > STP.x0 - 0.25 && Math.abs(z - STP.z) < 0.4) && Math.hypot(x - PILE.x, z - PILE.z) > 0.45; }
    const s = 0.8 + R() * 0.6; o.position.set(x, 0.04 * s, z); o.rotation.set(R() * 6, R() * 6, R() * 6); o.scale.setScalar(s); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  return im; }
// bocetos clavados en la pared de atrás (escalones dibujados y tachados en rojo)
function sketches(G) { const g = new THREE.Group(); G.add(g); const R = rng(53);
  for (let i = 0; i < 10; i++) { const w = 0.28, h = 0.2, p = signPlane(w, h, 256, (c, W, H) => { c.fillStyle = '#ece6d8'; c.fillRect(0, 0, W, H); c.strokeStyle = '#4a5260'; c.lineWidth = 3;
      c.strokeRect(W * 0.25, H * 0.3, W * 0.5, H * 0.35); c.beginPath(); c.moveTo(W * 0.25, H * 0.3); c.lineTo(W * 0.35, H * 0.18); c.lineTo(W * 0.85, H * 0.18); c.lineTo(W * 0.75, H * 0.3); c.moveTo(W * 0.85, H * 0.18); c.lineTo(W * 0.85, H * 0.53); c.lineTo(W * 0.75, H * 0.65); c.stroke();
      c.font = '700 18px SpaceMono'; c.fillStyle = '#4a5260'; c.fillText('v' + (i + 2), 12, H - 14); c.strokeStyle = 'rgba(200,40,40,0.85)'; c.lineWidth = 6; c.beginPath(); c.moveTo(W * 0.15, H * 0.15); c.lineTo(W * 0.9, H * 0.85); c.moveTo(W * 0.9, H * 0.15); c.lineTo(W * 0.15, H * 0.85); c.stroke(); }, { r: 0.9 });
    p.position.set(-1.45 + (i % 5) * 0.34 + (R() - 0.5) * 0.05, 1.35 + Math.floor(i / 5) * 0.25 + (R() - 0.5) * 0.04, BS.zb + 0.065); p.rotation.z = (R() - 0.5) * 0.14; g.add(p); }
  return g; }
// ---- el montón y la escalera
const PB = { list: [] };
let _xT = null;
function xTex() { if (_xT) return _xT; _xT = signTex(256, 256, (c, W, H) => { c.clearRect(0, 0, W, H); c.strokeStyle = 'rgba(205,38,38,0.92)'; c.lineCap = 'round'; c.lineWidth = 26; c.beginPath(); c.moveTo(W * 0.2, H * 0.22); c.lineTo(W * 0.8, H * 0.78); c.moveTo(W * 0.8, H * 0.2); c.lineTo(W * 0.22, H * 0.8); c.stroke(); }); return _xT; }
// destino de cada bloque en la escalera: columna c (1…5), nivel l (0…c)
function stepSlot(c, l) { return _v(STP.x0 + STP.dx * c, STP.bh * (l + 0.5), STP.z); }
function buildPile(G) { const R = rng(83), geo = rboxM(STP.bw, STP.bh, STP.bd, 0.02, null, 2).geometry, xm = new THREE.MeshStandardMaterial({ map: xTex(), transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
  // orden de vuelo: columna por columna, de abajo arriba
  const slots = []; for (let c = 1; c < STP.cols; c++) for (let l = 0; l <= c; l++) slots.push([c, l]);
  // sitio en el montón: capas (8, 6, 4, 2); los de arriba son los primeros en volar
  const pileP = []; const layers = [8, 6, 4, 2]; let k = 0;
  for (let L = 0; L < layers.length; L++) for (let i = 0; i < layers[L]; i++, k++) { const a = i / layers[L] * Math.PI * 2 + L * 0.7, r = (0.42 - L * 0.1) * (0.7 + R() * 0.3);
    pileP.push({ p: _v(PILE.x + Math.cos(a) * r * 1.1, STP.bh * (L + 0.5) - L * 0.02, PILE.z + Math.sin(a) * r * 0.75), r: _v((R() - 0.5) * 0.5, R() * 6.28, (R() - 0.5) * 0.5) }); }
  pileP.reverse();                                                                                         // el primero en volar es el de más arriba
  slots.forEach(([c, l], i) => { const col = new THREE.Color().setHSL(0.07 + (R() - 0.5) * 0.03, 0.3 + R() * 0.12, 0.62 + (R() - 0.5) * 0.12);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })); m.castShadow = m.receiveShadow = true; G.add(m);
    const x = new THREE.Mesh(new THREE.PlaneGeometry(STP.bw * 0.7, STP.bh * 0.78), xm); x.position.z = STP.bd / 2 + 0.004; m.add(x);
    const tgt = stepSlot(c, l).add(_v((R() - 0.5) * 0.04, 0, (R() - 0.5) * 0.06)), tr = _v((R() - 0.5) * 0.08, (R() - 0.5) * 0.24, (R() - 0.5) * 0.12);
    PB.list.push({ m, x, from: pileP[i], to: { p: tgt, r: tr }, c, l, i }); });
  return PB; }
