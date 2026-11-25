// ---------------------------------------------------------------- 29N · EL PLATÓ del debate a cuatro: tarima redonda, cuatro atriles con las siglas y el color de cada
// partido (sin logotipos) y, detrás de cada uno, la pantalla con la foto real de su candidato; pantalla gigante curva (el hemiciclo, la cita del jueves, «mañana, capítulo 1»), focos con haz, cámaras de estudio,
// atriles en penumbra (hay más partidos) y la urna de metacrilato del principio y del final.
const SET = { X: [-1.65, -0.55, 0.55, 1.65], Z: 0, URN: [0, 0, 7.0], WALL_Z: -5.2, WALL_R: 9.5 };
const lectX = i => SET.X[i], lectZ = i => SET.Z + 0.12 * Math.abs(SET.X[i]), lectRy = i => -SET.X[i] * 0.06;
// atril: peana, columna, frente con el apellido y las siglas (panel de luz) y tablero (encima aparecen las medidas)
function lectern(id) { const P = PARTY[id], g = new THREE.Group(), dark = new THREE.MeshPhysicalMaterial({ color: 0x0c0e13, roughness: 0.25, metalness: 0.4, clearcoat: 0.8 }), U = g.userData;
  g.add(box(0.62, 0.04, 0.46, dark, 0, 0.02, 0)); g.add(box(0.5, 1.04, 0.07, dark, 0, 0.56, 0.12));
  const t = signTex(512, 832, (c, W, H) => { c.fillStyle = '#07090d'; c.fillRect(0, 0, W, H); c.fillStyle = P.css; c.fillRect(0, 0, W, 150); c.fillRect(0, H - 40, W, 40);
    c.fillStyle = P.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 84px Inter'; c.fillText(P.short.toUpperCase(), W / 2, 80, W - 40);
    c.fillStyle = '#f4f6fa'; const two = P.sig.includes(' '); c.font = `900 ${two ? 100 : 200}px Inter`;
    if (two) { const [a, b] = P.sig.split(' '); c.fillText(a, W / 2, H * 0.42); c.fillText(b, W / 2, H * 0.57); } else c.fillText(P.sig, W / 2, H * 0.5, W - 50); });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.75), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color().setScalar(1.05) })); front.position.set(0, 0.685, 0.158); g.add(front); U.front = front;
  const strip = nightMat(new THREE.MeshStandardMaterial({ color: 0x050505, emissive: P.col, emissiveIntensity: 3.0, roughness: 0.4 })); for (const s of [-1, 1]) g.add(box(0.02, 1.0, 0.02, strip, s * 0.262, 0.56, 0.15)); U.strip = strip;
  const top = box(0.66, 0.035, 0.46, dark, 0, 1.12, 0.0); top.rotation.x = 0.2; g.add(top);
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
  U.acF = ac.clone(); U.acB = ac.clone();          // delante (+z) y detrás (−z): la cámara las atraviesa
  for (const [w, h, d, x, y, z, m] of [[W, Hh, 0.006, 0, Hh / 2, D / 2, U.acF], [W, Hh, 0.006, 0, Hh / 2, -D / 2, U.acB], [0.006, Hh, D, W / 2, Hh / 2, 0, ac], [0.006, Hh, D, -W / 2, Hh / 2, 0, ac]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); p.position.set(x, y, z); p.renderOrder = 3; g.add(p); }
  const edge = new THREE.MeshStandardMaterial({ color: 0xdfeaf6, roughness: 0.2, transparent: true, opacity: 0.55 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.012, Hh, 0.012, edge, sx * W / 2, Hh / 2, sz * D / 2));
  const lidM = new THREE.MeshPhysicalMaterial({ color: 0xeaf4ff, roughness: 0.05, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false }); for (const s of [-1, 1]) g.add(box(W + 0.03, 0.02, (D + 0.03) / 2 - 0.012, lidM, 0, Hh + 0.01, s * ((D + 0.03) / 4 + 0.006))); for (const s of [-1, 1]) g.add(box((W + 0.03 - 0.2) / 2, 0.02, 0.024, lidM, s * ((W + 0.03) / 2 - (W + 0.03 - 0.2) / 4), Hh + 0.01, 0));
  g.add(box(W + 0.03, 0.012, D + 0.03, new THREE.MeshPhysicalMaterial({ color: 0xdfe6ee, roughness: 0.3, clearcoat: 0.6 }), 0, 0.006, 0)); for (const s of [-1, 1]) g.add(box(0.2, 0.004, 0.004, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 }), 0, Hh + 0.021, s * 0.013));
  const lab = signPlane(0.3, 0.085, 512, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1d22'; c.font = '900 46px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CONGRESO DE LOS DIPUTADOS', w / 2, h / 2 + 2, w - 24); }, { r: 0.6 }); lab.position.set(0, Hh * 0.2, D / 2 + 0.005); g.add(lab);
  U.pile = []; const R = rng(29); for (let i = 0; i < 22; i++) { const e = envelope(); e.position.set((R() - 0.5) * 0.24, 0.02 + i * 0.0036 + R() * 0.012, -0.03 + (R() - 0.5) * 0.24); e.rotation.set(-Math.PI / 2 + (R() - 0.5) * 0.5, (R() - 0.5) * 0.4, R() * 6.28); g.add(e); U.pile.push(e); }
  U.size = [W, Hh, D]; return g; }
