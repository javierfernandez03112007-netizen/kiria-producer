// ---------------------------------------------------------------- EL CUARTEL de @marcos13_08 (lado oeste de la plaza): muro con portón y rótulo «CUARTEL»,
// garita a rayas con los colores de Kiria World, patio de armas con focos, mástil con la bandera, camión y el edificio de los dormitorios.
// Los soldados forman en el patio mirando al portón (de cara a la cámara que entra) y @marcos13_08 pasa revista.
const BAR = { X: -16, Z0: -14, Z1: 14, BACK: -40 };
// complementos de las personas (gorra militar, casco, chaleco, pajarita…), colgados de la cabeza o del pecho
function capOn(p, col = 0x3d4a2a, officer = false) { const J = p.userData.J, k = p.userData.k, HS = p.userData.HS, HY = 0.11 * k, c = new THREE.Group(); c.position.set(0, HY + HS[1] * 0.62, 0.004); J.head.add(c);
  const crownM = matOf(col, 0.6), top = pm(new THREE.CylinderGeometry(HS[0] * 1.12, HS[0] * 1.02, 0.07 * k, 28), crownM); top.scale.z = HS[2] / HS[0]; top.position.y = 0.03 * k; c.add(top);
  const lid = pm(new THREE.CylinderGeometry(HS[0] * 1.18, HS[0] * 1.18, 0.012 * k, 28), crownM); lid.scale.z = HS[2] / HS[0] * 1.05; lid.position.y = 0.07 * k; c.add(lid);
  const visor = pm(new THREE.CylinderGeometry(0.07 * k, 0.07 * k, 0.008 * k, 20, 1, false, -Math.PI / 2, Math.PI), matOf(0x111111, 0.25)); visor.position.set(0, 0.0, HS[2] * 0.92); visor.rotation.x = 0.18; c.add(visor);
  if (officer) { const band = pm(new THREE.TorusGeometry(HS[0] * 1.03, 0.01 * k, 8, 28), new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 1, roughness: 0.3 })); band.rotation.x = Math.PI / 2; band.scale.y = HS[2] / HS[0]; band.position.y = 0.01 * k; c.add(band);
    const badge = pm(new THREE.SphereGeometry(0.018 * k, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffd36a, metalness: 1, roughness: 0.25 })); badge.position.set(0, 0.04 * k, HS[2] * 1.02); badge.scale.z = 0.4; c.add(badge); }
  return c; }
function medalsOn(p) { const J = p.userData.J, k = p.userData.k, g = new THREE.Group(); g.position.set(-0.06 * k, 0.17 * k, 0.1 * k); J.chest.add(g);
  for (let i = 0; i < 4; i++) { const r = box(0.022 * k, 0.012 * k, 0.006 * k, matOf([0xc8102e, 0x1f5fbf, 0xe8b84a, 0x2e7d32][i], 0.5), (i % 2) * 0.025 * k - 0.012 * k, -Math.floor(i / 2) * 0.016 * k, 0); g.add(r); }
  for (const s of [-1, 1]) { const ep = box(0.07 * k, 0.012 * k, 0.05 * k, new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 1, roughness: 0.3 }), s * 0.13 * k, 0.21 * k, 0); J.chest.add(ep); } return g; }
function hardHat(p, col = 0xf2c418, lamp = false) { const J = p.userData.J, k = p.userData.k, HS = p.userData.HS, HY = 0.11 * k, h = new THREE.Group(); h.position.set(0, HY + HS[1] * 0.38, 0); J.head.add(h);
  const dome = pm(new THREE.SphereGeometry(HS[0] * 1.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), matOf(col, 0.35)); dome.scale.set(1, 0.95, HS[2] / HS[0] * 1.05); h.add(dome);
  const brim = pm(new THREE.CylinderGeometry(HS[0] * 1.36, HS[0] * 1.36, 0.01 * k, 28), matOf(col, 0.35)); brim.scale.z = HS[2] / HS[0] * 1.15; h.add(brim);
  if (lamp) { const lm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d8, emissiveIntensity: 6, roughness: 0.3 }); const l = pm(new THREE.CylinderGeometry(0.018 * k, 0.022 * k, 0.03 * k, 12), lm); l.rotation.x = Math.PI / 2; l.position.set(0, 0.05 * k, HS[2] * 1.12); h.add(l); h.userData.lamp = l; }
  return h; }
