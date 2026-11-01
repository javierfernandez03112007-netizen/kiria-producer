// ---------------------------------------------------------------- «Economía por dentro»: materiales y piezas del parqué de la bolsa.
// Escala real en metros. La sala va de x −7 a 7 y de z −6 a 6 (7 m de alto); el panel de cotizaciones está en la pared del fondo (z −6).
const M = {};
const RX = 7, RZ = 6, RH = 7, DESK_Y = 0.76, PLAT_Y = 0.85;
function repTex(t, rx, ry) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
function marbleTex(base, vein, seed = 3, n = 26, px = 1024) {
  return canvasTex(px, px, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      let x = hash(i * 4.1 + seed) * w, y = hash(i * 8.7 + seed) * h, ang = hash(i * 2.9) * 6.28;
      g.strokeStyle = vein; g.globalAlpha = 0.08 + hash(i * 6.3) * 0.25; g.lineWidth = 0.5 + hash(i * 3.7) * 2.5; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 90; k++) { ang += (hash(i * 31 + k * 1.3) - 0.5) * 0.7; x += Math.cos(ang) * 11; y += Math.sin(ang) * 11; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}
function woodTex(base, dark, light, seed = 1) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 240; i++) {
      const y0 = hash(i * 3.3 + seed) * h, a = 0.05 + hash(i * 7.1 + seed) * 0.2, amp = 2 + hash(i * 1.7) * 8, f = 0.004 + hash(i * 5.5) * 0.012;
      g.strokeStyle = hash(i * 2.2 + seed) > 0.45 ? dark : light; g.globalAlpha = a; g.lineWidth = 0.6 + hash(i * 9.9) * 2.2; g.beginPath();
      for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + i) * amp + Math.sin(x * f * 3.1 + i * 2) * amp * 0.3; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}
