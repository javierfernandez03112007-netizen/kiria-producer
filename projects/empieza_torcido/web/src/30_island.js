// ---------------------------------------------------------------- «Empieza torcido»: LA ISLA CORTADA. Un trozo de tierra que flota al amanecer, partido por la mitad
// (se ve el corte: hierba, tierra, roca). Arriba, la hierba con un árbol y una trampilla de madera; abajo, dentro de la roca, un sótano frío donde alguien pule
// un bloque perfecto junto al montón de bloques torcidos que fue descartando. Unidades en metros: x a la derecha, y arriba, z hacia la cámara (el corte es z = 0).
const BS = { x0: -1.65, x1: 1.65, zb: -2.15, zf: 0, y0: -2.95, y1: -0.42 };      // el sótano (suelo y0, techo y1); la hierba está en y = 0
const R0 = 4.4;                                                                    // radio de la isla
const HATCH = { x: 1.12, z: -0.5, s: 0.82 };                                       // la trampilla (en la hierba, encima del final de la escalera)
const TREE = { x: -1.75, z: -2.6 };
function tex2(w, h, draw) { const c = cnv(w, h), g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
// el corte de la isla: hierba arriba, tierra con raíces y piedras, y estratos de roca hacia abajo (textura en metros: x −4,6…4,6, y −7…0,2)
function cutTex() { return tex2(1024, 1024, (g, W, H) => { const R = rng(19), Y = y => (0.2 - y) / 7.2 * H;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#5f4a38'); gr.addColorStop(0.2, '#54422f'); gr.addColorStop(0.45, '#6b5a4c'); gr.addColorStop(1, '#4a3d35'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 18; i++) { const y = Y(-0.7 - i * 0.36 - R() * 0.2); g.fillStyle = `rgba(${150 + R() * 40 | 0},${130 + R() * 30 | 0},${110 + R() * 30 | 0},${0.12 + R() * 0.12})`; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 32) g.lineTo(x, y + Math.sin(x * 0.012 + i) * 10 + R() * 6); g.lineTo(W, y + 26 + R() * 20); g.lineTo(0, y + 26 + R() * 20); g.fill(); }
  for (let i = 0; i < 260; i++) { const x = R() * W, y = Y(-0.5 - R() * 6.3), r = 2 + R() * 7; g.fillStyle = `rgba(${170 + R() * 50 | 0},${160 + R() * 40 | 0},${150 + R() * 40 | 0},0.5)`; g.beginPath(); g.ellipse(x, y, r * 1.4, r, R() * 3, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(40,28,18,0.55)'; for (let i = 0; i < 40; i++) { let x = R() * W, y = Y(-0.06); g.lineWidth = 1 + R() * 2.5; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 24; y += 6 + R() * 12; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = '#5d7d38'; g.fillRect(0, 0, W, Y(-0.07)); g.fillStyle = '#7a9a48'; for (let x = 0; x < W; x += 3) g.fillRect(x, Y(-0.07) - 2, 2, 2 + R() * 9); }); }
function plankTex(base, seed, n = 7) { const [c, h] = woodCanvases(base, seed, 512, n); const m = texMat(c, h, [1, 1], { r: 0.85, ns: 0.5 }); return m; }
// perfil de la roca (radio según la altura): ancho arriba, en punta abajo, con algún saliente
function rockR(y) { const u = clamp((-0.4 - y) / 6.3); return Math.max(0.12, R0 * (1 - Math.pow(u, 1.45)) * (1 + 0.05 * Math.sin(u * 17 + 1) + 0.03 * Math.sin(u * 41))); }
function buildIsland(G) { const g = new THREE.Group(); G.add(g); const U = {}; g.userData = U;
  // la hierba (media tapa: solo la mitad de atrás, z ≤ 0) y su color de estación
  U.grass = new THREE.MeshStandardMaterial({ color: 0x6f9a48, roughness: 0.95 });
  // la tapa de hierba: media isla (z ≤ 0) extruida, con el hueco de la trampilla
  { const sh = new THREE.Shape(); const N = 96; sh.moveTo(R0, 0); for (let i = 1; i <= N; i++) { const a = Math.PI / 2 + Math.PI * i / N; sh.lineTo(R0 * Math.sin(a), R0 * Math.cos(a)); } sh.lineTo(R0, 0);
    // forma en el plano x–z (al girarla, su segunda coordenada es la z del mundo); agujero = la trampilla
    const hole = new THREE.Path(); const hx0 = HATCH.x - HATCH.s / 2, hx1 = HATCH.x + HATCH.s / 2, hz0 = HATCH.z - HATCH.s / 2, hz1 = HATCH.z + HATCH.s / 2;
    hole.moveTo(hx0, hz1); hole.lineTo(hx1, hz1); hole.lineTo(hx1, hz0); hole.lineTo(hx0, hz0); hole.lineTo(hx0, hz1); sh.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false, curveSegments: 4 }); geo.rotateX(Math.PI / 2); geo.translate(0, 0, 0);       // y: 0 → −0.4
    const m = new THREE.Mesh(geo, [U.grass, U.grass]); m.receiveShadow = true; m.castShadow = true; g.add(m); U.top = m; }
  // la roca: medio torno (z ≤ 0)
  const prof = []; for (let k = 0; k <= 40; k++) { const y = -0.4 - 6.3 * k / 40; prof.push(new THREE.Vector2(rockR(y), y)); }
  const rock = new THREE.Mesh(new THREE.LatheGeometry(prof, 64, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x7a6656, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }));
  rock.castShadow = true; rock.receiveShadow = true; g.add(rock);
  // la cara del corte (z = 0), con el hueco del sótano
  { const sh = new THREE.Shape(); sh.moveTo(-R0, 0); sh.lineTo(R0, 0); sh.lineTo(R0, -0.4); for (let k = 1; k <= 40; k++) { const y = -0.4 - 6.3 * k / 40; sh.lineTo(rockR(y), y); } for (let k = 40; k >= 1; k--) { const y = -0.4 - 6.3 * k / 40; sh.lineTo(-rockR(y), y); } sh.lineTo(-R0, -0.4); sh.lineTo(-R0, 0);
    const hole = new THREE.Path(); hole.moveTo(BS.x0, BS.y0); hole.lineTo(BS.x0, BS.y1); hole.lineTo(BS.x1, BS.y1); hole.lineTo(BS.x1, BS.y0); hole.lineTo(BS.x0, BS.y0); sh.holes.push(hole);
    const geo = new THREE.ShapeGeometry(sh, 8); const t = cutTex(); t.repeat.set(1 / 9.2, 1 / 7.2); t.offset.set(4.6 / 9.2, 7.0 / 7.2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })); m.position.z = 0.002; m.receiveShadow = true; g.add(m); U.cut = m; }
  return g; }
// el sótano: tablas viejas en las paredes, suelo de tablas, techo con vigas y la trampilla
function buildBasement(G) { const g = new THREE.Group(); G.add(g); const U = {}; g.userData = U;
  const wall = plankTex([92, 84, 78], 71, 9), floor = plankTex([78, 74, 72], 73, 7), beam = stdM(0x4a3a2e, 0.85), dark = stdM(0x2e2723, 0.9);
  const { x0, x1, zb, zf, y0, y1 } = BS, Wd = x1 - x0, D = zf - zb, Hh = y1 - y0;
  g.add(box(Wd, Hh, 0.06, wall, (x0 + x1) / 2, (y0 + y1) / 2, zb + 0.03));                           // pared de atrás
  for (const s of [-1, 1]) g.add(box(0.06, Hh, D, wall, s > 0 ? x1 - 0.03 : x0 + 0.03, (y0 + y1) / 2, (zb + zf) / 2));    // laterales
  g.add(box(Wd, 0.04, D, floor, (x0 + x1) / 2, y0 + 0.02, (zb + zf) / 2));                           // suelo
  // techo: tablas con el hueco de la trampilla y vigas
  { const hx0 = HATCH.x - HATCH.s / 2, hx1 = HATCH.x + HATCH.s / 2, hz0 = HATCH.z - HATCH.s / 2, hz1 = HATCH.z + HATCH.s / 2, yc = y1 + 0.02;
    const p = (xa, xb, za, zz) => { if (xb - xa < 1e-3 || zz - za < 1e-3) return; g.add(box(xb - xa, 0.04, zz - za, dark, (xa + xb) / 2, yc, (za + zz) / 2)); };
    p(x0, x1, zb, hz0); p(x0, x1, hz1, zf); p(x0, hx0, hz0, hz1); p(hx1, x1, hz0, hz1);
    for (const xx of [-1.1, -0.3, 0.5]) g.add(box(0.14, 0.16, D, beam, xx, y1 - 0.08, (zb + zf) / 2));
    for (const [w, d, xx, zz] of [[HATCH.s + 0.1, 0.05, HATCH.x, hz0 - 0.025], [HATCH.s + 0.1, 0.05, HATCH.x, hz1 + 0.025], [0.05, HATCH.s, hx0 - 0.025, HATCH.z], [0.05, HATCH.s, hx1 + 0.025, HATCH.z]]) g.add(box(w, 0.08, d, beam, xx, y1 - 0.02, zz)); }
  // el hueco de la trampilla atraviesa la hierba (paredes de tierra) y las dos hojas de madera, con bisagras a los lados; se abren hacia arriba
  { const soil = stdM(0x4d3b2c, 0.95), hz = HATCH.z, hs = HATCH.s; for (const [w, d, xx, zz] of [[hs, 0.02, HATCH.x, hz - hs / 2 + 0.01], [hs, 0.02, HATCH.x, hz + hs / 2 - 0.01], [0.02, hs, HATCH.x - hs / 2 + 0.01, hz], [0.02, hs, HATCH.x + hs / 2 - 0.01, hz]]) g.add(box(w, -y1 + 0.02, d, soil, xx, y1 / 2, zz));
    U.hatch = []; const wood = stdM(0x8a5f3a, 0.8), wdk = stdM(0x5e4029, 0.85);
    for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(HATCH.x + s * hs / 2, 0.0, hz); g.add(piv); const leaf = new THREE.Group(); piv.add(leaf); const lw = hs / 2 - 0.01;
      leaf.add(box(lw, 0.06, hs - 0.02, wood, -s * lw / 2, -0.03, 0)); for (const zz of [-0.28, 0.28]) leaf.add(box(lw * 0.92, 0.014, 0.06, wdk, -s * lw / 2, 0.007, zz));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 16), metal(0x8a8478, 0.4)); ring.rotation.x = Math.PI / 2; ring.position.set(-s * (lw - 0.06), 0.01, 0); leaf.add(ring);
      shadowAll(leaf); U.hatch.push({ piv, s }); }
    // rendijas de luz cálida alrededor de la trampilla cerrada (se ven desde abajo)
    U.leakM = new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.9, toneMapped: false }); U.leak = new THREE.Group(); g.add(U.leak);
    for (const [w, d, xx, zz] of [[hs, 0.012, HATCH.x, hz - hs / 2 + 0.004], [hs, 0.012, HATCH.x, hz + hs / 2 - 0.004], [0.012, hs, HATCH.x - hs / 2 + 0.004, hz], [0.012, hs, HATCH.x + hs / 2 - 0.004, hz], [0.012, hs, HATCH.x, hz]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.004, d), U.leakM); b.position.set(xx, y1 - 0.003, zz); U.leak.add(b); } }
  // una bombilla apagada colgando y unas estanterías con más bloques tachados
  { const cord = cyl(0.004, 0.004, 0.35, dark, 6); cord.position.set(-0.4, y1 - 0.2, -1.0); g.add(cord); const bulb = sph(0.04, stdM(0x8c8a82, 0.3), 12, 8); bulb.position.set(-0.4, y1 - 0.4, -1.0); g.add(bulb); }
  shadowAll(g, true, true); return g; }
