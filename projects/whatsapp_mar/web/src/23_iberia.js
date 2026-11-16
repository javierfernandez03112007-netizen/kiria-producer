// ---------------------------------------------------------------- 23 · IBERIA: la costa de Portugal (la estación del cable) y un pueblo blanco de España de noche
// (la cocina de la madre, su móvil, la antena y el tubo de fibra bajo la calle). Marco local: origen en la orilla (x = 0), y = 0 nivel del mar,
// tierra x ∈ [0, 60] (+x tierra adentro), z ∈ [−20, 20] (+z hacia la cara de cristal delantera). El mar (x < 0) no es de esta pieza.
// API: buildIberia() → Group (userData.anchors) · iberiaAt(t, {type, send, waves, pulse, pulse2}) · IBE_CAM_IN(u) / IBE_CAM_OUT(u) → [px,py,pz, lx,ly,lz, fov]
const IBE = { Q: {} };
const ibeSm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
function ibeG(x) { return -0.25 + 1.05 * ibeSm(0, 4.2, x) + 2.45 * ibeSm(4.2, 7.6, x) + 0.35 * ibeSm(8, 60, x); }     // el suelo (playa, duna, llano del pueblo)
const IBE_TY = 1.75, IBE_TZ = 20, IBE_TR = 0.3;               // el tubo bajo la calle: y del eje, z de la cara de corte, radio
const IBE_WX = 40.2, IBE_WZ = 13;                              // ventana de la cocina: centro en x y fachada (z)
const IBE_YF = ibeG(40.5) + 0.15;                              // suelo de la cocina
const IBE_WY = IBE_YF + 1.62;                                  // centro de la ventana
const IBE_TWX = 30, IBE_TWZ = -6, IBE_TWG = ibeG(30), IBE_TWH = 25;   // la torre
const IBE_MOM = v3(39.3, IBE_YF, 11.35);                       // la madre (suelo bajo su silla); mira hacia −z
const IBE_TXT = 'Hijo, ¿dónde estás?';

// ---------- texturas y materiales
function ibeUV(geo, sx, sy) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); return geo; }
function ibeRep(t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function ibeMats() {
  if (IBE.M) return IBE.M; const M2 = {};
  const plaster = ibeRep(canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f3eee4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const a = 0.03 + hash(i * 1.3) * 0.07; g.fillStyle = hash(i * 2.7) > 0.5 ? `rgba(110,100,85,${a})` : `rgba(255,255,255,${a})`; g.fillRect(hash(i * 3.1) * w, hash(i * 4.3) * h, 1 + hash(i) * 3, 1 + hash(i * 5.5) * 3); } }));
  M2.wall = new THREE.MeshStandardMaterial({ map: plaster, color: 0xf6f2ea, roughness: 0.92, emissive: 0x1b2236, emissiveIntensity: 0.55 });   // cal (con un poco de «luz de luna» propia)
  M2.wallIn = new THREE.MeshStandardMaterial({ map: plaster, color: 0xfff4e2, roughness: 0.9, side: THREE.DoubleSide });
  const tiles = ibeRep(canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5a2414'; g.fillRect(0, 0, w, h); const rows = 8, cols = 6, tw = w / cols, th = h / rows;
    for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) { const x = (c + (r % 2) * 0.5) * tw, y = r * th, b = 150 + hash(r * 7.1 + c * 3.3) * 50;
      const gr = g.createLinearGradient(x, 0, x + tw, 0); gr.addColorStop(0, `rgb(${b * 0.55 | 0},${b * 0.22 | 0},${b * 0.13 | 0})`); gr.addColorStop(0.5, `rgb(${b + 45 | 0},${b * 0.5 + 12 | 0},${b * 0.3 | 0})`); gr.addColorStop(1, `rgb(${b * 0.5 | 0},${b * 0.2 | 0},${b * 0.12 | 0})`);
      g.fillStyle = gr; rr(g, x + 2, y - 4, tw - 4, th + 4, 9); g.fill(); g.fillStyle = 'rgba(20,6,2,.45)'; g.fillRect(x + 2, y + th - 3, tw - 4, 3); } }));
  M2.roof = new THREE.MeshStandardMaterial({ map: tiles, color: 0xffffff, roughness: 0.75, emissive: 0x24100a, emissiveIntensity: 0.6 });
  M2.roofEdge = new THREE.MeshStandardMaterial({ color: 0x8a3c22, roughness: 0.8 });
  M2.glassDark = new THREE.MeshStandardMaterial({ color: 0x18233a, roughness: 0.12, metalness: 0.4, emissive: 0x0a1222, emissiveIntensity: 1 });
  const curtain = canvasTex(128, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#7a3a14'); gr.addColorStop(0.22, '#ffcf8a'); gr.addColorStop(0.5, '#fff0c8'); gr.addColorStop(0.78, '#ffcf8a'); gr.addColorStop(1, '#7a3a14'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(60,30,10,.85)'; g.fillRect(w / 2 - 3, 0, 6, h); g.fillRect(0, h * 0.42, w, 6); });
  M2.glassLit = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb45c, emissiveMap: curtain, emissiveIntensity: 1.25, roughness: 0.5 });
  M2.glassLit2 = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc98a, emissiveMap: curtain, emissiveIntensity: 0.8, roughness: 0.5 });
  M2.frame = new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.8, emissive: 0x161a26, emissiveIntensity: 0.5 });
  M2.iron = new THREE.MeshStandardMaterial({ color: 0x1d1f24, roughness: 0.5, metalness: 0.6 });
  M2.wood = new THREE.MeshStandardMaterial({ color: 0x6b4026, roughness: 0.65 });
  M2.woodL = new THREE.MeshStandardMaterial({ color: 0xa8743f, roughness: 0.6 });
  M2.shutter = [0x3d6b4c, 0x2f5f8f, 0x6e3b2a, 0x3d6b4c].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: c, emissiveIntensity: 0.12 }));
  M2.zoc = [0xc79b52, 0x6f88a6, 0x9c5a3c].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, emissive: c, emissiveIntensity: 0.1 }));
  M2.pot = new THREE.MeshStandardMaterial({ color: 0xb4532e, roughness: 0.8 });
  M2.potB = new THREE.MeshStandardMaterial({ color: 0x2c5fb0, roughness: 0.4 });
  M2.leaf = new THREE.MeshStandardMaterial({ color: 0x2f6b2c, roughness: 0.85 });
  M2.flower = [0xe0243a, 0xff5fa0, 0xe0243a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: c, emissiveIntensity: 0.25 }));
  M2.lampBulb = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc070, emissiveIntensity: 3.2 });
  M2.concrete = new THREE.MeshStandardMaterial({ color: 0xdcd9d2, roughness: 0.9, emissive: 0x161a24, emissiveIntensity: 0.5 });
  M2.steel = new THREE.MeshStandardMaterial({ color: 0xc8cdd4, roughness: 0.4, metalness: 0.7, emissive: 0x1c2232, emissiveIntensity: 0.7 });
  M2.grey = new THREE.MeshStandardMaterial({ color: 0x8b9099, roughness: 0.55, metalness: 0.3 });
  M2.white = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.45, emissive: 0x1a2030, emissiveIntensity: 0.4 });
  M2.cable = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.45 });
  const cob = ibeRep(canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5d5a55'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) { const x = c * 25.6 + (r % 2) * 12.8, y = r * 25.6, b = 150 + hash(r * 13.1 + c * 7.7) * 45; g.fillStyle = `rgb(${b | 0},${b - 6 | 0},${b - 14 | 0})`; rr(g, x + 2, y + 2, 22, 22, 7); g.fill(); } }));
  M2.street = new THREE.MeshStandardMaterial({ map: cob, color: 0xcfcac2, roughness: 0.85 });
  M2.pvc = new THREE.MeshStandardMaterial({ color: 0xff7a1f, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x3a1400, emissiveIntensity: 0.5 });
  M2.gravel = new THREE.MeshStandardMaterial({ color: 0xc9b48c, roughness: 1, side: THREE.DoubleSide });
  M2.olive = new THREE.MeshStandardMaterial({ color: 0x5f6e47, roughness: 0.9, flatShading: true });
  M2.cypress = new THREE.MeshStandardMaterial({ color: 0x2b3d29, roughness: 0.9, flatShading: true });
  M2.trunk = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.9 });
  M2.rock = new THREE.MeshStandardMaterial({ color: 0x9a8c78, roughness: 0.95, flatShading: true });
  IBE.M = M2; return M2;
}
function ibeGlow(col, s, k = 1) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: new THREE.Color(col).multiplyScalar(k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sp.scale.setScalar(s); return sp; }
const ibeBox = (w, h, d, m, x, y, z) => { const o = mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };

