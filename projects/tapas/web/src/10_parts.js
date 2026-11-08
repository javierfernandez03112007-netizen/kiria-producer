// ---------------------------------------------------------------- «ADE no tiene salidas»: materiales y piezas (papel, libros, figuritas y haces de luz de «Derecho»)
const M = {};
function repTex(t, rx, ry) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
function woodTex(base, dark, light, seed = 1) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y0 = hash(i * 3.3 + seed) * h, a = 0.05 + hash(i * 7.1 + seed) * 0.22, amp = 2 + hash(i * 1.7) * 9, f = 0.004 + hash(i * 5.5) * 0.012;
      g.strokeStyle = hash(i * 2.2 + seed) > 0.45 ? dark : light; g.globalAlpha = a; g.lineWidth = 0.6 + hash(i * 9.9) * 2.4; g.beginPath();
      for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + i) * amp + Math.sin(x * f * 3.1 + i * 2) * amp * 0.3; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}
function marbleTex(base, vein, seed = 3, n = 26) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      let x = hash(i * 4.1 + seed) * w, y = hash(i * 8.7 + seed) * h, ang = hash(i * 2.9) * 6.28;
      g.strokeStyle = vein; g.globalAlpha = 0.08 + hash(i * 6.3) * 0.25; g.lineWidth = 0.5 + hash(i * 3.7) * 2.5; g.shadowColor = vein; g.shadowBlur = 6; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 70; k++) { ang += (hash(i * 31 + k * 1.3) - 0.5) * 0.7; x += Math.cos(ang) * 9; y += Math.sin(ang) * 9; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1; g.shadowBlur = 0;
  });
}
function paperTex(draw, w = 512, h = 700) { return canvasTex(w, h, (g, W2, H2) => { g.fillStyle = '#f2eee3'; g.fillRect(0, 0, W2, H2); const gr = g.createRadialGradient(W2 / 2, H2 / 2, H2 * 0.2, W2 / 2, H2 / 2, H2 * 0.8); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(90,70,40,.18)'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); if (draw) draw(g, W2, H2); }); }
function textLines(g, x, y, w, n, lh, col = 'rgba(40,36,30,.55)', seed = 1) { g.fillStyle = col; for (let i = 0; i < n; i++) { const ww = w * (i % 7 === 6 ? 0.55 : 0.85 + hash(i * 3.1 + seed) * 0.15); for (let x2 = x; x2 < x + ww;) { const wl = 10 + hash(i * 13 + x2 * 0.7 + seed) * 34; g.fillRect(x2, y + i * lh, Math.min(wl, x + ww - x2), lh * 0.42); x2 += wl + 6; } } }
const mesh = (geo, m, cs = true) => { const o = new THREE.Mesh(geo, m); o.castShadow = cs; o.receiveShadow = true; return o; };
const grp = (...ch) => { const g = new THREE.Group(); for (const c of ch) g.add(c); return g; };
const at = (o, x, y, z, ry = 0, rx = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
// rótulo pintado (dorado sobre piel, negro sobre papel…) en un plano
function plateText(w, h, lines, { fg = '#e8c77a', bg = null, font = 'Inter', weight = 800, px = 512, border = false, align = 'center' } = {}) {
  const t = canvasTex(px, Math.round(px * h / w), (g, W2, H2) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W2, H2); }
    if (border) { g.strokeStyle = fg; g.lineWidth = W2 * 0.012; g.strokeRect(W2 * 0.05, H2 * 0.06, W2 * 0.9, H2 * 0.88); }
    g.fillStyle = fg; g.textAlign = align; g.textBaseline = 'middle';
    lines.forEach(([s, size, yy]) => { g.font = `${weight} ${size * H2}px ${font}`; g.fillText(s, align === 'center' ? W2 / 2 : W2 * 0.08, yy * H2, W2 * 0.92); });
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: !bg, roughness: 0.4, metalness: bg ? 0 : 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
  return m;
}

// ---------------------------------------------------------------- piezas
function lightCone(r = 1.1, hgt = 4, op = 0.07, col = 0xffe2b0) {      // haz de luz polvoriento (aditivo, se apaga hacia abajo y en los bordes)
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { op: { value: op }, col: { value: new THREE.Color(col) } },
    vertexShader: 'varying vec2 vU; varying vec3 vN; varying vec3 vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float op; uniform vec3 col; varying vec2 vU; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 1.6); float a = op * f * smoothstep(0.0, 0.35, vU.y) * (0.35 + 0.65 * vU.y); gl_FragColor = vec4(col * a, 1.); }' });
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, r, hgt, 40, 1, true), m); c.position.y = hgt / 2; c.renderOrder = 6; c.userData.keepOp = true; return c;
}
function book(w, h, d, color, title, sub = '') {
  const g = new THREE.Group(), lm = M.leather(color);
  const cover = rbox(w, h, d, lm, 0.012); g.add(cover);
  const pg = mesh(new THREE.BoxGeometry(w * 0.94, h * 0.95, d * 0.8), M.pages); pg.position.x = w * 0.03; g.add(pg);
  if (title) { const p = plateText(w * 0.8, h * 0.5, [[title, 0.13, 0.36], [sub, 0.08, 0.62]], { border: true }); p.position.set(0, 0, d / 2 + 0.001); g.add(p);
    const sp = plateText(h * 0.86, d * 0.8, [[title, 0.5, 0.5]]); sp.rotation.set(0, -Math.PI / 2, Math.PI / 2); sp.position.set(-w / 2 - 0.001, 0, 0); g.add(sp); }
  return g;
}
function studentGeo(lo = false) {
  const body = new THREE.CylinderGeometry(lo ? 0.009 : 0.0095, lo ? 0.014 : 0.0145, 0.034, lo ? 6 : 14); body.translate(0, 0.017, 0);
  const sh = new THREE.SphereGeometry(lo ? 0.011 : 0.0115, lo ? 6 : 14, lo ? 4 : 8, 0, Math.PI * 2, 0, Math.PI / 2); sh.translate(0, 0.034, 0);
  const head = new THREE.SphereGeometry(lo ? 0.0075 : 0.008, lo ? 6 : 16, lo ? 4 : 12); head.translate(0, 0.052, 0);
  const parts = [body, sh, head].map(g => g.index ? g.toNonIndexed() : g); parts.forEach(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
  return mergeGeometries(parts);
}
function capGeo() { const b = new THREE.BoxGeometry(0.022, 0.003, 0.022); b.translate(0, 0.062, 0); const c = new THREE.CylinderGeometry(0.008, 0.009, 0.006, 10); c.translate(0, 0.0585, 0); return mergeGeometries([b.toNonIndexed(), c.toNonIndexed()].map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; })); }
function buildMats() {
  M.wood = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#5a3418', '#2c160a', '#7d522c', 1), 1, 1), roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  M.woodD = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#33190c', '#170a04', '#4a2a16', 4), 1, 1), roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  M.brass = metal(0xcfa860, 0.27); M.gold = metal(0xffcf6e, 0.18); M.steel = metal(0xd3d8e0, 0.16); M.dsteel = metal(0x8a929e, 0.3);
  M.marble = new THREE.MeshPhysicalMaterial({ map: repTex(marbleTex('#e9e5de', '#8f8a82'), 3, 1), roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.12 });
  M.floorW = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#6b4424', '#3e2410', '#8d5f36', 5), 4, 1), roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  M.stone = new THREE.MeshStandardMaterial({ color: 0x30333b, roughness: 0.8, metalness: 0.05 });
  M.stoneL = new THREE.MeshStandardMaterial({ color: 0x55585f, roughness: 0.75, metalness: 0.05 });
  M.wallIn = new THREE.MeshStandardMaterial({ color: 0x8a8174, roughness: 0.86 });
  M.lobbyWall = new THREE.MeshStandardMaterial({ color: 0x4f545c, roughness: 0.8 });
  M.slab = new THREE.MeshStandardMaterial({ color: 0x202329, roughness: 0.55, metalness: 0.15 });
  M.paper = new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.9 });
  M.ceramic = new THREE.MeshPhysicalMaterial({ color: 0xe6e1d8, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xd8e2ea, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  M.black = new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.4, metalness: 0.3 });
  M.lockRed = new THREE.MeshPhysicalMaterial({ color: 0xc8202a, roughness: 0.32, metalness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  M.yellow = new THREE.MeshPhysicalMaterial({ color: 0xf2c218, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.2 });
  M.capM = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5 });
  M.leather = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  M.pages = new THREE.MeshStandardMaterial({ map: canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#efe9da'; g.fillRect(0, 0, w, h); for (let i = 0; i < h; i += 2) { g.fillStyle = `rgba(120,100,70,${0.05 + hash(i) * 0.12})`; g.fillRect(0, i, w, 1); } }), roughness: 0.92 });
}

// ---------------------------------------------------------------- señal verde de emergencia (pictograma genérico: puerta, figura que corre, flecha y «SALIDA»)
let _exitTex = null;
function exitTex() {
  return _exitTex || (_exitTex = canvasTex(512, 192, (g, w, h) => {
    g.fillStyle = '#00a651'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.fillRect(26, 24, 96, 144); g.fillStyle = '#00a651'; g.fillRect(38, 36, 72, 132);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(154, 44, 15, 0, 7); g.fill();
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#ffffff'; g.lineWidth = 17;
    const L = pts => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    L([[150, 68], [136, 110]]); L([[136, 110], [160, 130], [154, 164]]); L([[136, 110], [116, 136], [92, 140]]);
    L([[148, 76], [172, 94], [190, 84]]); L([[148, 76], [126, 82], [112, 100]]);
    L([[208, 96], [238, 96]]); L([[226, 80], [244, 96], [226, 112]]);
    g.font = '900 88px Inter'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('SALIDA', 262, 100, 236);
  }));
}
function exitSign(w = 0.12) {
  const h = w * 192 / 512, g = new THREE.Group();
  const body = rbox(w * 1.07, h * 1.14, 0.012, plastic(0x0b3420, 0.45), 0.004); g.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: exitTex(), toneMapped: false }));
  face.position.z = 0.0066; g.add(face); g.userData = { face, k: -1, w, h };
  return g;
}
// encendida (k = 1, brilla) o apagada (k = 0, verde muy oscuro)
function signOn(sg, k) { k = clamp(k); if (Math.abs(sg.userData.k - k) < 1e-4) return; sg.userData.k = k; sg.userData.face.material.color.setScalar(lerp(0.07, 2.3, k)); }

