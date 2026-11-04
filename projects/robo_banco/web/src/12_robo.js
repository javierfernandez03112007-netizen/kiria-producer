// ---------------------------------------------------------------- «El túnel del Banco Central» (Fortaleza, 2005): maqueta en corte, de noche.
// 1 unidad = 1 m en vertical; la avenida va acortada (los rótulos dan las medidas reales: 78 m de túnel, 4 m bajo la calle, 1,10 m de losa).
const TX0 = -4, TX1 = 23, TY = -4.5, TW = 0.8, TH = 0.9, CZ = -0.45;   // túnel: de la casa (x = -4) a bajo la cámara (x = 23); el corte pasa por su centro (z = CZ)
const VX0 = 18, VX1 = 28, VZB = -6;                                   // cámara acorazada (sótano del banco)
const SLB0 = TY + TH / 2, SLB1 = SLB0 + 1.1, ROOM1 = SLB1 + 3.0;      // losa de 1,10 m justo encima del túnel; techo de la cámara
const HX = 23, HR = 0.375;                                            // el agujero: 75 cm
const HOUSE = { x0: -7.6, x1: -0.9 }, AVE = { x0: 0.5, x1: 16.7 }, BANK = { x0: 17.4, x1: 30.2 };
const DOOR = { x: 20.6, y: SLB1 + 1.42, r: 1.12 };                    // puerta redonda de la cámara (pared del fondo)
const PALS = [[24.6, -4.55], [26.35, -4.55], [26.35, -2.75], [20.55, -2.6]];   // palés de billetes (x, z del centro)
const BLK = { w: 0.34, h: 0.17, d: 0.2, nx: 4, ny: 6, nz: 6 };        // bloques de fajos de 50 reales retractilados

function earthTex(seed) {
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4e3828'); gr.addColorStop(0.55, '#3b281b'); gr.addColorStop(1, '#251912'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const x = hash(i * 7.1 + seed) * w, y = hash(i * 3.3 + seed) * h, rx = 20 + hash(i * 1.9) * 70, ry = 6 + hash(i * 2.3) * 16; g.fillStyle = `rgba(${55 + hash(i) * 40 | 0},${36 + hash(i * 2) * 26 | 0},${22 + hash(i * 5) * 16 | 0},.22)`; g.beginPath(); g.ellipse(x, y, rx, ry, (hash(i * 4) - 0.5) * 0.4, 0, 7); g.fill(); }
    for (let i = 0; i < 2800; i++) { const x = hash(i * 1.31 + seed) * w, y = hash(i * 2.93 + seed) * h, r = 0.6 + hash(i * 4.1) * 2.1; g.fillStyle = hash(i * 6.7) > 0.5 ? 'rgba(18,10,6,.5)' : 'rgba(160,128,96,.22)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    for (let i = 0; i < 70; i++) { const x = hash(i * 9.1 + seed) * w, y = hash(i * 8.3 + seed) * h, r = 3 + hash(i * 2.2) * 8; g.fillStyle = 'rgba(118,106,96,.6)'; g.beginPath(); g.ellipse(x, y, r, r * 0.7, hash(i) * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(30,24,20,.35)'; g.beginPath(); g.ellipse(x + 1, y + 1.5, r * 0.8, r * 0.45, hash(i) * 3, 0, 7); g.fill(); }
  });
}
function concTex(px = 256, dark = '#86898e') {
  return canvasTex(px, px, (g, w, h) => { g.fillStyle = dark; g.fillRect(0, 0, w, h); for (let i = 0; i < px * 14; i++) { const x = hash(i * 1.7) * w, y = hash(i * 3.1) * h; g.fillStyle = hash(i * 5.3) > 0.5 ? 'rgba(36,36,40,.28)' : 'rgba(225,225,230,.2)'; g.fillRect(x, y, 1.6, 1.6); } });
}
let EARTH = [], CONC, CONCD;
function earthBox(x0, x1, y0, y1, z0, z1, seed) {
  const t = earthTex(seed); repTex(t, (x1 - x0) / 7, (y1 - y0) / 7);
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  const b = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(b); EARTH.push(b); return b;
}
function cbox(x0, x1, y0, y1, z0, z1, m = CONC) { const b = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(b); return b; }

