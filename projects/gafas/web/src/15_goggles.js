// ---------------------------------------------------------------- las gafas: montura, espuma, cinta y la lente por capas (espejo, lente con color y filtro UV,
// filtro polarizado, cámara de aire y lente interior antivaho). Medidas reales (≈ 19 × 10 cm) curvadas como una lente tórica.
const GW = 0.19, GH = 0.098, GRC = 0.125, GRV = 0.42;          // ancho, alto, radio de curvatura horizontal y vertical
function lensShape(off = 0) {                                   // silueta frontal con el hueco de la nariz (off: crece hacia fuera)
  const w = GW / 2 + off, h = GH / 2 + off, s = new THREE.Shape();
  s.moveTo(0, h * 0.98);
  s.bezierCurveTo(w * 0.55, h * 1.02, w * 0.98, h * 0.86, w, h * 0.22);
  s.bezierCurveTo(w * 1.01, -h * 0.35, w * 0.86, -h * 0.98, w * 0.5, -h * 0.98);
  s.bezierCurveTo(w * 0.3, -h * 0.98, w * 0.2, -h * 0.95, w * 0.14 - off * 0.3, -h * 0.62);
  s.bezierCurveTo(w * 0.09 - off * 0.3, -h * 0.28 + off, -w * 0.09 + off * 0.3, -h * 0.28 + off, -w * 0.14 + off * 0.3, -h * 0.62);
  s.bezierCurveTo(-w * 0.2, -h * 0.95, -w * 0.3, -h * 0.98, -w * 0.5, -h * 0.98);
  s.bezierCurveTo(-w * 0.86, -h * 0.98, -w * 1.01, -h * 0.35, -w, h * 0.22);
  s.bezierCurveTo(-w * 0.98, h * 0.86, -w * 0.55, h * 1.02, 0, h * 0.98);
  return s;
}
// curva una geometría plana (x, y; z = grosor hacia atrás) sobre la lente tórica: la cara mira hacia +z
function bendGeo(g, back = 0) {
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), R = GRC + z - back, a = x / GRC;
    P.setXYZ(i, Math.sin(a) * R, y, Math.cos(a) * R - GRC - (y * y) / (2 * GRV));
  }
  g.computeVertexNormals(); return g;
}
function lensGeo(back = 0, seg = 40) { const g = new THREE.ShapeGeometry(lensShape(0), seg); const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, 0); return bendGeo(g, back); }
// textura de la rejilla del filtro polarizado (líneas verticales finas)
let _polT = null;
function polTex() { return _polT || (_polT = canvasTex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let x = 0; x < w; x += 6) { g.fillStyle = 'rgba(30,40,60,.85)'; g.fillRect(x, 0, 2, h); } })); }
function uvFromXY(g) { const P = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / GW + 0.5, P.getY(i) / GH + 0.5); }
// colores de lente: espejo (metal + iridiscencia) o tintada (transparente)
const LENS = {
  orangeMirror: { col: 0xff7410, metal: 0.82, op: 0.97, irid: 0.28 }, silver: { col: 0xc9d1dc, metal: 1, op: 0.97, irid: 0.35 },
  gray: { col: 0x3a3f46, metal: 0.2, op: 0.82, irid: 0 }, blueMirror: { col: 0x3d7dff, metal: 0.9, op: 0.95, irid: 0.8 },
  orange: { col: 0xff7a1a, metal: 0, op: 0.62, irid: 0 }, yellow: { col: 0xffd21a, metal: 0, op: 0.55, irid: 0 }, rose: { col: 0xff6f9a, metal: 0, op: 0.58, irid: 0 }, clear: { col: 0xdfe8f2, metal: 0, op: 0.25, irid: 0 },
};
function lensMat() { return new THREE.MeshPhysicalMaterial({ color: 0xff7410, metalness: 0.82, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.28, iridescenceIOR: 1.6, iridescenceThicknessRange: [300, 520], emissive: 0xff5a00, emissiveIntensity: 0.18, transparent: true, opacity: 0.97, envMapIntensity: 1.7, side: THREE.DoubleSide, depthWrite: false }); }
function setLens(m, a, b, k = 0) {     // mezcla de dos presets
  const A = LENS[a], B = LENS[b || a]; m.color.setHex(A.col).lerp(_c.setHex(B.col), k);
  m.metalness = lerp(A.metal, B.metal, k); m.opacity = lerp(A.op, B.op, k); m.iridescence = lerp(A.irid, B.irid, k); m.needsUpdate = false;
  if (m.emissive) { const ea = /orange/i.test(a) ? 0.18 : 0, eb = /orange/i.test(b || a) ? 0.18 : 0; m.emissive.copy(m.color); m.emissiveIntensity = lerp(ea, eb, k); }
}
function buildGoggles(scale = 1, mode = 'hero') {
  const g = new THREE.Group(), L = {}; g.userData.L = L;
  const frameM = paint(0x16181d, 0.45, 0.6), foamM = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.95 }), strapM = paint(0x15171c, 0.6, 0.2), stripeM = paint(0xff7a12, 0.45, 0.4);
  // montura: anillo (silueta un poco más grande con el hueco de la lente) extruido y curvado
  const ring = lensShape(0.0105); ring.holes.push(new THREE.Path(lensShape(-0.002).getPoints(80).reverse()));
  const fg = new THREE.ExtrudeGeometry(ring, { depth: 0.026, bevelEnabled: true, bevelSize: 0.0025, bevelThickness: 0.0025, bevelSegments: 2, curveSegments: 40 });
  fg.translate(0, 0, -0.026); bendGeo(fg, -0.0015); L.frame = new THREE.Mesh(fg, frameM); L.frame.castShadow = true; g.add(L.frame);
  // espuma (detrás de la montura)
  const foam = new THREE.ExtrudeGeometry(ring, { depth: 0.014, bevelEnabled: false, curveSegments: 40 }); foam.translate(0, 0, -0.04); bendGeo(foam, 0);
  L.foam = new THREE.Mesh(foam, foamM); g.add(L.foam);
  // rejillas de ventilación arriba
  L.vents = new THREE.Group(); g.add(L.vents);
  for (let i = -5; i <= 5; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.003, 0.012), strapM); const x = i * 0.015, a = x / GRC; v.position.set(Math.sin(a) * (GRC + 0.002), GH / 2 + 0.0085 - Math.abs(i) * 0.0006, Math.cos(a) * (GRC + 0.002) - GRC - 0.012); v.rotation.y = a; L.vents.add(v); }
  // cinta
  const strap = new THREE.Group(); g.add(strap); L.strap = strap;
  const ribbon = (side) => {
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, a = (GW / 2 + 0.008) / GRC + u * 1.9; pts.push(v3(side * Math.sin(a) * (GRC + 0.02 + u * 0.03), 0, Math.cos(a) * (GRC + 0.02 + u * 0.03) - GRC - 0.02)); }
    const pos = [], idx = []; const w = 0.042;
    pts.forEach((p, i) => { pos.push(p.x, -w / 2, p.z, p.x, w / 2, p.z); if (i) { const b = (i - 1) * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx); gg.computeVertexNormals();
    const m = new THREE.Mesh(gg, strapM.clone()); m.material.side = THREE.DoubleSide; strap.add(m);
    const st = new THREE.Mesh(gg.clone().scale(1.002, 0.25, 1.002), stripeM); st.material.side = THREE.DoubleSide; strap.add(st);
  };
  ribbon(1); ribbon(-1);
  // la lente por capas (de fuera hacia dentro): 0 espejo · 1 lente con color + filtro UV · 2 filtro polarizado · 3 lente interior antivaho
  const mk = (back, mat) => { const geo = lensGeo(back); uvFromXY(geo); const m = new THREE.Mesh(geo, mat); m.renderOrder = 6; return m; };
  L.mirror = mk(0.002, lensMat()); g.add(L.mirror);
  if (mode === 'hero') {
    L.tint = mk(0.006, new THREE.MeshPhysicalMaterial({ color: 0xff7a1a, metalness: 0, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1 })); g.add(L.tint);
    L.pol = mk(0.008, new THREE.MeshBasicMaterial({ map: polTex(), color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false })); g.add(L.pol);
    L.inner = mk(0.012, new THREE.MeshPhysicalMaterial({ color: 0xe9f2fb, metalness: 0, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.2 })); g.add(L.inner);
    // aristas de cada capa (estilo despiece técnico), invisibles hasta que se desmonta
    const BK = { mirror: 0.002, tint: 0.006, pol: 0.008, inner: 0.012 };
    for (const k in BK) { const R = GRC - BK[k]; const pts = lensShape(0).getPoints(90).map(p => { const a = p.x / GRC; return v3(Math.sin(a) * R, p.y, Math.cos(a) * R - GRC - (p.y * p.y) / (2 * GRV)); });
      const l = drawLine(pts, 0xe6ecf2, 1.6, 0); L[k].add(l); L[k].userData.edge = l; L[k].userData.back = BK[k]; }
    // vaho: gotitas en la cara interior de la lente interior
    const n = 420, dg = new THREE.SphereGeometry(1, 8, 6), dm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, transmission: 0, transparent: true, opacity: 0.65, clearcoat: 1 });
    const drops = new THREE.InstancedMesh(dg, dm, n); const M = new THREE.Matrix4(); let c = 0; const sh = lensShape(-0.006), pts2 = sh.getPoints(60);
    const inside = (x, y) => { let ins = false; for (let i = 0, j = pts2.length - 1; i < pts2.length; j = i++) { const a = pts2[i], b = pts2[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) ins = !ins; } return ins; };
    for (let i = 0; c < n && i < 6000; i++) { const x = (hash(i * 1.3) - 0.5) * GW, y = (hash(i * 2.7) - 0.5) * GH; if (!inside(x, y)) continue; const a = x / GRC, R = GRC - 0.0135, s = 0.0007 + hash(i * 5.1) * 0.0016;
      M.compose(v3(Math.sin(a) * R, y, Math.cos(a) * R - GRC - (y * y) / (2 * GRV)), new THREE.Quaternion(), v3(s, s, s * 0.5)); drops.setMatrixAt(c++, M); }
    drops.count = c; drops.userData.n = c; L.drops = drops; L.inner.add(drops);
  }
  g.scale.setScalar(scale); return g;
}
