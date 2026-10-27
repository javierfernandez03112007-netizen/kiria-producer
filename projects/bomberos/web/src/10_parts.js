// ---------------------------------------------------------------- «Bomberados»: piezas
// paleta de fuego: oro de casco, naranja brasa, rojo de suspenso; turquesa solo para la app (lo que sí funciona)
const GOLD = 0xf2b233, EMB = 0xff7a2f, RED = 0xe0453a, TEA = 0x2fc7b6;
const CGold = new THREE.Color(2.0, 1.25, 0.3), CEmb = new THREE.Color(2.2, 0.75, 0.2), CRed = new THREE.Color(1.9, 0.25, 0.2), CTe = new THREE.Color(0.25, 1.6, 1.45);
const plasticS = (c, r = 0.28) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05 });
const metalS = (c, r = 0.25) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 });
const SANS = '"Inter", "SpaceMono", sans-serif';
function signPlane(txt, { w = 1, h = 0.25, col = '#EEF2F6', bg = null, size = 0.62, font = SANS, weight = 900, ls = 0 } = {}) {
  const tw = 1024, th = Math.round(1024 * h / w);
  const tex = canvasTex(tw, th, (g, W2, H2) => { if (bg) { g.fillStyle = bg; rr(g, 4, 4, W2 - 8, H2 - 8, H2 * 0.18); g.fill(); }
    let px = Math.round(H2 * size); g.letterSpacing = ls + 'px'; g.font = `${weight} ${px}px ${font}`; const mw = g.measureText(txt).width; if (mw > W2 * 0.92) { px = Math.floor(px * W2 * 0.92 / mw); g.font = `${weight} ${px}px ${font}`; }
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W2 / 2, H2 / 2 + H2 * 0.04); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 6; return m;
}

// ---------------------------------------------------------------- casco de bombero (cúpula, ala que cae atrás, cresta y escudo)
function helmet(col) {
  const g = new THREE.Group(), m = plasticS(col, 0.22);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1, 0.95, 1.12); dome.castShadow = true; g.add(dome);
  const prof = []; for (let i = 0; i <= 10; i++) { const u = i / 10; prof.push(new THREE.Vector2(0.128 + u * 0.075, -0.004 - u * u * 0.02)); }
  const brim = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, side: THREE.DoubleSide })); brim.scale.set(1, 1, 1.18); brim.castShadow = true; g.add(brim);
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.011, 8, 40, Math.PI), m); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1, 0.95, 1.12); g.add(ridge);
  const badge = rbox(0.06, 0.07, 0.012, metalS(0xd9dde3, 0.4), 0.012); badge.position.set(0, 0.075, 0.138); badge.rotation.x = -0.45; g.add(badge);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.135, 36, 12, -1.0, 2.0, 1.25, 0.32), new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.8 }));
  visor.scale.set(1, 0.95, 1.12); g.add(visor);
  g.userData = { m, mats: [m, brim.material] }; return g;
}
// ---------------------------------------------------------------- muñeco articulado (de «FP o carrera»)
function makeDoll(m) {
  const d = new THREE.Group(), J = {};
  const cap = (r, h) => new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 6, 14), m);
  const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  J.hip = pivot(d, 0, 0.5, 0);
  const pel = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), m); pel.scale.set(1.3, 0.8, 0.9); J.hip.add(pel);
  J.chest = pivot(J.hip, 0, 0.05, 0); const tor = cap(0.085, 0.22); tor.position.y = 0.17; tor.scale.set(1.25, 1, 0.8); J.chest.add(tor);
  J.neck = pivot(J.chest, 0, 0.36, 0); const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 18), m); head.scale.set(0.9, 1.1, 0.95); head.position.y = 0.08; J.neck.add(head);
  for (const sd of [-1, 1]) {
    const sh = pivot(J.chest, sd * 0.13, 0.31, 0); const ua = cap(0.032, 0.14); ua.position.y = -0.09; sh.add(ua);
    const el = pivot(sh, 0, -0.19, 0); const la = cap(0.028, 0.13); la.position.y = -0.085; el.add(la);
    const hp = pivot(J.hip, sd * 0.07, -0.03, 0); const ul = cap(0.042, 0.18); ul.position.y = -0.12; hp.add(ul);
    const kn = pivot(hp, 0, -0.25, 0); const ll = cap(0.036, 0.17); ll.position.y = -0.11; kn.add(ll);
    J[sd < 0 ? 'shL' : 'shR'] = sh; J[sd < 0 ? 'elL' : 'elR'] = el;
  }
  d.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  d.userData.J = J; return d;
}

