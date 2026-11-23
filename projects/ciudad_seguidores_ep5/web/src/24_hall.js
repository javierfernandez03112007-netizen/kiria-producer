// ---------------------------------------------------------------- EL AYUNTAMIENTO: fachada clásica con pórtico de columnas, escalinata, puerta abierta y banderas de Kiria World;
// dentro, el salón del trono: suelo de mármol, alfombra roja, columnas, ventanas altas con haces de sol, lámparas de araña, el estandarte, el trono
// sobre su tarima, la mesita con el pergamino de la ley y el sello de oro, dos guardias y los vecinos que miran.
const HALL = { X0: -13, X1: 13, ZF: -16, ZB: -34, H: 12, FL: 0.6 };
function wallWithHoles(w, h, holes, depth, mat) { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, h); s.lineTo(0, h); s.lineTo(0, 0);
  for (const [x, y, hw, hh, arch] of holes) { const p = new THREE.Path(); p.moveTo(x - hw, y); p.lineTo(x + hw, y); p.lineTo(x + hw, y + hh - (arch ? hw : 0)); if (arch) p.absarc(x, y + hh - hw, hw, 0, Math.PI, false); else p.lineTo(x - hw, y + hh); p.lineTo(x - hw, y); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 16 }); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m; }
function winGlass(hw, hh, arch, mat) { const s = new THREE.Shape(); s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, hh - (arch ? hw : 0)); if (arch) s.absarc(0, hh - hw, hw, 0, Math.PI, false); else s.lineTo(-hw, hh); s.lineTo(-hw, 0); return new THREE.Mesh(new THREE.ShapeGeometry(s, 16), mat); }
function columnC(hgt, r, m, cap) { const P = [[r * 1.35, 0], [r * 1.35, 0.18], [r * 1.12, 0.26], [r, 0.4], [r * 0.9, hgt - 0.5], [r * 1.05, hgt - 0.35], [r * 1.4, hgt - 0.15], [r * 1.4, hgt], [0, hgt]];
  const g = new THREE.Group(), sh = new THREE.Mesh(new THREE.LatheGeometry(P.map(q => new THREE.Vector2(q[0], q[1])), 28), m); sh.castShadow = sh.receiveShadow = true; g.add(sh); if (cap) { const c = box(r * 3, 0.16, r * 3, cap, 0, hgt + 0.08, 0); g.add(c); } return g; }
function flagMesh(w, h, draw) { const g = new THREE.PlaneGeometry(w, h, 24, 8); g.translate(w / 2, 0, 0); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: signTex(512, Math.round(512 * h / w), draw), side: THREE.DoubleSide, roughness: 0.8 })); m.castShadow = true; m.userData.p0 = g.attributes.position.array.slice(); return m; }
function flagWave(m, t) { const p = m.geometry.attributes.position, p0 = m.userData.p0; for (let i = 0; i < p.count; i++) { const x = p0[i * 3], y = p0[i * 3 + 1]; p.setZ(i, Math.sin(x * 2.2 - t * 4 + y * 0.6) * 0.12 * x); } p.needsUpdate = true; m.geometry.computeVertexNormals(); }
const KW_FLAG = (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5b2f93'); g.addColorStop(1, '#3d1f69'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#e8b64a'; c.fillRect(0, h * 0.42, w, h * 0.16);
  c.save(); c.translate(w * 0.5, h * 0.5); c.fillStyle = '#ffd36a'; c.beginPath(); const s = h * 0.32; c.moveTo(-s, s * 0.4); c.lineTo(-s, -s * 0.5); c.lineTo(-s * 0.5, 0); c.lineTo(0, -s * 0.7); c.lineTo(s * 0.5, 0); c.lineTo(s, -s * 0.5); c.lineTo(s, s * 0.4); c.closePath(); c.fill(); c.restore(); };
