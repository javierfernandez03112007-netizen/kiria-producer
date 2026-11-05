// ---------------------------------------------------------------- piezas: la mesa con el portátil del ingeniero, los otros dos portátiles, la cartera caliente (cámara
// acorazada de cristal llena de monedas) conectada a internet, los cables, el programa espía, las diez cadenas de bloques, las torres del récord y el hielo
let FONT3 = null;
const DESK = { y: 0.74 };
const LAP = { w: 0.66, d: 0.44, sw: 0.6, sh: 0.38, th: 0.018 };       // portátil: base w × d; pantalla sw × sh
const SCRW = 960, SCRH = 608;                                         // lienzo de la pantalla principal
const MAIN = v3(0, DESK.y, 0.55);                                     // portátil del ingeniero (centro de la base)
const SIDE = [v3(-0.6, DESK.y, 0.2), v3(0.6, DESK.y, 0.2)];          // los otros dos ingenieros (en la misma mesa, detrás)
const VAULT = { x: 0, z: -1.5, w: 1.3, h: 1.2, d: 1.0, base: 0.12 };
const NCOIN = 1400, NCH = 10, NBLK = 16, NFZ = 160;
const FROZEN = [1, 3, 6, 8];                                          // cadenas congeladas (≈ 2.850 de 6.300 M$: unas 4 de 10)
const NET = v3(0, 2.55, VAULT.z);                                     // «internet»: el nodo encima de la cartera

function keyTex() { return canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#16181c'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) { g.fillStyle = '#2b2f36'; rr(g, 14 + c * 35, 12 + r * 36, 30, 30, 5); g.fill(); }
  g.fillStyle = '#23262c'; rr(g, 160, 200, 190, 44, 8); g.fill(); }); }
function laptop(scale = 1) {
  const g = new THREE.Group(), bodyM = new THREE.MeshPhysicalMaterial({ color: 0x2b2e35, roughness: 0.32, metalness: 0.75, clearcoat: 0.6 });
  const base = rbox(LAP.w, LAP.d, LAP.th, bodyM, 0.02); base.rotation.x = -Math.PI / 2; base.position.y = LAP.th / 2; g.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(LAP.w * 0.86, LAP.d * 0.5), new THREE.MeshStandardMaterial({ map: keyTex(), roughness: 0.7 }));
  kb.rotation.x = -Math.PI / 2; kb.position.set(0, LAP.th + 0.0008, -0.03); g.add(kb);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshStandardMaterial({ color: 0x3a3e46, roughness: 0.4 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, LAP.th + 0.0008, 0.15); g.add(pad);
  const hinge = new THREE.Group(); hinge.position.set(0, LAP.th, -LAP.d / 2 + 0.01); g.add(hinge);
  const LH = LAP.sh + 0.05, lid = rbox(LAP.w, LH, 0.012, bodyM, 0.02); lid.position.set(0, LH / 2, 0); hinge.add(lid);
  const T = canvasTex(Math.round(SCRW * scale), Math.round(SCRH * scale));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(LAP.sw, LAP.sh), new THREE.MeshBasicMaterial({ map: T, toneMapped: false, color: new THREE.Color(1.08, 1.08, 1.08) }));
  scr.position.set(0, LH / 2 + 0.006, 0.0066); hinge.add(scr);
  hinge.rotation.x = -0.3;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(scale); g.userData = { T, scr, hinge }; return g;
}
function desk(w, d) {
  const g = new THREE.Group(), top = rbox(w, d, 0.05, new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.45, clearcoat: 0.4 }), 0.02);
  top.rotation.x = -Math.PI / 2; top.position.y = DESK.y - 0.025; g.add(top);
  for (const sx of [-1, 1]) { const p = rbox(0.04, DESK.y - 0.05, d * 0.9, metal(0x5d636d, 0.35), 0.01); p.position.set(sx * (w / 2 - 0.08), (DESK.y - 0.05) / 2, 0); g.add(p); }
  return g;
}