// ---------------------------------------------------------------- candado (cuerpo rojo, arco de acero que sube al abrirse)
function padlock(s = 1, body = M.lockRed) {
  const g = new THREE.Group();
  const b = rbox(0.05, 0.042, 0.02, body, 0.008); g.add(b);
  const sh = new THREE.Group(); g.add(sh);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.0165, 0.0045, 10, 28, Math.PI), M.steel); arc.position.y = 0.033; arc.castShadow = true; sh.add(arc);
  for (const sx of [-1, 1]) { const leg = cyl(0.0045, 0.0045, 0.016, M.steel, 10); leg.position.set(sx * 0.0165, 0.025, 0); sh.add(leg); }
  const hole = cyl(0.0056, 0.0056, 0.004, M.black, 16); hole.rotation.x = Math.PI / 2; hole.position.set(0, 0.004, 0.0105); g.add(hole);
  const slot = mesh(new THREE.BoxGeometry(0.0032, 0.01, 0.004), M.black); slot.position.set(0, -0.003, 0.0105); g.add(slot);
  g.userData = { sh, s0: s }; g.scale.setScalar(s); return g;
}

// ---------------------------------------------------------------- la llave «ADE»: dorada, la punta hacia -z; el ojo (con «ADE» por las dos caras) en +z, en el plano yz
function adeKey() {
  const g = new THREE.Group();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 16, 56), M.gold); bow.rotation.y = Math.PI / 2; bow.position.z = 0.075; bow.castShadow = true; g.add(bow);
  const tx = canvasTex(256, 256, (c, w, h) => { const r = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); r.addColorStop(0, '#ffe7a3'); r.addColorStop(1, '#c89434'); c.fillStyle = r; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
    c.fillStyle = '#5a3a0a'; c.font = '900 96px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ADE', w / 2, h / 2 + 6); });
  for (const sd of [1, -1]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.041, 40), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.3, metalness: 0.75 })); d.rotation.y = sd * Math.PI / 2; d.position.set(sd * 0.0012, 0, 0.075); g.add(d); }
  const col = cyl(0.016, 0.016, 0.018, M.gold, 24); col.rotation.x = Math.PI / 2; col.position.z = 0.017; g.add(col);
  const sh = cyl(0.0085, 0.0085, 0.17, M.gold, 20); sh.rotation.x = Math.PI / 2; sh.position.z = -0.075; g.add(sh);
  for (const [z, d] of [[-0.128, 0.026], [-0.146, 0.018], [-0.158, 0.03]]) { const b = mesh(new THREE.BoxGeometry(0.006, d, 0.011), M.gold); b.position.set(0, -0.006 - d / 2, z); g.add(b); }
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 16, 10), M.gold); tip.position.z = -0.16; g.add(tip);
  return g;
}

