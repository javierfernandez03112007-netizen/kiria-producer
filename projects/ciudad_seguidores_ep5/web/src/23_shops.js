// ---------------------------------------------------------------- LAS TRES TIENDAS que pidieron los seguidores (fachada de verdad + interior visto por los cristales)
//   sushi de @lydiaa.rc (madera oscura, farolillos rojos, barra con el cocinero y todas las mesas llenas) ·
//   pastelería de @salvadormatthias34 (toldo rosa, escaparate de tartas, mostrador y la cola que llega a la esquina) ·
//   consultorio veterinario de @zamii.luu (cruz verde, sala de espera con mascotas y la camilla con el perro que no se deja vacunar).
// Cada edificio se arma en su marco local (fachada en z = 0 mirando a +z, interior hacia −z) y se gira para mirar a la plaza (−x).
const SHOP = { X: 25, W: 8, D: 7, H0: 4.2 };
function shopFrame(G, zc, o) {
  const g = new THREE.Group(); g.position.set(SHOP.X, 0, zc); g.rotation.y = -Math.PI / 2; G.add(g); const U = g.userData; U.zc = zc;
  const W2 = SHOP.W / 2, H0 = SHOP.H0, D = SHOP.D, H = H0 + 2 * 3.3 + 0.6;
  // pisos de arriba: ladrillo o revoco, ventanas con marco blanco, alféizar y alguna maceta
  const wallM = o.wall; const up = box(SHOP.W, H - H0, 0.4, wallM, 0, H0 + (H - H0) / 2, -0.2); up.material = wallM; g.add(up);
  for (let f = 0; f < 2; f++) for (let i = -1; i <= 1; i++) { const y = H0 + 0.9 + f * 3.3, x = i * 2.5; g.add(box(1.25, 1.75, 0.12, T.frame, x, y + 0.85, 0.02)); const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.58), T.glassDark); gl.position.set(x, y + 0.85, 0.09); g.add(gl);
    g.add(box(0.06, 1.58, 0.05, stdM(0xf3f1ec, 0.6), x, y + 0.85, 0.1)); g.add(box(1.45, 0.1, 0.3, stdM(0xe9e4da, 0.6), x, y - 0.05, 0.12)); g.add(box(1.4, 0.12, 0.1, stdM(0xf3f1ec, 0.6), x, y + 1.78, 0.06));
    if ((f + i + o.seed) % 3 === 0) { const pot = box(1.2, 0.22, 0.25, stdM(0x9a5a3a, 0.8), x, y + 0.08, 0.28); g.add(pot); for (let j = 0; j < 5; j++) { const fl = sph(0.09, stdM([0xe8456b, 0xf2c94c, 0xf08ad0, 0xffffff][j % 4], 0.7), 8, 6); fl.position.set(x - 0.45 + j * 0.22, y + 0.28, 0.3); g.add(fl); } } }
  g.add(box(SHOP.W + 0.3, 0.35, 0.6, stdM(0xe6e0d4, 0.6), 0, H - 0.18, 0.1)); g.add(box(SHOP.W, 0.12, 0.45, stdM(0xe6e0d4, 0.6), 0, H0 + 0.05, 0.05));
  // planta baja: zócalo, pilastras, escaparate (vidrio con montantes), puerta de cristal y la banda del rótulo
  g.add(box(SHOP.W, 0.45, 0.3, stdM(0x6f6a64, 0.7), 0, 0.225, 0.05)); for (const s of [-1, 1]) g.add(box(0.45, H0, 0.4, o.pil ?? wallM, s * (W2 - 0.225), H0 / 2, -0.05));
  const fr = o.frame ?? T.frame, x0 = -W2 + 0.45, x1 = W2 - 0.45, dX = x1 - 0.7;                                // puerta a la derecha (vista desde la calle)
  const glassW = (dX - 0.7) - x0; const gl = new THREE.Mesh(new THREE.PlaneGeometry(glassW, 2.85), T.glass); gl.position.set(x0 + glassW / 2, 0.45 + 1.425, 0.0); g.add(gl); U.glass = gl;
  for (const x of [x0, x0 + glassW / 3, x0 + glassW * 2 / 3, dX - 0.7, dX + 0.7]) g.add(box(0.07, 2.95, 0.12, fr, x, 0.45 + 1.45, 0.02));
  g.add(box(x1 - x0, 0.08, 0.12, fr, 0, 3.32, 0.02)); g.add(box(glassW, 0.08, 0.12, fr, x0 + glassW / 2, 0.47, 0.02));
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 2.85), T.glass); door.position.set(dX, 0.0 + 1.425 + 0.02, 0.0); g.add(door); g.add(box(0.04, 0.5, 0.04, T.gold, dX - 0.5, 1.2, 0.07));
  const top = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 0.75), T.glass); top.position.set(0, 3.32 + 0.4, 0.0); g.add(top);
  const sign = signPlane(SHOP.W - 0.9, 0.62, 1024, o.sign, { r: 0.45, glow: o.signGlow ?? 0.35 }); sign.position.set(0, H0 - 0.38 + 0.0, 0.26); g.add(sign); g.add(box(SHOP.W - 0.7, 0.75, 0.2, o.fascia ?? stdM(0x2a2a2a, 0.5), 0, H0 - 0.38, 0.13));
  // cartel de la puerta (ABIERTO / COMPLETO)
  U.doorSign = [0, 1].map(k => { const p = signPlane(0.42, 0.2, 256, (c, w, h) => { c.fillStyle = k ? '#c62828' : '#2e7d32'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 64px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(k ? 'COMPLETO' : 'ABIERTO', w / 2, h / 2 + 3); }, { glow: 0.4 }); p.position.set(dX, 1.75, 0.03); p.visible = !k; g.add(p); return p; });
  // interior: suelo, paredes, techo con lámparas (todo se ve por el escaparate)
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(SHOP.W - 0.1, D), o.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.012, -D / 2); fl.receiveShadow = true; g.add(fl);
  g.add(box(SHOP.W, H0, 0.15, o.inWall, 0, H0 / 2, -D)); for (const s of [-1, 1]) g.add(box(0.15, H0, D, o.inWall, s * (W2 - 0.08), H0 / 2, -D / 2));
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(SHOP.W, D), stdM(0xd8d2c8, 0.9)); ce.rotation.x = Math.PI / 2; ce.position.set(0, H0 - 0.25, -D / 2); g.add(ce);
  g.add(box(SHOP.W, 0.3, D + 0.4, stdM(0x8c8780, 0.8), 0, H0 - 0.1, -D / 2));
  U.lamps = []; for (const x of [-2.4, 0, 2.4]) for (const z of [-1.8, -4.6]) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), T.lampGlow); l.rotation.x = Math.PI / 2; l.position.set(x, H0 - 0.26, z); g.add(l); U.lamps.push(l); }
  U.local = (x, y, z) => g.localToWorld(_v(x, y, z)); U.g = g; U.dX = dX;
  return g; }
