// ---------------------------------------------------------------- «La cerradura por dentro»: la puerta, el marco, la cerradura de embutir (caja, resbalón, cerrojo, bombín de
// pitones), la llave, la radiografía y las 200 casas. 1 unidad = 10 cm reales. La puerta abre hacia dentro (−z) girando sobre la bisagra; desde fuera (+z)
// se ve la rendija entre el canto (x = 4,15) y el marco (x = 4,25). El bombín es de perfil europeo con los pitones arriba.
const HING = v3(-4.1, 0, -0.25);
const DX1 = 4.15, JX = 4.25, GX = 4.2;          // canto de la puerta, cara del marco, rendija (por donde entra la lámina)
const LCX = 3.55, LCY = 10.5;                    // eje del bombín (z = 0 es el centro de la puerta)
const LY = 10.95, BY = 10.2;                     // alturas del resbalón y del cerrojo
const PZ = [0.08, 0.12, 0.16, 0.2, 0.24];        // los 5 pitones de la mitad de fuera
const KCUT = [0.022, 0.006, 0.03, 0.012, 0.002]; // profundidad de cada corte de la llave (EJEMPLO)
const SHEAR = 0.065, KTOP = 0.03, PREST = -0.012, PRAD = 0.0135, CHR = 0.015, DRV = 0.06, CHTOP = 0.235, KTIP = 0.05, KLEN = 0.25;
const KU = PZ.map(z => z - KTIP), KH = KCUT.map(d => KTOP - d), KPL = KH.map(h => SHEAR - h);
const BSTEP = 0.18, CLIPOFF = 1000;
const GH = [], GE = [];       // materiales que se vuelven fantasma y aristas que aparecen (modo «por dentro»)
const HZC = v3(0, 0, 60);     // las 200 casas
function doorPt(x, y, z, th) { const dx = x - HING.x, dz = z - HING.z, c = Math.cos(th), s = Math.sin(th); return v3(HING.x + dx * c + dz * s, y, HING.z - dx * s + dz * c); }
function keyTop(u) {          // borde de arriba de la hoja (los dientes) a la distancia u de la punta
  let v = Math.min(KTOP, -0.02 + u * 1.6);
  for (let i = 0; i < 5; i++) v = Math.min(v, KH[i] + Math.max(0, Math.abs(u - KU[i]) - 0.004));
  return v;
}
const ghostM = (m, min = 0.04) => { GH.push({ m, min }); return m; };
const ghostE = (mesh, a = 0.55, col = 0xe6ecf2, w = 1.4, grp = 'door') => { const l = edges(mesh, col, w, 25, 0); GE.push({ l, a, grp }); return l; };

// ---------------------------------------------------------------- texturas
function doorTexs() {
  const Wc = 512, Hc = 1258, sx = Wc / 8.25, sy = Hc / 20.25, X = x => (x + 4.1) * sx, Y = y => (20.3 - y) * sy;
  const panels = [[-2.7, -0.25, 12.2, 18.7], [0.25, 2.75, 12.2, 18.7], [-2.7, -0.25, 2.6, 9.3], [0.25, 2.75, 2.6, 9.3]];
  const col = canvasTex(1024, 1024, (g, w, h) => {      // veta vertical (se repite: nítida de cerca)
    g.fillStyle = '#5c381d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const x0 = hash(i * 3.3) * w, a = 0.05 + hash(i * 7.1) * 0.2, amp = 0.8 + hash(i * 1.7) * 2.2, f = (1 + Math.floor(hash(i * 5.5) * 2)) * 2 * Math.PI / h;
      g.strokeStyle = hash(i * 2.2) > 0.5 ? '#2c170a' : '#86592f'; g.globalAlpha = a; g.lineWidth = 0.6 + hash(i * 9.9) * 2.6; g.beginPath();
      for (let y = 0; y <= h; y += 8) { const x = x0 + Math.sin(y * f + i) * amp + Math.sin(y * f * 2 + i * 2) * amp * 0.3; y ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.beginPath(); for (let y = 0; y <= h; y += 8) { const x = x0 - w + Math.sin(y * f + i) * amp + Math.sin(y * f * 2 + i * 2) * amp * 0.3; y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
    g.globalAlpha = 1;
  });
  col.wrapS = col.wrapT = THREE.RepeatWrapping; col.repeat.set(2.2, 4.4);
  const ao = canvasTex(Wc, Hc, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (const [x0, x1, y0, y1] of panels) { const a = X(x0), b = X(x1), c = Y(y1), d = Y(y0);
      g.strokeStyle = '#2a2a2a'; g.lineWidth = 5; g.strokeRect(a, c, b - a, d - c); g.strokeStyle = '#8a8a8a'; g.lineWidth = 3; g.strokeRect(a + 14, c + 14, b - a - 28, d - c - 28); }
  });
  ao.colorSpace = THREE.NoColorSpace;
  const bump = canvasTex(Wc, Hc, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (const [x0, x1, y0, y1] of panels) { const a = X(x0), b = X(x1), c = Y(y1), d = Y(y0);
      g.fillStyle = '#3a3a3a'; g.fillRect(a, c, b - a, d - c); g.fillStyle = '#5c5c5c'; g.fillRect(a + 6, c + 6, b - a - 12, d - c - 12); g.fillStyle = '#9a9a9a'; g.fillRect(a + 16, c + 16, b - a - 32, d - c - 32); }
  });
  bump.colorSpace = THREE.NoColorSpace; return { col, bump, ao };
}
function plasterTex() { return canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#8c857c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = hash(i * 1.3) > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; g.fillRect(hash(i * 2.7) * w, hash(i * 5.1) * h, 1 + hash(i) * 2, 1 + hash(i * 3.3) * 2); } }); }
// sección (corte) con rayado de dibujo técnico
function hatch(g, x, y, w, h, base, line, step = 9, dir = 1) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = base; g.fillRect(x, y, w, h);
  g.strokeStyle = line; g.lineWidth = 1.6; g.beginPath(); for (let k = -h; k < w + h; k += step) { g.moveTo(x + k, y + (dir > 0 ? h : 0)); g.lineTo(x + k + h, y + (dir > 0 ? 0 : h)); } g.stroke(); g.restore();
}
// la radiografía: una mano (huesos azulados que brillan) sobre película oscura
function xrayTex() {
  return canvasTex(700, 860, (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.55, h * 0.5, 50, w * 0.55, h * 0.5, w * 0.8); gr.addColorStop(0, '#16222e'); gr.addColorStop(1, '#04070b');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(160,200,230,.35)'; g.lineWidth = 3; rr(g, 8, 8, w - 16, h - 16, 18); g.stroke();
    // partes blandas (silueta de la mano)
    const cx = w * 0.56, wy = h * 0.92;
    const fingers = [[-0.62, 0.30, [0.17, 0.11, 0.08]], [-0.2, 0.36, [0.2, 0.12, 0.08, 0.06]], [0.0, 0.37, [0.22, 0.135, 0.09, 0.065]], [0.17, 0.355, [0.205, 0.125, 0.085, 0.062]], [0.36, 0.32, [0.17, 0.1, 0.07, 0.055]]];
    const bones = [];
    const P = (x, y) => [cx + x * w, wy - y * h];
    bones.push([P(-0.09, 0.0), P(-0.075, 0.25), 30], [P(0.07, 0.0), P(0.06, 0.24), 24]);      // radio y cúbito
    const carp = [[-0.09, 0.3], [-0.03, 0.31], [0.03, 0.305], [0.085, 0.295], [-0.07, 0.355], [-0.01, 0.36], [0.05, 0.355], [0.1, 0.345]];
    fingers.forEach(([ang, len, segs], fi) => {
      let x = (fi - 2) * 0.055 + (fi === 0 ? -0.06 : 0), y = fi === 0 ? 0.36 : 0.385, a = ang * 0.55;
      segs.forEach((sl, si) => { const L = sl * (si === 0 ? 1 : 1), x2 = x + Math.sin(a) * L * 0.62, y2 = y + Math.cos(a) * L * 0.9; bones.push([P(x, y), P(x2, y2), (si === 0 ? 17 : 14) - si * 2.2]); x = x2 + Math.sin(a) * 0.012; y = y2 + Math.cos(a) * 0.016; a += ang * 0.06; });
    });
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(90,130,170,.10)'; g.lineCap = 'round'; for (const [a, b, r] of bones) { g.lineWidth = r * 3.2; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    g.shadowColor = 'rgba(170,215,255,.9)'; g.shadowBlur = 18;
    for (const [a, b, r] of bones) { g.strokeStyle = 'rgba(190,220,250,.8)'; g.lineWidth = r; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    for (const [x, y] of carp) { g.fillStyle = 'rgba(205,230,255,.85)'; g.beginPath(); g.ellipse(...P(x, y), 17, 14, 0.3, 0, 7); g.fill(); }
    g.shadowBlur = 0; g.globalCompositeOperation = 'source-over';
    for (const [a, b, r] of bones) { g.strokeStyle = 'rgba(70,100,130,.45)'; g.lineWidth = r * 0.35; g.beginPath(); g.moveTo(a[0] + (b[0] - a[0]) * 0.15, a[1] + (b[1] - a[1]) * 0.15); g.lineTo(a[0] + (b[0] - a[0]) * 0.85, a[1] + (b[1] - a[1]) * 0.85); g.stroke(); }
    g.restore();
    g.fillStyle = 'rgba(230,240,250,.9)'; g.font = '900 64px Inter'; g.fillText('R', 46, 100);
    g.fillStyle = 'rgba(200,215,230,.55)'; g.fillRect(w - 250, h - 92, 200, 50); g.fillStyle = '#0b1118'; g.font = '700 20px Inter'; g.fillText('RX · EJEMPLO', w - 236, h - 60);
  });
}

