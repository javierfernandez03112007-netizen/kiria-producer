// ---------------------------------------------------------------- el escenario (en metros): un bar de Granada abierto por delante, de noche. La barra con azulejos,
// los grifos, el jamón, la pizarra «TAPA CON CADA BEBIDA», la caja, la bodega con los barriles debajo del suelo, la calle con otras
// tiendas y la Alhambra al fondo (telón pintado). La caña y su tapa son las protagonistas.
const BX = 3.6, BZ = 2.6, BH = 3.2, CELLAR = 2.3;                  // bar: medio ancho, medio fondo, alto; bodega (fondo bajo el suelo)
const CTR = { x0: -2.4, x1: 2.4, z: -0.55, h: 1.1, d: 0.6 };       // barra: de x0 a x1, cara delantera en z, alto, fondo
const TOP = CTR.h + 0.05;                                            // encimera
const HERO = v3(-0.35, TOP, CTR.z - 0.16);                           // dónde está la caña protagonista
const BIG = v3(-0.35, 0, 0.95);                                      // el vaso gigante (la cuenta), en el suelo delante de la barra
const BIGH = 1.55, BIGR0 = 0.36, BIGR1 = 0.46;                       // alto y radios del vaso gigante
const ROUND_X = [-0.35, -0.08, 0.19, 0.46, 0.73];                    // las rondas a lo largo de la barra
const KEG = v3(0.2, -CELLAR, -0.6);

