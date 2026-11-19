// ---------------------------------------------------------------- LOS DECORADOS: biblioteca, autobús, cocina, dormitorio, salón y el pueblo de playa. Cada uno es un grupo en su origen O.<nombre>.
// (Todo genérico: sin marcas ni rótulos reales.)
const stdM = (c, r = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const litM = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
function boxAt(par, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; par.add(b); return b; }
function cylAt(par, rt, rb, h, m, x, y, z, seg = 20) { const c = cyl(rt, rb, h, m, seg); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; par.add(c); return c; }
function tileTex(a, b, n = 4, joint = 'rgba(60,50,40,.18)') { return canvasTex(512, 512, (g, w, h) => { const s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * s, j * s, s, s); }
  g.strokeStyle = joint; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); } }); }
function floorAt(par, w, d, m, x = 0, z = 0, y = 0) { const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); f.rotation.x = -Math.PI / 2; f.position.set(x, y, z); f.receiveShadow = true; par.add(f); return f; }
function plant(s = 1, pot = 0xc9643a) { const g = new THREE.Group(), mp = stdM(pot, 0.8), ml = stdM(0x3f8a4b, 0.7); cylAt(g, 0.2, 0.15, 0.36, mp, 0, 0.18, 0); for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), ml); const a = i * 2.4; l.scale.set(0.55, 1.5, 0.3); l.position.set(Math.cos(a) * 0.14, 0.62 + hash(i) * 0.3, Math.sin(a) * 0.14); l.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5); l.castShadow = true; g.add(l); } g.scale.setScalar(s); return g; }
function frameArt(par, w, h, x, y, z, draw, ry = 0) { const t = canvasTex(256, Math.round(256 * h / w), draw), g = new THREE.Group(); boxAt(g, w + 0.05, h + 0.05, 0.03, stdM(0x2b2620, 0.6), 0, 0, 0); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), stdM(0xffffff, 0.8, { map: t })); p.position.z = 0.017; g.add(p); g.position.set(x, y, z); g.rotation.y = ry; par.add(g); return g; }
const artSun = (c1, c2, c3) => (g, w, h) => { g.fillStyle = c1; g.fillRect(0, 0, w, h); g.fillStyle = c2; g.beginPath(); g.arc(w * 0.62, h * 0.42, w * 0.2, 0, 7); g.fill(); g.fillStyle = c3; g.fillRect(0, h * 0.66, w, h * 0.34); };
// libros de colores en una balda (de x0 a x1)
function booksRow(par, x0, x1, y, z, seed = 1, d = 0.2) { let x = x0, i = 0; const cols = [0xc8553d, 0x2f6fd0, 0xe0a526, 0x3f8a4b, 0x7a5c8a, 0xf1ead9, 0x2b2d42, 0xd97aa6];
  while (x < x1 - 0.03) { const w = 0.03 + hash(seed * 7 + i) * 0.035, h = 0.2 + hash(seed * 3 + i * 1.7) * 0.09; if (hash(seed + i * 2.3) > 0.12) { const b = boxAt(par, w, h, d, stdM(cols[Math.floor(hash(seed * 11 + i) * cols.length)], 0.75), x + w / 2, y + h / 2, z); b.rotation.z = hash(i + seed) > 0.9 ? 0.12 : 0; } x += w + 0.004; i++; } }
function shelfUnit(par, x, z, w = 1.8, h = 2.2, ry = 0, seed = 1) { const g = new THREE.Group(), m = stdM(0x8a623c, 0.6); boxAt(g, w, h, 0.03, m, 0, h / 2, -0.15); boxAt(g, 0.04, h, 0.32, m, -w / 2, h / 2, 0); boxAt(g, 0.04, h, 0.32, m, w / 2, h / 2, 0);
  for (let i = 0; i < 6; i++) { const y = 0.06 + i * (h - 0.1) / 5; boxAt(g, w, 0.035, 0.32, m, 0, y, 0); if (i < 5) booksRow(g, -w / 2 + 0.05, w / 2 - 0.05, y + 0.02, 0.02, seed * 13 + i); } g.position.set(x, 0, z); g.rotation.y = ry; par.add(g); return g; }
function simpleChair(par, x, z, ry, col = 0x8a623c) { const g = new THREE.Group(), m = stdM(col, 0.6); boxAt(g, 0.42, 0.04, 0.42, m, 0, 0.44, 0); boxAt(g, 0.42, 0.42, 0.035, m, 0, 0.74, -0.2); for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) boxAt(g, 0.035, b < 0 ? 0.95 : 0.44, 0.035, m, a, b < 0 ? 0.475 : 0.22, b); g.position.set(x, 0, z); g.rotation.y = ry; par.add(g); return g; }
// hoja de apuntes (con renglones a boli y subrayados)
function notesSheet(par, x, y, z, ry = 0, seed = 1, w = 0.21, h = 0.297) { const t = canvasTex(256, 362, (g, W2, H2) => { g.fillStyle = '#fdfcf6'; g.fillRect(0, 0, W2, H2); g.fillStyle = 'rgba(255,214,60,.55)'; for (let i = 0; i < 3; i++) g.fillRect(24, 60 + hash(seed + i) * 240, 60 + hash(seed * 2 + i) * 120, 14);
    g.strokeStyle = 'rgba(30,40,90,.75)'; g.lineWidth = 2.2; for (let i = 1; i < 16; i++) { g.beginPath(); let xx = 22; g.moveTo(xx, i * 21 + 12); const end = W2 - 26 - hash(i * seed) * 90; while (xx < end) { xx += 6 + hash(xx * i + seed) * 9; g.lineTo(xx, i * 21 + 13 - hash(xx + seed) * 8); } g.stroke(); } });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), stdM(0xffffff, 0.9, { map: t })); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, y, z); p.receiveShadow = true; par.add(p); return p; }

