// ---------------------------------------------------------------- EL HOTEL de @jossl53g (esquina sureste): vestíbulo de cristal con marquesina «HOTEL», ocho
// plantas con balcones de cristal y habitaciones encendidas (se apagan con el apagón y vuelven planta a planta), y en la azotea la piscina iluminada,
// tumbonas y el bar de copas con neón, guirnalda de bombillas y botellas que brillan.
const HOT = { X0: 25.6, X1: 35.6, Z0: 23.5, Z1: 33.5, G0: 4.5, FH: 3.2, NF: 8 };
HOT.TOP = HOT.G0 + HOT.NF * HOT.FH;   // suelo de la azotea (≈ 30,1 m)
// agua de la piscina: turquesa que brilla, con cáusticas que se mueven
const POOL_FS_INJ = `
  vec2 pq = vWP.xz * 1.6; float ca = 0.0;
  for (int i = 0; i < 3; i++) { float fi = float(i); ca += sin(pq.x * (1.3 + fi * 0.7) + poolT * (1.1 + fi * 0.4) + sin(pq.y * (1.7 - fi * 0.3) + poolT * 0.8)) ; }
  ca = pow(0.5 + 0.5 * sin(ca * 1.4), 6.0);
  totalEmissiveRadiance = vec3(0.05, 0.55, 0.72) * 1.35 + vec3(0.7, 1.0, 1.0) * ca * 0.9;`;
function poolMat() { const m = new THREE.MeshStandardMaterial({ color: 0x0a4a5a, roughness: 0.08, metalness: 0.0, emissive: 0x000000 }); S.poolT = S.poolT || { value: 0 };
  m.onBeforeCompile = sh => { sh.uniforms.poolT = S.poolT; sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vWP;\nuniform float poolT;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + POOL_FS_INJ); };
  m.customProgramCacheKey = () => 'pool1'; return m; }
// guirnalda de bombillas entre dos puntos (catenaria)
function festoon(G, a, b, n, sag, zone) { const m = nightMat(new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xffc870, emissiveIntensity: 6, roughness: 0.3 }), zone); const pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n, p = a.clone().lerp(b, u); p.y -= sag * 4 * u * (1 - u); pts.push(p); if (i > 0 && i < n) { const s = sph(0.045, m, 8, 6); s.position.copy(p).add(_v(0, -0.06, 0)); G.add(s); } }
  const curve = new THREE.CatmullRomCurve3(pts), w = new THREE.Mesh(new THREE.TubeGeometry(curve, n * 3, 0.008, 4), stdM(0x111111, 0.6)); G.add(w); return pts; }
