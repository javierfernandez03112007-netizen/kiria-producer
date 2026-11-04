// ---------------------------------------------------------------- piezas: el móvil, los objetos de nuestros vídeos, «3,2 M», los 7 días, la cámara de cine,
// las etiquetas del precio, el guion, la onda de la voz, el mazo y su taco, la torre de palabras, el toldo y el bocadillo «KIRIA»
let FONT3 = null;
const PHN = { w: 0.82, h: 1.72, d: 0.085, sw: 0.765, sh: 1.66, y: 0.92 };      // móvil de pie (centro a y = PHN.y)
const WKZ = 1.0;                                                                // zona de trabajo delante del móvil (guion, onda, mazo, torre)
const PIV = v3(0, 0.255, WKZ + 0.48);                                           // eje del mazo (el mango apunta hacia la cámara; la cabeza, de lado)
const SCR = { w: 540, h: Math.round(540 * PHN.sh / PHN.sw) };                    // lienzo de la pantalla
const REELS = [];                                                               // [vídeo][fotograma] imágenes de nuestros vídeos

function rplane(w, h, r, seg = 10) { const g = new THREE.ShapeGeometry(rrShape(w, h, r), seg); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5); return g; }
// texto 3D (Inter Black); centrado en x y en z; en y, centrado o sobre la línea base (base = true)
function text3(str, size, depth, mats, { bevel = 0.008, base = false } = {}) {
  const g = new TextGeometry(str, { font: FONT3, size, depth, curveSegments: 8, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.55, bevelSegments: 2 });
  g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, base ? 0 : -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2);
  const m = new THREE.Mesh(g, mats); m.castShadow = true; m.receiveShadow = true; m.userData.w = b.max.x - b.min.x; m.userData.h = b.max.y - b.min.y; return m;
}
const isLine = o => o.isLineSegments2 || o.isLine2;
function faceOp(g, a) {        // solo las caras (las aristas no se tocan)
  g.traverse(o => { if (!o.isMesh || isLine(o) || !o.material || o.userData.keepOp) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) { const tr = a < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = a; m.depthWrite = a > 0.6; m.visible = a > 0.003; } });
}
function edgeOp(g, a, k = 1) {   // aristas: opacidad y cuántas se dibujan (k de 0 a 1)
  g.traverse(o => { if (!isLine(o)) return; o.material.opacity = a; o.visible = a > 0.003 && k > 0.001; const n = o.userData.n0 ?? (o.userData.n0 = o.geometry.instanceCount === Infinity || o.geometry.instanceCount == null ? o.geometry.attributes.instanceStart.count : o.geometry.instanceCount); o.geometry.instanceCount = Math.max(0, Math.round(n * clamp(k))); });
}

// ---------------------------------------------------------------- el móvil
function buildPhone() {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, roughness: 0.28, metalness: 0.65, clearcoat: 1, clearcoatRoughness: 0.05 });
  const body = rbox(PHN.w, PHN.h, PHN.d, bodyM, 0.13); g.add(body);
  const rimM = metal(0x9aa0aa, 0.22);
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(PHN.w + 0.006, PHN.h + 0.006, 0.12), { depth: 0.03, bevelEnabled: false, curveSegments: 12 }), rimM);
  rim.geometry.translate(0, 0, -0.015); rim.scale.z = 1; g.add(rim);
  for (const [y, h] of [[0.42, 0.16], [0.18, 0.09], [0.06, 0.09]]) { const b = rbox(0.012, h, 0.022, rimM, 0.005); b.position.set(y > 0.3 ? PHN.w / 2 + 0.006 : -PHN.w / 2 - 0.006, y, 0); g.add(b); }
  const T = canvasTex(SCR.w, SCR.h); T.anisotropy = 8;
  const scr = new THREE.Mesh(rplane(PHN.sw, PHN.sh, 0.1), new THREE.MeshBasicMaterial({ map: T, toneMapped: false, color: new THREE.Color(1.18, 1.18, 1.18) }));
  scr.position.z = PHN.d / 2 + 0.0012; g.add(scr);
  const glass = new THREE.Mesh(rplane(PHN.sw + 0.02, PHN.sh + 0.02, 0.11), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.16, depthWrite: false }));
  glass.position.z = PHN.d / 2 + 0.0035; g.add(glass);
  g.position.set(0, PHN.y, 0); scene.add(g);
  S.phone = g; S.scrT = T; S.scr = scr;
}

