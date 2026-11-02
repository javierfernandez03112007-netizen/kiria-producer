// ---------------------------------------------------------------- «Medicina por dentro»: materiales y piezas médicas (martillo de reflejos, bata, fonendo,
// cráneo, hueso, corazón, molécula, microscopio, placa de Petri, fármacos, monitor, cerebro, osito, cama de hospital, hoja del MIR, quirófano y consulta)
function buildMedMats() {
  M.coat = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f6, roughness: 0.72, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffffff) });
  M.scrubs = new THREE.MeshPhysicalMaterial({ color: 0x2c7a6c, roughness: 0.78, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x7fd6c4) });
  M.rubber = new THREE.MeshPhysicalMaterial({ color: 0xd6402a, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  M.chrome = metal(0xeef1f5, 0.07);
  M.ivory = new THREE.MeshPhysicalMaterial({ color: 0xe7dcc2, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  M.heart = new THREE.MeshPhysicalMaterial({ color: 0x8c1a22, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  M.heart2 = new THREE.MeshPhysicalMaterial({ color: 0x6e1820, roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  M.vesselR = new THREE.MeshPhysicalMaterial({ color: 0xb8262f, roughness: 0.3, clearcoat: 0.8 });
  M.vesselB = new THREE.MeshPhysicalMaterial({ color: 0x2c4fa8, roughness: 0.3, clearcoat: 0.8 });
  M.brain = new THREE.MeshPhysicalMaterial({ color: 0xe0a69c, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  M.agar = new THREE.MeshPhysicalMaterial({ color: 0xd9a94a, roughness: 0.25, transparent: true, opacity: 0.85, clearcoat: 1 });
  M.dish = new THREE.MeshPhysicalMaterial({ color: 0xe8f0f6, roughness: 0.03, transparent: true, opacity: 0.28, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  M.amber = new THREE.MeshPhysicalMaterial({ color: 0x9a4a0e, roughness: 0.08, transparent: true, opacity: 0.82, clearcoat: 1 });
  M.tubing = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.42, metalness: 0.1 });
  M.enamel = paint(0x15171c, 0.35, 0.8);
  M.mattress = new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.85 });
  M.blanket = new THREE.MeshPhysicalMaterial({ color: 0x5d8db4, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xa9d0f0) });
  M.felt = new THREE.MeshPhysicalMaterial({ color: 0x9a6a3c, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0xd9b48a) });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x17120e, roughness: 0.9 });
  M.skin = new THREE.MeshPhysicalMaterial({ color: 0xe6d2bd, roughness: 0.5, clearcoat: 0.3 });
  M.bag = new THREE.MeshPhysicalMaterial({ color: 0xdfeef7, roughness: 0.1, transparent: true, opacity: 0.45, clearcoat: 1, depthWrite: false });
  M.liquid = new THREE.MeshPhysicalMaterial({ color: 0xffd36a, roughness: 0.1, transparent: true, opacity: 0.7 });
}
// polígono de esquinas redondeadas (para la cabeza del martillo)
function roundedPoly(P, r) {
  const s = new THREE.Shape(), n = P.length, pt = i => new THREE.Vector2(P[(i + n) % n][0], P[(i + n) % n][1]);
  for (let i = 0; i < n; i++) {
    const c = pt(i), a = pt(i - 1), b = pt(i + 1), p1 = c.clone().add(a.clone().sub(c).normalize().multiplyScalar(r)), p2 = c.clone().add(b.clone().sub(c).normalize().multiplyScalar(r));
    if (i === 0) s.moveTo(p1.x, p1.y); else s.lineTo(p1.x, p1.y); s.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
  }
  s.closePath(); return s;
}
// martillo de reflejos (tipo Taylor): cabeza triangular de goma con la punta hacia abajo y mango de acero cromado
function reflexHammer(s = 1) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(roundedPoly([[-0.27, 0.07], [0.27, 0.07], [0, -0.2]], 0.05), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.022, bevelSegments: 5, curveSegments: 18 });
  geo.translate(0, 0, -0.05); g.add(mesh(geo, M.rubber));
  const slot = mesh(new THREE.BoxGeometry(0.07, 0.035, 0.15), M.chrome); slot.position.y = 0.085; g.add(slot);
  const fer = cyl(0.026, 0.03, 0.07, M.chrome, 28); fer.position.y = 0.13; g.add(fer);
  const handle = cyl(0.015, 0.019, 0.82, M.chrome, 28); handle.position.y = 0.16 + 0.41; g.add(handle);
  for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.0185, 0.0028, 6, 22), M.dsteel); r.rotation.x = Math.PI / 2; r.position.y = 0.62 + i * 0.045; g.add(r); }
  const cap = sph(0.021, M.chrome, 20, 14); cap.position.y = 0.98; g.add(cap);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(s); return g;
}
// fonendo colgado del cuello (U por detrás) y fonendo suelto
function neckSteth(r = 0.05) {
  const g = new THREE.Group(), pts = [v3(r, -0.13, 0.035), v3(r * 1.05, -0.04, 0.012)];
  for (let i = 0; i <= 20; i++) { const a = Math.PI * (i / 20); pts.push(v3(Math.cos(a) * r, 0, -Math.sin(a) * r * 0.9)); }
  pts.push(v3(-r * 1.05, -0.04, 0.012), v3(-r * 0.95, -0.17, 0.045)); g.add(tube(pts, r * 0.085, M.tubing, 90, false, 10));
  const cp = cyl(r * 0.42, r * 0.42, r * 0.2, M.chrome, 28); cp.rotation.x = Math.PI / 2; cp.position.set(-r * 0.95, -0.19, 0.05); g.add(cp);
  const dia = cyl(r * 0.36, r * 0.36, r * 0.05, M.tubing, 28); dia.rotation.x = Math.PI / 2; dia.position.set(-r * 0.95, -0.19, 0.06); g.add(dia);
  for (const dz of [0, 0.02]) { const e = sph(r * 0.13, M.chrome, 12, 8); e.position.set(r * 1.0, -0.14 - dz, 0.04 + dz * 0.4); g.add(e); }
  return g;
}
function stethoscope(s = 1) {
  const g = new THREE.Group();
  const cp = grp(at(cyl(0.034, 0.034, 0.014, M.chrome, 32), 0, 0.007, 0), at(cyl(0.03, 0.03, 0.003, M.tubing, 32), 0, 0.0005, 0), at(cyl(0.008, 0.01, 0.03, M.chrome, 12), 0.03, 0.012, 0, 0, 0, Math.PI / 2));
  g.add(cp); g.userData.cp = cp;
  g.add(tube([v3(0.045, 0.012, 0), v3(0.13, 0.02, 0.05), v3(0.2, 0.012, 0.0), v3(0.24, 0.012, -0.08), v3(0.2, 0.012, -0.16), v3(0.12, 0.012, -0.17)], 0.0065, M.tubing, 60, false, 10));
  for (const sd of [-1, 1]) { g.add(tube([v3(0.12, 0.012, -0.17), v3(0.06, 0.012, -0.17 + sd * 0.04), v3(0.0, 0.012, -0.17 + sd * 0.07)], 0.0055, M.tubing, 20, false, 8));
    g.add(tube([v3(0.0, 0.012, -0.17 + sd * 0.07), v3(-0.07, 0.012, -0.17 + sd * 0.075), v3(-0.12, 0.012, -0.17 + sd * 0.05)], 0.0032, M.chrome, 20, false, 8));
    const e = sph(0.009, M.tubing, 12, 8); e.position.set(-0.125, 0.012, -0.17 + sd * 0.045); g.add(e); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(s); return g;
}
// bata blanca (en percha, para la vitrina), con solapas, botones y bolsillo con bolígrafos
function labCoat(h = 0.46) {
  const k = h / 0.32, g = new THREE.Group();
  g.add(lathe([[0, 0], [0.1 * k, 0], [0.102 * k, 0.01], [0.088 * k, h * 0.3], [0.078 * k, h * 0.6], [0.072 * k, h * 0.86], [0.05 * k, h * 0.95], [0.03 * k, h], [0, h]], 48, M.coat));
  for (const sd of [-1, 1]) {
    const sl = cyl(0.022 * k, 0.03 * k, h * 0.5, M.coat, 20); sl.position.set(sd * 0.088 * k, h * 0.6, 0.0); sl.rotation.z = sd * 0.16; g.add(sl);
    const lap = mesh(new THREE.BoxGeometry(0.028 * k, h * 0.3, 0.005 * k), M.coat); lap.position.set(sd * 0.027 * k, h * 0.77, 0.071 * k); lap.rotation.set(-0.12, 0, -sd * 0.36); g.add(lap);
  }
  const seam = mesh(new THREE.BoxGeometry(0.003 * k, h * 0.62, 0.003 * k), new THREE.MeshStandardMaterial({ color: 0xaab2bb, roughness: 0.8 })); seam.position.set(0, h * 0.33, 0.092 * k); g.add(seam);
  for (let i = 0; i < 3; i++) { const b = cyl(0.006 * k, 0.006 * k, 0.003 * k, M.ceramic, 12); b.rotation.x = Math.PI / 2; b.position.set(0.012 * k, h * (0.24 + i * 0.15), 0.09 * k); g.add(b); }
  const pk = mesh(new THREE.BoxGeometry(0.04 * k, 0.034 * k, 0.004 * k), M.coat); pk.position.set(-0.044 * k, h * 0.68, 0.079 * k); g.add(pk);
  for (const [x, c] of [[-0.054, 0x1b2a4a], [-0.044, 0xb3222b], [-0.036, 0x15171c]]) { const p = cyl(0.0028 * k, 0.0028 * k, 0.03 * k, plastic(c, 0.3), 8); p.position.set(x * k, h * 0.71, 0.081 * k); g.add(p); }
  const st = neckSteth(0.032 * k); st.position.set(0, h * 0.94, 0.0); g.add(st);
  const badge = plateText(0.05 * k, 0.016 * k, [['DR. · EJEMPLO', 0.62, 0.5]], { fg: '#1b2a4a', bg: '#f7f7f4' }); badge.position.set(0.045 * k, h * 0.66, 0.08 * k); g.add(badge);
  return g;
}
function skull(s = 1) {
  const g = new THREE.Group(), m = M.ivory;
  const cr = sph(0.1, m, 48, 32); cr.scale.set(0.88, 0.94, 1.1); cr.position.set(0, 0.135, -0.012); g.add(cr);
  const face = sph(0.075, m, 36, 24); face.scale.set(0.96, 0.86, 0.78); face.position.set(0, 0.078, 0.052); g.add(face);
  const brow = sph(0.05, m, 24, 16); brow.scale.set(1.6, 0.45, 0.6); brow.position.set(0, 0.123, 0.085); g.add(brow);
  for (const sd of [-1, 1]) { const e = sph(0.025, M.dark, 20, 14); e.scale.set(1.05, 0.88, 0.55); e.position.set(sd * 0.033, 0.1, 0.104); g.add(e);
    const ck = sph(0.022, m, 16, 12); ck.scale.set(1.35, 0.75, 1); ck.position.set(sd * 0.058, 0.072, 0.083); g.add(ck);
    const temple = sph(0.03, m, 16, 12); temple.scale.set(0.5, 1, 1.2); temple.position.set(sd * 0.075, 0.1, 0.03); g.add(temple); }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.03, 3), M.dark); nose.position.set(0, 0.07, 0.112); nose.rotation.x = Math.PI; nose.scale.set(1, 1, 0.45); g.add(nose);
  for (let i = 0; i < 10; i++) { const a = (i - 4.5) * 0.15; const t = mesh(new THREE.BoxGeometry(0.0085, 0.013, 0.007), M.ceramic); t.position.set(Math.sin(a) * 0.04, 0.038, 0.072 + Math.cos(a) * 0.033); t.rotation.y = a; g.add(t); }
  const jaw = new THREE.Group(), jp = []; for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + Math.PI * i / 16; jp.push(v3(Math.sin(a) * 0.048, -0.004 * Math.cos(a), Math.cos(a) * 0.05 + 0.055)); }
  jaw.add(tube(jp, 0.012, m, 40, false, 10)); for (const sd of [-1, 1]) jaw.add(tube([v3(sd * 0.048, 0, 0.055), v3(sd * 0.052, 0.04, 0.035), v3(sd * 0.055, 0.06, 0.02)], 0.011, m, 12, false, 8));
  for (let i = 0; i < 10; i++) { const a = (i - 4.5) * 0.15; const t = mesh(new THREE.BoxGeometry(0.0085, 0.011, 0.007), M.ceramic); t.position.set(Math.sin(a) * 0.04, 0.012, 0.072 + Math.cos(a) * 0.033 - 0.002); t.rotation.y = a; jaw.add(t); }
  jaw.position.y = 0.012; g.add(jaw); g.userData.jaw = jaw;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(s); return g;
}
function bone(s = 1) {
  const g = new THREE.Group(), m = M.ivory; g.add(cyl(0.015, 0.017, 0.34, m, 20));
  for (const sd of [-1, 1]) for (const dx of [-1, 1]) { const k = sph(0.025, m, 20, 14); k.position.set(dx * 0.016, sd * 0.172, 0); g.add(k); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// corazón anatómico (ventrículos, aurículas, aorta, arteria pulmonar, venas cavas y coronarias); late con body.scale
function heartModel(s = 1) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const lv = sph(0.07, M.heart, 40, 28); lv.scale.set(1, 1.22, 0.92); lv.position.set(0.022, 0.06, 0); body.add(lv);
  const rv = sph(0.064, M.heart, 40, 28); rv.scale.set(1, 1.08, 0.86); rv.position.set(-0.034, 0.074, 0.018); body.add(rv);
  const ap = sph(0.05, M.heart, 32, 20); ap.scale.set(0.9, 1.2, 0.85); ap.position.set(0.02, -0.01, 0.005); body.add(ap);
  const atria = sph(0.05, M.heart2, 28, 18); atria.scale.set(1.45, 0.72, 0.95); atria.position.set(-0.004, 0.142, -0.012); body.add(atria);
  body.add(tube([v3(0.012, 0.16, 0), v3(0.02, 0.235, 0.0), v3(-0.02, 0.285, -0.012), v3(-0.065, 0.255, -0.02), v3(-0.075, 0.18, -0.03)], 0.019, M.vesselR, 40, false, 14));
  for (const [x, z] of [[-0.012, -0.004], [0.004, -0.008], [0.02, -0.006]]) body.add(tube([v3(x, 0.27, z), v3(x * 1.4, 0.33, z)], 0.006, M.vesselR, 8, false, 8));
  body.add(tube([v3(-0.032, 0.15, 0.04), v3(-0.024, 0.215, 0.05), v3(0.02, 0.245, 0.04), v3(0.055, 0.235, 0.03)], 0.016, M.vesselB, 30, false, 12));
  body.add(tube([v3(0.06, 0.13, -0.035), v3(0.07, 0.21, -0.045), v3(0.068, 0.29, -0.05)], 0.0135, M.vesselB, 16, false, 10));
  body.add(tube([v3(-0.02, 0.14, 0.055), v3(-0.012, 0.1, 0.075), v3(0.008, 0.05, 0.07), v3(0.02, 0.0, 0.05)], 0.0042, M.vesselR, 30, false, 6));
  body.add(tube([v3(0.04, 0.13, 0.045), v3(0.06, 0.08, 0.05), v3(0.055, 0.02, 0.04)], 0.0038, M.vesselB, 20, false, 6));
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body; g.scale.setScalar(s); return g;
}
const beat = t => { const u = ((t * 1.2) % 1); return Math.exp(-Math.pow((u - 0.08) / 0.045, 2)) + 0.55 * Math.exp(-Math.pow((u - 0.26) / 0.05, 2)); };
// glucosa (bolas y varillas): anillo de seis con sus OH
function molecule(s = 1) {
  const g = new THREE.Group(), C = plastic(0x2a2d33, 0.22), O = plastic(0xd8352a, 0.22), Hm = plastic(0xf2f2f2, 0.28), Bd = M.silver, ring = [];
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, p = v3(Math.cos(a) * 0.09, Math.sin(a) * 0.09, i % 2 ? 0.02 : -0.02); ring.push(p); const o = sph(i === 0 ? 0.03 : 0.026, i === 0 ? O : C, 22, 16); o.position.copy(p); g.add(o); }
  for (let i = 0; i < 6; i++) g.add(bar(ring[i], ring[(i + 1) % 6], 0.008, Bd, 10));
  for (let i = 1; i < 6; i++) { const d = ring[i].clone().setZ(0).normalize(), op = ring[i].clone().addScaledVector(d, 0.07).add(v3(0, 0, i % 2 ? 0.045 : -0.045)), o = sph(0.022, O, 18, 12); o.position.copy(op); g.add(o); g.add(bar(ring[i], op, 0.0065, Bd, 8));
    const hp = op.clone().addScaledVector(d, 0.042), hh = sph(0.014, Hm, 14, 10); hh.position.copy(hp); g.add(hh); g.add(bar(op, hp, 0.005, Bd, 8)); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// microscopio clásico: base y brazo esmaltados, platina, revólver con tres objetivos, tubo inclinado con ocular, tornillos de enfoque
function microscope(s = 1) {
  const g = new THREE.Group(), en = M.enamel;
  const base = mesh(new THREE.BoxGeometry(0.16, 0.026, 0.2), en); base.position.set(0, 0.013, 0); g.add(base);
  g.add(tube([v3(0, 0.02, -0.07), v3(0, 0.12, -0.085), v3(0, 0.22, -0.07), v3(0, 0.29, -0.03)], 0.022, en, 30, false, 14));
  const stage = mesh(new THREE.BoxGeometry(0.13, 0.012, 0.12), en); stage.position.set(0, 0.13, 0.012); g.add(stage);
  for (const x of [-0.035, 0.035]) { const c = mesh(new THREE.BoxGeometry(0.008, 0.003, 0.06), M.chrome); c.position.set(x, 0.138, 0.02); g.add(c); }
  const slide = mesh(new THREE.BoxGeometry(0.075, 0.002, 0.026), M.dish); slide.position.set(0, 0.1375, 0.015); g.add(slide);
  const smp = cyl(0.008, 0.008, 0.001, plastic(0xc04a8a, 0.4), 16); smp.position.set(0, 0.139, 0.015); g.add(smp); g.userData.sample = smp;
  const lamp = cyl(0.016, 0.02, 0.012, M.chrome, 20); lamp.position.set(0, 0.032, 0.012); g.add(lamp);
  const lightG = sph(0.009, glowM(0xfff2d0, 2.5), 12, 8); lightG.position.set(0, 0.04, 0.012); g.add(lightG); g.userData.light = lightG;
  const head = new THREE.Group(); head.position.set(0, 0.25, 0.012); head.rotation.x = -0.45; g.add(head);
  head.add(at(cyl(0.022, 0.022, 0.15, en, 24), 0, 0.03, 0)); head.add(at(cyl(0.024, 0.024, 0.012, M.chrome, 24), 0, 0.1, 0)); head.add(at(cyl(0.016, 0.016, 0.06, M.tubing, 20), 0, 0.13, 0));
  const turret = cyl(0.035, 0.03, 0.02, M.chrome, 28); turret.position.set(0, 0.205, 0.012); g.add(turret);
  [-0.022, 0, 0.022].forEach((x, i) => { const o = cyl(0.007, 0.009, 0.045 - i * 0.006, M.chrome, 14); o.position.set(x, 0.18, 0.012 + (i === 1 ? 0.01 : 0)); g.add(o); });
  for (const sd of [-1, 1]) { const kn = cyl(0.026, 0.026, 0.016, en, 24); kn.rotation.z = Math.PI / 2; kn.position.set(sd * 0.03, 0.1, -0.08); g.add(kn); const kr = cyl(0.027, 0.027, 0.004, M.chrome, 24); kr.rotation.z = Math.PI / 2; kr.position.set(sd * 0.039, 0.1, -0.08); g.add(kr); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
function petri(s = 1) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.1, 0], [0.1, 0.022], [0.097, 0.022], [0.097, 0.003], [0, 0.003]], 48, M.dish));
  const agar = cyl(0.096, 0.096, 0.012, M.agar, 48); agar.position.y = 0.009; g.add(agar);
  const cols = []; for (let i = 0; i < 34; i++) { const r = Math.sqrt(hash(i * 3.1)) * 0.082, a = hash(i * 7.7) * 6.28, c = sph(0.004 + hash(i * 1.3) * 0.009, plastic([0xf4ead2, 0xe9cf6a, 0xf8f6f0, 0xd9d0b8][i % 4], 0.35), 14, 8); c.scale.y = 0.35; c.position.set(Math.cos(a) * r, 0.0155, Math.sin(a) * r); g.add(c); cols.push(c); }
  g.userData.cols = cols; g.scale.setScalar(s); return g;
}
function pillBottle(s = 1) {
  const g = new THREE.Group(); g.add(lathe([[0, 0], [0.044, 0], [0.047, 0.01], [0.047, 0.11], [0.04, 0.124], [0.03, 0.13], [0, 0.13]], 40, M.amber));
  const cap = cyl(0.034, 0.034, 0.032, plastic(0xf4f4f2, 0.45), 32); cap.position.y = 0.146; g.add(cap);
  const lt = canvasTex(512, 160, (c, w, h) => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#b3222b'; c.fillRect(0, 0, w, 26); c.fillStyle = '#1b2a4a'; c.font = '900 52px Inter'; c.textAlign = 'center'; c.fillText('Rx · 500 mg', w / 2, 88); c.font = '600 26px Inter'; c.fillText('1 COMPRIMIDO CADA 8 H · EJEMPLO', w / 2, 132); });
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0475, 0.0475, 0.06, 40, 1, true, -1.2, 2.4), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.7 })); lab.position.y = 0.06; g.add(lab);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
function blister(s = 1) {
  const g = new THREE.Group(), foil = mesh(new THREE.BoxGeometry(0.17, 0.004, 0.095), metal(0xc9ced6, 0.32)); g.add(foil);
  const pills = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { const x = -0.064 + c * 0.032, z = -0.022 + r * 0.044;
    const bub = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.dish); bub.scale.set(1, 0.7, 1.35); bub.position.set(x, 0.002, z); g.add(bub);
    const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.016, 6, 12), plastic(r ? 0xf6f3ee : 0xc8323a, 0.3)); p.rotation.x = Math.PI / 2; p.position.set(x, 0.008, z); g.add(p); pills.push(p); }
  g.userData.pills = pills; g.scale.setScalar(s); return g;
}
function syringe(s = 1) {
  const g = new THREE.Group(); g.add(at(cyl(0.012, 0.012, 0.14, M.dish, 24), 0, 0, 0, 0, 0, Math.PI / 2));
  const liq = cyl(0.0105, 0.0105, 0.08, M.liquid, 20); liq.rotation.z = Math.PI / 2; liq.position.x = 0.025; g.add(liq);
  g.add(at(cyl(0.004, 0.004, 0.1, plastic(0xf4f4f2, 0.4), 10), -0.09, 0, 0, 0, 0, Math.PI / 2)); g.add(at(cyl(0.016, 0.016, 0.004, plastic(0xf4f4f2, 0.4), 20), -0.14, 0, 0, 0, 0, Math.PI / 2));
  g.add(at(cyl(0.0012, 0.0012, 0.07, M.chrome, 6), 0.105, 0, 0, 0, 0, Math.PI / 2)); g.add(at(cyl(0.004, 0.003, 0.012, plastic(0x2b78c4, 0.3), 12), 0.074, 0, 0, 0, 0, Math.PI / 2));
  g.scale.setScalar(s); return g;
}
// monitor de constantes: la pantalla se redibuja con el electro en verde
function ecgMonitor(s = 1) {
  const g = new THREE.Group(), box = rbox(0.34, 0.24, 0.07, M.enamel, 0.02); box.position.y = 0.0; g.add(box);
  const scr = canvasPlane(0.3, 0.19, 512, () => {}, { r: 0.3 }); scr.position.set(0, 0.005, 0.0355); g.add(scr);
  scr.material.emissiveMap = scr.userData.tex; scr.material.emissive = new THREE.Color(0xffffff); scr.material.emissiveIntensity = 1.4;
  const stand = grp(at(cyl(0.012, 0.012, 0.16, M.chrome, 12), 0, -0.2, -0.01), at(cyl(0.07, 0.08, 0.012, M.enamel, 28), 0, -0.285, -0.01)); g.add(stand);
  g.userData.scr = scr; g.scale.setScalar(s); return g;
}
function drawEcg(scr, t, alarm = 0) {
  const T = scr.userData.tex, c = T.userData.g, w = T.userData.c.width, h = T.userData.c.height;
  c.fillStyle = '#04100c'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(80,255,170,.08)'; c.lineWidth = 1; for (let x = 0; x < w; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  const ecg = u => { const p = ((u % 1) + 1) % 1; return -Math.exp(-Math.pow((p - 0.3) / 0.012, 2)) * 1 + 0.25 * Math.exp(-Math.pow((p - 0.27) / 0.012, 2)) + 0.3 * Math.exp(-Math.pow((p - 0.33) / 0.012, 2)) - 0.12 * Math.exp(-Math.pow((p - 0.12) / 0.03, 2)) - 0.2 * Math.exp(-Math.pow((p - 0.55) / 0.05, 2)); };
  const head = (t * 0.55) % 1; c.lineWidth = 4; c.strokeStyle = alarm > 0.5 ? '#ff5247' : '#5dffa8'; c.shadowColor = c.strokeStyle; c.shadowBlur = 10; c.beginPath();
  for (let i = 0; i <= 200; i++) { const x = i / 200, u = x * 2.2 + Math.floor(t * 0.55) * 2.2, gap = ((x - head + 1) % 1) < 0.06; const y = h * 0.42 + ecg(u + (x > head ? -2.2 : 0)) * h * 0.26; if (gap) { c.moveTo(x * w, y); continue; } i ? c.lineTo(x * w, y) : c.moveTo(x * w, y); }
  c.stroke(); c.shadowBlur = 0; c.fillStyle = '#5dffa8'; c.font = '700 44px SpaceMono'; c.textAlign = 'right'; c.fillText(String(72 + Math.round(Math.sin(t) * 2)), w - 18, h - 22); c.font = '700 20px SpaceMono'; c.fillText('LPM', w - 18, h - 76);
  c.fillStyle = '#7fd0ff'; c.textAlign = 'left'; c.font = '700 34px SpaceMono'; c.fillText('SpO₂ 98', 16, h - 22);
  T.needsUpdate = true;
}
// ruido 3D sencillo (para las circunvoluciones del cerebro)
function n3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, H = (a, b, c) => hash(a * 157.31 + b * 311.73 + c * 74.17 + 0.3);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, k) => a + (b - a) * k;
  return l(l(l(H(xi, yi, zi), H(xi + 1, yi, zi), u), l(H(xi, yi + 1, zi), H(xi + 1, yi + 1, zi), u), v), l(l(H(xi, yi, zi + 1), H(xi + 1, yi, zi + 1), u), l(H(xi, yi + 1, zi + 1), H(xi + 1, yi + 1, zi + 1), u), v), w);
}
function brainModel(s = 1) {
  const g = new THREE.Group(), geo = new THREE.SphereGeometry(0.1, 128, 96), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize();
    const f = n3(n.x * 9 + 3, n.y * 9 + 7, n.z * 9 + 1) * 0.6 + n3(n.x * 18, n.y * 18, n.z * 18) * 0.4, ridge = 1 - Math.abs(2 * f - 1);
    let r = 0.1 * (1 + 0.05 * Math.pow(ridge, 3) - 0.025);
    r *= 1 - 0.13 * Math.exp(-Math.pow(n.x / 0.05, 2)) * (n.y > -0.35 ? 1 : 0);         // cisura entre los dos hemisferios
    r *= 1 - 0.06 * Math.exp(-Math.pow((n.y + 0.05 - n.z * 0.35) / 0.06, 2)) * (Math.abs(n.x) > 0.55 ? 1 : 0);   // cisura lateral
    v.copy(n).multiplyScalar(r); v.x *= 0.86; v.y *= 0.8; v.z *= 1.12; p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); g.add(mesh(geo, M.brain));
  const cb = sph(0.045, M.brain, 32, 24); cb.scale.set(1.45, 0.66, 0.85); cb.position.set(0, -0.058, -0.075); g.add(cb);
  const stem = cyl(0.018, 0.014, 0.08, M.brain, 16); stem.position.set(0, -0.085, -0.035); stem.rotation.x = 0.35; g.add(stem);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
