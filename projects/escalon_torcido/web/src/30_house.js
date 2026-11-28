// ---------------------------------------------------------------- «El escalón torcido»: LA CASA CORTADA de dos plantas («casa de muñecas») sobre una isla que flota
// en el cielo del amanecer, con un árbol detrás (se ve por la misma ventana desde las dos plantas: las estaciones pasan por ahí).
// Unidades en metros: x a la derecha, y arriba, z hacia la cámara. La fachada de delante no existe (se ve el corte de muros, forjado y tejado).
//   planta baja: suelo y = 0, techo 2,4 · forjado 2,4–2,7 (con la trampilla y el contador «DÍA 365» en su canto) · planta alta: 2,7–5,2 · tejado a dos aguas (cumbrera 6,7)
const HO = { W: 4.6, D: 3.2, WT: 0.18, H1: 2.4, SL: 0.3, H2: 2.5, RIDGE: 6.7, EAVE: 5.2 };
HO.x0 = -HO.W / 2; HO.x1 = HO.W / 2; HO.zb = -HO.D / 2; HO.zf = HO.D / 2; HO.y2 = HO.H1 + HO.SL; HO.y3 = HO.y2 + HO.H2;
const HATCH = { x: 0.12, z: 0.42, s: 0.9 };                          // trampilla del forjado (encima del banco del de abajo)
const WIN = { x: 1.2, w: 0.92, h: 1.1, y1: 0.98, y2: 0.98 + HO.y2 };   // la misma ventana en las dos plantas (borde inferior a 0,98 m de cada suelo)
// materiales por zona: la planta alta cálida, la baja fría (la vida de cada uno)
function houseMats() {
  const [wc, wh] = stuccoCanvases([232, 204, 168], 41), [bc, bh] = stuccoCanvases([118, 134, 156], 43);
  const [fc, fh] = woodCanvases([176, 128, 84], 45, 512, 7), [gc, gh] = woodCanvases([92, 94, 100], 47, 512, 7);
  return {
    wallUp: texMat(wc, wh, [2, 1.2], { r: 0.92, ns: 0.35 }), wallDn: texMat(bc, bh, [2, 1.2], { r: 0.92, ns: 0.35 }),
    floorUp: texMat(fc, fh, [2.2, 1.6], { r: 0.7, ns: 0.6 }), floorDn: texMat(gc, gh, [2.2, 1.6], { r: 0.75, ns: 0.6 }),
    cut: stdM(0xf4efe6, 0.9), cutDark: stdM(0xd9d2c6, 0.9), slab: stdM(0xcfc7bb, 0.85), frame: stdM(0xf7f3ea, 0.55),
    roof: stdM(0x9a5a44, 0.8), roofIn: stdM(0xd8c9b2, 0.9), glass: new THREE.MeshPhysicalMaterial({ color: 0xeaf2ff, roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false }),
  }; }
// caja con el frente (cara +z, la del corte) en otro material
function cutBox(w, h, d, m, cut, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [m, m, m, m, cut, m]); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b; }
// un muro con un hueco rectangular (ventana): cuatro piezas alrededor. Muro en el plano x–y (grosor en z)
function wallWithHole(G, xa, xb, ya, yb, z, d, hx0, hx1, hy0, hy1, m, cut) {
  const p = (x0, x1, y0, y1) => { if (x1 - x0 < 1e-3 || y1 - y0 < 1e-3) return; G.add(cutBox(x1 - x0, y1 - y0, d, m, cut, (x0 + x1) / 2, (y0 + y1) / 2, z)); };
  p(xa, xb, ya, hy0); p(xa, xb, hy1, yb); p(xa, hx0, hy0, hy1); p(hx1, xb, hy0, hy1); }