// ---------------------------------------------------------------- objetos de nuestros vídeos (salen disparados de la pantalla)
function gavel() {          // mazo de madera con anillas de latón: el mango va de (0,0,0) hacia -x; la cabeza, en x = -GL
  const g = new THREE.Group(), GL = 0.48;
  const handle = cyl(0.02, 0.026, GL - 0.03, M.woodL, 20); handle.rotation.z = Math.PI / 2; handle.position.x = -(GL - 0.03) / 2; g.add(handle);
  const knob = sph(0.03, M.woodL, 20, 14); knob.scale.set(1.3, 1, 1); g.add(knob);
  const head = cyl(0.075, 0.075, 0.24, M.wood, 40); head.rotation.x = Math.PI / 2; head.position.x = -GL; g.add(head);
  for (const z of [-0.07, 0.07]) { const b = cyl(0.079, 0.079, 0.02, M.brass, 40); b.rotation.x = Math.PI / 2; b.position.set(-GL, 0, z); g.add(b); }
  for (const z of [-0.125, 0.125]) { const c = cyl(0.064, 0.072, 0.012, M.wood, 40); c.rotation.x = Math.PI / 2; c.position.set(-GL, 0, z); g.add(c); }
  g.userData.GL = GL; return g;
}
function reflexHammer() {   // martillo de reflejos: cabeza triangular de goma roja y mango cromado
  const g = new THREE.Group();
  const hgeo = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 3, 1); hgeo.rotateX(Math.PI / 2); hgeo.rotateZ(Math.PI / 6);
  const head = new THREE.Mesh(hgeo, plastic(0xd2343c, 0.4)); head.castShadow = true; g.add(head);
  const handle = cyl(0.011, 0.013, 0.4, M.silver, 18); handle.position.y = -0.24; g.add(handle);
  const cap = sph(0.016, M.silver); cap.position.y = -0.44; g.add(cap);
  return g;
}
function keyMesh() {        // llave dorada
  const g = new THREE.Group();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.022, 14, 40), M.gold); bow.castShadow = true; g.add(bow);
  const sh = rbox(0.25, 0.036, 0.018, M.gold, 0.008); sh.position.x = 0.19; g.add(sh);
  for (const [x, h] of [[0.18, 0.034], [0.22, 0.05], [0.26, 0.028], [0.295, 0.044]]) { const tt = rbox(0.022, h, 0.016, M.gold, 0.004); tt.position.set(x, -0.016 - h / 2 + 0.004, 0); g.add(tt); }
  return g;
}
function goggles() {        // gafas de esquí: pantalla de espejo naranja, montura negra y cinta
  const g = new THREE.Group(), Rr = 0.34, p0 = Math.PI / 2 - 0.6, pl = 1.2, t0 = Math.PI / 2 - 0.2, tl = 0.4;
  const lensM = new THREE.MeshPhysicalMaterial({ color: 0xff8a33, metalness: 1, roughness: 0.1, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [200, 700] });
  const lens = new THREE.Mesh(new THREE.SphereGeometry(Rr, 48, 16, p0, pl, t0, tl), lensM); lens.position.z = -Rr + 0.05; g.add(lens);
  const pt = (ph, th, r = Rr + 0.004) => v3(-r * Math.cos(ph) * Math.sin(th), r * Math.cos(th), r * Math.sin(ph) * Math.sin(th) - Rr + 0.05);
  const pts = []; const N = 20;
  for (let i = 0; i <= N; i++) pts.push(pt(p0 + pl * i / N, t0));
  for (let i = 1; i <= 6; i++) pts.push(pt(p0 + pl, t0 + tl * i / 6));
  for (let i = N - 1; i >= 0; i--) pts.push(pt(p0 + pl * i / N, t0 + tl));
  for (let i = 5; i >= 1; i--) pts.push(pt(p0, t0 + tl * i / 6));
  const frM = plastic(0x15161a, 0.35); g.add(tube(pts, 0.016, frM, 140, true, 10));
  const sp = [], L = pts[N], Rg = pts[0];
  for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; sp.push(v3(Math.cos(a) * (Rg.x - L.x) / 2 * 1.05 + (Rg.x + L.x) / 2, 0, -Math.sin(a) * 0.3 + Rg.z)); }
  g.add(tube(sp, 0.012, plastic(0x22252c, 0.6), 60));
  return g;
}

