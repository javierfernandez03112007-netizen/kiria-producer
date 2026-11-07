// ---------------------------------------------------------------- el escenario: edificio de oficinas en corte (planta baja con el portal + 5 plantas de despachos),
// la plaza con las 100 figuritas y la protagonista, las torres de ofertas, el ascensor de cristal, las puertas con su cerradura,
// la llave «ADE» y la escalera «ATAJO». Escala: una figurita mide ≈ 0,065 (con birrete).
const BW = 0.78, BD = 0.44, BZ1 = BD / 2, BZ0 = -BD / 2, FH0 = 0.26, FH = 0.2, NLV = 6, SLT = 0.018;
const LY = k => (k === 0 ? 0 : FH0 + (k - 1) * FH);             // altura del forjado de la planta k (0 = planta baja)
const FLY = k => (k === 0 ? 0.012 : LY(k) + SLT);                  // suelo pisable de la planta k
const TOPY = LY(NLV);                                               // techo de la última planta
const DX = [-0.24, 0, 0.24], DW = 0.085, DH = 0.125, DZ = BZ0 + 0.011;
const ELX = 0.32, ELZ = 0.1, ELR = 0.042;                           // ascensor de cristal (dentro, delante a la derecha)
const PZ0 = 0.72, P0 = v3(0.0, 0, 1.2);                             // centro de la rejilla de 100 · la protagonista
const PORT = { w: 0.28, h: 0.19 };
const DOORN = [null,
  ['ADMINISTRACIÓN', 'CONTABILIDAD', 'COMERCIAL'],
  ['RR. HH.', 'COMPRAS', 'LOGÍSTICA'],
  ['CONSULTORÍA', 'FINANZAS', 'SEGUROS'],
  ['MARKETING', 'CONTROL DE GESTIÓN', 'DIRECCIÓN'],
  ['AUDITORÍA', 'BANCA', 'HACIENDA']];
const OPEN = [[1, 0], [1, 2], [2, 1], [3, 0], [3, 2], [4, 1]];       // despachos con puesto de universitario (los 34)
const SPECIAL = [[5, 0], [5, 1], [5, 2]];                                             // auditoría, banca, Hacienda
const COLS = [{ x: -0.62, z: 0.46, n: 314 }, { x: -0.79, z: 0.46, n: 134 }, { x: -0.96, z: 0.46, n: 126 }];   // 3,67 · 1,57 · 1,47 % de las ofertas
const PT = 0.0026;                                                  // grosor de un folio en la torre
const doorKey = (k, j) => k * 10 + j;

function windowTex(lobby, seed) {
  return canvasTex(1024, lobby ? 256 : 192, (g, w, h) => {
    g.fillStyle = lobby ? '#141a22' : '#0f141c'; g.fillRect(0, 0, w, h);
    const n = lobby ? 6 : 10, mw = w / n;
    for (let i = 0; i < n; i++) {
      const lit = lobby ? 0.8 : hash(i * 3.7 + seed * 11.3), x0 = i * mw + 8, y0 = lobby ? 14 : 16, ww = mw - 16, hh = h - (lobby ? 28 : 40);
      const gr = g.createLinearGradient(0, y0, 0, y0 + hh);
      if (lit > 0.45) { gr.addColorStop(0, lobby ? '#bfc8d2' : '#ffd9a0'); gr.addColorStop(1, lobby ? '#6c7682' : '#c98a42'); g.globalAlpha = lobby ? 0.55 : 0.35 + 0.5 * lit; }
      else { gr.addColorStop(0, '#2c3a4e'); gr.addColorStop(1, '#141c28'); g.globalAlpha = 1; }
      g.fillStyle = gr; g.fillRect(x0, y0, ww, hh); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(x0, y0 + hh); g.lineTo(x0 + ww * 0.45, y0); g.lineTo(x0 + ww * 0.62, y0); g.lineTo(x0 + ww * 0.17, y0 + hh); g.fill();
    }
    g.fillStyle = '#05070a'; for (let i = 0; i <= n; i++) g.fillRect(i * mw - 4, 0, 8, h); g.fillRect(0, 0, w, 8); g.fillRect(0, h - 10, w, 10);
  });
}
function facadeMat(tex) { return new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.25, transparent: true, opacity: 1 }); }