// sobre de votación (blanco, con el rótulo del Congreso)
let _envT = null;
function envelope() { if (!_envT) _envT = signTex(512, 256, (c, w, h) => { c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,0,0,0.10)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(w / 2, h * 0.52); c.lineTo(w, 0); c.stroke(); c.strokeRect(2, 2, w - 4, h - 4);
    c.fillStyle = '#2a2d33'; c.font = '700 26px Inter'; c.textAlign = 'center'; c.fillText('ELECCIONES A CORTES GENERALES', w / 2, h * 0.7); c.font = '900 36px Inter'; c.fillText('DIPUTADOS', w / 2, h * 0.87); });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.176, 0.12, 0.0016), [0, 1, 2, 3, 4, 5].map(i => new THREE.MeshStandardMaterial({ color: 0xfbfaf6, map: i === 4 ? _envT : null, roughness: 0.85 }))); m.castShadow = true; m.receiveShadow = true; return m; }
// ---- la pantalla gigante (lienzo que se repinta): hemiciclo, cita del debate, «mañana, capítulo 1»
const WALL = { W: 2048, H: 1024, key: '' };
const PILLX = 80;                                     // el rótulo, algo a la derecha: encima del libro del gancho
function hemiSeats() { const out = [], rows = 10, cx = WALL.W / 2, cy = WALL.H * 0.54, n0 = 22; let tot = 0; const per = []; for (let r = 0; r < rows; r++) { per.push(n0 + r * 3); tot += n0 + r * 3; }
  let extra = 350 - tot; for (let r = rows - 1; extra !== 0; r = (r - 1 + rows) % rows) { per[r] += Math.sign(extra); extra -= Math.sign(extra); }
  for (let r = 0; r < rows; r++) for (let i = 0; i < per[r]; i++) { const a = Math.PI * (0.03 + 0.94 * (i + 0.5) / per[r]), R0 = 172 + r * 30.4; out.push([cx - Math.cos(a) * R0, cy - Math.sin(a) * R0, r, a]); }
  out.sort((p, q) => p[3] - q[3] || p[2] - q[2]); return out; }
