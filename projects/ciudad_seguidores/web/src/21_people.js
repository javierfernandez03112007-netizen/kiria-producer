// ---------------------------------------------------------------- LOS HABITANTES: una figurita por seguidor (NPOP), de pie en las calles y en la plaza.
// La persona i es el seguidor i por orden de llegada: los primeros que siguieron el canal viven más cerca del trono (y el hogar n es de los
// seguidores 5n … 5n+4). Cuando la cámara se acerca, se giran hacia ella, levantan la mano y saludan.
// (Los nombres NO están aquí ni en el repositorio: los pone el montaje, en local, con las posiciones que da window.labelsAt.)
const PEOPLE = {};
const _IE2 = new THREE.Vector3();
function streetOK(x, z) { const i = Math.round(x / PITCH), j = Math.round(z / PITCH), dx = Math.abs(x - i * PITCH), dz = Math.abs(z - j * PITCH);
  if (!i && !j) return Math.hypot(x, z) > 20;                                    // la plaza, menos la base del trono
  return dx > BLOCK / 2 + 1.9 || dz > BLOCK / 2 + 1.9; }
function buildPeople() {
  const P = PEOPLE, s = 2.5, cand = [], gh = [];
  for (let a = -170; a <= 170; a++) for (let b = -170; b <= 170; b++) { const x = a * s + (h2(a, b) - 0.5) * 1.0, z = b * s + (h2(b + 7.3, a) - 0.5) * 1.0; if (!streetOK(x, z)) continue;
    const u = toU(x, z), v = toV(x, z), m = Math.max(Math.abs(u) / REG.u, Math.abs(v) / REG.v);
    if (m <= 1) cand.push([m + h2(a * 1.7, b * 2.3) * 0.05, x, z]); else if (Math.abs(u) <= REG2.u && Math.abs(v) <= REG2.v && h2(a * 3.1, b) < 0.5) gh.push([h2(a, b * 3.1), x, z]); }
  cand.sort((p, q) => p[0] - q[0]); if (cand.length < NPOP) console.error('ERROR faltan sitios en la calle: ' + cand.length + ' < ' + NPOP);
  const N = P.N = NPOP; P.x = new Float32Array(N); P.z = new Float32Array(N); P.ph = new Float32Array(N); P.yaw = new Float32Array(N); P.sc = new Float32Array(N); P.skin = new Uint8Array(N); P.mod = [];
  const bg = new THREE.CylinderGeometry(0.46, 0.64, 1.55, 7); bg.translate(0, 0.78, 0); const hg2 = new THREE.IcosahedronGeometry(0.56, 1); hg2.translate(0, 2.06, 0);
  const cg = new THREE.SphereGeometry(0.61, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5); cg.translate(0, 2.1, -0.06);
  const mk = n => [inst(bg, stdM(0xffffff, 0.75), n), inst(hg2, stdM(0xffffff, 0.7), n), inst(cg, stdM(0xffffff, 0.85), n, false)];
  const shirt = [0xe2483d, 0x2f6fd0, 0xf0a020, 0x2f9e5a, 0x8a5cd0, 0xf4f1ea, 0xff6fb5, 0x22c0b0, 0x34466e, 0xe0d040, 0xff7a2a, 0x7a5c3a], skin = P.skinC = [0xf0c8a0, 0xe6b48c, 0xd9a27c, 0xc68a62, 0x9a6a48, 0x6e4a32], hair = [0x1c1410, 0x3a2618, 0x5a3a22, 0x8a5a2a, 0xd9b45a, 0x2c2c30, 0xb0492a];
  P.m = mk(N); P.m[1].instanceMatrix = P.m[0].instanceMatrix; P.m[2].instanceMatrix = P.m[0].instanceMatrix;
  for (let i = 0; i < N; i++) { const c = cand[i]; P.x[i] = c[1]; P.z[i] = c[2]; P.ph[i] = hash(i * 1.37) * 6.283; P.sc[i] = 0.9 + hash(i * 2.11) * 0.22; P.yaw[i] = Math.atan2(-c[1], -c[2]) + (hash(i * 3.3) - 0.5) * 1.4; P.skin[i] = Math.floor(hash(i * 7.1) * skin.length);
    setI(P.m[0], i, c[1], 0.06, c[2], P.sc[i], P.sc[i], P.sc[i], P.yaw[i]);
    P.m[0].setColorAt(i, _IC.set(shirt[Math.floor(hash(i * 5.7) * shirt.length)])); P.m[1].setColorAt(i, _IC.set(skin[P.skin[i]])); P.m[2].setColorAt(i, _IC.set(hair[Math.floor(hash(i * 9.3) * hair.length)])); }
  // el brazo que saluda (solo para los que están cerca de la cámara): un cilindro con la mano en la punta
  { const ag = mergeGeometries([new THREE.CylinderGeometry(0.13, 0.15, 1.05, 6).translate(0, 0.52, 0), new THREE.SphereGeometry(0.24, 8, 6).translate(0, 1.12, 0)]); P.NA = 320; P.arms = inst(ag, stdM(0xffffff, 0.7), P.NA);
    for (let i = 0; i < P.NA; i++) { setI(P.arms, i, 0, -50, 0, 0, 0, 0); P.arms.setColorAt(i, _IC.set(skin[0])); } }
  // los que llegarán («cuantos más seamos, más crece»): figuras doradas claras en el anillo
  gh.sort((p, q) => p[0] - q[0]); const NG = P.NG = Math.min(1500, gh.length); P.g = mk(NG); P.g[1].instanceMatrix = P.g[0].instanceMatrix; P.g[2].instanceMatrix = P.g[0].instanceMatrix; P.gx = new Float32Array(NG); P.gz = new Float32Array(NG);
  for (let i = 0; i < NG; i++) { P.gx[i] = gh[i][1]; P.gz[i] = gh[i][2]; setI(P.g[0], i, gh[i][1], 0.06, gh[i][2], 0, 0, 0); for (const m of P.g) m.setColorAt(i, _IC.set(0xfff0b8)); }
  const grp = new THREE.Group(); for (const m of [...P.m, ...P.g, P.arms]) { m.instanceColor.needsUpdate = true; grp.add(m); } return grp;
}
// altura de la persona i en t (respira; salta cuando hay fiesta)
const BOBW = () => Math.PI * 2 * Math.round(END * 0.32) / END;
function personY(i, t, cheer) { const ph = PEOPLE.ph[i]; return 0.06 + 0.07 * (1 + Math.sin(t * BOBW() + ph)) + cheer * 1.25 * Math.abs(Math.sin(t * 6.6 + ph)); }
// quién está cerca de la cámara (y en pantalla): [i, x de pantalla, y de pantalla (encima de la cabeza), píxeles por metro]. Con la cámara ya colocada.
const PPM0 = 70;
function nearPeople(t, cheer) { const e = vpOf().elements, P = PEOPLE, out = [], f = (H / 2) / Math.tan(cam.fov * Math.PI / 360);
  for (let i = 0; i < P.N; i++) { const x = P.x[i], z = P.z[i], y = personY(i, t, cheer) + 2.95 * P.sc[i], cw = e[3] * x + e[7] * y + e[11] * z + e[15]; if (cw <= 1) continue; const ppm = f / cw; if (ppm < PPM0) continue;
    const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / cw + 1) / 2 * W, sy = (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / cw) / 2 * H; if (sx < -160 || sx > W + 160 || sy < -60 || sy > H + 260) continue;
    out.push([i, sx, sy, ppm]); }
  return out; }