// ================= 1 · BIBLIOTECA: una mesa larga con apuntes, y estanterías al fondo
function buildLib() { const g = new THREE.Group(); g.position.x = O.lib;
  floorAt(g, 16, 12, stdM(0xffffff, 0.55, { map: repTex(woodTex('#b98a5a', '#8a5f36', '#d6ab7a', 3), 5, 4) }));
  boxAt(g, 16, 3.4, 0.2, stdM(0xe9e2d2, 0.9), 0, 1.7, -3.6); boxAt(g, 0.2, 3.4, 12, stdM(0xe4dccb, 0.9), -6, 1.7, 0); boxAt(g, 0.2, 3.4, 12, stdM(0xe4dccb, 0.9), 6, 1.7, 0);
  for (let i = 0; i < 5; i++) shelfUnit(g, -4 + i * 2.0, -3.3, 1.9, 2.4, 0, i + 1);
  const top = stdM(0xffffff, 0.45, { map: repTex(woodTex('#d8b98a', '#b08a58', '#e8cfa6', 6), 2, 1) }), leg = stdM(0x2b2d33, 0.5, { metalness: 0.4 });
  boxAt(g, 2.6, 0.05, 1.15, top, 0, 0.735, 0); for (const [x, z] of [[-1.2, -0.48], [1.2, -0.48], [-1.2, 0.48], [1.2, 0.48]]) boxAt(g, 0.05, 0.71, 0.05, leg, x, 0.355, z);
  boxAt(g, 2.6, 0.05, 1.15, top, 0, 0.735, -1.9); for (const [x, z] of [[-1.2, -2.38], [1.2, -2.38], [-1.2, -1.42], [1.2, -1.42]]) boxAt(g, 0.05, 0.71, 0.05, leg, x, 0.355, z);
  simpleChair(g, 0.02, 0.78, Math.PI); simpleChair(g, -0.85, -0.78, 0); simpleChair(g, 0.7, -1.12, Math.PI); simpleChair(g, -0.6, -2.7, 0);
  // sobre la mesa: apuntes, un libro abierto, fluorescentes, un flexo y un vaso de café para llevar
  const y = 0.7612; notesSheet(g, -0.17, y, 0.2, 0.12, 2); notesSheet(g, -0.3, y + 0.0006, 0.02, -0.22, 5); notesSheet(g, 0.42, y, 0.06, -0.1, 7); notesSheet(g, 0.36, y + 0.0006, -0.17, 0.3, 9); notesSheet(g, -0.62, y, 0.24, 0.05, 11);
  { const b = openBook(0.34, 0.24, 0x2f5fb8, (c, w, h) => textLines(c, 20, 30, w - 40, 16, 18)); b.position.set(-0.05, 0.762, -0.3); b.rotation.y = 0.08; g.add(b); }
  for (const [i, c] of [[0, 0xffe14a], [1, 0xff6fa8], [2, 0x63e07a]]) { const p = cylAt(g, 0.008, 0.008, 0.13, stdM(c, 0.4), 0.3 + i * 0.03, 0.769, 0.33 - i * 0.012, 10); p.rotation.set(Math.PI / 2, 0, 0.25 + i * 0.2); }
  { const p = cylAt(g, 0.0045, 0.0045, 0.145, stdM(0x24304f, 0.4), -0.2, 0.766, 0.22, 8); p.rotation.set(Math.PI / 2, 0, -0.5); }
  { const c = cylAt(g, 0.042, 0.032, 0.11, stdM(0xf4efe4, 0.7), 0.62, 0.815, -0.25); cylAt(g, 0.044, 0.044, 0.012, stdM(0x2b2620, 0.6), 0.62, 0.876, -0.25); boxAt(g, 0.086, 0.045, 0.086, stdM(0xb88a5a, 0.9), 0.62, 0.81, -0.25).visible = false; }
  { const lp = new THREE.Group(); cylAt(lp, 0.09, 0.1, 0.02, leg, 0, 0.01, 0); const a = cylAt(lp, 0.01, 0.01, 0.42, leg, 0, 0.21, 0, 8); const hd = cylAt(lp, 0.05, 0.1, 0.12, stdM(0x2f7d6b, 0.5), 0.08, 0.43, 0); hd.rotation.z = 0.9; const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), litM(0xfff0c8, 1.6)); b.position.set(0.1, 0.4, 0); lp.add(b); lp.position.set(-0.95, 0.76, -0.3); g.add(lp); }
  { const st = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = boxAt(st, 0.2 + hash(i) * 0.04, 0.035, 0.27, stdM([0xc8553d, 0x3f8a4b, 0xe0a526, 0x2b2d42][i], 0.75), hash(i * 3) * 0.02, 0.0175 + i * 0.036, 0); b.rotation.y = (hash(i * 5) - 0.5) * 0.3; } st.position.set(0.95, 0.76, 0.1); g.add(st); }
  // la otra mesa: un portátil y más libros
  { const l = new THREE.Group(); boxAt(l, 0.32, 0.015, 0.22, stdM(0xbfc4cc, 0.4, { metalness: 0.6 }), 0, 0.0075, 0); const s = boxAt(l, 0.32, 0.21, 0.01, stdM(0xbfc4cc, 0.4, { metalness: 0.6 }), 0, 0.115, -0.115); s.rotation.x = -0.2; const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), litM(0xdfe9ff, 0.9)); sc.position.set(0, 0.115, -0.108); sc.rotation.x = -0.2; l.add(sc); l.position.set(-0.8, 0.76, -1.75); g.add(l); }
  g.add(at(plant(1.5), 5.1, 0, -2.6)); g.add(at(plant(1.2, 0x7a8a99), -5.2, 0, -2.4));
  // ventanales (luz de tarde) en la pared izquierda
  for (const z of [-2, 0.4]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.9), litM(0xcfe6ff, 1.15)); w.rotation.y = Math.PI / 2; w.position.set(-5.89, 1.9, z); g.add(w); boxAt(g, 0.06, 2.0, 0.05, stdM(0xf4f1ea, 0.8), -5.86, 1.9, z); }
  return g; }