// ---------------------------------------------------------------- materiales de la puerta y la cerradura
function lockMats() {
  const D = doorTexs();
  M.doorF = ghostM(new THREE.MeshPhysicalMaterial({ map: D.col, aoMap: D.ao, aoMapIntensity: 1, bumpMap: D.bump, bumpScale: 3, roughness: 0.45, clearcoat: 0.55, clearcoatRoughness: 0.28 }));
  M.doorB = ghostM(new THREE.MeshPhysicalMaterial({ map: D.col, roughness: 0.5, clearcoat: 0.4 }));
  M.doorE = ghostM(new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#5a361c', '#2f1a0b', '#7a5230', 4), 1, 1), roughness: 0.5, clearcoat: 0.4 }));
  M.jamb = ghostM(new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#6a4426', '#3a2210', '#8a6038', 7), 1, 1), roughness: 0.5, clearcoat: 0.35 }), 0.1);
  M.wall = ghostM(new THREE.MeshStandardMaterial({ map: repTex(plasterTex(), 6, 6), color: 0xb9b2a8, roughness: 0.92 }), 0.0);
  M.brassP = metal(0xd9b56c, 0.16); M.brassS = metal(0xc8a25a, 0.32); M.chrome = metal(0xe8ecf2, 0.1); M.satin = metal(0xbfc5cc, 0.34); M.dark = metal(0x2a2e35, 0.5);
  M.brassG = ghostM(metal(0xd9b56c, 0.18), 0.0);        // pomo, escudos y mirilla (también se vuelven transparentes)
  M.strike = ghostM(new THREE.MeshStandardMaterial({ map: canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = '#aeb4bc'; g.fillRect(0, 0, w, h); for (let i = 0; i < h; i += 3) { g.fillStyle = `rgba(255,255,255,${0.04 + hash(i) * 0.06})`; g.fillRect(0, i, w, 1); }
    const Y = y => (11.3 - y) / 1.3 * h, Z = z => (z + 0.15) / 0.3 * w;
    g.fillStyle = '#050505'; g.fillRect(Z(-0.095), Y(11.08), Z(0.095) - Z(-0.095), Y(10.82) - Y(11.08)); g.fillRect(Z(-0.075), Y(10.32), Z(0.075) - Z(-0.075), Y(10.08) - Y(10.32));
    for (const y of [11.2, 10.0 + 0.06]) { g.fillStyle = '#6d737b'; g.beginPath(); g.arc(w / 2, Y(y), 9, 0, 7); g.fill(); g.strokeStyle = '#2a2d31'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2 - 6, Y(y)); g.lineTo(w / 2 + 6, Y(y)); g.stroke(); }
  }), metalness: 0.9, roughness: 0.3 }), 1.0);
  M.keyM = metal(0xdfe3e8, 0.14); M.boltM = new THREE.MeshStandardMaterial({ color: 0xb4bbc4, metalness: 1, roughness: 0.3, transparent: true });
  M.latchM = new THREE.MeshStandardMaterial({ color: 0xd9b56c, metalness: 1, roughness: 0.16, transparent: true }); M.hubM = new THREE.MeshStandardMaterial({ color: 0xc8a25a, metalness: 1, roughness: 0.32, transparent: true });
  M.sideM = new THREE.MeshStandardMaterial({ color: 0xbfc5cc, metalness: 1, roughness: 0.34, transparent: true }); M.springL = new THREE.MeshStandardMaterial({ color: 0xd5dbe2, metalness: 1, roughness: 0.25, transparent: true });
  S.sideFade = [M.latchM, M.hubM, M.sideM, M.springL]; M.camM = metal(0x8f98a3, 0.3);
  M.pinK = metal(0xe2b65a, 0.2); M.pinD = metal(0xb8c4d2, 0.18); M.spring = metal(0xd5dbe2, 0.25);
  M.caseM = new THREE.MeshStandardMaterial({ color: 0x23262c, metalness: 0.7, roughness: 0.45, transparent: true, opacity: 0.92 });
  M.inside = new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w * 0.5, h * 0.35, 10, w * 0.5, h * 0.45, w * 0.7); r.addColorStop(0, '#ffd59a'); r.addColorStop(0.5, '#a8682e'); r.addColorStop(1, '#2a1708'); g.fillStyle = r; g.fillRect(0, 0, w, h); }), color: 0xffffff });
  M.capWood = new THREE.MeshStandardMaterial({ map: repTex(canvasTex(128, 128, (g, w, h) => hatch(g, 0, 0, w, h, '#3b2a1c', '#56402c', 12)), 30, 2), roughness: 0.8 });
  M.capWall = new THREE.MeshStandardMaterial({ map: repTex(canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#1f1f21'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(20,18,16,.5)'; g.fillRect(hash(i * 1.7) * w, hash(i * 2.9) * h, 2, 2); } }), 20, 2), roughness: 0.9 });
}

// ---------------------------------------------------------------- piezas
function euroShape(r = 0.085, tw = 0.05, top = 0.245, grow = 0) {     // perfil europeo: redondo abajo + torre (pitones) arriba
  const s = new THREE.Shape(), R = r + grow, T = tw + grow, a0 = Math.acos(T / R);
  s.absarc(0, 0, R, a0, Math.PI - a0, true); s.lineTo(-T, top - tw); s.absarc(0, top - tw, T, Math.PI, 0, true); s.lineTo(T, R * Math.sin(a0)); return s;
}
function euroPath(grow = 0.006) { const s = euroShape(0.085, 0.05, 0.245, grow); const p = new THREE.Path(); p.curves = s.curves; p.currentPoint = s.currentPoint; return p; }
function helixGeo(r, turns, wire, axis = 'y') {       // muelle de longitud 1 (se estira con scale)
  const pts = [], n = Math.round(turns * 24); for (let i = 0; i <= n; i++) { const a = i / n * turns * Math.PI * 2, u = i / n; pts.push(axis === 'y' ? v3(Math.cos(a) * r, u, Math.sin(a) * r) : v3(u, Math.cos(a) * r, Math.sin(a) * r)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, wire, 6, false);
}
// semicilindro hueco (por dentro) a lo largo de y: las ranuras de los pitones en el corte
function groove(r, h, m) { const g = new THREE.CylinderGeometry(r, r, h, 16, 1, true, Math.PI, Math.PI); const o = new THREE.Mesh(g, m); return o; }
// plano en el corte x = 0 (mira hacia +x): z de z0 a z1 y y de y0 a y1, dibujado por draw(g, Z(), Y())
function cutFace(z0, z1, y0, y1, px, draw, mat) {
  const w = z1 - z0, h = y1 - y0, Wc = Math.round(px), Hc = Math.round(px * h / w);
  const tex = canvasTex(Wc, Hc, (g) => draw(g, z => (z1 - z) / w * Wc, y => (y1 - y) / h * Hc, Wc, Hc));
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.55, roughness: 0.42, ...(mat || {}) });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.rotation.y = Math.PI / 2; o.position.set(0, (y0 + y1) / 2, (z0 + z1) / 2); return o;
}
function buildCylinder(DI) {
  const CY = new THREE.Group(); CY.position.set(LCX, LCY, 0); DI.add(CY); S.cyl = CY;
  const full = new THREE.Group(), cut = new THREE.Group(); CY.add(full, cut); CY.userData = { full, cut };
  // --- cuerpo entero (fuera de los planos «por dentro»)
  const hg = new THREE.ExtrudeGeometry(euroShape(0.081, 0.046, 0.241), { depth: 0.592, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 28 }); hg.translate(0, 0, -0.296);
  full.add(mesh(hg, M.brassS));
  // --- cuerpo cortado por la mitad (x ≤ 0): piel + cara del corte con las cámaras de los pitones
  {
    const r = 0.085, a0 = Math.acos(0.05 / r), pts = [];
    for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 - i / 40 * (Math.PI / 2 + (Math.PI - a0) - Math.PI); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    // (de abajo, por la izquierda, hasta la torre)
    pts.length = 0; for (let i = 0; i <= 40; i++) { const a = 1.5 * Math.PI - i / 40 * (1.5 * Math.PI - (Math.PI - a0)); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    pts.push([-0.05, 0.195]); for (let i = 1; i <= 12; i++) { const a = Math.PI - i / 12 * Math.PI / 2; pts.push([Math.cos(a) * 0.05, 0.195 + Math.sin(a) * 0.05]); }
    const pos = [], idx = [], z0 = -0.3, z1 = 0.3;
    pts.forEach(([x, y]) => pos.push(x, y, z0, x, y, z1));
    for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const skin = mesh(g, new THREE.MeshStandardMaterial({ color: 0xc8a25a, metalness: 1, roughness: 0.32, side: THREE.DoubleSide })); cut.add(skin);
    // tapas de los extremos (medio perfil con el hueco del rotor)
    const cap = new THREE.Shape(); cap.moveTo(0, -r); pts.forEach(([x, y]) => cap.lineTo(x, y)); cap.lineTo(0, SHEAR); cap.absarc(0, 0, SHEAR, Math.PI / 2, 1.5 * Math.PI, false); cap.lineTo(0, -r);
    for (const z of [0.3, -0.3]) { const c = mesh(new THREE.ShapeGeometry(cap, 16), new THREE.MeshStandardMaterial({ color: 0xc8a25a, metalness: 1, roughness: 0.3, side: THREE.DoubleSide })); c.position.z = z; cut.add(c); }
    // cara del corte: latón rayado, con las cámaras (ranuras) de los pitones y la ventana de la leva
    const face = cutFace(-0.3, 0.3, -0.085, 0.245, 1100, (g, Z, Y) => {
      const band = (za, zb, ya, yb) => { const x0 = Z(za), x1 = Z(zb), y0 = Y(yb), y1 = Y(ya); hatch(g, Math.min(x0, x1), y0, Math.abs(x1 - x0), y1 - y0, '#b8914a', '#8a6a2c', 10, 1); };
      for (const [za, zb] of [[-0.3, -0.04], [0.04, 0.3]]) { band(za, zb, SHEAR, 0.245); band(za, zb, -0.085, -SHEAR); }
      band(-0.04, 0.04, 0.198, 0.245);                      // puente de arriba (el de la leva)
      g.clearRect(0, 0, 1, 1);
      for (const z of [...PZ, ...PZ.map(z => -z)]) g.clearRect(Z(z + CHR), Y(CHTOP), Z(z - CHR) - Z(z + CHR), Y(SHEAR) - Y(CHTOP));
      // contorno de la torre redondeada (fuera de ella, transparente)
      g.save(); g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.rect(0, Y(0.195), 1100, Y(-0.085) - Y(0.195)); g.rect(0, Y(0.245) - 2, 1100, Y(0.195) - Y(0.245) + 3); g.fill(); g.restore();
      g.strokeStyle = '#6b511f'; g.lineWidth = 3; g.strokeRect(1, 1, 1098, Y(-0.085) - 2);
    });
    cut.add(face); S.cutHousing = face;
    for (const z of [...PZ, ...PZ.map(z => -z)]) { const gr = groove(CHR, CHTOP - SHEAR, new THREE.MeshStandardMaterial({ color: 0x9c7a3c, metalness: 1, roughness: 0.4, side: THREE.BackSide })); gr.position.set(0, (CHTOP + SHEAR) / 2, z); cut.add(gr); }
  }
  // --- rotor (gira con la llave): la mitad de fuera, con su corte, ranuras, cara con bocallave
  const PG = new THREE.Group(); CY.add(PG); S.plug = PG;
  const keywayTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9a35a'; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, 7); g.fill();
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,240,200,${0.05 + hash(i) * 0.08})`; g.beginPath(); g.arc(w / 2, h / 2, w / 2 * (0.2 + i / 50), 0, 7); g.stroke(); }
    g.strokeStyle = '#6b511f'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 3, 0, 7); g.stroke();
    // bocallave (perfil con quiebros)
    const X = x => w / 2 + x / 0.065 * w / 2, Yv = y => h / 2 - y / 0.065 * h / 2;
    g.fillStyle = '#050403'; g.beginPath(); g.moveTo(X(-0.006), Yv(0.036)); g.lineTo(X(0.006), Yv(0.036)); g.lineTo(X(0.006), Yv(0.012)); g.lineTo(X(0.002), Yv(0.0)); g.lineTo(X(0.007), Yv(-0.016)); g.lineTo(X(0.004), Yv(-0.03)); g.lineTo(X(0.007), Yv(-0.044)); g.lineTo(X(0.004), Yv(-0.056));
    g.lineTo(X(-0.004), Yv(-0.056)); g.lineTo(X(-0.007), Yv(-0.044)); g.lineTo(X(-0.003), Yv(-0.03)); g.lineTo(X(-0.007), Yv(-0.016)); g.lineTo(X(-0.002), Yv(-0.004)); g.lineTo(X(-0.006), Yv(0.012)); g.closePath(); g.fill();
  });
  const plugFace = new THREE.Mesh(new THREE.CircleGeometry(0.065, 48), new THREE.MeshStandardMaterial({ map: keywayTex, metalness: 0.9, roughness: 0.25 }));
  plugFace.position.z = 0.3005; PG.add(plugFace); full.userData.plugFace = plugFace;
  const inFace = new THREE.Mesh(new THREE.CircleGeometry(0.065, 48), new THREE.MeshStandardMaterial({ map: keywayTex, metalness: 0.9, roughness: 0.25 })); inFace.position.z = -0.3005; inFace.rotation.y = Math.PI; full.add(inFace);
  const plugCut = new THREE.Group(); PG.add(plugCut); S.plugCut = plugCut;
  const mkHalf = (z0, z1, parent) => {
    const hg2 = new THREE.CylinderGeometry(SHEAR, SHEAR, z1 - z0, 32, 1, false, Math.PI, Math.PI); const o = new THREE.Mesh(hg2, [M.brassP, new THREE.MeshStandardMaterial({ map: keywayTex, metalness: 0.9, roughness: 0.25 }), M.brassP]);
    o.rotation.x = Math.PI / 2; o.position.z = (z0 + z1) / 2; parent.add(o);
    const f = cutFace(z0, z1, -SHEAR, SHEAR, 600, (g, Z, Y, Wc) => {
      hatch(g, 0, 0, Wc, Y(-SHEAR), '#d6b066', '#a07c36', 10, -1);
      g.clearRect(0, Y(0.032), Wc, Y(-0.055) - Y(0.032));              // bocallave
      for (const z of [...PZ, ...PZ.map(z => -z)]) if (z > z0 && z < z1) g.clearRect(Z(z + CHR), Y(SHEAR), Z(z - CHR) - Z(z + CHR), Y(0.032) - Y(SHEAR));
      g.strokeStyle = '#6b511f'; g.lineWidth = 3; g.strokeRect(1, 1, Wc - 2, Y(-SHEAR) - 2);
    }); parent.add(f);
    const wallK = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 0.087), new THREE.MeshStandardMaterial({ color: 0x5e4a24, metalness: 0.8, roughness: 0.5 })); wallK.rotation.y = Math.PI / 2; wallK.position.set(-0.012, (0.032 - 0.055) / 2, (z0 + z1) / 2); parent.add(wallK);
    for (const z of [...PZ, ...PZ.map(z => -z)]) if (z > z0 && z < z1) { const gr = groove(CHR, SHEAR - 0.032, new THREE.MeshStandardMaterial({ color: 0x9c7a3c, metalness: 1, roughness: 0.4, side: THREE.BackSide })); gr.position.set(0, (SHEAR + 0.032) / 2, z); parent.add(gr); }
  };
  mkHalf(0.04, 0.3, plugCut);
  const inPlug = new THREE.Group(); cut.add(inPlug); mkHalf(-0.3, -0.04, inPlug);      // el rotor de dentro no gira
  // pitones: inferiores (latón, en el rotor) y superiores (acero, en el cuerpo) + muelles
  const pinGeo = (L, tip) => { const g1 = new THREE.CylinderGeometry(PRAD, PRAD, L - (tip ? 0.006 : 0), 20); g1.translate(0, (L + (tip ? 0.006 : 0)) / 2, 0);
    if (!tip) return g1; const c = new THREE.ConeGeometry(PRAD, 0.006, 20); c.rotateX(Math.PI); c.translate(0, 0.003, 0); return mergeGeometries([g1.toNonIndexed(), c.toNonIndexed()]); };
  const springG = helixGeo(0.0105, 9, 0.0026);
  S.pins = PZ.map((z, i) => {
    const kp = mesh(pinGeo(KPL[i], true), M.pinK); kp.position.set(0, PREST, z); PG.add(kp);
    const dp = mesh(pinGeo(DRV, false), M.pinD); dp.position.set(0, PREST + KPL[i], z); CY.add(dp);
    const sp = mesh(springG, M.spring); sp.position.set(0, 0.15, z); CY.add(sp);
    return { kp, dp, sp, z, i };
  });
  S.pinsIn = PZ.map((z0, i) => {      // los de la mitad de dentro: quietos (sin llave)
    const z = -z0, L = SHEAR - KH[4 - i] + 0.004; const kp = mesh(pinGeo(L, true), M.pinK); kp.position.set(0, PREST, z); inPlug.add(kp);
    const dp = mesh(pinGeo(DRV, false), M.pinD); dp.position.set(0, PREST + L, z); cut.add(dp);
    const sp = mesh(springG, M.spring); sp.position.set(0, PREST + L + DRV, z); sp.scale.y = CHTOP - (PREST + L + DRV); cut.add(sp); return kp;
  });
  // leva (gira con el rotor) en el centro
  { const s = new THREE.Shape(), c = 0.035, rr0 = 0.07, y0 = Math.sqrt(rr0 * rr0 - c * c);
    s.moveTo(c, y0); s.absarc(0, 0, rr0, Math.atan2(y0, c), Math.PI - Math.atan2(y0, c), true); s.lineTo(-c, 0.155); s.absarc(0, 0.155, c, Math.PI, 0, true); s.lineTo(c, y0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 20 }); g.translate(0, 0, -0.03);
    const cam = mesh(g, M.camM); PG.add(cam); S.cam = cam; }
  // llave (plata): hoja con los dientes arriba + cabeza con agujero; su z local es la distancia desde la punta
  {
    const KG = new THREE.Group(); PG.add(KG); S.key = KG;
    const s = new THREE.Shape(); s.moveTo(0, -0.022); s.lineTo(0.012, -0.05); s.lineTo(KLEN, -0.05); s.lineTo(KLEN, 0.062);
    for (let i = 200; i >= 0; i--) { const u = i / 200 * KLEN; s.lineTo(u, Math.max(-0.02, keyTop(u))); }
    s.lineTo(0, -0.022);
    const bg = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 4 }); bg.translate(0, 0, -0.01); bg.rotateY(-Math.PI / 2);
    KG.add(mesh(bg, M.keyM));
    for (const [v, d] of [[-0.018, 1], [-0.036, -1]]) { const gr = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.006, KLEN - 0.02), M.dark); gr.position.set(d * 0.0102, v, KLEN / 2 + 0.01); KG.add(gr); }
    const hs = new THREE.Shape(), hw = 0.3, hh = 0.25; hs.moveTo(KLEN, -0.08); hs.lineTo(KLEN + 0.05, -hh / 2); hs.lineTo(KLEN + hw - 0.07, -hh / 2); hs.quadraticCurveTo(KLEN + hw, -hh / 2, KLEN + hw, 0); hs.quadraticCurveTo(KLEN + hw, hh / 2, KLEN + hw - 0.07, hh / 2); hs.lineTo(KLEN + 0.05, hh / 2); hs.lineTo(KLEN, 0.08); hs.lineTo(KLEN, -0.08);
    const hole = new THREE.Path(); hole.absarc(KLEN + hw - 0.075, 0, 0.034, 0, Math.PI * 2, true); hs.holes.push(hole);
    const hgk = new THREE.ExtrudeGeometry(hs, { depth: 0.026, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 3, curveSegments: 24 }); hgk.translate(0, 0, -0.013); hgk.rotateY(-Math.PI / 2);
    KG.add(mesh(hgk, M.keyM));
  }
  return CY;
}
function buildLock() {
  const root = new THREE.Group(); scene.add(root); S.root = root;
  const DG = new THREE.Group(); DG.position.copy(HING); root.add(DG);
  const DI = new THREE.Group(); DI.position.set(-HING.x, 0, -HING.z); DG.add(DI); S.DG = DG; S.DI = DI;
  // hoja de la puerta
  const slab = mesh(new THREE.BoxGeometry(8.25, 20.25, 0.5), [M.doorE, M.doorE, M.doorE, M.doorE, M.doorF, M.doorB]); slab.position.set(0.025, 10.175, 0); DI.add(slab); ghostE(slab, 0.5);
  S.ghostCasters = [slab];
  // pomo fijo (centro), mirilla y escudos del bombín
  const knob = lathe([[0, 0], [0.32, 0], [0.33, 0.03], [0.12, 0.06], [0.08, 0.2], [0.1, 0.32], [0.26, 0.42], [0.3, 0.52], [0.26, 0.6], [0, 0.62]], 48, M.brassG); knob.rotation.x = Math.PI / 2; knob.position.set(0, 11.0, 0.25); DI.add(knob); S.ghostCasters.push(knob);
  const peep = lathe([[0, 0], [0.12, 0], [0.12, 0.04], [0.07, 0.07], [0, 0.07]], 32, M.brassG); peep.rotation.x = Math.PI / 2; peep.position.set(0, 15.5, 0.25); DI.add(peep);
  for (const sd of [1, -1]) {
    const s = new THREE.Shape(); s.absarc(0, 0.08, 0.2, 0, Math.PI * 2, false); s.holes.push(euroPath(0.006));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 40 });
    const e = mesh(g, M.brassG); e.position.set(LCX, LCY, sd > 0 ? 0.25 : -0.25); if (sd < 0) e.rotation.y = Math.PI; DI.add(e); S.ghostCasters.push(e);
  }
  // cerradura de embutir: placa de fondo de la caja, aristas de la caja, frente, nuez, resbalón, cerrojo
  const LK = new THREE.Group(); DI.add(LK); S.lockG = LK;
  { const s = new THREE.Shape(); s.moveTo(3.2, 9.85); s.lineTo(4.13, 9.85); s.lineTo(4.13, 11.6); s.lineTo(3.2, 11.6); s.lineTo(3.2, 9.85);
    const eh = euroPath(0.012); eh.curves = eh.curves.map(c => { const cc = c.clone(); if (cc.aX !== undefined) { cc.aX += LCX; cc.aY += LCY; } else for (const k of ['v1', 'v2', 'v0', 'v3']) if (cc[k]) cc[k].add(new THREE.Vector2(LCX, LCY)); return cc; }); s.holes.push(eh);
    const hh = new THREE.Path(); hh.absarc(3.55, 11.35, 0.15, 0, Math.PI * 2, true); s.holes.push(hh);
    const bp = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false, curveSegments: 24 }), M.dark); bp.position.z = -0.1; LK.add(bp); S.backPlate = bp;
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.93, 1.75, 0.2), new THREE.MeshBasicMaterial({ visible: false })); cb.position.set(3.665, 10.725, 0); LK.add(cb); ghostE(cb, 0.75, 0x9fd0ff, 1.6, 'case'); S.caseBox = cb; }
  const front = mesh(new THREE.BoxGeometry(0.02, 1.95, 0.2), M.satin); front.position.set(4.14, 10.725, 0); LK.add(front); S.frontPlate = front;
  for (const y of [9.9, 11.55]) { const sc = cyl(0.03, 0.03, 0.006, M.dark, 16); sc.rotation.z = Math.PI / 2; sc.position.set(4.152, y, 0); LK.add(sc); }
  const hub = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 32), M.hubM); hub.rotation.x = Math.PI / 2; hub.position.set(3.55, 11.35, 0); LK.add(hub);
  const spin = mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), M.sideM); spin.position.set(3.55, 11.35, -0.2); LK.add(spin);
  // resbalón (latón): planta (x, z) con la cara inclinada hacia fuera (+z), extruido en altura
  { const s = new THREE.Shape(); const P = [[3.7, -0.08], [4.4, -0.08], [4.4, -0.05], [4.18, 0.08], [3.7, 0.08]]; s.moveTo(P[0][0], -P[0][1]); for (const [x, z] of P.slice(1)) s.lineTo(x, -z); s.lineTo(P[0][0], -P[0][1]);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }); g.rotateX(-Math.PI / 2);
    const LG = new THREE.Group(); LK.add(LG); S.latch = LG;
    const lm = mesh(g, M.latchM); lm.position.y = LY - 0.11; LG.add(lm); S.latchMesh = lm;
    const sp = mesh(helixGeo(0.05, 7, 0.009, 'x'), M.springL); sp.position.set(3.22, LY, 0); LK.add(sp); S.latchSpring = sp;
    // la cara inclinada, resaltada (se enciende en L8)
    const bev = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(0.22, 0.13), 0.215), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.25, 0.2).multiplyScalar(2.2), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    bev.position.set(4.29 + 0.509 * 0.009, LY, 0.015 + 0.861 * 0.009); bev.lookAt(bev.position.clone().add(v3(0.13, 0, 0.22))); LG.add(bev); S.bevel = bev; }
  // cerrojo (acero cromado) con los dientes donde empuja la leva
  { const BG = new THREE.Group(); LK.add(BG); S.bolt = BG;
    const b = rbox(0.94, 0.2, 0.12, M.boltM, 0.014); b.position.set(3.67, BY, 0); BG.add(b); S.boltMesh = b;
    for (const x of [3.483, 3.303]) { const tth = mesh(new THREE.BoxGeometry(0.04, 0.07, 0.1), M.boltM); tth.position.set(x, BY + 0.125, 0); BG.add(tth); }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.95, 1).multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    face.position.set(3.67, BY, 0.0605); face.material.color.multiplyScalar(0.4); BG.add(face); S.boltFace = face; }
  buildCylinder(DI);
  // marco, tapajuntas y pared (con el hueco), cerradero
  const JG = new THREE.Group(); root.add(JG); S.frame = JG;
  const jb = (w, h, d, x, y, z, m) => { const o = mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); JG.add(o); S.ghostCasters.push(o); return o; };
  ghostE(jb(0.4, 20.8, 1.0, 4.45, 10.4, -0.05, M.jamb), 0.35); ghostE(jb(0.4, 20.8, 1.0, -4.4, 10.4, -0.05, M.jamb), 0.25); ghostE(jb(9.25, 0.4, 1.0, 0.025, 20.6, -0.05, M.jamb), 0.25);
  jb(0.7, 21.5, 0.08, 4.6, 10.75, 0.49, M.jamb); jb(0.7, 21.5, 0.08, -4.55, 10.75, 0.49, M.jamb); jb(9.85, 0.7, 0.08, 0.025, 21.15, 0.49, M.jamb);
  jb(11.35, 30, 1.0, 10.325, 15, -0.05, M.wall); jb(11.4, 30, 1.0, -10.3, 15, -0.05, M.wall); jb(9.25, 9.2, 1.0, 0.025, 25.4, -0.05, M.wall);
  M.strike.side = THREE.DoubleSide; const strike = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.3), M.strike); strike.rotation.y = -Math.PI / 2; strike.position.set(JX - 0.0015, 10.65, 0); JG.add(strike);
  // el interior de la casa (luz cálida que se ve por la rendija y al abrir)
  const ins = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), M.inside); ins.position.set(0, 12, -9.5); root.add(ins); S.inside = ins;
  // tapas del corte (planta): puerta (gira con ella), marco y pared
  { const c1 = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 0.5), M.capWood); c1.rotation.x = -Math.PI / 2; c1.position.set(-0.75, 0, 0); DI.add(c1);
    const c2t = canvasTex(1240, 400, (g, w, h) => { const X = x => (x - 2.6) / 1.55 * w, Z = z => (z + 0.25) / 0.5 * h;
      hatch(g, 0, 0, w, h, '#3b2a1c', '#56402c', 12); g.clearRect(X(3.2), Z(-0.1), X(4.15) - X(3.2) + 2, Z(0.1) - Z(-0.1));
      g.fillStyle = '#9aa2ac'; g.fillRect(X(3.2), Z(-0.1), X(4.13) - X(3.2), 9); g.fillRect(X(3.2), Z(0.1) - 9, X(4.13) - X(3.2), 9); g.fillRect(X(3.2), Z(-0.1), 9, Z(0.1) - Z(-0.1));
      g.fillStyle = '#c4cad2'; g.fillRect(X(4.13), Z(-0.1), X(4.15) - X(4.13) + 1, Z(0.1) - Z(-0.1));
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2); });
    const c2 = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.5), new THREE.MeshStandardMaterial({ map: c2t, transparent: true, alphaTest: 0.5, roughness: 0.8 })); c2.rotation.x = -Math.PI / 2; c2.position.set(3.375, 0, 0); DI.add(c2);
    const c3t = canvasTex(1100, 440, (g, w, h) => { const X = x => (x - 4.25) / 2.75 * w, Z = z => (z + 0.55) / 1.1 * h;
      g.clearRect(0, 0, w, h); hatch(g, X(4.25), Z(-0.55), X(4.65) - X(4.25), Z(0.45) - Z(-0.55), '#2e2a26', '#4a443d', 12, -1);
      hatch(g, X(4.25), Z(0.45), X(4.95) - X(4.25), Z(0.53) - Z(0.45), '#2e2a26', '#4a443d', 8, -1);
      g.fillStyle = '#1f1f21'; g.fillRect(X(4.65), Z(-0.55), w - X(4.65), Z(0.45) - Z(-0.55)); for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(20,18,16,.5)'; g.fillRect(X(4.65) + hash(i * 1.7) * (w - X(4.65)), Z(-0.55) + hash(i * 2.9) * (Z(0.45) - Z(-0.55)), 3, 3); }
      g.clearRect(X(JX), Z(-0.095), X(4.47) - X(JX), Z(0.095) - Z(-0.095));
      g.fillStyle = '#c4cad2'; g.fillRect(X(JX) - 3, Z(-0.15), 6, Z(0.15) - Z(-0.15));
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3; g.strokeRect(X(4.25), Z(-0.55), X(4.65) - X(4.25), Z(0.45) - Z(-0.55)); });
    const c3 = new THREE.Mesh(new THREE.PlaneGeometry(2.75, 1.1), new THREE.MeshStandardMaterial({ map: c3t, transparent: true, alphaTest: 0.5, roughness: 0.85 })); c3.rotation.x = -Math.PI / 2; c3.position.set(5.625, 0, 0); root.add(c3);
    const c4 = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 1.0), M.capWall); c4.rotation.x = -Math.PI / 2; c4.position.set(11.5, 0, -0.05); root.add(c4);
    S.caps = [c1, c2, c3, c4]; for (const c of S.caps) { c.visible = false; c.renderOrder = 1; } }
  buildFilm(root);
  // todo lo de la puerta se puede cortar con el plano horizontal (vista en planta)
  S.clipPl = new THREE.Plane(v3(0, -1, 0), CLIPOFF);
  root.traverse(o => { if (!o.material) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { m.clippingPlanes = [S.clipPl]; m.clipShadows = true; } });
  for (const c of S.caps) c.material.clippingPlanes = [];
  S.filmLine.material.clippingPlanes = [];
}

// ---------------------------------------------------------------- la radiografía (cinta que se dobla: entra recta por la rendija y fuera se curva hacia la derecha)
const FILM = { L: 2.3, y0: 9.55, y1: 12.35, n: 120 };
function buildFilm(root) {
  const n = FILM.n, geo = new THREE.BufferGeometry(), pos = new Float32Array((n + 1) * 6), uv = new Float32Array((n + 1) * 4), idx = [];
  for (let i = 0; i <= n; i++) { uv.set([i / n, 0, i / n, 1], i * 4); if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const tex = xrayTex(); tex.wrapS = THREE.ClampToEdgeWrapping;
  const m = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.38, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.94, side: THREE.DoubleSide, depthWrite: false });
  const f = new THREE.Mesh(geo, m); f.frustumCulled = false; f.renderOrder = 6; root.add(f); S.film = f; f.visible = false;
  const lm = lineMat(0xbfe8ff, 8, 1); lm.color.multiplyScalar(2.2); const lg = new LineGeometry(); lg.setPositions(new Float32Array(6 * 3));
  const ln = new Line2(lg, lm); ln.frustumCulled = false; ln.renderOrder = 8; ln.visible = false; root.add(ln); S.filmLine = ln;
}
// st = { zTip, a (ángulo de la curva), off (Vector3), flex, buck, t }
function filmPts(st, n, y) {
  const R = 0.32, ZB = 0.62, a = Math.max(0.02, ZB - st.zTip), arc = R * st.a, out = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n * FILM.L; let x, z, tx, tz;
    if (s <= a) { x = GX; z = st.zTip + s; tx = 0; tz = 1; x += (st.buck || 0) * Math.sin(Math.PI * s / a); }
    else if (s <= a + arc) { const p = (s - a) / R; x = GX + R - R * Math.cos(p); z = st.zTip + a + R * Math.sin(p); tx = Math.sin(p); tz = Math.cos(p); }
    else { const e = s - a - arc; x = GX + R - R * Math.cos(st.a) + e * Math.sin(st.a); z = st.zTip + a + R * Math.sin(st.a) + e * Math.cos(st.a); tx = Math.sin(st.a); tz = Math.cos(st.a);
      const u = e / Math.max(0.01, FILM.L - a - arc), w = (st.flex || 0) * Math.sin(Math.PI * u) * Math.sin(st.t * 7.5 - u * 2.5); x += tz * w; z -= tx * w; }
    out.push([x + st.off.x, y, z + st.off.z]);
  }
  return out;
}
function filmSet(st, clipY) {
  const f = S.film, p = f.geometry.attributes.position.array, n = FILM.n;
  const A = filmPts(st, n, 0); S.filmA = A;
  for (let i = 0; i <= n; i++) { const [x, , z] = A[i]; p.set([x, FILM.y0 + st.off.y, z, x, FILM.y1 + st.off.y, z], i * 6); }
  f.geometry.attributes.position.needsUpdate = true; f.geometry.computeVertexNormals(); f.geometry.computeBoundingSphere();
  if (clipY < FILM.y1) { const B = filmPts(st, 60, clipY + 0.004); S.filmLine.geometry.setPositions(new Float32Array(B.flat())); S.filmLine.computeLineDistances(); }
}

// ---------------------------------------------------------------- las 200 casas (20 × 10): de noche, con la puerta que se enciende en rojo
function buildHouses() {
  const G = new THREE.Group(); G.position.copy(HZC); scene.add(G); S.houses = G; G.visible = false;
  const NX = 20, NZ = 10, N = NX * NZ, SP = 1.75;
  const bodyM = new THREE.MeshStandardMaterial({ color: 0x8f8a82, roughness: 0.85 }), roofM = new THREE.MeshPhysicalMaterial({ color: 0x4a2418, roughness: 0.6, clearcoat: 0.3 });
  const roofG = (() => { const s = new THREE.Shape(); s.moveTo(-0.6, 0); s.lineTo(0.6, 0); s.lineTo(0, 0.5); s.lineTo(-0.6, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: false }); g.translate(0, 0, -0.5); return g; })();
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, 0.8, 0.9), bodyM, N), roof = new THREE.InstancedMesh(roofG, roofM, N);
  const doorM = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), winM = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const door = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.26, 0.42), doorM, N), win = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.18), winM, N * 2);
  body.castShadow = roof.castShadow = true; body.receiveShadow = roof.receiveShadow = true;
  const H = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, x = (i - (NX - 1) / 2) * SP + (hash(k * 3.1) - 0.5) * 0.35, z = -j * SP + (hash(k * 5.7) - 0.5) * 0.35, ry = (hash(k * 7.7) - 0.5) * 0.35, s = 0.85 + hash(k * 9.1) * 0.3;
    const sy = 0.9 + hash(k * 2.3) * 0.25; q.setFromEuler(new THREE.Euler(0, ry, 0)); sc.set(s, s * sy, s);
    m4.compose(v3(x, 0.4 * sc.y, z), q, sc); body.setMatrixAt(k, m4);
    m4.compose(v3(x, 0.8 * sc.y, z), q, v3(s, sc.y, s * 1.05)); roof.setMatrixAt(k, m4);
    H.push({ x, z, ry, s, sy, d: Math.hypot(x, z + 6) + hash(k * 4.4) * 3 });
    door.setColorAt(k, new THREE.Color(0.06, 0.035, 0.02));
    for (let w = 0; w < 2; w++) win.setColorAt(k * 2 + w, new THREE.Color(1.0, 0.72, 0.38).multiplyScalar(hash(k * 2 + w) > 0.35 ? 1.6 : 0.05));
  }
  const poolT = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolT, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), N);
  for (let k = 0; k < N; k++) pool.setColorAt(k, new THREE.Color(0, 0, 0));
  const alarm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), N); for (let k = 0; k < N; k++) alarm.setColorAt(k, new THREE.Color(0, 0, 0)); G.add(alarm); S.alarm = alarm;
  G.add(body, roof, door, win, pool); S.H = { body, roof, door, win, pool, H, N };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.9 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0.002, -8); ground.receiveShadow = true; G.add(ground);
}
function housesAt(t, burn) {      // burn(h, k) = 0..1: puerta abierta y luz roja
  const { door, win, H } = S.H, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  const W = (h, lx, lz) => v3(h.x + lx * Math.cos(h.ry) + lz * Math.sin(h.ry), 0, h.z - lx * Math.sin(h.ry) + lz * Math.cos(h.ry));
  H.forEach((h, k) => {
    const b = burn(h, k), s = h.s, fl = b > 0.99 ? 0.85 + 0.15 * Math.sin(t * 13 + k) : 1;
    const p = W(h, 0, 0.453 * s); p.y = 0.21 * s * h.sy;
    q.setFromEuler(new THREE.Euler(0, h.ry, 0)); m4.compose(p, q, v3(s, s * h.sy, 1)); door.setMatrixAt(k, m4);
    c.setRGB(lerp(0.05, 4.2 * fl, b), lerp(0.03, 0.3 * fl, b), lerp(0.02, 0.18 * fl, b)); door.setColorAt(k, c);
    q.setFromEuler(new THREE.Euler(0, h.ry, 0));
    for (let w = 0; w < 2; w++) { const pw = W(h, (w ? 0.3 : -0.3) * s, 0.452 * s); pw.y = 0.55 * s * h.sy; m4.compose(pw, q, v3(s, s, 1)); win.setMatrixAt(k * 2 + w, m4); }
  });
  H.forEach((h, k) => { const b = burn(h, k), p = W(h, 0, 0.75 * h.s); p.y = 0.01; m4.compose(p, q.setFromEuler(new THREE.Euler(0, 0, 0)), v3(h.s, 1, h.s)); S.H.pool.setMatrixAt(k, m4); S.H.pool.setColorAt(k, c.setRGB(1.6 * b, 0.12 * b, 0.06 * b)); });
  H.forEach((h, k) => { const b = burn(h, k), fl = 0.6 + 0.4 * Math.sin(t * 17 + k * 1.7); m4.compose(v3(h.x, (0.8 + 0.5) * h.s * h.sy + 0.06, h.z), q.setFromEuler(new THREE.Euler(0, 0, 0)), v3(1, 1, 1)); S.alarm.setMatrixAt(k, m4); S.alarm.setColorAt(k, c.setRGB(b * 5 * fl, b * 0.35 * fl, b * 0.25 * fl)); });
  S.alarm.instanceMatrix.needsUpdate = true; S.alarm.instanceColor.needsUpdate = true;
  S.H.pool.instanceMatrix.needsUpdate = true; S.H.pool.instanceColor.needsUpdate = true;
  door.instanceMatrix.needsUpdate = true; door.instanceColor.needsUpdate = true; win.instanceMatrix.needsUpdate = true;
}
