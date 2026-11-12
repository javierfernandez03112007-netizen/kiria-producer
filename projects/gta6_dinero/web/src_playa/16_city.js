// ---------------------------------------------------------------- el paseo marítimo de día (maqueta low-poly de colores vivos): hoteles art déco de colores pastel con toldos y
// terrazas, la avenida con coches, el paseo con palmeras y farolas, la playa con casetas de socorrista, sombrillas y gente, y el mar turquesa.
// Escala: 1 unidad = 10 m (una persona mide 0,175). La avenida va a lo largo de z; el mar queda a +x.
const BV = { HX: -3.2, R0: -2.6, R1: -0.6, P1: 0.9, SEA: 10.6, Z0: 18, Z1: -50 };
const BW = 0.28, FH = 0.3, GH = 0.42;                 // ancho de un hueco de ventana, alto de un piso, alto del bajo comercial
const GAPS = [-8.6, -27.5];                     // calles que cruzan hacia el interior
const flatM = (c, r = 0.85, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, flatShading: true, ...o });
const PER = (f) => Math.round(f * END) / END;          // frecuencias con un número entero de ciclos en todo el vídeo (bucle perfecto)
const cyc = (t, f, ph = 0) => Math.sin(6.2832 * PER(f) * t + ph);
const _m4b = new THREE.Object3D();
// ---------- cielo, nubes y luz del sol
function buildDay() {
  const g = new THREE.SphereGeometry(320, 48, 24), p = g.attributes.position, col = [];
  const top = new THREE.Color(0x1f6fd8), hor = new THREE.Color(0xa9dcff), bot = new THREE.Color(0xd0ecff);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 320, c = y > 0 ? hor.clone().lerp(top, Math.pow(Math.min(1, y * 1.6), 0.7)) : bot; col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  S.sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); S.sky.frustumCulled = false; S.sky.renderOrder = -10; scene.add(S.sky);
  scene.background = new THREE.Color(0xa9dcff); scene.fog = new THREE.Fog(0xbfe4ff, 30, 140);
  S.cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, emissive: 0xd2e2f2, emissiveIntensity: 0.5, fog: false });
  S.clouds = [];
  for (let i = 0; i < 30; i++) { const c = new THREE.Group(), n = 4 + Math.floor(hash(i * 2.3) * 4);
    for (let k = 0; k < n; k++) { const r = 0.6 + hash(i * 3 + k) * 0.8, b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), S.cloudM); b.position.set((k - n / 2) * 0.7 + (hash(i + k * 7) - 0.5) * 0.4, (hash(i * 5 + k) - 0.3) * 0.4, (hash(i * 9 + k) - 0.5) * 0.7); b.scale.y = 0.7; c.add(b); }
    const a = hash(i * 7.7) * 6.283, d = 18 + hash(i * 4.1) * 50; c.position.set(4 + Math.cos(a) * d, 10 + hash(i * 6.6) * 7, -10 + Math.sin(a) * d); c.scale.setScalar(1.1 + hash(i * 8.8) * 1.4); c.rotation.y = hash(i) * 3; scene.add(c); S.clouds.push(c); }
  const R = S.rig; R.key.castShadow = false; R.key.intensity = 0; R.a.intensity = R.b.intensity = R.f.intensity = 0;
  R.sun.color.set(0xfff1de); R.sun.intensity = 4.6; R.sun.castShadow = true; R.sun.shadow.mapSize.set(2048, 2048); R.sun.shadow.bias = -0.0005; R.sun.shadow.normalBias = 0.012; R.sun.shadow.radius = 2;
  R.sun.shadow.camera.near = 0.5; R.sun.shadow.camera.far = 110; R.hemi.color.set(0xcde6ff); R.hemi.groundColor.set(0xb8a07a); R.hemi.intensity = 1.85;
}
const SUN_D = new THREE.Vector3(0.32, 0.8, 0.5).normalize();      // sol alto, detrás de la cámara (que mira casi siempre hacia −z y el mar)
function sunAt(c, size) { const R = S.rig.sun; R.position.copy(c).addScaledVector(SUN_D, 50); R.target.position.copy(c); R.target.updateMatrixWorld();
  const sc = R.shadow.camera; sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.updateProjectionMatrix(); }
// ---------- texturas
const DECO = [['#f7b9c9', '#ffffff', '#3fb8b0'], ['#a9e4cf', '#ffffff', '#f06f8f'], ['#c8b8ec', '#fffaf0', '#ffb347'], ['#a7d7f2', '#ffffff', '#f2c230'], ['#f8e08e', '#ffffff', '#2f9fb8'],
  ['#ffc6a0', '#fffaf2', '#3a9e8c'], ['#f5f1e8', '#9fdcd2', '#e85a8a'], ['#b8ecd9', '#fff5e8', '#7a5cc8'], ['#ffd6e4', '#ffffff', '#1f9fd0'], ['#e4f1b0', '#ffffff', '#ee6b4a']];