// ---------- el suelo: playa, duna, llano; las calles; las caras de corte
function ibeTerrain(g) {
  const M2 = ibeMats(), geo = new THREE.PlaneGeometry(60, 40, 120, 80); geo.rotateX(-Math.PI / 2); geo.translate(30, 0, 0);
  const P = geo.attributes.position, col = [], c = new THREE.Color(), sand = new THREE.Color(0xd8bf8e), wet = new THREE.Color(0x9c8664), earth = new THREE.Color(0x6e5c44), grass = new THREE.Color(0x56603e);
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); let y = ibeG(x);
    if (x < 7.8) y += 0.06 * Math.sin(x * 3.1 + z * 0.7) * Math.sin(z * 1.3) * clamp(x / 2);
    else y += 0.05 * Math.sin(x * 0.9 + z * 1.7) * Math.sin(z * 0.6 - x * 0.4);
    P.setY(i, y);
    c.copy(wet).lerp(sand, ibeSm(0, 1.6, x)); c.lerp(earth, ibeSm(6.2, 8.4, x)); c.lerp(grass, 0.5 + 0.5 * Math.sin(x * 0.31 + z * 0.23) * Math.sin(z * 0.17)); if (x < 8) c.lerp(sand, 1 - ibeSm(6.2, 8.4, x));
    col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const t = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: 0x0d1018, emissiveIntensity: 1 })); t.receiveShadow = true; g.add(t);
  // calles (empedrado claro): la de delante (sobre el tubo), la de atrás y el callejón hacia la torre
  const strip = (x0, x1, z0, z1) => { const n = Math.max(2, Math.ceil((x1 - x0) / 0.5)), sg = new THREE.PlaneGeometry(x1 - x0, z1 - z0, n, 1); sg.rotateX(-Math.PI / 2); sg.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = sg.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, ibeG(p.getX(i)) + 0.09); sg.computeVertexNormals(); ibeUV(sg, (x1 - x0) / 2.2, (z1 - z0) / 2.2);
    const m = new THREE.Mesh(sg, M2.street); m.receiveShadow = true; g.add(m); return m; };
  strip(8.2, 60, 14.2, 20); strip(13, 60, 0.6, 5.4); strip(28.6, 31.6, 5.4, 14.2); strip(8.2, 13, 5, 14.2);
  // bordillos de la calle de delante
  g.add(ibeBox(51.8, 0.14, 0.18, M2.concrete, 34.1, ibeG(34) + 0.12, 14.2));
  // caras de corte: delante (z = 20, con el tubo cortado a lo largo), detrás (z = −20) y el final (x = 60)
  const xsA = [], xsB = [], xsC = [], xsD = [];
  for (let x = 0; x <= 8; x += 0.25) xsA.push(x); for (let x = 8; x <= 10; x += 0.5) xsB.push(x); for (let x = 10; x <= 30; x += 0.5) xsC.push(x); for (let x = 30; x <= 60; x += 0.5) xsD.push(x);
  const top = x => ibeG(x) + 0.02, sandB = { bot: -SEA, band: 0.6, bandCol: 0xcdb27f }, earthB = { bot: -SEA, band: 0.7, bandCol: 0x4c3c2c };
  g.add(strataFace(xsA, top, 20, sandB), strataFace(xsB, top, 20, earthB), strataFace(xsD, top, 20, earthB));
  g.add(strataFace(xsC, () => IBE_TY - 0.5, 20, { bot: -SEA }), strataFace(xsC, top, 20, { bot: IBE_TY + 0.5, band: 0.7, bandCol: 0x4c3c2c }));
  const all = [...xsA, ...xsB.slice(1), ...xsC.slice(1), ...xsD.slice(1)];
  g.add(strataFace(all.slice(0, 33), top, -20, sandB), strataFace(all.slice(32), top, -20, earthB));
  const zs = []; for (let z = -20; z <= 20; z += 0.5) zs.push(z); g.add(strataFace(zs, () => ibeG(60) + 0.02, 60, { bot: -SEA, band: 0.7, bandCol: 0x4c3c2c, normalX: 1 }));
  // la zanja del tubo en el corte: fondo de grava y techo/suelo
  const tr = new THREE.Mesh(new THREE.PlaneGeometry(20, 1.0), M2.gravel); tr.position.set(20, IBE_TY, IBE_TZ - 0.55); g.add(tr);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(20, 0.55), M2.gravel); p.rotation.x = Math.PI / 2; p.position.set(20, IBE_TY + s * 0.5, IBE_TZ - 0.275); g.add(p); }
  for (const x of [10, 30]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.0), M2.gravel); p.rotation.y = Math.PI / 2; p.position.set(x, IBE_TY, IBE_TZ - 0.275); g.add(p); }
  // el tubo (medio tubo naranja, abierto hacia el corte)
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(IBE_TR, IBE_TR, 20, 28, 1, true, Math.PI / 2, Math.PI), M2.pvc); pipe.rotation.z = Math.PI / 2; pipe.position.set(20, IBE_TY, IBE_TZ); g.add(pipe);
  // rocas en la duna
  for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + hash(i * 3.7) * 0.5, 0), M2.rock); const x = 4.8 + hash(i * 1.9) * 2.4, z = -18 + hash(i * 5.3) * 36; r.position.set(x, ibeG(x) - 0.1, z); r.rotation.set(hash(i) * 3, hash(i * 2) * 3, 0); r.scale.y = 0.6; r.castShadow = r.receiveShadow = true; g.add(r); }
}

// ---------- una casa encalada: o = {x0, x1, z0, z1, h, roof: 'gable'|'flat', zoc, sh, lit: [..], door, balcony, pots}
function ibeHouse(g, o) {
  const M2 = ibeMats(), { x0, x1, z0, z1, h } = o, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, G = ibeG(cx) + 0.09;
  const body = mesh(ibeUV(new THREE.BoxGeometry(w, h + 0.6, d), w / 2.5, (h + 0.6) / 2.5), M2.wall); body.position.set(cx, G + h / 2 - 0.3, cz); g.add(body);
  g.add(ibeBox(w + 0.04, 0.6, d + 0.04, M2.zoc[o.zoc ?? 0], cx, G, cz));
  if (o.roof === 'flat') {
    for (const [a, b, c2, e] of [[w + 0.1, 0.12, cx, z1], [w + 0.1, 0.12, cx, z0], [0.12, d, x0, cz], [0.12, d, x1, cz]]) g.add(ibeBox(a, 0.5, b === 0.12 ? 0.12 : b, M2.wall, c2, G + h + 0.2, e));
    g.add(ibeBox(w + 0.2, 0.08, 0.2, M2.roofEdge, cx, G + h + 0.48, z1));
    const ch = ibeBox(0.5, 0.9, 0.5, M2.wall, x0 + w * 0.75, G + h + 0.4, cz - d * 0.2); g.add(ch); g.add(ibeBox(0.7, 0.08, 0.7, M2.roofEdge, ch.position.x, G + h + 0.88, ch.position.z));
  } else {
    const rh = o.rh ?? Math.min(1.5, d * 0.24), R = d / 2 + 0.35, rise = rh * R / (d / 2), L = Math.hypot(R, rise), a = Math.atan2(rise, R);
    for (const s of [1, -1]) { const sl = mesh(ibeUV(new THREE.BoxGeometry(w + 0.5, 0.14, L), (w + 0.5) / 2.2, L / 2.2), M2.roof); sl.rotation.x = s * a; sl.position.set(cx, G + h + rh - rise / 2 + 0.07, cz + s * R / 2); g.add(sl); }
    g.add(ibeBox(w + 0.5, 0.16, 0.22, M2.roofEdge, cx, G + h + rh + 0.12, cz));
    const tri = new THREE.Shape(); tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rh); tri.closePath();
    for (const x of [x0, x1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), M2.wall); m.material = M2.wall; m.rotation.y = Math.PI / 2; m.position.set(x + (x === x0 ? -0.001 : 0.001), G + h, cz); m.castShadow = true; m.receiveShadow = true; g.add(m); m.material.side = THREE.DoubleSide; }
  }
  // ventanas, contraventanas, rejas, puerta, farol, balcón y macetas en la fachada (+z)
  const floors = h > 4.2 ? 2 : 1, n = Math.max(1, Math.floor(w / 2.3)), shM = M2.shutter[o.sh ?? 0];
  let k = 0;
  for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * w / n, isDoor = f === 0 && i === (o.door ?? 0), y = G + (f === 0 ? 1.55 : 4.1), z = z1;
    if (isDoor) {
      g.add(ibeBox(1.06, 2.2, 0.08, M2.wood, x, G + 1.1, z + 0.03)); g.add(ibeBox(1.3, 0.12, 0.14, M2.frame, x, G + 2.26, z + 0.05));
      for (const dx of [-0.25, 0.25]) g.add(ibeBox(0.4, 0.9, 0.02, M2.woodL, x + dx, G + 1.45, z + 0.08));
      const lamp = new THREE.Group(); lamp.add(ibeBox(0.2, 0.3, 0.2, M2.iron, 0, 0, 0)); const bulb = sph(0.08, M2.lampBulb, 12, 8); bulb.castShadow = false; lamp.add(bulb); bulb.position.y = -0.02;
      const gl = ibeGlow(0xffb766, 1.6, 0.8); lamp.add(gl); lamp.add(ibeBox(0.04, 0.04, 0.3, M2.iron, 0, 0.12, -0.15)); lamp.position.set(x + 0.85, G + 2.7, z + 0.32); g.add(lamp);
      continue;
    }
    const lit = o.lit ? o.lit[k++ % o.lit.length] : 0;
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.15), lit === 1 ? M2.glassLit : lit === 2 ? M2.glassLit2 : M2.glassDark); gl.position.set(x, y, z + 0.012); g.add(gl);
    g.add(ibeBox(1.1, 0.1, 0.16, M2.frame, x, y - 0.63, z + 0.06), ibeBox(1.05, 0.08, 0.08, M2.frame, x, y + 0.62, z + 0.03));
    for (const s of [-1, 1]) { const sh = ibeBox(0.48, 1.2, 0.04, shM, x + s * 0.72, y, z + 0.04); g.add(sh); }
    if (f === 0 && !o.noReja) { for (let b = 0; b < 5; b++) g.add(ibeBox(0.025, 1.2, 0.025, M2.iron, x - 0.36 + b * 0.18, y, z + 0.12)); g.add(ibeBox(0.9, 0.03, 0.03, M2.iron, x, y + 0.6, z + 0.12)); }
    if (f === 1 && o.balcony && i === (o.balIdx ?? 0)) {
      g.add(ibeBox(1.7, 0.1, 0.7, M2.frame, x, y - 0.66, z + 0.35)); g.add(ibeBox(1.7, 0.04, 0.04, M2.iron, x, y + 0.32, z + 0.68));
      for (let b = 0; b <= 12; b++) g.add(ibeBox(0.02, 0.95, 0.02, M2.iron, x - 0.84 + b * 0.14, y - 0.15, z + 0.68));
      for (const s of [-1, 1]) g.add(ibeBox(0.04, 0.04, 0.68, M2.iron, x + s * 0.84, y + 0.32, z + 0.35));
      for (let p = 0; p < 3; p++) ibePot(g, x - 0.55 + p * 0.55, y - 0.6, z + 0.5, p, false);
    }
  }
  if (o.pots) for (let p = 0; p < o.pots; p++) ibePot(g, x0 + 0.6 + (p + 0.5) * (w - 1.2) / o.pots, G + 2.6 + (p % 2) * 0.35, z1 + 0.12, p + 3, true);
  return body;
}
function ibePot(g, x, y, z, i, wall) {      // maceta (de barro o azul, colgada en la pared) con geranios
  const M2 = ibeMats(), p = new THREE.Group(); const c = cyl(0.1, 0.075, 0.16, wall ? M2.potB : M2.pot, 12); c.position.y = 0.08; p.add(c);
  const lf = sph(0.13, M2.leaf, 10, 8); lf.scale.y = 0.7; lf.position.y = 0.2; p.add(lf);
  for (let f = 0; f < 4; f++) { const fl = sph(0.045, M2.flower[(i + f) % 3], 8, 6); fl.castShadow = false; fl.position.set(Math.cos(f * 1.7 + i) * 0.09, 0.27 + 0.03 * hash(f + i), Math.sin(f * 1.7 + i) * 0.09); p.add(fl); }
  p.position.set(x, y, z); g.add(p); return p;
}
function ibeOlive(g, x, z, s = 1) { const M2 = ibeMats(), t = new THREE.Group(), G = ibeG(x); const tr = cyl(0.12 * s, 0.18 * s, 1.4 * s, M2.trunk, 8); tr.position.y = 0.7 * s; t.add(tr);
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.7 + hash(i * 3.3 + x) * 0.4) * s, 1), M2.olive); b.position.set(Math.cos(i * 1.3) * 0.6 * s, (1.7 + hash(i + z) * 0.6) * s, Math.sin(i * 1.3) * 0.6 * s); b.scale.y = 0.7; b.castShadow = true; t.add(b); }
  t.position.set(x, G, z); g.add(t); }
function ibeCypress(g, x, z, s = 1) { const M2 = ibeMats(), c = new THREE.Mesh(new THREE.SphereGeometry(0.7 * s, 10, 12), M2.cypress); c.scale.y = 3.4; c.position.set(x, ibeG(x) + 2.3 * s, z); c.castShadow = true; g.add(c); }
function ibeLampPost(g, x, z) {      // farola fernandina (negra, farol cálido)
  const M2 = ibeMats(), G = ibeG(x) + 0.09, p = new THREE.Group(); const post = cyl(0.06, 0.09, 3.6, M2.iron, 10); post.position.y = 1.8; p.add(post);
  const head = cyl(0.22, 0.12, 0.45, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffbe6e, emissiveIntensity: 2.6, transparent: true, opacity: 0.95 }), 6); head.position.y = 3.85; head.castShadow = false; p.add(head);
  const cap = cyl(0.04, 0.3, 0.2, M2.iron, 6); cap.position.y = 4.17; p.add(cap); const gl = ibeGlow(0xffb766, 3.2, 0.9); gl.position.y = 3.85; p.add(gl);
  p.position.set(x, G, z); g.add(p); return p; }