// el árbol (desnudo al principio, florece cuando sale): reutiliza el árbol de estaciones
function seasonTree(G, x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); G.add(g); const U = g.userData, bark = stdM(0x5a4636, 0.9);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 3.0, 12), bark); tr.position.y = 1.5; tr.castShadow = true; g.add(tr);
  const R = rng(17); U.br = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + R() * 0.5, L = 1.1 + R() * 0.8, b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.07, L, 8), bark); b.geometry.translate(0, L / 2, 0);
    b.position.set(0, 2.3 + R() * 0.9, 0); b.rotation.set(0.8 * Math.sin(a), 0, -0.8 * Math.cos(a)); b.castShadow = true; g.add(b); U.br.push(b);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, L * 0.6, 6), bark); tw.geometry.translate(0, L * 0.3, 0); tw.position.y = L * 0.7; tw.rotation.set(0.5, 0, 0.6 * (R() - 0.5)); b.add(tw); }
  U.leaf = new THREE.MeshStandardMaterial({ color: 0x8cc25a, roughness: 0.85, flatShading: true }); U.crown = new THREE.Group(); U.crown.position.y = 3.4; g.add(U.crown);
  for (let i = 0; i < 11; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + R() * 0.4, 1), U.leaf); s.position.set((R() - 0.5) * 2.1, (R() - 0.3) * 1.4, (R() - 0.5) * 1.5); s.castShadow = true; U.crown.add(s); }
  U.bloom = new THREE.MeshStandardMaterial({ color: 0xffc4d8, roughness: 0.7, flatShading: true, emissive: 0xff8fb5, emissiveIntensity: 0.0 }); U.flowers = new THREE.Group(); U.crown.add(U.flowers);
  for (let i = 0; i < 90; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08 + R() * 0.07, 0), U.bloom); const a = R() * 6.28, e = R() * 1.4 - 0.4, r = 1.15 + R() * 0.4;
    s.position.set(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r * 0.8, Math.sin(a) * Math.cos(e) * r * 0.8); s.userData.d = R(); U.flowers.add(s); }
  return g; }