function officeDoor(name, k, j) {
  const g = new THREE.Group(); g.position.set(DX[j], FLY(k), DZ);
  const fr = M.wood, t = 0.007;
  const jl = mesh(new THREE.BoxGeometry(t, DH + t, 0.012), fr); jl.position.set(-DW / 2 - t / 2, (DH + t) / 2, 0); g.add(jl);
  const jr = jl.clone(); jr.position.x = DW / 2 + t / 2; g.add(jr);
  const lt = mesh(new THREE.BoxGeometry(DW + 2 * t, t, 0.012), fr); lt.position.set(0, DH + t / 2, 0); g.add(lt);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(DW, DH), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc46a).multiplyScalar(0.25), toneMapped: false }));
  glow.position.set(0, DH / 2, -0.004); g.add(glow);
  const pv = new THREE.Group(); pv.position.set(-DW / 2, 0, 0.001); g.add(pv);
  const lf = rbox(DW - 0.003, DH - 0.003, 0.007, M.woodD, 0.002); lf.position.set(DW / 2, DH / 2, 0); pv.add(lf);
  const mo = rbox(DW - 0.03, DH * 0.36, 0.003, M.wood, 0.0015); mo.position.set(DW / 2, DH * 0.7, 0.004); pv.add(mo);
  const mo2 = mo.clone(); mo2.position.y = DH * 0.27; pv.add(mo2);
  const kn = sph(0.0055, M.brass, 14, 10); kn.position.set(DW - 0.012, DH * 0.47, 0.007); pv.add(kn);
  const pl = plateText(0.1, 0.021, [[name, name.length > 12 ? 0.5 : 0.62, 0.56]], { fg: '#f0d590', bg: '#15181d', weight: 800 });
  pl.position.set(0, DH + 0.019, 0.003); g.add(pl);
  const sg = exitSign(0.048); sg.position.set(0, DH + 0.043, 0.006); g.add(sg); signOn(sg, 0);
  const lk = padlock(0.6); lk.position.set(DW / 2 - 0.012, DH * 0.47, 0.016); lk.visible = false; g.add(lk);
  g.userData = { pv, glow, sg, lk, k, j, name, kn };
  return g;
}