function buildBarMats() {
  M.stucco = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ece6da'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${hash(i) > 0.5 ? '120,110,95' : '255,255,255'},${0.04 + hash(i * 3.3) * 0.06})`; g.fillRect(hash(i * 1.7) * w, hash(i * 2.9) * h, 2 + hash(i * 5.1) * 5, 2 + hash(i * 7.3) * 5); } }), roughness: 0.92 });
  M.stucco.map.wrapS = M.stucco.map.wrapT = THREE.RepeatWrapping; M.stucco.map.repeat.set(3, 3);
  M.azulejo = new THREE.MeshPhysicalMaterial({ map: repTex(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f2ede2'; g.fillRect(0, 0, w, h); const c = ['#1f5f8b', '#2e8b6e', '#d9a441'];
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const cx = x * 128 + 64, cy = y * 128 + 64; g.save(); g.translate(cx, cy);
      g.fillStyle = c[0]; for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(0, 30, 10, 26, 0, 0, 7); g.fill(); }
      g.fillStyle = c[2]; g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill(); g.fillStyle = c[1]; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill(); g.restore();
      g.strokeStyle = 'rgba(80,70,60,.35)'; g.lineWidth = 3; g.strokeRect(x * 128, y * 128, 128, 128); } }), 1, 1), roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.15 });
  M.floorTile = new THREE.MeshStandardMaterial({ map: repTex(canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#8e3b22' : '#b4552f'; g.fillRect(x * 64, y * 64, 64, 64); g.fillStyle = `rgba(0,0,0,${0.05 + hash(x * 7 + y) * 0.1})`; g.fillRect(x * 64, y * 64, 64, 64); } g.strokeStyle = '#3a2016'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }), 6, 4), roughness: 0.55 });
  M.brick = new THREE.MeshStandardMaterial({ map: repTex(canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3c2a22'; g.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) { g.fillStyle = `hsl(${12 + hash(r * 9 + c) * 10},${35 + hash(r + c * 3) * 15}%,${28 + hash(r * 3 + c * 7) * 12}%)`; g.fillRect(c * 52 + (r % 2) * 26 - 26, r * 32 + 3, 48, 27); } }), 3, 2), roughness: 0.9 });
  M.beer = new THREE.MeshPhysicalMaterial({ color: 0xf0a514, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.88, emissive: 0x6a3a00, emissiveIntensity: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 });
  M.foam = new THREE.MeshStandardMaterial({ color: 0xfbf6ea, roughness: 0.95 });
  M.glassC = new THREE.MeshPhysicalMaterial({ color: 0xeef6ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: false, side: THREE.DoubleSide });
  M.plateW = new THREE.MeshPhysicalMaterial({ color: 0xfaf7f0, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.15 });
  M.bread = new THREE.MeshStandardMaterial({ color: 0xd99a52, roughness: 0.8 });
  M.crumb = new THREE.MeshStandardMaterial({ color: 0xf3dcae, roughness: 0.9 });
  M.tortilla = new THREE.MeshStandardMaterial({ color: 0xedbb47, roughness: 0.7 });
  M.crust = new THREE.MeshStandardMaterial({ color: 0xb8742c, roughness: 0.75 });
  M.tomato = new THREE.MeshStandardMaterial({ color: 0xc8381f, roughness: 0.5 });
  M.ham = new THREE.MeshPhysicalMaterial({ color: 0x9c2b2b, roughness: 0.45, clearcoat: 0.3 });
  M.fat = new THREE.MeshStandardMaterial({ color: 0xf0e2d6, roughness: 0.6 });
  M.croq = new THREE.MeshStandardMaterial({ color: 0xc9772e, roughness: 0.75 });
  M.sauce = new THREE.MeshPhysicalMaterial({ color: 0x8a2e12, roughness: 0.3, clearcoat: 0.5 });
  M.meat = new THREE.MeshStandardMaterial({ color: 0x6e3d22, roughness: 0.65 });
  M.chalk = new THREE.MeshStandardMaterial({ color: 0x1e2a24, roughness: 0.9 });
  M.iron = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.5, metalness: 0.6 });
  M.roofT = new THREE.MeshStandardMaterial({ color: 0xa9532f, roughness: 0.75 });
  M.chrome = metal(0xe6e9ee, 0.12);
  M.bottle = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.75, clearcoat: 1, clearcoatRoughness: 0.1 });
}

// ---------------------------------------------------------------- la caña (vaso + cerveza + espuma; la cerveza puede bajar) y las tapas
function cana(s = 1) {
  const g = new THREE.Group(), h = 0.13, r0 = 0.027, r1 = 0.034;
  const glass = lathe([[0.001, 0], [r0, 0], [r0 + 0.001, 0.004], [r1, h], [r1 - 0.002, h]], 32, M.glassC); glass.renderOrder = 8; glass.castShadow = false; g.add(glass);
  const base = cyl(r0, r0, 0.006, M.glassC, 32); base.position.y = 0.003; base.renderOrder = 8; g.add(base);
  const liq = new THREE.Group(); g.add(liq);
  const beer = new THREE.Mesh(new THREE.CylinderGeometry(r1 - 0.003, r0 - 0.002, h - 0.022, 32), M.beer); beer.geometry.translate(0, (h - 0.022) / 2 + 0.006, 0); liq.add(beer);
  const foam = cyl(r1 - 0.002, r1 - 0.0025, 0.016, M.foam, 32); foam.position.y = h - 0.016 + 0.008; g.add(foam);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r1 - 0.002, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.foam); dome.scale.y = 0.18; dome.position.y = h; g.add(dome);
  g.userData = { beer, foam, dome, h, r0, r1 }; g.scale.setScalar(s); return g;
}
// nivel de la caña: 1 llena, 0 vacía
function canaLevel(c, k) { const U = c.userData, hh = (U.h - 0.022) * Math.max(0.0001, k); U.beer.scale.y = Math.max(0.0001, k); U.foam.position.y = 0.006 + hh + 0.008; U.dome.position.y = 0.006 + hh + 0.016; U.foam.visible = U.dome.visible = k > 0.03; }
function plate(r = 0.075) { return lathe([[0.001, 0], [r * 0.72, 0], [r * 0.78, 0.004], [r, 0.014], [r * 0.97, 0.016], [r * 0.76, 0.007], [0.001, 0.007]], 40, M.plateW); }
function tapaFood(kind) {
  const g = new THREE.Group();
  if (kind === 'pan') {          // pan con tomate y aceite
    for (const [x, rz] of [[-0.022, 0.1], [0.022, -0.08]]) { const b = rbox(0.05, 0.03, 0.014, M.bread, 0.006); b.rotation.set(-Math.PI / 2, 0, rz); b.position.set(x, 0.015, 0); g.add(b);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.003, 0.024), M.tomato); t.position.set(x, 0.023, 0); t.rotation.y = rz; g.add(t); }
  } else if (kind === 'tortilla') {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.026, 32, 1, false, -0.45, 0.9), M.tortilla); w.position.set(-0.03, 0.02, 0); w.castShadow = true; g.add(w);
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.0605, 0.0605, 0.004, 32, 1, false, -0.45, 0.9), M.crust); cr.position.set(-0.03, 0.034, 0); g.add(cr);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0608, 0.0608, 0.022, 32, 1, true, -0.45, 0.9), M.crust); rim.position.set(-0.03, 0.02, 0); g.add(rim);
    const b = rbox(0.045, 0.028, 0.012, M.bread, 0.005); b.rotation.x = -Math.PI / 2; b.position.set(0.035, 0.013, 0.012); g.add(b);
  } else if (kind === 'montadito') {
    const b = rbox(0.07, 0.035, 0.016, M.bread, 0.007); b.rotation.x = -Math.PI / 2; b.position.y = 0.015; g.add(b);
    for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 16), M.ham); s.position.set(-0.022 + k * 0.022, 0.025 + k * 0.001, 0); s.rotation.z = 0.15; g.add(s); }
  } else if (kind === 'croquetas') {
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.026, 6, 12), M.croq); c.rotation.z = Math.PI / 2; c.rotation.y = (k - 1) * 0.5; c.position.set((k - 1) * 0.018, 0.018, (k - 1) * 0.012); c.castShadow = true; g.add(c); }
  } else if (kind === 'albondigas') {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.006, 32), M.sauce); s.position.y = 0.01; g.add(s);
    for (let k = 0; k < 4; k++) { const b = sph(0.014, M.meat, 14, 10); b.position.set(Math.cos(k * 1.7) * 0.022, 0.02, Math.sin(k * 1.7) * 0.022); g.add(b); }
  } else {                        // jamón
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.003, 18), M.ham); s.scale.set(1.3, 1, 0.8); s.position.set((hash(k) - 0.5) * 0.06, 0.011 + k * 0.002, (hash(k * 3) - 0.5) * 0.05); s.rotation.y = k; g.add(s);
      const f = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0018, 4, 18, 1.4), M.fat); f.rotation.x = Math.PI / 2; f.position.copy(s.position); f.position.y += 0.002; f.rotation.z = k; g.add(f); }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function tapa(kind, r = 0.075) { const g = new THREE.Group(); const p = plate(r); g.add(p); const f = tapaFood(kind); f.position.y = 0.006; g.add(f); g.userData.food = f; return g; }