// ---------- la casa de la madre (una planta) con la COCINA por dentro (la ventana de la cocina mira a +z)
function ibeMotherHouse(g) {
  const M2 = ibeMats(), G = ibeG(40.5) + 0.09, yF = IBE_YF, top = yF + 2.95, H2 = top - (G - 0.3);
  const X0 = 37, X1 = 44, ZB = 6.5, ZF = 13, KX1 = 42.6, KZB = 8.5;
  // fachada con el hueco de la ventana
  const sh = new THREE.Shape(); sh.moveTo(X0, G - 0.3); sh.lineTo(KX1, G - 0.3); sh.lineTo(KX1, top); sh.lineTo(X0, top); sh.closePath();
  const hole = new THREE.Path(), wx0 = IBE_WX - 0.7, wx1 = IBE_WX + 0.7, wy0 = yF + 1.0, wy1 = yF + 2.25; hole.moveTo(wx0, wy0); hole.lineTo(wx0, wy1); hole.lineTo(wx1, wy1); hole.lineTo(wx1, wy0); hole.closePath(); sh.holes.push(hole);
  const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: false }); ibeUV(fg, 0.4, 0.4); const front = new THREE.Mesh(fg, M2.wall); front.position.z = ZF - 0.25; front.castShadow = front.receiveShadow = true; g.add(front);
  g.add(ibeBox(KX1 - X0 + 0.04, 0.6, 0.06, M2.zoc[1], (X0 + KX1) / 2, G, ZF + 0.02));
  const blk = (x0, x1, z0, z1) => { const b = mesh(ibeUV(new THREE.BoxGeometry(x1 - x0, H2, z1 - z0), (x1 - x0) / 2.5, H2 / 2.5), M2.wall); b.position.set((x0 + x1) / 2, (top + G - 0.3) / 2, (z0 + z1) / 2); g.add(b); return b; };
  blk(KX1, X1, KZB, ZF); blk(X0, X1, ZB, KZB); blk(X0, X0 + 0.25, KZB, ZF - 0.25);
  g.add(ibeBox(1.45, 0.6, 0.06, M2.zoc[1], 43.3, G, ZF + 0.02));
  const roofSlab = ibeBox(X1 - X0, 0.25, ZF - ZB, M2.wall, (X0 + X1) / 2, top - 0.125, (ZB + ZF) / 2); g.add(roofSlab);
  // tejado a dos aguas
  { const d = ZF - ZB, w = X1 - X0, cx = (X0 + X1) / 2, cz = (ZB + ZF) / 2, rh = 1.3, R = d / 2 + 0.35, rise = rh * R / (d / 2), L = Math.hypot(R, rise), a = Math.atan2(rise, R);
    for (const s of [1, -1]) { const sl = mesh(ibeUV(new THREE.BoxGeometry(w + 0.5, 0.14, L), (w + 0.5) / 2.2, L / 2.2), M2.roof); sl.rotation.x = s * a; sl.position.set(cx, top + rh - rise / 2 + 0.07, cz + s * R / 2); g.add(sl); }
    g.add(ibeBox(w + 0.5, 0.16, 0.22, M2.roofEdge, cx, top + rh + 0.12, cz));
    const tri = new THREE.Shape(); tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rh); tri.closePath();
    for (const x of [X0, X1]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ map: M2.wall.map, color: 0xf6f2ea, roughness: 0.92, emissive: 0x1b2236, emissiveIntensity: 0.55, side: THREE.DoubleSide })); m.rotation.y = Math.PI / 2; m.position.set(x, top, cz); g.add(m); }
    const ch = ibeBox(0.5, 1.4, 0.5, M2.wall, 42.8, top + 1.2, cz - 1.2); g.add(ch); g.add(ibeBox(0.7, 0.08, 0.7, M2.roofEdge, 42.8, top + 1.92, cz - 1.2)); }
  // la ventana de la cocina: marco, alféizar, contraventanas abiertas, maceta de geranios
  g.add(ibeBox(1.6, 0.1, 0.4, M2.frame, IBE_WX, wy0 - 0.05, ZF - 0.05), ibeBox(1.6, 0.12, 0.1, M2.frame, IBE_WX, wy1 + 0.06, ZF + 0.02));
  for (const s of [-1, 1]) { g.add(ibeBox(0.08, wy1 - wy0, 0.1, M2.frame, IBE_WX + s * 0.74, (wy0 + wy1) / 2, ZF + 0.02)); g.add(ibeBox(0.72, 1.3, 0.04, M2.shutter[1], IBE_WX + s * 1.16, (wy0 + wy1) / 2, ZF + 0.05)); }
  ibePot(g, IBE_WX - 0.52, wy0, ZF + 0.08, 1, false);
  // la puerta, su farol y macetas azules en la pared
  g.add(ibeBox(1.06, 2.2, 0.08, M2.wood, 43.3, G + 1.1, ZF + 0.03)); g.add(ibeBox(1.3, 0.12, 0.14, M2.frame, 43.3, G + 2.26, ZF + 0.05));
  { const lamp = new THREE.Group(); lamp.add(ibeBox(0.2, 0.3, 0.2, M2.iron, 0, 0, 0)); const b = sph(0.08, M2.lampBulb, 12, 8); b.castShadow = false; lamp.add(b); lamp.add(ibeGlow(0xffb766, 1.6, 0.8)); lamp.position.set(42.5, G + 2.75, ZF + 0.3); g.add(lamp); }
  for (let p = 0; p < 3; p++) ibePot(g, 37.6 + p * 0.55, G + 2.5 + (p % 2) * 0.3, ZF + 0.12, p + 5, true);

  // ---- LA COCINA (x ∈ [37.25, 42.6], z ∈ [8.5, 12.75], suelo yF, techo yF + 2.7)
  const K = new THREE.Group(); g.add(K); const kx0 = 37.25, kx1 = KX1, kz0 = KZB, kz1 = ZF - 0.25, kh = 2.7, kcx = (kx0 + kx1) / 2, kcz = (kz0 + kz1) / 2;
  const floorT = ibeRep(canvasTex(256, 256, (c, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#b8623a' : '#efe4cf'; c.fillRect(i * 32, j * 32, 32, 32); } c.strokeStyle = 'rgba(60,40,30,.35)'; c.lineWidth = 1.5; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.moveTo(0, i * 32); c.lineTo(w, i * 32); c.stroke(); } }));
  const fl = new THREE.Mesh(ibeUV(new THREE.PlaneGeometry(kx1 - kx0, kz1 - kz0), (kx1 - kx0) / 2.4, (kz1 - kz0) / 2.4), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.35 })); fl.rotation.x = -Math.PI / 2; fl.position.set(kcx, yF, kcz); fl.receiveShadow = true; K.add(fl);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(kx1 - kx0, kz1 - kz0), M2.wallIn); ceil.rotation.x = Math.PI / 2; ceil.position.set(kcx, yF + kh, kcz); K.add(ceil);
  const azT = ibeRep(canvasTex(256, 256, (c, w, h) => { const n = 4, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = i * s, y = j * s; c.fillStyle = '#f4f1ea'; c.fillRect(x, y, s, s);
      c.strokeStyle = '#2a5aa8'; c.lineWidth = 5; c.beginPath(); c.moveTo(x + s / 2, y + 8); c.lineTo(x + s - 8, y + s / 2); c.lineTo(x + s / 2, y + s - 8); c.lineTo(x + 8, y + s / 2); c.closePath(); c.stroke();
      c.fillStyle = '#e0a21c'; c.beginPath(); c.arc(x + s / 2, y + s / 2, 7, 0, 7); c.fill(); c.fillStyle = '#2a5aa8'; for (const [a, b] of [[0, 0], [s, 0], [0, s], [s, s]]) { c.beginPath(); c.arc(x + a, y + b, 9, 0, 7); c.fill(); } }
    c.strokeStyle = 'rgba(150,150,150,.8)'; c.lineWidth = 2; for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); } }));
  const azM = new THREE.MeshStandardMaterial({ map: azT, roughness: 0.25, metalness: 0.05 });
  const wallP = (len, x, z, ry) => { const a = new THREE.Mesh(ibeUV(new THREE.PlaneGeometry(len, 1.45), len / 0.6, 1.45 / 0.6), azM); a.position.set(x, yF + 0.725, z); a.rotation.y = ry; K.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(len, kh - 1.45), M2.wallIn); b.position.set(x, yF + 1.45 + (kh - 1.45) / 2, z); b.rotation.y = ry; K.add(b); };
  wallP(kx1 - kx0, kcx, kz0 + 0.005, 0); wallP(kz1 - kz0, kx0 + 0.005, kcz, Math.PI / 2); wallP(kz1 - kz0, kx1 - 0.005, kcz, -Math.PI / 2);
  // encimera con fregadero y fuego, armarios altos
  const cab = new THREE.MeshStandardMaterial({ color: 0x8fb8a8, roughness: 0.55 }), wtop = new THREE.MeshStandardMaterial({ color: 0x3a3634, roughness: 0.3 });
  K.add(ibeBox(3.6, 0.86, 0.6, cab, 39.15, yF + 0.43, kz0 + 0.3), ibeBox(3.64, 0.05, 0.64, wtop, 39.15, yF + 0.885, kz0 + 0.32));
  for (let i = 0; i < 6; i++) K.add(ibeBox(0.02, 0.7, 0.01, M2.iron, 37.35 + i * 0.6 + 0.3, yF + 0.45, kz0 + 0.61));
  K.add(ibeBox(0.55, 0.04, 0.4, M2.steel, 38.3, yF + 0.9, kz0 + 0.3)); { const tap = bar(v3(38.3, yF + 0.9, kz0 + 0.1), v3(38.3, yF + 1.15, kz0 + 0.18), 0.015, M2.steel); K.add(tap); }
  for (const [dx, dz] of [[0, 0], [0.24, 0], [0, 0.22], [0.24, 0.22]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 20), M2.iron); r.rotation.x = Math.PI / 2; r.position.set(39.8 + dx, yF + 0.915, kz0 + 0.2 + dz); K.add(r); }
  { const pot = cyl(0.12, 0.12, 0.16, new THREE.MeshStandardMaterial({ color: 0xc8322c, roughness: 0.3 }), 20); pot.position.set(39.8, yF + 0.99, kz0 + 0.2); K.add(pot); }
  K.add(ibeBox(1.5, 0.7, 0.35, cab, 38.15, yF + 2.05, kz0 + 0.18));
  // nevera
  const fr = rbox(0.68, 1.8, 0.66, new THREE.MeshPhysicalMaterial({ color: 0xf2f0ea, roughness: 0.3, clearcoat: 0.6 }), 0.06); fr.position.set(41.95, yF + 0.9, kz0 + 0.36); K.add(fr);
  K.add(ibeBox(0.03, 0.4, 0.04, M2.steel, 41.7, yF + 1.35, kz0 + 0.71), ibeBox(0.03, 0.3, 0.04, M2.steel, 41.7, yF + 0.6, kz0 + 0.71), ibeBox(0.66, 0.01, 0.01, M2.grey, 41.95, yF + 1.05, kz0 + 0.70));
  { const mg = ibeBox(0.08, 0.08, 0.01, new THREE.MeshStandardMaterial({ color: 0xffd23f }), 42.1, yF + 1.5, kz0 + 0.70); K.add(mg); const ph = ibeBox(0.14, 0.18, 0.005, new THREE.MeshStandardMaterial({ color: 0x7fb6d9 }), 41.85, yF + 1.45, kz0 + 0.70); K.add(ph); }
  // el reloj de pared: las 22:47 (en España; en Brasil son 4 h menos)
  { const ct = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#fbf8f0'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill(); c.lineWidth = 10; c.strokeStyle = '#7a4a26'; c.stroke();
      c.fillStyle = '#222'; c.font = '700 34px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(String(i), 128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); }
      const hand = (a, L, wd, col) => { c.strokeStyle = col; c.lineWidth = wd; c.lineCap = 'round'; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.sin(a) * L, 128 - Math.cos(a) * L); c.stroke(); };
      hand((10 + 47 / 60) / 12 * Math.PI * 2, 55, 10, '#1a1a1a'); hand(47 / 60 * Math.PI * 2, 80, 6, '#1a1a1a'); c.fillStyle = '#c8322c'; c.beginPath(); c.arc(128, 128, 8, 0, 7); c.fill(); });
    const cl = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.4 })); cl.position.set(39.75, yF + 1.98, kz0 + 0.035); K.add(cl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 8, 40), M2.wood); rim.position.copy(cl.position); K.add(rim); IBE.Q.clock = cl; }
  // la mesa con su mantel de cuadros y el frutero
  const tx0 = 38.65, tx1 = 40.45, tz0 = 9.6, tz1 = 10.7, ty = yF + 0.76, tcx = (tx0 + tx1) / 2, tcz = (tz0 + tz1) / 2;
  const clothT = ibeRep(canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#fbf6ee'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(200,40,50,.55)'; for (let i = 0; i < 8; i += 2) { c.fillRect(i * 16, 0, 16, h); c.fillRect(0, i * 16, w, 16); } }));
  const clothM = new THREE.MeshStandardMaterial({ map: clothT, roughness: 0.85, side: THREE.DoubleSide });
  const ctop = new THREE.Mesh(ibeUV(new THREE.BoxGeometry(tx1 - tx0 + 0.1, 0.02, tz1 - tz0 + 0.1), 8, 5), clothM); ctop.position.set(tcx, ty, tcz); ctop.castShadow = ctop.receiveShadow = true; K.add(ctop);
  for (const [w, x, z, ry] of [[tx1 - tx0 + 0.1, tcx, tz1 + 0.05, 0], [tx1 - tx0 + 0.1, tcx, tz0 - 0.05, 0], [tz1 - tz0 + 0.1, tx0 - 0.05, tcz, Math.PI / 2], [tz1 - tz0 + 0.1, tx1 + 0.05, tcz, Math.PI / 2]]) {
    const s = new THREE.Mesh(ibeUV(new THREE.PlaneGeometry(w, 0.28), w * 4.2, 1.2), clothM); s.position.set(x, ty - 0.14, z); s.rotation.y = ry; K.add(s); }
  for (const [x, z] of [[tx0 + 0.08, tz0 + 0.08], [tx1 - 0.08, tz0 + 0.08], [tx0 + 0.08, tz1 - 0.08], [tx1 - 0.08, tz1 - 0.08]]) K.add(ibeBox(0.06, 0.74, 0.06, M2.wood, x, yF + 0.37, z));
  { const bowlM = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.25 }), bowl = lathe([[0.001, 0], [0.07, 0.005], [0.15, 0.05], [0.17, 0.09], [0.16, 0.095]], 32, bowlM); bowl.position.set(39.95, ty + 0.01, 9.98); K.add(bowl);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.163, 0.006, 6, 40), new THREE.MeshStandardMaterial({ color: 0x2a5aa8 })); band.rotation.x = Math.PI / 2; band.position.set(39.95, ty + 0.085, 9.98); K.add(band);
    const fr2 = [[0x6b4a1a, 0.045], [0xf28a1c, 0.05], [0xf28a1c, 0.05], [0xf28a1c, 0.048], [0xc8222a, 0.045], [0x8cc63f, 0.044], [0xf2d23a, 0.04]];
    const fp = [[0, 0.11, 0], [-0.07, 0.1, 0.04], [0.07, 0.1, -0.03], [0.0, 0.1, -0.08], [0.05, 0.1, 0.07], [-0.06, 0.1, -0.06], [0.02, 0.17, 0.0]];
    fr2.forEach(([c, r], i) => { if (i === 0) return; const f = sph(r, new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }), 16, 12); f.position.set(39.95 + fp[i][0], ty + fp[i][1], 9.98 + fp[i][2]); K.add(f); });
    const ban = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 16, 2.0), new THREE.MeshStandardMaterial({ color: 0xf2d23a, roughness: 0.5 })); ban.position.set(39.95, ty + 0.16, 9.98); ban.rotation.set(Math.PI / 2 - 0.4, 0, 0.6); K.add(ban); }
  { const cup = cyl(0.04, 0.035, 0.09, new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.3 }), 16); cup.position.set(38.95, ty + 0.055, 10.3); K.add(cup); const sau = cyl(0.07, 0.06, 0.012, cup.material, 20); sau.position.set(38.95, ty + 0.012, 10.3); K.add(sau); }
  // la lámpara de techo, cálida, sobre la mesa
  { const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.26, 0.2, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x3d6b4c, roughness: 0.5, side: THREE.DoubleSide })); shade.position.set(tcx, yF + 2.05, tcz); K.add(shade);
    K.add(bar(v3(tcx, yF + 2.15, tcz), v3(tcx, yF + kh, tcz), 0.008, M2.iron)); const bulb = sph(0.06, M2.lampBulb, 12, 8); bulb.castShadow = false; bulb.position.set(tcx, yF + 1.98, tcz); K.add(bulb);
    const L = new THREE.PointLight(0xffb070, 5.5, 9, 2); L.position.set(tcx, yF + 1.9, tcz); K.add(L); IBE.Q.kLight = L; }
  // cortinas a los lados de la ventana (por dentro)
  { const cm = new THREE.MeshStandardMaterial({ color: 0xf6efe0, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x3a2a14, emissiveIntensity: 0.3 });
    for (const s of [-1, 1]) { const cg = new THREE.PlaneGeometry(0.45, 1.5, 12, 1); const p = cg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.03 * Math.sin(p.getX(i) * 40)); cg.computeVertexNormals();
      const c2 = new THREE.Mesh(cg, cm); c2.position.set(IBE_WX + s * 0.9, yF + 1.6, kz1 - 0.05); K.add(c2); } }
  // la silla y la madre (de espaldas a la ventana, mirando a −z)
  ibeMother(K);
}

