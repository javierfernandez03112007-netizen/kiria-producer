// ---------------------------------------------------------------- el decorado: la calle (asfalto, líneas, aceras), los edificios art déco con neón, las torres del fondo,
// palmeras, farolas, el callejón con su contenedor, la joyería con la alarma y la cámara de seguridad en su poste.
const SETU = {};
function boxUV(geo, w, h, d, tile) {              // UV a escala real: una tesela mide `tile` metros en cada cara
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  uv.needsUpdate = true; return geo;
}
function repT(t, rx = 1, ry = 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
function facTex(base, seed, emis) {                 // fachada pastel: 4 × 4 ventanas por tesela (12 m), algunas encendidas
  return repT(canvasTex(512, 512, (g, W2, H2) => {
    g.fillStyle = emis ? '#000' : base; g.fillRect(0, 0, W2, H2);
    if (!emis) { for (let i = 0; i < 2600; i++) { g.fillStyle = hash(i * 1.7 + seed) > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; g.fillRect(hash(i * 3.1 + seed) * W2, hash(i * 5.3) * H2, 2 + hash(i) * 3, 2 + hash(i * 2) * 3); }
      g.fillStyle = 'rgba(255,255,255,.22)'; for (let r = 0; r < 4; r++) g.fillRect(0, r * 128 + 4, W2, 5); }
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { const x = c * 128 + 30, y = r * 128 + 36, w = 68, h = 68, lit = hash(seed * 7.3 + c * 3.1 + r * 5.7) < 0.4;
      if (emis) { if (lit) { g.fillStyle = hash(seed + c * 9 + r) > 0.3 ? '#ffd9a0' : '#bfe0ff'; g.fillRect(x, y, w, h); } }
      else { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x - 6, y - 6, w + 12, h + 12); g.fillStyle = lit ? '#ffdcae' : '#26314c'; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + w / 2 - 2, y, 4, h); g.fillRect(x, y + h / 2 - 2, w, 4); } }
  }));
}
function towerTex(seed, emis) {                      // torre lejana: muchas ventanas pequeñas
  return repT(canvasTex(256, 512, (g, W2, H2) => { g.fillStyle = emis ? '#000' : '#171b3a'; g.fillRect(0, 0, W2, H2);
    for (let c = 0; c < 8; c++) for (let r = 0; r < 16; r++) { const lit = hash(seed * 3.3 + c * 7.1 + r * 1.9) < 0.34; g.fillStyle = lit ? (hash(c + r * 3 + seed) > 0.4 ? '#ffcf8f' : '#9fd0ff') : (emis ? '#000' : '#232a52'); g.fillRect(c * 32 + 7, r * 32 + 8, 18, 16); } }));
}
function neonSign(txt, col, h = 1.2, vertical = false) {       // letrero de neón (texto con brillo); mide h de alto (o de ancho por letra si es vertical)
  const css = '#' + new THREE.Color(col).getHexString(), n = txt.length, cw = vertical ? 150 : 110 * n + 60, ch = vertical ? 150 * n + 40 : 190;
  const t = canvasTex(cw, ch, (g, W2, H2) => { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 120px Inter, sans-serif'; g.shadowColor = css; g.shadowBlur = 26; g.fillStyle = css;
    if (vertical) for (let i = 0; i < n; i++) { g.fillText(txt[i], W2 / 2, 90 + i * 150); g.fillText(txt[i], W2 / 2, 90 + i * 150); }
    else { g.fillText(txt, W2 / 2, H2 / 2 + 6); g.fillText(txt, W2 / 2, H2 / 2 + 6); }
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '900 120px Inter, sans-serif'; g.globalAlpha = 0.55;
    if (vertical) for (let i = 0; i < n; i++) g.fillText(txt[i], W2 / 2, 90 + i * 150); else g.fillText(txt, W2 / 2, H2 / 2 + 6); });
  const w = vertical ? h : h * cw / ch, hh = vertical ? h * ch / cw : h;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5), fog: false }));
  m.renderOrder = 3; return m;
}
function palmGeo() {                                   // palmera: tronco curvo + 9 hojas arqueadas (≈ 8 m)
  const S2 = 32, pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(v3(Math.sin(u * 1.2) * 0.035 * S2, u * 0.26 * S2, 0)); }
  const trunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.17, 7), leaves = [];
  for (let k = 0; k < 9; k++) { const L = (0.12 + hash(k * 3.7) * 0.03) * S2, lg = new THREE.PlaneGeometry(L, 0.05 * S2, 12, 2); lg.translate(L / 2, 0, 0);
    const p = lg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), u = x / L, wid = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.35);
      p.setY(i, y * wid); p.setZ(i, (-u * u * 0.075 * S2) - Math.abs(y) * wid * 0.35); }
    lg.rotateX(-Math.PI / 2); lg.rotateZ(0.32); lg.rotateY(k / 9 * Math.PI * 2 + hash(k) * 0.35); lg.translate(Math.sin(1.2) * 0.035 * S2, 0.262 * S2, 0); leaves.push(lg.toNonIndexed()); }
  const lv = mergeGeometries(leaves); lv.computeVertexNormals(); return { trunk, leaves: lv };
}
function buildSet() {
  const G = new THREE.Group(), add = (m, x, y, z) => { m.position.set(x, y, z); G.add(m); return m; };
  const box = (w, h, d, mat, cs = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = cs; m.receiveShadow = true; return m; };
  // ---- suelo: la base de la maqueta, la calzada, las líneas y las aceras
  const asph = repT(canvasTex(512, 512, (g, W2, H2) => { g.fillStyle = '#2c2d35'; g.fillRect(0, 0, W2, H2); for (let i = 0; i < 9000; i++) { const v = 30 + hash(i * 1.3) * 50 | 0; g.fillStyle = `rgba(${v + 20},${v + 20},${v + 30},.55)`; g.fillRect(hash(i * 2.7) * W2, hash(i * 4.1) * H2, 1.5, 1.5); } }), 78, 3);
  const mAsph = new THREE.MeshPhysicalMaterial({ map: asph, roughness: 0.7, clearcoat: 0.18, clearcoatRoughness: 0.45, envMapIntensity: 0.9 });
  const side = repT(canvasTex(256, 256, (g, W2, H2) => { g.fillStyle = '#cbbba8'; g.fillRect(0, 0, W2, H2); g.strokeStyle = 'rgba(90,70,60,.35)'; g.lineWidth = 3; g.strokeRect(0, 0, W2, H2); for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(80,60,50,.07)'; g.fillRect(hash(i * 3.3) * W2, hash(i * 7.7) * H2, 3, 3); } }), 130, 2);
  const mSide = new THREE.MeshStandardMaterial({ map: side, roughness: 0.85 }), mDark = new THREE.MeshStandardMaterial({ color: 0x16131f, roughness: 0.6, metalness: 0.2 });
  add(box(270, 1.4, 44, mDark, false), -65, -0.71, -13.5);                                             // base
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x140e20, roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; add(floor, 0, -1.42, 0);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(270, 8), mAsph); road.rotation.x = -Math.PI / 2; road.receiveShadow = true; add(road, -65, 0.01, 0);
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(8, 28), mAsph); cross.rotation.x = -Math.PI / 2; cross.receiveShadow = true; add(cross, 21, 0.012, -18);
  const mY = new THREE.MeshStandardMaterial({ color: 0xffd34a, roughness: 0.6, emissive: 0x3a2a00 }), mW = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 });
  for (let x = -200; x < 70; x += 5) add(box(2.6, 0.02, 0.16, mY, false), x + 1.3, 0.025, 0);
  for (const z of [-3.75, 3.75]) add(box(270, 0.02, 0.12, mW, false), -65, 0.025, z);
  for (let i = 0; i < 7; i++) add(box(0.55, 0.02, 6.6, mW, false), 13.2 + i * 0.95 - 3.4, 0.027, 0);    // paso de cebra
  for (const [x0, x1] of [[-200, 17], [25, 70]]) add(box(x1 - x0, 0.16, 3.5, mSide), (x0 + x1) / 2, 0.08, -5.75);
  add(box(270, 0.16, 3.5, mSide), -65, 0.08, 5.75);
  // la playa y el mar, al sur
  add(box(270, 0.3, 13, new THREE.MeshStandardMaterial({ color: 0xeccf9a, roughness: 0.95 }), false), -65, -0.06, 14);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 500), new THREE.MeshPhysicalMaterial({ color: 0x1f7f9c, roughness: 0.16, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.5 })); sea.rotation.x = -Math.PI / 2; add(sea, -65, -0.3, 268);
  // ---- edificios (fachada en z = −7,5): [x0, x1, alto, color, letrero]
  const mRoof = new THREE.MeshStandardMaterial({ color: 0xe6dfd4, roughness: 0.8 }), mTrim = new THREE.MeshStandardMaterial({ color: 0xfbf6ee, roughness: 0.5 });
  const B = [[-36, -24, 11, '#9fe3d0', NEON.pink], [-24, -15, 8.5, '#ffc9a8', NEON.teal], [-15, -9, 10, '#f6e2a0', NEON.violet], [SHOP.x0, SHOP.x1, 7.2, '#ffb3c8', NEON.teal],
    [-1, ALLEY.x0, 12.5, '#8fdcee', NEON.pink], [ALLEY.x1, 17, 10.5, '#d7c2ff', NEON.yellow], [25, 35, 9.5, '#ffb59a', NEON.teal], [35, 48, 13, '#f3f0ff', NEON.pink]];
  { const cols = ['#9fe3d0', '#ffc9a8', '#f6e2a0', '#ffb3c8', '#8fdcee', '#d7c2ff', '#ffb59a', '#f3f0ff'], ncs = [NEON.pink, NEON.teal, NEON.violet, NEON.yellow]; let x = -36, i = 0;
    while (x > -190) { const w = 8 + hash(i * 3.7) * 6; B.push([x - w, x, 7 + hash(i * 5.1) * 8, cols[(i + 3) % 8], ncs[i % 4]]); x -= w; i++; } }
  const D = 11.5; SETU.neon = [];
  B.forEach(([x0, x1, h, col, nc], i) => { const w = x1 - x0, m = new THREE.MeshStandardMaterial({ map: facTex(col, i + 1, false), emissiveMap: facTex(col, i + 1, true), emissive: 0xffd2a0, emissiveIntensity: 1.25, roughness: 0.82 });
    const b = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, D), w, h, D, 12), [m, m, mRoof, mRoof, m, m]); b.castShadow = b.receiveShadow = true; add(b, (x0 + x1) / 2, h / 2, -7.5 - D / 2);
    add(box(w + 0.3, 0.4, D + 0.3, mTrim), (x0 + x1) / 2, h + 0.2, -7.5 - D / 2);
    if (hash(i * 3.3) > 0.4) add(box(w * 0.5, 1.4, D * 0.5, m), (x0 + x1) / 2, h + 1.1, -7.5 - D / 2);
    const nm = basicGlow(nc, 1.5); nm.fog = false; const n1 = add(new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.1, 0.1), nm), (x0 + x1) / 2, h - 0.25, -7.42), n2 = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, h * 0.72, 0.1), nm), x0 + 0.3, h * 0.6, -7.42);
    const n3 = add(new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.08, 0.08), nm), (x0 + x1) / 2, 3.3, -7.42); SETU.neon.push(nm); });
  add(neonSign('HOTEL', NEON.pink, 1.15, true), ALLEY.x0 - 0.9, 7.6, -7.3); add(neonSign('MOTEL', NEON.teal, 1.3), 30, 10.6, -7.3); add(neonSign('BAR', NEON.yellow, 1.1), 14.6, 4.2, -7.3);
  add(neonSign('24H', NEON.violet, 1.0), -12, 4.3, -7.3); add(neonSign('OCEAN', NEON.pink, 1.3), -30, 12.1, -7.3);
  // ---- torres del fondo
  [[-44, 22, 10], [-31, 30, 9], [-19, 24, 11], [-7, 36, 9], [5, 27, 10], [16, 32, 8], [29, 25, 11], [42, 34, 10], [-57, 28, 10], [-70, 38, 11], [-84, 24, 9], [-98, 33, 10], [-112, 27, 11], [-127, 40, 10], [-142, 26, 9], [-158, 34, 11], [-174, 30, 10]].forEach(([x, h, w], i) => { const m = new THREE.MeshStandardMaterial({ map: towerTex(i, false), emissiveMap: towerTex(i, true), emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.5, metalness: 0.3 });
    const b = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, 9), w, h, 9, 14), m); b.castShadow = true; add(b, x, h / 2 - 0.5, -27 - (i % 2) * 3); });
  // ---- palmeras y farolas
  const pg = palmGeo(), mTr = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.85 }), mLf = new THREE.MeshStandardMaterial({ color: 0x2f8f45, roughness: 0.55, side: THREE.DoubleSide });
  const PALMS = [[12.5, 6.3, 1, 3.3], [24, 6.2, 0.92, 5.0], [37, 6.3, 1, 1.2], [10.2, -5.7, 0.8, 4.2], [28, -5.6, 0.9, 0.9]];
  for (let x = -6, i = 0; x > -185; x -= 10.5, i++) { PALMS.push([x + hash(i * 3.1) * 3, 6.3, 0.85 + hash(i * 7.7) * 0.25, hash(i * 1.9) * 6.3]); if (i % 2 && x < -14) PALMS.push([x - 4, -5.6, 0.8 + hash(i * 4.3) * 0.2, hash(i * 2.9) * 6.3]); }
  for (const [x, z, s, ry] of PALMS) {
    const p = new THREE.Group(), a = new THREE.Mesh(pg.trunk, mTr), b = new THREE.Mesh(pg.leaves, mLf); a.castShadow = b.castShadow = true; p.add(a, b); p.scale.setScalar(s); p.rotation.y = ry; add(p, x, 0.16, z); }
  const mPole = new THREE.MeshStandardMaterial({ color: 0x2a2d38, roughness: 0.5, metalness: 0.6 }), mBulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe2b0).multiplyScalar(2.4), toneMapped: false, fog: false });
  const LAMPS = [[19.5, 4.6, -1], [11.5, -4.6, 1], [31, -4.6, 1]]; for (let x = -18; x > -180; x -= 22) LAMPS.push([x, 4.6, -1], [x - 11, -4.6, 1]);
  for (const [x, z, sd] of LAMPS) { const l = new THREE.Group(); const p = cyl(0.07, 0.09, 5.6, mPole, 10); p.position.y = 2.8; l.add(p);
    const arm = box(0.08, 0.08, 1.3, mPole); arm.position.set(0, 5.55, sd * 0.6); l.add(arm); const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), mBulb); b.position.set(0, 5.45, sd * 1.2); l.add(b);
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xffd9a0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); h.scale.setScalar(2.6); h.position.copy(b.position); l.add(h); add(l, x, 0.16, z); }
  // ---- el callejón: suelo, tapia del fondo, contenedor, bolsas y un farol
  const al = new THREE.Mesh(new THREE.PlaneGeometry(ALLEY.x1 - ALLEY.x0, 11.5), new THREE.MeshStandardMaterial({ color: 0x23222b, roughness: 0.75 })); al.rotation.x = -Math.PI / 2; al.receiveShadow = true; add(al, (ALLEY.x0 + ALLEY.x1) / 2, 0.17, -13.25);
  add(box(ALLEY.x1 - ALLEY.x0, 5.5, 0.4, new THREE.MeshStandardMaterial({ color: 0x4a3b44, roughness: 0.9 })), (ALLEY.x0 + ALLEY.x1) / 2, 2.75, -18.8);
  const mBin = new THREE.MeshStandardMaterial({ color: 0x2f7d5b, roughness: 0.55, metalness: 0.3 }), bin = new THREE.Group(); { const b = box(2.3, 1.15, 1.15, mBin); b.position.y = 0.72; bin.add(b); const lid = box(2.36, 0.1, 1.2, new THREE.MeshStandardMaterial({ color: 0x1f5a41, roughness: 0.5, metalness: 0.3 })); lid.position.set(0, 1.34, 0); lid.rotation.x = 0.08; bin.add(lid);
    for (const sx of [-0.95, 0.95]) { const w = cyl(0.11, 0.11, 0.1, mDark, 10); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.11, 0.45); bin.add(w); } }
  add(bin, ALLEY.bin.x + 0.05, 0.17, ALLEY.bin.z);
  for (const [x, z, s] of [[7.0, -9.4, 0.42], [6.7, -8.9, 0.34], [4.5, -14.5, 0.4]]) { const s2 = sph(s, new THREE.MeshStandardMaterial({ color: 0x15151b, roughness: 0.35 }), 12, 8); s2.scale.y = 0.8; add(s2, x, 0.17 + s * 0.7, z); }
  const farol = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), mBulb); add(farol, ALLEY.x1 - 0.25, 3.5, -11.5); SETU.alleyL = new THREE.PointLight(0xffc890, 0, 16, 1.6); add(SETU.alleyL, ALLEY.x1 - 0.8, 3.4, -11.5);
  // ---- la joyería: escaparate, toldo, puerta, letrero y la alarma
  const jw = canvasTex(512, 400, (g, W2, H2) => { const gr = g.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, '#fff1cf'); gr.addColorStop(1, '#f2c98a'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
    for (const y of [150, 290]) { g.fillStyle = 'rgba(120,80,40,.35)'; g.fillRect(20, y, W2 - 40, 8); }
    for (let i = 0; i < 10; i++) { const x = 60 + (i % 5) * 98, y = i < 5 ? 108 : 248, c = ['#5ad7ff', '#ff6fb5', '#ffffff', '#7CF0A9', '#b58cff'][i % 5]; g.fillStyle = c; g.strokeStyle = 'rgba(60,40,20,.6)'; g.lineWidth = 3;
      if (i % 2) { g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x + 24, y - 8); g.lineTo(x, y + 30); g.lineTo(x - 24, y - 8); g.closePath(); g.fill(); g.stroke(); } else { g.strokeStyle = '#d9a23a'; g.lineWidth = 9; g.beginPath(); g.arc(x, y + 4, 22, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y - 22, 9, 0, 7); g.fill(); } } });
  const mGlassW = new THREE.MeshBasicMaterial({ map: jw, color: new THREE.Color(1.15, 1.15, 1.15), toneMapped: false }), mFrame = new THREE.MeshStandardMaterial({ color: 0x2a2030, roughness: 0.4, metalness: 0.4 });
  add(box(SHOP.x1 - SHOP.x0 - 0.6, 3.0, 0.2, mFrame), (SHOP.x0 + SHOP.x1) / 2, 1.66, -7.42);
  for (const [x, w] of [[-7.4, 2.0], [-2.9, 2.6]]) add(new THREE.Mesh(new THREE.PlaneGeometry(w, 1.7), mGlassW), x, 1.75, -7.3);
  add(new THREE.Mesh(new THREE.PlaneGeometry(1.25, 2.4), new THREE.MeshPhysicalMaterial({ color: 0x1c2a44, roughness: 0.1, metalness: 0.5, clearcoat: 1 })), SHOP.door, 1.4, -7.3);
  const awT = repT(canvasTex(64, 64, (g, W2, H2) => { g.fillStyle = '#ff6fa8'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#fff5fa'; g.fillRect(0, 0, W2 / 2, H2); }), 8, 1);
  const aw = box(SHOP.x1 - SHOP.x0 - 0.4, 0.08, 1.5, new THREE.MeshStandardMaterial({ map: awT, roughness: 0.7 })); aw.rotation.x = 0.32; add(aw, (SHOP.x0 + SHOP.x1) / 2, 3.25, -6.75);
  add(neonSign('JOYERÍA', NEON.teal, 0.95), (SHOP.x0 + SHOP.x1) / 2 - 0.6, 4.55, -7.3);
  const alarm = new THREE.Group(); { const b = box(0.55, 0.55, 0.22, new THREE.MeshStandardMaterial({ color: 0xd62b3a, roughness: 0.4 })); alarm.add(b); const bell = cyl(0.17, 0.17, 0.06, new THREE.MeshStandardMaterial({ color: 0xffd34a, roughness: 0.3, metalness: 0.6 }), 20); bell.rotation.x = Math.PI / 2; bell.position.z = 0.13; alarm.add(bell);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x551018, toneMapped: false })); led.position.set(0, 0.36, 0.05); alarm.add(led); SETU.alarmLed = led; }
  alarm.position.copy(SHOP.alarm); G.add(alarm); SETU.alarm = alarm;
  // ---- la cámara de seguridad: cuelga de un pórtico sobre la calle, detrás del protagonista; piloto rojo y su cono
  const cc = new THREE.Group(); { for (const z of [-4.3, 4.3]) { const p = cyl(0.09, 0.11, CCTV.beam + 0.1, mPole, 10); p.position.set(0, (CCTV.beam + 0.1) / 2 + 0.16, z); cc.add(p); }
    const bm = box(0.14, 0.14, 8.9, mPole); bm.position.set(0, CCTV.beam + 0.2, 0); cc.add(bm); const hg2 = box(0.06, 0.3, 0.06, mPole); hg2.position.set(0, CCTV.beam, CCTV.z); cc.add(hg2);
    const head = new THREE.Group(); head.position.set(0.1, CCTV.y, CCTV.z); const body = box(0.3, 0.28, 0.66, new THREE.MeshStandardMaterial({ color: 0xf1f3f6, roughness: 0.35 })); head.add(body);
    const lens = cyl(0.1, 0.1, 0.12, new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 0.15, metalness: 0.6 }), 16); lens.rotation.x = Math.PI / 2; lens.position.z = 0.37; head.add(lens);
    const visor = box(0.34, 0.03, 0.56, mPole); visor.position.set(0, 0.16, 0.12); head.add(visor);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x40080c, toneMapped: false, fog: false })); led.position.set(0.1, 0.08, 0.34); head.add(led);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xff2a3a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); halo.scale.setScalar(1.1); halo.position.copy(led.position); head.add(halo);
    const L = 10.3, cg = new THREE.CylinderGeometry(0.08, 1.15, L, 24, 1, true); cg.translate(0, -L / 2, 0); cg.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xff3b4e, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false })); cone.position.z = 0.4; cone.renderOrder = 4; head.add(cone);
    cc.add(head); SETU.cctv = { head, led, cone, halo }; }
  cc.position.set(CCTV.x, 0, 0); G.add(cc); G.updateMatrixWorld(true); SETU.cctv.head.lookAt(RING.x, 1.0, RING.z);
  SETU.G = G; return G;
}
// el decorado en t: la cámara de seguridad (cono y piloto), la alarma y el farol del callejón
function setAt(t, o = {}) {
  const c = SETU.cctv, k = clamp(o.cctv ?? 0); c.cone.material.opacity = 0.11 * k * (0.8 + 0.2 * Math.sin(t * 9)); c.cone.visible = k > 0.01; c.halo.material.opacity = k > 0.01 && (t * 2.2) % 1 < 0.6 ? 0.9 : 0;
  c.led.material.color.setHex(k > 0.01 && (t * 2.2) % 1 < 0.6 ? 0xff2a3a : 0x40080c); if (k > 0.01 && (t * 2.2) % 1 < 0.6) c.led.material.color.multiplyScalar(2.2);
  const a = clamp(o.alarm ?? 0); SETU.alarmLed.material.color.setHex(a > 0.01 && (t * 6) % 1 < 0.5 ? 0xff3040 : 0x551018); SETU.alarm.rotation.z = a * Math.sin(t * 60) * 0.06;
  SETU.alleyL.intensity = 26 * clamp(o.alley ?? 0);
}