// ================= 2a · AUTOBÚS: asientos azules, barras amarillas y la ciudad pasando por las ventanas
function buildBus() { const g = new THREE.Group(), U = g.userData; g.position.x = O.bus;
  floorAt(g, 9, 2.7, stdM(0x4a4d55, 0.85), 0, 0.05);
  const pan = stdM(0xe9ecef, 0.6), trim = stdM(0x8d949c, 0.5, { metalness: 0.5 }), seatM = stdM(0x2a57b8, 0.85), seatD = stdM(0x1c3f8f, 0.85), yel = stdM(0xf5c518, 0.35, { metalness: 0.3 });
  for (const z of [-1.28, 1.38]) { boxAt(g, 9, 0.95, 0.06, pan, 0, 0.475, z); boxAt(g, 9, 0.5, 0.06, pan, 0, 2.2, z); for (let x = -4.5; x <= 4.5; x += 1.5) boxAt(g, 0.09, 1.0, 0.07, trim, x, 1.45, z); boxAt(g, 9, 0.05, 0.08, trim, 0, 0.97, z); boxAt(g, 9, 0.05, 0.08, trim, 0, 1.93, z); }
  { const c = boxAt(g, 9, 0.06, 2.7, stdM(0xf2f3f5, 0.8, { emissive: 0xf2f3f5, emissiveIntensity: 0.25 }), 0, 2.45, 0.05); c.castShadow = false; for (let x = -3.6; x <= 3.6; x += 1.8) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.16), litM(0xffffff, 1.5)); l.rotation.x = Math.PI / 2; l.position.set(x, 2.415, 0.05); g.add(l); } }
  // la ciudad: una banda larga de fachadas y árboles que se desliza (textura que se repite)
  const city = canvasTex(2048, 512, (c, w, h) => { const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#9fd0ff'); sky.addColorStop(1, '#e8f3ff'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
    let x = 0, i = 0; while (x < w) { const bw = 150 + hash(i * 3.3) * 170, bh = 230 + hash(i * 7.1) * 200; c.fillStyle = ['#e8d5b5', '#d9b99a', '#c9d3dc', '#f0e2c8', '#d6a98a', '#b9c7b0'][i % 6]; c.fillRect(x, h - bh, bw - 6, bh);
      c.fillStyle = 'rgba(40,60,90,.55)'; for (let yy = h - bh + 26; yy < h - 110; yy += 58) for (let xx = x + 18; xx < x + bw - 44; xx += 48) c.fillRect(xx, yy, 26, 36); c.fillStyle = ['#c0392b', '#2f6fd0', '#3f8a4b', '#e0a526'][i % 4]; c.fillRect(x + 12, h - 96, bw - 30, 20); x += bw; i++; }
    for (let k = 0; k < 9; k++) { const tx = k * 230 + 60; c.fillStyle = '#6b4a2e'; c.fillRect(tx - 5, h - 150, 10, 110); c.fillStyle = '#4c9a55'; c.beginPath(); c.arc(tx, h - 175, 52, 0, 7); c.fill(); } c.fillStyle = '#8f949b'; c.fillRect(0, h - 44, w, 44); });
  city.wrapS = THREE.RepeatWrapping; city.repeat.set(2.6, 1); U.city = city;
  for (const z of [-4.2, 4.4]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(40, 5.2), new THREE.MeshBasicMaterial({ map: city, toneMapped: false })); p.position.set(0, 2.05, z * 1.5); if (z > 0) p.rotation.y = Math.PI; g.add(p); }
  // asientos (miran a +x) a los dos lados del pasillo
  const seat = (x, z) => { const s = new THREE.Group(); const c = rbox(0.44, 0.44, 0.1, seatM, 0.04); c.rotation.x = -Math.PI / 2; c.position.y = 0.45; s.add(c); const b = rbox(0.44, 0.62, 0.09, seatM, 0.05); b.position.set(0, 0.78, 0); b.rotation.y = Math.PI / 2; b.position.x = -0.24; b.rotation.z = 0; s.add(b);
    const hd = rbox(0.3, 0.16, 0.1, seatD, 0.04); hd.rotation.y = Math.PI / 2; hd.position.set(-0.24, 1.12, 0); s.add(hd); boxAt(s, 0.06, 0.4, 0.3, trim, 0, 0.2, 0); const hb = cylAt(s, 0.014, 0.014, 0.4, yel, -0.25, 1.24, 0, 10); hb.rotation.x = Math.PI / 2; s.position.set(x, 0, z); g.add(s); return s; };
  for (let x = -3.3; x <= 3.4; x += 0.95) { if (Math.abs(x - 1.45) > 0.1) { seat(x, -0.98); seat(x, -0.5); } seat(x, 1.08); }
  for (const x of [-2.35, 0.5, 3.35]) { cylAt(g, 0.018, 0.018, 2.4, yel, x, 1.2, 0.3, 10); } { const r = cylAt(g, 0.016, 0.016, 9, yel, 0, 2.1, 0.3, 10); r.rotation.z = Math.PI / 2; }
  for (let i = 0; i < 5; i++) { const s = boxAt(g, 0.02, 0.22, 0.03, stdM(0x2b2d33, 0.7), -2.8 + i * 1.4, 1.98, 0.3); cylAt(g, 0.05, 0.05, 0.012, yel, -2.8 + i * 1.4, 1.84, 0.3, 14).rotation.x = Math.PI / 2; }
  return g; }
function busAt(g, t) { g.userData.city.offset.x = t * 0.22; }

