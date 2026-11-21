// ---------------------------------------------------------------- LOS COCHES (más realistas; el morro está en −x local): carrocería de una pieza «tejida» a lo largo del coche (paragolpes, capó, parabrisas,
// techo, luneta y maletero, laterales con caída hacia el techo), lunas tintadas, pilares, faros, pilotos, retrovisores, matrícula y ruedas con llanta.
const CARTYPES = {
  sedan: { L: 4.45, W: 1.82, bot: 0.3, top: [[0, 0.6], [0.04, 0.78], [0.3, 0.9], [0.34, 0.93], [0.47, 1.43], [0.76, 1.45], [0.88, 1.1], [0.92, 1.02], [1, 0.86]], belt: 0.98, ws: [0.335, 0.47], rw: [0.77, 0.89], side: [0.37, 0.8], pillarB: 0.6 },
  hatch: { L: 4.0, W: 1.76, bot: 0.3, top: [[0, 0.6], [0.04, 0.78], [0.27, 0.9], [0.31, 0.94], [0.46, 1.46], [0.83, 1.46], [0.97, 1.08], [1, 0.9]], belt: 0.99, ws: [0.31, 0.46], rw: [0.84, 0.965], side: [0.35, 0.86], pillarB: 0.62 },
  suv:   { L: 4.6, W: 1.9, bot: 0.42, top: [[0, 0.72], [0.04, 0.95], [0.26, 1.06], [0.3, 1.1], [0.42, 1.68], [0.86, 1.7], [0.97, 1.3], [1, 1.05]], belt: 1.16, ws: [0.3, 0.42], rw: [0.87, 0.965], side: [0.33, 0.88], pillarB: 0.6 },
};
function carGeo(T0, paint) { const nu = 64, nv = 40, pos = [], col = [], idx = [], L = T0.L, Wd = T0.W, glass = new THREE.Color(0x0f141a), trim = new THREE.Color(0x1a1c1f), pc = new THREE.Color(paint);
  const topAt = u => { const P = T0.top; for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const a = P[i - 1], b = P[i], k = (u - a[0]) / (b[0] - a[0]), s = k * k * (3 - 2 * k); return a[1] + (b[1] - a[1]) * (0.5 * k + 0.5 * s); } return P[P.length - 1][1]; };
  for (let i = 0; i <= nu; i++) { const u = i / nu, x = (u - 0.5) * L, yt = topAt(u), yb = T0.bot + (u < 0.04 || u > 0.96 ? 0.08 : 0), endK = Math.sin(Math.min(1, Math.min(u, 1 - u) * 14) * Math.PI / 2);   // los extremos se cierran
    for (let j = 0; j <= nv; j++) { const v = j / nv, a = v * Math.PI * 2;
      // sección: rectángulo redondeado (abajo ancho, arriba más estrecho por la caída del techo)
      const cy = (yt + yb) / 2, hy = (yt - yb) / 2, ca = Math.cos(a), sa = Math.sin(a), sq = (q, p) => Math.sign(q) * Math.pow(Math.abs(q), p);
      let y = cy + hy * sq(sa, 0.35), wHalf = Wd / 2 * (y > T0.belt ? 1 - 0.2 * Math.min(1, (y - T0.belt) / 0.5) : 1) * (0.86 + 0.14 * endK);
      let z = wHalf * sq(ca, 0.3); pos.push(x, y, z);
      // color: luna (parabrisas, laterales, luneta) o pintura; pilares y faldón oscuros
      let c = pc; const up = y > T0.belt + 0.03, onSide = Math.abs(ca) > 0.55, onTop = sa > 0.8;
      if (up && !onTop) { const inWS = u > T0.ws[0] && u < T0.ws[1], inRW = u > T0.rw[0] && u < T0.rw[1], inSide = onSide && u > T0.side[0] && u < T0.side[1] && Math.abs(u - T0.pillarB) > 0.012; if ((inWS || inRW) && !onSide || inSide) c = glass; }
      if (y < yb + 0.12 && sa < -0.3) c = trim; col.push(c.r, c.g, c.b); } }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
