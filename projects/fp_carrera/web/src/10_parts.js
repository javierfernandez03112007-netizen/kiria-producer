// ---------------------------------------------------------------- «FP o carrera»: piezas
// colores de bando: FP turquesa, CARRERA ámbar
const TEAL = 0x2fc7b6, AMBER = 0xf0a332;
const CT = new THREE.Color(0.25, 1.6, 1.45), CA = new THREE.Color(1.9, 1.05, 0.25);
const plasticS = (c, r = 0.28) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05 });
const metalS = (c, r = 0.25) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 });
const SANS = '"Inter", "SpaceMono", sans-serif';
function textTex(w, h, draw) { return canvasTex(w, h, draw); }
function signPlane(txt, { w = 1, h = 0.25, col = '#EEF2F6', bg = null, size = 0.62, font = SANS, weight = 900, ls = 0 } = {}) {
  const tw = 1024, th = Math.round(1024 * h / w);
  const tex = textTex(tw, th, (g, W2, H2) => { if (bg) { g.fillStyle = bg; rr(g, 4, 4, W2 - 8, H2 - 8, H2 * 0.18); g.fill(); }
    let px = Math.round(H2 * size); g.letterSpacing = ls + 'px'; g.font = `${weight} ${px}px ${font}`; const mw = g.measureText(txt).width; if (mw > W2 * 0.92) { px = Math.floor(px * W2 * 0.92 / mw); g.font = `${weight} ${px}px ${font}`; }
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W2 / 2, H2 / 2 + H2 * 0.04); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 6; return m;
}

// ---------------------------------------------------------------- ofertas de trabajo: tarjetas
function cardTex() {
  return textTex(320, 424, (g, w, h) => {
    g.fillStyle = '#E8ECF1'; rr(g, 0, 0, w, h, 26); g.fill();
    g.fillStyle = '#1B1F27'; rr(g, 0, 0, w, 78, 26); g.fill(); g.fillRect(0, 50, w, 28);
    g.fillStyle = '#EEF2F6'; g.font = '700 34px SpaceMono'; g.letterSpacing = '6px'; g.textAlign = 'left'; g.fillText('OFERTA', 24, 52);
    g.fillStyle = '#9AA3AE'; for (let i = 0; i < 6; i++) { const ww = [230, 180, 250, 150, 210, 120][i]; rr(g, 24, 112 + i * 38, ww, 14, 7); g.fill(); }
    g.strokeStyle = '#C3CAD3'; g.lineWidth = 4; rr(g, 24, 344, 160, 52, 12); g.stroke();
  });
}
const CARD_W = 0.34, CARD_H = 0.45;
const GRID_C = v3(0, 1.55, 0);
function gridPos(i) { const c = i % 5, r = Math.floor(i / 5); return v3(GRID_C.x + (c - 2) * 0.4, GRID_C.y + (0.5 - r) * 0.52, GRID_C.z); }
function buildCards() {
  const tex = cardTex(), G = new THREE.Group(); scene.add(G);
  const cards = [];
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group(); G.add(g);
    const body = rbox(CARD_W, CARD_H, 0.014, plasticS(0xd9dee5, 0.5), 0.03); g.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W - 0.01, CARD_H - 0.01), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); face.position.z = 0.0075; g.add(face);
    // relleno de color que sube desde abajo (FP turquesa / CARRERA ámbar)
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W - 0.01, CARD_H - 0.01), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, depthWrite: false, toneMapped: false }));
    fill.position.z = 0.009; fill.visible = false; g.add(fill);
    const bFP = signPlane('FP', { w: 0.3, h: 0.14, col: '#04110F' }), bGR = signPlane('GRADO', { w: 0.34, h: 0.11, col: '#1A1004' });
    for (const b of [bFP, bGR]) { b.position.set(0, -0.09, 0.011); b.scale.setScalar(0.85); b.visible = false; g.add(b); }
    cards.push({ g, fill, bFP, bGR, face });
  }
  // lluvia: muchas tarjetas que vienen hacia la cámara (algunas ya teñidas)
  const N = 320, rain = new THREE.InstancedMesh(new THREE.BoxGeometry(CARD_W * 1.25, CARD_H * 1.25, 0.012), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }), N);
  rain.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); rain.frustumCulled = false; scene.add(rain);
  const seeds = []; for (let i = 0; i < N; i++) { const k = hash(i * 9.1); seeds.push({ x: (hash(i * 1.3) - 0.5) * 7, y: 0.4 + hash(i * 2.7) * 2.8, z: -hash(i * 4.4) * 42, rx: hash(i * 5.5) * 6, ry: hash(i * 6.6) * 6, k });
    rain.setColorAt(i, k < 0.47 ? new THREE.Color(0.45, 1.0, 0.93) : k < 0.68 ? new THREE.Color(1.0, 0.78, 0.42) : new THREE.Color(1, 1, 1)); }
  rain.instanceColor.needsUpdate = true;
  return { G, cards, rain, seeds };
}