// ---- muebles y comida
function stool(m) { const g = new THREE.Group(); ad(g, cyl(0.18, 0.18, 0.06, m, 20)).position.y = 0.72; ad(g, cyl(0.025, 0.025, 0.7, T.iron, 8)).position.y = 0.36; ad(g, cyl(0.2, 0.22, 0.03, T.iron, 20)).position.y = 0.015; return g; }
function chairS(m) { const g = new THREE.Group(); g.add(box(0.44, 0.05, 0.44, m, 0, 0.46, 0)); g.add(box(0.44, 0.48, 0.05, m, 0, 0.72, -0.2)); for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) g.add(box(0.04, 0.46, 0.04, m, x, 0.23, z)); return g; }
function table(w, d, m) { const g = new THREE.Group(); g.add(box(w, 0.05, d, m, 0, 0.75, 0)); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.05, 0.73, 0.05, T.iron, x * (w / 2 - 0.06), 0.365, z * (d / 2 - 0.06))); return g; }
function sushiPlate() { const g = new THREE.Group(); ad(g, cyl(0.13, 0.12, 0.015, stdM(0x1b1b1b, 0.3), 24)).position.y = 0.008;
  for (let i = 0; i < 4; i++) { const r = rboxM(0.05, 0.03, 0.026, 0.008, stdM(0xf5f2ea, 0.8), 1); r.position.set(-0.06 + i * 0.04, 0.03, 0); g.add(r); const f = rboxM(0.055, 0.012, 0.03, 0.005, stdM(i % 2 ? 0xf27f45 : 0xd8313b, 0.4), 1); f.position.set(-0.06 + i * 0.04, 0.05, 0); g.add(f); }
  return g; }