// ---------- la madre: figura sencilla (rebeca, pelo canoso con moño) + manos realistas con su móvil
function ibeMother(K) {
  const M2 = ibeMats(), o = IBE_MOM, B = new THREE.Group(); B.position.copy(o); K.add(B); IBE.Q.mom = B;
  const knit = ibeRep(canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#a9566a'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(70,20,35,.35)'; c.lineWidth = 2; for (let x = 0; x < w; x += 8) { c.beginPath(); for (let y = 0; y <= h; y += 8) c.lineTo(x + ((y / 8) % 2) * 4, y); c.stroke(); } }));
  const cardi = new THREE.MeshStandardMaterial({ map: knit, roughness: 0.95, color: 0xffffff }); IBE.Q.cardi = cardi;
  const skirt = new THREE.MeshStandardMaterial({ color: 0x2f3240, roughness: 0.9 }), hair = new THREE.MeshStandardMaterial({ color: 0xd9d4cc, roughness: 0.75 }), skin = new THREE.MeshStandardMaterial({ color: 0xd9a083, roughness: 0.6 });
  // silla
  B.add(ibeBox(0.44, 0.04, 0.42, M2.woodL, 0, 0.46, 0.02)); for (const [x, z] of [[-0.19, -0.17], [0.19, -0.17], [-0.19, 0.21], [0.19, 0.21]]) B.add(ibeBox(0.035, 0.46, 0.035, M2.woodL, x, 0.23, z));
  for (const x of [-0.19, 0.19]) B.add(ibeBox(0.035, 0.5, 0.035, M2.woodL, x, 0.71, 0.22)); B.add(ibeBox(0.42, 0.08, 0.03, M2.woodL, 0, 0.9, 0.22), ibeBox(0.42, 0.06, 0.03, M2.woodL, 0, 0.72, 0.22));
  // cuerpo
  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.12, 6, 14), skirt); hips.rotation.z = Math.PI / 2; hips.position.set(0, 0.56, 0.04); hips.scale.set(1, 1.2, 0.9); B.add(hips);
  for (const s of [-1, 1]) { B.add(bar(v3(s * 0.09, 0.55, 0.02), v3(s * 0.1, 0.55, -0.36), 0.075, skirt)); B.add(bar(v3(s * 0.1, 0.55, -0.36), v3(s * 0.1, 0.06, -0.4), 0.06, skirt)); const sh2 = ibeBox(0.09, 0.07, 0.22, M2.iron, s * 0.1, 0.035, -0.45); B.add(sh2); }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.3, 8, 18), cardi); torso.position.set(0, 0.86, 0.05); torso.scale.set(1.18, 1, 0.82); torso.rotation.x = 0.06; torso.castShadow = true; B.add(torso);
  const neck = cyl(0.045, 0.05, 0.1, skin, 12); neck.position.set(0, 1.12, 0.03); B.add(neck);
  const head = sph(0.095, skin, 24, 18); head.position.set(0, 1.24, 0.0); head.scale.set(0.95, 1.08, 1); B.add(head);
  const hr = sph(0.104, hair, 24, 18); hr.position.set(0, 1.265, 0.022); hr.scale.set(1, 1, 0.98); B.add(hr);
  const bun = sph(0.055, hair, 16, 12); bun.position.set(0, 1.3, 0.1); B.add(bun);
  for (const s of [-1, 1]) { const e = sph(0.018, skin, 8, 6); e.position.set(s * 0.095, 1.23, 0.0); B.add(e); }
  const glassesM = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.4 }); for (const s of [-1, 1]) B.add(bar(v3(s * 0.093, 1.25, 0.0), v3(s * 0.088, 1.25, -0.08), 0.004, glassesM));
  IBE.Q.shoulders = [v3(-0.19, 1.0, 0.04), v3(0.19, 1.0, 0.04)];
  IBE.Q.arms = [0, 1].map(() => { const ua = cyl(0.052, 0.046, 1, cardi, 14); B.add(ua); const el = sph(0.05, cardi, 12, 10); B.add(el); return { ua, el }; });
  // el móvil (funda lila), su pantalla (chat genérico) y el «marco del móvil» PF (pantalla hacia los ojos de la madre)
  const phone = new THREE.Group(); B.add(phone); IBE.Q.phone = phone;
  const caseM = new THREE.MeshPhysicalMaterial({ color: 0x9a7fe0, roughness: 0.45, clearcoat: 0.4 });
  const body = rbox(0.074, 0.154, 0.011, caseM, 0.012); phone.add(body);
  const bez = rbox(0.07, 0.15, 0.002, new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2 }), 0.01); bez.position.z = 0.0052; phone.add(bez);
  const cv = document.createElement('canvas'); cv.width = 540; cv.height = 1170; const ctx = cv.getContext('2d'); const stex = new THREE.CanvasTexture(cv); stex.colorSpace = THREE.SRGBColorSpace; stex.anisotropy = 8;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.143), new THREE.MeshBasicMaterial({ map: stex, toneMapped: false, color: 0xffffff })); scr.position.z = 0.0064; scr.renderOrder = 1; phone.add(scr);
  const lens = cyl(0.008, 0.008, 0.003, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 }), 16); lens.rotation.x = Math.PI / 2; lens.position.set(-0.022, 0.06, -0.006); phone.add(lens);
  IBE.Q.scr = { cv, ctx, tex: stex, key: '' };
  const PP = v3(0.0, 0.94, -0.47), eye = v3(0, 1.25, -0.06), Z = eye.clone().sub(PP).normalize(), X = v3(1, 0, 0), Y = new THREE.Vector3().crossVectors(Z, X).normalize();
  phone.position.copy(PP); phone.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); IBE.Q.PF = { X, Y, Z, P: PP };
  // las manos (escala real: 0,1 → ≈ 19 cm de la muñeca a la punta del dedo), con la manga de la rebeca
  const mkHand = left => { const hld = new THREE.Group(); B.add(hld); const h = realHand({ inside: false, left }); h.scale.set(left ? -0.1 : 0.1, 0.1, 0.1); hld.add(h);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.5, 2.6, 18, 1, true), cardi); sl.position.y = -1.6; sl.scale.z = 0.8; h.add(sl);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 8, 20), cardi); cuff.rotation.x = Math.PI / 2; cuff.scale.y = 0.8; cuff.position.y = -0.32; h.add(cuff);
    h.userData.fingers.forEach(f => { f.bones[0].rotation.z = f.d.a * D2 * 0.35; }); return { hld, h }; };
  IBE.Q.hL = mkHand(true); IBE.Q.hR = mkHand(false);
}

