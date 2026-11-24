// ---------------------------------------------------------------- 29N · EL PLATÓ del debate a cuatro: tarima redonda, cuatro atriles con las siglas y el color de cada
// partido (sin logotipos), columnas de luz, pantalla gigante curva (el hemiciclo, la cita del jueves, «mañana, capítulo 1»), focos con haz, cámaras de estudio,
// atriles en penumbra (hay más partidos) y la urna de metacrilato del principio y del final.
const SET = { X: [-1.95, -0.65, 0.65, 1.95], Z: 0, URN: [0, 0, 6.2], WALL_Z: -5.2, WALL_R: 9.5 };
const lectX = i => SET.X[i], lectZ = i => SET.Z + 0.16 * Math.abs(SET.X[i]), lectRy = i => -SET.X[i] * 0.07;
// atril: peana, columna, frente con las siglas (panel de luz), tablero inclinado, dos micros y un vaso de agua
function lectern(id) { const P = PARTY[id], g = new THREE.Group(), dark = new THREE.MeshPhysicalMaterial({ color: 0x0c0e13, roughness: 0.25, metalness: 0.4, clearcoat: 0.8 }), U = g.userData;
  g.add(box(0.62, 0.04, 0.46, dark, 0, 0.02, 0)); g.add(box(0.5, 1.04, 0.07, dark, 0, 0.56, 0.12));
  const t = signTex(512, 832, (c, W, H) => { c.fillStyle = '#07090d'; c.fillRect(0, 0, W, H); c.fillStyle = P.css; c.fillRect(0, 0, W, 150); c.fillRect(0, H - 40, W, 40);
    c.fillStyle = P.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 84px Inter'; c.fillText(P.short.toUpperCase(), W / 2, 80, W - 40);
    c.fillStyle = '#f4f6fa'; const two = P.sig.includes(' '); c.font = `900 ${two ? 100 : 200}px Inter`;
    if (two) { const [a, b] = P.sig.split(' '); c.fillText(a, W / 2, H * 0.42); c.fillText(b, W / 2, H * 0.57); } else c.fillText(P.sig, W / 2, H * 0.5, W - 50); });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.75), nightMat(new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.95, roughness: 0.4 }))); front.position.set(0, 0.6, 0.158); g.add(front); U.front = front;
  const strip = nightMat(new THREE.MeshStandardMaterial({ color: 0x050505, emissive: P.col, emissiveIntensity: 3.0, roughness: 0.4 })); for (const s of [-1, 1]) g.add(box(0.02, 1.0, 0.02, strip, s * 0.262, 0.56, 0.15)); U.strip = strip;
  const top = box(0.66, 0.035, 0.46, dark, 0, 1.12, 0.0); top.rotation.x = 0.2; g.add(top);
  for (const s of [-1, 1]) { const m = new THREE.Group(); m.position.set(s * 0.12, 1.14, 0.1); m.rotation.set(-0.5, 0, s * 0.12); g.add(m); ad(m, cyl(0.004, 0.004, 0.26, dark, 6)).position.y = 0.13; ad(m, cyl(0.011, 0.009, 0.05, stdM(0x1a1c20, 0.6), 10)).position.y = 0.28; }
  const glass = cyl(0.03, 0.026, 0.1, M.glass, 14); glass.position.set(0.24, 1.2, -0.08); g.add(glass); const water = cyl(0.026, 0.024, 0.06, new THREE.MeshStandardMaterial({ color: 0xbfe2f2, transparent: true, opacity: 0.55, roughness: 0.1 }), 12); water.position.set(0.24, 1.185, -0.08); g.add(water);
  shadowAll(g, true, true); front.castShadow = false; return g; }
// atril apagado de otro partido (silueta en penumbra)
function dimLectern() { const g = new THREE.Group(), m = stdM(0x12151b, 0.6); g.add(box(0.5, 1.04, 0.07, m, 0, 0.56, 0.12)); g.add(box(0.6, 0.04, 0.44, m, 0, 0.02, 0)); const top = box(0.64, 0.035, 0.44, m, 0, 1.12, 0); top.rotation.x = 0.2; g.add(top);
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.72), new THREE.MeshStandardMaterial({ color: 0x0a0c10, emissive: 0x8a93a6, emissiveIntensity: 0, roughness: 0.5 })); pl.position.set(0, 0.6, 0.158); g.add(pl); g.userData.pl = pl.material; shadowAll(g, true, true); return g; }
// cámara de estudio sobre pedestal (silueta en primer término)
function studioCam() { const g = new THREE.Group(), m = stdM(0x15171c, 0.5, { metalness: 0.4 }); ad(g, cyl(0.32, 0.38, 0.1, m, 20)).position.y = 0.05; ad(g, cyl(0.07, 0.09, 1.25, m, 14)).position.y = 0.72;
  const head = new THREE.Group(); head.position.y = 1.5; g.add(head); head.add(box(0.34, 0.3, 0.62, m, 0, 0, 0)); const lens = cyl(0.11, 0.09, 0.3, stdM(0x08090b, 0.2, { metalness: 0.7 }), 18); lens.rotation.x = Math.PI / 2; lens.position.z = -0.44; head.add(lens);
  head.add(box(0.44, 0.3, 0.04, stdM(0x101216, 0.4), 0, 0.06, 0.36)); const tally = sph(0.022, new THREE.MeshStandardMaterial({ color: 0x300000, emissive: 0xff2010, emissiveIntensity: 4 }), 10, 8); tally.position.set(0.12, 0.2, -0.3); head.add(tally); g.userData.head = head; shadowAll(g, true, true); return g; }
