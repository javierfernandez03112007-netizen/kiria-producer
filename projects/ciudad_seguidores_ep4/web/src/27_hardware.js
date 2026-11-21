// ---------------------------------------------------------------- LA FERRETERÍA de @iz.her_019 (calle del sur) con servicio de electricista: escaparate con
// herramientas, mostrador, cartel «ELECTRICISTA 24 H», la furgoneta con la luz naranja girando y el armario de la luz de la calle (con chispas al arreglarlo).
const FER = { X: 7.6, Z: 23.5 };
// herramientas sencillas para las estanterías y el panel
function hammer(m) { const g = new THREE.Group(); g.add(box(0.03, 0.3, 0.03, stdM(0xb07a44, 0.6), 0, 0, 0)); g.add(box(0.14, 0.05, 0.05, m, 0, 0.16, 0)); return g; }
function wrench(m) { const g = new THREE.Group(); g.add(box(0.025, 0.26, 0.012, m, 0, 0, 0)); const h = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12, Math.PI * 1.4), m); h.position.y = 0.15; g.add(h); return g; }
function paintCan(col) { const g = new THREE.Group(); ad(g, cyl(0.1, 0.1, 0.2, stdM(0xc9ccd0, 0.35, { metalness: 0.7 }), 18)).position.y = 0.1; ad(g, cyl(0.101, 0.101, 0.11, stdM(col, 0.6), 18)).position.y = 0.1; return g; }
function cableReel(col) { const g = new THREE.Group(); const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.05, 10, 20), stdM(col, 0.5)); g.add(r); for (const s of [-1, 1]) { const d = cyl(0.17, 0.17, 0.015, stdM(0x7a5a3a, 0.7), 20); d.rotation.x = Math.PI / 2; d.position.z = s * 0.055; g.add(d); } return g; }
function vanBody() { const g = new THREE.Group(), wht = paint(0xf2f2ee, 0.35, 0.8), dk = stdM(0x222428, 0.5);
  const body = rboxM(4.6, 1.9, 1.95, 0.18, wht, 3); body.position.set(0, 1.35, 0); g.add(body); const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.75), T.glassDark); ws.position.set(2.31, 1.75, 0); ws.rotation.y = Math.PI / 2; ws.rotation.z = -0.25; g.add(ws);
  for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.6), T.glassDark); sw.position.set(1.7, 1.8, s * 0.985); sw.rotation.y = s > 0 ? 0 : Math.PI; g.add(sw);
    const logo = signPlane(2.2, 0.75, 512, (c, w, h) => { c.fillStyle = '#ff7a1a'; c.fillRect(0, h * 0.72, w, h * 0.12); c.fillStyle = '#1d2a44'; c.font = '900 64px Inter'; c.textBaseline = 'middle'; c.fillText('⚡', 18, h * 0.36); c.font = '900 46px Inter'; c.fillText('ELECTRICISTA', 96, h * 0.3); c.font = '700 30px Inter'; c.fillText('24 H · FERRETERÍA', 98, h * 0.56); }, { r: 0.5 });
    logo.position.set(-0.6, 1.4, s * 0.99); logo.rotation.y = s > 0 ? 0 : Math.PI; g.add(logo); }
  g.add(box(0.2, 0.3, 1.9, dk, 2.35, 0.55, 0)); const hl = nightMat(new THREE.MeshStandardMaterial({ color: 0xfffbe8, emissive: 0xfff0c0, emissiveIntensity: 2.5, roughness: 0.2 }), 'van');
  for (const s of [-1, 1]) { const l = box(0.04, 0.16, 0.36, hl, 2.32, 0.95, s * 0.7); g.add(l); const tl = box(0.04, 0.3, 0.14, nightMat(new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff2020, emissiveIntensity: 1.6, roughness: 0.3 }), 'van'), -2.31, 1.1, s * 0.85); g.add(tl); }
  for (const [x, s] of [[1.5, -1], [1.5, 1], [-1.5, -1], [-1.5, 1]]) { const w = wheel(); w.scale.setScalar(1.15); w.position.set(x, 0.38, s * 0.95); w.rotation.y = s > 0 ? 0 : Math.PI; g.add(w); }
  // la luz naranja del techo (gira)
  const bc = new THREE.Group(); bc.position.set(1.0, 2.36, 0); g.add(bc); ad(bc, box(0.9, 0.1, 0.3, dk, 0, 0, 0)); g.userData.beacons = [];
  for (const s of [-1, 1]) { const bm = new THREE.MeshStandardMaterial({ color: 0x6a3200, emissive: 0xff8a10, emissiveIntensity: 0.5, roughness: 0.3, transparent: true, opacity: 0.9 }); const b = cyl(0.09, 0.1, 0.16, bm, 14); b.position.set(s * 0.32, 0.12, 0); bc.add(b);
    const gs = glowSprite(0xffa030, 1.2, 0.0); gs.position.set(s * 0.32, 0.14, 0); bc.add(gs); g.userData.beacons.push({ m: bm, s: gs, ph: s > 0 ? 0 : Math.PI }); }
  shadowAll(g, true, true); return g; }