// marco de ventana con cruz, cristal y alféizar (hueco centrado en x, de y0 a y0+h, en el muro de atrás)
function windowFrame(G, x, y0, w, h, M) { const z = HO.zb - HO.WT / 2, g = new THREE.Group(); G.add(g); const t = 0.05, dz = HO.WT + 0.02;
  for (const s of [-1, 1]) { g.add(box(t, h + t, dz, M.frame, x + s * (w / 2 - t / 2), y0 + h / 2, z)); g.add(box(w, t, dz, M.frame, x, y0 + (s > 0 ? h - t / 2 : t / 2), z)); }
  g.add(box(0.03, h, 0.05, M.frame, x, y0 + h / 2, z + 0.02)); g.add(box(w, 0.03, 0.05, M.frame, x, y0 + h * 0.58, z + 0.02));
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), M.glass); gl.position.set(x, y0 + h / 2, z - 0.02); gl.renderOrder = 2; g.add(gl);
  g.add(box(w + 0.16, 0.05, 0.2, M.frame, x, y0 - 0.025, HO.zb + 0.08)); return g; }
// la isla: tapa de hierba (cambia con las estaciones) y la panza de roca hacia abajo
function island(G) { const g = new THREE.Group(); G.add(g); const U = g.userData;
  const top = new THREE.CylinderGeometry(4.3, 4.05, 0.5, 72, 2); { const p = top.attributes.position, R = rng(3); for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      if (r > 1) { const k = 1 + 0.06 * Math.sin(a * 5 + 1) + 0.04 * Math.sin(a * 11 + 2); p.setX(i, x * k); p.setZ(i, z * k); } } top.computeVertexNormals(); }
  U.grass = new THREE.MeshStandardMaterial({ color: 0x8b9a62, roughness: 0.95 }); const tp = new THREE.Mesh(top, U.grass); tp.position.y = -0.4; tp.receiveShadow = true; g.add(tp);
  const rock = new THREE.ConeGeometry(4.15, 5.0, 40, 10); { const p = rock.attributes.position, R = rng(5); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const n = 1 + 0.12 * Math.sin(a * 7 + y * 1.3) + 0.08 * Math.sin(a * 13 - y * 2.1) + (R() - 0.5) * 0.06; p.setX(i, x * n); p.setZ(i, z * n); } rock.computeVertexNormals(); }
  const rk = new THREE.Mesh(rock, new THREE.MeshStandardMaterial({ color: 0x7a6656, roughness: 0.95, flatShading: true })); rk.rotation.x = Math.PI; rk.position.y = -0.65 - 2.5; g.add(rk);
  // camino de losas hasta la puerta (delante, a la derecha) y matas de hierba
  const R = rng(9); for (let i = 0; i < 4; i++) { const s = box(0.5 + R() * 0.15, 0.04, 0.34 + R() * 0.1, stdM(0xb9b0a2, 0.9), 1.4 + (R() - 0.5) * 0.3, -0.13, 2.05 + i * 0.5); s.rotation.y = (R() - 0.5) * 0.4; g.add(s); }
  return g; }
// el árbol de detrás (mismo para las dos plantas): tronco y ramas siempre; copa, flores y nieve según la estación
function seasonTree(G, x, z) { const g = new THREE.Group(); g.position.set(x, -0.15, z); G.add(g); const U = g.userData, bark = stdM(0x5a4636, 0.9);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, 3.4, 12), bark); tr.position.y = 1.7; tr.castShadow = true; g.add(tr);
  const R = rng(17); U.br = [];
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + R() * 0.5, L = 1.2 + R() * 0.8, b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, L, 8), bark); b.geometry.translate(0, L / 2, 0);
    b.position.set(0, 2.6 + R() * 1.0, 0); b.rotation.set(0.75 * Math.sin(a), 0, -0.75 * Math.cos(a)); b.castShadow = true; g.add(b); U.br.push(b); }
  U.leaf = new THREE.MeshStandardMaterial({ color: 0x6f9a4a, roughness: 0.85, flatShading: true }); U.crown = new THREE.Group(); U.crown.position.y = 3.7; g.add(U.crown);
  for (let i = 0; i < 11; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 + R() * 0.45, 1), U.leaf); s.position.set((R() - 0.5) * 2.2, (R() - 0.3) * 1.5, (R() - 0.5) * 1.6); s.castShadow = true; U.crown.add(s); }
  U.bloom = new THREE.MeshStandardMaterial({ color: 0xf7c6d6, roughness: 0.7, flatShading: true }); U.flowers = new THREE.Group(); U.crown.add(U.flowers);
  for (let i = 0; i < 70; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08 + R() * 0.06, 0), U.bloom); const a = R() * 6.28, e = R() * 1.4 - 0.4, r = 1.25 + R() * 0.35;
    s.position.set(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r * 0.8, Math.sin(a) * Math.cos(e) * r * 0.8); U.flowers.add(s); }
  U.snowM = new THREE.MeshStandardMaterial({ color: 0xf5f8ff, roughness: 0.6 }); U.snow = [];
  for (const b of U.br) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, 1.0, 6, 1, false, 0, Math.PI), U.snowM); s.geometry.translate(0, 0.62, 0.02); s.rotation.y = -Math.PI / 2; b.add(s); U.snow.push(s); }
  return g; }