// la urna: caja de metacrilato con tapa, ranura y precinto; dentro, un montón de sobres
function ballotBox() { const g = new THREE.Group(), U = g.userData, W = 0.42, Hh = 0.52, D = 0.42, ac = new THREE.MeshPhysicalMaterial({ color: 0xeaf4ff, roughness: 0.03, transparent: true, opacity: 0.05, clearcoat: 1, depthWrite: false, side: THREE.FrontSide });
  for (const [w, h, d, x, y, z] of [[W, Hh, 0.006, 0, Hh / 2, D / 2], [W, Hh, 0.006, 0, Hh / 2, -D / 2], [0.006, Hh, D, W / 2, Hh / 2, 0], [0.006, Hh, D, -W / 2, Hh / 2, 0]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ac); p.position.set(x, y, z); p.renderOrder = 3; g.add(p); }
  const edge = new THREE.MeshStandardMaterial({ color: 0xdfeaf6, roughness: 0.2, transparent: true, opacity: 0.55 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.012, Hh, 0.012, edge, sx * W / 2, Hh / 2, sz * D / 2));
  const lidM = new THREE.MeshPhysicalMaterial({ color: 0xeaf4ff, roughness: 0.05, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false }); for (const s of [-1, 1]) g.add(box(W + 0.03, 0.02, (D + 0.03) / 2 - 0.012, lidM, 0, Hh + 0.01, s * ((D + 0.03) / 4 + 0.006))); for (const s of [-1, 1]) g.add(box((W + 0.03 - 0.2) / 2, 0.02, 0.024, lidM, s * ((W + 0.03) / 2 - (W + 0.03 - 0.2) / 4), Hh + 0.01, 0));
  g.add(box(W + 0.03, 0.012, D + 0.03, new THREE.MeshPhysicalMaterial({ color: 0xdfe6ee, roughness: 0.3, clearcoat: 0.6 }), 0, 0.006, 0)); for (const s of [-1, 1]) g.add(box(0.2, 0.004, 0.004, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 }), 0, Hh + 0.021, s * 0.013));
  const lab = signPlane(0.3, 0.085, 512, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1d22'; c.font = '900 46px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CONGRESO DE LOS DIPUTADOS', w / 2, h / 2 + 2, w - 24); }, { r: 0.6 }); lab.position.set(0, Hh * 0.62, D / 2 + 0.005); g.add(lab);
  U.pile = []; const R = rng(29); for (let i = 0; i < 22; i++) { const e = envelope(); e.position.set((R() - 0.5) * 0.24, 0.02 + i * 0.0036 + R() * 0.012, -0.03 + (R() - 0.5) * 0.24); e.rotation.set(-Math.PI / 2 + (R() - 0.5) * 0.5, (R() - 0.5) * 0.4, R() * 6.28); g.add(e); U.pile.push(e); }
  U.size = [W, Hh, D]; return g; }
// sobre de votación (blanco, con el rótulo del Congreso)
let _envT = null;
function envelope() { if (!_envT) _envT = signTex(512, 256, (c, w, h) => { c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,0,0,0.10)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(w / 2, h * 0.52); c.lineTo(w, 0); c.stroke(); c.strokeRect(2, 2, w - 4, h - 4);
    c.fillStyle = '#2a2d33'; c.font = '700 26px Inter'; c.textAlign = 'center'; c.fillText('ELECCIONES A CORTES GENERALES', w / 2, h * 0.7); c.font = '900 36px Inter'; c.fillText('DIPUTADOS', w / 2, h * 0.87); });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.176, 0.12, 0.0016), [0, 1, 2, 3, 4, 5].map(i => new THREE.MeshStandardMaterial({ color: 0xfbfaf6, map: i === 4 ? _envT : null, roughness: 0.85 }))); m.castShadow = true; m.receiveShadow = true; return m; }
// ---- la pantalla gigante (lienzo que se repinta): hemiciclo, cita del debate, «mañana, capítulo 1»
const WALL = { W: 2048, H: 1024, key: '' };
function hemiSeats() { const out = [], rows = 10, cx = WALL.W / 2, cy = WALL.H * 0.7, n0 = 22; let tot = 0; const per = []; for (let r = 0; r < rows; r++) { per.push(n0 + r * 3); tot += n0 + r * 3; }
  let extra = 350 - tot; for (let r = rows - 1; extra !== 0; r = (r - 1 + rows) % rows) { per[r] += Math.sign(extra); extra -= Math.sign(extra); }
  for (let r = 0; r < rows; r++) for (let i = 0; i < per[r]; i++) { const a = Math.PI * (0.03 + 0.94 * (i + 0.5) / per[r]), R0 = 215 + r * 38; out.push([cx - Math.cos(a) * R0, cy - Math.sin(a) * R0, r, a]); }
  out.sort((p, q) => p[3] - q[3] || p[2] - q[2]); return out; }