// armario eléctrico de la calle (gris, con su rayo) y puerta que se abre
function powerCabinet() { const g = new THREE.Group(), m = stdM(0x8c9196, 0.5, { metalness: 0.3 }); g.add(box(1.0, 1.45, 0.42, m, 0, 0.73, 0)); g.add(box(1.06, 0.06, 0.48, m, 0, 1.48, 0));
  const ic = signPlane(0.26, 0.26, 128, (c, w, h) => { c.fillStyle = '#f2c418'; c.beginPath(); c.moveTo(w / 2, 6); c.lineTo(w - 6, h - 8); c.lineTo(6, h - 8); c.closePath(); c.fill(); c.fillStyle = '#111'; c.font = '900 70px Inter'; c.textAlign = 'center'; c.fillText('⚡', w / 2, h * 0.82); }, { r: 0.5 });
  const door = new THREE.Group(); door.position.set(-0.5, 0, 0.215); g.add(door); door.add(box(0.98, 1.4, 0.03, m, 0.49, 0.73, 0)); ic.position.set(0.49, 1.0, 0.02); door.add(ic); g.userData.door = door;
  // dentro: fusibles y cables (se ven al abrir)
  g.add(box(0.85, 1.2, 0.02, stdM(0x2a2d31, 0.6), 0, 0.75, 0.15)); for (let i = 0; i < 6; i++) g.add(box(0.1, 0.18, 0.05, stdM([0x1d1d1d, 0xb03020, 0x2050a0][i % 3], 0.5), -0.3 + i * 0.12, 1.05, 0.18));
  for (let i = 0; i < 3; i++) g.add(box(0.7, 0.03, 0.03, stdM([0xd8a020, 0x2050a0, 0x8a3a20][i], 0.5), 0, 0.55 + i * 0.12, 0.18));
  shadowAll(g, true, true); return g; }