// ---------- la pantalla del móvil: chat genérico (cabecera «Hijo», burbujas, caja de texto, teclado)
const IBE_KB = (() => { const K2 = {}, r1 = 'qwertyuiop', r2 = 'asdfghjklñ', r3 = 'zxcvbnm';
  [...r1].forEach((c, i) => K2[c] = [29 + i * 53.5, 842]); [...r2].forEach((c, i) => K2[c] = [29 + i * 53.5, 934]); [...r3].forEach((c, i) => K2[c] = [109 + i * 53.5, 1026]);
  K2[' '] = [270, 1112]; K2[','] = [128, 1112]; K2['?'] = [412, 1112]; K2['¿'] = K2['?']; K2.send = [492, 718]; return K2; })();
function ibeKeyOf(ch) { const c = ch.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') || ch; return IBE_KB[c] || IBE_KB[ch.toLowerCase()] || IBE_KB[' ']; }
function ibeChat(c, W2, H2, type, send) {
  const n = Math.round(clamp(type) * IBE_TXT.length), sent = send > 0.3, press = send > 0.05 && send < 0.32, slide = clamp((send - 0.3) / 0.22);
  c.fillStyle = '#e8e0d4'; c.fillRect(0, 0, W2, H2);
  c.fillStyle = 'rgba(160,140,110,.12)'; for (let i = 0; i < 60; i++) { c.beginPath(); c.arc(hash(i * 3.1) * W2, 150 + hash(i * 7.7) * 540, 6 + hash(i) * 10, 0, 7); c.fill(); }
  // barra de estado y cabecera
  c.fillStyle = '#1f2a30'; c.fillRect(0, 0, W2, 150); c.fillStyle = '#fff'; c.font = '600 26px Inter'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText('22:47', 28, 26);
  c.fillRect(470, 16, 40, 20); c.fillRect(511, 21, 4, 10); c.fillStyle = '#1f2a30'; c.fillRect(473, 19, 10, 14);
  c.strokeStyle = '#fff'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(38, 82); c.lineTo(22, 100); c.lineTo(38, 118); c.stroke();
  c.fillStyle = '#9fb3bf'; c.beginPath(); c.arc(90, 100, 34, 0, 7); c.fill(); c.fillStyle = '#e8eef2'; c.beginPath(); c.arc(90, 90, 13, 0, 7); c.fill(); c.beginPath(); c.ellipse(90, 122, 22, 14, 0, Math.PI, 0); c.fill();
  c.fillStyle = '#fff'; c.font = '700 40px Inter'; c.fillText('Hijo', 140, 92); c.font = '400 22px Inter'; c.fillStyle = '#b9c6cd'; c.fillText('últ. vez hoy a las 18:12', 140, 126);
  // mensajes
  const chip = (txt, y) => { c.font = '600 20px Inter'; const w = c.measureText(txt).width + 30; c.fillStyle = '#dce8ef'; rr(c, W2 / 2 - w / 2, y, w, 36, 10); c.fill(); c.fillStyle = '#4a5a64'; c.textAlign = 'center'; c.fillText(txt, W2 / 2, y + 19); c.textAlign = 'left'; };
  const bub = (txt, time, y, out, checks) => { c.font = '400 31px Inter'; const tw = c.measureText(txt).width, w = Math.min(430, tw + 130), x = out ? W2 - 18 - w : 18;
    c.fillStyle = 'rgba(0,0,0,.12)'; rr(c, x, y + 3, w, 70, 16); c.fill(); c.fillStyle = out ? '#d6f5c4' : '#ffffff'; rr(c, x, y, w, 70, 16); c.fill();
    c.fillStyle = '#1b1f22'; c.fillText(txt, x + 18, y + 36); c.font = '400 19px Inter'; c.fillStyle = '#7a8a80'; c.fillText(time, x + w - (checks ? 100 : 66), y + 52);
    if (checks) { c.strokeStyle = '#3a9de0'; c.lineWidth = 3.2; c.lineCap = 'round'; for (const dx of [0, 10]) { c.beginPath(); c.moveTo(x + w - 42 + dx, y + 51); c.lineTo(x + w - 36 + dx, y + 57); c.lineTo(x + w - 24 + dx, y + 45); c.stroke(); } } };
  chip('AYER', 172); bub('Mañana te llamo, mamá', '21:05', 226, false); bub('Vale, cariño. Abrígate', '21:06', 312, true, true); chip('HOY', 404);
  if (sent) { c.save(); c.globalAlpha = clamp(slide * 1.6); c.translate(0, (1 - eo(slide)) * 210); bub(IBE_TXT, '22:47', 456, true, true); c.restore(); }
  // caja de texto y botón de enviar
  c.fillStyle = '#e8e0d4'; c.fillRect(0, 676, W2, 90);
  c.fillStyle = '#ffffff'; rr(c, 14, 686, 430, 66, 33); c.fill();
  c.font = '400 30px Inter'; if (!sent && n > 0) { c.fillStyle = '#1b1f22'; c.fillText(IBE_TXT.slice(0, n), 40, 720); const cw = c.measureText(IBE_TXT.slice(0, n)).width; if ((NOW * 2 % 1) < 0.6) c.fillRect(42 + cw, 702, 3, 36); }
  else { c.fillStyle = '#9aa3a8'; c.fillText('Mensaje', 40, 720); }
  const sc = press ? 0.86 : 1; c.fillStyle = press ? '#1f9a52' : '#25b864'; c.beginPath(); c.arc(492, 718, 34 * sc, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(478, 702); c.lineTo(510, 718); c.lineTo(478, 734); c.lineTo(483, 718); c.closePath(); c.fill();
  // teclado
  c.fillStyle = '#cfd3d9'; c.fillRect(0, 776, W2, H2 - 776);
  const cur = n > 0 && !sent && type < 1 ? IBE_TXT[n - 1] : null, curK = cur ? ibeKeyOf(cur) : null, fr = (clamp(type) * IBE_TXT.length) % 1, keyDown = curK && fr < 0.45;
  const key = (lab, x, y, w, dark) => { const dn = keyDown && curK[0] === x && curK[1] === y; c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, x - w / 2, y - 38 + 3, w, 76, 9); c.fill(); c.fillStyle = dn ? '#9fb0c4' : dark ? '#aeb4bd' : '#ffffff'; rr(c, x - w / 2, y - 38, w, 76, 9); c.fill();
    c.fillStyle = '#1b1f22'; c.font = '400 36px Inter'; c.textAlign = 'center'; c.fillText(lab, x, y + 2); c.textAlign = 'left'; };
  for (const ch of 'qwertyuiopasdfghjklñzxcvbnm') { const [x, y] = IBE_KB[ch]; key(ch, x, y, 47); }
  key('⇧', 36, 1026, 62, true); key('⌫', 504, 1026, 62, true); key('123', 46, 1112, 76, true); key(',', 128, 1112, 50); key('', 270, 1112, 220); key('¿?', 412, 1112, 50); key('↵', 490, 1112, 76, true);
  c.fillStyle = '#6c737b'; c.font = '400 22px Inter'; c.textAlign = 'center'; c.fillText('espacio', 270, 1114); c.textAlign = 'left';
  if (keyDown) { const [x, y] = curK; c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, x - 36, y - 150, 72, 100, 12); c.fill(); c.fillStyle = '#fff'; rr(c, x - 36, y - 152, 72, 100, 12); c.fill(); c.fillStyle = '#1b1f22'; c.font = '500 50px Inter'; c.textAlign = 'center'; c.fillText(cur === ' ' ? '␣' : cur.toLowerCase(), x, y - 100); c.textAlign = 'left'; }
}
function ibeScreen(type, send) {
  const sc = IBE.Q.scr, n = Math.round(clamp(type) * IBE_TXT.length), fr = Math.floor((clamp(type) * IBE_TXT.length % 1) * 4), blink = (NOW * 2 % 1) < 0.6 ? 1 : 0;
  const key = `${n}|${fr}|${Math.round(send * 40)}|${blink}`; if (key === sc.key) return; sc.key = key;
  ibeChat(sc.ctx, 540, 1170, type, send); sc.tex.needsUpdate = true;
}
// del lienzo (px) al marco de la madre (B): punto en la pantalla del móvil
function ibeScreenP(px, py, lift = 0) { const F = IBE.Q.PF; return F.P.clone().addScaledVector(F.X, (px / 540 - 0.5) * 0.066).addScaledVector(F.Y, (0.5 - py / 1170) * 0.143).addScaledVector(F.Z, 0.0066 + lift); }
// coloca una mano: base (x de la mano, dedos, dorso) en el marco B, y la mueve para que su punto local `lp` caiga en `target`
const _ibeV = new THREE.Vector3();
function ibePlaceHand(H3, yDir, zDir, lp, target) {
  const y = yDir.clone().normalize(), z = zDir.clone().sub(y.clone().multiplyScalar(zDir.dot(y))).normalize(), x = new THREE.Vector3().crossVectors(y, z);
  H3.hld.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); H3.hld.position.set(0, 0, 0); H3.hld.updateMatrix();
  const B = IBE.Q.mom; B.updateMatrixWorld(true); const pW = lp.isObject3D ? wpos(lp, _ibeV) : H3.h.localToWorld(_ibeV.copy(lp)); const pB = B.worldToLocal(pW.clone());
  H3.hld.position.copy(target).sub(pB);
}
function ibeHands(t, type, send) {
  const Q = IBE.Q, F = Q.PF;
  // mano izquierda: sujeta el móvil por detrás (palma contra la espalda del móvil, el pulgar por el borde izquierdo, los dedos por el derecho)
  handPose2(Q.hL.h, [0.3, 0.22, 0.26, 0.3, 0.34]);
  const dL = F.Y.clone().multiplyScalar(Math.cos(0.6)).addScaledVector(F.X, Math.sin(0.6));
  ibePlaceHand(Q.hL, dL, F.Z.clone().negate(), v3(-0.02, 0.45, -0.16), F.P.clone().addScaledVector(F.Y, -0.035).addScaledVector(F.X, 0.002).addScaledVector(F.Z, -0.012));
  // mano derecha: el índice escribe (tecla de cada letra) y luego pulsa «enviar»
  handPose2(Q.hR.h, [0.55, 0.35, 1.45, 1.55, 1.6]);
  const N = IBE_TXT.length, f = clamp(type) * N, i = Math.min(N - 1, Math.floor(f)), fr = f - Math.floor(f);
  let tp, lift;
  if (send > 0) { const a = ibeKeyOf(IBE_TXT[N - 1]), b = IBE_KB.send, u = eio(clamp(send / 0.12)); tp = [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
    lift = send < 0.12 ? 0.022 * Math.sin(u * Math.PI) + 0.004 : send < 0.3 ? 0.004 + 0.02 * (1 - Math.sin(clamp((send - 0.12) / 0.18) * Math.PI)) * (send > 0.2 ? 1 : 0.2) : 0.004 + 0.03 * eo(clamp((send - 0.3) / 0.3)); }
  else if (type <= 0) { const a = ibeKeyOf(IBE_TXT[0]); tp = a; lift = 0.03; }
  else { const a = ibeKeyOf(IBE_TXT[Math.max(0, i - 1)]), b = ibeKeyOf(IBE_TXT[i]); const u = eio(clamp(fr / 0.4)); tp = i === 0 ? b : [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
    lift = 0.003 + 0.016 * (fr < 0.45 ? Math.sin(clamp(fr / 0.45) * Math.PI) : 0) + (fr > 0.45 ? 0.0 : 0); if (type >= 1) lift = 0.012; }
  const dR = F.Y.clone().multiplyScalar(0.8).addScaledVector(F.X, -0.55).addScaledVector(F.Z, -0.25), tip = Q.hR.h.userData.fingers[0].nail;
  ibePlaceHand(Q.hR, dR, F.Z.clone().addScaledVector(F.Y, -0.2), tip, ibeScreenP(tp[0], tp[1], lift + 0.004));
  // los brazos (de la manga al hombro)
  [Q.hL, Q.hR].forEach((H3, k) => { const B = Q.mom; const el = B.worldToLocal(H3.h.localToWorld(v3(0.02, -2.9, 0))); const sh = Q.shoulders[k], A = Q.arms[k];
    const d = el.clone().sub(sh), L = d.length(); A.ua.scale.set(1, L, 1); A.ua.position.copy(sh).add(el).multiplyScalar(0.5); A.ua.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); A.el.position.copy(el); });
}

// ---------- la estación del cable (Portugal) y la arqueta de la playa
function ibeStation(g) {
  const M2 = ibeMats(), cx = 10.4, cz = 10, G = ibeG(cx) + 0.09, w = 4.4, d = 3.6, h = 3.0;
  const b = mesh(ibeUV(new THREE.BoxGeometry(w, h + 0.4, d), w / 3, h / 3), M2.concrete); b.position.set(cx, G + h / 2 - 0.2, cz); g.add(b);
  for (const [a, c2, x, z] of [[w + 0.1, 0.15, cx, cz + d / 2], [w + 0.1, 0.15, cx, cz - d / 2], [0.15, d, cx - w / 2, cz], [0.15, d, cx + w / 2, cz]]) g.add(ibeBox(a, 0.35, c2, M2.concrete, x, G + h + 0.17, z));
  g.add(ibeBox(1.1, 2.1, 0.06, M2.grey, cx + 0.8, G + 1.05, cz + d / 2 + 0.02)); for (let i = 0; i < 6; i++) g.add(ibeBox(0.7, 0.03, 0.02, M2.iron, cx - 1.2, G + 1.6 + i * 0.09, cz + d / 2 + 0.02));
  g.add(ibeBox(0.9, 0.55, 0.06, M2.iron, cx - 1.2, G + 1.82, cz + d / 2 + 0.01));
  const ac = ibeBox(0.8, 0.6, 0.35, M2.white, cx - w / 2 - 0.2, G + 0.6, cz - 0.6); g.add(ac); { const fan = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), M2.iron); fan.rotation.y = -Math.PI / 2; fan.position.set(cx - w / 2 - 0.38, G + 0.6, cz - 0.6); g.add(fan); }
  // la luz (fría, sobre la puerta) + el piloto cian (aquí sale/entra la luz del cable)
  const lamp = ibeBox(0.35, 0.1, 0.22, M2.iron, cx + 0.8, G + 2.4, cz + d / 2 + 0.12); g.add(lamp); const lb = ibeBox(0.3, 0.02, 0.18, new THREE.MeshStandardMaterial({ color: 0, emissive: 0xfff2d8, emissiveIntensity: 3 }), cx + 0.8, G + 2.34, cz + d / 2 + 0.12); g.add(lb);
  const lg = ibeGlow(0xffe9c8, 2.2, 0.9); lg.position.set(cx + 0.8, G + 2.3, cz + d / 2 + 0.25); g.add(lg);
  const pil = sph(0.05, new THREE.MeshStandardMaterial({ color: 0, emissive: COL.light, emissiveIntensity: 2.5 }), 10, 8); pil.position.set(cx + 0.1, G + 2.4, cz + d / 2 + 0.03); g.add(pil); IBE.Q.stPil = pil;
  // valla (postes + malla) alrededor
  const mt = canvasTex(64, 64, (c, w2, h2) => { c.strokeStyle = 'rgba(200,205,210,.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(w2, h2); c.moveTo(w2, 0); c.lineTo(0, h2); c.stroke(); }); ibeRep(mt);
  const meshM = new THREE.MeshStandardMaterial({ map: mt, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 });
  const fx0 = cx - 3.4, fx1 = cx + 3.2, fz0 = cz - 3, fz1 = cz + 3.2, fh = 1.7;
  for (const [a2, b2] of [[[fx0, fz1], [cx - 0.2, fz1]], [[cx + 1.8, fz1], [fx1, fz1]], [[fx1, fz1], [fx1, fz0]], [[fx1, fz0], [fx0, fz0]], [[fx0, fz0], [fx0, fz1]]]) {
    const L = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]), pg = ibeUV(new THREE.PlaneGeometry(L, fh), L * 5, fh * 5), p = new THREE.Mesh(pg, meshM); p.position.set((a2[0] + b2[0]) / 2, ibeG((a2[0] + b2[0]) / 2) + 0.09 + fh / 2, (a2[1] + b2[1]) / 2); p.rotation.y = -Math.atan2(b2[1] - a2[1], b2[0] - a2[0]); g.add(p);
    for (let k = 0; k <= Math.ceil(L / 2); k++) { const u = k / Math.ceil(L / 2), x = lerp(a2[0], b2[0], u), z = lerp(a2[1], b2[1], u); g.add(ibeBox(0.06, fh + 0.1, 0.06, M2.grey, x, ibeG(x) + 0.09 + fh / 2, z)); } }
  // la arqueta en la playa (tapa de hormigón)
  { const ax = 3, az = CABLE_Z, ay = ibeG(ax); g.add(ibeBox(1.3, 0.35, 1.3, M2.concrete, ax, ay + 0.05, az)); g.add(ibeBox(1.0, 0.06, 1.0, M2.grey, ax, ay + 0.25, az));
    for (const s of [-1, 1]) g.add(ibeBox(0.1, 0.04, 0.5, M2.iron, ax + s * 0.3, ay + 0.29, az)); }
  return v3(cx, G, cz);
}

