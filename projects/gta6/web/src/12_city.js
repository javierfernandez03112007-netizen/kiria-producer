// ---------------------------------------------------------------- «GTA 6 ocupa 212 gigas»: un móvil tumbado en una mesa del que brota, sobre
// una columna de cristal (los datos), una ciudad tropical en miniatura al atardecer. NADA del juego: ni logos, ni personajes, ni lugares
// reales; las consolas solo con su nombre en texto.
const PH = { w: 0.78, l: 1.62, t: 0.08 };            // el móvil (x ancho, z largo, y grosor); la pantalla queda en y = PH.t
const PIL = { w: 0.36, d: 0.84, h: 2.4 };              // la columna de datos: 212 GB = 2,4 de alto
const H128 = PIL.h * 128 / 212, H99 = PIL.h * 99 / 212;
const CW = 3.0, CH = 0.07;                            // la ciudad: tablero de 3 × 3 y su canto
const CTOP = PH.t + PIL.h + CH;                       // altura del suelo de la ciudad cuando ha brotado del todo
const PAST = ['#f59ac0', '#8fe0c9', '#c4b2ff', '#ffc89a', '#94ccff', '#fff0c2', '#ffa99c', '#b6f0a0'];
const CLIP = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PH.t + 0.0005);   // lo de la ciudad solo se ve por encima de la pantalla
const TILE = 0.24;                                    // una tesela de fachada: 4 vanos × 4 plantas