function vestOn(p, col = 0xff7a1a) { const J = p.userData.J, k = p.userData.k, v = pm(new THREE.CylinderGeometry(0.152 * k, 0.142 * k, 0.36 * k, 28, 1, true), matOf(col, 0.6, { side: THREE.DoubleSide })); v.scale.z = 0.7; v.position.y = 0.2 * k; J.spine.add(v);
  for (const y of [0.1, 0.26]) { const s = pm(new THREE.CylinderGeometry(0.155 * k, 0.153 * k, 0.025 * k, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xdfe4e8, emissive: 0x9aa4ac, emissiveIntensity: 0.6, roughness: 0.3, side: THREE.DoubleSide })); s.scale.z = 0.71; s.position.y = y * k; J.spine.add(s); } return v; }
function bowTie(p, col = 0x111111) { const J = p.userData.J, k = p.userData.k, g = new THREE.Group(); g.position.set(0, 0.44 * k, 0.07 * k); J.spine.add(g); for (const s of [-1, 1]) { const w = pm(new THREE.ConeGeometry(0.022 * k, 0.04 * k, 8), matOf(col, 0.4)); w.rotation.z = s * Math.PI / 2; w.position.x = s * 0.02 * k; g.add(w); } return g; }
// garita: caseta con tejadillo, a rayas moradas y doradas (los colores de la bandera de Kiria World)
function sentryBox() { const g = new THREE.Group(), t = signTex(256, 512, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#e8b64a' : '#4b2a7a'; c.fillRect(0, i * h / 8, w, h / 8); } });
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }); for (const [x, z, w, d] of [[0, -0.55, 1.2, 0.08], [-0.56, 0, 0.08, 1.1], [0.56, 0, 0.08, 1.1]]) g.add(box(w, 2.3, d, m, x, 1.15, z));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.55, 4), stdM(0x2b2238, 0.6)); roof.rotation.y = Math.PI / 4; roof.position.y = 2.58; g.add(roof); g.add(box(1.3, 0.1, 1.3, stdM(0x2b2238, 0.6), 0, 2.32, 0));
  const lampM = nightMat(new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffc77a, emissiveIntensity: 4, roughness: 0.3 })); ad(g, sph(0.07, lampM, 10, 8)).position.set(0, 2.15, 0.45);
  shadowAll(g, true, true); return g; }
// camión militar: cabina, caja con lona y seis ruedas
function armyTruck() { const g = new THREE.Group(), ol = stdM(0x4a5532, 0.65), dk = stdM(0x2e3420, 0.7), canvas = stdM(0x5c6640, 0.95);
  g.add(box(2.3, 1.15, 1.9, ol, 2.3, 1.3, 0)); g.add(box(2.3, 0.08, 1.95, dk, 2.3, 1.9, 0)); const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.6), T.glassDark); ws.position.set(3.46, 1.55, 0); ws.rotation.y = Math.PI / 2; g.add(ws);
  g.add(box(4.2, 0.25, 2.1, dk, -0.9, 0.85, 0)); for (const s of [-1, 1]) g.add(box(4.2, 0.55, 0.06, ol, -0.9, 1.25, s * 1.02));
  const tarp = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 4.2, 24, 1, false, 0, Math.PI), canvas); tarp.rotation.z = Math.PI / 2; tarp.rotation.x = Math.PI / 2; tarp.position.set(-0.9, 1.5, 0); tarp.rotation.set(0, 0, Math.PI / 2); tarp.scale.set(1, 1, 0.98); g.add(tarp);
  const hl = nightMat(new THREE.MeshStandardMaterial({ color: 0xfffbe8, emissive: 0xfff0c0, emissiveIntensity: 2.5, roughness: 0.2 })); for (const s of [-1, 1]) ad(g, cyl(0.12, 0.12, 0.06, hl, 16)).position.set(3.47, 1.05, s * 0.7), g.children[g.children.length - 1].rotation.z = Math.PI / 2;
  for (const x of [2.6, -0.4, -2.0]) for (const s of [-1, 1]) { const w = wheel(); w.scale.setScalar(1.45); w.position.set(x, 0.5, s * 0.95); w.rotation.y = s > 0 ? 0 : Math.PI; g.add(w); }
  shadowAll(g, true, true); return g; }
