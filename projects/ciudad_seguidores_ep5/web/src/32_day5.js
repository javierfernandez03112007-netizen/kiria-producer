// ---------------------------------------------------------------- DÍA 5 (al atardecer): la corona que rueda por el salón del trono, la fragua donde forjan la máscara,
// el club de @ammmm_mal (neón, cordón y portero), el cine con estreno y el restaurante chino de @god_nika0206, el campo del club de fútbol de @luquita.berna
// (con su 7), el bocadillo «¡Adelante!» de @marcos13_08 y la máscara de acero del rey que refleja el cielo.
// cojín de terciopelo con borlas (la corona va aparte: rueda)
function cushion() { const g = new THREE.Group(), vel = new THREE.MeshPhysicalMaterial({ color: 0x8c0d1d, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(0xff7080) });
  const c = rboxM(0.4, 0.09, 0.4, 0.045, vel, 4); c.position.y = 0.045; g.add(c);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 8), T.gold); t.position.set(x * 0.2, 0.0, z * 0.2); t.rotation.x = Math.PI; g.add(t); }
  shadowAll(g, true, true); return g; }
// la máscara: cara de acero pulido (un espejo) de la frente a la barbilla, con ojos almendrados oscuros, nariz y cejas en relieve y un filo dorado; refleja el cielo
function steelMask(p) { const J = p.userData.J, k = p.userData.k, HS = p.userData.HS, HY = 0.11 * k, g = new THREE.Group(); g.position.y = HY; J.head.add(g);
  const m = new THREE.MeshStandardMaterial({ color: 0xf4f6fa, metalness: 1, roughness: 0.05 }); m.userData.envMapFixed = 'atardecer'; m.userData.envFixed = 1.4;
  const A = 1.02, E0 = -0.7, E1 = 0.42, rx = HS[0] * 1.13, ry = HS[1] * 1.07, rz = HS[2] * 1.17;
  const relief = (a, e) => 0.17 * Math.exp(-Math.pow(a / 0.1, 2)) * Math.exp(-Math.pow((e + 0.1) / 0.2, 2)) * (e < 0.12 ? 1 : Math.exp(-Math.pow((e - 0.12) / 0.06, 2)))
    + 0.045 * Math.exp(-Math.pow((e - 0.2) / 0.05, 2)) * Math.exp(-Math.pow((Math.abs(a) - 0.33) / 0.16, 2)) + 0.03 * Math.exp(-Math.pow((e + 0.35) / 0.06, 2)) * Math.exp(-Math.pow(a / 0.16, 2))
    - 0.035 * Math.exp(-Math.pow((e - 0.06) / 0.07, 2)) * Math.exp(-Math.pow((Math.abs(a) - 0.33) / 0.12, 2));
  const at = (u, v, out = 0) => { const w = 1 - 0.38 * Math.pow(Math.max(0, -v), 1.6) - 0.12 * Math.pow(Math.max(0, v), 4), a = u * A * w, e = lerp(E0, E1, (v + 1) / 2), R0 = 1 + relief(a, e) + out;
    return _v(Math.sin(a) * Math.cos(e) * rx * R0, Math.sin(e) * ry * R0, Math.cos(a) * Math.cos(e) * rz * R0); };
  const N = 72, geo = new THREE.PlaneGeometry(2, 2, N, N), P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const q = at(P.getX(i), P.getY(i)); P.setXYZ(i, q.x, q.y, q.z); }
  geo.computeVertexNormals(); const sh = new THREE.Mesh(geo, m); sh.castShadow = true; g.add(sh);
  // ojos: almendras oscuras pegadas a la superficie
  const dark = new THREE.MeshBasicMaterial({ color: 0x040303 });
  for (const s of [-1, 1]) { const eg = new THREE.PlaneGeometry(2, 2, 16, 8), EP = eg.attributes.position; for (let i = 0; i < EP.count; i++) { const x = EP.getX(i), y = EP.getY(i) * (1 - 0.85 * x * x), a = s * 0.33 + x * 0.115, e = 0.065 + y * 0.032 - 0.02 * s * x * 0;
      const w = 1 - 0.38 * Math.pow(Math.max(0, -0), 1.6), R0 = 1 + relief(a, e) + 0.006; EP.setXYZ(i, Math.sin(a) * Math.cos(e) * rx * R0, Math.sin(e) * ry * R0, Math.cos(a) * Math.cos(e) * rz * R0); }
    const em = new THREE.Mesh(eg, dark); g.add(em); }
  // filo dorado por el borde
  const edge = []; for (let i = 0; i <= 160; i++) { const t = i / 160 * 4; let u, v; if (t < 1) { u = -1 + 2 * t; v = 1; } else if (t < 2) { u = 1; v = 1 - 2 * (t - 1); } else if (t < 3) { u = 1 - 2 * (t - 2); v = -1; } else { u = -1; v = -1 + 2 * (t - 3); } edge.push(at(u, v, 0.004)); }
  const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge, true), 200, 0.0045 * k, 6, true), T.gold); g.add(rim);
  g.userData.mat = m; p.userData.mask = g; return g; }