// ---------------------------------------------------------------- «3,2 M», los 7 días y la nube de ▶
function buildNumber() {
  const m = paint(0xf2f3f5, 0.2, 1), parts = ['3', ',', '2', 'M'], size = 0.36, gap = 0.035, sp = 0.09;
  const ms = parts.map(c => text3(c, size, 0.11, m, { base: true, bevel: 0.01 }));
  let w = 0; ms.forEach((o, i) => { w += o.userData.w + (i ? (i === 3 ? sp : gap) : 0); });
  let x = -w / 2; const g = new THREE.Group(); g.position.set(0, 2.14, 0.12); scene.add(g);
  ms.forEach((o, i) => { if (i) x += i === 3 ? sp : gap; o.position.x = x + o.userData.w / 2; x += o.userData.w; g.add(o); o.userData.home = o.position.clone(); });
  S.num = { g, ms };
  // días: L M X J V S D
  S.days = 'LMXJVSD'.split('').map((c, i) => {
    const t = new THREE.Group(); const b = rbox(0.145, 0.185, 0.03, plastic(0x17191e, 0.3), 0.02); t.add(b);
    const f = textPlane(0.12, 0.16, (gg, w2, h2) => { gg.fillStyle = 'rgba(238,242,246,.95)'; gg.fillRect(0, 0, w2, h2 * 0.2); gg.fillStyle = '#17191e'; gg.fillRect(w2 * 0.2, h2 * 0.05, w2 * 0.12, h2 * 0.1); gg.fillRect(w2 * 0.68, h2 * 0.05, w2 * 0.12, h2 * 0.1);
      gg.fillStyle = '#eef2f6'; gg.font = `900 ${h2 * 0.58}px Inter`; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(c, w2 / 2, h2 * 0.62); }, 128);
    f.position.z = 0.017; t.add(f); t.position.set(-0.51 + i * 0.17, 1.95, 0.1); scene.add(t); return t;
  });
  // ▶ que suben de la pantalla a las cifras
  const tri = new THREE.Shape(); tri.moveTo(-0.4, -0.5); tri.lineTo(0.55, 0); tri.lineTo(-0.4, 0.5); tri.lineTo(-0.4, -0.5);
  const im = new THREE.InstancedMesh(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.3), toneMapped: false, transparent: true, depthWrite: false, side: THREE.DoubleSide }), 420);
  im.frustumCulled = false; im.renderOrder = 6; scene.add(im); S.plays = im;
  S.playData = Array.from({ length: 420 }, (_, i) => ({ a: v3((hash(i * 1.3) - 0.5) * 0.66, PHN.y + (hash(i * 2.7) - 0.5) * 1.5, PHN.d / 2 + 0.01), d: 0.55 + hash(i * 5.1) * 0.35, t0: hash(i * 7.7) * 0.75, gl: i % 4, u: hash(i * 9.1), v: hash(i * 3.3), s: 0.028 + hash(i * 6.6) * 0.022 }));
}