const wallU = x => WALL.W * (0.5 + Math.asin(clamp(x / SET.WALL_R, -1, 1)) / 1.2);        // x del plató → columna del lienzo
function wallDraw(st) { const key = JSON.stringify(st); if (key === WALL.key) return; WALL.key = key; const c = S.wallC.getContext('2d'), W = WALL.W, H = WALL.H; c.globalAlpha = 1;
  const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#081028'); gr.addColorStop(0.55, '#0a1634'); gr.addColorStop(1, '#050814'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  c.globalAlpha = 0.06; c.strokeStyle = '#9fc0ff'; c.lineWidth = 2; for (let i = -6; i < 30; i++) { c.beginPath(); c.moveTo(i * 110, 0); c.lineTo(i * 110 + 520, H); c.stroke(); } c.globalAlpha = 1;
  // la banda de luz de cada partido, detrás de su atril
  ORDER.forEach((id, i) => { const k = st.band[i]; if (k <= 0.01) return; const x = wallU(lectX(i) * 1.22), w = 150, g2 = c.createLinearGradient(x - w, 0, x + w, 0); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(0.32, PARTY[id].css); g2.addColorStop(0.68, PARTY[id].css); g2.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = Math.min(1, k) * 0.9; c.fillStyle = g2; c.fillRect(x - w, 0, 2 * w, H); c.globalAlpha = 1; });
  c.textAlign = 'center'; c.textBaseline = 'middle';
  // un rótulo ancho (la cuenta de páginas y el resultado)
  if (st.pillA > 0 && st.pill) { c.globalAlpha = st.pillA; c.fillStyle = st.pillC || '#eef2fc'; c.font = '900 54px Inter'; const tw = Math.min(760, c.measureText(st.pill).width + 100); rr(c, W / 2 - tw / 2 + PILLX, 152, tw, 92, 46); c.fill(); c.fillStyle = '#12100a'; fitFont(c, st.pill, 900, 54, 660); c.fillText(st.pill, W / 2 + PILLX, 200); c.globalAlpha = 1; }
  const panel = (y0, y1, a) => { c.globalAlpha = a * 0.72; c.fillStyle = '#060b1c'; rr(c, W / 2 - 590, y0, 1180, y1 - y0, 46); c.fill(); c.globalAlpha = a; };
  if (st.next > 0) { panel(H * 0.19, H * 0.58, st.next); c.fillStyle = '#ffd66a'; c.font = '900 92px Inter'; c.fillText('PRÓXIMO CAPÍTULO', W / 2, H * 0.3, 1080); c.fillStyle = '#ffffff'; c.font = '900 176px Inter'; c.fillText(PARTY[CH.next].sig, W / 2, H * 0.46, 1080); c.globalAlpha = 1; }
  S.wallT.needsUpdate = true; }