// ---------------------------------------------------------------- 1: diez cascos (2 × 5) — ocho se apagan y caen
const HZ = v3(0, 0, 0);
function hpos(i) { const c = i % 2, r = Math.floor(i / 2); return v3((c - 0.5) * 0.4, 0.6 + r * 0.3, 0); }
const KEEP = [3, 6];                // los dos que consiguen plaza
function buildHelmets() {
  const G = new THREE.Group(); G.position.copy(HZ); scene.add(G);
  const hs = []; for (let i = 0; i < 10; i++) { const h = helmet(GOLD); h.position.copy(hpos(i)); G.add(h); hs.push(h); }
  const glow = KEEP.map(i => { const l = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 8, 64), basicGlow(GOLD, 2.2)); l.rotation.x = Math.PI / 2; l.position.copy(hpos(i)).add(v3(0, -0.01, 0)); G.add(l); return l; });
  return { G, hs, glow };
}

// ---------------------------------------------------------------- 2-3: multitudes (una figura por aspirante)
const CZ = v3(0, 0, -12);
const REG = [{ name: 'MADRID', n: 1285, ok: 267, x: -2.4 }, { name: 'VALÈNCIA', n: 1634, ok: 92, x: 0 }, { name: 'PAÍS VASCO', n: 1170, ok: 287, x: 2.4 }];
function buildCrowds() {
  const Z = new THREE.Group(); Z.position.copy(CZ); scene.add(Z);
  const blocks = REG.map((R, k) => {
    const cols = Math.ceil(Math.sqrt(R.n * 1.1)), sp = 0.048;
    const m = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.012, 0.03, 3, 6), plasticS(0xffffff, 0.45), R.n);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(R.n * 3), 3); m.frustumCulled = false; m.castShadow = true; Z.add(m);
    const P = []; for (let i = 0; i < R.n; i++) { const c = i % cols, r = Math.floor(i / cols); P.push(v3(R.x + (c - (cols - 1) / 2) * sp + (hash(i * 1.7 + k) - 0.5) * 0.012, 0.027, -r * sp + (hash(i * 2.9 + k) - 0.5) * 0.012)); }
    // los que entran: los primeros (filas delanteras), repartidos al azar dentro de ellas
    const order = P.map((p, i) => i).sort((a, b) => (P[b].z + hash(b * 3.3) * 0.15) - (P[a].z + hash(a * 3.3) * 0.15)), okSet = new Set(order.slice(0, R.ok));
    const lab = signPlane(R.name, { w: 1.2, h: 0.2, col: '#EEF2F6' }); lab.rotation.x = -Math.PI / 2; lab.position.set(R.x, 0.004, 0.25); Z.add(lab);
    return { m, P, ok: okSet, cols, R, lab };
  });
  return { Z, blocks };
}