const wallU = x => WALL.W * (0.5 + Math.asin(clamp(x / SET.WALL_R, -1, 1)) / 1.2);        // x del plató → columna del lienzo
function wallDraw(st) { const key = JSON.stringify(st); if (key === WALL.key) return; WALL.key = key; const c = S.wallC.getContext('2d'), W = WALL.W, H = WALL.H; c.globalAlpha = 1;
  const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#081028'); gr.addColorStop(0.55, '#0a1634'); gr.addColorStop(1, '#050814'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  c.globalAlpha = 0.06; c.strokeStyle = '#9fc0ff'; c.lineWidth = 2; for (let i = -6; i < 30; i++) { c.beginPath(); c.moveTo(i * 110, 0); c.lineTo(i * 110 + 520, H); c.stroke(); } c.globalAlpha = 1;
  // la banda de luz de cada partido, detrás de su atril
  ORDER.forEach((id, i) => { const k = st.band[i]; if (k <= 0.01) return; const x = wallU(lectX(i) * 1.22), w = 150, g2 = c.createLinearGradient(x - w, 0, x + w, 0); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(0.32, PARTY[id].css); g2.addColorStop(0.68, PARTY[id].css); g2.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = Math.min(1, k) * 0.9; c.fillStyle = g2; c.fillRect(x - w, 0, 2 * w, H); c.globalAlpha = 1; });
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (st.hemi > 0 || st.hemiA > 0) { const n = Math.round(350 * st.hemi), a = st.hemiA, cy = H * 0.7; c.globalAlpha = a * 0.75; c.fillStyle = '#060b1c'; c.beginPath(); c.arc(W / 2, cy, 610, Math.PI, 0); c.lineTo(W / 2 + 610, cy + 120); c.lineTo(W / 2 - 610, cy + 120); c.fill();
    c.globalAlpha = a; for (let i = 0; i < S.seats.length; i++) { const [x, y] = S.seats[i]; c.fillStyle = i < n ? '#eef2fc' : 'rgba(150,170,210,0.2)'; c.beginPath(); c.arc(x, y, 12.5, 0, 7); c.fill(); }
    c.fillStyle = '#ffffff'; c.font = '900 128px Inter'; c.fillText(String(n), W / 2, cy - 108); c.font = '700 40px Inter'; c.fillStyle = '#b9c8ee'; c.fillText('DIPUTADOS', W / 2, cy - 30);
    if (st.pres > 0) { c.globalAlpha = a * st.pres; c.strokeStyle = 'rgba(255,214,106,0.55)'; c.lineWidth = 3; for (let i = 0; i < S.seats.length; i += 6) { const [x, y] = S.seats[i]; c.beginPath(); c.moveTo(x, y); c.lineTo(W / 2, cy + 62); c.stroke(); }
      c.fillStyle = '#ffd66a'; rr(c, W / 2 - 230, cy + 26, 460, 76, 38); c.fill(); c.fillStyle = '#1a1405'; c.font = '900 50px Inter'; c.fillText('PRESIDENTE', W / 2, cy + 66); } c.globalAlpha = 1; }
  const panel = (y0, y1, a) => { c.globalAlpha = a * 0.72; c.fillStyle = '#060b1c'; rr(c, W / 2 - 700, y0, 1400, y1 - y0, 50); c.fill(); c.globalAlpha = a; };
  if (st.cita > 0) { panel(H * 0.2, H * 0.6, st.cita); c.fillStyle = '#ffffff'; c.font = '900 150px Inter'; c.fillText('DEBATE A CUATRO', W / 2, H * 0.325, 1280); c.fillStyle = '#ffd66a'; c.font = '900 124px Inter'; c.fillText('JUEVES 26 · 22:00', W / 2, H * 0.49, 1280); c.globalAlpha = 1; }
  if (st.man > 0) { panel(H * 0.2, H * 0.6, st.man); c.fillStyle = '#ffd66a'; c.font = '900 124px Inter'; c.fillText('MAÑANA', W / 2, H * 0.31); c.fillStyle = '#ffffff'; c.font = '900 176px Inter'; c.fillText('CAPÍTULO 1', W / 2, H * 0.47, 1280); c.globalAlpha = 1; }
  if (st.base > 0) { panel(H * 0.2, H * 0.6, st.base); c.fillStyle = '#ffffff'; c.font = '900 230px Inter'; c.fillText('29N', W / 2, H * 0.335); c.font = '700 62px Inter'; c.fillStyle = '#b9c8ee'; c.fillText('ELECCIONES GENERALES', W / 2, H * 0.5, 1280); c.globalAlpha = 1; }
  S.wallT.needsUpdate = true; }