// ---------------------------------------------------------------- texturas
function facadeTex(base, trim, mode = 0, seed = 1) {      // mode 0: fachada · 1: ventanas encendidas (emisiva)
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = mode ? '#000' : base; g.fillRect(0, 0, w, h);
    if (!mode) for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.015 + hash(i * 3.7 + seed) * 0.035})`; g.fillRect(hash(i * 1.3 + seed) * w, hash(i * 2.9 + seed) * h, 2, 2); }
    for (let fy = 0; fy < 4; fy++) for (let fx = 0; fx < 4; fx++) {
      const x = fx * 128, y = fy * 128, lit = hash(fx * 7.1 + fy * 3.3 + seed * 1.7) > 0.42;
      if (mode) { if (lit) { g.fillStyle = hash(fx + fy * 5 + seed) > 0.5 ? '#ffd79a' : '#ffe9c4'; g.fillRect(x + 30, y + 34, 68, 56); } continue; }
      g.fillStyle = trim; g.fillRect(x, y + 114, 128, 14); g.fillRect(x + 26, y + 30, 76, 64);
      const gr = g.createLinearGradient(0, y + 34, 0, y + 90); gr.addColorStop(0, '#5d86a6'); gr.addColorStop(1, '#22344a'); g.fillStyle = gr; g.fillRect(x + 30, y + 34, 68, 56);
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x + 30, y + 34, 68, 7); g.fillStyle = trim; g.fillRect(x + 62, y + 34, 4, 56);
    }
  });
}
function towerTex(mode = 0, seed = 1) {                  // torre de cristal: muro cortina
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = mode ? '#000' : '#2c5674'; g.fillRect(0, 0, w, h);
    for (let fy = 0; fy < 8; fy++) for (let fx = 0; fx < 8; fx++) {
      const x = fx * 64, y = fy * 64, lit = hash(fx * 3.1 + fy * 7.7 + seed) > 0.55;
      if (mode) { if (lit) { g.fillStyle = '#cfe8ff'; g.fillRect(x + 4, y + 6, 56, 50); } continue; }
      const gr = g.createLinearGradient(x, y, x + 64, y + 64); gr.addColorStop(0, '#7fb6d8'); gr.addColorStop(1, '#2a4d6b'); g.fillStyle = gr; g.fillRect(x + 4, y + 6, 56, 50);
    }
    if (!mode) { g.fillStyle = 'rgba(230,240,250,.55)'; for (let k = 0; k <= 8; k++) { g.fillRect(k * 64 - 2, 0, 4, h); g.fillRect(0, k * 64 - 3, w, 6); } }
  });
}
function groundTex() {                                   // el suelo de la ciudad: calles, aceras, plazas, arena y mar
  const P = 2048, X = x => (x + CW / 2) / CW * P;
  return canvasTex(P, P, (g, w, h) => {
    g.fillStyle = '#d8d0c2'; g.fillRect(0, 0, w, h);                                    // aceras
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(0,0,0,${0.02 + hash(i * 1.7) * 0.03})`; g.fillRect(hash(i * 2.3) * w, hash(i * 4.1) * h, 3, 3); }
    const road = (x0, z0, x1, z1) => { g.fillStyle = '#2a2c31'; g.fillRect(X(x0), X(z0), X(x1) - X(x0), X(z1) - X(z0)); };
    for (const x of AVES) road(x - 0.05, -1.5, x + 0.05, 1.5);
    for (const z of STREETS) road(-1.5, z - 0.05, 0.5, z + 0.05);
    g.strokeStyle = '#f2d36b'; g.lineWidth = 5; g.setLineDash([26, 22]);
    for (const x of AVES) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), h); g.stroke(); }
    for (const z of STREETS) { g.beginPath(); g.moveTo(0, X(z)); g.lineTo(X(0.38), X(z)); g.stroke(); }
    g.setLineDash([]); g.fillStyle = '#f4f4f4';                                          // pasos de cebra
    for (const x of AVES) for (const z of STREETS) for (let k = -3; k <= 3; k++) { g.fillRect(X(x - 0.045), X(z + 0.065) + k * 0, X(x + 0.045) - X(x - 0.045), 0); }
    for (const x of AVES) for (const z of STREETS) for (let k = 0; k < 6; k++) { g.fillRect(X(x - 0.045) + k * 11, X(z + 0.057), 6, 16); g.fillRect(X(x - 0.045) + k * 11, X(z - 0.073), 6, 16); }
    for (const [x0, z0, x1, z1] of PLAZAS) { g.fillStyle = '#7fbf6a'; g.fillRect(X(x0), X(z0), X(x1) - X(x0), X(z1) - X(z0)); g.fillStyle = 'rgba(40,90,40,.25)'; for (let i = 0; i < 300; i++) g.fillRect(X(x0) + hash(i * 3.3 + x0) * (X(x1) - X(x0)), X(z0) + hash(i * 5.1 + z0) * (X(z1) - X(z0)), 4, 4); }
    const sg = g.createLinearGradient(X(0.5), 0, X(0.8), 0); sg.addColorStop(0, '#f3dfb0'); sg.addColorStop(1, '#e9cf98'); g.fillStyle = sg; g.fillRect(X(0.5), 0, X(0.8) - X(0.5), h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(150,110,60,${0.05 + hash(i * 6.1) * 0.08})`; g.fillRect(X(0.5) + hash(i * 2.9) * (X(0.8) - X(0.5)), hash(i * 7.3) * h, 3, 3); }
    const og = g.createLinearGradient(X(0.78), 0, w, 0); og.addColorStop(0, '#5fd6d0'); og.addColorStop(0.12, '#2fa7c4'); og.addColorStop(1, '#16577e'); g.fillStyle = og; g.fillRect(X(0.78), 0, w - X(0.78), h);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 6; g.beginPath(); for (let z = 0; z <= h; z += 8) g.lineTo(X(0.79) + Math.sin(z * 0.03) * 5, z); g.stroke();
  });
}
function dataTex() {                                     // los datos que suben por la columna: bloquecitos de luz
  const t = canvasTex(256, 512, (g, w, h) => { g.clearRect(0, 0, w, h);
    for (let c = 0; c < 16; c++) { const x = c * 16 + 6; let y = hash(c * 7.7) * 40;
      while (y < h) { const L = 4 + hash(c * 13 + y) * 18, a = 0.25 + hash(c * 3 + y * 0.7) * 0.6; g.fillStyle = `rgba(${hash(c + y) > 0.85 ? '255,140,210' : '140,240,255'},${a})`; g.fillRect(x, y, 3, L); y += L + 6 + hash(c * 5 + y) * 46; } } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function brickTex(px = 1024) {                           // un ladrillo pintado (de cerca): pintura rosa con pinceladas, grietas y desconchones
  return canvasTex(px, px / 2, (g, w, h) => {
    g.fillStyle = '#f08fb4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const x = hash(i * 1.9) * w, y = hash(i * 3.7) * h; g.strokeStyle = `rgba(${hash(i) > 0.5 ? '255,200,220' : '180,70,110'},${0.06 + hash(i * 5.3) * 0.12})`; g.lineWidth = 1 + hash(i * 2.2) * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14 + hash(i * 4.4) * 40, y + (hash(i * 6.6) - 0.5) * 8); g.stroke(); }
    for (let i = 0; i < 9; i++) { const x = hash(i * 11.1) * w, y = hash(i * 13.3) * h, r = 5 + hash(i * 3.9) * 12; g.fillStyle = '#c98a72'; g.beginPath(); for (let k = 0; k <= 10; k++) { const a = k / 10 * 6.283, rr2 = r * (0.6 + hash(i * 19 + k) * 0.8); g.lineTo(x + Math.cos(a) * rr2 * 1.5, y + Math.sin(a) * rr2); } g.fill();
      g.fillStyle = 'rgba(90,40,30,.35)'; for (let k = 0; k < 30; k++) g.fillRect(x + (hash(i * 7 + k) - 0.5) * r * 2, y + (hash(i * 9 + k) - 0.5) * r * 1.4, 2, 2); }
    g.strokeStyle = 'rgba(90,30,50,.45)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { let x = hash(i * 21.7) * w, y = hash(i * 17.3) * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 12; k++) { x += (hash(i * 31 + k) - 0.3) * 30; y += (hash(i * 37 + k) - 0.5) * 24; g.lineTo(x, y); } g.stroke(); }
  });
}
function codeTex() {                                     // el cubito de código: texto verde que corre
  const t = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#04150b'; g.fillRect(0, 0, w, h); g.font = '600 15px DejaVuMono'; g.fillStyle = '#5dff9a';
    const tok = ['if', 'for', '(x)', '{', '}', 'ret', '0x3F', 'int', 'car', 'npc', 'map', '+=', '==', 'ped', 'go()', '1', '0'];
    for (let y = 18; y < h; y += 19) { let x = 6, s = ''; while (x < w - 20) { const k = tok[Math.floor(hash(x * 1.3 + y * 7.1) * tok.length)]; g.fillText(k, x, y); x += (k.length + 1) * 9.5; } } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function screenTex() {                                   // la pantalla del móvil: negra, con el reflejo y las grietas en otra capa
  return canvasTex(512, 1064, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1b2a44'); gr.addColorStop(0.55, '#0c1322'); gr.addColorStop(1, '#2a1a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const rg = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7); rg.addColorStop(0, 'rgba(120,240,255,.55)'); rg.addColorStop(1, 'rgba(120,240,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); });
}
function crackTex() {
  return canvasTex(512, 1064, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(235,245,255,.9)'; g.lineCap = 'round';
    const cx = w * 0.5, cy = h * 0.5;
    for (let i = 0; i < 26; i++) { let a = i / 26 * Math.PI * 2 + hash(i) * 0.3, x = cx + Math.cos(a) * 60, y = cy + Math.sin(a) * 120; g.lineWidth = 2.6 - hash(i * 3) * 1.4; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 14; k++) { a += (hash(i * 17 + k) - 0.5) * 0.7; x += Math.cos(a) * (18 + hash(i * 5 + k) * 26); y += Math.sin(a) * (18 + hash(i * 7 + k) * 30); g.lineTo(x, y); } g.stroke(); }
    for (let r = 0; r < 3; r++) { g.lineWidth = 1.4; g.beginPath(); for (let k = 0; k <= 40; k++) { const a = k / 40 * Math.PI * 2; const rr2 = 90 + r * 70 + hash(k * 3 + r) * 26; g.lineTo(cx + Math.cos(a) * rr2 * 0.55, cy + Math.sin(a) * rr2); } g.stroke(); } });
}

// ---------------------------------------------------------------- materiales
function buildCityMats() {
  const clip = m => { m.clippingPlanes = [CLIP]; return m; };
  M.ground = clip(new THREE.MeshStandardMaterial({ map: groundTex(), roughness: 0.75 }));
  M.slab = clip(new THREE.MeshPhysicalMaterial({ color: 0x1b2230, roughness: 0.35, metalness: 0.2, clearcoat: 0.6 }));
  M.slabEdge = clip(basicGlow(0x5ff3ff, 1.6));
  M.water = clip(new THREE.MeshPhysicalMaterial({ color: 0x2fb6d6, roughness: 0.08, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.55 }));
  M.fac = PAST.map((c, i) => { const m = clip(new THREE.MeshStandardMaterial({ map: repTex(facadeTex(c, '#fbf7ef', 0, i + 1), 1, 1), emissiveMap: repTex(facadeTex(c, '#fff', 1, i + 1), 1, 1), emissive: 0xffc27a, emissiveIntensity: 0, roughness: 0.62 })); return m; });
  M.tower = [0, 1, 2].map(i => clip(new THREE.MeshPhysicalMaterial({ map: repTex(towerTex(0, i + 3), 1, 1), emissiveMap: repTex(towerTex(1, i + 3), 1, 1), emissive: 0xbfe3ff, emissiveIntensity: 0, roughness: 0.12, metalness: 0.5, clearcoat: 1 })));
  M.roof = clip(new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.7 }));
  M.trim = clip(new THREE.MeshPhysicalMaterial({ color: 0xfbf7ef, roughness: 0.4, clearcoat: 0.5 }));
  M.neon = [0xff4fb0, 0x45f0e0, 0xffd34a, 0xa06bff].map(c => clip(basicGlow(c, 1.0)));
  M.trunk = clip(new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.85 }));
  M.leaf = clip(new THREE.MeshStandardMaterial({ color: 0x2f8f45, roughness: 0.5, side: THREE.DoubleSide }));
  M.carP = ['#ff5a7a', '#ffd23f', '#3fd0ff', '#ffffff', '#ff8a3d', '#8a6bff', '#2fe0a0'].map(c => clip(paint(new THREE.Color(c).getHex(), 0.25)));
  M.carG = clip(new THREE.MeshPhysicalMaterial({ color: 0x0d1622, roughness: 0.05, metalness: 0.4, clearcoat: 1 }));
  M.tyre = clip(new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.8 }));
  M.pawn = [0xf3ede2, 0xffc3a0, 0x9bd1ff, 0xffe28a, 0xd9b8ff].map(c => clip(plastic(c, 0.35)));
  M.pier = clip(new THREE.MeshStandardMaterial({ color: 0xc9a47a, roughness: 0.8 }));
  M.wheel = clip(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1 }));
  // el móvil
  M.phone = metal(0xb9bec7, 0.28); M.phoneBk = new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.25, metalness: 0.3, clearcoat: 1 });
  M.screen = new THREE.MeshPhysicalMaterial({ map: screenTex(), emissiveMap: screenTex(), emissive: 0x3a6a9a, emissiveIntensity: 0.55, roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 });
  M.crack = new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  // la columna de datos
  M.pil = new THREE.MeshPhysicalMaterial({ color: 0x8fe6ff, transparent: true, opacity: 0.16, roughness: 0.06, metalness: 0.1, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  M.data = new THREE.MeshBasicMaterial({ map: dataTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(0x9ff4ff).multiplyScalar(0.85), side: THREE.DoubleSide });
  M.data2 = M.data.clone(); M.data2.map = M.data.map.clone(); M.data2.map.needsUpdate = true;
  M.code = new THREE.MeshBasicMaterial({ map: codeTex(), toneMapped: false, color: new THREE.Color(0xffffff).multiplyScalar(1.3) });
  M.disc = new THREE.MeshPhysicalMaterial({ color: 0xd9dee6, roughness: 0.12, metalness: 0.85, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6 });
  M.brick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.75 });
  M.fiber = new THREE.MeshPhysicalMaterial({ color: 0x1a2a36, roughness: 0.3, clearcoat: 1 });
  M.pulse = basicGlow(0x9ff7ff, 2.2);
}
// ---------------------------------------------------------------- piezas
function boxUV(geo, w, h, d, tile = TILE) {              // UV a escala real: una tesela de fachada mide TILE en cada cara
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  uv.needsUpdate = true; return geo;
}
function building(w, h, d, kind, ci) {                  // kind 0: deco pastel · 1: torre de cristal
  const g = new THREE.Group(), side = kind ? M.tower[ci % 3] : M.fac[ci % PAST.length];
  const body = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, kind ? 0.32 : TILE), [side, side, M.roof, M.roof, side, side]);
  body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  if (!kind) {                                            // remate art déco: cornisa, escalón y, a veces, torreón redondo con neón
    const c = new THREE.Mesh(new THREE.BoxGeometry(w + 0.012, 0.012, d + 0.012), M.trim); c.position.y = h + 0.006; g.add(c);
    if (hash(ci * 3.3 + w) > 0.35) { const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.05, d * 0.55), side); s.position.y = h + 0.037; g.add(s); }
    const nm = M.neon[ci % 4];
    const n1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.016, 0.005, 0.005), nm); n1.position.set(0, h - 0.012, d / 2 + 0.006); g.add(n1);
    const n2 = new THREE.Mesh(new THREE.BoxGeometry(0.005, h * 0.8, 0.005), nm); n2.position.set(w / 2 + 0.004, h * 0.55, d / 2 + 0.004); g.add(n2);
    g.userData.neon = [n1, n2];
  } else {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6), M.trim); a.position.y = h + 0.06; g.add(a);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), M.neon[0]); l.position.y = h + 0.12; g.add(l); g.userData.neon = [l];
  }
  g.userData.h = h; return g;
}
function palmGeo() {                                     // una palmera: tronco curvo con anillos + 8 hojas arqueadas (geometrías unidas)
  const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(v3(Math.sin(u * 1.2) * 0.035, u * 0.26, 0)); }
  const trunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0055, 6);
  const leaves = [];
  for (let k = 0; k < 9; k++) {
    const L = 0.12 + hash(k * 3.7) * 0.03, lg = new THREE.PlaneGeometry(L, 0.05, 12, 2); lg.translate(L / 2, 0, 0);
    const p = lg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), u = x / L, wid = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.35);
      p.setY(i, y * wid); p.setZ(i, -u * u * 0.075 - Math.abs(y) * wid * 0.35); }
    lg.rotateX(-Math.PI / 2); lg.rotateZ(0.32); lg.rotateY(k / 9 * Math.PI * 2 + hash(k) * 0.35); lg.translate(Math.sin(1.2) * 0.035, 0.262, 0); leaves.push(lg);
  }
  const lv = mergeGeometries(leaves.map(x => x.toNonIndexed ? x.toNonIndexed() : x)); lv.computeVertexNormals();
  return { trunk, leaves: lv };
}
function car(ci) {                                       // cochecito: carrocería redondeada, cabina de cristal y 4 ruedas
  const g = new THREE.Group(), L = 0.085, Wd = 0.04;
  const b = rbox(L, Wd, 0.018, M.carP[ci % M.carP.length], 0.008); b.rotation.x = -Math.PI / 2; b.position.y = 0.017; g.add(b);
  const c = rbox(L * 0.55, Wd * 0.86, 0.016, M.carG, 0.007); c.rotation.x = -Math.PI / 2; c.position.set(-0.005, 0.032, 0); g.add(c);
  for (const [x, z] of [[0.026, 0.019], [-0.026, 0.019], [0.026, -0.019], [-0.026, -0.019]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.007, 12), M.tyre); w.rotation.x = Math.PI / 2; w.position.set(x, 0.008, z); g.add(w); }
  g.userData.body = b; return g;
}
function phone() {
  const g = new THREE.Group();
  const body = rbox(PH.w, PH.l, PH.t * 0.94, M.phone, 0.09); body.rotation.x = -Math.PI / 2; body.position.y = PH.t * 0.47; g.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(PH.w - 0.05, PH.l - 0.05), M.screen); scr.rotation.x = -Math.PI / 2; scr.position.y = PH.t + 0.0008; scr.receiveShadow = true; g.add(scr);
  const cr = new THREE.Mesh(new THREE.PlaneGeometry(PH.w - 0.05, PH.l - 0.05), M.crack); cr.rotation.x = -Math.PI / 2; cr.position.y = PH.t + 0.0016; cr.renderOrder = 5; g.add(cr);
  const isl = rbox(0.16, 0.045, 0.004, M.phoneBk, 0.022); isl.rotation.x = -Math.PI / 2; isl.position.set(0, PH.t + 0.002, -PH.l / 2 + 0.06); g.add(isl);   // la isla de la cámara frontal
  for (const [z, l] of [[-0.35, 0.16], [-0.12, 0.1], [0.02, 0.1]]) { const bt = rbox(0.012, l, 0.02, M.phone, 0.005); bt.rotation.x = -Math.PI / 2; bt.position.set(-PH.w / 2 - 0.004, PH.t * 0.5, z); g.add(bt); }
  const port = rbox(0.09, 0.014, 0.02, M.phoneBk, 0.006); port.position.set(0, PH.t * 0.45, PH.l / 2 + 0.002); g.add(port);
  g.userData.crack = cr; return g;
}

// ---------------------------------------------------------------- montaje
const AVES = [-1.05, -0.35, 0.43], STREETS = [-1.0, -0.2, 0.6];
const PLAZAS = [[-0.98, -0.93, -0.72, -0.62], [-0.28, 0.67, 0.36, 1.47]];          // la segunda: césped despejado frente al edificio protagonista
const XB = [[-1.47, -1.12], [-0.98, -0.42], [-0.28, 0.36]], ZB = [[-1.47, -1.07], [-0.93, -0.27], [-0.13, 0.53], [0.67, 1.47]];
const HERO_B = { x: -0.04, z: 0.35, w: 0.32, d: 0.3, h: 0.36 };     // el edificio rosa cuya fachada se despega (da a la calle z = 0,6)
const HERO_CAR = v3(-0.02, 0, 0.6), HERO_PED = v3(0.2, 0, 0.555), CODE_P = v3(-0.14, 0, 0.84);
function buildCity() {
  const C = new THREE.Group(); scene.add(C); S.city = C;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, CW), M.slab); slab.position.y = -CH / 2; slab.receiveShadow = true; C.add(slab);
  const eg = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.01, 0.006, CW + 0.01), M.slabEdge); eg.position.y = -0.003; C.add(eg);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(CW, CW), M.ground); gr.rotation.x = -Math.PI / 2; gr.position.y = 0.0005; gr.receiveShadow = true; C.add(gr);
  S.waterT = 0; const wat = new THREE.Mesh(new THREE.PlaneGeometry(CW / 2 - 0.78, CW, 1, 1), M.water); wat.rotation.x = -Math.PI / 2; wat.position.set((0.78 + CW / 2) / 2, 0.004, 0); C.add(wat);
  // edificios: un lote por cuarto de manzana; al oeste, torres; en medio, hoteles pastel bajos; la manzana del edificio protagonista, a mano
  S.blds = [];
  const add = (b, x, z, ry = 0) => { b.position.set(x, 0, z); b.rotation.y = ry; C.add(b); b.userData.delay = hash(x * 3.1 + z * 5.7) * 0.5; S.blds.push(b); return b; };
  let ci = 0;
  XB.forEach(([x0, x1], bx2) => ZB.forEach(([z0, z1], bz) => {
    const nx = x1 - x0 > 0.5 ? 2 : 1, nz = z1 - z0 > 0.5 ? 2 : 1;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const lx0 = x0 + (x1 - x0) * i / nx, lx1 = x0 + (x1 - x0) * (i + 1) / nx, lz0 = z0 + (z1 - z0) * j / nz, lz1 = z0 + (z1 - z0) * (j + 1) / nz;
      const cx = (lx0 + lx1) / 2, cz = (lz0 + lz1) / 2, w = (lx1 - lx0) * 0.86, d = (lz1 - lz0) * 0.86;
      if (PLAZAS.some(([a, b, c, e]) => cx > a && cx < c && cz > b && cz < e)) continue;
      if (bx2 === 2 && bz === 2) continue;                                  // la manzana del protagonista
      const tower = bx2 < 2 && bz < 3 && hash(cx * 7 + cz * 3) > 0.25, h = tower ? 0.42 + hash(cx * 2.7 + cz * 9.1) * 0.5 : 0.16 + hash(cx * 5.3 + cz) * 0.2;
      add(building(w, h, d, tower ? 1 : 0, ci++), cx, cz);
    }
  }));
  S.hero = add(building(HERO_B.w, HERO_B.h, HERO_B.d, 0, 0), HERO_B.x, HERO_B.z);       // rosa
  add(building(0.14, 0.24, 0.26, 0, 1), 0.26, 0.36); add(building(0.3, 0.2, 0.22, 0, 2), -0.07, 0.0); add(building(0.14, 0.28, 0.22, 0, 3), 0.27, 0.0);
  // la fachada del protagonista es una lámina aparte (se despega): debajo queda la forma gris
  S.heroGrey = new THREE.Mesh(new THREE.PlaneGeometry(HERO_B.w, HERO_B.h), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.8, clippingPlanes: [CLIP] }));
  S.heroGrey.position.set(0, HERO_B.h / 2, HERO_B.d / 2 + 0.0015); S.hero.add(S.heroGrey);
  // palmeras (dos mallas instanciadas)
  const pg = palmGeo(), spots = [];
  for (let z = -1.4; z <= 1.4; z += 0.17) spots.push([0.34, z], [0.53, z + 0.08]);
  for (let i = 0; i < 10; i++) spots.push([0.6 + hash(i * 3.1) * 0.14, -1.4 + hash(i * 7.7) * 2.8]);
  for (const [a, b, c, e] of PLAZAS.slice(0, 1)) for (let i = 0; i < 5; i++) spots.push([a + 0.03 + hash(i * 5.1 + a) * (c - a - 0.06), b + 0.03 + hash(i * 2.3 + b) * (e - b - 0.06)]);
  S.palmT = new THREE.InstancedMesh(pg.trunk, M.trunk, spots.length); S.palmL = new THREE.InstancedMesh(pg.leaves, M.leaf, spots.length);
  S.palmT.castShadow = S.palmL.castShadow = true; S.palmSpots = spots;
  spots.forEach(([x, z], i) => { _o.position.set(x, 0, z); _o.rotation.set(0, hash(i * 9.3) * 6.28, 0); const s = 0.8 + hash(i * 4.4) * 0.5; _o.scale.setScalar(s); _o.updateMatrix(); S.palmT.setMatrixAt(i, _o.matrix); S.palmL.setMatrixAt(i, _o.matrix); });
  C.add(S.palmT, S.palmL);
  // muelle con noria en el mar
  const pier = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.08), M.pier); pier.position.set(1.03, 0.02, -0.6); C.add(pier);
  for (let k = 0; k < 6; k++) C.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 6), M.pier), 0.8 + k * 0.09, 0.004, -0.6 + (k % 2 ? 0.035 : -0.035)));
  S.wheel = new THREE.Group(); S.wheel.position.set(1.2, 0.17, -0.6); C.add(S.wheel);
  S.wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.005, 8, 48), M.wheel));
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.14, 0.003), M.wheel); sp.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0); sp.rotation.z = a - Math.PI / 2; S.wheel.add(sp);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.016), M.neon[k % 4]); cab.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0); S.wheel.add(cab); }
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.19, 0.008), M.wheel); leg.position.set(1.2 + s * 0.05, 0.085, -0.6); leg.rotation.z = s * 0.28; C.add(leg); }
  // rótulos de neón genéricos
  S.signs = [];
  for (const [txt, x, z, h, col] of [['HOTEL', -0.04, 0.505, 0.4, '#ff63b8'], ['CAFÉ', 0.26, 0.495, 0.22, '#5ef2e3'], ['SURF', 0.27, 0.115, 0.26, '#ffd34a'], ['24H', -0.07, 0.115, 0.17, '#a98bff']]) {
    const s = plateText(0.16, 0.05, [[txt, 0.62, 0.55]], { fg: col, bg: null, weight: 900 });
    s.material = new THREE.MeshBasicMaterial({ map: s.material.map, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.7, 1.7, 1.7), clippingPlanes: [CLIP] });
    s.position.set(x, h, z + 0.002); C.add(s); S.signs.push(s);
  }
  // coches (dan vueltas en sus calles: bucle exacto) y el coche protagonista, aparcado
  S.cars = [];
  const lanes = [...AVES.map(x => ({ a: 'z', c: x })), ...STREETS.map(z => ({ a: 'x', c: z }))];
  for (let i = 0; i < 16; i++) { const L = lanes[i % lanes.length], cr = car(i + 1); C.add(cr); S.cars.push({ g: cr, L, s0: hash(i * 5.3), dir: i % 2 ? 1 : -1, n: 1 + (i % 3) }); }
  S.heroCar = car(0); S.heroCar.position.copy(HERO_CAR); C.add(S.heroCar);
  S.racer = car(5); C.add(S.racer);
  // gente (figuritas) por las aceras y la playa; una con cara (la que se despega)
  const PG = studentGeo(); S.peds = [];
  for (let i = 0; i < 26; i++) { const p = new THREE.Mesh(PG, M.pawn[i % 5]); p.castShadow = true; const onBeach = i < 8;
    p.position.set(onBeach ? 0.56 + hash(i * 3.3) * 0.18 : AVES[i % 3] + (i % 2 ? 0.066 : -0.066), 0, onBeach ? -1.3 + hash(i * 7.1) * 2.6 : -1.4 + hash(i * 2.9) * 2.8); p.scale.setScalar(1.3); C.add(p); S.peds.push(p); }
  S.heroPed = new THREE.Mesh(PG, M.pawn[0]); S.heroPed.position.copy(HERO_PED); S.heroPed.scale.setScalar(1.6); S.heroPed.castShadow = true; C.add(S.heroPed);
  // el cubito de código
  S.code = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), M.code); S.code.position.copy(CODE_P).add(v3(0, 0.015, 0)); S.code.castShadow = true; C.add(S.code);
}
function buildDevice() {
  S.phone = phone(); scene.add(S.phone);
  // la columna de datos: caja de cristal + dos capas de datos que suben + aristas de luz
  const P = new THREE.Group(); scene.add(P); S.pil = P;
  P.add(new THREE.Mesh(new THREE.BoxGeometry(PIL.w, 1, PIL.d), M.pil));
  const d1 = new THREE.Mesh(new THREE.BoxGeometry(PIL.w * 0.92, 1, PIL.d * 0.94), M.data); P.add(d1); const d2 = new THREE.Mesh(new THREE.BoxGeometry(PIL.w * 0.7, 1, PIL.d * 0.8), M.data2); P.add(d2);
  P.children.forEach(m => m.position.y = 0.5);
  edges(P.children[0], 0x7ff3ff, 2.2, 28, 1);
  // regla con marcas (0 … 200 GB) a la derecha de la columna
  S.ruler = new THREE.Group(); scene.add(S.ruler); const rx = PIL.w / 2 + 0.06, rz = PIL.d / 2;
  const rm = lineMat(0xbff7ff, 1.6, 0.9);
  const segs = [rx, PH.t, rz, rx, PH.t + PIL.h, rz];
  for (let gb = 0; gb <= 200; gb += 25) { const y = PH.t + PIL.h * gb / 212, L = gb % 50 ? 0.03 : 0.06; segs.push(rx, y, rz, rx + L, y, rz); }
  S.ruler.add(new LineSegments2(new LineSegmentsGeometry().setPositions(segs), rm));
  S.rulerLabs = [];
  for (let gb = 50; gb <= 200; gb += 50) { const l = plateText(0.2, 0.06, [[gb + ' GB', 0.6, 0.55]], { fg: '#bff7ff', weight: 800 }); l.material = new THREE.MeshBasicMaterial({ map: l.material.map, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }); l.position.set(rx + 0.18, PH.t + PIL.h * gb / 212, rz); S.ruler.add(l); S.rulerLabs.push(l); }
  // la caja de 128 GB (lo que cabe en el móvil): aristas discontinuas
  S.box128 = new THREE.Group(); scene.add(S.box128);
  const bm = lineMat(0xffffff, 2.2, 1, true); bm.dashSize = 0.05; bm.gapSize = 0.035; S.box128M = bm;
  const bg = new THREE.EdgesGeometry(new THREE.BoxGeometry(PIL.w + 0.08, H128, PIL.d + 0.08)); const bl = new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(bg), bm); bl.computeLineDistances(); bl.position.y = PH.t + H128 / 2; S.box128.add(bl);
  // Red Dead 2: otra columna, la mitad de alta, en la mesa
  const R = new THREE.Group(); scene.add(R); S.rd = R; R.position.set(0.95, 0, 0.15);
  const rbase = rbox(PIL.w + 0.1, PIL.d + 0.1, 0.04, M.phoneBk, 0.02); rbase.rotation.x = -Math.PI / 2; rbase.position.y = 0.02; R.add(rbase);
  const rp = new THREE.Mesh(new THREE.BoxGeometry(PIL.w, 1, PIL.d), M.pil.clone()); rp.position.y = 0.5; R.add(rp); edges(rp, 0xffc27a, 2.2, 28, 1);
  const rdat = new THREE.Mesh(new THREE.BoxGeometry(PIL.w * 0.92, 1, PIL.d * 0.94), M.data.clone()); rdat.material.color = new THREE.Color(0xffc27a).multiplyScalar(1.3); rdat.position.y = 0.5; R.add(rdat);
  S.rdCol = [rp, rdat];
  // canciones: discos que caen y se amontonan junto al móvil
  const N = 1400; S.discs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 20), M.disc, N); S.discs.castShadow = true; scene.add(S.discs);
  S.discData = []; const PC = v3(-1.25, 0, 0.35);
  for (let i = 0; i < N; i++) { const r = Math.sqrt(hash(i * 1.7)) * 0.55, a = hash(i * 3.9) * 6.283, h = Math.max(0, 0.42 * (1 - (r / 0.55) ** 1.6)) * (0.5 + hash(i * 2.2) * 0.5) * (i / N) ** 0.3;
    S.discData.push({ p: v3(PC.x + Math.cos(a) * r, 0.002 + h, PC.z + Math.sin(a) * r), t0: 0, rx: (hash(i * 5.1) - 0.5) * 1.2, rz: (hash(i * 6.3) - 0.5) * 1.2, x0: PC.x + (hash(i * 7.7) - 0.5) * 0.3, z0: PC.z + (hash(i * 8.8) - 0.5) * 0.3 }); }
  S.discPC = PC;
  // la fibra: llega por la mesa hasta el móvil, con pulsos de luz
  const fp = [v3(-3.2, 0.012, 2.6), v3(-1.6, 0.012, 2.2), v3(-0.6, 0.012, 1.6), v3(0, 0.03, PH.l / 2 + 0.12), v3(0, 0.04, PH.l / 2 + 0.01)];
  S.fiberCurve = new THREE.CatmullRomCurve3(fp); S.fiber = new THREE.Mesh(new THREE.TubeGeometry(S.fiberCurve, 120, 0.012, 10), M.fiber); S.fiber.castShadow = true; scene.add(S.fiber);
  S.pulses = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.014, 0.08, 4, 8), M.pulse, 14); scene.add(S.pulses);
  // la caja con la «?» encima de la ciudad, el mando tachado, el ladrillo y los iconos que salen del móvil
  S.qm = qmark(new THREE.MeshPhysicalMaterial({ color: 0xff7ac2, roughness: 0.2, metalness: 0.3, clearcoat: 1, emissive: 0x6a1040, emissiveIntensity: 0.4 })); scene.add(S.qm);
  S.pad = gamepad(); scene.add(S.pad);
  S.brick = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.068, 0.105), [M.brick, M.brick, M.brick, M.brick, M.brick, M.brick]); S.brick.castShadow = true; scene.add(S.brick);
  S.icons = []; const IC = ['#ff6fa8', '#5fd2ff', '#ffd34a', '#7ee08a', '#b18bff', '#ff8a5c', '#ffffff', '#4fe0cf'];
  for (let i = 0; i < 24; i++) { const m = rbox(0.16, 0.16, 0.028, plastic(new THREE.Color(IC[i % IC.length]).getHex(), 0.3), 0.032); scene.add(m); S.icons.push(m); }
}
function gamepad() {                                     // mando genérico (sin marca): cuerpo, dos asas, cruceta y botones
  const g = new THREE.Group(), m = plastic(0xf1f3f7, 0.3), d = plastic(0x2a2e36, 0.35);
  const b = rbox(0.42, 0.2, 0.07, m, 0.07); g.add(b);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.12, 6, 12), m); h.position.set(s * 0.17, -0.1, 0); h.rotation.z = s * 0.45; g.add(h); }
  const cx = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.022, 0.02), d); cx.position.set(-0.12, 0.02, 0.04); g.add(cx); const cy2 = cx.clone(); cy2.rotation.z = Math.PI / 2; g.add(cy2);
  for (const [x, y] of [[0.12, 0.05], [0.12, -0.01], [0.09, 0.02], [0.15, 0.02]]) { const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 16), d); bt.rotation.x = Math.PI / 2; bt.position.set(x, y, 0.04); g.add(bt); }
  for (const x of [-0.05, 0.05]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.024, 20), d); st.rotation.x = Math.PI / 2; st.position.set(x, -0.04, 0.04); g.add(st); }
  return g;
}
// ---------------------------------------------------------------- láminas que se despegan (fachada, coche, cara) y ondas de sonido
function buildPeels() {
  const mk = (w, h, mat) => { const geo = new THREE.PlaneGeometry(w, h, 24, 24); geo.translate(0, -h / 2, 0); const m = new THREE.Mesh(geo, mat); m.userData.base = geo.attributes.position.array.slice(); m.userData.w = w; m.userData.h = h; m.castShadow = true; scene.add(m); return m; };
  const heroMat = M.fac[0].clone(); heroMat.map = M.fac[0].map.clone(); heroMat.map.repeat.set(HERO_B.w / TILE, HERO_B.h / TILE); heroMat.map.needsUpdate = true;
  heroMat.emissiveMap = M.fac[0].emissiveMap.clone(); heroMat.emissiveMap.repeat.copy(heroMat.map.repeat); heroMat.emissiveMap.needsUpdate = true; heroMat.side = THREE.DoubleSide; heroMat.clippingPlanes = [CLIP];
  S.peelWall = mk(HERO_B.w, HERO_B.h, heroMat);
  const carMat = new THREE.MeshPhysicalMaterial({ map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#ff5a7a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(0, h * 0.62, w, 10); g.fillStyle = '#ffd23f'; g.font = '900 40px Inter'; g.fillText('77', w * 0.62, h * 0.48); }), roughness: 0.3, clearcoat: 1, side: THREE.DoubleSide, clippingPlanes: [CLIP] });
  S.peelCar = mk(0.08, 0.028, carMat);
  const faceMat = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffd9b8'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.fillStyle = '#2a1d16'; g.beginPath(); g.arc(90, 110, 14, 0, 7); g.arc(166, 110, 14, 0, 7); g.fill();
    g.strokeStyle = '#2a1d16'; g.lineWidth = 9; g.beginPath(); g.arc(128, 140, 46, 0.25, Math.PI - 0.25); g.stroke(); g.fillStyle = 'rgba(255,120,120,.35)'; g.beginPath(); g.arc(70, 150, 18, 0, 7); g.arc(186, 150, 18, 0, 7); g.fill(); }), transparent: true, side: THREE.DoubleSide, roughness: 0.6, clippingPlanes: [CLIP] });
  S.peelFace = mk(0.026, 0.026, faceMat);
  // la cuadrícula de píxeles que aparece sobre las láminas grandes
  S.gridTex = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; for (let k = 0; k <= 32; k++) { g.beginPath(); g.moveTo(k * 16, 0); g.lineTo(k * 16, h); g.moveTo(0, k * 16); g.lineTo(w, k * 16); g.stroke(); } });
  S.grids = [S.peelWall, S.peelCar, S.peelFace].map(p => { const gm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: S.gridTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); gm.renderOrder = 6; scene.add(gm); return gm; });
  // la fachada borrosa (imagen pequeña) para la comparación de cerca
  const low = canvasTex(32, 32, (g, w, h) => { const img = M.fac[0].map.image; g.imageSmoothingEnabled = true; g.drawImage(img, 0, 0, 512, 512, 0, 0, w, h); });
  low.magFilter = THREE.LinearFilter; low.minFilter = THREE.LinearFilter; repTex(low, HERO_B.w / TILE, HERO_B.h / TILE);
  S.blurHalf = new THREE.Mesh(new THREE.PlaneGeometry(HERO_B.w / 2, HERO_B.h), new THREE.MeshStandardMaterial({ map: low, roughness: 0.62, clippingPlanes: [CLIP] }));
  { const uv = S.blurHalf.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5); uv.needsUpdate = true; }
  S.blurHalf.position.set(-HERO_B.w / 4, HERO_B.h / 2, HERO_B.d / 2 + 0.003); S.hero.add(S.blurHalf);
  const div = new THREE.Mesh(new THREE.PlaneGeometry(0.003, HERO_B.h * 1.1), basicGlow(0xffffff, 1.6)); div.position.set(0, HERO_B.h / 2, HERO_B.d / 2 + 0.004); S.hero.add(div); S.blurDiv = div;
  // ondas de sonido: 3 cintas de barritas (voz, canción, calle) + anillos
  S.waves = [0, 1, 2].map(i => { const n = 30, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), basicGlow([0xfff2c0, 0xff6fd0, 0x7ff3ff][i], 0.9), n); im.userData.n = n; scene.add(im); return im; });
  S.rings = Array.from({ length: 8 }, (_, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 48), basicGlow(i % 2 ? 0x7ff3ff : 0xff6fd0, 1.5)); r.rotation.x = Math.PI / 2; scene.add(r); return r; });
  S.crossM = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.03), basicGlow(0xff4a5c, 2.0)); S.crossM2 = S.crossM.clone(); scene.add(S.crossM, S.crossM2);
}