// gafas de sol (el dueño del club)
function shades(p) { const J = p.userData.J, k = p.userData.k, HS = p.userData.HS, HY = 0.11 * k, g = new THREE.Group(); g.position.set(0, HY + 0.012 * k, HS[2] * 0.93); J.head.add(g); const m = stdM(0x0a0a0c, 0.15, { metalness: 0.4 });
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * k, 0.03 * k, 0.012 * k, 16), m); l.rotation.x = Math.PI / 2; l.scale.set(1.25, 1, 0.85); l.position.set(s * 0.04 * k, 0, 0.012 * k); g.add(l); }
  g.add(box(0.03 * k, 0.006 * k, 0.006 * k, m, 0, 0.005 * k, 0.015 * k)); return g; }
// la fragua: hogar con brasas, campana, yunque, la pieza al rojo (la máscara) que se va enfriando, herramientas, barril y tejadillo
function forge() { const g = new THREE.Group(), stone = stdM(0x6a5f56, 0.9), iron = stdM(0x2a2c30, 0.45, { metalness: 0.7 }), U = g.userData;
  g.add(box(1.6, 0.9, 1.1, stone, -1.2, 0.45, 0)); U.coals = nightMat(new THREE.MeshStandardMaterial({ color: 0x2a0a00, emissive: 0xff5a10, emissiveIntensity: 3.2, roughness: 0.8 })); g.add(box(1.2, 0.08, 0.8, U.coals, -1.2, 0.94, 0));
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.0, 4, 1, true), stdM(0x3a3632, 0.8, { side: THREE.DoubleSide })); hood.rotation.y = Math.PI / 4; hood.position.set(-1.2, 2.0, 0); g.add(hood); g.add(box(0.3, 1.6, 0.3, stdM(0x3a3632, 0.8), -1.2, 3.25, 0));
  const anvil = new THREE.Group(); anvil.position.set(0.5, 0, 0); g.add(anvil); anvil.add(box(0.36, 0.5, 0.36, stdM(0x4a3a2a, 0.8), 0, 0.25, 0)); anvil.add(box(0.22, 0.18, 0.2, iron, 0, 0.59, 0)); anvil.add(box(0.62, 0.12, 0.24, iron, 0, 0.74, 0));
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 12), iron); horn.rotation.z = -Math.PI / 2; horn.position.set(0.45, 0.74, 0); anvil.add(horn);
  U.hot = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.9, roughness: 0.22, emissive: 0xff6a1a, emissiveIntensity: 3 });
  const piece = new THREE.Mesh(new THREE.SphereGeometry(0.14, 28, 18, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.14, Math.PI * 0.68), U.hot); piece.scale.set(0.95, 1.15, 0.75); piece.rotation.x = -Math.PI / 2; piece.position.set(0.5, 0.81, 0); g.add(piece); U.piece = piece;
  for (let i = 0; i < 4; i++) { const t = box(0.03, 0.5, 0.03, iron, -2.1 + i * 0.12, 1.15, -0.58); t.rotation.z = 0.1; g.add(t); } g.add(box(0.6, 0.05, 0.06, stdM(0x5a3a22, 0.8), -1.92, 1.42, -0.58));
  const barrel = cyl(0.3, 0.27, 0.7, stdM(0x6a4426, 0.8), 18); barrel.position.set(1.35, 0.35, -0.45); g.add(barrel); const water = new THREE.Mesh(new THREE.CircleGeometry(0.27, 18), stdM(0x1d2a30, 0.1)); water.rotation.x = -Math.PI / 2; water.position.set(1.35, 0.705, -0.45); g.add(water);
  const sign = signPlane(2.2, 0.5, 512, (c, W, H) => { c.fillStyle = '#3a2614'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffcf7a'; c.font = '900 64px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '8px'; c.fillText('FRAGUA REAL', W / 2, H / 2 + 4); }, { r: 0.6, glow: 0.6 });
  sign.position.set(-1.2, 2.55, 0.62); g.add(sign); g.add(box(2.3, 0.6, 0.06, stdM(0x2a1a0e, 0.7), -1.2, 2.55, 0.58));
  U.sparks = sparks(g, 110, 0xffc060, 0.06); U.embers = sparks(g, 40, 0xff7a2a, 0.04); shadowAll(g, true, true); return g; }