// ---------- la antena: torre de celosía de 25 m, paneles, luz roja, armario y valla
function ibeTower(g) {
  const M2 = ibeMats(), T = new THREE.Group(), G = IBE_TWG + 0.05, Hh = IBE_TWH; T.position.set(IBE_TWX, 0, IBE_TWZ); g.add(T);
  const hw = y => lerp(1.6, 0.55, clamp((y - G) / (Hh - 2))), C = (y, sx, sz) => v3(sx * hw(y), y, sz * hw(y));
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]], nS = 9, lv = k => G + k * (Hh - 2) / nS;
  for (const [sx, sz] of corners) T.add(bar(C(G, sx, sz), C(G + Hh - 2, sx, sz), 0.07, M2.steel, 6));
  for (let k = 0; k < nS; k++) for (let e = 0; e < 4; e++) { const [ax, az] = corners[e], [bx2, bz] = corners[(e + 1) % 4];
    T.add(bar(C(lv(k), ax, az), C(lv(k + 1), bx2, bz), 0.035, M2.steel, 5), bar(C(lv(k), bx2, bz), C(lv(k + 1), ax, az), 0.035, M2.steel, 5), bar(C(lv(k + 1), ax, az), C(lv(k + 1), bx2, bz), 0.04, M2.steel, 5)); }
  // mástil de arriba, plataforma y paneles
  const top = G + Hh - 2; T.add(bar(v3(0, top - 1, 0), v3(0, G + Hh + 1.2, 0), 0.08, M2.steel, 8));
  for (let e = 0; e < 4; e++) { const [ax, az] = corners[e], [bx2, bz] = corners[(e + 1) % 4]; T.add(bar(v3(ax * 1.1, top, az * 1.1), v3(bx2 * 1.1, top, bz * 1.1), 0.05, M2.steel, 5)); }
  const panM = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.4, emissive: COL.light, emissiveIntensity: 0.0 }); IBE.Q.panM = panM;
  IBE.Q.panels = [];
  for (const [a, r] of [[0, 1.25], [2.1, 1.25], [-2.1, 1.25]]) { const dx = Math.sin(a), dz = Math.cos(a), p = rbox(0.32, 1.7, 0.14, panM, 0.05); p.position.set(dx * r, top + 0.9, dz * r); p.rotation.y = a; T.add(p); IBE.Q.panels.push(p);
    T.add(bar(v3(dx * 0.4, top + 0.9, dz * 0.4), v3(dx * (r - 0.08), top + 0.9, dz * (r - 0.08)), 0.03, M2.steel, 5)); }
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.25, 24), M2.white); dish.rotation.x = Math.PI / 2; dish.position.set(0.7, top - 1.6, -0.6); dish.rotation.y = 2.5; T.add(dish);
  // luz roja de balizamiento
  const bm = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a1a, emissiveIntensity: 3 }), bc = sph(0.13, bm, 12, 8); bc.position.y = G + Hh + 1.25; T.add(bc); const bg = ibeGlow(0xff3020, 2.6, 1.0); bg.position.copy(bc.position); T.add(bg); IBE.Q.beacon = { m: bm, g: bg };
  // escalera de cables por el centro (donde baja la fibra)
  T.add(bar(v3(0.32, G, 0.32), v3(0.32, top + 0.5, 0.32), 0.025, M2.grey, 4), bar(v3(0.32, G, 0.12), v3(0.32, top + 0.5, 0.12), 0.025, M2.grey, 4));
  // base: losa, armario de equipos, valla
  T.add(ibeBox(5.2, 0.25, 5.2, M2.concrete, 0, G, 0));
  const arm = rbox(1.2, 1.7, 0.8, new THREE.MeshStandardMaterial({ color: 0xd8dccf, roughness: 0.6, emissive: 0x161a22, emissiveIntensity: 0.6 }), 0.04); arm.position.set(1.9, G + 0.98, 1.4); T.add(arm);
  for (let i = 0; i < 3; i++) { const led = sph(0.025, new THREE.MeshStandardMaterial({ color: 0, emissive: 0x3cff7a, emissiveIntensity: 2.5 }), 8, 6); led.position.set(1.6 + i * 0.12, G + 1.6, 1.81); T.add(led); }
  T.add(ibeBox(0.02, 1.5, 0.02, M2.grey, 2.0, G + 0.95, 1.81));
  const mt = canvasTex(64, 64, (c, w2, h2) => { c.strokeStyle = 'rgba(200,205,210,.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(w2, h2); c.moveTo(w2, 0); c.lineTo(0, h2); c.stroke(); }); ibeRep(mt);
  const meshM = new THREE.MeshStandardMaterial({ map: mt, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 });
  for (const [x, z, ry] of [[0, 3, 0], [0, -3, 0], [3, 0, Math.PI / 2], [-3, 0, Math.PI / 2]]) { const p = new THREE.Mesh(ibeUV(new THREE.PlaneGeometry(6, 2), 30, 10), meshM); p.position.set(x, G + 1, z); p.rotation.y = ry; T.add(p); }
  for (const [x, z] of [[-3, -3], [3, -3], [3, 3], [-3, 3], [0, 3], [0, -3], [3, 0], [-3, 0]]) T.add(ibeBox(0.07, 2.1, 0.07, M2.grey, x, G + 1.05, z));
  return { top, G };
}

// ---------- el cable: antena → torre → tubo bajo la calle → estación → arqueta → mar (z = 6)
function ibeConduit() {
  const G = IBE_TWG, y = IBE_TY, X = IBE_TWX, Z = IBE_TWZ, top = G + IBE_TWH - 2, zc = IBE_TZ - 0.12, sx = 10.4, sG = ibeG(10.4) + 0.09, ax = 3, ay = ibeG(3);
  const P = [[X + 0.1, top + 0.9, Z + 1.15], [X + 0.25, top + 0.5, Z + 0.6], [X + 0.32, top, Z + 0.22], [X + 0.32, top - 6, Z + 0.22], [X + 0.32, G + 8, Z + 0.22], [X + 0.32, G + 1, Z + 0.22], [X + 0.32, G - 0.4, Z + 0.4],
    [X + 0.2, y + 0.1, Z + 1.2], [X, y, Z + 3], [X, y, 6], [X, y, 12], [X, y, zc - 2], [X - 0.6, y, zc - 0.4], [X - 2, y, zc], [25, y, zc], [20, y, zc], [15, y, zc], [12, y, zc], [10.6, y, zc - 0.4], [10.0, y, zc - 2],
    [sx - 0.4, y, 14], [sx - 0.4, y + 0.4, 12.6], [sx - 0.4, sG + 0.2, 11.6], [sx - 0.5, sG + 0.5, 10.6], [sx - 1.6, sG + 0.4, 9.6], [sx - 2.6, sG - 0.3, 8.6], [7.6, ibeG(7.6) - 0.6, 7.4],
    [5.6, ibeG(5.6) - 0.5, 6.4], [4.2, ay - 0.2, CABLE_Z + 0.05], [ax, ay + 0.1, CABLE_Z], [ax - 0.7, ibeG(ax - 0.7) + 0.03, CABLE_Z], [1.6, ibeG(1.6) + 0.035, CABLE_Z], [0.8, ibeG(0.8) + 0.035, CABLE_Z], [0, ibeG(0) + 0.0, CABLE_Z]].map(p => v3(...p));
  const cv = new THREE.CatmullRomCurve3(P, false, 'centripetal'); cv.arcLengthDivisions = 3000; return cv;
}
function ibeUOf(cv, p) { let best = 0, bd = 1e9; for (let i = 0; i <= 3000; i++) { const u = i / 3000, d = cv.getPointAt(u).distanceToSquared(p); if (d < bd) { bd = d; best = u; } } return best; }

// ---------- las ondas (anillos cian que van de la ventana a los paneles de la antena)
function ibeWavePath() { const top = IBE_TWG + IBE_TWH - 2 + 0.9;
  return new THREE.CatmullRomCurve3([v3(IBE_WX, IBE_WY, IBE_WZ + 0.4), v3(IBE_WX - 0.4, IBE_WY + 2.2, IBE_WZ + 2.6), v3(38.5, IBE_YF + 9, 10.5), v3(35, top - 7, 3), v3(32, top - 1.5, -2.6), v3(IBE_TWX + 0.25, top, IBE_TWZ + 1.5)], false, 'centripetal'); }

// ---------------------------------------------------------------- construir
function buildIberia() {
  const M2 = ibeMats(), g = new THREE.Group(), Q = IBE.Q; g.name = 'iberia'; IBE.root = g;
  ibeTerrain(g);
  // el pueblo: fila de delante (fachadas a la calle de delante, z = 13) y fila de atrás (fachadas a la calle de atrás, z = 0)
  const F = [
    { x0: 15.5, x1: 21.8, z0: 7, z1: 13, h: 5.6, roof: 'gable', zoc: 0, sh: 0, lit: [1, 0, 0, 2], door: 1, balcony: true, balIdx: 0, pots: 2 },
    { x0: 22.2, x1: 27.8, z0: 7.4, z1: 13, h: 3.3, roof: 'flat', zoc: 2, sh: 1, lit: [0, 1], door: 0, pots: 3 },
    { x0: 32.2, x1: 36.6, z0: 7, z1: 13, h: 5.6, roof: 'gable', zoc: 1, sh: 2, lit: [0, 2, 1], door: 0, balcony: true, balIdx: 1 },
    { x0: 44.4, x1: 50, z0: 7, z1: 13, h: 5.6, roof: 'gable', zoc: 0, sh: 1, lit: [2, 0, 0, 1], door: 1, balcony: true, balIdx: 1, pots: 2 },
    { x0: 50.4, x1: 57.5, z0: 7.4, z1: 13, h: 3.4, roof: 'flat', zoc: 1, sh: 0, lit: [0, 1, 0], door: 2, pots: 4 },
    { x0: 14, x1: 20.5, z0: -8, z1: 0, h: 5.4, roof: 'gable', zoc: 2, sh: 3, lit: [0, 1, 2, 0], door: 2, balcony: true, balIdx: 2 },
    { x0: 20.9, x1: 25.6, z0: -6.5, z1: 0, h: 3.3, roof: 'flat', zoc: 0, sh: 1, lit: [1, 0], door: 1, pots: 2 },
    { x0: 35, x1: 41, z0: -7.5, z1: 0, h: 5.6, roof: 'gable', zoc: 1, sh: 0, lit: [0, 0, 1, 0], door: 0, balcony: true, balIdx: 1 },
    { x0: 41.4, x1: 47, z0: -6, z1: 0, h: 3.3, roof: 'flat', zoc: 2, sh: 2, lit: [2, 0], door: 1 },
  ];
  for (const o of F) ibeHouse(g, o);
  ibeChurch(g);
  ibeMotherHouse(g);
  const st = ibeStation(g), tw = ibeTower(g);
  // farolas, árboles, una luz de calle
  for (const [x, z] of [[14.6, 19.3], [24.5, 19.3], [45.5, 19.3], [56, 19.3], [27.8, 4.9], [48, 4.9]]) ibeLampPost(g, x, z);
  for (const [x, z, s] of [[22, -14, 1], [30, -14.5, 1.2], [42, -15, 1], [54, -14, 1.1], [12, -15, 0.9], [9.5, -4, 0.8], [57, 2.5, 0.8]]) ibeOlive(g, x, z, s);
  for (const [x, z] of [[33.5, -9.5], [35.5, -12], [26.5, -12], [8.8, 2.5], [59, -6]]) ibeCypress(g, x, z, 1);
  const sl = new THREE.PointLight(0xffb36a, 60, 26, 2); sl.position.set(37.5, ibeG(37) + 5.2, 17.2); g.add(sl); Q.streetLight = sl;
  // el cable (negro) + su luz (tubo aditivo con color por vértice) + la cabeza del pulso
  const cv = ibeConduit(); Q.cv = cv;
  const cab = new THREE.Mesh(new THREE.TubeGeometry(cv, 900, 0.055, 8, false), M2.cable); cab.castShadow = true; g.add(cab);
  const gg = new THREE.TubeGeometry(cv, 900, 0.085, 8, false), nC = gg.attributes.position.count; gg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(nC * 3), 3));
  const glow = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); glow.renderOrder = 5; glow.frustumCulled = false; g.add(glow); Q.glow = glow;
  const head = ibeGlow(0xdffeff, 2.2, 2.4); head.renderOrder = 6; g.add(head); Q.head = head; const head2 = ibeGlow(COL.light, 4.5, 0.8); head2.renderOrder = 6; g.add(head2); Q.head2 = head2;
  const pl = new THREE.PointLight(COL.light, 0, 5, 2); g.add(pl); Q.pLight = pl;
  const towerTopP = cv.getPointAt(0);
  Q.uAnt = 0; Q.uSta = ibeUOf(cv, v3(10.4 - 0.5, ibeG(10.4) + 0.59, 10.6)); Q.uSea = 1;
  // la burbuja del mensaje y las ondas
  const bub = msgBubble(IBE_TXT); bub.visible = false; g.add(bub); Q.bub = bub;
  Q.wp = ibeWavePath();
  const ringM = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.light).multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  Q.rings = []; for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.032, 8, 72), ringM()); r.visible = false; r.renderOrder = 7; g.add(r); Q.rings.push(r); }
  Q.burst = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.light).multiplyScalar(1.3), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); Q.burst.visible = false; g.add(Q.burst);
  Q.antFlash = ibeGlow(COL.light, 6, 1.4); Q.antFlash.position.copy(Q.wp.getPointAt(1)); Q.antFlash.visible = false; g.add(Q.antFlash);
  // anclas (marco local)
  const B = Q.mom; g.updateMatrixWorld(true);
  g.userData.anchors = {
    window: v3(IBE_WX, IBE_WY, IBE_WZ + 0.1), phone: g.worldToLocal(wpos(Q.phone)), antenna: Q.wp.getPointAt(1), towerBase: v3(IBE_TWX, IBE_TWG, IBE_TWZ), towerTop: v3(IBE_TWX, IBE_TWG + IBE_TWH + 1.3, IBE_TWZ),
    station: v3(st.x, st.y + 3.2, st.z), manhole: v3(3, ibeG(3) + 0.3, CABLE_Z), kitchenCam: v3(...IBE_CAM_IN(1).slice(0, 3)), conduitCut: v3(20, IBE_TY, IBE_TZ), sea: v3(0, 0, CABLE_Z), conduit: cv, clock: g.worldToLocal(wpos(Q.clock)),
  };
  iberiaAt(0, {}); return g;
}
function ibeChurch(g) {      // la iglesia (espadaña blanca con campana) al fondo
  const M2 = ibeMats(), x0 = 48, x1 = 57, z0 = -12, z1 = 0, G = ibeG(52) + 0.09;
  ibeHouse(g, { x0, x1, z0, z1, h: 6.5, roof: 'gable', zoc: 0, sh: 2, lit: [0, 0, 0, 0, 0, 0], door: 1, noReja: true, rh: 2.2 });
  const tw = mesh(ibeUV(new THREE.BoxGeometry(3, 11, 3), 1.2, 4), M2.wall); tw.position.set(55.5, G + 5.5, -1.5); g.add(tw);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.2, 4), M2.roof); cap.rotation.y = Math.PI / 4; cap.position.set(55.5, G + 12.1, -1.5); cap.castShadow = true; g.add(cap);
  const arch = ibeBox(1.3, 1.8, 3.05, new THREE.MeshStandardMaterial({ color: 0x0c1020, roughness: 1 }), 55.5, G + 9.3, -1.5); g.add(arch);
  const bell = lathe([[0.001, 0.75], [0.25, 0.7], [0.35, 0.4], [0.42, 0.05], [0.48, 0]], 20, new THREE.MeshStandardMaterial({ color: 0xb48a3a, roughness: 0.35, metalness: 0.8 })); bell.position.set(55.5, G + 8.7, -0.2); g.add(bell);
  const clk = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff0d0, emissiveIntensity: 1.1 })); clk.position.set(55.5, G + 7.0, 0.02); g.add(clk);
  const cross = new THREE.Group(); cross.add(ibeBox(0.1, 1.0, 0.1, M2.iron, 0, 0, 0), ibeBox(0.55, 0.1, 0.1, M2.iron, 0, 0.18, 0)); cross.position.set(55.5, G + 13.6, -1.5); g.add(cross);
}

