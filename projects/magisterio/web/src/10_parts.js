// ---------------------------------------------------------------- «Magisterio por dentro»: materiales y piezas del aula de Infantil.
// Escala real en metros: mesa de los niños 0,55 m, sillita 0,31 m, macarrón 4 cm. El aula va de x −4,2 a 4,2 y de z −3,6 a 3,6 (3 m de alto);
// la pizarra está en la pared del fondo (z −3,6), las ventanas a la izquierda (x −4,2) y la puerta a la derecha (x 4,2).
const M = {};
const RX = 4.2, RZ = 3.6, RH = 3.0, TABLE_Y = 0.55;
function repTex(t, rx, ry) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
function woodTex(base, dark, light, seed = 1) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y0 = hash(i * 3.3 + seed) * h, a = 0.05 + hash(i * 7.1 + seed) * 0.2, amp = 2 + hash(i * 1.7) * 8, f = 0.004 + hash(i * 5.5) * 0.012;
      g.strokeStyle = hash(i * 2.2 + seed) > 0.45 ? dark : light; g.globalAlpha = a; g.lineWidth = 0.6 + hash(i * 9.9) * 2.2; g.beginPath();
      for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + i) * amp + Math.sin(x * f * 3.1 + i * 2) * amp * 0.3; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}
function speckTex(base, cols, n, seed = 1, px = 512, rmax = 2.4) {      // terrazo, yeso, corcho
  return canvasTex(px, px, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.25 + hash(i * 1.9 + seed) * 0.6; const r = 0.4 + hash(i * 5.3 + seed) * rmax;
      g.beginPath(); g.ellipse(hash(i * 3.7 + seed) * w, hash(i * 8.1 + seed) * h, r, r * (0.6 + hash(i * 2.3) * 0.6), hash(i) * 3, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  });
}
function buildMats() {
  M.wood = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#bf9c71', '#94724b', '#d8bb92', 2), 1, 1), roughness: 0.66, clearcoat: 0.12, clearcoatRoughness: 0.4 });
  M.woodD = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#4c3423', '#2c1d12', '#6b4b31', 4), 1, 1), roughness: 0.6, clearcoat: 0.1, clearcoatRoughness: 0.4 });
  M.wall = new THREE.MeshStandardMaterial({ map: repTex(speckTex('#e6e2da', ['#d8d3ca', '#efebe4'], 2200, 3, 512, 1.6), 6, 3), roughness: 0.93 });
  M.wallLow = new THREE.MeshPhysicalMaterial({ color: 0x8f949b, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.3 });
  M.floor = new THREE.MeshPhysicalMaterial({ map: repTex(speckTex('#8e8a83', ['#6f6b65', '#b5b0a7', '#57534e', '#cfc9bf'], 9000, 7, 1024, 2.2), 7, 6), roughness: 0.32, clearcoat: 0.75, clearcoatRoughness: 0.12 });
  M.ceil = new THREE.MeshStandardMaterial({ color: 0xd7d3cb, roughness: 0.95 });
  M.plW = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.12 });      // sillitas (color por instancia)
  M.macW = new THREE.MeshPhysicalMaterial({ color: 0xf1eee8, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.25 });
  M.macB = new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  M.macN = new THREE.MeshPhysicalMaterial({ color: 0xe6c27a, roughness: 0.55, clearcoat: 0.2, sheen: 0.3, sheenColor: new THREE.Color(0xfff0c8) });
  M.macI = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.2 });    // macarrones sueltos (color por instancia)
  M.peg = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#dcbf95', '#b8956a', '#ecd6b2', 9), 1, 1), roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  M.pegI = new THREE.MeshPhysicalMaterial({ color: 0xdcbd92, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  M.gold = metal(0xffcf6e, 0.2); M.steel = metal(0xd3d8e0, 0.25); M.dsteel = metal(0x7d858f, 0.35);
  M.paper = new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.9 });
  M.cork = new THREE.MeshStandardMaterial({ map: repTex(speckTex('#a8835a', ['#7d5c3a', '#c9a378', '#5e4329'], 6000, 11, 512, 2), 2, 1), roughness: 0.95 });
  M.felt = new THREE.MeshStandardMaterial({ map: repTex(speckTex('#3d3c3a', ['#2e2d2b', '#4c4b48'], 5000, 13, 512, 1.4), 3, 3), roughness: 1 });
  M.chalk = new THREE.MeshStandardMaterial({ color: 0xf2f1ea, roughness: 0.95 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.45, metalness: 0.2 });
  M.string = new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.8 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x1a1b1f, roughness: 0.75 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xdfe8ee, roughness: 0.03, transparent: true, opacity: 0.06, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
}
function cpuTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g }; return t; }
const mesh = (geo, m, cs = true) => { const o = new THREE.Mesh(geo, m); o.castShadow = cs; o.receiveShadow = true; return o; };
const grp = (...ch) => { const g = new THREE.Group(); for (const c of ch) g.add(c); return g; };
const at = (o, x, y, z, ry = 0, rx = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
const strip = g => { g = g.index ? g : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; };
const mergeAll = gs => mergeGeometries(gs.map(g => strip(g.index ? g.toNonIndexed() : g)));
// rótulo pintado en un plano (cartel de la puerta, tarjetas del abecedario, calendario…)
function plateText(w, h, lines, { fg = '#111', bg = '#f4f1ea', font = 'Inter', weight = 800, px = 512, border = false } = {}) {
  const t = canvasTex(px, Math.round(px * h / w), (g, W2, H2) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W2, H2); }
    if (border) { g.strokeStyle = fg; g.lineWidth = W2 * 0.02; g.strokeRect(W2 * 0.05, H2 * 0.06, W2 * 0.9, H2 * 0.88); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([s, size, yy, col]) => { g.font = `${weight} ${size * H2}px ${font}`; g.fillStyle = col || fg; g.fillText(s, W2 / 2, yy * H2, W2 * 0.92); });
  });
  return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }), false);
}