function buildSet(G) { const dark = new THREE.MeshPhysicalMaterial({ color: 0x06080c, roughness: 0.22, metalness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.15, transparent: true, opacity: 0.84 });
  const mirror = new THREE.Group(); mirror.scale.y = -1; G.add(mirror); S.mirror = mirror;                         // reflejo barato: lo que brilla, repetido bajo el suelo semitransparente
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), dark); floor.rotation.x = -Math.PI / 2; floor.position.y = 0; floor.receiveShadow = true; floor.renderOrder = 1; G.add(floor);
  const under = new THREE.Mesh(new THREE.CircleGeometry(60, 32), new THREE.MeshBasicMaterial({ color: 0x010203 })); under.rotation.x = -Math.PI / 2; under.position.y = -9; G.add(under);
  // tarima con aro de luz
  const ringM = nightMat(new THREE.MeshStandardMaterial({ color: 0x0a0c10, emissive: 0xbcd4ff, emissiveIntensity: 2.2, roughness: 0.4 }));
  for (const par of [G, mirror]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.035, 8, 96), ringM); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.17, 0.4); par.add(ring); }
  const riser = cyl(5.6, 5.6, 0.16, new THREE.MeshPhysicalMaterial({ color: 0x0a0c11, roughness: 0.3, clearcoat: 0.6 }), 72); riser.position.set(0, 0.08, 0.4); riser.castShadow = false; G.add(riser); S.FL = 0.16;
  // pantalla gigante curva
  S.wallC = cnv(WALL.W, WALL.H); S.wallT = new THREE.CanvasTexture(S.wallC); S.wallT.colorSpace = THREE.SRGBColorSpace; S.wallT.anisotropy = 8; S.wallT.wrapS = THREE.RepeatWrapping; S.wallT.repeat.x = -1; S.wallT.offset.x = 1; S.seats = hemiSeats();
  S.wallM = nightMat(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: S.wallT, emissiveIntensity: 1.25, roughness: 0.5, side: THREE.BackSide }));
  const wg = new THREE.CylinderGeometry(SET.WALL_R, SET.WALL_R, 5.4, 72, 1, true, Math.PI - 0.6, 1.2);
  for (const par of [G, mirror]) { const wall = new THREE.Mesh(wg, S.wallM); wall.position.set(0, 3.5, SET.WALL_Z + SET.WALL_R); par.add(wall); }
  const frameM = stdM(0x0b0d12, 0.4, { metalness: 0.5 }); for (const y of [0.74, 6.26]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(SET.WALL_R - 0.02, SET.WALL_R - 0.02, 0.12, 72, 1, true, Math.PI - 0.62, 1.24), new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.4, side: THREE.DoubleSide })); f.position.set(0, y, SET.WALL_Z + SET.WALL_R); G.add(f); }
  // paneles laterales oscuros con tiras de luz (cierran el plató)
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const a = s * (0.72 + i * 0.2), p = box(1.5, 7, 0.12, frameM, Math.sin(a) * 10.5, 3.5, SET.WALL_Z + SET.WALL_R - Math.cos(a) * 10.5); p.rotation.y = a; G.add(p);
    const st = box(0.05, 6.2, 0.02, nightMat(new THREE.MeshStandardMaterial({ color: 0x05070a, emissive: 0x4f7dff, emissiveIntensity: 1.5 })), Math.sin(a) * 10.4, 3.4, SET.WALL_Z + SET.WALL_R - Math.cos(a) * 10.4); st.rotation.y = a; G.add(st); }
  // atriles y columnas de luz del color de cada partido
  S.lect = {}; S.colM = {}; ORDER.forEach((id, i) => { const l = lectern(id); l.position.set(lectX(i), S.FL, lectZ(i)); l.rotation.y = lectRy(i); G.add(l); S.lect[id] = l;
    nightSrc(_v(lectX(i) * 1.1, 2.6, -3.4), PARTY[id].col, 14, 3.4, 'col_' + id); });
  // otros atriles, en penumbra (hay más partidos)
  S.dims = []; for (const [x, z, ry] of [[-4.3, 0.9, 0.45], [-5.6, 2.0, 0.6], [-6.8, 3.4, 0.75], [4.3, 0.9, -0.45], [5.6, 2.0, -0.6], [6.8, 3.4, -0.75]]) { const d = dimLectern(); d.position.set(x, 0, z); d.rotation.y = ry; G.add(d); S.dims.push(d); }
  // parrilla de focos con haces
  const truss = stdM(0x14161b, 0.5, { metalness: 0.5 }); for (const z of [1.2, 3.6]) { G.add(box(13, 0.1, 0.1, truss, 0, 7.4, z)); G.add(box(13, 0.1, 0.1, truss, 0, 7.75, z)); for (let x = -6.5; x <= 6.5; x += 0.65) { const d = box(0.04, 0.42, 0.04, truss, x, 7.57, z); d.rotation.z = (Math.round(x / 0.65) % 2 ? 1 : -1) * 0.55; G.add(d); } }
  S.spots = {}; ORDER.forEach((id, i) => { const head = new THREE.Group(); head.position.set(lectX(i) * 0.9, 7.25, 3.6); G.add(head); const tgt = _v(lectX(i), 1.6, lectZ(i) - 0.35); head.lookAt(tgt); head.add(box(0.3, 0.3, 0.42, truss, 0, 0, 0));
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), nightMat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4e0).multiplyScalar(2.6), toneMapped: false }))); lens.position.z = 0.22; head.add(lens);
    const cone = lightCone(1.05, 7.2, 0.05, 0xfff2dc); cone.position.copy(head.position); cone.lookAt(tgt); cone.rotateX(-Math.PI / 2); G.add(cone); S.spots[id] = { head, cone, src: nightSrc(tgt.clone().add(_v(0, 0.9, 1.3)), 0xfff0dc, 3.4, 2.8, 'spot_' + id) }; });
  // cámaras de estudio en primer término
  S.cams = []; for (const [x, z, ry] of [[-3.9, 7.9, Math.PI + 0.42], [4.2, 8.3, Math.PI - 0.45]]) { const c = studioCam(); c.position.set(x, 0, z); c.rotation.y = ry; G.add(c); S.cams.push(c); }
  // la urna, en su mesa, delante de la tarima
  const tb = new THREE.Group(); tb.position.set(SET.URN[0], 0, SET.URN[2]); G.add(tb); tb.add(box(0.7, 0.04, 0.62, new THREE.MeshPhysicalMaterial({ color: 0x0c0e13, roughness: 0.25, clearcoat: 0.8 }), 0, 0.9, 0)); ad(tb, cyl(0.05, 0.07, 0.88, stdM(0x15171c, 0.4, { metalness: 0.5 }), 14)).position.y = 0.44; ad(tb, cyl(0.26, 0.3, 0.04, stdM(0x15171c, 0.4, { metalness: 0.5 }), 20)).position.y = 0.02; shadowAll(tb, true, true);
  S.urn = ballotBox(); S.urn.position.set(SET.URN[0], 0.92, SET.URN[2]); G.add(S.urn); nightSrc(_v(SET.URN[0], 1.9, SET.URN[2] + 0.3), 0xdfeaff, 9, 1.6, 'urn');
  S.env = envelope(); G.add(S.env);
  wallDraw({ base: 1, band: [1, 1, 1, 1], hemi: 0, hemiA: 0, pres: 0, cita: 0, man: 0 }); }
