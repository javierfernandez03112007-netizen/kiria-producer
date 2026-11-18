// ---------------------------------------------------------------- LA CIUDAD: suelo, manzanas, tiendas de campaña (hoy), casas (pueblo), edificios (ciudad),
// mercado, banco, hacienda (impuestos), el lago (sequía), el trono gigante y la corona. Todo con instancias y sin texturas ajenas.
const CITY = { uCrisis: { value: 0 } };
const stdM = (c, r = 0.85, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
// material que se vuelve gris con la crisis
function crisisMat(m) { const prev = m.onBeforeCompile; m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); sh.uniforms.uCrisis = CITY.uCrisis;
    sh.fragmentShader = 'uniform float uCrisis;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n { float g0 = dot(diffuseColor.rgb, vec3(0.3, 0.6, 0.1)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(g0) * 0.82, uCrisis * 0.85); }'); }; return m; }
const cM = (c, r = 0.85, o = {}) => crisisMat(stdM(c, r, o));
function inst(geo, mat, n, cast = true) { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m; }
const _IM = new THREE.Matrix4(), _IP = new THREE.Vector3(), _IQ = new THREE.Quaternion(), _IS = new THREE.Vector3(), _IE = new THREE.Euler(), _IC = new THREE.Color(), _IC2 = new THREE.Color();
function setI(m, i, x, y, z, sx, sy, sz, ry = 0) { _IE.set(0, ry, 0); _IQ.setFromEuler(_IE); _IP.set(x, y, z); _IS.set(Math.max(1e-4, sx), Math.max(1e-4, sy), Math.max(1e-4, sz)); _IM.compose(_IP, _IQ, _IS); m.setMatrixAt(i, _IM); }
const boxG = (w, h, d, y = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, y, 0); return g; };
function addBox(par, w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; par.add(b); return b; }
const popK = k => { k = clamp(k); return k <= 0 ? 0 : k >= 1 ? 1 : 1 + Math.sin(k * Math.PI * 1.15) * (1 - k) * 0.5 + (eo(k) - 1); };

function buildThrone() { const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.9 }), red = stdM(0xb3202a, 0.75), stone = stdM(0xdcd6c8, 0.9);
  const s1 = cyl(13, 14, 0.9, stone, 44); s1.position.y = 0.45; const s2 = cyl(10.6, 11.6, 0.9, stone, 44); s2.position.y = 1.35; g.add(s1, s2); const y0 = 1.8;
  addBox(g, 9, 5, 8, gold, 0, y0 + 2.5, 0); addBox(g, 7.2, 1.0, 6.2, red, 0, y0 + 5.5, 0.5); addBox(g, 9, 15, 1.6, gold, 0, y0 + 12.5, -3.2); addBox(g, 6.6, 11, 0.4, red, 0, y0 + 11.5, -2.3);
  { const a = cyl(4.5, 4.5, 1.6, gold, 36); a.rotation.x = Math.PI / 2; a.position.set(0, y0 + 20, -3.2); g.add(a); const b = cyl(3.3, 3.3, 0.4, red, 30); b.rotation.x = Math.PI / 2; b.position.set(0, y0 + 20, -2.3); g.add(b); }
  for (const sx of [-1, 1]) { addBox(g, 1.5, 3, 7, gold, sx * 3.75, y0 + 6.5, 0.4); const f = sph(1.0, gold, 16, 12); f.position.set(sx * 3.75, y0 + 8.6, 3.5); f.castShadow = true; g.add(f); const f2 = sph(1.0, gold, 16, 12); f2.position.set(sx * 4.5, y0 + 20.8, -3.2); g.add(f2); }
  g.rotation.y = Math.PI / 4; g.scale.setScalar(1.3); g.userData.seatY = (y0 + 6) * 1.3; return g; }
function buildCrown() { const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xffd04a, roughness: 0.22, metalness: 0.95, side: THREE.DoubleSide, emissive: 0x6a4a00, emissiveIntensity: 0.5 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.45, 1.7, 28, 1, true), gold); ring.castShadow = true; g.add(ring);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.9, 4), gold); c.position.set(Math.cos(a) * 2.7, 1.75, Math.sin(a) * 2.7); c.castShadow = true; g.add(c);
    const j = sph(0.36, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd9263a : 0x2f7fe0, roughness: 0.15, metalness: 0.2, emissive: i % 2 ? 0x5a0a12 : 0x0a2a5a }), 10, 8); j.position.set(Math.cos(a) * 2.7, 2.85, Math.sin(a) * 2.7); g.add(j); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex0(), color: 0xffe08a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(16); g.add(halo); g.userData.halo = halo; return g; }