// ---------------------------------------------------------------- cámara de cine (caras oscuras con aristas blancas)
function buildMovieCam() {
  const g = new THREE.Group();
  const body = bx(0.36, 0.21, 0.15); g.add(body);
  const lens = solid(new THREE.CylinderGeometry(0.052, 0.052, 0.11, 20)); lens.rotation.z = Math.PI / 2; lens.position.x = 0.235; g.add(lens);
  const hood = solid(new THREE.CylinderGeometry(0.085, 0.058, 0.07, 4, 1, false)); hood.rotation.z = Math.PI / 2; hood.rotation.x = Math.PI / 4; hood.position.x = 0.32; g.add(hood);
  const r1 = solid(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 22)); r1.rotation.x = Math.PI / 2; r1.position.set(-0.075, 0.205, 0); g.add(r1);
  const r2 = solid(new THREE.CylinderGeometry(0.082, 0.082, 0.035, 20)); r2.rotation.x = Math.PI / 2; r2.position.set(0.105, 0.19, 0); g.add(r2);
  const vf = bx(0.09, 0.05, 0.05); vf.position.set(-0.215, 0.05, 0.05); g.add(vf);
  const leg = bx(0.05, 0.06, 0.05); leg.position.set(0, -0.135, 0); g.add(leg);
  g.position.set(0.42, 0.165, 1.25); scene.add(g); S.mcam = g;
  // aristas en coordenadas del mundo (pose en el suelo): de aquí salen las líneas que forman la etiqueta
  g.rotation.set(0, -0.5, 0); g.updateMatrixWorld(true);
  const segs = []; g.traverse(o => { if (!isLine(o)) return; const a = o.geometry.attributes.instanceStart, b = o.geometry.attributes.instanceEnd; for (let i = 0; i < a.count; i++) segs.push([v3(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(o.matrixWorld), v3(b.getX(i), b.getY(i), b.getZ(i)).applyMatrix4(o.matrixWorld)]); });
  S.camSegs = segs;
}

// ---------------------------------------------------------------- etiquetas del precio
function tagShape(s = 1) {
  const W2 = 0.3 * s, H2 = 0.17 * s, xp = -0.17 * s, r = 0.03 * s, sh = new THREE.Shape();
  sh.moveTo(-0.3 * s, 0); sh.lineTo(xp, H2); sh.lineTo(W2 - r, H2); sh.quadraticCurveTo(W2, H2, W2, H2 - r); sh.lineTo(W2, -H2 + r); sh.quadraticCurveTo(W2, -H2, W2 - r, -H2); sh.lineTo(xp, -H2); sh.lineTo(-0.3 * s, 0);
  const hole = new THREE.Path(); hole.absarc(-0.215 * s, 0, 0.026 * s, 0, Math.PI * 2, true); sh.holes.push(hole); return sh;
}
function drawTag(T, big, small, col = '#111317') {
  const g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height; g.clearRect(0, 0, w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col;
  let fs = h * 0.56; g.font = `900 ${fs}px Inter`; const tw = g.measureText(big).width; if (tw > w * 0.9) { fs *= w * 0.9 / tw; g.font = `900 ${fs}px Inter`; }
  g.fillText(big, w / 2, h * (small ? 0.6 : 0.52));
  if (small) { g.font = `800 ${h * 0.15}px SpaceMono`; g.letterSpacing = '6px'; g.fillStyle = '#5c636d'; g.fillText(small, w / 2, h * 0.2); g.letterSpacing = '0px'; }
  T.needsUpdate = true;
}
function priceTag(s = 1) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(tagShape(s), { depth: 0.012 * s, bevelEnabled: true, bevelThickness: 0.005 * s, bevelSize: 0.005 * s, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -0.006 * s);
  const body = new THREE.Mesh(geo, paint(0xf4f0e6, 0.35, 0.6)); body.castShadow = true; g.add(body);
  const mk = rot => { const T = canvasTex(520, 300); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.44 * s, 0.254 * s), new THREE.MeshBasicMaterial({ map: T, transparent: true, depthWrite: false, toneMapped: false }));
    p.position.set(0.075 * s, 0, rot ? -0.0122 * s : 0.0122 * s); if (rot) p.rotation.y = Math.PI; p.renderOrder = 7; g.add(p); return T; };
  const fT = mk(false), bT = mk(true);
  const str = tube([v3(-0.215 * s, 0, 0), v3(-0.28 * s, 0.09 * s, 0.01 * s), v3(-0.31 * s, 0.24 * s, 0), v3(-0.27 * s, 0.4 * s, -0.01 * s)], 0.0035, plastic(0x2a2c31, 0.6), 30); g.add(str);
  g.userData = { fT, bT, s, body }; scene.add(g); return g;
}

