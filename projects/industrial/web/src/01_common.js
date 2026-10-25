
// ---------------------------------------------------------------- utilidades de cámara y animación
// cámara por fotogramas clave: [[t, [x,y,z] posición, [x,y,z] mira, fov?], …]. Interpolación cúbica monótona
// (Fritsch–Carlson) con los tiempos reales: suave y sin pasarse nunca de largo.
function mono(t, T, Y) {
  const n = T.length; if (t <= T[0]) return Y[0]; if (t >= T[n - 1]) return Y[n - 1];
  let i = 0; while (t > T[i + 1]) i++;
  const d = k => (Y[k + 1] - Y[k]) / (T[k + 1] - T[k]), hh = k => T[k + 1] - T[k];
  const m = k => { if (k <= 0 || k >= n - 1) return 0; const a = d(k - 1), b = d(k); if (a * b <= 0) return 0; const h0 = hh(k - 1), h1 = hh(k); return 3 * (h0 + h1) / ((2 * h1 + h0) / a + (h1 + 2 * h0) / b); };
  const h = hh(i), u = (t - T[i]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * Y[i] + (u3 - 2 * u2 + u) * h * m(i) + (-2 * u3 + 3 * u2) * Y[i + 1] + (u3 - u2) * h * m(i + 1);
}
function camKeys(t, KS, o = null) {        // o: grupo en cuyas coordenadas están las claves (null = mundo)
  const T = KS.map(k => k[0]), comp = (j, c) => mono(t, T, KS.map(k => k[j][c]));
  const p = v3(comp(1, 0), comp(1, 1), comp(1, 2)), l = v3(comp(2, 0), comp(2, 1), comp(2, 2));
  if (o) { o.updateMatrixWorld(); p.applyMatrix4(o.matrixWorld); l.applyMatrix4(o.matrixWorld); }
  return { p, l, f: mono(t, T, KS.map(k => k[3] || 34)) };
}
const keyed = (t, KS) => mono(t, KS.map(k => k[0]), KS.map(k => k[1]));     // valor escalar por claves
const sm5 = x => x * x * x * (x * (x * 6 - 15) + 10);
const pop = (t, t0, d = 0.35) => { const u = clamp((t - t0) / d); if (u <= 0) return 0; if (u >= 1) return 1; return 1 + Math.sin(u * Math.PI * 1.15) * (1 - u) * 0.55 + (eo(u) - 1); }   // aparece con rebote
const pops = (t, t0, d = 0.35) => Math.max(0.0001, pop(t, t0, d));
function sparks(Z, n = 80, color = 0xffe08a, size = 0.045) { const p = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)), new THREE.PointsMaterial({ color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: starTex0() })); Z.add(p); p.userData.n = n; p.frustumCulled = false; return p; }
function burst(p, c, t, t0, spread = 1, life = 0.6, loop = true, grav = 3) {
  const a = p.geometry.attributes.position.array, n = p.userData.n;
  for (let i = 0; i < n; i++) { let tt = (t - t0) + hash(i) * life * (loop ? 1 : 0.15); tt = loop ? tt % life : Math.max(0, tt); const th = hash(i * 3) * Math.PI * 2, ph = (hash(i * 7) - 0.3) * 1.6, v = (1.2 + hash(i * 11) * 2.2) * spread;
    a[i * 3] = c.x + Math.cos(th) * Math.cos(ph) * v * tt; a[i * 3 + 1] = c.y + Math.sin(ph) * v * tt - grav * tt * tt; a[i * 3 + 2] = c.z + Math.sin(th) * Math.cos(ph) * v * tt; }
  p.geometry.attributes.position.needsUpdate = true;
}
function lookLab(l, k, pos) { l.visible = k > 0.01; l.material.opacity = Math.min(1, k); if (pos) l.position.copy(pos); l.quaternion.copy(cam.quaternion); if (l.parent) { const q = new THREE.Quaternion(); l.parent.getWorldQuaternion(q); l.quaternion.premultiply(q.invert()); } }
function pill(txt, color = '#ffffff', bg = 'rgba(16,20,30,.88)', w = 1.4, size = 70) { return label(txt, { size, w, pill: true, color, bg }); }
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();
let _starT = null;
function starTex0() { return _starT || (_starT = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); })); }
const discTex = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 62); r.addColorStop(0, 'rgba(255,255,255,.55)'); r.addColorStop(0.75, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); });
const setOp = (g, a) => g.traverse(o => { if (o.material && !o.userData.keepOp) { o.material.transparent = a < 0.999; o.material.opacity = a; o.material.depthWrite = a > 0.5; } });
const show = (o, k) => { o.visible = k > 0.002; if (o.visible) o.scale.setScalar(Math.max(0.0001, k) * (o.userData.s0 || 1)); };