// etiqueta «GRATIS» clavada en un palillo, en 4 trozos que saltan
function gratisTag() {
  const g = new THREE.Group(), w = 0.07, h = 0.034;
  const tx = canvasTex(512, 248, (c, W2, H2) => { c.fillStyle = '#fffdf6'; c.fillRect(0, 0, W2, H2); c.strokeStyle = '#e5243f'; c.lineWidth = 14; c.strokeRect(10, 10, W2 - 20, H2 - 20); c.fillStyle = '#e5243f'; c.font = '900 150px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('GRATIS', W2 / 2, H2 / 2 + 8, W2 - 50); });
  const m = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6, side: THREE.DoubleSide });
  const pick = cyl(0.0012, 0.0012, 0.07, M.wood, 6); pick.position.y = 0.035; g.add(pick);
  const pieces = [];
  for (let i = 0; i < 4; i++) {
    const ix = i % 2, iy = Math.floor(i / 2), geo = new THREE.PlaneGeometry(w / 2, h / 2), uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) + ix) / 2, (uv.getY(k) + iy) / 2);
    const p = new THREE.Mesh(geo, m); p.castShadow = true; const home = v3((ix - 0.5) * w / 2, 0.07 + (iy - 0.5) * h / 2, 0.002); p.position.copy(home); p.userData.home = home; g.add(p); pieces.push(p);
  }
  g.userData = { pieces, pick }; return g;
}