// ---------------------------------------------------------------- animar
const _ibeC = new THREE.Color();
function iberiaAt(t, o = {}) {
  const Q = IBE.Q, type = clamp(o.type ?? 0), send = clamp(o.send ?? 0), waves = clamp(o.waves ?? 0), pulse = clamp(o.pulse ?? 0), pulse2 = clamp(o.pulse2 ?? 0);
  ibeScreen(type, send); ibeHands(t, type, send);
  // la burbuja: sale de la pantalla y flota (send 0,45→1); con las ondas (waves 0→0,3) cruza la cocina y sale por la ventana; ahí se deshace en anillos
  const bub = Q.bub, F = Q.PF, rise = eo(clamp((send - 0.45) / 0.55)), fly = eio(clamp(waves / 0.3)), pop = clamp((waves - 0.28) / 0.08);
  const pS = Q.mom.localToWorld(ibeScreenP(270, 500, 0.01)), pH = Q.mom.localToWorld(ibeScreenP(270, 500, 0.01).addScaledVector(F.Z, 0.045).addScaledVector(F.Y, 0.035)), win0 = v3(IBE_WX, IBE_WY + 0.1, IBE_WZ + 0.6);
  if (send > 0.45 && pop < 1) {
    let p; if (waves <= 0) p = pS.clone().lerp(pH, rise); else { const mid = pH.clone().lerp(win0, 0.5).add(v3(0, 0.12, 0)); p = pH.clone().multiplyScalar((1 - fly) * (1 - fly)).addScaledVector(mid, 2 * fly * (1 - fly)).addScaledVector(win0, fly * fly); }
    bub.visible = true; bub.position.copy(IBE.root.worldToLocal(p)); bub.position.y += 0.01 * Math.sin(t * 5) * rise;
    const s = (waves <= 0 ? lerp(0.05, 0.075, rise) : lerp(0.075, 0.5, fly * fly)) * (1 + 0.35 * Math.sin(pop * Math.PI)) * (1 - eo(pop));
    bub.scale.setScalar(Math.max(0.001, s)); const qA = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(F.X, F.Y, F.Z)), qB = new THREE.Quaternion();
    bub.quaternion.copy(qA).slerp(qB, eo(fly));
  } else bub.visible = false;
  // destello al deshacerse
  const bk = clamp((waves - 0.3) / 0.16); Q.burst.visible = false && bk < 1;   // (el destello en esfera envolvía la cámara junto a la ventana: apagado) if (Q.burst.visible) { Q.burst.position.copy(win0); Q.burst.scale.setScalar(0.25 + 1.1 * eo(bk)); Q.burst.material.opacity = 0.35 * (1 - bk); }
  // los anillos: salen de la ventana uno tras otro y crecen mientras viajan a la antena (el primero llega con waves ≈ 0,69; el último con waves = 1)
  const wv = (waves - 0.3) / 0.7, k = 1 / 0.55, gap = (k - 1) / (Q.rings.length - 1);
  Q.rings.forEach((r, i) => { const s = wv * k - i * gap; r.visible = waves > 0.3 && s > 0 && s < 1; if (!r.visible) return;
    const p = Q.wp.getPointAt(s), tg = Q.wp.getTangentAt(s); r.position.copy(p); r.quaternion.setFromUnitVectors(v3(0, 0, 1), tg); r.scale.setScalar(0.4 + 1.6 * Math.sin(Math.min(s, 0.75) / 0.75 * Math.PI / 2) - 0.4 * clamp((s - 0.85) / 0.15));
    r.material.opacity = Math.min(1, s / 0.05, (1 - s) / 0.08) * 0.85; });
  const arrive = clamp((waves - 0.68) / 0.32); Q.panM.emissiveIntensity = waves > 0.68 ? 0.6 + 0.9 * Math.abs(Math.sin(waves * 40)) * (1 - 0.5 * arrive) + 0.5 * clamp((pulse) * 3) * (1 - pulse) : 0;
  Q.antFlash.visible = waves > 0.68 || (pulse > 0 && pulse < 0.15); Q.antFlash.material.opacity = waves > 0.68 && pulse <= 0 ? 0.6 + 0.4 * Math.sin(t * 20) : clamp(1 - pulse / 0.15);
  // el pulso de luz por el cable
  const g2 = Q.glow.geometry, cA = g2.attributes.color, seg = 900, rad = 9, Lc = Q.cv.getLength();
  const on = pulse > 0 || pulse2 > 0, uh = pulse2 > 0 ? lerp(Q.uSta, Q.uSea, pulse2) : lerp(Q.uAnt, Q.uSta, pulse), wH = 1.2 / Lc;
  for (let i = 0; i <= seg; i++) { const u = i / seg; let v = 0;
    if (on) { const d = (u - uh) / wH; v = 3.2 * Math.exp(-d * d); if (u < uh) v += 0.55 + 0.9 * Math.exp((u - uh) / (6 / Lc)); }
    _ibeC.setRGB(0.45 * v, 0.92 * v, 1.0 * v); for (let j = 0; j <= rad; j++) cA.setXYZ(i * (rad + 1) + j, _ibeC.r, _ibeC.g, _ibeC.b); }
  cA.needsUpdate = true; Q.glow.visible = on;
  const hp = Q.cv.getPointAt(clamp(uh)); for (const h of [Q.head, Q.head2]) { h.visible = on && uh < 0.999; h.position.copy(hp); }
  Q.head.scale.setScalar(1.3 + 0.2 * Math.sin(t * 30)); Q.pLight.position.copy(hp); Q.pLight.intensity = on ? 6 : 0;
  Q.stPil.material.emissiveIntensity = 1.5 + (Math.abs(uh - Q.uSta) < 0.02 && on ? 6 : 0);
  // la luz roja de la torre parpadea
  const bl = 0.5 + 0.5 * Math.sin(t * 2.6); Q.beacon.m.emissiveIntensity = 1 + 3.5 * bl; Q.beacon.g.material.opacity = 0.35 + 0.65 * bl;
}