// ================= 2b · COCINA: encimera con armarios, azulejo blanco, nevera y una olla al fuego
function buildKit() { const g = new THREE.Group(); g.position.x = O.kit;
  floorAt(g, 10, 9, stdM(0xffffff, 0.5, { map: repTex(tileTex('#e9e4da', '#cfc7b8', 4), 5, 4.5) }));
  boxAt(g, 10, 3.2, 0.2, stdM(0xf4e9d6, 0.9), 0, 1.6, -1.9); boxAt(g, 0.2, 3.2, 9, stdM(0xf1e4cf, 0.9), -3.6, 1.6, 0); boxAt(g, 0.2, 3.2, 9, stdM(0xf1e4cf, 0.9), 3.9, 1.6, 0);
  { const t = repTex(tileTex('#fbfbf8', '#f4f4ef', 4, 'rgba(120,130,140,.45)'), 9, 1.4); const p = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.75), stdM(0xffffff, 0.35, { map: t })); p.position.set(-0.4, 1.3, -1.795); g.add(p); }
  const cab = stdM(0x3d7a6a, 0.6), topM = stdM(0xf0ece4, 0.4), hand = stdM(0xd9c27a, 0.35, { metalness: 0.7 });
  boxAt(g, 5.6, 0.86, 0.62, cab, -0.4, 0.43, -1.48); boxAt(g, 5.7, 0.05, 0.68, topM, -0.4, 0.885, -1.46);
  for (let i = 0; i < 7; i++) { boxAt(g, 0.76, 0.74, 0.02, stdM(0x448676, 0.6), -2.8 + i * 0.8, 0.45, -1.16); boxAt(g, 0.16, 0.02, 0.02, hand, -2.8 + i * 0.8, 0.74, -1.14); }
  boxAt(g, 5.6, 0.72, 0.36, cab, -0.4, 2.1, -1.62); for (let i = 0; i < 7; i++) { if (i === 3) continue; boxAt(g, 0.76, 0.66, 0.02, stdM(0x448676, 0.6), -2.8 + i * 0.8, 2.1, -1.43); boxAt(g, 0.02, 0.16, 0.02, hand, -2.5 + i * 0.8, 1.9, -1.41); }
  // nevera
  { const f = stdM(0xdfe3e8, 0.35, { metalness: 0.5 }); boxAt(g, 0.78, 1.95, 0.7, f, 2.95, 0.975, -1.45); boxAt(g, 0.74, 0.01, 0.02, stdM(0x8d949c, 0.5), 2.95, 1.3, -1.09); for (const y of [0.9, 1.6]) boxAt(g, 0.03, 0.4, 0.03, stdM(0x8d949c, 0.4, { metalness: 0.7 }), 2.64, y, -1.07);
    for (let i = 0; i < 5; i++) boxAt(g, 0.07, 0.07, 0.006, stdM([0xff6f61, 0xffd166, 0x06d6a0, 0x4a8fc2, 0xf78fb3][i], 0.6), 2.85 + hash(i) * 0.3, 1.45 + hash(i * 3) * 0.35, -1.095).rotation.z = hash(i * 7) - 0.5; }
  // placa con una olla y una sartén; fregadero con ventana encima
  { boxAt(g, 0.6, 0.012, 0.52, stdM(0x1c1d21, 0.2, { metalness: 0.3 }), 1.2, 0.916, -1.46); const pot = cylAt(g, 0.12, 0.12, 0.13, stdM(0xd04a3a, 0.4), 1.07, 0.99, -1.52); for (const s of [-1, 1]) boxAt(g, 0.05, 0.015, 0.03, stdM(0x1c1d21, 0.5), 1.07 + s * 0.14, 1.03, -1.52); cylAt(g, 0.125, 0.125, 0.012, stdM(0xbfc4cc, 0.3, { metalness: 0.7 }), 1.07, 1.06, -1.52);
    cylAt(g, 0.11, 0.09, 0.035, stdM(0x26282e, 0.5), 1.36, 0.94, -1.36); const h = boxAt(g, 0.2, 0.015, 0.025, stdM(0x26282e, 0.5), 1.55, 0.95, -1.3); h.rotation.y = -0.3; }
  { boxAt(g, 0.62, 0.02, 0.42, stdM(0xbfc4cc, 0.3, { metalness: 0.8 }), -1.3, 0.905, -1.46); const tp = cylAt(g, 0.012, 0.012, 0.22, stdM(0xbfc4cc, 0.25, { metalness: 0.9 }), -1.3, 1.02, -1.68, 8); const sp = cylAt(g, 0.01, 0.01, 0.14, stdM(0xbfc4cc, 0.25, { metalness: 0.9 }), -1.3, 1.12, -1.62, 8); sp.rotation.x = Math.PI / 2;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.66), litM(0xfff0cf, 1.25)); w.position.set(-0.4, 2.1, -1.795 + 0.36); w.visible = false; g.add(w);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.62), litM(0xffe9c0, 1.3)); win.position.set(-0.4, 2.1, -1.79); g.add(win); boxAt(g, 0.03, 0.64, 0.03, stdM(0xf4f1ea, 0.8), -0.4, 2.1, -1.78); boxAt(g, 0.74, 0.03, 0.03, stdM(0xf4f1ea, 0.8), -0.4, 2.1, -1.78); }
  // cosas en la encimera: tostadora, tarros, frutero y una planta
  { const ts = rbox(0.26, 0.17, 0.16, stdM(0xe8e2d6, 0.4), 0.04); ts.position.set(-2.4, 1.0, -1.5); g.add(ts); for (let i = 0; i < 3; i++) { cylAt(g, 0.05, 0.05, 0.14 + i * 0.03, stdM(0xf2ede2, 0.5), -0.2 + i * 0.13, 0.98 + i * 0.015, -1.64); cylAt(g, 0.052, 0.052, 0.02, stdM(0x8a623c, 0.6), -0.2 + i * 0.13, 1.06 + i * 0.03, -1.64); }
    const bowl = cylAt(g, 0.15, 0.08, 0.07, stdM(0xf7f3ea, 0.4), 0.35, 0.945, -1.42); for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), stdM([0xf08a24, 0xe9c229, 0xd43c2f, 0xf08a24, 0x7ab648][i], 0.6)); f.position.set(0.35 + Math.cos(i * 1.3) * 0.06, 0.99 + (i === 4 ? 0.04 : 0), -1.42 + Math.sin(i * 1.3) * 0.06); f.castShadow = true; g.add(f); }
    g.add(at(plant(0.45, 0xf2ede2), -1.95, 0.91, -1.6)); }
  // mesa pequeña con dos sillas y una lámpara colgante; cuadro
  { const t = cylAt(g, 0.5, 0.5, 0.04, stdM(0xe9d7b5, 0.5), -2.2, 0.75, 0.9, 32); cylAt(g, 0.04, 0.04, 0.73, stdM(0x2b2d33, 0.5), -2.2, 0.365, 0.9); cylAt(g, 0.28, 0.3, 0.03, stdM(0x2b2d33, 0.5), -2.2, 0.015, 0.9); simpleChair(g, -2.9, 0.9, Math.PI / 2, 0xd9b98a); simpleChair(g, -2.2, 0.2, 0, 0xd9b98a);
    cylAt(g, 0.004, 0.004, 1.3, stdM(0x2b2d33, 0.5), -2.2, 2.55, 0.9, 6); const sh = cylAt(g, 0.06, 0.24, 0.2, stdM(0xe0a526, 0.5), -2.2, 1.85, 0.9, 24); const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), litM(0xfff0c8, 1.8)); b.position.set(-2.2, 1.78, 0.9); g.add(b); }
  frameArt(g, 0.5, 0.65, 2.0, 1.75, -1.79, artSun('#f7e3c0', '#e85d3a', '#2f6f8f'));
  return g; }