let _wheelG = null;
function wheel() { const g = new THREE.Group(); if (!_wheelG) { const tire = new THREE.TorusGeometry(0.25, 0.095, 14, 32), rim = new THREE.CylinderGeometry(0.2, 0.2, 0.17, 28); rim.rotateX(Math.PI / 2); _wheelG = { tire, rim }; }
  const t = new THREE.Mesh(_wheelG.tire, CARM.tire); t.castShadow = true; g.add(t); const r = new THREE.Mesh(_wheelG.rim, CARM.rim); g.add(r);
  for (let i = 0; i < 5; i++) { const s = box(0.05, 0.18, 0.04, CARM.rimD, 0, 0, 0.07); s.rotation.z = i / 5 * Math.PI * 2; s.position.set(Math.sin(i / 5 * Math.PI * 2) * 0.09, Math.cos(i / 5 * Math.PI * 2) * 0.09, 0.07); g.add(s); }
  ad(g, cyl(0.045, 0.045, 0.19, CARM.rimD, 12)).rotation.x = Math.PI / 2; return g; }
const CARM = {};
function car(type = 'sedan', paint = 0xb0141e, seed = 1) {
  if (!CARM.tire) { CARM.tire = stdM(0x151515, 0.9); CARM.rim = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.25, metalness: 1 }); CARM.rimD = new THREE.MeshStandardMaterial({ color: 0x7c8288, roughness: 0.3, metalness: 1 });
    CARM.head = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 0.6, roughness: 0.1 }); CARM.tail = new THREE.MeshStandardMaterial({ color: 0x8a0a10, emissive: 0xff2020, emissiveIntensity: 0.5, roughness: 0.2 });
    CARM.bump = stdM(0x222428, 0.55); CARM.well = new THREE.MeshBasicMaterial({ color: 0x050505 }); CARM.chrome = new THREE.MeshStandardMaterial({ color: 0xe0e4e8, roughness: 0.15, metalness: 1 }); }
  const T0 = CARTYPES[type], g = new THREE.Group(), body = new THREE.Mesh(carGeo(T0, paint), new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.06 }));
  body.castShadow = body.receiveShadow = true; g.add(body); const L = T0.L, Wd = T0.W;
  // pasos de rueda (oscuros) y ruedas
  g.userData.wheels = []; for (const sx of [-1, 1]) for (const fz of [-1, 1]) { const x = fz * L * 0.33, z = sx * (Wd / 2 - 0.13); const well = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24, 0, Math.PI), CARM.well); well.position.set(x, T0.bot + 0.0, sx * (Wd / 2 + 0.002)); if (sx < 0) well.rotation.y = Math.PI; g.add(well);
    const w = wheel(); w.position.set(x, 0.35, z); if (sx < 0) w.rotation.y = Math.PI; w.userData.flip = sx < 0 ? -1 : 1; g.add(w); g.userData.wheels.push(w); }
  // faros, pilotos, paragolpes, retrovisores, manillas, matrículas
  for (const s of [-1, 1]) { const hl = rboxM(0.06, 0.12, 0.34, 0.03, CARM.head, 2); hl.position.set(-L / 2 + 0.1, T0.top[1][1] - 0.06, s * (Wd / 2 - 0.3)); g.add(hl); const tl = rboxM(0.05, 0.12, 0.36, 0.03, CARM.tail, 2); tl.position.set(L / 2 - 0.08, T0.top[T0.top.length - 1][1] - 0.05, s * (Wd / 2 - 0.28)); g.add(tl);
    const mir = rboxM(0.12, 0.09, 0.16, 0.03, body.material, 2); mir.position.set(L * (T0.ws[0] - 0.5) + 0.25, T0.belt + 0.06, s * (Wd / 2 + 0.03)); g.add(mir);
    for (const u of [0.42, 0.66]) { const hd = box(0.16, 0.025, 0.02, CARM.chrome, L * (u - 0.5), T0.belt - 0.12, s * (Wd / 2 - 0.005)); g.add(hd); } }
  for (const fz of [-1, 1]) { const b = rboxM(0.2, 0.22, Wd - 0.06, 0.08, CARM.bump, 2); b.position.set(fz * (L / 2 - 0.06), T0.bot + 0.12, 0); g.add(b);
    const pl = signPlane(0.52, 0.12, 256, (c, w, h) => { c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d4fa8'; c.fillRect(0, 0, 26, h); c.fillStyle = '#111'; c.font = '700 40px DejaVuMono'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('KW ' + String(1000 + seed * 37 % 9000), w / 2 + 12, h / 2 + 2); });
    pl.position.set(fz * (L / 2 + 0.05), T0.bot + 0.16, 0); pl.rotation.y = fz * Math.PI / 2; g.add(pl); }
  g.userData.L = L; return g; }
// avanza un coche por su carril (s = metros recorridos): gira las ruedas
function carRoll(c, s) { for (const w of c.userData.wheels) w.rotation.z = -w.userData.flip * s / 0.35; }