function teddy(s = 1) {
  const g = new THREE.Group(), m = M.felt, dk = M.dark, add = (o, x, y, z, sx = 1, sy = 1, sz = 1) => { o.position.set(x, y, z); o.scale.set(sx, sy, sz); g.add(o); return o; };
  add(sph(0.05, m, 24, 18), 0, 0.055, 0, 1, 1.15, 0.9); add(sph(0.038, m, 24, 18), 0, 0.135, 0.005);
  for (const sd of [-1, 1]) { add(sph(0.014, m, 14, 10), sd * 0.028, 0.168, 0); add(sph(0.018, m, 14, 10), sd * 0.05, 0.075, 0.012, 1, 1.5, 1); add(sph(0.02, m, 14, 10), sd * 0.03, 0.012, 0.025, 1, 0.8, 1.3); add(sph(0.005, dk, 10, 8), sd * 0.013, 0.143, 0.035); }
  add(sph(0.016, M.ivory, 16, 12), 0, 0.125, 0.034, 1, 0.75, 0.8); add(sph(0.005, dk, 10, 8), 0, 0.131, 0.046);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// cama de hospital con paciente, gotero (bolsa y vía) y barandillas
function hospitalBed(s = 1) {
  const g = new THREE.Group(), ch = M.chrome;
  const frame = mesh(new THREE.BoxGeometry(0.36, 0.025, 0.72), M.enamel); frame.position.y = 0.13; g.add(frame);
  const mat = rbox(0.34, 0.06, 0.7, M.mattress, 0.02); mat.rotation.x = Math.PI / 2; mat.position.y = 0.17; g.add(mat);
  const pil = rbox(0.24, 0.04, 0.1, M.mattress, 0.018); pil.rotation.x = Math.PI / 2 - 0.25; pil.position.set(0, 0.215, -0.28); g.add(pil);
  const bl = mesh(new THREE.BoxGeometry(0.35, 0.03, 0.42), M.blanket); bl.position.set(0, 0.2, 0.12); g.add(bl);
  for (const z of [-0.36, 0.36]) { const hb = mesh(new THREE.BoxGeometry(0.38, z < 0 ? 0.22 : 0.14, 0.02), M.enamel); hb.position.set(0, 0.13 + (z < 0 ? 0.11 : 0.07), z); g.add(hb); }
  for (const x of [-0.17, 0.17]) for (const z of [-0.33, 0.33]) { const l = cyl(0.008, 0.008, 0.11, ch, 10); l.position.set(x, 0.065, z); g.add(l); const w = cyl(0.014, 0.014, 0.01, M.tubing, 14); w.rotation.z = Math.PI / 2; w.position.set(x, 0.014, z); g.add(w); }
  for (const x of [-0.185, 0.185]) { const r = mesh(new THREE.BoxGeometry(0.008, 0.05, 0.3), ch); r.position.set(x, 0.24, -0.1); g.add(r); }
  const pat = figurine(M.ceramic, 0.95); pat.rotation.x = -Math.PI / 2; pat.position.set(0, 0.205, 0.24); pat.userData.J.shL.rotation.z = -0.15; pat.userData.J.shR.rotation.z = 0.15; g.add(pat); g.userData.pat = pat;
  const pole = cyl(0.006, 0.006, 0.62, ch, 10); pole.position.set(0.24, 0.31, -0.26); g.add(pole); const pb = cyl(0.05, 0.05, 0.01, ch, 20); pb.position.set(0.24, 0.005, -0.26); g.add(pb);
  const hook = cyl(0.003, 0.003, 0.08, ch, 8); hook.rotation.z = Math.PI / 2; hook.position.set(0.24, 0.6, -0.26); g.add(hook);
  const bag = rbox(0.06, 0.09, 0.02, M.bag, 0.01); bag.position.set(0.24, 0.53, -0.26); g.add(bag); const liq = rbox(0.05, 0.06, 0.012, M.liquid, 0.008); liq.position.set(0.24, 0.515, -0.26); g.add(liq);
  g.add(tube([v3(0.24, 0.48, -0.26), v3(0.22, 0.34, -0.2), v3(0.12, 0.26, -0.05), v3(0.09, 0.22, 0.02)], 0.002, M.dish, 30, false, 6));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(s); return g;
}
// figurita con bata (médico/estudiante) o con pijama verde (residente/cirujano): el maniquí con el material de la ropa y fonendo/gorro
function medFig(kind = 'coat', s = 1) {
  const d = figurine(kind === 'scrubs' ? M.scrubs : kind === 'kid' ? plastic(0x5d8db4, 0.45) : M.coat, s), J = d.userData.J; J.head.material = M.skin;
  if (kind === 'coat') { const st = neckSteth(0.075); st.position.set(0, 0.0, 0.0); J.neck.add(st); }
  if (kind === 'scrubs') { const capm = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), M.scrubs); capm.position.set(0, 0.1, 0); capm.scale.set(1, 0.8, 1.05); J.neck.add(capm);
    const mask = mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0x8fc8e8, roughness: 0.8 })); mask.position.set(0, 0.06, 0.07); J.neck.add(mask); }
  return d;
}
// hoja de respuestas del MIR (200 preguntas, 4 opciones); k = cuántas van rellenas; una fallada en rojo
function drawSheet(g, w, h, k, wrong) {
  g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3222b'; g.fillRect(0, 0, w, 54); g.fillStyle = '#fff'; g.font = '900 34px Inter'; g.textAlign = 'left'; g.fillText('EXAMEN MIR · HOJA DE RESPUESTAS', 22, 38);
  g.fillStyle = '#2b2218'; g.font = '600 15px Inter'; g.fillText('200 PREGUNTAS + 10 DE RESERVA · 4 OPCIONES · EJEMPLO', 22, 78);
  const cols = 4, rows = 50, cw = (w - 40) / cols, rh = (h - 110) / rows, n = Math.floor(200 * k);
  for (let q = 0; q < 200; q++) { const c = Math.floor(q / rows), r = q % rows, x0 = 20 + c * cw, y = 100 + r * rh + rh / 2;
    g.fillStyle = 'rgba(40,36,30,.7)'; g.font = '700 9px Inter'; g.textAlign = 'right'; g.fillText(String(q + 1), x0 + 24, y + 3);
    const pick = Math.floor(hash(q * 5.3) * 4);
    for (let o = 0; o < 4; o++) { const x = x0 + 36 + o * 26; g.strokeStyle = 'rgba(40,36,30,.55)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, 8, 3.6, 0, 0, 7); g.stroke();
      if (q < n && o === pick) { g.fillStyle = q === wrong && k > 0.99 ? '#d42a2a' : '#13235c'; g.beginPath(); g.ellipse(x, y, 7, 3, 0, 0, 7); g.fill(); } } }
}
// reloj de pared: las agujas giran (4 h 30 min = 4,5 vueltas del minutero)
function wallClock(s = 1) {
  const g = new THREE.Group(); const rim = cyl(0.16, 0.16, 0.03, M.enamel, 48); rim.rotation.x = Math.PI / 2; g.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.145, 48), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#f6f4ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b1d22'; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r1 = i % 5 ? 112 : 100; c.save(); c.translate(128, 128); c.rotate(a); c.fillRect(-(i % 5 ? 1 : 3), -122, i % 5 ? 2 : 6, 122 - r1); c.restore(); } c.font = '800 26px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(String(i), 128 + Math.sin(a) * 82, 128 - Math.cos(a) * 82); } }), roughness: 0.6 }));
  face.position.z = 0.016; g.add(face);
  const hh = mesh(new THREE.BoxGeometry(0.012, 0.08, 0.004), M.dark), mm = mesh(new THREE.BoxGeometry(0.008, 0.115, 0.004), M.dark), ss = mesh(new THREE.BoxGeometry(0.003, 0.12, 0.003), plastic(0xd42a2a, 0.3));
  for (const [hand, z] of [[hh, 0.019], [mm, 0.022], [ss, 0.025]]) { hand.geometry.translate(0, hand.geometry.parameters.height / 2 - 0.012, 0); hand.position.z = z; g.add(hand); }
  const pin = cyl(0.008, 0.008, 0.01, M.chrome, 12); pin.rotation.x = Math.PI / 2; pin.position.z = 0.027; g.add(pin);
  g.userData = { hh, mm, ss }; g.scale.setScalar(s); return g;
}
function setClock(c, hours) { const U = c.userData; U.hh.rotation.z = -hours / 12 * Math.PI * 2; U.mm.rotation.z = -(hours % 1) * Math.PI * 2; U.ss.rotation.z = -(hours * 60 % 1) * Math.PI * 2; }
// quirófano en miniatura: mesa de operaciones, lámpara cenital con focos y bandeja de instrumental
function surgery(s = 1) {
  const g = new THREE.Group(), ch = M.chrome;
  const col = cyl(0.04, 0.05, 0.2, M.enamel, 24); col.position.y = 0.1; g.add(col); const base = mesh(new THREE.BoxGeometry(0.22, 0.02, 0.3), M.enamel); base.position.y = 0.01; g.add(base);
  const top = rbox(0.2, 0.62, 0.04, plastic(0x2a3a4a, 0.4), 0.015); top.rotation.x = Math.PI / 2; top.position.y = 0.22; g.add(top);
  const sheet = mesh(new THREE.BoxGeometry(0.22, 0.012, 0.4), M.scrubs); sheet.position.set(0, 0.245, 0.06); g.add(sheet);
  const pat = figurine(M.ceramic, 0.85); pat.rotation.x = -Math.PI / 2; pat.position.set(0, 0.25, 0.2); g.add(pat);
  const arm = tube([v3(0.3, 0.0, -0.3), v3(0.3, 0.75, -0.3), v3(0.18, 0.8, -0.15), v3(0.05, 0.72, 0.0)], 0.012, ch, 30, false, 10); g.add(arm);
  const lamp = new THREE.Group(); lamp.position.set(0.0, 0.66, 0.02); lamp.rotation.x = 0.15; g.add(lamp);
  lamp.add(at(cyl(0.16, 0.13, 0.05, plastic(0xe9edf0, 0.35), 40), 0, 0, 0)); const leds = [];
  for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI * 2, r = i ? 0.085 : 0, l = cyl(0.03, 0.03, 0.004, glowM(0xfff6e8, 4), 20); l.position.set(Math.cos(a) * r, -0.027, Math.sin(a) * r); lamp.add(l); leds.push(l); }
  g.userData.leds = leds; g.userData.lamp = lamp;
  const tray = mesh(new THREE.BoxGeometry(0.16, 0.012, 0.1), ch); tray.position.set(-0.24, 0.2, 0.05); g.add(tray); const tl = cyl(0.006, 0.006, 0.2, ch, 8); tl.position.set(-0.24, 0.1, 0.05); g.add(tl);
  for (let i = 0; i < 4; i++) { const ins = mesh(new THREE.BoxGeometry(0.004, 0.003, 0.08), ch); ins.position.set(-0.29 + i * 0.03, 0.208, 0.05); g.add(ins); }
  g.add(at(cyl(0.12, 0.12, 0.002, glowM(0xfff2d6, 0.0), 40), 0, 0.252, 0.05));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(s); return g;
}
// consulta: mesa con ordenador, silla, fonendo y receta
function consult(s = 1) {
  const g = new THREE.Group();
  const desk = mesh(new THREE.BoxGeometry(0.5, 0.025, 0.28), M.woodL); desk.position.y = 0.2; g.add(desk);
  for (const x of [-0.23, 0.23]) { const l = mesh(new THREE.BoxGeometry(0.02, 0.2, 0.26), M.woodL); l.position.set(x, 0.1, 0); g.add(l); }
  const scr = rbox(0.2, 0.13, 0.012, M.enamel, 0.006); scr.position.set(0.05, 0.3, -0.07); g.add(scr);
  const disp = canvasPlane(0.185, 0.115, 256, (c, w, h) => { c.fillStyle = '#e9f2f8'; c.fillRect(0, 0, w, h); c.fillStyle = '#2b78c4'; c.fillRect(0, 0, w, 22); c.fillStyle = '#1b2a4a'; c.font = '800 14px Inter'; c.fillText('HISTORIA CLÍNICA · EJEMPLO', 8, 50); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(27,42,74,.35)'; c.fillRect(8, 64 + i * 12, 150 - (i % 3) * 30, 5); } }, { r: 0.4 });
  disp.position.set(0.05, 0.3, -0.0635); disp.material.emissiveMap = disp.userData.tex; disp.material.emissive = new THREE.Color(0xffffff); disp.material.emissiveIntensity = 0.8; g.add(disp);
  const st = cyl(0.008, 0.008, 0.07, M.enamel, 10); st.position.set(0.05, 0.245, -0.07); g.add(st);
  const kb = mesh(new THREE.BoxGeometry(0.14, 0.006, 0.045), M.enamel); kb.position.set(0.05, 0.216, 0.04); g.add(kb);
  const ch2 = chair(0.22); ch2.position.set(0.05, 0.0, 0.24); ch2.rotation.y = Math.PI; g.add(ch2); const ch3 = chair(0.16); ch3.scale.setScalar(0.9); ch3.position.set(-0.12, 0, -0.26); g.add(ch3);
  const stt = stethoscope(0.45); stt.position.set(-0.15, 0.214, 0.04); stt.rotation.y = 0.6; g.add(stt);
  const rx = canvasPlane(0.07, 0.1, 128, (c, w, h) => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b2a4a'; c.font = '900 24px Inter'; c.fillText('Rx', 10, 30); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(27,42,74,.4)'; c.fillRect(10, 44 + i * 12, 90 - (i % 2) * 30, 4); } }); rx.rotation.x = -Math.PI / 2; rx.position.set(-0.04, 0.2135, 0.05); rx.rotation.z = 0.2; g.add(rx);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(s); return g;
}
// negatoscopio con una radiografía de tórax (la sombra que «falla» se marca en rojo)
function lightbox(s = 1) {
  const g = new THREE.Group(), box = mesh(new THREE.BoxGeometry(0.5, 0.38, 0.04), M.enamel); box.position.y = 0.19; g.add(box);
  const xr = canvasTex(512, 400, (c, w, h) => { c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h);
    const gl = (x, y, rx, ry, a) => { const r = c.createRadialGradient(x, y, 2, x, y, Math.max(rx, ry)); r.addColorStop(0, `rgba(210,220,230,${a})`); r.addColorStop(1, 'rgba(210,220,230,0)'); c.fillStyle = r; c.save(); c.translate(x, y); c.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); c.translate(-x, -y); c.beginPath(); c.arc(x, y, Math.max(rx, ry), 0, 7); c.fill(); c.restore(); };
    gl(w / 2, h * 0.55, 230, 200, 0.18); c.strokeStyle = 'rgba(225,232,240,.75)'; c.lineWidth = 7; c.beginPath(); c.moveTo(w / 2, 20); c.lineTo(w / 2, h - 10); c.stroke();
    for (let i = 0; i < 9; i++) for (const sd of [-1, 1]) { c.strokeStyle = `rgba(220,228,236,${0.5 - i * 0.03})`; c.lineWidth = 5; c.beginPath(); const y = 70 + i * 32; c.moveTo(w / 2 + sd * 10, y); c.quadraticCurveTo(w / 2 + sd * 190, y - 30, w / 2 + sd * 170, y + 60); c.stroke(); }
    gl(w / 2 + 30, h * 0.66, 70, 60, 0.55); gl(w / 2 - 95, h * 0.42, 20, 20, 0.85);
    c.strokeStyle = 'rgba(220,228,236,.6)'; c.lineWidth = 9; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + sd * 30, 40); c.quadraticCurveTo(w / 2 + sd * 120, 30, w / 2 + sd * 200, 60); c.stroke(); } });
  const film = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33), new THREE.MeshStandardMaterial({ map: xr, emissiveMap: xr, emissive: 0xffffff, emissiveIntensity: 1.25, roughness: 0.5 })); film.position.set(0, 0.19, 0.021); g.add(film);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.034, 0.042, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.25, 0.22).multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0, depthWrite: false })); ring.position.set(-0.0815, 0.19 + 0.33 * (0.5 - 0.42), 0.024); g.add(ring);
  const stand = grp(at(cyl(0.01, 0.01, 0.12, M.chrome, 10), 0, -0.06, -0.01), at(cyl(0.08, 0.09, 0.012, M.enamel, 28), 0, -0.12, -0.01)); g.add(stand);
  g.userData = { ring, film }; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g;
}
// figuritas con bata para miles de instancias: cuerpo (bata acampanada) y cabeza aparte (otro color)
function coatGeo(lo = false) {
  const body = new THREE.CylinderGeometry(lo ? 0.008 : 0.0085, lo ? 0.0155 : 0.016, 0.036, lo ? 6 : 16); body.translate(0, 0.018, 0);
  const sh = new THREE.SphereGeometry(lo ? 0.0105 : 0.011, lo ? 6 : 16, lo ? 4 : 8, 0, Math.PI * 2, 0, Math.PI / 2); sh.translate(0, 0.035, 0);
  const parts = [body, sh].map(g => g.index ? g.toNonIndexed() : g); parts.forEach(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); });
  return mergeGeometries(parts);
}
function headGeo(lo = false) { const h = new THREE.SphereGeometry(lo ? 0.0075 : 0.008, lo ? 6 : 16, lo ? 4 : 12); h.translate(0, 0.053, 0); return h; }
