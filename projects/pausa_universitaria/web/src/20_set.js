// ---------------------------------------------------------------- EL DECORADO: una maqueta sin pared delantera con tres estancias seguidas: el aula, el pasillo y la cafetería.
// (Sin logotipos ni nombres oficiales: rótulos genéricos.)
let SETU = {};
const stdM = (c, r = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
function boxAt(par, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; par.add(b); return b; }
function tileTex(a, b, n = 4, joint = 'rgba(60,50,40,.18)') { return canvasTex(512, 512, (g, w, h) => { const s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * s, j * s, s, s);
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${hash(i * 7 + j * 3 + k) > 0.5 ? '255,255,255' : '0,0,0'},.035)`; g.fillRect(i * s + hash(k * 3.1 + i) * s, j * s + hash(k * 5.7 + j) * s, 6, 6); } }
  g.strokeStyle = joint; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); } }); }
// pupitre con su silla (el alumno mira a −x): tablero a 0,74 m; asiento a 0,42 m
function pupitre(M) { const g = new THREE.Group();
  boxAt(g, 0.5, 0.03, 0.72, M.desk, 0, 0.725, 0); boxAt(g, 0.44, 0.1, 0.62, M.leg, 0, 0.65, 0);
  for (const [x, z] of [[-0.21, -0.32], [-0.21, 0.32], [0.21, -0.32], [0.21, 0.32]]) boxAt(g, 0.03, 0.71, 0.03, M.leg, x, 0.355, z);
  const c = new THREE.Group(); c.position.x = 0.5; g.add(c); boxAt(c, 0.4, 0.03, 0.42, M.seat, 0, 0.405, 0); boxAt(c, 0.03, 0.34, 0.4, M.seat, 0.2, 0.7, 0);
  for (const [x, z] of [[-0.17, -0.18], [-0.17, 0.18], [0.19, -0.18], [0.19, 0.18]]) boxAt(c, 0.025, x > 0 ? 0.86 : 0.4, 0.025, M.leg, x, x > 0 ? 0.43 : 0.2, z);
  return g; }
// silla de madera de la cafetería (mira a +x en local)
function cafeChair(M) { const c = new THREE.Group(); boxAt(c, 0.4, 0.035, 0.4, M.wood2, 0, 0.405, 0); boxAt(c, 0.03, 0.4, 0.38, M.wood2, -0.19, 0.7, 0);
  for (const [x, z] of [[-0.17, -0.17], [-0.17, 0.17], [0.17, -0.17], [0.17, 0.17]]) boxAt(c, 0.03, x < 0 ? 0.9 : 0.4, 0.03, M.wood2, x, x < 0 ? 0.45 : 0.2, z); return c; }
function cafeTable(M) { const g = new THREE.Group(); const top = cyl(0.42, 0.42, 0.035, M.top, 40); top.position.y = 0.722; g.add(top); const p = cyl(0.035, 0.035, 0.7, M.dark, 12); p.position.y = 0.35; g.add(p); const b = cyl(0.24, 0.26, 0.03, M.dark, 24); b.position.y = 0.015; g.add(b); return g; }
function plant(M, s = 1) { const g = new THREE.Group(); const pot = cyl(0.2, 0.15, 0.36, M.pot, 20); pot.position.y = 0.18; g.add(pot); for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), M.leaf); const a = i * 2.4; l.scale.set(0.55, 1.5, 0.3); l.position.set(Math.cos(a) * 0.14, 0.62 + hash(i) * 0.3, Math.sin(a) * 0.14); l.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5); l.castShadow = true; g.add(l); } g.scale.setScalar(s); return g; }
function backpack(col) { const m = stdM(col, 0.75), g = new THREE.Group(); const b = rbox(0.18, 0.25, 0.09, m, 0.04); g.add(b); const p = rbox(0.13, 0.1, 0.03, stdM(new THREE.Color(col).multiplyScalar(0.75).getHex(), 0.75), 0.015); p.position.set(0, -0.05, -0.055); g.add(p);
  return g; }
function buildSet() {
  const g = new THREE.Group(), U = SETU = {};
  const wood = repTex(woodTex('#b98a5a', '#8a5f36', '#d6ab7a', 2), 1, 1), wood2 = repTex(woodTex('#8a5a34', '#5e3a1e', '#a8743f', 5), 1, 1);
  const M = { desk: stdM(0xd9b98a, 0.55, { map: wood }), leg: stdM(0x3f6f5e, 0.5, { metalness: 0.3 }), seat: stdM(0x4f8f7a, 0.6), wood2: stdM(0xffffff, 0.6, { map: wood2 }), top: stdM(0xf1ead9, 0.4), dark: stdM(0x26282e, 0.5, { metalness: 0.4 }),
    pot: stdM(0xc9643a, 0.8), leaf: stdM(0x3f8a4b, 0.7), white: stdM(0xf4f1ea, 0.85), frame: stdM(0x6b4a2e, 0.6), cork: stdM(0xc79a62, 0.95) };
  U.M = M;
  // ---- suelos (hasta delante de la cámara)
  const fl = (x0, x1, tex, rx, ry, col = 0xffffff, r = 0.6) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 14), stdM(col, r, { map: repTex(tex, rx, ry) })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0, ZB + 7); m.receiveShadow = true; g.add(m); return m; };
  fl(-16, -3, tileTex('#d9d2c4', '#d3ccbd', 4), 6.5, 7); fl(-3, 2, tileTex('#e9dcc6', '#c98f6a', 4), 2.5, 7); fl(2, 17, woodTex('#c79a66', '#9a6f42', '#dcb382', 7), 5, 5, 0xffffff, 0.5);
  // ---- pared del fondo (tres colores) con su zócalo, y paredes laterales
  const wallB = (x0, x1, up, low, hl = 1.05) => { boxAt(g, x1 - x0, WH - hl, 0.16, stdM(up, 0.9), (x0 + x1) / 2, hl + (WH - hl) / 2, ZB - 0.08); boxAt(g, x1 - x0, hl, 0.18, stdM(low, 0.7), (x0 + x1) / 2, hl / 2, ZB - 0.07); boxAt(g, x1 - x0, 0.05, 0.2, M.white, (x0 + x1) / 2, hl, ZB - 0.06); };
  wallB(-13, -3, 0xf2ead8, 0x7fae9b); wallB(-3, 2, 0xf6f1e6, 0x5b86b8); wallB(2, 14, 0x2f5d50, 0x24463d, 0.0001);
  boxAt(g, 0.16, WH, 6.6, stdM(0xf2ead8, 0.9), -13.08, WH / 2, ZB + 3.3); boxAt(g, 0.16, WH, 6.6, stdM(0xe9dcc4, 0.9), 14.08, WH / 2, ZB + 3.3);
  // pared aula | pasillo (x = −3) con el hueco de la puerta en z ∈ [0,4, 1,6]; pared pasillo | cafetería (x = 2), abierta por delante
  const wA = stdM(0xf2ead8, 0.9); boxAt(g, 0.14, WH, 3.9, wA, -3, WH / 2, ZB + 1.95); boxAt(g, 0.14, WH, 1.2, wA, -3, WH / 2, 2.2); boxAt(g, 0.14, WH - 2.1, 1.2, wA, -3, 2.1 + (WH - 2.1) / 2, 1.0);
  for (const z of [0.38, 1.62]) boxAt(g, 0.2, 2.12, 0.06, M.frame, -3, 1.06, z); boxAt(g, 0.2, 0.06, 1.3, M.frame, -3, 2.13, 1.0);
  { const d = boxAt(g, 0.05, 2.05, 1.15, stdM(0x8a5a34, 0.55, { map: wood2 }), -2.88, 1.03, -0.22); d.rotation.y = 0.06; const k = cyl(0.025, 0.025, 0.1, metal(0xd9c27a, 0.3), 10); k.rotation.z = Math.PI / 2; k.position.set(-2.82, 1.0, -0.7); g.add(k); }
  boxAt(g, 0.14, WH, 3.1, stdM(0xf6f1e6, 0.9), 2, WH / 2, ZB + 1.55);
  // techo (no da sombra: la luz entra como en una maqueta) con pantallas de luz
  { const c = new THREE.Mesh(new THREE.PlaneGeometry(27.3, 13), new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: 0.95, emissive: 0xf7f3ea, emissiveIntensity: 0.32 })); c.rotation.x = Math.PI / 2; c.position.set(0.5, WH, ZB + 6.5); g.add(c);
    for (const x of [-11, -8, -5, -0.5, 4.5, 8, 11.5]) for (const z of [-1.8, 1.2, 4.2]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(x > 2 ? 0xffe2b8 : 0xffffff).multiplyScalar(1.5), toneMapped: false })); p.rotation.x = Math.PI / 2; p.position.set(x, WH - 0.01, z); g.add(p); } }
  // ================= AULA
  // pizarra (pared izquierda) con una gráfica de oferta y demanda a tiza
  { const t = canvasTex(1024, 360, (c, w, h) => { c.fillStyle = '#2f5a48'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(120, 40); c.lineTo(120, 300); c.lineTo(460, 300); c.stroke(); c.beginPath(); c.moveTo(150, 80); c.quadraticCurveTo(250, 250, 430, 270); c.stroke(); c.strokeStyle = 'rgba(255,230,140,.9)'; c.beginPath(); c.moveTo(150, 280); c.quadraticCurveTo(300, 230, 430, 70); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '700 34px Inter, sans-serif'; c.fillText('P', 84, 60); c.fillText('Q', 450, 340); c.fillText('O', 440, 60); c.fillText('D', 440, 258); c.font = '700 46px Inter, sans-serif'; c.fillText('Tema 7', 560, 90);
      c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(560, 140 + i * 38); c.lineTo(560 + 260 + hash(i) * 150, 140 + i * 38); c.stroke(); } });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.45), stdM(0xffffff, 0.85, { map: t })); b.rotation.y = Math.PI / 2; b.position.set(-12.985, 1.72, -0.6); g.add(b); const fr = boxAt(g, 0.05, 1.57, 4.32, M.frame, -12.99, 1.72, -0.6); fr.position.x = -13.0; boxAt(g, 0.1, 0.04, 4.2, M.frame, -12.93, 0.97, -0.6); }
  boxAt(g, 0.7, 0.05, 1.5, M.desk, -11.7, 0.76, -0.6); boxAt(g, 0.62, 0.74, 1.4, stdM(0xa9805a, 0.6, { map: wood }), -11.7, 0.37, -0.6);
  // ventanas y reloj (pared del fondo)
  for (const x of [-10.6, -8.5, -4.6]) { boxAt(g, 1.5, 1.4, 0.06, M.white, x, 1.95, ZB + 0.02); const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 1.24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfe0ff).multiplyScalar(1.15), toneMapped: false })); gl.position.set(x, 1.95, ZB + 0.055); g.add(gl); boxAt(g, 0.04, 1.26, 0.03, M.white, x, 1.95, ZB + 0.06); boxAt(g, 1.36, 0.04, 0.03, M.white, x, 1.95, ZB + 0.06); }
  { const c = new THREE.Group(); c.position.copy(CLOCK); g.add(c); const rim = cyl(0.25, 0.25, 0.05, M.dark, 40); rim.rotation.x = Math.PI / 2; c.add(rim);
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.225, 40), stdM(0xffffff, 0.5, { map: canvasTex(256, 256, (q, w) => { q.fillStyle = '#fbfaf5'; q.fillRect(0, 0, w, w); q.translate(w / 2, w / 2); for (let i = 0; i < 60; i++) { q.save(); q.rotate(i / 60 * 6.2832); q.fillStyle = '#22252b'; q.fillRect(-(i % 5 ? 1 : 3), -118, i % 5 ? 2 : 6, i % 5 ? 8 : 20); q.restore(); } }) })); f.position.z = 0.027; c.add(f);
    const hand = (l, w, col) => { const p = new THREE.Group(); const h = new THREE.Mesh(new THREE.BoxGeometry(w, l, 0.006), stdM(col, 0.5)); h.position.y = l / 2 - 0.02; p.add(h); p.position.z = 0.034; c.add(p); return p; };
    U.hH = hand(0.12, 0.018, 0x22252b); U.hM = hand(0.18, 0.012, 0x22252b); U.hS = hand(0.2, 0.005, 0xd23a2a); const cap = cyl(0.014, 0.014, 0.02, M.dark, 12); cap.rotation.x = Math.PI / 2; cap.position.z = 0.04; c.add(cap); }
  // pupitres: 4 columnas × 3 filas (el del protagonista: DESK)
  U.desks = []; for (const x of [DESK.x, -6.9, -8.6, -10.3]) for (const z of [1.2, -0.5, -2.2]) { const p = pupitre(M); p.position.set(x, 0, z); g.add(p); U.desks.push(p); }
  // corcho con papeles
  const cork = (x, y, w, h) => { boxAt(g, w + 0.08, h + 0.08, 0.03, M.frame, x, y, ZB + 0.015); boxAt(g, w, h, 0.03, M.cork, x, y, ZB + 0.025); for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.27), stdM([0xffffff, 0xffe9a8, 0xcfe8ff, 0xffd0d0, 0xd8f5d0][i % 5], 0.9)); p.position.set(x - w / 2 + 0.16 + (i % 5) * (w - 0.3) / 4, y + (i < 5 ? 0.17 : -0.17) * (h > 0.7 ? 1 : 0), ZB + 0.045); p.rotation.z = (hash(i * 3.3) - 0.5) * 0.25; g.add(p); } };
  cork(-6.6, 1.45, 1.3, 0.8);
  // ================= PASILLO
  cork(-1.4, 1.75, 1.7, 0.9);
  { const s = plateText(1.35, 0.34, [['CAFETERÍA  →', 0.56, 0.53]], { fg: '#ffffff', bg: '#2f5d50', weight: 900, px: 768 }); s.position.set(0.95, 2.35, ZB + 0.03); g.add(s); boxAt(g, 1.41, 0.4, 0.02, M.white, 0.95, 2.35, ZB + 0.012); }
  { const b = new THREE.Group(); boxAt(b, 1.5, 0.06, 0.42, M.wood2, 0, 0.45, 0); for (const x of [-0.65, 0.65]) boxAt(b, 0.05, 0.45, 0.4, M.dark, x, 0.225, 0); b.position.set(-1.4, 0, ZB + 0.35); g.add(b); }
  { const p = plant(M, 1.25); p.position.set(1.35, 0, ZB + 0.5); g.add(p); }
  // ================= CAFETERÍA
  // barra: cuerpo de listones y tablero de madera
  { const L = BAR.x1 - BAR.x0, cx = (BAR.x0 + BAR.x1) / 2, sl = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#e7dcc8'; c.fillRect(0, 0, w, h); for (let i = 0; i < 32; i++) { c.fillStyle = i % 2 ? '#d9cbb2' : '#efe6d4'; c.fillRect(i * 16, 0, 14, h); } });
    boxAt(g, L, BAR.h - 0.05, 0.62, stdM(0xffffff, 0.7, { map: repTex(sl, 3, 1) }), cx, (BAR.h - 0.05) / 2, BAR.z); boxAt(g, L + 0.12, 0.05, 0.8, stdM(0xc9b5a2, 0.45, { map: repTex(woodTex('#8a5a34', '#5e3a1e', '#a8743f', 9), 4, 0.6) }), cx, BAR.h - 0.025, BAR.z + 0.02); boxAt(g, L, 0.1, 0.6, M.dark, cx, 0.05, BAR.z + 0.03); }
  // estantes con tazas y botellas, pizarra del desayuno (sin precios) y lámparas
  for (const y of [1.55, 2.0]) { boxAt(g, 2.6, 0.035, 0.24, M.wood2, 8.0, y, ZB + 0.13); for (let i = 0; i < 11; i++) { const k = hash(i * 3.7 + y); const o = y < 1.8 ? lathe([[0, 0], [0.032, 0], [0.042, 0.075], [0.038, 0.075], [0.03, 0.01], [0, 0.008]], 16, stdM(0xfbfaf6, 0.3)) : cyl(0.03, 0.035, 0.2 + k * 0.08, stdM([0x7a9a3a, 0xc9742a, 0x8a2a2a, 0xd9c27a][i % 4], 0.25), 12); o.position.set(6.85 + i * 0.23, y + 0.018 + (y < 1.8 ? 0 : 0.1 + k * 0.04), ZB + 0.13); g.add(o); } }
  { const t = canvasTex(768, 512, (c, w, h) => { c.fillStyle = '#23262b'; c.fillRect(0, 0, w, h); c.fillStyle = '#f6efe0'; c.textAlign = 'center'; c.font = '900 92px Inter, sans-serif'; c.fillText('DESAYUNOS', w / 2, 120); c.fillRect(160, 150, w - 320, 5);
      c.font = '700 54px Inter, sans-serif'; c.fillStyle = '#ffd98a'; c.fillText('Café con leche', w / 2, 240); c.fillStyle = '#f6efe0'; c.fillText('+', w / 2, 305); c.fillStyle = '#ff9d7a'; c.fillText('Media tostada', w / 2, 375); c.font = '500 40px Inter, sans-serif'; c.fillStyle = '#f6efe0'; c.fillText('con tomate y aceite', w / 2, 435); });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), stdM(0xffffff, 0.9, { map: t })); b.position.set(4.6, 2.0, ZB + 0.04); g.add(b); boxAt(g, 1.58, 1.08, 0.03, M.frame, 4.6, 2.0, ZB + 0.015); }
  { const s = plateText(2.3, 0.42, [['CAFETERÍA', 0.8, 0.53]], { fg: '#f6efe0', weight: 900, px: 768 }); s.position.set(11.6, 2.45, ZB + 0.03); g.add(s); }
  U.lamps = []; boxAt(g, 5.2, 0.03, 0.03, M.dark, 6.3, 2.95, -2.15); for (const x of [3.75, 8.85]) boxAt(g, 0.03, 0.03, 1.35, M.dark, x, 2.95, -2.82);
  for (const x of [4.4, 5.65, 6.9, 8.15]) { boxAt(g, 0.008, 0.75, 0.008, M.dark, x, 2.57, -2.15); const sh = lathe([[0.02, 0.16], [0.05, 0.15], [0.16, 0.0], [0.15, 0.0], [0.045, 0.14], [0.02, 0.14]], 28, stdM(0x1f4a40, 0.5, { side: THREE.DoubleSide })); sh.position.set(x, 2.06, -2.15); g.add(sh);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(2.2), toneMapped: false })); bl.position.set(x, 2.08, -2.15); g.add(bl); U.lamps.push(bl); }
  { const l = new THREE.PointLight(0xffd2a0, 5, 5, 1.6); l.position.set(6.4, 1.95, -1.75); g.add(l); const l2 = new THREE.PointLight(0xffd2a0, 3, 5, 1.6); l2.position.set(4.8, 1.95, -1.75); g.add(l2); }
  // naranjas en un frutero y vasos apilados
  { const b = lathe([[0, 0], [0.07, 0], [0.16, 0.08], [0.15, 0.08], [0.07, 0.015], [0, 0.012]], 28, stdM(0xe9e2d2, 0.5)); b.position.set(8.55, BAR.h, -2.2); g.add(b); const o = stdM(0xf08a1c, 0.55); for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), o); const a = i * 1.05; s.position.set(8.55 + (i < 6 ? Math.cos(a) * 0.075 : 0), BAR.h + (i < 6 ? 0.085 : 0.15), -2.2 + (i < 6 ? Math.sin(a) * 0.075 : 0)); s.castShadow = true; g.add(s); } }
  // mesas: la de los protagonistas (TABLE) y otras tres
  for (const [x, z] of [[TABLE.x, TABLE.z], [11.3, 1.9], [12.5, -0.9], [10.6, -1.9]]) { const t = cafeTable(M); t.position.set(x, 0, z); g.add(t); for (const sd of [-1, 1]) { const c = cafeChair(M); c.position.set(x + sd * 0.62, 0, z); c.rotation.y = sd < 0 ? 0 : Math.PI; g.add(c); } }
  { const p = plant(M, 1.5); p.position.set(13.3, 0, ZB + 0.6); g.add(p); const p2 = plant(M, 1.1); p2.position.set(2.6, 0, ZB + 0.5); g.add(p2); }
  return g;
}
// lo que se mueve del decorado: el reloj (casi en punto: da la hora cuando suena el timbre)
function setAt(t, o = {}) { const U = SETU, bell = o.bell ?? 2.9, s = 60 - bell + t, m = 59 + s / 60;
  U.hS.rotation.z = -Math.floor(s) / 60 * Math.PI * 2 - (s % 1 < 0.12 ? 0 : 0); U.hM.rotation.z = -(t < bell ? 59 : 60) / 60 * Math.PI * 2 - (t >= bell ? 0 : 0); U.hH.rotation.z = -(10 + (t < bell ? 59 : 60) / 60) / 12 * Math.PI * 2; }