// ---------------------------------------------------------------- monedas (de oro, con el símbolo grabado) y la cartera
let COIN_GEO = null, COIN_MATS = null;
function coinParts() {
  if (COIN_GEO) return;
  COIN_GEO = new THREE.CylinderGeometry(0.055, 0.055, 0.01, 30);
  const face = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w * 0.4, h * 0.35, 10, w / 2, h / 2, w * 0.6); gr.addColorStop(0, '#fff1b8'); gr.addColorStop(0.6, '#e8b23a'); gr.addColorStop(1, '#b8801c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,70,10,.75)'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, 7); g.stroke();
    g.fillStyle = 'rgba(120,70,10,.85)'; g.font = `900 ${h * 0.46}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₿', w / 2, h * 0.53); });
  const side = new THREE.MeshPhysicalMaterial({ color: 0xffc85a, metalness: 1, roughness: 0.28 });
  const top = new THREE.MeshPhysicalMaterial({ map: face, metalness: 0.85, roughness: 0.3 });
  COIN_MATS = [side, top, top];
}
function buildVault() {
  const g = new THREE.Group(); g.position.set(VAULT.x, 0, VAULT.z);
  const base = rbox(VAULT.w + 0.14, VAULT.base, VAULT.d + 0.14, metal(0x2c3036, 0.35), 0.03); base.rotation.x = -Math.PI / 2; base.position.y = VAULT.base / 2; g.add(base);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(VAULT.w, VAULT.h, VAULT.d), new THREE.MeshPhysicalMaterial({ color: 0xdfe8f2, transparent: true, opacity: 0.1, roughness: 0.06, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.y = VAULT.base + VAULT.h / 2; glass.renderOrder = 3; edges(glass, 0xe6ecf2, 1.8, 28, 0.85); g.add(glass);
  const top = rbox(VAULT.w + 0.06, VAULT.d + 0.06, 0.05, metal(0x3a3f47, 0.3), 0.02); top.rotation.x = -Math.PI / 2; top.position.y = VAULT.base + VAULT.h + 0.025; g.add(top);
  const dial = cyl(0.11, 0.11, 0.04, metal(0x9aa0a8, 0.25), 40); dial.rotation.x = Math.PI / 2; dial.position.set(0.42, VAULT.base + VAULT.h * 0.55, VAULT.d / 2 + 0.03); g.add(dial);
  const led = sph(0.025, new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0x35ff8a, emissiveIntensity: 3 })); led.position.set(0.42, VAULT.base + VAULT.h * 0.55 + 0.17, VAULT.d / 2 + 0.03); g.add(led);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(VAULT.w * 1.6, VAULT.d * 1.6), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (c) => { const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,170,60,.85)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = VAULT.base + 0.004; g.add(glow);
  const plate = textPlane(0.9, 0.08, (c, w, h) => { c.fillStyle = '#e8edf3'; c.font = `700 ${h * 0.62}px SpaceMono`; c.letterSpacing = '6px'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CARTERA CALIENTE', w / 2, h / 2); }, 640);
  plate.position.set(0, VAULT.base / 2, VAULT.d / 2 + 0.072); g.add(plate);
  g.traverse(o => { if (o.isMesh && o !== glass && o !== glow && o !== plate) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g); S.vault = { g, led, glow, glass };
}

// ---------------------------------------------------------------- cables (con un brillo que corre por dentro) y el nodo de internet
function flowTex() { const T = canvasTex(256, 8, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, 'rgba(255,255,255,.15)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  T.wrapS = T.wrapT = THREE.RepeatWrapping; return T; }
function cable(pts, r = 0.012) {
  const curve = new THREE.CatmullRomCurve3(pts), T = flowTex(); T.repeat.set(Math.max(1, Math.round(curve.getLength() * 1.6)), 1);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, r, 8), new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.5, emissive: 0xffffff, emissiveMap: T, emissiveIntensity: 1.2 }));
  m.castShadow = true; scene.add(m); return { m, curve, T };
}
function buildNet() {
  const g = new THREE.Group(); g.position.copy(NET);
  const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 2), new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.6, transparent: true, opacity: 0.85 }));
  edges(ico, 0xeef4ff, 1.4, 1, 0.9); g.add(ico);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.006, 8, 120), basicGlow(0xffffff, 1.4)); ring.rotation.x = Math.PI / 2.3; g.add(ring);
  scene.add(g); S.net = { g, ico, ring };
}

// ---------------------------------------------------------------- el programa espía (un bicho negro de ojos rojos)
function buildBug() {
  const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: 0.2, metalness: 0.4, clearcoat: 1 });
  const body = sph(0.034, m, 24, 16); body.scale.set(1, 0.62, 1.35); g.add(body);
  const head = sph(0.019, m, 18, 12); head.position.set(0, 0.004, 0.05); g.add(head);
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x150000, emissive: 0xff2a2a, emissiveIntensity: 5 });
  for (const sx of [-1, 1]) { const e = sph(0.0055, eyeM, 10, 8); e.position.set(sx * 0.009, 0.012, 0.064); g.add(e); }
  const legM = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.4 });
  const legs = [];
  for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) { const piv = new THREE.Group(); piv.position.set(sx * 0.022, 0, k * 0.022); g.add(piv);
    const L = cyl(0.0028, 0.002, 0.06, legM, 6); L.rotation.z = sx * 1.1; L.position.set(sx * 0.024, -0.008, 0); piv.add(L); legs.push({ piv, sx, k }); }
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,40,40,.7)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  gl.rotation.x = -Math.PI / 2; gl.position.y = -0.02; g.add(gl);
  g.traverse(o => { if (o.isMesh && o !== gl) o.castShadow = true; });
  g.userData = { legs }; scene.add(g); return g;
}

// ---------------------------------------------------------------- las diez cadenas de bloques (caras oscuras con aristas blancas)
function chainCurve(c) {
  const a = lerp(-1.15, 1.15, c / (NCH - 1)), dx = Math.sin(a), dz = -Math.cos(a);
  const s = v3(VAULT.x + dx * 0.5, VAULT.base + VAULT.h * 0.8, VAULT.z + dz * 0.4), pts = [];
  for (let k = 0; k <= 8; k++) { const u = k / 8, r = 0.15 + 9 * u; pts.push(v3(s.x + dx * r, s.y + 1.3 * u + 0.5 * Math.sin(u * Math.PI), s.z + dz * r)); }
  return new THREE.CatmullRomCurve3(pts);
}
function buildChains() {
  S.chains = [];
  for (let c = 0; c < NCH; c++) {
    const curve = chainCurve(c), mat = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.6, metalness: 0.1, emissive: 0x000000 });
    const blocks = [];
    for (let k = 0; k < NBLK; k++) { const u = (k + 0.5) / NBLK, p = curve.getPointAt(u), b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), mat);
      b.castShadow = true; edges(b, 0xe6ecf2, 1.3, 28, 0.9); b.position.copy(p); b.lookAt(curve.getPointAt(Math.min(1, u + 0.01))); scene.add(b); blocks.push({ b, u }); }
    const line = drawLine(curve.getSpacedPoints(80), 0xe6ecf2, 1.6, 0.6); scene.add(line);
    S.chains.push({ curve, mat, blocks, line });
  }
  S.ice = sparks(scene, 220, 0xcfeeff, 0.05);
}

// ---------------------------------------------------------------- las torres del récord (monedas apiladas) y el reloj de los 20 minutos
function buildTowers() {
  coinParts();
  const mk = (n, x) => { const im = new THREE.InstancedMesh(COIN_GEO, COIN_MATS, n); im.castShadow = true; im.frustumCulled = false; scene.add(im); return { im, n, x }; };
  S.towers = [mk(60, -0.6), mk(252, 0.6)];      // 1.500 M$ (Bybit, 2025) frente a 6.300 M$ (Binance, 2026): 4,2 veces
}

// ---------------------------------------------------------------- todo junto
function buildCripto() {
  coinParts();
  const d = desk(1.9, 0.95); d.position.set(0, 0, 0.5); scene.add(d);
  S.lap = laptop(1); S.lap.position.copy(MAIN); scene.add(S.lap);
  S.side = SIDE.map(p => { const l = laptop(0.72); l.position.set(p.x, DESK.y, p.z); l.rotation.y = -Math.sign(p.x) * 0.35; scene.add(l); return l; });
  buildVault(); buildNet();
  // cables: de cada portátil al suelo y a la cartera; de la cartera a internet
  const vF = v3(VAULT.x, 0.03, VAULT.z + VAULT.d / 2 + 0.1);
  S.cMain = cable([v3(0.12, DESK.y + 0.012, MAIN.z - LAP.d / 2 - 0.02), v3(0.1, DESK.y + 0.012, 0.12), v3(0.05, DESK.y + 0.01, 0.06), v3(0, 0.4, 0.0), v3(0, 0.03, -0.25), v3(0.05, 0.03, -0.6), vF]);
  S.cSide = SIDE.map((p, i) => { const sx = Math.sign(p.x); return cable([v3(p.x + sx * 0.05, DESK.y + 0.012, p.z - 0.16), v3(sx * 0.82, DESK.y + 0.012, 0.06), v3(sx * 0.98, 0.4, -0.02), v3(sx * 1.02, 0.03, -0.3),
    v3(sx * 1.02, 0.03, VAULT.z + 0.25), v3(sx * (VAULT.w / 2 + 0.12), 0.03, VAULT.z)]); });
  S.cNet = cable([v3(VAULT.x, VAULT.base + VAULT.h + 0.05, VAULT.z), v3(VAULT.x + 0.04, 1.85, VAULT.z), v3(NET.x, NET.y - 0.33, NET.z)], 0.014);
  // monedas: las de la cartera (y las que se escapan) y las congeladas
  S.coins = new THREE.InstancedMesh(COIN_GEO, COIN_MATS, NCOIN); S.coins.castShadow = true; S.coins.frustumCulled = false; scene.add(S.coins);
  S.fcoins = new THREE.InstancedMesh(COIN_GEO, COIN_MATS, NFZ); S.fcoins.frustumCulled = false; scene.add(S.fcoins);
  const ice = new THREE.Color(0xbfe6ff); for (let i = 0; i < NFZ; i++) S.fcoins.setColorAt(i, ice); S.fcoins.instanceColor.needsUpdate = true;
  // el montón dentro de la cartera: más alto en el centro; las de arriba son las primeras en salir
  const pile = [];
  for (let i = 0; i < NCOIN; i++) { const x = (hash(i * 1.31) - 0.5) * (VAULT.w - 0.16), z = (hash(i * 2.17) - 0.5) * (VAULT.d - 0.14), r = Math.hypot(x / (VAULT.w / 2), z / (VAULT.d / 2));
    const hmax = 0.12 + 0.62 * Math.max(0, 1 - r * r); pile.push({ p: v3(VAULT.x + x, VAULT.base + 0.01 + hmax * Math.pow(hash(i * 3.71), 0.6), VAULT.z + z), rx: (hash(i * 4.3) - 0.5) * 0.9, rz: (hash(i * 5.9) - 0.5) * 0.9, ry: hash(i * 6.1) * 6.28 }); }
  S.pile = pile; S.outOrder = pile.map((q, i) => i).sort((a, b) => pile[b].p.y - pile[a].p.y); S.outRank = new Array(NCOIN); S.outOrder.forEach((i, k) => (S.outRank[i] = k));
  S.bug = buildBug(); S.bugs = [buildBug(), buildBug()];
  buildChains(); buildTowers();
}