function buildSet(G) { const dark = new THREE.MeshBasicMaterial({ color: 0x2f2e2e, transparent: true, opacity: 0.84 });      // suelo y tarima sin reflejos calculados: mismo gris que daba el barniz y un 25 % menos de tiempo por fotograma
  const mirror = new THREE.Group(); mirror.scale.y = -1; G.add(mirror); S.mirror = mirror;                         // reflejo barato: lo que brilla, repetido bajo el suelo semitransparente
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), dark); floor.rotation.x = -Math.PI / 2; floor.position.y = 0; floor.receiveShadow = true; floor.renderOrder = 1; G.add(floor);
  const under = new THREE.Mesh(new THREE.CircleGeometry(60, 32), new THREE.MeshBasicMaterial({ color: 0x010203 })); under.rotation.x = -Math.PI / 2; under.position.y = -9; G.add(under);
  // tarima con aro de luz
  const ringM = nightMat(new THREE.MeshStandardMaterial({ color: 0x0a0c10, emissive: 0xbcd4ff, emissiveIntensity: 2.2, roughness: 0.4 }));
  for (const par of [G, mirror]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.035, 8, 96), ringM); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.17, 0.4); par.add(ring); }
  const riser = cyl(5.6, 5.6, 0.16, new THREE.MeshBasicMaterial({ color: 0x2f2e2e }), 72); riser.position.set(0, 0.08, 0.4); riser.castShadow = false; G.add(riser); S.FL = 0.16;
  // pantalla gigante curva
  S.wallC = cnv(WALL.W, WALL.H); S.wallT = new THREE.CanvasTexture(S.wallC); S.wallT.colorSpace = THREE.SRGBColorSpace; S.wallT.anisotropy = 8; S.wallT.wrapS = THREE.RepeatWrapping; S.wallT.repeat.x = -1; S.wallT.offset.x = 1; S.seats = hemiSeats();
  S.wallM = new THREE.MeshBasicMaterial({ map: S.wallT, color: new THREE.Color().setScalar(1.25), side: THREE.BackSide });          // sin luces ni reflejos: emite y ya (más rápido de pintar)
  const wg = new THREE.CylinderGeometry(SET.WALL_R, SET.WALL_R, 5.4, 72, 1, true, Math.PI - 0.6, 1.2);
  for (const par of [G, mirror]) { const wall = new THREE.Mesh(wg, S.wallM); wall.position.set(0, 3.5, SET.WALL_Z + SET.WALL_R); par.add(wall); }
  const frameM = stdM(0x0b0d12, 0.4, { metalness: 0.5 }); for (const y of [0.74, 6.26]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(SET.WALL_R - 0.02, SET.WALL_R - 0.02, 0.12, 72, 1, true, Math.PI - 0.62, 1.24), new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.4, side: THREE.DoubleSide })); f.position.set(0, y, SET.WALL_Z + SET.WALL_R); G.add(f); }
  // paneles laterales oscuros con tiras de luz (cierran el plató)
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const a = s * (0.72 + i * 0.2), p = box(1.5, 7, 0.12, frameM, Math.sin(a) * 10.5, 3.5, SET.WALL_Z + SET.WALL_R - Math.cos(a) * 10.5); p.rotation.y = a; G.add(p);
    const st = box(0.05, 6.2, 0.02, nightMat(new THREE.MeshStandardMaterial({ color: 0x05070a, emissive: 0x4f7dff, emissiveIntensity: 1.5 })), Math.sin(a) * 10.4, 3.4, SET.WALL_Z + SET.WALL_R - Math.cos(a) * 10.4); st.rotation.y = a; G.add(st); }
  // atriles y columnas de luz del color de cada partido
  S.lect = {}; S.tot = {}; ORDER.forEach((id, i) => { const l = lectern(id); l.position.set(lectX(i), S.FL, lectZ(i)); l.rotation.y = lectRy(i); G.add(l); S.lect[id] = l;
    const t = totem(id); t.g.position.set(0, TOTEM.Y, TOTEM.Z); l.add(t.g); S.tot[id] = t;
    const h = new THREE.Group(); h.position.copy(l.position); h.rotation.copy(l.rotation); h.add(t.g.clone()); mirror.add(h);                 // su reflejo en el suelo
    nightSrc(_v(lectX(i) * 1.1, 2.6, -3.4), PARTY[id].col, 10, 3.4, 'col_' + id); });
  // otros atriles, en penumbra (hay más partidos)
  S.dims = []; for (const [x, z, ry] of [[-3.35, 0.75, 0.3], [-4.5, 1.6, 0.5], [-5.15, 2.3, 0.7], [3.35, 0.75, -0.3], [4.5, 1.6, -0.5], [5.15, 2.3, -0.7]]) { const d = dimLectern(); d.position.set(x, S.FL, z); d.rotation.y = ry; G.add(d);
    const t = dimTotem(); t.g.position.set(0, TOTEM.Y, TOTEM.Z); d.add(t.g); d.userData.tm = t.mat; S.dims.push(d); }
  // parrilla de focos con haces
  const truss = stdM(0x14161b, 0.5, { metalness: 0.5 }); for (const z of [1.2, 3.6]) { G.add(box(13, 0.1, 0.1, truss, 0, 7.4, z)); G.add(box(13, 0.1, 0.1, truss, 0, 7.75, z)); for (let x = -6.5; x <= 6.5; x += 0.65) { const d = box(0.04, 0.42, 0.04, truss, x, 7.57, z); d.rotation.z = (Math.round(x / 0.65) % 2 ? 1 : -1) * 0.55; G.add(d); } }
  S.spots = {}; ORDER.forEach((id, i) => { const head = new THREE.Group(); head.position.set(lectX(i) * 0.9, 7.25, 3.6); G.add(head); const tgt = _v(lectX(i), 1.45, lectZ(i)); head.lookAt(tgt); head.add(box(0.3, 0.3, 0.42, truss, 0, 0, 0));
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), nightMat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4e0).multiplyScalar(2.6), toneMapped: false }))); lens.position.z = 0.22; head.add(lens);
    const cone = lightCone(1.05, 7.2, 0.05, 0xfff2dc); cone.visible = false;        /* sin haz: dejaba algún píxel defectuoso que el brillo convertía en un disco blanco de un fotograma */ S.spots[id] = { head, cone, src: nightSrc(tgt.clone().add(_v(0, 0.9, 1.3)), 0xfff0dc, 3.4, 2.8, 'spot_' + id) }; });
  // cámaras de estudio en primer término
  S.cams = []; for (const [x, z, ry] of [[-3.9, 7.9, Math.PI + 0.42], [4.2, 8.3, Math.PI - 0.45]]) { const c = studioCam(); c.position.set(x, 0, z); c.rotation.y = ry; G.add(c); S.cams.push(c); }
  // la urna, en su mesa, delante de la tarima
  const tb = new THREE.Group(); tb.position.set(SET.URN[0], 0, SET.URN[2]); G.add(tb); tb.add(box(0.7, 0.04, 0.62, new THREE.MeshPhysicalMaterial({ color: 0x0c0e13, roughness: 0.25, clearcoat: 0.8 }), 0, 0.9, 0)); ad(tb, cyl(0.05, 0.07, 0.88, stdM(0x15171c, 0.4, { metalness: 0.5 }), 14)).position.y = 0.44; ad(tb, cyl(0.26, 0.3, 0.04, stdM(0x15171c, 0.4, { metalness: 0.5 }), 20)).position.y = 0.02; shadowAll(tb, true, true);
  S.urn = ballotBox(); S.urn.position.set(SET.URN[0], 0.92, SET.URN[2]); G.add(S.urn); nightSrc(_v(SET.URN[0], 1.9, SET.URN[2] + 0.3), 0xdfeaff, 9, 1.6, 'urn');
  S.env = envelope(); G.add(S.env);
  wallDraw({ band: [1, 1, 1, 1], pill: '', pillA: 0, next: 0 }); }