// ---------------------------------------------------------------- guion, onda de la voz, mazo + taco, torre de palabras
function buildWork() {
  // el guion: papel un poco curvado que sale de la pantalla
  const T = canvasTex(620, 860); const geo = new THREE.PlaneGeometry(0.62, 0.86, 16, 1); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.035 * (x / 0.31) ** 2); } geo.computeVertexNormals();
  const paper = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: T, roughness: 0.8, side: THREE.DoubleSide, transparent: true })); paper.castShadow = true; scene.add(paper);
  S.paper = paper; S.paperT = T;
  // 24 barras: primero son las líneas del guion; luego, la onda de la voz
  S.barM = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.4, toneMapped: true });
  S.bars = Array.from({ length: 24 }, () => { const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), S.barM); b.castShadow = true; scene.add(b); return b; });
  // el mazo (eje en PIV) y su taco
  const pv = new THREE.Group(); pv.position.copy(PIV); scene.add(pv); const gv = gavel(); gv.rotation.y = -Math.PI / 2; pv.add(gv);
  gv.traverse(o => { if (o.isMesh && !isLine(o)) edges(o, 0xf4f8ff, 2.3, 22, 1); });
  S.gavel = { pv, gv };
  const blk = new THREE.Group(); const b0 = cyl(0.2, 0.21, 0.16, M.wood, 48); b0.position.y = 0.08; blk.add(b0);
  const b1 = cyl(0.212, 0.212, 0.02, M.brass, 48); b1.position.y = 0.17; blk.add(b1);
  blk.position.set(0, 0, WKZ); scene.add(blk); S.block = blk;
  // la torre: cada palabra del subtítulo es un bloque (normal: oscuro con letra blanca; la que suena: blanco con letra negra)
  const words = [['SUBTÍTULOS', 0.6], ['PALABRA', 0.37], ['A', 0.13], ['PALABRA', 0.37]];
  S.tower = words.map(([w, wd], i) => {
    const g = new THREE.Group(); const blkM = plastic(0x14161b, 0.3); const box = rbox(wd, 0.1, 0.1, blkM, 0.022); g.add(box);
    const mkT = (bg, fg) => canvasTex(Math.round(480 * wd / 0.4), 120, (gg, w2, h2) => { if (bg) { gg.fillStyle = bg; rr(gg, 6, 6, w2 - 12, h2 - 12, 16); gg.fill(); }
      gg.fillStyle = fg; gg.font = `400 ${h2 * 0.8}px Bebas`; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.letterSpacing = '4px'; gg.fillText(w, w2 / 2, h2 * 0.54); });
    const tN = mkT(null, '#f3f5f8'), tH = mkT('#f3f5f8', '#0d0e11');
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(wd * 0.96, 0.096), new THREE.MeshBasicMaterial({ map: tN, transparent: true, depthWrite: false, toneMapped: false })); fp.position.z = 0.0505; fp.renderOrder = 7; g.add(fp);
    scene.add(g); return { g, fp, tN, tH, wd, blkM };
  });
  // anillos del sonido
  S.rings = Array.from({ length: 7 }, () => { const r = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), basicGlow(0xffffff, 1.4)); r.rotation.x = -Math.PI / 2; r.renderOrder = 8; scene.add(r); return r; });
  // onda expansiva del golpe
  S.shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 96), basicGlow(0xffe7b0, 2.2)); S.shock.rotation.x = -Math.PI / 2; S.shock.position.set(0, 0.012, WKZ); S.shock.renderOrder = 8; scene.add(S.shock);
  S.sp = sparks(scene, 90, 0xffe2a0, 0.03);
}