// ---------------------------------------------------------------- arena: podios, muñecos, trofeo
const AR = v3(0, 0, -7);
function makeDoll(m) {
  const d = new THREE.Group(), J = {};
  const cap = (r, h) => new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 6, 14), m);
  const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  J.hip = pivot(d, 0, 0.5, 0);
  const pel = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), m); pel.scale.set(1.3, 0.8, 0.9); J.hip.add(pel);
  J.chest = pivot(J.hip, 0, 0.05, 0); const tor = cap(0.085, 0.22); tor.position.y = 0.17; tor.scale.set(1.25, 1, 0.8); J.chest.add(tor);
  J.neck = pivot(J.chest, 0, 0.36, 0); const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 18), m); head.scale.set(0.9, 1.1, 0.95); head.position.y = 0.08; J.neck.add(head); J.head = head;
  for (const sd of [-1, 1]) {
    const sh = pivot(J.chest, sd * 0.13, 0.31, 0); const ua = cap(0.032, 0.14); ua.position.y = -0.09; sh.add(ua);
    const el = pivot(sh, 0, -0.19, 0); const la = cap(0.028, 0.13); la.position.y = -0.085; el.add(la);
    const hand = pivot(el, 0, -0.19, 0); const hm = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), m); hand.add(hm);
    const hp = pivot(J.hip, sd * 0.07, -0.03, 0); const ul = cap(0.042, 0.18); ul.position.y = -0.12; hp.add(ul);
    const kn = pivot(hp, 0, -0.25, 0); const ll = cap(0.036, 0.17); ll.position.y = -0.11; kn.add(ll);
    J[sd < 0 ? 'shL' : 'shR'] = sh; J[sd < 0 ? 'elL' : 'elR'] = el; J[sd < 0 ? 'hL' : 'hR'] = hand; J[sd < 0 ? 'hpL' : 'hpR'] = hp; J[sd < 0 ? 'knL' : 'knR'] = kn;
  }
  d.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  d.userData.J = J; return d;
}
function podium(col, name) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const c = cyl(0.42, 0.46, 1, plasticS(0x15171c, 0.45), 64); c.position.y = 0.5; body.add(c); edges(c, 0xdfe6ee, 1.1, 30, 0.25);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.012, 8, 96), basicGlow(col, 2.2)); rim.rotation.x = Math.PI / 2; g.add(rim);
  const lab = signPlane(name, { w: 0.62, h: 0.16, col: '#' + new THREE.Color(col).getHexString() }); g.add(lab);
  g.userData = { body, rim, lab }; return g;
}
function setPodiumH(p, h) { p.userData.body.scale.y = h; p.userData.rim.position.y = h + 0.003; p.userData.lab.position.set(0, h * 0.5, 0.465); }
function trophy() {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.13, 0], [0.13, 0.035], [0.05, 0.06], [0.035, 0.2], [0.05, 0.24], [0.15, 0.29], [0.19, 0.42], [0.2, 0.5], [0.185, 0.5], [0.17, 0.42], [0.13, 0.31], [0.0, 0.27]].map(([x, y]) => new THREE.Vector2(x, y));
  const mL = metalS(0xffc861, 0.22), mR = metalS(0xffc861, 0.22);
  const L = new THREE.Mesh(new THREE.LatheGeometry(prof, 48, Math.PI, Math.PI), mL), R = new THREE.Mesh(new THREE.LatheGeometry(prof, 48, 0, Math.PI), mR);
  for (const m of [L, R]) { m.material.side = THREE.DoubleSide; m.castShadow = true; g.add(m); }
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 24, Math.PI * 1.2), s < 0 ? mL : mR); h.position.set(s * 0.2, 0.38, 0); h.rotation.z = s < 0 ? Math.PI * 0.4 : -Math.PI * 0.4 + Math.PI; g.add(h); }
  const base = rbox(0.3, 0.3, 0.08, plasticS(0x1a1c21, 0.4), 0.02); base.rotation.x = -Math.PI / 2; base.position.y = -0.04; g.add(base);
  g.userData = { mL, mR }; return g;
}
function qmark(m) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 18; i++) { const a = lerp(Math.PI * 0.92, -Math.PI * 0.42, i / 18); pts.push(v3(Math.cos(a) * 0.15, 0.2 + Math.sin(a) * 0.15, 0)); }
  pts.push(v3(0.02, -0.02, 0), v3(0, -0.08, 0)); g.add(tube(pts, 0.042, m, 60));
  const dot = sph(0.05, m); dot.position.y = -0.21; g.add(dot); return g;
}
function numTex(txt, col, bg = '#101318') { return textTex(256, 256, (g, w, h) => { g.fillStyle = bg; rr(g, 6, 6, w - 12, h - 12, 28); g.fill(); g.strokeStyle = col; g.lineWidth = 8; rr(g, 10, 10, w - 20, h - 20, 26); g.stroke();
  g.fillStyle = col; g.font = `900 150px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 8); }); }
function yearBlock(n, col, colHex) { const g = new THREE.Group(); const b = rbox(0.3, 0.3, 0.3, plasticS(0x14171c, 0.4), 0.03); g.add(b);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshBasicMaterial({ map: numTex(String(n), colHex), toneMapped: false })); f.position.z = 0.152; g.add(f);
  const e = new THREE.Mesh(new THREE.BoxGeometry(0.305, 0.305, 0.305), new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.6, toneMapped: false })); g.add(e);
  g.userData = { f }; return g; }
function boardTex(txt) { return textTex(420, 300, (g, w, h) => { g.fillStyle = '#0f1512'; rr(g, 0, 0, w, h, 18); g.fill(); g.strokeStyle = '#6b5a3a'; g.lineWidth = 10; rr(g, 5, 5, w - 10, h - 10, 16); g.stroke();
  g.fillStyle = '#EEE7D6'; g.font = `700 54px "DejaVuMono"`; g.textAlign = 'center'; g.textBaseline = 'middle'; txt.split('\n').forEach((l, i, a) => g.fillText(l, w / 2, h / 2 + (i - (a.length - 1) / 2) * 64)); }); }
function buildArena() {
  const Z = new THREE.Group(); Z.position.copy(AR); scene.add(Z);
  const pF = podium(TEAL, 'FP'), pC = podium(AMBER, 'CARRERA'); pF.position.x = -0.62; pC.position.x = 0.62; Z.add(pF, pC); setPodiumH(pF, 0.35); setPodiumH(pC, 0.35);
  const dF = makeDoll(plasticS(TEAL, 0.25)), dC = makeDoll(plasticS(AMBER, 0.25)); dF.scale.setScalar(1.3); dC.scale.setScalar(1.3); Z.add(dF, dC);
  // anillo del ring en el suelo: mitad turquesa, mitad ámbar
  for (const [c, a0] of [[TEAL, Math.PI / 2], [AMBER, -Math.PI / 2]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.01, 6, 128, Math.PI), basicGlow(c, 1.8)); r.rotation.x = -Math.PI / 2; r.rotation.z = a0; r.position.y = 0.004; Z.add(r); }
  const tr = trophy(); tr.position.set(0, 1.0, -0.5); Z.add(tr);
  const q = qmark(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 1.6 })); q.position.set(0, 1.25, 0.05); q.scale.setScalar(1.1); Z.add(q);
  // bloques de años, maletín (prácticas), pizarras (teoría), herramientas
  const yF = [1, 2].map(n => { const b = yearBlock(n, CT, '#62E3D4'); Z.add(b); return b; });
  const yC = [1, 2, 3, 4].map(n => { const b = yearBlock(n, CA, '#FFB547'); Z.add(b); return b; });
  const half = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.14), new THREE.MeshBasicMaterial({ color: CT, transparent: true, opacity: 0.85, toneMapped: false })); half.position.set(0, -0.07, 0.155); yC[0].add(half); half.visible = false;
  const bc = new THREE.Group(); const bcb = rbox(0.34, 0.24, 0.1, plasticS(0x3a2a1c, 0.45), 0.03); bc.add(bcb); const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 20, Math.PI), metalS(0xc9ced6)); hnd.position.y = 0.12; bc.add(hnd);
  const clasp = rbox(0.05, 0.03, 0.02, metalS(0xc9ced6), 0.005); clasp.position.set(0, 0.07, 0.055); bc.add(clasp); Z.add(bc);
  const boards = ['∫ f(x) dx', 'det(A)', 'O(n log n)'].map(t => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.33), new THREE.MeshStandardMaterial({ map: boardTex(t), roughness: 0.8 })); Z.add(m); return m; });
  const wr = new THREE.Group(); { const s = new THREE.Shape(); s.moveTo(-0.02, -0.16); s.lineTo(0.02, -0.16); s.lineTo(0.02, 0.08); s.lineTo(0.06, 0.12); s.lineTo(0.04, 0.17); s.lineTo(0.015, 0.13); s.lineTo(-0.015, 0.13); s.lineTo(-0.04, 0.17); s.lineTo(-0.06, 0.12); s.lineTo(-0.02, 0.08); s.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: TEAL, emissiveIntensity: 1.4, metalness: 0.5, roughness: 0.3 })); m.geometry.center(); wr.add(m); }
  const hm = new THREE.Group(); { const hh = cyl(0.012, 0.012, 0.3, new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: TEAL, emissiveIntensity: 1.2 }), 12); hm.add(hh); const hd = rbox(0.12, 0.05, 0.05, new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: TEAL, emissiveIntensity: 1.4 }), 0.01); hd.position.y = 0.15; hm.add(hd); }
  Z.add(wr, hm);
  // «lo que hay debajo»: engranajes y una placa bajo el podio de FP
  const under = new THREE.Group(); under.position.set(-0.62, -0.55, 0); Z.add(under);
  const gm = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: AMBER, emissiveIntensity: 1.1, metalness: 0.7, roughness: 0.35 });
  const gears = [[0.22, 12, 0, 0, 0], [0.14, 8, 0.33, 0.06, 0.05], [0.17, 10, -0.3, -0.12, -0.08]].map(([r, n, x, y, z]) => { const s = new THREE.Shape(), hN = n * 4;
    for (let i = 0; i <= hN; i++) { const a = i / hN * Math.PI * 2, k = i % 4, rr2 = k === 1 || k === 2 ? r * 1.16 : r; i ? s.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : s.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
    const p = new THREE.Path(); p.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true); s.holes.push(p);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false }); geo.translate(0, 0, -0.025); const m = new THREE.Mesh(geo, gm); m.position.set(x, y, z); m.rotation.x = -Math.PI / 2; under.add(m); return m; });
  const pcb = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshBasicMaterial({ map: textTex(700, 500, (g, w, h) => { g.fillStyle = '#03100c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2fc7b6'; g.lineWidth = 3; g.globalAlpha = 0.8;
    for (let i = 0; i < 40; i++) { let x = hash(i) * w, y = hash(i * 3) * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { if (k % 2) x += (hash(i * 7 + k) - 0.5) * 220; else y += (hash(i * 5 + k) - 0.5) * 160; g.lineTo(x, y); } g.stroke(); g.fillStyle = '#62E3D4'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = '#8fd'; g.font = '700 30px DejaVuMono'; for (let i = 0; i < 12; i++) g.fillText(hash(i * 2.2) > 0.5 ? '1011 0110' : '0100 1101', hash(i * 9) * w * 0.8, hash(i * 4) * h); }), transparent: true, opacity: 0.9, toneMapped: false }));
  pcb.rotation.x = -Math.PI / 2; pcb.position.y = -0.18; under.add(pcb);
  Z.userData = { pF, pC, dF, dC, tr, q, yF, yC, half, bc, boards, wr, hm, under, gears };
  return Z;
}

// ---------------------------------------------------------------- datos: títulos que se rompen y profesiones reguladas
const DZ = v3(7, 0, -12);
function diploma(ribbon) {
  const g = new THREE.Group(); const p = cyl(0.045, 0.045, 0.36, plasticS(0xf3ecd8, 0.45), 32); p.rotation.z = Math.PI / 2; g.add(p);
  const rib = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.013, 8, 28), new THREE.MeshStandardMaterial({ color: 0x080808, emissive: ribbon, emissiveIntensity: 1.6 })); rib.rotation.y = Math.PI / 2; g.add(rib);
  for (const s of [-1, 1]) { const e = cyl(0.046, 0.046, 0.004, plasticS(0xd8cfb4, 0.5), 32); e.rotation.z = Math.PI / 2; e.position.x = s * 0.181; g.add(e); }
  return g;
}
function shards(col, n = 140) { const m = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xf3ecd8, roughness: 0.5, emissive: col, emissiveIntensity: 0.25 }), n); m.frustumCulled = false; m.visible = false; scene.add(m); return m; }
function rowTex(txt, mark, col) { return textTex(1100, 200, (g, w, h) => { g.fillStyle = 'rgba(16,19,24,.92)'; rr(g, 4, 4, w - 8, h - 8, 22); g.fill(); g.strokeStyle = 'rgba(238,242,246,.25)'; g.lineWidth = 3; rr(g, 4, 4, w - 8, h - 8, 22); g.stroke();
  g.fillStyle = '#EEF2F6'; g.font = '700 64px SpaceMono'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, 46, h / 2 + 4);
  g.fillStyle = col; g.font = '700 96px DejaVuMono'; g.textAlign = 'right'; g.fillText(mark, w - 50, h / 2 + 6); }); }
function buildData() {
  const Z = new THREE.Group(); Z.position.copy(DZ); scene.add(Z);
  const dipF = diploma(TEAL), dipC = diploma(AMBER); dipF.scale.setScalar(2.4); dipC.scale.setScalar(2.4); Z.add(dipF, dipC);
  const shF = shards(TEAL), shC = shards(AMBER);
  // panel «PROFESIONES REGULADAS»
  const panel = new THREE.Group(); panel.position.set(0, 1.5, -0.4); Z.add(panel);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.75), new THREE.MeshStandardMaterial({ color: 0x0a0d12, transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.2, depthWrite: false })); panel.add(glass); edges(glass, 0xdfe6ee, 1.4, 20, 0.9);
  const title = signPlane('PROFESIONES REGULADAS', { w: 1.7, h: 0.17, col: '#EEF2F6', font: 'SpaceMono', weight: 700, size: 0.5, ls: 6 }); title.position.set(0, 0.68, 0.01); panel.add(title);
  const sub = signPlane('RD 1837/2008 · ANEXO VIII', { w: 1.2, h: 0.08, col: '#9AA1AB', font: 'SpaceMono', weight: 400, size: 0.6, ls: 4 }); sub.position.set(0, 0.55, 0.01); panel.add(sub);
  const rows = [['INGENIERO INDUSTRIAL', '✓', '#7CF0A9'], ['INGENIERO DE TELECOM.', '✓', '#7CF0A9'], ['INGENIERÍA INFORMÁTICA', '✕', '#FF5247']].map(([t, mk, c], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.31), new THREE.MeshBasicMaterial({ map: rowTex(t, mk, c), transparent: true, depthWrite: false, toneMapped: false })); m.position.set(0, 0.24 - i * 0.4, 0.015); m.renderOrder = 7; panel.add(m); return m; });
  const strike = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.01), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.35, 0.3), toneMapped: false, depthTest: false, transparent: true, opacity: 1 })); strike.renderOrder = 9; strike.position.set(-0.1, 0.24 - 2 * 0.4, 0.04); panel.add(strike);
  Z.userData = { dipF, dipC, shF, shC, panel, rows, strike, glass };
  return Z;
}

// ---------------------------------------------------------------- oposiciones: torre de puertas (C2 → A1) y la puerta del máster
const GZ = v3(14, 0, -7);
const LEVELS = [['C2', 'ESO'], ['C1', 'BACHILLER / TÉCNICO'], ['B', 'TÉCNICO SUPERIOR'], ['A2', 'GRADO'], ['A1', 'GRADO']];
function keyMesh(col) {
  const s = new THREE.Shape(); s.absarc(0, 0, 0.06, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(0, 0, 0.022, 0, Math.PI * 2, true); s.holes.push(hole);
  const b = new THREE.Shape(); b.moveTo(0.05, -0.016); b.lineTo(0.27, -0.016); b.lineTo(0.27, 0.0); b.lineTo(0.255, 0.012); b.lineTo(0.24, 0.0); b.lineTo(0.225, 0.016); b.lineTo(0.205, 0.0); b.lineTo(0.19, 0.014); b.lineTo(0.17, 0.016); b.lineTo(0.05, 0.016); b.closePath();
  const m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: col, emissiveIntensity: 1.5, metalness: 0.6, roughness: 0.3 }), g = new THREE.Group();
  for (const sh of [s, b]) { const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 24 }); geo.translate(-0.1, 0, -0.01); g.add(new THREE.Mesh(geo, m)); }
  return g;
}
function lockMesh() { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff5247, emissiveIntensity: 1.6, metalness: 0.5, roughness: 0.3 });
  const body = rbox(0.11, 0.09, 0.04, m, 0.015); g.add(body); const sh = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 8, 20, Math.PI), m); sh.position.y = 0.045; g.add(sh); g.userData = { sh, m }; return g; }
function doorFrame(w, h, sign) {
  const g = new THREE.Group(), fm = plasticS(0x1b1e24, 0.4);
  for (const s of [-1, 1]) { const p = rbox(0.06, h, 0.08, fm, 0.01); p.position.set(s * (w / 2 + 0.03), h / 2, 0); g.add(p); }
  const top = rbox(w + 0.18, 0.07, 0.09, fm, 0.01); top.position.y = h + 0.035; g.add(top);
  const hinge = new THREE.Group(); hinge.position.set(-w / 2, 0, 0); g.add(hinge);
  const door = rbox(w, h, 0.03, plasticS(0x2a2e36, 0.35), 0.01); door.position.set(w / 2, h / 2, 0); hinge.add(door); edges(door, 0xdfe6ee, 1.1, 30, 0.5);
  const light = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, h * 0.96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); light.position.set(0, h / 2, -0.03); g.add(light);
  if (sign) { const sg = signPlane(sign, { w: w * 0.9, h: 0.13, col: '#EEF2F6', font: 'SpaceMono', weight: 700, size: 0.6, ls: 4 }); sg.position.set(0, h + 0.035, 0.05); g.add(sg); }
  g.userData = { hinge, light, door }; return g;
}
function buildGates() {
  const Z = new THREE.Group(); Z.position.copy(GZ); scene.add(Z);
  const lv = LEVELS.map(([code, req], k) => {
    const g = new THREE.Group(); g.position.y = 0.12 + k * 0.66; Z.add(g);
    const plat = rbox(1.25, 0.04, 0.5, plasticS(0x15171c, 0.5), 0.01); plat.rotation.x = -Math.PI / 2; plat.position.y = -0.02; g.add(plat); edges(plat, 0xdfe6ee, 1, 30, 0.35);
    const d = doorFrame(0.6, 0.5, null); g.add(d);
    const c = signPlane(code, { w: 0.34, h: 0.2, col: '#EEF2F6', font: 'SpaceMono', weight: 700, size: 0.8 }); c.position.set(-0.62, 0.27, 0.05); g.add(c);
    const r = signPlane(req, { w: 0.9, h: 0.085, col: k >= 3 ? '#FFB547' : k === 2 ? '#62E3D4' : '#9AA1AB', font: 'SpaceMono', weight: 700, size: 0.62, ls: 2 }); r.position.set(0.0, 0.58, 0.05); g.add(r);
    const lock = lockMesh(); lock.position.set(0.18, 0.26, 0.05); lock.visible = k >= 3; g.add(lock);
    return { g, d, lock };
  });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.012, 3.4, 0.012), basicGlow(0xdfe6ee, 0.9)); rail.position.set(0.86, 1.7, 0); Z.add(rail);
  const kF = keyMesh(TEAL), kC = keyMesh(AMBER); kF.scale.setScalar(1.5); kC.scale.setScalar(1.5); Z.add(kF, kC);
  const md = doorFrame(0.8, 1.25, 'MÁSTER'); md.position.set(1.85, 0, 0.35); md.rotation.y = -0.35; Z.add(md);
  const mlock = lockMesh(); mlock.scale.setScalar(1.6); mlock.position.set(0.25, 0.65, 0.06); md.add(mlock);
  Z.userData = { lv, kF, kC, md, mlock };
  return Z;
}

// ---------------------------------------------------------------- veredicto: cohete de FP, puertas de la carrera, puente a la universidad, botones
function university() {
  const g = new THREE.Group(), m = plasticS(0xd9dde3, 0.5);
  const base = rbox(1.4, 0.12, 0.7, m, 0.02); base.rotation.x = -Math.PI / 2; base.position.y = 0.06; g.add(base);
  for (let i = 0; i < 6; i++) { const c = cyl(0.045, 0.05, 0.62, m, 20); c.position.set(-0.55 + i * 0.22, 0.43, 0.22); g.add(c); }
  const ent = rbox(1.4, 0.08, 0.7, m, 0.02); ent.rotation.x = -Math.PI / 2; ent.position.y = 0.78; g.add(ent);
  const s = new THREE.Shape(); s.moveTo(-0.72, 0); s.lineTo(0.72, 0); s.lineTo(0, 0.3); s.closePath();
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: false }), m); ped.position.set(0, 0.82, -0.3); g.add(ped);
  const wall = rbox(1.2, 0.62, 0.05, plasticS(0x24272e, 0.6), 0.01); wall.position.set(0, 0.43, 0.0); g.add(wall);
  const sg = signPlane('UNIVERSIDAD', { w: 0.9, h: 0.09, col: '#1B1F27', font: 'SpaceMono', weight: 700, size: 0.7, ls: 6 }); sg.position.set(0, 0.78, 0.36); g.add(sg);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); edges(base, 0xdfe6ee, 1, 30, 0.3);
  return g;
}
function buildVerdict(A) {
  const Z = A; // en coordenadas de la arena
  const uni = university(); uni.position.set(1.2, 0, -2.0); uni.rotation.y = -0.25; Z.add(uni);
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(v3(lerp(-0.62, 1.1, u), 0.38 + Math.sin(Math.PI * u) * 1.1, lerp(0, -1.7, u))); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const bridgeM = new THREE.MeshBasicMaterial({ color: CT, transparent: true, opacity: 0.9, toneMapped: false });
  const bridge = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.035, 10, false), bridgeM); Z.add(bridge);
  const U = { uA: { value: 0 } };
  bridgeM.onBeforeCompile = sh => { sh.uniforms.uA = U.uA; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUv2;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvUv2 = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vUv2; uniform float uA;').replace('void main() {', 'void main() {\n if (vUv2.x > uA) discard;'); };
  bridgeM.customProgramCacheKey = () => 'bridgeA';
  const ects = signPlane('−30 ECTS', { w: 0.62, h: 0.16, col: '#04110F', bg: '#62E3D4', font: 'SpaceMono', weight: 700, size: 0.62 }); Z.add(ects);
  // barrera de la PAU (se levanta)
  const bar = new THREE.Group(); bar.position.copy(curve.getPoint(0.55)).add(v3(0, -0.02, 0)); Z.add(bar);
  const arm = new THREE.Group(); bar.add(arm);
  const stripes = textTex(512, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#EEF2F6' : '#FF5247'; g.fillRect(i * w / 8, 0, w / 8, h); } g.fillStyle = '#111'; g.font = '700 40px SpaceMono'; g.textAlign = 'center'; g.fillText('PAU', w / 2, 46); });
  const armM = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.03), new THREE.MeshBasicMaterial({ map: stripes, toneMapped: false })); armM.position.x = 0.35; arm.add(armM);
  const post = cyl(0.025, 0.03, 0.3, plasticS(0x2a2e36), 12); post.position.y = -0.15; bar.add(post);
  // cohete de FP («empezar antes») y puertas de la carrera («más puertas»)
  const rocket = new THREE.Group(); { const b = cyl(0.05, 0.06, 0.24, new THREE.MeshStandardMaterial({ color: 0x0b0b0b, emissive: TEAL, emissiveIntensity: 1.6 }), 20); rocket.add(b);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 20), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, emissive: 0xffffff, emissiveIntensity: 1.4 })); nose.position.y = 0.17; rocket.add(nose);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 16), basicGlow(0xffd27a, 2.6)); fl.rotation.x = Math.PI; fl.position.y = -0.22; rocket.add(fl); rocket.userData.fl = fl; }
  Z.add(rocket);
  const fan = [0, 1, 2].map(i => { const d = doorFrame(0.26, 0.42, null); d.scale.setScalar(1); Z.add(d); return d; });
  // botones finales
  const btn = (txt, col, colHex) => { const g = new THREE.Group(); const b = rbox(1.15, 0.36, 0.14, new THREE.MeshStandardMaterial({ color: 0x0b0b0b, emissive: col, emissiveIntensity: 0.9, roughness: 0.35 }), 0.06); g.add(b);
    const t = signPlane(txt, { w: 1.05, h: 0.26, col: '#05080A', font: SANS, weight: 900, size: 0.5 }); t.position.z = 0.073; g.add(t); edges(b, 0xffffff, 1.4, 30, 0.6); return g; };
  const bF = btn('EQUIPO FP', TEAL), bC = btn('EQUIPO CARRERA', AMBER); Z.add(bF, bC);
  return { uni, bridge, U, curve, ects, bar, arm, rocket, fan, bF, bC };
}
