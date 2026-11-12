// ---------------------------------------------------------------- la ciudad de día (maqueta low-poly de colores vivos, como la referencia de Javi): una avenida con edificios
// de balcones y persianas, comercios con la persiana bajada, árboles, farolas, nubes y cielo; la manifestación (miles de personas que andan, con banderas,
// pancartas y bengalas); la pantalla gigante; la plaza donde aparecen los objetos gigantes de cada frase; el autobús de servicios mínimos y el reloj.
// Escala: 1 unidad = 10 m (una persona mide 0,175).
const AV = { W: 1.0, SW: 0.56, Z0: 6, Z1: -24, PZ0: -24, PZ1: -42, PX: 6.4 }, PLZ = { x: 0, z: -33 };
const BW = 0.28, FH = 0.3, GH = 0.42;                 // ancho de un hueco de ventana, alto de un piso, alto del bajo comercial
const GAPS = [-4, -12];                         // calles que cruzan la avenida
const flatM = (c, r = 0.85, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, flatShading: true, ...o });
const PER = (f) => Math.round(f * END) / END;          // frecuencias con un número entero de ciclos en todo el vídeo (bucle perfecto)
const cyc = (t, f, ph = 0) => Math.sin(6.2832 * PER(f) * t + ph);
// ---------- cielo, nubes y luz del sol
function buildDay() {
  const g = new THREE.SphereGeometry(320, 48, 24), p = g.attributes.position, col = [];
  const top = new THREE.Color(0x2c78dc), hor = new THREE.Color(0xbfe2ff), bot = new THREE.Color(0xd8ecff);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 320, c = y > 0 ? hor.clone().lerp(top, Math.pow(Math.min(1, y * 1.7), 0.75)) : bot; col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  S.sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); S.sky.frustumCulled = false; S.sky.renderOrder = -10; scene.add(S.sky);
  scene.background = new THREE.Color(0xbfe2ff); scene.fog = new THREE.Fog(0xc6e4ff, 24, 110);
  S.cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, emissive: 0xc9d8ea, emissiveIntensity: 0.45, fog: false });
  S.clouds = [];
  for (let i = 0; i < 34; i++) { const c = new THREE.Group(), n = 4 + Math.floor(hash(i * 2.3) * 4);
    for (let k = 0; k < n; k++) { const r = 0.55 + hash(i * 3 + k) * 0.7, b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), S.cloudM); b.position.set((k - n / 2) * 0.62 + (hash(i + k * 7) - 0.5) * 0.4, (hash(i * 5 + k) - 0.3) * 0.4, (hash(i * 9 + k) - 0.5) * 0.7); b.scale.y = 0.72; c.add(b); }
    const a = hash(i * 7.7) * 6.283, d = 9 + hash(i * 4.1) * 40; c.position.set(Math.cos(a) * d * 0.9, 6.5 + hash(i * 6.6) * 5, -14 + Math.sin(a) * d); c.scale.setScalar(0.9 + hash(i * 8.8) * 1.2); c.rotation.y = hash(i) * 3; scene.add(c); S.clouds.push(c); }
  const R = S.rig; R.key.castShadow = false; R.key.intensity = 0; R.a.intensity = R.b.intensity = R.f.intensity = 0;
  R.sun.color.set(0xfff0dc); R.sun.intensity = 4.4; R.sun.castShadow = true; R.sun.shadow.mapSize.set(2048, 2048); R.sun.shadow.bias = -0.0005; R.sun.shadow.normalBias = 0.012; R.sun.shadow.radius = 2;
  R.sun.shadow.camera.near = 0.5; R.sun.shadow.camera.far = 90; R.hemi.color.set(0xcfe6ff); R.hemi.groundColor.set(0x9a8a70); R.hemi.intensity = 1.9;
}
const SUN_D = new THREE.Vector3(-0.55, 0.78, -0.3).normalize();
function sunAt(c, size) { const R = S.sun || S.rig.sun; R.position.copy(c).addScaledVector(SUN_D, 40); R.target.position.copy(c); R.target.updateMatrixWorld();
  const sc = R.shadow.camera; sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.updateProjectionMatrix(); }
// ---------- texturas
const FAC = [['#f3e2c4', '#3c7a45', '#ffffff'], ['#e9c79c', '#7a4a2a', '#f7efe3'], ['#f5f0e6', '#41689a', '#d6c6ae'], ['#ebb38c', '#3c7a45', '#fbf3e8'], ['#dcd5c6', '#8a3434', '#ffffff'],
  ['#f2d06b', '#2f5578', '#fff6dc'], ['#cfe1e9', '#424a55', '#ffffff'], ['#e8a27c', '#f3eee4', '#ffffff'], ['#bfd7a8', '#7a4a2a', '#ffffff'], ['#f0b8b0', '#3a3f46', '#ffffff']];