function buildMats() {
  M.floor = new THREE.MeshPhysicalMaterial({ map: repTex(marbleTex('#15130f', '#4a4237', 5, 30), 5, 5), roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.08 });
  M.marbleW = new THREE.MeshPhysicalMaterial({ map: repTex(marbleTex('#d8d2c6', '#9c9385', 9, 18, 512), 1, 2), roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.15 });
  M.marbleK = new THREE.MeshPhysicalMaterial({ map: repTex(marbleTex('#121214', '#3c3a3a', 11, 22, 512), 1, 1), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06 });
  M.wall = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.85 });
  M.wallL = new THREE.MeshStandardMaterial({ color: 0x3a3631, roughness: 0.8 });
  M.wood = new THREE.MeshPhysicalMaterial({ map: repTex(woodTex('#3b2414', '#1f1209', '#5a3a22', 2), 1, 1), roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  M.gold = metal(0xffcf6e, 0.18); M.goldD = metal(0xc79a45, 0.3); M.steel = metal(0xd3d8e0, 0.2); M.dsteel = metal(0x6f7680, 0.35); M.silver = metal(0xe8ebef, 0.1);
  M.goldChart = new THREE.MeshPhysicalMaterial({ color: 0xffc95a, metalness: 1, roughness: 0.16, clearcoat: 0.6, emissive: 0x3a2400, emissiveIntensity: 0.35 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.4, metalness: 0.3 });
  M.suit = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4, clearcoat: 0.4 });       // figuritas (color por instancia)
  M.paper = new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.9 });
  M.whiteP = new THREE.MeshPhysicalMaterial({ color: 0xeeece6, roughness: 0.35, clearcoat: 0.6 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe0ea, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  M.coin = metal(0xf2c25b, 0.22);
}
const mesh = (geo, m, cs = true) => { const o = new THREE.Mesh(geo, m); o.castShadow = cs; o.receiveShadow = true; return o; };
const grp = (...ch) => { const g = new THREE.Group(); for (const c of ch) g.add(c); return g; };
const at = (o, x, y, z, ry = 0, rx = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
const strip = g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; };
const mergeAll = gs => mergeGeometries(gs.map(g => strip(g.index ? g.toNonIndexed() : g)));
function cpuTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g }; return t; }
function plateText(w, h, lines, { fg = '#111', bg = '#f4f1ea', font = 'Inter', weight = 800, px = 512, border = false } = {}) {
  const t = canvasTex(px, Math.round(px * h / w), (g, W2, H2) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W2, H2); }
    if (border) { g.strokeStyle = fg; g.lineWidth = W2 * 0.02; g.strokeRect(W2 * 0.05, H2 * 0.06, W2 * 0.9, H2 * 0.88); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([s, size, yy, col]) => { g.font = `${weight} ${size * H2}px ${font}`; g.fillStyle = col || fg; g.fillText(s, W2 / 2, yy * H2, W2 * 0.92); });
  });
  return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, transparent: !bg, polygonOffset: true, polygonOffsetFactor: -2 }), false);
}
// figurita de gestor (muñeco con traje): cuerpo + cabeza, 1 de alto (se escala)
function figGeo() {
  const body = new THREE.CapsuleGeometry(0.11, 0.42, 8, 18); body.translate(0, 0.32, 0);
  const head = new THREE.SphereGeometry(0.1, 24, 16); head.translate(0, 0.76, 0);
  const bag = new THREE.BoxGeometry(0.12, 0.09, 0.035); bag.translate(0.17, 0.14, 0);
  return mergeAll([body, head, bag]);
}
function deskGeo(w = 1.6, d = 0.8) {        // mesa de operador: tablero y dos laterales
  const top = new THREE.BoxGeometry(w, 0.05, d); top.translate(0, DESK_Y - 0.025, 0);
  const s1 = new THREE.BoxGeometry(0.05, DESK_Y - 0.05, d - 0.06); s1.translate(-w / 2 + 0.05, (DESK_Y - 0.05) / 2, 0);
  const s2 = s1.clone(); s2.translate(w - 0.1, 0, 0);
  const back = new THREE.BoxGeometry(w - 0.1, 0.4, 0.03); back.translate(0, DESK_Y - 0.3, -d / 2 + 0.05);
  return mergeAll([top, s1, s2, back]);
}
function monitor(tex, w = 0.56, h = 0.34) {     // pantalla con soporte; la imagen es un lienzo (emite luz)
  const g = new THREE.Group();
  const frame = rbox(w + 0.03, h + 0.03, 0.03, M.black, 0.01); frame.position.y = 0.2 + h / 2; g.add(frame);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1, 1, 1).multiplyScalar(0.9) }));
  scr.position.set(0, 0.2 + h / 2, 0.017); g.add(scr); g.userData.scr = scr;
  const st = cyl(0.015, 0.015, 0.2, M.dsteel, 10); st.position.y = 0.1; g.add(st);
  const ft = cyl(0.09, 0.1, 0.012, M.dsteel, 24); ft.position.y = 0.006; g.add(ft);
  return g;
}
function houseModel() {
  const g = new THREE.Group();
  const body = rbox(0.34, 0.24, 0.3, M.whiteP, 0.012); body.position.y = 0.12; g.add(body);
  const roofS = new THREE.Shape(); roofS.moveTo(-0.2, 0); roofS.lineTo(0, 0.16); roofS.lineTo(0.2, 0); roofS.closePath();
  const roof = mesh(new THREE.ExtrudeGeometry(roofS, { depth: 0.34, bevelEnabled: false }), M.black); roof.position.set(0, 0.24, -0.17); g.add(roof);
  const door = mesh(new THREE.BoxGeometry(0.07, 0.12, 0.01), M.wood); door.position.set(0, 0.06, 0.151); g.add(door);
  for (const x of [-0.1, 0.1]) { const w = mesh(new THREE.BoxGeometry(0.06, 0.06, 0.01), M.black); w.position.set(x, 0.15, 0.151); g.add(w); }
  return g;
}
function towerModel(h = 1.0) {        // torre de oficinas de cristal (maqueta) con planta a planta
  const g = new THREE.Group(), n = 14;
  const tex = canvasTex(128, 512, (c, w, hh) => { c.fillStyle = '#0d1218'; c.fillRect(0, 0, w, hh); for (let y = 6; y < hh; y += 18) for (let x = 6; x < w; x += 16) { c.fillStyle = hash(x * 3.1 + y * 7.7) > 0.55 ? '#ffd88a' : '#1d2732'; c.fillRect(x, y, 10, 11); } });
  const body = mesh(new THREE.BoxGeometry(0.3, h, 0.3), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.4 }));
  body.position.y = h / 2; g.add(body); g.userData.body = body; g.userData.h = h; g.userData.n = n;
  const cap = mesh(new THREE.BoxGeometry(0.32, 0.03, 0.32), M.steel); cap.position.y = h + 0.015; g.add(cap); g.userData.cap = cap;
  return g;
}
function medal(m = M.gold) {
  const g = new THREE.Group();
  const d = cyl(0.11, 0.11, 0.014, m, 64); d.rotation.x = Math.PI / 2; g.add(d);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 10, 64), m); g.add(rim);
  const prof = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), m); prof.scale.set(0.8, 1, 0.25); prof.position.set(0, 0.01, 0.009); g.add(prof);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 6, 48), m); ring.position.z = 0.008; g.add(ring);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function coinGeo() { const c = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 40); const r = new THREE.TorusGeometry(0.029, 0.0018, 6, 40); r.rotateX(Math.PI / 2); return mergeAll([c, r]); }