// ---------------------------------------------------------------- tu negocio (toldo) y el bocadillo «KIRIA»
function buildCTA() {
  const aw = new THREE.Group(); aw.position.set(0, PHN.y + PHN.h / 2 + 0.11, 0.02); scene.add(aw);
  const n = 7, sw = (PHN.w + 0.16) / n, wM = paint(0xf2f2f2, 0.45, 0.3), dM = paint(0x1b1d22, 0.45, 0.3);
  S.slats = [];
  for (let i = 0; i < n; i++) { const piv = new THREE.Group(); piv.position.x = -(PHN.w + 0.16) / 2 + sw * (i + 0.5); aw.add(piv);
    const sl = rbox(sw * 0.98, 0.012, 0.42, i % 2 ? dM : wM, 0.004); sl.position.z = 0.21; piv.add(sl);
    const val = rbox(sw * 0.98, 0.075, 0.01, i % 2 ? dM : wM, 0.004); val.position.set(0, -0.034, 0.42); piv.add(val);
    S.slats.push(piv); }
  const bar = cyl(0.012, 0.012, PHN.w + 0.2, metal(0x9aa0aa, 0.25), 12); bar.rotation.z = Math.PI / 2; aw.add(bar);
  S.awning = aw;
  // bocadillo
  const bw = 0.62, bh = 0.27, r = 0.09, s = new THREE.Shape(), x0 = -bw / 2, y0 = -bh / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + 0.16, y0); s.lineTo(x0 + 0.05, y0 - 0.1); s.lineTo(x0 + 0.26, y0); s.lineTo(x0 + bw - r, y0); s.quadraticCurveTo(x0 + bw, y0, x0 + bw, y0 + r);
  s.lineTo(x0 + bw, y0 + bh - r); s.quadraticCurveTo(x0 + bw, y0 + bh, x0 + bw - r, y0 + bh); s.lineTo(x0 + r, y0 + bh); s.quadraticCurveTo(x0, y0 + bh, x0, y0 + bh - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const bg = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 4, curveSegments: 14 }); bg.translate(0, 0, -0.025);
  const bub = new THREE.Group(); const bm = new THREE.Mesh(bg, paint(0xf6f6f7, 0.25, 1)); bm.castShadow = true; bub.add(bm);
  const lm = paint(0x111317, 0.25, 1);
  S.letters = 'KIRIA'.split('').map(c => text3(c, 0.13, 0.03, lm, { bevel: 0.005 }));
  let lw = 0; S.letters.forEach((o, i) => { lw += o.userData.w + (i ? 0.022 : 0); });
  let lx = -lw / 2; S.letters.forEach((o, i) => { if (i) lx += 0.022; o.position.set(lx + o.userData.w / 2, 0.004, 0.06); lx += o.userData.w; bub.add(o); });
  scene.add(bub); S.bubble = bub;
}