function peopleAt(t, o = {}) {
  const P = PEOPLE, a = P.m[0].instanceMatrix.array, cheer = clamp(o.cheer ?? 0); P.cheer = cheer;
  for (const i of P.mod) setI(P.m[0], i, P.x[i], 0, P.z[i], P.sc[i], P.sc[i], P.sc[i], P.yaw[i]); P.mod = [];                    // los que se giraron en el fotograma anterior vuelven a su sitio
  for (let i = 0; i < P.N; i++) a[i * 16 + 13] = personY(i, t, cheer);
  // los de cerca: se giran hacia la cámara, levantan la mano y saludan
  const near = nearPeople(t, cheer); let n = 0;
  for (const [i, , , ppm] of near) { const k = sm5(clamp((ppm - PPM0) / 14)), x = P.x[i], z = P.z[i], y = personY(i, t, cheer), sc = P.sc[i], toCam = Math.atan2(cam.position.x - x, cam.position.z - z);
    let dy = toCam - P.yaw[i]; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); const yaw = P.yaw[i] + dy * k; setI(P.m[0], i, x, y, z, sc, sc, sc, yaw); P.mod.push(i);
    if (n < P.NA && k > 0.01) { const side = hash(i * 4.9) > 0.5 ? 1 : -1, rx = Math.cos(yaw) * side, rz = -Math.sin(yaw) * side, ang = 0.42 + 0.4 * Math.sin(t * 9.5 + P.ph[i] * 3), up = popK(k);
      _IP.set(x + rx * 0.5 * sc, y + 1.2 * sc, z + rz * 0.5 * sc); _IQ.setFromUnitVectors(_IS.set(0, 1, 0), _IE2.set(rx * Math.sin(ang), Math.cos(ang), rz * Math.sin(ang)).normalize()); _IS.set(sc * up, sc * up, sc * up); _IM.compose(_IP, _IQ, _IS); P.arms.setMatrixAt(n, _IM); P.arms.setColorAt(n, _IC.set(P.skinC[P.skin[i]])); n++; } }
  for (let j = n; j < (P.armN || 0); j++) { _IP.set(0, -50, 0); _IS.set(1e-4, 1e-4, 1e-4); _IM.compose(_IP, _IQ.identity(), _IS); P.arms.setMatrixAt(j, _IM); } P.armN = n;
  P.m[0].instanceMatrix.needsUpdate = P.arms.instanceMatrix.needsUpdate = P.arms.instanceColor.needsUpdate = true;
  const g = clamp(o.ghost ?? 0), out = clamp(o.ghostOut ?? 0); for (const m of P.g) m.visible = g > 0.001 && out < 0.999;
  if (P.g[0].visible) { for (let i = 0; i < P.NG; i++) { const k = popK(clamp(g * (P.NG + 60) / 60 - i / 60)) * (1 - out); setI(P.g[0], i, P.gx[i], 0.06 + (1 - Math.min(1, k)) * 5, P.gz[i], k, k, k, i); } P.g[0].instanceMatrix.needsUpdate = true; }
}
// para el montaje (en local): { p: personas con nombre [i, x, y, px/m × 10], h: hogares con sus 5 nombres [n, x, y, px/m × 10] }
window.labelsAt = function (t) {
  frame(t); const r = v => Math.round(v), p = nearPeople(t, PEOPLE.cheer).map(q => [q[0], r(q[1]), r(q[2]), r(q[3] * 10)]), h = [], e = vpOf().elements, f = (H / 2) / Math.tan(cam.fov * Math.PI / 360);
  const tentK = 1 - sm5(seg(t, TL.town, TL.town + 0.5)) * (1 - sm5(seg(t, TL.back0 + 0.6, TL.back1)));                                     // los hogares de hoy (las tiendas) solo llevan cartel mientras se ven
  if (tentK > 0.5) for (let n = 0; n < CITY.NH; n++) { const q = CITY.homes[n], x = q.x, y = 4.6, z = q.z, cw = e[3] * x + e[7] * y + e[11] * z + e[15]; if (cw <= 1) continue; const ppm = f / cw; if (ppm < 80) continue;
    const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / cw + 1) / 2 * W, sy = (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / cw) / 2 * H; if (sx < -200 || sx > W + 200 || sy < -40 || sy > H + 300) continue; h.push([n, r(sx), r(sy), r(ppm * 10)]); }
  return { p, h };
};