function buildMercado() { const g = new THREE.Group(), wood = cM(0xb98a5a, 0.8), cols = [['#d9342b', '#ffffff'], ['#2f9e5a', '#ffffff'], ['#2f6fd0', '#ffffff'], ['#f0a020', '#ffffff']];
  let n = 0; for (const x of [-9, 0, 9]) for (const z of [-7, 7]) { const c = cols[n++ % 4], t = canvasTex(64, 64, (q, w, h) => { for (let i = 0; i < 8; i++) { q.fillStyle = c[i % 2]; q.fillRect(i * 8, 0, 8, h); } });
      addBox(g, 6, 1.3, 3.4, wood, x, 1.15, z); const aw = addBox(g, 7.2, 0.3, 5, crisisMat(stdM(0xffffff, 0.8, { map: t })), x, 4.3, z + 0.3); aw.rotation.x = 0.2; for (const px of [-3.2, 3.2]) addBox(g, 0.25, 3.6, 0.25, wood, x + px, 2.3, z - 1.6);
      for (let k = 0; k < 6; k++) { const f = sph(0.5, cM([0xf08a1c, 0xd9342b, 0x7fbf3a, 0xf2d03a][(k + n) % 4], 0.6), 8, 6); f.position.set(x - 2.2 + (k % 3) * 2.2, 2.1, z - 0.6 + Math.floor(k / 3) * 1.2); g.add(f); } }
  return g; }
function buildBanco() { const g = new THREE.Group(), stone = cM(0xece6d6, 0.8), dark = cM(0xcfc7b2, 0.85), gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.9 });
  addBox(g, 24, 1.4, 19, dark, 0, 1.2, 0); addBox(g, 20, 9, 12, stone, 0, 6.4, -2.5); for (let i = 0; i < 6; i++) { const c = cyl(0.95, 0.95, 9, stone, 14); c.position.set(-9 + i * 3.6, 6.4, 6); g.add(c); } addBox(g, 22, 1.2, 17, dark, 0, 11.5, 0);
  { const s = new THREE.Shape(); s.moveTo(-11.5, 0); s.lineTo(11.5, 0); s.lineTo(0, 5); s.lineTo(-11.5, 0); const p = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 16, bevelEnabled: false }), stone); p.position.set(0, 12.1, -8); p.castShadow = p.receiveShadow = true; g.add(p); }
  { const c = cyl(1.7, 1.7, 0.5, gold, 24); c.rotation.x = Math.PI / 2; c.position.set(0, 13.9, 8.2); g.add(c); } g.rotation.y = Math.PI / 4; return g; }
function buildHacienda() { const g = new THREE.Group(), wall = cM(0xf0dcc0, 0.85), roof = cM(0xb4472f, 0.8), gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.9 });
  addBox(g, 20, 9, 14, wall, 0, 5, 0); addBox(g, 21.5, 1, 15.5, roof, 0, 10, 0); addBox(g, 6, 19, 6, wall, -6, 10, 0); { const r = new THREE.Mesh(new THREE.ConeGeometry(5, 4.5, 4), roof); r.rotation.y = Math.PI / 4; r.position.set(-6, 21.7, 0); r.castShadow = true; g.add(r); }
  // un «%» dorado enorme encima (los impuestos)
  const pc = new THREE.Group(); for (const [x, y] of [[-2.6, 2.6], [2.6, -2.6]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.6, 10, 22), gold); t.position.set(x, y, 0); t.castShadow = true; pc.add(t); }
  { const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 11, 1.1), gold); b.rotation.z = -0.62; b.castShadow = true; pc.add(b); } pc.position.set(4.5, 17.5, 1); pc.rotation.x = -0.25; g.add(pc); g.userData.pc = pc; g.rotation.y = Math.PI / 4; return g; }