// ---------------------------------------------------------------- las medidas: objetos que aparecen SOBRE el atril de cada candidato, delante de la parte baja de su pantalla,
// cuando la voz las nombra (a la izquierda el objeto, a la derecha el rótulo con las palabras de su programa). Mismo sitio y mismo tamaño para los cuatro.
const STAGE = { Y: 1.17 };                             // altura del tablero del atril sobre su suelo
function fitFont(c, s, weight, px, maxW) { c.font = `${weight} ${px}px Inter`; const w = c.measureText(s).width; if (w > maxW) { px = Math.floor(px * maxW / w); c.font = `${weight} ${px}px Inter`; } return px; }
function plate(txt, w, h, o = {}) { const lines = [].concat(txt), px = 1024, t = signTex(px, Math.round(px * h / w), (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = o.bg ?? 'rgba(8,10,16,0.94)'; rr(c, 6, 6, W - 12, H - 12, Math.min(60, H * 0.22)); c.fill(); if (o.edge) { c.strokeStyle = o.edge; c.lineWidth = 12; rr(c, 12, 12, W - 24, H - 24, Math.min(54, H * 0.2)); c.stroke(); }
    c.textAlign = 'center'; c.textBaseline = 'middle'; const n = lines.length, SZ = o.sz ?? (n === 1 ? [0.6] : n === 2 ? [0.5, 0.21] : [0.34, 0.34, 0.17]), YS = o.ys ?? (n === 1 ? [0.54] : n === 2 ? [0.39, 0.77] : [0.25, 0.56, 0.84]), nb = o.nbig ?? (n === 3 ? 2 : 1);
    lines.forEach((s, i) => { c.fillStyle = i < nb ? (o.ink ?? '#ffffff') : (o.ink2 ?? '#c9d5f2'); fitFont(c, s, 900, Math.round(H * SZ[i]), W - 90); c.fillText(s, W / 2, H * YS[i]); }); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, alphaTest: 0.05 })); m.renderOrder = 5; return m; }
function badge(txt, d, bg, ink) { const t = signTex(256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = bg; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 8; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 14, 0, 7); c.stroke(); c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; fitFont(c, txt, 900, 130, w - 70); c.fillText(txt, w / 2, h / 2 + 6); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(d, d), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, alphaTest: 0.05 })); m.renderOrder = 6; return m; }
function miniHouse(col = 0xf2efe8, roof = 0xb8452f, s = 1) { const g = new THREE.Group(); g.add(box(0.2 * s, 0.15 * s, 0.18 * s, stdM(col, 0.7), 0, 0.075 * s, 0)); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.165 * s, 0.11 * s, 4, 1), stdM(roof, 0.7)); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.92); r.position.y = 0.205 * s; g.add(r);
  g.add(box(0.045 * s, 0.075 * s, 0.006 * s, stdM(0x5a3a26, 0.6), 0, 0.038 * s, 0.092 * s)); shadowAll(g, true, true); return g; }
function miniBlock(floors = 6, col = 0xdfe3ea, s = 1) { const g = new THREE.Group(), h = floors * 0.07 * s; g.add(box(0.22 * s, h, 0.16 * s, stdM(col, 0.65), 0, h / 2, 0)); const wm = nightMat(new THREE.MeshStandardMaterial({ color: 0x1a2430, emissive: 0xffd9a0, emissiveIntensity: 1.3, roughness: 0.4 }));
  for (let f = 0; f < floors; f++) for (let i = 0; i < 3; i++) g.add(box(0.036 * s, 0.036 * s, 0.004 * s, wm, (i - 1) * 0.065 * s, (f + 0.55) * 0.07 * s, 0.082 * s)); g.add(box(0.24 * s, 0.012 * s, 0.18 * s, stdM(0x8a8f96, 0.6), 0, h + 0.006 * s, 0)); shadowAll(g, true, true); return g; }