// ---------------------------------------------------------------- paleta y materiales
const PL = { yellow: 0xf2b415, orange: 0xff6a2b, red: 0xff3b4e, blue: 0x3d8bff, sky: 0x46b4ff, green: 0x19d98a, teal: 0x22c0b0, violet: 0x8a5cff, pink: 0xff6fb5, white: 0xf3f5f9, navy: 0x1b2a4a, dark: 0x1a1d24, steel: 0xc9ced6 };
const MAT = {};
function mats() {
  for (const k in PL) MAT[k] = plastic(PL[k], 0.2);
  MAT.steel = metal(0xd2d7df, 0.22); MAT.dsteel = metal(0x7c8592, 0.35); MAT.gold = metal(0xffc861, 0.2); MAT.copper = metal(0xe08a52, 0.25);
  MAT.rubber = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.7 });
  MAT.glass = new THREE.MeshPhysicalMaterial({ color: 0x6f8fb0, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.13, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.35 });
}

// ---------------------------------------------------------------- piezas comunes
function bar(a, b, r, m, seg = 8) { const d = b.clone().sub(a), L = d.length(); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), m); c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); c.castShadow = true; return c; }
function tube(pts, r, m, seg, closed = false) { const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), seg || pts.length * 6, r, 10, closed), m); t.castShadow = true; return t; }
function cyl(rt, rb, h, m, seg = 32) { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); c.castShadow = true; c.receiveShadow = true; return c; }
function sph(r, m, ws = 24, hs = 16) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m); s.castShadow = true; return s; }
function gearGeo(teeth, r, depth, hole = 0.25) {
  const s = new THREE.Shape(), h = r * 0.16, n = teeth * 4;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, k = i % 4, rr2 = k === 1 || k === 2 ? r + h : r; const x = Math.cos(a) * rr2, y = Math.sin(a) * rr2; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const p = new THREE.Path(); p.absarc(0, 0, r * hole, 0, Math.PI * 2, true); s.holes.push(p);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: r * 0.02, bevelThickness: r * 0.02, bevelSegments: 2, curveSegments: 6 }); g.translate(0, 0, -depth / 2); return g;
}
function gear(teeth, r, depth, m) { const g = new THREE.Mesh(gearGeo(teeth, r, depth), m); g.castShadow = true; return g; }
function arrow(len, m, r = 0.05) {         // flecha gruesa a lo largo de +y
  const g = new THREE.Group();
  const sh = cyl(r, r, len - r * 4, m, 16); sh.position.y = (len - r * 4) / 2; g.add(sh);
  const hd = new THREE.Mesh(new THREE.ConeGeometry(r * 2.4, r * 4.5, 20), m); hd.position.y = len - r * 2.2; hd.castShadow = true; g.add(hd); return g;
}
function cota(len, txt, color = '#ffffff', lw = 0.45) {    // línea de cota con flechas y medida
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false });
  const ln = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, 0.012), m); g.add(ln);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 10), m); c.position.x = -s * (len / 2 - 0.04); c.rotation.z = s > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(c);
    const tk = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.012), m); tk.position.x = s * len / 2; g.add(tk); }
  if (txt) { const l = label(txt, { size: 60, w: lw, color }); l.position.y = 0.1; g.add(l); g.userData.l = l; }
  g.userData.m = m; return g;
}
// rótulo de neón: placa oscura + letras que brillan (on 0..1)
function neon(txt, color = '#7fe6ff', w = 2.4) {
  const g = new THREE.Group();
  const l = label(txt, { size: 110, w, color: '#ffffff', weight: 900 }); l.layers.set(0); g.add(l);
  const glow = label(txt, { size: 110, w: w * 1.02, color, weight: 900 }); glow.layers.set(0); glow.position.z = -0.01; glow.scale.set(1.04, 1.25, 1); g.add(glow);
  const plate = rbox(w * 1.08, w * 0.24, 0.06, new THREE.MeshStandardMaterial({ color: 0x0c0f16, roughness: 0.4, metalness: 0.3 }), 0.03); plate.position.z = -0.05; g.add(plate);
  g.userData = { l, glow, col: new THREE.Color(color) };
  return g;
}
function neonOn(n, k, t = 0) {     // k: 0 apagado, 1 encendido (con parpadeo de arranque)
  const fl = k > 0 && k < 1 ? (Math.sin(t * 90) > 0.2 ? 1 : 0.35) : 1, e = (0.18 + 2.6 * k) * fl;
  n.userData.l.material.color.setRGB(0.25 + e * 0.75, 0.25 + e * 0.75, 0.25 + e * 0.75);
  n.userData.glow.material.color.copy(n.userData.col).multiplyScalar(0.12 + 1.6 * k * fl); n.userData.glow.material.opacity = 0.25 + 0.75 * k;
}
// textura de icono dibujado en lienzo (para caras de bloques, pantallas, etiquetas)
function iconTex(draw, w = 512, h = 512, bg = null) { return canvasTex(w, h, (g, W2, H2) => { if (bg) { g.fillStyle = bg; rr(g, 8, 8, W2 - 16, H2 - 16, 48); g.fill(); } draw(g, W2, H2); }); }
function facePlane(tex, w, h) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.35, metalness: 0 })); return m; }

