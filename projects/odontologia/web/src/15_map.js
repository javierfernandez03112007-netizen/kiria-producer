// ---------------------------------------------------------------- el mapa de Europa flotando sobre la plaza (Natural Earth 1:10m, en corte con capas de tierra): los países de la UE
// se encienden en verde con un ✓ uno a uno (todos tienen especialidades oficiales de odontología) y España se queda en rojo con una ✗ (frase 6)
let EUROPA = null;
const MAP_K = 0.01, MAP_H = 0.7, MAP_S = 0.075;
const MAP_P = v3(0, 3.5, -33.4);
const mapXZ = p => [p[0] * MAP_K, -p[1] * MAP_K];
function splitSlab(rings, h) {
  const caps = { p: [], n: [], u: [] }, sides = { p: [], n: [], u: [] };
  for (const r of rings) { const s = new THREE.Shape(r.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 1 }); g.rotateX(-Math.PI / 2);
    const q = g.toNonIndexed(), P = q.attributes.position, N = q.attributes.normal, U = q.attributes.uv;
    for (const gr of q.groups) { const T = gr.materialIndex === 0 ? caps : sides; for (let i = gr.start; i < gr.start + gr.count; i++) { T.p.push(P.getX(i), P.getY(i), P.getZ(i)); T.n.push(N.getX(i), N.getY(i), N.getZ(i)); T.u.push(U.getX(i), U.getY(i)); } } }
  return [caps, sides].map(T => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(T.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(T.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(T.u, 2)); return g; });
}
function outline(rings, y, color, width, op = 1) { const pos = []; for (const r of rings) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; pos.push(a[0], y, a[1], b[0], y, b[1]); }
  const g = new LineSegmentsGeometry(); g.setPositions(pos); const l = new LineSegments2(g, lineMat(color, width, op)); l.renderOrder = 4; return l; }
const centroid = rings => { let best = rings[0], A = 0; for (const r of rings) { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } if (Math.abs(a) > A) { A = Math.abs(a); best = r; } }
  let x = 0, z = 0; for (const p of best) { x += p[0]; z += p[1]; } return [x / best.length, z / best.length]; };
function buildMap() {
  const Z = new THREE.Group(); scene.add(Z); S.map = Z; Z.scale.setScalar(MAP_S);
  const strata = canvasTex(64, 256, (g, w, h) => { const bands = [['#3b2a1e', 0.0], ['#4d3626', 0.22], ['#6a4a31', 0.42], ['#7d5a3a', 0.6], ['#946b45', 0.76], ['#a97d50', 0.88], ['#5e9e3e', 0.94], ['#7cc153', 0.97]];
    bands.forEach(([c, y0], i) => { const y1 = i + 1 < bands.length ? bands[i + 1][1] : 1; g.fillStyle = c; g.fillRect(0, y0 * h, w, (y1 - y0) * h + 1); }); });
  strata.wrapS = strata.wrapT = THREE.RepeatWrapping; const D = MAP_H + 0.1; strata.repeat.set(0.05, 1 / D); strata.offset.set(0, -(1 - D) / D - 0.05 / D);
  const side = new THREE.MeshStandardMaterial({ map: strata, roughness: 0.95 });
  S.countries = [];
  for (const [grp, list] of Object.entries({ eu: EUROPA.eu, other: EUROPA.other })) for (const [name, rings0] of Object.entries(list)) { if (!rings0.length) continue;
    const rings = rings0.map(r => r.map(mapXZ)); const h = grp === 'eu' ? MAP_H : MAP_H * 0.55;
    const top = new THREE.MeshStandardMaterial({ color: grp === 'eu' ? 0x8fbf70 : 0xb9b4a8, roughness: 0.85, flatShading: true });
    const [caps, sides] = splitSlab(rings, h); const a = new THREE.Mesh(caps, top), b = new THREE.Mesh(sides, side); for (const m of [a, b]) { m.castShadow = true; m.receiveShadow = true; Z.add(m); }
    const ol = outline(rings, h + 0.06, 0xffffff, 1.4, 0.85); Z.add(ol);
    const [cx, cz] = centroid(rings); S.countries.push({ name, grp, top, h, cx, cz, rings, ol, spain: name === 'Spain' }); }
  // marcas: ✓ dorada sobre cada país de la UE y ✗ roja sobre España
  const mkMark = (ok) => { const g = new THREE.Group(); const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.25, 28), plastic(ok ? 0x23a559 : 0xe02424, 0.3)); disc.rotation.x = Math.PI / 2; g.add(disc);
    const sym = plateText(1.5, 1.5, [[ok ? '✓' : '✗', 0.95, 0.56]], { fg: '#ffffff', weight: 900 }); sym.position.z = 0.14; g.add(sym); const sym2 = sym.clone(); sym2.rotation.y = Math.PI; sym2.position.z = -0.14; g.add(sym2);
    const stick = cyl(0.08, 0.08, 1.6, M.chrome || plastic(0xdddddd), 8); stick.position.y = -1.6; g.add(stick); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; };
  S.marks = S.countries.filter(c => c.grp === 'eu').map(c => { const m = mkMark(!c.spain); m.position.set(c.cx, c.h + 2.6, c.cz); m.scale.setScalar(c.spain ? 1.9 : 1.0); Z.add(m); m.userData.c = c; return m; });
  const md = mapXZ(EUROPA.madrid); S.spainC = S.countries.find(c => c.spain); S.mapCenter = v3(0, 0, 0);
}
const _m4b = new THREE.Object3D();
function mapAt(t) {
  const Z = S.map, vis = t > K.segun6 - 0.8 && t < K.julio6 + 0.6; Z.visible = vis; if (!vis) return;
  const k = pop(t, K.segun6 - 0.6, 0.6) * (1 - win(t, K.julio6 + 0.2, 0.35));
  Z.position.set(MAP_P.x, MAP_P.y + 0.05 * Math.sin(t * 1.1) - (1 - k) * 1.5, MAP_P.z); Z.rotation.set(0.42 + 0.03 * Math.sin(t * 0.7), 0.05 * Math.sin(t * 0.5), 0.02 * Math.sin(t * 0.9)); Z.scale.setScalar(MAP_S * Math.max(0.0001, k));
  // los países de la UE se ponen verdes con su ✓ (de fuera hacia dentro) y España, al final, en rojo
  const eu = S.countries.filter(c => c.grp === 'eu' && !c.spain), green = new THREE.Color(0x3fbf6a), base = new THREE.Color(0x8fbf70);
  eu.forEach((c, i) => { const t0 = K.unico6 - 0.3 + (Math.hypot(c.cx, c.cz) / 25) * 0.9; const g = clamp((t - t0) / 0.25); c.top.color.copy(base).lerp(green, g); c.top.emissive = c.top.emissive || new THREE.Color(); });
  const sp = S.spainC, r = clamp((t - K.sin6 + 0.1) / 0.3); sp.top.color.set(0x8fbf70).lerp(new THREE.Color(0xe23b3b), r);
  S.marks.forEach(m => { const c = m.userData.c, t0 = c.spain ? K.sin6 - 0.05 : K.unico6 - 0.3 + (Math.hypot(c.cx, c.cz) / 25) * 0.9; const s = pop(t, t0, 0.35); m.visible = s > 0.01; m.scale.setScalar(Math.max(0.0001, s * (c.spain ? 1.9 : 1.0))); m.quaternion.copy(cam.quaternion);
    const q = new THREE.Quaternion(); Z.getWorldQuaternion(q); m.quaternion.premultiply(q.invert()); m.position.y = c.h + 2.6 + 0.3 * Math.sin(t * 3 + c.cx); });
}