// ---------------------------------------------------------------- los objetos de cada medida (aparecen sobre el atril cuando la voz los nombra)
function plate(txt, w, h, o = {}) { const lines = [].concat(txt), px = 1024, t = signTex(px, Math.round(px * h / w), (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = o.bg ?? 'rgba(8,10,16,0.92)'; rr(c, 6, 6, W - 12, H - 12, Math.min(60, H * 0.3)); c.fill(); if (o.edge) { c.strokeStyle = o.edge; c.lineWidth = 10; rr(c, 10, 10, W - 20, H - 20, Math.min(56, H * 0.28)); c.stroke(); }
    c.textAlign = 'center'; c.textBaseline = 'middle'; lines.forEach((s, i) => { const big = i === 0; c.fillStyle = big ? (o.ink ?? '#ffffff') : (o.ink2 ?? '#b9c8ee'); c.font = `900 ${Math.round(H * (lines.length > 1 ? (big ? 0.46 : 0.24) : 0.56))}px Inter`; c.fillText(s, W / 2, H * (lines.length > 1 ? (big ? 0.38 : 0.76) : 0.53), W - 70); }); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false })); m.renderOrder = 5; return m; }
function miniHouse(col = 0xf2efe8, roof = 0xb8452f, s = 1) { const g = new THREE.Group(); g.add(box(0.2 * s, 0.15 * s, 0.18 * s, stdM(col, 0.7), 0, 0.075 * s, 0)); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.165 * s, 0.11 * s, 4, 1), stdM(roof, 0.7)); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.92); r.position.y = 0.205 * s; g.add(r);
  g.add(box(0.045 * s, 0.075 * s, 0.006 * s, stdM(0x5a3a26, 0.6), 0, 0.038 * s, 0.092 * s)); shadowAll(g, true, true); return g; }
function miniBlock(floors = 6, col = 0xdfe3ea, s = 1) { const g = new THREE.Group(), h = floors * 0.07 * s; g.add(box(0.22 * s, h, 0.16 * s, stdM(col, 0.65), 0, h / 2, 0)); const wm = nightMat(new THREE.MeshStandardMaterial({ color: 0x1a2430, emissive: 0xffd9a0, emissiveIntensity: 1.3, roughness: 0.4 }));
  for (let f = 0; f < floors; f++) for (let i = 0; i < 3; i++) g.add(box(0.036 * s, 0.036 * s, 0.004 * s, wm, (i - 1) * 0.065 * s, (f + 0.55) * 0.07 * s, 0.082 * s)); g.add(box(0.24 * s, 0.012 * s, 0.18 * s, stdM(0x8a8f96, 0.6), 0, h + 0.006 * s, 0)); shadowAll(g, true, true); return g; }