// ---------------------------------------------------------------- macarrón: tubo hueco con estrías (rigatoni), de 4 cm × 1,4 cm, eje y
function macGeo(L = 0.04, ro = 0.0068, ri = 0.0048, nr = 16) {
  const k = a => 1 + 0.065 * Math.cos(a * nr), dk = a => -0.065 * nr * Math.sin(a * nr);
  const o = new THREE.CylinderGeometry(ro, ro, L, 96, 1, true), p = o.attributes.position, n = o.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = ro * k(a), dr = ro * dk(a);
    p.setX(i, r * Math.cos(a)); p.setZ(i, r * Math.sin(a));
    const nx = r * Math.cos(a) + dr * Math.sin(a), nz = r * Math.sin(a) - dr * Math.cos(a), l = Math.hypot(nx, nz); n.setXYZ(i, nx / l, 0, nz / l);
  }
  const inn = new THREE.CylinderGeometry(ri, ri, L, 40, 1, true); { const nn = inn.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, -nn.getX(i), -nn.getY(i), -nn.getZ(i)); const ix = inn.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; } }
  const cap = s => { const c = new THREE.RingGeometry(ri, ro, 96, 1), q = c.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), r = Math.hypot(x, y); if (r > (ri + ro) / 2) { const a = Math.atan2(y, x), kk = k(a); q.setX(i, x * kk); q.setY(i, y * kk); } }
    c.rotateX(s > 0 ? -Math.PI / 2 : Math.PI / 2); c.translate(0, s * L / 2, 0); return c; };
  return mergeAll([o, inn, cap(1), cap(-1)]);
}
// ---------------------------------------------------------------- muñeco de madera (como los de jugar): sentado (cuerpo + cabeza) o de pie
function pegGeo(stand = false) {
  const body = stand ? new THREE.CapsuleGeometry(0.11, 0.5, 8, 20) : new THREE.CapsuleGeometry(0.1, 0.2, 8, 20);
  body.translate(0, stand ? 0.36 : 0.2, 0);
  const head = new THREE.SphereGeometry(stand ? 0.1 : 0.09, 28, 20); head.translate(0, stand ? 0.84 : 0.51, 0);
  return mergeAll([body, head]);
}
// ---------------------------------------------------------------- muebles
function chairGeo() {          // sillita de Infantil (asiento a 0,31 m), respaldo hacia −z
  const parts = [];
  const seat = new THREE.BoxGeometry(0.29, 0.024, 0.28); seat.translate(0, 0.3, 0); parts.push(seat);
  const back = new THREE.BoxGeometry(0.29, 0.17, 0.022); back.translate(0, 0.49, -0.13); parts.push(back);
  for (const [x, z] of [[-0.125, -0.12], [0.125, -0.12], [-0.125, 0.12], [0.125, 0.12]]) { const l = new THREE.CylinderGeometry(0.011, 0.011, 0.3, 10); l.translate(x, 0.15, z); parts.push(l); }
  for (const x of [-0.125, 0.125]) { const l = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 8); l.translate(x, 0.4, -0.125); parts.push(l); }
  return mergeAll(parts);
}
function kidTable(w = 1.2, d = 0.6) {
  const g = new THREE.Group();
  const top = rbox(w, d, 0.034, M.wood, 0.02); top.rotation.x = -Math.PI / 2; top.position.y = TABLE_Y - 0.017; g.add(top);
  const edge = mesh(new THREE.BoxGeometry(w - 0.06, 0.05, d - 0.06), M.wood); edge.position.y = TABLE_Y - 0.055; g.add(edge);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = cyl(0.022, 0.022, TABLE_Y - 0.03, M.steel, 14); l.position.set(x * (w / 2 - 0.07), (TABLE_Y - 0.03) / 2, z * (d / 2 - 0.07)); g.add(l); }
  return g;
}
function shelfUnit(w, h, d, rows, m = M.wood) {         // estantería baja abierta
  const g = new THREE.Group(), t = 0.022;
  for (const x of [-w / 2 + t / 2, w / 2 - t / 2]) { const s = mesh(new THREE.BoxGeometry(t, h, d), m); s.position.set(x, h / 2, 0); g.add(s); }
  for (let i = 0; i <= rows; i++) { const s = mesh(new THREE.BoxGeometry(w, t, d), m); s.position.set(0, 0.04 + i * (h - 0.06) / rows, 0); g.add(s); }
  const b = mesh(new THREE.BoxGeometry(w, h, 0.01), m); b.position.set(0, h / 2, -d / 2 + 0.005); g.add(b);
  return g;
}
function book(w, h, d, c, seed = 1) {          // libro de cuentos (tapa dura de un color y cantos de papel)
  const g = new THREE.Group();
  const cov = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.5, clearcoat: 0.5 });
  const a = mesh(new THREE.BoxGeometry(w, h, 0.004), cov); a.position.z = d / 2 - 0.002; g.add(a);
  const b = mesh(new THREE.BoxGeometry(w, h, 0.004), cov); b.position.z = -d / 2 + 0.002; g.add(b);
  const sp = mesh(new THREE.BoxGeometry(0.004, h, d), cov); sp.position.x = -w / 2 + 0.002; g.add(sp);
  const pg = mesh(new THREE.BoxGeometry(w - 0.008, h - 0.008, d - 0.008), M.paper); pg.position.x = 0.002; g.add(pg);
  return g;
}
function pencil(L = 0.17) {           // lápiz hexagonal de madera con mina, a lo largo de +y (punta arriba)
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.0042, 0.0042, L * 0.86, 6), new THREE.MeshPhysicalMaterial({ color: 0x1c1c1f, roughness: 0.35, clearcoat: 0.8 })); body.position.y = L * 0.43; g.add(body);
  const cone = mesh(new THREE.CylinderGeometry(0.0012, 0.0042, L * 0.1, 18), M.wood); cone.position.y = L * 0.86 + L * 0.05; g.add(cone);
  const tip = mesh(new THREE.ConeGeometry(0.0013, L * 0.035, 12), M.black); tip.position.y = L * 0.96 + L * 0.016; g.add(tip);
  const ferr = cyl(0.0046, 0.0046, 0.012, M.steel, 18); ferr.position.y = -0.004; g.add(ferr);
  const er = cyl(0.0043, 0.0043, 0.012, new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: 0.8 }), 18); er.position.y = -0.016; g.add(er);
  return g;
}
function top3() {        // peonza de madera
  const g = new THREE.Group();
  const b = lathe([[0, 0], [0.006, 0.004], [0.03, 0.03], [0.048, 0.055], [0.05, 0.065], [0.04, 0.078], [0.012, 0.082], [0.008, 0.11], [0, 0.112]], 48, M.wood); g.add(b);
  const band = cyl(0.0505, 0.0505, 0.008, M.macB, 48); band.position.y = 0.061; g.add(band);
  const tip = cyl(0.0015, 0.004, 0.012, M.steel, 12); tip.position.y = 0.002; g.add(tip);
  return g;
}
function infinity(m) {      // ∞ (lemniscata) de tubo
  const pts = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, d = 1 + Math.sin(a) ** 2; pts.push(v3(0.09 * Math.cos(a) / d, 0.09 * Math.sin(a) * Math.cos(a) / d, 0)); }
  return tube(pts, 0.009, m, 240, true, 14);
}