function buildBuilding() {
  const B = new THREE.Group(); scene.add(B); S.bld = B;
  // suelo de la planta baja, pared del fondo (por fuera piedra; por dentro, el color de cada planta), laterales, forjados y techo
  B.add(at(mesh(new THREE.BoxGeometry(BW, 0.012, BD), M.marble), 0, 0.006, 0));
  B.add(at(mesh(new THREE.BoxGeometry(BW + 0.06, TOPY + 0.05, 0.03), M.stone), 0, (TOPY + 0.05) / 2, BZ0 - 0.015));
  for (let k = 0; k < NLV; k++) {
    const y0 = FLY(k), y1 = LY(k + 1), p = mesh(new THREE.PlaneGeometry(BW, y1 - y0), k === 0 ? M.lobbyWall : M.wallIn, false);
    p.position.set(0, (y0 + y1) / 2, BZ0 + 0.001); B.add(p);
    // tiras de luz del techo (cálidas en los despachos, frías y planas en la planta baja)
    for (const z of [-0.07, 0.09]) { const st = new THREE.Mesh(new THREE.PlaneGeometry(BW * 0.84, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(k ? 0xffd9a8 : 0xdfe8f2).multiplyScalar(k ? 1.5 : 1.35), toneMapped: false }));
      st.rotation.x = Math.PI / 2; st.position.set(-0.03, y1 - 0.0012, z); B.add(st); }
  }
  for (const sx of [-1, 1]) B.add(at(mesh(new THREE.BoxGeometry(0.03, TOPY + 0.05, BD + 0.03), M.stone), sx * (BW / 2 + 0.015), (TOPY + 0.05) / 2, -0.0));
  for (let k = 1; k <= NLV; k++) {
    const s = new THREE.Shape(); s.moveTo(-BW / 2, -BZ1); s.lineTo(BW / 2, -BZ1); s.lineTo(BW / 2, -BZ0); s.lineTo(-BW / 2, -BZ0); s.closePath();
    if (k < NLV) { const hp = new THREE.Path(); hp.absarc(ELX, -ELZ, ELR + 0.006, 0, Math.PI * 2, true); s.holes.push(hp); }
    const geo = new THREE.ExtrudeGeometry(s, { depth: SLT, bevelEnabled: false, curveSegments: 24 }); geo.rotateX(-Math.PI / 2);
    const sl = mesh(geo, M.slab); sl.position.y = LY(k); B.add(sl);
    if (k < NLV) { const fl = mesh(new THREE.PlaneGeometry(BW, BD), M.floorW, false); fl.rotation.x = -Math.PI / 2; fl.position.set(0, LY(k) + SLT + 0.0006, 0); B.add(fl); }
    // canto del forjado (se ve siempre, también con la fachada abierta)
    B.add(at(mesh(new THREE.BoxGeometry(BW + 0.06, SLT + 0.006, 0.012), M.stoneL), 0, LY(k) + SLT / 2, BZ1 + 0.004));
  }
  // antepecho y un par de máquinas en la azotea
  for (const [w, d, x, z] of [[BW + 0.06, 0.02, 0, BZ1 - 0.0], [BW + 0.06, 0.02, 0, BZ0], [0.02, BD, -BW / 2 - 0.02, 0], [0.02, BD, BW / 2 + 0.02, 0]]) B.add(at(mesh(new THREE.BoxGeometry(w, 0.05, d), M.stone), x, TOPY + SLT + 0.025, z));
  B.add(at(rbox(0.16, 0.06, 0.1, M.stoneL, 0.01), -0.25, TOPY + SLT + 0.05, -0.05, 0, Math.PI / 2));
  B.add(at(cyl(0.045, 0.045, 0.09, M.dsteel, 24), 0.2, TOPY + SLT + 0.045, -0.08));
  // fachada (opaca hasta «Ahora, lo feo»): una por planta; la de abajo, con el hueco del portal
  S.facade = [];
  for (let k = 1; k < NLV; k++) {
    const m = facadeMat(windowTex(false, k)), f = mesh(new THREE.BoxGeometry(BW, FH - SLT, 0.012), m); f.position.set(0, FLY(k) + (FH - SLT) / 2, BZ1 + 0.002); B.add(f); S.facade.push(f);
  }
  { const m = facadeMat(windowTex(true, 0)), sw = (BW - PORT.w - 0.044) / 2, hh = FH0;
    for (const sx of [-1, 1]) { const f = mesh(new THREE.BoxGeometry(sw, hh, 0.012), m); f.position.set(sx * (PORT.w / 2 + 0.022 + sw / 2), hh / 2, BZ1 + 0.002); B.add(f); S.facade.push(f); }
    const lt = mesh(new THREE.BoxGeometry(PORT.w + 0.044, hh - PORT.h - 0.034, 0.012), m); lt.position.set(0, PORT.h + 0.034 + (hh - PORT.h - 0.034) / 2, BZ1 + 0.002); B.add(lt); S.facade.push(lt);
  }
  // línea de luz que barre la fachada cuando se abre
  S.scan = new THREE.Mesh(new THREE.PlaneGeometry(BW + 0.08, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fe8ff).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  S.scan.position.set(0, 0, BZ1 + 0.012); S.scan.visible = false; B.add(S.scan);
  // el portal: marco de piedra, dos hojas de madera (giran hacia dentro), cerradura de latón en la junta y la señal grande de SALIDA
  const P = new THREE.Group(); P.position.set(0, 0.012, BZ1 + 0.012); B.add(P); S.portal = P;
  P.add(at(rbox(0.022, PORT.h + 0.022, 0.03, M.stoneL, 0.004), -PORT.w / 2 - 0.011, (PORT.h + 0.022) / 2, 0));
  P.add(at(rbox(0.022, PORT.h + 0.022, 0.03, M.stoneL, 0.004), PORT.w / 2 + 0.011, (PORT.h + 0.022) / 2, 0));
  P.add(at(rbox(PORT.w + 0.066, 0.022, 0.032, M.stoneL, 0.004), 0, PORT.h + 0.011, 0));
  S.leaves = [-1, 1].map(sd => {
    const pv = new THREE.Group(); pv.position.set(sd * PORT.w / 2, 0, -0.006); P.add(pv);
    const lf = rbox(PORT.w / 2 - 0.002, PORT.h - 0.004, 0.012, M.woodD, 0.003); lf.position.set(-sd * PORT.w / 4, PORT.h / 2, 0); pv.add(lf);
    for (const yy of [0.052, 0.138]) pv.add(at(rbox(PORT.w / 2 - 0.034, 0.064, 0.004, M.wood, 0.002), -sd * PORT.w / 4, yy, 0.007));
    pv.add(at(cyl(0.0035, 0.0035, 0.05, M.brass, 10), -sd * (PORT.w / 2 - 0.018), 0.1, 0.012));
    return pv;
  });
  S.plate = rbox(0.03, 0.052, 0.005, M.brass, 0.003); S.plate.position.set(PORT.w / 2, 0.085, 0.009); S.leaves[0].add(S.plate);
  const kh = cyl(0.0045, 0.0045, 0.004, M.black, 14); kh.rotation.x = Math.PI / 2; kh.position.set(PORT.w / 2, 0.09, 0.0125); S.leaves[0].add(kh);
  const khs = mesh(new THREE.BoxGeometry(0.003, 0.011, 0.004), M.black); khs.position.set(PORT.w / 2, 0.083, 0.0125); S.leaves[0].add(khs);
  S.inGlow = new THREE.Mesh(new THREE.PlaneGeometry(PORT.w, PORT.h), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d0).multiplyScalar(0.4), toneMapped: false }));
  S.inGlow.position.set(0, PORT.h / 2, -0.03); P.add(S.inGlow);
  S.bigSign = exitSign(0.17); S.bigSign.position.set(0, PORT.h + 0.022 + 0.04, 0.02); P.add(S.bigSign); signOn(S.bigSign, 1);
  S.flood = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h * 0.6, 4, w / 2, h * 0.6, w * 0.55); r.addColorStop(0, 'rgba(255,236,190,1)'); r.addColorStop(0.35, 'rgba(255,214,150,.45)'); r.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  S.flood.position.set(0, 0.13, 0.03); P.add(S.flood);
  // ascensor de cristal con aros de latón en cada planta
  const tubeM = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, clearcoatRoughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(ELR, ELR, TOPY, 40, 1, true), tubeM); tb.position.set(ELX, TOPY / 2, ELZ); tb.renderOrder = 7; B.add(tb);
  for (let k = 0; k <= NLV; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(ELR + 0.003, 0.0022, 8, 40), M.dsteel); r.rotation.x = Math.PI / 2; r.position.set(ELX, k ? LY(k) + SLT + 0.002 : 0.014, ELZ); B.add(r); }
  S.elevLight = new THREE.Mesh(new THREE.CylinderGeometry(ELR * 0.92, ELR * 0.92, 0.004, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d6).multiplyScalar(2), toneMapped: false })); S.elevLight.position.set(ELX, TOPY - 0.004, ELZ); B.add(S.elevLight);
  // mostradores grises de la planta baja (pegados al fondo)
  for (const x of [-0.24, 0.02]) B.add(at(rbox(0.2, 0.032, 0.035, M.stoneL, 0.004), x, 0.028, BZ0 + 0.03, 0, Math.PI / 2));
  // puertas de los despachos
  S.doors = {};
  for (let k = 1; k < NLV; k++) for (let j = 0; j < 3; j++) { const d = officeDoor(DOORN[k][j], k, j); B.add(d); S.doors[doorKey(k, j)] = d; }
  // farolas de la plaza (solo brillo: el número de luces no cambia)
  for (const [x, z] of [[0.62, 1.12], [0.62, 0.42], [-1.25, 1.0]]) {
    const pole = cyl(0.006, 0.008, 0.34, M.dsteel, 12); pole.position.set(x, 0.17, z); scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(2.2), toneMapped: false })); bulb.position.set(x, 0.35, z); scene.add(bulb);
  }
}