function buildGround() {
  CONC = new THREE.MeshStandardMaterial({ map: repTex(concTex(), 3, 3), roughness: 0.86 });
  CONCD = new THREE.MeshStandardMaterial({ map: repTex(concTex(256, '#5d6066'), 3, 3), roughness: 0.9 });
  const XL = -11, XR = 33, YB = -8, ZB = -7;
  const T0 = TY - TH / 2, T1 = TY + TH / 2, ZT = CZ - TW / 2;             // canal del túnel: abierto hacia delante (z > ZT)
  earthBox(XL, XR, YB, T0, ZB, CZ, 1);                                     // por debajo del túnel
  earthBox(XL, TX0 - 0.45, T0, T1, ZB, CZ, 2);                            // a la altura del túnel: a los lados y detrás
  earthBox(TX0 - 0.45, TX1 + 0.45, T0, T1, ZB, ZT, 3);
  earthBox(TX1 + 0.45, XR, T0, T1, ZB, CZ, 4);
  earthBox(XL, TX0 - 0.45, T1, 0, ZB, CZ, 5);                             // por encima: el pozo de la casa queda abierto delante
  earthBox(TX0 - 0.45, TX0 + 0.45, T1, 0, ZB, ZT, 6);
  earthBox(TX0 + 0.45, VX0, T1, 0, ZB, CZ, 7);
  earthBox(VX1, XR, T1, 0, ZB, CZ, 8);
  earthBox(VX0, VX1, -0.4, 0, ZB, VZB, 9);
  // superficie: acera, avenida con marcas, acera
  const asph = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.75 }), walk = new THREE.MeshStandardMaterial({ map: repTex(concTex(256, '#7a7c80'), 6, 2), roughness: 0.8 });
  cbox(XL, AVE.x0, 0, 0.12, ZB, CZ, walk); cbox(AVE.x1, XR, 0, 0.12, ZB, CZ, walk);
  cbox(AVE.x0, AVE.x1, 0, 0.04, ZB, CZ, asph);
  const lineM = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.6, emissive: 0x202020 });
  for (let z = ZB + 0.4; z < CZ - 0.3; z += 1.4) cbox(8.5, 8.7, 0.04, 0.05, z, z + 0.8, lineM);
  cbox(AVE.x0 + 0.3, AVE.x0 + 0.4, 0.04, 0.05, ZB, CZ, lineM); cbox(AVE.x1 - 0.4, AVE.x1 - 0.3, 0.04, 0.05, ZB, CZ, lineM);
  { const rimM = new THREE.MeshStandardMaterial({ color: 0x6b5440, roughness: 0.9 }); cbox(XL, XR, -0.35, 0, CZ - 0.02, CZ + 0.02, rimM); }
  // farolas
  S.lamps = [];
  for (const [x, z] of [[0.15, -1.2], [16.95, -1.2], [-9.5, -1.2], [31.5, -1.2]]) {
    const pole = cyl(0.07, 0.09, 5.4, M.dsteel, 12); pole.position.set(x, 2.82, z); scene.add(pole);
    const arm = cyl(0.04, 0.04, 1.1, M.dsteel, 8); arm.rotation.z = Math.PI / 2; arm.position.set(x + (x < 8 ? 0.5 : -0.5), 5.45, z); scene.add(arm);
    const head = mesh(new THREE.BoxGeometry(0.55, 0.12, 0.3), glowM(0xffc27a, 3.2)); head.position.set(x + (x < 8 ? 1.0 : -1.0), 5.38, z); scene.add(head);
    const L = new THREE.PointLight(0xffb46a, 22, 13, 1.6); L.position.set(x + (x < 8 ? 1.0 : -1.0), 5.0, z + 0.4); scene.add(L); S.lamps.push(L);
  }
  // cielo nocturno: un degradado lejano
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(260, 120), new THREE.MeshBasicMaterial({ map: canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#02040a'); gr.addColorStop(0.7, '#0b1426'); gr.addColorStop(1, '#16203a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), depthWrite: false, fog: false }));
  sky.position.set(10, 40, -60); scene.add(sky);
}

// ---------------------------------------------------------------- la casa del «césped artificial»
function buildHouse() {
  const stucco = paint(0xd9cdb6, 0.75, 0), roofM = paint(0x6c4a3a, 0.7, 0);
  const g = new THREE.Group(); scene.add(g); S.house = g;
  const { x0, x1 } = HOUSE, z0 = -6.6, z1 = -2.7, h = 3.3;
  const body = mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), stucco); body.position.set((x0 + x1) / 2, h / 2 + 0.12, (z0 + z1) / 2); g.add(body);
  const roof = mesh(new THREE.BoxGeometry(x1 - x0 + 0.4, 0.22, z1 - z0 + 0.4), roofM); roof.position.set((x0 + x1) / 2, h + 0.23, (z0 + z1) / 2); g.add(roof);
  const gar = mesh(new THREE.BoxGeometry(2.6, 2.3, 0.06), new THREE.MeshStandardMaterial({ map: canvasTex(64, 128, (g2, w, hh) => { g2.fillStyle = '#7d8187'; g2.fillRect(0, 0, w, hh); g2.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 0; y < hh; y += 10) g2.fillRect(0, y, w, 2); }), roughness: 0.6, metalness: 0.3 }));
  gar.position.set(x0 + 1.9, 1.27, z1 + 0.03); g.add(gar);
  const win = mesh(new THREE.BoxGeometry(1.3, 1.0, 0.05), glowM(0xffcf8a, 1.4)); win.position.set(x1 - 1.3, 1.9, z1 + 0.03); g.add(win);
  const door = mesh(new THREE.BoxGeometry(0.9, 2.0, 0.05), M.woodL); door.position.set(x1 - 3.1, 1.12, z1 + 0.03); g.add(door);
  // el cartel
  const sign = plateText(4.6, 0.95, [['GRAMA SINTÉTICA', 0.5, 0.53]], { fg: '#f4f1e6', bg: '#1f7a3a', weight: 900, px: 1024, border: true });
  sign.position.set((x0 + x1) / 2, h + 0.95, z1 + 0.05); g.add(sign); S.sign = sign;
  const sub = plateText(3.2, 0.34, [['CÉSPED ARTIFICIAL · VENTA', 0.62, 0.54]], { fg: '#1f2a22', bg: '#e8e2cf', weight: 800, px: 1024 }); sub.position.set((x0 + x1) / 2, h + 0.28, z1 + 0.05); g.add(sub);
  // rollos de césped
  const grassT = canvasTex(256, 64, (g2, w, hh) => { g2.fillStyle = '#2f8d3b'; g2.fillRect(0, 0, w, hh); for (let i = 0; i < 900; i++) { g2.fillStyle = hash(i * 1.9) > 0.5 ? 'rgba(130,220,110,.55)' : 'rgba(10,60,20,.5)'; g2.fillRect(hash(i * 3.7) * w, hash(i * 5.1) * hh, 1.2, 4); } });
  const grassM = new THREE.MeshStandardMaterial({ map: grassT, roughness: 0.85 });
  S.rolls = [];
  [[0, 0], [0.62, 0], [1.24, 0], [0.31, 0.53], [0.93, 0.53], [0.62, 1.06]].forEach(([dx, dy], i) => {
    const r = cyl(0.3, 0.3, 1.6, grassM, 20); r.rotation.x = Math.PI / 2; r.position.set(x1 - 3.4 + dx, 0.42 + dy, z1 + 1.0); scene.add(r); S.rolls.push(r);
  });
  // la camioneta que se lleva la tierra
  const tk = new THREE.Group(); scene.add(tk); S.truck = tk;
  const bodyM = paint(0xe8e6df, 0.4, 1), cab = mesh(new THREE.BoxGeometry(1.5, 1.2, 1.7), bodyM); cab.position.set(0, 1.0, -1.5); tk.add(cab);
  const glassM = new THREE.MeshStandardMaterial({ color: 0x1a2533, roughness: 0.15, metalness: 0.6 }); const ws = mesh(new THREE.BoxGeometry(1.42, 0.55, 0.05), glassM); ws.position.set(0, 1.25, -0.63); tk.add(ws);
  const bed = mesh(new THREE.BoxGeometry(1.5, 0.5, 2.6), bodyM); bed.position.set(0, 0.7, 0.75); tk.add(bed);
  const dirtM = new THREE.MeshStandardMaterial({ map: repTex(earthTex(11), 1, 1), roughness: 1 });
  const dirt = mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), dirtM); dirt.scale.set(0.68, 0.5, 1.15); dirt.position.set(0, 0.95, 0.75); tk.add(dirt); S.dirt = dirt;
  for (const [x, z] of [[-0.72, -1.4], [0.72, -1.4], [-0.72, 1.3], [0.72, 1.3]]) { const w = cyl(0.36, 0.36, 0.28, M.black, 18); w.rotation.z = Math.PI / 2; w.position.set(x, 0.38, z); tk.add(w); }
  const hl = mesh(new THREE.BoxGeometry(1.2, 0.12, 0.05), glowM(0xfff2d6, 2.4)); hl.position.set(0, 0.8, -2.37); tk.add(hl);
}