function buildProps(G) { const P = {}, base = (id, i) => { const g = new THREE.Group(); g.position.set(lectX(i), 2.4, lectZ(i) + 0.15); G.add(g); return g; };
  // PP: un millón de viviendas (casitas que brotan sobre una losa) · IVA de la primera casa 10 % → 4 % (menores de 40)
  { const g = base('pp', 0), a = new THREE.Group(), b = new THREE.Group(); g.add(a, b); P.pp = { g, a, b, houses: [] };
    a.add(box(1.15, 0.03, 0.62, stdM(0x1a2230, 0.5), 0, 0, 0)); for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const h = miniHouse([0xf2efe8, 0xe9dcc4, 0xdfe7ee][(i + j) % 3], [0xb8452f, 0x8e3b2a, 0x5a6a7a][(i * 2 + j) % 3], 1.0); h.position.set(-0.46 + i * 0.23, 0.015, -0.2 + j * 0.2); a.add(h); P.pp.houses.push(h); }
    const p1 = plate(['1.000.000', 'DE VIVIENDAS'], 1.15, 0.42, { edge: PARTY.pp.css }); p1.position.set(0, 0.62, 0.05); a.add(p1);
    const hs = miniHouse(0xf2efe8, 0xb8452f, 2.3); hs.position.set(-0.3, -0.05, 0); b.add(hs); P.pp.t10 = plate(['IVA 10 %', 'HOY'], 0.62, 0.34, { edge: '#8a93a6' }); P.pp.t10.position.set(0.36, 0.36, 0.1); b.add(P.pp.t10);
    P.pp.t4 = plate(['IVA 4 %', 'MENORES DE 40'], 0.72, 0.4, { edge: PARTY.pp.css, ink: '#ffd66a' }); P.pp.t4.position.set(0.36, 0.36, 0.1); b.add(P.pp.t4); const sub = plate('PRIMERA VIVIENDA', 0.9, 0.17, {}); sub.position.set(0.05, -0.2, 0.2); b.add(sub); }
  // PSOE: el 1 % del PIB cada año para vivienda (una loncha del PIB se vuelve casa) · blindar las pensiones en la Constitución (libro con escudo y candado)
  { const g = base('psoe', 1), a = new THREE.Group(), b = new THREE.Group(); g.add(a, b); P.psoe = { g, a, b };
    const stack = new THREE.Group(); stack.position.set(-0.28, -0.08, 0); a.add(stack); for (let i = 0; i < 12; i++) ad(stack, cyl(0.19, 0.19, 0.036, i % 2 ? M.gold : M.brass, 28)).position.y = i * 0.04; const lb = plate('PIB', 0.36, 0.17, {}); lb.position.set(0, -0.14, 0.24); stack.add(lb);
    P.psoe.slice = cyl(0.19, 0.19, 0.012, nightMat(new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffc840, emissiveIntensity: 1.2, metalness: 0.8, roughness: 0.3 })), 28); a.add(P.psoe.slice);
    P.psoe.house = miniHouse(0xf2efe8, 0xb8452f, 1.7); P.psoe.house.position.set(0.34, -0.06, 0); a.add(P.psoe.house); const p1 = plate(['1 % DEL PIB', 'CADA AÑO · VIVIENDA'], 1.15, 0.42, { edge: PARTY.psoe.css }); p1.position.set(0, 0.62, 0.05); a.add(p1);
    const bk = new THREE.Group(); bk.position.set(-0.05, 0.02, 0); bk.rotation.set(0.1, -0.25, 0); b.add(bk); P.psoe.book = bk; bk.add(box(0.5, 0.66, 0.1, stdM(0x7a1220, 0.5), 0, 0, 0)); bk.add(box(0.46, 0.62, 0.11, M.paper, 0.012, 0, 0));
    const cv = signPlane(0.5, 0.66, 512, (c, w, h) => { c.fillStyle = '#7a1220'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8c46a'; c.lineWidth = 8; c.strokeRect(22, 22, w - 44, h - 44); c.fillStyle = '#f2d98a'; c.textAlign = 'center'; c.font = '900 62px Inter'; c.fillText('CONSTITUCIÓN', w / 2, h * 0.2, w - 70); c.font = '700 40px Inter'; c.fillText('ESPAÑOLA', w / 2, h * 0.29); }, { r: 0.5 }); cv.position.z = 0.056; bk.add(cv);
    const sh = new THREE.Shape(); sh.moveTo(-0.13, 0.13); sh.lineTo(0.13, 0.13); sh.lineTo(0.13, -0.02); sh.quadraticCurveTo(0.12, -0.14, 0, -0.19); sh.quadraticCurveTo(-0.12, -0.14, -0.13, -0.02); sh.lineTo(-0.13, 0.13);
    P.psoe.shield = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }), M.gold); P.psoe.shield.position.set(0, -0.08, 0.07); bk.add(P.psoe.shield);
    const lock = new THREE.Group(); lock.position.set(0, -0.085, 0.118); bk.add(lock); lock.add(box(0.1, 0.08, 0.03, stdM(0x23262c, 0.3, { metalness: 0.8 }), 0, -0.02, 0)); const arc = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.009, 8, 20, Math.PI), stdM(0x23262c, 0.3, { metalness: 0.8 })); arc.position.y = 0.02; lock.add(arc); P.psoe.lock = lock;
    const p2 = plate(['PENSIONES', 'EN LA CONSTITUCIÓN'], 1.15, 0.42, { edge: PARTY.psoe.css }); p2.position.set(0, 0.62, 0.05); b.add(p2); }
  // Vox: prohibir las regularizaciones masivas (papel con sello) · prioridad nacional en vivienda y ayudas (casa y sobre de ayuda con su cinta)
  { const g = base('vox', 2), a = new THREE.Group(), b = new THREE.Group(); g.add(a, b); P.vox = { g, a, b };
    const doc = signPlane(0.62, 0.8, 768, (c, w, h) => { c.fillStyle = '#f6f2e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1d22'; c.textAlign = 'center'; c.font = '900 64px Inter'; c.fillText('REGULARIZACIÓN', w / 2, h * 0.14, w - 60); c.fillText('MASIVA', w / 2, h * 0.23); c.fillStyle = '#9aa0aa'; for (let i = 0; i < 9; i++) c.fillRect(70, h * 0.33 + i * 52, w - 140 - (i % 3) * 60, 14); }, { r: 0.8 }); doc.position.set(0, -0.02, 0); doc.rotation.set(-0.12, 0.12, 0.03); a.add(doc); P.vox.doc = doc;
    P.vox.mark = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.2), new THREE.MeshBasicMaterial({ map: signTex(768, 276, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#d81e2c'; c.lineWidth = 16; rr(c, 14, 14, w - 28, h - 28, 26); c.stroke(); c.fillStyle = '#d81e2c'; c.font = '900 150px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PROHIBIR', w / 2, h / 2 + 8, w - 70); }), transparent: true, toneMapped: false, depthWrite: false })); P.vox.mark.position.set(0.02, -0.12, 0.03); P.vox.mark.rotation.z = -0.2; P.vox.mark.renderOrder = 6; doc.add(P.vox.mark);
    P.vox.stamp = new THREE.Group(); a.add(P.vox.stamp); ad(P.vox.stamp, cyl(0.05, 0.06, 0.16, M.wood, 16)).position.y = 0.14; ad(P.vox.stamp, sph(0.065, M.wood, 16, 12)).position.y = 0.25; P.vox.stamp.add(box(0.3, 0.05, 0.12, stdM(0x2a2c30, 0.5), 0, 0.03, 0)); shadowAll(P.vox.stamp);
    const p1 = plate(['PROHIBIR', 'REGULARIZACIONES MASIVAS'], 1.2, 0.42, { edge: PARTY.vox.css }); p1.position.set(0, 0.66, 0.05); a.add(p1);
    const hs = miniHouse(0xf2efe8, 0xb8452f, 2.0); hs.position.set(-0.3, -0.12, 0); b.add(hs); const aid = signPlane(0.42, 0.28, 512, (c, w, h) => { c.fillStyle = '#f6f2e8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9c2b2'; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#1a1d22'; c.font = '900 110px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('AYUDAS', w / 2, h / 2 + 6, w - 60); }, { r: 0.8 }); aid.position.set(0.34, 0.02, 0.02); aid.rotation.z = 0.06; b.add(aid);
    P.vox.rib = plate('PRIORIDAD NACIONAL', 1.2, 0.24, { bg: 'rgba(93,187,42,0.96)', ink: '#07140a' }); P.vox.rib.position.set(0, 0.34, 0.16); P.vox.rib.rotation.z = 0.04; b.add(P.vox.rib);
    const p2 = plate(['EN VIVIENDA', 'Y AYUDAS'], 0.95, 0.36, { edge: PARTY.vox.css }); p2.position.set(0, 0.7, 0.05); b.add(p2); }
  // Frente Amplio: jornada de 32 horas (la barra de la semana se acorta) · 1,5 millones de viviendas públicas (bloques que suben)
  { const g = base('fa', 3), a = new THREE.Group(), b = new THREE.Group(); g.add(a, b); P.fa = { g, a, b, days: [], blocks: [] };
    for (let i = 0; i < 5; i++) { const d = box(0.2, 0.26, 0.08, nightMat(new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff5a1f, emissiveIntensity: 0.5, roughness: 0.5 })), -0.44 + i * 0.22, -0.02, 0); a.add(d); P.fa.days.push(d); const l = plate('LMXJV'[i], 0.17, 0.17, { bg: 'rgba(0,0,0,0)' }); l.position.set(-0.44 + i * 0.22, -0.02, 0.05); a.add(l); P.fa.days[i].userData.l = l; }
    P.fa.h40 = plate(['40 HORAS', 'HOY'], 0.9, 0.36, { edge: '#8a93a6' }); P.fa.h40.position.set(0, 0.42, 0.05); a.add(P.fa.h40); P.fa.h32 = plate(['32 HORAS', 'SIN BAJAR EL SUELDO'], 1.15, 0.42, { edge: PARTY.fa.css, ink: PARTY.fa.ink }); P.fa.h32.position.set(0, 0.62, 0.05); a.add(P.fa.h32);
    b.add(box(1.15, 0.03, 0.5, stdM(0x1a2230, 0.5), 0, -0.2, 0)); for (let i = 0; i < 5; i++) { const bl = miniBlock(4 + (i * 3) % 4, [0xdfe3ea, 0xe9dcc4, 0xcfd8e6][i % 3], 1.0); bl.position.set(-0.46 + i * 0.23, -0.185, (i % 2) * 0.1 - 0.05); b.add(bl); P.fa.blocks.push(bl); }
    const p2 = plate(['1.500.000', 'VIVIENDAS PÚBLICAS · 12 AÑOS'], 1.2, 0.42, { edge: PARTY.fa.css, ink: PARTY.fa.ink }); p2.position.set(0, 0.66, 0.05); b.add(p2); }
  // la intriga: una nómina con el IRPF a cero y los signos de interrogación sobre los cuatro
  { const g = new THREE.Group(); g.position.set(0, 3.55, 1.6); G.add(g); P.pay = { g };
    P.pay.cv = cnv(768, 1024); P.pay.t = new THREE.CanvasTexture(P.pay.cv); P.pay.t.colorSpace = THREE.SRGBColorSpace; P.pay.t.anisotropy = 8;
    P.pay.m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), new THREE.MeshBasicMaterial({ map: P.pay.t, transparent: true, toneMapped: false, depthWrite: false })); P.pay.m.renderOrder = 7; g.add(P.pay.m);
    P.pay.mag = magnifier ? magnifier() : new THREE.Group(); P.pay.mag.scale.setScalar(2.6); g.add(P.pay.mag);
    P.q = {}; ORDER.forEach((id, i) => { const q = plate('?', 0.5, 0.56, { bg: 'rgba(0,0,0,0)', ink: '#ffd66a' }); q.position.set(lectX(i), 2.55, lectZ(i) + 0.1); G.add(q); P.q[id] = q; }); }
  for (const id of ORDER) { P[id].a.visible = P[id].b.visible = false; } return P; }