// ---------------------------------------------------------------- 5-7: el examen tipo test, el temario y el cronómetro
const EZ = v3(9, 0, -20), NQ = 30;
function sheetTex() {
  return canvasTex(720, 1000, (g, w, h) => {
    g.fillStyle = '#F1EEE7'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1B1F27'; g.font = '700 34px SpaceMono'; g.letterSpacing = '6px'; g.textAlign = 'left'; g.fillText('EXAMEN · TEST', 40, 66);
    g.font = '400 20px SpaceMono'; g.fillStyle = '#5C636D'; g.fillText('PRIMER EJERCICIO · ELIMINATORIO', 40, 100);
    g.fillStyle = '#C9C3B6'; g.fillRect(40, 118, w - 80, 2);
    g.font = '700 20px SpaceMono'; g.letterSpacing = '2px';
    for (let q = 0; q < NQ; q++) { const col = q < 15 ? 0 : 1, row = q % 15, x = 50 + col * 340, y = 160 + row * 55;
      g.fillStyle = '#1B1F27'; g.fillText(String(q + 1).padStart(2, '0'), x, y + 7);
      for (let o = 0; o < 4; o++) { g.strokeStyle = '#7A7468'; g.lineWidth = 2.5; g.beginPath(); g.arc(x + 70 + o * 60, y, 15, 0, 7); g.stroke(); g.fillStyle = '#7A7468'; g.font = '400 14px SpaceMono'; g.fillText('ABCD'[o], x + 65 + o * 60, y + 5); g.font = '700 20px SpaceMono'; } }
  });
}
// centro de la burbuja (opción o) de la pregunta q, en coordenadas del plano de la hoja (0,9 × 1,25 m)
function bubbleXY(q, o) { const col = q < 15 ? 0 : 1, row = q % 15, x = 50 + col * 340 + 70 + o * 60, y = 160 + row * 55; return [(x / 720 - 0.5) * 0.9, (0.5 - y / 1000) * 1.25]; }
function stopwatch() {
  const g = new THREE.Group();
  const body = cyl(0.3, 0.3, 0.09, metalS(0xc9ced6, 0.3), 64); body.rotation.x = Math.PI / 2; g.add(body);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.27, 64), new THREE.MeshBasicMaterial({ map: canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#0D0F12'; c.beginPath(); c.arc(256, 256, 256, 0, 7); c.fill();
    for (let i = 0; i < 60; i++) { const a = i / 60 * 6.283, r0 = i % 5 ? 222 : 200; c.strokeStyle = i % 5 ? '#5C636D' : '#EEF2F6'; c.lineWidth = i % 5 ? 3 : 7; c.beginPath(); c.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); c.lineTo(256 + Math.sin(a) * 240, 256 - Math.cos(a) * 240); c.stroke(); } }), toneMapped: false }));
  face.position.z = 0.046; g.add(face);
  const arc = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.235, 64, 1, Math.PI / 2, 0.001), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.4, 0.3), transparent: true, opacity: 0.85, side: THREE.DoubleSide, toneMapped: false }));
  arc.position.z = 0.048; g.add(arc);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.24, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.5, 0.3), toneMapped: false })); hand.geometry.translate(0, 0.1, 0); hand.position.z = 0.052; g.add(hand);
  const crown = cyl(0.04, 0.04, 0.06, metalS(0xc9ced6), 20); crown.position.y = 0.33; g.add(crown);
  const btn = cyl(0.05, 0.05, 0.03, metalS(0xc9ced6), 20); btn.position.y = 0.375; g.add(btn);
  g.userData = { hand, arc }; return g;
}
function buildExam() {
  const Z = new THREE.Group(); Z.position.copy(EZ); scene.add(Z);
  const sheet = new THREE.Group(); sheet.position.set(0, 1.0, 0); Z.add(sheet);
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.25, 0.008), [plasticS(0xe9e5dc, 0.8), plasticS(0xe9e5dc, 0.8), plasticS(0xe9e5dc, 0.8), plasticS(0xe9e5dc, 0.8), new THREE.MeshStandardMaterial({ map: sheetTex(), roughness: 0.85 }), plasticS(0xe9e5dc, 0.8)]);
  paper.castShadow = true; sheet.add(paper);
  // marcas: una por pregunta (respondida en oro, fallo en rojo); y «−0,33» que salen de los fallos
  const marks = new THREE.InstancedMesh(new THREE.CircleGeometry(0.017, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NQ);
  marks.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NQ * 3), 3); marks.frustumCulled = false; sheet.add(marks); marks.position.z = 0.0055;
  const ans = []; for (let q = 0; q < NQ; q++) ans.push({ o: Math.floor(hash(q * 4.1) * 4), wrong: hash(q * 7.7) < 0.3 });
  const minus = []; for (let k = 0; k < 6; k++) { const s = signPlane('−0,33', { w: 0.26, h: 0.09, col: '#FF5A4E', font: '"SpaceMono"', weight: 700 }); Z.add(s); minus.push(s); }
  // el temario: una pila de libros a la izquierda
  const books = new THREE.Group(); books.position.set(-0.8, 0, 0.1); Z.add(books);
  const bc = [0x8c2f2a, 0x2f4d6b, 0x6b5a2f, 0x3d6b4d, 0x5a2f6b, 0x7a3f22, 0x2f5f6b, 0x6b2f45, 0x4d4d4d, 0x8a6a2a];
  for (let i = 0; i < 10; i++) { const b = rbox(0.42 + hash(i) * 0.06, 0.07 + hash(i * 2.3) * 0.03, 0.3, plasticS(bc[i], 0.6), 0.01); b.rotation.x = Math.PI / 2; b.position.set((hash(i * 5.1) - 0.5) * 0.04, 0.05 + i * 0.1, 0); b.rotation.z = (hash(i * 3.7) - 0.5) * 0.12; books.add(b); }
  const bl = signPlane('TEMARIO', { w: 0.5, h: 0.1, col: '#EEF2F6', font: '"SpaceMono"', weight: 700, ls: 6 }); bl.position.set(-0.8, 1.15, 0.12); Z.add(bl);
  const sw = stopwatch(); sw.position.set(1.05, 1.05, 0.15); sw.scale.setScalar(0.85); Z.add(sw);
  // «leer» ≠ «entrenar»: el libro abierto frente al examen con el reloj
  const open = new THREE.Group(); open.position.set(-0.8, 1.55, 0.2); Z.add(open);
  for (const s of [-1, 1]) { const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.32), new THREE.MeshStandardMaterial({ map: canvasTex(256, 340, (c, w, h) => { c.fillStyle = '#EDE8DD'; c.fillRect(0, 0, w, h); c.fillStyle = '#8C857A'; for (let i = 0; i < 18; i++) c.fillRect(22, 30 + i * 16, 180 + hash(i * s) * 30, 5); }), side: THREE.DoubleSide, roughness: 0.8 }));
    pg.position.x = s * 0.125; pg.rotation.y = -s * 0.25; open.add(pg); }
  return { Z, sheet, marks, ans, minus, books, bl, sw, open };
}

