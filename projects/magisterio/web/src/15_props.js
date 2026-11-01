// ---------------------------------------------------------------- objetos que se mueven: el collar (abre y cierra el vídeo), los macarrones sueltos
// (cuenco → «?» → cordón con la serie), el ábaco, las letras de pasta, los niños del tallímetro, los iconos de la mesa, el calendario,
// los muñecos de la oposición y los 25 niños.
const _o = new THREE.Object3D(), _col = new THREE.Color(), _q0 = new THREE.Quaternion(), _Y = v3(0, 1, 0);
const CW = new THREE.Color(0xf1eee8), CB = new THREE.Color(0x141416), CN = new THREE.Color(0xe6c27a);
const NK_C = v3(0, 0.84, 0), NK_R = 0.105, NK_N = 16;
const BOWL = v3(0.44, TABLE_Y, 0.0), LACE_Z = 0.2, LACE_X0 = -0.22, LACE_X1 = 0.25, LACE_Y = TABLE_Y + 0.0075, SHEET = v3(0.12, TABLE_Y + 0.0012, -0.15);
const NQ = 16, NL = 40;          // 16 macarrones forman la «?»; 40 en total sueltos
const SER_N = 8, SER_X = i => LACE_X1 - 0.07 - i * 0.047;      // la serie (en el cordón, de la punta hacia dentro)
const ABA = v3(-3.92, 0.55, -2.75);
function easeArc(a, b, u, hgt) { const p = a.clone().lerp(b, eio(clamp(u))); p.y += Math.sin(Math.PI * clamp(u)) * hgt; return p; }
function buildProps(font) {
  const P = S.props = {};
  const MG = S.macGeo = macGeo();
  // collar flotante sobre la mesa central: 16 macarrones blancos y negros en un cordón, y una chispa que lo recorre
  const nk = new THREE.Group(); nk.position.copy(NK_C); scene.add(nk); P.nk = nk;
  const ring = new THREE.Group(); ring.rotation.x = 0.42; nk.add(ring); P.nkRing = ring;
  const th = new THREE.Mesh(new THREE.TorusGeometry(NK_R, 0.0011, 6, 160), M.string); th.rotation.x = Math.PI / 2; ring.add(th);
  P.nkMac = [];
  for (let i = 0; i < NK_N; i++) { const a = (i + 0.5) / NK_N * Math.PI * 2, m = mesh(MG, i % 2 ? M.macB : M.macW); m.position.set(NK_R * Math.cos(a), 0, NK_R * Math.sin(a)); m.quaternion.setFromUnitVectors(_Y, v3(-Math.sin(a), 0, Math.cos(a))); m.rotateY(i * 0.7); ring.add(m); P.nkMac.push(m); }
  P.spark = []; for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.0034 * (1 - i / 16), 10, 8), basicGlow(0xfff2d6, 1)); s.renderOrder = 8; ring.add(s); P.spark.push(s); }
  P.sparkL = new THREE.PointLight(0xffe6c0, 0, 0.6, 1.8); ring.add(P.sparkL);
  // cuenco de cerámica con macarrones; los sueltos son una sola malla instanciada
  const bowl = lathe([[0, 0], [0.04, 0], [0.042, 0.004], [0.07, 0.02], [0.088, 0.055], [0.09, 0.062], [0.084, 0.062], [0.082, 0.055], [0.064, 0.022], [0.036, 0.008], [0, 0.008]], 64, new THREE.MeshPhysicalMaterial({ color: 0xf2f0eb, roughness: 0.25, clearcoat: 1 }));
  bowl.position.copy(BOWL); scene.add(bowl);
  const mi = new THREE.InstancedMesh(MG, M.macI, NL); mi.castShadow = true; mi.receiveShadow = true; mi.frustumCulled = false; scene.add(mi); P.mi = mi;
  P.bowlPos = []; P.bowlQ = []; P.qPos = []; P.qQ = [];
  for (let i = 0; i < NL; i++) {
    const r = 0.055 * Math.sqrt(hash(i * 3.7)), a = hash(i * 9.1) * 6.283, y = 0.016 + hash(i * 2.3) * 0.032 + (0.055 - r) * 0.25;
    P.bowlPos.push(BOWL.clone().add(v3(r * Math.cos(a), y, r * Math.sin(a))));
    P.bowlQ.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(hash(i * 4.4) * 3, hash(i * 5.5) * 3, Math.PI / 2 + (hash(i * 6.6) - 0.5))));
    mi.setColorAt(i, i >= 24 && i < 24 + SER_N ? ((i - 24) % 2 ? CB : CW) : i < NQ ? (i % 2 ? CB : CW) : (hash(i * 7.7) > 0.55 ? CN : (i % 2 ? CB : CW)));
  }
  // la «?» tumbada en la mesa (se lee desde delante, de pie hacia el fondo): arco + palo + punto (un macarrón de pie)
  { const cx = -0.43, cz = -0.1, R0 = 0.105, path = [];
    for (let i = 0; i <= 60; i++) { const a = lerp(Math.PI * 0.95, -Math.PI * 0.42, i / 60); path.push(v3(cx + Math.cos(a) * R0, 0, cz - 0.07 - Math.sin(a) * R0)); }
    const e = path[path.length - 1]; for (let i = 1; i <= 10; i++) path.push(v3(lerp(e.x, cx + 0.005, i / 10), 0, lerp(e.z, cz + 0.13, i / 10)));
    const len = []; let L = 0; path.forEach((p, i) => { if (i) L += p.distanceTo(path[i - 1]); len.push(L); });
    const n = NQ - 1, at2 = s => { let k = 1; while (k < len.length - 1 && len[k] < s) k++; const u = (s - len[k - 1]) / (len[k] - len[k - 1]); return [path[k - 1].clone().lerp(path[k], u), path[k].clone().sub(path[k - 1]).normalize()]; };
    for (let i = 0; i < n; i++) { const [p, d] = at2(0.02 + i * (L - 0.04) / (n - 1)); P.qPos.push(p.add(v3(0, TABLE_Y + 0.0072, 0))); P.qQ.push(new THREE.Quaternion().setFromUnitVectors(_Y, d)); }
    P.qPos.push(v3(cx + 0.005, TABLE_Y + 0.02, cz + 0.205)); P.qQ.push(new THREE.Quaternion());
  }
  // cordón con punta de plástico (para ensartar) y hoja de escritura con pauta
  { const pts = []; for (let i = 0; i <= 30; i++) { const x = lerp(LACE_X0 - 0.12, LACE_X1, i / 30); pts.push(v3(x, LACE_Y + (x < LACE_X0 ? -0.0055 : 0), LACE_Z + Math.sin(i * 0.9) * 0.002 + (x < LACE_X0 ? (LACE_X0 - x) * 0.6 : 0))); }
    const lace = tube(pts, 0.0016, M.string, 120, false, 8); scene.add(lace); P.lace = lace;
    const ag = cyl(0.0022, 0.0022, 0.022, M.black, 12); ag.rotation.z = Math.PI / 2; ag.position.set(LACE_X1 + 0.01, LACE_Y, LACE_Z); scene.add(ag); P.aglet = ag; }
  const wt = cpuTex(1024, 720); P.sheetTex = wt;
  const sheet = mesh(new THREE.PlaneGeometry(0.24, 0.17), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 }), false);
  sheet.rotation.set(-Math.PI / 2, 0, 0.08); sheet.position.copy(SHEET); scene.add(sheet); P.sheet = sheet; P.sheetK = -1;
  const pc = pencil(); pc.visible = false; scene.add(pc); P.pencil = pc;
  // ábaco del rincón de matemáticas: marco de madera y 5 varillas con 10 macarrones grandes cada una (la de arriba, de pasta natural)
  { const ab = new THREE.Group(); ab.position.copy(ABA); ab.rotation.y = Math.PI / 2; scene.add(ab); P.ab = ab;
    const W2 = 0.72, H2 = 0.52, f = 0.04;
    for (const x of [-W2 / 2, W2 / 2]) { const s = mesh(new THREE.BoxGeometry(f, H2 + 0.06, f), M.woodD); s.position.set(x, H2 / 2 + 0.03, 0); ab.add(s); }
    for (const y of [0.03, H2 + 0.03]) { const s = mesh(new THREE.BoxGeometry(W2 + f, f, f), M.woodD); s.position.set(0, y, 0); ab.add(s); }
    const ft = mesh(new THREE.BoxGeometry(W2 + 0.12, 0.025, 0.2), M.woodD); ft.position.y = 0.012; ab.add(ft);
    P.abY = []; for (let r = 0; r < 5; r++) { const y = 0.1 + r * 0.095; P.abY.push(y); const rod = cyl(0.004, 0.004, W2, M.steel, 10); rod.rotation.z = Math.PI / 2; rod.position.y = y; ab.add(rod); }
    const bm = new THREE.InstancedMesh(MG, M.macI, 50); bm.castShadow = true; bm.receiveShadow = true; ab.add(bm); P.abM = bm; P.abW = W2;
    for (let r = 0; r < 5; r++) for (let i = 0; i < 10; i++) bm.setColorAt(r * 10 + i, r === 4 ? CN : (r % 2 ? CB : CW));
  }
  // letras de pasta «MAMÁ» en la alfombra (rincón de lectura) y un cuento abierto
  { P.letters = []; const word = ['M', 'A', 'M', 'A']; let x = 0;
    const lg = new THREE.Group(); lg.position.set(-2.55, 0.004, -0.12); lg.rotation.y = Math.PI / 2; scene.add(lg); P.lg = lg;
    const geos = word.map(c => { const g = new TextGeometry(c, { font, size: 0.11, depth: 0.028, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 3 }); g.computeBoundingBox(); return g; });
    const total = geos.reduce((s, g) => s + g.boundingBox.max.x - g.boundingBox.min.x + 0.03, -0.03);
    x = -total / 2; geos.forEach((g, i) => { const w = g.boundingBox.max.x - g.boundingBox.min.x; g.translate(-g.boundingBox.min.x - w / 2, 0, -0.015);
      const m = mesh(g, M.macN); const p = new THREE.Group(); p.add(m); p.position.set(x + w / 2, 0, 0); lg.add(p); P.letters.push(p); x += w + 0.03; });
    const ac = mesh(new THREE.BoxGeometry(0.028, 0.05, 0.03), M.macN); ac.position.set(0.01, 0.142, 0); ac.rotation.z = -0.7; P.letters[3].add(ac);
    // cuento abierto: tapas y dos páginas con dibujos
    const bk = new THREE.Group(); bk.position.set(-2.78, 0.012, 0.32); bk.rotation.y = Math.PI / 2 + 0.35; scene.add(bk); P.book = bk;
    const pageTex = s => canvasTex(512, 640, (g, w, h) => { g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1c1c1e'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
      if (s) { g.beginPath(); g.arc(w * 0.5, h * 0.36, 90, 0, 7); g.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; g.beginPath(); g.moveTo(w * 0.5 + Math.cos(a) * 120, h * 0.36 + Math.sin(a) * 120); g.lineTo(w * 0.5 + Math.cos(a) * 165, h * 0.36 + Math.sin(a) * 165); g.stroke(); } }
      else { g.beginPath(); g.moveTo(w * 0.2, h * 0.55); g.lineTo(w * 0.5, h * 0.25); g.lineTo(w * 0.8, h * 0.55); g.lineTo(w * 0.8, h * 0.62); g.stroke(); g.strokeRect(w * 0.25, h * 0.55, w * 0.5, h * 0.25); g.strokeRect(w * 0.43, h * 0.65, w * 0.14, h * 0.15); }
      g.fillStyle = '#1c1c1e'; g.font = '800 64px Inter'; g.textAlign = 'center'; g.fillText(s ? 'SOL' : 'CASA', w / 2, h * 0.92); });
    P.bookL = new THREE.Group(); P.bookR = new THREE.Group(); bk.add(P.bookL, P.bookR);
    const cov = new THREE.MeshPhysicalMaterial({ color: 0x1d1e22, roughness: 0.5, clearcoat: 0.6 });
    for (const [G, s] of [[P.bookL, -1], [P.bookR, 1]]) { const c = mesh(new THREE.BoxGeometry(0.2, 0.004, 0.26), cov); c.position.x = s * 0.1; G.add(c);
      const pg = mesh(new THREE.PlaneGeometry(0.19, 0.25), new THREE.MeshStandardMaterial({ map: pageTex(s > 0), roughness: 0.85 }), false); pg.rotation.x = -Math.PI / 2; pg.position.set(s * 0.1, 0.0035, 0); G.add(pg); }
  }
  // niños de madera junto al tallímetro: 1, 3 y 6 años (0,75 · 0,95 · 1,15 m)
  { const sg = pegGeo(true); P.kidsH = [[-2.95, 0.75], [-2.28, 0.95], [-1.9, 1.15]].map(([x, h]) => { const k = mesh(sg, M.peg); k.position.set(x, 0, -RZ + 0.32); k.userData.s0 = h / 0.95; k.scale.setScalar(k.userData.s0); scene.add(k); return k; }); }
  // iconos sobre tres sitios de la mesa 1: «b d» (dislexia), peonza (TDAH), ∞ dorado (autismo)
  { const ic = []; const bd = new THREE.Group();
    ['b', 'd'].forEach((c, i) => { const g = new TextGeometry(c, { font, size: 0.1, depth: 0.02, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 }); g.center(); const m = mesh(g, M.macW); m.position.x = (i - 0.5) * 0.09; bd.add(m); });
    bd.position.set(-2.02, TABLE_Y + 0.052, -0.95); scene.add(bd); ic.push(bd);
    const tp = top3(); tp.position.set(-1.8, TABLE_Y, -0.95); scene.add(tp); ic.push(tp);
    const inf = infinity(new THREE.MeshPhysicalMaterial({ color: 0xffc95a, metalness: 1, roughness: 0.2, emissive: 0x6a4a10, emissiveIntensity: 0.4 })); inf.position.set(-1.58, TABLE_Y + 0.06, -0.95); scene.add(inf); ic.push(inf);
    ic.forEach(o => { o.userData.y0 = o.position.y; });
    P.icons = ic; }
  // calendario de pared (las hojas pasan) y tarjeta «EN PRÁCTICAS» colgada de un gancho
  { const cal = new THREE.Group(); cal.position.set(RX - 0.012, 1.45, -0.3); cal.rotation.y = -Math.PI / 2; scene.add(cal); P.cal = cal;
    const bkb = mesh(new THREE.BoxGeometry(0.4, 0.56, 0.01), M.woodD); bkb.position.z = -0.005; cal.add(bkb);
    const MONTHS = ['SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE', 'ENERO', 'FEBRERO', 'MARZO'];
    const pageT = m => canvasTex(360, 480, (g, w, h) => { g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#141416'; g.fillRect(0, 0, w, 92); g.fillStyle = '#f5f2ea'; g.font = '800 40px Inter'; g.textAlign = 'center'; g.fillText(MONTHS[m], w / 2, 62);
      g.fillStyle = '#222'; g.font = '700 26px Inter'; for (let d = 0; d < 30; d++) { const c = (d + m * 3) % 7, r = Math.floor((d + m * 3) / 7); g.fillText(String(d + 1), 36 + c * 48, 140 + r * 64); } });
    P.calTex = MONTHS.map((_, m) => pageT(m));
    P.calBase = mesh(new THREE.PlaneGeometry(0.36, 0.48), new THREE.MeshStandardMaterial({ map: P.calTex[0], roughness: 0.85 }), false); P.calBase.position.set(0, -0.02, 0.002); cal.add(P.calBase);
    P.calPiv = new THREE.Group(); P.calPiv.position.set(0, 0.22, 0.004); cal.add(P.calPiv);
    P.calFlip = mesh(new THREE.PlaneGeometry(0.36, 0.48), new THREE.MeshStandardMaterial({ map: P.calTex[0], roughness: 0.85 }), false); P.calFlip.position.y = -0.24; P.calPiv.add(P.calFlip);
    const back = mesh(new THREE.PlaneGeometry(0.36, 0.48), new THREE.MeshStandardMaterial({ color: 0xece8de, roughness: 0.9, side: THREE.BackSide }), false); P.calFlip.add(back);
    for (const x of [-0.1, 0.1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.002, 6, 16), M.steel); r.position.set(x, 0.225, 0.006); cal.add(r); }
    const hook = cyl(0.006, 0.006, 0.05, M.steel, 8); hook.rotation.z = Math.PI / 2; hook.position.set(RX - 0.03, 1.62, 0.14); scene.add(hook);
    const bd = new THREE.Group(); bd.position.set(RX - 0.05, 1.62, 0.14); scene.add(bd); P.badge = bd;
    const strap = tube([v3(0, 0, 0), v3(-0.01, -0.12, -0.05), v3(-0.012, -0.24, 0)], 0.004, M.black, 30); bd.add(strap);
    const strap2 = tube([v3(0, 0, 0), v3(-0.01, -0.12, 0.05), v3(-0.012, -0.24, 0)], 0.004, M.black, 30); bd.add(strap2);
    const card = plateText(0.09, 0.12, [['EN', 0.16, 0.3], ['PRÁCTICAS', 0.15, 0.48], ['MAESTRA / O', 0.08, 0.72, '#666']], { border: true, px: 360 }); card.rotation.y = -Math.PI / 2; card.position.set(-0.014, -0.3, 0); bd.add(card);
    const clip = mesh(new THREE.BoxGeometry(0.008, 0.02, 0.016), M.steel); clip.position.set(-0.013, -0.245, 0); bd.add(clip);
  }
  // mesa de la maestra: temario de la oposición, 19 muñecos en fila y una sillita dorada (la plaza)
  { const tm = new THREE.Group(); tm.position.set(2.37, 0.77, -2.98); scene.add(tm); P.temario = tm;
    const bnd = rbox(0.06, 0.3, 0.24, new THREE.MeshPhysicalMaterial({ color: 0x1b1c20, roughness: 0.4, clearcoat: 0.6 }), 0.01); bnd.rotation.y = Math.PI / 2; bnd.position.y = 0.15; tm.add(bnd);
    const lab = plateText(0.16, 0.05, [['TEMARIO', 0.6, 0.55]], { bg: '#f2eee6' }); lab.position.set(0, 0.2, 0.031); tm.add(lab);
    const pg = pegGeo(false); const dm = new THREE.InstancedMesh(pg, M.pegI, 19); dm.castShadow = true; dm.receiveShadow = true; dm.frustumCulled = false; scene.add(dm); P.dolls = dm;
    P.dollPos = []; for (let i = 0; i < 19; i++) { const r = Math.floor(i / 5), c = i % 5; P.dollPos.push(v3(2.6 + (c - 2) * 0.056 + (r % 2) * 0.028 + (hash(i * 3.1) - 0.5) * 0.01, 0.77, -2.5 - r * 0.058)); }
    const gc = new THREE.Group(); gc.position.set(2.6, 0.77, -2.93); scene.add(gc); P.goldChair = gc;
    const gm = new THREE.MeshPhysicalMaterial({ color: 0xffcf6e, metalness: 1, roughness: 0.22, emissive: 0xffb030, emissiveIntensity: 0 }); gm.color.setHex(0xd9b25c); P.goldM = gm;
    const cg = chairGeo(); const c = mesh(cg, gm); c.scale.setScalar(0.17); gc.add(c);
  }
  // los 25 niños (aparecen sentados en las sillitas)
  { const kg = pegGeo(false); const km = new THREE.InstancedMesh(kg, M.pegI, SEATS.length); km.castShadow = true; km.receiveShadow = true; km.frustumCulled = false; scene.add(km); P.kids = km;
    P.kidOrd = SEATS.map((s, i) => [i, Math.hypot(s[0] - 0.5, s[1] + 3)]).sort((a, b) => a[1] - b[1]).map(a => a[0]); }
}
// ---------------------------------------------------------------- un instante
function setInst(im, i, p, q, s) { _o.position.copy(p); _o.quaternion.copy(q); _o.scale.setScalar(Math.max(0.0001, s)); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); }
function propsAt(t) {
  const P = S.props;
  // collar: gira despacio (dos vueltas por bucle) y la chispa da 40 vueltas por bucle (el último fotograma enlaza con el primero)
  P.nk.rotation.y = Math.PI * 4 * t / END;
  const glowK = 0.55 + 0.45 * Math.max(1 - win(t, 2.6, 0.6), win(t, 52.3, 0.8));
  const ph = (t / END * 40) % 1;
  P.spark.forEach((s, i) => { const a = (ph - i * 0.011) * Math.PI * 2; s.position.set(NK_R * Math.cos(a), 0, NK_R * Math.sin(a)); s.material.color.setRGB(1, 0.95, 0.84).multiplyScalar((6 - i * 0.38) * glowK); });
  { const a = ph * Math.PI * 2; P.sparkL.position.set(NK_R * Math.cos(a), 0.01, NK_R * Math.sin(a)); P.sparkL.intensity = 0.25 * glowK; }
  // macarrones sueltos: cuenco → «?» (L2) → cuenco (L12) → cordón (L13, la serie) → cuenco (L15)
  const T_Q = K.para2 - 0.05, T_BACK = K.macarrones12, T_HOME = K.asi15 + 0.3;
  for (let i = 0; i < NL; i++) {
    let p = P.bowlPos[i], q = P.bowlQ[i];
    if (i < NQ) { const t0 = T_Q + i * 0.025, u = clamp((t - t0) / 0.45), v = clamp((t - T_BACK - i * 0.015) / 0.4);
      if (u > 0 && v < 1) { p = v > 0 ? easeArc(P.qPos[i], P.bowlPos[i], v, 0.12) : easeArc(P.bowlPos[i], P.qPos[i], u, 0.14); q = _q0.copy(v > 0 ? P.qQ[i] : P.bowlQ[i]).slerp(v > 0 ? P.bowlQ[i] : P.qQ[i], eio(v > 0 ? v : u)).clone(); } }
    const j = i - 24;            // la serie usa los macarrones 24…31 (blanco, negro, blanco…)
    if (j >= 0 && j < SER_N) { const ts = serT(j), u = clamp((t - ts) / 0.35), w = clamp((t - T_HOME - j * 0.03) / 0.4);
      const sp = v3(SER_X(j), LACE_Y, LACE_Z), sq = new THREE.Quaternion().setFromUnitVectors(_Y, v3(1, 0, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(_Y, j * 0.9));
      if (u > 0 && w < 1) { if (w > 0) { p = easeArc(sp, P.bowlPos[i], w, 0.1); q = sq.clone().slerp(P.bowlQ[i], eio(w)); }
        else { const tip = v3(LACE_X1 + 0.05, LACE_Y + 0.015, LACE_Z); p = u < 0.55 ? easeArc(P.bowlPos[i], tip, u / 0.55, 0.12) : tip.clone().lerp(sp, eio((u - 0.55) / 0.45)); q = P.bowlQ[i].clone().slerp(sq, eio(clamp(u / 0.55))); } } }
    setInst(P.mi, i, p, q, 1);
  }
  P.mi.instanceMatrix.needsUpdate = true; if (P.mi.instanceColor) P.mi.instanceColor.needsUpdate = false;
  // hoja de escritura: «mamá» a lápiz con pauta, se escribe al decir «escribir»; el lápiz sigue la punta
  { const k = clamp((t - K.escribir12 + 0.05) / 0.9), kk = Math.round(k * 120) / 120;
    if (kk !== P.sheetK) { P.sheetK = kk; const T = P.sheetTex, g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height;
      g.fillStyle = '#f6f2e8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,40,46,.45)'; g.lineWidth = 2;
      for (const yy of [0.36, 0.46, 0.56, 0.66]) { g.beginPath(); g.moveTo(40, h * yy); g.lineTo(w - 40, h * yy); g.stroke(); }
      g.fillStyle = '#222'; g.font = '700 46px Inter'; g.fillText('Nombre: ________', 60, 90);
      if (kk > 0) { g.save(); g.beginPath(); g.rect(0, 0, 120 + (w - 200) * kk, h); g.clip(); g.fillStyle = '#26262a'; g.font = 'italic 500 250px Cormorant'; g.fillText('mamá', 120, h * 0.6); g.restore(); }
      T.needsUpdate = true; }
    const pc = P.pencil, on = win(t, K.usara12 - 0.1, 0.3) * (1 - win(t, K.si13 + 0.4, 0.3));
    pc.visible = on > 0.01; if (pc.visible) { const x = SHEET.x - 0.12 + 0.24 * (0.12 + 0.75 * k), z = SHEET.z + 0.004 + (k > 0 && k < 1 ? Math.sin(k * 60) * 0.006 : 0);
      const tipP = v3(x, TABLE_Y + 0.0015 + (k > 0 && k < 1 ? 0 : 0.02) + 0.08 * (1 - on), z), d = v3(-0.42, -0.82, 0.38).normalize(), s = Math.max(0.001, pops(t, K.usara12 - 0.1, 0.35));
      pc.quaternion.setFromUnitVectors(_Y, d); pc.scale.setScalar(s); pc.position.copy(tipP).addScaledVector(d, -0.17 * s); } }
  // ábaco: la varilla de arriba suma 2 + 3 (pasan a la derecha) al decir «sumar»
  { const bm = P.abM, W2 = P.abW;
    const sp = 0.05;
    for (let r = 0; r < 5; r++) for (let i = 0; i < 10; i++) {
      let x = -W2 / 2 + 0.045 + i * sp;
      if (r === 4) { const moved = i < 5 ? 0 : (i >= 8 ? win(t, K.sumar5 - 0.05, 0.3) : win(t, K.sumar5 + 0.25, 0.3)); x = lerp(x, W2 / 2 - 0.045 - (9 - i) * sp, moved); }
      _o.position.set(x, P.abY[r], 0); _o.quaternion.setFromUnitVectors(_Y, v3(1, 0, 0)); _o.rotateY(i * 1.3 + r); _o.scale.setScalar(1.2); _o.updateMatrix(); bm.setMatrixAt(r * 10 + i, _o.matrix); }
    bm.instanceMatrix.needsUpdate = true; }
  // letras de pasta: «letra a letra»; el cuento se abre al decir «leer»
  { const ts = [K.letra6 - 0.08, K.letra6 + 0.12, K.letra6 + 0.32, K.letra6b - 0.04];
    P.letters.forEach((l, i) => { const k = pops(t, ts[i], 0.35); show(l, k); l.rotation.x = -0.5 * (1 - eo(clamp((t - ts[i]) / 0.4))); });
    const o = eo(clamp((t - K.ensenar6) / 0.5)); P.bookL.rotation.z = lerp(-Math.PI * 0.98, 0.04, o); P.bookR.rotation.z = -0.04; P.book.scale.setScalar(pops(t, K.lengua6 + 0.1, 0.4)); }
  // niños del tallímetro (crecen al aparecer)
  { const ts = [K.aprender4, K.nino4, K.edad4]; P.kidsH.forEach((k, i) => show(k, pops(t, ts[i] - 0.1, 0.4) * (1 - win(t, K.matematicas5 + 0.2 + i * 0.05, 0.3)))); }
  // iconos de la mesa 1: b/d se dan la vuelta (espejo), la peonza gira, el ∞ brilla
  { const ts = [K.dislexia7, K.tdah7, K.autismo7];
    P.icons.forEach((o, i) => { const k = pops(t, ts[i] - 0.08, 0.4); o.visible = k > 0.002; if (!o.visible) return; o.scale.setScalar(k); o.position.y = o.userData.y0 + (i === 1 ? 0 : 0.004 * Math.sin(t * 2.4 + i)); });
    P.icons[0].rotation.y = Math.PI * Math.floor(clamp((t - K.dislexia7) / 0.5) * 3) + Math.sin(t * 1.3) * 0.2;
    P.icons[1].rotation.y = t * 22; P.icons[1].rotation.z = 0.08 * Math.sin(t * 5);
    P.icons[2].rotation.y = Math.sin(t * 1.1) * 0.5; }
  // calendario: pasan seis hojas (septiembre → marzo) al decir «meses»; la tarjeta aparece al decir «prácticas»
  { const n = 6, f = clamp((t - K.meses8) / 0.95) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
    if (f <= 0) { P.calBase.material.map = P.calTex[0]; P.calFlip.visible = false; }
    else if (f >= n) { P.calBase.material.map = P.calTex[n]; P.calFlip.visible = false; }
    else { P.calBase.material.map = P.calTex[i + 1]; P.calFlip.material.map = P.calTex[i]; P.calFlip.visible = true; P.calPiv.rotation.x = -Math.PI * 0.95 * eio(u); }
    const b = pops(t, K.practicas8 - 0.08, 0.4); P.badge.visible = b > 0.002; P.badge.scale.setScalar(Math.max(0.001, b)); P.badge.rotation.x = 0.25 * Math.sin((t - K.practicas8) * 7) * Math.exp(-Math.max(0, t - K.practicas8) * 2.5); }
  // oposición: el temario aparece, los 19 muñecos entran en fila y la sillita dorada brilla al decir «plaza»
  { show(P.temario, pops(t, K.oposicion10 - 0.08, 0.4));
    for (let i = 0; i < 19; i++) { const k = pops(t, K.diecinueve10 - 0.12 + i * 0.03, 0.3); setInst(P.dolls, i, P.dollPos[i].clone().add(v3(0, 0.03 * (1 - clamp(k)), 0)), _q0.identity(), 0.15 * k); }
    P.dolls.instanceMatrix.needsUpdate = true;
    show(P.goldChair, pops(t, K.oposicion10 + 0.25, 0.4)); P.goldM.emissiveIntensity = 1.6 * win(t, K.plaza10 - 0.05, 0.25) * (0.75 + 0.25 * Math.sin(t * 10)); }
  // los 25 niños: aparecen en ola al decir «veinticinco» y se van al pasar a la mesa (L12)
  { for (let n = 0; n < SEATS.length; n++) { const i = P.kidOrd[n], [x, z] = SEATS[i];
      const k = pops(t, K.veinticinco11 - 0.1 + n * 0.02, 0.35) * (1 - win(t, K.y12 + 0.05 + n * 0.006, 0.25));
      setInst(P.kids, i, v3(x, 0.312, z), _q0.identity(), k); }
    P.kids.instanceMatrix.needsUpdate = true; }
}
function serT(j) { return j === 0 ? K.ensartarlos12 - 0.1 : j === 1 ? K.negro13 - 0.12 : K.negro13 + 0.12 + (j - 2) * 0.1; }
