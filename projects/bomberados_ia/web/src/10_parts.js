// ---------------------------------------------------------------- «Bomberados IA»: piezas
const GOLD = 0xf2b233, EMB = 0xff7a2f, RED = 0xe0453a, TEA = 0x2fc7b6;
const CGold = new THREE.Color(2.0, 1.25, 0.3), CRed = new THREE.Color(1.9, 0.25, 0.2), CTe = new THREE.Color(0.25, 1.6, 1.45);
const plasticS = (c, r = 0.28) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05 });
const metalS = (c, r = 0.25) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 1 });
const SANS = '"Inter", "SpaceMono", sans-serif';
const PZ = v3(0, 0, 0);            // la sartén (y la respuesta)
const DZ = v3(8, 0, -14);          // la mesa de estudio
const DY = 0.742;                  // altura del tablero de la mesa
function signPlane(txt, { w = 1, h = 0.25, col = '#EEF2F6', bg = null, size = 0.62, font = SANS, weight = 900, ls = 0 } = {}) {
  const tw = 1024, th = Math.round(1024 * h / w);
  const tex = canvasTex(tw, th, (g, W2, H2) => { if (bg) { g.fillStyle = bg; rr(g, 4, 4, W2 - 8, H2 - 8, H2 * 0.18); g.fill(); }
    let px = Math.round(H2 * size); g.letterSpacing = ls + 'px'; g.font = `${weight} ${px}px ${font}`; const mw = g.measureText(txt).width; if (mw > W2 * 0.92) { px = Math.floor(px * W2 * 0.92 / mw); g.font = `${weight} ${px}px ${font}`; }
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W2 / 2, H2 / 2 + H2 * 0.04); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 6; return m;
}
function helmet(col) {
  const g = new THREE.Group(), m = plasticS(col, 0.22);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1, 0.95, 1.12); dome.castShadow = true; g.add(dome);
  const prof = []; for (let i = 0; i <= 10; i++) { const u = i / 10; prof.push(new THREE.Vector2(0.128 + u * 0.075, -0.004 - u * u * 0.02)); }
  const brim = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, side: THREE.DoubleSide })); brim.scale.set(1, 1, 1.18); brim.castShadow = true; g.add(brim);
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.011, 8, 40, Math.PI), m); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1, 0.95, 1.12); g.add(ridge);
  const badge = rbox(0.06, 0.07, 0.012, metalS(0xd9dde3, 0.4), 0.012); badge.position.set(0, 0.075, 0.138); badge.rotation.x = -0.45; g.add(badge);
  return g;
}
const stdTex = (map, r = 0.6, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: r, ...o });

// ---------------------------------------------------------------- la sartén en el fogón
function buildPan() {
  const G = new THREE.Group(); G.position.copy(PZ); scene.add(G);
  const iron = plasticS(0x1b1c1f, 0.55);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.009, 8, 56), iron); ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; ring.castShadow = true; G.add(ring);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const b = rbox(0.12, 0.014, 0.016, iron, 0.005); b.position.set(Math.cos(a) * 0.115, 0.034, -Math.sin(a) * 0.115); b.rotation.y = a; G.add(b); }
  const burner = cyl(0.05, 0.056, 0.02, metalS(0x3a3c40, 0.4), 32); burner.position.y = 0.01; G.add(burner);
  const gas = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.006, 6, 40), basicGlow(new THREE.Color(0.25, 0.55, 2.4))); gas.rotation.x = Math.PI / 2; gas.position.y = 0.024; G.add(gas);
  const prof = [[0, 0], [0.112, 0], [0.126, 0.004], [0.141, 0.03], [0.153, 0.055], [0.157, 0.059], [0.149, 0.059], [0.136, 0.033], [0.119, 0.009], [0, 0.009]].map(([x, y]) => new THREE.Vector2(x, y));
  const pan = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), new THREE.MeshStandardMaterial({ color: 0x26272b, roughness: 0.36, metalness: 0.75, side: THREE.DoubleSide }));
  pan.position.y = 0.04; pan.castShadow = true; pan.receiveShadow = true; G.add(pan);
  const handle = rbox(0.21, 0.026, 0.032, plasticS(0x111214, 0.45), 0.012); handle.position.set(0.255, 0.098, 0); handle.rotation.z = 0.16; G.add(handle);
  const rivet = rbox(0.04, 0.03, 0.036, metalS(0x6a6d72, 0.3), 0.01); rivet.position.set(0.158, 0.085, 0); rivet.rotation.z = 0.16; G.add(rivet);
  const oilT = canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(128, 128, 4, 128, 128, 128); r.addColorStop(0, '#fff2b0'); r.addColorStop(0.45, '#ffb238'); r.addColorStop(0.85, '#e0560f'); r.addColorStop(1, '#8a2405'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.13, 56), new THREE.MeshBasicMaterial({ map: oilT, color: new THREE.Color(1.6, 1.25, 1.0), toneMapped: false }));
  oil.rotation.x = -Math.PI / 2; oil.position.y = 0.052; G.add(oil);
  return { G, oil, gas };
}