// ---------------------------------------------------------------- 8: la criba — la puerta del test y, detrás, la torre de la prueba física
const GZ = v3(18, 0, -15);
function buildGates() {
  const Z = new THREE.Group(); Z.position.copy(GZ); scene.add(Z);
  const pm = plasticS(0xe9edf2, 0.35);
  const arch = (w, h, lab, col) => { const g = new THREE.Group(); const a = rbox(0.08, h, 0.08, pm, 0.02), b = a.clone(), c = rbox(w + 0.08, 0.1, 0.1, pm, 0.02);
    a.position.set(-w / 2, h / 2, 0); b.position.set(w / 2, h / 2, 0); c.position.set(0, h, 0); g.add(a, b, c);
    const s = signPlane(lab, { w: w * 0.9, h: 0.16, col }); s.position.set(0, h + 0.17, 0); g.add(s); return g; };
  const gT = arch(1.3, 1.0, 'TEST', '#FFB547'); gT.position.set(0, 0, 0); Z.add(gT);
  const gF = arch(1.3, 1.0, 'PRUEBA FÍSICA', '#EEF2F6'); gF.position.set(0, 0, -3.2); Z.add(gF);
  // torre de maniobras (escalera) detrás de la prueba física
  const tw = new THREE.Group(); tw.position.set(0.9, 0, -3.8); Z.add(tw);
  for (const x of [-0.18, 0.18]) { const r = cyl(0.025, 0.025, 2.6, metalS(0x8c939d), 10); r.position.set(x, 1.3, 0); tw.add(r); }
  for (let i = 0; i < 12; i++) { const r = cyl(0.015, 0.015, 0.36, metalS(0x8c939d), 8); r.rotation.z = Math.PI / 2; r.position.set(0, 0.2 + i * 0.2, 0); tw.add(r); }
  // aspirantes: casi todos se quedan en el test (rojos), unos pocos pasan a la física y aún menos la superan
  const N = 420, figs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.03, 0.07, 3, 8), plasticS(0xffffff, 0.45), N);
  figs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); figs.frustumCulled = false; figs.castShadow = true; Z.add(figs);
  const F = []; for (let i = 0; i < N; i++) { const k = hash(i * 2.7), stage = k < 0.8 ? 0 : k < 0.95 ? 1 : 2;   // 80 % caen en el test, 15 % en la física (ilustrativo)
    const zz = stage === 0 ? 0.3 + hash(i * 4.1) * 1.6 : stage === 1 ? -0.4 - hash(i * 4.1) * 2.4 : -3.5 - hash(i * 4.1) * 0.8;
    F.push({ stage, x: (hash(i * 6.3) - 0.5) * (stage === 0 ? 2.2 : 1.1), z: zz, d: hash(i * 8.8) }); }
  return { Z, figs, F, gT, gF, tw };
}