function facadeTex(st, v) {      // 3 huecos × 2 pisos; cada ventana con su persiana a una altura y algunos balcones con macetas
  return canvasTex(384, 256, (g, w, h) => { const [wall, shc, trim] = FAC[st]; g.fillStyle = wall; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${0.015 + hash(i * 3.3 + st) * 0.03})`; g.fillRect(hash(i * 1.7 + st + v) * w, hash(i * 2.9 + st) * h, 3, 3); }
    for (let f = 0; f < 2; f++) for (let c = 0; c < 3; c++) { const x0 = c * 128 + 36, y0 = f * 128 + 26, ww = 56, wh = 86, k = st * 7 + v * 13 + f * 3 + c;
      g.fillStyle = trim; g.fillRect(x0 - 8, y0 - 8, ww + 16, wh + 12);
      const gr = g.createLinearGradient(0, y0, 0, y0 + wh); gr.addColorStop(0, '#b8d8f0'); gr.addColorStop(0.55, '#5f86a8'); gr.addColorStop(1, '#2c3e55'); g.fillStyle = gr; g.fillRect(x0, y0, ww, wh);
      const down = hash(k * 1.91) * 0.85; g.fillStyle = shc; g.fillRect(x0, y0, ww, wh * down); g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = y0 + 4; y < y0 + wh * down; y += 6) g.fillRect(x0, y, ww, 1.5);
      g.fillStyle = trim; g.fillRect(x0 + ww / 2 - 2, y0 + wh * down, 4, wh * (1 - down)); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x0 + 4, y0 + wh * down + 3, 6, wh * (1 - down) - 6);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0 - 12, y0 + wh + 4, ww + 24, 3); g.fillStyle = trim; g.fillRect(x0 - 12, y0 + wh, ww + 24, 5);
      if (hash(k * 3.7) < 0.3) { for (let q = 0; q < 3; q++) { g.fillStyle = ['#d8452e', '#e85a8a', '#f2c230'][q]; g.beginPath(); g.arc(x0 + 10 + q * 18, y0 + wh - 6, 6, 0, 7); g.fill(); g.fillStyle = '#3f8a3a'; g.fillRect(x0 + 6 + q * 18, y0 + wh - 2, 9, 3); } } }
    g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, 126, w, 3); g.fillRect(0, 254, w, 2); });
}
const SHOPS = ['BAR', 'FARMACIA', 'PANADERÍA', 'FRUTERÍA', 'LIBRERÍA', 'PELUQUERÍA', 'FERRETERÍA', 'ZAPATERÍA', 'ESTANCO', 'MODA', 'CAFETERÍA', 'ÓPTICA', 'MERCERÍA', 'FLORISTERÍA', 'TALLER', 'PAPELERÍA'];
const SHOPC = ['#c0392b', '#1e8449', '#a04000', '#239b56', '#1f618d', '#7d3c98', '#b9770e', '#2e4053', '#922b21', '#17202a', '#784212', '#1a5276', '#6c3483', '#c2185b', '#424949', '#0e6655'];
function shopTex(n, seed, wall) {     // el bajo comercial: n tiendas, cada una con su rótulo y la persiana (la persiana es una pieza aparte que baja)
  return canvasTex(256 * n, 160, (g, w, h) => { g.fillStyle = wall; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h - 10, w, 10);
    for (let i = 0; i < n; i++) { const k = Math.floor(hash(seed * 3.1 + i * 7.3) * SHOPS.length), x0 = i * 256 + 22;
      g.fillStyle = SHOPC[k]; g.fillRect(x0 - 6, 8, 224, 40); g.fillStyle = '#ffffff'; g.font = '900 30px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SHOPS[k], x0 + 106, 29);
      g.fillStyle = '#1c2026'; g.fillRect(x0, 54, 212, h - 64); g.fillStyle = 'rgba(160,190,215,.25)'; g.fillRect(x0 + 8, 60, 90, h - 76); } });
}
function shutterTex(sp) { return canvasTex(256, 192, (g, w, h) => { g.fillStyle = '#9aa2ab'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, y + 5, w, 2); }
  g.fillStyle = '#5c636b'; g.fillRect(0, h - 10, w, 10);
  if (sp === 1) { g.save(); g.translate(w / 2, h / 2 - 6); g.rotate(-0.08); g.font = '900 52px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#d6262e'; g.fillText('HUELGA', 0, -16); g.font = '900 30px Inter'; g.fillText('GENERAL 11-N', 0, 30); g.restore(); }
  else { g.fillStyle = '#fbfaf5'; g.save(); g.translate(w / 2 + 30, h / 2 - 20); g.rotate(0.05); g.fillRect(-46, -34, 92, 66); g.fillStyle = '#1b1e24'; g.font = '900 17px Inter'; g.textAlign = 'center'; g.fillText('CERRADO', 0, -10); g.font = '700 13px Inter'; g.fillText('POR HUELGA', 0, 9); g.fillText('11 NOV', 0, 25);
    g.fillStyle = 'rgba(230,220,180,.8)'; g.fillRect(-52, -38, 18, 8); g.fillRect(34, -38, 18, 8); g.restore(); } }); }
// ---------- edificios
function bldg(x, z, wCols, floors, side, st, v) {      // side = +1: el edificio de la derecha (fachada mirando a −x); −1: el de la izquierda; 0: mirando a +z (fondo de la plaza)
  const g = new THREE.Group(), wd = wCols * BW, hh = GH + floors * FH, dp = 1.3, [wall] = FAC[st];
  const body = new THREE.Mesh(new THREE.BoxGeometry(wd, hh, dp), flatM(wall, 0.9)); body.position.set(0, hh / 2, -dp / 2); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const ft = facadeTex(st, v).clone(); ft.needsUpdate = true; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(wCols / 3, floors / 2);
  const fm = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.85 }); const fac = new THREE.Mesh(new THREE.PlaneGeometry(wd, floors * FH), fm); fac.position.set(0, GH + floors * FH / 2, 0.003); fac.receiveShadow = true; g.add(fac);
  const nShop = wCols >= 6 ? 2 : 1, shop = new THREE.Mesh(new THREE.PlaneGeometry(wd, GH), new THREE.MeshStandardMaterial({ map: shopTex(nShop, x * 3.1 + z * 7.7, wall), roughness: 0.8 })); shop.position.set(0, GH / 2, 0.003); shop.receiveShadow = true; g.add(shop);
  const cor = new THREE.Mesh(new THREE.BoxGeometry(wd + 0.05, 0.035, 0.05), flatM(FAC[st][2], 0.7)); cor.position.set(0, hh - 0.02, 0.0); cor.castShadow = true; g.add(cor);
  const cor2 = cor.clone(); cor2.position.y = GH; cor2.scale.y = 0.6; g.add(cor2);
  if (hash(x * 1.3 + z * 0.7) < 0.55) {       // tejado de teja a dos aguas (como la referencia), con chimenea
    const rg = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-wd / 2 - 0.04, 0), new THREE.Vector2(wd / 2 + 0.04, 0), new THREE.Vector2(wd / 2 - 0.1, 0.24), new THREE.Vector2(-wd / 2 + 0.1, 0.24)]), { depth: dp + 0.06, bevelEnabled: false });
    rg.translate(0, hh, -dp - 0.03); const roof = new THREE.Mesh(rg, flatM(0xc8603a, 0.75)); roof.castShadow = true; g.add(roof);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.07), flatM(0x8f8a84)); ch.position.set(wd * 0.25, hh + 0.2, -dp * 0.4); ch.castShadow = true; g.add(ch);
  } else { const par = new THREE.Mesh(new THREE.BoxGeometry(wd, 0.05, dp), flatM(0xd9d2c6)); par.position.set(0, hh + 0.025, -dp / 2); g.add(par);
    for (let i = 0; i < 2; i++) { const ac = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.08), flatM(0xe8e8e8)); ac.position.set((hash(i + x) - 0.5) * wd * 0.6, hh + 0.08, -0.3 - i * 0.4); ac.castShadow = true; g.add(ac); }
    if (hash(z * 3.3 + x) < 0.5) { const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10), flatM(0xb0b6bd)); tk.position.set(-wd * 0.25, hh + 0.12, -0.7); tk.castShadow = true; g.add(tk); } }
  g.position.set(x, 0, z); g.rotation.y = side === 1 ? -Math.PI / 2 : side === -1 ? Math.PI / 2 : 0; scene.add(g);
  // balcones de verdad (losa + barandilla) en algunos edificios; y las persianas metálicas de los comercios
  const out = { g, wd, hh, nShop, st };
  if (hash(x * 2.2 + z * 1.9) < 0.6) out.bal = { cols: wCols, floors }; return out;
}
function buildCity() {
  // suelo: asfalto, aceras con bordillo, pasos de cebra, línea discontinua y la plaza empedrada
  const asph = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#62666e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const l = hash(i) > 0.5; g.fillStyle = l ? `rgba(255,255,255,${0.03 + hash(i * 3) * 0.05})` : `rgba(0,0,0,${0.04 + hash(i * 3) * 0.06})`; g.fillRect(hash(i * 7) * w, hash(i * 11) * h, 2, 2); } });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const tiles = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9d3c8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${hash(i) * 0.04})`; g.fillRect(hash(i * 5) * w, hash(i * 9) * h, 3, 3); } });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  const swM = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.9 }), curbM = flatM(0xb9b3a8);
  for (const sd of [-1, 1]) { let z0 = AV.Z0; for (const zz of [...GAPS, AV.Z1].sort((a, b) => b - a)) { const z1 = zz + (zz === AV.Z1 ? 0 : 0.42), len = z0 - z1; if (len > 0.05) {
      const tx = tiles.clone(); tx.needsUpdate = true; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(AV.SW / 0.25, len / 0.25);
      const sw = new THREE.Mesh(new THREE.BoxGeometry(AV.SW, 0.02, len), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 })); sw.position.set(sd * (AV.W + AV.SW / 2), 0.01, (z0 + z1) / 2); sw.receiveShadow = true; scene.add(sw);
      const cb = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.024, len), curbM); cb.position.set(sd * (AV.W + 0.012), 0.012, (z0 + z1) / 2); cb.receiveShadow = true; scene.add(cb); }
    z0 = zz - 0.42; } }
  const stone = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e3d2b4'; g.fillRect(0, 0, w, h); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = `rgba(${150 + hash(x * 3 + y * 17) * 40},${120 + hash(x * 5 + y * 3) * 30},${90},${0.18})`; g.fillRect(x * 32 + (y % 2) * 16, y * 32, 30, 30); }
    g.strokeStyle = 'rgba(120,95,70,.25)'; g.lineWidth = 2; for (let r = 40; r < 360; r += 40) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.stroke(); } });
  const pz = new THREE.Mesh(new THREE.BoxGeometry(AV.PX * 2, 0.012, AV.PZ0 - AV.PZ1), new THREE.MeshStandardMaterial({ map: stone, roughness: 0.85 })); pz.position.set(0, 0.006, (AV.PZ0 + AV.PZ1) / 2); pz.receiveShadow = true; scene.add(pz);
  { const wm = flatM(0xf4f4f0, 0.6), stripes = [], dashes = [];
    for (const zc of GAPS) for (let x = -0.88; x <= 0.89; x += 0.13) stripes.push([x, zc]);
    for (let z = AV.Z0; z > AV.Z1; z -= 0.5) if (!GAPS.some(zc => Math.abs(z - zc) < 0.4)) dashes.push(z);
    const st = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.003, 0.34), wm, stripes.length); stripes.forEach(([x, z], i) => { _m4b.position.set(x, 0.0015, z); _m4b.rotation.set(0, 0, 0); _m4b.scale.set(1, 1, 1); _m4b.updateMatrix(); st.setMatrixAt(i, _m4b.matrix); }); st.receiveShadow = true; scene.add(st);
    const da = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 0.003, 0.22), wm, dashes.length); dashes.forEach((z, i) => { _m4b.position.set(0, 0.0015, z); _m4b.updateMatrix(); da.setMatrixAt(i, _m4b.matrix); }); da.receiveShadow = true; scene.add(da); }
  // edificios: a los dos lados de la avenida (con las calles que cruzan), una segunda fila detrás, y alrededor de la plaza
  const B = []; let seed = 3;
  for (const sd of [-1, 1]) { let z = AV.Z0 + 1.5; while (z > AV.Z1 + 0.2) { const cols = hash(seed * 1.7) < 0.55 ? 3 : 6, wd = cols * BW, fl = [4, 6, 6, 8][Math.floor(hash(seed * 2.9) * 4)];
      const gap = GAPS.find(zc => z - wd < zc + 0.42 && z > zc - 0.42); if (gap !== undefined) { z = gap - 0.42; continue; }
      if (z - wd < AV.Z1) break;
      const special = sd === 1 && z > -20.4 && z - wd < -20.4;
      B.push(bldg(sd * (AV.W + AV.SW), z - wd / 2, special ? 6 : cols, special ? 8 : fl, sd === 1 ? 1 : -1, Math.floor(hash(seed * 4.3) * FAC.length), seed % 2)); if (special) S.clinicB = B[B.length - 1];
      z -= (special ? 6 * BW : wd) + 0.004; seed++; } }
  for (const sd of [-1, 1]) for (let z = AV.Z0; z > AV.PZ0 + 1.5; z -= 2.2) { const fl = 8 + Math.floor(hash(z * 3 + sd) * 5) * 2; B.push(bldg(sd * 4.2, z, 6, fl, sd === 1 ? 1 : -1, Math.floor(hash(z * 7 + sd) * FAC.length), 1)); }
  for (const sd of [-1, 1]) for (let z = AV.PZ0 - 0.3; z > AV.PZ1 + 0.5; ) { const cols = 6, wd = cols * BW; B.push(bldg(sd * AV.PX, z - wd / 2, cols, 6 + Math.floor(hash(z * 5 + sd) * 2) * 2, sd === 1 ? 1 : -1, Math.floor(hash(z * 9 + sd * 3) * FAC.length), 0)); z -= wd + 0.01; }
  for (let x = -AV.PX + 0.1; x < AV.PX - 0.2; ) { const cols = 6, wd = cols * BW; if (x < 1.75 && x + wd > -1.75) { x = 1.76; continue; } B.push(bldg(x + wd / 2, AV.PZ1, cols, x > -0.9 && x < 0.9 ? 8 : 6, 0, Math.floor(hash(x * 5) * FAC.length), 0)); x += wd + 0.01; }
  for (const sd of [-1, 1]) for (let x = AV.W + AV.SW + 0.15; x < AV.PX; ) { const cols = 6, wd = cols * BW; const b = bldg(sd * (x + wd / 2), AV.PZ0, cols, 6, 0, Math.floor(hash(x * 3 + sd) * FAC.length), 1); b.g.rotation.y = Math.PI; B.push(b); x += wd + 0.01; }
  for (let i = 0; i < 70; i++) { const a = hash(i * 3.3) * 6.283, d = 12 + hash(i * 5.5) * 30, h = 1.5 + hash(i * 1.1) * 4.5; const bx2 = new THREE.Mesh(new THREE.BoxGeometry(1 + hash(i) * 2, h, 1 + hash(i * 2) * 2), flatM(new THREE.Color(FAC[i % FAC.length][0]).getHex(), 0.9));
    bx2.position.set(Math.cos(a) * d, h / 2, -14 + Math.sin(a) * d); if (Math.abs(bx2.position.x) < 7 && bx2.position.z > -46) continue; scene.add(bx2); }
  S.buildings = B;
  // balcones (losa + barandilla) y persianas metálicas de los comercios (instanciadas)
  { const slabs = [], shut = [];
    for (const b of B) { b.g.updateMatrixWorld(true);
      if (b.bal) for (let f = 1; f < b.bal.floors; f++) for (let c = 0; c < b.bal.cols; c++) slabs.push(new THREE.Matrix4().multiplyMatrices(b.g.matrixWorld, new THREE.Matrix4().makeTranslation(-b.wd / 2 + (c + 0.5) * BW, GH + f * FH + 0.02, 0.035)));
      for (let i = 0; i < b.nShop; i++) shut.push({ m: b.g.matrixWorld.clone(), x: -b.wd / 2 + (i + 0.5) * b.wd / b.nShop, w: b.wd / b.nShop * 0.83, z: b.g.position.z, sp: hash(b.g.position.z * 3 + i) < 0.35 ? 1 : 0, rowDist: Math.abs(b.g.position.x) }); }
    const slab = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.012, 0.07), flatM(0xe9e4da), slabs.length); slabs.forEach((m, i) => slab.setMatrixAt(i, m)); slab.castShadow = true; slab.receiveShadow = true; scene.add(slab);
    const railT = canvasTex(128, 32, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#23262c'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 3, w, 3); for (let x = 2; x < w; x += 9) g.fillRect(x, 0, 2.5, h); });
    const rail = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.05), new THREE.MeshStandardMaterial({ map: railT, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 }), slabs.length);
    slabs.forEach((m, i) => rail.setMatrixAt(i, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.031, 0.034)))); rail.castShadow = true; scene.add(rail);
    S.shutters = shut; S.shutM = [0, 1].map(sp => { const n = shut.filter(s => s.sp === sp).length, im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ map: shutterTex(sp), roughness: 0.55, metalness: 0.3 }), Math.max(1, n)); im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im; }); }
  // árboles, farolas y semáforos
  { const tp = []; for (const sd of [-1, 1]) for (let z = AV.Z0; z > AV.Z1 + 0.3; z -= 0.75) if (!GAPS.some(zc => Math.abs(z - zc) < 0.55)) tp.push([sd * (AV.W + 0.26), z + (hash(z * sd) - 0.5) * 0.1]);
    for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283; tp.push([PLZ.x + Math.cos(a) * 5.7, PLZ.z + Math.sin(a) * 7.8]); }
    const trees = tp.filter(([x, z]) => z > AV.PZ1 + 0.6 && Math.abs(x) < AV.PX - 0.4 && !(x > 0 && x < 2 && z < -18.6 && z > -22.4));
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.018, 0.34, 6).translate(0, 0.17, 0), flatM(0x7a5236), trees.length), can = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.17, 0), flatM(0xffffff, 0.8), trees.length);
    trees.forEach(([x, z], i) => { const s = 0.85 + hash(i * 2.2) * 0.4; _m4b.position.set(x, 0, z); _m4b.rotation.set(0, hash(i) * 3, 0); _m4b.scale.setScalar(s); _m4b.updateMatrix(); trunk.setMatrixAt(i, _m4b.matrix);
      _m4b.position.set(x, 0.42 * s, z); _m4b.scale.set(s, s * 1.15, s); _m4b.updateMatrix(); can.setMatrixAt(i, _m4b.matrix); can.setColorAt(i, new THREE.Color([0x4f9a3c, 0x62ad45, 0x3f8a36, 0x76b84f][i % 4])); });
    trunk.castShadow = can.castShadow = true; can.receiveShadow = true; scene.add(trunk, can);
    const lp = []; for (const sd of [-1, 1]) for (let z = AV.Z0 - 0.4; z > AV.Z1; z -= 1.5) if (!GAPS.some(zc => Math.abs(z - zc) < 0.5) && !(sd > 0 && z < -18.4 && z > -22.6)) lp.push([sd * (AV.W + 0.07), z, sd]);
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.008, 0.5, 6).translate(0, 0.25, 0), flatM(0x2b3038, 0.5), lp.length), head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.018, 0.035), flatM(0x2b3038, 0.5), lp.length);
    lp.forEach(([x, z, sd], i) => { _m4b.position.set(x, 0, z); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(1); _m4b.updateMatrix(); pole.setMatrixAt(i, _m4b.matrix); _m4b.position.set(x - sd * 0.04, 0.5, z); _m4b.updateMatrix(); head.setMatrixAt(i, _m4b.matrix); });
    pole.castShadow = head.castShadow = true; scene.add(pole, head); }
  buildCrowd(); buildTeeth(); buildPlazaSet(); shuttersAt(-10);
}
// ---------- la gente: piezas instanciadas (piernas, cuerpo, bata, brazos, cabeza, pelo). Peatones que pasean por las aceras (van y vuelven: bucle
// perfecto), gente en la plaza mirando la dentadura y, desde la frase 5, cientos de dentistas con bata blanca que salen de la facultad y la llenan
const SHIRT = [0x2f6fd0, 0xf2c230, 0xe85a8a, 0x2e9e5b, 0xf07c2a, 0x8e44ad, 0x1abc9c, 0x34495e, 0xd6262e, 0xf4f1ea, 0x5dade2, 0xb9770e];
const PANTS = [0x2c3e64, 0x1b1f27, 0x3b4a6b, 0x6b5a45, 0x23262d, 0x4a5568];
const SKIN = [0xf0c8a8, 0xe0b090, 0xc6906a, 0x9a6a48, 0x7a4e32, 0xf5d5bd], HAIR = [0x2a1d14, 0x3d2a1c, 0x14110f, 0x6b4a2a, 0xb08850, 0x8a8a8a, 0xd8c08a];
const DOOR = { x: 0, z: AV.PZ1 + 0.9 };
function buildCrowd() {
  const P = []; const add = o => P.push(Object.assign({ ph: hash(P.length * 1.37) * 6.283, f: 1.5 + hash(P.length * 2.71) * 0.5, A: 0, doc: 0 }, o));
  for (const sd of [-1, 1]) for (let i = 0; i < 80; i++) { const z0 = AV.Z0 - hash(i * 7.3 + sd) * (AV.Z0 - AV.Z1 - 1); if (GAPS.some(zc => Math.abs(z0 - zc) < 0.45)) continue;
    if (sd > 0 && z0 < -18.0 && z0 > -23.0) continue; add({ x: sd * (AV.W + 0.12 + hash(i * 5.1 + sd) * 0.32), z: z0, yaw: 0, A: 0.8 + hash(i * 1.9) * 1.6, grp: 0 }); }
  for (let i = 0; i < 760; i++) { const a = hash(i * 1.91) * 6.283, r = 3.2 + Math.sqrt(hash(i * 3.73)) * 2.5, x = PLZ.x + Math.cos(a) * r, z = PLZ.z + Math.sin(a) * r * 1.2;
    if (Math.abs(x) > AV.PX - 0.3 || z > AV.PZ0 - 0.2 || z < AV.PZ1 + 1.0 || (z > -27.6 && Math.abs(x) < 1.2)) continue; add({ x, z, yaw: Math.atan2(PLZ.x - x, PLZ.z - z), grp: 1 }); }
  for (let i = 0; i < 1900; i++) { let x, z;
    if (i < 1200) { const a = hash(i * 4.4 + 0.3) * 6.283, r = 2.7 + Math.sqrt(hash(i * 8.8 + 0.1)) * 3.3; x = PLZ.x + Math.cos(a) * r; z = PLZ.z + Math.sin(a) * r * 1.2;
      if (Math.abs(x) > AV.PX - 0.3 || z > AV.PZ0 - 0.2 || z < AV.PZ1 + 1.0) continue; }
    else { x = (hash(i * 2.2) - 0.5) * 1.85; z = AV.Z1 + 0.2 + hash(i * 3.3) * (AV.Z0 - AV.Z1 - 3); }
    const d = Math.hypot(x - DOOR.x, z - DOOR.z); add({ x, z, yaw: Math.atan2(PLZ.x - x, PLZ.z - z) + (hash(i) - 0.5) * 0.8, grp: 3, doc: 1, d }); }
  S.people = P; const N = P.length;
  const dd = P.filter(p => p.doc).map(p => p.d).sort((a, b) => a - b), cut = dd[Math.floor(dd.length * 0.22)];      // los primeros (≈ los 1.700) salen de la puerta
  P.forEach(p => { if (p.doc) p.first = p.d <= cut; });
  const g = { leg: new THREE.BoxGeometry(0.021, 0.085, 0.024).translate(0, -0.0425, 0), torso: new THREE.BoxGeometry(0.052, 0.07, 0.03).translate(0, 0.035, 0), arm: new THREE.BoxGeometry(0.015, 0.066, 0.017).translate(0, -0.033, 0),
    head: new THREE.IcosahedronGeometry(0.0128, 1), hair: new THREE.SphereGeometry(0.0138, 8, 4, 0, 6.283, 0, 1.75), coat: new THREE.BoxGeometry(0.058, 0.062, 0.034).translate(0, -0.031, 0) };
  const mk = geo => { const m = new THREE.InstancedMesh(geo, flatM(0xffffff, 0.75), N); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
  S.pp = { legL: mk(g.leg), legR: mk(g.leg), torso: mk(g.torso), armL: mk(g.arm), armR: mk(g.arm), head: mk(g.head), hair: mk(g.hair), coat: mk(g.coat) };
  const c = new THREE.Color();
  P.forEach((p, i) => { const sh = p.doc ? 0xf7f8fa : SHIRT[Math.floor(hash(i * 4.4) * SHIRT.length)], pa = p.doc ? [0x7fb7d6, 0x5f9fc4, 0x8fd1c4][i % 3] : PANTS[Math.floor(hash(i * 5.5) * PANTS.length)], sk = SKIN[Math.floor(hash(i * 6.6) * SKIN.length)], hr = HAIR[Math.floor(hash(i * 7.7) * HAIR.length)];
    for (const k of ['legL', 'legR']) S.pp[k].setColorAt(i, c.set(pa)); for (const k of ['torso', 'armL', 'armR', 'coat']) S.pp[k].setColorAt(i, c.set(sh)); S.pp.head.setColorAt(i, c.set(sk)); S.pp.hair.setColorAt(i, c.set(hr)); });
}
const _mA = new THREE.Matrix4(), _mB = new THREE.Matrix4(), _mC = new THREE.Matrix4(), _qc = new THREE.Quaternion(), _eu = new THREE.Euler(), _scl = new THREE.Vector3(1, 1, 1), _pp0 = new THREE.Vector3(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);
function partM(base, x, y, z, rx, rz, out) { _mB.makeRotationFromEuler(_eu.set(rx, 0, rz)); _mB.setPosition(x, y, z); return out.multiplyMatrices(base, _mB); }
function docK(p, t) {        // cuánto se ve un dentista (salen en la frase 5; se van al final para el bucle)
  if (!p.doc) return 1; const t0 = p.first ? K.salen5 - 0.1 + p.d * 0.09 : K.pais5 - 0.2 + p.d * 0.05 + hash(p.d * 9) * 0.25; return pop(t, t0, 0.35) * (1 - win(t, END - 1.25, 0.3));
}
function crowdAt(t) {
  const P = S.people, pp = S.pp;
  for (let i = 0; i < P.length; i++) { const p = P[i]; let k = docK(p, t);
    if (k <= 0.002) { for (const key in pp) pp[key].setMatrixAt(i, _zero); continue; }
    let x = p.x, z = p.z, yaw = p.yaw, sp = 1;
    if (p.A) { const w = 6.2832 / END, ph = w * t + p.ph; z = p.z + p.A * Math.sin(ph); const vz = p.A * w * Math.cos(ph); yaw = vz < 0 ? Math.PI : 0; sp = Math.min(1, Math.abs(vz) / 0.08); }
    const ph = 6.2832 * PER(p.f) * t + p.ph, sw = Math.sin(ph) * (p.grp === 0 ? 0.45 * sp : p.doc ? 0.12 : 0.1), bob = Math.abs(Math.cos(ph)) * 0.004 * (p.grp === 0 ? sp : 0.4);
    _qc.setFromEuler(_eu.set(0, yaw + Math.sin(ph * 0.5) * 0.04, 0)); _pp0.set(x, 0.085 + bob + (p.grp === 0 ? 0.02 : 0.012), z); _scl.setScalar(k); _mA.compose(_pp0, _qc, _scl);
    pp.legL.setMatrixAt(i, partM(_mA, -0.012, 0, 0, sw, 0, _mC)); pp.legR.setMatrixAt(i, partM(_mA, 0.012, 0, 0, -sw, 0, _mC)); pp.torso.setMatrixAt(i, partM(_mA, 0, 0, 0, 0.03, 0, _mC));
    pp.coat.setMatrixAt(i, p.doc ? partM(_mA, 0, 0.004, 0, 0.02, 0, _mC) : _zero);
    const cheer = p.doc && t > K.n43000 - 0.2 && t < K.segun6 + 0.4 && hash(i * 3.1) < 0.35 ? 1 : 0;
    pp.armL.setMatrixAt(i, partM(_mA, -0.034, 0.064, 0, cheer ? 3.2 + Math.sin(ph * 2) * 0.2 : -sw * 0.8, cheer ? -0.2 : 0.08, _mC));
    pp.armR.setMatrixAt(i, partM(_mA, 0.034, 0.064, 0, cheer ? 3.2 + Math.cos(ph * 2) * 0.2 : sw * 0.8, cheer ? 0.2 : -0.08, _mC));
    pp.head.setMatrixAt(i, partM(_mA, 0, 0.083, 0, 0, 0, _mC)); pp.hair.setMatrixAt(i, partM(_mA, 0, 0.0865, -0.001, -0.2, 0, _mC)); }
  for (const key in pp) pp[key].instanceMatrix.needsUpdate = true;
}
_scl.set(1, 1, 1);
// las persianas: bajan de golpe en cadena por la avenida en el primer segundo (y al final suben, rebobinadas, para el bucle)
function shuttersAt(t) {
  const loop = t > END - 0.55, tt = loop ? t - END : t; const cnt = [0, 0];
  for (const s of S.shutters) { const ts = -0.35 + Math.max(0, 4.5 - s.z) * 0.035 + (s.rowDist > 3 ? 0.4 : 0), k = clamp((tt - ts) / 0.16), d = k < 1 ? k * k : 1 + Math.sin(clamp((tt - ts - 0.16) / 0.2) * Math.PI) * 0.06 * (1 - clamp((tt - ts - 0.16) / 0.2));
    const m = _mC.copy(s.m).multiply(_mB.makeTranslation(s.x, GH * 0.66, 0.006)).multiply(_mA.makeScale(s.w, Math.max(0.001, (GH * 0.66 - 0.004) * Math.min(1.04, 0.06 + 0.94 * d)), 1)); S.shutM[s.sp].setMatrixAt(cnt[s.sp]++, m); }
  S.shutM.forEach(m => m.instanceMatrix.needsUpdate = true);
}
function cityAt(t, st) {
  S.sky.position.copy(cam.position);
  crowdAt(t); _scl.set(1, 1, 1);
}