// ---------------------------------------------------------------- el banco y su cámara acorazada (en corte)
function buildBank() {
  const facM = paint(0xcfd3d8, 0.55, 0.2), g = new THREE.Group(); scene.add(g); S.bank = g;
  const { x0, x1 } = BANK, z0 = -7.0, z1 = -2.3, h = 8.6;
  const body = mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), facM); body.position.set((x0 + x1) / 2, h / 2 + 0.12, (z0 + z1) / 2); g.add(body);
  S.bankWin = [];
  for (let fl = 0; fl < 2; fl++) for (let i = 0; i < 6; i++) { const w = mesh(new THREE.BoxGeometry(1.25, 1.5, 0.05), glowM(0xcfe3ff, 0.9)); w.position.set(x0 + 1.4 + i * 1.95, 4.0 + fl * 2.6, z1 + 0.03); g.add(w); S.bankWin.push(w); }
  for (let i = 0; i < 5; i++) { const c = cyl(0.26, 0.3, 3.0, M.stone, 20); c.position.set(x0 + 1.6 + i * 2.4, 1.62, z1 + 0.55); g.add(c); }
  const ent = mesh(new THREE.BoxGeometry(x1 - x0 - 1.2, 0.35, 1.2), M.stone); ent.position.set((x0 + x1) / 2, 3.3, z1 + 0.5); g.add(ent);
  const sign = plateText(7.4, 0.9, [['BANCO CENTRAL', 0.6, 0.54]], { fg: '#e9edf2', bg: '#1d2b44', weight: 900, px: 1024 }); sign.position.set((x0 + x1) / 2, h - 0.75, z1 + 0.05); g.add(sign); S.bankSign = sign;
  const closed = plateText(2.2, 0.55, [['CERRADO', 0.62, 0.54]], { fg: '#ffffff', bg: '#b3122a', weight: 900, px: 512 }); closed.position.set(x0 + 6.4, 2.1, z1 + 1.12); g.add(closed); S.closed = closed;
  // cámara acorazada: paredes, techo y la losa con el agujero (el corte pasa por el centro del agujero)
  cbox(VX0, VX1, ROOM1, ROOM1 + 0.4, VZB, CZ, CONCD);                 // techo
  cbox(VX0 - 0.6, VX0, SLB0, ROOM1 + 0.4, VZB, CZ, CONCD);             // pared izquierda
  cbox(VX1, VX1 + 0.6, SLB0, ROOM1 + 0.4, VZB, CZ, CONCD);             // pared derecha
  { const sh = new THREE.Shape(); sh.moveTo(VX0, SLB1); sh.lineTo(VX1, SLB1); sh.lineTo(VX1, ROOM1); sh.lineTo(VX0, ROOM1); sh.closePath();     // pared del fondo con el hueco de la puerta
    const ho = new THREE.Path(); ho.absarc(DOOR.x, DOOR.y, DOOR.r + 0.04, 0, Math.PI * 2, false); sh.holes.push(ho);
    const w = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false, curveSegments: 48 }), CONCD); w.position.z = VZB; scene.add(w); }
  const corr = mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshStandardMaterial({ color: 0x8a8f96, emissive: 0xd9d2c4, emissiveIntensity: 0, roughness: 0.6 })); corr.position.set(DOOR.x, DOOR.y, VZB - 0.4); scene.add(corr); S.corr = corr;
  // losa: planta con media muesca (el agujero) en el borde del corte, extruida 1,10 m hacia arriba
  { const sh = new THREE.Shape(), d0 = -CZ, d1 = -VZB; sh.moveTo(VX0 - 0.6, d0); sh.lineTo(HX - HR, d0); sh.absarc(HX, d0, HR, Math.PI, 0, true); sh.lineTo(VX1 + 0.6, d0); sh.lineTo(VX1 + 0.6, d1); sh.lineTo(VX0 - 0.6, d1); sh.closePath();
    const slab = mesh(new THREE.ExtrudeGeometry(sh, { depth: SLB1 - SLB0, bevelEnabled: false, curveSegments: 40 }), CONC); slab.rotation.x = -Math.PI / 2; slab.position.y = SLB0; scene.add(slab); S.slab = slab; }
  // cara del corte de la losa: hormigón con la armadura de acero (puntos y barras), con el hueco del agujero transparente
  { const pxm = 220, Wm = VX1 - VX0 + 1.2, Hm = SLB1 - SLB0, cw = Math.round(Wm * pxm), ch = Math.round(Hm * pxm);
    const tex = canvasTex(cw, ch, (g2, w, h) => {
      g2.fillStyle = '#8f9297'; g2.fillRect(0, 0, w, h); for (let i = 0; i < w * 6; i++) { g2.fillStyle = hash(i * 1.3) > 0.5 ? 'rgba(40,40,44,.3)' : 'rgba(230,230,235,.22)'; g2.fillRect(hash(i * 2.7) * w, hash(i * 4.9) * h, 2, 2); }
      for (let i = 0; i < w * 0.35; i++) { g2.fillStyle = 'rgba(70,70,74,.5)'; g2.beginPath(); g2.arc(hash(i * 7.7) * w, hash(i * 8.9) * h, 1.5 + hash(i) * 3, 0, 7); g2.fill(); }
      for (const yy of [0.07, 0.19, Hm - 0.19, Hm - 0.07]) { const y = (Hm - yy) * pxm; g2.strokeStyle = '#a2532a'; g2.lineWidth = 9; g2.beginPath(); g2.moveTo(10, y); g2.lineTo(w - 10, y); g2.stroke(); g2.strokeStyle = 'rgba(255,170,120,.5)'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(10, y - 2); g2.lineTo(w - 10, y - 2); g2.stroke(); }
      for (const yy of [0.13, Hm - 0.13]) for (let x = 0.1; x < Wm; x += 0.16) { g2.fillStyle = '#b05b2e'; g2.beginPath(); g2.arc(x * pxm, (Hm - yy) * pxm, 7.5, 0, 7); g2.fill(); g2.fillStyle = 'rgba(255,190,140,.6)'; g2.beginPath(); g2.arc(x * pxm - 2, (Hm - yy) * pxm - 2, 2.5, 0, 7); g2.fill(); }
      const hx0 = (HX - HR - (VX0 - 0.6)) * pxm, hw = 2 * HR * pxm; S.plugCan = document.createElement('canvas'); S.plugCan.width = Math.round(hw); S.plugCan.height = h; S.plugCan.getContext('2d').drawImage(g2.canvas, hx0, 0, hw, h, 0, 0, Math.round(hw), h);
      g2.clearRect(hx0, 0, hw, h);
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(Wm, Hm), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.85 }));
    face.position.set((VX0 - 0.6 + VX1 + 0.6) / 2, (SLB0 + SLB1) / 2, CZ + 0.004); face.receiveShadow = true; scene.add(face); S.slabFace = face; }
  // el tapón que se va perforando (media columna de hormigón) y la capa fina que dejan
  { const plug = new THREE.Group(); scene.add(plug); S.plug = plug;
    const c = mesh(new THREE.CylinderGeometry(HR, HR, 1, 40, 1, false, Math.PI / 2, Math.PI), CONC); c.position.y = 0.5; plug.add(c);
    const pt = new THREE.CanvasTexture(S.plugCan); pt.colorSpace = THREE.SRGBColorSpace; S.plugTex = pt; const f = mesh(new THREE.PlaneGeometry(2 * HR, 1), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.85 })); f.position.set(0, 0.5, 0.004); plug.add(f);
    plug.position.set(HX, SLB0, CZ);
    const shellM = new THREE.MeshStandardMaterial({ color: 0x3a3b3f, roughness: 0.95, side: THREE.BackSide });
    const shell = mesh(new THREE.CylinderGeometry(HR, HR, SLB1 - SLB0, 40, 1, true, Math.PI / 2, Math.PI), shellM); shell.position.set(HX, (SLB0 + SLB1) / 2, CZ); scene.add(shell);
    S.layerGlow = new THREE.Mesh(new THREE.TorusGeometry(HR, 0.022, 8, 48, Math.PI), basicGlow(0xffa64a, 1.6)); S.layerGlow.rotation.x = Math.PI / 2; S.layerGlow.rotation.z = Math.PI; scene.add(S.layerGlow);
    S.disc = new THREE.Group(); const dm = mesh(new THREE.CylinderGeometry(HR - 0.02, HR - 0.02, 0.03, 40), M.steel); S.disc.add(dm);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(HR - 0.02, 0.018, 8, 48), basicGlow(0xffd28a, 1.8)); rim.rotation.x = Math.PI / 2; S.disc.add(rim); S.disc.position.set(HX, SLB0 - 0.05, CZ - 0.2); scene.add(S.disc);
    S.frags = Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI, r = HR * (0.25 + 0.6 * hash(i * 3.1)); const fr = mesh(new THREE.BoxGeometry(0.16 + 0.1 * hash(i), 0.07, 0.14 + 0.1 * hash(i * 2)), CONC); fr.userData.p = v3(HX + Math.cos(a) * r, SLB1 - 0.04, CZ - Math.sin(a) * r * 0.9); fr.userData.v = v3((hash(i * 5) - 0.5) * 0.8, -0.4 - hash(i * 7) * 0.6, (hash(i * 9) - 0.5) * 0.4); scene.add(fr); return fr; });
    S.upLight = new THREE.PointLight(0xffc788, 0, 7, 1.6); S.upLight.position.set(HX, SLB1 + 0.4, CZ - 0.3); scene.add(S.upLight);
    S.cone = lightCone(0.55, 2.8, 0.12, 0xffd7a0); S.cone.position.set(HX, SLB1 + 1.4, CZ - 0.25); S.cone.rotation.x = Math.PI; scene.add(S.cone); }
  // puerta redonda
  { const pv = new THREE.Group(); pv.position.set(DOOR.x - DOOR.r, DOOR.y, VZB + 0.62); scene.add(pv); S.doorPv = pv;
    const d = new THREE.Group(); d.position.x = DOOR.r; pv.add(d);
    const body = cyl(DOOR.r, DOOR.r, 0.42, metal(0x9aa2ad, 0.42), 64); body.rotation.x = Math.PI / 2; d.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(DOOR.r * 0.82, 0.05, 12, 64), M.dsteel); ring.position.z = 0.22; d.add(ring);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, b = sph(0.06, M.dsteel, 12, 8); b.position.set(Math.cos(a) * DOOR.r * 0.92, Math.sin(a) * DOOR.r * 0.92, 0.22); d.add(b); }
    const hub = cyl(0.16, 0.16, 0.12, M.brass, 24); hub.rotation.x = Math.PI / 2; hub.position.z = 0.27; d.add(hub);
    for (let i = 0; i < 3; i++) { const sp = cyl(0.03, 0.03, 0.9, M.brass, 10); sp.rotation.z = i * Math.PI / 3; sp.position.z = 0.3; d.add(sp); }
    S.doorL = new THREE.SpotLight(0xdfe9ff, 0, 18, 0.7, 0.5, 1.2); S.doorL.position.set(DOOR.x, DOOR.y + 0.2, VZB - 0.5); S.doorL.target.position.set(DOOR.x + 1.5, SLB1, -2); scene.add(S.doorL, S.doorL.target); }
  // cámaras y sensores (no funcionaban)
  S.sec = [];
  for (const [x, z, cam2] of [[19.2, -1.4, true], [27.2, -1.4, true], [27.3, -5.3, false], [18.8, -5.0, false]]) {
    const gS = new THREE.Group(); gS.position.set(x, ROOM1 - 0.05, z); scene.add(gS);
    if (cam2) { const b = mesh(new THREE.BoxGeometry(0.22, 0.16, 0.36), paint(0xe9ebee, 0.4, 1)); b.position.set(0, -0.16, 0); b.rotation.x = 0.5; gS.add(b); const arm = cyl(0.03, 0.03, 0.14, M.dsteel, 8); arm.position.y = -0.06; gS.add(arm); }
    else { const b = mesh(new THREE.BoxGeometry(0.2, 0.12, 0.12), paint(0xe9ebee, 0.4, 1)); b.position.y = -0.1; gS.add(b); }
    const led = sph(0.03, glowM(0xff3b30, 3), 10, 8); led.position.set(0.07, cam2 ? -0.1 : -0.12, cam2 ? 0.19 : 0.065); gS.add(led); gS.userData.led = led; S.sec.push(gS);
  }
  const vl = new THREE.PointLight(0xcfe0ff, 0, 12, 1.6); vl.position.set(23, ROOM1 - 0.6, -2.4); scene.add(vl); S.vaultL = vl;
}