function buildLaunch() {
  buildPhone(); buildNumber(); buildMovieCam(); buildWork(); buildCTA();
  // objetos que salen de la pantalla (posición y giro en el primer fotograma, y a qué cifra van)
  const birr = birrete(); birr.scale.setScalar(0.42);
  const doll = makeDoll(M.gold); doll.scale.setScalar(0.62);
  const gv = gavel(); const gvG = new THREE.Group(); gv.position.x = 0.24; gvG.add(gv);
  S.burst = [
    { o: gvG, p: v3(-0.3, 1.46, 1.3), r: [0.4, 0.7, 0.5], gl: 0, w: [1.2, 2.1, 0.6] },
    { o: keyMesh(), p: v3(-0.3, 0.66, 1.45), r: [0.3, -0.5, 0.9], gl: 1, w: [2.4, 1.2, 3.1] },
    { o: reflexHammer(), p: v3(0.36, 1.12, 1.4), r: [0.2, 0.4, -0.6], gl: 2, w: [1.5, 2.6, 1.1] },
    { o: goggles(), p: v3(0.3, 1.72, 1.05), r: [0.15, -0.6, 0.25], gl: 3, w: [0.8, 1.6, 0.5] },
    { o: birr, p: v3(-0.08, 2.0, 0.95), r: [0.5, 0.3, -0.3], gl: 3, w: [1.3, 0.9, 1.7], s0: 0.42 },
    { o: doll, p: v3(-0.48, 1.05, 1.0), r: [0.2, 0.9, 0.5], gl: 3, w: [1.9, 1.1, 0.9], s0: 0.62 },
  ];
  for (const b of S.burst) { b.o.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(b.o); }
  // cristales de la pantalla
  const shM = new THREE.MeshPhysicalMaterial({ color: 0xdfe9f5, roughness: 0.03, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  S.shards = Array.from({ length: 56 }, (_, i) => { const s = new THREE.Shape(), k = 0.045 + hash(i * 4.4) * 0.1; s.moveTo(0, 0); s.lineTo(k * (0.6 + hash(i) * 0.8), k * 0.25); s.lineTo(k * 0.2, k * (0.7 + hash(i * 2) * 0.6)); s.lineTo(0, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), shM); edges(m, 0xeef4ff, 1.1, 1, 0.55); scene.add(m);
    return { m, a: v3((hash(i * 1.7) - 0.5) * 0.7, PHN.y + (hash(i * 2.3) - 0.5) * 1.5, 0.06), v: v3((hash(i * 3.1) - 0.5) * 1.4, (hash(i * 5.3) - 0.35) * 1.1, 0.6 + hash(i * 6.9) * 1.2), w: hash(i * 8.1) * 6 }; });
  // líneas que pasan de la cámara de cine al guion: el contorno del papel y sus renglones (sin precios en el vídeo: decisión de Javi)
  const nSeg = S.camSegs.length; S.morph = segSet(nSeg, 0xeef2f6, 2.6, 1); scene.add(S.morph);
  const PP = new THREE.Object3D(); PP.position.set(0, 1.06, WKZ); PP.updateMatrixWorld(true);
  const pz = x => 0.035 * (x / 0.31) ** 2, tS = [], add = (x0, y0, x1, y1) => tS.push([v3(x0, y0, pz(x0) + 0.004).applyMatrix4(PP.matrixWorld), v3(x1, y1, pz(x1) + 0.004).applyMatrix4(PP.matrixWorld)]);
  for (let i = 0; i < 10; i++) { const a = -0.31 + 0.062 * i, b = a + 0.062; add(a, 0.43, b, 0.43); add(a, -0.43, b, -0.43); }
  for (let i = 0; i < 12; i++) { const a = 0.43 - 0.86 * i / 12, b = 0.43 - 0.86 * (i + 1) / 12; add(-0.31, a, -0.31, b); add(0.31, a, 0.31, b); }
  for (let i = 0; i < 12; i++) { const y = 0.43 - (PL0 + i * PLS) * 0.86 / 860, x0 = -0.31 + 52 * 0.62 / 620, w = PLW(i) * 0.62 / 620; add(x0, y, x0 + w * 0.5, y); add(x0 + w * 0.5, y, x0 + w, y); }
  S.tagSegs = tS;
}