function buildHardware(G) {
  const [sc, sh] = stuccoCanvases([214, 222, 206], 61), wall = texMat(sc, sh, [3, 3], { r: 0.85, ns: 0.4 });
  const g = shopFrame(G, 0, { seed: 6, wall, floor: stdM(0x8d8a84, 0.75), inWall: stdM(0xe4e2dc, 0.9), fascia: stdM(0x1d2a44, 0.5), frame: stdM(0x1d2a44, 0.5), pil: stdM(0x55606e, 0.6), signGlow: 1.3,
    sign: (c, w, h) => { c.fillStyle = '#1d2a44'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff7a1a'; c.fillRect(0, h - 14, w, 14); c.fillStyle = '#f4f1e8'; c.font = '900 60px Inter'; c.textBaseline = 'middle'; c.fillText('FERRETERÍA', 40, h / 2 - 8);
      c.font = '700 28px Inter'; c.fillStyle = '#ffb36a'; c.fillText('de @iz.her_019', 44, h / 2 + 30); c.textAlign = 'right'; c.font = '900 40px Inter'; c.fillStyle = '#f2c418'; c.fillText('⚡ ELECTRICISTA 24 H', w - 36, h / 2 + 4); } });
  g.position.set(FER.X, 0, FER.Z); g.rotation.y = Math.PI; g.updateMatrixWorld(true); S.hardware = g; const U = g.userData;
  // la tienda va en la zona del apagón: sus lámparas y el cartel se apagan
  const lampZ = nightMat(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2dc, emissiveIntensity: 3.2, roughness: 0.3 }), 'sur'); for (const l of U.lamps) l.material = lampZ;
  g.traverse(o => { if (o.isMesh && o.material && o.material.map && o.material.emissive && o.position.y > 3) nightMat(o.material, 'sur'); });
  // estanterías al fondo y a los lados: botes de pintura, cajas de tornillos, rollos de cable; panel de herramientas
  const wood = stdM(0x9a7448, 0.7), steel = stdM(0xb8bec6, 0.3, { metalness: 0.8 }), R = rng(77);
  for (const [x, z, w, ry] of [[0, -6.75, 7.2, 0], [-3.7, -3.6, 5.6, Math.PI / 2]]) { const sh = new THREE.Group(); sh.position.set(x, 0, z); sh.rotation.y = ry; g.add(sh);
    for (let l = 0; l < 5; l++) { sh.add(box(w, 0.04, 0.45, wood, 0, 0.25 + l * 0.55, 0)); for (let i = 0; i < Math.floor(w / 0.34); i++) { const x2 = -w / 2 + 0.2 + i * 0.34, t = R();
      if (l === 0) { const pc = paintCan([0xd83a2a, 0x2a6ad8, 0xf2c418, 0x2e9a4a, 0xf2f2ee][i % 5]); pc.position.set(x2, 0.27, 0); sh.add(pc); }
      else if (t < 0.45) sh.add(box(0.26, 0.16 + R() * 0.12, 0.3, stdM([0xc84a2a, 0x2a4a8a, 0xe8d8b0, 0x3a7a4a][Math.floor(R() * 4)], 0.7), x2, 0.36 + l * 0.55, 0));
      else if (t < 0.7) { const cr = cableReel([0xd83a2a, 0x2a2a2a, 0x2a6ad8, 0xf2c418][i % 4]); cr.position.set(x2, 0.45 + l * 0.55, 0); sh.add(cr); } } }
    for (const s of [-1, 1]) sh.add(box(0.05, 2.8, 0.47, wood, s * w / 2, 1.4, 0)); }
  const board = box(3.2, 1.5, 0.05, stdM(0xc9a878, 0.8), 2.0, 2.0, -6.5); g.add(board);
  for (let i = 0; i < 12; i++) { const t = i % 2 ? hammer(steel) : wrench(steel); t.position.set(0.7 + (i % 6) * 0.5, 2.4 - Math.floor(i / 6) * 0.6, -6.45); g.add(t); }
  // mostrador con la caja y escaleras de mano apoyadas
  g.add(box(2.6, 1.0, 0.7, stdM(0x1d2a44, 0.5), 1.2, 0.5, -4.2)); g.add(box(2.7, 0.05, 0.8, stdM(0xd8d2c4, 0.4), 1.2, 1.02, -4.2)); g.add(box(0.35, 0.25, 0.3, stdM(0x2a2a2a, 0.4), 0.6, 1.17, -4.2));
  for (const x of [3.2, 3.55]) { const lad = new THREE.Group(); lad.position.set(x, 0, -1.2); lad.rotation.x = -0.12; g.add(lad); for (const s of [-1, 1]) lad.add(box(0.05, 2.6, 0.05, stdM(0xc9ccd0, 0.3, { metalness: 0.7 }), s * 0.2, 1.3, 0)); for (let i = 0; i < 8; i++) lad.add(box(0.4, 0.03, 0.04, stdM(0xc9ccd0, 0.3, { metalness: 0.7 }), 0, 0.25 + i * 0.3, 0)); }
  // en el escaparate: una carretilla, una caja de herramientas roja y bombillas colgadas (encendidas)
  g.add(box(0.6, 0.35, 0.3, stdM(0xc82020, 0.4), -2.0, 0.65, -0.6)); g.add(box(0.62, 0.06, 0.32, stdM(0x2a2a2a, 0.4), -2.0, 0.85, -0.6)); g.add(box(1.4, 0.45, 0.6, wood, -2.0, 0.22, -0.6));
  U.bulbs = []; const bm = nightMat(new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xffd68a, emissiveIntensity: 5, roughness: 0.3 }), 'sur');
  for (let i = 0; i < 5; i++) { const x = -3.0 + i * 0.5, b = sph(0.05, bm, 10, 8); b.position.set(x, 2.55 - (i % 2) * 0.25, -0.35); g.add(b); g.add(box(0.008, 0.8, 0.008, stdM(0x111111, 0.5), x, 3.0 - (i % 2) * 0.12, -0.35)); }
  shadowAll(g, true, true);
  // luz de dentro (zona del apagón)
  nightSrc(U.local(0, 3.0, -2.5), 0xfff0dc, 26, 4.4, 'sur'); nightSrc(U.local(-1.5, 1.2, 1.0), 0xffe6c0, 9, 2.6, 'sur');
  // la furgoneta del electricista en la acera, el armario de la luz y su cono de trabajo
  const van = vanBody(); van.position.set(FER.X - 5.4, 0.0, 21.05); van.rotation.y = Math.PI; G.add(van); S.van = van;
  const cab = powerCabinet(); cab.position.set(FER.X + 4.6, 0.14, 23.0); cab.rotation.y = Math.PI; G.add(cab); S.cabinet = cab;
  for (const dx of [-0.9, 0.9]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 14), stdM(0xff6a10, 0.5)); c.position.set(FER.X + 4.6 + dx, 0.39, 22.3); G.add(c); }
  S.cabSparks = sparks(G, 70, 0xbfe4ff, 0.03);
  return g; }