// las estaciones: s ∈ [0, 4) → invierno (0), primavera (1), verano (2), otoño (3) y vuelta; devuelve pesos suaves
function seasonW(s) { const u = ((s % 4) + 4) % 4, w = [0, 0, 0, 0]; const i = Math.floor(u), f = sm5(u - i); w[i] = 1 - f; w[(i + 1) % 4] = f; return w; }
const SEAS = { grass: [0xdfe5ec, 0x6f9a48, 0x637f38, 0x86763a], leaf: [0x6f9a4a, 0x8cc25a, 0x5f8f3c, 0xd9822c], crown: [0.0, 0.85, 1.0, 0.9], bloom: [0, 1, 0, 0], snow: [1, 0, 0, 0] };
function seasonMix(arr, w) { const c = new THREE.Color(0, 0, 0), t = new THREE.Color(); for (let i = 0; i < 4; i++) { t.set(arr[i]); c.r += t.r * w[i]; c.g += t.g * w[i]; c.b += t.b * w[i]; } return c; }
function seasonAt(S0, s) { const w = seasonW(s), U = S0.tree.userData;
  S0.isl.userData.grass.color.copy(seasonMix(SEAS.grass, w)); U.leaf.color.copy(seasonMix(SEAS.leaf, w));
  const cr = SEAS.crown.reduce((a, v, i) => a + v * w[i], 0); U.crown.scale.setScalar(Math.max(0.001, 0.25 + 0.75 * cr)); U.crown.visible = cr > 0.02;
  U.flowers.visible = w[1] > 0.05; U.flowers.scale.setScalar(Math.max(0.001, w[1]) / Math.max(0.25, 0.25 + 0.75 * cr));
  const sn = w[0]; for (const s of U.snow) { s.visible = sn > 0.05; s.scale.set(1, 1, Math.max(0.001, sn)); }
  S0.season = w; }