// ---------------------------------------------------------------- la habitación: suelo, pared con ventana, mesa, silla, flexo, estantería, reloj
function woodTex(w, h, base, n, seed, alphaEdge = false) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { const y = hash(i * 3.3 + seed) * h, a = 0.05 + hash(i * 7.1 + seed) * 0.12; g.strokeStyle = `rgba(30,16,6,${a})`; g.lineWidth = 1 + hash(i * 1.9) * 3; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6 + Math.sin(x * 0.037 + i * 2.3) * 2); g.stroke(); }
    if (alphaEdge) { const r = g.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.52); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = r; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; }
  });
}
function skyTex(night) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = g.createLinearGradient(0, 0, 0, h);
    if (!night) { r.addColorStop(0, '#5a6fa8'); r.addColorStop(0.45, '#e58a5a'); r.addColorStop(0.75, '#ffc27a'); r.addColorStop(1, '#ffdca0'); }
    else { r.addColorStop(0, '#05070f'); r.addColorStop(0.6, '#0e1a33'); r.addColorStop(1, '#1d2d52'); }
    g.fillStyle = r; g.fillRect(0, 0, w, h);
    if (night) for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + hash(i) * 0.6})`; g.fillRect(hash(i * 3.1) * w, hash(i * 5.7) * h * 0.55, 2, 2); }
    // edificios a contraluz con ventanas encendidas
    for (let i = 0; i < 9; i++) { const bx = i * 60 - 10 + hash(i * 2.2) * 20, bw = 50 + hash(i * 4.4) * 30, bh = 90 + hash(i * 6.6) * 140;
      g.fillStyle = night ? '#060912' : '#3a2a3a'; g.fillRect(bx, h - bh, bw, bh);
      if (night) for (let k = 0; k < 18; k++) if (hash(i * 31 + k) > 0.45) { g.fillStyle = hash(k * 1.3 + i) > 0.5 ? '#ffcf7a' : '#fff1c9'; g.fillRect(bx + 6 + (k % 3) * 15, h - bh + 10 + Math.floor(k / 3) * 22, 7, 9); } }
  });
}
function buildRoom() {
  const R = new THREE.Group(); R.position.copy(DZ); scene.add(R);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.6), stdTex(woodTex(1024, 1024, '#5b3d27', 70, 1, true), 0.5, { transparent: true }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.003, 0.35); floor.receiveShadow = true; R.add(floor);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), plasticS(0x3b2f3a, 0.95)); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.006, 0.45); rug.receiveShadow = true; R.add(rug);
  // pared con ventana (hueco de 0,9 × 1,0 m)
  const wallM = plasticS(0x2b313b, 0.92), wz = -0.75, wx0 = -0.4, wx1 = 0.5, wy0 = 0.98, wy1 = 1.98;
  const wpart = (x0, x1, y0, y1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.08), wallM); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, wz); b.castShadow = true; b.receiveShadow = true; R.add(b); };
  wpart(-1.8, wx0, 0, 2.7); wpart(wx1, 1.8, 0, 2.7); wpart(wx0, wx1, 0, wy0); wpart(wx0, wx1, wy1, 2.7);
  const frM = plasticS(0xe9e6df, 0.5);
  for (const [w, h, x, y] of [[0.94, 0.05, 0.05, wy0], [0.94, 0.05, 0.05, wy1], [0.05, 1.04, wx0, 1.48], [0.05, 1.04, wx1, 1.48], [0.03, 1.0, 0.05, 1.48], [0.9, 0.03, 0.05, 1.48]]) { const f = rbox(w, h, 0.1, frM, 0.01); f.position.set(x, y, wz + 0.01); R.add(f); }
  const sill = rbox(1.05, 0.035, 0.18, frM, 0.01); sill.position.set(0.05, wy0 - 0.02, wz + 0.08); R.add(sill);
  const skyA = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshBasicMaterial({ map: skyTex(false), toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) }));
  const skyB = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshBasicMaterial({ map: skyTex(true), toneMapped: false, transparent: true, opacity: 0 }));
  skyA.position.set(0.05, 1.5, wz - 0.45); skyB.position.set(0.05, 1.5, wz - 0.44); R.add(skyA, skyB);
  // mesa
  const top = rbox(1.4, 0.035, 0.72, stdTex(woodTex(1024, 512, '#7a5236', 60, 2), 0.45), 0.012); top.position.set(0, DY - 0.018, 0); R.add(top);
  for (const [x, z] of [[-0.66, -0.31], [0.66, -0.31], [-0.66, 0.31], [0.66, 0.31]]) { const l = cyl(0.016, 0.016, DY - 0.035, plasticS(0x15161a, 0.4), 12); l.position.set(x, (DY - 0.035) / 2, z); R.add(l); }
  // silla
  const chM = plasticS(0x1f2329, 0.8);
  const seat = rbox(0.46, 0.06, 0.44, chM, 0.025); seat.position.set(0, 0.43, 0.6); R.add(seat);
  const back = rbox(0.44, 0.48, 0.05, chM, 0.03); back.position.set(0, 0.8, 0.83); back.rotation.x = -0.12; R.add(back);
  const col = cyl(0.025, 0.025, 0.36, metalS(0x2c2e33, 0.3), 16); col.position.set(0, 0.22, 0.6); R.add(col);
  for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283, leg = rbox(0.26, 0.025, 0.04, chM, 0.01); leg.position.set(Math.cos(a) * 0.12, 0.04, 0.6 + Math.sin(a) * 0.12); leg.rotation.y = -a; R.add(leg); }
  // flexo
  const lamp = new THREE.Group(); lamp.position.set(-0.56, DY, -0.24); R.add(lamp);
  const lm = plasticS(0x1c1d21, 0.35);
  const lb = cyl(0.075, 0.08, 0.022, lm, 32); lb.position.y = 0.011; lamp.add(lb);
  const a1 = cyl(0.009, 0.009, 0.36, metalS(0x8c939d, 0.3), 10); a1.position.set(0, 0.18, 0.04); a1.rotation.x = -0.22; lamp.add(a1);
  const a2 = cyl(0.009, 0.009, 0.3, metalS(0x8c939d, 0.3), 10); a2.position.set(0.06, 0.37, 0.16); a2.rotation.set(1.05, 0, -0.35); lamp.add(a2);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.35, side: THREE.DoubleSide }));
  shade.position.set(0.13, 0.43, 0.29); shade.rotation.set(-0.5, 0, 0.55); shade.castShadow = true; lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.18, 0.15), toneMapped: false })); bulb.position.set(0.15, 0.4, 0.31); lamp.add(bulb);
  // estantería con el casco (el sueño) y libros; reloj de pared; calendario con días tachados
  const shelf = rbox(0.7, 0.03, 0.2, stdTex(woodTex(512, 256, '#6a4a32', 30, 5), 0.5), 0.008); shelf.position.set(-1.0, 1.55, wz + 0.11); R.add(shelf);
  const hm = helmet(GOLD); hm.scale.setScalar(0.85); hm.position.set(-1.12, 1.6, wz + 0.12); hm.rotation.y = 0.5; R.add(hm);
  for (let i = 0; i < 4; i++) { const b = rbox(0.035, 0.2 + hash(i) * 0.05, 0.15, plasticS([0x8c2a24, 0x23476b, 0x6b5a2f, 0x2f6b5a][i], 0.6), 0.006); b.position.set(-0.85 + i * 0.045, 1.67, wz + 0.11); R.add(b); }
  const clock = new THREE.Group(); clock.position.set(0.95, 1.78, wz + 0.05); R.add(clock);
  const cf = new THREE.Mesh(new THREE.CircleGeometry(0.13, 48), stdTex(canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f2efe8'; g.beginPath(); g.arc(128, 128, 128, 0, 7); g.fill();
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.strokeStyle = '#1b1f27'; g.lineWidth = 6; g.beginPath(); g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.lineTo(128 + Math.sin(a) * 118, 128 - Math.cos(a) * 118); g.stroke(); } }), 0.5));
  clock.add(cf); const crim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 10, 48), plasticS(0x15161a, 0.4)); clock.add(crim);
  const hh = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.004), plasticS(0x15161a, 0.4)); hh.geometry.translate(0, 0.03, 0); hh.position.z = 0.006; clock.add(hh);
  const mh = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.105, 0.004), plasticS(0x15161a, 0.4)); mh.geometry.translate(0, 0.045, 0); mh.position.z = 0.009; clock.add(mh);
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), stdTex(canvasTex(340, 420, (g, w, h) => { g.fillStyle = '#efece5'; g.fillRect(0, 0, w, h); g.fillStyle = '#c2453a'; g.fillRect(0, 0, w, 70);
    g.fillStyle = '#fff'; g.font = '900 34px Inter'; g.textAlign = 'center'; g.fillText('OPOSICIÓN', w / 2, 48);
    for (let i = 0; i < 35; i++) { const x = 20 + (i % 7) * 43, y = 95 + Math.floor(i / 7) * 62; g.strokeStyle = '#b9b4aa'; g.lineWidth = 2; g.strokeRect(x, y, 38, 54);
      if (i < 23) { g.strokeStyle = '#d0392b'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 6, y + 8); g.lineTo(x + 32, y + 46); g.moveTo(x + 32, y + 8); g.lineTo(x + 6, y + 46); g.stroke(); } } }), 0.8));
  cal.position.set(0.98, 1.3, wz + 0.045); R.add(cal);
  // pósits en la pared
  const pc = [0xffd84a, 0xff9c6b, 0x8fe3c9, 0xffd84a, 0xf7f3a0];
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.075), plasticS(pc[i], 0.8)); p.position.set(-0.62 + (i % 3) * 0.085, 1.15 + Math.floor(i / 3) * 0.1, wz + 0.042); p.rotation.z = (hash(i * 3.3) - 0.5) * 0.3; R.add(p); }
  const mug = new THREE.Group(); mug.position.set(0.52, DY, 0.02); R.add(mug);
  const mb = cyl(0.04, 0.036, 0.095, plasticS(0xe9e6df, 0.35), 32); mb.position.y = 0.048; mug.add(mb);
  const mh2 = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 20), plasticS(0xe9e6df, 0.35)); mh2.position.set(0.045, 0.05, 0); mug.add(mh2);
  const pen = cyl(0.0045, 0.0045, 0.14, plasticS(0x1d5fbf, 0.3), 10); pen.rotation.set(0, 0.6, Math.PI / 2); pen.position.set(0.34, DY + 0.005, 0.24); R.add(pen);
  return { R, skyA, skyB, bulb, clock: { hh, mh }, lamp };
}

// ---------------------------------------------------------------- el opositor: figura articulada «de animación», sentada
function makePerson() {
  const P = new THREE.Group(), J = {};
  const skin = plasticS(0xd09a7c, 0.55), hood = plasticS(0x2e3746, 0.88), jean = plasticS(0x394559, 0.8), hair = plasticS(0x22160e, 0.72), shoe = plasticS(0xeceae4, 0.55), dark = plasticS(0x15110d, 0.3);
  const cap = (r, h, m) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 8, 20), m); c.castShadow = true; c.receiveShadow = true; return c; };
  const sp = (r, m, ws = 24, hs = 16) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m); s.castShadow = true; s.receiveShadow = true; return s; };
  const piv = (par, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g); return g; };
  J.hips = piv(P, 0, 0.5, 0);
  const pelvis = sp(0.16, jean); pelvis.scale.set(1.05, 0.62, 0.85); J.hips.add(pelvis);
  J.spine = piv(J.hips, 0, 0.05, 0);
  const torso = cap(0.15, 0.25, hood); torso.position.y = 0.2; torso.scale.set(1.12, 1, 0.74); J.spine.add(torso);
  const belly = sp(0.14, hood); belly.scale.set(1.08, 0.75, 0.82); belly.position.set(0, 0.06, -0.01); J.spine.add(belly);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.032, 12, 32), hood); collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.42, 0.005); J.spine.add(collar);
  const hoodB = sp(0.11, hood); hoodB.scale.set(1.15, 0.72, 0.55); hoodB.position.set(0, 0.42, 0.085); J.spine.add(hoodB);
  for (const sd of [-1, 1]) { const st = cyl(0.004, 0.004, 0.12, plasticS(0xd8d4cc, 0.6), 6); st.position.set(sd * 0.03, 0.36, -0.105); st.rotation.x = 0.15; J.spine.add(st); }
  J.neck = piv(J.spine, 0, 0.44, 0);
  const neck = cyl(0.042, 0.046, 0.1, skin, 16); neck.position.y = 0.03; J.neck.add(neck);
  J.head = piv(J.neck, 0, 0.07, 0);
  const head = sp(0.1, skin, 32, 24); head.scale.set(0.9, 1.1, 1.0); head.position.set(0, 0.1, -0.005); J.head.add(head);
  const jaw = sp(0.075, skin); jaw.scale.set(0.82, 0.62, 0.88); jaw.position.set(0, 0.045, -0.03); J.head.add(jaw);
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.107, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), hair); hairTop.scale.set(0.95, 1.06, 1.06); hairTop.position.set(0, 0.112, 0.008); hairTop.rotation.x = 0.32; hairTop.castShadow = true; J.head.add(hairTop);
  const hairBack = sp(0.1, hair); hairBack.scale.set(0.97, 0.9, 0.9); hairBack.position.set(0, 0.105, 0.022); J.head.add(hairBack);
  const fringe = cap(0.03, 0.1, hair); fringe.rotation.z = Math.PI / 2 + 0.25; fringe.position.set(-0.01, 0.185, -0.075); fringe.scale.set(1, 1, 0.7); J.head.add(fringe);
  for (const sd of [-1, 1]) {
    const ear = sp(0.022, skin, 12, 10); ear.scale.set(0.45, 1, 0.8); ear.position.set(sd * 0.091, 0.095, 0.0); J.head.add(ear);
    const eye = sp(0.0115, dark, 12, 10); eye.position.set(sd * 0.034, 0.112, -0.093); J.head.add(eye);
    const br = cap(0.0055, 0.028, hair); br.rotation.z = Math.PI / 2 - sd * 0.12; br.position.set(sd * 0.036, 0.138, -0.094); J.head.add(br);
  }
  const nose = cap(0.011, 0.018, skin); nose.rotation.x = 0.35; nose.position.set(0, 0.085, -0.103); J.head.add(nose);
  const lips = cap(0.005, 0.022, plasticS(0xa86a5a, 0.5)); lips.rotation.z = Math.PI / 2; lips.position.set(0, 0.048, -0.09); J.head.add(lips);
  for (const sd of [-1, 1]) {
    const sh = piv(J.spine, sd * 0.2, 0.37, 0); const ua = cap(0.05, 0.2, hood); ua.position.y = -0.13; sh.add(ua);
    const el = piv(sh, 0, -0.28, 0); const fa = cap(0.043, 0.17, hood); fa.position.y = -0.11; el.add(fa);
    const cuff = cyl(0.038, 0.038, 0.03, plasticS(0x252c38, 0.9), 16); cuff.position.y = -0.225; el.add(cuff);
    const wr = piv(el, 0, -0.25, 0);
    const palm = sp(0.04, skin, 20, 14); palm.scale.set(1.0, 1.15, 0.42); palm.position.y = -0.045; wr.add(palm);
    for (let f = 0; f < 4; f++) { const fg = cap(0.0085, 0.032 + (f === 1 || f === 2 ? 0.006 : 0), skin); fg.position.set((f - 1.5) * 0.017, -0.098, -0.006); fg.rotation.x = 0.45; wr.add(fg); }
    const th = cap(0.01, 0.03, skin); th.position.set(-sd * 0.04, -0.045, -0.012); th.rotation.z = -sd * 0.6; wr.add(th);
    const hp = piv(J.hips, sd * 0.095, -0.02, 0); const ul = cap(0.07, 0.3, jean); ul.position.y = -0.2; hp.add(ul);
    const kn = piv(hp, 0, -0.42, 0); const ll = cap(0.055, 0.32, jean); ll.position.y = -0.2; kn.add(ll);
    const an = piv(kn, 0, -0.43, 0); const sh2 = rbox(0.1, 0.08, 0.27, shoe, 0.035); sh2.position.set(0, -0.025, -0.06); an.add(sh2);
    const sole = rbox(0.104, 0.02, 0.274, plasticS(0x9a9a96, 0.7), 0.008); sole.position.set(0, -0.062, -0.06); an.add(sole);
    const k = sd < 0 ? 'L' : 'R'; J['sh' + k] = sh; J['el' + k] = el; J['wr' + k] = wr; J['hp' + k] = hp; J['kn' + k] = kn; J['an' + k] = an;
  }
  P.userData.J = J; return P;
}
// posturas (rotaciones x, y, z de cada articulación) y mezcla entre ellas
const POSE = {
  read: { spine: [-0.34, 0, 0], neck: [-0.2, 0, 0], head: [-0.32, 0, 0], shL: [0.95, 0, 0.16], elL: [1.0, 0, 0], wrL: [0.15, 0, 0], shR: [0.95, 0, -0.16], elR: [1.0, 0, 0], wrR: [0.15, 0, 0] },
  lookL: { spine: [-0.3, 0.25, 0], neck: [-0.1, 0.2, 0], head: [-0.2, 0.35, 0], shL: [1.05, 0, 0.1], elL: [0.9, 0, 0], wrL: [0.2, 0, 0], shR: [0.85, 0, -0.18], elR: [1.1, 0, 0], wrR: [0.15, 0, 0] },
  flip: { spine: [-0.36, 0.1, 0], neck: [-0.15, 0, 0], head: [-0.38, 0.05, 0], shL: [0.9, 0, 0.2], elL: [1.05, 0, 0], wrL: [0.15, 0, 0], shR: [1.12, 0.3, -0.05], elR: [0.75, 0, 0], wrR: [0.3, 0, 0] },
  slump: { spine: [-0.78, 0, 0.04], neck: [-0.3, 0, 0], head: [-0.25, 0.1, 0.3], shL: [1.42, 0, 0.5], elL: [1.85, 0, 0], wrL: [0, 0, 0], shR: [1.42, 0, -0.5], elR: [1.85, 0, 0], wrR: [0, 0, 0] },
  shock: { spine: [-0.05, 0, 0], neck: [0.1, 0, 0], head: [0.05, 0, 0], shL: [0.75, 0, 0.12], elL: [1.25, 0, 0], wrL: [0.2, 0, 0], shR: [0.75, 0, -0.12], elR: [1.25, 0, 0], wrR: [0.2, 0, 0] },
  up: { spine: [-0.12, 0, 0], neck: [0.0, 0, 0], head: [-0.05, 0, 0], shL: [0.6, 0, 0.12], elL: [1.15, 0, 0], wrL: [0.2, 0, 0], shR: [0.75, 0, -0.12], elR: [0.95, 0, 0], wrR: [0.2, 0, 0] },
  mouse: { spine: [-0.2, -0.05, 0], neck: [-0.02, 0, 0], head: [-0.1, 0, 0], shL: [0.6, 0, 0.14], elL: [1.2, 0, 0], wrL: [0.2, 0, 0], shR: [0.88, -0.1, -0.3], elR: [0.7, 0, 0], wrR: [0.35, 0, 0] },
};
const LEGS = { hpL: [1.57, 0.05, 0.06], hpR: [1.57, -0.05, -0.06], knL: [-1.5, 0, 0], knR: [-1.5, 0, 0], anL: [-0.05, 0, 0], anR: [-0.05, 0, 0] };
function applyPose(J, keys, t) {
  // keys: [[t, 'pose'], …] → mezcla suave entre las dos posturas vecinas
  let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
  const A = POSE[keys[i][1]], B = POSE[keys[Math.min(i + 1, keys.length - 1)][1]];
  const t0 = keys[i][0], t1 = keys[Math.min(i + 1, keys.length - 1)][0], d = Math.min(0.45, Math.max(0.01, t1 - t0));
  const w = t1 > t0 ? sm5(clamp((t - (t1 - d)) / d)) : 0;
  for (const j in A) { const a = A[j], b = B[j] || a; J[j].rotation.set(lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)); }
  for (const j in LEGS) J[j].rotation.set(...LEGS[j]);
}

// ---------------------------------------------------------------- manuales: la torre, el libro abierto con páginas que pasan, pestañas
function pageTex(kind, seed, mirror = false) {
  return canvasTex(512, 720, (g, w, h) => {
    if (mirror) { g.translate(w, 0); g.scale(-1, 1); }      // dorso: se ve desde el otro lado
    g.fillStyle = '#f1ece1'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1f27'; g.textAlign = 'left';
    if (kind === 'index') {
      g.font = '900 44px Inter'; g.fillText('ÍNDICE', 44, 86);
      const T = ['Combustión', 'Clases de fuego', 'Agentes extintores', 'Extintores', 'Hidráulica', 'Rescate', 'Construcción', 'Legislación', 'Primeros auxilios', 'Callejero'];
      g.font = '500 25px Inter'; T.forEach((s, i) => { g.fillStyle = '#1b1f27'; g.fillText(`${i + 1}. ${s}`, 44, 150 + i * 52); g.fillStyle = '#8c857a'; g.textAlign = 'right'; g.fillText(String(12 + i * 37 + Math.floor(hash(i + seed) * 9)), w - 44, 150 + i * 52); g.textAlign = 'left';
        g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = 44 + g.measureText(`${i + 1}. ${s}`).width + 12; x < w - 100; x += 10) g.fillRect(x, 146 + i * 52, 3, 3); });
    } else {
      g.font = '900 30px Inter'; g.fillText(kind === 'fire' ? 'TEMA 2 · COMBUSTIÓN' : 'TEMA ' + (3 + Math.floor(hash(seed) * 9)), 44, 76);
      g.fillStyle = '#8c857a'; for (let i = 0; i < 26; i++) { if (kind === 'fire' && i > 7 && i < 17) continue; g.fillRect(44, 110 + i * 22, 340 + hash(i + seed * 7) * 80, 7); }
      if (kind === 'fire') { g.strokeStyle = '#c2453a'; g.lineWidth = 6; g.beginPath(); g.moveTo(256, 300); g.lineTo(150, 470); g.lineTo(362, 470); g.closePath(); g.stroke();
        g.fillStyle = '#1b1f27'; g.font = '700 17px Inter'; g.textAlign = 'center'; g.fillText('COMBUSTIBLE', 256, 500); g.fillText('CALOR', 120, 290); g.fillText('OXÍGENO', 392, 290); }
    }
    g.fillStyle = '#8c857a'; g.font = '700 20px SpaceMono'; g.textAlign = 'center'; g.fillText(String(30 + Math.floor(hash(seed * 3.7) * 300)), w / 2, h - 30);
  });
}
function spineTex(txt, col) {
  return canvasTex(512, 96, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(14, 10, 4, h - 20); g.fillRect(w - 18, 10, 4, h - 20);
    g.fillStyle = '#f4efe3'; g.font = '900 34px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; let px = 34; while (g.measureText(txt).width > w - 70 && px > 14) { px--; g.font = `900 ${px}px Inter`; } g.fillText(txt, w / 2, h / 2 + 2); });
}
function buildBooks(R) {
  const edgeT = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#eae3d4'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(120,108,90,.35)'; for (let y = 2; y < h; y += 3) g.fillRect(0, y, w, 1); });
  const edgeM = stdTex(edgeT, 0.9);
  const tower = new THREE.Group(); tower.position.set(-0.47, DY, 0.06); R.add(tower);
  const BK = [['MANUAL DE INCENDIOS', '#8c2a24'], ['RESCATE', '#23476b'], ['HIDRÁULICA', '#2f6b5a'], ['CONSTRUCCIÓN', '#6b5a2f'], ['LEGISLACIÓN', '#4a3a6b'], ['TEMARIO GENERAL', '#2b2f36']];
  let y = 0; const books = [];
  BK.forEach(([t, c], i) => { const th = 0.04 + hash(i * 1.7) * 0.02, cm = plasticS(new THREE.Color(c), 0.65);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, th, 0.25), [edgeM, cm, cm, cm, stdTex(spineTex(t, c), 0.6), edgeM]);
    b.castShadow = true; b.receiveShadow = true; b.position.set((hash(i * 4.1) - 0.5) * 0.02, y + th / 2, 0); b.rotation.y = (hash(i * 2.9) - 0.5) * 0.12; tower.add(b); books.push({ b, y0: y + th / 2, x0: b.position.x }); y += th; });
  // pestañas de colores (temas) que asoman por el lateral
  const tabs = []; const tc = [0xff5a4e, 0xffd84a, 0x62e3d4, 0xffffff, 0xff9c3b];
  for (let i = 0; i < 5; i++) { const tb = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.006, 0.034), plasticS(tc[i], 0.45)); tb.position.set(0.1, books[1 + (i % 4)].y0 + 0.008, -0.08 + i * 0.04); tower.add(tb); tabs.push(tb); }
  // el libro abierto delante del opositor
  const ob = new THREE.Group(); ob.position.set(-0.17, DY, 0.15); ob.rotation.y = 0.1; R.add(ob);
  const cover = rbox(0.37, 0.006, 0.26, plasticS(0x8c2a24, 0.6), 0.004); cover.position.y = 0.003; ob.add(cover);
  const pgM = stdTex(pageTex('fire', 1), 0.85), pgM2 = stdTex(pageTex('text', 2), 0.85);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.016, 0.245), [edgeM, edgeM, s < 0 ? pgM2 : pgM, edgeM, edgeM, edgeM]); st.position.set(s * 0.089, 0.014, 0); st.rotation.z = -s * 0.03; st.castShadow = true; st.receiveShadow = true; ob.add(st); }
  const PK = [['text', 3], ['index', 4], ['text', 5], ['fire', 6], ['text', 7], ['text', 8]], PT = PK.map(([k, s]) => pageTex(k, s)), PB = PK.map(([k, s]) => pageTex(k === 'index' ? 'text' : k, s + 20, true));
  const pages = []; for (let k = 0; k < 8; k++) { const geo = new THREE.PlaneGeometry(0.17, 0.24, 16, 1); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: PT[k % PT.length], roughness: 0.85, side: THREE.FrontSide })); m.castShadow = true; m.position.y = 0.023; m.frustumCulled = false; ob.add(m);
    const b = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: PB[k % PB.length], roughness: 0.85, side: THREE.BackSide })); b.position.y = 0.023; b.frustumCulled = false; ob.add(b);
    pages.push({ m, b, base: Float32Array.from(geo.attributes.position.array) }); }
  return { tower, books, tabs, ob, pages };
}
// dobla una página: θ = 0 (sobre la pila derecha) … π (sobre la izquierda); la punta va con retraso (curvatura)
function bendPage(pg, th) {
  const pos = pg.m.geometry.attributes.position, b = pg.base, n = 16, du = 0.17 / n, cs = [], ys = [];
  let x = 0, y = 0; for (let i = 0; i <= n; i++) { cs.push(x); ys.push(y); const ph = th - 0.95 * Math.sin(th) * Math.pow(i / n, 1.2); x += Math.cos(ph) * du; y += Math.sin(ph) * du; }
  for (let v = 0; v < pos.count; v++) { const u = b[v * 3] + 0.085, i = Math.round(u / du); pos.setXYZ(v, cs[i], ys[i] + 0.0004 * i * Math.sin(th), b[v * 3 + 2]); }
  pos.needsUpdate = true; pg.m.geometry.computeVertexNormals();
}

// ---------------------------------------------------------------- hojas sueltas (apuntes) que salen volando en remolino
function buildSheets(R) {
  const tex = [canvasTex(256, 360, (g, w, h) => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9fb6d6'; g.lineWidth = 2; for (let y = 40; y < h; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.strokeStyle = '#e07a7a'; g.beginPath(); g.moveTo(34, 0); g.lineTo(34, h); g.stroke();
      g.strokeStyle = '#2a3a8a'; g.lineWidth = 2.5; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(44, 56 + i * 20); for (let x = 44; x < 200 + hash(i) * 40; x += 8) g.lineTo(x, 56 + i * 20 + Math.sin(x * 0.4 + i) * 3); g.stroke(); } }),
    canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffd84a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a3020'; g.lineWidth = 5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(30, 60 + i * 44); for (let x = 30; x < 210; x += 10) g.lineTo(x, 60 + i * 44 + Math.sin(x * 0.3 + i) * 4); g.stroke(); } }),
    pageTex('text', 9), pageTex('fire', 10)];
  const dims = [[0.1, 0.14], [0.07, 0.07], [0.1, 0.14], [0.1, 0.14]], per = 34, sets = [];
  const backC = [0xeeeae0, 0xf2cf45, 0xeeeae0, 0xeeeae0];
  tex.forEach((t, k) => { const geo = new THREE.PlaneGeometry(...dims[k]);
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.FrontSide }), per);
    const mb = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: backC[k], roughness: 0.9, side: THREE.BackSide }), per);
    m.castShadow = true; m.frustumCulled = false; mb.frustumCulled = false; mb.instanceMatrix = m.instanceMatrix; R.add(m, mb); sets.push(m); m.userData.back = mb; });
  const P = []; for (let i = 0; i < 4 * per; i++) P.push({ a0: hash(i * 1.3) * 6.283, r1: 0.35 + hash(i * 2.1) * 0.75, h1: 0.25 + hash(i * 3.7) * 1.1, sp: 2.2 + hash(i * 4.9) * 2.4, d: hash(i * 5.3) * 0.5,
    tx: hash(i * 6.1) * 6.283, ty: hash(i * 7.7) * 6.283, fx: (hash(i * 8.3) - 0.5) * 2.6, fz: 0.2 + (hash(i * 9.1) - 0.3) * 1.8, fr: hash(i * 9.7) * 6.283 });
  return { sets, P, per };
}

// ---------------------------------------------------------------- hoja de respuestas (31-45, V/F) y la plantilla transparente encima
const SH_W = 0.21, SH_H = 0.297, ROW0 = 31, NROW = 15;
const ANS = []; for (let i = 0; i < NROW; i++) ANS.push(ROW0 + i === 37 ? -1 : (hash(i * 5.1) < 0.5 ? 0 : 1));
const rowY = i => 330 + i * 64;                 // y del renglón i en el lienzo de 600 × 848
const bubX = o => 330 + o * 120;                // x de la burbuja V (0) o F (1)
function answerTex() {
  return canvasTex(600, 848, (g, w, h) => {
    g.fillStyle = '#f3f0e9'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1f27'; g.font = '900 34px Inter'; g.textAlign = 'left'; g.fillText('HOJA DE RESPUESTAS', 40, 74);
    g.font = '500 20px Inter'; g.fillStyle = '#5c636d'; g.fillText('EXAMEN TEÓRICO · VERDADERO / FALSO', 40, 110);
    g.fillStyle = '#c9c3b6'; g.fillRect(40, 132, w - 80, 3);
    g.font = '700 22px SpaceMono'; g.fillStyle = '#5c636d'; g.textAlign = 'center'; g.fillText('V', bubX(0), 290); g.fillText('F', bubX(1), 290);
    for (let i = 0; i < NROW; i++) { const y = rowY(i);
      g.fillStyle = '#1b1f27'; g.font = '700 26px SpaceMono'; g.textAlign = 'left'; g.fillText(String(ROW0 + i), 120, y + 9);
      for (let o = 0; o < 2; o++) { g.strokeStyle = '#7a7468'; g.lineWidth = 3; g.beginPath(); g.arc(bubX(o), y, 21, 0, 7); g.stroke();
        if (ANS[i] === o) { g.fillStyle = '#2a2d33'; g.beginPath(); g.arc(bubX(o) + (hash(i) - 0.5) * 3, y + (hash(i * 2) - 0.5) * 3, 16, 0, 7); g.fill(); } } }
    g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(100, rowY(6) - 30, 400, 60);
  });
}
function plantillaTex(prog) {         // marcas de la plantilla (✓ verde, ✗ rojo en la 37) hasta el renglón «prog»
  return (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(200,235,255,.10)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(160,210,255,.55)'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = 'rgba(120,180,230,.9)'; g.font = '700 22px SpaceMono'; g.textAlign = 'right'; g.fillText('PLANTILLA', w - 30, 60);
    for (let i = 0; i < NROW; i++) { if (i >= prog || ROW0 + i === 37) continue; const y = rowY(i);
      g.strokeStyle = '#1f9d55'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(470, y); g.lineTo(486, y + 16); g.lineTo(516, y - 16); g.stroke(); }
  };
}
function buildSheet(R) {
  const G = new THREE.Group(); G.position.set(0.17, DY + 0.0015, 0.17); G.rotation.y = -0.1; R.add(G);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(SH_W, SH_H), stdTex(answerTex(), 0.85)); paper.rotation.x = -Math.PI / 2; paper.receiveShadow = true; G.add(paper);
  const plt = canvasTex(600, 848, plantillaTex(0)), ov = new THREE.Group(); G.add(ov);
  const ovm = new THREE.Mesh(new THREE.PlaneGeometry(SH_W, SH_H), new THREE.MeshBasicMaterial({ map: plt, transparent: true, depthWrite: false })); ovm.rotation.x = -Math.PI / 2; ovm.position.y = 0.0012; ovm.renderOrder = 5; ov.add(ovm);
  // la V de la 37 (la que pone el opositor: la del fuego) y la ✗ roja
  const xy = (cx, cy) => v3((cx / 600 - 0.5) * SH_W, 0, (cy / 848 - 0.5) * SH_H);
  const vMark = new THREE.Mesh(new THREE.CircleGeometry(0.0075, 24), new THREE.MeshBasicMaterial({ color: 0x2a2d33 })); vMark.rotation.x = -Math.PI / 2; vMark.position.copy(xy(bubX(0), rowY(6))).add(v3(0, 0.0008, 0)); G.add(vMark);
  const xT = canvasTex(256, 256, (g, w, h) => { g.strokeStyle = '#ff3b30'; g.lineWidth = 30; g.lineCap = 'round'; g.beginPath(); g.moveTo(50, 50); g.lineTo(206, 206); g.moveTo(206, 50); g.lineTo(50, 206); g.stroke(); });
  const xMark = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), new THREE.MeshBasicMaterial({ map: xT, transparent: true, depthWrite: false, color: new THREE.Color(1.6, 1.0, 1.0), toneMapped: false })); xMark.rotation.x = -Math.PI / 2; xMark.position.copy(xy(500, rowY(6))).add(v3(0, 0.0025, 0)); xMark.renderOrder = 7; G.add(xMark);
  return { G, ov, plt, vMark, xMark, xy, bubV: () => G.localToWorld(xy(bubX(0), rowY(6))), row37: () => G.localToWorld(xy(330, rowY(6))) };
}

// ---------------------------------------------------------------- el portátil: tapa con bisagra, pantalla, ventana de la app, cursor, tarjetas de la IA
const AW = 0.118, AH = 0.182, APX = 900 / AW;     // ventana de la app en la pantalla (m) y píxeles por metro del lienzo
function buildLaptop(R) {
  const L = new THREE.Group(); L.position.set(0.05, DY, -0.12); R.add(L);
  const alu = new THREE.MeshStandardMaterial({ color: 0xa3a8ae, roughness: 0.32, metalness: 0.85 });
  const base = rbox(0.34, 0.016, 0.235, alu, 0.01); base.position.y = 0.008; L.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.1), stdTex(canvasTex(512, 180, (g, w, h) => { g.fillStyle = '#1a1c20'; g.fillRect(0, 0, w, h); g.fillStyle = '#2c2f35';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) { rr(g, 6 + c * 36, 6 + r * 34, 30, 28, 4); g.fill(); } }), 0.6));
  kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.0165, -0.03); L.add(kb);
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), plasticS(0x8e939a, 0.25)); tp.rotation.x = -Math.PI / 2; tp.position.set(0, 0.0166, 0.07); L.add(tp);
  const lid = new THREE.Group(); lid.position.set(0, 0.016, -0.1175); L.add(lid);
  const shell = rbox(0.34, 0.008, 0.235, alu, 0.008); shell.position.set(0, 0.004, 0.1175); lid.add(shell);
  const scr = new THREE.Group(); scr.position.set(0, -0.0006, 0.1175); scr.rotation.x = Math.PI / 2; lid.add(scr);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(0.332, 0.226), new THREE.MeshBasicMaterial({ color: 0x050607 })); scr.add(bezel);
  const desk = canvasTex(1024, 640, (g, w, h) => { const r = g.createLinearGradient(0, 0, w, h); r.addColorStop(0, '#141a26'); r.addColorStop(1, '#2a1b16'); g.fillStyle = r; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,140,60,${0.05 + hash(i) * 0.08})`; g.beginPath(); g.arc(hash(i * 3.3) * w, hash(i * 5.5) * h, 20 + hash(i * 7.7) * 90, 0, 7); g.fill(); } });
  const dispM = new THREE.MeshBasicMaterial({ map: desk, color: new THREE.Color(0, 0, 0), toneMapped: false });
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.195), dispM); disp.position.z = 0.0003; scr.add(disp);
  const appT = canvasTex(900, Math.round(AH * APX)); appT.anisotropy = 16;
  const appM = new THREE.MeshBasicMaterial({ map: appT, color: new THREE.Color(0, 0, 0), toneMapped: false, transparent: true });
  const app = new THREE.Mesh(new THREE.PlaneGeometry(AW, AH), appM); app.position.z = 0.0007; scr.add(app);
  // tarjetas de la IA (se separan de la pantalla) y cursor
  const cardDims = [[0.11, 0.032], [0.11, 0.042], [0.11, 0.058]], cardY = [0.036, -0.006, -0.06];
  const cards = cardDims.map((d, k) => { const t = canvasTex(Math.round(d[0] * APX), Math.round(d[1] * APX)); t.anisotropy = 16;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d[0], d[1]), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, color: new THREE.Color(1.12, 1.12, 1.12) }));
    const g = new THREE.Group(); g.position.set(0, cardY[k], 0.001); g.add(m); scr.add(g); g.visible = false; return { g, m, t, d, y: cardY[k], last: '' }; });
  const curT = canvasTex(64, 96, (g) => { g.fillStyle = '#ffffff'; g.strokeStyle = '#000000'; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); g.moveTo(6, 4); g.lineTo(6, 78); g.lineTo(24, 62); g.lineTo(36, 90); g.lineTo(48, 84); g.lineTo(36, 58); g.lineTo(58, 56); g.closePath(); g.stroke(); g.fill(); });
  const curGeo = new THREE.PlaneGeometry(0.0085, 0.0128); curGeo.translate(0.0085 / 2 - 0.0085 * 6 / 64, -0.0128 / 2 + 0.0128 * 4 / 96, 0);
  const cursor = new THREE.Mesh(curGeo, new THREE.MeshBasicMaterial({ map: curT, transparent: true, depthWrite: false, toneMapped: false })); cursor.position.z = 0.004; cursor.renderOrder = 8; scr.add(cursor);
  // la IA «pensando»: un orbe turquesa que sale de la pantalla con chispas alrededor
  const orb = new THREE.Group(); orb.position.set(0, 0.0, 0.03); scr.add(orb);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.012, 32, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.4, 2.2), toneMapped: false })); orb.add(core);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshBasicMaterial({ map: starTex0(), color: new THREE.Color(0.2, 1.3, 1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); orb.add(halo);
  const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0016, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.4, 2.2), toneMapped: false }), 40); sparks.frustumCulled = false; orb.add(sparks);
  orb.visible = false;
  const setOpen = a => { lid.rotation.x = -a * (Math.PI / 2 + 0.28); };
  setOpen(0);
  return { L, lid, scr, disp, dispM, app, appM, appT, cards, cursor, orb, core, halo, sparks, setOpen };
}