// ================= 2c · DORMITORIO: la cama, guirnalda de luces, pósteres y un escritorio
function buildBed() { const g = new THREE.Group(); g.position.x = O.bed;
  floorAt(g, 9, 8, stdM(0xffffff, 0.55, { map: repTex(woodTex('#c9a070', '#a07a4c', '#dcb98a', 9), 4, 4) }));
  boxAt(g, 9, 3.2, 0.2, stdM(0x2f4d6b, 0.9), 0, 1.6, -1.5); boxAt(g, 0.2, 3.2, 8, stdM(0xe9e2d2, 0.9), -3.2, 1.6, 0); boxAt(g, 0.2, 3.2, 8, stdM(0xe9e2d2, 0.9), 3.6, 1.6, 0);
  { const r = floorAt(g, 2.6, 1.7, stdM(0xe7d9c4, 0.95), 0.2, 0.75, 0.006); }
  // la cama (a lo largo de x; la cabeza a la izquierda)
  const wood = stdM(0x9a6f42, 0.6); boxAt(g, 2.15, 0.26, 1.1, wood, 0, 0.19, -0.75); for (const [x, z] of [[-1, -1.25], [1, -1.25], [-1, -0.25], [1, -0.25]]) boxAt(g, 0.07, 0.1, 0.07, wood, x, 0.05, z); boxAt(g, 0.07, 0.75, 1.1, wood, -1.08, 0.55, -0.75);
  { const m = rbox(2.05, 1.02, 0.22, stdM(0xf4f1ea, 0.9), 0.07); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.43, -0.75); g.add(m); const d = rbox(1.25, 1.06, 0.1, stdM(0xe07a5f, 0.9), 0.045); d.rotation.x = -Math.PI / 2; d.position.set(0.42, 0.56, -0.75); g.add(d);
    const fold = rbox(0.2, 1.06, 0.12, stdM(0xf2cc8f, 0.9), 0.05); fold.rotation.x = -Math.PI / 2; fold.position.set(-0.26, 0.575, -0.75); g.add(fold);
    const pl = rbox(0.5, 0.72, 0.15, stdM(0xfdfcf7, 0.9), 0.07); pl.rotation.x = -Math.PI / 2; pl.position.set(-0.72, 0.6, -0.75); pl.rotation.y = 0; g.add(pl); const cu = rbox(0.34, 0.34, 0.12, stdM(0x81b29a, 0.9), 0.055); cu.position.set(-0.92, 0.78, -1.08); cu.rotation.set(-0.2, 0.3, 0.2); g.add(cu); }
  // mesilla con lámpara
  { boxAt(g, 0.45, 0.5, 0.4, wood, -1.55, 0.25, -1.15); boxAt(g, 0.4, 0.02, 0.02, stdM(0xd9c27a, 0.4, { metalness: 0.7 }), -1.55, 0.32, -0.945); cylAt(g, 0.07, 0.08, 0.02, stdM(0x2b2d33, 0.5), -1.6, 0.51, -1.2); cylAt(g, 0.012, 0.012, 0.22, stdM(0x2b2d33, 0.5), -1.6, 0.62, -1.2, 8);
    const sh = cylAt(g, 0.08, 0.13, 0.17, new THREE.MeshStandardMaterial({ color: 0xffe2b0, roughness: 0.7, emissive: 0xffc878, emissiveIntensity: 1.1 }), -1.6, 0.8, -1.2, 24); sh.castShadow = false; const pl = new THREE.PointLight(0xffc37a, 1.2, 4, 1.6); pl.position.set(-1.5, 0.95, -0.95); g.add(pl); }
  // guirnalda de luces en la pared, pósteres y balda
  for (let i = 0; i < 22; i++) { const x = -2.6 + i * 0.26, y = 2.45 - 0.16 * Math.sin((i % 7) / 6 * Math.PI); const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), litM(0xffd98a, 1.9)); b.position.set(x, y, -1.38); g.add(b); }
  frameArt(g, 0.55, 0.75, -0.6, 1.65, -1.385, artSun('#1d3557', '#f4a261', '#2a9d8f')); frameArt(g, 0.42, 0.42, 0.15, 1.85, -1.385, (c, w, h) => { c.fillStyle = '#f2cc8f'; c.fillRect(0, 0, w, h); c.fillStyle = '#e07a5f'; c.beginPath(); c.moveTo(w * 0.1, h * 0.85); c.lineTo(w * 0.45, h * 0.25); c.lineTo(w * 0.9, h * 0.85); c.fill(); c.fillStyle = '#fdfcf7'; c.beginPath(); c.arc(w * 0.72, h * 0.25, w * 0.09, 0, 7); c.fill(); });
  frameArt(g, 0.42, 0.3, 0.15, 1.42, -1.385, artSun('#bfe6ff', '#fff3b0', '#3d9bd1'));
  boxAt(g, 1.2, 0.035, 0.22, wood, 1.6, 1.75, -1.3); booksRow(g, 1.05, 1.75, 1.77, -1.3, 4, 0.16); g.add(at(plant(0.4, 0xf2ede2), 2.05, 1.77, -1.3));
  // escritorio con portátil y silla; mochila en el suelo
  { boxAt(g, 1.3, 0.04, 0.6, stdM(0xf1ead9, 0.5), 2.6, 0.74, -1.05); for (const [x, z] of [[2.0, -1.3], [3.2, -1.3], [2.0, -0.8], [3.2, -0.8]]) boxAt(g, 0.04, 0.72, 0.04, stdM(0x2b2d33, 0.5), x, 0.36, z); simpleChair(g, 2.6, -0.45, Math.PI, 0x2f4d6b);
    const l = new THREE.Group(); boxAt(l, 0.32, 0.015, 0.22, stdM(0xbfc4cc, 0.4, { metalness: 0.6 }), 0, 0.0075, 0); const s = boxAt(l, 0.32, 0.21, 0.01, stdM(0xbfc4cc, 0.4, { metalness: 0.6 }), 0, 0.115, -0.12); s.rotation.x = -0.2; const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), litM(0x9fc4ff, 0.9)); sc.position.set(0, 0.115, -0.113); sc.rotation.x = -0.2; l.add(sc); l.position.set(2.6, 0.76, -1.1); g.add(l); }
  { const b = rbox(0.32, 0.42, 0.18, stdM(0xe0a526, 0.8), 0.07); b.position.set(1.35, 0.21, -0.1); b.rotation.set(-0.15, 0.5, 0); g.add(b); }
  return g; }