// la casa entera: muros, suelos, forjado con trampilla, tejado con el agujero por donde sale la escalera, ventanas
function buildHouse(G) { const M = houseMats(), H = {}; S.HM = M; const g = new THREE.Group(); G.add(g); H.g = g;
  const { x0, x1, zb, zf, WT, H1, SL, y2, y3 } = HO, xo0 = x0 - WT, xo1 = x1 + WT;
  // zócalo y suelos
  g.add(cutBox(HO.W + 2 * WT + 0.3, 0.16, HO.D + WT + 0.3, M.slab, M.cutDark, 0, -0.08, -WT / 2));
  g.add(cutBox(HO.W, 0.02, HO.D, M.floorDn, M.floorDn, 0, 0.01, 0));
  // muro de atrás con las dos ventanas, muros laterales
  wallWithHole(g, xo0, xo1, 0, H1, zb - WT / 2, WT, WIN.x - WIN.w / 2, WIN.x + WIN.w / 2, WIN.y1, WIN.y1 + WIN.h, M.wallDn, M.cut);
  wallWithHole(g, xo0, xo1, y2, y3, zb - WT / 2, WT, WIN.x - WIN.w / 2, WIN.x + WIN.w / 2, WIN.y2, WIN.y2 + WIN.h, M.wallUp, M.cut);
  for (const [s, xc] of [[-1, x0 - WT / 2], [1, x1 + WT / 2]]) { g.add(cutBox(WT, H1, HO.D + WT, M.wallDn, M.cut, xc, H1 / 2, -WT / 2)); g.add(cutBox(WT, y3 - y2, HO.D + WT, M.wallUp, M.cut, xc, (y2 + y3) / 2, -WT / 2)); }
  // forjado (con el hueco de la trampilla) y el suelo de arriba
  { const hx0 = HATCH.x - HATCH.s / 2, hx1 = HATCH.x + HATCH.s / 2, hz0 = HATCH.z - HATCH.s / 2, hz1 = HATCH.z + HATCH.s / 2, yc = H1 + SL / 2, zA = zb - WT, zB = zf;
    const p = (xa, xb, za, zz) => { if (xb - xa < 1e-3 || zz - za < 1e-3) return; g.add(cutBox(xb - xa, SL, zz - za, M.slab, M.cut, (xa + xb) / 2, yc, (za + zz) / 2)); };
    p(xo0, xo1, zA, hz0); p(xo0, xo1, hz1, zB); p(xo0, hx0, hz0, hz1); p(hx1, xo1, hz0, hz1);
    const fl = (xa, xb, za, zz) => { if (xb - xa < 1e-3 || zz - za < 1e-3) return; const b = box(xb - xa, 0.02, zz - za, M.floorUp, (xa + xb) / 2, y2 + 0.01, (za + zz) / 2); g.add(b); };
    fl(x0, x1, zb, hz0); fl(x0, x1, hz1, zf); fl(x0, hx0, hz0, hz1); fl(hx1, x1, hz0, hz1);
    // las dos hojas de la trampilla (bisagras a los lados; se abren hacia arriba)
    H.hatch = []; const wood = stdM(0x9c6b42, 0.75), wdk = stdM(0x6e4a2e, 0.8);
    for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(HATCH.x + s * HATCH.s / 2, y2 + 0.02, HATCH.z); g.add(piv);
      const leaf = new THREE.Group(); piv.add(leaf); const lw = HATCH.s / 2 - 0.01; leaf.add(box(lw, 0.05, HATCH.s - 0.02, wood, -s * lw / 2, -0.025, 0)); for (const zz of [-0.3, 0.3]) leaf.add(box(lw * 0.9, 0.012, 0.05, wdk, -s * lw / 2, 0.006, zz));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 16), metal(0x8a8478, 0.4)); ring.rotation.x = Math.PI / 2; ring.position.set(-s * (lw - 0.06), 0.008, 0); leaf.add(ring);
      shadowAll(leaf); H.hatch.push({ piv, s }); }
    // marco del hueco visto desde abajo
    for (const [w, d, xx, zz] of [[HATCH.s + 0.08, 0.04, HATCH.x, hz0 - 0.02], [HATCH.s + 0.08, 0.04, HATCH.x, hz1 + 0.02], [0.04, HATCH.s, hx0 - 0.02, HATCH.z], [0.04, HATCH.s, hx1 + 0.02, HATCH.z]]) g.add(box(w, 0.04, d, M.frame, xx, H1 - 0.02, zz)); }
  // tejado a dos aguas: faldón izquierdo entero; el derecho con el agujero de la escalera; triángulo de atrás
  { const run = HO.W / 2 + WT + 0.25, rise = HO.RIDGE - HO.EAVE, Lr = Math.hypot(run, rise + 0.12), ang = Math.atan2(rise + 0.12, run), dz = HO.D + WT + 0.4, zc = -WT / 2 + 0.05, th = 0.14;
    H.roofAng = ang;
    const slope = (s) => { const grp = new THREE.Group(); grp.position.set(0, HO.RIDGE + 0.06, zc); grp.rotation.z = -s * ang; g.add(grp); return grp; };
    const L = slope(-1); L.add(cutBox(Lr, th, dz, M.roof, M.cut, -Lr / 2, 0, 0)); L.add(box(Lr, 0.02, dz - 0.1, M.roofIn, -Lr / 2, -th / 2 - 0.01, -0.02));
    const Rg = slope(1); H.roofR = Rg; const ha = ROOFHOLE.a, hb = ROOFHOLE.b, hz0 = ROOFHOLE.z0, hz1 = ROOFHOLE.z1;      // agujero: de a a b metros desde la cumbrera, de z0 a z1
    const piece = (u0, u1, za, zz) => { if (u1 - u0 < 1e-3 || zz - za < 1e-3) return; Rg.add(cutBox(u1 - u0, th, zz - za, M.roof, M.cut, (u0 + u1) / 2, 0, (za + zz) / 2 - zc)); Rg.add(box(u1 - u0, 0.02, zz - za, M.roofIn, (u0 + u1) / 2, -th / 2 - 0.01, (za + zz) / 2 - zc)); };
    const zA = zc - dz / 2, zB = zc + dz / 2; piece(0, ha, zA, zB); piece(hb, Lr, zA, zB); piece(ha, hb, zA, hz0); piece(ha, hb, hz1, zB);
    // tejas rotas en el borde del agujero
    const R = rng(23), tile = stdM(0x8a4e3a, 0.8); for (let i = 0; i < 9; i++) { const u = ha + R() * (hb - ha), z = (R() < 0.5 ? hz0 : hz1) - zc + (R() - 0.5) * 0.1, tb = box(0.16, 0.03, 0.12, tile, u, th / 2 + 0.01, z); tb.rotation.set((R() - 0.5) * 0.6, R(), (R() - 0.5) * 0.6); Rg.add(tb); }
    // triángulo del muro de atrás (hastial)
    const sh = new THREE.Shape(); sh.moveTo(xo0, y3); sh.lineTo(xo1, y3); sh.lineTo(0, HO.RIDGE); sh.lineTo(xo0, y3); const gg = new THREE.ExtrudeGeometry(sh, { depth: WT, bevelEnabled: false }); gg.translate(0, 0, zb - WT);
    const gm = new THREE.Mesh(gg, [M.wallUp, M.cut]); gm.castShadow = gm.receiveShadow = true; g.add(gm);
    const ridge = box(0.16, 0.16, dz + 0.04, M.roof, 0, HO.RIDGE + 0.1, zc); ridge.rotation.z = Math.PI / 4; g.add(ridge); }
  H.win = [windowFrame(g, WIN.x, WIN.y1, WIN.w, WIN.h, M), windowFrame(g, WIN.x, WIN.y2, WIN.w, WIN.h, M)];
  // rodapiés y una lámpara de techo apagada en cada planta (detalle de casa de verdad)
  for (const [y, m] of [[0, M.frame], [y2, M.frame]]) { g.add(box(HO.W, 0.08, 0.02, m, 0, y + 0.04, zb + 0.01)); for (const s of [-1, 1]) g.add(box(0.02, 0.08, HO.D, m, s * (HO.W / 2 - 0.01), y + 0.04, 0)); }
  shadowAll(g, true, true); return H; }
const ROOFHOLE = { a: 0.17, b: 1.86, z0: -1.32, z1: -0.48 };        // el agujero por donde sale la escalera (metros por el faldón desde la cumbrera, y z)
// el contador del canto del forjado: «DÍA 365» (se repinta al cambiar)
function slabCounter(G) { const c = cnv(2048, 180), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.55, transparent: true });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(HO.W + 2 * HO.WT - 0.1, (HO.W + 2 * HO.WT - 0.1) * 180 / 2048), m); p.position.set(0, HO.H1 + HO.SL / 2, HO.zf + 0.004); G.add(p);
  const U = { c, t, m, key: '' }; p.userData = U; return p; }
function counterDraw(p, st) { const U = p.userData, key = JSON.stringify(st); if (key === U.key) return; U.key = key; const g = U.c.getContext('2d'), W = U.c.width, H = U.c.height;
  g.clearRect(0, 0, W, H); g.textBaseline = 'middle'; g.textAlign = 'center';
  g.font = '700 118px SpaceMono'; g.letterSpacing = '22px'; g.fillStyle = st.col || '#2c2a28'; g.fillText(st.txt, W / 2, H / 2 + 4); U.t.needsUpdate = true; }