// ---------------------------------------------------------------- maniquí articulado (plástico brillante)
function makeDoll(m) {
  const d = new THREE.Group(), J = {};
  const cap = (r, h) => new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 6, 14), m);
  const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  J.hip = pivot(d, 0, 0.5, 0);
  const pel = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), m); pel.scale.set(1.3, 0.8, 0.9); J.hip.add(pel);
  J.chest = pivot(J.hip, 0, 0.05, 0); const tor = cap(0.085, 0.22); tor.position.y = 0.17; tor.scale.set(1.25, 1, 0.8); J.chest.add(tor);
  J.neck = pivot(J.chest, 0, 0.36, 0); const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 18), m); head.scale.set(0.9, 1.1, 0.95); head.position.y = 0.08; J.neck.add(head); J.head = head;
  for (const sd of [-1, 1]) {
    const sh = pivot(J.chest, sd * 0.13, 0.31, 0); const ua = cap(0.032, 0.14); ua.position.y = -0.09; sh.add(ua);
    const el = pivot(sh, 0, -0.19, 0); const la = cap(0.028, 0.13); la.position.y = -0.085; el.add(la);
    const hand = pivot(el, 0, -0.19, 0); const hm = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), m); hand.add(hm);
    const hp = pivot(J.hip, sd * 0.07, -0.03, 0); const ul = cap(0.042, 0.18); ul.position.y = -0.12; hp.add(ul);
    const kn = pivot(hp, 0, -0.25, 0); const ll = cap(0.036, 0.17); ll.position.y = -0.11; kn.add(ll);
    J[sd < 0 ? 'shL' : 'shR'] = sh; J[sd < 0 ? 'elL' : 'elR'] = el; J[sd < 0 ? 'hL' : 'hR'] = hand; J[sd < 0 ? 'hpL' : 'hpR'] = hp; J[sd < 0 ? 'knL' : 'knR'] = kn;
  }
  d.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  d.userData.J = J; return d;
}
// casco de obra amarillo (radio de la cúpula 0,5)
function hardHat(col = PL.yellow) {
  const g = new THREE.Group(), m = plastic(col, 0.16);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1, 0.86, 1.12); g.add(dome);
  const ridge = rbox(0.13, 0.07, 1.0, m, 0.035); ridge.position.y = 0.435; g.add(ridge);
  for (const s of [-1, 1]) { const r2 = rbox(0.07, 0.06, 0.86, m, 0.03); r2.position.set(s * 0.2, 0.395, 0); r2.rotation.z = -s * 0.42; g.add(r2); }
  // ala: anillo (abierto por dentro, para poder ver el interior oscuro del casco)
  const bp = [[0.47, -0.012], [0.63, -0.022], [0.645, 0.0], [0.63, 0.022], [0.49, 0.03], [0.47, 0.01]].map(([x, y]) => new THREE.Vector2(x, y)); bp.push(bp[0].clone());
  const brim = new THREE.Mesh(new THREE.LatheGeometry(bp, 72), m); brim.scale.set(1, 1, 1.18); brim.position.set(0, 0.0, 0.06); brim.castShadow = true; g.add(brim);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.49, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 0.9, side: THREE.DoubleSide })); inner.scale.set(1, 0.76, 1.11); g.add(inner);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 8, 48), new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.6 })); band.rotation.x = Math.PI / 2; band.position.y = 0.06; band.scale.set(1, 1.1, 1); g.add(band);
  // pegatina delantera (vacía hasta la respuesta)
  const st = facePlane(canvasTex(512, 160, (q, w, h) => { q.fillStyle = '#10131a'; rr(q, 6, 6, w - 12, h - 12, 40); q.fill(); q.fillStyle = '#ffffff'; q.font = '900 92px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('MÁSTER', w / 2, h / 2 + 4); }), 0.42, 0.13);
  st.position.set(0, 0.2, 0.52); st.rotation.x = -0.32; st.visible = false; g.add(st);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData = { m, sticker: st, inner }; return g;
}
// birrete de graduación (tablero 1 × 1)
function birrete() {
  const g = new THREE.Group(), m = plastic(0x14161c, 0.25), gold = plastic(0xffc21a, 0.2);
  const board = rbox(1, 0.06, 1, m, 0.02); board.position.y = 0.3; g.add(board);
  const capb = cyl(0.36, 0.4, 0.3, m, 40); capb.position.y = 0.14; g.add(capb);
  const btn = cyl(0.05, 0.05, 0.03, gold, 16); btn.position.y = 0.345; g.add(btn);
  const cord = tube([v3(0, 0.345, 0), v3(0.25, 0.345, 0.25), v3(0.46, 0.34, 0.46)], 0.012, gold, 12); g.add(cord);
  const hang = tube([v3(0.46, 0.34, 0.46), v3(0.5, 0.15, 0.5), v3(0.52, -0.05, 0.5)], 0.012, gold, 12); g.add(hang);
  const tas = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 12), gold); tas.position.set(0.52, -0.1, 0.5); g.add(tas);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
function diploma() {
  const g = new THREE.Group(); const p = cyl(0.045, 0.045, 0.36, plastic(0xfaf3e0, 0.4), 24); p.rotation.z = Math.PI / 2; g.add(p);
  const rib = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.012, 8, 24), plastic(PL.red, 0.25)); rib.rotation.y = Math.PI / 2; g.add(rib); return g;
}
// interrogación 3D (tubo + punto), alto ≈ 0,6
function qmark(m) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 18; i++) { const a = lerp(Math.PI * 0.92, -Math.PI * 0.42, i / 18); pts.push(v3(Math.cos(a) * 0.15, 0.2 + Math.sin(a) * 0.15, 0)); }
  pts.push(v3(0.02, -0.02, 0), v3(0, -0.08, 0)); g.add(tube(pts, 0.042, m, 60));
  const dot = sph(0.05, m); dot.position.y = -0.21; g.add(dot); return g;
}
// robot industrial de 6 ejes (naranja): J.base(gira y), J.sh (hombro, gira z), J.el (codo), J.wr (muñeca), J.tool
function robotArm(col = PL.orange, s = 1) {
  const g = new THREE.Group(), m = plastic(col, 0.22), dk = plastic(0x22252c, 0.35), J = {};
  const base = cyl(0.32, 0.38, 0.18, dk, 40); base.position.y = 0.09; g.add(base);
  J.base = new THREE.Group(); J.base.position.y = 0.18; g.add(J.base);
  const turret = cyl(0.24, 0.28, 0.26, m, 40); turret.position.y = 0.13; J.base.add(turret);
  J.sh = new THREE.Group(); J.sh.position.y = 0.32; J.base.add(J.sh);
  const shj = cyl(0.13, 0.13, 0.34, dk, 32); shj.rotation.x = Math.PI / 2; J.sh.add(shj);
  const up = rbox(0.18, 0.95, 0.2, m, 0.07); up.position.y = 0.47; J.sh.add(up);
  J.el = new THREE.Group(); J.el.position.y = 0.95; J.sh.add(J.el);
  const elj = cyl(0.11, 0.11, 0.3, dk, 32); elj.rotation.x = Math.PI / 2; J.el.add(elj);
  const fo = rbox(0.15, 0.75, 0.16, m, 0.06); fo.position.y = 0.37; J.el.add(fo);
  J.wr = new THREE.Group(); J.wr.position.y = 0.76; J.el.add(J.wr);
  const wrj = cyl(0.075, 0.075, 0.2, dk, 24); wrj.rotation.x = Math.PI / 2; J.wr.add(wrj);
  J.tool = new THREE.Group(); J.tool.position.y = 0.08; J.wr.add(J.tool);
  const fl = cyl(0.07, 0.07, 0.08, MAT.steel, 24); fl.position.y = 0.04; J.tool.add(fl);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(s); g.userData.J = J; return g;
}
function pose(arm, b, s, e, w) { const J = arm.userData.J; J.base.rotation.y = b; J.sh.rotation.z = s; J.el.rotation.z = e; J.wr.rotation.z = w; }
// pinza de dos dedos para el robot
function gripper() { const g = new THREE.Group(), m = MAT.dsteel; const pal = rbox(0.2, 0.05, 0.1, m, 0.02); pal.position.y = 0.11; g.add(pal);
  const f = [-1, 1].map(s => { const fi = rbox(0.035, 0.16, 0.08, m, 0.015); fi.position.set(s * 0.08, 0.2, 0); g.add(fi); return fi; }); g.userData.f = f; return g; }