function cake(r, h, cBody, cTop, seed = 1) { const g = new THREE.Group(), R = rng(seed); ad(g, cyl(r, r, h, stdM(cBody, 0.7), 32)).position.y = h / 2; ad(g, cyl(r * 1.01, r * 1.01, h * 0.12, stdM(cTop, 0.5), 32)).position.y = h * 0.95;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = sph(r * 0.12, stdM(R() > 0.5 ? 0xd8233a : 0xf7f3ea, 0.4), 10, 8); b.position.set(Math.cos(a) * r * 0.75, h + r * 0.05, Math.sin(a) * r * 0.75); g.add(b); } return g; }
function tieredCake() { const g = new THREE.Group(); let y = 0; [[0.24, 0.18, 0xf7e9e9, 0xf2b8c6], [0.18, 0.16, 0xf7e9e9, 0xf2b8c6], [0.12, 0.14, 0xf7e9e9, 0xf2b8c6]].forEach(([r, h, a, b], i) => { const c = cake(r, h, a, b, i + 3); c.position.y = y; g.add(c); y += h; }); return g; }
// ---- el perro del veterinario (cuerpo, cabeza con hocico, orejas caídas, patas articuladas y cola)
function dog(col = 0xc98a4b) { const g = new THREE.Group(), m = stdM(col, 0.85), md = stdM(new THREE.Color(col).multiplyScalar(0.7).getHex(), 0.85), J = {}; g.userData.J = J;
  const body = new THREE.Group(); body.position.y = 0.36; g.add(body); J.body = body; const tr = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.36, 8, 16), m); tr.rotation.x = Math.PI / 2; tr.castShadow = true; body.add(tr);
  const hd = new THREE.Group(); hd.position.set(0, 0.12, 0.27); body.add(hd); J.head = hd; hd.add(sph(0.11, m, 20, 14)); const sn = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.08, 6, 12), md); sn.rotation.x = Math.PI / 2; sn.position.set(0, -0.03, 0.12); hd.add(sn);
  ad(hd, sph(0.026, stdM(0x111111, 0.2), 10, 8)).position.set(0, -0.01, 0.2); for (const s of [-1, 1]) { const e = sph(0.017, stdM(0x111111, 0.1), 10, 8); e.position.set(s * 0.045, 0.035, 0.09); hd.add(e); const hl = sph(0.005, stdM(0xffffff, 0.1, { emissive: 0xffffff, emissiveIntensity: 0.6 }), 6, 4); hl.position.set(s * 0.04, 0.043, 0.105); hd.add(hl);
    const ear = new THREE.Group(); ear.position.set(s * 0.085, 0.06, -0.01); hd.add(ear); J['ear' + (s < 0 ? 'L' : 'R')] = ear; const em = sph(1, md, 12, 8); em.scale.set(0.025, 0.08, 0.05); em.position.y = -0.06; ear.add(em); ear.rotation.z = s * 0.25; }
  for (const [n, x, z] of [['FL', -0.08, 0.17], ['FR', 0.08, 0.17], ['BL', -0.08, -0.17], ['BR', 0.08, -0.17]]) { const l = new THREE.Group(); l.position.set(x, -0.04, z); body.add(l); J[n] = l; const lg = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 6, 10), m); lg.position.y = -0.15; lg.castShadow = true; l.add(lg); const paw = sph(0.042, md, 10, 8); paw.position.set(0, -0.3, 0.015); l.add(paw); }
  const tail = new THREE.Group(); tail.position.set(0, 0.06, -0.3); body.add(tail); J.tail = tail; const tl = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.2, 6, 10), m); tl.position.y = 0.11; tail.add(tl); tail.rotation.x = -0.6;
  shadowAll(g); return g; }