// ---------------------------------------------------------------- la plaza: 100 figuritas (rejilla 10 × 10), la protagonista, los 700 «graduados nuevos» y los birretes
const C_CER = new THREE.Color(0xe6e1d8), C_LIT = new THREE.Color(0xfff1d6), C_GREY = new THREE.Color(0x4a4b51), C_GOLD = new THREE.Color(0xffc24a), C_DIMF = new THREE.Color(0x77777c);
const NR = 700;
const gridPos = i => v3(((i % 10) - 4.5) * 0.06, 0, PZ0 + (Math.floor(i / 10) - 4.5) * 0.06);
let STAY = [], UP = [], FIG = [], RIV = [];
function buildCrowd() {
  const gm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  S.grid = new THREE.InstancedMesh(studentGeo(false), gm, 100); S.grid.castShadow = true; S.grid.receiveShadow = true; S.grid.frustumCulled = false; scene.add(S.grid);
  S.caps = new THREE.InstancedMesh(capGeo(), M.capM, 100); S.caps.castShadow = true; S.caps.frustumCulled = false; scene.add(S.caps);
  for (let i = 0; i < 100; i++) S.grid.setColorAt(i, C_CER);
  S.hero = mesh(studentGeo(false), M.ceramic); S.hero.position.copy(P0); scene.add(S.hero);
  S.heroCap = mesh(capGeo(), M.capM); S.heroCap.position.copy(P0); scene.add(S.heroCap);
  // quién se queda fuera (20), quién sube (34): elegidos al azar, siempre los mismos
  const ord = [...Array(100).keys()].sort((a, b) => hash(a * 7.13 + 1) - hash(b * 7.13 + 1));
  STAY = ord.slice(0, 20).sort((a, b) => a - b);
  const inn = ord.slice(20);
  // los 80 entran por cuatro carriles del portal, por filas (primero los de delante del edificio)
  const lanes = [-0.084, -0.028, 0.028, 0.084], lobby = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 10; c++) lobby.push(v3(-0.335 + c * 0.066, FLY(0), -0.165 + r * 0.046));
  const inSorted = inn.slice().sort((a, b) => gridPos(a).z - gridPos(b).z || gridPos(a).x - gridPos(b).x);
  const lobbySorted = lobby.slice().sort((a, b) => b.z - a.z || a.x - b.x);       // los primeros, a las filas de delante
  FIG = [...Array(100)].map((_, i) => ({ gp: gridPos(i), stay: STAY.includes(i) }));
  inSorted.forEach((i, r) => {
    const f = FIG[i], lane = lanes[r % 4], gp = f.gp, ls = lobbySorted[r];
    const pts = [gp.clone(), v3(lerp(gp.x, lane, 0.6), 0, 0.42), v3(lane, 0, BZ1 + 0.06), v3(lane, FLY(0), BZ1 - 0.06), ls.clone()];
    f.enter = mkPath(pts, K.n8_5 - 0.02 + Math.floor(r / 4) * 0.085 + (r % 4) * 0.02, 0.62); f.ls = ls;
  });
  // los 34 que suben: los de la planta baja más cerca del ascensor salen antes
  const upIdx = inn.slice().sort((a, b) => hash(a * 3.31 + 5) - hash(b * 3.31 + 5)).slice(0, 34).sort((a, b) => FIG[a].ls.distanceTo(v3(ELX, 0, ELZ)) - FIG[b].ls.distanceTo(v3(ELX, 0, ELZ)));
  UP = upIdx; const per = [6, 6, 5, 6, 5, 6];
  const slots = []; OPEN.forEach(([k, j], d) => { for (let m = 0; m < per[d]; m++) slots.push({ k, j, p: v3(DX[j] + (Math.floor(m / 2) - (Math.ceil(per[d] / 2) - 1) / 2) * 0.03 + (m % 2) * 0.012, FLY(k), DZ + 0.055 + (m % 2) * 0.032) }); });
  slots.sort((a, b) => a.k - b.k || a.p.x - b.p.x);
  const slotOrder = [...slots.keys()].sort((a, b) => hash(a * 9.1) - hash(b * 9.1));
  upIdx.forEach((i, r) => {
    const f = FIG[i], sl = slots[slotOrder[r]], y = sl.p.y;
    const pts = [f.ls.clone(), v3(ELX - 0.06, FLY(0), ELZ), v3(ELX, FLY(0), ELZ), v3(ELX, y, ELZ), v3(ELX - 0.07, y, ELZ - 0.03), v3(sl.p.x, y, ELZ - 0.05), sl.p.clone()];
    f.up = mkPath(pts, K.trabajan7 + 0.15 + r * 0.056, 0.85); f.slot = sl;
  });
  // los «graduados nuevos»: llegan por la derecha y llenan la plaza (primero los que van más lejos)
  S.river = new THREE.InstancedMesh(studentGeo(true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), NR); S.river.frustumCulled = false; S.river.castShadow = true; scene.add(S.river);
  S.rcaps = new THREE.InstancedMesh(capGeo(), M.capM, NR); S.rcaps.frustumCulled = false; scene.add(S.rcaps);
  const cells = [];
  for (let r = 0; r < 26; r++) for (let c = 0; c < 60; c++) {
    const x = -0.5 + c * 0.034 + (r % 2) * 0.017 + (hash(r * 61 + c) - 0.5) * 0.012, z = 0.28 + r * 0.032 + (hash(r * 17 + c * 3) - 0.5) * 0.01;
    if (x > 1.3 || z > 1.1) continue;
    if (Math.hypot(x - P0.x, z - P0.z) < 0.07) continue;
    if (STAY.some(i => Math.hypot(x - FIG[i].gp.x, z - FIG[i].gp.z) < 0.03)) continue;
    if (x < -0.45 && z < 0.66) continue;
    cells.push(v3(x, 0, z));
  }
  cells.sort((a, b) => Math.hypot(a.x, a.z - 0.3) - Math.hypot(b.x, b.z - 0.3));
  const take = cells.slice(0, NR).sort((a, b) => a.x - b.x);
  RIV = take.map((p, i) => {
    const sx = 3.0 + hash(i * 4.7) * 0.9, sz = p.z + (hash(i * 2.3) - 0.5) * 0.2;
    const pts = [v3(sx, 0, sz), v3(lerp(sx, p.x, 0.55), 0, lerp(sz, p.z, 0.8)), p.clone()], enter = mkPath(pts, 0, 1);
    enter.t0 = K.cada9 - 0.15 + (i / NR) * 1.85; enter.dur = enter.L / 1.45;
    const dd = Math.hypot(p.x, p.z - BZ1), lane = [-0.09, -0.03, 0.03, 0.09][i % 4];
    const tin = K.portal15 - 0.05 + clamp(dd / 1.35) * 2.6 + hash(i * 8.1) * 0.25;
    const absorb = mkPath([p.clone(), v3(lerp(p.x, lane, 0.75), 0, BZ1 + 0.12), v3(lane, 0, BZ1 + 0.02), v3(lane * 0.6, FLY(0), BZ1 - 0.12)], tin, 0.55 + dd * 0.55);
    return { p, enter, absorb };
  });
  // los 20 de fuera también entran al final (con los nuevos)
  STAY.forEach((i, r) => { const f = FIG[i], gp = f.gp, lane = [-0.06, 0.0, 0.06][r % 3], dd = Math.hypot(gp.x, gp.z - BZ1);
    f.absorb = mkPath([gp.clone(), v3(lerp(gp.x, lane, 0.7), 0, BZ1 + 0.12), v3(lane, 0, BZ1 + 0.02), v3(lane * 0.6, FLY(0), BZ1 - 0.12)], K.portal15 + clamp(dd / 1.35) * 2.4 + r * 0.03, 0.55 + dd * 0.55); });
}
// recorrido por puntos (longitudes precalculadas); t0 = salida, dur = lo que tarda
function mkPath(pts, t0, dur) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1])); return { pts, cum, L: cum[cum.length - 1], t0, dur }; }
function pathPos(P, u, out) {
  const s = clamp(u) * P.L; let i = 1; while (i < P.cum.length - 1 && P.cum[i] < s) i++;
  const a = P.pts[i - 1], b = P.pts[i], seg = P.cum[i] - P.cum[i - 1]; return out.copy(a).lerp(b, seg > 1e-9 ? (s - P.cum[i - 1]) / seg : 0);
}
// posición en el instante t (con saltitos al andar: son figuritas de cerámica); devuelve el progreso 0..1
function walk(P, t, out, hop = 0.0045) {
  const s = clamp((t - P.t0) / P.dur), u = s * s * (3 - 2 * s) * 0.35 + s * 0.65; pathPos(P, u, out);
  if (s > 0 && s < 1) out.y += hop * Math.abs(Math.sin(u * P.L / 0.032 * Math.PI));
  return s;
}