// ================= 3–4 · SALÓN: el sofá, la mesa baja, una lámpara de pie, plantas y cuadros
const SOFA = { z: -0.55, seat: 0.44 }, TBL = { x: 0, y: 0.42, z: 0.95 };
function buildSofa() { const g = new THREE.Group(); g.position.x = O.sofa;
  floorAt(g, 12, 10, stdM(0xffffff, 0.5, { map: repTex(woodTex('#c79a66', '#9a6f42', '#dcb382', 7), 5, 4) }));
  boxAt(g, 12, 3.3, 0.2, stdM(0xf3ead9, 0.9), 0, 1.65, -1.6); boxAt(g, 0.2, 3.3, 10, stdM(0xefe4d0, 0.9), -4.6, 1.65, 0); boxAt(g, 0.2, 3.3, 10, stdM(0xefe4d0, 0.9), 4.6, 1.65, 0); boxAt(g, 12, 0.12, 0.03, stdM(0xfbf8f1, 0.7), 0, 0.06, -1.49);
  floorAt(g, 3.6, 2.6, stdM(0xffffff, 0.95, { map: canvasTex(512, 384, (c, w, h) => { c.fillStyle = '#e8dcc6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c96f4a'; c.lineWidth = 10; c.strokeRect(22, 22, w - 44, h - 44); c.strokeStyle = '#2f6f8f'; c.lineWidth = 5; c.strokeRect(44, 44, w - 88, h - 88); for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#c96f4a' : '#2f6f8f'; c.beginPath(); c.arc(90 + i * 41, h / 2, 9, 0, 7); c.fill(); } }) }), 0, 0.45, 0.006);
  // sofá de tres plazas (mira a +z)
  { const s = new THREE.Group(), fab = stdM(0x2f7d86, 0.95), fab2 = stdM(0x286c74, 0.95); const base = rbox(2.5, 0.92, 0.3, fab2, 0.08); base.rotation.x = -Math.PI / 2; base.position.set(0, 0.2, 0); s.add(base);
    for (let i = 0; i < 3; i++) { const c = rbox(0.72, 0.72, 0.16, fab, 0.07); c.rotation.x = -Math.PI / 2; c.position.set(-0.73 + i * 0.73, 0.4, 0.08); s.add(c); const b = rbox(0.72, 0.5, 0.2, fab, 0.09); b.position.set(-0.73 + i * 0.73, 0.72, -0.33); b.rotation.x = -0.16; s.add(b); }
    const bk = rbox(2.5, 0.72, 0.2, fab2, 0.09); bk.position.set(0, 0.55, -0.44); s.add(bk); for (const sx of [-1, 1]) { const a = rbox(0.24, 0.5, 0.92, fab2, 0.1); a.position.set(sx * 1.22, 0.42, 0); s.add(a); }
    for (const [x, c] of [[-0.98, 0xf2cc8f], [0.98, 0xe07a5f]]) { const cu = rbox(0.36, 0.36, 0.13, stdM(c, 0.95), 0.06); cu.position.set(x, 0.66, -0.22); cu.rotation.set(-0.3, x < 0 ? 0.4 : -0.4, 0); s.add(cu); }
    for (const [x, z] of [[-1.15, -0.4], [1.15, -0.4], [-1.15, 0.38], [1.15, 0.38]]) cylAt(s, 0.025, 0.02, 0.07, stdM(0x6b4a2e, 0.6), x, 0.035, z, 10); s.position.set(0, 0, SOFA.z); g.add(s); }
  // mesa baja (redondeada) con unas patatas y dos latas
  { const t = rbox(1.25, 0.7, 0.045, stdM(0xffffff, 0.45, { map: repTex(woodTex('#e0c39a', '#b8925e', '#f0d9b5', 11), 1, 1) }), 0.08); t.rotation.x = -Math.PI / 2; t.position.set(TBL.x, TBL.y - 0.0225, TBL.z); g.add(t); for (const [x, z] of [[-0.52, -0.26], [0.52, -0.26], [-0.52, 0.26], [0.52, 0.26]]) { const l = cylAt(g, 0.022, 0.016, 0.4, stdM(0x2b2d33, 0.5), TBL.x + x, 0.2, TBL.z + z, 10); }
    const bw = cylAt(g, 0.11, 0.07, 0.06, stdM(0xf7f3ea, 0.4), 0.4, TBL.y + 0.03, TBL.z - 0.12, 24); for (let i = 0; i < 12; i++) { const c = cylAt(g, 0.022, 0.022, 0.004, stdM(0xf0c35a, 0.6), 0.4 + (hash(i) - 0.5) * 0.12, TBL.y + 0.062 + hash(i * 3) * 0.02, TBL.z - 0.12 + (hash(i * 7) - 0.5) * 0.12, 10); c.rotation.set(hash(i) * 2, 0, hash(i * 5) * 2); }
    for (const [x, z, c] of [[-0.42, -0.14, 0xe5533d], [-0.33, 0.05, 0x2f9e6b]]) { cylAt(g, 0.031, 0.031, 0.115, stdM(c, 0.35, { metalness: 0.5 }), x, TBL.y + 0.0575, TBL.z + z, 20); cylAt(g, 0.027, 0.031, 0.006, stdM(0xcfd4da, 0.3, { metalness: 0.8 }), x, TBL.y + 0.118, TBL.z + z, 20); } }
  // lámpara de pie, plantas, estantería, cuadros y ventana
  { cylAt(g, 0.16, 0.18, 0.03, stdM(0x2b2d33, 0.5), -2.0, 0.015, -0.9); cylAt(g, 0.014, 0.014, 1.6, stdM(0x2b2d33, 0.5), -2.0, 0.8, -0.9, 8); const sh = cylAt(g, 0.16, 0.24, 0.3, new THREE.MeshStandardMaterial({ color: 0xffe9c4, roughness: 0.7, emissive: 0xffc878, emissiveIntensity: 0.9 }), -2.0, 1.7, -0.9, 28); sh.castShadow = false; const pl = new THREE.PointLight(0xffc98a, 1.0, 5, 1.6); pl.position.set(-1.85, 1.55, -0.6); g.add(pl); }
  g.add(at(plant(1.7, 0xf2ede2), 2.2, 0, -1.0)); g.add(at(plant(1.0), -3.4, 0, -1.1)); shelfUnit(g, 3.6, -1.3, 1.4, 2.0, 0, 9);
  frameArt(g, 0.75, 0.55, -0.55, 1.95, -1.485, artSun('#f6d6ad', '#e76f51', '#264653')); frameArt(g, 0.42, 0.55, 0.3, 1.95, -1.485, artSun('#bfe6ff', '#ffe08a', '#2a9d8f')); frameArt(g, 0.42, 0.42, 0.95, 2.0, -1.485, (c, w, h) => { c.fillStyle = '#fdf6e3'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e07a5f'; c.lineWidth = 14; c.beginPath(); c.arc(w / 2, h / 2, w * 0.28, 0, 7); c.stroke(); });
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), litM(0xffe2b8, 1.25)); w.position.set(-2.9, 1.75, -1.49); g.add(w); boxAt(g, 0.04, 1.52, 0.04, stdM(0xfbf8f1, 0.7), -2.9, 1.75, -1.48); boxAt(g, 1.32, 0.04, 0.04, stdM(0xfbf8f1, 0.7), -2.9, 1.75, -1.48); for (const sx of [-1, 1]) boxAt(g, 0.3, 1.9, 0.05, stdM(0xe9c9a0, 0.95), -2.9 + sx * 0.8, 1.7, -1.44); }
  return g; }

// ================= 5 · EL PUEBLO DE PLAYA: mar al fondo (−z), arena, un murete blanco y el paseo, y detrás la calle de casas blancas
const TOWN = { wall: -2, sea: -15, street: 22, houses: 18.2 };
function palm(h = 4.2, lean = 0.25, seed = 1) { const g = new THREE.Group(), mt = stdM(0x9a7b55, 0.9), ml = stdM(0x3f9a4f, 0.75, { side: THREE.DoubleSide }); const n = 7; let x = 0;
  for (let i = 0; i < n; i++) { const y0 = i * h / n, s = cylAt(g, 0.11 - i * 0.006, 0.12 - i * 0.006, h / n + 0.03, mt, x + lean * (i + 0.5) / n * (i / n) * 2, y0 + h / n / 2, 0, 10); s.rotation.z = -lean * (i / n) * 0.9; x = lean * ((i + 1) / n) * ((i + 1) / n) * 1.6; }
  const top = new THREE.Group(); top.position.set(x, h, 0); g.add(top); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + hash(seed + i) * 0.4, f = new THREE.Group(); f.rotation.y = a; top.add(f);
    for (let k = 0; k < 5; k++) { const sgm = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.36 - k * 0.05), ml); sgm.rotation.set(-Math.PI / 2 + 0.0, 0, 0); const u = k / 4; sgm.position.set(0, 0.25 - u * u * 0.95 + (k === 0 ? 0 : 0.06), 0.2 + k * 0.38); sgm.rotation.x = -Math.PI / 2 + 0.25 + u * 0.75; sgm.castShadow = true; f.add(sgm); } }
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), stdM(0x6b4a2e, 0.8)); c.position.set(Math.cos(i * 2.1) * 0.12, -0.08, Math.sin(i * 2.1) * 0.12); top.add(c); } return g; }
function parasol(col = 0xe5533d, col2 = 0xfdfcf7) { const g = new THREE.Group(); cylAt(g, 0.02, 0.02, 2.1, stdM(0xf4f1ea, 0.5), 0, 1.05, 0, 8); const t = canvasTex(256, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#' + new THREE.Color(col).getHexString() : '#' + new THREE.Color(col2).getHexString(); c.fillRect(i * w / 8, 0, w / 8, h); } });
  const c = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.42, 16, 1, true), stdM(0xffffff, 0.8, { map: t, side: THREE.DoubleSide })); c.position.y = 2.1; c.castShadow = true; g.add(c); g.rotation.z = 0.08; return g; }