const HOTEL = ['CORAL', 'BRISA', 'AURORA', 'MARINA', 'PALMA', 'ESTRELLA', 'OCÉANO', 'LUNA', 'SIRENA', 'ATLÁNTICO', 'PARAÍSO', 'TROPICAL', 'FLAMENCO', 'DELFÍN'];
function decoTex(st, v) {      // 3 huecos × 2 pisos: ventanas corridas con «cejas» blancas encima y una franja de color en el centro
  return canvasTex(384, 256, (g, w, h) => { const [wall, trim, acc] = DECO[st]; g.fillStyle = wall; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(0,0,0,${0.012 + hash(i * 3.3 + st) * 0.025})`; g.fillRect(hash(i * 1.7 + st + v) * w, hash(i * 2.9 + st) * h, 3, 3); }
    for (let f = 0; f < 2; f++) { const y0 = f * 128 + 34;
      for (let c = 0; c < 3; c++) { const x0 = c * 128 + 18, ww = 92, wh = 70, k = st * 7 + v * 13 + f * 3 + c;
        const gr = g.createLinearGradient(0, y0, 0, y0 + wh); gr.addColorStop(0, '#cfe9fb'); gr.addColorStop(0.5, '#6f9fc4'); gr.addColorStop(1, '#2f4a66'); g.fillStyle = gr; g.fillRect(x0, y0, ww, wh);
        g.fillStyle = trim; for (let q = 1; q < 3; q++) g.fillRect(x0 + q * ww / 3 - 2, y0, 4, wh);
        const bl = hash(k * 1.91) * 0.6; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x0, y0, ww, wh * bl * 0.5);
        g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x0 + 6, y0 + 8, 10, wh - 16); }
      g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, y0 - 8, w, 8); g.fillStyle = trim; g.fillRect(0, y0 - 14, w, 7);
      g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, y0 + 72, w, 4); }
    if (v % 2 === 0) { g.fillStyle = acc; g.fillRect(w / 2 - 10, 0, 20, h); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(w / 2 - 10, 0, 4, h); } });
}
const SHOPS = ['CAFÉ', 'HELADOS', 'SURF', 'BAR', 'GAFAS DE SOL', 'BAÑADORES', 'ZUMOS', 'PIZZA', 'TACOS', 'MARISCOS', 'BOUTIQUE', 'RECUERDOS'];
function shopTex(n, seed, wall) {     // el bajo: n locales con su rótulo, cristaleras y terraza
  return canvasTex(256 * n, 160, (g, w, h) => { g.fillStyle = wall; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, h - 10, w, 10);
    for (let i = 0; i < n; i++) { const k = Math.floor(hash(seed * 3.1 + i * 7.3) * SHOPS.length), x0 = i * 256 + 22, c = DECO[Math.floor(hash(seed + i * 5.1) * DECO.length)][2];
      g.fillStyle = '#ffffff'; g.fillRect(x0 - 6, 10, 224, 36); g.fillStyle = c; g.font = '900 28px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SHOPS[k], x0 + 106, 29);
      const gr = g.createLinearGradient(0, 52, 0, h); gr.addColorStop(0, '#2c4258'); gr.addColorStop(1, '#16222e'); g.fillStyle = gr; g.fillRect(x0, 52, 212, h - 62);
      g.fillStyle = 'rgba(190,220,240,.28)'; g.fillRect(x0 + 8, 58, 80, h - 74); g.fillStyle = 'rgba(255,214,150,.35)'; g.fillRect(x0 + 120, 90, 70, 40); } });
}
function awningTex(c) { return canvasTex(128, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : c; g.fillRect(i * 16, 0, 16, h); } g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h - 6, w, 6); }); }
function signTex(name, c) { return canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = c; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = c; g.font = '900 64px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; const L = [...name]; const step = Math.min(68, (h - 60) / L.length); L.forEach((ch, i) => g.fillText(ch, w / 2, 40 + step * (i + 0.5))); }); }
// ---------- edificios: hotel art déco (cuerpo pastel, cejas sobre las ventanas, corona escalonada con el rótulo vertical, toldo y terraza)
function hotel(x, z, wCols, floors, st, v, name) {
  const g = new THREE.Group(), wd = wCols * BW, hh = GH + floors * FH, dp = 1.4, [wall, trim, acc] = DECO[st];
  const body = new THREE.Mesh(new THREE.BoxGeometry(wd, hh, dp), flatM(wall, 0.9)); body.position.set(0, hh / 2, -dp / 2); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const ft = decoTex(st, v); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(wCols / 3, floors / 2);
  const fac = new THREE.Mesh(new THREE.PlaneGeometry(wd, floors * FH), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.85 })); fac.position.set(0, GH + floors * FH / 2, 0.003); fac.receiveShadow = true; g.add(fac);
  const nShop = wCols >= 6 ? 2 : 1, shop = new THREE.Mesh(new THREE.PlaneGeometry(wd, GH), new THREE.MeshStandardMaterial({ map: shopTex(nShop, x * 3.1 + z * 7.7, wall), roughness: 0.8 })); shop.position.set(0, GH / 2, 0.003); shop.receiveShadow = true; g.add(shop);
  // corona: dos escalones y el rótulo vertical con el nombre del hotel
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(wd * 0.62, 0.16, 0.5), flatM(wall, 0.9)); c1.position.set(0, hh + 0.08, -0.3); c1.castShadow = true; g.add(c1);
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(wd * 0.3, 0.14, 0.3), flatM(trim, 0.9)); c2.position.set(0, hh + 0.23, -0.25); c2.castShadow = true; g.add(c2);
  const cap0 = new THREE.Mesh(new THREE.BoxGeometry(wd + 0.04, 0.03, dp + 0.02), flatM(trim, 0.7)); cap0.position.set(0, hh + 0.012, -dp / 2); cap0.castShadow = true; g.add(cap0);
  if (name) { const sh = Math.min(0.9, floors * FH * 0.55), sg = new THREE.Mesh(new THREE.BoxGeometry(0.1, sh, 0.02), [flatM(trim), flatM(trim), flatM(trim), flatM(trim), new THREE.MeshStandardMaterial({ map: signTex(name, acc), roughness: 0.6 }), flatM(trim)]);
    sg.position.set(0, hh - sh / 2 + 0.2, 0.05); sg.castShadow = true; g.add(sg); }
  // franja vertical de color (aleta) en el centro
  if (v % 2 === 0) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, floors * FH, 0.04), flatM(acc, 0.8)); fin.position.set(0, GH + floors * FH / 2, 0.02); fin.castShadow = true; g.add(fin); }
  // toldo a rayas sobre el bajo
  const aw = new THREE.Mesh(new THREE.BoxGeometry(wd * 0.94, 0.008, 0.16), [flatM(acc), flatM(acc), new THREE.MeshStandardMaterial({ map: awningTex(acc), roughness: 0.8 }), flatM(acc), flatM(acc), flatM(acc)]);
  aw.position.set(0, GH - 0.03, 0.08); aw.rotation.x = 0.28; aw.castShadow = true; g.add(aw);
  g.position.set(x, 0, z); g.rotation.y = Math.PI / 2; scene.add(g);
  return { g, wd, hh, floors, wCols, st };
}
// ---------- palmeras (tronco curvo con anillos y nueve hojas que se mecen)
function frondTex() { return canvasTex(64, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#3d7a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 6); g.stroke();
  for (let y = 10; y < h - 6; y += 7) { const L = (w / 2 - 2) * Math.sin(Math.PI * (h - y) / h * 0.95 + 0.1); g.strokeStyle = ['#4f9a36', '#5fae3e', '#3f8a2e'][y % 3]; g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(w / 2, y + 6); g.lineTo(w / 2 - L, y - 4); g.moveTo(w / 2, y + 6); g.lineTo(w / 2 + L, y - 4); g.stroke(); } }); }
function trunkTex() { return canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#9b7a55'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 12) { g.fillStyle = 'rgba(60,40,22,.45)'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(255,240,210,.18)'; g.fillRect(0, y + 4, w, 2); } }); }
function buildPalms(spots) {
  const NV = 3, trunks = [], tm = new THREE.MeshStandardMaterial({ map: trunkTex(), roughness: 0.9 });
  for (let v = 0; v < NV; v++) { const lean = 0.12 + v * 0.07, pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(v3(lean * u * u, u, 0)); }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.022, 7, false); const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const y = pa.getY(i), s = 1.25 - 0.35 * y; pa.setX(i, (pa.getX(i) - lean * y * y) * s + lean * y * y); pa.setZ(i, pa.getZ(i) * s); }
    geo.computeVertexNormals(); trunks.push({ geo, top: v3(lean, 1, 0), list: [] }); }
  spots.forEach((s, i) => trunks[i % NV].list.push(s));
  S.palmTr = trunks.map(T => { const m = new THREE.InstancedMesh(T.geo, tm, Math.max(1, T.list.length)); m.castShadow = true; m.receiveShadow = true;
    T.list.forEach((s, j) => { _m4b.position.set(s.x, 0, s.z); _m4b.rotation.set(0, s.ry, 0); _m4b.scale.setScalar(s.h); _m4b.updateMatrix(); m.setMatrixAt(j, _m4b.matrix); }); scene.add(m); return m; });
  // hojas: un plano doblado (cae hacia fuera) con la textura de la hoja
  const fg = new THREE.PlaneGeometry(0.11, 0.5, 1, 8).translate(0, 0.25, 0), fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) { const y = fp.getY(i) / 0.5; fp.setZ(i, -0.2 * y * y); fp.setX(i, fp.getX(i) * (1 - 0.15 * y)); }
  fg.rotateX(-Math.PI / 2 + 0.25); fg.computeVertexNormals();
  const fm = new THREE.MeshStandardMaterial({ map: frondTex(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 });
  S.palms = []; trunks.forEach(T => T.list.forEach(s => { const top = T.top.clone().multiplyScalar(s.h).applyAxisAngle(v3(0, 1, 0), s.ry).add(v3(s.x, 0, s.z)); S.palms.push({ top, h: s.h, ph: hash(s.x * 3 + s.z) * 6.28 }); }));
  S.frond = new THREE.InstancedMesh(fg, fm, S.palms.length * 9); S.frond.castShadow = true; S.frond.frustumCulled = false; scene.add(S.frond);
  const nut = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.018, 0), flatM(0x6b4a22), S.palms.length * 3); S.palms.forEach((p, i) => { for (let k = 0; k < 3; k++) { _m4b.position.copy(p.top).add(v3(Math.cos(k * 2.1) * 0.025, -0.02, Math.sin(k * 2.1) * 0.025)); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(p.h); _m4b.updateMatrix(); nut.setMatrixAt(i * 3 + k, _m4b.matrix); } }); scene.add(nut);
  palmsAt(0);
}
const _qf = new THREE.Quaternion(), _ef = new THREE.Euler(), _vf = new THREE.Vector3(), _sf = new THREE.Vector3();
function palmsAt(t) {
  let n = 0;
  for (const p of S.palms) for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + p.ph, sway = 0.08 * cyc(t, 0.5, p.ph + k * 0.7) + 0.05 * cyc(t, 0.9, p.ph * 2 + k);
    _qf.setFromEuler(_ef.set(-0.15 - (k % 3) * 0.18 + sway, a, 0, 'YXZ')); _sf.setScalar(p.h * (0.85 + (k % 2) * 0.2)); _m4.compose(p.top, _qf, _sf); S.frond.setMatrixAt(n++, _m4); }
  S.frond.instanceMatrix.needsUpdate = true;
}
// ---------- el mar: degradado turquesa → azul y olas que se mueven (mapa de normales), con la espuma en la orilla
function waveNormalTex() { const N = 256; return canvasTex(N, N, (g, w, h) => { const im = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let dx = 0, dy = 0; for (let k = 1; k <= 4; k++) { const a = k * 1.7, fx = Math.round(2 + hash(k) * 3), fy = Math.round(1 + hash(k * 3) * 4), ph = hash(k * 7) * 6.28;
      const s = Math.cos(6.2832 * (fx * x / w + fy * y / h) + ph) / k; dx += s * fx; dy += s * fy; }
    const i = (y * w + x) * 4; im.data[i] = 128 + dx * 9; im.data[i + 1] = 128 + dy * 9; im.data[i + 2] = 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); }); }
function buildSea() {
  const g = new THREE.PlaneGeometry(260, 260, 60, 1); g.rotateX(-Math.PI / 2); g.translate(BV.SEA + 130, -0.03, -10);
  const p = g.attributes.position, col = [], near = new THREE.Color(0x3fd6c8), mid = new THREE.Color(0x1aa0d0), far = new THREE.Color(0x1660b0);
  for (let i = 0; i < p.count; i++) { const d = p.getX(i) - BV.SEA, c = d < 6 ? near.clone().lerp(mid, d / 6) : mid.clone().lerp(far, Math.min(1, (d - 6) / 40)); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const nt = waveNormalTex(); nt.colorSpace = THREE.NoColorSpace; nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(70, 70);
  S.seaM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.05, normalMap: nt, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.4 });
  const sea = new THREE.Mesh(g, S.seaM); sea.receiveShadow = true; scene.add(sea); S.sea = sea;
  // espuma de la orilla (dos franjas que suben y bajan)
  const ft = canvasTex(64, 512, (gg, w, h) => { gg.clearRect(0, 0, w, h); for (let i = 0; i < 900; i++) { gg.fillStyle = `rgba(255,255,255,${0.25 + hash(i) * 0.6})`; const y = hash(i * 3.3) * h, x = Math.pow(hash(i * 7.1), 1.8) * w * 0.9; gg.beginPath(); gg.arc(x, y, 1.5 + hash(i * 9) * 3, 0, 7); gg.fill(); }
    const gr = gg.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.25, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(1, 30);
  S.foam = [0, 1].map(i => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 120).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ft.clone(), transparent: true, depthWrite: false, roughness: 0.6 }));
    m.material.map.needsUpdate = true; m.material.map.repeat.set(1, 30); m.material.map.offset.y = i * 0.37; m.position.set(BV.SEA + 0.3, -0.012 + i * 0.002, -14); m.renderOrder = 2; scene.add(m); return m; });
}
// ---------- casetas de socorrista, sombrillas, toallas y tumbonas
function lifeguard(x, z, c, ry) {
  const g = new THREE.Group(); const cab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.13), flatM(c, 0.8)); cab.position.y = 0.17; cab.castShadow = true; g.add(cab);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.005), flatM(0x2f4a66, 0.3)); win.position.set(0, 0.185, 0.066); g.add(win);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.07, 4).rotateY(Math.PI / 4), flatM(0xffffff, 0.7)); roof.position.y = 0.26; roof.scale.set(1.05, 1, 0.85); roof.castShadow = true; g.add(roof);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.2), flatM(0xf4efe4)); deck.position.y = 0.11; deck.castShadow = true; g.add(deck);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.012), flatM(0xf4efe4)); l.position.set(a * 0.09, 0.055, b * 0.08); l.castShadow = true; g.add(l); }
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.2), flatM(0xf4efe4)); ramp.position.set(0, 0.055, 0.17); ramp.rotation.x = 0.55; ramp.castShadow = true; g.add(ramp);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshStandardMaterial({ color: 0xe53935, side: THREE.DoubleSide })); flag.position.set(0.035, 0.35, 0); g.add(flag);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 5), flatM(0xffffff)); pole.position.set(0, 0.32, 0); g.add(pole);
  g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); return g;
}
function buildBeachProps() {
  const UC = [0xff5a7a, 0xffb02e, 0x2ec4b6, 0x5a7cff, 0xf7f7f2, 0xff7b39, 0x9b5de5];
  const spots = []; for (let i = 0; i < 70; i++) { const x = 2.6 + hash(i * 2.7) * 6.6, z = 10 - hash(i * 5.3) * 52; if (Math.abs(z - (-1)) < 4.2 && x < 9.2) continue; if (Math.abs(z + 16.5) < 2.7 && x > 1.0) continue; if (Math.abs(z + 12.5) < 2.6 && x < 5.5) continue; if (Math.abs(z + 20.6) < 3.2 && x < 6.6) continue; if (z > 5 && x < 4.5) continue; spots.push([x, z, i]); }
  const canopyG = new THREE.ConeGeometry(0.11, 0.045, 8, 1, true).translate(0, 0.17, 0), poleG = new THREE.CylinderGeometry(0.003, 0.003, 0.17, 5).translate(0, 0.085, 0), towelG = new THREE.BoxGeometry(0.07, 0.003, 0.15);
  const can = new THREE.InstancedMesh(canopyG, flatM(0xffffff, 0.7, { side: THREE.DoubleSide }), spots.length), pol = new THREE.InstancedMesh(poleG, flatM(0xf2f2f2), spots.length), tow = new THREE.InstancedMesh(towelG, flatM(0xffffff), spots.length * 2);
  spots.forEach(([x, z, i], j) => { _m4b.position.set(x, 0, z); _m4b.rotation.set((hash(i) - 0.5) * 0.2, 0, (hash(i * 3) - 0.5) * 0.2); _m4b.scale.setScalar(1); _m4b.updateMatrix(); can.setMatrixAt(j, _m4b.matrix); pol.setMatrixAt(j, _m4b.matrix);
    can.setColorAt(j, new THREE.Color(UC[i % UC.length])); for (let k = 0; k < 2; k++) { _m4b.position.set(x + (k - 0.5) * 0.09, 0.002, z + 0.08); _m4b.rotation.set(0, (hash(i + k) - 0.5) * 0.5, 0); _m4b.updateMatrix(); tow.setMatrixAt(j * 2 + k, _m4b.matrix); tow.setColorAt(j * 2 + k, new THREE.Color(UC[(i + k + 2) % UC.length])); } });
  can.castShadow = pol.castShadow = true; tow.receiveShadow = true; scene.add(can, pol, tow);
  S.lifeguards = [[3.6, 9, 0xff8fb0], [9.3, -3.4, 0x7fd8c8], [8.7, -9.4, 0xffd166], [8.6, -31, 0xb39ddb], [6.4, -40, 0x80c4ff]].map(([x, z, c], i) => lifeguard(x, z, c, -Math.PI / 2 + (i % 2 ? 0.25 : -0.2)));
}
// ---------- coches por la avenida (van y vuelven en bucle: un número entero de vueltas en todo el vídeo)
function buildCars() {
  const CC = [0xff6f91, 0x5ad1c3, 0xfff1d6, 0xffc93c, 0x6c8cff, 0xf5f5f5, 0xff8a3d, 0x9be15d, 0xc77dff, 0x3ac0ff];
  const body = new THREE.BoxGeometry(0.085, 0.035, 0.2).translate(0, 0.03, 0), cabin = new THREE.BoxGeometry(0.075, 0.028, 0.09).translate(0, 0.061, -0.012), wheel = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 10).rotateZ(Math.PI / 2);
  const N = 14; S.cars = [];
  for (let i = 0; i < N; i++) S.cars.push({ lane: i % 2, ph: hash(i * 3.7), col: CC[i % CC.length], n: 1 + (i % 3 === 0 ? 1 : 0) });
  const mb = new THREE.InstancedMesh(body, paint(0xffffff, 0.3), N), mc = new THREE.InstancedMesh(cabin, new THREE.MeshPhysicalMaterial({ color: 0x1d2a38, roughness: 0.08, metalness: 0.4, clearcoat: 1 }), N), mw = new THREE.InstancedMesh(wheel, flatM(0x15171c, 0.6), N * 4);
  S.cars.forEach((c, i) => mb.setColorAt(i, new THREE.Color(c.col))); mb.castShadow = mc.castShadow = mw.castShadow = true; mb.receiveShadow = true; scene.add(mb, mc, mw); S.carM = { mb, mc, mw };
}
function carsAt(t) {
  const L = BV.Z0 - BV.Z1, { mb, mc, mw } = S.carM;
  S.cars.forEach((c, i) => { const v = c.n * L / END, u = ((c.ph * L + v * t) % L + L) % L, dir = c.lane ? 1 : -1, z = c.lane ? BV.Z1 + u : BV.Z0 - u, x = c.lane ? -1.15 : -2.05;
    _m4b.position.set(x, 0.006, z); _m4b.rotation.set(0, c.lane ? 0 : Math.PI, 0); _m4b.scale.setScalar(1); _m4b.updateMatrix(); mb.setMatrixAt(i, _m4b.matrix); mc.setMatrixAt(i, _m4b.matrix);
    for (let k = 0; k < 4; k++) { const wx = (k % 2 ? 1 : -1) * 0.044, wz = (k < 2 ? 1 : -1) * 0.065; _m4.makeTranslation(wx, 0.016, wz).premultiply(_m4b.matrix); mw.setMatrixAt(i * 4 + k, _m4); } });
  mb.instanceMatrix.needsUpdate = mc.instanceMatrix.needsUpdate = mw.instanceMatrix.needsUpdate = true;
}
function buildCity() {
  // suelo: asfalto (avenida y fondo), acera de los hoteles, paseo marítimo con murete, arena y orilla mojada
  const asph = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5f646c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const l = hash(i) > 0.5; g.fillStyle = l ? `rgba(255,255,255,${0.03 + hash(i * 3) * 0.05})` : `rgba(0,0,0,${0.04 + hash(i * 3) * 0.06})`; g.fillRect(hash(i * 7) * w, hash(i * 11) * h, 2, 2); } });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.position.set(-118 + BV.R1, -0.001, 0); ground.receiveShadow = true; scene.add(ground);
  const tiles = (base, line, sz = 256) => { const t = canvasTex(sz, sz, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); g.strokeStyle = line; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${hash(i) * 0.035})`; g.fillRect(hash(i * 5) * w, hash(i * 9) * h, 3, 3); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const L = BV.Z0 - BV.Z1, zc = (BV.Z0 + BV.Z1) / 2;
  { const t = tiles('#e9e1d4', 'rgba(0,0,0,.12)'); t.repeat.set(0.6 / 0.25, L / 0.25); const sw = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, L), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); sw.position.set(BV.HX + 0.3, 0.01, zc); sw.receiveShadow = true; scene.add(sw); }
  { const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f6efe6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f08fb0'; g.lineWidth = 10; for (let k = 0; k < 3; k++) { g.beginPath(); for (let y = 0; y <= h; y += 4) { const x = w * (0.2 + k * 0.3) + Math.sin(y / h * 6.283 * 2) * 18; y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${hash(i) * 0.03})`; g.fillRect(hash(i * 5) * w, hash(i * 9) * h, 3, 3); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, L / 1.5); const pm = new THREE.Mesh(new THREE.BoxGeometry(BV.P1 - BV.R1, 0.022, L), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 })); pm.position.set((BV.P1 + BV.R1) / 2, 0.011, zc); pm.receiveShadow = true; scene.add(pm); }
  const curbM = flatM(0xd9d2c4); for (const x of [BV.R0, BV.R1]) { const cb = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.026, L), curbM); cb.position.set(x, 0.013, zc); cb.receiveShadow = true; scene.add(cb); }
  { const wm = flatM(0xffffff, 0.7), segs = []; for (let z = BV.Z0; z > BV.Z1; z -= 3.2) segs.push(z); S.wallSegs = segs;
    const w = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.07, 2.6).translate(0, 0.035, -1.3), wm, segs.length); segs.forEach((z, i) => { _m4b.position.set(BV.P1, 0, z - 0.3); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(1); _m4b.updateMatrix(); w.setMatrixAt(i, _m4b.matrix); }); w.castShadow = w.receiveShadow = true; scene.add(w); }
  { const sand = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#efd9a8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 14000; i++) { g.fillStyle = hash(i) > 0.5 ? `rgba(255,250,235,${0.08 + hash(i * 3) * 0.1})` : `rgba(150,110,60,${0.05 + hash(i * 3) * 0.08})`; g.fillRect(hash(i * 7) * w, hash(i * 11) * h, 2, 2); } });
    sand.wrapS = sand.wrapT = THREE.RepeatWrapping; sand.repeat.set(10, 60);
    const g = new THREE.PlaneGeometry(BV.SEA + 1.5 - BV.P1, 200, 24, 1); g.rotateX(-Math.PI / 2); g.translate((BV.SEA + 1.5 + BV.P1) / 2, 0, -15);
    const p = g.attributes.position, col = []; for (let i = 0; i < p.count; i++) { const x = p.getX(i), d = (x - BV.P1) / (BV.SEA - BV.P1); p.setY(i, 0.004 - Math.max(0, d - 0.55) * 0.07); const wet = clamp((x - (BV.SEA - 1.0)) / 0.8); const c = new THREE.Color(0xffffff).lerp(new THREE.Color(0xb5a48a), wet * 0.7); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const sm = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: sand, vertexColors: true, roughness: 0.95 })); sm.receiveShadow = true; scene.add(sm); }
  { const wm = flatM(0xf4f4f0, 0.6), dashes = [], zebra = []; for (let z = BV.Z0; z > BV.Z1; z -= 0.5) if (!GAPS.some(zc2 => Math.abs(z - zc2) < 0.5)) dashes.push(z);
    for (const z0 of GAPS) for (let x = BV.R0 + 0.12; x < BV.R1 - 0.05; x += 0.13) zebra.push([x, z0 + 0.45]);
    const da = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 0.003, 0.22), wm, dashes.length); dashes.forEach((z, i) => { _m4b.position.set((BV.R0 + BV.R1) / 2, 0.0015, z); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(1); _m4b.updateMatrix(); da.setMatrixAt(i, _m4b.matrix); }); da.receiveShadow = true; scene.add(da);
    const ze = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.003, 0.34), wm, zebra.length); zebra.forEach(([x, z], i) => { _m4b.position.set(x, 0.0015, z); _m4b.updateMatrix(); ze.setMatrixAt(i, _m4b.matrix); }); ze.receiveShadow = true; scene.add(ze); }
  // hoteles: primera fila frente al mar (con las calles que cruzan), una segunda fila de torres detrás y el perfil de la ciudad al fondo
  const B = []; let seed = 5, zz = BV.Z0 - 0.5;
  while (zz > BV.Z1 + 1) { const cols = hash(seed * 1.7) < 0.5 ? 6 : 9, wd = cols * BW, fl = [5, 6, 7, 8, 9][Math.floor(hash(seed * 2.9) * 5)];
    const gap = GAPS.find(z0 => zz - wd < z0 + 0.5 && zz > z0 - 0.5); if (gap !== undefined) { zz = gap - 0.5; continue; }
    B.push(hotel(BV.HX, zz - wd / 2, cols, fl, Math.floor(hash(seed * 4.3) * DECO.length), seed % 3, HOTEL[seed % HOTEL.length])); zz -= wd + 0.02; seed++; }
  for (let z = BV.Z0 - 1; z > BV.Z1 + 2; z -= 2.9) { const fl = 12 + Math.floor(hash(z * 3) * 6) * 2; B.push(hotel(BV.HX - 2.6, z, 6, fl, Math.floor(hash(z * 7) * DECO.length), 1, null)); }
  for (let i = 0; i < 90; i++) { const x = -9 - hash(i * 3.3) * 40, z = 20 - hash(i * 5.5) * 85, h = 2 + hash(i * 1.1) * 7; const bx2 = new THREE.Mesh(new THREE.BoxGeometry(1 + hash(i) * 2.2, h, 1 + hash(i * 2) * 2.2), flatM(new THREE.Color(DECO[i % DECO.length][0]).getHex(), 0.9));
    bx2.position.set(x, h / 2, z); scene.add(bx2); }
  S.buildings = B;
  // cejas de verdad (losas finas sobre cada piso) y terrazas con mesas en la acera
  { const ed = []; for (const b of B) { b.g.updateMatrixWorld(true); for (let f = 1; f <= b.floors; f++) ed.push(new THREE.Matrix4().multiplyMatrices(b.g.matrixWorld, new THREE.Matrix4().makeTranslation(0, GH + f * FH - 0.035, 0.025))); }
    const eb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.012, 0.05), flatM(0xffffff, 0.7), ed.length);     // ancho de cada ceja = ancho del hotel
    let k = 0; for (const b of B) for (let f = 1; f <= b.floors; f++) { eb.setMatrixAt(k, ed[k].clone().multiply(new THREE.Matrix4().makeScale(b.wd * 0.98, 1, 1))); k++; }
    eb.castShadow = true; eb.receiveShadow = true; scene.add(eb);
    const tb = []; for (const b of B) if (Math.abs(b.g.position.x - BV.HX) < 0.01) for (let q = -1; q <= 1; q += 2) tb.push([BV.HX + 0.38, b.g.position.z + q * b.wd * 0.25]);
    const top = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, 0.004, 10).translate(0, 0.045, 0), flatM(0xffffff), tb.length), leg = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.003, 0.003, 0.045, 5).translate(0, 0.0225, 0), flatM(0x30343c), tb.length);
    const umb = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.025, 8, 1, true).translate(0, 0.11, 0), flatM(0xffffff, 0.7, { side: THREE.DoubleSide }), tb.length), up = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.002, 0.002, 0.11, 4).translate(0, 0.055, 0), flatM(0xf0f0f0), tb.length);
    tb.forEach(([x, z], i) => { _m4b.position.set(x, 0.02, z); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(1); _m4b.updateMatrix(); top.setMatrixAt(i, _m4b.matrix); leg.setMatrixAt(i, _m4b.matrix); umb.setMatrixAt(i, _m4b.matrix); up.setMatrixAt(i, _m4b.matrix); umb.setColorAt(i, new THREE.Color([0xff7aa2, 0x3cc6b4, 0xffc247, 0x7a8cff][i % 4])); });
    top.castShadow = umb.castShadow = true; scene.add(top, leg, umb, up); }
  // palmeras (en el paseo y alguna en la arena) y farolas
  { const sp = []; for (let z = BV.Z0 - 0.4; z > BV.Z1; z -= 1.05) if (z < 2.4 || z > 10.6) sp.push({ x: 0.05 + (hash(z) - 0.5) * 0.12, z, ry: hash(z * 3.1) * 6.28, h: 0.95 + hash(z * 5.7) * 0.35 });
    for (let z = BV.Z0 - 0.9; z > BV.Z1; z -= 2.1) sp.push({ x: BV.R0 - 0.05 + (hash(z * 2) - 0.5) * 0.06, z, ry: hash(z * 9.1) * 6.28, h: 0.8 + hash(z * 2.7) * 0.25 });
    for (let i = 0; i < 16; i++) { const x = 1.4 + hash(i * 4.4) * 1.0, z = 12 - hash(i * 6.6) * 60; if (Math.abs(z + 1) < 4.5 || Math.abs(z + 11.5) < 3.7 || Math.abs(z + 16.5) < 2.6 || Math.abs(z + 20.6) < 3.4 || z > 3) continue; sp.push({ x, z, ry: hash(i) * 6.28, h: 1.0 + hash(i * 3) * 0.4 }); }
    buildPalms(sp);
    const lp = []; for (let z = BV.Z0 - 0.95; z > BV.Z1; z -= 2.1) lp.push([BV.R1 + 0.1, z]);
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.008, 0.5, 6).translate(0, 0.25, 0), flatM(0xf2f2f2, 0.5), lp.length), head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 10, 8), flatM(0xffffff, 0.3), lp.length);
    lp.forEach(([x, z], i) => { _m4b.position.set(x, 0, z); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(1); _m4b.updateMatrix(); pole.setMatrixAt(i, _m4b.matrix); _m4b.position.set(x, 0.51, z); _m4b.updateMatrix(); head.setMatrixAt(i, _m4b.matrix); });
    pole.castShadow = head.castShadow = true; scene.add(pole, head); }
  buildSea(); buildBeachProps(); buildCars(); buildCrowd(); buildMoney();
}
// ---------- la gente: piezas instanciadas (piernas, cuerpo, brazos, cabeza, pelo). Paseantes que van y vuelven por el paseo y la orilla (bucle perfecto),
// gente en la arena mirando las torres (levantan los brazos en los momentos fuertes) y la gente de la pirámide de Brasil (frase 4)
const SHIRT = [0x2f6fd0, 0xf2c230, 0xe85a8a, 0x2e9e5b, 0xf07c2a, 0x8e44ad, 0x1abc9c, 0x34495e, 0xd6262e, 0xf4f1ea, 0x5dade2, 0xb9770e, 0xff8fab, 0x7bdff2];
const PANTS = [0x2c3e64, 0x1b1f27, 0x3b4a6b, 0x6b5a45, 0x23262d, 0x4a5568, 0xe9e2d0, 0x3c6e71];
const SKIN = [0xf0c8a8, 0xe0b090, 0xc6906a, 0x9a6a48, 0x7a4e32, 0xf5d5bd], HAIR = [0x2a1d14, 0x3d2a1c, 0x14110f, 0x6b4a2a, 0xb08850, 0x8a8a8a, 0xd8c08a];
function buildCrowd() {
  const P = []; const add = o => P.push(Object.assign({ ph: hash(P.length * 1.37) * 6.283, f: 1.5 + hash(P.length * 2.71) * 0.5, A: 0, y: 0, k0: null, look: null }, o));
  for (let i = 0; i < 150; i++) { const x = BV.R1 + 0.15 + hash(i * 5.1) * 1.2, z = BV.Z0 - hash(i * 7.3) * (BV.Z0 - BV.Z1); add({ x, z, yaw: 0, A: 0.6 + hash(i * 1.9) * 1.8, grp: 0 }); }
  for (let i = 0; i < 70; i++) { const x = BV.HX + 0.15 + hash(i * 3.1) * 0.35, z = BV.Z0 - hash(i * 9.3) * (BV.Z0 - BV.Z1); if (GAPS.some(z0 => Math.abs(z - z0) < 0.5)) continue; add({ x, z, yaw: 0, A: 0.5 + hash(i * 2.9) * 1.2, grp: 0 }); }
  for (let i = 0; i < 90; i++) { const x = BV.SEA - 0.5 + hash(i * 2.3) * 0.6, z = 12 - hash(i * 4.9) * 60; add({ x, z, yaw: 0, A: 0.8 + hash(i * 3.3) * 2.2, grp: 0 }); }
  // la gente en la arena alrededor de las torres de la plaza y de las dos paradas (miran hacia arriba)
  for (const [cx, cz, r0, r1, n] of [[4.6, -1.0, 3.0, 5.2, 320], [2.6, -12.4, 1.5, 2.8, 100], [3.7, -20.6, 1.9, 3.1, 110], [7.4, -16.5, 1.6, 2.6, 70]]) for (let i = 0; i < n; i++) {
    const a = hash(i * 1.91 + cx) * 6.283, r = r0 + Math.sqrt(hash(i * 3.73 + cz)) * (r1 - r0), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.8;
    if (x < BV.P1 + 0.25 || x > BV.SEA - 0.3) continue; add({ x, z, yaw: Math.atan2(cx - x, cz - z) + (hash(i) - 0.5) * 0.6, grp: 1, cx, cz }); }
  S.people = P; S.nCrowd = P.length;
  // la pirámide de Brasil (frase 4): gente en gradas, de abajo arriba
  buildBrazilPeople(add);
  const N = P.length;
  const g = { leg: new THREE.BoxGeometry(0.021, 0.085, 0.024).translate(0, -0.0425, 0), torso: new THREE.BoxGeometry(0.052, 0.07, 0.03).translate(0, 0.035, 0), arm: new THREE.BoxGeometry(0.015, 0.066, 0.017).translate(0, -0.033, 0),
    head: new THREE.IcosahedronGeometry(0.0128, 1), hair: new THREE.SphereGeometry(0.0138, 8, 4, 0, 6.283, 0, 1.75) };
  const mk = geo => { const m = new THREE.InstancedMesh(geo, flatM(0xffffff, 0.75), N); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
  S.pp = { legL: mk(g.leg), legR: mk(g.leg), torso: mk(g.torso), armL: mk(g.arm), armR: mk(g.arm), head: mk(g.head), hair: mk(g.hair) };
  const c = new THREE.Color();
  P.forEach((p, i) => { const br = p.grp === 4, sh = br ? [0xf7d116, 0x1f9e4a, 0x2a5bd7, 0xf7d116, 0xffffff][i % 5] : SHIRT[Math.floor(hash(i * 4.4) * SHIRT.length)], pa = PANTS[Math.floor(hash(i * 5.5) * PANTS.length)], sk = SKIN[Math.floor(hash(i * 6.6) * SKIN.length)], hr = HAIR[Math.floor(hash(i * 7.7) * HAIR.length)];
    for (const k of ['legL', 'legR']) S.pp[k].setColorAt(i, c.set(pa)); for (const k of ['torso', 'armL', 'armR']) S.pp[k].setColorAt(i, c.set(sh)); S.pp.head.setColorAt(i, c.set(sk)); S.pp.hair.setColorAt(i, c.set(hr)); });
}
const _mA = new THREE.Matrix4(), _mB = new THREE.Matrix4(), _mC = new THREE.Matrix4(), _qc = new THREE.Quaternion(), _eu = new THREE.Euler(), _scl = new THREE.Vector3(1, 1, 1), _pp0 = new THREE.Vector3(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);
function partM(base, x, y, z, rx, rz, out) { _mB.makeRotationFromEuler(_eu.set(rx, 0, rz)); _mB.setPosition(x, y, z); return out.multiplyMatrices(base, _mB); }
function cheerAt(p, i, t) {      // levantan los brazos: al reventar la torre de GTA 5, con el récord, con Brasil y cuando GTA 6 pasa a la película
  if (p.grp === 4) return t > K.brasil4 - 0.1 && t < K.y5 ? 1 : 0;
  if (p.grp !== 1 || hash(i * 3.1) > 0.45) return 0;
  if (p.cz > -5) return (t < 2.2 || (t > K.mas8 && t < END - 0.6)) ? 1 : 0;
  if (p.cz > -15) return t > K.guinness3 - 0.1 && t < K.lleva4 ? 1 : 0;
  return 0;
}
function crowdAt(t) {
  const P = S.people, pp = S.pp;
  for (let i = 0; i < P.length; i++) { const p = P[i]; const k = p.k0 ? p.k0(t) : 1;
    if (k <= 0.002) { for (const key in pp) pp[key].setMatrixAt(i, _zero); continue; }
    let x = p.x, z = p.z, yaw = p.yaw, sp = 1;
    if (p.A) { const w = 6.2832 / END, ph = w * t + p.ph; z = p.z + p.A * Math.sin(ph); const vz = p.A * w * Math.cos(ph); yaw = vz < 0 ? Math.PI : 0; sp = Math.min(1, Math.abs(vz) / 0.08); }
    const ph = 6.2832 * PER(p.f) * t + p.ph, walk = p.grp === 0, sw = Math.sin(ph) * (walk ? 0.45 * sp : 0.1), bob = Math.abs(Math.cos(ph)) * 0.004 * (walk ? sp : 0.4);
    _qc.setFromEuler(_eu.set(0, yaw + Math.sin(ph * 0.5) * 0.04, 0)); _pp0.set(x, p.y + 0.085 + bob + (walk ? 0.02 : 0.012), z); _scl.setScalar(k); _mA.compose(_pp0, _qc, _scl);
    pp.legL.setMatrixAt(i, partM(_mA, -0.012, 0, 0, sw, 0, _mC)); pp.legR.setMatrixAt(i, partM(_mA, 0.012, 0, 0, -sw, 0, _mC)); pp.torso.setMatrixAt(i, partM(_mA, 0, 0, 0, 0.03, 0, _mC));
    const ch = cheerAt(p, i, t);
    pp.armL.setMatrixAt(i, partM(_mA, -0.034, 0.064, 0, ch ? 3.2 + Math.sin(ph * 2) * 0.2 : -sw * 0.8, ch ? -0.2 : 0.08, _mC));
    pp.armR.setMatrixAt(i, partM(_mA, 0.034, 0.064, 0, ch ? 3.2 + Math.cos(ph * 2) * 0.2 : sw * 0.8, ch ? 0.2 : -0.08, _mC));
    pp.head.setMatrixAt(i, partM(_mA, 0, 0.083, 0, p.grp === 1 ? -0.35 : 0, 0, _mC)); pp.hair.setMatrixAt(i, partM(_mA, 0, 0.0865, -0.001, p.grp === 1 ? -0.55 : -0.2, 0, _mC)); }
  for (const key in pp) pp[key].instanceMatrix.needsUpdate = true;
}
function cityAt(t, st) {
  S.sky.position.copy(cam.position);
  crowdAt(t); _scl.set(1, 1, 1); palmsAt(t); carsAt(t);
  S.seaM.normalMap.offset.set(PER(0.02) * t, PER(0.035) * t);
  S.foam.forEach((m, i) => { const u = cyc(t, 0.16, i * 3.1); m.position.x = BV.SEA + 0.25 - 0.35 * u; m.material.opacity = 0.75 + 0.25 * u; m.material.map.offset.y = i * 0.37 + PER(0.01) * t; });
}
