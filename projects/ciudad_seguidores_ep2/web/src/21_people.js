// ---------------------------------------------------------------- LOS HABITANTES: una figurita por seguidor (NPOP) y CADA UNA HACE ALGO. La persona i es el seguidor i por
// orden de llegada y vive en la casa floor(i / 5) (los primeros, más cerca del trono). Qué hace cada uno:
//   · un oficio o un sitio concreto (ROLES, de 22_sites.js): peluquera, cajera, guardias, bomberos, la profesora y su clase…
//   · pasea por la acera de su manzana (algunos, con su perro) · va en coche dando la vuelta a la manzana o espera aparcado
//   · charla en un corrillo del patio de su manzana o de la plaza · está sentado en un banco · está en la puerta de su casa
// Cuando la cámara se acerca, levantan la mano y saludan (los que trabajan siguen a lo suyo: tijeras, caja, manguera…).
// (Los nombres NO están aquí ni en el repositorio: los pone el montaje, en local, con las posiciones que da window.labelsAt.)
const PEOPLE = {}, JOBS = {};
const PPM0 = 70;                                      // píxeles por metro a partir de los que alguien «está cerca» (saluda y lleva su nombre)
function buildPeople() {
  const P = PEOPLE, N = P.N = NPOP, C = CITY, S0 = P.s = new Array(N).fill(null), used = new Set(Object.values(VIP)); used.add(KING);
  let seq = 0; const pick = () => { for (;;) { const i = (313 + seq++ * 977) % NNAMED; if (!used.has(i)) return i; } };
  for (const r of ROLES) { const i = r.king ? KING : r.vip ? VIP[r.vip] : pick(); used.add(i); S0[i] = r; r.i = i; JOBS[i] = r.job; if (r.k === 'P') { r.len = Math.hypot(r.x2 - r.x, r.z2 - r.z); r.ph = r.ph || 0; } }
  // ---- los demás: según su casa y un sorteo fijo
  const GC = [[-4.3, -4.3], [4.3, -4.3], [-4.3, 4.3], [4.3, 4.3], [0.4, -1.2]], seat = {}, mus = fromUV(-17, -15.5); let pb = 0;
  const benchOf = {}; C.benches.forEach((q, k) => { const key = Math.hypot(q[0], q[1]) < 29 ? 'plaza' : Math.round(q[0] / PITCH) + ',' + Math.round(q[1] / PITCH); (benchOf[key] = benchOf[key] || []).push(q); });
  const sit = (key) => { const L = benchOf[key] || [], n = seat[key] || 0; if (n >= L.length * 2) return null; seat[key] = n + 1; const q = L[n >> 1], sd = (n & 1) ? 0.55 : -0.55; return { k: 'T', x: q[0] + Math.cos(q[2]) * sd, z: q[1] - Math.sin(q[2]) * sd, y: (key === 'plaza' ? 0.16 : 0.5) + 0.2, yaw: q[2] + Math.PI, sc: 1 }; };
  for (let i = 0; i < N; i++) { if (S0[i]) continue; const h = C.homes[Math.min(C.NH - 1, Math.floor(i / 5))], b = h.b, u = hash(i * 0.731 + 0.17), v = hash(i * 1.913 + 0.4), w = hash(i * 3.377 + 0.9), key = b.i + ',' + b.j; let s;
    if (u < 0.39) s = { k: 'L', b, r: 15.75 + (v > 0.5 ? 0.75 : 0), q: 1.0, s0: w * 130, spd: 1.0 + v * 0.5, dir: w > 0.5 ? 1 : -1, y: 0.3 };
    else if (u < 0.44) s = { k: 'L', b, r: 16.1, q: 1.0, s0: w * 130, spd: 0.8 + v * 0.3, dir: v > 0.5 ? 1 : -1, y: 0.3, dog: 1 };
    else if (u < 0.505) { if (v < 0.55) s = { k: 'L', b, r: 19.9, q: 2.6, s0: w * 160, spd: 4.5 + v * 5, dir: 1, y: 0.06, car: 1 }; else { const p = loopAt(b.x, b.z, 17.95, 1.5, w * 140); s = { k: 'V', x: p[0], z: p[1], yaw: p[2], vy: 2.6, car: 1 }; } }
    else if (u < 0.71) { s = (v < 0.2 && sit(key)) || (() => { const g = GC[Math.floor(w * 5)], a = v * Math.PI * 2, rr2 = 1.15 + (i % 3) * 0.12; return { k: 'S', x: b.x + g[0] + Math.cos(a) * rr2, z: b.z + g[1] + Math.sin(a) * rr2, y: 0.5, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), free: 1 }; })(); }
    else if (u < 0.76) { s = (v < 0.12 && sit('plaza')) || (() => { for (let k = 0; k < 6; k++) { const g = Math.floor(hash(i * 5.1 + k) * 66), ga = (g % 22) / 22 * Math.PI * 2 + (Math.floor(g / 22) % 2) * 0.14, gr = [21.0, 23.8, 26.5][Math.floor(g / 22)], gx = Math.cos(ga) * gr, gz = Math.sin(ga) * gr; if (Math.hypot(gx - mus[0], gz - mus[1]) < 7) continue; const a = v * Math.PI * 2 + k;
          return { k: 'S', x: gx + Math.cos(a) * 1.2, z: gz + Math.sin(a) * 1.2, y: 0.17, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), free: 1 }; } return { k: 'S', x: 21.5 * Math.cos(v * 6.28), z: 21.5 * Math.sin(v * 6.28), y: 0.17, yaw: 0, free: 1 }; })(); }
    else { const lat = (v - 0.5) * 3.4; s = { k: 'S', x: h.x + h.ox * 3.05 + (h.ox ? 0 : lat), z: h.z + h.oz * 3.05 + (h.oz ? 0 : lat), y: 0.5, yaw: Math.atan2(h.ox, h.oz), free: 1 }; }
    s.sc = s.sc || 0.9 + hash(i * 2.11) * 0.22; s.i = i; S0[i] = s; }
  for (const s of S0) { s.ph = s.ph ?? hash(s.i * 1.37) * 6.283; if (s.k === 'L') s.P = loopLen(s.r, s.q); }
  // ---- las figuritas (cuerpo, cabeza y pelo o casco)
  const bg = new THREE.CylinderGeometry(0.46, 0.64, 1.55, 7); bg.translate(0, 0.78, 0); const hg2 = new THREE.IcosahedronGeometry(0.56, 1); hg2.translate(0, 2.06, 0);
  const cg = new THREE.SphereGeometry(0.61, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5); cg.translate(0, 2.1, -0.06);
  const shirt = [0xe2483d, 0x2f6fd0, 0xf0a020, 0x2f9e5a, 0x8a5cd0, 0xf4f1ea, 0xff6fb5, 0x22c0b0, 0x34466e, 0xe0d040, 0xff7a2a, 0x7a5c3a], skin = P.skinC = [0xf0c8a0, 0xe6b48c, 0xd9a27c, 0xc68a62, 0x9a6a48, 0x6e4a32], hair = [0x1c1410, 0x3a2618, 0x5a3a22, 0x8a5a2a, 0xd9b45a, 0x2c2c30, 0xb0492a];
  P.m = [inst(bg, stdM(0xffffff, 0.75), N), inst(hg2, stdM(0xffffff, 0.7), N), inst(cg, stdM(0xffffff, 0.85), N, false)]; P.m[1].instanceMatrix = P.m[0].instanceMatrix; P.m[2].instanceMatrix = P.m[0].instanceMatrix;
  P.cx = new Float32Array(N); P.cy = new Float32Array(N); P.cz = new Float32Array(N); P.yw = new Float32Array(N); P.skin = new Uint8Array(N); P.mod = [];
  for (let i = 0; i < N; i++) { const s = S0[i]; P.skin[i] = Math.floor(hash(i * 7.1) * skin.length); P.m[0].setColorAt(i, _IC.set(s.cape ? 0xf4f1ea : s.shirt ?? shirt[Math.floor(hash(i * 5.7) * shirt.length)])); P.m[1].setColorAt(i, _IC.set(skin[P.skin[i]])); P.m[2].setColorAt(i, _IC.set(s.hat ?? hair[Math.floor(hash(i * 9.3) * hair.length)])); }
  const grp = new THREE.Group(); for (const m of P.m) { m.instanceColor.needsUpdate = true; grp.add(m); }
  // ---- el brazo (saludar, tijeras, manguera…): solo para los que están cerca de la cámara
  { const ag = mergeGeometries([new THREE.CylinderGeometry(0.13, 0.15, 1.05, 6).translate(0, 0.52, 0), new THREE.SphereGeometry(0.24, 8, 6).translate(0, 1.12, 0)]); P.NA = 420; P.arms = inst(ag, stdM(0xffffff, 0.7), P.NA); P.arms.count = P.NA;
    for (let i = 0; i < P.NA; i++) { setI(P.arms, i, 0, -50, 0, 0, 0, 0); P.arms.setColorAt(i, _IC.set(skin[0])); } P.arms.instanceColor.needsUpdate = true; grp.add(P.arms); }
  // ---- perros (van delante de su dueño)
  { const L = P.dogs = S0.filter(s => s.dog), dg = mergeGeometries([new THREE.BoxGeometry(0.34, 0.4, 0.9).translate(0, 0.5, 0), new THREE.BoxGeometry(0.32, 0.32, 0.36).translate(0, 0.78, 0.52), new THREE.BoxGeometry(0.1, 0.34, 0.1).translate(0, 0.86, -0.46)]);
    P.dogM = inst(dg, stdM(0xffffff, 0.85), L.length); const dc = [0x8a5a2a, 0xf4f1ea, 0x2c2c30, 0xd9b45a, 0xb98a5a, 0x6b4a2e]; L.forEach((s, k) => P.dogM.setColorAt(k, _IC.set(dc[Math.floor(hash(s.i * 4.3) * dc.length)]))); if (L.length) P.dogM.instanceColor.needsUpdate = true; grp.add(P.dogM); }
  // ---- coches (los que dan la vuelta a su manzana y los aparcados con alguien esperando dentro)
  { const L = P.cars = S0.filter(s => s.car), wg = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) wg.push(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 10).rotateZ(Math.PI / 2).translate(sx * 0.92, 0.4, sz * 1.35));
    P.carB = inst(boxG(1.85, 0.85, 4.2, 0.87), stdM(0xffffff, 0.45), L.length); P.carC = inst(new THREE.BoxGeometry(1.66, 0.7, 2.1).translate(0, 1.64, -0.2), stdM(0x263442, 0.25, { metalness: 0.3 }), L.length, false); P.carW = inst(mergeGeometries(wg), stdM(0x1c2026, 0.6), L.length, false);
    P.carC.instanceMatrix = P.carB.instanceMatrix; P.carW.instanceMatrix = P.carB.instanceMatrix; const cc = [0xd9342b, 0x2f6fd0, 0xf4f1ea, 0x26282e, 0xc9ced6, 0x2f9e5a, 0xf0a020, 0x8a5cd0, 0x9fd0f2];
    L.forEach((s, k) => { P.carB.setColorAt(k, _IC.set(cc[Math.floor(hash(s.i * 6.1) * cc.length)])); if (s.k === 'V') setYS(P.carB.instanceMatrix.array, k, s.x, 0.04, s.z, 1, s.yaw); }); if (L.length) P.carB.instanceColor.needsUpdate = true; grp.add(P.carB, P.carC, P.carW); }
  // ---- carros de la compra, sacas del banco, cañas de pescar y patos del lago
  { const L = PROPS.cart, cg2 = mergeGeometries([new THREE.BoxGeometry(0.62, 0.5, 0.95).translate(0, 0.78, 0), new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(0.28, 0.3, 0.42), new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(-0.28, 0.3, 0.42), new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(0.28, 0.3, -0.42), new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(-0.28, 0.3, -0.42), new THREE.BoxGeometry(0.62, 0.06, 0.06).translate(0, 1.18, -0.56)]);
    P.cartM = inst(cg2, stdM(0xc9ced6, 0.4, { metalness: 0.6 }), L.length); P.goodM = inst(new THREE.BoxGeometry(0.52, 0.5, 0.82).translate(0, 1.2, 0), stdM(0xffffff, 0.7), L.length); const gc = [0xe2483d, 0xf0a020, 0x2f9e5a, 0xf2d03a, 0x2f6fd0];
    L.forEach((c, k) => { P.goodM.setColorAt(k, _IC.set(gc[k % 5])); if (!c.role) { setI(P.cartM, k, c.x, 0.6, c.z, 1, 1, 1, c.yaw); setI(P.goodM, k, c.x, 0.6, c.z, c.full ? 1 : 0, c.full, c.full ? 1 : 0, c.yaw); } }); if (L.length) P.goodM.instanceColor.needsUpdate = true; grp.add(P.cartM, P.goodM);
    P.sackM = inst(new THREE.SphereGeometry(0.36, 10, 8), stdM(0xd9c79a, 0.9), PROPS.sack.length + 5); for (let k = 0; k < 5; k++) setI(P.sackM, PROPS.sack.length + k, PROPS.van.position.x + 3.7 + (k % 2) * 0.35, 0.75 + (k > 2 ? 0.5 : 0), PROPS.van.position.z - 0.5 + (k % 3) * 0.5, 1, 0.85, 1); grp.add(P.sackM);
    for (const r of PROPS.rod) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 3.4, 5).rotateX(Math.PI / 2).translate(0, 0, 1.7), stdM(0x3a2a1a, 0.6)); m.rotation.order = 'YXZ'; m.rotation.set(-0.55, r.yaw, 0); m.position.set(r.x + Math.sin(r.yaw) * 0.6, 1.9, r.z + Math.cos(r.yaw) * 0.6); m.castShadow = true; grp.add(m); }
    P.duckM = inst(mergeGeometries([new THREE.SphereGeometry(0.34, 8, 6).scale(0.8, 0.6, 1.2).translate(0, 0.16, 0), new THREE.SphereGeometry(0.17, 8, 6).translate(0, 0.42, 0.34)]), stdM(0xf7f3e6, 0.7), 8); grp.add(P.duckM); }
  P.ball = sph(0.3, stdM(0xffffff, 0.5), 10, 8); P.ball.castShadow = true; grp.add(P.ball); P.pball = PROPS.padel.map(() => { const m = sph(0.14, stdM(0xd8f23a, 0.5), 8, 6); grp.add(m); return m; });
  P.kingS = S0[KING];
  return grp;
}
// dónde está y hacia dónde mira la persona i en el instante t → rellena P.cx, P.cy, P.cz, P.yw; devuelve su escala (0 = no se ve: va en un vehículo)
function personAt(s, t, cheer) { const P = PEOPLE, i = s.i; let x = s.x, z = s.z, y = s.y, yaw = s.yaw, sc = s.sc;
  if (s.k === 'L') { const p = loopAt(s.b.x, s.b.z, s.r, s.q, s.s0 + s.spd * t, s.dir); x = p[0]; z = p[1]; yaw = p[2]; if (s.car) { sc = 0; y = 2.6; } else y += 0.1 * Math.abs(Math.sin(t * (2.6 + s.spd * 1.6) + s.ph)); }
  else if (s.k === 'P') { const u0 = (t * s.spd / s.len + s.ph) % 2, u = u0 < 1 ? u0 : 2 - u0, e = clamp((u - 0.06) / 0.88); x = lerp(s.x, s.x2, e); z = lerp(s.z, s.z2, e); s.out = u0 < 1; yaw = Math.atan2((s.x2 - s.x) * (s.out ? 1 : -1), (s.z2 - s.z) * (s.out ? 1 : -1)); if (s.faceX) yaw = Math.atan2(s.faceX, 0); y += 0.08 * Math.abs(Math.sin(t * 5 + s.ph)); }
  else if (s.k === 'C') { const a = s.a0 + s.w * t; x = s.x + Math.cos(a) * s.r; z = s.z + Math.sin(a) * s.r; yaw = s.face === 'in' ? Math.atan2(-Math.cos(a), -Math.sin(a)) : Math.atan2(-Math.sin(a), Math.cos(a)); y += 0.1 * Math.abs(Math.sin(t * 6 + s.ph)); }
  else if (s.k === 'T') { y -= 0.55; yaw += 0.12 * Math.sin(t * 0.8 + s.ph); }
  else if (s.k === 'V') { sc = 0; y = s.vy; }
  else { y += 0.05 * (1 + Math.sin(t * 2.2 + s.ph)) + cheer * 1.1 * Math.abs(Math.sin(t * 6.6 + s.ph)); yaw += 0.18 * Math.sin(t * 0.9 + s.ph * 2); }
  P.cx[i] = x; P.cy[i] = y; P.cz[i] = z; P.yw[i] = yaw; return sc; }
