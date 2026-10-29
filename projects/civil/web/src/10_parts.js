// ---------------------------------------------------------------- zonas (metros): A plano (puente, casa, ley, mazo, «?»), B duelo, C suelo + Pisa + puente con tren,
// D presa → mapa de España (E: polideportivo y casa sobre el mapa), F el libro de la ley con sus edificios
const ZA = v3(0, 0, 0), BRX = v3(-1.0, 0, -0.2), HSX = v3(1.55, 0, 0.35);
const ZB = v3(6, 0, -4.5), ZC = v3(11.5, 0, -9), ZD = v3(17.6, 0, -13.4), ZF = v3(21.4, 0, -17.6);
const QPOS = v3(-0.25, 0.55, -1.45);

// ---------------------------------------------------------------- el plano (hoja gigante con rejilla, cotas y cajetín)
const SHW = 7, SHH = 4.2, SPX = 2048 / SHW;
function buildSheet() {
  const sx = x => (x + SHW / 2) * SPX, sz = z => (z + SHH / 2) * SPX;
  const tex = canvasTex(2048, Math.round(SHH * SPX), (g, w, h) => {
    g.fillStyle = '#0b1016'; g.fillRect(0, 0, w, h);
    for (let x = 0; x <= w; x += SPX / 20) { g.fillStyle = Math.round(x / (SPX / 20)) % 5 ? 'rgba(160,190,220,.07)' : 'rgba(160,190,220,.16)'; g.fillRect(x, 0, 1.2, h); }
    for (let y = 0; y <= h; y += SPX / 20) { g.fillStyle = Math.round(y / (SPX / 20)) % 5 ? 'rgba(160,190,220,.07)' : 'rgba(160,190,220,.16)'; g.fillRect(0, y, w, 1.2); }
    g.strokeStyle = 'rgba(230,236,242,.55)'; g.lineWidth = 3; g.strokeRect(24, 24, w - 48, h - 48); g.lineWidth = 1.5; g.strokeRect(36, 36, w - 72, h - 72);
    // cajetín
    const cx = w - 560, cy = h - 230; g.strokeRect(cx, cy, 524, 194); g.beginPath(); g.moveTo(cx, cy + 70); g.lineTo(cx + 524, cy + 70); g.moveTo(cx, cy + 132); g.lineTo(cx + 524, cy + 132); g.moveTo(cx + 300, cy + 70); g.lineTo(cx + 300, cy + 194); g.stroke();
    g.fillStyle = 'rgba(230,236,242,.75)'; g.font = '700 34px SpaceMono, monospace'; g.fillText('PROYECTO Nº 01', cx + 22, cy + 48);
    g.font = '400 24px SpaceMono, monospace'; g.fillText('PUENTE · VIVIENDA', cx + 22, cy + 110); g.fillText('E 1:100', cx + 322, cy + 110); g.fillText('FIRMA: ______', cx + 22, cy + 172); g.fillText('HOJA 1/1', cx + 322, cy + 172);
    // cotas del puente y de la casa (dibujo tenue)
    g.strokeStyle = 'rgba(230,236,242,.35)'; g.lineWidth = 2; g.setLineDash([14, 10]);
    g.beginPath(); g.moveTo(sx(BRX.x - 1), sz(BRX.z + 0.55)); g.lineTo(sx(BRX.x + 1), sz(BRX.z + 0.55)); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(230,236,242,.32)'; g.font = '400 19px SpaceMono, monospace'; g.textAlign = 'center'; g.fillText('L = 40,00 m', sx(BRX.x), sz(BRX.z + 0.55) - 14);
    g.strokeRect(sx(HSX.x - 0.3), sz(HSX.z - 0.25), 0.6 * SPX, 0.5 * SPX); g.fillText('VIVIENDA', sx(HSX.x), sz(HSX.z + 0.38));
    g.textAlign = 'left'; g.fillText('ALZADO', sx(BRX.x - 1.05), sz(BRX.z - 0.5));
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(230,236,242,.22)'; g.fillRect(70, 80 + i * 34, 220 + (i * 53) % 170, 3); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SHW, SHH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55 }));
  m.rotation.x = -Math.PI / 2; m.position.set(ZA.x, 0.003, ZA.z); m.receiveShadow = true; scene.add(m);
  return m;
}

// ---------------------------------------------------------------- el puente de arco (sale del plano como un libro desplegable)
const ARC_R = 1.7225, ARC_C = -1.4025, ARC_P0 = Math.asin(1 / ARC_R);           // arco circular: cuerda 2 m, flecha 0,32 m
const arcXY = s => [ARC_R * Math.sin(s), ARC_C + ARC_R * Math.cos(s)];
function buildBridge() {
  const G = new THREE.Group(); G.position.copy(BRX); scene.add(G);
  // arco (dovelas) en un grupo que gira desde el papel (bisagra en y = 0)
  const arch = new THREE.Group(); G.add(arch);
  const NS = 18;
  for (let i = 0; i < NS; i++) {
    const s0 = -ARC_P0 + (2 * ARC_P0) * i / NS, s1 = -ARC_P0 + (2 * ARC_P0) * (i + 1) / NS, [x0, y0] = arcXY(s0), [x1, y1] = arcXY(s1);
    const L = Math.hypot(x1 - x0, y1 - y0) * 1.01, b = bx(L, 0.04, 0.18, DARK, 1.4); b.position.set((x0 + x1) / 2, (y0 + y1) / 2 + 0.02, 0); b.rotation.z = Math.atan2(y1 - y0, x1 - x0); arch.add(b);
  }
  // tablero, montantes y estribos: crecen desde el papel
  const deck = new THREE.Group(); G.add(deck);
  const dk = bx(2.36, 0.04, 0.26, DARK2, 1.6); dk.position.y = 0.36; deck.add(dk);
  for (const x of [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75]) { const ya = arcXY(Math.asin(x / ARC_R))[1] + 0.04, h = 0.34 - ya; if (h < 0.02) continue; const p = bx(0.026, h, 0.14, DARK, 1.2); p.position.set(x, ya + h / 2, 0); deck.add(p); }
  const rails = segSet(2 + 2 * 25, EDGE, 1.4, 0.9); deck.add(rails);
  let k = 0; for (const z of [-0.12, 0.12]) { rails.userData.set(k++, v3(-1.18, 0.43, z), v3(1.18, 0.43, z)); for (let i = 0; i < 25; i++) { const x = -1.15 + i * 2.3 / 24; rails.userData.set(k++, v3(x, 0.38, z), v3(x, 0.43, z)); } } rails.userData.flush();
  const ab = []; for (const sx of [-1, 1]) { const a = bx(0.18, 0.38, 0.32, DARK2, 1.5); a.position.set(sx * 1.22, 0.19, 0); G.add(a); ab.push(a); }
  // la línea del arco en el papel (la dibuja el compás)
  const pts = []; for (let i = 0; i <= 90; i++) { const s = -ARC_P0 + 2 * ARC_P0 * i / 90, [x, y] = arcXY(s); pts.push(v3(BRX.x + x, 0.006, BRX.z - y)); }
  const line = drawLine(pts, 0xffffff, 3.6, 1); scene.add(line);
  return { G, arch, deck, ab, line, dk };
}
// el compás gigante (dos patas, cabeza y mango)
function buildCompass() {
  const G = new THREE.Group(); scene.add(G);
  const M = new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.35, metalness: 0.8 });
  const legA = new THREE.Group(), legB = new THREE.Group(); G.add(legA, legB);
  const LG = 1.3;
  for (const L of [legA, legB]) { const c = cyl(0.016, 0.011, LG, M, 12); c.position.y = -LG / 2; L.add(c); const tip = cyl(0.0, 0.011, 0.06, M, 8); tip.position.y = -LG - 0.03; L.add(tip); }
  const head = cyl(0.045, 0.045, 0.06, M, 20); head.rotation.x = Math.PI / 2; G.add(head);
  const grip = cyl(0.016, 0.016, 0.16, M, 12); grip.position.y = 0.11; G.add(grip);
  const lead = sph(0.016, basicGlow(0xffffff, 3.2)); legB.add(lead); lead.position.y = -LG - 0.055;
  return { G, legA, legB, LG };
}
// ---------------------------------------------------------------- la casa (con ventana de verdad y habitación dentro)
function buildHouse(withRoom) {
  const G = new THREE.Group(), P = new THREE.Group(); G.add(P);            // P: bisagra en la arista trasera (para desplegarla)
  const w = 0.46, d = 0.38, h = 0.27, wt = 0.012, wx = 0.08, wy = 0.15, ww = 0.12, wh = 0.095;
  const B = new THREE.Group(); B.position.z = d / 2; P.add(B); P.position.z = -d / 2;
  const fz = d / 2 - wt / 2, M = DARK2;
  const wall = (W_, H_, x, y) => { const b = bx(W_, H_, wt, M, 1.4); b.position.set(x, y, fz); B.add(b); };
  // fachada con el hueco de la ventana
  wall(w / 2 + wx - ww / 2, h, -w / 2 + (w / 2 + wx - ww / 2) / 2, h / 2);
  wall(w / 2 - wx - ww / 2, h, w / 2 - (w / 2 - wx - ww / 2) / 2, h / 2);
  wall(ww, wy - wh / 2, wx, (wy - wh / 2) / 2); wall(ww, h - wy - wh / 2, wx, (h + wy + wh / 2) / 2);
  for (const [W_, D_, x, z] of [[w, wt, 0, -d / 2 + wt / 2], [wt, d, -w / 2 + wt / 2, 0], [wt, d, w / 2 - wt / 2, 0]]) { const b = bx(W_, h, D_, M, 1.4); b.position.set(x, h / 2, z); B.add(b); }
  // tejado a dos aguas
  const rs = new THREE.Shape(); rs.moveTo(-w / 2 - 0.03, 0); rs.lineTo(w / 2 + 0.03, 0); rs.lineTo(0, 0.17); rs.closePath();
  const rg = new THREE.ExtrudeGeometry(rs, { depth: d + 0.06, bevelEnabled: false }); rg.translate(0, 0, -(d + 0.06) / 2);
  const roof = solid(rg, DARK, 1.5); roof.position.y = h; B.add(roof);
  const door = bx(0.075, 0.13, 0.006, DARK, 1.2); door.position.set(-0.12, 0.065, d / 2 + 0.002); B.add(door);
  // marco y cruz de la ventana
  const fr = segSet(6, EDGE, 1.8, 1); B.add(fr);
  const zf = d / 2 + 0.003, X0 = wx - ww / 2, X1 = wx + ww / 2, Y0 = wy - wh / 2, Y1 = wy + wh / 2;
  [[X0, Y0, X1, Y0], [X1, Y0, X1, Y1], [X1, Y1, X0, Y1], [X0, Y1, X0, Y0], [wx, Y0, wx, Y1], [X0, wy, X1, wy]].forEach((q, i) => fr.userData.set(i, v3(q[0], q[1], zf), v3(q[2], q[3], zf))); fr.userData.flush();
  const R = { G, P, B, win: v3(wx, wy, d / 2), w, d, h };
  if (withRoom) {
    const room = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * wt - 0.002, h - 0.002, d - 2 * wt - 0.002), new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 1, side: THREE.BackSide }));
    room.position.set(0, h / 2, 0); room.receiveShadow = true; B.add(room);
    const WOOD = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.8 }), SHEET = new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.95 }), BLANK = new THREE.MeshStandardMaterial({ color: 0x5f6f86, roughness: 0.95 });
    const bed = new THREE.Group(); bed.position.set(0.06, 0, -0.07); B.add(bed);
    const frame = rbox(0.24, 0.13, 0.04, WOOD, 0.006); frame.rotation.x = -Math.PI / 2; frame.position.y = 0.03; bed.add(frame);
    const mat_ = rbox(0.23, 0.12, 0.022, SHEET, 0.008); mat_.rotation.x = -Math.PI / 2; mat_.position.y = 0.06; bed.add(mat_);
    const head = rbox(0.01, 0.14, 0.09, WOOD, 0.004); head.position.set(-0.122, 0.07, 0); head.rotation.y = Math.PI / 2; head.rotation.y = 0; head.scale.set(1, 1, 1); bed.add(head);
    const pillow = rbox(0.05, 0.08, 0.016, SHEET, 0.007); pillow.rotation.x = -Math.PI / 2; pillow.position.set(-0.088, 0.078, 0); bed.add(pillow);
    const blanket = new THREE.Group(); blanket.position.set(0.035, 0.072, 0); bed.add(blanket);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), BLANK); bl.scale.set(0.085, 0.022, 0.058); bl.castShadow = true; blanket.add(bl);
    const SKIN = new THREE.MeshStandardMaterial({ color: 0xc9a58a, roughness: 0.7 }), HAIR = new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.8 });
    const hd = sph(0.019, SKIN, 20, 14); hd.position.set(-0.078, 0.098, 0.004); bed.add(hd);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.0208, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), HAIR); hair.position.copy(hd.position); hair.rotation.z = Math.PI / 2 + 0.55; bed.add(hair);
    const LID = new THREE.MeshBasicMaterial({ color: 0x3a2a22 });
    for (const z of [-0.0068, 0.0068]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.0055, 0.0008, 0.0016), LID); e.position.set(hd.position.x + 0.006, hd.position.y + 0.0182, hd.position.z + z); e.rotation.z = -0.35; bed.add(e); }
    const nose = sph(0.0032, SKIN, 10, 8); nose.position.set(hd.position.x + 0.011, hd.position.y + 0.0175, hd.position.z); bed.add(nose);
    const ns = rbox(0.04, 0.04, 0.05, WOOD, 0.004); ns.rotation.x = -Math.PI / 2; ns.position.set(-0.17, 0.025, -0.11); B.add(ns);
    const lamp = sph(0.012, basicGlow(0xffc070, 2.2)); lamp.position.set(-0.17, 0.075, -0.11); B.add(lamp);
    const shade = cyl(0.012, 0.02, 0.022, new THREE.MeshStandardMaterial({ color: 0xf0e2c8, emissive: 0xffb860, emissiveIntensity: 0.9, side: THREE.DoubleSide }), 16); shade.position.copy(lamp.position).add(v3(0, 0.01, 0)); B.add(shade);
    const pic = textPlane(0.07, 0.05, (g, w_, h_) => { g.fillStyle = '#20252c'; g.fillRect(0, 0, w_, h_); g.strokeStyle = '#d8d0c0'; g.lineWidth = 10; g.strokeRect(5, 5, w_ - 10, h_ - 10); g.strokeStyle = '#8fa3b8'; g.lineWidth = 6; g.beginPath(); g.moveTo(30, h_ - 40); g.quadraticCurveTo(w_ / 2, 30, w_ - 30, h_ - 40); g.stroke(); }, 256);
    pic.position.set(0.06, 0.19, -d / 2 + wt + 0.002); B.add(pic);
    R.blanket = blanket; R.head = hd; R.lamp = lamp; R.bedW = () => bed.localToWorld(v3(-0.07, 0.11, 0));
  }
  return R;
}
// ---------------------------------------------------------------- el libro de la ley (cerrado o abierto: tapa con bisagra en el lomo)
function buildBook(s = 1) {
  const G = new THREE.Group(); G.scale.setScalar(s);
  const w = 0.42, d = 0.58, t = 0.014, pg = 0.05;
  const coverTex = canvasTex(420, 580, (g, W_, H_) => { g.fillStyle = '#1a1f27'; g.fillRect(0, 0, W_, H_); g.strokeStyle = '#d8c48a'; g.lineWidth = 6; g.strokeRect(22, 22, W_ - 44, H_ - 44); g.lineWidth = 2; g.strokeRect(34, 34, W_ - 68, H_ - 68);
    g.fillStyle = '#e8d9a8'; g.textAlign = 'center'; g.font = '700 62px Inter'; g.fillText('LEY', W_ / 2, 190); g.font = '900 64px Inter'; g.fillText('38/1999', W_ / 2, 262);
    g.font = '500 25px Inter'; g.fillText('DE ORDENACIÓN', W_ / 2, 350); g.fillText('DE LA EDIFICACIÓN', W_ / 2, 384); g.font = '500 20px SpaceMono'; g.fillText('5 DE NOVIEMBRE', W_ / 2, 500); });
  const CM = new THREE.MeshStandardMaterial({ color: 0x1a1f27, roughness: 0.6 }), PM = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 });
  const back = bx(w, t, d, CM, 1.4); back.position.set(w / 2, t / 2, 0); G.add(back);
  const pagesR = bx(w - 0.02, pg, d - 0.03, PM, 1.0); pagesR.position.set(w / 2, t + pg / 2, 0); G.add(pagesR);
  // página derecha (se ve con el libro abierto): artículo 10
  const pageTex = canvasTex(420, 560, (g, W_, H_) => { g.fillStyle = '#e4ded0'; g.fillRect(0, 0, W_, H_); g.fillStyle = '#2b2f36'; g.font = '700 26px Inter'; g.fillText('Artículo 10', 36, 64); g.font = '500 17px Inter';
    const L = ['El proyectista.', '', '2.a) Cuando el proyecto tenga por', 'objeto edificios de uso administrativo,', 'sanitario, religioso, residencial en', 'todas sus formas, docente y cultural,', 'la titulación académica y profesional', 'habilitante será la de', '', '']; L.forEach((s_, i) => g.fillText(s_, 36, 110 + i * 30));
    g.font = '900 34px Inter'; g.fillText('ARQUITECTO.', 36, 110 + 8 * 30 + 6); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(43,47,54,.35)'; g.fillRect(36, 420 + i * 22, 300 + (i * 37) % 50, 7); } });
  const page = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.03, d - 0.04), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.95 })); page.rotation.x = -Math.PI / 2; page.position.set(w / 2, t + pg + 0.0015, 0); page.receiveShadow = true; G.add(page);
  // mitad izquierda (tapa + páginas) construida abierta, en x < 0; gira sobre el lomo con la bisagra a media altura de las páginas:
  // con rotation.z = -π queda cerrada encima (la tapa arriba, con su portada mirando hacia arriba)
  const yp = t + pg / 2, hinge = new THREE.Group(); hinge.position.y = yp; G.add(hinge);
  const cv = bx(w, t, d, CM, 1.4); cv.position.set(-w / 2, t / 2 - yp, 0); hinge.add(cv);
  const pagesL = bx(w - 0.02, pg, d - 0.03, PM, 1.0); pagesL.position.set(-w / 2, 0, 0); hinge.add(pagesL);
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.03, d - 0.04), new THREE.MeshStandardMaterial({ color: 0xe4ded0, roughness: 0.95 })); lp.rotation.x = -Math.PI / 2; lp.position.set(-w / 2, pg / 2 + 0.0015, 0); hinge.add(lp);
  const ct = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.01, d - 0.01), new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: coverTex, emissiveIntensity: 0.25 }));
  ct.rotation.x = Math.PI / 2; ct.rotation.z = Math.PI; ct.position.set(-w / 2, -yp - 0.0015, 0); hinge.add(ct);
  const spine = bx(t * 1.2, pg + 2 * t, d, CM, 1.2); spine.position.set(-t * 0.4, (pg + 2 * t) / 2, 0); G.add(spine);
  hinge.userData.pagesL = pagesL; hinge.userData.lp = lp;
  return { G, hinge, page, w, d, top: t + pg + t };
}
// ---------------------------------------------------------------- el mazo del Supremo y su base
function buildGavel() {
  const G = new THREE.Group(); scene.add(G);
  const WD = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.55, metalness: 0.05 }), GD = new THREE.MeshStandardMaterial({ color: 0xc9a85a, roughness: 0.35, metalness: 0.7 });
  const base = cyl(0.11, 0.12, 0.035, WD, 32); base.position.y = 0.0175; G.add(base); edges(base, EDGE, 1, 40, 0.5);
  const arm = new THREE.Group(); arm.position.set(0.36, 0.083, 0); G.add(arm);            // pivote: el extremo del mango
  const handle = cyl(0.011, 0.014, 0.32, WD, 14); handle.rotation.z = Math.PI / 2; handle.position.x = -0.16; arm.add(handle);
  const head = cyl(0.048, 0.048, 0.17, WD, 24); head.rotation.x = Math.PI / 2; head.position.x = -0.36; arm.add(head);
  for (const z of [-0.07, 0.07]) { const r = cyl(0.05, 0.05, 0.014, GD, 24); r.rotation.x = Math.PI / 2; r.position.set(-0.36, 0, z); arm.add(r); }
  return { G, arm, base };
}
// ---------------------------------------------------------------- «?» de celosía (dos cordones + montantes y diagonales); las barras vuelan desde el puente
function buildQ() {
  const C = [];      // línea media en el plano (u, v), unidades ≈ m
  for (let i = 0; i <= 26; i++) { const a = Math.PI * 1.0 - i / 26 * Math.PI * 1.45; C.push([0.25 * Math.cos(a), 0.62 + 0.25 * Math.sin(a)]); }
  const [ex, ey] = C[C.length - 1]; for (let i = 1; i <= 6; i++) { const u = i / 6; C.push([lerp(ex, 0, u), lerp(ey, 0.22, u)]); }
  const N = C.length, off = 0.04, top = [], bot = [];
  for (let i = 0; i < N; i++) { const a = C[Math.max(0, i - 1)], b = C[Math.min(N - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1, nx = -ty / L, ny = tx / L;
    top.push(v3(C[i][0] + nx * off, C[i][1] + ny * off, 0)); bot.push(v3(C[i][0] - nx * off, C[i][1] - ny * off, 0)); }
  const S_ = [];
  for (let i = 0; i < N - 1; i++) { S_.push([top[i], top[i + 1]], [bot[i], bot[i + 1]], [top[i], bot[i]], [i % 2 ? top[i] : bot[i], i % 2 ? bot[i + 1] : top[i + 1]]); }
  S_.push([top[N - 1], bot[N - 1]]);
  // el punto: un cubito de celosía
  const c = v3(0, 0.02, 0), h = 0.05; const q = [[-h, -h], [h, -h], [h, h], [-h, h]];
  for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4]; S_.push([v3(c.x + a[0], c.y + a[1], -h), v3(c.x + b[0], c.y + b[1], -h)], [v3(c.x + a[0], c.y + a[1], h), v3(c.x + b[0], c.y + b[1], h)], [v3(c.x + a[0], c.y + a[1], -h), v3(c.x + a[0], c.y + a[1], h)]); }
  const segs = segSet(S_.length, EDGE, 2.6, 1); scene.add(segs);
  // de dónde sale cada barra: un punto del puente
  const from = S_.map((s, i) => { const u = hash(i * 3.7), x = BRX.x - 1.1 + u * 2.2, y = 0.05 + hash(i * 1.9) * 0.4; return [v3(x, y, BRX.z + (hash(i * 5.3) - 0.5) * 0.25), v3(x + (hash(i * 2.2) - 0.5) * 0.2, y + 0.06, BRX.z + 0.05)]; });
  return { segs, S: S_, from, n: S_.length, dotFrom: S_.length - 12 };
}
// ---------------------------------------------------------------- el duelo: fachada que dibuja un lápiz (Arquitectura) y viga con su ley de momentos (Caminos)
function buildDuel() {
  const G = new THREE.Group(); G.position.copy(ZB); scene.add(G);
  // fachada (Arquitectura): polilíneas en orden de dibujo; el lápiz sigue la punta
  const F = new THREE.Group(); G.add(F);                                   // abajo: Arquitectura (en el suelo)
  const fw = 0.66, fh = 0.52, polys = [];
  polys.push([[-fw / 2, 0], [-fw / 2, fh], [0, fh + 0.2], [fw / 2, fh], [fw / 2, 0], [-fw / 2, 0]]);
  const winR = [];
  for (const r of [0, 1]) for (const c of [-1, 0, 1]) { if (r === 0 && c === 0) continue; const x = c * 0.2, y = 0.12 + r * 0.22, a = 0.06, b = 0.07; polys.push([[x - a, y], [x + a, y], [x + a, y + b * 1.3], [x - a, y + b * 1.3], [x - a, y]]); winR.push([x, y + b * 0.65, a * 2, b * 1.3]); }
  polys.push([[-0.05, 0], [-0.05, 0.17], [0.05, 0.17], [0.05, 0]]);
  polys.push([[-0.07, fh + 0.07], [0.07, fh + 0.07], [0.07, fh + 0.12], [-0.07, fh + 0.12], [-0.07, fh + 0.07]]);
  const pts = []; polys.forEach(p => { for (let i = 0; i + 1 < p.length; i++) pts.push([p[i], p[i + 1]]); });
  const fl = segSet(pts.length, TEAL, 2.4, 1); F.add(fl); pts.forEach((s, i) => fl.userData.set(i, v3(s[0][0], s[0][1], 0), v3(s[1][0], s[1][1], 0))); fl.userData.flush();
  // ventanas que se encienden (y una silueta en cada una)
  const lit = winR.map(([x, y, w, h], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.9), new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); m.position.set(x, y, -0.002); F.add(m); return m; });
  const people = winR.map(([x, y, w, h], i) => { const p = textPlane(w * 0.8, h * 0.85, (g, W_, H_) => { g.fillStyle = 'rgba(25,20,16,.9)'; g.beginPath(); g.arc(W_ * 0.5, H_ * 0.38, H_ * 0.16, 0, 7); g.fill(); g.beginPath(); g.ellipse(W_ * 0.5, H_ * 0.95, W_ * 0.3, H_ * 0.38, 0, Math.PI, 0); g.fill(); }, 128); p.position.set(x + (i % 2 ? 0.015 : -0.012), y - 0.004, 0.001); p.material.opacity = 0; F.add(p); return p; });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), new THREE.MeshBasicMaterial({ color: 0x0b1416, transparent: true, opacity: 0.85, depthWrite: false })); back.position.set(0, fh / 2, -0.004); F.add(back);
  const pencil = new THREE.Group(); G.add(pencil);
  const PEN = new THREE.MeshStandardMaterial({ color: 0x2e8f86, roughness: 0.5 }), WOODM = new THREE.MeshStandardMaterial({ color: 0xd8b78a, roughness: 0.7 });
  const body = cyl(0.013, 0.013, 0.24, PEN, 6); body.position.y = 0.15; pencil.add(body);
  const cone = cyl(0.013, 0.002, 0.035, WOODM, 6); cone.position.y = 0.0175 + 0.0; pencil.add(cone); cone.position.y = 0.017;
  // viga (Caminos): apoyos, carga repartida, flecha y ley de momentos rayada
  const V = new THREE.Group(); V.position.set(0, 1.18, 0); G.add(V);              // arriba: Caminos (flotando): pantalla partida en vertical
  const beam = bx(0.86, 0.05, 0.08, DARK2, 1.6, AMBER); V.add(beam);
  for (const sx of [-1, 1]) { const s = solid(new THREE.ConeGeometry(0.045, 0.07, 3), DARK, 1.4, AMBER); s.position.set(sx * 0.4, -0.06, 0); V.add(s); }
  const pier = bx(0.9, 0.012, 0.12, DARK, 1.0); pier.position.y = -0.1; V.add(pier);
  const loads = segSet(11 * 3 + 1, AMBER, 2, 1); V.add(loads); { let k = 0; for (let i = 0; i <= 10; i++) { const x = -0.4 + i * 0.08; loads.userData.set(k++, v3(x, 0.17, 0), v3(x, 0.035, 0)); loads.userData.set(k++, v3(x, 0.035, 0), v3(x - 0.012, 0.055, 0)); loads.userData.set(k++, v3(x, 0.035, 0), v3(x + 0.012, 0.055, 0)); } loads.userData.set(k++, v3(-0.4, 0.17, 0), v3(0.4, 0.17, 0)); loads.userData.flush(); }
  const mpts = []; for (let i = 0; i <= 40; i++) { const x = -0.4 + i * 0.02; mpts.push(v3(x, -0.17 - 0.16 * (1 - (x / 0.4) ** 2), 0)); }
  const mline = drawLine(mpts, AMBER, 2.4, 1); V.add(mline);
  const hatch = segSet(19, AMBER, 1.2, 0.6); V.add(hatch); for (let i = 0; i < 19; i++) { const x = -0.36 + i * 0.04; hatch.userData.set(i, v3(x, -0.17, 0), v3(x, -0.17 - 0.16 * (1 - (x / 0.4) ** 2), 0)); } hatch.userData.flush();
  const axis = segSet(1, AMBER, 1.4, 0.8); V.add(axis); axis.userData.set(0, v3(-0.42, -0.17, 0), v3(0.42, -0.17, 0)); axis.userData.flush();
  const defl = drawLine(Array.from({ length: 31 }, (_, i) => { const x = -0.4 + i * 0.8 / 30; return v3(x, -0.03 - 0.03 * (1 - (x / 0.4) ** 2), 0.05); }), 0xffffff, 1.6, 0.8); V.add(defl);
  const formula = textPlane(0.42, 0.09, (g, W_, H_) => { g.fillStyle = '#FFB547'; g.font = '700 74px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('M = qL²/8', W_ / 2, H_ / 2); }, 512);
  formula.position.set(0, 0.3, 0); V.add(formula);
  return { G, F, fl, nseg: pts.length, segs: pts, lit, people, pencil, V, beam, mline, hatch, axis, loads, defl, formula };
}
// ---------------------------------------------------------------- C: el terreno cortado (estratos) y la torre de Pisa
function hatchTex(kind) {
  return canvasTex(256, 256, (g, w, h) => { g.fillStyle = ['#2a2620', '#3a3128', '#1f2328', '#30302e'][kind]; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(230,236,242,.4)'; g.fillStyle = 'rgba(230,236,242,.45)'; g.lineWidth = 2;
    if (kind === 0) for (let i = 0; i < 160; i++) { g.beginPath(); g.arc(hash(i * 3.1) * w, hash(i * 7.7) * h, 1.6 + hash(i) * 1.5, 0, 7); g.fill(); }
    if (kind === 1) for (let y = 12; y < h; y += 22) for (let x = (y / 22 % 2) * 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18, y); g.stroke(); }
    if (kind === 2) for (let i = -h; i < w; i += 28) { g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); g.beginPath(); g.moveTo(i + h, h); g.lineTo(i, 0); g.stroke(); }
    if (kind === 3) for (let i = 0; i < 40; i++) { const x = hash(i * 2.3) * w, y = hash(i * 5.9) * h, r = 6 + hash(i * 1.1) * 10; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + i; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7); } g.closePath(); g.stroke(); }
  });
}
function buildSoil() {
  const G = new THREE.Group(); G.position.copy(ZC); scene.add(G);
  const W_ = 2.6, D_ = 1.3, layers = [[0.22, 0], [0.34, 1], [0.3, 3], [0.4, 2]]; let y = 0; const L = [];
  for (const [h, k] of layers) { const t = hatchTex(k); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W_ / 0.35, h / 0.35);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.18 });
    const b = solid(new THREE.BoxGeometry(W_, h, D_), m, 1.6); b.position.set(0, y - h / 2, 0); G.add(b); L.push(b); y -= h; }
  // bulbo de presiones bajo la cimentación (elipses que se dibujan)
  const bulbs = [0.1, 0.18, 0.27, 0.38].map((r, i) => { const pts = []; for (let k = 0; k <= 60; k++) { const a = k / 60 * Math.PI * 2; pts.push(v3(Math.sin(a) * r * 0.75, -r * (1 - Math.cos(a)) * 0.9, D_ / 2 + 0.004)); } const l = drawLine(pts, 0xffffff, 1.8, 0.8 - i * 0.12); G.add(l); return l; });
  // la torre (8 cuerpos con arquerías) sobre una bisagra en el borde de la base (se inclina y cae hacia +x)
  const piv = new THREE.Group(); piv.position.set(0.11, 0, 0); G.add(piv);
  const T = new THREE.Group(); T.position.set(-0.11, 0, 0); piv.add(T);
  const TM = new THREE.MeshStandardMaterial({ color: 0xcfc8bb, roughness: 0.75 });
  let yy = 0; for (let i = 0; i < 8; i++) { const h = i === 0 ? 0.14 : i === 7 ? 0.09 : 0.1, r = i === 7 ? 0.075 : 0.105; const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), TM); c.castShadow = true; c.position.y = yy + h / 2; edges(c, 0x0d1014, 1.2, 15, 0.9); T.add(c);
    const ring = cyl(r + 0.012, r + 0.012, 0.012, TM, 24); ring.position.y = yy + h; T.add(ring); edges(ring, 0x0d1014, 1, 30, 0.7); yy += h + 0.012; }
  const settle = new THREE.Group(); G.add(settle);
  return { G, L, bulbs, piv, T, H: yy, layers };
}
// ---------------------------------------------------------------- C: el puente viga en el que se convierte la torre, con el tren y el viento
function buildDeckBridge() {
  const G = new THREE.Group(); G.position.copy(ZC); scene.add(G);
  const deck = bx(1, 0.07, 0.24, DARK2, 1.6); deck.position.y = 0.38; G.add(deck);          // escala x = largo
  const piers = [-0.95, 0.4, 1.75].map(x => { const p = bx(0.08, 0.36, 0.14, DARK, 1.4); p.position.set(x, 0.18, 0); G.add(p); return p; });
  const train = new THREE.Group(); G.add(train);
  const TRM = new THREE.MeshStandardMaterial({ color: 0xd9dee5, roughness: 0.4, metalness: 0.3 });
  for (let i = 0; i < 4; i++) { const c = new THREE.Group(); c.position.x = -i * 0.25; train.add(c);
    const b = rbox(0.23, 0.07, 0.085, TRM, 0.02); b.rotation.x = -Math.PI / 2; b.rotation.x = 0; b.position.y = 0.04; c.add(b); edges(b, 0x0d1014, 1.0, 30, 0.6);
    const win_ = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.016), new THREE.MeshBasicMaterial({ color: 0xbfefff, toneMapped: false })); win_.position.set(0, 0.05, 0.0435); c.add(win_);
    if (i === 0) { const nose = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 10, 0, Math.PI), TRM); nose.rotation.y = Math.PI / 2; nose.scale.set(1, 0.85, 1.6); nose.position.set(0.115, 0.04, 0); c.add(nose); } }
  const wind = segSet(14 * 3, 0xbfefff, 2, 0.9); G.add(wind);
  const tag = textPlane(0.3, 0.07, (g, W_, H_) => { g.fillStyle = '#EEF2F6'; g.font = '700 60px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('δ ≤ L/1000', W_ / 2, H_ / 2); }, 512);
  tag.position.set(0.4, 0.12, 0.13); G.add(tag);
  return { G, deck, piers, train, wind, tag };
}
// ---------------------------------------------------------------- D: el río (partículas que corren y se frenan en la presa) y la presa de bóveda
const WATER_VS = `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 corner; attribute vec4 seed;
uniform mat4 VP, PVP; uniform vec2 res; uniform float time, dtp, x0, x1, xd, stop, lvl, size, bright, halfW, zc;
varying float vA; varying float vS; varying float vT; varying float vLen;
vec3 wp(float T){
  float L = x1 - x0, sp = 0.55 + 0.5 * seed.x;
  float x = x0 + mod(T * sp + seed.y * L, L);
  float z = (seed.z - 0.5) * 2.0 * halfW * (0.9 - 0.25 * seed.w), y = 0.012 + seed.w * 0.02 + sin(T * 3.0 + seed.x * 30.0) * 0.004;
  // con la presa arriba: lo que llega se amontona detrás y el nivel sube
  float xs = xd - 0.03 - seed.w * 0.9 * (0.25 + 0.75 * stop);
  if (stop > 0.0 && x > xs) { x = mix(x, xs, stop); y += lvl * (0.4 + 0.6 * seed.x); }
  return vec3(x, y, z + zc);
}
void main(){
  vec3 P = wp(time), P2 = wp(time - dtp); if (P2.x > P.x + 0.2) P2 = P;
  vec4 a = VP * vec4(P, 1.), b = PVP * vec4(P2, 1.);
  if (a.w < 0.01 || b.w < 0.005) { gl_Position = vec4(0.,0.,-2.,1.); vA = 0.; return; }
  vec2 pa = a.xy / a.w * res * 0.5, pb = b.xy / b.w * res * 0.5, d = pb - pa; float L = min(length(d), 300.0);
  vec2 dir = L > 0.01 ? normalize(d) : vec2(1., 0.), nr = vec2(-dir.y, dir.x);
  float sz = clamp(size * (0.6 + 0.8 * seed.x) / a.w * res.y * 0.5, 1.0, 9.0);
  vec2 px = (corner.x > 0.5 ? pa - dir * sz : pa + dir * (L + sz)) + nr * corner.y * sz;
  gl_Position = vec4(px / (res * 0.5) * a.w, a.z, a.w);
  #include <logdepthbuf_vertex>
  vA = bright * (0.4 + 0.6 * seed.z) * clamp((2.0 * sz) / (L * 0.5 + 2.0 * sz), 0.25, 1.0) * smoothstep(x0, x0 + 0.15, P.x);
  vS = corner.x > 0.5 ? -1.0 : (L / sz + 1.0); vT = corner.y; vLen = L / sz;
}`;
function buildRiver() {
  const G = new THREE.Group(); scene.add(G);
  const N = 5000, g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3)); g.setAttribute('corner', new THREE.Float32BufferAttribute([1, -1, 1, 1, 0, -1, 0, 1], 2)); g.setIndex([0, 2, 1, 2, 3, 1]);
  const sd = new Float32Array(N * 4); for (let i = 0; i < N * 4; i++) sd[i] = hash(i * 0.917 + 5.1); g.setAttribute('seed', new THREE.InstancedBufferAttribute(sd, 4)); g.instanceCount = N;
  const RX0 = ZD.x - 2.2, RXD = ZD.x - 0.6;
  const m = new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: FLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { VP: { value: new THREE.Matrix4() }, PVP: { value: new THREE.Matrix4() }, res: { value: new THREE.Vector2(W, H) }, time: { value: 0 }, dtp: { value: 1 / 36 }, x0: { value: RX0 }, x1: { value: RXD + 0.6 }, xd: { value: RXD - 0.12 },
      stop: { value: 0 }, lvl: { value: 0 }, zc: { value: ZD.z + 0.25 }, size: { value: 0.006 }, bright: { value: 1.1 }, halfW: { value: 0.2 }, col: { value: new THREE.Color(0xbfe6ff) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.layers.set(1); G.add(mesh);
  // orillas
  const banks = [-1, 1].map(s => { const b = bx(2.4, 0.07, 0.1, DARK2, 1.4); b.position.set((RX0 + RXD) / 2 + 0.25, 0.035, ZD.z + 0.25 + s * 0.26); G.add(b); return b; });
  // la presa: bóveda (arco en planta, convexa hacia el agua)
  const dam = new THREE.Group(); dam.position.set(RXD, 0, ZD.z + 0.25); G.add(dam);
  const NS = 10, Rp = 0.42, A0 = 0.75;
  for (let i = 0; i < NS; i++) { const a0 = -A0 + 2 * A0 * i / NS, a1 = -A0 + 2 * A0 * (i + 1) / NS, am = (a0 + a1) / 2, L = 2 * Rp * Math.sin((a1 - a0) / 2) * 1.02;
    const b = bx(0.05, 0.3, L, DARK2, 1.5); b.position.set(-(Rp * Math.cos(am) - Rp * Math.cos(A0)), 0.15, Rp * Math.sin(am)); b.rotation.y = am; dam.add(b); }
  const crest = drawLine(Array.from({ length: 31 }, (_, i) => { const a = -A0 + 2 * A0 * i / 30; return v3(-(Rp * Math.cos(a) - Rp * Math.cos(A0)), 0.305, Rp * Math.sin(a)); }), EDGE, 2.2, 1); dam.add(crest);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ color: 0x9fd2ff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(RXD - 0.8, 0.02, ZD.z + 0.25); G.add(pool);
  return { G, mesh, u: m.uniforms, banks, dam, pool, crest, RXD };
}
// ---------------------------------------------------------------- D/E: el mapa de España (contorno, carreteras y alta velocidad) y lo que sale de él
const MK = 0.25, MCOS = Math.cos(40.4 * Math.PI / 180);
const mp = (lon, lat, y = 0.006) => v3(ZD.x + (lon + 3.70) * MK * MCOS, y, ZD.z - (lat - 40.42) * MK);
const CITY = { mad: [-3.70, 40.42], bcn: [2.17, 41.39], zar: [-0.88, 41.65], lle: [0.62, 41.62], tgn: [1.25, 41.12], gir: [2.82, 41.98], fig: [2.96, 42.27], fr: [2.98, 42.45], gua: [-3.17, 40.63],
  sev: [-5.98, 37.39], cor: [-4.78, 37.89], cre: [-3.93, 38.99], put: [-4.11, 38.69], mal: [-4.42, 36.72], ant: [-4.56, 37.02], gra: [-3.60, 37.18], cad: [-6.29, 36.53],
  val: [-0.38, 39.47], cue: [-2.13, 40.07], alb: [-1.86, 38.99], ali: [-0.49, 38.35], mur: [-1.13, 37.99], cas: [-0.04, 39.99],
  vll: [-4.72, 41.65], seg: [-4.12, 40.95], leo: [-5.57, 42.60], ovi: [-5.85, 43.36], pal: [-4.53, 42.01], bur: [-3.70, 42.34], zam: [-5.75, 41.50], our: [-7.86, 42.34], stg: [-8.54, 42.88], cor2: [-8.41, 43.36], vig: [-8.72, 42.24],
  tol: [-4.02, 39.86], bad: [-6.97, 38.88], pla: [-6.09, 40.03], mer: [-6.34, 38.92], hue: [-0.41, 42.14], bil: [-2.93, 43.26], vit: [-2.67, 42.85], sts: [-1.98, 43.32], pam: [-1.64, 42.81], san: [-3.80, 43.46], hue2: [-6.95, 37.26], gij: [-5.66, 43.54], lco: [-8.41, 43.36] };
const HSR = [['mad', 'cre', 'put', 'cor', 'sev', 'cad'], ['cor', 'ant', 'mal'], ['ant', 'gra'], ['mad', 'gua', 'zar', 'lle', 'tgn', 'bcn', 'gir', 'fig', 'fr'], ['zar', 'hue'], ['mad', 'cue', 'val', 'cas'], ['cue', 'alb', 'ali'], ['ali', 'mur'],
  ['mad', 'seg', 'vll', 'pal', 'leo', 'ovi'], ['vll', 'bur'], ['vll', 'zam', 'our', 'stg', 'cor2'], ['stg', 'vig'], ['mad', 'tol'], ['pla', 'mer', 'bad']];
const ROADS = [['mad', 'bur', 'vit', 'bil'], ['mad', 'zar', 'bcn'], ['mad', 'val'], ['mad', 'alb', 'mur'], ['mad', 'cor', 'sev', 'hue2'], ['mad', 'bad'], ['mad', 'vll', 'leo', 'ovi', 'gij'], ['mad', 'tol'], ['bcn', 'tgn', 'cas', 'val', 'ali', 'mur', 'gra', 'mal', 'cad'],
  ['sts', 'bil', 'san', 'gij', 'lco'], ['lco', 'stg', 'vig'], ['vll', 'zam'], ['sev', 'mer', 'pla', 'sal'], ['zar', 'pam', 'sts'], ['bur', 'leo'], ['our', 'leo']];
CITY.sal = [-5.66, 40.96];
async function buildMap() {
  const C = await loadTopoLocal('../../../engine/geo/countries-50m.json');
  const segsOf = (filter, bbox) => { const out = []; for (const c of C) { if (!filter(c.name)) continue; for (const r of c.rings) { let ok = false; for (const [lo, la] of r) if (lo > bbox[0] && lo < bbox[2] && la > bbox[1] && la < bbox[3]) { ok = true; break; } if (!ok) continue; for (let i = 0; i + 1 < r.length; i++) out.push(mp(r[i][0], r[i][1]), mp(r[i + 1][0], r[i + 1][1])); } } return out; };
  const es = segsOf(n => n === 'Spain', [-10, 35.5, 5, 44.5]), nb = segsOf(n => ['Portugal', 'France', 'Andorra', 'Morocco'].includes(n), [-10.5, 35, 4.5, 44.5]).filter(p => true);
  const mk = (arr, col, w, op) => { const n = arr.length / 2, s = segSet(n, col, w, op); for (let i = 0; i < n; i++) s.userData.set(i, arr[2 * i], arr[2 * i + 1]); s.userData.flush(); s.userData.total = n; scene.add(s); return s; };
  // los bordes del vecino se recortan a la caja del mapa
  const nbc = []; for (let i = 0; i < nb.length; i += 2) { const a = nb[i], b = nb[i + 1]; if (Math.abs(a.x - ZD.x) < 1.6 && Math.abs(b.x - ZD.x) < 1.6 && Math.abs(a.z - ZD.z) < 1.15 && Math.abs(b.z - ZD.z) < 1.15) nbc.push(a, b); }
  const coast = mk(es, EDGE, 2.2, 1), nbr = mk(nbc, 0x6d7682, 1.4, 0.7);
  const route = (list, y) => { const out = []; for (const r of list) for (let i = 0; i + 1 < r.length; i++) { const a = CITY[r[i]], b = CITY[r[i + 1]]; if (!a || !b) continue; const n = 8; for (let k = 0; k < n; k++) { const u0 = k / n, u1 = (k + 1) / n; out.push(mp(lerp(a[0], b[0], u0), lerp(a[1], b[1], u0), y), mp(lerp(a[0], b[0], u1), lerp(a[1], b[1], u1), y)); } } return out; };
  // orden de dibujo: desde Madrid hacia fuera (por distancia del segmento a Madrid)
  const byDist = arr => { const m = mp(...CITY.mad), pairs = []; for (let i = 0; i < arr.length; i += 2) pairs.push([arr[i], arr[i + 1]]); pairs.sort((p, q) => p[0].distanceTo(m) - q[0].distanceTo(m)); return pairs.flat(); };
  const roads = mk(byDist(route(ROADS, 0.007)), 0x9aa1ab, 1.6, 0.75), hsr = mk(byDist(route(HSR, 0.009)), AMBER, 3.2, 1);
  const dots = segSet(Object.keys(CITY).length * 2, 0xffffff, 3, 1); scene.add(dots); { let k = 0; for (const key in CITY) { const p = mp(...CITY[key], 0.01), r = 0.012; dots.userData.set(k++, p.clone().add(v3(-r, 0, 0)), p.clone().add(v3(r, 0, 0))); dots.userData.set(k++, p.clone().add(v3(0, 0, -r)), p.clone().add(v3(0, 0, r))); } dots.userData.flush(); }
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), new THREE.MeshBasicMaterial({ color: 0x0a0f15, transparent: true, opacity: 0, depthWrite: false })); sea.rotation.x = -Math.PI / 2; sea.position.set(ZD.x - 0.15, 0.004, ZD.z + 0.05); scene.add(sea);
  return { coast, nbr, roads, hsr, dots, sea };
}
async function loadTopoLocal(url) {
  const d = await (await fetch(url)).json(); const [sx, sy] = d.transform.scale, [tx, ty] = d.transform.translate;
  const arcs = d.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
  const ring = idx => { const pts = []; for (const i of idx) { const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse(); pts.push(...(pts.length ? a.slice(1) : a)); } return pts; };
  return d.objects.countries.geometries.map(g => { const polys = g.type === 'MultiPolygon' ? g.arcs : g.type === 'Polygon' ? [g.arcs] : []; return { name: (g.properties || {}).name || '', rings: polys.flatMap(p => p.map(ring)) }; });
}
// polideportivo (nave con cubierta en bóveda de cañón)
function buildSports() {
  const G = new THREE.Group(); scene.add(G);
  const B = new THREE.Group(); G.add(B);
  const base = bx(0.34, 0.1, 0.22, DARK2, 1.5, AMBER); base.position.y = 0.05; B.add(base);
  const vg = new THREE.CylinderGeometry(0.11, 0.11, 0.34, 24, 1, true, 0, Math.PI); vg.rotateZ(Math.PI / 2); vg.rotateX(Math.PI / 2);
  const vault = solid(vg, new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.8, side: THREE.DoubleSide }), 1.4, AMBER); vault.position.y = 0.1; vault.scale.set(1, 0.55, 1); B.add(vault);
  const door = bx(0.08, 0.06, 0.004, DARK, 1.2, AMBER); door.position.set(0, 0.03, 0.112); B.add(door);
  return { G, B };
}
// ---------------------------------------------------------------- F: iconos que saltan del libro y se convierten en edificios (vivienda, colegio, hospital, iglesia)
function buildIcon(kind) {
  const G = new THREE.Group(), M = DARK2, ec = TEAL;
  if (kind === 0) { const b = bx(0.14, 0.03, 0.08, M, 1.4, ec); b.position.y = 0.03; G.add(b); const p = bx(0.035, 0.02, 0.06, M, 1.2, ec); p.position.set(-0.045, 0.055, 0); G.add(p); const hb = bx(0.01, 0.07, 0.08, M, 1.2, ec); hb.position.set(-0.07, 0.035, 0); G.add(hb); }
  if (kind === 1) { const t = bx(0.12, 0.01, 0.07, M, 1.4, ec); t.position.y = 0.07; G.add(t); for (const [x, z] of [[-0.05, -0.028], [0.05, -0.028], [-0.05, 0.028], [0.05, 0.028]]) { const l = bx(0.008, 0.065, 0.008, M, 1, ec); l.position.set(x, 0.033, z); G.add(l); } const bk = bx(0.05, 0.012, 0.035, M, 1.2, ec); bk.position.set(0.02, 0.081, 0); G.add(bk); }
  if (kind === 2) { const v = bx(0.035, 0.12, 0.03, M, 1.4, ec); v.position.y = 0.075; G.add(v); const h = bx(0.11, 0.035, 0.03, M, 1.4, ec); h.position.y = 0.085; G.add(h); }
  if (kind === 3) { const s = bx(0.14, 0.012, 0.045, M, 1.4, ec); s.position.y = 0.04; G.add(s); const bk = bx(0.14, 0.05, 0.01, M, 1.2, ec); bk.position.set(0, 0.065, -0.02); G.add(bk); for (const x of [-0.06, 0.06]) { const l = bx(0.01, 0.04, 0.04, M, 1, ec); l.position.set(x, 0.02, 0); G.add(l); } }
  return G;
}
function buildBuilding(kind) {
  const G = new THREE.Group(), M = DARK2, ec = EDGE;
  const winGrid = (w, h, z, rows, cols, y0) => { const s = segSet(rows * cols * 4, ec, 1.1, 0.8); let k = 0; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = -w / 2 + (c + 0.5) * w / cols, y = y0 + r * h / rows, a = w / cols * 0.22, b = h / rows * 0.28; [[x - a, y - b, x + a, y - b], [x + a, y - b, x + a, y + b], [x + a, y + b, x - a, y + b], [x - a, y + b, x - a, y - b]].forEach(q => s.userData.set(k++, v3(q[0], q[1], z), v3(q[2], q[3], z))); } s.userData.flush(); return s; };
  if (kind === 0) { const H_ = buildHouse(false); H_.G.scale.setScalar(0.62); G.add(H_.G); }
  if (kind === 1) { const b = bx(0.42, 0.22, 0.2, M, 1.5, ec); b.position.y = 0.11; G.add(b); G.add(winGrid(0.38, 0.2, 0.101, 2, 6, 0.06)); const c = bx(0.12, 0.08, 0.2, M, 1.4, ec); c.position.set(0, 0.26, 0); G.add(c);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.025, 24), new THREE.MeshBasicMaterial({ color: 0xeef2f6, toneMapped: false })); clock.position.set(0, 0.26, 0.102); G.add(clock); }
  if (kind === 2) { const b = bx(0.3, 0.32, 0.2, M, 1.5, ec); b.position.y = 0.16; G.add(b); G.add(winGrid(0.26, 0.24, 0.101, 3, 4, 0.05));
    const cr = new THREE.Group(); cr.position.set(0, 0.36, 0); G.add(cr); const CM = new THREE.MeshBasicMaterial({ color: 0xff6a5c, toneMapped: false }); const v = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.08, 0.012), CM), h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.012), CM); cr.add(v, h); }
  if (kind === 3) { const n = bx(0.18, 0.16, 0.3, M, 1.5, ec); n.position.set(0.05, 0.08, 0); G.add(n);
    const rs = new THREE.Shape(); rs.moveTo(-0.1, 0); rs.lineTo(0.1, 0); rs.lineTo(0, 0.09); rs.closePath(); const rg = new THREE.ExtrudeGeometry(rs, { depth: 0.3, bevelEnabled: false }); rg.translate(0, 0, -0.15); const r = solid(rg, M, 1.4, ec); r.position.set(0.05, 0.16, 0); G.add(r);
    const tw = bx(0.09, 0.34, 0.09, M, 1.5, ec); tw.position.set(-0.1, 0.17, 0.1); G.add(tw); const sp = solid(new THREE.ConeGeometry(0.068, 0.14, 4), M, 1.4, ec); sp.position.set(-0.1, 0.41, 0.1); sp.rotation.y = Math.PI / 4; G.add(sp);
    const rose = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.028, 20), new THREE.MeshBasicMaterial({ color: 0xeef2f6, toneMapped: false, side: THREE.DoubleSide })); rose.position.set(0.05, 0.11, 0.151); G.add(rose); }
  return G;
}
// ---------------------------------------------------------------- el cartel «PUENTES: SOLO CAMINOS» (se parte en dos)
function buildSign() {
  const G = new THREE.Group(); scene.add(G);
  const post = bx(0.03, 0.42, 0.03, DARK2, 1.3); post.position.y = 0.21; G.add(post);
  const tex = canvasTex(1024, 380, (g, w, h) => { g.fillStyle = '#16120a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#FFB547'; g.lineWidth = 14; g.strokeRect(16, 16, w - 32, h - 32);
    g.fillStyle = '#FFB547'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 104px Inter'; g.fillText('PUENTES:', w / 2, 125); g.font = '900 112px Inter'; g.fillText('SOLO CAMINOS', w / 2, 262); });
  const halves = [0, 1].map(i => { const geo = new THREE.PlaneGeometry(0.3, 0.22); const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * 0.5 + i * 0.5); uv.needsUpdate = true;
    const p = new THREE.Group(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.8, roughness: 0.6, side: THREE.DoubleSide })); m.castShadow = true;
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.012), DARK); bk.position.z = -0.008; p.add(m, bk); m.position.x = 0; bk.position.x = 0; p.position.set(i ? 0.15 : -0.15, 0.5, 0.02); G.add(p); return p; });
  return { G, halves, post };
}
// fórmulas que flotan alrededor de la casa (y se deshacen)
const FORMULAS = ['M = qL²/8', 'σ = M·y / I', 'δ = 5qL⁴/384EI', 'N = A·fyd', 'τ = V·Q / I·b', 'Ed ≤ Rd', 'qadm = qh / F'];
function buildFormulas() {
  return FORMULAS.map((f, i) => { const p = textPlane(0.36, 0.07, (g, W_, H_) => { g.fillStyle = '#9AA1AB'; g.font = '700 58px SpaceMono'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f, W_ / 2, H_ / 2); }, 512);
    const a = i / FORMULAS.length * Math.PI * 2; p.position.set(HSX.x + Math.cos(a) * 0.5, 0.18 + (i % 3) * 0.12, HSX.z + Math.sin(a) * 0.32 + 0.05); p.userData.a = a; scene.add(p); return p; });
}
// ---------------------------------------------------------------- el sello rojo gigante que aplasta la casa (y el «NO» que deja en el papel)
function buildStamp() {
  const G = new THREE.Group(); scene.add(G);
  const RM = new THREE.MeshStandardMaterial({ color: 0xc8322a, roughness: 0.45, emissive: 0x3a0806, emissiveIntensity: 0.6 }), HM = new THREE.MeshStandardMaterial({ color: 0x2a1c16, roughness: 0.5 });
  const pad = rbox(0.62, 0.46, 0.07, RM, 0.03); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.035; G.add(pad);
  const neck = cyl(0.05, 0.07, 0.16, HM, 20); neck.position.y = 0.15; G.add(neck);
  const knob = sph(0.1, HM, 24, 16); knob.position.y = 0.29; knob.scale.set(1, 0.8, 1); G.add(knob);
  const decal = textPlane(0.62, 0.46, (g, w, h) => { g.strokeStyle = 'rgba(255,82,71,.95)'; g.lineWidth = 26; g.strokeRect(30, 30, w - 60, h - 60); g.fillStyle = 'rgba(255,82,71,.95)'; g.font = '900 250px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NO', w / 2, h / 2 + 12);
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + hash(i) * 0.7})`; g.fillRect(hash(i * 3.3) * w, hash(i * 7.1) * h, 2 + hash(i * 1.3) * 7, 2 + hash(i * 2.9) * 5); } }, 512);
  decal.rotation.x = -Math.PI / 2; decal.rotation.z = -0.12; decal.position.set(HSX.x, 0.02, HSX.z + 0.02); decal.material.opacity = 0; scene.add(decal);
  return { G, decal };
}