function buildBarracks(G, wallM) {
  const g = new THREE.Group(); G.add(g); const U = g.userData; S.barracks = g; const X = BAR.X, Z0 = BAR.Z0, Z1 = BAR.Z1, GW = 3.0, HW = 3.0;
  const plinth = stdM(0x6a6258, 0.85), cope = stdM(0xd9d2c2, 0.6), conc = stdM(0x8e8a82, 0.92);
  // suelo del patio (hormigón) con las rayas de formar
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(X - BAR.BACK, Z1 - Z0), conc); yard.rotation.x = -Math.PI / 2; yard.position.set((X + BAR.BACK) / 2, 0.02, 0); yard.receiveShadow = true; g.add(yard);
  for (let i = 0; i < 4; i++) g.add(plane(0.08, 9.5, T.mark, -21.4 - i * 1.2, 0.03, 0, null));
  // muro de fachada con el hueco del portón, zócalo y albardilla; muros laterales
  for (const [za, zb] of [[Z0, -GW - 0.5], [GW + 0.5, Z1]]) { const w = zb - za; g.add(box(0.5, HW, w, wallM, X, HW / 2, (za + zb) / 2)); g.add(box(0.56, 0.5, w, plinth, X, 0.25, (za + zb) / 2)); g.add(box(0.66, 0.14, w + 0.1, cope, X, HW + 0.07, (za + zb) / 2)); }
  for (const z of [Z0, Z1]) { g.add(box(X - BAR.BACK, HW, 0.5, wallM, (X + BAR.BACK) / 2, HW / 2, z)); g.add(box(X - BAR.BACK, 0.14, 0.62, cope, (X + BAR.BACK) / 2, HW + 0.07, z)); }
  // portón: pilares, dintel con el rótulo y el escudo; hojas de reja abiertas hacia dentro
  for (const s of [-1, 1]) { g.add(box(0.9, 4.6, 0.9, cope, X, 2.3, s * (GW + 0.05))); ad(g, sph(0.32, cope, 16, 12)).position.set(X, 4.95, s * (GW + 0.05)); }
  g.add(box(0.7, 0.8, 2 * GW + 1.0, cope, X, 4.3, 0));
  const sign = signPlane(5.4, 0.62, 1024, (c, w, h) => { c.fillStyle = '#2b2238'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8b64a'; c.font = '900 92px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '26px'; c.fillText('CUARTEL', w / 2, h / 2 + 4); }, { r: 0.5, glow: 0.9 });
  sign.position.set(X + 0.36, 4.3, 0); sign.rotation.y = Math.PI / 2; g.add(sign); nightMat(sign.material);
  const crest = signPlane(1.3, 0.9, 512, (c, w, h) => { c.clearRect(0, 0, w, h); KW_FLAG(c, w, h); }, { r: 0.5 }); crest.position.set(X + 0.36, 5.25, 0); crest.rotation.y = Math.PI / 2; g.add(crest);
  for (const s of [-1, 1]) { const leaf = new THREE.Group(); leaf.position.set(X, 0, s * GW); leaf.rotation.y = s * 1.25; g.add(leaf); for (let i = 0; i <= 12; i++) leaf.add(box(0.04, 2.6, 0.04, T.iron, -0.02, 1.3, -s * i * 0.24)); for (const y of [0.25, 1.35, 2.5]) leaf.add(box(0.05, 0.06, GW, T.iron, -0.02, y, -s * GW / 2));
    for (let i = 0; i <= 12; i += 2) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 6), T.iron); sp.position.set(-0.02, 2.68, -s * i * 0.24); leaf.add(sp); } }
  // garita con su luz
  const sb = sentryBox(); sb.position.set(X + 1.1, 0, GW + 1.6); sb.rotation.y = Math.PI / 2; g.add(sb); nightSrc(_v(X + 1.6, 2.3, GW + 1.6), 0xffc58a, 14, 2.6);
  // farolas de pared junto al portón
  for (const s of [-1, 1]) { const p = _v(X + 0.55, 3.4, s * (GW + 0.05)); ad(g, sph(0.12, lampMat('city'), 12, 10)).position.copy(p); nightGlow(g, p, 0xffcf8a, 0.9, 0.7); nightSrc(p, 0xffc58a, 22, 3.6); }
  // edificio de dormitorios al fondo: dos plantas, ventanas con contraventanas verdes (muchas encendidas), tejado a cuatro aguas
  { const bw = Z1 - Z0 - 4, bx = BAR.BACK + 3.2, H = 7.0; g.add(box(6, H, bw, wallM, bx, H / 2, 0));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 4.6, 2.2, 4, 1), stdM(0x8e3b2a, 0.8)); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, bw / 6.6); roof.position.set(bx, H + 1.1, 0); g.add(roof);
    const shut = stdM(0x2f5a3a, 0.6); for (let f = 0; f < 2; f++) for (let i = 0; i < 9; i++) { const z = -bw / 2 + (i + 0.5) * bw / 9, y = 1.6 + f * 3.2; const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), T.glassDark); gl.position.set(bx + 3.02, y, z); gl.rotation.y = Math.PI / 2; g.add(gl);
      for (const s of [-1, 1]) { const sh = box(0.06, 1.5, 0.5, shut, bx + 3.06, y, z + s * 0.78); g.add(sh); } g.add(box(0.3, 0.08, 1.3, cope, bx + 3.1, y - 0.8, z)); }
    const door = box(0.1, 2.5, 1.8, stdM(0x3a2a1c, 0.6), bx + 3.02, 1.25, 0); g.add(door); const dl = _v(bx + 3.3, 2.9, 0); ad(g, sph(0.12, lampMat('city'), 12, 10)).position.copy(dl); nightGlow(g, dl, 0xffcf8a, 0.8, 0.7); nightSrc(dl, 0xffc58a, 16, 3.2); }
  lightWindows(g, 0.6, 901);
  // mástil con la bandera de Kiria World
  ad(g, cyl(0.07, 0.09, 11, stdM(0xd8dbe0, 0.3, { metalness: 0.8 }), 12)).position.set(-31, 5.5, 0); ad(g, sph(0.14, T.gold, 12, 10)).position.set(-31, 11.05, 0);
  U.flag = flagMesh(2.6, 1.7, (c, w, h) => KW_FLAG(c, w, h)); U.flag.position.set(-31, 9.9, 0.07); U.flag.rotation.y = Math.PI / 2 * 0; g.add(U.flag);
  // focos del patio: postes altos con su haz de luz y luz barata fuerte
  U.floods = []; for (const [x, z] of [[-18.5, -11.5], [-18.5, 11.5], [-29, -11.5], [-29, 11.5]]) { const pole = cyl(0.09, 0.12, 8, stdM(0x5a5e64, 0.4, { metalness: 0.6 }), 10); pole.position.set(x, 4, z); g.add(pole);
    const head = new THREE.Group(); head.position.set(x, 8.1, z); g.add(head); const tgt = _v(-23.5, 0, 0); head.lookAt(tgt); head.add(box(0.7, 0.45, 0.3, stdM(0x30343a, 0.5), 0, 0, 0)); const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.36), nightMat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6e0).multiplyScalar(3), toneMapped: false }))); lens.position.z = 0.16; head.add(lens);
    const cone = lightCone(2.4, 9.5, 0.045, 0xfff0d6); const mid = head.position.clone().lerp(tgt, 0.5); cone.position.copy(head.position); cone.lookAt(tgt); cone.rotateX(-Math.PI / 2); g.add(cone);
    nightGlow(g, head.position.clone().add(tgt.clone().sub(head.position).normalize().multiplyScalar(0.3)), 0xfff2d8, 2.2, 0.8);
    nightSrc(head.position.clone().lerp(tgt, 0.55), 0xfff0d8, 26, 7.5); U.floods.push(head); }
  // camión aparcado junto al muro norte
  const tr = armyTruck(); tr.position.set(-30.5, 0, -9.6); tr.rotation.y = Math.PI; g.add(tr);
  shadowAll(g, true, true);
  // dónde forman: tres filas de seis mirando al portón (este); el que pasa revista va por delante
  U.rows = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) U.rows.push([-22.2 - r * 1.25, -3.1 + c * 1.24, r, c]);
  return g; }