// ---------------------------------------------------------------- piezas del bar
function pawnGeo() { const g = studentGeo(false); g.scale(27, 27, 27); return g; }        // figurita de cerámica a escala de persona (≈ 1,62 m)
function bottleRow(n, x0, x1, y, z) {
  const g = new THREE.Group(), cols = [0x2f5d3a, 0x6b3a1e, 0xe8e0c8, 0x3b5f8a, 0x8a2a2a, 0x2a2a2a];
  for (let i = 0; i < n; i++) { const c = cols[i % cols.length], hh = 0.26 + hash(i * 3.1) * 0.08;
    const b = lathe([[0.001, 0], [0.036, 0], [0.036, hh * 0.62], [0.014, hh * 0.8], [0.012, hh], [0.001, hh]], 20, M.bottle(c)); b.position.set(lerp(x0, x1, (i + 0.5) / n), y, z); g.add(b); }
  return g;
}
function beerTap() {
  const g = new THREE.Group();
  const col = lathe([[0.001, 0], [0.06, 0], [0.05, 0.02], [0.045, 0.38], [0.06, 0.42], [0.001, 0.42]], 32, M.chrome); g.add(col);
  for (const sx of [-1, 1]) { const arm = cyl(0.012, 0.012, 0.08, M.chrome, 12); arm.rotation.x = Math.PI / 2; arm.position.set(sx * 0.035, 0.36, 0.05); g.add(arm);
    const nz = cyl(0.008, 0.01, 0.05, M.chrome, 12); nz.position.set(sx * 0.035, 0.33, 0.09); g.add(nz);
    const hd = cyl(0.012, 0.016, 0.14, plastic(0x1b1c20, 0.3), 16); hd.position.set(sx * 0.035, 0.46, 0.06); g.add(hd); }
  return g;
}
function cashRegister() {
  const g = new THREE.Group();
  g.add(at(rbox(0.36, 0.12, 0.3, plastic(0x2a2e35, 0.35), 0.02), 0, 0.06, 0, 0, Math.PI / 2));
  const body = rbox(0.3, 0.16, 0.18, plastic(0x3a3f48, 0.3), 0.02); body.position.set(0, 0.2, -0.05); body.rotation.x = -0.35; g.add(body);
  const scr = textPlane(0.16, 0.05, (c, w, h) => { c.fillStyle = '#0c1a10'; c.fillRect(0, 0, w, h); c.fillStyle = '#7cf0a9'; c.font = '700 120px "SpaceMono"'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText('3,00 €', w - 20, h / 2 + 4); }, 512);
  scr.position.set(0, 0.31, 0.0); scr.rotation.x = -0.35; g.add(scr);
  const dr = rbox(0.32, 0.05, 0.28, plastic(0x23262c, 0.4), 0.01); dr.rotation.x = Math.PI / 2; dr.position.set(0, 0.028, 0.02); g.add(dr); g.userData.drawer = dr;
  return g;
}
function hamLeg() {
  const g = new THREE.Group();
  const leg = lathe([[0.001, -0.05], [0.07, 0.0], [0.12, 0.12], [0.13, 0.25], [0.1, 0.38], [0.05, 0.48], [0.03, 0.56], [0.001, 0.58]], 32, M.ham); leg.scale.z = 0.7; g.add(leg);
  const hoof = cyl(0.022, 0.028, 0.08, M.black, 16); hoof.position.y = 0.6; g.add(hoof);
  const rope = cyl(0.004, 0.004, 0.5, plastic(0xd8c9a8, 0.8), 6); rope.position.y = 0.88; g.add(rope);
  g.rotation.z = Math.PI; return g;
}
function chalkboard() {
  const g = new THREE.Group();
  g.add(at(rbox(1.0, 0.7, 0.03, M.wood, 0.01), 0, 0, 0));
  const t = textPlane(0.92, 0.62, (c, w, h) => { c.fillStyle = '#1e2a24'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.92)'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 74px "Bebas"'; c.fillText('TAPA', w / 2, h * 0.26); c.font = '700 58px "Bebas"'; c.fillText('CON CADA', w / 2, h * 0.5); c.fillText('BEBIDA', w / 2, h * 0.72);
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 4; c.beginPath(); c.moveTo(w * 0.2, h * 0.88); c.lineTo(w * 0.8, h * 0.88); c.stroke(); }, 512);
  t.position.z = 0.017; t.material.toneMapped = true; g.add(t); return g;
}
function stool() { const g = new THREE.Group(); g.add(at(cyl(0.17, 0.17, 0.05, M.wood, 24), 0, 0.72, 0)); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78; g.add(bar(v3(Math.cos(a) * 0.12, 0.7, Math.sin(a) * 0.12), v3(Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17), 0.014, M.iron)); } return g; }
function table() { const g = new THREE.Group(); g.add(at(cyl(0.38, 0.38, 0.04, M.wood, 32), 0, 0.75, 0)); g.add(at(cyl(0.035, 0.05, 0.73, M.iron, 16), 0, 0.37, 0)); g.add(at(cyl(0.25, 0.25, 0.02, M.iron, 24), 0, 0.01, 0)); return g; }
function lampPend(y) { const g = new THREE.Group(); g.add(at(cyl(0.004, 0.004, BH - y, M.iron, 6), 0, (BH - y) / 2, 0)); const sh = lathe([[0.001, 0.12], [0.03, 0.12], [0.16, 0.0], [0.17, -0.01], [0.001, -0.01]], 32, M.iron); g.add(sh);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd29a).multiplyScalar(2.6), toneMapped: false })); b.position.y = 0.01; g.add(b); g.position.y = y; return g; }
// fachada andaluza: encalada, ventanas con luz, balcones de forja, tejado de teja; tienda abajo con su letrero (o el hueco del bar)
function facade(w, floors, shop, seed) {
  const g = new THREE.Group(), fh = 3.2, hTot = fh * (floors + 1);
  const front = mesh(new THREE.BoxGeometry(w, hTot - fh, 0.3), M.stucco); front.position.set(0, fh + (hTot - fh) / 2, 0); g.add(front);
  for (let f = 1; f <= floors; f++) for (let i = 0; i < Math.max(1, Math.round(w / 2.2)); i++) {
    const n = Math.max(1, Math.round(w / 2.2)), x = lerp(-w / 2, w / 2, (i + 0.5) / n), y = fh * f + 1.25;
    const lit = hash(seed * 13 + f * 7 + i) > 0.35, win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5), new THREE.MeshBasicMaterial({ color: lit ? new THREE.Color(0xffc98a).multiplyScalar(0.9) : new THREE.Color(0x0b1220), toneMapped: false }));
    win.position.set(x, y, 0.152); g.add(win);
    g.add(at(mesh(new THREE.BoxGeometry(1.02, 0.08, 0.06), M.wood), x, y + 0.79, 0.17));
    const bal = new THREE.Group(); bal.position.set(x, y - 0.75, 0.15); g.add(bal);
    bal.add(at(mesh(new THREE.BoxGeometry(1.3, 0.06, 0.45), M.stucco), 0, 0, 0.22));
    for (let k = 0; k <= 10; k++) bal.add(at(cyl(0.008, 0.008, 0.62, M.iron, 6), -0.62 + k * 0.124, 0.33, 0.43));
    bal.add(at(mesh(new THREE.BoxGeometry(1.3, 0.025, 0.025), M.iron), 0, 0.64, 0.43));
  }
  const roof = mesh(new THREE.BoxGeometry(w + 0.3, 0.12, 1.0), M.roofT); roof.position.set(0, hTot + 0.06, -0.3); roof.rotation.x = 0.12; g.add(roof);
  if (shop) {      // tienda: escaparate con luz y letrero
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe0b0).multiplyScalar(0.55), toneMapped: false })); sw.position.set(0, 1.2, 0.0); g.add(sw);
    const wall = mesh(new THREE.BoxGeometry(w, fh, 0.3), M.stucco); wall.position.set(0, fh / 2, -0.16); g.add(wall);
    const sign = plateText(Math.min(w * 0.8, 2.6), 0.42, [[shop, 0.62, 0.55]], { fg: '#f6eedd', bg: '#2a1f18', weight: 800 }); sign.position.set(0, 2.75, 0.17); g.add(sign);
    g.userData.sign = sign;
  }
  g.userData.h = hTot; return g;
}
// telón del fondo: cielo de noche, estrellas, la colina y la fortaleza iluminada (silueta genérica de la Alhambra)
function alhambraBackdrop() {
  const tx = canvasTex(2048, 820, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#020510'); sky.addColorStop(0.55, '#0b1a36'); sky.addColorStop(1, '#2a2440'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + hash(i * 1.3) * 0.7})`; const s = hash(i * 4.1) > 0.97 ? 2.2 : 1.1; g.fillRect(hash(i * 2.7) * w, hash(i * 5.9) * h * 0.6, s, s); }
    const glow = g.createRadialGradient(w * 0.5, h * 0.62, 20, w * 0.5, h * 0.62, w * 0.35); glow.addColorStop(0, 'rgba(255,170,90,.35)'); glow.addColorStop(1, 'rgba(255,150,80,0)'); g.fillStyle = glow; g.fillRect(0, 0, w, h);
    // la colina: azul noche (no un negro plano), con la bruma cálida de la ciudad abajo
    const hillP = new Path2D(); hillP.moveTo(0, h); hillP.lineTo(0, h * 0.82); hillP.bezierCurveTo(w * 0.2, h * 0.74, w * 0.32, h * 0.66, w * 0.46, h * 0.64); hillP.bezierCurveTo(w * 0.62, h * 0.62, w * 0.78, h * 0.7, w, h * 0.78); hillP.lineTo(w, h); hillP.closePath();
    const hill = g.createLinearGradient(0, h * 0.62, 0, h); hill.addColorStop(0, '#060a14'); hill.addColorStop(0.45, '#0b1222'); hill.addColorStop(1, '#221a2a'); g.fillStyle = hill; g.fill(hillP);
    const haze = g.createLinearGradient(0, h * 0.74, 0, h); haze.addColorStop(0, 'rgba(255,150,80,0)'); haze.addColorStop(1, 'rgba(255,150,80,.16)'); g.fillStyle = haze; g.fill(hillP);
    // la fortaleza: murallas y torres, iluminadas de naranja
    const wall = (x0, x1, y, hh) => { const gr = g.createLinearGradient(0, y - hh, 0, y); gr.addColorStop(0, '#f2b26a'); gr.addColorStop(1, '#a8582c'); g.fillStyle = gr; g.fillRect(x0, y - hh, x1 - x0, hh);
      g.fillStyle = 'rgba(60,25,10,.35)'; for (let x = x0; x < x1; x += 14) g.fillRect(x, y - hh, 6, 5); };
    const base = h * 0.645;
    wall(w * 0.3, w * 0.7, base, 34);
    for (const [x, tw, th] of [[0.31, 46, 92], [0.36, 30, 60], [0.42, 38, 74], [0.5, 54, 110], [0.57, 34, 70], [0.63, 44, 88], [0.68, 30, 56]]) wall(w * x - tw / 2, w * x + tw / 2, base, th);
    g.fillStyle = 'rgba(255,220,160,.85)'; for (let i = 0; i < 26; i++) g.fillRect(w * (0.31 + hash(i * 3.3) * 0.38), base - 20 - hash(i * 6.1) * 70, 3, 5);
    // la ciudad: lucecitas bajo la colina
    // la ciudad y el Albaicín: miles de lucecitas, más densas abajo; bajo la fortaleza, el bosque (casi sin luces)
    for (let i = 0; i < 5200; i++) { const x = hash(i * 1.1) * w, y = h * (0.66 + hash(i * 2.3) * 0.34); if (!g.isPointInPath(hillP, x, y)) continue;
      const dens = clamp((y / h - 0.7) / 0.22); if (hash(i * 8.7) > 0.12 + dens * 0.88) continue;
      const warm = hash(i * 9.1) > 0.25; g.fillStyle = warm ? `rgba(255,${170 + hash(i) * 70},${90 + hash(i * 3) * 60},${0.3 + hash(i * 7) * 0.6})` : `rgba(235,240,255,${0.25 + hash(i * 7) * 0.45})`;
      const s = hash(i * 5.3) > 0.9 ? 2.6 : 1.6; g.fillRect(x, y, s, s); }
    for (let i = 0; i < 60; i++) { const x = hash(i * 13.7) * w, y = h * (0.84 + hash(i * 17.1) * 0.15); if (!g.isPointInPath(hillP, x, y)) continue;
      const r = 10 + hash(i * 3.9) * 26, gl = g.createRadialGradient(x, y, 0, x, y, r); gl.addColorStop(0, 'rgba(255,170,90,.18)'); gl.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gl; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(520, 208), new THREE.MeshBasicMaterial({ map: tx, fog: false, toneMapped: false, depthWrite: false }));
  m.position.set(0, 85, -180); m.renderOrder = -1; return m;
}

// ---------------------------------------------------------------- montaje del escenario
function buildBar() {
  const B = new THREE.Group(); scene.add(B); S.bar = B;
  // suelo del bar (sobre la bodega), paredes, techo con vigas
  const fl = mesh(new THREE.BoxGeometry(2 * BX, 0.12, 2 * BZ), M.floorTile); fl.position.set(0, -0.06, 0); B.add(fl);
  B.add(at(mesh(new THREE.BoxGeometry(2 * BX + 0.6, BH + 0.1, 0.3), M.stucco), 0, BH / 2, -BZ - 0.15));
  B.add(at(mesh(new THREE.BoxGeometry(2 * BX - 0.1, 0.9, 0.03), M.azulejo), 0, 0.45, -BZ + 0.02));
  for (const sx of [-1, 1]) B.add(at(mesh(new THREE.BoxGeometry(0.3, BH + 0.1, 2 * BZ + 0.3), M.stucco), sx * (BX + 0.15), BH / 2, 0));
  B.add(at(mesh(new THREE.BoxGeometry(2 * BX + 0.6, 0.25, 2 * BZ + 0.3), M.stucco), 0, BH + 0.12, 0));
  for (let i = 0; i < 7; i++) B.add(at(mesh(new THREE.BoxGeometry(0.16, 0.18, 2 * BZ), M.woodD), -BX + 0.5 + i * (2 * BX - 1) / 6, BH - 0.09, 0));
  // la barra: frente de azulejos, encimera de madera, reposapiés de latón
  const cl = CTR.x1 - CTR.x0, cx = (CTR.x0 + CTR.x1) / 2;
  const front = mesh(new THREE.BoxGeometry(cl, CTR.h, 0.06), M.azulejo); front.position.set(cx, CTR.h / 2, CTR.z - 0.03); B.add(front);
  B.add(at(mesh(new THREE.BoxGeometry(cl, CTR.h, CTR.d - 0.06), M.woodD), cx, CTR.h / 2, CTR.z - 0.06 - (CTR.d - 0.06) / 2));
  const topM = mesh(new THREE.BoxGeometry(cl + 0.1, 0.05, CTR.d + 0.08), M.wood); topM.position.set(cx, CTR.h + 0.025, CTR.z - CTR.d / 2 + 0.04); B.add(topM);
  const rail = cyl(0.025, 0.025, cl, M.brass, 16); rail.rotation.z = Math.PI / 2; rail.position.set(cx, 0.22, CTR.z + 0.12); B.add(rail);
  // detrás: estanterías con botellas, la pizarra, el jamón, los grifos, la caja
  for (const y of [1.45, 1.95, 2.45]) { B.add(at(mesh(new THREE.BoxGeometry(4.6, 0.04, 0.3), M.wood), 0.3, y, -BZ + 0.17)); B.add(at(bottleRow(16, -1.9, 2.5, y + 0.02, -BZ + 0.18), 0, 0, 0)); }
  S.board = chalkboard(); S.board.position.set(-2.75, 1.95, -BZ + 0.05); B.add(S.board);
  S.ham = hamLeg(); S.ham.position.set(-1.6, 2.75, CTR.z - 0.4); B.add(S.ham);
  S.taps = beerTap(); S.taps.position.set(0.95, TOP, CTR.z - 0.35); B.add(S.taps);
  S.reg = cashRegister(); S.reg.position.set(1.9, TOP, CTR.z - 0.3); S.reg.rotation.y = -0.2; B.add(S.reg);
  for (const x of [-1.8, -0.4, 1.0, 2.4]) { const l = lampPend(2.05); l.position.x = x; l.position.z = CTR.z - 0.1; B.add(l); }
  // mesas y taburetes
  for (const [x, z] of [[-2.6, 1.3], [2.7, 1.5]]) { const tb = table(); tb.position.set(x, 0, z); B.add(tb); for (let k = 0; k < 3; k++) { const st = stool(); const a = k * 2.1 + 0.4; st.position.set(x + Math.cos(a) * 0.62, 0, z + Math.sin(a) * 0.62); B.add(st); } }
  for (const x of [-1.9, 2.05]) { const st = stool(); st.position.set(x, 0, CTR.z + 0.4); B.add(st); }
  // la bodega: paredes de ladrillo, barriles y el tubo que sube hasta los grifos
  const C = new THREE.Group(); B.add(C); S.cellar = C;
  C.add(at(mesh(new THREE.BoxGeometry(5.2, 0.12, 3.4), M.stone), 0, -CELLAR - 0.06, -0.6));
  C.add(at(mesh(new THREE.BoxGeometry(5.2, CELLAR, 0.2), M.brick), 0, -CELLAR / 2, -2.35));
  for (const sx of [-1, 1]) C.add(at(mesh(new THREE.BoxGeometry(0.2, CELLAR, 3.4), M.brick), sx * 2.6, -CELLAR / 2, -0.6));
  S.kegs = [];
  for (let i = 0; i < 4; i++) { const k = lathe([[0.001, 0], [0.19, 0], [0.2, 0.02], [0.2, 0.08], [0.19, 0.1], [0.2, 0.12], [0.2, 0.46], [0.19, 0.48], [0.2, 0.5], [0.2, 0.56], [0.19, 0.58], [0.06, 0.6], [0.06, 0.63], [0.001, 0.63]], 32, M.steel);
    k.position.set(-1.0 + i * 0.5, -CELLAR, -1.2 + (i % 2) * 0.5); C.add(k); S.kegs.push(k); }
  S.kegs[2].position.copy(KEG);
  S.tube = tube([KEG.clone().add(v3(0, 0.63, 0)), v3(0.4, -1.2, -0.6), v3(0.9, -0.3, -0.85), v3(0.95, -0.02, -0.9)], 0.018, new THREE.MeshPhysicalMaterial({ color: 0xe0e8f0, roughness: 0.1, transparent: true, opacity: 0.45, clearcoat: 1, clearcoatRoughness: 0.1 }), 60); C.add(S.tube);
  S.beerFlow = tube([KEG.clone().add(v3(0, 0.63, 0)), v3(0.4, -1.2, -0.6), v3(0.9, -0.3, -0.85), v3(0.95, -0.02, -0.9)], 0.012, M.beer, 60); C.add(S.beerFlow);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc98a).multiplyScalar(2.2), toneMapped: false })); bulb.position.set(-0.6, -0.4, -1.4); C.add(bulb);
  // el bar es de una planta (casa baja con azotea): el dintel con el letrero; así se ve la Alhambra por encima
  const lint = mesh(new THREE.BoxGeometry(2 * BX + 0.6, 1.0, 0.3), M.stucco); lint.position.set(0, BH + 0.5, BZ + 0.15); B.add(lint);
  for (const sx of [-1, 1]) B.add(at(mesh(new THREE.BoxGeometry(0.4, BH, 0.36), M.stucco), sx * (BX + 0.1), BH / 2, BZ + 0.15));
  for (let k = 0; k <= 30; k++) B.add(at(cyl(0.012, 0.012, 0.7, M.iron, 6), -BX - 0.2 + k * (2 * BX + 0.4) / 30, BH + 1.35, BZ + 0.1));
  B.add(at(mesh(new THREE.BoxGeometry(2 * BX + 0.6, 0.04, 0.04), M.iron), 0, BH + 1.7, BZ + 0.1));
  S.barSign = plateText(2.4, 0.5, [['BAR · TAPAS', 0.6, 0.55]], { fg: '#f6eedd', bg: '#3a1f12', weight: 900 }); S.barSign.position.set(0, BH + 0.5, BZ + 0.31); B.add(S.barSign);
  S.shops = [];
  for (const [x, w, name, seed] of [[-BX - 0.3 - 2.0, 4.0, 'PANADERÍA', 5], [BX + 0.3 + 2.0, 4.0, 'PELUQUERÍA', 9], [BX + 0.3 + 4.0 + 1.8, 3.6, 'TIENDA', 11], [-BX - 0.3 - 4.0 - 1.8, 3.6, 'FERRETERÍA', 2]]) {
    const f = facade(w, 2, name, seed); f.position.set(x, 0, BZ + 0.15); B.add(f); S.shops.push(f);
  }
  // un cartel de publicidad (genérico, apagado) en la acera de la izquierda
  S.ad = new THREE.Group(); S.ad.position.set(-2.3, 0, 5.0); S.ad.rotation.y = 0.25; B.add(S.ad);
  for (const sx of [-1, 1]) S.ad.add(at(cyl(0.05, 0.05, 2.2, M.iron, 12), sx * 0.9, 1.1, 0));
  S.adFace = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(512, 324, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3d4a63'); gr.addColorStop(1, '#232a39'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.9)'; c.font = '900 92px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ANUNCIO', w / 2, h * 0.42); c.font = '700 36px Inter'; c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText('aquí tu publicidad', w / 2, h * 0.68); }), toneMapped: false }));
  S.adFace.position.y = 2.05; S.ad.add(S.adFace); S.ad.add(at(mesh(new THREE.BoxGeometry(2.0, 1.3, 0.06), M.iron), 0, 2.05, -0.04));
  // farolas (fuera: tapaban los planos de la calle)
  for (const x of []) { const p = cyl(0.05, 0.07, 3.6, M.iron, 12); p.position.set(x, 1.8, 4.6); B.add(p);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffcf8a).multiplyScalar(2.4), toneMapped: false })); b.position.set(x, 3.55, 4.6); B.add(b); }
  B.add(alhambraBackdrop());
}