function buildShops(G) {
  const [bc, bh] = brickCanvases([150, 70, 50], 3), [b2c, b2h] = brickCanvases([176, 120, 86], 5), brickA = texMat(bc, bh, [2, 1.6], { r: 0.85, ns: 1.2 }), brickB = texMat(b2c, b2h, [2, 1.6], { r: 0.85, ns: 1.2 });
  const [sc1, sh1] = stuccoCanvases([238, 206, 214], 41), pinkSt = texMat(sc1, sh1, [3, 3], { r: 0.8, ns: 0.4 }); const [sc2, sh2] = stuccoCanvases([226, 236, 232], 43), mintSt = texMat(sc2, sh2, [3, 3], { r: 0.8, ns: 0.4 });
  const [wc, wh] = woodCanvases([150, 108, 70], 11), woodF = texMat(wc, wh, [2, 2], { r: 0.6, ns: 0.5 }); const [w2c, w2h] = woodCanvases([196, 160, 118], 12), woodL = texMat(w2c, w2h, [2, 2], { r: 0.55, ns: 0.5 });
  const [tc, th] = tileCanvases([232, 230, 226], 23, 512, 6, 6, 3), tileW = texMat(tc, th, [3, 3], { r: 0.4, ns: 0.4 });
  const SH = {};
  // --- SUSHI (norte)
  SH.sushi = shopFrame(G, -8.5, { seed: 1, wall: brickA, floor: woodF, inWall: stdM(0xe9dfcc, 0.9), fascia: stdM(0x2b1d14, 0.5), frame: stdM(0x2b1d14, 0.5), pil: stdM(0x2b1d14, 0.6),
    sign: (c, w, h) => { c.fillStyle = '#20150e'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8102e'; c.beginPath(); c.arc(70, h / 2, 34, 0, 7); c.fill(); c.fillStyle = '#f5efe2'; c.font = '900 52px Inter'; c.textBaseline = 'middle'; c.fillText('SUSHI', 125, h / 2 - 12); c.font = '700 26px Inter'; c.fillStyle = '#e8b04a'; c.fillText('de @lydiaa.rc', 128, h / 2 + 24);
      c.textAlign = 'right'; c.font = '700 30px Inter'; c.fillStyle = '#f5efe2'; c.fillText('寿司 · RESTAURANTE', w - 40, h / 2 + 4); } });
  { const g = SH.sushi, U = g.userData; U.lanterns = []; for (const x of [-3.3, 3.3]) { const l = new THREE.Group(); l.position.set(x, 3.0, 0.45); g.add(l); const b = sph(0.22, new THREE.MeshStandardMaterial({ color: 0xd8232a, emissive: 0xff3a2a, emissiveIntensity: 0.9, roughness: 0.6 }), 16, 12); b.scale.y = 1.25; l.add(b); ad(l, cyl(0.12, 0.12, 0.05, stdM(0x111111, 0.5), 12)).position.y = 0.3; ad(l, cyl(0.12, 0.12, 0.05, stdM(0x111111, 0.5), 12)).position.y = -0.3; U.lanterns.push(l); }
    // barra al fondo con el cocinero, mesas junto al escaparate (todas llenas)
    const bar0 = box(5.6, 1.05, 0.7, woodL, -0.6, 0.525, -5.6); g.add(bar0); g.add(box(5.8, 0.06, 0.85, stdM(0xd8c3a0, 0.4), -0.6, 1.08, -5.55)); for (let i = 0; i < 5; i++) { const st = stool(stdM(0x2b1d14, 0.6)); st.position.set(-2.8 + i * 1.1, 0, -4.9); g.add(st); }
    for (let i = 0; i < 4; i++) { const p = sushiPlate(); p.position.set(-2.8 + i * 1.3, 1.11, -5.4); g.add(p); }
    const shelf = box(5.6, 0.05, 0.3, woodL, -0.6, 2.1, -6.85); g.add(shelf); for (let i = 0; i < 8; i++) ad(g, cyl(0.05, 0.05, 0.25, stdM([0x2d6b3c, 0x8a1c1c, 0xe8e2d0][i % 3], 0.3), 12)).position.set(-3.2 + i * 0.7, 2.25, -6.85);
    const art = signPlane(2.2, 1.2, 512, (c, w, h) => { c.fillStyle = '#efe6d2'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a4f7a'; c.lineWidth = 10; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(w * 0.2 + i * 70, h * 0.75, 60 + i * 6, Math.PI, Math.PI * 1.9); c.stroke(); } c.fillStyle = '#c8102e'; c.beginPath(); c.arc(w * 0.78, h * 0.3, 40, 0, 7); c.fill(); }); art.position.set(1.8, 2.9, -6.9); g.add(art);
    U.tables = [[-2.6, -1.4], [-0.2, -1.4], [-2.6, -3.0], [-0.2, -3.0]].map(([x, z]) => { const t = table(1.0, 0.8, woodL); t.position.set(x, 0, z); g.add(t); for (const s of [-1, 1]) { const p = sushiPlate(); p.position.set(x + s * 0.22, 0.78, z); g.add(p); const ch = chairS(stdM(0x2b1d14, 0.6)); ch.position.set(x + s * 0.75, 0, z); ch.rotation.y = -s * Math.PI / 2; g.add(ch); } return [x, z]; });
    for (const [x, z] of [[2.9, -0.8], [-3.5, -6.2]]) { const pot = cyl(0.2, 0.16, 0.4, stdM(0x2b2b2b, 0.6), 16); pot.position.set(x, 0.2, z); g.add(pot); for (let i = 0; i < 6; i++) { const b = cyl(0.015, 0.015, 1.6 + i * 0.1, stdM(0x6f9a3c, 0.6), 6); b.position.set(x + Math.cos(i) * 0.08, 1.0, z + Math.sin(i) * 0.08); b.rotation.z = (i - 3) * 0.05; g.add(b); } }
    // cortina «noren» de la puerta
    for (let i = 0; i < 3; i++) { const n = signPlane(0.42, 0.7, 128, (c, w, h) => { c.fillStyle = '#1f3a5f'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2ece0'; c.font = '700 60px serif'; c.textAlign = 'center'; c.fillText(['寿', '司', '屋'][i], w / 2, h * 0.6); }, { r: 0.8 }); n.position.set(U.dX - 0.45 + i * 0.45, 2.95, 0.06); n.material.side = THREE.DoubleSide; g.add(n); }
    shadowAll(g, true, true); }
  // --- PASTELERÍA (centro): toldo de rayas rosa, escaparate de tartas y mostrador
  SH.pastry = shopFrame(G, -0.5, { seed: 2, wall: pinkSt, floor: woodF, inWall: stdM(0xd9a3b5, 0.9), fascia: stdM(0xf2c6d3, 0.5), frame: stdM(0xf7f3ef, 0.5), pil: stdM(0xf2dce4, 0.6),
    sign: (c, w, h) => { c.fillStyle = '#f7d6e0'; c.fillRect(0, 0, w, h); c.fillStyle = '#8a2f4f'; c.font = 'italic 900 64px Inter'; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText('Pastelería', w / 2 - 120, h / 2 - 2); c.font = '700 28px Inter'; c.fillStyle = '#b34a70'; c.fillText('de @salvadormatthias34', w / 2 + 250, h / 2 + 6); } });
  { const g = SH.pastry, U = g.userData; // toldo de rayas inclinado
    const aw = signTex(1024, 256, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#e86f98'; c.fillRect(i * w / 16, 0, w / 16, h); } c.fillStyle = 'rgba(0,0,0,.1)'; c.fillRect(0, h - 26, w, 26); });
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(SHOP.W - 0.6, 1.4, 1, 6), new THREE.MeshStandardMaterial({ map: aw, side: THREE.DoubleSide, roughness: 0.85 })); awn.position.set(0, 3.15, 0.65); awn.rotation.x = -1.05; awn.castShadow = true; g.add(awn);
    for (let i = 0; i < 16; i++) { const v = new THREE.Mesh(new THREE.CircleGeometry(0.235, 12, 0, Math.PI), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xffffff : 0xe86f98, side: THREE.DoubleSide, roughness: 0.85 })); v.rotation.z = Math.PI; v.position.set(-3.45 + i * 0.46, 2.82, 1.24); g.add(v); }
    // escaparate: gradas con tartas
    const disp = box(4.0, 0.7, 0.8, stdM(0x6b3f2c, 0.55), -1.55, 0.35, -0.55); g.add(disp); const disp2 = box(4.0, 0.35, 0.5, stdM(0x6b3f2c, 0.55), -1.55, 0.88, -0.75); g.add(disp2);
    const tc = tieredCake(); tc.position.set(-1.6, 0.7, -0.4); g.add(tc); for (const [x, c1, c2, z, y] of [[-3.1, 0x5a3424, 0x3b2116, -0.35, 0.7], [-0.3, 0xf3e3c3, 0xe8b64a, -0.35, 0.7], [-2.6, 0xf7e9e9, 0xd8233a, -0.75, 1.05], [-0.8, 0x6b3a26, 0xf2ece0, -0.75, 1.05]]) { const ck = cake(0.17, 0.15, c1, c2, Math.round(x * 10)); ck.position.set(x, y, z); g.add(ck); }
    // mostrador con vitrina y la caja registradora
    g.add(box(4.6, 1.0, 0.75, stdM(0x8a4f63, 0.5), 0.6, 0.5, -4.4)); const vit = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 0.6), T.glass); vit.position.set(0.6, 1.2, -4.4); g.add(vit);
    for (let i = 0; i < 6; i++) { const ck = cake(0.11, 0.09, [0xf7e9e9, 0x5a3424, 0xf3e3c3][i % 3], [0xd8233a, 0xf2ece0, 0xe8b64a][i % 3], 20 + i); ck.position.set(-1.2 + i * 0.7, 1.03, -4.4); g.add(ck); }
    g.add(box(0.36, 0.22, 0.32, stdM(0x2a2a2a, 0.4), 2.5, 1.11, -4.4)); const sh2 = box(5.6, 0.05, 0.35, woodL, 0.4, 2.0, -6.85); g.add(sh2); for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 8), stdM(0xc68a3c, 0.6)); b.rotation.z = Math.PI / 2; b.position.set(-2.0 + i * 0.5, 2.1, -6.85); g.add(b); }
    shadowAll(g, true, true); }
  // --- VETERINARIO (sur): cruz verde, sala de espera, camilla de acero
  SH.vet = shopFrame(G, 7.5, { seed: 3, wall: brickB, floor: tileW, inWall: stdM(0xa9d3cb, 0.9), fascia: stdM(0x0f7a6c, 0.5), frame: stdM(0xf3f1ec, 0.5), pil: stdM(0xd9e6e2, 0.6),
    sign: (c, w, h) => { c.fillStyle = '#0f7a6c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.fillRect(48, h / 2 - 12, 72, 24); c.fillRect(72, h / 2 - 36, 24, 72); c.font = '900 46px Inter'; c.textBaseline = 'middle'; c.fillText('VETERINARIO', 150, h / 2 - 12); c.font = '700 26px Inter'; c.fillStyle = '#bff3e8'; c.fillText('Consultorio de @zamii.luu', 152, h / 2 + 24);
      c.save(); c.translate(w - 90, h / 2); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 8, 20, 0, 7); c.fill(); for (const [x, y] of [[-22, -16], [-8, -26], [8, -26], [22, -16]]) { c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); } c.restore(); } });
  { const g = SH.vet, U = g.userData; const steel = new THREE.MeshStandardMaterial({ color: 0xd6dadd, roughness: 0.25, metalness: 0.9 });
    const tab = new THREE.Group(); tab.position.set(-1.2, 0, -2.6); g.add(tab); U.exam = tab; tab.add(box(1.3, 0.05, 0.7, steel, 0, 0.88, 0)); ad(tab, cyl(0.06, 0.06, 0.85, steel, 12)).position.y = 0.43; tab.add(box(0.7, 0.04, 0.5, steel, 0, 0.02, 0));
    for (let i = 0; i < 4; i++) { const c = chairS(stdM(0x0f7a6c, 0.5)); c.position.set(1.4 + (i % 2) * 0.6, 0, -1.2 - Math.floor(i / 2) * 1.6); c.rotation.y = -Math.PI / 2; g.add(c); }
    g.add(box(1.8, 1.05, 0.6, stdM(0xf3f1ec, 0.5), 2.3, 0.525, -5.6)); const poster = signPlane(1.4, 1.0, 512, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#0f7a6c'; c.font = '900 64px Inter'; c.fillText('VACUNAS', 40, 110); c.font = '600 34px Inter'; c.fillStyle = '#333'; ['Perros · Gatos', 'Revisiones', 'Chips'].forEach((s, i) => c.fillText(s, 44, 190 + i * 56)); }); poster.position.set(-1.2, 2.3, -6.9); g.add(poster);
    const carrier = box(0.5, 0.35, 0.35, stdM(0x9ac7e8, 0.5), 2.0, 0.65, -2.1); g.add(carrier);
    shadowAll(g, true, true); }
  return SH; }