function buildHall(G) {
  const H = HALL, g = new THREE.Group(), U = g.userData; G.add(g); S.hall = g;
  const [ic, ih] = stuccoCanvases([238, 226, 204], 33); const inner = texMat(ic, ih, [4, 3], { r: 0.85, ns: 0.4 });
  // fachada (z = ZF): puerta en arco, ventanas de planta baja en arco y ventanas altas
  const frontHoles = [[13, H.FL, 1.7, 5.4, true]]; for (const x of [13 - 5.2, 13 + 5.2, 13 - 9.6, 13 + 9.6]) frontHoles.push([x, 1.8, 0.8, 3.8, true]); for (const x of [13 - 3.4, 13 + 3.4, 13 - 6.9, 13 + 6.9, 13 - 10.4, 13 + 10.4]) frontHoles.push([x, 7.6, 0.7, 2.6, true]);
  const front = wallWithHoles(26, H.H, frontHoles, 0.5, T.stone); front.position.set(H.X0, 0, H.ZF - 0.5); g.add(front);
  const frontIn = wallWithHoles(26, H.H, frontHoles, 0.02, inner); frontIn.position.set(H.X0, 0, H.ZF - 0.53); g.add(frontIn);
  for (const [x, y, hw, hh, a] of frontHoles.slice(1)) { const gl = winGlass(hw, hh, a, T.glassDark); gl.position.set(H.X0 + x, y, H.ZF - 0.25); g.add(gl); const sill = box(hw * 2 + 0.3, 0.12, 0.35, T.stoneW, H.X0 + x, y - 0.06, H.ZF + 0.1); g.add(sill); }
  // laterales con ventanas altas (entra el sol de la mañana por el este) y fondo
  const sideHoles = [[18 - 4, 2.2, 1.0, 6.4, true], [18 - 9, 2.2, 1.0, 6.4, true], [18 - 14, 2.2, 1.0, 6.4, true]];
  for (const sx of [-1, 1]) { const w = wallWithHoles(18, H.H, sideHoles, 0.5, T.stone); w.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; w.position.set(sx > 0 ? H.X1 : H.X0, 0, sx > 0 ? H.ZB : H.ZF); if (sx < 0) w.position.x = H.X0 + 0.5 - 0.5; g.add(w);
    const wi = wallWithHoles(18, H.H, sideHoles, 0.02, inner); wi.rotation.y = w.rotation.y; wi.position.copy(w.position); wi.position.x += -sx * 0.52; g.add(wi);
    for (const [z, y, hw, hh, a] of sideHoles) { const gl = winGlass(hw, hh, a, T.glass); gl.rotation.y = w.rotation.y; gl.position.set(sx > 0 ? H.X1 - 0.25 : H.X0 + 0.25, y, sx > 0 ? H.ZB + z : H.ZF - z); g.add(gl); } }
  const back = box(26, H.H, 0.5, T.stone, 0, H.H / 2, H.ZB - 0.25); g.add(back); const backIn = box(26, H.H, 0.02, inner, 0, H.H / 2, H.ZB + 0.02); g.add(backIn);
  const roof = box(27, 0.5, 19, T.stoneW, 0, H.H + 0.25, (H.ZF + H.ZB) / 2 - 0.25); g.add(roof); for (let x = -12.5; x <= 12.5; x += 0.55) if (Math.abs(x) > 1.8) ad(g, cyl(0.09, 0.11, 0.7, T.stoneW, 10)).position.set(x, H.H + 0.85, H.ZF - 0.2); for (const s of [-1, 1]) g.add(box(11.4, 0.18, 0.4, T.stoneW, s * 7.5, H.H + 1.25, H.ZF - 0.2));
  // (día 5) el balcón del rey: semicírculo que sale del tejado sobre el frontón, con balaustrada de oro, dos farolillos y el tapiz morado del reino
  { const B = new THREE.Group(); B.position.set(0, H.H + 0.5, H.ZF - 0.2); g.add(B); U.balcony = B; const R0 = 1.75;
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, 0.3, 40, 1, false, -Math.PI / 2, Math.PI), T.stoneW); sl.position.y = -0.15; B.add(sl);
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(R0 + 0.08, R0 - 0.1, 0.16, 40, 1, false, -Math.PI / 2, Math.PI), T.stoneW); lip.position.y = -0.38; B.add(lip);
    const corb = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.0, 24, 1, false, -Math.PI / 2, Math.PI), T.stoneW); corb.rotation.z = Math.PI; corb.position.y = -0.95; B.add(corb);
    for (let i = 0; i <= 14; i++) { const a = -Math.PI / 2 + i / 14 * Math.PI, x = Math.sin(a) * (R0 - 0.12), z = Math.cos(a) * (R0 - 0.12); ad(B, cyl(0.035, 0.045, 0.82, T.gold, 10)).position.set(x, 0.41, z); }
    const rail = new THREE.Mesh(new THREE.TorusGeometry(R0 - 0.12, 0.05, 8, 40, Math.PI), T.gold); rail.rotation.x = Math.PI / 2; rail.position.y = 0.84; B.add(rail);
    const tap = flagMesh(1.5, 2.0, (c, w, h) => { KW_FLAG(c, w, h); c.fillStyle = '#e8b64a'; c.fillRect(0, h - 22, w, 22); for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(i * w / 8, h - 22); c.lineTo((i + 0.5) * w / 8, h); c.lineTo((i + 1) * w / 8, h - 22); c.fill(); } });
    tap.position.set(-0.75, -1.05, R0 + 0.11); B.add(tap); U.tapestry = tap; tap.userData.still = true;
    for (const s of [-1, 1]) { const lp = new THREE.Group(); lp.position.set(s * (R0 - 0.12), 0.84, 0); B.add(lp); ad(lp, cyl(0.06, 0.08, 0.35, T.goldD, 12)).position.y = 0.17; ad(lp, sph(0.11, lampMat('city'), 14, 10)).position.y = 0.45; lp.updateMatrixWorld(true); }
    shadowAll(B, true, true); }
  // techo artesonado por dentro y suelo de mármol
  const coff = signTex(1024, 1024, (c, w, h) => { c.fillStyle = '#e9dcc0'; c.fillRect(0, 0, w, h); const n = 8, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = i * s, y = j * s, gr = c.createLinearGradient(x, y, x + s, y + s); gr.addColorStop(0, '#d8c39a'); gr.addColorStop(1, '#bfa575'); c.fillStyle = gr; c.fillRect(x + s * 0.12, y + s * 0.12, s * 0.76, s * 0.76); c.fillStyle = '#e2b54e'; c.beginPath(); c.arc(x + s / 2, y + s / 2, s * 0.07, 0, 7); c.fill(); } });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(25.5, 18), new THREE.MeshStandardMaterial({ map: coff, roughness: 0.8 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H.H - 0.02, (H.ZF + H.ZB) / 2); g.add(ceil);
  const mt = texOf(marbleCanvas(), [6, 4.2]); const floor = new THREE.Mesh(new THREE.PlaneGeometry(25.6, 18), new THREE.MeshPhysicalMaterial({ map: mt, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.12 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, H.FL, (H.ZF + H.ZB) / 2); floor.receiveShadow = true; g.add(floor);
  g.add(box(26, H.FL, 18, T.stoneW, 0, H.FL / 2, (H.ZF + H.ZB) / 2));
  // zócalo de madera
  for (const [w, d, x, z] of [[25.4, 0.08, 0, H.ZB + 0.06], [0.08, 17.4, H.X0 + 0.56, (H.ZF + H.ZB) / 2], [0.08, 17.4, H.X1 - 0.56, (H.ZF + H.ZB) / 2]]) g.add(box(w, 1.3, d, T.woodD, x, H.FL + 0.65, z));
  // escalinata y pórtico de seis columnas con frontón (y el escudo con la corona)
  for (let i = 0; i < 4; i++) { const d = 1.4 - 0.35 * i; g.add(box(20 - i * 0.4, 0.15, d, T.stoneW, 0, 0.075 + i * 0.15, -14.0 + d / 2)); }
  g.add(box(19.2, H.FL, 2.2, T.stoneW, 0, H.FL / 2, H.ZF + 0.9));
  for (const x of [-8.2, -4.9, -1.65, 1.65, 4.9, 8.2]) { const c = columnC(7.2, 0.42, T.stoneW, T.stoneW); c.position.set(x, H.FL, H.ZF + 1.3); g.add(c); }
  g.add(box(18.6, 0.9, 2.4, T.stoneW, 0, H.FL + 7.6, H.ZF + 1.0)); g.add(box(18.9, 0.25, 2.6, T.stoneW, 0, H.FL + 8.15, H.ZF + 1.0));
  { const s = new THREE.Shape(); s.moveTo(-9.4, 0); s.lineTo(9.4, 0); s.lineTo(0, 2.6); s.lineTo(-9.4, 0); const pg = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: false }); const ped = new THREE.Mesh(pg, T.stoneW); ped.position.set(0, H.FL + 8.27, H.ZF - 0.2); ped.castShadow = ped.receiveShadow = true; g.add(ped);
    const crest = signPlane(2.4, 1.6, 512, (c, w, h) => { c.clearRect(0, 0, w, h); KW_FLAG(c, w, h); }, { r: 0.5 }); crest.position.set(0, H.FL + 9.2, H.ZF + 2.22); g.add(crest);
    const txt = signPlane(8, 0.7, 1024, (c, w, h) => { c.fillStyle = '#e9e2d2'; c.fillRect(0, 0, w, h); c.fillStyle = '#5a4a32'; c.font = '700 88px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '14px'; c.fillText('AYUNTAMIENTO DE KIRIA WORLD', w / 2, h / 2 + 4); }, { r: 0.7 }); txt.position.set(0, H.FL + 7.62, H.ZF + 2.21); g.add(txt); }
  // puerta de dos hojas (abiertas hacia dentro)
  const dm = stdM(0x3c2617, 0.55); U.doors = []; for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * 1.7, H.FL, H.ZF - 0.5); g.add(piv); const leaf = box(1.7, 4.7, 0.12, dm, -s * 0.85, 2.35, 0); piv.add(leaf); for (let i = 0; i < 3; i++) piv.add(box(1.3, 1.0, 0.04, stdM(0x4d321e, 0.5), -s * 0.85, 0.9 + i * 1.4, 0.07)); piv.rotation.y = -s * 1.52; U.doors.push(piv); }
  // banderas en el tejado y sobre la puerta
  U.flags = []; for (const x of [-11, 11]) { const pole = cyl(0.05, 0.06, 5, T.goldD, 10); pole.position.set(x, H.H + 2.8, H.ZF - 1); g.add(pole); const f = flagMesh(2.6, 1.6, KW_FLAG); f.position.set(x, H.H + 4.4, H.ZF - 1); g.add(f); U.flags.push(f); }
  // ---- dentro: alfombra, columnas, estandarte, lámparas, tarima y trono
  const carpetT = signTex(256, 1024, (c, w, h) => { c.fillStyle = '#8e1a28'; c.fillRect(0, 0, w, h); const R = rng(3); for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${R() > 0.5 ? '255,255,255' : '0,0,0'},0.035)`; c.fillRect(R() * w, R() * h, 2, 2); } c.fillStyle = '#d8a845'; c.fillRect(10, 0, 10, h); c.fillRect(w - 20, 0, 10, h); });
  const cm = new THREE.MeshStandardMaterial({ map: carpetT, roughness: 0.95 }); const carpet = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 13.6), cm); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, H.FL + 0.012, -23.2); carpet.receiveShadow = true; g.add(carpet);
  for (const x of [-7.2, 7.2]) for (const z of [-19.5, -23.5, -27.5]) { const c = columnC(H.H - H.FL - 0.6, 0.38, stdM(0xf3eee4, 0.3), T.goldD); c.position.set(x, H.FL, z); g.add(c); }
  // tarima de tres escalones (con alfombra) y el trono
  for (let i = 0; i < 3; i++) { const z0 = -30.2 - i * 0.55; g.add(box(7 - i * 0.6, 0.2, z0 - H.ZB, T.stoneW, 0, H.FL + 0.1 + i * 0.2, (z0 + H.ZB) / 2)); const cp = new THREE.Mesh(new THREE.PlaneGeometry(3.2, z0 - H.ZB), cm); cp.rotation.x = -Math.PI / 2; cp.position.set(0, H.FL + 0.205 + i * 0.2, (z0 + H.ZB) / 2); g.add(cp); }
  const DY = H.FL + 0.6, TZ = -32.6; U.dais = DY;
  const th = new THREE.Group(); th.position.set(0, DY, TZ); g.add(th); U.throne = th;
  th.add(box(1.5, 0.3, 1.1, T.goldD, 0, 0.15, 0)); const cush = rboxM(1.1, 0.16, 0.85, 0.06, T.velvet, 2); cush.position.set(0, 0.38, 0.05); th.add(cush);
  const bk = new THREE.Group(); bk.position.set(0, 0.3, -0.48); th.add(bk); bk.add(box(1.5, 2.6, 0.14, T.gold, 0, 1.3, 0)); const vp = rboxM(1.05, 2.0, 0.08, 0.05, T.velvet, 2); vp.position.set(0, 1.25, 0.08); bk.add(vp);
  for (const s of [-1, 1]) { const pst = cyl(0.08, 0.09, 2.9, T.gold, 16); pst.position.set(s * 0.72, 1.45, 0.02); bk.add(pst); const ball = sph(0.13, T.gold, 20, 14); ball.position.set(s * 0.72, 2.98, 0.02); bk.add(ball);
    const arm = rboxM(0.16, 0.12, 0.95, 0.05, T.gold, 2); arm.position.set(s * 0.66, 0.72, 0.42); th.add(arm); const armP = cyl(0.05, 0.06, 0.42, T.gold, 12); armP.position.set(s * 0.66, 0.5, 0.82); th.add(armP); }
  const tc = crown(2.2); tc.position.set(0, 2.75, 0.04); bk.add(tc); U.tcrown = tc;
  shadowAll(th);
  // mesita con el pergamino de la ley y el sello de oro (a la derecha del rey)
  const tb = new THREE.Group(); tb.position.set(1.25, DY, TZ + 0.55); g.add(tb); U.table = tb; ad(tb, cyl(0.32, 0.32, 0.04, T.woodD, 32)).position.y = 0.8; ad(tb, cyl(0.04, 0.05, 0.78, T.goldD, 12)).position.y = 0.4; ad(tb, cyl(0.22, 0.26, 0.04, T.goldD, 24)).position.y = 0.02;
  U.lawT = signTex(768, 1024, drawLaw(0)); U.lawT2 = signTex(768, 1024, drawLaw(1)); const law = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: U.lawT, roughness: 0.85 })); law.rotation.x = -Math.PI / 2; law.rotation.z = 0.25; law.position.set(0, 0.825, 0); law.receiveShadow = true; tb.add(law); U.law = law;
  const seal = new THREE.Group(); tb.add(seal); U.seal = seal; ad(seal, cyl(0.05, 0.055, 0.03, T.gold, 32)).position.y = 0.015; ad(seal, cyl(0.022, 0.03, 0.12, T.goldD, 16)).position.y = 0.09; ad(seal, sph(0.038, T.gold, 20, 14)).position.y = 0.17; shadowAll(seal);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.008, 32), new THREE.MeshStandardMaterial({ color: 0xa0141e, roughness: 0.35 })); wax.position.set(0.05, 0.83, 0.12); wax.visible = false; tb.add(wax); U.wax = wax;
  // estandarte detrás del trono y dos banderas
  const ban = flagMesh(5.4, 7.2, (c, w, h) => { c.fillStyle = '#4b2878'; c.fillRect(0, 0, w, h); c.fillStyle = '#e2b04a'; c.fillRect(0, 0, w, 18); c.fillRect(0, h - 18, w, 18); c.save(); c.translate(w / 2, h * 0.4); const s = w * 0.28; c.fillStyle = '#ffd36a'; c.beginPath(); c.moveTo(-s, s * 0.4); c.lineTo(-s, -s * 0.5); c.lineTo(-s * 0.5, 0); c.lineTo(0, -s * 0.7); c.lineTo(s * 0.5, 0); c.lineTo(s, -s * 0.5); c.lineTo(s, s * 0.4); c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#ffe3a0'; c.font = '900 64px Inter'; c.textAlign = 'center'; c.fillText('KIRIA', w / 2, h * 0.68); c.fillText('WORLD', w / 2, h * 0.78); });
  ban.position.set(-2.7, H.FL + 5.2, H.ZB + 0.3); g.add(ban); U.banner = ban;
  // lámparas de araña: aro de oro, brazos y velas encendidas
  U.chand = []; for (const z of [-21.5, -27]) { const c = new THREE.Group(); c.position.set(0, 8.6, z); g.add(c); ad(c, cyl(0.02, 0.02, 2.4, T.goldD, 6)).position.y = 1.4; const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 10, 48), T.gold); ring.rotation.x = Math.PI / 2; c.add(ring);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = Math.cos(a), zz = Math.sin(a); const cd = cyl(0.025, 0.025, 0.16, stdM(0xf4efe2, 0.6), 8); cd.position.set(x, 0.1, zz); c.add(cd); const fl = sph(0.03, T.lampGlow, 8, 6); fl.position.set(x, 0.21, zz); c.add(fl); const gs = glowSprite(0xffc98a, 0.55, 0.55); gs.position.set(x, 0.24, zz); c.add(gs); }
    U.chand.push(c); }
  // haces de sol que entran por las ventanas del este (polvo en el aire)
  const shaftM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { op: { value: 0.22 }, col: { value: new THREE.Color(1.0, 0.86, 0.62) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float op; uniform vec3 col; varying vec2 vUv; void main(){ float a = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.3, vUv.y) * (0.55 + 0.45 * vUv.y); gl_FragColor = vec4(col * a * op, a * op); }' });
  U.shafts = []; for (const z of [-20, -25, -30]) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 11, 1, 1), shaftM); sh.position.set(H.X0 + 4.0, 4.4, z + 1.0); sh.rotation.set(0, -0.5, 0.7); g.add(sh); U.shafts.push(sh); }
  U.shaftM = shaftM;
  return g; }
// el pergamino: «LEY Nº 1 · Una vez a la semana, Kiria World homenajeará a su mejor seguidor» (k = 0 sin sello … 1 sellado)
function drawLaw(k) { return (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75); gr.addColorStop(0, '#f6ecd2'); gr.addColorStop(1, '#d9c497'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#a3864f'; c.lineWidth = 6; c.strokeRect(26, 26, w - 52, h - 52); c.fillStyle = '#3a2a14'; c.textAlign = 'center'; c.font = '900 64px Inter'; c.fillText('LEY Nº 1', w / 2, 150); c.font = '600 22px Inter'; c.fillText('REINO DE KIRIA WORLD', w / 2, 192);
  c.font = '700 46px Inter'; const L = ['Una vez a la', 'semana, Kiria', 'World homenajeará', 'a su mejor', 'seguidor.']; L.forEach((s, i) => c.fillText(s, w / 2, 300 + i * 66));
  c.font = 'italic 600 30px Inter'; c.fillText('— el rey', w / 2, 690); c.strokeStyle = '#3a2a14'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * 0.3, 760); c.bezierCurveTo(w * 0.45, 720, w * 0.55, 800, w * 0.7, 750); c.stroke();
  if (k > 0) { c.save(); c.globalAlpha = Math.min(1, k * 1.5); c.translate(w * 0.62, h * 0.86); c.fillStyle = '#a3121c'; c.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = 70 + (i % 2 ? 8 : 0); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.fillStyle = '#7a0a12'; c.beginPath(); c.arc(0, 0, 52, 0, 7); c.fill(); c.fillStyle = '#c9333c'; const s = 30; c.beginPath(); c.moveTo(-s, s * 0.4); c.lineTo(-s, -s * 0.5); c.lineTo(-s * 0.5, 0); c.lineTo(0, -s * 0.7); c.lineTo(s * 0.5, 0); c.lineTo(s, -s * 0.5); c.lineTo(s, s * 0.4); c.closePath(); c.fill(); c.restore(); } }; }