// ---------------------------------------------------------------- la caña y la tapa protagonistas, las rondas, el vaso gigante, la gente
const NPED = 14;
function buildHero() {
  // la caña y su tapa (y una tapa nueva con su etiqueta al final, para el bucle)
  S.hero = cana(); S.hero.position.copy(HERO); scene.add(S.hero);
  S.htapa = tapa('tortilla'); S.htapa.position.set(HERO.x + 0.14, TOP, HERO.z + 0.04); scene.add(S.htapa);
  S.tag = gratisTag(); S.tag.position.set(HERO.x + 0.15, TOP + 0.022, HERO.z + 0.03); S.tag.rotation.y = -0.25; scene.add(S.tag);
  S.ntapa = tapa('tortilla'); scene.add(S.ntapa);           // la que pone el camarero al final (igual que la del principio)
  S.qm = qmark(new THREE.MeshPhysicalMaterial({ color: 0xffc24a, roughness: 0.25, metalness: 0.4, clearcoat: 0.6 })); S.qm.scale.setScalar(0.22); scene.add(S.qm);
  // las rondas: cañas con su tapa, cada una mejor que la anterior
  const kinds = ['pan', 'montadito', 'croquetas', 'albondigas', 'jamon'];
  S.rounds = ROUND_X.slice(1).map((x, i) => { const c = cana(); c.position.set(x, TOP, HERO.z); scene.add(c); const tp = tapa(kinds[i + 1] || 'jamon', 0.07 + i * 0.006); tp.position.set(x + 0.12, TOP, HERO.z + 0.06); scene.add(tp); return { c, tp }; });
  S.salt = sparks(scene, 160, 0xffffff, 0.012);
  // el vaso gigante: cristal, tres capas (IVA, cerveza, lo que queda) y los iconos que salen de lo que queda
  const G = new THREE.Group(); G.position.copy(BIG); scene.add(G); S.big = G;
  const gl = lathe([[0.001, 0], [BIGR0, 0], [BIGR0 + 0.01, 0.03], [BIGR1, BIGH], [BIGR1 - 0.015, BIGH]], 48, new THREE.MeshPhysicalMaterial({ color: 0xeef6ff, roughness: 0.03, transparent: true, opacity: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: false, side: THREE.DoubleSide }));
  gl.renderOrder = 9; gl.castShadow = false; G.add(gl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(BIGR1 - 0.007, 0.007, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, toneMapped: false })); rim.rotation.x = Math.PI / 2; rim.position.y = BIGH; G.add(rim);
  const fr = [0.27 / 3, 0.5 / 3, 2.23 / 3], cols = [0x9aa1ab, 0xf0a514, 0x3fc58f];
  let y0 = 0.03; S.layers = fr.map((f, i) => { const h = (BIGH - 0.06) * f, r = y => lerp(BIGR0, BIGR1, y / BIGH) - 0.018;
    const geo = new THREE.CylinderGeometry(r(y0 + h), r(y0), h, 48); geo.translate(0, h / 2, 0);
    const m = new THREE.MeshPhysicalMaterial({ color: cols[i], roughness: 0.2, transparent: true, opacity: 0.86, clearcoat: 0.8, clearcoatRoughness: 0.15, emissive: cols[i], emissiveIntensity: 0.18 });
    const L = new THREE.Mesh(geo, m); L.position.y = y0; L.userData = { y0, h }; L.renderOrder = 8; G.add(L); y0 += h; return L; });
  const icon = (o, s = 1) => { o.scale.setScalar(s); G.add(o); return o; };
  const pl = tapa('montadito', 0.075); pl.scale.setScalar(2.2); G.add(pl);
  const house = new THREE.Group(); house.add(at(rbox(0.16, 0.12, 0.12, plastic(0xf3ede0, 0.4), 0.01), 0, 0.06, 0)); const rf = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.08, 4), M.roofT); rf.rotation.y = Math.PI / 4; rf.position.y = 0.16; house.add(rf); house.add(at(rbox(0.04, 0.07, 0.01, M.woodD, 0.004), 0, 0.035, 0.061)); G.add(house);
  const pw = mesh(studentGeo(false), plastic(0x3d8bff, 0.3)); pw.scale.setScalar(3.2); G.add(pw);
  const cn = cyl(0.07, 0.07, 0.016, M.gold, 40); cn.rotation.x = Math.PI / 2; G.add(cn);
  S.icons = [pl, house, pw, cn];
  // la gente: dentro (fijos) y en la calle (andan y, con el letrero, entran)
  S.pawnGeo = pawnGeo();
  const pm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  const inside = [[-1.85, CTR.z + 0.45, 0xe6e1d8], [2.75, 0.5, 0xc9d6e6], [3.2, 0.05, 0xe6e1d8], [-2.95, 1.0, 0xd9c7b0], [-2.25, 1.75, 0xe6e1d8], [2.35, 1.95, 0xc9d6e6], [3.1, 1.15, 0xe6e1d8], [2.0, -1.2, 0xf1ece4]];
  S.inside = new THREE.InstancedMesh(S.pawnGeo, pm, inside.length); S.inside.castShadow = true; S.inside.receiveShadow = true;
  inside.forEach(([x, z, c], i) => { _o.position.set(x, 0, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); S.inside.setMatrixAt(i, _o.matrix); S.inside.setColorAt(i, new THREE.Color(c)); });
  scene.add(S.inside);
  S.peds = new THREE.InstancedMesh(S.pawnGeo, pm.clone(), NPED); S.peds.castShadow = true; S.peds.frustumCulled = false; scene.add(S.peds);
  S.pedData = [...Array(NPED)].map((_, i) => ({ x0: -14 + hash(i * 3.7) * 28, z: 4.0 + hash(i * 5.3) * 3.2, v: (hash(i * 7.1) > 0.5 ? 1 : -1) * (0.9 + hash(i * 2.2) * 0.5), enter: i < 9, delay: hash(i * 9.9) * 1.6, col: new THREE.Color([0xe6e1d8, 0xd9c7b0, 0xc9d6e6, 0xe8d0c8][i % 4]) }));
  S.peds.instanceColor = null; S.pedData.forEach((p, i) => S.peds.setColorAt(i, p.col));
  // el letrero en el que se convierte la tapa (aro de luz)
  S.ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 12, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc46a).multiplyScalar(2.6), toneMapped: false, transparent: true, opacity: 0 })); S.ring.visible = false; scene.add(S.ring);
  S.signGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: starTex0(), color: new THREE.Color(1, 0.8, 0.5).multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); S.signGlow.visible = false; scene.add(S.signGlow);
  // platos vacíos con «?» sobre las otras tiendas
  S.shopQ = S.shops.slice(0, 3).map(f => { const g = new THREE.Group(); const p = plate(0.6); p.rotation.x = Math.PI / 2; g.add(p); const q = qmark(new THREE.MeshPhysicalMaterial({ color: 0xffc24a, roughness: 0.25, metalness: 0.4 })); q.scale.setScalar(2.6); q.position.set(0, 1.35, 0.1); g.add(q); g.position.set(f.position.x, 4.4, BZ + 0.9); g.visible = false; scene.add(g); return g; });
  S.coins = [...Array(10)].map((_, i) => { const c = cyl(0.025, 0.025, 0.005, M.gold, 24); c.visible = false; scene.add(c); return c; });
}