// ---------------------------------------------------------------- cámaras (marco local): [px,py,pz, lx,ly,lz, fov]
// el plano de la cocina: casi el punto de vista de la madre, un poco a su derecha, a 30 cm de su móvil
const IBE_KC = { p: [IBE_MOM.x + 0.11, IBE_YF + 1.157, IBE_MOM.z - 0.183], l: [IBE_MOM.x, IBE_YF + 0.928, IBE_MOM.z - 0.462] };
function ibeCam(u, KS) { const c = camKeys(u, KS); return [c.p.x, c.p.y, c.p.z, c.l.x, c.l.y, c.l.z, c.f]; }
// entrada (≈ 1,8 s): desde muy alto sobre el mar baja al pueblo, se mete por la ventana de la cocina y pasa junto a la madre hasta su móvil
function IBE_CAM_IN(u) {
  return ibeCam(u, [
    [0, [-170, 230, 150], [32, 4, 4], 34],
    [0.42, [58, 26, 62], [40, 5, 12], 36],
    [0.7, [40.6, IBE_YF + 2.6, 19.5], [40.2, IBE_WY - 0.1, 12], 38],
    [0.84, [40.2, IBE_WY + 0.05, 13.3], [39.6, IBE_YF + 1.1, 10.8], 40],
    [0.93, [39.85, IBE_YF + 1.42, 11.75], [39.35, IBE_YF + 0.95, 10.9], 38],
    [1, IBE_KC.p, IBE_KC.l, 34]]);
}
// salida (≈ 5 s): retrocede por la ventana delante de la burbuja, plano medio ventana-calle-torre con los anillos, sube a la antena,
// baja por la torre y acaba mirando el corte del tubo bajo la calle con la luz corriendo.
// Sincronía pensada: waves ≈ clamp(u / 0,52) · pulse ≈ clamp((u − 0,55) / 0,45) · (pulse2 después, con otra cámara)
function IBE_CAM_OUT(u) {
  const top = IBE_TWG + IBE_TWH - 2;
  return ibeCam(u, [
    [0, IBE_KC.p, IBE_KC.l, 34],
    [0.06, [39.85, IBE_YF + 1.45, 11.85], [39.35, IBE_YF + 1.0, 10.9], 38],
    [0.12, [40.2, IBE_WY + 0.05, 12.95], [39.7, IBE_YF + 1.1, 10.4], 42],
    [0.2, [40.6, IBE_WY + 0.9, 17.5], [40.2, IBE_WY + 0.3, 12], 44],
    [0.34, [46, 10, 36], [35, 12, 4], 46],
    [0.6, [39, top + 2, 10], [30.5, top + 0.2, -5], 40],
    [0.74, [37.5, 13, 9], [30.4, 7, -5.5], 42],
    [0.8, [38.5, 9.5, 18], [30, 3.5, 19], 44],
    [0.88, [35, 5.5, 30], [26, 2.4, 20], 44],
    [1, [31.5, 4.3, 26.5], [17.5, 2.0, 19.8], 44]]);
}