function drawPay(k0, kAge) { const c = S.P.pay.cv.getContext('2d'), w = 768, h = 1024; c.clearRect(0, 0, w, h); c.fillStyle = '#fbfaf6'; rr(c, 8, 8, w - 16, h - 16, 26); c.fill(); c.fillStyle = '#1a1d22'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = '900 84px Inter'; c.fillText('NÓMINA', 56, 104);
  c.fillStyle = '#6b7280'; c.font = '700 40px Inter'; c.fillText('Primer año de trabajo', 56, 176); c.fillStyle = '#d7dbe2'; c.fillRect(56, 222, w - 112, 5);
  const row = (y, a, b, col = '#1a1d22', big = false) => { c.fillStyle = col; c.font = `${big ? 900 : 700} ${big ? 76 : 50}px Inter`; c.textAlign = 'left'; c.fillText(a, 56, y); c.textAlign = 'right'; c.fillText(b, w - 56, y); };
  row(300, 'Salario bruto', '· · · · ·', '#1a1d22'); row(390, 'Seguridad Social', '− · · ·', '#6b7280');
  c.fillStyle = k0 > 0.5 ? 'rgba(255,214,106,0.5)' : 'rgba(0,0,0,0.05)'; rr(c, 36, 440, w - 72, 130, 22); c.fill(); row(506, 'IRPF', k0 > 0.5 ? '0 €' : '− · · ·', k0 > 0.5 ? '#0a7a3c' : '#1a1d22', true);
  if (kAge > 0.02) { c.globalAlpha = kAge; c.fillStyle = '#10131a'; rr(c, 56, 640, w - 112, 150, 30); c.fill(); c.fillStyle = '#ffd66a'; c.font = '900 92px Inter'; c.textAlign = 'center'; c.fillText('18 – 35 AÑOS', w / 2, 718, w - 170); c.globalAlpha = 1; }
  c.fillStyle = '#9aa0aa'; c.font = '500 22px Inter'; c.textAlign = 'left'; for (let i = 0; i < 5; i++) c.fillText('condiciones · años de tributación · tramo · coste · ley del IRPF · condiciones · años', 56, 850 + i * 30, w - 112);
  S.P.pay.t.needsUpdate = true; }