// ---------------------------------------------------------------- folios de ofertas de empleo
function offerTex(big, col) {
  return canvasTex(256, 362, (g, w, h) => {
    g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d3461'; g.fillRect(0, 0, w, 54); g.fillStyle = '#ffffff'; g.font = '800 25px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OFERTA DE EMPLEO', w / 2, 29);
    g.fillStyle = '#6b6f78'; g.font = '700 20px Inter'; g.fillText('SE BUSCA', w / 2, 84);
    g.fillStyle = col; g.font = `900 ${big.length > 4 ? 46 : 104}px Inter`; g.fillText(big, w / 2, big.length > 4 ? 136 : 152, w - 30);
    textLines(g, 30, 214, w - 60, 6, 22, 'rgba(40,44,52,.45)', big.length);
    g.strokeStyle = '#d9d4c8'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  });
}
function paperSet(n, tex) {
  const geo = new THREE.BoxGeometry(0.085, 0.0022, 0.12);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82 });
  const im = new THREE.InstancedMesh(geo, m, n); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; return im;
}

// ---------------------------------------------------------------- escalera de mano «ATAJO»
function ladder(len = 1.3) {
  const g = new THREE.Group(), w = 0.07;
  for (const sx of [-1, 1]) { const r = rbox(0.008, len, 0.008, M.yellow, 0.002); r.position.set(sx * w / 2, len / 2, 0); g.add(r); }
  for (let y = 0.06; y < len - 0.02; y += 0.06) { const b = cyl(0.0035, 0.0035, w, M.dsteel, 8); b.rotation.z = Math.PI / 2; b.position.y = y; g.add(b); }
  const sign = plateText(0.14, 0.05, [['ATAJO', 0.62, 0.52]], { fg: '#111111', bg: '#f2c218', weight: 900 }); sign.position.set(0, len * 0.42, 0.01); g.add(sign);
  return g;
}