// ---------------------------------------------------------------- 9-12: la app — ruleta del temario, pregunta, duelo en directo, contra la IA
const AZ = v3(4, 0, -32);
const TOPICS = ['LEGISLACIÓN', 'FÍSICA', 'QUÍMICA', 'CALLEJERO', 'CONSTRUCCIÓN', 'P. AUXILIOS', 'HIDRÁULICA', 'PSICOTÉCNICO'];
const TCOL = ['#F2B233', '#2FC7B6', '#E0453A', '#EEF2F6', '#FF7A2F', '#62E3D4', '#B98BFF', '#FFD36B'];
function buildApp() {
  const Z = new THREE.Group(); Z.position.copy(AZ); scene.add(Z);
  // ruleta
  const wheel = new THREE.Group(); wheel.position.set(0, 1.35, 0); Z.add(wheel);
  const wt = canvasTex(1024, 1024, (g, w, h) => { const n = TOPICS.length;
    for (let i = 0; i < n; i++) { g.fillStyle = TCOL[i]; g.beginPath(); g.moveTo(512, 512); g.arc(512, 512, 500, i / n * 6.2832 - Math.PI / 2, (i + 1) / n * 6.2832 - Math.PI / 2); g.closePath(); g.fill();
      g.save(); g.translate(512, 512); g.rotate((i + 0.5) / n * 6.2832 - Math.PI / 2); g.fillStyle = i === 3 || i === 7 ? '#14171C' : '#0B0D10'; g.font = '900 44px Inter'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(TOPICS[i], 470, 0); g.restore(); }
    g.fillStyle = '#0B0D10'; g.beginPath(); g.arc(512, 512, 90, 0, 7); g.fill(); g.strokeStyle = '#EEF2F6'; g.lineWidth = 10; g.beginPath(); g.arc(512, 512, 500, 0, 7); g.stroke(); });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 96), [plasticS(0x16191e, 0.4), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.35 }), plasticS(0x16191e, 0.4)]);
  disc.rotation.x = Math.PI / 2; disc.castShadow = true; wheel.add(disc);
  const ptr = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 3), plasticS(0xeef2f6, 0.25)); ptr.rotation.z = Math.PI; ptr.position.set(0, 0.51, 0.04); wheel.add(ptr);
  // tarjeta de pregunta
  const card = new THREE.Group(); card.position.set(0, 1.35, 0.25); Z.add(card);
  const ct = canvasTex(720, 900, (g, w, h) => { g.fillStyle = '#F1EEE7'; rr(g, 0, 0, w, h, 40); g.fill(); g.fillStyle = '#1B1F27'; g.font = '700 30px SpaceMono'; g.letterSpacing = '4px'; g.fillText('CALLEJERO · 12/20', 40, 70);
    g.fillStyle = '#9AA3AE'; for (let i = 0; i < 3; i++) { rr(g, 40, 120 + i * 40, [600, 520, 380][i], 20, 10); g.fill(); }
    for (let o = 0; o < 4; o++) { g.strokeStyle = '#7A7468'; g.lineWidth = 4; rr(g, 40, 300 + o * 130, w - 80, 100, 24); g.stroke(); g.fillStyle = '#1B1F27'; g.font = '900 40px Inter'; g.fillText('ABCD'[o], 75, 365 + o * 130); g.fillStyle = '#B7B0A3'; rr(g, 140, 340 + o * 130, 300 + hash(o) * 160, 20, 10); g.fill(); } });
  const cardM = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.9), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.6, transparent: true })); card.add(cardM);
  const okBar = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.9, 1.1), transparent: true, opacity: 0.0, toneMapped: false })); okBar.position.set(0, -0.03, 0.002);   // la opción B (fila 430-530 de 900 px) card.add(okBar);
  // duelo: dos opositores y la IA
  const duel = new THREE.Group(); duel.position.set(0, 0, -0.2); Z.add(duel);
  const dA = makeDoll(plasticS(GOLD, 0.3)), dB = makeDoll(plasticS(TEA, 0.3)); dA.scale.setScalar(1.2); dB.scale.setScalar(1.2); dA.position.set(-0.55, 0, 0); dB.position.set(0.55, 0, 0); dA.rotation.y = 0.5; dB.rotation.y = -0.5; duel.add(dA, dB);
  const ai = new THREE.Group(); ai.position.set(0.55, 0.9, 0); duel.add(ai);
  const aiHead = rbox(0.34, 0.28, 0.28, plasticS(0x1a1d22, 0.3), 0.06); ai.add(aiHead);
  const aiEye = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.0, 1.9), toneMapped: false })); aiEye.position.z = 0.142; ai.add(aiEye);
  const aiLab = signPlane('IA', { w: 0.2, h: 0.1, col: '#62E3D4', font: '"SpaceMono"', weight: 700 }); aiLab.position.set(0, 0.24, 0); ai.add(aiLab);
  const vs = signPlane('VS', { w: 0.4, h: 0.22, col: '#FF7A2F' }); vs.position.set(0, 1.0, 0.1); duel.add(vs);
  const bars = [-1, 1].map(s => { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.05), new THREE.MeshBasicMaterial({ color: s < 0 ? CGold : CTe, toneMapped: false })); b.position.set(s * 0.55, 1.35, 0.05); duel.add(b); return b; });
  // cierre: el nombre de la marca
  const end = new THREE.Group(); end.position.set(0, 1.45, 0.3); Z.add(end);
  const title = signPlane('BOMBERADOS', { w: 0.95, h: 0.19, col: '#FFFFFF' }); end.add(title);
  const sub = signPlane('LA APP PARA OPOSITORES A BOMBERO', { w: 0.85, h: 0.05, col: '#FFB547', font: '"SpaceMono"', weight: 700, ls: 4 }); sub.position.y = -0.16; end.add(sub);
  return { Z, wheel, disc, card, cardM, okBar, duel, dA, dB, ai, vs, bars, end, title, sub };
}