function buildCity() {
  const g = new THREE.Group(), C = CITY; C.g = g; const BL = C.BL = makeBlocks(), core = BL.filter(b => b.core), norm = BL.filter(b => !b.kind);
  // ---- suelo: hierba (con un poco de grano), las calles de la ciudad (tierra hoy; asfalto en la ciudad) y las del anillo de crecimiento
  { const t = canvasTex(256, 256, (q, w, h) => { q.fillStyle = '#7cb657'; q.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { q.fillStyle = hash(i * 1.3) > 0.5 ? 'rgba(255,255,220,.07)' : 'rgba(20,60,10,.08)'; q.fillRect(hash(i * 2.1) * w, hash(i * 3.7) * h, 3, 3); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(260, 260); const gr = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), cM(0xffffff, 0.95, { map: t })); gr.rotation.x = -Math.PI / 2; gr.receiveShadow = true; g.add(gr); C.grass = gr;
    const rot = new THREE.Group(); rot.rotation.y = Math.PI / 4; g.add(rot); const pl = (hu, hv, y, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * hu, 2 * hv), cM(col, 0.95)); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; rot.add(m); return m; };
    C.ringSt = pl(REG2.u + 9, REG2.v + 9, 0.03, 0x7cb657); C.coreSt = pl(REG.u + 9, REG.v + 9, 0.05, 0xc2a36f);
    const pz = cyl(28.5, 28.5, 0.12, cM(0xd9cdb2, 0.9), 56); pz.position.y = 0.09; pz.castShadow = false; g.add(pz); C.plaza = pz; }
  // ---- manzanas (césped) y aceras
  C.lawn = inst(boxG(BLOCK, 0.5, BLOCK, 0.25), cM(0xffffff, 0.95), BL.length, false); C.walk = inst(boxG(BLOCK + 3.2, 0.3, BLOCK + 3.2, 0.15), cM(0xffffff, 0.9), BL.length, false); g.add(C.walk, C.lawn);
  BL.forEach((b, i) => { setI(C.lawn, i, b.x, 0, b.z, 1, 1, 1); setI(C.walk, i, b.x, 0, b.z, 1, 1, 1); C.lawn.setColorAt(i, _IC.set(0x8cc063)); C.walk.setColorAt(i, _IC.set(0xc2a36f)); });
  // ---- hogares: cada manzana tiene 24 parcelas (5 × 5 menos la hoguera del centro). Hoy son tiendas de campaña y CADA UNA ES DE 5 SEGUIDORES
  // (hogar n = seguidores 5n … 5n+4; los primeros, más cerca del trono). Las parcelas que sobran están libres; una de ellas es PLOTP.
  const G5 = []; for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) if (a || c) G5.push([a * 5.6, c * 5.6]);
  const tcol = [0xefe2c4, 0xdf8f4c, 0x5f8fc9, 0xc9504f, 0x6aa86a, 0xe6c34a, 0xf4f1ea], camp = core.filter(b => !b.kind).sort((p, q) => p.m - q.m);
  C.homes = []; camp.forEach(b => G5.forEach((o, k) => C.homes.push({ b, x: b.x + o[0], z: b.z + o[1], ry: (h2(b.i * 3 + k, b.j * 5) - 0.5) * 0.7, s: 0.88 + h2(k, b.i + b.j) * 0.24 })));
  const plotHome = C.homes.splice(C.homes.findIndex(h => Math.hypot(h.x - PLOTP.x, h.z - PLOTP.z) < 1), 1)[0]; C.NH = Math.ceil(NPOP / 5); if (!plotHome || C.homes.length < C.NH) console.error('ERROR faltan parcelas: ' + C.homes.length + ' < ' + C.NH);
  { const tg = new THREE.ConeGeometry(2.9, 3.5, 4, 1); tg.rotateY(Math.PI / 4); tg.translate(0, 1.75, 0); C.tentG = tg; C.tents = inst(tg, cM(0xffffff, 0.9), C.NH); g.add(C.tents);
    for (let i = 0; i < C.NH; i++) C.tents.setColorAt(i, _IC.set(tcol[Math.floor(h2(i * 1.7, 3.1) * tcol.length)]));
    C.fires = inst(new THREE.SphereGeometry(0.75, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff8a2a).multiplyScalar(2.0), toneMapped: false }), camp.length, false); C.fireB = camp; g.add(C.fires); }
  // ---- casas (pueblo): una por parcela (también las libres y las del anillo: la ciudad crece), con tejado a cuatro aguas
  C.houseB = [...C.homes, plotHome]; BL.filter(b => !b.core && !b.kind).forEach(b => G5.forEach(o => C.houseB.push({ b, x: b.x + o[0], z: b.z + o[1], s: 1 })));
  { const rg = new THREE.ConeGeometry(3.55, 2.3, 4, 1); rg.rotateY(Math.PI / 4); rg.translate(0, 0.5 + 3.0 + 1.15, 0); const n = C.houseB.length;
    C.walls = inst(boxG(4.5, 3.0, 4.5, 0.5 + 1.5), cM(0xffffff, 0.9), n); C.roofs = inst(rg, cM(0xffffff, 0.85), n); g.add(C.walls, C.roofs);
    const wc = [0xf6ecd9, 0xf7dcae, 0xe9e3d3, 0xdfeaf2, 0xf2d6c8], rc = [0xc8553d, 0xb4472f, 0x7a5c8a, 0x3f7fb0, 0xd98b3a, 0x4f9a6a];
    C.houseB.forEach((q, i) => { q.hs = 0.92 + h2(i * 1.3, 7.7) * 0.16; C.walls.setColorAt(i, _IC.set(wc[Math.floor(h2(i * 2.9, 1.1) * wc.length)])); C.roofs.setColorAt(i, _IC.set(rc[Math.floor(h2(q.b.i * 3 + q.b.j, Math.floor(i / 6)) * rc.length)])); }); }
  // ---- edificios (ciudad): en las manzanas del centro, más altos cuanto más cerca de la plaza; ventanas dibujadas por posición
  const OFF = [[-7.5, -7.5], [7.5, -7.5], [-7.5, 7.5], [7.5, 7.5]];
  const tb = core.filter(b => !b.kind && b.m < 0.62); C.towerB = []; { const mt = stdM(0xffffff, 0.6);
    mt.onBeforeCompile = sh => { sh.uniforms.uCrisis = CITY.uCrisis;
      sh.vertexShader = 'varying vec3 vWp; varying vec3 vNo;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWp = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz; vNo = normal;');
      sh.fragmentShader = 'varying vec3 vWp; varying vec3 vNo; uniform float uCrisis;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { vec2 q = abs(vNo.x) > 0.5 ? vWp.zy : vWp.xy; vec2 cs = vec2(2.75, 3.2); vec2 f = fract(q / cs); float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.28, f.y) * step(f.y, 0.78) * step(abs(vNo.y), 0.5) * step(1.4, vWp.y);
          float lit = step(0.5, fract(sin(dot(floor(q / cs), vec2(12.9898, 78.233))) * 43758.5453));
          vec3 wc = mix(vec3(0.17, 0.27, 0.42), vec3(0.62, 0.82, 0.98), lit * (1.0 - uCrisis)); diffuseColor.rgb = mix(diffuseColor.rgb, wc, win);
          float g0 = dot(diffuseColor.rgb, vec3(0.3, 0.6, 0.1)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(g0) * 0.8, uCrisis * 0.85); }`); };
    C.towers = inst(boxG(1, 1, 1, 0.5), mt, tb.length * 4); g.add(C.towers); const tc = [0xe9e4da, 0xd9c7b0, 0xc9d6e2, 0xe6d3c0, 0xbfc9d2, 0xf0e2c2, 0xd2b8a8];
    tb.forEach((b, bi) => OFF.forEach((o, k) => { const near = 1 - b.m / 0.62; C.towerB.push({ b, x: b.x + o[0], z: b.z + o[1], w: 10.5 + h2(b.i + k, b.j * 2) * 2.5, h: 10 + near * 13 * (0.45 + h2(b.i * 7 + k, b.j * 3)) + h2(k, b.i) * 5 }); C.towers.setColorAt(bi * 4 + k, _IC.set(tc[Math.floor(h2(b.i * 3 + k * 5, b.j) * tc.length)])); })); }
  // ---- edificios especiales y el lago
  const at0 = (o, key) => { const b = BL.find(q => q.kind === key); o.position.set(b.x, 0.5, b.z); g.add(o); o.userData.b = b; return o; };
  C.mercado = at0(buildMercado(), 'mercado'); C.banco = at0(buildBanco(), 'banco'); C.hacienda = at0(buildHacienda(), 'hacienda');
  { const b = BL.find(q => q.kind === 'lago'); C.lagoB = b; const bed = new THREE.Mesh(new THREE.CircleGeometry(11.8, 40), cM(0x9a7a4e, 0.95)); bed.rotation.x = -Math.PI / 2; bed.position.set(b.x, 0.53, b.z); bed.receiveShadow = true; g.add(bed);
    const w = new THREE.Mesh(new THREE.CircleGeometry(11.2, 40), new THREE.MeshPhysicalMaterial({ color: 0x3f9fe0, roughness: 0.08, metalness: 0.1, clearcoat: 1 })); w.rotation.x = -Math.PI / 2; w.position.set(b.x, 0.57, b.z); g.add(w); C.water = w; }
  // ---- árboles: en el parque del lago y un bosque alrededor de la ciudad
  { const pts = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; pts.push([C.lagoB.x + Math.cos(a) * 13.6, C.lagoB.z + Math.sin(a) * 13.6]); }
    for (let i = 0; i < 2600 && pts.length < 1150; i++) { const u = (hash(i * 1.7) - 0.5) * 900, v = (hash(i * 2.9) - 0.5) * 1500; if (Math.abs(u) < REG2.u + 16 && Math.abs(v) < REG2.v + 16) continue; const p = fromUV(u, v); pts.push(p); }
    const fg = new THREE.ConeGeometry(2.6, 6.5, 7); fg.translate(0, 5, 0); C.treeF = inst(fg, cM(0xffffff, 0.9), pts.length); const kg = new THREE.CylinderGeometry(0.45, 0.6, 2.2, 6); kg.translate(0, 1.1, 0); C.treeK = inst(kg, cM(0x7a5a3a, 0.9), pts.length, false); g.add(C.treeF, C.treeK); C.treeP = pts;
    pts.forEach((p, i) => { const s = 0.8 + hash(i * 5.1) * 0.9; setI(C.treeF, i, p[0], 0, p[1], s, s, s, hash(i) * 6); setI(C.treeK, i, p[0], 0, p[1], s, s, s); C.treeF.setColorAt(i, _IC.set([0x3f8a4b, 0x4f9a52, 0x357a45, 0x5aa457][i % 4])); }); }
  // ---- el trono (gigante) y la corona
  C.throne = buildThrone(); g.add(C.throne); C.crown = buildCrown(); g.add(C.crown); C.crown.visible = false;
  // ---- el solar vacío: contorno de rayas y una tienda fantasma
  { const p = new THREE.Group(); p.position.copy(PLOTP).setY(0.55); const mw = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, toneMapped: false });
    for (let s2 = 0; s2 < 4; s2++) for (let k = 0; k < 4; k++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.2), mw), q = -1.95 + k * 1.3; if (s2 < 2) d.position.set(q, 0, s2 ? 2.6 : -2.6); else { d.rotation.y = Math.PI / 2; d.position.set(s2 === 2 ? 2.6 : -2.6, 0, q); } p.add(d); }
    const gm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }); p.add(new THREE.Mesh(C.tentG, gm)); g.add(p); C.plot = p; C.plotM = [mw, gm]; }
  // ---- monedas de los impuestos (vuelan de las casas a la hacienda)
  { const cg = new THREE.CylinderGeometry(1.1, 1.1, 0.3, 14); cg.rotateX(Math.PI / 2); C.coins = inst(cg, new THREE.MeshStandardMaterial({ color: 0xffd04a, roughness: 0.25, metalness: 0.95, emissive: 0x6a4a00, emissiveIntensity: 0.6 }), 46); g.add(C.coins);
    C.coinS = []; const hb = BL.filter(q => !q.kind); for (let i = 0; i < 46; i++) { const b = hb[Math.floor(hash(i * 3.3) * hb.length)]; C.coinS.push({ x: b.x, z: b.z, d: hash(i * 7.7) * 0.55 }); } }
  for (const m of [C.lawn, C.walk, C.tents, C.walls, C.roofs, C.towers, C.treeF]) m.instanceColor.needsUpdate = true;
  return g;
}
// o: town, city (0..1; ola desde el centro), drought, crisis, mercado, banco, hacienda (0..1), coins (0..1), plot (0..1), crown {k, y, spin}
function cityAt(t, o) {
  const C = CITY, tw = clamp(o.town), ct = clamp(o.city), dr = clamp(o.drought), wave = (k, b) => sm5(clamp(k * 1.9 - (b.r / 290) * 0.9));
  C.uCrisis.value = clamp(o.crisis);
  // calles y manzanas
  C.coreSt.material.color.set(0xc2a36f).lerp(_IC2.set(0x5d636b), sm5(ct)); C.ringSt.material.color.set(0x7cb657).lerp(_IC2.set(0xb9a074), sm5(tw)).lerp(_IC2.set(0x6a7078), sm5(ct) * 0.8); C.plaza.material.color.set(0xd9cdb2);
  C.BL.forEach((b, i) => { const kt = wave(tw, b), kc = wave(ct, b), vis = b.core ? 1 : kt; setI(C.lawn, i, b.x, 0, b.z, vis, vis, vis); setI(C.walk, i, b.x, 0, b.z, vis, 0.05 + kc, vis);
    C.lawn.setColorAt(i, _IC.set(b.kind === 'mercado' ? 0xcdbb94 : 0x8cc063).lerp(_IC2.set(0x9fcf6a), kt * 0.6).lerp(_IC2.set(0xcdb45a), dr * (0.75 + 0.25 * b.h))); C.walk.setColorAt(i, _IC.set(0xc2a36f).lerp(_IC2.set(0xd4d4cf), kc)); });
  C.lawn.instanceMatrix.needsUpdate = C.walk.instanceMatrix.needsUpdate = true; C.lawn.instanceColor.needsUpdate = C.walk.instanceColor.needsUpdate = true;
  C.grass.material.color.set(0xffffff).lerp(_IC2.set(0xe6d58a), dr * 0.8);
  // tiendas → casas → edificios
  for (let i = 0; i < C.NH; i++) { const q = C.homes[i], s = q.s * (1 - popK(wave(tw, q.b))); setI(C.tents, i, q.x, 0.5, q.z, s, s, s, q.ry); } C.tents.instanceMatrix.needsUpdate = true;
  C.fireB.forEach((b, i) => { const s = (1 - wave(tw, b)) * (0.85 + 0.25 * Math.sin(t * 9 + i * 2.1)); setI(C.fires, i, b.x, 1.0, b.z, s, s * 1.25, s); }); C.fires.instanceMatrix.needsUpdate = true;
  const towered = C.towered || (C.towered = new Set(C.towerB.map(q => q.b)));
  C.houseB.forEach((q, i) => { const kt = wave(tw, q.b), kc = towered.has(q.b) ? wave(ct, q.b) : 0, s = q.hs * popK(kt) * (1 - kc); setI(C.walls, i, q.x, 0, q.z, s, s, s); setI(C.roofs, i, q.x, 0, q.z, s, s, s); }); C.walls.instanceMatrix.needsUpdate = C.roofs.instanceMatrix.needsUpdate = true;
  C.towerB.forEach((q, i) => { const kc = wave(ct, q.b); setI(C.towers, i, q.x, 0.5, q.z, q.w * (kc > 0.001 ? 1 : 0), q.h * popK(kc), q.w * (kc > 0.001 ? 1 : 0)); }); C.towers.instanceMatrix.needsUpdate = true;
  for (const k of ['mercado', 'banco', 'hacienda']) { const s = popK(o[k] ?? 0); C[k].visible = s > 0.002; C[k].scale.setScalar(Math.max(0.001, s)); }
  C.hacienda.userData.pc.rotation.y = t * 1.4;
  { const s = 1 - 0.74 * sm5(dr); C.water.scale.set(s, s, 1); }
  // monedas
  { const k = o.coins ?? 0, hp = C.hacienda.position; C.coinS.forEach((c, i) => { const u = clamp((k * 1.55 - c.d) / 1.0), on = u > 0 && u < 1 ? 1 : 0, e = sm5(u); setI(C.coins, i, lerp(c.x, hp.x, e), 6 + Math.sin(u * Math.PI) * 26 + e * 10, lerp(c.z, hp.z, e), on, on, on, t * 6 + i); }); C.coins.instanceMatrix.needsUpdate = true; }
  // solar vacío (parpadea)
  { const k = clamp(o.plot ?? 0); C.plot.visible = k > 0.01; C.plotM[0].opacity = 0.95 * k; C.plotM[1].opacity = k * (0.22 + 0.14 * Math.sin(t * 6)); }
  // corona
  { const c = o.crown || { k: 0 }; C.crown.visible = c.k > 0.01; if (C.crown.visible) { const s = popK(c.k); C.crown.scale.setScalar(Math.max(0.001, s) * 1.25); C.crown.position.set(0.9, c.y, 0.9); C.crown.rotation.y = c.spin; C.crown.userData.halo.material.opacity = 0.5 * clamp(c.k); } }
}