// ---------------------------------------------------------------- libro tumbado con el lomo hacia delante (+z): ancho w (x), fondo h (z), grueso d (y)
function spineBook(w, h, d, color, title) {
  const g = new THREE.Group();
  const cover = rbox(w, h, d, M.leather(color), 0.003); cover.rotation.x = -Math.PI / 2; cover.position.y = d / 2; g.add(cover);
  const pg = mesh(new THREE.BoxGeometry(w * 0.96, d * 0.78, h * 0.94), M.pages); pg.position.set(0, d / 2, -h * 0.03); g.add(pg);
  const sp = plateText(w * 0.86, d * 0.8, [[title, 0.62, 0.55]], { fg: '#e8c77a', weight: 800 }); sp.position.set(0, d / 2, h / 2 + 0.0008); g.add(sp);
  return g;
}
// ---------------------------------------------------------------- certificado (cartulina con sello dorado y cinta roja), calendario de taco y examen
function certificate() {
  const g = new THREE.Group();
  const p = plateText(0.1, 0.07, [['CERTIFICADO', 0.17, 0.3], ['ASESOR FINANCIERO', 0.1, 0.52]], { fg: '#2b2218', bg: '#f1ead8', weight: 800, border: true }); g.add(p);
  const seal = cyl(0.011, 0.011, 0.003, M.gold, 28); seal.rotation.x = Math.PI / 2; seal.position.set(0.028, -0.019, 0.002); g.add(seal);
  for (const sx of [-1, 1]) { const rb = mesh(new THREE.BoxGeometry(0.006, 0.018, 0.001), plastic(0xb01822, 0.4)); rb.position.set(0.028 + sx * 0.005, -0.03, 0.001); rb.rotation.z = sx * 0.3; g.add(rb); }
  return g;
}
function calendarBlock() {
  const g = new THREE.Group();
  const base = rbox(0.06, 0.07, 0.012, plastic(0x2a2d34, 0.4), 0.004); g.add(base);
  const pages = [];
  for (let k = 0; k < 3; k++) {
    const pv = new THREE.Group(); pv.position.set(0, 0.032, 0.0075 + (2 - k) * 0.0008); g.add(pv);
    const pl = plateText(0.054, 0.06, [['AÑO', 0.16, 0.24], [String(k + 1), 0.56, 0.62]], { fg: '#1b1e24', bg: '#f4f1ea', weight: 900 });
    pl.position.y = -0.032; pv.add(pl); pages.push(pv);
  }
  const ring = cyl(0.003, 0.003, 0.05, M.steel, 8); ring.rotation.z = Math.PI / 2; ring.position.set(0, 0.034, 0.008); g.add(ring);
  g.userData.pages = pages; return g;
}
function examSheet() {
  const t = paperTex((g, w, h) => { g.fillStyle = '#1b1e24'; g.font = '900 54px Inter'; g.textAlign = 'center'; g.fillText('EXAMEN', w / 2, 90); g.font = '700 30px Inter'; g.fillText('DE APTITUD', w / 2, 136);
    textLines(g, 50, 190, w - 100, 14, 30, 'rgba(40,36,30,.45)', 4); }, 360, 480);
  return mesh(new THREE.PlaneGeometry(0.06, 0.08), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide }), false);
}