// martillo de herrero (en la mano)
function smithHammer() { const g = new THREE.Group(); ad(g, cyl(0.016, 0.018, 0.42, stdM(0x6a4426, 0.7), 8)).position.y = -0.1; g.add(box(0.06, 0.06, 0.15, stdM(0x2a2c30, 0.4, { metalness: 0.8 }), 0, -0.3, 0)); return g; }
// rótulo de neón (texto con brillo) para fachadas
function neonSign(txt, w, h, col, glow = 3.5, font = 'italic 900') { const s = signPlane(w, h, 1024, (c, W, H) => { c.clearRect(0, 0, W, H); c.shadowColor = col; c.shadowBlur = 30; c.lineJoin = 'round';
  c.font = `${font} ${Math.round(H * 0.62)}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = col; c.lineWidth = 16; c.strokeText(txt, W / 2, H / 2 + 6); c.shadowBlur = 0; c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.strokeText(txt, W / 2, H / 2 + 6); }, { r: 0.4, glow, alpha: true });
  s.material.depthWrite = false; s.receiveShadow = false; return s; }
// fachada de local: planta baja (H0) y plantas con ventanas; frente en z = 0 mirando a +z (se gira al colocarla). hollow: la planta baja queda abierta (escaparate)
function frontShell(w, wallM, floors = 2, hollow = false) { const g = new THREE.Group(), H0 = 4.2, H = H0 + floors * 3.3 + 0.6;
  if (hollow) { g.add(box(w, H - H0, 0.4, wallM, 0, (H + H0) / 2, -0.2)); for (const s of [-1, 1]) g.add(box(0.7, H0, 0.4, wallM, s * (w / 2 - 0.35), H0 / 2, -0.2)); g.add(box(w, H0 - 3.0, 0.4, wallM, 0, (H0 + 3.0) / 2, -0.2)); g.add(box(w, 0.35, 0.4, wallM, 0, 0.175, -0.2));
    g.add(box(w, H - H0, 7, stdM(0x7c766e, 0.9), 0, (H + H0) / 2, -3.9)); g.add(box(w, H0, 1.0, stdM(0x7c766e, 0.9), 0, H0 / 2, -6.9)); }
  else { g.add(box(w, H, 0.4, wallM, 0, H / 2, -0.2)); g.add(box(w, H, 7, stdM(0x7c766e, 0.9), 0, H / 2, -3.9)); }
  for (let f = 0; f < floors; f++) for (let i = 0; i < 3; i++) { const x = (i - 1) * w / 3.2, y = H0 + 0.9 + f * 3.3; g.add(box(1.2, 1.7, 0.1, T.frame, x, y + 0.85, 0.02)); const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.54), T.glassDark); gl.position.set(x, y + 0.85, 0.08); g.add(gl);
    g.add(box(1.4, 0.1, 0.28, stdM(0xe6e0d4, 0.6), x, y - 0.05, 0.12)); }
  g.add(box(w + 0.3, 0.35, 0.6, stdM(0xd8d0c4, 0.6), 0, H - 0.18, 0.1)); g.add(box(w, 0.15, 0.4, stdM(0xd8d0c4, 0.6), 0, H0, 0.05)); g.userData.H0 = H0; g.userData.H = H; return g; }
// postes dorados con cordón de terciopelo
function ropePosts(g, xs, z, y0 = 0) { const rope = new THREE.MeshStandardMaterial({ color: 0x8c0d1d, roughness: 0.6 });
  for (const x of xs) { const p = new THREE.Group(); p.position.set(x, y0, z); g.add(p); ad(p, cyl(0.025, 0.025, 0.95, T.gold, 10)).position.y = 0.48; ad(p, sph(0.05, T.gold, 10, 8)).position.y = 0.98; ad(p, cyl(0.12, 0.14, 0.04, T.gold, 16)).position.y = 0.02; }
  for (let i = 0; i < xs.length - 1; i++) { const a = xs[i], b = xs[i + 1], cv = new THREE.QuadraticBezierCurve3(_v(a, y0 + 0.9, z), _v((a + b) / 2, y0 + 0.62, z), _v(b, y0 + 0.9, z)); g.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 12, 0.02, 6), rope)); } }
// escalera de mano
function ladder(h = 3.2) { const g = new THREE.Group(), m = stdM(0xb8bcc2, 0.4, { metalness: 0.7 }); for (const s of [-1, 1]) g.add(box(0.05, h, 0.05, m, s * 0.22, h / 2, 0)); for (let y = 0.3; y < h; y += 0.3) g.add(box(0.44, 0.03, 0.04, m, 0, y, 0)); shadowAll(g); return g; }
// EL CLUB de @ammmm_mal: fachada negra, puerta con marco de luz, «CLUB» en neón rosa, cordón dorado y cartel de «COMPLETO» que se enciende
function clubFront(w) { const black = stdM(0x17131c, 0.45), g = frontShell(w, black, 2), U = g.userData;
  g.add(box(1.7, 2.6, 0.08, stdM(0x2a1a2e, 0.35, { metalness: 0.5 }), 0, 1.3, 0.04));
  const led = nightMat(new THREE.MeshStandardMaterial({ color: 0x220a20, emissive: 0xff3dd8, emissiveIntensity: 3.2, roughness: 0.4 })); for (const [x, y, ww, hh] of [[0, 2.68, 1.95, 0.07], [-0.94, 1.34, 0.07, 2.7], [0.94, 1.34, 0.07, 2.7]]) g.add(box(ww, hh, 0.07, led, x, y, 0.1));
  const sign = neonSign('CLUB', 3.4, 1.15, '#ff3dd8', 4.2); sign.position.set(0, 4.05, 0.08); g.add(sign); nightMat(sign.material);
  const sub = neonSign('de @ammmm_mal', 2.7, 0.45, '#3df2ff', 2.8, '700'); sub.position.set(0, 3.15, 0.09); g.add(sub); nightMat(sub.material);
  const strip = nightMat(new THREE.MeshStandardMaterial({ color: 0x10141c, emissive: 0x7a3dff, emissiveIntensity: 2.6, roughness: 0.4 })); for (const s of [-1, 1]) g.add(box(0.08, U.H - 0.6, 0.06, strip, s * (w / 2 - 0.3), (U.H - 0.6) / 2, 0.04));
  ropePosts(g, [1.25, 2.45, 3.65], 0.95, 0.14);
  const ft = signTex(512, 160, (c, W, H) => { c.fillStyle = '#0b0b0e'; c.fillRect(0, 0, W, H); c.fillStyle = '#ff2a3a'; c.font = '900 92px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('COMPLETO', W / 2, H / 2 + 4); });
  U.full = new THREE.MeshStandardMaterial({ color: 0x1a0a0a, map: ft, emissiveMap: ft, emissive: 0xffffff, emissiveIntensity: 0.05, roughness: 0.4 }); const fs = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.36), U.full); fs.position.set(-1.75, 2.3, 0.06); g.add(fs); g.add(box(1.25, 0.46, 0.05, stdM(0x2a2a30, 0.4), -1.75, 2.3, 0.02));
  U.src = nightSrc(_v(0, 2.6, 1.2), 0xff5ad8, 16, 3.2);
  shadowAll(g, true, true); sign.castShadow = sub.castShadow = false; return g; }
// EL CINE de @god_nika0206: marquesina con bombillas y «ESTRENO HOY», «CINE» en neón, carteles propios, alfombra roja y taquilla
function cinemaFront(w) { const [sc, sh] = stuccoCanvases([122, 40, 52], 71), wall = texMat(sc, sh, [3, 3], { r: 0.85, ns: 0.4 }), g = frontShell(w, wall, 2), H0 = g.userData.H0, U = g.userData;
  g.add(box(w - 0.6, 0.95, 1.7, stdM(0x2a1f2e, 0.5), 0, H0 - 0.6, 0.85));
  const txt = signPlane(3.5, 0.74, 1024, (c, W, H) => { c.fillStyle = '#fff6dc'; c.fillRect(0, 0, W, H); c.fillStyle = '#c8102e'; c.font = '900 132px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '4px'; c.fillText('ESTRENO HOY', W / 2, H / 2 + 8); }, { r: 0.5, glow: 1.1 });
  txt.position.set(0, H0 - 0.6, 1.71); g.add(txt); nightMat(txt.material);
  U.bulbM = nightMat(new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xffc860, emissiveIntensity: 5, roughness: 0.3 }));
  for (let i = 0; i < 22; i++) { const x = -w / 2 + 0.6 + i * (w - 1.2) / 21; for (const y of [H0 - 0.15, H0 - 1.05]) ad(g, sph(0.05, U.bulbM, 8, 6)).position.set(x, y, 1.72); }
  const cname = neonSign('CINE', 2.6, 1.0, '#ffcf4a', 3.4); cname.position.set(0, H0 + 0.85, 0.09); g.add(cname); nightMat(cname.material);
  const sub = signPlane(2.6, 0.38, 512, (c, W, H) => { c.fillStyle = '#1d1420'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffcf4a'; c.font = '700 64px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('de @god_nika0206', W / 2, H / 2 + 3); }, { r: 0.5, glow: 1.0 }); sub.position.set(0, H0 + 0.1, 0.06); g.add(sub); nightMat(sub.material);
  for (const [x, c1, c2, tt] of [[-2.65, '#1f3a6b', '#ff7a3a', 'EL REY SIN CORONA'], [2.65, '#3a1f4a', '#4af0c8', 'NOCHE EN KIRIA']]) { const p = signPlane(1.1, 1.6, 256, (c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c1); gr.addColorStop(1, '#0a0a10'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      c.fillStyle = c2; c.beginPath(); c.arc(W / 2, H * 0.38, W * 0.26, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '900 20px Inter'; c.textAlign = 'center'; c.fillText(tt, W / 2, H * 0.78); c.font = '600 16px Inter'; c.fillText('ESTRENO', W / 2, H * 0.88); }, { r: 0.4, glow: 0.9 }); p.position.set(x, 1.65, 0.07); g.add(p); g.add(box(1.25, 1.75, 0.06, T.gold, x, 1.65, 0.02)); nightMat(p.material); }
  g.add(box(1.6, 2.6, 0.08, stdM(0x3a2a1a, 0.4), 0, 1.3, 0.04)); const booth = new THREE.Group(); booth.position.set(-1.35, 0.14, 0.4); g.add(booth); booth.add(box(0.9, 1.05, 0.5, stdM(0x7a1424, 0.5), 0, 0.52, 0)); booth.add(box(0.95, 0.06, 0.55, T.gold, 0, 1.06, 0));
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.55), stdM(0xa0101e, 0.9)); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.155, 0.8); carpet.receiveShadow = true; g.add(carpet);
  ropePosts(g, [-0.85, 0.85].map(x => x), 1.55, 0.14);
  U.src = nightSrc(_v(0, H0 - 1.2, 1.6), 0xffd08a, 11, 3.5);
  shadowAll(g, true, true); cname.castShadow = false; return g; }
// EL RESTAURANTE CHINO de @god_nika0206: fachada roja con escaparate (se ve el comedor), farolillos y rótulo
function chineseFront(w) { const red = stdM(0x9a1c1c, 0.7), g = frontShell(w, red, 2, true), H0 = g.userData.H0, U = g.userData;
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.4, 2.65), T.glass); gl.position.set(0, 1.675, -0.2); g.add(gl); for (const y of [0.35, 3.0]) g.add(box(w - 1.3, 0.1, 0.16, T.gold, 0, y, -0.05)); for (const x of [-1.6, 1.6]) g.add(box(0.08, 2.65, 0.12, T.gold, x, 1.675, -0.1));
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.4, 6.0), stdM(0x6a3a22, 0.6)); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.36, -3.4); fl.receiveShadow = true; g.add(fl);
  g.add(box(w - 1.4, 3.9, 0.1, stdM(0xe8c090, 0.9), 0, 2.2, -6.35)); for (const s of [-1, 1]) g.add(box(0.1, 3.9, 6.1, stdM(0xd8a878, 0.9), s * (w / 2 - 0.75), 2.2, -3.35));
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.4, 6.0), stdM(0xa82a20, 0.8)); ce.rotation.x = Math.PI / 2; ce.position.set(0, 3.95, -3.4); g.add(ce);
  const art = signPlane(2.6, 1.3, 512, (c, W, H) => { c.fillStyle = '#f2e2c4'; c.fillRect(0, 0, W, H); c.strokeStyle = '#7a1a14'; c.lineWidth = 10; c.strokeRect(6, 6, W - 12, H - 12); c.strokeStyle = '#2a2a2a'; c.lineWidth = 5; c.beginPath(); c.moveTo(30, H * 0.8); c.bezierCurveTo(W * 0.3, H * 0.2, W * 0.5, H * 0.9, W * 0.7, H * 0.35); c.lineTo(W - 30, H * 0.7); c.stroke(); c.fillStyle = '#c8302a'; c.beginPath(); c.arc(W * 0.8, H * 0.3, 26, 0, 7); c.fill(); }, { r: 0.8 });
  art.position.set(0, 2.5, -6.28); g.add(art);
  const lantM = nightMat(new THREE.MeshStandardMaterial({ color: 0xd8232a, emissive: 0xff3a1a, emissiveIntensity: 1.5, roughness: 0.6 }));
  const lantern = (x, y, z, s = 1) => { const l = new THREE.Group(); l.position.set(x, y, z); g.add(l); const b = sph(0.24 * s, lantM, 16, 12); b.scale.y = 1.15; l.add(b); ad(l, cyl(0.13 * s, 0.13 * s, 0.05, T.gold, 12)).position.y = 0.29 * s; ad(l, cyl(0.13 * s, 0.13 * s, 0.05, T.gold, 12)).position.y = -0.29 * s; ad(l, cyl(0.01, 0.01, 0.25, stdM(0xe8b64a, 0.5), 4)).position.y = -0.45 * s; return l; };
  U.lanterns = [lantern(-w / 2 + 0.55, 3.45, 0.5), lantern(w / 2 - 0.55, 3.45, 0.5)]; for (const x of [-1.5, 1.5]) for (const z of [-1.8, -4.4]) lantern(x, 3.4, z, 0.9);
  const sign = signPlane(w - 0.8, 0.85, 1024, (c, W, H) => { c.fillStyle = '#2a0a0a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#e8b64a'; c.lineWidth = 10; c.strokeRect(10, 10, W - 20, H - 20); c.fillStyle = '#ffd36a'; c.font = '900 84px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('RESTAURANTE CHINO', W / 2, H * 0.4);
    c.font = '700 44px Inter'; c.fillStyle = '#ff9a6a'; c.fillText('de @god_nika0206', W / 2, H * 0.76); }, { r: 0.5, glow: 1.2 }); sign.position.set(0, H0 - 0.55, 0.14); g.add(sign); nightMat(sign.material); g.add(box(w - 0.6, 1.0, 0.2, stdM(0x2a0a0a, 0.5), 0, H0 - 0.55, 0.02));
  const eave = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, w + 0.4, 3, 1), stdM(0x2a5a3a, 0.6)); eave.rotation.z = Math.PI / 2; eave.scale.set(1, 1, 1.6); eave.position.set(0, H0 + 0.05, 0.4); g.add(eave);
  const tables = []; for (const [x, z] of [[-1.9, -1.45], [0.9, -1.3], [2.5, -3.3], [-1.6, -4.1], [0.9, -4.6]]) { const t = new THREE.Group(); t.position.set(x, 0.36, z); g.add(t); ad(t, cyl(0.55, 0.55, 0.05, stdM(0xf2efe8, 0.6), 24)).position.y = 0.76; ad(t, cyl(0.06, 0.08, 0.74, T.iron, 10)).position.y = 0.37;
    const lz = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 20), stdM(0x6a1a14, 0.4)); lz.position.y = 0.8; t.add(lz); tables.push([x, z, t]); }
  U.tables = tables; shadowAll(g, true, true); gl.castShadow = gl.receiveShadow = false; return g; }
// plato de rollitos de primavera (se van acabando)
function rollPlate() { const g = new THREE.Group(); ad(g, cyl(0.16, 0.12, 0.02, stdM(0xf6f4ee, 0.4), 24)).position.y = 0.01; g.userData.rolls = [];
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.085, 6, 10), stdM(0xd8962e, 0.55)); r.rotation.z = Math.PI / 2; r.rotation.y = (i - 2) * 0.3; r.position.set(0, 0.04, (i - 2) * 0.045); r.castShadow = true; g.add(r); g.userData.rolls.push(r); } return g; }
// cubo de palomitas (en la mano)
function popcorn() { const g = new THREE.Group(), t = signTex(128, 128, (c, W, H) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#d8202a'; c.fillRect(i * W / 8, 0, W / 8, H); } });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.14, 16, 1, true), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, side: THREE.DoubleSide })); g.add(cup);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), stdM(0xffe8a8, 0.9)); top.position.y = 0.06; top.scale.y = 0.6; g.add(top); return g; }
// campo del club de fútbol: césped a rayas con líneas, porterías con red, grada, focos, pancarta
function footballPitch(L = 32, Wd = 20) { const g = new THREE.Group(), U = g.userData;
  const t = signTex(1024, 640, (c, W, H) => { for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#3f8a3a' : '#4a9a42'; c.fillRect(i * W / 12, 0, W / 12, H); } c.strokeStyle = '#f2f2ea'; c.lineWidth = 7; const m = 34; c.strokeRect(m, m, W - 2 * m, H - 2 * m);
    c.beginPath(); c.moveTo(W / 2, m); c.lineTo(W / 2, H - m); c.stroke(); c.beginPath(); c.arc(W / 2, H / 2, 74, 0, 7); c.stroke(); c.strokeRect(m, H / 2 - 150, 140, 300); c.strokeRect(W - m - 140, H / 2 - 150, 140, 300); c.strokeRect(m, H / 2 - 70, 50, 140); c.strokeRect(W - m - 50, H / 2 - 70, 50, 140); });
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(L + 2.2, Wd + 2.2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 })); turf.rotation.x = -Math.PI / 2; turf.position.y = 0.03; turf.receiveShadow = true; g.add(turf);
  const white = stdM(0xf4f4ee, 0.4), net = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.8, side: THREE.DoubleSide, wireframe: true });
  U.goals = []; for (const s of [-1, 1]) { const gg = new THREE.Group(); gg.position.set(s * (L / 2 + 0.05), 0, 0); g.add(gg); for (const z of [-1.85, 1.85]) gg.add(box(0.1, 2.1, 0.1, white, 0, 1.05, z)); gg.add(box(0.1, 0.1, 3.8, white, 0, 2.1, 0));
    const n = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 3.7, 6, 10, 18), net); n.position.set(s * 0.62, 1.05, 0); gg.add(n); gg.userData.net = n; U.goals.push(gg); }
  for (let i = 0; i < 4; i++) g.add(box(L * 0.55, 0.4, 0.85, stdM(0x8a8f96, 0.6), 0, 0.2 + i * 0.4, -(Wd / 2 + 2.4 + i * 0.85)));
  for (let i = 0; i < 4; i++) g.add(box(L * 0.55, 0.06, 0.5, stdM([0x1f5fbf, 0xf2f2ee][i % 2], 0.5), 0, 0.43 + i * 0.4, -(Wd / 2 + 2.25 + i * 0.85)));
  const ban = signPlane(11, 1.2, 1024, (c, W, H) => { c.fillStyle = '#0f3a8a'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffffff'; c.font = '900 86px Inter'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText('CLUB DE FÚTBOL', 40, H / 2 + 4); c.fillStyle = '#ffd36a'; c.font = '700 58px Inter'; c.textAlign = 'right'; c.fillText('de @luquita.berna', W - 40, H / 2 + 6); }, { r: 0.5, glow: 0.5 });
  ban.position.set(-L / 2 - 3.2, 1.0, 0); ban.rotation.y = Math.PI / 2; g.add(ban); g.add(box(0.06, 1.4, 11.2, stdM(0x22262c, 0.5), -L / 2 - 3.25, 1.0, 0)); for (const s of [-1, 1]) g.add(box(0.08, 1.8, 0.08, stdM(0x22262c, 0.5), -L / 2 - 3.27, 0.9, s * 5.5));
  U.floods = []; for (const [x, z] of [[-L / 2 - 1.5, -Wd / 2 - 1.2], [L / 2 + 1.5, -Wd / 2 - 1.2], [-L / 2 - 1.5, Wd / 2 + 1.2], [L / 2 + 1.5, Wd / 2 + 1.2]]) { const p = cyl(0.12, 0.16, 12, stdM(0x6a6e74, 0.4, { metalness: 0.6 }), 10); p.position.set(x, 6, z); g.add(p);
    const hd = new THREE.Group(); hd.position.set(x, 12.3, z); g.add(hd); hd.lookAt(0, 0, 0); hd.add(box(1.6, 0.9, 0.25, stdM(0x2a2c30, 0.5), 0, 0, 0)); const lens = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.75), nightMat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6e0).multiplyScalar(2.5), toneMapped: false }))); lens.position.z = 0.13; hd.add(lens); U.floods.push(hd); }
  const ballT = signTex(256, 128, (c, W, H) => { c.fillStyle = '#fafafa'; c.fillRect(0, 0, W, H); c.fillStyle = '#111'; for (let i = 0; i < 12; i++) { c.beginPath(); const x = (i * 53) % W, y = 18 + ((i * 37) % (H - 36)); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; c.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); } c.fill(); } });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), new THREE.MeshStandardMaterial({ map: ballT, roughness: 0.45 })); ball.castShadow = true; g.add(ball); U.ball = ball; shadowAll(g, true, true); turf.castShadow = false; return g; }
// dorsal en la espalda
function shirtNumber(p, n, col = '#ffffff') { const J = p.userData.J, k = p.userData.k, tex = signTex(128, 128, (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = col; c.font = '900 112px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), W / 2, H / 2 + 6); });
  const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }); const back = new THREE.Mesh(new THREE.PlaneGeometry(0.17 * k, 0.17 * k), m);
  back.position.set(0, 0.14 * k, -0.105 * k); back.rotation.y = Math.PI; J.chest.add(back); p.userData.num = back; return back; }
// bocadillo de texto (mira a cámara)
function speechBubble(txt, w = 1.7) { const t = signTex(768, 360, (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = 'rgba(255,255,255,0.97)'; rr(c, 12, 12, W - 24, H - 100, 64); c.fill(); c.beginPath(); c.moveTo(150, H - 92); c.lineTo(118, H - 8); c.lineTo(250, H - 92); c.fill();
  c.fillStyle = '#1a1d22'; c.font = '900 112px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, W / 2, (H - 88) / 2 + 14); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 360 / 768), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false })); m.renderOrder = 6; return m; }
// brazos cruzados (el portero)
function poseArmsCrossed(p, k = 1) { const J = p.userData.J; for (const [n, s] of [['L', -1], ['R', 1]]) { J['sh' + n].rotation.x = -0.55 * k; J['sh' + n].rotation.z = s * 0.15 * k; J['el' + n].rotation.x = -1.75 * k; J['el' + n].rotation.y = -s * 0.9 * k; } }
// ---- la corona que rueda: cae del cojín, rebota, rueda hacia la cámara y acaba girando como una moneda hasta quedarse de pie en el suelo.
// u = segundos desde el primer fotograma (u = 0); sale del cojín en u = −1.3. CR: Pc (sobre el cojín), P0 (donde toca el suelo), f0/s0 (adelante/lado).
const CROWN = { r: 0.112, b: 0.026 }, CR = {}, CRU = { F: -1.3, L: -0.75, R: -0.45, A: 2.1, Z: 3.7, v: 1.55, dec: 0.42 };
function crownS(u) { const q = clamp(u, CRU.L, CRU.A) - CRU.L; return CRU.v * q - 0.5 * CRU.dec * q * q; }
function crownPath(s) { return CR.P0.clone().addScaledVector(CR.f0, s).addScaledVector(CR.s0, 0.05 * s * s); }
function crownPsi(s) { const tx = CR.f0.clone().addScaledVector(CR.s0, 0.1 * s); return Math.atan2(tx.x, tx.z); }
const _cY = new THREE.Vector3(0, 1, 0), _cM = new THREE.Matrix4();
function crownOrient(psi, theta, phi, q) { const f = _v(Math.sin(psi), 0, Math.cos(psi)), sd = _v(Math.cos(psi), 0, -Math.sin(psi));
  const a = sd.clone().multiplyScalar(Math.cos(theta)).addScaledVector(_cY, Math.sin(theta)), uu = _cY.clone().multiplyScalar(Math.cos(theta)).addScaledVector(sd, -Math.sin(theta));
  const lx = f.clone().multiplyScalar(Math.cos(phi)).addScaledVector(uu, Math.sin(phi)), lz = new THREE.Vector3().crossVectors(lx, a); q.setFromRotationMatrix(_cM.makeBasis(lx, a, lz)); return { a, uu }; }
function crownState(u, o) { const r = CROWN.r, b = CROWN.b;
  if (u <= CRU.F) { o.position.copy(CR.Pc); crownOrient(crownPsi(0), Math.PI / 2, 0, o.quaternion); return o; }
  if (u < CRU.L) { const k = (u - CRU.F) / (CRU.L - CRU.F), th = Math.PI / 2 * (1 - k), ph = -k * 2.6, { a, uu } = crownOrient(crownPsi(0), th, ph, o.quaternion);
    const end = CR.P0.clone().addScaledVector(_cY, r).addScaledVector(CR.s0, b); o.position.copy(CR.Pc).lerp(end, k); o.position.y = lerp(CR.Pc.y, end.y, k * k) + 0.18 * Math.sin(k * Math.PI) * (1 - k); return o; }
  const s = crownS(u), uA = CRU.A;
  if (u <= uA) { const th = u < CRU.R ? 0 : 0.09 * Math.sin((u - CRU.R) * 5.2), lift = u < CRU.R ? 0.12 * Math.sin(Math.PI * (u - CRU.L) / (CRU.R - CRU.L)) : 0;
    const { a, uu } = crownOrient(crownPsi(s), th, -s / r - 2.6, o.quaternion); o.position.copy(crownPath(s)).addScaledVector(uu, r).addScaledVector(a, b); o.position.y += lift; return o; }
  // se acuesta girando: el centro casi quieto, la inclinación sube cada vez más deprisa y el giro (precesión) se acelera; al final queda de pie
  const sA = crownS(uA), psiA = crownPsi(sA), thA = 0.09 * Math.sin((uA - CRU.R) * 5.2), T = CRU.Z - uA, tau = Math.min(u - uA, T), w = tau / T, e = Math.pow(w, 1.8);
  const th = lerp(thA, Math.PI / 2, e), psi = psiA + (3 * w + 25 * Math.pow(w, 4) / 4) * T * 0.8, vA = CRU.v - CRU.dec * (uA - CRU.L);
  const { a, uu } = crownOrient(psi, th, -sA / r - 2.6 - tau * 2.5 * (1 - e), o.quaternion);
  const q0 = new THREE.Quaternion(), r0 = crownOrient(psiA, thA, 0, q0), CA = crownPath(sA).addScaledVector(r0.uu, r).addScaledVector(r0.a, b);
  const C0 = CA.addScaledVector(CR.f0, vA * (tau - tau * tau / (2 * T))); o.position.set(C0.x, CR.P0.y + r * Math.cos(th) + b * Math.sin(th), C0.z); return o; }