// ---------------------------------------------------------------- los palés de billetes de 50 reales (bloques retractilados)
let BLKS = [];
function noteTex() {
  return canvasTex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#9a5c2c'); gr.addColorStop(0.5, '#c07a3e'); gr.addColorStop(1, '#8e5426'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(255,236,200,${0.06 + hash(y) * 0.12})`; g.fillRect(0, y, w, 1); }
    g.fillStyle = '#efe7d2'; g.fillRect(w * 0.42, 0, w * 0.16, h); g.fillStyle = '#2f2418'; g.font = '900 30px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('50', w * 0.5, h * 0.5);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
  });
}
function buildMoney() {
  const m = new THREE.MeshStandardMaterial({ map: noteTex(), roughness: 0.55 });
  const n = BLK.nx * BLK.ny * BLK.nz;
  S.pals = PALS.map(([px, pz], pi) => {
    const base = mesh(new THREE.BoxGeometry(BLK.nx * BLK.w + 0.12, 0.14, BLK.nz * BLK.d + 0.12), M.woodL); base.position.set(px, SLB1 + 0.07, pz); scene.add(base);
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(BLK.w * 0.96, BLK.h * 0.94, BLK.d * 0.96), m, n); im.castShadow = true; im.receiveShadow = true; scene.add(im);
    const home = [];
    for (let iy = 0; iy < BLK.ny; iy++) for (let ix = 0; ix < BLK.nx; ix++) for (let iz = 0; iz < BLK.nz; iz++) home.push(v3(px + (ix - (BLK.nx - 1) / 2) * BLK.w, SLB1 + 0.14 + (iy + 0.5) * BLK.h, pz + (iz - (BLK.nz - 1) / 2) * BLK.d));
    home.sort((a, b) => b.y - a.y || hash(a.x * 3 + a.z) - hash(b.x * 3 + b.z));     // se van primero los de arriba
    const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BLK.nx * BLK.w + 0.16, BLK.ny * BLK.h + 0.2, BLK.nz * BLK.d + 0.16)), new THREE.LineBasicMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.55 }));
    cage.position.set(px, SLB1 + 0.14 + (BLK.ny * BLK.h + 0.2) / 2, pz); scene.add(cage);
    return { im, home, n };
  });
  S.fly = new THREE.InstancedMesh(new THREE.BoxGeometry(BLK.w * 1.15, BLK.h * 1.15, BLK.d * 1.15), m, 190); S.fly.castShadow = true; scene.add(S.fly);
}