// ---------------------------------------------------------------- la respuesta: gota de aceite, «B» de líquido (letra 3D) y la placa de la marca
function buildAnswer(font) {
  const G = new THREE.Group(); G.position.copy(PZ); scene.add(G);
  const oilM = new THREE.MeshPhysicalMaterial({ color: 0xffa21f, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, emissive: 0x2a1000, sheen: 0 });
  const dp = []; for (let i = 0; i <= 32; i++) { const a = Math.PI * (1 - i / 32); dp.push(new THREE.Vector2(Math.max(1e-4, 0.048 * Math.sin(a) * Math.pow(Math.sin(a / 2), 1.3)), Math.cos(a) * 0.065)); }   // gota: de abajo (redonda) a la punta
  const drop = new THREE.Mesh(new THREE.LatheGeometry(dp, 48), oilM); drop.castShadow = true; G.add(drop); drop.visible = false;
  const tg = new TextGeometry('B', { font, size: 0.2, depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.007, bevelSegments: 4, curveSegments: 10 }); tg.center();
  const bL = new THREE.Mesh(tg, oilM); bL.castShadow = true; G.add(bL); bL.visible = false;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 12, 8), oilM, 36); drops.frustumCulled = false; G.add(drops); drops.visible = false;
  // la placa dorada con el nombre (como en la miniatura)
  const plate = new THREE.Group(); plate.position.set(0, 0.8, 0.05); G.add(plate);
  const pb = rbox(0.8, 0.205, 0.045, new THREE.MeshStandardMaterial({ color: 0xe8a530, roughness: 0.28, metalness: 0.65 }), 0.03); plate.add(pb);
  const pt = canvasTex(1600, 410, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, '#ffd65c'); r.addColorStop(1, '#e88c1e'); g.fillStyle = r; rr(g, 0, 0, w, h, 60); g.fill();
    g.fillStyle = 'rgba(255,240,190,.35)'; rr(g, 12, 10, w - 24, 46, 23); g.fill();
    g.fillStyle = '#160f05'; g.textAlign = 'center'; g.textBaseline = 'middle'; let px = 300; g.font = `${px}px Impact, "Inter"`; while (g.measureText('BOMBERADOS').width > w - 120) { px -= 4; g.font = `${px}px Impact, "Inter"`; } g.fillText('BOMBERADOS', w / 2, h / 2 + 12); });
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(0.775, 0.199), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.3, metalness: 0.25, emissive: 0xffffff, emissiveMap: pt, emissiveIntensity: 0.32 })); pf.position.z = 0.0232; plate.add(pf);
  const sub = signPlane('LA APP PARA OPOSITORES A BOMBERO', { w: 0.74, h: 0.05, col: '#FFC24A', font: '"SpaceMono"', weight: 700, ls: 4 }); sub.position.set(0, -0.15, 0.03); plate.add(sub);
  plate.visible = false;
  return { G, drop, bL, drops, plate, oilM };
}
