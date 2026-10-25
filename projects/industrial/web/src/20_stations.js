
// ---------------------------------------------------------------- 3 · la línea de producción: una estación por asignatura, compuesta en VERTICAL (formato 9:16)
// Todas miran hacia +z; la cámara las recorre. Encuadre de referencia: a 6,5 m se ven ~2,4 m de ancho y ~4,2 m de alto.
const SX = { base: 0, struct: 9, thermo: 18, elec: 27, auto: 36, mat: 45, biz: 54, careers: 63 };
function textPlane(lines, { size = 110, color = '#ffffff', weight = 900, w = 2, glow = null, blur = 0 } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = `${weight} ${size}px Inter`;
  const tw = Math.max(...lines.map(l => g.measureText(l).width)), pad = size * 0.5 + blur;
  c.width = Math.ceil(tw + 2 * pad); c.height = Math.ceil(lines.length * size * 1.12 + 2 * pad);
  g.font = `${weight} ${size}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (glow) { g.shadowColor = glow; g.shadowBlur = blur; }
  g.fillStyle = color; lines.forEach((l, i) => g.fillText(l, c.width / 2, pad + size * 0.56 + i * size * 1.12));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 8; return m;
}
function neon2(txt, color = '#7fe6ff', w = 2.0) {        // rótulo de neón (admite dos líneas con \n)
  const lines = txt.split('\n'), g = new THREE.Group();
  const glow = textPlane(lines, { color, w: w * 1.08, glow: color, blur: 40 }); glow.position.z = -0.01; g.add(glow);
  const l = textPlane(lines, { color: '#ffffff', w }); g.add(l);
  const hgt = w * l.geometry.parameters.height / l.geometry.parameters.width;
  const plate = rbox(w * 1.12, hgt * 1.0, 0.06, new THREE.MeshStandardMaterial({ color: 0x0c0f16, roughness: 0.4, metalness: 0.3 }), 0.03); plate.position.z = -0.05; g.add(plate);
  g.userData = { l, glow, col: new THREE.Color(color), h: hgt }; return g;
}
function station(name, sign, color = '#7fe6ff', w = 3.4, signW = 2.0, signY = 4.15) {
  const Z = zone(name, SX[name]);
  const pl = rbox(w, 0.15, 3.0, plastic(0x141823, 0.3), 0.06); pl.position.y = 0.075; Z.add(pl);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.025, 0.025), glowM(new THREE.Color(color).getHex(), 2.4)); strip.position.set(0, 0.13, 1.5); Z.add(strip);
  let n = null;
  if (sign) { n = neon2(sign, color, signW); n.position.set(0, signY, -1.25); Z.add(n);
    for (const s of [-1, 1]) { const p = cyl(0.035, 0.035, signY, MAT.dsteel, 12); p.position.set(s * signW * 0.52, signY / 2, -1.31); Z.add(p); } }
  return { Z, n, strip };
}
function iconFace(kind) {
  return iconTex((g, w, h) => {
    g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (kind === 0) { g.font = '700 330px Serif'; g.fillText('∫', w / 2 - 40, h / 2 + 10); g.font = 'italic 700 120px Serif'; g.fillText('dx', w / 2 + 110, h / 2 + 60); }
    if (kind === 1) { g.lineWidth = 18; g.beginPath(); g.moveTo(130, 110); g.lineTo(95, 110); g.lineTo(95, 400); g.lineTo(130, 400); g.moveTo(382, 110); g.lineTo(417, 110); g.lineTo(417, 400); g.lineTo(382, 400); g.stroke();
      g.font = '800 70px Inter'; const M = [[2, 0, 1], [1, 3, 0], [0, 1, 4]]; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g.fillText(M[r][c], 170 + c * 86, 165 + r * 92); }
    if (kind === 2) { g.beginPath(); g.arc(225, 300, 105, 0, 7); g.fill(); g.beginPath(); g.moveTo(225, 195); g.quadraticCurveTo(240, 140, 275, 120); g.stroke();
      g.lineWidth = 16; g.beginPath(); g.moveTo(390, 120); g.lineTo(390, 330); g.stroke(); g.beginPath(); g.moveTo(350, 300); g.lineTo(390, 350); g.lineTo(430, 300); g.stroke();
      g.font = '800 64px Inter'; g.fillText('F = m·a', w / 2, 460); }
    if (kind === 3) { const cx = w / 2, cy = h / 2 - 10, R = 110; g.lineWidth = 18; g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.beginPath(); g.arc(cx, cy, 62, 0, 7); g.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g.beginPath(); g.arc(cx + Math.cos(a) * R * 1.5, cy + Math.sin(a) * R * 1.5, 18, 0, 7); g.fill(); g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * R * 1.36, cy + Math.sin(a) * R * 1.36); g.stroke(); } }
    if (kind === 4) { g.lineWidth = 14; g.strokeRect(120, 150, 270, 200); g.beginPath(); g.arc(255, 250, 55, 0, 7); g.stroke();
      g.lineWidth = 8; g.beginPath(); g.moveTo(120, 410); g.lineTo(390, 410); g.moveTo(120, 395); g.lineTo(120, 425); g.moveTo(390, 395); g.lineTo(390, 425); g.moveTo(440, 150); g.lineTo(440, 350); g.moveTo(425, 150); g.lineTo(455, 150); g.moveTo(425, 350); g.lineTo(455, 350); g.stroke();
      g.font = '700 46px Inter'; g.fillText('120', 255, 455); g.save(); g.translate(480, 250); g.rotate(-Math.PI / 2); g.fillText('80', 0, 0); g.restore(); }
  });
}
// ---- 3.0 la base: cinco bloques que caen y se apilan en una torre (los cimientos) y la fábrica se posa encima
const BLKH = 0.58;
function buildBase() {
  const st = station('base', 'LA BASE', '#7fe6ff', 3.4, 1.5, 4.55); S.stBase = st;
  const cols = [PL.blue, PL.violet, PL.green, PL.orange, PL.teal], names = ['CÁLCULO', 'ÁLGEBRA', 'FÍSICA', 'QUÍMICA', 'DIBUJO TÉCNICO'];
  S.blocks = cols.map((c, i) => { const b = rbox(0.72, BLKH, 0.72, plastic(c, 0.2), 0.07); st.Z.add(b);
    const f = facePlane(iconFace(i), 0.5, 0.5); f.position.z = 0.361; b.add(f);
    const l = pill(names[i], '#ffffff', 'rgba(16,20,30,.92)', i === 4 ? 1.05 : 0.78, 66); st.Z.add(l); return { b, l }; });
  S.bDust = sparks(st.Z, 60, 0xcfe6ff, 0.05);
  const slab = new THREE.Group(); st.Z.add(slab); S.slab = slab;
  const sl = rbox(1.9, 0.09, 1.1, plastic(0xe9edf3, 0.3), 0.03); slab.add(sl);
  const fac = new THREE.Group(); fac.position.y = 0.045; slab.add(fac); S.fac = fac;
  const hall = rbox(1.1, 0.42, 0.7, plastic(0xf3f5f9, 0.25), 0.04); hall.position.set(-0.25, 0.21, 0); fac.add(hall);
  for (let i = 0; i < 3; i++) { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.366, 0); s.lineTo(0.366, 0.22); s.closePath(); const r = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: false }), plastic(PL.sky, 0.25)); r.castShadow = true; r.position.set(-0.8 + i * 0.366, 0.42, -0.35); fac.add(r); }
  const ch = cyl(0.07, 0.085, 0.75, plastic(PL.red, 0.25), 20); ch.position.set(0.48, 0.375, -0.12); fac.add(ch);
  const tank = cyl(0.15, 0.15, 0.32, plastic(PL.yellow, 0.2), 24); tank.position.set(0.72, 0.16, 0.18); fac.add(tank);
  for (let i = 0; i < 4; i++) { const wdw = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), glowM(0xffd88a, 1.6)); wdw.position.set(-0.6 + i * 0.24, 0.24, 0.351); fac.add(wdw); }
  S.smoke = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(40 * 3), 3)), new THREE.PointsMaterial({ color: 0xdfe7f5, size: 0.2, map: discTex, transparent: true, depthWrite: false, opacity: 0.5 })); S.smoke.frustumCulled = false; fac.add(S.smoke);
}
function baseAt(t) {
  const st = S.stBase; neonOn2(st.n, clamp((t - K.base1) / 0.25), t);
  const T = [K.calculo, K.algebra, K.fisica, K.quimica, K.dibujo];
  let last = -1;
  S.blocks.forEach((o, i) => {
    const u = clamp((t - (T[i] - 0.28)) / 0.28), y0 = 0.15 + BLKH / 2 + i * BLKH;
    const fall = u < 1 ? lerp(y0 + 2.6, y0, u * u) : y0 + 0.05 * Math.exp(-(t - T[i]) * 10) * Math.abs(Math.sin((t - T[i]) * 20));
    o.b.visible = u > 0; o.b.position.set(0, fall, 0); o.b.rotation.set(0, (1 - u) * 0.8 + 0.12 * Math.sin(i * 2.1), 0);
    const sq = t > T[i] ? 0.1 * Math.exp(-(t - T[i]) * 11) : 0; o.b.scale.set(1 + sq, 1 - sq, 1 + sq);
    lookLab(o.l, env(t, T[i] + 0.04, 99, 0.2, 0.2), v3(i % 2 ? -0.74 : 0.74, y0, 0.45)); o.l.scale.setScalar(0.56);
    if (t > T[i]) last = i;
  });
  if (last >= 0 && t - T[last] < 0.6) { S.bDust.visible = true; burst(S.bDust, v3(0, 0.15 + last * BLKH, 0.2), t, T[last], 0.45, 0.6, false, 0.4); S.bDust.material.opacity = 1 - (t - T[last]) / 0.6; } else S.bDust.visible = false;
  const sk = clamp((t - (K.tecnico - 0.05)) / 0.26), y1 = 0.15 + 5 * BLKH + 0.045;
  S.slab.visible = sk > 0; S.slab.position.set(0, sk < 1 ? lerp(y1 + 2.4, y1, sk * sk) : y1 + 0.03 * Math.exp(-(t - K.tecnico - 0.21) * 9) * Math.abs(Math.sin((t - K.tecnico) * 18)), 0);
  const fk = pop(t, K.tecnico + 0.2, 0.35); S.fac.visible = fk > 0.01; S.fac.scale.set(1, Math.max(0.001, fk), 1);
  const a = S.smoke.geometry.attributes.position.array; for (let i = 0; i < 40; i++) { const tt = (t * 0.6 + hash(i)) % 1; a[i * 3] = 0.48 + 0.12 * Math.sin(i + t); a[i * 3 + 1] = 0.8 + tt * 1.0; a[i * 3 + 2] = -0.12 + 0.08 * Math.cos(i * 2 + t); } S.smoke.geometry.attributes.position.needsUpdate = true; S.smoke.material.opacity = 0.45 * fk;
  return camKeys(t, [
    [K.base0 - 0.3, [0.5, 1.2, 5.6], [0.0, 1.0, 0], 36],
    [K.calculo + 0.15, [0.2, 1.0, 5.6], [0.0, 0.75, 0], 36],
    [K.fisica + 0.1, [0.25, 1.55, 6.0], [0.0, 1.3, 0], 36],
    [K.dibujo + 0.2, [0.3, 2.25, 6.4], [0.0, 1.95, 0], 36],
    [K.tecnico + 0.45, [0.9, 2.9, 6.9], [0.05, 2.35, 0], 36],
  ], st.Z);
}
// ---- 3.1 estructuras y máquinas: arriba la celosía, debajo los engranajes, en medio la viga que aguanta la carga y a la derecha la biela-manivela
function beamGeo(L = 1.7, nx = 50) {
  const s = new THREE.Shape(), hw = 0.12, hh = 0.14, tw = 0.026, tf = 0.032;
  s.moveTo(-hw, -hh); s.lineTo(hw, -hh); s.lineTo(hw, -hh + tf); s.lineTo(tw, -hh + tf); s.lineTo(tw, hh - tf); s.lineTo(hw, hh - tf); s.lineTo(hw, hh); s.lineTo(-hw, hh); s.lineTo(-hw, hh - tf); s.lineTo(-tw, hh - tf); s.lineTo(-tw, -hh + tf); s.lineTo(-hw, -hh + tf); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: L, steps: nx, bevelEnabled: false }); g.translate(0, 0, -L / 2); g.rotateY(Math.PI / 2);
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  g.userData.base = g.attributes.position.array.slice(); g.userData.L = L; return g;
}
const BEAM_X = -0.35, BEAM_Y = 1.15, BEAM_Z = 0.35;
function buildStruct() {
  const st = station('struct', 'ESTRUCTURAS\nY MÁQUINAS', '#ffb15a', 3.4, 1.9, 4.6); S.stStruct = st; const Z = st.Z;
  S.truss = []; const m = MAT.steel, P = []; const x0 = -1.15, x1 = 1.15, n = 5, hgt = 0.5, yb = 2.75;
  for (let i = 0; i <= n; i++) P.push([v3(lerp(x0, x1, i / n), yb, -0.5), v3(lerp(x0, x1, (i + 0.5) / n), yb + hgt, -0.5)]);
  for (let i = 0; i < n; i++) { S.truss.push(bar(P[i][0], P[i + 1][0], 0.026, m), bar(P[i][0], P[i][1], 0.02, m), bar(P[i][1], P[i + 1][0], 0.02, m)); if (i < n - 1) S.truss.push(bar(P[i][1], P[i + 1][1], 0.026, m)); }
  S.truss.forEach(b => Z.add(b));
  S.tPosts = [x0, x1].map(x => { const p = cyl(0.06, 0.08, yb - 0.15, plastic(0x3a4256, 0.3), 16); p.position.set(x, (yb - 0.15) / 2 + 0.15, -0.5); Z.add(p); return p; });
  S.g1 = gear(14, 0.3, 0.12, plastic(PL.orange, 0.22)); S.g1.position.set(0.55, 2.05, -0.75); Z.add(S.g1);
  S.g2 = gear(9, 0.19, 0.12, plastic(PL.sky, 0.22)); S.g2.position.set(0.55 + 0.3 + 0.19 + 0.08, 2.05, -0.75); Z.add(S.g2);
  S.beamG = beamGeo(1.7); S.beam = new THREE.Mesh(S.beamG, new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.25, metalness: 0.35, clearcoat: 0.6 })); S.beam.castShadow = true; S.beam.position.set(BEAM_X, BEAM_Y, BEAM_Z); Z.add(S.beam);
  S.supports = [-1, 1].map(s => { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.17, BEAM_Y - 0.15 - 0.14, 3), plastic(0x3a4256, 0.3)); sp.position.set(BEAM_X + s * 0.78, 0.15 + (BEAM_Y - 0.29) / 2, BEAM_Z); sp.rotation.y = Math.PI / 6; sp.castShadow = true; Z.add(sp); return sp; });
  S.load = rbox(0.44, 0.36, 0.36, plastic(0x2b2f38, 0.35), 0.05); Z.add(S.load);
  const hz = facePlane(canvasTex(256, 64, (q, w, h) => { for (let i = -2; i < 12; i++) { q.fillStyle = i % 2 ? '#ffc21a' : '#111'; q.beginPath(); q.moveTo(i * 24, 0); q.lineTo(i * 24 + 24, 0); q.lineTo(i * 24 + 8, h); q.lineTo(i * 24 - 16, h); q.fill(); } }), 0.44, 0.08); hz.position.set(0, -0.1, 0.181); S.load.add(hz);
  S.fDown = arrow(0.5, plastic(PL.red, 0.25), 0.04); S.fDown.rotation.z = Math.PI; Z.add(S.fDown);
  S.fUp = [-1, 1].map(() => { const a = arrow(0.42, plastic(PL.green, 0.25), 0.035); Z.add(a); return a; });
  const M = new THREE.Group(); M.position.set(0.95, 0.62, 0.55); Z.add(M); S.mech = M;
  S.wheel = cyl(0.26, 0.26, 0.07, plastic(PL.yellow, 0.2), 40); S.wheel.rotation.x = Math.PI / 2; M.add(S.wheel);
  const hub = cyl(0.05, 0.05, 0.12, MAT.steel, 16); hub.rotation.x = Math.PI / 2; M.add(hub);
  S.pin = cyl(0.035, 0.035, 0.14, MAT.steel, 12); S.pin.rotation.x = Math.PI / 2; M.add(S.pin);
  S.rod = rbox(0.05, 0.7, 0.04, MAT.steel, 0.018); M.add(S.rod);
  S.piston = rbox(0.24, 0.18, 0.16, plastic(PL.sky, 0.2), 0.04); M.add(S.piston);
  const gd = rbox(0.34, 1.0, 0.04, plastic(0x2a2f3a, 0.3), 0.02); gd.position.set(0, 0.8, -0.1); M.add(gd);
}
function structAt(t) {
  const st = S.stStruct, Z = st.Z; neonOn2(st.n, clamp((t - K.estructuras) / 0.25), t);
  S.truss.forEach((b, i) => { const k = pop(t, K.estructuras + i * 0.022, 0.25); b.visible = k > 0.01; b.scale.set(1, Math.max(0.001, k), 1); });
  S.tPosts.forEach(p => { const k = pop(t, K.estructuras - 0.05, 0.3); p.visible = k > 0.01; p.scale.set(1, Math.max(0.001, k), 1); });
  const gk = pop(t, K.maquinas, 0.35); show(S.g1, gk); show(S.g2, gk);
  const run = clamp((t - K.maquinas) / 0.6), mv = clamp((t - K.mueve) / 0.5), sp = 1.4 * run + 2.4 * mv;
  const ang = (t - K.maquinas) * sp; S.g1.rotation.z = ang; S.g2.rotation.z = -ang * 0.3 / 0.19 + 0.2;
  const vk = pop(t, K.viga - 0.05, 0.35); show(S.beam, vk); S.supports.forEach(s => show(s, vk));
  const tl = K.aguanta + 0.05, lu = clamp((t - (tl - 0.26)) / 0.26);
  S.load.visible = lu > 0;
  let dmax = 0; if (t > tl) { const q = t - tl; dmax = 0.06 + 0.06 * Math.exp(-q * 5) * Math.cos(q * 22); }
  const g = S.beamG, a = g.attributes.position.array, b = g.userData.base, col = g.attributes.color.array, sup = 0.78;
  const tint = clamp(dmax * 14);
  for (let i = 0; i < a.length; i += 3) { const u = clamp(Math.abs(b[i]) / sup); const dfl = dmax * (1 - u * u) * (1 + 0.5 * (1 - u)) / 1.5;
    a[i + 1] = b[i + 1] - dfl; const s2 = (1 - u) * clamp(dmax / 0.08); _c.setHSL(0.6 - 0.6 * s2, 0.85, 0.55); col[i] = lerp(0.86, _c.r, tint); col[i + 1] = lerp(0.88, _c.g, tint); col[i + 2] = lerp(0.92, _c.b, tint); }
  g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeVertexNormals();
  const ly = BEAM_Y + 0.14 + 0.18;
  S.load.position.set(BEAM_X, (lu < 1 ? lerp(ly + 2.2, ly, lu * lu) : ly) - dmax, BEAM_Z);
  const fk = env(t, tl + 0.05, 99, 0.2, 0.3); S.fDown.visible = fk > 0.01; S.fDown.position.set(BEAM_X, ly + 0.75 - dmax + 0.12 * (1 - fk), BEAM_Z); S.fDown.scale.setScalar(Math.max(0.001, fk));
  S.fUp.forEach((ar, i) => { ar.visible = fk > 0.01; ar.position.set(BEAM_X + (i ? 1 : -1) * 0.78, 0.18, BEAM_Z + 0.42); ar.scale.setScalar(Math.max(0.001, fk)); });
  const mk = pop(t, K.como1 - 0.1, 0.35); show(S.mech, mk);
  const th = (t - K.como1) * 7 * clamp((t - K.mueve + 0.2) / 0.5), r = 0.19, px = Math.cos(th) * r, py = Math.sin(th) * r, Lr = 0.7;
  S.wheel.rotation.y = th; S.pin.position.set(px, py, 0.07);
  const sy = py + Math.sqrt(Lr * Lr - px * px); S.piston.position.set(0, sy + 0.09, 0.0);
  S.rod.position.set(px / 2, (py + sy) / 2, 0.05); S.rod.rotation.z = Math.atan2(px, sy - py);
  return camKeys(t, [
    [K.estructuras - 0.3, [0.4, 2.6, 6.8], [0.0, 2.55, -0.3], 36],
    [K.maquinas + 0.3, [0.5, 2.3, 6.6], [0.2, 2.15, -0.3], 36],
    [K.viga, [-0.1, 1.55, 4.2], [-0.3, 1.25, 0.35], 36],
    [K.aguanta + 0.5, [-0.15, 1.5, 3.9], [-0.32, 1.25, 0.35], 36],
    [K.mueve, [0.6, 1.4, 3.9], [0.9, 1.15, 0.5], 36],
    [K.mecanismo + 0.6, [0.85, 1.35, 3.4], [0.95, 1.12, 0.5], 36],
  ], Z);
}
// ---- 3.2 termodinámica y fluidos: motor de cilindro transparente (el calor empuja el pistón) y turbina Pelton
function buildThermo() {
  const st = station('thermo', 'TERMODINÁMICA\nY FLUIDOS', '#ff8a5a', 3.4, 2.0, 4.4); S.stThermo = st; const Z = st.Z;
  const E = new THREE.Group(); E.position.set(-0.72, 0.15, 0.15); Z.add(E); S.eng = E;
  const blk = rbox(0.8, 0.55, 0.6, plastic(0x2b303b, 0.3), 0.06); blk.position.y = 0.42; E.add(blk);
  S.cylG = cyl(0.25, 0.25, 1.0, MAT.glass, 40); S.cylG.position.y = 1.2; E.add(S.cylG); S.cylG.castShadow = false;
  const head = cyl(0.29, 0.29, 0.1, plastic(0x2b303b, 0.3), 40); head.position.y = 1.75; E.add(head);
  const plug = cyl(0.04, 0.04, 0.16, MAT.steel, 12); plug.position.y = 1.86; E.add(plug);
  S.pist = cyl(0.23, 0.23, 0.18, MAT.steel, 40); E.add(S.pist);
  S.prod = rbox(0.05, 0.62, 0.04, MAT.steel, 0.018); E.add(S.prod);
  S.fly = new THREE.Group(); S.fly.position.set(0, 0.42, 0.4); E.add(S.fly);
  const fw = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.055, 12, 48), MAT.steel); fw.castShadow = true; S.fly.add(fw);
  for (let i = 0; i < 5; i++) { const sp2 = rbox(0.045, 0.68, 0.035, MAT.steel, 0.01); sp2.rotation.z = i / 5 * Math.PI; S.fly.add(sp2); }
  S.fire = sph(0.2, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending })); E.add(S.fire);
  S.fireCore = sph(0.1, new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending })); E.add(S.fireCore);
  S.tongues = []; for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 10), new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending })); c.rotation.x = Math.PI; E.add(c); S.tongues.push(c); }
  S.heatG = cyl(0.245, 0.245, 0.5, new THREE.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 40); S.heatG.position.y = 1.45; E.add(S.heatG);
  S.heat = sparks(E, 50, 0xff9a40, 0.06);
  const T = new THREE.Group(); T.position.set(0.72, 0.15, 0.3); Z.add(T); S.turb = T;
  const stand = rbox(0.24, 0.95, 0.24, plastic(0x2b303b, 0.3), 0.04); stand.position.set(0, 0.47, -0.25); T.add(stand);
  S.wheelT = new THREE.Group(); S.wheelT.position.set(0, 1.05, 0); T.add(S.wheelT);
  const disc = cyl(0.34, 0.34, 0.07, plastic(PL.sky, 0.2), 48); disc.rotation.x = Math.PI / 2; S.wheelT.add(disc);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, cup = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 10, 0, Math.PI), MAT.steel); cup.position.set(Math.cos(a) * 0.41, Math.sin(a) * 0.41, 0); cup.rotation.z = a + Math.PI / 2; cup.rotation.y = Math.PI / 2; cup.castShadow = true; S.wheelT.add(cup); }
  const noz = cyl(0.055, 0.09, 0.36, MAT.dsteel, 20); noz.rotation.z = Math.PI / 2; noz.position.set(0.62, 1.05 + 0.43, 0); T.add(noz);
  const pipe = tube([v3(0.8, 1.48, 0), v3(0.98, 1.48, 0), v3(1.05, 1.1, 0), v3(1.05, 0.15, 0)], 0.065, plastic(PL.blue, 0.25), 30); T.add(pipe);
  S.water = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0x5fc8ff, roughness: 0.05, clearcoat: 1, emissive: 0x062c4a, emissiveIntensity: 0.5 }), 80); S.water.frustumCulled = false; T.add(S.water);
  S.spray = sparks(T, 50, 0x9fdcff, 0.04);
}
function thermoAt(t) {
  const st = S.stThermo; neonOn2(st.n, clamp((t - K.termo) / 0.25), t);
  const heat = env(t, K.calor, 99, 0.25, 0.3), rpm = clamp((t - K.mueve2 + 0.1) / 0.5) * 9 + heat * 1.5;
  const th = (t - K.calor) * rpm, r = 0.16, Lr = 0.56;
  S.fly.rotation.z = -th;
  const px = Math.sin(th) * r, py = Math.cos(th) * r, sy = py + Math.sqrt(Lr * Lr - px * px);
  S.pist.position.set(0, 0.42 + sy + 0.12, 0.02); S.prod.position.set(px / 2, 0.42 + (py + sy) / 2, 0.1); S.prod.rotation.z = -Math.atan2(px, sy - py);
  const comb = Math.pow(0.5 + 0.5 * Math.cos(th), 3);
  S.fire.visible = S.fireCore.visible = heat > 0.01; S.fire.position.set(0, 1.58, 0.02); S.fireCore.position.copy(S.fire.position);
  S.fire.scale.setScalar(Math.max(0.001, heat * (0.55 + 0.6 * comb))); S.fire.material.color.setRGB(2.2 * heat, 0.9 * heat, 0.2 * heat);
  S.fireCore.scale.setScalar(Math.max(0.001, heat * (0.4 + 0.7 * comb))); S.fireCore.material.color.setRGB(2.6 * heat, 1.7 * heat, 0.5 * heat);
  S.tongues.forEach((c, i) => { const a = i / 7 * Math.PI * 2 + t * 3, fl = 0.6 + 0.4 * Math.sin(t * 37 + i * 2.3); c.visible = heat > 0.01; c.position.set(Math.cos(a) * 0.12, 1.5 - 0.1 * comb, 0.02 + Math.sin(a) * 0.12); c.scale.set(1, Math.max(0.001, heat * fl * (0.6 + 0.9 * comb)), 1); c.material.color.setRGB(2.2 * heat, 0.8 * heat, 0.15 * heat); });
  S.heatG.material.opacity = 0.12 * heat * (0.5 + comb);
  S.heat.visible = heat > 0.01; if (S.heat.visible) { burst(S.heat, v3(0, 1.85, 0), t, 0, 0.22, 1.0, true, -0.5); S.heat.material.opacity = heat * 0.9; }
  const wk = clamp((t - K.agua) / 0.2), tk = clamp((t - K.turbina + 0.15) / 0.6);
  S.wheelT.rotation.z = -(t - K.turbina) * 9 * tk - 0.6 * wk * Math.max(0, t - K.agua);
  for (let i = 0; i < 80; i++) { const u = ((t * 2.6 + i / 80) % 1); const p = v3(lerp(0.46, 0.38, u), 1.48 - 0.02 * u, 0.025 * Math.sin(i * 7)); _s.setScalar(wk); _m4.compose(p, _q.identity(), _s); S.water.setMatrixAt(i, _m4); }
  S.water.instanceMatrix.needsUpdate = true; S.water.visible = wk > 0;
  S.spray.visible = wk > 0; if (wk > 0) { burst(S.spray, v3(0.36, 1.46, 0), t, 0, 0.3, 0.45, true, 3); S.spray.material.opacity = 0.8 * wk; }
  return camKeys(t, [
    [K.termo - 0.3, [0.2, 1.9, 6.4], [0.0, 1.3, 0], 36],
    [K.calor, [-0.5, 1.55, 3.8], [-0.7, 1.25, 0.15], 36],
    [K.motor + 0.3, [-0.55, 1.4, 3.6], [-0.72, 1.05, 0.15], 36],
    [K.agua, [0.5, 1.45, 3.7], [0.72, 1.2, 0.3], 36],
    [K.turbina + 0.4, [0.75, 1.35, 3.3], [0.75, 1.1, 0.3], 36],
  ], st.Z);
}
// ---- 3.3 electricidad y electrónica: placa DE PIE con pistas que se encienden, el chip en el centro y un motor delante
function buildElec() {
  const st = station('elec', 'ELECTRICIDAD\nY ELECTRÓNICA', '#5ff0b0', 3.4, 2.1, 4.5); S.stElec = st; const Z = st.Z;
  const B = new THREE.Group(); B.position.set(0, 2.0, -0.35); Z.add(B); S.board = B;
  const pcb = rbox(1.8, 2.3, 0.07, plastic(0x0f6b46, 0.35), 0.04); B.add(pcb);
  for (const s of [-1, 1]) { const leg = cyl(0.03, 0.03, 1.0, MAT.dsteel, 10); leg.position.set(s * 0.7, -1.6, -0.02); B.add(leg); }
  S.paths = [];
  const P = [[[-0.7, -0.95], [-0.7, -0.15], [-0.32, -0.15]], [[-0.7, 0.95], [-0.45, 0.95], [-0.45, 0.15], [-0.32, 0.15]], [[0.32, 0.15], [0.55, 0.15], [0.55, 0.9], [0.75, 0.9]], [[0.32, -0.15], [0.62, -0.15], [0.62, -0.95]], [[-0.15, -0.32], [-0.15, -0.75], [0.25, -0.75], [0.25, -1.05]], [[0.0, 0.32], [0.0, 0.7], [-0.25, 0.7], [-0.25, 1.05]]];
  for (const path of P) { const pts = path.map(([x, y]) => v3(x, y, 0.04)); for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], d = b.clone().sub(a); const tr = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(d.x) + 0.035, Math.abs(d.y) + 0.035, 0.01), MAT.copper); tr.position.copy(a).add(b).multiplyScalar(0.5); B.add(tr); }
    let L = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const l = pts[i].distanceTo(pts[i + 1]); seg.push([pts[i], pts[i + 1], L, l]); L += l; } S.paths.push({ seg, L }); }
  for (let i = 0; i < 6; i++) { const c = cyl(0.05, 0.05, 0.15, plastic([PL.sky, 0x222222, PL.yellow][i % 3], 0.3), 16); c.rotation.x = Math.PI / 2; c.position.set(0.35 + (i % 2) * 0.17, -0.55 - Math.floor(i / 2) * 0.16, 0.1); B.add(c); }
  for (let i = 0; i < 3; i++) { const rs = rbox(0.16, 0.05, 0.05, plastic(0xd9b98a, 0.4), 0.02); rs.position.set(-0.5, 0.45 + i * 0.12, 0.06); B.add(rs); }
  S.pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 12, 8), glowM(0x9ffff0, 3.2), 36); S.pulses.frustumCulled = false; B.add(S.pulses);
  S.chip = new THREE.Group(); B.add(S.chip);
  const cb = rbox(0.52, 0.52, 0.09, plastic(0x15181f, 0.3), 0.03); S.chip.add(cb);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const p = rbox(0.035, 0.08, 0.025, MAT.steel, 0.006); p.position.set(-0.21 + i * 0.085, s * 0.29, -0.02); S.chip.add(p); const q = p.clone(); q.rotation.z = Math.PI / 2; q.position.set(s * 0.29, -0.21 + i * 0.085, -0.02); S.chip.add(q); }
  S.chipLed = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), new THREE.MeshBasicMaterial({ color: 0x37e0ff, toneMapped: false })); S.chipLed.position.set(0.17, 0.17, 0.047); S.chip.add(S.chipLed);
  const M = new THREE.Group(); M.position.set(0.55, 0.42, 0.75); M.rotation.y = -0.5; Z.add(M); S.emot = M;
  const body = cyl(0.24, 0.24, 0.6, plastic(PL.blue, 0.22), 40); body.rotation.z = Math.PI / 2; M.add(body);
  for (let i = 0; i < 8; i++) { const fin = cyl(0.265, 0.265, 0.018, MAT.dsteel, 40); fin.rotation.z = Math.PI / 2; fin.position.x = -0.24 + i * 0.068; M.add(fin); }
  const ft = rbox(0.5, 0.1, 0.34, plastic(0x2a2f3a, 0.3), 0.03); ft.position.y = -0.26; M.add(ft);
  S.shaft = new THREE.Group(); S.shaft.position.x = -0.36; M.add(S.shaft);
  const sh = cyl(0.035, 0.035, 0.16, MAT.steel, 12); sh.rotation.z = Math.PI / 2; S.shaft.add(sh);
  for (let i = 0; i < 3; i++) { const bl = rbox(0.025, 0.34, 0.1, plastic(PL.yellow, 0.2), 0.02); bl.position.set(-0.08, 0.16, 0); const piv = new THREE.Group(); piv.rotation.x = i / 3 * Math.PI * 2; piv.add(bl); bl.rotation.y = 0.5; S.shaft.add(piv); }
  S.coil = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.016, 8, 48), glowM(0xff8a3a, 3)); S.coil.rotation.y = Math.PI / 2; S.coil.position.x = 0.3; M.add(S.coil);
  S.wire = tube([v3(0.62, 0.95, -0.3), v3(0.85, 0.55, 0.0), v3(0.95, 0.3, 0.55), v3(0.82, 0.42, 0.75)], 0.022, plastic(PL.red, 0.3), 30); Z.add(S.wire);
}
function elecAt(t) {
  const st = S.stElec; neonOn2(st.n, clamp((t - K.electricidad) / 0.25), t);
  const ck = clamp((t - K.circuitos) / 0.3), chip = clamp((t - (K.chips - 0.25)) / 0.25), ctl = clamp((t - K.controlan) / 0.2);
  let n = 0;
  S.paths.forEach((p, pi) => { for (let k = 0; k < 6; k++) { const u = ((t * 0.9 + k / 6 + pi * 0.13) % 1) * p.L; const sg = p.seg.find(s => u >= s[2] && u <= s[2] + s[3]) || p.seg[p.seg.length - 1];
    const pos = sg[0].clone().lerp(sg[1], clamp((u - sg[2]) / sg[3])); pos.z = 0.06; _s.setScalar(ck * (pi < 4 || chip > 0.5 ? 1 : 0)); _m4.compose(pos, _q.identity(), _s); S.pulses.setMatrixAt(n++, _m4); } });
  S.pulses.instanceMatrix.needsUpdate = true; S.pulses.visible = ck > 0;
  S.chip.visible = chip > 0; S.chip.position.set(0, 0, 0.08 + (1 - chip * chip) * 1.4); S.chip.rotation.z = (1 - chip) * 0.8;
  S.chipLed.material.color.setRGB(0.3 + 2.6 * (chip >= 1 && Math.sin(t * 14) > 0 ? 1 : 0), 1.4 * (chip >= 1 ? 1 : 0.3), 1.6 * (chip >= 1 ? 1 : 0.3));
  const mk = pop(t, K.motores - 0.1, 0.35); show(S.emot, mk); S.wire.visible = mk > 0.5;
  const spd = 14 * clamp((t - K.motores) / 0.5) * (ctl > 0 ? (0.55 + 0.45 * (Math.sin((t - K.controlan) * 7) > 0 ? 1 : 0.2)) : 1);
  S.shaft.rotation.x = (t - K.motores) * spd; S.coil.material.emissiveIntensity = 0.5 + 3 * clamp((t - K.motores) / 0.4) * (0.7 + 0.3 * Math.sin(t * 20));
  return camKeys(t, [
    [K.electricidad - 0.3, [0.3, 2.3, 6.6], [0.0, 2.0, -0.3], 36],
    [K.circuitos + 0.2, [0.2, 2.15, 5.0], [0.0, 2.0, -0.35], 36],
    [K.motores + 0.2, [0.4, 0.95, 3.6], [0.5, 0.55, 0.7], 36],
    [K.chips, [0.15, 2.05, 3.4], [0.0, 2.0, -0.35], 36],
    [K.controlan + 0.5, [0.35, 1.7, 5.4], [0.1, 1.45, 0.0], 36],
  ], st.Z);
}
// ---- 3.4 automática: cinta que viene HACIA la cámara, dos brazos robóticos a los lados y el semáforo que pasa a verde
function buildAuto() {
  const st = station('auto', 'AUTOMÁTICA', '#a58bff', 3.4, 1.9, 3.9); S.stAuto = st; const Z = st.Z;
  const belt = rbox(0.8, 0.12, 4.0, MAT.rubber, 0.05); belt.position.set(0, 0.62, -0.3); Z.add(belt);
  S.beltT = canvasTex(64, 512, (q, w, h) => { q.fillStyle = '#16181d'; q.fillRect(0, 0, w, h); q.fillStyle = '#2b2f37'; for (let i = 0; i < 16; i++) q.fillRect(0, i * 32, w, 13); });
  S.beltT.wrapT = THREE.RepeatWrapping; S.beltT.repeat.set(1, 5);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 3.9), new THREE.MeshStandardMaterial({ map: S.beltT, roughness: 0.6 })); top.rotation.x = -Math.PI / 2; top.position.set(0, 0.685, -0.3); Z.add(top);
  for (const s of [-1, 1]) { const rl = rbox(0.06, 0.14, 4.1, plastic(PL.yellow, 0.25), 0.03); rl.position.set(s * 0.43, 0.66, -0.3); Z.add(rl); }
  for (let i = 0; i < 5; i++) { const lg = rbox(0.7, 0.5, 0.08, MAT.dsteel, 0.02); lg.position.set(0, 0.33, -2.1 + i * 0.9); Z.add(lg); }
  S.boxes = []; for (let i = 0; i < 6; i++) { const b = rbox(0.34, 0.28, 0.34, plastic(0xc8935a, 0.55), 0.03); Z.add(b); const tp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.35), plastic(0x8a6236, 0.5)); tp.position.y = 0.141; b.add(tp);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0x5ff0b0, toneMapped: false })); lab.position.set(0, 0.0, 0.171); lab.visible = false; b.add(lab); b.userData.lab = lab; S.boxes.push(b); }
  S.arms = [[-0.95, -0.9], [0.95, 0.15]].map(([x, z], i) => { const a = robotArm(i ? PL.orange : PL.sky, 0.8); a.position.set(x, 0.15, z); Z.add(a); const gr = gripper(); a.userData.J.tool.add(gr); a.userData.gr = gr;
    const eye = sph(0.035, glowM(0x5ff0b0, 0.2)); eye.position.set(0, 0.2, 0.09); a.userData.J.wr.add(eye); a.userData.eye = eye; a.userData.side = i ? 1 : -1; return a; });
  const tower = new THREE.Group(); tower.position.set(-0.85, 0.15, -1.9); Z.add(tower); S.tower = tower;
  const pole = cyl(0.035, 0.035, 1.4, MAT.dsteel, 12); pole.position.y = 0.7; tower.add(pole);
  S.lamps = [0xff3b4e, 0xffc21a, 0x19d98a].map((c, i) => { const l = cyl(0.1, 0.1, 0.16, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: 0.2, roughness: 0.3 }), 24); l.position.y = 1.5 + i * 0.18; tower.add(l); return l; });
  S.autoL = pill('AUTO', '#5ff0b0', 'rgba(16,20,30,.92)', 0.46, 70); Z.add(S.autoL);
}
function autoAt(t) {
  const st = S.stAuto; neonOn2(st.n, clamp((t - K.automatica) / 0.25), t);
  const run = clamp((t - K.ensenar) / 0.6), travel = Math.max(0, (t - K.ensenar) * 0.85 - 0.25 * (1 - run));
  S.beltT.offset.y = travel * 5 / 3.9;
  S.boxes.forEach((b, i) => { const z = ((i * 0.75 + travel) % 4.5) - 2.3; b.position.set(0, 0.62 + 0.06 + 0.14, z); b.visible = z < 1.6; b.scale.setScalar(Math.max(0.001, clamp((1.6 - z) / 0.25))); b.userData.lab.visible = z > 0.2; });
  const wake = clamp((t - K.automatica) / 0.5);
  S.arms.forEach((a, i) => {
    const ph = (t - K.ensenar) * 3.4 + i * 1.7, dip = run * Math.pow(Math.max(0, Math.sin(ph)), 3);
    // el brazo se gira hacia la cinta (en el lado contrario a su base) y baja la pinza sobre las cajas
    pose(a, 0, lerp(0.9, lerp(-0.2, -0.55, dip), wake), lerp(-0.4, lerp(1.25, 1.55, dip), wake), lerp(0.2, 0.75 + 0.25 * dip, wake));
    a.userData.J.base.rotation.y = (a.userData.side < 0 ? 0 : Math.PI) + 0.15 * run * Math.sin(ph * 0.5);
    grip(a.userData.gr, dip); a.userData.eye.material.emissiveIntensity = 0.2 + 3.5 * wake;
  });
  const green = clamp((t - K.sola) / 0.15), y2 = env(t, K.ensenar, K.sola + 0.05, 0.1, 0.05);
  S.lamps[0].material.emissiveIntensity = 0.2 + 2.6 * (1 - wake) * (t > K.automatica - 0.4 ? 1 : 0); S.lamps[1].material.emissiveIntensity = 0.2 + 2.6 * y2 * (Math.sin(t * 12) > 0 ? 1 : 0.3); S.lamps[2].material.emissiveIntensity = 0.2 + 3.2 * green;
  lookLab(S.autoL, green, v3(-0.85, 2.38, -1.9)); S.autoL.scale.setScalar(0.7 + 0.3 * pop(t, K.sola, 0.3));
  return camKeys(t, [
    [K.automatica - 0.3, [0.5, 2.5, 5.4], [0.0, 1.1, -0.8], 36],
    [K.ensenar + 0.2, [0.35, 2.2, 4.6], [0.0, 0.95, -0.6], 36],
    [K.fabrica1 + 0.3, [-0.3, 2.0, 4.2], [0.0, 0.95, -0.4], 36],
    [K.sola + 0.4, [-0.45, 2.3, 4.4], [-0.3, 1.35, -1.0], 36],
  ], st.Z);
}
// ---- 3.5 materiales y fabricación: tocho de acero DE PIE → su red cristalina por dentro → la fresa lo convierte en engranaje
const BIL_Y = 0.98;
function buildMat() {
  const st = station('mat', 'MATERIALES\nY FABRICACIÓN', '#ffd75a', 3.4, 2.0, 4.4); S.stMat = st; const Z = st.Z;
  const tbl = rbox(1.5, 0.45, 1.1, plastic(0x2b303b, 0.3), 0.05); tbl.position.set(0, 0.375, 0); Z.add(tbl);
  const chuck = cyl(0.42, 0.44, 0.16, MAT.dsteel, 32); chuck.position.set(0, 0.68, 0); Z.add(chuck);
  for (let i = 0; i < 3; i++) { const j = rbox(0.1, 0.12, 0.16, MAT.steel, 0.02); const a = i / 3 * Math.PI * 2; j.position.set(Math.cos(a) * 0.36, 0.8, Math.sin(a) * 0.36); j.rotation.y = -a; Z.add(j); }
  S.billet = cyl(0.3, 0.3, 0.5, metal(0xcfd5de, 0.28), 48); S.billet.position.set(0, BIL_Y, 0); Z.add(S.billet);
  S.mgear = gear(16, 0.27, 0.4, metal(0xd8dde6, 0.22)); S.mgear.rotation.x = Math.PI / 2; S.mgear.position.set(0, BIL_Y, 0); Z.add(S.mgear);
  const col = rbox(0.32, 2.7, 0.32, plastic(0x2b303b, 0.3), 0.05); col.position.set(0, 1.65, -0.78); Z.add(col);
  S.cutter = new THREE.Group(); Z.add(S.cutter);
  const head = rbox(0.42, 0.5, 0.5, plastic(PL.orange, 0.25), 0.06); head.position.set(0, 0.4, -0.25); S.cutter.add(head);
  const arm2 = rbox(0.2, 0.16, 0.6, plastic(PL.orange, 0.25), 0.04); arm2.position.set(0, 0.55, -0.55); S.cutter.add(arm2);
  S.mill = new THREE.Group(); S.cutter.add(S.mill);
  const ml = cyl(0.055, 0.055, 0.34, MAT.gold, 12); ml.position.y = 0.0; S.mill.add(ml);
  for (let i = 0; i < 4; i++) { const fl = rbox(0.025, 0.3, 0.12, MAT.gold, 0.01); fl.rotation.y = i / 4 * Math.PI; S.mill.add(fl); }
  S.chips = sparks(Z, 90, 0xd8e2f0, 0.045);
  const L = new THREE.Group(); Z.add(L); S.lat = L; const n = 4, a = 0.12;
  const at = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) { at.push(v3(i, j, k).subScalar((n - 1) / 2).multiplyScalar(a)); if (i < n - 1 && j < n - 1 && k < n - 1) at.push(v3(i + 0.5, j + 0.5, k + 0.5).subScalar((n - 1) / 2).multiplyScalar(a)); }
  S.atoms = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 18, 12), instGlow(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.6, clearcoat: 1 }), 0.25), at.length);
  S.atoms.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(at.length * 3), 3);
  at.forEach((p, i) => { _m4.makeTranslation(p.x, p.y, p.z); S.atoms.setMatrixAt(i, _m4); S.atoms.setColorAt(i, _c.setHSL(0.58 + 0.06 * hash(i), 0.6, 0.62)); }); L.add(S.atoms); S.atP = at;
  const bonds = []; for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) { const d = at[i].distanceTo(at[j]); if (Math.abs(d - a * Math.sqrt(3) / 2) < 0.002) bonds.push([at[i], at[j]]); }
  const bm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.005, 0.005, 1, 6), glowM(0x7fd8ff, 1.0), bonds.length);
  bonds.forEach(([p, q], i) => { const d = q.clone().sub(p); _q.setFromUnitVectors(v3(0, 1, 0), d.clone().normalize()); _m4.compose(p.clone().add(q).multiplyScalar(0.5), _q, v3(1, d.length(), 1)); bm.setMatrixAt(i, _m4); }); L.add(bm);
  S.latL = pill('RED CRISTALINA DEL ACERO', '#cfe6ff', 'rgba(16,20,30,.9)', 0.36, 56); Z.add(S.latL);
}
function matAt(t) {
  const st = S.stMat; neonOn2(st.n, clamp((t - K.materiales) / 0.25), t);
  const cut = clamp((t - (K.produce - 0.3)) / 0.6), lat = env(t, K.de10 - 0.05, K.y_mat + 0.15, 0.55, 0.45);
  S.billet.rotation.y = t * 2;
  S.billet.visible = cut < 0.98; S.billet.scale.set(1 - 0.1 * cut, 1 - 0.2 * cut, 1 - 0.1 * cut);
  const gk = clamp((cut - 0.25) / 0.75); S.mgear.visible = gk > 0.01; S.mgear.scale.setScalar(Math.max(0.001, 0.9 + 0.1 * gk)); setOp(S.mgear, gk); S.mgear.rotation.z = t * 1.5;
  const ck = env(t, K.produce - 0.7, 99, 0.35, 0.3); S.cutter.visible = true;
  const orbit = cut * Math.PI * 2, inCut = cut > 0 && cut < 1 ? 1 : 0;
  S.cutter.position.set(0.36 * Math.sin(orbit) * inCut, BIL_Y + 0.62 + 1.0 * (1 - ck) - 0.15 * Math.sin(Math.PI * cut), 0.18 * (Math.cos(orbit) - 1) * inCut); S.mill.position.y = -0.1; S.mill.rotation.y = t * 40;
  S.chips.visible = inCut > 0; if (S.chips.visible) burst(S.chips, v3(S.cutter.position.x, BIL_Y + 0.25, S.cutter.position.z + 0.2), t, 0, 0.7, 0.4, true, 4);
  S.lat.visible = lat > 0.01; S.lat.position.set(0, BIL_Y, 0.31); S.lat.scale.setScalar(Math.max(0.001, lat)); S.lat.rotation.set(0.5, t * 0.35, 0.2);
  S.atP.forEach((p, i) => { _m4.makeTranslation(p.x + 0.004 * Math.sin(t * 30 + i), p.y + 0.004 * Math.cos(t * 27 + i * 1.3), p.z); S.atoms.setMatrixAt(i, _m4); }); S.atoms.instanceMatrix.needsUpdate = true;
  lookLab(S.latL, env(t, K.hecho, K.y_mat + 0.1, 0.2, 0.2), v3(0, BIL_Y + 0.24, 0.4)); S.latL.scale.setScalar(0.42);
  return camKeys(t, [
    [K.materiales - 0.3, [0.4, 2.4, 6.6], [0.0, 2.0, 0], 36],
    [K.fabricacion + 0.3, [0.3, 2.2, 6.0], [0.0, 1.8, 0], 36],
    [K.de10 + 0.15, [0.15, 1.25, 2.4], [0.0, BIL_Y, 0.15], 36],
    [K.hecho + 0.2, [0.06, BIL_Y + 0.06, 0.92], [0.0, BIL_Y, 0.31], 34],
    [K.objeto + 0.2, [0.1, BIL_Y + 0.07, 0.86], [0.0, BIL_Y + 0.01, 0.31], 34],
    [K.y_mat + 0.25, [0.3, 1.55, 2.6], [0.0, 1.15, 0.0], 36],
    [K.produce + 0.4, [0.45, 1.75, 3.2], [0.0, 1.2, 0.0], 36],
  ], st.Z);
}
// ---- 3.6 empresa: panel vertical con tres filas: costes (monedas), organización (organigrama) y proyectos (Gantt)
function buildBiz() {
  const st = station('biz', 'EMPRESA', '#ff7ad1', 3.4, 1.6, 4.55); S.stBiz = st; const Z = st.Z;
  const panel = rbox(2.3, 3.3, 0.08, new THREE.MeshPhysicalMaterial({ color: 0x0d1220, roughness: 0.15, metalness: 0.2, clearcoat: 1 }), 0.06); panel.position.set(0, 2.15, -0.6); Z.add(panel);
  for (const y of [1.6, 2.7]) { const dv = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.01, 0.01), new THREE.MeshBasicMaterial({ color: 0x34406a })); dv.position.set(0, y, -0.55); Z.add(dv); }
  const hdr = (txt, y) => { const l = textPlane([txt], { size: 80, color: '#cfe6ff', weight: 800, w: txt.length * 0.075 }); l.position.set(-0.95 + txt.length * 0.0375, y, -0.54); Z.add(l); return l; };
  S.bizH = [hdr('COSTES', 3.6), hdr('ORGANIZACIÓN', 2.5), hdr('PROYECTOS', 1.4)];
  const coinTex = canvasTex(256, 256, (q, w, h) => { q.fillStyle = '#ffcf55'; q.beginPath(); q.arc(128, 128, 120, 0, 7); q.fill(); q.strokeStyle = '#c98a14'; q.lineWidth = 12; q.beginPath(); q.arc(128, 128, 100, 0, 7); q.stroke(); q.fillStyle = '#a86a00'; q.font = '900 150px Inter'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('€', 128, 136); });
  S.coins = []; for (let s = 0; s < 4; s++) for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.045, 32), [MAT.gold, new THREE.MeshStandardMaterial({ map: coinTex, metalness: 0.6, roughness: 0.3 }), MAT.gold]); c.castShadow = true; Z.add(c); S.coins.push({ c, s, i }); }
  S.coinUp = arrow(0.5, plastic(PL.red, 0.25), 0.035); Z.add(S.coinUp);
  const nodes = [v3(0, 2.4, -0.45), v3(-0.55, 1.95, -0.45), v3(0, 1.95, -0.45), v3(0.55, 1.95, -0.45)].map(p => p.add(v3(0.25, 0, 0)));
  S.org = nodes.map((p, i) => { const g = new THREE.Group(); g.position.copy(p); Z.add(g); const d = cyl(0.13, 0.13, 0.05, plastic(i ? PL.sky : PL.violet, 0.2), 32); d.rotation.x = Math.PI / 2; g.add(d); const hd = sph(0.04, plastic(0xffffff, 0.2)); hd.position.set(0, 0.03, 0.05); g.add(hd); const bd = sph(0.055, plastic(0xffffff, 0.2)); bd.scale.set(1, 0.6, 0.6); bd.position.set(0, -0.045, 0.05); g.add(bd); return g; });
  S.orgL = [1, 2, 3].map(i => { const b = bar(nodes[0], nodes[i], 0.011, glowM(0xc8a8ff, 2)); Z.add(b); b.userData.a = nodes[0]; b.userData.b = nodes[i]; return b; });
  S.gantt = [[0.0, 0.55, PL.sky], [0.3, 0.6, PL.green], [0.65, 0.45, PL.orange], [0.95, 0.4, PL.pink]].map(([x, w, c], i) => { const b = rbox(w, 0.11, 0.05, plastic(c, 0.2), 0.025); Z.add(b); b.userData.x = x; b.userData.w = w; b.userData.y = 1.15 - i * 0.17; return b; });
  S.check = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (q, w, h) => { q.strokeStyle = '#5ff0b0'; q.lineWidth = 44; q.lineCap = 'round'; q.lineJoin = 'round'; q.beginPath(); q.moveTo(46, 136); q.lineTo(104, 196); q.lineTo(212, 62); q.stroke(); }), transparent: true, depthWrite: false, toneMapped: false })); Z.add(S.check);
}
function bizAt(t) {
  const st = S.stBiz; neonOn2(st.n, clamp((t - K.empresa) / 0.25), t);
  S.bizH.forEach((l, i) => { const k = env(t, [K.costes, K.organizacion, K.proyectos][i] - 0.05, 99, 0.2, 0.2); l.material.opacity = 0.3 + 0.7 * k; });
  const HS = [3, 5, 4, 6];
  S.coins.forEach(({ c, s, i }) => { const t0 = K.costes + s * 0.1 + i * 0.045, u = clamp((t - t0) / 0.16); c.visible = u > 0 && i < HS[s]; c.position.set(-0.55 + s * 0.3, 2.9 + i * 0.05 + (1 - u * u) * 0.7, -0.4); });
  const ak = pop(t, K.costes + 0.45, 0.3); S.coinUp.visible = ak > 0.01; S.coinUp.position.set(0.75, 2.95, -0.4); S.coinUp.scale.setScalar(Math.max(0.001, ak)); S.coinUp.rotation.z = -0.5;
  S.org.forEach((g, i) => { const k = pop(t, K.organizacion + (i ? 0.15 + i * 0.08 : 0), 0.3); show(g, k); g.rotation.y = 0.15 * Math.sin(t * 2 + i); });
  S.orgL.forEach((b, i) => { const k = clamp((t - (K.organizacion + 0.15 + i * 0.08)) / 0.2); b.visible = k > 0.01; const a = b.userData.a, q = a.clone().lerp(b.userData.b, Math.max(0.001, k)); b.position.copy(a).add(q).multiplyScalar(0.5); b.scale.set(1, Math.max(0.001, k), 1); });
  S.gantt.forEach((b, i) => { const k = eo(clamp((t - (K.proyectos + i * 0.1)) / 0.3)); b.visible = k > 0.01; b.scale.set(Math.max(0.001, k), 1, 1); b.position.set(-0.6 + b.userData.x + b.userData.w * k / 2, b.userData.y, -0.5); });
  const chk = pop(t, K.proyectos + 0.5, 0.3); S.check.visible = chk > 0.01; S.check.position.set(0.85, 0.75, -0.5); S.check.scale.setScalar(Math.max(0.001, chk)); S.check.material.color.setRGB(1.6, 1.6, 1.6);
  return camKeys(t, [
    [K.empresa - 0.4, [0.2, 2.6, 6.6], [0.0, 2.3, -0.6], 36],
    [K.costes + 0.2, [0.15, 3.1, 4.4], [0.05, 3.0, -0.5], 36],
    [K.organizacion + 0.3, [0.2, 2.25, 4.4], [0.15, 2.15, -0.5], 36],
    [K.proyectos + 0.3, [0.2, 1.2, 4.3], [0.1, 1.1, -0.5], 36],
    [K.proyectos + 0.9, [0.25, 1.35, 4.6], [0.1, 1.2, -0.5], 36],
  ], st.Z);
}
// ---- 3.7 salidas: coches, robots, centrales y cadenas de montaje (la cámara pasa por delante de cada una)
function buildCareers() {
  const st = station('careers', null, '#7fe6ff', 8.6); S.stCar = st; const Z = st.Z;
  S.car = carModel(0xff3b4e); S.car.position.set(-2.4, 0.15, 0.35); S.car.rotation.y = 0.75; Z.add(S.car);
  S.carW = new THREE.LineSegments(new THREE.EdgesGeometry(S.car.userData.P.body.geometry, 25), new THREE.LineBasicMaterial({ color: 0x7fe6ff, transparent: true, toneMapped: false })); S.carW.position.copy(S.car.position); S.carW.rotation.copy(S.car.rotation); Z.add(S.carW);
  S.carW2 = new THREE.LineSegments(new THREE.EdgesGeometry(S.car.userData.P.cabin.geometry, 25), S.carW.material); S.carW2.position.copy(S.car.position); S.carW2.rotation.copy(S.car.rotation); Z.add(S.carW2);
  S.holoM = new THREE.MeshBasicMaterial({ color: 0x3fd8ff, transparent: true, opacity: 0.3, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
  S.holo = new THREE.Group(); S.holo.position.copy(S.car.position); S.holo.rotation.copy(S.car.rotation); Z.add(S.holo);
  for (const part of [S.car.userData.P.body, S.car.userData.P.cabin]) { const h = new THREE.Mesh(part.geometry, S.holoM); h.position.copy(part.position); S.holo.add(h); }
  S.grid2 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ map: canvasTex(512, 320, (q, w, h) => { q.strokeStyle = 'rgba(80,220,255,.55)'; q.lineWidth = 2; for (let x = 0; x <= w; x += 32) { q.beginPath(); q.moveTo(x, 0); q.lineTo(x, h); q.stroke(); } for (let y = 0; y <= h; y += 32) { q.beginPath(); q.moveTo(0, y); q.lineTo(w, y); q.stroke(); } }), transparent: true, toneMapped: false, depthWrite: false })); S.grid2.rotation.x = -Math.PI / 2; S.grid2.position.set(-2.4, 0.16, 0.35); Z.add(S.grid2);
  S.hrob = robotArm(PL.sky, 1.0); S.hrob.position.set(-0.75, 0.15, 0.0); Z.add(S.hrob); const gr = gripper(); S.hrob.userData.J.tool.add(gr);
  const P = new THREE.Group(); P.position.set(1.0, 0.15, -0.3); Z.add(P); S.plant = P;
  const prof = []; for (let i = 0; i <= 12; i++) { const y = i / 12 * 1.7, r = 0.56 - 0.3 * Math.sin(Math.PI * Math.min(1, y / 1.4) * 0.75); prof.push(new THREE.Vector2(r, y)); }
  const tw = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), plastic(0xe6eaf0, 0.35)); tw.castShadow = true; P.add(tw);
  S.steam = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(60 * 3), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, map: discTex, transparent: true, depthWrite: false, opacity: 0.6 })); S.steam.frustumCulled = false; P.add(S.steam);
  S.rotors = [];
  for (const [x, z, h] of [[0.75, 0.55, 2.0], [-0.55, -0.6, 2.4]]) { const tw2 = cyl(0.035, 0.06, h, plastic(0xf3f5f9, 0.25), 16); tw2.position.set(x, h / 2, z); P.add(tw2); const rot = new THREE.Group(); rot.position.set(x, h, z + 0.07); P.add(rot);
    for (let i = 0; i < 3; i++) { const bl = rbox(0.05, 0.62, 0.02, plastic(0xf3f5f9, 0.25), 0.02); bl.position.y = 0.31; const pv = new THREE.Group(); pv.rotation.z = i / 3 * Math.PI * 2; pv.add(bl); rot.add(pv); } S.rotors.push(rot); }
  const A = new THREE.Group(); A.position.set(2.9, 0.15, 0.3); Z.add(A); S.line = A;
  const bl2 = rbox(2.0, 0.1, 0.56, MAT.rubber, 0.04); bl2.position.y = 0.45; A.add(bl2);
  for (let i = 0; i < 3; i++) { const lg = rbox(0.06, 0.4, 0.46, MAT.dsteel, 0.02); lg.position.set(-0.8 + i * 0.8, 0.2, 0); A.add(lg); }
  S.mini = []; for (let i = 0; i < 4; i++) { const c = carModel([PL.yellow, PL.sky, PL.green, PL.pink][i]); c.scale.setScalar(0.3); A.add(c); S.mini.push(c); }
  const arch = new THREE.Group(); A.add(arch); for (const s of [-1, 1]) { const p = cyl(0.035, 0.035, 0.95, plastic(PL.yellow, 0.25), 12); p.position.set(0.2, 0.5 + 0.43, s * 0.33); arch.add(p); } const tb = rbox(0.1, 0.1, 0.76, plastic(PL.yellow, 0.25), 0.03); tb.position.set(0.2, 1.4, 0); arch.add(tb);
  S.sparkA = sparks(A, 40, 0xffd27a, 0.04);
  S.carLabs = ['COCHES', 'ROBOTS', 'CENTRALES', 'CADENAS\nDE MONTAJE'].map(s => { const l = textPlane(s.split('\n'), { size: 70, color: '#ffffff', weight: 800, w: s.includes('\n') ? 0.62 : 0.55 }); l.material.opacity = 0; Z.add(l); return l; });
}
function careersAt(t) {
  const wire = env(t, K.sale - 0.05, K.coches + 0.25, 0.25, 0.25), solid = clamp((t - K.coches) / 0.3);
  S.carW.visible = S.carW2.visible = wire > 0.01 && solid < 1; S.carW.material.opacity = wire * (1 - solid); S.carW.material.color.setRGB(1.2, 2.6, 3.0);
  S.holo.visible = wire > 0.01 && solid < 1; S.holoM.opacity = 0.32 * wire * (1 - solid) * (0.85 + 0.15 * Math.sin(t * 30)); S.holoM.color.setRGB(0.4, 1.4, 2.0);
  S.grid2.visible = wire > 0.01; S.grid2.material.opacity = wire * (1 - solid * 0.7); S.grid2.material.color.setRGB(1.3, 1.3, 1.3);
  S.car.visible = solid > 0.01; S.car.userData.P.wheels.forEach(w => w.rotation.z = -t * 3 * solid); setOp(S.car, solid);
  const rk = pop(t, K.robots, 0.35); show(S.hrob, rk); const ph = t * 2.2;
  pose(S.hrob, 0.6 * Math.sin(ph * 0.5), -0.4 + 0.3 * Math.sin(ph), 1.1 + 0.3 * Math.sin(ph + 1), 0.6 + 0.3 * Math.sin(ph * 1.3));
  const pk = pop(t, K.centrales, 0.4); show(S.plant, pk);
  const a = S.steam.geometry.attributes.position.array; for (let i = 0; i < 60; i++) { const tt = (t * 0.35 + hash(i)) % 1; a[i * 3] = 0.22 * Math.sin(i * 1.7) * (0.3 + tt); a[i * 3 + 1] = 1.7 + tt * 1.5; a[i * 3 + 2] = 0.22 * Math.cos(i * 2.3) * (0.3 + tt); } S.steam.geometry.attributes.position.needsUpdate = true; S.steam.material.opacity = 0.55 * pk;
  S.rotors.forEach((r, i) => { r.rotation.z = -t * (1.6 + i * 0.4); });
  const lk = pop(t, K.cadenas, 0.4); show(S.line, lk);
  S.mini.forEach((c, i) => { const x = ((i * 0.5 + t * 0.35) % 2.0) - 1.0; c.position.set(x, 0.5, 0); c.visible = Math.abs(x) < 0.95; });
  S.sparkA.visible = lk > 0.5; if (S.sparkA.visible) burst(S.sparkA, v3(0.2, 1.3, 0), t, 0, 0.5, 0.4, true, 4);
  const LT = [K.coches, K.robots, K.centrales, K.cadenas], LP = [v3(-2.4, 1.35, 1.0), v3(-0.75, 2.5, 0.3), v3(1.0, 3.05, 0.3), v3(2.9, 1.9, 0.6)];
  S.carLabs.forEach((l, i) => { l.material.opacity = env(t, LT[i] + 0.05, 99, 0.2, 0.2); l.visible = l.material.opacity > 0.01; l.position.copy(LP[i]); l.quaternion.copy(cam.quaternion); });
  return camKeys(t, careerKeys(), S.stCar.Z);
}
function careerKeys() { return [
  [K.de12 - 0.3, [-2.1, 1.75, 5.2], [-2.4, 0.6, 0.3], 36],
  [K.coches + 0.3, [-2.3, 1.35, 4.3], [-2.4, 0.65, 0.3], 36],
  [K.robots + 0.2, [-0.75, 1.9, 4.8], [-0.75, 1.35, 0.0], 36],
  [K.centrales + 0.3, [0.95, 2.2, 6.0], [0.95, 1.6, -0.3], 36],
  [K.cadenas + 0.35, [2.75, 1.5, 4.4], [2.9, 0.95, 0.3], 36],
  [K.y3 - 0.1, [3.0, 1.65, 4.6], [2.9, 1.05, 0.3], 36],
]; }
// ---- 3.8 la fábrica entera: la cámara se aleja hacia atrás por encima de toda la línea y acaba detrás del graduado
function revealAt(t) {
  const c0 = camKeys(K.y3 - 0.1, careerKeys(), S.stCar.Z);
  return camKeys(t, [
    [K.y3 - 0.1, c0.p.toArray(), c0.l.toArray(), 36],
    [K.acaba + 0.2, [71, 3.6, 6.0], [62, 1.2, 0.4], 38],
    [K.dirigiendo + 0.35, [82, 5.6, 4.4], [60, 0.8, -0.2], 40],
    [K.fabrica2 + 0.2, [90, 6.0, 2.6], [56, 0.8, -0.3], 40],
    [K.y_q, [90, 6.0, 2.6], [56, 0.8, -0.3], 40],
  ]);
}
function buildHall() {
  const Z = zone('hall', 0); S.hallZ = Z; const pm = plastic(0x232838, 0.35), lm = glowM(0xffe2b0, 2.2);
  for (let i = -1; i <= 7; i++) { const x = i * 9 + 4.5;
    for (const z of [-2.6, 2.9]) { const p = rbox(0.28, 5.2, 0.28, pm, 0.04); p.position.set(x, 2.6, z); Z.add(p);
      const lamp = cyl(0.2, 0.28, 0.12, plastic(0x2b303b, 0.3), 24); lamp.position.set(x, 4.9, z + (z < 0 ? 0.45 : -0.45)); Z.add(lamp);
      const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), lm); bulb.rotation.x = Math.PI / 2; bulb.position.set(x, 4.83, z + (z < 0 ? 0.45 : -0.45)); Z.add(bulb);
      const st2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 3.6, 0.02), glowM(0x47d6ff, 1.4)); st2.position.set(x + 0.15, 1.9, z + (z < 0 ? 0.15 : -0.15)); Z.add(st2); }
    if (i < 7) { const tray = rbox(9, 0.08, 0.32, plastic(0x2b303b, 0.35), 0.02); tray.position.set(x + 4.5, 4.4, -2.6); Z.add(tray); } }
}
function neonOn2(n, k, t = 0) {
  if (!n) return; const fl = k > 0 && k < 1 ? (Math.sin(t * 90) > 0.2 ? 1 : 0.35) : 1, e = (0.2 + 1.9 * k) * fl;
  n.userData.l.material.color.setRGB(0.3 + 0.7 * e, 0.3 + 0.7 * e, 0.3 + 0.7 * e);
  n.userData.glow.material.color.copy(n.userData.col).multiplyScalar(0.1 + 1.5 * k * fl); n.userData.glow.material.opacity = 0.2 + 0.8 * k;
}