function house(w, h, d, seed) { const g = new THREE.Group(), wh = stdM(0xfbf9f3, 0.9), cols = [0x2f6fd0, 0x1f9e9a, 0xe07a5f, 0xe0a526, 0x3f8a4b], c = stdM(cols[seed % cols.length], 0.6), dark = stdM(0x33414f, 0.4);
  boxAt(g, w, h, d, wh, 0, h / 2, 0); boxAt(g, w + 0.14, 0.14, d + 0.14, wh, 0, h + 0.07, 0); boxAt(g, w, 0.35, 0.06, stdM(0xe9e2d2, 0.9), 0, 0.175, d / 2 + 0.03);
  boxAt(g, 0.95, 2.05, 0.08, c, -w * 0.22, 1.025, d / 2 + 0.02); boxAt(g, 0.06, 0.06, 0.06, stdM(0xd9c27a, 0.3, { metalness: 0.8 }), -w * 0.22 + 0.32, 1.05, d / 2 + 0.07);
  const nf = Math.max(1, Math.round(h / 3)); for (let f = 0; f < nf; f++) for (const x of f === 0 ? [w * 0.22] : [-w * 0.22, w * 0.22]) { const y = 1.75 + f * 2.9; if (y + 0.8 > h) continue; boxAt(g, 0.9, 1.1, 0.05, dark, x, y, d / 2 + 0.01); for (const sx of [-1, 1]) boxAt(g, 0.42, 1.14, 0.05, c, x + sx * 0.68, y, d / 2 + 0.04);
    if (f > 0) { boxAt(g, 1.5, 0.06, 0.5, wh, x, y - 0.75, d / 2 + 0.25); for (let i = 0; i < 7; i++) boxAt(g, 0.025, 0.5, 0.025, stdM(0x2b2d33, 0.5), x - 0.7 + i * 0.233, y - 0.47, d / 2 + 0.48); boxAt(g, 1.5, 0.03, 0.03, stdM(0x2b2d33, 0.5), x, y - 0.22, d / 2 + 0.48); }
    else { const pot = cylAt(g, 0.13, 0.1, 0.22, stdM(0xc9643a, 0.8), x + 0.9, 0.11, d / 2 + 0.35); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), stdM(seed % 2 ? 0xd9488f : 0xe5533d, 0.8)); fl.position.set(x + 0.9, 0.38, d / 2 + 0.35); fl.castShadow = true; g.add(fl); } }
  if (seed % 3 === 0) { const aw = boxAt(g, 1.6, 0.04, 0.9, stdM(cols[(seed + 2) % cols.length], 0.8), -w * 0.22, 2.4, d / 2 + 0.42); aw.rotation.x = 0.3; }
  return g; }