// ---------------------------------------------------------------- las torres de ofertas (folios), la torre fantasma de «el doble» y la llave
function buildPapers() {
  S.papA = paperSet(COLS[0].n, offerTex('ADE', '#c8202a')); scene.add(S.papA);
  S.papB = paperSet(COLS[1].n, offerTex('MARKETING', '#2b7a50')); scene.add(S.papB);
  S.papC = paperSet(COLS[2].n, offerTex('MEDICINA', '#2a5b9b')); scene.add(S.papC);
  const h2 = COLS[1].n * PT;
  S.ghost = new THREE.Mesh(new THREE.BoxGeometry(0.09, h2, 0.125), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x62e3d4).multiplyScalar(0.5), transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  edges(S.ghost, 0x62e3d4, 2, 20, 0.0); S.ghost.position.set(COLS[1].x, h2 * 1.5, COLS[1].z); S.ghost.visible = false; scene.add(S.ghost);
  // la lluvia del principio: cada folio i cae a partir de s_i (también al final, con t − END: el bucle es exacto)
  S.rain = [...Array(COLS[0].n)].map((_, i) => {
    const s = -1.6 + hash(i * 1.91 + 3) * 3.4, a = hash(i * 6.1) * 6.283, r = 0.06 + Math.sqrt(hash(i * 2.7)) * 0.3;
    let xl = P0.x + Math.cos(a) * r, zl = 0.86 + Math.sin(a) * r * 0.8; if (Math.hypot(xl - P0.x, zl - P0.z) < 0.06) zl -= 0.08;
    return { s, fall: 1.0 + hash(i * 3.3) * 0.45, x0: xl + (hash(i * 7.2) - 0.5) * 0.4, z0: Math.min(1.12, zl + (hash(i * 5.9) - 0.5) * 0.3), xl, zl,
      rx: (hash(i * 5.5) - 0.5) * 5, rz: (hash(i * 8.8) - 0.5) * 5, ry: hash(i * 9.4) * 6.28, sw: 0.6 + hash(i * 4.4) * 1.2 };
  });
  S.key = adeKey(); S.key.visible = false; scene.add(S.key);
  S.keyGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: starTex0(), color: new THREE.Color(1, 0.85, 0.5).multiplyScalar(1.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  S.keyGlow.visible = false; scene.add(S.keyGlow);
  // auditoría: calendario y examen · banca: certificado · Hacienda: temario
  const da = S.doors[doorKey(5, 0)], db = S.doors[doorKey(5, 1)], dh = S.doors[doorKey(5, 2)];
  S.cal = calendarBlock(); S.cal.position.set(-0.048, 0.05, 0.03); S.cal.visible = false; da.add(S.cal);
  S.exam = examSheet(); S.exam.position.set(0.088, 0.062, 0.012); S.exam.visible = false; da.add(S.exam);
  S.cert = certificate(); S.cert.visible = false; db.add(S.cert);
  const BK = [[0x6e1414, 'TEMARIO'], [0x173d2a, 'TEMA 1-30'], [0x1b2a4a, 'TEMA 31-60'], [0x4a2a14, 'TEMA 61-90'], [0x2a1a2e, 'SUPUESTOS'], [0x14361f, 'LEGISLACIÓN']];
  S.books = BK.map(([c, n], k) => { const b = spineBook(0.07 - k * 0.003, 0.05, 0.012, c, n); b.visible = false; dh.add(b); return b; });
  S.lad = ladder(1.24); S.lad.visible = false; scene.add(S.lad);
}