// quién está cerca de la cámara (y en pantalla): [i, x de pantalla, y de pantalla (encima de la cabeza), píxeles por metro]. Con la cámara ya colocada.
function nearPeople() { const e = vpOf().elements, P = PEOPLE, out = [], f = (H / 2) / Math.tan(cam.fov * Math.PI / 360);
  for (let i = 0; i < P.N; i++) { const s = P.s[i], x = P.cx[i], z = P.cz[i], y = P.cy[i] + (s.k === 'V' || s.car ? 0 : 2.95 * s.sc), cw = e[3] * x + e[7] * y + e[11] * z + e[15]; if (cw <= 1) continue; const ppm = f / cw; if (ppm < PPM0) continue;
    const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / cw + 1) / 2 * W, sy = (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / cw) / 2 * H; if (sx < -160 || sx > W + 160 || sy < -60 || sy > H + 260) continue;
    out.push([i, sx, sy, ppm]); }
  return out; }
function peopleAt(t, o = {}) {
  const P = PEOPLE, a = P.m[0].instanceMatrix.array, cheer = clamp(o.cheer ?? 0), S0 = P.s;
  for (let i = 0; i < P.N; i++) { const s = S0[i], sc = personAt(s, t, cheer); setYS(a, i, P.cx[i], P.cy[i], P.cz[i], sc, P.yw[i]); }
  // los de cerca: saludan (o siguen con su oficio) y los que están parados se giran hacia la cámara
  const near = P.near = nearPeople(); let n = 0;
  for (const [i, , , ppm] of near) { const s = S0[i]; if (s.k === 'V' || s.car) continue; const k = sm5(clamp((ppm - PPM0) / 14)), x = P.cx[i], z = P.cz[i], y = P.cy[i], sc = s.sc; let yaw = P.yw[i];
    if (s.free) { let dy = Math.atan2(cam.position.x - x, cam.position.z - z) - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * k; setYS(a, i, x, y, z, sc, yaw); }
    if (n < P.NA && k > 0.01) { const side = hash(i * 4.9) > 0.5 ? 1 : -1, rx = Math.cos(yaw) * side, rz = -Math.sin(yaw) * side, fx = Math.sin(yaw), fz = Math.cos(yaw), up = popK(k), kind = s.arm || 'wave', ph = t * 9.5 + s.ph * 3;
      if (kind === 'wave') { const ang = 0.42 + 0.4 * Math.sin(ph); _IE2.set(rx * Math.sin(ang), Math.cos(ang), rz * Math.sin(ang)); }
      else if (kind === 'cut') { const w = 0.22 * Math.sin(ph * 1.6); _IE2.set(fx * 0.8 + rx * w, 0.55 + 0.12 * Math.cos(ph * 1.6), fz * 0.8 + rz * w); }
      else _IE2.set(fx * 0.92 + rx * 0.1, 0.3 + 0.04 * Math.sin(ph * 0.4), fz * 0.92 + rz * 0.1);
      _IP.set(x + rx * 0.5 * sc, y + 1.2 * sc, z + rz * 0.5 * sc); _IQ.setFromUnitVectors(_IS.set(0, 1, 0), _IE2.normalize()); _IS.set(sc * up, sc * up, sc * up); _IM.compose(_IP, _IQ, _IS); P.arms.setMatrixAt(n, _IM); P.arms.setColorAt(n, _IC.set(P.skinC[P.skin[i]])); n++; } }
  for (let j = n; j < (P.armN || 0); j++) { _IP.set(0, -50, 0); _IS.set(1e-4, 1e-4, 1e-4); _IM.compose(_IP, _IQ.identity(), _IS); P.arms.setMatrixAt(j, _IM); } P.armN = n;
  P.m[0].instanceMatrix.needsUpdate = P.arms.instanceMatrix.needsUpdate = P.arms.instanceColor.needsUpdate = true;
  // perros, coches, carros, sacas y patos
  P.dogs.forEach((s, k) => { const p = loopAt(s.b.x, s.b.z, s.r + 0.45, s.q, s.s0 + s.spd * t + 1.5, s.dir); setYS(P.dogM.instanceMatrix.array, k, p[0], 0.3 + 0.06 * Math.abs(Math.sin(t * 9 + s.ph)), p[1], 1, p[2]); }); P.dogM.instanceMatrix.needsUpdate = true;
  P.cars.forEach((s, k) => { if (s.k === 'L') setYS(P.carB.instanceMatrix.array, k, P.cx[s.i], 0.04, P.cz[s.i], 1, P.yw[s.i]); }); P.carB.instanceMatrix.needsUpdate = true;
  PROPS.cart.forEach((c, k) => { if (!c.role) return; const i = c.role.i, yw = P.yw[i], x = P.cx[i] + Math.sin(yw) * 1.0, z = P.cz[i] + Math.cos(yw) * 1.0; setI(P.cartM, k, x, 0.6, z, 1, 1, 1, yw); setI(P.goodM, k, x, 0.6, z, 1, c.full, 1, yw); }); P.cartM.instanceMatrix.needsUpdate = P.goodM.instanceMatrix.needsUpdate = true;
  PROPS.sack.forEach((c, k) => { const i = c.role.i, yw = P.yw[i], on = c.role.out ? 1 : 0; setI(P.sackM, k, P.cx[i] + Math.sin(yw) * 0.6, P.cy[i] + 1.25, P.cz[i] + Math.cos(yw) * 0.6, on, on * 0.85, on); }); P.sackM.instanceMatrix.needsUpdate = true;
  { const c = PROPS.ball.c; P.ball.position.set(c[0] + 10.5 * Math.sin(t * 0.83 + 0.4), 0.85 + 0.9 * Math.abs(Math.sin(t * 3.1)), c[1] + 5.2 * Math.sin(t * 1.37 + 1)); PROPS.padel.forEach((c2, k) => P.pball[k].position.set(c2[0] + 4.3 * Math.sin(t * 2.6 + k * 1.7), 1.3 + 1.2 * Math.abs(Math.cos(t * 2.6 + k * 1.7)), c2[1] + 1.6 * Math.sin(t * 1.9 + k))); PROPS.jet.scale.setScalar(1 + 0.15 * Math.sin(t * 7)); }
  for (let k = 0; k < 8; k++) { const a2 = k * 0.9 + t * (0.16 + (k % 3) * 0.05) * (k % 2 ? 1 : -1), r = 2.5 + (k % 4) * 1.9; setYS(P.duckM.instanceMatrix.array, k, PROPS.pond[0] + Math.cos(a2) * r, 0.58, PROPS.pond[1] + Math.sin(a2) * r, 1, Math.atan2(-Math.sin(a2), Math.cos(a2)) + (k % 2 ? 0 : Math.PI)); } P.duckM.instanceMatrix.needsUpdate = true;
}
// para el montaje (en local): { p: personas con nombre [i, x, y, px/m × 10], h: casas con sus 5 nombres [n, x, y, px/m × 10] }
window.labelsAt = function (t) {
  frame(t); const r = v => Math.round(v), p = PEOPLE.near.map(q => [q[0], r(q[1]), r(q[2]), r(q[3] * 10)]), h = [], e = vpOf().elements, f = (H / 2) / Math.tan(cam.fov * Math.PI / 360);
  for (let n = 0; n < CITY.NH; n++) { const q = CITY.homes[n], x = q.x, y = 6.4, z = q.z, cw = e[3] * x + e[7] * y + e[11] * z + e[15]; if (cw <= 1) continue; const ppm = f / cw; if (ppm < 80) continue;
    const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / cw + 1) / 2 * W, sy = (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / cw) / 2 * H; if (sx < -200 || sx > W + 200 || sy < -40 || sy > H + 300) continue; h.push([n, r(sx), r(sy), r(ppm * 10)]); }
  return { p, h };
};
window.JOBS = JOBS; window.VIPS = Object.values(VIP); window.KINGI = KING;