function buildTown() { const g = new THREE.Group(), U = g.userData; g.position.x = O.town;
  // arena, mar (con una franja clara en la orilla) y espuma
  floorAt(g, 400, 60, stdM(0xf0d48a, 0.95), 0, -20, 0); const sea = floorAt(g, 4000, 3000, stdM(0x1c9fc7, 0.22, { metalness: 0.15 }), 0, TOWN.sea - 1500 - 2, 0.03); sea.receiveShadow = false; U.sea = sea;
  const sh = floorAt(g, 400, 9, new THREE.MeshStandardMaterial({ color: 0x6fd6e3, roughness: 0.2, transparent: true, opacity: 0.75 }), 0, TOWN.sea - 5.5, 0.045); sh.receiveShadow = false;
  const foam = floorAt(g, 400, 0.5, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), 0, TOWN.sea - 1, 0.05); U.foam = foam;
  // paseo (baldosas claras) con su murete blanco; y la calle
  floorAt(g, 400, TOWN.street + 8 - TOWN.wall, stdM(0xffffff, 0.8, { map: repTex(tileTex('#e3d3bb', '#d8c6aa', 4, 'rgba(120,100,70,.3)'), 100, 7) }), 0, (TOWN.street + 8 + TOWN.wall) / 2, 0.02);
  boxAt(g, 400, 0.55, 0.42, stdM(0xfbf9f3, 0.9), 0, 0.275, TOWN.wall); boxAt(g, 400, 0.06, 0.5, stdM(0x2f6fd0, 0.6), 0, 0.58, TOWN.wall); boxAt(g, 400, 0.12, 0.43, stdM(0x2f6fd0, 0.6), 0, 0.06, TOWN.wall);
  // palmeras a lo largo del paseo y sombrillas con toallas en la arena
  for (let i = -6; i <= 6; i++) { const p = palm(4.0 + hash(i) * 1.2, (hash(i * 3) - 0.5) * 0.7, i); p.position.set(i * 7 + 2.5, 0, TOWN.wall + 2.2 + hash(i * 5)); p.rotation.y = hash(i * 9) * 6; g.add(p); }
  const pc = [0xe5533d, 0x2f6fd0, 0xe0a526, 0x1f9e9a, 0xd9488f]; for (let i = 0; i < 14; i++) { const x = -42 + i * 6.5 + hash(i) * 2, z = -5.5 - hash(i * 3) * 5.5; if (Math.abs(x) < 5) continue; const p = parasol(pc[i % 5]); p.position.set(x, 0, z); g.add(p); const tw = boxAt(g, 0.8, 0.02, 1.7, stdM(pc[(i + 2) % 5], 0.95), x + 0.7, 0.012, z + 0.3); tw.rotation.y = hash(i) - 0.5; }
  // casas blancas de la calle (fachada hacia +z) y, enfrente, otra hilera que cierra el fondo de la calle
  for (let i = -7; i <= 7; i++) { const w = 4.6 + hash(i * 1.3) * 1.6, h = 3.4 + Math.floor(hash(i * 2.7) * 2.2) * 2.9, hs = house(w, h, 5, i + 20); hs.position.set(i * 6.3, 0, TOWN.houses - 2.5); g.add(hs); }
  for (let i = -6; i <= 6; i++) { const p = palm(3.6 + hash(i * 2) * 0.8, 0.2, i + 40); p.position.set(i * 9.5 - 3, 0, TOWN.houses + 1.0); g.add(p); }
  // farolas y un banco
  for (let i = -5; i <= 5; i++) { cylAt(g, 0.04, 0.05, 3.2, stdM(0x2b2d33, 0.5), i * 9 + 5, 1.6, TOWN.houses + 0.7, 8); const l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), stdM(0xfdfcf7, 0.3)); l.position.set(i * 9 + 5, 3.3, TOWN.houses + 0.7); g.add(l); }
  // veleros lejanos
  for (let i = 0; i < 5; i++) { const b = new THREE.Group(); boxAt(b, 3, 0.5, 0.9, stdM(0xfdfcf7, 0.6), 0, 0.25, 0); const s = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([v3(0, 0.5, 0), v3(0, 4.6, 0), v3(1.9, 0.6, 0)]), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); b.add(s); b.position.set(-90 + i * 47 + hash(i) * 20, 0, TOWN.sea - 60 - hash(i * 3) * 120); g.add(b); }
  return g; }
function townAt(g, t) { g.userData.foam.position.z = TOWN.sea - 1 + 0.5 * Math.sin(t * 1.3); g.userData.foam.material.opacity = 0.6 + 0.25 * Math.sin(t * 1.3 + 1); }