function lounger(m) { const g = new THREE.Group(); g.add(box(0.7, 0.08, 1.9, m, 0, 0.32, 0)); const back = box(0.7, 0.08, 0.7, m, 0, 0.55, -0.78); back.rotation.x = -0.75; g.add(back); for (const [x, z] of [[-0.3, -0.8], [0.3, -0.8], [-0.3, 0.8], [0.3, 0.8]]) g.add(box(0.05, 0.3, 0.05, T.iron, x, 0.15, z)); return g; }
function buildHotel(G) {
  const g = new THREE.Group(); G.add(g); S.hotel = g; const U = g.userData; const { X0, X1, Z0, Z1, G0, FH, NF } = HOT, W = X1 - X0, D = Z1 - Z0, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
  const conc = stdM(0xb9b3a8, 0.6), dark = stdM(0x23262b, 0.5), glassR = new THREE.MeshPhysicalMaterial({ color: 0x9fc0d0, roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false });
  // núcleo y forjados: cajas de cada planta (con las paredes interiores de las habitaciones detrás del cristal)
  g.add(box(W - 0.6, HOT.TOP, D - 0.6, stdM(0x3a3e44, 0.8), cx, HOT.TOP / 2, cz + 0.3));
  // vestíbulo: fachada de cristal con montantes, suelo de mármol, mostrador, lámparas y plantas
  { const lob = new THREE.Group(); g.add(lob); const gl = new THREE.Mesh(new THREE.PlaneGeometry(W - 1.0, G0 - 0.4), T.glass); gl.position.set(cx, (G0 - 0.4) / 2 + 0.05, Z0 - 0.02); gl.rotation.y = Math.PI; lob.add(gl);
    for (let i = 0; i <= 8; i++) lob.add(box(0.08, G0 - 0.3, 0.12, dark, X0 + 0.5 + i * (W - 1.0) / 8, (G0 - 0.3) / 2, Z0));
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, 5), texOf(marbleCanvas(57, 512, true), [3, 1.5]) ? new THREE.MeshPhysicalMaterial({ map: texOf(marbleCanvas(57, 512, true), [3, 1.5]), roughness: 0.15, clearcoat: 0.6 }) : conc); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, 0.02, Z0 + 2.5); lob.add(fl);
    lob.add(box(W - 1, G0, 0.2, stdM(0xb59a6e, 0.6), cx, G0 / 2, Z0 + 5.0)); lob.add(box(3.2, 1.1, 0.7, stdM(0x2b2018, 0.5), cx + 1.5, 0.55, Z0 + 3.6)); lob.add(box(3.3, 0.06, 0.8, T.gold, cx + 1.5, 1.12, Z0 + 3.6));
    const lg = nightMat(new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xffd08a, emissiveIntensity: 4.5, roughness: 0.3 }), 'sur'); for (const x of [-3, 0, 3]) { const l = sph(0.28, lg, 16, 12); l.scale.y = 0.6; l.position.set(cx + x, G0 - 0.7, Z0 + 2.3); lob.add(l); lob.add(box(0.01, 0.5, 0.01, dark, cx + x, G0 - 0.3, Z0 + 2.3)); }
    for (const x of [-4, 4]) { const pot = cyl(0.3, 0.25, 0.6, stdM(0x2a2a2a, 0.5), 16); pot.position.set(cx + x, 0.3, Z0 + 1.0); lob.add(pot); const t = leafBlob(7); const lb = new THREE.Mesh(t, stdM(0x2f6b3a, 0.8)); lb.scale.setScalar(0.5); lb.position.set(cx + x, 1.2, Z0 + 1.0); lob.add(lb); }
    nightSrc(_v(cx, 3.3, Z0 + 2.4), 0xffe2b8, 34, 4.8, 'sur'); nightSrc(_v(cx, 1.2, Z0 - 1.2), 0xffd9a8, 14, 3.2, 'sur'); }
  // marquesina con «HOTEL» encima y focos abajo; placa «de @jossl53g»
  { const mq = box(5.2, 0.28, 2.6, dark, cx, G0 - 0.6, Z0 - 1.3); g.add(mq); for (const s of [-1, 1]) g.add(box(0.08, G0 - 0.6, 0.08, T.gold, cx + s * 2.45, (G0 - 0.6) / 2, Z0 - 2.5));
    const word = signPlane(4.2, 0.7, 1024, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#ffe9b0'; c.font = '900 150px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '40px'; c.fillText('HOTEL', w / 2, h / 2 + 8); }, { r: 0.5, glow: 3.0 });
    word.material.transparent = true; word.position.set(cx, G0 + 0.0, Z0 - 2.55); word.rotation.y = Math.PI; g.add(word); nightMat(word.material, 'sur');
    const plate = signPlane(1.5, 0.4, 512, (c, w, h) => { c.fillStyle = '#1b1d22'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8c35a'; c.font = '700 54px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('de @jossl53g', w / 2, h / 2 + 2); }, { r: 0.4, glow: 1.2 });
    plate.position.set(cx - 3.6, 2.4, Z0 - 0.03); plate.rotation.y = Math.PI; g.add(plate); nightMat(plate.material, 'sur');
    const dm = nightMat(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d0, emissiveIntensity: 5, roughness: 0.3 }), 'sur'); for (const x of [-1.6, 0, 1.6]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.12, 14), dm); d.rotation.x = Math.PI / 2; d.position.set(cx + x, G0 - 0.75, Z0 - 1.5); g.add(d); }
    nightSrc(_v(cx, G0 - 1.0, Z0 - 1.6), 0xfff0d8, 22, 3.6, 'sur'); }
  // plantas: cada una con su banda de hormigón, cristal y habitaciones (luz cálida o apagadas) y tres balcones a la calle (norte)
  const R = rng(1201); U.floors = [];
  for (let f = 0; f < NF; f++) { const y0 = G0 + f * FH, fl = { y: y0, mats: [] }; g.add(box(W + 0.2, 0.32, D + 0.2, conc, cx, y0 + 0.16, cz));
    for (const [face, nx, nz] of [['n', 0, -1], ['e', 1, 0], ['w', -1, 0]]) { const len = face === 'n' ? W : D, n = face === 'n' ? 5 : 4;
      for (let i = 0; i < n; i++) { const u = -len / 2 + (i + 0.5) * len / n; const lit = R() < 0.62; const col = [0xffb05a, 0xff9a48, 0xffc98a, 0x8fb0ff][Math.floor(R() * 4)];
        const m = new THREE.MeshStandardMaterial({ color: 0x1a1d22, emissive: lit ? col : 0x000000, emissiveIntensity: lit ? 0.75 + R() * 0.5 : 0, roughness: 0.25 }); fl.mats.push({ m, I: m.emissiveIntensity });
        const pnl = new THREE.Mesh(new THREE.PlaneGeometry(len / n - 0.25, FH - 0.55), m), mid = FH / 2 + 0.16;
        if (face === 'n') { pnl.position.set(cx + u, y0 + mid, Z0 - 0.02); pnl.rotation.y = Math.PI; } else { pnl.position.set(face === 'e' ? X1 + 0.02 : X0 - 0.02, y0 + mid, cz + u); pnl.rotation.y = nx * Math.PI / 2; }
        g.add(pnl); if (lit && R() < 0.75) { const cur = new THREE.Mesh(new THREE.PlaneGeometry(0.5, FH - 0.7), stdM(0xe8dcc0, 0.9)); cur.position.copy(pnl.position).add(_v(nx * 0.01, 0, nz * 0.01)); cur.position[face === 'n' ? 'x' : 'z'] += (len / n) * 0.3; cur.rotation.copy(pnl.rotation); g.add(cur); }
        const mul = box(0.06, FH - 0.32, 0.06, dark, 0, 0, 0); if (face === 'n') mul.position.set(cx + u - len / n / 2, y0 + mid, Z0 - 0.05); else mul.position.set(face === 'e' ? X1 + 0.05 : X0 - 0.05, y0 + mid, cz + u - len / n / 2); g.add(mul); } }
    // balcones (norte): losa, cristal y pasamanos
    for (const bx of [cx - 3.3, cx, cx + 3.3]) { g.add(box(2.4, 0.16, 1.3, conc, bx, y0 + 0.08, Z0 - 0.65)); const gr = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.0), glassR); gr.position.set(bx, y0 + 0.66, Z0 - 1.3); g.add(gr); g.add(box(2.42, 0.05, 0.05, T.gold, bx, y0 + 1.17, Z0 - 1.3)); }
    U.floors.push(fl); }
  // azotea: suelo de madera, pretil de cristal, la piscina, tumbonas y el bar
  const T0 = HOT.TOP, [wc, wh] = woodCanvases([150, 110, 74], 31), deck = texMat(wc, wh, [4, 4], { r: 0.6, ns: 0.5 });
  { const dk = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.2, D + 0.2), deck); dk.rotation.x = -Math.PI / 2; dk.position.set(cx, T0 + 0.33, cz); dk.receiveShadow = true; g.add(dk); g.add(box(W + 0.2, 0.33, D + 0.2, conc, cx, T0 + 0.16, cz));
    for (const [x, z, w, d] of [[cx, Z0 - 0.05, W + 0.2, 0.06], [cx, Z1 + 0.05, W + 0.2, 0.06], [X0 - 0.05, cz, 0.06, D + 0.2], [X1 + 0.05, cz, 0.06, D + 0.2]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), glassR); p.position.set(x, T0 + 0.33 + 0.55, z); g.add(p); g.add(box(w + 0.02, 0.05, d + 0.04, T.gold, x, T0 + 0.33 + 1.12, z)); } }
  const PY = T0 + 0.33; U.PY = PY;
  { // la piscina (vaso elevado con borde de piedra): agua que brilla y luz turquesa
    const pw = 6.6, pd = 3.0, px = cx + 1.2, pz = cz + 1.6; U.pool = { x: px, z: pz, w: pw, d: pd };
    const rim = stdM(0xe8e2d6, 0.5); for (const [x, z, w, d] of [[px, pz - pd / 2 - 0.15, pw + 0.6, 0.3], [px, pz + pd / 2 + 0.15, pw + 0.6, 0.3], [px - pw / 2 - 0.15, pz, 0.3, pd], [px + pw / 2 + 0.15, pz, 0.3, pd]]) g.add(box(w, 0.62, d, rim, x, PY + 0.31, z));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd, 1, 1), poolMat()); water.rotation.x = -Math.PI / 2; water.position.set(px, PY + 0.5, pz); g.add(water); U.water = water;
    g.add(box(pw, 0.5, pd, stdM(0x0d5a6a, 0.3), px, PY + 0.24, pz));
    nightSrc(_v(px, PY + 1.2, pz), 0x3fd8ff, 30, 4.6, 'pool'); nightSrc(_v(px - 2.5, PY + 1.0, pz), 0x3fd8ff, 14, 3.0, 'pool');
    for (let i = 0; i < 4; i++) { const l = lounger(stdM(0xf2efe8, 0.7)); l.position.set(px - 2.6 + i * 1.6, PY, pz - pd / 2 - 1.7); l.rotation.y = Math.PI; g.add(l); }
    for (const x of []) { const u = new THREE.Group(); u.position.set(x, PY, pz - pd / 2 - 2.6); g.add(u); u.add(cyl(0.025, 0.025, 2.3, stdM(0xd8d2c4, 0.4), 8)); u.children[0].position.y = 1.15; const top = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.45, 12, 1, true), stdM(0xf2efe8, 0.8, { side: THREE.DoubleSide })); top.position.y = 2.3; u.add(top); } }
  { // el bar de copas (esquina noroeste): barra iluminada, botellas que brillan, neón «COPAS», taburetes y guirnalda de bombillas
    const bx = X0 + 1.4, bz = Z0 + 3.2; U.bar = { x: bx, z: bz };
    const front = new THREE.MeshStandardMaterial({ color: 0x1a1214, emissive: 0xff3d8a, emissiveIntensity: 0.0, roughness: 0.4 }); g.add(box(0.7, 1.1, 3.4, stdM(0x2a1d1a, 0.4), bx, PY + 0.55, bz)); g.add(box(0.85, 0.06, 3.5, T.gold, bx, PY + 1.13, bz));
    const strip = nightMat(new THREE.MeshStandardMaterial({ color: 0x220a14, emissive: 0xff3d8a, emissiveIntensity: 3.0, roughness: 0.4 }), 'bar'); g.add(box(0.02, 0.06, 3.4, strip, bx + 0.36, PY + 0.2, bz));
    const back = box(0.3, 2.4, 3.6, stdM(0x2b2224, 0.6), X0 + 0.25, PY + 1.2, bz); g.add(back);
    const bot = [0xff5a5a, 0x5ad8ff, 0xffd45a, 0x7aff8a, 0xff8ad8].map(c => nightMat(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: 1.6, roughness: 0.15, transparent: true, opacity: 0.9 }), 'bar'));
    for (let l = 0; l < 3; l++) { g.add(box(0.3, 0.03, 3.4, T.gold, X0 + 0.45, PY + 1.0 + l * 0.45, bz)); for (let i = 0; i < 11; i++) { const b = cyl(0.035, 0.035, 0.26, bot[(i + l * 2) % 5], 10); b.position.set(X0 + 0.45, PY + 1.15 + l * 0.45, bz - 1.5 + i * 0.3); g.add(b); } }
    const neon = signPlane(2.2, 0.62, 1024, (c, w, h) => { c.clearRect(0, 0, w, h); c.shadowColor = '#ff3d8a'; c.shadowBlur = 30; c.strokeStyle = '#ffd1e6'; c.lineWidth = 10; c.font = 'italic 900 200px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText('COPAS', w / 2, h / 2 + 10); }, { r: 0.4, glow: 4.0 });
    neon.material.transparent = true; neon.position.set(X0 + 0.42, PY + 2.75, bz); neon.rotation.y = Math.PI / 2; g.add(neon); nightMat(neon.material, 'bar');
    for (let i = 0; i < 4; i++) { const st = stool(stdM(0x2a1d1a, 0.5)); st.position.set(bx + 0.75, PY, bz - 1.2 + i * 0.8); g.add(st); }
    nightSrc(_v(bx + 0.6, PY + 2.4, bz), 0xff7ab8, 26, 3.6, 'bar'); nightSrc(_v(bx + 1.6, PY + 2.6, bz + 2.6), 0xffd08a, 18, 4.0, 'bar');
    // postes y guirnaldas de bombillas sobre la terraza
    const posts = [_v(X0 + 0.5, PY, Z0 + 0.6), _v(X1 - 0.5, PY, Z0 + 0.6), _v(X0 + 0.5, PY, Z1 - 0.6), _v(X1 - 0.5, PY, Z1 - 0.6)];
    for (const p of posts) { const c = cyl(0.04, 0.05, 3.2, T.iron, 8); c.position.copy(p).add(_v(0, 1.6, 0)); g.add(c); }
    for (const [a, b] of [[0, 3], [1, 2], [0, 1], [2, 3]]) festoon(g, posts[a].clone().add(_v(0, 3.15, 0)), posts[b].clone().add(_v(0, 3.15, 0)), 16, 0.6, 'bar'); }
  // «HOTEL» en vertical en la esquina de la fachada (rojo), visible desde la plaza
  { const v = signPlane(1.2, 7.5, 512, (c, w, h) => { c.fillStyle = '#16070a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff4d5e'; c.font = '900 150px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; 'HOTEL'.split('').forEach((ch, i) => c.fillText(ch, w / 2, (i + 0.55) * h / 5.2)); }, { r: 0.4, glow: 3.2 });
    v.position.set(X0 - 0.35, HOT.TOP - 5.5, Z0 - 0.35); v.rotation.y = Math.PI * 1.25; g.add(v); nightMat(v.material, 'sur'); U.vsign = v; nightSrc(_v(X0 - 1.2, HOT.TOP - 5.5, Z0 - 1.2), 0xff4d5e, 18, 4.5, 'sur'); }
  shadowAll(g, true, true);
  return g; }
// las plantas del hotel se encienden de abajo arriba cuando vuelve la luz (k: 0 → 1)
function hotelPower(k, t) { const U = S.hotel.userData; U.floors.forEach((fl, f) => { const on = clamp(k * (U.floors.length + 1.5) - f, 0, 1), fl2 = on > 0 && on < 1 ? on * (0.6 + 0.4 * Math.sin(t * 60 + f)) : on; for (const e of fl.mats) e.m.emissiveIntensity = e.I * fl2; }); }