// ---------------------------------------------------------------- el túnel por dentro: vigas, bombillas y el tubo de ventilación (aparecen según avanza)
function buildTunnel() {
  const T0 = TY - TH / 2, T1 = TY + TH / 2, ZT = CZ - TW / 2;
  const plankM = new THREE.MeshStandardMaterial({ map: repTex(woodTex('#5c3d22', '#3a2412', '#7a5432', 4), 6, 1), roughness: 0.8 });
  const floor = mesh(new THREE.BoxGeometry(TX1 - TX0 + 0.4, 0.05, TW / 2), plankM); floor.position.set((TX0 + TX1) / 2, T0 + 0.025, (ZT + CZ) / 2); scene.add(floor); S.tFloor = floor;
  S.frames = []; S.bulbs = []; const beamM = M.woodL;
  for (let x = TX0 + 0.6; x < TX1 - 0.2; x += 1.1) {
    const g = new THREE.Group(); g.position.x = x; scene.add(g);
    const post = mesh(new THREE.BoxGeometry(0.1, TH - 0.04, 0.1), beamM); post.position.set(0, TY, ZT + 0.06); g.add(post);
    const top = mesh(new THREE.BoxGeometry(0.1, 0.1, TW / 2 + 0.02), beamM); top.position.set(0, T1 - 0.06, (ZT + CZ) / 2); g.add(top);
    g.userData.x = x; S.frames.push(g);
  }
  for (let x = TX0 + 1.4; x < TX1 - 0.4; x += 2.6) { const b = sph(0.05, glowM(0xffc77a, 4), 12, 8); b.position.set(x, T1 - 0.17, CZ - 0.2); scene.add(b); const wire = cyl(0.006, 0.006, 0.06, M.black, 4); wire.position.set(x, T1 - 0.1, CZ - 0.2); scene.add(wire); b.userData.x = x; S.bulbs.push(b); wire.userData.x = x; S.bulbs.push(wire); }
  const ductM = new THREE.MeshStandardMaterial({ map: canvasTex(64, 16, (g, w, h) => { g.fillStyle = '#6f757e'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.35)'; for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1.4, h); }), roughness: 0.55, metalness: 0.3 });
  ductM.map.wrapS = THREE.RepeatWrapping; ductM.map.repeat.set(40, 1);
  S.duct = cyl(0.07, 0.07, 1, ductM, 16); S.duct.rotation.z = Math.PI / 2; S.duct.position.set(TX0, T1 - 0.13, ZT + 0.12); scene.add(S.duct);
  const shaftL = mesh(new THREE.BoxGeometry(0.06, -T1, 0.06), beamM); shaftL.position.set(TX0 - 0.38, T1 / 2, ZT + 0.06); scene.add(shaftL);
  S.tLights = [0.5, 7.5, 14.5, 21].map(x => { const L = new THREE.PointLight(0xffb867, 0, 6.5, 1.5); L.position.set(x, TY + 0.25, CZ + 0.25); L.userData.x = x; scene.add(L); return L; });
  S.digLine = drawLine([v3(TX0, -0.2, CZ), v3(TX0, TY, CZ), v3(TX1, TY, CZ)].flatMap((p, i, a) => i ? Array.from({ length: 40 }, (_, k) => a[i - 1].clone().lerp(p, (k + 1) / 40)) : [p]), 0xffc06a, 5, 1);
  S.digLine.position.z = 0.03;
}
function buildRobo() { buildGround(); buildHouse(); buildBank(); buildMoney(); buildTunnel(); S.sp = sparks(scene, 70, 0xffc46a, 0.05); }