function grip(gr, k) { gr.userData.f.forEach((f, i) => { f.position.x = (i ? 1 : -1) * lerp(0.085, 0.045, k); }); }
// coche (silueta de deportivo, sin logotipos) — de Eléctrica
function carModel(color = 0x1f6bff) {
  const g = new THREE.Group(), P = {}, L = 0.45, HW = (1.66 / 2 + 0.14) * L;
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.03 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.5, metalness: 0.2 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1220, roughness: 0.03, metalness: 0.4, clearcoat: 1 });
  const side = (pts, depth, mat, bevel = 0.08) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x * L, y * L) : s.moveTo(x * L, y * L)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: depth * L, bevelEnabled: true, bevelSize: bevel * L, bevelThickness: bevel * L, bevelSegments: 5, curveSegments: 12 }); geo.translate(0, 0, -depth * L / 2); const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
  P.body = side([[2.2, 0.3], [2.22, 0.46], [2.0, 0.55], [1.0, 0.72], [0.4, 0.8], [-0.9, 0.82], [-1.7, 0.86], [-2.2, 0.88], [-2.25, 0.6], [-2.15, 0.3], [-1.75, 0.22], [1.8, 0.22]], 1.66, paint, 0.14); g.add(P.body);
  P.cabin = side([[1.05, 0.72], [0.25, 1.12], [-0.55, 1.13], [-1.55, 0.88], [-1.0, 0.8], [0.4, 0.78]], 1.22, glass, 0.08); g.add(P.cabin);
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.55 * L, 0.06 * L, 0.32 * L), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 1.6 })); hl.position.set(1.95 * L, 0.56 * L, s * 0.55 * L); hl.rotation.set(0, s * 0.35, -0.25); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06 * L, 0.08 * L, 0.6 * L), new THREE.MeshStandardMaterial({ color: 0xff2030, emissive: 0xff2030, emissiveIntensity: 1.2 })); tl.position.set(-2.27 * L, 0.78 * L, s * 0.45 * L); g.add(tl);
    const arch = (x) => { const a = new THREE.Mesh(new THREE.CircleGeometry(0.47 * L, 40), dark); a.position.set(x * L, 0.38 * L, s * (HW + 0.004)); a.rotation.y = s > 0 ? 0 : Math.PI; g.add(a); };
    arch(1.38); arch(-1.4);
  }
  P.wheels = [];
  for (const [x, z] of [[1.38, 1], [-1.4, 1], [1.38, -1], [-1.4, -1]]) {
    const w = new THREE.Group(); w.position.set(x * L, 0.38 * L, z * (HW - 0.02)); g.add(w);
    const tire = cyl(0.38 * L, 0.38 * L, 0.3 * L, MAT.rubber, 40); tire.rotation.x = Math.PI / 2; w.add(tire);
    const rim = cyl(0.3 * L, 0.3 * L, 0.31 * L, metal(0x2a2c31, 0.3), 10); rim.rotation.x = Math.PI / 2; w.add(rim);
    P.wheels.push(w);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.P = P; g.userData.paint = paint; return g;
}
// suelo espejo continuo (reflector + capa oscura + sombras + rejilla)
function buildFloor() {
  const W2 = 520, D2 = 90, cx = 170, cz = -10;
  const refl = new Reflector(new THREE.PlaneGeometry(W2, D2), { textureWidth: 540 * PR, textureHeight: 960 * PR, color: 0x6f7c99 }); refl.rotation.x = -Math.PI / 2; refl.position.set(cx, 0, cz); scene.add(refl);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(W2, D2), new THREE.MeshBasicMaterial({ color: 0x050812, transparent: true, opacity: 0.8 })); d.rotation.x = -Math.PI / 2; d.position.set(cx, 0.002, cz); scene.add(d);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(W2, D2), new THREE.ShadowMaterial({ opacity: 0.55 })); sh.rotation.x = -Math.PI / 2; sh.position.set(cx, 0.004, cz); sh.receiveShadow = true; scene.add(sh);
  const pts = []; for (let z = cz - D2 / 2; z <= cz + D2 / 2; z += 2) pts.push(cx - W2 / 2, 0, z, cx + W2 / 2, 0, z); for (let x = cx - W2 / 2; x <= cx + W2 / 2; x += 2) pts.push(x, 0, cz - D2 / 2, x, 0, cz + D2 / 2);
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  S.gridM = new THREE.LineBasicMaterial({ color: 0x4a5a8c, transparent: true, opacity: 0.22 }); const gr = new THREE.LineSegments(gg, S.gridM); gr.position.y = 0.006; scene.add(gr);
}
// luces que acompañan a la acción (siempre las mismas: no cambia el número de luces y no se recompilan los sombreadores)
function buildRig() {
  const key = new THREE.SpotLight(0xfff3e6, 260, 60, 0.55, 0.65, 1.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.radius = 4; key.shadow.camera.near = 1; key.shadow.camera.far = 60;
  scene.add(key); scene.add(key.target);
  const a = new THREE.PointLight(0x37c6ff, 40, 22, 1.6), b = new THREE.PointLight(0xff7a3a, 34, 22, 1.6), f = new THREE.PointLight(0xbfdcff, 16, 26, 1.5);
  scene.add(a, b, f); S.rig = { key, a, b, f };
}
// coloca las luces alrededor de un foco: c = centro (mundo), yaw = hacia dónde mira la escena (radianes), k = tamaño, pw = potencia
function rigAt(c, yaw = 0, k = 1, pw = 1, angle = 0.55) {
  const R = S.rig, rot = (x, z) => v3(c.x + x * Math.cos(yaw) + z * Math.sin(yaw), 0, c.z - x * Math.sin(yaw) + z * Math.cos(yaw));
  const kp = rot(-3 * k, 6 * k); R.key.position.set(kp.x, c.y + 9 * k, kp.z); R.key.target.position.copy(c); R.key.intensity = 150 * pw * k * k; R.key.distance = 60 * k; R.key.angle = angle;
  const ap = rot(-5 * k, -3 * k); R.a.position.set(ap.x, c.y + 3 * k, ap.z); R.a.intensity = 30 * pw * k * k; R.a.distance = 22 * k;
  const bp = rot(5 * k, -3 * k); R.b.position.set(bp.x, c.y + 3.5 * k, bp.z); R.b.intensity = 26 * pw * k * k; R.b.distance = 22 * k;
  const fp = rot(0, 9 * k); R.f.position.set(fp.x, c.y + 4 * k, fp.z); R.f.intensity = 16 * pw * k * k; R.f.distance = 26 * k;
}
function lerpRig(A, B, e) {        // A, B: [c, yaw, k, pw, angle]
  const c = A[0].clone().lerp(B[0], e);
  rigAt(c, lerp(A[1], B[1], e), lerp(A[2], B[2], e), lerp(A[3], B[3], e), lerp(A[4] || 0.55, B[4] || 0.55, e));
}
